# Feuille de route de debug — page par page

Ouvert le **2026-08-07**, après une session de jeu d'Ezékiel et du père. Ce document est le plan
de travail des sessions suivantes : **quelles pages existent, ce qui ne va pas sur chacune, dans
quel ordre s'y mettre.**

> **Comment l'utiliser en début de session.** Lire le § 1 (l'inventaire), puis le § 2 (le défaut
> qui commande tout), puis prendre **un seul** lot du § 5. Ne pas ouvrir deux lots qui touchent le
> même fichier. Chaque lot dit son fichier, sa mesure d'entrée et son contrat de sortie.
>
> **Les mesures de ce document périment.** Elles se relancent toutes d'un coup :
>
> ```bash
> node scripts/qa/mesures-feuille-de-route.mjs
> ```
>
> Lecture seule, base réelle ouverte en `readOnly` (R29). Un lot le relance **avant sa première
> écriture** et signale l'écart au lieu de recopier ce fichier.

Les retours bruts du père, avec leur verbatim, restent dans [retours-de-jeu.md](retours-de-jeu.md).
Ce document-ci ne les répète pas : il les range par page et par ordre de travail.

---

## § 0. Le chiffre de cette session

**Huit retours en une session de jeu. Sept sont confirmés par une mesure, un est une question à
laquelle la mesure répond. La QA n'en avait vu aucun.**

Et le premier d'entre eux, R31, n'est pas un défaut d'écran : **rien de ce que l'enfant gagne
n'est jamais enregistré nulle part.** C'est mesuré sur sa vraie base, pas déduit.

---

## § 1. L'inventaire des pages — 29 pages à revoir

Recensé sur les **objets**, pas sur les occurrences : les écrans viennent des littéraux
`data-ecran="…"` du client, les pages de jeu de l'union `CodeMoteur`. Commandes et sorties :

```
$ grep -rho 'data-ecran="[^"]*"' client/src --include=*.tsx | sort -u | wc -l
13
$ ls client/src/moteurs/ | grep -v '\.ts$' | wc -l
14
```

### 1.1 Les 13 écrans

| # | `data-ecran` | fichier | rôle | état du design |
|---|---|---|---|---|
| 1 | `chargement` | `routeur.tsx` | attente | à revoir |
| 2 | `profils` | `EcranProfils.tsx` | choix du joueur, porte parent | à revoir |
| 3 | `ouverture` | `EcranOuverture.tsx` | le récit de la Pierre, 5 panneaux | **R19 ouvert** (chronomètre) |
| 4 | `carte` | `EcranCarte.tsx` | la carte du monde, 6 régions | **R18, R23 ouverts** |
| 5 | `noeud` | `EcranNoeud.tsx` | l'hôte des 14 moteurs | **R35, R37 ouverts** |
| 6 | `recompense` | `EcranRecompense.tsx` | étoiles, cascade, suite | **R31 ouvert** |
| 7 | `campement` | `EcranCampement.tsx` | le hub, 30 points, Gobi, compagnons | **R31 ouvert** |
| 8 | `coffre` | `EcranCoffre.tsx` | 3 collections | **R31 ouvert** |
| 9 | `reglages-lecture` | `EcranReglagesLecture.tsx` | typographie par profil | **R35 ouvert** |
| 10 | `code-parent` | `EcranCodeParent.tsx` / `EcranDefinirCode.tsx` | la porte parent | à revoir |
| 11 | `choix-profil-parent` | `routeur.tsx` | quel enfant suivre | à revoir |
| 12 | `dashboard` | `EcranDashboard.tsx` | le suivi parent | à revoir |
| 13 | `galerie-parent` | `EcranGalerieParent.tsx` | catalogue des 76 exercices | à revoir |

### 1.2 Les 14 pages de jeu (un moteur = une page)

`assemble` · `attrape` · `chemin` · `chrono` · `colorie` · `eclair` · `grave` · `histoire` ·
`libre` · `paires` · `phrase` · `place` · `trace` · `tri`

Répartition du contenu livré, mesurée sur les 76 exercices :

```
tri 11 · paires 8 · attrape 7 · chemin 7 · colorie 6 · eclair 6 · histoire 6 · phrase 6
assemble 5 · chrono 5 · grave 5 · trace 2 · libre 1 · place 1
```

**Ce qui se voit d'emblée** : `tri`, `paires`, `attrape` et `chemin` portent **33 exercices sur 76**
— presque la moitié du jeu — et ce sont exactement les quatre moteurs que les retours de cette
session mettent en cause (R33, R34, R36).

### 1.3 Les 2 panneaux pleins

`FicheObjet.tsx` (partagé par 4 collections) et `FicheCase.tsx` (l'étagère de Gobi). Ils s'ouvrent
au tap d'une case et se referment à la croix — ce sont des pages à part entière pour la revue.

### 1.4 Ce qui manque pour la revue design — **R38**

Le père demande : « me donner des pages en mode parent juste pour faire des retours ». Aujourd'hui
la zone parent donne accès aux **exercices** (galerie, R30) mais à **aucun des 13 écrans**. Voir
le campement ou la carte demande de jouer.

Il existe déjà de quoi le faire sans rien inventer : `tests/e2e/qa-outils.ts` porte
`recettesDEcrans()`, qui **dérive du code** la liste des écrans et sait atteindre chacun **en
tapant comme l'enfant** (jamais par URL — l'historique était en mémoire jusqu'à R22).

**Tranché par le père le 2026-08-07 : une « Visite des écrans » dans la zone parent**, plutôt
qu'une planche de captures — une planche périme au premier commit et ne montre aucune interaction.

Et il l'a étendue de lui-même au-delà des 13 écrans : *« il faut qu'on trouve un moyen pour que
je voie chaque exercice et que je fasse des retours de design ».* La visite couvre donc **29 pages
+ les 76 exercices**.

Contrat du lot **V1** (§ 5) :

- elle lit `recettesDEcrans()` — écrire une seconde liste d'écrans à la main serait le doublon
  qui se met à mentir, exactement comme les deux listes de polices de R8 ;
- pour les exercices, elle emprunte le chemin de R30 (`surLancerExercice` + `LANCEMENT_PARENT`),
  donc **rien n'est journalisé** : une visite du père ne doit pas nourrir le BKT de l'enfant ;
- un bandeau « retour à la visite » sur chaque page, toujours atteignable — sinon la visite
  devient elle-même l'impasse que `parcours-audit-tout-le-site` traque ;
- **contrat de sortie** : le nombre de pages atteignables depuis la visite est égal à
  `recettesDEcrans().length` + le nombre d'exercices du catalogue. Un écran ajouté demain sans
  entrée dans la visite fait échouer la recette.

---

## § 2. R31 — LE DÉFAUT QUI COMMANDE TOUS LES AUTRES

> « si on finit un exercice, il y a écrit qu'on gagne une évolution mais en fait il n'y a rien du
> tout dans le campement. »

Il a raison, et c'est bien pire que ce que la phrase laisse entendre : **aucun acquis du jeu n'est
jamais enregistré.** Pas seulement l'objet du campement — la cascade entière.

### Mesuré sur sa vraie base, en lecture seule

```
$ node -e "…SELECT COUNT(*)…" donnees/pierre.db
profils                1
tentatives            23      ← il a bien joué 23 fois
formes_gobi            0
campement              0
compagnons             0
progression_cascade    0      ← 23 tentatives, zéro ligne de cascade
stade_gobi             1  →  {stade_code:"oeuf", rang:1}
```

### La chaîne, maillon par maillon — recensée par OBJET

| acquis | fonction qui l'écrit | appelée depuis le jeu ? |
|---|---|---|
| `progression_cascade` | `appliquerTentativeALaCascade` | **NON — aucun appelant** |
| `formes_gobi` | `enregistrerFormeGobi` | **NON — aucun appelant** |
| `campement` | `poserObjetCampement` | route OK, **aucun client ne l'appelle** |
| `compagnons` | — | **aucun écrivain nulle part** |
| `etagere_rang` | — | **aucun écrivain nulle part** |

```
$ grep -rln "appliquerTentativeALaCascade" serveur/src   → cascade.ts seulement (sa définition)
$ grep -n "cascade" serveur/src/routes/tentatives.ts     → aucune ligne
$ grep -rln "poserObjetCampement" client/src             → api/client.ts seulement
```

### Où l'annonce est fabriquée, et pourquoi elle est sincère

`client/src/etat/magasin.ts:345` appelle `appliquerEtoiles` **dans le client**, à la clôture du
nœud. Le gain est donc calculé, affiché, sonné — et jamais envoyé. Pire, l'état de départ :

```
magasin.ts:240   cascade: ETAT_CASCADE_VIDE     ← à chaque choix de profil
$ grep -n "cascade" client/src/api/client.ts     → aucune ligne
```

**La cascade est un compteur de session qui repart de zéro à chaque rechargement.** L'enfant doit
enchaîner 5 exercices sans jamais rafraîchir pour voir « Un cadeau spécial ! », et même là, rien
n'est posé nulle part.

### Conséquences en cascade, littéralement

1. `formes_gobi` reste vide → `stadeApresFormes` rend toujours `oeuf` → **Gobi ne peut pas évoluer**.
2. `EvolutionGobi` (R6) compare le stade avant / après : il ne se déclenchera **jamais**. Le lot R6
   a été écrit, testé, livré — et il est **inatteignable**.
3. Le coffre affiche trois collections qui resteront **vides à vie**.
4. Le campement ne reçoit aucun objet, et de toute façon les « objets du campement » s'affichent
   **dans le coffre** (R27) — ce qui explique la seconde moitié de la phrase du père.

### Pourquoi la QA ne l'a pas vu

`tests/e2e/parcours-cascade.spec.ts` vérifie **l'affichage** de la cascade. Le client la calcule
lui-même : le test passe au vert sans qu'une seule ligne n'atteigne la base. C'est le mode de
défaillance déjà nommé par CLAUDE.md — *« le champ déclaré, câblé jusqu'à la sortie, jamais
affecté »* — et cette fois il traverse **le client, le serveur et quatre tables**.

### Ce qu'il faut faire — lot **A1**, prioritaire sur tout

1. **Le serveur applique la cascade** dans la transaction de `POST /api/tentatives`, et la
   **rend** dans la réponse. `appliquerTentativeALaCascade` existe déjà et est juste ; il suffit
   de l'appeler.
2. **Le client cesse de calculer.** Il lit le gain rendu par le serveur. Une seule source de
   vérité — c'est la règle du dépôt, et elle est ici violée par construction.
3. **Le palier intermédiaire attribue vraiment une forme** (`enregistrerFormeGobi`) et le palier
   rare recolorie vraiment. `natureIntermediaire` / `natureRare` vivent déjà en données
   (`contenu/referentiel/parametres-recompenses.json`).
4. **Trancher `objet-campement`** : la nature est déclarée au schéma, traduite dans deux écrans
   (« un objet pour le campement »), et **aucun palier ne l'attribue**. Soit un palier l'utilise,
   soit on retire le nom — un énumérant sans émetteur est exactement ce que CLAUDE.md interdit de
   laisser vivre.
5. **Contrat de sortie du lot, non négociable** : après N exercices joués par le chemin de
   l'enfant, `SELECT COUNT(*) FROM progression_cascade` **> 0**, et `formes_gobi` > 0 dès le
   5ᵉ. Le test doit être **rouge avant la correction** — un banc qui naît vert n'a rien gardé.

---

## § 3. Les défauts de règle du jeu

### R32. `histoire` : la bonne réponse est TOUJOURS le premier bouton

R14 avait corrigé exactement ce défaut… sur `eclair` seulement. Mesuré sur les 76 exercices :

```
moteur      consignes à options   bonne réponse en 1re position
eclair               34                34   →  mais MÉLANGÉ au rendu (R14)
histoire             32                32   →  RENDU DANS L'ORDRE D'ÉCRITURE
```

```
$ grep -rn "melanger" partage/src/moteurs/*/moteur.ts
partage/src/moteurs/eclair/moteur.ts:196:  ordreOptions: entree.alea.melanger(etape.options),
(et rien d'autre)
$ grep -n "options" client/src/moteurs/histoire/MoteurHistoire.tsx
136:  {(question === null ? [] : question.options).map((id) => {
```

**32 consignes sur 32.** Un enfant qui tape toujours le premier bouton réussit `histoire` sans
lire une lettre, et le BKT engrange des réussites vides — la même dette silencieuse que R14.

**À faire — lot B1** : porter le mécanisme d'`eclair` (`ordreOptions` tiré une fois par `Alea` à
la création de l'état, donc reproductible à la graine près, donc le rejeu reste exact) sur
`histoire`. **Contrôle négatif obligatoire** : sans le mélange, le garde redevient rouge sur
100 % des cas — c'est ce contrôle-là qui a prouvé que R14 mesurait quelque chose.

### R33. Le jeu refuse une bonne réponse — 78 % des mots affichés sont morts au doigt

> « la sélection des mots dans la page les mots de couleur et autre qui n'est pas facile, on
> devrait juste pouvoir prendre n'importe quel mot et le mettre dans l'une des deux cases, sans
> ordre particulier, ça devrait juste fonctionner. »

**Le père avait parfaitement compris l'exercice.** J'avais d'abord posé la question comme s'il
avait pu se tromper sur la mécanique ; c'était moi qui n'avais pas ouvert le fichier. Le voici,
`contenu/exercices/clairiere/paniers-couleurs-01.json`, sortie citée :

```
réceptacles :  « les mots de couleur »  |  « les autres mots »
éléments    :  rouge bleu jaune vert rose violet orange  →  panier des couleurs
               pomme poire banane table nappe            →  panier des autres
```

Deux paniers, douze mots mélangés, il faut trier. C'est exactement ce qu'il a décrit.

**Ce que le code fait par-dessus, et que personne ne lui a dit.** L'exercice est découpé en
**quatre consignes** qui n'acceptent chacune que trois mots :

```
consigne 1  accepte  [rouge, bleu, jaune]
consigne 2  accepte  [pomme, poire, banane]
consigne 3  accepte  [vert, rose, table]
consigne 4  accepte  [violet, orange, nappe]
```

Or `MoteurTri.tsx:178` affiche `contenu.elements` **en entier** — les douze — sans jamais filtrer
sur `etape.restantes`. Et `validation.ts:66` refuse tout ce qui n'est pas dans le lot courant :

```
if (!etape.restantes.includes(element)) return REFUS('element-hors-consigne');
```

**Donc** : la consigne dit « range les mots de couleur dans le panier de gauche », l'enfant tape
**vert**, qui *est* un mot de couleur, et le pose dans le panier de gauche, qui *est* le bon —
et le jeu le refuse par une oscillation de 6 px, sans un mot. Ce n'est pas « un ordre imposé »,
c'est **le refus d'une bonne réponse**.

**Combien de mots sont morts au premier écran.** Mesuré sur les 11 exercices de `tri` :

```
exercice                  mots affichés   acceptés à l'étape 1   REFUSÉS
wagons-tri-01                    14               2                12
wagons-tri-02                    14               2                12
paniers-couleurs-01              12               3                 9
paniers-voyelles-01              12               3                 9
grottes-fv-01                    12               3                 9
rayonnages-tri-01                10               2                 8
souche-tri-01                    10               2                 8
souche-tri-02                    10               2                 8
grenouilles-tri-01               10               2                 8
grenouilles-tri-02               10               2                 8
grottes-bd-01                     8               4                 4
──────────────────────────────────────────────────────────────────────
TOTAL                           122              27                95

→ 77,9 % des mots affichés au premier écran sont refusés au doigt.
```

**Et le découpage ne porte aucune pédagogie.** Les 53 consignes de `tri`, classées :

```
« Range AUSSI les mots … »  (règle strictement identique à la précédente)   16
« Range ces mots » / « les derniers mots »  (aucun critère)                 13
portant un critère neuf                                                     24
──────────────────────────────────────────────────────────────────────────────
sans aucune règle nouvelle                                            29  (54,7 %)
```

`rayonnages-tri-01` dit littéralement : *« Range les mots du renard. »* puis *« Range **aussi**
les mots du renard. »* — deux consignes, une seule règle, coupées en lots de deux mots.

**Conclusion, et elle renverse ma recommandation de ce matin.** La « suite de consignes » de `tri`
n'est pas un découpage pédagogique : c'est un **lotissement**. Le vrai exercice est *un* tri, N
mots, 2 ou 3 paniers. Ne montrer que le lot courant (voie B) cacherait 78 % des mots pour préserver
une structure qui, dans 55 % des cas, ne dit rien.

→ **Voie A : `tri` accepte n'importe quel mot, à n'importe quel moment.** La consigne affichée
reste celle du critère (« les mots de couleur à gauche, les autres à droite ») ; les consignes de
lotissement disparaissent. C'est la demande du père, mot pour mot, et c'est aussi la lecture juste
du contenu.

**Ce que ça touche, et qu'il faut regarder en face** : `resume` est aujourd'hui agrégé *par étape*
(`resumeDepuisEtapes`), et le journal fait foi pour le BKT et le Leitner. Passer `tri` à une seule
étape change la forme de ses résumés — donc **le lot B3 se fait avec le rejeu sous les yeux**,
comme R15. Ce n'est pas une raison de ne pas le faire ; c'est une raison de ne pas le faire à la
va-vite.

**À vérifier avant d'écrire** : le même lotissement existe-t-il sur `paires`, `attrape` et
`chemin` — les trois autres gros moteurs ? Le recensement est celui du lot **C3**.

### R34. Le glisser au doigt — **oui, c'est possible, et c'est déjà fait ici**

> « voir pour le glissement d'un texte vers une zone si en web sur la tablette au doigt c'est
> possible ou pas ? »

**Réponse mesurée : oui.** `place` le fait déjà, et la recette complète est dans le dépôt :

```
client/src/moteurs/place/MoteurPlace.tsx:21   DndContext, PointerSensor (dnd-kit)
                                     :137     activationConstraint: { distance: 8 }
client/src/moteurs/place/Reserve.tsx:90       touchAction: 'none'
```

Les trois pièces sont indispensables et toutes présentes : **`touch-action: none`** (sans quoi le
navigateur fait défiler la page au lieu de glisser — c'est la cause n°1 des « ça ne marche pas au
doigt » en web), **`PointerSensor`** (un seul chemin pour souris, stylet et doigt), et **8 px
d'activation** pour qu'un tap reste un tap.

Recensement par objet des 14 moteurs, **commentaires exclus** :

```
geste de pointeur présent :  place (glisser-déposer) · colorie (peindre) · trace (tracer)
aucun geste de pointeur   :  assemble attrape chemin chrono eclair grave histoire libre
                             paires phrase tri            →  11 moteurs sur 14
```

**Un seul moteur sur quatorze fait réellement du glisser-déposer** : `place`, et c'est celui qui
porte **1 exercice sur 76**. `colorie` peint, `trace` trace — ce sont d'autres gestes.

> **Le premier passage de ce recensement comptait `tri` comme ayant un glisser. C'était faux, et
> la cause vaut d'être retenue** : `MoteurTri.tsx` porte en en-tête le récit de R16 — *« `grep`
> sur `onPointer`, `onTouch`, `onDrag`, `draggable`, `dnd-kit` ne rendait aucune ligne »* — et
> l'instrument trouvait les cinq motifs **dans la phrase qui dit qu'ils sont absents**. Un
> recensement qui lit ses propres notes ne mesure rien. Le script retire désormais les
> commentaires avant toute recherche.

`tri` a reçu une **affordance** au lot R16 (le mot saisi se soulève, la grotte se signale, la
consigne dit « touche un mot, puis touche l'endroit ») mais **toujours pas de glisser**.

**À faire — lot B2** : ajouter le glisser **en second chemin** sur `tri`, `assemble`, `phrase`,
`paires`. Le tap-puis-tap reste le chemin principal, comme dans `place` : *« un enfant qui ne
sait pas maintenir un doigt deux secondes doit pouvoir jouer »*. Deux gestes, une seule règle de
décision.

**Garde manquant, et il est plus important que le lot** : aucune recette n'exerce un vrai
glisser tactile. Un test Playwright avec `page.touchscreen` sur `place` — le moteur qui marche —
prouverait d'abord que l'instrument sait mesurer, avant de mesurer les autres.

---

## § 4. Les défauts de mise en page et de design

### R35. Les mots à déchiffrer ignorent les réglages de lecture

> « la mise en page pour chaque page, actuellement, le texte est trop petit »

Le père a réglé la typographie d'Ezékiel dans l'écran prévu pour ça. Relevé en base :

```
police=andika  corps_px=27  interlettrage=0,06em  espacement_mots=0,08em  interligne=2
```

Ces réglages ne sortent **que** par `ZoneDeLecture`, qui rend la **consigne** :

```
client/src/lecture/ZoneDeLecture.tsx:62   fontSize: 'var(--lecture-corps)'
```

Les **mots que l'enfant doit lire pour jouer** — les étiquettes de `tri`, les cases de `chemin`,
les options d'`eclair` et d'`histoire` — sont en dur. Recensé sur les 14 moteurs :

```
fontSize: '1.25rem'  (= 20 px)  →  assemble attrape chemin chrono eclair grave histoire
                                    libre paires phrase tri            = 11 moteurs sur 14
sans taille en dur              →  colorie place trace                 =  3
```

**27 px demandés, 20 px rendus, et sans l'interlettrage** — qui est, d'après les notes du dépôt
lui-même, *« le levier le plus prouvé »* (Zorzi 2012, cité dans `partage/src/lecture/types.ts`).
Le réglage de lecture ne touche pas le texte sur lequel porte la lecture.

**À faire — lot C1** : les prises de jeu qui portent du texte à déchiffrer héritent de
`--lecture-corps`, `--lecture-interlettrage`, `--lecture-espacement-mots` et de la police, comme
`ZoneDeLecture`. Un seul fichier de style, pas onze réglages en ligne.

**Contrat de sortie** : à corps 40 px (le maximum autorisé), aucun écran ne déborde et aucune
cible n'est coupée — le garde de R20 (`tests/qualite/mise-en-page-tablette.spec.ts`, 89 cas)
existe déjà et doit être **relancé à corps maximal**, pas seulement au corps par défaut. C'est
exactement le conflit R16-contre-R20 que R20 a documenté : agrandir le texte peut rendre des
cibles inatteignables, et c'est la règle des 64 px qui gagne.

### R36. « Marcher sur les mots » — le design existait, il n'a jamais été dessiné

> « certaines règles sont incomprises… comme marcher sur les mots, est-ce qu'il y avait un design
> graphique en tête ? »

**Oui.** Les specs le disent, § 5, ligne 216, citée à la lettre :

```
| `chemin` | Tracer une route en enchaînant les bonnes cases | Sauts de nénuphars · pas japonais · lianes |
```

Ce qui est rendu aujourd'hui (`client/src/moteurs/chemin/MoteurChemin.tsx:119`) :

```jsx
<div data-plateau="cases" style={{ display: 'flex', flexWrap: 'wrap' }}>
```

**Une rangée de boutons qui passe à la ligne.** Le pion, l'adjacence et le franchissement sont
tous les trois dans les données et dans le DOM — `data-pion`, `data-atteignable`, `data-franchie`
— et **aucun des trois n'a de rendu**. Il n'y a ni plateau, ni pion visible, ni trace du chemin
parcouru, ni indication de la case suivante possible.

Un enfant regarde une ligne de mots identiques et doit deviner :
- lequel est « là où je suis » ;
- lesquels sont « à un pas d'ici » ;
- lesquels sont déjà franchis.

**Ce n'est pas un défaut de compréhension de la règle. C'est une règle qui n'est dessinée nulle
part.** Même famille que R16 (« on n'arrive pas à déplacer ») : le dessin manquant a été pris
pour un défaut de l'enfant.

**À faire — lot C2** : un plateau. Les cases prennent une position dans l'habillage (comme
`place` le fait déjà avec ses centroïdes), le pion est un dessin, les cases atteignables se
signalent, les cases franchies gardent une trace d'encre. **C'est un lot de contenu autant que de
code** : il faut des positions dans les habillages de `chemin`, aujourd'hui absentes.

**Et il faut faire le tour des 14 moteurs de la même façon.** `chemin` est celui que le père a
nommé, ce n'est probablement pas le seul : `attrape`, `paires` et `assemble` sont eux aussi rendus
en `flex-wrap` de boutons. Voir lot C3.

### R37. Le décor est un fond gris à 14 %, pas une image qui accompagne

> « il devrait y avoir des images aussi pour accompagner, exemple avec les lucioles »

R9 avait été corrigé : `EcranNoeud` monte désormais `DecorDeFond` derrière les 12 moteurs qui
n'ont pas de scène propre. Mais ce qu'il monte est délibérément **invisible** :

```
client/src/habillages/DecorDeFond.tsx:77    const OPACITE_FOND = 0.14;
                                     :115   aria-hidden="true"
                                     :121   pointerEvents: 'none'
                              en-tête :31   « Il reste en GRISAILLE, toujours. »
```

L'opacité de 0,14 est **justifiée et juste** : elle a été choisie pour que l'audit de contraste du
texte passe. Ce n'est pas un bug.

**Mais elle répond à une autre question que celle du père.** Un fond d'ambiance à 14 % en
grisaille n'est pas *« une image qui accompagne »*. Quand l'exercice parle de lucioles, l'enfant
doit **voir une luciole**, à côté du mot, en couleur, à taille lisible — pas un lavis gris derrière
le texte.

**À trancher par le père**, parce que ça touche deux règles écrites :

| ce qui existe | ce que ça sert |
|---|---|
| le fond à 14 %, en grisaille, immobile | l'ambiance, et le contraste du texte |
| une **vignette d'illustration** en couleur, à côté de la consigne | dire de quoi on parle |

Les deux peuvent coexister : la vignette est **hors du champ de lecture**, donc « le décor
s'agite, le texte jamais » est respecté. Reste la seconde règle, plus délicate : *« la couleur
vient du code »* et le décor de l'exercice reste gris **pour ne pas voler son signal au
coloriage** (D51). Une vignette en couleur pendant que le fond reste gris demande un arbitrage
explicite. → Lot **C4**, à ouvrir seulement après réponse.

---

## § 5. L'ordre de travail

Chaque lot nomme **ses** fichiers. Deux lots de la même colonne ne se lancent pas ensemble.

| lot | quoi | fichiers possédés | dépend de |
|---|---|---|---|
| **A1** | La cascade est enregistrée et attribue vraiment (R31) | `serveur/src/routes/tentatives.ts`, `serveur/src/depots/tentatives.ts`, `client/src/etat/magasin.ts`, `client/src/api/client.ts` | rien — **à faire en premier** |
| **A2** | Le rejeu et le dashboard après A1 | `tests/rejeu/**`, journaux de référence | A1 |
| **B1** | Mélanger les options d'`histoire` (R32) | `partage/src/moteurs/histoire/{moteur,types}.ts`, `client/src/moteurs/histoire/MoteurHistoire.tsx` | rien |
| **B3** | `tri` accepte n'importe quel mot, voie A **tranchée** (R33) | `partage/src/moteurs/tri/*`, `client/src/moteurs/tri/MoteurTri.tsx`, `contenu/exercices/**/*tri*`, `paniers-*` | rejeu sous les yeux |
| **B2** | Le glisser en second chemin (R34) | `client/src/moteurs/{tri,assemble,phrase,paires}/*` | B3 |
| **C1** | Le texte de jeu hérite des réglages de lecture (R35) | `client/src/styles/global.css` + les 11 moteurs, **un seul écrivain à la fois** | rien |
| **C2** | Le plateau de `chemin` (R36) | `client/src/moteurs/chemin/*`, `contenu/habillages/**/chemin*` | rien |
| **C3** | Recensement : quels moteurs lotissent, lesquels sont une rangée de boutons ? | aucune écriture | rien |
| **C4** | Le design de l'illustration, **exercice par exercice** (R37) | à définir par exercice | **V1** |
| **V1** | La visite des écrans ET des 76 exercices, en mode parent (R38) | `client/src/parent/VisiteDesEcrans.tsx`, `EcranDashboard.tsx` | rien |

**Enchaînement arrêté avec le père le 2026-08-07 :**

1. **A1** — sans elle, rien de ce que l'enfant gagne n'existe ;
2. **V1** — c'est l'outil de tout le reste. Le père l'a dit : *« il faut qu'on trouve un moyen
   pour que je voie chaque exercice et que je fasse des retours de design. »* Tant qu'il n'existe
   pas, chaque question de design coûte une partie jouée jusqu'à l'écran concerné ;
3. **B1** et **C1** en parallèle — fichiers disjoints ;
4. **B3**, puis **B2** qui en dépend ;
5. **C2**, **C3**, puis **C4** exercice par exercice, une fois V1 en place.

**C4 n'est plus un arbitrage global.** Le père a refusé de trancher « vignette en couleur ou
pas » dans l'abstrait, et il a raison : *« il faut qu'on revoie le design en particulier dans une
tâche liée à cet exercice ».* La question de l'illustration se pose **par exercice**, devant
l'exercice — donc après V1.

---

## § 6. Ce que la QA doit apprendre de cette session

Trois recettes manquantes, formulées comme des **propriétés** et non comme des captures. Chacune
aurait attrapé un défaut de cette session le jour de sa livraison.

1. **Ce que l'écran annonce comme gagné existe en base.** Mesurable : après une partie jouée par
   le chemin de l'enfant, chaque `data-recompense` affiché a sa contrepartie dans la table qui la
   porte. → aurait attrapé **R31**, et probablement dès le lot L2-A.

2. **Aucune position de bonne réponse n'est privilégiée.** Mesurable, sur tout le contenu et pour
   **tous** les moteurs à options : la distribution des positions de la bonne réponse au rendu
   n'est pas concentrée sur un index. → aurait attrapé **R32**, que R14 avait laissé passer parce
   qu'il ne regardait qu'`eclair`.

3. **Tout geste que l'interface propose aboutit ou s'explique.** Mesurable : un élément affiché et
   tapable qui produit un refus muet est un défaut. → aurait attrapé **R33**, et R16 avant lui.

Et la discipline, qui n'est pas une recette : **les huit défauts de cette session ont été trouvés
en jouant, comme les six de la session du 3 août.** Le compte cumulé est maintenant de
**14 défauts trouvés par le père, 0 par la QA**. Une session de jeu réel doit précéder chaque
campagne, pas la suivre.
