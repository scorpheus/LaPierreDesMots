/**
 * LE GARDE DES QUATORZE MOTEURS — lot A4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT GARDÉ ICI, MESURÉ AVANT CORRECTION ET NON RAPPORTÉ
 *
 *   [qa-moteurs] 8 moteur(s) joué(s) de bout en bout sur 14 déclaré(s)
 *   [qa-moteurs] 6 moteur(s) DÉCLARÉ(S) SANS EXERCICE, donc inatteignables par l'enfant :
 *                assemble, chemin, chrono, histoire, libre, paires
 *
 * Six moteurs sur quatorze : du code écrit, testé unitairement
 * (`tests/composants/MoteurAssemble.test.tsx` et ses cinq jumeaux passaient déjà au vert),
 * monté dans le registre, et que l'enfant ne pouvait atteindre par aucun chemin. C'est du
 * travail creux au sens strict : il est prouvé correct et il ne sert à rien.
 *
 * `tests/e2e/parcours-audit-moteurs.spec.ts` MESURAIT déjà ce compte — et le laissait
 * délibérément sans assertion : « R12 est le travail du lot de contenu, pas de la QA ». Le
 * chiffre vivait donc dans un `console.log`, c'est-à-dire nulle part. Ce fichier en fait un
 * garde, et il le fait en unitaire : la suite E2E ne tourne pas au `pre-commit`.
 *
 * ── PREMIER TEMPS : LE GARDE SE DÉCLENCHE ─────────────────────────────────────────────────
 * `croiserMoteursEtExercices` est PUR. On lui soumet donc l'état historique — les douze
 * exercices d'avant ce lot, reconstitués depuis le disque en ne gardant que les huit moteurs
 * que la QA avait nommés — et on exige qu'il dénonce les six autres, un par un. Sans ce
 * premier temps, les cas ci-dessous seraient verts pour n'importe quelle fonction qui rendrait
 * « aucune anomalie ».
 *
 * ── SECOND TEMPS : LE DÉPÔT RÉEL ──────────────────────────────────────────────────────────
 * Le dernier `describe` lit les VRAIS fichiers et exige 14 sur 14. Il échouera le jour où un
 * quinzième moteur sera déclaré sans contenu — l'union `CodeMoteur` étant lue dans le source,
 * le dénominateur monte tout seul.
 *
 * ── CE QUE CE FICHIER EXIGE ET QU'AUCUN AUTRE N'EXIGE ─────────────────────────────────────
 * `moteurs-couverture.test.ts` (R12) compte les moteurs PAR COMPÉTENCE ; il resterait vert
 * avec six moteurs sans le moindre exercice, puisqu'il ne regarde que les compétences que les
 * exercices livrés citent. `clairiere-sortie-complete.test.ts` traque l'exercice qu'aucun nœud
 * ne cite, `verifier-noeuds-regions.mjs` le nœud qu'aucune région ne cite. Aucun des trois ne
 * part des MOTEURS. C'est la leçon de D48 : on audite les objets qui devraient porter la
 * propriété, pas les occurrences de la propriété.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';

import {
  REGLES_MOTEURS,
  croiserMoteursEtExercices,
  moteursDeclaresDuSource,
  resumerCouvertureMoteurs,
} from '../../scripts/verifier-moteurs-atteignables.mjs';
import { fichiersSous } from '../../scripts/verifier-regions-fermees.mjs';
import { RACINE_DEPOT, lireJson, lireTexte } from '../configuration/preparation.js';

// ────────────────────────────────────────────────────────────────────── formes du croisement

interface Anomalie {
  readonly regle: string;
  readonly ou: string;
  readonly message: string;
}
interface BilanMoteur {
  readonly moteur: string;
  readonly exercices: number;
  readonly noeuds: number;
  readonly surLaCarte: number;
  readonly atteignable: boolean;
  readonly premierNoeud: string | null;
}
interface Croisement {
  readonly nbMoteursDeclares: number;
  readonly nbMoteursAtteignables: number;
  readonly ecart: number;
  readonly atteignables: readonly string[];
  readonly parMoteur: readonly BilanMoteur[];
  readonly anomalies: readonly Anomalie[];
}

interface DocumentLu {
  readonly chemin: string;
  readonly donnees: unknown;
}

const croiser = croiserMoteursEtExercices as (entree: {
  moteursDeclares: readonly string[];
  exercices: readonly DocumentLu[];
  noeuds: readonly DocumentLu[];
  noeudsCites: readonly string[];
}) => Croisement;

const regles = REGLES_MOTEURS as Readonly<Record<string, string>>;
const resumer = resumerCouvertureMoteurs as (rapport: Croisement) => string;
const declaresDuSource = moteursDeclaresDuSource as (source: string) => string[];

// ──────────────────────────────────────────────────────────────────────── les trois sources

function lireDossier(dossier: string): readonly DocumentLu[] {
  return (fichiersSous(`${RACINE_DEPOT}${dossier}`, '.json') as string[]).map((absolu) => {
    const chemin = absolu.slice(RACINE_DEPOT.length).split('\\').join('/');
    return { chemin, donnees: lireJson<unknown>(chemin) };
  });
}

const EXERCICES = lireDossier('contenu/exercices');
const NOEUDS = lireDossier('contenu/noeuds');
const NOEUDS_DE_PROGRESSION = NOEUDS.filter(
  (noeud) => (noeud.donnees as { readonly progression?: boolean }).progression !== false
);
const EXERCICES_DE_PROGRESSION = EXERCICES.filter((exercice) =>
  NOEUDS_DE_PROGRESSION.some(
    (noeud) =>
      (noeud.donnees as { readonly exercice?: unknown }).exercice ===
      (exercice.donnees as { readonly id?: unknown }).id
  )
);
const MOTEURS_DECLARES = declaresDuSource(lireTexte('partage/src/identifiants.ts'));
// `libre` est atteint par `/chaudron`, hors nœud pédagogique ; sa recette dédiée vérifie ce
// chemin. Ce garde ne mesure que les moteurs que le sélecteur peut proposer.
const MOTEURS_DE_PROGRESSION = MOTEURS_DECLARES.filter((moteur) => moteur !== 'libre');

const NOEUDS_CITES = lireJson<{
  regions: ReadonlyArray<{ region: string; noeuds: readonly string[] }>;
}>('contenu/monde/regions.json').regions.flatMap((region) => region.noeuds);

/**
 * Les HUIT moteurs que la QA avait mesurés comme jouables avant ce lot, cités depuis sa sortie
 * et non déduits : c'est la référence historique, elle ne se recalcule pas.
 */
const HUIT_HISTORIQUES: readonly string[] = [
  'attrape',
  'colorie',
  'eclair',
  'grave',
  'phrase',
  'place',
  'trace',
  'tri',
];

/** Les six que le même relevé nommait comme inatteignables. Ce lot existe pour les combler. */
const SIX_MANQUANTS: readonly string[] = [
  'assemble',
  'chemin',
  'chrono',
  'histoire',
  'libre',
  'paires',
];

/** Les règles levées, nommées et triées — on nomme, on ne compte pas. */
const declenchees = (rapport: Croisement): readonly string[] =>
  [...new Set(rapport.anomalies.map((anomalie) => anomalie.regle))].sort();

const moteurDe = (document: DocumentLu): string =>
  String((document.donnees as { jeu?: { moteur?: unknown } }).jeu?.moteur ?? '');

// ═══════════════════════════════════════════ premier temps : le garde se déclenche vraiment

describe('le garde refuse l’état d’avant ce lot — 8 moteurs sur 14', () => {
  /** Le dépôt réduit aux seuls exercices des huit moteurs historiques. */
  const exercicesHistoriques = EXERCICES.filter((exercice) =>
    HUIT_HISTORIQUES.includes(moteurDe(exercice)),
  );

  it('la mesure trouve bien deux populations à croiser', () => {
    // Sans ce cas, « aucune anomalie » pourrait vouloir dire « aucun fichier lu ».
    expect(MOTEURS_DECLARES.length).toBeGreaterThanOrEqual(14);
    expect(exercicesHistoriques.length).toBeGreaterThanOrEqual(12);
  });

  it('les six moteurs sans exercice sont dénoncés NOMMÉMENT, pas comptés', () => {
    const rapport = croiser({
      moteursDeclares: MOTEURS_DECLARES,
      exercices: exercicesHistoriques,
      noeuds: NOEUDS,
      noeudsCites: NOEUDS_CITES,
    });

    const nommes = rapport.anomalies
      .filter((anomalie) => anomalie.regle === regles['MOTEUR_SANS_EXERCICE'])
      .map((anomalie) => anomalie.ou)
      .sort();

    expect(nommes).toEqual([...SIX_MANQUANTS]);
    expect(rapport.nbMoteursAtteignables).toBe(HUIT_HISTORIQUES.length);
    expect(rapport.ecart).toBe(HUIT_HISTORIQUES.length - MOTEURS_DECLARES.length);
    expect(resumer(rapport)).toContain('8/14');
  });

  it('un exercice écrit mais qu’aucun nœud ne cite laisse son moteur INATTEIGNABLE', () => {
    // Le deuxième maillon. Un moteur peut avoir son exercice et rester injouable : c'est le
    // défaut que `clairiere-sortie-complete.test.ts` traque, vu depuis les moteurs.
    //
    // ⚠ CE CAS COUPAIT UN SEUL NŒUD, NOMMÉ EN DUR — celui de `galeries-echos-paires-01`, alors
    // le seul exercice `paires` du dépôt. Les lots de contenu en ont livré cinq autres : ôter
    // ce nœud-là ne rendait plus rien inatteignable, et le contrôle négatif ne déclenchait
    // plus. Un contrôle négatif qui ne se déclenche plus est un test qui rassure sans rien
    // prouver — le pire des deux mondes, puisqu'il reste vert le jour où le garde casse.
    //
    // On coupe donc TOUS les nœuds du moteur choisi, et le moteur est celui du dépôt qui porte
    // le plus d'exercices : plus il en porte, plus la coupure est parlante.
    const parMoteurDuDepot = new Map<string, string[]>();
    for (const exercice of EXERCICES) {
      const moteur = moteurDe(exercice);
      const vus = parMoteurDuDepot.get(moteur) ?? [];
      vus.push(String((exercice.donnees as { id?: unknown }).id ?? ''));
      parMoteurDuDepot.set(moteur, vus);
    }
    const [moteurCoupe, exercicesCoupes] = [...parMoteurDuDepot.entries()].sort(
      (a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1),
    )[0] as [string, string[]];

    const rapport = croiser({
      moteursDeclares: MOTEURS_DE_PROGRESSION,
      exercices: EXERCICES_DE_PROGRESSION,
      noeuds: NOEUDS_DE_PROGRESSION.filter(
        (noeud) =>
          !exercicesCoupes.includes(
            String((noeud.donnees as { exercice?: unknown }).exercice ?? ''),
          ),
      ),
      noeudsCites: NOEUDS_CITES,
    });

    expect(declenchees(rapport), `moteur coupé : ${moteurCoupe}`).toEqual([
      regles['MOTEUR_SANS_NOEUD'],
    ]);
    const bilan = rapport.parMoteur.find((entree) => entree.moteur === moteurCoupe);
    expect(bilan?.exercices, `${moteurCoupe} : exercices restés écrits`).toBe(
      exercicesCoupes.length,
    );
    expect(bilan?.exercices, 'la coupure ne porte que sur un exercice : trop peu pour prouver')
      .toBeGreaterThan(1);
    expect(bilan?.noeuds).toBe(0);
    expect(bilan?.atteignable).toBe(false);
  });

  it('un nœud livré que sa région ne cite pas laisse son moteur HORS CARTE', () => {
    // Le troisième maillon. `regions.json` est le seul document qui dise à la carte quels
    // nœuds une région contient : un nœud absent de cette liste n'est atteignable par
    // personne, quoi qu'en disent les fichiers d'exercice et de nœud.
    const rapport = croiser({
      moteursDeclares: MOTEURS_DECLARES,
      exercices: EXERCICES,
      noeuds: NOEUDS,
      noeudsCites: NOEUDS_CITES.filter((id) => id !== 'galeries-12'),
    });

    expect(declenchees(rapport)).toEqual([regles['MOTEUR_HORS_CARTE']]);
    const bilan = rapport.parMoteur.find((entree) => entree.moteur === 'libre');
    expect(bilan?.noeuds).toBe(1);
    expect(bilan?.surLaCarte).toBe(0);
    expect(bilan?.atteignable).toBe(false);
  });

  it('un moteur que `CodeMoteur` ne déclare pas est refusé, pas ignoré', () => {
    const rapport = croiser({
      moteursDeclares: MOTEURS_DECLARES.filter((moteur) => moteur !== 'libre'),
      exercices: EXERCICES,
      noeuds: NOEUDS,
      noeudsCites: NOEUDS_CITES,
    });
    expect(declenchees(rapport)).toEqual([regles['MOTEUR_INCONNU']]);
  });

  it('une population vide n’est pas une réussite, et le garde le dit', () => {
    const rapport = croiser({
      moteursDeclares: MOTEURS_DECLARES,
      exercices: [],
      noeuds: [],
      noeudsCites: [],
    });
    expect(declenchees(rapport)).toContain(regles['POPULATION_VIDE']);
  });
});

// ══════════════════════════════════════════════════════ second temps : le dépôt réel est sain

describe('CHAQUE moteur déclaré est atteignable par l’enfant (contrat de sortie du lot A4)', () => {
  const rapport = croiser({
    moteursDeclares: MOTEURS_DE_PROGRESSION,
    exercices: EXERCICES_DE_PROGRESSION,
    noeuds: NOEUDS_DE_PROGRESSION,
    noeudsCites: NOEUDS_CITES,
  });

  it('le croisement ne lève aucune anomalie sur le dépôt réel', () => {
    expect(
      rapport.anomalies.map((anomalie) => `${anomalie.regle} · ${anomalie.ou}`),
      resumer(rapport),
    ).toEqual([]);
  });

  it('la fraction est pleine : autant de moteurs atteignables que déclarés', () => {
    // Le chiffre du lot, et il est imprimé même quand il passe : un compte qui rase le seuil
    // se voit, et c'est ce qu'on veut lire le jour où il baisse.
    expect(rapport.ecart, resumer(rapport)).toBe(0);
    expect(rapport.nbMoteursAtteignables, resumer(rapport)).toBe(MOTEURS_DE_PROGRESSION.length);
  });

  it('chaque moteur nomme le nœud par lequel on l’atteint', () => {
    // « atteignable » sans adresse serait une affirmation. Le nœud est l'adresse, et c'est
    // celui que `window.__test.allerAuNoeud` prend pour jouer le moteur en recette.
    const sansAdresse = rapport.parMoteur
      .filter((bilan) => bilan.premierNoeud === null)
      .map((bilan) => bilan.moteur);
    expect(sansAdresse).toEqual([]);
  });

  it('les six moteurs du lot A4 sont chacun reliés à un nœud cité par sa région', () => {
    for (const moteur of SIX_MANQUANTS.filter((moteur) => moteur !== 'libre')) {
      const bilan = rapport.parMoteur.find((entree) => entree.moteur === moteur);
      expect(bilan?.exercices, `${moteur} : exercices`).toBeGreaterThanOrEqual(1);
      expect(bilan?.surLaCarte, `${moteur} : nœuds cités par sa région`).toBeGreaterThanOrEqual(1);
    }
  });
});
