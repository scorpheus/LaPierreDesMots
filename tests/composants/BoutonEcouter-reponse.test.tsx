/**
 * REPRODUCTION DU DÉFAUT n° 3 — « pour l'instant j'ai cliqué et je n'ai rien eu ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LA SOURCE QUI FAIT FOI EST **D42** (`Docs/journal-des-decisions.md`), arbitrage rendu avant
 * ce fichier, et il tranche le remède :
 *
 *   « Le bouton « écouter » est **masqué tant qu'aucun audio n'existe** pour la consigne.
 *     Rien ne ment, rien ne déçoit — un bouton qui ne répond pas casse la confiance plus
 *     sûrement qu'un bouton absent. »
 *
 * L'attendu n'est donc PAS de faire répondre le bouton à vide, ni d'inventer un retour
 * visuel : c'est de **ne pas le rendre** quand `clip` vaut `null`. Ce fichier mesure
 * exactement cela.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * L'état actuel, mesuré : `BoutonEcouter.tsx` rend le bouton dans tous les cas ; au clic,
 * `direTexte` appelle `voix-navigateur.ts`, qui traite `clip === null` par un `console.info`
 * et un retour immédiat (ligne 51). Ni son, ni changement à l'écran — le DOM d'après le tap
 * est identique à celui d'avant. C'est ce que le père a vu.
 *
 * Les deux cas ci-dessous sont donc les deux faces de D42 : le bouton doit disparaître sans
 * clip, et rester pleinement présent avec un clip.
 */
/*
 * ──────────────────────────────────────────────────────────────────────────────────────────
 * ADAPTÉ PAR N2 — l'assertion est INCHANGÉE, seul l'oracle a bougé.
 *
 * Ce fichier est l'un des huit tests de constat que le contrat de finition v3 § 1.1 confie
 * aux lots : « ils MESURENT les défauts que les lots N1 à N8 doivent solder. Aucun lot ne les
 * supprime ; ils deviennent les tests de non-régression du travail. »
 *
 * N2 remplace la propriété `clip` — un chemin de fichier que l'appelant devait connaître —
 * par `cle`, une clé de manifeste (§ 5.6). La question posée par ce fichier ne change pas
 * d'un mot : « un bouton qui ne peut rien jouer est-il rendu ? ». Ce qui change, c'est QUI
 * répond : le manifeste, via `services.voix.aUnClip(cle)`, au lieu de l'appelant.
 *
 * `VoixMuette.clesConnues` est vide par défaut, et c'est délibéré : une voix de test qui
 * prétendrait connaître toutes les clés rendrait le bouton partout et D42 ne serait plus
 * jamais exercée. Un test qui veut le bouton DÉCLARE sa clé — et devient ainsi lisible sur
 * ce qu'il suppose.
 *
 * AUCUNE assertion n'a été assouplie, aucun cas n'a été retiré ni mis en `skip`.
 * ──────────────────────────────────────────────────────────────────────────────────────────
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoutonEcouter } from '@client/composants/BoutonEcouter';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import type { ContenuTrace } from '@partage/moteurs/trace/index';
import type { CleAudio, Exercice } from '@pierre/partage';

import { lireJson, servicesDeTest } from '../configuration/preparation.js';

/** La consigne RÉELLE du nœud que le père a ouvert, lue sur disque. */
const contenuBd = lireJson<Exercice>('contenu/exercices/galeries/miroir-bd-01.json').jeu
  .contenu as unknown as ContenuTrace;

function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined,
    }),
  };
}

function monter(cle: CleAudio | null): void {
  const jeu = services();
  // La clé n'est connue de la voix que si le test la déclare — voir la note N2 en tête.
  if (cle !== null) {
    jeu.voix.clesConnues.add(cle);
  }
  render(
    <FournisseurJeu valeur={{ services: jeu, magasin: creerMagasin(jeu) }}>
      <BoutonEcouter texte={contenuBd.consigne} cle={cle} />
    </FournisseurJeu>,
  );
}

const bouton = (): Element | null => document.querySelector('[data-action="ecouter"]');

afterEach(() => {
  cleanup();
});

describe('D42 — le bouton « écouter » est masqué tant qu’aucun audio n’existe', () => {
  it('AVEC un clip, le bouton est là et n’est jamais désactivé (R15)', () => {
    // Contrôle de la mesure ET de la moitié positive de D42 : masquer sans clip ne doit pas
    // faire disparaître le bouton quand la voix sera livrée.
    monter('galeries-miroir-bd-01/c1');
    expect(bouton()).not.toBeNull();
    expect(bouton()?.hasAttribute('disabled')).toBe(false);
  });

  it('SANS clip, le bouton n’est pas rendu du tout', () => {
    monter(null);
    expect(
      bouton(),
      'un bouton qui ne peut rien jouer ne doit pas être offert au doigt (D42)',
    ).toBeNull();
  });

  it('tant qu’il est rendu sans clip, le tap ne produit rien — c’est le défaut constaté', async () => {
    // La preuve du « j'ai cliqué et je n'ai rien eu », mesurée plutôt qu'affirmée : on
    // compare le DOM avant et après le tap, une fois la micro-tâche de `direTexte` résolue.
    //
    // Ce cas disparaîtra avec le correctif de D42 — sans clip il n'y aura plus de bouton à
    // taper. Il est ici parce qu'un défaut se reproduit avant d'être corrigé : sans lui, on
    // corrigerait sur parole.
    monter(null);
    const cible = bouton();
    if (cible === null) {
      // D42 est appliqué : il n'y a plus rien à taper, et le défaut n'existe plus.
      expect(cible).toBeNull();
      return;
    }

    const avant = document.body.innerHTML;
    await act(async () => {
      fireEvent.click(cible);
      // On laisse la micro-tâche de `direTexte(...).finally(...)` se résoudre : c'est
      // l'état STABLE d'après le tap qu'on mesure, pas une image intermédiaire.
      await Promise.resolve();
    });
    expect(
      document.body.innerHTML,
      'aucune trace du tap : le bouton est offert et ne répond pas',
    ).not.toBe(avant);
  });
});
