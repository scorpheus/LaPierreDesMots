# Recette — marais-jumeau-06 / marais-jumeau-ponton-assemble-01

Date : 2026-09-03
Moteur : `assemble`
Habillage : `marais.ponton`

## Parcours joué

Quatre consignes demandent de ranger les syllabes pour écrire `lapin`, `matin`, `jardin` et
`citron`. Les huit blocs utiles sont distincts ; `pon` et `tan` sont deux intrus proches. Les
textes sont courts, français et CE1. L'aide Gobi relit, souffle ou surligne gratuitement.

Les blocs sont mélangés à la création par `Alea`. Tap sur un bloc puis tap/glisser vers la zone de
construction sont réellement pris en charge ; un bloc déjà posé ou un intrus est refusé sans
écran d'échec et la construction reste récupérable. Les quatre mots terminés clôturent l'exercice
et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre prévisible et le bloc déjà posé qui rendrait l'exercice
interminable. Les tests composants couvrent tap, glisser, intrus, aide, refus doux et fin ; les
réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurAssemble.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les blocs et la zone de construction sont des cibles tactiles explicites ; le tap reste disponible
si le glisser est difficile. Le rendu est lisible et sans état d'échec.

**BLOQUÉ-ASSET** — l'asset final de `marais.ponton` reste à valider ; aucun asset n'a été généré.
