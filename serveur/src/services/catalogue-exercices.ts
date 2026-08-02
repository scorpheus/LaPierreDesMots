/**
 * Le catalogue d'exercices de la galerie parent — D34, lot N5.
 *
 * « Galerie parent : **tout exercice lançable**, RIEN de journalisé, invisible côté enfant. »
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SERVICE LIT LE DISQUE ET NON `DepotContenu`
 *
 * `DepotContenu` est le dépôt du JEU : il indexe ce qu'un enfant peut atteindre, et il ne
 * connaît **pas** le chemin du fichier dont il tient chaque objet — il n'en a pas besoin.
 * La galerie parent a besoin des deux choses qu'il ne porte pas :
 *
 *   1. **le chemin sur disque**, exigé par `EntreeGalerie.chemin` : c'est l'écran de
 *      relecture de l'annexe P § 6.3. Un parent qui lit un titre sans savoir quel fichier il
 *      juge ne peut ni le corriger, ni le rejeter en connaissance de cause ;
 *   2. **l'exhaustivité indépendante de la composition de l'application** : un dépôt en
 *      mémoire monté avec trois exercices rendrait une galerie de trois exercices, et le
 *      « 100 % lançables » du contrat de sortie serait vrai de trois sur deux cents.
 *
 * Le prix de ce choix est assumé et nommé : ce service fait de l'entrée-sortie, donc il est
 * asynchrone, donc il relit le disque à chaque appel. C'est correct ici — la galerie s'ouvre
 * une fois par visite du parent, et un contenu déposé pendant la visite doit apparaître sans
 * qu'on redémarre quoi que ce soit, exactement comme `synchroniserBrouillons`.
 *
 * TOUT CE QUI SE RAISONNE EST AILLEURS : `construireCatalogue`, `indexerMoteursParCompetence`
 * et `indexerHabillagesParMoteur` sont dans `partage/src/parent/galerie.ts`, purs, testables
 * sans monter une application ni ouvrir une base. Ce fichier ne fait que les nourrir.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type {
  CodeCompetence,
  CodeMoteur,
  CodeRegion,
  IdExercice,
  IdHabillage,
  IdNoeud
} from '@pierre/partage';
import type { CatalogueGalerie, EntreeGalerie, StatutValidation } from '@pierre/partage/parent';
import { construireCatalogue } from '@pierre/partage/parent';

import { listerRelecture } from '../depots/parent.js';

/** Forme minimale attendue d'un JSON d'exercice. Rien n'est supposé au-delà. */
interface ExerciceLu {
  readonly id?: unknown;
  readonly titre?: unknown;
  readonly competences?: unknown;
  readonly jeu?: {
    readonly moteur?: unknown;
    readonly habillage?: unknown;
    readonly noeud?: unknown;
  };
}

interface NoeudLu {
  readonly id?: unknown;
  readonly region?: unknown;
}

interface FichierJson {
  /** Chemin relatif à la racine du dépôt, séparateurs `/`, quel que soit le système. */
  readonly relatif: string;
  readonly objet: unknown;
}

/**
 * Construit le catalogue complet.
 *
 * `racineContenu` est le dossier `contenu/` absolu ; `racineDepot` sert à rendre les chemins
 * relatifs au dépôt — c'est sous cette forme que la file de relecture les stocke déjà
 * (`contenu/brouillons/…`), et deux conventions de chemin dans la même zone parent seraient
 * une divergence de plus à surveiller.
 */
export async function construireCatalogueExercices(
  base: DatabaseSync,
  racineDepot: string,
  racineContenu: string
): Promise<CatalogueGalerie> {
  const [fichiersExercices, fichiersNoeuds] = await Promise.all([
    listerJson(path.join(racineContenu, 'exercices'), racineDepot),
    listerJson(path.join(racineContenu, 'noeuds'), racineDepot)
  ]);

  const regionParNoeud = indexerRegions(fichiersNoeuds);
  const statutParExercice = indexerStatuts(base);

  const entrees: EntreeGalerie[] = [];
  for (const fichier of fichiersExercices) {
    const entree = versEntree(fichier, regionParNoeud, statutParExercice);
    if (entree !== null) {
      entrees.push(entree);
    }
  }

  // AUCUN FILTRE, ET IL N'Y A NULLE PART OÙ EN ÉCRIRE UN : `construireCatalogue` ne prend
  // aucun critère. C'est la propriété n° 1 de D34, tenue par la forme de la signature.
  return construireCatalogue(entrees);
}

/**
 * Le statut de validation d'un exercice.
 *
 * **`livre` est la valeur par défaut, et c'est un fait, pas une commodité** : un fichier posé
 * dans `contenu/exercices/` y est arrivé par la relecture parent — « aucune écriture directe
 * dans `contenu/exercices/` » (CLAUDE.md), « aucun contenu n'atteint l'enfant sans validation
 * humaine ». Un exercice encore dans la file porte, lui, le statut que la file lui donne.
 */
function indexerStatuts(base: DatabaseSync): ReadonlyMap<string, StatutValidation> {
  const index = new Map<string, StatutValidation>();
  for (const entree of listerRelecture(base)) {
    index.set(String(entree.exercice), entree.statut);
  }
  return index;
}

function indexerRegions(fichiers: readonly FichierJson[]): ReadonlyMap<string, CodeRegion> {
  const index = new Map<string, CodeRegion>();
  for (const { objet } of fichiers) {
    const noeud = objet as NoeudLu;
    if (typeof noeud.id === 'string' && typeof noeud.region === 'string') {
      index.set(noeud.id, noeud.region as CodeRegion);
    }
  }
  return index;
}

function versEntree(
  fichier: FichierJson,
  regionParNoeud: ReadonlyMap<string, CodeRegion>,
  statutParExercice: ReadonlyMap<string, StatutValidation>
): EntreeGalerie | null {
  const exercice = fichier.objet as ExerciceLu;
  const id = typeof exercice.id === 'string' ? exercice.id : '';
  if (id === '') {
    // Le nom du fichier ne fait jamais autorité (`depot-contenu-disque.ts`). Un JSON sans `id`
    // n'est pas un exercice ; il n'entre pas au catalogue et n'en fait pas échouer la lecture.
    return null;
  }

  const jeu = exercice.jeu ?? {};
  const noeud = typeof jeu.noeud === 'string' ? (jeu.noeud as IdNoeud) : null;

  return {
    exercice: id as IdExercice,
    titre: typeof exercice.titre === 'string' && exercice.titre !== '' ? exercice.titre : id,
    moteur: (typeof jeu.moteur === 'string' ? jeu.moteur : 'inconnu') as CodeMoteur,
    habillage: (typeof jeu.habillage === 'string' ? jeu.habillage : '') as IdHabillage,
    competences: Array.isArray(exercice.competences)
      ? exercice.competences.filter((c): c is string => typeof c === 'string').map((c) => c as CodeCompetence)
      : [],
    statut: statutParExercice.get(id) ?? 'livre',
    // La région vient du NŒUD porteur, jamais du nom du dossier : un exercice rangé ailleurs
    // reste de sa région, et un exercice sans nœud n'en invente pas une.
    region: noeud === null ? null : (regionParNoeud.get(noeud) ?? null),
    chemin: fichier.relatif
  };
}

/** Balayage récursif, tolérant à l'absence du dossier, dans un ordre stable entre machines. */
async function listerJson(dossier: string, racineDepot: string): Promise<readonly FichierJson[]> {
  const entrees = await readdir(dossier, { withFileTypes: true }).then(
    (valeur) => valeur,
    () => null
  );
  if (entrees === null) {
    return [];
  }

  const trouves: FichierJson[] = [];
  for (const entree of [...entrees].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) {
      trouves.push(...(await listerJson(complet, racineDepot)));
      continue;
    }
    if (!entree.isFile() || !entree.name.endsWith('.json')) {
      continue;
    }
    try {
      const objet = JSON.parse(await readFile(complet, 'utf8')) as unknown;
      trouves.push({
        relatif: path.relative(racineDepot, complet).split(path.sep).join('/'),
        objet
      });
    } catch {
      // Un JSON cassé ne doit pas vider la galerie du parent. `npm run test:contenu` en répond
      // — c'est précisément son rôle, et le taire ici ferait disparaître la galerie entière
      // pour une virgule.
      continue;
    }
  }
  return trouves;
}
