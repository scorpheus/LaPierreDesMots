# Recette — volcan-06 / volcan-train-assemble-01

Date : 2026-09-03
Moteur : `assemble`
Habillage : `volcan.train`

## Parcours joué

Trois consignes demandent d'assembler les blocs pour écrire `bateau`, `cadeau` et `chapeau`.
Les blocs sont mélangés par `Alea` ; `tau` et `do` sont des intrus, graphies concurrentes qui
imposent une lecture. L'aide Gobi relit, souffle ou surligne gratuitement.

Chaque bloc peut être choisi au tap puis placé par tap/glisser dans le train de construction. Un
bloc intrus ou déjà posé est refusé sans écran d'échec et la construction reste récupérable. Les
trois mots terminés clôturent l'exercice et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre prévisible et le bloc réutilisé qui rendrait l'exercice
interminable. Les tests composants couvrent tap, glisser, intrus, aide, refus doux et fin ; les
réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurAssemble.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les blocs et le train sont des cibles tactiles explicites ; le tap reste disponible si le glisser
est difficile. Aucun geste de coordination fine n'est imposé.

**BLOQUÉ-ASSET** — l'asset final de `volcan.train` reste à valider. Aucun asset n'a été généré.
