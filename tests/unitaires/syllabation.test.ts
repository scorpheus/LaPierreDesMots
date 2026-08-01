/**
 * Découpage syllabique — lot L2-B, annexe T § T1.
 *
 * Trois niveaux d'exigence, du plus faible au plus fort :
 *
 *   1. une TABLE de mots, où le découpage attendu est écrit à la main — elle décrit ce que la
 *      règle doit faire, et échoue si quelqu'un « améliore » la règle sans le vouloir ;
 *   2. l'INVARIANT de concaténation sur tout le lexique du contenu réel — c'est le chiffre du
 *      contrat de sortie de ce lot (§ 10.4 : « une seule contre-épreuve » fait échouer) ;
 *   3. la même propriété sur des chaînes ENGENDRÉES par fast-check, y compris des chaînes qui
 *      ne sont pas des mots français : une lettre perdue est un défaut quelle que soit l'entrée.
 *
 * Le lexique d'exceptions est lu SUR DISQUE, jamais recopié ici : c'est lui la source qui fait
 * foi, et un test qui en garderait une copie ne verrait jamais une entrée fautive ajoutée.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { decouperSyllabes } from '@pierre/partage/lecture';
import type { SegmentSyllabe } from '@pierre/partage/lecture';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

const CHEMIN_EXCEPTIONS = 'contenu/referentiel/syllabation-exceptions.json';

interface FichierExceptions {
  readonly version: number;
  readonly familles: readonly {
    readonly motif: string;
    readonly explication: string;
    readonly decoupages: Readonly<Record<string, readonly string[]>>;
  }[];
}

/** Aplatit les familles du lexique en la table que `decouperSyllabes` attend. */
function chargerExceptions(): Readonly<Record<string, readonly string[]>> {
  const fichier = lireJson<FichierExceptions>(CHEMIN_EXCEPTIONS);
  const table: Record<string, readonly string[]> = {};
  for (const famille of fichier.familles) {
    for (const [mot, syllabes] of Object.entries(famille.decoupages)) {
      table[mot] = syllabes;
    }
  }
  return table;
}

const EXCEPTIONS = chargerExceptions();

function joindre(segments: readonly SegmentSyllabe[]): string {
  return segments.map((segment) => segment.texte).join('');
}

function decoupe(mot: string): string {
  return decouperSyllabes(mot, EXCEPTIONS)
    .map((segment) => segment.texte)
    .join('-');
}

// ─────────────────────────────────────────── 1. la table, écrite à la main

/**
 * Chaque ligne a été VÉRIFIÉE contre le découpage syllabique graphique enseigné au CP —
 * celui qui compte le `e` muet final (`por-te`, `é-co-le`, `ta-ble`). C'est bien celui-là
 * qu'il faut : l'enfant sort du CP et déchiffre encore (D18).
 */
const TABLE: readonly (readonly [string, string])[] = [
  // une seule syllabe : aucune coupe possible
  ['le', 'le'],
  ['bleu', 'bleu'],
  ['eau', 'eau'],
  ['pluie', 'pluie'],
  ['nuit', 'nuit'],
  ['chien', 'chien'],
  ['short', 'short'],
  // V-CV : la consonne seule ouvre la syllabe suivante
  ['école', 'é-co-le'],
  ['banane', 'ba-na-ne'],
  ['papa', 'pa-pa'],
  // VC-CV : deux consonnes séparables
  ['porte', 'por-te'],
  ['maîtresse', 'maî-tres-se'],
  ['casquette', 'cas-quet-te'],
  ['toboggan', 'to-bog-gan'],
  // V-CCV : groupe indissociable, il part entier
  ['table', 'ta-ble'],
  ['cartable', 'car-ta-ble'],
  ['fenêtre', 'fe-nê-tre'],
  // digrammes consonantiques
  ['gauche', 'gau-che'],
  ['montagnes', 'mon-ta-gnes'],
  ['bibliothèque', 'bi-blio-thè-que'],
  // trois consonnes
  ['arbres', 'ar-bres'],
  ['extérieur', 'ex-té-rieur'],
  // `y` intervocalique : il vaut i + i
  ['rayures', 'ra-yu-res'],
  ['crayon', 'cra-yon'],
  // tréma : le hiatus est marqué, la coupe le suit
  ['maïs', 'ma-ïs'],
  ['noël', 'no-ël'],
  // le lexique d'exceptions gagne sur la règle
  ['feuilles', 'feuilles'],
  ['fille', 'fille'],
  ['bouteille', 'bou-teille'],
  ['lion', 'li-on'],
  ['bouée', 'bou-ée'],
  ['météo', 'mé-té-o'],
  // ce que le lexique ne doit PAS avoir avalé : ici « ille » se lit [il]
  ['ville', 'vil-le'],
];

describe('decouperSyllabes — la table', () => {
  for (const [mot, attendu] of TABLE) {
    it(`découpe « ${mot} » en ${attendu}`, () => {
      expect(decoupe(mot)).toBe(attendu);
    });
  }
});

// ─────────────────────────────────────────── 2. l'invariant sur le contenu réel

/** Tous les fichiers JSON de `contenu/`, hors brouillons (ignorés par git, absents d'un clone). */
function fichiersDeContenu(): readonly string[] {
  const trouves: string[] = [];
  const parcourir = (relatif: string): void => {
    const absolu = join(RACINE_DEPOT, relatif);
    for (const entree of readdirSync(absolu)) {
      if (entree === 'brouillons') {
        continue;
      }
      const suivant = `${relatif}/${entree}`;
      if (statSync(join(RACINE_DEPOT, suivant)).isDirectory()) {
        parcourir(suivant);
      } else if (entree.endsWith('.json')) {
        trouves.push(suivant);
      }
    }
  };
  parcourir('contenu');
  return trouves;
}

/** Les mots de toutes les chaînes d'un JSON — apostrophes et traits d'union coupés. */
function motsDe(valeur: unknown, recueil: Set<string>): void {
  if (typeof valeur === 'string') {
    for (const brut of valeur.split(/[^\p{L}'’-]+/u)) {
      for (const mot of brut.split(/['’-]/u)) {
        if (mot !== '') {
          recueil.add(mot);
        }
      }
    }
  } else if (Array.isArray(valeur)) {
    for (const element of valeur as readonly unknown[]) {
      motsDe(element, recueil);
    }
  } else if (valeur !== null && typeof valeur === 'object') {
    for (const element of Object.values(valeur)) {
      motsDe(element, recueil);
    }
  }
}

function lexiqueDuContenu(): readonly string[] {
  const recueil = new Set<string>();
  for (const fichier of fichiersDeContenu()) {
    motsDe(lireJson(fichier), recueil);
  }
  for (const mot of Object.keys(EXCEPTIONS)) {
    recueil.add(mot);
  }
  for (const [, attendu] of TABLE) {
    recueil.add(attendu.split('-').join(''));
  }
  return [...recueil].sort();
}

describe('decouperSyllabes — l’invariant de concaténation', () => {
  it('rend exactement le mot, sur tout le lexique du contenu — CHIFFRE DE SORTIE DU LOT', () => {
    const lexique = lexiqueDuContenu();
    // Garde-fou : si l'extraction cessait de trouver quoi que ce soit, l'assertion suivante
    // passerait sur zéro mot et ne mesurerait plus rien. C'est le mode d'échec silencieux
    // qu'un « contrat de sortie » doit rendre impossible (C4).
    expect(lexique.length).toBeGreaterThan(100);

    const contreEpreuves = lexique.filter(
      (mot) => joindre(decouperSyllabes(mot, EXCEPTIONS)) !== mot,
    );
    expect(contreEpreuves).toEqual([]);

    console.log(
      `[L2-B] invariant de syllabation vérifié sur ${String(lexique.length)} mots du contenu, ` +
        `${String(contreEpreuves.length)} contre-épreuve(s).`,
    );
  });

  it('n’altère jamais la casse ni les accents du mot d’origine', () => {
    expect(joindre(decouperSyllabes('École', EXCEPTIONS))).toBe('École');
    expect(joindre(decouperSyllabes('MAÎTRESSE', EXCEPTIONS))).toBe('MAÎTRESSE');
  });

  it('rattache l’apostrophe au segment qui la précède, sans segment orphelin', () => {
    const segments = decouperSyllabes('aujourd’hui', EXCEPTIONS);
    expect(joindre(segments)).toBe('aujourd’hui');
    expect(segments.every((segment) => /\p{L}/u.test(segment.texte))).toBe(true);
  });

  it('rend un tableau vide sur la chaîne vide', () => {
    expect(decouperSyllabes('', EXCEPTIONS)).toEqual([]);
  });
});

// ─────────────────────────────────────────── 3. la propriété, sur des entrées engendrées

describe('decouperSyllabes — propriétés', () => {
  it('la concaténation rend le mot, pour toute chaîne', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 40 }), (chaine) => {
        return joindre(decouperSyllabes(chaine, EXCEPTIONS)) === chaine;
      }),
      { numRuns: 500 },
    );
  });

  it('la concaténation rend le mot, pour toute suite de lettres françaises', () => {
    const lettre = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzéèêàâîïôùûçœ'.split(''));
    fc.assert(
      fc.property(fc.array(lettre, { minLength: 1, maxLength: 24 }), (lettres) => {
        const mot = lettres.join('');
        return joindre(decouperSyllabes(mot, EXCEPTIONS)) === mot;
      }),
      { numRuns: 1000 },
    );
  });

  it('les rangs sont 0, 1, 2… sans trou ni doublon', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (chaine) => {
        const segments = decouperSyllabes(chaine, EXCEPTIONS);
        return segments.every((segment, rang) => segment.rang === rang);
      }),
      { numRuns: 300 },
    );
  });

  it('aucun segment n’est vide', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (chaine) => {
        return decouperSyllabes(chaine, EXCEPTIONS).every((segment) => segment.texte !== '');
      }),
      { numRuns: 300 },
    );
  });
});

// ─────────────────────────────────────────── 4. le champ `certain`, et le lexique lui-même

describe('le lexique d’exceptions', () => {
  it('est cohérent : chaque entrée se recolle sur sa propre clé', () => {
    const fautives = Object.entries(EXCEPTIONS).filter(
      ([mot, syllabes]) => syllabes.join('') !== mot,
    );
    expect(fautives).toEqual([]);
  });

  it('n’a aucune entrée à zéro syllabe', () => {
    const vides = Object.entries(EXCEPTIONS).filter(([, syllabes]) => syllabes.length === 0);
    expect(vides).toEqual([]);
  });

  it('a des clés en minuscules — la recherche s’y fait par la forme minuscule', () => {
    const majuscules = Object.keys(EXCEPTIONS).filter(
      (mot) => mot !== mot.toLocaleLowerCase('fr-FR'),
    );
    expect(majuscules).toEqual([]);
  });

  it('marque `certain: true` un mot du lexique, `false` un mot découpé par la règle', () => {
    const duLexique = decouperSyllabes('feuilles', EXCEPTIONS);
    expect(duLexique.every((segment) => segment.certain)).toBe(true);

    const deLaRegle = decouperSyllabes('banane', EXCEPTIONS);
    expect(deLaRegle.every((segment) => !segment.certain)).toBe(true);
  });

  it('ignore une entrée fautive au lieu de perdre une lettre', () => {
    // Une donnée corrompue ne doit pas abîmer une lecture : on retombe sur la règle.
    const segments = decouperSyllabes('banane', { banane: ['ba', 'nan'] });
    expect(joindre(segments)).toBe('banane');
    expect(segments.every((segment) => !segment.certain)).toBe(true);
  });
});
