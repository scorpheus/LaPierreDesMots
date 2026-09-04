import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  depouillerRapportPlaywright,
  estIncidentReseauRelancable,
  extrairePremierAsset,
  identifierProcessusTests,
  verifierEtatPrepare,
  verifierRapportVert,
} from '../../scripts/publier-site.mjs';

describe('publication GitHub Pages automatisee', () => {
  it('arrete une seconde campagne de test du meme depot sans confondre un autre projet', () => {
    const racine = path.resolve('C:/jeu/LaPierreDesMots');
    const processus = [
      { pid: 10, commande: `node ${racine}\\node_modules\\vitest\\vitest.mjs run` },
      { pid: 11, commande: 'node C:\\autre-jeu\\node_modules\\vitest\\vitest.mjs run' },
      { pid: 12, commande: `node ${racine}\\scripts\\publier-site.mjs --preparer` },
    ];

    expect(identifierProcessusTests(processus, racine, 12)).toEqual([processus[0]]);
  });

  it('refuse un rapport rouge meme si la commande aurait rendu zero', () => {
    expect(() =>
      verifierRapportVert([
        { etape: 'lint', statut: 'reussite', total: 1 },
        { etape: 'test:e2e', statut: 'echec', total: 10 },
      ]),
    ).toThrow(/test:e2e/u);
  });

  it('additionne les preuves d un rapport entierement vert', () => {
    expect(
      verifierRapportVert([
        { etape: 'lint', statut: 'reussite', total: 1 },
        { etape: 'test', statut: 'reussite', total: 42 },
      ]),
    ).toEqual({ etapes: 2, cas: 43 });
  });

  it('ne relance que l incident reseau Windows isole de la famille E2E', () => {
    expect(
      estIncidentReseauRelancable([
        { etape: 'lint', statut: 'reussite' },
        {
          etape: 'test:e2e',
          statut: 'echec',
          details: [{ message: 'page.goto: net::ERR_NO_BUFFER_SPACE' }],
        },
      ]),
    ).toBe(true);
    expect(
      estIncidentReseauRelancable([
        { etape: 'test:e2e', statut: 'echec', details: [{ message: 'le bouton ne répond pas' }] },
      ]),
    ).toBe(false);
  });

  it('depouille la relance Playwright sans transformer un cas rouge en vert', () => {
    expect(
      depouillerRapportPlaywright({
        suites: [
          {
            file: 'parcours.spec.ts',
            specs: [
              { title: 'vert', ok: true },
              {
                title: 'rouge',
                ok: false,
                tests: [{ results: [{ error: { message: 'attendu vrai\ndetail' } }] }],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      total: 2,
      echecs: 1,
      details: [{ ou: 'parcours.spec.ts › rouge', message: 'attendu vrai' }],
    });
  });

  it('refuse de publier quand les octets prepares ne correspondent plus', () => {
    expect(() =>
      verifierEtatPrepare(
        { schema: 1, sourceCommit: 'source-a', pagesCommit: 'pages-a', version: 'version-a' },
        {
          sourceCommit: 'source-a',
          sourceDeclaree: 'source-a',
          pagesCommit: 'pages-a',
          version: 'version-b',
        },
      ),
    ).toThrow(/livrable PWA a change/u);
  });

  it('resout l icone du manifeste sous la base publique', () => {
    expect(extrairePremierAsset({ icons: [{ src: 'icones/gobi.svg' }] })).toBe(
      'https://scorpheus.github.io/LaPierreDesMots/icones/gobi.svg',
    );
  });
});
