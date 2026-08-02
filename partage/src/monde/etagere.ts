/**
 * L'étagère des formes de Gobi — D44. Lot N6, contrat de finition v3 § 5.11.
 *
 * « Comme un album de vignettes : les emplacements non gagnés sont EN CREUX et VISIBLES. »
 * D25, point 3 : ce qui motive, c'est de voir la case suivante encore vide.
 *
 * LA PROPRIÉTÉ QUI FAIT TOUT : `cases.length === nbTotal`, TOUJOURS. Une case non gagnée
 * n'est pas absente de la liste, elle y est avec `obtenue: false`. Un composant ne peut donc
 * pas « oublier » de rendre le vide — il n'a pas de liste où le vide serait absent.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM, aucun accès disque. Le
 * catalogue arrive en argument (`formesDuDocument(contenu/monde/gobi-stades.json)`), il n'est
 * jamais ouvert ici — même règle que le reste de `@pierre/partage/monde`.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * D'OÙ VIENT LE RANG — et pourquoi ce n'est PAS l'ordre d'obtention.
 *
 * Le contrat v3 § 7.2 justifie la table `etagere_rang` par « le rang dérive de l'ordre
 * d'obtention ». Appliqué à la lettre, cela rend les cases VIDES inexprimables : une case non
 * gagnée n'a pas d'ordre d'obtention, donc pas de rang, donc pas de place sur l'album — et
 * l'étagère redeviendrait la liste des acquis, c'est-à-dire exactement ce que D44 refuse.
 * Pire, chaque nouvelle forme insérée décalerait les suivantes, et « une case qui se déplace
 * fait perdre le repérage visuel qui est tout l'intérêt de l'album » (même paragraphe).
 *
 * Le rang est donc la POSITION AU CATALOGUE, figée par les données, identique d'un profil à
 * l'autre et d'un lancement à l'autre. C'est la seule lecture qui satisfasse en même temps
 * « cases vides visibles » et « une case ne se déplace jamais ». L'écart est signalé au
 * rapport de N6 et consigné dans `Docs/questions-en-attente.md`.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import type { CheminAsset, Horodatage } from '../identifiants.js';
import type { CodeGrapheme, FormeGobi } from './types.js';

export interface CaseEtagere {
  /** Position sur l'étagère, à partir de 1. Stable : une case ne se déplace jamais. */
  readonly rang: number;
  readonly grapheme: CodeGrapheme;
  readonly libelle: string;
  readonly cristal: CheminAsset;
  /** `false` ⇒ rendue EN CREUX, jamais masquée, jamais cadenassée. */
  readonly obtenue: boolean;
  readonly obtenueLe: Horodatage | null;
}

export interface Etagere {
  readonly cases: readonly CaseEtagere[];
  readonly nbObtenues: number;
  readonly nbTotal: number;
}

export interface CatalogueFormes {
  readonly formes: readonly {
    readonly grapheme: CodeGrapheme;
    readonly libelle: string;
    readonly cristal: CheminAsset;
  }[];
}

/**
 * Ordre déterministe des formes que le catalogue ne connaît pas : la plus ancienne d'abord,
 * puis le graphème pour départager. `Alea` n'a rien à faire ici, et deux lancements doivent
 * montrer le même album (annexe T § 2).
 */
function avantDansLeTemps(gauche: FormeGobi, droite: FormeGobi): number {
  if (gauche.obtenueLe !== droite.obtenueLe) {
    return gauche.obtenueLe < droite.obtenueLe ? -1 : 1;
  }
  if (gauche.grapheme === droite.grapheme) {
    return 0;
  }
  return gauche.grapheme < droite.grapheme ? -1 : 1;
}

/**
 * Construit l'étagère complète. `formes` sont celles que l'enfant a gagnées ; toutes les
 * autres apparaissent quand même, en creux.
 *
 * Deux décisions de comptage, et chacune existe pour empêcher une étagère creuse :
 *
 * 1. **Un graphème répété au catalogue ne fait qu'une case.** Deux cases pour la même chose
 *    gonfleraient `nbTotal` sans rien ajouter à l'album — et l'enfant chercherait longtemps
 *    la seconde. La première déclaration gagne ; les suivantes sont ignorées.
 * 2. **Une forme gagnée que le catalogue ne déclare pas est AJOUTÉE, jamais effacée.** C'est
 *    la traduction mécanique de « un acquis n'est jamais repris » (R14). Le cas se produit
 *    dès qu'un exercice accorde un graphème avant que le catalogue ne le porte — le contraire
 *    ferait disparaître une vignette sous les yeux de l'enfant, sans message, sans recours.
 */
export function construireEtagere(
  catalogue: CatalogueFormes,
  formes: readonly FormeGobi[],
): Etagere {
  /** Les formes gagnées, dédoublonnées : la première occurrence d'un graphème fait foi. */
  const gagnees = new Map<CodeGrapheme, FormeGobi>();
  for (const forme of formes) {
    if (!gagnees.has(forme.grapheme)) {
      gagnees.set(forme.grapheme, forme);
    }
  }

  const cases: CaseEtagere[] = [];
  const declarees = new Set<CodeGrapheme>();

  for (const declaree of catalogue.formes) {
    if (declarees.has(declaree.grapheme)) {
      continue;
    }
    declarees.add(declaree.grapheme);
    const gagnee = gagnees.get(declaree.grapheme) ?? null;
    cases.push({
      rang: cases.length + 1,
      grapheme: declaree.grapheme,
      libelle: declaree.libelle,
      cristal: declaree.cristal,
      obtenue: gagnee !== null,
      obtenueLe: gagnee?.obtenueLe ?? null
    });
  }

  const horsCatalogue = [...gagnees.values()]
    .filter((forme) => !declarees.has(forme.grapheme))
    .sort(avantDansLeTemps);

  for (const forme of horsCatalogue) {
    cases.push({
      rang: cases.length + 1,
      grapheme: forme.grapheme,
      libelle: forme.libelle,
      cristal: forme.cristal,
      obtenue: true,
      obtenueLe: forme.obtenueLe
    });
  }

  return {
    cases,
    // Compté sur les CASES, jamais sur la liste d'entrée : deux fois la même forme gagnée ne
    // fait qu'une case, et `nbObtenues` doit dire ce que l'enfant voit.
    nbObtenues: cases.filter((une) => une.obtenue).length,
    nbTotal: cases.length
  };
}
