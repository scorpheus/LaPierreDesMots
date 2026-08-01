/**
 * Les QUATRE énumérations de moteurs du dépôt, comparées entre elles — écrit à l'intégration
 * de la campagne v2.
 *
 * Ce qui a motivé ce fichier, mesuré et non supposé : `'trace'` avait été livré par L2-C comme
 * quatorzième moteur, et manquait à **trois** énumérations sur quatre. Chacune ratait pour une
 * raison différente, et aucune ne se voyait au même endroit :
 *
 *   - `partage/src/identifiants.ts` (`CodeMoteur`) — deux lots ont dû poser un transtypage ;
 *   - `contenu/schemas/exercice.schema.json` — le serveur répondait **422** sur le nœud
 *     `galeries-01`, et `parcours-trace.spec.ts` échouait en E2E ;
 *   - `partage/src/contenu/validation.ts` — une **quatrième copie** du même schéma, recopiée
 *     du contrat et signalée comme telle dans son propre commentaire ;
 *   - `contenu/schemas/habillage.schema.json` — `galeries.tracer-cristal` était le seul
 *     habillage sur 36 refusé par son schéma.
 *
 * C'est la leçon de CLAUDE.md « auditer les OBJETS, jamais les occurrences » appliquée à une
 * énumération : chercher `trace` dans un fichier ne dit rien des trois autres. Le seul contrôle
 * qui tienne est de **comparer les listes entre elles**, et d'exiger que le registre des
 * moteurs réellement enregistrés soit celui qui fait foi.
 *
 * Ce test ne fabrique aucune liste : il lit les quatre sources.
 */
import { describe, expect, it } from 'vitest';

import { initialiserRegistreMoteurs, moteursEnregistres } from '@pierre/partage';
import { SCHEMA_EXERCICE } from '@pierre/partage/validation';

import { lireJson } from '../configuration/preparation.js';

initialiserRegistreMoteurs();

/** Le registre fait foi : un moteur enregistré est un moteur jouable. */
const CODES_DU_REGISTRE: readonly string[] = [...moteursEnregistres()].sort();

interface SchemaAvecEnum {
  readonly [cle: string]: unknown;
}

/** Suit un chemin de propriétés dans un schéma JSON et rend l'`enum` qui s'y trouve. */
function enumerationA(schema: unknown, chemin: readonly string[]): readonly string[] {
  let courant: unknown = schema;
  for (const cle of chemin) {
    courant = (courant as SchemaAvecEnum | undefined)?.[cle];
  }
  const valeurs = (courant as { enum?: unknown } | undefined)?.enum;
  if (!Array.isArray(valeurs)) {
    throw new Error(`aucune énumération à ${chemin.join('/')} — le schéma a changé de forme`);
  }
  return [...(valeurs as string[])].sort();
}

const SCHEMA_EXERCICE_DISQUE = lireJson('contenu/schemas/exercice.schema.json');
const SCHEMA_HABILLAGE_DISQUE = lireJson('contenu/schemas/habillage.schema.json');
const SCHEMA_MONDE_DISQUE = lireJson('contenu/schemas/monde.schema.json');

describe('les énumérations de moteurs ne dérivent pas les unes des autres', () => {
  it('le registre contient bien les quatorze moteurs de la campagne v2', () => {
    // 13 de la v2 § 7 + `trace`, livré par L2-C (contrat des features v2 § 3.3).
    expect(CODES_DU_REGISTRE, `registre : ${CODES_DU_REGISTRE.join(', ')}`).toHaveLength(14);
    expect(CODES_DU_REGISTRE).toContain('trace');
  });

  it('`contenu/schemas/exercice.schema.json` liste exactement les moteurs du registre', () => {
    expect(
      enumerationA(SCHEMA_EXERCICE_DISQUE, ['properties', 'jeu', 'properties', 'moteur'])
    ).toEqual(CODES_DU_REGISTRE);
  });

  it('la copie inline de `partage/src/contenu/validation.ts` ne dérive pas du fichier', () => {
    // Duplication connue et signalée dans `validation.ts` : `partage/` ne peut pas lire le
    // disque côté navigateur. Tant que les deux copies existent, elles sont comparées.
    expect(
      enumerationA(SCHEMA_EXERCICE, ['properties', 'jeu', 'properties', 'moteur'])
    ).toEqual(CODES_DU_REGISTRE);
  });

  it('`contenu/schemas/habillage.schema.json` liste exactement les moteurs du registre', () => {
    expect(enumerationA(SCHEMA_HABILLAGE_DISQUE, ['properties', 'moteurs', 'items'])).toEqual(
      CODES_DU_REGISTRE
    );
  });

  it('`contenu/schemas/monde.schema.json` liste exactement les moteurs du registre', () => {
    expect(enumerationA(SCHEMA_MONDE_DISQUE, ['$defs', 'codeMoteur'])).toEqual(CODES_DU_REGISTRE);
  });
});
