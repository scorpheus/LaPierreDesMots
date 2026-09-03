# Recette — clairiere-12 / clairiere-paniers-voyelles-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-12`
- Exercice : `clairiere-paniers-voyelles-01`
- Moteur : `tri`
- Habillage : `clairiere.paniers`

L'exercice propose quatre consignes de tri phonologique (« Range les mots où tu lis un a… »,
puis i, o et u), avec mots audibles et aides Gobi déclarées. Les éléments et réceptacles sont
mélangés par l'aléa injecté ; les réponses sont réparties par étapes et restent acquises.

## Quatre preuves

1. **Identification et contenu** — `contenu/noeuds/clairiere-12.json` relie le nœud à
   `contenu/exercices/clairiere/paniers-voyelles-01.json`, moteur `tri` et habillage
   `clairiere.paniers`.
2. **Défaut rouge** — avant correction, un geste tactile réduit à `pointerdown/pointerup` sur
   un mot ne déclenchait pas `saisir` : le DOM gardait `data-saisi="non"`, donnant l'impression
   que le mot et le panier ne répondaient pas.
3. **Correction verte** — `client/src/moteurs/tri/MoteurTri.tsx` traite désormais le
   `pointerup` sans déplacement comme un tap de sélection, puis le tap du panier comme dépôt ;
   `transform !== null` laisse le glisser-déposer dnd-kit intact. Le test tactile ciblé est
   dans `tests/composants/MoteurTri-affordance.test.tsx`.
4. **Résultat ciblé** —
   `npm test -- --run tests/composants/MoteurTri-affordance.test.tsx tests/composants/MoteurTri.test.tsx`
   : **PASS**, 2 fichiers, 14 tests. Sont couverts : tap, dépôt, mélange déterministe, aide,
   refus sans écran d'échec, double-tap gratuit et réussite finale/récompense via le flux du
   réducteur.

## Risques et limites

Un navigateur peut émettre `pointerup` puis `click` pour un même tap : le double `saisir` est
gratuit, mais l'enchaînement doit rester surveillé sur tablette pour exclure un double dépôt.
Le rendu tablette, l'audio de production et la capture visuelle n'ont pas été exécutés ici.

## Verdict

**FONCTIONNEL CORRIGÉ — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le décor SVG reste un
blockout.** Le geste mot puis panier, les quatre étapes, l'aide, le mélange et l'absence
d'échec sont couverts ; la livraison attend la validation du décor et du rendu sur tablette.
