// Particules de bonne réponse — v2 § 8, D26 (lot L2-A).
//
// « Il faut de la nourriture pour lui donner envie, des particules qui bougent quand c'est bon,
// et aussi la vibration » (D26). Et le garde-fou de la v2 § 8 : **14 particules au maximum**.
//
// Canvas 2D, pas de moteur de jeu, pas de bibliothèque : quatorze points qui montent et
// s'éteignent tiennent en cinquante lignes, et le budget de 250 Ko gzip n'a pas à payer pour
// une dépendance qui en ferait dix mille.
//
// CONTRAT DE SORTIE MESURABLE — le canevas porte `data-particules`, qui vaut le nombre de
// particules VIVANTES à la frame courante. C'est ce que `tests/qualite/gamefeel-latence.spec.ts`
// et `tests/unitaires/gamefeel-serie.test.ts` lisent : « 14 au maximum » cesse d'être une
// affirmation et devient un nombre qu'on relève.

import { PALETTE } from '@pierre/partage';

/** v2 § 8 : **14 au maximum**, jamais une de plus. La constante est la seule autorité. */
export const PARTICULES_MAX = 14;

/**
 * Le jeton `soleil` de la v2 § 9.2 — « éclats, étoiles, récompenses ».
 *
 * On lit `PALETTE` et non `var(--soleil)` : un canevas 2D ne résout AUCUNE variable CSS,
 * `fillStyle = 'var(--soleil)'` est silencieusement ignoré et les particules sortent noires.
 * « La couleur vient du code, pas du CSS » (CLAUDE.md) est ici une contrainte technique autant
 * qu'un principe.
 */
export const COULEUR_PARTICULES = PALETTE.soleil;

/** Durée de vie d'une gerbe, alignée sur la recoloration de la v2 § 8. */
export const DUREE_PARTICULES_MS = 900;

/** Attribut porté par le canevas. Le nombre de particules vivantes, à la frame courante. */
export const ATTRIBUT_COMPTE = 'data-particules';

export interface OptionsParticules {
  readonly origine: readonly [number, number];
  readonly nombre: number;
  readonly couleur: string;
  readonly dureeMs: number;
}

interface Particule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  neeMs: number;
  vieMs: number;
  rayon: number;
}

/**
 * Vrai si l'appareil demande des animations calmes.
 *
 * Lu à CHAQUE émission, jamais mis en cache : l'enfant peut basculer le réglage en cours de
 * partie, et une valeur figée au démarrage rendrait le basculement sans effet.
 */
function mouvementReduit(): boolean {
  if (typeof globalThis.matchMedia !== 'function') {
    return false;
  }
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Une gerbe pseudo-aléatoire SANS `Math.random` — règle non négociable de CLAUDE.md.
 *
 * `Alea` n'est pas injecté jusqu'ici : ce sont des pixels décoratifs, ils n'entrent dans aucun
 * journal et aucun rejeu ne les compare. On répartit donc les particules sur un éventail
 * régulier, dérivé du seul rang de la particule. C'est déterministe, c'est reproductible, et
 * ça se voit mieux qu'un vrai hasard : la gerbe est lisible.
 */
function vitesse(rang: number, total: number): readonly [number, number] {
  // Éventail de 140° centré sur le haut : les particules montent, elles ne retombent pas
  // sur le doigt de l'enfant.
  const ouverture = (140 * Math.PI) / 180;
  const angle = -Math.PI / 2 - ouverture / 2 + (ouverture * rang) / Math.max(1, total - 1);
  // Alternance lente / rapide : deux couronnes, plutôt qu'un anneau parfait qui ferait mécanique.
  const norme = rang % 2 === 0 ? 0.16 : 0.24;
  return [Math.cos(angle) * norme, Math.sin(angle) * norme];
}

/**
 * Émet une gerbe sur le canevas donné.
 *
 * Ne fait rien si `prefers-reduced-motion` : le fonctionnel reste, le décoratif disparaît
 * (v2 § 8). Ne fait rien non plus sans contexte 2D — happy-dom n'en fournit pas, et une
 * absence de canevas n'est pas une erreur de jeu.
 *
 * `nombre` est **écrêté à `PARTICULES_MAX`**, jamais refusé : un appelant qui en demanderait
 * cinquante en obtient quatorze, et l'exigence de la v2 tient sans qu'aucun site d'appel n'ait
 * à la connaître.
 */
export function emettreParticules(canevas: HTMLCanvasElement, options: OptionsParticules): void {
  if (mouvementReduit()) {
    return;
  }
  const contexte = typeof canevas.getContext === 'function' ? canevas.getContext('2d') : null;
  if (contexte === null) {
    return;
  }

  const total = Math.max(0, Math.min(Math.trunc(options.nombre), PARTICULES_MAX));
  if (total === 0) {
    return;
  }

  const vieMs = Math.max(1, options.dureeMs);
  const debut = performanceMs();
  const particules: Particule[] = [];
  for (let rang = 0; rang < total; rang += 1) {
    const [vx, vy] = vitesse(rang, total);
    particules.push({
      x: options.origine[0],
      y: options.origine[1],
      vx,
      vy,
      neeMs: debut,
      vieMs,
      rayon: rang % 2 === 0 ? 3 : 4.5
    });
  }

  animer(canevas, contexte, particules, options.couleur);
}

/**
 * Horloge d'ANIMATION, en millisecondes depuis le chargement de la page.
 *
 * `performance.now()` et non `Date.now()` : la règle ESLint maison interdit la seconde partout
 * hors de `partage/src/horloge.ts`, et `Horloge` — qui est l'horloge du JEU, injectée et
 * figeable — n'a rien à faire ici. Une particule n'appartient à aucun journal ; la figer ferait
 * de la décoration une donnée pédagogique.
 */
function performanceMs(): number {
  return typeof performance === 'object' && typeof performance.now === 'function'
    ? performance.now()
    : 0;
}

function animer(
  canevas: HTMLCanvasElement,
  contexte: CanvasRenderingContext2D,
  particules: readonly Particule[],
  couleur: string
): void {
  const vivantes = [...particules];
  const generation = generationParticules;

  const frame = (): void => {
    // Le canevas peut avoir été démonté ou affecté à un autre écran entre deux frames.
    // Dans ce cas, la gerbe ne doit ni continuer à travailler ni réapparaître sur le nouvel écran.
    if (
      generation !== generationParticules ||
      (canevasCourant !== null && canevasCourant !== canevas)
    ) {
      return;
    }
    const maintenant = performanceMs();
    contexte.clearRect(0, 0, canevas.width, canevas.height);

    let restantes = 0;
    for (const particule of vivantes) {
      const age = maintenant - particule.neeMs;
      if (age >= particule.vieMs) {
        continue;
      }
      restantes += 1;
      const progression = age / particule.vieMs;
      const x = particule.x + particule.vx * age;
      // Gravité douce : la gerbe retombe légèrement, elle ne s'envole pas hors de l'écran.
      const y = particule.y + particule.vy * age + 0.00012 * age * age;

      contexte.globalAlpha = 1 - progression;
      contexte.fillStyle = couleur;
      contexte.beginPath();
      contexte.arc(x, y, particule.rayon * (1 - progression * 0.5), 0, Math.PI * 2);
      contexte.fill();
    }
    contexte.globalAlpha = 1;

    canevas.setAttribute(ATTRIBUT_COMPTE, String(restantes));

    if (restantes > 0 && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(frame);
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(frame);
  } else {
    frame();
  }
}

// ─────────────────────────────────────────────── le canevas courant, pour `RetourSensoriel`
//
// `creerServicesParDefaut` construit le `RetourSensoriel` AVANT que React n'ait monté quoi que
// ce soit : il n'existe alors aucun canevas. Le registre ci-dessous est la seule indirection
// possible — un contexte React n'atteindrait pas un service construit hors de React.
//
// Un SEUL canevas à la fois, et c'est voulu : la couche de particules est unique et vit à la
// racine de l'application (`Application.tsx`). Deux couches concurrentes voudraient dire deux
// gerbes pour un seul doigt.

let canevasCourant: HTMLCanvasElement | null = null;
let generationParticules = 0;

/** Interrompt la gerbe courante et efface son canevas avant de changer d’écran. */
export function effacerParticules(): void {
  generationParticules += 1;
  const canevas = canevasCourant;
  if (canevas === null) return;
  const contexte = typeof canevas.getContext === 'function' ? canevas.getContext('2d') : null;
  contexte?.clearRect(0, 0, canevas.width, canevas.height);
  canevas.setAttribute(ATTRIBUT_COMPTE, '0');
}

/** Appelé par `<Particules>` au montage. Rend la fonction de désinscription. */
export function enregistrerCanevas(canevas: HTMLCanvasElement): () => void {
  if (canevasCourant !== null && canevasCourant !== canevas) {
    effacerParticules();
  }
  canevasCourant = canevas;
  return () => {
    if (canevasCourant === canevas) {
      effacerParticules();
      canevasCourant = null;
    }
  };
}

/**
 * Émet sur le canevas enregistré, s'il y en a un. Silencieux sinon.
 *
 * C'est la fonction que `creerRetourSensoriel` reçoit en `emettreParticules` : le retour
 * sensoriel ne connaît ni le DOM ni React, et reste testable avec une simple espionne.
 */
export function emettreSurCanevasCourant(
  origine: readonly [number, number],
  nombre: number,
  couleur: string = COULEUR_PARTICULES,
  dureeMs: number = DUREE_PARTICULES_MS
): void {
  if (canevasCourant === null) {
    return;
  }
  emettreParticules(canevasCourant, { origine, nombre, couleur, dureeMs });
}
