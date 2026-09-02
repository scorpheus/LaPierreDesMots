# Audit des visuels et stratégie de coloriage raster — 2 septembre 2026

## Défauts reproduits pendant l'essai parent

- Le feu et le papillon animés étaient superposés à leur version déjà peinte dans le fond V5,
  avec transparence et ancres estimées. Ils ont été retirés du rendu et des assets de production.
- Une prise transparente recevait le contour de focus générique de `.cible`, tandis qu'un second
  calque dessinait un cercle doré. Ces deux géométries techniques ne suivaient aucun objet peint.
  Elles sont remplacées par six étincelles ponctuelles et une découverte nommée.
- Le chaudron du campement ouvre `galeries-12`, donc l'habillage `galeries.paroi-libre` et non
  `campement.chaudron`. L'enfant reçoit actuellement une paroi géométrique sans rapport avec
  l'objet touché.
- À 1 280 × 720, la toile libre pouvait tomber à environ 1 235 × 124 px. Son dessin utile ne
  mesurait alors qu'environ 198 × 124 px et son trait 4 unités environ 0,83 px. La correction
  ne force pas de hauteur — ce qui ferait défiler la tablette : elle retire la seconde copie de
  l'invitation, place « J'ai fini » dans le nuancier et donne tout l'espace restant à la toile.
  Mesure dans le navigateur intégré en portrait 836 × 1 272 : toile 791 × 661,25 px, une seule
  invitation et aucun conteneur défilant.

## Étendue mesurée

Les 76 nœuds du parcours référencent 55 SVG uniques. Cinquante-trois sont produits par
`scripts/dessiner-decors.mjs` et 54 sur 55 n'emploient aucune courbe : ce sont encore des
blockouts géométriques. Le remplacement doit se faire par vagues, en commençant par ce que
l'enfant voit le plus tôt et par les six coloriages réellement atteignables :

1. coloriage libre du chaudron, aujourd'hui `galeries/paroi-libre.svg` ;
2. école de la Clairière, employée par `clairiere-01` et `clairiere-10` ;
3. tapis de la Forêt Muette ;
4. brume du Marais Jumeau ;
5. forge du Volcan ;
6. fresque murale de la Cité des Histoires.

## Contrat proposé : raster indexé

Une illustration aboutie peut rester raster sans abandonner « la couleur vient du code » :

1. une image de trait bleu nuit sur fond blanc, validée par le parent ;
2. un masque PNG strictement aligné, une couleur RGB unique par région fermée ;
3. un manifeste qui nomme chaque RGB et conserve aire et centroïde ;
4. au toucher, lecture du pixel du masque puis application de la couleur choisie par le code ;
5. rendu des aplats sous le trait, qui conserve les détails et la direction artistique ;
6. boutons accessibles d'au moins 64 px autour des centroïdes ;
7. contrôle automatique des dimensions, couleurs parasites, connexité et empreintes.

Le mode SVG existant reste disponible pendant la migration. Le pipeline expérimental vit dans
`scripts/coloriages/` et n'écrit ses sorties d'essai que dans `bac-a-sable/`.

## Premier brouillon

Le générateur d'images intégré à Codex a produit trois essais. La candidate actuelle est
`contenu/brouillons/campement/coloriage-chaudron-v3-organique.png`, SHA-256
`7F05618925D644E7914D2E0C69BEB7CF642B3C8F4E9A7A4C695AE102ABA9F1F5`.

Elle reprend le chaudron de peinture, la grenouille, les champignons, la lanterne et la végétation
du campement V5 sous forme d'encrage organique. Elle reste un brouillon : aucune écriture dans
`contenu/exercices/` ou `contenu/habillages/` et aucune substitution visuelle ne sont autorisées
avant validation parent.

## Condition pour les futures animations du campement

Un objet animé ne se superpose plus à sa version immobile. Il faut d'abord produire un fond propre
où cet objet a été retiré, puis un calque opaque ou une planche de poses issue de la même composition,
avec une ancre mesurée. Le pipeline de sprites existant reste utile pour la normalisation et la QA,
mais il ne peut pas réparer une mauvaise séparation fond/objet.
