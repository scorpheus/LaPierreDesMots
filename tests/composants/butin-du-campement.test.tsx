/**
 * Le butin du campement — ce que l'enfant rapporte de chaque région. Lot S5.
 *
 * ── LE DÉFAUT QUE CE FICHIER GARDE, ET IL ÉTAIT VISIBLE À L'ÉCRAN ────────────────────────────
 *
 * `contenu/monde/campement.json` déclare six objets rapportés, le serveur les sert depuis
 * toujours (`serveur/src/depots/monde.ts:503`) et `EcranCampement` n'en rendait **aucun**.
 * L'enfant terminait la Clairière, en rapportait le fanion, revenait au campement — et rien
 * n'avait changé. Le coffre, lui, en montrait six cases : six besaces grises identiques.
 *
 * Les données viennent du DISQUE. Un test qui fabriquerait ses six objets passerait le jour où
 * le fichier de contenu en déclarerait sept — c'est-à-dire le jour où il faudrait qu'il parle.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { objetsDuDocument } from '@partage/monde/campement.js';
import type { ObjetCampement } from '@partage/monde/types.js';
import { BESACE, Butin, DESSIN_BUTIN, dessinDuButin, estDessine } from '@client/monde/Butin';

import { lireJson } from '../configuration/preparation.js';

const DECLARES = objetsDuDocument(lireJson('contenu/monde/campement.json'));

/**
 * Le plancher de population — une par région ouvrable, six au 2026-08-03.
 *
 * C'est un PLANCHER et non une égalité, pour la raison écrite en tête de fichier : le jour où
 * le contenu déclarera un septième objet, ce cas doit continuer d'exiger qu'il soit dessiné,
 * pas se plaindre qu'il existe. Ce qu'il interdit, c'est la disparition silencieuse.
 */
const OBJETS_RAPPORTES_MIN = 6;

/** Les objets tels que le serveur les rend : les mêmes, plus la date de pose. */
function objets(rapportes: readonly string[] = []): readonly ObjetCampement[] {
  return DECLARES.map((objet) => ({
    code: objet.code,
    libelle: objet.libelle,
    asset: objet.asset,
    region: objet.region,
    placeLe: rapportes.includes(String(objet.code)) ? '2026-09-01T08:00:00.000Z' : null
  }));
}

afterEach(cleanup);

describe('chaque butin a son propre dessin', () => {
  it('dessine les SIX objets du fichier réel, sans qu’aucun ne retombe sur la besace', () => {
    const sansDessin = DECLARES.filter((objet) => !estDessine(String(objet.code)));
    const nbDessines = DECLARES.length - sansDessin.length;
    console.log(
      `[S5] ${String(DECLARES.length)} objet(s) déclaré(s) · ${String(nbDessines)} dessiné(s) · ` +
        `repli : ${sansDessin.map((objet) => String(objet.code)).join(', ') || 'aucun'}`
    );
    // LE PLANCHER DE POPULATION, ET IL N'EST PAS DÉCORATIF : sans lui, un `campement.json`
    // vidé de ses objets rendrait `sansDessin` vide, donc le cas VERT — à zéro objet dessiné.
    // Un test qui reste vert quand son sujet disparaît ne garde rien.
    expect(DECLARES.length, 'le campement ne déclare plus ses six objets rapportés').toBeGreaterThanOrEqual(
      OBJETS_RAPPORTES_MIN
    );
    // La FRACTION, pas seulement le numérateur : tous les déclarés sont dessinés.
    expect(nbDessines, 'des objets déclarés retombent sur la besace').toBe(DECLARES.length);
    expect(sansDessin.map((objet) => String(objet.code))).toEqual([]);
  });

  it('donne des SILHOUETTES distinctes : deux formes identiques ne se collectionnent pas (D44)', () => {
    // C'est la propriété, pas l'indice : compter six cases ne dit rien si les six sont le même
    // sac gris. On compare la matière des tracés, pas leur nombre.
    const empreintes = DECLARES.map((objet) =>
      dessinDuButin(String(objet.code))
        .traces.map((trace) => trace.d)
        .join('|')
    );
    expect(new Set(empreintes).size).toBe(DECLARES.length);
  });

  it('garde un repli qui dessine, pour un objet que personne n’a prévu', () => {
    // Une récompense muette serait pire qu'une récompense laide : un objet ajouté au fichier
    // de contenu doit s'afficher, même sans ligne de code écrite pour lui.
    expect(dessinDuButin('un-objet-que-nul-na-declare')).toBe(BESACE);
    expect(BESACE.traces.length).toBeGreaterThan(0);
  });

  it('cerne CHAQUE tracé du trait du projet, 4 px — v2 § 9.1', () => {
    render(<Butin objets={objets()} />);
    const traces = document.querySelectorAll('.dessin-butin path');
    expect(traces.length).toBeGreaterThan(0);
    for (const trace of traces) {
      expect(trace.getAttribute('stroke')).toBe('var(--trait)');
      expect(trace.getAttribute('stroke-width')).toBe('4');
    }
  });

  it('n’emploie que des jetons de la palette, jamais une teinte inventée', () => {
    for (const [code, dessin] of Object.entries(DESSIN_BUTIN)) {
      for (const trace of dessin.traces) {
        expect(
          trace.aplat === 'none' || /^var\(--[a-z-]+\)$/u.test(trace.aplat),
          `${code} : aplat « ${trace.aplat} »`
        ).toBe(true);
      }
    }
  });
});

describe('la case qui manque est visible, jamais cachée (D44, D25 point 3)', () => {
  it('rend les six cases dès le premier jour, aucune rapportée', () => {
    render(<Butin objets={objets()} />);
    const cases = document.querySelectorAll('[data-butin-piece]');
    expect(cases).toHaveLength(DECLARES.length);
    expect(document.querySelectorAll('[data-rapporte="non"]')).toHaveLength(DECLARES.length);
    const section = document.querySelector('[data-butin="oui"]');
    expect(section?.getAttribute('data-butin-total')).toBe(String(DECLARES.length));
    expect(section?.getAttribute('data-butin-rapportes')).toBe('0');
  });

  it('ne retire aucune case quand une pièce arrive — le compte monte, la liste ne bouge pas', () => {
    render(<Butin objets={objets(['fanion-clairiere', 'geode-galeries'])} />);
    expect(document.querySelectorAll('[data-butin-piece]')).toHaveLength(DECLARES.length);
    expect(document.querySelector('[data-butin="oui"]')?.getAttribute('data-butin-rapportes'))
      .toBe('2');
    expect(
      document.querySelector('[data-butin-piece="fanion-clairiere"]')?.getAttribute('data-rapporte')
    ).toBe('oui');
  });

  it('nomme chaque case, gagnée ou non — le nom est ce que l’enfant peut encore trouver', () => {
    render(<Butin objets={objets(['braise-volcan'])} />);
    const brasier = document.querySelector('[data-butin-piece="braise-volcan"]');
    expect(brasier?.getAttribute('aria-label')).toContain('rapporté');
    const livre = document.querySelector('[data-butin-piece="livre-cite"]');
    expect(livre?.getAttribute('aria-label')).toContain('encore à rapporter');
    // Le libellé reste du texte NORMAL : le voile du creux porte sur le dessin, jamais sur le
    // mot. C'est le défaut de contraste que M8 a mesuré sur l'étagère (3,88 pour 4,5 exigé).
    expect(livre?.textContent).toContain('le livre de la Cité des Histoires');
  });

  it('n’est pas un menu : aucune prise, donc rien à rater (R14)', () => {
    render(<Butin objets={objets()} />);
    expect(document.querySelectorAll('[data-butin="oui"] button')).toHaveLength(0);
    expect(document.querySelectorAll('[data-butin="oui"] a')).toHaveLength(0);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    // Jamais de cadenas, jamais de « verrouillé » : le vide est une invitation, pas un refus.
    expect(document.querySelector('[data-butin="oui"]')?.textContent ?? '').not.toMatch(
      /verrouill|cadenas|bloqu/iu
    );
  });
});
