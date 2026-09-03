# Recette — cite-des-histoires-09 / cite-des-histoires-enseigne-assemble-01

Date : 2026-09-03
Moteur : `assemble`
Habillage : `cite.enseigne`

## Parcours joué

Trois devinettes demandent d'assembler `moulin`, `papier` et `école`. Les solutions sont
respectivement `mou`+`lin`, `pa`+`pier`, puis `é`+`co`+`le`. Les blocs sont mélangés par `Alea` et
les intrus `lon` et `ba` empêchent la réponse automatique. Les textes sont français et adaptés
au CE1 ; l'aide Gobi relit, souffle ou surligne gratuitement.

Les blocs sont sélectionnables au tap et déposables par tap/glisser dans la construction. Un
intrus ou un bloc déjà posé est refusé sans écran d'échec ; les trois mots progressent jusqu'à la
réussite et la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre prévisible et le bloc réutilisé qui rendraient
l'assemblage trivial ou interminable. Les tests composants couvrent tap/glisser, intrus, aide,
refus doux et fin ; les réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurAssemble.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne.

## Verdict tablette

Les blocs et la zone de construction sont des cibles tactiles explicites ; le tap reste possible
si le glisser est difficile. Le rendu de l'enseigne reste lisible.

**BLOQUÉ-ASSET** — l'asset final de `cite.enseigne` reste à valider ; aucun asset n'a été généré.
