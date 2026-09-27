import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { creerAlea, creerHorlogeFigee } from '@pierre/partage';
import { CATALOGUE_MATHS, genererPont, type FamilleMaths, type NiveauMaths } from '@pierre/partage/mathematiques';
import type { PortApiMaths, RepriseMaths } from '@pierre/partage/mathematiques';
import type { DemandeVoix, FournisseurVoix, Profil } from '@pierre/partage';
import { EcranMathematiques } from '@client/mathematiques/EcranMathematiques';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { servicesDeTest } from '../../configuration/preparation.js';
import { enregistrerConseilParentMaths, effacerConseilParentMaths } from '@client/mathematiques/conseil-parent';

const profil: Profil = {
  id: 'profil-maths' as Profil['id'], prenom: 'Lila',
  avatar: { peau: '#fff', cheveux: '#000', yeux: '#000', coiffure: 'courte', morphologie: '7-ans' },
  paletteVariante: 'foret' as Profil['paletteVariante'],
  creeLe: '2026-09-26T00:00:00.000Z' as Profil['creeLe'],
  dernierAccesLe: '2026-09-26T00:00:00.000Z' as Profil['dernierAccesLe'], generationMaths: 0,
};

function reprise(): RepriseMaths {
  const instance = genererPont('MAT-PON-03', 'decouverte', creerAlea(18), { porteeFixee: 8 });
  return {
    profilId: String(profil.id), generationMaths: 0, revision: 3, instance,
    etat: instance.etatInitial, erreursValidees: 0, aide: 'aucune', projet: null,
    signaturesRecentes: {},
  };
}

function preferencesNiveaux(): Record<FamilleMaths, { niveau: NiveauMaths; revision: number }> {
  return Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
    [famille.id, { niveau: 'decouverte', revision: 0 }])) as Record<FamilleMaths, { niveau: NiveauMaths; revision: number }>;
}

function api(repriseCourante: RepriseMaths | null = null): PortApiMaths {
  const preferences = preferencesNiveaux();
  return {
    lireEtat: vi.fn(async () => ({ ok: true, valeur: {
      generationMaths: 0, preferencesNiveaux: preferences, reprise: repriseCourante, projetSuspendu: null,
      progression: [], projets: [], recompenses: [], tentatives: [],
    } })),
    choisirNiveau: vi.fn(async (commande) => {
      preferences[commande.famille] = { niveau: commande.niveau, revision: preferences[commande.famille].revision + 1 };
      return { ok: true, valeur: preferences[commande.famille] };
    }),
    creerPartie: vi.fn(), creerProjet: vi.fn(), lirePartie: vi.fn(), manipuler: vi.fn(),
    pause: vi.fn(async () => ({ ok: true, valeur: { deja: false, reprise: repriseCourante! } })),
    terminer: vi.fn(), lireBilanParent: vi.fn(),
  } as unknown as PortApiMaths;
}

function monter(port = api(), options: { readonly stade?: 'oeuf' | 'gardien'; readonly lecture?: ReturnType<typeof vi.fn>; readonly voix?: FournisseurVoix } = {}): { readonly port: PortApiMaths; readonly retour: ReturnType<typeof vi.fn>; readonly lecture: ReturnType<typeof vi.fn> } {
  const services = { ...servicesDeTest(), alea: creerAlea(71), horloge: creerHorlogeFigee('2026-09-26T10:00:00.000Z'),
    ...(options.voix === undefined ? {} : { voix: options.voix }) };
  const magasin = creerMagasin(services);
  const retour = vi.fn();
  const lecture = options.lecture ?? vi.fn();
  render(
    <FournisseurJeu valeur={{ services, magasin }}>
      <EcranMathematiques profil={profil} surRetour={retour} surReprendreLecture={lecture} apiMaths={port}
        chargerStade={() => Promise.resolve(options.stade ?? 'oeuf')} />
    </FournisseurJeu>,
  );
  return { port, retour, lecture };
}

afterEach(() => { cleanup(); effacerConseilParentMaths(String(profil.id), 0); });

describe('EcranMathematiques — première traversée', () => {
  it('propose le conseil parent sans démarrer le jeu ni imposer son niveau', async () => {
    enregistrerConseilParentMaths(String(profil.id), { famille: 'MAT-JAR-01', niveau: 'defi', generationMaths: 0 });
    const { port }=monter();
    await screen.findByRole('complementary', { name: 'Une idée pour toi' });
    fireEvent.click(screen.getByRole('button', { name: 'Voir cette activité' }));
    const groupe=await screen.findByRole('group', { name: 'Niveau de Bottes de graines' });
    expect(within(groupe).getByRole('button', { name: 'Découvrir' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(groupe).getByRole('button', { name: 'Découvrir' }));
    expect(within(groupe).getByRole('button', { name: 'Découvrir' }).getAttribute('aria-pressed')).toBe('true');
    expect(port.creerPartie).not.toHaveBeenCalled();
  });
  it('laisse ignorer un conseil sans créer de partie', async () => {
    enregistrerConseilParentMaths(String(profil.id), { famille: 'MAT-JAR-01', niveau: 'defi', generationMaths: 0 });
    const { port }=monter();
    fireEvent.click(await screen.findByRole('button', { name: 'Choisir moi-même' }));
    expect(screen.queryByRole('complementary', { name: 'Une idée pour toi' })).toBeNull();
    expect(screen.getByTestId('lieux-maths')).toBeTruthy();
    expect(port.creerPartie).not.toHaveBeenCalled();
  });
  it('mémorise seulement le niveau de la famille choisie et le retrouve après remontage', async () => {
    const port = api();
    monter(port);
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    const regle = screen.getByRole('group', { name: 'Niveau de Planches à mesurer' });
    expect(within(regle).getByText(/Exemple :/u).textContent).toMatch(/[0-9]/u);
    fireEvent.click(within(regle).getByRole('button', { name: 'Explorer' }));
    await waitFor(() => expect(within(regle).getByRole('button', { name: 'Explorer' }).getAttribute('aria-pressed')).toBe('true'));
    expect(port.choisirNiveau).toHaveBeenCalledWith(expect.objectContaining({
      famille: 'MAT-PON-01', niveau: 'exploration', revisionAttendue: 0,
    }));
    const autres = screen.getByRole('group', { name: 'Niveau de Pierres de la rive' });
    expect(within(autres).getByRole('button', { name: 'Découvrir' }).getAttribute('aria-pressed')).toBe('true');
    cleanup();
    monter(port);
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    expect(within(screen.getByRole('group', { name: 'Niveau de Planches à mesurer' }))
      .getByRole('button', { name: 'Explorer' }).getAttribute('aria-pressed')).toBe('true');
    expect(port.creerPartie).not.toHaveBeenCalled();
  });
  it('ouvre les six lieux dès le début, avant tout projet ou compagnon acquis', async () => {
    monter();
    await waitFor(() => expect(screen.getByTestId('lieux-maths')).toBeTruthy());
    expect(document.querySelectorAll('[data-lieu-maths]')).toHaveLength(6);
    expect(screen.getByTestId('lieu-ponts').getAttribute('data-disponibilite')).toBe('jouable');
    expect(document.querySelectorAll('[data-lieu-maths]:not([disabled])')).toHaveLength(6);
    expect(screen.queryByText('En préparation')).toBeNull();
  });

  it('propose le projet PON01 et n’exécute jamais l’aide à la place de l’enfant', async () => {
    const port = api();
    const creerProjet = vi.fn(async (_commande: Parameters<PortApiMaths['creerProjet']>[0]) => ({ ok: true, valeur: { deja: false, sessionId: 'p01', reprise: reprise() } }));
    const aideSauvee = { ...reprise(), revision: 4, aide: 'indice' as const };
    const manipuler = vi.fn(async (_commande: Parameters<PortApiMaths['manipuler']>[0]) => ({ ok: true, valeur: { deja: false, reprise: aideSauvee } }));
    (port as { creerProjet: typeof creerProjet }).creerProjet = creerProjet;
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    monter(port);
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer La première traversée' }));
    await waitFor(() => expect(creerProjet).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Demander une idée à Gobi' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Demander une idée à Gobi' }));
    await waitFor(() => expect(manipuler).toHaveBeenCalledTimes(1));
    expect(manipuler.mock.calls[0]?.[0].geste).toEqual({ type: 'aide', niveau: 'indice' });
    await waitFor(() => expect(screen.getByTestId('aide-maths').getAttribute('data-aide-proposee')).toBe('indice'));
    expect(manipuler.mock.calls[0]?.[0].geste.type).not.toBe('placer-piece');
  });

  it('sauvegarde un geste confirmé avec une clé stable et bloque le double tap pendant l’accusé', async () => {
    const envoi = new Promise<never>(() => undefined);
    const port = api(reprise());
    const manipuler = vi.fn((_commande: Parameters<PortApiMaths['manipuler']>[0]) => envoi);
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByTestId('piece-module-a'));
    fireEvent.click(screen.getByTestId('tablier-position-0'));
    fireEvent.click(screen.getByTestId('tablier-position-0'));
    expect(manipuler).toHaveBeenCalledTimes(1);
    expect(manipuler.mock.calls[0]?.[0].cleGeste).toMatch(/^maths:/u);
  });

  it('quitte seulement après l’accusé de pause et garde la reprise à l’écran', async () => {
    const enCours = reprise();
    const port = api(enCours);
    const retour = monter(port).retour;
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Mettre la partie en pause' }));
    await waitFor(() => expect((port as { pause: ReturnType<typeof vi.fn> }).pause).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(retour).toHaveBeenCalledTimes(1));
  });

  it('permet de demander une sortie pendant un geste, puis met en pause sa révision acquittée', async () => {
    const courante = reprise();
    const confirmee = { ...courante, revision: courante.revision + 1 };
    let confirmer!: (resultat: unknown) => void;
    const port = api(courante);
    const manipuler = vi.fn(() => new Promise((resolve) => { confirmer = resolve; }));
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    const { lecture } = monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByTestId('piece-module-a'));
    fireEvent.click(screen.getByTestId('tablier-position-0'));
    await waitFor(() => expect(manipuler).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la lecture' }));
    expect(lecture).not.toHaveBeenCalled();
    expect(port.pause).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rester dans la vallée' })).toBeTruthy();
    confirmer({ ok: true, valeur: { deja: false, reprise: confirmee } });
    await waitFor(() => expect(lecture).toHaveBeenCalledTimes(1));
    expect(port.pause).toHaveBeenCalledWith(expect.objectContaining({ revisionAttendue: confirmee.revision }));
  });

  it('permet d’annuler la sortie demandée pendant un geste sans perdre ce geste', async () => {
    let confirmer!: (resultat: unknown) => void;
    const port = api(reprise());
    const manipuler = vi.fn(() => new Promise((resolve) => { confirmer = resolve; }));
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    const { lecture } = monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByTestId('piece-module-a'));
    fireEvent.click(screen.getByTestId('tablier-position-0'));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la lecture' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rester dans la vallée' }));
    confirmer({ ok: true, valeur: { deja: false, reprise: { ...reprise(), revision: 4 } } });
    await waitFor(() => expect(document.querySelector('[data-ecran="mathematiques"]')?.getAttribute('aria-busy')).toBe('false'));
    expect(port.pause).not.toHaveBeenCalled();
    expect(lecture).not.toHaveBeenCalled();
  });

  it.each(['incomplete', 'incorrecte'] as const)('garde la scène ouverte quand la validation est %s', async (statut) => {
    const enCours = reprise();
    const port = api(enCours);
    const terminer = vi.fn(async () => ({ ok: true, valeur: {
      deja: false, reprise: enCours,
      validation: statut === 'incomplete'
        ? { statut, raison: 'Il manque une pièce.' }
        : { statut, raison: 'Le pont est trop court.', ecart: 1 },
      tentative: null, recompenses: [], prochaineReprise: null,
    } }));
    (port as { terminer: typeof terminer }).terminer = terminer;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier mon pont' }));
    await waitFor(() => expect(terminer).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('scene-ponts')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(statut === 'incomplete' ? 'Il manque' : 'trop court');
  });

  it('réémet exactement la même commande de projet après une panne temporaire', async () => {
    const port = api();
    const creerProjet = vi.fn()
      .mockRejectedValueOnce(new Error('hors ligne'))
      .mockResolvedValueOnce({ ok: true, valeur: { deja: false, sessionId: 'p01', reprise: reprise() } });
    (port as { creerProjet: typeof creerProjet }).creerProjet = creerProjet;
    monter(port);
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer La première traversée' }));
    await screen.findByRole('button', { name: 'Réessayer' });
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(creerProjet).toHaveBeenCalledTimes(2));
    expect(creerProjet.mock.calls[1]?.[0]).toEqual(creerProjet.mock.calls[0]?.[0]);
  });

  it('attend l’accusé de pause avant de reprendre la lecture', async () => {
    let confirmer: ((valeur: { ok: true; valeur: unknown }) => void) | null = null;
    const port = api(reprise());
    const pause = vi.fn(() => new Promise((resolve) => { confirmer = resolve as typeof confirmer; }));
    (port as { pause: typeof pause }).pause = pause;
    const lecture = vi.fn();
    monter(port, { lecture });
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la lecture' }));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(lecture).not.toHaveBeenCalled();
    confirmer?.({ ok: true, valeur: { deja: false, reprise: reprise() } });
    await waitFor(() => expect(lecture).toHaveBeenCalledTimes(1));
  });

  it('emploie le stade durable de Gobi', async () => {
    monter(api(reprise()), { stade: 'gardien' });
    await screen.findByTestId('scene-ponts');
    await waitFor(() => expect(document.querySelector<HTMLImageElement>('.scene-ponts__illustration img')?.src).toContain('stade-10.webp'));
  });

  it('garde les trois niveaux du projet et explique une combinaison incompatible', async () => {
    const port = api();
    const creerProjet = vi.fn(async (_commande: Parameters<PortApiMaths['creerProjet']>[0]) => ({ ok: true, valeur: { deja: false, sessionId: 'p01', reprise: reprise() } }));
    (port as { creerProjet: typeof creerProjet }).creerProjet = creerProjet;
    monter(port);
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    const projet = screen.getByRole('region', { name: 'La première traversée' });
    fireEvent.click(within(within(projet).getByRole('group', { name: '2. Faire le tablier' })).getByRole('button', { name: 'Défi' }));
    expect(screen.getByText(/ne donnent pas une portée commune/u)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Commencer La première traversée' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(within(projet).getByRole('group', { name: '1. Mesurer les planches' })).getByRole('button', { name: 'Défi' }));
    fireEvent.click(within(within(projet).getByRole('group', { name: '3. Poser les bornes' })).getByRole('button', { name: 'Explorer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer La première traversée' }));
    await waitFor(() => expect(creerProjet).toHaveBeenCalledTimes(1));
    expect(creerProjet.mock.calls[0]?.[0].niveaux).toEqual(['defi', 'defi', 'exploration']);
  });

  it('attend une lecture réussie du carnet avant toute nouvelle création', async () => {
    const port = api();
    const lireEtat = vi.fn()
      .mockResolvedValueOnce({ ok: false, erreur: { code: 'stockage', message: 'indisponible' } })
      .mockResolvedValueOnce({ ok: true, valeur: { generationMaths: 7, preferencesNiveaux: preferencesNiveaux(), reprise: null, projetSuspendu: null,
        progression: [], projets: [], recompenses: [], tentatives: [] } });
    const creerProjet = vi.fn(async (_commande: Parameters<PortApiMaths['creerProjet']>[0]) => ({ ok: true, valeur: { deja: false, sessionId: 'p01', reprise: reprise() } }));
    (port as { lireEtat: typeof lireEtat; creerProjet: typeof creerProjet }).lireEtat = lireEtat;
    (port as { creerProjet: typeof creerProjet }).creerProjet = creerProjet;
    monter(port);
    await screen.findByRole('button', { name: 'Réessayer l’ouverture du carnet' });
    expect(creerProjet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('lieu-ponts')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’ouverture du carnet' }));
    await screen.findByTestId('lieux-maths');
    fireEvent.click(screen.getByTestId('lieu-ponts'));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer La première traversée' }));
    await waitFor(() => expect(creerProjet).toHaveBeenCalledTimes(1));
    expect(creerProjet.mock.calls[0]?.[0].generationMaths).toBe(7);
  });

  it('rouvre le projet suspendu depuis le hub après une pause confirmée', async () => {
    const courante = reprise();
    const projet = { id: 'MAT-PON-P01' as const, sessionId: 'session-1', version: 1,
      variables: { porteeCm: 8 }, plan: [], transformationId: 'passerelle-ouverte',
      cadeauId: 'maths-souvenir-ponts', cadeauType: 'souvenir' as const, etapeCourante: 1,
      instances: [courante.instance.id], etoilesEtapes: [3 as const], suspendu: true };
    const suspendue = { ...courante, projet };
    const port = api(courante);
    const lireEtat = vi.fn()
      .mockResolvedValueOnce({ ok: true, valeur: { generationMaths: 0, preferencesNiveaux: preferencesNiveaux(), reprise: courante, projetSuspendu: null,
        progression: [], projets: [], recompenses: [], tentatives: [] } })
      .mockResolvedValue({ ok: true, valeur: { generationMaths: 0, preferencesNiveaux: preferencesNiveaux(), reprise: null, projetSuspendu: suspendue,
        progression: [], projets: [], recompenses: [], tentatives: [] } });
    const lirePartie = vi.fn(async () => ({ ok: true, valeur: suspendue }));
    const creerPartie = vi.fn(async (_commande: Parameters<PortApiMaths['creerPartie']>[0]) =>
      ({ ok: true, valeur: { deja: false, reprise: courante } }));
    (port as { lireEtat: typeof lireEtat; lirePartie: typeof lirePartie }).lireEtat = lireEtat;
    (port as { lirePartie: typeof lirePartie }).lirePartie = lirePartie;
    (port as { creerPartie: typeof creerPartie }).creerPartie = creerPartie;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux Ponts en gardant ma partie' }));
    await screen.findByRole('button', { name: /Reprendre La première traversée/u });
    fireEvent.click(screen.getAllByRole('button', { name: 'Essayer cette activité' })[0]!);
    await waitFor(() => expect(creerPartie).toHaveBeenCalledTimes(1));
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux Ponts en gardant ma partie' }));
    await screen.findByRole('button', { name: /Reprendre La première traversée/u });
    fireEvent.click(screen.getByRole('button', { name: /Reprendre La première traversée/u }));
    await waitFor(() => expect(lirePartie).toHaveBeenCalledWith(String(profil.id), courante.instance.id));
    expect(screen.getByTestId('scene-ponts')).toBeTruthy();
  });

  it('attend la pause du projet avant de lancer un libre au nouveau niveau', async () => {
    const base = reprise();
    const courante: RepriseMaths = { ...base, projet: {
      id: 'MAT-PON-P01', sessionId: 'session-niveau', version: 1,
      variables: { porteeCm: 8 }, plan: [], transformationId: 'passerelle-ouverte',
      cadeauId: 'maths-souvenir-ponts', cadeauType: 'souvenir', etapeCourante: 1,
      instances: [base.instance.id], etoilesEtapes: [3], suspendu: false,
    } };
    const port = api(courante);
    let confirmerPause: ((valeur: { ok: true; valeur: { deja: false; reprise: RepriseMaths } }) => void) | undefined;
    const pause = vi.fn(() => new Promise<{ ok: true; valeur: { deja: false; reprise: RepriseMaths } }>((resolve) => {
      confirmerPause = resolve;
    }));
    const creerPartie = vi.fn(async () => ({ ok: true, valeur: { deja: false, reprise: base } }));
    (port as { pause: typeof pause }).pause = pause;
    (port as { creerPartie: typeof creerPartie }).creerPartie = creerPartie;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Changer de niveau' }));
    expect(screen.getByText(/Ton projet garde ce que tu as préparé/u)).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group', { name: 'Choisis ton nouveau niveau' }))
      .getByRole('button', { name: 'Explorer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer un jeu libre à ce niveau' }));
    await waitFor(() => expect(pause).toHaveBeenCalledTimes(1));
    expect(creerPartie).not.toHaveBeenCalled();
    expect(port.choisirNiveau).toHaveBeenCalledWith(expect.objectContaining({
      famille: courante.instance.famille, niveau: 'exploration',
    }));
    confirmerPause?.({ ok: true, valeur: { deja: false, reprise: { ...courante, revision: 4 } } });
    await waitFor(() => expect(creerPartie).toHaveBeenCalledWith(expect.objectContaining({
      famille: courante.instance.famille, niveau: 'exploration',
    })));
    expect(port.terminer).not.toHaveBeenCalled();
  });

  it('affiche les étoiles et le souvenir relus dans le carnet après la réussite', async () => {
    const courante = reprise();
    const port = api(courante);
    const tentative = { id: 'tentative-1', instanceId: courante.instance.id, famille: courante.instance.famille,
      niveau: courante.instance.niveau, projetId: 'MAT-PON-P01' as const, erreursValidees: 0,
      aide: 'indice' as const, solution: {}, etoiles: 2 as const, notions: [], contexte: {} };
    const terminer = vi.fn(async () => ({ ok: true, valeur: { deja: false, reprise: courante,
      validation: { statut: 'correcte' as const, solution: {} }, tentative, prochaineReprise: null,
      recompenses: [] } }));
    const lireEtat = vi.fn()
      .mockResolvedValueOnce({ ok: true, valeur: { generationMaths: 0, preferencesNiveaux: preferencesNiveaux(), reprise: courante, projetSuspendu: null,
        progression: [], projets: [], recompenses: [], tentatives: [] } })
      .mockResolvedValue({ ok: true, valeur: { generationMaths: 0, preferencesNiveaux: preferencesNiveaux(), reprise: null, projetSuspendu: null,
        progression: [], projets: [{ projetId: 'MAT-PON-P01', etapesTerminees: 3, nombreEtapes: 3,
          transformationId: 'passerelle-ouverte', termineLe: '2026-09-26' }],
        recompenses: [{ projetId: 'MAT-PON-P01', cadeauId: 'maths-souvenir-ponts', categorie: 'souvenir',
          attribueLe: '2026-09-26' }], tentatives: [tentative] } });
    (port as { terminer: typeof terminer; lireEtat: typeof lireEtat }).terminer = terminer;
    (port as { lireEtat: typeof lireEtat }).lireEtat = lireEtat;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier mon pont' }));
    await screen.findByTestId('reussite-maths');
    expect(screen.getByLabelText('2 étoiles').textContent).toContain('★★☆');
    expect(document.querySelector('[data-cadeau="maths-souvenir-ponts"]')).toBeTruthy();
    expect(document.querySelector('[data-transformation="passerelle-ouverte"]')).toBeTruthy();
    expect(screen.getByText(/Galet mesureur/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux Ponts' }));
    expect(document.querySelector('[data-pont-durable="borne"]')).toBeTruthy();
  });

  it('ne montre aucun geste résolu après trois erreurs tant que l’aide n’est pas journalisée', async () => {
    const courante = { ...reprise(), erreursValidees: 3 };
    const avecAide = { ...courante, revision: courante.revision + 1, aide: 'demonstration' as const };
    const port = api(courante);
    const manipuler = vi.fn(async (_commande: Parameters<PortApiMaths['manipuler']>[0]) =>
      ({ ok: true, valeur: { deja: false, reprise: avecAide } }));
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    monter(port);
    await screen.findByTestId('scene-ponts');
    expect(screen.getByTestId('aide-maths').getAttribute('data-aide-proposee')).toBe('aucune');
    expect(document.querySelector('.maths-proposition')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Demander une idée à Gobi' }));
    await waitFor(() => expect(manipuler).toHaveBeenCalledTimes(1));
    expect(manipuler.mock.calls[0]?.[0].geste).toEqual({ type: 'aide', niveau: 'demonstration' });
    await waitFor(() => expect(screen.getByTestId('aide-maths').getAttribute('data-aide-proposee')).toBe('demonstration'));
    expect(document.querySelector('.maths-proposition')).toBeTruthy();
  });

  it('réécoute tous les segments de l’aide sans ajouter un geste ni modifier les étoiles', async () => {
    const courante = reprise();
    const avecAide = { ...courante, aide: 'indice' as const, instance: { ...courante.instance,
      aide: { ...courante.instance.aide, indice: { texte: 'Compte 8.', segments: [
        { texte: 'Compte ', audio: 'maths/compte' }, { texte: '8', audio: 'maths/nombres/8' },
        { texte: '.', audio: 'maths/ponctuation' },
      ] } } } } as RepriseMaths;
    const direSequence = vi.fn(async (_demandes: readonly DemandeVoix[]) => undefined);
    const voix = { dire: vi.fn(async () => undefined), direSequence, taire: vi.fn(),
      disponible: true, aUnClip: vi.fn(() => true) } as unknown as FournisseurVoix;
    const port = api(avecAide);
    monter(port, { voix });
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Réécouter l’aide de Gobi' }));
    expect(direSequence.mock.calls[0]?.[0].map((demande) => demande.texte)).toEqual(['Compte ', '8']);
    expect((port as { manipuler: ReturnType<typeof vi.fn> }).manipuler).not.toHaveBeenCalled();
  });

  it('lit tous les clips de la consigne et cache le bouton si un clip manque', async () => {
    const courante = reprise();
    const avecSegments = { ...courante, instance: { ...courante.instance, consigne: {
      texte: 'Pose 8 pièces.', segments: [
        { texte: 'Pose ', audio: 'maths/pose' }, { texte: '8', audio: 'maths/nombres/8' },
        { texte: '.', audio: 'maths/ponctuation' }, { texte: ' pièces.', audio: 'maths/pieces' },
      ],
    } } } as RepriseMaths;
    const direSequence = vi.fn(async (_demandes: readonly DemandeVoix[]) => undefined);
    const taire = vi.fn();
    const voix = { dire: vi.fn(async () => undefined), direSequence, taire,
      disponible: true, aUnClip: vi.fn((cle: string | null) => cle !== 'maths/pieces') } as unknown as FournisseurVoix;
    monter(api(avecSegments), { voix });
    await screen.findByTestId('scene-ponts');
    expect(screen.queryByRole('button', { name: 'Écouter la consigne' })).toBeNull();
    expect(direSequence).not.toHaveBeenCalled();
  });

  it('joue la séquence entière et coupe la voix quand la scène se ferme', async () => {
    const courante = reprise();
    const avecSegments = { ...courante, instance: { ...courante.instance, consigne: {
      texte: 'Pose 8 pièces.', segments: [
        { texte: 'Pose ', audio: 'maths/pose' }, { texte: '8', audio: 'maths/nombres/8' },
        { texte: '.', audio: 'maths/ponctuation' }, { texte: ' pièces.', audio: 'maths/pieces' },
      ],
    } } } as RepriseMaths;
    const direSequence = vi.fn(async (_demandes: readonly DemandeVoix[]) => undefined);
    const taire = vi.fn();
    const voix = { dire: vi.fn(async () => undefined), direSequence, taire,
      disponible: true, aUnClip: vi.fn(() => true) } as unknown as FournisseurVoix;
    const port = api(avecSegments);
    monter(port, { voix });
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Écouter la consigne' }));
    expect(direSequence).toHaveBeenCalledTimes(1);
    expect(direSequence.mock.calls[0]?.[0].map((demande: { texte: string }) => demande.texte))
      .toEqual(['Pose ', '8', ' pièces.']);
    expect((port as { manipuler: ReturnType<typeof vi.fn> }).manipuler).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux Ponts en gardant ma partie' }));
    await screen.findByRole('button', { name: 'Commencer La première traversée' });
    expect(taire).toHaveBeenCalled();
  });

  it('revient au hub si un conflit ne laisse aucune reprise active', async () => {
    const port = api(reprise());
    const lireEtat = vi.fn()
      .mockResolvedValueOnce({ ok: true, valeur: { generationMaths: 0, preferencesNiveaux: preferencesNiveaux(), reprise: reprise(), projetSuspendu: null,
        progression: [], projets: [], recompenses: [], tentatives: [] } })
      .mockResolvedValue({ ok: true, valeur: { generationMaths: 1, preferencesNiveaux: preferencesNiveaux(), reprise: null, projetSuspendu: null,
        progression: [], projets: [], recompenses: [], tentatives: [] } });
    const manipuler = vi.fn(async () => ({ ok: false, erreur: { code: 'conflit', revisionCourante: 0 } }));
    (port as { lireEtat: typeof lireEtat; manipuler: typeof manipuler }).lireEtat = lireEtat;
    (port as { manipuler: typeof manipuler }).manipuler = manipuler;
    monter(port);
    await screen.findByTestId('scene-ponts');
    fireEvent.click(screen.getByRole('button', { name: 'Demander une idée à Gobi' }));
    await screen.findByRole('button', { name: 'Commencer La première traversée' });
    expect(screen.queryByTestId('scene-ponts')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Le carnet a changé');
  });
});
