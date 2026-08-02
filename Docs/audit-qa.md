# Audit de la QA par mutation — 2026-08-02

**Question posée :** la QA de ce projet trouve-t-elle les défauts, ou vérifie-t-elle seulement
ce qui est facile à vérifier ?

**Méthode :** on casse le code de production, un défaut à la fois, et on regarde si la suite
hurle. C'est la seule mesure honnête de la valeur d'une suite de tests — *une QA qu'on ne teste
pas est une QA qu'on croit sur parole.*

Aucun fichier de code, aucun test n'a été modifié durablement. Chaque mutation est appliquée,
mesurée, puis le fichier est remis à l'octet près. Preuve à la fin du document.

---

## En un coup d'œil

| | |
|---|---|
| **Mutations injectées** | **27** — les 15 demandées (la n° 7 dédoublée) + 11 conçues après coup |
| **Détectées par la suite exécutée** | **16** |
| **Survivantes** | **11** |
| **Dont mutants équivalents** (ne changent aucun comportement) | **1** |
| **Dont attrapées par un test E2E que je n'ai pas pu exécuter** | **7** |
| **Défauts qu'AUCUN test du dépôt ne verrait** | **3** |
| **Tests trompeurs trouvés** | **6** |
| **Zones aveugles par nature** | **6** |

> **Le chiffre de cette campagne : 3 défauts sur 26 traversent toute la QA sans un bruit.**
> Et le trou n'est pas là où l'histoire du projet le laissait attendre.

**Ce que cet audit a trouvé de plus important n'est pas un chiffre, c'est une asymétrie :**

```
$ pour chaque moteur de client/src/moteurs/, un tests/composants/Moteur*.test.tsx ?
  → 14 / 14

$ pour chaque écran de client/src/ecrans/, un tests/composants/Ecran*.test.tsx ?
  → 2 / 12   (EcranCampement, EcranOuverture)
```

**Les quatorze moteurs sont gardés au composant. Dix écrans sur douze ne le sont pas du tout.**
Les onze survivants sont, sans exception, du rendu client — écran, feuille de style, ou
guidage. Le cœur pédagogique (BKT, Leitner, carte, étoiles, journal, contenu) n'a laissé passer
**aucune** mutation.

---

## 1. Comment la mesure a été faite — et pourquoi elle a dû être refaite

### Le banc

```
$ npx vitest run --project unitaires --project composants --project api
  Test Files  96 passed (96)
  Tests       1478 passed (1478)
  Duration    ~8,5 s
```

Une suite à 8 secondes rend le test de mutation possible en série : 27 essais tiennent en cinq
minutes. C'est un atout du projet qu'il faut protéger.

Pour chaque mutation : lire le fichier → écrire la version fautive → lancer la suite → **remettre
le texte original**, dans un `finally`. Le banc refuse de démarrer si son ancrage n'est pas
unique dans le fichier (`ancrage M1.chemin : 2 occurrence(s), attendu 1` — c'est ainsi qu'on a
découvert que `d-panse` et `q-panse` portent le même chemin, même famille gestuelle, D33).

### La première mesure était fausse, et le contrôle négatif l'a dit

Le premier passage a rendu **23 détectées sur 23**. Résultat flatteur — donc suspect.

J'ai injecté cinq **mutations sémantiquement nulles** (un commentaire ajouté, une variable locale
renommée, un espace dans un `$commentaire`). Une suite saine doit rester **verte** dessus. Les
cinq ont échoué :

```
MN1  1 failed | 1561 passed
     tests/api/profils-vecus.test.ts > V2 — un profil qui a terminé tout le contenu livré
```

Une campagne parallèle écrivait ses tests dans `tests/` pendant mon banc. Sa base était rouge, et
**mon banc comptait sa rougeur comme ma détection**. Sans ce contrôle, ce document aurait publié
« 0 survivant » et le père aurait cru sa QA parfaite.

> **Un banc de mutation sans contrôle négatif ne mesure pas la QA, il mesure le bruit.**
> À reprendre dans tout audit futur : *si une modification qui ne change rien fait rougir la
> suite, la mesure est finie avant d'avoir commencé.*

### La mesure assainie

Le banc exclut désormais, **recalculé à chaque essai**, tout fichier de test non suivi par git
(`git ls-files --others --exclude-standard -- tests`) : ce sont exactement ceux qu'une autre
campagne est en train d'écrire. Base verte **avant et après** le banc complet :

```
BASE  VERTE   Tests 1478 passed (1478)     ← avant les 27 mutations
BASE  VERTE   Tests 1478 passed (1478)     ← après
MN1..MN5  SURVIT (5/5)                     ← les cinq contrôles négatifs passent
```

Les survivants ont ensuite été repassés sur les deux autres étages qui **ne demandent aucune
compilation** — `test:rejeu` charge `partage/src` par `tsx`, `test:contenu` est un script Node :

```
M12  test:rejeu=VERT  test:contenu=VERT
M20  test:rejeu=VERT  test:contenu=VERT
M17  test:rejeu=VERT  test:contenu=VERT
M2   test:rejeu=VERT  test:contenu=VERT
M24  test:rejeu=VERT  test:contenu=VERT
```

### La limite de cet audit, énoncée avant les résultats

**Je n'ai pas exécuté les E2E.** `playwright.config.ts` sert `node serveur/dist/index.js` : les
tests de parcours exigent un build, et (a) la compilation appartient à l'orchestrateur, jeton
unique, (b) une campagne écrivait le source pendant tout l'audit — bâtir aurait figé son travail
à moitié fait.

Pour les survivants, j'ai donc **lu et cité l'assertion E2E** qui les attraperait. C'est plus
faible qu'une exécution et c'est marqué comme tel dans le tableau : colonne *« sur pièce »*.
**Ces sept lignes sont la seule chose de ce document qu'un orchestrateur doive re-vérifier en
exécutant.**

---

## 2. Le tableau des 27 mutations

Colonne *détectée* : verdict de la suite réellement exécutée (unitaires + composants + api,
puis `test:rejeu` et `test:contenu` pour les survivants).

### Les 15 mutations demandées

| # | Défaut injecté | Fichier | Détectée | Par quel test | Temps |
|---|---|---|---|---|---|
| 1 | Le trait `d-panse` parcouru **à l'envers** (ré-injection du bug D47) | `contenu/modeles-lettres/minuscules.json` | **oui** | `ductus-referentiel.test.ts` · `trace-validation.test.ts` (4 cas) | 8,9 s |
| 2 | Le bouton « La carte » **retiré** de l'écran du nœud | `client/src/ecrans/EcranNoeud.tsx` | **NON** | — *(E2E sur pièce)* | 9,0 s |
| 3 | `journaliserEtapes` rend le bon compte et **n'insère rien** | `serveur/src/depots/etapes.ts` | **oui** | `api/pedagogie.test.ts` · `api/tentatives-nbelements.test.ts` (22 cas) | 9,0 s |
| 4 | `recalculerRecoloration` rend la région telle quelle — **donnée dérivée figée** | `partage/src/monde/carte.ts` | **oui** | `carte.test.ts` · `carte-recoloration.test.ts` · `api/monde.test.ts` (12 cas) | 9,9 s |
| 5 | `etoiles = excluded.etoiles` au lieu de `MAX` — **un acquis est repris** (R14) | `serveur/src/depots/progression.ts` | **oui** | `api/tentatives.test.ts` — « un acquis n'est jamais repris » (3 cas) | 10,8 s |
| 6 | `data-etat="echec"` émis sur un refus (R14) | `client/src/moteurs/attrape/MoteurAttrape.tsx` | **oui** | `MoteurAttrape.test.tsx` | 9,0 s |
| 7a | `CIBLE_PX` du moteur `attrape` : 64 → 40 px (R16) | `client/src/moteurs/attrape/MoteurAttrape.tsx` | **NON** | — *(E2E sur pièce)* | 7,7 s |
| 7b | Le jeton `--cible-min` : 64px → 40px — **toutes** les cibles du client | `client/src/styles/global.css` | **NON** | — *(E2E sur pièce)* | 9,1 s |
| 8 | L'habillage `clairiere.luciole` ne déclare plus le moteur `eclair` qui l'utilise | `contenu/habillages/clairiere/luciole.habillage.json` | **oui** | `moteurs-couverture.test.ts` · `MoteurEclair.test.tsx` | 11,5 s |
| 9 | `erreursAvantIndice: 2 → 99` — **l'indice n'arrive jamais** (D49) | `partage/src/moteurs/commun/delais.ts` | **oui** | `trace-geste-enfant.test.ts` | 6,7 s |
| 10 | `p_devinette` forcée à 0 dans le BKT (viole D13) | `partage/src/pedagogie/bkt.ts` | **oui** | `bkt.test.ts` — « les QUATRE conditions, pas trois » · `parametres-pedagogie.test.ts` | 8,8 s |
| 11 | Le bouton « écouter » se rend **sans clip** (viole D42) | `client/src/composants/BoutonEcouter.tsx` | **oui** | `BoutonEcouter-option-parent.test.tsx` · `BoutonEcouter-reponse.test.tsx` | 9,0 s |
| 12 | L'idempotence : le renvoi d'une tentative n'est plus court-circuité | `serveur/src/depots/tentatives.ts` | **NON** | — **mutant équivalent**, voir § 3 | 6,8 s |
| 13 | `ouvrirCeQuiDoitLEtre` ignore le parallélisme : **les 6 régions s'ouvrent** | `partage/src/monde/carte.ts` | **oui** | `carte.test.ts` · `api/monde.test.ts` (4 cas) | 8,5 s |
| 14 | La région `porte-ecole` perd son `Z` — **le remplissage fuit** | `contenu/habillages/clairiere/ecole.svg` | **oui** | `regions-fermees.test.ts` · `contenu-validation.test.ts` | 8,5 s |
| 15 | Le repli « viewBox illisible » **lève** au lieu de replier (chemin rare) | `partage/src/moteurs/trace/validation.ts` | **oui** | `trace-validation.test.ts` | 8,5 s |

**Bilan des 15 demandées : 12 détectées, 4 survivantes** (2, 7a, 7b, 12).

### Les 12 mutations ajoutées — là où j'ai cherché ce que les 15 ne touchaient pas

| # | Défaut injecté | Ce qu'il éprouve | Détectée | Par quel test |
|---|---|---|---|---|
| 16 | `promouvoir` ne fait plus monter la boîte Leitner | **séquence longue** — invisible avant J+3 | **oui** | `leitner.test.ts` — « 90 jours simulés » · `api/pedagogie.test.ts` (6 cas) |
| 17 | Le client poste `/api/tentatives-absent` ; `EcranRecompense` **avale l'échec** | **le défaut n° 4 du père, côté CLIENT** | **NON** | — *(E2E sur pièce)* |
| 18 | La **flèche de sens** du guidage pointe à l'envers ; la validation reste juste | **on enseigne le faux, on valide le juste** | **NON** | — **rien, nulle part** |
| 19 | `onPointerMove` débranché sur le tracé | **geste réel** | **oui** | `MoteurTrace.test.tsx` (4 cas) |
| 20 | La clé d'idempotence **oublie le nœud** | collision silencieuse | **NON** | — **rien, nulle part** |
| 21 | La Clairière cite `clairiere-07`, qu'aucun contenu ne livre | **migration de contenu** | **oui** | `noeuds-regions.test.ts` · `ids-regions-stables.test.ts` · `clairiere-sortie-complete.test.ts` · `api/monde.test.ts` (17 cas) |
| 22 | La 3ᵉ étoile est donnée **avec une erreur** | inflation de note, rien ne « casse » | **oui** | `etoiles.test.ts` · `api/tentatives.test.ts` |
| 23 | `RAYON_PRISE` de la carte : 46 → 20 (diamètre 40 px, R16) | écran non couvert | **NON** | — *(E2E sur pièce)* |
| 24 | L'écran de récompense affiche **toujours 3 étoiles** | écran non couvert | **NON** | — *(E2E sur pièce)* |
| 25 | La carte de profil **ne répond plus au tap** — le jeu est inaccessible | écran non couvert | **NON** | — *(E2E sur pièce)* |
| 26 | Une **animation** entre dans le champ de lecture | règle non négociable de CLAUDE.md | **NON** | — **rien, nulle part** |

**Bilan des 12 ajoutées : 5 détectées, 7 survivantes.**

### Les 5 contrôles négatifs

| # | Modification sans effet | Attendu | Obtenu |
|---|---|---|---|
| N1 | un commentaire dans `carte.ts` | vert | **vert** |
| N2 | une variable locale renommée dans `etoiles.ts` | vert | **vert** |
| N3 | un espace dans le `$commentaire` de `regions.json` | vert | **vert** |
| N4 | un commentaire dans `depots/tentatives.ts` | vert | **vert** |
| N5 | un commentaire dans `MoteurTrace.tsx` | vert | **vert** |

**5 sur 5 : le banc mesure bien des défauts, pas le fait de toucher un fichier.**

---

## 3. Le score de survie, et ce qu'il vaut

```
27 mutations injectées
16 détectées par la suite exécutée      (vitest 1478 tests + test:rejeu + test:contenu)
11 survivantes                          → 41 % de survie contre la suite exécutée
```

Ce chiffre brut se corrige de deux façons, et **les deux corrections comptent** :

**On retranche un mutant équivalent.** M12 (`if (dejaLa !== null && false)`) ne change **aucun**
comportement observable : l'insertion part quand même, la contrainte `UNIQUE` la refuse, et le
`catch` relit par clé et rend `{ deja: true }` — le même objet, à la même place. Le fichier le
revendique lui-même :

> « Ceinture et bretelles. `BEGIN IMMEDIATE` sérialise déjà les écrivains […] Si la contrainte
> UNIQUE parle quand même, c'est qu'un autre processus a gagné la course. »

**J'ai coupé la ceinture, les bretelles ont tenu.** Ce n'est pas un trou de QA, c'est une
défense en profondeur qui fonctionne. Reste **26 mutations qui valent**.

**On ajoute les E2E, lus mais non exécutés.** Sept survivants portent une assertion E2E nommée
qui les attraperait :

| # | L'assertion qui devrait mordre | Fichier |
|---|---|---|
| 2 | `« noeud/<id> » a au moins une sortie` — une recette **par nœud livré**, 18 en tout ; message : *« N éléments interactifs, aucun ne mène ailleurs. C'est le défaut n° 1 du père, sur un autre écran. »* | `tests/e2e/parcours-audit-tout-le-site.spec.ts` |
| 7a · 7b · 23 | `« <écran> » n'offre que des cibles ≥ 64 px` — `ciblesTropPetites()` mesure `getBoundingClientRect()` sur `SELECTEUR_INTERACTIF`. Vérifié : la pastille de région porte bien `role="button"` quand la région est ouverte, donc M23 entre dans le champ du sélecteur | idem · `tests/e2e/qa-outils.ts:471` |
| 17 | `expect(entree, 'la progression du nœud joué doit persister').toBeDefined()` après relecture de `/api/profils/:id/progression` | `tests/e2e/parcours-nominal.spec.ts:269-273` |
| 24 | après le bot casse-cou : `data-etoile="1"` → `acquise=oui`, `"2"` et `"3"` → `acquise=non` | `tests/e2e/cassecou.spec.ts:195-198` |
| 25 | toutes les recettes commencent par `choisirLeProfil(page)` — l'intégralité des parcours tombe | `tests/e2e/qa-outils.ts` |

```
26 mutations qui valent
23 attrapées quelque part dans la QA (16 exécutées + 7 sur pièce)
 3 traversent tout                    → 12 % de survie contre la QA complète
```

> **12 %.** C'est bien. Ce n'est pas 0, et les trois qui restent sont exactement du genre que ce
> projet a déjà payé cher.

---

## 4. Les trois défauts qu'aucun test ne verrait — et le test qui manque

### 4.1 M18 — la flèche du ductus peut pointer à l'envers, et rien ne le dit

**C'est le défaut n° 3 du père, déplacé d'un cran et toujours ouvert.**

D33 énumère quatre conséquences opposables. La n° 2 — *« un tracé au bon endroit mais dans le
mauvais sens n'est pas une réussite »* — est **superbement tenue** : `qa-ductus-toutes-lettres.test.ts`
joue les 26 minuscules dans les deux sens, `evaluerTrait` refuse l'inverse, et la mutation M1 est
attrapée en 4 cas. La n° 3 — *« le guidage montre le sens : point de départ marqué, flèche de
direction, tracé fantôme animé »* — ne l'est pas.

Mesuré :

```
$ grep -rn 'data-guide' tests/
tests/composants/MoteurTrace-ordre-visible.test.tsx:92:    decrire('[data-guide="sens"]'),
```

La flèche est vérifiée **présente**. Son **angle** n'est vérifié nulle part. J'ai inversé
`flecheDeSens` — `Math.atan2(a[1]-b[1], a[0]-b[0])` au lieu de `Math.atan2(b[1]-a[1], b[0]-a[0])` —
et les 1478 tests sont restés verts.

**Ce que ça produit chez l'enfant :** la flèche lui montre de tracer le `d` dans un sens, le
moteur refuse ce sens-là. Il obéit à ce qu'il voit et il est puni pour ça. C'est **pire** que le
bug d'origine, parce que l'application se contredit elle-même — et D33 le dit en toutes lettres :
*« un moteur de tracé qui enseigne un mauvais sens détruit le mécanisme même pour lequel il a été
ajouté. »*

**Le test qui manque** — `tests/composants/trace-guidage-sens.test.tsx`, unitaire, ~40 lignes :

- pour chacune des **26 lettres** et chacun de leurs **45 traits**, monter `GuidageLettre` avec
  `etat="en-cours"` ;
- lire l'attribut `transform` de `[data-guide="sens"]`, en extraire l'angle ;
- **source qui fait foi, lue sur disque, jamais recalculée** :
  `contenu/modeles-lettres/minuscules.json`. Calculer la direction attendue depuis les deux
  points médians du trait livré, exactement comme le fait le composant ;
- asserter que l'angle rendu est à moins de 1° de la direction du parcours **et** — c'est
  l'assertion qui mord — qu'il est à plus de 90° de la direction **inverse** ;
- **contrat de sortie** : le test imprime le nombre de traits contrôlés et échoue si ce nombre
  est inférieur à 45. Sans ce plancher, il resterait vert sur un référentiel vide.

Étendre au point de départ (`[data-guide="depart"]` doit être en `trait.depart`, déjà partiellement
tenu) et au tracé fantôme.

### 4.2 M26 — « aucune animation dans le champ de lecture » n'a aucun garde mécanique

CLAUDE.md, règles non négociables :

> **Le décor s'agite, le texte jamais.** Dès qu'il y a du déchiffrage : fond parchemin, police
> Andika, aucune animation dans le champ de lecture.

Mesuré :

```
$ grep -rn "texte jamais\|champ de lecture" tests/
(aucun résultat)
```

`ZoneDeLecture.test.tsx` porte **24 cas** — police, corps, interlettrage, interligne, syllabation,
lignes tapables, R16, « n'émet jamais `data-etat="echec"` ». **Aucun sur l'animation.** J'ai posé
`style={{ animation: 'clignote 1s infinite' }}` sur le paragraphe de lecture : suite verte.

C'est la règle la plus directement liée au trouble de l'enfant, et c'est celle qui n'a pas de
traduction mécanique. Une règle non négociable sans test est une intention, pas une contrainte.

**Le test qui manque** — `tests/unitaires/lecture-immobile.test.ts` :

- monter `ZoneDeLecture` avec un texte, dans les deux états de `prefers-reduced-motion` ;
- pour **tout** descendant du sous-arbre `[data-lecture="oui"]`, asserter que ni le style en
  ligne ni les classes n'introduisent `animation`, `transition` sur une propriété géométrique,
  ni `@keyframes` ;
- **doubler par un contrôle sur la source**, parce que la précédente ne voit pas ce que le CSS
  ajoute : lire `client/src/styles/global.css` et `client/src/lecture/*.tsx`, et refuser toute
  déclaration `animation:` dans un sélecteur qui touche `[data-lecture]` ou `.zone-de-lecture` ;
- **contrat de sortie** : imprimer le nombre de nœuds inspectés et le nombre de sélecteurs
  examinés ; échouer si l'un des deux est nul.

### 4.3 M20 — la clé d'idempotence peut perdre une de ses entrées sans que rien ne bouge

Mesuré :

```
$ grep -rn "deriverCleIdempotence\|calculerCleIdempotence" tests/
(aucun résultat)
```

**La fonction qui décide si une tentative est un doublon n'est appelée par aucun test.** Elle est
exercée indirectement — `api/tentatives.test.ts` a bien un cas « idempotence de la mise à jour » —
mais **ses entrées ne sont pas épinglées une par une**. J'ai retiré `noeudId` de la matière du
hachage ; les 1478 tests sont restés verts, `test:rejeu` et `test:contenu` aussi.

Sévérité honnête : **faible en exploitation** — il faudrait que deux nœuds démarrent à la même
milliseconde avec la même graine pour le même profil. Mais c'est précisément la forme du défaut
n° 4 (« l'enfant termine, rien n'est sauvé »), et le coût du test est de dix lignes.

**Le test qui manque** — à ajouter dans `tests/unitaires/idempotence-cle.test.ts` :

- la clé est **stable** : deux appels avec les mêmes quatre entrées rendent la même chaîne ;
- la clé **dépend de chacune des quatre** : faire varier `profilId`, puis `noeudId`, puis
  `demarreLe`, puis `graine`, **une à la fois**, et exiger une clé différente à chaque fois.
  C'est ce cas-là, et lui seul, qui attrape M20 ;
- l'identifiant dérivé (`tnt-…`) est stable et distinct de la clé ;
- même traitement pour `calculerCleIdempotence` côté client, et **assertion croisée** : pour un
  même quadruplet, client et serveur produisent la **même** clé. Aujourd'hui rien ne relie les
  deux implémentations.

---

## 5. Les zones aveugles par nature

Ce que la QA ne peut pas voir dans sa forme actuelle. Chaque ligne est mesurée.

### 5.1 Les écrans — la zone aveugle principale, et elle explique 8 survivants sur 11

```
moteurs de client/src/moteurs/  avec un test de composant : 14 / 14
écrans de client/src/ecrans/    avec un test de composant :  2 / 12
```

Non couverts : `EcranCarte`, `EcranCodeParent`, `EcranCoffre`, `EcranDashboard`,
`EcranDefinirCode`, `EcranGalerieParent`, `EcranNoeud`, `EcranProfils`, `EcranRecompense`,
`EcranReglagesLecture`.

Les mutations 2, 7a, 7b, 17, 23, 24, 25, 26 tombent **toutes** dans cette zone. Le contrat de la
QA reporte donc l'écran sur les E2E — ce qui serait acceptable si les E2E tournaient souvent.

### 5.2 Les E2E ne tournent qu'au `pre-push`, et exigent un build

`lefthook` : `pre-commit` → lint + T1 sur les fichiers touchés ; `pre-push` → `verifier`.
`playwright.config.ts:162` : `command: 'node serveur/dist/index.js'`.

Conséquence pratique : **entre deux poussées, un défaut d'écran est invisible.** Un agent qui
commit au fil de l'eau (D12) peut poser dix commits avec un bouton retour disparu sans qu'une
seule commande le lui dise. C'est exactement ce qui s'est produit pour le défaut n° 1.

### 5.3 Ce qui est MONTRÉ, par opposition à ce qui est VALIDÉ

La QA de ce projet est excellente sur les fonctions pures et sur ce que le DOM **porte comme
donnée** (`data-*`). Elle est aveugle à ce que l'enfant **voit** : un angle de flèche, une
couleur, une taille rendue par le CSS, une animation. M18 et M26 sont deux instances de la même
zone. Le test visuel (`test:visuel`, 8 captures rouges en attente des yeux du père) est le seul
outil qui la couvre, et il est aujourd'hui à l'arrêt.

### 5.4 Les fonctions exportées qu'aucun test n'appelle

`deriverCleIdempotence` est le cas trouvé par ce banc, mais `etat-du-projet.md` en signale
**23** : *« 23 symboles exportés ne sont appelés nulle part »*. Chacun est un endroit où une
mutation survit par construction. Il n'existe aucune commande qui liste, dans le dépôt, les
exports que la suite n'atteint jamais.

### 5.5 Les règles non négociables sans traduction mécanique

Douze règles sont listées dans CLAUDE.md. Certaines sont traduites en test avec un soin
remarquable (`data-etat="echec"` interdit, R16 sur les cibles, `Math.random`/`Date.now` par
règle ESLint). Au moins une ne l'est pas du tout : « aucune animation dans le champ de lecture ».
**Aucun test ne recense les règles pour vérifier que chacune a son garde** — c'est l'audit par
occurrences plutôt que par objets, un cran plus haut (D48).

### 5.6 Le logiciel VÉCU — en cours de fermeture, pas encore acquis

Une campagne parallèle écrivait, pendant cet audit, exactement ce qui manquait :
`tests/api/profils-vecus.test.ts`, `tests/api/progression-vecue.test.ts`,
`tests/api/migration-catalogue.test.ts`, `tests/api/parcours-humains.test.ts`,
`tests/fixtures/profils-vecus/`. **À l'instant où j'écris, ces fichiers ne sont pas encore suivis
par git** et l'un d'eux était rouge (`V2 — un profil qui a terminé tout le contenu livré`), ce qui
est la bonne couleur pour un test qui reproduit un défaut avant sa correction.

Cette zone est donc **en voie de fermeture par d'autres** ; le plan du § 7 n'y touche pas, pour
respecter la règle d'un seul écrivain par fichier.

---

## 6. Les tests trompeurs

Six trouvés. **Aucun ne cache un trou de couverture** — dans les six cas la propriété est tenue
ailleurs. Mais chacun donne, à qui le lit, une confiance qu'il ne finance pas. Et c'est en lisant
un rapport de couverture qu'on décide de ne pas écrire un test.

### 6.1 Le bot singe dit « aucun état sans issue » et compte les éléments interactifs

`tests/e2e/singe.spec.ts:122-126` :

```ts
expect(
  sante.interactifs,
  `aucun état sans issue : au moins un élément interactif ${contexte}`
).toBeGreaterThan(0);
```

**C'est mot pour mot ce que D48 condamne** : *« Compter les éléments interactifs n'est pas compter
les sorties. `interactifs > 0` est un indice ; "mène ailleurs" est la propriété. »* La leçon a été
appliquée dans un **autre** fichier ; l'assertion d'origine est restée, avec un message qui affirme
désormais une propriété qu'elle ne mesure pas. Sur le nœud `trace`, elle serait encore verte.

→ **Corriger le message**, pas l'assertion : `au moins un élément interactif` (ce qu'elle mesure
vraiment), et renvoyer explicitement à `parcours-audit-tout-le-site.spec.ts` pour la sortie.

### 6.2 Le « CONTRAT DE SORTIE QA » des moteurs imprime une fraction et assert `> 0`

`tests/e2e/parcours-audit-moteurs.spec.ts`, dernier cas :

```ts
console.log(`[qa-moteurs] ${MOTEURS_JOUABLES.length} moteur(s) joué(s) … sur ${MOTEURS_DECLARES.length} déclaré(s)`);
expect(MOTEURS_DECLARES.length, …).toBeGreaterThanOrEqual(14);
expect(MOTEURS_JOUABLES.length, 'aucun moteur n’est atteignable').toBeGreaterThan(0);
```

Le commentaire au-dessus affirme : *« Ce cas ne peut pas être vert par vacuité. »* C'est vrai pour
la vacuité, faux pour la fraction : **il resterait vert à 1 moteur joué sur 14** — le défaut n° 6
de l'historique, dans le fichier même qui prétend l'avoir soldé.

La propriété **est** tenue, ailleurs et bien : `tests/unitaires/moteurs-atteignables.test.ts:255-256`
asserte `rapport.ecart === 0` et `nbMoteursAtteignables === MOTEURS_DECLARES.length`.

→ Aligner : `expect(MOTEURS_JOUABLES.length).toBe(MOTEURS_DECLARES.length)`, ou renvoyer
explicitement au test unitaire et cesser d'appeler ce cas un contrat de sortie.

### 6.3 Une assertion qui se compare à elle-même

`tests/e2e/parcours-audit-tout-le-site.spec.ts` :

```ts
expect(jamaisVisites, 'trop d’écrans échappent aux parcours')
  .toHaveLength(jamaisVisites.length > 1 ? 0 : jamaisVisites.length);
```

Vérifié : elle **mord** à partir de 2 écrans non visités. Dans la branche `≤ 1`, elle compare une
valeur à elle-même. Elle n'est donc pas creuse, mais elle a la forme exacte d'une assertion qui ne
peut pas échouer, et un relecteur pressé la classera comme telle.

→ Écrire l'intention : `expect(jamaisVisites.length).toBeLessThanOrEqual(1)`, avec le message qui
nomme le seul écran défensif admis.

### 6.4 La flèche du ductus est vérifiée présente, jamais orientée

`tests/composants/MoteurTrace-ordre-visible.test.tsx:92` — `decrire('[data-guide="sens"]')`.
Voir § 4.1 : c'est la forme du défaut n° 3, et là c'est un **vrai** trou.

### 6.5 Un audit de sorties écrit à la main, à côté d'un audit énuméré

`tests/e2e/parcours-issues-de-secours.spec.ts` porte une liste `ECRANS` **écrite à la main** de
8 entrées, soit **7 valeurs de `data-ecran` distinctes sur les 13 déclarées** dans `client/src/` :

```
$ grep -rho 'data-ecran="[a-z-]*"' client/src --include=*.tsx | sort -u | wc -l
13
non audités par ce fichier : chargement, choix-profil-parent, dashboard, galerie-parent,
                             ouverture, recompense
```

Ce serait un trou béant — sauf que `parcours-audit-tout-le-site.spec.ts` fait le travail
correctement : il **lit les `data-ecran` de la source** (`ecransDeclares()`), génère une recette
par nœud livré, et son contrat de sortie asserte `orphelins == []` en nommant chaque écran ni
atteint ni couvert. **La leçon D48 a bien été apprise.** Le fichier « issues de secours » est un
doublon partiel qui survit à sa propre correction et donnera une fausse assurance à qui le lit
seul.

→ Le supprimer, ou le réduire à un renvoi. *Décision non prise : c'est une suppression, je ne
supprime rien.*

### 6.6 Une sonde sans assertion a tourné dans `npm run test`

`tests/api/zz-sonde-h3.test.ts` — 42 lignes, **7 `console.log`, 0 `expect(`**, intitulée
« sonde H3 (temporaire) ». Présente à 11 h 11, retirée depuis par sa campagne. Rien à corriger,
mais le point vaut d'être noté : **rien n'empêche un fichier sans assertion d'entrer dans la
suite et d'y rester.**

→ Un garde à dix lignes : tout `tests/**/*.test.ts` contient au moins un `expect(`.

---

## 7. Le plan des 5 lots

Un seul écrivain par fichier. **Aucun lot ne touche `partage/src/monde/`, `serveur/src/depots/monde.ts`,
`serveur/src/services/`, `partage/src/parent/`, ni `tests/api/` ni `tests/fixtures/` —** ces
chemins appartiennent à la campagne en vol au 2026-08-02 (lots H1/H2 : état de profil, migration
de catalogue, remise à zéro). Relire `git status` avant de lancer.

### Lot QA-1 — fermer les trois trous mesurés · **priorité 1, c'est le seul lot qui répare**

| Fichier à créer | Propriétaire | Ce qu'il porte |
|---|---|---|
| `tests/composants/trace-guidage-sens.test.tsx` | QA-1a | § 4.1 — l'angle de `[data-guide="sens"]` sur les 45 traits, contrat de sortie ≥ 45 |
| `tests/unitaires/lecture-immobile.test.ts` | QA-1b | § 4.2 — aucune animation sous `[data-lecture]`, DOM **et** CSS |
| `tests/unitaires/idempotence-cle.test.ts` | QA-1c | § 4.3 — les 4 entrées épinglées une à une, + accord client/serveur |

Effort `medium` : contrat clair, fichiers neufs, aucune décision de conception. **Contrat de
sortie du lot :** ré-injecter M18, M26, M20 par le banc de `Docs/audit-qa.md` § 1 et obtenir
`DETECTEE` sur les trois. Un lot qui ne le prouve pas n'est pas fini.

### Lot QA-2 — donner un test de composant aux dix écrans nus · **priorité 2, c'est le lot qui a le plus d'effet**

Dix fichiers, un propriétaire chacun, aucune dépendance entre eux :

| Fichier à créer | Écran | Ce qu'il doit au minimum asserter |
|---|---|---|
| `tests/composants/EcranNoeud.test.tsx` | `noeud` | le bouton `[data-vers="carte"]` **existe et est rendu** (attrape M2) |
| `tests/composants/EcranRecompense.test.tsx` | `recompense` | `data-etoile`/`data-acquise` **suivent la valeur calculée**, jamais une constante (attrape M24) |
| `tests/composants/EcranProfils.test.tsx` | `profils` | la carte de profil répond au tap et appelle `surChoix` (attrape M25) |
| `tests/composants/EcranCarte.test.tsx` | `carte` | la pastille d'une région ouverte porte `role="button"` et un diamètre ≥ 64 unités (attrape M23) |
| `tests/composants/EcranDashboard.test.tsx` | `dashboard` | les chiffres affichés viennent de la réponse, pas d'un défaut |
| `tests/composants/EcranCoffre.test.tsx` | `coffre` | une sortie existe |
| `tests/composants/EcranCodeParent.test.tsx` | `code-parent` | une sortie existe, pavé à cibles ≥ 64 px |
| `tests/composants/EcranDefinirCode.test.tsx` | `definir-code` | idem |
| `tests/composants/EcranGalerieParent.test.tsx` | `galerie-parent` | une sortie existe |
| `tests/composants/EcranReglagesLecture.test.tsx` | `reglages-lecture` | une sortie existe, les réglages se propagent |

**Une exigence commune, à écrire une fois sur disque et à donner par son chemin** (jamais recopiée
dans dix briefs) : *tout écran rend au moins un élément qui change `data-ecran`, et aucune cible
tapable n'est déclarée sous 64 px.* Effort `medium`, modèle `sonnet` : implantation contre un
contrat gelé.

**Contrat de sortie du lot :** `2 / 12` → `12 / 12`, mesuré par la commande du § 5.1, et M2, M23,
M24, M25 passent à `DETECTEE`.

### Lot QA-3 — le garde-fou qui empêche la zone aveugle de revenir · **priorité 3**

| Fichier à créer | Propriétaire | Ce qu'il porte |
|---|---|---|
| `tests/unitaires/couverture-ecrans.test.ts` | QA-3a | **Auditer les objets, pas les occurrences** (D48) : énumérer les `data-ecran` de `client/src/**`, énumérer les fichiers de `tests/composants/`, et exiger l'écart nul. Un écran ajouté demain sans test **ne compile pas la QA**. Imprimer les deux comptes et l'écart |
| `tests/unitaires/regles-gardees.test.ts` | QA-3b | Énumérer les règles non négociables de CLAUDE.md et exiger que chacune nomme le test qui la tient. C'est la généralisation de § 5.5 |
| `tests/unitaires/tests-sans-assertion.test.ts` | QA-3c | § 6.6 — tout `tests/**/*.test.ts*` contient au moins un `expect(` |

Effort `medium`. **Contrat de sortie :** les trois impriment `population / couverts / écart` et
échouent si la population est nulle.

### Lot QA-4 — corriger les libellés trompeurs · **petit, à faire tôt, un seul écrivain**

Un seul propriétaire pour les trois fichiers, parce que les trois corrections sont d'une ligne et
qu'un lot par ligne coûte plus cher que le travail :

- `tests/e2e/singe.spec.ts` — § 6.1, corriger le **message**, ne rien retirer ;
- `tests/e2e/parcours-audit-moteurs.spec.ts` — § 6.2, asserter la fraction ;
- `tests/e2e/parcours-audit-tout-le-site.spec.ts` — § 6.3, écrire l'intention.

**Aucune assertion n'est retirée ni assouplie ; deux sont renforcées.** Effort `low`.

### Lot QA-5 — rendre le banc de mutation reproductible · **le lot qui rend les quatre autres vérifiables**

| Fichier à créer | Propriétaire | Ce qu'il porte |
|---|---|---|
| `.claude/skills/banc-de-mutation/SKILL.md` | QA-5a | La procédure : recettes, ancrage unique obligatoire, restauration en `finally`, **exclusion des tests non suivis par git**, et les **cinq contrôles négatifs** — sans eux, la mesure est du bruit (§ 1) |
| `outils/mutation/recettes.mjs` | QA-5a | Les 27 recettes de ce document, réutilisables telles quelles |
| `outils/mutation/banc.mjs` | QA-5a | Le banc |

Une procédure exécutée une fois et qui le sera à nouveau doit devenir un skill (CLAUDE.md,
discipline de fin de tâche, point 2). **Contrat de sortie :** relancer le banc rend le même
tableau qu'au § 2, aux lots QA-1 et QA-2 près.

---

## 8. Arbitrages rendus, et une consigne que je n'ai pas suivie

Le brief demandait de consigner à la fin de `Docs/questions-en-attente.md`. **Je ne l'ai pas
fait, délibérément.** Ce fichier est modifié par la campagne en vol (` M Docs/questions-en-attente.md`
dans `git status` pendant tout l'audit). Écrire dedans depuis une lecture périmée, c'est risquer
d'effacer le travail d'un autre — et la règle « un seul écrivain par fichier » est la seule qui
protège de ça. Le brief disait aussi, en gras, *« TU N'ÉCRIS QU'UN SEUL FICHIER »*. J'ai tranché
pour la règle qui, si je me trompe, ne détruit rien. **À reporter dans
`questions-en-attente.md` par l'orchestrateur, quand la campagne H aura posé sa plume.**

| # | Arbitrage | Décidé |
|---|---|---|
| A-1 | **Le mutant équivalent M12 est retiré du dénominateur.** Un défaut qui ne change aucun comportement observable ne peut pas être « raté » par une QA | 27 injectées, **26 qui valent** |
| A-2 | **Les 7 survivants couverts par une assertion E2E lue mais non exécutée sont comptés comme attrapés**, et signalés comme tels. Les compter comme trous aurait exagéré le problème ; les taire l'aurait caché | 12 % de survie, avec la limite écrite |
| A-3 | **Je n'ai pas compilé** — ni `tsc -b`, ni build client. Le jeton de compilation appartient à l'orchestrateur (D10) et une campagne écrivait le source | E2E non exécutés |
| A-4 | **Je n'ai rien supprimé**, y compris `parcours-issues-de-secours.spec.ts` (§ 6.5) et les fichiers de la sonde d'une autre campagne | 0 fichier supprimé |
| A-5 | La mutation n° 7 du brief est **dédoublée** : la constante d'un moteur et le jeton CSS global ne sont pas le même défaut, et leur couverture diffère | 7a et 7b |

**À trancher par le père ou l'orchestrateur :**

1. **Le lot QA-2 vaut-il dix fichiers ?** C'est le lot le plus long de ce plan et il ne corrige
   aucun défaut connu — il ferme une zone. Mesure à l'appui : 8 des 11 survivants y tombent.
2. **`parcours-issues-de-secours.spec.ts` doit-il disparaître ?** Il est intégralement couvert
   par `parcours-audit-tout-le-site.spec.ts`, mais c'est une suppression.
3. **Faut-il faire tourner les E2E au `pre-commit` ?** § 5.2. Le coût est un build ; le bénéfice
   est que la zone aveugle des écrans cesse d'être invisible entre deux poussées.

---

## 9. Contrat de sortie de cet audit

| Grandeur | Valeur | Comment elle est obtenue |
|---|---|---|
| Mutations injectées | **27** | 16 pour les 15 demandées, 11 ajoutées |
| Détectées par la suite exécutée | **16** | `journal-final.tsv`, verdict = code de sortie ≠ 0 |
| **Survivantes** | **11** | dont 1 mutant équivalent, 7 couvertes E2E sur pièce |
| **Défauts qui traversent toute la QA** | **3** | M18, M20, M26 |
| Taux de survie contre la QA complète | **12 %** | 3 / 26 |
| Contrôles négatifs verts | **5 / 5** | sans quoi la mesure ne vaut rien |
| Base verte avant **et** après le banc | **oui** | `Tests 1478 passed (1478)`, deux fois |
| Tests trompeurs | **6** | § 6 |
| Zones aveugles | **6** | § 5 |
| Fichiers de code ou de test modifiés | **0** | ci-dessous |
| Fichiers supprimés | **0** | |

### La preuve que le dépôt est intact

Les 24 fichiers de production touchés par le banc ont été recherchés un par un dans
`git status --porcelain`. Deux ressortent modifiés — `partage/src/monde/carte.ts` et
`client/src/api/client.ts` — et **ce sont les modifications de la campagne parallèle, pas les
miennes** : leur diff porte le lot H1 (`enCours` fondé sur la recoloration) et le lot H2
(`lireEtatProfilParent`, `ReinitialiserProfil`), et ma ligne d'origine est intacte :

```
$ grep -n "CHEMINS_API.tentatives, corpsJson(tentative)" client/src/api/client.ts
172:  return demander<ReponseTentative>(CHEMINS_API.tentatives, corpsJson(tentative));
```

Recherche des résidus de mutation dans tout `client/`, `partage/`, `serveur/`, `contenu/` :

```
$ grep -rn "controle negatif du banc\|CIBLE_PX = 40\|cible-min: 40px\|RAYON_PRISE = 20\
           \|erreursAvantIndice: 99\|nbErreurs <= 1\|clairiere-07\|tentatives}-absent"
(aucun résultat)
```

**Le seul fichier écrit par cette campagne est celui-ci.**
