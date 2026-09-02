# Priorité de remplacement des SVG actifs — 2 septembre 2026

## Objet et méthode

Cet audit est un inventaire en lecture seule après le commit `639bb02`. Il croise les 76 fichiers
de `contenu/noeuds/` avec leur exercice, leur habillage déclaré et le fichier effectivement servi.
La priorité combine quatre faits : rang dans la progression, nombre de réemplois, part occupée par
le dessin dans la mécanique et distance esthétique avec le campement V6 et les illustrations
éditoriales validées.

Le mot *blockout* doit être employé avec précision. Les anciens rectangles identiques ont bien été
remplacés : les SVG actuels représentent désormais les bons objets, possèdent des régions fermées
et sont jouables. Ils restent cependant des **dessins schématiques produits par un générateur de
formes polygonales** : gris uniforme, contour constant de 4 unités, très peu de détails internes,
aucune texture et profondeur faible. Ils font donc leur travail pédagogique, mais ne tiennent plus
la direction visuelle que l'ouverture, la carte, le campement et les compagnons ont installée.

## Mesure de l'exposition réelle

- 76 nœuds sont livrés et atteignables dans la progression.
- Ils utilisent 55 habillages distincts.
- `campement.chaudron` est le seul de ces 55 habillages à activer le nouveau rendu raster indexé ;
  son ancien `chaudron.svg` n'est plus qu'un repli. **54 scènes SVG restent donc visibles en jeu.**
- Ces 54 scènes ne sont pas de simples papiers peints : 13 moteurs sur 14 montent leur scène à
  pleine opacité. Leur défaut esthétique est donc directement visible, y compris derrière les
  cartes, les mots ou les objets manipulés.
- Vingt et une occurrences de nœud réemploient un habillage déjà rencontré. Embellir d'abord les
  scènes réemployées rapporte davantage qu'une amélioration sur un tableau unique.
- Les cinq PNG validés dans `contenu/assets/decors/` sont bien publiés, mais **aucun n'est encore la
  scène interactive de son exercice**. Ils ne doivent pas être comptés comme une amélioration déjà
  vue par l'enfant.

Deux SVG ne doivent pas être remis au même niveau que le reste : `galeries.grottes` est un décor
présentable et distinctif ; `clairiere.ecole` est pédagogiquement lisible et beaucoup plus riche
que les autres avec 31 régions. Ils restent en décalage de style, mais ne sont pas des urgences de
lisibilité. Les supports `galeries.tracer-cristal` et `galeries.tracer-paroi` sont volontairement
dépouillés ; leur problème est l'absence d'ambiance autour de la zone de tracé, pas la zone de
tracé elle-même.

## Séquence de remplacement recommandée

### P0 — ce que l'enfant juge dès ses premières minutes

1. **`clairiere.ecole` — nœuds 01 et 10, coloriage, deux emplois.** C'est le premier exercice et
   le seul décor de la Clairière rejoué comme grand tableau. Le PNG validé donne la bonne qualité
   d'ambiance, mais il n'affiche aucun enfant alors que les consignes désignent les cheveux de deux
   garçons et de deux filles. Une dérivation de coloriage doit ajouter ces quatre enfants et
   conserver distinctement maîtresse, pull, quatre feuillages, porte, toit, deux fenêtres, ballon
   et banc. Il faut valider l'image complète avant de fabriquer le masque raster indexé.
2. **`galeries.tracer-cristal` puis `galeries.tracer-paroi` — nœuds 01 et 02 des Galeries.** Ces deux
   écrans arrivent immédiatement après l'école et présentent aujourd'hui une grande ardoise vide,
   deux pans de mur et deux cristaux simples. Conserver exactement la surface calme du tracé ;
   enrichir seulement le pourtour (roche, reflets froids, profondeur, petits cristaux). Une version
   SVG/CSS plus riche peut être préparée sans génération d'image, mais sa publication reste une
   décision visuelle parent.
3. **`clairiere.paniers` — nœuds 03 et 12, deux emplois.** C'est la première scène de tri et l'une
   des trois scènes de la Clairière revues plus tard. Les paniers doivent devenir des objets de jeu
   immédiatement identifiables, avec anses, tressage simple et implantation dans le pré ; les
   étiquettes et zones de dépôt restent immobiles et très contrastées.
4. **`clairiere.ecole-place` — nœud 04.** Le décor comporte encore trois rectangles pointillés qui
   lisent « exercice de formulaire ». Le PNG École déjà validé peut servir de fond sans demander
   une nouvelle génération ; les trois zones `ciel`, `toit` et `à côté du banc` doivent rester une
   surcouche SVG nette et alignée. C'est le meilleur gain autonome de cette liste, sous réserve
   d'une capture tablette avant publication.
5. **`clairiere.guirlande`, `clairiere.lucioles`, `clairiere.lianes`, `clairiere.collier`,
   `clairiere.veillee`, puis `clairiere.luciole`.** Ordre conseillé : nœuds 05, 06, 08, 07, 09,
   puis 02/11. Les silhouettes sont correctes, mais toutes héritent du même trait, du même gris et
   d'une composition très frontale. `clairiere.luciole` est placée en dernier dans ce sous-lot car
   son sujet central est déjà reconnaissable et l'habillage est réemployé ; une amélioration
   réussie doit surtout donner un vrai halo et une profondeur nocturne sans animer le texte.

**Résultat attendu de P0 :** toute la première région, plus les deux premiers apprentissages des
Galeries, partage enfin la qualité perçue de l'ouverture et du campement. C'est la vague à terminer
avant d'embellir une région tardive isolée.

### P1 — finir les Galeries, deuxième région ouverte

Ordre concret : `galeries.cristal` (nœuds 03/14), `galeries.pierre` (05), `galeries.veine` (06),
`galeries.stalagmites` (07), `galeries.passage` (08), `galeries.frise` (09),
`galeries.echo-conte` (10), `galeries.echos` (11), puis `galeries.grottes` (04/13).

`galeries.cristal` passe devant parce qu'il est vu deux fois et porte un effet lumineux qui devrait
être une signature de région. `galeries.grottes`, également vu deux fois, passe pourtant en dernier
car ses trois ouvertures de tailles distinctes, sa voûte, sa stalactite et sa flaque sont déjà
lisibles : la fréquence seule ne justifie pas de refaire un décor qui fonctionne avant les écrans
encore plats. Le chaudron du nœud 12 est exclu de cette vague : il est déjà raster et validé.

### P2 — les trois coloriages dont l'image validée est pédagogiquement incomplète

1. **`marais.brume` — nœud 08.** Ajouter, dans le style exact du PNG validé, une mouche, une souris,
   une poule, une roue et une route ; préserver le caillou et un ciel distinct. Les silhouettes
   doivent rester séparables à l'échelle tablette.
2. **`foret.tapis` — nœud 08.** Ajouter un nid, un chat et un rat ; conserver un arbre entier et
   deux feuilles nettement ordonnées en hauteur. Éviter que les animaux deviennent le point focal
   au détriment du tapis de feuilles.
3. **`volcan.forge` — nœud 08.** Ajouter tableau, drapeau, chapeau, rideau et oiseau autour du seau,
   du mur et du feu déjà présents. C'est le brief le plus contraint : six mots en `eau` doivent être
   reconnaissables sans légende dans une seule composition.

Ces trois remplacements **exigent une nouvelle image et une validation parent**. Les PNG actuels
sont des références de style, pas des scènes pédagogiquement substituables. Après accord seulement :
fond, masque RGB exact, trait superposé, contrôle mot/objet, capture grise puis entièrement colorée.

### P3 — compléter les régions intermédiaires par familles cohérentes

Traiter les familles, pas un fichier au hasard :

- **Marais :** `orage` et `poissons` d'abord (deux emplois chacun), puis `grenouilles` et
  `nenuphars` (deux emplois chacun), enfin `coquillages`, `ponton`, `roseaux`.
- **Forêt :** `feuilles`, `bestiaire`, `souche`, `message` d'abord (deux emplois chacun), puis
  `pas-japonais`, `buee`, `veillee-automne`; `tapis` relève de P2.
- **Volcan :** `etoiles-filantes`, `wagons`, `sable`, `geodes` d'abord (deux emplois chacun), puis
  `coulee`, `train`, `fresque`; `forge` relève de P2.

Chaque famille doit partager une profondeur, une palette et deux ou trois motifs récurrents, tout
en gardant les zones de lecture sur un parchemin immobile. Cela évite une collection de jolies
images sans identité de région.

### P4 — Cité des Histoires et sa fresque

Commencer par les quatre décors réemployés : `cite.bibliotheque`, `cite.cartes`, `cite.pellicule`,
`cite.banniere`. Continuer avec `theatre-ombres`, `vitrail`, `ponts`, `rayonnages`, `enseigne`.
Terminer par `cite.fresque-murale` : le PNG validé est très réussi comme décor, mais ses fleurs,
feuilles, pots, arbres, portes et son ciel sont nombreux et dispersés. En faire un coloriage fiable
demande une déclinaison plus simple où les huit cibles sont uniques et sans ambiguïté, puis une
validation parent avant masquage.

## Ce qui peut avancer sans nouvelle validation d'image

La règle de publication reste stricte : aucun nouveau dessin ne remplace directement un fichier
de `contenu/habillages/`. En revanche, le chantier peut avancer seul sur les points suivants :

- fabriquer les planches de comparaison et les briefs exacts à partir des identifiants de régions ;
- produire toutes les propositions dans `contenu/brouillons/`, avec empreintes et prompts ;
- préparer le détourage, les masques raster, les tests d'alignement et les contrôles de couleurs ;
- intégrer **le PNG École déjà validé** comme fond du moteur `place`, sans modifier ses pixels, en
  conservant les trois zones de dépôt SVG ; cette intégration doit encore être montrée en capture,
  mais ne demande pas de régénérer ni de refaire valider une image source ;
- enrichir techniquement les deux supports de tracé en dehors du couloir gestuel, ou améliorer le
  cadrage et les couches de l'interface, tant qu'une capture est soumise avant de figer la référence ;
- renforcer la QA : présence de chaque cible nommée, unicité des couleurs de masque, alignement à
  1280 × 800, absence d'animation dans le champ de lecture et repli SVG vérifié.

Ce qui **ne peut pas** être publié sans nouvelle validation parent : toute image générée, toute
composition qui ajoute ou déplace un objet pédagogique, les quatre déclinaisons de coloriage
École/Brume/Tapis/Forge, la simplification de la Fresque, et toute mise à jour de référence visuelle
qui entérine leur apparence.

## Dette transversale hors des 54 décors

Gobi reste un SVG intégré et apparaît bien plus souvent qu'un habillage particulier : aide dans les
exercices et pose de joie sur la récompense. Il est désormais entouré de compagnons raster dans le
style validé, ce qui rend son décalage plus visible. Son remplacement doit donc être planifié en
parallèle de P0, mais séparément : canonique parent, quatre états prioritaires, feuilles de sprites
déterministes, image fixe de repli et variante à mouvements réduits. Il exige une validation de
personnage et ne doit pas retarder le remplacement des premiers décors.

`campement/page-blanche.svg` et `campement/vitrail-libre.svg` ne sont pas comptés : aucun nœud livré
ne les référence actuellement. Ils sont valides, mais les embellir maintenant n'améliorerait aucun
parcours enfant. De même, les SVG archivés de la carte, de l'ouverture, de l'école et des grottes ne
doivent pas entrer dans une campagne esthétique.

## Décision opérationnelle proposée

Le meilleur prochain lot autonome est court : fond École validé sous `ecole-place`, maquette des
deux supports de tracé, puis planche P0 des huit autres scènes de la Clairière. En parallèle, il faut
préparer **une seule** planche de validation regroupant les déclinaisons pédagogiques École, Brume,
Tapis, Forge et Fresque. Une fois cette planche acceptée, le pipeline raster indexé déjà prouvé par
le chaudron permet d'intégrer les cinq coloriages sans inventer un second moteur.
