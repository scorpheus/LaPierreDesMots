/**
 * Configuration du serveur : lecture de l'environnement et chemins absolus.
 *
 * Ce fichier porte aussi les deux utilitaires transverses du lot L-C — `horodatage` et
 * `erreurApi` — pour une raison de conception assumee : ils sont les DEUX seuls points ou le
 * serveur touche a un symbole partage dont le contrat gele ne publie pas le code
 * (`Horloge.maintenant` et `ErreurApi`). Les concentrer ici fait que toute divergence avec L-B
 * se corrige en un seul endroit au lieu de douze sites d'appel disperses dans les routes.
 * `configuration.ts` est le seul fichier du lot que tous les autres peuvent importer sans creer
 * de cycle avec `application.ts`.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Alea,
  DepotContenu,
  ErreurApi,
  Horloge,
  Horodatage
} from '@pierre/partage';
import type { Base } from '@pierre/partage/base';

/**
 * Racine du depot, absolue.
 *
 * `import.meta.url` vaut `<racine>/serveur/src/configuration.ts` en source et
 * `<racine>/serveur/dist/configuration.js` une fois construit : les deux sont a la meme
 * profondeur, donc `../../` designe la racine dans les deux cas.
 */
export const RACINE_DEPOT: string = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Port par defaut, contrat technique § 0. */
export const PORT_PAR_DEFAUT = 8080;

/** Toutes les interfaces : le jeu se joue depuis la tablette, sur le LAN. */
export const HOTE_PAR_DEFAUT = '0.0.0.0';

/** Graine de repli quand `ATELIER_GRAINE` est absent de l'environnement. */
export const GRAINE_PAR_DEFAUT = 20260801;

export interface Configuration {
  readonly port: number;
  readonly hote: string;
  readonly graine: number;
  /** Racine du depot, absolue. */
  readonly racineDepot: string;
  /** Fichier SQLite, absolu. `:memory:` est accepte tel quel. */
  readonly cheminBase: string;
  /** Dossier `contenu/`, absolu. */
  readonly racineContenu: string;
  /** Dossier `serveur/migrations/`, absolu. */
  readonly dossierMigrations: string;
  /** Dossier du client bati, absolu, ou `null` s'il n'y en a aucun. */
  readonly racineClient: string | null;
}

/**
 * Contexte injecte aux routes.
 *
 * C'est `OptionsApplication` prive de `racineClient` : le service statique n'est pas une route.
 * Le type est declare ici et non dans `application.ts` pour que les routes ne dependent pas de
 * la racine de composition qui les enregistre (ce serait un cycle d'import).
 */
export interface ContexteServeur {
  readonly base: Base;
  readonly contenu: DepotContenu;
  readonly horloge: Horloge;
  readonly alea: Alea;
}

function nombreOuDefaut(valeur: string | undefined, defaut: number): number {
  if (valeur === undefined || valeur.trim() === '') {
    return defaut;
  }
  const analyse = Number.parseInt(valeur, 10);
  return Number.isFinite(analyse) ? analyse : defaut;
}

function texteOuDefaut(valeur: string | undefined, defaut: string): string {
  const nettoye = valeur === undefined ? '' : valeur.trim();
  return nettoye === '' ? defaut : nettoye;
}

function cheminOuDefaut(valeur: string | undefined, defaut: string): string {
  if (valeur === undefined || valeur.trim() === '') {
    return defaut;
  }
  if (valeur === ':memory:') {
    return valeur;
  }
  return path.isAbsolute(valeur) ? valeur : path.resolve(RACINE_DEPOT, valeur);
}

/**
 * Choisit le dossier du client bati.
 *
 * `client/dist` (production) l'emporte sur `client/dist-test` : les deux dossiers ne se croisent
 * jamais (contrat § 7.3), mais si les deux existent c'est la production qu'on sert.
 */
function trouverRacineClient(valeur: string | undefined): string | null {
  if (valeur !== undefined && valeur.trim() !== '') {
    const explicite = path.isAbsolute(valeur) ? valeur : path.resolve(RACINE_DEPOT, valeur);
    return existsSync(explicite) ? explicite : null;
  }
  const production = path.join(RACINE_DEPOT, 'client', 'dist');
  if (existsSync(path.join(production, 'index.html'))) {
    return production;
  }
  const test = path.join(RACINE_DEPOT, 'client', 'dist-test');
  if (existsSync(path.join(test, 'index.html'))) {
    return test;
  }
  return null;
}

/**
 * Lit la configuration depuis l'environnement. Aucun effet de bord, aucune ecriture disque.
 *
 * Variables lues : `PIERRE_PORT`, `PIERRE_HOTE`, `PIERRE_BASE`, `PIERRE_CONTENU`,
 * `PIERRE_CLIENT`, `ATELIER_GRAINE`.
 */
export function lireConfiguration(env: Record<string, string | undefined> = process.env): Configuration {
  return {
    port: nombreOuDefaut(env['PIERRE_PORT'], PORT_PAR_DEFAUT),
    hote: texteOuDefaut(env['PIERRE_HOTE'], HOTE_PAR_DEFAUT),
    graine: nombreOuDefaut(env['ATELIER_GRAINE'], GRAINE_PAR_DEFAUT),
    racineDepot: RACINE_DEPOT,
    cheminBase: cheminOuDefaut(env['PIERRE_BASE'], path.join(RACINE_DEPOT, 'donnees', 'pierre.db')),
    racineContenu: cheminOuDefaut(env['PIERRE_CONTENU'], path.join(RACINE_DEPOT, 'contenu')),
    dossierMigrations: path.join(RACINE_DEPOT, 'serveur', 'migrations'),
    racineClient: trouverRacineClient(env['PIERRE_CLIENT'])
  };
}

/**
 * Instant courant, sous la forme stockee en base (colonnes `TEXT` `*_le`).
 *
 * Le serveur n'appelle jamais `Date.now()` ni `new Date()` : annexe T § 2.2, « tout passe par
 * `Horloge.maintenant()` ». C'est le seul site d'appel du lot L-C.
 */
export function horodatage(horloge: Horloge): Horodatage {
  return horloge.maintenant();
}

/**
 * Construit le corps d'erreur normalise du contrat § 3.3 : « toute erreur repond `ErreurApi` ».
 * Seul site de construction d'une `ErreurApi` dans le lot.
 */
export function erreurApi(code: string, message: string): ErreurApi {
  return { code: code as ErreurApi['code'], message };
}

/** Codes d'erreur employes par les routes du lot L-C. */
export const CODES_ERREUR = {
  introuvable: 'introuvable',
  invalide: 'invalide',
  conflit: 'conflit',
  interne: 'interne'
} as const;
