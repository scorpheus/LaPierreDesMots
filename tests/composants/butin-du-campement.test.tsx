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
import { cleanup, fireEvent, render } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { objetsDuDocument } from '@partage/monde/campement.js';
import type { ObjetCampement } from '@partage/monde/types.js';
import { BESACE, Butin, DESSIN_BUTIN, dessinDuButin, estDessine } from '@client/monde/Butin';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

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
    const empreintes = DECLARES.map((objet) => dessinDuButin(String(objet.code)).asset);
    expect(new Set(empreintes).size).toBe(DECLARES.length);
  });

  it('garde un repli qui dessine, pour un objet que personne n’a prévu', () => {
    // Une récompense muette serait pire qu'une récompense laide : un objet ajouté au fichier
    // de contenu doit s'afficher, même sans ligne de code écrite pour lui.
    expect(dessinDuButin('un-objet-que-nul-na-declare')).toBe(BESACE);
    expect(BESACE.asset.length).toBeGreaterThan(0);
  });

  it('rend chaque objet avec une vraie image raster, jamais un SVG en ligne', () => {
    render(<Butin objets={objets()} />);
    const images = document.querySelectorAll<HTMLImageElement>('img.dessin-butin');
    expect(images).toHaveLength(DECLARES.length);
    expect(document.querySelectorAll('.dessin-butin svg, .dessin-butin path')).toHaveLength(0);
    for (const image of images) {
      expect(image.src).toMatch(/\.png$/u);
    }
  });

  it('livre tous les PNG déclarés avec transparence et au format 256 × 256', () => {
    for (const [code, dessin] of Object.entries(DESSIN_BUTIN)) {
      const chemin = join(RACINE_DEPOT, 'contenu', dessin.asset);
      expect(existsSync(chemin), code).toBe(true);
      const png = readFileSync(chemin);
      expect(png.readUInt32BE(16), `${code} largeur`).toBe(256);
      expect(png.readUInt32BE(20), `${code} hauteur`).toBe(256);
      expect(png[25], `${code} type de couleur PNG`).toBe(6);
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

  /**
   * ── CE CAS A CHANGÉ DE FORME AVEC R26, ET IL FAUT DIRE POURQUOI ─────────────────────────
   *
   * Il exigeait « aucune prise » : `querySelectorAll('[data-butin="oui"] button')` devait
   * rendre zéro. Le père a demandé l'inverse, mot pour mot : « on peut cliquer et voir les
   * Gobi. Il faudrait la même chose en fait dans ce que tu as rapporté. »
   *
   * L'assertion n'est donc pas assouplie, elle est **remplacée par celle qui garde la vraie
   * règle**. Ce que « pas un menu » protégeait n'était pas l'absence de boutons — c'était
   * qu'il n'y ait RIEN À RATER : aucun échec, aucun verrou, aucune impasse. Ça reste vrai, et
   * c'est vérifié ci-dessous. Compter les boutons n'en était qu'un indice, et il est devenu
   * faux le jour où le père a voulu qu'on puisse regarder ses trouvailles.
   */
  it('reste un album et non un menu : on peut ouvrir, jamais rater (R14)', () => {
    render(<Butin objets={objets()} />);

    // Chaque pièce s'ouvre — R26. Un bouton par objet, pas un de plus, pas un de moins.
    const prises = document.querySelectorAll('[data-butin="oui"] button[data-butin-piece]');
    expect(prises.length, 'chaque pièce du butin doit pouvoir s’ouvrir').toBe(6);

    // Et rien ne s'y rate : c'est ça, « pas un menu ».
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    // Jamais de cadenas, jamais de « verrouillé » : le vide est une invitation, pas un refus.
    expect(document.querySelector('[data-butin="oui"]')?.textContent ?? '').not.toMatch(
      /verrouill|cadenas|bloqu/iu
    );
  });

  it('R26 — ouvrir une pièce NON rapportée montre sa fiche, sans révéler sa couleur (R28)', () => {
    // Les deux moitiés de la demande, dans un seul cas : « la même chose que les Gobi » ET
    // « sans donner les couleurs, parce que ça c'est à deviner ».
    render(<Butin objets={objets()} />);
    fireEvent.click(document.querySelector('[data-butin-piece="livre-cite"]') as Element);

    const fiche = document.querySelector('[data-fiche-butin="livre-cite"]');
    expect(fiche, 'taper une pièce non rapportée n’ouvre rien').not.toBeNull();
    expect(fiche?.getAttribute('data-obtenue')).toBe('non');

    expect(
      fiche?.querySelector('[data-fiche-visuel]')?.getAttribute('data-couleur-revelee'),
      'la couleur est montrée : elle devait rester à deviner'
    ).toBe('non');
    expect(fiche?.querySelector('[data-couleur-a-deviner]')).not.toBeNull();
    // Et surtout PAS la phrase de promesse de l'étagère de Gobi : ce n'est pas le même contrat.
    expect(fiche?.querySelector('[data-promesse-couleur]')).toBeNull();
  });

  it('une pièce RAPPORTÉE se montre en couleur — elle est gagnée, il n’y a plus à deviner', () => {
    render(<Butin objets={objets(['braise-volcan'])} />);
    fireEvent.click(document.querySelector('[data-butin-piece="braise-volcan"]') as Element);

    const fiche = document.querySelector('[data-fiche-butin="braise-volcan"]');
    expect(fiche?.getAttribute('data-obtenue')).toBe('oui');
    expect(
      fiche?.querySelector('[data-fiche-visuel]')?.getAttribute('data-couleur-revelee'),
      'un objet rapporté reste en silhouette : la récompense ne se voit pas'
    ).toBe('oui');
    expect(fiche?.querySelector('[data-couleur-a-deviner]')).toBeNull();
  });

  it('la fiche se referme — un panneau sans sortie est le pire défaut possible (D46)', () => {
    render(<Butin objets={objets()} />);
    fireEvent.click(document.querySelector('[data-butin-piece="livre-cite"]') as Element);
    expect(document.querySelector('[data-fiche-butin]')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-fermer-fiche]') as Element);
    expect(
      document.querySelector('[data-fiche-butin]'),
      'la fiche ne se referme pas : l’enfant est piégé dedans'
    ).toBeNull();
  });
});
