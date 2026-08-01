/**
 * Leitner à 5 boîtes — propriétés P6 à P8, 90 jours simulés. Lot L2-D, v2 § 12.2.
 *
 * L'horloge est FIGÉE et avancée à la main (`Horloge.avancer`) : sans cela, vérifier qu'un item
 * revient bien à J+35 demanderait d'attendre cinq semaines (annexe T § 2.2). C'est la raison
 * d'être de l'horloge injectée, et ce fichier est l'endroit où elle se paie.
 *
 * Les délais viennent du fichier de paramètres réel : une recalibration qui casserait une
 * propriété doit tomber ici, pas dans trois semaines dans une courbe.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { creerHorlogeFigee } from '@pierre/partage';
import {
  delaiDeBoite, estDue, itemLeitnerInitial, itemsDus, promouvoir, retrograder,
} from '@partage/pedagogie/leitner.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';

import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';

import type { ItemLeitner, NumeroBoite } from '@pierre/partage';

const LEITNER = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json')
).leitner;

const BOITES: readonly NumeroBoite[] = [1, 2, 3, 4, 5];
const NB_BOITES = BOITES.length;

/** Écart en jours entre deux horodatages ISO. `Date.parse` est autorisé (eslint.config.js). */
function ecartJours(depuis: string, jusqua: string): number {
  return (Date.parse(jusqua) - Date.parse(depuis)) / 86_400_000;
}

function itemEnBoite(boite: NumeroBoite, instant = INSTANT_DE_REFERENCE): ItemLeitner {
  return {
    item: `gph.${String(boite)}`,
    boite,
    derniereRevueLe: instant,
    echeanceLe: instant,
    nbRevues: 0,
  };
}

// ───────────────────────────────────────────────────────────── état initial

describe('itemLeitnerInitial', () => {
  it('part en boîte 1, jamais revu, et DÛ immédiatement', () => {
    const item = itemLeitnerInitial('mot.outil.le', INSTANT_DE_REFERENCE);
    expect(item.item).toBe('mot.outil.le');
    expect(item.boite).toBe(1);
    expect(item.nbRevues).toBe(0);
    expect(item.derniereRevueLe).toBe(INSTANT_DE_REFERENCE);
    // Un item qu'on vient de rencontrer se révise ; le faire attendre J+1 avant la première
    // révision perdrait la seule occasion où il est encore frais.
    expect(estDue(item, INSTANT_DE_REFERENCE)).toBe(true);
  });
});

describe('delaiDeBoite', () => {
  it('rend le délai déclaré en données pour chacune des 5 boîtes', () => {
    for (const boite of BOITES) {
      expect(delaiDeBoite(boite, LEITNER)).toBe(LEITNER.delaisJours[boite - 1]);
    }
  });

  it('croît strictement avec le numéro de boîte : c’est la définition d’un SRS', () => {
    for (let i = 1; i < NB_BOITES; i += 1) {
      expect(delaiDeBoite(BOITES[i] as NumeroBoite, LEITNER)).toBeGreaterThan(
        delaiDeBoite(BOITES[i - 1] as NumeroBoite, LEITNER)
      );
    }
  });
});

// ───────────────────────────────────────────────────────────── P6

describe('P6 — la boîte monte d’un cran, l’échéance suit `delaisJours`, exactement', () => {
  it('promeut d’un cran et date l’échéance au délai de la NOUVELLE boîte', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOITES), fc.integer({ min: 0, max: 90 }), (boite, jour) => {
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: jour });
        const maintenant = horloge.maintenant();

        const avant = itemEnBoite(boite);
        const apres = promouvoir(avant, LEITNER, maintenant);

        const attendue = Math.min(boite + 1, NB_BOITES) as NumeroBoite;
        expect(apres.boite).toBe(attendue);
        expect(apres.derniereRevueLe).toBe(maintenant);
        expect(apres.nbRevues).toBe(avant.nbRevues + 1);
        expect(ecartJours(maintenant, apres.echeanceLe)).toBe(delaiDeBoite(attendue, LEITNER));
      })
    );
  });

  it('plafonne à la boîte 5 : promouvoir un item déjà au sommet ne le fait pas déborder', () => {
    const item = promouvoir(itemEnBoite(5), LEITNER, INSTANT_DE_REFERENCE);
    expect(item.boite).toBe(5);
    expect(ecartJours(INSTANT_DE_REFERENCE, item.echeanceLe)).toBe(delaiDeBoite(5, LEITNER));
  });

  it('cinq réussites d’affilée mènent de la boîte 1 à la boîte 5, et pas plus vite', () => {
    let item = itemLeitnerInitial('gph.ou', INSTANT_DE_REFERENCE);
    const boitesVues: number[] = [item.boite];
    for (let i = 0; i < 6; i += 1) {
      item = promouvoir(item, LEITNER, item.echeanceLe);
      boitesVues.push(item.boite);
    }
    expect(boitesVues).toEqual([1, 2, 3, 4, 5, 5, 5]);
  });

  it('ne modifie jamais l’item d’entrée : la fonction est pure', () => {
    const avant = itemEnBoite(2);
    const copie = structuredClone(avant);
    promouvoir(avant, LEITNER, INSTANT_DE_REFERENCE);
    expect(avant).toEqual(copie);
  });
});

// ───────────────────────────────────────────────────────────── P7

describe('P7 — un échec renvoie en `boiteApresEchec`, quelle que soit la boîte de départ', () => {
  it('rétrograde depuis n’importe quelle boîte vers la même boîte de repli', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOITES), fc.integer({ min: 0, max: 90 }), (boite, jour) => {
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: jour });
        const maintenant = horloge.maintenant();

        const apres = retrograder(itemEnBoite(boite), LEITNER, maintenant);
        expect(apres.boite).toBe(LEITNER.boiteApresEchec);
        expect(apres.derniereRevueLe).toBe(maintenant);
        expect(ecartJours(maintenant, apres.echeanceLe)).toBe(
          delaiDeBoite(LEITNER.boiteApresEchec, LEITNER)
        );
      })
    );
  });

  it('compte quand même la revue : un échec est un passage, pas une punition (R14)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...BOITES), (boite) => {
        const avant = itemEnBoite(boite);
        expect(retrograder(avant, LEITNER, INSTANT_DE_REFERENCE).nbRevues).toBe(
          avant.nbRevues + 1
        );
      })
    );
  });

  it('conserve l’identifiant de l’item — on ne perd jamais ce qui était en révision', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (nom) => {
        const avant = { ...itemEnBoite(4), item: nom };
        expect(retrograder(avant, LEITNER, INSTANT_DE_REFERENCE).item).toBe(nom);
        expect(promouvoir(avant, LEITNER, INSTANT_DE_REFERENCE).item).toBe(nom);
      })
    );
  });
});

// ───────────────────────────────────────────────────────────── estDue

describe('estDue', () => {
  it('est due à l’instant exact de l’échéance, jamais une seconde avant', () => {
    const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const item = promouvoir(itemLeitnerInitial('gph.on', INSTANT_DE_REFERENCE), LEITNER, INSTANT_DE_REFERENCE);
    const delai = delaiDeBoite(item.boite, LEITNER);

    horloge.avancer({ jours: delai, secondes: -1 });
    expect(estDue(item, horloge.maintenant())).toBe(false);

    horloge.figer(INSTANT_DE_REFERENCE);
    horloge.avancer({ jours: delai });
    expect(estDue(item, horloge.maintenant())).toBe(true);
  });

  it('reste due tant qu’elle n’a pas été revue — une révision oubliée ne s’efface pas', () => {
    const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const item = promouvoir(itemEnBoite(1), LEITNER, INSTANT_DE_REFERENCE);
    horloge.avancer({ jours: 365 });
    expect(estDue(item, horloge.maintenant())).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────── P8

describe('P8 — aucune dérive quand plusieurs révisions tombent le même jour', () => {
  const arbItems = fc.uniqueArray(
    fc.record({
      item: fc.string({ minLength: 1, maxLength: 8 }),
      boite: fc.constantFrom(...BOITES),
      jour: fc.integer({ min: 0, max: 20 }),
    }),
    { selector: (e) => e.item, maxLength: 25 }
  );

  function materialiser(
    bruts: readonly { item: string; boite: NumeroBoite; jour: number }[]
  ): readonly ItemLeitner[] {
    return bruts.map((brut) => {
      const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
      horloge.avancer({ jours: brut.jour });
      return {
        item: brut.item,
        boite: brut.boite,
        derniereRevueLe: INSTANT_DE_REFERENCE,
        echeanceLe: horloge.maintenant(),
        nbRevues: 0,
      };
    });
  }

  it('rend un ordre STABLE : échéance croissante, puis identifiant', () => {
    fc.assert(
      fc.property(arbItems, (bruts) => {
        const items = materialiser(bruts);
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: 30 });
        const maintenant = horloge.maintenant();

        const dus = itemsDus(items, maintenant);
        for (let i = 1; i < dus.length; i += 1) {
          const precedent = dus[i - 1] as ItemLeitner;
          const courant = dus[i] as ItemLeitner;
          const ecart = Date.parse(courant.echeanceLe) - Date.parse(precedent.echeanceLe);
          expect(ecart).toBeGreaterThanOrEqual(0);
          if (ecart === 0) {
            expect(courant.item >= precedent.item).toBe(true);
          }
        }
      })
    );
  });

  it('donne exactement le même résultat d’un appel à l’autre, quel que soit l’ordre d’entrée', () => {
    fc.assert(
      fc.property(arbItems, (bruts) => {
        const items = materialiser(bruts);
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: 30 });
        const maintenant = horloge.maintenant();

        const direct = itemsDus(items, maintenant).map((i) => i.item);
        const inverse = itemsDus([...items].reverse(), maintenant).map((i) => i.item);
        expect(inverse).toEqual(direct);
      })
    );
  });

  it('ne rend que des items réellement dus', () => {
    fc.assert(
      fc.property(arbItems, fc.integer({ min: 0, max: 30 }), (bruts, jour) => {
        const items = materialiser(bruts);
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: jour });
        const maintenant = horloge.maintenant();

        const dus = itemsDus(items, maintenant);
        for (const item of dus) {
          expect(estDue(item, maintenant)).toBe(true);
        }
        expect(dus.length).toBe(items.filter((i) => estDue(i, maintenant)).length);
      })
    );
  });

  it('respecte la limite, en gardant les plus urgents', () => {
    fc.assert(
      fc.property(arbItems, fc.integer({ min: 0, max: 10 }), (bruts, limite) => {
        const items = materialiser(bruts);
        const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
        horloge.avancer({ jours: 30 });
        const maintenant = horloge.maintenant();

        const tous = itemsDus(items, maintenant);
        const bornes = itemsDus(items, maintenant, limite);
        expect(bornes.length).toBe(Math.min(limite, tous.length));
        expect(bornes.map((i) => i.item)).toEqual(tous.slice(0, limite).map((i) => i.item));
      })
    );
  });
});

// ───────────────────────────────────────────────────────────── 90 jours simulés

describe('90 jours simulés — les invariants tiennent sur une saison entière', () => {
  it('la boîte reste dans [1, 5] et l’échéance ne précède jamais la dernière revue', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 90, maxLength: 90 }),
        (reussites) => {
          const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
          let item = itemLeitnerInitial('gph.oi', horloge.maintenant());
          let revues = 0;

          for (const reussite of reussites) {
            horloge.avancer({ jours: 1 });
            const maintenant = horloge.maintenant();
            if (!estDue(item, maintenant)) {
              continue;
            }
            item = reussite
              ? promouvoir(item, LEITNER, maintenant)
              : retrograder(item, LEITNER, maintenant);
            revues += 1;

            expect(item.boite).toBeGreaterThanOrEqual(1);
            expect(item.boite).toBeLessThanOrEqual(NB_BOITES);
            expect(Date.parse(item.echeanceLe)).toBeGreaterThanOrEqual(
              Date.parse(item.derniereRevueLe)
            );
            expect(item.nbRevues).toBe(revues);
          }

          // Une saison de 90 jours ne peut pas laisser un item sans aucune révision :
          // la boîte 1 revient à J+1, la boîte 5 à J+35.
          expect(revues).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('90 réussites d’affilée espacent l’item jusqu’au délai maximal, et pas au-delà', () => {
    const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    let item = itemLeitnerInitial('gph.au', horloge.maintenant());
    let dernierEcart = 0;

    for (let jour = 0; jour < 90; jour += 1) {
      horloge.avancer({ jours: 1 });
      const maintenant = horloge.maintenant();
      if (!estDue(item, maintenant)) continue;
      item = promouvoir(item, LEITNER, maintenant);
      dernierEcart = ecartJours(item.derniereRevueLe, item.echeanceLe);
    }

    expect(item.boite).toBe(NB_BOITES);
    expect(dernierEcart).toBe(delaiDeBoite(NB_BOITES, LEITNER));
  });

  it('un échec après une longue série ramène au repli, sans rien perdre du compteur', () => {
    const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    let item = itemLeitnerInitial('mot.outil.dans', horloge.maintenant());
    for (let i = 0; i < 4; i += 1) {
      item = promouvoir(item, LEITNER, item.echeanceLe);
    }
    expect(item.boite).toBe(NB_BOITES);
    const revuesAvant = item.nbRevues;

    item = retrograder(item, LEITNER, item.echeanceLe);
    expect(item.boite).toBe(LEITNER.boiteApresEchec);
    expect(item.nbRevues).toBe(revuesAvant + 1);
  });
});

// ───────────────────────────────────────────────────── branches défensives

/**
 * Les entrées que le fichier de paramètres réel n'atteint jamais.
 *
 * L'arithmétique de dates est écrite à la main (la règle ESLint interdit `new Date` hors de
 * `horloge.ts`) : c'est exactement le genre de code où une entrée mal formée produit une
 * échéance fausse plutôt qu'une erreur, et où l'item ne revient alors jamais.
 */
describe('branches défensives', () => {
  it('LÈVE sur un horodatage qui n’est pas de l’ISO 8601 UTC, plutôt que de dater à côté', () => {
    for (const instant of ['2026-09-01', '01/09/2026', 'demain', '']) {
      expect(() => promouvoir(itemEnBoite(1), LEITNER, instant)).toThrow();
      expect(() => retrograder(itemEnBoite(1), LEITNER, instant)).toThrow();
    }
  });

  it('ramène une boîte hors bornes dans [1, 5] au lieu de lire hors du tableau', () => {
    for (const boite of [0, -3, 9, 42] as unknown as NumeroBoite[]) {
      const delai = delaiDeBoite(boite, LEITNER);
      expect(LEITNER.delaisJours).toContain(delai);
    }
    // Une boîte 0 promue reste dans le domaine : elle ne descend pas sous 1.
    const remonte = promouvoir(itemEnBoite(0 as unknown as NumeroBoite), LEITNER, INSTANT_DE_REFERENCE);
    expect(remonte.boite).toBeGreaterThanOrEqual(1);
    expect(remonte.boite).toBeLessThanOrEqual(NB_BOITES);
  });

  it('traite une limite négative comme zéro : jamais une tranche à l’envers', () => {
    const items = [itemEnBoite(1), itemEnBoite(2)];
    expect(itemsDus(items, INSTANT_DE_REFERENCE, -5)).toEqual([]);
    expect(itemsDus(items, INSTANT_DE_REFERENCE, 0)).toEqual([]);
  });

  it('garde un ordre stable même si deux items portent le même identifiant', () => {
    // Cas dégénéré : deux lignes de même clé ne peuvent pas coexister en base (clé primaire
    // (profil, item)), mais la fonction pure ne le sait pas — elle ne doit pas pour autant
    // rendre un ordre différent d'un appel à l'autre.
    const jumeaux = [itemEnBoite(1), itemEnBoite(1)];
    expect(itemsDus(jumeaux, INSTANT_DE_REFERENCE).map((i) => i.item)).toEqual(
      itemsDus([...jumeaux].reverse(), INSTANT_DE_REFERENCE).map((i) => i.item)
    );
  });

  it('ajoute des jours à travers un changement d’année et une année bissextile', () => {
    const finAnnee = promouvoir(
      { ...itemEnBoite(4), boite: 4 },
      LEITNER,
      '2027-12-20T23:30:00.000Z'
    );
    // Boîte 5 → J+35 : 20 décembre + 35 jours = 24 janvier de l'année suivante.
    expect(finAnnee.echeanceLe).toBe('2028-01-24T23:30:00.000Z');

    // 2028 est bissextile : 27 février + 3 jours passe par le 29.
    const bissextile = promouvoir(itemEnBoite(1), LEITNER, '2028-02-27T06:00:00.000Z');
    expect(bissextile.echeanceLe).toBe('2028-03-01T06:00:00.000Z');
  });
});
