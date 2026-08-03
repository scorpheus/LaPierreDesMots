/**
 * `DepotContenu` adosse au dossier `contenu/` du depot.
 *
 * Frontiere de FICHIERS avec L-F (contrat § 11.3) : rien n'est importe de L-F, tout est lu sur
 * disque. Le nom du fichier ne fait jamais autorite — c'est le champ `id` a l'interieur du JSON
 * qui identifie l'objet. `contenu/exercices/clairiere/ecole-01.json` porte l'identifiant
 * `clairiere-ecole-01` : indexer par nom de fichier ne le trouverait jamais.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type {
  Competence,
  Exercice,
  Habillage,
  Noeud
} from '@pierre/partage';
import type { DepotContenu } from '@pierre/partage';

interface Index {
  readonly exercices: Map<string, Exercice>;
  readonly noeuds: Map<string, Noeud>;
  readonly habillages: Map<string, Habillage>;
}

async function listerJsonRecursif(racine: string): Promise<readonly string[]> {
  // Un dossier absent n'est pas une erreur : `contenu/` peut n'avoir aucun habillage encore.
  const entrees = await readdir(racine, { withFileTypes: true }).then(
    (valeur) => valeur,
    () => null
  );
  if (entrees === null) {
    return [];
  }

  const trouves: string[] = [];
  for (const entree of entrees) {
    const complet = path.join(racine, entree.name);
    if (entree.isDirectory()) {
      trouves.push(...(await listerJsonRecursif(complet)));
    } else if (entree.isFile() && entree.name.endsWith('.json')) {
      trouves.push(complet);
    }
  }
  // Ordre stable quel que soit le systeme de fichiers : deux machines lisent le meme contenu.
  trouves.sort();
  return trouves;
}

async function lireJson(chemin: string): Promise<unknown> {
  const texte = await readFile(chemin, 'utf8');
  return JSON.parse(texte) as unknown;
}

function identifiantDe(objet: unknown): string | null {
  if (typeof objet !== 'object' || objet === null) {
    return null;
  }
  const brut = (objet as { id?: unknown }).id;
  return typeof brut === 'string' && brut !== '' ? brut : null;
}

/**
 * Depot de contenu sur disque, avec index construit paresseusement.
 *
 * L'index est bati au premier acces puis conserve : le contenu ne bouge pas pendant qu'un enfant
 * joue. `rafraichir()` le jette, ce dont l'ingestion (L-F) et les tests ont besoin.
 */
class DepotContenuDisque {
  readonly #racine: string;
  #index: Index | null = null;

  constructor(racine: string) {
    this.#racine = racine;
  }

  async #construireIndex(): Promise<Index> {
    const index: Index = {
      exercices: new Map<string, Exercice>(),
      noeuds: new Map<string, Noeud>(),
      habillages: new Map<string, Habillage>()
    };

    const paires: readonly [string, Map<string, unknown>][] = [
      [path.join(this.#racine, 'exercices'), index.exercices as unknown as Map<string, unknown>],
      [path.join(this.#racine, 'noeuds'), index.noeuds as unknown as Map<string, unknown>],
      [path.join(this.#racine, 'habillages'), index.habillages as unknown as Map<string, unknown>]
    ];

    for (const [dossier, cible] of paires) {
      for (const fichier of await listerJsonRecursif(dossier)) {
        let objet: unknown;
        try {
          objet = await lireJson(fichier);
        } catch {
          // Un JSON casse ne doit pas empecher le reste du contenu de se charger. Il sera
          // signale par `npm run test:contenu`, dont c'est precisement le role (contrat § 9.8).
          continue;
        }
        const id = identifiantDe(objet);
        if (id !== null) {
          cible.set(id, objet);
        }
      }
    }

    return index;
  }

  async #obtenirIndex(): Promise<Index> {
    this.#index ??= await this.#construireIndex();
    return this.#index;
  }

  /** Jette l'index : le prochain acces relit le disque. */
  rafraichir(): void {
    this.#index = null;
  }

  async chargerExercice(id: string): Promise<Exercice | null> {
    const index = await this.#obtenirIndex();
    return index.exercices.get(id) ?? null;
  }

  async chargerNoeud(id: string): Promise<Noeud | null> {
    const index = await this.#obtenirIndex();
    return index.noeuds.get(id) ?? null;
  }

  async chargerHabillage(id: string): Promise<Habillage | null> {
    const index = await this.#obtenirIndex();
    return index.habillages.get(id) ?? null;
  }

  async listerNoeuds(): Promise<readonly Noeud[]> {
    const index = await this.#obtenirIndex();
    return [...index.noeuds.values()];
  }

  async listerExercices(): Promise<readonly Exercice[]> {
    const index = await this.#obtenirIndex();
    return [...index.exercices.values()];
  }

  /**
   * Le référentiel de compétences, lu sur disque.
   *
   * ══════════════════════════════════════════════════════════════════════════════════════
   * LE DÉFAUT QUE CETTE MÉTHODE FERME, mesuré en jouant et non en lisant.
   *
   * `listerCompetences` est FACULTATIF au contrat (`partage/src/fournisseurs/depot-contenu.ts`
   * : « optionnel pour ne rien casser chez qui ne l'expose pas »). Ce dépôt ne l'exposait pas.
   * `POST /api/profils/:id/sortie` fait alors `competences = []`, et `composerSortie` juge
   * chaque code par `competenceEligible`, qui commence par :
   *
   *     const competence = parRef.get(code);
   *     if (competence === undefined) return false;
   *
   * Référentiel vide ⇒ **aucune compétence n'est éligible ⇒ aucun nœud n'est candidat ⇒ la
   * route refuse, dans les six régions, pour tout profil, toujours.** Mesuré sur un serveur
   * réel (`PIERRE_CONTENU=contenu`), profil neuf, les six régions demandées une par une :
   *
   *     Impossible de composer une sortie dans « clairiere » : 0 nœud(s) éligible(s) …
   *     … et la même phrase pour galeries, marais-jumeau, foret-muette, volcan, cité.
   *
   * Aucune suite ne le voyait, et il faut dire pourquoi : `tests/api/sortie.test.ts` monte
   * `DepotContenuMemoire`, qui EXPOSE la méthode et reçoit le référentiel ; les E2E ne passent
   * pas par cette route ; et aucun écran du client ne l'appelle encore — `composerSortie` est
   * exporté par `client/src/api/client.ts` et n'a pas de consommateur. Le défaut était donc
   * dormant, et il se serait réveillé le jour où un écran aurait branché la route : un « Partir
   * en sortie » qui répond 409 est un état sans issue, le pire défaut possible ici (R14).
   *
   * Le fichier est lu à CHAQUE appel, sans index : c'est une centaine de lignes de JSON, lue
   * une fois par composition de sortie, là où l'index des exercices sert à chaque battement.
   * Un dossier ou un fichier absent rend `[]` — le même comportement qu'avant, pas une
   * exception : un serveur qui refuserait de démarrer parce que le référentiel manque serait
   * plus dur à réparer que celui qui compose des sorties sans prérequis.
   * ══════════════════════════════════════════════════════════════════════════════════════
   */
  async listerCompetences(): Promise<readonly Competence[]> {
    try {
      const brut = await lireJson(path.join(this.#racine, 'referentiel', 'competences.json'));
      return Array.isArray(brut) ? (brut as readonly Competence[]) : [];
    } catch {
      return [];
    }
  }

  /** Lit un asset (SVG, image, audio) sous `contenu/`. `null` si absent ou hors du dossier. */
  async lireAsset(chemin: string): Promise<Uint8Array | null> {
    const resolu = resoudreSousRacine(this.#racine, chemin);
    if (resolu === null) {
      return null;
    }
    try {
      return await readFile(resolu);
    } catch {
      return null;
    }
  }
}

/**
 * Resout un chemin relatif SOUS `racine`, ou rend `null`.
 *
 * Garde-fou de traversee : `../../..` et les chemins absolus sont refuses. Le serveur ecoute sur
 * toutes les interfaces du LAN — une route de fichiers sans cette garde sert le disque entier.
 */
export function resoudreSousRacine(racine: string, relatif: string): string | null {
  const nettoye = relatif.replace(/^[/\\]+/, '');
  if (nettoye === '' || nettoye.includes('\0')) {
    return null;
  }
  const racineResolue = path.resolve(racine);
  const resolu = path.resolve(racineResolue, nettoye);
  const prefixe = racineResolue.endsWith(path.sep) ? racineResolue : racineResolue + path.sep;
  return resolu === racineResolue || resolu.startsWith(prefixe) ? resolu : null;
}

/** Construit le depot de contenu servi depuis `racine` (typiquement `<depot>/contenu`). */
export function creerDepotContenuDisque(racine: string): DepotContenu {
  return new DepotContenuDisque(racine);
}
