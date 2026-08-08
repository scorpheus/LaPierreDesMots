/**
 * LE MASQUAGE DU DÉTECTEUR DE TESTS TROMPEURS, ET SON CONTRÔLE POSITIF.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE — un détecteur bloquant qui détruisait sa propre mesure
 *
 * Le 2026-08-08, `scripts/qa/tests-trompeurs.mjs` a refusé un commit avec ce verdict :
 *
 *     tests/e2e/parcours-aucun-geste-mort.spec.ts
 *     FICHIER-SANS-ASSERTION — aucun `expect(` dans tout le fichier
 *
 * Le fichier en portait QUATRE, aux lignes 235, 287, 292 et 400. Mesuré, pas supposé :
 *
 *     $ node -e "…readFileSync(…).match(/expect\(/g).length"   → 4
 *
 * La cause tenait à la ligne 178 du fichier accusé :
 *
 *     valeur.replace(/["\\]/g, '\\$&')
 *
 * `masquer()` ignorait les littéraux d'expression régulière. Il a vu le guillemet À
 * L'INTÉRIEUR de la regex, cru qu'une chaîne s'ouvrait, cherché sa fermeture jusqu'au bout du
 * fichier, et blanchi tout ce qui suivait — assertions comprises.
 *
 * C'est le défaut que ce script existe pour traquer, retourné contre lui : **un instrument qui
 * rend un verdict bloquant sur une mesure qu'il a lui-même détruite.** Et il était branché en
 * `pre-commit`, donc le seul recours apparent était de le contourner — c'est-à-dire de
 * désactiver la QA à cause d'un défaut de la QA.
 *
 * ── LES DEUX SENS DE L'ERREUR, ET POURQUOI ILS NE SE VALENT PAS ───────────────────────────
 * Prendre une division pour une regex EFFACE DU CODE, donc fabrique des faux « sans
 * assertion » : c'est la faute qu'on vient de payer. Prendre une regex pour une division
 * laisse du bruit dans le masque, ce qui produit au pire un faux avertissement.
 * `masquer()` penche donc du côté sûr : **une regex sans `/` fermant sur sa ligne n'est pas
 * traitée comme une regex, et rien n'est blanchi.**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = resolve(RACINE, 'scripts', 'qa', 'tests-trompeurs.mjs');

/**
 * `masquer` et `positionDExpression` ne sont pas exportées — le script est un exécutable, pas
 * une bibliothèque, et l'exporter pour le tester changerait sa nature. On les extrait donc du
 * source, ce qui a un avantage : le test lit LE MÊME TEXTE que celui qui s'exécute en
 * `pre-commit`, sans copie qui pourrait diverger.
 */
function chargerMasquer(): (source: string) => string {
  const source = readFileSync(SCRIPT, 'utf8');
  const debut = source.indexOf('function positionDExpression');
  expect(debut, 'positionDExpression doit exister dans le script').toBeGreaterThan(0);
  const finMasquer = source.indexOf('\n}', source.indexOf('function masquer(source)'));
  expect(finMasquer, 'masquer doit exister dans le script').toBeGreaterThan(0);
  const extrait = source.slice(debut, finMasquer + 2);
  return new Function(`${extrait}; return masquer;`)() as (source: string) => string;
}

describe('masquer() du détecteur de tests trompeurs', () => {
  const masquer = chargerMasquer();

  /**
   * LE CONTRÔLE POSITIF, dans sa forme la plus directe : la ligne exacte qui a produit le faux
   * bloquant, suivie d'une assertion. Avant la correction du 2026-08-08, ce cas ÉCHOUAIT —
   * c'est la seule preuve qui compte, un banc né vert n'ayant rien gardé.
   */
  it('LE DÉFAUT — une regex portant un guillemet n’emporte pas le code qui la suit', () => {
    const source = [
      'const echapper = (v) => v.replace(/["\\\\]/g, "x");',
      'expect(quelqueChose).toBe(1);'
    ].join('\n');

    const masque = masquer(source);

    expect(
      masque,
      'le `"` vit DANS la regex : il n’ouvre aucune chaîne, et l’assertion qui suit doit survivre'
    ).toContain('expect(');
  });

  it('l’apostrophe d’une regex ne mange pas davantage — même défaut, autre guillemet', () => {
    const masque = masquer("const m = /['`]/g;\nexpect(a).toBe(2);");
    expect(masque).toContain('expect(');
  });

  it('une regex qui contient un `/` dans une classe reste une seule regex', () => {
    const masque = masquer('const m = /[/]/g;\nexpect(a).toBe(3);');
    expect(masque).toContain('expect(');
  });

  /**
   * LE CONTRÔLE NÉGATIF. Sans lui, on aurait pu « corriger » en traitant tout `/` comme une
   * regex : les cas ci-dessus passeraient au vert et le masquage serait faux dans l'autre sens.
   */
  it('CONTRÔLE NÉGATIF — une vraie division n’est pas prise pour une regex', () => {
    const source = 'const moyenne = total / nombre;\nconst reste = a / b / c;\nexpect(moyenne).toBe(4);';
    const masque = masquer(source);
    expect(masque, 'aucun caractère ne doit être blanchi entre deux divisions').toBe(source);
  });

  it('CONTRÔLE NÉGATIF — un `/` sans fermeture sur sa ligne ne blanchit rien', () => {
    const source = 'const x = (a) / (b + c);\nexpect(x).toBe(5);';
    expect(masquer(source)).toBe(source);
  });

  /** Ce que `masquer` doit TOUJOURS faire, et que la correction ne devait pas casser. */
  it('les chaînes et les commentaires restent masqués, longueurs préservées', () => {
    const source = "// expect(faux)\nconst s = 'expect(faux)';\nexpect(vrai).toBe(6);";
    const masque = masquer(source);
    expect(masque.length, 'les décalages doivent survivre au masquage').toBe(source.length);
    expect((masque.match(/expect\(/g) ?? []).length, 'un seul `expect(` est du vrai code').toBe(1);
  });

  /**
   * LA GARDE DE NON-RÉGRESSION SUR LE VRAI FICHIER. C'est lui qui a été accusé à tort ; le
   * détecteur doit continuer de voir ses assertions, quelles que soient ses futures regex.
   */
  it('le fichier accusé à tort garde ses quatre assertions visibles du détecteur', () => {
    const chemin = resolve(RACINE, 'tests', 'e2e', 'parcours-aucun-geste-mort.spec.ts');
    const source = readFileSync(chemin, 'utf8');
    const reelles = (source.match(/expect\(/g) ?? []).length;
    expect(reelles, 'le fichier doit toujours porter des assertions').toBeGreaterThan(0);
    expect(
      (masquer(source).match(/expect\(/g) ?? []).length,
      'le masquage ne doit effacer AUCUNE des assertions réellement présentes'
    ).toBe(reelles);
  });
});
