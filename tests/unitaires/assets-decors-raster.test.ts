import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

const DECORS = {
  ecole: 'decor.ecole.v3',
  tapis: 'decor.tapis.v2',
  brume: 'decor.brume.v2',
  forge: 'decor.forge.v2',
  'fresque-murale': 'decor.fresque-murale.v2'
} as const;

const SUCCESSEURS: Readonly<Record<string, string>> = {
  tapis: 'tapis-objets-v2', brume: 'brume-coloriage-v3',
  forge: 'forge-coloriage-v3', 'fresque-murale': 'fresque-coloriage-v3',
};

function paeth(gauche: number, haut: number, diagonale: number): number {
  const estimation = gauche + haut - diagonale;
  const a = Math.abs(estimation - gauche);
  const b = Math.abs(estimation - haut);
  const c = Math.abs(estimation - diagonale);
  return a <= b && a <= c ? gauche : b <= c ? haut : diagonale;
}

function pixelsRgbPng(octets: Buffer): { largeur: number; hauteur: number; pixels: Buffer } {
  expect(octets.subarray(1, 4).toString('ascii')).toBe('PNG');
  const largeur = octets.readUInt32BE(16);
  const hauteur = octets.readUInt32BE(20);
  expect(octets[24], 'profondeur PNG').toBe(8);
  expect(octets[25], 'type PNG RGB').toBe(2);
  expect(octets[28], 'PNG non entrelacé').toBe(0);

  const blocs: Buffer[] = [];
  for (let position = 8; position < octets.length; ) {
    const longueur = octets.readUInt32BE(position);
    if (octets.subarray(position + 4, position + 8).toString('ascii') === 'IDAT') {
      blocs.push(octets.subarray(position + 8, position + 8 + longueur));
    }
    position += longueur + 12;
  }

  const brut = inflateSync(Buffer.concat(blocs));
  const pas = largeur * 3;
  const pixels = Buffer.alloc(pas * hauteur);
  let position = 0;
  for (let y = 0; y < hauteur; y += 1) {
    const filtre = brut[position] ?? -1;
    position += 1;
    expect([0, 1, 2, 3, 4]).toContain(filtre);
    for (let x = 0; x < pas; x += 1) {
      const valeur = brut[position + x] ?? 0;
      const gauche = x >= 3 ? (pixels[y * pas + x - 3] ?? 0) : 0;
      const haut = y > 0 ? (pixels[(y - 1) * pas + x] ?? 0) : 0;
      const diagonale = y > 0 && x >= 3 ? (pixels[(y - 1) * pas + x - 3] ?? 0) : 0;
      const corrige = filtre === 0
        ? valeur
        : filtre === 1
          ? valeur + gauche
          : filtre === 2
            ? valeur + haut
            : filtre === 3
              ? valeur + Math.floor((gauche + haut) / 2)
              : valeur + paeth(gauche, haut, diagonale);
      pixels[y * pas + x] = corrige & 0xff;
    }
    position += pas;
  }
  return { largeur, hauteur, pixels };
}

describe('décors raster validés', () => {
  it('conserve les pixels approuvés et embarque leur successeur lorsque le décor est remplacé', () => {
    const verrou = JSON.parse(
      readFileSync(join(process.cwd(), 'production/assets.lock.json'), 'utf8')
    ) as {
      assets: readonly {
        id: string;
        fichier: string;
        empreinte: string;
        valide_par: string;
        archive?: { ancienChemin: string; remplacePar: string; date: string };
      }[];
    };

    for (const [nom, id] of Object.entries(DECORS)) {
      const relatif = `assets/decors/${nom === 'ecole' ? '' : 'archives-2026-09-05/'}${nom}.png`;
      const image = pixelsRgbPng(readFileSync(join(process.cwd(), 'contenu', relatif)));
      const entrees = verrou.assets.filter((candidate) => candidate.id === id);
      const entree = entrees[0];
      const couleursEchantillonnees = new Set<string>();
      for (let pixel = 0; pixel < image.pixels.length; pixel += 3 * 101) {
        couleursEchantillonnees.add(image.pixels.subarray(pixel, pixel + 3).toString('hex'));
        if (couleursEchantillonnees.size > 64) break;
      }
      expect([image.largeur, image.hauteur]).toEqual([1536, 1024]);
      expect(entrees, `${nom} absent ou doublé dans le verrou`).toHaveLength(1);
      expect(couleursEchantillonnees.size, `${nom} est devenu une image vide ou uniforme`)
        .toBeGreaterThan(64);
      expect(entree?.fichier).toBe(`contenu/${relatif}`);
      expect(entree?.empreinte).toBe(
        `sha256:${createHash('sha256').update(image.pixels).digest('hex').toUpperCase()}`
      );
      expect(entree?.valide_par).toBe('parent');
      const actif = `assets/decors/${SUCCESSEURS[nom] ?? nom}.png`;
      if (nom !== 'ecole') {
        expect(entree?.archive).toEqual({ ancienChemin: `contenu/assets/decors/${nom}.png`, remplacePar: `contenu/${actif}`, date: '2026-09-05' });
      }
      expect(urlAssetAutonome(actif), `${nom} absent du contenu autonome`).not.toBeNull();
    }
  });
});
