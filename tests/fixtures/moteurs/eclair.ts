/**
 * Fixture de contenu du moteur `eclair` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurEclair.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurEclair.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuEclair } from '@partage/moteurs/eclair/types';

export const contenuEclair: ContenuEclair = {
  consignes: [
    {
      id: 'c1',
      texte: 'Quel mot as-tu vu ?',
      mot: 'roue',
      forme: 'imperative',
      audio: null,
      expositionMs: 400,
      options: ['opt-roue', 'opt-rue'],
      reponse: 'opt-roue',
      motsCles: ['quel', 'mot'],
    },
  ],
  options: [
    { id: 'opt-roue', libelle: 'roue', bonne: true, confusionAvec: null },
    { id: 'opt-rue', libelle: 'rue', bonne: false, confusionAvec: 'roue' },
  ],
  competence: 'gph.ou',
};

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * DEUX ÉTAPES — parce qu'une seule ne traverse jamais le passage de l'une à l'autre.
 *
 * Ajoutée le 2026-08-03 après un défaut trouvé EN JOUANT et qu'aucun test n'a vu : « quand tu
 * cliques sur la bonne couleur, ça affiche le mot suivant directement ET ça te met le bouton
 * montre-moi le mot, qui est déjà affiché ».
 *
 * La fixture ci-dessus ne porte qu'UNE consigne. Répondre y termine l'exercice : aucun test du
 * dépôt n'avait donc jamais exercé le CHANGEMENT D'ÉTAPE de ce moteur — l'état exact où le
 * défaut vivait. C'est la même faute de méthode que celle que ce dépôt corrige ailleurs : on
 * teste ce qui est facile à mettre en place, pas ce qui arrive.
 *
 * Elle reste minimale et validée par le même schéma : deux consignes, quatre options, des
 * expositions différentes pour que le second éclair ne puisse pas passer pour le premier.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
export const contenuEclairDeuxEtapes: ContenuEclair = {
  consignes: [
    {
      id: 'c1',
      texte: 'Quel mot as-tu vu ?',
      mot: 'roue',
      forme: 'imperative',
      audio: null,
      expositionMs: 400,
      options: ['opt-roue', 'opt-rue'],
      reponse: 'opt-roue',
      motsCles: ['quel', 'mot'],
    },
    {
      id: 'c2',
      texte: 'Et celui-ci ?',
      mot: 'boule',
      forme: 'imperative',
      audio: null,
      // Volontairement DIFFÉRENTE de la première : un second éclair qui durerait pareil
      // pourrait passer pour la queue du premier, et le test ne saurait plus lequel il mesure.
      expositionMs: 700,
      options: ['opt-boule', 'opt-poule'],
      reponse: 'opt-boule',
      motsCles: ['celui'],
    },
  ],
  options: [
    { id: 'opt-roue', libelle: 'roue', bonne: true, confusionAvec: null },
    { id: 'opt-rue', libelle: 'rue', bonne: false, confusionAvec: 'roue' },
    { id: 'opt-boule', libelle: 'boule', bonne: true, confusionAvec: null },
    { id: 'opt-poule', libelle: 'poule', bonne: false, confusionAvec: 'boule' },
  ],
  competence: 'gph.ou',
};
