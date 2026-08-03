/**
 * LE COFFRE AUX COLLECTIONS, MONTÉ — `data-ecran="coffre"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « une sortie existe ». Ce fichier en garde une seconde, et elle est
 * la raison d'être de l'écran : **le vide se MONTRE, il ne se cache pas.**
 *
 * « Ce qui n'est pas encore obtenu est affiché en creux, jamais caché : montrer le vide restant
 * est le moteur de retour du jeu ; le cacher le supprimerait » (`EcranCoffre.tsx`, en-tête).
 * C'est aussi le défaut que le lot N6 a réparé — `formes.map(...)` ne rendait que les formes
 * gagnées, et les vingt-deux cases restantes n'existaient nulle part.
 *
 * Un test qui compterait « au moins une case » laisserait revenir exactement ce défaut. On
 * compte donc **les cases obtenues ET les cases en creux**, et on exige les deux comptes.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Le catalogue des formes vient du DISQUE (`contenu/monde/gobi-stades.json`) : l'étagère lit
 * ce fichier par `fetch`, et une étagère sans catalogue est vide — donc verte à bon compte.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EcranCoffre, NOM_DE_REGION } from '@client/ecrans/EcranCoffre';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import { RACINE_DEPOT, servicesDeTest } from '../configuration/preparation.js';
import { mondeDeTest, nbEclatsAttendus, profilDeTest } from './donnees-ecrans.js';
import { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } from './exigences-ecrans.js';

const MONDE = mondeDeTest();

function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined
    })
  };
}

function installerFetchLocal(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown): Promise<Response> => {
      const url = String(
        typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree)
      );
      const apres = url.split('/api/contenu/assets/')[1] ?? url.split('contenu/')[1];
      if (apres === undefined) {
        throw new Error(`appel sortant interdit en test : ${url}`);
      }
      return new Response(readFileSync(join(RACINE_DEPOT, 'contenu', ...apres.split('/')), 'utf8'), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    })
  );
}

interface Monte {
  readonly retours: number[];
}

function monter(): Monte {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.setState({ profil: profilDeTest() } as never);
  const retours: number[] = [];
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        {/* Le monde est INJECTÉ : `ProprietesEcranCoffre.monde` existe pour ça, et l'écran ne
            fait alors aucune requête de monde. On ne teste pas la route ici. */}
        <EcranCoffre monde={MONDE} surRetour={() => retours.push(1)} />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return { retours };
}

/** L'étagère n'a ses cases qu'une fois le catalogue lu : on attend l'état, pas une durée. */
async function monterEtAttendre(): Promise<Monte> {
  const monte = monter();
  await waitFor(() => {
    expect(document.querySelectorAll('[data-collection="eclat"]').length).toBeGreaterThan(0);
  });
  return monte;
}

beforeEach(() => {
  installerFetchLocal();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('rien ne sort jamais du coffre, et le vide se montre (R14, D25)', () => {
  it('rend une case d’Éclat par région — les obtenues ET les autres', async () => {
    await monterEtAttendre();
    const cases = document.querySelectorAll('[data-collection="eclat"]');
    const obtenues = document.querySelectorAll('[data-collection="eclat"][data-obtenue="oui"]');
    const enCreux = document.querySelectorAll('[data-collection="eclat"][data-obtenue="non"]');
    console.log(
      `[QA-2 · coffre] Éclats — cases : ${String(cases.length)}, obtenus : ` +
        `${String(obtenues.length)}, en creux : ${String(enCreux.length)}`
    );
    expect(cases.length, 'une région n’a pas sa case d’Éclat').toBe(MONDE.carte.regions.length);
    expect(MONDE.carte.regions.length, 'le monde de test a perdu ses régions').toBeGreaterThan(0);
    expect(obtenues.length, 'les Éclats obtenus ne suivent pas le monde servi').toBe(
      nbEclatsAttendus()
    );
    // LE CAS QUI ATTRAPE LE DÉFAUT DE N6 : sans les cases en creux, le coffre ne donne plus
    // aucune raison d'y revenir.
    expect(enCreux.length, 'aucune case en creux : le vide restant a disparu').toBeGreaterThan(0);
  });

  it('rend une case d’objet par objet du campement, placé ou non', async () => {
    await monterEtAttendre();
    expect(document.querySelectorAll('[data-collection="objet"]')).toHaveLength(
      MONDE.campement.length
    );
    expect(
      document.querySelectorAll('[data-collection="objet"][data-obtenue="non"]').length
    ).toBe(MONDE.campement.filter((objet) => objet.placeLe === null).length);
  });

  it('nomme les régions en FRANÇAIS lisible, jamais par leur identifiant technique', async () => {
    await monterEtAttendre();
    // Le défaut du lot M8 : l'enfant lisait « cite-des-histoires ». Un identifiant n'est pas
    // un mot, et c'est justement l'écran qui doit donner envie d'y retourner.
    const texte = document.body.textContent ?? '';
    expect(texte).toContain(NOM_DE_REGION['cite-des-histoires']);
    expect(texte, 'un identifiant technique est affiché à l’enfant').not.toMatch(
      /cite-des-histoires|marais-jumeau|foret-muette/u
    );
  });

  it('les trois collections sont là, chacune sous son titre', async () => {
    await monterEtAttendre();
    const titres = [...document.querySelectorAll('[data-collection-titre]')].map((section) =>
      section.getAttribute('data-collection-titre')
    );
    expect(titres).toEqual(['formes', 'eclats', 'objets']);
  });

  it('aucune case n’est désactivée ni retirée : un acquis n’est jamais repris (R14)', async () => {
    await monterEtAttendre();
    for (const boite of document.querySelectorAll('[data-piece]')) {
      expect(boite.hasAttribute('disabled'), `${boite.getAttribute('data-piece')} désactivée`)
        .toBe(false);
    }
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    let dernier: Monte | null = null;
    const rapport = await exigerUneSortieQuiRepond(
      'coffre',
      async () => {
        dernier = await monterEtAttendre();
        return {
          racine: document.body,
          aQuitte: () => dernier !== null && dernier.retours.length > 0
        };
      },
      cleanup
    );
    // Une seule sortie, et c'est bien : le coffre est un album, pas un menu.
    expect(rapport.repondent).toHaveLength(1);
    expect(rapport.repondent[0]).toContain('data-vers="campement"');
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', async () => {
    await monterEtAttendre();
    const rapport = exigerCibles64('coffre', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(1);
  });

  it('le retour appelle son rappel, une fois, sans rien changer d’autre', async () => {
    const { retours } = await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-vers="campement"]')!);
    expect(retours).toHaveLength(1);
  });
});
