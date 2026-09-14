import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profil, SeuilsCascade } from '@pierre/partage';
import { Application } from '@client/Application';
import { creerMagasin } from '@client/etat/magasin';
import { lireProfilMemorise, memoriserProfil, oublierProfil } from '@client/etat/profil-memorise';
import { fermerZoneParent, poserJetonParent } from '@client/api/commun';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const api = vi.hoisted(() => ({
  lireProfil: vi.fn(), lireReglagesLecture: vi.fn(), listerProfils: vi.fn(),
  afficherNoeud: vi.fn(), afficherRecompense: vi.fn(), afficherParent: vi.fn()
}));
vi.mock('@client/api/client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  lireProfil: api.lireProfil, lireReglagesLecture: api.lireReglagesLecture,
  listerProfils: api.listerProfils
}));

// Les mécanismes de navigation et la restauration sont réels. Les écrans sont isolés pour
// détecter leur montage prématuré sans confondre le test avec leurs requêtes ou leurs moteurs.
vi.mock('@client/ecrans/EcranProfils', () => ({
  EcranProfils: () => <main data-testid="profils" data-ecran="profils" />
}));
vi.mock('@client/ecrans/EcranCampement', () => ({
  EcranCampement: ({ surAllerCarte, surAccesParent }: {
    surAllerCarte: () => void; surAccesParent: () => void;
  }) =>
    <main data-testid="campement" data-ecran="campement">
      <button onClick={surAllerCarte}>Ouvrir la carte</button>
      <button onClick={surAccesParent}>Parents</button>
    </main>
}));
vi.mock('@client/ecrans/EcranCarte', () => ({
  EcranCarte: ({ surAllerCampement }: { surAllerCampement: () => void }) =>
    <main data-testid="carte" data-ecran="carte">
      <button onClick={surAllerCampement}>Retour au campement</button>
    </main>
}));
vi.mock('@client/ecrans/EcranCoffre', () => ({
  EcranCoffre: () => <main data-testid="coffre" data-ecran="coffre" />
}));
vi.mock('@client/ecrans/EcranChaudron', () => ({
  EcranChaudron: () => <main data-testid="chaudron" data-ecran="chaudron" />
}));
vi.mock('@client/ecrans/EcranReglagesLecture', () => ({
  EcranReglagesLecture: () => <main data-testid="reglages-lecture" data-ecran="reglages-lecture" />
}));
vi.mock('@client/ecrans/EcranOuverture', () => ({
  EcranOuverture: () => <main data-testid="ouverture" data-ecran="ouverture" />
}));
vi.mock('@client/ecrans/EcranDebugRecompenses', () => ({
  EcranDebugRecompenses: () => <main data-testid="debug" data-ecran="dashboard" />
}));
vi.mock('@client/ecrans/EcranNoeud', () => ({
  EcranNoeud: () => { api.afficherNoeud(); return <main data-testid="noeud" />; }
}));
vi.mock('@client/ecrans/EcranRecompense', () => ({
  EcranRecompense: () => { api.afficherRecompense(); return <main data-testid="recompense" />; }
}));
vi.mock('@client/ecrans/EcranDashboard', () => ({
  EcranDashboard: () => { api.afficherParent(); return <main data-testid="dashboard" />; }
}));
vi.mock('@client/ecrans/EcranGalerieParent', () => ({
  EcranGalerieParent: () => { api.afficherParent(); return <main data-testid="galerie" />; }
}));
vi.mock('@client/parent/VisiteDesEcrans', () => ({
  VisiteDesEcrans: ({ surAllerCarte }: { surAllerCarte: () => void }) => {
    api.afficherParent();
    return <main data-testid="visite"><button onClick={surAllerCarte}>Voir la carte</button></main>;
  }
}));
vi.mock('@client/ecrans/EcranCodeParent', () => ({
  EcranCodeParent: ({ surOuverture }: { surOuverture: () => void }) =>
    <main data-testid="code-parent" data-ecran="code-parent">
      <button onClick={surOuverture}>Rappel sans autorisation</button>
      <button onClick={() => { poserJetonParent('session-parent-test'); surOuverture(); }}>
        Ouvrir après validation du code
      </button>
    </main>
}));

const profil: Profil = {
  id: 'profil-navigation-isole' as Profil['id'], prenom: 'Alma',
  avatar: { peau: '#e3af8b', cheveux: '#684c3c', yeux: '#694f3e',
    coiffure: 'courte-ebouriffee', morphologie: '7-ans' },
  paletteVariante: 'clairiere' as Profil['paletteVariante'],
  creeLe: '2026-09-01T08:00:00Z' as Profil['creeLe'],
  dernierAccesLe: '2026-09-01T08:00:00Z' as Profil['dernierAccesLe']
};
const autreProfil: Profil = { ...profil, id: 'autre-profil-navigation' as Profil['id'], prenom: 'Léo' };
const files: QueryClient[] = [];

function differerProfil() {
  let resoudre!: (valeur: Profil) => void;
  let rejeter!: (raison: Error) => void;
  const promesse = new Promise<Profil>((resolution, rejet) => { resoudre = resolution; rejeter = rejet; });
  api.lireProfil.mockReturnValueOnce(promesse);
  return { resoudre, rejeter };
}

function monter(chemin: string, souvenir = true) {
  window.history.replaceState(null, '', chemin);
  if (souvenir) memoriserProfil(String(profil.id));
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const retour = creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined });
  const services = { ...base, haptique, retour };
  const magasin = creerMagasin(services, 1,
    lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'));
  const cascadeInitiale = magasin.getState().cascade;
  const file = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  files.push(file);
  render(<Application magasin={magasin} services={services} fileDAttente={file} />);
  return { magasin, cascadeInitiale };
}

function urlActuelle(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

beforeEach(() => {
  oublierProfil();
  fermerZoneParent();
  // Chaque cas part au bout de son historique ; un retour du cas précédent ne laisse pas
  // d'entrées futures susceptibles de modifier la longueur au premier clic.
  window.history.pushState(null, '', '/');
  vi.clearAllMocks();
  api.lireProfil.mockReset().mockResolvedValue(profil);
  api.lireReglagesLecture.mockResolvedValue({});
  api.listerProfils.mockResolvedValue([profil]);
});
afterEach(() => {
  cleanup();
  for (const file of files.splice(0)) file.clear();
  oublierProfil();
  fermerZoneParent();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('restauration du joueur et de sa destination', () => {
  it('laisse le banc local autonome pendant la lecture du joueur', async () => {
    const attente = differerProfil();
    monter('/debug/recompenses?exercices=49');
    await screen.findByTestId('debug');
    expect(urlActuelle()).toBe('/debug/recompenses?exercices=49');
    await act(async () => { attente.resoudre(profil); });
    expect(urlActuelle()).toBe('/debug/recompenses?exercices=49');
    expect(screen.getByTestId('debug')).toBeTruthy();
  });

  it.each(['carte', 'coffre', 'chaudron', 'campement', 'reglages-lecture', 'ouverture'])(
    'reprend /%s avec le même joueur et conserve recherche et fragment', async (destination) => {
      const attente = differerProfil();
      const chemin = `/${destination}?reprise=oui#lieu`;
      const { magasin, cascadeInitiale } = monter(chemin);
      await waitFor(() => expect(document.querySelector('[data-ecran="chargement"]')).not.toBeNull());
      expect(screen.queryByTestId(destination)).toBeNull();
      expect(urlActuelle()).toBe(chemin);
      await act(async () => { attente.resoudre(profil); });
      await screen.findByTestId(destination);
      expect(urlActuelle()).toBe(chemin);
      expect(magasin.getState().profil).toEqual(profil);
      expect(lireProfilMemorise()).toBe(String(profil.id));
      expect(magasin.getState().cascade).toEqual(cascadeInitiale);
      expect(magasin.getState().dernierGain).toBeNull();
      if (destination === 'carte' || destination === 'campement') {
        expect(magasin.getState().ecran).toBe(destination);
      }
    }
  );

  it.each(['/noeud', '/recompense'])('ramène %s sans état au campement, sans monter une fausse partie', async (chemin) => {
    const { magasin, cascadeInitiale } = monter(chemin);
    await screen.findByTestId('campement');
    expect(urlActuelle()).toBe('/campement');
    expect(magasin.getState().profil).toEqual(profil);
    expect(magasin.getState().paquet).toBeNull();
    expect(magasin.getState().resume).toBeNull();
    expect(magasin.getState().cascade).toEqual(cascadeInitiale);
    expect(magasin.getState().dernierGain).toBeNull();
    expect(api.afficherNoeud).not.toHaveBeenCalled();
    expect(api.afficherRecompense).not.toHaveBeenCalled();
  });

  it('garde la dernière URL si le navigateur change de page pendant la lecture du joueur', async () => {
    const attente = differerProfil();
    const { magasin } = monter('/carte');
    await waitFor(() => expect(api.lireProfil).toHaveBeenCalled());
    act(() => window.history.pushState(null, '', '/coffre?reprise=plus-recente'));
    expect(magasin.getState().ecran).toBe('chargement');
    await act(async () => { attente.resoudre(profil); });
    await screen.findByTestId('coffre');
    expect(urlActuelle()).toBe('/coffre?reprise=plus-recente');
    expect(magasin.getState().profil).toEqual(profil);
  });

  it('réconcilie un retour navigateur et permet de repartir sans boucle ni entrée parasite', async () => {
    const { magasin } = monter('/carte');
    await screen.findByTestId('carte');
    const longueur = window.history.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retour au campement' }));
    await screen.findByTestId('campement');
    expect(magasin.getState().ecran).toBe('campement');
    expect(window.history.length).toBe(longueur + 1);
    act(() => window.history.back());
    await screen.findByTestId('carte');
    expect(magasin.getState().ecran).toBe('carte');
    fireEvent.click(screen.getByRole('button', { name: 'Retour au campement' }));
    await screen.findByTestId('campement');
    expect(urlActuelle()).toBe('/campement');
    expect(magasin.getState().profil).toEqual(profil);
    expect(window.history.length).toBe(longueur + 1);
  });

  it.each(['resolution', 'rejet'] as const)('ignore une %s tardive après un autre choix de joueur', async (issue) => {
    const attente = differerProfil();
    const { magasin } = monter('/');
    await waitFor(() => expect(api.lireProfil).toHaveBeenCalledWith(profil.id));
    act(() => magasin.getState().choisirProfil(autreProfil));
    await screen.findByTestId('campement');
    await act(async () => {
      if (issue === 'resolution') attente.resoudre(profil);
      else attente.rejeter(new Error('Profil précédent inaccessible'));
    });
    expect(magasin.getState().profil).toEqual(autreProfil);
    expect(lireProfilMemorise()).toBe(String(autreProfil.id));
    expect(urlActuelle()).toBe('/campement');
    expect(screen.queryByTestId('profils')).toBeNull();
  });

  it('retombe sur les profils si le souvenir est périmé', async () => {
    api.lireProfil.mockRejectedValueOnce(new Error('Profil absent'));
    const { magasin } = monter('/coffre');
    await screen.findByTestId('profils');
    expect(urlActuelle()).toBe('/');
    expect(lireProfilMemorise()).toBeNull();
    expect(magasin.getState().profil).toBeNull();
  });
});

describe('liens parent et visite', () => {
  it('relie le campement à la porte parent', async () => {
    const { magasin } = monter('/campement');
    await screen.findByTestId('campement');
    fireEvent.click(screen.getByRole('button', { name: 'Parents' }));
    await screen.findByTestId('code-parent');
    expect(urlActuelle()).toBe('/parent');
    expect(magasin.getState().profil).toEqual(profil);
    expect(api.afficherParent).not.toHaveBeenCalled();
  });

  it.each([
    ['/parent/dashboard', 'dashboard'], ['/parent/galerie', 'galerie'], ['/parent/visite', 'visite']
  ])('conserve %s mais exige une vraie ouverture de la porte', async (chemin, destination) => {
    const { magasin } = monter(`${chemin}?reprise=oui`);
    await screen.findByTestId('code-parent');
    expect(urlActuelle()).toBe(`${chemin}?reprise=oui`);
    expect(api.afficherParent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Rappel sans autorisation' }));
    expect(screen.queryByTestId(destination)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir après validation du code' }));
    await screen.findByTestId(destination);
    expect(urlActuelle()).toBe(`${chemin}?reprise=oui`);
    expect(magasin.getState().profil).toEqual(profil);
  });

  it('ouvre la porte parent sans joueur mémorisé et garde le choix parent séparé du jeu', async () => {
    const { magasin } = monter('/parent/dashboard', false);
    await screen.findByTestId('code-parent');
    expect(urlActuelle()).toBe('/parent/dashboard');
    expect(api.afficherParent).not.toHaveBeenCalled();
    expect(api.listerProfils).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir après validation du code' }));
    await waitFor(() => expect(api.listerProfils).toHaveBeenCalled());
    expect(magasin.getState().profil).toBeNull();
    expect(lireProfilMemorise()).toBeNull();
  });

  it('protège aussi le lien direct vers le choix de joueur de la visite', async () => {
    monter('/parent/visite/quel-joueur');
    await screen.findByTestId('code-parent');
    expect(api.listerProfils).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir après validation du code' }));
    await screen.findByRole('button', { name: 'Voir le suivi de Alma' });
    expect(urlActuelle()).toBe('/parent/visite/quel-joueur');
  });

  it('ouvre directement la carte depuis la visite sans étape campement', async () => {
    poserJetonParent('session-parent-test');
    const { magasin, cascadeInitiale } = monter('/parent/visite');
    await screen.findByTestId('visite');
    const longueur = window.history.length;
    fireEvent.click(screen.getByRole('button', { name: 'Voir la carte' }));
    await screen.findByTestId('carte');
    expect(urlActuelle()).toBe('/carte');
    expect(magasin.getState().ecran).toBe('carte');
    expect(magasin.getState().profil).toEqual(profil);
    expect(magasin.getState().cascade).toEqual(cascadeInitiale);
    expect(window.history.length).toBe(longueur + 1);
    act(() => window.history.back());
    await screen.findByTestId('visite');
    expect(urlActuelle()).toBe('/parent/visite');
  });
});
