/**
 * Les paires miroir et leurs deux axes — D23, lot L2-D.
 *
 * D23, conséquence 1 : « Ne jamais traiter `b/d/p/q` en bloc : ce sont deux mécanismes
 * différents, et un enfant peut être gêné par un axe et pas par l'autre. » Ce fichier est le
 * garde-fou mécanique de cette phrase. Le défaut qu'il attrape est précis et silencieux : une
 * table qui rendrait `null` pour un axe, ou qui rangerait `b`↔`p` en gauche-droite, ferait un
 * top 10 du dashboard exact en apparence et faux en pédagogie.
 *
 * On teste par PROPRIÉTÉ sur la table réelle, pas par exemple : un test qui récite les quatre
 * lignes qu'on vient d'écrire ne teste rien.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PAIRES_MIROIR, axeDeLaPaire, pairesDeLAxe } from '@partage/pedagogie/miroir.js';

import type { AxeMiroir } from '@pierre/partage';

const AXES: readonly AxeMiroir[] = ['gauche-droite', 'haut-bas'];

/** Les lettres effectivement citées par D23 et par la région des Galeries. */
const LETTRES = ['b', 'd', 'p', 'q'];

describe('PAIRES_MIROIR — la table fait autorité', () => {
  it('déclare les quatre paires de D23, chacune avec un axe', () => {
    expect(PAIRES_MIROIR).toHaveLength(4);
    for (const paire of PAIRES_MIROIR) {
      expect(AXES).toContain(paire.axe);
      expect(paire.a).not.toBe(paire.b);
    }
  });

  it('couvre les deux axes, deux paires chacun — aucun axe vide', () => {
    for (const axe of AXES) {
      expect(pairesDeLAxe(axe)).toHaveLength(2);
    }
    expect(pairesDeLAxe('gauche-droite').concat(pairesDeLAxe('haut-bas'))).toHaveLength(
      PAIRES_MIROIR.length
    );
  });

  it('range b↔d et p↔q en gauche-droite, b↔p et d↔q en haut-bas', () => {
    expect(axeDeLaPaire('b', 'd')).toBe('gauche-droite');
    expect(axeDeLaPaire('p', 'q')).toBe('gauche-droite');
    expect(axeDeLaPaire('b', 'p')).toBe('haut-bas');
    expect(axeDeLaPaire('d', 'q')).toBe('haut-bas');
  });

  it("ne déclare jamais deux fois la même paire, quel que soit l'ordre des lettres", () => {
    const vues = new Set<string>();
    for (const paire of PAIRES_MIROIR) {
      const cle = [paire.a, paire.b].sort().join('');
      expect(vues.has(cle)).toBe(false);
      vues.add(cle);
    }
  });
});

describe('axeDeLaPaire — propriétés', () => {
  it('est symétrique : l’ordre des lettres ne change jamais l’axe', () => {
    fc.assert(
      fc.property(fc.constantFrom(...LETTRES), fc.constantFrom(...LETTRES), (a, b) => {
        expect(axeDeLaPaire(a, b)).toBe(axeDeLaPaire(b, a));
      })
    );
  });

  it('rend `null` pour toute paire hors table, et jamais un axe inventé', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 1, maxLength: 3 }),
        (a, b) => {
          const axe = axeDeLaPaire(a, b);
          const connue = PAIRES_MIROIR.some(
            (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)
          );
          if (!connue) {
            expect(axe).toBeNull();
          } else {
            expect(AXES).toContain(axe);
          }
        }
      )
    );
  });

  it('rend `null` quand une lettre est confondue avec elle-même', () => {
    for (const lettre of LETTRES) {
      expect(axeDeLaPaire(lettre, lettre)).toBeNull();
    }
  });

  it('rend un axe pour les 4 paires de la table, dans les deux sens — aucune sans axe', () => {
    let avecAxe = 0;
    for (const paire of PAIRES_MIROIR) {
      if (axeDeLaPaire(paire.a, paire.b) === paire.axe) avecAxe += 1;
      if (axeDeLaPaire(paire.b, paire.a) === paire.axe) avecAxe += 1;
    }
    expect(avecAxe).toBe(PAIRES_MIROIR.length * 2);
  });
});

describe('pairesDeLAxe — sert à composer un exercice qui ne travaille QU’UN axe (D23)', () => {
  it('ne rend que des paires de l’axe demandé', () => {
    for (const axe of AXES) {
      for (const paire of pairesDeLAxe(axe)) {
        expect(paire.axe).toBe(axe);
      }
    }
  });

  it('partitionne la table : aucune paire perdue, aucune comptée deux fois', () => {
    const rendues = AXES.flatMap((axe) => pairesDeLAxe(axe).map((p) => `${p.a}${p.b}`));
    expect(new Set(rendues).size).toBe(PAIRES_MIROIR.length);
  });
});
