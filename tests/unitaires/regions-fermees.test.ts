/**
 * Le contrôle bloquant des régions fermées — lot N7, contrat de finition v3 § 4.7 et § 9.2.
 *
 * « Un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image »
 * (CLAUDE.md, annexe P § 3.2). Ce fichier fait deux choses, et l'ordre compte :
 *
 *   1. **Il contrôle l'instrument avant de s'en servir.** Un SVG volontairement fautif doit
 *      être attrapé, un SVG sain doit passer, et la convention de signe de l'aire doit être
 *      celle qu'on croit. Sans cette première moitié, la seconde pourrait « réussir » parce
 *      qu'elle ne mesure rien — c'est le mode de défaillance d'un détecteur qui déclare un
 *      poids qu'il n'applique jamais.
 *   2. **Il applique l'instrument à TOUS les SVG de `contenu/`**, y compris ceux qu'aucun
 *      habillage ne déclare (la carte, le campement, les stades de Gobi).
 *
 * Le chiffre publié — nombre de SVG parcourus, d'éléments dessinés, de régions déclarées —
 * échouerait si le parcours était vide : un contrôle qui ne trouve rien n'est pas un contrôle
 * qui réussit.
 */
import { describe, expect, it } from 'vitest';

import { estCheminFerme } from '@pierre/partage/validation';

import {
  aireSignee,
  auditerSvg,
  elementsDessines,
  mesureDeRegion,
  pointDansRegion,
  polygonesDuChemin,
  REGLES_BLOQUANTES,
  verifierRegionsFermees,
} from '../../scripts/verifier-regions-fermees.mjs';
import { RACINE_DEPOT } from '../configuration/preparation.js';

// ══════════════════════════════════════════════ 1. le contrôle de l'instrument lui-même

describe('la géométrie mesure ce qu’elle prétend mesurer', () => {
  it('la convention de signe est celle du contrat § 2.1 : positif = horaire à l’écran', () => {
    // Le triangle témoin du contrat de finition v3 § 2.1, repris à la lettre. En coordonnées
    // SVG l'axe `y` descend : (0,0) → (1,0) → (1,1) est HORAIRE à l'écran.
    expect(
      aireSignee([
        [0, 0],
        [1, 0],
        [1, 1],
      ])
    ).toBeGreaterThan(0);
  });

  it('un carré de 10 × 10 mesure 100, centroïde au milieu', () => {
    const mesure = mesureDeRegion('M0,0 L10,0 L10,10 L0,10 Z');
    expect(mesure).not.toBeNull();
    expect(Math.abs(mesure!.surface)).toBeCloseTo(100, 6);
    expect(mesure!.centroide[0]).toBeCloseTo(5, 6);
    expect(mesure!.centroide[1]).toBeCloseTo(5, 6);
  });

  it('un trou `evenodd` se SOUSTRAIT, il ne s’ajoute pas', () => {
    // Carré 10 × 10 percé d'un carré 4 × 4 centré : 100 − 16 = 84.
    const mesure = mesureDeRegion('M0,0 L10,0 L10,10 L0,10 Z M3,3 L7,3 L7,7 L3,7 Z');
    expect(Math.abs(mesure!.surface)).toBeCloseTo(84, 6);
    // Le trou est centré : le centroïde ne bouge pas.
    expect(mesure!.centroide[0]).toBeCloseTo(5, 6);
  });

  it('le point dans un trou n’est PAS dans la région', () => {
    const anneaux = polygonesDuChemin('M0,0 L10,0 L10,10 L0,10 Z M3,3 L7,3 L7,7 L3,7 Z')!;
    expect(pointDansRegion(anneaux, [1, 1])).toBe(true);
    expect(pointDansRegion(anneaux, [5, 5])).toBe(false);
    expect(pointDansRegion(anneaux, [20, 20])).toBe(false);
  });

  it('un arc rend `null` plutôt qu’une surface approchée', () => {
    // L'aveu vaut mieux que l'approximation : c'est la grandeur qu'on compare à 2 %.
    expect(polygonesDuChemin('M250,464 A40,40 0 1 0 330,464 A40,40 0 1 0 250,464 Z')).toBeNull();
    expect(mesureDeRegion('M250,464 A40,40 0 1 0 330,464 Z')).toBeNull();
  });

  it('un anneau non refermé rend `null` : il n’a pas d’aire', () => {
    expect(polygonesDuChemin('M0,0 L10,0 L10,10')).toBeNull();
  });

  it('le `fill` s’hérite du `<g>` parent, et le calque aussi', () => {
    const elements = elementsDessines(
      '<svg><g id="calque-trait" fill="none"><path id="a" d="M0,0 L1,1"/></g>' +
        '<g id="calque-zones"><path id="b" d="M0,0 L1,0 L1,1 Z"/></g></svg>'
    );
    expect(elements.map((e) => [e.id, e.fill, e.calque])).toEqual([
      ['a', 'none', 'calque-trait'],
      // Sans `fill` nulle part, la valeur SVG par défaut est `black` : le doute penche vers
      // le contrôle, jamais vers le silence.
      ['b', 'black', 'calque-zones'],
    ]);
  });
});

describe('l’instrument attrape les quatre défauts qu’il annonce', () => {
  const habillage = {
    id: 'temoin',
    scene: {
      fichier: 'habillages/temoin/temoin.svg',
      calques: [
        {
          id: 'calque-zones',
          role: 'coloriable',
          regions: [{ id: 'carre', libelle: 'le carré', centroide: [5, 5], surface: 100 }],
        },
        { id: 'calque-trait', role: 'trait', regions: [] },
      ],
    },
  };

  const auditer = (texteSvg: string) =>
    auditerSvg({ chemin: 'temoin.svg', texteSvg, habillage, estCheminFerme }).anomalies.map(
      (a: { regle: string }) => a.regle
    );

  const SAIN =
    '<svg><g id="calque-zones"><path id="carre" d="M0,0 L10,0 L10,10 L0,10 Z"/></g>' +
    '<g id="calque-trait" fill="none"><path d="M0,0 L10,10"/></g></svg>';

  it('un décor sain ne déclenche rien — sans ce cas, tous les autres seraient sans valeur', () => {
    expect(auditer(SAIN)).toEqual([]);
  });

  it('`chemin-ouvert` — un tracé rempli sans `Z` fait fuiter le remplissage', () => {
    expect(auditer(SAIN.replace('L0,10 Z', 'L0,10'))).toContain('chemin-ouvert');
  });

  it('`trait-rempli` — le calque que `validerSceneSvg` exempte, et que rien ne contrôlait', () => {
    expect(auditer(SAIN.replace('id="calque-trait" fill="none"', 'id="calque-trait"'))).toContain(
      'trait-rempli'
    );
  });

  it('`region-declaree-absente` — une consigne qui nomme une région absente est injouable', () => {
    expect(auditer(SAIN.replace('id="carre"', 'id="autre-chose"'))).toContain(
      'region-declaree-absente'
    );
  });

  it('`region-non-declaree` — dessinée, jamais recoloriée, absente du pourcentage', () => {
    // C'est la règle « auditer les OBJETS, jamais les occurrences » : on énumère les objets
    // dessinés, pas les mentions d'un identifiant.
    expect(
      auditer(SAIN.replace('</g>', '<path id="orphelin" d="M20,20 L30,20 L30,30 Z"/></g>'))
    ).toContain('region-non-declaree');
  });

  it('`surface-divergente` — un rayon de visée faux fait peindre la région voisine', () => {
    expect(
      auditer(SAIN.replace('L10,0 L10,10 L0,10', 'L40,0 L40,40 L0,40'))
    ).toContain('surface-divergente');
  });

  it('`centroide-hors-region` — le centroïde déclaré doit tomber DANS sa région', () => {
    // Le carré est déplacé au loin ; le centroïde [5, 5] de l'habillage n'y est plus.
    expect(auditer(SAIN.replace('M0,0 L10,0 L10,10 L0,10 Z', 'M90,90 L100,90 L100,100 L90,100 Z')))
      .toContain('centroide-hors-region');
  });
});

// ══════════════════════════════════════════════════ 2. l'instrument sur le dépôt réel

/**
 * TROIS DÉFAUTS TROUVÉS DANS DES FICHIERS QUE N7 NE POSSÈDE PAS — inventaire nommé, pas
 * exemption.
 *
 * `contenu/assets/gobi/**` appartient à **N3** (contrat de finition v3 § 4.3). Un seul
 * écrivain par fichier : N7 les mesure, les nomme, et n'y touche pas.
 *
 * ── POURQUOI RIEN NE LES AVAIT VUS, mesuré et cité ─────────────────────────────────────────
 *   $ node scripts/test-contenu.mjs
 *   ✗ contenu/assets/gobi/animation/joie.svg : [contrôle P3.2] aucun habillage ni document de
 *     `contenu/monde/` ne déclare ce SVG … Contenu mort, ou déclaration manquante.
 *
 * `test-contenu.mjs` classe ces fichiers « contenu mort » et **`continue`** : il ne leur
 * applique jamais le contrôle de fermeture. Tout `contenu/assets/gobi/` — 5 animations,
 * 10 stades, les formes de graphème — était donc hors de portée du seul contrôle P3.2 qui
 * existait. Ce fichier-ci est le premier à les lire.
 *
 * ── CE QUE CHACUN EST ──────────────────────────────────────────────────────────────────────
 * Les trois sont le même défaut : un `<path>` qui ne porte QUE des attributs de trait
 * (`stroke`, `stroke-width`), dans un `<g>` qui ne pose pas `fill`. La valeur SVG par défaut
 * de `fill` est `black` : le tracé est donc rempli de noir, et il est ouvert. Leurs voisins
 * immédiats dans le même groupe portent tous `fill="none"` — c'est un oubli, pas une
 * convention.
 *
 * L'ÉGALITÉ EST EXACTE, jamais un `>=`. Un quatrième défaut fait échouer ce cas ; la
 * correction d'un des trois par N3 le fait échouer aussi, ce qui force à retirer la ligne
 * plutôt qu'à laisser l'inventaire pourrir. C'est renforcé, jamais assoupli.
 */
/**
 * ── INVENTAIRE SOLDÉ À L'INTÉGRATION DE LA CAMPAGNE N ──────────────────────────────────────
 *
 * Cette liste portait les trois défauts nommés ci-dessus. **Les trois sont corrigés**, et la
 * consigne à suivre était écrite par N7 lui-même, quelques lignes plus haut : « la correction
 * d'un des trois par N3 le fait échouer aussi, ce qui force à RETIRER LA LIGNE plutôt qu'à
 * laisser l'inventaire pourrir ». C'est donc l'action prévue par le test, pas un contournement.
 *
 * Le remède était le même pour les trois, et c'était bien l'oubli que N7 avait diagnostiqué :
 * ajouter `fill="none"` sur un `<path>` qui ne porte que des attributs de trait. Leurs voisins
 * immédiats, dans le même `<g>`, le portaient déjà.
 *
 *   contenu/assets/gobi/animation/joie.svg:50    les deux dents blanches
 *   contenu/assets/gobi/stades/stade-2.svg:24    le rai de lumière (`premiere-lueur`)
 *   contenu/assets/gobi/stades/stade-2.svg:25    les deux étincelles latérales
 *
 * **La liste vide est plus forte que la liste pleine** : `toEqual([])` échoue désormais au
 * PREMIER tracé ouvert qui réapparaîtra dans tout `contenu/`, sans exemption d'aucune sorte.
 * C'est l'état que N7 visait ; il ne pouvait pas l'atteindre lui-même, `contenu/assets/gobi/`
 * appartenant à N3 (un seul écrivain par fichier).
 */
const DEFAUTS_DE_N3: readonly string[] = [];

describe('aucune région ouverte dans `contenu/` — contrat de sortie de N7', () => {
  const rapport = verifierRegionsFermees({ racine: RACINE_DEPOT, estCheminFerme });
  const etiquette = (a: { regle: string; ou: string }): string => `${a.regle} — ${a.ou}`;

  it('le parcours a bien trouvé quelque chose à mesurer', () => {
    // Sans ce cas, « 0 anomalie » pourrait vouloir dire « 0 fichier lu ».
    expect(rapport.nbSvg).toBeGreaterThanOrEqual(39);
    expect(rapport.nbElements).toBeGreaterThan(100);
    expect(rapport.nbRegionsDeclarees).toBeGreaterThan(60);
    expect(rapport.nbHabillagesApparies).toBeGreaterThanOrEqual(37);
  });

  it('ZÉRO anomalie bloquante hors des trois défauts nommés, qui sont à N3', () => {
    const restantes = rapport.bloquantes
      .map(etiquette)
      .filter((e: string) => !DEFAUTS_DE_N3.includes(e));
    expect(restantes, `\n${restantes.join('\n')}`).toEqual([]);
  });

  it('les trois défauts de N3 sont TOUJOURS LÀ, tous les trois, et pas un de plus', () => {
    // Égalité exacte : un quatrième défaut échoue, et la correction d'un des trois échoue
    // aussi — c'est ce qui empêche l'inventaire de survivre au problème qu'il décrit.
    expect([...rapport.bloquantes.map(etiquette)].sort()).toEqual([...DEFAUTS_DE_N3].sort());
  });

  it('les règles bloquantes couvrent bien les quatre familles annoncées', () => {
    expect([...REGLES_BLOQUANTES].sort()).toEqual([
      'chemin-ouvert',
      'region-declaree-absente',
      'region-non-declaree',
      'trait-rempli',
    ]);
  });

  it('les deux décors v2 du lot N7 passent aussi la MÉTROLOGIE, sans exemption', () => {
    // Les 37 habillages livrés avant ce lot portent des centroïdes posés à la main et des
    // géométries en arcs : ils sont hors du domaine mesurable et ne sont pas jugés ici
    // (contrat de finition v3 § 4.7 — N7 possède deux habillages, pas trente-sept).
    // Les deux qu'il possède, eux, n'ont aucune excuse.
    const miens = ['contenu/habillages/clairiere/ecole-v2.svg', 'contenu/habillages/galeries/grottes-v2.svg'];
    for (const chemin of miens) {
      const sien = rapport.rapports.find((r: { chemin: string }) => r.chemin === chemin);
      expect(sien, `${chemin} n’a pas été parcouru`).toBeDefined();
      const detail = sien!.anomalies
        .map((a: { regle: string; ou: string; message: string }) => `${a.regle} — ${a.ou} : ${a.message}`)
        .join('\n');
      expect(sien!.anomalies.length, `\n${detail}`).toBe(0);
      // Le décor doit vraiment porter ses régions, pas se contenter de n'en rater aucune.
      expect(sien!.nbRegionsDeclarees).toBeGreaterThanOrEqual(6);
    }
  });
});
