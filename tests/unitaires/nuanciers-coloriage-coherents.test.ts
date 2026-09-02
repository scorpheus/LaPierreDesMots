/**
 * Un coloriage ne doit jamais proposer une couleur absente du nuancier de son habillage.
 * L’exercice pilote les boutons ; l’habillage documente la palette disponible. Deux listes
 * divergentes sont deux sources de vérité et rendent la prochaine dérivation d’asset ambiguë.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT } from '../configuration/preparation.js';

interface ExerciceColorie {
  readonly id: string;
  readonly jeu: {
    readonly moteur: string;
    readonly habillage: string;
    readonly contenu: { readonly nuancierAutorise?: readonly string[] };
  };
}

interface HabillageLu {
  readonly id: string;
  readonly palette: { readonly nuancier: readonly string[] };
}

function jsonSous<T>(dossier: string): T[] {
  return readdirSync(join(RACINE_DEPOT, dossier), { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile() && entree.name.endsWith('.json'))
    .map((entree) => JSON.parse(readFileSync(join(entree.parentPath, entree.name), 'utf8')) as T);
}

describe('nuanciers des coloriages livrés', () => {
  it('chaque couleur proposée par un exercice existe dans son habillage', () => {
    const habillages = new Map(jsonSous<HabillageLu>('contenu/habillages').map((h) => [h.id, h]));
    const ecarts: string[] = [];

    for (const exercice of jsonSous<ExerciceColorie>('contenu/exercices')) {
      if (exercice.jeu.moteur !== 'colorie') continue;
      const habillage = habillages.get(exercice.jeu.habillage);
      expect(habillage, exercice.jeu.habillage).toBeDefined();
      const declarees = new Set(habillage?.palette.nuancier ?? []);
      const manquantes = (exercice.jeu.contenu.nuancierAutorise ?? []).filter(
        (couleur) => !declarees.has(couleur),
      );
      if (manquantes.length > 0) ecarts.push(`${exercice.id}: ${manquantes.join(', ')}`);
    }

    expect(ecarts).toEqual([]);
  });
});
