/**
 * LES ÉTOILES S'EXPLIQUENT SANS JAMAIS DIRE « RATÉ » — R4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « j'ai eu qu'une seule étoile alors que tout est bon ppk ? » Relevé dans son journal :
 *
 *     clairiere-01   nb_erreurs = 2   aide_utilisee = indice   etoiles = 1
 *
 * Le barème avait raison ; c'est le SILENCE qui était le défaut. Rien ne reliait son étoile
 * unique à ce qui s'était passé.
 *
 * Ce fichier garde deux choses, et la seconde est la plus difficile :
 *  1. la bonne étoile s'allume au bon critère ;
 *  2. **aucune phrase ne reproche quoi que ce soit** — ni « raté », ni « erreur », ni compte de
 *     fautes, ni « tu n'as pas ». C'est la traduction mécanique de R14 (« aucun écran d'échec »)
 *     et de R15 (« l'aide de Gobi n'est jamais présentée comme un échec »), et c'est exactement
 *     le genre de règle qu'une capture d'écran ne saura jamais vérifier.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, test } from 'vitest';

import { detailDesEtoiles } from '@client/composants/detail-etoiles.js';

import type { NiveauAide, ResumeTentative } from '@pierre/partage';

function resume(nbErreurs: number, aideUtilisee: NiveauAide): ResumeTentative {
  return { reussi: true, nbErreurs, aideUtilisee, dureeMs: 1000, etapes: [] };
}

/**
 * Les mots qu'aucune phrase ne doit porter. Ils sont écrits ici en toutes lettres pour qu'un
 * futur rédacteur voie CE QUI EST INTERDIT avant d'écrire, et pas seulement que « le test est
 * rouge ».
 */
const MOTS_DE_REPROCHE = [
  'raté', 'rate', 'échec', 'echec', 'perdu', 'faux', 'faute', 'erreur',
  'tu n’as pas', "tu n'as pas", 'dommage', 'mauvais',
];

describe('R4 — le détail des étoiles dit ce qui est GAGNÉ, jamais ce qui a manqué', () => {
  test('LE CAS DU PÈRE — 2 erreurs et une aide : la première étoile seule, et on dit pourquoi', () => {
    const lignes = detailDesEtoiles(resume(2, 'indice'));
    expect(lignes.map((l) => l.acquise)).toEqual([true, false, false]);
    // La première est toujours là : « toute session se termine sur une réussite » (R14).
    expect(lignes[0]?.acquise).toBe(true);
    // Et chaque étoile non acquise porte SA condition — l'enfant apprend la règle du jeu.
    expect(lignes[1]?.texte).toMatch(/Gobi/u);
    expect(lignes[2]?.texte).toMatch(/premier coup/u);
  });

  test('sans aide et sans erreur : les trois, et trois phrases au passé', () => {
    const lignes = detailDesEtoiles(resume(0, 'aucune'));
    expect(lignes.map((l) => l.acquise)).toEqual([true, true, true]);
  });

  test('aidé mais sans faute : DEUX étoiles — l’aide ne fait pas retomber au minimum', () => {
    // C'est l'arbitrage de `calculerEtoiles` : le compte est additif, pas cumulatif. Faire
    // retomber au minimum un enfant qui a demandé de l'aide punirait exactement le geste que
    // les specs veulent gratuit.
    const lignes = detailDesEtoiles(resume(0, 'indice'));
    expect(lignes.map((l) => l.acquise)).toEqual([true, false, true]);
  });

  test('sans aide mais avec des fautes : DEUX étoiles, la troisième seule manque', () => {
    const lignes = detailDesEtoiles(resume(3, 'aucune'));
    expect(lignes.map((l) => l.acquise)).toEqual([true, true, false]);
  });

  test('LA RÈGLE LA PLUS DURE — aucune phrase ne reproche, dans AUCUN des cas possibles', () => {
    for (const nbErreurs of [0, 1, 5, 40]) {
      for (const aide of ['aucune', 'indice', 'demonstration', 'guidage'] as NiveauAide[]) {
        for (const ligne of detailDesEtoiles(resume(nbErreurs, aide))) {
          const texte = ligne.texte.toLowerCase();
          for (const interdit of MOTS_DE_REPROCHE) {
            expect(
              texte,
              `« ${ligne.texte} » contient « ${interdit} » — R14 et R15 l’interdisent`
            ).not.toContain(interdit);
          }
          // Et aucun CHIFFRE : « tu as fait 2 erreurs » serait une note déguisée.
          expect(texte, `« ${ligne.texte} » porte un chiffre`).not.toMatch(/\d/u);
        }
      }
    }
  });

  test('les rangs suivent le contrat DOM du composant `Etoiles` (contrat § 10)', () => {
    expect(detailDesEtoiles(resume(0, 'aucune')).map((l) => l.rang)).toEqual([1, 2, 3]);
  });
});
