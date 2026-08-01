/**
 * Validation du contenu, en deux temps — contrat § 9.1.
 *
 * 1. **L'enveloppe** : tout sauf `jeu.contenu`, déclaré `true` (n'importe quoi).
 * 2. **Le bloc `jeu.contenu`** : validé par le schéma que le moteur publie lui-même
 *    (`moteur.schemaContenu`), puis confronté à l'habillage.
 *
 * Ce module vit derrière le sous-chemin `@pierre/partage/validation` et **n'est jamais
 * réexporté par le barillet** : Ajv pèse une centaine de kilo-octets et ferait sauter le
 * budget de 250 Ko gzip du bundle client (contrat § 3.1).
 */

import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

import type { Exercice } from './types.js';
import type { Habillage, SchemaJson } from '../moteurs/types.js';
import type { IdRegionSvg } from '../identifiants.js';
import { estMoteurEnregistre, obtenirMoteur } from '../moteurs/registre.js';

export interface ProblemeValidation {
  /** Pointeur JSON, ex. `/jeu/contenu/consignes/2/cibles/0/region`. */
  readonly chemin: string;
  readonly message: string;
  /** `schema` | `habillage-incompatible` | `region-inconnue` | … */
  readonly regle: string;
}

export interface RapportValidation {
  readonly valide: boolean;
  readonly problemes: readonly ProblemeValidation[];
}

/**
 * Ajv est publié en CommonJS avec un export par défaut ; selon l'interopérabilité du
 * chargeur, `import` rend soit la classe, soit le module qui la porte. Ce dépliage vaut dans
 * les deux cas et évite le fameux « Ajv is not a constructor ».
 */
// `typeof Ajv2020` désigne ici le NAMESPACE du module, qui n'a pas de signature de
// construction — d'où `TS2351: This expression is not constructable`. On décrit donc la
// surface réellement utilisée (une seule méthode : `compile`) plutôt que d'emprunter un type
// que l'interopérabilité CJS/ESM rend ambigu.
type ConstructeurAjv = new (options?: Record<string, unknown>) => {
  compile(schema: unknown): ValidateFunction;
};

const Constructeur = ((Ajv2020 as unknown as { default?: unknown }).default ??
  Ajv2020) as unknown as ConstructeurAjv;

const ajv = new Constructeur({ allErrors: true, strict: false });

/**
 * Le schéma d'enveloppe, recopié du contrat § 9.2.
 *
 * **Duplication connue et signalée** : le même schéma existe sur disque en
 * `contenu/schemas/exercice.schema.json` (lot L-F), d'où `scripts/test-contenu.mjs` le charge.
 * Le contrat n'ouvre ni paramètre de schéma ni chargeur sur `validerExercice`, et `partage/`
 * ne peut pas lire le disque côté navigateur : les deux copies dérivent donc du même texte
 * gelé. À réunir en une seule source dès qu'un fichier pourra être ajouté au contrat.
 */
const SCHEMA_EXERCICE: SchemaJson = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'pierre:schemas/exercice',
  title: 'Exercice',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'version', 'titre', 'competences', 'difficulte', 'jeu'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
    version: { type: 'integer', minimum: 1 },
    titre: { type: 'string', minLength: 1, maxLength: 80 },
    origine: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'niveau', 'fiche'],
      properties: {
        source: { type: 'string', minLength: 1 },
        niveau: { type: 'integer', minimum: 1, maximum: 7 },
        fiche: { type: 'integer', minimum: 1, maximum: 15 },
      },
    },
    competences: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', pattern: '^(gph|syl|mot\\.outil|lex|flu|comp|enc)\\.[a-z0-9.\\-]+$' },
    },
    difficulte: { type: 'integer', minimum: 1, maximum: 5 },
    jeu: {
      type: 'object',
      additionalProperties: false,
      required: ['moteur', 'habillage', 'noeud', 'etoiles', 'aideGobi', 'contenu'],
      properties: {
        moteur: {
          type: 'string',
          enum: [
            'attrape',
            'tri',
            'assemble',
            'chemin',
            'eclair',
            'paires',
            'phrase',
            'histoire',
            'chrono',
            'grave',
            'colorie',
            'libre',
            'place',
          ],
        },
        habillage: { type: 'string', pattern: '^[a-z0-9]+(\\.[a-z0-9\\-]+)+$' },
        noeud: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        etoiles: {
          type: 'object',
          additionalProperties: false,
          required: ['sansAide', 'sansErreur'],
          properties: { sansAide: { type: 'boolean' }, sansErreur: { type: 'boolean' } },
        },
        aideGobi: {
          type: 'array',
          minItems: 1,
          uniqueItems: true,
          items: {
            enum: [
              'relire-consigne',
              'souffle-syllabe',
              'surligne-graphene',
              'montre-cible',
              'montre-couleur',
            ],
          },
        },
        contenu: true,
      },
    },
  },
};

let validerEnveloppe: ValidateFunction | null = null;

/** Les schémas ne sont compilés qu'au premier usage : un import ne doit rien coûter. */
function enveloppe(): ValidateFunction {
  // `??=` ne réduit pas le type de la variable de portée module : on passe par une locale.
  const compilee = validerEnveloppe ?? ajv.compile(SCHEMA_EXERCICE);
  validerEnveloppe = compilee;
  return compilee;
}

const schemasDeMoteur = new Map<string, ValidateFunction>();

function schemaDeMoteur(code: string, schema: SchemaJson): ValidateFunction {
  const connu = schemasDeMoteur.get(code);
  if (connu !== undefined) {
    return connu;
  }
  const compile = ajv.compile(schema);
  schemasDeMoteur.set(code, compile);
  return compile;
}

function traduire(erreurs: readonly ErrorObject[] | null | undefined, prefixe = ''): ProblemeValidation[] {
  return (erreurs ?? []).map((erreur) => ({
    chemin: `${prefixe}${erreur.instancePath}`,
    message: erreur.message ?? 'schéma non satisfait',
    regle: 'schema',
  }));
}

function rapport(problemes: readonly ProblemeValidation[]): RapportValidation {
  return { valide: problemes.length === 0, problemes };
}

/** Valide l'enveloppe seule. `jeu.contenu` n'est pas regardé. */
export function validerExercice(donnees: unknown): RapportValidation {
  const valider = enveloppe();
  return valider(donnees) ? rapport([]) : rapport(traduire(valider.errors));
}

/** Toutes les régions déclarées coloriables par l'habillage. */
function regionsColoriables(habillage: Habillage): Set<IdRegionSvg> {
  const regions = new Set<IdRegionSvg>();
  for (const calque of habillage.scene.calques) {
    if (calque.role !== 'coloriable') {
      continue;
    }
    for (const region of calque.regions) {
      regions.add(region.id);
    }
  }
  return regions;
}

/**
 * Recense les propriétés `region` du bloc de jeu, avec leur pointeur JSON.
 *
 * Le parcours est **générique**, sans rien savoir de `colorie` : c'est ce qui permet au
 * contrôle 6 de `test:contenu` (contrat § 9.8) de survivre à l'arrivée d'un douzième moteur.
 */
function recenserRegions(valeur: unknown, chemin: string, trouvees: Array<[string, string]>): void {
  if (Array.isArray(valeur)) {
    valeur.forEach((element, index) => {
      recenserRegions(element, `${chemin}/${index}`, trouvees);
    });
    return;
  }
  if (typeof valeur !== 'object' || valeur === null) {
    return;
  }
  for (const [cle, sousValeur] of Object.entries(valeur)) {
    const sousChemin = `${chemin}/${cle}`;
    if (cle === 'region' && typeof sousValeur === 'string') {
      trouvees.push([sousChemin, sousValeur]);
    } else {
      recenserRegions(sousValeur, sousChemin, trouvees);
    }
  }
}

/**
 * Valide `jeu.contenu` contre le moteur déclaré, puis la cohérence avec l'habillage :
 * moteur enregistré, habillage attendu, couple déclaré compatible, régions existantes.
 *
 * La règle des 64 px sur `RegionColoriable.surface` **n'est pas contrôlée ici** : elle dépend
 * de l'échelle de rendu, que ce module ne connaît pas. Elle reste au contrôle 6 de
 * `scripts/test-contenu.mjs` (lot L-G).
 */
export function validerBlocJeu(exercice: Exercice, habillage: Habillage): RapportValidation {
  const problemes: ProblemeValidation[] = [];
  const { moteur: codeMoteur, habillage: idHabillage, contenu } = exercice.jeu;

  if (!estMoteurEnregistre(codeMoteur)) {
    return rapport([
      {
        chemin: '/jeu/moteur',
        message: `Moteur « ${codeMoteur} » non enregistré : appeler initialiserRegistreMoteurs().`,
        regle: 'moteur-inconnu',
      },
    ]);
  }

  const moteur = obtenirMoteur(codeMoteur);
  const valider = schemaDeMoteur(codeMoteur, moteur.schemaContenu);
  if (!valider(contenu)) {
    problemes.push(...traduire(valider.errors, '/jeu/contenu'));
  }

  if (idHabillage !== habillage.id) {
    problemes.push({
      chemin: '/jeu/habillage',
      message: `L'exercice déclare « ${idHabillage} », l'habillage fourni est « ${habillage.id} ».`,
      regle: 'habillage-incompatible',
    });
  }

  if (!habillage.moteurs.includes(codeMoteur)) {
    problemes.push({
      chemin: '/jeu/habillage',
      message: `L'habillage « ${habillage.id} » ne déclare pas le moteur « ${codeMoteur} ».`,
      regle: 'habillage-incompatible',
    });
  }

  const connues = regionsColoriables(habillage);
  const citees: Array<[string, string]> = [];
  recenserRegions(contenu, '/jeu/contenu', citees);
  for (const [chemin, region] of citees) {
    if (!connues.has(region)) {
      problemes.push({
        chemin,
        message: `Région « ${region} » absente des calques coloriables de « ${habillage.id} ».`,
        regle: 'region-inconnue',
      });
    }
  }

  return rapport(problemes);
}
