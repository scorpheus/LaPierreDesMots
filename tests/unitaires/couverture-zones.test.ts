/**
 * Seuils de couverture PAR ZONE — annexe T § 7. Le garde du rapport qui nomme la zone fautive.
 *
 * ── Le défaut que ces tests existent pour empêcher de revenir ────────────────────────────
 *
 * Les seuils par zone étaient déclarés dans `vitest.config.ts` et **n'ont jamais rien vérifié
 * sur Windows**. Vitest matche ses globs contre `relative(root, fichier)`, qui rend des
 * contre-obliques ; les globs s'écrivent avec des obliques ; aucun fichier ne matchait. La
 * carte de couverture de chaque zone restait vide, son résumé rendait `pct = "Unknown"` — une
 * CHAÎNE — et la comparaison `"Unknown" < 90` vaut `false` : le seuil était déclaré satisfait
 * sans avoir rien mesuré.
 *
 * D'où les deux propriétés que ce fichier tient, et qui sont plus importantes que le calcul
 * lui-même :
 *
 *   1. les globs matchent bien les chemins des DEUX plateformes ;
 *   2. **une zone qui ne matche aucun fichier est un DÉFAUT, jamais une réussite.**
 *
 * Un seuil qui ne mesure rien est pire qu'un seuil absent : il rassure.
 */
import { describe, expect, it } from 'vitest';

import {
  CRITERES,
  SEUILS_PAR_ZONE,
  cheminRelatifPosix,
  decrireManquement,
  evaluerZones,
  globVersRegExp
} from '../../scripts/couverture-zones.mjs';

/** Un compteur istanbul. */
const compteur = (couvert: number, total: number) => ({
  covered: couvert,
  total,
  pct: total === 0 ? 100 : (couvert / total) * 100
});

/** Un fichier du résumé de couverture, tous critères pilotables. */
function fichier(options: {
  statements?: [number, number];
  branches?: [number, number];
  functions?: [number, number];
  lines?: [number, number];
}) {
  const d = (v: [number, number] | undefined) => compteur(...(v ?? [100, 100]));
  return {
    statements: d(options.statements),
    branches: d(options.branches),
    functions: d(options.functions),
    lines: d(options.lines)
  };
}

describe('globVersRegExp — la sémantique des globs de seuils', () => {
  it('`*` reste dans un segment et ne traverse jamais une oblique', () => {
    const re = globVersRegExp('partage/src/pedagogie/*.ts');
    expect(re.test('partage/src/pedagogie/bkt.ts')).toBe(true);
    expect(re.test('partage/src/pedagogie/sous/dossier.ts')).toBe(false);
  });

  it('`**/` traverse zéro segment ou plus', () => {
    const re = globVersRegExp('partage/src/moteurs/**/*.ts');
    expect(re.test('partage/src/moteurs/a.ts')).toBe(true);
    expect(re.test('partage/src/moteurs/x/y/z.ts')).toBe(true);
  });

  it('l’extension est exacte : `.tsx` n’est pas `.ts`', () => {
    expect(globVersRegExp('partage/src/moteurs/**/*.ts').test('partage/src/moteurs/a.tsx')).toBe(
      false
    );
  });

  it('un littéral est ancré des deux côtés', () => {
    const re = globVersRegExp('partage/src/contenu/validation.ts');
    expect(re.test('partage/src/contenu/validation.ts')).toBe(true);
    expect(re.test('partage/src/contenu/validationX.ts')).toBe(false);
    expect(re.test('autre/partage/src/contenu/validation.ts')).toBe(false);
  });
});

describe('cheminRelatifPosix — la normalisation qui manquait à Vitest', () => {
  it('rend des obliques quel que soit le séparateur d’origine', () => {
    // C'est LE cas qui rendait les seuils inertes sur Windows.
    expect(cheminRelatifPosix('C:\\depot', 'C:\\depot\\partage\\src\\pedagogie\\bkt.ts')).toBe(
      'partage/src/pedagogie/bkt.ts'
    );
  });
});

describe('evaluerZones', () => {
  const RACINE = 'C:\\depot';
  const chemin = (relatif: string) => `${RACINE}\\${relatif.split('/').join('\\')}`;

  it('nomme la zone fautive, son seuil, sa mesure et l’écart', () => {
    const resume = {
      total: {},
      // 437/500 branches = 87,4 % — sous le seuil de 90 % de `pedagogie/`.
      [chemin('partage/src/pedagogie/bkt.ts')]: fichier({ branches: [437, 500] })
    };
    const { manquements } = evaluerZones(resume, RACINE, {
      'partage/src/pedagogie/*.ts': { branches: 90 }
    });

    expect(manquements).toHaveLength(1);
    expect(manquements[0]).toMatchObject({
      glob: 'partage/src/pedagogie/*.ts',
      critere: 'branches',
      mesure: 87.4,
      exigence: 90,
      ecart: 2.6,
      couvert: 437,
      total: 500
    });
    // La phrase du rapport doit porter les quatre informations, pas seulement le verdict.
    const phrase = decrireManquement(manquements[0]);
    expect(phrase).toContain('partage/src/pedagogie/*.ts');
    expect(phrase).toContain('branches');
    expect(phrase).toContain('87,4 %');
    expect(phrase).toContain('90 %');
    expect(phrase).toContain('annexe T § 7');
  });

  it('agrège les compteurs, jamais la moyenne des pourcentages', () => {
    // Un fichier de 1 ligne couverte à 100 % et un de 99 lignes couvertes à 0 % : la moyenne
    // des pourcentages dirait 50 %, l'agrégation correcte dit 1 %.
    const resume = {
      total: {},
      [chemin('partage/src/pedagogie/a.ts')]: fichier({ lines: [1, 1] }),
      [chemin('partage/src/pedagogie/b.ts')]: fichier({ lines: [0, 99] })
    };
    const { zones } = evaluerZones(resume, RACINE, {
      'partage/src/pedagogie/*.ts': { lines: 90 }
    });
    expect(zones[0].criteres[0].mesure).toBe(1);
  });

  it('UNE ZONE SANS AUCUN FICHIER EST UN DÉFAUT, jamais une réussite', () => {
    // Le cœur du lot. Avant, ce cas passait en silence sur toutes les plateformes Windows.
    const { zonesVides, zones } = evaluerZones({ total: {} }, RACINE, {
      'serveur/src/routes/**/*.ts': { lines: 80 }
    });
    expect(zonesVides).toHaveLength(1);
    expect(zonesVides[0].glob).toBe('serveur/src/routes/**/*.ts');
    expect(zones[0].vide).toBe(true);
  });

  it('ne déclare aucun manquement quand toutes les zones tiennent leur seuil', () => {
    const resume = {
      total: {},
      [chemin('partage/src/pedagogie/bkt.ts')]: fichier({ branches: [95, 100] })
    };
    const { manquements, zonesVides } = evaluerZones(resume, RACINE, {
      'partage/src/pedagogie/*.ts': { branches: 90 }
    });
    expect(manquements).toHaveLength(0);
    expect(zonesVides).toHaveLength(0);
  });

  it('un seuil atteint À L’ÉGALITÉ est satisfait', () => {
    const resume = {
      total: {},
      [chemin('partage/src/pedagogie/bkt.ts')]: fichier({ branches: [90, 100] })
    };
    const { manquements } = evaluerZones(resume, RACINE, {
      'partage/src/pedagogie/*.ts': { branches: 90 }
    });
    expect(manquements).toHaveLength(0);
  });

  it('sans résumé de couverture, rien n’est déclaré mesuré', () => {
    // Une absence de mesure ne doit jamais se lire comme une réussite.
    const verdict = evaluerZones(null, RACINE);
    expect(verdict.mesuree).toBe(false);
    expect(verdict.zones).toHaveLength(0);
  });
});

describe('SEUILS_PAR_ZONE — la table de l’annexe T § 7', () => {
  it('porte les cinq zones, et aucun seuil n’est descendu sous sa valeur d’annexe', () => {
    // Les seuils ne s'abaissent pas : ce test est le cliquet. Toute baisse doit être un
    // arbitrage explicite, pas un effet de bord.
    expect(SEUILS_PAR_ZONE['partage/src/pedagogie/*.ts']).toMatchObject({
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    });
    expect(SEUILS_PAR_ZONE['partage/src/contenu/validation.ts']).toMatchObject({ branches: 95 });
    expect(SEUILS_PAR_ZONE['partage/src/moteurs/colorie/validation.ts']).toMatchObject({
      branches: 95
    });
    expect(SEUILS_PAR_ZONE['partage/src/moteurs/**/*.ts']).toMatchObject({ branches: 80 });
    expect(SEUILS_PAR_ZONE['serveur/src/routes/**/*.ts']).toMatchObject({ branches: 80 });
    expect(Object.keys(SEUILS_PAR_ZONE)).toHaveLength(5);
  });

  it('chaque zone contraint les quatre critères', () => {
    for (const [glob, seuils] of Object.entries(SEUILS_PAR_ZONE)) {
      for (const critere of CRITERES) {
        expect(seuils[critere], `${glob} · ${critere}`).toBeTypeOf('number');
      }
    }
  });
});
