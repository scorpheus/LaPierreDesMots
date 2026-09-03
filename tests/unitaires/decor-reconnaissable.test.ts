/**
 * ON DOIT RECONNAÎTRE LA MAÎTRESSE — lot N7, contrat de finition v3 § 4.7 et § 9.2.
 *
 * Défaut n° 5 du père : « comment déterminer la maîtresse ? ». Une consigne de coloriage qui
 * nomme un objet que l'enfant ne reconnaît pas devient un jeu de devinettes, et l'exercice ne
 * mesure plus la lecture — il mesure la chance. R18 dit l'exigence en une ligne : le jeu se
 * comprend **sans qu'un adulte explique quoi que ce soit**.
 *
 * ── CE FICHIER ET `decor-lisible.test.ts` NE FONT PAS LE MÊME TRAVAIL ───────────────────────
 * `tests/unitaires/decor-lisible.test.ts` est le test de CONSTAT de la campagne d'audit : il
 * mesure `ecole.svg`, la v1, et il exige seulement que la maîtresse soit « plus grande » que
 * les élèves. Il n'est ni supprimé ni modifié — il devient le témoin de non-régression du
 * décor d'origine.
 *
 * Celui-ci mesure le décor **v2**, et il est plus dur sur trois points, aucun décoratif :
 *   • un rapport de taille CHIFFRÉ (≥ 1,35) plutôt qu'un « plus grand » qui tolère 1 % ;
 *   • les arbres portent un tronc ET un houppier, le houppier au-dessus et plus large — la
 *     v1 les dessinait en disque parfait, ce qu'un enfant lit comme un ballon ;
 *   • les six grottes ne sont plus SIX FOIS LA MÊME FORME. C'est le défaut jumeau de celui de
 *     la maîtresse, jamais relevé parce que personne n'a joué les Galeries : `grottes.svg` v1
 *     dessine six rectangles arrondis de 200 × 160, tous identiques, tous de surface 32000.
 *     « La première grotte » et « la voûte » y sont indiscernables.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * TOUT EST MESURÉ SUR LA GÉOMÉTRIE, jamais sur un identifiant ni sur un commentaire. Un décor
 * qui nommerait ses formes correctement sans les dessiner passerait n'importe quel test écrit
 * sur les noms ; c'est exactement ce que la v1 faisait — seul l'`id` portait le mot
 * « maitresse », et l'enfant ne lit pas les `id`.
 */
import { describe, expect, it } from 'vitest';

import {
  elementsDessines,
  mesureDeRegion,
  polygonesDuChemin,
} from '../../scripts/verifier-regions-fermees.mjs';
import { lireJson, lireTexte } from '../configuration/preparation.js';

const SVG_ECOLE = 'contenu/habillages/clairiere/ecole-v2.svg';
const SVG_GROTTES = 'contenu/habillages/galeries/grottes-v2.svg';
const SVG_CARTE = 'contenu/habillages/carte/carte-monde-v2.svg';

/** Rapport de taille minimal entre l'adulte et l'enfant — contrat § 9.2, ligne N7. */
const RAPPORT_ADULTE_MINIMAL = 1.35;

// ───────────────────────────────────────────────────────────────────── mesures géométriques

type Point = readonly [number, number];

interface Element {
  readonly id: string | null;
  readonly d: string | null;
  readonly calque: string | null;
}

/** Les tracés d'un SVG, indexés par `id`. */
function tracesParId(chemin: string): ReadonlyMap<string, string> {
  const table = new Map<string, string>();
  for (const e of elementsDessines(lireTexte(chemin)) as readonly Element[]) {
    if (e.id !== null && e.d !== null) table.set(e.id, e.d);
  }
  return table;
}

/** Tous les sommets d'un tracé, tous anneaux confondus. */
function sommets(d: string): readonly Point[] {
  const anneaux = polygonesDuChemin(d) as Point[][] | null;
  if (anneaux === null) throw new Error(`Tracé non polygonal : ${d.slice(0, 60)}…`);
  return anneaux.flat();
}

/** Rectangle englobant : `[xmin, ymin, xmax, ymax]`. */
function boite(points: readonly Point[]): readonly [number, number, number, number] {
  return [
    Math.min(...points.map(([x]) => x)),
    Math.min(...points.map(([, y]) => y)),
    Math.max(...points.map(([x]) => x)),
    Math.max(...points.map(([, y]) => y)),
  ];
}

/** Extension verticale d'un ensemble de tracés — la taille du personnage à l'écran. */
function hauteur(traces: readonly string[]): number {
  const points = traces.flatMap(sommets);
  const [, ymin, , ymax] = boite(points);
  return ymax - ymin;
}

/**
 * La SILHOUETTE d'une forme : ses sommets ramenés à l'origine, dédoublonnés et triés.
 *
 * On compare des ENSEMBLES DE SOMMETS et non les chaînes `d` : la même forme peut s'écrire de
 * plusieurs façons, et l'œil de l'enfant ne voit qu'une forme. C'est la mesure de
 * `decor-lisible.test.ts`, reprise à la lettre pour rester comparable.
 */
function silhouette(traces: readonly string[]): string {
  const points = traces.flatMap(sommets);
  const [x0, y0] = boite(points);
  return [...new Set(points.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`))]
    .sort()
    .join(' ');
}

/** Rapport du plus petit au plus grand rayon depuis le centroïde. 1 = disque parfait. */
function rondeur(d: string): number {
  const mesure = mesureDeRegion(d) as { centroide: Point } | null;
  const [cx, cy] = mesure!.centroide;
  const rayons = sommets(d).map(([x, y]) => Math.hypot(x - cx, y - cy));
  return Math.min(...rayons) / Math.max(...rayons);
}

// ═══════════════════════════════════════════════════════ la cour d'école se lit sans adulte

describe('la cour d’école v2 se lit sans qu’un adulte l’explique (R18)', () => {
  const traces = tracesParId(SVG_ECOLE);
  const morceauxDe = (nom: string): readonly string[] =>
    [...traces.entries()].filter(([id]) => id.endsWith(`-${nom}`)).map(([, d]) => d);

  const ELEVES = ['garcon-1', 'garcon-2', 'fille-1', 'fille-2'] as const;

  it('le décor porte bien une maîtresse et quatre élèves — contrôle de la mesure', () => {
    // Sans ce cas, tous les suivants pourraient « réussir » faute de trouver quoi comparer.
    expect(morceauxDe('maitresse').length).toBeGreaterThanOrEqual(3);
    for (const eleve of ELEVES) expect(morceauxDe(eleve).length, eleve).toBeGreaterThanOrEqual(2);
  });

  it('la maîtresse fait au moins 1,35 fois la taille d’un élève — c’est une adulte', () => {
    const hMaitresse = hauteur(morceauxDe('maitresse'));
    for (const eleve of ELEVES) {
      const rapport = hMaitresse / hauteur(morceauxDe(eleve));
      expect(rapport, `maîtresse (${hMaitresse.toFixed(0)}) vs ${eleve}`).toBeGreaterThanOrEqual(
        RAPPORT_ADULTE_MINIMAL
      );
    }
  });

  it('son masque de cheveux suit la tête visible et reste distinct de son pull', () => {
    const cheveux = traces.get('cheveux-maitresse')!;
    const pull = traces.get('pull-maitresse')!;
    const mesureCheveux = mesureDeRegion(cheveux) as { surface: number; centroide: Point };
    const mesurePull = mesureDeRegion(pull) as { surface: number; centroide: Point };
    expect(Math.abs(mesureCheveux.surface)).toBeGreaterThan(500);
    expect(mesureCheveux.centroide[1]).toBeLessThan(mesurePull.centroide[1]);
    expect(silhouette([cheveux])).not.toBe(silhouette([pull]));
  });

  it('les masques réellement joués restent sur les objets du raster courant', () => {
    // Enveloppes mesurées sur `contenu/assets/decors/ecole.png`, ramenées dans le viewBox
    // 922 × 615. Elles sont volontairement plus larges que les silhouettes : ce garde détecte
    // un retour aux coordonnées du blockout sans prétendre remplacer la recette visuelle.
    const enveloppes: Readonly<Record<string, readonly [number, number, number, number]>> = {
      'toit-ecole': [220, 20, 610, 180],
      'porte-ecole': [375, 150, 475, 290],
      'fenetre-ecole-1': [270, 160, 340, 240],
      'fenetre-ecole-2': [500, 160, 585, 245],
      'feuilles-arbre-1': [0, 0, 390, 150],
      'feuilles-arbre-2': [750, 0, 922, 150],
      'pull-maitresse': [340, 185, 440, 270],
      'jupe-maitresse': [340, 235, 430, 360],
      tableau: [95, 160, 285, 315],
      banc: [45, 315, 250, 460],
    };

    for (const [id, [xmin, ymin, xmax, ymax]] of Object.entries(enveloppes)) {
      const trace = traces.get(id);
      expect(trace, `région jouée absente : ${id}`).toBeDefined();
      const [x0, y0, x1, y1] = boite(sommets(trace!));
      expect(x0, `${id} déborde à gauche`).toBeGreaterThanOrEqual(xmin);
      expect(y0, `${id} déborde en haut`).toBeGreaterThanOrEqual(ymin);
      expect(x1, `${id} déborde à droite`).toBeLessThanOrEqual(xmax);
      expect(y1, `${id} déborde en bas`).toBeLessThanOrEqual(ymax);
    }
  });

  it('un objet de classe est dessiné, et c’est un vrai tableau, pas un jeton', () => {
    const tableau = traces.get('tableau');
    expect(tableau, 'aucune région `tableau` dans le décor').toBeDefined();
    const surface = Math.abs((mesureDeRegion(tableau!) as { surface: number }).surface);
    // Plus grand que la tête de la maîtresse : un signe qui se voit d'un coup d'œil.
    const tete = Math.abs((mesureDeRegion(traces.get('cheveux-maitresse')!) as { surface: number }).surface);
    expect(surface, `tableau ${surface.toFixed(0)} vs tête ${tete.toFixed(0)}`).toBeGreaterThan(tete);
  });

  it('le tableau est À CÔTÉ de la maîtresse, pas à l’autre bout de la cour', () => {
    // Un objet de classe posé loin d'elle ne la désigne pas. On mesure l'écart horizontal
    // entre les deux, rapporté à la largeur du décor.
    const [x0Tableau, , x1Tableau] = boite(sommets(traces.get('tableau')!));
    const [x0Maitresse, , x1Maitresse] = boite(sommets(traces.get('jupe-maitresse')!));
    const [xPremierEleve] = boite(sommets(traces.get('cheveux-garcon-1')!));
    // Sur l'illustration raster validée, le tableau est immédiatement À GAUCHE de la maîtresse,
    // et le premier élève à sa droite. L'ancien test imposait l'ordre inverse, hérité du
    // blockout, et aurait forcé le masque à quitter l'objet qu'il est censé suivre.
    expect(x1Tableau).toBeLessThan(x0Maitresse);
    expect(x1Maitresse).toBeLessThan(xPremierEleve);
    expect(x0Maitresse - x1Tableau).toBeLessThan(922 * 0.15);
    expect(x0Tableau).toBeGreaterThanOrEqual(0);
  });

  it('chaque arbre a un tronc ET un houppier, le houppier au-dessus et plus large', () => {
    for (const rang of [1, 2, 3, 4]) {
      const houppier = sommets(traces.get(`feuilles-arbre-${String(rang)}`)!);
      const tronc = sommets(traces.get(`tronc-arbre-${String(rang)}`)!);
      const [xh0, yh0, xh1, yh1] = boite(houppier);
      const [xt0, yt0, xt1] = boite(tronc);

      // Au-dessus : le bas du houppier ne descend pas sous le haut du tronc de plus de
      // quelques unités (les deux se recouvrent un peu, comme dans un arbre réel).
      expect(yh1, `arbre ${String(rang)} : houppier sous le tronc`).toBeLessThan(yt0 + 40);
      expect(yh0, `arbre ${String(rang)} : houppier pas en haut`).toBeLessThan(yt0);
      // Plus large : au moins deux fois le tronc. Un houppier de la largeur du tronc est un
      // poteau, et l'enfant ne lit pas un poteau comme un arbre.
      expect(xh1 - xh0, `arbre ${String(rang)}`).toBeGreaterThan(2 * (xt1 - xt0));
    }
  });

  it('le houppier est LOBÉ, pas un disque parfait — un disque se lit « ballon »', () => {
    for (const rang of [1, 2, 3, 4]) {
      const r = rondeur(traces.get(`feuilles-arbre-${String(rang)}`)!);
      expect(r, `arbre ${String(rang)} : rondeur ${r.toFixed(3)}`).toBeLessThan(0.85);
    }
    // Et le ballon, lui, EST rond : la mesure discrimine bien les deux.
    expect(rondeur(traces.get('ballon')!)).toBeGreaterThan(0.95);
  });

  it('le ciel est en haut, l’herbe en bas, et ils ne se chevauchent pas', () => {
    const [, , , yCiel] = boite(sommets(traces.get('ciel')!));
    const [, yHerbe] = boite(sommets(traces.get('herbe')!));
    expect(yCiel).toBeLessThanOrEqual(yHerbe);
  });

  it('l’habillage déclare une surface et un centroïde JUSTES pour les 31 régions', () => {
    // La surface donne son rayon de visée, le centroïde reçoit le tap au clavier et donne son
    // origine au balayage de recoloration. Une valeur périmée fait peindre la région voisine.
    // Le contrôle complet est dans `regions-fermees.test.ts` ; ici on vérifie qu'il porte bien
    // sur TRENTE ET UNE régions et pas sur trois.
    const habillage = lireJson<{
      scene: { calques: ReadonlyArray<{ role: string; regions: ReadonlyArray<{ id: string }> }> };
    }>('contenu/habillages/clairiere/ecole.habillage.json');
    const declarees = habillage.scene.calques
      .filter((c) => c.role === 'coloriable')
      .flatMap((c) => c.regions);
    expect(declarees.length).toBe(31);
    for (const region of declarees) {
      expect(traces.has(region.id), `${region.id} déclarée et non dessinée`).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════ les six grottes cessent d'être jumelles

describe('les Galeries v2 : six formes distinctes, pas six fois la même', () => {
  const traces = tracesParId(SVG_GROTTES);
  const IDS = ['grotte-un', 'grotte-deux', 'grotte-trois', 'stalactite', 'flaque', 'voute'] as const;

  it('les six régions sont dessinées', () => {
    for (const id of IDS) expect(traces.has(id), id).toBe(true);
  });

  it('AUCUNE paire ne partage sa silhouette', () => {
    // Le défaut de la v1, mesuré : six `<rect>` de 200 × 160 arrondis à 12, translatés. « La
    // première grotte » et « la voûte » y étaient le même dessin.
    const vues = new Map<string, string>();
    for (const id of IDS) {
      const sil = silhouette([traces.get(id)!]);
      const jumelle = vues.get(sil);
      expect(jumelle, `${id} a exactement la forme de ${String(jumelle)}`).toBeUndefined();
      vues.set(sil, id);
    }
  });

  it('les six surfaces sont distinctes — trois grottes de même taille ne se nomment pas', () => {
    const surfaces = IDS.map((id) =>
      Math.round(Math.abs((mesureDeRegion(traces.get(id)!) as { surface: number }).surface))
    );
    expect(new Set(surfaces).size, `surfaces : ${surfaces.join(', ')}`).toBe(IDS.length);
  });

  it('la scène se lit comme une grotte : voûte en haut, flaque en bas, stalactite pendante', () => {
    const bas = (id: string): number => boite(sommets(traces.get(id)!))[3];
    const haut = (id: string): number => boite(sommets(traces.get(id)!))[1];
    const viewBox = lireTexte(SVG_GROTTES).match(/viewBox="0 0 (\d+) (\d+)"/u)!;
    const hauteurScene = Number(viewBox[2]);

    // La voûte coiffe la scène : elle commence dans le premier tiers.
    expect(haut('voute')).toBeLessThan(hauteurScene / 3);
    // La flaque est au sol : elle finit dans le dernier tiers.
    expect(bas('flaque')).toBeGreaterThan((2 * hauteurScene) / 3);
    // La stalactite PEND : elle part du haut et pointe vers le bas.
    expect(haut('stalactite')).toBeLessThan(hauteurScene / 3);
    expect(bas('stalactite')).toBeLessThan(bas('flaque'));
    // Et elle est plus haute que large — sinon c'est une bosse, pas une stalactite.
    const [x0, y0, x1, y1] = boite(sommets(traces.get('stalactite')!));
    expect(y1 - y0).toBeGreaterThan(x1 - x0);
  });
});

// ═════════════════════════════════════════════════════════ la carte cesse d'être six hexagones

describe('la carte du monde v2 : six régions qu’on distingue de loin', () => {
  const traces = tracesParId(SVG_CARTE);
  const IDS = [
    'clairiere', 'galeries', 'marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires',
  ] as const;

  it('les six régions sont dessinées', () => {
    for (const id of IDS) expect(traces.has(id), id).toBe(true);
  });

  it('AUCUNE paire ne partage sa silhouette — la v1 en dessinait six identiques', () => {
    // Mesuré sur la v1 : six hexagones réguliers de mêmes dimensions, simplement translatés.
    // Sur une carte, une région se reconnaît d'abord à sa FORME ; six fois la même forme est
    // une légende obligatoire, c'est-à-dire du texte, c'est-à-dire ce que l'enfant déchiffre
    // encore mal.
    const vues = new Map<string, string>();
    for (const id of IDS) {
      const sil = silhouette([traces.get(id)!]);
      const jumelle = vues.get(sil);
      expect(jumelle, `${id} a exactement la forme de ${String(jumelle)}`).toBeUndefined();
      vues.set(sil, id);
    }
  });

  it('chaque région contient son marqueur — la prise tactile tombe dans le dessin', () => {
    // `EcranCarte.tsx:41` porte les six ancres en dur, aux centres des marqueurs. Une ancre
    // hors de sa région déplacerait le tap du dessin, ce qui ne se voit qu'à l'usage.
    const texte = lireTexte(SVG_CARTE);
    for (const id of IDS) {
      const m = new RegExp(`id="marqueur-${id}"[^>]*cx="([\\d.]+)"[^>]*cy="([\\d.]+)"`, 'u').exec(texte);
      expect(m, `marqueur-${id} absent`).not.toBeNull();
      const point: Point = [Number(m![1]), Number(m![2])];
      const anneaux = polygonesDuChemin(traces.get(id)!) as Point[][];
      const dedans = anneaux.some((anneau) => {
        let d = false;
        for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i, i += 1) {
          const [xi, yi] = anneau[i]!;
          const [xj, yj] = anneau[j]!;
          if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
            d = !d;
          }
        }
        return d;
      });
      expect(dedans, `l’ancre de ${id} tombe hors de sa région`).toBe(true);
    }
  });
});
