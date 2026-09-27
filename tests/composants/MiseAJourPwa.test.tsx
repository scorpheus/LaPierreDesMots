import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EtatMiseAJour } from '@client/pwa/mise-a-jour.js';
import { NotificationMiseAJourPwa, PanneauMiseAJourPwa } from '@client/pwa/MiseAJourPwa.js';

const service = vi.hoisted(() => ({
  lire: vi.fn<() => EtatMiseAJour>(),
  ecouter: vi.fn<(ecouteur: () => void) => () => void>(),
  verifier: vi.fn<() => Promise<void>>(),
  appliquer: vi.fn<() => Promise<void>>(),
  reporter: vi.fn<() => void>()
}));

vi.mock('@client/pwa/mise-a-jour.js', () => ({
  lireEtatMiseAJour: service.lire,
  ecouterMiseAJour: service.ecouter,
  verifierMiseAJour: service.verifier,
  appliquerMiseAJour: service.appliquer,
  reporterMiseAJour: service.reporter
}));

const ecouteurs = new Set<() => void>();
let etat: EtatMiseAJour;

function publier(changements: Partial<EtatMiseAJour>): void {
  act(() => {
    etat = { ...etat, ...changements };
    ecouteurs.forEach((ecouteur) => ecouteur());
  });
}

beforeEach(() => {
  vi.stubEnv('MODE', 'pwa');
  vi.clearAllMocks();
  ecouteurs.clear();
  etat = {
    phase: 'repos',
    versionInstallee: 'version-ancienne',
    versionPrete: null,
    message: 'Le jeu peut chercher une nouvelle version.',
    reportee: false
  };
  service.lire.mockImplementation(() => etat);
  service.ecouter.mockImplementation((ecouteur) => {
    ecouteurs.add(ecouteur);
    return () => { ecouteurs.delete(ecouteur); };
  });
  service.verifier.mockResolvedValue(undefined);
  service.appliquer.mockResolvedValue(undefined);
  service.reporter.mockImplementation(() => publier({ reportee: true }));
  // Happy DOM ne gère pas la couche modale native ; on vérifie l'appel à showModal et cancel.
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
    this.open = true;
  });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('mise à jour PWA dans l’interface', () => {
  it('ne montre ni panneau, ni notification, ni blocage hors de la cible PWA', () => {
    vi.stubEnv('MODE', 'test');
    etat = { ...etat, phase: 'application', versionPrete: 'version-nouvelle' };
    const vue = render(<><PanneauMiseAJourPwa /><NotificationMiseAJourPwa visible /></>);
    expect(vue.container.innerHTML).toBe('');
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    expect(service.appliquer).not.toHaveBeenCalled();
  });

  it('affiche la version utilisée et les changements reçus du service', () => {
    render(<PanneauMiseAJourPwa />);
    expect(screen.getByText('version-ancienne')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Prête à vérifier');
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier les mises à jour' }));
    expect(service.verifier).toHaveBeenCalledTimes(1);
    publier({ phase: 'telechargement', message: 'Les fichiers du jeu arrivent.' });
    expect(screen.getByRole('status').textContent).toContain('Les fichiers du jeu arrivent.');
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).toBeNull();
  });

  it('explique une version inconnue et une mise à jour indisponible au parent', () => {
    etat = { ...etat, phase: 'indisponible', versionInstallee: null, message: 'Ce navigateur ne peut pas mettre le jeu à jour.' };
    render(<PanneauMiseAJourPwa />);
    expect(screen.getByText('inconnue')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(etat.message);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reporte la notification sans retirer la version prête du panneau parent', () => {
    etat = { ...etat, phase: 'prete', versionPrete: 'version-nouvelle' };
    render(<><PanneauMiseAJourPwa /><NotificationMiseAJourPwa visible /></>);
    const notification = screen.getByRole('complementary', { name: 'Mise à jour du jeu' });
    fireEvent.click(within(notification).getByRole('button', { name: 'Plus tard' }));
    expect(service.reporter).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByText('version-nouvelle')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(service.appliquer).toHaveBeenCalledTimes(1);
  });

  it('laisse le parent reporter sans masquer son panneau', () => {
    etat = { ...etat, phase: 'prete', versionPrete: 'version-nouvelle' };
    render(<PanneauMiseAJourPwa />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(service.reporter).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Mettre à jour' })).toBeTruthy();
  });

  it('permet de réessayer la version prête après une erreur d’application', () => {
    etat = { ...etat, phase: 'erreur', versionPrete: 'version-nouvelle', message: 'Ferme l’autre fenêtre du jeu.' };
    render(<PanneauMiseAJourPwa />);
    expect(screen.getByRole('status').textContent).toContain(etat.message);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(service.appliquer).toHaveBeenCalledTimes(1);
  });

  it('attend un écran autorisé et un clic avant de lancer la mise à jour', () => {
    etat = { ...etat, phase: 'prete', versionPrete: 'version-nouvelle' };
    const vue = render(<NotificationMiseAJourPwa visible={false} />);
    expect(vue.container.innerHTML).toBe('');
    expect(service.appliquer).not.toHaveBeenCalled();
    vue.rerender(<NotificationMiseAJourPwa visible />);
    expect(screen.getByText('Une nouvelle version du jeu est prête.')).toBeTruthy();
    expect(service.appliquer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(service.appliquer).toHaveBeenCalledTimes(1);
  });

  it('ouvre le dialogue modal même si les notifications sont masquées ou reportées', () => {
    etat = { ...etat, phase: 'application', reportee: true };
    render(<NotificationMiseAJourPwa visible={false} />);
    const dialogue = screen.getByRole('dialog', { name: 'Le jeu se prépare…' }) as HTMLDialogElement;
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(dialogue.open).toBe(true);
    const annulation = new Event('cancel', { cancelable: true, bubbles: false });
    fireEvent(dialogue, annulation);
    expect(annulation.defaultPrevented).toBe(true);
    expect(dialogue.open).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
    publier({ phase: 'erreur', message: 'Activation impossible.' });
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('retire le blocage après erreur et donne au parent la raison du refus', () => {
    etat = { ...etat, phase: 'prete', versionPrete: 'version-nouvelle' };
    service.appliquer.mockImplementation(async () => { publier({ phase: 'application' }); });
    render(<NotificationMiseAJourPwa visible />);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    publier({ phase: 'erreur', message: 'Le service worker ne répond pas.' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Le service worker ne répond pas.');
    expect(screen.queryByText('Pour les parents')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('garde les erreurs automatiques dans le panneau parent', () => {
    etat = { ...etat, phase: 'erreur', message: 'Le réseau ne répond pas.' };
    render(<><PanneauMiseAJourPwa /><NotificationMiseAJourPwa visible /></>);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(etat.message);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
