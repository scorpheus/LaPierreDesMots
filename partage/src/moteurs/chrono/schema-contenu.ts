/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `chrono` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `ordre` compte de 2 à 5 vignettes : le corpus dit « Numérote de 1 à 5 » (niveau 5), et
 * c'est cette borne-là qu'on reprend, pas une borne inventée.
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

export const SCHEMA_CONTENU_CHRONO: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-chrono',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'vignettes', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'recit', 'ordre', 'motsCles'],
        properties: {
          id: ID_CONSIGNE,
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          recit: { type: 'string', minLength: 10, maxLength: 400 },
          ordre: { type: 'array', minItems: 2, maxItems: 5, uniqueItems: true, items: ID },
          motsCles: MOTS_CLES,
        },
      },
    },
    vignettes: {
      type: 'array',
      minItems: 2,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'asset', 'taille'],
        properties: {
          id: ID,
          libelle: LIBELLE,
          asset: { type: ['string', 'null'] },
          taille: POINT,
        },
      },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
