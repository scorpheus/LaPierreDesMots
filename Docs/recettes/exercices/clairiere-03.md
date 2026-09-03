# Recette — clairiere-03 / clairiere-paniers-couleurs-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-03`
- Exercice : `clairiere-paniers-couleurs-01`
- Moteur : `tri`
- Habillage : `clairiere.paniers`
- Défaut signalé : « Range les mots de couleur dans le panier de gauche » ; un tap sur
  un mot ne semblait rien faire.

## Quatre preuves

1. **Identification** — l’exercice est déclaré par `contenu/noeuds/clairiere-03.json` et
   porte la consigne dans `contenu/exercices/clairiere/paniers-couleurs-01.json`.
2. **Rouge** — le test tactile ajouté dans
   `tests/composants/MoteurTri-affordance.test.tsx` simulait `pointerdown/pointerup` sur
   un mot ; avant correction, `data-saisi` restait `non`.
3. **Vert** — `client/src/moteurs/tri/MoteurTri.tsx` saisit désormais au `pointerup` lorsque
   aucun déplacement dnd-kit n'est en cours. Le même test passe et le mot est visiblement
   « en main » ; le dépôt dans le panier reste disponible.
4. **Non-régression ciblée** —
   `npm test -- --run tests/composants/MoteurTri-affordance.test.tsx tests/composants/MoteurTri.test.tsx`
   : **PASS**, 2 fichiers, 14 tests.

## Risque à surveiller

Sur certains navigateurs, un tap peut produire `pointerup` puis `click`. Les deux appels
`saisir` sont sans effet pédagogique supplémentaire (ils ne comptent aucune erreur), mais
il faudra vérifier sur tablette qu'aucun enchaînement ne transforme ce doublon en double
dépôt. Un vrai glisser est protégé par le test `transform !== null` et reste pris en charge
par dnd-kit.

## Verdict

**FONCTIONNEL CORRIGÉ — BLOQUÉ-ASSET si le SVG des paniers reste un blockout.** Le geste
tap-puis-tap est couvert et corrigé côté moteur ; la recette de livraison reste bloquée tant
que `contenu/habillages/clairiere/paniers.svg` n'est pas validé comme décor de production
(et verrouillé dans la chaîne d'assets), plutôt que comme simple blockout.
