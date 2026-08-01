/**
 * Horloge injectée — annexe T § 2.2.
 *
 * Aucun `Date.now()` ni `new Date()` ailleurs dans le dépôt : une règle ESLint (lot L-A) les
 * refuse partout hors de ce fichier. Sans `figer` et `avancer`, vérifier qu'un item du Leitner
 * revient bien à J+7 demanderait d'attendre une semaine.
 */

import { ErreurPierre } from './erreurs.js';
import type { Horodatage } from './identifiants.js';

/** Durée à ajouter au temps simulé. Tous les champs sont facultatifs et s'additionnent. */
export interface DureeSimulee {
  readonly jours?: number;
  readonly heures?: number;
  readonly minutes?: number;
  readonly secondes?: number;
  readonly millisecondes?: number;
}

export interface Horloge {
  /** Vrai si l'horloge est figée : `maintenant()` ne bouge plus qu'avec `avancer`. */
  readonly figee: boolean;
  /** Instant courant au format ISO 8601 UTC. */
  maintenant(): Horodatage;
  /** Instant courant en millisecondes depuis l'époque Unix. C'est la base des durées de jeu. */
  maintenantMs(): number;
  /** Fige l'horloge sur un instant ISO. Remet le décalage accumulé à zéro. */
  figer(instant: Horodatage): void;
  /** Avance le temps simulé. Refuse une durée négative : le temps ne recule jamais. */
  avancer(duree: DureeSimulee): void;
  /** Rend l'horloge au temps réel et efface le décalage accumulé. */
  liberer(): void;
}

const MS_PAR_SECONDE = 1_000;
const MS_PAR_MINUTE = 60_000;
const MS_PAR_HEURE = 3_600_000;
const MS_PAR_JOUR = 86_400_000;

function dureeEnMs(duree: DureeSimulee): number {
  const total =
    (duree.jours ?? 0) * MS_PAR_JOUR +
    (duree.heures ?? 0) * MS_PAR_HEURE +
    (duree.minutes ?? 0) * MS_PAR_MINUTE +
    (duree.secondes ?? 0) * MS_PAR_SECONDE +
    (duree.millisecondes ?? 0);
  if (!Number.isFinite(total)) {
    throw new ErreurPierre('argument-invalide', 'Durée non finie.', { duree });
  }
  return total;
}

/** Horloge branchée sur le temps réel, jusqu'à ce qu'on la fige. */
export function creerHorloge(): Horloge {
  let instantFigeMs: number | null = null;
  let decalageMs = 0;

  const maintenantMs = (): number =>
    // Seuls appels à `Date.now` autorisés dans le dépôt (contrat § 0).
    (instantFigeMs ?? Date.now()) + decalageMs;

  return {
    get figee(): boolean {
      return instantFigeMs !== null;
    },
    maintenantMs,
    maintenant(): Horodatage {
      // Seule construction de `Date` autorisée dans le dépôt (contrat § 0).
      return new Date(maintenantMs()).toISOString();
    },
    figer(instant: Horodatage): void {
      const valeur = Date.parse(instant);
      if (Number.isNaN(valeur)) {
        throw new ErreurPierre('argument-invalide', `Instant ISO illisible : « ${instant} »`, {
          instant,
        });
      }
      instantFigeMs = valeur;
      decalageMs = 0;
    },
    avancer(duree: DureeSimulee): void {
      const delta = dureeEnMs(duree);
      if (delta < 0) {
        throw new ErreurPierre(
          'argument-invalide',
          'Horloge.avancer refuse une durée négative : le temps ne recule jamais.',
          { duree },
        );
      }
      decalageMs += delta;
    },
    liberer(): void {
      instantFigeMs = null;
      decalageMs = 0;
    },
  };
}

/** Horloge déjà figée sur `instant`. Raccourci de `creerHorloge()` puis `figer(instant)`. */
export function creerHorlogeFigee(instant: Horodatage): Horloge {
  const creee = creerHorloge();
  creee.figer(instant);
  return creee;
}

/**
 * Instance partagée par défaut. Les racines de composition (serveur, client) l'injectent ;
 * `tests/configuration/preparation.ts` (lot L-G) la fige avant chaque suite.
 * Un test qui a besoin d'une horloge à lui appelle `creerHorloge()`.
 */
export const horloge: Horloge = creerHorloge();
