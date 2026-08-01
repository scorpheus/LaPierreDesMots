/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `tri` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `receptacles` est borné à 3 : au-delà, ce n'est plus un tri à critère lu, c'est un jeu
 * de mémoire de consignes — et `p_devinette` cesserait d'être dérivable proprement (D13).
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

export const SCHEMA_CONTENU_TRI: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-tri',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'receptacles', 'elements', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'aRanger', 'motsCles'],
        properties: {
          id: ID_CONSIGNE,
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          aRanger: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: ID },
          motsCles: MOTS_CLES,
        },
      },
    },
    receptacles: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'critere', 'zone'],
        properties: {
          id: ID,
          libelle: LIBELLE,
          critere: { type: 'string', minLength: 1, maxLength: 60 },
          zone: { type: 'array', minItems: 3, items: POINT },
        },
      },
    },
    elements: {
      type: 'array',
      minItems: 2,
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'asset', 'receptacleAttendu', 'confusionAvec'],
        properties: {
          id: ID,
          libelle: LIBELLE,
          asset: { type: ['string', 'null'] },
          receptacleAttendu: ID,
          confusionAvec: { type: ['string', 'null'] },
        },
      },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
