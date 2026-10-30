# Bilan et nettoyage du socle — 30 octobre 2026

Demande du parent : « refais un petit bilan […] corrige tout […] vérifie, fais propre, fais du
nettoyage ». Sans consommer la machine : tests à 4–6 fils (`PIERRE_FILS`), 2–3 travailleurs.

## 1. Bilan mesuré avant toute écriture

| Mesure | Résultat |
|---|---|
| `tsc -b` | 0 erreur |
| `eslint .` | 0 erreur |
| Vitest (unitaires, composants, API) | **3 153 / 3 153** verts, 130 s à 4 fils |
| Dernière campagne complète (`tests/rapports/RAPPORT.md`, 12 oct. 07:23 UTC) | ROUGE : E2E 1/521, visuel 7/13, qualité 5/325, bundle non exécuté |

Depuis cette campagne, seuls `MoteurTri.tsx`, `tri.css` et `parcours-tri-eparpille.spec.ts` ont
changé (paniers en haut, T22). Rien n'est commité depuis `9a378c1` (27 sept.).

Lecture des échecs du 12 oct. :
- **E2E** — `parcours-aucun-geste-mort` « récompense » : « Voir la carte » pendant la
  sauvegarde ne changeait rien à l'écran (geste mort). **Corrigé** (§ 2.3).
- **Visuel 7/13** — carte, décor v2, coloriage : références à valider par le parent (T13,
  question 2). Non touchées : jamais de mise à jour de référence sans arbitrage.
- **Qualité 5/325** — défilement du campement, du coffre, de la visite parent, des maths au
  format PC : questions T13/T15 en attente du parent. `socle — tri — 1100×700` :
  `cite-des-histoires-08` (E70, densité, question au parent).
- **Bundle** — jamais exécuté (enchaîné derrière la qualité par `&&`) : verdict inconnu.

## 2. Corrections

### 2.1 La police du profil n'atteignait pas les moteurs

Les feuilles des moteurs écrivent `font-family: var(--lecture-famille, var(--font-lecture))`.
Seule `ZoneDeLecture` posait `--lecture-famille`, sur son propre élément ; la racine gardait la
valeur de `polices.css` (Andika). Un profil réglé sur OpenDyslexic ou Verdana voyait ses mots à
glisser, ses cases, ses étiquettes rester en Andika. `FournisseurReglagesDuProfil`
(`client/src/lecture/reglages-du-profil.tsx`) pose désormais `--lecture-famille` à la racine
avec les autres variables. Preuve : `tests/composants/reglages-du-profil-racine.test.tsx`,
rouge avant (`''`), vert après.

### 2.2 Un seul module de fentes (dette du § 8 du contrat du socle)

`phrase/receptacles.tsx` (styles en ligne) et `phrase/fentes.tsx` (styles en feuille) portaient
la même loi (R59 : une case vide est une promesse de place). Réunis dans
`client/src/moteurs/commun/fentes.tsx` + `fentes.css`, importés par phrase, tri, assemble et
chrono. La typographie de lecture est le défaut ; tri la repasse en interface dans `tri.css`.
Les trois copies des images-clés du vol (`fentes.css`, `assemble.css`, `chrono.css`) n'en font
plus qu'une. `FEUILLE_DU_VOL`, exportée et importée nulle part, disparaît avec l'ancien module.

**Orphelins supprimés** avec l'accord du parent (« tous les droits de suppression […] si c'est
plus utilisé ») : `phrase/receptacles.tsx`, `phrase/fentes.tsx`, `phrase/fentes.css`, copiés
d'abord dans `bac-a-sable/bilan-2026-10-30/supprimes/`. `client/src/styles/moteurs.css` était
déjà supprimé et indexé par une session antérieure (le § 8 du contrat le disait à tort présent).

### 2.3 « Voir la carte » pendant la sauvegarde

Le bouton reste une issue pendant l'accusé du serveur, mais n'affichait rien. Il passe
maintenant `aria-busy` et `data-attente="oui"`, et reste enfoncé (`recompenses.css`) jusqu'au
départ vers la carte. Preuve : `EcranRecompenseSauvegarde.test.tsx`, cas « pendant l'accusé »,
rouge avant, vert après.

### 2.4 Code mort de chemin

`composerGrilleAjusteeChemin` et `composerGrilleCompacteChemin` (grille ESTIMÉE) n'étaient plus
appelés depuis l'ajustement mesuré du 9 oct. Retirés avec leurs types et quatre constantes. Les
deux cas de `grilles-compactes-moteurs.test.ts` qui ne testaient que ce code mort sont retirés ;
le non-recouvrement des cases se juge sur le DOM (garde du socle, S8 et S10).

### 2.5 La mise en scène partagée déménage dans `commun/`

`eclair/mise-en-scene.ts` et `eclair/porteur-pose.tsx` (importés par eclair, attrape, chemin,
grave, histoire) sont dans `moteurs/commun/` (`git mv`). Leur en-tête expliquait pourquoi ils
n'y étaient pas ; l'obstacle (un garde qui exigeait un `Moteur*.tsx` par dossier) n'existe plus.

### 2.6 Code et styles morts

Balayage outillé (`bac-a-sable/bilan-2026-10-30/exports-morts.cjs`, `classes-mortes.cjs`) :
17 exports cités nulle part, 25 classes CSS citées nulle part. Après lecture un par un :

- **retirés** : `LigneSqliteWasm`, `creerVoixDeRepli`, `urlDePolice`, `texteColoreOuRien`,
  `styleZoneDeJeu`, `stopperVoix`, `latenceReconnaissanceMs` (doublon : la latence D18 est
  calculée pour tous les moteurs par `latenceDe`, `partage/src/moteurs/commun/etapes.ts`) ;
  classes `.entete-carte__surtitre`, `.vue-region__surtitre`, `.vue-region__attente`,
  `.cascade-recompense-detail` ;
- **gardés exprès** : le code maths (`manipulerChantier`, `transitionAutorisee`…, reconception
  en cours), `_ErreurHaptiqueJamaisLevee` (contrat documenté), `SoclePhonologique` (format des
  brouillons), `TOLERANCE_ATTRAPE_PX` / `TOLERANCE_TRI_PX` (déclaration de R16 ; le rendu tient
  la tolérance par la taille de cible, pas par ces constantes), `.anim-campement-*` (classes
  construites dynamiquement), `.compagnon-sprite--atlas` (atlas non validé, cité par un test).

### 2.7 Budget de bundle : 292 → 233,5 Ko gzip

Mesuré (`npm run construire -w @pierre/client`, puis `node scripts/verifier-bundle.mjs`) :
**292 Ko** de charge initiale pour 250 permis (v2 § 13.5). Attribution par carte de sources
(`bac-a-sable/bilan-2026-10-30/poids-bundle.cjs`) : les 14 moteurs arrivaient avec l'écran du
nœud, importé d'office par `client/src/routeur.tsx`, de même que l'écran du chaudron.

`EcranNoeud` passe par `lazyRouteComponent` (le routeur attend le module avant d'afficher la
route : pas d'écran de chargement, pas de nouvel état intermédiaire) et `EcranChaudron` par
`lazy`. Les deux sont préchargés dès le montage de `RacineRouteur` : l'enfant qui touche un
nœud trouve le module déjà là. Le service worker met en cache tous les fichiers de la
publication, morceaux différés compris : rien ne change hors ligne. Résultat : **233,5 Ko**.
Vérifié ensuite : composants Application/Navigation 33/33, parcours réhabilitation,
récompense, audit des moteurs et cartouches de la carte 44/44, chaudron 17/17.

## 3. Vérification navigateur (client de test figé, `tests/rapports/client-fige-rapide`)

| Suite | Résultat |
|---|---|
| Vitest complet (état final) | **3 153 / 3 153**, 285 fichiers ; `tsc` et lint verts |
| Garde du socle `socle-activite.spec.ts` (14 moteurs × 7 formats), seule, 3 travailleurs | **97 / 98** ; seul rouge : E70 `cite-des-histoires-08`, tri 1100×700 (densité, question au parent) |
| `parcours-tri-eparpille` + `parcours-glisser-et-toucher`, seuls, 2 travailleurs | **35 / 35** |
| `parcours-aucun-geste-mort` (Q5) | **93 / 93** — « récompense » : 0 geste mort (rouge le 12 oct.) |
| `parcours-recompense-*` + `parcours-rehabilitation` | **13 / 13** |

**Piège mesuré.** `verifier:rapide` lance la garde du socle et les specs touchées EN PARALLÈLE,
4 travailleurs chacune. Sous `PIERRE_FILS=6`, sur une machine occupée, la garde a pris 4,6 min
(57 s le 9 oct.) et 7 cas sont tombés en délai dépassé (entrée dans le nœud, tri ; glisser de
grave ; place au téléphone). Relancés seuls : tous verts. Un rouge du palier rapide sous charge
se relance isolé avant d'être cru.

## 4. Ce qui n'a pas été relancé

Pas de campagne complète (`npm run verifier`) : le parent a demandé de ménager la machine.
Visuel, qualité complète, bundle et rejeu restent au verdict du 12 oct. jusqu'à la prochaine
campagne, à lancer dans une fenêtre où la machine est libre.

## 5. Ce qui reste, et qui n'est pas à moi de trancher

- Visuel 7/13 et défilements T13/T15 : décisions du parent.
- E70 (`cite-des-histoires-08`), E69, E64 : densité de contenu.
- `NomDeRegion.tsx`, `VoileGrisaille.tsx` : composants testés mais montés nulle part
  (`questions-en-attente.md`), à garder ou retirer.
- Dette `responsive`, relancée seule le 30 oct. (2 travailleurs, client figé) : 48 verts,
  13 rouges, 11 non lancés. Les sondes histoire et phrase, relancées seules, passent (délais dus
  à la charge). Le reste se trie ainsi :
  - **en-tête du campement, petit téléphone** (179 px de haut pour 125 permis) — mesuré : cinq
    boutons d'au moins 64 px (cible tactile) ne tiennent pas dans 299 px utiles ; le cinquième,
    « revoir l'histoire » (`data-vers="ouverture"`), passe à la ligne. Aucune correction CSS ne
    le résout sans rétrécir une cible : déplacer ou retirer ce bouton est une décision du parent ;
  - **chrono, « phrase narrative tassée »** — la règle exige des cartes d'au moins 480 px en
    portrait ≤ 900 px, donc une seule colonne ; elle heurte la composition sur le décor (garde
    S1). Déjà noté « à trier avec le parent » ;
  - **chrono `cite-des-histoires-06` après rotation** (« texte de la prise tronqué ») —
    mesuré par sonde (1017×640, lecture agrandie au corps 27,
    `bac-a-sable/bilan-2026-10-30/sonde-chrono-rotation.json`) : les trois légendes font
    jusqu'à 5 lignes, soit 465 px de haut, dans une rangée `.chrono-vignettes` de 284 px. Elles
    débordent sur la frise, et `.chrono-scene` (`overflow: hidden`, bas à 577 px) rogne la
    dernière ligne de « Une grande flaque… » (617 px). Même famille que E70 : passer la scène en
    défilement interne contredirait le § 1 du contrat du socle, et S2 interdit le défilement
    de page sur tablette. C'est la même question au parent (découper le contenu ou autoriser le
    défilement pour ces nœuds denses). Rien modifié ;
  - **tri `cite-08`, chemin `cite-07`, paires `cite-02`** : densité (E70, E69, E64) ;
  - **photos tablette** (place, récit, tri en grande police) : non analysées.

  **Suite du même jour** : le parent a tranché (contrat du socle § 12) ; en-tête du campement,
  chrono (480 px et cite-06), densité tri/chemin/paires, photos place et récit, éclair au
  téléphone sont traités au § 6.

## 6. Les décisions du parent du 30 octobre, implantées (contrat du socle § 12)

Le parent : « je vais suivre les recommandations, fais tout ce qu'il faut ». Règles posées au
[contrat du socle § 12](contrat-socle-activite.md) ; ce qui suit est le détail mesuré. Les § 5
« question au parent » sur la densité (E70, E69, E64, chrono cite-06) sont tranchés par là.

### 6.1 Ce qui a changé, moteur par moteur

| Moteur | Changement | Mesure qui l'a décidé |
|---|---|---|
| socle | `commun/vagues.ts` : `decouperEnVagues`, `vagueDeLEtape`, `policesChargees` (5 tests unitaires) | — |
| tri | vagues de consignes contiguës (les cases gardent les mots des vagues passées) ; au plus 4 mots par rangée du semis (`MOTS_PAR_RANGEE_MAX`, 3 tests) ; débordement jugé sur la boîte réelle de chaque mot et panier (`grilleDeborde`) ; remesure à l'arrivée de la police | volcan-02 à 1017×640 : « queue », « musique » rognés de 2 px que `scrollHeight` ne voyait pas |
| paires | vagues ; déclencheur = critère S1/S10 (`cartesCachees` : tronquée, hors écran, rognée par un ancêtre à 0,5 px près, recouverte) ; débordement réel des deux côtés (`debordementReel`, la grille est centrée et `scrollHeight` ne voit que le bas) ; clé du cliquet lue dans le DOM (taille de scène + état des polices) ; confirmation à deux images pour les mesures déclenchées par un redimensionnement ; remesure au chargement d'une image | sans vagues, `parcours-paires-cadrage` 30/32 ; le premier critère (`tient`) découpait des plateaux visibles entiers ; après rotation, une image transitoire montrait les cartes 15 px hors scène |
| chemin | plateau réduit (parcours de l'étape + toutes ses voisines), puis filet déclaré `data-filet-defilement` en colonnes de 15 caractères ; un texte qui sort de sa case est un défaut de la cascade | cite-07 à 1100×700 : 8 cases réduites ne tiennent ni en 2, 3 ni 4 colonnes dans 400 px (corps 27, interligne 2) |
| chrono | colonnes → pile → pile haute → frise à côté, cartes à la largeur de 15 caractères ; filet déclaré si rien ne tient | cite-06 : 3 légendes de 5 lignes (465 px) dans 284 px |
| place | réserve à côté ou dessous, choisie par mesure (le décor le plus grand) ; dessous, jetons sur une rangée | école 922×615 : 414 px de large en portrait réserve à côté, 614 px dessous ; tablette paysage inchangée (603 px) |
| éclair | petit écran : en flux, la zone prend la hauteur des options, la page défile | 360×640 : « rouge », « gris » rognés dans `eclair-zone` |
| campement | « Revoir l'histoire » retiré de la barre ; reste sur la carte | 5 cibles de 64 px ne tenaient pas dans 299 px |

### 6.2 Changements de tests dus à la décision (pas des assouplissements de confort)

- `socle-activite.spec.ts`, S1 : une commande dans un **filet déclaré** (`data-filet-defilement="oui"`)
  est à l'écran si elle est dans la course du défilement de cette zone, sans débord latéral, la
  zone elle-même à l'écran. S2 (aucun défilement de page) est inchangé ; un débordement non
  déclaré reste un écart.
- `responsive-tous-ecrans.spec.ts` : la règle « carte de récit ≥ 480 px » est remplacée par
  `defautsDesLignesDeRecit` (mot coupé, mot hors carte, ligne < 15 caractères sauf la dernière).
- `parcours-paires-cadrage.spec.ts` : une vague = toutes les cartes, comme avant ; plusieurs =
  toutes celles de l'étape en cours, jamais une carte sans sa paire ; la géométrie se compare
  dans la même vague (toujours si une seule vague).
- `parcours-tri-eparpille.spec.ts` (« prendre un mot ») : prend un mot montré.
- Campement : `EcranCampement.test.tsx`, `modele-navigation.ts`, `qa-outils.ts` (l'ouverture
  se rejoue depuis la carte).

### 6.3 La disposition de `paires` — mesurée, résolue le 31 octobre

**Constat du 30 octobre.** Le choix de disposition de `paires` n'était pas déterministe, avec ou sans vagues (construction
sans vagues faite pour la comparaison, supprimée le 31 oct. une fois le défaut résolu). À scène
identique (682×612, cite-12 en 720×1017), l'entrée donne tantôt 4 colonnes (cartes de 163 à
165 px), tantôt 6 (107 px) : 2 entrées sur 5 sans vagues. Sous émulation mobile (densité 2),
cite-12 à 1017×640 sort tantôt une image de 113 px (cartes 116→572 dans un plateau 111→577),
tantôt 114 px (110→579, rognées de 1 à 2 px). Conséquences :
`parcours-paires-cadrage` « revenir au format initial » sur cite-12 720×1017 (1 échec sur 16
sans vagues, 4 sur 16 avec, même cause) et, par intermittence, le lot 1 responsive en tablette
paysage navigateur. Piste : la mesure faite pendant l'essai d'une disposition diffère de la mise
en page finale à un pixel près (arrondis à densité 2, rangées `minmax(min-content, 1fr)`) ;
rendre `choisirDisposition` déterministe (marge de sécurité d'un pixel sur la cote d'image, ou
choix sur des rangées de hauteur fixe) avant d'y rajouter quoi que ce soit.

**Cause mesurée le 31 octobre — la piste du pixel d'arrondi était fausse.** Les deux défauts
viennent d'une même chose : le dernier `ajuster` mesure une géométrie qui change **ensuite**,
sans que la scène (seule observée) change de taille. Personne ne remesure.

- **cite-12, 1017×640, densité 2** (lot 1 responsive). Journal d'`ajuster` posé dans un client
  d'essai : le dernier passage voit des cartes de 150 px, retient 6 colonnes, grille non serrée,
  image 114. Sur l'état final, la même grille donne des rangées 166/166/127,5 : deux phrases
  (« Le raisin est… », « La carotte est… », carte de 119 px) passent sur **4 lignes**
  (4 × 38,4 px + cadre ≈ 166) et la grille déborde de 2 px. Forcée en grille serrée sur le même
  état, elle tient (rangées 148,6 × 3). Retirer `block-size: 100%` des cartes (pourcentage
  cyclique supposé) n'a rien changé : 3 échecs sur 6, essai annulé.
- **cite-02, 1017×640, retour de rotation** (`parcours-paires-cadrage`, « revenir au format
  initial », 4 sur 4 rouges sur le client témoin, demi-pixel de décalage). Sonde : au retour,
  image 176 au lieu de 175. Sur l'état final, la grille (751 × 416), son écart (5,07 px) et le
  cadre de carte (6 px) redonnent 181,4 − 6 → **175** : le 176 a été choisi sur un état
  transitoire de la rotation. La rangée d'images gagne 1 px, la grille centrée glisse de 0,5 px.

**Correction** (`MoteurPaires.tsx`, effet de disposition) : les cartes sont observées
(`ResizeObserver`) et, à l'image suivante, le choix est refait. Une carte tronquée ou une grille
qui déborde se corrige toujours ; sinon **au plus deux corrections par taille de scène**
(compteur remis à zéro par chaque remesure de la scène, des polices ou des images), pour qu'aucun
choix ne puisse osciller — l'observation sans borne du 30 octobre retouchait la grille à chaque
image (« géométrie instable »). Un choix inchangé repose les mêmes valeurs : les cartes ne
bougent pas, l'observateur se tait.

| Mesure (client figé, 2 travailleurs, 4 fils) | Avant | Après |
|---|---|---|
| Lot 1 responsive, tablette paysage navigateur, `--repeat-each=6` | 3 à 5 rouges sur 6 | **6 / 6**, deux fois |
| `parcours-paires-cadrage` 1017×640, `--repeat-each=4` | 3 à 4 rouges sur 32 (cite-02) | **32 / 32** |
| `parcours-paires-cadrage` complet, `--repeat-each=3` | — | **96 / 96** |
| Autres parcours paires (défilement, PC, sans ordre) | — | **56 / 56** |
| Garde du socle (14 moteurs × 7 formats) | 98 / 98 | **98 / 98** |
| Responsive complet (bloc sériel des lots compris) | lot 1 rouge | **46 / 46** |
| `tsc`, lint ; Vitest (`tests/unitaires`) | verts | verts ; 2 001 / 2 002 sous charge, le rouge (contrôle d'encodage) vert relancé seul, avec les 16 tests de `MoteurPaires` |

Construction témoin sans la correction (`client-fige-sans-verif`) supprimée après mesure ; sondes et
sorties : `bac-a-sable/bilan-2026-10-30/sondes/` (`sonde-paires-choix`, `sonde-paires-lot1`,
`parcours-sonde-paires-retour`) et `sonde-retour.jsonl`, `dump-lot.jsonl`.

**Sondes** : toutes supprimées de `tests/qualite/` ; copies et sorties dans
`bac-a-sable/bilan-2026-10-30/` (`sondes/`, `sonde-*.json`).

### 6.4 Vérification finale (client figé final, 2 travailleurs, 4 fils)

| Suite | Résultat |
|---|---|
| `tsc`, lint | verts |
| Vitest complet | 3 155 / 3 168 sous charge ; les 13 rouges sont des délais dépassés (5 s, 10 s), **8 fichiers relancés seuls : 142 / 142** |
| Garde du socle (14 moteurs × 7 formats) | **98 / 98** |
| Parcours tri (décor, éparpillé, tactile) et paires (cadrage, défilement, PC, sans ordre) | **122 / 123** ; rouge : `marais-jumeau-05` 1100×700, « revenir au format initial » (même instabilité, § 6.3) |
| Responsive hors bloc sériel | 37 / 37 |
| Responsive, bloc sériel des lots | lot 1 tablette paysage navigateur rouge (paires cite-12, § 6.3) ; plus tôt dans la journée, avant les derniers réglages de paires, **12 / 12** ; le dernier passage du lot 2 est tombé en délai dépassé sous charge, non relancé |

## 7. Publication du 31 octobre — deux décisions du parent

La préparation de la publication (`publier-site.bat --preparer`, campagne `verifier`, rotation 4)
est tombée rouge sur des écarts que le travail du 9 au 31 octobre n'avait jamais montrés à une
campagne complète :

- **7 captures visuelles** différentes de leur référence (3 à 48 % de pixels) : la Vallée des
  Nombres sur la carte (`carte-voilee`, `carte-eclat`, `carte-monde-v2`), la mise en page du
  socle (`noeud-gris`, `noeud-colorie`, `decor-ecole-v2`), le stade de Gobi sur la récompense
  (`recompense-etoiles`). Planches avant/après : `bac-a-sable/bilan-2026-10-30/visuel/`.
  **Décision du parent : « Oui, mettre à jour ».** Les 7 références régénérées ; la 8e
  (`police-opendyslexic`), régénérée par `--maj` sans être en échec, remise à sa version.
- **Défilement de trois écrans de parcours** dès que le balayage par format (paliers du 9 oct.)
  les mesure ailleurs qu'en 1920 : campement 1 263 px (PC portable) et 1 055 px (tablette
  portrait), coffre 1 003 / 1 993 / 143 px, visite des écrans 391 / 156 px. **Décision du parent :
  « Accepter partout »** — `DEFILEMENT_TOLERE` de `mise-en-page-tablette.spec.ts`, tous formats
  pour ces trois écrans ; l'atteignabilité des commandes reste opposable partout.

Corrigés au passage, sans décision à prendre : `decor-v2` lisait les formes des régions avant le
chargement de leur calque SVG (0 trouvé une fois sur quatre) — il attend désormais les six chemins ;
`EcranMathematiques` coupait la voix une image trop tard (course vue sous charge au pre-commit) ;
deux bilans imprimés non assertés (tests trompeurs, plafond tenu à 93).

**Second passage de la préparation (rotation suivante).** Nouveau constat : l'accueil de la Vallée
des Nombres défilait de 223 px en PC portable (1366 × 768) — le bloc « Calculer avec Gobi »
(premier jet du calcul, 9 oct., jamais publié jusque-là) faisait 233 px empilés au-dessus des
lieux. Corrigé sans décision à prendre (R20 s'applique, ce n'est pas un écran de parcours) : en
paysage large (≥ 1100 px), le calcul passe en colonne à droite des lieux (`.maths-accueil`,
`styles-mathematiques.css`) ; ailleurs, l'empilement d'origine. Mesuré : page 768 px pour une
fenêtre de 768 ; R20 vert aux trois formats ; parcours maths 11/11, composants maths 84/84.
Les quatre rouges Vitest du même passage (`coloriage-chaudron-raster` 13,5 s pour 10 s,
`exploration-modele`) sont des délais sous la charge de la machine : verts relancés seuls, 2 fois.
