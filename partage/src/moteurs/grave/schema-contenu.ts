/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `grave` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `clavier` est BORNÉ à 12 touches. Un alphabet complet ferait de l'exercice une épreuve de
 * recherche visuelle, pas de lecture — et R16 interdit d'exiger cette précision-là.
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

export const SCHEMA_CONTENU_GRAVE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-grave',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'clavier', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'mot', 'trous', 'motsCles'],
        properties: {
          id: ID_CONSIGNE,
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          mot: { type: 'string', minLength: 2, maxLength: 24 },
          trous: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'position', 'attendu'],
              properties: {
                id: ID,
                position: { type: 'integer', minimum: 0 },
                // Un graphème, pas seulement une lettre : `ou`, `an`, `ch`.
                attendu: { type: 'string', minLength: 1, maxLength: 3 },
              },
            },
          },
          motsCles: MOTS_CLES,
        },
      },
    },
    clavier: {
      type: 'array',
      minItems: 2,
      maxItems: 12,
      uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 3 },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
