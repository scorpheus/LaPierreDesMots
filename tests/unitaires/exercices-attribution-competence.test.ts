/**
 * LOT S3 — CE QUE LE JOURNAL RECEVRA VRAIMENT, ET CE QUE LE SÉLECTEUR POURRA VRAIMENT PROPOSER.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE, ET POURQUOI AUCUNE SUITE NE LE VOYAIT.
 *
 * `tests/unitaires/moteurs-couverture.test.ts` mesure R12 en parcourant TOUTES les compétences
 * déclarées par un exercice (`for (const competence of exercice.competences)`). Le serveur, lui,
 * n'en retient qu'une :
 *
 *     serveur/src/routes/tentatives.ts:270   const competences = [...exercice.competences];
 *     serveur/src/routes/tentatives.ts:272   validerTentative(requete.body, competences[0] ?? '');
 *     serveur/src/depots/tentatives.ts:352   etape.confusion?.competence ?? competenceParDefaut
 *                                           (= pedagogie.competences[0])
 *
 * Une réussite n'observe aucune confusion. Elle est donc imputée à `competences[0]`, et à elle
 * seule. Une compétence déclarée uniquement en position ≥ 1 est verte pour R12 — trois moteurs
 * distincts la citent — et son journal reste vide POUR TOUJOURS : maîtrise bloquée à 0, jamais
 * d'acquis, rien dans le tableau de bord du parent. C'est le « détecteur qui déclare un poids
 * qu'il n'applique jamais » que CLAUDE.md nomme, vu depuis le contenu.
 *
 * Le second canal existe et n'est pas oublié : `jeu.contenu.competence` est la compétence
 * qu'un moteur inscrit sur une CONFUSION observée (les `validation.ts` de `partage/src/moteurs`).
 * Elle ne se déclenche que sur une erreur avec `confusionAvec` — elle ne remplace donc jamais
 * la position 0, mais elle nourrit réellement une seconde compétence. Le cas 3 la garde.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { creerAlea } from '@pierre/partage';
import { composerSortie } from '@pierre/partage/pedagogie';
import type {
  Competence,
  EtatMaitrise,
  Exercice,
  Noeud,
  NoeudCandidat,
  ParametresPedagogie,
} from '@pierre/partage';

import { CHEMIN_COMPETENCES, RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

interface ExerciceLu extends Exercice {
  readonly jeu: Exercice['jeu'] & { readonly contenu: { readonly competence?: string } };
}

function cheminsExercices(): readonly string[] {
  const racine = join(RACINE_DEPOT, 'contenu', 'exercices');
  return readdirSync(racine, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .flatMap((dossier) =>
      readdirSync(join(racine, dossier.name))
        .filter((fichier) => fichier.endsWith('.json'))
        .map((fichier) => `contenu/exercices/${dossier.name}/${fichier}`),
    )
    .sort();
}

const exercices: readonly ExerciceLu[] = cheminsExercices().map((chemin) =>
  lireJson<ExerciceLu>(chemin),
);
const referentiel: readonly Competence[] = lireJson<readonly Competence[]>(CHEMIN_COMPETENCES);
const codesDuReferentiel = new Set(referentiel.map((competence) => competence.code));

/** Toute compétence citée par un exercice, quelle que soit sa position. */
const declarees = new Set(exercices.flatMap((exercice) => exercice.competences));
/** Les seules qui recevront une étape sur une RÉUSSITE. */
const enPremierePosition = new Set(
  exercices.map((exercice) => exercice.competences[0]).filter((code) => code !== undefined),
);
/** Le canal des confusions : une erreur observée y est imputée. */
const parConfusion = new Set(
  exercices
    .map((exercice) => exercice.jeu.contenu.competence)
    .filter((code): code is string => typeof code === 'string'),
);

/**
 * L'INVENTAIRE DES COMPÉTENCES MUETTES, ET IL EST OPPOSABLE DANS LES DEUX SENS.
 *
 * Ce n'est pas une tolérance : c'est la liste, arrêtée et datée, des compétences que le
 * contenu livré déclare sans qu'aucun exercice ne les porte en position 0 ni ne les nomme en
 * confusion. Une de plus fait échouer ce fichier ; une de moins aussi, et c'est voulu — le
 * jour où l'arbitrage tombe, ce test exige qu'on retire l'entrée au lieu de l'oublier.
 *
 * Chacune est consignée dans `Docs/questions-en-attente.md`, section « Lot S3 », avec sa
 * proposition de remède. Aucune ne se corrige par un simple échange de position : `gn` et `ph`
 * n'ont aucun exercice qui les travaille à titre principal (ce sont, dans les trois cas, des
 * graphèmes secondaires d'un exercice consacré à `ill` ou à `ch-qu`), et
 * `comp.consigne.multiple` est déclarée par quinze exercices sans en être jamais le sujet.
 * Les nommer ici, c'est refuser de les corriger par un geste qui rendrait le test vert sans
 * rendre le contenu juste.
 */
const MUETTES_CONNUES: readonly string[] = [
  'comp.consigne.multiple',
  'gph.rare.gn',
  'gph.rare.ph',
];

describe('attribution des compétences — ce que le journal recevra', () => {
  it('contrôle de la mesure : le recensement porte sur des objets, et il n’est pas vide', () => {
    // Sans ce cas, un extracteur cassé rendrait tous les suivants verts en ne trouvant rien.
    expect(exercices.length).toBeGreaterThan(0);
    expect(cheminsExercices().length).toBe(exercices.length);
    expect(declarees.size).toBeGreaterThan(0);
    expect(referentiel.length).toBeGreaterThan(0);
    for (const exercice of exercices) {
      expect(exercice.competences.length, `aucune compétence : ${exercice.id}`).toBeGreaterThan(0);
    }
  });

  it('toute compétence déclarée par le contenu existe au référentiel', () => {
    // `competenceEligible` (partage/src/pedagogie/selecteur.ts) traite une compétence absente
    // du référentiel comme NON éligible : une faute de frappe ferme le nœud sans rien dire.
    const inconnues = [...declarees].filter((code) => !codesDuReferentiel.has(code)).sort();
    expect(inconnues, 'compétences citées par un exercice et absentes du référentiel').toEqual([]);
  });

  it('toute compétence déclarée reçoit un canal de journalisation, hors inventaire nommé', () => {
    const muettes = [...declarees]
      .filter((code) => !enPremierePosition.has(code) && !parConfusion.has(code))
      .sort();
    expect(
      muettes,
      'compétences déclarées par le contenu dont le journal restera vide pour toujours',
    ).toEqual([...MUETTES_CONNUES].sort());
  });

  it('`jeu.contenu.competence` est toujours une compétence déclarée par le même exercice', () => {
    // Le moteur inscrit cette valeur telle quelle sur une confusion. Si elle n'est pas déclarée
    // par l'exercice, le journal porte une compétence que ni R12 ni le sélecteur ne connaissent
    // pour ce nœud — et la maîtrise monte sur un code que rien n'a annoncé.
    const orphelines = exercices
      .filter((exercice) => {
        const code = exercice.jeu.contenu.competence;
        return typeof code === 'string' && !exercice.competences.includes(code);
      })
      .map((exercice) => `${exercice.id} → ${String(exercice.jeu.contenu.competence)}`)
      .sort();
    expect(orphelines, '`contenu.competence` non déclarée par son propre exercice').toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// LA PORTÉE RÉELLE DE « PARTIR EN SORTIE », MESURÉE PAR LE VRAI SÉLECTEUR
//
// `composerSortie` retient un candidat si `candidat.competences.every(competenceEligible)`
// (selecteur.ts) et `competenceEligible` exige TOUS les prérequis à `p >= seuilPrerequis`.
// `maitriseDe` rend 0 pour une compétence absente. Conséquence : un exercice précoce qui
// déclare, en compétence secondaire, un code situé PLUS LOIN dans la chaîne de prérequis
// se ferme lui-même — et ferme la compétence qu'il était le seul à pouvoir faire monter.
//
// ⚠ CE QUE CE NOMBRE NE DIT PAS, ET IL FAUT LE DIRE POUR NE PAS SUR-VENDRE LA MESURE.
// Il porte sur la SEULE route « partir en sortie ». Les 76 nœuds restent jouables quand on les
// adresse directement — `tests/api/sortie-sur-disque.test.ts`, cas « LA MARCHE », les joue tous
// par `POST /api/tentatives` et montre les six régions finir par offrir une sortie. Le défaut
// mesuré ici est donc : sur un profil NEUF, la composition automatique ne sait proposer que dix
// nœuds, et quatre régions sur six lui répondent 409. `sortie-sur-disque` l'accepte déjà — son
// assertion est `repondent.length >= 2`, écrite pour distinguer 0 de 2 et pas pour borner le
// reste. Ce fichier-ci borne le reste.
//
// Le nombre ci-dessous est un CONSTAT, pas une cible atteinte. Il est asserté exactement pour
// qu'il ne puisse ni empirer en silence, ni s'améliorer sans qu'on le voie.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Le nombre de nœuds qu'une sortie peut atteindre AU MIEUX, mesuré le 2026-08-03 :
 * **10 sur 76**. Les 66 autres sont fermés à « partir en sortie », dans quatre régions sur six
 * (Cité des Histoires, Forêt Muette, Marais Jumeau, Volcan : zéro nœud atteignable).
 */
const NOEUDS_ATTEIGNABLES_MESURES = 10;

/**
 * Graines fixes : la mesure ne doit pas dépendre du tirage. `composerSortie` départage les
 * candidats de même difficulté par `alea.choisir`, donc une graine unique SOUS-ESTIME la
 * portée. Stabilité vérifiée avant de figer le nombre — 1 graine rend 9, et 5, 20, 100 puis
 * 400 graines rendent toutes 10. Cinq suffisent, et le plafond est bien 10.
 */
const GRAINES: readonly number[] = [1, 7920, 15839, 23758, 31677];

function candidats(): readonly NoeudCandidat[] {
  const noeuds = readdirSync(join(RACINE_DEPOT, 'contenu', 'noeuds'))
    .filter((fichier) => fichier.endsWith('.json'))
    .map((fichier) => lireJson<Noeud>(`contenu/noeuds/${fichier}`));
  const parId = new Map(exercices.map((exercice) => [exercice.id, exercice]));
  const sortie: NoeudCandidat[] = [];
  for (const noeud of noeuds) {
    const exercice = parId.get(noeud.exercice);
    if (exercice === undefined) continue;
    sortie.push({
      noeud: noeud.id,
      habillage: exercice.jeu.habillage,
      region: noeud.region,
      competences: exercice.competences,
      difficulte: exercice.difficulte,
      temps: noeud.temps,
    } as NoeudCandidat);
  }
  return sortie;
}

/**
 * Point fixe OPTIMISTE : dès qu'un nœud est proposable, on suppose l'enfant parfait et la
 * compétence en position 0 passe à `p = 1`. Le résultat est donc un PLAFOND — le vrai enfant
 * n'ira jamais plus loin.
 */
function porteeDuSelecteur(): ReadonlySet<string> {
  const vivier = candidats();
  const parametres = lireJson<ParametresPedagogie>('contenu/referentiel/parametres-pedagogie.json');
  const regions = [...new Set(vivier.map((candidat) => candidat.region))].sort();
  const premiereDuNoeud = new Map(vivier.map((c) => [String(c.noeud), c.competences[0]]));
  const maitrisees = new Set<string>();
  const atteints = new Set<string>();

  for (let tour = 0; tour < 40; tour += 1) {
    let progresse = false;
    for (const region of regions) {
      for (const graine of GRAINES) {
        const maitrises: EtatMaitrise[] = [...maitrisees].map((code) => ({
          competence: code,
          p: 1,
          nbTentatives: 9,
          joursDistincts: ['2026-08-01', '2026-08-02', '2026-08-03'],
          nbTentativesFaibleDevinette: 9,
          acquiseLe: null,
        })) as EtatMaitrise[];
        let plan;
        try {
          plan = composerSortie(
            {
              profil: 'profil-mesure',
              region,
              compagnon: null,
              maitrises,
              revisionsDues: [],
              noeudsDisponibles: vivier,
              competences: referentiel,
              maintenant: '2026-08-03T09:00:00.000Z',
            } as never,
            parametres,
            creerAlea(graine),
          );
        } catch {
          continue;
        }
        for (const etape of plan.etapes) {
          const id = String(etape.noeud);
          if (!atteints.has(id)) {
            atteints.add(id);
            progresse = true;
          }
          const code = premiereDuNoeud.get(id);
          if (code !== undefined && !maitrisees.has(code)) {
            maitrisees.add(code);
            progresse = true;
          }
        }
      }
    }
    if (!progresse) break;
  }
  return atteints;
}

describe('portée du sélecteur sur le contenu livré (constat mesuré, D13 + v2 § 12.1)', () => {
  it('le vivier est complet : un candidat par nœud livré', () => {
    // Contrôle de la mesure : si le vivier se vidait, le cas suivant mesurerait un dépôt vide.
    expect(candidats().length).toBeGreaterThan(0);
    expect(candidats().length).toBe(exercices.length);
  });

  it('« partir en sortie » n’atteint que le nombre de nœuds mesuré — ni plus, ni moins', () => {
    const atteints = porteeDuSelecteur();
    expect(
      atteints.size,
      `${String(atteints.size)} nœud(s) atteignables sur ${String(candidats().length)} livrés. ` +
        'Une VARIATION est le signal attendu : à la hausse, un blocage a été levé et il faut ' +
        'remonter ce nombre ; à la baisse, une compétence secondaire vient de fermer un nœud. ' +
        'Voir Docs/questions-en-attente.md, section « Lot S3 ».',
    ).toBe(NOEUDS_ATTEIGNABLES_MESURES);
  });
});
