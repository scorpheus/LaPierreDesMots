import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHEMINS_API } from '@pierre/partage';
import type { Horloge, IdProfil, PaquetNoeud, Profil, ReponseTentative, SeuilsCascade } from '@pierre/partage';
import { ENTETE_JETON_PARENT, LANCEMENT_PARENT } from '@pierre/partage/parent';
import type { EntreeGalerie, OptionsLancement } from '@pierre/partage/parent';
import type { ContenuColorie } from '@partage/moteurs/colorie/types';
import { Application } from '@client/Application';
import { creerMagasin } from '@client/etat/magasin';
import type { MagasinJeu } from '@client/etat/magasin';
import type { TentativeSansCle } from '@client/api/tentatives-en-attente';
import { calculerCleIdempotence, fermerZoneParent, poserJetonParent } from '@client/api/commun';
import { oublierProfil } from '@client/etat/profil-memorise';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { lireJson, monterApplication, servicesDeTest } from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';

const api = vi.hoisted(() => ({ lireProfil: vi.fn(), listerProfils: vi.fn(),
  reinitialiser: vi.fn(), apercu: vi.fn(), etatProfil: vi.fn(), paquet: vi.fn() }));
// Sous happy-dom, Vite expose les modules en URL HTTP. Seule la configuration des chemins
// est adaptée : les routes, les services, les migrations et SQLite restent ceux du serveur.
vi.mock('@serveur/configuration', async () => {
  const { resolve } = await import('node:path');
  return {
    RACINE_DEPOT: resolve(process.cwd()),
    CODES_ERREUR: { introuvable: 'introuvable', invalide: 'invalide', conflit: 'conflit', interne: 'interne' },
    erreurApi: (code: string, message: string) => ({ code, message }),
    horodatage: (horloge: Horloge) => horloge.maintenant()
  };
});
vi.mock('@client/api/client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  lireProfil: api.lireProfil, listerProfils: api.listerProfils,
  reinitialiserProfilParent: api.reinitialiser, apercuReinitialisationProfil: api.apercu,
  lireEtatProfilParent: api.etatProfil, lirePaquetNoeud: api.paquet,
  lireDashboardParent: async () => ({ latences: [], confusions: [], couverture: [], relecture: [], confusionsEcartees: 0 }),
  lireGalerieParent: async () => ({ entrees: [], moteursParCompetence: {}, habillagesParMoteur: {} }),
  lireReglagesLecture: async () => ({}), reprendreTentativesEnAttente: async () => 0
}));
// Le formulaire, le dashboard, le routeur et le magasin sont réels. La galerie rend seulement
// sa commande de lancement : ses détails graphiques n'interviennent pas dans ce raccord.
vi.mock('@client/parent/GalerieExercices', () => ({
  GalerieExercices: ({ surLancer }: { surLancer?: (entree: EntreeGalerie, options: OptionsLancement) => void }) =>
    <button onClick={() => surLancer?.({ noeud: 'clairiere-01' } as EntreeGalerie, LANCEMENT_PARENT)}>
      Essayer l’école
    </button>
}));
vi.mock('@client/parent/SupprimerProfil', () => ({ SupprimerProfil: () => null }));
vi.mock('@client/ecrans/EcranProfils', () => ({ EcranProfils: () => <main data-testid="profils" /> }));
vi.mock('@client/ecrans/EcranCampement', () => ({ EcranCampement: () => <main data-testid="campement" /> }));
vi.mock('@client/ecrans/EcranNoeud', () => ({ EcranNoeud: () => <main data-testid="activite" /> }));
vi.mock('@client/ecrans/EcranRecompense', () => ({ EcranRecompense: () => <main data-testid="resultat" /> }));

let contexte: ApplicationDeTest;
let profil: Profil;
let paquet: PaquetNoeud;
let entetes: Record<string, string>;
let file: QueryClient;
let nettoyages: (() => void | Promise<void>)[] = [];
async function lire(url: string): Promise<unknown> {
  const reponse = await contexte.application.inject({ method: 'GET', url, headers: entetes });
  expect(reponse.statusCode).toBe(200);
  return reponse.json();
}
beforeEach(async () => {
  nettoyages = [];
  vi.clearAllMocks();
  oublierProfil();
  contexte = await monterApplication();
  nettoyages.push(contexte.fermer);
  const creation = await contexte.application.inject({ method: 'POST', url: CHEMINS_API.profils,
    payload: { prenom: 'Alma' } });
  expect(creation.statusCode).toBe(201);
  profil = creation.json<Profil>();
  const porte = await contexte.application.inject({ method: 'POST', url: CHEMINS_API.parentDefinir,
    payload: { code: '4271' } });
  expect(porte.statusCode).toBe(200);
  entetes = { [ENTETE_JETON_PARENT]: porte.json<{ jeton: string }>().jeton };
  poserJetonParent(entetes[ENTETE_JETON_PARENT]!);
  paquet = await lire(CHEMINS_API.noeud('clairiere-01' as PaquetNoeud['noeud']['id'])) as PaquetNoeud;
  api.lireProfil.mockReset().mockImplementation((id: IdProfil) => lire(CHEMINS_API.profil(id)));
  api.listerProfils.mockImplementation(() => lire(CHEMINS_API.profils));
  api.paquet.mockResolvedValue(paquet);
  api.etatProfil.mockImplementation((id: IdProfil) => lire(CHEMINS_API.parentEtatProfil(id)));
  api.apercu.mockImplementation(async (id: IdProfil, portee: string) => {
    const reponse = await contexte.application.inject({ method: 'POST',
      url: CHEMINS_API.parentReinitialiser(id), headers: entetes, payload: { portee, apercu: true } });
    expect(reponse.statusCode).toBe(200);
    return reponse.json();
  });
  api.reinitialiser.mockImplementation(async (id: IdProfil, portee: string, confirmation: string) => {
    const reponse = await contexte.application.inject({ method: 'POST',
      url: CHEMINS_API.parentReinitialiser(id), headers: entetes, payload: { portee, confirmation } });
    expect(reponse.statusCode).toBe(200);
    return reponse.json();
  });
  file = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  nettoyages.push(() => file.clear());
});
afterEach(async () => {
  cleanup();
  for (const nettoyer of nettoyages.reverse()) await nettoyer();
  oublierProfil();
  fermerZoneParent();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

function jouer(magasin: MagasinJeu): void {
  const contenu = paquet.exercice.jeu.contenu as ContenuColorie;
  for (const cible of contenu.consignes.flatMap((consigne) => consigne.cibles)) {
    magasin.getState().emettre({ type: 'choisirCouleur', couleur: cible.couleur });
    magasin.getState().emettre({ type: 'peindre', region: cible.region });
  }
}
function monter(session: boolean) {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const services = { ...base, haptique, retour: creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined }) };
  const conservees: TentativeSansCle[] = [];
  const magasin = creerMagasin(services, 17,
    lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'),
    (tentative) => { conservees.push(tentative); });
  if (session) {
    magasin.getState().choisirProfil(profil);
    magasin.getState().demarrerNoeud(paquet);
    jouer(magasin);
    magasin.getState().naviguer('campement');
  } else magasin.getState().naviguer('profils');
  window.history.replaceState(null, '', '/parent/dashboard');
  render(<Application magasin={magasin} services={services} fileDAttente={file} />);
  return { magasin, conservees };
}
async function confirmer(): Promise<void> {
  fireEvent.click(await screen.findByRole('tab', { name: 'Le profil' }));
  fireEvent.change(screen.getByLabelText(/retape le prénom/u), { target: { value: 'Alma' } });
  fireEvent.click(screen.getByRole('button', { name: /Effacer/u }));
  await waitFor(() => expect(api.lireProfil).toHaveBeenCalledWith(profil.id));
}

describe('réinitialiser puis rejouer avec le même profil sans recharger la page', () => {
  it.each([true, false])('relit la génération pour le profil de session ou suivi (%s)', async (session) => {
    const invalidations = vi.spyOn(file, 'invalidateQueries');
    let autoriserLecture!: () => void;
    const lecture = new Promise<void>((resolution) => { autoriserLecture = resolution; });
    api.lireProfil.mockImplementationOnce(async (id: IdProfil) => {
      await lecture;
      return lire(CHEMINS_API.profil(id));
    });
    const { magasin, conservees } = monter(session);
    const ancienne = conservees[0];
    if (!session) fireEvent.click(await screen.findByRole('button', { name: 'Voir le suivi de Alma' }));
    await confirmer();
    await screen.findByText('La remise à zéro est faite. On recharge le profil…');
    expect(screen.queryByRole('tab', { name: 'Les exercices' })).toBeNull();
    expect(magasin.getState().profil).toBeNull();
    expect(magasin.getState().resume).toBeNull();
    await act(async () => { autoriserLecture(); });
    await screen.findByRole('tab', { name: 'Les exercices' });
    expect(window.location.pathname).toBe('/parent/dashboard');
    expect(magasin.getState().resume).toBeNull();
    expect(magasin.getState().paquet).toBeNull();
    expect(magasin.getState().dernierGain).toBeNull();
    expect(magasin.getState().cascade.etoilesTotal).toBe(0);
    expect(ancienne?.generationProgression).toBe(session ? 0 : undefined);
    for (const queryKey of [['parent'], ['profils'], ['monde', profil.id], ['progression', profil.id], ['pastille-sortie']]) {
      expect(invalidations).toHaveBeenCalledWith({ queryKey });
    }
    expect(await lire(CHEMINS_API.progression(profil.id))).toEqual([]);

    fireEvent.click(screen.getByRole('tab', { name: 'Les exercices' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Essayer l’école' }));
    await screen.findByTestId('activite');
    expect(magasin.getState().profil).toMatchObject({ id: profil.id, generationProgression: 1 });
    expect(magasin.getState().journalise).toBe(false);
    expect(conservees).toHaveLength(session ? 1 : 0);

    // Une nouvelle activité enfant, avec le moteur réel et la génération relue : aucun résumé
    // d'avant l'effacement n'est adapté, aucune étoile n'est posée pour rendre le test vert.
    act(() => { magasin.getState().demarrerNoeud(paquet); jouer(magasin); });
    const nouvelle = conservees.at(-1)!;
    expect(nouvelle.generationProgression).toBe(1);
    expect(nouvelle.resume).toEqual(magasin.getState().resume);
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(magasin.getState().dernierGain).toBeNull();
    const cleIdempotence = await calculerCleIdempotence(String(profil.id), String(nouvelle.noeud),
      nouvelle.demarreLe, nouvelle.graine);
    const reponse = await contexte.application.inject({ method: 'POST', url: CHEMINS_API.tentatives,
      payload: { ...nouvelle, cleIdempotence } });
    expect(reponse.statusCode).toBe(201);
    expect(reponse.json<ReponseTentative>().gainCascade.etat.etoilesTotal).toBe(1);
    expect(contexte.base.prepare('SELECT noeud_id FROM tentatives').all()).toEqual([{ noeud_id: 'clairiere-01' }]);
    const progression = await lire(CHEMINS_API.progression(profil.id)) as { noeud: string }[];
    expect(progression.map((entree) => entree.noeud)).toEqual(['clairiere-01']);
  });

  it('une lecture refusée ne permet pas de repartir avec l’ancienne génération', async () => {
    api.lireProfil.mockRejectedValueOnce(new Error('Réseau absent'));
    const { magasin } = monter(true);
    await confirmer();
    const reessayer = await screen.findByRole('button', { name: 'Recharger le profil' });
    expect(screen.getByRole('status').textContent).toContain('La remise à zéro est faite');
    expect(screen.queryByRole('tab', { name: 'Les exercices' })).toBeNull();
    expect(magasin.getState().profil).toBeNull();
    expect(magasin.getState().resume).toBeNull();
    expect(await lire(CHEMINS_API.progression(profil.id))).toEqual([]);
    fireEvent.click(reessayer);
    await screen.findByRole('tab', { name: 'Les exercices' });
    expect(api.reinitialiser).toHaveBeenCalledTimes(1);
    expect(magasin.getState().profil).toMatchObject({ id: profil.id, generationProgression: 1 });
  });
});
