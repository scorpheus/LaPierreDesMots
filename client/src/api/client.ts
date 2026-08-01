// Client HTTP typé — contrat technique v1 § 1.4 et § 3.3 (les 7 routes).
//
// Aucun cache maison : TanStack Query s'en charge au-dessus. Ce module ne fait que parler
// `fetch` et rendre des types du contrat.
import { CHEMINS_API } from '@pierre/partage';
import type {
  CreationProfil,
  Exercice,
  Habillage,
  IdNoeud,
  IdProfil,
  Noeud,
  Profil,
  ProgressionNoeud,
  ReponseSante,
  ReponseTentative,
  TentativeAEnregistrer
} from '@pierre/partage';

// ------------------------------------------------------------------ adaptation de contrat
//
// Le contrat § 11.1 exporte `CHEMINS_API` mais ne donne NULLE PART sa forme (ni ses clés, ni
// si ses entrées sont des chaînes ou des fabriques). Les chemins littéraux de § 3.3, eux, sont
// normatifs. On lit donc `CHEMINS_API` quand on l'y retrouve, et on retombe sur le chemin
// gelé sinon : le client fonctionne quelle que soit la forme retenue par L-B, et un seul
// fichier est à reprendre si elle diffère. Défaut signalé au rapport du lot L-D.
const cheminsPartages = CHEMINS_API as unknown as Readonly<Record<string, unknown>>;

function chemin(cle: string, repli: string, ...arguments_: readonly string[]): string {
  const valeur: unknown = cheminsPartages[cle];
  if (typeof valeur === 'string' && valeur.startsWith('/')) {
    return valeur;
  }
  if (typeof valeur === 'function') {
    const rendu: unknown = (valeur as (...a: readonly string[]) => unknown)(...arguments_);
    if (typeof rendu === 'string' && rendu.startsWith('/')) {
      return rendu;
    }
  }
  return repli;
}

/**
 * Forme ATTENDUE de `PaquetNoeud` (§ 11.1 en gèle le nom, pas les champs). C'est le seul
 * assemblage cohérent avec `GET /api/contenu/noeuds/:id` de § 3.3 : le nœud, son exercice,
 * et l'habillage que l'exercice déclare.
 */
export interface PaquetNoeudAttendu {
  readonly noeud: Noeud;
  readonly exercice: Exercice;
  readonly habillage: Habillage;
}

// ------------------------------------------------------------------ transport

export class ErreurReseau extends Error {
  readonly statut: number;
  readonly chemin: string;

  constructor(statut: number, cheminAppele: string, message: string) {
    super(message);
    this.name = 'ErreurReseau';
    this.statut = statut;
    this.chemin = cheminAppele;
  }
}

async function demander<T>(cheminAppele: string, options?: RequestInit): Promise<T> {
  const reponse = await fetch(cheminAppele, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers
    }
  });

  if (!reponse.ok) {
    // `ErreurApi` (§ 3.3) transporte un message lisible ; on ne dépend d'aucun de ses champs,
    // seulement du texte, pour ne pas coupler le client à une forme non gelée.
    const texte = await reponse.text().catch(() => '');
    throw new ErreurReseau(
      reponse.status,
      cheminAppele,
      `Réponse ${String(reponse.status)} sur ${cheminAppele}${texte === '' ? '' : ` — ${texte}`}`
    );
  }

  return (await reponse.json()) as T;
}

// ------------------------------------------------------------------ les 7 routes

export function lireSante(): Promise<ReponseSante> {
  return demander<ReponseSante>(chemin('sante', '/api/sante'));
}

export function listerProfils(): Promise<readonly Profil[]> {
  return demander<readonly Profil[]>(chemin('profils', '/api/profils'));
}

export function creerProfil(creation: CreationProfil): Promise<Profil> {
  return demander<Profil>(chemin('profils', '/api/profils'), {
    method: 'POST',
    body: JSON.stringify(creation)
  });
}

export function lireProfil(id: IdProfil): Promise<Profil> {
  return demander<Profil>(chemin('profil', `/api/profils/${String(id)}`, String(id)));
}

export function lireProgression(id: IdProfil): Promise<readonly ProgressionNoeud[]> {
  return demander<readonly ProgressionNoeud[]>(
    chemin('progression', `/api/profils/${String(id)}/progression`, String(id))
  );
}

export function lirePaquetNoeud(id: IdNoeud): Promise<PaquetNoeudAttendu> {
  return demander<PaquetNoeudAttendu>(
    chemin('noeud', `/api/contenu/noeuds/${String(id)}`, String(id))
  );
}

export function enregistrerTentative(
  tentative: TentativeAEnregistrer
): Promise<ReponseTentative> {
  return demander<ReponseTentative>(chemin('tentatives', '/api/tentatives'), {
    method: 'POST',
    body: JSON.stringify(tentative)
  });
}

/** URL d'un asset de `contenu/` (SVG, audio). Ce n'est pas une route JSON (§ 3.3). */
export function urlAsset(cheminRelatif: string): string {
  return `/api/contenu/assets/${cheminRelatif.replace(/^\/+/u, '')}`;
}

// ------------------------------------------------------------------ clé d'idempotence
//
// `cle_idempotence = sha256(profil_id | noeud_id | demarre_le | graine)`, calculée par le
// client (§ 6.3). ATTENTION : `crypto.subtle` n'existe QUE dans un contexte sécurisé, et le
// jeu est servi en HTTP clair sur le LAN quand mkcert n'a pas été installé (CLAUDE.md).
// Le repli ci-dessous est donc atteint en usage réel : il n'est pas décoratif. Il reste
// purement déterministe — une même tentative rejouée depuis un même appareil produit la même
// clé, ce qui est exactement la propriété dont dépend l'idempotence du POST.

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
