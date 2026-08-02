/**
 * REPRODUCTION DU DÉFAUT n° 4 — « dans la clairière je n'ai eu qu'un exercice, est-ce normal ? »
 *
 * Non. La v2 § 5.2 décrit la boucle moyenne, et la ligne 143 du document de référence est
 * citée telle quelle :
 *
 *   « Campement → choix de région et de compagnon → **4 à 6 nœuds enchaînés** → nœud final un
 *     peu plus corsé → butin → retour au campement, qui s'enrichit. »
 *
 * SOURCES QUI FONT FOI, lues sur disque, jamais recalculées :
 *   • `contenu/noeuds/*.json`            — les nœuds réellement livrés ;
 *   • `contenu/monde/regions.json`       — la liste `noeuds` de chaque région, celle qui fait
 *                                          le pourcentage de recoloration ;
 *   • `contenu/exercices/<region>/*.json` — les exercices écrits.
 *
 * Ce fichier ne corrige rien. Il compte, et il échoue tant que les comptes ne sont pas ceux
 * de la spécification. Les deux comptes sont exigés ENSEMBLE — nombre d'exercices ÉCRITS et
 * nombre d'exercices ATTEIGNABLES —, parce que c'est leur écart qui est le défaut : trois
 * exercices de la Clairière existent, sont validés par le schéma, et ne sont référencés par
 * aucun nœud. L'enfant ne les verra jamais.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

interface NoeudLu {
  readonly id: string;
  readonly region: string;
  readonly ordre: number;
  readonly exercice: string;
  readonly prerequis: readonly string[];
}
interface RegionLue {
  readonly region: string;
  readonly ordre: number;
  readonly libelle: string;
  readonly noeuds: readonly string[];
}

/** v2 § 5.2, ligne 143 : « 4 à 6 nœuds enchaînés ». */
const NOEUDS_MIN_PAR_SORTIE = 4;
const NOEUDS_MAX_PAR_SORTIE = 6;

function fichiersDe(dossierRelatif: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossierRelatif)).filter((f) => f.endsWith('.json'));
}

const noeuds: readonly NoeudLu[] = fichiersDe('contenu/noeuds').map((f) =>
  lireJson<NoeudLu>(`contenu/noeuds/${f}`),
);

const monde = lireJson<{ regions: readonly RegionLue[] }>('contenu/monde/regions.json');
const clairiere = monde.regions.find((r) => r.region === 'clairiere')!;

const noeudsClairiere = noeuds.filter((n) => n.region === 'clairiere');

/** Les identifiants d'exercice écrits sur disque, région par région. */
function exercicesEcrits(region: string): readonly string[] {
  return fichiersDe(`contenu/exercices/${region}`).map(
    (f) => lireJson<{ id: string }>(`contenu/exercices/${region}/${f}`).id,
  );
}

describe('la Clairière enchaîne une SORTIE, pas un exercice isolé (v2 § 5.2)', () => {
  it('elle porte de 4 à 6 nœuds', () => {
    expect(noeudsClairiere.length).toBeGreaterThanOrEqual(NOEUDS_MIN_PAR_SORTIE);
    expect(noeudsClairiere.length).toBeLessThanOrEqual(NOEUDS_MAX_PAR_SORTIE);
  });

  it('`regions.json` déclare exactement les nœuds livrés — la carte ne ment pas', () => {
    // C'est cette liste qui fait le pourcentage de recoloration : un écart rendrait la région
    // à jamais incomplète, ou complète trop tôt.
    expect([...clairiere.noeuds].sort()).toEqual(noeudsClairiere.map((n) => n.id).sort());
  });

  it('les nœuds forment une CHAÎNE : chacun a le précédent en prérequis', () => {
    const parOrdre = [...noeudsClairiere].sort((a, b) => a.ordre - b.ordre);
    for (let i = 1; i < parOrdre.length; i += 1) {
      expect(
        parOrdre[i]!.prerequis,
        `${parOrdre[i]!.id} doit suivre ${parOrdre[i - 1]!.id}`,
      ).toContain(parOrdre[i - 1]!.id);
    }
    // Une chaîne d'un seul maillon n'est pas une chaîne.
    expect(parOrdre.length).toBeGreaterThanOrEqual(NOEUDS_MIN_PAR_SORTIE);
  });
});

describe('aucun exercice écrit ne reste inatteignable', () => {
  // Le contrat de sortie exige LES DEUX COMPTES ET LEUR ÉCART : recenser les fichiers
  // d'exercice ne dit rien de ce que l'enfant peut atteindre. Un exercice qu'aucun nœud ne
  // cite est du travail livré, validé, et invisible.
  for (const region of ['clairiere', 'galeries'] as const) {
    it(`région ${region} — tout exercice écrit est référencé par un nœud`, () => {
      const ecrits = exercicesEcrits(region);
      const references = new Set(noeuds.filter((n) => n.region === region).map((n) => n.exercice));
      const orphelins = ecrits.filter((id) => !references.has(id));

      expect(
        orphelins,
        `${String(ecrits.length)} exercice(s) écrit(s), ${String(references.size)} référencé(s)`,
      ).toEqual([]);
    });
  }
});
