# Contrat du socle d'activité — 9 octobre 2026

Décidé par le parent le 9 octobre : construire un **socle commun aux 14 moteurs**, puis migrer.
Origine : [bilan du 9 octobre](bilan-audit-2026-10-09.md), § 7. Ce document est le plan partagé.
Chaque migration ne reçoit en propre que la ligne de son moteur.

## 1. Constat mesuré

Diagnostic `bac-a-sable/socle/diagnostic.spec.ts` : 76 nœuds × 3 formats, avec les réglages de
lecture réels (Andika 27 px, interligne 2). Synthèse : `bac-a-sable/socle/SYNTHESE.md`. Il
s'exécute en **11 s**.

Aux formats tablette (§ 2), **55 nœuds sur 76** obligent à faire défiler la page, cachent une
commande hors de l'écran, ou défilent dans un cadre interne :

| moteur | nœuds touchés |
|---|---:|
| tri | 11 / 11 |
| chemin | 7 / 7 |
| paires | 7 / 8 |
| histoire | 6 / 6 |
| colorie | 6 / 6 |
| phrase | 6 / 6 |
| chrono | 5 / 5 |
| grave | 5 / 5 |
| attrape | 1 / 7 |
| place | 1 / 1 |

D'autres défauts s'ajoutent :
- **Gobi mesure 64 px partout**, quel que soit l'écran.
- **58 images de contenu sont sous 96 px** en tablette ; la plus petite descend à 54 px dans
  `place`, et `paires` en portrait est à 70 px.
- **Une même activité mélange jusqu'à 7 styles de texte**, deux polices et 4 à 7 tailles.
- Exemple : au coloriage (`clairiere-01`), le nuancier et l'aide de Gobi sont **sous l'écran** en
  paysage.

**Pourquoi les tests ne l'ont pas vu.** Presque toutes les gardes de défilement tournent à
1920×1200 CSS, le profil « Galaxy Tab S10 FE » de `playwright.config.ts` et de l'annexe T § 3.
Aucune ne tourne à 1280×720/800 ni à 800×1100 (inventaire `bac-a-sable/socle/inventaire-gardes.md`).
La consigne d'écoute et le stade de Gobi n'ont aucune garde générique.

## 2. Formats — un site qui marche partout, pas une appli tablette

**Décision du parent, 9 octobre** : « je ne veux pas que ça soit spécialisé dans la tablette pure ».
Le jeu doit marcher dans un navigateur de PC, sur la tablette (onglet du navigateur, avec son
bandeau) et, au mieux, sur téléphone. Le socle s'adapte donc à la **place disponible** (unités
`dvh`, `@container`), jamais à un nom d'appareil. La garde tourne sur une gamme de formats :

| format | viewport CSS | rôle |
|---|---|---|
| téléphone portrait | 390 × 844 | secondaire |
| tablette portrait, navigateur | 800 × 1100 | mesuré sur photo (`boucle-tests-rapide-2026-09-02.md`) |
| tablette paysage, navigateur | 1280 × 720 | estimé, à confirmer |
| PC portable | 1366 × 768 | courant |
| PC grand écran | 1920 × 1080 | courant |

Les « 1920×1200, DPR 2 » de l'annexe T § 3 sont très probablement les pixels **physiques** de la
tablette. La correction de ce document de référence est proposée au parent ; il ne sera pas modifié
sans son accord.

## 3. Règles mesurables (la garde générique)

**Décision du parent** (précisée le 9 octobre) : défilement « uniquement s'il y a besoin » ; priorité à la tablette et au PC, téléphone ensuite. Ce qui
compte : **tout tient, c'est lisible, l'enfant voit ce qu'il fait.** La règle porte donc sur
l'étape en cours, pas sur la page.

| # | règle | seuil |
|---|---|---|
| S1 | **Ce qu'il faut regarder et ce qu'il faut toucher pour l'étape en cours tiennent ensemble à l'écran** : consigne, scène utile, pièces ou choix, bouton d'action | rien de tout cela hors écran à l'ouverture de l'étape |
| S2 | Défilement de page **seulement s'il y a besoin** | **0 px** aux formats tablette et PC du § 2 ; toléré sur téléphone, avec une disposition adaptée (scène puis choix, empilés) |
| S3 | Cibles tactiles | ≥ 64 px (R16, inchangé) |
| S4 | Images de contenu | côté ≥ 96 px (proposé) |
| S5 | Gobi visible, lisible, **au stade du profil** | dessin ≥ 96 px (proposé), `data-stade-gobi` = stade du monde |
| S6 | Compagnon de la sortie affiché | `data-compagnon` = compagnon de la sortie |
| S7 | Consigne écoutable | un `[data-clip]` non nul |
| S8 | Aucun chevauchement entre éléments interactifs | 0 (zones SVG à colorier exclues) |
| S9 | Styles de texte | ≤ 3 par activité : lecture (réglage du profil), consigne, interface |

Les règles valent pour tous les formats du § 2. Sur téléphone, S1 se limite à la consigne, au
choix en cours et au bouton d'action.

La garde est `tests/qualite/socle-activite.spec.ts` (à créer). Elle reprend le diagnostic et
remplace les relevés par des assertions. Elle est **vue ROUGE sur l'existant avant toute
migration**, et chaque moteur migré la fait passer au vert pour ses nœuds.

## 4. Architecture du socle

Propriétaire : `client/src/activite/`, nouveau dossier, un seul écrivain.

- **`GabaritActivite`** : une grille à zones nommées (`bandeau`, `scene`, `reserve`, `guide`,
  `actions`) qui occupe exactement la hauteur utile (`100dvh`), sans défilement du document. En
  paysage, la scène est à gauche et la réserve, le guide et les actions à droite. En portrait,
  tout est empilé et la scène prend le reste.
- **Jetons de taille** (`activite/jetons.css`) : `--taille-tuile`, `--taille-carte`,
  `--taille-vignette`, `--taille-guide` (Gobi), et une échelle d'espacement. Ils sont calculés
  par `@container` sur la zone qui les contient, jamais par `@media` moteur par moteur.
- **Composants** : `Tuile` (mot, syllabe, lettre), `Carte` (image + texte), `Vignette` (image
  seule, côté ≥ `--taille-vignette`), `Emplacement` (case de dépôt), `Reserve`, `Guide` (Gobi
  ou compagnon, **seule** source d'image de Gobi et des compagnons, qui remplace les trois tables
  stade → image), `BarreActions`.
- **Interaction** : le glisser-poser de `moteurs/commun/glisser.tsx` devient celui du socle,
  avec le tap en double.
- **Texte** : trois styles seulement. Le style lecture applique les réglages du profil, comme
  aujourd'hui.

Les moteurs gardent leur logique (`partage/src/moteurs/`, inchangée) et leur composant. Ils
n'écrivent plus de mise en page : ils remplissent les zones avec les composants du socle.

## 5. Ordre de travail

1. **Garde rouge** : `socle-activite.spec.ts` sur l'existant, avec la liste des échecs au
   rapport.
2. **Socle** : gabarit, jetons et composants, puis **un premier moteur pilote, `colorie`** (le
   pire en paysage, avec scène et nuancier), migré par l'orchestrateur. Le parent juge le
   résultat sur captures avant de généraliser.
3. **Migrations** : les 13 autres moteurs, un par un, contre ce contrat. Elles se font par
   agents Sonnet, un moteur et ses fichiers par agent, sans compilation. L'orchestrateur compile,
   lance la garde et relit.
4. **Ménage** : à chaque moteur migré, son CSS spécifique et les tests de correctifs ponctuels
   devenus redondants sont **listés et proposés au retrait**, jamais supprimés en silence.
5. **Maths** : reconception sur le même socle, après les 14 moteurs.

## 6. Ce qui reste à décider

- Le viewport réel de la tablette en paysage (§ 2).
- La correction de l'annexe T § 3.
- Les seuils proposés S5, S6 et S10.

## 7. Procédure de migration d'un moteur — le plan partagé des agents

Moteur pilote migré : `colorie` (exemple à suivre : `client/src/moteurs/colorie/MoteurColorie.tsx`,
`colorie.css`). Chaque migration ne touche **que les fichiers de son moteur** :
`client/src/moteurs/<moteur>/*` et ses tests de composant `tests/composants/Moteur<Moteur>*.test.tsx`.

1. **La racine du moteur devient `DispositionMoteur`** (`client/src/activite/DispositionMoteur.tsx`)
   avec `moteur`, ses attributs `data-*` existants, et ses trois zones : `scene` (ce qu'on regarde
   et où l'on agit), `reserve` (ce qu'on prend : mots, pièces, couleurs, choix), `pied`
   (messages). Un moteur sans réserve n'en passe pas.
2. **Plus de mise en page dans le moteur** : retirer `data-plateau-defilant`, les `style={{…}}`
   de disposition (taille, flex, grid, overflow, marges) et toute chaîne CSS injectée par
   `<style>`. Un style dynamique (couleur d'une région, position calculée d'un élément) reste en
   ligne, rien d'autre.
3. **Le CSS propre du moteur va dans `client/src/moteurs/<moteur>/<moteur>.css`**, importé par le
   composant racine. On n'y écrit **aucun `@media`** et **aucun `!important`**. Pour s'adapter à
   la place, on utilise `@container scene (…)` et les unités `cqi`/`cqb`. Les tailles viennent
   des jetons du socle (`--socle-cible`, `--socle-image-min`, `--socle-espace`).
4. **Texte : deux styles seulement dans le moteur.**
   - Le texte à déchiffrer prend `font-family: var(--lecture-famille, var(--font-lecture))` et
     `font-size: var(--lecture-corps)`, sans animation.
   - Le texte d'interface prend `font-family: var(--font-interface)` et
     `font-size: var(--socle-texte-interface)`.
5. **Images de contenu : côté ≥ `--socle-image-min` (96 px).** Une vignette qui ne tient pas fait
   réduire la grille, pas l'image.
6. **`client/src/styles/moteurs.css` et `activites.css` n'appartiennent qu'à l'orchestrateur.**
   L'agent **liste** dans son rapport les sélecteurs de ces fichiers qui visent son moteur.
   L'orchestrateur les retire.
7. **Aucun test assoupli.** Si un test de composant échoue parce qu'il fige l'ancienne mise en
   page (une position, une `style` en ligne), l'agent le signale avec la ligne. Si le test lit
   une valeur de CSS, il le fait lire au nouveau fichier, sans changer l'exigence.
8. **Contrat de sortie** : `npx vitest run tests/composants/Moteur<Moteur>` passe, avec sa sortie
   citée. L'orchestrateur compile, lance `tests/qualite/socle-activite.spec.ts` pour ce moteur et
   relit.

## 8. État au 9 octobre — migration faite

Les **14 moteurs** sont sur `DispositionMoteur`, chacun avec son `client/src/moteurs/<moteur>/<moteur>.css`.
`client/src/styles/moteurs.css` n'est plus importé : sur ses 31 classes, 3 étaient mortes,
22 dupliquées dans les CSS des moteurs, et 6 surchargeaient la coque moteur par moteur. Le
fichier est supprimé (constaté le 30 oct.). Les règles
« TRANSITOIRE » de `activites.css` sont retirées.

**Garde `tests/qualite/socle-activite.spec.ts` : 68 cas verts sur 70**, en 34 s pour 76 nœuds × 5 formats.
Au départ, 0 sur 70.

| Indicateur | Avant | Après |
|---|---:|---:|
| Nœuds qui font défiler ou cachent une commande (tablette, formats réels) | 55 / 76 | 1 |
| Gobi pendant un exercice | 64 px, toujours œuf | 96–150 px, au stade du profil |
| `@media` et `!important` dans les fichiers des moteurs | nombreux | 0 |

Ce qui a été réglé une fois pour tous les moteurs : coque en grille (Gobi sur le côté en
paysage, dessous en portrait), taille du texte des commandes de la coque, défilement réservé aux
petits écrans, hauteur de scène « contenu » sur petit écran (`hauteurPetitEcran`), une seule source
pour l'image de Gobi selon son stade.

Méthode retenue pour les plateaux denses (paires, chemin, tri) : **mesurer après rendu** et changer
de disposition tant que rien ne tient. On n'estime pas la taille du texte. Le corps et
l'interligne de lecture du profil ne sont jamais réduits.

**Écart restant** : `tri` / `cite-des-histoires-08` (12 phrases à ranger dans 2 livres) en tablette
portrait et sur téléphone. En portrait, les livres sortent de l'écran d'environ 60 px. C'est une
question de contenu : moins de phrases, ou deux étapes. **À arbitrer par le parent.**

**Dettes nommées** (état au 30 oct., détail dans [le nettoyage du 30 octobre](nettoyage-socle-2026-10-30.md)) :
- ~~`phrase/fentes.tsx` double `phrase/receptacles.tsx`~~ — **unifiés** le 30 oct. dans
  `moteurs/commun/fentes.tsx` + `fentes.css`, importés par phrase, tri, assemble et chrono.
  Les deux anciens fichiers et `phrase/fentes.css` sont supprimés (accord du parent, 30 oct.).
- ~~`chrono` : glisser une vignette ne fait rien~~ — réglé le 9 oct. (§ 10).
- ~~`chemin` : `composerGrilleAjusteeChemin` n'est plus appelé~~ — retiré le 30 oct., avec
  `composerGrilleCompacteChemin` qu'il était seul à appeler (grille estimée remplacée par
  l'ajustement mesuré).

## 9. État au 9 octobre, fin de journée — 7 formats, règle S10

Deux ajouts à la garde, après l'échec des vrais parcours tactiles :
- **Formats** : 1100×700 (la tablette tournée dans le navigateur, mesurée en septembre) et
  640×360 (le téléphone couché). Les parcours tactiles tournent l'écran en cours de partie.
- **S10** : le centre de chaque commande reçoit le doigt (`elementFromPoint`). Elle a trouvé des
  mots de `phrase` sous l'en-tête, un décor d'`histoire` sur le bouton du récit et des blocs
  d'`assemble` sous leur bande. S8 (chevauchement entre commandes) ne pouvait pas les voir.

Corrections communes à tous les moteurs :
- Gobi en paysage : dessin et bouton côte à côte, bulle dessous ;
- la réserve occupe toute la hauteur à droite, le pied passe sous la scène ;
- centrage « safe » de la réserve ;
- option `disposition="empilee"` pour une réserve en ligne (phrase) ;
- styles de l'encadré de Gobi sortis du code vers le CSS.

**Garde : 91 cas verts sur 98** (14 moteurs × 7 formats), 57 s. 3 073 tests de logique verts.

Écarts restants, tous mesurés :

| Nœud | Moteur | Formats | Nature |
|---|---|---|---|
| `cite-des-histoires-08` | tri | 800×1100, 1280×720, 1100×700 | 12 phrases à ranger dans 2 livres : trop dense au corps 27 / interligne 2 |
| `volcan-02` | tri | 1100×700 | wagons cachés |
| `cite-des-histoires-07` | chemin | 390×844 | cases recouvertes (8 longues phrases) |
| `volcan-12` | paires | 800×1100 | images à 95 px au lieu de 96 (arrondi d'une colonne) |
| `clairiere-02` | eclair | 640×360 | une option touche « Montre-moi le mot » |

**Question au parent** : les nœuds les plus denses de la Cité des Histoires (`tri` 08,
`chemin` 07, `paires` 02) ne tiennent pas sur tablette au corps de lecture de l'enfant. On peut
soit **découper leur contenu** (moins de phrases, ou deux étapes), soit **autoriser le défilement
pour ces seuls nœuds** (« s'il y a besoin »).

Chrono : le glisser-déposer a désormais une cible de dépôt, la frise (`useCibleDeDepot`). Test de
composant vu rouge, puis vert.

## 10. Repère d'étape et gestes communs (T10, T11) — 9 octobre

Détail, mesures et preuves dans [socle-etape-et-gestes-2026-10-09.md](socle-etape-et-gestes-2026-10-09.md).

- **Repère d'étape** : `client/src/activite/RepereEtape.tsx` + `etape.css`. Le moteur le rend ;
  il s'affiche dans la barre de consigne d'`EcranNoeud`, sous la consigne, sur la ligne de la jauge
  (`.entete-suivi`). Un moteur n'écrit plus son propre « Étape n / N ».
- **Glisser** : une cible de dépôt se rend avec `CibleDeDepot`, DANS le `ZoneDeGlisser` du moteur ;
  les hooks lèvent une erreur hors de la zone. La dette « chrono : glisser une vignette ne fait
  rien » n'était qu'à moitié réglée (la cible existait mais hors du contexte) : réglée pour de bon,
  avec phrase et assemble, et prouvée au doigt (`tests/e2e/parcours-glisser-et-toucher.spec.ts`).

## 11. Ce qu'on demande, ce qu'on répond, la lecture colorée (T19, E08, E09) — 9 octobre

Détail, mesures et preuves dans [socle-questions-et-lecture-2026-10-09.md](socle-questions-et-lecture-2026-10-09.md).

- **Thèmes** : `client/src/activite/questions.css` + `Question.tsx`. Un moteur pose
  `data-theme-role="question"` (ou `CadreQuestion`, ou `ROLE_QUESTION`) sur ce qu'il demande et
  `ROLE_REPONSE` sur ce qu'on touche pour répondre ; il n'écrit plus ni fond, ni bord, ni police
  pour ces éléments. Une question n'a qu'une police et qu'une taille : celles de la lecture.
- **Signal de changement** : `useSignalChangement` (partagé par `RepereEtape` et `CadreQuestion`).
- **Lecture colorée** : tout texte en police de lecture passe par `ZoneDeLecture` (bloc) ou
  `TexteColore` (texte court) ; réglage éteint ⇒ DOM inchangé.
- **Garde** : `tests/qualite/socle-questions.spec.ts` (Q1, Q2, L1), à côté de la garde S1–S10.
- **Dérogation à la décision D** : `histoire` ne pose plus ses réponses sur le décor (E09).

## 12. Décisions du parent du 30 octobre — densité, défilement, en-tête, largeur des cartes

Posées sur proposition (comparaison avec les applis pour jeunes lecteurs et les WCAG 2.2,
critères 1.4.4, 1.4.10 et 1.4.12), validées par le parent : « je vais suivre les
recommandations, fais tout ce qu'il faut ».

1. **Densité : découper, le défilement n'est qu'un filet.** Un exercice qui ne tient pas au
   corps de lecture de l'enfant se découpe en étapes plus courtes plutôt que de tasser l'écran.
   Si, malgré le découpage, une étape ne tient pas, la page défile. **Un texte n'est jamais
   rogné** : rogner est pire que défiler. Cela tranche la question du § 9 (E70, E69, E64).
2. **En-tête du campement** : « revoir l'histoire » sort de la barre (trop de boutons sur
   petit téléphone : 5 × 64 px ne tiennent pas en 299 px utiles).
3. **Largeur des cartes de récit** : pas de largeur fixe en pixels. La règle « au moins 480 px
   en portrait » est remplacée par un critère de résultat : **aucun mot coupé, aucun texte
   rogné, des lignes d'au moins 15 caractères**. S1 (« tout tient ensemble ») prime.

Non retenu à ce stade : verrouiller l'orientation en paysage (proposé comme piste, pas comme
recommandation ; le téléphone en portrait fait partie des formats du § 2).

### 12.1 Ce qui en a été implanté (30 octobre)

Détail et mesures : [nettoyage du 30 octobre](nettoyage-socle-2026-10-30.md) § 6.

- **Découpage en vagues** — `client/src/moteurs/commun/vagues.ts` (`decouperEnVagues`,
  `vagueDeLEtape`) : des groupes de consignes **contiguës**, équilibrés en éléments ; la vague
  de l'étape en cours est toujours montrée. Cliquet par taille de cadre : une vague de plus tant
  que la disposition la plus serrée ne tient pas, au plus une consigne par vague.
  Branché sur **tri** (les cases gardent les mots des vagues passées) et **paires**.
- **Chemin : plateau réduit, puis filet.** Un chemin ne se coupe pas en vagues (les cases des
  autres parcours sont les leurres) : le plateau réduit montre le parcours de l'étape en cours
  et **toutes** ses voisines ; s'il ne tient toujours pas, la scène défile
  (`data-filet-defilement="oui"`) en colonnes d'au moins 15 caractères au corps de l'enfant.
  Un texte qui dépasse sa case compte désormais comme un défaut de la cascade.
- **Chrono** : colonnes, pile, pile haute, puis frise à côté, choisis par mesure, la carte
  prenant la largeur d'une ligne de 15 caractères ; en dernier recours, la scène défile.
- **Tri** : au plus 4 mots par rangée dans le semis du décor (`MOTS_PAR_RANGEE_MAX`) ; une
  rangée plus peuplée bascule en grille. Le débordement se juge sur la boîte réelle de chaque
  mot et de chaque panier, pas sur la hauteur de défilement.
- **Le filet est déclaré, jamais implicite.** Un moteur qui défile pose
  `data-filet-defilement="oui"` sur sa racine ; la garde S1 (`socle-activite.spec.ts`) admet
  alors une commande atteignable dans la course de ce défilement, sans débord latéral. S2
  (aucun défilement de **page** sur tablette et PC) reste entier, et un débordement non
  déclaré reste un écart. Changement de garde dû à cette décision, pas un assouplissement de
  confort.
- **Campement** : le bouton « Revoir l'histoire » est retiré de la barre ; l'histoire reste
  rejouable depuis la carte (« L'histoire de la Pierre »). Le contrat de finition v3 plaçait
  « rejouer l'ouverture (D35, point 3) » dans `EcranCampement` : la fonction demeure, son
  emplacement change.
- **Récit (chrono)** : la règle « ≥ 480 px » est retirée de `responsive-tous-ecrans.spec.ts`,
  remplacée par `defautsDesLignesDeRecit` (mot coupé en fin de ligne, mot hors de sa carte,
  ligne de moins de 15 caractères hormis la dernière).
- **Place** : réserve à côté ou dessous, **choisie par mesure** (celle qui dessine le décor le
  plus grand). Dessous, les jetons s'étalent sur une rangée.
- **Éclair, petit écran** : quand les options passent à la ligne, la zone prend leur hauteur
  et la page défile, au lieu de les faire défiler sous un bord qui les rognait.
