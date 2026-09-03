# Chantier du coffre raster — 3 septembre 2026

Le coffre n’emploie plus les losanges génériques et les petits dessins SVG pour ses trois collections. La livraison comprend 37 illustrations détourées : 25 formes-cristaux, 6 Éclats régionaux et 6 objets rapportés au campement.

## Contrat de rendu

- Une pièce non gagnée montre sa vraie silhouette en gris, sans cadenas.
- La pièce gagnée révèle exactement la même image en couleur.
- La vignette et la fiche agrandie réutilisent le même fichier ; il n’existe plus de second dessin divergent.
- Les formes de Gobi restent des cristaux seuls, conformément à D20 : le personnage ne change pas de corps pour chaque graphème.
- Les 37 images sont des PNG RGBA 256 × 256 et pèsent ensemble environ 1,9 Mo.

## Traçabilité et recette

Le verrou complet est `production/coffre-raster.lock.json`. La planche de contrôle parent est `bac-a-sable/coffre-raster-37-assets.png`. Les tests de contenu vérifient désormais le format raster, la transparence, les dimensions, l’existence des fichiers et l’unicité des 37 chemins.

La validation esthétique finale reste celle du parent dans le vrai écran du coffre ; aucune référence visuelle T4 n’est mise à jour automatiquement.
