# Recette — foret-muette-11 / foret-muette-souche-tri-02

Date : 2026-09-03
Moteur : `tri`
Habillage : `foret.souche`

## Parcours joué

Cinq consignes couvrent dix mots en deux formes : pluriels avec `s` puis singuliers sans `s`.
Les formulations sont courtes, françaises et CE1 (« Range les mots qui ont un s. », « … qui
n'ont pas de s. »). L'aide Gobi relit, souffle, surligne ou montre la cible gratuitement.

Chaque élément peut être pris au tap puis déposé dans le trou gauche/droit ; le correctif tactile
permet aussi de choisir directement un mot et son receptacle sans exiger un glisser. Les deux
critères sont visibles dans les libellés des trous. Les éléments sont mélangés à la création par
`Alea`, et les cinq étapes sont disjointes. Un mauvais dépôt est refusé sans écran d'échec ; la
progression reste récupérable. La cinquième réussite clôt l'exercice et transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvrait le défaut où le tri exigeait un glisser impossible sur tablette ;
le contrôle tactile actuel accepte le tap mot+trou. Les tests composants couvrent bon/mauvais tri,
aide, refus sans échec et double-tap ; les réducteurs couvrent transitions et fin.

```text
npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
113 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les mots et les deux trous sont des cibles tactiles explicites ; le tap direct ne demande pas de
coordination fine. Le rendu reste lisible et sans état d'échec.

**BLOQUÉ-ASSET** — les dix éléments déclarent `asset: null`; l'illustration finale de
`foret.souche` reste à fournir. Aucun asset n'a été généré.
