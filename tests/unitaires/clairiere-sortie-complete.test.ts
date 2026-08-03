/**
 * REPRODUCTION DU DÉFAUT n° 4 — « dans la clairière je n'ai eu qu'un exercice, est-ce normal ? »
 *
 * Non. La v2 § 5.2 décrit la boucle moyenne, et la ligne 143 du document de référence est
 * citée telle quelle :
 *
 *   « Campement → choix de région et de compagnon → **4 à 6 nœuds enchaînés** → nœud final un
 *     peu plus corsé → butin → retour au campement, qui s'enrichit. »
 *
 * SOURCES QUI FONT FOI, lues sur disque, jamais recalculées :
 *   • `contenu/noeuds/*.json`            — les nœuds réellement livrés ;
 *   • `contenu/monde/regions.json`       — la liste `noeuds` de chaque région, celle qui fait
 *                                          le pourcentage de recoloration ;
 *   • `contenu/exercices/<region>/*.json` — les exercices écrits.
 *
 * Ce fichier ne corrige rien. Il compte, et il échoue tant que les comptes ne sont pas ceux
 * de la spécification. Les deux comptes sont exigés ENSEMBLE — nombre d'exercices ÉCRITS et
 * nombre d'exercices ATTEIGNABLES —, parce que c'est leur écart qui est le défaut : trois
 * exercices de la Clairière existent, sont validés par le schéma, et ne sont référencés par
 * aucun nœud. L'enfant ne les verra jamais.
 *
 * ⚠ DEPUIS LE LOT D'INTÉGRATION, IL PORTE SUR LES SIX RÉGIONS. Le nom du fichier garde la
 * Clairière parce que c'est là que le père a vu le défaut ; la mesure, elle, boucle sur les
 * régions que `contenu/monde/regions.json` déclare, sans en nommer une seule en dur. Quatre
 * régions ont été ouvertes après l'écriture de ce fichier et n'étaient auditées par personne.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

interface NoeudLu {
  readonly id: string;
  readonly region: string;
  readonly ordre: number;
  readonly exercice: string;
  readonly prerequis: readonly string[];
}
interface RegionLue {
  readonly region: string;
  readonly ordre: number;
  readonly libelle: string;
  readonly noeuds: readonly string[];
}

/**
 * v2 § 5.2, ligne 143 : « 4 à 6 nœuds enchaînés ». **C'est la longueur d'une SORTIE, pas
 * celle d'une région.**
 *
 * Les bornes ne sont pas des littéraux : elles viennent de
 * `contenu/referentiel/parametres-pedagogie.json`, `selecteur.nbNoeudsMin` / `nbNoeudsMax` —
 * les mêmes valeurs que `composerSortie` applique réellement (convention C2, et c'est déjà la
 * règle qu'applique `tests/e2e/parcours-sortie-6-noeuds.spec.ts`).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QUE CE FICHIER AFFIRMAIT, ET POURQUOI C'ÉTAIT VRAI PAR ACCIDENT.
 *
 * Il exigeait `4 ≤ nœuds de la Clairière ≤ 6`. Tant que la Clairière portait exactement une
 * sortie, région et sortie se confondaient et le plafond tenait. Les lots de contenu ont porté
 * les six régions à 12 ou 14 nœuds : **une région est désormais plusieurs sorties**, et c'est
 * `composerSortie` qui découpe — il tire `n` dans `[nbNoeudsMin, nbNoeudsMax]` puis n'en sert
 * que `n`. Garder le plafond ici reviendrait à interdire la deuxième sortie d'une région.
 *
 * Le plafond n'est donc pas ABANDONNÉ, il est rendu à l'objet qui le porte :
 *   · la longueur d'une sortie réelle — `tests/e2e/parcours-sortie-6-noeuds.spec.ts`, qui la
 *     mesure sur le jeu servi, bornes lues dans le même fichier de paramètres ;
 *   · la composition — `tests/api/sortie.test.ts`, sur `composerSortie` lui-même.
 *
 * Et ce qu'on exige ICI devient plus fort, pas plus faible : une région doit porter **au moins
 * une sortie PLEINE**, donc `nbNoeudsMax` nœuds et non `nbNoeudsMin`. Une région de quatre
 * nœuds passait l'ancienne assertion et ne pouvait jamais servir la sortie de six que le
 * sélecteur est en droit de tirer.
 */
const CONTRAINTES = lireJson<{
  readonly selecteur: { readonly nbNoeudsMin: number; readonly nbNoeudsMax: number };
}>('contenu/referentiel/parametres-pedagogie.json').selecteur;
const NOEUDS_MIN_PAR_SORTIE = CONTRAINTES.nbNoeudsMin;
const NOEUDS_MAX_PAR_SORTIE = CONTRAINTES.nbNoeudsMax;

function fichiersDe(dossierRelatif: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossierRelatif)).filter((f) => f.endsWith('.json'));
}

const noeuds: readonly NoeudLu[] = fichiersDe('contenu/noeuds').map((f) =>
  lireJson<NoeudLu>(`contenu/noeuds/${f}`),
);

const monde = lireJson<{ regions: readonly RegionLue[] }>('contenu/monde/regions.json');

/** Les six régions déclarées, dans l'ordre de la progression. Aucune n'est nommée en dur. */
const REGIONS: readonly string[] = monde.regions.map((r) => r.region);

/** Les identifiants d'exercice écrits sur disque, région par région. */
function exercicesEcrits(region: string): readonly string[] {
  return fichiersDe(`contenu/exercices/${region}`).map(
    (f) => lireJson<{ id: string }>(`contenu/exercices/${region}/${f}`).id,
  );
}

/** Habillage de chaque exercice écrit, indexé par identifiant d'exercice. */
const habillageDeLExercice = new Map<string, string>(
  REGIONS.flatMap((region) =>
    fichiersDe(`contenu/exercices/${region}`).map((f) => {
      const exercice = lireJson<{ id: string; jeu: { habillage: string } }>(
        `contenu/exercices/${region}/${f}`,
      );
      return [exercice.id, exercice.jeu.habillage] as const;
    }),
  ),
);

describe('chaque région enchaîne une SORTIE, pas un exercice isolé (v2 § 5.2)', () => {
  for (const region of REGIONS) {
    const noeudsDeLaRegion = noeuds.filter((n) => n.region === region);
    const declaree = monde.regions.find((r) => r.region === region)!;

    it(`${region} — porte de quoi servir une sortie PLEINE`, () => {
      expect(
        noeudsDeLaRegion.length,
        `${region} : ${String(noeudsDeLaRegion.length)} nœud(s) livré(s)`,
      ).toBeGreaterThanOrEqual(NOEUDS_MAX_PAR_SORTIE);
    });

    it(`${region} — assez d'habillages DISTINCTS pour une sortie pleine (R13)`, () => {
      // `composerSortie` déduplique le vivier par habillage quand `habillageUniqueParSortie`
      // est vrai : le nombre de nœuds ne borne donc PAS la longueur d'une sortie, le nombre
      // d'habillages distincts le fait. Une région de douze nœuds sur cinq décors ne servira
      // jamais plus de cinq nœuds, et rien d'autre ne le dirait.
      const distincts = new Set(
        noeudsDeLaRegion.map((n) => habillageDeLExercice.get(n.exercice) ?? `?${n.exercice}`),
      );
      expect(
        distincts.size,
        `${region} : ${String(noeudsDeLaRegion.length)} nœud(s) pour ` +
          `${String(distincts.size)} habillage(s) distinct(s) — ${[...distincts].sort().join(', ')}`,
      ).toBeGreaterThanOrEqual(NOEUDS_MAX_PAR_SORTIE);
    });

    it(`${region} — \`regions.json\` déclare exactement les nœuds livrés`, () => {
      // C'est cette liste qui fait le pourcentage de recoloration : un écart rendrait la
      // région à jamais incomplète, ou complète trop tôt.
      expect([...declaree.noeuds].sort()).toEqual(noeudsDeLaRegion.map((n) => n.id).sort());
    });

    it(`${region} — les nœuds forment une CHAÎNE : chacun a le précédent en prérequis`, () => {
      const parOrdre = [...noeudsDeLaRegion].sort((a, b) => a.ordre - b.ordre);
      for (let i = 1; i < parOrdre.length; i += 1) {
        expect(
          parOrdre[i]!.prerequis,
          `${parOrdre[i]!.id} doit suivre ${parOrdre[i - 1]!.id}`,
        ).toContain(parOrdre[i - 1]!.id);
      }
      // Une chaîne d'un seul maillon n'est pas une chaîne.
      expect(parOrdre.length).toBeGreaterThanOrEqual(NOEUDS_MIN_PAR_SORTIE);
    });
  }
});

describe('aucun exercice écrit ne reste inatteignable', () => {
  // Le contrat de sortie exige LES DEUX COMPTES ET LEUR ÉCART : recenser les fichiers
  // d'exercice ne dit rien de ce que l'enfant peut atteindre. Un exercice qu'aucun nœud ne
  // cite est du travail livré, validé, et invisible.
  //
  // La boucle porte sur les SIX régions déclarées, jamais sur une liste écrite ici : les deux
  // premières étaient nommées en dur, et les quatre régions ouvertes depuis n'étaient donc
  // auditées par personne.
  for (const region of REGIONS) {
    it(`région ${region} — tout exercice écrit est référencé par un nœud`, () => {
      const ecrits = exercicesEcrits(region);
      const references = new Set(noeuds.filter((n) => n.region === region).map((n) => n.exercice));
      const orphelins = ecrits.filter((id) => !references.has(id));

      expect(
        orphelins,
        `${String(ecrits.length)} exercice(s) écrit(s), ${String(references.size)} référencé(s)`,
      ).toEqual([]);
      expect(ecrits.length, `${region} : aucun exercice écrit`).toBeGreaterThan(0);
    });
  }
});
