/**
 * Les deux portées de remise à zéro, en pur — lot H2. Annexe T § T1.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA PROPRIÉTÉ QUI COMPTE : ON EFFACE PAR DÉFAUT, ON CONSERVE PAR EXCEPTION
 *
 * C'est la leçon de D48 appliquée à l'effacement. Si `porteeEfface` fonctionnait par liste de
 * tables À effacer, une table ajoutée par une migration future survivrait en silence à la
 * remise à zéro — et le profil « remis à zéro » garderait une projection périmée, c'est-à-dire
 * exactement le défaut que cette campagne corrige. On ne répare pas un état périmé avec un
 * mécanisme qui périme.
 *
 * `fast-check` tire donc des noms de tables au hasard et exige qu'ils soient TOUS effacés,
 * sauf les deux nommés. Ce n'est pas un test décoratif : il échoue le jour où quelqu'un
 * retourne la logique en liste blanche.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  PORTEES_REINITIALISATION,
  TABLES_CONSERVEES_PAR_PROGRESSION,
  compterRegionsIncoherentes,
  confirmationValide,
  conservesParLaPortee,
  estPorteeReinitialisation,
  libellePortee,
  pertesDeLaPortee,
  porteeEfface,
  totalLignesEffacees
} from '@partage/parent/reinitialisation';

import type { EtatRegionProfil } from '@partage/parent/reinitialisation';

describe('porteeEfface — on efface par défaut', () => {
  it('la portée « complete » n’épargne AUCUNE table, quel qu’en soit le nom', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (table) => {
        expect(porteeEfface('complete', table)).toBe(true);
      }),
      { numRuns: 300 }
    );
  });

  it('la portée « progression » n’épargne QUE les deux tables nommées', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (table) => {
        const attendu = !TABLES_CONSERVEES_PAR_PROGRESSION.includes(table);
        expect(porteeEfface('progression', table)).toBe(attendu);
      }),
      { numRuns: 300 }
    );
  });

  it('une table INCONNUE — celle qu’une migration future ajoutera — est effacée par les deux', () => {
    for (const portee of PORTEES_REINITIALISATION) {
      expect(porteeEfface(portee, 'table_qui_n_existe_pas_encore')).toBe(true);
    }
  });

  it('les deux seules conservées sont les réglages et la mesure qui les a produits', () => {
    expect([...TABLES_CONSERVEES_PAR_PROGRESSION].sort()).toEqual([
      'essais_typographie',
      'reglages_lecture'
    ]);
  });
});

describe('estPorteeReinitialisation — aucune valeur par défaut', () => {
  it('n’accepte que les deux portées, et rien qui leur ressemble', () => {
    for (const valeur of PORTEES_REINITIALISATION) {
      expect(estPorteeReinitialisation(valeur)).toBe(true);
    }
    for (const valeur of [undefined, null, '', 'tout', 'COMPLETE', 'Progression', 0, 1, {}, []]) {
      expect(estPorteeReinitialisation(valeur), String(valeur)).toBe(false);
    }
  });
});

describe('confirmationValide — la garde qui nomme le profil', () => {
  it('accepte le prénom sans accent, sans casse, avec des espaces de bord', () => {
    for (const saisie of ['Ezékiel', 'ezekiel', '  EZEKIEL  ', 'Ezekiel']) {
      expect(confirmationValide('Ezékiel', saisie), saisie).toBe(true);
    }
  });

  it('refuse tout ce qui n’est pas le prénom — y compris un « oui » et un vide', () => {
    for (const saisie of [undefined, null, '', '   ', 'oui', 'o', 'Alma', 'Ezékie', 42, true]) {
      expect(confirmationValide('Ezékiel', saisie), String(saisie)).toBe(false);
    }
  });

  it('un prénom quelconque se confirme par lui-même, et par lui seul', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((t) => t.trim() !== ''),
        (prenom) => {
          expect(confirmationValide(prenom, prenom)).toBe(true);
          expect(confirmationValide(prenom, `${prenom}-x`)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('ce qui est perdu et ce qui est gardé', () => {
  it('la portée complète perd tout ce que la progression perd, et les réglages en plus', () => {
    const progression = pertesDeLaPortee('progression');
    const complete = pertesDeLaPortee('complete');

    for (const perte of progression) {
      expect(complete).toContain(perte);
    }
    expect(complete.length).toBe(progression.length + 1);
    expect(complete.join(' ')).toContain('réglages de lecture');
    expect(progression.join(' ')).not.toContain('réglages de lecture');
  });

  it('les deux portées gardent toujours le prénom et l’avatar', () => {
    for (const portee of PORTEES_REINITIALISATION) {
      const gardes = conservesParLaPortee(portee).join(' ');
      expect(gardes, portee).toContain('prénom');
      expect(gardes, portee).toContain('avatar');
    }
  });

  it('le journal des tentatives est annoncé comme perdu — il l’est vraiment', () => {
    // Le contrat le dit à l'écran parce que le service l'exécute : `tentatives` est effacée,
    // pourtant append-only. Une perte non annoncée serait une surprise ; annoncée, c'est un
    // choix que le parent peut peser.
    for (const portee of PORTEES_REINITIALISATION) {
      expect(pertesDeLaPortee(portee).join(' '), portee).toContain('journal des tentatives');
    }
  });

  it('chaque portée porte un libellé distinct, lisible par un adulte', () => {
    const libelles = PORTEES_REINITIALISATION.map(libellePortee);
    expect(new Set(libelles).size).toBe(libelles.length);
    for (const libelle of libelles) {
      expect(libelle.length).toBeGreaterThan(10);
    }
  });
});

describe('les comptes du rapport', () => {
  it('le total est la somme, et zéro reste zéro', () => {
    expect(totalLignesEffacees([])).toBe(0);
    expect(
      totalLignesEffacees([
        { table: 'tentatives', lignesEffacees: 6 },
        { table: 'progression_noeud', lignesEffacees: 3 },
        { table: 'campement', lignesEffacees: 0 }
      ])
    ).toBe(9);
  });
});

describe('compterRegionsIncoherentes', () => {
  function region(code: string, ecart: number): EtatRegionProfil {
    return {
      region: code as EtatRegionProfil['region'],
      ordre: 1,
      ouverte: true,
      pourcentageStocke: 1,
      pourcentageRecalcule: 1 - ecart,
      ecart,
      noeudsLivres: 6,
      noeudsTermines: 1,
      eclatObtenuLe: null
    };
  }

  it('compte les régions dont la projection ment — 2 sur l’état vécu du 2026-08-02', () => {
    const vecu = [
      region('clairiere', 5 / 6),
      region('galeries', 10 / 12),
      region('marais-jumeau', 0),
      region('foret-muette', 0),
      region('volcan', 0),
      region('cite-des-histoires', 0)
    ];
    expect(compterRegionsIncoherentes(vecu)).toBe(2);
  });

  it('un écart NÉGATIF compte aussi — la carte peut mentir dans les deux sens', () => {
    // Une projection en retard sur le journal est une incohérence au même titre. Ne compter
    // que le sens observé le 2026-08-02 serait tester le symptôme, pas la propriété.
    expect(compterRegionsIncoherentes([region('clairiere', -0.5)])).toBe(1);
  });

  it('vaut zéro quand tout concorde', () => {
    expect(compterRegionsIncoherentes([region('clairiere', 0), region('galeries', 0)])).toBe(0);
    expect(compterRegionsIncoherentes([])).toBe(0);
  });
});
