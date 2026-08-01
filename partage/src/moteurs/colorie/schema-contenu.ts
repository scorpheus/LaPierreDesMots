/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `colorie` — lot L-E.
 *
 * Validation en deux temps (contrat § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ;
 * c'est CE schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `cibles: { minItems: 1, maxItems: 8 }` est LA ligne qui traduit fiches-origine § 3 :
 * une consigne porte une LISTE de couples (région, couleur), pas un couple. Un schéma
 * au singulier rendrait la consigne 5 de la fiche 1 (« la porte est jaune ET le toit est
 * rouge ») inexprimable.
 *
 * Reproduit à la lettre le contrat-technique-v1.md § 9.3.
 */

import type { SchemaJson } from '../types.js';

/** Les 11 couleurs du nuancier de coloriage (contrat § 12, écart n° 2). */
const COULEURS = [
  'rouge',
  'orange',
  'jaune',
  'vert',
  'bleu',
  'violet',
  'rose',
  'brun',
  'noir',
  'blanc',
  'gris'
] as const;

export const SCHEMA_CONTENU_COLORIE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-colorie',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'nuancierAutorise'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'texte', 'forme', 'audio', 'cibles', 'motsCles'],
        properties: {
          id: { type: 'string', pattern: '^c[0-9]+$' },
          texte: { type: 'string', minLength: 3, maxLength: 120 },
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          cibles: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            uniqueItems: true,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['region', 'couleur'],
              properties: {
                region: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
                couleur: { enum: [...COULEURS] }
              }
            }
          },
          motsCles: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 2 }
          }
        }
      }
    },
    nuancierAutorise: {
      type: 'array',
      minItems: 4,
      maxItems: 11,
      uniqueItems: true,
      items: { enum: [...COULEURS] }
    }
  }
};
