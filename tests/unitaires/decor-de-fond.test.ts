/**
 * TOUT MOTEUR MONTRE SON DÉCOR — R9, et la liste qui le décide ne doit pas pouvoir mentir.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE
 *
 * Recensé sur les OBJETS — les quatorze moteurs — et non sur les occurrences d'un mot-clé :
 *
 *     colorie  OUI (SceneSvg)      assemble attrape chemin chrono eclair grave
 *     place    OUI (ScenePlace)    histoire libre paires phrase trace tri   → NON
 *
 * **2 sur 14.** Douze moteurs déclaraient un habillage et n'en affichaient rien : l'habillage ne
 * leur servait qu'à remplir `data-habillage`. L'enfant jouait douze des quatorze types de jeu sur
 * un fond vide, et 53 décors mesurés et validés n'atteignaient jamais l'écran.
 *
 * Ce n'est pas qu'une question de laideur : « moteur × habillage × contenu » porte R12 et R13, et
 * **un habillage qui ne s'affiche pas rend R13 inobservable** — deux sorties « avec des habillages
 * différents » sont identiques à l'écran.
 *
 * ── POURQUOI CE FICHIER EXISTE PLUTÔT QU'UN SIMPLE COMMENTAIRE ────────────────────────────────
 * `MOTEURS_AVEC_SCENE_PROPRE` est un DOUBLON de la réalité du code, et un doublon se met à
 * mentir. C'est très exactement ce qui venait d'arriver aux polices : deux listes côte à côte,
 * trois entrées dans l'une et pas dans l'autre, et des requêtes qui recevaient du HTML pendant
 * des semaines sans qu'aucun test ne le dise.
 *
 * Les deux fautes possibles sont silencieuses pour qui lit le code, et criantes pour l'enfant :
 *   • un moteur qui monte sa scène SANS être inscrit → deux décors superposés, et le second
 *     mange les taps du premier ;
 *   • un moteur inscrit qui ne monte plus la sienne → plus aucun décor, retour au défaut R9.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { MOTEURS_AVEC_SCENE_PROPRE } from '@client/habillages/DecorDeFond.js';

import { lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

const DOSSIER_MOTEURS = 'client/src/moteurs';

/** Les moteurs réellement présents sur le disque, par leur dossier. */
function moteurs(): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, DOSSIER_MOTEURS), { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => entree.name)
    .sort();
}

/** Le fichier `Moteur*.tsx` d'un moteur, lu tel quel. */
function sourceDuMoteur(code: string): string {
  const dossier = join(RACINE_DEPOT, DOSSIER_MOTEURS, code);
  const fichier = readdirSync(dossier).find(
    (nom) => nom.startsWith('Moteur') && nom.endsWith('.tsx')
  );
  expect(fichier, `aucun composant Moteur*.tsx dans ${code}`).toBeDefined();
  return lireTexte(`${DOSSIER_MOTEURS}/${code}/${fichier as string}`);
}

/**
 * Le moteur monte-t-il sa PROPRE scène ?
 *
 * On cherche un composant de scène MONTÉ — `<SceneSvg`, `<ScenePlace` — et non le simple mot
 * « scene », qui apparaît dans les commentaires de la moitié des fichiers. C'est la différence
 * entre auditer un objet et compter des occurrences.
 */
function monteSaPropreScene(code: string): boolean {
  return /<Scene[A-Z][A-Za-z]*\b/u.test(sourceDuMoteur(code));
}

describe('le décor atteint l’enfant, quel que soit le moteur', () => {
  test('CONTRÔLE POSITIF — les quatorze moteurs sont bien trouvés et lisibles', () => {
    // Sans ce cas, un chemin faux rendrait une liste vide, toutes les boucles seraient vides,
    // et le fichier serait vert en ne vérifiant rien.
    const liste = moteurs();
    expect(liste.length, 'aucun moteur trouvé').toBeGreaterThanOrEqual(14);
    for (const code of liste) {
      expect(sourceDuMoteur(code).length, `${code} : source vide`).toBeGreaterThan(200);
    }
  });

  test('la liste des moteurs à scène propre dit VRAI, dans les deux sens', () => {
    const inscrits = new Set(MOTEURS_AVEC_SCENE_PROPRE);
    const mesures = moteurs().filter(monteSaPropreScene);

    const oublies = mesures.filter((code) => !inscrits.has(code));
    expect(
      oublies,
      'ces moteurs montent leur scène sans être inscrits : DEUX décors se superposeraient, ' +
        'et le second mangerait les taps du premier'
    ).toEqual([]);

    const fantomes = [...inscrits].filter((code) => !mesures.includes(code));
    expect(
      fantomes,
      'ces moteurs sont inscrits mais ne montent plus de scène : ils n’auraient AUCUN décor'
    ).toEqual([]);
  });

  test('LE DÉFAUT CORRIGÉ — aucun moteur ne reste sans décor', () => {
    // La propriété qui compte, écrite comme une propriété et non comme une liste : chaque
    // moteur montre un décor, soit le sien, soit celui que `EcranNoeud` monte pour lui.
    const ecran = lireTexte('client/src/ecrans/EcranNoeud.tsx');
    expect(ecran, '`EcranNoeud` ne monte pas le décor de fond').toMatch(/<DecorDeFond\b/u);

    const sansDecor = moteurs().filter(
      (code) => !monteSaPropreScene(code) && !ecran.includes('<DecorDeFond')
    );
    expect(sansDecor, 'moteurs sans aucun décor').toEqual([]);
  });

  test('le fond ne mange jamais le doigt, et ne parle jamais aux lecteurs d’écran', () => {
    // Le pire défaut possible sur une appli d'enfant est un écran qui ne répond plus. Une
    // couche en `position: absolute; inset: 0` par-dessus le moteur ferait exactement ça si
    // elle oubliait `pointerEvents: 'none'`.
    const source = lireTexte('client/src/habillages/DecorDeFond.tsx');
    expect(source).toMatch(/pointerEvents:\s*'none'/u);
    expect(source).toMatch(/aria-hidden="true"/u);
    // Et il reste immobile : « le décor s'agite, le texte jamais » vaut d'abord là où l'enfant
    // déchiffre, et le fond est justement DERRIÈRE la consigne.
    expect(source, 'une animation sur le fond du champ de lecture').not.toMatch(/animation:/u);
  });
});
