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

import { CHEMINS_API, calculerEtoiles, creerAlea } from '@pierre/partage';
import type { Profil } from '@pierre/partage';
import { analyserInstantaneLecture } from '@pierre/partage/reprise-lecture';
import type { InstantaneRepriseLecture } from '@pierre/partage/reprise-lecture';
import { appliquerGestePont, CATALOGUE_MATHS, creerProjetPremiereTraversee, genererPont, validerPont } from '@pierre/partage/mathematiques';
import type { BilanParentMaths, EtatMaths, InstancePont, NiveauMaths, ProjetMathsEnCours, RepriseMaths, TentativeMaths } from '@pierre/partage/mathematiques';
import type { CreerPartieMaths, CreerProjetMaths, EcrirePreferenceNiveauMaths, EcritureMaths, ManipulerPartieMaths, TerminerPartieMaths } from '@pierre/partage/mathematiques';
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
  readonly recherche: URLSearchParams;
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
  const reprisesLecture = new Map<string, InstantaneRepriseLecture>();

  const profilConnu = (id: string): Profil | undefined =>
    profils.find((profil) => String(profil.id) === id);
  const erreurLecture = (code: string, statut: number): ReponseDouble => json({ code, message: code }, statut);

  /** Le double conserve les mêmes révisions et générations que le dépôt de reprise réel. */
  const repriseLecture: Gestionnaire = ({ methode, parametres, corps }) => {
    const id = String(parametres[0]);
    const profil = profilConnu(id);
    if (!profil) return erreurLecture('profil-introuvable', 404);
    const generation = profil.generationProgression ?? 0;
    const ancienne = reprisesLecture.get(id);
    if (methode === 'GET') return json(ancienne ?? null);
    if (methode !== 'POST' || typeof corps !== 'object' || corps === null) {
      return erreurLecture('instantane-corrompu', 400);
    }
    const demande = corps as { instantane?: unknown; revisionAttendue?: unknown };
    let instantane: InstantaneRepriseLecture;
    try { instantane = analyserInstantaneLecture(demande.instantane); }
    catch { return erreurLecture('instantane-corrompu', 400); }
    if (instantane.profil !== id || instantane.generationProgression !== generation) {
      return erreurLecture('generation-perimee', 409);
    }
    const attendue = demande.revisionAttendue;
    if (!(attendue === null || (typeof attendue === 'number' && Number.isSafeInteger(attendue) && attendue >= 0)) ||
        instantane.revision !== (attendue ?? 0)) return erreurLecture('revision-conflictuelle', 409);
    if (ancienne !== undefined) {
      if (ancienne.generationProgression !== generation) return erreurLecture('generation-perimee', 409);
      const contenu = (valeur: InstantaneRepriseLecture): string => JSON.stringify({ ...valeur, revision: 0 });
      if (contenu(ancienne) === contenu(instantane)) return json({ revision: ancienne.revision });
      if (attendue !== ancienne.revision) return erreurLecture('revision-conflictuelle', 409);
      reprisesLecture.set(id, { ...instantane, revision: ancienne.revision + 1 });
      return json({ revision: ancienne.revision + 1 });
    }
    if (attendue !== null) return erreurLecture('revision-conflictuelle', 409);
    reprisesLecture.set(id, { ...instantane, revision: 1 });
    return json({ revision: 1 });
  };

  const effacerRepriseLecture: Gestionnaire = ({ parametres, corps }) => {
    const id = String(parametres[0]);
    const profil = profilConnu(id);
    if (!profil) return erreurLecture('profil-introuvable', 404);
    const demande = corps as { generationProgression?: unknown; revisionAttendue?: unknown } | null;
    if (demande?.generationProgression !== (profil.generationProgression ?? 0)) {
      return erreurLecture('generation-perimee', 409);
    }
    const ancienne = reprisesLecture.get(id);
    if (ancienne !== undefined && demande?.revisionAttendue !== ancienne.revision) {
      return erreurLecture('revision-conflictuelle', 409);
    }
    reprisesLecture.delete(id);
    return json(null);
  };

  type CarnetDouble = { etat: EtatMaths; reprises: Map<string, RepriseMaths>; commandes: Map<string, unknown> };
  const carnets = new Map<string, CarnetDouble>();
  let numeroPartie = 0;
  const carnet = (profilId: string): CarnetDouble | null => {
    const profil = profilConnu(profilId);
    if (!profil) return null;
    let courant = carnets.get(profilId);
    if (!courant) {
      courant = { etat: {
        generationMaths: profil.generationMaths ?? 0, reprise: null, projetSuspendu: null,
        preferencesNiveaux: Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
          [famille.id, { niveau: 'decouverte', revision: 0 }])) as EtatMaths['preferencesNiveaux'],
        progression: [], projets: [], recompenses: [], tentatives: [],
      }, reprises: new Map(), commandes: new Map() };
      carnets.set(profilId, courant);
    }
    return courant;
  };
  const erreurMaths = (code: 'absente' | 'conflit' | 'requete-invalide', statut: number): ReponseDouble =>
    json({ ok: false, erreur: { code, message: code } }, statut);
  const succesMaths = (valeur: unknown): ReponseDouble => json({ ok: true, valeur });
  const commandeCourante = (corps: unknown): { demande: EcritureMaths; carnet: CarnetDouble; reprise: RepriseMaths } | ReponseDouble => {
    const demande = corps as EcritureMaths | null;
    if (!demande || typeof demande.profilId !== 'string' || typeof demande.instanceId !== 'string' ||
        typeof demande.cleGeste !== 'string') return erreurMaths('requete-invalide', 400);
    const courant = carnet(demande.profilId);
    if (!courant) return erreurMaths('absente', 404);
    if (demande.generationMaths !== courant.etat.generationMaths) return erreurMaths('conflit', 409);
    const reprise = courant.reprises.get(demande.instanceId);
    if (!reprise) return erreurMaths('absente', 404);
    if (demande.revisionAttendue !== reprise.revision) return erreurMaths('conflit', 409);
    return { demande, carnet: courant, reprise };
  };
  const estReponseDouble = (valeur: unknown): valeur is ReponseDouble =>
    typeof valeur === 'object' && valeur !== null && 'statut' in valeur;
  const memoriserReprise = (courant: CarnetDouble, reprise: RepriseMaths, suspendue = false): void => {
    courant.reprises.set(reprise.instance.id, reprise);
    courant.etat = { ...courant.etat,
      reprise: suspendue ? null : reprise,
      projetSuspendu: suspendue && reprise.projet !== null ? reprise : null,
    };
  };
  const creerReprise = (profilId: string, generationMaths: number, instance: InstancePont,
    projet: ProjetMathsEnCours | null): RepriseMaths => ({
    profilId, generationMaths, revision: 0, instance, etat: instance.etatInitial,
    erreursValidees: 0, aide: 'aucune', projet, signaturesRecentes: { [instance.famille]: [instance.signature] },
  });

  const mathematiquesEtat: Gestionnaire = ({ recherche }) => {
    const courant = carnet(recherche.get('profilId') ?? '');
    return courant ? succesMaths(courant.etat) : erreurMaths('absente', 404);
  };
  const mathematiquesNiveaux: Gestionnaire = ({ methode, corps }) => {
    if (methode !== 'PUT') return erreurMaths('requete-invalide', 400);
    const demande = corps as EcrirePreferenceNiveauMaths | null;
    if (!demande || typeof demande.profilId !== 'string' || typeof demande.cleGeste !== 'string') {
      return erreurMaths('requete-invalide', 400);
    }
    const courant = carnet(demande.profilId);
    if (!courant) return erreurMaths('absente', 404);
    if (demande.generationMaths !== courant.etat.generationMaths) return erreurMaths('conflit', 409);
    const deja = courant.commandes.get(demande.cleGeste);
    if (deja) return succesMaths(deja);
    const avant = courant.etat.preferencesNiveaux[demande.famille];
    if (!avant || !['decouverte', 'exploration', 'defi'].includes(demande.niveau) ||
        demande.revisionAttendue !== avant.revision) return erreurMaths('conflit', 409);
    const apres = { niveau: demande.niveau, revision: avant.revision + 1 };
    courant.etat = { ...courant.etat, preferencesNiveaux: {
      ...courant.etat.preferencesNiveaux, [demande.famille]: apres,
    } };
    courant.commandes.set(demande.cleGeste, apres);
    return succesMaths(apres);
  };
  const mathematiquesPartie: Gestionnaire = ({ parametres, recherche }) => {
    const courant = carnet(recherche.get('profilId') ?? '');
    const reprise = courant?.reprises.get(String(parametres[0]));
    return reprise ? succesMaths(reprise) : erreurMaths('absente', 404);
  };
  const mathematiquesParties: Gestionnaire = ({ corps }) => {
    const demande = corps as CreerPartieMaths | null;
    if (!demande || typeof demande.profilId !== 'string') return erreurMaths('requete-invalide', 400);
    const courant = carnet(demande.profilId);
    if (!courant) return erreurMaths('absente', 404);
    if (demande.generationMaths !== courant.etat.generationMaths) return erreurMaths('conflit', 409);
    const deja = courant.commandes.get(demande.cleGeste);
    if (deja) return succesMaths({ ...(deja as object), deja: true });
    let instance: InstancePont;
    try {
      instance = genererPont(demande.famille as InstancePont['famille'], demande.niveau,
        creerAlea(demande.graine));
    } catch { return erreurMaths('requete-invalide', 400); }
    numeroPartie += 1;
    instance = { ...instance, id: `mat-double-${String(numeroPartie)}` };
    const reprise = creerReprise(demande.profilId, demande.generationMaths, instance, null);
    memoriserReprise(courant, reprise);
    const resultat = { deja: false, reprise };
    courant.commandes.set(demande.cleGeste, resultat);
    return succesMaths(resultat);
  };
  const mathematiquesProjets: Gestionnaire = ({ corps }) => {
    const demande = corps as CreerProjetMaths | null;
    if (!demande || typeof demande.profilId !== 'string' || demande.projetId !== 'MAT-PON-P01') {
      return erreurMaths('requete-invalide', 400);
    }
    const courant = carnet(demande.profilId);
    if (!courant) return erreurMaths('absente', 404);
    if (demande.generationMaths !== courant.etat.generationMaths) return erreurMaths('conflit', 409);
    const deja = courant.commandes.get(demande.cleGeste);
    if (deja) return succesMaths({ ...(deja as object), deja: true });
    numeroPartie += 1;
    const sessionId = `prj-double-${String(numeroPartie)}`;
    let projet: ReturnType<typeof creerProjetPremiereTraversee>;
    try {
      projet = creerProjetPremiereTraversee(demande.niveaux as readonly [NiveauMaths, NiveauMaths, NiveauMaths],
        creerAlea(demande.graine), sessionId);
    } catch { return erreurMaths('requete-invalide', 400); }
    const commun: ProjetMathsEnCours = {
      id: projet.id, sessionId, version: projet.version, variables: projet.variables,
      plan: projet.plan, transformationId: projet.transformationId, cadeauId: projet.cadeauId,
      cadeauType: projet.cadeauType, etapeCourante: 0,
      instances: projet.plan.map((etape) => etape.instanceId), etoilesEtapes: [], suspendu: false,
    };
    for (const [rang, instance] of projet.etapes.entries()) {
      courant.reprises.set(instance.id, creerReprise(demande.profilId, demande.generationMaths,
        instance, { ...commun, suspendu: rang !== 0 }));
    }
    const reprise = courant.reprises.get(projet.etapes[0].id)!;
    memoriserReprise(courant, reprise);
    const resultat = { deja: false, sessionId, reprise };
    courant.commandes.set(demande.cleGeste, resultat);
    return succesMaths(resultat);
  };
  const mathematiquesActions: Gestionnaire = ({ parametres, corps }) => {
    const preparation = commandeCourante(corps);
    if (estReponseDouble(preparation)) return preparation;
    const { demande, carnet: courant, reprise } = preparation;
    if (demande.instanceId !== parametres[0]) return erreurMaths('requete-invalide', 400);
    const geste = (corps as ManipulerPartieMaths).geste;
    if (!geste || typeof geste !== 'object') return erreurMaths('requete-invalide', 400);
    const aide = geste.type === 'aide'
      ? (geste.niveau === 'demonstration' || reprise.aide === 'demonstration' ? 'demonstration' : 'indice')
      : reprise.aide;
    const suivante: RepriseMaths = { ...reprise, revision: reprise.revision + 1, aide,
      etat: appliquerGestePont(reprise.instance as InstancePont, reprise.etat, geste),
      projet: reprise.projet === null ? null : { ...reprise.projet, suspendu: false },
    };
    memoriserReprise(courant, suivante);
    return succesMaths({ deja: false, reprise: suivante });
  };
  const mathematiquesPause: Gestionnaire = ({ parametres, corps }) => {
    const preparation = commandeCourante(corps);
    if (estReponseDouble(preparation)) return preparation;
    const { demande, carnet: courant, reprise } = preparation;
    if (demande.instanceId !== parametres[0]) return erreurMaths('requete-invalide', 400);
    const suivante: RepriseMaths = { ...reprise, revision: reprise.revision + 1,
      projet: reprise.projet === null ? null : { ...reprise.projet, suspendu: true },
    };
    memoriserReprise(courant, suivante, true);
    return succesMaths({ deja: false, reprise: suivante });
  };
  const mathematiquesTerminer: Gestionnaire = ({ parametres, corps }) => {
    const preparation = commandeCourante(corps);
    if (estReponseDouble(preparation)) return preparation;
    const { demande, carnet: courant, reprise } = preparation;
    if (demande.instanceId !== parametres[0] ||
        (corps as TerminerPartieMaths).reponse?.famille !== reprise.instance.famille) {
      return erreurMaths('requete-invalide', 400);
    }
    const validation = validerPont(reprise.instance as InstancePont, reprise.etat);
    const erreurs = reprise.erreursValidees + (validation.statut === 'incorrecte' ? 1 : 0);
    let suivante: RepriseMaths = { ...reprise, revision: reprise.revision + 1, erreursValidees: erreurs,
      projet: reprise.projet === null ? null : { ...reprise.projet, suspendu: false },
    };
    let tentative: TentativeMaths | null = null;
    let prochaineReprise: RepriseMaths | null = null;
    if (validation.statut === 'correcte') {
      const etoiles = calculerEtoiles({ reussi: true, nbErreurs: erreurs,
        aideUtilisee: reprise.aide, dureeMs: 0, etapes: [] }) as 1 | 2 | 3;
      tentative = {
        id: `tma-double-${String(courant.etat.tentatives.length + 1)}`,
        instanceId: reprise.instance.id, famille: reprise.instance.famille,
        niveau: reprise.instance.niveau, projetId: reprise.instance.projet?.projetId ?? null,
        erreursValidees: erreurs, aide: reprise.aide, solution: validation.solution,
        etoiles, notions: [], contexte: reprise.instance.projet?.variables ?? {},
      };
      if (suivante.projet !== null) {
        suivante = { ...suivante, projet: { ...suivante.projet,
          etapeCourante: suivante.projet.etapeCourante + 1,
          etoilesEtapes: [...suivante.projet.etoilesEtapes, etoiles],
        } };
        const prochaine = suivante.projet.plan[suivante.projet.etapeCourante];
        if (prochaine) {
          const brute = courant.reprises.get(prochaine.instanceId)!;
          prochaineReprise = { ...brute, projet: { ...suivante.projet, suspendu: false } };
          courant.reprises.set(prochaine.instanceId, prochaineReprise);
        }
      }
      const tentatives = [...courant.etat.tentatives, tentative];
      let projets = courant.etat.projets;
      let recompenses = courant.etat.recompenses;
      if (suivante.projet) {
        const etapesTerminees = suivante.projet.etapeCourante;
        projets = [{ projetId: suivante.projet.id, etapesTerminees,
          nombreEtapes: suivante.projet.plan.length, transformationId: suivante.projet.transformationId,
          termineLe: etapesTerminees === suivante.projet.plan.length ? MAINTENANT : null }];
        if (etapesTerminees === suivante.projet.plan.length && suivante.projet.cadeauId &&
            !recompenses.some((cadeau) => cadeau.projetId === suivante.projet!.id)) {
          recompenses = [...recompenses, { projetId: suivante.projet.id,
            cadeauId: suivante.projet.cadeauId, categorie: 'souvenir' as const, attribueLe: MAINTENANT }];
        }
      }
      courant.etat = { ...courant.etat, tentatives, projets, recompenses };
    }
    courant.reprises.set(reprise.instance.id, suivante);
    courant.etat = { ...courant.etat, reprise: prochaineReprise ?? (validation.statut === 'correcte' ? null : suivante),
      projetSuspendu: null };
    return succesMaths({ deja: false, reprise: suivante, validation, tentative,
      recompenses: courant.etat.recompenses, prochaineReprise });
  };
  const parentMathematiques: Gestionnaire = ({ parametres }) => {
    const courant = carnet(String(parametres[0]));
    if (!courant) return erreurMaths('absente', 404);
    const groupes = new Map<string, {
      famille: TentativeMaths['famille']; niveau: NiveauMaths; occasions: number;
      reussites: number; erreurs: number; aides: number; seul: boolean;
    }>();
    const groupe = (famille: TentativeMaths['famille'], niveau: NiveauMaths) => {
      const cle = `${famille}|${niveau}`;
      let valeur = groupes.get(cle);
      if (!valeur) {
        valeur = { famille, niveau, occasions: 0, reussites: 0, erreurs: 0, aides: 0, seul: false };
        groupes.set(cle, valeur);
      }
      return valeur;
    };
    for (const tentative of courant.etat.tentatives) {
      const valeur = groupe(tentative.famille, tentative.niveau);
      valeur.occasions += 1;
      valeur.reussites += 1;
      valeur.erreurs += tentative.erreursValidees;
      valeur.aides += tentative.aide === 'aucune' ? 0 : 1;
      valeur.seul ||= tentative.aide === 'aucune';
    }
    for (const reprise of courant.reprises.values()) {
      if (courant.etat.tentatives.some((t) => t.instanceId === reprise.instance.id) || reprise.revision === 0) continue;
      const valeur = groupe(reprise.instance.famille, reprise.instance.niveau);
      valeur.occasions += 1;
      valeur.erreurs += reprise.erreursValidees;
      valeur.aides += reprise.aide === 'aucune' ? 0 : 1;
    }
    const bilan: BilanParentMaths[] = [...groupes.values()].map((valeur) => ({
      famille: valeur.famille, niveau: valeur.niveau,
      statut: valeur.seul ? 'reussi-seul' : valeur.reussites > 0 ? 'reussi-avec-aide' : 'essaye',
      occasions: valeur.occasions, reussites: valeur.reussites,
      erreursValidees: valeur.erreurs, aides: valeur.aides, notions: [],
    }));
    return succesMaths(bilan);
  };

  const gestionnaires: Readonly<Record<string, Gestionnaire>> = {
    sante: () => json({ statut: 'ok', version: 'double', maintenant: MAINTENANT, base: 'ouverte' }),
    repriseLecture,
    repriseLectureEffacer: effacerRepriseLecture,
    mathematiquesEtat,
    mathematiquesNiveaux,
    mathematiquesPartie,
    mathematiquesParties,
    mathematiquesProjets,
    mathematiquesActions,
    mathematiquesPause,
    mathematiquesTerminer,
    parentMathematiques,

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
    // Geste gratuit (lot Q1, R11/R31) : le double ne fait rien d'autre que confirmer, comme
    // la vraie route (`noterVisitePoint`, `serveur/src/depots/monde.ts`) qui répond 204.
    campementPointVisite: () => json(null, 204),

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
    const recherche = new URLSearchParams(chemin.split('?')[1] ?? '');
    for (const route of routes) {
      const trouve = route.expression.exec(sansRequete);
      if (trouve === null) continue;
      const gestionnaire = gestionnaires[route.nom];
      if (gestionnaire === undefined) {
        sansGestionnaire.push(`${methode} ${sansRequete} (motif ${route.nom} non servi)`);
        return json({ message: 'motif sans gestionnaire' }, 501);
      }
      return gestionnaire({ chemin: sansRequete, methode, parametres: trouve.slice(1), corps, recherche });
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
