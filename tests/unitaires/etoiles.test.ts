/**
 * `calculerEtoiles` — barème v2 § 6.2, repris sans variante par le contrat gelé § 5.7.
 *
 *   ★    l'exercice est terminé — toujours acquise
 *   ★★   `aideUtilisee === 'aucune'` sur toute la tentative
 *   ★★★  `nbErreurs === 0` sur toute la tentative
 *
 * **Lecture retenue : additive.** Les trois lignes du contrat § 5.7 énoncent trois conditions
 * INDÉPENDANTES, et le contrat § 10 attribue à chaque étoile son propre `data-acquise`
 * (`oui`/`non`) — un affichage par étoile n'aurait aucun sens si les étoiles formaient une
 * échelle où la troisième impliquait la deuxième. Le nombre rendu est donc le compte des
 * conditions satisfaites : 1 + (sans aide) + (sans erreur).
 *
 * ⚠ Point signalé au rapport de L-G : le contrat nomme `calculerEtoiles` (§ 11.1) sans en
 * donner la signature, et `BaremeEtoiles` (`jeu.etoiles = { sansAide, sansErreur }`) laisse
 * penser à un second paramètre. Ce fichier l'appelle avec DEUX arguments : c'est la seule
 * forme d'appel valable quelle que soit celle des deux signatures que L-B a retenue.
 */
import { describe, expect, it } from 'vitest';

import { calculerEtoiles } from '@pierre/partage';

import type { BaremeEtoiles, NiveauAide, ResumeTentative } from '@pierre/partage';

/** Le barème de l'exercice de la v1 : les trois étoiles sont offertes (contrat § 9.5). */
const BAREME_COMPLET: BaremeEtoiles = { sansAide: true, sansErreur: true };

function resume(
  parties: Partial<Pick<ResumeTentative, 'reussi' | 'nbErreurs' | 'aideUtilisee'>>
): ResumeTentative {
  return {
    reussi: true,
    nbErreurs: 0,
    aideUtilisee: 'aucune',
    dureeMs: 42_000,
    etapes: [],
    ...parties
  };
}

describe('calculerEtoiles', () => {
  const table: ReadonlyArray<
    readonly [libelle: string, aide: NiveauAide, erreurs: number, attendu: number]
  > = [
    ['sans aide, sans erreur', 'aucune', 0, 3],
    ['sans aide, une erreur', 'aucune', 1, 2],
    ['sans aide, dix erreurs', 'aucune', 10, 2],
    ['indice, sans erreur', 'indice', 0, 2],
    ['indice, une erreur', 'indice', 1, 1],
    ['démonstration, sans erreur', 'demonstration', 0, 2],
    ['démonstration, quarante erreurs', 'demonstration', 40, 1]
  ];

  it.each(table)('%s → %i étoile(s)', (_libelle, aideUtilisee, nbErreurs, attendu) => {
    expect(calculerEtoiles(resume({ aideUtilisee, nbErreurs }), BAREME_COMPLET)).toBe(attendu);
  });

  it('la première étoile est TOUJOURS acquise quand l’exercice est terminé — R14', () => {
    // C'est la règle de non-échec traduite en arithmétique : le pire cas possible, quarante
    // erreurs et la démonstration, rapporte quand même une étoile.
    for (const aide of ['aucune', 'indice', 'demonstration'] as const) {
      for (const erreurs of [0, 1, 7, 40, 1_000]) {
        const etoiles = calculerEtoiles(
          resume({ aideUtilisee: aide, nbErreurs: erreurs }),
          BAREME_COMPLET
        );
        expect(etoiles).toBeGreaterThanOrEqual(1);
        expect(etoiles).toBeLessThanOrEqual(3);
      }
    }
  });

  it('ne rend jamais plus de trois étoiles, ni un non-entier', () => {
    const etoiles = calculerEtoiles(resume({}), BAREME_COMPLET);
    expect(Number.isInteger(etoiles)).toBe(true);
    expect(etoiles).toBe(3);
  });

  it('une tentative non terminée ne rapporte aucune étoile', () => {
    // `reussi: false` est structurellement inatteignable pour `colorie` (contrat § 5.6),
    // mais `calculerEtoiles` est un calcul général : il doit tenir ce cas sans exploser.
    expect(calculerEtoiles(resume({ reussi: false, nbErreurs: 0 }), BAREME_COMPLET)).toBe(0);
  });

  it('est monotone : plus d’erreurs ne rapporte jamais plus d’étoiles', () => {
    let precedent = calculerEtoiles(resume({ nbErreurs: 0 }), BAREME_COMPLET);
    for (const erreurs of [1, 2, 3, 5, 8, 13, 21]) {
      const courant = calculerEtoiles(resume({ nbErreurs: erreurs }), BAREME_COMPLET);
      expect(courant).toBeLessThanOrEqual(precedent);
      precedent = courant;
    }
  });

  it('est monotone sur l’aide : indice ne rapporte jamais plus que « aucune »', () => {
    const sansAide = calculerEtoiles(resume({ aideUtilisee: 'aucune' }), BAREME_COMPLET);
    const indice = calculerEtoiles(resume({ aideUtilisee: 'indice' }), BAREME_COMPLET);
    const demo = calculerEtoiles(resume({ aideUtilisee: 'demonstration' }), BAREME_COMPLET);
    expect(indice).toBeLessThanOrEqual(sansAide);
    expect(demo).toBeLessThanOrEqual(indice);
  });
});
