# Coloriage raster indexé — contrat intégré le 2 septembre 2026

## Décision parentale appliquée

Le parent a demandé de corriger le chaudron et de remplacer progressivement les dessins SVG de
blockout par de belles illustrations raster. La destination technique reste `galeries-12` afin de
ne pas ajouter un faux nœud à la progression, mais son exercice charge désormais l'habillage
`campement.chaudron` : toucher le chaudron ne montre plus la paroi des Galeries.

Un SVG de repli porte les mêmes 21 identifiants que le masque afin de rester jouable si un PNG ne
charge pas. La recette globale a précisément détecté puis empêché le maintien de l'ancien SVG à 14
régions : un repli qui montre d'autres objets n'est pas sûr. Après validation parentale du brouillon
`contenu/brouillons/campement/coloriage-chaudron-v3-organique.png`, les trois PNG alignés décrits
ci-dessous sont devenus le rendu principal.

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

## Publication du chaudron validé

La source validée mesure 1536 × 1024 pixels. Son empreinte de fichier est
`sha256:7F05618925D644E7914D2E0C69BEB7CF642B3C8F4E9A7A4C695AE102ABA9F1F5` et son empreinte des
pixels RGBA décodés est
`sha256:559EE9461276CE5548ECF6FE797C3DD63C57A51BA67B2ED8E1A8D81DAA7AF0E9`.

Le script `npm run coloriage:chaudron` reconstruit sans dépendance externe les trois couches :

- `chaudron-fond.png`, fond blanc opaque ;
- `chaudron-trait.png`, encrage bleu nuit transparent ;
- `chaudron-masque.png`, 21 couleurs RGB opaques et uniques.

Il refuse toute autre empreinte source, applique un flood-fill à quatre voisins avec le seuil
d'encre 200, puis ne publie que les 21 composantes fermées validées. Les centroïdes, surfaces,
indices de composantes, nombres de pixels et empreintes de sortie sont consignés dans
`production/coloriages/chaudron-raster.rapport.json`. Le masque contient 364 416 pixels
coloriables ; aucune région ne touche le bord et aucun code RGB parasite n'est toléré.

La recette ciblée comprend la reproduction octet pour octet des trois PNG, le décodage réel du
masque, l'unicité et la présence de toutes ses couleurs, les dimensions communes, les bords
transparents, l'interaction pointeur/clavier et le repli SVG. `npm run test:contenu` contrôle aussi
ces propriétés pour tout habillage raster indexé.
