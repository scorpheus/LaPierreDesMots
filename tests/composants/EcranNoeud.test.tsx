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

beforeEach(() => {
  installerFetchLocal();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('l’écran du nœud a une sortie, et elle mène ailleurs (M2)', () => {
  it('rend le nœud, et non l’écran d’attente, dès que le paquet est posé', () => {
    monter();
    expect(document.querySelector('[data-ecran="noeud"]')).not.toBeNull();
    expect(document.querySelector('[data-ecran="chargement"]')).toBeNull();
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
