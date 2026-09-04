import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { decoderPng } from '../../scripts/sprites/png.mjs';

const racine = process.cwd();

describe('promotion des assets validés de la Cité', () => {
  it('raccorde les scènes régionales aux quatre fonds publiés', () => {
    const scenes = [
      ['cite-des-histoires/fresque-murale.svg', '/api/contenu/assets/assets/decors/fresque-murale.png'],
      ['foret-muette/tapis.svg', '/api/contenu/assets/assets/decors/tapis.png'],
      ['marais-jumeau/brume.svg', '/api/contenu/assets/assets/decors/brume.png'],
      ['volcan/forge.svg', '/api/contenu/assets/assets/decors/forge.png'],
    ] as const;
    for (const [scene, fond] of scenes) {
      const svg = readFileSync(join(racine, 'contenu', 'habillages', scene), 'utf8');
      expect(svg, scene).toContain(`href="${fond}"`);
    }
  });

  it('renseigne les huit images des cartes de la salade', () => {
    const chemin = join(racine, 'contenu', 'exercices', 'cite-des-histoires', 'cartes-paires-02.json');
    const exercice = JSON.parse(readFileSync(chemin, 'utf8')) as {
      jeu: { contenu: { cartes: Array<{ face: string; asset: string | null }> } };
    };
    const images = exercice.jeu.contenu.cartes.filter((carte) => carte.face === 'image');
    expect(images).toHaveLength(8);
    expect(images.map((carte) => carte.asset)).toEqual([
      'assets/cartes/cite/tomate.png',
      'assets/cartes/cite/carotte.png',
      'assets/cartes/cite/salade.png',
      'assets/cartes/cite/citron.png',
      'assets/cartes/cite/olive.png',
      'assets/cartes/cite/raisin.png',
      'assets/cartes/cite/pomme-panier.png',
      'assets/cartes/cite/prune-bol.png',
    ]);
    for (const carte of images) {
      expect(carte.asset, 'image manquante').not.toBeNull();
      expect(readFileSync(join(racine, 'contenu', carte.asset!))).toBeTruthy();
    }
  });

  it('verrouille les pixels des huit cartes validées sans dépendre du bac à sable', () => {
    const verrou = JSON.parse(
      readFileSync(join(racine, 'production', 'assets.lock.json'), 'utf8')
    ) as {
      assets: Array<{
        id: string;
        fichier: string;
        empreinte: string;
        derivees?: Record<string, { fichier: string; empreinte: string }>;
      }>;
    };
    const entree = verrou.assets.find((asset) => asset.id === 'cartes.cite.salade.v1');
    expect(entree).toBeDefined();
    const fichiers = [
      { fichier: entree!.fichier, empreinte: entree!.empreinte },
      ...Object.values(entree!.derivees ?? {})
    ];
    expect(fichiers).toHaveLength(8);
    for (const item of fichiers) {
      const image = decoderPng(readFileSync(join(racine, item.fichier)));
      expect([image.largeur, image.hauteur], item.fichier).toEqual([512, 512]);
      expect(item.empreinte).toBe(
        `sha256:${createHash('sha256').update(image.pixels).digest('hex').toUpperCase()}`
      );
    }
  });
});
