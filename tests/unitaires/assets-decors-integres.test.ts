/**
 * Une image produite mais jamais référencée donne une fausse impression d'avancement : elle
 * existe sur disque, tandis que l'enfant voit encore le blockout SVG. Cette garde parcourt la
 * bibliothèque réelle et exige que chaque fond final publié atteigne au moins un habillage.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

import { RACINE_DEPOT } from '../configuration/preparation.js';

function fichiers(dossier: string, extensions: readonly string[]): readonly string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin, extensions);
    return entree.isFile() && extensions.some((extension) => entree.name.endsWith(extension))
      ? [chemin]
      : [];
  });
}

describe('les fonds illustrés produits atteignent les exercices', () => {
  test('aucun PNG final de décor ne reste orphelin sur disque', () => {
    const dossierHabillages = join(RACINE_DEPOT, 'contenu', 'habillages');
    const sources = [
      ...fichiers(dossierHabillages, ['.svg', '.json']),
      ...fichiers(join(RACINE_DEPOT, 'client', 'src'), ['.ts', '.tsx']),
    ]
      .map((fichier) => readFileSync(fichier, 'utf8'))
      .join('\n');
    const dossiersAssets = [
      join(RACINE_DEPOT, 'contenu', 'assets', 'decors', 'exercices'),
      join(RACINE_DEPOT, 'contenu', 'assets', 'decors'),
    ];
    const assets = dossiersAssets.flatMap((dossier) =>
      readdirSync(dossier, { withFileTypes: true })
        .filter((entree) => entree.isFile() && entree.name.endsWith('.png'))
        .map((entree) => join(dossier, entree.name)),
    );

    expect(assets.length, 'la bibliothèque finale de décors est vide').toBeGreaterThan(40);
    const orphelins = assets
      .filter((asset) => !sources.includes(asset.split(/[\\/]/u).pop() ?? ''))
      .map((asset) => relative(RACINE_DEPOT, asset).replaceAll('\\', '/'));

    expect(
      orphelins,
      'ces belles images existent, mais aucun exercice ne les charge : le joueur voit encore le SVG',
    ).toEqual([]);
  });
});
