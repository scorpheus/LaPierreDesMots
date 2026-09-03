import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const racine = join(process.cwd(), 'contenu');
const fichiersCartes = readdirSync(join(racine, 'assets', 'cartes'), { withFileTypes: true })
  .flatMap((dossier) => dossier.isDirectory()
    ? readdirSync(join(racine, 'assets', 'cartes', dossier.name)).map((nom) => `cartes/${dossier.name}/${nom}`)
    : []);

describe('cartes illustrées', () => {
  it('publie les 39 cartes issues des six planches validées', () => {
    expect(fichiersCartes.filter((chemin) => chemin.endsWith('.png'))).toHaveLength(39);
  });

  it('ne laisse aucun asset de carte référencé introuvable', () => {
    const exercices = [
      'foret-muette/bestiaire-paires-01.json', 'foret-muette/bestiaire-paires-02.json',
      'marais-jumeau/coquillages-paires-01.json', 'volcan/geodes-paires-01.json',
      'volcan/geodes-paires-02.json', 'cite-des-histoires/cartes-paires-01.json',
    ];
    for (const exercice of exercices) {
      const contenu = JSON.parse(readFileSync(join(racine, 'exercices', exercice), 'utf8')) as {
        jeu: { contenu: { cartes: Array<{ asset: string | null }> } }
      };
      for (const carte of contenu.jeu.contenu.cartes.filter((carte) => carte.asset !== null)) {
        expect(existsSync(join(racine, carte.asset!))).toBe(true);
      }
    }
  });
});
