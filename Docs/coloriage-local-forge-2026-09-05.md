# Coloriage local — Forge (`volcan-08`)

Date : 5 septembre 2026. Statut : **brouillon à relire par le parent** ; rien de ce lot n'est
publié ni branché au moteur.

## Livrable

Le couple complet est dans
`contenu/brouillons/coloriages-locaux-2026-09-05/forge/` :

- `exercice.json` conserve `volcan-forge-colorie-01`, `volcan-08`, les trois compétences, les
  huit couleurs et huit consignes ;
- `habillage.json` conserve `volcan.forge`, les ids de cibles historiques et les ids non ciblés ;
  les libellés, eux, décrivent maintenant l'objet effectivement dessiné ;
- `scene.svg` contient des silhouettes polygonales fermées (`M` / `L` / `Z`) au-dessus de
  l'illustration, à viewBox `960 × 600` ;
- `image/forge-couleur-v1.png` est l'unique rendu demandé, en `1536 × 1024` ; son SHA-256 de
  fichier est `69530231e593fca3f9be59cee5631952bbbfd26c856fdd019ba2ef97b63a1be9` ;
- `image/prompt.txt` conserve le prompt exact envoyé au générateur intégré ;
- `points-reperes.json` porte, pour chaque cible, un point intérieur et un point extérieur
  observés sur le raster, normalisés dans `[0, 1]` et indépendants des polygones ;
- `image/provenance.json` donne la méthode et les deux références.

## Choix visuel et objets

`forge-v2.png` n'a été employé que comme composition : il est au trait et ne satisfait pas la
recette couleur/texturée acceptée pour l'essai local. L'image `forge-couleur-v1.png` est une
seule génération intégrée, référencée stylistiquement sur `tapis-objets-v2.png`. Elle présente
des silhouettes grandes et isolées avant recoloration : le seau en bas à droite, le marteau sur
la table basse à gauche, l'enclume rouge sur son billot au centre, le cristal violet en bas à
droite, la lanterne à gauche, un cristal rose seul à l'extrême gauche et le feu au foyer.

Les phrases sont exactement :

1. « Colorie le seau en bleu. »
2. « Colorie le marteau en noir. »
3. « Colorie l'enclume en rouge. »
4. « Colorie le billot en brun. »
5. « Colorie le grand cristal en violet. »
6. « Colorie la lanterne en jaune. »
7. « Colorie le grand cristal de gauche en rose. »
8. « Colorie le feu en orange. »

## Mesures et contrôles ciblés

### Normalisation finale du repère

Le viewBox initial `960 × 600` contenait le raster `3:2` sur 900 unités, avec une marge de 30
à gauche et à droite. Il a été normalisé en **`960 × 640`**, même ratio que le PNG : l'image
occupe désormais exactement tout le repère. Tous les chemins ont reçu la transformation
`x' = (x − 30) × 960 / 900`, `y' = y × 640 / 600`; les 16 surfaces et leurs centres intérieurs
ont ensuite été recalculés. Les points raster s'opposent maintenant directement aux masques par
`x = 960 × xr`, `y = 640 × yr`.

Un contrôle ciblé, sans compilation ni suite npm, a relevé les 16 régions et a vérifié :

- zéro chemin ouvert, région absente, région non déclarée, divergence de surface ou centroïde
  hors région ;
- les surfaces et centres des **16** régions ont été recalculés par `mesureDeRegion` et
  `pointRepresentatif` ;
- les huit repères intérieurs tombent dans leurs silhouettes et leurs huit repères extérieurs
  n'y tombent pas ;
- revue visuelle directe des huit superpositions sur le raster, disponible en 1024 px et 512 px
  dans `bac-a-sable/coloriages-locaux-2026-09-05/forge/forge-superposition-*.png`.

Cette revue a corrigé cinq écarts réels après la normalisation : la lanterne suit maintenant son
crochet, son capot, son verre et son socle (sans envelopper la roche) ; le feu suit les flammes
au lieu d'empiéter sur les pierres et le sol ; le marteau ne couvre plus le triangle de table à
gauche, inclut la partie basse de sa tête et suit son manche ; le nez de l'enclume quitte le
rocher à gauche et son pied droit est complet ; le billot est prolongé jusqu'à son vrai bord droit.
Le cristal rose de gauche, le seau et le grand cristal violet recouvrent leurs objets visibles.

Les trois derniers relevés se lisent aussi sans superposition de cibles voisines dans
`forge-masque-marteau-de-forge-*.png`, `forge-masque-enclume-*.png` et
`forge-masque-billot-*.png`, dans le même dossier de bac à sable. La frontière du marteau
inclut la tête et son manche, celle de l'enclume n'inclut pas le billot, et celle du seau ne porte
pas sur l'eau voisine. Le repère extérieur du billot a été déplacé sur le sol libre à droite,
car son ancien point est désormais — correctement — dans la souche prolongée.

Cette preuve géométrique ne remplace pas la revue parent sur écran : elle atteste les contours et
les points, pas l'acceptation esthétique de l'illustration ni le confort tactile en jeu. Limites
exactes : les contours restent des polygones relevés à la main, non une segmentation pixel à
pixel ; le grand cristal violet est volontairement recadré par le bord inférieur droit, comme
l'image elle-même ; les détails fins (anse du seau, fil de la lanterne, étincelles) ne sont pas
des cibles séparées. Ces limites n'élargissent aucune cible au décor voisin.

## Lexique à arbitrer avant promotion

La porte `estAuLexique` locale accepte les autres mots des huit phrases, y compris `cristal`,
`grand` et `gauche`. Elle refuse **marteau**, **enclume**, **billot** et **lanterne**. Le lexique
n'a pas été modifié : le principal ou le parent doit choisir entre mots-cibles explicitement
justifiés, reformulation pédagogique ou ajout validé au lexique.

## Intégration finale par le principal — 5 septembre

La dernière reprise est intégrée pour essai local sous `contenu/assets/decors/forge-coloriage-v3.png`.
Le marqueur `data-fond-illustre` a été ajouté au SVG : il active la grisaille et masque les traits
techniques. Huit objets atteints par touchers natifs dans quatre formats, texte du cristal de
gauche et voix mis à jour. Prompt exact et provenance conservés dans le verrou. La loupe aide
pour la lanterne ; les mots hors du lexique local restent signalés, sans ajout automatique.
Les mentions suivantes « non publié » décrivent l'étape déléguée, désormais dépassée.

## Limites et suite

L'image n'est ni publiée ni ajoutée aux verrous d'assets, les voix ne sont pas régénérées et aucun
test, moteur ou contenu livré n'a été touché. Après revue, le principal peut promouvoir ce seul
brouillon et exécuter la recette native complète (taps, refus doux, aide, deux orientations,
audio et régressions visuelles indépendantes).
