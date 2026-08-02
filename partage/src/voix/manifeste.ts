/**
 * Le manifeste des voix — la SEULE source de vérité sur l'existence d'un clip.
 *
 * « Rien n'est synthétisé à l'exécution » (CLAUDE.md) : les clips sont des artefacts de build.
 * Tout ce fichier est PUR — aucune horloge, aucun aléa, aucun DOM, aucun `node:*`. Il entre
 * dans le bundle client, et la convention C1 du contrat des features v2 (« budget 250 Ko
 * gzip ») interdit qu'il traîne une dépendance derrière lui. C'est aussi pourquoi
 * `empreinteTexte` est un CHAMP et jamais une fonction : le SHA-256 se calcule au build, dans
 * `scripts/rendre-voix.mjs`, où `node:crypto` est disponible sans coûter un octet au client.
 *
 * POURQUOI LE MANIFESTE ET PAS LE CHAMP `audio` DES EXERCICES : D42 masque le bouton quand
 * aucun audio n'existe, donc l'application doit répondre à « ce texte a-t-il un clip ? » AVANT
 * de rendre quoi que ce soit. Un champ `audio` dans l'exercice obligerait N2 à réécrire les
 * fichiers d'exercices — dont N1 et N8 sont propriétaires. Le manifeste évite le second
 * écrivain, et il reste la seule chose que le contrôle qualité met à jour.
 */

import type { CheminAsset, Horodatage } from '../identifiants.js';

/**
 * Les SEPT locuteurs (D41). Aucun enregistrement familial ; tout est synthétique.
 *
 * `'enfant'` est RETIRÉ de l'union v1 : D41 écarte l'enregistrement familial, et une voix
 * d'enfant synthétique ne sert aucune consigne. Les quatre compagnons entrent, parce que ce
 * sont eux qui parlent en région (`CodeCompagnon`, `pedagogie/types.ts`).
 */
export type Locuteur =
  | 'narrateur'
  | 'gobi'
  | 'maitresse'
  | 'filou'
  | 'bulle'
  | 'roc'
  | 'plume';

/**
 * Les sept locuteurs énumérés en VALEUR, pour que le rendu et les tests parcourent la même
 * liste que le type. Un huitième locuteur ajouté au type sans l'être ici ne compilerait pas :
 * `LOCUTEURS` est déclaré `readonly Locuteur[]` et `estLocuteur` sert de garde à l'exécution.
 *
 * Cette constante est la seule VALEUR de ce fichier avec `SEUIL_QC`. Deux tableaux de sept
 * chaînes ne pèsent rien ; ils évitent que le script de rendu et le client divergent sur
 * « qui peut parler ».
 */
export const LOCUTEURS: readonly Locuteur[] = [
  'narrateur',
  'gobi',
  'maitresse',
  'filou',
  'bulle',
  'roc',
  'plume',
];

/**
 * La clé d'un clip, stable et lisible : `<idExercice>/<idConsigne>` pour une consigne,
 * `campement/<idPoint>` pour une réplique, `ouverture/<codeTableau>` pour un tableau.
 * Elle ne contient jamais le locuteur ni le rendu : ceux-ci sont des variantes de la MÊME clé.
 */
export type CleAudio = string;

/**
 * Le rendu demandé. `syllabe` est celui de D33/R15 sur les mots cibles, et le contrat de
 * sortie de N2 l'exige pour **chaque mot cible**, pas seulement pour la consigne entière.
 */
export type RenduVoix = 'normal' | 'syllabe' | 'lent';

/** Le rendu servi quand l'appelant n'en demande aucun : celui du bouton « écouter ». */
export const RENDU_PAR_DEFAUT: RenduVoix = 'normal';

export interface ClipVoix {
  readonly cle: CleAudio;
  readonly rendu: RenduVoix;
  readonly locuteur: Locuteur;
  /** Le texte source, tel qu'il est écrit à l'écran (apostrophes typographiques comprises). */
  readonly texte: string;
  /** Relatif à `contenu/`, ex. `audio/clairiere/ecole-01-c1.opus`. */
  readonly fichier: CheminAsset;
  readonly dureeMs: number;
  readonly octets: number;
  /** SHA-256 du texte source. Un texte modifié rend le clip périmé, mécaniquement. */
  readonly empreinteTexte: string;
  /**
   * Similarité de la transcription inverse (faster-whisper `large-v3`, `fr`), 0 à 1.
   * Sous `SEUIL_QC`, le clip N'ENTRE PAS au manifeste : un clip inintelligible est pire
   * qu'un bouton absent (D42).
   */
  readonly qcScore: number;
}

export interface ManifesteVoix {
  readonly version: number;
  readonly genereLe: Horodatage;
  /** Ex. `piper/fr_FR-siwis-medium`. Consigné pour la reproductibilité. */
  readonly moteurTts: string;
  readonly clips: readonly ClipVoix[];
}

export const SEUIL_QC = 0.85;

/**
 * Le manifeste d'une installation où `npm run voix` n'a jamais tourné.
 *
 * Il n'est pas une commodité : c'est l'atténuation du risque n° 1 du contrat v3 § 11. Un
 * manifeste vide est un manifeste VALIDE — `aUnAudio` rend `false`, D42 masque le bouton, et
 * le comportement est exactement celui du dépôt d'avant N2. Les lots de vague 2 peuvent donc
 * démarrer sans attendre le premier octet d'audio.
 */
export const MANIFESTE_VIDE: ManifesteVoix = {
  version: 1,
  genereLe: '1970-01-01T00:00:00.000Z',
  moteurTts: 'aucun',
  clips: [],
};

/**
 * Le clip d'une clé, pour un rendu donné.
 *
 * Aucun repli d'un rendu sur un autre, et c'est délibéré : servir le clip `normal` à qui
 * demande `syllabe` rendrait la relecture syllabée du palier `indice` indistinguable de la
 * lecture ordinaire, et l'aide de D16 ne serait plus une aide. L'appelant qui veut un repli
 * l'écrit, visiblement.
 */
export function clipDe(
  manifeste: ManifesteVoix,
  cle: CleAudio,
  rendu: RenduVoix = RENDU_PAR_DEFAUT,
): ClipVoix | null {
  for (const clip of manifeste.clips) {
    if (clip.cle === cle && clip.rendu === rendu) {
      return clip;
    }
  }
  return null;
}

/**
 * LA fonction de D42 : le bouton « écouter » n'est rendu que si elle vaut `true`.
 *
 * Elle interroge le rendu `normal`, celui que le bouton joue. Un texte qui n'aurait que sa
 * variante syllabée ne rendrait pas le bouton — et c'est juste : le bouton ne sait pas jouer
 * cette variante-là, donc il mentirait.
 */
export function aUnAudio(manifeste: ManifesteVoix, cle: CleAudio | null): boolean {
  if (cle === null || cle === '') {
    return false;
  }
  return clipDe(manifeste, cle, RENDU_PAR_DEFAUT) !== null;
}

/** Tous les rendus disponibles pour une clé, dans l'ordre du manifeste. */
export function rendusDe(manifeste: ManifesteVoix, cle: CleAudio): readonly RenduVoix[] {
  const rendus: RenduVoix[] = [];
  for (const clip of manifeste.clips) {
    if (clip.cle === cle && !rendus.includes(clip.rendu)) {
      rendus.push(clip.rendu);
    }
  }
  return rendus;
}

export interface CouvertureAudio {
  readonly total: number;
  readonly couverts: number;
  /** `couverts / total`. **Le contrat de sortie de N2 exige 1.** */
  readonly taux: number;
  readonly manquants: readonly CleAudio[];
}

/**
 * CONTRAT DE SORTIE DE N2, sous forme de fonction.
 *
 * `cles` est la liste des OBJETS qui doivent porter un audio — énumérée par
 * `scripts/recenser-textes.mjs` depuis les exercices, le campement et l'ouverture — et non
 * la liste des occurrences du mot `audio`. Auditer une propriété, c'est énumérer les objets
 * qui devraient la porter.
 *
 * `total` vaut le nombre de clés DISTINCTES : deux consignes identiques dans deux exercices
 * portent deux clés, mais la même clé recensée deux fois ne compte qu'une fois. Un taux
 * gonflé par des doublons dirait « 100 % » sur la moitié du travail.
 *
 * Le cas `total === 0` rend `taux: 1`. Ce n'est pas une complaisance : un recensement vide
 * signifie qu'aucun objet n'a été trouvé, et c'est `recenser-textes.mjs` qui refuse alors
 * d'écrire (convention C6). Faire rendre `0` ici ferait échouer le contrat de sortie pour une
 * raison — « rien à couvrir » — qui n'est pas celle qu'il mesure.
 */
export function couvertureConsignes(
  manifeste: ManifesteVoix,
  cles: readonly CleAudio[],
): CouvertureAudio {
  const distinctes: CleAudio[] = [];
  for (const cle of cles) {
    if (!distinctes.includes(cle)) {
      distinctes.push(cle);
    }
  }

  const manquants = distinctes.filter((cle) => !aUnAudio(manifeste, cle));
  const total = distinctes.length;
  const couverts = total - manquants.length;

  return {
    total,
    couverts,
    taux: total === 0 ? 1 : couverts / total,
    manquants,
  };
}

/**
 * Lecture défensive d'un manifeste venu du réseau ou du disque.
 *
 * Elle ne LÈVE jamais : un manifeste illisible doit rendre le jeu muet, pas noir. Un clip mal
 * formé est ÉCARTÉ individuellement plutôt que de faire tomber les autres — la panne reste
 * proportionnelle à sa cause.
 *
 * Le filtre sur `SEUIL_QC` est répété ici alors que `rendre-voix.mjs` l'applique déjà. Ce
 * n'est pas un doublon inutile : le script est un artefact de build qu'un jour quelqu'un
 * relancera avec un seuil desserré, et cette ligne-ci est celle qui protège l'oreille de
 * l'enfant à l'exécution.
 */
export function lireManifeste(brut: unknown): ManifesteVoix {
  if (typeof brut !== 'object' || brut === null) {
    return MANIFESTE_VIDE;
  }
  const racine = brut as Record<string, unknown>;
  const clipsBruts = racine['clips'];
  if (!Array.isArray(clipsBruts)) {
    return MANIFESTE_VIDE;
  }

  const clips: ClipVoix[] = [];
  for (const candidat of clipsBruts as readonly unknown[]) {
    const clip = lireClip(candidat);
    if (clip !== null && clip.qcScore >= SEUIL_QC) {
      clips.push(clip);
    }
  }

  return {
    version: typeof racine['version'] === 'number' ? racine['version'] : 1,
    genereLe:
      typeof racine['genereLe'] === 'string' ? racine['genereLe'] : MANIFESTE_VIDE.genereLe,
    moteurTts: typeof racine['moteurTts'] === 'string' ? racine['moteurTts'] : 'inconnu',
    clips,
  };
}

/** Garde de type sur les sept locuteurs. Utilisée par `lireClip` et par le script de rendu. */
export function estLocuteur(valeur: unknown): valeur is Locuteur {
  return typeof valeur === 'string' && (LOCUTEURS as readonly string[]).includes(valeur);
}

function estRendu(valeur: unknown): valeur is RenduVoix {
  return valeur === 'normal' || valeur === 'syllabe' || valeur === 'lent';
}

function lireClip(brut: unknown): ClipVoix | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }
  const c = brut as Record<string, unknown>;
  if (typeof c['cle'] !== 'string' || c['cle'] === '') return null;
  if (!estRendu(c['rendu'])) return null;
  if (!estLocuteur(c['locuteur'])) return null;
  if (typeof c['texte'] !== 'string' || c['texte'] === '') return null;
  if (typeof c['fichier'] !== 'string' || c['fichier'] === '') return null;
  if (typeof c['empreinteTexte'] !== 'string') return null;
  if (typeof c['qcScore'] !== 'number' || Number.isNaN(c['qcScore'])) return null;

  return {
    cle: c['cle'],
    rendu: c['rendu'],
    locuteur: c['locuteur'],
    texte: c['texte'],
    fichier: c['fichier'],
    dureeMs: typeof c['dureeMs'] === 'number' ? c['dureeMs'] : 0,
    octets: typeof c['octets'] === 'number' ? c['octets'] : 0,
    empreinteTexte: c['empreinteTexte'],
    qcScore: c['qcScore'],
  };
}
