/**
 * Gardes rouges du port local navigateur et de sa persistance.
 *
 * Aucun SQLite WASM n'est chargé par ces tests : ils prouvent le câblage sans démarrer
 * WebAssembly — sélection explicite du port PWA, VFS persistant OPFS, nom de base stable et
 * demande de persistance durable. La fermeture/réouverture réelle appartient à la recette
 * Chromium lancée derrière `tester:pwa`.
 *
 * Contrat : `Docs/contrat-pwa-github-pages.md` § 2, 3, 6.1 et 7.1-7.3.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';

import { RACINE_DEPOT, lireTexte } from '../configuration/preparation.js';

const RACINE_CLIENT = join(RACINE_DEPOT, 'client', 'src');

function fichiersSource(racine: string): readonly string[] {
  if (!existsSync(racine)) return [];
  const trouves: string[] = [];
  const parcourir = (dossier: string): void => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.[cm]?[jt]sx?$/iu.test(entree.name)) trouves.push(chemin);
    }
  };
  parcourir(racine);
  return trouves;
}

function sansCommentaires(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      removeComments: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve
    }
  }).outputText;
}

const SOURCES = fichiersSource(RACINE_CLIENT);
const texteDesSources = (): string =>
  SOURCES.map((fichier) => sansCommentaires(readFileSync(fichier, 'utf8'))).join('\n');
// La transpilation de toutes les sources est volontairement faite une fois à la collecte :
// répétée dans chaque cas, elle pouvait dépasser le délai du test pendant la campagne parallèle.
const TEXTE_SOURCES = texteDesSources();

function sourcesOpfsPwa(): readonly { readonly fichier: string; readonly source: string }[] {
  return SOURCES.filter((fichier) => {
    const relatif = relative(RACINE_CLIENT, fichier).replace(/\\/gu, '/');
    return relatif.startsWith('base/') && /(?:sqlite|opfs|wasm|navigateur|pwa)/iu.test(relatif);
  })
    .map((fichier) => ({ fichier, source: sansCommentaires(readFileSync(fichier, 'utf8')) }))
    .filter(({ source }) => /opfs-sahpool/iu.test(source));
}

describe('sélection du port PWA', () => {
  it('choisit explicitement un port local navigateur et jamais le port HTTP', () => {
    const source = sansCommentaires(lireTexte('client/src/api/client.ts'));
    const branche = /import\.meta\.env\.MODE\s*===\s*['"]pwa['"][\s\S]{0,320}?import\s*\(\s*['"]([^'"]+)['"]\s*\)/u.exec(
      source
    );

    expect(
      branche,
      '`client.ts` ne possède aucune branche explicite pour `import.meta.env.MODE === "pwa"`'
    ).not.toBeNull();
    const moduleSelectionne = branche?.[1] ?? '';
    expect(moduleSelectionne, 'la branche PWA retombe sur le réseau Fastify').not.toMatch(
      /port-http/iu
    );
    expect(
      moduleSelectionne,
      'la branche PWA doit sélectionner une composition locale navigateur identifiable'
    ).toMatch(/(?:pwa|navigateur|local)/iu);
  });

  it('le module sélectionné ne contient aucun appel réseau vers `/api`', () => {
    const sourceClient = sansCommentaires(lireTexte('client/src/api/client.ts'));
    const moduleRelatif =
      /import\.meta\.env\.MODE\s*===\s*['"]pwa['"][\s\S]{0,320}?import\s*\(\s*['"]([^'"]+)['"]\s*\)/u.exec(
        sourceClient
      )?.[1] ?? '';
    const chemin = moduleRelatif === ''
      ? ''
      : join(RACINE_CLIENT, 'api', moduleRelatif.replace(/\.js$/u, '.ts'));

    expect(moduleRelatif, 'aucun module de port PWA à inspecter').not.toBe('');
    expect(existsSync(chemin), `module PWA sélectionné mais absent : ${moduleRelatif}`).toBe(true);
    const port = sansCommentaires(existsSync(chemin) ? readFileSync(chemin, 'utf8') : '');
    expect(port, 'un port local navigateur ne doit pas appeler `fetch`').not.toMatch(/\bfetch\s*\(/u);
    expect(port, 'un port local navigateur ne doit pas construire de routes `/api`').not.toMatch(
      /['"`]\/api(?:\/|['"`])/u
    );
  });
});

describe('base SQLite persistante dans le navigateur', () => {
  it('ouvre SQLite sur le VFS `opfs-sahpool`, jamais en mémoire', () => {
    const candidats = sourcesOpfsPwa();

    expect(
      candidats.map(({ fichier }) => relative(RACINE_DEPOT, fichier).replace(/\\/gu, '/')),
      'aucun adaptateur navigateur ne configure le VFS SQLite `opfs-sahpool`'
    ).toHaveLength(1);
    const source = candidats[0]?.source ?? '';
    expect(source, 'la base PWA ne porte aucun nom stable à retrouver après rechargement').toMatch(
      /['"`][^'"`\n]+\.(?:sqlite3?|db)['"`]/iu
    );
    expect(source, 'une base `:memory:` perdrait toute progression au rechargement').not.toContain(
      ':memory:'
    );
  });

  it('garde une seule ouverture partagée dans la composition locale', () => {
    const sourcesLocales = sourcesOpfsPwa().map(({ source }) => source).join('\n');

    expect(
      /(?:base|connexion)Promise\s*\?\?=|\bpromesse(?:Base|Connexion)\s*\?\?=|\bpromesseOuverture\b/iu.test(
        sourcesLocales
      ),
      'chaque appel pourrait rouvrir SQLite ; le contrat impose une connexion unique'
    ).toBe(true);
  });
});

describe('persistance durable demandée au navigateur', () => {
  it('interroge l’état puis demande `navigator.storage.persist()`', () => {
    const sources = TEXTE_SOURCES;
    expect(
      sources,
      'l’application ne sait pas indiquer si le stockage est déjà durable'
    ).toMatch(/navigator\.storage\.persisted\s*\(/u);
    expect(
      sources,
      'l’application ne demande jamais au navigateur de protéger la base contre l’éviction'
    ).toMatch(/navigator\.storage\.persist\s*\(/u);
  });

  it('n’écrit aucune progression dans URL, cookie ou stockage de session', () => {
    const sources = TEXTE_SOURCES;
    const lignesSuspectes = sources
      .split(/\r?\n/u)
      .filter((ligne) => /(?:tentative|progression|profil)/iu.test(ligne))
      .filter((ligne) =>
        /(?:URLSearchParams|location\.(?:hash|search)|document\.cookie|sessionStorage\.setItem)/u.test(
          ligne
        )
      );

    expect(
      lignesSuspectes,
      'des données pédagogiques semblent sortir de la base locale vers URL, cookie ou session'
    ).toEqual([]);
  });
});
