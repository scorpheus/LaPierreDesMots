# Contrat technique v1 — gelé le 2026-08-01

**Statut** contrat gelé. Les 7 lots d'implantation s'y conforment sans pouvoir poser de question.
**Périmètre** la tranche verticale mince de la décision D1 ([journal-des-decisions.md](journal-des-decisions.md)).
**Autorité** ce document ne révise ni la v2, ni l'annexe T, ni l'annexe P. Quand il s'en écarte,
l'écart est nommé en § 12 avec son motif.

**Ce document est le plan partagé.** Un lot ne reçoit en propre que les lignes qu'il possède ; il lit
ce fichier pour tout le reste. Il n'est recopié dans aucun brief.

---

## 0. Conventions qui valent pour les 7 lots

| Règle | Détail |
|---|---|
| Langue | Français partout. **Identifiants sans diacritiques** (`deriver`, pas `dériver`), commentaires et chaînes avec. Seules exceptions : les identifiants imposés par npm, Vite, React, Fastify, Playwright, Vitest. |
| Modules | ESM strict. `"type": "module"` dans les 4 `package.json`. |
| TypeScript | `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `module`/`moduleResolution` = `nodenext`. |
| Extensions d'import | **Tout import relatif porte l'extension `.js`**, y compris depuis un `.ts` : `import { creerAlea } from './alea.js'`. C'est `nodenext` qui l'impose. Un lot qui l'oublie ne compile pas. |
| Imports inter-paquets | Par nom de paquet : `@pierre/partage`, `@pierre/partage/validation`, `@pierre/partage/factices`. Jamais de chemin relatif traversant `../..`. |
| Types uniquement | `import type { … }` obligatoire pour les symboles de type (`verbatimModuleSyntax`). |
| Nommage de fichiers | `kebab-case.ts` pour les modules, `PascalCase.tsx` pour les composants React. Aucun accent dans un nom de fichier. |
| Aléatoire | `Alea` uniquement. `Math.random` interdit par ESLint hors de `partage/src/alea.ts`. |
| Temps | `Horloge` uniquement. `Date.now()` et `new Date()` interdits par ESLint hors de `partage/src/horloge.ts`. |
| Encodage | UTF-8 sans BOM, fins de ligne LF (`.editorconfig` + `.gitattributes` non nécessaires, `core.autocrlf` laissé au défaut). |
| Ports | serveur `8080` (`PIERRE_PORT`), Vite dev `5173`, llama.cpp `8001` (D5), ComfyUI `8188`. |
| Apostrophes | Le texte destiné à l'enfant utilise l'apostrophe typographique `’`. La comparaison passe par `normaliserTexte`. |

**Interdiction de créer un fichier non listé en § 1.** Si un lot pense avoir besoin d'un fichier
absent de l'arborescence, il le signale dans son rapport au lieu de le créer : c'est un défaut du
contrat, à corriger en un seul endroit.

---

## 1. Arborescence complète, fichier par fichier

Lots : **L-A** outillage · **L-B** partage/testabilité · **L-C** serveur · **L-D** client-coquille ·
**L-E** moteur-colorie · **L-F** ingestion-contenu · **L-G** chaîne-de-test.

### 1.1 Racine et outillage

| Chemin | Lot | Rôle |
|---|---|---|
| `package.json` | L-A | Racine des workspaces, section `scripts` de § 8 |
| `tsconfig.base.json` | L-A | Options communes, héritées par les 3 paquets |
| `tsconfig.json` | L-A | Références de projet (`partage`, `serveur`, `client`) pour `tsc -b` |
| `eslint.config.js` | L-A | Plat (flat config), porte les règles `Math.random` / `Date.now` |
| `.gitignore` | L-A | `node_modules/`, `dist/`, `dist-test/`, `outils/`, `.venv/`, `donnees/*.db*`, `tests/rapports/`, `contenu/brouillons/*` |
| `.editorconfig` | L-A | UTF-8, LF, 2 espaces |
| `.npmrc` | L-A | `engine-strict=true`, `fund=false`, `audit=false` |
| `lefthook.yml` | L-A | `pre-commit` → lint + `test` ; `pre-push` → `verifier` |
| `.env.exemple` | L-A | `PIERRE_PORT`, `ATELIER_GRAINE`, `PIERRE_BASE`, `PIERRE_CONTENU`, `PIERRE_LLM_URL` |
| `demarrer.bat` | L-A | Vérifie Node, `npm ci` si besoin, appelle `scripts/demarrer.mjs` |
| `arreter.bat` | L-A | Arrête le processus serveur par son fichier de PID |
| `verifier.bat` | L-A | Appelle `npm run verifier` et ouvre `tests/rapports/RAPPORT.md` |
| `scripts/demarrer.mjs` | L-A | Construit si nécessaire, lance le serveur, affiche IP LAN + QR |
| `scripts/reseau.mjs` | L-A | Détection de l'IP LAN, règle de pare-feu profil privé, QR console |
| `scripts/telecharger-outils.mjs` | L-A | Télécharge les binaires tiers dans `outils/` (aucun en v1 : sort en code 0) |

### 1.2 `partage/` — paquet `@pierre/partage`

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/package.json` | L-B | Nom, `exports` (3 entrées, § 3.1) |
| `partage/tsconfig.json` | L-B | Étend `tsconfig.base.json`, `composite: true` |
| `partage/src/index.ts` | L-B | Barillet : la surface inter-lots publiée (§ 11.1) |
| `partage/src/alea.ts` | L-B | `Alea`, mulberry32 |
| `partage/src/horloge.ts` | L-B | `Horloge`, `figer` / `avancer` |
| `partage/src/identifiants.ts` | L-B | Alias d'identifiants et unions fermées |
| `partage/src/palette.ts` | L-B | Jetons v2 § 9.2 + nuancier de coloriage |
| `partage/src/texte.ts` | L-B | Normalisation (accents, casse, espaces, apostrophes) |
| `partage/src/erreurs.ts` | L-B | `ErreurPierre` typée |
| `partage/src/fournisseurs/voix.ts` | L-B | `FournisseurVoix` |
| `partage/src/fournisseurs/audio.ts` | L-B | `FournisseurAudio` |
| `partage/src/fournisseurs/llm.ts` | L-B | `FournisseurLLM` |
| `partage/src/fournisseurs/depot-contenu.ts` | L-B | `DepotContenu` |
| `partage/src/fournisseurs/factices.ts` | L-B | `VoixMuette`, `AudioMuet`, `LlmScripte`, `DepotContenuMemoire` |
| `partage/src/moteurs/types.ts` | L-B | **L'interface `Moteur` et le type `Habillage`** (§ 4) |
| `partage/src/moteurs/registre.ts` | L-B | Registre par code de moteur |
| `partage/src/moteurs/tous.ts` | L-B | `MOTEURS` — importe `moteurColorie` de L-E |
| `partage/src/contenu/types.ts` | L-B | `Exercice`, `Noeud`, `Competence` |
| `partage/src/contenu/validation.ts` | L-B | Ajv 2020, sous-chemin `@pierre/partage/validation` |
| `partage/src/journal/types.ts` | L-B | `Tentative` (journal append-only) |
| `partage/src/etoiles.ts` | L-B | `calculerEtoiles` (v2 § 6.2) |
| `partage/src/api/contrats.ts` | L-B | Types et chemins des routes HTTP |
| `partage/src/testabilite/surface.ts` | L-B | **Types seuls**, aucune valeur (§ 7.3) |

### 1.3 `serveur/` — paquet `@pierre/serveur`

| Chemin | Lot | Rôle |
|---|---|---|
| `serveur/package.json` | L-C | Dépend de `@pierre/partage`, Fastify 5 |
| `serveur/tsconfig.json` | L-C | `composite: true`, référence `partage` |
| `serveur/src/index.ts` | L-C | Point d'entrée : lit la configuration, écoute |
| `serveur/src/application.ts` | L-C | `construireApplication()` — testable par `fastify.inject()` |
| `serveur/src/configuration.ts` | L-C | Lecture de l'environnement, chemins absolus |
| `serveur/src/base/connexion.ts` | L-C | `node:sqlite`, WAL, `foreign_keys` |
| `serveur/src/base/migrations.ts` | L-C | Applique `migrations/NNN_*.sql` dans l'ordre |
| `serveur/migrations/001_socle.sql` | L-C | Les 3 tables de § 6 |
| `serveur/src/depots/profils.ts` | L-C | CRUD profils |
| `serveur/src/depots/tentatives.ts` | L-C | Insertion idempotente, lecture du journal |
| `serveur/src/depots/progression.ts` | L-C | Projection + `recalculerProgression` |
| `serveur/src/routes/sante.ts` | L-C | `GET /api/sante` |
| `serveur/src/routes/profils.ts` | L-C | `GET`/`POST /api/profils` |
| `serveur/src/routes/contenu.ts` | L-C | `GET /api/contenu/noeuds/:id`, `GET /api/contenu/assets/*` |
| `serveur/src/routes/tentatives.ts` | L-C | `POST /api/tentatives`, `GET …/progression` |
| `serveur/src/services/depot-contenu-disque.ts` | L-C | `DepotContenu` sur `contenu/` |
| `serveur/src/statique.ts` | L-C | Sert `client/dist` (ou `dist-test`) |
| `donnees/.gitkeep` | L-C | Emplacement de `pierre.db` (ignoré par git) |

### 1.4 `client/` — paquet `@pierre/client`

| Chemin | Lot | Rôle |
|---|---|---|
| `client/package.json` | L-D | React 19, Vite, Tailwind v4, Zustand |
| `client/tsconfig.json` | L-D | `jsx: react-jsx`, `types: ["vite/client"]` |
| `client/vite.config.ts` | L-D | Alias `@pierre/partage`, proxy `/api`, `outDir` par mode |
| `client/index.html` | L-D | Racine, `lang="fr"` |
| `client/src/main.tsx` | L-D | Montage + garde `import.meta.env.MODE === 'test'` (§ 7.2) |
| `client/src/Application.tsx` | L-D | Composition : services, routeur |
| `client/src/routeur.tsx` | L-D | 4 écrans, TanStack Router |
| `client/src/types-globaux.d.ts` | L-D | `declare global { interface Window { __test?: SurfaceTest } }` |
| `client/src/styles/global.css` | L-D | Tailwind v4 + variables CSS des jetons et du nuancier |
| `client/src/etat/magasin.ts` | L-D | `creerMagasin` (Zustand) : profil, écran, état moteur |
| `client/src/etat/services.ts` | L-D | Contexte React des `ServicesJeu` |
| `client/src/api/client.ts` | L-D | `fetch` typé sur `CHEMINS_API` |
| `client/src/ecrans/EcranProfils.tsx` | L-D | Choix et création de profil |
| `client/src/ecrans/EcranCarte.tsx` | L-D | Carte minimale : un nœud jouable |
| `client/src/ecrans/EcranNoeud.tsx` | L-D | Hôte du moteur, barre de consigne, aide |
| `client/src/ecrans/EcranRecompense.tsx` | L-D | Étoiles, `[data-fin="reussite"]` |
| `client/src/composants/BoutonEcouter.tsx` | L-D | R15 : réécoute sans coût |
| `client/src/composants/Etoiles.tsx` | L-D | Étoiles pleines / en creux, jamais rouge |
| `client/src/composants/Gobi.tsx` | L-D | Bulle d'aide, 3 paliers |
| `client/src/habillages/chargeur.ts` | L-D | Charge SVG + JSON d'habillage, zéro code par habillage |
| `client/src/moteurs/types.ts` | L-D | `MoteurRendu`, `ProprietesMoteur` (§ 4.4) |
| `client/src/moteurs/registre-rendu.ts` | L-D | Importe `renduColorie` de L-E |
| `client/src/services/voix-navigateur.ts` | L-D | `FournisseurVoix` sur `<audio>` pré-rendu, repli muet |
| `client/src/services/audio-tone.ts` | L-D | `FournisseurAudio` minimal (Tone.js différé) |
| `client/src/testabilite/crochets.ts` | L-D | Monte `window.__test`, éliminé en production |

### 1.5 Moteur `colorie`

| Chemin | Lot | Rôle |
|---|---|---|
| `partage/src/moteurs/colorie/types.ts` | L-E | `ContenuColorie`, `EtatColorie`, `ActionColorie` |
| `partage/src/moteurs/colorie/validation.ts` | L-E | **Le contrat O3** (§ 5) |
| `partage/src/moteurs/colorie/moteur.ts` | L-E | `moteurColorie` |
| `partage/src/moteurs/colorie/schema-contenu.ts` | L-E | `SCHEMA_CONTENU_COLORIE` (§ 9.2) |
| `client/src/moteurs/colorie/index.ts` | L-E | `renduColorie` |
| `client/src/moteurs/colorie/MoteurColorie.tsx` | L-E | Composant hôte |
| `client/src/moteurs/colorie/SceneSvg.tsx` | L-E | SVG en calques, régions tapables |
| `client/src/moteurs/colorie/PaletteConsigne.tsx` | L-E | Nuancier ≥ 64 px |
| `client/src/moteurs/colorie/recoloration.ts` | L-E | Balayage radial 900 ms, `cubic-bezier(.16,1,.3,1)` |

### 1.6 Contenu et ingestion

| Chemin | Lot | Rôle |
|---|---|---|
| `contenu/schemas/exercice.schema.json` | L-F | Enveloppe (§ 9.1) |
| `contenu/schemas/habillage.schema.json` | L-F | Habillage déclaratif |
| `contenu/schemas/noeud.schema.json` | L-F | Nœud |
| `contenu/referentiel/competences.json` | L-F | Compétences citées par l'exercice |
| `contenu/noeuds/clairiere-01.json` | L-F | Le seul nœud de la v1 |
| `contenu/exercices/clairiere/ecole-01.json` | L-F | Fiche 1 niveau 1 (§ 9.3) |
| `contenu/habillages/clairiere/ecole.habillage.json` | L-F | 30 régions déclarées (§ 9.4) |
| `contenu/habillages/clairiere/ecole.svg` | L-F | Décor bouchon D2, régions fermées par construction |
| `contenu/brouillons/.gitkeep` | L-F | Seule destination d'écriture d'un agent |
| `scripts/ingestion/extraire-fiches.py` | L-F | PyMuPDF, séparation de colonnes à `x = 300` |
| `scripts/ingestion/requirements.txt` | L-F | `PyMuPDF` épinglé, installé dans `.venv/` |

### 1.7 Chaîne de test

| Chemin | Lot | Rôle |
|---|---|---|
| `vitest.config.ts` | L-G | Projets `unitaires`, `composants`, `api` ; alias vers les sources |
| `playwright.config.ts` | L-G | Projets `parcours`, `robustesse`, `visuel`, `qualite` |
| `scripts/verifier.mjs` | L-G | Enchaîne tout, un seul code de sortie |
| `scripts/rapport.mjs` | L-G | Agrège `tests/rapports/*.json` → `RAPPORT.md` |
| `scripts/test-contenu.mjs` | L-G | Valide `contenu/exercices/**/*.json` |
| `scripts/test-visuel.mjs` | L-G | Traduit `--maj` → `--update-snapshots` |
| `scripts/test-rejeu.mjs` | L-G | Coquille v1 : 0 journal, code 0 |
| `scripts/verifier-bundle.mjs` | L-G | Budget 250 Ko gzip + absence de `window.__test` |
| `tests/configuration/preparation.ts` | L-G | `setupFiles` Vitest : horloge figée, graine |
| `tests/unitaires/alea.test.ts` | L-G | Déterminisme, `fast-check` |
| `tests/unitaires/horloge.test.ts` | L-G | `figer` / `avancer` |
| `tests/unitaires/texte.test.ts` | L-G | Accents, apostrophes, espaces multiples |
| `tests/unitaires/etoiles.test.ts` | L-G | Barème v2 § 6.2 par table |
| `tests/unitaires/colorie-validation.test.ts` | L-G | Les 4 motifs de refus, les 3 paliers |
| `tests/unitaires/contenu-validation.test.ts` | L-G | Schéma + cohérence habillage ↔ exercice |
| `tests/composants/MoteurColorie.test.tsx` | L-G | Bonne réponse, mauvaise, aide, double-tap |
| `tests/api/profils.test.ts` | L-G | `fastify.inject`, base en mémoire |
| `tests/api/tentatives.test.ts` | L-G | Idempotence, journal append-only |
| `tests/api/migrations.test.ts` | L-G | Base vierge → 001, empreinte stable |
| `tests/e2e/parcours-nominal.spec.ts` | L-G | Profil → nœud → recoloration → étoiles |
| `tests/e2e/cassecou.spec.ts` | L-G | 40 réponses fausses, R14 |
| `tests/e2e/singe.spec.ts` | L-G | 5 000 taps, aucun état sans issue |
| `tests/visuel/noeud-colorie.spec.ts` | L-G | Captures gris → colorié |
| `tests/qualite/a11y.spec.ts` | L-G | axe-core + cibles ≥ 64 px |
| `tests/fixtures/profils/enfant.json` | L-G | Fixture `FixtureProfil` |
| `tests/fixtures/journaux/.gitkeep` | L-G | Vide en v1 |
| `tests/rapports/.gitkeep` | L-G | Sorties de test (ignoré par git) |
| `tests/observations/.gitkeep` | L-G | T6, fiches manuscrites |

**Fichiers générés, sans propriétaire et non comptés** : `package-lock.json`, `*/dist/**`,
`client/dist-test/**`, `donnees/pierre.db*`, `tests/rapports/**` (hors `.gitkeep`), `outils/**`,
`.venv/**`, `node_modules/**`.

---

## 2. Ce que fait chaque lot, en une phrase

| Lot | Mission | Il a fini quand |
|---|---|---|
| **L-A** | Le dépôt se clone, s'installe, se lance et se lint | `npm run lint` et `npm run typescript` s'exécutent ; `demarrer.bat` sert le client |
| **L-B** | Le socle testable et tous les types partagés | `partage/src/index.ts` exporte les 92 symboles de § 11.1, les sous-chemins les 9 autres |
| **L-C** | Un serveur Fastify avec sa base et ses 7 routes | `construireApplication()` répond aux 7 routes de § 3.3 |
| **L-D** | La coquille client : 4 écrans, l'état, les crochets de test | `EcranNoeud` monte un moteur inconnu à partir du registre |
| **L-E** | Le moteur `colorie` : logique pure + rendu | `moteurColorie` et `renduColorie` exportés, contrat § 5 honoré |
| **L-F** | Le contenu de la fiche 1 et son SVG bouchon | `ecole.svg` porte les 30 `id` de § 9.4 |
| **L-G** | Les 7 commandes et leurs rapports | `npm run verifier` sort en code 0 et écrit `RAPPORT.md` |

---

## 3. Structure des paquets

### 3.1 `package.json` racine et `partage/package.json`

```jsonc
// package.json  — L-A
{
  "name": "pierre-des-mots",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.13.0" },
  "workspaces": ["partage", "serveur", "client"],
  "scripts": { /* § 8 */ }
}
```

```jsonc
// partage/package.json  — L-B
{
  "name": "@pierre/partage",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".":            { "types": "./src/index.ts",              "default": "./dist/index.js" },
    "./validation": { "types": "./src/contenu/validation.ts",  "default": "./dist/contenu/validation.js" },
    "./factices":   { "types": "./src/fournisseurs/factices.ts","default": "./dist/fournisseurs/factices.js" }
  },
  "scripts": { "construire": "tsc -b" }
}
```

**Pourquoi trois entrées et pas une.** Ajv pèse ~120 Ko et `factices` embarque des journaux de test :
si le barillet les réexportait, ils entreraient dans le bundle client et feraient sauter le budget de
250 Ko gzip (v2 § 13.5). `partage/src/index.ts` **ne réexporte donc ni `contenu/validation.ts` ni
`fournisseurs/factices.ts`.** C'est une contrainte, pas une préférence.

### 3.2 Résolution : Node compile, Vite et Vitest lisent la source

- `serveur/` s'exécute sur `partage/dist/` → `npm run construire --workspace=partage` avant tout
  démarrage. `scripts/demarrer.mjs` s'en charge.
- `client/vite.config.ts` **et** `vitest.config.ts` posent trois alias vers les sources, ce qui évite
  toute construction préalable en test :

```ts
resolve: {
  alias: {
    '@pierre/partage/validation': fileURLToPath(new URL('./partage/src/contenu/validation.ts', import.meta.url)),
    '@pierre/partage/factices':   fileURLToPath(new URL('./partage/src/fournisseurs/factices.ts', import.meta.url)),
    '@pierre/partage':            fileURLToPath(new URL('./partage/src/index.ts', import.meta.url))
  }
}
```

L'ordre des clés compte : le plus spécifique d'abord.

### 3.3 Les 7 routes HTTP

| Méthode et chemin | Corps entrant | Réponse | Écrit par |
|---|---|---|---|
| `GET /api/sante` | — | `ReponseSante` | L-C |
| `GET /api/profils` | — | `Profil[]` | L-C |
| `POST /api/profils` | `CreationProfil` | `Profil` (201) | L-C |
| `GET /api/profils/:id` | — | `Profil` | L-C |
| `GET /api/profils/:id/progression` | — | `ProgressionNoeud[]` | L-C |
| `GET /api/contenu/noeuds/:id` | — | `PaquetNoeud` | L-C |
| `POST /api/tentatives` | `TentativeAEnregistrer` | `ReponseTentative` | L-C |

`GET /api/contenu/assets/*` sert les fichiers de `contenu/` (SVG en `image/svg+xml`) ; ce n'est pas
une route JSON, elle n'entre pas dans le contrat de types. Toute erreur répond `ErreurApi`.

---

## 4. L'interface `Moteur` — la pièce la plus structurante

### 4.1 `partage/src/moteurs/types.ts` — **L-B**

```ts
import type { Alea } from '../alea.js';
import type { Horloge } from '../horloge.js';
import type { CheminAsset, CodeMoteur, CodeRegion, IdHabillage, IdRegionSvg } from '../identifiants.js';
import type { CouleurColoriage, JetonCouleur } from '../palette.js';
import type { CodeEffet } from '../fournisseurs/audio.js';

/** Un schéma JSON 2020-12, transporté sans être typé plus finement. */
export type SchemaJson = Record<string, unknown>;

/** Les trois paliers de la v2 § 5.4. `indice` = Gobi parle ; `demonstration` = la cible s'anime. */
export type NiveauAide = 'aucune' | 'indice' | 'demonstration';

export type CodeAideGobi =
  | 'relire-consigne'
  | 'souffle-syllabe'
  | 'surligne-graphene'
  | 'montre-cible'
  | 'montre-couleur';

export interface AideProposee {
  readonly niveau: Exclude<NiveauAide, 'aucune'>;
  readonly code: CodeAideGobi;
  /** Identifiant de l'élément à surligner ou animer (une `IdRegionSvg` pour `colorie`). */
  readonly cible: string | null;
  /** Texte à faire dire par la voix. Jamais affiché seul (R15). */
  readonly texte: string | null;
}

export interface CapacitesMoteur {
  /** `true` si les étapes se jouent dans l'ordre du contenu. */
  readonly ordreEtapesImpose: boolean;
  /** `true` si le moteur recolorie le décor pendant qu'on joue. */
  readonly recolorieLeDecor: boolean;
  readonly nbEtapesMax: number;
}

export interface ProgressionMoteur {
  /** 0 à 1 inclus. */
  readonly avancement: number;
  readonly termine: boolean;
  /** Index 0-based de l'étape en cours. */
  readonly etapeCourante: number;
  readonly etapesTotal: number;
}

export interface ResumeEtape {
  readonly identifiant: string;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly nbEcoutes: number;
  readonly dureeMs: number;
}

export interface ResumeTentative {
  /** Toujours `true` à la fin : règle de non-échec (v2 § 5.4, R14). */
  readonly reussi: boolean;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly dureeMs: number;
  readonly etapes: readonly ResumeEtape[];
}

export interface EntreeMoteur<C> {
  readonly contenu: C;
  readonly habillage: Habillage;
  readonly alea: Alea;
  readonly horloge: Horloge;
}

export interface ContexteMoteur {
  readonly alea: Alea;
  readonly horloge: Horloge;
}

/**
 * Le contrat entre une mécanique, son habillage déclaratif et son contenu JSON.
 *
 * IMPORTANT — les cinq membres ci-dessous sont déclarés en **syntaxe de méthode**
 * (`creerEtat(...)`, pas `creerEtat: (...) => ...`). TypeScript compare alors leurs
 * paramètres de façon bivariante, ce qui rend `Moteur<ContenuColorie, EtatColorie,
 * ActionColorie>` assignable à `MoteurQuelconque`. Déclaré en propriété-fonction, le
 * registre ne compile plus. Ne pas changer la forme.
 */
export interface Moteur<C, E, A> {
  readonly code: CodeMoteur;
  readonly version: number;
  readonly capacites: CapacitesMoteur;
  /** Schéma du bloc `jeu.contenu`. Validation en deux temps, § 9.1. */
  readonly schemaContenu: SchemaJson;

  creerEtat(entree: EntreeMoteur<C>): E;
  reduire(etat: E, action: A, contexte: ContexteMoteur): E;
  progression(etat: E): ProgressionMoteur;
  aideProposee(etat: E): AideProposee | null;
  resume(etat: E): ResumeTentative;
}

export type MoteurQuelconque = Moteur<unknown, unknown, unknown>;

// ---------------------------------------------------------------- habillage

export type RoleCalque = 'fond' | 'decor' | 'coloriable' | 'trait' | 'animation';

export interface RegionColoriable {
  /** `id` du `<path>` dans le SVG. */
  readonly id: IdRegionSvg;
  /** « le toit de l'école » — sert à l'aide vocale et au libellé a11y. */
  readonly libelle: string;
  /** Centroïde en coordonnées `viewBox`, pour la tolérance de tap (§ 5.2). */
  readonly centroide: readonly [number, number];
  /** Aire en unités `viewBox`, contrôlée contre R16. */
  readonly surface: number;
}

export interface CalqueHabillage {
  /** `id` du `<g>` dans le SVG. */
  readonly id: string;
  readonly role: RoleCalque;
  readonly regions: readonly RegionColoriable[];
}

export interface SceneHabillage {
  readonly fichier: CheminAsset;
  readonly viewBox: string;
  readonly calques: readonly CalqueHabillage[];
}

export interface VariantePalette {
  /** Surcharges des jetons v2 § 9.2. `trait` et `parchemin` ne se surchargent jamais. */
  readonly jetons: Partial<Record<JetonCouleur, string>>;
  /** Les couleurs offertes à l'enfant par cet habillage. */
  readonly nuancier: readonly CouleurColoriage[];
}

export interface TimingsHabillage {
  readonly appuiMs: number;
  readonly relachementMs: number;
  readonly refusMs: number;
  readonly recolorationMs: number;
  readonly interEtoilesMs: number;
}

export interface SonsHabillage {
  readonly ambiance: string | null;
  readonly effets: Partial<Record<CodeEffet, string>>;
}

/**
 * Un habillage est **entièrement déclaratif** : un SVG en calques plus ce JSON.
 * Ajouter un habillage ne doit demander aucune ligne de code (v2 § 7).
 */
export interface Habillage {
  readonly id: IdHabillage;
  /** Moteurs déclarés compatibles. `test:contenu` vérifie l'appartenance. */
  readonly moteurs: readonly CodeMoteur[];
  readonly libelle: string;
  readonly region: CodeRegion;
  readonly scene: SceneHabillage;
  readonly palette: VariantePalette;
  readonly timings: TimingsHabillage;
  readonly sons: SonsHabillage;
}
```

### 4.2 `partage/src/moteurs/registre.ts` — **L-B**

```ts
import type { CodeMoteur } from '../identifiants.js';
import type { MoteurQuelconque } from './types.js';

export function enregistrerMoteur(moteur: MoteurQuelconque): void;
/** Lève `ErreurPierre('moteur-inconnu')` si le code n'est pas enregistré. */
export function obtenirMoteur(code: CodeMoteur): MoteurQuelconque;
export function moteursEnregistres(): readonly CodeMoteur[];
export function estMoteurEnregistre(code: CodeMoteur): boolean;
```

### 4.3 `partage/src/moteurs/tous.ts` — **L-B** (importe L-E)

```ts
import { moteurColorie } from './colorie/moteur.js';
import { enregistrerMoteur } from './registre.js';
import type { MoteurQuelconque } from './types.js';

export const MOTEURS: readonly MoteurQuelconque[] = [moteurColorie];

/** Idempotent. Appelé par la racine de composition du client, du serveur et de chaque test. */
export function initialiserRegistreMoteurs(): void;
```

### 4.4 `client/src/moteurs/types.ts` — **L-D**

```ts
import type { ReactElement } from 'react';
import type {
  Alea, FournisseurAudio, FournisseurVoix, Habillage, Horloge, CodeMoteur
} from '@pierre/partage';

export interface ServicesJeu {
  readonly alea: Alea;
  readonly horloge: Horloge;
  readonly voix: FournisseurVoix;
  readonly audio: FournisseurAudio;
}

export interface ProprietesMoteur<C, E, A> {
  readonly contenu: C;
  readonly habillage: Habillage;
  readonly etat: E;
  /** Méthode, pas propriété-fonction : c'est ce qui rend `MoteurRenduQuelconque` assignable. */
  emettre(action: A): void;
  readonly services: ServicesJeu;
  readonly animationsDesactivees: boolean;
}

export type ComposantMoteur<C, E, A> = (proprietes: ProprietesMoteur<C, E, A>) => ReactElement | null;

export interface MoteurRendu<C, E, A> {
  readonly code: CodeMoteur;
  readonly Composant: ComposantMoteur<C, E, A>;
}

/**
 * `never` sur les trois paramètres, et non `unknown` : `ComposantMoteur` est un type de
 * fonction autonome, donc contravariant sous `strictFunctionTypes`. Avec `never`, les
 * propriétés `contenu` et `etat` du type cible sont assignables à tout, et `emettre`
 * reste bivariante parce qu'elle est déclarée en méthode.
 */
export type MoteurRenduQuelconque = MoteurRendu<never, never, never>;
```

### 4.5 `client/src/moteurs/registre-rendu.ts` — **L-D** (importe L-E)

```ts
import type { CodeMoteur } from '@pierre/partage';
import { renduColorie } from './colorie/index.js';
import type { MoteurRenduQuelconque } from './types.js';

export const registreRendu: Readonly<Record<string, MoteurRenduQuelconque>> = {
  colorie: renduColorie
};

/** Lève si le moteur n'a pas de rendu déclaré. */
export function obtenirRendu(code: CodeMoteur): MoteurRenduQuelconque;
```

**La promesse « zéro ligne de code par habillage » se vérifie ici** : `registreRendu` est indexé par
*moteur*, jamais par habillage. Un habillage neuf n'ajoute aucune entrée.

---

## 5. Le contrat de validation du mode `regions` — clôture du point ouvert O3

Le journal des décisions laisse O3 ouvert sur quatre questions : tolérance de débordement, région
laissée blanche, ordre libre ou imposé, comportement en cas d'erreur. Voici les quatre réponses,
gelées.

### 5.1 Le geste : remplissage par région, jamais au pinceau

Annexe P § 2, point 4 : « les régions coloriables sont exactement les régions fermées du trait ».
Le geste est donc **un tap qui remplit une région entière**, pas un tracé.

**Conséquence directe sur la première question d'O3 : le débordement est impossible par
construction.** Il n'y a pas de tolérance de débordement à régler, parce qu'il n'y a pas de
débordement. Ce qui reste à régler, c'est la **tolérance de visée**, traitée en § 5.2.

### 5.2 Tolérance de visée — la seule tolérance qui existe

```ts
// partage/src/moteurs/colorie/validation.ts — L-E
/** R16 et v2 § 8 : 24 px de tolérance sur toute cible de dépôt. */
export const TOLERANCE_TAP_PX = 24;

/**
 * Région désignée par un point, exprimé dans les coordonnées `viewBox` de la scène.
 * 1. Si le point tombe dans une région coloriable, c'est elle.
 * 2. Sinon (le doigt est sur le trait, ou entre deux formes), on prend la région dont le
 *    centroïde est le plus proche, à condition d'être sous `tolerance`.
 * 3. Sinon, `null` : le tap est **ignoré**. Pas de refus, pas d'erreur, pas de son.
 *    Un doigt qui glisse hors du dessin ne coûte rien.
 */
export function regionSousLeDoigt(
  habillage: Habillage,
  point: readonly [number, number],
  tolerance?: number
): IdRegionSvg | null;
```

`tolerance` par défaut = `TOLERANCE_TAP_PX` converti dans l'échelle du `viewBox` par l'appelant.
Toute région déclarée dans un habillage doit avoir une `surface` au moins égale à celle d'un carré de
64 px à l'échelle de rendu : c'est la règle a11y maison de l'annexe T § T5, vérifiée par
`test:contenu`.

### 5.3 Ordre — imposé entre consignes, libre à l'intérieur d'une consigne

- **Entre consignes : ordre imposé**, celui du tableau `contenu.consignes`. Une seule consigne est
  active à la fois ; c'est elle qui est lue à voix haute et mise en avant. C'est ce qui porte, en
  jeu, la désambiguïsation que le titre de colonne assurait sur le papier (fiches-origine § 3, F3) :
  l'enfant sait qu'il doit *faire*, parce que Gobi vient de lui *demander*.
- **À l'intérieur d'une consigne : ordre libre.** La consigne 5 de la fiche 1 porte deux couples
  (porte, jaune) et (toit, rouge) ; l'enfant peint dans l'ordre qu'il veut. La consigne 3 en porte
  quatre (les quatre arbres) : idem.
- Le passage à la consigne suivante est **automatique** dès que ses cibles sont toutes satisfaites.
  Il n'existe aucune action « valider » ni « suivant » : le retour est immédiat (v2 § 5.1).

### 5.4 Région laissée blanche — jamais une faute, un état d'attente

Une région attendue et non peinte n'est **jamais** évaluée comme fausse. L'exercice ne se termine pas
tant qu'elle n'est pas peinte, et les paliers d'aide de § 5.6 finissent par la désigner. Une région
**non attendue** laissée blanche est le cas nominal : la scène n'est jamais entièrement colorable.

Il n'existe donc aucun chemin où l'enfant « rend une copie incomplète ». C'est la traduction directe
de « toute session se termine sur une réussite ».

### 5.5 Les quatre motifs de refus, et lesquels comptent

```ts
export type MotifRefus =
  | 'region-hors-consigne'    // la région n'est pas une cible de la consigne active
  | 'couleur-fausse'          // bonne région, mauvaise couleur
  | 'region-deja-peinte'      // la cible est déjà satisfaite
  | 'aucune-couleur-choisie'; // aucun godet sélectionné

/** Seuls deux motifs sur quatre sont des erreurs de lecture. */
export const REFUS_COMPTE_ERREUR: Readonly<Record<MotifRefus, boolean>> = {
  'region-hors-consigne': true,
  'couleur-fausse': true,
  'region-deja-peinte': false,
  'aucune-couleur-choisie': false
};
```

**`region-deja-peinte` ne compte pas** : c'est le double-tap rapide que l'annexe T § T1 demande
explicitement de ne jamais transformer en double soumission. **`aucune-couleur-choisie` ne compte
pas** non plus : l'enfant n'a rien lu de travers, il n'a pas encore pris son pinceau — Gobi le lui
rappelle, sans coût.

### 5.6 Comportement en cas d'erreur — non-échec, littéralement

Ce que le moteur fait, dans l'ordre, sur un refus :

| Rang | Déclencheur | Effet | Compte comme aide ? |
|---|---|---|---|
| — | tout refus | La région **ne se remplit pas**. Oscillation horizontale de 6 px sur 180 ms (v2 § 8). Effet `depot-refuse` : son **neutre et court**, jamais descendant, jamais dissonant. | non |
| — | 20 s sans action sur la consigne active | Relecture automatique de la consigne. **Réécoute, pas aide** (R15 : sans coût). | non |
| 1 | 2ᵉ erreur sur la consigne active, **ou** 45 s d'inactivité | `AideProposee { niveau: 'indice' }` — Gobi relit en syllabant et surligne les `motsCles`. Non sollicitée, conforme à v2 § 5.4. | **oui** |
| 2 | 3ᵉ erreur, **ou** 30 s après l'indice | `AideProposee { niveau: 'demonstration' }` — la région attendue pulse en halo `soleil`, le godet correct pulse aussi. L'enfant **fait le geste juste lui-même** et repart avec une réussite. | **oui** |

Règles dures qui en découlent, opposables en revue :

- `niveauAide` est **monotone croissant**, par consigne et pour l'exercice entier. Une aide obtenue
  n'est jamais retirée.
- `ResumeTentative.reussi` vaut **toujours `true`** à la fin. `false` est structurellement
  inatteignable pour ce moteur ; un lot qui écrit `reussi: false` viole R14.
- Aucun composant n'émet jamais `data-etat="echec"`. C'est l'assertion centrale de
  `tests/e2e/cassecou.spec.ts`.
- Aucune couleur rouge, aucun son négatif, aucune secousse d'écran sur un refus (v2 § 8 et § 9.2 :
  « l'erreur n'a pas de couleur dédiée, elle est un mouvement, pas une teinte »).
- L'appel volontaire de Gobi produit exactement le palier `indice`, et coûte la même chose qu'un
  palier automatique : ni plus, ni moins.

### 5.7 Barème d'étoiles pour `colorie`

Strictement v2 § 6.2, sans variante :

| Étoile | Condition |
|---|---|
| ★ | l'exercice est terminé — **toujours acquise** |
| ★★ | `aideUtilisee === 'aucune'` sur toute la tentative |
| ★★★ | `nbErreurs === 0` sur toute la tentative |

`calculerEtoiles` est le seul endroit où ce barème existe.

### 5.8 Signatures exactes de L-E

```ts
// partage/src/moteurs/colorie/types.ts — L-E
export type FormeConsigne = 'imperative' | 'affirmative';

export interface CibleColorie {
  readonly region: IdRegionSvg;
  readonly couleur: CouleurColoriage;
}

export interface ConsigneColorie {
  readonly id: IdConsigne;
  readonly texte: string;
  /** F3 : l'affirmation qui vaut consigne doit survivre au passage en jeu. */
  readonly forme: FormeConsigne;
  /** Clé du clip pré-rendu. `null` en v1 (pas d'audio, D1). */
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS couples (région, couleur) — fiches-origine § 3. */
  readonly cibles: readonly CibleColorie[];
  /** Mots à surligner au palier `indice`. */
  readonly motsCles: readonly string[];
}

export interface ContenuColorie {
  readonly consignes: readonly ConsigneColorie[];
  /** Sous-ensemble du nuancier de l'habillage. Jamais restreint à la consigne active. */
  readonly nuancierAutorise: readonly CouleurColoriage[];
}

export interface RefusColorie {
  readonly region: IdRegionSvg;
  readonly couleur: CouleurColoriage | null;
  readonly motif: MotifRefus;
  readonly instantMs: number;
}

export interface EtatConsigne {
  readonly id: IdConsigne;
  readonly ciblesRestantes: readonly CibleColorie[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly derniereActionMs: number;
}

export interface EtatColorie {
  readonly indexConsigne: number;
  readonly consignes: readonly EtatConsigne[];
  /** Clé = `IdRegionSvg`. Une entrée = une région peinte, définitivement. */
  readonly remplissages: Readonly<Record<string, CouleurColoriage>>;
  readonly couleurChoisie: CouleurColoriage | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusColorie | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionColorie =
  | { readonly type: 'choisirCouleur'; readonly couleur: CouleurColoriage }
  | { readonly type: 'peindre'; readonly region: IdRegionSvg }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
```

`battementHorloge` est l'action que l'hôte émet à intervalle régulier ; c'est elle qui fait mûrir les
seuils d'inactivité de § 5.6 sans qu'aucun `setTimeout` ne vive dans la logique pure. Le temps entre
dans le moteur par `ContexteMoteur.horloge`, jamais autrement.

```ts
// partage/src/moteurs/colorie/validation.ts — L-E
export interface DecisionPeinture {
  readonly acceptee: boolean;
  readonly motif: MotifRefus | null;
  readonly compteErreur: boolean;
  readonly consigneSatisfaite: boolean;
  readonly exerciceTermine: boolean;
}

/** Fonction pure. Ne modifie pas l'état ; `reduire` s'en sert pour le construire. */
export function evaluerPeinture(
  etat: EtatColorie,
  contenu: ContenuColorie,
  region: IdRegionSvg,
  couleur: CouleurColoriage | null
): DecisionPeinture;

export const DELAIS_AIDE: {
  readonly relectureMs: 20_000;
  readonly indiceMs: 45_000;
  readonly demonstrationMs: 30_000;
  readonly erreursAvantIndice: 2;
  readonly erreursAvantDemonstration: 3;
};
```

```ts
// partage/src/moteurs/colorie/moteur.ts — L-E
export const moteurColorie: Moteur<ContenuColorie, EtatColorie, ActionColorie>;
```

```ts
// partage/src/moteurs/colorie/schema-contenu.ts — L-E
export const SCHEMA_CONTENU_COLORIE: SchemaJson;
```

```ts
// client/src/moteurs/colorie/index.ts — L-E
export const renduColorie: MoteurRendu<ContenuColorie, EtatColorie, ActionColorie>;
```

```ts
// client/src/moteurs/colorie/recoloration.ts — L-E
export interface OptionsRecoloration {
  readonly origine: readonly [number, number];
  readonly dureeMs: number;
  readonly desactivee: boolean;
}
/** Balayage radial depuis le point touché. 900 ms, `cubic-bezier(.16,1,.3,1)`, 14 particules max. */
export function jouerRecoloration(
  element: SVGGraphicsElement,
  couleur: CouleurColoriage,
  options: OptionsRecoloration
): Promise<void>;
```

`desactivee` est vrai sous `prefers-reduced-motion`, sous « animations calmes », et quand
`window.__test.sauterAnimations()` a été appelé : la couleur est alors posée immédiatement, l'état
final est identique. C'est ce qui rend les captures T4 stables sans aucune attente de durée.

---

## 6. Schéma SQLite de la v1

### 6.1 Le mécanisme de migration

- Fichiers `serveur/migrations/NNN_nom.sql`, `NNN` sur trois chiffres, appliqués dans l'ordre
  lexical, chacun dans une transaction.
- La table de suivi est créée par le runner, jamais par une migration :

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  nom         TEXT NOT NULL,
  empreinte   TEXT NOT NULL,   -- sha256 du fichier : détecte une migration modifiée après coup
  applique_le TEXT NOT NULL
) STRICT;
```

- Une migration déjà appliquée dont l'empreinte a changé est une **erreur bloquante**, pas un
  avertissement.
- `PRAGMA journal_mode = WAL` et `PRAGMA foreign_keys = ON` sont posés à l'ouverture de la connexion
  (`serveur/src/base/connexion.ts`), jamais dans un fichier de migration.

### 6.2 `serveur/migrations/001_socle.sql` — **L-C**

```sql
CREATE TABLE profils (
  id                TEXT PRIMARY KEY,
  prenom            TEXT NOT NULL,
  avatar_json       TEXT NOT NULL,
  palette_variante  TEXT NOT NULL,
  cree_le           TEXT NOT NULL,
  dernier_acces_le  TEXT NOT NULL
) STRICT;

-- Journal append-only. Aucun UPDATE, aucun DELETE n'est jamais écrit contre cette table.
-- Tout indicateur se recalcule depuis elle (CLAUDE.md, « le journal fait foi »).
CREATE TABLE tentatives (
  id               TEXT PRIMARY KEY,
  cle_idempotence  TEXT NOT NULL UNIQUE,
  profil_id        TEXT NOT NULL REFERENCES profils(id),
  noeud_id         TEXT NOT NULL,
  exercice_id      TEXT NOT NULL,
  moteur           TEXT NOT NULL,
  habillage        TEXT NOT NULL,
  graine           INTEGER NOT NULL,
  demarre_le       TEXT NOT NULL,
  termine_le       TEXT NOT NULL,
  duree_ms         INTEGER NOT NULL CHECK (duree_ms >= 0),
  reussi           INTEGER NOT NULL CHECK (reussi IN (0, 1)),
  nb_erreurs       INTEGER NOT NULL CHECK (nb_erreurs >= 0),
  aide_utilisee    TEXT    NOT NULL CHECK (aide_utilisee IN ('aucune', 'indice', 'demonstration')),
  etoiles          INTEGER NOT NULL CHECK (etoiles BETWEEN 0 AND 3),
  detail_json      TEXT    NOT NULL
) STRICT;

CREATE INDEX idx_tentatives_profil_noeud ON tentatives (profil_id, noeud_id, termine_le);

-- Projection recalculable. Jamais une source de vérité.
CREATE TABLE progression_noeud (
  profil_id      TEXT    NOT NULL REFERENCES profils(id),
  noeud_id       TEXT    NOT NULL,
  etoiles        INTEGER NOT NULL CHECK (etoiles BETWEEN 0 AND 3),
  nb_tentatives  INTEGER NOT NULL CHECK (nb_tentatives >= 0),
  dernier_le     TEXT    NOT NULL,
  PRIMARY KEY (profil_id, noeud_id)
) STRICT;
```

### 6.3 Idempotence et « un acquis n'est jamais repris »

- `cle_idempotence` = `sha256(profil_id | noeud_id | demarre_le | graine)`, calculée par le client.
  Un `POST /api/tentatives` rejoué renvoie **200** avec `ReponseTentative.deja = true` et n'insère
  rien. C'est le test d'idempotence de l'annexe T § T2.
- `progression_noeud.etoiles` ne **décroît jamais** : `MAX(ancien, nouveau)`. C'est la traduction en
  SQL de « un acquis n'est jamais repris ».
- `recalculerProgression(profilId)` reconstruit intégralement `progression_noeud` depuis
  `tentatives` ; un test T2 vérifie que la reconstruction est identique à l'incrémental.

### 6.4 Signatures de L-C consommées ailleurs

```ts
// serveur/src/application.ts — L-C
export interface OptionsApplication {
  readonly base: DatabaseSync;
  readonly contenu: DepotContenu;
  readonly horloge: Horloge;
  readonly alea: Alea;
  readonly racineClient: string | null;
}
export function construireApplication(options: OptionsApplication): FastifyInstance;

// serveur/src/base/connexion.ts — L-C
/** `chemin === ':memory:'` en test. Pose WAL et `foreign_keys`. */
export function ouvrirBase(chemin: string): DatabaseSync;

// serveur/src/base/migrations.ts — L-C
export interface RapportMigration {
  readonly appliquees: readonly number[];
  readonly versionCourante: number;
}
export function appliquerMigrations(
  base: DatabaseSync,
  dossier: string,
  horloge: Horloge
): RapportMigration;
```

`OptionsApplication` reçoit tout par injection : c'est ce qui permet à `tests/api/*.test.ts` de
monter l'application sur `:memory:` avec une horloge figée et zéro port ouvert.

---

## 7. `window.__test` — surface exacte et garantie d'absence en production

### 7.1 La surface, dans `partage/src/testabilite/surface.ts` — **L-B**

```ts
export type CodeEcran = 'chargement' | 'profils' | 'carte' | 'noeud' | 'recompense';

export interface EntreeProgressionTest {
  readonly noeud: IdNoeud;
  readonly etoiles: NombreEtoiles;
}

export interface FixtureProfil {
  readonly id: IdProfil;
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  readonly paletteVariante: CodeRegion;
  readonly progression: readonly EntreeProgressionTest[];
}

export interface EtatTestSerialisable {
  readonly ecran: CodeEcran;
  readonly profil: IdProfil | null;
  readonly noeud: IdNoeud | null;
  readonly moteur: CodeMoteur | null;
  readonly progression: ProgressionMoteur | null;
  /** État interne du moteur, tel quel. `EtatColorie` en v1. */
  readonly etatMoteur: unknown;
  readonly aide: AideProposee | null;
  readonly animationsDesactivees: boolean;
  readonly graine: number;
}

export interface SurfaceTest {
  chargerProfil(fixture: FixtureProfil): Promise<void>;
  allerAuNoeud(id: IdNoeud): Promise<void>;
  /** L'action est celle du moteur monté. `ActionColorie` en v1. */
  repondre(action: unknown): Promise<void>;
  etat(): EtatTestSerialisable;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
```

**Ce fichier ne contient QUE des `export type` et des `export interface`.** Aucune valeur, aucune
constante, aucune chaîne. Les types sont effacés à la compilation : il n'en subsiste rien dans le
bundle, même quand le barillet les réexporte. Une seule `export const` ici et la vérification de
§ 7.3 échouerait sur son propre outillage.

`client/src/types-globaux.d.ts` (**L-D**) porte la déclaration globale :

```ts
import type { SurfaceTest } from '@pierre/partage';
declare global {
  interface Window { __test?: SurfaceTest }
}
export {};
```

### 7.2 Le montage, dans `client/src/main.tsx` — **L-D**

```ts
if (import.meta.env.MODE === 'test') {
  const { monterCrochetsDeTest } = await import('./testabilite/crochets.js');
  monterCrochetsDeTest({ magasin, services });
}
```

Trois propriétés se combinent : Vite remplace `import.meta.env.MODE` par un littéral au moment du
build, la condition devient statiquement fausse en production, et Rollup élimine à la fois la branche
**et le chunk dynamique** qui n'est plus référencé. `client/src/testabilite/crochets.ts` n'est donc
jamais émis dans `client/dist/`.

### 7.3 Les deux builds et la vérification

| Build | Commande | Sortie | Contient `__test` |
|---|---|---|---|
| production | `vite build` | `client/dist/` | **non** — c'est ce qui est vérifié |
| test | `vite build --mode test` | `client/dist-test/` | oui, c'est son rôle |

`playwright.config.ts` sert `client/dist-test/` ; `scripts/verifier-bundle.mjs` inspecte
`client/dist/`. Les deux dossiers ne se croisent jamais.

`scripts/verifier-bundle.mjs` (**L-G**) fait deux choses et échoue sur l'une ou l'autre :

1. **Fuite des crochets** — recherche, dans `client/dist/**/*.{js,css,html}`, des chaînes
   `__test`, `chargerProfil`, `allerAuNoeud`, `sauterAnimations`, `figerHorloge`,
   `monterCrochetsDeTest`. Une seule occurrence = échec.
2. **Budget** — somme gzip des entrées initiales de `client/dist/` inférieure ou égale à **250 Ko**
   (v2 § 13.5).

**Piège à ne pas reproduire** : cette liste de chaînes vit *uniquement* dans ce script. Exportée
depuis `partage/`, elle entrerait elle-même dans le bundle et la vérification échouerait sur son
propre outillage.

---

## 8. La section `scripts` du `package.json` racine — **L-A**

```jsonc
"scripts": {
  "preparer":         "node scripts/telecharger-outils.mjs",
  "typescript":       "tsc -b",
  "lint":             "eslint .",
  "construire":       "npm run construire -w @pierre/partage && npm run construire -w @pierre/serveur && npm run construire -w @pierre/client",
  "construire:test":  "npm run construire:test -w @pierre/client",
  "dev":              "node scripts/demarrer.mjs --dev",
  "demarrer":         "node scripts/demarrer.mjs",

  "test":             "vitest run --project unitaires --project composants --project api",
  "test:contenu":     "node scripts/test-contenu.mjs",
  "test:e2e":         "playwright test --project=parcours --project=robustesse",
  "test:visuel":      "node scripts/test-visuel.mjs",
  "test:qualite":     "playwright test --project=qualite && node scripts/verifier-bundle.mjs",
  "test:rejeu":       "node scripts/test-rejeu.mjs",
  "verifier":         "node scripts/verifier.mjs"
}
```

### 8.1 Ce que fait chacune des 7 commandes en v1

| Commande | Niveau | État v1 | Ce qu'elle fait, exactement |
|---|---|---|---|
| `test` | T1 + T2 | **réelle** | Vitest sans watch sur trois projets : `unitaires` (partage + colorie pur), `composants` (happy-dom + Testing Library), `api` (`fastify.inject`, base `:memory:`). |
| `test:contenu` | T1 | **réelle** | Valide `contenu/exercices/**/*.json` : les 6 contrôles retenus en § 9.8. |
| `test:e2e` | T3 | **réelle** | Playwright sur `client/dist-test/` : `parcours-nominal`, `cassecou`, `singe`. |
| `test:visuel` | T4 | **réelle, minimale** | Deux captures : scène entièrement grise, scène terminée. `--maj` régénère. |
| `test:qualite` | T5 | **réelle, minimale** | axe-core sur les 4 écrans, cibles ≥ 64 px, puis budget de bundle et absence de `window.__test`. |
| `test:rejeu` | T2 | **coquille, code 0** | `tests/fixtures/journaux/` est vide en v1 (ni BKT ni Leitner, D1). Écrit un rapport « 0 journal de référence, aucun test à ce stade » et sort en 0. |
| `verifier` | tous | **réelle** | La chaîne complète de § 8.2, un seul code de sortie, rapport consolidé. |

`test:rejeu` est la seule coquille. Elle **existe** parce qu'un script absent se remarque au moment
où on en a besoin, c'est-à-dire trop tard ; et elle refuse d'annoncer un succès muet — son rapport
dit explicitement qu'elle n'a rien vérifié.

### 8.2 Ce qu'enchaîne `scripts/verifier.mjs` — **L-G**

```
lint  →  typescript  →  test  →  test:contenu
      →  construire:test  →  test:e2e  →  test:visuel
      →  construire       →  test:qualite
      →  test:rejeu       →  rapport
```

- Chaque étape écrit `tests/rapports/<etape>.json` : `{ etape, statut, dureeMs, total, echecs, details }`.
- **Aucune étape n'interrompt la chaîne.** Tout s'exécute, puis `scripts/rapport.mjs` agrège et
  `verifier.mjs` sort en `1` si au moins une étape a échoué. Un agent doit voir tous ses défauts d'un
  coup, pas le premier.
- Les artefacts d'échec (captures, traces, vidéos, diffs) vont dans `tests/rapports/artefacts/`.
- `tests/rapports/RAPPORT.md` est le seul document que l'agent lit ; la sortie brute ne fait pas foi.

**Prérequis d'installation, à la charge de l'orchestrateur** (aucun agent n'installe) : `npm install`
à la racine, puis `npx playwright install chromium`. Sans le second, `test:e2e`, `test:visuel` et
`test:qualite` échouent au lancement du navigateur — c'est un défaut d'environnement, pas un défaut
de code, et le rapport doit le nommer comme tel.

---

## 9. Contenu : schémas et exemple complet

### 9.1 Validation en deux temps

1. **L'enveloppe** — `contenu/schemas/exercice.schema.json` (L-F) valide tout sauf `jeu.contenu`,
   déclaré `true` (n'importe quoi).
2. **Le bloc `jeu.contenu`** — validé par `moteur.schemaContenu`, c'est-à-dire par le schéma que le
   moteur publie lui-même (`SCHEMA_CONTENU_COLORIE` pour `colorie`).

C'est ce découpage qui permet d'ajouter un moteur sans toucher au schéma d'enveloppe, et de refuser
un contenu dont la forme ne correspond pas au moteur déclaré.

```ts
// partage/src/contenu/validation.ts — L-B, sous-chemin @pierre/partage/validation
export interface ProblemeValidation {
  readonly chemin: string;      // pointeur JSON, ex. "/jeu/contenu/consignes/2/cibles/0/region"
  readonly message: string;
  readonly regle: string;       // "schema" | "habillage-incompatible" | "region-inconnue" | …
}
export interface RapportValidation {
  readonly valide: boolean;
  readonly problemes: readonly ProblemeValidation[];
}
/** Valide l'enveloppe seule. */
export function validerExercice(donnees: unknown): RapportValidation;
/** Valide `jeu.contenu` contre le moteur déclaré, puis la cohérence avec l'habillage. */
export function validerBlocJeu(exercice: Exercice, habillage: Habillage): RapportValidation;
```

### 9.2 `contenu/schemas/exercice.schema.json` — **L-F**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "pierre:schemas/exercice",
  "title": "Exercice",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "version", "titre", "competences", "difficulte", "jeu"],
  "properties": {
    "id":          { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "version":     { "type": "integer", "minimum": 1 },
    "titre":       { "type": "string", "minLength": 1, "maxLength": 80 },
    "origine": {
      "type": "object",
      "additionalProperties": false,
      "required": ["source", "niveau", "fiche"],
      "properties": {
        "source": { "type": "string", "minLength": 1 },
        "niveau": { "type": "integer", "minimum": 1, "maximum": 7 },
        "fiche":  { "type": "integer", "minimum": 1, "maximum": 15 }
      }
    },
    "competences": {
      "type": "array", "minItems": 1, "uniqueItems": true,
      "items": { "type": "string", "pattern": "^(gph|syl|mot\\.outil|lex|flu|comp|enc)\\.[a-z0-9.\\-]+$" }
    },
    "difficulte": { "type": "integer", "minimum": 1, "maximum": 5 },
    "jeu": {
      "type": "object",
      "additionalProperties": false,
      "required": ["moteur", "habillage", "noeud", "etoiles", "aideGobi", "contenu"],
      "properties": {
        "moteur": {
          "type": "string",
          "enum": ["attrape","tri","assemble","chemin","eclair","paires","phrase",
                   "histoire","chrono","grave","colorie","libre","place"]
        },
        "habillage": { "type": "string", "pattern": "^[a-z0-9]+(\\.[a-z0-9\\-]+)+$" },
        "noeud":     { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
        "etoiles": {
          "type": "object",
          "additionalProperties": false,
          "required": ["sansAide", "sansErreur"],
          "properties": { "sansAide": { "type": "boolean" }, "sansErreur": { "type": "boolean" } }
        },
        "aideGobi": {
          "type": "array", "minItems": 1, "uniqueItems": true,
          "items": { "enum": ["relire-consigne","souffle-syllabe","surligne-graphene",
                              "montre-cible","montre-couleur"] }
        },
        "contenu": true
      }
    }
  }
}
```

### 9.3 `SCHEMA_CONTENU_COLORIE` — **L-E**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "pierre:schemas/contenu-colorie",
  "type": "object",
  "additionalProperties": false,
  "required": ["consignes", "nuancierAutorise"],
  "properties": {
    "consignes": {
      "type": "array", "minItems": 1, "maxItems": 8,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "texte", "forme", "audio", "cibles", "motsCles"],
        "properties": {
          "id":     { "type": "string", "pattern": "^c[0-9]+$" },
          "texte":  { "type": "string", "minLength": 3, "maxLength": 120 },
          "forme":  { "enum": ["imperative", "affirmative"] },
          "audio":  { "type": ["string", "null"] },
          "cibles": {
            "type": "array", "minItems": 1, "maxItems": 8, "uniqueItems": true,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["region", "couleur"],
              "properties": {
                "region":  { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
                "couleur": { "enum": ["rouge","orange","jaune","vert","bleu","violet",
                                      "rose","brun","noir","blanc","gris"] }
              }
            }
          },
          "motsCles": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 2 } }
        }
      }
    },
    "nuancierAutorise": {
      "type": "array", "minItems": 4, "maxItems": 11, "uniqueItems": true,
      "items": { "enum": ["rouge","orange","jaune","vert","bleu","violet",
                          "rose","brun","noir","blanc","gris"] }
    }
  }
}
```

`"cibles": { "minItems": 1, "maxItems": 8 }` est **la** ligne qui traduit l'observation de
fiches-origine § 3 : une consigne porte une **liste** de couples (région, couleur), pas un couple.
Un schéma qui écrirait `"cibles": { "$ref": "#/$defs/cible" }` au singulier rendrait la consigne 5 de
la fiche 1 inexprimable.

### 9.4 `contenu/habillages/clairiere/ecole.habillage.json` — **L-F**, extrait normatif

Les **30 `id` de régions** ci-dessous sont gelés. `ecole.svg` doit porter exactement ces `id` sur ses
`<path>`, et rien d'autre en rôle `coloriable`. L-E les lit, L-F les dessine, L-G les assert.

```
ciel · herbe · mur-ecole · toit-ecole · porte-ecole · fenetre-ecole-1 · fenetre-ecole-2 ·
horloge-ecole · tronc-arbre-1 · tronc-arbre-2 · tronc-arbre-3 · tronc-arbre-4 ·
feuilles-arbre-1 · feuilles-arbre-2 · feuilles-arbre-3 · feuilles-arbre-4 ·
pull-maitresse · jupe-maitresse · cheveux-maitresse ·
cheveux-garcon-1 · cheveux-garcon-2 · tshirt-garcon-1 · tshirt-garcon-2 ·
robe-fille-1 · robe-fille-2 · cheveux-fille-1 · cheveux-fille-2 ·
ballon · corde · banc
```

30 régions : conforme à la fourchette « entre 6 et 40 » de la passe technique de l'annexe P § 3.5.

```jsonc
{
  "id": "clairiere.ecole",
  "moteurs": ["colorie"],
  "libelle": "La cour de l'école",
  "region": "clairiere",
  "scene": {
    "fichier": "habillages/clairiere/ecole.svg",
    "viewBox": "0 0 922 615",
    "calques": [
      { "id": "calque-fond",  "role": "fond",       "regions": [] },
      { "id": "calque-zones", "role": "coloriable", "regions": [
          { "id": "ciel",       "libelle": "le ciel",           "centroide": [461,  90], "surface": 128000 },
          { "id": "toit-ecole", "libelle": "le toit de l’école","centroide": [250, 210], "surface":  18400 },
          { "id": "porte-ecole","libelle": "la porte de l’école","centroide":[248, 360], "surface":   7300 }
          /* … les 27 autres, même forme … */
      ]},
      { "id": "calque-trait", "role": "trait", "regions": [] }
    ]
  },
  "palette": {
    "jetons": {},
    "nuancier": ["rouge","orange","jaune","vert","bleu","violet","rose","brun","noir","blanc","gris"]
  },
  "timings": { "appuiMs": 60, "relachementMs": 120, "refusMs": 180,
               "recolorationMs": 900, "interEtoilesMs": 180 },
  "sons": { "ambiance": null, "effets": {} }
}
```

Le `viewBox` reprend les dimensions relevées de la scène d'origine (922 × 615 px,
fiches-origine § 3). `palette.jetons` est vide : la Clairière n'altère aucun jeton v2 § 9.2 en v1.

### 9.5 `contenu/exercices/clairiere/ecole-01.json` — exemple complet et valide, **L-F**

```json
{
  "id": "clairiere-ecole-01",
  "version": 1,
  "titre": "La cour de l’école",
  "origine": { "source": "fiches-origine/NIVEAU 1.pdf", "niveau": 1, "fiche": 1 },
  "competences": ["comp.consigne.simple", "comp.consigne.multiple", "lex.couleur"],
  "difficulte": 1,
  "jeu": {
    "moteur": "colorie",
    "habillage": "clairiere.ecole",
    "noeud": "clairiere-01",
    "etoiles": { "sansAide": true, "sansErreur": true },
    "aideGobi": ["relire-consigne", "souffle-syllabe", "montre-cible", "montre-couleur"],
    "contenu": {
      "consignes": [
        {
          "id": "c1",
          "texte": "Le pull de la maîtresse est bleu.",
          "forme": "affirmative",
          "audio": null,
          "cibles": [{ "region": "pull-maitresse", "couleur": "bleu" }],
          "motsCles": ["pull", "maîtresse", "bleu"]
        },
        {
          "id": "c2",
          "texte": "Colorie les feuilles des arbres en vert.",
          "forme": "imperative",
          "audio": null,
          "cibles": [
            { "region": "feuilles-arbre-1", "couleur": "vert" },
            { "region": "feuilles-arbre-2", "couleur": "vert" },
            { "region": "feuilles-arbre-3", "couleur": "vert" },
            { "region": "feuilles-arbre-4", "couleur": "vert" }
          ],
          "motsCles": ["feuilles", "arbres", "vert"]
        },
        {
          "id": "c3",
          "texte": "Les garçons ont les cheveux bruns.",
          "forme": "affirmative",
          "audio": null,
          "cibles": [
            { "region": "cheveux-garcon-1", "couleur": "brun" },
            { "region": "cheveux-garcon-2", "couleur": "brun" }
          ],
          "motsCles": ["garçons", "cheveux", "bruns"]
        },
        {
          "id": "c4",
          "texte": "La porte de l’école est jaune et le toit est rouge.",
          "forme": "affirmative",
          "audio": null,
          "cibles": [
            { "region": "porte-ecole", "couleur": "jaune" },
            { "region": "toit-ecole",  "couleur": "rouge" }
          ],
          "motsCles": ["porte", "jaune", "toit", "rouge"]
        }
      ],
      "nuancierAutorise": ["rouge", "orange", "jaune", "vert", "bleu", "violet", "rose", "brun"]
    }
  }
}
```

**Quatre consignes, neuf cibles.** Trois observations à ne pas perdre :

- `c1`, `c3` et `c4` sont de forme **affirmative** : elles ont la forme d'un constat et valent
  pourtant un ordre. C'est la difficulté pragmatique réelle du corpus (fiches-origine § 3), et le
  champ `forme` existe pour qu'aucun lot ne soit tenté de la « corriger » en impératif.
- `c4` porte **deux** couples (porte, jaune) et (toit, rouge) : c'est le cas qui a dicté le schéma.
- Le `nuancierAutorise` contient 8 couleurs pour 5 couleurs utiles. Il n'est **jamais** restreint à
  la consigne active : sinon l'enfant n'aurait plus besoin de lire la couleur.

**La consigne 2 de la fiche papier — « Dessine un soleil dans le ciel » — est absente.** Elle relève
du moteur `place` (point ouvert O6, fiches-origine § 5 F1), qui n'existe pas. Écart assumé n° 3
en § 12.

### 9.6 `contenu/noeuds/clairiere-01.json` — **L-F**

```json
{
  "id": "clairiere-01",
  "region": "clairiere",
  "ordre": 1,
  "exercice": "clairiere-ecole-01",
  "prerequis": [],
  "temps": "presentation"
}
```

### 9.7 `contenu/referentiel/competences.json` — **L-F**

Trois compétences, et pas une de plus. Elles séparent délibérément les deux gestes que la fiche 1
mélange (fiches-origine § 5, **F4**) : exécuter une consigne d'une part, vérifier un énoncé sur
l'image d'autre part. La seconde n'apparaît pas en v1 — le vrai/faux n'a pas de moteur — mais le
code est réservé pour que le référentiel n'ait pas à être renuméroté au lot L6.

```json
[
  { "code": "comp.consigne.simple",   "libelle": "Exécuter une consigne à une cible",
    "famille": "comp", "prerequis": [] },
  { "code": "comp.consigne.multiple", "libelle": "Exécuter une consigne à plusieurs cibles",
    "famille": "comp", "prerequis": ["comp.consigne.simple"] },
  { "code": "lex.couleur",            "libelle": "Reconnaître le nom écrit d’une couleur",
    "famille": "lex", "prerequis": [] }
]
```

`comp.consigne.multiple` est ce que la consigne 4 de l'exemple (« la porte est jaune **et** le toit
est rouge ») exerce et que la consigne 1 n'exerce pas. Sans cette distinction, la maîtrise agrégée
des deux ne serait interprétable ni pour l'une ni pour l'autre — c'est exactement l'avertissement F4.

**Ce fichier ne se modifie pas sans validation explicite** (annexe P § 6.4 : le référentiel de
compétences est sur la liste des objets protégés).

### 9.8 Les 6 contrôles de `test:contenu` en v1 — **L-G**

Sous-ensemble des 10 de l'annexe T § T1. Les 4 absents sont ceux qui n'ont pas d'objet en v1 ;
chacun porte sa raison écrite, conformément au principe directeur de l'annexe T.

| # | Contrôle | v1 |
|---|---|---|
| 1 | Conformité au JSON Schema (enveloppe **et** bloc moteur) | ✅ |
| 2 | Unicité des `id` d'exercice | ✅ |
| 3 | Tous les médias référencés existent sur disque (`scene.fichier`) | ✅ |
| 4 | `jeu.moteur` enregistré, `jeu.habillage` existant, couple déclaré compatible | ✅ |
| 5 | Toutes les compétences citées existent dans le référentiel | ✅ |
| 6 | Toute `cible.region` existe dans un calque `coloriable` de l'habillage, et sa `surface` tient la règle des 64 px | ✅ |
| 7 | Graphe de prérequis acyclique | ⛔ un seul nœud, aucun prérequis |
| 8 | Chaque consigne dispose d'un audio pré-rendu (R15) | ⛔ pas d'audio en v1 (D1) — dette explicite, écart n° 4 |
| 9 | Couverture lexicale CE1 | ⛔ pas de liste de fréquence dans le dépôt à ce stade |
| 10 | ≥ 3 moteurs par compétence (R12) | ⛔ un seul moteur en v1, par construction (D1) |

Le contrôle 6 est le seul qui ne figure pas tel quel dans l'annexe T : il est la contrepartie
mécanique du couplage exercice ↔ habillage introduit par le mode `regions`. Sans lui, un `id` de
région mal orthographié dans le JSON ne se verrait qu'en jeu, chez l'enfant.

---

## 10. Attributs `data-*` — le contrat entre L-D, L-E et L-G

Les tests E2E, visuels et d'accessibilité n'ont pas d'autre prise sur l'interface. Cette table est
donc opposable dans les deux sens : L-G ne cible que ces attributs, L-D et L-E les émettent tous.

| Attribut | Porté par | Valeurs | Vérifié par |
|---|---|---|---|
| `data-ecran` | racine de chaque écran | `chargement` `profils` `carte` `noeud` `recompense` | tous les E2E |
| `data-test-pret` | racine de `EcranNoeud` | `oui` quand le SVG est injecté et `document.fonts.ready` résolu | T4 — remplace toute attente de durée |
| `data-region-svg` | chaque `<path>` coloriable | l'`IdRegionSvg` | `parcours`, `visuel` |
| `data-peinte` | idem | `oui` `non` | `parcours`, `visuel` |
| `data-couleur` | idem, si peinte | une `CouleurColoriage` | `parcours` |
| `data-godet` | chaque godet du nuancier | une `CouleurColoriage` | `parcours`, `cassecou` |
| `data-choisie` | idem | `oui` `non` | `parcours` |
| `data-consigne` | la ligne de consigne | l'`IdConsigne` | `parcours` |
| `data-consigne-etat` | idem | `courante` `faite` `a-venir` | `parcours` |
| `data-aide` | racine de `EcranNoeud` | `aucune` `indice` `demonstration` | `cassecou` |
| `data-etoile` | chaque étoile | `1` `2` `3` | `parcours`, `visuel` |
| `data-acquise` | idem | `oui` `non` | `parcours` |
| `data-fin` | racine de `EcranRecompense` | `reussite` — **et rien d'autre** | `cassecou` |
| `data-interaction` | élément librement tapable | `libre` | R11, hors périmètre v1 |

**`data-etat="echec"` n'est émis par aucun composant, jamais.** `cassecou` assert son absence après
40 réponses fausses ; c'est la traduction mécanique de R14 et le seul principe des specs qu'il serait
catastrophique de casser sans s'en apercevoir.

Tout élément portant `data-godet` ou `data-region-svg` doit présenter une boîte d'au moins
64 × 64 px CSS à la résolution de la Galaxy Tab S10 FE (1920 × 1200, DPR 2) — assert par
`tests/qualite/a11y.spec.ts`.

---

## 11. Frontières — qui exporte, qui importe

### 11.1 `partage/src/index.ts` — le barillet, écrit par **L-B**

Ce fichier **est** la surface inter-lots de L-B. Il est reproduit ici en entier : un lot qui a besoin
d'un symbole absent de cette liste a trouvé un défaut du contrat, il ne l'ajoute pas de son propre
chef.

```ts
// partage/src/index.ts — L-B
export type { Alea } from './alea.js';
export { creerAlea, graineParDefaut } from './alea.js';

export type { Horloge, DureeSimulee } from './horloge.js';
export { creerHorloge, creerHorlogeFigee, horloge } from './horloge.js';

export type {
  IdProfil, IdNoeud, IdExercice, IdHabillage, IdRegionSvg, IdConsigne, IdTentative,
  CodeCompetence, CodeRegion, CodeMoteur, Horodatage, CheminAsset
} from './identifiants.js';

export type { JetonCouleur, CouleurColoriage } from './palette.js';
export { PALETTE, NUANCIER, hexDeCouleur } from './palette.js';

export { normaliserTexte, comparerNormalise } from './texte.js';

export type { CodeErreur } from './erreurs.js';
export { ErreurPierre } from './erreurs.js';

export type { FournisseurVoix, DemandeVoix, Locuteur } from './fournisseurs/voix.js';
export type { FournisseurAudio, CodeEffet, CanalAudio } from './fournisseurs/audio.js';
export type { FournisseurLLM, DemandeLLM, ReponseLLM } from './fournisseurs/llm.js';
export type { DepotContenu } from './fournisseurs/depot-contenu.js';

export type {
  Moteur, MoteurQuelconque, EntreeMoteur, ContexteMoteur, ProgressionMoteur,
  ResumeTentative, ResumeEtape, NiveauAide, AideProposee, CodeAideGobi,
  CapacitesMoteur, SchemaJson,
  Habillage, SceneHabillage, CalqueHabillage, RoleCalque, RegionColoriable,
  VariantePalette, TimingsHabillage, SonsHabillage
} from './moteurs/types.js';

export { enregistrerMoteur, obtenirMoteur, moteursEnregistres, estMoteurEnregistre }
  from './moteurs/registre.js';
export { MOTEURS, initialiserRegistreMoteurs } from './moteurs/tous.js';

export type {
  Exercice, OrigineExercice, BlocJeu, BaremeEtoiles,
  Noeud, TempsNoeud, Competence, FamilleCompetence
} from './contenu/types.js';

export type { Tentative, TentativeAEnregistrer, NombreEtoiles } from './journal/types.js';
export { calculerEtoiles } from './etoiles.js';

export type {
  Profil, ConfigurationAvatar, CreationProfil, PaquetNoeud, ProgressionNoeud,
  ReponseTentative, ReponseSante, ErreurApi, CodeErreurApi
} from './api/contrats.js';
export { CHEMINS_API } from './api/contrats.js';

export type {
  SurfaceTest, FixtureProfil, EntreeProgressionTest, EtatTestSerialisable, CodeEcran
} from './testabilite/surface.js';
```

**Ni `./contenu/validation.js` ni `./fournisseurs/factices.js` ne sont réexportés ici** — motif en
§ 3.1, c'est le budget de bundle. Ils ont leur propre sous-chemin.

### 11.2 Les autres surfaces inter-lots

```ts
// @pierre/partage/validation — L-B
export type { ProblemeValidation, RapportValidation };
export { validerExercice, validerBlocJeu };

// @pierre/partage/factices — L-B
export type { ContenuEnMemoire };
export { VoixMuette, AudioMuet, LlmScripte, DepotContenuMemoire };
```

```ts
// partage/src/moteurs/colorie/{types,validation,moteur,schema-contenu}.ts — L-E
export type {
  ContenuColorie, ConsigneColorie, CibleColorie, FormeConsigne,
  EtatColorie, EtatConsigne, ActionColorie, RefusColorie, MotifRefus, DecisionPeinture
};
export { moteurColorie, evaluerPeinture, regionSousLeDoigt,
         SCHEMA_CONTENU_COLORIE, TOLERANCE_TAP_PX, REFUS_COMPTE_ERREUR, DELAIS_AIDE };

// client/src/moteurs/colorie/{index,recoloration}.ts — L-E
export type { OptionsRecoloration };
export { renduColorie, jouerRecoloration };
```

```ts
// client/src/moteurs/types.ts + registre-rendu.ts + Application.tsx + etat/magasin.ts + ecrans — L-D
export type { MoteurRendu, ProprietesMoteur, ComposantMoteur, ServicesJeu, MoteurRenduQuelconque };
export { registreRendu, obtenirRendu, Application, EcranNoeud, creerMagasin };

// serveur/src/{application,base/connexion,base/migrations}.ts — L-C
export type { OptionsApplication, RapportMigration };
export { construireApplication, ouvrirBase, appliquerMigrations };
```

### 11.3 Table des frontières, couple par couple

| Couple | Qui exporte | Qui importe | Chemin d'import | Ce qui passe |
|---|---|---|---|---|
| L-B → L-C | L-B | L-C | `@pierre/partage` | Tout le barillet : `Horloge`, `Alea`, `DepotContenu`, `Exercice`, `Habillage`, `Tentative`, `CHEMINS_API`, `calculerEtoiles`, `initialiserRegistreMoteurs` |
| L-B → L-C | L-B | L-C | `@pierre/partage/validation` | `validerExercice`, `validerBlocJeu` — le serveur refuse un contenu invalide au chargement |
| L-B → L-D | L-B | L-D | `@pierre/partage` | Types de moteur et d'habillage, `SurfaceTest`, `ServicesJeu` amont, contrats d'API |
| L-B → L-E | L-B | L-E | `@pierre/partage` | `Moteur`, `Habillage`, `RegionColoriable`, `NiveauAide`, `AideProposee`, `CouleurColoriage`, `Alea`, `Horloge` |
| L-B → L-F | L-B | L-F | — (aucun import de code) | L-F **produit des données** conformes aux types de L-B ; le lien est vérifié par `test:contenu`, pas par le compilateur |
| L-B → L-G | L-B | L-G | `@pierre/partage`, `/validation`, `/factices` | Tout, plus les factices `VoixMuette` / `AudioMuet` / `DepotContenuMemoire` |
| **L-E → L-B** | L-E | L-B | `./colorie/moteur.js` (relatif, même paquet) | `moteurColorie`, agrégé dans `MOTEURS`. **Inversion assumée** : le barillet dépend d'un fichier écrit par un autre lot |
| **L-E → L-D** | L-E | L-D | `./colorie/index.js` (relatif, même paquet) | `renduColorie`, seule entrée de `registreRendu` |
| L-D → L-E | L-D | L-E | `../types.js` (relatif, même paquet) | `MoteurRendu`, `ProprietesMoteur`, `ComposantMoteur`, `ServicesJeu` |
| L-E → L-G | L-E | L-G | alias `@pierre/partage` + chemins relatifs de test | Les 20 symboles de § 11.2 pour les tests unitaires et composants |
| L-D → L-G | L-D | L-G | alias vers `client/src/**` | `Application`, `EcranNoeud`, `creerMagasin`, `registreRendu` pour les tests composants |
| L-C → L-G | L-C | L-G | alias vers `serveur/src/**` | `construireApplication`, `ouvrirBase`, `appliquerMigrations` pour les tests T2 |
| L-F → L-C | L-F | L-C | lecture disque via `DepotContenu` | `contenu/**` — frontière de **fichiers**, pas de symboles |
| L-F → L-G | L-F | L-G | lecture disque | `contenu/schemas/*.json` chargés par `scripts/test-contenu.mjs` |
| L-A → L-G | L-A | L-G | `npm run <script>` | Frontière de **processus** : `package.json` appelle `scripts/verifier.mjs` et consorts |
| L-G → L-A | L-G | L-A | codes de sortie, `tests/rapports/**` | `verifier.bat` ouvre `RAPPORT.md` |
| L-A → tous | L-A | tous | `tsconfig.base.json`, `eslint.config.js` | Frontière de **configuration** : options de compilation et règles de lint |

### 11.4 Les deux inversions de dépendance, et pourquoi elles sont assumées

`partage/src/moteurs/tous.ts` (L-B) importe L-E, et `client/src/moteurs/registre-rendu.ts` (L-D)
importe L-E. Ces deux fichiers **ne compilent pas tant que L-E n'a pas écrit les siens**. C'est
voulu : l'alternative — un enregistrement dispersé dans chaque racine de composition — obligerait
L-C, L-D et L-G à se souvenir d'appeler `enregistrerMoteur`, et l'oubli ne se verrait qu'à
l'exécution. Ici, l'oubli ne compile pas.

Conséquence d'orchestration : **L-E est sur le chemin critique de la compilation.** Si un lot doit
être lancé en premier, c'est lui.

---

## 12. Écarts assumés aux documents de référence

| # | Écart | Source contredite | Motif |
|---|---|---|---|
| 1 | **Un seul paquet `partage/`** au lieu de `serveur/services/alea.ts` **et** `client/src/services/alea.ts` | annexe T § 2.1 | Deux fichiers = deux sources de vérité. `Alea` et `Horloge` sont le socle du déterminisme de toute la suite de tests : deux implantations qui divergent d'un bit rendent le rejeu T2 ininterprétable. L'annexe T cite deux chemins pour illustrer que les deux côtés en ont besoin, pas pour prescrire une duplication. |
| 2 | **Un nuancier de coloriage de 11 couleurs**, distinct des 7 jetons de la palette | v2 § 9.2 (complétée, non modifiée) | La fiche 1 demande bleu, vert, brun, jaune, rouge. La palette d'interface n'a ni brun ni rouge franc. Le nuancier est **ajouté à côté**, la palette n'est pas touchée. 6 des 11 couleurs reprennent exactement un jeton existant (`jaune`=soleil, `bleu`=lagon, `rose`=framboise, `brun`=`#7A5230` de v2 § 4.1, `noir`=trait, `blanc`=parchemin, `gris`=grisaille). **À faire valider** : c'est une addition à la direction artistique. |
| 3 | **La consigne 2 de la fiche 1 (« Dessine un soleil ») est écartée de la v1** | fiches-origine § 3 | Elle exige le moteur `place`, qui n'existe pas (point ouvert O6, F1). L'exercice v1 porte 4 consignes sur 5. La 5ᵉ revient avec `place`. |
| 4 | **Aucun audio en v1** : `FournisseurVoix` câblé sur `VoixMuette`, `consigne.audio = null` | R15, v2 § 10.1 | D1 exclut l'audio du périmètre. Le bouton « écouter » **existe** et appelle le fournisseur, qui journalise. R15 n'est donc **pas satisfaite en v1** : dette explicite, levée au lot L2 sans changement d'interface. Le contrôle 8 de `test:contenu` est désactivé avec sa raison écrite. |
| 5 | **Schéma SQLite réduit à 3 tables** ; `regions`, `noeuds`, `progression_region`, `compagnons`, `formes_gobi`, `campement` reportées | v2 § 13.3 | D1 : un seul nœud, pas de carte, pas de compagnons. Le catalogue de nœuds vit en JSON dans `contenu/`, ce qui évite une table à deux sources de vérité avec les fichiers. |
| 6 | **Identifiants en alias de `string`, sans marquage nominal** | aucune | Les *branded types* multiplieraient les points de non-compilation entre 7 lots écrits en parallèle. Le marquage s'ajoutera plus tard sans changer un seul site d'appel. |
| 7 | **`test:rejeu` est une coquille** qui sort en code 0 | annexe T § 5 | Aucun journal de référence n'existe, et D1 exclut BKT et Leitner. Le script existe, s'exécute, et **déclare** dans son rapport qu'il n'a rien vérifié. |
| 8 | **`exactOptionalPropertyTypes` désactivé** | aucune | Même motif que 6 : réduire les divergences de compilation entre lots parallèles. Les champs facultatifs sont d'ailleurs déclarés `T \| null` plutôt que `T?` partout où c'est possible. |
| 9 | **`p_devinette` (O2) non traité** | fiches-origine § 6 | Pas de BKT en v1 (D1). Le point reste ouvert et bloquant pour `pedagogie/`. |
| 10 | **Ordre des consignes imposé** alors que la fiche papier les laisse libres | fiches-origine § 3 | Une consigne à la fois est ce qui porte, en jeu, la désambiguïsation que le titre de colonne assurait sur le papier (F3). Réversible : `CapacitesMoteur.ordreEtapesImpose` est un champ, pas une constante enfouie. |
| 11 | **4 des 10 contrôles de `test:contenu` désactivés**, chacun avec sa raison écrite | annexe T § T1 | Détail en § 9.8. Le principe directeur de l'annexe T — « soit un test automatique, soit une raison écrite de ne pas en avoir » — est honoré. |

---

## 13. Contrat de sortie — les chiffres, mesurés

Comptés par script sur ce fichier même, pas affirmés. Commande et sortie citées en § 13.2.

| Grandeur | Valeur |
|---|---|
| Fichiers listés dans l'arborescence (§ 1) | **129** |
| dont L-A outillage | 15 |
| dont L-B partage/testabilité | 23 |
| dont L-C serveur | 18 |
| dont L-D client-coquille | 25 |
| dont L-E moteur-colorie | 9 |
| dont L-F ingestion-contenu | 11 |
| dont L-G chaîne-de-test | 28 |
| Chemins distincts (aucun fichier à deux propriétaires) | **129** |
| Interfaces et types exportés depuis `partage/` | **86** |
| Valeurs (fonctions, classes, constantes) exportées depuis `partage/` | 32 |
| Symboles inter-lots (exportés par un lot, importés par un autre) | **136** |

### 13.1 Décomposition des 136 symboles inter-lots

| Lot exportateur | Types | Valeurs | Total | Détail |
|---|---|---|---|---|
| L-B | 76 | 25 | **101** | 92 par le barillet `@pierre/partage` (73 types + 19 valeurs), 9 par `/validation` et `/factices` |
| L-E | 11 | 9 | **20** | 17 vivent dans `partage/src/moteurs/colorie/`, 3 dans `client/src/moteurs/colorie/` |
| L-D | 5 | 5 | **10** | Le contrat de rendu et les points d'entrée testables |
| L-C | 2 | 3 | **5** | `construireApplication`, `ouvrirBase`, `appliquerMigrations` et leurs types |

Les **86 types exportés depuis `partage/`** se décomposent en 73 du barillet, 3 des sous-chemins et
10 du moteur `colorie` — ces derniers vivent dans `partage/` mais appartiennent à L-E (§ 1.5).

L-A, L-F et L-G n'exportent aucun symbole TypeScript : leurs frontières sont de **processus**
(scripts npm), de **fichiers** (`contenu/**`, `tests/rapports/**`) et de **configuration**
(`tsconfig.base.json`, `eslint.config.js`). Elles sont documentées en § 11.3 et sont tout aussi
opposables.

### 13.2 Comment ces chiffres ont été obtenus

Comptage mécanique sur ce fichier, pas estimation. Les fichiers sont les lignes de § 1 qui ont la
forme `` | `chemin` | L-X | `` ; les symboles sont les identifiants nommés dans les accolades des
blocs `export` de § 11.1 et § 11.2. Sortie exacte du comptage :

```
fichiers total      : 129
par lot             : {"L-A":15,"L-B":23,"L-C":18,"L-D":25,"L-E":9,"L-F":11,"L-G":28}
chemins distincts   : 129
doublons            : aucun
--- L-B barillet @pierre/partage ---   types : 73  valeurs : 19  total : 92
--- L-B sous-chemins /validation + /factices --- types : 3  valeurs : 6  total : 9
--- L-E ---  types : 11  valeurs : 9  total : 20
--- L-D ---  types :  5  valeurs : 5  total : 10
--- L-C ---  types :  2  valeurs : 3  total :  5
SYMBOLES INTER-LOTS TOTAL : 136
```

`chemins distincts == fichiers total` est l'assertion qui prouve qu'**aucun fichier n'a deux
propriétaires** — la règle « un seul écrivain par fichier » est mécaniquement vérifiée, pas
supposée. À refaire après toute modification de ce document.

**Trois défauts qui rendraient ce contrat RATÉ**, vérifiés :

1. Un lot sans aucun fichier. → aucun : les sept comptes ci-dessus sont non nuls, le plus petit est
   L-E à 9.
2. Un symbole inter-lots sans propriétaire. → aucun : chaque symbole de § 11.1 et § 11.2 est rattaché
   à un fichier de § 1, lui-même rattaché à un lot.
3. Un fichier de § 1 sans lot. → aucun : le comptage ne retient que les lignes dont la colonne
   « Lot » vaut `L-A` à `L-G`, et il en trouve 129, soit toutes les lignes de fichier de § 1.

---

## 14. Risques connus de ce contrat

| Risque | Ce qui casse | Parade |
|---|---|---|
| Un lot déclare `creerEtat: (…) => …` au lieu de `creerEtat(…)` | `MoteurQuelconque` cesse d'être assignable, le registre ne compile plus | Le commentaire normatif est dans le bloc de § 4.1 ; à vérifier en revue mécanique |
| Un import relatif sans `.js` | `nodenext` refuse de résoudre | Règle en § 0 ; le compilateur l'attrape en quelques secondes |
| Ajv réexporté depuis le barillet | Budget de 250 Ko gzip dépassé | § 3.1 et § 11.1 l'interdisent ; `verifier-bundle.mjs` le mesure |
| Une `export const` glissée dans `testabilite/surface.ts` | Fuite dans le bundle de production | § 7.1 ; `verifier-bundle.mjs` le mesure |
| L-E en retard | `partage/src/moteurs/tous.ts` et `client/src/moteurs/registre-rendu.ts` ne compilent pas | § 11.4 : L-E est sur le chemin critique, à lancer en premier |
| `ecole.svg` ne porte pas exactement les 30 `id` de § 9.4 | L'exercice référence des régions inexistantes | Contrôle 6 de `test:contenu` (§ 9.8) — il échoue avant que l'enfant ne voie quoi que ce soit |
| Playwright sans navigateur installé | 3 des 7 commandes échouent au lancement | Prérequis nommé en § 8.2 ; c'est un défaut d'environnement, le rapport doit le dire |
| Tailwind v4 et les jetons de palette | Deux sources de couleur (CSS et TypeScript) qui divergent | `client/src/styles/global.css` **dérive** ses variables de `PALETTE` et `NUANCIER` ; c'est L-D qui en répond |
| Le nuancier de coloriage n'a pas été validé | Addition non validée à la direction artistique | Écart n° 2 en § 12 — **à soumettre avant que L-F ne dessine** |
