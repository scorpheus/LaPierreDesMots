import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercice, Noeud, Profil, SeuilsCascade } from '@pierre/partage';
import type { RapportReinitialisation } from '@pierre/partage/parent';
import { CATALOGUE_MATHS, type EtatMaths, type ResultatApiMaths } from '@pierre/partage/mathematiques';
import { Application } from '@client/Application';
import { creerMagasin } from '@client/etat/magasin';
import { memoriserProfil, oublierProfil } from '@client/etat/profil-memorise';
import { fermerZoneParent, poserJetonParent } from '@client/api/commun';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { mondeDeTest, profilDeTest } from './donnees-ecrans.js';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, RACINE_DEPOT, habillageEcole,
  lireJson, servicesDeTest } from '../configuration/preparation.js';

const profil = { ...profilDeTest('profil-navigation-maths', 'Alma'),
  generationProgression: 0, generationMaths: 0 } as Profil;
const paquet = { exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
  noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE), habillage: habillageEcole() };
const api = vi.hoisted(() => ({ lireProfil: vi.fn(), lireEtatMaths: vi.fn() }));
const files: QueryClient[] = [];

vi.mock('@client/api/client', async (charger) => {
  const original = await charger<Record<string, unknown>>();
  return {
    ...original,
    lireProfil: api.lireProfil,
    listerProfils: async () => [profil],
    lireMonde: async () => mondeDeTest(),
    lireProgression: async () => [],
    lireReglagesLecture: async () => ({}),
    reprendreTentativesEnAttente: async () => 0,
    composerSortie: async () => ({ profil: profil.id, region: 'clairiere', compagnon: null,
      composeeLe: '2026-09-01T08:00:00.000Z', etapes: [{ rang: 1, role: 'echauffement',
        noeud: paquet.noeud.id, habillage: paquet.habillage.id, competences: [], revisions: [] }] }),
    lirePaquetNoeud: async () => paquet,
    apiMathematiques: { ...(original['apiMathematiques'] as object), lireEtat: api.lireEtatMaths },
  };
});

vi.mock('@client/ecrans/EcranDashboard', () => ({
  EcranDashboard: ({ surProfilReinitialise }: {
    surProfilReinitialise: (rapport: RapportReinitialisation) => Promise<void>;
  }) => <main data-ecran="dashboard">
    <button type="button" onClick={() => void surProfilReinitialise({ profil: profil.id,
      portee: 'maths' } as RapportReinitialisation)}>Effacer les maths</button>
    <button type="button" onClick={() => void surProfilReinitialise({ profil: profil.id,
      portee: 'lecture' } as RapportReinitialisation)}>Effacer la lecture</button>
  </main>,
}));

function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return { ...base, haptique, retour: creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined }) };
}

/** Sert uniquement les assets du dépôt : aucune requête réelle ne participe à l'oracle. */
function installerContenu(): void {
  vi.stubGlobal('fetch', vi.fn(async (entree: unknown): Promise<Response> => {
    const url = String(typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree));
    const chemin = url.split('/api/contenu/assets/')[1] ?? url.split('contenu/')[1];
    if (chemin === undefined) throw new Error(`Appel sortant interdit en test : ${url}`);
    const contenu = readFileSync(join(RACINE_DEPOT, 'contenu', ...chemin.split('/')), 'utf8');
    return new Response(contenu, { status: 200, headers: {
      'content-type': chemin.endsWith('.json') ? 'application/json' : 'image/svg+xml',
    } });
  }));
}

function monter(chemin: string, souvenir: boolean, magasinPrepare?: ReturnType<typeof creerMagasin>,
  servicesPrepares?: ReturnType<typeof services>) {
  window.history.replaceState(null, '', chemin);
  if (souvenir) memoriserProfil(String(profil.id));
  const jeu = servicesPrepares ?? services();
  const magasin = magasinPrepare ?? creerMagasin(jeu, 1,
    lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'));
  const file = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  files.push(file);
  render(<Application magasin={magasin} services={jeu} fileDAttente={file} />);
  return { magasin, file };
}

beforeEach(() => {
  oublierProfil();
  fermerZoneParent();
  window.history.replaceState(null, '', '/');
  installerContenu();
  api.lireProfil.mockReset().mockResolvedValue(profil);
  const carnetVide: ResultatApiMaths<EtatMaths> = { ok: true, valeur: {
    generationMaths: 0, reprise: null, projetSuspendu: null,
    progression: [], projets: [], recompenses: [], tentatives: [],
    preferencesNiveaux: Object.fromEntries(CATALOGUE_MATHS.map((famille) => [famille.id,
      { niveau: 'decouverte', revision: 0 }])) as EtatMaths['preferencesNiveaux'],
  } };
  api.lireEtatMaths.mockReset().mockResolvedValue(carnetVide);
});

afterEach(() => {
  cleanup();
  for (const file of files.splice(0)) file.clear();
  vi.unstubAllGlobals();
  oublierProfil();
  fermerZoneParent();
  window.history.replaceState(null, '', '/');
});

describe('navigation entre lecture et Vallée des Nombres', () => {
  it('ouvre les vrais lieux maths depuis le premier choix de joueur et le campement', async () => {
    const { magasin } = monter('/', false);
    const carteProfil = await waitFor(() => {
      const carte = document.querySelector(`[data-profil="${String(profil.id)}"]`);
      expect(carte).not.toBeNull();
      return carte;
    });
    expect(carteProfil).not.toBeNull();
    fireEvent.click(carteProfil!);
    await waitFor(() => expect(document.querySelector('[data-ecran="campement"]')).not.toBeNull());
    const entree = document.querySelector('[data-campement-sorties="oui"] [data-vers="mathematiques"]');
    expect(entree).not.toBeNull();
    fireEvent.click(entree!);
    await screen.findByTestId('lieux-maths');
    expect(window.location.pathname).toBe('/mathematiques');
    expect(magasin.getState().ecran).toBe('mathematiques');
    expect(document.querySelector('[data-testid="lieu-ponts"]')).not.toBeNull();
  });

  it('rejoint les maths par la destination distincte de la carte sans septième région', async () => {
    const { magasin } = monter('/carte', true);
    await waitFor(() => expect(document.querySelector('[data-ecran="carte"]')).not.toBeNull());
    await waitFor(() => expect(document.querySelector('[data-destination="mathematiques"] [role="button"]')).not.toBeNull());
    expect(mondeDeTest().carte.regions).toHaveLength(6);
    expect(document.querySelector('[data-region="mathematiques"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-destination="mathematiques"] [role="button"]')!);
    await screen.findByTestId('lieux-maths');
    expect(window.location.pathname).toBe('/mathematiques');
    expect(magasin.getState().ecran).toBe('mathematiques');
  });

  it('garde une URL maths directe pendant le chargement du profil, sans rebond d’historique', async () => {
    let resoudre!: (valeur: Profil) => void;
    api.lireProfil.mockReturnValueOnce(new Promise<Profil>((resolution) => { resoudre = resolution; }));
    const chemin = '/mathematiques?source=directe#ponts';
    const { magasin } = monter(chemin, true);
    const longueur = window.history.length;
    await waitFor(() => expect(document.querySelector('[data-ecran="chargement"]')).not.toBeNull());
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(chemin);
    await act(async () => { resoudre(profil); });
    await screen.findByTestId('lieux-maths');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(chemin);
    expect(window.history.length).toBe(longueur);
    expect(magasin.getState().ecran).toBe('mathematiques');
  });

  it('revient au nœud suspendu depuis les maths, avec le même paquet de lecture', async () => {
    const jeu = services();
    const magasin = creerMagasin(jeu, 1,
      lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'));
    magasin.getState().choisirProfil(profil);
    magasin.getState().demarrerNoeud(paquet);
    await magasin.getState().suspendreLecture();
    magasin.getState().naviguer('mathematiques');
    monter('/mathematiques', false, magasin, jeu);
    await screen.findByTestId('lieux-maths');
    expect(document.querySelector('[data-ecran="mathematiques"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la lecture' }));
    await waitFor(() => expect(document.querySelector(`[data-noeud="${String(paquet.noeud.id)}"]`)).not.toBeNull());
    expect(window.location.pathname).toBe('/noeud');
    expect(magasin.getState().paquet).toEqual(paquet);
    expect(magasin.getState().suspenduLeMs).toBeNull();
  });
});

describe('portée de la remise à zéro depuis la zone parent', () => {
  async function monterSessionParent() {
    const jeu = services();
    const magasin = creerMagasin(jeu, 1,
      lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'));
    magasin.getState().choisirProfil(profil);
    magasin.getState().demarrerSortie({ profil: profil.id, region: 'clairiere', compagnon: null,
      composeeLe: '2026-09-01T08:00:00.000Z', etapes: [{ rang: 1, role: 'echauffement',
        noeud: paquet.noeud.id, habillage: paquet.habillage.id, competences: [], revisions: [] }] } as never);
    magasin.getState().demarrerNoeud(paquet);
    await magasin.getState().suspendreLecture();
    const avant = magasin.getState();
    poserJetonParent('jeton-parent-test');
    monter('/parent/dashboard', false, magasin, jeu);
    await screen.findByRole('button', { name: 'Effacer les maths' });
    return { magasin, avant };
  }

  it('maths garde exactement le paquet, le moteur, la sortie et la cascade de lecture', async () => {
    const { magasin, avant } = await monterSessionParent();
    api.lireProfil.mockResolvedValueOnce({ ...profil, generationMaths: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Effacer les maths' }));
    await waitFor(() => expect(magasin.getState().profil?.generationMaths).toBe(1));
    const apres = magasin.getState();
    expect(apres.profil?.generationProgression).toBe(0);
    expect(apres.paquet).toBe(avant.paquet);
    expect(apres.moteur).toBe(avant.moteur);
    expect(apres.etatMoteur).toBe(avant.etatMoteur);
    expect(apres.sortie).toBe(avant.sortie);
    expect(apres.cascade).toBe(avant.cascade);
    expect(apres.suspenduLeMs).toBe(avant.suspenduLeMs);
    expect(window.location.pathname).toBe('/parent/dashboard');
  });

  it('refuse de repartir après un reset maths tant que sa génération n’a pas changé', async () => {
    const { magasin, avant } = await monterSessionParent();
    api.lireProfil.mockResolvedValueOnce(profil);
    fireEvent.click(screen.getByRole('button', { name: 'Effacer les maths' }));
    await screen.findByRole('button', { name: 'Recharger le profil' });
    expect(magasin.getState().profil?.generationMaths).toBe(0);
    expect(magasin.getState().paquet).toBe(avant.paquet);
    api.lireProfil.mockResolvedValueOnce({ ...profil, generationMaths: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Recharger le profil' }));
    await waitFor(() => expect(magasin.getState().profil?.generationMaths).toBe(1));
    expect(magasin.getState().paquet).toBe(avant.paquet);
  });

  it('lecture efface l’ancien nœud et relit seulement la nouvelle génération lecture', async () => {
    const { magasin } = await monterSessionParent();
    api.lireProfil.mockResolvedValueOnce({ ...profil, generationProgression: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la lecture' }));
    await waitFor(() => expect(magasin.getState().profil?.generationProgression).toBe(1));
    const apres = magasin.getState();
    expect(apres.paquet).toBeNull();
    expect(apres.moteur).toBeNull();
    expect(apres.sortie).toBeNull();
    expect(apres.suspenduLeMs).toBeNull();
    expect(apres.erreurRepriseLecture).toBeNull();
    expect(apres.cascade).toEqual(magasin.getInitialState().cascade);
    expect(window.location.pathname).toBe('/parent/dashboard');
  });
});
