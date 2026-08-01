// Magasin de la session de jeu — contrat technique v1 § 1.4 et § 11.2 (`creerMagasin`).
//
// Magasin Zustand VANILLA, pas un hook : `window.__test` doit pouvoir le piloter hors de tout
// composant React (§ 7.1, `repondre()` et `etat()` sont synchrones et sans rendu). Les
// composants s'y branchent par `useEtatJeu` (`etat/services.ts`).
//
// UN SEUL ÉCRIVAIN DE L'ÉCRAN COURANT : `EtatMagasin.ecran`. Le routeur en est le miroir,
// jamais la source — sans quoi `window.__test.etat().ecran` pourrait mentir.
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { calculerEtoiles, obtenirMoteur } from '@pierre/partage';
import type {
  AideProposee,
  CodeEcran,
  CodeMoteur,
  MoteurQuelconque,
  NombreEtoiles,
  Profil,
  ProgressionMoteur,
  ResumeTentative
} from '@pierre/partage';
import type { PaquetNoeudAttendu } from '../api/client.js';
import type { ServicesJeu } from '../moteurs/types.js';
import { maintenantIso } from './services.js';

/** `calculerEtoiles` est le SEUL endroit où vit le barème (contrat § 5.7). On l'appelle. */
const calculerEtoilesAdapte = calculerEtoiles as unknown as (
  resume: ResumeTentative
) => NombreEtoiles;

export interface EtatMagasin {
  readonly ecran: CodeEcran;
  readonly profil: Profil | null;

  readonly paquet: PaquetNoeudAttendu | null;
  readonly moteur: MoteurQuelconque | null;
  readonly codeMoteur: CodeMoteur | null;
  /** État interne du moteur monté, opaque au reste du client. `EtatColorie` en v1. */
  readonly etatMoteur: unknown;
  readonly progression: ProgressionMoteur | null;
  readonly aide: AideProposee | null;

  readonly resume: ResumeTentative | null;
  readonly etoiles: NombreEtoiles | null;
  readonly demarreLe: string | null;
  readonly termineLe: string | null;
  readonly tentativeEnvoyee: boolean;

  readonly graine: number;
  readonly animationsDesactivees: boolean;

  naviguer(ecran: CodeEcran): void;
  choisirProfil(profil: Profil): void;
  quitterProfil(): void;
  demarrerNoeud(paquet: PaquetNoeudAttendu): void;
  emettre(action: unknown): void;
  rejouer(): void;
  fixerGraine(graine: number): void;
  sauterAnimations(): void;
  marquerTentativeEnvoyee(): void;
}

export type MagasinJeu = StoreApi<EtatMagasin>;

/**
 * Reflète l'état « animations calmes » sur la racine du document.
 * La règle CSS correspondante vit dans `styles/global.css` : un seul endroit décide, un seul
 * endroit applique. Garde le code exécutable sous happy-dom comme sous Playwright.
 */
function refleterAnimations(desactivees: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (desactivees) {
    document.documentElement.setAttribute('data-animations', 'desactivees');
  } else {
    document.documentElement.removeAttribute('data-animations');
  }
}

/** `prefers-reduced-motion` du système, au démarrage. R16 et v2 § 8. */
function mouvementReduitDemande(): boolean {
  if (typeof globalThis.matchMedia !== 'function') {
    return false;
  }
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function creerMagasin(services: ServicesJeu, graineInitiale = 1): MagasinJeu {
  const animationsInitiales = mouvementReduitDemande();
  refleterAnimations(animationsInitiales);

  return createStore<EtatMagasin>()((fixer, lire) => ({
    ecran: 'chargement',
    profil: null,

    paquet: null,
    moteur: null,
    codeMoteur: null,
    etatMoteur: null,
    progression: null,
    aide: null,

    resume: null,
    etoiles: null,
    demarreLe: null,
    termineLe: null,
    tentativeEnvoyee: false,

    graine: graineInitiale,
    animationsDesactivees: animationsInitiales,

    naviguer(ecran: CodeEcran): void {
      fixer({ ecran });
    },

    choisirProfil(profil: Profil): void {
      // Un tap suffit, aucun mot de passe (v2 § 11).
      fixer({ profil, ecran: 'carte' });
    },

    quitterProfil(): void {
      fixer({
        profil: null,
        ecran: 'profils',
        paquet: null,
        moteur: null,
        codeMoteur: null,
        etatMoteur: null,
        progression: null,
        aide: null,
        resume: null,
        etoiles: null,
        demarreLe: null,
        termineLe: null,
        tentativeEnvoyee: false
      });
    },

    demarrerNoeud(paquet: PaquetNoeudAttendu): void {
      const code = paquet.exercice.jeu.moteur;
      const moteur = obtenirMoteur(code);
      const etatMoteur = moteur.creerEtat({
        contenu: paquet.exercice.jeu.contenu,
        habillage: paquet.habillage,
        alea: services.alea,
        horloge: services.horloge
      });

      fixer({
        paquet,
        moteur,
        codeMoteur: code,
        etatMoteur,
        progression: moteur.progression(etatMoteur),
        aide: moteur.aideProposee(etatMoteur),
        resume: null,
        etoiles: null,
        demarreLe: maintenantIso(services.horloge),
        termineLe: null,
        tentativeEnvoyee: false,
        ecran: 'noeud'
      });
    },

    emettre(action: unknown): void {
      const { moteur, etatMoteur, resume } = lire();
      if (moteur === null) {
        return;
      }
      // Une tentative terminée n'accepte plus d'action : c'est ce qui rend le double-tap
      // final inoffensif (annexe T § T1) et l'écran de récompense stable.
      if (resume !== null) {
        return;
      }

      const suivant = moteur.reduire(etatMoteur, action, {
        alea: services.alea,
        horloge: services.horloge
      });

      const progression = moteur.progression(suivant);
      const aide = moteur.aideProposee(suivant);

      if (progression.termine) {
        const resumeFinal = moteur.resume(suivant);
        fixer({
          etatMoteur: suivant,
          progression,
          aide,
          resume: resumeFinal,
          etoiles: calculerEtoilesAdapte(resumeFinal),
          termineLe: maintenantIso(services.horloge),
          ecran: 'recompense'
        });
        return;
      }

      fixer({ etatMoteur: suivant, progression, aide });
    },

    rejouer(): void {
      // « Rejouer un nœud déjà à trois étoiles reste possible : c'est du plaisir » (v2 § 6.2).
      const { paquet } = lire();
      if (paquet === null) {
        fixer({ ecran: 'carte' });
        return;
      }
      lire().demarrerNoeud(paquet);
    },

    fixerGraine(graine: number): void {
      fixer({ graine });
    },

    sauterAnimations(): void {
      refleterAnimations(true);
      fixer({ animationsDesactivees: true });
    },

    marquerTentativeEnvoyee(): void {
      fixer({ tentativeEnvoyee: true });
    }
  }));
}
