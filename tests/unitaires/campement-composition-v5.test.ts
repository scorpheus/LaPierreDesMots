/**
 * Le campement V5 est un LIEU, pas trente cases alignées. Ces gardes portent sur le fichier réel :
 * ils échouent sur la grille 10 × 3 historique même si ses trente attributs R11 restent présents.
 */
import { describe, expect, it } from 'vitest';

import { campementDuDocument } from '@partage/monde/campement.js';
import { lireJson, lireTexte } from '../configuration/preparation.js';

const DOCUMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const SVG = lireTexte('contenu/habillages/campement/campement.svg');

describe('campement V5 — une scène composée et adressable', () => {
  it('porte exactement un groupe vectoriel visible pour chacun des 30 points', () => {
    const groupes = [...SVG.matchAll(/<g\s+id="objet-([a-z0-9-]+)"/gu)].map((m) => m[1]).sort();
    const points = DOCUMENT.points.map((point) => point.id).sort();
    expect(groupes).toEqual(points);
    expect(new Set(groupes).size).toBe(DOCUMENT.points.length);
  });

  it('n’est plus la grille technique 10 × 3', () => {
    const xs = new Set(DOCUMENT.points.map((point) => point.zone[0]));
    const ys = new Set(DOCUMENT.points.map((point) => point.zone[1]));
    const tailles = new Set(DOCUMENT.points.map((point) => `${point.zone[2]}x${point.zone[3]}`));

    expect(ys.size, 'trois rangées régulières ne forment pas un campement').toBeGreaterThanOrEqual(8);
    expect(xs.size, 'dix colonnes régulières ne forment pas un campement').toBeGreaterThanOrEqual(15);
    expect(tailles.size, 'une tente et un escargot ne doivent pas avoir la même hiérarchie').toBeGreaterThanOrEqual(5);
  });

  it('déclare la composition V5 dans le SVG de production', () => {
    expect(SVG).toContain('data-direction="campement-v5-enfant"');
    expect(SVG).toContain('data-composition="ilots-naturels"');
    expect(SVG).not.toContain('data-composition="grille-10x3"');
  });
});
