/**
 * LA GERBE S'EFFACE-T-ELLE ? — R5, signalé TROIS fois en jouant.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL NE PASSE PAS PAR UN NAVIGATEUR
 *
 * « les particules en feux d'artifice ne s'effacent jamais ». Deux tentatives de reproduction
 * dans le panneau navigateur ont rendu des mesures **inexploitables** : le panneau n'était pas
 * affiché, donc `document.timeline.currentTime` restait à 0 et `requestAnimationFrame` ne
 * déclenchait rien. Les contrôles négatifs l'ont prouvé — un `div` ordinaire n'y finissait pas
 * non plus son animation. J'ai mesuré mon environnement deux fois de suite.
 *
 * Ici, **l'horloge et les frames sont à nous**. `animer` ne lit le temps que par
 * `performance.now()` et n'avance que par `requestAnimationFrame` : en fournissant les deux, on
 * exécute exactement le code de production, image par image, sans qu'aucun pixel n'ait à être
 * composé. Le verdict ne dépend plus de savoir si une fenêtre est visible.
 *
 * CE QUI EST OBSERVÉ, et c'est le point : le canevas est un ESPION. On enregistre chaque
 * `clearRect` et chaque `arc`, donc on sait à la frame près ce qui reste dessiné. « La gerbe
 * s'efface » cesse d'être une impression et devient : *après la dernière frame, le nombre de
 * disques dessinés depuis le dernier effacement vaut zéro.*
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  ATTRIBUT_COMPTE,
  DUREE_PARTICULES_MS,
  emettreParticules,
  PARTICULES_MAX
} from '@client/gamefeel/particules.js';

/** Une frame en attente, telle que `requestAnimationFrame` la garde. */
type Frame = () => void;

interface Banc {
  /** Avance l'horloge de `ms` puis exécute TOUTES les frames en attente, une passe. */
  readonly avancer: (ms: number) => void;
  /** Nombre de disques dessinés depuis le dernier `clearRect`. */
  readonly disquesVisibles: () => number;
  readonly framesEnAttente: () => number;
  readonly canevas: HTMLCanvasElement;
}

function monterBanc(): Banc {
  let horloge = 0;
  let enAttente: Frame[] = [];
  let disques = 0;

  const contexte = {
    setTransform: (): void => undefined,
    clearRect: (): void => {
      disques = 0;
    },
    beginPath: (): void => undefined,
    arc: (): void => {
      disques += 1;
    },
    fill: (): void => undefined,
    globalAlpha: 1,
    fillStyle: ''
  };

  const attributs = new Map<string, string>();
  const canevas = {
    width: 1920,
    height: 1200,
    clientWidth: 960,
    clientHeight: 600,
    getContext: (): unknown => contexte,
    setAttribute: (nom: string, valeur: string): void => {
      attributs.set(nom, valeur);
    },
    getAttribute: (nom: string): string | null => attributs.get(nom) ?? null
  } as unknown as HTMLCanvasElement;

  vi.stubGlobal('performance', { now: () => horloge });
  vi.stubGlobal('requestAnimationFrame', (frame: Frame): number => {
    enAttente.push(frame);
    return enAttente.length;
  });
  // La gerbe est décorative : `matchMedia` absent ne doit pas la supprimer.
  vi.stubGlobal('matchMedia', () => ({ matches: false }));

  return {
    avancer: (ms: number): void => {
      horloge += ms;
      const aJouer = enAttente;
      enAttente = [];
      for (const frame of aJouer) frame();
    },
    disquesVisibles: () => disques,
    framesEnAttente: () => enAttente.length,
    canevas
  };
}

let banc: Banc;

beforeEach(() => {
  banc = monterBanc();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const GERBE = {
  origine: [480, 300] as const,
  nombre: PARTICULES_MAX,
  couleur: '#FFC93C',
  dureeMs: DUREE_PARTICULES_MS
};

describe('la gerbe de bonne réponse finit toujours par disparaître', () => {
  test('CONTRÔLE POSITIF — elle est bien DESSINÉE, sinon tout le reste serait vert pour rien', () => {
    emettreParticules(banc.canevas, GERBE);
    expect(banc.framesEnAttente(), 'aucune frame demandée : rien ne sera dessiné').toBe(1);
    banc.avancer(16);
    expect(banc.disquesVisibles()).toBe(PARTICULES_MAX);
    expect(banc.canevas.getAttribute(ATTRIBUT_COMPTE)).toBe(String(PARTICULES_MAX));
  });

  test('une gerbe seule : plus rien à l’écran passé sa durée de vie', () => {
    emettreParticules(banc.canevas, GERBE);
    banc.avancer(16);
    expect(banc.disquesVisibles()).toBeGreaterThan(0);

    // On dépasse franchement la durée de vie, puis on laisse tourner les frames restantes.
    banc.avancer(DUREE_PARTICULES_MS + 100);
    expect(banc.disquesVisibles(), 'des disques survivent à leur durée de vie').toBe(0);
    expect(banc.canevas.getAttribute(ATTRIBUT_COMPTE)).toBe('0');
    expect(banc.framesEnAttente(), 'la boucle continue de tourner à vide').toBe(0);
  });

  test('DEUX GERBES QUI SE CHEVAUCHENT — le cas de l’enfant qui enchaîne les bonnes réponses', () => {
    // C'est le régime d'usage réel : une gerbe part à chaque bonne réponse, et un enfant qui
    // enchaîne en déclenche plusieurs avant que la première ne soit éteinte. Chaque gerbe porte
    // sa PROPRE boucle de frames, et chaque boucle efface le canevas ENTIER avant de dessiner :
    // c'est exactement la configuration où un effacement peut se perdre.
    emettreParticules(banc.canevas, GERBE);
    banc.avancer(16);
    emettreParticules(banc.canevas, GERBE);
    banc.avancer(16);
    expect(banc.disquesVisibles(), 'les deux gerbes devraient être visibles').toBeGreaterThan(0);

    banc.avancer(DUREE_PARTICULES_MS * 2);
    banc.avancer(16);
    expect(banc.disquesVisibles(), 'un résidu survit aux deux gerbes').toBe(0);
    expect(banc.framesEnAttente()).toBe(0);
  });

  test('CINQ gerbes rapprochées ne laissent aucun résidu', () => {
    for (let rang = 0; rang < 5; rang += 1) {
      emettreParticules(banc.canevas, GERBE);
      banc.avancer(120);
    }
    banc.avancer(DUREE_PARTICULES_MS * 2);
    banc.avancer(16);
    expect(banc.disquesVisibles(), 'résidu après cinq gerbes').toBe(0);
    expect(banc.canevas.getAttribute(ATTRIBUT_COMPTE)).toBe('0');
    expect(banc.framesEnAttente()).toBe(0);
  });

  test('LE RÉGIME QUI PIÈGE — une frame sautée, comme quand l’onglet passe en arrière-plan', () => {
    // `requestAnimationFrame` ne se déclenche pas dans un onglet caché : la page reprend plus
    // tard, et la première frame qui suit voit un saut de temps énorme. Toutes les particules
    // sont alors mortes D'UN COUP. Si l'effacement dépendait d'un passage progressif, il ne se
    // ferait jamais.
    emettreParticules(banc.canevas, GERBE);
    banc.avancer(16);
    expect(banc.disquesVisibles()).toBeGreaterThan(0);

    banc.avancer(30_000); // trente secondes d'onglet caché
    expect(banc.disquesVisibles(), 'la gerbe est restée figée à l’écran').toBe(0);
    expect(banc.framesEnAttente()).toBe(0);
  });
});
