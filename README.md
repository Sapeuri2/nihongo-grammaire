# 文法 Grammaire japonaise

Appli web perso pour apprendre la grammaire japonaise (JLPT N5 → N4, puis N3), en français.

- Leçon → exercices (QCM, phrase à trous, remise en ordre) → leçon suivante.
- Toutes les 5 leçons : un test du bloc (80 % pour continuer).
- Toutes les 20 leçons : un grand examen.
- Les erreurs reviennent en fin de série, puis en révision (répétition espacée).
- Progression synchronisée entre appareils via un Gist GitHub privé (optionnel).
- Fonctionne hors ligne une fois chargée ; installable sur l'écran d'accueil du téléphone.

Le plan complet des leçons est dans [PROGRAMME.md](PROGRAMME.md).

## Lancer en local

```sh
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Ajouter du contenu

1. Créer `data/n5/blocXX.json` sur le modèle de `data/n5/bloc01.json`.
2. L'ajouter à la fin de la liste `blocks` dans `data/manifest.json`.
3. Vérifier : `node tools/verifier.mjs`.

Les identifiants (leçons, exercices) ne doivent jamais changer une fois publiés : la progression y est rattachée.

### Format d'un exercice

```jsonc
// Choix (QCM ou phrase à trous ＿)
{ "id": "n5-02-e09", "type": "choice", "uses": ["n5-01"],
  "q": "consigne (facultatif)", "jp": "{私|わたし}＿{学生|がくせい}です。", "fr": "traduction",
  "choices": ["は", "か", "です", "じゃ"], "a": 0, "explain": "explication" }

// Remise en ordre
{ "id": "n5-01-e05", "type": "order", "fr": "traduction",
  "tokens": ["{私|わたし}", "は", "{日本人|にほんじん}", "じゃありません"],
  "alt": [["…autre ordre accepté…"]] }
```

- `{漢字|かんじ}` affiche des furigana, `**texte**` met en gras.

### Règles de qualité (à respecter pour chaque exercice)

1. **Une seule bonne réponse en japonais.** Chaque mauvais choix doit rendre la phrase japonaise fausse (ou incohérente avec le contexte japonais), sans compter sur la traduction. Si un autre choix donne une phrase correcte avec un autre sens (どこ au lieu de どれ, ませんか au lieu de ましょう…), on change le choix ou on ajoute du contexte japonais (question + はい/いいえ).
2. **Du japonais naturel.** Pas de 私は inutile ; l'objet déjà connu (この/その/あの…) passe en は au négatif ; pas deux fois la même particule (で…で).
3. **Remise en ordre : tous les ordres naturels sont acceptés** (`alt`). Éviter les éléments qui peuvent se placer n'importe où.
4. **Nuances (ね/よ, politesse…)** : décrire la situation dans la consigne plutôt que de laisser la traduction trancher.
5. Pas deux choix qui s'affichent pareil sans furigana (écrire en kana : きて / くて).
- `uses` : les leçons **précédentes** que l'exercice mobilise en plus de la sienne.
