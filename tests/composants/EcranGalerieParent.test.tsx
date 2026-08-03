/**
 * LA GALERIE PARENT EN PLEIN ÉCRAN, MONTÉE — `data-ecran="galerie-parent"`. Lot QA-2.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « une sortie existe ». Ici la formulation est trop faible, et le
 * dossier dit pourquoi : cet écran a EXISTÉ SANS ÊTRE ATTEIGNABLE. Mesuré dans `routeur.tsx` :
 *
 *     $ grep -rn "EcranGalerieParent" client/src --include=*.tsx | grep -v son propre fichier
 *     (aucune sortie)
 *
 * Écrit, compilé, testé — et importé par personne pendant toute une campagne. Le test de
 * composant ne peut pas garder le CÂBLAGE (c'est le rôle de `parcours-audit-tout-le-site`),
 * mais il peut garder ce qui aurait rendu l'écran inutile même une fois câblé : **la sortie
 * existe DANS LES TROIS ÉTATS** — pendant l'attente, sur erreur, et sur catalogue chargé.
 *
 * C'est le point qui compte : une sortie rendue seulement quand les données arrivent n'est pas
 * une sortie, c'est une récompense. Et l'écran où le réseau échoue est précisément celui d'où
 * l'on veut partir.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CATALOGUE = {
  entrees: [
    {
      exercice: 'clairiere-ecole-01',
      titre: 'L’école',
      moteur: 'colorie',
      habillage: 'ecole',
      competences: ['ou'],
      region: 'clairiere',
      statut: 'valide'
    }
  ],
  moteursParCompetence: { ou: ['colorie'] },
  habillagesParMoteur: { colorie: ['ecole'] }
};

/** `null` : la requête ne se résout jamais — c'est l'état d'ATTENTE, celui qu'on veut voir. */
let catalogue: unknown = CATALOGUE;
let enErreur = false;

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    lireGalerieParent: () => {
      if (enErreur) {
        return Promise.reject(new Error('la Pierre ne répond pas'));
      }
      if (catalogue === null) {
        return new Promise(() => undefined);
      }
      return Promise.resolve(catalogue);
    }
  };
});

const { EcranGalerieParent } = await import('@client/ecrans/EcranGalerieParent');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

const retours: number[] = [];

function monter(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EcranGalerieParent profil={'prf-1' as never} surRetour={() => retours.push(1)} />
    </QueryClientProvider>
  );
}

/** La sortie de l'en-tête, celle qui doit exister dans les trois états. */
function sortie(): Element | null {
  return document.querySelector('[data-galerie-retour="oui"]');
}

beforeEach(() => {
  catalogue = CATALOGUE;
  enErreur = false;
  retours.length = 0;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('la sortie existe dans les TROIS états, jamais seulement au succès', () => {
  it('pendant l’attente — la requête ne s’est pas encore résolue', () => {
    catalogue = null;
    monter();
    expect(document.body.textContent).toContain('On rassemble les exercices');
    expect(sortie(), 'aucune sortie pendant le chargement').not.toBeNull();
    fireEvent.click(sortie()!);
    expect(retours).toHaveLength(1);
  });

  it('sur ERREUR — c’est justement là qu’on veut partir', async () => {
    enErreur = true;
    monter();
    await waitFor(() => {
      expect(document.body.textContent).toContain('Les exercices n’arrivent pas');
    });
    expect(sortie(), 'aucune sortie quand le réseau échoue').not.toBeNull();
    // Une seconde issue, et elle ne mène pas dehors mais elle ne bloque pas non plus :
    // réessayer. Ni reproche, ni cul-de-sac.
    expect(document.body.textContent).toContain('Réessayer');
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });

  it('sur catalogue CHARGÉ — et le catalogue servi est bien rendu', async () => {
    monter();
    await waitFor(() => {
      expect(document.querySelector('[data-indicateur="galerie"]')).not.toBeNull();
    });
    expect(sortie()).not.toBeNull();
    expect(
      document.querySelector('[data-galerie-total]')?.getAttribute('data-galerie-total')
    ).toBe(String(CATALOGUE.entrees.length));
    expect(document.querySelector('[data-galerie-exercice="clairiere-ecole-01"]')).not.toBeNull();
  });

  it('la sortie est dans l’EN-TÊTE, donc visible sans défiler', async () => {
    monter();
    await waitFor(() => {
      expect(document.querySelector('[data-indicateur="galerie"]')).not.toBeNull();
    });
    // « Une sortie qu'il faut chercher est une sortie qui n'existe pas pour qui ne la
    // cherche pas » (`EcranGalerieParent.tsx`). L'en-tête est la traduction de cette phrase.
    expect(sortie()!.closest('header'), 'la sortie a quitté l’en-tête').not.toBeNull();
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    const rapport = await exigerUneSortieQuiRepond(
      'galerie-parent',
      async () => {
        monter();
        await waitFor(() => {
          expect(document.querySelector('[data-indicateur="galerie"]')).not.toBeNull();
        });
        return { racine: document.body, aQuitte: () => retours.length > 0 };
      },
      () => {
        retours.length = 0;
        cleanup();
      }
    );
    expect(rapport.repondent).toHaveLength(1);
    expect(rapport.repondent[0]).toContain('data-galerie-retour="oui"');
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', async () => {
    monter();
    await waitFor(() => {
      expect(document.querySelector('[data-indicateur="galerie"]')).not.toBeNull();
    });
    const rapport = exigerCibles64('galerie-parent', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(1);
  });
});
