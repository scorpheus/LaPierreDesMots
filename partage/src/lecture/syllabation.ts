/**
 * Découpage syllabique pour la coloration alternée — lot L2-B.
 *
 * Règle, puis exceptions — dans cet ordre, et l'ordre compte : le lexique
 * `contenu/referentiel/syllabation-exceptions.json` gagne toujours sur la règle. Un mot du
 * lexique rend `certain: true` ; un mot découpé par la règle rend `certain: false`.
 *
 * INVARIANT opposable, vérifié par propriété : `segments.map(s => s.texte).join('') === mot`,
 * pour tout mot. Un découpage qui perd ou duplique une lettre est un défaut, pas une
 * approximation. C'est le seul invariant que ce module garantit sans réserve — et c'est
 * volontaire : le français n'a pas de règle de coupe sans exception (question Q2 du contrat
 * des features v2 § 9), mais il n'a aucune excuse pour perdre une lettre.
 *
 * La règle implantée est celle de la **syllabe graphique** enseignée au CP — celle qui compte
 * le `e` muet final comme une syllabe (`por-te`, `é-co-le`, `ta-ble`). C'est bien celle-là qu'il
 * faut, et non la syllabe phonétique : l'enfant sort du CP et déchiffre encore (D18).
 */
import type { SegmentSyllabe } from './types.js';

/**
 * Voyelles graphiques. `y` en fait partie — c'est ce qui rend `il`, `pluie` et `nuit`
 * monosyllabiques, et ce qui permet à la coupe intervocalique de `ra-yu-res` d'exister.
 * `œ` et `æ` comptent pour une voyelle : elles ne sont jamais coupées en deux.
 */
const VOYELLES = new Set('aeiouyàâäéèêëîïôöùûüÿœæ'.split(''));

/**
 * Voyelles à tréma : elles MARQUENT le hiatus, c'est leur seule fonction en français
 * (`ma-ïs`, `No-ël`). Une suite de voyelles se coupe donc juste avant l'une d'elles.
 */
const TREMAS = new Set(['ï', 'ë', 'ü', 'ÿ']);

/**
 * Groupes de deux consonnes qui ne se séparent JAMAIS : occlusive ou `f` suivie de `l`/`r`,
 * plus les quatre digrammes consonantiques. Ils partent entiers avec la syllabe suivante —
 * `ta-ble`, `ar-bres`, `mon-ta-gnes`, `gau-che`.
 */
const INSEPARABLES = new Set([
  'bl', 'cl', 'fl', 'gl', 'pl',
  'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr',
  'ch', 'ph', 'th', 'gn',
]);

function estVoyelle(caractere: string): boolean {
  return VOYELLES.has(caractere);
}

function estLettre(caractere: string): boolean {
  return /\p{L}/u.test(caractere);
}

/**
 * Positions de coupe **à l'intérieur d'une suite de lettres**, en indices croissants.
 *
 * Une position `p` signifie « la syllabe suivante commence au caractère `p` ». La liste est
 * toujours strictement croissante et bornée par `]0, longueur[`, ce qui suffit à garantir
 * l'invariant de concaténation quel que soit le contenu de la chaîne.
 */
function coupesDeLaRegle(minuscule: string): readonly number[] {
  const lettres = minuscule.split('');
  const coupes: number[] = [];

  // 1. Les noyaux : suites maximales de voyelles, coupées aux hiatus marqués (tréma) et
  //    devant un `y` intervocalique, qui vaut `i + i` (`ra-yu-res`, `cra-yon`).
  const noyaux: { readonly debut: number; readonly fin: number }[] = [];
  let index = 0;
  while (index < lettres.length) {
    if (!estVoyelle(lettres[index] as string)) {
      index += 1;
      continue;
    }
    const debut = index;
    while (index < lettres.length && estVoyelle(lettres[index] as string)) {
      index += 1;
    }
    let curseur = debut;
    for (let interne = debut + 1; interne < index; interne += 1) {
      const lettre = lettres[interne] as string;
      const suivanteEstVoyelle = interne + 1 < index;
      if (TREMAS.has(lettre) || (lettre === 'y' && suivanteEstVoyelle)) {
        noyaux.push({ debut: curseur, fin: interne });
        coupes.push(interne);
        curseur = interne;
      }
    }
    noyaux.push({ debut: curseur, fin: index });
  }

  // Aucun noyau : rien à couper. Une suite de consonnes reste d'un seul tenant.
  if (noyaux.length < 2) {
    return coupes;
  }

  // 2. Entre deux noyaux consécutifs, la suite de consonnes décide de la coupe.
  for (let rang = 0; rang + 1 < noyaux.length; rang += 1) {
    const debutConsonnes = (noyaux[rang] as { fin: number }).fin;
    const finConsonnes = (noyaux[rang + 1] as { debut: number }).debut;
    const nombre = finConsonnes - debutConsonnes;

    if (nombre <= 0) {
      // Coupe déjà posée par le hiatus (tréma ou `y`) : ne pas la doubler.
      continue;
    }
    if (nombre === 1) {
      // V-CV — la consonne unique ouvre la syllabe suivante (`é-co-le`).
      coupes.push(debutConsonnes);
      continue;
    }

    const deuxDernieres = minuscule.slice(finConsonnes - 2, finConsonnes);
    const groupeIndissociable = INSEPARABLES.has(deuxDernieres);

    if (nombre === 2) {
      // V-CCV si le groupe est indissociable (`ta-ble`), VC-CV sinon (`por-te`).
      coupes.push(groupeIndissociable ? debutConsonnes : debutConsonnes + 1);
      continue;
    }
    // Trois consonnes ou plus : la syllabe suivante prend le groupe indissociable final
    // (`ar-bres`), ou la seule dernière consonne (`comp-ter`).
    coupes.push(groupeIndissociable ? finConsonnes - 2 : finConsonnes - 1);
  }

  return coupes
    .filter((position) => position > 0 && position < lettres.length)
    .sort((a, b) => a - b)
    .filter((position, rang, liste) => rang === 0 || position !== liste[rang - 1]);
}

/** Découpe une suite de lettres selon des positions de coupe. */
function trancher(texte: string, coupes: readonly number[]): readonly string[] {
  const morceaux: string[] = [];
  let precedent = 0;
  for (const coupe of coupes) {
    morceaux.push(texte.slice(precedent, coupe));
    precedent = coupe;
  }
  morceaux.push(texte.slice(precedent));
  return morceaux.filter((morceau) => morceau !== '');
}

/**
 * Cherche le mot dans le lexique d'exceptions.
 *
 * La clé est la forme en minuscules — `toLocaleLowerCase('fr-FR')` conserve la longueur
 * caractère pour caractère sur l'alphabet français, ce qui permet de reporter les longueurs du
 * lexique sur le mot ORIGINAL et de préserver sa casse. Une entrée dont la concaténation ne
 * rend pas sa clé est ignorée en silence — c'est une donnée fautive, et
 * `tests/unitaires/syllabation.test.ts` la refuse au lieu de la laisser dégrader une lecture.
 */
function coupesDuLexique(
  minuscule: string,
  exceptions: Readonly<Record<string, readonly string[]>> | undefined,
): readonly number[] | null {
  // `Object.hasOwn` et non `exceptions[mot] !== undefined` : sans cette garde, les mots
  // `constructor`, `toString` et `valueOf` remontent la chaîne de prototypes et rendent une
  // fonction au lieu d'un découpage. Mesuré : `fast-check` a produit la contre-épreuve
  // « constructor » au 95ᵉ tirage de `tests/unitaires/syllabation.test.ts`.
  if (exceptions === undefined || !Object.hasOwn(exceptions, minuscule)) {
    return null;
  }
  const entree = exceptions[minuscule];
  if (!Array.isArray(entree) || entree.length === 0) {
    return null;
  }
  if (entree.join('') !== minuscule) {
    return null;
  }
  const coupes: number[] = [];
  let position = 0;
  for (let rang = 0; rang + 1 < entree.length; rang += 1) {
    position += (entree[rang] as string).length;
    coupes.push(position);
  }
  return coupes;
}

/**
 * Découpe un mot en syllabes pour la coloration alternée.
 *
 * Les caractères qui ne sont pas des lettres — apostrophe, trait d'union — ne sont jamais
 * syllabés : ils se rattachent au segment qui les précède, et forcent une coupe après eux.
 * `aujourd’hui` rend donc `au`, `jourd’`, `hui` et non un segment orphelin.
 */
export function decouperSyllabes(
  mot: string,
  exceptions?: Readonly<Record<string, readonly string[]>>,
): readonly SegmentSyllabe[] {
  if (mot === '') {
    return [];
  }

  const morceaux: { readonly texte: string; readonly certain: boolean }[] = [];
  let index = 0;

  while (index < mot.length) {
    const caractere = mot[index] as string;

    if (!estLettre(caractere)) {
      // Signe de ponctuation interne : il s'accroche au segment précédent, et la syllabe
      // suivante repart après lui. Aucun segment ne peut être fait de ce seul signe s'il
      // existe déjà un segment devant.
      const dernier = morceaux[morceaux.length - 1];
      if (dernier === undefined) {
        morceaux.push({ texte: caractere, certain: false });
      } else {
        morceaux[morceaux.length - 1] = {
          texte: dernier.texte + caractere,
          certain: dernier.certain,
        };
      }
      index += 1;
      continue;
    }

    const debut = index;
    while (index < mot.length && estLettre(mot[index] as string)) {
      index += 1;
    }
    const suite = mot.slice(debut, index);
    const minuscule = suite.toLocaleLowerCase('fr-FR');
    // Garde de longueur : la mise en minuscules doit rester caractère pour caractère, sans
    // quoi les positions calculées sur `minuscule` ne s'appliqueraient plus au mot original.
    // Elle l'est sur l'alphabet français ; si elle ne l'était pas, on ne coupe pas du tout —
    // un mot d'un seul tenant est moins bon qu'un découpage, une lettre perdue est un défaut.
    const alignee = suite.length === minuscule.length;
    const duLexique = alignee ? coupesDuLexique(minuscule, exceptions) : null;
    const coupes = duLexique ?? (alignee ? coupesDeLaRegle(minuscule) : []);
    const certain = duLexique !== null;

    for (const morceau of trancher(suite, coupes)) {
      morceaux.push({ texte: morceau, certain });
    }
  }

  return morceaux.map((morceau, rang) => ({
    texte: morceau.texte,
    rang,
    certain: morceau.certain,
  }));
}
