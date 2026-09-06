import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';

import { cheminRasterDuScene, grisailleDuRaster } from '@client/habillages/SceneDecor';

describe('progression des décors raster', () => {
  it('réemploie le décor approuvé des grottes malgré la version du masque SVG', () => {
    const chemin = cheminRasterDuScene('habillages/galeries/grottes-v2.svg');
    expect(chemin).toBe('assets/decors/exercices/galeries-grottes.png');
    expect(existsSync(`contenu/${chemin}`)).toBe(true);
  });
  it('résout le PNG illustré correspondant au fichier de scène', () => {
    expect(cheminRasterDuScene('habillages/foret-muette/bestiaire.svg')).toBe(
      'assets/decors/exercices/foret-bestiaire.png',
    );
    expect(cheminRasterDuScene('habillages/cite-des-histoires/pellicule.svg')).toBe(
      'assets/decors/exercices/cite-pellicule.png',
    );
  });

  it('laisse le SVG comme repli quand la scène n’est pas régionale', () => {
    expect(cheminRasterDuScene('habillages/campement/chaudron.svg')).toBeNull();
    expect(cheminRasterDuScene('assets/decors/campement.png')).toBeNull();
  });

  it('part en gris, rend progressivement la couleur et finit sans filtre', () => {
    expect(grisailleDuRaster(0, 4)).toBe(1);
    expect(grisailleDuRaster(1, 4)).toBe(0.75);
    expect(grisailleDuRaster(4, 4)).toBe(0);
  });

  it('borne les valeurs et ne grise pas une scène sans région', () => {
    expect(grisailleDuRaster(-2, 4)).toBe(1);
    expect(grisailleDuRaster(8, 4)).toBe(0);
    expect(grisailleDuRaster(0, 0)).toBe(0);
  });
});
