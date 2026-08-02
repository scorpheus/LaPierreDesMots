/**
 * `GET /api/audio/manifeste` et `GET /api/audio/*` — lot N2, contrat de finition v3 § 8.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * ⚠ FICHIER AJOUTÉ AU-DELÀ DU § 4.2, et signalé comme tel au rapport de N2.
 *
 * Le contrat confie à N2 une route HTTP (§ 8) mais ne lui accorde AUCUN fichier de test
 * d'API — ses deux seuls tests listés sont `unitaires`. Une route branchée que rien
 * n'exerce, c'est exactement le mode de panne que ce projet a déjà payé une fois : « un
 * détecteur qui déclarait un poids qu'il n'appliquait jamais ». On l'écrit donc, et on le
 * dit, plutôt que de livrer une route sur parole.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * TROIS PROPRIÉTÉS OPPOSABLES, et ce sont les trois qui font tenir D42 côté serveur :
 *   1. **un manifeste absent est un 200, pas un 404.** C'est l'état d'une installation où
 *      `npm run voix` n'a pas tourné, et c'est NORMAL. Un 404 obligerait le client à traiter
 *      un cas d'erreur pour une situation ordinaire, et « on clone, on lance, ça marche »
 *      (D9) ne survit pas à un écran d'erreur au premier démarrage ;
 *   2. **le serveur refiltre sur `SEUIL_QC`.** Le script de rendu l'applique déjà ; cette
 *      ligne-ci est celle qui protège l'oreille de l'enfant le jour où quelqu'un relance le
 *      rendu avec un seuil desserré ;
 *   3. **la route statique ne sert JAMAIS le manifeste brut.** Le servir court-circuiterait
 *      le filtre, donc D42, donc rendrait des boutons pour des clips recalés.
 */
import { describe, expect, it } from 'vitest';

import type { FastifyInstance } from 'fastify';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  DOSSIER_MIGRATIONS, RACINE_DEPOT, aleaDeTest, horlogeDeTest,
} from '../configuration/preparation.js';

interface Montage {
  readonly application: FastifyInstance;
  fermer(): Promise<void>;
}

/**
 * Monte l'application sur un dépôt de contenu EN MÉMOIRE.
 *
 * Les imports sont dynamiques, comme dans `tests/api/contenu.test.ts` : c'est la forme que le
 * lot L-G a retenue pour que le chargement du module serveur n'ait pas lieu avant que la
 * préparation n'ait figé l'horloge.
 */
async function monter(assets: Record<string, unknown>): Promise<Montage> {
  const [{ construireApplication }, { ouvrirBase }, { appliquerMigrations }, factices] =
    await Promise.all([
      import('@serveur/application'),
      import('@serveur/base/connexion'),
      import('@serveur/base/migrations'),
      import('@pierre/partage/factices'),
    ]);

  const base = ouvrirBase(':memory:');
  const horloge = horlogeDeTest();
  appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);

  const application = construireApplication({
    base,
    contenu: new factices.DepotContenuMemoire({
      noeuds: [],
      exercices: [],
      habillages: [],
      assets,
    }),
    horloge,
    alea: aleaDeTest(),
    racineClient: null,
  });
  await application.ready();

  return {
    application,
    async fermer() {
      await application.close();
      base.close();
    },
  };
}

const CLIP = {
  cle: 'clairiere-ecole-01/c1',
  rendu: 'normal',
  locuteur: 'narrateur',
  texte: 'Le pull de la maîtresse est bleu.',
  fichier: 'audio/clairiere/clairiere-ecole-01-c1.normal.deadbeef.opus',
  dureeMs: 2400,
  octets: 9600,
  empreinteTexte: 'f'.repeat(64),
  qcScore: 0.97,
};

function manifesteAvec(...clips: readonly Record<string, unknown>[]): string {
  return JSON.stringify({
    version: 1,
    genereLe: '2026-09-01T08:00:00.000Z',
    moteurTts: 'piper/2023.11.14-2',
    clips,
  });
}

describe('GET /api/audio/manifeste', () => {
  it('rend un manifeste VIDE et 200 quand le rendu des voix n’a pas tourné', async () => {
    const montage = await monter({});
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/manifeste',
    });
    expect(reponse.statusCode).toBe(200);
    expect((reponse.json() as { clips: unknown[] }).clips).toEqual([]);
    await montage.fermer();
  });

  it('rend les clips livrés', async () => {
    const montage = await monter({ 'audio/manifeste.json': manifesteAvec(CLIP) });
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/manifeste',
    });
    expect(reponse.statusCode).toBe(200);
    expect((reponse.json() as { clips: { cle: string }[] }).clips.map((c) => c.cle)).toEqual([
      'clairiere-ecole-01/c1',
    ]);
    await montage.fermer();
  });

  it('ÉCARTE un clip sous SEUIL_QC — un clip inintelligible est pire qu’un bouton absent', async () => {
    const montage = await monter({
      'audio/manifeste.json': manifesteAvec(CLIP, {
        ...CLIP,
        cle: 'clairiere-ecole-01/c2',
        qcScore: 0.4,
      }),
    });
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/manifeste',
    });
    expect((reponse.json() as { clips: { cle: string }[] }).clips.map((c) => c.cle)).toEqual([
      'clairiere-ecole-01/c1',
    ]);
    await montage.fermer();
  });

  it('rend un manifeste vide et 200 quand le fichier est illisible — muet, jamais cassé', async () => {
    const montage = await monter({ 'audio/manifeste.json': '{ ceci n’est pas du json' });
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/manifeste',
    });
    expect(reponse.statusCode).toBe(200);
    expect((reponse.json() as { clips: unknown[] }).clips).toEqual([]);
    await montage.fermer();
  });
});

describe('GET /api/audio/* — les clips', () => {
  it('sert le clip avec son type MIME et un cache IMMUABLE', async () => {
    // Le nom de fichier porte l'empreinte du texte (§ 8) : un texte corrigé produit un nom
    // différent, donc `immutable` ne peut jamais servir une consigne périmée à l'enfant.
    const montage = await monter({ 'audio/clairiere/essai.opus': 'OggS' });
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/clairiere/essai.opus',
    });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.headers['content-type']).toContain('audio/opus');
    expect(String(reponse.headers['cache-control'])).toContain('immutable');
    await montage.fermer();
  });

  it('refuse de servir le manifeste BRUT — cela court-circuiterait le filtre de D42', async () => {
    const montage = await monter({ 'audio/manifeste.json': manifesteAvec(CLIP) });
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/manifeste.json',
    });
    expect(reponse.statusCode).toBe(404);
    await montage.fermer();
  });

  it('rend 404 et un `ErreurApi` sur un clip absent, jamais une page HTML', async () => {
    const montage = await monter({});
    const reponse = await montage.application.inject({
      method: 'GET',
      url: '/api/audio/clairiere/rien.opus',
    });
    expect(reponse.statusCode).toBe(404);
    expect(reponse.json()).toHaveProperty('code');
    await montage.fermer();
  });
});

describe('la route lit le VRAI disque, pas seulement un dépôt en mémoire', () => {
  it('sert le manifeste réel de `contenu/audio/` quand il existe', async () => {
    // ══════════════════════════════════════════════════════════════════════════════════════
    // Les cas ci-dessus montent l'application sur `DepotContenuMemoire`. Ils prouvent la
    // LOGIQUE de la route et rien de son branchement au disque : un `lireAsset` qui
    // chercherait `manifeste.json` au lieu de `audio/manifeste.json` les passerait tous.
    //
    // Ce cas-ci monte le dépôt DISQUE, celui que `demarrer.bat` utilise.
    //
    // Il est TOLÉRANT À L'ABSENCE, et c'est voulu : `contenu/audio/` est gitignoré
    // (« artefacts de build, régénérables depuis `production/voix.lock.json` »), donc un clone
    // frais n'en a pas. Les deux branches assertent quelque chose de vrai — le manifeste
    // réel est servi, ou bien le manifeste VIDE l'est. Aucune ne passe par complaisance.
    // ══════════════════════════════════════════════════════════════════════════════════════
    const [{ creerDepotContenuDisque }, { construireApplication }, { ouvrirBase }, { appliquerMigrations }] =
      await Promise.all([
        import('@serveur/services/depot-contenu-disque'),
        import('@serveur/application'),
        import('@serveur/base/connexion'),
        import('@serveur/base/migrations'),
      ]);

    const base = ouvrirBase(':memory:');
    const horloge = horlogeDeTest();
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
    const application = construireApplication({
      base,
      contenu: creerDepotContenuDisque(join(RACINE_DEPOT, 'contenu')),
      horloge,
      alea: aleaDeTest(),
      racineClient: null,
    });
    await application.ready();

    const reponse = await application.inject({ method: 'GET', url: '/api/audio/manifeste' });
    expect(reponse.statusCode).toBe(200);
    const servi = reponse.json() as { clips: { cle: string; fichier: string }[] };

    const surDisque = existsSync(join(RACINE_DEPOT, 'contenu', 'audio', 'manifeste.json'));
    if (!surDisque) {
      // `npm run voix` n'a pas tourné : muet, honnête, jouable.
      expect(servi.clips).toEqual([]);
      await application.close();
      base.close();
      return;
    }

    expect(servi.clips.length).toBeGreaterThan(0);

    // Et le premier clip promis est RÉELLEMENT servi, avec son cache immuable.
    const premier = servi.clips[0];
    expect(premier).toBeDefined();
    const clip = await application.inject({
      method: 'GET',
      url: `/api/audio/${(premier as { fichier: string }).fichier.replace(/^audio\//u, '')}`,
    });
    expect(clip.statusCode, `le manifeste promet ${String((premier as { fichier: string }).fichier)}`).toBe(200);
    expect(clip.rawPayload.length).toBeGreaterThan(512);
    expect(String(clip.headers['cache-control'])).toContain('immutable');

    await application.close();
    base.close();
  });
});
