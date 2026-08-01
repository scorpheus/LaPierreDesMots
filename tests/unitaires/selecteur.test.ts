/**
 * Sélecteur de sortie — propriétés P9 à P12, 200 sorties simulées. Lot L2-D, v2 § 5.2 et § 12.1.
 *
 * Le sélecteur est l'endroit où une régression est la plus invisible : il ne plante pas, il
 * propose simplement de moins en moins la bonne chose. D'où des propriétés sur des entrées
 * engendrées, et un compte explicite de sorties simulées — pas trois exemples écrits à la main.
 *
 * `alea` est injecté partout : deux appels avec la même graine et la même entrée rendent le
 * même plan. C'est ce qui rend `test:rejeu` interprétable.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ErreurPierre, creerAlea } from '@pierre/partage';
import { composerSortie, raccourcirSortie } from '@partage/pedagogie/selecteur.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';

import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';

import type {
  Competence, EntreeSelecteur, EtatMaitrise, ItemLeitner, NoeudCandidat, PlanSortie,
} from '@pierre/partage';

const PARAMETRES = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json')
);
const CONTRAINTES = PARAMETRES.selecteur;

/** Un référentiel court, mais avec une VRAIE chaîne de prérequis : sans elle, P11 ne dit rien. */
const COMPETENCES: readonly Competence[] = [
  { code: 'gph.a', libelle: 'a', famille: 'gph', prerequis: [] },
  { code: 'gph.ou', libelle: 'ou', famille: 'gph', prerequis: ['gph.a'] },
  { code: 'syl.cv', libelle: 'consonne-voyelle', famille: 'syl', prerequis: ['gph.a', 'gph.ou'] },
  { code: 'mot.outil.le', libelle: 'le', famille: 'mot.outil', prerequis: [] },
  { code: 'lex.couleur', libelle: 'couleur', famille: 'lex', prerequis: ['gph.a'] },
];
const CODES = COMPETENCES.map((c) => c.code);

const arbCandidat = fc
  .record({
    indice: fc.integer({ min: 0, max: 39 }),
    competences: fc.uniqueArray(fc.constantFrom(...CODES), { minLength: 1, maxLength: 3 }),
    difficulte: fc.integer({ min: 1, max: 5 }),
    temps: fc.constantFrom(
      'presentation' as const, 'developpement' as const,
      'retournement' as const, 'maitrise' as const
    ),
  })
  .map(
    (brut): NoeudCandidat => ({
      noeud: `clairiere-${String(brut.indice).padStart(2, '0')}`,
      habillage: `clairiere.h${String(brut.indice).padStart(2, '0')}`,
      region: 'clairiere',
      competences: brut.competences,
      difficulte: brut.difficulte,
      temps: brut.temps,
    })
  );

const arbMaitrises = fc
  .array(fc.double({ min: 0, max: 1, noNaN: true }), {
    minLength: CODES.length,
    maxLength: CODES.length,
  })
  .map((valeurs): readonly EtatMaitrise[] =>
    CODES.map((code, i) => ({
      competence: code,
      p: valeurs[i] as number,
      nbTentatives: 5,
      joursDistincts: ['2026-08-01', '2026-08-02', '2026-08-03'],
      nbTentativesFaibleDevinette: 2,
      acquiseLe: null,
    }))
  );

const arbRevisions = fc
  .uniqueArray(fc.constantFrom('gph.a', 'gph.ou', 'mot.outil.le', 'lex.couleur', 'syl.cv'), {
    maxLength: 5,
  })
  .map((items): readonly ItemLeitner[] =>
    items.map((item) => ({
      item,
      boite: 2,
      derniereRevueLe: INSTANT_DE_REFERENCE,
      echeanceLe: INSTANT_DE_REFERENCE,
      nbRevues: 1,
    }))
  );

/**
 * Deux nœuds SOCLE, toujours présents et toujours éligibles : ils ne portent que `gph.a`, qui
 * n'a aucun prérequis.
 *
 * Sans eux, une entrée sur deux est refusée parce que le tirage a mis toutes les maîtrises sous
 * le seuil, et « 200 sorties simulées » n'en simule alors que 85. Les candidats engendrés
 * gardent, eux, leurs compétences à prérequis : P11 conserve toutes ses dents.
 */
const SOCLE: readonly NoeudCandidat[] = [
  {
    noeud: 'clairiere-socle-a', habillage: 'clairiere.socle-a', region: 'clairiere',
    competences: ['gph.a'], difficulte: 1, temps: 'presentation',
  },
  {
    noeud: 'clairiere-socle-b', habillage: 'clairiere.socle-b', region: 'clairiere',
    competences: ['mot.outil.le'], difficulte: 5, temps: 'maitrise',
  },
];

const arbEntree = fc
  .record({
    candidats: fc.uniqueArray(arbCandidat, {
      selector: (c) => c.habillage,
      minLength: 2,
      maxLength: 14,
    }),
    maitrises: arbMaitrises,
    revisions: arbRevisions,
    compagnon: fc.constantFrom('filou' as const, 'bulle' as const, null),
  })
  .map(
    (brut): EntreeSelecteur => ({
      profil: 'profil-test',
      region: 'clairiere',
      compagnon: brut.compagnon,
      maitrises: brut.maitrises,
      revisionsDues: brut.revisions,
      noeudsDisponibles: [...brut.candidats, ...SOCLE],
      competences: COMPETENCES,
      maintenant: INSTANT_DE_REFERENCE,
    })
  );

const arbGraine = fc.integer({ min: 0, max: 2 ** 31 - 1 });

/** Compose, ou rend `null` quand le sélecteur refuse — un refus n'est pas un échec de propriété. */
function composerOuNull(entree: EntreeSelecteur, graine: number): PlanSortie | null {
  try {
    return composerSortie(entree, PARAMETRES, creerAlea(graine));
  } catch (erreur) {
    if (ErreurPierre.porteLeCode(erreur, 'contenu-invalide')) {
      return null;
    }
    throw erreur;
  }
}

function pDe(maitrises: readonly EtatMaitrise[], code: string): number {
  return maitrises.find((m) => m.competence === code)?.p ?? 0;
}

// ───────────────────────────────────────────────────────────── P9

describe('P9 — jamais deux fois le même habillage dans une sortie (R13)', () => {
  it('sur 200 sorties simulées, aucun habillage répété', () => {
    let sorties = 0;
    let repetitions = 0;
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        sorties += 1;
        const habillages = plan.etapes.map((e) => e.habillage);
        if (new Set(habillages).size !== habillages.length) {
          repetitions += 1;
        }
      }),
      { numRuns: 200 }
    );
    expect(sorties).toBeGreaterThanOrEqual(200);
    expect(repetitions).toBe(0);
  });

  it('ne propose jamais deux fois le même nœud non plus', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        const noeuds = plan.etapes.map((e) => e.noeud);
        expect(new Set(noeuds).size).toBe(noeuds.length);
      }),
      { numRuns: 200 }
    );
  });
});

// ───────────────────────────────────────────────────────────── P10

describe('P10 — rang 1 toujours `echauffement`, dernier rang toujours `synthese`', () => {
  it('sur toutes les sorties composables', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        expect(plan.etapes.length).toBeGreaterThanOrEqual(2);
        expect(plan.etapes[0]?.role).toBe('echauffement');
        expect(plan.etapes[plan.etapes.length - 1]?.role).toBe('synthese');
      }),
      { numRuns: 200 }
    );
  });

  it('les rangs sont 1..n, sans trou et dans l’ordre', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        expect(plan.etapes.map((e) => e.rang)).toEqual(
          plan.etapes.map((_, i) => i + 1)
        );
      }),
      { numRuns: 200 }
    );
  });

  it('la longueur reste dans les bornes déclarées quand le vivier le permet', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        expect(plan.etapes.length).toBeLessThanOrEqual(CONTRAINTES.nbNoeudsMax);
      }),
      { numRuns: 200 }
    );
  });

  it('refuse plutôt que de rendre une sortie d’un seul nœud — une sortie a une ouverture ET une clôture', () => {
    const entree: EntreeSelecteur = {
      profil: 'profil-test',
      region: 'clairiere',
      compagnon: null,
      maitrises: [],
      revisionsDues: [],
      noeudsDisponibles: [
        {
          noeud: 'clairiere-01', habillage: 'clairiere.ecole', region: 'clairiere',
          competences: ['gph.a'], difficulte: 1, temps: 'presentation',
        },
      ],
      competences: COMPETENCES,
      maintenant: INSTANT_DE_REFERENCE,
    };
    let leve: unknown = null;
    try {
      composerSortie(entree, PARAMETRES, creerAlea(1));
    } catch (erreur) {
      leve = erreur;
    }
    expect(ErreurPierre.porteLeCode(leve, 'contenu-invalide')).toBe(true);
  });

  it('refuse quand aucun nœud de la région n’est disponible', () => {
    const entree: EntreeSelecteur = {
      profil: 'profil-test',
      region: 'volcan',
      compagnon: null,
      maitrises: [],
      revisionsDues: [],
      noeudsDisponibles: [
        {
          noeud: 'clairiere-01', habillage: 'clairiere.ecole', region: 'clairiere',
          competences: ['gph.a'], difficulte: 1, temps: 'presentation',
        },
      ],
      competences: COMPETENCES,
      maintenant: INSTANT_DE_REFERENCE,
    };
    expect(() => composerSortie(entree, PARAMETRES, creerAlea(1))).toThrow(ErreurPierre);
  });
});

// ───────────────────────────────────────────────────────────── P11

describe('P11 — aucune compétence dont un prérequis est sous `seuilPrerequis` (v2 § 12.1)', () => {
  it('sur 200 sorties simulées, aucune étape ne viole la chaîne de prérequis', () => {
    let etapesVerifiees = 0;
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        for (const etape of plan.etapes) {
          for (const code of etape.competences) {
            const competence = COMPETENCES.find((c) => c.code === code);
            expect(competence).toBeDefined();
            for (const prerequis of competence?.prerequis ?? []) {
              expect(pDe(entree.maitrises, prerequis)).toBeGreaterThanOrEqual(
                CONTRAINTES.seuilPrerequis
              );
            }
            etapesVerifiees += 1;
          }
        }
      }),
      { numRuns: 200 }
    );
    // Un sélecteur qui ne proposerait jamais rien passerait la propriété sans rien prouver.
    expect(etapesVerifiees).toBeGreaterThan(0);
  });

  it('propose `syl.cv` quand ses deux prérequis sont acquis, et jamais quand un seul manque', () => {
    const candidats: readonly NoeudCandidat[] = [
      { noeud: 'n1', habillage: 'h1', region: 'clairiere', competences: ['gph.a'], difficulte: 1, temps: 'presentation' },
      { noeud: 'n2', habillage: 'h2', region: 'clairiere', competences: ['gph.a'], difficulte: 2, temps: 'developpement' },
      { noeud: 'n3', habillage: 'h3', region: 'clairiere', competences: ['syl.cv'], difficulte: 3, temps: 'retournement' },
      { noeud: 'n4', habillage: 'h4', region: 'clairiere', competences: ['gph.a'], difficulte: 4, temps: 'maitrise' },
    ];
    const base = {
      profil: 'p', region: 'clairiere' as const, compagnon: null,
      revisionsDues: [], noeudsDisponibles: candidats,
      competences: COMPETENCES, maintenant: INSTANT_DE_REFERENCE,
    };
    const maitrise = (gphA: number, gphOu: number): readonly EtatMaitrise[] =>
      [
        { competence: 'gph.a', p: gphA, nbTentatives: 5, joursDistincts: [], nbTentativesFaibleDevinette: 2, acquiseLe: null },
        { competence: 'gph.ou', p: gphOu, nbTentatives: 5, joursDistincts: [], nbTentativesFaibleDevinette: 2, acquiseLe: null },
      ];

    const avec = composerSortie({ ...base, maitrises: maitrise(0.9, 0.9) }, PARAMETRES, creerAlea(7));
    expect(avec.etapes.some((e) => e.competences.includes('syl.cv'))).toBe(true);

    const sans = composerSortie({ ...base, maitrises: maitrise(0.9, 0.1) }, PARAMETRES, creerAlea(7));
    expect(sans.etapes.some((e) => e.competences.includes('syl.cv'))).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────── P12

describe('P12 — les révisions dues sont au rang `rangRevision`, jamais en 1 ni en dernier', () => {
  it('sur 200 sorties simulées', () => {
    let sortiesAvecRevision = 0;
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;

        const porteuses = plan.etapes.filter((e) => e.revisions.length > 0);
        if (porteuses.length > 0) sortiesAvecRevision += 1;

        for (const etape of porteuses) {
          expect(etape.rang).toBe(CONTRAINTES.rangRevision);
          expect(etape.role).toBe('revision');
          expect(etape.rang).not.toBe(1);
          expect(etape.rang).not.toBe(plan.etapes.length);
        }
        // Une seule étape porte des révisions, jamais deux.
        expect(porteuses.length).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 }
    );
    // Sans cette borne, un sélecteur qui n'injecterait JAMAIS de révision passerait P12.
    expect(sortiesAvecRevision).toBeGreaterThan(0);
  });

  it('n’invente jamais une révision qui n’était pas due', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        const dues = new Set(entree.revisionsDues.map((i) => i.item));
        for (const etape of plan.etapes) {
          for (const revision of etape.revisions) {
            expect(dues.has(revision)).toBe(true);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it('le rôle `revision` n’apparaît qu’au rang `rangRevision`', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        for (const etape of plan.etapes) {
          if (etape.role === 'revision') {
            expect(etape.rang).toBe(CONTRAINTES.rangRevision);
          }
        }
      }),
      { numRuns: 200 }
    );
  });
});

// ───────────────────────────────────────────────────── déterminisme et pureté

describe('déterminisme — c’est ce qui rend `test:rejeu` interprétable', () => {
  it('même graine, même entrée, même plan — au champ près', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const a = composerOuNull(entree, graine);
        const b = composerOuNull(entree, graine);
        expect(b).toEqual(a);
      }),
      { numRuns: 100 }
    );
  });

  it('reconduit le profil, la région et le compagnon sans les inventer', () => {
    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const plan = composerOuNull(entree, graine);
        if (plan === null) return;
        expect(plan.profil).toBe(entree.profil);
        expect(plan.region).toBe(entree.region);
        expect(plan.compagnon).toBe(entree.compagnon);
        expect(plan.composeeLe).toBe(entree.maintenant);
      }),
      { numRuns: 100 }
    );
  });
});

// ───────────────────────────────────────────────────────────── raccourcirSortie

describe('raccourcirSortie — une session écourtée se termine quand même par une victoire', () => {
  function planDeReference(): PlanSortie {
    const candidats: readonly NoeudCandidat[] = Array.from({ length: 6 }, (_, i) => ({
      noeud: `n${String(i)}`,
      habillage: `h${String(i)}`,
      region: 'clairiere' as const,
      competences: ['gph.a'],
      difficulte: i + 1,
      temps: 'developpement' as const,
    }));
    return composerSortie(
      {
        profil: 'p', region: 'clairiere', compagnon: null, maitrises: [],
        revisionsDues: [
          { item: 'gph.a', boite: 1, derniereRevueLe: INSTANT_DE_REFERENCE, echeanceLe: INSTANT_DE_REFERENCE, nbRevues: 0 },
        ],
        noeudsDisponibles: candidats, competences: COMPETENCES,
        maintenant: INSTANT_DE_REFERENCE,
      },
      PARAMETRES,
      creerAlea(3)
    );
  }

  it('garde toujours une clôture en `synthese`, à tout rang atteint', () => {
    const plan = planDeReference();
    for (let rang = 0; rang <= plan.etapes.length + 2; rang += 1) {
      const court = raccourcirSortie(plan, rang);
      expect(court.etapes.length).toBeGreaterThanOrEqual(1);
      expect(court.etapes[court.etapes.length - 1]?.role).toBe('synthese');
      expect(court.etapes.map((e) => e.rang)).toEqual(court.etapes.map((_, i) => i + 1));
    }
  });

  it('ne garde jamais deux synthèses', () => {
    const plan = planDeReference();
    for (let rang = 0; rang <= plan.etapes.length; rang += 1) {
      const court = raccourcirSortie(plan, rang);
      expect(court.etapes.filter((e) => e.role === 'synthese')).toHaveLength(1);
    }
  });

  it('ne rallonge jamais la sortie', () => {
    const plan = planDeReference();
    for (let rang = 0; rang <= plan.etapes.length + 2; rang += 1) {
      expect(raccourcirSortie(plan, rang).etapes.length).toBeLessThanOrEqual(
        plan.etapes.length
      );
    }
  });

  it('conserve les étapes déjà jouées, dans le même ordre', () => {
    const plan = planDeReference();
    const court = raccourcirSortie(plan, 2);
    expect(court.etapes.slice(0, 2).map((e) => e.noeud)).toEqual(
      plan.etapes.slice(0, 2).map((e) => e.noeud)
    );
    expect(court.etapes[court.etapes.length - 1]?.noeud).toBe(
      plan.etapes[plan.etapes.length - 1]?.noeud
    );
  });

  it('rend le plan inchangé quand rien n’est à couper', () => {
    const plan = planDeReference();
    expect(raccourcirSortie(plan, plan.etapes.length)).toEqual(plan);
  });
});

// ───────────────────────────────────────────────────── branches défensives

describe('branches défensives', () => {
  const candidat = (i: number, competences: readonly string[] = ['gph.a']): NoeudCandidat => ({
    noeud: `n${String(i)}`,
    habillage: `h${String(i)}`,
    region: 'clairiere',
    competences,
    difficulte: i,
    temps: 'developpement',
  });

  const entreeAvec = (
    candidats: readonly NoeudCandidat[],
    surcharge: Partial<EntreeSelecteur> = {}
  ): EntreeSelecteur => ({
    profil: 'p', region: 'clairiere', compagnon: null, maitrises: [],
    revisionsDues: [], noeudsDisponibles: candidats, competences: COMPETENCES,
    maintenant: INSTANT_DE_REFERENCE,
    ...surcharge,
  });

  it('écarte un nœud dont une compétence est absente du référentiel', () => {
    // Une compétence inconnue n'a pas de chaîne de prérequis lisible : la supposer sans
    // prérequis ferait sauter la progression phonologique en silence.
    const plan = composerSortie(
      entreeAvec([candidat(1), candidat(2), candidat(3, ['gph.inconnue']), candidat(4)]),
      PARAMETRES,
      creerAlea(11)
    );
    expect(plan.etapes.some((e) => e.competences.includes('gph.inconnue'))).toBe(false);
  });

  it('écarte un nœud sans aucune compétence — il ne travaille rien', () => {
    const plan = composerSortie(
      entreeAvec([candidat(1), candidat(2), candidat(3, []), candidat(4)]),
      PARAMETRES,
      creerAlea(11)
    );
    expect(plan.etapes.some((e) => e.noeud === 'n3')).toBe(false);
  });

  it('autorise le doublon d’habillage quand la contrainte R13 est levée en données', () => {
    const memeHabillage = [1, 2, 3, 4, 5].map((i) => ({
      ...candidat(i),
      habillage: 'clairiere.unique',
    }));
    const sansContrainte = {
      ...PARAMETRES,
      selecteur: { ...CONTRAINTES, habillageUniqueParSortie: false },
    };
    const plan = composerSortie(entreeAvec(memeHabillage), sansContrainte, creerAlea(5));
    expect(plan.etapes.length).toBeGreaterThan(1);
    expect(new Set(plan.etapes.map((e) => e.habillage)).size).toBe(1);
  });

  it('trie de façon totale quand deux nœuds ont la même difficulté', () => {
    const memeDifficulte = ['b', 'a', 'c', 'd'].map((nom) => ({
      ...candidat(1),
      noeud: nom,
      habillage: `h-${nom}`,
    }));
    const un = composerSortie(entreeAvec(memeDifficulte), PARAMETRES, creerAlea(9));
    const deux = composerSortie(
      entreeAvec([...memeDifficulte].reverse()),
      PARAMETRES,
      creerAlea(9)
    );
    // L'ouverture et la clôture ne dépendent pas de l'ordre d'arrivée des candidats.
    expect(deux.etapes[0]?.noeud).toBe(un.etapes[0]?.noeud);
    expect(deux.etapes[deux.etapes.length - 1]?.noeud).toBe(
      un.etapes[un.etapes.length - 1]?.noeud
    );
  });

  it('n’injecte aucune révision quand la sortie est trop courte pour avoir un rang de révision', () => {
    const revisions = [
      { item: 'gph.a', boite: 1 as const, derniereRevueLe: INSTANT_DE_REFERENCE,
        echeanceLe: INSTANT_DE_REFERENCE, nbRevues: 0 },
    ];
    const plan = composerSortie(
      entreeAvec([candidat(1), candidat(2)], { revisionsDues: revisions }),
      PARAMETRES,
      creerAlea(2)
    );
    expect(plan.etapes).toHaveLength(2);
    expect(plan.etapes.every((e) => e.revisions.length === 0)).toBe(true);
    expect(plan.etapes.map((e) => e.role)).toEqual(['echauffement', 'synthese']);
  });

  it('raccourcit un plan vide sans lever', () => {
    const vide: PlanSortie = {
      profil: 'p', region: 'clairiere', compagnon: null, etapes: [],
      composeeLe: INSTANT_DE_REFERENCE,
    };
    expect(raccourcirSortie(vide, 3)).toEqual(vide);
  });

  it('traite un rang atteint négatif comme zéro : il reste la seule clôture', () => {
    const plan = composerSortie(
      entreeAvec([candidat(1), candidat(2), candidat(3), candidat(4)]),
      PARAMETRES,
      creerAlea(4)
    );
    const court = raccourcirSortie(plan, -7);
    expect(court.etapes).toHaveLength(1);
    expect(court.etapes[0]?.role).toBe('synthese');
    expect(court.etapes[0]?.rang).toBe(1);
  });
});
