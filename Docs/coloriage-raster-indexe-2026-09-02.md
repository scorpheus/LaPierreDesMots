# Coloriage raster indexé — contrat intégré le 2 septembre 2026

## Décision parentale appliquée

Le parent a demandé de corriger le chaudron et de remplacer progressivement les dessins SVG de
blockout par de belles illustrations raster. La destination technique reste `galeries-12` afin de
ne pas ajouter un faux nœud à la progression, mais son exercice charge désormais l'habillage
`campement.chaudron` : toucher le chaudron ne montre plus la paroi des Galeries.

L'ancien SVG du chaudron reste un repli temporaire. Il sera remplacé visuellement seulement après
validation des trois PNG alignés décrits ci-dessous.

## Contrat déclaratif

Un habillage peut maintenant ajouter `scene.rasterIndexe` sans perdre son `scene.fichier` SVG :

- `fond` : illustration fixe non coloriable ;
- `trait` : encrage transparent affiché au-dessus des aplats ;
- `masque` : PNG invisible où chaque région porte une couleur RGB exacte ;
- `largeur` et `hauteur` : dimensions natives identiques des trois PNG.

Chaque région coloriable porte alors `couleurMasque: "#RRGGBB"`. Les couleurs doivent être
uniques. Un pixel transparent ou une couleur non déclarée appartient au décor et ne réagit pas.
Le clic est corrigé du letterboxing produit par `object-fit: contain`, puis traduit en pixel du
masque. Les prises clavier et tactiles de 96 unités autour des centroïdes restent présentes.

Le client autonome embarque aussi les PNG placés sous `contenu/habillages/`. Aucune dépendance
externe n'est ajoutée : le navigateur compose localement les aplats dans un canvas à partir du
masque, puis conserve ce masque en mémoire pour les taps suivants. Si une des trois couches ne se
charge pas, la scène revient au SVG déclaré par `scene.fichier` au lieu d'afficher une toile vide.

## État de publication

Le contrat, son moteur de rendu et ses tests sont en production. Aucun nouveau raster n'est encore
servi : l'ajout de `scene.rasterIndexe` à un habillage attend toujours la validation visuelle du
fond, du trait et du masque par le parent. Cette séparation évite qu'un brouillon placé sous
`contenu/brouillons/` atteigne l'enfant par erreur.

Contrôles ciblés du lot : 16 tests de composant verts et `npm run test:contenu` vert avec
609 contrôles et 0 problème.
