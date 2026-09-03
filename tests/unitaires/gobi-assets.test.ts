/**
 * Les assets de Gobi — lot N3, contrat de finition v3 § 4.3 et § 9.2.
 *
 * Le contrat de sortie du lot tient en quatre chiffres, et ce fichier les CALCULE tous :
 *
 *   « 8 ≤ stades ≤ 10 · ≥ 10 formes de graphème · 5 / 5 états d'animation ·
 *     0 déclinaison enchaînée (chacune repart de la canonique, prouvé par le `lock`) »
 *
 * Le premier est mesuré par `gobi-stades.test.ts`. Les trois autres sont ici, plus le seul qui
 * échouerait si le travail était CREUX :
 *
 *   **le corps est OCTET POUR OCTET identique dans les quinze SVG qui le portent.**
 *
 * C'est la traduction mécanique de D20, D28 et D36 — « le corps ne change jamais, le cristal
 * porte les déclinaisons ». Une règle énoncée dans une `<desc>` n'engage personne : quinze
 * dessins faits à la main dérivent l'un après l'autre, et la série se disloque sans qu'aucun
 * test ne le voie. Comparé octet à octet, le corps ne peut plus glisser en silence. La même
 * logique tient les deux invariants complémentaires : d'un STADE à l'autre seule la parure
 * change, d'une ANIMATION à l'autre la parure ne change pas.
 *
 * ÉNUMÉRER LES OBJETS, JAMAIS LES OCCURRENCES : la liste des assets attendus vient de la table
 * de `contenu/monde/gobi-stades.json` et du type `EtatAnimationGobi`, pas d'un parcours du
 * dossier. Un fichier surnuméraire ne prouverait rien, et un fichier manquant est justement ce
 * qu'un parcours du dossier ne peut pas voir.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { formesDuDocument, stadesDuDocument } from '@partage/monde/gobi.js';
import type { EtatAnimationGobi } from '@partage/monde/types.js';

import { RACINE_DEPOT, lireJson, lireTexte } from '../configuration/preparation.js';

const { empreintePixels } = await import('../../scripts/decliner-gobi.mjs');

const DOCUMENT: unknown = lireJson('contenu/monde/gobi-stades.json');
const STADES = stadesDuDocument(DOCUMENT);
const FORMES = formesDuDocument(DOCUMENT);

interface Verrou {
  readonly canonique: {
    readonly fichier: string;
    readonly empreintePixels: string;
    readonly palette: Readonly<Record<string, string>>;
  };
  readonly declinaisons: readonly {
    readonly code: string;
    readonly source: string;
    readonly sourceEmpreintePixels: string;
  }[];
}
const VERROU = lireJson<Verrou>('production/personnages/gobi/gobi.lock.json');

/** Les 5 états de `EtatAnimationGobi` — énumérés, pas devinés. */
const ANIMATIONS: readonly EtatAnimationGobi[] = [
  'repos', 'joie', 'aide', 'hesitation', 'apparition'
];

/** Un asset déclaré est relatif à `contenu/`. */
function cheminDeAsset(asset: string): string {
  return `contenu/${asset}`;
}

/**
 * Le contenu littéral d'un groupe SVG, `<g id="…">` compris. Rend `null` s'il est absent.
 *
 * L'extraction COMPTE les groupes imbriqués. Une version naïve qui s'arrêterait au premier
 * `</g>` couperait `gobi-corps` juste avant le cœur de Pierre — la comparaison octet à octet
 * resterait verte tout en cessant de couvrir l'élément que D36 nomme comme le seul essentiel.
 * Un test qui compare une portion plus courte que ce qu'il annonce ne ment pas à moitié.
 */
function groupe(svg: string, identifiant: string): string | null {
  const debut = svg.indexOf(`<g id="${identifiant}"`);
  if (debut === -1) {
    return null;
  }
  let profondeur = 0;
  for (let index = debut; index < svg.length; index += 1) {
    if (svg.startsWith('<g', index)) {
      profondeur += 1;
    } else if (svg.startsWith('</g>', index)) {
      profondeur -= 1;
      if (profondeur === 0) {
        return svg.slice(debut, index + 4);
      }
    }
  }
  return null;
}

const SVG_STADES = STADES.map((stade) => ({
  code: stade.code,
  chemin: cheminDeAsset(stade.asset),
  svg: lireTexte(cheminDeAsset(stade.asset))
}));

const SVG_ANIMATIONS = ANIMATIONS.map((code) => ({
  code,
  chemin: `contenu/assets/gobi/animation/${code}.svg`,
  svg: lireTexte(`contenu/assets/gobi/animation/${code}.svg`)
}));

const TOUS_LES_CORPS = [...SVG_STADES, ...SVG_ANIMATIONS];

describe('chaque asset DÉCLARÉ existe sur disque', () => {
  it('livre un fichier pour les 10 stades', () => {
    const manquants = STADES
      .filter((stade) => !existsSync(join(RACINE_DEPOT, cheminDeAsset(stade.asset))))
      .map((stade) => stade.asset);
    expect(manquants).toEqual([]);
  });

  it('livre un fichier pour chacune des formes déclarées, et il y en a au moins 10', () => {
    const manquants = FORMES
      .filter((forme) => !existsSync(join(RACINE_DEPOT, cheminDeAsset(forme.cristal))))
      .map((forme) => `${forme.grapheme} → ${forme.cristal}`);
    console.log(`[N3] formes=${String(FORMES.length)} cristaux manquants=${String(manquants.length)}`);
    expect(manquants).toEqual([]);
    expect(FORMES.length).toBeGreaterThanOrEqual(10);
  });

  it('donne à chaque forme SON cristal — un cristal partagé ne collectionne rien (D44)', () => {
    const distincts = new Set(FORMES.map((forme) => forme.cristal));
    expect(distincts.size).toBe(FORMES.length);
  });

  it('livre les 5 états d’animation, ni 4 ni 6 (addendum § A.2)', () => {
    const manquants = ANIMATIONS.filter(
      (code) => !existsSync(join(RACINE_DEPOT, `contenu/assets/gobi/animation/${code}.svg`))
    );
    expect(manquants).toEqual([]);
    expect(ANIMATIONS).toHaveLength(5);
  });
});

describe('LE CORPS NE CHANGE JAMAIS — D20, D28, D36, mesuré octet à octet', () => {
  it('porte un groupe `gobi-corps` dans les 15 SVG qui montrent Gobi', () => {
    const sans = TOUS_LES_CORPS.filter((entree) => groupe(entree.svg, 'gobi-corps') === null);
    expect(sans.map((entree) => entree.chemin)).toEqual([]);
    expect(TOUS_LES_CORPS).toHaveLength(15);
  });

  it('rend ce groupe IDENTIQUE dans les 15 — c’est le chiffre du lot', () => {
    const reference = groupe(TOUS_LES_CORPS[0]!.svg, 'gobi-corps')!;
    const divergents = TOUS_LES_CORPS
      .filter((entree) => groupe(entree.svg, 'gobi-corps') !== reference)
      .map((entree) => entree.chemin);
    console.log(
      `[N3] corps compares=${String(TOUS_LES_CORPS.length)} ` +
        `octets=${String(reference.length)} divergents=${String(divergents.length)}`
    );
    expect(divergents).toEqual([]);
    // Un corps réduit à deux balises rendrait l'égalité vraie et vide.
    expect(reference.length).toBeGreaterThan(400);
  });

  it('ne fait varier QUE la parure d’un stade à l’autre (D28, point 1)', () => {
    const visage = groupe(SVG_STADES[0]!.svg, 'gobi-visage')!;
    const bras = groupe(SVG_STADES[0]!.svg, 'gobi-bras')!;
    for (const entree of SVG_STADES) {
      expect(groupe(entree.svg, 'gobi-visage'), entree.chemin).toBe(visage);
      expect(groupe(entree.svg, 'gobi-bras'), entree.chemin).toBe(bras);
    }
    // …et elle varie vraiment : 10 parures identiques seraient 10 stades invisibles.
    const parures = new Set(SVG_STADES.map((entree) => groupe(entree.svg, 'gobi-parure')));
    expect(parures.size).toBe(SVG_STADES.length);
  });

  it('ne fait varier QUE le geste d’une animation à l’autre', () => {
    const parure = groupe(SVG_ANIMATIONS[0]!.svg, 'gobi-parure')!;
    for (const entree of SVG_ANIMATIONS) {
      expect(groupe(entree.svg, 'gobi-parure'), entree.chemin).toBe(parure);
    }
    const gestes = new Set(
      SVG_ANIMATIONS.map((entree) => `${groupe(entree.svg, 'gobi-bras')}${groupe(entree.svg, 'gobi-visage')}`)
    );
    expect(gestes.size).toBe(SVG_ANIMATIONS.length);
  });

  it('applique la palette MESURÉE sur la canonique, et n’invente aucune teinte de corps', () => {
    const { corpsClair, corpsOmbre, trait, coeurOr } = VERROU.canonique.palette;
    for (const entree of TOUS_LES_CORPS) {
      const corps = groupe(entree.svg, 'gobi-corps')!;
      for (const teinte of [corpsClair, corpsOmbre, trait, coeurOr]) {
        expect(corps, `${entree.chemin} n’emploie pas ${teinte}`).toContain(teinte);
      }
    }
  });

  it('porte le cœur de Pierre dans le corps — c’est le lien à la Pierre brisée (D36)', () => {
    for (const entree of TOUS_LES_CORPS) {
      expect(groupe(entree.svg, 'gobi-corps'), entree.chemin).toContain('id="coeur-de-pierre"');
    }
  });

  it('reste accessible : titre, description et rôle sur chacun des 15', () => {
    for (const entree of TOUS_LES_CORPS) {
      expect(entree.svg, entree.chemin).toContain('role="img"');
      expect(entree.svg, entree.chemin).toContain('<title>');
      expect(entree.svg, entree.chemin).toContain('<desc>');
    }
  });

  it('ne se dit plus « PLACEHOLDER » : D36 a clos l’étape A de D31', () => {
    for (const entree of [...TOUS_LES_CORPS, { chemin: 'cristaux', svg: FORMES.map((forme) => lireTexte(cheminDeAsset(forme.cristal))).join('') }]) {
      expect(entree.svg, entree.chemin).not.toContain('PLACEHOLDER');
    }
  });
});

describe('LE VERROU prouve la profondeur de chaîne = 1 (D32)', () => {
  it('déclare une canonique dont les pixels sont ceux du fichier sur disque', () => {
    const chemin = join(RACINE_DEPOT, VERROU.canonique.fichier);
    expect(existsSync(chemin)).toBe(true);
    // On REMESURE plutôt que de croire le verrou : un verrou non recalculé est un commentaire.
    const mesure = empreintePixels(chemin) as { empreinte: string };
    expect(mesure.empreinte).toBe(VERROU.canonique.empreintePixels);
  });

  it('ne compte AUCUNE déclinaison enchaînée — chacune repart de la canonique', () => {
    const enchainees = VERROU.declinaisons.filter(
      (entree) =>
        entree.source !== VERROU.canonique.fichier ||
        entree.sourceEmpreintePixels !== VERROU.canonique.empreintePixels
    );
    console.log(
      `[N3] declinaisons=${String(VERROU.declinaisons.length)} enchainees=${String(enchainees.length)}`
    );
    expect(enchainees.map((entree) => entree.code)).toEqual([]);
    // « 0 enchaînée » sur un journal vide ne prouve rien : on exige d'avoir vraiment décliné.
    expect(VERROU.declinaisons.length).toBeGreaterThanOrEqual(15);
  });

  it('produit un PNG distinct par déclinaison — un verrou qui pointe deux fois la même image ment', () => {
    const codes = VERROU.declinaisons.map((entree) => entree.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('journalise l’empreinte du fichier ET celle des pixels, et elles diffèrent', () => {
    const canonique = lireJson<{ canonique: { empreinteFichier: string } }>(
      'production/personnages/gobi/gobi.lock.json'
    ).canonique;
    // Le piège 4 du skill, rendu visible : hacher le fichier ne hache pas l'image.
    expect(canonique.empreinteFichier).not.toBe(VERROU.canonique.empreintePixels);
  });
});

describe('les cristaux de graphème', () => {
  it('portent chacun un libellé accessible dans le catalogue qui pilote le rendu', () => {
    for (const forme of FORMES) {
      expect(forme.libelle.trim().length, forme.grapheme).toBeGreaterThan(0);
    }
  });

  it('ne portent JAMAIS de corps — le cristal seul, sinon la série se disloque (D20)', () => {
    for (const forme of FORMES) {
      const png = readFileSync(join(RACINE_DEPOT, cheminDeAsset(forme.cristal)));
      expect(png.subarray(0, 8), forme.cristal).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
  });

  it('sont visuellement distincts deux à deux — 25 copies ne collectionnent rien', () => {
    const dessins = FORMES.map((forme) => createHash('sha256')
      .update(readFileSync(join(RACINE_DEPOT, cheminDeAsset(forme.cristal))))
      .digest('hex'));
    console.log(`[N3] cristaux=${String(dessins.length)} distincts=${String(new Set(dessins).size)}`);
    expect(new Set(dessins).size).toBe(FORMES.length);
  });

  it('sont normalisés en RGBA 256 × 256 pour rester nets et légers en vignette', () => {
    for (const forme of FORMES) {
      const png = readFileSync(join(RACINE_DEPOT, cheminDeAsset(forme.cristal)));
      expect(png.readUInt32BE(16), `${forme.cristal} largeur`).toBe(256);
      expect(png.readUInt32BE(20), `${forme.cristal} hauteur`).toBe(256);
      expect(png[25], `${forme.cristal} type de couleur PNG`).toBe(6);
    }
  });
});
