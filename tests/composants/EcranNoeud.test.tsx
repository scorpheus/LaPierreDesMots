/**
 * L'HÔTE DU MOTEUR, MONTÉ — `data-ecran="noeud"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA MUTATION QUE CE FICHIER DOIT ATTRAPER — M2 de l'audit, § 2, ligne 2 du tableau
 *
 *   « Le bouton “La carte” **retiré** de l'écran du nœud » · `client/src/ecrans/EcranNoeud.tsx`
 *   · attrapée par la QA : **NON** · seule couverture : un E2E sur pièce, 9,0 s, au `pre-push`.
 *
 * C'est le défaut n° 1 du dossier, dans sa forme exacte : le père s'est trouvé bloqué dans les
 * Galeries — « il n'y a pas de bouton retour » —, et un enfant, lui, n'aurait pas su le dire.
 * `EcranNoeud.tsx` porte l'encadré qui raconte l'épisode ; il n'avait, jusqu'ici, aucun test
 * de composant pour le garder.
 *
 * L'assertion n'est pas « le bouton existe » — un bouton mort existe aussi. Elle est **« il
 * mène ailleurs »** : `exigerUneSortieQuiRepond` essaie CHAQUE objet tapable de l'écran, un
 * montage neuf par objet, et exige qu'au moins un fasse changer `EtatMagasin.ecran`. C'est la
 * leçon D48 appliquée à l'écran où elle a été payée.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Les données viennent du DISQUE — l'exercice, le nœud et l'habillage réels de la Clairière.
 * Un paquet fabriqué à la main testerait une maquette ; ici c'est le moteur `colorie` réel qui
 * est monté par la coquille, exactement comme en jeu.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Exercice, Noeud } from '@pierre/partage';
import { EcranNoeud } from '@client/ecrans/EcranNoeud';
import { creerMagasin } from '@client/etat/magasin';
import type { MagasinJeu } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import {
  CHEMIN_EXERCICE_ECOLE,
  CHEMIN_NOEUD_CLAIRIERE,
  RACINE_DEPOT,
  habillageEcole,
  lireJson,
  servicesDeTest
} from '../configuration/preparation.js';
import { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } from './exigences-ecrans.js';

const { effacementsParticules } = vi.hoisted(() => ({ effacementsParticules: vi.fn() }));

vi.mock('@client/gamefeel/particules', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  effacerParticules: effacementsParticules
}));

const PAQUET = {
  noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE),
  exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
  habillage: habillageEcole()
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
 * Le décor vient du disque, comme dans `MoteurColorie.test.tsx`, et pour la même raison :
 * un `fetch` qui échoue laisse le moteur jouer son décor de repli, et l'écran réel — celui
 * que l'enfant voit — ne serait alors testé par personne. Tout appel sortant est refusé.
 */
function installerFetchLocal(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown): Promise<Response> => {
      const url = String(
        typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree)
      );
      const apres = url.split('/api/contenu/assets/')[1] ?? url.split('contenu/')[1];
      if (apres === undefined) {
        throw new Error(`appel sortant interdit en test : ${url}`);
      }
      const corps = readFileSync(join(RACINE_DEPOT, 'contenu', ...apres.split('/')), 'utf8');
      return new Response(corps, {
        status: 200,
        headers: { 'content-type': apres.endsWith('.svg') ? 'image/svg+xml' : 'application/json' }
      });
    })
  );
}

/** Monte l'écran sur un nœud démarré, et rend le magasin pour observer l'écran courant. */
function monter(): { readonly magasin: MagasinJeu; readonly racine: ParentNode } {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.getState().demarrerNoeud(PAQUET as never);
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranNoeud />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return { magasin, racine: document.body };
}

function monterSansPaquet(): MagasinJeu {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.setState({ ecran: 'noeud' } as never);
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranNoeud />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return magasin;
}

function choisirCompagnon(magasin: MagasinJeu, code: 'filou' | 'roc' | 'plume' | 'bulle'): void {
  magasin.getState().demarrerSortie({
    profil: 'profil-compagnon',
    region: 'clairiere',
    compagnon: code,
    etapes: [{
      rang: 1,
      role: 'echauffement',
      noeud: PAQUET.noeud.id,
      habillage: PAQUET.habillage.id,
      competences: [],
      revisions: [],
    }],
    composeeLe: '2026-09-04T20:00:00.000Z',
  } as never);
}

beforeEach(() => {
  installerFetchLocal();
  effacementsParticules.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('l’écran du nœud a une sortie, et elle mène ailleurs (M2)', () => {
  it('efface l’onde en quittant le nœud pour la carte', () => {
    monter();
    fireEvent.click(document.querySelector('[data-vers="carte"]')!);
    expect(effacementsParticules).toHaveBeenCalledTimes(1);
  });

  it('donne une stratégie visible différente de la consigne, sans recycler son clip audio', () => {
    monter();
    const consigne = document.querySelector('[data-consigne="c1"]')?.textContent?.trim();

    fireEvent.click(document.querySelector('[data-action="aide"]')!);

    const gobi = document.querySelector('[data-gobi-dit="aide"]');
    const texteAide = gobi?.querySelector('.gobi-bulle p')?.textContent?.trim();
    expect(gobi?.getAttribute('data-aide-source')).toBe('strategie');
    expect(gobi?.getAttribute('data-aide-code')).toBe('relire-consigne');
    expect(texteAide).not.toBe(consigne);
    expect(gobi?.querySelector('[data-action="ecouter"]')).toBeNull();
  });

  it.each([
    ['filou', 'Filou', 'assets/compagnons/filou.png'],
    ['roc', 'Roc', 'assets/compagnons/roc.png'],
    ['plume', 'Plume', 'assets/compagnons/plume.png'],
    ['bulle', 'Bulle', 'assets/compagnons/bulle.png']
  ] as const)('fait porter l’aide au compagnon choisi : %s', (code, libelle, asset) => {
    const { magasin } = monter();
    choisirCompagnon(magasin, code);
    fireEvent.click(document.querySelector('[data-action="aide"]')!);

    const aideur = document.querySelector('[data-aideur]');
    expect(aideur?.getAttribute('data-aideur')).toBe(code);
    expect(aideur?.querySelector('img')?.getAttribute('src')).toContain(asset);
    expect(document.querySelector('.gobi-bulle')?.textContent).not.toContain('Gobi');
    expect(document.querySelector('[data-action="aide"]')?.getAttribute('aria-label'))
      .toBe(`Demander de l’aide à ${libelle}`);
  });

  it('conserve Gobi comme repli quand aucune bande n’est sélectionnée', () => {
    monter();
    fireEvent.click(document.querySelector('[data-action="aide"]')!);

    expect(document.querySelector('[data-aideur]')).toBeNull();
    expect(document.querySelector('[data-gobi-dit="aide"] svg')?.getAttribute('aria-label'))
      .toContain('Gobi');
    expect(document.querySelector('[data-action="aide"]')?.getAttribute('aria-label'))
      .toBe('Demander de l’aide à Gobi');
  });

  it('rend le nœud, et non l’écran d’attente, dès que le paquet est posé', () => {
    monter();
    expect(document.querySelector('[data-ecran="noeud"]')).not.toBeNull();
    expect(document.querySelector('[data-ecran="chargement"]')).toBeNull();
  });

  it('garde /noeud lisible et quittable si son paquet a disparu après un rafraîchissement', () => {
    const magasin = monterSansPaquet();
    expect(document.querySelector('[data-ecran="noeud"]')?.getAttribute('data-noeud')).toBe('indisponible');
    expect(document.body.textContent).toContain('Choisis un chemin sur la carte pour jouer.');
    fireEvent.click(document.querySelector('[data-vers="carte"]')!);
    expect(magasin.getState().ecran).toBe('carte');
  });

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * L'EXIGENCE QUI A SUIVI SON OBJET — R49
   *
   * « la phrase est en haut et en bas, il y a doublon » (le père, 2026-08-07). Les moteurs ont
   * cessé de redire la consigne ; `EcranNoeud` la porte seul, parce qu'il est le seul à avoir
   * la clé du `BoutonEcouter`.
   *
   * `tests/composants/MoteurColorie.test.tsx` l'exigeait dix-sept fois DANS LE MOTEUR, monté
   * isolément. L'y exiger encore reviendrait à exiger le retour du doublon ; l'en retirer sans
   * plus reviendrait à perdre l'exigence avec le déménagement — et **une exigence qui disparaît
   * avec un déménagement n'aurait jamais rien gardé** (le précédent est écrit dans
   * `campement-affordance.test.tsx`, pour `etagere` puis `butin`).
   *
   * Elle se pose donc ICI, une fois, sur l'écran qui la rend pour les QUATORZE moteurs — au
   * lieu de dix-sept fois sur un seul. Le sens inverse — qu'aucun moteur ne la reprenne — est
   * gardé par `tests/unitaires/consigne-sans-doublon.test.ts`.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  it('R49 — porte la consigne de l’étape, et elle y est LISIBLE', () => {
    monter();
    const barre = document.querySelector('[data-consigne]');
    expect(barre, 'la barre de consigne a disparu : plus personne ne dit à l’enfant quoi faire')
      .not.toBeNull();
    const texte = (barre?.textContent ?? '').trim();
    console.log(`[R49] consigne rendue par EcranNoeud : « ${texte.slice(0, 60)} »`);
    expect(
      texte.length,
      'la barre de consigne est vide : depuis R49 elle est le SEUL endroit qui la dit, donc ' +
        'son vide laisse l’enfant sans consigne du tout',
    ).toBeGreaterThan(0);

    // ── ET L'AUDIBILITÉ ? ELLE EST GARDÉE AILLEURS, ET J'AI VÉRIFIÉ AVANT DE RETIRER ──────
    //
    // `MoteurPlace.test.tsx` gardait « la consigne est LUE à l'écran ET annoncée ». Retirer ce
    // cas sans savoir où va la seconde moitié aurait perdu l'exigence en croyant la déplacer.
    //
    // Mesuré : `tests/e2e/parcours-variete.spec.ts:300` exige déjà `[data-action="ecouter"]`
    // sur l'application réelle — c'est la prise mécanique de R15, « aucune consigne n'existe
    // uniquement à l'écrit ». Elle y est mieux gardée qu'ici : ce harnais monte l'écran sans
    // étape courante, donc `EcranNoeud` n'y rend pas encore son bouton, et l'exiger ICI
    // rougirait pour l'état du harnais, pas pour un défaut du produit.
  });

  it('porte la prise `[data-vers="carte"]`, avec un libellé qu’un lecteur d’écran annonce', () => {
    monter();
    const sortie = document.querySelector('[data-vers="carte"]');
    expect(sortie, 'la sortie de l’écran du nœud a disparu — c’est le défaut n° 1 du dossier')
      .not.toBeNull();
    expect(sortie!.getAttribute('aria-label')).toBe('Revenir à la carte');
  });

  it('la sortie CHANGE l’écran courant : un tap, et `EtatMagasin.ecran` vaut `carte`', () => {
    const { magasin } = monter();
    expect(magasin.getState().ecran).toBe('noeud');
    fireEvent.click(document.querySelector('[data-vers="carte"]')!);
    expect(magasin.getState().ecran).toBe('carte');
  });

  it('AU MOINS un objet tapable mène ailleurs — essayés un par un, pas comptés', async () => {
    let dernier: MagasinJeu | null = null;
    const rapport = await exigerUneSortieQuiRepond(
      'noeud',
      () => {
        const monte = monter();
        dernier = monte.magasin;
        return {
          racine: monte.racine,
          aQuitte: () => dernier !== null && dernier.getState().ecran !== 'noeud'
        };
      },
      cleanup
    );
    // La sortie est UNIQUE et c'est voulu : « un seul tap, aucune confirmation »
    // (`EcranNoeud.tsx`, encadré de `retourCarte`). Un second chemin de départ apparu par
    // accident se verrait ici plutôt que de passer pour une amélioration.
    expect(rapport.repondent).toHaveLength(1);
    expect(rapport.repondent[0]).toContain('data-vers="carte"');
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', () => {
    monter();
    // `HORS_ECRAN` retire le moteur monté : ses cibles appartiennent aux 14 tests de moteur et
    // à `tests/qualite/a11y.spec.ts`, qui mesure de vrais pixels. Le motif — et le fait qu'il
    // ne cache aucun défaut — est écrit dans `exigences-ecrans.ts`.
    const rapport = exigerCibles64('noeud', document.body, HORS_ECRAN);
    // La coquille porte au moins la sortie et le bouton d'aide : une population qui
    // tomberait à 1 dirait que l'écran s'est vidé, pas qu'il est devenu conforme.
    expect(rapport.population).toBeGreaterThanOrEqual(2);
  });

  it('n’émet jamais `data-etat="echec"`, même après avoir tout tapé (R14)', () => {
    monter();
    for (const objet of document.querySelectorAll('button, [role="button"]')) {
      fireEvent.click(objet);
    }
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});
