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

## 7. Ce que ce document ne tranche pas

- Le nom du sous-chemin `@pierre/partage/base` pourra être ajusté en Lot 1 si un conflit de nommage
  apparaît avec l'existant — ce n'est pas un point d'architecture, juste un nom de fichier.
- La stratégie de mise à jour (nouvel APK à réinstaller manuellement vs mécanisme de mise à jour) :
  hors sujet ici, à trancher quand la première build Android existera.
- HTTPS/mkcert (v2 § 18, addendum § B.3) reste un point ouvert indépendant, sans lien avec ce
  portage — le mode autonome n'a pas de serveur donc pas de certificat à poser.
