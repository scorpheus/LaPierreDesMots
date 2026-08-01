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
  EntreeProgressionTest,
  EtatTestSerialisable,
  FixtureProfil,
  IdNoeud,
  Profil,
  ResumeTentative,
  SurfaceTest
} from '@pierre/partage';
import { calculerEtoiles } from '@pierre/partage';
import {
  calculerCleIdempotence,
  creerProfil,
  enregistrerTentative,
  lirePaquetNoeud,
  lireProfil,
  listerProfils
} from '../api/client.js';
import type { MagasinJeu } from '../etat/magasin.js';
import { figerHorloge, maintenantIso } from '../etat/services.js';
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

/**
 * L'INVERSE EXACT de `calculerEtoiles` — le seul barème du dépôt (contrat § 5.7), additif :
 * `1 + (sans aide) + (sans erreur)`.
 *
 * Il n'existe aucune route pour écrire une progression : elle se recalcule toujours depuis le
 * journal des tentatives (§ 6.2, « le journal fait foi »). Installer les étoiles d'une fixture,
 * c'est donc journaliser une tentative qui les VAUT — jamais les poser à la main, ce qui
 * ferait mentir le journal.
 */
function resumePourEtoiles(etoiles: number): ResumeTentative {
  const commun = { dureeMs: 60_000, etapes: [] as const };
  if (etoiles >= 3) return { ...commun, reussi: true, nbErreurs: 0, aideUtilisee: 'aucune' };
  // Aide gratuite tenue (R15), une erreur payée : 1 + 1 + 0 = 2.
  if (etoiles === 2) return { ...commun, reussi: true, nbErreurs: 1, aideUtilisee: 'aucune' };
  // Les deux critères tombent : 1 + 0 + 0 = 1.
  if (etoiles === 1) return { ...commun, reussi: true, nbErreurs: 1, aideUtilisee: 'indice' };
  // Zéro n'existe que si la tentative n'est pas réussie (R14 la rend inatteignable en jeu).
  return { ...commun, reussi: false, nbErreurs: 0, aideUtilisee: 'aucune' };
}

export function monterCrochetsDeTest({ magasin, services }: DependancesCrochets): void {
  /**
   * Journalise une tentative qui vaut exactement `entree.etoiles` sur `entree.noeud`.
   *
   * CONTRAT DE SORTIE DE CETTE FONCTION : elle vérifie son propre résumé contre
   * `calculerEtoiles` AVANT d'envoyer quoi que ce soit, et refuse d'écrire si le compte ne
   * tombe pas juste. Un crochet de test qui installerait discrètement 3 étoiles là où la
   * fixture en demande 2 rendrait vertes des suites qui ne vérifient plus rien.
   */
  async function installerEtoiles(profil: Profil, entree: EntreeProgressionTest): Promise<void> {
    const resume = resumePourEtoiles(Number(entree.etoiles));
    const obtenu = Number(calculerEtoiles(resume));
    if (obtenu !== Number(entree.etoiles)) {
      throw new Error(
        `[test] chargerProfil : le résumé fabriqué pour ${String(entree.etoiles)} étoile(s) en ` +
          `vaut ${String(obtenu)} selon calculerEtoiles. Rien n’a été journalisé.`
      );
    }

    // Le paquet donne l'exercice, le moteur et l'habillage réels du nœud : la tentative
    // installée est de la même forme que celle qu'une vraie partie produirait.
    const paquet = await lirePaquetNoeud(entree.noeud);
    const instant = maintenantIso(services.horloge);
    const graine = magasin.getState().graine;
    const cleIdempotence = await calculerCleIdempotence(
      String(profil.id),
      String(entree.noeud),
      instant,
      graine
    );

    await enregistrerTentative({
      cleIdempotence,
      profil: profil.id,
      noeud: entree.noeud,
      exercice: paquet.exercice.id,
      moteur: paquet.exercice.jeu.moteur,
      habillage: paquet.habillage.id,
      graine,
      demarreLe: instant,
      termineLe: instant,
      resume
    });
  }

  const surface: SurfaceTest = {
    /**
     * Rend un profil jouable, AVEC la progression que la fixture déclare, et laisse l'enfant
     * (ou le test) faire le geste de le choisir.
     *
     * Trois points, et chacun corrige un défaut mesuré :
     *
     * 1. **`fixture.progression` était ignorée.** Le champ figure pourtant au contrat § 7.1
     *    (`FixtureProfil.progression: readonly EntreeProgressionTest[]`). `cassecou.spec.ts`
     *    installe un profil à trois étoiles pour vérifier qu'un bot qui rate tout ne s'en voit
     *    reprendre aucune — il lisait `0`, et son assertion la plus importante ne pouvait pas
     *    être atteinte. Un champ du contrat qu'on laisse tomber en silence est pire qu'absent.
     *
     * 2. **L'écran ne saute plus à la carte.** Le crochet appelait `choisirProfil`, qui pose
     *    `ecran: 'carte'` : l'écran de choix de profil devenait INATTEIGNABLE en E2E, et trois
     *    suites qui l'attendaient échouaient (`parcours-nominal`, deux cas d'`a11y`). Charger
     *    un profil et le choisir sont deux gestes distincts ; seul le second appartient à
     *    l'enfant, et il doit rester testable. Le profil est bien posé dans le magasin — sans
     *    lui, aucune tentative ne partirait et `cassecou` deviendrait creux — mais l'écran
     *    revient sur `profils`.
     *
     * 3. **Pas de doublon.** La base de test vit en `:memory:` pour toute une campagne
     *    Playwright ; recréer un profil à chaque cas empilait des homonymes, et un test qui
     *    retrouve « son » profil par le prénom pouvait tomber sur celui d'un cas précédent.
     *    On réutilise donc l'existant, d'abord par `id`, ensuite par prénom.
     */
    async chargerProfil(fixture: FixtureProfil): Promise<void> {
      let profil = await lireProfil(fixture.id).catch(() => null);

      if (profil === null) {
        const existants = await listerProfils().catch(() => [] as readonly Profil[]);
        profil = existants.find((candidat) => candidat.prenom === fixture.prenom) ?? null;
      }

      if (profil === null) {
        profil = await creerProfil({
          prenom: fixture.prenom,
          avatar: fixture.avatar,
          paletteVariante: fixture.paletteVariante
        } as unknown as CreationProfil);
      }

      // Idempotent par construction : la clé d'idempotence est dérivée de l'instant, que les
      // tests figent. Rejouer `chargerProfil` ne double aucune ligne du journal (§ 6.3), et
      // « un acquis n'est jamais repris » fait le reste si les étoiles varient.
      for (const entree of fixture.progression ?? []) {
        await installerEtoiles(profil, entree);
      }

      magasin.getState().choisirProfil(profil);
      // On LAISSE React peindre la carte avant de revenir sur l'écran de choix. Enchaîner les
      // deux `fixer` sans respirer les regrouperait dans le même rendu : le routeur
      // n'emprunterait jamais `/carte`, `EcranProfils` ne serait donc jamais démonté, et il
      // resterait sur la liste qu'il avait lue AVANT que ce profil n'existe. Mesuré : le
      // parcours T3 cherchait « Alma » et ne la trouvait pas, alors que le serveur la servait.
      await prochaineFrame();
      // `choisirProfil` emmène à la carte : on revient sur l'écran de choix, qui est celui
      // où l'application démarre réellement. Voir le point 2 ci-dessus.
      magasin.getState().naviguer('profils');
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
