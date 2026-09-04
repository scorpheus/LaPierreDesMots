/**
 * Contrat des assets embarqués dans l'APK.
 *
 * Le serveur LAN peut servir n'importe quel fichier de `contenu/`, mais l'application Android
 * ne voit que les extensions énumérées dans `import.meta.glob`. Une belle illustration PNG qui
 * fonctionne sur le PC et disparaît dans l'APK est donc une régression spécifique au portage.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

interface EntreeVerrou {
  readonly id: string;
  readonly fichier: string;
  readonly empreinte: string;
  readonly generation: { readonly resolution: readonly [number, number] };
  readonly valide_par: string;
}

const TABLEAUX = ['pierre', 'grisaille', 'noms', 'habitants', 'appel'] as const;
const POSES_GOBI = ['aide', 'apparition', 'hesitation', 'joie', 'repos'] as const;

function predicteurPaeth(gauche: number, haut: number, diagonale: number): number {
  const estimation = gauche + haut - diagonale;
  const distanceGauche = Math.abs(estimation - gauche);
  const distanceHaut = Math.abs(estimation - haut);
  const distanceDiagonale = Math.abs(estimation - diagonale);
  return distanceGauche <= distanceHaut && distanceGauche <= distanceDiagonale
    ? gauche
    : distanceHaut <= distanceDiagonale
      ? haut
      : diagonale;
}

/** Décode les pixels RGB d'un PNG 8 bits non entrelacé, sans dépendance cachée dans l'APK. */
function decoderPngRgb(octets: Buffer): {
  readonly largeur: number;
  readonly hauteur: number;
  readonly pixels: Buffer;
} {
  expect(octets.subarray(1, 4).toString('ascii')).toBe('PNG');
  const largeur = octets.readUInt32BE(16);
  const hauteur = octets.readUInt32BE(20);
  expect(octets[24], 'profondeur PNG').toBe(8);
  expect(octets[25], 'type PNG RGB').toBe(2);
  expect(octets[28], 'PNG non entrelacé').toBe(0);

  const donnees: Buffer[] = [];
  for (let position = 8; position < octets.length; ) {
    const longueur = octets.readUInt32BE(position);
    const type = octets.subarray(position + 4, position + 8).toString('ascii');
    if (type === 'IDAT') {
      donnees.push(octets.subarray(position + 8, position + 8 + longueur));
    }
    position += longueur + 12;
  }

  const compresse = inflateSync(Buffer.concat(donnees));
  const pas = largeur * 3;
  const pixels = Buffer.alloc(pas * hauteur);
  let position = 0;
  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    const filtre = compresse[position] ?? -1;
    position += 1;
    expect([0, 1, 2, 3, 4], `filtre PNG inconnu à la ligne ${String(ligne)}`).toContain(filtre);
    for (let colonne = 0; colonne < pas; colonne += 1) {
      const brut = compresse[position + colonne] ?? 0;
      const gauche = colonne >= 3 ? (pixels[ligne * pas + colonne - 3] ?? 0) : 0;
      const haut = ligne > 0 ? (pixels[(ligne - 1) * pas + colonne] ?? 0) : 0;
      const diagonale = ligne > 0 && colonne >= 3
        ? (pixels[(ligne - 1) * pas + colonne - 3] ?? 0)
        : 0;
      const valeur = filtre === 0
        ? brut
        : filtre === 1
          ? brut + gauche
          : filtre === 2
            ? brut + haut
            : filtre === 3
              ? brut + Math.floor((gauche + haut) / 2)
              : brut + predicteurPaeth(gauche, haut, diagonale);
      pixels[ligne * pas + colonne] = valeur & 0xff;
    }
    position += pas;
  }
  return { largeur, hauteur, pixels };
}

describe('assets raster du mode autonome', () => {
  it('embarque les PNG de production, comme ceux des tableaux d’ouverture', () => {
    // Asset réel et déjà validé : il prouve le glob PNG sans introduire de faux tableau
    // d'ouverture dans la production avant la validation parentale.
    expect(urlAssetAutonome('assets/campement/campement-v6.png')).not.toBeNull();
  });

  it('embarque les dix stades et les cinq poses WebP de Gobi', () => {
    const attendus = [
      ...Array.from({ length: 10 }, (_, rang) => `assets/gobi/stades/stade-${String(rang + 1)}.webp`),
      ...POSES_GOBI.map((pose) => `assets/gobi/animation/${pose}.webp`),
    ];

    expect(
      attendus.filter((chemin) => urlAssetAutonome(chemin) === null),
      'un WebP absent du glob autonome disparaîtrait dans la PWA et dans l’APK',
    ).toEqual([]);
  });

  it('livre et verrouille les cinq tableaux validés, pixels et dimensions compris', () => {
    const verrou = JSON.parse(
      readFileSync(join(process.cwd(), 'production/assets.lock.json'), 'utf8')
    ) as { readonly assets: readonly EntreeVerrou[] };

    for (const code of TABLEAUX) {
      const cheminRelatif = `assets/ouverture/${code}.png`;
      const fichier = join(process.cwd(), 'contenu', cheminRelatif);
      const image = decoderPngRgb(readFileSync(fichier));
      const entrees = verrou.assets.filter((candidate) => candidate.id === `ouverture.${code}.v1`);
      const entree = entrees[0];
      const couleursEchantillonnees = new Set<string>();
      for (let pixel = 0; pixel < image.pixels.length; pixel += 3 * 101) {
        couleursEchantillonnees.add(image.pixels.subarray(pixel, pixel + 3).toString('hex'));
        if (couleursEchantillonnees.size > 64) break;
      }

      expect(urlAssetAutonome(cheminRelatif), `${code} absent de l'APK`).not.toBeNull();
      expect(entrees, `${code} absent ou doublé dans le verrou`).toHaveLength(1);
      expect(image.largeur / image.hauteur, `${code} n'est plus cadré en 3:2`).toBeCloseTo(1.5, 2);
      expect(couleursEchantillonnees.size, `${code} est devenu une image vide ou uniforme`)
        .toBeGreaterThan(64);
      expect(entree?.fichier).toBe(`contenu/${cheminRelatif}`);
      expect(entree?.generation.resolution).toEqual([image.largeur, image.hauteur]);
      if (code === 'pierre') {
        // Entrée historique expressément conservée lors de la validation des quatre autres
        // tableaux. Les nouvelles entrées, elles, appliquent le contrat d'empreinte des pixels.
        expect(entree?.empreinte).toBe(
          'sha256:577BF1088DBCDF534785946E736C944FF30F579B02BCB1BC769E8937B614B69F'
        );
      } else {
        expect(entree?.empreinte).toBe(
          `sha256:${createHash('sha256').update(image.pixels).digest('hex').toUpperCase()}`
        );
      }
      expect(entree?.valide_par).toBe('parent');
    }
  });
});
