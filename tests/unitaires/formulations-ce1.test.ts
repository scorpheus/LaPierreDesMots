import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function fichiersJson(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiersJson(chemin) : chemin.endsWith('.json') ? [chemin] : [];
  });
}

function consignes(chemin: string): string[] {
  const contenu = JSON.parse(readFileSync(chemin, 'utf8')) as {
    jeu?: { contenu?: { consignes?: { texte?: string }[] } };
  };
  return (contenu.jeu?.contenu?.consignes ?? []).flatMap((consigne) => consigne.texte ? [consigne.texte] : []);
}

describe('formulations CE1', () => {
  it('empêche le retour des consignes abstraites ou grammaticalement trompeuses', () => {
    const bannies = [
      /Touche la luciole de la couleur que tu as lue/i,
      /Touche le son que tu lis dans le mot/i,
      /\bson de (?:chat|coq|photo|trou|noir|main|pont|fille|montagne)\b/i,
      /Trouve aussi le mot et son image/i,
      /Attrape les mots amis et feuilles/i,
      /Touche les mots dans l['’]ordre\.(?:\s|$)/i,
      /Grave la lettre pour écrire ce mot/i,
    ];
    const erreurs: string[] = [];
    for (const fichier of fichiersJson('contenu/exercices')) {
      for (const texte of consignes(fichier)) {
        if (bannies.some((motif) => motif.test(texte))) erreurs.push(`${fichier}: ${texte}`);
      }
    }
    expect(erreurs, erreurs.join('\n')).toEqual([]);
  });
});
