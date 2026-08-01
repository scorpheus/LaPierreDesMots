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

// ═══════════════════════════════════════════════════ l'étape bloquante : les régions fermées
//
// « Un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image »
// (CLAUDE.md, annexe P § 3.2). C'est LA vérification bloquante de la chaîne image, et elle
// n'avait aucun contrôle automatique : `estCheminFerme` vivait dans le composant de rendu
// `client/src/moteurs/colorie/SceneSvg.tsx`, exporté « destiné à L-G », et n'était appelé
// nulle part — un script Node ne sait pas importer un `.tsx`.
//
// Elle vit ici parce que c'est le seul module que `scripts/test-contenu.mjs` (Node pur, via
// `dist/`) ET les tests TypeScript peuvent atteindre. Elle ne dépend pas d'Ajv, et le client
// ne l'importe pas : aucun coût de bundle.
//
// ÉCART AU CONTRAT GELÉ, assumé et déclaré : le § 11.2 fige la surface de
// `@pierre/partage/validation` sur quatre symboles, et le § 9.8 fige les 6 contrôles de
// `test:contenu`. Ce contrôle est un SEPTIÈME, qui vient de l'annexe P § 3.2 et non de
// l'annexe T § T1 — il n'en contredit aucun, il comble un trou que la revue a mesuré.

/**
 * Un chemin est fermé si chacune de ses sous-courbes commence par `M`/`m` et se termine par
 * `Z`/`z`. Une seule sous-courbe ouverte suffit à faire fuiter la couleur : le `evenodd` d'un
 * trou non refermé peint alors tout ce qui l'entoure.
 */
export function estCheminFerme(d: string): boolean {
  const nettoye = d.trim();
  if (nettoye.length === 0) return false;
  if (!/^[Mm]/.test(nettoye)) return false;
  const sousChemins = nettoye
    .split(/(?=[Mm])/)
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0);
  return sousChemins.length > 0 && sousChemins.every((morceau) => /[Zz]$/.test(morceau));
}

/** Valeur d'un attribut sur un fragment de balise ouvrante. `null` s'il est absent. */
function attribut(balise: string, nom: string): string | null {
  const trouve = new RegExp(`\\b${nom}\\s*=\\s*"([^"]*)"`).exec(balise);
  return trouve?.[1] ?? null;
}

/**
 * Corps de chaque `<g id="…">` du SVG, indexé par `id`.
 *
 * Analyse par jetons plutôt que par expression rationnelle globale : les `<g>` peuvent
 * s'imbriquer, et une expression gloutonne rattacherait alors le contenu du mauvais calque.
 * On tient une pile ; un `<g/>` auto-fermant n'entre pas dedans.
 */
function calquesDuSvg(texteSvg: string): Map<string, string> {
  const corps = new Map<string, string>();
  const jetons = /<g\b([^>]*)>|<\/g\s*>/g;
  const pile: Array<{ id: string | null; debut: number }> = [];
  let jeton: RegExpExecArray | null;
  while ((jeton = jetons.exec(texteSvg)) !== null) {
    const attributs = jeton[1];
    if (attributs !== undefined) {
      if (attributs.trimEnd().endsWith('/')) continue;
      pile.push({ id: attribut(jeton[0], 'id'), debut: jeton.index + jeton[0].length });
      continue;
    }
    const ouvert = pile.pop();
    if (ouvert?.id != null && !corps.has(ouvert.id)) {
      corps.set(ouvert.id, texteSvg.slice(ouvert.debut, jeton.index));
    }
  }
  return corps;
}

/**
 * Contrôle un SVG de scène contre l'habillage qui le déclare. Trois règles :
 *
 * - `svg-calque-absent` — un calque déclaré n'a pas son `<g id>` dans le fichier ;
 * - `svg-region-absente` — une région déclarée n'a pas son élément dans le calque ;
 * - `svg-chemin-ouvert` — un `<path>` d'un calque **coloriable** n'est pas refermé.
 *
 * Les calques `trait` et `fond` ne sont PAS jugés sur la fermeture : le trait est fait de
 * segments ouverts par construction, et c'est correct — il n'est jamais rempli.
 *
 * Le pointeur d'un problème est `#idCalque/idRegion`, la seule adresse qui permette de
 * retrouver la forme fautive dans le fichier.
 */
export function validerSceneSvg(texteSvg: string, habillage: Habillage): RapportValidation {
  const problemes: ProblemeValidation[] = [];
  const calques = calquesDuSvg(texteSvg);

  for (const calque of habillage.scene.calques) {
    const corps = calques.get(calque.id);
    if (corps === undefined) {
      problemes.push({
        chemin: `#${calque.id}`,
        message: `Calque « ${calque.id} » déclaré par « ${habillage.id} » et absent du SVG.`,
        regle: 'svg-calque-absent',
      });
      continue;
    }

    const presents = new Set<string>();
    if (calque.role === 'coloriable') {
      for (const balise of corps.match(/<path\b[^>]*>/g) ?? []) {
        const id = attribut(balise, 'id');
        const d = attribut(balise, 'd');
        if (id !== null) presents.add(id);
        if (d !== null && !estCheminFerme(d)) {
          problemes.push({
            chemin: `#${calque.id}/${id ?? '(sans id)'}`,
            message:
              'Chemin non refermé : un trait interrompu fait fuiter le remplissage sur ' +
              'toute l’image (annexe P § 3.2).',
            regle: 'svg-chemin-ouvert',
          });
        }
      }
      // Une région peut être une forme primitive (`<circle>`, `<rect>`…), fermée d'office.
      for (const balise of corps.match(/<(?:circle|rect|ellipse|polygon)\b[^>]*>/g) ?? []) {
        const id = attribut(balise, 'id');
        if (id !== null) presents.add(id);
      }
    }

    for (const region of calque.regions) {
      if (!presents.has(region.id)) {
        problemes.push({
          chemin: `#${calque.id}/${region.id}`,
          message: `Région « ${region.id} » déclarée par « ${habillage.id} » et absente du SVG.`,
          regle: 'svg-region-absente',
        });
      }
    }
  }

  return rapport(problemes);
}
