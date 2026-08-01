/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `place` — lot L2-C.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `depots: { minItems: 1, maxItems: 4 }` traduit la même leçon que `cibles` en `colorie`
 * (fiches-origine § 3) : une consigne porte une LISTE de dépôts, pas un seul. « Dessine un
 * chien avec sa balle derrière la petite fille » (fiche 15) en demande deux.
 *
 * `polygone: { minItems: 3 }` est la ligne qui rend la zone FERMÉE par construction : deux
 * points ne délimitent aucune surface, et `pointDansPolygone` rendrait `false` partout —
 * l'enfant taperait dans le vide sans comprendre.
 */

import type { SchemaJson } from '../types.js';

/** Les neuf relations spatiales de `RelationSpatiale`. Une seule source de vérité par fichier. */
const RELATIONS = [
  'dans',
  'sur',
  'sous',
  'a-cote-de',
  'devant',
  'derriere',
  'entre',
  'au-dessus',
  'en-dessous',
] as const;

const IDENTIFIANT = { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' };

const POINT = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  items: { type: 'number' },
};

export const SCHEMA_CONTENU_PLACE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-place',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'zones', 'reserve'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'depots', 'motsCles'],
        properties: {
          id: { type: 'string', pattern: '^c[0-9]+$' },
          texte: { type: 'string', minLength: 3, maxLength: 120 },
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          depots: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            uniqueItems: true,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['element', 'zone'],
              properties: { element: IDENTIFIANT, zone: IDENTIFIANT },
            },
          },
          motsCles: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 2 },
          },
        },
      },
    },
    zones: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'polygone', 'centroide', 'relation', 'ancre'],
        properties: {
          id: IDENTIFIANT,
          libelle: { type: 'string', minLength: 2, maxLength: 60 },
          polygone: { type: 'array', minItems: 3, maxItems: 64, items: POINT },
          centroide: POINT,
          relation: { enum: [...RELATIONS] },
          ancre: { type: ['string', 'null'] },
        },
      },
    },
    reserve: {
      type: 'array',
      // Au moins deux : un élément attendu et un intrus. Une réserve à un seul élément ne
      // demande aucune lecture — il n'y a rien à choisir.
      minItems: 2,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'asset', 'taille'],
        properties: {
          id: IDENTIFIANT,
          libelle: { type: 'string', minLength: 2, maxLength: 60 },
          asset: { type: 'string', minLength: 1 },
          taille: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: { type: 'number', exclusiveMinimum: 0 },
          },
        },
      },
    },
  },
};
