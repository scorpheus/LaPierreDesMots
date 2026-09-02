---
name: dessiner-campement
description: Recomposer, déplacer ou redimensionner les objets du campement interactif sans désaligner les zones tactiles ni casser leurs animations SVG. À utiliser pour toute modification de la composition du campement.
---

# Dessiner le campement

La source stable est `production/archives/campement-grille-v4.svg`. La composition publiée est
produite par `scripts/recomposer-campement.mjs` ; ne pas déplacer séparément un objet dans le SVG
et sa zone dans `contenu/monde/campement.json`.

## Procédure

1. Modifier `DISPOSITION` ou le fond dans `scripts/recomposer-campement.mjs`.
2. Exécuter `npm run campement:dessiner`.
3. Exécuter les gardes ciblés :

   ```text
   npm run test -- --run tests/unitaires/campement-composition-v5.test.ts tests/composants/EcranCampement.test.tsx
   npm run test:contenu
   ```

4. Construire le client de test et contrôler le campement à 1920×1200 CSS, format horizontal
   16:10 de la tablette cible.
5. Toucher au moins un objet décoratif et les dessins de la carte, du coffre et du chaudron.

## Invariants fragiles

- Chaque point JSON correspond exactement à un groupe `objet-<id>` dans le SVG.
- Le `transform` de placement appartient au parent `placement-<id>`. Le groupe `objet-<id>`
  reste sans transformation de placement, car sa classe d'animation CSS utilise aussi
  `transform`.
- Les zones tactiles mesurent au moins 64 px et suivent les coordonnées générées.
- Les 30 interactions gratuites, les 10 animations uniques et les 6 répliques ne diminuent pas.
- Les références visuelles ne se mettent jamais à jour sans validation du parent.
