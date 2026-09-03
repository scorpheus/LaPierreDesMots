# Recette — volcan-03 / volcan-sable-grave-01

Date : 2026-09-03
Moteur : `grave`
Habillage : `volcan.sable`

## Parcours joué

Six consignes demandent de graver `eau` dans `bateau`, `gâteau`, `chapeau`, `cadeau`, `rideau` et
`drapeau`. Les trous sont réellement positionnés dans le mot (positions 3 ou 4), et le clavier
propose les quatre graphies concurrentes `eau`, `au`, `ot`, `o`. Le tap sur une graphie puis sur le
trou est le geste effectif, avec refus doux d'une mauvaise réponse.

Les consignes sont courtes, françaises et CE1 ; l'aide Gobi relit, souffle ou surligne gratuitement.
Une erreur ne produit aucun écran d'échec, la consigne reste récupérable et les six réussites
terminent l'exercice avec récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'un trou mal positionné/non ciblable et d'un clavier
réduit qui rendrait la réponse triviale. Les tests composants couvrent bonne/mauvaise graphie,
tap, aide, refus sans échec et fin ; les réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurGrave.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Le clavier et les trous sont des cibles tactiles explicites et espacées ; aucune écriture libre ni
coordination fine n'est requise.

**BLOQUÉ-ASSET** — l'asset final de `volcan.sable` reste à valider. Aucun asset n'a été généré.
