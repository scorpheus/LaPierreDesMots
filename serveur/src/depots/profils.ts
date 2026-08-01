/**
 * Depot des profils : lecture, creation, mise a jour du dernier acces.
 *
 * D17 : le modele multi-profils existe des la v1 meme si un seul profil est utilise.
 * `profils` est la seule table du socle qui accepte un UPDATE — `tentatives` est append-only.
 */

import { createHash } from 'node:crypto';

import type { DatabaseSync } from 'node:sqlite';

import type {
  ConfigurationAvatar,
  CodeRegion,
  Horloge,
  Horodatage,
  IdProfil,
  Profil
} from '@pierre/partage';

import { horodatage } from '../configuration.js';

/** Variante de palette par defaut : la premiere region de la progression (v2 § 3.3). */
export const PALETTE_VARIANTE_PAR_DEFAUT = 'clairiere';

/** Une ligne de la table `profils`, telle que `node:sqlite` la rend. */
interface LigneProfil {
  readonly id: string;
  readonly prenom: string;
  readonly avatar_json: string;
  readonly palette_variante: string;
  readonly cree_le: string;
  readonly dernier_acces_le: string;
}

/** Ce que le client peut envoyer sur `POST /api/profils`, avant toute validation. */
export interface DemandeCreationProfil {
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  readonly paletteVariante: string;
}

const CHAMPS = 'id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le';

/**
 * Un `avatar_json` illisible ne doit pas faire tomber la liste des profils : l'enfant verrait un
 * ecran vide au lieu de son prenom. On rend un objet vide et le profil reste jouable.
 */
function analyserAvatar(json: string): ConfigurationAvatar {
  try {
    return JSON.parse(json) as ConfigurationAvatar;
  } catch {
    return {} as ConfigurationAvatar;
  }
}

function versProfil(ligne: LigneProfil): Profil {
  return {
    id: String(ligne.id) as IdProfil,
    prenom: String(ligne.prenom),
    avatar: analyserAvatar(String(ligne.avatar_json)),
    paletteVariante: String(ligne.palette_variante) as CodeRegion,
    creeLe: String(ligne.cree_le) as Horodatage,
    dernierAccesLe: String(ligne.dernier_acces_le) as Horodatage
  };
}

/**
 * Identifiant de profil, derive et non tire au sort.
 *
 * Deux raisons de ne pas passer par `Alea` ici : la creation d'un profil n'est pas un evenement
 * de jeu (aucune reproductibilite de partie n'en depend), et une derivation est stable sous
 * horloge figee — deux tests qui creent « Marius » a la meme seconde obtiennent quand meme deux
 * identifiants distincts, grace au rang. Un tirage aleatoire sous graine fixe, lui, collisionne.
 */
function deriverIdentifiant(base: DatabaseSync, prenom: string, creeLe: string): IdProfil {
  const compte = base.prepare('SELECT COUNT(*) AS n FROM profils').get() as unknown as { n: number };
  const rang = Number(compte.n);

  for (let essai = 0; essai < 1000; essai += 1) {
    const graine = `${prenom}|${creeLe}|${String(rang + essai)}`;
    const identifiant = `prf-${createHash('sha256').update(graine, 'utf8').digest('hex').slice(0, 16)}`;
    const existe = base.prepare('SELECT 1 FROM profils WHERE id = ?').get(identifiant);
    if (existe === undefined) {
      return identifiant as IdProfil;
    }
  }

  throw new Error('Impossible de deriver un identifiant de profil libre apres 1000 essais.');
}

export function listerProfils(base: DatabaseSync): readonly Profil[] {
  const lignes = base
    .prepare(`SELECT ${CHAMPS} FROM profils ORDER BY cree_le, id`)
    .all() as unknown as LigneProfil[];
  return lignes.map(versProfil);
}

export function lireProfil(base: DatabaseSync, id: string): Profil | null {
  const ligne = base.prepare(`SELECT ${CHAMPS} FROM profils WHERE id = ?`).get(id) as unknown as
    | LigneProfil
    | undefined;
  return ligne === undefined ? null : versProfil(ligne);
}

export function profilExiste(base: DatabaseSync, id: string): boolean {
  return base.prepare('SELECT 1 FROM profils WHERE id = ?').get(id) !== undefined;
}

export function creerProfil(
  base: DatabaseSync,
  demande: DemandeCreationProfil,
  horloge: Horloge
): Profil {
  const instant = String(horodatage(horloge));
  const prenom = demande.prenom.trim();
  const id = deriverIdentifiant(base, prenom, instant);

  base
    .prepare(
      `INSERT INTO profils (${CHAMPS}) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      prenom,
      JSON.stringify(demande.avatar),
      demande.paletteVariante,
      instant,
      instant
    );

  const cree = lireProfil(base, id);
  if (cree === null) {
    throw new Error(`Le profil ${id} vient d'etre insere et reste introuvable.`);
  }
  return cree;
}

/** Met a jour `dernier_acces_le`. Sans effet si le profil n'existe pas. */
export function toucherProfil(base: DatabaseSync, id: string, horloge: Horloge): void {
  base
    .prepare('UPDATE profils SET dernier_acces_le = ? WHERE id = ?')
    .run(String(horodatage(horloge)), id);
}
