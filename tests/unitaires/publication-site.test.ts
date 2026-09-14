import path from 'node:path';
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  depouillerRapportPlaywright,
  estIncidentReseauRelancable,
  extraireAssetsVisuels,
  extrairePremierAsset,
  identifierProcessusTests,
  verifierEtatPrepare,
  verifierRapportVert,
  verifierSiteDistant,
} from '../../scripts/publier-site.mjs';
import { empreinteLivrable } from '../../scripts/preparer-publication-pages.mjs';

afterEach(() => vi.unstubAllGlobals());

describe('recette des fichiers réellement publiés', () => {
  it('accepte la racine réelle du jeu et vérifie aussi le worker, l’icône et les images', async () => {
    const requetes: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (adresse: URL | string) => {
      const url = new URL(adresse);
      requetes.push(url.pathname);
      if (url.pathname.endsWith('version-build.json')) return Response.json({ version: 'nouveau' });
      if (url.pathname.endsWith('service-worker.js')) return new Response("const VERSION = 'nouveau';");
      if (url.pathname.endsWith('manifest.webmanifest')) {
        return Response.json({ icons: [{ src: 'icones/gobi.svg' }] });
      }
      if (url.pathname.endsWith('.svg')) return new Response('<svg/>');
      return new Response(readFileSync('client/index.html', 'utf8'));
    }));

    await expect(verifierSiteDistant('nouveau', ['https://scorpheus.github.io/LaPierreDesMots/assets/gobi.svg']))
      .resolves.toBeUndefined();
    expect(requetes).toEqual([
      '/LaPierreDesMots/version-build.json', '/LaPierreDesMots/',
      '/LaPierreDesMots/service-worker.js', '/LaPierreDesMots/manifest.webmanifest',
      '/LaPierreDesMots/icones/gobi.svg', '/LaPierreDesMots/assets/gobi.svg',
    ]);
  });

  it('refuse une page HTTP 200 dépourvue de l’application', async () => {
    vi.stubGlobal('fetch', vi.fn(async (adresse: URL | string) =>
      new URL(adresse).pathname.endsWith('version-build.json')
        ? Response.json({ version: 'nouveau' }) : new Response('<html>Maintenance</html>')));
    await expect(verifierSiteDistant('nouveau', [])).rejects.toThrow(/racine React/u);
  });

  it('isole les caches de deux workers différents même si les autres fichiers sont identiques', () => {
    const fichiers = [path.resolve('client/index.html')];
    const premiere = empreinteLivrable(fichiers, 'worker A');
    expect(empreinteLivrable(fichiers, 'worker A')).toBe(premiere);
    expect(empreinteLivrable(fichiers, 'worker B')).not.toBe(premiere);
  });
});

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

  it('extrait tous les visuels de production et ignore les données non visuelles', () => {
    const manifeste = Object.fromEntries([
      ...Array.from({ length: 300 }, (_, rang) => [
        `../contenu/assets/famille/image-${String(rang)}.png`,
        { file: `assets/image-${String(rang)}.hash.png` },
      ]),
      ['../contenu/assets/gobi/repos.webp', { file: 'assets/repos.hash.webp' }],
      ['../contenu/habillages/carte.svg', { file: 'assets/carte.hash.svg' }],
      ['../contenu/audio/consigne.opus', { file: 'assets/consigne.hash.opus' }],
    ]);

    const urls = extraireAssetsVisuels(manifeste);
    expect(urls).toHaveLength(302);
    expect(urls).toContain('https://scorpheus.github.io/LaPierreDesMots/assets/repos.hash.webp');
    expect(urls.some((url) => url.endsWith('.opus'))).toBe(false);
  });
});
