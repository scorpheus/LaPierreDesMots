/**
 * C7 — aucun texte destiné à l'enfant n'énonce ce qui lui manque. Lot N4.
 *
 * C'est le contrat de sortie chiffré de N4 (contrat v3 § 9.2) :
 *   `enonceUnePerte(t) === null` pour TOUS les `textesDestinesALEnfant()`.
 *   Échoue si un seul texte est fautif.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * TROIS PIÈGES, ET LES TROIS SONT GARDÉS ICI
 *
 * 1. **Le détecteur creux.** « Un détecteur déclarait un poids qu'il n'appliquait jamais :
 *    7 % de couverture, invisible jusqu'à ce qu'on la mesure. » Un `enonceUnePerte` qui
 *    rendrait toujours `null` ferait passer ce fichier au vert sans rien garantir. Le bloc
 *    « le filet attrape vraiment » lui donne la phrase d'origine du défaut, mot pour mot, et
 *    exige qu'il la refuse.
 *
 * 2. **L'énumération vide.** Une liste d'objets vide fait passer tout `every`. Le seuil
 *    plancher est donc asserté AVANT la boucle, et il est mesuré, pas supposé.
 *
 * 3. **L'occurrence prise pour l'objet.** On compte les OBJETS de texte — consignes, libellés,
 *    tableaux, chaînes d'écran — et non les occurrences d'un mot. Le test le prouve en
 *    vérifiant que des textes de trois familles différentes sont bien dans la liste.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';

import {
  FORMULATIONS_DE_PERTE,
  MARQUEURS_DE_POUVOIR,
  enonceUnePerte,
  textesDestinesALEnfant,
} from '@partage/ton/index.js';

import { RACINE_DEPOT } from '../configuration/preparation.js';

/**
 * Plancher du nombre d'objets de texte destinés à l'enfant.
 *
 * MESURÉ le 2026-08-02, pas estimé — voir le rapport de N4. Il est posé bien SOUS la mesure
 * pour ne pas casser au premier exercice ajouté par N8, et bien AU-DESSUS de zéro pour qu'une
 * énumération devenue muette fasse échouer la suite au lieu de la rendre verte.
 */
const PLANCHER_OBJETS = 120;

const TEXTES = textesDestinesALEnfant(RACINE_DEPOT);

describe('C7 — le jeu ne dit jamais ce qui manque', () => {
  it('énumère des OBJETS de texte, en nombre, et pas une liste vide', () => {
    expect(TEXTES.length).toBeGreaterThanOrEqual(PLANCHER_OBJETS);
  });

  it('atteint les trois familles de sources, pas une seule', () => {
    // Une consigne d'exercice (contenu/exercices/**).
    expect(TEXTES.some((texte) => texte.includes('Colorie les feuilles des arbres'))).toBe(true);
    // Un libellé du monde (contenu/monde/campement.json).
    expect(TEXTES.some((texte) => texte === 'le feu de camp')).toBe(true);
    // Une chaîne rendue par un écran (client/src/ecrans/**.tsx).
    expect(TEXTES.some((texte) => texte.includes('Où veux-tu aller'))).toBe(true);
  });

  it('AUCUN texte destiné à l’enfant n’énonce une perte', () => {
    const fautifs = TEXTES.map((texte) => ({ texte, faute: enonceUnePerte(texte) })).filter(
      (entree) => entree.faute !== null
    );

    // Le message d'échec porte le texte ET son remède : un test qui dit seulement « 3 fautifs »
    // oblige à rouvrir l'outil pour savoir quoi corriger.
    const rapport = fautifs
      .map((entree) => `  « ${entree.texte} »\n    → ${String(entree.faute?.remede)}`)
      .join('\n');

    expect(fautifs.length, `Textes fautifs :\n${rapport}`).toBe(0);
  });
});

describe('le filet attrape vraiment — il n’est pas inerte', () => {
  it('refuse la phrase exacte qui a fait buter le père (D35)', () => {
    const faute = enonceUnePerte('Bonjour Léo ! Le monde t’attend en gris.');
    expect(faute).not.toBeNull();
    expect(faute?.retournable).toBe(true);
  });

  it('accepte la MÊME perte quand le pouvoir d’agir est là (le retournement de D35)', () => {
    expect(enonceUnePerte('Le monde t’attend en gris : tu peux lui rendre ses couleurs.')).toBeNull();
  });

  it('refuse un reproche même suivi d’un encouragement — R14 ne se négocie pas', () => {
    const faute = enonceUnePerte('Tu n’as pas réussi, mais tu peux recommencer.');
    expect(faute).not.toBeNull();
    expect(faute?.retournable).toBe(false);
  });

  it('refuse le cadenas, que D44 interdit', () => {
    expect(enonceUnePerte('Cette case est verrouillée.')).not.toBeNull();
  });

  it('refuse « il te manque », qui énonce le manque au lieu de l’action', () => {
    expect(enonceUnePerte('Il te manque deux formes.')).not.toBeNull();
  });

  it('laisse passer un texte de jeu ordinaire', () => {
    expect(enonceUnePerte('Colorie les feuilles des arbres en vert.')).toBeNull();
    expect(enonceUnePerte('Tape pour entrer')).toBeNull();
    expect(enonceUnePerte('Il reste 40 % à rallumer')).toBeNull();
  });
});

describe('la table des formulations est utilisable par les autres lots', () => {
  it('porte des motifs des deux régimes', () => {
    expect(FORMULATIONS_DE_PERTE.some((f) => f.retournable)).toBe(true);
    expect(FORMULATIONS_DE_PERTE.some((f) => !f.retournable)).toBe(true);
  });

  it('donne à chaque motif un pourquoi et un remède non vides', () => {
    for (const formulation of FORMULATIONS_DE_PERTE) {
      expect(formulation.pourquoi.length).toBeGreaterThan(20);
      expect(formulation.remede.length).toBeGreaterThan(20);
    }
  });

  it('n’emploie aucun drapeau global sur ses motifs', () => {
    // Un `RegExp` avec `g` porte `lastIndex` et rend un résultat DIFFÉRENT d'un appel à
    // l'autre : `enonceUnePerte` deviendrait non déterministe. C'est le genre de défaut qui
    // ne se voit qu'en production, un texte sur deux.
    for (const formulation of FORMULATIONS_DE_PERTE) {
      expect(formulation.motif.global).toBe(false);
    }
    for (const marqueur of MARQUEURS_DE_POUVOIR) {
      expect(marqueur.global).toBe(false);
    }
  });
});
