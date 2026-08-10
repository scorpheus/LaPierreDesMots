// Ce qui est commun aux deux ports (`port-http.ts`, `port-local.ts`) — Lot 4 du portage Android.
// État de session et calculs locaux, aucun des deux ne dépend du réseau ni de la base : ni l'un
// ni l'autre n'a de raison d'être dupliqué entre les deux implémentations.
export type { PaquetNoeudAttendu, DashboardParent } from './contrat.js';

export class ErreurReseau extends Error {
  readonly statut: number;
  readonly chemin: string;
  /** Le corps de l'erreur, quand le serveur en a rendu un lisible. `null` sinon. */
  readonly corps: Readonly<Record<string, unknown>> | null;

  constructor(
    statut: number,
    cheminAppele: string,
    message: string,
    corps: Readonly<Record<string, unknown>> | null = null
  ) {
    super(message);
    this.name = 'ErreurReseau';
    this.statut = statut;
    this.chemin = cheminAppele;
    this.corps = corps;
  }
}

/**
 * Le jeton de la zone parent, posé par `ouvrirZoneParent`/`definirCodeParent`, vivant en
 * mémoire seulement. Partagé par les deux ports : en mode LAN c'est un vrai jeton HTTP (§ en-tête
 * `ENTETE_JETON_PARENT`), en mode autonome un simple marqueur de session — aucun réseau à
 * autoriser, mais le même geste « la zone est ouverte cette session » doit se reconnaître.
 */
let jetonParent: string | null = null;

export function poserJetonParent(jeton: string): void {
  jetonParent = jeton;
}

export function lireJetonParent(): string | null {
  return jetonParent;
}

/** Oublie le jeton : la zone parent se referme. Appelé à la sortie du dashboard. */
export function fermerZoneParent(): void {
  jetonParent = null;
}

export function jetonParentPose(): boolean {
  return jetonParent !== null;
}

// ------------------------------------------------------------------ clé d'idempotence
//
// `cle_idempotence = sha256(profil_id | noeud_id | demarre_le | graine)`. ATTENTION :
// `crypto.subtle` n'existe QUE dans un contexte sécurisé, et le jeu est servi en HTTP clair sur
// le LAN quand mkcert n'a pas été installé (CLAUDE.md). Le repli ci-dessous est donc atteint en
// usage réel : il n'est pas décoratif. Il reste purement déterministe — une même tentative
// rejouée depuis un même appareil produit la même clé, ce qui est exactement la propriété dont
// dépend l'idempotence du POST. En mode autonome, `crypto.subtle` est TOUJOURS disponible (la
// WebView Capacitor n'est pas soumise à la même contrainte de contexte sécurisé que le LAN
// clair) : le repli n'est donc jamais atteint dans ce mode, mais reste correct s'il l'était.

function empreinteDeRepli(source: string): string {
  // Huit accumulateurs FNV-1a 32 bits, décalés par leur rang : 8 × 8 = 64 caractères, soit la
  // même largeur qu'un sha256. Ce n'est PAS une empreinte cryptographique et n'a pas à l'être.
  const mots = new Uint32Array(8);
  for (let rang = 0; rang < 8; rang += 1) {
    let accumulateur = 0x811c9dc5 ^ (rang * 0x9e3779b1);
    for (let index = 0; index < source.length; index += 1) {
      accumulateur ^= source.charCodeAt((index + rang) % source.length);
      accumulateur = Math.imul(accumulateur, 0x01000193) >>> 0;
    }
    mots[rang] = accumulateur >>> 0;
  }
  return Array.from(mots, (mot) => mot.toString(16).padStart(8, '0')).join('');
}

export async function calculerCleIdempotence(
  profilId: string,
  noeudId: string,
  demarreLe: string,
  graine: number
): Promise<string> {
  const source = `${profilId}|${noeudId}|${demarreLe}|${String(graine)}`;
  const sousCouche = globalThis.crypto?.subtle;

  if (sousCouche !== undefined) {
    try {
      const empreinte = await sousCouche.digest('SHA-256', new TextEncoder().encode(source));
      return Array.from(new Uint8Array(empreinte), (octet) =>
        octet.toString(16).padStart(2, '0')
      ).join('');
    } catch (cause) {
      console.warn('[api] `crypto.subtle` indisponible, repli déterministe :', cause);
    }
  }

  return empreinteDeRepli(source);
}
