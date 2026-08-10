/**
 * La cascade de récompenses — D25, contrat des features v2 § 3.1 et § 4.1 (lot L2-A).
 *
 * Ce fichier prouve **par table** les trois paliers, et **par propriété** les deux invariants
 * opposables de `appliquerEtoiles` :
 *
 *   1. aucun compteur ne décroît jamais — « un acquis n'est jamais repris » (R14) ;
 *   2. un seul appel peut franchir plusieurs paliers, et `paliersFranchis` les porte tous,
 *      dans l'ordre.
 *
 * Il vérifie aussi ce que D25 point 3 exige de la jauge : `restant` est un CHAMP, il vaut
 * `requis - acquis`, et il n'est jamais négatif. Une jauge qui ne porterait que l'acquis
 * laisserait la vue libre de n'afficher que l'acquis — c'est précisément l'erreur interdite.
 *
 * Enfin il exerce la projection SQL `progression_cascade` (migration 004) sur une base
 * `:memory:` réelle : la projection incrémentale et le recalcul intégral doivent rendre le
 * MÊME état, sans quoi « le journal fait foi » cesse d'être vrai pour la cascade.
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

import type { DatabaseSync } from 'node:sqlite';
import type { Base } from '@pierre/partage/base';

import { ErreurPierre } from '@pierre/partage';
import type { EtatCascade, NombreEtoiles, SeuilsCascade } from '@pierre/partage';
import {
  ETAT_CASCADE_VIDE,
  appliquerEtoiles,
  jaugesDe,
  lireSeuilsCascade
} from '@pierre/partage/recompenses';

import {
  DOSSIER_MIGRATIONS,
  INSTANT_DE_REFERENCE,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

/** Les seuils réels, lus SUR DISQUE : le test échoue si le fichier de données disparaît. */
const CHEMIN_PARAMETRES = 'contenu/referentiel/parametres-recompenses.json';

const seuilsReels = (): SeuilsCascade => lireSeuilsCascade(lireJson(CHEMIN_PARAMETRES));

/**
 * Seuils réduits, pour les tables : 3 étoiles par intermédiaire, 2 intermédiaires par rare.
 * Choisis pour qu'un nœud à trois étoiles remplisse EXACTEMENT un intermédiaire — ce qui rend
 * lisible le cas « un seul appel franchit les trois paliers » sans le noyer sous les tampons.
 */
const SEUILS_COURTS: SeuilsCascade = {
  etoilesParIntermediaire: 3,
  intermediairesParRare: 2,
  natureIntermediaire: 'forme-gobi',
  natureRare: 'zone-recoloriee'
};

describe('les seuils viennent des DONNÉES, jamais du code (C2, D13)', () => {
  test('le fichier de référentiel porte les deux seuils de D25', () => {
    const seuils = seuilsReels();
    expect(seuils.etoilesParIntermediaire).toBe(5);
    expect(seuils.intermediairesParRare).toBe(10);
    // D25 point 2 : « il faut que le palier rare soit une IMAGE, ou son équivalent ».
    expect(seuils.natureRare).toBe('zone-recoloriee');
  });

  test('un paramètre absent ou hors domaine LÈVE, il ne prend pas de défaut silencieux', () => {
    expect(() => lireSeuilsCascade(null)).toThrow(ErreurPierre);
    expect(() => lireSeuilsCascade({ etoilesParIntermediaire: 5 })).toThrow(ErreurPierre);
    expect(() =>
      lireSeuilsCascade({ ...SEUILS_COURTS, etoilesParIntermediaire: 0 })
    ).toThrow(ErreurPierre);
    expect(() =>
      lireSeuilsCascade({ ...SEUILS_COURTS, natureRare: 'un-poney' })
    ).toThrow(ErreurPierre);
    try {
      lireSeuilsCascade(null);
    } catch (cause) {
      expect(ErreurPierre.porteLeCode(cause, 'contenu-invalide')).toBe(true);
    }
  });
});

describe('appliquerEtoiles — la table des trois paliers', () => {
  test("l'étoile est franchie à chaque nœud terminé, et elle seule au premier", () => {
    const gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 1, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    expect(gain.paliersFranchis).toEqual(['etoile']);
    expect(gain.etat.etoilesTotal).toBe(1);
    expect(gain.etat.intermediairesTotal).toBe(0);
    expect(gain.etat.dernierPalierLe).toBe(INSTANT_DE_REFERENCE);
  });

  test('un nœud qui n’aboutit pas (0 étoile) ne franchit RIEN et ne perd rien', () => {
    const gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 0, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    expect(gain.paliersFranchis).toEqual([]);
    expect(gain.recompenses).toEqual([]);
    expect(gain.etat).toEqual(ETAT_CASCADE_VIDE);
  });

  test('un SEUL appel peut franchir les trois paliers, dans l’ordre', () => {
    // Un premier nœud à trois étoiles remplit le premier tampon.
    const gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 3, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    expect(gain.paliersFranchis).toEqual(['etoile', 'intermediaire']);
    expect(gain.etat.intermediairesTotal).toBe(1);

    const suivant = appliquerEtoiles(gain.etat, 3, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    expect(suivant.paliersFranchis).toEqual(['etoile', 'intermediaire', 'rare']);
    expect(suivant.etat.raresTotal).toBe(1);
    expect(suivant.etat.intermediairesDepuisRare).toBe(0);
  });

  test('chaque palier franchi porte sa NATURE, celle des seuils déclarés', () => {
    const premier = appliquerEtoiles(ETAT_CASCADE_VIDE, 3, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    const gain = appliquerEtoiles(premier.etat, 3, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    const natures = gain.recompenses.map((recompense) => recompense.nature);
    expect(natures).toEqual(['etoile', 'forme-gobi', 'zone-recoloriee']);
    expect(gain.recompenses).toHaveLength(gain.paliersFranchis.length);
  });

  test('la table de D25 avec les VRAIS seuils : 5 étoiles → 1 intermédiaire, 10 → 1 rare', () => {
    const seuils = seuilsReels();
    let etat: EtatCascade = ETAT_CASCADE_VIDE;
    let rares = 0;
    let intermediaires = 0;

    // 50 étoiles = 10 intermédiaires = 1 rare. Exactement la cascade de l'école.
    for (let index = 0; index < 50; index += 1) {
      const gain = appliquerEtoiles(etat, 1, seuils, INSTANT_DE_REFERENCE);
      etat = gain.etat;
      intermediaires += gain.paliersFranchis.filter((p) => p === 'intermediaire').length;
      rares += gain.paliersFranchis.filter((p) => p === 'rare').length;
    }

    expect(etat.etoilesTotal).toBe(50);
    expect(intermediaires).toBe(10);
    expect(rares).toBe(1);
    expect(etat.intermediairesTotal).toBe(10);
    expect(etat.raresTotal).toBe(1);
  });
});

describe('jaugesDe — la jauge montre le VIDE restant (D25, point 3)', () => {
  test('toujours les trois jauges, toujours dans le même ordre', () => {
    const jauges = jaugesDe(ETAT_CASCADE_VIDE, seuilsReels());
    expect(jauges.map((jauge) => jauge.palier)).toEqual(['etoile', 'intermediaire', 'rare']);
  });

  test('`restant` vaut `requis - acquis`, sur toutes les jauges, à tout moment', () => {
    const seuils = seuilsReels();
    let etat: EtatCascade = ETAT_CASCADE_VIDE;
    for (let index = 0; index < 60; index += 1) {
      for (const jauge of jaugesDe(etat, seuils)) {
        expect(jauge.restant).toBe(jauge.requis - jauge.acquis);
        expect(jauge.restant).toBeGreaterThanOrEqual(0);
        expect(jauge.acquis).toBeLessThanOrEqual(jauge.requis);
      }
      etat = appliquerEtoiles(etat, 1, seuils, INSTANT_DE_REFERENCE).etat;
    }
  });

  test('la jauge `intermediaire` compte les étoiles depuis le dernier tampon', () => {
    const seuils = seuilsReels();
    const gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 3, seuils, INSTANT_DE_REFERENCE);
    const jauge = gain.jauges.find((candidate) => candidate.palier === 'intermediaire');
    expect(jauge).toBeDefined();
    // « Trois étoiles sur cinq » — la phrase même de D25.
    expect(jauge?.acquis).toBe(3);
    expect(jauge?.requis).toBe(5);
    expect(jauge?.restant).toBe(2);
  });
});

describe('propriétés opposables — R14', () => {
  const etoilesArbitraire = fc.constantFrom<NombreEtoiles>(0, 1, 2, 3);

  test('P-A1 : aucun compteur ne décroît jamais, sur 1 000 séquences', () => {
    fc.assert(
      fc.property(fc.array(etoilesArbitraire, { minLength: 1, maxLength: 40 }), (series) => {
        let etat: EtatCascade = ETAT_CASCADE_VIDE;
        for (const etoiles of series) {
          const suivant = appliquerEtoiles(etat, etoiles, SEUILS_COURTS, INSTANT_DE_REFERENCE).etat;
          expect(suivant.etoilesTotal).toBeGreaterThanOrEqual(etat.etoilesTotal);
          expect(suivant.intermediairesTotal).toBeGreaterThanOrEqual(etat.intermediairesTotal);
          expect(suivant.raresTotal).toBeGreaterThanOrEqual(etat.raresTotal);
          etat = suivant;
        }
        return true;
      }),
      { numRuns: 1000 }
    );
  });

  test('P-A2 : la conservation — total = paliers × seuil + reste, jamais une étoile perdue', () => {
    fc.assert(
      fc.property(fc.array(etoilesArbitraire, { minLength: 1, maxLength: 60 }), (series) => {
        let etat: EtatCascade = ETAT_CASCADE_VIDE;
        for (const etoiles of series) {
          etat = appliquerEtoiles(etat, etoiles, SEUILS_COURTS, INSTANT_DE_REFERENCE).etat;
        }
        const attendu = series.reduce<number>((somme, valeur) => somme + valeur, 0);
        expect(etat.etoilesTotal).toBe(attendu);
        expect(
          etat.intermediairesTotal * SEUILS_COURTS.etoilesParIntermediaire +
            etat.etoilesDepuisIntermediaire
        ).toBe(attendu);
        expect(
          etat.raresTotal * SEUILS_COURTS.intermediairesParRare + etat.intermediairesDepuisRare
        ).toBe(etat.intermediairesTotal);
        return true;
      }),
      { numRuns: 500 }
    );
  });

  test('P-A3 : `appliquerEtoiles` est PURE — l’état donné n’est jamais muté', () => {
    const depart: EtatCascade = { ...ETAT_CASCADE_VIDE };
    const copie = { ...depart };
    appliquerEtoiles(depart, 3, SEUILS_COURTS, INSTANT_DE_REFERENCE);
    expect(depart).toEqual(copie);
  });
});

/**
 * La projection SQL — migration 004, `serveur/src/depots/cascade.ts`.
 *
 * C'est le test T2 « Recalculs » de l'annexe T § T2 appliqué à la cascade : l'incrémental et
 * le recalcul intégral doivent rendre le MÊME état. Une base `:memory:` réelle, migrée sur
 * disque : rien n'est simulé.
 */
describe('progression_cascade — projection recalculable, jamais source de vérité', () => {
  const PROFIL = 'profil-cascade-01';

  async function baseMigree(): Promise<{
    base: DatabaseSync;
    baseAsync: Base;
    fermer(): void;
  }> {
    const [{ ouvrirBase }, { appliquerMigrations }, { creerBaseNodeSqlite }] = await Promise.all([
      import('@serveur/base/connexion'),
      import('@serveur/base/migrations'),
      import('@serveur/base/adaptateur-node-sqlite')
    ]);
    const base = ouvrirBase(':memory:');
    const baseAsync = creerBaseNodeSqlite(base);
    await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horlogeDeTest());
    base
      .prepare(
        `INSERT INTO profils (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
         VALUES (?, 'Test', '{}', 'clairiere', ?, ?)`
      )
      .run(PROFIL, INSTANT_DE_REFERENCE, INSTANT_DE_REFERENCE);
    return {
      base,
      baseAsync,
      fermer: () => {
        base.close();
      }
    };
  }

  /** Journalise une tentative valant `etoiles` sur le nœud donné. */
  function journaliser(base: DatabaseSync, rang: number, etoiles: number): void {
    base
      .prepare(
        `INSERT INTO tentatives (
           id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
           demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles, detail_json
         ) VALUES (?, ?, ?, ?, 'clairiere-ecole-01', 'colorie', 'clairiere.ecole', 1,
                   ?, ?, 1000, 1, 0, 'aucune', ?, '{}')`
      )
      .run(
        `t-${String(rang).padStart(3, '0')}`,
        `cle-${String(rang)}`,
        PROFIL,
        `noeud-${String(rang)}`,
        INSTANT_DE_REFERENCE,
        INSTANT_DE_REFERENCE,
        etoiles
      );
  }

  test('un profil sans tentative rend l’état vide, jamais `null`', async () => {
    const { baseAsync, fermer } = await baseMigree();
    try {
      const { lireCascade } = await import('@pierre/partage/base');
      expect(await lireCascade(baseAsync, PROFIL)).toEqual(ETAT_CASCADE_VIDE);
    } finally {
      fermer();
    }
  });

  test('T2 — l’incrémental et le recalcul intégral rendent le MÊME état', async () => {
    const { base, baseAsync, fermer } = await baseMigree();
    try {
      const { appliquerTentativeALaCascade, lireCascade, recalculerCascade } =
        await import('@pierre/partage/base');
      const seuils = seuilsReels();

      // 17 nœuds à 3 étoiles : 51 étoiles, 10 tampons, 1 image. La cascade entière.
      const etoilesParNoeud: readonly NombreEtoiles[] = Array.from({ length: 17 }, () => 3);
      for (const [index, etoiles] of etoilesParNoeud.entries()) {
        journaliser(base, index, etoiles);
        await appliquerTentativeALaCascade(baseAsync, PROFIL, etoiles, seuils, INSTANT_DE_REFERENCE);
      }

      const incremental = await lireCascade(baseAsync, PROFIL);
      expect(incremental.etoilesTotal).toBe(51);
      expect(incremental.intermediairesTotal).toBe(10);
      expect(incremental.raresTotal).toBe(1);

      const integral = await recalculerCascade(baseAsync, PROFIL, seuils);
      expect(integral).toEqual(incremental);
      // Et la table relue après recalcul dit bien la même chose.
      expect(await lireCascade(baseAsync, PROFIL)).toEqual(incremental);
    } finally {
      fermer();
    }
  });

  test('rejouer plus mal ne fait redescendre AUCUN total (R14)', async () => {
    const { base, baseAsync, fermer } = await baseMigree();
    try {
      const { appliquerTentativeALaCascade } = await import('@pierre/partage/base');
      const seuils = seuilsReels();

      journaliser(base, 0, 3);
      const apresBon = await appliquerTentativeALaCascade(baseAsync, PROFIL, 3, seuils, INSTANT_DE_REFERENCE);
      journaliser(base, 1, 1);
      const apresMoinsBon = await appliquerTentativeALaCascade(
        baseAsync,
        PROFIL,
        1,
        seuils,
        INSTANT_DE_REFERENCE
      );

      expect(apresMoinsBon.etoilesTotal).toBeGreaterThanOrEqual(apresBon.etoilesTotal);
      expect(apresMoinsBon.intermediairesTotal).toBeGreaterThanOrEqual(
        apresBon.intermediairesTotal
      );
      expect(apresMoinsBon.raresTotal).toBeGreaterThanOrEqual(apresBon.raresTotal);
    } finally {
      fermer();
    }
  });
});
