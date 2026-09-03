# Recette exhaustive — Marais jumeau, Volcan et Cité des histoires — 2026-09-02

## Méthode et limites

Les 38 exercices réellement servis ont été inventoriés dans `contenu/exercices/` (12 Marais,
12 Volcan, 14 Cité), puis croisés avec leur nœud, leur habillage et leur moteur. Les références
internes ont été contrôlées : 0 cible, option, paire, voisinage, parcours ou zone coloriable
orphelin. Les 26 SVG de ces trois régions possèdent bien les calques `fond`, `coloriable` et
`trait` (4,1 à 8,9 Ko), mais l'audit visuel global les mesure comme des blockouts polygonaux,
pas comme des illustrations finales : la présence du fichier et de ses calques ne constitue donc
pas une preuve de finition.

La consigne de chaque étape est comparée au préfixe SHA-256 de son clip `normal` dans
`production/voix.lock.json` : 0 divergence sur les 38 exercices. Une formulation signalée
`BLOQUÉ-AUDIO` n'a donc pas été modifiée en silence : le texte visible et le clip existant
restent cohérents jusqu'à une régénération validée.

La grille ci-dessous distingue les blocages de contenu visuel des blocages qui demanderaient de
changer une consigne parlée. Les cartes/vignettes sans asset sont laissées telles quelles : aucun
nouvel asset n'a été produit dans ce lot.

## Marais jumeau — 12/12

| Nœud | Exercice | Preuves C/A/G/V/R/S/Au | Verdict |
| --- | --- | --- | --- |
| 01 | `orage-eclair-01` | C courte et univoque ; A souffle/surlignage ; G 5 cibles et 5 leurres distincts, options mélangées par le moteur ; V décor `orage` livré ; R/S éclair ; Au empreinte c1–c5 concordante | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 02 | `poissons-attrape-01` | C sons puis mots nommés ; A souffle/cible ; G 8 cibles, 6 bonnes + 2 intrus, toutes atteignables et disjointes ; V positions clampées par le moteur ; R/S attrape ; Au c1–c4 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 03 | `grenouilles-tri-01` | C sons `pont`/`gant` explicites ; A souffle/cible ; G 10 mots et 2 feuilles, réponses atteignables ; V habillage livré ; R/S tri ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 04 | `nenuphars-chemin-01` | C trois parcours lisibles ; A souffle/cible ; G voisinage symétrique, 3 chemins atteignables ; V plateau 3×4 ; R/S chemin ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 05 | `coquillages-paires-01` | C annonce mot + image ; A souffle/surlignage ; G 6 paires disjointes ; V les 6 faces `image` ont `asset:null` et restent textuelles ; R/S paires ; Au concordant | BLOQUÉ-ASSET — fournir les images des cartes `image` dans `contenu/exercices/marais-jumeau/coquillages-paires-01.json` |
| 06 | `ponton-assemble-01` | C action et mot-cible implicite ; A souffle/surlignage ; G 4 mots, 8 blocs utiles distincts + 2 intrus ; V décor livré ; R/S assemble ; Au c1–c4 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 07 | `roseaux-phrase-01` | C ordre explicite ; A souffle/cible ; G 2 phrases, étiquettes et intrus résolus ; V texte lisible ; R/S phrase ; Au c1–c2 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 08 | `brume-colorie-01` | C 7 régions/couleurs sans ambiguïté ; A couleur/cible ; G 7 cibles distinctes ; V zones `caillou` à `ciel` présentes dans `brume.habillage.json` ; R/S colorie ; Au concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 09 | `orage-eclair-02` | C répétée mais adaptée à chaque mot lu ; A souffle/surlignage ; G 5 réponses et 5 leurres distincts ; V décor livré ; R/S éclair ; Au concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 10 | `poissons-attrape-02` | C son puis mots nommés ; A souffle/cible ; G 8 cibles, bonnes et intrus distincts ; V positions clampées par le moteur ; R/S attrape ; Au c1–c4 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 11 | `grenouilles-tri-02` | C sons `trou`/`noir` explicites ; A souffle/surlignage ; G 10 mots et 2 feuilles ; V habillage livré ; R/S tri ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 12 | `nenuphars-chemin-02` | C contraste `main`/`pont` net ; A souffle/surlignage ; G voisinage symétrique, parcours disjoints ; V plateau 3×4 ; R/S chemin ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |

## Volcan — 12/12

| Nœud | Exercice | Preuves C/A/G/V/R/S/Au | Verdict |
| --- | --- | --- | --- |
| 01 | `etoiles-filantes-attrape-01` | C mots nommés, graphie `eau` lisible ; A souffle/surlignage ; G 8 bonnes + 4 intrus ; V décor livré, cibles atteignables ; R/S attrape ; Au c1–c4 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 02 | `wagons-tri-01` | C trois sons explicites ; A souffle/surlignage/cible ; G 14 mots répartis sur 3 wagons ; V zones et libellés livrés ; R/S tri ; Au c1–c7 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 03 | `sable-grave-01` | C action de gravure explicite ; A souffle/surlignage ; G clavier `eau/au/ot/o`, mots et intrus résolus ; V décor livré ; R/S grave ; Au c1–c6 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 04 | `geodes-paires-01` | C annonce mot + image ; A souffle/cible ; G 6 paires disjointes ; V faces `image` sans asset, libellé seulement ; R/S paires ; Au concordant | BLOQUÉ-ASSET — fournir les 6 images dans `contenu/exercices/volcan/geodes-paires-01.json` |
| 05 | `coulee-chemin-01` | C contraste `ill`/non-`ill` et `gn` ; A souffle/surlignage/cible ; G 3 parcours atteignables, voisinage symétrique ; V plateau livré ; R/S chemin ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 06 | `train-assemble-01` | C mots-cibles explicites ; A souffle/surlignage ; G blocs `eau` distincts et intrus `au/o` ; V décor livré ; R/S assemble ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 07 | `fresque-chrono-01` | C demande des « images » ; A souffle/cible ; G 3 ordres disjoints et atteignables ; V 10 vignettes `asset:null`, rendues comme phrases ; R/S chrono ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — reformuler « images » en « phrases » ou fournir les vignettes, puis régénérer c1–c3 |
| 08 | `forge-colorie-01` | C régions/couleurs nettes ; A couleur/cible ; G 7 cibles distinctes ; V zones du décor présentes ; R/S colorie ; Au c1–c8 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 09 | `etoiles-filantes-attrape-02` | C sons `chat`/`coq`/`photo` ; A souffle/cible ; G 12 bonnes + 2 intrus ; V décor livré ; R/S attrape ; Au c1–c6 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 10 | `wagons-tri-02` | C positif/négatif `fille` + `gn` ; A souffle/surlignage/cible ; G 14 mots sur 3 wagons ; V zones livrées ; R/S tri ; Au c1–c7 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 11 | `sable-grave-02` | C action explicite ; A souffle/surlignage ; G clavier `ill/il/ll/l`, 5 mots résolus ; V décor livré ; R/S grave ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 12 | `geodes-paires-02` | C annonce mot + image ; A souffle/cible ; G 8 paires disjointes ; V faces `image` sans asset ; R/S paires ; Au concordant | BLOQUÉ-ASSET — fournir les 8 images dans `contenu/exercices/volcan/geodes-paires-02.json` |

## Cité des histoires — 14/14

| Nœud | Exercice | Preuves C/A/G/V/R/S/Au | Verdict |
| --- | --- | --- | --- |
| 01 | `bibliotheque-histoire-01` | C 1 affirmation puis QCM courts ; A souffle/cible ; G réponses distinctes et dans les options ; V récit lisible ; R/S histoire ; Au c1–c6 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 02 | `cartes-paires-01` | C annonce mot + image ; A souffle/cible ; G 8 paires disjointes ; V faces `image` sans asset, libellé seulement ; R/S paires ; Au c1–c4 concordant | BLOQUÉ-ASSET — fournir les images des cartes dans `contenu/exercices/cite-des-histoires/cartes-paires-01.json` |
| 03 | `pellicule-chrono-01` | C demande des « images » ; A souffle/cible ; G 3 ordres de 3 vignettes ; V 9 vignettes `asset:null`, rendues comme phrases ; R/S chrono ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — reformuler « images » en « phrases » ou fournir les vignettes, puis régénérer c1–c3 |
| 04 | `banniere-phrase-01` | C ordre explicite ; A souffle/cible ; G 2 phrases et étiquettes distinctes ; V bannière livrée ; R/S phrase ; Au c1–c2 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 05 | `theatre-ombres-histoire-01` | C vrai/faux, QCM et choix d’ombre ; A souffle/cible ; G 5 questions, options et réponses résolues ; V décor théâtre porte l’ombre ; R/S histoire ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 06 | `vitrail-chrono-01` | C demande des « images » ; A souffle/cible ; G 3 ordres de 3 vignettes ; V 9 vignettes textuelles sans asset ; R/S chrono ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — reformuler « images » en « phrases » ou fournir les vignettes, puis régénérer c1–c3 |
| 07 | `ponts-chemin-01` | C demande des « images » ; A souffle/cible ; G 3 parcours chronologiques atteignables ; V 12 cases sont des phrases (`asset:null`) ; R/S chemin ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — dire « phrases » ou fournir des images, puis régénérer c1–c3 |
| 08 | `rayonnages-tri-01` | C catégories renard/hibou, inférence réelle ; A souffle/cible ; G 10 phrases réparties sur 2 rayons ; V décor livré ; R/S tri ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 09 | `enseigne-assemble-01` | C devinettes courtes menant à moulin/papier/école ; A souffle/surlignage ; G blocs distincts et intrus ; V enseigne livrée ; R/S assemble ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 10 | `fresque-murale-colorie-01` | C 8 régions/couleurs ; A couleur/cible ; G cibles distinctes ; V huit zones présentes dans `fresque-murale.habillage.json` ; R/S colorie ; Au c1–c8 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 11 | `bibliotheque-histoire-02` | C questions littérales/inférentielles ; A souffle/cible ; G 5 réponses résolues dans les options ; V récit lisible ; R/S histoire ; Au c1–c5 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |
| 12 | `cartes-paires-02` | C annonce mot + image alors que les cartes forment des débuts/fins de phrases (`rouge`, `orange`, etc.) ; A souffle/couleur ; G 8 paires disjointes ; V aucun asset image ; R/S paires ; Au concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — reformuler la consigne en appariement début/fin de phrase, puis régénérer c1–c4 |
| 13 | `pellicule-chrono-02` | C demande des « images » ; A souffle/cible ; G 3 ordres de 3 vignettes ; V 9 vignettes textuelles sans asset ; R/S chrono ; Au c1–c3 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer ; BLOQUÉ-AUDIO — même correction requise dans `pellicule-chrono-02.json` |
| 14 | `banniere-phrase-02` | C ordre explicite ; A souffle/cible ; G 2 phrases à sortie joyeuse ; V bannière livrée ; R/S phrase ; Au c1–c2 concordant | BLOQUÉ-ASSET — décor SVG polygonal de l’habillage, blockout à remplacer |

## Contrôles ciblés exécutés

```text
npx vitest run tests/unitaires/recette-marais-volcan-cite.test.ts
→ 3 tests passés

npx vitest run tests/unitaires/contenu-validation.test.ts tests/unitaires/noeuds-regions.test.ts
tests/unitaires/prerequis-noeuds.test.ts tests/unitaires/ordre-noeuds-servi.test.ts
tests/api/sortie-sur-disque.test.ts tests/unitaires/melange-des-reponses.test.ts
tests/unitaires/moteurs-atteignables.test.ts tests/unitaires/moteurs-reducteurs.test.ts
tests/unitaires/sortie-variete.test.ts tests/unitaires/couverture-audio.test.ts
→ 10 fichiers, 213 tests passés
```

Aucune compilation globale, aucun snapshot et aucun commit n'ont été lancés. Les blocages restent
explicitement documentés pour le lot audio/assets ; aucune divergence visible/parlée n'a été
introduite.
