/**
 * Les quatre compagnons à rallier — v2 § 4.3. Lot L2-F.
 *
 * « Avant une mission, l'enfant choisit qui l'accompagne. Le compagnon modifie l'habillage, les
 * répliques et le type d'aide disponible. Même contenu pédagogique, expérience différente :
 * c'est le levier le plus économique pour lutter contre la répétition. »
 *
 * Ce module ne décide rien de pédagogique : il lit le référentiel et rend « ce que le compagnon
 * change », c'est-à-dire les moteurs qu'il met en avant. Le sélecteur de L2-D en fait ce qu'il
 * veut ; ici il n'y a ni pondération ni seuil (convention C2).
 *
 * `CodeCompagnon` vient de `@pierre/partage/pedagogie` (L2-D) : **les quatre compagnons sont
 * nommés une seule fois dans le dépôt**, et ce n'est pas ici.
 */

import { ErreurPierre } from '../erreurs.js';
import type { CheminAsset, CodeMoteur, CodeRegion, Horodatage } from '../identifiants.js';
import type { CodeCompagnon } from '../pedagogie/types.js';
import type { Compagnon } from './types.js';

/** Un compagnon DÉCLARÉ au référentiel, sans la date à laquelle CE profil l'a rallié. */
export interface DefinitionCompagnon {
  readonly code: CodeCompagnon;
  readonly libelle: string;
  readonly valeur: string;
  readonly domaine: string;
  readonly region: CodeRegion;
  readonly asset: CheminAsset;
  /** Ce que le compagnon change : les moteurs qu'il met en avant (v2 § 4.3). */
  readonly moteursFavorises: readonly CodeMoteur[];
  readonly replique: CheminAsset | null;
}

function objet(valeur: unknown, quoi: string): Readonly<Record<string, unknown>> {
  if (typeof valeur !== 'object' || valeur === null) {
    throw new ErreurPierre('contenu-invalide', `${quoi} n’est pas un objet.`);
  }
  return valeur as Readonly<Record<string, unknown>>;
}

/** Lit les compagnons du référentiel, et refuse plutôt que d'émettre du faux (C4). */
export function compagnonsDuDocument(document: unknown): readonly DefinitionCompagnon[] {
  const liste = objet(document, 'Le document des compagnons')['compagnons'];
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurPierre('contenu-invalide', 'Le document des compagnons n’en déclare aucun.');
  }

  const definitions = liste.map((entree, index) => {
    const champs = objet(entree, `Le compagnon ${String(index)}`);
    const replique = champs['replique'];
    return {
      code: String(champs['code'] ?? '') as CodeCompagnon,
      libelle: String(champs['libelle'] ?? ''),
      valeur: String(champs['valeur'] ?? ''),
      domaine: String(champs['domaine'] ?? ''),
      region: String(champs['region'] ?? '') as CodeRegion,
      asset: String(champs['asset'] ?? '') as CheminAsset,
      moteursFavorises: (Array.isArray(champs['moteursFavorises'])
        ? champs['moteursFavorises'].map((moteur) => String(moteur))
        : []) as readonly CodeMoteur[],
      replique: typeof replique === 'string' && replique !== '' ? (replique as CheminAsset) : null
    };
  });

  // Deux compagnons au bout de la même région : l'enfant n'en rallierait qu'un, en silence.
  const regions = definitions.map((definition) => String(definition.region));
  if (new Set(regions).size !== regions.length) {
    throw new ErreurPierre(
      'contenu-invalide',
      'Deux compagnons sont rattachés à la même région : chacun est rencontré au bout d’UNE ' +
        'région (v2 § 4.3).'
    );
  }

  return definitions;
}

/** La région où chaque compagnon se rallie. Sert à annoter la carte. */
export function compagnonParRegion(
  definitions: readonly DefinitionCompagnon[],
): ReadonlyMap<CodeRegion, CodeCompagnon> {
  return new Map(definitions.map((definition) => [definition.region, definition.code]));
}

/** Le compagnon qu'on rencontre au bout de cette région, `null` s'il n'y en a aucun. */
export function compagnonDeLaRegion(
  definitions: readonly DefinitionCompagnon[],
  region: CodeRegion,
): DefinitionCompagnon | null {
  return definitions.find((definition) => definition.region === region) ?? null;
}

/**
 * Les compagnons tels que CE profil les voit : ralliés avec leur date, à rallier sinon.
 *
 * Un compagnon non rallié n'est pas caché — il est visible et grisé, comme le reste du monde.
 * C'est la même règle que le voile de Grisaille : ce qui reste à faire se montre.
 */
export function compagnonsDuProfil(
  definitions: readonly DefinitionCompagnon[],
  rallies: ReadonlyMap<CodeCompagnon, Horodatage>,
): readonly Compagnon[] {
  return definitions.map((definition) => ({
    code: definition.code,
    libelle: definition.libelle,
    valeur: definition.valeur,
    domaine: definition.domaine,
    region: definition.region,
    asset: definition.asset,
    rallieLe: rallies.get(definition.code) ?? null
  }));
}

/** Les moteurs que ce compagnon met en avant. Vide quand aucun compagnon n'accompagne. */
export function moteursFavorises(compagnon: DefinitionCompagnon | null): readonly CodeMoteur[] {
  return compagnon === null ? [] : compagnon.moteursFavorises;
}
