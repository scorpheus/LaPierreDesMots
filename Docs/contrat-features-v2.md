# Contrat des features v2 — gelé le 2026-08-01

**Statut** contrat gelé. Les 8 lots d'implantation s'y conforment sans pouvoir poser de question.
**Périmètre** tout ce qui reste à livrer après le socle v1 (décision D1), c'est-à-dire F1 à F8.
**Autorité** ce document ne révise ni la v2, ni l'annexe T, ni l'annexe P, ni le journal des
décisions. Il **prolonge** le [contrat technique v1](contrat-technique-v1.md), dont les
conventions du § 0 restent intégralement en vigueur. Quand il s'en écarte, l'écart est nommé au
§ 8 avec son motif.

**Ce document est le plan partagé.** Un lot ne reçoit en propre que les lignes qu'il possède ; il
lit ce fichier pour tout le reste. Il n'est recopié dans aucun brief (D10).

**Priorité, une seule fois, et elle commande tout le reste.** L'enfant déchiffre encore (D14, D18).
Le lot le plus important est **L2-A** : « c'est parce qu'il lit, donc c'est cool » (D26). Le
spectaculaire est déclenché par l'acte de lire ; il n'est jamais collé à côté.

---

## 0. Conventions — celles du v1, plus quatre

Les conventions du contrat v1 § 0 s'appliquent **sans exception** : français partout, identifiants
sans diacritiques, ESM strict, `nodenext`, **extension `.js` sur tout import relatif**,
`import type` obligatoire, `kebab-case.ts` / `PascalCase.tsx`, `Alea` et `Horloge` seuls,
UTF-8 sans BOM, LF.

Quatre conventions **nouvelles**, propres à cette campagne :

| # | Règle | Motif |
|---|---|---|
| **C1** | **Le barillet `@pierre/partage` n'accueille que des TYPES nouveaux. Toute VALEUR nouvelle passe par un sous-chemin.** | Budget de 250 Ko gzip (v2 § 13.5). Les types sont effacés à la compilation, une constante ne l'est pas. C'est la même contrainte qui a sorti Ajv et les factices du barillet en v1 (contrat v1 § 3.1). |
| **C2** | **Aucune valeur pédagogique, aucun seuil de récompense, aucun délai d'aide n'est écrit en dur dans le code.** Ils vivent dans `contenu/referentiel/parametres-*.json`, validés par un schéma, chargés au démarrage. | D13, en toutes lettres : « ces valeurs sont des paramètres déclarés en données, pas des constantes dans le code : elles seront recalibrées ». Un seuil en dur rend le rejeu T2 aveugle au changement. |
| **C3** | **Un fait mécanique n'est jamais affirmé dans un rapport de lot : il est mesuré, la commande et sa sortie sont citées.** | CLAUDE.md, règle 10. |
| **C4** | **Un livrable porte son contrat de sortie** : un chiffre que le lot calcule et qui échoue si le travail est creux. Un générateur refuse d'écrire plutôt que d'émettre du faux. | Annexe T § 1 : le premier risque du projet est la régression silencieuse. |

**Interdiction de créer un fichier non listé au § 3.** Un lot qui pense avoir besoin d'un fichier
absent de l'arborescence le signale dans son rapport au lieu de le créer : c'est un défaut du
contrat, à corriger en un seul endroit.

---

## 1. Inventaire de l'existant — mesuré, pas rapporté

Le code fait foi. Aucune ligne de cette section n'est tirée d'un document.

### 1.1 Volumétrie

```
$ git ls-files | wc -l
247

$ git ls-files | awk -F/ '{print $1}' | sort | uniq -c | sort -rn
     97 production      30 client        27 partage       19 tests
     17 serveur         17 Docs          11 scripts        9 contenu
      (+ 19 fichiers de racine : configs, .bat, README, CLAUDE.md, package-lock)

$ git ls-files '*.ts' '*.tsx' | grep -v dist-types | wc -l
83        # dont 3 fichiers de configuration (vite, vitest, playwright)

$ git log --oneline
14b0160 Socle v1 : le palier de relecture et les étoiles dérivées passent au vert
422e965 premier commit
```

### 1.2 Le socle v1 est **intégralement présent**

Les 129 fichiers déclarés au contrat v1 § 1 ont été extraits de ce document et confrontés au
disque :

```
$ grep -oE '^\| `[^`]+` \| L-[A-G] \|' Docs/contrat-technique-v1.md \
    | sed -E 's/^\| `([^`]+)`.*/\1/' > /tmp/decl.txt ; wc -l < /tmp/decl.txt
129
$ while read -r p; do [ -e "$p" ] || echo "ABSENT: $p"; done < /tmp/decl.txt
   (aucune sortie)
presents=129 absents=0
```

**Aucun fichier du contrat v1 ne manque.** Les 117 fichiers suivis restants sont hors périmètre
v1 : `production/` (97, campagne ComfyUI), `Docs/` (17), `README.md`, `CLAUDE.md`,
`package-lock.json`, `.claude/skills/generer-asset/SKILL.md`.

### 1.3 Ce qui est réellement implanté

| Couche | État mesuré |
|---|---|
| **Moteurs** | **1 sur 13**. `colorie` seul : `partage/src/moteurs/colorie/{types,validation,moteur,schema-contenu}.ts` + `client/src/moteurs/colorie/{index,MoteurColorie,SceneSvg,PaletteConsigne,recoloration}.tsx\|ts`. `CodeMoteur` déclare les 13 ; `MOTEURS` en contient un. |
| **Écrans** | **4** : `EcranProfils`, `EcranCarte`, `EcranNoeud`, `EcranRecompense`. Aucun campement, aucun coffre, aucun dashboard, aucun écran de réglages. |
| **Routes HTTP** | **7**, mesurées : `GET /api/sante`, `GET /api/profils`, `POST /api/profils`, `GET /api/profils/:id`, `GET /api/profils/:id/progression`, `GET /api/contenu/noeuds/:id`, `POST /api/tentatives`, plus le service statique `GET /api/contenu/assets/*`. |
| **Tables SQLite** | **3**, une seule migration : `profils`, `tentatives`, `progression_noeud`, plus l'index `idx_tentatives_profil_noeud`. Aucune table pédagogique, aucune table de monde, aucune table parent. |
| **Services partagés** | `Alea`, `Horloge`, `ErreurPierre` (15 codes), `normaliserTexte`, `calculerEtoiles`, `PALETTE` (7 jetons), `NUANCIER` (11 couleurs), registre de moteurs, 4 interfaces de fournisseurs (`Voix`, `Audio`, `LLM`, `DepotContenu`) et leurs factices. |
| **Pédagogie** | **néant**. Aucun BKT, aucun Leitner, aucun sélecteur. `scripts/test-rejeu.mjs` est une coquille qui sort en 0 et le déclare (écart v1 n° 7). |
| **Typographie** | **néant**. Aucune police embarquée, aucun réglage par profil. `client/public/` n'existe pas. |
| **Contenu jouable** | **1 nœud, 1 exercice, 1 habillage** : `clairiere-01` / `clairiere-ecole-01` / `clairiere.ecole` (30 régions). 3 compétences au référentiel. |
| **Chaîne de test** | 7 commandes réelles, 3 projets Vitest (`unitaires`, `composants`, `api`), 4 projets Playwright (`parcours`, `robustesse`, `visuel`, `qualite`). 19 fichiers de test. |

### 1.4 L'ingestion du niveau 1 est **déjà faite** — F7 doit en tenir compte

`contenu/brouillons/` est ignoré par git (`.gitignore`), mais il n'est pas vide sur disque :

```
$ ls contenu/brouillons/niveau-1/ | wc -l
16                      # 15 fiches + manifeste.json

$ head -c 400 contenu/brouillons/niveau-1/manifeste.json
  "fichesDuPdf": 15, "fichesIngerees": 15, "fichesRefusees": 0,
  "totalConsignes": 75, "totalAffirmations": 90, "textesNonFiables": 1,
  "consignesParType": { "colorie": 51, "place": 8, "autre": 16 }
```

**Le niveau 1 est ingéré : 15 fiches, 0 refus, 75 consignes et 90 affirmations.** Il reste
**90 fiches sur 6 niveaux**. Et le script est **de niveau 1 par construction** — il refuse tout
autre format, ce qui est un mérite et non un défaut :

```
$ grep -n "n'est pas celle du niveau 1" scripts/ingestion/extraire-fiches.py
258:            "n'est pas celle du niveau 1")
```

`reperer_entetes()` lève `RefusIngestion` si les deux en-têtes de colonne ne sont pas à leur
position mesurée, et `classer_consigne()` ne connaît que `colorie` / `place` / `autre`. F7 ajoute
**six formats**, il ne réécrit pas celui qui marche.

Deux faits qui commandent F7 : `.venv/` **n'existe pas** sur cette machine (`ls -d .venv` →
absent), et `production/workflows/` porte déjà 7 workflows ComfyUI figés.

### 1.4 bis — relecture du dépôt au moment de geler ce contrat

Une campagne parallèle a écrit pendant la rédaction. État relu juste avant clôture :

```
$ git status --porcelain
 M .env.exemple                            M package.json
 M client/src/ecrans/EcranProfils.tsx      M playwright.config.ts
 M client/src/moteurs/colorie/*.tsx        M scripts/test-visuel.mjs
 M client/src/styles/global.css            M scripts/verifier.mjs
 M client/src/testabilite/crochets.ts      M tests/composants/MoteurColorie.test.tsx
 M lefthook.yml
?? scripts/playwright.mjs
?? tests/visuel/noeud-colorie.spec.ts-snapshots/
```

Trois conséquences, et aucune n'invalide ce contrat :

1. **Les 129 fichiers du contrat v1 sont toujours tous présents** (recontrôlé : `presents=129
   absents=0`), `partage/src/moteurs/` ne contient toujours que `colorie`, et
   `serveur/migrations/` toujours que `001_socle.sql`. L'inventaire des § 1.2 et § 1.3 tient.
2. **`scripts/playwright.mjs` est nouveau et n'appartient à aucun lot de cette campagne.** Il est
   « le SEUL point d'entrée de Playwright dans ce dépôt », écrit pour tenir D9 : `npx playwright
   install chromium` écrit ~450 Mo **hors du dépôt**. **Aucun lot ne l'appelle autrement, et aucun
   lot ne le modifie** — il ne figure donc pas au § 3, et ce n'est pas un oubli.
3. `package.json` et `playwright.config.ts` viennent d'être touchés par cette campagne parallèle.
   Ils restent attribués à **L2-G** et **L2-B** respectivement : ces deux lots partent de l'état
   du disque, jamais d'une copie de ce document.

Le défaut 2 du § 1.5 a été **remesuré après ces écritures** : `grep -rn "as unknown as"
client/src | wc -l` rend toujours **28**.

### 1.5 Trois défauts mesurés du socle, que cette campagne doit solder

Ce ne sont pas des opinions : ce sont trois commandes et leurs sorties.

**Défaut 1 — les codes d'effet sonore divergent entre le contrat et son implantation.**

```
$ sed -n '15,23p' partage/src/fournisseurs/audio.ts | grep -oE "'[a-z-]+'"
'depot-correct' 'depot-refuse' 'recoloration' 'etoile' 'gobi-parle' 'transition-noeud' 'fin-noeud'

$ grep -oE "^  '?[a-z-]+'?:" client/src/services/audio-tone.ts
'depot-accepte'  'depot-refuse'  'consigne-terminee'  'etoile'  'exercice-termine'
```

**7 codes déclarés, 5 joués, 2 noms communs.** `depot-correct` — le son de la bonne réponse,
c'est-à-dire *le détail le plus rentable de toute la liste* selon la v2 § 8 — n'est jamais joué
sous ce nom. Le repli « tout code inconnu est joué comme `depot-accepte` » masque la divergence au
lieu de la signaler. **L2-A répare, dans les deux fichiers.**

**Défaut 2 — 28 transtypages défensifs dans le client.**

```
$ grep -rn "as unknown as" client/src --include=*.ts --include=*.tsx | wc -l
28        # répartis sur 12 fichiers
```

Ils portent tous le même commentaire : « le contrat gèle le nom mais pas les membres ». C'est ce
que L-D a écrit faute de voir la sortie de L-B. Chaque `as unknown as` est un endroit où le
compilateur ne protège plus rien. **Chaque lot qui touche un de ces 12 fichiers supprime les casts
de ce fichier**, puisqu'il a désormais les vrais types sous les yeux. Contrat de sortie de la
campagne : `grep -rn "as unknown as" client/src | wc -l` doit rendre **0**.

**Défaut 3 — la fiche de personnage de Gobi contredit le journal des décisions.**
`Docs/fiche-personnage-gobi.md` § 2 déclare « **Bras** : Aucun ». **D24 lève cette contrainte** :
Gobi a deux bras courts et robustes. Le journal fait foi (CLAUDE.md), la fiche est antérieure. Les
assets de L2-F suivent **D24 et D28**, pas la fiche. La fiche n'est pas modifiée par cette
campagne (règle 11).

---

## 2. Les huit lots, un par feature

| Lot | Feature | Mission, en une phrase | Il a fini quand |
|---|---|---|---|
| **L2-A** | F1 | **Le game feel et la cascade de récompenses de D25** : étoile → palier ~5 → palier ~10, jauge qui montre le vide restant, ≤ 14 particules, vibration 20 ms, hauteur montante selon la série, aimantation 24 px, réponse < 100 ms | `appliquerEtoiles` est prouvée par table, la jauge affiche `restant` et non `acquis`, `parcours-cascade` franchit les trois paliers, la latence d'appui est mesurée < 100 ms |
| **L2-B** | F2 | **La typographie de lecture (D19)** : 5 polices locales, interlettrage et espacement des mots, coloration syllabique, règle de lecture, réglages par profil avec aperçu en direct, et le protocole A/B qui mesure ce qui marche **pour lui** | Les 5 polices rendent sans appel réseau, `essais_typographie` produit deux bras comparables, 5 captures visuelles au vert |
| **L2-C** | F3 | **Les moteurs `place` (O6) et `trace` (O11)**, plus le socle commun des moteurs | `place` couvre les 8 consignes « Dessine… » mesurées au niveau 1 ; `trace` journalise l'**axe** de la confusion, jamais la paire en bloc |
| **L2-D** | F4 | **La pédagogie** : BKT avec `p_devinette` par mode de réponse et la clause des 2 tentatives, Leitner J+1/3/7/16/35, sélecteur de sortie | 12 propriétés `fast-check` au vert, `test:rejeu` cesse d'être une coquille, aucune valeur en dur |
| **L2-E** | F5 | **Les onze autres moteurs** et leurs 33 habillages déclaratifs | Les 13 moteurs sont enregistrés, R12 et R13 sont mesurées et non affirmées |
| **L2-F** | F6 | **La carte, le campement et Gobi** : parchemin, voile de Grisaille, chemin à l'encre, ≥ 25 points d'interaction, évolution tamagotchi **irréversible** | `auditerCampement` rend `conforme: true` sur données réelles, `stadeApresFormes` ne décroît jamais |
| **L2-G** | F7 | **L'ingestion des niveaux 2 à 7** : 6 formats, extraction par position, refus plutôt que faux | 90 fiches traitées ou refusées **avec motif**, jamais rendues à moitié ; sortie dans `contenu/brouillons/` uniquement |
| **L2-H** | F8 | **Le dashboard parent** : code à 4 chiffres scrypt, courbe de latence (D18), top 10 des confusions **par axe** (D23), carte de couverture, exports CSV, file de relecture | Le verrouillage tient après 5 échecs, aucune ligne de confusion n'agrège deux axes |

### 2.1 Ordre de lancement — trois vagues, et une seule barrière

**L2-C est sur le chemin critique**, comme L-E l'était en v1 : il écrit `partage/src/moteurs/commun/`,
que L2-E importe. **L2-D est sur le chemin critique du barillet** : il possède
`partage/src/index.ts`, `partage/package.json` et `partage/src/moteurs/types.ts`.

```
vague 1  ──▶  L2-D (types, barillet, paramètres)  ·  L2-C (commun, place, trace)
vague 2  ──▶  L2-A  ·  L2-B  ·  L2-F  ·  L2-G  ·  L2-H          (fichiers disjoints)
vague 3  ──▶  L2-E  (importe le commun de L2-C, clôt les deux registres)
```

**Une seule barrière justifiée** : entre la vague 2 et L2-E, parce que `partage/src/moteurs/tous.ts`
et `client/src/moteurs/registre-rendu.ts` ne compilent pas tant que les onze moteurs n'existent pas.
C'est la même inversion assumée qu'en v1 § 11.4, et pour la même raison : **l'oubli ne compile pas**,
au lieu de ne se voir qu'à l'exécution.

**L2-E est de très loin le plus gros lot** (147 fichiers). Son jeu de fichiers est partitionnable en
quatre groupes disjoints, à confier à quatre agents distincts, un seul écrivain par fichier :

| Sous-groupe | Moteurs | Fichiers |
|---|---|---|
| E1 | `attrape`, `tri`, `assemble` | 18 code + 18 habillage + 3 tests |
| E2 | `chemin`, `eclair`, `paires`, `grave` | 24 code + 24 habillage + 4 tests |
| E3 | `phrase`, `histoire`, `chrono`, `libre` | 24 code + 24 habillage + 4 tests |
| E4 | — | `tous.ts`, `registre-rendu.ts`, `moteurs-couverture.test.ts`, `parcours-variete.spec.ts` — **écrit en dernier**, quand E1 à E3 ont rendu |

### 2.2 Ce que l'orchestrateur vérifie lui-même

Reprise de la leçon d'orchestration de D10 et de CLAUDE.md, non négociable :

1. **Lire le rapport de chaque lot AVANT de compiler.** On paie deux fois quand on ne le fait pas.
2. **Vérifier que chaque symbole du § 4 a trouvé son propriétaire.** Un contrat gelé n'oblige
   personne tant qu'un fichier n'est nommé pour chaque morceau.
3. **La compilation reste à l'orchestrateur.** Jeton unique, aucun agent ne compile, aucun agent
   n'installe (D9, D10).
4. `npx playwright install chromium` et `python -m venv .venv` sont des **prérequis d'environnement**
   à sa charge. Leur absence est un défaut d'environnement, pas un défaut de code, et le rapport
   doit le nommer comme tel.

---

## 3. Arborescence complète, fichier par fichier

Convention de lecture : **(N)** fichier neuf · **(M)** fichier existant à modifier. Un fichier
marqué **(M)** n'a **qu'un seul** propriétaire pour toute la campagne, quel que soit le nombre de
lots qui en dépendent — c'est la règle « un seul écrivain par fichier », appliquée aux
modifications comme aux créations.

### 3.1 L2-A — game feel et récompenses (F1)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/fournisseurs/haptique.ts` | L2-A | (N) `FournisseurHaptique`, `CodeVibration` — l'API Vibration derrière une interface (annexe T § 2.3) |
| `partage/src/recompenses/types.ts` | L2-A | (N) `CodePalier`, `EtatCascade`, `JaugePalier`, `GainCascade`, `SeuilsCascade` |
| `partage/src/recompenses/cascade.ts` | L2-A | (N) `appliquerEtoiles`, `jaugesDe`, `ETAT_CASCADE_VIDE` — la cascade D25, pure |
| `partage/src/recompenses/parametres.ts` | L2-A | (N) Chargement et validation des seuils déclarés en données (C2) |
| `partage/src/recompenses/index.ts` | L2-A | (N) Barillet du sous-chemin `@pierre/partage/recompenses` |
| `partage/src/fournisseurs/audio.ts` | L2-A | (M) `CodeEffet` gagne `palier-intermediaire` et `palier-rare` ; répare le défaut 1 du § 1.5 |
| `client/src/gamefeel/haptique-navigateur.ts` | L2-A | (N) `navigator.vibrate`, repli silencieux si absent |
| `client/src/gamefeel/particules.ts` | L2-A | (N) Émission de **14 particules au maximum** (v2 § 8), Canvas 2D |
| `client/src/gamefeel/serie.ts` | L2-A | (N) Hauteur montante selon la série en cours — v2 § 8, D26 |
| `client/src/gamefeel/aimantation.ts` | L2-A | (N) Aimantation 24 px, `overshoot` 8 % |
| `client/src/gamefeel/ressort.ts` | L2-A | (N) Anticipation → impact → récupération, `stiffness 400 / damping 18` |
| `client/src/gamefeel/retour.ts` | L2-A | (N) `RetourSensoriel` : le point unique qui compose son, vibration, particules |
| `client/src/gamefeel/index.ts` | L2-A | (N) Surface du dossier |
| `client/src/composants/JaugePalier.tsx` | L2-A | (N) **Affiche le vide restant** (D25, point 3), jamais seulement l'acquis |
| `client/src/composants/Particules.tsx` | L2-A | (N) Couche de particules, supprimée sous `prefers-reduced-motion` |
| `client/src/composants/CascadeRecompense.tsx` | L2-A | (N) Les trois paliers à la clôture d'un nœud |
| `client/src/moteurs/types.ts` | L2-A | (M) `ServicesJeu` gagne `haptique` et `retour` |
| `client/src/etat/services.ts` | L2-A | (M) Construction des deux nouveaux services ; supprime ses casts défensifs |
| `client/src/etat/magasin.ts` | L2-A | (M) L'état de cascade entre au magasin ; supprime ses casts défensifs |
| `client/src/Application.tsx` | L2-A | (M) Racine de composition : injecte `RetourSensoriel` |
| `client/src/ecrans/EcranNoeud.tsx` | L2-A | (M) Hôte : jauge, retour sensoriel, réponse visible sous 100 ms |
| `client/src/ecrans/EcranRecompense.tsx` | L2-A | (M) La cascade à trois paliers remplace le seul décompte d'étoiles |
| `client/src/composants/Etoiles.tsx` | L2-A | (M) Étoiles en creux + jauge de palier ; jamais de rouge |
| `client/src/services/audio-tone.ts` | L2-A | (M) Aligne les recettes sur `CodeEffet`, applique `demiTons` |
| `serveur/migrations/004_cascade.sql` | L2-A | (N) `progression_cascade` — projection recalculable |
| `serveur/src/depots/cascade.ts` | L2-A | (N) Projection et `recalculerCascade(profilId)` |
| `contenu/referentiel/parametres-recompenses.json` | L2-A | (N) Les seuils 5 et 10 de D25, **en données** (C2) |
| `contenu/schemas/parametres-recompenses.schema.json` | L2-A | (N) Schéma des seuils |
| `eslint.config.js` | L2-A | (M) Interdit `navigator.vibrate` hors de `haptique-navigateur.ts` |
| `tests/unitaires/cascade.test.ts` | L2-A | (N) Table des trois paliers, propriétés de monotonie |
| `tests/unitaires/gamefeel-serie.test.ts` | L2-A | (N) La hauteur monte avec la série, se réinitialise sur refus |
| `tests/composants/JaugePalier.test.tsx` | L2-A | (N) La jauge affiche `restant` — assertion sur le DOM, pas sur le calcul |
| `tests/e2e/parcours-cascade.spec.ts` | L2-A | (N) Franchit les trois paliers, aucun `data-etat="echec"` |
| `tests/qualite/gamefeel-latence.spec.ts` | L2-A | (N) **Mesure** le délai appui → réponse visible, seuil 100 ms |

### 3.2 L2-B — typographie et lecture (F2)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/lecture/types.ts` | L2-B | (N) `CodePolice`, `ReglagesLecture`, `BornesReglages`, `SegmentSyllabe` |
| `partage/src/lecture/defauts.ts` | L2-B | (N) `REGLAGES_PAR_DEFAUT`, `BORNES_REGLAGES` — corps 16-40 px (v2 § 9.3) |
| `partage/src/lecture/syllabation.ts` | L2-B | (N) `decouperSyllabes` — coloration syllabique alternée |
| `partage/src/lecture/essai-typographie.ts` | L2-B | (N) **Le protocole A/B de D19**, déterministe |
| `partage/src/lecture/index.ts` | L2-B | (N) Barillet du sous-chemin `@pierre/partage/lecture` |
| `client/src/lecture/polices.ts` | L2-B | (N) Déclare les 5 familles, précharge, expose le repli système |
| `client/src/lecture/ZoneDeLecture.tsx` | L2-B | (N) **Le seul composant qui affiche du texte à déchiffrer** ; applique les réglages |
| `client/src/lecture/TexteSyllabe.tsx` | L2-B | (N) Coloration syllabique alternée |
| `client/src/lecture/RegleDeLecture.tsx` | L2-B | (N) Règle de lecture + surlignage de la ligne courante |
| `client/src/lecture/ApercuReglages.tsx` | L2-B | (N) Aperçu en direct (v2 § 9.3) |
| `client/src/ecrans/EcranReglagesLecture.tsx` | L2-B | (N) Réglages **par profil** |
| `client/src/styles/polices.css` | L2-B | (N) Les 5 `@font-face`, `font-display: block` |
| `client/src/styles/global.css` | L2-B | (M) Variables de lecture dérivées des réglages |
| `client/src/ecrans/EcranProfils.tsx` | L2-B | (M) Accès aux réglages de lecture ; supprime ses casts défensifs |
| `client/vite.config.ts` | L2-B | (M) Alias des nouveaux sous-chemins, `publicDir`, préchargement des polices |
| `client/public/polices/andika-regular.woff2` | L2-B | (N) Police par défaut de toute zone de lecture (v2 § 9.3) |
| `client/public/polices/andika-bold.woff2` | L2-B | (N) Graisse pour les mots cibles |
| `client/public/polices/opendyslexic-regular.woff2` | L2-B | (N) Embarquée pour l'adhésion, **jamais présentée comme un remède** (D19) |
| `client/public/polices/luciole-regular.woff2` | L2-B | (N) |
| `client/public/polices/belle-allure-gs.woff2` | L2-B | (N) Cursive scolaire |
| `client/public/polices/LICENCES.md` | L2-B | (N) Licence de chaque fichier + empreinte SHA-256 |
| `scripts/telecharger-polices.mjs` | L2-B | (N) Télécharge les WOFF2 **à l'installation**, empreintes épinglées, jamais à l'exécution |
| `serveur/migrations/002_lecture.sql` | L2-B | (N) `reglages_lecture`, `essais_typographie` |
| `serveur/src/depots/reglages.ts` | L2-B | (N) Lecture et écriture des réglages par profil |
| `serveur/src/routes/reglages.ts` | L2-B | (N) `GET`/`PUT /api/profils/:id/reglages`, `GET .../essai-typographie` |
| `contenu/referentiel/syllabation-exceptions.json` | L2-B | (N) Le lexique qui corrige la règle, mesuré et non deviné |
| `playwright.config.ts` | L2-B | (M) Projet `visuel` : matrice des 5 polices |
| `tests/unitaires/syllabation.test.ts` | L2-B | (N) Table de mots + propriété : la concaténation des syllabes rend le mot |
| `tests/unitaires/reglages-lecture.test.ts` | L2-B | (N) Bornes respectées, valeur hors bornes ramenée, jamais rejetée |
| `tests/unitaires/essai-typographie.test.ts` | L2-B | (N) Alternance déterministe, deux bras équilibrés |
| `tests/composants/ZoneDeLecture.test.tsx` | L2-B | (N) Chaque réglage produit une propriété CSS mesurable |
| `tests/visuel/polices.spec.ts` | L2-B | (N) 5 captures ; attrape le débordement en OpenDyslexic (annexe T § T4) |
| `tests/api/reglages.test.ts` | L2-B | (N) Étanchéité par profil |

### 3.3 L2-C — moteurs `place` et `trace`, socle commun (F3)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/moteurs/commun/delais.ts` | L2-C | (N) `DelaisAide`, `DELAIS_AIDE_PAR_DEFAUT` — hissé du colorie, **importé par L2-E** |
| `partage/src/moteurs/commun/aide.ts` | L2-C | (N) Escalade d'aide **monotone croissante** (contrat v1 § 5.6) |
| `partage/src/moteurs/commun/etapes.ts` | L2-C | (N) `progressionDepuisEtapes`, `resumeDepuisEtapes` — `reussi` toujours `true` |
| `partage/src/moteurs/commun/geometrie.ts` | L2-C | (N) `pointDansPolygone`, `distance`, `plusProcheSousTolerance` |
| `partage/src/moteurs/commun/index.ts` | L2-C | (N) Surface du socle commun |
| `partage/src/moteurs/place/types.ts` | L2-C | (N) `ContenuPlace`, `EtatPlace`, `ActionPlace`, `RelationSpatiale` |
| `partage/src/moteurs/place/validation.ts` | L2-C | (N) `evaluerDepot`, `zoneSousLeDoigt`, tolérance 24 px (R16) |
| `partage/src/moteurs/place/moteur.ts` | L2-C | (N) `moteurPlace` |
| `partage/src/moteurs/place/schema-contenu.ts` | L2-C | (N) `SCHEMA_CONTENU_PLACE` |
| `client/src/moteurs/place/index.ts` | L2-C | (N) `renduPlace` |
| `client/src/moteurs/place/MoteurPlace.tsx` | L2-C | (N) Composant hôte, dnd-kit, cibles ≥ 64 px |
| `client/src/moteurs/place/ScenePlace.tsx` | L2-C | (N) Scène et zones cibles |
| `client/src/moteurs/place/Reserve.tsx` | L2-C | (N) La réserve d'éléments, intrus compris |
| `partage/src/moteurs/trace/types.ts` | L2-C | (N) `ModeleLettre`, `TraitLettre`, `ContenuTrace`, `EtatTrace`, `ActionTrace` |
| `partage/src/moteurs/trace/validation.ts` | L2-C | (N) `evaluerTrait`, `sensRespecte`, `axeConfondu` — **le sens distingue `b` de `d`** |
| `partage/src/moteurs/trace/moteur.ts` | L2-C | (N) `moteurTrace` |
| `partage/src/moteurs/trace/schema-contenu.ts` | L2-C | (N) `SCHEMA_CONTENU_TRACE` |
| `client/src/moteurs/trace/index.ts` | L2-C | (N) `renduTrace` |
| `client/src/moteurs/trace/MoteurTrace.tsx` | L2-C | (N) Tracé au doigt, `PointerEvent`, aucune coordination fine (R16) |
| `client/src/moteurs/trace/GuidageLettre.tsx` | L2-C | (N) Guidage : départ, flèche de sens, couloir de tolérance |
| `client/src/moteurs/trace/echantillonnage.ts` | L2-C | (N) Rééchantillonnage du geste, indépendant de la fréquence du pointeur |
| `contenu/modeles-lettres/minuscules.json` | L2-C | (N) Les 26 minuscules, traits ordonnés et orientés |
| `contenu/schemas/modele-lettre.schema.json` | L2-C | (N) Schéma des modèles de lettres |
| `contenu/habillages/clairiere/ecole-place.habillage.json` | L2-C | (N) Habillage `place` de la fiche 1 |
| `contenu/habillages/clairiere/ecole-place.svg` | L2-C | (N) Décor bouchon D2, zones cibles fermées par construction |
| `contenu/habillages/galeries/tracer-cristal.habillage.json` | L2-C | (N) Habillage `trace`, région Galeries |
| `contenu/habillages/galeries/tracer-cristal.svg` | L2-C | (N) Décor bouchon |
| `contenu/exercices/clairiere/ecole-02-place.json` | L2-C | (N) **« Dessine un soleil dans le ciel »** — clôt l'écart v1 n° 3 |
| `contenu/exercices/galeries/miroir-bd-01.json` | L2-C | (N) Axe **gauche-droite** seul |
| `contenu/exercices/galeries/miroir-bp-01.json` | L2-C | (N) Axe **haut-bas** seul — jamais mélangé au précédent (D23) |
| `contenu/noeuds/galeries-01.json` | L2-C | (N) |
| `contenu/noeuds/galeries-02.json` | L2-C | (N) |
| `tests/unitaires/place-validation.test.ts` | L2-C | (N) Motifs de refus, tolérance, relations spatiales |
| `tests/unitaires/trace-validation.test.ts` | L2-C | (N) Le sens inverse est détecté ; l'axe rendu est celui de la paire |
| `tests/composants/MoteurPlace.test.tsx` | L2-C | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurTrace.test.tsx` | L2-C | (N) Idem, plus le geste interrompu |
| `tests/e2e/parcours-trace.spec.ts` | L2-C | (N) Un nœud `trace` de bout en bout |

### 3.4 L2-D — pédagogie (F4)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/pedagogie/types.ts` | L2-D | (N) `ModeReponse`, `AxeMiroir`, `ConfusionObservee`, `EtatMaitrise`, `ItemLeitner`, `PlanSortie` |
| `partage/src/pedagogie/miroir.ts` | L2-D | (N) `PAIRES_MIROIR`, `axeDeLaPaire` — **sous-chemin dédié**, ~1 Ko, importé par le client |
| `partage/src/pedagogie/bkt.ts` | L2-D | (N) `mettreAJourMaitrise`, `pDevinette`, `estAcquise` |
| `partage/src/pedagogie/leitner.ts` | L2-D | (N) `promouvoir`, `retrograder`, `estDue`, `itemsDus` |
| `partage/src/pedagogie/selecteur.ts` | L2-D | (N) `composerSortie` — échauffement, révision au rang 3, réussite en clôture |
| `partage/src/pedagogie/parametres.ts` | L2-D | (N) Chargement et validation des paramètres déclarés en données (C2) |
| `partage/src/pedagogie/index.ts` | L2-D | (N) Barillet du sous-chemin `@pierre/partage/pedagogie` |
| `partage/src/moteurs/types.ts` | L2-D | (M) `ResumeEtape` gagne `modeReponse`, `latenceMs`, `confusion` |
| `partage/src/index.ts` | L2-D | (M) **Le barillet.** N'accueille que des types nouveaux (C1) |
| `partage/package.json` | L2-D | (M) Les 6 sous-chemins nouveaux du § 5.1 |
| `serveur/migrations/003_pedagogie.sql` | L2-D | (N) `maitrise_competence`, `items_leitner`, `sorties`, `etapes_tentative` |
| `serveur/src/depots/maitrise.ts` | L2-D | (N) Projection BKT, `recalculerMaitrise(profilId)` |
| `serveur/src/depots/leitner.ts` | L2-D | (N) Boîtes et échéances |
| `serveur/src/depots/etapes.ts` | L2-D | (N) Journal des étapes — **append-only**, porte la latence et les confusions |
| `serveur/src/routes/pedagogie.ts` | L2-D | (N) `GET /api/profils/:id/maitrise`, `.../revisions` |
| `serveur/src/routes/sortie.ts` | L2-D | (N) `POST /api/profils/:id/sortie` — compose une sortie |
| `serveur/src/routes/tentatives.ts` | L2-D | (M) Alimente BKT, Leitner et le journal d'étapes |
| `serveur/src/depots/tentatives.ts` | L2-D | (M) Écrit `etapes_tentative` dans la même transaction |
| `contenu/referentiel/parametres-pedagogie.json` | L2-D | (N) **Les valeurs de D13 et de la v2 § 12.2, en données** |
| `contenu/schemas/parametres-pedagogie.schema.json` | L2-D | (N) Schéma des paramètres |
| `contenu/referentiel/competences.json` | L2-D | (M) **OBJET PROTÉGÉ** (annexe P § 6.4) : on **ajoute** des codes, on n'en renomme ni renumérote aucun |
| `vitest.config.ts` | L2-D | (M) Alias des 6 sous-chemins nouveaux |
| `scripts/test-rejeu.mjs` | L2-D | (M) **Cesse d'être une coquille** : rejoue les journaux et compare aux références |
| `tests/fixtures/journaux/journal-reference-01.jsonl` | L2-D | (N) Journal de référence, prénom anonymisé |
| `tests/fixtures/journaux/reference-01.attendu.json` | L2-D | (N) Agrégats attendus après rejeu |
| `tests/unitaires/bkt.test.ts` | L2-D | (N) Propriétés P1 à P5 du § 4.4 |
| `tests/unitaires/leitner.test.ts` | L2-D | (N) Propriétés P6 à P8, 90 jours simulés |
| `tests/unitaires/selecteur.test.ts` | L2-D | (N) Propriétés P9 à P12, 200 sorties simulées (R13) |
| `tests/unitaires/miroir.test.ts` | L2-D | (N) Les 4 paires, les 2 axes, aucune paire sans axe |
| `tests/unitaires/parametres-pedagogie.test.ts` | L2-D | (N) **Aucune valeur en dur** : le test échoue si le code n'a pas lu le JSON |
| `tests/api/pedagogie.test.ts` | L2-D | (N) Idempotence de la mise à jour, recalcul identique à l'incrémental |
| `tests/api/sortie.test.ts` | L2-D | (N) Structure d'une sortie composée |

### 3.5 L2-E — les onze autres moteurs (F5)

**Le motif est uniforme et non négociable** : 4 fichiers dans `partage/` (logique pure) et
2 dans `client/` (rendu) par moteur, exactement comme `colorie` au contrat v1 § 1.5. Chaque
moteur publie sa validation, ses motifs de refus, ses paliers d'aide — pris de
`partage/src/moteurs/commun/` écrit par L2-C — et sa règle d'échec doux. Le **barème d'étoiles
n'est jamais réimplanté** : `calculerEtoiles` reste le seul endroit où il vit (contrat v1 § 5.7),
et `jeu.etoiles` de l'exercice dit quels critères comptent.

#### 3.5.1 Les 66 fichiers de code

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/moteurs/attrape/types.ts` | L2-E | (N) `ContenuAttrape`, `EtatAttrape`, `ActionAttrape` — toucher les bonnes cibles mobiles parmi des intrus |
| `partage/src/moteurs/attrape/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/attrape/moteur.ts` | L2-E | (N) `moteurAttrape` |
| `partage/src/moteurs/attrape/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_ATTRAPE` |
| `client/src/moteurs/attrape/index.ts` | L2-E | (N) `renduAttrape` |
| `client/src/moteurs/attrape/MoteurAttrape.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/tri/types.ts` | L2-E | (N) `ContenuTri`, `EtatTri`, `ActionTri` — ranger des éléments dans 2 ou 3 réceptacles |
| `partage/src/moteurs/tri/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/tri/moteur.ts` | L2-E | (N) `moteurTri` |
| `partage/src/moteurs/tri/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_TRI` |
| `client/src/moteurs/tri/index.ts` | L2-E | (N) `renduTri` |
| `client/src/moteurs/tri/MoteurTri.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/assemble/types.ts` | L2-E | (N) `ContenuAssemble`, `EtatAssemble`, `ActionAssemble` — faire glisser des blocs-syllabes pour former un mot |
| `partage/src/moteurs/assemble/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/assemble/moteur.ts` | L2-E | (N) `moteurAssemble` |
| `partage/src/moteurs/assemble/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_ASSEMBLE` |
| `client/src/moteurs/assemble/index.ts` | L2-E | (N) `renduAssemble` |
| `client/src/moteurs/assemble/MoteurAssemble.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/chemin/types.ts` | L2-E | (N) `ContenuChemin`, `EtatChemin`, `ActionChemin` — tracer une route en enchaînant les bonnes cases |
| `partage/src/moteurs/chemin/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/chemin/moteur.ts` | L2-E | (N) `moteurChemin` |
| `partage/src/moteurs/chemin/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_CHEMIN` |
| `client/src/moteurs/chemin/index.ts` | L2-E | (N) `renduChemin` |
| `client/src/moteurs/chemin/MoteurChemin.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/eclair/types.ts` | L2-E | (N) `ContenuEclair`, `EtatEclair`, `ActionEclair` — un mot apparaît brièvement, le retrouver — porte la latence de reconnaissance (D18) |
| `partage/src/moteurs/eclair/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/eclair/moteur.ts` | L2-E | (N) `moteurEclair` |
| `partage/src/moteurs/eclair/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_ECLAIR` |
| `client/src/moteurs/eclair/index.ts` | L2-E | (N) `renduEclair` |
| `client/src/moteurs/eclair/MoteurEclair.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/paires/types.ts` | L2-E | (N) `ContenuPaires`, `EtatPaires`, `ActionPaires` — appariement mot / image, memory |
| `partage/src/moteurs/paires/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/paires/moteur.ts` | L2-E | (N) `moteurPaires` |
| `partage/src/moteurs/paires/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_PAIRES` |
| `client/src/moteurs/paires/index.ts` | L2-E | (N) `renduPaires` |
| `client/src/moteurs/paires/MoteurPaires.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/phrase/types.ts` | L2-E | (N) `ContenuPhrase`, `EtatPhrase`, `ActionPhrase` — ordonner des étiquettes-mots |
| `partage/src/moteurs/phrase/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/phrase/moteur.ts` | L2-E | (N) `moteurPhrase` |
| `partage/src/moteurs/phrase/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_PHRASE` |
| `client/src/moteurs/phrase/index.ts` | L2-E | (N) `renduPhrase` |
| `client/src/moteurs/phrase/MoteurPhrase.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/histoire/types.ts` | L2-E | (N) `ContenuHistoire`, `EtatHistoire`, `ActionHistoire` — lire un texte court puis répondre — vrai/faux et QCM (niveaux 2 à 4) |
| `partage/src/moteurs/histoire/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/histoire/moteur.ts` | L2-E | (N) `moteurHistoire` |
| `partage/src/moteurs/histoire/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_HISTOIRE` |
| `client/src/moteurs/histoire/index.ts` | L2-E | (N) `renduHistoire` |
| `client/src/moteurs/histoire/MoteurHistoire.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/chrono/types.ts` | L2-E | (N) `ContenuChrono`, `EtatChrono`, `ActionChrono` — remettre des vignettes dans l'ordre du récit (niveau 5) |
| `partage/src/moteurs/chrono/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/chrono/moteur.ts` | L2-E | (N) `moteurChrono` |
| `partage/src/moteurs/chrono/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_CHRONO` |
| `client/src/moteurs/chrono/index.ts` | L2-E | (N) `renduChrono` |
| `client/src/moteurs/chrono/MoteurChrono.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/grave/types.ts` | L2-E | (N) `ContenuGrave`, `EtatGrave`, `ActionGrave` — compléter un mot lettre par lettre (niveau 6) |
| `partage/src/moteurs/grave/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/grave/moteur.ts` | L2-E | (N) `moteurGrave` |
| `partage/src/moteurs/grave/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_GRAVE` |
| `client/src/moteurs/grave/index.ts` | L2-E | (N) `renduGrave` |
| `client/src/moteurs/grave/MoteurGrave.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |
| `partage/src/moteurs/libre/types.ts` | L2-E | (N) `ContenuLibre`, `EtatLibre`, `ActionLibre` — coloriage sans consigne — la sortie de secours à un tap (v2 § 5.4) |
| `partage/src/moteurs/libre/validation.ts` | L2-E | (N) Validation, motifs de refus, règle d'échec doux |
| `partage/src/moteurs/libre/moteur.ts` | L2-E | (N) `moteurLibre` |
| `partage/src/moteurs/libre/schema-contenu.ts` | L2-E | (N) `SCHEMA_CONTENU_LIBRE` |
| `client/src/moteurs/libre/index.ts` | L2-E | (N) `renduLibre` |
| `client/src/moteurs/libre/MoteurLibre.tsx` | L2-E | (N) Composant hôte, cibles ≥ 64 px, tolérance 24 px |

#### 3.5.2 Les 66 fichiers d'habillage — 3 par moteur (v2 § 7, R12, R13)

Le dossier n'est pas la région : `contenu/habillages/campement/` porte des habillages dont le
champ `region` vaut `clairiere`, parce que le campement n'est pas une des six régions de la
v2 § 3.3 et que `Habillage.region` est une `CodeRegion`.

| Chemin | Lot | Rôle |
|---|---|---|
| `contenu/habillages/clairiere/lucioles.habillage.json` | L2-E | (N) Habillage `attrape` — R12/R13 |
| `contenu/habillages/clairiere/lucioles.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/marais-jumeau/poissons.habillage.json` | L2-E | (N) Habillage `attrape` — R12/R13 |
| `contenu/habillages/marais-jumeau/poissons.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/volcan/etoiles-filantes.habillage.json` | L2-E | (N) Habillage `attrape` — R12/R13 |
| `contenu/habillages/volcan/etoiles-filantes.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/paniers.habillage.json` | L2-E | (N) Habillage `tri` — R12/R13 |
| `contenu/habillages/clairiere/paniers.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/volcan/wagons.habillage.json` | L2-E | (N) Habillage `tri` — R12/R13 |
| `contenu/habillages/volcan/wagons.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/galeries/grottes.habillage.json` | L2-E | (N) Habillage `tri` — R12/R13 |
| `contenu/habillages/galeries/grottes.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/marais-jumeau/ponton.habillage.json` | L2-E | (N) Habillage `assemble` — R12/R13 |
| `contenu/habillages/marais-jumeau/ponton.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/volcan/train.habillage.json` | L2-E | (N) Habillage `assemble` — R12/R13 |
| `contenu/habillages/volcan/train.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/collier.habillage.json` | L2-E | (N) Habillage `assemble` — R12/R13 |
| `contenu/habillages/clairiere/collier.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/marais-jumeau/nenuphars.habillage.json` | L2-E | (N) Habillage `chemin` — R12/R13 |
| `contenu/habillages/marais-jumeau/nenuphars.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/foret-muette/pas-japonais.habillage.json` | L2-E | (N) Habillage `chemin` — R12/R13 |
| `contenu/habillages/foret-muette/pas-japonais.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/lianes.habillage.json` | L2-E | (N) Habillage `chemin` — R12/R13 |
| `contenu/habillages/clairiere/lianes.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/marais-jumeau/orage.habillage.json` | L2-E | (N) Habillage `eclair` — R12/R13 |
| `contenu/habillages/marais-jumeau/orage.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/luciole.habillage.json` | L2-E | (N) Habillage `eclair` — R12/R13 |
| `contenu/habillages/clairiere/luciole.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/galeries/cristal.habillage.json` | L2-E | (N) Habillage `eclair` — R12/R13 |
| `contenu/habillages/galeries/cristal.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/marais-jumeau/coquillages.habillage.json` | L2-E | (N) Habillage `paires` — R12/R13 |
| `contenu/habillages/marais-jumeau/coquillages.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/foret-muette/bestiaire.habillage.json` | L2-E | (N) Habillage `paires` — R12/R13 |
| `contenu/habillages/foret-muette/bestiaire.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/cartes.habillage.json` | L2-E | (N) Habillage `paires` — R12/R13 |
| `contenu/habillages/cite-des-histoires/cartes.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/foret-muette/message.habillage.json` | L2-E | (N) Habillage `phrase` — R12/R13 |
| `contenu/habillages/foret-muette/message.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/banniere.habillage.json` | L2-E | (N) Habillage `phrase` — R12/R13 |
| `contenu/habillages/cite-des-histoires/banniere.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/guirlande.habillage.json` | L2-E | (N) Habillage `phrase` — R12/R13 |
| `contenu/habillages/clairiere/guirlande.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/clairiere/veillee.habillage.json` | L2-E | (N) Habillage `histoire` — R12/R13 |
| `contenu/habillages/clairiere/veillee.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/theatre-ombres.habillage.json` | L2-E | (N) Habillage `histoire` — R12/R13 |
| `contenu/habillages/cite-des-histoires/theatre-ombres.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/bibliotheque.habillage.json` | L2-E | (N) Habillage `histoire` — R12/R13 |
| `contenu/habillages/cite-des-histoires/bibliotheque.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/volcan/fresque.habillage.json` | L2-E | (N) Habillage `chrono` — R12/R13 |
| `contenu/habillages/volcan/fresque.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/pellicule.habillage.json` | L2-E | (N) Habillage `chrono` — R12/R13 |
| `contenu/habillages/cite-des-histoires/pellicule.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/cite-des-histoires/vitrail.habillage.json` | L2-E | (N) Habillage `chrono` — R12/R13 |
| `contenu/habillages/cite-des-histoires/vitrail.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/galeries/pierre.habillage.json` | L2-E | (N) Habillage `grave` — R12/R13 |
| `contenu/habillages/galeries/pierre.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/volcan/sable.habillage.json` | L2-E | (N) Habillage `grave` — R12/R13 |
| `contenu/habillages/volcan/sable.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/foret-muette/buee.habillage.json` | L2-E | (N) Habillage `grave` — R12/R13 |
| `contenu/habillages/foret-muette/buee.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/campement/chaudron.habillage.json` | L2-E | (N) Habillage `libre` — R12/R13 |
| `contenu/habillages/campement/chaudron.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/campement/page-blanche.habillage.json` | L2-E | (N) Habillage `libre` — R12/R13 |
| `contenu/habillages/campement/page-blanche.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |
| `contenu/habillages/campement/vitrail-libre.habillage.json` | L2-E | (N) Habillage `libre` — R12/R13 |
| `contenu/habillages/campement/vitrail-libre.svg` | L2-E | (N) Décor bouchon D2, régions fermées par construction |

#### 3.5.3 Les 15 fichiers restants de L2-E

| Chemin | Lot | Rôle |
|---|---|---|
| `tests/composants/MoteurAttrape.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurTri.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurAssemble.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurChemin.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurEclair.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurPaires.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurPhrase.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurHistoire.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurChrono.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurGrave.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `tests/composants/MoteurLibre.test.tsx` | L2-E | (N) Bonne réponse, mauvaise, aide, double-tap |
| `partage/src/moteurs/tous.ts` | L2-E | (M) `MOTEURS` passe de 1 à 13 — **écrit en dernier** (sous-groupe E4) |
| `client/src/moteurs/registre-rendu.ts` | L2-E | (M) `registreRendu` passe de 1 à 13 entrées ; supprime ses casts défensifs |
| `tests/unitaires/moteurs-couverture.test.ts` | L2-E | (N) **R12 mesurée** : ≥ 3 moteurs distincts par compétence, sur le contenu réel |
| `tests/e2e/parcours-variete.spec.ts` | L2-E | (N) **R13 mesurée** : une sortie ne rejoue jamais le même habillage |

### 3.6 L2-F — carte, campement, Gobi (F6)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/monde/types.ts` | L2-F | (N) `EtatRegion`, `EtatCarte`, `PointInteraction`, `ObjetCampement`, `Compagnon` |
| `partage/src/monde/gobi.ts` | L2-F | (N) `stadeApresFormes` — évolution **irréversible** (D28) |
| `partage/src/monde/campement.ts` | L2-F | (N) `auditerCampement` — R11 **mesurée**, jamais affirmée |
| `partage/src/monde/carte.ts` | L2-F | (N) `regionsOuvertes` — deux régions en parallèle dès la troisième (v2 § 3.3) |
| `partage/src/monde/compagnons.ts` | L2-F | (N) Les 4 compagnons de la v2 § 4.3 et ce qu'ils changent |
| `partage/src/monde/index.ts` | L2-F | (N) Barillet du sous-chemin `@pierre/partage/monde` |
| `client/src/ecrans/EcranCampement.tsx` | L2-F | (N) Le hub — tente, feu, carte, coffre, mur des noms, chaudron, lunette |
| `client/src/ecrans/EcranCoffre.tsx` | L2-F | (N) Collections : formes de Gobi, éclats, objets |
| `client/src/ecrans/EcranCarte.tsx` | L2-F | (M) Carte au trésor sur parchemin ; supprime ses casts défensifs |
| `client/src/monde/Parchemin.tsx` | L2-F | (N) Le support de la carte (v2 § 9.4) |
| `client/src/monde/CheminEncre.tsx` | L2-F | (N) Le chemin qui se dessine à l'encre |
| `client/src/monde/VoileGrisaille.tsx` | L2-F | (N) Brouillard mouvant sur les régions non ouvertes |
| `client/src/monde/PointLibre.tsx` | L2-F | (N) Émet `data-interaction="libre"` — la prise de R11 |
| `client/src/monde/MurDesNoms.tsx` | L2-F | (N) Mots maîtrisés, rejouables en un tap, **jamais retirés** (v2 § 5.4) |
| `client/src/monde/Chaudron.tsx` | L2-F | (N) Entrée du coloriage libre — la sortie de secours à un tap |
| `client/src/composants/Gobi.tsx` | L2-F | (M) 5 états d'animation, stades, **le cristal porte les déclinaisons** (D20) |
| `client/src/composants/Compagnon.tsx` | L2-F | (N) Filou, Bulle, Roc, Plume |
| `client/src/routeur.tsx` | L2-F | (M) Table des routes complète, y compris celles de L2-B et L2-H |
| `serveur/migrations/005_monde.sql` | L2-F | (N) `progression_region`, `compagnons`, `formes_gobi`, `campement`, `stade_gobi` |
| `serveur/src/depots/monde.ts` | L2-F | (N) Lecture et écriture du monde par profil |
| `serveur/src/routes/monde.ts` | L2-F | (N) `GET /api/profils/:id/monde`, `POST .../campement` |
| `contenu/monde/regions.json` | L2-F | (N) Les 6 régions, leur ordre et leurs compétences (v2 § 3.3) |
| `contenu/monde/campement.json` | L2-F | (N) **≥ 25 points d'interaction, ≥ 10 animations uniques, ≥ 6 répliques** |
| `contenu/monde/gobi-stades.json` | L2-F | (N) Les stades et leur seuil en formes — **PLACEHOLDER à valider** (D28) |
| `contenu/monde/compagnons.json` | L2-F | (N) Les 4 compagnons |
| `contenu/schemas/monde.schema.json` | L2-F | (N) Schéma des quatre fichiers ci-dessus |
| `contenu/habillages/campement/campement.svg` | L2-F | (N) Décor du hub, points d'interaction en régions fermées |
| `contenu/habillages/carte/carte-monde.svg` | L2-F | (N) La carte au trésor, 6 régions en calques |
| `contenu/assets/gobi/stade-1-oeuf.svg` | L2-F | (N) **PLACEHOLDER** — forme canonique non validée (D7, D31 étape A) |
| `contenu/assets/gobi/stade-2-boule.svg` | L2-F | (N) PLACEHOLDER |
| `contenu/assets/gobi/stade-3-crete.svg` | L2-F | (N) PLACEHOLDER |
| `contenu/assets/gobi/stade-4-equipe.svg` | L2-F | (N) PLACEHOLDER |
| `contenu/assets/gobi/stade-5-gardien.svg` | L2-F | (N) PLACEHOLDER |
| `contenu/assets/gobi/cristal-base.svg` | L2-F | (N) Le cristal seul : c'est **lui** qui se décline, pas le corps (D20) |
| `tests/unitaires/gobi-evolution.test.ts` | L2-F | (N) Propriété : le rang de stade ne décroît **jamais** (D28, R14) |
| `tests/unitaires/campement-audit.test.ts` | L2-F | (N) **R11 sur le fichier réel** — échoue si `campement.json` est sous les seuils |
| `tests/unitaires/carte.test.ts` | L2-F | (N) Ouverture des régions, parallélisme à partir de la troisième |
| `tests/composants/EcranCampement.test.tsx` | L2-F | (N) Compte les `[data-interaction="libre"]` dans le DOM monté |
| `tests/e2e/parcours-campement.spec.ts` | L2-F | (N) R11 mesurée en E2E (annexe T § 4) |
| `tests/visuel/carte.spec.ts` | L2-F | (N) Région grise → région colorée, et ça reste après rechargement |
| `tests/api/monde.test.ts` | L2-F | (N) Étanchéité stricte entre profils (v2 § 11) |

### 3.7 L2-G — ingestion des niveaux 2 à 7 (F7)

**Le niveau 1 est déjà ingéré (§ 1.4). L2-G ne le refait pas** : il extrait le code existant dans
`formats/niveau1.py` sans en changer une règle, et le manifeste du niveau 1 doit rester identique
au bit près après refactorisation. C'est le contrat de sortie de la première étape du lot.

| Chemin | Lot | Rôle |
|---|---|---|
| `scripts/ingestion/extraire-fiches.py` | L2-G | (M) Devient un aiguilleur : choisit le format d'après `--niveau` |
| `scripts/ingestion/formats/__init__.py` | L2-G | (N) Paquet des formats |
| `scripts/ingestion/formats/commun.py` | L2-G | (N) `Fragment`, `Ligne`, `Item`, groupement, normalisation |
| `scripts/ingestion/formats/niveau1.py` | L2-G | (N) **Extraction à l'identique** de l'existant, aucune règle modifiée |
| `scripts/ingestion/formats/niveau2.py` | L2-G | (N) Texte documentaire + 8 vrai/faux — `histoire`, `modeReponse: vrai-faux` |
| `scripts/ingestion/formats/niveau3.py` | L2-G | (N) « Entoure la bonne image » — `paires`, `modeReponse: qcm-3` |
| `scripts/ingestion/formats/niveau4.py` | L2-G | (N) « Colorie la bonne réponse » — QCM 3 options |
| `scripts/ingestion/formats/niveau5.py` | L2-G | (N) « Numérote de 1 à 5 » — `chrono`, `modeReponse: ordre` |
| `scripts/ingestion/formats/niveau6.py` | L2-G | (N) Phrase à trou amorcée — `grave`, `modeReponse: saisie` |
| `scripts/ingestion/formats/niveau7.py` | L2-G | (N) **REFUSE et le déclare** : O7 n'est pas tranché (§ 8) |
| `scripts/ingestion/geometrie.py` | L2-G | (N) Séparation de colonnes, repérage d'en-têtes, bbox — **par position** |
| `scripts/ingestion/refus.py` | L2-G | (N) `RefusIngestion` et le vocabulaire fermé des motifs |
| `scripts/ingestion/manifeste.py` | L2-G | (N) Le manifeste **porte les deux comptes et leur écart** (C4) |
| `scripts/ingestion/extraire-illustrations.py` | L2-G | (N) Découpe la bbox mesurée en PNG |
| `scripts/ingestion/vectoriser.py` | L2-G | (N) potrace → SVG à régions fermées, appelle `outils/bin/` |
| `scripts/ingestion/requirements.txt` | L2-G | (M) Ajoute `Pillow` épinglé pour la découpe |
| `scripts/telecharger-outils.mjs` | L2-G | (M) Télécharge potrace dans `outils/bin/` (D9) |
| `scripts/ingerer.mjs` | L2-G | (N) Enveloppe Node : crée `.venv/`, installe, lance, agrège |
| `package.json` | L2-G | (M) Ajoute le script `ingerer` |
| `contenu/schemas/brouillon.schema.json` | L2-G | (N) Schéma des brouillons — un brouillon hors schéma est un refus |
| `tests/unitaires/brouillon-schema.test.ts` | L2-G | (N) Valide les 3 fixtures contre le schéma |
| `tests/unitaires/manifeste-ingestion.test.ts` | L2-G | (N) `ingerees + refusees == fichesDuPdf`, **toujours** |
| `tests/fixtures/ingestion/manifeste-niveau-1.json` | L2-G | (N) **Le manifeste actuel, figé** : la refactorisation doit le reproduire |
| `tests/fixtures/ingestion/brouillon-niveau-2.json` | L2-G | (N) Fixture de format 2 |
| `tests/fixtures/ingestion/brouillon-niveau-5.json` | L2-G | (N) Fixture de format 5 |
| `tests/fixtures/ingestion/refus-niveau-7.json` | L2-G | (N) Le refus attendu, avec son motif écrit |

### 3.8 L2-H — dashboard parent (F8)

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/parent/types.ts` | L2-H | (N) `PointLatence`, `ConfusionAgregee`, `CouvertureRegion`, `EntreeRelecture`, `VerrouParent` |
| `partage/src/parent/indicateurs.ts` | L2-H | (N) Agrégations pures : médianes, quartiles, tendance 14 jours |
| `partage/src/parent/index.ts` | L2-H | (N) Barillet du sous-chemin `@pierre/partage/parent` |
| `partage/src/api/contrats.ts` | L2-H | (M) **Tous** les chemins nouveaux, y compris ceux de L2-B, L2-D et L2-F |
| `serveur/migrations/006_parent.sql` | L2-H | (N) `code_parent`, `verrou_parent`, `relecture_contenu` |
| `serveur/src/depots/parent.ts` | L2-H | (N) Code, verrou, file de relecture |
| `serveur/src/routes/parent.ts` | L2-H | (N) Zone protégée : ouverture, indicateurs, exports, relecture |
| `serveur/src/services/code-parent.ts` | L2-H | (N) `scrypt`, comparaison à temps constant, verrouillage après 5 échecs |
| `serveur/src/services/indicateurs.ts` | L2-H | (N) Requêtes sur `etapes_tentative` — latence, confusions **par axe**, couverture |
| `serveur/src/services/export-csv.ts` | L2-H | (N) Exports CSV, séparateur `;`, BOM UTF-8 pour Excel FR |
| `serveur/src/application.ts` | L2-H | (M) Enregistre les routes des 5 lots serveur |
| `client/src/api/client.ts` | L2-H | (M) `fetch` typé sur les chemins nouveaux ; supprime ses casts défensifs |
| `client/src/ecrans/EcranCodeParent.tsx` | L2-H | (N) Pavé à 4 chiffres, message de verrouillage sans reproche |
| `client/src/ecrans/EcranDashboard.tsx` | L2-H | (N) L'écran parent, hors du monde de l'enfant |
| `client/src/parent/CourbeLatence.tsx` | L2-H | (N) **L'indicateur principal** (D18) : médiane et quartiles dans le temps |
| `client/src/parent/TopConfusions.tsx` | L2-H | (N) Top 10 **par axe**, bouton « travailler ça » (D23) |
| `client/src/parent/CarteCouverture.tsx` | L2-H | (N) Carte annotée par maîtrise réelle — repère le colorié mal acquis |
| `client/src/parent/FileRelecture.tsx` | L2-H | (N) Relecture des brouillons avant qu'ils atteignent l'enfant |
| `client/src/parent/BoutonExport.tsx` | L2-H | (N) Exports CSV |
| `client/src/parent/ReglagesParent.tsx` | L2-H | (N) Volumes, animations calmes, sauvegarde |
| `tests/unitaires/indicateurs.test.ts` | L2-H | (N) Médiane, quartiles, tendance ; **aucune entrée n'agrège deux axes** |
| `tests/unitaires/code-parent.test.ts` | L2-H | (N) scrypt, 5 échecs → verrou, expiration du verrou |
| `tests/api/parent.test.ts` | L2-H | (N) Zone protégée : code faux ×5 → 423, code juste → dashboard |
| `tests/e2e/parcours-parent.spec.ts` | L2-H | (N) Le parcours de l'annexe T § T3, ligne « Zone parent » |
| `tests/qualite/a11y-parent.spec.ts` | L2-H | (N) axe-core sur les deux écrans parent |

---

## 4. Le code exact des types partagés

Un lot qui doit **deviner** un type produit du code qui ne compile pas. Tout ce qui traverse une
frontière est écrit ici, en entier. Un lot qui a besoin d'un symbole absent de ce chapitre a trouvé
un défaut du contrat : il le signale, il ne l'ajoute pas de son propre chef.

### 4.1 L2-A — récompenses, game feel

```ts
// partage/src/fournisseurs/haptique.ts — L2-A
import type { CodeErreur } from '../erreurs.js';

/**
 * Les trois moments où l'appareil vibre. Aucun autre. En particulier : **jamais sur un refus** —
 * l'erreur est un mouvement, pas une punition (v2 § 8, contrat v1 § 5.6).
 */
export type CodeVibration = 'depot-correct' | 'palier-franchi' | 'apparition';

/**
 * L'API Vibration derrière une interface (annexe T § 2.3), pour deux raisons : les tests ne
 * doivent rien déclencher, et `prefers-reduced-motion` doit pouvoir tout couper en un point.
 */
export interface FournisseurHaptique {
  /** Ne rend rien et ne lève jamais : une vibration ratée n'est pas une erreur de jeu. */
  vibrer(code: CodeVibration): void;
  /** Faux quand l'appareil n'a pas de moteur, ou quand les animations calmes sont actives. */
  readonly disponible: boolean;
}

/** Erreur exposée pour mémoire : le fournisseur n'en lève aucune. */
export type _ErreurHaptiqueJamaisLevee = CodeErreur;
```

```ts
// partage/src/recompenses/types.ts — L2-A
import type { CheminAsset, CodeRegion, Horodatage } from '../identifiants.js';

/**
 * La cascade de D25, dans l'ordre. Le mapping avec le système de l'école est direct et
 * délibéré : étoile → tampon spécial → image. Ce système motive DÉJÀ l'enfant ; on capitalise
 * sur du mesuré, pas sur une théorie.
 */
export type CodePalier = 'etoile' | 'intermediaire' | 'rare';

/** Ce que rapporte le palier. `rare` est une IMAGE, ou son équivalent (D25, point 2). */
export type NatureRecompense = 'etoile' | 'forme-gobi' | 'objet-campement' | 'zone-recoloriee';

export interface SeuilsCascade {
  /** ~5 à l'école. Déclaré en données (C2), jamais en dur. */
  readonly etoilesParIntermediaire: number;
  /** ~10 à l'école. */
  readonly intermediairesParRare: number;
  readonly natureIntermediaire: NatureRecompense;
  readonly natureRare: NatureRecompense;
}

export interface EtatCascade {
  readonly etoilesTotal: number;
  readonly etoilesDepuisIntermediaire: number;
  readonly intermediairesTotal: number;
  readonly intermediairesDepuisRare: number;
  readonly raresTotal: number;
  readonly dernierPalierLe: Horodatage | null;
}

/**
 * Ce qu'une jauge AFFICHE.
 *
 * `restant` est un champ, pas une soustraction laissée à la vue. D25 point 3 : « ce qui motive,
 * c'est de voir la case suivante vide ». Une jauge qui ne porte que `acquis` laisse la vue libre
 * de n'afficher que l'acquis — et c'est exactement l'erreur que ce champ interdit.
 */
export interface JaugePalier {
  readonly palier: CodePalier;
  readonly acquis: number;
  readonly requis: number;
  readonly restant: number;
  readonly nature: NatureRecompense;
}

export interface RecompenseObtenue {
  readonly palier: CodePalier;
  readonly nature: NatureRecompense;
  /** Ce qui est effectivement remis : un graphème, un objet, une zone. `null` pour l'étoile. */
  readonly reference: string | null;
  readonly asset: CheminAsset | null;
  readonly region: CodeRegion | null;
}

export interface GainCascade {
  readonly etat: EtatCascade;
  /** Dans l'ordre de franchissement. Vide si aucun palier n'a été franchi. */
  readonly paliersFranchis: readonly CodePalier[];
  readonly recompenses: readonly RecompenseObtenue[];
  /** Toujours les trois jauges, toujours dans l'ordre `etoile`, `intermediaire`, `rare`. */
  readonly jauges: readonly JaugePalier[];
}
```

```ts
// partage/src/recompenses/cascade.ts — L2-A
import type { EtatCascade, GainCascade, JaugePalier, SeuilsCascade } from './types.js';
import type { NombreEtoiles } from '../journal/types.js';
import type { Horodatage } from '../identifiants.js';

export const ETAT_CASCADE_VIDE: EtatCascade;

/**
 * Fonction PURE. Applique les étoiles d'un nœud terminé et rend le nouvel état, les paliers
 * franchis et les trois jauges.
 *
 * Deux invariants opposables, vérifiés par `tests/unitaires/cascade.test.ts` :
 *  1. Aucun compteur ne décroît jamais — un acquis n'est jamais repris (R14).
 *  2. Un seul appel peut franchir plusieurs paliers (5 étoiles d'un coup) : `paliersFranchis`
 *     les porte tous, dans l'ordre.
 */
export function appliquerEtoiles(
  etat: EtatCascade,
  etoiles: NombreEtoiles,
  seuils: SeuilsCascade,
  maintenant: Horodatage,
): GainCascade;

/** Les trois jauges de l'état courant, sans rien appliquer. */
export function jaugesDe(etat: EtatCascade, seuils: SeuilsCascade): readonly JaugePalier[];
```

```ts
// partage/src/recompenses/parametres.ts — L2-A
import type { SeuilsCascade } from './types.js';

/**
 * Lit `contenu/referentiel/parametres-recompenses.json`. C2 : ces valeurs seront recalibrées,
 * elles ne vivent donc pas dans le code. La fonction LÈVE `ErreurPierre('contenu-invalide')`
 * plutôt que de rendre un défaut silencieux : un paramètre absent doit se voir au démarrage.
 */
export function lireSeuilsCascade(donnees: unknown): SeuilsCascade;
```

```ts
// client/src/gamefeel/retour.ts — L2-A
import type { CodePalier } from '@pierre/partage';

export interface OptionsDepot {
  /** Point de l'événement, en coordonnées CSS. Origine des particules et du balayage. */
  readonly origine: readonly [number, number];
  /**
   * Longueur de la série de bonnes réponses en cours, à partir de 1. v2 § 8 : « 2ᵉ bonne
   * réponse = un demi-ton plus haut, comme les pièces de Mario. C'est le détail le plus
   * rentable de toute la liste. »
   */
  readonly serie: number;
}

/**
 * LE point unique qui compose son, vibration et particules.
 *
 * Aucun composant n'appelle `FournisseurAudio` ni `FournisseurHaptique` directement : sinon la
 * dégradation par `prefers-reduced-motion` serait à réécrire à chaque site d'appel, et un seul
 * oubli suffirait à la casser.
 *
 * Toutes les méthodes résolvent en moins de 100 ms (v2 § 8) : elles déclenchent, elles
 * n'attendent pas la fin de l'effet.
 */
export interface RetourSensoriel {
  depotCorrect(options: OptionsDepot): Promise<void>;
  /** Oscillation 6 px / 180 ms, son NEUTRE et court. Aucune vibration, aucun rouge. */
  depotRefuse(): Promise<void>;
  palierFranchi(palier: CodePalier): Promise<void>;
  /** Remet la série à zéro. Appelé sur refus et au changement de consigne. */
  reinitialiserSerie(): void;
  readonly animationsDesactivees: boolean;
}

export interface OptionsRetour {
  readonly audio: import('@pierre/partage').FournisseurAudio;
  readonly haptique: import('@pierre/partage').FournisseurHaptique;
  readonly animationsDesactivees: boolean;
  readonly emettreParticules: (origine: readonly [number, number], nombre: number) => void;
}

export function creerRetourSensoriel(options: OptionsRetour): RetourSensoriel;
```

```ts
// client/src/gamefeel/serie.ts — L2-A
/** Demi-tons ajoutés au son de réussite pour une série donnée. Plafonné : rien ne sonne faux. */
export function demiTonsDeSerie(serie: number, plafond?: number): number;
/** Plafond par défaut : une octave. Au-delà, la hauteur ne monte plus. PLACEHOLDER — à valider. */
export const PLAFOND_DEMI_TONS = 12;
```

```ts
// client/src/gamefeel/particules.ts — L2-A
/** v2 § 8 : **14 au maximum**, jamais une de plus. La constante est la seule autorité. */
export const PARTICULES_MAX = 14;

export interface OptionsParticules {
  readonly origine: readonly [number, number];
  readonly nombre: number;
  readonly couleur: string;
  readonly dureeMs: number;
}
/** Ne fait rien si `prefers-reduced-motion` : le fonctionnel reste, le décoratif disparaît. */
export function emettreParticules(
  canevas: HTMLCanvasElement,
  options: OptionsParticules,
): void;
```

```ts
// client/src/gamefeel/aimantation.ts — L2-A
/** v2 § 8 et R16 : aimantation sur les 24 derniers pixels, `overshoot` de 8 %. */
export const AIMANTATION_PX = 24;
export const OVERSHOOT = 0.08;

export interface ResultatAimantation {
  readonly position: readonly [number, number];
  readonly aimante: boolean;
  readonly distancePx: number;
}
export function aimanter(
  point: readonly [number, number],
  cible: readonly [number, number],
  seuilPx?: number,
): ResultatAimantation;
```

```ts
// client/src/moteurs/types.ts — L2-A (MODIFIÉ)
// `ServicesJeu` gagne deux membres. Le reste du fichier (contrat v1 § 4.4) est inchangé,
// y compris la note normative sur `emettre` déclarée en méthode.
export interface ServicesJeu {
  readonly alea: Alea;
  readonly horloge: Horloge;
  readonly voix: FournisseurVoix;
  readonly audio: FournisseurAudio;
  readonly haptique: FournisseurHaptique;
  readonly retour: RetourSensoriel;
}
```

### 4.2 L2-B — typographie et lecture

```ts
// partage/src/lecture/types.ts — L2-B
import type { CodeCompetence, Horodatage, IdProfil } from '../identifiants.js';

/**
 * Les 5 polices de la v2 § 9.3, embarquées localement. **Aucun appel réseau à l'exécution.**
 *
 * `verdana` n'est PAS embarquée : c'est une police système propriétaire, qui ne peut pas être
 * redistribuée dans le dépôt. Elle est proposée et rendue par la pile système ; si elle est
 * absente, `polices.ts` retombe sur `andika`. C'est un écart assumé, § 8, n° 5.
 */
export type CodePolice = 'andika' | 'opendyslexic' | 'luciole' | 'belle-allure' | 'verdana';

export type FondLecture = 'parchemin' | 'sombre';

/**
 * Les réglages de lecture, **par profil** (D19, v2 § 9.3).
 *
 * L'espacement n'est pas un réglage à monter par défaut : un espacement large DÉGRADE la vitesse
 * des lecteurs rapides (Frontiers 2020, cité en D19). Il se mesure et se redescend à mesure que
 * l'enfant progresse — d'où `essai-typographie.ts`.
 */
export interface ReglagesLecture {
  readonly police: CodePolice;
  /** 16 à 40 px (v2 § 9.3). */
  readonly corpsPx: number;
  /** Interlettrage en em. Zorzi 2012 : +2,5 pt ≈ +0,10 em au corps 24 — le levier le plus prouvé. */
  readonly interlettrageEm: number;
  /** Espacement des mots, en em, ajouté à l'espace naturel. */
  readonly espacementMotsEm: number;
  /** Interligne, sans unité : multiple du corps. */
  readonly interligne: number;
  readonly colorationSyllabique: boolean;
  readonly surlignageLigneCourante: boolean;
  readonly regleDeLecture: boolean;
  readonly fond: FondLecture;
}

/** Bornes d'un réglage numérique. Une valeur hors bornes est RAMENÉE, jamais rejetée. */
export interface BorneReglage {
  readonly min: number;
  readonly max: number;
  readonly pas: number;
  readonly defaut: number;
}

export interface BornesReglages {
  readonly corpsPx: BorneReglage;
  readonly interlettrageEm: BorneReglage;
  readonly espacementMotsEm: BorneReglage;
  readonly interligne: BorneReglage;
}

/** Un morceau de mot, avec son rang : c'est le rang qui décide de la couleur alternée. */
export interface SegmentSyllabe {
  readonly texte: string;
  readonly rang: number;
  /**
   * `false` quand le découpage vient de la règle et non du lexique d'exceptions. La coloration
   * s'affiche quand même — mais le dashboard peut compter les cas incertains.
   */
  readonly certain: boolean;
}

// ------------------------------------------------------------------ protocole A/B de D19

/**
 * Un essai typographique : même compétence, même type d'item, **police alternée d'une session à
 * l'autre**. L'enfant ne voit jamais qu'on compare ; le parent voit les courbes.
 */
export interface EssaiTypographie {
  readonly id: string;
  readonly profil: IdProfil;
  readonly competence: CodeCompetence;
  /** Les deux bras comparés. Toujours exactement deux : une comparaison à trois n'est pas lisible. */
  readonly bras: readonly [ConfigurationBras, ConfigurationBras];
  readonly ouvertLe: Horodatage;
  readonly clotureLe: Horodatage | null;
}

export interface ConfigurationBras {
  readonly police: CodePolice;
  readonly interlettrageEm: number;
}

export interface ResultatBras {
  readonly configuration: ConfigurationBras;
  readonly nbTentatives: number;
  /** Latence de reconnaissance médiane — l'indicateur de D18. */
  readonly latenceMedianeMs: number;
  readonly tauxErreur: number;
}

export interface ComparaisonTypographie {
  readonly essai: EssaiTypographie;
  readonly resultats: readonly [ResultatBras, ResultatBras];
  /**
   * `null` tant que les deux bras n'ont pas au moins `tentativesMinParBras` mesures.
   * **Ne jamais conclure sur un bras à trois tentatives** : c'est ce que ce `null` protège.
   */
  readonly brasFavorable: ConfigurationBras | null;
}
```

```ts
// partage/src/lecture/defauts.ts — L2-B
import type { BornesReglages, ReglagesLecture } from './types.js';

/**
 * Andika par défaut (v2 § 9.3). L'interlettrage part à `0.06 em` — au-dessus du normal, en
 * dessous du maximum : D19 dit que c'est probablement le vrai levier, et que la transposition
 * du corpus dyslexique à un lecteur débutant reste une HYPOTHÈSE. On part au milieu, on mesure.
 * PLACEHOLDER — la valeur de départ est à valider par la mesure, pas par la conviction.
 */
export const REGLAGES_PAR_DEFAUT: ReglagesLecture;
export const BORNES_REGLAGES: BornesReglages;

/** Ramène chaque champ dans ses bornes. Ne rejette jamais : l'enfant ne doit pas être bloqué. */
export function normaliserReglages(bruts: Partial<ReglagesLecture>): ReglagesLecture;

/** Les variables CSS à poser sur la zone de lecture. Un seul endroit les nomme. */
export function variablesCss(reglages: ReglagesLecture): Readonly<Record<string, string>>;
```

```ts
// partage/src/lecture/syllabation.ts — L2-B
import type { SegmentSyllabe } from './types.js';

/**
 * Découpe un mot en syllabes pour la coloration alternée.
 *
 * Règle, puis exceptions — dans cet ordre, et l'ordre compte : le lexique
 * `contenu/referentiel/syllabation-exceptions.json` gagne toujours sur la règle. Un mot du
 * lexique rend `certain: true` ; un mot découpé par la règle rend `certain: false`.
 *
 * INVARIANT opposable, vérifié par propriété : `segments.map(s => s.texte).join('') === mot`,
 * pour tout mot. Un découpage qui perd ou duplique une lettre est un défaut, pas une
 * approximation.
 */
export function decouperSyllabes(
  mot: string,
  exceptions?: Readonly<Record<string, readonly string[]>>,
): readonly SegmentSyllabe[];
```

```ts
// partage/src/lecture/essai-typographie.ts — L2-B
import type {
  ComparaisonTypographie, ConfigurationBras, EssaiTypographie, ResultatBras,
} from './types.js';

/** Nombre de mesures minimal par bras avant de nommer un favori. PLACEHOLDER — à valider. */
export const TENTATIVES_MIN_PAR_BRAS = 20;

/**
 * Le bras actif d'une session. DÉTERMINISTE : c'est le numéro de session qui décide, pas
 * l'aléatoire — sinon deux sessions du même jour pourraient tirer le même bras et la
 * comparaison ne serait plus équilibrée.
 */
export function brasDeSession(essai: EssaiTypographie, numeroSession: number): ConfigurationBras;

/** Rend `brasFavorable: null` tant que les deux bras n'ont pas `TENTATIVES_MIN_PAR_BRAS`. */
export function comparer(
  essai: EssaiTypographie,
  resultats: readonly [ResultatBras, ResultatBras],
): ComparaisonTypographie;
```

### 4.3 L2-C — socle commun des moteurs, `place`, `trace`

#### 4.3.1 Le socle commun — écrit par L2-C, **importé par L2-E**

```ts
// partage/src/moteurs/commun/delais.ts — L2-C
/**
 * Les seuils d'aide, hissés hors de `colorie` pour que les treize moteurs les partagent.
 * Valeurs du contrat v1 § 5.8, reprises à l'identique — un moteur qui en veut d'autres les
 * reçoit par son habillage, il ne les recode pas.
 */
export interface DelaisAide {
  /** Relecture automatique de la consigne. RÉÉCOUTE, pas aide : sans coût (R15). */
  readonly relectureMs: number;
  readonly indiceMs: number;
  readonly demonstrationMs: number;
  readonly erreursAvantIndice: number;
  readonly erreursAvantDemonstration: number;
}

export const DELAIS_AIDE_PAR_DEFAUT: DelaisAide;
```

```ts
// partage/src/moteurs/commun/aide.ts — L2-C
import type { AideProposee, NiveauAide } from '../types.js';
import type { DelaisAide } from './delais.js';

/** Le minimum qu'un état de moteur doit exposer pour que l'escalade d'aide s'applique. */
export interface EtatAidable {
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly debutMs: number;
  readonly derniereActionMs: number;
  /** Instant du passage à `indice`, `null` tant qu'il n'a pas eu lieu. */
  readonly instantIndiceMs: number | null;
}

/**
 * Le niveau d'aide qui s'impose à cet instant.
 *
 * INVARIANT DUR, opposable en revue : la fonction est **monotone croissante**. Elle ne rend
 * jamais un niveau inférieur à `etat.niveauAide`. Une aide obtenue n'est jamais retirée
 * (contrat v1 § 5.6, R14). Un moteur qui régresse le niveau d'aide viole R14.
 */
export function niveauAideSuivant(
  etat: EtatAidable,
  maintenantMs: number,
  delais: DelaisAide,
): NiveauAide;

/** Vrai après `relectureMs` d'inactivité. Ne change JAMAIS `niveauAide` : c'est gratuit (R15). */
export function doitRelire(
  etat: EtatAidable,
  maintenantMs: number,
  delais: DelaisAide,
): boolean;

/** L'aide à proposer, ou `null` si le niveau courant n'appelle rien de nouveau. */
export function construireAide(
  niveau: NiveauAide,
  cible: string | null,
  texte: string | null,
): AideProposee | null;
```

```ts
// partage/src/moteurs/commun/etapes.ts — L2-C
import type { NiveauAide, ProgressionMoteur, ResumeEtape, ResumeTentative } from '../types.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';

/** L'étape générique : ce que tout moteur sait dire de l'une de ses étapes. */
export interface EtapeGenerique {
  readonly identifiant: string;
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  /** Instant de la PREMIÈRE action de l'enfant sur cette étape — origine de la latence. */
  readonly premiereActionMs: number | null;
  readonly modeReponse: ModeReponse;
  readonly confusion: ConfusionObservee | null;
}

export function progressionDepuisEtapes(
  etapes: readonly EtapeGenerique[],
  indexCourant: number,
): ProgressionMoteur;

export function resumeEtapeDepuis(etape: EtapeGenerique, finMs: number): ResumeEtape;

/**
 * `reussi` vaut **toujours `true`**. Ce n'est pas un défaut de conception, c'est R14 :
 * `false` est structurellement inatteignable pour tout moteur de ce projet. Un lot qui écrit
 * `reussi: false` viole la règle de non-échec et sera repris en revue.
 */
export function resumeDepuisEtapes(
  etapes: readonly EtapeGenerique[],
  debutMs: number,
  finMs: number,
): ResumeTentative;
```

```ts
// partage/src/moteurs/commun/geometrie.ts — L2-C
export type Point = readonly [number, number];
export type Polygone = readonly Point[];

export function distance(a: Point, b: Point): number;
/** Lancer de rayon, robuste aux sommets. Un point sur l'arête est DEDANS. */
export function pointDansPolygone(point: Point, polygone: Polygone): boolean;
export function centroide(polygone: Polygone): Point;
export function aire(polygone: Polygone): number;
/** Index du plus proche centroïde sous `tolerance`, ou `null`. Jamais un refus : on ignore. */
export function plusProcheSousTolerance(
  point: Point,
  candidats: readonly Point[],
  tolerance: number,
): number | null;
```

#### 4.3.2 Le moteur `place` — clôt le point ouvert O6

```ts
// partage/src/moteurs/place/types.ts — L2-C
import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { Point, Polygone } from '../commun/geometrie.js';
import type { NiveauAide, AideProposee } from '../types.js';
import type { FormeConsigne } from '../colorie/types.js';

export type IdElement = string;
export type IdZoneCible = string;

/**
 * La relation spatiale exercée. **C'est la raison d'être du moteur** : « à côté de », « dans le
 * ciel », « sur le banc » exercent la localisation spatiale, que le coloriage n'exerce pas du
 * tout (fiches-origine § 3, quatrième observation).
 */
export type RelationSpatiale =
  | 'dans' | 'sur' | 'sous' | 'a-cote-de'
  | 'devant' | 'derriere' | 'entre' | 'au-dessus' | 'en-dessous';

export interface ElementPlacable {
  readonly id: IdElement;
  /** « un soleil » — sert à l'aide vocale et au libellé a11y. */
  readonly libelle: string;
  readonly asset: CheminAsset;
  /** Taille de rendu en unités `viewBox`. Contrôlée contre la règle des 64 px. */
  readonly taille: readonly [number, number];
}

export interface ZoneCible {
  readonly id: IdZoneCible;
  readonly libelle: string;
  /** Polygone FERMÉ en coordonnées `viewBox`, au moins 3 points. */
  readonly polygone: Polygone;
  readonly centroide: Point;
  readonly relation: RelationSpatiale;
  /** L'ancre de la relation : « à côté **du banc** ». `null` pour « dans le ciel ». */
  readonly ancre: string | null;
}

export interface DepotAttendu {
  readonly element: IdElement;
  readonly zone: IdZoneCible;
}

export interface ConsignePlace {
  readonly id: IdConsigne;
  readonly texte: string;
  /** Comme pour `colorie` : l'affirmation qui vaut consigne doit survivre (F3). */
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS dépôts — même leçon que `cibles` en `colorie`. */
  readonly depots: readonly DepotAttendu[];
  readonly motsCles: readonly string[];
}

export interface ContenuPlace {
  readonly consignes: readonly ConsignePlace[];
  readonly zones: readonly ZoneCible[];
  /** La réserve offerte à l'enfant : éléments attendus **et intrus**. */
  readonly reserve: readonly ElementPlacable[];
}

export interface RefusPlace {
  readonly element: IdElement | null;
  readonly zone: IdZoneCible | null;
  readonly motif: MotifRefusPlace;
  readonly instantMs: number;
}

export interface EtatConsignePlace {
  readonly id: IdConsigne;
  readonly depotsRestants: readonly DepotAttendu[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
}

export interface EtatPlace {
  readonly indexConsigne: number;
  readonly consignes: readonly EtatConsignePlace[];
  /** Clé = `IdElement`. Une entrée = un élément posé, définitivement. */
  readonly places: Readonly<Record<string, IdZoneCible>>;
  readonly elementSaisi: IdElement | null;
  /** Position courante du glissé, pour l'aimantation. `null` hors glissé. */
  readonly pointCourant: Point | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusPlace | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionPlace =
  | { readonly type: 'saisir'; readonly element: IdElement }
  | { readonly type: 'glisser'; readonly point: Point }
  | { readonly type: 'deposer'; readonly point: Point }
  | { readonly type: 'abandonner' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
```

```ts
// partage/src/moteurs/place/validation.ts — L2-C
import type { ContenuPlace, EtatPlace, IdElement, IdZoneCible } from './types.js';
import type { Point } from '../commun/geometrie.js';

/** R16 : 24 px de tolérance sur toute cible de dépôt, sans exception. */
export const TOLERANCE_DEPOT_PX = 24;

export type MotifRefusPlace =
  | 'zone-hors-consigne'    // la zone n'est pas une cible de la consigne active
  | 'element-hors-consigne' // l'élément saisi n'est pas attendu ici (c'est un intrus)
  | 'zone-deja-occupee'     // la zone porte déjà son élément
  | 'aucun-element-saisi'   // dépôt sans saisie préalable
  | 'hors-scene';           // le doigt est sorti du dessin

/**
 * Deux motifs sur cinq seulement sont des erreurs de LECTURE. Même raisonnement qu'au contrat
 * v1 § 5.5 : `zone-deja-occupee` est le double-tap, `aucun-element-saisi` et `hors-scene` sont
 * des gestes, pas des contresens. Un geste ne coûte rien.
 */
export const REFUS_PLACE_COMPTE_ERREUR: Readonly<Record<MotifRefusPlace, boolean>>;

/**
 * Zone désignée par un point, en coordonnées `viewBox`.
 * 1. Le point tombe dans un polygone → c'est lui.
 * 2. Sinon, le centroïde le plus proche sous `tolerance`.
 * 3. Sinon `null` : le dépôt est **ignoré**, l'élément retourne à la réserve. Aucun refus,
 *    aucun son, aucun compte. Un doigt qui glisse hors du dessin ne coûte rien.
 */
export function zoneSousLeDoigt(
  contenu: ContenuPlace,
  point: Point,
  tolerance?: number,
): IdZoneCible | null;

export interface DecisionDepot {
  readonly acceptee: boolean;
  readonly zone: IdZoneCible | null;
  readonly motif: MotifRefusPlace | null;
  readonly compteErreur: boolean;
  readonly consigneSatisfaite: boolean;
  readonly exerciceTermine: boolean;
}

/** Fonction pure. Ne modifie pas l'état ; `reduire` s'en sert pour le construire. */
export function evaluerDepot(
  etat: EtatPlace,
  contenu: ContenuPlace,
  element: IdElement | null,
  point: Point,
): DecisionDepot;
```

```ts
// partage/src/moteurs/place/moteur.ts — L2-C
export const moteurPlace: Moteur<ContenuPlace, EtatPlace, ActionPlace>;

// partage/src/moteurs/place/schema-contenu.ts — L2-C
export const SCHEMA_CONTENU_PLACE: SchemaJson;

// client/src/moteurs/place/index.ts — L2-C
export const renduPlace: MoteurRendu<ContenuPlace, EtatPlace, ActionPlace>;
```

#### 4.3.3 Le moteur `trace` — clôt le point ouvert O11

**Ce moteur est le plus important pour le besoin actuel de l'enfant** (D23 : « la pratique du geste
d'écriture accélère l'apprentissage de la lecture. C'est le levier le plus directement exploitable
ici »). Et il porte une exigence que rien d'autre ne porte : **distinguer les axes**.

```ts
// partage/src/moteurs/trace/types.ts — L2-C
import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { AxeMiroir, PaireMiroir } from '../../pedagogie/types.js';
import type { Point } from '../commun/geometrie.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdTrait = string;
export type CasseLettre = 'minuscule' | 'majuscule' | 'cursive';

export interface TraitLettre {
  readonly id: IdTrait;
  /** Ordre d'exécution, à partir de 1. Le `d` se trace rond puis hampe, jamais l'inverse. */
  readonly ordre: number;
  /** Chemin SVG du trait, en coordonnées `viewBox`. */
  readonly chemin: string;
  /**
   * Points échantillonnés le long du chemin, **dans le sens d'écriture**, au moins 8.
   * C'est le SENS qui distingue `b` de `d` sur un tracé, pas la forme finale.
   */
  readonly points: readonly Point[];
  readonly depart: Point;
  readonly arrivee: Point;
  /** « la grande barre », « le rond » — dit à voix haute au palier `indice`. */
  readonly libelle: string;
}

export interface ModeleLettre {
  readonly lettre: string;
  readonly casse: CasseLettre;
  readonly viewBox: string;
  readonly traits: readonly TraitLettre[];
  /** L'axe que CETTE lettre risque de confondre. `null` si aucune (D23). */
  readonly axeRisque: AxeMiroir | null;
}

export interface ContenuTrace {
  readonly lettres: readonly ModeleLettre[];
  /**
   * La paire travaillée. **UNE paire, donc UN axe.** Un exercice ne mélange jamais
   * `b`/`d` (gauche-droite) et `b`/`p` (haut-bas) : ce sont deux mécanismes différents, et un
   * enfant peut être gêné par l'un et pas par l'autre (D23, conséquence 1).
   */
  readonly paire: PaireMiroir | null;
  readonly consigne: string;
  readonly audio: CheminAsset | null;
  readonly consigneId: IdConsigne;
}

export interface EchantillonGeste {
  readonly point: Point;
  readonly instantMs: number;
}

export interface EtatTrait {
  readonly id: IdTrait;
  readonly termine: boolean;
  readonly nbEssais: number;
  /** Fraction des points du modèle franchis, 0 à 1. */
  readonly couverture: number;
}

export interface EtatTrace {
  readonly indexLettre: number;
  readonly indexTrait: number;
  readonly traits: readonly EtatTrait[];
  readonly gesteEnCours: readonly EchantillonGeste[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusTrace | null;
  /** L'axe effectivement confondu, quand il l'a été. Alimente le top 10 du dashboard (D23). */
  readonly axeConfondu: AxeMiroir | null;
  readonly demarreMs: number;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
  readonly termineMs: number | null;
}

export interface RefusTrace {
  readonly trait: IdTrait;
  readonly motif: MotifRefusTrace;
  readonly instantMs: number;
}

export type ActionTrace =
  | { readonly type: 'commencerGeste'; readonly echantillon: EchantillonGeste }
  | { readonly type: 'prolongerGeste'; readonly echantillon: EchantillonGeste }
  | { readonly type: 'terminerGeste' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
```

```ts
// partage/src/moteurs/trace/validation.ts — L2-C
import type { AxeMiroir, PaireMiroir } from '../../pedagogie/types.js';
import type { EchantillonGeste, ModeleLettre, TraitLettre } from './types.js';

/**
 * R16, sans exception : 24 px de tolérance. Le couloir de guidage est LARGE, et c'est voulu —
 * l'exercice porte sur l'orientation et le sens, jamais sur la propreté du geste. Un enfant qui
 * trace un `b` tremblant mais bien orienté a réussi.
 */
export const TOLERANCE_TRACE_PX = 24;

/** Fraction des points du modèle à franchir pour valider un trait. PLACEHOLDER — à valider. */
export const COUVERTURE_MINIMALE = 0.8;

export type MotifRefusTrace =
  | 'depart-eloigne'   // le geste ne commence pas près du point de départ
  | 'sens-inverse'     // le geste suit le modèle à l'envers — LE cas qui nous intéresse
  | 'trace-incomplet'  // couverture sous le seuil
  | 'trait-hors-ordre'; // l'enfant a commencé le trait 2 avant le trait 1

/** Aucun de ces motifs n'affiche du rouge. Le trait s'estompe et se redemande (D16, R14). */
export const REFUS_TRACE_COMPTE_ERREUR: Readonly<Record<MotifRefusTrace, boolean>>;

export interface DecisionTrait {
  readonly acceptee: boolean;
  readonly motif: MotifRefusTrace | null;
  readonly compteErreur: boolean;
  readonly couverture: number;
  /**
   * L'axe de la confusion **quand elle est identifiable**, `null` sinon.
   *
   * C'est le champ qui fait tout l'intérêt pédagogique du moteur : il alimente
   * `ConfusionObservee`, donc le top 10 du dashboard, donc la seule donnée réelle qu'un
   * orthophoniste pourrait un jour lire (D23, conséquence 3). Un moteur qui rend toujours
   * `null` ici est un moteur creux — c'est le contrat de sortie de L2-C.
   */
  readonly axe: AxeMiroir | null;
}

export function evaluerTrait(
  modele: ModeleLettre,
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
  tolerance?: number,
): DecisionTrait;

/** Vrai si le geste parcourt le modèle dans le bon sens. Indépendant de la vitesse. */
export function sensRespecte(
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
  tolerance?: number,
): boolean;

/**
 * L'axe confondu, en comparant le tracé rendu au modèle attendu et à son jumeau de paire.
 * Rend `null` quand le tracé ne ressemble ni à l'un ni à l'autre : dans ce cas ce n'est pas une
 * confusion miroir, et l'annoncer comme telle fausserait l'indicateur.
 */
export function axeConfondu(
  modele: ModeleLettre,
  paire: PaireMiroir | null,
  geste: readonly EchantillonGeste[],
): AxeMiroir | null;
```

```ts
// partage/src/moteurs/trace/moteur.ts — L2-C
export const moteurTrace: Moteur<ContenuTrace, EtatTrace, ActionTrace>;

// partage/src/moteurs/trace/schema-contenu.ts — L2-C
export const SCHEMA_CONTENU_TRACE: SchemaJson;

// client/src/moteurs/trace/index.ts — L2-C
export const renduTrace: MoteurRendu<ContenuTrace, EtatTrace, ActionTrace>;

// client/src/moteurs/trace/echantillonnage.ts — L2-C
/**
 * Rééchantillonne un geste à pas constant. Sans cela, un doigt lent produit 200 points et un
 * doigt rapide 12 : la couverture mesurée dépendrait de la vitesse et non du tracé.
 */
export function reechantillonner(
  geste: readonly EchantillonGeste[],
  pasPx: number,
): readonly EchantillonGeste[];
```

### 4.4 L2-D — pédagogie

C'est le lot où un défaut ne se voit pas à l'écran. L'annexe T § 1 le nomme comme le **premier
risque du projet** : « un ajustement du BKT ou du Leitner ne casse rien visiblement, et la
progression est devenue absurde. Personne ne le voit avant trois semaines. » D'où : couverture
≥ 90 %, tests de **propriété** et non d'exemple, et `test:rejeu` qui redevient réel.

```ts
// partage/src/pedagogie/types.ts — L2-D
import type {
  CodeCompetence, CodeRegion, Horodatage, IdHabillage, IdNoeud, IdProfil,
} from '../identifiants.js';

// ------------------------------------------------------------------ modes de réponse (D13)

/**
 * Le mode de réponse d'un item. **C'est lui, et lui seul, qui fixe `p_devinette`** (D13) —
 * jamais une valeur globale. Sans ce paramètre, une série de vrai/faux répondus au hasard fait
 * MONTER la maîtrise estimée et le sélecteur cesse de proposer une compétence non acquise :
 * c'est nommément la « régression pédagogique silencieuse » de l'annexe T § 1.
 */
export type ModeReponse =
  | 'vrai-faux'    // 0,50 — le format dominant des niveaux 1 à 3 du corpus réel
  | 'qcm-3'        // 0,33 — niveaux 3 et 4
  | 'qcm-4'        // 0,25
  | 'place'        // 0,05
  | 'colorie'      // 0,02
  | 'trace'        // le geste : on ne trace pas une lettre par hasard
  | 'saisie'       // 0,01
  | 'ordre'        // 1/n! — CALCULÉ depuis le nombre d'éléments, jamais tabulé
  | 'appariement'; // 1/n!

// ------------------------------------------------------------------ confusions (D23)

/**
 * Les deux axes de confusion miroir. **Ne jamais traiter `b/d/p/q` en bloc** : ce sont deux
 * mécanismes différents, et un enfant peut être gêné par un axe et pas par l'autre
 * (D23, conséquence 1). Le contenu des Galeries, le journal et le dashboard les séparent.
 */
export type AxeMiroir = 'gauche-droite' | 'haut-bas';

export interface PaireMiroir {
  readonly a: string;
  readonly b: string;
  readonly axe: AxeMiroir;
}

/**
 * Une confusion observée, telle qu'un moteur la journalise. Elle porte **toujours** son axe
 * quand elle en a un : une confusion sans axe est agrégeable, une confusion dont l'axe est
 * perdu ne l'est plus.
 */
export interface ConfusionObservee {
  /** Ce que l'enfant devait reconnaître ou produire. */
  readonly attendu: string;
  /** Ce qu'il a rendu. */
  readonly rendu: string;
  /** `null` quand la confusion n'est pas une confusion miroir. */
  readonly axe: AxeMiroir | null;
  readonly competence: CodeCompetence;
}

// ------------------------------------------------------------------ BKT (v2 § 12.2 + D13)

export interface ParametresBkt {
  readonly pInit: number;
  readonly pTransit: number;
  readonly pGlissement: number;
  /**
   * Par mode de réponse. `null` pour `ordre` et `appariement` : leur valeur est **calculée**
   * (`1/n!`) et ne peut pas être tabulée sans connaître le nombre d'éléments.
   */
  readonly pDevinette: Readonly<Record<ModeReponse, number | null>>;
  /** Une tentative avec aide de Gobi pèse 0,4 (v2 § 12.2). */
  readonly poidsAvecAide: number;
}

export interface CritereAcquis {
  readonly seuilP: number;
  readonly tentativesMin: number;
  readonly joursDistinctsMin: number;
  /**
   * **La clause de D13, qui compte autant que les valeurs.** Un item à forte devinette ne
   * suffit jamais seul à établir une maîtrise : il faut au moins deux tentatives à
   * `p_devinette <= seuilFaibleDevinette` avant tout acquis. Sans elle, une série de vrai/faux
   * chanceux fait franchir le seuil.
   */
  readonly tentativesFaibleDevinetteMin: number;
  readonly seuilFaibleDevinette: number;
}

export interface EtatMaitrise {
  readonly competence: CodeCompetence;
  /** Probabilité de maîtrise, dans [0, 1] — invariant vérifié par propriété. */
  readonly p: number;
  readonly nbTentatives: number;
  /** Dates ISO `YYYY-MM-DD`, distinctes, triées. */
  readonly joursDistincts: readonly string[];
  readonly nbTentativesFaibleDevinette: number;
  /** **Ne repasse JAMAIS à `null`.** Un acquis n'est jamais repris (v2 § 5.4, R14). */
  readonly acquiseLe: Horodatage | null;
}

export interface ObservationTentative {
  readonly competence: CodeCompetence;
  readonly reussi: boolean;
  readonly modeReponse: ModeReponse;
  /** Nombre d'éléments, pour `ordre` et `appariement`. `null` pour les autres modes. */
  readonly nbElements: number | null;
  readonly avecAide: boolean;
  readonly instant: Horodatage;
}

// ------------------------------------------------------------------ Leitner (v2 § 12.2)

export type NumeroBoite = 1 | 2 | 3 | 4 | 5;
export type IdItemLeitner = string;

export interface ParametresLeitner {
  /** J+1 / J+3 / J+7 / J+16 / J+35, dans cet ordre, indexés par boîte. */
  readonly delaisJours: readonly [number, number, number, number, number];
  readonly boiteApresEchec: NumeroBoite;
}

export interface ItemLeitner {
  readonly item: IdItemLeitner;
  readonly boite: NumeroBoite;
  readonly derniereRevueLe: Horodatage;
  readonly echeanceLe: Horodatage;
  readonly nbRevues: number;
}

// ------------------------------------------------------------------ sélecteur (v2 § 5.2)

/** Les cinq rôles du trajet de sortie de la v2 § 5.2, dans l'ordre. */
export type RoleNoeudSortie =
  | 'echauffement'          // réussite quasi certaine, TOUJOURS en ouverture
  | 'competence-en-cours'
  | 'revision'              // SRS — au nœud 3, jamais en ouverture ni en clôture
  | 'nouveaute'
  | 'synthese';             // défi de synthèse, TOUJOURS en clôture, TOUJOURS réussi

export type CodeCompagnon = 'filou' | 'bulle' | 'roc' | 'plume';

export interface EtapeSortie {
  /** Rang dans la sortie, à partir de 1. */
  readonly rang: number;
  readonly role: RoleNoeudSortie;
  readonly noeud: IdNoeud;
  readonly habillage: IdHabillage;
  readonly competences: readonly CodeCompetence[];
  /** Items Leitner injectés dans cette étape. Vide sauf au rang de révision. */
  readonly revisions: readonly IdItemLeitner[];
}

export interface PlanSortie {
  readonly profil: IdProfil;
  readonly region: CodeRegion;
  readonly compagnon: CodeCompagnon | null;
  readonly etapes: readonly EtapeSortie[];
  readonly composeeLe: Horodatage;
}

export interface ContraintesSelecteur {
  readonly nbNoeudsMin: number;
  readonly nbNoeudsMax: number;
  /** v2 § 12.1 : aucune compétence dont un prérequis est sous ce seuil. */
  readonly seuilPrerequis: number;
  /** R13 : jamais deux fois le même habillage dans une sortie. */
  readonly habillageUniqueParSortie: boolean;
  /** v2 § 12.2 : rang réservé aux révisions dues. */
  readonly rangRevision: number;
}

export interface EntreeSelecteur {
  readonly profil: IdProfil;
  readonly region: CodeRegion;
  readonly compagnon: CodeCompagnon | null;
  readonly maitrises: readonly EtatMaitrise[];
  readonly revisionsDues: readonly ItemLeitner[];
  readonly noeudsDisponibles: readonly NoeudCandidat[];
  readonly competences: readonly import('../contenu/types.js').Competence[];
  readonly maintenant: Horodatage;
}

export interface NoeudCandidat {
  readonly noeud: IdNoeud;
  readonly habillage: IdHabillage;
  readonly region: CodeRegion;
  readonly competences: readonly CodeCompetence[];
  readonly difficulte: number;
  readonly temps: import('../contenu/types.js').TempsNoeud;
}

/** Tout le paramétrage pédagogique, tel qu'il est lu depuis les données (C2). */
export interface ParametresPedagogie {
  readonly bkt: ParametresBkt;
  readonly acquis: CritereAcquis;
  readonly leitner: ParametresLeitner;
  readonly selecteur: ContraintesSelecteur;
}
```

```ts
// partage/src/pedagogie/miroir.ts — L2-D — sous-chemin `@pierre/partage/miroir`
import type { AxeMiroir, PaireMiroir } from './types.js';

/**
 * Les quatre paires, **et leurs deux axes**. Cette table est la seule autorité du dépôt sur le
 * sujet ; aucun contenu, aucun moteur, aucun écran ne redéclare une paire de son côté.
 *
 * `b`↔`d` et `p`↔`q` sont des miroirs GAUCHE-DROITE.
 * `b`↔`p` et `d`↔`q` sont des miroirs HAUT-BAS.
 *
 * Ce fichier a son propre sous-chemin parce qu'il pèse ~1 Ko et que le client en a besoin, là
 * où `bkt`, `leitner` et `selecteur` sont serveur (C1, budget de bundle).
 */
export const PAIRES_MIROIR: readonly PaireMiroir[];

/** `null` si les deux lettres ne forment pas une paire miroir connue. */
export function axeDeLaPaire(a: string, b: string): AxeMiroir | null;

/** Les paires d'un axe donné. Sert à composer un exercice qui ne travaille QU'UN axe (D23). */
export function pairesDeLAxe(axe: AxeMiroir): readonly PaireMiroir[];
```

```ts
// partage/src/pedagogie/bkt.ts — L2-D
import type {
  CritereAcquis, EtatMaitrise, ObservationTentative, ParametresBkt,
} from './types.js';
import type { CodeCompetence } from '../identifiants.js';

export function etatMaitriseInitial(
  competence: CodeCompetence,
  params: ParametresBkt,
): EtatMaitrise;

/**
 * `p_devinette` effective pour une observation.
 * Pour `ordre` et `appariement`, rend `1 / n!` calculé depuis `observation.nbElements` — et
 * LÈVE `ErreurPierre('argument-invalide')` si `nbElements` est `null` pour ces deux modes.
 * Rendre une valeur par défaut silencieuse serait exactement le défaut que D13 combat.
 */
export function pDevinette(params: ParametresBkt, observation: ObservationTentative): number;

/**
 * Fonction PURE. Quatre propriétés opposables, prouvées par `fast-check` :
 *
 *  - **P1** une suite de réussites fait croître `p` de façon monotone ;
 *  - **P2** `p` reste dans `[0, 1]` quelle que soit la séquence ;
 *  - **P3** une tentative avec aide fait moins bouger `p` qu'une tentative sans aide,
 *    strictement — jamais autant, jamais davantage ;
 *  - **P4** `acquiseLe`, une fois posé, n'est jamais effacé.
 */
export function mettreAJourMaitrise(
  etat: EtatMaitrise,
  observation: ObservationTentative,
  params: ParametresBkt,
): EtatMaitrise;

/**
 * **P5** — le critère complet de D13 : `p >= seuilP`, ET `>= tentativesMin` tentatives, ET
 * `>= joursDistinctsMin` jours distincts, ET **`>= tentativesFaibleDevinetteMin` tentatives à
 * `p_devinette <= seuilFaibleDevinette`**. Les quatre, pas trois.
 */
export function estAcquise(etat: EtatMaitrise, critere: CritereAcquis): boolean;
```

```ts
// partage/src/pedagogie/leitner.ts — L2-D
import type { Horodatage } from '../identifiants.js';
import type { ItemLeitner, NumeroBoite, ParametresLeitner } from './types.js';

export function itemLeitnerInitial(item: string, maintenant: Horodatage): ItemLeitner;

/** **P6** — la boîte monte d'un cran, l'échéance suit `delaisJours[boite - 1]`, exactement. */
export function promouvoir(
  item: ItemLeitner, params: ParametresLeitner, maintenant: Horodatage,
): ItemLeitner;

/** **P7** — un échec renvoie en `boiteApresEchec`, quelle que soit la boîte de départ. */
export function retrograder(
  item: ItemLeitner, params: ParametresLeitner, maintenant: Horodatage,
): ItemLeitner;

export function estDue(item: ItemLeitner, maintenant: Horodatage): boolean;

/**
 * **P8** — aucune dérive quand plusieurs révisions tombent le même jour : l'ordre rendu est
 * stable et ne dépend d'aucun aléa. Trié par échéance croissante, puis par identifiant.
 */
export function itemsDus(
  items: readonly ItemLeitner[], maintenant: Horodatage, limite?: number,
): readonly ItemLeitner[];

export function delaiDeBoite(boite: NumeroBoite, params: ParametresLeitner): number;
```

```ts
// partage/src/pedagogie/selecteur.ts — L2-D
import type { Alea } from '../alea.js';
import type { EntreeSelecteur, ParametresPedagogie, PlanSortie } from './types.js';

/**
 * Compose une sortie. Quatre propriétés opposables, prouvées sur 200 sorties simulées :
 *
 *  - **P9**  jamais deux fois le même habillage dans une sortie (R13) ;
 *  - **P10** l'étape de rang 1 est toujours `echauffement`, la dernière toujours `synthese` ;
 *  - **P11** aucune compétence dont un prérequis est sous `seuilPrerequis` (v2 § 12.1) ;
 *  - **P12** les révisions dues sont placées au rang `rangRevision`, jamais en 1 ni en dernier.
 *
 * `alea` est injecté : deux appels avec la même graine et la même entrée rendent le même plan.
 * C'est ce qui rend `test:rejeu` interprétable.
 */
export function composerSortie(
  entree: EntreeSelecteur,
  parametres: ParametresPedagogie,
  alea: Alea,
): PlanSortie;

/**
 * Raccourcit la sortie quand l'attention chute — temps de réponse qui s'allonge, erreurs qui
 * s'enchaînent (v2 § 5.2). Rend un plan **tronqué mais toujours clos par une `synthese`** :
 * une session se termine toujours par une victoire, y compris quand elle est écourtée.
 */
export function raccourcirSortie(plan: PlanSortie, rangAtteint: number): PlanSortie;
```

```ts
// partage/src/pedagogie/parametres.ts — L2-D
import type { ParametresPedagogie } from './types.js';

/**
 * Lit et valide `contenu/referentiel/parametres-pedagogie.json`.
 *
 * C2, et D13 en toutes lettres : « ces valeurs sont des paramètres déclarés en données, pas des
 * constantes dans le code : elles seront recalibrées sur les tentatives réelles, et le test de
 * rejeu doit rendre visible tout changement. »
 *
 * LÈVE `ErreurPierre('contenu-invalide')` si un mode de réponse manque à `pDevinette`, si une
 * probabilité sort de `[0, 1]`, ou si `delaisJours` n'a pas exactement 5 entrées croissantes.
 * Aucun défaut silencieux : un paramètre manquant doit se voir au démarrage, pas dans trois
 * semaines dans une courbe.
 */
export function lireParametresPedagogie(donnees: unknown): ParametresPedagogie;

/** Empreinte des paramètres, écrite dans le rapport de `test:rejeu`. Un changement se voit. */
export function empreinteParametres(parametres: ParametresPedagogie): string;
```

```json
// contenu/referentiel/parametres-pedagogie.json — L2-D — LES VALEURS, en données (C2)
{
  "bkt": {
    "pInit": 0.15,
    "pTransit": 0.12,
    "pGlissement": 0.10,
    "pDevinette": {
      "vrai-faux": 0.50, "qcm-3": 0.33, "qcm-4": 0.25,
      "place": 0.05, "colorie": 0.02, "trace": 0.02, "saisie": 0.01,
      "ordre": null, "appariement": null
    },
    "poidsAvecAide": 0.4
  },
  "acquis": {
    "seuilP": 0.90, "tentativesMin": 5, "joursDistinctsMin": 3,
    "tentativesFaibleDevinetteMin": 2, "seuilFaibleDevinette": 0.10
  },
  "leitner": { "delaisJours": [1, 3, 7, 16, 35], "boiteApresEchec": 1 },
  "selecteur": {
    "nbNoeudsMin": 4, "nbNoeudsMax": 6, "seuilPrerequis": 0.60,
    "habillageUniqueParSortie": true, "rangRevision": 3
  }
}
```

`trace` prend **0,02**, comme `colorie` : on ne trace pas une lettre orientée par hasard. La valeur
est une **proposition mesurable**, pas une certitude — c'est précisément pourquoi elle est ici et
non dans le code.

```ts
// partage/src/moteurs/types.ts — L2-D (MODIFIÉ)
// `ResumeEtape` gagne trois champs. Le reste du fichier (contrat v1 § 4.1) est INCHANGÉ —
// en particulier la note normative sur les cinq membres de `Moteur` déclarés en syntaxe de
// méthode : la changer casse le registre.
import type { ConfusionObservee, ModeReponse } from '../pedagogie/types.js';

export interface ResumeEtape {
  readonly identifiant: string;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly nbEcoutes: number;
  readonly dureeMs: number;
  /** Le mode de réponse de cette étape — c'est lui qui fixe `p_devinette` (D13). */
  readonly modeReponse: ModeReponse;
  /**
   * Latence de reconnaissance : de l'apparition de l'item à la bonne réponse.
   * **C'est l'indicateur principal du dashboard** (D18, v2 § 12.3). `null` quand l'étape n'a
   * pas de point d'apparition net (un coloriage libre, par exemple).
   */
  readonly latenceMs: number | null;
  /** La confusion observée, avec son AXE quand il y en a un (D23). `null` si aucune. */
  readonly confusion: ConfusionObservee | null;
}
```

### 4.5 L2-F — carte, campement, Gobi

```ts
// partage/src/monde/types.ts — L2-F
import type {
  CheminAsset, CodeRegion, Horodatage, IdNoeud,
} from '../identifiants.js';
import type { CodeCompagnon } from '../pedagogie/types.js';

export type CodeGrapheme = string;
export type IdPointInteraction = string;
export type CodeObjetCampement = string;

// ------------------------------------------------------------------ Gobi (D20, D24, D28)

/**
 * Les stades d'évolution. **PLACEHOLDER assumé** : D28 laisse ouvert « combien de stades ».
 * Cinq est retenu parce que les cinq séries de production existantes deviennent alors cinq
 * stades plutôt que cinq échecs (D28, point 1). À valider — voir § 9, question Q3.
 */
export type CodeStadeGobi = 'oeuf' | 'boule' | 'crete' | 'equipe' | 'gardien';

export interface StadeGobi {
  readonly code: CodeStadeGobi;
  /** Rang, à partir de 1, strictement croissant. C'est lui qui rend l'évolution comparable. */
  readonly rang: number;
  readonly libelle: string;
  /** Nombre de formes (graphèmes maîtrisés) requis pour l'atteindre. */
  readonly formesRequises: number;
  readonly asset: CheminAsset;
}

/**
 * Une forme de Gobi. **Le corps ne change jamais, le cristal porte les déclinaisons** (D20,
 * fiche-personnage § 3) : c'est la règle qui rend 25 variantes productibles de façon cohérente
 * et la collection lisible d'un coup d'œil.
 */
export interface FormeGobi {
  readonly grapheme: CodeGrapheme;
  readonly libelle: string;
  /** Le CRISTAL seul. Jamais un corps complet : sinon la série se disloque. */
  readonly cristal: CheminAsset;
  readonly obtenueLe: Horodatage;
}

export interface EtatGobi {
  readonly stade: CodeStadeGobi;
  readonly formes: readonly FormeGobi[];
  /** La forme portée en ce moment. `null` = crête de base. */
  readonly formeActive: CodeGrapheme | null;
}

/** Les 5 états d'animation de l'addendum § A.2 et de la fiche § 4. */
export type EtatAnimationGobi = 'repos' | 'joie' | 'aide' | 'hesitation' | 'apparition';

// ------------------------------------------------------------------ campement (R11)

export type CodeReaction = 'animation' | 'replique' | 'son' | 'aucune';

export interface PointInteraction {
  readonly id: IdPointInteraction;
  readonly libelle: string;
  readonly reaction: CodeReaction;
  /** Vrai si l'animation n'est portée que par ce point. R11 en exige **au moins 10**. */
  readonly animationUnique: boolean;
  /** Clip de réplique vocale. R11 en exige **au moins 6**. `null` sinon. */
  readonly replique: CheminAsset | null;
  /** Boîte tapable, en unités `viewBox`. Contrôlée contre la règle des 64 px (R16). */
  readonly zone: readonly [number, number, number, number];
}

export interface ObjetCampement {
  readonly code: CodeObjetCampement;
  readonly libelle: string;
  readonly asset: CheminAsset;
  /** La région dont le retour l'a rapporté. */
  readonly region: CodeRegion;
  readonly placeLe: Horodatage | null;
}

export interface AuditCampement {
  readonly nbPoints: number;
  readonly nbAnimationsUniques: number;
  readonly nbRepliques: number;
  /** `nbPoints >= 25 && nbAnimationsUniques >= 10 && nbRepliques >= 6`. */
  readonly conforme: boolean;
  /** Ce qui manque, nommé. Vide quand `conforme`. */
  readonly manques: readonly string[];
}

// ------------------------------------------------------------------ carte (v2 § 3.3, § 9.4)

export interface EtatRegion {
  readonly region: CodeRegion;
  readonly ordre: number;
  readonly ouverte: boolean;
  /** 0 à 1. Le VIDE restant est ce que la carte donne à voir (D25, point 3). */
  readonly pourcentageColorie: number;
  readonly eclatObtenuLe: Horodatage | null;
  readonly compagnon: CodeCompagnon | null;
  readonly noeuds: readonly IdNoeud[];
}

export interface EtatCarte {
  readonly regions: readonly EtatRegion[];
  /** v2 § 3.3 : deux régions restent ouvertes en parallèle **dès la troisième**. */
  readonly ouvertesEnParallele: number;
}

export interface Compagnon {
  readonly code: CodeCompagnon;
  readonly libelle: string;
  readonly valeur: string;
  readonly domaine: string;
  readonly region: CodeRegion;
  readonly asset: CheminAsset;
  readonly rallieLe: Horodatage | null;
}

export interface EtatMonde {
  readonly carte: EtatCarte;
  readonly gobi: EtatGobi;
  readonly compagnons: readonly Compagnon[];
  readonly campement: readonly ObjetCampement[];
}
```

```ts
// partage/src/monde/gobi.ts — L2-F
import type { CodeStadeGobi, EtatGobi, StadeGobi } from './types.js';

/**
 * Le stade qui découle du nombre de formes obtenues.
 *
 * **IRRÉVERSIBLE, par construction et non par convention.** La fonction prend le MAXIMUM entre
 * le rang du stade courant et le rang déduit des formes : une régression est donc impossible à
 * exprimer, pas seulement interdite. C'est la traduction littérale de « un acquis n'est jamais
 * repris » (v2 § 5.4, R14) et de la troisième question ouverte de D28, tranchée dans le seul
 * sens compatible avec les specs.
 *
 * Propriété opposable, prouvée par `fast-check` : pour toute séquence d'appels, le rang rendu
 * est monotone croissant.
 */
export function stadeApresFormes(
  etat: EtatGobi,
  stades: readonly StadeGobi[],
): CodeStadeGobi;

/** Le stade suivant et ce qui reste à faire pour l'atteindre — la jauge du VIDE (D25). */
export function prochainStade(
  etat: EtatGobi, stades: readonly StadeGobi[],
): { readonly stade: StadeGobi; readonly formesRestantes: number } | null;
```

```ts
// partage/src/monde/campement.ts — L2-F
import type { AuditCampement, PointInteraction } from './types.js';

/** R11, en données : les trois seuils. Déclarés ici parce qu'ils sont une EXIGENCE, pas un réglage. */
export const R11_POINTS_MIN = 25;
export const R11_ANIMATIONS_UNIQUES_MIN = 10;
export const R11_REPLIQUES_MIN = 6;

/**
 * **R11 mesurée, jamais affirmée.** `test:contenu` et `tests/unitaires/campement-audit.test.ts`
 * appellent cette fonction sur `contenu/monde/campement.json` réel et échouent si
 * `conforme` est faux. « Un décor où le clic ne fait rien est un décor raté » (v2 § 2).
 */
export function auditerCampement(points: readonly PointInteraction[]): AuditCampement;
```

```ts
// partage/src/monde/carte.ts — L2-F
import type { CodeRegion } from '../identifiants.js';
import type { EtatCarte, EtatRegion } from './types.js';

/** Les régions jouables maintenant. Deux en parallèle dès la troisième (v2 § 3.3). */
export function regionsOuvertes(carte: EtatCarte): readonly CodeRegion[];

/**
 * Applique l'obtention d'un Éclat : la région est close, la suivante s'ouvre.
 * `pourcentageColorie` ne décroît jamais — même invariant que partout ailleurs (R14).
 */
export function appliquerEclat(carte: EtatCarte, region: CodeRegion, quand: string): EtatCarte;

/** Recalcule le taux de recoloration d'une région depuis ses nœuds terminés. */
export function recalculerRecoloration(
  region: EtatRegion, noeudsTermines: readonly string[],
): EtatRegion;
```

### 4.6 L2-H — dashboard parent

```ts
// partage/src/parent/types.ts — L2-H
import type { CodeCompetence, CodeRegion, Horodatage, IdExercice } from '../identifiants.js';
import type { AxeMiroir } from '../pedagogie/types.js';

/**
 * Un point de la courbe de latence de reconnaissance.
 * **C'est l'indicateur principal du dashboard** (D18, conséquence 2) : « la lenteur est une
 * donnée à suivre, pas un défaut à corriger de front ». Médiane et quartiles, jamais la
 * moyenne : une seule session distraite déplace une moyenne et ne dit rien.
 */
export interface PointLatence {
  readonly jour: string;
  readonly competence: CodeCompetence;
  readonly medianeMs: number;
  readonly q1Ms: number;
  readonly q3Ms: number;
  readonly nbMesures: number;
}

/**
 * Une ligne du top 10 des confusions.
 *
 * **`axe` n'est jamais `null` dans cette table, et une ligne n'agrège jamais deux axes** (D23).
 * Une confusion sans axe identifiable n'entre pas au top 10 : elle serait ininterprétable, et
 * la mélanger aux autres détruirait précisément l'information que D23 demande de produire.
 */
export interface ConfusionAgregee {
  readonly attendu: string;
  readonly rendu: string;
  readonly axe: AxeMiroir;
  readonly nbOccurrences: number;
  readonly latenceMedianeMs: number;
  /** Pente sur 14 jours. Négative = **la courbe descend**, c'est ce qu'on veut voir (D23). */
  readonly tendance14j: number;
  /** Ce que « travailler ça » injectera en priorité dans la prochaine sortie (v2 § 14). */
  readonly competences: readonly CodeCompetence[];
}

/** Une région de la carte, annotée par la maîtrise RÉELLE — repère le colorié mal acquis. */
export interface CouvertureRegion {
  readonly region: CodeRegion;
  readonly pourcentageColorie: number;
  readonly maitriseMoyenne: number;
  readonly competencesAcquises: number;
  readonly competencesTotal: number;
  /** Vrai quand `pourcentageColorie` dépasse nettement `maitriseMoyenne` : le drapeau utile. */
  readonly colorieMaisFragile: boolean;
}

export type StatutRelecture = 'en-attente' | 'valide' | 'rejete';

export interface EntreeRelecture {
  readonly exercice: IdExercice;
  readonly chemin: string;
  readonly statut: StatutRelecture;
  readonly deposeeLe: Horodatage;
  readonly traiteeLe: Horodatage | null;
  readonly motif: string | null;
}

export interface VerrouParent {
  readonly nbEchecs: number;
  readonly verrouilleJusqua: Horodatage | null;
}

export interface ResumeDashboard {
  readonly latences: readonly PointLatence[];
  readonly confusions: readonly ConfusionAgregee[];
  readonly couverture: readonly CouvertureRegion[];
  readonly relecture: readonly EntreeRelecture[];
}

export type CodeExport = 'tentatives' | 'etapes' | 'maitrise' | 'confusions' | 'latences';
```

```ts
// partage/src/parent/indicateurs.ts — L2-H
import type { ConfusionAgregee, CouvertureRegion, PointLatence } from './types.js';
import type { ConfusionObservee } from '../pedagogie/types.js';

/** v2 § 11 : verrouillage temporaire après 5 échecs. */
export const ECHECS_AVANT_VERROU = 5;
/** PLACEHOLDER — durée du verrou à valider (§ 9, question Q6). */
export const DUREE_VERROU_MS = 900_000;

/** Médiane exacte, pas interpolée : sur 20 mesures, l'interpolation invente une valeur. */
export function mediane(valeurs: readonly number[]): number;
export function quartiles(valeurs: readonly number[]): readonly [number, number, number];

export function agregerLatences(
  mesures: readonly { readonly jour: string; readonly competence: string; readonly ms: number }[],
): readonly PointLatence[];

/**
 * Agrège les confusions **par (attendu, rendu, axe)**. Une confusion dont l'axe est `null` est
 * ÉCARTÉE et comptée à part : elle n'entre pas au top 10. Contrat de sortie de L2-H — la
 * fonction rend aussi le nombre d'écartées, pour que le silence ne passe pas pour un zéro.
 */
export function agregerConfusions(
  observations: readonly (ConfusionObservee & { readonly jour: string; readonly latenceMs: number })[],
  limite?: number,
): { readonly top: readonly ConfusionAgregee[]; readonly ecartees: number };

/** Pente d'une régression linéaire simple sur 14 jours. `0` si moins de 3 points. */
export function tendance(points: readonly { readonly jour: string; readonly valeur: number }[]): number;

export function croiserCouverture(
  recoloration: readonly { readonly region: string; readonly pourcentage: number }[],
  maitrise: readonly { readonly region: string; readonly p: number; readonly acquise: boolean }[],
  ecartAlerte?: number,
): readonly CouvertureRegion[];
```

```ts
// serveur/src/services/code-parent.ts — L2-H
/**
 * Code à 4 chiffres, `scrypt`, verrouillage temporaire après 5 échecs (v2 § 11).
 *
 * Le sel est propre au dépôt et vit en base, jamais dans le code. La comparaison est à temps
 * constant (`timingSafeEqual`) : un code à 4 chiffres est déjà faible, une fuite par le temps de
 * réponse le rendrait trivial.
 */
export function deriverCode(code: string, sel: Buffer): Buffer;
export function verifierCode(code: string, sel: Buffer, empreinte: Buffer): boolean;
export function estVerrouille(verrou: VerrouParent, maintenant: string): boolean;
export function appliquerEchec(verrou: VerrouParent, maintenant: string): VerrouParent;
```

### 4.7 Les additions au barillet et aux sous-chemins — **L2-D**

```ts
// partage/src/index.ts — L2-D (MODIFIÉ)
// Le fichier v1 (contrat v1 § 11.1) est conservé INTÉGRALEMENT. On ajoute, en fin de fichier,
// ces lignes et rien d'autre. Convention C1 : **types uniquement**, aucune valeur.

export type { FournisseurHaptique, CodeVibration } from './fournisseurs/haptique.js';

export type {
  CodePalier, NatureRecompense, SeuilsCascade, EtatCascade,
  JaugePalier, RecompenseObtenue, GainCascade,
} from './recompenses/types.js';

export type {
  CodePolice, FondLecture, ReglagesLecture, BorneReglage, BornesReglages,
  SegmentSyllabe, EssaiTypographie, ConfigurationBras, ResultatBras, ComparaisonTypographie,
} from './lecture/types.js';

export type {
  ModeReponse, AxeMiroir, PaireMiroir, ConfusionObservee,
  ParametresBkt, CritereAcquis, EtatMaitrise, ObservationTentative,
  NumeroBoite, IdItemLeitner, ParametresLeitner, ItemLeitner,
  RoleNoeudSortie, CodeCompagnon, EtapeSortie, PlanSortie,
  ContraintesSelecteur, EntreeSelecteur, NoeudCandidat, ParametresPedagogie,
} from './pedagogie/types.js';

export type {
  CodeGrapheme, IdPointInteraction, CodeObjetCampement,
  CodeStadeGobi, StadeGobi, FormeGobi, EtatGobi, EtatAnimationGobi,
  CodeReaction, PointInteraction, ObjetCampement, AuditCampement,
  EtatRegion, EtatCarte, Compagnon, EtatMonde,
} from './monde/types.js';

export type {
  PointLatence, ConfusionAgregee, CouvertureRegion, StatutRelecture,
  EntreeRelecture, VerrouParent, ResumeDashboard, CodeExport,
} from './parent/types.js';

export type {
  DelaisAide, EtatAidable, EtapeGenerique, Point, Polygone,
} from './moteurs/commun/index.js';

export type {
  ContenuPlace, ConsignePlace, ElementPlacable, ZoneCible, DepotAttendu,
  RelationSpatiale, EtatPlace, ActionPlace, MotifRefusPlace, DecisionDepot,
} from './moteurs/place/index.js';

export type {
  ContenuTrace, ModeleLettre, TraitLettre, CasseLettre, EchantillonGeste,
  EtatTrace, ActionTrace, MotifRefusTrace, DecisionTrait,
} from './moteurs/trace/index.js';
```

**Aucune `export const`, aucune fonction, dans ces lignes.** C'est C1, et c'est mesuré par
`scripts/verifier-bundle.mjs` : le budget de 250 Ko gzip ne survit pas à l'entrée d'Ajv, du BKT
et du sélecteur dans le bundle client.

```jsonc
// partage/package.json — L2-D (MODIFIÉ) — les 3 entrées v1 plus 6
{
  "name": "@pierre/partage",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".":             { "types": "./src/index.ts",                     "default": "./dist/index.js" },
    "./validation":  { "types": "./src/contenu/validation.ts",        "default": "./dist/contenu/validation.js" },
    "./factices":    { "types": "./src/fournisseurs/factices.ts",     "default": "./dist/fournisseurs/factices.js" },
    "./pedagogie":   { "types": "./src/pedagogie/index.ts",           "default": "./dist/pedagogie/index.js" },
    "./miroir":      { "types": "./src/pedagogie/miroir.ts",          "default": "./dist/pedagogie/miroir.js" },
    "./lecture":     { "types": "./src/lecture/index.ts",             "default": "./dist/lecture/index.js" },
    "./recompenses": { "types": "./src/recompenses/index.ts",         "default": "./dist/recompenses/index.js" },
    "./monde":       { "types": "./src/monde/index.ts",               "default": "./dist/monde/index.js" },
    "./parent":      { "types": "./src/parent/index.ts",              "default": "./dist/parent/index.js" }
  },
  "scripts": { "construire": "tsc -b" }
}
```

**Les mêmes 9 alias sont à poser dans `vitest.config.ts` (L2-D) et `client/vite.config.ts`
(L2-B), du plus spécifique au moins spécifique** — `@pierre/partage/pedagogie` avant
`@pierre/partage`, sans quoi le second capture le premier. C'est déjà la règle du contrat
v1 § 3.2 ; elle devient critique à 9 entrées.

**Qui charge quoi côté client, et pourquoi c'est important pour le budget :**

| Sous-chemin | Client | Serveur | Motif |
|---|---|---|---|
| `.` | oui | oui | Types seuls pour les additions |
| `./miroir` | **oui** | oui | ~1 Ko, le moteur `trace` en a besoin en jeu |
| `./lecture` | **oui** | oui | La zone de lecture applique les réglages |
| `./recompenses` | **oui** | oui | La jauge se calcule à l'écran |
| `./monde` | **oui** | oui | Carte et campement |
| `./pedagogie` | **non** | oui | BKT, Leitner, sélecteur : décidés au serveur |
| `./parent` | chunk différé | oui | Chargé à l'ouverture du dashboard, jamais avant |
| `./validation` | **non** | oui | Ajv, ~120 Ko |
| `./factices` | **non** | tests | Journaux de test |

### 4.8 L2-E — le contrat uniforme des onze moteurs

L2-E ne reçoit pas onze blocs de code : il reçoit **un motif**, appliqué onze fois. Pour tout
moteur `<x>` de la liste (`attrape`, `tri`, `assemble`, `chemin`, `eclair`, `paires`, `phrase`,
`histoire`, `chrono`, `grave`, `libre`), avec `<X>` sa forme en PascalCase :

```ts
// partage/src/moteurs/<x>/types.ts — L2-E
export interface Contenu<X> { /* le bloc `jeu.contenu`, propre au moteur */ }
export interface Etat<X>    { /* immuable ; porte niveauAide, nbErreurs, debutMs, etc. */ }
export type Action<X> =
  | { readonly type: '…' }
  | { readonly type: 'ecouterConsigne' }     // R15 : gratuit, jamais compté
  | { readonly type: 'demanderAide' }        // exactement le palier `indice`, même coût
  | { readonly type: 'battementHorloge' };   // fait mûrir les seuils SANS setTimeout

// partage/src/moteurs/<x>/validation.ts — L2-E
export type MotifRefus<X> = /* union fermée */;
export const REFUS_<X>_COMPTE_ERREUR: Readonly<Record<MotifRefus<X>, boolean>>;
export function evaluer<X>(/* … */): Decision<X>;

// partage/src/moteurs/<x>/moteur.ts — L2-E
export const moteur<X>: Moteur<Contenu<X>, Etat<X>, Action<X>>;

// partage/src/moteurs/<x>/schema-contenu.ts — L2-E
export const SCHEMA_CONTENU_<X>: SchemaJson;

// client/src/moteurs/<x>/index.ts — L2-E
export const rendu<X>: MoteurRendu<Contenu<X>, Etat<X>, Action<X>>;
```

**Six symboles par moteur, onze moteurs : 66 symboles possédés par L2-E**, plus les `MotifRefus`
et `Decision` propres à chacun. Cinq règles opposables, valables pour les onze sans exception :

1. Les cinq membres de `Moteur` sont déclarés **en syntaxe de méthode** (`creerEtat(...)`, jamais
   `creerEtat: (...) => ...`). Déclarés en propriété-fonction, `MoteurQuelconque` cesse d'être
   assignable et **le registre ne compile plus** (contrat v1 § 4.1, note normative).
2. `resume().reussi` vaut **toujours `true`**. Un lot qui écrit `reussi: false` viole R14.
3. Aucun `setTimeout` ne vit dans la logique pure : le temps entre par `ContexteMoteur.horloge`
   et mûrit par `battementHorloge`.
4. L'escalade d'aide vient de `partage/src/moteurs/commun/aide.ts` (L2-C), jamais réimplantée.
5. Le barème d'étoiles vient de `calculerEtoiles`, jamais réimplanté (contrat v1 § 5.7).

**`libre` est le seul moteur sans consigne et sans validation** : il ne peut pas être raté, c'est
sa raison d'être. C'est « la sortie de secours à un tap, sans culpabilité » (v2 § 5.4). Son
`resume()` rend `reussi: true`, `nbErreurs: 0`, `aideUtilisee: 'aucune'` — donc trois étoiles à
chaque fois, et c'est voulu.

---

## 5. Frontières — qui exporte, qui importe

### 5.1 Table des frontières, couple par couple

Chaque ligne est opposable **dans les deux sens** : l'exportateur doit produire ces symboles,
l'importateur ne doit pas en attendre d'autres.

| Couple | Exporte | Importe | Chemin d'import | Ce qui passe |
|---|---|---|---|---|
| **L2-D → tous** | L2-D | A, B, C, E, F, G, H | `@pierre/partage` | Le barillet : **types nouveaux uniquement** (§ 4.7). C'est L2-D qui possède `index.ts` et `package.json` |
| **L2-D → C** | L2-D | L2-C | `@pierre/partage/miroir` | `PAIRES_MIROIR`, `axeDeLaPaire`, `pairesDeLAxe` — le moteur `trace` en a besoin en jeu |
| **L2-D → C, E** | L2-D | L2-C, L2-E | `../../pedagogie/types.js` (relatif, même paquet) | `ModeReponse`, `AxeMiroir`, `ConfusionObservee` — tout moteur journalise son mode et ses confusions |
| **L2-D → H** | L2-D | L2-H | `@pierre/partage/pedagogie` | `EtatMaitrise`, `estAcquise` — la carte de couverture croise la maîtrise réelle |
| **L2-D → F** | L2-D | L2-F | `@pierre/partage/pedagogie` | `CodeCompagnon` — les 4 compagnons sont nommés une seule fois |
| **L2-C → E** | L2-C | L2-E | `../commun/index.js` (relatif) | `DelaisAide`, `niveauAideSuivant`, `resumeDepuisEtapes`, `pointDansPolygone` — **le socle des onze moteurs.** L2-C est sur le chemin critique |
| **L2-C → E** | L2-C | L2-E | `./place/index.js`, `./trace/index.js` | `moteurPlace`, `moteurTrace`, `renduPlace`, `renduTrace` — agrégés dans `MOTEURS` et `registreRendu`, tous deux écrits par L2-E. **Inversion assumée** (§ 2.1) |
| **L2-A → C, E** | L2-A | L2-C, L2-E | `../moteurs/types.js` (relatif client) | `ServicesJeu` avec `haptique` et `retour` — un moteur ne joue jamais un son directement |
| **L2-A → F** | L2-A | L2-F | `@pierre/partage/recompenses` | `appliquerEtoiles`, `JaugePalier` — le coffre et la carte affichent les mêmes jauges |
| **L2-A → H** | L2-A | L2-H | `@pierre/partage` (types) | `EtatCascade` — le dashboard montre les paliers atteints |
| **L2-B → A, C, E, F** | L2-B | tous ceux qui affichent du texte | `client/src/lecture/ZoneDeLecture.js` | **Aucun composant n'affiche du texte à déchiffrer autrement.** C'est la seule façon de tenir « le décor s'agite, le texte jamais » (v2 § 9.3) |
| **L2-B → D** | L2-B | L2-D | `@pierre/partage/lecture` | `ConfigurationBras`, `brasDeSession` — le sélecteur choisit le bras de la session |
| **L2-B → H** | L2-B | L2-H | `@pierre/partage/lecture` | `ComparaisonTypographie` — la courbe A/B est un écran parent |
| **L2-F → A** | L2-F | L2-A | `@pierre/partage/monde` | `StadeGobi`, `prochainStade` — le palier intermédiaire remet une forme de Gobi |
| **L2-F → D** | L2-F | L2-D | `@pierre/partage/monde` | `EtatCarte`, `regionsOuvertes` — le sélecteur ne compose que dans une région ouverte |
| **L2-F → H** | L2-F | L2-H | `@pierre/partage/monde` | `EtatRegion` — la carte de couverture est la carte du monde annotée |
| **L2-H → tous (client)** | L2-H | A, B, D, F | `client/src/api/client.js` | Le `fetch` typé. **Un seul fichier appelle le réseau côté client**, et c'est L2-H qui le possède |
| **L2-H → C, D, F** | L2-H | L2-C, L2-D, L2-F | `@pierre/partage` | `CHEMINS_API` étendu : L2-H déclare **tous** les chemins, y compris ceux qu'il n'implante pas |
| **L2-H → C, D, F (serveur)** | L2-H | L2-D, L2-B, L2-F | `serveur/src/application.js` | L2-H enregistre les routes des cinq fichiers de routes ; les autres lots les **écrivent** mais ne les branchent pas |
| **L2-G → C, E** | L2-G | L2-C, L2-E | **frontière de fichiers** | `contenu/brouillons/**` → matière première des exercices. Aucun symbole, aucun import : le lien est vérifié par `test:contenu` |
| **L2-G → H** | L2-G | L2-H | **frontière de fichiers** | Les brouillons alimentent la file de relecture du dashboard |
| **L2-A → tous** | L2-A | tous | `eslint.config.js` | Frontière de **configuration** |
| **L2-D → tous** | L2-D | tous | `vitest.config.ts` | Frontière de **configuration** (alias) |
| **L2-B → tous** | L2-B | tous | `client/vite.config.ts`, `playwright.config.ts` | Frontière de **configuration** |
| **L2-G → tous** | L2-G | tous | `package.json` | Frontière de **processus** (script `ingerer`) |

### 5.2 Les trois inversions de dépendance, et pourquoi elles sont assumées

1. **`partage/src/moteurs/tous.ts` et `client/src/moteurs/registre-rendu.ts` (L2-E) importent
   L2-C.** Ils ne compilent pas tant que `place` et `trace` n'existent pas. Voulu : l'oubli
   d'enregistrer un moteur ne compile pas, au lieu de ne se voir qu'à l'exécution. Même
   raisonnement qu'au contrat v1 § 11.4.
2. **`partage/src/index.ts` (L2-D) réexporte des types de sept autres lots.** Il ne compile
   qu'une fois les sept rendus. C'est le prix d'un barillet unique — et le prix inverse, sept
   barillets concurrents, serait sept sources de vérité sur la surface publique.
3. **`serveur/src/application.ts` (L2-H) enregistre les routes de quatre autres lots.** Un lot qui
   écrit une route sans qu'elle soit branchée verrait son travail silencieusement absent ; ici,
   l'absence ne compile pas.

### 5.3 Les routes HTTP — les 7 existantes, plus 12

L2-H possède `partage/src/api/contrats.ts` et y déclare **tous** les chemins ; chaque lot implante
les siens dans son propre fichier de routes.

| Méthode et chemin | Corps entrant | Réponse | Écrit par |
|---|---|---|---|
| `GET /api/profils/:id/reglages` | — | `ReglagesLecture` | L2-B |
| `PUT /api/profils/:id/reglages` | `Partial<ReglagesLecture>` | `ReglagesLecture` | L2-B |
| `GET /api/profils/:id/essai-typographie` | — | `ComparaisonTypographie \| null` | L2-B |
| `GET /api/profils/:id/maitrise` | — | `EtatMaitrise[]` | L2-D |
| `GET /api/profils/:id/revisions` | — | `ItemLeitner[]` | L2-D |
| `POST /api/profils/:id/sortie` | `{ region, compagnon }` | `PlanSortie` | L2-D |
| `GET /api/profils/:id/monde` | — | `EtatMonde` | L2-F |
| `POST /api/profils/:id/campement` | `{ objet }` | `EtatMonde` | L2-F |
| `POST /api/parent/ouvrir` | `{ code }` | `{ jeton }` ou **423** | L2-H |
| `GET /api/parent/:profil/dashboard` | — | `ResumeDashboard` | L2-H |
| `GET /api/parent/:profil/export/:code` | — | `text/csv` | L2-H |
| `POST /api/parent/relecture/:exercice` | `{ statut, motif }` | `EntreeRelecture` | L2-H |

`POST /api/parent/ouvrir` répond **423 Locked** avec `ErreurApi.code = 'conflit'` quand le verrou
est actif, jamais 401 : le parent doit lire *quand* il pourra réessayer, pas *que c'est faux*.
Toute route parent exige le jeton ; les routes enfant n'en demandent aucun (v2 § 11 : « un tap
suffit, aucun mot de passe »).

---

## 6. Migrations SQL — 002 à 006, à la suite de `001_socle.sql`

Le mécanisme du contrat v1 § 6.1 est **inchangé** : `serveur/migrations/NNN_nom.sql`, ordre
lexical, une transaction par fichier, empreinte SHA-256 en base, **une migration modifiée après
coup est une erreur bloquante**. `PRAGMA journal_mode = WAL` et `foreign_keys = ON` restent posés
à l'ouverture de la connexion, jamais dans un fichier de migration. Toutes les tables sont
`STRICT`.

Cinq migrations, cinq propriétaires, **aucun fichier à deux écrivains** :

```sql
-- serveur/migrations/002_lecture.sql — L2-B
CREATE TABLE reglages_lecture (
  profil_id             TEXT PRIMARY KEY REFERENCES profils(id),
  police                TEXT    NOT NULL,
  corps_px              INTEGER NOT NULL CHECK (corps_px BETWEEN 16 AND 40),
  interlettrage_em      REAL    NOT NULL CHECK (interlettrage_em >= 0),
  espacement_mots_em    REAL    NOT NULL CHECK (espacement_mots_em >= 0),
  interligne            REAL    NOT NULL CHECK (interligne > 0),
  coloration_syllabique INTEGER NOT NULL CHECK (coloration_syllabique IN (0, 1)),
  surlignage_ligne      INTEGER NOT NULL CHECK (surlignage_ligne IN (0, 1)),
  regle_de_lecture      INTEGER NOT NULL CHECK (regle_de_lecture IN (0, 1)),
  fond                  TEXT    NOT NULL CHECK (fond IN ('parchemin', 'sombre')),
  modifie_le            TEXT    NOT NULL
) STRICT;

-- Le protocole A/B de D19. `bras_json` porte les DEUX configurations comparées :
-- une comparaison à trois bras n'est pas lisible, la contrainte est donc dans le schéma JSON.
CREATE TABLE essais_typographie (
  id           TEXT PRIMARY KEY,
  profil_id    TEXT NOT NULL REFERENCES profils(id),
  competence   TEXT NOT NULL,
  bras_json    TEXT NOT NULL,
  ouvert_le    TEXT NOT NULL,
  cloture_le   TEXT
) STRICT;

CREATE INDEX idx_essais_profil ON essais_typographie (profil_id, competence);
```

```sql
-- serveur/migrations/003_pedagogie.sql — L2-D

-- Journal APPEND-ONLY, une ligne par étape. C'est lui qui porte la latence de reconnaissance
-- (D18, l'indicateur principal) et les confusions avec leur AXE (D23). Aucun UPDATE, aucun
-- DELETE n'est jamais écrit contre cette table : tout indicateur s'en recalcule.
CREATE TABLE etapes_tentative (
  id             TEXT PRIMARY KEY,
  tentative_id   TEXT    NOT NULL REFERENCES tentatives(id),
  profil_id      TEXT    NOT NULL REFERENCES profils(id),
  rang           INTEGER NOT NULL CHECK (rang >= 0),
  identifiant    TEXT    NOT NULL,
  competence     TEXT    NOT NULL,
  mode_reponse   TEXT    NOT NULL,
  reussi         INTEGER NOT NULL CHECK (reussi IN (0, 1)),
  nb_erreurs     INTEGER NOT NULL CHECK (nb_erreurs >= 0),
  aide_utilisee  TEXT    NOT NULL CHECK (aide_utilisee IN ('aucune','indice','demonstration')),
  duree_ms       INTEGER NOT NULL CHECK (duree_ms >= 0),
  latence_ms     INTEGER          CHECK (latence_ms IS NULL OR latence_ms >= 0),
  -- Les trois colonnes de confusion vont ensemble : soit les trois sont nulles, soit
  -- `attendu` et `rendu` sont posées. `axe` reste nullable — une confusion non miroir
  -- existe, et le dashboard l'ÉCARTE du top 10 plutôt que de lui inventer un axe.
  conf_attendu   TEXT,
  conf_rendu     TEXT,
  conf_axe       TEXT             CHECK (conf_axe IS NULL OR conf_axe IN ('gauche-droite','haut-bas')),
  journalise_le  TEXT    NOT NULL,
  CHECK ((conf_attendu IS NULL) = (conf_rendu IS NULL))
) STRICT;

CREATE INDEX idx_etapes_profil_comp ON etapes_tentative (profil_id, competence, journalise_le);
CREATE INDEX idx_etapes_confusion   ON etapes_tentative (profil_id, conf_axe, conf_attendu, conf_rendu);

-- Projection recalculable depuis `etapes_tentative`. JAMAIS une source de vérité.
CREATE TABLE maitrise_competence (
  profil_id            TEXT    NOT NULL REFERENCES profils(id),
  competence           TEXT    NOT NULL,
  p                    REAL    NOT NULL CHECK (p BETWEEN 0 AND 1),
  nb_tentatives        INTEGER NOT NULL CHECK (nb_tentatives >= 0),
  jours_distincts_json TEXT    NOT NULL,
  nb_faible_devinette  INTEGER NOT NULL CHECK (nb_faible_devinette >= 0),
  -- Ne repasse JAMAIS à NULL : un acquis n'est jamais repris (R14). Le dépôt applique
  -- COALESCE(ancien, nouveau), exactement comme `progression_noeud.etoiles` applique MAX.
  acquise_le           TEXT,
  PRIMARY KEY (profil_id, competence)
) STRICT;

CREATE TABLE items_leitner (
  profil_id        TEXT    NOT NULL REFERENCES profils(id),
  item             TEXT    NOT NULL,
  boite            INTEGER NOT NULL CHECK (boite BETWEEN 1 AND 5),
  derniere_revue_le TEXT   NOT NULL,
  echeance_le      TEXT    NOT NULL,
  nb_revues        INTEGER NOT NULL CHECK (nb_revues >= 0),
  PRIMARY KEY (profil_id, item)
) STRICT;

CREATE INDEX idx_leitner_echeance ON items_leitner (profil_id, echeance_le);

CREATE TABLE sorties (
  id          TEXT PRIMARY KEY,
  profil_id   TEXT NOT NULL REFERENCES profils(id),
  region      TEXT NOT NULL,
  compagnon   TEXT,
  plan_json   TEXT NOT NULL,
  composee_le TEXT NOT NULL,
  close_le    TEXT
) STRICT;
```

```sql
-- serveur/migrations/004_cascade.sql — L2-A
-- Projection recalculable depuis `tentatives`. Elle existe pour l'affichage, pas pour la vérité.
CREATE TABLE progression_cascade (
  profil_id                   TEXT PRIMARY KEY REFERENCES profils(id),
  etoiles_total               INTEGER NOT NULL CHECK (etoiles_total >= 0),
  etoiles_depuis_inter        INTEGER NOT NULL CHECK (etoiles_depuis_inter >= 0),
  intermediaires_total        INTEGER NOT NULL CHECK (intermediaires_total >= 0),
  intermediaires_depuis_rare  INTEGER NOT NULL CHECK (intermediaires_depuis_rare >= 0),
  rares_total                 INTEGER NOT NULL CHECK (rares_total >= 0),
  dernier_palier_le           TEXT
) STRICT;
```

```sql
-- serveur/migrations/005_monde.sql — L2-F
CREATE TABLE progression_region (
  profil_id            TEXT    NOT NULL REFERENCES profils(id),
  region_code          TEXT    NOT NULL,
  ouverte              INTEGER NOT NULL CHECK (ouverte IN (0, 1)),
  -- Ne décroît jamais : MAX(ancien, nouveau), comme `progression_noeud.etoiles` (R14).
  pourcentage_colorie  REAL    NOT NULL CHECK (pourcentage_colorie BETWEEN 0 AND 1),
  eclat_obtenu_le      TEXT,
  PRIMARY KEY (profil_id, region_code)
) STRICT;

CREATE TABLE compagnons (
  profil_id TEXT NOT NULL REFERENCES profils(id),
  code      TEXT NOT NULL CHECK (code IN ('filou', 'bulle', 'roc', 'plume')),
  rallie_le TEXT NOT NULL,
  PRIMARY KEY (profil_id, code)
) STRICT;

CREATE TABLE formes_gobi (
  profil_id     TEXT NOT NULL REFERENCES profils(id),
  grapheme_code TEXT NOT NULL,
  obtenue_le    TEXT NOT NULL,
  PRIMARY KEY (profil_id, grapheme_code)
) STRICT;

-- Un SEUL enregistrement de stade par profil, et il ne recule jamais (D28).
-- Le dépôt écrit MAX(rang_ancien, rang_nouveau) ; la contrainte de rang le rend vérifiable.
CREATE TABLE stade_gobi (
  profil_id  TEXT PRIMARY KEY REFERENCES profils(id),
  stade_code TEXT    NOT NULL,
  rang       INTEGER NOT NULL CHECK (rang >= 1),
  atteint_le TEXT    NOT NULL
) STRICT;

CREATE TABLE campement (
  profil_id  TEXT NOT NULL REFERENCES profils(id),
  objet_code TEXT NOT NULL,
  place_le   TEXT NOT NULL,
  PRIMARY KEY (profil_id, objet_code)
) STRICT;

-- R11 : ce que l'enfant a déjà touché. Sert à varier les réactions, jamais à noter quoi que ce soit.
CREATE TABLE points_visites (
  profil_id   TEXT    NOT NULL REFERENCES profils(id),
  point_code  TEXT    NOT NULL,
  nb_visites  INTEGER NOT NULL CHECK (nb_visites >= 0),
  derniere_le TEXT    NOT NULL,
  PRIMARY KEY (profil_id, point_code)
) STRICT;
```

```sql
-- serveur/migrations/006_parent.sql — L2-H
-- Un seul code pour le foyer, pas un par profil : c'est une zone parent, pas un compte.
CREATE TABLE code_parent (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  sel        BLOB NOT NULL,
  empreinte  BLOB NOT NULL,
  cree_le    TEXT NOT NULL,
  modifie_le TEXT NOT NULL
) STRICT;

CREATE TABLE verrou_parent (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  nb_echecs          INTEGER NOT NULL CHECK (nb_echecs >= 0),
  verrouille_jusqua  TEXT
) STRICT;

-- File de relecture : « obligatoirement relu et validé par le parent avant d'atteindre
-- l'enfant » (v2 § 13.4). Un brouillon non validé ne quitte JAMAIS `contenu/brouillons/`.
CREATE TABLE relecture_contenu (
  exercice_id TEXT PRIMARY KEY,
  chemin      TEXT NOT NULL,
  statut      TEXT NOT NULL CHECK (statut IN ('en-attente', 'valide', 'rejete')),
  deposee_le  TEXT NOT NULL,
  traitee_le  TEXT,
  motif       TEXT
) STRICT;
```

**Deux règles de dépôt qui ne sont pas dans le SQL et qui comptent autant que lui :**

- `maitrise_competence.acquise_le` s'écrit `COALESCE(ancien, nouveau)`, jamais `nouveau`.
- `stade_gobi` et `progression_region.pourcentage_colorie` s'écrivent en `MAX`, jamais en
  affectation directe.

C'est la traduction en SQL de « un acquis n'est jamais repris », exactement comme
`progression_noeud.etoiles` au contrat v1 § 6.3. Chaque lot concerné porte un test T2 qui
**tente la régression et vérifie qu'elle n'a pas eu lieu**.

---

## 7. Attributs `data-*` — extension du contrat v1 § 10

Les 13 attributs du contrat v1 § 10 sont **conservés sans modification**. Les tests E2E, visuels et
d'a11y n'ont pas d'autre prise sur l'interface : cette table est opposable dans les deux sens.

| Attribut | Porté par | Valeurs | Lot | Vérifié par |
|---|---|---|---|---|
| `data-palier` | chaque jauge | `etoile` `intermediaire` `rare` | L2-A | `parcours-cascade` |
| `data-restant` | idem | le nombre **restant**, jamais l'acquis | L2-A | `JaugePalier.test`, `parcours-cascade` |
| `data-serie` | racine de `EcranNoeud` | longueur de la série en cours | L2-A | `gamefeel-serie` |
| `data-police` | racine de toute `ZoneDeLecture` | une `CodePolice` | L2-B | `polices.spec` |
| `data-lecture` | idem | `oui` — marque une zone de déchiffrage | L2-B | `polices.spec`, `a11y` |
| `data-syllabe` | chaque segment coloré | le rang, `0` ou `1` selon l'alternance | L2-B | `ZoneDeLecture.test` |
| `data-zone-cible` | chaque zone de `place` | l'`IdZoneCible` | L2-C | `MoteurPlace.test` |
| `data-element` | chaque élément de la réserve | l'`IdElement` | L2-C | `MoteurPlace.test` |
| `data-place` | idem | `oui` `non` | L2-C | `MoteurPlace.test` |
| `data-trait` | chaque trait de lettre | l'`IdTrait` | L2-C | `MoteurTrace.test` |
| `data-trait-etat` | idem | `a-tracer` `en-cours` `trace` | L2-C | `parcours-trace` |
| `data-axe` | racine de `MoteurTrace` | `gauche-droite` `haut-bas` — **jamais les deux** | L2-C | `trace-validation`, `parcours-trace` |
| `data-moteur` | racine de chaque moteur | un `CodeMoteur` | L2-E | `parcours-variete` |
| `data-habillage` | racine de chaque moteur | un `IdHabillage` | L2-E | `parcours-variete` (R13) |
| `data-interaction` | élément librement tapable | `libre` | L2-F | **R11**, `parcours-campement` |
| `data-animation-unique` | idem, quand c'est le cas | `oui` | L2-F | R11, ≥ 10 |
| `data-replique` | idem, quand il y en a une | `oui` | L2-F | R11, ≥ 6 |
| `data-stade-gobi` | racine de `Gobi` | un `CodeStadeGobi` | L2-F | `parcours-campement` |
| `data-region-etat` | chaque région de la carte | `voilee` `ouverte` `terminee` | L2-F | `carte.spec` |
| `data-parent` | racine des écrans parent | `code` `dashboard` | L2-H | `parcours-parent` |
| `data-verrou` | `EcranCodeParent` | `actif` `inactif` | L2-H | `parcours-parent` |
| `data-confusion-axe` | chaque ligne du top 10 | `gauche-droite` `haut-bas` | L2-H | `parcours-parent` (D23) |

**`data-etat="echec"` continue de n'être émis par aucun composant, jamais.** `cassecou` en assert
l'absence après 40 réponses fausses ; c'est la traduction mécanique de R14, et le seul principe
des specs qu'il serait catastrophique de casser sans s'en apercevoir.

**Tout élément portant `data-godet`, `data-region-svg`, `data-zone-cible`, `data-element`,
`data-trait` ou `data-interaction`** doit présenter une boîte d'au moins 64 × 64 px CSS sur la
Galaxy Tab S10 FE (1920 × 1200, DPR 2). Assertion étendue dans `tests/qualite/a11y.spec.ts` —
**fichier possédé par L-G en v1 et NON réattribué** : les trois lots concernés ajoutent leurs
sélecteurs dans leur propre fichier `tests/qualite/*.spec.ts`, jamais dans celui-là.

---

## 8. Ce qui est repoussé — avec sa raison écrite

« Une exigence sans test ni raison écrite est un vœu » (annexe T). Voici les raisons.

| # | Repoussé | Source | Motif écrit |
|---|---|---|---|
| 1 | **La voix pré-rendue Piper (R15)** | v2 § 10.1, lot L2 des specs | R15 exige que toute consigne soit audible en un tap. Le socle v1 câble `VoixMuette` et l'a consigné comme dette explicite (écart v1 n° 4). **Cette campagne ne la lève pas** : le rendu Piper est un artefact de build, pas du code applicatif, il demande un binaire, un casting de voix et un contrôle qualité par ASR inverse (annexe P § 4). Ce qui **est** livré : `consigne.audio` reste un champ dans les 13 schémas de contenu, `FournisseurVoix` est appelé partout où R15 l'exige, et le contrôle 8 de `test:contenu` reste désactivé **avec sa raison écrite**. Le jour où les clips existent, aucune interface ne bouge. **R15 n'est donc toujours pas satisfaite, et le rapport de campagne doit le dire.** |
| 2 | **La musique générative en couches (Tone.js)** | v2 § 10.2 | Ce qui est rentable a été mesuré et nommé par les specs elles-mêmes : « le son court à hauteur montante selon la série est le détail le plus rentable de toute la liste » (v2 § 8, repris en D26). Il est livré par L2-A en WebAudio natif, sans Tone.js. Les couches par région, les mnémoniques par graphème et l'accord sur la tonalité en cours demandent Tone.js dans le bundle, ce que le budget de 250 Ko ne tolère pas sans découpage différé. **À faire à la campagne suivante, en chunk différé.** |
| 3 | **Le niveau 7 du corpus — rédaction libre** | O7, fiches-origine § 5 F2 | Le point ouvert **n'est pas tranché** : LLM juge local, validation parent différée, ou transformation en phrase à trou. Trois voies légitimes, aucune décision. `formats/niveau7.py` est donc écrit pour **REFUSER explicitement** et écrire son motif au manifeste, plutôt que de produire un brouillon qu'aucun moteur ne sait valider. Refuser plutôt qu'émettre du faux. |
| 4 | **Les cinématiques de fin de région** | v2 § 5.1, addendum § A.2 | Elles supposent une région entière terminée. Aucune région ne l'est : le contenu jouable est de 1 nœud aujourd'hui et de quelques dizaines après cette campagne. Les livrer maintenant serait produire un film pour un monde qui n'existe pas encore. **La recoloration de zone, elle, est livrée** — c'est la partie de la mécanique signature qui a un objet. |
| 5 | **Verdana embarquée** | v2 § 9.3 | Police système propriétaire : elle **ne peut pas** être redistribuée dans le dépôt. Elle reste proposée dans la liste et rendue par la pile système ; absente, `polices.ts` retombe sur Andika. C'est un écart au « tout est servi en WOFF2 depuis le PC », assumé et sans alternative légale. |
| 6 | **Le vrai/faux comme moteur autonome** | O5 | Le point ouvert « le vrai/faux mérite-t-il de survivre ? » n'est pas tranché. Il est le format le moins informatif (`p_devinette = 0,50`) et le plus fréquent du corpus. Décision de contrat : **il ne reçoit pas de moteur à lui**. Il est une variante de réponse du moteur `histoire`, ce qui permet de le livrer sans lui donner un statut qu'il n'a pas mérité, et de le retirer d'une ligne si O5 se tranche contre lui. |
| 7 | **L'écran de gestion de fratrie** | D17, lot L8 des specs | « Aucun écran de gestion de fratrie n'est développé tant qu'il n'y a pas de second enfant. » Le modèle multi-profils est déjà en base et le reste : c'est ce qui coûte cher à rattraper, et c'est déjà fait. |
| 8 | **Le marquage nominal des identifiants** (*branded types*) | écart v1 n° 6 | Même motif qu'en v1, et il vaut davantage à 8 lots qu'à 7 : les *branded types* multiplieraient les points de non-compilation entre lots parallèles. Le marquage s'ajoutera plus tard sans changer un site d'appel. |
| 9 | **Le mutation testing (Stryker)** | annexe T § 7 | L'annexe le restreint déjà à `pedagogie/` et `validation/`. Il suppose une suite stable ; elle ne l'est pas tant que L2-D n'a pas rendu. **À lancer juste après cette campagne, sur `partage/src/pedagogie/` seulement** — c'est là qu'un bug ne se voit pas à l'écran. |
| 10 | **L'entraînement d'une LoRA de style et la génération des décors** | D11, D30, D31 | D11 a déjà décidé que l'ingestion passe devant la génération, et D31 a mesuré que l'étape A — choisir **une** image canonique — n'est **pas automatisable** : c'est la validation humaine D7. Tous les assets de cette campagne sont donc des **SVG bouchons écrits à la main** (D2), régions fermées par construction. Ils deviennent le cas de test permanent de la vraie chaîne. |
| 11 | **Le geste de frottement au doigt** en coloriage d'exercice | D15 | Déjà tranché : tap en exercice, frottement réservé au chaudron du campement. Le chaudron est livré par L2-F ; le frottement lui-même est repoussé, parce qu'il n'a aucun enjeu de validation et qu'il ne bloque rien. |

---

## 9. Questions de design en attente

L'utilisateur est absent et a demandé de ne jamais bloquer : **on choisit un défaut raisonnable, on
le marque `PLACEHOLDER` dans le code, on consigne, on continue.** Une règle des specs ou du journal
des décisions **n'est pas** une question ouverte : elle s'applique.

Les questions ci-dessous sont **déjà tranchées par un défaut** dans ce contrat. Chaque lot qui en
rencontre une nouvelle **ajoute une section à la fin de `Docs/questions-en-attente.md`** — il crée
le fichier s'il n'existe pas, et **n'en réécrit jamais le contenu** : c'est le seul fichier où
plusieurs lots écrivent.

| # | Question | Défaut retenu | Lot | Ce qui la rend réversible |
|---|---|---|---|---|
| **Q1** | Interlettrage de départ : Zorzi mesure +2,5 pt sur des enfants **diagnostiqués dyslexiques** ; l'enfant ne l'est pas (D19, « limite honnête ») | `0.06 em`, à mi-chemin entre normal et maximum | L2-B | C'est un réglage en base, et le protocole A/B le mesurera sur lui en quelques semaines. C'est tout l'intérêt de D19 |
| **Q2** | Faut-il **7 ou 5** paliers de découpage syllabique certain ? Le français n'a pas de règle sans exception | Règle + lexique d'exceptions, champ `certain` sur chaque segment | L2-B | Le champ `certain` permet de compter les cas douteux avant de décider |
| **Q3** | **Combien de stades pour Gobi ?** D28 le laisse explicitement ouvert | **5**, parce que les cinq séries de production deviennent alors cinq stades et non cinq échecs (D28, point 1) | L2-F | `gobi-stades.json` est une donnée. Changer le nombre ne touche aucune ligne de code |
| **Q4** | Le stade se **choisit-il ou se subit-il** ? (D28, troisième question) | Il se **subit** — il découle du nombre de formes. Le choix porte sur la forme active, pas sur le stade | L2-F | `stadeApresFormes` est une fonction pure ; un mode « choix » s'ajouterait à côté |
| **Q5** | Plafond de la hauteur montante : au-delà de combien de bonnes réponses cesse-t-on de monter ? | **12 demi-tons**, une octave — au-delà ça sonne strident sur haut-parleur de tablette | L2-A | Une constante dans `serie.ts`, à passer en donnée si elle bouge |
| **Q6** | Durée du verrouillage parent après 5 échecs | **15 minutes** | L2-H | Constante exportée, testée par table |
| **Q7** | Couverture minimale d'un tracé de lettre pour le valider | **80 %** des points du modèle | L2-C | Constante exportée ; à régler **sur l'enfant**, pas sur une moyenne |
| **Q8** | Les 4 couleurs `rouge`, `orange`, `vert`, `violet` du nuancier restent **non validées** (écart v1 n° 2) | Conservées telles quelles | — | Question **héritée du contrat v1, toujours ouverte**. Elle n'a bloqué personne et ne bloque toujours personne, mais elle n'a pas non plus été tranchée |
| **Q9** | La forme canonique de Gobi n'est **pas validée** (D7, D31 étape A) | Tous les assets Gobi sont des **SVG bouchons marqués PLACEHOLDER** | L2-F | L'étape A n'est pas automatisable et n'a pas à l'être : c'est la validation D7. Aucun lot ne la contourne |
| **Q10** | Le nom du jeu (O1) | « La Pierre des Mots », titre de travail | — | Aucun code n'en dépend : il vit dans `index.html` et dans les libellés |

---

## 10. Contrat de sortie — les chiffres, mesurés

Comptés par script sur ce fichier même, pas affirmés. Commande et sortie citées en § 10.2.

| Grandeur | Valeur |
|---|---|
| **Fichiers listés dans l'arborescence (§ 3)** | **375** |
| dont neufs | 341 |
| dont existants à modifier | 34 |
| **Chemins distincts** (aucun fichier à deux propriétaires) | **375** |
| dont **L2-A** game feel et récompenses | 34 |
| dont **L2-B** typographie et lecture | 33 |
| dont **L2-C** moteurs `place` et `trace` | 37 |
| dont **L2-D** pédagogie | 32 |
| dont **L2-E** les onze autres moteurs | 147 |
| dont **L2-F** carte, campement, Gobi | 41 |
| dont **L2-G** ingestion niveaux 2 à 7 | 26 |
| dont **L2-H** dashboard parent | 25 |
| **Types partagés écrits en entier au § 4** | **102** |
| **Valeurs partagées** (fonctions, constantes) écrites au § 4 | **87** |
| **Symboles inter-lots** (§ 4 explicites + 66 du motif L2-E) | **255** |
| **Migrations SQL nouvelles** | **5** (002 à 006) |
| Moteurs à écrire (2 par L2-C, 11 par L2-E) | 13 — le catalogue passe de 1/13 à 13/13 |
| Habillages déclaratifs à écrire | 35 (33 pour L2-E, 2 pour L2-C) |
| Routes HTTP nouvelles | 12 — l'API passe de 7 à 19 |
| Attributs `data-*` nouveaux | 22 — le contrat passe de 13 à 35 |

### 10.1 Décomposition des 255 symboles inter-lots

| Lot | Types | Valeurs | Total | Où ils vivent |
|---|---|---|---|---|
| **L2-C** | 31 | 29 | **60** | `moteurs/commun/`, `moteurs/place/`, `moteurs/trace/` — c'est le lot le plus riche en surface, parce qu'il écrit le socle des onze autres |
| **L2-E** | 33 | 33 | **66** | Le motif uniforme du § 4.8, appliqué onze fois |
| **L2-D** | 21 | 17 | **38** | `pedagogie/` — plus la propriété du barillet et des 9 sous-chemins |
| **L2-F** | 16 | 9 | **25** | `monde/` |
| **L2-A** | 16 | 12 | **28** | `recompenses/`, `fournisseurs/haptique.ts`, `client/src/gamefeel/` |
| **L2-H** | 8 | 12 | **20** | `parent/`, `services/code-parent.ts` |
| **L2-B** | 10 | 8 | **18** | `lecture/` |
| **L2-G** | 0 | 0 | **0** | Frontière de **fichiers** et de **processus**, pas de symboles |

L2-G n'exporte aucun symbole TypeScript, et c'est normal : son livrable est
`contenu/brouillons/**`, un schéma JSON et un script npm. Sa frontière est documentée au § 5.1 et
elle est tout aussi opposable — `test:contenu` la vérifie.

### 10.2 Comment ces chiffres ont été obtenus

Comptage mécanique sur ce fichier, pas estimation. Les fichiers sont les lignes du § 3 de la forme
`` | `chemin` | L2-X | `` ; les symboles sont les `export` des blocs `ts` du § 4, rattachés à leur
lot par la ligne de commentaire `// <chemin> — L2-X` en tête de bloc. Sortie exacte :

```
$ python compter.py Docs/contrat-features-v2.md
fichiers total      : 375
par lot             : {"L2-A":34,"L2-B":33,"L2-C":37,"L2-D":32,"L2-E":147,"L2-F":41,"L2-G":26,"L2-H":25}
chemins distincts   : 375
doublons            : aucun
neufs / modifies    : 341 / 34
types declares      : 102
valeurs declarees   : 87
types par lot       : {"L2-A":16,"L2-B":10,"L2-C":31,"L2-D":21,"L2-F":16,"L2-H":8}
valeurs par lot     : {"L2-A":12,"L2-B":8,"L2-C":29,"L2-D":17,"L2-F":9,"L2-H":12}
moteurs avec moteur.ts : 13  ['assemble','attrape','chemin','chrono','eclair','grave',
                              'histoire','libre','paires','phrase','place','trace','tri']
migrations nouvelles   : 5   ['002_lecture.sql','003_pedagogie.sql','004_cascade.sql',
                              '005_monde.sql','006_parent.sql']
habillages declares    : 35
routes nouvelles       : 12
attributs data-* nouveaux : 22
```

`chemins distincts == fichiers total` est l'assertion qui prouve qu'**aucun fichier n'a deux
propriétaires** : la règle « un seul écrivain par fichier » est mécaniquement vérifiée, pas
supposée. **À refaire après toute modification de ce document.**

### 10.3 Les quatre défauts qui rendraient ce contrat RATÉ — vérifiés

1. **Un lot sans aucun fichier.** → aucun : les huit comptes sont non nuls, le plus petit est
   L2-H à 25.
2. **Un fichier à deux propriétaires.** → aucun : 375 chemins pour 375 lignes.
3. **Un symbole inter-lots sans propriétaire.** → aucun : chaque bloc `ts` du § 4 porte en
   première ligne le chemin de son fichier et son lot, et ce chemin figure au § 3.
4. **Un fichier modifié dont le propriétaire n'est pas nommé.** → aucun : les 34 fichiers **(M)**
   portent tous un lot, et aucun n'apparaît deux fois. C'est le point qui a fait tomber une
   campagne le 2026-07-31 (CLAUDE.md) : *un contrat gelé n'oblige personne tant qu'un fichier
   n'est pas nommé pour chaque morceau*.

### 10.4 Ce que chaque lot doit CALCULER pour prouver qu'il n'est pas creux

Convention C4. Un lot qui rend un rapport sans son chiffre n'a pas fini.

| Lot | Chiffre à calculer | Échoue si |
|---|---|---|
| **L2-A** | Délai médian appui → première mutation du DOM, mesuré par `gamefeel-latence.spec.ts` | > 100 ms (v2 § 8) |
| **L2-A** | Nombre de particules émises au pic, compté sur le canevas | > 14 (v2 § 8) |
| **L2-B** | Nombre de requêtes réseau sortantes pendant le rendu des 5 polices, interception Playwright | ≠ 0 (v2 § 9.3 : « aucun appel à Google Fonts ») |
| **L2-B** | `segments.join('') === mot` sur tout le lexique du contenu | une seule contre-épreuve |
| **L2-C** | Part des refus `trace` pour lesquels `axe` est renseigné, sur les fixtures de paires | < 90 % — un moteur qui rend toujours `null` est creux |
| **L2-C** | Nombre de consignes « Dessine… » du niveau 1 couvertes par `place` | < 8 (mesuré au manifeste : `consignesParType.place = 8`) |
| **L2-D** | Nombre de propriétés `fast-check` au vert, sur les 12 de P1 à P12 | < 12 |
| **L2-D** | Écart entre le rejeu de `journal-reference-01.jsonl` et sa référence | ≠ 0 sans explication écrite **et validée** — jamais mis à jour de sa propre initiative (annexe T § 6) |
| **L2-E** | Nombre de compétences couvertes par ≥ 3 moteurs distincts, sur le contenu réel (R12) | une seule compétence sous 3 |
| **L2-E** | Nombre d'habillages répétés sur 200 sorties simulées (R13) | ≠ 0 |
| **L2-F** | `auditerCampement(...)` sur `campement.json` réel : les trois comptes | `conforme === false` (R11 : 25 / 10 / 6) |
| **L2-F** | Rang de stade sur 10 000 séquences aléatoires de gains et de pertes | une seule décroissance (D28, R14) |
| **L2-G** | `fichesIngerees + fichesRefusees === fichesDuPdf`, sur les 6 niveaux | l'égalité fausse sur un seul niveau |
| **L2-G** | Différence entre le manifeste du niveau 1 régénéré et `tests/fixtures/ingestion/manifeste-niveau-1.json` | ≠ 0 — la refactorisation doit être neutre |
| **L2-H** | Nombre de lignes du top 10 dont `axe` est nul | ≠ 0 (D23) |
| **L2-H** | Nombre d'échecs avant verrou, mesuré par requête | ≠ 5 (v2 § 11) |
| **campagne** | `grep -rn "as unknown as" client/src \| wc -l` | ≠ 0 (défaut 2 du § 1.5) |
| **campagne** | Somme gzip des entrées initiales de `client/dist/` | > 250 Ko (v2 § 13.5) |
| **campagne** | Occurrences de `__test`, `chargerProfil`, `allerAuNoeud`, `sauterAnimations`, `figerHorloge`, `monterCrochetsDeTest` dans `client/dist/` | ≠ 0 (contrat v1 § 7.3) |

---

## 11. Risques connus de ce contrat

| Risque | Ce qui casse | Parade |
|---|---|---|
| **L2-E est quatre fois plus gros que la moyenne** (147 fichiers) | Le mur d'horloge de la campagne entière est celui de L2-E | § 2.1 : partition en E1/E2/E3/E4, fichiers disjoints, quatre agents. E4 écrit les deux registres **en dernier** |
| Un lot déclare `creerEtat: (…) => …` au lieu de `creerEtat(…)` | `MoteurQuelconque` cesse d'être assignable, **les deux registres ne compilent plus** | Note normative rappelée au § 4.8, règle 1. À vérifier en revue mécanique sur les 13 moteurs |
| L2-D est en retard | Le barillet, les 9 sous-chemins et les alias manquent : **plus rien ne compile** | § 2.1 : L2-D est en vague 1, avec L2-C. C'est le chemin critique |
| Une `export const` glissée dans les additions au barillet | Le budget de 250 Ko saute | C1 explicite ; `verifier-bundle.mjs` le mesure déjà |
| L'ordre des 9 alias est faux dans `vite.config.ts` ou `vitest.config.ts` | `@pierre/partage` capture `@pierre/partage/pedagogie` : imports silencieusement faux | § 4.7 : du plus spécifique au moins spécifique. Deux propriétaires distincts (L2-B et L2-D) — **à vérifier des deux côtés** |
| Deux lots écrivent `Docs/questions-en-attente.md` en même temps | Perte d'une question | § 9 : on **ajoute à la fin**, on ne réécrit jamais le fichier |
| `competences.json` renuméroté par mégarde | Tout le contenu existant référence des codes morts | § 3.4 : objet protégé (annexe P § 6.4). On **ajoute**, on ne renomme pas |
| Les 5 polices ne sont pas téléchargeables hors ligne | `test:visuel` échoue au lancement | `scripts/telecharger-polices.mjs` avec empreintes épinglées, appelé à l'installation. Absence = défaut d'**environnement**, le rapport doit le nommer comme tel |
| `.venv/` absent | Toute l'ingestion échoue | Prérequis d'orchestrateur (§ 2.2). `scripts/ingerer.mjs` le crée et le dit |
| potrace absent de `outils/bin/` | La vectorisation échoue | `scripts/telecharger-outils.mjs` (L2-G) le télécharge — D9, jamais d'installation globale |
| Un moteur journalise `confusion: null` partout | Le top 10 du dashboard est vide et **personne ne s'en aperçoit** — l'indicateur le plus important de D23 devient creux en silence | § 10.4 : L2-C et L2-H portent chacun un chiffre qui échoue sur ce cas précis. C'est exactement le défaut « détecteur qui déclare un poids qu'il n'applique jamais » de CLAUDE.md |
| **R15 reste non satisfaite** | Une consigne peut n'exister qu'à l'écrit — pour un enfant qui déchiffre encore (D14), c'est le pire défaut possible | § 8, n° 1 : **assumé, écrit, et à dire dans le rapport de campagne.** `FournisseurVoix` est appelé partout ; le jour où les clips existent, aucune interface ne bouge |
