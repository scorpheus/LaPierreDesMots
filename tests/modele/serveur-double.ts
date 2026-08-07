/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DOUBLE DE RÉSEAU DE L'EXPLORATEUR — lot Q2.
 *
 * L'explorateur du lot Q2 monte l'application React **réelle** dans happy-dom et la parcourt.
 * Pour qu'un écran se rende, il lui faut des réponses HTTP. Ce fichier les fournit.
 *
 * ── POURQUOI UN DOUBLE, ET PAS LE VRAI SERVEUR — c'est mesuré, pas préféré ─────────────────
 * Le vrai `construireApplication` a été essayé en premier. Sous l'environnement `happy-dom`
 * du projet Vitest `composants`, il ne se charge pas :
 *
 *   $ npx vitest run --project composants  (sonde : `await import('@serveur/configuration')`)
 *     [sonde] ECHEC configuration : The URL must be of scheme file
 *     [sonde] connexion OK function
 *
 * `serveur/src/configuration.ts:33` fait `fileURLToPath(new URL('../../', import.meta.url))` ;
 * en transformation « web », `import.meta.url` n'est pas une URL `file:`. C'est exactement
 * l'écueil que `tests/configuration/preparation.ts` documente déjà pour lui-même. La seule
 * autre voie serait de modifier `vitest.config.ts` — un fichier partagé, en pleine campagne
 * multi-agents. On paie la moins chère des deux.
 *
 * ── CE QUE CE DOUBLE N'EST PAS ────────────────────────────────────────────────────────────
 * Il ne remplace ni `tests/api/**` (qui montent la vraie application Fastify sur `:memory:`),
 * ni les E2E (qui parlent au vrai serveur construit). Il ne prouve **rien** sur le serveur.
 * Il est au réseau ce que `VoixMuette` est au son : une frontière figée, pour que le sujet
 * observé — ici la NAVIGATION du client — soit le seul à pouvoir échouer.
 *
 * ── LES TROIS GARDES QUI L'EMPÊCHENT DE MENTIR ────────────────────────────────────────────
 * Un double de réseau silencieux est un piège : il suffit qu'il réponde 404 à la route d'un
 * écran pour que cet écran se rende vide, sans prise — et l'explorateur conclurait « écran
 * sans issue » sur un défaut du double. D'où :
 *
 *   1. **Aucun chemin n'est ignoré.** Tout appel qui ne trouve pas de gestionnaire est
 *      enregistré dans `appelsSansGestionnaire` ; les tests échouent si la liste n'est pas
 *      vide. Le double ne peut pas affamer un écran en silence.
 *   2. **Aucune route n'est inventée.** Les gestionnaires sont indexés par les motifs de
 *      `CHEMINS_API.motifs` — la table qui fait foi. `motifsSansGestionnaire()` énumère les
 *      motifs déclarés sans réponse : c'est l'audit par OBJETS de D48, appliqué au double
 *      lui-même. Une route ajoutée demain au contrat fait rougir ce lot tant qu'elle n'est
 *      pas servie.
 *   3. **Aucune donnée n'est inventée.** Les formes viennent des constructeurs réels de
 *      `partage/` (`carteInitiale`, `gobiInitial`, `REGLAGES_PAR_DEFAUT`, `MANIFESTE_VIDE`,
 *      `construireCatalogue`) et les contenus viennent du DISQUE (`contenu/**`). Le double ne
 *      décide de rien ; il transporte.
 *
 * Aucun `Math.random`, aucun `Date.now`, aucun `new Date()` : l'horodatage vient de
 * `INSTANT_DE_REFERENCE`, et les identifiants sont des compteurs.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CHEMINS_API } from '@pierre/partage';
import type { Profil } from '@pierre/partage';
import { REGLAGES_PAR_DEFAUT } from '@pierre/partage/lecture';
import type { ReglagesLecture } from '@pierre/partage/lecture';
import { MANIFESTE_VIDE } from '@pierre/partage/voix';
import { construireCatalogue } from '@pierre/partage/parent';
import { OUVERTURE_JAMAIS_VUE } from '@pierre/partage/ouverture';
import {
  campementDuDocument,
  carteInitiale,
  compagnonParRegion,
  compagnonsDuDocument,
  compagnonsDuProfil,
  gobiInitial,
  paralleleDuDocument,
  regionsDuDocument,
  stadesDuDocument
} from '@pierre/partage/monde';
import type { EtatMonde } from '@pierre/partage/monde';

import { RACINE_DEPOT, horlogeDeTest, lireJson } from '../configuration/preparation.js';

/**
 * L'unique instant du double.
 *
 * Lu sur l'HORLOGE FIGÉE de `preparation.ts`, jamais sur `new Date()` : la règle de CLAUDE.md
 * (« aucun `Date.now`, aucun `new Date()` hors `Alea` et `Horloge` ») vaut aussi dans les
 * tests — une QA non déterministe est une QA qu'on finit par ignorer.
 */
const MAINTENANT = horlogeDeTest().maintenant();

/** Le préfixe des assets, servi depuis `contenu/` sur disque. */
const RACINE_CONTENU = join(RACINE_DEPOT, 'contenu');

// ────────────────────────────────────────────────────────────────── le référentiel du monde

interface ReferentielMonde {
  readonly regions: ReturnType<typeof regionsDuDocument>;
  readonly parallele: number;
  readonly stades: ReturnType<typeof stadesDuDocument>;
  readonly compagnons: ReturnType<typeof compagnonsDuDocument>;
  readonly campement: ReturnType<typeof campementDuDocument>;
}

function lireReferentiel(): ReferentielMonde {
  const documentRegions = lireJson('contenu/monde/regions.json');
  return {
    regions: regionsDuDocument(documentRegions),
    parallele: paralleleDuDocument(documentRegions),
    stades: stadesDuDocument(lireJson('contenu/monde/gobi-stades.json')),
    compagnons: compagnonsDuDocument(lireJson('contenu/monde/compagnons.json')),
    campement: campementDuDocument(lireJson('contenu/monde/campement.json'))
  };
}

/**
 * Le monde d'un profil NEUF, assemblé exactement comme `serveur/src/depots/monde.ts` le fait
 * pour un profil dont aucune table de progression ne porte de ligne : mêmes fonctions de
 * `partage/`, mêmes documents de `contenu/`. Rien n'est écrit à la main.
 */
function mondeNeuf(referentiel: ReferentielMonde): EtatMonde {
  return {
    carte: carteInitiale(
      referentiel.regions,
      referentiel.parallele,
      compagnonParRegion(referentiel.compagnons)
    ),
    gobi: gobiInitial(referentiel.stades),
    compagnons: compagnonsDuProfil(referentiel.compagnons, new Map()),
    campement: referentiel.campement.objets.map((objet) => ({
      code: objet.code,
      libelle: objet.libelle,
      asset: objet.asset,
      region: objet.region,
      placeLe: null
    }))
  };
}

// ─────────────────────────────────────────────────────────────────────────────── le contenu

/**
 * Indexe tous les documents JSON d'un dossier PAR LEUR CHAMP `id`.
 *
 * Et non par leur nom de fichier : le nœud `clairiere-01` cite l'exercice
 * `clairiere-ecole-01`, qui vit dans `contenu/exercices/clairiere/ecole-01.json`. Deviner le
 * chemin depuis l'identifiant marchait sur les deux premiers essais et échouait sur les seize
 * autres — mesuré, ENOENT à l'appui. Le dépôt de contenu réel indexe par identifiant ; on fait
 * pareil, et on ne devine rien.
 */
function indexerParId(dossier: string): ReadonlyMap<string, unknown> {
  const table = new Map<string, unknown>();
  const parcourir = (relatif: string): void => {
    for (const entree of readdirSync(join(RACINE_DEPOT, relatif))) {
      const chemin = `${relatif}/${entree}`;
      if (statSync(join(RACINE_DEPOT, chemin)).isDirectory()) {
        parcourir(chemin);
        continue;
      }
      if (!entree.endsWith('.json')) continue;
      const document = lireJson<{ id?: unknown }>(chemin);
      const id = document.id;
      if (typeof id === 'string') table.set(id, document);
    }
  };
  parcourir(dossier);
  return table;
}

// ───────────────────────────────────────────────────────────────────────── état du double

export interface ReponseDouble {
  readonly statut: number;
  readonly corps: string;
  readonly typeContenu: string;
}

export interface JournalDuDouble {
  /** Chaque chemin appelé, dans l'ordre, avec sa méthode. */
  readonly appels: readonly string[];
  /** Les appels qu'aucun gestionnaire n'a reconnus. Non vide ⇒ le double sous-sert. */
  readonly appelsSansGestionnaire: readonly string[];
}

type Gestionnaire = (contexte: {
  readonly chemin: string;
  readonly methode: string;
  readonly parametres: readonly string[];
  readonly corps: unknown;
}) => ReponseDouble;

function json(valeur: unknown, statut = 200): ReponseDouble {
  return { statut, corps: JSON.stringify(valeur), typeContenu: 'application/json' };
}

/**
 * Compile un motif (`/api/profils/:id/monde`, `/api/contenu/assets/*`) en expression
 * régulière. `:nom` capture un segment, `*` capture le reste.
 */
function compilerMotif(motif: string): RegExp {
  const corps = motif
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) return '([^/]+)';
      if (segment === '*') return '(.*)';
      return segment.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    })
    .join('/');
  return new RegExp(`^${corps}$`, 'u');
}

export interface DoubleDeReseau {
  /** Le `fetch` à poser sur `globalThis`. */
  readonly fetch: typeof fetch;
  /** Le journal, lu après coup. */
  journal(): JournalDuDouble;
  /** Les motifs de `CHEMINS_API.motifs` qu'aucun gestionnaire ne sert. */
  motifsSansGestionnaire(): readonly string[];
  /** Remet le journal à zéro entre deux explorations. */
  oublier(): void;
}

/**
 * Construit le double. Tout l'état (profils créés, réglages écrits, code parent posé) vit dans
 * la fermeture : deux doubles ne se voient pas, et un test ne pollue pas le suivant.
 */
export function creerDoubleDeReseau(): DoubleDeReseau {
  const referentiel = lireReferentiel();
  const noeuds = indexerParId('contenu/noeuds');
  const exercices = indexerParId('contenu/exercices');
  /**
   * `exercice → nœud qui le joue`, DÉRIVÉ de `contenu/noeuds/`, jamais écrit à la main —
   * même principe que `noeuds`/`exercices` juste au-dessus.
   *
   * Comble la lacune signalée par le lot V1 (`Docs/…`, repro citée) et mesurée par l'agent QA
   * avant de rendre ce fichier : `parentGalerie` ne posait aucune clé `noeud` sur ses entrées de
   * catalogue, alors que `EntreeGalerie.noeud` est ce que `FicheExercice` lit pour activer
   * « Lancer cet exercice » (R30). Sans elle, la tuile restait inerte dans TOUT double de test
   * — y compris pour la galerie existante — et `visite-parent → noeud` ne pouvait jamais être
   * emprunté par l'explorateur. Le vrai serveur le publie déjà ; ce double se met à jour.
   */
  const noeudParExercice = new Map<string, string>();
  for (const [idNoeud, brut] of noeuds) {
    const idExercice = String((brut as { exercice?: unknown }).exercice ?? '');
    if (idExercice !== '' && !noeudParExercice.has(idExercice)) {
      noeudParExercice.set(idExercice, idNoeud);
    }
  }
  const habillages = indexerParId('contenu/habillages');
  const monde = mondeNeuf(referentiel);

  const appels: string[] = [];
  const sansGestionnaire: string[] = [];

  /** Les profils. Un seul au départ : l'explorateur doit trouver un chemin de jeu immédiat. */
  let compteurProfil = 0;
  const nouveauProfil = (prenom: string): Profil => {
    compteurProfil += 1;
    return {
      id: `profil-${String(compteurProfil)}`,
      prenom,
      avatar: {
        peau: '#e8c49a',
        cheveux: '#3b2a1a',
        yeux: '#4a6b3a',
        coiffure: 'courte-ebouriffee',
        morphologie: '7-ans'
      },
      paletteVariante: 'clairiere',
      creeLe: MAINTENANT,
      dernierAccesLe: MAINTENANT
    } as Profil;
  };
  const profils: Profil[] = [nouveauProfil('Nino')];

  let reglages: ReglagesLecture = REGLAGES_PAR_DEFAUT;
  /** Le code du foyer. `null` = jamais posé : c'est l'état d'une installation neuve. */
  let codeParent: string | null = null;

  const gestionnaires: Readonly<Record<string, Gestionnaire>> = {
    sante: () => json({ statut: 'ok', version: 'double', maintenant: MAINTENANT, base: 'ouverte' }),

    profils: ({ methode, corps }) => {
      if (methode === 'POST') {
        const prenom = String((corps as { prenom?: unknown } | null)?.prenom ?? 'Sans nom');
        const profil = nouveauProfil(prenom);
        profils.push(profil);
        return json(profil, 201);
      }
      return json(profils);
    },

    profil: ({ parametres }) => {
      const trouve = profils.find((candidat) => String(candidat.id) === parametres[0]);
      return trouve === undefined ? json({ message: 'inconnu' }, 404) : json(trouve);
    },

    // Un profil NEUF : aucune ligne de progression. C'est l'état où toutes les prises de la
    // carte doivent rester utilisables, et celui où le défaut n° 1 du père s'est produit.
    progression: () => json([]),

    noeud: ({ parametres }) => {
      const noeud = noeuds.get(String(parametres[0]));
      if (noeud === undefined) {
        return json({ message: `nœud inconnu : ${String(parametres[0])}` }, 404);
      }
      const idExercice = String((noeud as { exercice: unknown }).exercice);
      const exercice = exercices.get(idExercice) as { jeu?: { habillage?: unknown } } | undefined;
      if (exercice === undefined) {
        return json({ message: `exercice inconnu : ${idExercice}` }, 404);
      }
      const idHabillage = String(exercice.jeu?.habillage ?? '');
      const habillage = habillages.get(idHabillage);
      if (habillage === undefined) {
        return json({ message: `habillage inconnu : ${idHabillage}` }, 404);
      }
      return json({ noeud, exercice, habillage });
    },

    asset: ({ parametres }) => {
      const relatif = decodeURIComponent(String(parametres[0]));
      try {
        const texte = readFileSync(join(RACINE_CONTENU, relatif), 'utf8');
        return {
          statut: 200,
          corps: texte,
          typeContenu: relatif.endsWith('.json') ? 'application/json' : 'image/svg+xml'
        };
      } catch {
        return json({ message: `asset absent : ${relatif}` }, 404);
      }
    },

    tentatives: ({ corps }) => {
      const envoi = (corps ?? {}) as { noeud?: unknown; etoiles?: unknown };
      const tentative = {
        id: 'tnt-double',
        profil: String(profils[0]?.id ?? 'profil-1'),
        noeud: String(envoi.noeud ?? 'clairiere-01'),
        etoiles: Number(envoi.etoiles ?? 3),
        demarreLe: MAINTENANT,
        termineLe: MAINTENANT
      };
      return json({
        tentative,
        deja: false,
        progression: {
          noeud: tentative.noeud,
          etoiles: tentative.etoiles,
          nbTentatives: 1,
          dernierLe: MAINTENANT
        }
      });
    },

    reglages: ({ methode, corps }) => {
      if (methode === 'PUT') {
        reglages = { ...reglages, ...(corps as Partial<ReglagesLecture>) };
      }
      return json(reglages);
    },

    // `null` est une réponse LÉGITIME du contrat : aucun essai typographique en cours.
    essaiTypographie: () => json(null),
    maitrise: () => json([]),
    revisions: () => json([]),

    sortie: () => {
      const premiere = referentiel.regions[0];
      return json({
        profil: String(profils[0]?.id ?? 'profil-1'),
        region: String(premiere?.code ?? 'clairiere'),
        compagnon: null,
        etapes: (premiere?.noeuds ?? []).map((noeud, rang) => ({
          rang: rang + 1,
          noeud: String(noeud),
          motif: 'progression'
        })),
        composeeLe: MAINTENANT
      });
    },

    monde: () => json(monde),
    campement: () => json(monde),

    ouvertureProfil: ({ methode }) =>
      methode === 'POST' ? json({ ...OUVERTURE_JAMAIS_VUE, vue: true }) : json(OUVERTURE_JAMAIS_VUE),

    audioManifeste: () => json(MANIFESTE_VIDE),

    parentEtat: () =>
      json({ codeDefini: codeParent !== null, verrouilleJusqua: null, nbEchecs: 0 }),

    parentDefinir: ({ corps }) => {
      if (codeParent !== null) {
        return json({ message: 'un code existe déjà' }, 409);
      }
      codeParent = String((corps as { code?: unknown } | null)?.code ?? '');
      return json({ jeton: 'jeton-double', expireLe: MAINTENANT });
    },

    parentOuvrir: ({ corps }) => {
      const propose = String((corps as { code?: unknown } | null)?.code ?? '');
      if (codeParent === null || propose !== codeParent) {
        return json({ message: 'code refusé' }, 401);
      }
      return json({ jeton: 'jeton-double', expireLe: MAINTENANT });
    },

    parentDashboard: () =>
      json({
        latences: [],
        confusions: [],
        couverture: [],
        relecture: [],
        confusionsEcartees: 0
      }),

    /**
     * Le catalogue RÉEL, construit depuis les 18 exercices du disque par la fonction du
     * domaine. La première version rendait `{ entrees: [], moteurs: [], competences: [] }` —
     * une forme inventée : `GalerieExercices` lisait alors `moteursParCompetence` indéfini et
     * l'onglet « Les exercices » du dashboard ne rendait plus AUCUN `data-ecran`.
     * L'explorateur l'a signalé comme « écran sans issue », ce qui était exact — et le défaut
     * était dans ce fichier-ci. C'est la meilleure preuve que le garde fonctionne, et la
     * raison pour laquelle on ne fabrique plus une seule forme à la main.
     */
    parentGalerie: () =>
      json(
        construireCatalogue(
          [...exercices.entries()].map(([id, brut]) => {
            const exercice = brut as {
              titre?: unknown;
              competences?: unknown;
              jeu?: { moteur?: unknown; habillage?: unknown };
            };
            return {
              exercice: id,
              titre: String(exercice.titre ?? id),
              moteur: String(exercice.jeu?.moteur ?? 'colorie'),
              habillage: String(exercice.jeu?.habillage ?? ''),
              competences: (exercice.competences as readonly string[] | undefined) ?? [],
              statut: 'valide',
              // MESURE, PUIS CORRIGÉ — voir l'en-tête de `noeudParExercice` plus haut dans ce
              // fichier. `?? null` et non un accès direct : `EntreeGalerie.noeud` est typé
              // `IdNoeud | null`, jamais `undefined`, et un exercice orphelin (aucun nœud ne le
              // joue) doit rendre EXACTEMENT l'état que le vrai serveur rendrait — la fiche le
              // dit au parent au lieu de le laisser deviner (`FicheExercice`, R30).
              noeud: noeudParExercice.get(id) ?? null,
              region: String(id.split('-')[0] ?? ''),
              chemin: `contenu/exercices/${id}.json`
            };
          }) as never
        )
      ),

    parentExport: () => ({ statut: 200, corps: '﻿colonne\n', typeContenu: 'text/csv' }),

    parentRelecture: ({ corps }) =>
      json({
        exercice: 'double',
        statut: String((corps as { statut?: unknown } | null)?.statut ?? 'valide'),
        decideLe: MAINTENANT
      }),

    parentEtatProfil: ({ parametres }) => {
      const profil = profils.find((candidat) => String(candidat.id) === parametres[0]) ?? profils[0];
      return json({
        profil: String(profil?.id ?? 'profil-1'),
        prenom: String(profil?.prenom ?? 'Nino'),
        creeLe: MAINTENANT,
        dernierAccesLe: MAINTENANT,
        noeudsTermines: 0,
        noeudsLivres: noeuds.size,
        etoilesObtenues: 0,
        etoilesPossibles: noeuds.size * 3,
        nbTentatives: 0,
        nbEtapes: 0,
        regions: [],
        dernieresTentatives: [],
        stadeGobi: null,
        nbFormesGobi: 0,
        nbCompagnons: 0,
        nbObjetsCampement: 0,
        nbItemsLeitner: 0,
        nbRegionsIncoherentes: 0
      });
    },

    parentReinitialiser: () =>
      json({ portee: 'progression', lignes: [], confirmationDemandee: true }),

    /**
     * R29 — la suppression d'un compte.
     *
     * Le double rend TOUJOURS la forme de l'APERÇU, jamais celle d'une suppression effectuée :
     * l'exploration ouvre les panneaux et tape ce qu'elle trouve, et une réponse de suppression
     * ferait disparaître le profil sur lequel tout le reste du modèle s'appuie.
     *
     * Cette entrée a été ajoutée parce que le modèle l'a EXIGÉE — sortie citée :
     *
     *     DELETE /api/parent/profil-1 (motif parentSupprimerProfil non servi)
     *
     * Le garde « aucun appel réseau non servi » a vu la route neuve tout seul, sans qu'aucune
     * liste écrite à la main n'ait à être tenue à jour. C'est la forme qui ne pourrit pas.
     */
    parentSupprimerProfil: () => json({ profil: 'profil-1', prenom: 'Alma', lignes: [] })
  };

  /** Les motifs compilés, dans l'ordre du plus long au plus court : le plus spécifique gagne. */
  const routes = Object.entries(CHEMINS_API.motifs)
    .map(([nom, motif]) => ({ nom, motif: String(motif), expression: compilerMotif(String(motif)) }))
    .sort((a, b) => b.motif.split('/').length - a.motif.split('/').length);

  /**
   * Les clips de voix (`/api/audio/*`). Cette route n'est PAS dans `CHEMINS_API.motifs` —
   * mesuré : `grep -n "audio" partage/src/api/contrats.ts` ne rend que `audioManifeste`.
   * Elle est servie ici parce que le client l'appelle vraiment (`voix-fichier`), et elle est
   * déclarée à part pour que le garde « aucune route inventée » reste exact.
   */
  const MOTIF_CLIP_AUDIO = compilerMotif('/api/audio/*');

  const repondre = (chemin: string, methode: string, corps: unknown): ReponseDouble => {
    const sansRequete = chemin.split('?')[0] ?? chemin;
    for (const route of routes) {
      const trouve = route.expression.exec(sansRequete);
      if (trouve === null) continue;
      const gestionnaire = gestionnaires[route.nom];
      if (gestionnaire === undefined) {
        sansGestionnaire.push(`${methode} ${sansRequete} (motif ${route.nom} non servi)`);
        return json({ message: 'motif sans gestionnaire' }, 501);
      }
      return gestionnaire({ chemin: sansRequete, methode, parametres: trouve.slice(1), corps });
    }
    if (MOTIF_CLIP_AUDIO.test(sansRequete)) {
      // Aucun clip n'est livré au double : 404 est la réponse RÉELLE d'une installation où
      // `npm run voix` n'a jamais tourné, et D42 masque alors les boutons. Rien n'est masqué.
      return json({ message: 'aucun clip' }, 404);
    }
    sansGestionnaire.push(`${methode} ${sansRequete}`);
    return json({ message: 'chemin inconnu du double' }, 404);
  };

  const fetchDouble = ((entree: unknown, options?: RequestInit): Promise<Response> => {
    const brut = typeof entree === 'string' ? entree : String((entree as { url?: unknown })?.url ?? entree);
    const chemin = brut.startsWith('http') ? new URL(brut).pathname + new URL(brut).search : brut;
    const methode = String(options?.method ?? 'GET').toUpperCase();
    appels.push(`${methode} ${chemin}`);

    let corps: unknown = null;
    if (typeof options?.body === 'string') {
      try {
        corps = JSON.parse(options.body);
      } catch {
        corps = options.body;
      }
    }

    // Une exception d'un gestionnaire ne doit JAMAIS remonter dans le client : elle sortirait
    // en « unhandled rejection » et l'explorateur imputerait à l'application un défaut du
    // double. Elle est enregistrée — donc elle fait échouer le lot — et rendue en 500.
    let reponse: ReponseDouble;
    try {
      reponse = repondre(chemin, methode, corps);
    } catch (cause) {
      sansGestionnaire.push(`${methode} ${chemin} — le double a levé : ${String(cause)}`);
      reponse = json({ message: 'le double a levé' }, 500);
    }
    return Promise.resolve(
      new Response(reponse.corps, {
        status: reponse.statut,
        headers: { 'Content-Type': reponse.typeContenu }
      })
    );
  }) as typeof fetch;

  return {
    fetch: fetchDouble,
    journal: () => ({ appels: [...appels], appelsSansGestionnaire: [...sansGestionnaire] }),
    motifsSansGestionnaire: () =>
      Object.keys(CHEMINS_API.motifs)
        .filter((nom) => gestionnaires[nom] === undefined)
        .sort(),
    oublier: () => {
      appels.length = 0;
      sansGestionnaire.length = 0;
    }
  };
}
