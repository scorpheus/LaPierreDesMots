# Recette exhaustive — Forêt muette et Galeries — 2026-09-02

## Méthode et limites de ce passage

Les 26 nœuds référencés dans `contenu/noeuds/` ont été croisés, un à un, avec leur exercice,
leur habillage, le moteur qui les sert et `contenu/audio/manifeste.json`. Les 103 textes audibles
(consignes, questions et récits) sont présents dans le manifeste et identiques, caractère pour
caractère, au texte visible : **0 écart**.

La vérification de choix ne se fonde pas sur la position des bonnes réponses dans le JSON :
`moteurHistoire` et `moteurEclair` passent bien les options à `Alea.melanger` lors de la création
de l'état. Les suites ciblées `contenu-validation` et `exercices-attribution-competence` passent
à 34/34. Elles ne remplacent pas une session enfant : la grille ci-dessous explicite donc les
constats de contenu qui devront être rejoués sur tablette après régénération des clips signalés.

Légende courte des preuves : **C** consigne, **A** aide, **G** gameplay/choix, **V** visuel,
**R/S** réaction/sortie, **Au** audio. Les aides déclarées sont au moins une stratégie concrète
(`souffle-syllabe`, `surligne-graphene`, `montre-cible` ou `montre-couleur`) ; `relire-consigne`
seul n'a jamais été retenu comme aide suffisante.

## Dette asset transversale — ajout après mesure des SVG

La mesure des habillages effectivement servis donne **54 SVG sur 55 sans courbe Bézier** : ce
sont des blockouts géométriques, pas des visuels propres. L'existence d'un fichier SVG, ni le
montage correct d'un moteur, ne solde cette dette. Tous les exercices ci-dessous, encore servis
par ces habillages, portent donc `BLOQUÉ-ASSET`, y compris ceux dont le contenu, le gameplay et
l'audio sont par ailleurs propres. Les blocages audio déjà relevés restent cumulatifs.

## Forêt muette — 12/12

| Nœud | Exercice | Preuves C/A/G/V/R/S/Au | Verdict |
| --- | --- | --- | --- |
| 01 | `feuilles-attrape-01` | C précise la lettre finale ; A surligne ou montre ; G cibles/intrus disjoints ; V feuilles textuelles assumées ; R/S moteur attrape ; Au 4/4 | BLOQUÉ-ASSET — habillage SVG blockout |
| 02 | `bestiaire-paires-01` | C annonce « mot et image », mais les 6 cartes sont toutes des mots (`face: mot`, `asset: null`) ; A/G/R/S cohérents ; Au 3/3 identique | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; réécrire la consigne ou produire les images et les clips |
| 03 | `souche-tri-01` | C « où tu entends la dernière lettre » est ambiguë (on entend un son, pas une lettre) ; A stratégie réelle ; G deux souches opposées ; V/R/S cohérents ; Au 5/5 identique | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; dire « dont la dernière lettre se prononce / ne se prononce pas » et refaire les 5 clips |
| 04 | `message-phrase-01` | C courte ; A souffle/montre ; G étiquettes ordonnées ; V texte de lecture ; R/S phrase ; Au 2/2 | BLOQUÉ-ASSET — habillage SVG blockout |
| 05 | `pas-japonais-chemin-01` | C distingue présence/absence de s ; A surligne/montre ; G voisinages déclarés ; V positions 3×4 ; R/S chemin ; Au 3/3 | BLOQUÉ-ASSET — habillage SVG blockout |
| 06 | `buee-grave-01` | C et clavier rendent l'action possible ; A souffle/surligne ; G 6 lettres à graver ; V bûche/lettres ; R/S grave ; Au 6/6 | BLOQUÉ-ASSET — habillage SVG blockout |
| 07 | `veillee-automne-histoire-01` | C questions courtes ; A souffle/montre ; G 1 vrai/faux puis QCM3 mélangés ; V récit consultable ; R/S histoire ; Au récit + 3/3 | BLOQUÉ-ASSET — habillage SVG blockout |
| 08 | `tapis-colorie-01` | C couleur et région sans ambiguïté ; A couleur/cible ; G 7 consignes ; V zones du tapis ; R/S colorie ; Au 7/7 | BLOQUÉ-ASSET — habillage SVG blockout |
| 09 | `feuilles-attrape-02` | C3 « Attrape les mots amis et feuilles » est une formulation maladroite, à remplacer par « Attrape “amis” et “feuilles”. » ; A/G/V/R/S cohérents ; Au 5/5 identique | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; le clip c3 doit être régénéré avec la phrase corrigée |
| 10 | `bestiaire-paires-02` | Même défaut structurel que 02 : la consigne promet une image alors que les cartes restent toutes textuelles ; A/G/R/S cohérents ; Au 3/3 | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; réécriture ou nouveaux assets et clips |
| 11 | `souche-tri-02` | C pluriel/s clair ; A souffle/surligne ; G paires singulier/pluriel non ambiguës ; V/R/S tri ; Au 5/5 | BLOQUÉ-ASSET — habillage SVG blockout |
| 12 | `message-phrase-02` | C courte ; A surligne ; G phrases à ordonner ; V lecture lisible ; R/S phrase ; Au 2/2 | BLOQUÉ-ASSET — habillage SVG blockout |

## Galeries — 14/14

| Nœud | Exercice | Preuves C/A/G/V/R/S/Au | Verdict |
| --- | --- | --- | --- |
| 01 | `miroir-bd-01` | C explique le rond ; A montre la cible ; G ductus b/d ; V tracés déclarés ; R/S trace ; Au 1/1 | BLOQUÉ-ASSET — habillage SVG blockout |
| 02 | `miroir-bp-01` | C explique barre haute/basse ; A montre la cible ; G ductus b/p ; V tracés déclarés ; R/S trace ; Au 1/1 | BLOQUÉ-ASSET — habillage SVG blockout |
| 03 | `cristal-bd-01` | C compatible avec l'éclair ; A souffle/surligne ; G QCM mélangé par Alea ; V cristaux ; R/S éclair ; Au 6/6 | BLOQUÉ-ASSET — habillage SVG blockout |
| 04 | `grottes-bd-01` | C1/C2 « Range dans la grotte… » est maladroit et la référence gauche/droite contredit les libellés audio des réceptacles (« première/deuxième ») ; A/G/V/R/S cohérents ; Au 2/2 + réceptacles identiques | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; reformuler les consignes et régénérer c1/c2, sans modifier les prises |
| 05 | `pierre-bd-01` | C action + clavier b/d ; A souffle/surligne ; G 6 graphèmes ; V pierre gravée ; R/S grave ; Au 6/6 | BLOQUÉ-ASSET — habillage SVG blockout |
| 06 | `pierre-bp-01` | C action + clavier b/p ; A souffle/surligne ; G 6 graphèmes ; V veine gravée ; R/S grave ; Au 6/6 | BLOQUÉ-ASSET — habillage SVG blockout |
| 07 | `stalagmites-assemble-01` | C et syllabes à ordonner cohérentes ; A souffle/surligne ; G blocs/intrus ; V stalagmites ; R/S assemble ; Au 5/5 | BLOQUÉ-ASSET — habillage SVG blockout |
| 08 | `passage-chemin-01` | C b/d précise ; A souffle/surligne ; G voisinages et confusions ; V pierres ; R/S chemin ; Au 4/4 | BLOQUÉ-ASSET — habillage SVG blockout |
| 09 | `frise-chrono-01` | C annonce des « images », mais les 10 vignettes sont uniquement du texte (`asset: null`) ; A/G/R/S chrono cohérents ; Au 4/4 | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; dire « phrases » ou fournir des images, puis régénérer les 4 clips |
| 10 | `echo-conte-histoire-01` | C/récit naturels ; A stratégie réelle ; G 1 vrai/faux puis 7 QCM3, options mélangées ; V récit consultable ; R/S histoire ; Au récit + 8/8 | BLOQUÉ-ASSET — habillage SVG blockout |
| 11 | `echos-paires-01` | C nomme les deux paires à relier ; A souffle/surligne ; G paires minimales ; V cartes-mots assumées (pas annoncées comme images) ; R/S paires ; Au 2/2 | BLOQUÉ-ASSET — habillage SVG blockout |
| 12 | `paroi-libre-01` | C explicite activité libre ; A « rien à réussir » ; G/V/R/S sans tentative ni récompense attendue ; Au 1/1 | BLOQUÉ-ASSET — habillage SVG blockout |
| 13 | `grottes-fv-01` | Même maladresse C que 04, sur c1 à c4 ; A souffle/surligne ; G f/v et paires de confusion ; V/R/S cohérents ; Au 4/4 + réceptacles identiques | BLOQUÉ-ASSET + BLOQUÉ-AUDIO — habillage SVG blockout ; reformuler les 4 consignes puis régénérer les clips |
| 14 | `cristal-fv-01` | C compatible avec l'éclair ; A souffle/surligne ; G QCM3 mélangé par Alea, leurres distincts ; V cristaux ; R/S éclair ; Au 6/6 | BLOQUÉ-ASSET — habillage SVG blockout |

## Corrections suspendues, sans divergence volontaire

Aucun JSON de contenu n'a été modifié dans ce passage. Les sept exercices `BLOQUÉ-AUDIO` ont une
voix existante qui répète exactement le texte actuellement visible. Les modifier sans rendre les
nouveaux `.opus` briserait R15 ; ils restent donc explicitement bloqués plutôt que « corrigés »
en silence. Les **26 exercices** restent en parallèle `BLOQUÉ-ASSET` jusqu'au remplacement de
leurs habillages SVG blockout : une recette de contenu ne les fera jamais passer visuellement.
Le prochain lot audio pourra appliquer les formulations indiquées puis relancer le contrôle
texte-manifeste ; un lot asset distinct devra refaire la recette visuelle sur tablette.
