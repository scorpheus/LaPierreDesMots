# Le calcul : premier jet jouable, 9 octobre 2026

**Statut : premier jet à faire tester par le parent.** Il applique la conception
[reconception-maths-ce1-ce2-2026-10-09.md](reconception-maths-ce1-ce2-2026-10-09.md), et surtout
son § 6 bis (réponses du parent), qui prime sur le reste. Ce premier jet contient le gué des calculs
(calcul en ligne) et l'addition posée, au palier « CE1 facile ». Ensuite, on observe l'enfant.

## 1. Ce qui est jouable

| Jeu | Ce que l'enfant fait | Saisie |
|---|---|---|
| **Le gué des calculs** | 12 égalités à trou ; chaque réponse juste fait sortir une pierre du gué | 5 premières : **3 réponses à toucher**. 7 suivantes : **pavé 0–9** |
| **La pierre à calcul** | 4 additions posées en colonnes (d, u), deux nombres à 2 chiffres | **pavé 0–9** |

Ce qui vaut pour les deux jeux :
- **Une seule interaction** : toucher une réponse ou un chiffre. Il n'y a pas de bouton « Vérifier »
  ni « Effacer », et aucune suite de boutons à mémoriser.
- **Le clavier physique est toujours écouté** : les chiffres de la rangée du haut et ceux du pavé
  numérique. La touche est lue par son `code` (`Digit7`, `Numpad7`). Sur un clavier français
  AZERTY, on peut donc taper sans Maj : la touche « è » compte pour 7. Aux niveaux à choisir, le
  clavier tape la réponse chiffre par chiffre.
- **La vérification se fait chiffre par chiffre** (§ 6 bis, Q5 = a) :
  - un chiffre juste se pose dans la case marquée, et la case suivante se marque ;
  - un chiffre faux n'est pas posé : la touche oscille, sans rouge ;
  - Gobi dit alors « Pas encore… », l'erreur est comptée, et rien de ce qui est posé n'est retiré.
  - Une réponse à choisir qui est fausse reste à l'écran, en pointillé.
- **La retenue en paliers** (§ 6 bis, Q4) :
  - additions 1 et 2 : sans retenue ;
  - additions 3 et 4 : dès que les unités sont justes, **la retenue s'écrit toute seule** au-dessus
    des dizaines, dans un cadre soleil, et Gobi dit « Dix unités font une dizaine. Je pose la
    retenue en haut. »
- **L'aide de Gobi est gratuite** :
  - elle vient d'elle-même après 2 erreurs sur la même case (un indice), puis après 3 (la bonne
    touche ou la bonne réponse s'allume) ;
  - on peut aussi la demander à tout moment avec le bouton « ? Gobi » ;
  - elle ne coûte que l'étoile « sans aide ». Le barème est `1 + sans aide + sans erreur`.
- **Il n'y a pas d'écran d'échec.** Une partie finit toujours par « Bravo ! » et ses étoiles, avec
  deux choix : « Encore une rivière » (ou « Encore une pierre »), et « Les nombres » pour revenir.

## 2. Comment y accéder (chemin de clics)

1. Lancer le jeu (`demarrer.bat`), puis ouvrir **http://localhost:8080** : sur le PC, ou depuis la
   tablette avec l'adresse du réseau local.
2. Choisir le joueur. La carte s'ouvre.
3. Toucher **« La Vallée des Nombres »** : soit sur la carte, soit au campement avec le bouton de
   la vallée.
4. En haut de l'écran, un encadré **« Calculer avec Gobi »** montre deux grandes pierres :
   **« Le gué des calculs »** et **« La pierre à calcul »**. Un toucher lance la partie.

Lien direct après le choix du joueur : **http://localhost:8080/mathematiques**.

**Pourquoi l'encadré est en tête de l'écran des maths, plutôt que sur un écran à part.** C'est la
façon la plus simple :
- l'enfant suit le même chemin qu'avant, il n'y a ni nouvelle route ni nouveau bouton au campement ;
- la sonde mesure que l'encadré est entièrement visible sans défiler sur les 6 formats (§ 5) ;
- l'ancien code maths reste intact en dessous, sans rien supprimer.

Une seule réserve, mesurée : si une **ancienne** partie de maths est en cours, l'écran rouvre cette
partie d'abord, comme avant. Dans `donnees/pierre.db`, la table `reprises_maths` compte **0** ligne
(lecture seule, `bac-a-sable/maths-calcul/reprises-maths.mjs`). Ce cas ne se présente donc pas
aujourd'hui.

## 3. Les paliers et leurs bornes

Toutes les citations viennent de [reference-programmes-ce1-ce2.md](reference-programmes-ce1-ce2.md)
§ 1.3. Elles sont aussi dans le code (`PALIERS_CALCUL`).

| Palier | Exemple | Bornes | Saisie | Ligne du référentiel |
|---|---|---|---|---|
| `gue-tables` | 8 + 7 = ▢ ; 7 + ▢ = 15 ; 15 − 8 = ▢ | termes de 2 à 9, résultats ≤ 18 | choix (3) | réf. 1.3 CE1 tables d'addition « connues dans les deux sens ; 12 égalités à trou en 1 minute » |
| `gue-dizaines` | 34 + 20 = ▢ ; 58 − 30 = ▢ | nombres de 10 à 99, unités inchangées (**sans retenue**) | pavé | réf. 1.3 CE1 calcul mental « ajouter/soustraire des dizaines ou centaines entières (234 + 60) » |
| `gue-neuf` | 46 + 9 ; 34 + 19 ; 52 − 9 | de 10 à 99, toujours **avec passage de la dizaine** | pavé | réf. 1.3 CE1 calcul mental « ajouter 9, 19, 29 ; soustraire 9 » |
| `pose-sans-retenue` | 34 + 25 | deux nombres de 10 à 99, chaque colonne ≤ 9, somme ≤ 99 | pavé | réf. 1.3 CE1 « additions de deux ou trois nombres à 1, 2 ou 3 chiffres (245 + 437) » |
| `pose-retenue-montree` | 38 + 47 | unités ≥ 10 (une retenue), somme ≤ 99 | pavé | même ligne |

Pourquoi ces bornes pour le « CE1 facile » :
- Le programme met le calcul du CE1 jusqu'à 1 000 et l'addition posée jusqu'à 3 chiffres. Le premier
  jet commence **sous 100** :
  - les tables viennent d'abord ;
  - puis les dizaines entières, sans retenue ;
  - puis + 9 et − 9, avec passage de la dizaine.
- Au CE1 difficile, on montera à 1 000 avec les mêmes procédures (234 + 60, 746 + 80, + 29), comme
  le prévoit le § 3.3 de la conception.

Le parcours d'une partie est fixe dans ce premier jet. Il est à revoir après l'essai :

| Jeu | Étapes |
|---|---|
| gué | 5 `gue-tables`, puis 4 `gue-dizaines`, puis 3 `gue-neuf` (12 pierres, comme le seuil de fluence de fin de CE1) |
| pierre | 2 `pose-sans-retenue`, puis 2 `pose-retenue-montree` |

Il n'y a pas de montée de palier d'une partie à l'autre (voir § 7).

## 4. Les phrases de Gobi à enregistrer

**Aucun clip n'existe.** Le jeu utilise le mécanisme de toutes les consignes : `BoutonEcouter` avec
une clé de manifeste. Pour cette règle (D42), le bouton « Écouter » est masqué tant que le clip
manque. Les textes s'affichent : la consigne en haut, le retour de Gobi en bas de la scène, l'aide
dans la bulle de Gobi. **Mais rien ne s'entend encore : R15 et S7 ne sont pas tenues pour le calcul
tant que ces voix ne sont pas produites.** Aucun fichier audio n'a été écrit.

Liste obtenue par `node bac-a-sable/maths-calcul/phrases-a-enregistrer.mjs` : `FIXES 21 FAITS 200
TOTAL 221`.

| Clé | Phrase |
|---|---|
| `maths-calcul/entree` | Choisis : la rivière ou la pierre à calcul. |
| `maths-calcul/consigne-gue` | Trouve le nombre qui manque. À chaque calcul, Gobi avance d'une pierre. |
| `maths-calcul/consigne-pose` | Calcule sur la pierre. Commence par la colonne des unités. |
| `maths-calcul/pas-encore-chiffre` | Pas encore. Essaie un autre chiffre. |
| `maths-calcul/pas-encore-nombre` | Pas encore. Essaie un autre nombre. |
| `maths-calcul/pas-encore-unites` | Pas encore. Regarde la colonne des unités. |
| `maths-calcul/pas-encore-dizaines` | Pas encore. Regarde la colonne des dizaines. |
| `maths-calcul/retenue` | Dix unités font une dizaine. Je pose la retenue en haut. |
| `maths-calcul/bravo-gue` | Bravo ! Gobi avance d'une pierre. |
| `maths-calcul/bravo-pose` | Bravo ! Ce calcul est juste. |
| `maths-calcul/fin-gue` | Bravo ! Gobi a traversé la rivière. |
| `maths-calcul/fin-pose` | Bravo ! Toute la pierre est remplie. |
| `maths-calcul/indice-somme` | Compte à partir du plus grand nombre. |
| `maths-calcul/indice-terme` | Cherche ce qu'il faut ajouter pour arriver au bout. |
| `maths-calcul/indice-difference` | Compte en reculant. |
| `maths-calcul/indice-dizaines` | Compte les dizaines. |
| `maths-calcul/indice-plus-neuf` | Ajoute dix, puis enlève un. |
| `maths-calcul/indice-plus-dix-neuf` | Ajoute vingt, puis enlève un. |
| `maths-calcul/indice-moins-neuf` | Enlève dix, puis ajoute un. |
| `maths-calcul/montre-touche` | Regarde : la bonne touche brille. |
| `maths-calcul/montre-choix` | Regarde : la bonne réponse brille. |

S'y ajoutent **200 indices de colonne**, des phrases entières sans fragments (§ 3.2) :
- clés `maths-calcul/fait/<a>+<b>` : « Cinq plus sept. » ;
- clés `maths-calcul/fait/<a>+<b>+r` : « Un plus quatre, plus la retenue. » ;
- `a` et `b` vont de 0 à 9.

**Contrôle lexical CE1.** Il a été exécuté avec `estAuLexique` de `scripts/generer-phonologie.mjs`.
Résultat : **44 mots hors lexique** :

> ajoute, ajouter, arriver, au, avance, bonne, bout, bravo, brille, calcul, calcule, chaque,
> cherche, chiffre, cinq, colonne, commence, d, dizaine, dizaines, encore, enlève, essaie, faut,
> font, gobi, huit, juste, manque, partir, pierre, pose, qu, reculant, regarde, remplie, retenue,
> réponse, sept, six, toute, traversé, unités, vingt

Ce lexique est la liste de **déchiffrage** des premières régions : même « au » ou « encore » n'y
sont pas. Ces phrases sont dites par Gobi et non lues par l'enfant. Les mots du programme (unité,
dizaine, retenue, chiffre, calcul) font partie de ce qu'il faut apprendre (conception § 3.0). Le
parent doit trancher : soit une liste nommée de mots exemptés pour les phrases **dites**, soit des
phrases à reformuler. **À arbitrer avant d'enregistrer.**

## 5. Mesures de tenue à l'écran

**La sonde.**
- Fichiers : `bac-a-sable/maths-calcul/calcul-sonde.spec.ts` et `playwright.sonde.config.ts`. Mêmes
  réglages que la sonde du socle : tactile, mouvement réduit, et les réglages de lecture réels de la
  tablette (Andika 27 px, interligne 2).
- Lancement : `node scripts/playwright.mjs test --config bac-a-sable/maths-calcul/playwright.sonde.config.ts`.
- Résultat : `6 passed (8.1s)`.
- Relevés bruts : `bac-a-sable/maths-calcul/sonde/mesure-<format>.json`, avec les captures à côté.
- **Défilement vertical** = `scrollHeight − innerHeight` du document, en px.
- **Plus petite cible** = le plus petit côté parmi les boutons visibles de l'écran de calcul.

| Format | Gué, réponses à choisir | Gué, pavé | Pierre, retenue montrée | Réussite | Plus petite cible (px) | Hors écran / recouvert | Encadré d'entrée visible sans défiler |
|---|---:|---:|---:|---:|---|---|---|
| **800 × 1100** (tablette portrait) | 0 | 0 | 0 | 0 | 64,5 | aucun | oui (bas à 367) |
| **1280 × 720** (tablette paysage) | 0 | 0 | 0 | 0 | 64 (touche 7) | aucun | oui (bas à 400) |
| **1366 × 768** (PC portable) | 0 | 0 | 0 | 0 | 64,5 | aucun | oui (bas à 402) |
| **1920 × 1080** (PC) | 0 | 0 | 0 | 0 | 64,5 | aucun | oui (bas à 406) |
| 1100 × 700 (tablette tournée, en plus) | 0 | 0 | 0 | 0 | 64 | aucun | oui (bas à 388) |
| 390 × 844 (téléphone, secondaire) | **692** | **721** | **685** | **321** | 64 | éléments sous le pli | oui (bas à 574) |

**Sur téléphone, la page défile.** La règle S2 le tolère, mais la disposition n'y est pas adaptée :
la réserve et Gobi passent sous le pli, et ce n'est pas traité dans ce lot.

## 6. Tests ajoutés

Comptes obtenus par commande, sorties citées.

| Fichier | Tests | Résultat | Vu rouge ? |
|---|---:|---|---|
| `tests/unitaires/mathematiques/calcul.test.ts` (logique, dont 6 propriétés fast-check) | 24 | `npx vitest run …calcul.test.ts` → `Tests 24 passed (24)` | **Oui** : écrit avant le code, rouge parce que le module manquait. **Mutation** (retenue non automatique) : 2 rouges, puis restauration |
| `tests/composants/mathematiques/EcranCalcul.test.tsx` (écran, clavier AZERTY, entrée) | 9 | `Tests 9 passed (9)` ; avec le précédent : `Tests 33 passed (33)` | **Non** avant le code (écrit après). **Mutation** (clavier lu par `key` seulement) : 2 rouges ; mutation de la retenue : 1 rouge ; puis restauration |
| `tests/e2e/parcours-calcul.spec.ts` (un gué et une pierre entiers, au doigt et au clavier, 4 formats, défilement 0, cibles ≥ 64, rien hors écran ni recouvert) | 4 | `node scripts/playwright.mjs test tests/e2e/parcours-calcul.spec.ts --project=parcours --no-deps` → `4 passed (5.4s)` | **Non** avant le code. **Mutation** (pavé repoussé de 1 200 px) : rouge, `défilement vertical Expected: 0 Received: 697`, puis restauration. Une première mutation, la scène forcée à 1 400 px, est restée verte : elle ne changeait rien à l'écran, ce n'était donc pas une preuve |

**Total : 37 tests ajoutés, 37 verts.**

Non-régression, mesurée sur les tests maths existants que l'insertion de l'encadré pouvait toucher :
- `EcranMathematiques.test.tsx` et `NavigationMathematiques.test.tsx`, avec les deux fichiers
  ci-dessus → `Tests 64 passed (64)` ;
- `parcours-mathematiques.spec.ts` et `parcours-vallee-lieux.spec.ts` → `6 passed (19.4s)`.

**Pas lancés**, à la demande de l'orchestrateur : `npm run verifier` et la suite complète. **Écart à
signaler** : une commande mal formée a lancé une fois tout le projet vitest `unitaires`, soit 162
fichiers, avec pour résultat `1981 passed`. Elle n'a pas été relancée.

Compilation : `npx tsc -b client` compile aussi `partage` par référence de projet, sans erreur.
ESLint sur les fichiers touchés : aucune remarque.

## 7. Fichiers

| Fichier | Rôle |
|---|---|
| `partage/src/mathematiques/jeux/calcul/index.ts` | **Neuf.** Logique pure : paliers, génération (via `Alea`), réducteur, aide, étoiles, phrases. Exporté par `partage/src/mathematiques/index.ts` |
| `client/src/mathematiques/calcul/EcranCalcul.tsx`, `EntreeCalcul.tsx`, `calcul.css` | **Neufs.** L'écran (sur `ecran-activite`, `DispositionMoteur`, `RepereEtape`, `Gobi`, `BoutonEcouter`) et l'encadré d'entrée |
| `client/src/mathematiques/EcranMathematiques.tsx` | 9 lignes ajoutées : l'encadré en tête de l'accueil et l'ouverture de l'écran de calcul. Rien de l'ancien code n'est retiré |
| `client/src/activite/DispositionMoteur.tsx` | **Seul ajout dans le socle** : `moteur` accepte `CodeMoteur \| CodeMoteurMaths` (`CodeMoteurMaths = 'calcul'`, déclaré dans `partage/src/mathematiques/jeux/calcul/index.ts`). Le registre des moteurs de lecture n'est pas touché : le calcul n'est pas un nœud de la carte |
| `tests/e2e/calcul-outils.ts` | Ouvrir le calcul, lire la réponse attendue dans le DOM, mesurer l'écran ; partagé avec la sonde |

## 8. Ce qui reste

1. **Les voix** : 221 phrases (§ 4), après l'arbitrage du lexique. Sans elles, R15 et S7 ne sont
   pas tenues pour le calcul.
2. **Le journal** : une partie de calcul n'écrit rien dans `tentatives`, ni en lecture ni en maths.
   Les étoiles, les erreurs, l'aide et la durée (la fluence, § 3.0) ne sont pas encore gardées, et la
   zone parent ne voit rien. À brancher avant de compter sur une progression.
3. **La montée des paliers** d'une partie à l'autre : CE1 facile, puis CE1 difficile jusqu'à 1 000,
   puis CE2. Plus le palier 3 de la retenue, où l'enfant l'écrit lui-même dans sa case.
4. **La soustraction posée par cassage** (§ 6 bis, Q3).
5. Ce qui manque encore :
   - entendre un nombre en le touchant (il faut un clip par nombre de la banque) ;
   - les cadres de dix en indice des tables (§ 3.3) ;
   - le décor de la rivière : le gué n'est qu'une rangée de pierres colorées.
6. **Le téléphone** : la page défile, de 321 à 721 px selon l'état (§ 5).
7. **La garde `socle-maths`** (`tests/qualite`, conception § 3.0) n'est pas créée. L'e2e couvre
   déjà les 4 formats visés pour le calcul.
8. **Le parent doit observer l'enfant** (R18) : compréhension seul, choix des réponses, pavé,
   retenue montrée. La question Q5 (chiffre par chiffre ou à la fin) est à revoir après cet essai.
