/**
 * M18 — LA FLÈCHE DU DUCTUS PEUT POINTER À L'ENVERS, ET RIEN NE LE DISAIT.
 *
 * `Docs/audit-qa.md` § 4.1 : la mutation M18 inverse `flecheDeSens` dans
 * `client/src/moteurs/trace/GuidageLettre.tsx` — `Math.atan2(a[1]-b[1], a[0]-b[0])` au lieu
 * de `Math.atan2(b[1]-a[1], b[0]-a[0])` — et les 1478 tests restent verts. Mesuré, cité :
 *
 *     $ grep -rn 'data-guide' tests/
 *     tests/composants/MoteurTrace-ordre-visible.test.tsx:92:    decrire('[data-guide="sens"]'),
 *
 * La flèche était vérifiée PRÉSENTE. Son ANGLE ne l'était nulle part.
 *
 * Ce que le défaut produit chez l'enfant : la flèche lui montre de tracer le `d` dans un sens,
 * `evaluerTrait` refuse ce sens-là. Il obéit à ce qu'il voit et il est puni pour ça. C'est pire
 * que le bug d'origine, parce que l'application se contredit elle-même — D33 le dit en toutes
 * lettres : « un moteur de tracé qui enseigne un mauvais sens détruit le mécanisme même pour
 * lequel il a été ajouté. »
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * SOURCE QUI FAIT FOI, LUE SUR DISQUE, JAMAIS RECALCULÉE ICI :
 * `contenu/modeles-lettres/minuscules.json`. Aucun angle n'est écrit en dur dans ce fichier ;
 * la direction attendue est dérivée des DEUX POINTS MÉDIANS du trait livré, exactement comme
 * le fait le composant. Le référentiel bouge, ce test suit ; un angle en dur aurait été une
 * seconde vérité (D48).
 *
 * CONTRAT DE SORTIE : le test imprime le nombre de lettres et de traits contrôlés et échoue
 * si le nombre de traits est inférieur à 45. Sans ce plancher il resterait vert sur un
 * référentiel vide — c'est le mode de défaillance n° 1 d'un test qui énumère.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GuidageLettre } from '@client/moteurs/trace/GuidageLettre';

import type { ModeleLettre, TraitLettre } from '@partage/moteurs/trace/index';

import { lireJson } from '../configuration/preparation.js';

const CHEMIN_MODELES = 'contenu/modeles-lettres/minuscules.json';

const REFERENTIEL = lireJson<{ readonly lettres: readonly ModeleLettre[] }>(CHEMIN_MODELES);

/**
 * Planchers du contrat de sortie. Mesurés sur le référentiel livré au 2026-08-03 :
 * 26 lettres, 45 traits. Ce sont des PLANCHERS — ajouter une lettre ne casse pas ce test,
 * en retirer une le casse, ce qui est le sens voulu.
 */
const LETTRES_MINIMUM = 26;
const TRAITS_MINIMUM = 45;

/** Tolérance angulaire. La flèche est calculée, pas dessinée à la main : 1° est large. */
const ECART_MAXIMAL_DEGRES = 1;

/**
 * Demi-largeur du couloir passée au composant. Sans effet sur la flèche ; une valeur
 * plausible suffit, et la fixer ici évite de faire croire qu'elle participe à la mesure.
 */
const TOLERANCE = 6;

interface Direction {
  readonly dx: number;
  readonly dy: number;
}

/**
 * La direction du parcours au milieu du trait, dérivée du RÉFÉRENTIEL.
 *
 * Reprend le choix des deux points de `flecheDeSens` : c'est volontaire et c'est la seule
 * façon de comparer un angle rendu à une intention. Ce qui est mesuré n'est pas la formule
 * — c'est le SENS : un composant qui inverse ses deux points échoue ici.
 */
function directionDuParcours(trait: TraitLettre): Direction {
  const points = trait.points;
  if (points.length < 2) {
    throw new Error(`Le trait ${trait.id} porte ${String(points.length)} point(s), il en faut ≥ 2.`);
  }
  const milieu = Math.floor(points.length / 2);
  const a = points[Math.max(0, milieu - 1)];
  const b = points[Math.min(points.length - 1, milieu)];
  if (a === undefined || b === undefined) {
    throw new Error(`Le trait ${trait.id} n'expose pas ses deux points médians.`);
  }
  return { dx: b[0] - a[0], dy: b[1] - a[1] };
}

function angleDe(direction: Direction): number {
  return (Math.atan2(direction.dy, direction.dx) * 180) / Math.PI;
}

/** Écart angulaire ramené dans [0, 180]. Deux angles à 359° et 1° sont à 2° l'un de l'autre. */
function ecartAngulaire(gauche: number, droite: number): number {
  const brut = Math.abs(((gauche - droite) % 360) + 360) % 360;
  return brut > 180 ? 360 - brut : brut;
}

const ROTATION = /rotate\(\s*(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)\s*\)/iu;

/** L'angle RÉELLEMENT rendu, lu dans l'attribut `transform` de la flèche. */
function angleRendu(fleche: Element): number {
  const transformation = fleche.getAttribute('transform') ?? '';
  const trouve = ROTATION.exec(transformation);
  if (trouve?.[1] === undefined) {
    throw new Error(`La flèche ne porte aucune rotation : transform="${transformation}"`);
  }
  return Number(trouve[1]);
}

function monterTrait(trait: TraitLettre): void {
  render(
    <svg viewBox="0 0 100 160">
      <GuidageLettre
        trait={trait}
        etat="en-cours"
        tolerance={TOLERANCE}
        animationsDesactivees
        enDemonstration={false}
      />
    </svg>,
  );
}

/** Tous les traits du référentiel, aplatis, avec la lettre qui les porte. */
function tousLesTraits(): readonly { readonly lettre: string; readonly trait: TraitLettre }[] {
  return REFERENTIEL.lettres.flatMap((modele) =>
    modele.traits.map((trait) => ({ lettre: modele.lettre, trait })),
  );
}

afterEach(() => {
  cleanup();
});

describe('le référentiel des minuscules est bien celui qu’on croit', () => {
  it('porte au moins 26 lettres et 45 traits — sinon les cas suivants sont vides', () => {
    const lettres = REFERENTIEL.lettres.length;
    const traits = tousLesTraits().length;
    console.log(
      `[qa-guidage-sens] population : ${String(lettres)} lettre(s), ${String(traits)} trait(s) ` +
        `lus dans ${CHEMIN_MODELES}`,
    );
    expect(lettres, `lettres lues dans ${CHEMIN_MODELES}`).toBeGreaterThanOrEqual(LETTRES_MINIMUM);
    expect(traits, `traits lus dans ${CHEMIN_MODELES}`).toBeGreaterThanOrEqual(TRAITS_MINIMUM);
  });

  it('chaque trait attendu rend bien une flèche de sens', () => {
    // Contrôle de la mesure : une flèche absente rendrait les deux cas suivants vacants.
    let flechesVues = 0;
    for (const { trait } of tousLesTraits()) {
      monterTrait(trait);
      if (document.querySelector('[data-guide="sens"]') !== null) flechesVues += 1;
      cleanup();
    }
    expect(flechesVues, 'un trait attendu sans flèche de sens').toBe(tousLesTraits().length);
  });
});

describe('M18 — la flèche de sens pointe DANS le sens du parcours', () => {
  it('sur les 45 traits des 26 minuscules, à moins de 1° près', () => {
    const fautifs: string[] = [];
    let controles = 0;

    for (const { lettre, trait } of tousLesTraits()) {
      monterTrait(trait);
      const fleche = document.querySelector('[data-guide="sens"]');
      expect(fleche, `${lettre} / ${trait.id} : aucune flèche rendue`).not.toBeNull();
      if (fleche === null) {
        cleanup();
        continue;
      }

      const attendu = angleDe(directionDuParcours(trait));
      const rendu = angleRendu(fleche);
      const ecart = ecartAngulaire(rendu, attendu);
      controles += 1;
      if (ecart > ECART_MAXIMAL_DEGRES) {
        fautifs.push(
          `${lettre} / ${trait.id} (${trait.libelle}) : rendu ${rendu.toFixed(1)}°, ` +
            `parcours ${attendu.toFixed(1)}°, écart ${ecart.toFixed(1)}°`,
        );
      }
      cleanup();
    }

    console.log(
      `[qa-guidage-sens] ${String(controles)} trait(s) contrôlé(s), ` +
        `${String(fautifs.length)} flèche(s) mal orientée(s)`,
    );

    expect(
      fautifs.length,
      `la flèche montre un sens que le moteur refusera :\n  ${fautifs.join('\n  ')}`,
    ).toBe(0);
    // CONTRAT DE SORTIE : sans ce plancher, un référentiel vide rendrait ce cas vert.
    expect(controles, 'traits réellement contrôlés').toBeGreaterThanOrEqual(TRAITS_MINIMUM);
  });

  it('et elle est à plus de 90° du sens INVERSE — c’est l’assertion qui mord', () => {
    // Redondante en géométrie, décisive en intention : c'est exactement ce que M18 produit.
    // Un composant qui inverse ses deux points sort ici à 180° du parcours, donc à 0° de son
    // inverse, et ce cas nomme la lettre fautive.
    const fautifs: string[] = [];
    let controles = 0;

    for (const { lettre, trait } of tousLesTraits()) {
      monterTrait(trait);
      const fleche = document.querySelector('[data-guide="sens"]');
      if (fleche === null) {
        cleanup();
        continue;
      }
      const direction = directionDuParcours(trait);
      const inverse = angleDe({ dx: -direction.dx, dy: -direction.dy });
      const rendu = angleRendu(fleche);
      const ecart = ecartAngulaire(rendu, inverse);
      controles += 1;
      if (ecart <= 90) {
        fautifs.push(
          `${lettre} / ${trait.id} : rendu ${rendu.toFixed(1)}°, ` +
            `à ${ecart.toFixed(1)}° du sens inverse (${inverse.toFixed(1)}°)`,
        );
      }
      cleanup();
    }

    expect(
      fautifs,
      `la flèche pointe vers l’arrière du trait :\n  ${fautifs.join('\n  ')}`,
    ).toHaveLength(0);
    expect(controles, 'traits réellement contrôlés').toBeGreaterThanOrEqual(TRAITS_MINIMUM);
  });
});

describe('le point de départ est posé là où le ductus commence', () => {
  it('`[data-guide="depart"]` est en `trait.depart`, sur les 45 traits', () => {
    // Deuxième moitié de D33 conséquence 3 : « point de départ marqué, flèche de direction ».
    // Un disque posé sur l'arrivée enseignerait le même faux que la flèche inversée.
    const fautifs: string[] = [];
    let controles = 0;

    for (const { lettre, trait } of tousLesTraits()) {
      monterTrait(trait);
      const depart = document.querySelector('[data-guide="depart"]');
      expect(depart, `${lettre} / ${trait.id} : aucun disque de départ`).not.toBeNull();
      if (depart === null) {
        cleanup();
        continue;
      }
      const cx = Number(depart.getAttribute('cx'));
      const cy = Number(depart.getAttribute('cy'));
      controles += 1;
      if (cx !== trait.depart[0] || cy !== trait.depart[1]) {
        fautifs.push(
          `${lettre} / ${trait.id} : disque en (${String(cx)}, ${String(cy)}), ` +
            `départ livré (${String(trait.depart[0])}, ${String(trait.depart[1])})`,
        );
      }
      cleanup();
    }

    expect(
      fautifs,
      `le disque n’est pas sur le départ du ductus :\n  ${fautifs.join('\n  ')}`,
    ).toHaveLength(0);
    expect(controles, 'traits réellement contrôlés').toBeGreaterThanOrEqual(TRAITS_MINIMUM);
  });
});
