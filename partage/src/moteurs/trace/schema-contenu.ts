/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `trace` — lot L2-C.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json` ; c'est CE schéma-ci, publié par le moteur, qui
 * valide le bloc.
 *
 * DEUX LIGNES PORTENT TOUTE LA PÉDAGOGIE DU MOTEUR, et elles ne sont pas décoratives :
 *
 *   `points: { minItems: 8 }` — le sens d'écriture n'est mesurable que si le modèle est
 *   échantillonné. Un trait décrit par son seul `chemin` SVG ne dit pas dans quel sens on
 *   le parcourt, et `sensRespecte` n'aurait rien à comparer : le moteur ne distinguerait
 *   plus `b` de `d`, c'est-à-dire plus rien de ce pour quoi il existe (D23).
 *
 *   `paire` à UN seul objet, d'axe fermé — **une paire, donc un axe**. Un exercice ne
 *   mélange jamais `b`/`d` (gauche-droite) et `b`/`p` (haut-bas) : ce sont deux mécanismes
 *   différents, et un enfant peut être gêné par l'un et pas par l'autre (D23, conséquence 1).
 *   C'est le schéma, et pas seulement la relecture, qui l'interdit.
 */

import type { SchemaJson } from '../types.js';

const POINT = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  items: { type: 'number' },
};

const AXE = { enum: ['gauche-droite', 'haut-bas'] };

export const SCHEMA_CONTENU_TRACE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-trace',
  type: 'object',
  additionalProperties: false,
  required: ['lettres', 'paire', 'consigne', 'audio', 'consigneId'],
  properties: {
    lettres: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['lettre', 'casse', 'viewBox', 'traits', 'axeRisque'],
        properties: {
          lettre: { type: 'string', minLength: 1, maxLength: 2 },
          casse: { enum: ['minuscule', 'majuscule', 'cursive'] },
          viewBox: {
            type: 'string',
            pattern:
              '^-?[0-9]+(\\.[0-9]+)? -?[0-9]+(\\.[0-9]+)? [0-9]+(\\.[0-9]+)? [0-9]+(\\.[0-9]+)?$',
          },
          traits: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'ordre', 'chemin', 'points', 'depart', 'arrivee', 'libelle'],
              properties: {
                id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
                ordre: { type: 'integer', minimum: 1, maximum: 3 },
                chemin: { type: 'string', minLength: 4 },
                // Au moins 8, dans le sens d'écriture : sans eux, pas de sens, donc pas d'axe.
                points: { type: 'array', minItems: 8, maxItems: 64, items: POINT },
                depart: POINT,
                arrivee: POINT,
                libelle: { type: 'string', minLength: 2, maxLength: 60 },
              },
            },
          },
          axeRisque: { oneOf: [AXE, { type: 'null' }] },
        },
      },
    },
    paire: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['a', 'b', 'axe'],
          properties: {
            a: { type: 'string', minLength: 1, maxLength: 2 },
            b: { type: 'string', minLength: 1, maxLength: 2 },
            axe: AXE,
          },
        },
        { type: 'null' },
      ],
    },
    consigne: { type: 'string', minLength: 3, maxLength: 120 },
    audio: { type: ['string', 'null'] },
    consigneId: { type: 'string', pattern: '^c[0-9]+$' },
  },
};
