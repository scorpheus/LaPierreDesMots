# Retravail des tests après le socle d'activité — 9 octobre 2026

Mandat : remettre `npm run verifier` au vert après la migration des 14 moteurs sur le socle
([contrat](contrat-socle-activite.md)), puis ramener la campagne sous 5 minutes
([bilan § 2.3](bilan-audit-2026-10-09.md)). Décisions du parent du 9 octobre appliquées :
un test qui fige l'ancienne disposition est refait sur le besoin réel ; un test qui porte une
exigence du parent reste une exigence, et c'est le code qui est corrigé.

Catégories : **(a)** vraie régression du produit, code corrigé · **(b)** exigence du parent,
code corrigé · **(c)** le test figeait l'ancienne disposition, refait sur le besoin réel.

Sondes et journaux : `bac-a-sable/rework-tests/` (sondes `*-diagnostic.spec.ts` lancées avec
`playwright.diagnostic.config.ts`, journaux `*.log`, résumé d'échecs `erreurs-log.mjs`).

## 1. Point de départ mesuré

Relance des fichiers en échec de la dernière campagne, avant toute écriture :
**63 échecs** E2E (`e2e-cibles-0.log`) dont 53 sur `paires`, et **8 échecs** en qualité
(`qualite-0.log`). `parcours-variete`, `-mots-incomplets`, `-rehabilitation` et
`-campagne-gestes-75` repassaient déjà (grave, tri et réhabilitation corrigés avant ce lot).

## 2. Causes communes trouvées, et corrections du produit

| # | Cause mesurée | Correction | Fichiers |
|---|---|---|---|
| C1 | Le guide (Gobi) en colonne paysage débordait de sa rangée à 640 px de haut (bulle 413 px dans 188 px de large) : la page défilait de 29 à 45 px sur **tous** les moteurs à 1017×640 | Guide en grille : dessin, boutons, puis bulle dont la rangée rétrécit et défile en elle-même ; deux boutons se partagent la largeur | `client/src/activite/socle.css` |
| C2 | En portrait, la rangée du guide suivait la longueur du texte de Gobi : quand l'aide apparaissait, la scène perdait 108 px (`chemin` : « l'aide rétrécit le plateau ») | Hauteur du guide fixe en portrait (dessin ou deux boutons) ; la bulle défile | `socle.css` |
| C3 | Sur téléphone couché, Gobi en colonne partait vers le haut au défilement | Guide collant (`sticky`) sur téléphone couché | `socle.css` |
| C4 | Sur téléphone portrait, bulle de 83 px de large et 1 061 px de haut | Sous 600 px de large, dessin et boutons sur une ligne, bulle dessous | `socle.css` |
| C5 | `paires` : le choix des colonnes se faisait dans le rappel `ResizeObserver` sur des tailles transitoires (hystérésis : 4 colonnes au premier rendu, 6 après une rotation aller-retour), avant le chargement de la police, et sans remesurer au nœud suivant à nombre de cartes égal ; sur téléphone, boucle `ResizeObserver loop completed with undelivered notifications` | Mesure à l'image suivante (`requestAnimationFrame`), remesure au chargement des polices et à chaque nouveau jeu de cartes ; « tient » = ni débordement ni carte tronquée ; marges réelles mesurées ; sur petit écran, décision sur la largeur seule | `client/src/moteurs/paires/MoteurPaires.tsx` |
| C6 | `paires` sur PC 1366×768 : images à 152 px pour 168 exigés | Carte-image sans marge interne, marges de grille resserrées | `client/src/moteurs/paires/paires.css` |
| C7 | `chemin` : le panneau changeait de marge avec l'étage « serré », et sa hauteur entre dans la clé de l'étage → l'étage oscillait (3,6 px) | Le panneau ne dépend plus de l'étage | `client/src/moteurs/chemin/chemin.css` |
| C8 | `chemin` sur téléphone : la hauteur réclamée grandissait de 4 à 8 px par image sans fin (la grille s'étirait sur la zone qu'elle agrandissait), cases écrasées les unes sur les autres | Petit écran : colonnes choisies sur la largeur, grille à sa hauteur naturelle, scène « contenu » | `MoteurChemin.tsx`, `chemin.css` |
| C9 | `histoire` sur téléphone : la scène (55 svh fixes) débordait sur « Relire l'histoire » | Scène « contenu » sur petit écran | `MoteurHistoire.tsx` |
| C10 | `tri` en 1100×700 : wagons de `volcan-02` et `volcan-10` sous l'écran (37 px) ; décision prise une fois par cadre sans tenir compte du nœud | Grille serrée mesurée (cliquet par cadre et par jeu de mots), pied compact ; le jeu de mots entre dans la clé de mesure | `MoteurTri.tsx`, `tri.css` |
| C11 | `eclair` sur téléphone couché : les options en flux remontaient sous la barre « Montre-moi le mot » | Flux aligné `safe center`, défilement interne | `client/src/moteurs/eclair/eclair.css` |

Effet sur la garde `socle-activite.spec.ts` : **96 cas verts sur 98** (91 avant), dont
`tri / cite-des-histoires-08` désormais vert en tablette portrait et en 1280×720. Les deux
restants sont des nœuds en attente du parent (§ 4).

## 3. Tableau, test par test

Une ligne par test (fichier:ligne). « Avant » = relance du point de départ ; « après » = campagne
`verifier-1` puis relances ciblées sur une construction figée (§ 6).

| Test | Ce qu'il exige | Cat. | Avant → après | Ce qui a été fait |
|---|---|---|---|---|
| `tests/e2e/parcours-paires-cadrage.spec.ts:15` | Exigence du parent (lot du 6 septembre) : toutes les paires tiennent à 800×1100, 720×1017, 1100×700 et 1017×640, sans défilement, sans texte tronqué ; sélectionner, apparier et tourner l'écran ne déplacent rien | (b) | 23 rouges / 32 → 2 | Code : C1, C5. Test inchangé. Restent les 2 cas de `cite-des-histoires-02` (E64, § 5) |
| `tests/e2e/parcours-paires-defilement.spec.ts:68` | Sur téléphone, la dernière carte s'atteint au doigt et l'aide reste joignable après la dernière rangée | (a) | 16 / 40 → 0 | Code : C3 (guide collant couché), C4 (guide lisible en portrait étroit), C5 (boucle `ResizeObserver`). Test inchangé |
| `tests/e2e/parcours-paires-pc.spec.ts:12` | Exigence du parent (« ensemble trop petit », 9 septembre) : image ≥ 168 px en 1366×768 et ≥ 192 px en 912 de haut, cartes de largeur égale | (b) | 3 / 3 → 0 | Code : C6. Image mesurée : 152 → 171 px |
| `tests/e2e/parcours-paires-pc.spec.ts:24` (même cas) | « Plateau centré » : écrit comme centre du plateau = centre de la FENÊTRE, ce qui supposait Gobi sous le plateau | (c) | — | Refait : les cartes sont centrées, à 2 px près, horizontalement ET verticalement dans la scène du moteur (le besoin « plateau tassé en haut » est désormais vérifié aussi en vertical) |
| `tests/e2e/parcours-tactile-exhaustif.spec.ts:23` | Chaque nœud se termine par de vrais taps, avec rotation en cours de partie | (a) | 11 / 154 → 0 | Code : C5 (paires sur téléphone), C8 (chemin), C9 (histoire). Test inchangé |
| `tests/e2e/parcours-chemins-regles.spec.ts:12` | L'aide ne rétrécit pas le plateau ; panneau et cases séparés ; aucun débordement horizontal | (a) | 3 → 0 (6 en cours de route) | Code : C2, C7, C8, et les deux boutons du guide qui se partagent la largeur (débordement de 2 px vu en 844×340). Test inchangé |
| `tests/e2e/parcours-phrase-pc.spec.ts:6` | Retour parent du 9 septembre : la phrase ne recouvre pas Filou, l'aide est atteignable. Écrit comme « bas du moteur ≤ haut de Gobi » (Gobi sous la phrase) | (c) | 2 / 2 → 0 | Refait : aucun recouvrement entre les boîtes du moteur et du guide, quelle que soit leur position ; guide entier dans la fenêtre ; aide atteignable au doigt (inchangé) |
| `tests/e2e/parcours-refus-stables.spec.ts:115` | Un refus ne déplace rien (chemin et histoire, téléphone) | (a) | 2 / 22 → 0 | Code : C8 (géométrie de chemin qui ne se stabilisait jamais), C9. Test inchangé |
| `tests/e2e/parcours-tri-tactile.spec.ts:73` | Exigence du parent : en 1906×890, les paniers restent compacts (≤ 180 px) | (c) | 1 → 0 | Le test mesurait l'image qui suit le redimensionnement, où les panneaux gardent l'ancienne taille (285 px) ; après recomposition ils mesurent 73 px. Ajout d'une attente d'ÉTAT (`attendreGeometrieStable`) ; seuil de 180 px inchangé |
| `tests/e2e/parcours-variete.spec.ts:181/236/250`, `-mots-incomplets.spec.ts:25`, `-rehabilitation.spec.ts:190`, `-campagne-gestes-75.spec.ts:463`, `-audit-tout-le-site.spec.ts:187` (tri) | — | — | verts au départ ou dans `verifier-1` | Corrigés avant ce lot (grave, tri, réhabilitation) ; rien à faire |
| `tests/qualite/socle-activite.spec.ts:165` | Contrat du socle, S1 à S10, 14 moteurs × 7 formats | (a) | 8 / 98 → 2 | Code : C1, C5, C8, C10, C11. Restent `paires/cite-des-histoires-02` et `tri/cite-des-histoires-08` en 1100×700 (§ 5) |
| `tests/qualite/promesses-des-specs.spec.ts:381` | Q6 : « attrape » porte un mouvement de cibles | (c) | 1 → 0 | Le garde ne lisait que les `.ts`/`.tsx` du moteur ; le socle a déplacé `@keyframes pierre-derive-cible` dans `attrape.css` (contrat § 7.3). Il lit désormais aussi la feuille du moteur, sans changer l'exigence. Contrôle négatif : `@keyframes` renommé → rouge, « gestes manquants cibles mobiles » |
| `tests/qualite/mise-en-page-tablette.spec.ts:420` | R20 : le coffre tient sans défiler en 1920×1200 | question | 1 → 1 | Non corrigé : en conflit avec l'exigence « case ≥ 144 px » (§ 5, question 3) |
| `tests/visuel/*` (6 références) | Captures de référence | visa | 3 → 7 | Non mises à jour. Candidates dans `bac-a-sable/rework-tests/candidats-visuels/` (§ 4) |
| `qa:ancrages` — recette `M7a` (`scripts/qa/recettes.mjs`) | L'ancrage de la mutation « cibles d'attrape à 40 px » doit exister une fois | (c) | 1 ancrage perdu → 0 | Ré-ancrée sur `largeurBouton`/`hauteurBouton` (même défaut, même remplacement par 40). Verdict `SURVIT, e2e` conservé ; mesure isolée à refaire (§ 4) |

**Bilan** : 0 test retiré, 0 assertion assouplie, 0 `skip`. 4 tests refaits sur le besoin réel
(`paires-pc` pour le centrage, `phrase-pc`, `tri-tactile`, `promesses-des-specs`), 1 recette
ré-ancrée, et 11 corrections du produit (C1 à C11) qui ont fait repasser sans les toucher
`paires-cadrage`, `paires-defilement`, `paires-pc` (images), `tactile-exhaustif`,
`chemins-regles`, `refus-stables` et la garde du socle.

Outillage ajouté : `PIERRE_CLIENT_TEST` (harnais et `scripts/playwright.mjs`) — voir § 6.


## 4. Ce qui reste rouge, et pourquoi

**Contrat de sortie de la phase 1.** Dernière campagne `npm run verifier` : `verifier-p2-2`,
14 h 08, palier `verifier`, rotation 1. **Code de sortie 1.** Rapport copié dans
`bac-a-sable/rework-tests/RAPPORT-p2-2.md`. Lignes « Étape / Statut / Durée » :

| Étape | Statut | Durée |
|---|---|---|
| `qa:ancrages` | ✅ réussite | 366 ms |
| `ressources:verifier` | ✅ réussite | 424 ms |
| `qa:coherence` | ✅ réussite | 319 ms |
| `lint` | ✅ réussite | 19.7 s |
| `typescript` | ✅ réussite | 354 ms |
| `test` | ❌ échec (3 / 3 094) | 3 min 46 s |
| `test:contenu` | ✅ réussite | 807 ms |
| `construire:test` | ✅ réussite | 6.1 s |
| `test:e2e` | ❌ échec (1 / 463) | 5 min 14 s |
| `test:visuel` | ❌ échec (7 / 13) | 59.8 s |
| `construire` | ✅ réussite | 6.4 s |
| `test:qualite` | ❌ échec (2 / 295) | 4 min 40 s |
| `bundle` | ❌ non exécutée (enchaînée derrière la qualité rouge) | 0 ms |
| `test:rejeu` | ✅ réussite | 444 ms |
| `qa:controles` | ✅ réussite | 254 ms |

Ce qui reste, point par point :

1. **`test` : 3 dépassements de délai sous contention.** Il s'agit de propriétés fast-check de
   0,7 s quand elles tournent seules, coupées à 5 s (`STACK_TRACE_ERROR`), alors que la machine
   tournait à 97 % avec la suite d'un autre projet. Les 3 094 cas passent seuls (mesuré deux
   fois). La campagne donne désormais à Vitest un délai de garde de 30 s
   (`--testTimeout=30000`) ; aucune assertion n'est touchée. À confirmer sur machine calme.
2. **`test:e2e` : contrat de sortie QA** (`parcours-audit-tout-le-site.spec.ts:338`). Deux
   écrans ne sont atteints par aucun parcours (`chargement`, `mathematiques`), pour un seul
   toléré.
   - Ce défaut est **latent depuis le commit maths `9a378c1`**. Le projet `couverture` dépend de
     `parcours`, et Playwright ne le lançait pas tant qu'un seul parcours rougissait : ce sont
     les « 15 did not run » de toutes les campagnes précédentes.
   - L'orchestrateur a tranché : la recette « mathematiques » est ajoutée à `recettesDEcrans`
     (campement → Vallée des Nombres).
   - Les rouges qu'elle fera apparaître sont la **dette maths connue, rattachée à T06**. Leur
     nombre exact n'est pas encore mesuré : la campagne attend le feu vert CPU (§ 6.4).
3. **`test:e2e` en rotation 0 : `cite-des-histoires-02`.** Ce sont 2 cas de `paires-cadrage`,
   E64, en attente du parent. Le nœud ne sort que quand la rotation le tire, et il est toujours
   présent au palier `complet`.
4. **`test:visuel` : 7 références à viser par le parent, non mises à jour.** Les captures
   candidates sont dans `bac-a-sable/rework-tests/candidats-visuels/`, chacune avec sa capture
   obtenue, sa référence et sa différence.
   - `carte-voilee`, `carte-eclat`, `carte-monde-v2` : les 3 références de carte déjà en
     attente (entrées maths).
   - `decor-ecole-v2`, `noeud-gris`, `noeud-colorie` : l'écran d'exercice recomposé par le
     socle (Gobi en colonne, scène de 844×915 au lieu de 1566×635).
   - `recompense-etoiles` : l'écran de récompense en paysage, retour du parent pris en charge
     par l'orchestrateur.
   - Les nœuds `eclair`, s'ils ont une capture (signalés par l'orchestrateur).
5. **`test:qualite`** :
   - `socle — tri — tablette-paysage-navigateur` : `cite-des-histoires-08` (E70), 69 px de trop
     en 1100×700, en attente du parent. Il est désormais vert en 800×1100 et en 1280×720.
   - `paires / cite-des-histoires-02` (E64) en 1100×700, selon la rotation.
   - `« coffre » tient entièrement dans l'écran` : voir la question 3 ci-dessous.
6. **`bundle` : non exécutée.** L'étape est enchaînée par `&&` derrière la qualité rouge. Ce
   n'est pas un dépassement de budget.

**Instabilité observée.** `parcours-aucun-geste-mort` › chaudron a échoué une fois sur trois
passages, sous charge. Il est ensuite passé 3 fois sur 3 seul, et 2 fois sur 2 en fichier
entier. L'erreur n'a pas été capturée. À surveiller : la règle de décision du palier exige
0 cas instable.

## 5. Questions pour le parent

1. **E64 — `paires / cite-des-histoires-02`** (16 cartes, phrases longues). Le nœud ne tient
   pas en 720×1017, en 1017×640 ni en 1100×700, au corps 27 et à l'interligne 2. Le nouveau
   choix de disposition essaie toutes les grilles, serrées comprises, et aucune ne tient.
   Faut-il découper le contenu (deux étapes, moins de phrases), ou autoriser le défilement pour
   ce seul nœud ?
2. **E70 — `tri / cite-des-histoires-08`** (12 phrases, 2 livres). Grâce à la grille serrée,
   le nœud tient désormais en 800×1100 et en 1280×720, mais il manque encore 69 px en 1100×700.
   Même alternative qu'à la question 1.
3. **Le coffre en 1920×1200** (`mise-en-page-tablette.spec.ts:420`, R20). Le coffre défile
   désormais de 143 px, pour deux raisons : les cases des formes sont passées de 120 à 144 px
   (exigence « case ≥ 144 px »), et la collection maths s'est ajoutée.
   - À 144 px, les 25 formes prennent 3 rangées. Il en faudrait 13 par rangée pour revenir à
     2 rangées, ce qui est impossible en 1920 de large.
   - Trois mises en page ont été essayées et mesurées, aucune ne tient : collections sur
     3 colonnes (+172 px), maths sur une seule rangée (+114 px), maths à droite des formes
     (+351 px).
   - Le coffre défile de toute façon de 1 000 à 2 000 px en 1280×720 et en 800×1100.

   Faut-il traiter le coffre comme le campement (un lieu qu'on explore, où défiler est
   permis), ou retirer la collection maths du coffre jusqu'à la reconception ?
4. **Les 7 références visuelles** du § 4 : à regarder (planche dans
   `bac-a-sable/rework-tests/candidats-visuels/`), puis à viser ou à refuser.
5. **CSS hérité à arbitrer.** Le serrage de `paires` réduit l'interligne des cartes à 1,25
   (`.paires-cartes[data-serree='oui'] .paires-carte`). C'est antérieur à ce lot, mais contraire
   à la règle « l'interligne de lecture n'est jamais réduit » (contrat du socle § 8). Je ne
   l'ai pas touché.

## 6. Phase 2 — vers des tests en moins de 5 minutes

### 6.1 Ce qui a été fait (chantiers du bilan § 2.3)

| Chantier | Fait | Mesure |
|---|---|---|
| T2 échantillonnage | `noeudsBalayes()` : un nœud par moteur au palier `verifier`, en rotation (`PIERRE_ROTATION`, compteur `tests/rapports/rotation-verifier.json`), pour `audit-tout-le-site`, `aucun-geste-mort`, `tactile-exhaustif`, `a11y-tout-le-site` et `mise-en-page-tablette`. `noeudsDuMoteurBalayes(m, 2)` pour `paires-cadrage`, `paires-defilement`, `chemins-regles`, `attrape-accessibilite` et `mots-incomplets`. `echantillonDuPalier` : 2 scènes de `coloriages-reperes`. Tout reste exhaustif au palier `complet` | E2E : 951 → 463 cas ; qualité : 419 → 295 cas |
| T3 chemin critique | Lots de l'audit des réactions : tableau de bord 3 → 16, chaudron 1 → 6, visite parent 1 → 2. Au palier `verifier`, un lot par écran et par campagne, en rotation | Cas le plus long : 145 s → 46 s (lancé seul) |
| T4 réglages de lecture | Les 14 cas « tout texte suit le réglage » posent le corps par l'API du profil, au lieu de 10 à 20 taps. Le chemin de l'enfant reste prouvé par le contrôle positif de l'aperçu et par les 14 cas R20, qui tapent toujours | Gain non mesurable sous la charge du moment (158 s cumulés) |
| T5 Vitest | Couverture au seul palier `complet` ; nombre de travailleurs réglable (`PIERRE_TRAVAILLEURS_VITEST`) ; délai de garde de 30 s dans la campagne | Sans couverture : 106 s à 4 travailleurs, 73 s à 8 ; le fuzz de contenu passe de 50 à 10 s |
| T6 parallélisme | Ordonnanceur par dépendances dans `scripts/verifier.mjs`. Puis, sur consigne (machine partagée) : e2e, visuel et qualité **en séquence**, et 2 à 4 travailleurs au plus (`--travailleurs=N`, 4 par défaut) | — |
| T1 serveur par travailleur | **Non fait, à dessein.** Pendant l'E2E à 4 travailleurs, on mesure 175 à 258 sockets en TIME_WAIT, loin d'un épuisement. Chaque cas a de toute façon un contexte de navigateur neuf, donc un cache froid : un serveur par travailleur n'aurait pas réchauffé le cache | — |
| Isolation | `PIERRE_CLIENT_TEST` : la campagne sert sa propre construction figée (`tests/rapports/client-fige/`). Les lancements ciblés des autres écrivains reconstruisaient `client/dist-test/` pendant qu'elle tournait | 14 faux rouges mesurés dans `verifier-1` |
| Palier rapide | `scripts/verifier-rapide.mjs` (`npm run verifier:rapide`) | 9,2 s pour un moteur ; 42 à 49 s pour socle + logique |

**Conditions de l'orchestrateur (9 octobre), implantées sans campagne :**

- **Contrat vérifié par un test.** `tests/unitaires/palier-verifier.test.ts` (7 cas, vert ;
  contrôle négatif : retirer une suite de la liste « complet seulement » le fait rougir). Il
  exige, pour six rotations :
  - chaque moteur (14) et chaque écran des recettes est exercé ;
  - chaque balayage par écran (sorties et R16, a11y, R20) mesure la tablette portrait
    800×1100 ET le PC 1366×768 ;
  - la garde du socle (S1 à S10) n'est pas échantillonnée et tourne en 800×1100 et sur PC ;
  - l'échantillon est déterministe, sans `Math.random` ni `Date` ;
  - toute spec qui échantillonne est déclarée « complet seulement ».
- **Formats des balayages par écran** (`formatsDuBalayage`) :
  - au palier `verifier`, chaque écran passe à UN format, tablette et PC en alternance : même
    nombre de cas qu'avant, et chaque règle voit les deux formats à chaque campagne ;
  - au palier `complet`, chaque écran passe aux trois formats (banc historique 1920×1200,
    tablette, PC).

  Ces balayages ne tournaient jusqu'ici qu'en 1920×1200. **De nouveaux rouges sont donc
  probables, non encore mesurés**, en particulier R20 en 800×1100 sur le coffre et le
  campement : l'exemption du campement n'a été arbitrée qu'en 1920 de large.
- **En-tête de `RAPPORT.md`** : le palier, la rotation, la phrase « un vert ici n'est pas un
  vert `complet` », et la liste de ce que le palier ne couvre pas (`scripts/paliers.mjs`,
  `COMPLET_SEULEMENT`).
- **Rien ne sort des suites** : au palier `complet`, l'E2E compte 1 347 cas et la qualité 781
  (formats compris) ; au palier `verifier`, 467 et 297.

La garde `socle-activite.spec.ts` (76 nœuds × 7 formats, à chaque campagne) est ce qui permet
d'échantillonner les suites de mise en page par moteur. Elle garde la mise en page de CHAQUE
nœud (S1 à S10) ; les suites échantillonnées gardent, elles, les gestes. Aucun garde n'est
retiré : tout tourne au palier `complet`.

### 6.2 Campagnes mesurées

| Campagne | Configuration | Durée | Charge de la machine |
|---|---|---:|---|
| référence (bilan § 8) | 4 travailleurs, tout en série, exhaustif, couverture | 1 217,9 s | — |
| `verifier-1` (12 h 49) | idem, avant la phase 2 | 1 160,8 s | campagnes ciblées d'un autre écrivain en même temps |
| `verifier-p2-1` (13 h 52) | palier `verifier`, e2e 8 ‖ qualité 4 ‖ Vitest 8 | 333,6 s (5 min 50 s au mur) | non relevée ; environ 92 navigateurs |
| `verifier-p2-2` (14 h 08) | idem, avec les lots et T4 | 320,4 s (5 min 27 s au mur) | 97 % juste avant, suite d'un autre projet en cours |
| `verifier:rapide`, un moteur | 8 travailleurs (4 désormais) | 9,2 s | idem |

**Ces mesures ne valent rien pour la règle de décision** (« sous 300 s sur 3 campagnes
consécutives, avec 0 cas instable »). Toutes ont été prises sous contention, et avec
8 travailleurs que la machine partagée ne peut plus offrir. **La règle n'est donc pas
atteinte.** Les mesures sont à refaire sur machine calme, au plafond de 4 travailleurs, quand
l'orchestrateur donnera le feu vert.

### 6.3 Estimation au plafond de 4 travailleurs, en séquence

Elle est dérivée des mesures sans contention de `verifier-1` : 3,47 s par cas E2E et 2,03 s
par cas de qualité, à 4 travailleurs.

| Étape | Cas au palier `verifier` | Estimation |
|---|---:|---:|
| E2E | 467 (recette maths comprise) | ≈ 467 × 3,47 / 4 ≈ 405 s |
| visuel | 13 | ≈ 11 s |
| qualité | 297 | ≈ 297 × 2,03 / 4 ≈ 150 s |
| Vitest, lint, constructions | en parallèle du début de l'E2E | ≈ 0 s sur le chemin critique |
| **Total** | | **≈ 570 s, soit 9 à 10 min** |

Pour passer sous 5 min au plafond de 4 travailleurs, il faudrait ramener le travail cumulé
des navigateurs d'environ 2 200 s à environ 1 100 s. Trois pistes, toutes à décider :

- échantillonner aussi les suites encore exhaustives par moteur : `audit-moteurs` (29 cas),
  `refus-stables` (22), `glisser-et-toucher` (14), `repere-etape` (12) ;
- réserver au palier `complet` les campagnes monolithiques (`campagne-gestes-75` 61 à 105 s,
  `audit-75-noeuds` 43 à 69 s, `projets-mathematiques` 56 à 78 s, `vallee-lieux`). Elles
  rejouent tous les nœuds, et la garde du socle plus les balayages échantillonnés couvrent
  leur besoin ;
- découper le reste de l'audit des réactions (« sorties » et « R16 » des écrans hors nœud).

### 6.4 Consignes d'exécution (9 octobre, machine partagée)

- Playwright : 2 à 4 travailleurs au plus (`npm run verifier -- --travailleurs=N`, 4 par
  défaut ; le palier rapide en utilise 4).
- e2e, puis visuel, puis qualité : jamais en même temps.
- Aucune campagne lourde sans le feu vert de l'orchestrateur.
