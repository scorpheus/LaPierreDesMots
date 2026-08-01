/**
 * Le contrat du moteur `trace` — contrat gelé § 4.3.3, point ouvert O11.
 *
 * Ce fichier garde la seule chose que rien d'autre dans le dépôt ne garde : **l'axe de la
 * confusion**. D23, conséquence 1 : ne jamais traiter `b/d/p/q` en bloc. Un moteur qui rend
 * toujours `axe: null` est un moteur creux, et c'est le contrat de sortie du lot (§ 10.4) —
 * mesuré ici, sur les modèles réels, et pas affirmé.
 *
 * Les données viennent de `contenu/modeles-lettres/minuscules.json` et des deux exercices
 * réels : un test qui dessinerait ses propres lettres ne prouverait rien sur celles que
 * l'enfant tracera.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  COUVERTURE_MINIMALE,
  REFUS_TRACE_COMPTE_ERREUR,
  TOLERANCE_TRACE_PX,
  axeConfondu,
  couvertureOrientee,
  evaluerTrait,
  refleterPoints,
  sensRespecte,
  toleranceViewBox,
} from '@partage/moteurs/trace/validation';
import { moteurTrace } from '@partage/moteurs/trace/moteur';
import { SCHEMA_CONTENU_TRACE } from '@partage/moteurs/trace/schema-contenu';
import { RANG_AIDE } from '@partage/moteurs/commun/aide';

import type {
  ActionTrace,
  ContenuTrace,
  EchantillonGeste,
  EtatTrace,
  ModeleLettre,
  TraitLettre,
} from '@partage/moteurs/trace/index';
import type { AxeMiroir } from '@partage/pedagogie/types';
import type { Exercice, Habillage } from '@pierre/partage';

import { aleaDeTest, horlogeDeTest, lireJson } from '../configuration/preparation.js';

const CHEMIN_LETTRES = 'contenu/modeles-lettres/minuscules.json';
const CHEMIN_BD = 'contenu/exercices/galeries/miroir-bd-01.json';
const CHEMIN_BP = 'contenu/exercices/galeries/miroir-bp-01.json';
const CHEMIN_HABILLAGE = 'contenu/habillages/galeries/tracer-cristal.habillage.json';

const bibliotheque = lireJson<{ lettres: ModeleLettre[] }>(CHEMIN_LETTRES);
const parLettre = new Map(bibliotheque.lettres.map((l) => [l.lettre, l]));

const exerciceBd = lireJson<Exercice>(CHEMIN_BD);
const exerciceBp = lireJson<Exercice>(CHEMIN_BP);
const contenuBd = exerciceBd.jeu.contenu as ContenuTrace;
const contenuBp = exerciceBp.jeu.contenu as ContenuTrace;
const habillage = lireJson<Habillage>(CHEMIN_HABILLAGE);

const contexte = { alea: aleaDeTest(), horloge: horlogeDeTest() };

/** Un geste parfait : le modèle lui-même, dans son sens, un instant par point. */
function gesteParfait(trait: TraitLettre): readonly EchantillonGeste[] {
  return trait.points.map((point, i) => ({ point, instantMs: 1000 + i * 40 }));
}

/** Le même geste, à l'envers. */
function gesteInverse(trait: TraitLettre): readonly EchantillonGeste[] {
  return [...gesteParfait(trait)].reverse().map((e, i) => ({ ...e, instantMs: 1000 + i * 40 }));
}

/** Le geste d'un enfant qui trace la lettre JUMELLE au lieu de celle qu'on lui demande. */
function gesteDuJumeau(jumeau: ModeleLettre, libelle: string): readonly EchantillonGeste[] | null {
  const trait = jumeau.traits.find((t) => t.libelle === libelle);
  if (trait === undefined) return null;
  return gesteParfait(trait);
}

describe('couvertureOrientee — la mesure sur laquelle tout repose', () => {
  it('un modèle se couvre lui-même entièrement', () => {
    for (const lettre of bibliotheque.lettres) {
      for (const trait of lettre.traits) {
        expect(couvertureOrientee(trait.points, trait.points, TOLERANCE_TRACE_PX)).toBe(1);
      }
    }
  });

  it('est SENSIBLE AU SENS — sinon le moteur ne distinguerait rien', () => {
    const b = parLettre.get('b')!;
    const hampe = b.traits.find((t) => t.libelle === 'la grande barre')!;
    const aLEnvers = [...hampe.points].reverse();
    // Une couverture non orientée rendrait 1 des deux côtés. Celle-ci ne le fait pas.
    const directe = couvertureOrientee(hampe.points, hampe.points, 5);
    const renversee = couvertureOrientee(hampe.points, aLEnvers, 5);
    expect(directe).toBe(1);
    expect(renversee).toBeLessThan(directe);
  });

  it('un geste vide ne couvre rien', () => {
    const b = parLettre.get('b')!;
    expect(couvertureOrientee(b.traits[0]!.points, [], TOLERANCE_TRACE_PX)).toBe(0);
  });
});

describe('toleranceViewBox — les 24 px ne sont PAS 24 unités de dessin', () => {
  const b = parLettre.get('b')!;
  const d = parLettre.get('d')!;
  const rondB = b.traits.find((t) => t.libelle === 'le rond')!;
  const rondD = d.traits.find((t) => t.libelle === 'le rond')!;

  it('convertit selon la largeur du viewBox et celle du rendu', () => {
    expect(toleranceViewBox('0 0 100 160')).toBeCloseTo((24 * 100) / 420, 6);
    expect(toleranceViewBox('0 0 100 160', 100)).toBe(24);
    // Un viewBox illisible ne lève pas au milieu d'un geste : il retombe sur la valeur brute.
    expect(toleranceViewBox('pas un viewBox')).toBe(TOLERANCE_TRACE_PX);
  });

  it('RÉGRESSION MESURÉE : sans conversion, le rond du d couvrirait celui du b au-delà du seuil', () => {
    const brute = couvertureOrientee(rondB.points, rondD.points, TOLERANCE_TRACE_PX);
    const convertie = couvertureOrientee(rondB.points, rondD.points, toleranceViewBox(b.viewBox));

    // C'est le chiffre qui a motivé `toleranceViewBox` : 0,89 > COUVERTURE_MINIMALE.
    expect(brute).toBeGreaterThan(COUVERTURE_MINIMALE);
    expect(convertie).toBeLessThan(COUVERTURE_MINIMALE);
  });
});

describe('refleterPoints — la convention géométrique des modèles', () => {
  it('les 4 lettres à risque sont images EXACTES les unes des autres, par libellé de trait', () => {
    const paires: readonly (readonly [string, string, AxeMiroir])[] = [
      ['b', 'd', 'gauche-droite'],
      ['p', 'q', 'gauche-droite'],
      ['b', 'p', 'haut-bas'],
      ['d', 'q', 'haut-bas'],
    ];
    for (const [a, b, axe] of paires) {
      const modeleA = parLettre.get(a)!;
      const modeleB = parLettre.get(b)!;
      expect(modeleA.viewBox).toBe(modeleB.viewBox);
      for (const trait of modeleA.traits) {
        const jumeau = modeleB.traits.find((t) => t.libelle === trait.libelle);
        expect(jumeau, `${a}/${b} — trait « ${trait.libelle} »`).toBeDefined();
        const reflet = refleterPoints(trait.points, axe, modeleA.viewBox);
        expect(reflet.length).toBe(jumeau!.points.length);
        // Comparaison à 1e-6 près, et non stricte : les modèles sont arrondis au centième à
        // la génération (`100 - 64.24` vaut `35.760000000000005` en binaire). Exiger
        // l'égalité au bit ne mesurerait pas la géométrie, mais l'arrondi.
        reflet.forEach((point, i) => {
          expect(point[0]).toBeCloseTo(jumeau!.points[i]![0], 6);
          expect(point[1]).toBeCloseTo(jumeau!.points[i]![1], 6);
        });
      }
    }
  });

  it('une double réflexion sur le même axe redonne les points d’origine', () => {
    const o = parLettre.get('o')!;
    const trait = o.traits[0]!;
    for (const axe of ['gauche-droite', 'haut-bas'] as const) {
      const aller = refleterPoints(trait.points, axe, o.viewBox);
      const retour = refleterPoints(aller, axe, o.viewBox);
      retour.forEach((point, i) => {
        expect(point[0]).toBeCloseTo(trait.points[i]![0], 6);
        expect(point[1]).toBeCloseTo(trait.points[i]![1], 6);
      });
    }
  });
});

describe('sensRespecte et evaluerTrait — le sens distingue b de d', () => {
  const b = parLettre.get('b')!;
  const hampe = b.traits.find((t) => t.libelle === 'la grande barre')!;

  it('accepte un tracé parfait', () => {
    const decision = evaluerTrait(b, hampe, gesteParfait(hampe));
    expect(decision.acceptee).toBe(true);
    expect(decision.couverture).toBe(1);
    expect(decision.motif).toBeNull();
    // Sur un tracé JUSTE, aucune ligne ne force l'axe à `null` : c'est la mesure qui le rend.
    expect(decision.axe).toBeNull();
  });

  it('détecte le sens inverse, et NE l’appelle pas « départ éloigné »', () => {
    expect(sensRespecte(hampe, gesteParfait(hampe))).toBe(true);
    expect(sensRespecte(hampe, gesteInverse(hampe))).toBe(false);
    const decision = evaluerTrait(b, hampe, gesteInverse(hampe));
    expect(decision.motif).toBe('sens-inverse');
    expect(decision.compteErreur).toBe(true);
  });

  it('deux motifs sur quatre comptent comme erreur', () => {
    expect(Object.values(REFUS_TRACE_COMPTE_ERREUR).filter(Boolean).length).toBe(2);
    expect(REFUS_TRACE_COMPTE_ERREUR['depart-eloigne']).toBe(false);
    expect(REFUS_TRACE_COMPTE_ERREUR['trace-incomplet']).toBe(false);
  });

  it('un geste trop court est incomplet, jamais une erreur', () => {
    const decision = evaluerTrait(b, hampe, [{ point: [30, 20], instantMs: 0 }]);
    expect(decision.motif).toBe('trace-incomplet');
    expect(decision.compteErreur).toBe(false);
  });

  it('un gribouillis n’a AUCUN axe — inventer un axe fausserait l’indicateur (D23)', () => {
    const gribouillis: EchantillonGeste[] = [
      { point: [5, 5], instantMs: 0 },
      { point: [95, 12], instantMs: 40 },
      { point: [8, 150], instantMs: 80 },
      { point: [90, 140], instantMs: 120 },
    ];
    const decision = evaluerTrait(b, hampe, gribouillis);
    expect(decision.acceptee).toBe(false);
    expect(decision.axe).toBeNull();
  });

  it('une lettre sans axe de risque ne rend jamais d’axe', () => {
    const o = parLettre.get('o')!;
    expect(o.axeRisque).toBeNull();
    const decision = evaluerTrait(o, o.traits[0]!, gesteInverse(o.traits[0]!));
    expect(decision.axe).toBeNull();
  });
});

describe('axeConfondu — la paire restreint le diagnostic à SON axe', () => {
  it('rend l’axe de la paire quand le geste est celui du jumeau', () => {
    const b = { ...parLettre.get('b')!, axeRisque: 'gauche-droite' as AxeMiroir };
    const d = parLettre.get('d')!;
    const geste = gesteDuJumeau(d, 'la grande barre')!;
    expect(axeConfondu(b, contenuBd.paire, geste)).toBe('gauche-droite');
  });

  it('rend null sans paire — pas de paire, pas d’axe', () => {
    const b = parLettre.get('b')!;
    expect(axeConfondu(b, null, gesteParfait(b.traits[0]!))).toBeNull();
  });

  it('ne rend JAMAIS l’axe de l’autre paire (D23, conséquence 1)', () => {
    const b = parLettre.get('b')!;
    const d = parLettre.get('d')!;
    // Le geste est celui du `d` (confusion gauche-droite), mais l'exercice travaille b/p.
    const geste = gesteDuJumeau(d, 'la grande barre')!;
    const rendu = axeConfondu(b, contenuBp.paire, geste);
    expect(rendu === null || rendu === 'haut-bas').toBe(true);
    expect(rendu).not.toBe('gauche-droite');
  });
});

// ─────────────────────────────────────────────── CONTRAT DE SORTIE du lot (§ 10.4)

describe('CONTRAT DE SORTIE — part des refus dont l’axe est renseigné', () => {
  /**
   * LES FIXTURES DE PAIRES, définies sans curation possible : les 4 paires de D23, dans les
   * DEUX sens, et pour CHAQUE trait de la lettre attendue. Le geste de l'enfant est le trait
   * homonyme de la lettre jumelle — c'est-à-dire exactement « il a tracé l'autre lettre ».
   */
  const paires: readonly (readonly [string, string, AxeMiroir])[] = [
    ['b', 'd', 'gauche-droite'],
    ['d', 'b', 'gauche-droite'],
    ['p', 'q', 'gauche-droite'],
    ['q', 'p', 'gauche-droite'],
    ['b', 'p', 'haut-bas'],
    ['p', 'b', 'haut-bas'],
    ['d', 'q', 'haut-bas'],
    ['q', 'd', 'haut-bas'],
  ];

  const fixtures = paires.flatMap(([attendue, jumelle, axe]) => {
    const modele: ModeleLettre = { ...parLettre.get(attendue)!, axeRisque: axe };
    const jumeau = parLettre.get(jumelle)!;
    return modele.traits.map((trait) => ({
      cas: `${attendue}→${jumelle} (${axe}) · ${trait.libelle}`,
      axe,
      decision: evaluerTrait(modele, trait, gesteDuJumeau(jumeau, trait.libelle)!),
    }));
  });

  it('les fixtures sont bien des REFUS — sinon la mesure ne mesurerait rien', () => {
    expect(fixtures.length).toBe(16);
    expect(fixtures.every((f) => f.decision.acceptee === false)).toBe(true);
  });

  it('au moins 90 % des refus portent leur axe, et TOUJOURS le bon', () => {
    const avecAxe = fixtures.filter((f) => f.decision.axe !== null);
    const part = avecAxe.length / fixtures.length;

    console.log(
      `CONTRAT DE SORTIE L2-C n° 1 — refus « trace » dont l'axe est renseigné : ` +
        `${avecAxe.length}/${fixtures.length} = ${(part * 100).toFixed(1)} %\n` +
        fixtures
          .map(
            (f) =>
              `  ${f.decision.axe === null ? '·' : '✓'} ${f.cas} → motif=${f.decision.motif} ` +
              `axe=${f.decision.axe ?? 'null'} couverture=${f.decision.couverture.toFixed(2)}`,
          )
          .join('\n'),
    );

    expect(part).toBeGreaterThanOrEqual(0.9);
    // Jamais l'axe de l'AUTRE paire : une ligne de confusion qui mélange deux axes est
    // pire qu'une ligne absente (D23).
    for (const f of avecAxe) expect(f.decision.axe).toBe(f.axe);
  });
});

describe('moteurTrace — la règle de non-échec et la monotonie de l’aide', () => {
  function etatNeuf(contenu: ContenuTrace): EtatTrace {
    return moteurTrace.creerEtat({
      contenu,
      habillage,
      alea: contexte.alea,
      horloge: contexte.horloge,
    });
  }

  function tracer(etat: EtatTrace, geste: readonly EchantillonGeste[]): EtatTrace {
    const actions: ActionTrace[] = [
      { type: 'commencerGeste', echantillon: geste[0]! },
      ...geste.slice(1).map((e): ActionTrace => ({ type: 'prolongerGeste', echantillon: e })),
      { type: 'terminerGeste' },
    ];
    return actions.reduce((c, a) => moteurTrace.reduire(c, a, contexte), etat);
  }

  it('un exercice tracé parfaitement va au bout et rend reussi: true', () => {
    let etat = etatNeuf(contenuBd);
    for (const lettre of contenuBd.lettres) {
      for (const trait of lettre.traits) etat = tracer(etat, gesteParfait(trait));
    }
    expect(etat.termineMs).not.toBeNull();
    expect(moteurTrace.progression(etat).termine).toBe(true);
    expect(moteurTrace.resume(etat).reussi).toBe(true);
    expect(etat.axeConfondu).toBeNull();
  });

  it('l’axe mesuré remonte jusqu’à la CONFUSION du résumé — le journal le verra', () => {
    const attendue = contenuBd.lettres[0]!;
    const jumelle = parLettre.get(contenuBd.paire!.b)!;
    let etat = etatNeuf(contenuBd);
    etat = tracer(etat, gesteDuJumeau(jumelle, attendue.traits[0]!.libelle)!);

    expect(etat.axeConfondu).toBe('gauche-droite');
    const [etape] = moteurTrace.resume(etat).etapes;
    expect(etape?.confusion).not.toBeNull();
    expect(etape?.confusion?.axe).toBe('gauche-droite');
    expect(etape?.confusion?.attendu).toBe('b');
    expect(etape?.confusion?.rendu).toBe('d');
    expect(etape?.modeReponse).toBe('trace');
  });

  it('l’exercice b/p ne journalise JAMAIS gauche-droite (D23)', () => {
    const attendue = contenuBp.lettres[0]!;
    const jumelle = parLettre.get(contenuBp.paire!.b)!;
    let etat = etatNeuf(contenuBp);
    for (const trait of attendue.traits) {
      etat = tracer(etat, gesteDuJumeau(jumelle, trait.libelle)!);
    }
    expect(etat.axeConfondu).not.toBe('gauche-droite');
    expect(etat.axeConfondu).toBe('haut-bas');
  });

  it('un exercice entièrement raté rend AUSSI reussi: true — R14', () => {
    let etat = etatNeuf(contenuBd);
    for (let i = 0; i < 30; i += 1) {
      etat = tracer(etat, [
        { point: [5 + i, 5], instantMs: i * 10 },
        { point: [95, 150 - i], instantMs: i * 10 + 20 },
      ]);
    }
    expect(moteurTrace.resume(etat).reussi).toBe(true);
    expect(etat.dernierRefus).not.toBeNull();
  });

  it('propriété : le niveau d’aide ne décroît JAMAIS, sur 200 séquences aléatoires', () => {
    const echantillon = fc
      .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 160 }))
      .map(([x, y]): EchantillonGeste => ({ point: [x, y], instantMs: 0 }));

    const actionArbitraire = fc.oneof(
      echantillon.map((e): ActionTrace => ({ type: 'commencerGeste', echantillon: e })),
      echantillon.map((e): ActionTrace => ({ type: 'prolongerGeste', echantillon: e })),
      fc.constant<ActionTrace>({ type: 'terminerGeste' }),
      fc.constant<ActionTrace>({ type: 'ecouterConsigne' }),
      fc.constant<ActionTrace>({ type: 'demanderAide' }),
      fc.constant<ActionTrace>({ type: 'battementHorloge' }),
    );

    fc.assert(
      fc.property(fc.array(actionArbitraire, { minLength: 1, maxLength: 40 }), (actions) => {
        let etat = etatNeuf(contenuBd);
        let plancher = RANG_AIDE[etat.niveauAide];
        for (const action of actions) {
          etat = moteurTrace.reduire(etat, action, contexte);
          const rang = RANG_AIDE[etat.niveauAide];
          if (rang < plancher) return false;
          plancher = rang;
          if (moteurTrace.resume(etat).reussi !== true) return false;
          // Un trait terminé ne se dé-termine jamais.
          if (etat.traits.some((t) => t.couverture < 0 || t.couverture > 1)) return false;
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it('le seuil de couverture est une constante exportée, pas un nombre caché', () => {
    expect(COUVERTURE_MINIMALE).toBe(0.8);
    expect(TOLERANCE_TRACE_PX).toBe(24);
  });
});

describe('SCHEMA_CONTENU_TRACE — une paire, donc un axe', () => {
  it('accepte les deux exercices réels', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const valider = ajv.compile(SCHEMA_CONTENU_TRACE);
    expect(valider(contenuBd), JSON.stringify(valider.errors)).toBe(true);
    expect(valider(contenuBp), JSON.stringify(valider.errors)).toBe(true);
  });

  it('refuse un trait décrit par moins de 8 points — sans eux, aucun sens mesurable', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const valider = ajv.compile(SCHEMA_CONTENU_TRACE);
    const mutile = JSON.parse(JSON.stringify(contenuBd)) as ContenuTrace;
    (mutile.lettres[0]!.traits[0] as { points: unknown }).points = [
      [0, 0],
      [1, 1],
    ];
    expect(valider(mutile)).toBe(false);
  });

  it('refuse un axe hors des deux de D23', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const valider = ajv.compile(SCHEMA_CONTENU_TRACE);
    expect(valider({ ...contenuBd, paire: { a: 'b', b: 'd', axe: 'diagonale' } })).toBe(false);
  });
});
