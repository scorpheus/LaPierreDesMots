/**
 * Le campement — R11, v2 § 3.4. Lot L2-F, contrat des features v2 § 4.5.
 *
 * « Hub central, à la Adibou » : la tente, le feu, la carte, le coffre, le mur des noms, le
 * chaudron, la lunette, **et une trentaine d'objets de décor sans autre fonction que de réagir
 * quand on les touche**. Cette dernière phrase est une EXIGENCE de recette (R11), pas une
 * intention : elle se mesure.
 */

import { ErreurPierre } from '../erreurs.js';
import type { CheminAsset, CodeRegion } from '../identifiants.js';
import type {
  AuditCampement, CodeObjetCampement, CodeReaction, PointInteraction,
} from './types.js';

/** R11, en données : les trois seuils. Déclarés ici parce qu'ils sont une EXIGENCE, pas un réglage. */
export const R11_POINTS_MIN = 25;
export const R11_ANIMATIONS_UNIQUES_MIN = 10;
export const R11_REPLIQUES_MIN = 6;

/** Un objet DÉCLARÉ au référentiel : sans date de dépôt, qui est propre au profil. */
export interface ObjetDeclare {
  readonly code: CodeObjetCampement;
  readonly libelle: string;
  readonly asset: CheminAsset;
  readonly region: CodeRegion;
}

/** Le contenu de `contenu/monde/campement.json`. */
export interface DocumentCampement {
  readonly scene: { readonly fichier: CheminAsset; readonly viewBox: string };
  readonly points: readonly PointInteraction[];
  readonly objets: readonly ObjetDeclare[];
}

const REACTIONS: readonly CodeReaction[] = ['animation', 'replique', 'son', 'aucune'];

function objet(valeur: unknown, quoi: string): Readonly<Record<string, unknown>> {
  if (typeof valeur !== 'object' || valeur === null) {
    throw new ErreurPierre('contenu-invalide', `${quoi} n’est pas un objet.`);
  }
  return valeur as Readonly<Record<string, unknown>>;
}

function zoneDe(valeur: unknown, id: string): readonly [number, number, number, number] {
  if (!Array.isArray(valeur) || valeur.length !== 4 || valeur.some((n) => !Number.isFinite(n))) {
    throw new ErreurPierre(
      'contenu-invalide',
      `Point « ${id} » : la zone doit être une boîte de quatre nombres [x, y, largeur, hauteur].`
    );
  }
  return [Number(valeur[0]), Number(valeur[1]), Number(valeur[2]), Number(valeur[3])];
}

/**
 * Lit les points d'interaction du document, et **refuse plutôt que d'émettre du faux** (C4).
 *
 * Un document sans `points` lève : rendre une liste vide ferait passer l'audit R11 pour un
 * simple « pas encore » alors qu'il s'agit d'un fichier cassé.
 */
export function pointsDuDocument(document: unknown): readonly PointInteraction[] {
  const liste = objet(document, 'Le document du campement')['points'];
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurPierre(
      'contenu-invalide',
      'Le document du campement ne déclare aucun point d’interaction (R11).'
    );
  }

  return liste.map((entree, index) => {
    const champs = objet(entree, `Le point ${String(index)}`);
    const id = String(champs['id'] ?? '');
    if (id === '') {
      throw new ErreurPierre('contenu-invalide', `Le point ${String(index)} n’a pas d’identifiant.`);
    }
    const reaction = String(champs['reaction'] ?? 'aucune');
    if (!REACTIONS.includes(reaction as CodeReaction)) {
      throw new ErreurPierre('contenu-invalide', `Point « ${id} » : réaction inconnue « ${reaction} ».`);
    }
    const replique = champs['replique'];
    return {
      id,
      libelle: String(champs['libelle'] ?? id),
      reaction: reaction as CodeReaction,
      animationUnique: champs['animationUnique'] === true,
      replique: typeof replique === 'string' && replique !== '' ? (replique as CheminAsset) : null,
      zone: zoneDe(champs['zone'], id)
    };
  });
}

/** Lit les objets rapportés que le campement sait accueillir. */
export function objetsDuDocument(document: unknown): readonly ObjetDeclare[] {
  const liste = objet(document, 'Le document du campement')['objets'];
  if (!Array.isArray(liste)) {
    return [];
  }
  return liste.map((entree, index) => {
    const champs = objet(entree, `L’objet ${String(index)}`);
    return {
      code: String(champs['code'] ?? ''),
      libelle: String(champs['libelle'] ?? ''),
      asset: String(champs['asset'] ?? '') as CheminAsset,
      region: String(champs['region'] ?? '') as CodeRegion
    };
  });
}

/** Le chemin du SVG de décor déclaré par le document. */
export function sceneDuDocument(document: unknown): DocumentCampement['scene'] {
  const scene = objet(objet(document, 'Le document du campement')['scene'], 'La scène du campement');
  return {
    fichier: String(scene['fichier'] ?? '') as CheminAsset,
    viewBox: String(scene['viewBox'] ?? '0 0 1200 800')
  };
}

/** Le document entier, lu et validé d'un bloc. */
export function campementDuDocument(document: unknown): DocumentCampement {
  return {
    scene: sceneDuDocument(document),
    points: pointsDuDocument(document),
    objets: objetsDuDocument(document)
  };
}

/**
 * **R11 mesurée, jamais affirmée.** `test:contenu` et `tests/unitaires/campement-audit.test.ts`
 * appellent cette fonction sur `contenu/monde/campement.json` réel et échouent si
 * `conforme` est faux. « Un décor où le clic ne fait rien est un décor raté » (v2 § 2).
 *
 * Trois décisions de comptage, et chacune existe pour empêcher un audit creux :
 *
 * 1. **Les points sont comptés par identifiant DISTINCT.** Deux lignes homonymes ne font qu'un
 *    point à l'écran ; les compter deux fois gonflerait le chiffre sans rien ajouter au jeu.
 * 2. **Une animation « unique » ne compte que si le point réagit.** `animationUnique` sur un
 *    point dont la réaction est `aucune` est une contradiction dans les données — exactement le
 *    défaut « un détecteur qui déclare un poids qu'il n'applique jamais ».
 * 3. **Les répliques sont comptées par CLIP distinct.** Six points qui rejouent le même clip
 *    ne font pas six répliques : R11 demande six choses différentes à entendre.
 */
export function auditerCampement(points: readonly PointInteraction[]): AuditCampement {
  const identifiants = new Set<string>();
  const reagissants = new Map<string, PointInteraction>();
  for (const point of points) {
    if (identifiants.has(point.id)) {
      continue;
    }
    identifiants.add(point.id);
    reagissants.set(point.id, point);
  }

  const distincts = [...reagissants.values()];
  const nbPoints = distincts.length;
  const nbAnimationsUniques = distincts.filter(
    (point) => point.animationUnique && point.reaction !== 'aucune'
  ).length;
  const nbRepliques = new Set(
    distincts
      .filter((point) => point.replique !== null)
      .map((point) => String(point.replique))
  ).size;

  const manques: string[] = [];
  if (nbPoints < R11_POINTS_MIN) {
    manques.push(
      `R11 : ${String(nbPoints)} point(s) d’interaction sur ${String(R11_POINTS_MIN)} exigés.`
    );
  }
  if (nbAnimationsUniques < R11_ANIMATIONS_UNIQUES_MIN) {
    manques.push(
      `R11 : ${String(nbAnimationsUniques)} animation(s) unique(s) sur ` +
        `${String(R11_ANIMATIONS_UNIQUES_MIN)} exigées.`
    );
  }
  if (nbRepliques < R11_REPLIQUES_MIN) {
    manques.push(
      `R11 : ${String(nbRepliques)} réplique(s) distincte(s) sur ` +
        `${String(R11_REPLIQUES_MIN)} exigées.`
    );
  }

  return {
    nbPoints,
    nbAnimationsUniques,
    nbRepliques,
    conforme: manques.length === 0,
    manques
  };
}
