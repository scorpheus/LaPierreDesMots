/**
 * Gardes rouges de la livraison PWA sur GitHub Pages.
 *
 * Ces cas portent uniquement sur des sources et de la configuration : ils ne construisent pas
 * le client et ne contactent aucun service. Ils doivent rougir tant que le mode `pwa`, le
 * manifeste, le service worker et le repli GitHub Pages n'existent pas.
 *
 * Contrat : `Docs/contrat-pwa-github-pages.md` § 4, 6.1, 6.3 et 6.4.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';
import { loadConfigFromFile } from 'vite';

import { RACINE_DEPOT, lireJson, lireTexte } from '../configuration/preparation.js';

const BASE_PAGES = '/LaPierreDesMots/';
const RACINE_CLIENT = join(RACINE_DEPOT, 'client');

interface ManifestePwa {
  readonly name?: string;
  readonly short_name?: string;
  readonly start_url?: string;
  readonly scope?: string;
  readonly display?: string;
  readonly icons?: readonly {
    readonly src?: string;
    readonly sizes?: string;
    readonly purpose?: string;
  }[];
}

function fichiersSous(racine: string): readonly string[] {
  if (!existsSync(racine)) return [];
  const trouves: string[] = [];
  const parcourir = (dossier: string): void => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      if (
        ['android', 'dist', 'dist-autonome', 'dist-pwa', 'dist-test', 'dist-types'].includes(
          entree.name
        )
      ) {
        continue;
      }
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else trouves.push(chemin);
    }
  };
  parcourir(racine);
  return trouves;
}

const SOURCES_CLIENT = fichiersSous(RACINE_CLIENT);

function cheminsRelatifs(fichiers: readonly string[]): readonly string[] {
  return fichiers.map((fichier) => relative(RACINE_DEPOT, fichier).replace(/\\/gu, '/'));
}

function lireSiPresent(fichier: string | undefined): string {
  return fichier === undefined ? '' : readFileSync(fichier, 'utf8');
}

function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

function cheminPublicDuneUrl(url: string, manifeste: string): string | null {
  const sansFragment = url.split(/[?#]/u, 1)[0] ?? '';
  if (/^(?:data:|https?:)/iu.test(sansFragment)) return null;
  if (sansFragment.startsWith(BASE_PAGES)) {
    return join(RACINE_CLIENT, 'public', sansFragment.slice(BASE_PAGES.length));
  }
  if (sansFragment.startsWith('/')) return join(RACINE_CLIENT, 'public', sansFragment.slice(1));
  return join(dirname(manifeste), sansFragment);
}

describe('mode de construction PWA', () => {
  it('expose des commandes dédiées, distinctes du build LAN et du build Android', () => {
    const racine = lireJson<{ readonly scripts?: Readonly<Record<string, string>> }>('package.json');
    const client = lireJson<{ readonly scripts?: Readonly<Record<string, string>> }>(
      'client/package.json'
    );

    expect(
      client.scripts?.['construire:pwa'] ?? '',
      'le client doit sélectionner explicitement Vite avec `--mode pwa`'
    ).toMatch(/vite\s+build\s+--mode\s+pwa/u);
    expect(
      racine.scripts?.['construire:pwa'] ?? '',
      'la racine doit construire le partage puis le livrable PWA sans passer par Fastify'
    ).toMatch(/construire.*@pierre\/partage[\s\S]*construire:pwa.*@pierre\/client/u);
    expect(
      racine.scripts?.['tester:pwa'],
      'la recette locale fidèle à GitHub Pages doit avoir une commande dédiée'
    ).toBeTruthy();
  });

  it('résout réellement `mode=pwa` vers `dist-pwa/` sous la base GitHub Pages', async () => {
    const chargee = await loadConfigFromFile(
      { command: 'build', mode: 'pwa', isSsrBuild: false, isPreview: false },
      join(RACINE_CLIENT, 'vite.config.ts')
    );

    expect(chargee, 'Vite n’a pas pu charger la configuration du client').not.toBeNull();
    expect(
      chargee?.config.base,
      'les modules, polices, SVG et sons ne doivent jamais repartir de la racine du domaine'
    ).toBe(BASE_PAGES);
    expect(
      chargee?.config.build?.outDir,
      'le livrable PWA ne doit écraser ni dist/, ni dist-test/, ni dist-autonome/'
    ).toBe('dist-pwa');
  });
});

describe('manifeste installable', () => {
  it('déclare exactement un manifeste complet et attaché à `/LaPierreDesMots/`', () => {
    const manifestes = SOURCES_CLIENT.filter((fichier) => fichier.endsWith('.webmanifest'));
    expect(
      cheminsRelatifs(manifestes),
      'un unique `.webmanifest` source doit être copié dans le livrable PWA'
    ).toHaveLength(1);
    if (manifestes.length !== 1) return;

    const manifeste = JSON.parse(readFileSync(manifestes[0]!, 'utf8')) as ManifestePwa;
    expect(manifeste.name?.trim().length, 'nom installable absent').toBeGreaterThan(0);
    expect(manifeste.short_name?.trim().length, 'nom court installable absent').toBeGreaterThan(0);
    expect(manifeste.start_url, 'une installation doit repartir dans le sous-chemin du dépôt').toBe(
      BASE_PAGES
    );
    expect(manifeste.scope, 'la PWA ne doit pas revendiquer toute l’origine github.io').toBe(
      BASE_PAGES
    );
    expect(['standalone', 'fullscreen']).toContain(manifeste.display);

    const icones = manifeste.icons ?? [];
    expect(icones.some((icone) => iconeTaille(icone.sizes, 192)), 'icône 192 × 192 absente').toBe(
      true
    );
    expect(icones.some((icone) => iconeTaille(icone.sizes, 512)), 'icône 512 × 512 absente').toBe(
      true
    );
    for (const icone of icones) {
      expect(icone.src, 'une icône du manifeste n’a pas de chemin').toBeTruthy();
      const fichier = cheminPublicDuneUrl(icone.src ?? '', manifestes[0]!);
      if (fichier !== null) {
        expect(existsSync(fichier), `icône déclarée mais absente : ${icone.src ?? '(vide)'}`).toBe(
          true
        );
      }
    }
  });

  it('relie le document HTML au manifeste avec une URL consciente de la base', () => {
    const html = sansCommentaires(lireTexte('client/index.html'));
    const balise = /<link\b[^>]*\brel=["']manifest["'][^>]*>/iu.exec(html)?.[0] ?? '';
    const baliseInverse = /<link\b[^>]*\bhref=["'][^"']+\.webmanifest["'][^>]*\brel=["']manifest["'][^>]*>/iu.exec(
      html
    )?.[0];
    const lien = balise || baliseInverse || '';

    expect(lien, '`index.html` ne relie aucun manifeste').not.toBe('');
    expect(
      lien.includes(BASE_PAGES) || lien.includes('%BASE_URL%'),
      'le manifeste serait cherché à la racine du domaine au lieu du dépôt GitHub Pages'
    ).toBe(true);
  });
});

function iconeTaille(tailles: string | undefined, cote: number): boolean {
  return (tailles ?? '')
    .split(/\s+/u)
    .some((taille) => taille.toLowerCase() === `${String(cote)}x${String(cote)}`);
}

describe('service worker et cache hors ligne', () => {
  const travailleurs = SOURCES_CLIENT.filter((fichier) =>
    /(?:^|[\\/])(?:service[-.]?worker|sw)\.(?:m?[jt]s)$/iu.test(fichier)
  );

  it('ne porte chaque marqueur de construction qu’une seule fois', () => {
    const source = lireSiPresent(travailleurs[0]);

    for (const marqueur of ['__PIERRE_VERSION__', '__PIERRE_BASE__', '__PIERRE_PRECACHE__']) {
      expect(
        source.split(marqueur).length - 1,
        `${marqueur} serait remplacé partiellement et bloquerait la finalisation du build`
      ).toBe(1);
    }
  });

  it('enregistre un service worker sous la base du dépôt', () => {
    const sources = SOURCES_CLIENT.filter((fichier) => /\.[cm]?[jt]sx?$/iu.test(fichier))
      .map((fichier) => sansCommentaires(readFileSync(fichier, 'utf8')))
      .join('\n');

    expect(sources, 'aucun appel à `navigator.serviceWorker.register` dans le client').toMatch(
      /navigator\.serviceWorker\.register\s*\(/u
    );
    expect(
      /serviceWorker\.register\s*\([\s\S]{0,160}(?:import\.meta\.env\.BASE_URL|\/LaPierreDesMots\/)/u.test(
        sources
      ),
      'le service worker doit être enregistré sous la base Vite, pas sous `/`'
    ).toBe(true);
  });

  it('porte les trois phases qui rendent la coquille disponible hors connexion', () => {
    expect(
      cheminsRelatifs(travailleurs),
      'un fichier source de service worker doit être identifiable et auditable'
    ).toHaveLength(1);
    const source = sansCommentaires(lireSiPresent(travailleurs[0]));

    for (const evenement of ['install', 'activate', 'fetch']) {
      expect(
        new RegExp(`addEventListener\\s*\\(\\s*['"]${evenement}['"]`, 'u').test(source),
        `le service worker n’écoute pas l’événement ${evenement}`
      ).toBe(true);
    }
    expect(source, 'aucun cache versionné n’est ouvert').toMatch(/caches\.open\s*\(/u);
    expect(source, 'aucune ressource n’est placée dans le cache').toMatch(
      /(?:addAll|cache\.put|caches\.match)\s*\(/u
    );
    expect(
      /\/api(?:\/|['"`])/u.test(source),
      'le mode autonome ne doit jamais mettre en cache une fausse API réseau'
    ).toBe(false);
  });
});

describe('repli des routes profondes sur GitHub Pages', () => {
  it('conserve chemin, recherche et fragment avant de revenir au point d’entrée', () => {
    const repli = join(RACINE_CLIENT, 'public', '404.html');
    expect(existsSync(repli), 'le livrable source ne contient aucun `404.html`').toBe(true);
    const source = sansCommentaires(lireSiPresent(existsSync(repli) ? repli : undefined));

    expect(source, 'le repli ne connaît pas la base GitHub Pages').toContain(BASE_PAGES);
    expect(source, 'la route profonde serait perdue').toMatch(/location\.pathname/u);
    expect(source, 'les paramètres de la route profonde seraient perdus').toMatch(/location\.search/u);
    expect(source, 'le fragment de la route profonde serait perdu').toMatch(/location\.hash/u);
    expect(source, 'le repli ne revient jamais vers le point d’entrée').toMatch(
      /location\.(?:replace|assign)|location\.href\s*=/u
    );
  });

  it('restaure la route demandée avant que le routeur de l’application ne prenne la main', () => {
    const amorcage = [
      lireTexte('client/index.html'),
      ...SOURCES_CLIENT.filter((fichier) => /[\\/]src[\\/].*\.[cm]?[jt]sx?$/iu.test(fichier)).map(
        (fichier) => readFileSync(fichier, 'utf8')
      )
    ]
      .map(sansCommentaires)
      .join('\n');
    const restaurationParSession =
      /sessionStorage\.getItem\s*\(/u.test(amorcage) && /history\.replaceState\s*\(/u.test(amorcage);
    const restaurationParRequete =
      /URLSearchParams|location\.search/u.test(amorcage) && /history\.replaceState\s*\(/u.test(amorcage);

    expect(
      restaurationParSession || restaurationParRequete,
      '`404.html` peut transmettre la route, mais le démarrage ne la restaure jamais avant React'
    ).toBe(true);
  });
});
