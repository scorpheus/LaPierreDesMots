/**
 * REPRODUCTION DU DÉFAUT n° 5 — « comment déterminer la maîtresse ? »
 *
 * L'exercice `clairiere-ecole-01` demande à l'enfant de colorier des régions du décor
 * `contenu/habillages/clairiere/ecole.svg` sur consigne. Si l'enfant ne reconnaît pas ce
 * qu'il colorie, la consigne devient un jeu de devinettes et l'exercice ne mesure plus rien.
 *
 * CE QUE CE FICHIER MESURE, sans rien affirmer : la GÉOMÉTRIE des silhouettes du décor,
 * normalisée par translation. Deux personnages sont indiscernables quand leurs chemins,
 * ramenés à la même origine, sont identiques caractère pour caractère.
 *
 * Le décor porte cinq personnages : `maitresse`, `garcon-1`, `garcon-2`, `fille-1`,
 * `fille-2`. Aucun texte, aucun attribut, aucune différence de taille ne les distingue à
 * l'écran : seul l'identifiant SVG — que l'enfant ne lit pas — porte le mot « maitresse ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE FICHIER SURVIT AU DÉCOR QU'IL MESURE. **D39** acte que le décor est en cours de
 * réécriture et que les captures visuelles de référence attendent le nouveau graphisme. Les
 * cas ci-dessous ne visent donc pas à rafistoler `ecole.svg` : ils énoncent ce que TOUT décor
 * de cette scène devra tenir, l'actuel comme son remplaçant. Ils sont écrits sur les OBJETS
 * du décor — les personnages —, jamais sur des chemins littéraux qui ne survivraient pas à
 * un nouveau dessin.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier ne corrige rien et ne touche pas au décor. Il échoue tant que la maîtresse est
 * dessinée comme une élève.
 */
import { describe, expect, it } from 'vitest';

import { CHEMIN_SVG_ECOLE, lireTexte } from '../configuration/preparation.js';

const svg = lireTexte(CHEMIN_SVG_ECOLE);

/** Une zone coloriable du décor : son identifiant et son chemin. */
interface Zone {
  readonly id: string;
  readonly d: string;
}

function zones(): readonly Zone[] {
  const sortie: Zone[] = [];
  for (const m of svg.matchAll(/id="([^"]+)"[^>]*class="zone"[^>]*\sd="([^"]+)"/gu)) {
    sortie.push({ id: m[1]!, d: m[2]! });
  }
  return sortie;
}

/**
 * Les sommets absolus d'un chemin. `A` ne rend que son point d'arrivée et son rayon : c'est
 * suffisant ici, les cinq personnages n'emploient que des demi-cercles de même écriture.
 */
function sommets(d: string): readonly (readonly [number, number])[] {
  const sortie: (readonly [number, number])[] = [];
  for (const brut of d.trim().split(/(?=[MLAZ])/u)) {
    const t = brut.trim();
    if (t === '' || t[0] === 'Z') continue;
    const n = [...t.matchAll(/-?[\d.]+/gu)].map((m) => Number(m[0]));
    if (t[0] === 'A') sortie.push([n[5]!, n[6]!]);
    else sortie.push([n[0]!, n[1]!]);
  }
  return sortie;
}

/**
 * La SILHOUETTE d'un personnage : l'ensemble de ses sommets, ramené à l'origine par
 * translation, dédoublonné et trié.
 *
 * On compare un ENSEMBLE DE SOMMETS et non les chaînes `d`, parce que la même forme peut
 * être écrite en un chemin ou en deux : la maîtresse porte `pull` + `jupe` là où une élève
 * porte une seule `robe`. Comparer les chaînes compterait deux silhouettes différentes là où
 * l'œil de l'enfant n'en voit qu'une. C'est exactement le piège « auditer les objets, jamais
 * les occurrences ».
 */
function silhouette(zonesDuPersonnage: readonly Zone[]): string {
  const tous = zonesDuPersonnage.flatMap((z) => sommets(z.d));
  const x0 = Math.min(...tous.map(([x]) => x));
  const y0 = Math.min(...tous.map(([, y]) => y));
  const uniques = new Set(tous.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`));
  return [...uniques].sort().join(' ');
}

/** Extension verticale d'un personnage, en unités du `viewBox` : sa taille à l'écran. */
function hauteur(zonesDuPersonnage: readonly Zone[]): number {
  const ys = zonesDuPersonnage.flatMap((z) => sommets(z.d).map(([, y]) => y));
  return Math.max(...ys) - Math.min(...ys);
}

/** Regroupe les zones par personnage : `cheveux-maitresse` → `maitresse`. */
function personnages(): ReadonlyMap<string, readonly Zone[]> {
  const carte = new Map<string, Zone[]>();
  for (const zone of zones()) {
    const m = /^(?:cheveux|pull|jupe|robe|tshirt)-(.+)$/u.exec(zone.id);
    if (m === null) continue;
    const liste = carte.get(m[1]!) ?? [];
    liste.push(zone);
    carte.set(m[1]!, liste);
  }
  return carte;
}

const parPersonnage = personnages();
const eleves = [...parPersonnage.keys()].filter((nom) => nom !== 'maitresse');

describe('le décor de l’école se lit sans qu’un adulte l’explique (R18)', () => {
  it('le décor porte bien cinq personnages, dont une maîtresse', () => {
    // Contrôle de la mesure elle-même : sans lui, les cas suivants pourraient « passer »
    // parce qu'ils ne trouvent rien à comparer.
    expect(parPersonnage.has('maitresse')).toBe(true);
    expect(eleves.length).toBeGreaterThanOrEqual(4);
  });

  it('la maîtresse n’a pas la SILHOUETTE d’un élève', () => {
    const maitresse = silhouette(parPersonnage.get('maitresse') ?? []);
    const jumeaux = eleves.filter((nom) => silhouette(parPersonnage.get(nom) ?? []) === maitresse);

    expect(
      jumeaux,
      `sa forme, ramenée à l’origine, est celle de ces élèves : ${maitresse}`,
    ).toEqual([]);
  });

  it('la maîtresse est plus grande que les élèves — c’est une adulte', () => {
    const hMaitresse = hauteur(parPersonnage.get('maitresse') ?? []);
    for (const eleve of eleves) {
      expect(hMaitresse, `maîtresse vs ${eleve}`).toBeGreaterThan(
        hauteur(parPersonnage.get(eleve) ?? []),
      );
    }
  });

  it('la tête de la maîtresse n’a pas le rayon exact de celle des élèves', () => {
    const rayonDe = (nom: string): number => {
      const tete = (parPersonnage.get(nom) ?? []).find((z) => z.id.startsWith('cheveux-'));
      const n = [...(tete?.d ?? '').matchAll(/A\s*([\d.]+)/gu)].map((m) => Number(m[1]));
      return n[0] ?? 0;
    };
    const rMaitresse = rayonDe('maitresse');
    for (const eleve of eleves) {
      expect(rMaitresse, `maîtresse vs ${eleve}`).not.toBe(rayonDe(eleve));
    }
  });

  it('un signe distinctif de maîtresse existe dans le décor', () => {
    // Un tableau, une craie, un cartable, un bureau, un sifflet : n'importe quel objet que
    // l'enfant associe à la maîtresse. Aucun n'est présent — le décor ne porte que ciel,
    // herbe, école, arbres, banc, corde, ballon et cinq silhouettes.
    const indices = ['tableau', 'craie', 'bureau', 'cartable', 'livre', 'sifflet', 'chapeau'];
    const presents = indices.filter((mot) => svg.includes(`data-region-svg="${mot}`));
    expect(presents.length, `identifiants du décor : ${zones().map((z) => z.id).join(', ')}`)
      .toBeGreaterThan(0);
  });
});
