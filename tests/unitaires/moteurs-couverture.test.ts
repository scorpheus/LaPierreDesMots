/**
 * R12 et R13, **mesurées sur le contenu réel du dépôt** — lot L2-E, sous-groupe E4.
 *
 * R12 (v2 § 15) : « Chaque compétence est travaillable par au moins 3 mini-jeux
 * mécaniquement distincts. »
 * R13 (v2 § 15) : « Une sortie complète ne rejoue jamais deux fois le même habillage. »
 *
 * Ce fichier ne fabrique AUCUNE donnée. Il ouvre `contenu/exercices/**`, `contenu/habillages/**`
 * et le registre de moteurs, et il compte. C'est le seul moyen d'éviter le défaut nommé par
 * CLAUDE.md — « un détecteur qui déclare un poids qu'il n'applique jamais » : une R12 vérifiée
 * sur des fixtures inventées serait exactement ce détecteur-là.
 *
 * ⚠ **Il manque, dans le contrat gelé, les exercices des onze moteurs de F5.** Le § 3.5 donne
 * à L2-E ses 66 fichiers de code et ses 66 fichiers d'habillage, et **aucun**
 * `contenu/exercices/**`. Or une compétence n'est « travaillable » par un moteur que si un
 * exercice les relie : R12 se mesure sur les exercices, jamais sur les habillages. Le cas
 * `R12` ci-dessous échoue donc tant que ces exercices n'existent pas, et il doit échouer —
 * l'assouplir masquerait précisément ce que la campagne a oublié de commander (§ 0 :
 * « un lot qui pense avoir besoin d'un fichier absent le signale au lieu de le créer »).
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { moteursEnregistres, obtenirMoteur } from '@pierre/partage';
import type { CodeMoteur, Exercice, Habillage } from '@pierre/partage';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

/** Les onze moteurs dont le contrat gelé § 3.5.2 provisionne les habillages. */
const MOTEURS_F5: readonly string[] = [
  'attrape',
  'tri',
  'assemble',
  'chemin',
  'eclair',
  'paires',
  'phrase',
  'histoire',
  'chrono',
  'grave',
  'libre',
];

/** v2 § 15, tableau des risques : « Séparation moteur/habillage, 3 habillages minimum ». */
const HABILLAGES_MINIMUM = 3;

function fichiers(dossier: string, suffixe: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossier), { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile() && entree.name.endsWith(suffixe))
    .map((entree) => join(entree.parentPath, entree.name));
}

function relatif(absolu: string): string {
  return absolu.slice(RACINE_DEPOT.length).split('\\').join('/');
}

const habillages: readonly Habillage[] = fichiers('contenu/habillages', '.habillage.json').map(
  (chemin) => lireJson<Habillage>(relatif(chemin)),
);

const exercices: readonly Exercice[] = fichiers('contenu/exercices', '.json').map((chemin) =>
  lireJson<Exercice>(relatif(chemin)),
);

/** Compétence → moteurs mécaniquement distincts qui la travaillent, d'après le contenu réel. */
function moteursParCompetence(): ReadonlyMap<string, ReadonlySet<string>> {
  const table = new Map<string, Set<string>>();
  for (const exercice of exercices) {
    for (const competence of exercice.competences) {
      const vus = table.get(competence) ?? new Set<string>();
      vus.add(exercice.jeu.moteur);
      table.set(competence, vus);
    }
  }
  return table;
}

/** Moteur → nombre d'habillages distincts qui le déclarent compatible. */
function habillagesParMoteur(): ReadonlyMap<string, number> {
  const table = new Map<string, number>();
  for (const habillage of habillages) {
    for (const moteur of habillage.moteurs) {
      table.set(moteur, (table.get(moteur) ?? 0) + 1);
    }
  }
  return table;
}

describe('couverture des moteurs', () => {
  it('le catalogue enregistre les quatorze moteurs, sans doublon', () => {
    const codes = moteursEnregistres();
    expect(new Set(codes).size).toBe(codes.length);
    for (const attendu of [...MOTEURS_F5, 'colorie', 'place', 'trace']) {
      expect(codes, `moteur absent du registre : ${attendu}`).toContain(attendu as CodeMoteur);
    }
  });

  it('chaque moteur enregistré publie un schéma de contenu non vide', () => {
    // Un moteur sans schéma laisserait passer n'importe quel `jeu.contenu` : `test:contenu`
    // signale ce cas, mais il ne le bloque pas. Ici, il bloque.
    for (const code of moteursEnregistres()) {
      const moteur = obtenirMoteur(code);
      expect(Object.keys(moteur.schemaContenu).length, `schéma vide : ${code}`).toBeGreaterThan(0);
    }
  });

  it('les cinq membres de `Moteur` sont des fonctions sur les quatorze', () => {
    // C'est le risque nommé au § 11 du contrat gelé : un membre déclaré en propriété-fonction
    // casse l'assignabilité de `MoteurQuelconque` et les deux registres ne compilent plus.
    // Le compilateur l'attrape ; ce cas l'attrape aussi à l'exécution, y compris sur un
    // paquet `dist/` construit avant la modification.
    for (const code of moteursEnregistres()) {
      const moteur = obtenirMoteur(code);
      for (const membre of ['creerEtat', 'reduire', 'progression', 'aideProposee', 'resume']) {
        expect(
          typeof (moteur as unknown as Record<string, unknown>)[membre],
          `${code}.${membre}`,
        ).toBe('function');
      }
    }
  });

  it('v2 § 7 — chacun des onze moteurs de F5 offre au moins 3 habillages distincts', () => {
    const table = habillagesParMoteur();
    const sous = MOTEURS_F5.filter((m) => (table.get(m) ?? 0) < HABILLAGES_MINIMUM);
    expect(
      sous,
      `moteurs sous ${HABILLAGES_MINIMUM} habillages : ${JSON.stringify(
        Object.fromEntries(MOTEURS_F5.map((m) => [m, table.get(m) ?? 0])),
      )}`,
    ).toEqual([]);
  });

  it('aucun habillage ne porte deux fois le même identifiant', () => {
    const identifiants = habillages.map((h) => h.id);
    expect(new Set(identifiants).size, JSON.stringify(identifiants)).toBe(identifiants.length);
  });

  it('R12 — chaque compétence du contenu réel est travaillée par ≥ 3 moteurs distincts', () => {
    const table = moteursParCompetence();
    const insuffisantes = [...table.entries()]
      .filter(([, moteurs]) => moteurs.size < 3)
      .map(([competence, moteurs]) => `${competence} → ${[...moteurs].sort().join(', ')}`);

    expect(
      insuffisantes,
      'R12 non tenue. Chiffre du lot L2-E (§ 10.4) : ' +
        `${[...table.values()].filter((m) => m.size >= 3).length}/${table.size} compétences ` +
        'couvertes par ≥ 3 moteurs. Cause mesurée : le § 3.5 du contrat gelé ne confie à ' +
        'AUCUN lot les `contenu/exercices/**` des onze moteurs de F5 — les habillages ' +
        'existent, les exercices qui les relient à une compétence, non.',
    ).toEqual([]);
  });
});
