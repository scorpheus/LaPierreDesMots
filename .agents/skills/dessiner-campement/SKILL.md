---
name: dessiner-campement
description: Publier ou animer le campement illustré sans désaligner ses zones tactiles, ses calques raster ni ses réactions DOM. À utiliser pour toute modification de la composition du campement.
---

# Dessiner le campement

Le SVG de `production/archives/` est un blockout historique, pas une source graphique. La source
validée est désormais le V6 sans objets mobiles, publié dans
`contenu/assets/campement/campement-v6.png`. La commande `npm run campement:dessiner` contrôle
ses dimensions et le référentiel ; la provenance reproductible vit dans `production/assets.lock.json`.

Les objets peints restent dans l’image. L’interactivité vient de boutons HTML transparents décrits
par `contenu/monde/campement.json`; la vie ambiante vient de calques raster/DOM indépendants. Ne
jamais tenter de convertir à nouveau toute la scène en SVG pour la rendre interactive.

## Procédure

1. Pour déplacer une prise, mesurer la boîte de l’objet dans l’image native 1586 × 992 et modifier
   uniquement sa `zone` dans `contenu/monde/campement.json`.
2. Pour changer le décor, faire valider le brouillon par le parent, remplacer l’asset V6 puis
   exécuter `npm run campement:dessiner`.
3. Pour ajouter un sprite, produire une ligne ou une grille sur fond uni, puis passer par le
   pipeline déterministe de `scripts/sprites/` : extraction, alpha, normalisation, contact sheet et
   rapport QA. Le générateur ne décide jamais de la géométrie finale de la planche. Avant toute
   intégration, vérifier que l'objet immobile a été retiré du fond : un sprite superposé à sa copie
   peinte, même techniquement valide, est refusé.
4. Exécuter les gardes ciblés :

   ```text
   npm run test -- --run tests/unitaires/campement-composition-v6.test.ts tests/composants/EcranCampement.test.tsx
   npm run test:contenu
   ```

5. Construire le client de test et contrôler le campement à 1920×1200 CSS, format horizontal
   16:10 de la tablette cible.
6. Toucher au moins un objet décoratif et les dessins de la carte, du coffre et du chaudron.

## Invariants fragiles

- Le `viewBox` JSON correspond exactement aux dimensions natives du PNG de production.
- Chaque zone reste entièrement comprise dans l’image et recouvre un objet reconnaissable.
- Les sprites de production ont huit cellules régulières, un fond transparent et un rapport QA;
  ne jamais servir directement une planche brute issue du générateur.
- Aucun objet animé ne double un objet encore peint dans le fond et aucun `mix-blend-mode` ou
  réglage d'opacité ne sert à masquer ce défaut de séparation.
- Les calques sont décoratifs (`aria-hidden`, `pointer-events: none`) et disparaissent quand les
  animations sont désactivées.
- Les zones tactiles mesurent au moins 64 px au rendu tablette.
- Les 30 interactions gratuites, les 10 animations uniques et les 6 répliques ne diminuent pas.
- Les références visuelles ne se mettent jamais à jour sans validation du parent.
