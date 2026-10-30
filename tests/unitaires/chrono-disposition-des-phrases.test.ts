/**
 * Décision du parent du 30 oct. (Docs/contrat-socle-activite.md § 12, point 3) : une phrase de
 * récit garde des lignes d'au moins 15 caractères. La loi pure : quelle largeur une légende
 * demande, et quelle disposition de `chrono` la lui donne. Le rendu réel est jugé par
 * `tests/qualite/responsive-tous-ecrans.spec.ts` (`defautsDesLignesDeRecit`).
 */
import { describe, expect, it } from 'vitest';

import {
  choisirDispositionChrono,
  departsDeLigne,
  largeurUtileDePhrase,
} from '../../client/src/moteurs/chrono/disposition-des-phrases.js';

/** Police à chasse fixe : 10 px par caractère, blancs compris. */
const chasseFixe = (texte: string): number => texte.length * 10;

/** Remplissage glouton du navigateur, à chasse fixe : les lignes réellement composées. */
function composer(phrase: string, largeur: number): string[] {
  const lignes: string[] = [];
  let ligne = '';
  for (const mot of phrase.split(' ')) {
    const candidate = ligne === '' ? mot : `${ligne} ${mot}`;
    if (ligne !== '' && chasseFixe(candidate) > largeur) {
      lignes.push(ligne);
      ligne = mot;
    } else {
      ligne = candidate;
    }
  }
  if (ligne !== '') lignes.push(ligne);
  return lignes;
}

const PHRASES = [
  'Une grande flaque apparaît et un arc-en-ciel se forme.',
  'Gobi trouve un panier et un bol posés à côté.',
  'Il pose le bol dans le panier.',
  'La pluie tombe très fort.',
  'Le sable est dans le seau.',
];

describe('chrono — la largeur d’une phrase de récit', () => {
  it('chaque départ de ligne court jusqu’au premier blanc après le 15e caractère', () => {
    expect(departsDeLigne('Il pose le bol dans le panier.')).toContain('Il pose le bol dans');
    expect(departsDeLigne('Il pose le bol dans le panier.')).toContain('le bol dans le panier.');
  });

  it('à la largeur mesurée, aucune ligne sauf la dernière ne tombe sous 15 caractères', () => {
    for (const phrase of PHRASES) {
      const largeur = largeurUtileDePhrase([phrase], chasseFixe);
      const lignes = composer(phrase, largeur);
      for (const ligne of lignes.slice(0, -1)) expect(ligne.length, `${phrase} → ${JSON.stringify(lignes)}`).toBeGreaterThanOrEqual(15);
      for (const mot of phrase.split(' ')) expect(chasseFixe(mot)).toBeLessThanOrEqual(largeur);
    }
  });

  it('la largeur exigée est celle de la plus exigeante des légendes affichées', () => {
    const ensemble = largeurUtileDePhrase(PHRASES, chasseFixe);
    expect(ensemble).toBe(Math.max(...PHRASES.map((p) => largeurUtileDePhrase([p], chasseFixe))));
  });

  it('un 240 px au corps 27 (≈ 14 px par caractère) ne suffit pas : c’est le défaut mesuré le 30 oct.', () => {
    const corps27 = (texte: string): number => texte.length * 14;
    expect(largeurUtileDePhrase(['Une grande flaque apparaît et un arc-en-ciel se forme.'], corps27)).toBeGreaterThan(240 - 2 * 13);
  });
});

describe('chrono — colonnes, pile ou pile haute', () => {
  const base = { nombreDeVignettes: 3, ecart: 16, habillageCarte: 30, imageACote: 150, largeurTexte: 260 };

  it('trois colonnes quand chacune laisse à la légende sa largeur', () => {
    expect(choisirDispositionChrono({ ...base, largeurPlateau: 3 * 290 + 2 * 16 })).toBe('colonnes');
  });

  it('la pile, image à côté, dès qu’une colonne serait trop étroite', () => {
    expect(choisirDispositionChrono({ ...base, largeurPlateau: 3 * 290 + 2 * 16 - 1 })).toBe('pile');
    expect(choisirDispositionChrono({ ...base, largeurPlateau: 260 + 30 + 150 })).toBe('pile');
  });

  it('la pile haute, image au-dessus, quand même la pile ne laisse pas une ligne', () => {
    expect(choisirDispositionChrono({ ...base, largeurPlateau: 260 + 30 + 150 - 1 })).toBe('pile-haute');
  });
});
