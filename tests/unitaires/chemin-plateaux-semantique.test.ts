/**
 * Contrat sémantique du plateau `chemin`.
 *
 * Ces classes ne sont PAS les `parcours` du contenu : elles classent indépendamment les mots
 * placés dans les mêmes phrases de consigne. Si une cible est mise dans le mauvais lot, ou si
 * un mot conforme à la règle reste visible comme leurre, ce fichier doit échouer.
 *
 * Les références sonores sont volontairement bornées au corpus livré (trou, noir, main, pont,
 * fille, montagne). Ce n'est pas un moteur de phonétique française ; hors ces formulations
 * exactement connues, le helper revient au plateau entier sans prétendre certifier le sens.
 */

import { describe, expect, it } from 'vitest';

import { preparerPlateauChemin } from '@partage/moteurs/chemin/plateau';
import type { CaseChemin, ContenuChemin } from '@partage/moteurs/chemin/types';

import { lireJson } from '../configuration/preparation.js';

type Classe = 'depart' | 'cible' | 'conforme-hors-etape' | 'leurre';

interface MotClasse {
  readonly id: string;
  readonly libelle: string;
  readonly classe: Classe;
}

interface FixtureSemantique {
  readonly nom: string;
  readonly texte: string;
  readonly regleCourte: string;
  readonly repere?: { readonly mot: string; readonly groupe: string };
  readonly mots: readonly MotClasse[];
}

interface ExerciceCheminLu {
  readonly jeu: { readonly contenu: ContenuChemin };
}

interface ClasseEtapeReelle {
  readonly fichier: string;
  readonly idEtape: string;
  readonly conformes: readonly string[] | null;
}

/**
 * Oracle phonologique/graphémique indépendant des champs `parcours` : pour chaque phrase
 * réellement publiée, cette table liste TOUS les libellés qui satisfont son critère, y compris
 * les départs et les mots d'autres lots. `null` est réservé aux trois chronologies de la Cité :
 * leur source n'est pas versionnée, donc les certifier ici serait fabriquer une vérité.
 */
const CLASSES_ETAPES_REELLES: readonly ClasseEtapeReelle[] = [
  { fichier: 'contenu/exercices/clairiere/lianes-voyelles-01.json', idEtape: 'c1', conformes: ['l’arbre', 'chat', 'papa', 'lac'] },
  { fichier: 'contenu/exercices/clairiere/lianes-voyelles-01.json', idEtape: 'c2', conformes: ['lit', 'midi', 'riz'] },
  { fichier: 'contenu/exercices/clairiere/lianes-voyelles-01.json', idEtape: 'c3', conformes: ['dos', 'moto', 'pot'] },
  { fichier: 'contenu/exercices/clairiere/lianes-voyelles-01.json', idEtape: 'c4', conformes: ['mur', 'lune', 'jus'] },
  { fichier: 'contenu/exercices/foret-muette/pas-japonais-chemin-01.json', idEtape: 'c1', conformes: ['chats', 'fleurs', 'arbres', 'livres', 'jours', 'mots', 'amis', 'feuilles'] },
  { fichier: 'contenu/exercices/foret-muette/pas-japonais-chemin-01.json', idEtape: 'c2', conformes: ['chat', 'fleur', 'arbre', 'livre'] },
  { fichier: 'contenu/exercices/foret-muette/pas-japonais-chemin-01.json', idEtape: 'c3', conformes: ['chats', 'fleurs', 'arbres', 'livres', 'jours', 'mots', 'amis', 'feuilles'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-01.json', idEtape: 'c1', conformes: ['boule', 'jour', 'loup', 'poule', 'four', 'tour', 'cour', 'route'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-01.json', idEtape: 'c2', conformes: ['roi', 'soir', 'toit', 'poire'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-01.json', idEtape: 'c3', conformes: ['boule', 'jour', 'loup', 'poule', 'four', 'tour', 'cour', 'route'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-02.json', idEtape: 'c1', conformes: ['lapin', 'matin', 'jardin', 'sapin', 'pain', 'copain', 'raisin', 'dinde'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-02.json', idEtape: 'c2', conformes: ['ballon', 'citron', 'savon', 'bonbon'] },
  { fichier: 'contenu/exercices/marais-jumeau/nenuphars-chemin-02.json', idEtape: 'c3', conformes: ['lapin', 'matin', 'jardin', 'sapin', 'pain', 'copain', 'raisin', 'dinde'] },
  { fichier: 'contenu/exercices/galeries/passage-chemin-01.json', idEtape: 'c1', conformes: ['bol', 'robe', 'bus', 'barbe', 'bec', 'botte'] },
  { fichier: 'contenu/exercices/galeries/passage-chemin-01.json', idEtape: 'c2', conformes: ['dos', 'dame', 'dur', 'radis', 'dix', 'ronde'] },
  { fichier: 'contenu/exercices/galeries/passage-chemin-01.json', idEtape: 'c3', conformes: ['bol', 'robe', 'bus', 'barbe', 'bec', 'botte'] },
  { fichier: 'contenu/exercices/galeries/passage-chemin-01.json', idEtape: 'c4', conformes: ['dos', 'dame', 'dur', 'radis', 'dix', 'ronde'] },
  { fichier: 'contenu/exercices/volcan/coulee-chemin-01.json', idEtape: 'c1', conformes: ['fille', 'bille', 'quille', 'famille'] },
  { fichier: 'contenu/exercices/volcan/coulee-chemin-01.json', idEtape: 'c2', conformes: ['balle', 'salle', 'colle', 'pile', 'montagne', 'ligne', 'signe', 'agneau'] },
  { fichier: 'contenu/exercices/volcan/coulee-chemin-01.json', idEtape: 'c3', conformes: ['montagne', 'ligne', 'signe', 'agneau'] },
  { fichier: 'contenu/exercices/cite-des-histoires/ponts-chemin-01.json', idEtape: 'c1', conformes: null },
  { fichier: 'contenu/exercices/cite-des-histoires/ponts-chemin-01.json', idEtape: 'c2', conformes: null },
  { fichier: 'contenu/exercices/cite-des-histoires/ponts-chemin-01.json', idEtape: 'c3', conformes: null },
];

/**
 * Six familles sonores bornées, plus les deux formes orthographiques et leurs négations.
 * `ville` est le contre-exemple indispensable : la suite « ill » ne suffit pas pour produire
 * le son de « fille ».
 */
const FIXTURES_SEMANTIQUES: readonly FixtureSemantique[] = [
  {
    nom: 'lettre b',
    texte: 'Marche sur les mots où tu lis un b.',
    regleCourte: 'Avec la lettre b',
    mots: [
      { id: 'depart', libelle: 'la marche', classe: 'depart' },
      { id: 'cible-1', libelle: 'bol', classe: 'cible' },
      { id: 'cible-2', libelle: 'bus', classe: 'cible' },
      { id: 'future-conforme', libelle: 'robe', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'dos', classe: 'leurre' },
    ],
  },
  {
    nom: 'absence de lettre s',
    texte: "Marche sur les mots qui n'ont pas de s.",
    regleCourte: 'Sans la lettre s',
    mots: [
      { id: 'depart', libelle: 'chat', classe: 'depart' },
      { id: 'cible-1', libelle: 'fleur', classe: 'cible' },
      { id: 'cible-2', libelle: 'arbre', classe: 'cible' },
      { id: 'future-conforme', libelle: 'livre', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'chats', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de trou',
    texte: 'Marche sur les mots où tu entends le même son que dans « trou ».',
    regleCourte: 'Même son que dans « trou »',
    repere: { mot: 'trou', groupe: 'ou' },
    mots: [
      { id: 'depart', libelle: 'boule', classe: 'depart' },
      { id: 'cible-1', libelle: 'jour', classe: 'cible' },
      { id: 'cible-2', libelle: 'loup', classe: 'cible' },
      { id: 'future-conforme', libelle: 'route', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'roi', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de noir',
    texte: 'Marche sur les mots où tu entends le même son que dans « noir ».',
    regleCourte: 'Même son que dans « noir »',
    repere: { mot: 'noir', groupe: 'oi' },
    mots: [
      { id: 'depart', libelle: 'roi', classe: 'depart' },
      { id: 'cible-1', libelle: 'soir', classe: 'cible' },
      { id: 'cible-2', libelle: 'toit', classe: 'cible' },
      { id: 'future-conforme', libelle: 'poire', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'jour', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de main',
    texte: 'Marche sur les mots où tu entends le même son que dans « main ».',
    regleCourte: 'Même son que dans « main »',
    repere: { mot: 'main', groupe: 'ain' },
    mots: [
      { id: 'depart', libelle: 'lapin', classe: 'depart' },
      { id: 'cible-1', libelle: 'matin', classe: 'cible' },
      { id: 'cible-2', libelle: 'jardin', classe: 'cible' },
      { id: 'future-conforme', libelle: 'dinde', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'ballon', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de pont',
    texte: 'Marche sur les mots où tu entends le même son que dans « pont ».',
    regleCourte: 'Même son que dans « pont »',
    repere: { mot: 'pont', groupe: 'on' },
    mots: [
      { id: 'depart', libelle: 'ballon', classe: 'depart' },
      { id: 'cible-1', libelle: 'citron', classe: 'cible' },
      { id: 'cible-2', libelle: 'savon', classe: 'cible' },
      { id: 'future-conforme', libelle: 'bonbon', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'lapin', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de fille, avec exception ville',
    texte: 'Marche sur les mots où tu entends le même son que dans « fille ».',
    regleCourte: 'Même son que dans « fille »',
    repere: { mot: 'fille', groupe: 'ill' },
    mots: [
      { id: 'depart', libelle: 'fille', classe: 'depart' },
      { id: 'cible-1', libelle: 'bille', classe: 'cible' },
      { id: 'cible-2', libelle: 'quille', classe: 'cible' },
      { id: 'future-conforme', libelle: 'famille', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'ville', classe: 'leurre' },
    ],
  },
  {
    nom: 'absence du son de fille',
    texte: "Marche sur les mots où tu n'entends pas le même son que dans « fille ».",
    regleCourte: 'Pas le son de « fille »',
    repere: { mot: 'fille', groupe: 'ill' },
    mots: [
      { id: 'depart', libelle: 'balle', classe: 'depart' },
      { id: 'cible-1', libelle: 'salle', classe: 'cible' },
      { id: 'cible-2', libelle: 'colle', classe: 'cible' },
      { id: 'future-conforme', libelle: 'montagne', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'bille', classe: 'leurre' },
    ],
  },
  {
    nom: 'son de montagne',
    texte: 'Marche sur les mots où tu entends le même son que dans « montagne ».',
    regleCourte: 'Même son que dans « montagne »',
    repere: { mot: 'montagne', groupe: 'gn' },
    mots: [
      { id: 'depart', libelle: 'montagne', classe: 'depart' },
      { id: 'cible-1', libelle: 'ligne', classe: 'cible' },
      { id: 'cible-2', libelle: 'signe', classe: 'cible' },
      { id: 'future-conforme', libelle: 'agneau', classe: 'conforme-hors-etape' },
      { id: 'leurre', libelle: 'balle', classe: 'leurre' },
    ],
  },
];

function casesDe(fixture: FixtureSemantique): readonly CaseChemin[] {
  return fixture.mots.map((mot, index) => ({
    id: mot.id,
    libelle: mot.libelle,
    position: [index * 100, 0],
    // Chaîne volontaire : le helper doit retirer les voisins cachés dans les deux sens.
    voisines: fixture.mots
      .filter((_, voisin) => Math.abs(voisin - index) === 1)
      .map((voisin) => voisin.id),
    confusionAvec: null,
  }));
}

function contenuDe(fixture: FixtureSemantique): ContenuChemin {
  const cible = fixture.mots.filter((mot) => mot.classe === 'cible').map((mot) => mot.id);
  const depart = fixture.mots.find((mot) => mot.classe === 'depart');
  if (depart === undefined) throw new Error(`départ absent : ${fixture.nom}`);
  return {
    consignes: [
      {
        id: 'c1',
        texte: fixture.texte,
        forme: 'imperative',
        audio: null,
        depart: depart.id,
        parcours: cible,
        motsCles: ['marche', 'mots'],
      },
    ],
    cases: casesDe(fixture),
    competence: 'test.chemin',
  };
}

describe('preparerPlateauChemin — classes sémantiques bornées', () => {
  it.each(FIXTURES_SEMANTIQUES)('$nom : masque les mots conformes hors étape et garde les vrais leurres', (fixture) => {
    const plateau = preparerPlateauChemin(contenuDe(fixture), 0);
    const attendus = fixture.mots
      .filter((mot) => mot.classe !== 'conforme-hors-etape')
      .map((mot) => mot.id);

    expect(plateau.critereReconnu).toBe(true);
    expect(plateau.regleCourte).toBe(fixture.regleCourte);
    expect(plateau.repere).toEqual(fixture.repere);
    expect(plateau.cases.map((c) => c.id)).toEqual(attendus);
    expect(plateau.cases.find((c) => c.id === 'future-conforme')).toBeUndefined();
    expect(plateau.cases.find((c) => c.id === 'leurre')?.libelle).toBe(
      fixture.mots.find((mot) => mot.id === 'leurre')?.libelle,
    );

    const idsVisibles = new Set(plateau.cases.map((c) => c.id));
    for (const caseChemin of plateau.cases) {
      expect(caseChemin.voisines.every((id) => idsVisibles.has(id))).toBe(true);
    }
  });

  it('garde le plateau entier et le texte initial lorsque la chronologie ne peut pas être certifiée', () => {
    const contenu: ContenuChemin = {
      consignes: [
        {
          id: 'c1',
          texte: "Marche sur les images dans l'ordre de l'histoire.",
          forme: 'imperative',
          audio: null,
          depart: 'pont-un',
          parcours: ['pont-deux', 'pont-trois'],
          motsCles: ['marche', 'images', 'ordre'],
        },
      ],
      cases: [
        { id: 'pont-un', libelle: 'Le lapin est dans le jardin.', position: [0, 0], voisines: ['pont-deux'], confusionAvec: null },
        { id: 'pont-deux', libelle: 'Il a un vélo.', position: [100, 0], voisines: ['pont-un', 'pont-trois'], confusionAvec: null },
        { id: 'pont-trois', libelle: 'Le lapin tombe.', position: [200, 0], voisines: ['pont-deux'], confusionAvec: null },
      ],
      competence: 'comp.chronologie',
    };

    const plateau = preparerPlateauChemin(contenu, 0);

    expect(plateau.critereReconnu).toBe(false);
    expect(plateau.regleCourte).toBe(contenu.consignes[0]?.texte);
    expect(plateau.repere).toBeUndefined();
    expect(plateau.cases).toEqual(contenu.cases);
  });

  it('reconnaît ville comme conforme à la règle négative du son de fille', () => {
    const contenu = contenuDe({
      nom: 'ville sans le son de fille',
      texte: "Marche sur les mots où tu n'entends pas le même son que dans « fille ».",
      regleCourte: 'Pas le son de « fille »',
      mots: [
        { id: 'depart', libelle: 'balle', classe: 'depart' },
        { id: 'cible-1', libelle: 'salle', classe: 'cible' },
        { id: 'conforme-ville', libelle: 'ville', classe: 'conforme-hors-etape' },
        { id: 'leurre', libelle: 'bille', classe: 'leurre' },
      ],
    });

    const plateau = preparerPlateauChemin(contenu, 0);

    expect(plateau.critereReconnu).toBe(true);
    expect(plateau.cases.map((caseChemin) => caseChemin.id)).toEqual([
      'depart',
      'cible-1',
      'leurre',
    ]);
  });

  it('revient au plateau complet si une cible publiée contredit le critère reconnu', () => {
    const contenu = contenuDe({
      nom: 'cible b invalide',
      texte: 'Marche sur les mots où tu lis un b.',
      regleCourte: 'Avec la lettre b',
      mots: [
        { id: 'depart', libelle: 'la marche', classe: 'depart' },
        // Le constructeur met toute classe « cible » dans `parcours` : dos doit donc forcer
        // le repli plutôt que rester affiché sous un faux sceau « critère reconnu ».
        { id: 'cible-1', libelle: 'dos', classe: 'cible' },
        { id: 'leurre', libelle: 'bol', classe: 'leurre' },
      ],
    });

    const plateau = preparerPlateauChemin(contenu, 0);

    expect(plateau.critereReconnu).toBe(false);
    expect(plateau.regleCourte).toBe(contenu.consignes[0]?.texte);
    expect(plateau.cases).toEqual(contenu.cases);
  });

  it('ne déduit jamais qu’un mot phonétique inconnu satisfait une règle négative', () => {
    const contenu = contenuDe({
      nom: 'mot inconnu en négation phonétique',
      texte: "Marche sur les mots où tu n'entends pas le même son que dans « fille ».",
      regleCourte: 'Sans le son de fille',
      mots: [
        { id: 'depart', libelle: 'balle', classe: 'depart' },
        { id: 'cible-1', libelle: 'salle', classe: 'cible' },
        { id: 'inconnu', libelle: 'cigale', classe: 'leurre' },
        { id: 'leurre', libelle: 'bille', classe: 'leurre' },
      ],
    });

    const plateau = preparerPlateauChemin(contenu, 0);

    expect(plateau.critereReconnu).toBe(false);
    expect(plateau.regleCourte).toBe(contenu.consignes[0]?.texte);
    expect(plateau.cases).toEqual(contenu.cases);
  });
});

describe('preparerPlateauChemin — les sept contenus publiés', () => {
  it.each(CLASSES_ETAPES_REELLES)('$fichier $idEtape : le plateau ne confond pas une autre classe avec un leurre', (reference) => {
    const contenu = lireJson<ExerciceCheminLu>(reference.fichier).jeu.contenu;
    const indexEtape = contenu.consignes.findIndex((etape) => etape.id === reference.idEtape);
    const etape = contenu.consignes[indexEtape];
    expect(indexEtape).toBeGreaterThanOrEqual(0);
    expect(etape).toBeDefined();

    const plateau = preparerPlateauChemin(contenu, indexEtape);

    if (reference.conformes === null) {
      // Cité : l'ordre est une vraie règle, mais son oracle attend le texte-source absent.
      expect(plateau.critereReconnu).toBe(false);
      expect(plateau.regleCourte).toBe(etape?.texte);
      expect(plateau.cases).toEqual(contenu.cases);
      return;
    }

    const conformes = new Set(reference.conformes);
    const segmentIds = new Set([etape?.depart ?? '', ...(etape?.parcours ?? [])]);
    const cibleIds = new Set(etape?.parcours ?? []);
    const visibles = new Set(plateau.cases.map((caseChemin) => caseChemin.id));
    const libellesParId = new Map(contenu.cases.map((caseChemin) => [caseChemin.id, caseChemin.libelle]));

    expect(plateau.critereReconnu).toBe(true);

    // La cible et son départ restent toujours lisibles, mais tous les autres mots conformes
    // sont cachés : c'est la garde contre le refus d'une bonne réponse d'un lot futur.
    for (const id of segmentIds) {
      expect(visibles.has(id)).toBe(true);
    }
    for (const id of cibleIds) {
      expect(conformes.has(libellesParId.get(id) ?? '')).toBe(true);
    }
    for (const caseChemin of contenu.cases) {
      if (segmentIds.has(caseChemin.id)) continue;
      expect(visibles.has(caseChemin.id)).toBe(!conformes.has(caseChemin.libelle));
    }

    // Le filtrage ne casse aucun trajet, et un enfant garde au moins un vrai choix à chaque
    // pas vivant : le départ et les cases visitées dans CETTE étape ne sont plus disponibles.
    const casesVisiblesParId = new Map(plateau.cases.map((caseChemin) => [caseChemin.id, caseChemin]));
    const itineraire = [etape?.depart ?? '', ...(etape?.parcours ?? [])];
    const visites = new Set<string>();
    for (let index = 0; index < itineraire.length - 1; index += 1) {
      const position = itineraire[index] ?? '';
      const suivante = itineraire[index + 1] ?? '';
      const courante = casesVisiblesParId.get(position);
      expect(courante?.voisines).toContain(suivante);
      visites.add(position);
      const choixVivants = (courante?.voisines ?? []).filter((id) => !visites.has(id));
      expect(choixVivants).toContain(suivante);
      expect(choixVivants.length).toBeGreaterThanOrEqual(2);
      // Aucun raccourci conforme ne doit être montré puis refusé par l'ordre du réducteur.
      expect(choixVivants.filter((id) => conformes.has(libellesParId.get(id) ?? ''))).toEqual([suivante]);
    }

    // Aucune arête ne pointe vers une pierre masquée : le composant peut dessiner le plateau
    // préparé sans fabriquer une ligne vers une cible qu'il ne rend pas.
    for (const caseChemin of plateau.cases) {
      expect(caseChemin.voisines.every((id) => visibles.has(id))).toBe(true);
    }
  });
});
