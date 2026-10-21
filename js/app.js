import { esc, plain, rich, richBlank } from './text.js';
import * as S from './state.js';
import * as Sync from './sync.js';
import { CONFIG } from './config.js';

const app = document.getElementById('app');
let C = null; // le cours chargé
let session = null; // la série d'exercices en cours

// ---------- Chargement du cours ----------

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url} : ${r.status}`);
  return r.json();
}

async function loadCourse() {
  const manifest = await fetchJSON('data/manifest.json');
  const blocks = await Promise.all(manifest.blocks.map(fetchJSON));
  return buildCourse(blocks, manifest.examEvery || 4, manifest.miniExamEvery || 0);
}

const unique = a => [...new Set(a)];

function buildCourse(blocks, examEvery, miniEvery) {
  const c = { blocks: [], blockById: {}, lessons: [], lessonById: {}, items: {}, exams: [], examById: {}, steps: [] };
  let num = 0;
  blocks.forEach((b, bi) => {
    const block = { ...b, index: bi, lessonIds: [], testIds: [], examPoolIds: [] };
    for (const l of b.lessons) {
      const lesson = { ...l, num: ++num, blockId: b.id, itemIds: [] };
      c.lessons.push(lesson);
      c.lessonById[l.id] = lesson;
      block.lessonIds.push(l.id);
      for (const ex of l.exercises || []) {
        c.items[ex.id] = { ...ex, blockId: b.id, uses: unique([l.id, ...(ex.uses || [])]) };
        lesson.itemIds.push(ex.id);
      }
    }
    for (const ex of b.test || []) {
      c.items[ex.id] = { ...ex, blockId: b.id, fromTest: true, uses: unique(ex.uses?.length ? ex.uses : block.lessonIds) };
      block.testIds.push(ex.id);
    }
    // Questions de réflexion réservées à l'examen qui suit ce bloc (première apparition).
    for (const ex of b.examTest || []) {
      c.items[ex.id] = { ...ex, blockId: b.id, examOnly: true, uses: unique(ex.uses?.length ? ex.uses : block.lessonIds) };
      block.examPoolIds.push(ex.id);
    }
    c.blocks.push(block);
    c.blockById[b.id] = block;
  });
  let bigNum = 0;
  let miniNum = 0;
  c.blocks.forEach((block, bi) => {
    block.lessonIds.forEach(id => c.steps.push({ type: 'lesson', id }));
    c.steps.push({ type: 'test', id: block.id });
    // Un grand examen tous les `examEvery` blocs, un examen intermédiaire entre deux.
    let kind = null;
    let span = 0;
    if ((bi + 1) % examEvery === 0) { kind = 'big'; span = examEvery; }
    else if (miniEvery && (bi + 1) % miniEvery === 0) { kind = 'mini'; span = miniEvery; }
    if (!kind) return;
    const group = c.blocks.slice(bi + 1 - span, bi + 1);
    const exam = {
      id: kind === 'big' ? `exam-${block.id}` : `mini-${block.id}`,
      kind,
      num: kind === 'big' ? ++bigNum : ++miniNum,
      lessonIds: group.flatMap(g => g.lessonIds),
      poolIds: block.examPoolIds,
      size: kind === 'big' ? CONFIG.examSize : CONFIG.miniExamSize,
    };
    for (const id of exam.poolIds) c.items[id].examId = exam.id;
    c.exams.push(exam);
    c.examById[exam.id] = exam;
    block.exam = exam;
    c.steps.push({ type: 'exam', id: exam.id });
  });
  return c;
}

// ---------- Progression ----------

function stepDone(step) {
  const st = S.get();
  return step.type === 'lesson' ? !!st.lessons[step.id]?.done : !!st.tests[step.id]?.passed;
}

// Progression linéaire : une étape s'ouvre quand la précédente est validée.
function stepStatuses() {
  let open = true;
  const out = {};
  for (const s of C.steps) {
    const done = stepDone(s);
    out[`${s.type}:${s.id}`] = done ? 'done' : open ? 'current' : 'locked';
    if (!done) open = false;
  }
  return out;
}

function examName(e) {
  return e.kind === 'big' ? `Grand examen ${e.num}` : `Examen intermédiaire ${e.num}`;
}

function stepLabel(s) {
  if (s.type === 'lesson') { const l = C.lessonById[s.id]; return `Leçon ${l.num} — ${plain(l.title)}`; }
  if (s.type === 'test') return `Test du bloc ${C.blockById[s.id].index + 1}`;
  const e = C.examById[s.id];
  return `${examName(e)} (leçons ${C.lessonById[e.lessonIds[0]].num}–${C.lessonById[e.lessonIds.at(-1)].num})`;
}

function nextStep() {
  const st = stepStatuses();
  return C.steps.find(s => st[`${s.type}:${s.id}`] === 'current');
}

// Maîtrise d'une leçon (0 à 1) d'après la répétition espacée, ou null si rien vu :
// raté récemment = 0, réussi une fois = 0,6, consolidé par les révisions = 1.
const BOX_MASTERY = [0, 0.6, 0.8, 1];

function mastery(lessonId) {
  const items = S.get().items;
  const seen = Object.values(C.items).filter(it => it.uses.includes(lessonId) && items[it.id]);
  if (!seen.length) return null;
  return seen.reduce((sum, it) => sum + BOX_MASTERY[Math.min(items[it.id].box, 3)], 0) / seen.length;
}

function dueItems() {
  const now = Date.now();
  const items = S.get().items;
  return Object.entries(items)
    .filter(([id, r]) => C.items[id] && r.due <= now)
    .sort((a, b) => a[1].box - b[1].box || a[1].due - b[1].due)
    .map(([id]) => id);
}

// ---------- Tirage des exercices ----------

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Plus un exercice a été raté (récemment ou un jour), plus il a de chances de sortir.
// Un exercice réussi garde toujours une petite chance de revenir.
function weight(id) {
  const r = S.get().items[id];
  if (!r) return 2;
  let w = r.box === 0 ? 5 : r.box < 3 ? 2 : 1;
  w += Math.min(r.ko, 3);
  if (r.due <= Date.now()) w += 1;
  return w;
}

function weightedSample(ids, n) {
  const pool = [...ids];
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, id) => s + weight(id), 0);
    let x = Math.random() * total;
    let k = 0;
    while ((x -= weight(pool[k])) > 0) k++;
    out.push(pool.splice(Math.min(k, pool.length - 1), 1)[0]);
  }
  return out;
}

// Exercices utilisables jusqu'à la leçon n° maxNum. Les questions réservées à un examen
// n'apparaissent ailleurs qu'une fois vues dans cet examen.
function available(maxNum, examId = null) {
  const seen = S.get().items;
  return Object.values(C.items)
    .filter(it => it.uses.every(u => C.lessonById[u].num <= maxNum))
    .filter(it => !it.examOnly || it.examId === examId || seen[it.id])
    .map(it => it.id);
}

// Tire `n` questions : d'abord `forced`, puis environ `recallShare` de rappels,
// le reste dans `main`. Si une réserve manque, l'autre complète.
function compose(n, { forced = [], main = [], recall = [], recallShare = 0 }) {
  const picked = new Set(forced.slice(0, n));
  const take = (pool, k) => weightedSample(pool.filter(id => !picked.has(id)), k).forEach(id => picked.add(id));
  take(recall, Math.round(n * recallShare));
  take(main, n - picked.size);
  take(recall, n - picked.size);
  return shuffle([...picked]);
}

// ---------- Séances ----------

function startSession(opts) {
  if (!opts.ids.length) return;
  session = { requeue: true, ...opts, queue: opts.ids.map(id => ({ id, tries: 0 })), idx: 0, first: new Map(), cur: null, result: null };
  if (location.hash === '#/seance') render(); else location.hash = '#/seance';
}

function startLesson(id) {
  const l = C.lessonById[id];
  // Les exercices de la leçon, mélangés avec des rappels des leçons précédentes.
  const recall = weightedSample(available(l.num - 1), CONFIG.lessonRecall);
  startSession({
    kind: 'lesson', ref: id, title: `Leçon ${l.num} — exercices`,
    ids: shuffle([...l.itemIds, ...recall]), scored: new Set(l.itemIds),
  });
}

function startTest(blockId) {
  const b = C.blockById[blockId];
  const first = C.lessonById[b.lessonIds[0]].num;
  const last = C.lessonById[b.lessonIds.at(-1)].num;
  const pool = available(last);
  const inBlock = new Set(b.lessonIds);
  const ids = compose(CONFIG.testSize, {
    forced: shuffle(b.testIds),
    main: pool.filter(id => C.items[id].uses.some(u => inBlock.has(u))),
    recall: pool.filter(id => C.items[id].uses.every(u => C.lessonById[u].num < first)),
    recallShare: CONFIG.recallShare,
  });
  startSession({ kind: 'test', ref: blockId, title: `Test du bloc ${b.index + 1}`, ids, requeue: false });
}

function startExam(examId) {
  const e = C.examById[examId];
  const first = C.lessonById[e.lessonIds[0]].num;
  const last = C.lessonById[e.lessonIds.at(-1)].num;
  const pool = available(last, e.id);
  const inExam = new Set(e.lessonIds);
  const main = pool.filter(id => C.items[id].uses.some(u => inExam.has(u)));
  // Toutes les questions de réflexion de l'examen, au moins une question par leçon, puis le reste.
  const forced = [...shuffle(e.poolIds)];
  for (const lid of e.lessonIds) {
    if (forced.some(id => C.items[id].uses.includes(lid))) continue;
    forced.push(...weightedSample(main.filter(id => C.items[id].uses.includes(lid) && !forced.includes(id)), 1));
  }
  const ids = compose(e.size, {
    forced,
    main,
    recall: pool.filter(id => C.items[id].uses.every(u => C.lessonById[u].num < first)),
    recallShare: CONFIG.recallShare,
  });
  startSession({ kind: 'exam', ref: examId, title: examName(e), ids, requeue: false });
}

// Révisions : d'abord ce qui est à revoir, complété par d'anciens exercices (même réussis).
function seenItems() {
  const items = S.get().items;
  return Object.keys(items).filter(id => C.items[id]);
}

function startReview() {
  const due = dueItems().slice(0, CONFIG.reviewSize);
  const rest = seenItems().filter(id => !due.includes(id));
  const ids = [...due, ...weightedSample(rest, CONFIG.reviewSize - due.length)];
  startSession({ kind: 'review', title: due.length ? 'Révisions' : 'Révision libre', ids: shuffle(ids) });
}

function startDrill(lessonIds) {
  const set = new Set(lessonIds);
  const pool = Object.values(C.items)
    .filter(it => it.uses.some(u => set.has(u)) && it.uses.every(u => stepDone({ type: 'lesson', id: u })))
    .filter(it => !it.examOnly || S.get().items[it.id])
    .map(it => it.id);
  startSession({ kind: 'drill', title: 'Entraînement ciblé', ids: weightedSample(pool, CONFIG.drillSize) });
}

function answer(ok, extra = {}) {
  const cur = session.cur;
  Object.assign(cur, extra, { answered: true, ok });
  const q = session.queue[session.idx];
  if (!q.tries) {
    S.recordAnswer(q.id, ok);
    session.first.set(q.id, ok);
  }
  // En leçon et en révision, une question ratée revient plus loin dans la série (plusieurs fois si besoin).
  if (!ok && session.requeue && q.tries < CONFIG.maxRetries) {
    const at = Math.min(session.queue.length, session.idx + 3 + Math.floor(Math.random() * 4));
    session.queue.splice(at, 0, { id: q.id, tries: q.tries + 1 });
  }
  render();
}

function next() {
  session.idx++;
  session.cur = null;
  render();
  window.scrollTo(0, 0);
}

function finish() {
  const scoredIds = [...session.first.keys()].filter(id => !session.scored || session.scored.has(id));
  const okCount = scoredIds.filter(id => session.first.get(id)).length;
  const score = scoredIds.length ? okCount / scoredIds.length : 0;
  const missed = [...session.first].filter(([, ok]) => !ok).map(([id]) => id);
  const byLesson = {};
  for (const id of missed) for (const u of C.items[id].uses) byLesson[u] = (byLesson[u] || 0) + 1;
  let passed = null;
  if (session.kind === 'lesson') {
    S.finishLesson(session.ref, score, CONFIG.lessonPass);
    passed = score >= CONFIG.lessonPass;
  }
  if (session.kind === 'test' || session.kind === 'exam') {
    S.finishTest(session.ref, score, CONFIG.testPass);
    passed = score >= CONFIG.testPass;
  }
  session.result = { score, okCount, total: scoredIds.length, byLesson, passed };
}

// ---------- Vues ----------

const pct = x => `${Math.round(x * 100)} %`;

function bar(m) {
  if (m == null) return '';
  const cls = m < 0.4 ? 'weak' : m < 0.75 ? 'mid' : 'good';
  return `<span class="mbar ${cls}" title="Maîtrise ${pct(m)}"><span style="width:${Math.round(m * 100)}%"></span></span>`;
}

function viewHome() {
  const statuses = stepStatuses();
  const st = S.get();
  const nx = nextStep();
  const due = dueItems().length;
  let h = '<section class="hero">';
  h += nx
    ? `<button class="btn primary big" data-act="step" data-type="${nx.type}" data-id="${nx.id}">Continuer<small>${esc(stepLabel(nx))}</small></button>`
    : '<p class="muted">Tout le contenu disponible est terminé. Révise en attendant la suite !</p>';
  const seen = seenItems().length;
  h += `<button class="btn" data-act="review" ${seen ? '' : 'disabled'}>Révisions<small>${due ? `${due} à revoir` : seen ? 'révision libre' : 'rien pour l’instant'}</small></button>`;
  h += '</section>';

  for (const b of C.blocks) {
    const ts = statuses[`test:${b.id}`];
    const tr = st.tests[b.id];
    const title = `<h2>Bloc ${b.index + 1} <span class="tag">${esc(b.level)}</span></h2>`;
    // Un bloc terminé est replié pour garder l'accueil court.
    if (ts === 'done') {
      const weak = b.lessonIds.filter(lid => (mastery(lid) ?? 1) < 0.4).length;
      h += `<details class="card"><summary>${title}<span class="muted small">✓ terminé · test ${pct(tr.best)}${weak ? ` · ${weak} point${weak > 1 ? 's' : ''} faible${weak > 1 ? 's' : ''}` : ''}</span></summary>`;
    } else h += `<section class="card">${title}`;
    h += `<p class="muted">${esc(b.title || '')}</p><ul class="steps">`;
    for (const lid of b.lessonIds) {
      const l = C.lessonById[lid];
      const s = statuses[`lesson:${lid}`];
      h += `<li class="${s}"><button data-act="step" data-type="lesson" data-id="${lid}" ${s === 'locked' ? 'disabled' : ''}>
        <span class="ico">${icon(s)}</span><span class="lbl">${l.num}. ${rich(l.title)}</span>${bar(mastery(lid))}</button></li>`;
    }
    h += `<li class="${ts} test"><button data-act="step" data-type="test" data-id="${b.id}" ${ts === 'locked' ? 'disabled' : ''}>
      <span class="ico">${icon(ts)}</span><span class="lbl">Test du bloc ${b.index + 1}</span>${tr ? `<span class="score">${pct(tr.best)}</span>` : ''}</button></li>`;
    h += ts === 'done' ? '</ul></details>' : '</ul></section>';
    if (b.exam) {
      const es = statuses[`exam:${b.exam.id}`];
      const er = st.tests[b.exam.id];
      h += `<section class="card exam ${b.exam.kind} ${es}"><button data-act="step" data-type="exam" data-id="${b.exam.id}" ${es === 'locked' ? 'disabled' : ''}>
        <span class="ico">${icon(es)}</span><span class="lbl">${esc(stepLabel({ type: 'exam', id: b.exam.id }))}</span>${er ? `<span class="score">${pct(er.best)}</span>` : ''}</button></section>`;
    }
  }
  return h;
}

function icon(s) {
  return s === 'done' ? '✓' : s === 'current' ? '▶' : '🔒';
}

// Tableau de mots (leçons de vocabulaire). La lecture suit le réglage des furigana.
function viewWords(words) {
  const rows = words.map(w => {
    let r = `<tr><td class="jp">${rich(w.jp)}</td><td class="jp kana"><span class="reading">${esc(w.kana || '')}</span></td><td>${rich(w.fr)}</td></tr>`;
    if (w.ex) r += `<tr class="wex"><td colspan="3"><span class="jp">${rich(w.ex)}</span>${w.exFr ? `<span class="fr">${rich(w.exFr)}</span>` : ''}</td></tr>`;
    return r;
  });
  return `<table class="words"><thead><tr><th>Mot</th><th>Lecture</th><th>Sens</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function viewLesson(id) {
  const l = C.lessonById[id];
  if (!l || stepStatuses()[`lesson:${id}`] === 'locked') return go('#/');
  const done = S.get().lessons[id]?.done;
  let h = `<a class="back" href="#/">← Accueil</a><article class="lesson"><p class="muted">Leçon ${l.num}</p><h1>${rich(l.title)}</h1>`;
  if (l.formula?.length) h += `<div class="formula">${l.formula.map(f => `<div>${rich(f)}</div>`).join('')}</div>`;
  if (l.words?.length) h += viewWords(l.words);
  for (const sec of l.sections || []) {
    h += `<section><h2>${rich(sec.h)}</h2>${(sec.p || []).map(p => `<p>${rich(p)}</p>`).join('')}`;
    if (sec.ex?.length) h += `<ul class="examples">${sec.ex.map(e => `<li><span class="jp">${rich(e.jp)}</span><span class="fr">${rich(e.fr)}</span></li>`).join('')}</ul>`;
    if (sec.vocab?.length) h += `<table class="vocab">${sec.vocab.map(v => `<tr><td class="jp">${rich(v.jp)}</td><td>${rich(v.fr)}</td></tr>`).join('')}</table>`;
    h += '</section>';
  }
  if (l.pieges?.length) h += `<section class="pieges"><h2>Pièges</h2><ul>${l.pieges.map(p => `<li>${rich(p)}</li>`).join('')}</ul></section>`;
  h += `</article><div class="actions"><button class="btn primary" data-act="lesson-ex" data-id="${id}">${done ? 'Refaire les exercices' : 'Passer aux exercices'}</button></div>`;
  return h;
}

function viewSession() {
  if (!session) return go('#/');
  if (session.idx >= session.queue.length) {
    if (!session.result) finish();
    return viewResult();
  }
  const q = session.queue[session.idx];
  const it = C.items[q.id];
  if (!session.cur || session.cur.id !== q.id) session.cur = initExercise(it);
  const cur = session.cur;
  const total = session.queue.length;
  let h = `<div class="sess-top"><button class="link" data-act="quit">✕</button><div class="progress"><span style="width:${(session.idx / total) * 100}%"></span></div><span class="count">${session.idx + 1}/${total}</span></div>`;
  h += `<p class="muted sess-title">${esc(session.title)}${q.tries ? ' · <em>elle revient !</em>' : ''}</p>`;
  h += `<div class="exercise" data-id="${it.id}">${it.type === 'order' ? viewOrder(it, cur) : viewChoice(it, cur)}</div>`;
  if (cur.answered) h += viewFeedback(it, cur);
  return h;
}

function initExercise(it) {
  if (it.type === 'order') {
    let order = shuffle(it.tokens.map((_, i) => i));
    for (let k = 0; k < 5 && order.every((v, i) => it.tokens[v] === it.tokens[i]); k++) order = shuffle(order);
    return { id: it.id, bank: order, built: [] };
  }
  return { id: it.id, order: shuffle(it.choices.map((_, i) => i)) };
}

function viewChoice(it, cur) {
  const hasBlank = it.jp?.includes('＿');
  let h = `<p class="instr">${rich(it.q || (hasBlank ? 'Complète la phrase.' : 'Choisis la bonne réponse.'))}</p>`;
  if (it.jp) h += `<p class="jp big">${richBlank(it.jp, cur.answered ? it.choices[it.a] : null)}</p>`;
  if (it.fr) {
    // Si la traduction donne la réponse (vocabulaire), elle reste cachée jusqu'à ce qu'on réponde.
    if (CONFIG.hideBlankTranslation && hasBlank && !cur.answered && !cur.showFr) h += '<p class="fr"><button class="link small" data-act="show-fr">Voir la traduction</button></p>';
    else h += `<p class="fr">${rich(it.fr)}</p>`;
  }
  h += '<div class="choices">';
  cur.order.forEach((ci, k) => {
    let cls = 'choice';
    if (cur.answered) cls += ci === it.a ? ' good' : ci === cur.picked ? ' bad' : ' dim';
    h += `<button class="${cls}" data-act="pick" data-i="${ci}" ${cur.answered ? 'disabled' : ''}><span class="key">${k + 1}</span><span class="jp">${rich(it.choices[ci])}</span></button>`;
  });
  return h + '</div>';
}

function sentence(tokens) {
  return tokens.map(rich).join('') + '。';
}

function viewOrder(it, cur) {
  let h = `<p class="instr">${rich(it.q || 'Remets les mots dans l’ordre.')}</p>`;
  if (it.fr) h += `<p class="fr big-fr">${rich(it.fr)}</p>`;
  const cls = cur.answered ? (cur.ok ? ' good' : ' bad') : '';
  h += `<div class="built${cls}">${cur.built.map(i => `<button class="tile" data-act="unplace" data-i="${i}" ${cur.answered ? 'disabled' : ''}>${rich(it.tokens[i])}</button>`).join('') || '<span class="muted">Touche les mots ci-dessous…</span>'}</div>`;
  h += `<div class="bank">${cur.bank.filter(i => !cur.built.includes(i)).map(i => `<button class="tile" data-act="place" data-i="${i}" ${cur.answered ? 'disabled' : ''}>${rich(it.tokens[i])}</button>`).join('')}</div>`;
  if (!cur.answered) h += `<div class="actions"><button class="btn primary" data-act="check" ${cur.built.length === it.tokens.length ? '' : 'disabled'}>Valider</button></div>`;
  return h;
}

function viewFeedback(it, cur) {
  let h = `<div class="fb ${cur.ok ? 'ok' : 'ko'}"><strong>${cur.ok ? '✓ Correct' : '✗ Raté'}</strong>`;
  if (!cur.ok) {
    if (it.type === 'order') h += `<p>Réponse : <span class="jp">${sentence(it.tokens)}</span></p>`;
    else if (!it.jp?.includes('＿')) h += `<p>Réponse : <span class="jp">${rich(it.choices[it.a])}</span></p>`;
  }
  if (it.explain) h += `<p>${rich(it.explain)}</p>`;
  h += `<p class="muted small">Notions : ${it.uses.map(u => `L${C.lessonById[u].num}`).join(' · ')}</p>`;
  h += '<button class="btn primary" data-act="next">Continuer</button></div>';
  return h;
}

function viewResult() {
  const r = session.result;
  const k = session.kind;
  let msg = '';
  if (k === 'lesson') msg = r.passed ? 'Leçon validée, la suite est débloquée !' : `Pas encore : il faut ${pct(CONFIG.lessonPass)}. Relis la leçon et recommence.`;
  if (k === 'test') msg = r.passed ? 'Bloc validé, la suite est débloquée !' : `Il faut ${pct(CONFIG.testPass)}. Travaille les points ci-dessous puis retente.`;
  if (k === 'exam') msg = r.passed ? 'Examen réussi, bravo !' : `Il faut ${pct(CONFIG.testPass)}. Travaille les points ci-dessous puis retente.`;
  if (k === 'review' || k === 'drill') msg = 'Séance terminée.';
  let h = `<section class="result ${r.passed === false ? 'fail' : 'pass'}"><p class="muted">${esc(session.title)}</p>
    <div class="big-score">${pct(r.score)}</div><p>${r.okCount}/${r.total} du premier coup</p><p><strong>${msg}</strong></p></section>`;
  const weak = Object.entries(r.byLesson).sort((a, b) => b[1] - a[1]);
  if (weak.length) {
    h += '<section class="card"><h2>Points à retravailler</h2><ul class="weak">';
    for (const [lid, n] of weak) {
      const l = C.lessonById[lid];
      h += `<li><a href="#/lecon/${lid}">L${l.num}. ${rich(l.title)}</a><span class="muted">${n} erreur${n > 1 ? 's' : ''}</span></li>`;
    }
    h += `</ul><button class="btn" data-act="drill" data-ids="${weak.map(w => w[0]).join(',')}">Entraînement ciblé sur ces points</button></section>`;
  }
  h += '<div class="actions">';
  if (r.passed === false || k === 'review' || k === 'drill') h += '<button class="btn" data-act="retry">Recommencer</button>';
  const nx = nextStep();
  if (nx && r.passed) h += `<button class="btn primary" data-act="step" data-type="${nx.type}" data-id="${nx.id}">Suite : ${esc(stepLabel(nx))}</button>`;
  h += '<a class="btn" href="#/">Accueil</a></div>';
  return h;
}

function viewSettings() {
  const st = S.get();
  const cfg = Sync.getConfig();
  const status = Sync.getStatus();
  let h = '<a class="back" href="#/">← Accueil</a><h1>Réglages</h1>';
  h += `<section class="card"><h2>Affichage</h2><label class="row"><input type="checkbox" data-act="furigana" ${st.settings.furigana ? 'checked' : ''}> Afficher les furigana</label>
    <p class="muted small">Masqués, tu peux toucher un kanji pour voir sa lecture.</p></section>`;
  h += '<section class="card"><h2>Synchronisation PC ↔ téléphone</h2>';
  if (cfg) {
    h += `<p>Connecté au compte GitHub <strong>${esc(cfg.login)}</strong>.</p><p class="muted small">${esc(syncText(status))}${status.msg ? ` — ${esc(status.msg)}` : ''}</p>
      <div class="actions left"><button class="btn" data-act="sync-now">Synchroniser maintenant</button><button class="btn" data-act="sync-off">Déconnecter cet appareil</button></div>`;
  } else {
    h += `<p>Ta progression est enregistrée sur cet appareil. Pour la retrouver sur ton autre appareil, connecte une clé GitHub (à faire une fois sur chaque appareil, avec la même clé) :</p>
      <ol class="small"><li><a href="https://github.com/settings/tokens/new?scopes=gist&description=${encodeURIComponent(CONFIG.tokenName)}" target="_blank" rel="noopener">Crée une clé GitHub</a> : seule la case <strong>gist</strong> doit être cochée. Choisis la durée (« No expiration » pour ne plus y penser), puis <em>Generate token</em>.</li>
      <li>Copie la clé (elle commence par <code>ghp_</code>) et colle-la ici.</li></ol>
      <div class="row"><input type="password" id="token" placeholder="ghp_…" autocomplete="off"><button class="btn primary" data-act="sync-on">Connecter</button></div>
      <p class="muted small" id="sync-err">${status.state === 'error' ? esc(status.msg) : ''}</p>`;
  }
  h += '</section>';
  h += `<section class="card"><h2>Sauvegarde</h2><div class="actions left"><button class="btn" data-act="export">Exporter ma progression</button>
    <label class="btn">Importer…<input type="file" accept="application/json" data-act="import" hidden></label></div></section>`;
  h += '<section class="card danger"><h2>Remise à zéro</h2><button class="btn" data-act="reset">Effacer toute ma progression</button></section>';
  return h;
}

function syncText(s) {
  if (s.state === 'off') return 'Synchro non configurée';
  if (s.state === 'busy') return 'Synchro en cours…';
  if (s.state === 'offline') return 'Hors ligne (synchro au retour du réseau)';
  if (s.state === 'error') return 'Erreur de synchro';
  if (s.at) return `Synchronisé à ${s.at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  return 'Synchro prête';
}

function renderSyncBadge() {
  const el = document.getElementById('sync');
  const s = Sync.getStatus();
  el.textContent = s.state === 'off' ? '' : s.state === 'ok' ? '☁ ✓' : s.state === 'busy' ? '☁ …' : s.state === 'offline' ? '☁ hors ligne' : '☁ ⚠';
  el.title = syncText(s);
  el.className = `sync ${s.state}`;
}

// ---------- Routage et événements ----------

function go(hash) {
  location.hash = hash;
  return '';
}

function render() {
  document.body.classList.toggle('nofuri', !S.get().settings.furigana);
  const hash = location.hash || '#/';
  let html;
  if (hash.startsWith('#/lecon/')) html = viewLesson(decodeURIComponent(hash.slice(8)));
  else if (hash === '#/seance') html = viewSession();
  else if (hash === '#/reglages') html = viewSettings();
  else html = viewHome();
  if (html) app.innerHTML = html;
}

function openStep(type, id) {
  if (type === 'lesson') go(`#/lecon/${id}`);
  else if (type === 'test') startTest(id);
  else startExam(id);
}

function onClick(e) {
  const ruby = e.target.closest('ruby');
  const reading = e.target.closest('td.kana');
  if (document.body.classList.contains('nofuri')) {
    if (ruby && !ruby.closest('button')) ruby.classList.toggle('reveal');
    if (reading) reading.classList.toggle('reveal');
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const cur = session?.cur;
  const it = cur && C.items[cur.id];
  switch (act) {
    case 'step': openStep(el.dataset.type, el.dataset.id); break;
    case 'review': startReview(); break;
    case 'lesson-ex': startLesson(el.dataset.id); break;
    case 'drill': startDrill(el.dataset.ids.split(',')); break;
    case 'pick': if (!cur.answered) { const i = +el.dataset.i; answer(i === it.a, { picked: i }); } break;
    case 'place': cur.built.push(+el.dataset.i); render(); break;
    case 'unplace': cur.built = cur.built.filter(i => i !== +el.dataset.i); render(); break;
    case 'check': answer(checkOrder(it, cur.built)); break;
    case 'next': next(); break;
    case 'show-fr': cur.showFr = true; render(); break;
    case 'quit': if (confirm('Quitter la série ? Les réponses déjà données sont gardées.')) { session = null; go('#/'); } break;
    case 'retry': restart(); break;
    case 'sync-on': connectSync(); break;
    case 'sync-now': Sync.syncNow(); break;
    case 'sync-off': if (confirm('Déconnecter la synchro sur cet appareil ? La progression locale est gardée.')) { Sync.disconnect(); render(); } break;
    case 'export': exportState(); break;
    case 'reset': if (confirm('Effacer toute la progression, sur tous tes appareils synchronisés ?')) { S.reset(); go('#/'); } break;
  }
}

function checkOrder(it, built) {
  const got = built.map(i => it.tokens[i]);
  return [it.tokens, ...(it.alt || [])].some(sol => sol.length === got.length && sol.every((t, i) => t === got[i]));
}

function restart() {
  const s = session;
  if (s.kind === 'lesson') startLesson(s.ref);
  else if (s.kind === 'test') startTest(s.ref);
  else if (s.kind === 'exam') startExam(s.ref);
  else if (s.kind === 'review') { if (dueItems().length) startReview(); else go('#/'); }
  else startSession({ ...s, ids: shuffle(s.queue.filter(q => !q.tries).map(q => q.id)) });
}

async function connectSync() {
  const token = document.getElementById('token').value;
  if (!token.trim()) return;
  const err = document.getElementById('sync-err');
  err.textContent = 'Connexion…';
  try {
    await Sync.connect(token);
    render();
  } catch (e) {
    err.textContent = e.message;
  }
}

function exportState() {
  const blob = new Blob([JSON.stringify(S.get(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nihongo-progression-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function onChangeInput(e) {
  const act = e.target.dataset.act;
  if (act === 'furigana') { S.setSetting('furigana', e.target.checked); render(); }
  if (act === 'import' && e.target.files[0]) {
    e.target.files[0].text().then(txt => {
      try {
        S.replace(S.merge(S.get(), JSON.parse(txt)));
        alert('Progression importée.');
        go('#/');
      } catch { alert('Fichier illisible.'); }
    });
  }
}

function onKey(e) {
  if (location.hash !== '#/seance' || !session?.cur || e.target.tagName === 'INPUT') return;
  const cur = session.cur;
  if (e.key === 'Enter') {
    const btn = app.querySelector(cur.answered ? '[data-act="next"]' : '[data-act="check"]');
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
  } else if (!cur.answered && /^[1-9]$/.test(e.key)) {
    app.querySelectorAll('[data-act="pick"]')[+e.key - 1]?.click();
  } else if (!cur.answered && e.key === 'Backspace' && cur.built?.length) {
    cur.built.pop();
    render();
  }
}

async function main() {
  try {
    C = await loadCourse();
  } catch (e) {
    app.innerHTML = `<p class="error">Impossible de charger le cours : ${esc(e.message)}</p>`;
    return;
  }
  app.addEventListener('click', onClick);
  app.addEventListener('change', onChangeInput);
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', render);
  S.onChange(meta => {
    if (!meta.fromSync) Sync.schedule();
    // Une synchro ne doit pas interrompre un exercice en cours.
    else if (location.hash !== '#/seance') render();
  });
  Sync.onStatus(() => {
    renderSyncBadge();
    if (location.hash === '#/reglages') render();
  });
  renderSyncBadge();
  render();
  Sync.init();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

main();
