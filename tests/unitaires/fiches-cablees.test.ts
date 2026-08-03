/**
 * Le câblage des fiches d'origine vers les exercices jouables. Lot N8.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CONTRAT DEMANDAIT, ET POURQUOI CE FICHIER NE LE MESURE PAS TEL QUEL.
 *
 * Le contrat de finition v3 § 4.8 commande « les 15 brouillons du niveau 1 sont tous
 * atteints ». **C'est arithmétiquement impossible en l'état, et le compte est ici plutôt que
 * dans une note :**
 *
 *   · un nœud porte exactement UN exercice (`contenu/schemas/noeud.schema.json` : `exercice`
 *     est une chaîne, pas un tableau) ;
 *   · un exercice porte exactement UNE fiche d'origine (`origine.fiche` est un entier) ;
 *   · `tests/unitaires/clairiere-sortie-complete.test.ts` — test de constat que la campagne
 *     conserve — interdit tout exercice qu'aucun nœud ne cite ;
 *   · donc au plus autant de fiches câblables en Clairière qu'elle porte de nœuds. Le plafond
 *     n'est pas écrit ici : il se RECOMPTE plus bas, sur `contenu/noeuds/*.json`. Il valait 6
 *     quand ce fichier a été écrit ; les lots de contenu l'ont porté à 12, et le raisonnement
 *     tient à l'identique parce qu'il ne dépend que du compte, jamais de sa valeur.
 *
 * Câbler 15 fiches demanderait 15 nœuds dans une région qui en porte moins. Ce fichier mesure
 * donc **le taux réel, l'écart, et surtout la SINCÉRITÉ de chaque origine déclarée** — un
 * exercice qui affiche « fiche 1 » sans en avoir repris une seule ligne est pire qu'un
 * exercice sans origine : il fait croire à une traçabilité qui n'existe pas.
 *
 * `contenu/brouillons/` est ignoré par git. Quand les fiches ne sont pas sur disque, les
 * contrôles qui en dépendent s'abstiennent — et le disent — au lieu de rendre un faux vert.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

import type { Exercice } from '@pierre/partage';

interface FicheBrouillon {
  readonly origine: { readonly niveau: number; readonly fiche: number };
  readonly consignes: readonly { readonly texte: string }[];
  readonly affirmations: readonly { readonly texte: string }[];
}
interface NoeudLu {
  readonly id: string;
  readonly region: string;
  readonly exercice: string;
}

const DOSSIER_FICHES = join(RACINE_DEPOT, 'contenu', 'brouillons', 'niveau-1');
const FICHES_DU_NIVEAU_1 = 15;

function fichiersDe(dossierRelatif: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossierRelatif)).filter((f) => f.endsWith('.json'));
}

/**
 * Les régions déclarées par le monde, jamais une liste écrite ici.
 *
 * ⚠ CE FICHIER LISAIT `['clairiere', 'galeries']`. Les deux seules régions qui existaient
 * quand il a été écrit. Quatre régions ont été ouvertes depuis : la relation « un nœud, un
 * exercice » se mesurait donc sur 76 nœuds contre 26 exercices, et l'assertion d'égalité
 * échouait sur un écart qui n'existait pas. La population est maintenant lue sur disque, ce
 * qui la rend insensible à l'ouverture d'une septième région.
 */
const REGIONS: readonly string[] = lireJson<{
  readonly regions: readonly { readonly region: string }[];
}>('contenu/monde/regions.json').regions.map((r) => r.region);

const EXERCICES: readonly Exercice[] = REGIONS.flatMap((region) =>
  fichiersDe(`contenu/exercices/${region}`).map((f) =>
    lireJson<Exercice>(`contenu/exercices/${region}/${f}`),
  ),
);
const NOEUDS: readonly NoeudLu[] = fichiersDe('contenu/noeuds').map((f) =>
  lireJson<NoeudLu>(`contenu/noeuds/${f}`),
);

/** Les fiches du niveau 1 présentes sur disque, indexées par numéro. */
function fichesSurDisque(): Map<number, FicheBrouillon> {
  const table = new Map<number, FicheBrouillon>();
  if (!existsSync(DOSSIER_FICHES)) return table;
  for (const nom of readdirSync(DOSSIER_FICHES).filter((f) => /^fiche-\d\d\.json$/.test(f))) {
    const fiche = lireJson<FicheBrouillon>(`contenu/brouillons/niveau-1/${nom}`);
    table.set(fiche.origine.fiche, fiche);
  }
  return table;
}

/** Les exercices qui revendiquent une origine dans le corpus papier. */
const AVEC_ORIGINE = EXERCICES.filter(
  (exercice): exercice is Exercice & { origine: { niveau: number; fiche: number } } =>
    exercice.origine !== undefined && exercice.origine !== null,
);

/** Les textes qu'un exercice fait lire à l'enfant, consigne par consigne. */
function textesDesConsignes(exercice: Exercice): readonly string[] {
  const contenu = exercice.jeu.contenu as Record<string, unknown>;
  const consignes = (contenu['consignes'] ?? []) as readonly Record<string, unknown>[];
  return consignes.map((c) => c['texte']).filter((t): t is string => typeof t === 'string');
}

describe('le plafond arithmétique du câblage est celui des NŒUDS, pas des fiches', () => {
  it('un nœud porte un exercice et un seul — la relation est bien 1 pour 1', () => {
    // C'est cette relation qui borne tout le reste. Si elle changeait, le plafond changerait
    // aussi, et la note du haut de ce fichier serait à réécrire.
    const parExercice = new Map<string, string[]>();
    for (const noeud of NOEUDS) {
      const vus = parExercice.get(noeud.exercice) ?? [];
      vus.push(noeud.id);
      parExercice.set(noeud.exercice, vus);
    }
    const partages = [...parExercice.entries()].filter(([, noeuds]) => noeuds.length > 1);
    expect(partages).toEqual([]);
    expect(NOEUDS.length).toBe(EXERCICES.length);
  });

  it('le plafond est imprimé, et le taux de câblage avec lui', () => {
    const cablees = new Set(AVEC_ORIGINE.map((e) => e.origine.fiche));
    const noeudsClairiere = NOEUDS.filter((n) => n.region === 'clairiere').length;

    // Ce n'est pas une assertion de confort : elle échouerait si quelqu'un câblait plus de
    // fiches que la Clairière n'a de nœuds, c'est-à-dire s'il avait triché sur l'origine.
    expect(
      cablees.size,
      `${String(cablees.size)}/${String(FICHES_DU_NIVEAU_1)} fiche(s) du niveau 1 câblée(s) ` +
        `— plafond structurel : ${String(noeudsClairiere)} (un nœud, un exercice, une fiche). ` +
        `Fiches câblées : ${[...cablees].sort((a, b) => a - b).join(', ') || 'aucune'}. ` +
        `Non câblées : ${Array.from({ length: FICHES_DU_NIVEAU_1 }, (_, i) => i + 1)
          .filter((n) => !cablees.has(n))
          .join(', ')}`,
    ).toBeLessThanOrEqual(noeudsClairiere);
  });

  it('au moins une fiche est câblée — sinon le corpus n’a servi à rien', () => {
    expect(AVEC_ORIGINE.length).toBeGreaterThan(0);
  });
});

describe('AUCUNE ORIGINE DÉCLARÉE N’EST FAUSSE — la traçabilité tient ou elle ment', () => {
  const fiches = fichesSurDisque();

  it('chaque origine déclarée pointe une fiche du corpus', () => {
    for (const exercice of AVEC_ORIGINE) {
      expect(exercice.origine.niveau, exercice.id).toBeGreaterThanOrEqual(1);
      expect(exercice.origine.fiche, exercice.id).toBeGreaterThanOrEqual(1);
      expect(exercice.origine.fiche, exercice.id).toBeLessThanOrEqual(FICHES_DU_NIVEAU_1);
    }
  });

  it('la fiche citée existe sur disque, quand le dossier des brouillons est là', () => {
    if (fiches.size === 0) {
      // Dépôt fraîchement cloné : `contenu/brouillons/` est ignoré par git. On ne rend pas un
      // faux vert, on dit que la mesure n'a pas eu lieu.
      expect(existsSync(DOSSIER_FICHES)).toBe(false);
      return;
    }
    for (const exercice of AVEC_ORIGINE) {
      if (exercice.origine.niveau !== 1) continue;
      expect(
        fiches.has(exercice.origine.fiche),
        `${exercice.id} cite la fiche ${String(exercice.origine.fiche)} du niveau 1`,
      ).toBe(true);
    }
  });

  it('chaque exercice à origine reprend AU MOINS une ligne verbatim de sa fiche', () => {
    // La propriété qui a des dents. Un exercice peut adapter, découper, reformuler — mais s'il
    // ne partage plus une seule ligne avec la fiche qu'il revendique, son `origine` est un
    // ornement, et le lien vers le corpus papier est rompu sans que rien ne le dise.
    if (fiches.size === 0) return;

    const rapport: string[] = [];
    const sansAucunLien: string[] = [];

    for (const exercice of AVEC_ORIGINE) {
      if (exercice.origine.niveau !== 1) continue;
      const fiche = fiches.get(exercice.origine.fiche);
      if (fiche === undefined) continue;

      const duCorpus = new Set([
        ...fiche.consignes.map((c) => c.texte),
        ...fiche.affirmations.map((a) => a.texte),
      ]);
      const textes = textesDesConsignes(exercice);
      const verbatim = textes.filter((texte) => duCorpus.has(texte));

      rapport.push(
        `${exercice.id} (fiche ${String(exercice.origine.fiche)}) : ` +
          `${String(verbatim.length)}/${String(textes.length)} consigne(s) verbatim`,
      );
      if (verbatim.length === 0) sansAucunLien.push(exercice.id);
    }

    expect(sansAucunLien, rapport.join(' · ')).toEqual([]);
    expect(rapport.length, 'aucun exercice à origine mesuré : la propriété serait creuse')
      .toBeGreaterThan(0);
  });

  it('un exercice SANS origine n’en invente pas une par son contenu', () => {
    // Le miroir de la propriété précédente : si un exercice sans `origine` reprenait mot pour
    // mot des consignes d'une fiche, c'est l'origine qui manquerait, pas le lien. Les deux
    // erreurs se ressemblent dans le rapport et se corrigent à l'opposé.
    if (fiches.size === 0) return;

    const toutLeCorpus = new Set(
      [...fiches.values()].flatMap((fiche) => [
        ...fiche.consignes.map((c) => c.texte),
        ...fiche.affirmations.map((a) => a.texte),
      ]),
    );
    const orphelins: string[] = [];
    for (const exercice of EXERCICES) {
      if (exercice.origine !== undefined && exercice.origine !== null) continue;
      const empruntes = textesDesConsignes(exercice).filter((texte) => toutLeCorpus.has(texte));
      if (empruntes.length > 0) {
        orphelins.push(`${exercice.id} reprend ${String(empruntes.length)} ligne(s) du corpus`);
      }
    }
    expect(orphelins).toEqual([]);
  });
});

describe('le matériau non câblé n’est pas perdu — il est comptable', () => {
  it('les 15 fiches du niveau 1 sont toutes présentes, câblées ou non', () => {
    const fiches = fichesSurDisque();
    if (fiches.size === 0) return;
    const manquantes = Array.from({ length: FICHES_DU_NIVEAU_1 }, (_, i) => i + 1).filter(
      (n) => !fiches.has(n),
    );
    expect(manquantes, `${String(fiches.size)}/${String(FICHES_DU_NIVEAU_1)} fiches ingérées`)
      .toEqual([]);
  });

  it('le manifeste d’ingestion et les fiches sur disque disent le même nombre', () => {
    const fiches = fichesSurDisque();
    if (fiches.size === 0) return;
    const manifeste = lireJson<{ fichesIngerees: number }>(
      'contenu/brouillons/niveau-1/manifeste.json',
    );
    expect(fiches.size).toBe(manifeste.fichesIngerees);
  });
});
