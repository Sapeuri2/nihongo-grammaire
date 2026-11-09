# Passation — appli Grammaire (nihongo-grammaire)

Rapport écrit par l'instance Claude Code de la grammaire, pour l'**agent central** qui reprend tout ce qui
touche au code (moteur et code des trois applis). À lire avec `README.md`, `MOTEUR.md` et `PROGRAMME.md`.

## 1. Identité

- Dépôt : https://github.com/Sapeuri2/nihongo-grammaire (branche `main`, publiée par GitHub Pages à la racine)
- Site : https://sapeuri2.github.io/nihongo-grammaire/
- Rôle jusqu'ici : appli de grammaire **et dépôt de référence du moteur commun**. Les applis
  vocabulaire (`nihongo-vocabulaire`) et kanji (`nihongo-kanji`) récupèrent le moteur avec `bash tools/maj-moteur.sh`.
- Dernier état du code : commit `720473c` (2026-11-04), « suite automatique (autoNext) et Ma liste ».

## 2. L'utilisateur et sa méthode

- Francophone, apprend le japonais pour le JLPT (N5 terminé côté contenu, N4 ensuite, N3 plus tard).
- Appli **perso**, **gratuite**, **web uniquement** (pas d'appli native), **en français**, simple.
- Utilisée sur PC à la maison et sur téléphone au sport → progression synchronisée.
- Veut un « speed run » **en comprenant** : l'appli doit le pousser à réfléchir et marteler ce qu'il rate.
- Kanji N5/N4 écrits avec furigana (masquables).
- Il envoie souvent des captures d'écran et des messages où plusieurs idées se mélangent : il faut
  **découper** en demandes distinctes et confirmer le périmètre.
- Il tient beaucoup à ce qu'**on ne touche jamais à sa progression** (identifiants, clés de stockage).
- Il était au **bloc 2, leçon 10** fin octobre (sa progression réelle est dans son navigateur et son Gist,
  pas dans le dépôt).

## 3. Ce que fait l'appli

- Parcours linéaire : leçon (cours) → exercices (70 % pour valider) → toutes les 5 leçons un **test de bloc**
  (30 questions, 80 %) → tous les 2 blocs un **examen intermédiaire** (40 q.) → tous les 4 blocs un **grand examen** (60 q.).
- Tests et examens : ~25 % de rappels des leçons précédentes + questions de réflexion propres à l'examen (`examTest`).
- Exercices : QCM, phrase à trous (＿), remise en ordre (avec variantes acceptées `alt`).
- Répétition espacée (boîtes de Leitner 0–5, intervalles 0/1/3/7/16/35 j). Une question ratée revient plus loin
  dans la série (2 fois max), puis en révision et dans les tests suivants ; les réussies peuvent revenir aussi.
- **Points clés** (notions à marteler) : bulle + antisèche à onglets, défi éclair, une question surprise toutes
  les 4 questions, 3 questions par test/examen qui comptent. Actuels :
  - `adj-i-na` « い ou な ? Et quel passé ? » (278 questions, généré par `tools/generer-adjectifs.mjs`) ;
  - `forme-te` « Les verbes : る・ます・て » (128 verbes, 1019 questions, généré par `tools/generer-te.mjs`).
- Série en cours sauvegardée (reprise après rechargement, « Reprendre / Abandonner » sur l'accueil).
- Bouton 漢 (furigana), compteur 🔥 de bonnes réponses d'affilée, « Voir la traduction » sur les phrases à trous.
- **Ma liste** (📌, commune aux 3 applis) : ☆ sur un mot ou après une question → liste partagée, révision,
  export Anki/JSON. Détails dans `MOTEUR.md`.
- Contenu : 40 leçons N5 (8 blocs), 590 exercices de leçons/tests/examens + 1297 de points clés. Plan N4 dans `PROGRAMME.md`.

## 4. Architecture

Site statique (HTML/CSS/JS en modules ES, aucune dépendance, aucun build), contenu en JSON.

| Fichier | Rôle | Propriétaire actuel |
| --- | --- | --- |
| `js/app.js` (~1140 lignes) | Tout le comportement : chargement du cours, étapes, tirage, séries, vues, routage `#/…`, bulle/antisèche, Ma liste (vues + révision) | moteur |
| `js/state.js` | Progression (localStorage), répétition espacée, fusion entre appareils, 🔥 | moteur |
| `js/sync.js` | Synchro via Gist GitHub privé (progression + Ma liste) | moteur |
| `js/liste.js` | Ma liste : stockage commun, fusion, export | moteur |
| `js/text.js` | `{漢字\|かんじ}` → furigana, `**gras**`, `==surligné==`, trou `＿` | moteur |
| `css/style.css`, `sw.js` | Apparence ; hors ligne (réseau d'abord, cache nommé d'après l'adresse) | moteur |
| `tools/verifier.mjs`, `tools/maj-moteur.sh`, `MOTEUR.md` | Contrôle du contenu ; mise à jour du moteur ailleurs ; doc | moteur |
| `tools/test-parcours.mjs` | Test navigateur de bout en bout (ajouté pour la passation) | moteur |
| `js/config.js` | Clés de stockage + réglages pédagogiques de l'appli | appli |
| `css/theme.css`, `index.html`, `manifest.webmanifest`, `icons/` | Couleur (rouge `#b23a48`), nom, icône | appli |
| `data/` | Contenu | appli (contenu) |
| `tools/generer-*.mjs` | Générateurs des points clés (écrivent `data/focus/`) | appli (contenu) |

Réglages de `js/config.js` (grammaire) : `storageKey 'ng-state-v1'`, `syncKey 'ng-sync'`,
`gistFile 'nihongo-grammaire-progression.json'`, `appId 'grammaire'`, `lessonPass 0.7`, `testPass 0.8`,
`lessonRecall 5`, `testSize 30`, `miniExamSize 40`, `examSize 60`, `recallShare 0.25`, `reviewSize 20`,
`drillSize 15`, `maxRetries 2`, `focusEvery 4`, `focusInTests 3`, `focusChallengeSize 10`,
`autoNext 0`, `listeEnabled true`, `hideBlankTranslation true`.

## 5. Données à ne jamais casser

- localStorage (même origine `sapeuri2.github.io` pour les 3 applis !) :
  `ng-state-v1` (progression), `ng-state-v1:seance` (série en cours), `ng-sync` (clé GitHub + id du Gist),
  `nihongo-ma-liste-v1` et `nihongo-ma-liste-gist` (**communes aux 3 applis**).
- Gists : `nihongo-grammaire-progression.json` (progression) et `nihongo-ma-liste.json` (commun).
- Identifiants des leçons et exercices (`n5-04`, `n5-04-e07`, `adj-…`, `forme-te-…`) : la progression y est rattachée.
- Toute évolution de format doit **fusionner** avec l'ancien (voir `merge` dans `state.js` et `liste.js`).

## 6. Règles de qualité du contenu

Écrites dans `README.md` (§ Règles de qualité). L'essentiel : **une seule bonne réponse en japonais**
(les pièges doivent rendre la phrase fausse sans compter sur la traduction), **japonais naturel**,
tous les ordres naturels acceptés dans les remises en ordre, pas deux choix identiques sans furigana,
une consigne indispensable va dans `q` (la traduction est cachée sur les phrases à trous).
Pour les générateurs : un piège n'est jamais une vraie forme d'un autre mot (ensemble `VALID` dans `generer-te.mjs`).

## 7. Outils et façon de travailler

- `node tools/verifier.mjs` avant chaque commit (lance aussi `tools/verifier-appli.mjs` s'il existe).
- `node tools/test-parcours.mjs` : tout le parcours dans Chromium (format téléphone), échoue sur erreur JS ou débordement.
  Dans le conteneur Claude Code : Chromium et Playwright sont préinstallés (`/opt/pw-browsers/chromium`).
- Avant chaque changement visible, je simulais **sa** progression (leçons 1–9 + bloc 1 validés) pour vérifier
  que la prochaine étape restait la bonne.
- Commits en français, petits et descriptifs ; push direct sur `main` (GitHub Pages publie tout seul).
- Après chaque changement du moteur : ligne dans l'historique de `MOTEUR.md` + **message à coller** pour les
  autres instances (quoi lancer, quels réglages ajouter, quoi tester).

## 8. Limites et dettes connues

- `js/app.js` est un seul gros fichier : à découper avant d'ajouter beaucoup de fonctions.
- Le ☆ actuel sert à **Ma liste (mots)**. L'utilisateur veut aussi des **étoiles sur les leçons** :
  il faudra deux symboles distincts (ex. 📌 mot / ⭐ leçon) pour ne pas tout mélanger.
- Synchro de Ma liste testée avec un faux GitHub (deux appareils simulés), pas encore avec son vrai Gist.
- Avec `autoNext` (kanji : 700 ms), la ☆ d'une bonne réponse n'est visible que pendant le délai.
- Retour à l'accueil : la position de défilement n'est pas restaurée, et une leçon ne s'ouvre pas toujours en haut
  (rendu par `innerHTML` sans gestion du scroll) — demande en attente.
- Pas de bouton « Leçon suivante » sur une leçon déjà faite — demande en attente.
- Je ne sais pas si vocabulaire et kanji ont déjà appliqué le moteur `720473c`.
- L'appli vocabulaire a sa propre bulle い/な (`js/memo.js`) : ne pas lui ajouter le point clé du moteur en double.

## 9. Après la passation

La grammaire ne gère plus que son **contenu** : leçons, exercices, tests, examens, points clés (données et
générateurs), `PROGRAMME.md`. Tout changement de code passe par l'agent central, qui lui envoie un message
expliquant ce qui a changé et comment s'en servir.
