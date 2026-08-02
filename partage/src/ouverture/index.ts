/**
 * Sous-chemin `@pierre/partage/ouverture` — lot N4, contrat de finition v3 § 4.4.
 *
 * Convention C1 : le barillet racine n'accueille que des TYPES. Tout ce qui est une valeur —
 * la lecture du document, les chemins de route — passe par ce sous-chemin.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM, aucune lecture disque.
 * C'est l'appelant qui apporte le document déjà analysé, exactement comme
 * `campementDuDocument` dans `monde/campement.ts` — le serveur le lit sur disque, les tests le
 * lisent sur disque, le client le reçoit du réseau, et la validation est la même pour les trois.
 */

import type {
  CodeTableauOuverture,
  EtatOuverture,
  SequenceOuverture,
  TableauOuverture,
} from './types.js';

export type {
  CodeTableauOuverture,
  EtatOuverture,
  SequenceOuverture,
  TableauOuverture,
} from './types.js';

/**
 * Les cinq tableaux, DANS L'ORDRE DU RÉCIT. Cet ordre est le récit : il ne se réarrange pas.
 *
 * On perd le sens en le cassant — « ce qui n'a plus de nom perd ses couleurs » ne veut rien
 * dire avant que la Pierre ne se soit brisée, et « viens » ne veut rien dire avant qu'on
 * sache qui attend.
 */
export const ORDRE_TABLEAUX: readonly CodeTableauOuverture[] = [
  'pierre',
  'grisaille',
  'noms',
  'habitants',
  'appel',
];

/**
 * D35, point 3 : « passable au tap dès la première seconde ».
 *
 * Zéro, et le mot « dès » est pris au pied de la lettre : la prise de sortie est dans le DOM
 * au premier rendu, pas après un délai de grâce. Un enfant de sept ans qui touche l'écran et
 * ne voit rien bouger conclut que l'application est cassée.
 */
export const PASSABLE_DES_MS = 0;

/** Les deux routes de la séquence — contrat v3 § 8. Une seule écriture, deux lecteurs. */
export const CHEMINS_OUVERTURE = {
  /** Forme construite, pour `fetch`. */
  pour: (profil: string): string => `/api/profils/${encodeURIComponent(profil)}/ouverture`,
  /** Forme paramétrée, pour Fastify. */
  motif: '/api/profils/:id/ouverture',
} as const;

function texte(valeur: unknown, champ: string): string {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    return manquant(champ);
  }
  return valeur;
}

function entier(valeur: unknown, champ: string): number {
  if (typeof valeur !== 'number' || !Number.isInteger(valeur)) {
    return manquant(champ);
  }
  return valeur;
}

function manquant(champ: string): never {
  throw new Error(`Séquence d'ouverture invalide : « ${champ} » est absent ou mal typé.`);
}

/**
 * Lit `contenu/monde/ouverture.json`. **Aucun repli silencieux** : un document incomplet lève.
 *
 * Le motif est celui de `chargerReferentielMonde` : « un monde à moitié chargé afficherait une
 * carte à trois régions sans que personne ne s'en aperçoive ». Une ouverture à trois tableaux
 * raconterait une histoire qui s'arrête avant que l'enfant n'apprenne qu'il peut agir — c'est
 * précisément le défaut que D35 corrige, réintroduit par la porte de derrière.
 */
export function sequenceDuDocument(document: unknown): SequenceOuverture {
  if (typeof document !== 'object' || document === null) {
    return manquant('document');
  }
  const brut = document as Record<string, unknown>;

  const bruts = brut['tableaux'];
  if (!Array.isArray(bruts)) {
    return manquant('tableaux');
  }

  const tableaux: readonly TableauOuverture[] = bruts.map((entree, rang): TableauOuverture => {
    if (typeof entree !== 'object' || entree === null) {
      return manquant(`tableaux[${String(rang)}]`);
    }
    const champs = entree as Record<string, unknown>;
    const code = texte(champs['code'], `tableaux[${String(rang)}].code`);
    if (!ORDRE_TABLEAUX.includes(code as CodeTableauOuverture)) {
      return manquant(`tableaux[${String(rang)}].code (« ${code} » n'est pas un tableau connu)`);
    }
    return {
      code: code as CodeTableauOuverture,
      texte: texte(champs['texte'], `tableaux[${String(rang)}].texte`),
      cleAudio: texte(champs['cleAudio'], `tableaux[${String(rang)}].cleAudio`),
      dureeMs: entier(champs['dureeMs'], `tableaux[${String(rang)}].dureeMs`),
      asset: texte(champs['asset'], `tableaux[${String(rang)}].asset`),
    };
  });

  const codes = tableaux.map((tableau) => tableau.code);
  if (codes.join('|') !== ORDRE_TABLEAUX.join('|')) {
    return manquant(
      `l'ordre du récit (attendu ${ORDRE_TABLEAUX.join(', ')} ; lu ${codes.join(', ')})`
    );
  }

  const passableDesMs = entier(brut['passableDesMs'], 'passableDesMs');
  if (passableDesMs !== PASSABLE_DES_MS) {
    return manquant(
      `passableDesMs (D35 exige ${String(PASSABLE_DES_MS)} ; lu ${String(passableDesMs)})`
    );
  }

  return { tableaux, passableDesMs };
}

/** L'état de départ : rien vu, rien passé, aucun rejeu. Un profil neuf n'a pas de ligne en base. */
export const OUVERTURE_JAMAIS_VUE: EtatOuverture = { vue: false, passee: false, nbRejeux: 0 };

/**
 * Faut-il jouer la séquence toute seule à ce profil ?
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * L'ARBITRAGE QUI RÉCONCILIE D35 ET D46 — tranché par N4, consigné dans questions-en-attente
 *
 * D35 veut que le récit soit vu ; D46 interdit tout écran intermédiaire obligatoire. Les deux
 * sont vrais et ils se contredisent si on les applique bêtement.
 *
 * La sortie : la séquence se déclenche seule **uniquement sur le chemin de la CARTE**, et
 * jamais sur le chemin direct vers un nœud. Un enfant qui a cinq minutes tape sa pastille de
 * sortie et joue — un tap, comme D46 l'exige, dès le tout premier lancement. Un enfant qui va
 * regarder son monde voit le récit qui donne son sens au gris, une fois dans sa vie, et il en
 * sort d'un seul tap.
 *
 * `destination` est donc le paramètre qui porte tout l'arbitrage, et il est explicite pour que
 * la règle se relise dans le code au lieu de se déduire d'un enchaînement de `if`.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */
export function ouvertureAJouerSeule(
  etat: EtatOuverture,
  destination: 'carte' | 'noeud' | 'autre',
): boolean {
  return destination === 'carte' && !etat.vue;
}
