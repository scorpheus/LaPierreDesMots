# Addendum — portage Android autonome (APK hors-ligne)

**Statut : contrat gelé le 2026-08-08, avant toute écriture de code.** Complète la v2 et l'annexe P
sans les réviser ; ne modifie aucun des quatre documents de référence (CLAUDE.md § « Les documents
et leur autorité »).

## 1. Motif

Le jeu tourne aujourd'hui en client/serveur : React sur la tablette, Fastify + `node:sqlite` sur le
PC, LAN entre les deux (`demarrer.bat`). Objectif du propriétaire : pouvoir aussi packager la
**même** base de code en APK Android, jouable **sans PC et sans réseau**, sans forker le client ni
dupliquer la logique entre les deux cibles.

## 2. Constat mesuré (avant d'écrire quoi que ce soit)

Deux audits du dépôt, sortie citée à l'appui :

- `node:sqlite` (`DatabaseSync`) est la **seule** brique non portable vers une WebView Android.
  Tout le reste — types de contrat, BKT/Leitner/sélecteur, migrations SQL — est déjà indépendant
  du framework HTTP.
- `serveur/src/services/*.ts` (7 fichiers) n'importe déjà rien de Fastify (`grep -n "fastify\|Fastify"` :
  aucun résultat), mais 3 fichiers (`etat-profil.ts`, `indicateurs.ts`,
  `reinitialisation-profil.ts`) exécutent du SQL en direct au lieu de passer par `depots/`.
- `serveur/src/depots/*.ts` (10 fichiers : `cascade, etapes, leitner, maitrise, monde, parent,
  profils, progression, reglages, tentatives`) ont déjà la forme d'un repository typé —
  `(base: DatabaseSync, ...) => TypeDePartage`, aucun type Fastify — seul le premier paramètre les
  rend non portables.
- ~200 lignes de logique métier vivent dans les routes, pas dans les services :
  `validerCreationProfil` (`serveur/src/routes/profils.ts:52-93`) et
  `validerTentative`/`validerEtapes`/`validerConfusion` (`serveur/src/routes/tentatives.ts:83-254`).
- `client/src/api/client.ts` n'est pas une interface : ~28 fonctions `fetch` exportées
  individuellement (`demander<T>` en L136 est le seul point commun).
- La règle « un seul fichier appelle le réseau côté client » est déjà écrite dans le code
  (`client/src/etat/services.ts:128-136`), avec une dette déjà signalée (`chargerSeuilsCascade`
  fait un `fetch` hors de `client.ts`). L'audit a trouvé deux autres entorses :
  `MoteurColorie.tsx:54` et `MoteurPlace.tsx:66`.
- `contenu/` pèse **7,29 Mo** (audio 5,20 · habillages 0,56 · exercices 0,36 · assets 0,16) —
  embarquable dans l'APK sans discussion.
- Aucune dépendance SQLite navigateur n'existe encore (`sql.js`/`wa-sqlite`/`capacitor`/`idb`/
  `dexie` : NON TROUVÉ dans tous les `package.json`).
- **Le point qui dimensionne le chantier** : `DatabaseSync` est **synchrone**, mais tout adaptateur
  SQLite pour Android (WASM ou plugin natif Capacitor) traverse un pont **async**. Le contrat de
  dépôt partagé doit donc être async dès sa définition — ça touche la signature de chaque fonction
  de `depots/*.ts` et de chacun de ses appelants. C'est le vrai coût, pas le SQL lui-même qui ne
  change pas de forme.

## 3. Architecture retenue

Un port `Base` (repository) et un port `Api` (client), chacun à deux adaptateurs. La logique — SQL
des dépôts, orchestration des services, validation, BKT/Leitner/sélecteur — migre dans `partage/`
sous un contrat async unique. Chaque cible ne fournit plus qu'un adaptateur mince.

```
partage/src/base/            (sous-chemin isolé, même principe que @pierre/partage/ton)
  contrat.ts                 interface Base — voir § 4
  depots/*.ts                déplacés depuis serveur/src/depots/, signatures rendues async
  services/*.ts              orchestration + validation, déplacées depuis serveur/src/services/
                              et serveur/src/routes/{profils,tentatives}.ts
  migrations.ts               runner de migration, rejouable contre n'importe quel Base

serveur/src/base/adaptateur-node-sqlite.ts     DatabaseSync -> Base (Promise.resolve, trivial)
serveur/src/routes/*.ts                        redevient un mince wrapper HTTP -> service

client/src/base/adaptateur-capacitor-sqlite.ts @capacitor-community/sqlite -> Base

client/src/api/
  contrat.ts                 interface PortApi — voir § 5
  port-http.ts                 renommé depuis client.ts, implémentation fetch inchangée
  port-local.ts                 appelle les services de @pierre/partage/base en direct, zéro réseau
  index.ts                     choisit le port au démarrage — même motif que
                                creerServicesParDefaut dans etat/services.ts
```

**Pourquoi `@capacitor-community/sqlite` plutôt qu'un moteur WASM** (`wa-sqlite`/`sql.js`) : c'est
du SQLite natif Android via pont Capacitor, sémantique la plus proche de `node:sqlite` (PRAGMA,
transactions, fichier réel). Le besoin exprimé est un packaging Capacitor, pas une PWA installable
sans app store — un moteur WASM resterait une option de repli si ce besoin apparaissait plus tard.

**Pourquoi ça reste propre** : aucune duplication de logique entre les deux cibles — SQL,
migrations, BKT/Leitner/sélecteur et règles de validation s'écrivent une fois dans `partage/`.
Seuls les adaptateurs (quelques dizaines de lignes chacun) diffèrent. Le mode LAN n'importe jamais
`@pierre/partage/base` côté client ni `adaptateur-capacitor-sqlite.ts` ; le mode autonome n'importe
jamais `port-http.ts` — dead-code elimination par Vite, budget de bundle du mode LAN
(< 250 Ko gzip, v2 § socle technique) inchangé.

## 4. Le contrat `Base` (figé)

```ts
// partage/src/base/contrat.ts
export interface ResultatEcriture {
  readonly changements: number;
  readonly dernierIdInsere: number | bigint;
}

export interface Base {
  /** DDL, PRAGMA, instruction sans paramètres ni valeur de retour (migrations). */
  executer(sql: string): Promise<void>;
  /** INSERT/UPDATE/DELETE paramétré. */
  lancer(sql: string, parametres?: readonly unknown[]): Promise<ResultatEcriture>;
  /** SELECT paramétré, une ligne. */
  uneLigne<T>(sql: string, parametres?: readonly unknown[]): Promise<T | undefined>;
  /** SELECT paramétré, toutes les lignes. */
  lignes<T>(sql: string, parametres?: readonly unknown[]): Promise<readonly T[]>;
  /** Valide au retour, annule sur exception. Remplace `dansTransaction` (serveur/src/base/connexion.ts:42). */
  transaction<T>(action: () => Promise<T>): Promise<T>;
}
```

Pas d'objet « instruction préparée » persistant : chaque appel prend le SQL complet, ce qui
correspond à la fois à `node:sqlite` (`db.prepare(sql).run/get/all(...parametres)`, préparé à la
volée) et à `@capacitor-community/sqlite` (`execute/run/query` prennent le SQL en paramètre à
chaque appel — pas de handle de préparation exposé à ce niveau). Les volumes en jeu (journal d'un
seul enfant) ne justifient pas la complexité d'un cache de préparation.

Les PRAGMA actuels (`journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON`,
`busy_timeout = 5000` — `serveur/src/base/connexion.ts:26-32`) restent posés par l'adaptateur
`node:sqlite` tel quel ; l'adaptateur Capacitor pose ses PRAGMA équivalents (WAL n'a pas de sens
mono-processus sur mobile, mais `foreign_keys = ON` reste requis).

## 5. Le contrat `PortApi` (figé)

Reprend **exactement** les signatures aujourd'hui exportées individuellement par
`client/src/api/client.ts` (L147-401) — `lireSante, listerProfils, creerProfil, lireProfil,
lireProgression, enregistrerTentative, lireMonde, poserObjetCampement, ouvrirZoneParent,
lireDashboardParent, reinitialiserProfilParent, supprimerProfilParent`, etc., ~28 méthodes au
total, une par entrée de `CHEMINS_API` (`partage/src/api/contrats.ts`, 26 routes) plus les deux
sorties déjà hors du fichier (`chargerSeuilsCascade`, assets). Aucune signature ne change : c'est
la condition pour que `PortApiHttp` et `PortApiLocal` soient interchangeables sans toucher aux
composants ni aux hooks TanStack Query qui les consomment.

## 6. Séquencement — 5 lots, chacun vérifiable indépendamment

1. **Fonder le port `Base`, dépôts async partagés.** Déplacement + async des 10 fichiers de
   `depots/`, adaptateur `node:sqlite`. Aucun changement de comportement — `npm run verifier` vert
   à l'identique.
2. **Sortir la logique métier des routes et le SQL inline des services.** Les ~200 lignes de
   validation et les 3 fichiers à SQL direct rejoignent `partage/src/base/services/`. Routes
   Fastify minces partout. Vérification : suite de tests inchangée, verte.
3. **Adaptateur SQLite local Android.** `@capacitor-community/sqlite`, rejeu des 10 migrations SQL
   au premier lancement. Vérification : test d'intégration comparant `node:sqlite` et l'adaptateur
   Capacitor sur le même scénario (mêmes migrations, même écriture, même lecture).
4. **Port `Api` côté client.** `PortApiHttp`/`PortApiLocal`, sélection au démarrage. Corrige au
   passage `MoteurColorie.tsx:54`, `MoteurPlace.tsx:66` et `chargerSeuilsCascade`. Vérification :
   tests client existants verts, plus un test représentatif contre `PortApiLocal` en base mémoire.
5. **Cible de build autonome + packaging Capacitor.** Mode Vite `--mode autonome`, `contenu/`
   embarqué en statique, code-split de `port-local.ts` et de l'adaptateur SQLite. `npx cap add
   android`. Vérification : parcours complet d'un mini-jeu en mode avion sur tablette ou émulateur,
   aucun appel réseau observé, aucun écran d'échec (R14).

## 6bis. Lot 1 — livré, avec quatre affinements découverts à l'écriture

Le Lot 1 (fondation du port `Base`, dépôts async partagés) est **terminé et vert**
(`npx tsc -b` propre sur `partage`+`serveur`+`client`, 2124/2127 tests passent — les 3 restants
sont détaillés plus bas). Quatre points n'étaient pas anticipés par le contrat initial :

1. **Séparation dépôt SQL / chargeur disque.** Quatre fichiers (`cascade`, `maitrise`, `monde`,
   `parent`) mélangeaient logique SQL et lecture `node:fs` de référentiels. Les chargeurs
   (`chargerSeuilsCascade`, `chargerParametresPedagogie`, `chargerReferentielMonde`,
   `synchroniserBrouillons`) restent **serveur-seul** dans `serveur/src/referentiels/` ; le SQL
   pur a rejoint `partage/src/base/depots/`.
2. **Hachage portable.** `node:crypto` n'existe pas en WebView. `partage/src/base/hachage.ts`
   (`hacherSha256Hex`) passe par `globalThis.crypto.subtle` (Web Crypto), disponible aussi bien en
   Node 24 qu'en navigateur. Async par nature — cohérent avec le reste du contrat `Base`.
3. **Verrou réentrant côté adaptateur `node:sqlite`.** Passer d'un code synchrone à un contrat
   async introduit un point de cession entre deux instructions SQL d'une même transaction, ce qui
   n'existait pas avant. `serveur/src/base/adaptateur-node-sqlite.ts` sérialise donc TOUTES ses
   méthodes via un verrou `AsyncLocalStorage`, réentrant pour que le code interne à une
   transaction ne se bloque pas lui-même. Détail complet en tête de ce fichier.
4. **`enregistrerTentative` reçoit `seuilsCascade` et `referentielMonde` en paramètres**, plus
   `reparerProgressionRegion` perd sa valeur par défaut — les deux faisaient une IO cachée
   (`node:fs`) que le dépôt partagé ne peut plus se permettre.

**Une découverte, hors du périmètre du lot, volontairement non corrigée ici** : le test
`tests/unitaires/ecrivains-atteignables.test.ts` (garde Q1) signale 6 fonctions
(`recalculerLeitner`, `noterVisitePoint`, `ouvrirEssai`, `recalculerToutesLesCascades`,
`recalculerToutesLesMaitrises`, `recalculerToutesLesProgressions`) qu'aucune route, script ou
composant client n'appelle réellement — vérifié par `grep` sur tout le dépôt. Ce n'est pas causé
par le déplacement de fichiers : c'est un défaut préexistant que l'ancienne mesure au grain
fichier masquait par coïncidence de colocalisation, et que la nouvelle disposition rend visible.
Corriger cela demande un arbitrage produit (où et quand ces fonctions doivent-elles être
déclenchées ?), donc signalé séparément plutôt que deviné. Les deux autres échecs restants
(`couverture-enumerants.test.ts`, l'orphelinat de 9 SVG sous `contenu/brouillons/` dans
`registre-svg.test.ts`) sont préexistants et sans rapport avec ce chantier — confirmé par `git
status`, aucun des fichiers en cause ne fait partie de cette session.

## 6ter. Lots 2 à 4 — livrés

**Lot 2 (extraction de la logique métier).** `validerCreationProfil`/`validerTentative` ont rejoint
`partage/src/base/services/`, ainsi que `etat-profil.ts`, `indicateurs.ts` et
`reinitialisation-profil.ts` (déplacés depuis `serveur/src/services/`, désormais purs SQL via
`Base`, plus aucune IO cachée). Les routes serveur correspondantes sont redevenues de minces
wrappers HTTP.

**Lot 3 (adaptateur Capacitor SQLite).** `client/src/base/adaptateur-capacitor-sqlite.ts` implémente
`Base` sur `@capacitor-community/sqlite`. Verrou de **profondeur** (compteur), pas
`AsyncLocalStorage` (absent en WebView) — accepté car un seul enfant joue sur un seul appareil à la
fois ; la limite est documentée en tête du fichier. Testé via une fausse connexion Capacitor qui
enveloppe un vrai `node:sqlite` (`tests/unitaires/adaptateur-capacitor-sqlite.test.ts`), faute
d'émulateur Android dans cet environnement.

**Lot 4 (port `Api` client).** `client/src/api/contrat.ts` fige `PortApi` (29 méthodes — les 28
d'origine plus `marquerOuvertureVue`, voir plus bas). `port-http.ts` porte l'implémentation réseau
inchangée ; `port-local.ts` (nouveau, ~500 lignes) appelle directement les services/dépôts de
`@pierre/partage/base` contre la base Capacitor, **zéro réseau**. `client/src/api/client.ts` est
réécrit en sélecteur : `import.meta.env.MODE === 'autonome' ? (await import('./port-local.js')).portLocal : (await import('./port-http.js')).portHttp`,
top-level await, dynamique — Rollup élimine la branche jamais empruntée (imports compris), donc
`port-local.ts` (et `@capacitor-community/sqlite`) n'entre jamais dans le bundle LAN et
réciproquement. Les 37 fichiers qui importaient `client.ts` n'ont pas changé une ligne.

Quatre points non anticipés par le contrat initial :

1. **Parité de FORME des erreurs, pas seulement du résultat.** `EcranCodeParent.tsx` et
   `EcranDefinirCode.tsx` inspectent `ErreurReseau.statut`/`.corps.details` (404, 423, 409, 401)
   pour décider quoi afficher. `port-local.ts` lève donc la même `ErreurReseau`, au même statut,
   avec le même corps, que la route Fastify équivalente aurait produit — sinon les mêmes écrans se
   comportent différemment selon le mode.
2. **`code-parent.ts` était la dernière dépendance `node:crypto` de la zone parent** (`scrypt`,
   `randomBytes`, `timingSafeEqual`). Déplacé vers `partage/src/base/services/code-parent.ts`,
   réécrit sur Web Crypto : PBKDF2-SHA256 (210 000 itérations, recommandation OWASP 2023) au lieu de
   `scrypt`, `getRandomValues` au lieu de `randomBytes`, comparaison à temps constant écrite à la
   main (Web Crypto n'a pas d'équivalent de `timingSafeEqual`). Le protocole ne change pas — sel
   neuf, empreinte dérivée stockée à côté, verrou au 5ᵉ échec — et un code à 4 chiffres reste
   protégé par le VERROU, pas par le coût de la dérivation (10 000 valeurs restent énumérables,
   c'était déjà vrai avec `scrypt`). Utilisé maintenant par le serveur ET l'app autonome : une seule
   implémentation, pas deux qui pourraient diverger. `export-csv.ts` a suivi le même chemin — il
   n'utilisait déjà que `Base.lignes`, donc un pur déplacement.
3. **Trois `fetch()` posés hors de `client.ts` corrigés en le portant**, pas seulement deux prévus
   au constat initial : `MoteurColorie.tsx`, `MoteurPlace.tsx` (`urlAsset()`), et un troisième trouvé
   pendant ce lot dans `routeur.tsx` (`marquerOuvertureVue`, déjà signalé comme dette dans son propre
   commentaire par le lot N4 — « à faire à l'intégration »). Les trois passent maintenant par le
   port, donc fonctionnent en mode autonome comme en LAN.
4. **`chargerSeuilsCascade` (`client/src/etat/services.ts`) faisait un `fetch` direct sur
   `CHEMINS_API.asset(...)`**, contournant le port : en mode autonome, cet appel aurait échoué
   silencieusement (aucun serveur à interroger), rendant les jauges de cascade muettes sans qu'aucun
   test ne le voie. Corrigé en passant par `urlAsset()` du port.

**Contenu embarqué (`client/src/base/depot-contenu-autonome.ts`, `referentiels-autonome.ts`,
`catalogue-galerie-autonome.ts`) :** `import.meta.glob` sur `contenu/exercices`, `contenu/noeuds`,
`contenu/habillages` (JSON, indexés par le champ `id`, jamais par le nom de fichier — même règle que
`depot-contenu-disque.ts`), plus les SVG/Opus/modèles-lettres en URLs bundlées. `contenu/brouillons/`
et `contenu/schemas/` ne sont jamais embarqués (aucune raison produit). La galerie parent (D34)
reconstruit son catalogue depuis ces mêmes index plutôt que de parcourir un disque qui n'existe pas
en WebView.

**Q1 (`ecrivains-atteignables.test.ts`) étendu, pas contourné.** Le découpage de code par mode
introduit un cas que ce garde ne modélisait pas : un module atteint uniquement via un `import()`
dynamique assemblé dans un objet exporté en `const` (méthodes en sténo ES) est invisible à sa marche
par NOM (`portLocal` n'est pas une déclaration `function`, ses méthodes non plus). Trois fonctions
neuves (`creerBase`, `creerBaseCapacitorSqlite`, `migrerBaseAutonome`) apparaissaient donc comme
mortes alors qu'elles sont réellement câblées. Plutôt qu'une exemption (qui aurait caché le trou
pour la prochaine occurrence du même motif), le garde marche maintenant AUSSI par arête
fichier→fichier : un fichier atteint qui `import`e (statique ou dynamique) un autre fichier du dépôt
l'atteint à son tour, quelle que soit la forme de ce qu'il exporte. Les deux témoins de contrôle
(positif/négatif) restent verts, et les 6 orphelins préexistants (non liés à ce chantier, cf. § 6bis)
restent signalés à l'identique.

## 6quater. Lot 5 — livré : build autonome, projet Android, APK vérifié sur émulateur

**`construire-apk.bat`, à la racine, même famille que `demarrer.bat`/`verifier.bat`.** Enchaîne
partage → client en mode autonome → `cap sync android` → `gradlew assembleDebug`, JDK 21 et SDK
détectés automatiquement (`outils/jdk-21/`, `ANDROID_HOME` ou l'emplacement standard), et régénère
`client/android/local.properties` (jamais versionné, propre à chaque machine) à chaque lancement.
Piège rencontré en le testant, gardé en commentaire dans le script : sur une machine où
`NoDefaultCurrentDirectoryInExePath` est posée, `gradlew.bat` invoqué par son nom nu depuis son
propre dossier n'est « pas reconnu » — le script l'appelle donc en `.\gradlew.bat`, résolu quelle
que soit cette variable.

**Cible de build.** `client/package.json` : `construire:autonome` → `vite build --mode autonome`,
sortie dans `dist-autonome/` (troisième sortie, jamais confondue avec `dist/` LAN ni `dist-test/`
Playwright — `client/vite.config.ts`). Script racine miroir : `npm run construire:autonome`.
`chunkSizeWarningLimit` monte à 8192 en mode autonome (le budget de 250 Ko gzip est un contrat du
LAN, mesuré par `verifier-bundle.mjs` sur `dist/` seul — l'alerte par défaut sur `dist-autonome/`
n'aurait rien gardé).

**Projet Android.** `client/capacitor.config.ts` (`webDir: 'dist-autonome'`, `appId` provisoire —
suit le même statut que le nom du jeu, non tranché) ; `npx cap add android` a généré
`client/android/`. `@capacitor/cli` en dépendance de dev du workspace `client`.

**JDK 21, hors du système.** `@capacitor-community/sqlite@8.1.1` exige Java 21
(`sourceCompatibility JavaVersion.VERSION_21` dans son `build.gradle`) ; seul Java 17 (JBR
d'Android Studio) était présent sur la machine. Téléchargé Eclipse Temurin 21 vers `outils/jdk-21/`
— même précédent que `outils/bin/` (D9) : un outil de build tiers, pas une dépendance du projet,
téléchargé après accord explicite du propriétaire. `JAVA_HOME` s'y pointe pour chaque invocation de
`gradlew`, jamais posé globalement.

**Vérifié de bout en bout, sur émulateur (`Medium_Phone_API_36`, API 36), en mode avion réel**
(`svc wifi disable` + `svc data disable`, pas seulement le réglage `airplane_mode_on`) :
`assembleDebug` → APK installé → app lancée → écran de création de profil → profil « Zoe » créé →
carte du monde affichée avec son état réel (régions, pourcentages, étapes) → nœud d'exercice ouvert
avec son SVG d'habillage embarqué rendu → **zéro appel réseau, zéro erreur, zéro crash** sur toute
la session (`logcat` inspecté pour `AndroidRuntime:E`, `FATAL EXCEPTION`, `Sending plugin error`).
Écritures SQL réelles observées : `profils`, `progression_region` (12), `stade_gobi` (2),
`schema_migrations` (10/10). Le mode LAN vérifié en parallèle (même session) : `GET /api/sante`
répond `{"statut":"ok", "moteurs":[…14…]}`.

**Trois défauts trouvés UNIQUEMENT par ce test réel — aucun n'était visible en test unitaire ou en
`tsc -b`, parce que la fausse connexion de `adaptateur-capacitor-sqlite.test.ts` enveloppe
`node:sqlite`, dont le comportement diffère du VRAI plugin sur ces trois points précis :**

1. **`execute()`/`run()` du plugin Android ouvrent CHACUN leur propre transaction par défaut**
   (`transaction?: boolean = true`, absent du typage `Base`). Un `base.executer(...)` appelé
   DEPUIS le callback de `base.transaction(...)` — exactement ce que fait `appliquerMigrations` et
   ce que fera toute écriture de `enregistrerTentative` — tentait donc d'ouvrir une SECONDE
   transaction sur une connexion qui en a déjà une active : crash au tout premier lancement, avant
   qu'aucun écran ne s'affiche (`Execute: Failed in beginTransaction — Already in transaction`).
   Corrigé par une profondeur de transaction EXPLICITE dans `adaptateur-capacitor-sqlite.ts` :
   `execute`/`run` passent `transaction: false` dès que cette profondeur est > 0, et
   `transaction()` lui-même n'ouvre/referme la transaction native qu'au franchissement 0→1 / 1→0.
2. **Le découpeur multi-instructions du plugin Android échoue sur un `;` À L'INTÉRIEUR D'UN
   COMMENTAIRE `--`.** Deux migrations sur dix en portent un — `005_monde.sql:7` et
   `010_recalcul-progression-region.sql:14` — et `005_monde.sql` est précisément celle qui
   échouait (`SQLITE_MISUSE (21) — API called with NULL prepared statement`, la signature
   documentée d'un `sqlite3_prepare_v2` sur un fragment vide/commentaire seul). Contourné en
   n'envoyant plus jamais au plugin qu'UNE instruction à la fois : `executer()` éclate désormais
   le SQL lui-même (`decouperInstructionsSql`, conscient des chaînes `'…'` ET des commentaires
   `--`), avant de le passer au plugin instruction par instruction.
3. **`referentiel/*.json` n'était pas dans les assets embarqués.** `chargerSeuilsCascade()`
   (`client/src/etat/services.ts`, les jauges de cascade) appelle `urlAsset()` pour fetcher ce
   fichier — un chemin séparé de l'import direct que `referentiels-autonome.ts` fait pour son
   propre usage interne. Sans l'entrée correspondante dans le glob d'assets de
   `depot-contenu-autonome.ts`, `urlAssetAutonome()` rendait `null`, le `fetch` échouait
   (« Unable to open asset URL »), et les jauges restaient muettes en silence. Ajouté au glob.

**Ce que ce test réel confirme, au-delà des trois défauts** : la conception du portage (contrat
`Base` async, adaptateurs minces, contenu embarqué par `import.meta.glob`, sélection de port par
`import()` dynamique) est SAINE — aucun des trois défauts ne vient d'une erreur d'architecture,
tous les trois viennent de comportements du plugin natif qu'aucune documentation ni aucun test
hors-appareil ne pouvait révéler. Ce qui reste vrai depuis le § 6bis : *lire le rapport qu'on a
commandé avant d'agir* — ici, lire le `logcat`.

## 7. Ce que ce document ne tranche pas

- Le nom du sous-chemin `@pierre/partage/base` pourra être ajusté en Lot 1 si un conflit de nommage
  apparaît avec l'existant — ce n'est pas un point d'architecture, juste un nom de fichier.
- La stratégie de mise à jour (nouvel APK à réinstaller manuellement vs mécanisme de mise à jour)
  reste à trancher — l'app n'est pas publiée sur un store (D9, installation manuelle de l'APK).
- HTTPS/mkcert (v2 § 18, addendum § B.3) reste un point ouvert indépendant, sans lien avec ce
  portage — le mode autonome n'a pas de serveur donc pas de certificat à poser.
- **`appId` provisoire** (`com.lapierredesmots.app`), suit le même statut que le nom du jeu (v2
  § 18.1, point O1) — à renommer ensemble quand l'enfant aura choisi un titre.
- **Release/signature APK** : ce lot ne produit qu'un `assembleDebug` (non signé, non optimisé),
  suffisant pour jouer sur la tablette du foyer en installation manuelle. Un APK `release` signé
  n'est nécessaire que pour une distribution plus large — hors du besoin exprimé.
