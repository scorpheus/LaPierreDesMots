/**
 * L'évolution de Gobi — D28, contrat des features v2 § 4.5. Lot L2-F.
 *
 * Gobi évolue comme un tamagotchi : chaque graphème maîtrisé devient une **forme**, et le
 * nombre de formes fait monter un **stade**. Deux règles gouvernent tout ce fichier :
 *
 * 1. **Le corps ne change jamais, le cristal porte les déclinaisons** (D20). Le stade est donc
 *    la SEULE chose que ce module calcule sur le corps ; la forme active, elle, ne décide que
 *    du cristal affiché.
 * 2. **L'évolution est irréversible, par construction et non par convention** (D28, R14).
 *
 * **Aucun seuil n'est écrit ici** (convention C2) : la table des stades est une donnée,
 * `contenu/monde/gobi-stades.json`, lue puis validée par `stadesDuDocument`. Un seuil en dur
 * rendrait `tests/unitaires/gobi-evolution.test.ts` aveugle au jour où l'on recalibrera.
 */

import { ErreurPierre } from '../erreurs.js';
import type { CheminAsset, Horodatage } from '../identifiants.js';
import type { CodeGrapheme, CodeStadeGobi, EtatGobi, FormeGobi, StadeGobi } from './types.js';

/** Une forme DÉCLARÉE au référentiel : le graphème et son cristal, sans date d'obtention. */
export interface FormeDeclaree {
  readonly grapheme: CodeGrapheme;
  readonly libelle: string;
  readonly cristal: CheminAsset;
}

/** Le contenu de `contenu/monde/gobi-stades.json`. */
export interface DocumentStadesGobi {
  readonly stades: readonly StadeGobi[];
  readonly formes: readonly FormeDeclaree[];
}

const CODES_STADE: readonly CodeStadeGobi[] = ['oeuf', 'boule', 'crete', 'equipe', 'gardien'];

function objet(valeur: unknown): Readonly<Record<string, unknown>> {
  if (typeof valeur !== 'object' || valeur === null) {
    throw new ErreurPierre('contenu-invalide', 'Le document des stades de Gobi n’est pas un objet.');
  }
  return valeur as Readonly<Record<string, unknown>>;
}

/**
 * Lit la table des stades du document et **refuse plutôt que d'émettre du faux** (C4).
 *
 * Trois invariants sont vérifiés ici, parce qu'aucun d'eux n'est rattrapable plus tard :
 * les codes appartiennent à `CodeStadeGobi`, les rangs sont `1..n` strictement croissants, et
 * les seuils en formes croissent avec le rang. Un document qui les enfreint ferait produire à
 * `stadeApresFormes` une monotonie fausse — c'est-à-dire une régression visible par l'enfant.
 */
export function stadesDuDocument(document: unknown): readonly StadeGobi[] {
  const brut = objet(document);
  const liste = brut['stades'];
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurPierre('contenu-invalide', 'Le document des stades ne déclare aucun stade.');
  }

  const stades: StadeGobi[] = liste.map((entree, index) => {
    const champs = objet(entree);
    const code = String(champs['code'] ?? '');
    if (!CODES_STADE.includes(code as CodeStadeGobi)) {
      throw new ErreurPierre('contenu-invalide', `Stade ${String(index)} : code inconnu « ${code} ».`);
    }
    return {
      code: code as CodeStadeGobi,
      rang: Number(champs['rang']),
      libelle: String(champs['libelle'] ?? code),
      formesRequises: Number(champs['formesRequises']),
      asset: String(champs['asset'] ?? '') as CheminAsset
    };
  });

  stades.forEach((stade, index) => {
    if (stade.rang !== index + 1) {
      throw new ErreurPierre(
        'contenu-invalide',
        `Stade « ${stade.code} » : rang ${String(stade.rang)} au lieu de ${String(index + 1)}. ` +
          'Les rangs font l’ordre de l’évolution ; un trou la rendrait incomparable.'
      );
    }
    if (index > 0 && stade.formesRequises <= stades[index - 1]!.formesRequises) {
      throw new ErreurPierre(
        'contenu-invalide',
        `Stade « ${stade.code} » : seuil ${String(stade.formesRequises)} non strictement ` +
          'supérieur à celui du stade précédent.'
      );
    }
  });

  return stades;
}

/** Lit les formes déclarées au référentiel. Vide si le document n'en déclare aucune. */
export function formesDuDocument(document: unknown): readonly FormeDeclaree[] {
  const liste = objet(document)['formes'];
  if (!Array.isArray(liste)) {
    return [];
  }
  return liste.map((entree) => {
    const champs = objet(entree);
    return {
      grapheme: String(champs['grapheme'] ?? ''),
      libelle: String(champs['libelle'] ?? ''),
      cristal: String(champs['cristal'] ?? '') as CheminAsset
    };
  });
}

/** Le rang du stade portant ce code, ou `0` quand la table ne le connaît pas. */
function rangDuCode(code: CodeStadeGobi, stades: readonly StadeGobi[]): number {
  return stades.find((stade) => stade.code === code)?.rang ?? 0;
}

/**
 * Le stade qui découle du nombre de formes obtenues.
 *
 * **IRRÉVERSIBLE, par construction et non par convention.** La fonction prend le MAXIMUM entre
 * le rang du stade courant et le rang déduit des formes : une régression est donc impossible à
 * exprimer, pas seulement interdite. C'est la traduction littérale de « un acquis n'est jamais
 * repris » (v2 § 5.4, R14) et de la troisième question ouverte de D28, tranchée dans le seul
 * sens compatible avec les specs.
 *
 * Propriété opposable, prouvée par 10 000 séquences de gains ET de pertes dans
 * `tests/unitaires/gobi-evolution.test.ts` : pour toute séquence d'appels, le rang rendu est
 * monotone croissant.
 */
export function stadeApresFormes(
  etat: EtatGobi,
  stades: readonly StadeGobi[],
): CodeStadeGobi {
  if (stades.length === 0) {
    // Aucune table : on ne sait rien de mieux que ce que l'état porte déjà. On ne DESCEND pas.
    return etat.stade;
  }

  const nbFormes = etat.formes.length;
  let rangDeduit = stades[0]!.rang;
  for (const stade of stades) {
    if (nbFormes >= stade.formesRequises) {
      rangDeduit = Math.max(rangDeduit, stade.rang);
    }
  }

  const rangFinal = Math.max(rangDuCode(etat.stade, stades), rangDeduit);
  const atteint = stades.find((stade) => stade.rang === rangFinal);
  return atteint === undefined ? etat.stade : atteint.code;
}

/** Le stade suivant et ce qui reste à faire pour l'atteindre — la jauge du VIDE (D25). */
export function prochainStade(
  etat: EtatGobi, stades: readonly StadeGobi[],
): { readonly stade: StadeGobi; readonly formesRestantes: number } | null {
  if (stades.length === 0) {
    return null;
  }
  const rangCourant = rangDuCode(stadeApresFormes(etat, stades), stades);
  const suivant = stades.find((stade) => stade.rang === rangCourant + 1);
  if (suivant === undefined) {
    return null;
  }
  return {
    stade: suivant,
    // Jamais négatif : la jauge montre un vide, pas une dette.
    formesRestantes: Math.max(0, suivant.formesRequises - etat.formes.length)
  };
}

/**
 * Ajoute une forme à la collection, sans jamais en retirer ni en doubler, et remonte le stade.
 *
 * C'est le seul chemin d'écriture de la collection côté logique pure : le dépôt serveur en est
 * la projection SQL (`formes_gobi`, `stade_gobi` écrits en `MAX`).
 */
export function ajouterForme(
  etat: EtatGobi,
  forme: FormeDeclaree,
  quand: Horodatage,
  stades: readonly StadeGobi[],
): EtatGobi {
  const deja = etat.formes.some((connue) => connue.grapheme === forme.grapheme);
  const formes: readonly FormeGobi[] = deja
    ? etat.formes
    : [...etat.formes, { ...forme, obtenueLe: quand }];
  const apres: EtatGobi = { ...etat, formes };
  return { ...apres, stade: stadeApresFormes(apres, stades) };
}

/** L'état de départ : l'œuf, aucune forme, la crête de base. */
export function gobiInitial(stades: readonly StadeGobi[]): EtatGobi {
  return { stade: stades[0]?.code ?? 'oeuf', formes: [], formeActive: null };
}
