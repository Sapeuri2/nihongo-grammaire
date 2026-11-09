// Test de bout en bout dans un vrai navigateur (Chromium + Playwright) : node tools/test-parcours.mjs
// Fait tout le parcours (leçons, tests, examens) comme un utilisateur, en ratant une question sur 6
// dans les leçons, et signale les erreurs JS et les débordements horizontaux (largeur téléphone).
// Ne touche à aucune progression réelle : navigateur neuf, serveur local temporaire.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const PORT = +(process.env.PORT || 8799);
const URL0 = `http://localhost:${PORT}/`;

// Les bonnes réponses, lues dans le contenu.
const read = p => JSON.parse(readFileSync(root + p, 'utf8'));
const man = read('data/manifest.json');
const items = {};
for (const f of man.blocks) {
  const b = read(f);
  for (const l of b.lessons) for (const e of l.exercises || []) items[e.id] = e;
  for (const e of [...(b.test || []), ...(b.examTest || [])]) items[e.id] = e;
}
for (const f of man.focus || []) for (const e of read(f).exercises || []) items[e.id] = e;

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

async function answerAll(wrongEvery = 0) {
  await page.waitForSelector('.exercise, .result');
  let k = 0;
  while (await page.$('.exercise')) {
    const id = await page.getAttribute('.exercise', 'data-id');
    const it = items[id];
    if (!it) throw new Error(`question inconnue ${id}`);
    k++;
    const wrong = wrongEvery && k % wrongEvery === 0;
    if (it.type === 'choice') await page.click(`[data-act="pick"][data-i="${wrong ? (it.a + 1) % it.choices.length : it.a}"]`);
    else {
      const order = it.tokens.map((_, i) => i);
      for (const i of wrong ? order.reverse() : order) await page.click(`.bank [data-act="place"][data-i="${i}"]`);
      await page.click('[data-act="check"]');
    }
    // Avec autoNext, une bonne réponse passe seule à la suite : un toucher accélère.
    if (await page.$('[data-act="next"]')) await page.click('[data-act="next"]');
    else { await page.waitForTimeout(200); await page.click('#app'); }
  }
  return k;
}

let failed = false;
try {
  await page.goto(URL0);
  await page.waitForSelector('.hero');
  for (let step = 0; step < 200; step++) {
    await page.goto(`${URL0}#/`);
    await page.waitForSelector('.hero');
    const btn = await page.$('.hero [data-act="step"]');
    if (!btn) { console.log('Fin du contenu.'); break; }
    const label = (await btn.textContent()).replace('Continuer', '').trim();
    await btn.click();
    const kind = await page.waitForSelector('.lesson, .exercise', { timeout: 5000 }).then(el => el.getAttribute('class'));
    if (kind === 'lesson') {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) { failed = true; console.log(`  ⚠ débordement horizontal de ${over}px : ${label}`); }
      await page.click('[data-act="lesson-ex"]');
    }
    const n = await answerAll(label.startsWith('Leçon') ? 6 : 0);
    console.log(`${label} → ${n} questions, ${await page.textContent('.result .big-score')}`);
  }
  console.log('Étapes validées :', await page.$$eval('li.done, .card.exam.done', a => a.length));
} catch (e) {
  failed = true;
  console.log('ÉCHEC :', e.message);
} finally {
  console.log('Erreurs JS :', errs.length ? errs : 'aucune');
  await browser.close();
  server.kill();
}
process.exit(failed || errs.length ? 1 : 0);
