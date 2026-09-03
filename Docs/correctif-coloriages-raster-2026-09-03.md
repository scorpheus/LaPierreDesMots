# Correctif des coloriages raster — 3 septembre 2026

## Défaut mesuré

Dans `marais-jumeau-08`, la prise de la consigne « Colorie le caillou en brun » était centrée
dans l'eau, sans correspondre à un caillou reconnaissable du décor raster. Plus généralement,
les prises des six exercices `colorie` étaient entièrement transparentes. Le calque de couleur
restait en outre sous l'attribut `opacity="0"` écrit dans les SVG de production : une réussite
pouvait être enregistrée sans que la teinte apparaisse réellement sur l'image.

## Correction

- la cible du marais désigne maintenant le gros caillou isolé au bord de l'eau ; sa géométrie,
  son centroïde et son libellé sont produits par `scripts/decors/decors.mjs` ;
- la prise active reste invisible pendant le jeu ; le contour jaune pointillé est réservé à
  l'aide explicite « montre-cible » de Gobi, afin de ne pas donner la réponse d'emblée ;
- le moteur réactive explicitement le calque coloriable au montage, puis masque individuellement
  les régions étrangères à la consigne courante ;
- `tests/e2e/parcours-coloriages-reels.spec.ts` ouvre les six nœuds concernés, choisit leur vrai
  godet, touche le centre de la prise rendue par Chromium et vérifie la couleur sur la région.

L'audio demeure hors de ce correctif, conformément à la décision temporaire du parent.
