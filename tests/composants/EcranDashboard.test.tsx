/**
 * LE DASHBOARD PARENT, MONTÉ — `data-ecran="dashboard"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « les chiffres affichés viennent de la réponse, pas d'un défaut »
 *
 * C'est la propriété la plus facile à perdre sans que rien ne le dise. Un dashboard qui
 * afficherait des zéros — ou pire, des valeurs de repli plausibles — reste vert partout : le
 * parcours E2E le traverse, axe-core le trouve accessible, la capture visuelle est stable. Et
 * le parent lit des chiffres qui ne parlent pas de son enfant.
 *
 * La méthode est donc la même qu'aux étoiles (M24) : on SERT deux réponses différentes et on
 * exige deux rendus différents. Un défaut constant échoue sur la seconde.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠ CET ÉCRAN EST HORS DU MONDE DE L'ENFANT — il n'emprunte ni le magasin de session, ni les
 * écrans de jeu (son propre en-tête). Il se monte donc SANS `FournisseurJeu` : lui en donner
 * un ici laisserait croire à une dépendance qui n'existe pas, et masquerait le jour où elle
 * apparaîtrait pour de vrai.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardParent } from '@client/api/client';

/** Deux réponses NETTEMENT différentes : c'est leur écart qui rend le test capable d'échouer. */
const REPONSE_A: DashboardParent = {
  latences: [
    { jour: '2026-08-28', competence: 'ou', medianeMs: 2400, q1Ms: 1800, q3Ms: 3200, nbMesures: 12 },
    { jour: '2026-08-29', competence: 'ou', medianeMs: 2100, q1Ms: 1600, q3Ms: 2900, nbMesures: 9 }
  ],
  confusions: [
    {
      attendu: 'b',
      rendu: 'd',
      axe: 'gauche-droite',
      nbOccurrences: 7,
      latenceMedianeMs: 3100,
      tendance14j: -0.2,
      competences: ['b-d']
    }
  ],
  couverture: [
    {
      region: 'clairiere',
      pourcentageColorie: 1,
      maitriseMoyenne: 0.4,
      competencesAcquises: 2,
      competencesTotal: 5,
      colorieMaisFragile: true
    },
    {
      region: 'galeries',
      pourcentageColorie: 0.4,
      maitriseMoyenne: 0.4,
      competencesAcquises: 2,
      competencesTotal: 5,
      colorieMaisFragile: false
    }
  ],
  relecture: [
    {
      exercice: 'clairiere-ecole-02',
      chemin: 'contenu/brouillons/clairiere/ecole-02.json',
      statut: 'en-attente',
      deposeeLe: '2026-08-30T09:00:00.000Z',
      traiteeLe: null,
      motif: null
    }
  ],
  confusionsEcartees: 3
} as unknown as DashboardParent;

const REPONSE_B: DashboardParent = {
  latences: [
    { jour: '2026-08-31', competence: 'ch', medianeMs: 900, q1Ms: 700, q3Ms: 1200, nbMesures: 30 }
  ],
  confusions: [],
  couverture: [
    {
      region: 'volcan',
      pourcentageColorie: 0.1,
      maitriseMoyenne: 0.1,
      competencesAcquises: 0,
      competencesTotal: 4,
      colorieMaisFragile: false
    }
  ],
  relecture: [],
  confusionsEcartees: 0
} as unknown as DashboardParent;

let reponse: DashboardParent = REPONSE_A;
let dashboardEnErreur = false;
const fermetures: number[] = [];

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    lireDashboardParent: () =>
      dashboardEnErreur
        ? Promise.reject(new Error('la Pierre ne répond pas'))
        : Promise.resolve(reponse),
    lireGalerieParent: () =>
      Promise.resolve({ entrees: [], moteursParCompetence: {}, habillagesParMoteur: {} }),
    lireEtatProfilParent: () =>
      Promise.resolve({ profil: 'prf-1', prenom: 'Alma', regions: [], tentatives: 0 }),
    fermerZoneParent: () => {
      fermetures.push(1);
    }
  };
});

const { EcranDashboard } = await import('@client/ecrans/EcranDashboard');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

const sorties: number[] = [];

function monter(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EcranDashboard
        profil={'prf-1' as never}
        prenom="Alma"
        surSortie={() => sorties.push(1)}
        surGaleriePleinEcran={() => sorties.push(2)}
      />
    </QueryClientProvider>
  );
}

async function monterEtAttendre(): Promise<void> {
  monter();
  await waitFor(() => {
    expect(document.querySelector('[data-indicateur="latence"]')).not.toBeNull();
  });
}

beforeEach(() => {
  reponse = REPONSE_A;
  dashboardEnErreur = false;
  sorties.length = 0;
  fermetures.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('', { status: 404 })))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('les chiffres viennent de la RÉPONSE, jamais d’un défaut', () => {
  it('rend un point de latence par jour servi — et le compte change avec la réponse', async () => {
    await monterEtAttendre();
    const premiers = document.querySelectorAll('[data-point-latence]').length;
    cleanup();

    reponse = REPONSE_B;
    await monterEtAttendre();
    const seconds = document.querySelectorAll('[data-point-latence]').length;

    console.log(`[QA-2 · dashboard] points de latence : réponse A → ${String(premiers)}, ` +
      `réponse B → ${String(seconds)}`);
    expect(premiers).toBe(REPONSE_A.latences.length);
    expect(seconds).toBe(REPONSE_B.latences.length);
    expect(premiers, 'le nombre de points ne bouge pas : chiffre en dur ?').not.toBe(seconds);
  });

  it('rend une ligne de couverture par région servie, et nomme celle qui est fragile', async () => {
    await monterEtAttendre();
    const regions = [...document.querySelectorAll('[data-couverture-region]')].map((ligne) =>
      ligne.getAttribute('data-couverture-region')
    );
    expect(regions).toEqual(['clairiere', 'galeries']);
    // `colorieMaisFragile` est LE drapeau utile de cette carte : colorié à 100 %, maîtrisé à
    // 40 %. Le perdre rendrait la carte flatteuse et inutile.
    expect(document.querySelector('[data-couverture-fragile="oui"]')).not.toBeNull();
  });

  it('rend les confusions servies, avec leur axe — et rien quand il n’y en a pas', async () => {
    await monterEtAttendre();
    expect(document.querySelectorAll('[data-confusion-axe]')).toHaveLength(1);
    expect(document.querySelector('[data-confusion-axe]')?.getAttribute('data-confusion-axe'))
      .toBe('gauche-droite');
    expect(
      document.querySelector('[data-confusions-ecartees]')?.getAttribute('data-confusions-ecartees')
    ).toBe('3');
    cleanup();

    reponse = REPONSE_B;
    await monterEtAttendre();
    expect(document.querySelectorAll('[data-confusion-axe]')).toHaveLength(0);
  });

  it('rend la file de relecture servie, exercice par exercice', async () => {
    await monterEtAttendre();
    const entrees = [...document.querySelectorAll('[data-relecture]')].map((ligne) =>
      ligne.getAttribute('data-relecture')
    );
    expect(entrees).toContain('clairiere-ecole-02');
  });

  it('quand la réponse n’arrive pas, il le DIT et propose de réessayer — jamais un zéro', async () => {
    dashboardEnErreur = true;
    monter();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Les données n’arrivent pas');
    });
    // Le pire défaut serait d'afficher une courbe vide comme si elle disait quelque chose.
    expect(document.querySelectorAll('[data-point-latence]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});

describe('les trois onglets, et la porte qui referme la zone parent', () => {
  it('déclare trois onglets nommés, un seul sélectionné', async () => {
    await monterEtAttendre();
    const onglets = [...document.querySelectorAll('[data-onglet-parent]')].map((onglet) =>
      onglet.getAttribute('data-onglet-parent')
    );
    console.log(`[QA-2 · dashboard] onglets : ${onglets.join(', ')}`);
    expect(onglets).toEqual(['suivi', 'galerie', 'profil']);
    expect(document.querySelectorAll('[data-onglet-actif="oui"]')).toHaveLength(1);
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('changer d’onglet change le panneau, et un seul panneau vit à la fois', async () => {
    await monterEtAttendre();
    expect(document.querySelector('#panneau-suivi')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-onglet-parent="profil"]')!);
    expect(document.querySelector('#panneau-suivi')).toBeNull();
    await waitFor(() => {
      expect(document.querySelector('#panneau-profil')).not.toBeNull();
    });
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
  });

  it('fermer l’espace parent RETIRE le jeton avant de rendre la main', async () => {
    await monterEtAttendre();
    fireEvent.click(document.querySelector('button.cible-secondaire')!);
    // L'ordre compte : un rappel appelé sans `fermerZoneParent` laisserait la zone parent
    // ouverte derrière l'écran fermé.
    expect(fermetures).toHaveLength(1);
    expect(sorties).toEqual([1]);
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    const rapport = await exigerUneSortieQuiRepond(
      'dashboard',
      async () => {
        await monterEtAttendre();
        return {
          racine: document.body,
          aQuitte: () => sorties.length > 0
        };
      },
      () => {
        sorties.length = 0;
        fermetures.length = 0;
        cleanup();
      }
    );
    expect(rapport.repondent.length).toBeGreaterThanOrEqual(1);
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', async () => {
    await monterEtAttendre();
    const rapport = exigerCibles64('dashboard', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(4);
  });
});
