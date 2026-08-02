/**
 * PROPRIÉTÉ 3 — quel que soit l'ordre des révisions, AUCUN item n'est perdu ni dupliqué.
 *
 * Lot Q3. C'est la propriété de CONSERVATION du Leitner, et elle n'avait aucun garde.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE À `leitner.test.ts`
 *
 * `tests/unitaires/leitner.test.ts` est solide et couvre P6, P7, P8 : la promotion d'un cran,
 * le repli sur échec, l'ordre stable, 90 jours simulés. Toutes ses propriétés portent sur **un
 * item à la fois**, ou sur `itemsDus` d'un seul appel.
 *
 * Aucune ne porte sur la POPULATION. Or c'est là que vit la perte silencieuse : un paquet de
 * révisions qui, au fil des passages, perd un item, en duplique un autre, ou en substitue un
 * quand la limite tronque. L'enfant ne verrait rien — un mot outil cesserait simplement de
 * revenir, et « personne ne le voit avant trois semaines » (annexe T § 1). C'est aussi
 * exactement la forme du défaut n° 4 du père : « l'enfant termine, rien n'est sauvé ».
 *
 * Ici : une population d'items engendrée, une SÉQUENCE de séances engendrée — chacune avance
 * l'horloge, prend les items dus, en promeut certains et en rétrograde d'autres — et la
 * conservation est vérifiée à chaque séance.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * SOURCE QUI FAIT FOI, LUE ET JAMAIS RECALCULÉE :
 * `contenu/referentiel/parametres-pedagogie.json` — les cinq délais J+1/J+3/J+7/J+16/J+35 et
 * la boîte de repli. Aucun délai n'est réécrit ici.
 *
 * AUCUNE HORLOGE RÉELLE : toutes les fonctions du Leitner prennent `maintenant` en argument,
 * et les instants de ce fichier sont fabriqués par arithmétique de chaînes ISO. Pas un
 * `new Date`, pas un `Date.now`.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  delaiDeBoite, estDue, itemLeitnerInitial, itemsDus, promouvoir, retrograder,
} from '@partage/pedagogie/leitner.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';
import type { ItemLeitner, NumeroBoite, ParametresLeitner } from '@pierre/partage';

import { lireJson } from '../configuration/preparation.js';
import { NB_CAS, reglages } from './propriete-outils.js';

const PARAMETRES: ParametresLeitner = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json'),
).leitner;

const NB_BOITES = 5;

/**
 * Un instant ISO 8601 UTC à J+`jours` d'une origine fixe, sans jamais construire de `Date`.
 *
 * On ne fait pas d'arithmétique civile ici — ce serait recalculer ce que `leitner.ts` calcule,
 * et donc écrire un second exemplaire de la règle qu'on prétend vérifier. On se contente
 * d'engendrer des instants CROISSANTS à l'intérieur d'un même mois de 28 jours, ce qui suffit
 * amplement : la propriété est la conservation, pas l'arithmétique des dates, laquelle est
 * déjà gardée par `leitner.test.ts` (« ajoute des jours à travers un changement d'année et une
 * année bissextile »).
 */
function instant(jours: number): string {
  const j = String(Math.min(28, Math.max(1, jours + 1))).padStart(2, '0');
  return `2026-09-${j}T08:00:00Z`;
}

const ORIGINE = instant(0);

/** Une population d'items, tous distincts, tous fraîchement rencontrés. */
const arbPopulation: fc.Arbitrary<readonly ItemLeitner[]> = fc
  .uniqueArray(
    fc.oneof(
      fc.constantFrom('gph.a', 'gph.ou', 'gph.ch', 'gph.on', 'mot.le', 'mot.la', 'mot.un'),
      fc.string({ minLength: 1, maxLength: 6 }),
    ),
    { minLength: 1, maxLength: 25 },
  )
  .map((noms) => noms.map((nom) => itemLeitnerInitial(nom, ORIGINE)));

/** Une séance : on avance de `jours`, et on tire au sort qui réussit. */
interface Seance {
  readonly jours: number;
  readonly reussites: readonly boolean[];
  readonly limite: number | null;
}

const arbSeance: fc.Arbitrary<Seance> = fc.record({
  jours: fc.integer({ min: 0, max: 40 }),
  reussites: fc.array(fc.boolean(), { maxLength: 25 }),
  limite: fc.option(fc.integer({ min: -2, max: 30 }), { nil: null }),
});

const arbSeances = fc.array(arbSeance, { maxLength: 12 });

/** Le multi-ensemble des identifiants, trié : c'est la grandeur qui doit être conservée. */
function identifiants(items: readonly ItemLeitner[]): readonly string[] {
  return [...items.map((item) => item.item)].sort();
}

// ═════════════════════════════════════════ L1 — la conservation de la population

describe('L1 — aucun item n’est perdu ni dupliqué, quel que soit l’ordre des révisions', () => {
  it(`${String(NB_CAS)} calendriers engendrés, conservation vérifiée à chaque séance`, () => {
    let seancesJouees = 0;
    let revisionsFaites = 0;
    let promotions = 0;
    let repliements = 0;

    fc.assert(
      fc.property(arbPopulation, arbSeances, (population, seances) => {
        const attendu = identifiants(population);
        let courants = [...population];
        let jour = 0;

        for (const [rang, seance] of seances.entries()) {
          jour += seance.jours;
          const maintenant = instant(jour);
          const limite = seance.limite;
          const dus =
            limite === null
              ? itemsDus(courants, maintenant)
              : itemsDus(courants, maintenant, limite);
          const ou = `séance ${String(rang)} · jour ${String(jour)}`;

          // 1. `itemsDus` ne fabrique rien : tout ce qu'elle rend appartient à la population,
          //    en un seul exemplaire, et se trouve réellement dû.
          expect(new Set(dus.map((i) => i.item)).size, `${ou} : itemsDus a rendu un doublon`).toBe(
            dus.length,
          );
          for (const du of dus) {
            expect(
              courants.some((item) => item.item === du.item),
              `${ou} : itemsDus a rendu « ${du.item} », absent de la population`,
            ).toBe(true);
            expect(estDue(du, maintenant), `${ou} : « ${du.item} » n’était pas dû`).toBe(true);
          }

          // 2. Une limite TRONQUE, elle ne substitue pas : la liste limitée est le préfixe
          //    exact de la liste complète. Sans cette assertion, un item pourrait sortir du
          //    paquet et un autre y entrer sans que le compte total bouge.
          if (limite !== null) {
            const complete = itemsDus(courants, maintenant);
            expect(dus.length, `${ou} : la limite n’a pas été respectée`).toBeLessThanOrEqual(
              Math.max(0, Math.trunc(limite)),
            );
            expect(dus, `${ou} : la limite a SUBSTITUÉ un item au lieu de tronquer`).toEqual(
              complete.slice(0, dus.length),
            );
          }

          // 3. On révise : chaque item dû est promu ou rétrogradé, jamais oublié.
          const parItem = new Map(courants.map((item) => [item.item, item]));
          for (const [index, du] of dus.entries()) {
            const reussi = seance.reussites[index % Math.max(1, seance.reussites.length)] ?? true;
            const avant = parItem.get(du.item) as ItemLeitner;
            const apres = reussi
              ? promouvoir(avant, PARAMETRES, maintenant)
              : retrograder(avant, PARAMETRES, maintenant);
            if (reussi) promotions += 1;
            else repliements += 1;
            revisionsFaites += 1;

            // L'identifiant est le seul champ qui ne change JAMAIS : c'est lui qui porte
            // l'identité de l'item à travers toutes ses révisions.
            expect(apres.item, `${ou} : la révision a renommé l’item`).toBe(avant.item);
            expect(apres.boite, `${ou} : boîte hors [1, 5]`).toBeGreaterThanOrEqual(1);
            expect(apres.boite).toBeLessThanOrEqual(NB_BOITES);
            expect(apres.nbRevues, `${ou} : le compteur de revues a reculé`).toBe(
              avant.nbRevues + 1,
            );
            expect(
              Date.parse(apres.echeanceLe),
              `${ou} : l’échéance précède la dernière revue`,
            ).toBeGreaterThanOrEqual(Date.parse(apres.derniereRevueLe));
            parItem.set(apres.item, apres);
          }
          courants = [...parItem.values()];
          seancesJouees += 1;

          // 4. LA PROPRIÉTÉ, à chaque séance : l'ensemble des identifiants est INCHANGÉ.
          expect(
            identifiants(courants),
            `${ou} : la population a changé — un item a été perdu ou dupliqué`,
          ).toEqual(attendu);
          expect(courants.length, `${ou} : le compte d’items a changé`).toBe(population.length);
        }
      }),
      reglages(),
    );

    console.log(
      `[Q3-P3] séances jouées=${String(seancesJouees)} · révisions=${String(revisionsFaites)} · ` +
        `promotions=${String(promotions)} · repliements=${String(repliements)}`,
    );
    // Planchers : une propriété de conservation qui n'aurait révisé aucun item serait verte
    // sans avoir rien conservé du tout. Les DEUX issues doivent avoir été exercées.
    expect(seancesJouees, 'aucune séance jouée').toBeGreaterThan(NB_CAS);
    expect(revisionsFaites, 'aucune révision effectuée').toBeGreaterThan(NB_CAS);
    expect(promotions, 'aucune promotion : `promouvoir` n’a jamais tourné').toBeGreaterThan(0);
    expect(repliements, 'aucun repli : `retrograder` n’a jamais tourné').toBeGreaterThan(0);
  });
});

// ═════════════════════════════ L2 — la partition dû / pas encore dû est totale

describe('L2 — chaque item est soit DÛ, soit à venir : jamais perdu entre les deux', () => {
  it('la partition est exhaustive et disjointe, à tout instant', () => {
    fc.assert(
      fc.property(arbPopulation, fc.integer({ min: 0, max: 40 }), (population, jour) => {
        const maintenant = instant(jour);
        const dus = itemsDus(population, maintenant);
        const aVenir = population.filter((item) => !estDue(item, maintenant));
        // Exhaustive : rien ne tombe entre les deux paquets.
        expect(
          dus.length + aVenir.length,
          'un item n’est ni dû ni à venir : il a disparu du calendrier',
        ).toBe(population.length);
        // Disjointe : rien n'est dans les deux.
        const croisement = dus.filter((du) => aVenir.some((autre) => autre.item === du.item));
        expect(croisement, 'un item est à la fois dû et à venir').toEqual([]);
      }),
      reglages(),
    );
  });
});

// ═══════════════════════ L3 — l'ordre d'entrée n'a aucune influence

describe('L3 — l’ordre d’entrée ne change RIEN au paquet rendu', () => {
  /**
   * Le contrat le dit : « aucun `Alea` n'entre ici, et c'est délibéré : mélanger les révisions
   * dues rendrait deux rejeux du même journal différents ».
   *
   * `leitner.test.ts` le vérifie déjà sur 100 permutations. Ici on le vérifie sur des
   * populations engendrées ET à des instants engendrés, mille fois — et surtout on vérifie que
   * la LISTE est identique, pas seulement son contenu : deux ordres différents rendraient un
   * rejeu comparable item par item impossible.
   */
  it('mille permutations : la liste rendue est identique, dans le même ordre', () => {
    fc.assert(
      fc.property(
        arbPopulation,
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (population, jour, melange) => {
          const maintenant = instant(jour);
          // Permutation déterministe, sans `Math.random` : un tri par clé dérivée de l'entier
          // tiré par fast-check. Reproductible, et différente d'un cas à l'autre.
          const permutee = [...population].sort((a, b) => {
            const cle = (nom: string): number => {
              let h = melange >>> 0;
              for (let i = 0; i < nom.length; i += 1) h = (Math.imul(h ^ nom.charCodeAt(i), 16777619) >>> 0);
              return h;
            };
            return cle(a.item) - cle(b.item);
          });
          expect(
            itemsDus(permutee, maintenant),
            'l’ordre d’entrée a changé le paquet rendu : test:rejeu deviendrait ininterprétable',
          ).toEqual(itemsDus(population, maintenant));
        },
      ),
      reglages(),
    );
  });
});

// ═════════════════ L4 — le calendrier ne dérive pas : le délai est celui de la boîte

describe('L4 — l’échéance suit toujours le délai de la boîte d’ARRIVÉE', () => {
  it('promotion et repli posent l’échéance déclarée en données, jamais une autre', () => {
    let vus = 0;
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: NB_BOITES }),
        fc.integer({ min: 0, max: 27 }),
        fc.boolean(),
        (boiteDepart, jour, reussi) => {
          const maintenant = instant(jour);
          const depart: ItemLeitner = {
            item: 'gph.a',
            boite: boiteDepart as NumeroBoite,
            derniereRevueLe: ORIGINE,
            echeanceLe: ORIGINE,
            nbRevues: 2,
          };
          const apres = reussi
            ? promouvoir(depart, PARAMETRES, maintenant)
            : retrograder(depart, PARAMETRES, maintenant);
          vus += 1;

          // La boîte d'arrivée est la loi : un cran de plus, ou la boîte de repli.
          const attendue = reussi
            ? Math.min(NB_BOITES, boiteDepart + 1)
            : PARAMETRES.boiteApresEchec;
          expect(apres.boite, 'la boîte d’arrivée n’est pas celle que la loi impose').toBe(
            attendue,
          );

          // L'écart en jours est celui que les DONNÉES déclarent pour cette boîte. On le lit,
          // on ne le réécrit pas : réécrire J+1/J+3/J+7/J+16/J+35 ici créerait une seconde
          // source de vérité, exactement ce que C2 interdit.
          const delai = delaiDeBoite(apres.boite, PARAMETRES);
          const ecartMs = Date.parse(apres.echeanceLe) - Date.parse(apres.derniereRevueLe);
          expect(ecartMs / 86_400_000, `boîte ${String(apres.boite)} : délai faux`).toBe(delai);
        },
      ),
      reglages(),
    );
    expect(vus, 'aucune promotion ni repli évalué').toBeGreaterThanOrEqual(NB_CAS);
  });
});

// ══════════════════════════════════════════════════════ CONTRAT DE SORTIE

describe('CONTRAT DE SORTIE — la propriété 3 a bien tourné, et sur quoi', () => {
  it('imprime délais, boîtes, propriétés — et échoue si les données sont creuses', () => {
    const delais = [1, 2, 3, 4, 5].map((b) => delaiDeBoite(b as NumeroBoite, PARAMETRES));
    console.log(
      [
        `[Q3-P3] boîtes ....................... ${String(NB_BOITES)}`,
        `[Q3-P3] délais lus en données (jours)  ${delais.join(' / ')}`,
        `[Q3-P3] boîte après échec ............ ${String(PARAMETRES.boiteApresEchec)}`,
        `[Q3-P3] propriétés de ce fichier ..... 4`,
        `[Q3-P3] cas engendrés par propriété .. ${String(NB_CAS)}`,
      ].join('\n'),
    );
    expect(delais.length, 'les cinq délais ne sont pas lisibles').toBe(5);
    // Un SRS dont les délais ne croissent pas n'est plus un SRS : le fichier de données
    // pourrait le casser sans qu'aucune ligne de code ne change.
    for (let i = 1; i < delais.length; i += 1) {
      expect(delais[i] as number, `le délai de la boîte ${String(i + 1)} ne croît pas`)
        .toBeGreaterThan(delais[i - 1] as number);
    }
    expect(NB_CAS, 'moins de mille cas par propriété').toBeGreaterThanOrEqual(1000);
  });
});
