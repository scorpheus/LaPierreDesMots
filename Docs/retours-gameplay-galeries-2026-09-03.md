# Retours de jeu — Galeries, récompense et coffre — 3 septembre 2026

Cette note conserve les défauts observés pendant la partie réelle du parent. L'audio est hors
périmètre.

## Corrections appliquées

- `eclair` : le bouton « Montre-moi le mot » occupe désormais la place où le mot apparaît ; il
  ne vit plus dans une bande basse dont la hauteur changeait après le tap. « Revoir le mot » reste
  gratuit et au même endroit.
- `eclair` : le premier placement reste tiré par `Alea`, mais la bonne réponse ne peut plus garder
  la même position pendant deux étapes consécutives. Le jeu ne se réussit donc plus en tapant
  toujours au même endroit.
- `grave` : le mot incomplet devient un repère central sur parchemin, avec un corps minimal de
  48 px. Le clavier est tenu à l'écart de ce repère.
- récompenses : « cadeau spécial » et « une zone du monde se rallume » sont retirés tant que le
  gain ne porte ni asset, ni région, ni objet concret. La forme de Gobi est nommée comme telle et
  le palier rare est présenté comme un palier de collection.
- récompenses : un compteur distingue explicitement « exercice terminé » ou « sortie terminée »
  de la progression totale de la région.

## Colorier l'école — correction locale

Le défaut mesuré était double : les anciens polygones du blockout étaient invisibles et le moteur
retirait progressivement un filtre gris posé sur toute l'image. De plus, la première fiche demandait
les cheveux de deux garçons qui n'existent pas dans l'illustration finale.

La correction publiée conserve l'illustration validée et emploie le SVG uniquement comme masque
local : seule la cible de la consigne courante est grisée, puis elle reçoit la couleur choisie avec
un mélange qui conserve les ombres et la texture du raster. Aucun filtre ne recolore plus l'image
entière. Le pull, les deux feuillages de premier plan, le toit, la porte, les fenêtres, le tableau,
les cheveux de la maîtresse et le banc sont recalés sur le décor réel. Les quatre faux arbres et les
enfants absents restent dans le registre d'identifiants historiques, mais aucune consigne ne les
emploie. La consigne impossible a été remplacée par « Colorie le banc en brun. »

La recette Chromium prouve à 1920 × 1080 que le pull seul reçoit le bleu et que le SVG racine ne
porte aucun filtre. Une migration vers un masque RGB pixel-précis reste possible pour des dessins
plus complexes, mais elle n'est plus un prérequis pour rendre cet exercice jouable.

## Coffre — état mesuré et suite

Le coffre fonctionne techniquement, mais reste un album de chantier : vignettes de 48 px dans de
grandes cases, butins SVG inline, silhouettes abstraites et fiche dont le contenu paraît petit et
décalé. Le prochain lot doit agrandir les objets à 96–128 px, stabiliser la fiche et afficher une
progression lisible telle que « 6 trouvailles sur 13 ».

Une seule nouvelle image raster est prioritaire : un coffre ouvert servant d'ancrage décoratif.
Les six objets ne seront générés qu'après validation de ce principe, afin de ne pas produire des
images redondantes avec les dessins existants.

## Gardes de régression

- aucun bouton « voir/revoir » dans la bande qui dimensionne le décor ;
- aucune répétition consécutive de la position de la bonne réponse, pour 32 graines et chaque
  exercice `eclair` livré ;
- mot incomplet central, visible et d'au moins 48 px ;
- aucune annonce de cadeau ou de nouvelle zone sans identifiant concret correspondant.
- aucune grisaille appliquée à toute l'illustration pendant un coloriage ;
- les prises d'une consigne ne peuvent pas désigner une région inactive ;
- le lanceur Playwright reconstruit `client/dist-test` seulement lorsque ses sources sont plus
  récentes, afin qu'une recette rapide ne teste jamais une ancienne version du jeu.
