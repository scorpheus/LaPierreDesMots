/**
 * Chargement et validation des seuils de la cascade — convention C2, D13 (lot L2-A).
 *
 * D13, en toutes lettres : « ces valeurs sont des paramètres déclarés en données, pas des
 * constantes dans le code : elles seront recalibrées ». Un seuil en dur rendrait le rejeu T2
 * aveugle au changement — on ne verrait pas qu'on a bougé la règle.
 *
 * **Validation écrite à la main, pas Ajv.** Ce module est chargé par le CLIENT (§ 4.7, table
 * « qui charge quoi ») : Ajv pèse ~120 Ko et le budget de bundle est de 250 Ko gzip (v2
 * § 13.5). Le schéma JSON existe quand même — `contenu/schemas/parametres-recompenses.schema.json` —
 * et c'est lui que `test:contenu` oppose au fichier de données. Les deux disent la même chose,
 * mais un seul entre dans le bundle.
 *
 * La fonction **LÈVE** plutôt que de rendre un défaut silencieux : un paramètre absent doit se
 * voir au démarrage, pas se deviner à la première récompense manquante.
 */

import { ErreurPierre } from '../erreurs.js';
import type { NatureRecompense, SeuilsCascade } from './types.js';

/**
 * Les trois natures de `NatureRecompense`, en valeur : la validation en a besoin.
 * `'objet-campement'` retiré par le lot A1 — voir `types.ts`, aucun palier ne peut le produire.
 */
const NATURES: readonly NatureRecompense[] = [
  'etoile',
  'forme-gobi',
  'zone-recoloriee',
];

function champ(donnees: Readonly<Record<string, unknown>>, nom: string): unknown {
  return Object.prototype.hasOwnProperty.call(donnees, nom) ? donnees[nom] : undefined;
}

function entierPositif(valeur: unknown, nom: string): number {
  if (typeof valeur !== 'number' || !Number.isInteger(valeur) || valeur < 1) {
    throw new ErreurPierre(
      'contenu-invalide',
      `parametres-recompenses.json : « ${nom} » doit être un entier supérieur ou égal à 1.`,
      { champ: nom, recu: valeur },
    );
  }
  return valeur;
}

function nature(valeur: unknown, nom: string): NatureRecompense {
  if (typeof valeur !== 'string' || !NATURES.includes(valeur as NatureRecompense)) {
    throw new ErreurPierre(
      'contenu-invalide',
      `parametres-recompenses.json : « ${nom} » doit valoir l'une de ${NATURES.join(', ')}.`,
      { champ: nom, recu: valeur },
    );
  }
  return valeur as NatureRecompense;
}

/**
 * Lit `contenu/referentiel/parametres-recompenses.json`.
 *
 * L'argument est `unknown` et non un type de fichier : c'est l'APPELANT qui décide d'où
 * viennent les octets — `readFile` au serveur, l'asset servi côté client, une fixture en test.
 * Le module ne connaît ni le disque ni le réseau, et reste donc utilisable des deux côtés.
 */
export function lireSeuilsCascade(donnees: unknown): SeuilsCascade {
  if (typeof donnees !== 'object' || donnees === null || Array.isArray(donnees)) {
    throw new ErreurPierre(
      'contenu-invalide',
      'parametres-recompenses.json : un objet est attendu.',
      { recu: donnees === null ? 'null' : typeof donnees },
    );
  }
  const brut = donnees as Readonly<Record<string, unknown>>;

  const seuils: SeuilsCascade = {
    etoilesParIntermediaire: entierPositif(
      champ(brut, 'etoilesParIntermediaire'),
      'etoilesParIntermediaire',
    ),
    intermediairesParRare: entierPositif(
      champ(brut, 'intermediairesParRare'),
      'intermediairesParRare',
    ),
    natureIntermediaire: nature(champ(brut, 'natureIntermediaire'), 'natureIntermediaire'),
    natureRare: nature(champ(brut, 'natureRare'), 'natureRare'),
  };

  // D25 point 2 : le palier rare doit être une IMAGE ou son équivalent — jamais une simple
  // étoile de plus, sinon la cascade n'a plus que deux paliers et le plus désirable disparaît.
  if (seuils.natureRare === 'etoile') {
    throw new ErreurPierre(
      'contenu-invalide',
      'parametres-recompenses.json : le palier rare ne peut pas être une étoile (D25, point 2).',
      { natureRare: seuils.natureRare },
    );
  }

  return seuils;
}
