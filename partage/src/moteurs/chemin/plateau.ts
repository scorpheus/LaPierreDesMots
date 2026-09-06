/**
 * Préparation du plateau visible de `chemin`.
 *
 * Les phrases reconnues et leurs classes phonétiques sont DÉLIBÉRÉMENT bornées aux sept fiches
 * livrées. Ce module ne devine pas la prononciation d'un mot français : un seul mot inconnu
 * force le repli conservateur vers le plateau entier. C'est particulièrement important pour
 * « sans le son de fille » : l'absence d'un mot dans une liste n'établit jamais son absence de
 * son /j/.
 */

import type { CaseChemin, ContenuChemin } from './types.js';

export interface PlateauCheminPrepare {
  readonly cases: readonly CaseChemin[];
  readonly regleCourte: string;
  readonly critereReconnu: boolean;
  /** Mot de comparaison et graphème sonore à souligner dans l'interface. */
  readonly repere?: { readonly mot: string; readonly groupe: string };
}

type VerdictCritere = boolean | null;

interface CriterePlateau {
  readonly regleCourte: string;
  readonly repere?: { readonly mot: string; readonly groupe: string };
  classer(libelle: string): VerdictCritere;
}

function normaliser(libelle: string): string {
  return libelle.trim().toLocaleLowerCase('fr-FR');
}

function critereLettre(lettre: string, inverse: boolean, regleCourte: string): CriterePlateau {
  return {
    regleCourte,
    classer(libelle): VerdictCritere {
      const contient = normaliser(libelle).includes(lettre);
      return inverse ? !contient : contient;
    },
  };
}

/**
 * Classe un corpus fermé de libellés. `null` n'est pas « faux » : c'est précisément la porte
 * de sûreté qui empêche de cacher une bonne réponse ajoutée plus tard sans visa phonologique.
 */
function critereSon(
  regleCourte: string,
  repere: { readonly mot: string; readonly groupe: string },
  conformes: readonly string[],
  contraires: readonly string[],
): CriterePlateau {
  const oui = new Set(conformes.map(normaliser));
  const non = new Set(contraires.map(normaliser));
  return {
    regleCourte,
    repere,
    classer(libelle): VerdictCritere {
      const mot = normaliser(libelle);
      if (oui.has(mot)) return true;
      if (non.has(mot)) return false;
      return null;
    },
  };
}

const MARAIS_OU = ['boule', 'jour', 'loup', 'poule', 'four', 'tour', 'cour', 'route'] as const;
const MARAIS_OI = ['roi', 'soir', 'toit', 'poire'] as const;
const MARAIS_IN = ['lapin', 'matin', 'jardin', 'sapin', 'pain', 'copain', 'raisin', 'dinde'] as const;
const MARAIS_ON = ['ballon', 'citron', 'savon', 'bonbon'] as const;
const VOLCAN_ILL = ['fille', 'bille', 'quille', 'famille'] as const;
const VOLCAN_GN = ['montagne', 'ligne', 'signe', 'agneau'] as const;
const VOLCAN_L = ['balle', 'salle', 'colle', 'pile'] as const;
const VOLCAN_SANS_ILL = [...VOLCAN_L, ...VOLCAN_GN] as const;

const CRITERES_PAR_TEXTE: ReadonlyMap<string, CriterePlateau> = new Map([
  ['Suis le chemin des mots avec la lettre a.', critereLettre('a', false, 'Avec la lettre a')],
  ['Suis le chemin des mots avec la lettre i.', critereLettre('i', false, 'Avec la lettre i')],
  ['Suis le chemin des mots avec la lettre o.', critereLettre('o', false, 'Avec la lettre o')],
  ['Suis le chemin des mots avec la lettre u.', critereLettre('u', false, 'Avec la lettre u')],
  ['Marche sur les mots qui ont un s.', critereLettre('s', false, 'Avec la lettre s')],
  ["Marche sur les mots qui n'ont pas de s.", critereLettre('s', true, 'Sans la lettre s')],
  ['Marche aussi sur les mots qui ont un s.', critereLettre('s', false, 'Avec la lettre s')],
  ['Marche sur les mots où tu lis un b.', critereLettre('b', false, 'Avec la lettre b')],
  ['Marche sur les mots où tu lis un d.', critereLettre('d', false, 'Avec la lettre d')],
  ['Marche sur les autres mots où tu lis un b.', critereLettre('b', false, 'Avec la lettre b')],
  ['Marche sur les derniers mots où tu lis un d.', critereLettre('d', false, 'Avec la lettre d')],
  [
    'Marche sur les mots où tu entends le même son que dans « trou ».',
    critereSon('Même son que dans « trou »', { mot: 'trou', groupe: 'ou' }, MARAIS_OU, MARAIS_OI),
  ],
  [
    'Marche sur les autres mots où tu entends le même son que dans « trou ».',
    critereSon('Même son que dans « trou »', { mot: 'trou', groupe: 'ou' }, MARAIS_OU, MARAIS_OI),
  ],
  [
    'Marche sur les mots où tu entends le même son que dans « noir ».',
    critereSon('Même son que dans « noir »', { mot: 'noir', groupe: 'oi' }, MARAIS_OI, MARAIS_OU),
  ],
  [
    'Marche sur les mots où tu entends le même son que dans « main ».',
    critereSon('Même son que dans « main »', { mot: 'main', groupe: 'ain' }, MARAIS_IN, MARAIS_ON),
  ],
  [
    'Marche sur les autres mots où tu entends le même son que dans « main ».',
    critereSon('Même son que dans « main »', { mot: 'main', groupe: 'ain' }, MARAIS_IN, MARAIS_ON),
  ],
  [
    'Marche sur les mots où tu entends le même son que dans « pont ».',
    critereSon('Même son que dans « pont »', { mot: 'pont', groupe: 'on' }, MARAIS_ON, MARAIS_IN),
  ],
  [
    'Marche sur les mots où tu entends le même son que dans « fille ».',
    critereSon(
      'Même son que dans « fille »',
      { mot: 'fille', groupe: 'ill' },
      VOLCAN_ILL,
      [...VOLCAN_SANS_ILL, 'ville'],
    ),
  ],
  [
    "Marche sur les mots où tu n'entends pas le même son que dans « fille ».",
    critereSon(
      'Pas le son de « fille »',
      { mot: 'fille', groupe: 'ill' },
      [...VOLCAN_SANS_ILL, 'ville'],
      VOLCAN_ILL,
    ),
  ],
  [
    'Marche sur les mots où tu entends le même son que dans « montagne ».',
    critereSon(
      'Même son que dans « montagne »',
      { mot: 'montagne', groupe: 'gn' },
      VOLCAN_GN,
      [...VOLCAN_ILL, ...VOLCAN_L, 'ville'],
    ),
  ],
]);

function repli(contenu: ContenuChemin, texte: string): PlateauCheminPrepare {
  return { cases: contenu.cases, regleCourte: texte, critereReconnu: false };
}

export function preparerPlateauChemin(
  contenu: ContenuChemin,
  indexEtape: number,
): PlateauCheminPrepare {
  const etape = contenu.consignes[indexEtape];
  if (etape === undefined) return repli(contenu, '');

  const critere = CRITERES_PAR_TEXTE.get(etape.texte);
  if (critere === undefined) return repli(contenu, etape.texte);

  const classifications = contenu.cases.map((caseChemin) => ({
    caseChemin,
    conforme: critere.classer(caseChemin.libelle),
  }));
  if (classifications.some(({ conforme }) => conforme === null)) return repli(contenu, etape.texte);

  const conformeParId = new Map(
    classifications.map(({ caseChemin, conforme }) => [caseChemin.id, conforme]),
  );
  if (etape.parcours.some((id) => conformeParId.get(id) !== true)) {
    // Une cible contradictoire ne doit jamais hériter du sceau « critère reconnu » uniquement
    // parce que son id appartient au segment : on conserve alors le plateau original, visible
    // à la relecture plutôt que de cacher un défaut de contenu.
    return repli(contenu, etape.texte);
  }

  const segment = new Set([etape.depart, ...etape.parcours]);
  const idsVisibles = new Set(
    classifications
      .filter(({ caseChemin, conforme }) => segment.has(caseChemin.id) || conforme === false)
      .map(({ caseChemin }) => caseChemin.id),
  );

  return {
    cases: contenu.cases
      .filter((caseChemin) => idsVisibles.has(caseChemin.id))
      .map((caseChemin) => ({
        ...caseChemin,
        voisines: caseChemin.voisines.filter((id) => idsVisibles.has(id)),
      })),
    regleCourte: critere.regleCourte,
    critereReconnu: true,
    repere: critere.repere,
  };
}
