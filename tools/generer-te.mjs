// Génère le point clé « forme て » : antisèche + exercices sur 80 verbes environ.
// Propre à l'appli grammaire. Usage : node tools/generer-te.mjs
// Les mauvais choix appliquent la règle d'une AUTRE terminaison (書って, 飲みて, 帰て…) :
// ils sont toujours faux, et ce sont les erreurs qu'on veut chasser.
// Tous les verbes sont écrits avec leur kanji : en kana seul, un piège pourrait tomber
// sur un autre vrai verbe (すんで = 住んで, はって = 貼って…).
import { writeFileSync, mkdirSync } from 'node:fs';

// [id, forme du dictionnaire (balisage furigana), groupe, sens]
const VERBS = [
  // Groupe 1 en う
  ['kau', '{買|か}う', 1, 'acheter'], ['au', '{会|あ}う', 1, 'rencontrer'], ['iu', '{言|い}う', 1, 'dire'],
  ['utau', '{歌|うた}う', 1, 'chanter'], ['tsukau', '{使|つか}う', 1, 'utiliser'], ['arau', '{洗|あら}う', 1, 'laver'],
  ['narau', '{習|なら}う', 1, 'apprendre (avec quelqu\'un)'], ['suu', '{吸|す}う', 1, 'fumer, aspirer'],
  ['tetsudau', '{手伝|てつだ}う', 1, 'aider'], ['omou', '{思|おも}う', 1, 'penser'], ['harau', '{払|はら}う', 1, 'payer'],
  // en つ
  ['matsu', '{待|ま}つ', 1, 'attendre'], ['motsu', '{持|も}つ', 1, 'tenir, avoir'], ['tatsu', '{立|た}つ', 1, 'se mettre debout'],
  // en る (groupe 1 : les pièges !)
  ['kaeru', '{帰|かえ}る', 1, 'rentrer'], ['hairu', '{入|はい}る', 1, 'entrer'], ['hashiru', '{走|はし}る', 1, 'courir'],
  ['shiru', '{知|し}る', 1, 'apprendre (une nouvelle), savoir'], ['kiru-couper', '{切|き}る', 1, 'couper'],
  ['noru', '{乗|の}る', 1, 'monter (dans un véhicule)'], ['toru', '{取|と}る', 1, 'prendre'],
  ['tsukuru', '{作|つく}る', 1, 'fabriquer, cuisiner'], ['furu', '{降|ふ}る', 1, 'tomber (pluie, neige)'],
  ['owaru', '{終|お}わる', 1, 'se terminer'], ['wakaru', '{分|わ}かる', 1, 'comprendre'],
  ['suwaru', '{座|すわ}る', 1, 's\'asseoir'], ['uru', '{売|う}る', 1, 'vendre'], ['okuru', '{送|おく}る', 1, 'envoyer'],
  ['hajimaru', '{始|はじ}まる', 1, 'commencer (tout seul)'],
  // en む・ぶ・ぬ
  ['nomu', '{飲|の}む', 1, 'boire'], ['yomu', '{読|よ}む', 1, 'lire'], ['sumu', '{住|す}む', 1, 'habiter'],
  ['yasumu', '{休|やす}む', 1, 'se reposer'], ['tanomu', '{頼|たの}む', 1, 'demander (un service)'],
  ['asobu', '{遊|あそ}ぶ', 1, 's\'amuser'], ['yobu', '{呼|よ}ぶ', 1, 'appeler'], ['tobu', '{飛|と}ぶ', 1, 'voler (dans l\'air)'],
  ['erabu', '{選|えら}ぶ', 1, 'choisir'], ['shinu', '{死|し}ぬ', 1, 'mourir'],
  // en く
  ['kaku', '{書|か}く', 1, 'écrire'], ['kiku', '{聞|き}く', 1, 'écouter'], ['aruku', '{歩|ある}く', 1, 'marcher'],
  ['hataraku', '{働|はたら}く', 1, 'travailler'], ['tsuku', '{着|つ}く', 1, 'arriver'], ['oku', '{置|お}く', 1, 'poser'],
  ['aku', '{開|あ}く', 1, 's\'ouvrir'], ['naku', '{泣|な}く', 1, 'pleurer'], ['haku', '{履|は}く', 1, 'mettre (chaussures, pantalon)'],
  // en ぐ
  ['oyogu', '{泳|およ}ぐ', 1, 'nager'], ['isogu', '{急|いそ}ぐ', 1, 'se dépêcher'], ['nugu', '{脱|ぬ}ぐ', 1, 'enlever (un vêtement)'],
  // en す
  ['hanasu', '{話|はな}す', 1, 'parler'], ['kasu', '{貸|か}す', 1, 'prêter'], ['dasu', '{出|だ}す', 1, 'sortir (qqch), envoyer'],
  ['kesu', '{消|け}す', 1, 'éteindre, effacer'], ['kaesu', '{返|かえ}す', 1, 'rendre'], ['osu', '{押|お}す', 1, 'pousser, appuyer'],
  ['sagasu', '{探|さが}す', 1, 'chercher'],
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
  // Groupe 3
  ['suru', 'する', 3, 'faire'], ['kuru', '{来|く}る', 3, 'venir'],
  ['benkyou', '{勉強|べんきょう}する', 3, 'étudier'], ['denwa', '{電話|でんわ}する', 3, 'téléphoner'],
];

const I_ROW = { う: 'い', つ: 'ち', る: 'り', む: 'み', ぶ: 'び', ぬ: 'に', く: 'き', ぐ: 'ぎ', す: 'し' };
const RULE = {
  う: 'う → って', つ: 'つ → って', る: 'る (groupe 1) → って', む: 'む → んで', ぶ: 'ぶ → んで', ぬ: 'ぬ → んで',
  く: 'く → いて', ぐ: 'ぐ → いで', す: 'す → して',
};
const plain = s => s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1');

// Forme て correcte + 3 erreurs typiques (chacune applique une autre règle).
function teForms([id, dict, group]) {
  if (group === 3) {
    if (id === 'kuru') return { ok: 'きて', bad: ['くて', 'こて', 'くって'], why: '{来|く}る est irrégulier : {来|き}て (la lecture devient き).' };
    const head = dict.slice(0, -2); // « する » final
    return { ok: `${head}して`, bad: [`${head}すて`, `${head}しって`, `${head}さて`], why: 'する est irrégulier : して.' };
  }
  const stem = dict.slice(0, -1);
  const end = dict.at(-1);
  if (group === 2) return { ok: `${stem}て`, bad: [`${stem}って`, `${stem}んで`, `${dict}て`], why: `${dict} est du groupe 2 : on enlève る et on met て.` };
  if (group === 'iku') return { ok: `${stem}って`, bad: [`${stem}いて`, `${stem}きて`, `${stem}んで`], why: '{行|い}く est LA seule exception du groupe 1 : {行|い}って (jamais {行|い}いて).' };
  const i = stem + I_ROW[end];
  const bad = {
    う: [`${stem}いて`, `${stem}んで`, `${stem}して`],
    つ: [`${stem}いて`, `${stem}んで`, `${i}て`],
    る: [`${stem}て`, `${stem}んで`, `${stem}いて`],
    む: [`${stem}って`, `${i}て`, `${stem}いて`],
    ぶ: [`${stem}って`, `${i}て`, `${stem}いで`],
    ぬ: [`${stem}って`, `${i}て`, `${stem}いで`],
    く: [`${stem}って`, `${i}て`, `${stem}いで`],
    ぐ: [`${stem}いて`, `${stem}んで`, `${i}て`],
    す: [`${stem}って`, `${stem}いて`, `${dict}て`],
  }[end];
  const ok = stem + { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' }[end];
  const trap = end === 'る' ? ` Piège : ${dict} finit par る mais il est du groupe 1 (pas る → て).` : '';
  return { ok, bad, why: `${dict} : groupe 1 en ${end} → ${RULE[end]}.${trap}` };
}

// て → た, で → だ (même règle de fabrication).
const toTa = s => s.replace(/て$/, 'た').replace(/で$/, 'だ');

const exercises = [];
function add(ex) {
  const shown = ex.choices.map(plain);
  if (new Set(shown).size !== shown.length) throw new Error(`choix en double : ${ex.id} ${shown}`);
  exercises.push(ex);
}

const byId = Object.fromEntries(VERBS.map(v => [v[0], v]));
const label = v => `${v[1]} (${v[3]})`;

for (const v of VERBS) {
  const { ok, bad, why } = teForms(v);
  add({ id: `te-${v[0]}`, type: 'choice', uses: ['n5-04'], q: `Forme て de ${label(v)} ?`, choices: [ok, ...bad], a: 0, explain: why });
  add({ id: `ta-${v[0]}`, type: 'choice', uses: ['n5-24'], q: `Forme た (passé familier) de ${label(v)} ?`, choices: [ok, ...bad].map(toTa), a: 0, explain: `${why} La forme た se fabrique comme la forme て : て → た, で → だ.` });
}

// « Laquelle est fausse ? » : 4 verbes de terminaisons différentes, une seule forme fausse.
const POOLS = [
  ['kau', 'nomu', 'kaku', 'hanasu'], ['matsu', 'yomu', 'oyogu', 'taberu'], ['kaeru', 'asobu', 'kiku', 'miru'],
  ['hairu', 'sumu', 'isogu', 'kasu'], ['iku', 'yobu', 'hataraku', 'okiru'], ['hashiru', 'shinu', 'aruku', 'neru'],
  ['kiru-couper', 'kiru-porter', 'motsu', 'dasu'], ['furu', 'oriru', 'iu', 'nugu'], ['shiru', 'yasumu', 'kesu', 'kuru'],
  ['noru', 'tobu', 'oku', 'akeru'], ['tsukuru', 'erabu', 'tsuku', 'suru'], ['owaru', 'tanomu', 'naku', 'oshieru'],
  ['suwaru', 'utau', 'osu', 'deru'], ['uru', 'tatsu', 'sagasu', 'abiru'], ['okuru', 'arau', 'aku', 'kariru'],
  ['wakaru', 'tsukau', 'haku', 'wasureru'],
];
POOLS.forEach((ids, n) => {
  const wrongAt = n % 4;
  const choices = ids.map((vid, k) => {
    const v = byId[vid];
    const { ok, bad } = teForms(v);
    return `${v[1]} → ${k === wrongAt ? bad[0] : ok}`;
  });
  const v = byId[ids[wrongAt]];
  add({
    id: `te-faux-${String(n + 1).padStart(2, '0')}`, type: 'choice', uses: ['n5-04'],
    q: 'Une seule de ces formes て est **fausse**. Laquelle ?',
    choices, a: wrongAt,
    explain: `${v[1]} → ${teForms(v).ok}. ${teForms(v).why}`,
  });
});

// Phrases : il faut fabriquer la forme て du verbe donné, en contexte.
// [verbe, phrase, leçon nécessaire]
const PHRASES = [
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
];
PHRASES.forEach(([vid, jp, lesson], n) => {
  const v = byId[vid];
  const { ok, bad, why } = teForms(v);
  add({
    id: `te-phr-${String(n + 1).padStart(2, '0')}`, type: 'choice', uses: ['n5-04', lesson],
    q: `${label(v)} → forme て`, jp, choices: [ok, ...bad], a: 0, explain: why,
  });
});

const focus = {
  id: 'forme-te',
  label: 'て',
  title: 'La forme て',
  unlockAfter: 'n5-04',
  sheet: {
    sections: [
      {
        h: 'À quoi elle sert',
        p: [
          'Partout : てください (demander), ている (en train de), てもいいです, enchaîner des actions…',
          'Et la **forme た** (passé familier) se fabrique **exactement pareil** : て → た, で → だ.',
        ],
      },
      {
        h: 'La méthode en 2 questions',
        p: [
          '**1. Quel groupe ?** Groupe 2 ({食|た}べる, {見|み}る…) : on enlève る et on met **て**. Groupe 3 : する → **して**, {来|く}る → **{来|き}て**.',
          '**2. Groupe 1 : regarde la dernière syllabe** et applique le tableau.',
        ],
        grid: {
          head: ['Fin', 'Devient', 'Exemples'],
          rows: [
            ['う・つ・る', '==って==', '{買|か}==って==, {待|ま}==って==, {帰|かえ}==って=='],
            ['む・ぶ・ぬ', '==んで==', '{飲|の}==んで==, {遊|あそ}==んで==, {死|し}==んで=='],
            ['く', '==いて==', '{書|か}==いて==, {聞|き}==いて=='],
            ['ぐ', '==いで==', '{泳|およ}==いで==, {急|いそ}==いで=='],
            ['す', '==して==', '{話|はな}==して==, {貸|か}==して=='],
            ['{行|い}く', '==って==', '{行|い}==って== : la seule exception'],
          ],
        },
      },
      {
        h: 'Groupes 2 et 3',
        grid: {
          head: ['Verbe', 'Devient', 'Exemples'],
          rows: [
            ['Groupe 2', 'る → ==て==', '{食|た}べ==て==, {見|み}==て==, {起|お}き==て=='],
            ['する', '==して==', '{勉強|べんきょう}==して=='],
            ['{来|く}る', '==きて==', '{来|き}==て== (la lecture change)'],
          ],
        },
      },
      {
        h: 'À réciter',
        p: [
          '**う・つ・る → って ; む・ぶ・ぬ → んで ; く → いて ; ぐ → いで ; す → して ; {行|い}く → {行|い}って.**',
          'Astuce : les fins « sonores » (ぐ, む, ぶ, ぬ) donnent **で** ; les autres donnent **て**.',
        ],
      },
    ],
    pieges: [
      'Les **faux groupe 2** : {帰|かえ}る, {入|はい}る, {走|はし}る, {知|し}る, {切|き}る finissent par る mais sont du groupe 1 → {帰|かえ}==って== (jamais {帰|かえ}て).',
      'Même son, deux verbes : {着|き}る (porter, groupe 2) → {着|き}==て== ; {切|き}る (couper, groupe 1) → {切|き}==って==.',
      '{降|ふ}る (tomber, la pluie) → {降|ふ}==って== ; {降|お}りる (descendre) → {降|お}り==て==.',
      '{行|い}く → {行|い}==って== (pas {行|い}いて) · {来|く}る → {来|き}て (きて).',
    ],
  },
  exercises,
};

mkdirSync(new URL('../data/focus/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/focus/forme-te.json', import.meta.url), JSON.stringify(focus, null, 1) + '\n');
console.log(`data/focus/forme-te.json : ${VERBS.length} verbes, ${exercises.length} exercices`);
