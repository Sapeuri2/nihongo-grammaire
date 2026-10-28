// Génère le point clé « Les verbes : る・ます・て » : antisèche + exercices sur environ 130 verbes.
// Propre à l'appli grammaire. Usage : node tools/generer-te.mjs
// Pour chaque verbe : groupe, る → ます, ます → る, る → て, ます → て, て → る, る → た.
// Les mauvais choix appliquent la règle d'une AUTRE terminaison ou d'un autre groupe (書って, 帰ます,
// 起く…) et on vérifie qu'aucun n'est la vraie forme d'un autre verbe (入る pour 入れる, 出ます pour 出す…).
// Tous les verbes ont leur kanji : en kana seul, un piège pourrait tomber sur un autre vrai verbe.
import { writeFileSync, mkdirSync } from 'node:fs';

// [id, forme du dictionnaire, groupe (1, 2, 3 ou 'iku'), sens]
// Les id déjà publiés ne doivent pas changer (la progression y est rattachée).
const VERBS = [
  // Groupe 1 en う
  ['kau', '{買|か}う', 1, 'acheter'], ['au', '{会|あ}う', 1, 'rencontrer'], ['iu', '{言|い}う', 1, 'dire'],
  ['utau', '{歌|うた}う', 1, 'chanter'], ['tsukau', '{使|つか}う', 1, 'utiliser'], ['arau', '{洗|あら}う', 1, 'laver'],
  ['narau', '{習|なら}う', 1, 'apprendre (avec quelqu\'un)'], ['suu', '{吸|す}う', 1, 'fumer, aspirer'],
  ['tetsudau', '{手伝|てつだ}う', 1, 'aider'], ['omou', '{思|おも}う', 1, 'penser'], ['harau', '{払|はら}う', 1, 'payer'],
  ['warau', '{笑|わら}う', 1, 'rire'], ['hirou', '{拾|ひろ}う', 1, 'ramasser'],
  // en つ
  ['matsu', '{待|ま}つ', 1, 'attendre'], ['motsu', '{持|も}つ', 1, 'tenir, avoir'], ['tatsu', '{立|た}つ', 1, 'se mettre debout'],
  ['katsu', '{勝|か}つ', 1, 'gagner'], ['utsu', '{打|う}つ', 1, 'frapper, taper'],
  // en る, groupe 1 : les pièges !
  ['kaeru', '{帰|かえ}る', 1, 'rentrer'], ['hairu', '{入|はい}る', 1, 'entrer'], ['hashiru', '{走|はし}る', 1, 'courir'],
  ['shiru', '{知|し}る', 1, 'apprendre (une nouvelle), savoir'], ['kiru-couper', '{切|き}る', 1, 'couper'],
  ['iru-falloir', '{要|い}る', 1, 'avoir besoin de'], ['noru', '{乗|の}る', 1, 'monter (dans un véhicule)'],
  ['toru', '{取|と}る', 1, 'prendre'], ['tsukuru', '{作|つく}る', 1, 'fabriquer, cuisiner'],
  ['furu', '{降|ふ}る', 1, 'tomber (pluie, neige)'], ['owaru', '{終|お}わる', 1, 'se terminer'],
  ['wakaru', '{分|わ}かる', 1, 'comprendre'], ['suwaru', '{座|すわ}る', 1, 's\'asseoir'], ['uru', '{売|う}る', 1, 'vendre'],
  ['okuru', '{送|おく}る', 1, 'envoyer'], ['hajimaru', '{始|はじ}まる', 1, 'commencer (tout seul)'],
  ['modoru', '{戻|もど}る', 1, 'revenir'], ['magaru', '{曲|ま}がる', 1, 'tourner (à un coin)'],
  ['tomaru', '{止|と}まる', 1, 's\'arrêter'], ['komaru', '{困|こま}る', 1, 'être embêté'],
  ['ganbaru', '{頑張|がんば}る', 1, 'faire de son mieux'], ['okoru', '{怒|おこ}る', 1, 'se fâcher'],
  ['wataru', '{渡|わた}る', 1, 'traverser'], ['sawaru', '{触|さわ}る', 1, 'toucher'], ['noboru', '{登|のぼ}る', 1, 'grimper'],
  // en む・ぶ・ぬ
  ['nomu', '{飲|の}む', 1, 'boire'], ['yomu', '{読|よ}む', 1, 'lire'], ['sumu', '{住|す}む', 1, 'habiter'],
  ['yasumu', '{休|やす}む', 1, 'se reposer'], ['tanomu', '{頼|たの}む', 1, 'demander (un service)'],
  ['tanoshimu', '{楽|たの}しむ', 1, 'profiter, s\'amuser'], ['tsutsumu', '{包|つつ}む', 1, 'emballer'],
  ['asobu', '{遊|あそ}ぶ', 1, 's\'amuser'], ['yobu', '{呼|よ}ぶ', 1, 'appeler'], ['tobu', '{飛|と}ぶ', 1, 'voler (dans l\'air)'],
  ['erabu', '{選|えら}ぶ', 1, 'choisir'], ['hakobu', '{運|はこ}ぶ', 1, 'transporter'], ['narabu', '{並|なら}ぶ', 1, 'faire la queue, s\'aligner'],
  ['yorokobu', '{喜|よろこ}ぶ', 1, 'se réjouir'], ['shinu', '{死|し}ぬ', 1, 'mourir'],
  // en く
  ['kaku', '{書|か}く', 1, 'écrire'], ['kiku', '{聞|き}く', 1, 'écouter'], ['aruku', '{歩|ある}く', 1, 'marcher'],
  ['hataraku', '{働|はたら}く', 1, 'travailler'], ['tsuku', '{着|つ}く', 1, 'arriver'], ['oku', '{置|お}く', 1, 'poser'],
  ['aku', '{開|あ}く', 1, 's\'ouvrir'], ['naku', '{泣|な}く', 1, 'pleurer'], ['haku', '{履|は}く', 1, 'mettre (chaussures, pantalon)'],
  ['hiku-jouer', '{弾|ひ}く', 1, 'jouer (d\'un instrument)'], ['hiku-tirer', '{引|ひ}く', 1, 'tirer'],
  ['migaku', '{磨|みが}く', 1, 'brosser, polir'], ['saku', '{咲|さ}く', 1, 'fleurir'],
  // en ぐ
  ['oyogu', '{泳|およ}ぐ', 1, 'nager'], ['isogu', '{急|いそ}ぐ', 1, 'se dépêcher'], ['nugu', '{脱|ぬ}ぐ', 1, 'enlever (un vêtement)'],
  ['sawagu', '{騒|さわ}ぐ', 1, 'faire du bruit'],
  // en す
  ['hanasu', '{話|はな}す', 1, 'parler'], ['kasu', '{貸|か}す', 1, 'prêter'], ['dasu', '{出|だ}す', 1, 'sortir (qqch), envoyer'],
  ['kesu', '{消|け}す', 1, 'éteindre, effacer'], ['kaesu', '{返|かえ}す', 1, 'rendre'], ['osu', '{押|お}す', 1, 'pousser, appuyer'],
  ['sagasu', '{探|さが}す', 1, 'chercher'], ['naosu', '{直|なお}す', 1, 'réparer, corriger'], ['watasu', '{渡|わた}す', 1, 'remettre (qqch)'],
  ['otosu', '{落|お}とす', 1, 'faire tomber, perdre'],
  // l'exception
  ['iku', '{行|い}く', 'iku', 'aller'],
  // Groupe 2
  ['taberu', '{食|た}べる', 2, 'manger'], ['miru', '{見|み}る', 2, 'voir, regarder'], ['okiru', '{起|お}きる', 2, 'se lever'],
  ['neru', '{寝|ね}る', 2, 'dormir, se coucher'], ['kiru-porter', '{着|き}る', 2, 'porter (un vêtement)'],
  ['oshieru', '{教|おし}える', 2, 'enseigner'], ['akeru', '{開|あ}ける', 2, 'ouvrir'], ['shimeru', '{閉|し}める', 2, 'fermer'],
  ['deru', '{出|で}る', 2, 'sortir'], ['abiru', '{浴|あ}びる', 2, 'prendre (une douche)'], ['kariru', '{借|か}りる', 2, 'emprunter'],
  ['wasureru', '{忘|わす}れる', 2, 'oublier'], ['oboeru', '{覚|おぼ}える', 2, 'mémoriser'], ['ireru', '{入|い}れる', 2, 'mettre dedans'],
  ['oriru', '{降|お}りる', 2, 'descendre (d\'un véhicule)'], ['miseru', '{見|み}せる', 2, 'montrer'],
  ['hajimeru', '{始|はじ}める', 2, 'commencer (qqch)'], ['kakeru', '{掛|か}ける', 2, 'mettre (des lunettes), téléphoner'],
  ['kaeru-changer', '{変|か}える', 2, 'changer (qqch)'], ['kimeru', '{決|き}める', 2, 'décider'], ['tomeru', '{止|と}める', 2, 'arrêter (qqch)'],
  ['shiraberu', '{調|しら}べる', 2, 'chercher (une info)'], ['kotaeru', '{答|こた}える', 2, 'répondre'],
  ['kangaeru', '{考|かんが}える', 2, 'réfléchir'], ['tsukareru', '{疲|つか}れる', 2, 'se fatiguer'], ['okureru', '{遅|おく}れる', 2, 'être en retard'],
  ['shinjiru', '{信|しん}じる', 2, 'croire'], ['tariru', '{足|た}りる', 2, 'suffire'], ['ochiru', '{落|お}ちる', 2, 'tomber'],
  ['ikiru', '{生|い}きる', 2, 'vivre'], ['mitsukeru', '{見|み}つける', 2, 'trouver'], ['atsumeru', '{集|あつ}める', 2, 'rassembler'],
  ['tsuzukeru', '{続|つづ}ける', 2, 'continuer (qqch)'], ['iru-etre', '{居|い}る', 2, 'être, se trouver (personne)'], ['dekiru', 'できる', 2, 'pouvoir, savoir faire'],
  // Groupe 3
  ['suru', 'する', 3, 'faire'], ['kuru', '{来|く}る', 3, 'venir'], ['benkyou', '{勉強|べんきょう}する', 3, 'étudier'],
  ['denwa', '{電話|でんわ}する', 3, 'téléphoner'], ['ryouri', '{料理|りょうり}する', 3, 'cuisiner'],
  ['sanpo', '{散歩|さんぽ}する', 3, 'se promener'], ['kekkon', '{結婚|けっこん}する', 3, 'se marier'],
];

const I_ROW = { う: 'い', つ: 'ち', る: 'り', む: 'み', ぶ: 'び', ぬ: 'に', く: 'き', ぐ: 'ぎ', す: 'し' };
const A_ROW = { う: 'わ', つ: 'た', る: 'ら', む: 'ま', ぶ: 'ば', ぬ: 'な', く: 'か', ぐ: 'が', す: 'さ' };
// Son en « e » ou « i » → son en « u » : sert au piège « traiter un groupe 2 comme un groupe 1 » (起きる → 起く).
const TO_U = { き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る', い: 'う',
  け: 'く', げ: 'ぐ', せ: 'す', て: 'つ', ね: 'ぬ', べ: 'ぶ', め: 'む', れ: 'る', え: 'う', じ: 'ず' };
const TE_END = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
const RULE = { う: 'う → って', つ: 'つ → って', る: 'る (groupe 1) → って', む: 'む → んで', ぶ: 'ぶ → んで', ぬ: 'ぬ → んで', く: 'く → いて', ぐ: 'ぐ → いで', す: 'す → して' };

const plain = s => s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1');
const toTa = s => s.replace(/て$/, 'た').replace(/で$/, 'だ');

// Les formes correctes d'un verbe.
function forms(v) {
  const [id, dict, group] = v;
  if (group === 3) {
    if (id === 'kuru') return { dict: 'くる', masu: 'きます', te: 'きて', masuShown: '{来|き}ます', teShown: '{来|き}て' };
    const head = dict.slice(0, -2);
    return { dict, masu: `${head}します`, te: `${head}して` };
  }
  const stem = dict.slice(0, -1);
  const end = dict.at(-1);
  if (group === 2) return { dict, masu: `${stem}ます`, te: `${stem}て` };
  if (group === 'iku') return { dict, masu: `${stem}きます`, te: `${stem}って` };
  return { dict, masu: `${stem}${I_ROW[end]}ます`, te: `${stem}${TE_END[end]}` };
}

// Toutes les vraies formes de tous les verbes (et quelques vrais verbes hors liste) : interdites comme pièges.
const VALID = new Set(['行う', '止む', '続く', '足る', '空く', '済む', '済ます', '開く', '着く', '入る', '降る']);
for (const v of VERBS) {
  const f = forms(v);
  for (const x of [f.dict, f.masu, f.te, toTa(f.te)]) VALID.add(plain(x));
}

// Garde les 3 premiers pièges valables : différents de la réponse, pas une vraie forme, pas en double.
function pick(v, kind, correct, candidates) {
  const out = [];
  for (const c of candidates) {
    const p = plain(c);
    if (p === plain(correct) || VALID.has(p) || out.some(o => plain(o) === p)) continue;
    out.push(c);
    if (out.length === 3) return out;
  }
  throw new Error(`pas assez de pièges pour ${v[0]} (${kind}) : ${candidates.join(', ')}`);
}

function parts(v) {
  const [, dict, group] = v;
  const stem = dict.slice(0, -1);
  const end = dict.at(-1);
  const last = stem.at(-1);
  // Piège « groupe 1 » pour un verbe du groupe 2 : 起き → 起く, 食べ → 食ぶ (si le radical finit par un kana).
  const g1trap = group === 2 && TO_U[last] ? stem.slice(0, -1) + TO_U[last] : `${stem}う`;
  return { stem, end, i: I_ROW[end] && stem + I_ROW[end], g1trap };
}

function badMasu(v) {
  const [id, dict, group] = v;
  const { stem, end } = parts(v);
  if (id === 'kuru') return ['くます', 'くるます', 'こます', 'きるます'];
  if (group === 3) { const h = dict.slice(0, -2); return [`${h}するます`, `${h}しります`, `${h}すります`, `${h}さます`]; }
  if (group === 2) return [`${stem}ります`, `${dict}ます`, `${stem}います`, `${stem}みます`];
  if (group === 'iku') return [`${stem}ます`, `${dict}ます`, `${stem}かます`];
  return [`${stem}ます`, `${dict}ます`, `${stem}${A_ROW[end]}ます`, `${stem}${I_ROW[end]}ります`];
}

function badDict(v) {
  const [id, dict, group] = v;
  const { stem, end, i, g1trap } = parts(v);
  if (id === 'kuru') return ['こる', 'くるる', 'きるる', 'きつ'];
  if (group === 3) { const h = dict.slice(0, -2); return [`${h}しる`, `${h}す`, `${h}するる`, `${h}しう`]; }
  if (group === 2) return [g1trap, stem, `${dict}る`, `${stem}う`, `${stem}つ`];
  if (group === 'iku') return [`${stem}きる`, `${stem}き`, `${dict}る`];
  return [`${i}る`, i, `${dict}る`, `${stem}る`, `${stem}${A_ROW[end]}る`];
}

function badTe(v) {
  const [id, dict, group] = v;
  const { stem, end, i } = parts(v);
  if (id === 'kuru') return ['くて', 'こて', 'くって', 'きって'];
  if (group === 3) { const h = dict.slice(0, -2); return [`${h}すて`, `${h}しって`, `${h}さて`, `${h}して`]; }
  if (group === 2) return [`${stem}って`, `${stem}んで`, `${dict}て`, `${stem}いて`];
  if (group === 'iku') return [`${stem}いて`, `${stem}きて`, `${stem}んで`];
  return {
    う: [`${stem}いて`, `${stem}んで`, `${stem}して`],
    つ: [`${stem}いて`, `${stem}んで`, `${i}て`],
    る: [`${stem}て`, `${stem}んで`, `${stem}いて`],
    む: [`${stem}って`, `${i}て`, `${stem}いて`],
    ぶ: [`${stem}って`, `${i}て`, `${stem}いで`],
    ぬ: [`${stem}って`, `${i}て`, `${stem}いで`],
    く: [`${stem}って`, `${i}て`, `${stem}いで`],
    ぐ: [`${stem}いて`, `${stem}んで`, `${i}て`],
    す: [`${stem}って`, `${stem}いて`, `${dict}て`],
  }[end].concat([`${stem}って`, `${stem}んで`, `${stem}いて`, `${stem}して`, `${i}て`]);
}

// て → る : les autres terminaisons qui donnent la même fin (って ← う / つ / る…), plus le piège de groupe.
function badFromTe(v) {
  const [id, dict, group] = v;
  const { stem, end, g1trap } = parts(v);
  if (id === 'kuru') return ['こる', 'くくる', 'きつ', 'こつ'];
  if (group === 3) { const h = dict.slice(0, -2); return [`${h}しる`, `${h}しつ`, `${h}しう`, `${h}す`]; }
  if (group === 2) return [g1trap, `${stem}つ`, `${stem}う`, `${stem}む`, `${stem}く`];
  if (group === 'iku') return [`${stem}う`, `${stem}る`, `${stem}つ`, `${stem}む`];
  const same = { って: ['う', 'つ', 'る', 'く'], んで: ['む', 'ぶ', 'ぬ', 'る'], いて: ['ぐ', 'う', 'る'], いで: ['く', 'ぶ', 'う'], して: ['つ', 'る', 'う'] }[TE_END[end]];
  return [...same.map(e => stem + e), `${dict}る`, `${stem}いる`];
}

function groupWhy(v) {
  const [, dict, group] = v;
  if (group === 3) return `${dict} est du groupe 3 (irrégulier).`;
  if (group === 2) return `${dict} est du groupe 2 : る → ます / て / る, rien d'autre ne bouge.`;
  if (group === 'iku') return '{行|い}く est du groupe 1, avec UNE exception : sa forme て est {行|い}って.';
  const end = dict.at(-1);
  const trap = end === 'る' ? ` Piège : ${dict} finit par る mais c'est un groupe 1 (à retenir par cœur).` : '';
  return `${dict} est du groupe 1 (fin en ${end}).${trap}`;
}

function teWhy(v) {
  const [id, dict, group] = v;
  if (id === 'kuru') return '{来|く}る est irrégulier : {来|き}て (la lecture devient き).';
  if (group === 3) return 'する est irrégulier : して.';
  if (group === 2) return `${dict} est du groupe 2 : on enlève る et on met て (pas って !).`;
  if (group === 'iku') return '{行|い}く est LA seule exception du groupe 1 : {行|い}って (jamais {行|い}いて).';
  const end = dict.at(-1);
  const trap = end === 'る' ? ` Piège : ${dict} finit par る mais il est du groupe 1 → って.` : '';
  return `${dict} : groupe 1 en ${end} → ${RULE[end]}.${trap}`;
}

const exercises = [];
function add(ex) {
  const shown = ex.choices.map(plain);
  if (new Set(shown).size !== shown.length) throw new Error(`choix en double : ${ex.id} ${shown}`);
  exercises.push(ex);
}

const byId = Object.fromEntries(VERBS.map(v => [v[0], v]));
const label = v => `${v[1]} (${v[3]})`;
const GROUPS = ['groupe 1', 'groupe 2', 'groupe 3 (irrégulier)'];

for (const v of VERBS) {
  const f = forms(v);
  const masuShown = f.masuShown || f.masu;
  const teShown = f.teShown || f.te;
  const g = v[2] === 'iku' ? 1 : v[2];
  add({ id: `grp-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `${label(v)} : quel groupe ?`, choices: GROUPS, a: g - 1, explain: groupWhy(v) });
  add({ id: `masu-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `Forme ます de ${label(v)} ?`, choices: [f.masu, ...pick(v, 'masu', f.masu, badMasu(v))], a: 0, explain: `${groupWhy(v)} → ${masuShown}.` });
  add({ id: `dict-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `Forme du dictionnaire de ${masuShown} (${v[3]}) ?`, choices: [f.dict, ...pick(v, 'dict', f.dict, badDict(v))], a: 0, explain: `${groupWhy(v)} ${masuShown} → ${v[1]}.` });
  add({ id: `te-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `Forme て de ${label(v)} ?`, choices: [f.te, ...pick(v, 'te', f.te, badTe(v))], a: 0, explain: teWhy(v) });
  add({ id: `mte-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `Forme て de ${masuShown} (${v[3]}) ?`, choices: [f.te, ...pick(v, 'te', f.te, badTe(v))], a: 0, explain: `D'abord ${masuShown} → ${v[1]}, puis : ${teWhy(v)}` });
  add({ id: `rte-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `${teShown} (${v[3]}) : quelle est la forme du dictionnaire ?`, choices: [f.dict, ...pick(v, 'rte', f.dict, badFromTe(v))], a: 0, explain: `${teShown} → ${v[1]}. ${teWhy(v)}` });
  const ta = toTa(f.te);
  add({ id: `ta-${v[0]}`, type: 'choice', uses: ['n5-24'], q: `Forme た (passé familier) de ${label(v)} ?`, choices: [ta, ...pick(v, 'ta', ta, badTe(v).map(toTa))], a: 0, explain: `${teWhy(v)} La forme た se fabrique comme la forme て : て → た, で → だ.` });
}

// « Laquelle est fausse ? » : 4 verbes, une seule forme fausse.
const POOLS = [
  ['kau', 'nomu', 'kaku', 'hanasu'], ['matsu', 'yomu', 'oyogu', 'taberu'], ['kaeru', 'asobu', 'kiku', 'miru'],
  ['hairu', 'sumu', 'isogu', 'kasu'], ['iku', 'yobu', 'hataraku', 'okiru'], ['hashiru', 'shinu', 'aruku', 'neru'],
  ['kiru-couper', 'kiru-porter', 'motsu', 'dasu'], ['furu', 'oriru', 'iu', 'nugu'], ['shiru', 'yasumu', 'kesu', 'kuru'],
  ['noru', 'tobu', 'oku', 'akeru'], ['tsukuru', 'erabu', 'tsuku', 'suru'], ['owaru', 'tanomu', 'naku', 'oshieru'],
  ['suwaru', 'utau', 'osu', 'deru'], ['uru', 'tatsu', 'sagasu', 'abiru'], ['okuru', 'arau', 'aku', 'kariru'],
  ['wakaru', 'tsukau', 'haku', 'wasureru'],
  ['kaeru-changer', 'modoru', 'hakobu', 'migaku'], ['iru-falloir', 'iru-etre', 'katsu', 'naosu'], ['ireru', 'magaru', 'tsutsumu', 'sawagu'],
  ['ikiru', 'tomaru', 'narabu', 'otosu'], ['kimeru', 'komaru', 'yorokobu', 'hiku-jouer'], ['tomeru', 'ganbaru', 'warau', 'watasu'],
  ['shiraberu', 'okoru', 'hirou', 'saku'], ['tsuzukeru', 'wataru', 'utsu', 'benkyou'],
];
const FAUX = [
  ['te', 'formes て', f => f.te, badTe, 'te-faux'],
  ['masu', 'formes ます', f => f.masu, badMasu, 'masu-faux'],
  ['dict', 'formes du dictionnaire (depuis ます)', f => f.dict, badDict, 'dict-faux'],
];
for (const [kind, what, get, bad, prefix] of FAUX) {
  POOLS.forEach((ids, n) => {
    // Les 16 premiers « te-faux » existent déjà : mêmes id et même construction.
    const wrongAt = n % 4;
    const shown = vid => {
      const v = byId[vid];
      const f = forms(v);
      if (kind === 'dict') return f.masuShown || f.masu;
      return v[1];
    };
    const choices = ids.map((vid, k) => {
      const v = byId[vid];
      const f = forms(v);
      const right = get(f);
      const value = k === wrongAt ? pick(v, kind, right, bad(v))[0] : (kind === 'te' && f.teShown) || right;
      return `${shown(vid)} → ${value}`;
    });
    const v = byId[ids[wrongAt]];
    const f = forms(v);
    add({
      id: `${prefix}-${String(n + 1).padStart(2, '0')}`, type: 'choice', uses: ['n5-04'],
      q: `Une seule de ces ${what} est **fausse**. Laquelle ?`,
      choices, a: wrongAt,
      explain: `${shown(ids[wrongAt])} → ${get(f)}. ${kind === 'te' ? teWhy(v) : groupWhy(v)}`,
    });
  });
}

// Phrases : fabriquer la forme demandée en contexte. [verbe, phrase, leçon nécessaire]
const TE_PHRASES = [
  ['matsu', 'ちょっと＿ください。', 'n5-18'], ['kaku', 'ここに{名前|なまえ}を＿ください。', 'n5-18'],
  ['hanasu', 'ゆっくり＿ください。', 'n5-18'], ['akeru', '{窓|まど}を＿ください。', 'n5-18'],
  ['kesu', '{電気|でんき}を＿ください。', 'n5-18'], ['yomu', 'この{本|ほん}を＿ください。', 'n5-18'],
  ['kasu', 'ペンを＿ください。', 'n5-18'], ['miseru', '{写真|しゃしん}を＿ください。', 'n5-18'],
  ['suwaru', 'ここに＿ください。', 'n5-18'], ['isogu', '{早|はや}く＿ください。', 'n5-18'],
  ['arau', '{手|て}を＿ください。', 'n5-18'], ['nugu', 'くつを＿ください。', 'n5-18'],
  ['iu', 'もう{一度|いちど}＿ください。', 'n5-18'], ['oshieru', '{日本語|にほんご}を＿ください。', 'n5-18'],
  ['kuru', 'あしたも＿ください。', 'n5-18'], ['hairu', 'どうぞ、{部屋|へや}に＿ください。', 'n5-18'],
  ['oriru', 'つぎの{駅|えき}で＿ください。', 'n5-18'], ['nomu', 'この{薬|くすり}を＿ください。', 'n5-18'],
  ['yobu', 'タクシーを＿ください。', 'n5-18'], ['iku', '{病院|びょういん}に＿ください。', 'n5-18'],
  ['furu', '{雨|あめ}が＿います。', 'n5-19'], ['asobu', '{子|こ}どもが{公園|こうえん}で＿います。', 'n5-19'],
  ['sumu', '{兄|あに}は{東京|とうきょう}に＿います。', 'n5-19'], ['hataraku', '{父|ちち}は{銀行|ぎんこう}で＿います。', 'n5-19'],
  ['taberu', '{今|いま}、ばんごはんを＿います。', 'n5-19'], ['neru', '{弟|おとうと}はまだ＿います。', 'n5-19'],
  ['oyogu', '{子|こ}どもたちが{海|うみ}で＿います。', 'n5-19'], ['kakeru', '{田中|たなか}さんはめがねを＿います。', 'n5-19'],
  ['kiru-porter', '{山田|やまだ}さんは{赤|あか}いセーターを＿います。', 'n5-19'], ['shiru', 'その{人|ひと}を＿いますか。', 'n5-19'],
  ['kaeru-changer', '{予定|よてい}を＿ください。', 'n5-18'], ['ireru', 'かばんに{本|ほん}を＿ください。', 'n5-18'],
  ['tomeru', 'ここに{車|くるま}を＿ください。', 'n5-18'], ['shiraberu', 'じしょで＿ください。', 'n5-18'],
];
TE_PHRASES.forEach(([vid, jp, lesson], n) => {
  const v = byId[vid];
  const f = forms(v);
  add({
    id: `te-phr-${String(n + 1).padStart(2, '0')}`, type: 'choice', uses: ['n5-04', lesson],
    q: `${label(v)} → forme て`, jp, choices: [f.te, ...pick(v, 'te', f.te, badTe(v))], a: 0, explain: teWhy(v),
  });
});
const MASU_PHRASES = [
  ['benkyou', '{毎日|まいにち}{日本語|にほんご}を＿。'], ['taberu', '{毎朝|まいあさ}パンを＿。'], ['nomu', 'コーヒーを＿か。'],
  ['kaeru', '{何時|なんじ}にうちへ＿か。'], ['okiru', '{六時|ろくじ}に＿。'], ['iku', 'あした{東京|とうきょう}へ＿。'],
  ['kuru', '{田中|たなか}さんもパーティーに＿。'], ['kaku', '{母|はは}に{手紙|てがみ}を＿。'], ['yomu', '{電車|でんしゃ}で{新聞|しんぶん}を＿。'],
  ['hairu', '{夜|よる}、おふろに＿。'], ['hanasu', '{友|とも}だちと{日本語|にほんご}で＿。'], ['matsu', '{駅|えき}で{友|とも}だちを＿。'],
  ['neru', '{十一時|じゅういちじ}に＿。'], ['hashiru', '{毎朝|まいあさ}{公園|こうえん}で＿。'], ['kiru-porter', '{寒|さむ}いですから、コートを＿。'],
  ['iru-falloir', 'お{金|かね}が＿か。'], ['kaeru-changer', '{電車|でんしゃ}の{時間|じかん}を＿。'],
];
MASU_PHRASES.forEach(([vid, jp], n) => {
  const v = byId[vid];
  const f = forms(v);
  add({
    id: `masu-phr-${String(n + 1).padStart(2, '0')}`, type: 'choice', uses: ['n5-04'],
    q: `${label(v)} → forme ます`, jp, choices: [f.masu, ...pick(v, 'masu', f.masu, badMasu(v))], a: 0, explain: `${groupWhy(v)} → ${f.masuShown || f.masu}.`,
  });
});

const focus = {
  id: 'forme-te',
  label: '{動詞|どうし}',
  title: 'Les verbes : る・ます・て',
  unlockAfter: 'n5-04',
  sheet: {
    sections: [
      {
        h: 'Tout part du groupe',
        p: [
          'Chaque verbe a une **forme du dictionnaire** (る : {食|た}べる, {書|か}く), une **forme ます** (polie) et une **forme て**. Pour passer de l\'une à l\'autre, il faut d\'abord savoir **à quel groupe** il appartient.',
          '**Groupe 3** : seulement する (et nom + する : {勉強|べんきょう}する) et {来|く}る.',
          '**Groupe 2** : finit par る, avec un son en « e » ou « i » juste avant : {食|た}べる, {見|み}る, {起|お}きる, {寝|ね}る.',
          '**Groupe 1** : tout le reste. **Attention** : certains verbes en « e/i + る » sont quand même du groupe 1 et s\'apprennent par cœur : {帰|かえ}る, {入|はい}る, {走|はし}る, {知|し}る, {切|き}る, {要|い}る.',
        ],
      },
      {
        h: 'る → ます',
        grid: {
          head: ['Groupe', 'Règle', 'Exemples'],
          rows: [
            ['Groupe 1', 'son « u » → son « i » + ==ます==', '{書|か}く → {書|か}==きます==, {買|か}う → {買|か}==います==, {帰|かえ}る → {帰|かえ}==ります=='],
            ['Groupe 2', 'る → ==ます==', '{食|た}べる → {食|た}べ==ます==, {見|み}る → {見|み}==ます=='],
            ['Groupe 3', 'irréguliers', 'する → ==します==, {来|く}る → ==きます=='],
          ],
        },
      },
      {
        h: 'ます → る (dans l\'autre sens)',
        p: ['**Piège** : la forme ます ne dit pas toujours le groupe. {書|か}きます vient de {書|か}く (groupe 1), mais {起|お}きます vient de {起|お}きる (groupe 2). Il faut connaître le verbe.'],
        grid: {
          head: ['Groupe', 'Règle', 'Exemples'],
          rows: [
            ['Groupe 1', 'son « i » → son « u »', '{書|か}きます → {書|か}==く==, {帰|かえ}ります → {帰|かえ}==る==, {待|ま}ちます → {待|ま}==つ=='],
            ['Groupe 2', 'ます → ==る==', '{起|お}きます → {起|お}き==る== (pas {起|お}く !), {借|か}ります → {借|か}り==る=='],
            ['Groupe 3', 'irréguliers', 'します → ==する==, きます → ==くる=='],
          ],
        },
      },
      {
        h: 'る → て',
        grid: {
          head: ['Fin (groupe 1)', 'Devient', 'Exemples'],
          rows: [
            ['う・つ・る', '==って==', '{買|か}==って==, {待|ま}==って==, {帰|かえ}==って=='],
            ['む・ぶ・ぬ', '==んで==', '{飲|の}==んで==, {遊|あそ}==んで==, {死|し}==んで=='],
            ['く', '==いて==', '{書|か}==いて==, {聞|き}==いて=='],
            ['ぐ', '==いで==', '{泳|およ}==いで==, {急|いそ}==いで=='],
            ['す', '==して==', '{話|はな}==して==, {貸|か}==して=='],
            ['{行|い}く', '==って==', '{行|い}==って== : la seule exception'],
            ['Groupe 2', 'る → ==て==', '{食|た}べ==て==, {見|み}==て==, {起|お}き==て== (jamais って !)'],
            ['Groupe 3', 'irréguliers', '==して==, {来|き}==て== (きて)'],
          ],
        },
      },
      {
        h: 'ます → て : en deux temps',
        p: [
          '**1.** Repasse par la forme du dictionnaire. **2.** Applique le tableau.',
          '{書|か}きます → {書|か}く → {書|か}==いて== · {帰|かえ}ります → {帰|かえ}る → {帰|かえ}==って== · {飲|の}みます → {飲|の}む → {飲|の}==んで==',
          'Raccourci pour le groupe 2 : ます → て directement ({食|た}べます → {食|た}べ==て==).',
        ],
      },
      {
        h: 'て → る (dans l\'autre sens)',
        p: [
          '**って** → う, つ ou る · **んで** → む, ぶ ou ぬ · **いて** → く · **いで** → ぐ · **して** → す (ou する).',
          'Le kanji te dit lequel : {買|か}って → {買|か}う, {待|ま}って → {待|ま}つ, {帰|かえ}って → {帰|かえ}る.',
        ],
      },
      {
        h: 'À réciter',
        p: [
          '**う・つ・る → って ; む・ぶ・ぬ → んで ; く → いて ; ぐ → いで ; す → して ; {行|い}く → {行|い}って ; groupe 2 : る → て.**',
          'Astuce : les fins « sonores » (ぐ, む, ぶ, ぬ) donnent **で** ; les autres donnent **て**. Et la forme **た** se fabrique pareil (て → た, で → だ).',
        ],
      },
    ],
    pieges: [
      '**Même son, groupe différent** : {帰|かえ}る (rentrer, g1) → {帰|かえ}ります / {帰|かえ}==って== ; {変|か}える (changer, g2) → {変|か}えます / {変|か}え==て==.',
      '{要|い}る (avoir besoin, g1) → {要|い}ります / {要|い}==って== ; {居|い}る (être là, g2) → {居|い}ます / {居|い}==て==.',
      '{切|き}る (couper, g1) → {切|き}ります / {切|き}==って== ; {着|き}る (porter, g2) → {着|き}ます / {着|き}==て==.',
      '**Même kanji, deux verbes** : {入|はい}る / {入|い}れる, {降|ふ}る / {降|お}りる, {開|あ}く / {開|あ}ける, {出|だ}す / {出|で}る, {始|はじ}まる / {始|はじ}める.',
      '{行|い}く → {行|い}って (pas {行|い}いて) · {来|く}る → きます / きて (la lecture change).',
    ],
  },
  exercises,
};

mkdirSync(new URL('../data/focus/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/focus/forme-te.json', import.meta.url), JSON.stringify(focus, null, 1) + '\n');
console.log(`data/focus/forme-te.json : ${VERBS.length} verbes, ${exercises.length} exercices`);
