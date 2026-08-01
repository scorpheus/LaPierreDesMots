// Crochets de test — contrat technique v1 § 7.1 et § 7.2.
//
// CE FICHIER N'EST JAMAIS ÉMIS DANS `client/dist/`. Il n'est atteint que par le `await
// import()` gardé de `main.tsx` : en production, la condition est statiquement fausse et
// Rollup élimine le chunk. `scripts/verifier-bundle.mjs` (L-G) échoue si l'une des chaînes
// `__test`, `chargerProfil`, `allerAuNoeud`, `sauterAnimations`, `figerHorloge`,
// `monterCrochetsDeTest` apparaît dans le bundle de production.
//
// Règle de conception qui en découle : AUCUN autre fichier du client ne doit importer celui-ci,
// ni statiquement, ni dynamiquement. Il est une feuille du graphe, toujours.
import type {
  CreationProfil,
  EtatTestSerialisable,
  FixtureProfil,
  IdNoeud,
  SurfaceTest
} from '@pierre/partage';
import { creerProfil, lirePaquetNoeud, lireProfil } from '../api/client.js';
import type { MagasinJeu } from '../etat/magasin.js';
import { figerHorloge } from '../etat/services.js';
import type { ServicesJeu } from '../moteurs/types.js';

export interface DependancesCrochets {
  readonly magasin: MagasinJeu;
  readonly services: ServicesJeu;
}

/**
 * Laisse React peindre avant de rendre la main.
 * On attend un ÉTAT du navigateur (une frame rendue), jamais une durée : c'est la règle non
 * négociable « ne jamais introduire d'attente arbitraire » (CLAUDE.md, annexe T).
 */
function prochaineFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise<void>((resoudre) => {
    requestAnimationFrame(() => {
      resoudre();
    });
  });
}

/** Ré-ensemence l'aléa injecté si `Alea` sait le faire ; sinon, la graine reste déclarative. */
function reensemencer(services: ServicesJeu, graine: number): void {
  const membres = services.alea as unknown as Record<string, unknown>;
  for (const nom of ['reensemencer', 'reinitialiser', 'graine', 'semer']) {
    const methode = membres[nom];
    if (typeof methode === 'function') {
      (methode as (valeur: number) => void).call(services.alea, graine);
      return;
    }
  }
  console.warn('[test] `Alea` ne sait pas se ré-ensemencer : la graine reste déclarative.');
}

export function monterCrochetsDeTest({ magasin, services }: DependancesCrochets): void {
  const surface: SurfaceTest = {
    /**
     * Rend un profil jouable. La fixture porte un `id` ; le serveur, lui, fait foi sur les
     * profils qui existent réellement (une tentative référence `profils(id)` en clé étrangère,
     * § 6.2). On lit donc d'abord, on crée seulement si le profil est absent.
     */
    async chargerProfil(fixture: FixtureProfil): Promise<void> {
      let profil = await lireProfil(fixture.id).catch(() => null);

      if (profil === null) {
        profil = await creerProfil({
          prenom: fixture.prenom,
          avatar: fixture.avatar,
          paletteVariante: fixture.paletteVariante
        } as unknown as CreationProfil);
      }

      magasin.getState().choisirProfil(profil);
      await prochaineFrame();
    },

    async allerAuNoeud(id: IdNoeud): Promise<void> {
      const paquet = await lirePaquetNoeud(id);
      magasin.getState().demarrerNoeud(paquet);
      await prochaineFrame();
    },

    async repondre(action: unknown): Promise<void> {
      magasin.getState().emettre(action);
      await prochaineFrame();
    },

    etat(): EtatTestSerialisable {
      const courant = magasin.getState();
      return {
        ecran: courant.ecran,
        profil: courant.profil === null ? null : courant.profil.id,
        noeud: courant.paquet === null ? null : courant.paquet.noeud.id,
        moteur: courant.codeMoteur,
        progression: courant.progression,
        etatMoteur: courant.etatMoteur,
        aide: courant.aide,
        animationsDesactivees: courant.animationsDesactivees,
        graine: courant.graine
      };
    },

    sauterAnimations(): void {
      // Rend les captures T4 stables SANS attente de durée : la couleur est posée
      // immédiatement et l'état final est identique (§ 5.8).
      magasin.getState().sauterAnimations();
    },

    graine(n: number): void {
      magasin.getState().fixerGraine(n);
      reensemencer(services, n);
    },

    figerHorloge(instant: string): void {
      figerHorloge(services.horloge, instant);
    }
  };

  window.__test = surface;
}
