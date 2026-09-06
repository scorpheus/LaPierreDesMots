/**
 * Contrat des coloriages repris sur demande parent du 5 septembre.
 * Les anciennes « feuilles » du tapis ont été remplacées par des objets distincts.
 * Le contraste autour d'un centroïde ne prouvait que de la texture (et trois cas
 * ne portaient aucune assertion). On contrôle maintenant les repères du PNG,
 * indépendants des chemins, pour chaque scène, ainsi que les noms et couleurs exacts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { elementsDessines, pointDansRegion, polygonesDuChemin } from '../../scripts/verifier-regions-fermees.mjs';
import reperes from '../fixtures/coloriages-reperes.json';

const SCENES = [
  { noeud: 'foret-muette-08', fiche: 'foret-muette/tapis-colorie-01.json', cibles: [
    ['gland-du-tapis', 'tapis', 'brun'], ['feuille-du-tapis-un', 'chat', 'noir'],
    ['feuille-du-tapis-deux', 'bol', 'violet'], ['feuille-du-tapis-trois', 'sac', 'vert'],
    ['feuille-haute', 'pot', 'rouge'], ['feuille-basse', 'ballon', 'jaune'],
    ['feuille-du-tapis-quatre', 'banc', 'orange'],
  ] },
  { noeud: 'marais-jumeau-08', fiche: 'marais-jumeau/brume-colorie-01.json', cibles: [
    ['caillou', 'caillou', 'brun'], ['saule-de-la-berge', 'tronc du saule', 'noir'],
    ['roue', 'escargot', 'rose'], ['nenuphar-perdu', 'nénuphar', 'jaune'],
    ['route', 'ponton', 'rouge'], ['barque-echouee', 'barque', 'orange'], ['ciel', 'ciel', 'bleu'],
  ] },
  { noeud: 'volcan-08', fiche: 'volcan/forge-colorie-01.json', cibles: [
    ['seau', 'seau', 'bleu'], ['marteau-de-forge', 'marteau', 'noir'],
    ['enclume', 'enclume', 'rouge'], ['billot', 'billot', 'brun'],
    ['rideau', 'cristal', 'violet'], ['tableau', 'lanterne', 'jaune'],
    ['drapeau', 'grand cristal de gauche', 'rose'], ['feu', 'feu', 'orange'],
  ] },
  { noeud: 'cite-des-histoires-10', fiche: 'cite-des-histoires/fresque-murale-colorie-01.json', cibles: [
    ['scene-du-haut', 'montagne', 'rouge'], ['scene-du-bas', 'tente', 'vert'],
    ['soleil', 'grand rond en haut', 'jaune'], ['pot-de-couleur', 'porte de droite', 'brun'],
    ['arbre', 'arbre à droite de la tente', 'rose'], ['porte', 'porte de gauche', 'orange'],
    ['scene-de-droite', 'pierre', 'violet'], ['ciel', 'ciel de la montagne', 'bleu'],
  ] },
] as const;
interface Region { readonly id: string; readonly centroide: readonly [number, number] }
interface Habillage {
  readonly scene: { readonly fichier: string; readonly viewBox: string; readonly calques: readonly { readonly regions: readonly Region[] }[] };
  readonly palette: { readonly nuancier: readonly string[] };
}
interface Exercice {
  readonly jeu: { readonly contenu: { readonly consignes: readonly {
    readonly texte: string; readonly cibles: readonly { readonly region: string; readonly couleur: string }[];
  }[] } };
}
const lire = <T,>(fichier: string): T => JSON.parse(readFileSync(resolve(fichier), 'utf8')) as T;

describe.each(SCENES)('$noeud : contrat objets, couleurs et vraies silhouettes', scene => {
  const reference = reperes.find(r => r.noeud === scene.noeud)!;
  const exercice = lire<Exercice>(`contenu/exercices/${scene.fiche}`);
  const habillage = lire<Habillage>(reference.habillage);
  const svg = readFileSync(resolve('contenu', habillage.scene.fichier), 'utf8');
  const regions = new Map(habillage.scene.calques.flatMap(c => c.regions).map(r => [r.id, r]));
  const traces = new Map((elementsDessines(svg) as { id: string | null; d: string | null }[])
    .filter((e): e is { id: string; d: string } => e.id !== null && e.d !== null).map(e => [e.id, e.d]));
  const consignes = exercice.jeu.contenu.consignes;

  it('nomme exactement les nouveaux objets et leur couleur, sans changer leur nombre', () => {
    expect(consignes).toHaveLength(scene.cibles.length);
    expect(consignes.flatMap(c => c.cibles).map(c => c.region)).toEqual(scene.cibles.map(c => c[0]));
    scene.cibles.forEach(([region, mot, couleur], index) => {
      const consigne = consignes[index]!;
      expect(consigne.texte.toLocaleLowerCase('fr-FR')).toContain(mot);
      expect(consigne.texte.toLocaleLowerCase('fr-FR')).toContain(couleur);
      expect(consigne.cibles).toEqual([{ region, couleur }]);
      expect(habillage.palette.nuancier).toContain(couleur);
    });
  });

  it('place chaque point représentatif dans son vrai contour', () => {
    for (const [id] of scene.cibles) {
      expect(regions.has(id), id).toBe(true);
      expect(traces.has(id), id).toBe(true);
      expect(pointDansRegion(polygonesDuChemin(traces.get(id)!)!, regions.get(id)!.centroide), id).toBe(true);
    }
  });

  it('contient les objets repérés sur le PNG, mais pas leurs voisins extérieurs', () => {
    expect(reference.cibles.map(c => c.region)).toEqual(scene.cibles.map(c => c[0]));
    const [, , largeur, hauteur] = habillage.scene.viewBox.split(/\s+/u).map(Number);
    for (const cible of reference.cibles) {
      const polygones = polygonesDuChemin(traces.get(cible.region)!)!;
      expect(pointDansRegion(polygones, [cible.interieur[0]! * largeur!, cible.interieur[1]! * hauteur!]), cible.objet).toBe(true);
      expect(pointDansRegion(polygones, [cible.exterieur[0]! * largeur!, cible.exterieur[1]! * hauteur!]), cible.objet).toBe(false);
    }
  });
});
