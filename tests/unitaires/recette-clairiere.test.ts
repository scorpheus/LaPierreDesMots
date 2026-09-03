/**
 * Contrôles rapides de la recette de la Clairière.
 *
 * Cette suite ne remplace pas la recette visuelle ni le parcours tablette : elle garde le
 * contrat de contenu suffisamment proche du catalogue réel pour signaler immédiatement une
 * référence cassée, une consigne sans voix ou une réserve présentée dans l'ordre des réponses.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Habillage } from '@pierre/partage';
import { moteurTri } from '@partage/moteurs/tri/moteur';
import { aleaDeTest, horlogeDeTest } from '../configuration/preparation.js';

const RACINE = join(process.cwd(), 'contenu');
const DOSSIER_EXERCICES = join(RACINE, 'exercices', 'clairiere');
const DOSSIER_HABILLAGES = join(RACINE, 'habillages', 'clairiere');

interface ExerciceLu {
  readonly id: string;
  readonly jeu: {
    readonly moteur: string;
    readonly habillage: string;
    readonly contenu: Record<string, unknown>;
  };
}

function lireExercices(): readonly ExerciceLu[] {
  return readdirSync(DOSSIER_EXERCICES)
    .filter((nom) => nom.endsWith('.json'))
    .sort()
    .map((nom) => JSON.parse(readFileSync(join(DOSSIER_EXERCICES, nom), 'utf8')) as ExerciceLu);
}

function lireManifesteAudio(): ReadonlyMap<string, string> {
  const manifeste = JSON.parse(
    readFileSync(join(RACINE, 'audio', 'manifeste.json'), 'utf8'),
  ) as { readonly clips: readonly { readonly cle: string; readonly texte: string }[] };
  return new Map(manifeste.clips.map((clip) => [clip.cle, clip.texte]));
}

function fichierHabillage(id: string): string {
  return join(DOSSIER_HABILLAGES, `${id.split('.')[1] ?? id}.habillage.json`);
}

function lireHabillage(id: string): Habillage {
  return JSON.parse(readFileSync(fichierHabillage(id), 'utf8')) as Habillage;
}

describe('recette rapide de la Clairière', () => {
  const exercices = lireExercices();
  const audio = lireManifesteAudio();

  it('couvre exactement les douze nœuds et conserve une voix pour chaque étape', () => {
    expect(exercices).toHaveLength(12);
    const identifiants = new Set<string>();
    for (const exercice of exercices) {
      expect(identifiants.has(exercice.id), `${exercice.id} est dupliqué`).toBe(false);
      identifiants.add(exercice.id);
      const contenu = exercice.jeu.contenu;
      const etapes = Array.isArray(contenu.consignes)
        ? contenu.consignes
        : Array.isArray(contenu.questions)
          ? contenu.questions
          : [];
      expect(etapes.length, `${exercice.id} n'a aucune étape`).toBeGreaterThan(0);
      for (const etape of etapes) {
        const ligne = etape as { readonly id?: unknown; readonly texte?: unknown };
        const id = String(ligne.id ?? '');
        const texte = String(ligne.texte ?? '');
        expect(texte, `${exercice.id}/${id} consigne vide`).not.toBe('');
        expect(audio.get(`${exercice.id}/${id}`), `${exercice.id}/${id} sans clip`).toBe(texte);
      }
    }
  });

  it('résout toutes les cibles déclarées par les exercices dans leur habillage', () => {
    for (const exercice of exercices) {
      const contenu = exercice.jeu.contenu;
      const habillage = lireHabillage(exercice.jeu.habillage);
      const regions = new Set(
        habillage.scene.calques.flatMap((calque) => calque.regions.map((region) => region.id)),
      );
      const etapes = Array.isArray(contenu.consignes) ? contenu.consignes : [];
      for (const etapeBrute of etapes) {
        const etape = etapeBrute as Record<string, unknown>;
        for (const cibleBrute of (etape.cibles as readonly Record<string, unknown>[] | undefined) ?? []) {
          expect(regions.has(String(cibleBrute.region)), `${exercice.id}: cible orpheline`).toBe(true);
        }
        for (const depotBrut of (etape.depots as readonly Record<string, unknown>[] | undefined) ?? []) {
          const zones = (contenu.zones as readonly Record<string, unknown>[] | undefined) ?? [];
          expect(zones.some((zone) => zone.id === depotBrut.zone), `${exercice.id}: zone orpheline`).toBe(true);
        }
      }
    }
  });

  it('mélange les mots des deux exercices de tri, sans toucher à leur ordre pédagogique', () => {
    const tris = exercices.filter((exercice) => exercice.jeu.moteur === 'tri');
    expect(tris).toHaveLength(2);
    for (const exercice of tris) {
      const contenu = exercice.jeu.contenu as never;
      const etat = moteurTri.creerEtat({ contenu, habillage: lireHabillage(exercice.jeu.habillage), alea: aleaDeTest(), horloge: horlogeDeTest() });
      const source = (exercice.jeu.contenu.elements as readonly { readonly id: string }[]).map((element) => element.id);
      expect(etat.elements.map((element) => element.id), `${exercice.id}: ordre des mots prévisible`).not.toEqual(source);
      expect(etat.etapes.map((etape) => etape.identifiant)).toEqual(
        (exercice.jeu.contenu.consignes as readonly { readonly id: string }[]).map((etape) => etape.id),
      );
    }
  });
});
