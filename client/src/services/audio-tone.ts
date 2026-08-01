// `FournisseurAudio` minimal — contrat technique v1 § 1.4, « Tone.js différé ».
//
// TONE.JS N'EST PAS IMPORTÉ EN V1, et c'est le sens de « différé » : la musique générative en
// couches (v2 § 10.2) appartient au lot L2, et Tone.js pèse plus que le budget de 250 Ko gzip
// ne le tolère pour un jeu qui, en v1, n'a aucune ambiance (`sons.ambiance === null`,
// `sons.effets === {}` au contrat § 9.4).
//
// Ce qui EST rendu ici : les quelques effets courts de la boucle de jeu, en WebAudio natif,
// synthétisés à la volée. Contrainte de conception opposable (contrat § 5.6 et v2 § 8) :
//   — aucun son descendant, aucun intervalle dissonant, aucun son « négatif » ;
//   — le refus sonne NEUTRE et COURT ; c'est le mouvement qui porte l'information, pas le son.
//
// NOTE DE CONTRAT : `FournisseurAudio` et `CodeEffet` sont gelés par le nom (§ 11.1), pas par
// leurs membres. Comme pour la voix, l'adaptation tient en deux fonctions — signalé au rapport.
import type { FournisseurAudio } from '@pierre/partage';

/** Recettes des effets, en notes et non en fichiers. Fréquences en Hz, durées en ms. */
interface Recette {
  readonly notes: readonly number[];
  readonly dureeMs: number;
  readonly gain: number;
}

/**
 * Les cinq codes dont la boucle de jeu de la v1 a besoin. `CodeEffet` (L-B) en porte
 * peut-être davantage : tout code inconnu est joué comme `depot-accepte`, jamais refusé.
 */
const RECETTES: Readonly<Record<string, Recette>> = {
  // Do–Mi : une tierce majeure, montante. Le geste juste sonne ouvert.
  'depot-accepte': { notes: [523.25, 659.25], dureeMs: 120, gain: 0.14 },
  // Une seule note tenue, ni montante ni descendante : neutre par construction.
  'depot-refuse': { notes: [392.0], dureeMs: 90, gain: 0.1 },
  // Do–Mi–Sol : l'accord parfait, à la fin d'une consigne.
  'consigne-terminee': { notes: [523.25, 659.25, 783.99], dureeMs: 180, gain: 0.16 },
  // Arpège sur deux octaves pour la récompense.
  'etoile': { notes: [659.25, 783.99, 1046.5], dureeMs: 220, gain: 0.18 },
  'exercice-termine': { notes: [523.25, 659.25, 783.99, 1046.5], dureeMs: 320, gain: 0.2 }
};

export interface AudioLocal {
  /** Doit être appelé depuis un geste utilisateur : la politique d'autoplay l'exige. */
  reveiller(): void;
  jouer(code: string): void;
  couper(muet: boolean): void;
  estMuet(): boolean;
}

function creerImplementation(): AudioLocal {
  let contexte: AudioContext | null = null;
  let muet = false;

  function obtenirContexte(): AudioContext | null {
    if (muet) {
      return null;
    }
    if (contexte === null) {
      const Constructeur = globalThis.AudioContext;
      if (typeof Constructeur !== 'function') {
        return null; // happy-dom, environnement sans WebAudio : silence, pas d'erreur.
      }
      contexte = new Constructeur();
    }
    return contexte;
  }

  function jouerNote(ctx: AudioContext, frequence: number, debut: number, recette: Recette): void {
    const oscillateur = ctx.createOscillator();
    const enveloppe = ctx.createGain();
    // Triangle : doux, sans harmoniques agressives sur un haut-parleur de tablette.
    oscillateur.type = 'triangle';
    oscillateur.frequency.value = frequence;

    const duree = recette.dureeMs / 1000;
    enveloppe.gain.setValueAtTime(0, debut);
    enveloppe.gain.linearRampToValueAtTime(recette.gain, debut + 0.01);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

    oscillateur.connect(enveloppe);
    enveloppe.connect(ctx.destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.02);
  }

  return {
    reveiller(): void {
      const ctx = obtenirContexte();
      if (ctx !== null && ctx.state === 'suspended') {
        void ctx.resume();
      }
    },

    jouer(code: string): void {
      const ctx = obtenirContexte();
      if (ctx === null) {
        return;
      }
      const recette = RECETTES[code] ?? RECETTES['depot-accepte'];
      if (recette === undefined) {
        return;
      }
      const pasMs = recette.dureeMs / Math.max(recette.notes.length, 1) / 1000;
      recette.notes.forEach((frequence, index) => {
        jouerNote(ctx, frequence, ctx.currentTime + index * pasMs, recette);
      });
    },

    couper(valeur: boolean): void {
      muet = valeur;
      if (valeur && contexte !== null) {
        void contexte.suspend();
      }
    },

    estMuet(): boolean {
      return muet;
    }
  };
}

/** Fournisseur d'effets courts, WebAudio natif. Tone.js reste différé au lot L2. */
export function creerAudioTone(): FournisseurAudio {
  return creerImplementation() as unknown as FournisseurAudio;
}

/** Point d'adaptation unique côté appelant. Un code inconnu ne lève jamais. */
export function jouerEffet(audio: FournisseurAudio, code: string): void {
  const local = audio as unknown as Partial<AudioLocal>;
  if (typeof local.jouer === 'function') {
    local.jouer(code);
  }
}

/** À appeler au premier tap de l'enfant : sans geste, aucun son ne sortira jamais. */
export function reveillerAudio(audio: FournisseurAudio): void {
  const local = audio as unknown as Partial<AudioLocal>;
  if (typeof local.reveiller === 'function') {
    local.reveiller();
  }
}
