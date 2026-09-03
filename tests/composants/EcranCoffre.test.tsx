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
  it('organise les trois collections dans l’album compact du coffre', async () => {
    await monterEtAttendre();
    const album = document.querySelector('.collections-coffre');
    expect(document.querySelector('[data-ecran="coffre"]')?.classList.contains('ecran-coffre')).toBe(
      true,
    );
    expect(album?.querySelectorAll(':scope > [data-collection-titre]')).toHaveLength(3);
    expect(album?.querySelector('[data-etagere="oui"]')?.getAttribute('data-densite')).toBe(
      'compacte',
    );
  });

  it('accueille l’enfant avec le coffre illustré publié, pas un pictogramme technique', async () => {
    await monterEtAttendre();
    const illustration = document.querySelector<HTMLImageElement>(
      '[data-coffre-illustration="raster"] img',
    );
    expect(illustration).not.toBeNull();
    expect(illustration?.src).toContain('assets/coffre/coffre-ouvert-v1.png');
  });

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

  it('publie le reste réel à découvrir pour chaque collection', async () => {
    await monterEtAttendre();
    const restes = [...document.querySelectorAll('[data-progression-reste="oui"]')];
    expect(restes).toHaveLength(3);
    expect(document.querySelector('[data-etagere="oui"]')?.getAttribute('data-progression-restante')).toBe(
      String(document.querySelector('[data-etagere="oui"]')?.getAttribute('data-cases-vides'))
    );
    expect(document.querySelector('[data-collection-titre="eclats"]')?.getAttribute('data-progression-restante')).toBe(
      String(MONDE.carte.regions.length - nbEclatsAttendus())
    );
    expect(document.querySelector('[data-collection-titre="objets"]')?.getAttribute('data-progression-restante')).toBe(
      String(MONDE.campement.filter((objet) => objet.placeLe === null).length)
    );
  });

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * L'EXIGENCE QUI A SUIVI SES OBJETS — R27, puis l'arbitrage du 2026-08-07
   *
   * Deux collections ont quitté le campement pour le coffre, et le père a tranché les deux :
   *
   *   • R27 — « Dans le coffre, il y a aussi les Gobi. Je pense qu'il faut les laisser dans le
   *     coffre, ça sert à rien de les mettre dans le campement. » (l'étagère)
   *   • 2026-08-07 — « déplace le butin dans le coffre, ce n'est pas grave le défilement dans
   *     cet écran » (le butin)
   *
   * `campement-affordance.test.tsx` exigeait leurs pictogrammes AU CAMPEMENT. L'exiger encore
   * là-bas reviendrait à exiger qu'ils reviennent ; le retirer sans plus reviendrait à perdre
   * l'exigence avec le déménagement — et **une exigence qui disparaît avec un déménagement
   * n'aurait jamais rien gardé**. Elle se pose donc ICI, sur l'écran qui les rend désormais.
   *
   * Le besoin, lui, n'a pas bougé d'un pouce : un enfant de sept ans qui ne déchiffre pas
   * encore distingue ses collections par leur DESSIN. C'est le même garde, sur un autre écran.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  it('rend le pictogramme de chaque collection qui l’a rejoint (R27, et le butin depuis)', async () => {
    await monterEtAttendre();
    const pictogrammes = [...document.querySelectorAll('[data-pictogramme]')].map((element) =>
      element.getAttribute('data-pictogramme')
    );
    console.log(`[coffre] pictogrammes rendus : ${pictogrammes.join(', ') || 'aucun'}`);
    for (const attendu of ['etagere', 'butin']) {
      expect(
        pictogrammes,
        `« ${attendu} » a déménagé au coffre : son pictogramme doit être rendu ICI, ` +
          'sinon l’exigence a disparu avec le déménagement'
      ).toContain(attendu);
    }
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

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * R28 — LA PRÉVISUALISATION DU COFFRE, ET LES DEUX CONTRATS DE COULEUR QUI Y COHABITENT
   *
   * « Il faudrait aussi du coup dans les Éclats de Pierre et ce que tu as rapporté, bah cette
   * prévisualisation quoi, sans donner les couleurs, parce que ça c'est à deviner. »
   *
   * Le coffre porte TROIS collections, et deux règles opposées sur la même page :
   *
   *     Les formes de Gobi    → la couleur est MONTRÉE   (R24, demandé explicitement)
   *     Les Éclats de Pierre  → la couleur est CACHÉE    (R28, « c'est à deviner »)
   *     Ce que tu as rapporté → la couleur est CACHÉE    (R28)
   *
   * Ce n'est pas une incohérence, c'est la conception : l'étagère donne envie en montrant, le
   * reste en cachant. Mais deux règles opposées dans un même écran DÉRIVENT si rien ne les
   * tient — c'est exactement le genre d'écart qu'aucun outil ne voit. Ces cas les tiennent
   * toutes les deux, côte à côte, pour qu'on ne puisse pas en aligner une sur l'autre par
   * distraction.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  it('R28 — un Éclat NON gagné s’ouvre, et sa couleur reste à deviner', async () => {
    await monterEtAttendre();
    const nonGagne = document.querySelector(
      '[data-collection="eclat"][data-obtenue="non"]'
    );
    expect(nonGagne, 'aucun Éclat non gagné dans la fixture : le cas serait creux').not.toBeNull();

    const silhouetteDeLaCase = nonGagne?.querySelector('path')?.getAttribute('d');
    fireEvent.click(nonGagne!);
    const fiche = document.querySelector('[data-fiche-collection="eclat"]');
    expect(fiche, 'taper un Éclat n’ouvre rien').not.toBeNull();
    expect(
      fiche?.querySelector('[data-fiche-visuel]')?.getAttribute('data-couleur-revelee'),
      'la couleur de l’Éclat est montrée : elle devait rester à deviner'
    ).toBe('non');
    expect(fiche?.querySelector('[data-couleur-a-deviner]')).not.toBeNull();
    expect(
      fiche?.querySelector('[data-promesse-couleur]'),
      'la fiche promet la couleur comme le fait l’étagère de Gobi : ce n’est pas le même contrat'
    ).toBeNull();
    expect(
      fiche?.querySelector('path')?.getAttribute('d'),
      'la fiche remplace la silhouette régionale par un cristal générique'
    ).toBe(silhouetteDeLaCase);
  });

  it('R28 — un objet rapporté s’ouvre aussi, et dit ce qu’il attend', async () => {
    await monterEtAttendre();
    const piece = document.querySelector('[data-collection="objet"]');
    expect(piece).not.toBeNull();
    fireEvent.click(piece!);

    const fiche = document.querySelector('[data-fiche-collection="objet"]');
    expect(fiche).not.toBeNull();
    expect(fiche?.textContent ?? '').toMatch(/campement/iu);
  });

  it('AUCUN mot d’échec dans une fiche du coffre, gagnée ou non (R14)', async () => {
    await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-collection="eclat"]')!);
    const texte = (document.querySelector('[data-fiche-coffre]')?.textContent ?? '').toLowerCase();
    for (const interdit of ['verrou', 'bloqué', 'cadenas', 'raté', 'échec', 'perdu']) {
      expect(texte, `« ${interdit} » n’a rien à faire dans un album`).not.toContain(interdit);
    }
  });

  it('la fiche du coffre se referme — un panneau sans sortie est un piège (D46)', async () => {
    await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-collection="eclat"]')!);
    expect(document.querySelector('[data-fiche-coffre]')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-fermer-fiche]')!);
    expect(
      document.querySelector('[data-fiche-coffre]'),
      'la fiche ne se referme pas : l’enfant est piégé dedans'
    ).toBeNull();
  });
});
