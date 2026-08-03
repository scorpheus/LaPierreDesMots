/**
 * Schéma JSON 2020-12 du bloc `jeu.contenu` pour le moteur `eclair` — lot L2-E.
 *
 * Validation en deux temps (contrat v1 § 9.1) : l'enveloppe est validée par
 * `contenu/schemas/exercice.schema.json`, qui déclare `jeu.contenu` à `true` ; c'est CE
 * schéma-ci, publié par le moteur lui-même, qui valide le bloc.
 *
 * `expositionMs` vit ICI et non dans le code : c'est un paramètre pédagogique, et D13 exige
 * que ces valeurs soient déclarées en données pour pouvoir être recalibrées sur l'enfant.
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

export const SCHEMA_CONTENU_ECLAIR: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/contenu-eclair',
  type: 'object',
  additionalProperties: false,
  required: ['consignes', 'options', 'competence'],
  properties: {
    consignes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'mot', 'texte', 'forme', 'audio', 'expositionMs', 'options', 'reponse', 'motsCles',
        ],
        properties: {
          id: ID_CONSIGNE,
          mot: { type: 'string', minLength: 1, maxLength: 24 },
          texte: TEXTE,
          forme: { enum: ['imperative', 'affirmative'] },
          audio: { type: ['string', 'null'] },
          // 200 ms au plancher : en dessous, on mesure la vue et non la lecture.
          expositionMs: { type: 'integer', minimum: 200, maximum: 5000 },
          options: { type: 'array', minItems: 2, maxItems: 4, uniqueItems: true, items: ID },
          reponse: ID,
          motsCles: MOTS_CLES,
        },
      },
    },
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'libelle', 'bonne', 'confusionAvec'],
        properties: {
          id: ID,
          libelle: LIBELLE,
          bonne: { type: 'boolean' },
          confusionAvec: { type: ['string', 'null'] },
          // R11 — la couleur À MONTRER quand l'option en désigne une. FACULTATIVE, et c'est
          // délibéré : quatre des six exercices `eclair` proposent le mot nu (`bol`, `dos`),
          // ce qui est juste. L'exiger partout obligerait à inventer une couleur pour `bol`.
          //
          // Énumération fermée sur la palette (v2 § 9.2) plutôt que chaîne libre : une couleur
          // hors palette serait acceptée par le schéma, rendue en gris par le code, et
          // personne ne saurait pourquoi.
          couleur: {
            enum: [
              'rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet',
              'rose', 'brun', 'noir', 'blanc', 'gris',
            ],
          },
        },
      },
    },
    competence: { type: 'string', minLength: 3 },
  },
};
