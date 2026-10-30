/**
 * Contrat de couverture du palier `verifier` (Docs/rework-tests-socle-2026-10-09.md § 6).
 *
 * Le palier échantillonne les balayages exhaustifs. Ce test vérifie, sans navigateur, que
 * l'échantillon garde ce qu'il promet, pour plusieurs rotations :
 *   1. chaque moteur et chaque écran des recettes est exercé au moins une fois ;
 *   2. chaque règle balayée (S1–S10, R16, R20, sorties, a11y) est mesurée sur la tablette en
 *      portrait (800×1100) ET sur un format PC (1280×720 ou 1366×768) ;
 *   3. l'échantillon est déterministe (même rotation, même échantillon) et ne tire rien au sort ;
 *   4. toute suite échantillonnée figure dans la liste « complet seulement » du rapport.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  FORMAT_PC,
  FORMAT_TABLETTE_PORTRAIT,
  formatsDuBalayage,
  moteursDeclares,
  noeudsBalayes,
  recettesDEcrans,
} from '../e2e/qa-outils.js';
import { COMPLET_SEULEMENT } from '../../scripts/paliers.mjs';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const lire = (relatif: string): string => readFileSync(`${RACINE}${relatif}`, 'utf8');
const ROTATIONS = [0, 1, 2, 3, 7, 13];

const ENVIRONNEMENT_INITIAL = { palier: process.env['PIERRE_PALIER'], rotation: process.env['PIERRE_ROTATION'] };
function palier(nom: 'verifier' | 'complet', rotation = 0): void {
  process.env['PIERRE_PALIER'] = nom;
  process.env['PIERRE_ROTATION'] = String(rotation);
}
afterEach(() => {
  if (ENVIRONNEMENT_INITIAL.palier === undefined) delete process.env['PIERRE_PALIER'];
  else process.env['PIERRE_PALIER'] = ENVIRONNEMENT_INITIAL.palier;
  if (ENVIRONNEMENT_INITIAL.rotation === undefined) delete process.env['PIERRE_ROTATION'];
  else process.env['PIERRE_ROTATION'] = ENVIRONNEMENT_INITIAL.rotation;
});

/** Les suites qui balaient par écran avec `formatsDuBalayage`, et la règle de chacune. */
const BALAYAGES_PAR_ECRAN = [
  { regle: 'sorties et R16', suite: 'tests/e2e/parcours-audit-tout-le-site.spec.ts' },
  { regle: 'a11y', suite: 'tests/qualite/a11y-tout-le-site.spec.ts' },
  { regle: 'R20', suite: 'tests/qualite/mise-en-page-tablette.spec.ts' },
] as const;

/** Les suites échantillonnées : chacune doit être déclarée « complet seulement ». */
const SUITES_ECHANTILLONNEES = [
  'tests/e2e/parcours-audit-tout-le-site.spec.ts',
  'tests/e2e/parcours-aucun-geste-mort.spec.ts',
  'tests/e2e/parcours-tactile-exhaustif.spec.ts',
  'tests/qualite/a11y-tout-le-site.spec.ts',
  'tests/qualite/mise-en-page-tablette.spec.ts',
  'tests/e2e/parcours-paires-cadrage.spec.ts',
  'tests/e2e/parcours-paires-defilement.spec.ts',
  'tests/e2e/parcours-chemins-regles.spec.ts',
  'tests/e2e/parcours-attrape-accessibilite.spec.ts',
  'tests/e2e/parcours-mots-incomplets.spec.ts',
  'tests/e2e/parcours-coloriages-reperes.spec.ts',
];

describe('palier verifier — contrat de couverture', () => {
  it('chaque moteur (14) est exercé, par un nœud et un seul, à chaque rotation', () => {
    const moteurs = [...moteursDeclares()].sort();
    expect(moteurs.length).toBe(14);
    for (const rotation of ROTATIONS) {
      palier('verifier', rotation);
      const echantillon = noeudsBalayes();
      expect(echantillon.map((n) => n.moteur).sort(), `rotation ${String(rotation)}`).toEqual(moteurs);
    }
  });

  it('chaque écran des recettes est exercé à chaque rotation', () => {
    palier('complet');
    const tous = [...new Set(recettesDEcrans().map((e) => e.attendu))].sort();
    for (const rotation of ROTATIONS) {
      palier('verifier', rotation);
      const exerces = [...new Set(recettesDEcrans(noeudsBalayes()).map((e) => e.attendu))].sort();
      expect(exerces, `rotation ${String(rotation)}`).toEqual(tous);
    }
  });

  it('chaque balayage par écran mesure la tablette portrait ET un format PC, à chaque rotation', () => {
    expect([FORMAT_TABLETTE_PORTRAIT.width, FORMAT_TABLETTE_PORTRAIT.height]).toEqual([800, 1100]);
    expect([[1280, 720], [1366, 768]]).toContainEqual([FORMAT_PC.width, FORMAT_PC.height]);
    for (const rotation of ROTATIONS) {
      palier('verifier', rotation);
      const formats = new Set(formatsDuBalayage(recettesDEcrans(noeudsBalayes())).map((c) => c.format.nom));
      expect(formats, `rotation ${String(rotation)}`).toEqual(new Set([FORMAT_TABLETTE_PORTRAIT.nom, FORMAT_PC.nom]));
    }
    for (const { regle, suite } of BALAYAGES_PAR_ECRAN) {
      const source = lire(suite);
      expect(source, `${regle} : ${suite} doit balayer par formatsDuBalayage`).toMatch(/formatsDuBalayage\(ECRANS\)/u);
      expect(source, `${regle} : ${suite} doit poser le format du cas`).toMatch(/setViewportSize\(format\)/u);
    }
  });

  it('S1–S10 : la garde du socle n’est pas échantillonnée et tourne en 800×1100 et sur PC', () => {
    const garde = lire('tests/qualite/socle-activite.spec.ts');
    expect(garde).toMatch(/const NOEUDS = noeudsLivres\(\);/u);
    expect(garde).toMatch(/largeur: 800, hauteur: 1100/u);
    expect(garde).toMatch(/largeur: 1280, hauteur: 720|largeur: 1366, hauteur: 768/u);
    expect(garde).not.toMatch(/noeudsBalayes|echantillonDuPalier|noeudsDuMoteurBalayes/u);
  });

  it('l’échantillon est déterministe et rien n’y est tiré au sort', () => {
    palier('verifier', 5);
    const a = noeudsBalayes().map((n) => n.id);
    const b = noeudsBalayes().map((n) => n.id);
    expect(a).toEqual(b);
    const outils = lire('tests/e2e/qa-outils.ts');
    expect(outils).not.toMatch(/Math\.random\(|Date\.now\(|new Date\(/u);
  });

  it('au palier complet, tout est balayé : 76 nœuds et trois formats par écran', () => {
    palier('complet');
    expect(noeudsBalayes().length).toBeGreaterThanOrEqual(76);
    const recettes = recettesDEcrans();
    expect(formatsDuBalayage(recettes).length).toBe(recettes.length * 3);
  });

  it('toute suite échantillonnée est déclarée « complet seulement » dans le rapport', () => {
    const declarees = new Set(COMPLET_SEULEMENT.map((e) => e.suite));
    expect(SUITES_ECHANTILLONNEES.filter((s) => !declarees.has(s))).toEqual([]);
    // Et la liste du contrat suit le code : toute spec qui échantillonne y est nommée.
    const echantillonneurs = /noeudsBalayes\(|noeudsDuMoteurBalayes\(|echantillonDuPalier\(|formatsDuBalayage\(|rotationDuPalier\(/u;
    const specs = [
      ...readdirRecursif('tests/e2e'), ...readdirRecursif('tests/qualite'),
    ].filter((f) => f.endsWith('.spec.ts') && echantillonneurs.test(lire(f)));
    expect(specs.filter((s) => !SUITES_ECHANTILLONNEES.includes(s)).sort()).toEqual([]);
  });
});

/** Les fichiers d'un dossier de tests, en chemins relatifs au dépôt. */
function readdirRecursif(relatif: string): string[] {
  return readdirSync(`${RACINE}${relatif}`).map((f) => `${relatif}/${f}`);
}
