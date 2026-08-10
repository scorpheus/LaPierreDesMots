/**
 * Synchronisation de la file de relecture avec `contenu/brouillons/` — extrait de l'ex-
 * `depots/parent.ts` lors du portage Android (Docs/addendum-portage-android.md § 3).
 *
 * `node:fs` est SERVEUR-SEUL, et ce geste l'est doublement : balayer les brouillons déposés par
 * un agent est une opération d'AUTEUR sur le PC, pas un besoin de l'app Android autonome que
 * l'enfant joue. Elle reste donc hors de `@pierre/partage/base`, contre un `Base` déjà ouvert.
 *
 * C'est la frontiere L2-G → L2-H du contrat § 5.1 : « les brouillons alimentent la file de
 * relecture du dashboard ». Elle est de FICHIERS, pas de symboles — d'ou ce balayage.
 *
 * Trois choix, chacun pour une raison :
 * - le dossier peut etre absent (il est ignore par git) : c'est un cas normal, pas une erreur ;
 * - `ON CONFLICT DO NOTHING` : une entree deja tranchee n'est jamais rouverte ;
 * - l'identifiant d'exercice est le nom du fichier. On ne devine jamais.
 *
 * Rend le nombre d'entrees NOUVELLES, pour que l'appelant puisse le mesurer.
 */

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Base } from '@pierre/partage/base';
import type { Horodatage } from '@pierre/partage';

/** Balayage recursif, tolerant a l'absence du dossier. Les manifestes ne sont pas des exercices. */
function fichiersJson(racine: string): readonly string[] {
  let entrees: readonly string[];
  try {
    if (!statSync(racine).isDirectory()) {
      return [];
    }
    entrees = readdirSync(racine);
  } catch {
    return [];
  }

  const trouves: string[] = [];
  for (const nom of [...entrees].sort()) {
    const complet = path.join(racine, nom);
    let estDossier = false;
    try {
      estDossier = statSync(complet).isDirectory();
    } catch {
      continue;
    }
    if (estDossier) {
      trouves.push(...fichiersJson(complet));
    } else if (nom.endsWith('.json') && nom !== 'manifeste.json') {
      trouves.push(complet);
    }
  }
  return trouves;
}

export async function synchroniserBrouillons(
  base: Base,
  racineBrouillons: string,
  maintenant: Horodatage
): Promise<number> {
  const fichiers = fichiersJson(racineBrouillons);
  if (fichiers.length === 0) {
    return 0;
  }

  const sql = `INSERT INTO relecture_contenu (exercice_id, chemin, statut, deposee_le, traitee_le, motif)
     VALUES (?, ?, 'en-attente', ?, NULL, NULL)
     ON CONFLICT (exercice_id) DO NOTHING`;

  let nouvelles = 0;
  for (const fichier of fichiers) {
    const relatif = path.relative(racineBrouillons, fichier).split(path.sep).join('/');
    const identifiant = path.basename(fichier, '.json');
    const resultat = await base.lancer(sql, [identifiant, `contenu/brouillons/${relatif}`, String(maintenant)]);
    nouvelles += resultat.changements;
  }
  return nouvelles;
}
