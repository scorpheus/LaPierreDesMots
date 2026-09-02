/**
 * L'ÉCRAN DE CHOIX DE PROFIL, MONTÉ — `data-ecran="profils"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA MUTATION QUE CE FICHIER DOIT ATTRAPER — M25
 *
 *   « la carte de profil **répond au tap et appelle `surChoix`** »
 *
 * C'est la toute première chose que l'enfant fait, et la seule qu'aucun adulte ne doit avoir à
 * lui expliquer (R18). Une carte muette n'est pas un bug de plus : c'est un jeu qui ne démarre
 * pas. Et rien ne le dirait — l'écran s'affiche, les avatars sont là, les couleurs sont
 * bonnes, et le tap ne fait rien.
 *
 * On n'asserte donc pas « le bouton existe » mais **« le tap écrit dans le magasin »** :
 * `choisirProfil` pose `profil` ET `ecran: 'carte'` (`client/src/etat/magasin.ts`), et c'est
 * cette écriture-là qui fait démarrer le jeu.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Le réseau est bouchonné au niveau du MODULE (`@client/api/client`), pas au niveau de
 * `fetch` : cet écran en appelle quatre — la liste, la création, et les deux lectures de la
 * pastille de sortie (D46) — et boucher chacun par son URL reviendrait à réécrire le client
 * HTTP dans un test. `ErreurReseau` et les autres symboles restent les vrais : on ne remplace
 * que ce qu'on observe.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mondeDeTest, profilDeTest } from './donnees-ecrans.js';

const PROFILS = [profilDeTest('prf-1', 'Alma'), profilDeTest('prf-2', 'Nino')];

const creations: unknown[] = [];
const demandesDeSortie: unknown[] = [];

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    listerProfils: () => Promise.resolve(PROFILS),
    creerProfil: (creation: unknown) => {
      creations.push(creation);
      return Promise.resolve(profilDeTest('prf-3', 'Zoé'));
    },
    // Les trois appels de `PastilleSortie` (D46). Sans eux, la pastille reste en attente et
    // la moitié de l'écran ne se rend jamais.
    lireMonde: () => Promise.resolve(mondeDeTest()),
    lireProgression: () => Promise.resolve([]),
    composerSortie: (_profil: string, demande: unknown) => {
      demandesDeSortie.push(demande);
      const region = (demande as { readonly region: string }).region;
      return Promise.resolve({
        profil: 'prf-1',
        region,
        compagnon: null,
        composeeLe: '2026-09-01T08:00:00.000Z',
        etapes: [
          { rang: 1, role: 'echauffement', noeud: `${region}-03`, habillage: 'pont', competences: [], revisions: [] },
          { rang: 2, role: 'competence-en-cours', noeud: `${region}-04`, habillage: 'mare', competences: [], revisions: [] },
          { rang: 3, role: 'revision', noeud: `${region}-05`, habillage: 'cabane', competences: [], revisions: [] },
          { rang: 4, role: 'synthese', noeud: `${region}-06`, habillage: 'sentier', competences: [], revisions: [] }
        ]
      });
    },
    lirePaquetNoeud: (noeud: string) =>
      Promise.resolve({
        noeud: { id: noeud, region: 'clairiere' },
        exercice: { id: 'clairiere-ecole-01', jeu: { moteur: 'colorie', contenu: {} } },
        habillage: { id: 'ecole', timings: {} }
      })
  };
});

const { EcranProfils } = await import('@client/ecrans/EcranProfils');
const { creerMagasin } = await import('@client/etat/magasin');
const { FournisseurJeu } = await import('@client/etat/services');
const { creerHaptiqueMuette } = await import('@client/gamefeel/haptique-navigateur');
const { creerRetourSensoriel } = await import('@client/gamefeel/retour');
const { servicesDeTest } = await import('../configuration/preparation.js');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

type Magasin = ReturnType<typeof creerMagasin>;

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

interface Monte {
  readonly magasin: Magasin;
  /** Les appels au rappel « ouvrir l'espace des parents ». */
  readonly accesParent: number[];
}

function monter(): Monte {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.setState({ ecran: 'profils' } as never);
  const accesParent: number[] = [];
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranProfils surAccesParent={() => accesParent.push(1)} />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return { magasin, accesParent };
}

/** Attend que la liste des profils soit là : les cartes viennent d'une requête. */
async function monterEtAttendre(): Promise<Monte> {
  const monte = monter();
  await waitFor(() => {
    expect(document.querySelector('[data-profil="prf-1"]')).not.toBeNull();
  });
  return monte;
}

beforeEach(() => {
  creations.length = 0;
  demandesDeSortie.length = 0;
  // Les réglages de lecture, atteints par « Comment je lis », appellent `fetch` en direct
  // (`EcranReglagesLecture` le déclare comme un écart, en tête de son fichier). Sans ce
  // bouchon, l'audit des sorties sème des `ECONNREFUSED` dans le rapport — un test propre ne
  // laisse pas une pile réseau derrière lui.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('', { status: 404 })))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('la carte de profil RÉPOND au tap (M25)', () => {
  it('présente chaque enfant comme le héros de sa propre aventure', async () => {
    await monterEtAttendre();

    expect(document.querySelector('[data-invitation-profils]')?.textContent).toContain(
      'Retrouve ton aventure'
    );
    const portraits = document.querySelectorAll('[data-portrait-profil]');
    expect(portraits, 'les cartes restent de simples boutons avec une initiale').toHaveLength(
      PROFILS.length
    );
    expect(document.querySelectorAll('.carte-profil__paysage')).toHaveLength(PROFILS.length);
    expect(document.querySelector('[data-profil="prf-1"] .carte-profil__appel')?.textContent).toBe(
      'Continuer l’aventure'
    );
  });

  it('rend une carte par profil, avec sa prise stable `data-profil`', async () => {
    await monterEtAttendre();
    const cartes = document.querySelectorAll('[data-profil]');
    console.log(`[QA-2 · profils] cartes rendues : ${String(cartes.length)} pour 2 profils servis`);
    // Le plancher avant l'égalité : « 0 profil servi → 0 carte rendue » la satisfait aussi, et
    // c'est exactement l'écran vide que ce cas doit refuser.
    expect(PROFILS.length, 'le bouchon ne sert plus aucun profil').toBeGreaterThan(0);
    expect(cartes.length, 'un profil servi n’a pas sa carte').toBe(PROFILS.length);
    expect(document.querySelector('[data-profil="prf-2"]')?.getAttribute('aria-label')).toBe(
      'Jouer avec le profil de Nino'
    );
  });

  it('UN TAP suffit : le magasin porte le profil choisi et bascule sur la carte', async () => {
    const { magasin } = await monterEtAttendre();
    expect(magasin.getState().profil).toBeNull();

    fireEvent.click(document.querySelector('[data-profil="prf-2"]')!);

    expect(magasin.getState().profil?.id).toBe('prf-2');
    expect(magasin.getState().ecran).toBe('carte');
  });

  it('la carte tapée est bien CELLE qu’on a tapée — jamais la première de la liste', async () => {
    // Le mutant le plus discret de M25 : un `onClick` qui appelle `surChoix(liste[0])`. Il
    // passe tous les cas à un seul profil ; il tombe ici, et lui seul.
    const { magasin } = await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-profil="prf-1"]')!);
    expect(magasin.getState().profil?.prenom).toBe('Alma');
    cleanup();

    const second = await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-profil="prf-2"]')!);
    expect(second.magasin.getState().profil?.prenom).toBe('Nino');
  });

  it('la pastille compose une vraie sortie et démarre sa première étape en un tap', async () => {
    const { magasin } = await monterEtAttendre();
    const demarrages: unknown[] = [];
    magasin.setState({
      demarrerNoeud: (paquet: unknown) => {
        demarrages.push(paquet);
      }
    } as never);
    const pastille = document.querySelector('[data-pastille-sortie="prf-1"]');
    expect(pastille).not.toBeNull();
    await waitFor(() => {
      expect(pastille?.getAttribute('data-sortie-prete')).toBe('oui');
      expect(pastille?.getAttribute('data-sortie-noeud')).toBe('galeries-03');
    });

    fireEvent.click(pastille!);

    await waitFor(() => {
      expect(demarrages).toHaveLength(1);
    });
    expect((demarrages[0] as { noeud: { id: string } }).noeud.id).toBe('galeries-03');
    expect(demandesDeSortie).toContainEqual({ region: 'galeries', compagnon: null });
    expect(magasin.getState().sortie?.etapes).toHaveLength(4);
  });

  it('aucun mot de passe, aucune confirmation : pas un champ de saisie avant le jeu', async () => {
    await monterEtAttendre();
    // « Grille de cartes-profils avec avatar, UN TAP SUFFIT, AUCUN MOT DE PASSE » (v2 § 11).
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(0);
    // Le seul champ de l'écran est celui de la création, et il est fermé au premier rendu.
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('la porte du parent appelle son rappel, et ne touche jamais au profil de l’enfant', async () => {
    const { magasin, accesParent } = await monterEtAttendre();
    fireEvent.click(document.querySelector('[data-acces-parent="oui"]')!);
    expect(accesParent).toHaveLength(1);
    expect(magasin.getState().profil, 'la porte parent a choisi un profil').toBeNull();
    expect(magasin.getState().ecran).toBe('profils');
  });

  it('la création demande un prénom et n’envoie rien tant qu’il est vide', async () => {
    await monterEtAttendre();
    fireEvent.click(document.querySelector('[aria-label="Créer un nouveau joueur"]')!);
    const champ = document.querySelector<HTMLInputElement>('#prenom-nouveau');
    expect(champ, 'le formulaire de création ne s’ouvre pas').not.toBeNull();

    fireEvent.submit(champ!.closest('form')!);
    expect(creations, 'un profil sans prénom a été envoyé').toHaveLength(0);

    fireEvent.change(champ!, { target: { value: 'Zoé' } });
    fireEvent.submit(champ!.closest('form')!);
    await waitFor(() => {
      expect(creations).toEqual([{ prenom: 'Zoé', paletteVariante: 'clairiere' }]);
    });
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    await monterEtAttendre();
    cleanup();

    let dernier: Monte | null = null;
    const rapport = await exigerUneSortieQuiRepond(
      'profils',
      async () => {
        dernier = await monterEtAttendre();
        return {
          racine: document.body,
          aQuitte: () => {
            if (dernier === null) return false;
            // Trois façons de quitter cet écran, et les trois comptent : le jeu démarre
            // (`ecran` change), la zone parent s'ouvre (le rappel part), ou les réglages de
            // lecture remplacent la liste (`data-ecran` change dans le DOM).
            return (
              dernier.magasin.getState().ecran !== 'profils' ||
              dernier.accesParent.length > 0 ||
              document.querySelector('[data-ecran="profils"]') === null
            );
          }
        };
      },
      cleanup
    );
    expect(rapport.repondent.length).toBeGreaterThanOrEqual(1);
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', async () => {
    await monterEtAttendre();
    const rapport = exigerCibles64('profils', document.body, HORS_ECRAN);
    // Deux cartes, deux pastilles, deux boutons de réglage, « nouveau joueur », la porte
    // parent : la population ne peut pas être maigre sans que l'écran ait perdu quelque chose.
    expect(rapport.population).toBeGreaterThanOrEqual(6);
  });

  it('n’émet jamais `data-etat="echec"` (R14)', async () => {
    await monterEtAttendre();
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});
