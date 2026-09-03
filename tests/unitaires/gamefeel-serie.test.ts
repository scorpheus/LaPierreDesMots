/**
 * La hauteur montante selon la série — v2 § 8, D26 (lot L2-A).
 *
 * « 2ᵉ bonne réponse = un demi-ton plus haut, comme les pièces de Mario. C'est le détail le
 * plus rentable de toute la liste » (v2 § 8). Ce fichier prouve les deux moitiés de la phrase :
 *
 *   1. la hauteur MONTE avec la série, et elle est plafonnée pour ne jamais sonner strident ;
 *   2. elle se RÉINITIALISE sur refus — et sur refus seulement.
 *
 * Il prouve aussi les deux garde-fous qui n'ont d'intérêt que mesurés :
 *   • **aucun feu d'artifice générique**, conformément à la décision parent du 2026-09-02 ;
 *   • **aucune vibration sur un refus** — « l'erreur est un mouvement, pas une punition ».
 *
 * Tout est en environnement `node` : `creerRetourSensoriel` ne touche ni le DOM ni React, et
 * les trois fournisseurs sont des espionnes écrites ici.
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

import type { CodeEffet, CodeVibration, FournisseurAudio, FournisseurHaptique } from '@pierre/partage';

import { PLAFOND_DEMI_TONS, demiTonsDeSerie } from '@client/gamefeel/serie.js';
import { creerRetourSensoriel } from '@client/gamefeel/retour.js';
import { aimanter, AIMANTATION_PX } from '@client/gamefeel/aimantation.js';
import { imagesClesRefus, OSCILLATION_REFUS_PX } from '@client/gamefeel/ressort.js';

interface SonJoue {
  readonly code: CodeEffet;
  readonly demiTons: number;
}

/** Les trois espionnes. Aucune ne joue, aucune ne vibre : la suite reste muette et immobile. */
function espionnes(): {
  sons: SonJoue[];
  vibrations: CodeVibration[];
  gerbes: number[];
  audio: FournisseurAudio;
  haptique: FournisseurHaptique;
  emettreParticules: (origine: readonly [number, number], nombre: number) => void;
} {
  const sons: SonJoue[] = [];
  const vibrations: CodeVibration[] = [];
  const gerbes: number[] = [];

  const audio: FournisseurAudio = {
    disponible: true,
    async jouerEffet(code, options): Promise<void> {
      sons.push({ code, demiTons: options?.demiTons ?? 0 });
    },
    async demarrerAmbiance(): Promise<void> {
      /* muet */
    },
    arreterAmbiance(): void {
      /* muet */
    },
    reglerVolume(): void {
      /* muet */
    }
  };

  const haptique: FournisseurHaptique = {
    disponible: true,
    vibrer(code: CodeVibration): void {
      vibrations.push(code);
    }
  };

  return {
    sons,
    vibrations,
    gerbes,
    audio,
    haptique,
    emettreParticules: (_origine, nombre) => {
      gerbes.push(nombre);
    }
  };
}

function retourDeTest(animationsDesactivees = false) {
  const outillage = espionnes();
  return {
    ...outillage,
    retour: creerRetourSensoriel({
      audio: outillage.audio,
      haptique: outillage.haptique,
      animationsDesactivees,
      emettreParticules: outillage.emettreParticules
    })
  };
}

const ORIGINE: readonly [number, number] = [100, 200];

describe('demiTonsDeSerie — la loi de la hauteur', () => {
  test('la première bonne réponse ne transpose rien ; la deuxième monte d’un demi-ton', () => {
    expect(demiTonsDeSerie(1)).toBe(0);
    expect(demiTonsDeSerie(2)).toBe(1);
    expect(demiTonsDeSerie(3)).toBe(2);
  });

  test('une série remise à zéro repart de la tonique — jamais d’une note « de punition »', () => {
    expect(demiTonsDeSerie(0)).toBe(0);
    expect(demiTonsDeSerie(-4)).toBe(0);
  });

  test('le plafond est une octave, et il tient à 1 000 bonnes réponses (Q5)', () => {
    expect(PLAFOND_DEMI_TONS).toBe(12);
    expect(demiTonsDeSerie(13)).toBe(12);
    expect(demiTonsDeSerie(1000)).toBe(12);
  });

  test('propriété : monotone croissante et bornée, sur toute série entière', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 500 }), (serie) => {
        const valeur = demiTonsDeSerie(serie);
        expect(valeur).toBeGreaterThanOrEqual(0);
        expect(valeur).toBeLessThanOrEqual(PLAFOND_DEMI_TONS);
        expect(demiTonsDeSerie(serie + 1)).toBeGreaterThanOrEqual(valeur);
        return true;
      }),
      { numRuns: 600 }
    );
  });
});

describe('RetourSensoriel — la série monte, et se réinitialise sur refus', () => {
  test('trois dépôts corrects de suite : 0, 1 puis 2 demi-tons', async () => {
    const { retour, sons } = retourDeTest();
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });

    expect(sons.map((son) => son.code)).toEqual([
      'depot-correct',
      'depot-correct',
      'depot-correct'
    ]);
    // La hauteur est la SEULE trace observable de la série : `RetourSensoriel` n'expose pas
    // son compteur (voir la note de contrat dans `retour.ts`). C'est un test plus honnête —
    // il porte sur ce que l'enfant entend, pas sur une variable interne.
    expect(sons.map((son) => son.demiTons)).toEqual([0, 1, 2]);
  });

  test('un refus RAMÈNE la hauteur à la tonique — et le suivant repart de zéro', async () => {
    const { retour, sons } = retourDeTest();
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(sons.at(-1)?.demiTons).toBe(1);

    await retour.depotRefuse();
    expect(sons.at(-1)?.code).toBe('depot-refuse');

    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(sons.at(-1)?.demiTons).toBe(0);
  });

  test('`reinitialiserSerie` fait la même chose — c’est le changement de consigne', async () => {
    const { retour, sons } = retourDeTest();
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(sons.at(-1)?.demiTons).toBe(1);

    retour.reinitialiserSerie();
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(sons.at(-1)?.demiTons).toBe(0);
  });

  test('une série imposée par l’appelant fait autorité', async () => {
    const { retour, sons } = retourDeTest();
    await retour.depotCorrect({ origine: ORIGINE, serie: 5 });
    expect(sons.at(-1)?.demiTons).toBe(4);
    // Et elle devient la nouvelle base : le dépôt suivant, non compté, monte à six.
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(sons.at(-1)?.demiTons).toBe(5);
  });
});

describe('les garde-fous de la v2 § 8, mesurés et non affirmés', () => {
  test('AUCUNE vibration sur un refus — « l’erreur est un mouvement, pas une punition »', async () => {
    const { retour, vibrations } = retourDeTest();
    await retour.depotRefuse();
    await retour.depotRefuse();
    expect(vibrations).toEqual([]);
  });

  test('le dépôt correct vibre, et le palier aussi', async () => {
    const { retour, vibrations } = retourDeTest();
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    await retour.palierFranchi('intermediaire');
    expect(vibrations).toEqual(['depot-correct', 'palier-franchi']);
  });

  test('chaque palier de la cascade a son son, et ils sont tous distincts', async () => {
    const { retour, sons } = retourDeTest();
    await retour.palierFranchi('etoile');
    await retour.palierFranchi('intermediaire');
    await retour.palierFranchi('rare');
    expect(sons.map((son) => son.code)).toEqual([
      'etoile',
      'palier-intermediaire',
      'palier-rare'
    ]);
    expect(new Set(sons.map((son) => son.code)).size).toBe(3);
  });

  test('aucun feu d’artifice générique, même sur une série de 200', async () => {
    const { retour, gerbes } = retourDeTest();
    for (let index = 0; index < 200; index += 1) {
      await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    }
    expect(gerbes).toEqual([]);
  });

  test('animations calmes : plus une seule particule, mais le son reste', async () => {
    const { retour, gerbes, sons } = retourDeTest(true);
    await retour.depotCorrect({ origine: ORIGINE, serie: 0 });
    expect(gerbes).toEqual([]);
    expect(sons).toHaveLength(1);
    expect(retour.animationsDesactivees).toBe(true);
  });
});

describe('aimantation et oscillation de refus — R16, v2 § 8', () => {
  test('sous 24 px, le dépôt se pose EXACTEMENT sur la cible', () => {
    const resultat = aimanter([100, 100], [110, 110]);
    expect(resultat.aimante).toBe(true);
    expect(resultat.position).toEqual([110, 110]);
    expect(resultat.distancePx).toBeCloseTo(Math.sqrt(200), 6);
  });

  test('au-delà, le point du doigt ne bouge pas d’un pixel', () => {
    const resultat = aimanter([0, 0], [100, 0]);
    expect(resultat.aimante).toBe(false);
    expect(resultat.position).toEqual([0, 0]);
    expect(resultat.distancePx).toBe(100);
  });

  test('propriété : `aimante` équivaut exactement à `distancePx <= 24`', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -300, max: 300 }),
        fc.integer({ min: -300, max: 300 }),
        (dx, dy) => {
          const resultat = aimanter([0, 0], [dx, dy]);
          expect(resultat.aimante).toBe(resultat.distancePx <= AIMANTATION_PX);
          return true;
        }
      ),
      { numRuns: 600 }
    );
  });

  test('le refus revient EXACTEMENT à sa place, et n’excède jamais 6 px', () => {
    const cles = imagesClesRefus(false);
    expect(cles.valeurs[0]).toBe(0);
    expect(cles.valeurs.at(-1)).toBe(0);
    expect(Math.max(...cles.valeurs.map(Math.abs))).toBe(OSCILLATION_REFUS_PX);
    // Animations calmes : plus d'oscillation du tout, et toujours pas de déplacement net.
    expect(imagesClesRefus(true).valeurs).toEqual([0]);
  });
});
