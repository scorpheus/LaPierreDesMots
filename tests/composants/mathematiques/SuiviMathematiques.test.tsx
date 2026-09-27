import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IdProfil } from '@pierre/partage';
import { CATALOGUE_MATHS } from '@pierre/partage/mathematiques';
import { SuiviMathematiques } from '@client/parent/SuiviMathematiques';
import { effacerConseilParentMaths, enregistrerConseilParentMaths, lireConseilParentMaths } from '@client/mathematiques/conseil-parent';

const lireBilanParent = vi.hoisted(() => vi.fn());
const lireEtat = vi.hoisted(() => vi.fn());
vi.mock('@client/api/client', () => ({ apiMathematiques: { lireBilanParent, lireEtat } }));

const tentative = (id: string, famille: string, niveau: string, aide = 'aucune', erreursValidees = 0) => ({
  id, instanceId: `instance-${id}`, famille, niveau, projetId: null, erreursValidees, aide, etoiles: 3,
  solution: {}, notions: ['math.test'], contexte: {}, termineLe: '2026-09-26T10:00:00.000Z',
  definition: { modeleId: 'modele-test', versionModele: 1, versionGenerateur: 1, graine: 42 },
});
const etat = (tentatives: readonly ReturnType<typeof tentative>[]) => ({
  generationMaths: 1, reprise: null, projetSuspendu: null,
  preferencesNiveaux: Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
    [famille.id, { niveau: 'decouverte', revision: 0 }])),
  progression: [], projets: [], recompenses: [], tentatives,
});
const bilan = [{ famille: 'MAT-PON-01', niveau: 'exploration', statut: 'reussi-seul', occasions: 2, reussites: 1, erreursValidees: 0, aides: 0, notions: [] }];
function stockage() {
  const valeurs = new Map<string, string>();
  return { getItem: (cle: string) => valeurs.get(cle) ?? null, setItem: (cle: string, valeur: string) => { valeurs.set(cle, valeur); }, removeItem: (cle: string) => { valeurs.delete(cle); } };
}

function monter(profil = 'profil-maths') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendu = render(<QueryClientProvider client={client}><SuiviMathematiques profil={profil as IdProfil} /></QueryClientProvider>);
  return { client, ...rendu };
}
afterEach(() => { cleanup(); lireBilanParent.mockReset(); lireEtat.mockReset(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('SuiviMathematiques', () => {
  it('filtre les réussites du profil par lieu et niveau, sans conclure à une maîtrise', async () => {
    lireBilanParent.mockResolvedValue({ ok: true, valeur: bilan });
    lireEtat.mockResolvedValue({ ok: true, valeur: etat([
      tentative('ponts', 'MAT-PON-01', 'exploration', 'indice', 1),
      tentative('jardin', 'MAT-JAR-01', 'decouverte'),
    ]) });
    monter();
    await screen.findByText('Réussites enregistrées');
    expect(screen.getAllByText('Planches à mesurer')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Lieu'), { target: { value: 'ponts' } });
    expect(screen.getAllByText('Planches à mesurer')).toHaveLength(2);
    expect(screen.queryByText('Bottes de graines')).toBeNull();
    fireEvent.change(screen.getByLabelText('Niveau'), { target: { value: 'defi' } });
    expect(screen.getByText('Aucune réussite ne correspond à ces filtres.')).toBeTruthy();
    expect(screen.queryByText(/maîtrise acquise/u)).toBeNull();
  });

  it('n’autorise le JSON local qu’après les deux lectures et conserve profil, définition et tentatives', async () => {
    lireBilanParent.mockResolvedValue({ ok: true, valeur: bilan });
    let resoudreHistorique: (valeur: unknown) => void = () => undefined;
    lireEtat.mockReturnValue(new Promise((resoudre) => { resoudreHistorique = resoudre; }));
    const creerUrl = vi.fn(() => 'blob:maths');
    const revoquerUrl = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: creerUrl, revokeObjectURL: revoquerUrl });
    let contenu = '';
    vi.stubGlobal('Blob', class {
      constructor(parties: readonly string[]) { contenu = parties.join(''); }
    });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    monter('profil-isole');
    const bouton = await screen.findByRole('button', { name: 'Télécharger le journal maths (JSON)' });
    await screen.findByText('Observations par activité et niveau');
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
    resoudreHistorique({ ok: true, valeur: etat([tentative('ponts', 'MAT-PON-01', 'exploration')]) });
    await waitFor(() => expect((bouton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bouton);
    expect(creerUrl).toHaveBeenCalledOnce();
    expect(clic).toHaveBeenCalledOnce();
    expect(revoquerUrl).toHaveBeenCalledWith('blob:maths');
    expect(JSON.parse(contenu)).toMatchObject({ profilId: 'profil-isole', tentatives: [{
      id: 'ponts', definition: { modeleId: 'modele-test', versionModele: 1, versionGenerateur: 1, graine: 42 },
    }] });
    expect(lireBilanParent).toHaveBeenCalledWith('profil-isole');
    expect(lireEtat).toHaveBeenCalledWith('profil-isole');
  });

  it('ne transforme pas une erreur de lecture en historique vide et bloque l’export', async () => {
    lireBilanParent.mockResolvedValue({ ok: true, valeur: bilan });
    lireEtat.mockResolvedValue({ ok: false, erreur: { code: 'stockage', message: 'indisponible' } });
    monter();
    await screen.findByRole('button', { name: 'Réessayer' });
    expect(screen.queryByText(/Aucune réussite de maths enregistrée/u)).toBeNull();
    expect((screen.getByRole('button', { name: 'Télécharger le journal maths (JSON)' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('garde le conseil sur cet appareil, par profil et génération, sans toucher au journal', () => {
    const memoire = stockage();
    const conseil = { famille: 'MAT-PON-01' as const, niveau: 'exploration' as const, generationMaths: 4 };
    expect(enregistrerConseilParentMaths('alma', conseil, memoire)).toBe('enregistre');
    expect(lireConseilParentMaths('alma', 4, memoire)).toEqual(conseil);
    expect(lireConseilParentMaths('bob', 4, memoire)).toBeNull();
    expect(lireConseilParentMaths('alma', 5, memoire)).toBeNull();
    expect(effacerConseilParentMaths('alma', 4, memoire)).toBe('efface');
    expect(lireConseilParentMaths('alma', 4, memoire)).toBeNull();
    expect(enregistrerConseilParentMaths('alma', conseil, null)).toBe('indisponible');
  });

  it('enregistre le choix de la ligne bilan sur l’appareil', async () => {
    const memoire = stockage();
    vi.stubGlobal('localStorage', memoire);
    lireBilanParent.mockResolvedValue({ ok: true, valeur: bilan });
    lireEtat.mockResolvedValue({ ok: true, valeur: etat([]) });
    monter('profil-conseil');
    const bouton = await screen.findByRole('button', { name: 'Travailler ceci' });
    await waitFor(() => expect((bouton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(bouton);
    expect(lireConseilParentMaths('profil-conseil', 1, memoire)).toMatchObject({ famille: 'MAT-PON-01', niveau: 'exploration' });
  });
});
