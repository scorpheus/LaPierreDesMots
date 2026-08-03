/**
 * LE VOILE DE GRISAILLE EST-IL GRIS ? — lot S4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE, ET POURQUOI AUCUN TEST NE L'AVAIT VU
 *
 * `VoileGrisaille` posait `<use href="#clairiere" fill="var(--grisaille)" stroke="none"/>`.
 * L'intention se lisait dans le code ; le rendu était l'inverse exact de l'intention.
 *
 * En SVG, `<use>` CLONE l'élément référencé, et un attribut de présentation porté par le clone
 * l'emporte sur la valeur HÉRITÉE du `<use>`. Or les six territoires de `carte-monde-v3.svg`
 * portent leur `fill` en dur. Le « voile » redessinait donc chaque région DANS SA PROPRE
 * COULEUR, par-dessus ses ornements : « un monde gris que l'enfant rallume » n'a jamais montré
 * un seul pixel gris, et une région voilée se distinguait d'une région terminée par l'ABSENCE
 * de ses ornements — le signal exactement opposé à celui qu'on voulait.
 *
 * Mesuré dans Chrome, voile à 100 %, pixel lu au centre de chaque territoire
 * (`node bac-a-sable/s4-carte/mesurer-voile.mjs`) :
 *
 *   AVANT  clairiere #3DDC97 · galeries #2FA8E0 · marais-jumeau #8FD6F2 · foret-muette #C98B4B
 *          volcan #C0453A · cite-des-histoires #FFC93C
 *          → régions dont le voile plein N EST PAS gris : 6 / 6
 *   APRÈS  les six à #8E97A8, écart à --grisaille : 0
 *          → régions dont le voile plein N EST PAS gris : 0 / 6
 *
 * ── POURQUOI CE FICHIER NE MESURE PAS DES PIXELS ──────────────────────────────────────────────
 * happy-dom ne rend rien : ni `<use>`, ni découpage, ni cascade. Un test de pixel exigerait un
 * navigateur, donc `test:visuel`, donc des références d'image — et une référence d'image ne dit
 * jamais POURQUOI elle a changé.
 *
 * Ce fichier garde donc l'INVARIANT DE STRUCTURE que la mesure ci-dessus a établi : le voile ne
 * peint jamais par clonage, il découpe. Cet invariant aurait attrapé le défaut, et il l'attrape
 * encore — le premier cas ci-dessous vérifie d'abord que le PIÈGE EXISTE TOUJOURS (les six
 * territoires portent bien leur propre `fill`), sans quoi le reste garderait un risque disparu
 * et serait vert sans rien prouver.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { rayonDuPalier, VoileGrisaille } from '@client/monde/VoileGrisaille.js';

import { lireTexte } from '../configuration/preparation.js';

afterEach(() => {
  cleanup();
});

const CHEMIN_CARTE = 'contenu/habillages/carte/carte-monde-v3.svg';

/** Les six régions, DANS L'ORDRE — l'ordre EST la progression phonologique. */
const SIX: readonly string[] = [
  'clairiere',
  'galeries',
  'marais-jumeau',
  'foret-muette',
  'volcan',
  'cite-des-histoires',
];

/** Rend le voile dans un `<svg>`, comme `EcranCarte` le fait. */
function poser(
  props: Partial<Parameters<typeof VoileGrisaille>[0]> = {}
): SVGGElement {
  const { container } = render(
    <svg viewBox="0 0 1200 800">
      <VoileGrisaille forme="clairiere" opacite={1} {...props} />
    </svg>
  );
  return container.querySelector('[data-voile="grisaille"]') as unknown as SVGGElement;
}

describe('le voile de Grisaille grise, et il ne re-peint jamais un clone', () => {
  const carte = lireTexte(CHEMIN_CARTE);

  test('CONTRÔLE POSITIF — les six territoires portent bien leur propre `fill` en dur', () => {
    // Sans ce cas, tout ce qui suit garderait un piège qui n'existe peut-être plus : « 0 défaut
    // sur 0 risque » est le mode de défaillance d'un contrôle creux. C'est CE `fill`-ci qui
    // écrasait la couleur du voile à travers `<use>`.
    const avecFill = SIX.filter((code) =>
      new RegExp(`<path id="${code}"[^>]*\\sfill="#[0-9A-Fa-f]{6}"`, 'u').test(carte)
    );
    expect(avecFill, 'le piège que ce fichier garde a disparu — relire l’en-tête').toEqual([
      ...SIX,
    ]);
  });

  test('le voile ne pose AUCUN `<use>` : rien n’est cloné, donc rien ne peut être écrasé', () => {
    const voile = poser();
    expect(voile.querySelectorAll('use')).toHaveLength(0);
  });

  test('le voile DÉCOUPE la silhouette, et le `clipPath` visé existe pour les six régions', () => {
    for (const code of SIX) {
      const voile = poser({ forme: code });
      const decoupe = voile.querySelector('[clip-path]');
      expect(decoupe?.getAttribute('clip-path'), code).toBe(`url(#clip-${code})`);
      // Et il ne vise pas dans le vide : le décor déclare bien ce `clipPath`, en `<use>` de la
      // silhouette — c'est ce qui fait que le voile couvre EXACTEMENT ce que le dessin remplit.
      expect(
        carte.includes(`<clipPath id="clip-${code}"><use href="#${code}"/></clipPath>`),
        `\`clip-${code}\` absent du décor : le voile découperait dans le vide`
      ).toBe(true);
      cleanup();
    }
  });

  test('la plaque voilante est peinte en `--grisaille`, et elle est SOUS le découpage', () => {
    const voile = poser();
    const plaque = voile.querySelector('[data-voile-plaque="grisaille"]');
    expect(plaque?.getAttribute('fill')).toBe('var(--grisaille)');
    // « Sous le découpage » n'est pas un détail : une plaque posée à côté du groupe découpé
    // couvrirait tout le parchemin. C'est l'ancêtre qui borne, pas la plaque.
    expect(plaque?.closest('[clip-path]')).not.toBeNull();
  });

  test('l’opacité pilote le voile entier, et elle est bornée à [0, 1]', () => {
    for (const [donnee, attendu] of [
      [0, '0'],
      [0.4, '0.4'],
      [1, '1'],
      [-3, '0'],
      [7, '1'],
    ] as const) {
      const voile = poser({ opacite: donnee });
      expect(voile.querySelector('[clip-path]')?.getAttribute('opacity'), String(donnee)).toBe(
        attendu
      );
      cleanup();
    }
  });

  test('le brouillard bouge À L’INTÉRIEUR du découpage, jamais la silhouette elle-même', () => {
    // L'ancienne animation portait `translateX(6px) scale(1.02)` sur la forme voilante : c'est
    // la FRONTIÈRE de la région qui glissait, découvrant un liseré de couleur. Avec un
    // découpage, déplacer la plaque déplacerait aussi son découpage — le gris se décalerait de
    // son territoire. Tout ce qui est animé doit donc être un DESCENDANT du groupe découpé, et
    // le groupe découpé, lui, ne doit porter aucune animation.
    const voile = poser();
    const decoupe = voile.querySelector('[clip-path]') as unknown as SVGGElement;
    expect(decoupe.style.animation, 'le groupe découpé ne s’anime jamais').toBe('');

    const animes = [...voile.querySelectorAll<SVGElement>('*')].filter(
      (element) => element.style.animation !== ''
    );
    expect(animes.length, 'un brouillard qui ne bouge pas n’est pas un brouillard').toBeGreaterThan(
      0
    );
    for (const element of animes) {
      expect(element.closest('[clip-path]'), element.tagName).toBe(decoupe);
    }
  });

  test('`animationsDesactivees` supprime vraiment TOUTE animation (D21, garde-fou 2)', () => {
    const voile = poser({ animationsDesactivees: true });
    const animes = [...voile.querySelectorAll<SVGElement>('*')].filter(
      (element) => element.style.animation !== ''
    );
    expect(animes.map((element) => element.tagName)).toEqual([]);
  });

  test('la règle `prefers-reduced-motion` vise des éléments QUI EXISTENT', () => {
    // C'est le défaut que l'ancien composant portait déjà en silence : son garde-fou visait
    // `[data-voile="grisaille"] > use`, et après correction ce sélecteur n'aurait plus désigné
    // personne. Une règle qui ne s'applique à rien ne se voit pas — d'où ce cas.
    const voile = poser();
    const feuille = voile.querySelector('style')?.textContent ?? '';
    expect(feuille).toContain('prefers-reduced-motion');

    const selecteur = /@media \(prefers-reduced-motion: reduce\) \{\s*([^{]+)\{/u.exec(feuille)?.[1];
    expect(selecteur, 'aucun sélecteur dans le garde-fou').toBeDefined();
    expect(voile.querySelectorAll(selecteur!.trim()).length).toBeGreaterThan(0);

    // Et les images-clés que les éléments citent sont bien déclarées : une `animation` qui
    // pointe vers des images-clés absentes ne fait rien, en silence.
    const declarees = new Set(
      [...feuille.matchAll(/@keyframes ([\w-]+)/gu)].map((occurrence) => occurrence[1])
    );
    const citees = new Set(
      [...voile.querySelectorAll<SVGElement>('*')]
        .map((element) => /^([\w-]+)/u.exec(element.style.animation)?.[1])
        .filter((nom): nom is string => nom !== undefined)
    );
    expect(citees.size).toBeGreaterThan(0);
    expect([...citees].filter((nom) => !declarees.has(nom))).toEqual([]);
  });

  test('le voile ne mange jamais le tap : une région voilée reste touchable', () => {
    const voile = poser();
    expect(voile.style.pointerEvents).toBe('none');
    expect(voile.getAttribute('aria-hidden')).toBe('true');
  });
});

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE RALLUMAGE PAR PALIERS — ce que ces cas gardent, et le défaut qui les a fait écrire.
 *
 * Mesuré sur la base de jeu réelle, après le premier exercice du père :
 * `pourcentage_colorie = 0,0833` en Clairière, donc un voile à `1 − 0,0833 = 0,917`. **Un
 * exercice réussi levait 8 % d'un gris uniforme** — invisible. La récompense existait dans la
 * base et nulle part à l'écran.
 *
 * Ces cas ne mesurent aucun pixel : happy-dom ne rend ni masque ni dégradé. Ils gardent la LOI,
 * qui est ce qui a été trouvé faux — l'aire rallumée par palier — et l'invariant de structure
 * qui empêche la correction de se retourner en son contraire, comme le `<use>` du lot S4.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
describe('chaque palier rallume une ZONE, et toujours la même part du TERRITOIRE', () => {
  const carte = lireTexte(CHEMIN_CARTE);

  /** Ancres, reprises de `EcranCarte`. Un écart ferait naître le halo hors du territoire. */
  const ANCRES: Readonly<Record<string, readonly [number, number]>> = {
    clairiere: [190, 640],
    galeries: [450, 460],
    'marais-jumeau': [240, 240],
    'foret-muette': [620, 150],
    volcan: [900, 340],
    'cite-des-histoires': [1020, 630],
  };

  /** Sommets du territoire, lus dans le décor. Géométrie polygonale : M/L/Z uniquement. */
  function sommets(code: string): readonly (readonly [number, number])[] {
    const trouve = new RegExp(`<path id="${code}"[^>]*\\sd="([^"]+)"`, 'u').exec(carte);
    expect(trouve, `silhouette introuvable : ${code}`).not.toBeNull();
    const nombres = ((trouve as RegExpExecArray)[1].match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
    const points: [number, number][] = [];
    for (let index = 0; index + 1 < nombres.length; index += 2) {
      points.push([nombres[index] as number, nombres[index + 1] as number]);
    }
    return points;
  }

  function dansLePolygone(x: number, y: number, points: readonly (readonly [number, number])[]) {
    let dedans = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i] as readonly [number, number];
      const [xj, yj] = points[j] as readonly [number, number];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
  }

  /** Distances de l'ancre à chaque point intérieur. Pas de 2 : assez fin, et rapide. */
  function distancesInterieures(code: string): readonly number[] {
    const points = sommets(code);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const [ax, ay] = ANCRES[code] as readonly [number, number];
    const distances: number[] = [];
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2) {
        if (dansLePolygone(x, y, points)) distances.push(Math.hypot(x - ax, y - ay));
      }
    }
    return distances;
  }

  test.each([
    ['clairiere', 12],
    ['galeries', 14],
    ['cite-des-histoires', 14],
  ])(
    'LE DÉFAUT CORRIGÉ — %s : chaque palier rallume la même part du territoire, mesurée sur le décor',
    (code, paliers) => {
      // Ce cas NE FAIT PAS CONFIANCE à la table engendrée : il recompte les points intérieurs
      // dans le décor et vérifie ce que les rayons rallument VRAIMENT. C'est ce qui le rend non
      // circulaire — une table fausse le ferait rougir.
      //
      // La loi jetée (`R·√(k/N)`, aire de DISQUE constante) donnait, mesurée de cette façon :
      // palier 1 à 19,5 % et palier 12 à 0,0 %. Les derniers exercices ne rallumaient RIEN.
      const distances = distancesInterieures(code);
      const total = distances.length;
      expect(total, 'silhouette vide').toBeGreaterThan(1000);

      const cumule = (franchis: number): number =>
        distances.filter((distance) => distance <= rayonDuPalier(franchis, paliers, code)).length /
        total;

      const pas = Array.from(
        { length: paliers },
        (_, rang) => cumule(rang + 1) - cumule(rang)
      );
      const attendu = 1 / paliers;
      for (const [rang, part] of pas.entries()) {
        // Tolérance de 2 points de pourcentage : la table est quantilée à 5 % et interpolée, et
        // la grille de contrôle est deux fois plus grossière que celle du générateur.
        expect(part, `${code} palier ${String(rang + 1)} rallume ${(part * 100).toFixed(1)} %`)
          .toBeCloseTo(attendu, 1.5);
      }
      // Et surtout : AUCUN palier ne rallume rien. C'est le défaut exact qu'on corrige.
      expect(Math.min(...pas), `${code} — un palier ne rallume rien`).toBeGreaterThan(0.02);
    }
  );

  test('rien de franchi ⇒ aucun halo ; tout franchi ⇒ le territoire est entièrement rallumé', () => {
    for (const code of SIX) {
      expect(rayonDuPalier(0, 12, code), code).toBe(0);
      const distances = distancesInterieures(code);
      const rayonFinal = rayonDuPalier(12, 12, code);
      const restant = distances.filter((distance) => distance > rayonFinal).length;
      expect(restant, `${code} — ${String(restant)} points restent gris au dernier palier`).toBe(0);
      // Et il ne décroît jamais — même invariant que `pourcentageColorie` (R14).
      for (let franchis = 1; franchis <= 12; franchis += 1) {
        expect(rayonDuPalier(franchis, 12, code)).toBeGreaterThan(
          rayonDuPalier(franchis - 1, 12, code)
        );
      }
    }
  });

  test('une région absente de la table mesurée ne rallume RIEN — jamais un rayon inventé', () => {
    // Un territoire ajouté au décor sans que `scripts/generer-rallumage.mjs` ait été relancé.
    // Un halo faux rallumerait la mauvaise part du monde en silence ; un halo absent se voit au
    // premier exercice joué.
    expect(rayonDuPalier(6, 12, 'territoire-qui-n-existe-pas')).toBe(0);
  });

  test('le halo RETIRE la Grisaille par un masque — il ne peint jamais par-dessus', () => {
    // C'est la même famille de défaut que le `<use>` du lot S4 : un disque couleur parchemin
    // posé sur le territoire cacherait le dessin au lieu de le découvrir, et se lirait comme
    // une tache. Le halo doit donc vivre dans un `<mask>`, et le groupe découpé s'y référer.
    const voile = poser({ paliers: 12, franchis: 3, centre: [190, 640] });
    const halo = voile.querySelector('[data-voile-halo="rallumage"]');
    expect(halo, 'aucun halo rendu alors que la région déclare ses paliers').not.toBeNull();
    expect(halo?.closest('mask'), 'le halo doit être DANS un masque').not.toBeNull();

    const decoupe = voile.querySelector('[clip-path]');
    expect(decoupe?.getAttribute('mask')).toBe('url(#masque-rallumage-clairiere)');
  });

  test('la Grisaille garde sa densité PLEINE sous les paliers : les deux effets ne se cumulent pas', () => {
    // Sans cette règle, un territoire à moitié rallumé serait en plus à moitié transparent, et
    // on retomberait exactement sur l'éclaircissement invisible qu'on corrige.
    const voile = poser({ opacite: 0.5, paliers: 12, franchis: 6, centre: [190, 640] });
    expect(voile.querySelector('[clip-path]')?.getAttribute('opacity')).toBe('1');
  });

  test('sans `paliers`, le composant retombe exactement sur le voile uniforme d’avant', () => {
    const voile = poser({ opacite: 0.4 });
    expect(voile.querySelector('[data-voile-halo="rallumage"]')).toBeNull();
    expect(voile.querySelector('[clip-path]')?.getAttribute('mask')).toBeNull();
    expect(voile.querySelector('[clip-path]')?.getAttribute('opacity')).toBe('0.4');
  });

  test('`animationsDesactivees` coupe aussi la croissance du halo (D21, garde-fou 2)', () => {
    const voile = poser({
      paliers: 12,
      franchis: 4,
      centre: [190, 640],
      animationsDesactivees: true
    });
    const halo = voile.querySelector<SVGElement>('[data-voile-halo="rallumage"]');
    expect(halo?.style.transition ?? '').toBe('');
  });
});
