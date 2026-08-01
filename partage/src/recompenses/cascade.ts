/**
 * La cascade de D25 — logique PURE, contrat des features v2 § 4.1 (lot L2-A).
 *
 * Aucun accès au réseau, à la base, au DOM ni à l'horloge : l'instant est un ARGUMENT. C'est
 * ce qui permet à `tests/unitaires/cascade.test.ts` de prouver la table des trois paliers et
 * les propriétés de monotonie sans monter quoi que ce soit.
 *
 * Le barème d'étoiles n'est PAS réimplanté ici : `calculerEtoiles` (contrat technique v1
 * § 5.7) reste le seul endroit où il vit. Ce fichier consomme un `NombreEtoiles` déjà calculé.
 */

import type { EtatCascade, GainCascade, JaugePalier, RecompenseObtenue, SeuilsCascade } from './types.js';
import type { NombreEtoiles } from '../journal/types.js';
import type { Horodatage } from '../identifiants.js';

/** Un profil qui n'a encore rien joué. Aucun `null` sauf l'horodatage, qui n'existe pas. */
export const ETAT_CASCADE_VIDE: EtatCascade = {
  etoilesTotal: 0,
  etoilesDepuisIntermediaire: 0,
  intermediairesTotal: 0,
  intermediairesDepuisRare: 0,
  raresTotal: 0,
  dernierPalierLe: null,
};

/**
 * Les trois jauges de l'état courant, sans rien appliquer.
 *
 * Lecture uniforme : « combien reste-t-il avant la prochaine récompense de CE palier ».
 * Le champ `restant` est calculé ici, une fois, et jamais laissé à la vue (D25 point 3).
 */
export function jaugesDe(etat: EtatCascade, seuils: SeuilsCascade): readonly JaugePalier[] {
  const requisIntermediaire = Math.max(1, Math.trunc(seuils.etoilesParIntermediaire));
  const requisRare = Math.max(1, Math.trunc(seuils.intermediairesParRare));

  const acquisIntermediaire = Math.min(etat.etoilesDepuisIntermediaire, requisIntermediaire);
  const acquisRare = Math.min(etat.intermediairesDepuisRare, requisRare);

  return [
    // Le palier fréquent : « à chaque réussite, une étoile ». La monnaie est le nœud terminé,
    // et il n'en existe pas de fraction — d'où `acquis = 0`, `requis = 1`. La jauge n'est pas
    // là pour se remplir, elle est là pour dire que la prochaine étoile est à un nœud.
    {
      palier: 'etoile',
      acquis: 0,
      requis: 1,
      restant: 1,
      nature: 'etoile',
    },
    {
      palier: 'intermediaire',
      acquis: acquisIntermediaire,
      requis: requisIntermediaire,
      restant: requisIntermediaire - acquisIntermediaire,
      nature: seuils.natureIntermediaire,
    },
    {
      palier: 'rare',
      acquis: acquisRare,
      requis: requisRare,
      restant: requisRare - acquisRare,
      nature: seuils.natureRare,
    },
  ];
}

/**
 * Applique les étoiles d'un nœud terminé et rend le nouvel état, les paliers franchis et les
 * trois jauges. **Fonction pure** : `etat` n'est jamais muté.
 *
 * Deux invariants opposables, vérifiés par `tests/unitaires/cascade.test.ts` :
 *
 *  1. **Aucun compteur ne décroît jamais** — un acquis n'est jamais repris (R14). Les deux
 *     compteurs « depuis » retombent au franchissement, ce qui est le fonctionnement même
 *     d'une carte de tampons et non une reprise : le tampon, lui, reste acquis.
 *  2. **Un seul appel peut franchir plusieurs paliers** (trois étoiles d'un coup peuvent
 *     compléter le tampon ET l'image) : `paliersFranchis` les porte tous, dans l'ordre.
 *
 * `reference`, `asset` et `region` de `RecompenseObtenue` valent `null` ici, et c'est
 * délibéré : PLACEHOLDER — à valider. Choisir QUELLE forme de Gobi ou QUELLE zone est remise
 * appartient au monde (`@pierre/partage/monde`, lot L2-F), pas à la cascade. La cascade dit
 * *qu'*une récompense est due et de quelle nature ; elle ne la nomme pas. Question consignée
 * dans `Docs/questions-en-attente.md`.
 */
export function appliquerEtoiles(
  etat: EtatCascade,
  etoiles: NombreEtoiles,
  seuils: SeuilsCascade,
  maintenant: Horodatage,
): GainCascade {
  const parIntermediaire = Math.max(1, Math.trunc(seuils.etoilesParIntermediaire));
  const parRare = Math.max(1, Math.trunc(seuils.intermediairesParRare));
  const gagnees = Math.max(0, Math.trunc(etoiles));

  const paliersFranchis: ('etoile' | 'intermediaire' | 'rare')[] = [];
  const recompenses: RecompenseObtenue[] = [];

  let etoilesTotal = etat.etoilesTotal;
  let etoilesDepuisIntermediaire = etat.etoilesDepuisIntermediaire;
  let intermediairesTotal = etat.intermediairesTotal;
  let intermediairesDepuisRare = etat.intermediairesDepuisRare;
  let raresTotal = etat.raresTotal;

  if (gagnees > 0) {
    // Le palier fréquent est franchi une fois par nœud terminé, quel que soit le nombre
    // d'étoiles : c'est « une étoile par exercice réussi », pas « une étoile par point ».
    paliersFranchis.push('etoile');
    recompenses.push({
      palier: 'etoile',
      nature: 'etoile',
      reference: null,
      asset: null,
      region: null,
    });
  }

  etoilesTotal += gagnees;
  etoilesDepuisIntermediaire += gagnees;

  while (etoilesDepuisIntermediaire >= parIntermediaire) {
    etoilesDepuisIntermediaire -= parIntermediaire;
    intermediairesTotal += 1;
    intermediairesDepuisRare += 1;
    paliersFranchis.push('intermediaire');
    recompenses.push({
      palier: 'intermediaire',
      nature: seuils.natureIntermediaire,
      reference: null,
      asset: null,
      region: null,
    });

    if (intermediairesDepuisRare >= parRare) {
      intermediairesDepuisRare -= parRare;
      raresTotal += 1;
      paliersFranchis.push('rare');
      recompenses.push({
        palier: 'rare',
        nature: seuils.natureRare,
        reference: null,
        asset: null,
        region: null,
      });
    }
  }

  const suivant: EtatCascade = {
    etoilesTotal,
    etoilesDepuisIntermediaire,
    intermediairesTotal,
    intermediairesDepuisRare,
    raresTotal,
    // L'horodatage ne bouge que si quelque chose a été franchi : sinon il mentirait.
    dernierPalierLe: paliersFranchis.length > 0 ? maintenant : etat.dernierPalierLe,
  };

  return {
    etat: suivant,
    paliersFranchis,
    recompenses,
    jauges: jaugesDe(suivant, seuils),
  };
}
