import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import {
  POLICES_LOCALES_REQUISES,
  archiverOrphelins,
  verifierRessourcesLocales,
} from '../../scripts/verifier-ressources-locales.mjs';

const RACINE_PROJET = path.resolve(import.meta.dirname, '../..');
const DOSSIER_ESSAIS = path.join(RACINE_PROJET, 'bac-a-sable');
const SCRIPT = path.join(RACINE_PROJET, 'scripts', 'verifier-ressources-locales.mjs');
const dossiersCrees: string[] = [];

type Clip = {
  cle: string;
  rendu: string;
  locuteur: string;
  texte?: string;
  fichier: string;
  dureeMs: number;
  octets?: number;
  empreinteTexte: string;
  qcScore: number;
};

function ecrireJson(chemin: string, valeur: unknown): void {
  mkdirSync(path.dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(valeur, null, 2)}\n`, 'utf8');
}

function creerFixture(): { racine: string; clip: Clip } {
  mkdirSync(DOSSIER_ESSAIS, { recursive: true });
  const racine = mkdtempSync(path.join(DOSSIER_ESSAIS, 'ressources-locales-'));
  dossiersCrees.push(racine);

  for (const police of POLICES_LOCALES_REQUISES) {
    const destination = path.join(racine, 'client', 'public', 'polices', police);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, police);
  }

  const donneesAudio = Buffer.from('opus-valide');
  const clip: Clip = {
    cle: 'clairiere/exemple',
    rendu: 'normal',
    locuteur: 'narrateur',
    texte: 'Écoute.',
    fichier: 'audio/clairiere/exemple.normal.empreinte.opus',
    dureeMs: 900,
    octets: donneesAudio.byteLength,
    empreinteTexte: 'a'.repeat(64),
    qcScore: 1,
  };
  const fichierAudio = path.join(racine, 'contenu', clip.fichier);
  mkdirSync(path.dirname(fichierAudio), { recursive: true });
  writeFileSync(fichierAudio, donneesAudio);

  ecrireJson(path.join(racine, 'contenu', 'audio', 'manifeste.json'), {
    version: 1,
    genereLe: '2026-09-05T00:00:00.000Z',
    moteurTts: 'moteur-test',
    clips: [clip],
  });
  ecrireJson(path.join(racine, 'production', 'voix.lock.json'), {
    genereLe: '2026-09-05T00:00:00.000Z',
    moteurTts: 'moteur-test',
    comptes: { clipsAuManifeste: 1 },
    clips: [{ ...clip, texte: undefined, octets: undefined }],
  });
  return { racine, clip };
}

afterEach(() => {
  for (const dossier of dossiersCrees.splice(0)) {
    rmSync(dossier, { recursive: true, force: true });
  }
});

describe('prévol des ressources locales de livraison', () => {
  it('accepte un inventaire sain dont manifeste, verrou, clips et polices concordent exactement', () => {
    const { racine } = creerFixture();

    expect(verifierRessourcesLocales(racine)).toEqual({
      clips: 1,
      fichiersAudio: 1,
      polices: POLICES_LOCALES_REQUISES.length,
    });
  });

  it('nomme chaque ressource manquante et explique comment restaurer le clone', () => {
    const { racine, clip } = creerFixture();
    rmSync(path.join(racine, 'client', 'public', 'polices', POLICES_LOCALES_REQUISES[0]!));
    rmSync(path.join(racine, 'contenu', clip.fichier));

    expect(() => verifierRessourcesLocales(racine)).toThrow(
      /andika-regular\.woff2[\s\S]*exemple\.normal\.empreinte\.opus[\s\S]*telecharger-polices\.mjs[\s\S]*rendre-voix\.mjs/u,
    );
  });

  it('refuse une divergence précise entre le manifeste livré et le verrou de production', () => {
    const { racine, clip } = creerFixture();
    ecrireJson(path.join(racine, 'production', 'voix.lock.json'), {
      genereLe: '2026-09-05T00:00:00.000Z',
      moteurTts: 'moteur-test',
      comptes: { clipsAuManifeste: 1 },
      clips: [{ ...clip, texte: undefined, octets: undefined, locuteur: 'gobi' }],
    });

    expect(() => verifierRessourcesLocales(racine)).toThrow(
      /clairiere\/exemple\|normal.*locuteur.*narrateur.*gobi/u,
    );
  });

  it('refuse un Opus orphelin sans le supprimer', () => {
    const { racine } = creerFixture();
    const orphelin = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(orphelin, 'ancien');

    expect(() => verifierRessourcesLocales(racine)).toThrow(/audio\/ancien\.opus.*orphelin/u);
    expect(() => verifierRessourcesLocales(racine)).toThrow(/ne supprime aucun fichier/u);
  });

  it('rend le code 1 en CLI lorsqu’une ressource manque', () => {
    const { racine, clip } = creerFixture();
    rmSync(path.join(racine, 'contenu', clip.fichier));

    const resultat = spawnSync(process.execPath, [SCRIPT, '--racine', racine], {
      encoding: 'utf8',
      windowsHide: true,
    });

    expect(resultat.status).toBe(1);
    expect(`${resultat.stdout}${resultat.stderr}`).toContain(clip.fichier);
  });

  it('archive explicitement les orphelins avec un manifeste réversible puis rend le prévol vert', () => {
    const { racine } = creerFixture();
    const source = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(source, 'ancien');

    expect(archiverOrphelins(racine)).toMatchObject({ fichiers: 1, octets: 6 });

    const archive = path.join(racine, 'bac-a-sable', 'archives-audio-2026-09-05');
    const destination = path.join(archive, 'fichiers', 'contenu', 'audio', 'ancien.opus');
    const manifeste = JSON.parse(readFileSync(path.join(archive, 'manifeste.json'), 'utf8')) as {
      fichiers: Array<{ source: string; destination: string; octets: number; sha256: string }>;
    };
    expect(existsSync(source)).toBe(false);
    expect(readFileSync(destination, 'utf8')).toBe('ancien');
    expect(manifeste.fichiers).toEqual([
      {
        source: 'contenu/audio/ancien.opus',
        destination:
          'bac-a-sable/archives-audio-2026-09-05/fichiers/contenu/audio/ancien.opus',
        octets: 6,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      },
    ]);
    expect(verifierRessourcesLocales(racine)).toEqual({
      clips: 1,
      fichiersAudio: 1,
      polices: POLICES_LOCALES_REQUISES.length,
    });
  });

  it('interdit tout archivage si une anomalie autre que les orphelins existe', () => {
    const { racine } = creerFixture();
    const orphelin = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(orphelin, 'ancien');
    rmSync(path.join(racine, 'client', 'public', 'polices', POLICES_LOCALES_REQUISES[0]!));

    expect(() => archiverOrphelins(racine)).toThrow(
      /archivage refusé[\s\S]*police locale absente/iu,
    );
    expect(existsSync(orphelin)).toBe(true);
    expect(
      existsSync(path.join(racine, 'bac-a-sable', 'archives-audio-2026-09-05')),
    ).toBe(false);
  });

  it('refuse un écrasement avant de déplacer le moindre fichier', () => {
    const { racine } = creerFixture();
    const premier = path.join(racine, 'contenu', 'audio', 'a.opus');
    const second = path.join(racine, 'contenu', 'audio', 'b.opus');
    writeFileSync(premier, 'a');
    writeFileSync(second, 'b');
    const collision = path.join(
      racine,
      'bac-a-sable',
      'archives-audio-2026-09-05',
      'fichiers',
      'contenu',
      'audio',
      'b.opus',
    );
    mkdirSync(path.dirname(collision), { recursive: true });
    writeFileSync(collision, 'à conserver');

    expect(() => archiverOrphelins(racine)).toThrow(/écrasement refusé/iu);
    expect(readFileSync(premier, 'utf8')).toBe('a');
    expect(readFileSync(second, 'utf8')).toBe('b');
    expect(readFileSync(collision, 'utf8')).toBe('à conserver');
  });

  it('conserve une ancienne archive quand un nouveau lot vocal doit être rangé', () => {
    const { racine } = creerFixture();
    const source = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(source, 'première voix');
    archiverOrphelins(racine);
    const ancienManifeste = path.join(racine, 'bac-a-sable', 'archives-audio-2026-09-05', 'manifeste.json');
    const avant = readFileSync(ancienManifeste, 'utf8');
    writeFileSync(source, 'deuxième voix');
    const resultat = spawnSync(process.execPath,
      [SCRIPT, '--racine', racine, '--archiver-orphelins', '--lot-archive', '2026-09-06-cloture'],
      { encoding: 'utf8', windowsHide: true });
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(readFileSync(ancienManifeste, 'utf8')).toBe(avant);
    const nouveau = path.join(racine, 'bac-a-sable', 'archives-audio-2026-09-06-cloture', 'fichiers', 'contenu', 'audio', 'ancien.opus');
    expect(readFileSync(nouveau, 'utf8')).toBe('deuxième voix');
    expect(existsSync(source)).toBe(false);
    expect(verifierRessourcesLocales(racine)).toMatchObject({ clips: 1, fichiersAudio: 1 });
  });

  it('refuse un lot d’archive qui contient un chemin', () => {
    const { racine } = creerFixture();
    const source = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(source, 'à garder');
    expect(() => archiverOrphelins(racine, '../../sortie')).toThrow(/lot.*invalide/iu);
    expect(readFileSync(source, 'utf8')).toBe('à garder');
  });

  it('n’archive depuis la CLI qu’avec le drapeau explicite', () => {
    const { racine } = creerFixture();
    const orphelin = path.join(racine, 'contenu', 'audio', 'ancien.opus');
    writeFileSync(orphelin, 'ancien');

    const sansDrapeau = spawnSync(process.execPath, [SCRIPT, '--racine', racine], {
      encoding: 'utf8',
      windowsHide: true,
    });
    expect(sansDrapeau.status).toBe(1);
    expect(existsSync(orphelin)).toBe(true);

    const avecDrapeau = spawnSync(
      process.execPath,
      [SCRIPT, '--racine', racine, '--archiver-orphelins'],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(avecDrapeau.status).toBe(0);
    expect(avecDrapeau.stdout).toMatch(/1 Opus orphelin.*6 octets/u);
    expect(existsSync(orphelin)).toBe(false);
  });
});
