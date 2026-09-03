# Recette — foret-muette-03 / foret-muette-souche-tri-01

Date : 2026-09-02

## Périmètre

- Nœud : `foret-muette-03`
- Exercice : `foret-muette-souche-tri-01`
- Moteur : `tri`
- Habillage : `foret.souche`

Le contenu propose cinq étapes et dix mots, répartis entre deux souches. La formulation
« Range les mots où tu entends la dernière lettre » est volontairement à surveiller : elle
peut être maladroite pour un enfant (on entend un son, pas une lettre) et doit être confirmée
avec la voix et l'enfant. `audio: null` n'est pas bloquant si les clips correspondants sont
couverts par le manifeste audio.

## Quatre preuves

1. **Identification et critères** — `contenu/noeuds/foret-muette-03.json` relie le nœud à
   `contenu/exercices/foret-muette/souche-tri-01.json`. Les consignes opposent explicitement
   les mots selon le critère de la dernière lettre, avec cibles disjointes par étape.
2. **Défaut rouge / geste tactile** — le risque reproduit sur le tri est le tap tablette
   réduit à `pointerdown/pointerup`, sans `click`, qui laissait le mot non saisi. La correction
   commune de `MoteurTri.tsx` traite ce tap et permet ensuite le tap du réceptacle.
3. **Correction verte et invariants** — le `pointerup` ne prend la main que lorsque
   `transform === null`; le glisser-déposer dnd-kit reste intact. L'aléa injecté mélange les
   éléments, les refus sont journalisés sans écran d'échec, l'aide est gratuite et les acquis
   restent conservés jusqu'à la réussite et la récompense finales.
4. **Test ciblé** —
   `npm test -- --run tests/composants/MoteurTri-affordance.test.tsx tests/composants/MoteurTri.test.tsx`
   : **PASS**, 2 fichiers, 14 tests, dont le test tactile rouge puis vert. Le parcours complet
   de cet exercice réel, l'audio manifeste et le rendu tablette n'ont pas été lancés.

## Verdict

**FONCTIONNEL CORRIGÉ — FORMULATION À VALIDER — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le
SVG de la souche reste un blockout.** Le tap mot puis réceptacle, le mélange, l'aide, les
refus sans échec et la fin réussie sont couverts au niveau moteur. La recette de livraison
attend la validation pédagogique de la phrase, la confirmation audio par manifeste et le décor
de production.
