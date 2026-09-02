# Plan de production des cinq coloriages illustrés — 2 septembre 2026

## Périmètre mesuré

Cet inventaire part des exercices livrés, et non des anciens SVG. Les cinq décors publiés dans
`contenu/assets/decors/` restent les références de style et de composition. Ils ne peuvent pas être
branchés tels quels : les cinq scènes cumulent **48 cibles demandées**, soit **45 régions visuelles
distinctes** après déduplication des trois régions rejouées à l’école.

### École — `clairiere.ecole`

Le même habillage sert deux exercices. Une nouvelle planche doit donc contenir les quinze régions
distinctes ci-dessous, même si chaque partie n’en emploie que neuf.

| Exercice | Consigne | Région(s) exacte(s) | Couleur |
|---|---|---|---|
| `clairiere-ecole-01` | Le pull de la maîtresse est bleu. | `pull-maitresse` | bleu |
| `clairiere-ecole-01` | Colorie les feuilles des arbres en vert. | `feuilles-arbre-1`, `feuilles-arbre-2`, `feuilles-arbre-3`, `feuilles-arbre-4` | vert |
| `clairiere-ecole-01` | Les garçons ont les cheveux bruns. | `cheveux-garcon-1`, `cheveux-garcon-2` | brun |
| `clairiere-ecole-01` | La porte de l’école est jaune et le toit est rouge. | `porte-ecole` ; `toit-ecole` | jaune ; rouge |
| `clairiere-ecole-03-mots-outils` | Le toit de l’école est rouge. | `toit-ecole` | rouge |
| `clairiere-ecole-03-mots-outils` | Colorie la porte en bleu. | `porte-ecole` | bleu |
| `clairiere-ecole-03-mots-outils` | Les fenêtres sont jaunes. | `fenetre-ecole-1`, `fenetre-ecole-2` | jaune |
| `clairiere-ecole-03-mots-outils` | Colorie le pull de la maîtresse en vert. | `pull-maitresse` | vert |
| `clairiere-ecole-03-mots-outils` | Le ballon est orange et le banc est brun. | `ballon` ; `banc` | orange ; brun |
| `clairiere-ecole-03-mots-outils` | Colorie les cheveux des filles en noir. | `cheveux-fille-1`, `cheveux-fille-2` | noir |

Contraintes d’image : une maîtresse dont le pull forme une zone fermée ; exactement quatre arbres
à houppiers séparés ; deux fenêtres ; un seul toit, une seule porte, un ballon et un banc ; quatre
enfants dont les quatre chevelures restent de grandes zones tactiles. Le décor canonique ne suffit
pas en l’état : son brief demandait la maîtresse, mais pas ces quatre enfants ni quatre arbres
indépendants.

### Tapis — `foret.tapis`

| Consigne | Région exacte | Couleur |
|---|---|---|
| Colorie le nid en brun. | `nid` | brun |
| Colorie le chat en noir. | `chat` | noir |
| Colorie le rat en violet. | `rat` | violet |
| Colorie l’arbre en vert. | `arbre` | vert |
| Colorie la feuille du haut en rouge. | `feuille-haute` | rouge |
| Colorie la feuille du bas en jaune. | `feuille-basse` | jaune |
| Le ciel du soir est orange. | `ciel` | orange |

Contraintes d’image : ajouter un nid, un chat et un rat clairement séparés, absents du brief
canonique ; désigner par la composition un arbre principal sans ambiguïté avec les trois troncs ;
placer deux grandes feuilles isolées à des hauteurs nettement différentes. Les objets doivent
rester naturels dans le chemin vers la cabane, pas posés comme une collection d’icônes.

### Brume — `marais.brume`

| Consigne | Région exacte | Couleur |
|---|---|---|
| Colorie le caillou en brun. | `caillou` | brun |
| Colorie la mouche en noir. | `mouche` | noir |
| Colorie la souris en rose. | `souris` | rose |
| Colorie la poule en jaune. | `poule` | jaune |
| Colorie la roue en rouge. | `roue` | rouge |
| Colorie la route en orange. | `route` | orange |
| Le ciel du jour est bleu. | `ciel` | bleu |

Contraintes d’image : conserver l’eau, le saule, la barque, le ponton, les nénuphars et les deux
nappes de brume du canonique, puis ajouter les cinq cibles absentes de son brief : mouche, souris,
poule, roue et route. La route peut devenir un chemin de berge ; la roue peut être adossée au
ponton ou à une petite charrette hors champ. La mouche doit être agrandie sans devenir monstrueuse
afin de conserver une cible tactile de 64 px minimum.

### Forge — `volcan.forge`

| Consigne | Région exacte | Couleur |
|---|---|---|
| Colorie le seau en bleu. | `seau` | bleu |
| Colorie le tableau en noir. | `tableau` | noir |
| Colorie le drapeau en rouge. | `drapeau` | rouge |
| Colorie le chapeau en brun. | `chapeau` | brun |
| Colorie le rideau en violet. | `rideau` | violet |
| Colorie l’oiseau en jaune. | `oiseau` | jaune |
| Colorie le mur en rose. | `mur-de-la-forge` | rose |
| Le feu est très chaud. | `feu` | orange |

Contraintes d’image : garder l’enclume, le billot, le marteau, le foyer sûr, le seau, le soufflet,
les pinces et les cristaux du canonique ; intégrer un tableau noir sans texte, un fanion, un
chapeau sur patère, un rideau d’entrée et un oiseau perché. Ces ajouts doivent raconter un atelier
habité plutôt qu’encombrer le premier plan.

### Fresque — `cite.fresque-murale`

| Consigne | Région exacte | Couleur |
|---|---|---|
| Colorie la fleur en rouge. | `fleur` | rouge |
| Colorie la feuille en vert. | `feuille` | vert |
| Colorie le soleil en jaune. | `soleil` | jaune |
| Colorie le pot en brun. | `pot` | brun |
| Colorie le mur en rose. | `mur` | rose |
| Colorie l’arbre en orange. | `arbre` | orange |
| Colorie la porte en violet. | `porte` | violet |
| Le ciel du matin est bleu. | `ciel` | bleu |

Contraintes d’image : les huit cibles doivent appartenir à une même lecture évidente de la
fresque, tout en restant huit zones disjointes. Le `mur` ciblé doit être visuellement distinct du
mur de pierre environnant. Le `pot` ciblé doit être un pot de plante unique ; les pots de peinture
du décor canonique restent hors masque et nettement différents afin que « le pot » n’offre pas
plusieurs réponses plausibles.

## Incohérences à arbitrer avant production

1. **Forge : couleur non dite.** « Le feu est très chaud » exige techniquement `orange`, mais le
   mot *orange* n’apparaît pas dans la consigne. Avec huit couleurs proposées, l’enfant ne peut pas
   déduire l’unique réponse attendue. Proposition : « Le feu est orange et très chaud. »
2. **École : genre déduit par les cheveux.** L’image doit faire distinguer « garçons » et
   « filles » uniquement pour colorier leurs cheveux. Une coiffure n’établit pas le genre et deux
   réponses visuelles peuvent devenir défendables. Proposition pédagogique : remplacer ces deux
   groupes par des positions ou des vêtements non ambigus, après validation parentale.
3. **École : commentaire factuellement faux.** `ecole-03-mots-outils.json` affirme que ses régions
   sont distinctes de celles de `ecole-01` ; `toit-ecole`, `porte-ecole` et `pull-maitresse` sont
   pourtant communs. Le rejeu entre deux parties reste valide, mais le commentaire doit être
   corrigé lors du prochain passage éditorial.
4. **Fresque : intention sur la graine surévaluée.** Le commentaire annonce un travail sur les
   besoins d’une graine, alors que quatre des huit actions portent sur `mur`, `arbre`, `porte` et
   `ciel`. L’exercice entraîne bien la correspondance mot/image et les couleurs, mais ne vérifie
   pas cette compréhension documentaire.
5. **Nuanciers d’habillage incomplets.** Les couleurs demandées mais absentes du nuancier déclaré
   sont : tapis — rouge, violet, orange ; brume — noir, rose, jaune, rouge, orange ; forge — bleu,
   violet, rose ; fresque — rouge, vert, bleu. Les nuanciers des exercices contiennent ces couleurs,
   mais les deux sources de vérité doivent être synchronisées avant activation. L’école est
   cohérente sur ce point.

## Chaîne de production proposée

1. **Arbitrer les quatre points éditoriaux** ci-dessus avant de figer les objets. Ne jamais changer
   un mot simplement pour l’adapter à une image déjà produite.
2. **Régénérer chaque planche depuis zéro** en 1536 × 1024, en utilisant son PNG canonique comme
   référence de style et de composition, pas comme base de retouche itérative. Cela évite les
   plaques de couleur déjà observées sur les reprises d’image.
3. **Imposer le contrat commun validé** : illustration jeunesse éditoriale française, aplats mats
   légèrement texturés, contours bleu nuit organiques, lumière fraîche, aucun filtre jaune, aucune
   peinture à l’huile, aucun texte, nombre ou filigrane. Chaque cible est fermée, non masquée,
   séparée de ses voisines et assez grande pour une prise tactile de 64 px.
4. **Valider une planche blanche annotée par scène** avant le rendu final : identifiant de chaque
   région, flèche vers l’objet, nombre d’occurrences exact. Cette planche reste dans
   `bac-a-sable/` et ne va pas dans le jeu.
5. **Faire valider au parent les cinq rendus couleur**, puis seulement produire les trois couches
   raster indexées `fond`, `trait`, `masque` selon
   `Docs/coloriage-raster-indexe-2026-09-02.md`. Une couleur RGB unique est attribuée à chacune des
   45 régions ; aucun pixel de masque parasite n’est admis.
6. **Contrôler mécaniquement** dimensions identiques, empreintes, fermeture des zones, présence de
   chaque couleur de masque, cible minimale, centroïde intérieur et reproduction déterministe.
   Contrôler visuellement à la résolution tablette que le gris initial reste lisible et que chaque
   bonne réponse recolore exactement l’objet nommé.
7. **Activer scène par scène**, avec SVG conservé comme repli portant exactement les mêmes
   identifiants. Synchroniser les nuanciers, le verrou d’assets et les tests avant de mettre à jour
   les références visuelles.

