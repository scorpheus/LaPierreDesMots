/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `assemble` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `solution` est un tableau ORDONNÉ et non un ensemble : « ta-pis » n'est pas « pis-ta »,
 * et un schéma à `uniqueItems` sans ordre rendrait la mécanique inexprimable.
 */

import type { SchemaJson } from '../types.js';

/** Identifiant d'objet de contenu, même forme que partout ailleurs dans le dépôt. */
const ID = { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } as const;
const ID_CONSIGNE = { type: 'string', pattern: '^c[0-9]+$' } as const;
const LIBELLE = { type: 'string', minLength: 1, maxLength: 80 } as const;
const TEXTE = { type: 'string', minLength: 3, maxLength: 200 } as const;
const MOTS_CLES = { type: 'array', minItems: 1, items: { type: 'string', minLength: 2 } } as const;
const POINT = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  items: { type: 'number' },
} as const;

export const SCHEMA_CONTENU_ASSEMBLE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-assemble',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'blocs', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'mot', 'solution', 'motsCles'],
        properties: {
          id: ID_CONSIGNE,
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          mot: { type: 'string', minLength: 2, maxLength: 24 },
          solution: { type: 'array', minItems: 2, maxItems: 6, uniqueItems: true, items: ID },
          motsCles: MOTS_CLES,
        },
      },
    },
    blocs: {
      type: 'array',
      minItems: 2,
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'intrus', 'confusionAvec'],
        properties: {
          id: ID,
          libelle: { type: 'string', minLength: 1, maxLength: 8 },
          intrus: { type: 'boolean' },
          confusionAvec: { type: ['string', 'null'] },
        },
      },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
