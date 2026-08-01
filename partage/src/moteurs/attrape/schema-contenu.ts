/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `attrape` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `confusionAvec` est la ligne qui empêche ce moteur d'être creux : sans elle, un intrus
 * touché ne serait qu'un compteur ; avec elle, il devient une `ConfusionObservee` (D23).
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

export const SCHEMA_CONTENU_ATTRAPE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-attrape',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'cibles', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      // Aligné sur `capacites.nbEtapesMax` du moteur : les deux bougent ensemble.
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'aAttraper', 'motsCles'],
        properties: {
          id: ID_CONSIGNE,
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          aAttraper: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: ID },
          motsCles: MOTS_CLES,
        },
      },
    },
    cibles: {
      type: 'array',
      // Deux cibles minimum : sans intrus, il n'y a rien à lire.
      minItems: 2,
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'bonne', 'asset', 'depart', 'taille', 'confusionAvec'],
        properties: {
          id: ID,
          libelle: LIBELLE,
          bonne: { type: 'boolean' },
          asset: { type: ['string', 'null'] },
          depart: POINT,
          // R16 : au moins 64 unités de côté, contrôlées à l'échelle de rendu par
          // `tests/qualite/a11y.spec.ts`.
          taille: POINT,
          confusionAvec: { type: ['string', 'null'] },
        },
      },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
