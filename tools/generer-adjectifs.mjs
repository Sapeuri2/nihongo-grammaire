// Génère le point clé « い ou な ? » : antisèche + exercices de conjugaison des adjectifs.
// Propre à l'appli grammaire. Usage : node tools/generer-adjectifs.mjs
// Les mauvais choix appliquent la règle de l'AUTRE type (静かくない, 高いでした, きれかった…) :
// ils sont donc toujours faux, et ce sont exactement les erreurs qu'on veut chasser.
import { writeFileSync, mkdirSync } from 'node:fs';

// [id, adjectif (balisage furigana), sens, sujet de la phrase, nom pour « devant un nom »]
const I = [
  ['takai', '{高|たか}い', 'cher', 'この{車|くるま}は', '{車|くるま}'],
  ['yasui', '{安|やす}い', 'bon marché', 'この{店|みせ}は', '{店|みせ}'],
  ['ookii', '{大|おお}きい', 'grand', 'この{家|いえ}は', '{家|いえ}'],
  ['chiisai', '{小|ちい}さい', 'petit', 'この{部屋|へや}は', '{部屋|へや}'],
  ['atarashii', '{新|あたら}しい', 'neuf, nouveau', 'この{本|ほん}は', '{本|ほん}'],
  ['furui', '{古|ふる}い', 'vieux', 'この{車|くるま}は', '{車|くるま}'],
  ['oishii', 'おいしい', 'bon (au goût)', 'このケーキは', 'ケーキ'],
  ['muzukashii', 'むずかしい', 'difficile', 'テストは', 'テスト'],
  ['omoshiroi', 'おもしろい', 'intéressant', 'この{映画|えいが}は', '{映画|えいが}'],
  ['atsui', '{暑|あつ}い', 'chaud (temps)', '{今日|きょう}は', '{日|ひ}'],
  ['samui', '{寒|さむ}い', 'froid (temps)', '{外|そと}は', '{日|ひ}'],
  ['nagai', '{長|なが}い', 'long', 'この{映画|えいが}は', '{映画|えいが}'],
  ['isogashii', 'いそがしい', 'occupé', '{田中|たなか}さんは', '{人|ひと}'],
  ['tanoshii', '{楽|たの}しい', 'amusant', 'パーティーは', 'パーティー'],
  ['hiroi', '{広|ひろ}い', 'spacieux', 'この{部屋|へや}は', '{部屋|へや}'],
  ['ii', 'いい', 'bien, bon', '{天気|てんき}は', '{天気|てんき}'],
];
// [id, adjectif, sens, sujet, nom, leçon où il apparaît, piège (« finit par い » en kana)]
const NA = [
  ['shizuka', '{静|しず}か', 'calme', 'この{町|まち}は', '{町|まち}', 'n5-09'],
  ['nigiyaka', 'にぎやか', 'animé', '{東京|とうきょう}は', '{町|まち}', 'n5-09'],
  ['kirei', 'きれい', 'beau, propre', 'この{部屋|へや}は', '{部屋|へや}', 'n5-09', true],
  ['yuumei', '{有名|ゆうめい}', 'célèbre', 'この{店|みせ}は', '{店|みせ}', 'n5-09', true],
  ['genki', '{元気|げんき}', 'en forme', '{田中|たなか}さんは', '{人|ひと}', 'n5-09'],
  ['benri', '{便利|べんり}', 'pratique', 'この{町|まち}は', '{町|まち}', 'n5-09'],
  ['hima', 'ひま', 'libre (pas occupé)', '{山田|やまだ}さんは', '{人|ひと}', 'n5-09'],
  ['shinsetsu', '{親切|しんせつ}', 'gentil', '{先生|せんせい}は', '{人|ひと}', 'n5-09'],
  ['suki', '{好|す}き', 'aimé', 'すしは', '{食|た}べ{物|もの}', 'n5-11'],
  ['kirai', 'きらい', 'détesté', 'ピーマンは', '{食|た}べ{物|もの}', 'n5-11', true],
  ['taisetsu', '{大切|たいせつ}', 'important, précieux', 'この{写真|しゃしん}は', '{写真|しゃしん}', 'n5-09'],
  ['kantan', 'かんたん', 'facile, simple', 'このテストは', 'テスト', 'n5-09'],
];

const FORMS = {
  neg: 'négatif poli',
  past: 'passé poli',
  pastneg: 'passé négatif poli',
  pneg: 'négatif familier',
  ppast: 'passé familier',
  ppastneg: 'passé négatif familier',
};

const plain = s => s.replace(/\{([^|{}]+)\|[^{}]+\}/g, '$1');
const exercises = [];

function add(ex) {
  const shown = ex.choices.map(plain);
  if (new Set(shown).size !== shown.length) throw new Error(`choix en double : ${ex.id} ${shown}`);
  exercises.push(ex);
}

function conjugation(prefix, id, adj, fr, subj, form, correct, wrong, uses, explain) {
  add({
    id: `${prefix}-${id}-${form}`, type: 'choice', uses,
    // La consigne est dans q (toujours visible) : la ligne fr peut être cachée par hideBlankTranslation.
    q: `${adj} (${fr}) → ${FORMS[form]}`, jp: `${subj}＿。`,
    choices: [correct, ...wrong], a: 0, explain,
  });
}

for (const [id, a, fr, subj, noun] of I) {
  const ok = id === 'ii' ? 'よ' : a.slice(0, -1); // radical correct (いい → よ)
  const bad = a.slice(0, -1); // pour いい : い (いくない ✗)
  const why = id === 'ii'
    ? 'いい est irrégulier : il devient よ- (よくない, よかった, よくなかった).'
    : `${a} est un adjectif en い : on enlève le い et on le transforme.`;
  add({
    id: `adj-${id}-type`, type: 'choice', uses: ['n5-08', 'n5-09'],
    q: `${a} (${fr}) : adjectif en い ou en な ?`,
    choices: ['adjectif en い', 'adjectif en な'], a: 0,
    explain: `${a}${noun}, ${ok}くないです : c'est un adjectif en い.`,
  });
  add({
    id: `adj-${id}-noun`, type: 'choice', uses: ['n5-08'],
    q: `${a} (${fr}) + ${noun} : devant un nom`, jp: 'これは＿です。',
    choices: [`${a}${noun}`, `${a}な${noun}`, `${a}の${noun}`, `${bad}く${noun}`], a: 0,
    explain: 'Adjectif en い : directement devant le nom, sans な ni の.',
  });
  conjugation('adj', id, a, fr, subj, 'neg', `${ok}くないです`, [`${a}じゃありません`, id === 'ii' ? 'いくないです' : `${a}くないです`, `${a}ないです`], ['n5-08'], `${why} Négatif : くないです.`);
  conjugation('adj', id, a, fr, subj, 'past', `${ok}かったです`, [`${a}でした`, `${ok}かったでした`, id === 'ii' ? 'いかったです' : `${a}かったです`], ['n5-10'], `${why} Passé : かったです (jamais ${plain(a)}でした).`);
  conjugation('adj', id, a, fr, subj, 'pastneg', `${ok}くなかったです`, [`${a}じゃありませんでした`, `${ok}くないでした`, id === 'ii' ? 'いくなかったです' : `${a}くなかったです`], ['n5-10'], `${why} Passé négatif : くなかったです.`);
  conjugation('adj', id, a, fr, subj, 'pneg', `${ok}くない`, [`${a}くない`, `${a}ない`, `${bad}じゃない`], ['n5-26'], `${why} Négatif familier : くない.`);
  conjugation('adj', id, a, fr, subj, 'ppast', `${ok}かった`, [`${a}だった`, `${a}かった`, `${ok}かっただ`].map(x => (id === 'ii' && x === 'いいかった' ? 'いかった' : x)), ['n5-26'], `${why} Passé familier : かった.`);
  conjugation('adj', id, a, fr, subj, 'ppastneg', `${ok}くなかった`, [`${a}じゃなかった`, `${a}くなかった`, `${ok}くないだった`], ['n5-26'], `${why} Passé négatif familier : くなかった.`);
}

for (const [id, a, fr, subj, noun, lesson, trap] of NA) {
  // Piège : un adjectif en な qui finit par い en kana. L'erreur classique coupe ce い (きれくない).
  const cut = trap && !a.endsWith('}') ? a.slice(0, -1) : a;
  const why = trap
    ? `Piège ! ${a} finit par le son « い » mais c'est un adjectif en な : il ne change pas, c'est です qui change.`
    : `${a} est un adjectif en な : il ne change pas, c'est です qui change (comme un nom).`;
  const base = lesson === 'n5-11' ? ['n5-11'] : [];
  add({
    id: `na-${id}-type`, type: 'choice', uses: ['n5-08', 'n5-09', ...base],
    q: `${a} (${fr}) : adjectif en い ou en な ?`,
    choices: ['adjectif en い', 'adjectif en な'], a: 1,
    explain: `${trap ? 'Piège ! ' : ''}${a}な${noun}, ${a}じゃありません : c'est un adjectif en な.`,
  });
  add({
    id: `na-${id}-noun`, type: 'choice', uses: ['n5-09', ...base],
    q: `${a} (${fr}) + ${noun} : devant un nom`, jp: 'これは＿です。',
    // 有名 se colle devant un nom pour former de vrais mots (有名店, 有名人) : autre piège pour lui.
    choices: [`${a}な${noun}`, id === 'yuumei' ? `${a}だ${noun}` : `${a}${noun}`, `${a}の${noun}`, `${cut === a ? a + 'い' : cut + 'く'}${noun}`], a: 0,
    explain: `Adjectif en な : il faut な devant le nom → ${a}な${noun}.`,
  });
  conjugation('na', id, a, fr, subj, 'neg', `${a}じゃありません`, [`${cut}くないです`, `${a}ないです`, `${a}なじゃありません`], ['n5-09', ...base], `${why} Négatif : じゃありません.`);
  conjugation('na', id, a, fr, subj, 'past', `${a}でした`, [`${cut}かったです`, `${a}だったでした`, `${a}なでした`], ['n5-10', ...base], `${why} Passé : でした (jamais ${plain(cut)}かった).`);
  conjugation('na', id, a, fr, subj, 'pastneg', `${a}じゃありませんでした`, [`${cut}くなかったです`, `${a}じゃないでした`, `${a}じゃありませんだった`], ['n5-10', ...base], `${why} Passé négatif : じゃありませんでした.`);
  conjugation('na', id, a, fr, subj, 'pneg', `${a}じゃない`, [`${cut}くない`, `${a}ない`, `${a}だない`], ['n5-26', ...base], `${why} Négatif familier : じゃない.`);
  conjugation('na', id, a, fr, subj, 'ppast', `${a}だった`, [`${cut}かった`, `${a}なだった`, `${a}だだった`], ['n5-26', ...base], `${why} Passé familier : だった.`);
  conjugation('na', id, a, fr, subj, 'ppastneg', `${a}じゃなかった`, [`${cut}くなかった`, `${a}じゃないだった`, `${a}なかった`], ['n5-26', ...base], `${why} Passé négatif familier : じゃなかった.`);
}

// ---------- Quel passé ? でした / ました / かったです / ありました ----------
// [id, mot affiché, radical à conjuguer, sens, type, leçons]
const PAST = [
  ['ame', '{雨|あめ}', '{雨|あめ}', 'pluie', 'nom', ['n5-06']],
  ['nichiyoubi', '{日曜日|にちようび}', '{日曜日|にちようび}', 'dimanche', 'nom', ['n5-06']],
  ['nihonjin', '{日本人|にほんじん}', '{日本人|にほんじん}', 'Japonais', 'nom', ['n5-06']],
  ['tesuto', 'テスト', 'テスト', 'contrôle', 'nom', ['n5-06']],
  ['gakusei', '{学生|がくせい}', '{学生|がくせい}', 'étudiant', 'nom', ['n5-06']],
  ['taberu', '{食|た}べます', '{食|た}べ', 'manger', 'verbe', ['n5-06']],
  ['nomu', '{飲|の}みます', '{飲|の}み', 'boire', 'verbe', ['n5-06']],
  ['iku', '{行|い}きます', '{行|い}き', 'aller', 'verbe', ['n5-06']],
  ['furu', '{降|ふ}ります', '{降|ふ}り', 'tomber (pluie, neige)', 'verbe', ['n5-06']],
  ['miru', '{見|み}ます', '{見|み}', 'regarder', 'verbe', ['n5-06']],
  ['aru', 'あります', 'あり', 'il y a (objet, événement)', 'verbe', ['n5-06', 'n5-07']],
  ['iru', 'います', 'い', 'il y a (personne, animal)', 'verbe', ['n5-06', 'n5-07']],
  ['samui', '{寒|さむ}い', '{寒|さむ}', 'froid', 'い', ['n5-10']],
  ['atsui', '{暑|あつ}い', '{暑|あつ}', 'chaud', 'い', ['n5-10']],
  ['tanoshii', '{楽|たの}しい', '{楽|たの}し', 'amusant', 'い', ['n5-10']],
  ['oishii', 'おいしい', 'おいし', 'bon (au goût)', 'い', ['n5-10']],
  ['ii', 'いい', 'よ', 'bien, bon', 'い', ['n5-10']],
  ['shizuka', '{静|しず}か', '{静|しず}か', 'calme', 'な', ['n5-10']],
  ['kirei', 'きれい', 'きれい', 'beau, propre', 'な', ['n5-10']],
  ['hima', 'ひま', 'ひま', 'libre', 'な', ['n5-10']],
  ['genki', '{元気|げんき}', '{元気|げんき}', 'en forme', 'な', ['n5-10']],
];
const TYPE_NAME = { nom: 'un nom', verbe: 'un verbe', い: 'un adjectif en い', な: 'un adjectif en な' };

for (const [id, word, r, fr, type, uses] of PAST) {
  // `r` est ce qu'on conjugue ; pour いい le bon radical est よ, le mauvais い.
  const w = id === 'ii' ? 'いい' : word;
  const cut = id === 'kirei' ? 'きれ' : r;
  const forms = {
    nom: { aff: [`${r}でした`, `${r}ました`, `${r}かったです`, `${r}だでした`], neg: [`${r}じゃありませんでした`, `${r}ませんでした`, `${r}くなかったです`, `${r}ないでした`] },
    verbe: { aff: [`${r}ました`, `${r}でした`, `${r}かったです`, `${r}ますでした`], neg: [`${r}ませんでした`, `${r}じゃありませんでした`, `${r}くなかったです`, `${r}ましたじゃありません`] },
    い: { aff: [`${r}かったです`, `${w}でした`, `${w}ました`, id === 'ii' ? 'いかったです' : `${w}かったです`], neg: [`${r}くなかったです`, `${w}じゃありませんでした`, `${w}ませんでした`, `${r}くないでした`] },
    な: { aff: [`${r}でした`, `${cut}かったです`, `${r}ました`, `${r}なでした`], neg: [`${r}じゃありませんでした`, `${cut}くなかったです`, `${r}ませんでした`, `${r}じゃないでした`] },
  }[type];
  const rule = {
    nom: 'Un nom → でした / じゃありませんでした (jamais ました ni かった).',
    verbe: 'Un verbe → ます devient ました / ませんでした (jamais でした ni かった).',
    い: id === 'ii' ? 'いい est un adjectif en い irrégulier → よかったです / よくなかったです.' : 'Un adjectif en い → い devient かったです / くなかったです (jamais でした).',
    な: `${id === 'kirei' ? 'Piège : きれい est un adjectif en な. ' : ''}Un adjectif en な → でした / じゃありませんでした, comme un nom.`,
  }[type];
  for (const [form, label] of [['aff', 'passé poli'], ['neg', 'passé négatif poli']]) {
    add({
      id: `past-${id}-${form}`, type: 'choice', uses,
      q: `${label[0].toUpperCase() + label.slice(1)} de ${word} (${fr}) ?`,
      choices: forms[form], a: 0,
      explain: `${word} est ${TYPE_NAME[type]}. ${rule}`,
    });
  }
}

// Phrases qui mélangent les types : il faut d'abord reconnaître le mot avant le trou.
const MIX = [
  ['n5-06', 'きのうは{雨|あめ}＿。', 'Hier, c\'était un temps de pluie.', ['でした', 'ました', 'かったです', 'かったでした'], '{雨|あめ} est un nom → でした.'],
  ['n5-06', 'きのう、{雨|あめ}が{降|ふ}り＿。', 'Hier, il a plu.', ['ました', 'でした', 'かったです', 'ありました'], '{降|ふ}ります est un verbe → ました.'],
  ['n5-10', 'きのうはとても{寒|さむ}＿。', 'Hier, il faisait très froid.', ['かったです', 'いでした', 'いました', 'かったでした'], '{寒|さむ}い est un adjectif en い → かったです.'],
  ['n5-10', 'パーティーはにぎやか＿。', 'La fête était animée.', ['でした', 'かったです', 'ました', 'ありました'], 'にぎやか est un adjectif en な → でした.'],
  ['n5-07', '{先週|せんしゅう}、テストが＿。', 'La semaine dernière, il y a eu un contrôle.', ['ありました', 'でした', 'いました', 'かったです'], 'Un événement qui a eu lieu → ありました.'],
  ['n5-10', 'テストはむずかし＿。', 'Le contrôle était difficile.', ['かったです', 'いでした', 'ました', 'くでした'], 'むずかしい est un adjectif en い → かったです.'],
  ['n5-07', '{公園|こうえん}に{子|こ}どもが＿。', 'Il y avait des enfants au parc.', ['いました', 'ありました', 'でした', 'かったです'], 'Des personnes → います → いました.'],
  ['n5-10', '{部屋|へや}はきれい＿。', 'La chambre était propre.', ['でした', 'かったです', 'ました', 'くなかったです'], 'Piège : きれい est un adjectif en な → でした.'],
  ['n5-06', '{週末|しゅうまつ}は{映画|えいが}を{見|み}＿。', 'Ce week-end, j\'ai regardé un film.', ['ました', 'でした', 'かったです', 'ありました'], '{見|み}ます est un verbe → ました.'],
  ['n5-10', '{旅行|りょこう}は{楽|たの}し＿。', 'Le voyage était amusant.', ['かったです', 'いでした', 'ました', 'でした'], '{楽|たの}しい est un adjectif en い → かったです.'],
];
MIX.forEach(([lesson, jp, fr, choices, explain], i) => add({
  id: `past-mix-${String(i + 1).padStart(2, '0')}`, type: 'choice', uses: lesson === 'n5-07' ? ['n5-06', 'n5-07'] : [lesson],
  jp, fr, choices, a: 0, explain,
}));
add({
  id: 'past-mix-11', type: 'choice', uses: ['n5-06', 'n5-10'],
  q: 'Pour parler du temps qu\'il faisait hier, laquelle de ces phrases est **fausse** ?',
  choices: ['きのうは{雨|あめ}かったです。', 'きのうは{雨|あめ}でした。', 'きのう、{雨|あめ}が{降|ふ}りました。', 'きのうは{寒|さむ}かったです。'], a: 0,
  explain: '{雨|あめ} est un nom : かった ne marche qu\'avec un adjectif en い. On dit {雨|あめ}でした (nom) ou {雨|あめ}が{降|ふ}りました (verbe).',
});
add({
  id: 'past-mix-12', type: 'choice', uses: ['n5-06', 'n5-07'],
  q: 'Comment dire naturellement « Hier, il a plu » ?',
  choices: ['きのう、{雨|あめ}が{降|ふ}りました。', 'きのう、{雨|あめ}がありました。', 'きのう、{雨|あめ}が{降|ふ}りでした。', 'きのう、{雨|あめ}かったです。'], a: 0,
  explain: 'La pluie « tombe » : {降|ふ}ります → {降|ふ}りました. {雨|あめ}がありました se comprend mais ne sonne pas naturel.',
});

const focus = {
  id: 'adj-i-na',
  label: 'い・な',
  title: 'い ou な ? Et quel passé ?',
  unlockAfter: 'n5-09',
  sheet: {
    sections: [
      {
        h: 'Le principe en une phrase',
        p: [
          '**い : l\'adjectif se transforme lui-même** (sa fin change, comme un verbe).',
          '**な : l\'adjectif ne bouge jamais**, c\'est です qui change (exactement comme avec un nom : {学生|がくせい}です → {学生|がくせい}じゃありません).',
        ],
      },
      {
        h: 'Le tableau',
        p: ['En surligné : ce qui change. À gauche, c\'est la fin de l\'adjectif ; à droite, c\'est toujours ce qui vient **après** lui.'],
        grid: {
          head: ['', 'い : {高|たか}い', 'な : {静|しず}か'],
          rows: [
            ['Présent', '{高|たか}い==です==', '{静|しず}か==です=='],
            ['Négatif', '{高|たか}==くない==です', '{静|しず}か==じゃありません=='],
            ['Passé', '{高|たか}==かった==です', '{静|しず}か==でした=='],
            ['Passé négatif', '{高|たか}==くなかった==です', '{静|しず}か==じゃありませんでした=='],
            ['Devant un nom', '{高|たか}い{車|くるま}', '{静|しず}か==な=={町|まち}'],
            ['Familier, négatif', '{高|たか}==くない==', '{静|しず}か==じゃない=='],
            ['Familier, passé', '{高|たか}==かった==', '{静|しず}か==だった=='],
            ['Familier, passé nég.', '{高|たか}==くなかった==', '{静|しず}か==じゃなかった=='],
          ],
        },
      },
      {
        h: 'Comment savoir si c\'est un い ou un な ?',
        p: [
          '**Apprends chaque adjectif avec un nom** : {高|たか}い{車|くるま}, きれい**な**{部屋|へや}. Si tu entends な devant le nom, c\'est un な.',
          '**Indice** : un mot de deux kanji ({有名|ゆうめい}, {便利|べんり}, {元気|げんき}, {親切|しんせつ}, {大切|たいせつ}) est presque toujours un な. Un kanji + い en hiragana ({高|たか}い, {安|やす}い, {新|あたら}しい) est presque toujours un い.',
        ],
      },
      {
        h: 'Le passé poli : quelle fin ?',
        p: ['Avant de choisir, demande-toi : **c\'est un nom, un adjectif (い ou な) ou un verbe ?** Chaque type a SA fin.'],
        grid: {
          head: ['', 'Passé', 'Passé négatif'],
          rows: [
            ['Nom', '{雨|あめ}==でした==', '{雨|あめ}==じゃありませんでした=='],
            ['Adj. な', '{静|しず}か==でした==', '{静|しず}か==じゃありませんでした=='],
            ['Adj. い', '{寒|さむ}==かったです==', '{寒|さむ}==くなかったです=='],
            ['Verbe', '{降|ふ}り==ました==', '{降|ふ}り==ませんでした=='],
            ['ある・いる', '==ありました== / ==いました==', '==ありませんでした== / ==いませんでした=='],
          ],
        },
      },
      {
        h: 'La pluie d\'hier, en trois façons',
        p: [
          '**でした** ne va qu\'après un nom ou un adjectif en な. **ました** ne va qu\'après un verbe. **かった** n\'existe qu\'avec les adjectifs en い.',
          '**ありました** = « il y avait / il y a eu » (un objet, un événement : テストがありました). Pour la pluie, {雨|あめ}がありました se comprend mais ne sonne pas naturel.',
        ],
        ex: [
          { jp: 'きのうは{雨|あめ}==でした==。', fr: 'Hier, c\'était un temps de pluie. ({雨|あめ} = nom)' },
          { jp: 'きのう、{雨|あめ}が{降|ふ}り==ました==。', fr: 'Hier, il a plu. ({降|ふ}ります = verbe)' },
          { jp: 'きのうは{寒|さむ}==かったです==。', fr: 'Hier, il faisait froid. ({寒|さむ}い = adjectif en い)' },
          { jp: '{先週|せんしゅう}、テストが==ありました==。', fr: 'La semaine dernière, il y a eu un contrôle. (あります = il y a)' },
        ],
      },
    ],
    pieges: [
      '{寒|さむ}いでした ✗ → {寒|さむ}かったです · {雨|あめ}かったです ✗ → {雨|あめ}でした · {降|ふ}りでした ✗ → {降|ふ}りました.',
      'Les **faux い** : **きれい**, **きらい**, **{有名|ゆうめい}** (ゆうめい) sont des adjectifs en な → きれいじゃありません, きれいでした (jamais きれくない, きれかった).',
      '**いい** est irrégulier : **よ**くない, **よ**かった, **よ**くなかった.',
      'Jamais です au passé d\'un い : {高|たか}いでした ✗ → {高|たか}かったです.',
      'Jamais くない ni かった sur un な : {静|しず}かくない ✗, {静|しず}かかった ✗.',
    ],
  },
  exercises,
};

mkdirSync(new URL('../data/focus/', import.meta.url), { recursive: true });
writeFileSync(new URL('../data/focus/adjectifs.json', import.meta.url), JSON.stringify(focus, null, 1) + '\n');
console.log(`data/focus/adjectifs.json : ${exercises.length} exercices`);
