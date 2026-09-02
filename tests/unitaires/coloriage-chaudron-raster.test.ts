import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Module Node autonome déjà utilisé par les autres gardes d'images du dépôt.
// @ts-expect-error module JavaScript volontairement autonome
import { decoderPng } from '../../scripts/sprites/png.mjs';
// @ts-expect-error script JavaScript de production appelé directement pour prouver la reproductibilité
import { construireChaudronRaster } from '../../scripts/coloriages/publier-chaudron.mjs';
import type { Habillage } from '@pierre/partage';
import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

const RACINE = resolve('.');
const HABILLAGE = JSON.parse(
  readFileSync(resolve(RACINE, 'contenu/habillages/campement/chaudron.habillage.json'), 'utf8'),
) as Habillage;

function pixels(chemin: string) {
  return decoderPng(readFileSync(resolve(RACINE, 'contenu', chemin))) as {
    largeur: number;
    hauteur: number;
    pixels: Uint8Array;
  };
}

describe('coloriage raster du chaudron validé', () => {
  it('reproduit octet pour octet les trois couches publiées', async () => {
    const production = await construireChaudronRaster();
    for (const nom of ['fond', 'trait', 'masque'] as const) {
      const publie = readFileSync(resolve(RACINE, `contenu/habillages/campement/chaudron-${nom}.png`));
      expect(production.tampons[nom]).toEqual(publie);
    }
  }, 10_000);

  it('déclare trois PNG alignés sur le brouillon parent', () => {
    const raster = HABILLAGE.scene.rasterIndexe;
    expect(raster).toBeDefined();
    expect([raster!.largeur, raster!.hauteur]).toEqual([1536, 1024]);

    const fond = pixels(String(raster!.fond));
    const trait = pixels(String(raster!.trait));
    const masque = pixels(String(raster!.masque));
    for (const image of [fond, trait, masque]) {
      expect([image.largeur, image.hauteur]).toEqual([1536, 1024]);
    }
    for (const chemin of [raster!.fond, raster!.trait, raster!.masque]) {
      expect(urlAssetAutonome(String(chemin)), `${String(chemin)} absent de l’APK`).not.toBeNull();
    }

    const rapport = JSON.parse(
      readFileSync(resolve(RACINE, 'production/coloriages/chaudron-raster.rapport.json'), 'utf8'),
    ) as { empreinteSourceFichier: string };
    expect(rapport.empreinteSourceFichier).toBe(
      'sha256:7F05618925D644E7914D2E0C69BEB7CF642B3C8F4E9A7A4C695AE102ABA9F1F5',
    );
  });

  it('croise le verrou de validation avec les trois fichiers dérivés publiés', () => {
    const verrou = JSON.parse(
      readFileSync(resolve(RACINE, 'production/assets.lock.json'), 'utf8'),
    ) as {
      assets: readonly {
        id: string;
        fichier: string;
        empreinte: string;
        derivees?: Record<string, { fichier: string; empreinte: string }>;
        valide_par: string;
      }[];
    };
    const entrees = verrou.assets.filter((entree) => entree.id === 'coloriage.chaudron.v3');
    expect(entrees, 'le chaudron est absent ou doublé dans le verrou').toHaveLength(1);
    const entree = entrees[0]!;
    const attendus = {
      fond: { fichier: entree.fichier, empreinte: entree.empreinte },
      trait: entree.derivees?.trait,
      masque: entree.derivees?.masque,
    };
    expect(entree.valide_par).toBe('parent');
    for (const [nom, derivee] of Object.entries(attendus)) {
      expect(derivee, `couche ${nom} absente du verrou`).toBeDefined();
      const octets = readFileSync(resolve(RACINE, derivee!.fichier));
      expect(derivee!.empreinte).toBe(
        `sha256:${createHash('sha256').update(octets).digest('hex').toUpperCase()}`,
      );
    }
  });

  it('donne à chaque région une couleur unique réellement présente dans le masque', () => {
    const raster = HABILLAGE.scene.rasterIndexe!;
    const masque = pixels(String(raster.masque));
    const regions = HABILLAGE.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions);
    const couleursDeclarees = new Set(regions.map((region) => region.couleurMasque));
    expect(couleursDeclarees.size).toBe(regions.length);
    expect(regions.length).toBeGreaterThanOrEqual(6);
    expect(regions.length).toBeLessThanOrEqual(40);

    const couleursVues = new Set<string>();
    let alphaInvalide = 0;
    for (let index = 0; index < masque.pixels.length; index += 4) {
      const alpha = masque.pixels[index + 3];
      if (alpha !== 0 && alpha !== 255) alphaInvalide += 1;
      if (alpha === 0) continue;
      couleursVues.add(
        `#${[0, 1, 2].map((canal) => (masque.pixels[index + canal] ?? 0).toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
      );
    }
    expect(alphaInvalide).toBe(0);
    expect(couleursVues).toEqual(couleursDeclarees);
  });

  it('ne laisse aucune région toucher le bord et garde un trait transparent non vide', () => {
    const raster = HABILLAGE.scene.rasterIndexe!;
    const masque = pixels(String(raster.masque));
    const trait = pixels(String(raster.trait));
    const bord = [] as number[];
    for (let x = 0; x < masque.largeur; x += 1) {
      bord.push((x * 4) + 3, (((masque.hauteur - 1) * masque.largeur + x) * 4) + 3);
    }
    for (let y = 0; y < masque.hauteur; y += 1) {
      bord.push((y * masque.largeur * 4) + 3, ((y * masque.largeur + masque.largeur - 1) * 4) + 3);
    }
    expect(bord.every((index) => masque.pixels[index] === 0)).toBe(true);
    const alphasTrait = trait.pixels.filter((_, index) => index % 4 === 3);
    expect(alphasTrait.some((alpha) => alpha > 0)).toBe(true);
    expect(alphasTrait.some((alpha) => alpha === 0)).toBe(true);
  });
});
