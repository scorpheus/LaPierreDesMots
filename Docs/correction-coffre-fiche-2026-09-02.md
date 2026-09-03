# Correction visuelle du coffre et des fiches — 2026-09-02

## Constats

La fiche commune (`FicheObjet`) plaçait le visuel dans un cadre circulaire de 9 rem. Ce cadre
était perçu comme un élément du dessin ; sur la bande des compagnons, il concurrençait le portrait
et le titre pouvait sortir de la fenêtre visuelle. La fenêtre ne prévoyait pas non plus de défilement
interne pour les libellés longs du coffre.

## Décision

Le visuel de la fiche est désormais centré dans un espace neutre sans cercle. Le titre est placé en
tête, centré et autorisé à se couper proprement ; le panneau est limité à la hauteur de la fenêtre
(`100dvh - 2rem`) et défile indépendamment. Les assets existants restent utilisés tels quels : les
portraits raster des compagnons et les SVG déclarés des formes/objets ne sont ni régénérés ni
remplacés par un nouvel asset.

## Garde

`tests/composants/FicheCase.test.tsx` vérifie l’absence de cercle, le centrage du visuel, la présence
du titre en tête et le comportement défilable. Les tests ciblés coffre, étagère, butin et campement
passent : 53 tests.
