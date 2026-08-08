/**
 * Depot des profils : lecture, creation, mise a jour du dernier acces.
 *
 * D17 : le modele multi-profils existe des la v1 meme si un seul profil est utilise.
 * `profils` est la seule table du socle qui accepte un UPDATE — `tentatives` est append-only.
 *
 * Porté sur le contrat `Base` (Docs/addendum-portage-android.md § 4) : partagé entre le serveur
 * (`node:sqlite`) et l'app Android autonome (`@capacitor-community/sqlite`).
 */

import type { CodeRegion, Horodatage, IdProfil } from '../../identifiants.js';
import type { Horloge } from '../../horloge.js';
import type { ConfigurationAvatar, Profil } from '../../api/contrats.js';
import { hacherSha256Hex } from '../hachage.js';
import type { Base } from '../contrat.js';

/** Variante de palette par defaut : la premiere region de la progression (v2 § 3.3). */
export const PALETTE_VARIANTE_PAR_DEFAUT = 'clairiere';

/** Une ligne de la table `profils`. */
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
async function deriverIdentifiant(base: Base, prenom: string, creeLe: string): Promise<IdProfil> {
  const compte = await base.uneLigne<{ n: number }>('SELECT COUNT(*) AS n FROM profils');
  const rang = Number(compte?.n ?? 0);

  for (let essai = 0; essai < 1000; essai += 1) {
    const graine = `${prenom}|${creeLe}|${String(rang + essai)}`;
    const empreinte = await hacherSha256Hex(graine);
    const identifiant = `prf-${empreinte.slice(0, 16)}`;
    const existe = await base.uneLigne('SELECT 1 FROM profils WHERE id = ?', [identifiant]);
    if (existe === undefined) {
      return identifiant as IdProfil;
    }
  }

  throw new Error('Impossible de deriver un identifiant de profil libre apres 1000 essais.');
}

export async function listerProfils(base: Base): Promise<readonly Profil[]> {
  const lignes = await base.lignes<LigneProfil>(`SELECT ${CHAMPS} FROM profils ORDER BY cree_le, id`);
  return lignes.map(versProfil);
}

export async function lireProfil(base: Base, id: string): Promise<Profil | null> {
  const ligne = await base.uneLigne<LigneProfil>(`SELECT ${CHAMPS} FROM profils WHERE id = ?`, [id]);
  return ligne === undefined ? null : versProfil(ligne);
}

export async function profilExiste(base: Base, id: string): Promise<boolean> {
  return (await base.uneLigne('SELECT 1 FROM profils WHERE id = ?', [id])) !== undefined;
}

export async function creerProfil(
  base: Base,
  demande: DemandeCreationProfil,
  horloge: Horloge
): Promise<Profil> {
  const instant = String(horloge.maintenant());
  const prenom = demande.prenom.trim();
  const id = await deriverIdentifiant(base, prenom, instant);

  await base.lancer(`INSERT INTO profils (${CHAMPS}) VALUES (?, ?, ?, ?, ?, ?)`, [
    id,
    prenom,
    JSON.stringify(demande.avatar),
    demande.paletteVariante,
    instant,
    instant
  ]);

  const cree = await lireProfil(base, id);
  if (cree === null) {
    throw new Error(`Le profil ${id} vient d'etre insere et reste introuvable.`);
  }
  return cree;
}

/** Met a jour `dernier_acces_le`. Sans effet si le profil n'existe pas. */
export async function toucherProfil(base: Base, id: string, horloge: Horloge): Promise<void> {
  await base.lancer('UPDATE profils SET dernier_acces_le = ? WHERE id = ?', [
    String(horloge.maintenant()),
    id
  ]);
}
