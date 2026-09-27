/** Instantané durable d'un nœud de lecture en cours. Aucun geste n'est rejoué à la reprise. */
import type { PaquetNoeud } from '../api/contrats.js';
import { creerAlea } from '../alea.js';
import type { CodeMoteur, IdProfil } from '../identifiants.js';
import type { PlanSortie } from '../pedagogie/types.js';
import type { NombreEtoiles } from '../journal/types.js';
import type { ResumeTentative } from '../moteurs/types.js';

export const VERSION_REPRISE_LECTURE = 1;

export interface InstantaneRepriseLecture {
  readonly versionContrat: typeof VERSION_REPRISE_LECTURE;
  readonly profil: IdProfil;
  readonly generationProgression: number;
  readonly revision: number;
  readonly sortie: PlanSortie | null;
  readonly rangSortie: number | null;
  /** Le paquet complet permet de garder l'ancien contenu après mise à jour. */
  readonly paquet: PaquetNoeud;
  readonly codeMoteur: CodeMoteur;
  readonly versionMoteur: number;
  readonly graine: number;
  readonly etatMoteur: unknown;
  readonly demarreLe: string;
  readonly journalise: boolean;
  readonly serie: number;
  readonly resume: ResumeTentative | null;
  readonly etoiles: NombreEtoiles | null;
  readonly termineLe: string | null;
  readonly tentativeEnvoyee: boolean;
  readonly erreurConservation: string | null;
  /** Instant de la suspension ; tous les horodatages du moteur seront décalés à la reprise. */
  readonly suspenduLeMs: number;
}

/** JSON strict : un Map, Set, Date, cycle ou `undefined` ne doit jamais se vider en `{}`. */
function verifierJson(valeur: unknown, chemin: string, ancetres: Set<object>): void {
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'boolean') return;
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return;
  if (typeof valeur !== 'object') throw new Error(`État non sérialisable : ${chemin}`);
  if (ancetres.has(valeur)) throw new Error(`Cycle dans l'état : ${chemin}`);
  if (Array.isArray(valeur)) {
    if (Object.keys(valeur).length !== valeur.length || Object.getOwnPropertySymbols(valeur).length !== 0) {
      throw new Error(`Tableau non sérialisable : ${chemin}`);
    }
    ancetres.add(valeur);
    valeur.forEach((element, rang) => verifierJson(element, `${chemin}[${String(rang)}]`, ancetres));
    ancetres.delete(valeur);
    return;
  }
  if (Object.getPrototypeOf(valeur) !== Object.prototype && Object.getPrototypeOf(valeur) !== null) {
    throw new Error(`Objet non sérialisable : ${chemin}`);
  }
  if (Object.getOwnPropertySymbols(valeur).length !== 0) {
    throw new Error(`Clé symbolique non sérialisable : ${chemin}`);
  }
  ancetres.add(valeur);
  for (const [cle, descripteur] of Object.entries(Object.getOwnPropertyDescriptors(valeur))) {
    if (!descripteur.enumerable || !('value' in descripteur)) {
      throw new Error(`Propriété non sérialisable : ${chemin}.${cle}`);
    }
    verifierJson(descripteur.value, `${chemin}.${cle}`, ancetres);
  }
  ancetres.delete(valeur);
}

export function encoderEtatLecture(etat: unknown): string {
  verifierJson(etat, 'etat', new Set());
  const json = JSON.stringify(etat);
  if (typeof json !== 'string') throw new Error('État non sérialisable.');
  return json;
}

export function decoderEtatLecture(json: string): unknown {
  const valeur: unknown = JSON.parse(json);
  verifierJson(valeur, 'etat', new Set());
  return valeur;
}

function objet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function entierNaturel(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur >= 0;
}

const CODES_MOTEURS = new Set<CodeMoteur>([
  'assemble', 'attrape', 'chemin', 'chrono', 'colorie', 'eclair', 'grave',
  'histoire', 'libre', 'paires', 'phrase', 'place', 'trace', 'tri',
]);

/** Valide les données reçues d'un port ou relues de SQLite avant tout cast métier. */
export function analyserInstantaneLecture(valeur: unknown): InstantaneRepriseLecture {
  verifierJson(valeur, 'instantane', new Set());
  if (!objet(valeur) || valeur['versionContrat'] !== VERSION_REPRISE_LECTURE ||
      typeof valeur['profil'] !== 'string' || valeur['profil'].length === 0 ||
      !entierNaturel(valeur['generationProgression']) || !entierNaturel(valeur['revision']) ||
      typeof valeur['codeMoteur'] !== 'string' || !CODES_MOTEURS.has(valeur['codeMoteur'] as CodeMoteur) ||
      typeof valeur['versionMoteur'] !== 'number' ||
      !Number.isSafeInteger(valeur['versionMoteur']) || valeur['versionMoteur'] < 1 ||
      !entierNaturel(valeur['graine']) || typeof valeur['demarreLe'] !== 'string' ||
      typeof valeur['journalise'] !== 'boolean' || !entierNaturel(valeur['serie']) ||
      !entierNaturel(valeur['suspenduLeMs']) || typeof valeur['tentativeEnvoyee'] !== 'boolean' ||
      !(valeur['termineLe'] === null || typeof valeur['termineLe'] === 'string') ||
      !(valeur['erreurConservation'] === null || typeof valeur['erreurConservation'] === 'string') ||
      !(valeur['etoiles'] === null || [0, 1, 2, 3].includes(valeur['etoiles'] as number)) ||
      !(valeur['resume'] === null || objet(valeur['resume'])) ||
      !(valeur['rangSortie'] === null ||
        (entierNaturel(valeur['rangSortie']) && valeur['rangSortie'] > 0)) ||
      !(valeur['sortie'] === null || objet(valeur['sortie'])) || !objet(valeur['paquet']) ||
      !objet(valeur['paquet']['noeud']) || !objet(valeur['paquet']['exercice']) ||
      !objet(valeur['paquet']['habillage']) ||
      !objet(valeur['paquet']['exercice']['jeu']) ||
      valeur['paquet']['exercice']['jeu']['moteur'] !== valeur['codeMoteur'] ||
      !entierNaturel(valeur['paquet']['exercice']['version']) ||
      valeur['paquet']['exercice']['version'] === 0 ||
      typeof valeur['paquet']['exercice']['id'] !== 'string' ||
      typeof valeur['paquet']['noeud']['id'] !== 'string' ||
      typeof valeur['paquet']['habillage']['id'] !== 'string' ||
      !objet(valeur['etatMoteur'])) {
    throw new Error('Enveloppe de reprise lecture invalide.');
  }
  const paquet = valeur['paquet'];
  const exercice = paquet['exercice'] as Record<string, unknown>;
  const jeu = exercice['jeu'] as Record<string, unknown>;
  const noeud = paquet['noeud'] as Record<string, unknown>;
  const habillage = paquet['habillage'] as Record<string, unknown>;
  if (!objet(jeu['contenu']) || jeu['habillage'] !== habillage['id'] || jeu['noeud'] !== noeud['id']) {
    throw new Error('Paquet de reprise lecture incohérent.');
  }
  const sortie = valeur['sortie'];
  if (sortie !== null) {
    if (!objet(sortie) || sortie['profil'] !== valeur['profil'] ||
        typeof sortie['region'] !== 'string' ||
        !(sortie['compagnon'] === null || typeof sortie['compagnon'] === 'string') ||
        typeof sortie['composeeLe'] !== 'string' || !Array.isArray(sortie['etapes']) ||
        !sortie['etapes'].every((etape: unknown) => objet(etape) &&
          entierNaturel(etape['rang']) && etape['rang'] > 0 &&
          typeof etape['noeud'] === 'string' && typeof etape['habillage'] === 'string')) {
      throw new Error('Plan de sortie de reprise lecture invalide.');
    }
    if (valeur['rangSortie'] !== null && !sortie['etapes'].some((etape: Record<string, unknown>) =>
      etape['rang'] === valeur['rangSortie'] && etape['noeud'] === noeud['id'])) {
      throw new Error('Rang de sortie incohérent avec le nœud.');
    }
  } else if (valeur['rangSortie'] !== null) {
    throw new Error('Rang de sortie sans plan.');
  }
  return valeur as unknown as InstantaneRepriseLecture;
}

export function decoderInstantaneLecture(json: string): InstantaneRepriseLecture {
  return analyserInstantaneLecture(decoderEtatLecture(json));
}

const INSTANTS_MOTEUR = new Set([
  'demarreMs', 'termineMs', 'debutMs', 'finMs', 'premiereActionMs',
  'derniereActionMs', 'instantIndiceMs', 'instantMs', 'finExpositionMs',
]);

/** Décale uniquement les instants absolus, jamais les durées ni les délais déclarés. */
export function reprendreEtatLecture<T>(etat: T, absenceMs: number): T {
  if (!Number.isFinite(absenceMs) || absenceMs < 0) throw new Error('Durée de pause invalide.');
  const parcourir = (valeur: unknown, cle = ''): unknown => {
    // Le tracé en cours dépend du pointeur et n'est pas une réponse validée.
    if (cle === 'gesteEnCours') return [];
    if (valeur === null || typeof valeur !== 'object') {
      // Les étapes non commencées utilisent `debutMs: 0` comme sentinelle. La décaler
      // ferait compter tout le temps depuis l'époque Unix dans leur résumé.
      if (cle === 'debutMs' && valeur === 0) return 0;
      return typeof valeur === 'number' && INSTANTS_MOTEUR.has(cle) ? valeur + absenceMs : valeur;
    }
    if (Array.isArray(valeur)) return valeur.map((element) => parcourir(element));
    return Object.fromEntries(Object.entries(valeur).map(([nom, element]) => [nom, parcourir(element, nom)]));
  };
  return parcourir(etat) as T;
}

/** Décode puis vérifie les versions avant toute publication dans le magasin. */
export function verifierInstantaneLecture(
  instantane: InstantaneRepriseLecture,
  profil: IdProfil,
  generationProgression: number,
  versionMoteurCourante: number,
): void {
  analyserInstantaneLecture(instantane);
  if (instantane.versionContrat !== VERSION_REPRISE_LECTURE) throw new Error('Contrat de reprise lecture inconnu.');
  if (instantane.profil !== profil || instantane.generationProgression !== generationProgression) {
    throw new Error('La reprise appartient à un autre profil ou à une génération ancienne.');
  }
  if (instantane.versionMoteur !== versionMoteurCourante) {
    throw new Error('Version du moteur de lecture incompatible avec cette reprise.');
  }
  if (instantane.codeMoteur !== instantane.paquet.exercice.jeu.moteur) {
    throw new Error('Le moteur du paquet ne correspond pas à la reprise.');
  }
  encoderEtatLecture(instantane);
}

/**
 * Les deux moteurs dont la version 1 tirait un ordre au montage. Une ancienne reprise éventuelle
 * conserve ses acquis ; l'ordre absent est reconstruit depuis sa graine et son paquet figé.
 * Les versions inconnues restent refusées explicitement.
 */
export function adapterAncienneRepriseLecture(
  instantane: InstantaneRepriseLecture,
): InstantaneRepriseLecture {
  analyserInstantaneLecture(instantane);
  if (instantane.versionMoteur !== 1 ||
      (instantane.codeMoteur !== 'attrape' && instantane.codeMoteur !== 'place')) return instantane;
  if (typeof instantane.etatMoteur !== 'object' || instantane.etatMoteur === null ||
      Array.isArray(instantane.etatMoteur)) throw new Error('Ancien état moteur illisible.');
  const etat = instantane.etatMoteur as Record<string, unknown>;
  const alea = creerAlea(instantane.graine);
  if (instantane.codeMoteur === 'attrape') {
    const cibles = etat['cibles'];
    if (!Array.isArray(cibles) || !cibles.every((cible) =>
      typeof cible === 'object' && cible !== null && typeof (cible as { id?: unknown }).id === 'string')) {
      throw new Error('Catalogue des cibles ancien illisible.');
    }
    const ordreAffichage = alea.melanger([...cibles].sort((gauche, droite) =>
      String(gauche.id).localeCompare(String(droite.id)))).map((cible) => String(cible.id));
    return { ...instantane, versionMoteur: 2, etatMoteur: { ...etat, ordreAffichage } };
  }
  const contenu: unknown = instantane.paquet.exercice.jeu.contenu;
  const reserve = typeof contenu === 'object' && contenu !== null && !Array.isArray(contenu)
    ? (contenu as Record<string, unknown>)['reserve'] : null;
  if (!Array.isArray(reserve)) throw new Error('Ancienne réserve illisible.');
  return { ...instantane, versionMoteur: 2,
    etatMoteur: { ...etat, reserveCatalogue: [...reserve],
      reserveMelangee: alea.melanger(reserve) } };
}
