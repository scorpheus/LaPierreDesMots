/**
 * LES SIX ÉCLATS, CROISÉS AVEC LES RÉGIONS RÉELLEMENT LIVRÉES.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * `ECLATS` est une TABLE, et une table se met à mentir. C'est ce qui est arrivé aux polices —
 * deux listes côte à côte, trois entrées dans l'une et pas dans l'autre — et à
 * `MOTEURS_AVEC_SCENE_PROPRE`, qui a menti pendant quelques heures pendant que six campagnes
 * écrivaient.
 *
 * La population n'est donc PAS écrite ici : elle est DÉRIVÉE des fichiers de `contenu/noeuds/`.
 * Une région ajoutée demain entre dans le contrat toute seule, et personne n'a à s'en souvenir.
 *
 * `eclatDeRegion` a un repli, et c'est voulu — « jamais une case vide » vaut aussi pour une
 * région que le code ne connaît pas encore. Mais un repli qui sert est un défaut silencieux :
 * six régions tomberaient dessus et afficheraient six trophées identiques, exactement le défaut
 * qu'`eclats.ts` corrige. Ce fichier est là pour que le filet ne devienne jamais l'usage.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ECLATS, eclatDeRegion } from '../../client/src/monde/eclats.js';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Les régions livrées, lues sur le disque. `clairiere-05.json` → `clairiere`. */
function regionsLivrees(): readonly string[] {
  const fichiers = readdirSync(resolve(RACINE, 'contenu', 'noeuds')).filter((n) =>
    n.endsWith('.json'),
  );
  const regions = new Set(fichiers.map((n) => n.replace(/-\d+\.json$/u, '')));
  return [...regions].sort();
}

describe('Les Éclats de Pierre', () => {
  const regions = regionsLivrees();

  it('la population est DÉRIVÉE des nœuds livrés, jamais recopiée', () => {
    expect(regions.length, 'aucune région lue sur le disque : la mesure ne tient pas').toBe(6);
  });

  it('chaque région livrée a son Éclat — le repli ne sert jamais', () => {
    const sansEclat = regions.filter((r) => !(r in ECLATS));
    expect(
      sansEclat,
      'ces régions tomberaient sur le repli de `eclatDeRegion` et afficheraient toutes le même ' +
        'trophée doré — le défaut même que `eclats.ts` corrige',
    ).toEqual([]);
  });

  it('aucun Éclat ne survit à sa région — un nom qui a vécu plus longtemps que sa loi', () => {
    const orphelins = Object.keys(ECLATS).filter((r) => !regions.includes(r));
    expect(
      orphelins,
      'ces Éclats désignent des régions qui n’existent pas : c’est la signature de la loi ' +
        'remplacée dont le NOM survit (CLAUDE.md)',
    ).toEqual([]);
  });

  it('les six silhouettes sont DISTINCTES — sinon les trophées restent indiscernables', () => {
    const formes = regions.map((r) => eclatDeRegion(r).silhouette);
    expect(
      new Set(formes).size,
      'deux régions au moins portent la même silhouette : le coffre ne dit plus ce qu’il reste ' +
        'à trouver, et c’est tout le propos de cet écran',
    ).toBe(regions.length);
  });

  it('livre une vraie image raster RGBA distincte pour chaque région', () => {
    const assets = regions.map((region) => eclatDeRegion(region).asset);
    expect(new Set(assets).size).toBe(regions.length);
    for (const asset of assets) {
      const chemin = resolve(RACINE, 'contenu', asset);
      expect(existsSync(chemin), asset).toBe(true);
      const png = readFileSync(chemin);
      expect(png.subarray(0, 8), asset).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(png.readUInt32BE(16), `${asset} largeur`).toBe(256);
      expect(png.readUInt32BE(20), `${asset} hauteur`).toBe(256);
      expect(png[25], `${asset} type de couleur PNG`).toBe(6);
    }
  });

  it('les six teintes sont DISTINCTES, et toutes des jetons de palette', () => {
    const teintes = regions.map((r) => eclatDeRegion(r).teinte);
    expect(new Set(teintes).size, 'deux régions partagent une teinte').toBe(regions.length);
    const enDur = teintes.filter((t) => !/^var\(--[a-z-]+\)$/u.test(t));
    expect(
      enDur,
      'une couleur écrite en dur échappe à la palette : elle ne suivra ni le thème ni une ' +
        'révision du nuancier, et « la couleur vient du code » perd son sens',
    ).toEqual([]);
  });

  it('chaque silhouette est un chemin FERMÉ, tracé dans la boîte de 48 px', () => {
    for (const region of regions) {
      const d = eclatDeRegion(region).silhouette;
      expect(d.trim().toUpperCase().endsWith('Z'), `« ${region} » : chemin non fermé — le ` +
        'remplissage fuirait sur toute la case, exactement comme un trait interrompu sur un ' +
        'décor vectorisé').toBe(true);
      const nombres = (d.match(/-?\d+(\.\d+)?/gu) ?? []).map(Number);
      const horsBoite = nombres.filter((n) => n < -4 || n > 48);
      expect(horsBoite, `« ${region} » : coordonnées hors de la boîte de 48 px`).toEqual([]);
    }
  });

  it('chaque Éclat porte une évocation dite à voix haute — jamais du décoratif muet', () => {
    for (const region of regions) {
      expect(
        eclatDeRegion(region).evocation.length,
        `« ${region} » : pas d’évocation. R28 veut que la fiche DISE la pièce ; un dessin sans ` +
          'mot ne s’explique pas à un enfant de sept ans',
      ).toBeGreaterThan(8);
    }
  });
});
