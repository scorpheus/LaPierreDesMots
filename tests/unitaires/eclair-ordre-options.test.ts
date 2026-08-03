/**
 * LA BONNE RÉPONSE N'EST PLUS TOUJOURS LE PREMIER BOUTON — R15 bis.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT, TROUVÉ EN JOUANT ET MESURÉ ENSUITE
 *
 * « Pour les mots à toucher ou la luciole à toucher, ça sélectionne toujours le premier. »
 *
 *     consignes à options dans les 76 exercices livrés : 34
 *     dont la bonne réponse en PREMIÈRE position       : 34   (100,0 %)
 *
 * Trente-quatre sur trente-quatre. **Un enfant qui tapait toujours le premier bouton gagnait à
 * tous les coups, sans lire une seule lettre.** L'exercice ne mesurait rien — pire, il
 * enseignait une stratégie de position, exactement le contraire de ce qu'il prétend travailler.
 * Et le BKT, qui croit mesurer une compétence de lecture, engrangeait des réussites vides.
 *
 * ── POURQUOI CE FICHIER MESURE LE MOTEUR ET NON LE CONTENU ────────────────────────────────────
 * Un contrôle sur les fichiers d'exercice aurait exigé de mélanger les options À LA MAIN dans
 * 34 consignes — un travail à refaire à chaque exercice ajouté, et faux au premier oubli. Le
 * mélange est donc fait par le MOTEUR, à la création de l'état, avec `Alea` : reproductible à la
 * graine près, donc le rejeu (annexe T § T2) reste exact.
 *
 * Ce fichier mesure donc CE QUE L'ENFANT VOIT — la position de la bonne réponse dans l'ordre
 * d'affichage — sur le contenu réel et sur plusieurs graines. C'est la seule formulation qui
 * reste vraie quand un exercice est ajouté demain.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { creerAlea } from '@partage/alea';
import { moteurEclair } from '@partage/moteurs/eclair/moteur';

import { horlogeDeTest, lireJson, RACINE_DEPOT } from '../configuration/preparation.js';

import type { ContenuEclair } from '@partage/moteurs/eclair/types';
import type { Exercice, Habillage } from '@pierre/partage';

const habillage: Habillage = lireJson<Habillage>(
  'contenu/habillages/clairiere/luciole.habillage.json'
);

/** Les exercices `eclair` réellement livrés. Aucun n'est nommé en dur. */
function exercicesEclair(): readonly Exercice[] {
  const trouves: Exercice[] = [];
  for (const region of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices'))) {
    for (const fichier of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices', region))) {
      if (!fichier.endsWith('.json')) continue;
      const exercice = lireJson<Exercice>(`contenu/exercices/${region}/${fichier}`);
      if (exercice.jeu.moteur === 'eclair') trouves.push(exercice);
    }
  }
  return trouves;
}

/** Position de la bonne réponse dans l'ordre AFFICHÉ, pour chaque étape, sous une graine. */
function positions(exercice: Exercice, graine: number): readonly number[] {
  const contenu = exercice.jeu.contenu as unknown as ContenuEclair;
  const etat = moteurEclair.creerEtat({
    contenu,
    habillage,
    alea: creerAlea(graine),
    horloge: horlogeDeTest()
  });
  return etat.etapes.map((etape, index) =>
    etape.ordreOptions.indexOf(contenu.consignes[index]?.reponse ?? '')
  );
}

describe('R15 bis — taper toujours le premier bouton ne suffit plus', () => {
  test('CONTRÔLE POSITIF — il y a bien des exercices `eclair` et des consignes à options', () => {
    // Sans lui, une liste vide rendrait toutes les propriétés vraies sans rien prouver — le
    // mode de défaillance que ce dépôt corrige partout cette semaine.
    const exercices = exercicesEclair();
    expect(exercices.length, 'aucun exercice `eclair` livré').toBeGreaterThanOrEqual(4);
    const nbConsignes = exercices.reduce(
      (total, exercice) => total + (exercice.jeu.contenu as unknown as ContenuEclair).consignes.length,
      0
    );
    expect(nbConsignes, 'aucune consigne à options').toBeGreaterThanOrEqual(20);
  });

  test('LE DÉFAUT — la bonne réponse n’est pas toujours en première position', () => {
    // Le chiffre mesuré AVANT correction : 34 sur 34. On exige ici franchement moins de la
    // moitié : un mélange honnête sur 3 options en met environ un tiers en tête.
    let total = 0;
    let enTete = 0;
    for (const exercice of exercicesEclair()) {
      for (const graine of [1, 7, 42, 2026, 31_337]) {
        for (const position of positions(exercice, graine)) {
          expect(position, 'la bonne réponse est absente de l’ordre affiché').toBeGreaterThanOrEqual(0);
          total += 1;
          if (position === 0) enTete += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(100);
    const part = enTete / total;
    expect(
      part,
      `la bonne réponse est en tête dans ${(part * 100).toFixed(1)} % des cas ` +
        `(${String(enTete)}/${String(total)}) — avant correction : 100 %`
    ).toBeLessThan(0.5);
  });

  test('toutes les options restent proposées : mélanger n’en perd aucune', () => {
    // Un mélange qui perdrait une option retirerait silencieusement la bonne réponse d'une
    // étape sur trois. Le contrat est ENSEMBLISTE, pas seulement positionnel.
    for (const exercice of exercicesEclair()) {
      const contenu = exercice.jeu.contenu as unknown as ContenuEclair;
      const etat = moteurEclair.creerEtat({
        contenu,
        habillage,
        alea: creerAlea(9),
        horloge: horlogeDeTest()
      });
      etat.etapes.forEach((etape, index) => {
        const attendues = [...(contenu.consignes[index]?.options ?? [])].sort();
        expect([...etape.ordreOptions].sort(), `${exercice.id} étape ${String(index)}`).toEqual(
          attendues
        );
      });
    }
  });

  test('DÉTERMINISME — la même graine rend le même ordre, sinon le rejeu ment', () => {
    // `Alea` est la seule source de hasard du projet, et le rejeu des journaux (annexe T § T2)
    // suppose que la même graine reproduit la même partie. Un mélange non reproductible ferait
    // diverger le rejeu sans qu'aucun test de rejeu ne sache pourquoi.
    for (const exercice of exercicesEclair()) {
      expect(positions(exercice, 123)).toEqual(positions(exercice, 123));
    }
  });

  test('et deux graines différentes ne donnent pas toutes le même ordre', () => {
    // Sinon `melanger` serait branché sur une graine constante, et on aurait remplacé « toujours
    // le premier » par « toujours le deuxième » — un défaut identique, plus difficile à voir.
    const distincts = new Set(
      exercicesEclair().flatMap((exercice) =>
        [1, 2, 3, 4, 5, 6, 7, 8].map((graine) => positions(exercice, graine).join(','))
      )
    );
    expect(distincts.size, 'toutes les graines rendent le même ordre').toBeGreaterThan(1);
  });
});
