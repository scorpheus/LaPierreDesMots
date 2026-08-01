/**
 * Le contrat de validation du mode `regions` — clôture du point ouvert O3.
 * Lot L-E. Contrat gelé : contrat-technique-v1.md § 5.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM. Il décide, il ne
 * mute rien. `moteur.ts` s'en sert pour construire l'état suivant.
 *
 * La règle qui commande tout le fichier : **il n'existe aucun chemin d'échec**
 * (v2 § 5.4, R14). Un refus fait que la couleur ne prend pas ; il ne produit ni rouge,
 * ni son négatif, ni écran d'échec, et deux motifs sur quatre ne comptent même pas.
 */

import type { IdRegionSvg } from '../../identifiants.js';
import type { CouleurColoriage } from '../../palette.js';
import type { Habillage, RegionColoriable } from '../types.js';
import type { CibleColorie, ContenuColorie, EtatColorie, MotifRefus } from './types.js';

/** R16 et v2 § 8 : 24 px de tolérance sur toute cible de dépôt. */
export const TOLERANCE_TAP_PX = 24;

/**
 * Seuls deux motifs sur quatre sont des erreurs de lecture.
 *
 * `region-deja-peinte` ne compte pas : c'est le double-tap rapide que l'annexe T § T1
 * demande de ne jamais transformer en double soumission.
 * `aucune-couleur-choisie` ne compte pas non plus : l'enfant n'a rien lu de travers,
 * il n'a pas encore pris son pinceau.
 */
export const REFUS_COMPTE_ERREUR: Readonly<Record<MotifRefus, boolean>> = {
  'region-hors-consigne': true,
  'couleur-fausse': true,
  'region-deja-peinte': false,
  'aucune-couleur-choisie': false
};

export const DELAIS_AIDE: {
  readonly relectureMs: 20_000;
  readonly indiceMs: 45_000;
  readonly demonstrationMs: 30_000;
  readonly erreursAvantIndice: 2;
  readonly erreursAvantDemonstration: 3;
} = {
  relectureMs: 20_000,
  indiceMs: 45_000,
  demonstrationMs: 30_000,
  erreursAvantIndice: 2,
  erreursAvantDemonstration: 3
};

// ------------------------------------------------------------------ visée

/** Toutes les régions déclarées coloriables par l'habillage, dans l'ordre de déclaration. */
export function regionsColoriables(habillage: Habillage): readonly RegionColoriable[] {
  const collectees: RegionColoriable[] = [];
  for (const calque of habillage.scene.calques) {
    if (calque.role !== 'coloriable') continue;
    for (const region of calque.regions) collectees.push(region);
  }
  return collectees;
}

/** Rayon du disque de même aire que la région — approximation de son étendue. */
function rayonEquivalent(region: RegionColoriable): number {
  return Math.sqrt(Math.max(region.surface, 0) / Math.PI);
}

function distance(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Région désignée par un point, exprimé dans les coordonnées `viewBox` de la scène.
 *
 * 1. Si le point tombe dans une région coloriable, c'est elle.
 * 2. Sinon (le doigt est sur le trait, ou entre deux formes), on prend la région dont le
 *    centroïde est le plus proche, à condition d'être sous `tolerance`.
 * 3. Sinon, `null` : le tap est **ignoré**. Pas de refus, pas d'erreur, pas de son.
 *    Un doigt qui glisse hors du dessin ne coûte rien.
 *
 * LIMITE ASSUMÉE — `Habillage` ne transporte QUE le centroïde et la surface de chaque
 * région (contrat § 4.1 `RegionColoriable`), jamais sa géométrie. L'étape 1 ne peut donc
 * pas être un vrai test d'appartenance : elle est approchée par le disque de même aire.
 * En jeu, l'étape 1 exacte est faite par le DOM (le tap atterrit sur le `<path>` et
 * `SceneSvg` lit son `id`) ; cette fonction est le repli quand le doigt tombe sur le
 * trait ou dans un interstice. Départage déterministe : à égalité, l'ordre de
 * déclaration de l'habillage.
 */
export function regionSousLeDoigt(
  habillage: Habillage,
  point: readonly [number, number],
  tolerance?: number
): IdRegionSvg | null {
  const marge = tolerance ?? TOLERANCE_TAP_PX;
  const regions = regionsColoriables(habillage);

  let dedansMeilleure: IdRegionSvg | null = null;
  let dedansScore = Number.POSITIVE_INFINITY;
  let procheMeilleure: IdRegionSvg | null = null;
  let procheDistance = Number.POSITIVE_INFINITY;

  for (const region of regions) {
    const d = distance(point, region.centroide);
    const rayon = rayonEquivalent(region);
    if (rayon > 0 && d <= rayon) {
      // Plus le rapport est petit, plus le point est « au cœur » de la région.
      const score = d / rayon;
      if (score < dedansScore) {
        dedansScore = score;
        dedansMeilleure = region.id;
      }
    }
    if (d < procheDistance) {
      procheDistance = d;
      procheMeilleure = region.id;
    }
  }

  if (dedansMeilleure !== null) return dedansMeilleure;
  if (procheMeilleure !== null && procheDistance <= marge) return procheMeilleure;
  return null;
}

// ------------------------------------------------------------- évaluation

export interface DecisionPeinture {
  readonly acceptee: boolean;
  readonly motif: MotifRefus | null;
  readonly compteErreur: boolean;
  readonly consigneSatisfaite: boolean;
  readonly exerciceTermine: boolean;
}

function refus(motif: MotifRefus): DecisionPeinture {
  return {
    acceptee: false,
    motif,
    compteErreur: REFUS_COMPTE_ERREUR[motif],
    consigneSatisfaite: false,
    exerciceTermine: false
  };
}

/**
 * Cœur de la décision, exprimé sur le seul `EtatColorie`.
 *
 * `Moteur.reduire(etat, action, contexte)` ne reçoit PAS le contenu (contrat § 4.1) :
 * toute la logique doit donc tenir sur l'état. C'est possible parce que
 * `EtatConsigne.ciblesRestantes` porte les couples encore attendus.
 *
 * L'ORDRE DES TESTS EST NORMATIF, et ce n'est pas l'ordre de la table du contrat § 5.5 :
 * `region-deja-peinte` est testé AVANT `region-hors-consigne`. Sans cela, un double-tap
 * sur une région qui vient de satisfaire sa consigne tomberait dans la consigne
 * suivante, serait « hors consigne », et compterait une erreur — exactement la double
 * soumission que l'annexe T § T1 interdit.
 */
export function evaluerPeintureDepuisEtat(
  etat: EtatColorie,
  region: IdRegionSvg,
  couleur: CouleurColoriage | null
): DecisionPeinture {
  // L'exercice est fini : plus rien ne peut être une erreur.
  if (etat.termineMs !== null) return refus('region-deja-peinte');

  if (couleur === null) return refus('aucune-couleur-choisie');

  if (Object.prototype.hasOwnProperty.call(etat.remplissages, region)) {
    return refus('region-deja-peinte');
  }

  const consigne = etat.consignes[etat.indexConsigne];
  if (consigne === undefined) return refus('region-deja-peinte');

  const cible = consigne.ciblesRestantes.find((c: CibleColorie) => c.region === region);
  if (cible === undefined) return refus('region-hors-consigne');
  if (cible.couleur !== couleur) return refus('couleur-fausse');

  const consigneSatisfaite = consigne.ciblesRestantes.length === 1;
  const exerciceTermine = consigneSatisfaite && etat.indexConsigne === etat.consignes.length - 1;

  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    consigneSatisfaite,
    exerciceTermine
  };
}

/**
 * Fonction pure. Ne modifie pas l'état ; `reduire` s'en sert pour le construire.
 *
 * `contenu` sert de garde de cohérence : si l'état et le contenu ne parlent pas de la
 * même consigne, on refuse sans compter d'erreur plutôt que de peindre à tort.
 */
export function evaluerPeinture(
  etat: EtatColorie,
  contenu: ContenuColorie,
  region: IdRegionSvg,
  couleur: CouleurColoriage | null
): DecisionPeinture {
  const attendue = contenu.consignes[etat.indexConsigne];
  const courante = etat.consignes[etat.indexConsigne];
  if (attendue !== undefined && courante !== undefined && attendue.id !== courante.id) {
    return refus('region-deja-peinte');
  }
  return evaluerPeintureDepuisEtat(etat, region, couleur);
}
