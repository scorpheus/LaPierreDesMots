// `FournisseurAudio` — WebAudio natif, contrat technique v1 § 1.4 et v2 § 8 (repris par L2-A).
//
// TONE.JS N'EST TOUJOURS PAS IMPORTÉ, et c'est un choix mesuré (contrat des features v2 § 8,
// repoussé n° 2) : la musique générative en couches demanderait Tone.js dans le bundle, ce que
// le budget de 250 Ko gzip ne tolère pas sans découpage différé. Ce qui EST rentable a été
// nommé par les specs elles-mêmes — « le son court à hauteur montante selon la série est le
// détail le plus rentable de toute la liste » (v2 § 8, D26) — et il est livré ici, en natif.
//
// Contraintes de conception opposables (contrat § 5.6 et v2 § 8) :
//   — aucun son descendant, aucun intervalle dissonant, aucun son « négatif » ;
//   — le refus sonne NEUTRE et COURT ; c'est le mouvement qui porte l'information, pas le son.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// RÉPARATION DU DÉFAUT 1 (contrat des features v2 § 1.5).
//
// Mesuré avant réparation :
//   $ sed -n '15,23p' partage/src/fournisseurs/audio.ts | grep -oE "'[a-z-]+'"
//   'depot-correct' 'depot-refuse' 'recoloration' 'etoile' 'gobi-parle' 'transition-noeud' 'fin-noeud'
//   $ grep -oE "^  '?[a-z-]+'?:" client/src/services/audio-tone.ts
//   'depot-accepte'  'depot-refuse'  'consigne-terminee'  'etoile'  'exercice-termine'
//
// Sept codes déclarés, cinq joués, DEUX noms communs. `depot-correct` — le son de la bonne
// réponse, c'est-à-dire le détail le plus rentable de toute la liste — n'était jamais joué
// sous ce nom, et le repli « tout code inconnu est joué comme `depot-accepte` » masquait la
// divergence au lieu de la signaler.
//
// La réparation est structurelle, pas cosmétique : `RECETTES` est un
// `Readonly<Record<CodeEffet, Recette>>`. Un code ajouté à `CodeEffet` et oublié ici **ne
// compile plus**. Il n'y a plus de repli, et il n'y en aura plus jamais.
// ─────────────────────────────────────────────────────────────────────────────────────────
import type { CanalAudio, CodeEffet, FournisseurAudio } from '@pierre/partage';

/** Recettes des effets, en notes et non en fichiers. Fréquences en Hz, durées en ms. */
interface Recette {
  readonly notes: readonly number[];
  readonly dureeMs: number;
  readonly gain: number;
}

// Quelques repères, pour que les recettes se lisent comme de la musique et non comme des Hz.
const SOL4 = 392.0;
const DO5 = 523.25;
const MI5 = 659.25;
const SOL5 = 783.99;
const LA5 = 880.0;
const DO6 = 1046.5;
const MI6 = 1318.51;
const SOL6 = 1567.98;

/**
 * Les NEUF codes de `CodeEffet`, tous joués. Le `Record` est exhaustif **par le type**.
 *
 * Aucune recette ne descend : toutes les suites de notes sont montantes ou tenues. C'est la
 * traduction directe de « pas de son négatif » (v2 § 8) — une suite descendante s'entend comme
 * un échec, quelle que soit l'intention.
 */
const RECETTES: Readonly<Record<CodeEffet, Recette>> = {
  // Do–Mi : une tierce majeure, montante. Le geste juste sonne ouvert. C'est CE son que
  // `demiTons` transpose selon la série (v2 § 8).
  'depot-correct': { notes: [DO5, MI5], dureeMs: 120, gain: 0.14 },
  // Une seule note tenue, ni montante ni descendante : neutre par construction.
  'depot-refuse': { notes: [SOL4], dureeMs: 90, gain: 0.1 },
  // Balayage de recoloration : trois notes douces sur la durée du balayage radial.
  recoloration: { notes: [DO5, SOL5, DO6], dureeMs: 240, gain: 0.12 },
  // Do–Mi–Sol : l'accord parfait, une étoile qui arrive.
  etoile: { notes: [MI5, SOL5, DO6], dureeMs: 220, gain: 0.18 },
  // Deux notes brèves, comme une voix qui appelle. Discret : Gobi accompagne, il n'annonce pas.
  'gobi-parle': { notes: [LA5, DO6], dureeMs: 140, gain: 0.1 },
  // Transition entre deux nœuds : court, neutre, sans célébration.
  'transition-noeud': { notes: [SOL5, DO6], dureeMs: 160, gain: 0.1 },
  // Fin de nœud : l'accord complet sur deux octaves.
  'fin-noeud': { notes: [DO5, MI5, SOL5, DO6], dureeMs: 320, gain: 0.2 },
  // Cascade D25, palier ~5 — le tampon spécial. Plus long et plus haut que la fin de nœud :
  // il doit s'entendre comme un événement, pas comme une ponctuation.
  'palier-intermediaire': { notes: [DO5, MI5, SOL5, DO6, MI6], dureeMs: 460, gain: 0.22 },
  // Cascade D25, palier ~10 — l'image. Le son le plus rare du jeu, donc le plus désirable.
  'palier-rare': {
    notes: [DO5, MI5, SOL5, DO6, MI6, SOL6, DO6, MI6],
    dureeMs: 700,
    gain: 0.24
  }
};

/** Volumes par canal, de 0 à 1. Les trois canaux réglables du contrat § 4.1. */
const VOLUMES_PAR_DEFAUT: Readonly<Record<CanalAudio, number>> = {
  ambiance: 0.5,
  effets: 1,
  voix: 1
};

/**
 * Le fournisseur réel, plus les trois gestes propres au navigateur.
 *
 * `reveiller` n'appartient pas à `FournisseurAudio` et n'a pas à y appartenir : c'est une
 * contrainte de la politique d'autoplay des navigateurs, pas une notion du jeu. On l'expose
 * par une EXTENSION du type, ce qui permet à `reveillerAudio` de la trouver sans transtypage —
 * les trois transtypages aveugles de la v1 disparaissent avec elle (défaut 2 du § 1.5).
 */
export interface AudioLocal extends FournisseurAudio {
  /** Doit être appelé depuis un geste utilisateur : la politique d'autoplay l'exige. */
  reveiller(): void;
  /** Coupe tout. Utilisé par les réglages parent et par les tests. */
  couper(muet: boolean): void;
  estMuet(): boolean;
}

/** Transposition tempérée : `n` demi-tons multiplient la fréquence par 2^(n/12). */
export function transposer(frequence: number, demiTons: number): number {
  return demiTons === 0 ? frequence : frequence * Math.pow(2, demiTons / 12);
}

export function creerAudioTone(): AudioLocal {
  let contexte: AudioContext | null = null;
  let muet = false;
  const volumes: Record<CanalAudio, number> = { ...VOLUMES_PAR_DEFAUT };

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

  function jouerNote(
    ctx: AudioContext,
    frequence: number,
    debut: number,
    recette: Recette,
    gain: number
  ): void {
    const oscillateur = ctx.createOscillator();
    const enveloppe = ctx.createGain();
    // Triangle : doux, sans harmoniques agressives sur un haut-parleur de tablette.
    oscillateur.type = 'triangle';
    oscillateur.frequency.value = frequence;

    const duree = recette.dureeMs / 1000;
    enveloppe.gain.setValueAtTime(0, debut);
    enveloppe.gain.linearRampToValueAtTime(Math.max(0.0001, gain), debut + 0.01);
    enveloppe.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

    oscillateur.connect(enveloppe);
    enveloppe.connect(ctx.destination);
    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.02);
  }

  return {
    get disponible(): boolean {
      return !muet && typeof globalThis.AudioContext === 'function';
    },

    /**
     * Résout quand l'effet a DÉMARRÉ, pas quand il est fini : la cible est < 80 ms (contrat
     * § 4.1). Rien n'est attendu ici, et c'est délibéré — `RetourSensoriel` ne doit jamais
     * faire patienter un retour visuel derrière un son (v2 § 8, la règle des 100 ms).
     */
    async jouerEffet(
      code: CodeEffet,
      options?: { readonly demiTons?: number; readonly volume?: number }
    ): Promise<void> {
      const ctx = obtenirContexte();
      if (ctx === null) {
        return;
      }
      // Plus de repli : `RECETTES` est exhaustif par le type, donc l'accès est total.
      const recette = RECETTES[code];
      const demiTons = options?.demiTons ?? 0;
      const gain = recette.gain * volumes.effets * (options?.volume ?? 1);

      const pasMs = recette.dureeMs / Math.max(recette.notes.length, 1) / 1000;
      recette.notes.forEach((frequence, index) => {
        jouerNote(
          ctx,
          transposer(frequence, demiTons),
          ctx.currentTime + index * pasMs,
          recette,
          gain
        );
      });
    },

    async demarrerAmbiance(): Promise<void> {
      // La musique en couches est explicitement repoussée (contrat des features v2 § 8, n° 2).
      // On ne lève pas : un habillage qui déclare une ambiance reste valide, il est simplement
      // silencieux tant que la campagne suivante n'a pas livré le chunk différé.
    },

    arreterAmbiance(): void {
      // Idem : rien à arrêter tant que rien ne démarre.
    },

    reglerVolume(canal: CanalAudio, valeur: number): void {
      volumes[canal] = Math.min(1, Math.max(0, valeur));
    },

    reveiller(): void {
      const ctx = obtenirContexte();
      if (ctx !== null && ctx.state === 'suspended') {
        void ctx.resume();
      }
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

/**
 * Joue un effet sans se soucier de la promesse.
 *
 * Le paramètre est un `CodeEffet`, plus une chaîne libre : un code fautif ne compile plus.
 * C'est l'autre moitié de la réparation du défaut 1 — la première était l'exhaustivité des
 * recettes, celle-ci est l'étanchéité des sites d'appel.
 */
export function jouerEffet(
  audio: FournisseurAudio,
  code: CodeEffet,
  options?: { readonly demiTons?: number; readonly volume?: number }
): void {
  void audio.jouerEffet(code, options).catch(() => {
    // Un son qui ne part pas n'est pas une erreur de jeu.
  });
}

/**
 * À appeler au premier tap de l'enfant : sans geste, aucun son ne sortira jamais.
 *
 * `AudioMuet` des factices n'a pas de `reveiller`, et c'est très bien : la garde `in` en fait
 * un appel sans effet, sans transtypage et sans exception.
 */
export function reveillerAudio(audio: FournisseurAudio): void {
  const candidat = audio as Partial<AudioLocal>;
  if (typeof candidat.reveiller === 'function') {
    candidat.reveiller();
  }
}
