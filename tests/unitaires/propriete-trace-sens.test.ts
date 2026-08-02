/**
 * PROPRIÉTÉ 5 — quel que soit le tracé, un geste au BON SENS est accepté et le geste INVERSE
 * est refusé. D33.
 *
 * Lot Q3.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE À `qa-ductus-toutes-lettres.test.ts`
 *
 * Le fichier existant joue les 26 minuscules dans les deux sens, et c'est excellent. Deux
 * limites, mesurées et non supposées :
 *
 *   1. **il joue UN geste par trait.** Un seul tremblement (écart type 2 unités), un seul pas
 *      d'échantillonnage (une graine, un pas régulier). Un enfant ne produit jamais deux fois
 *      le même geste : un doigt lent produit deux cents échantillons, un doigt rapide en
 *      produit douze, et le tremblement varie. Ici, l'amplitude du tremblement, le pas
 *      d'échantillonnage — **irrégulier, tiré à chaque segment** — et la cadence temporelle
 *      sont engendrés, mille fois par population ;
 *   2. **il n'exige le refus que des 23 traits « qui tournent »**, filtrés par une aire signée
 *      seuillée à 50. C'est un critère prudent, et il laisse 22 traits hors du filet — dont
 *      toutes les hampes et toutes les barres, qui sont précisément ce que l'enfant inverse le
 *      plus souvent.
 *
 * ── LA POPULATION, DÉRIVÉE ET NON DÉCLARÉE ────────────────────────────────────────────────
 * Un trait n'a un sens mesurable que si le modèle lui-même distingue ses deux parcours. On
 * utilise donc la mesure du moteur, pas une opinion :
 *
 *     discriminant  ⟺  couvertureOrientee(points, points-inversés, tolérance) < COUVERTURE_MINIMALE
 *
 * Mesuré le 2026-08-02 sur `contenu/modeles-lettres/minuscules.json` : **43 traits sur 45**
 * sont discriminants — presque le double des 23 du filtre par aire. Les deux exclus sont
 * `i-point` et `j-point`, et leur couverture inverse vaut exactement `1.000` : ce sont les
 * points du i et du j, entièrement contenus dans le disque de tolérance. **Un point n'a pas
 * de sens**, et exiger qu'on refuse son parcours inverse serait exiger une distinction que la
 * géométrie ne porte pas. Ils sont exclus NOMMÉMENT, comptés, et leur verdict est imprimé.
 * ──────────────────────────────────────────────────────────────────────────────────────────
 *
 * SOURCE QUI FAIT FOI, LUE SUR DISQUE ET JAMAIS RECALCULÉE :
 * `contenu/modeles-lettres/minuscules.json`. Le sens attendu n'est pas redéclaré ici : c'est
 * l'ordre des `points` du trait livré. Ce fichier vérifie que le moteur juge conformément au
 * modèle ; la conformité du modèle à D33 est le sujet de `ductus-referentiel.test.ts`.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  COUVERTURE_MINIMALE, couvertureOrientee, evaluerTrait, sensRespecte, toleranceViewBox,
} from '@partage/moteurs/trace/validation.js';
import { REFUS_TRACE_COMPTE_ERREUR } from '@partage/moteurs/trace/validation.js';
import type { EchantillonGeste, ModeleLettre, TraitLettre } from '@partage/moteurs/trace/index';

import { lireTexte } from '../configuration/preparation.js';
import { NB_CAS, reglages } from './propriete-outils.js';

type Point = readonly [number, number];

const BIBLIOTHEQUE = JSON.parse(lireTexte('contenu/modeles-lettres/minuscules.json')) as {
  readonly lettres: readonly ModeleLettre[];
};
const LETTRES = BIBLIOTHEQUE.lettres;

interface TraitAudite {
  readonly modele: ModeleLettre;
  readonly trait: TraitLettre;
  readonly tolerance: number;
  /** Couverture du modèle par son propre parcours inverse. < seuil ⟹ le sens est mesurable. */
  readonly couvertureInverse: number;
}

const TRAITS: readonly TraitAudite[] = LETTRES.flatMap((modele) =>
  modele.traits.map((trait) => {
    const tolerance = toleranceViewBox(modele.viewBox);
    return {
      modele,
      trait,
      tolerance,
      couvertureInverse: couvertureOrientee(
        trait.points,
        [...(trait.points as readonly Point[])].reverse(),
        tolerance,
      ),
    };
  }),
);

/** Les traits dont le modèle distingue lui-même les deux parcours. */
const DISCRIMINANTS = TRAITS.filter((t) => t.couvertureInverse < COUVERTURE_MINIMALE);
/** Les autres : entièrement contenus dans le disque de tolérance. Un point n'a pas de sens. */
const SANS_SENS = TRAITS.filter((t) => t.couvertureInverse >= COUVERTURE_MINIMALE);

/**
 * Un générateur pseudo-aléatoire déterministe — mulberry32, la famille d'`Alea`.
 *
 * Écrit ici plutôt qu'importé : `Alea` sert le JEU, et un test qui bruite des points n'a pas à
 * consommer la même séquence que la pédagogie. Aucun `Math.random` — la règle du dépôt
 * l'interdit, et un test tremblé non reproductible échouerait un jour sur dix sans qu'on sache
 * pourquoi.
 */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Les paramètres d'UN geste d'enfant : ce qui varie d'un doigt à l'autre, et d'un jour à l'autre. */
interface Geste {
  readonly graine: number;
  /** Amplitude du tremblement, en unités `viewBox`. */
  readonly bruit: number;
  /** Le pas d'échantillonnage est tiré À CHAQUE SEGMENT entre ces deux bornes. */
  readonly pasMin: number;
  readonly pasMax: number;
}

/**
 * Les bornes du tremblement sont MESURÉES, pas choisies : à 4 unités de `viewBox` — soit
 * environ 17 px à l'écran, plus du double du tremblement de 2 unités du fichier existant — les
 * 45 traits restent acceptés dans le bon sens et les 43 discriminants restent refusés à
 * l'envers (5 400 et 5 160 gestes mesurés le 2026-08-02). À 6 unités, deux obliques du `x`
 * sortent du couloir de départ : c'est la tolérance R16 qui parle, pas un défaut, et on ne
 * teste donc pas au-delà.
 */
const arbGeste: fc.Arbitrary<Geste> = fc
  .record({
    graine: fc.integer({ min: 1, max: 2 ** 30 }),
    bruit: fc.double({ min: 0, max: 4, noNaN: true }),
    pasMin: fc.double({ min: 1, max: 6, noNaN: true }),
    largeur: fc.double({ min: 0, max: 14, noNaN: true }),
  })
  .map((brut) => ({
    graine: brut.graine,
    bruit: brut.bruit,
    pasMin: brut.pasMin,
    pasMax: brut.pasMin + brut.largeur,
  }));

/**
 * Un geste DENSE le long d'une polyligne — un doigt, pas des téléportations —, tremblé, à
 * cadence irrégulière.
 *
 * L'irrégularité du pas ET du temps est le cœur de ce fichier : le contrat du moteur promet
 * qu'« un doigt lent qui produit deux cents échantillons et un doigt rapide qui en produit
 * douze donnent la même réponse ». C'est une promesse sur une POPULATION de gestes ; elle ne
 * se vérifie pas avec un geste.
 */
function tracer(points: readonly Point[], geste: Geste): readonly EchantillonGeste[] {
  const hasard = generateur(geste.graine);
  const trembler = (v: number): number => v + (hasard() - 0.5) * 2 * geste.bruit;
  const sortie: EchantillonGeste[] = [];
  let instantMs = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const pas = geste.pasMin + hasard() * (geste.pasMax - geste.pasMin);
    const longueur = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nb = Math.max(1, Math.round(longueur / pas));
    for (let k = 0; k < nb; k += 1) {
      const f = k / nb;
      instantMs += 5 + Math.floor(hasard() * 40);
      sortie.push({
        point: [trembler(a[0] + (b[0] - a[0]) * f), trembler(a[1] + (b[1] - a[1]) * f)],
        instantMs,
      });
    }
  }
  const dernier = points[points.length - 1] as Point;
  instantMs += 10;
  sortie.push({ point: [trembler(dernier[0]), trembler(dernier[1])], instantMs });
  return sortie;
}

/**
 * Les bornes sont protégées contre une population vide.
 *
 * Non par prudence décorative : mesuré au banc de mutation, casser l'orientation de
 * `couvertureOrientee` fait tomber `DISCRIMINANTS` à zéro, `fc.integer({ max: -1 })` LÈVE au
 * chargement du module, et vitest rend « no tests ». Le défaut était bien détecté, mais par un
 * plantage et non par une assertion : personne n'aurait su lequel. Avec la borne protégée, le
 * cas qui rougit est celui qui NOMME la régression — « la population discriminante s'est
 * effondrée ».
 */
const arbTrait = fc.integer({ min: 0, max: Math.max(0, TRAITS.length - 1) });
const arbDiscriminant = fc.integer({ min: 0, max: Math.max(0, DISCRIMINANTS.length - 1) });

// ═══════════════════════════════════ 0. L'INSTRUMENT EST CONTRÔLÉ AVANT DE SERVIR

describe('la population auditée est celle du disque, et elle est dérivée du moteur', () => {
  it('26 lettres, 45 traits, et la partition discriminant / sans sens est complète', () => {
    // Sans ces planchers, tout ce fichier serait vert sur une bibliothèque vide.
    expect(LETTRES.length, 'les 26 minuscules du référentiel').toBe(26);
    expect(TRAITS.length, 'traits déclarés, toutes lettres confondues').toBeGreaterThanOrEqual(45);
    expect(
      DISCRIMINANTS.length + SANS_SENS.length,
      'la partition ne couvre pas tous les traits',
    ).toBe(TRAITS.length);
    expect(
      DISCRIMINANTS.length,
      'la population discriminante s’est effondrée : le sens ne serait plus mesuré',
    ).toBeGreaterThanOrEqual(43);
    // Les exclus sont NOMMÉS. S'ils changent, ce cas rougit et force à revoir la raison.
    expect(
      SANS_SENS.map((t) => `${t.modele.lettre}/${t.trait.id}`).sort(),
      'la liste des traits sans sens mesurable a changé',
    ).toEqual(['i/i-point', 'j/j-point']);
  });

  it('la tolérance est CONVERTIE dans les unités du modèle, jamais appliquée brute', () => {
    // Le commentaire de `toleranceViewBox` mesure que sans conversion le rond du `d` couvre
    // celui du `b` à 1,00 : le moteur serait aveugle à ce qu'il doit voir. On garde le chiffre.
    const tolerance = toleranceViewBox(LETTRES[0]?.viewBox as string);
    expect(tolerance, 'la tolérance n’est plus convertie').toBeCloseTo(7.619, 2);
    expect(tolerance, 'la tolérance vaut les 32 px bruts : la conversion a sauté').toBeLessThan(32);
  });
});

// ═══════════════ T1 — LE BON SENS EST ACCEPTÉ, QUELLE QUE SOIT LA MAIN

describe('T1 — un geste au BON SENS est accepté, quels que soient tremblement et cadence', () => {
  it(`${String(NB_CAS)} gestes engendrés sur les ${String(TRAITS.length)} traits`, () => {
    const traitsVus = new Set<string>();
    let acceptes = 0;
    fc.assert(
      fc.property(arbTrait, arbGeste, (index, parametres) => {
        const { modele, trait } = TRAITS[index] as TraitAudite;
        const geste = tracer(trait.points as readonly Point[], parametres);
        const decision = evaluerTrait(modele, trait, geste);
        traitsVus.add(`${modele.lettre}/${trait.id}`);
        if (decision.acceptee) acceptes += 1;

        expect(
          decision.acceptee,
          `« ${modele.lettre} » / ${trait.id} REFUSÉ alors qu’il suit le modèle : ` +
            `motif=${String(decision.motif)} couverture=${decision.couverture.toFixed(2)} ` +
            `bruit=${parametres.bruit.toFixed(2)} pas=[${parametres.pasMin.toFixed(1)}, ` +
            `${parametres.pasMax.toFixed(1)}]. R16 — « on assouplit la précision, jamais le sens ».`,
        ).toBe(true);
        expect(decision.motif, 'un geste accepté porte un motif de refus').toBeNull();
        expect(decision.compteErreur, 'un geste accepté compte une erreur').toBe(false);
        // Sur un tracé juste, le reflet est moins bien couvert que l'original : l'axe doit
        // rester `null` SANS qu'aucune ligne n'ait à le forcer.
        expect(
          decision.axe,
          `« ${modele.lettre} » / ${trait.id} : un tracé JUSTE a été diagnostiqué ` +
            `« confusion ${String(decision.axe)} » — le tableau de bord de D23 deviendrait du bruit`,
        ).toBeNull();
      }),
      reglages(),
    );
    expect(acceptes, 'aucun geste accepté').toBe(NB_CAS);
    // Un tirage qui n'aurait visité que trois traits ne prouverait rien sur la population.
    expect(traitsVus.size, 'trop peu de traits visités par le tirage').toBeGreaterThanOrEqual(40);
  });
});

// ═════════════════════ T2 — LE SENS INVERSE EST REFUSÉ — LE CŒUR DE D33

describe('T2 — le même geste À L’ENVERS est REFUSÉ, sur les 43 traits qui ont un sens', () => {
  /**
   * D33 : « un tracé au bon endroit mais dans le mauvais sens n'est PAS une réussite », et
   * « un moteur qui enseigne un mauvais sens détruit le mécanisme pour lequel il existe ».
   *
   * Même forme, mêmes points, même tolérance : SEUL l'ordre de parcours change. C'est ce qui
   * rend le cas concluant — si le moteur acceptait, il ne mesurerait pas le geste mais
   * seulement le dessin.
   */
  it(`${String(NB_CAS)} gestes inversés engendrés — aucun n’est accepté`, () => {
    const motifs = new Map<string, number>();
    const traitsVus = new Set<string>();
    fc.assert(
      fc.property(arbDiscriminant, arbGeste, (index, parametres) => {
        const { modele, trait } = DISCRIMINANTS[index] as TraitAudite;
        const aLEnvers = [...(trait.points as readonly Point[])].reverse();
        const geste = tracer(aLEnvers, parametres);
        const decision = evaluerTrait(modele, trait, geste);
        traitsVus.add(`${modele.lettre}/${trait.id}`);
        motifs.set(String(decision.motif), (motifs.get(String(decision.motif)) ?? 0) + 1);

        expect(
          decision.acceptee,
          `« ${modele.lettre} » / ${trait.id} ACCEPTÉ à l’envers ` +
            `(bruit=${parametres.bruit.toFixed(2)}). D33 : « un tracé au bon endroit dans le ` +
            'mauvais sens n’est PAS une réussite ».',
        ).toBe(false);
        expect(decision.motif, 'un refus sans motif').not.toBeNull();
        // Le motif porte son coût déclaré : `sens-inverse` et `trait-hors-ordre` comptent une
        // erreur, les deux autres non. Une table qui dériverait ferait payer un doigt qui
        // dérape (v1 § 5.5).
        expect(
          decision.compteErreur,
          `le coût du motif « ${String(decision.motif)} » ne suit plus la table`,
        ).toBe(REFUS_TRACE_COMPTE_ERREUR[decision.motif as keyof typeof REFUS_TRACE_COMPTE_ERREUR]);
      }),
      reglages(),
    );
    console.log(
      `[Q3-P5] motifs de refus du sens inverse : ${JSON.stringify([...motifs].sort())}`,
    );
    expect(traitsVus.size, 'trop peu de traits visités par le tirage').toBeGreaterThanOrEqual(38);
  });

  it('`sensRespecte` est d’accord avec `evaluerTrait` : une seule loi, pas deux', () => {
    // Deux fonctions publiques jugent le sens. Si elles divergeaient, l'hôte pourrait afficher
    // un verdict et le moteur en journaliser un autre — la contradiction que D33 condamne.
    fc.assert(
      fc.property(arbDiscriminant, arbGeste, (index, parametres) => {
        const { modele, trait, tolerance } = DISCRIMINANTS[index] as TraitAudite;
        const points = trait.points as readonly Point[];

        expect(
          sensRespecte(trait, tracer(points, parametres), tolerance),
          `« ${modele.lettre} » / ${trait.id} : sensRespecte refuse le bon sens`,
        ).toBe(true);
        expect(
          sensRespecte(trait, tracer([...points].reverse(), parametres), tolerance),
          `« ${modele.lettre} » / ${trait.id} : sensRespecte accepte le sens inverse`,
        ).toBe(false);
      }),
      reglages(),
    );
  });
});

// ═════════════ T3 — les deux traits SANS SENS mesurable sont traités comme tels

describe('T3 — un point n’a pas de sens, et le moteur ne prétend pas le contraire', () => {
  it('`i-point` et `j-point` : le parcours inverse est ACCEPTÉ, et c’est correct', () => {
    // Ce cas n'est pas une exception de confort : il ÉPINGLE le comportement des deux seuls
    // traits dont la géométrie ne porte aucune direction. Si un jour ils devenaient
    // discriminants, T2 les reprendrait automatiquement et ce cas rougirait — ce qui est
    // exactement ce qu'on veut : la population de T2 est dérivée, jamais figée.
    expect(SANS_SENS.length, 'la liste des traits sans sens a changé').toBe(2);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1 }), arbGeste, (index, parametres) => {
        const { modele, trait } = SANS_SENS[index] as TraitAudite;
        const points = trait.points as readonly Point[];
        expect(
          evaluerTrait(modele, trait, tracer(points, parametres)).acceptee,
          `« ${modele.lettre} » / ${trait.id} refusé au bon sens`,
        ).toBe(true);
        expect(
          evaluerTrait(modele, trait, tracer([...points].reverse(), parametres)).acceptee,
          `« ${modele.lettre} » / ${trait.id} : le moteur prétend distinguer le sens d’un point`,
        ).toBe(true);
      }),
      reglages(),
    );
  });
});

// ══════════════════════════════════════════════════════ CONTRAT DE SORTIE

describe('CONTRAT DE SORTIE — la propriété 5 a bien tourné, et sur quoi', () => {
  it('imprime la population et les couvertures, et échoue si le référentiel est creux', () => {
    const extremes = [...TRAITS]
      .sort((a, b) => b.couvertureInverse - a.couvertureInverse)
      .slice(0, 4);
    console.log(
      [
        `[Q3-P5] lettres ......................... ${String(LETTRES.length)}`,
        `[Q3-P5] traits .......................... ${String(TRAITS.length)}`,
        `[Q3-P5] traits au SENS MESURABLE ........ ${String(DISCRIMINANTS.length)} / ${String(TRAITS.length)}`,
        `[Q3-P5]   (l'ancien filtre par aire signée en retenait 23)`,
        `[Q3-P5] traits SANS sens mesurable ...... ${SANS_SENS.map((t) => `${t.modele.lettre}/${t.trait.id}`).join(', ')}`,
        `[Q3-P5] seuil de couverture ............. ${String(COUVERTURE_MINIMALE)}`,
        `[Q3-P5] couvertures inverses les + hautes :`,
        ...extremes.map(
          (t) =>
            `[Q3-P5]   ${`${t.modele.lettre}/${t.trait.id}`.padEnd(16)} ` +
            `${t.couvertureInverse.toFixed(3)}`,
        ),
        `[Q3-P5] gestes engendrés ................ ${String(NB_CAS * 4)}`,
      ].join('\n'),
    );
    expect(TRAITS.length, 'le référentiel est vide').toBeGreaterThanOrEqual(45);
    expect(DISCRIMINANTS.length, 'la population de D33 s’est effondrée').toBeGreaterThanOrEqual(43);
    expect(
      DISCRIMINANTS.length / TRAITS.length,
      'moins de 90 % des traits portent un sens mesurable',
    ).toBeGreaterThan(0.9);
    expect(NB_CAS, 'moins de mille cas par propriété').toBeGreaterThanOrEqual(1000);
  });
});
