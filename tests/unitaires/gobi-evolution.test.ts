/**
 * L'évolution de Gobi ne recule JAMAIS — D28, R14, contrat des features v2 § 4.5.
 *
 * Ce fichier porte le second chiffre du contrat de sortie de L2-F (§ 10.4) :
 *
 *   « Rang de stade sur 10 000 séquences aléatoires de gains et de pertes → échoue si une
 *     seule décroissance. »
 *
 * Les séquences ne sont pas illustratives : elles contiennent des PERTES de formes, c'est-à-dire
 * exactement le cas que « un acquis n'est jamais repris » interdit d'observer. Un
 * `stadeApresFormes` qui se contenterait de lire le nombre de formes — sans prendre le maximum
 * avec le rang déjà atteint — ferait tomber ce fichier au premier retrait.
 *
 * L'aléatoire vient d'`Alea` (graine fixée), jamais de `Math.random` : les 10 000 séquences sont
 * rejouables à l'identique.
 */
import { describe, expect, it } from 'vitest';

import { formesDuDocument, prochainStade, stadeApresFormes, stadesDuDocument }
  from '@partage/monde/gobi.js';
import type { EtatGobi, FormeGobi, StadeGobi } from '@partage/monde/types.js';

import { GRAINE_DE_TEST, aleaDeTest, lireJson } from '../configuration/preparation.js';

/**
 * **La table vient de la DONNÉE, jamais du code** (convention C2). Si un jour un seuil était
 * réécrit en dur dans `gobi.ts`, ce fichier continuerait de lire le JSON et l'écart se verrait.
 */
const DOCUMENT: unknown = lireJson('contenu/monde/gobi-stades.json');
const STADES: readonly StadeGobi[] = stadesDuDocument(DOCUMENT);

function forme(rang: number): FormeGobi {
  return {
    grapheme: `g${String(rang)}`,
    libelle: `graphème ${String(rang)}`,
    cristal: 'assets/gobi/cristal-base.svg',
    obtenueLe: '2026-09-01T08:00:00.000Z'
  };
}

function etat(nbFormes: number, stade: EtatGobi['stade'] = 'oeuf'): EtatGobi {
  return {
    stade,
    formes: Array.from({ length: nbFormes }, (_, index) => forme(index)),
    formeActive: null
  };
}

function rangDe(code: EtatGobi['stade']): number {
  const trouve = STADES.find((stade) => stade.code === code);
  if (trouve === undefined) {
    throw new Error(`Stade inconnu dans la table : ${code}`);
  }
  return trouve.rang;
}

describe('la table des stades', () => {
  it('déclare cinq stades de rangs 1 à 5, strictement croissants (Q3)', () => {
    expect(STADES).toHaveLength(5);
    expect(STADES.map((stade) => stade.rang)).toEqual([1, 2, 3, 4, 5]);
  });

  it('exige un nombre de formes croissant avec le rang', () => {
    const requises = STADES.map((stade) => stade.formesRequises);
    for (let index = 1; index < requises.length; index += 1) {
      expect(requises[index]).toBeGreaterThan(requises[index - 1]!);
    }
    expect(requises[0]).toBe(0);
  });

  it('déclare les 25 formes de cristal de D20 — le corps ne change pas, le cristal si', () => {
    const formes = formesDuDocument(DOCUMENT);
    expect(formes).toHaveLength(25);
    expect(new Set(formes.map((forme) => forme.grapheme)).size).toBe(25);
    // Le seuil du dernier stade et le nombre de formes se répondent : le gardien est atteint
    // quand la collection est complète. Un écart ici rendrait le dernier stade inatteignable.
    expect(STADES[STADES.length - 1]!.formesRequises).toBe(formes.length);
  });

  it('refuse un document dont les rangs ne sont pas 1..n — il refuse plutôt que d’émettre du faux', () => {
    expect(() => stadesDuDocument({ stades: [{ code: 'oeuf', rang: 2, formesRequises: 0 }] }))
      .toThrow(/rang/u);
  });
});

describe('stadeApresFormes', () => {
  it('part de `oeuf` quand aucune forme n’a été obtenue', () => {
    expect(stadeApresFormes(etat(0), STADES)).toBe('oeuf');
  });

  it('monte au stade dont le seuil est atteint', () => {
    for (const stade of STADES) {
      expect(stadeApresFormes(etat(stade.formesRequises), STADES)).toBe(stade.code);
    }
  });

  it('ne redescend pas quand des formes disparaissent — le rang courant fait plancher', () => {
    // Le cas exact de R14 : l'état déclare `gardien`, la collection est vide.
    expect(stadeApresFormes(etat(0, 'gardien'), STADES)).toBe('gardien');
    expect(stadeApresFormes(etat(1, 'equipe'), STADES)).toBe('equipe');
  });

  it('rend le stade courant plutôt que d’inventer quoi que ce soit sur une table vide', () => {
    expect(stadeApresFormes(etat(12, 'crete'), [])).toBe('crete');
  });

  it('ne décroît sur AUCUNE des 10 000 séquences de gains ET de pertes (D28, R14)', () => {
    const alea = aleaDeTest(GRAINE_DE_TEST);
    let decroissances = 0;
    let sequences = 0;
    let rangMaximalObserve = 0;

    for (let essai = 0; essai < 10_000; essai += 1) {
      sequences += 1;
      let courant: EtatGobi = etat(0);
      let rangPrecedent = rangDe(stadeApresFormes(courant, STADES));

      for (let pas = 0; pas < 12; pas += 1) {
        // Un pas sur trois RETIRE des formes. C'est ce qui rend le test opposable.
        const delta = alea.flottant() < 0.34 ? -alea.entier(0, 6) : alea.entier(0, 6);
        const nbFormes = Math.max(0, courant.formes.length + delta);
        const stade = stadeApresFormes(courant, STADES);
        courant = { ...etat(nbFormes), stade };

        const rang = rangDe(stadeApresFormes(courant, STADES));
        if (rang < rangPrecedent) {
          decroissances += 1;
        }
        rangPrecedent = rang;
        rangMaximalObserve = Math.max(rangMaximalObserve, rang);
      }
    }

    // Contrat de sortie : les trois nombres sont IMPRIMÉS, pas seulement assertés.
    console.log(
      `[L2-F] séquences=${String(sequences)} decroissances=${String(decroissances)} ` +
        `rangMax=${String(rangMaximalObserve)}`
    );
    expect(sequences).toBe(10_000);
    expect(decroissances).toBe(0);
    // Un test où le rang ne monterait jamais serait creux : on exige d'avoir vu le sommet.
    expect(rangMaximalObserve).toBe(5);
  });
});

describe('prochainStade — la jauge du VIDE (D25, point 3)', () => {
  it('annonce le stade suivant et ce qu’il reste à faire', () => {
    const suivant = prochainStade(etat(0), STADES);
    expect(suivant).not.toBeNull();
    expect(suivant!.stade.rang).toBe(2);
    expect(suivant!.formesRestantes).toBe(STADES[1]!.formesRequises);
  });

  it('n’annonce jamais un reste négatif', () => {
    const suivant = prochainStade(etat(STADES[1]!.formesRequises), STADES);
    expect(suivant!.stade.rang).toBe(3);
    expect(suivant!.formesRestantes).toBeGreaterThanOrEqual(0);
  });

  it('rend `null` au dernier stade — il n’y a plus de vide à montrer', () => {
    expect(prochainStade(etat(0, 'gardien'), STADES)).toBeNull();
  });
});
