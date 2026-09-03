# Plan de production raster des exercices — 2026-09-02

## Décision de dimensionnement

L'inventaire contient **55 habillages effectivement consommés** par les exercices (les 54
habillages des six régions, plus `campement.chaudron`). Les 55 SVG ne donnent pas 55 décors à
produire séparément : un habillage est un décor partagé par tous ses exercices consommateurs.

Les rasters déjà validés sont réutilisés sans nouvelle génération :

- `contenu/assets/decors/ecole.png` pour `clairiere.ecole` et `clairiere.ecole-place` ;
- `contenu/assets/decors/tapis.png` pour `foret.tapis` ;
- `contenu/assets/decors/brume.png` pour `marais.brume` ;
- `contenu/assets/decors/forge.png` pour `volcan.forge` ;
- `contenu/assets/decors/fresque-murale.png` pour `cite.fresque-murale` ;
- le paquet raster déjà verrouillé de `campement.chaudron` pour `paroi-libre-01`.

Il reste donc **48 décors maîtres** à produire, et non 76 images. Chaque décor maître est livré
en deux calques alignés (`fond.png` et `trait.png`) à **1536 × 1024, ratio 3:2**, avec un masque
par région coloriable. Les mots, consignes, lettres et réponses restent dans l'interface : aucun
texte ne doit être peint dans le raster.

## Style commun verrouillé

Préfixe de prompt à appliquer à chaque décor et planche :

> Illustration jeunesse éditoriale française, dessin organique précis, aplats mats légèrement
> texturés, contours bleu nuit doux, lumière naturelle fraîche, couleurs franches mais non
> criardes, composition claire pour un enfant de 7 ans, aucune dominante jaune, aucune peinture à
> l'huile, aucun rendu 3D ou plastique, aucun halo, aucun texte, aucune lettre, aucun cadre,
> aucun filigrane.

Pour un décor : **PNG RGB fond + PNG RGBA trait**, 1536 × 1024, ratio 3:2, respiration en bas
pour l'interface. Pour une illustration de carte : **PNG RGBA 512 × 512**, sujet unique centré,
fond transparent après détourage. Pour une vignette : cellule **512 × 384**, ratio 4:3, sans
texte ; les cellules peuvent être regroupées en planches, mais doivent rester recadrables sans
perdre le sujet.

Un masque de scène est un masque alpha monochrome aligné sur le décor, un identifiant de région
par fichier logique. Il conserve exactement les identifiants du `.habillage.json` et empêche la
recoloration de toucher le fond, le trait ou les objets mobiles. Les masques peuvent être empaquetés
en atlas par habillage, mais le décompte ci-dessous est le décompte **logique** opposable.

## Chiffrage exact par vague

| Vague | Périmètre | Décors maîtres nouveaux | Calques décor (fond + trait) | Objets/cartes nouveaux | Planches vignettes | Cellules vignettes | Masques scène | Masques objets/cellules |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Clairière, parcours prioritaire | 7 | 14 | 0 | 0 | 0 | 107 | 0 |
| 2 | Cartes et vignettes image manquantes | 0 | 0 | 39 | 5 | 47 | 0 | 86 |
| 3 | Forêt muette + Galeries | 18 | 36 | 0 | 0 | 0 | 172 | 0 |
| 4 | Marais jumeau + Volcan + Cité | 23 | 46 | 0 | 0 | 0 | 257 | 0 |
| **Total à produire** | **48 habillages nouveaux** | **48** | **96** | **39** | **5** | **47** | **536** | **86** |

Les **536 masques scène** couvrent les 54 habillages d'exercices hors chaudron : Clairière 107,
Forêt 81, Galeries 91 (le `paroi-libre` non servi n'est pas compté), Marais 80, Volcan 79,
Cité 98. Le chaudron existant porte déjà ses 21 masques. Les 86 masques de la vague 2 sont 39
alpha de cartes et 47 fenêtres de cellules de planche. Les cinq PNG d'objets validés
(`ballon`, `oiseau`, `parapluie`, `poisson`, `soleil`) sont réutilisés pour `ecole-02-place`.

## Vague 1 — Clairière, parcours prioritaire

Les 7 lignes ci-dessous remplacent les SVG encore non couverts. `ecole.png` et ses deux
habillages consommateurs ne sont pas régénérés ; leurs 40 masques de zones restent à exporter
et à aligner avec le raster existant.

| Asset maître à produire | Exercices consommateurs | Fonction gameplay | Séparations / masques | Prompt court (après le préfixe commun) |
|---|---|---|---|---|
| `clairiere/collier` | `collier-syllabes-01` | Décor de collier ; les syllabes restent des boutons séparés | Masquer ciel, mousse, herbe, coffret, fil, 3 perles, feuille, caillou ; perles et coffret ne doivent pas fusionner | Clairière fraîche avec coffret ouvert, fil et trois grosses perles lisibles, mousse et caillou au premier plan. |
| `clairiere/guirlande` | `guirlande-phrase-01` | Support des fanions à toucher dans l'ordre | Masquer corde, 3 fanions, piquet, lampion, fleur, caillou ; laisser la corde libre de texte | Fête de clairière sobre, corde tendue avec trois fanions de tissus, lampion et petite fleur, espace central calme. |
| `clairiere/lianes` | `lianes-voyelles-01` | Plateau de chemin ; les cases de mots sont DOM séparé | Masquer jour, sol, branche, 3 lianes, feuillage, deux houppiers, champignon, pierre | Sous-bois de clairière avec trois lianes courbes et pierres moussus, parcours visuel net, aucun quadrillage imprimé. |
| `clairiere/luciole` | `luciole-couleurs-01`, `luciole-voyelles-01` | Décor commun aux deux éclairs de lecture | Masquer nuit, herbe, rocher, tige, feuille, halo, luciole, lune, étoile, souche ; luciole mobile hors fond | Nuit douce de clairière, une luciole lumineuse près d'une feuille large, lune fine et souche basse, contraste lisible. |
| `clairiere/lucioles` | `lucioles-attrape-01` | Cibles lucioles mobiles devant le décor | Masquer sentier, buisson, fleur, lune et 3 lucioles ; ne pas peindre les mots sur les lucioles | Clairière nocturne avec sentier, buisson et trois lucioles distinctes dans des zones aérées, mouvement possible au premier plan. |
| `clairiere/paniers` | `paniers-couleurs-01`, `paniers-voyelles-01` | Deux paniers de tri, éléments textuels au-dessus | Masquer table, nappe, deux paniers, pomme, poire, prune, bol ; paniers entièrement distincts gauche/droite | Table de clairière avec nappe mate et deux paniers tressés bien séparés, quelques fruits calmes, fond respirant. |
| `clairiere/veillee` | `veillee-histoire-01` | Décor de récit ; aucune réponse dans l'image | Masquer tente, feu, bûche, couverture, marmite, lune, étoile ; feu séparé et sans dominante jaune | Veillée familiale dans une clairière bleutée, tente, feu doux non jaune, bûche, couverture et marmite, ciel étoilé. |

**Réutilisation Clairière :** `ecole.png` sert `ecole-01`, `ecole-03-mots-outils` et
`ecole-02-place`. Les cinq objets PNG déjà validés restent séparés et transparents ; aucune
nouvelle génération d'objet n'est nécessaire dans cette vague.

## Vague 2 — Cartes et vignettes image manquantes

Cette vague est prioritaire après la Clairière car elle solde les défauts visuels les plus
compréhensibles pour l'enfant. Les 39 cartes sont des **illustrations unitaires réutilisables**,
pas 39 décors. Les cartes de `cartes-paires-02` restent textuelles (début/fin de phrase) : elles
ne déclenchent pas une génération d'image ; seule leur consigne devra être réalignée lors du lot
audio.

### Cartes image — 39 objets RGBA 512 × 512

| Pack d'assets | Exercices consommateurs | Fonction gameplay | Séparations / masques | Prompt court |
|---|---|---|---|---|
| `cartes/foret-bestiaire-01` : renard, hibou, arbre, feuille, oiseau, fleur (6) | `bestiaire-paires-01` | Face image du memory mot/image | Un sujet par PNG, transparence réelle, aucun mot ni décor ; alpha 6/6 | Objet ou animal unique de forêt, vue trois-quarts lisible, aplats mats, contour bleu nuit, fond blanc à détourer. |
| `cartes/foret-bestiaire-02` : ours brun, hibou gris, arbre vert, enfants de l'école, oiseaux du matin, étoiles de la nuit (6) | `bestiaire-paires-02` | Face image du memory mot/image | Les enfants restent groupés mais séparés du fond ; étoiles sans texte ni lettre ; alpha 6/6 | Petite scène ou sujet unique de forêt, caractère immédiatement identifiable, couleurs naturelles sans jaune dominant, aucun texte. |
| `cartes/marais` : lapin, matin, jardin, sapin, main, pain (6) | `coquillages-paires-01` | Face image des six paires nasales | Lapin, sapin, main et pain comme sujets distincts ; « matin/jardin » en scène simple, aucun mot écrit ; alpha 6/6 | Image jeunesse d'un seul mot concret, cadrage carré, silhouette claire, fond transparent, aucune inscription. |
| `cartes/volcan-ill-01` : bille, fille, famille, quille, feuille, grenouille (6) | `geodes-paires-01` | Face image des six paires `ill` | Famille lisible en petit groupe, chaque autre sujet isolé ; alpha 6/6 | Sujet volcanique ou quotidien correspondant au mot, image simple et chaleureuse, contour bleu nuit, sans texte ni décor chargé. |
| `cartes/volcan-ill-02` : cheval, cochon, musique, vache, queue, phare, dauphin (7) | `geodes-paires-02` | Face image des huit paires `ch/qu/ph` | Un sujet par PNG ; instruments et animaux sans bruit visuel ; alpha 7/7 | Sujet unique reconnaissable par un enfant de 7 ans, cadrage carré, aplats mats, détourage propre, aucune lettre. |
| `cartes/cite` : cartable, école, maîtresse, cahier, ami avec livre, matin gris, cour, livre avec table (8) | `cartes-paires-01` | Face image des huit paires littérales | Pour les scènes, garder le sujet principal séparé du fond ; aucune scène ne contient de mot lisible ; alpha 8/8 | Petite scène scolaire ou objet unique, composition carrée très lisible, style livre jeunesse, sans texte, sans cadre. |

**Total cartes : 6 + 6 + 6 + 6 + 7 + 8 = 39 PNG RGBA et 39 masques alpha.** Les libellés
restent dans les cartes DOM. Les cartes `cartes-paires-02` (`rouge`, `orange`, `verte`,
`jaune`, `noire`, `violet`, `le panier`, `le bol`) ne sont pas des images : ne pas générer de
faux assets pour elles.

### Planches de vignettes — 5 maîtres, 47 cellules 4:3

Une planche par exercice est produite en **3 × 4 cellules de 512 × 384** pour dix scènes, ou
**3 × 3 cellules** pour neuf scènes. Chaque cellule possède un recadrage et un masque de sujet ;
le texte de `libelle` reste exclusivement dans l'interface.

| Planche maître | Exercices consommateurs | Cellules / fonction | Séparations / masques | Prompt court |
|---|---|---|---|---|
| `vignettes/galeries-frise` | `frise-chrono-01` | 10 scènes : cochon/ruche/mouche/danse, fille/quille/sac/chat, montagne/ligne/champignon ; chronologie | 10 cellules indépendantes ; cochon, fille, Gobi, animaux et objets masqués du fond ; aucun texte | Planche de dix petites scènes de galerie souterraine, une action simple par cellule, personnages et objets bien séparés, lumière fraîche. |
| `vignettes/volcan-fresque` | `fresque-chrono-01` | 10 scènes : cochon/ruche/mouche/danse, fille/quille/sac/chat, montagne/ligne/champignon | 10 cellules indépendantes ; garder les protagonistes centrés, pas de mot peint | Planche de dix vignettes dans un atelier volcanique chaleureux, actions successives simples, composition 4:3, sans texte. |
| `vignettes/cite-pellicule-01` | `pellicule-chrono-01` | 9 scènes de plage et de château | 9 cellules ; masquer Gobi, Plume, seau, sable, château et caillou par cellule ; pas de perforations dans le sujet | Planche de neuf scènes de plage et de château dans la cité, personnages cohérents, actions simples sans texte. |
| `vignettes/cite-pellicule-02` | `pellicule-chrono-02` | 9 scènes de maison, cahier, papa et jardin | 9 cellules ; masquer Gobi, papa, cahier, table, sac, jardin et lit par cellule ; aucun texte | Planche de neuf scènes de maison et de jardin, personnage cohérent, actions quotidiennes simples, sans texte. |
| `vignettes/cite-vitrail` | `vitrail-chrono-01` | 9 scènes du voyage nuage/pluie/rivière/lac/soleil | 9 cellules ; nuage, pluie, rivière et lac restent détachables, aucun mot « eau » écrit | Planche de neuf scènes poétiques de vitrail, nuage puis pluie, rivière et lac, enchaînement évident, sans texte. |

**Total vignettes : 5 planches maîtres, 47 cellules et 47 masques de recadrage/sujet.** Une
planche n'est pas une image jouable entière : le build devra produire les coordonnées/crops
déterministes ou référencer les cellules directement.

## Vague 3 — Forêt muette et Galeries

### Forêt muette — 7 décors nouveaux

| Asset maître | Exercices consommateurs | Fonction | Masques | Prompt court |
|---|---|---|---:|---|
| `foret/bestiaire` | `bestiaire-paires-01`, `bestiaire-paires-02` | Memory mot/image | 9 | Sous-bois de bestiaire avec terrier, renard, hibou et champignon, profondeur en trois plans. |
| `foret/buee` | `buee-grave-01` | Support de gravure sur vitre | 9 | Intérieur de cabane, grande vitre embuée, doigt qui trace, rideau fin et gouttes, support central dégagé. |
| `foret/feuilles` | `feuilles-attrape-01`, `feuilles-attrape-02` | Cibles de lecture devant feuilles | 9 | Sol de forêt d'automne, branche haute, feuilles distinctes, gland qui tombe, couleurs fraîches sans jaune dominant. |
| `foret/message` | `message-phrase-01`, `message-phrase-02` | Bandeau de phrase | 9 | Écorce et mousse avec entaille lisible, racine et champignon, grande zone calme pour les mots DOM. |
| `foret/pas-japonais` | `pas-japonais-chemin-01` | Chemin de lecture | 9 | Ruisseau forestier, fougère, tronc couché et trois pierres espacées, parcours naturel sans quadrillage. |
| `foret/souche` | `souche-tri-01`, `souche-tri-02` | Deux souches de tri | 9 | Sous-bois sombre mais accueillant, deux souches bien séparées, glands et champignon au sol, zones tactiles dégagées. |
| `foret/veillee-automne` | `veillee-automne-histoire-01` | Décor de récit | 10 | Clairière rousse de nuit, deux arbres, feu de veillée doux non jaune, Plume assise et lune rousse, aucun texte. |

`foret.tapis` réutilise `contenu/assets/decors/tapis.png` ; exporter seulement ses 17 masques
alignés, sans nouvelle génération de décor.

### Galeries — 11 décors nouveaux

| Asset maître | Exercices consommateurs | Fonction | Masques | Prompt court |
|---|---|---|---:|---|
| `galeries/cristal` | `cristal-bd-01`, `cristal-fv-01` | Éclair de graphèmes | 10 | Galerie humide avec socle et deux cristaux clair/sombre, gouttes et veine lumineuse, contraste net. |
| `galeries/echo-conte` | `echo-conte-histoire-01` | Récit | 9 | Voute de galerie, banc de pierre, lampe, flaque et petit cristal d'écho, atmosphère calme et lisible. |
| `galeries/echos` | `echos-paires-01` | Memory de mots | 9 | Paroi de sable avec quatre cristaux d'écho espacés, niche et galet plat, aucune inscription. |
| `galeries/frise` | `frise-chrono-01` | Chronologie et planche de vignettes | 9 | Paroi et bandeau de frise dans une galerie, quatre cases vides bien délimitées, torche et éclat, sans texte. |
| `galeries/grottes` | `grottes-bd-01`, `grottes-fv-01` | Tri dans trois grottes | 6 | Grande voûte souterraine avec trois bouches de grotte de tailles distinctes, stalactite et flaque. |
| `galeries/passage` | `passage-chemin-01` | Chemin | 9 | Passage rocheux avec ruisseau, deux rives, trois pierres plates et lanterne, chemin tactile dégagé. |
| `galeries/pierre` | `pierre-bd-01`, `pierre-bp-01` | Gravure de graphèmes | 9 | Salle de pierre sèche avec dalle, sillon, burin, éclat et torche, grande dalle centrale sans texte. |
| `galeries/stalagmites` | `stalagmites-assemble-01` | Assemblage | 9 | Grotte à voûte basse, trois socles et stalagmites distinctes, stalactite pendante et flaque. |
| `galeries/tracer-cristal` | `miroir-bd-01` | Tracé | 6 | Paroi de galerie claire avec deux cristaux opposés et ardoise de tracé, support nu et centré. |
| `galeries/tracer-paroi` | `miroir-bp-01` | Tracé | 6 | Coupe de paroi stratifiée, tas et sol de sable, grande paroi dégagée pour le ductus. |
| `galeries/veine` | `pierre-bp-01` | Gravure | 9 | Galerie de mine avec filon, veine, quartz, marteau, copeau et lampe, surfaces séparées. |

Le SVG `galeries.paroi-libre` n'est pas dans les 55 habillages servis et ne reçoit aucun nouvel
asset. `paroi-libre-01` réutilise le paquet `campement.chaudron` existant.

## Vague 4 — Marais jumeau, Volcan et Cité

### Marais jumeau — 7 décors nouveaux

| Asset maître | Exercices consommateurs | Fonction | Masques | Prompt court |
|---|---|---|---:|---|
| `marais/coquillages` | `coquillages-paires-01` | Memory mot/image | 9 | Bord de mer calme avec sable mouillé, écume, deux coquilles, algue, galet et bois flotté. |
| `marais/grenouilles` | `grenouilles-tri-01`, `grenouilles-tri-02` | Tri phonologique | 9 | Rive de vase avec eau calme, roseaux, deux nénuphars et trois grenouilles séparées, libellule témoin. |
| `marais/nenuphars` | `nenuphars-chemin-01`, `nenuphars-chemin-02` | Chemin | 9 | Eau sombre du marais, trois nénuphars espacés, libellule, roseau et grenouille posée, parcours sans cases imprimées. |
| `marais/orage` | `orage-eclair-01`, `orage-eclair-02` | Éclair de lecture | 9 | Marais sous orage doux, nuage lourd, pluie fine, éclair blanc, saule, barque et roseau courbe, sans menace. |
| `marais/poissons` | `poissons-attrape-01`, `poissons-attrape-02` | Cibles mobiles | 9 | Reflet d'eau et vase avec deux poissons distincts, roseau, nénuphar, bulles et galet, espace de déplacement. |
| `marais/ponton` | `ponton-assemble-01` | Assemblage | 9 | Eau calme et petit ponton de trois planches, pilotis, roseau, barque amarrée, planches séparées. |
| `marais/roseaux` | `roseaux-phrase-01` | Phrase à ordonner | 10 | Rive du soir avec trois roseaux et trois étiquettes suspendues, eau basse, libellule, zone centrale vide. |

`marais.brume` réutilise `contenu/assets/decors/brume.png` et reçoit uniquement ses 16 masques.

### Volcan — 7 décors nouveaux

| Asset maître | Exercices consommateurs | Fonction | Masques | Prompt court |
|---|---|---|---:|---|
| `volcan/coulee` | `coulee-chemin-01` | Chemin | 9 | Coulée de lave refroidie, cône et fumée légère, quatre pierres de parcours espacées, aucune chaleur agressive. |
| `volcan/etoiles-filantes` | `etoiles-filantes-attrape-01`, `etoiles-filantes-attrape-02` | Cibles mobiles | 9 | Pente de cendre avec cratère, étoiles filantes distinctes, braise froide et éclat de lave, espace aérien. |
| `volcan/fresque` | `fresque-chrono-01` | Chronologie et planche | 9 | Paroi volcanique avec trois panneaux de fresque, lueur douce, torche et éclat de roche, panneaux bien séparés. |
| `volcan/geodes` | `geodes-paires-01`, `geodes-paires-02` | Memory mot/image | 9 | Mine de cendre avec quatre géodes, marteau, lampe et éclat, ambiance minérale fraîche sans dominante jaune. |
| `volcan/sable` | `sable-grave-01`, `sable-grave-02` | Gravure | 9 | Plage noire et sable fin, falaise, trace de doigt, galet chaud, vapeur et coquille, grande zone de gravure nue. |
| `volcan/train` | `train-assemble-01` | Assemblage | 9 | Voie volcanique avec locomotive, deux wagons, tunnel, fumée légère et braise froide, silhouettes séparées. |
| `volcan/wagons` | `wagons-tri-01`, `wagons-tri-02` | Tri | 9 | Mine avec trois wagons distincts, rail, lampe, tas de charbon et étai, espaces de dépôt évidents. |

`volcan.forge` réutilise `contenu/assets/decors/forge.png` et reçoit uniquement ses 16 masques.

### Cité des histoires — 9 décors nouveaux

| Asset maître | Exercices consommateurs | Fonction | Masques | Prompt court |
|---|---|---|---:|---|
| `cite/banniere` | `banniere-phrase-01`, `banniere-phrase-02` | Phrase | 9 | Place de cité avec toit de tuiles, mât et deux bannières de tissus, lanterne, grande respiration centrale. |
| `cite/bibliotheque` | `bibliotheque-histoire-01`, `bibliotheque-histoire-02` | Récit | 9 | Bibliothèque chaleureuse avec parquet, deux étagères, pupitre, échelle, livre ouvert et lampe, aucun titre lisible. |
| `cite/cartes` | `cartes-paires-01`, `cartes-paires-02` | Memory mot/image et phrase | 9 | Salle de cartes avec tapis, colonne, lanterne, coussin et livres posés, table de jeu dégagée. |
| `cite/enseigne` | `enseigne-assemble-01` | Assemblage | 9 | Rue de cité avec façade, potence, enseigne vierge et lanterne, trois emplacements de lettres laissés à l'interface. |
| `cite/pellicule` | `pellicule-chrono-01`, `pellicule-chrono-02` | Chronologie | 9 | Salle de montage avec bande de film, perforations, trois images vides, bobine et loupe, sans image imprimée dans les cases. |
| `cite/ponts` | `ponts-chemin-01` | Chemin chronologique | 9 | Deux tours et ponts de livres au-dessus d'une place, deux livres posés, lanternes, parcours lisible. |
| `cite/rayonnages` | `rayonnages-tri-01` | Tri inférentiel | 9 | Salle de bibliothèque avec deux rayonnages distincts, livres à ranger, échelle et lampe, aucun mot sur les livres. |
| `cite/theatre-ombres` | `theatre-ombres-histoire-01` | Récit et choix d'ombres | 9 | Petit théâtre avec gradins, estrade, drap et silhouette d'ombre nette, rideau, bougie et lanterne sans texte. |
| `cite/vitrail` | `vitrail-chrono-01` | Chronologie | 9 | Nef claire avec rosace, trois losanges de vitrail, cierge et banc, plombs décoratifs séparés, espace de lecture libre. |

`cite.fresque-murale` réutilise `contenu/assets/decors/fresque-murale.png` et reçoit uniquement
ses 17 masques.

## Ordre d'intégration et garde-fous

1. Produire et valider la vague 1 sur tablette, en commençant par `ecole.png`/ses masques et les
   sept décors Clairière ; refaire la recette des 12 nœuds avant d'ouvrir la vague suivante.
2. Produire les 39 cartes et les cinq planches de la vague 2. Les crops doivent rester
   déterministes et ne jamais embarquer les libellés, consignes ou lettres.
3. Produire les vagues 3 et 4 par habillage, jamais par exercice : une image livrée doit avoir
   une liste explicite de consommateurs et conserver tous les identifiants de zones existants.
4. Pour chaque décor, contrôler ratio 3:2, calage fond/trait/masques au pixel, transparence des
   objets, absence de jaune dominant/peinture/3D, lisibilité à distance de bras et zones tactiles
   non masquées.
5. Après intégration, seulement alors lever les verdicts `BLOQUÉ-ASSET`. Les six corrections de
   consigne identifiées comme `BLOQUÉ-AUDIO` restent séparées : elles nécessitent une régénération
   de clips et ne doivent pas être modifiées pendant cette production d'images.
