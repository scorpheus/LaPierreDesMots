/**
 * QA DU DUCTUS — LES 26 MINUSCULES, DANS LE BON SENS **ET** DANS LE MAUVAIS.
 *
 * Demande du père, verbatim : « Chaque lettre du ductus tracée, dans le bon sens ET dans le
 * mauvais — le mauvais sens doit échouer. »
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EST UN TEST UNITAIRE ET NON UN PARCOURS E2E
 *
 * Le père demande « toutes les lettres ». Le référentiel en porte 26, pour 45 traits, et
 * chacun doit être joué deux fois — 90 gestes. Un parcours E2E qui monterait un exercice,
 * simulerait un doigt et lirait le verdict à l'écran mettrait plusieurs minutes et
 * n'ajouterait RIEN : le jugement du sens est rendu par `evaluerTrait`, une fonction pure de
 * `partage/`, que `MoteurTrace.tsx` ne fait qu'appeler. Le parcours réel du moteur — un
 * doigt, un refus affiché, aucun écran d'échec — est gardé par `parcours-trace.spec.ts` et
 * par `parcours-qa-moteurs.spec.ts`.
 *
 * On teste donc ici ce qui décide, sur la population entière, avec les gestes qu'un enfant de
 * 7 ans produit vraiment.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI EST MESURÉ, ET LA LOI QUI L'IMPOSE ─────────────────────────────────────────────
 * D33 : « un moteur qui enseigne un mauvais sens détruit le mécanisme pour lequel il
 * existe », et « un tracé au bon endroit dans le mauvais sens n'est PAS une réussite ».
 * Conséquence 5 : « on assouplit la PRÉCISION (R16), jamais le SENS. »
 *
 * Trois propriétés, sur chaque trait qui tourne :
 *   1. le geste du ductus, tremblé comme une main d'enfant, est ACCEPTÉ ;
 *   2. le même geste parcouru À L'ENVERS est REFUSÉ ;
 *   3. le refus du sens ne compte JAMAIS comme une erreur de lettre (R14), et ne fabrique
 *      aucune confusion miroir — c'est la correction du § 2.7 du contrat de finition v3 :
 *      un enfant qui trace le bon `d` à l'envers ne doit pas apparaître comme confondant
 *      `b` et `d` dans le tableau de bord que « un orthophoniste pourrait un jour lire ».
 *
 * SOURCE QUI FAIT FOI, LUE SUR DISQUE, JAMAIS RECALCULÉE :
 * `contenu/modeles-lettres/minuscules.json`. Le sens attendu de chaque trait est MESURÉ sur
 * la géométrie livrée (aire signée), et non redéclaré ici : ce fichier vérifie que le moteur
 * juge conformément au modèle, pas que le modèle est conforme à une opinion. La conformité du
 * modèle à D33, elle, est le sujet de `trace-geste-enfant.test.ts` et de
 * `ductus-referentiel.test.ts`, qui la tiennent déjà.
 */
import { describe, expect, it } from 'vitest';

import { evaluerTrait } from '@partage/moteurs/trace/validation';
import type { EchantillonGeste, ModeleLettre, TraitLettre } from '@partage/moteurs/trace/index';

import { GRAINE_DE_TEST, lireTexte } from '../configuration/preparation.js';

const BIBLIOTHEQUE = JSON.parse(lireTexte('contenu/modeles-lettres/minuscules.json')) as {
  readonly lettres: readonly ModeleLettre[];
};
const LETTRES = BIBLIOTHEQUE.lettres;

type Point = readonly [number, number];

/**
 * Sens de parcours par l'aire signée (formule du lacet).
 *
 * En `viewBox` SVG l'axe `y` descend : une aire POSITIVE correspond donc au sens HORAIRE à
 * l'écran, l'inverse de la convention mathématique. Le signe est contrôlé sur un témoin
 * ci-dessous avant tout usage — c'est le genre de chose qu'on ne suppose pas.
 */
function aireSignee(points: readonly Point[]): number {
  let aire = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    aire += a[0] * b[1] - b[0] * a[1];
  }
  return aire / 2;
}

/** Sous ce seuil d'aire, le trait ne tourne pas : c'est une barre, un point, une hampe. */
const AIRE_MINIMALE_ROTATION = 50;

function tourne(trait: TraitLettre): boolean {
  return Math.abs(aireSignee(trait.points as readonly Point[])) >= AIRE_MINIMALE_ROTATION;
}

/**
 * Un générateur pseudo-aléatoire déterministe — mulberry32, la même famille qu'`Alea`.
 *
 * Écrit ici plutôt qu'importé parce que `Alea` sert le JEU, et qu'un test qui bruite des
 * points n'a pas à consommer la même séquence que la pédagogie. Aucun `Math.random` : la règle
 * ESLint du dépôt l'interdit, et un test tremblé non reproductible serait un test qui échoue
 * un jour sur dix sans qu'on sache pourquoi.
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

/**
 * Un geste DENSE le long d'une polyligne — un doigt, pas neuf téléportations —, et TREMBLÉ.
 *
 * Le tremblement n'est pas une coquetterie : « un test qui ne passe qu'avec le tracé idéal ne
 * prouve rien ». R16 exige qu'un `b` tremblant mais bien orienté soit une réussite. L'écart
 * type est de 2 unités de `viewBox`, soit environ 8 px à l'écran — visible, et bien en deçà
 * de la tolérance de 24 px.
 */
function gesteLeLongDe(points: readonly Point[], graine: number, bruit = 2): readonly EchantillonGeste[] {
  const hasard = generateur(graine);
  const trembler = (v: number): number => v + (hasard() - 0.5) * 2 * bruit;
  const sortie: EchantillonGeste[] = [];
  let instantMs = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const longueur = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nb = Math.max(1, Math.round(longueur / 2));
    for (let k = 0; k < nb; k += 1) {
      const f = k / nb;
      instantMs += 10;
      sortie.push({
        point: [trembler(a[0] + (b[0] - a[0]) * f), trembler(a[1] + (b[1] - a[1]) * f)],
        instantMs,
      });
    }
  }
  const dernier = points[points.length - 1]!;
  instantMs += 10;
  sortie.push({ point: [trembler(dernier[0]), trembler(dernier[1])], instantMs });
  return sortie;
}

/** Tous les traits, aplatis avec leur lettre — c'est la population auditée. */
const TRAITS: readonly { readonly modele: ModeleLettre; readonly trait: TraitLettre }[] =
  LETTRES.flatMap((modele) => modele.traits.map((trait) => ({ modele, trait })));

const TRAITS_QUI_TOURNENT = TRAITS.filter(({ trait }) => tourne(trait));

// ═══════════════════════════════════════════════════════════ 0. CONTRÔLE DE L'INSTRUMENT

describe('l’instrument est contrôlé avant de servir', () => {
  it('l’aire signée est POSITIVE pour un parcours horaire à l’écran', () => {
    // Carré parcouru droite → bas → gauche → haut : horaire quand `y` descend.
    expect(
      aireSignee([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toBeGreaterThan(0);
  });

  it('la population auditée n’est pas vide, et elle est celle du disque', () => {
    // Sans ces planchers, tout ce fichier serait vert sur une bibliothèque vide.
    expect(LETTRES.length, 'les 26 minuscules du référentiel').toBe(26);
    expect(TRAITS.length, 'traits déclarés, toutes lettres confondues').toBeGreaterThanOrEqual(40);
    expect(
      TRAITS_QUI_TOURNENT.length,
      'traits qui tournent — ce sont les seuls où le SENS a un sens',
    ).toBeGreaterThanOrEqual(8);
  });
});

// ═════════════════════════════════════ 1. LE BON SENS EST ACCEPTÉ, MÊME TREMBLÉ (R16)

describe('chaque trait tracé DANS LE BON SENS est accepté, même d’une main qui tremble', () => {
  for (const { modele, trait } of TRAITS) {
    it(`« ${modele.lettre} » / ${trait.id} : le geste du modèle est accepté`, () => {
      const points = trait.points as readonly Point[];
      const geste = gesteLeLongDe(points, GRAINE_DE_TEST + trait.id.length);
      const decision = evaluerTrait(modele, trait, geste);

      expect(
        decision.acceptee,
        `« ${modele.lettre} » / ${trait.id} refusé alors qu'il suit le modèle : ` +
          `motif ${String(decision.motif)}. R16 — « on assouplit la précision, jamais le sens ».`,
      ).toBe(true);
    });
  }
});

// ═══════════════════════════════ 2. LE MAUVAIS SENS EST REFUSÉ — LE CŒUR DE D33

describe('chaque trait qui TOURNE, tracé à l’envers, est REFUSÉ', () => {
  for (const { modele, trait } of TRAITS_QUI_TOURNENT) {
    it(`« ${modele.lettre} » / ${trait.id} : le sens inverse n’est pas une réussite`, () => {
      const aLEnvers = [...(trait.points as readonly Point[])].reverse();
      // Même forme, mêmes points, même tolérance : SEUL l'ordre de parcours change. C'est ce
      // qui rend ce cas concluant — si le moteur acceptait, il ne mesurerait pas le geste
      // mais seulement le dessin, et D33 serait sans effet.
      const geste = gesteLeLongDe(aLEnvers, GRAINE_DE_TEST + trait.id.length);
      const decision = evaluerTrait(modele, trait, geste);

      expect(
        decision.acceptee,
        `« ${modele.lettre} » / ${trait.id} ACCEPTÉ à l'envers. D33 : « un tracé au bon ` +
          `endroit dans le mauvais sens n'est PAS une réussite » — et « un moteur qui ` +
          `enseigne un mauvais sens détruit le mécanisme pour lequel il existe ».`,
      ).toBe(false);
      expect(
        decision.motif,
        `« ${modele.lettre} » / ${trait.id} : refusé, mais pour un autre motif que le sens`,
      ).toBe('sens-inverse');
    });
  }
});

// ═════════════════════ 3. UN REFUS DE SENS N'EST NI UN ÉCHEC NI UNE CONFUSION MIROIR

describe('le refus du sens ne salit ni l’enfant ni l’indicateur de D23', () => {
  for (const { modele, trait } of TRAITS_QUI_TOURNENT) {
    it(`« ${modele.lettre} » / ${trait.id} : le sens inverse ne fabrique aucune confusion`, () => {
      const aLEnvers = [...(trait.points as readonly Point[])].reverse();
      const decision = evaluerTrait(
        modele,
        trait,
        gesteLeLongDe(aLEnvers, GRAINE_DE_TEST + trait.id.length),
      );

      // Le contrat de finition v3 § 2.7 : `axeParInversionDeSens` rendait `modele.axeRisque`
      // dès que le motif valait `sens-inverse`. Un enfant qui traçait le BON `d` à l'envers
      // produisait donc une confusion `b→d` qu'il n'avait pas commise, dans le top 10 que
      // « un orthophoniste pourrait un jour lire ».
      expect(
        decision.axe,
        `« ${modele.lettre} » / ${trait.id} : un sens inverse a produit l'axe ` +
          `« ${String(decision.axe)} ». Le geste dit le SENS, il ne dit pas la confusion.`,
      ).toBeNull();
    });
  }
});

// ═════════════════════════════════════════════════════════════════ 4. CONTRAT DE SORTIE

/**
 * Le chiffre qui échoue si le travail est creux.
 *
 * Une suite qui n'auditerait AUCUN trait serait verte elle aussi : on publie donc les comptes,
 * et on exige que le sens soit réellement DISCRIMINANT — c'est-à-dire que le moteur accepte le
 * bon sens et refuse l'inverse sur la même géométrie. Un moteur qui refuserait tout, ou qui
 * accepterait tout, ferait tomber ce cas.
 */
it('CONTRAT DE SORTIE — le sens est discriminant sur toute la population', () => {
  let acceptesEndroit = 0;
  let refusesEnvers = 0;

  for (const { modele, trait } of TRAITS_QUI_TOURNENT) {
    const points = trait.points as readonly Point[];
    const graine = GRAINE_DE_TEST + trait.id.length;
    if (evaluerTrait(modele, trait, gesteLeLongDe(points, graine)).acceptee) acceptesEndroit += 1;
    if (!evaluerTrait(modele, trait, gesteLeLongDe([...points].reverse(), graine)).acceptee) {
      refusesEnvers += 1;
    }
  }

  const n = TRAITS_QUI_TOURNENT.length;
  console.log(
    `[qa-ductus] ${String(LETTRES.length)} lettres · ${String(TRAITS.length)} traits · ` +
      `${String(n)} qui tournent · bon sens accepté ${String(acceptesEndroit)}/${String(n)} · ` +
      `sens inverse refusé ${String(refusesEnvers)}/${String(n)}`,
  );

  expect(acceptesEndroit, 'des traits corrects sont refusés').toBe(n);
  expect(refusesEnvers, 'des traits à l’envers sont acceptés').toBe(n);
});
