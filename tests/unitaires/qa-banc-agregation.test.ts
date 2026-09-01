import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { agregerResultats } from '../../scripts/qa/contrat-mutation.mjs';

const RACINE = resolve(import.meta.dirname, '../..');
const RACINE_PREUVE = resolve(RACINE, 'bac-a-sable', 'preuve-tableau-lot-c');
const SCRIPT_TABLEAU = resolve(RACINE, 'scripts', 'qa', 'tableau-de-bord.mjs');

function ecrire(relatif: string, contenu: string): void {
  const chemin = resolve(RACINE_PREUVE, relatif);
  mkdirSync(resolve(chemin, '..'), { recursive: true });
  writeFileSync(chemin, contenu, 'utf8');
}

beforeAll(() => {
  rmSync(RACINE_PREUVE, { recursive: true, force: true });
  ecrire('client/src/ecrans/EcranEssai.tsx', '<main data-ecran="essai" />');
  ecrire('client/src/moteurs/essai/index.ts', 'export {};');
  ecrire('client/src/moteurs/commun/index.ts', 'export {};');
  ecrire('tests/composants/EcranEssai.test.tsx', 'data-ecran="essai"');
  ecrire('tests/composants/MoteurEssai.test.tsx', 'MoteurEssai');
  ecrire('tests/unitaires/temoin.test.ts', 'expect(true).toBe(true);');
  ecrire(
    'tests/rapports/qa/mutations.json',
    JSON.stringify({
      complet: true,
      baseVerteAvant: true,
      baseVerteApres: true,
      controlesNegatifs: 5,
      controlesNegatifsExecutes: 4,
      controlesNegatifsVerts: 4,
      mutationsNonMesurees: [{ id: 'M-perdue' }],
      ancragesPerdus: [],
      echecs: []
    })
  );
});

afterAll(() => {
  rmSync(RACINE_PREUVE, { recursive: true, force: true });
});

describe('agrégation honnête du banc de mutation', () => {
  it('sépare les recettes exécutées, non mesurées et les contrôles réellement verts', () => {
    const recettes = [
      { id: 'M1' },
      { id: 'M2' },
      { id: 'N1', negatif: true },
      { id: 'N2', negatif: true }
    ];
    const resultats = [
      { id: 'M1', verdict: 'DETECTEE', couvertPar: null },
      { id: 'M2', verdict: 'ANCRAGE-PERDU', couvertPar: null, detail: 'absent' },
      { id: 'N1', verdict: 'SURVIT', negatif: true, couvertPar: 'equivalent' },
      { id: 'N2', verdict: 'ANCRAGE-PERDU', negatif: true, couvertPar: 'equivalent' }
    ];

    const mesure = agregerResultats(recettes, resultats);

    expect(mesure.mutationsExecutees.map((r) => r.id)).toEqual(['M1']);
    expect(mesure.mutationsNonMesurees.map((r) => r.id)).toEqual(['M2']);
    expect(mesure.detectees.map((r) => r.id)).toEqual(['M1']);
    expect(mesure.controlesExecutes.map((r) => r.id)).toEqual(['N1']);
    expect(mesure.controlesVerts.map((r) => r.id)).toEqual(['N1']);
    expect(mesure.controlesNonMesures.map((r) => r.id)).toEqual(['N2']);
  });

  it('fait rougir le tableau sur un rapport incomplet et exclut le dossier commun', () => {
    const resultat = spawnSync(process.execPath, [SCRIPT_TABLEAU, `--racine=${RACINE_PREUVE}`], {
      cwd: RACINE,
      encoding: 'utf8'
    });
    const sortie = `${resultat.stdout}\n${resultat.stderr}`;
    const rapport = JSON.parse(
      readFileSync(resolve(RACINE_PREUVE, 'tests/rapports/qa/tableau-de-bord.json'), 'utf8')
    ) as { moteursDeclares: number; moteursCouverts: number; mutationsNonOpposable: string };

    expect(resultat.status).toBe(1);
    expect(sortie).toContain('MESURE NON OPPOSABLE');
    expect(rapport.moteursDeclares).toBe(1);
    expect(rapport.moteursCouverts).toBe(1);
    expect(rapport.mutationsNonOpposable).toContain('mutation(s) n’ont pas été mesurées');
  });
});
