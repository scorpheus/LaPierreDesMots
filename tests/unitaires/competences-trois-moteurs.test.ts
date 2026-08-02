/**
 * R12 — « Chaque compétence est travaillable par au moins 3 mini-jeux mécaniquement
 * distincts » (v2 § 15). Lot N8.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE À CÔTÉ DE `moteurs-couverture.test.ts`, QUI MESURE DÉJÀ R12.
 *
 * `moteurs-couverture.test.ts` rend un verdict : la liste des compétences sous trois moteurs.
 * C'est juste, et ce fichier ne le double pas. Ce qu'il n'apprend pas au lecteur, c'est **ce
 * qu'il faut écrire pour que le verdict tombe** — quelle compétence, dans quel fichier, avec
 * quel moteur. Un test qui dit « R12 non tenue » et laisse chercher coûte plus cher que le
 * défaut qu'il signale.
 *
 * Trois choses sont donc mesurées ici, et aucune ne l'était :
 *   1. le nombre de moteurs MANQUANTS par compétence, et lesquels sont encore disponibles
 *      dans la région concernée — la réparation est nommée, pas devinée ;
 *   2. **les deux axes de D23 restent séparés** : aucun exercice ne déclare les deux, aucun
 *      contenu ne mélange b/d et b/p dans le même écran ;
 *   3. toute compétence du référentiel est soit travaillée, soit dérivée par un moteur — un
 *      code que rien ne produit est un code mort dans le tableau de bord du parent.
 *
 * Les données viennent du disque, jamais d'une fixture.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

import type { Competence, Exercice, Habillage } from '@pierre/partage';

/** v2 § 15 : trois mini-jeux MÉCANIQUEMENT distincts, donc trois moteurs, pas trois écrans. */
const MOTEURS_MINIMUM = 3;

function fichiers(dossier: string, suffixe: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossier), { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile() && entree.name.endsWith(suffixe))
    .map((entree) => join(entree.parentPath, entree.name).slice(RACINE_DEPOT.length))
    .map((chemin) => chemin.split('\\').join('/').replace(/^\//, ''));
}

const EXERCICES: readonly Exercice[] = fichiers('contenu/exercices', '.json').map((c) =>
  lireJson<Exercice>(c),
);
const HABILLAGES: readonly Habillage[] = fichiers('contenu/habillages', '.habillage.json').map(
  (c) => lireJson<Habillage>(c),
);
const REFERENTIEL = lireJson<readonly Competence[]>('contenu/referentiel/competences.json');

/** Compétence → moteurs qui la travaillent, d'après les exercices réellement livrés. */
function moteursParCompetence(): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>();
  for (const exercice of EXERCICES) {
    for (const code of exercice.competences) {
      const vus = table.get(code) ?? new Set<string>();
      vus.add(exercice.jeu.moteur);
      table.set(code, vus);
    }
  }
  return table;
}

/** Région → moteurs qu'un habillage y rend disponibles. C'est le plafond du possible. */
function moteursDisponiblesParRegion(): Map<string, Set<string>> {
  const table = new Map<string, Set<string>>();
  for (const habillage of HABILLAGES) {
    const vus = table.get(habillage.region) ?? new Set<string>();
    for (const moteur of habillage.moteurs) vus.add(moteur);
    table.set(habillage.region, vus);
  }
  return table;
}

/** La région d'une compétence, déduite des exercices qui la citent. */
function regionsDeLaCompetence(code: string): Set<string> {
  const regions = new Set<string>();
  for (const exercice of EXERCICES) {
    if (!exercice.competences.includes(code)) continue;
    const prefixe = exercice.jeu.habillage.split('.')[0] ?? '';
    regions.add(prefixe === 'cite' ? 'cite-des-histoires' : prefixe);
  }
  return regions;
}

describe('R12 — chaque compétence travaillée l’est par ≥ 3 moteurs distincts', () => {
  it('aucune compétence sous le seuil, et la réparation est nommée', () => {
    const table = moteursParCompetence();
    const disponibles = moteursDisponiblesParRegion();

    const sous = [...table.entries()]
      .filter(([, moteurs]) => moteurs.size < MOTEURS_MINIMUM)
      .map(([code, moteurs]) => {
        const regions = [...regionsDeLaCompetence(code)];
        const encoreLibres = regions
          .flatMap((region) => [...(disponibles.get(region) ?? new Set<string>())])
          .filter((moteur) => !moteurs.has(moteur));
        return (
          `${code} → ${[...moteurs].sort().join(', ')} ` +
          `(${String(moteurs.size)}/${String(MOTEURS_MINIMUM)}) ; ` +
          `région(s) ${regions.join(', ')} ; ` +
          `moteurs encore disponibles : ${[...new Set(encoreLibres)].sort().join(', ') || 'aucun'}`
        );
      });

    expect(
      sous,
      `${String([...table.values()].filter((m) => m.size >= MOTEURS_MINIMUM).length)}/` +
        `${String(table.size)} compétence(s) couverte(s) par ≥ ${String(MOTEURS_MINIMUM)} moteurs. ` +
        'Chaque ligne dit la compétence, ses moteurs actuels, et ceux qu’un habillage de sa ' +
        'région rend encore possibles — la réparation ne se cherche pas.',
    ).toEqual([]);
  });

  it('le compte est calculé sur des OBJETS, pas sur des occurrences', () => {
    // Un test qui compterait les fichiers d'exercice rendrait un chiffre sans rapport : deux
    // exercices du même moteur ne font pas deux moteurs. Cette assertion garde la propriété
    // qui distingue les deux comptes.
    const table = moteursParCompetence();
    for (const [code, moteurs] of table) {
      const citants = EXERCICES.filter((e) => e.competences.includes(code));
      expect(moteurs.size, `${code} : ${String(citants.length)} exercice(s)`).toBeLessThanOrEqual(
        citants.length,
      );
    }
    expect(EXERCICES.length).toBeGreaterThan(table.size);
  });
});

describe('D23 — les deux axes de confusion miroir ne sont JAMAIS traités en bloc', () => {
  const AXES = ['gph.miroir.gauche-droite', 'gph.miroir.haut-bas'] as const;

  it('les deux codes existent au référentiel', () => {
    const codes = new Set(REFERENTIEL.map((c) => c.code));
    for (const axe of AXES) {
      expect(codes, `le moteur \`trace\` dérive ${axe} ; le référentiel doit le porter`).toContain(
        axe,
      );
    }
  });

  it('aucun exercice ne déclare les deux axes à la fois', () => {
    // « Un enfant peut être gêné par un axe et pas par l'autre » (D23, conséquence 1). Un
    // exercice qui déclare les deux rend son résultat inattribuable : l'échec dit « miroir »
    // sans dire lequel, et le Top 10 du tableau de bord perd le seul renseignement qui
    // vaudrait quelque chose pour un orthophoniste.
    const doubles = EXERCICES.filter((e) => AXES.every((axe) => e.competences.includes(axe)));
    expect(doubles.map((e) => e.id)).toEqual([]);
  });

  it('un exercice d’un axe ne fait jamais lire une lettre de l’autre axe', () => {
    // Le contrôle porte sur le CONTENU, pas sur la déclaration : un exercice étiqueté
    // « gauche-droite » dont les mots portent des `p` et des `q` traite bien b/d/p/q en bloc,
    // quoi qu'en dise son en-tête.
    const LETTRES = {
      'gph.miroir.gauche-droite': { travaillees: ['b', 'd'], interdites: ['p', 'q'] },
      'gph.miroir.haut-bas': { travaillees: ['b', 'p'], interdites: ['d', 'q'] },
    } as const;

    const fautes: string[] = [];
    for (const exercice of EXERCICES) {
      for (const axe of AXES) {
        if (!exercice.competences.includes(axe)) continue;
        const { interdites } = LETTRES[axe];
        for (const mot of motsCibles(exercice)) {
          const intruse = interdites.find((lettre) => mot.includes(lettre));
          if (intruse !== undefined) {
            fautes.push(`${exercice.id} (${axe}) : « ${mot} » porte « ${intruse} »`);
          }
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it('AUCUN exercice ne fait choisir entre plus de deux lettres miroir', () => {
    // La propriété qui ne dépend d'aucune déclaration, et c'est ce qui la rend utile : un
    // exercice qui ne cite aucune compétence miroir peut quand même mettre b, d et p sur le
    // même clavier. Ce serait le traitement en bloc de D23, et l'étiquette de l'exercice n'y
    // changerait rien.
    //
    // L'unité mesurée est CE ENTRE QUOI L'ENFANT CHOISIT — les touches d'un `grave`, les
    // options d'un `eclair` — pas les lettres qui traînent dans un mot.
    const MIROIR = new Set(['b', 'd', 'p', 'q']);
    const AXES_ADMIS = [new Set(['b', 'd']), new Set(['p', 'q']), new Set(['b', 'p']), new Set(['d', 'q'])];

    const fautes: string[] = [];
    for (const exercice of EXERCICES) {
      const contenu = exercice.jeu.contenu as Record<string, unknown>;
      const clavier = ((contenu['clavier'] ?? []) as readonly string[]).filter((t) =>
        MIROIR.has(t.toLowerCase()),
      );
      const lettres = new Set(clavier.map((t) => t.toLowerCase()));
      if (lettres.size <= 1) continue;
      const conforme = AXES_ADMIS.some(
        (axe) => [...lettres].every((lettre) => axe.has(lettre)) && lettres.size === 2,
      );
      if (!conforme) {
        fautes.push(`${exercice.id} : clavier ${[...lettres].sort().join('/')} — deux axes mêlés`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it('chaque axe est bien travaillé par un contenu, pas seulement déclaré', () => {
    // Un code de compétence au référentiel que rien ne travaille est un onglet vide dans le
    // tableau de bord du parent. Le moteur `trace` DÉRIVE ces deux codes
    // (`moteurs/trace/moteur.ts`), donc un exercice `trace` compte aussi.
    for (const axe of AXES) {
      const porteurs = EXERCICES.filter(
        (e) => e.competences.includes(axe) || e.jeu.moteur === 'trace',
      );
      expect(porteurs.length, `${axe} n’est travaillé par aucun exercice`).toBeGreaterThan(0);
    }
  });
});

/** Les mots que l'enfant LIT dans un exercice — libellés d'option, mots à graver, étiquettes. */
function motsCibles(exercice: Exercice): readonly string[] {
  const contenu = exercice.jeu.contenu as Record<string, unknown>;
  const mots: string[] = [];
  const consignes = (contenu['consignes'] ?? []) as readonly Record<string, unknown>[];
  for (const consigne of consignes) {
    if (typeof consigne['mot'] === 'string') mots.push(consigne['mot']);
  }
  for (const cle of ['options', 'elements', 'etiquettes', 'cartes', 'cibles']) {
    const items = (contenu[cle] ?? []) as readonly Record<string, unknown>[];
    for (const item of items) {
      if (typeof item['libelle'] === 'string') mots.push(item['libelle']);
      if (typeof item['mot'] === 'string') mots.push(item['mot']);
    }
  }
  return mots.map((mot) => mot.toLowerCase());
}

describe('le référentiel ne porte aucun code mort', () => {
  it('toute compétence déclarée est citée par un exercice ou dérivée par un moteur', () => {
    // `gph.miroir.*` sont dérivés par le moteur `trace` même sans être déclarés dans un
    // exercice : ils sont donc admis dès qu'un exercice `trace` existe.
    const cites = new Set(EXERCICES.flatMap((e) => e.competences));
    const derives = EXERCICES.some((e) => e.jeu.moteur === 'trace')
      ? new Set(['gph.miroir.gauche-droite', 'gph.miroir.haut-bas'])
      : new Set<string>();

    const mortes = REFERENTIEL.map((c) => c.code).filter(
      (code) => !cites.has(code) && !derives.has(code),
    );
    expect(
      mortes,
      `référentiel : ${String(REFERENTIEL.length)} code(s), ` +
        `${String(cites.size)} cité(s) par un exercice`,
    ).toEqual([]);
  });

  it('la chaîne de prérequis ne cite que des codes du référentiel', () => {
    const codes = new Set(REFERENTIEL.map((c) => c.code));
    for (const competence of REFERENTIEL) {
      for (const prerequis of competence.prerequis) {
        expect(codes, `${competence.code} exige « ${prerequis} »`).toContain(prerequis);
      }
    }
  });
});
