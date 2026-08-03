/**
 * LES RÉGLAGES DE LECTURE, MONTÉS — `data-ecran="reglages-lecture"`. Lot QA-2.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « une sortie existe, LES RÉGLAGES SE PROPAGENT ».
 *
 * La seconde moitié est la vraie. Cet écran est celui de D18 et D19 — l'enfant confond des
 * lettres miroir et déchiffre encore ; la typographie est le seul levier qui agisse sur toutes
 * les autres pages à la fois. Un écran de réglages dont les boutons bougent un nombre à
 * l'écran mais ne changent RIEN au texte est parfaitement invisible : la page s'affiche, les
 * cibles répondent, le compteur avance. Et l'enfant lit exactement comme avant.
 *
 * On mesure donc la CHAÎNE ENTIÈRE, en trois maillons :
 *   1. le geste change la valeur retenue (`data-valeur-brute`) ;
 *   2. la valeur retenue change l'APERÇU réellement rendu (les variables CSS de la zone) ;
 *   3. la valeur retenue part au serveur (`PUT /api/profils/:id/reglages`).
 * Casser n'importe lequel des trois casse le réglage, et chacun se casse séparément.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠ Cet écran appelle `fetch` EN DIRECT — écart déclaré en tête de `EcranReglagesLecture.tsx`.
 * On boucle donc `fetch`, et on l'observe : c'est la seule façon de voir le troisième maillon.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BORNES_REGLAGES, REGLAGES_PAR_DEFAUT } from '@pierre/partage/lecture';
import { EcranReglagesLecture, INTERRUPTEURS_DE_LECTURE } from '@client/ecrans/EcranReglagesLecture';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import { servicesDeTest } from '../configuration/preparation.js';
import { profilDeTest } from './donnees-ecrans.js';
import { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } from './exigences-ecrans.js';

interface AppelReseau {
  readonly methode: string;
  readonly chemin: string;
  readonly corps: unknown;
}

const appels: AppelReseau[] = [];
const fermetures: number[] = [];

/** Plancher de groupes de réglage — six au 2026-08-03. Il tue la version creuse du cas. */
const GROUPES_REGLAGE_MIN = 5;

/**
 * Le seul groupe dispensé de bouton d'écoute : les bascules.
 *
 * Ses contrôles portent leur propre intitulé et n'offrent aucun texte à déchiffrer. Est-ce
 * que R15 devrait quand même les rendre audibles ? C'est un arbitrage de conception, consigné
 * dans `Docs/questions-en-attente.md` ; ce test fige l'état MESURÉ, il ne le tranche pas.
 */
const GROUPE_SANS_ECOUTE = 'options';

/**
 * Ce que le serveur a DÉJÀ retenu pour ce profil — volontairement différent des défauts.
 *
 * ⚠ MESURE QUI A CORRIGÉ CE FICHIER. Servir les défauts rendait l'attente inopérante :
 * `waitFor(valeur === defaut)` est vrai AVANT que la requête n'ait répondu, puisque l'écran
 * part des défauts. Le cas tapait « + », voyait 25, puis la réponse arrivait et le
 * `useEffect` de l'écran remettait 24 — 24 attendu 25, sur un écran pourtant juste. Une
 * réponse qui diffère de l'état initial est la seule qui prouve qu'elle est arrivée.
 */
const REGLAGES_ENREGISTRES = {
  ...REGLAGES_PAR_DEFAUT,
  corpsPx: 30,
  police: 'luciole' as const
};

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

/**
 * Le serveur, réduit à ce qu'on observe : il rend les réglages qu'on lui envoie.
 *
 * Il ne rend PAS un objet figé : renvoyer toujours les défauts masquerait le troisième
 * maillon — l'écran repartirait du défaut à chaque enregistrement, et le test resterait vert
 * sur un réglage qui ne tient pas.
 */
function installerReseau(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown, options?: { method?: string; body?: string }) => {
      const chemin = String(
        typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree)
      );
      const methode = options?.method ?? 'GET';
      const corps = options?.body === undefined ? null : JSON.parse(options.body);
      appels.push({ methode, chemin, corps });
      if (methode === 'GET') {
        return new Response(JSON.stringify(REGLAGES_ENREGISTRES), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(corps), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    })
  );
}

function monter(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranReglagesLecture
          profil={profilDeTest()}
          surFermeture={() => fermetures.push(1)}
        />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}

function valeurBrute(champ: string): number {
  return Number(
    document.querySelector(`[data-valeur-brute][data-valeur="${champ}"]`)
      ?.getAttribute('data-valeur-brute')
  );
}

function plus(champ: string): void {
  fireEvent.click(document.querySelector(`[data-reglage="${champ}"][data-sens="plus"]`)!);
}

/** Attend que les réglages ENREGISTRÉS soient posés — l'état, jamais une durée. */
async function monterEtAttendre(): Promise<void> {
  monter();
  await waitFor(() => {
    expect(valeurBrute('corpsPx')).toBe(REGLAGES_ENREGISTRES.corpsPx);
  });
}

beforeEach(() => {
  appels.length = 0;
  fermetures.length = 0;
  installerReseau();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('les réglages SE PROPAGENT — les trois maillons de la chaîne', () => {
  it('maillon 0 : l’écran repart des réglages ENREGISTRÉS, jamais des défauts', async () => {
    await monterEtAttendre();
    // Un écran qui ignorerait la réponse serait invisible : il montrerait des réglages
    // plausibles, et l'enfant retrouverait la typographie de tout le monde à chaque visite.
    expect(valeurBrute('corpsPx')).not.toBe(REGLAGES_PAR_DEFAUT.corpsPx);
    expect(
      document.querySelector('[data-choix-police="luciole"]')?.getAttribute('data-choisi')
    ).toBe('oui');
    expect(
      document.querySelector('[data-choix-police="andika"]')?.getAttribute('data-choisi')
    ).toBe('non');
  });

  it('maillon 1 : le geste avance d’UN PAS, celui que le référentiel déclare', async () => {
    await monterEtAttendre();

    plus('corpsPx');
    const attendu = REGLAGES_ENREGISTRES.corpsPx + BORNES_REGLAGES.corpsPx.pas;
    console.log(
      `[QA-2 · reglages-lecture] corpsPx : ${String(REGLAGES_ENREGISTRES.corpsPx)} → ` +
        `${String(valeurBrute('corpsPx'))} (pas déclaré : ${String(BORNES_REGLAGES.corpsPx.pas)})`
    );
    // Le pas vient de `BORNES_REGLAGES`, jamais d'un nombre recopié ici : une seule vérité.
    expect(valeurBrute('corpsPx')).toBe(attendu);
  });

  it('maillon 1 bis : le pas fractionnaire ne dérive PAS en flottant', async () => {
    await monterEtAttendre();
    plus('interlettrageEm');

    // ⚠ CE CAS SE LIT AVEC SA MESURE, sinon il a l'air d'un caprice.
    //   somme naïve : 0.06 + 0.01 = 0.06999999999999999   (IEEE 754)
    //   valeur rendue par l'écran : 0.07                  (`auPas`, EcranReglagesLecture.tsx)
    // La somme naïve est ce que ce test attendait d'abord, et c'est LUI qui avait tort.
    // Sans `auPas`, le nombre affiché, la variable CSS et la valeur enregistrée divergeraient
    // tous les trois — et `0.06999999999999999` partirait dans le corps du PUT.
    const naive = REGLAGES_PAR_DEFAUT.interlettrageEm + BORNES_REGLAGES.interlettrageEm.pas;
    console.log(
      `[QA-2 · reglages-lecture] interlettrage — somme naïve ${String(naive)}, ` +
        `rendu ${String(valeurBrute('interlettrageEm'))}`
    );
    expect(valeurBrute('interlettrageEm')).toBe(0.07);
    expect(String(valeurBrute('interlettrageEm')).length, 'la valeur a dérivé en flottant')
      .toBeLessThanOrEqual(4);
  });

  it('maillon 2 : l’APERÇU rendu change avec la valeur — pas seulement le nombre', async () => {
    await monterEtAttendre();
    expect(document.querySelector('[data-lecture]')).not.toBeNull();
    const avant = document.querySelector<HTMLElement>('[data-lecture]')!.getAttribute('style');
    plus('corpsPx');
    plus('corpsPx');
    const apres = document.querySelector<HTMLElement>('[data-lecture]')!.getAttribute('style');
    console.log(`[QA-2 · reglages-lecture] style de l’aperçu — changé : ${String(avant !== apres)}`);
    // C'est ICI que se voit un réglage décoratif : le compteur bougerait, l'aperçu non.
    expect(apres, 'l’aperçu ne bouge pas quand le réglage change').not.toBe(avant);
  });

  it('maillon 3 : la valeur PART au serveur, sur le bon chemin et par PUT', async () => {
    await monterEtAttendre();
    plus('corpsPx');
    await waitFor(() => {
      expect(appels.some((appel) => appel.methode === 'PUT')).toBe(true);
    });
    const envoi = appels.find((appel) => appel.methode === 'PUT')!;
    expect(envoi.chemin).toContain('/api/profils/prf-1/reglages');
    expect((envoi.corps as { corpsPx: number }).corpsPx).toBe(
      REGLAGES_ENREGISTRES.corpsPx + BORNES_REGLAGES.corpsPx.pas
    );
  });

  it('les bascules changent d’état et partent aussi — les quatre, pas seulement la première', async () => {
    await monterEtAttendre();
    const bascules = [...INTERRUPTEURS_DE_LECTURE, 'fond'];
    for (const cle of bascules) {
      const bouton = document.querySelector(`[data-bascule="${cle}"]`);
      expect(bouton, `bascule « ${cle} » absente`).not.toBeNull();
      const avant = bouton!.getAttribute('data-actif');
      fireEvent.click(bouton!);
      expect(
        document.querySelector(`[data-bascule="${cle}"]`)?.getAttribute('data-actif'),
        `la bascule « ${cle} » ne change pas d’état`
      ).not.toBe(avant);
    }
    await waitFor(() => {
      expect(appels.filter((appel) => appel.methode === 'PUT').length).toBeGreaterThanOrEqual(
        bascules.length
      );
    });
  });

  it('aucun curseur à faire glisser : R16 interdit la coordination fine', () => {
    monter();
    // « Un `<input type="range">` demande de viser une poignée de quelques pixels et de la
    // tenir : c'est précisément le geste que R16 écarte » (en-tête de l'écran).
    expect(document.querySelectorAll('input[type="range"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-reglage]').length).toBeGreaterThanOrEqual(8);
  });

  it('rien n’est écrit sans être audible : chaque groupe de LECTURE porte son écoute (R15)', () => {
    monter();
    const groupes = [...document.querySelectorAll('[data-groupe-reglage]')];
    const avecEcoute = groupes.filter((groupe) => groupe.querySelector('[data-ecouter]') !== null);
    const sansEcoute = groupes
      .filter((groupe) => groupe.querySelector('[data-ecouter]') === null)
      .map((groupe) => groupe.getAttribute('data-groupe-reglage'));
    console.log(
      `[QA-2 · reglages-lecture] groupes : ${String(groupes.length)}, ` +
        `portant une écoute : ${String(avecEcoute.length)}, ` +
        `sans écoute : ${sansEcoute.join(', ') || 'aucun'}`
    );
    // ── POURQUOI ON NE COMPARE PAS LES DEUX COMPTES ─────────────────────────────────────────
    // Le premier jet imprimait « groupes : 6, boutons d'écoute : 6 » et n'assertait que le
    // second. Les deux comptes sont bien égaux — et l'égalité est une COÏNCIDENCE : un des six
    // boutons d'écoute est celui du TITRE, qui n'appartient à aucun groupe, et le groupe des
    // bascules n'en porte aucun. `ecoutes.length === groupes.length` serait donc passé au vert
    // en affirmant une bijection qui n'existe pas. On énumère les OBJETS (D48).
    expect(groupes.length, 'l’écran a perdu ses groupes de réglage').toBeGreaterThanOrEqual(
      GROUPES_REGLAGE_MIN
    );
    // Un seul groupe est dispensé : les bascules, dont chaque contrôle porte son propre
    // intitulé et ne donne aucun texte à déchiffrer. Tous les autres doivent être audibles.
    expect(sansEcoute, 'un groupe de lecture a perdu son bouton d’écoute (R15)').toEqual([
      GROUPE_SANS_ECOUTE
    ]);
    expect(avecEcoute.length, 'plus d’un groupe reste muet').toBe(groupes.length - 1);

    // Un bouton d'écoute dont le seul effet est inaudible est indiscernable d'un bouton cassé :
    // `data-ecoutes` est la trace que le tap a été reçu. C'est le défaut n° 2 du père.
    const premier = document.querySelector('[data-ecouter="titre"]')!;
    expect(premier.getAttribute('data-ecoutes')).toBe('0');
    fireEvent.click(premier);
    expect(document.querySelector('[data-ecouter="titre"]')?.getAttribute('data-ecoutes')).toBe('1');
  });

  it('rien ne peut être raté ici : aucun bouton « valider », aucun écran d’erreur (R14)', () => {
    monter();
    expect(document.body.textContent).not.toMatch(/valider|enregistrer maintenant/iu);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    expect(
      document.querySelector('[data-etat-enregistrement]')?.getAttribute('data-etat-enregistrement')
    ).not.toBe('echec');
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    const rapport = await exigerUneSortieQuiRepond(
      'reglages-lecture',
      () => {
        monter();
        return { racine: document.body, aQuitte: () => fermetures.length > 0 };
      },
      () => {
        fermetures.length = 0;
        cleanup();
      }
    );
    // Une seule sortie, et c'est bien : tout le reste de l'écran est un réglage, pas une porte.
    expect(rapport.repondent).toHaveLength(1);
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', () => {
    monter();
    const rapport = exigerCibles64('reglages-lecture', document.body, HORS_ECRAN);
    // 5 polices + 8 moins/plus + 5 écoutes + 4 bascules + le retour : l'écran est dense, et
    // c'est justement pour ça que R16 y compte.
    expect(rapport.population).toBeGreaterThanOrEqual(20);
  });
});
