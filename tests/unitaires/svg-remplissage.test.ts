/**
 * Le contrôle structurel de remplissage — annexe P § 3.2, `scripts/svg-remplissage.mjs`.
 *
 * Ce fichier existe pour une raison précise, et c'est la leçon de CLAUDE.md sur le « détecteur
 * qui déclare un poids qu'il n'applique jamais » : le contrôle P3.2 a été élargi à
 * l'intégration pour couvrir les 8 SVG du monde (carte, campement, 5 stades de Gobi, cristal)
 * qu'aucun habillage ne déclare. Un contrôle élargi qui rendrait « 0 problème » sur TOUT,
 * y compris sur un fichier fautif, serait un élargissement pour rien.
 *
 * Les cas ci-dessous **discriminent** : ils prouvent que le contrôle attrape le tracé rempli
 * et ouvert, et qu'il n'attrape pas les cinq pointillés légitimes de la carte réelle.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { estCheminFerme } from '@pierre/partage/validation';
// @ts-expect-error — module JavaScript d'outillage, sans déclaration de types : c'est le même
// fichier que celui qu'exécute `scripts/test-contenu.mjs`, et le tester ailleurs ne prouverait
// rien sur ce qui tourne dans la chaîne.
import { cheminsRemplisNonFermes } from '../../scripts/svg-remplissage.mjs';

import { RACINE_DEPOT } from '../configuration/preparation.js';

function analyser(svg: string): string[] {
  return cheminsRemplisNonFermes(svg, estCheminFerme) as string[];
}

const CARRE_FERME = 'M10,10 L90,10 L90,90 L10,90 Z';
const CARRE_OUVERT = 'M10,10 L90,10 L90,90 L10,90';

describe('cheminsRemplisNonFermes', () => {
  it('ne signale rien sur un tracé rempli et fermé', () => {
    expect(analyser(`<svg><path id="a" d="${CARRE_FERME}" fill="#FF0000"/></svg>`)).toEqual([]);
  });

  it('SIGNALE un tracé rempli et ouvert — c’est la fuite de l’annexe P § 3.2', () => {
    expect(analyser(`<svg><path id="fuite" d="${CARRE_OUVERT}" fill="#FF0000"/></svg>`)).toEqual([
      'fuite'
    ]);
  });

  it('ne signale pas un tracé ouvert dont le remplissage est `none`', () => {
    expect(analyser(`<svg><path id="trait" d="${CARRE_OUVERT}" fill="none"/></svg>`)).toEqual([]);
  });

  it('hérite `fill="none"` du `<g>` parent — sinon cinq faux positifs sur la carte réelle', () => {
    const svg =
      `<svg><g id="calque-chemin" fill="none" stroke="#000">` +
      `<path id="chemin-1" d="${CARRE_OUVERT}"/>` +
      `<path id="chemin-2" d="${CARRE_OUVERT}"/>` +
      `</g></svg>`;
    expect(analyser(svg)).toEqual([]);
  });

  it('retrouve le remplissage après la fermeture du `<g>` qui le neutralisait', () => {
    const svg =
      `<svg><g fill="none"><path id="dedans" d="${CARRE_OUVERT}"/></g>` +
      `<path id="dehors" d="${CARRE_OUVERT}" fill="#00FF00"/></svg>`;
    expect(analyser(svg)).toEqual(['dehors']);
  });

  it('sans aucun `fill`, le défaut SVG est `black` : le tracé est contrôlé, pas ignoré', () => {
    // Le doute penche vers le contrôle. Un tracé sans `fill` EST rempli en noir au rendu.
    expect(analyser(`<svg><path id="sansfill" d="${CARRE_OUVERT}"/></svg>`)).toEqual(['sansfill']);
  });

  it('nomme par son rang un tracé fautif sans `id`, au lieu de le taire', () => {
    expect(analyser(`<svg><path d="${CARRE_OUVERT}" fill="#123456"/></svg>`)).toEqual([
      '<path> n° 1'
    ]);
  });

  it('les 8 SVG du monde, lus sur disque, ne portent aucune fuite', () => {
    // Fichiers réels, pas des fixtures : un contrôle validé sur des chaînes inventées ne dit
    // rien du contenu qui atteint l'enfant.
    const fichiers = [
      'contenu/habillages/carte/carte-monde.svg',
      'contenu/habillages/campement/campement.svg',
      'contenu/assets/gobi/cristal-base.svg',
      'contenu/assets/gobi/stade-1-oeuf.svg',
      'contenu/assets/gobi/stade-2-boule.svg',
      'contenu/assets/gobi/stade-3-crete.svg',
      'contenu/assets/gobi/stade-4-equipe.svg',
      'contenu/assets/gobi/stade-5-gardien.svg'
    ];
    expect(fichiers).toHaveLength(8);
    for (const relatif of fichiers) {
      const texte = readFileSync(join(RACINE_DEPOT, ...relatif.split('/')), 'utf8');
      expect(analyser(texte), `fuites dans ${relatif}`).toEqual([]);
    }
  });
});
