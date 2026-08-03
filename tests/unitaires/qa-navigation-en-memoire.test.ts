/**
 * LA QA NE PEUT PLUS NAVIGUER PAR URL — le défaut historique n° 2 du père, rendu mécanique.
 *
 * ── LE DÉFAUT, TEL QU'IL A ÉTÉ VÉCU ───────────────────────────────────────────────────────
 *
 * « La QA se mentait sur sa couverture. Elle naviguait par URL alors que le routeur est en
 * mémoire : elle auditait l'écran des profils 8 fois en publiant "8/8 routes visitées". »
 *
 * `client/src/routeur.tsx` monte `createMemoryHistory({ initialEntries: ['/'] })` — un choix
 * délibéré et documenté (« le jeu est une borne sur tablette »). Un `page.goto('/campement')`
 * ne demande donc PAS le campement : il recharge l'application sur `/`, et la recette audite
 * l'écran d'accueil en croyant auditer le campement. Rien ne rougit : c'est le pire genre de
 * défaut de QA, celui qui produit un CHIFFRE FAUX au lieu d'une erreur.
 *
 * ── CE QUI MANQUAIT, ET QUE CE FICHIER APPORTE ────────────────────────────────────────────
 *
 * Le défaut a été CORRIGÉ — mesuré le 2026-08-02, `grep -rho "page\.goto([^)]*)" tests/e2e` :
 *
 *     22 page.goto('/')          ← toutes sur la racine
 *      1 page.goto('/campement') ← dans un COMMENTAIRE, qui documente l'erreur
 *
 * … mais il n'était gardé par RIEN. Aucune commande n'empêchait la prochaine recette de le
 * refaire. Une leçon retenue par discipline est une leçon qu'on réapprend ; ce fichier la
 * rend opposable, au `pre-commit`, en deux secondes.
 *
 * Il audite les OBJETS — tous les fichiers de `tests/e2e/` — et non les occurrences d'un motif
 * dans ceux qu'on a pensé à regarder (D48).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));

/** Tous les fichiers de recette et d'outillage E2E, énumérés sur disque. */
function fichiersE2E(): readonly string[] {
  return readdirSync(`${RACINE}tests/e2e`)
    .filter((f) => f.endsWith('.ts'))
    .sort();
}

/**
 * Le texte d'un fichier, **commentaires retirés**.
 *
 * Sans ça, ce garde rougirait sur le commentaire de `qa-outils.ts` qui EXPLIQUE le défaut —
 * il punirait la documentation de l'erreur. Le retrait est volontairement grossier (blocs
 * `/* … *\/` et lignes `//`) : il ne sert qu'à cette recherche.
 */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

const CIBLES_AUTORISEES = new Set(["'/'", '"/"', '`/`']);

describe('la QA navigue en TAPANT, jamais par URL — défaut historique n° 2', () => {
  it('CONTRAT DE SORTIE — aucun `page.goto` ne vise autre chose que la racine', () => {
    const fichiers = fichiersE2E();
    const fautes: string[] = [];
    let nbGoto = 0;

    for (const fichier of fichiers) {
      const source = sansCommentaires(readFileSync(`${RACINE}tests/e2e/${fichier}`, 'utf8'));
      const lignes = source.split(/\r?\n/);
      lignes.forEach((ligne, index) => {
        for (const trouve of ligne.matchAll(/\.goto\(\s*([^),]*)/gu)) {
          nbGoto += 1;
          const cible = (trouve[1] ?? '').trim();
          if (!CIBLES_AUTORISEES.has(cible)) {
            fautes.push(
              `tests/e2e/${fichier}:${String(index + 1)} — \`goto(${cible})\`. Le routeur est en ` +
                'mémoire : cette URL recharge l’application sur « / » et la recette auditera ' +
                'l’écran d’accueil en croyant auditer autre chose. Naviguer en TAPANT.',
            );
          }
        }
      });
    }

    // La fraction est assertée, jamais seulement imprimée (défaut historique n° 6).
    expect(fautes, 'des recettes naviguent par URL — la QA se remettrait à mentir sur sa couverture').toEqual([]);
    // Les deux planchers : sans eux, « aucune faute » serait vrai sur un dossier vide ou sur
    // une expression régulière qui ne trouve plus rien parce que l'API a changé de nom.
    expect(fichiers.length, 'inventaire des fichiers E2E anormalement pauvre').toBeGreaterThanOrEqual(15);
    expect(
      nbGoto,
      'aucun `goto` trouvé : la recherche ne mesure plus rien, ce garde est devenu creux',
    ).toBeGreaterThanOrEqual(15);
  });

  it('le routeur du client est bien un historique EN MÉMOIRE — la prémisse du garde ci-dessus', () => {
    // Si un jour le routeur passait à un historique de navigateur, le garde ci-dessus
    // deviendrait une contrainte gratuite. On vérifie donc la raison, pas seulement la règle.
    const routeur = readFileSync(`${RACINE}client/src/routeur.tsx`, 'utf8');
    expect(
      routeur,
      'le routeur n’est plus en mémoire : la règle « jamais de goto profond » est à rediscuter, ' +
        'pas à contourner',
    ).toContain('createMemoryHistory');
  });
});
