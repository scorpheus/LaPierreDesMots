/**
 * Depot `items_leitner` — boites et echeances. Lot L2-D, v2 § 12.2.
 *
 * Projection recalculable comme les autres : elle se reconstruit integralement depuis
 * `etapes_tentative`, et c'est cette reconstruction qui prouve qu'aucune derive ne s'est
 * installee. Le calcul lui-meme n'est pas ici — il est dans `partage/src/pedagogie/leitner.ts`,
 * pur et teste par propriete. Ce fichier ne fait que lire, ecrire et rejouer.
 *
 * Les items atomiques sont les graphemes, les mots outils et les mots du mur (v2 § 12.2) :
 * concretement, l'`identifiant` de l'etape jouee.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4.
 */

import type { Horodatage } from '../../identifiants.js';
import type { ItemLeitner, NumeroBoite, ParametresPedagogie } from '../../pedagogie/types.js';
import { itemLeitnerInitial, itemsDus, promouvoir, retrograder } from '../../pedagogie/leitner.js';
import type { Base } from '../contrat.js';
import { listerEtapes } from './etapes.js';
import type { EtapeJournalisee } from './etapes.js';

/**
 * Ce qui compte comme une revue REUSSIE pour le Leitner : aboutie sans erreur ET sans aide.
 *
 * Un seul endroit, et les DEUX chemins l'appellent — l'incremental de `depots/tentatives.ts` et
 * le recalcul integral ci-dessous. Ecrire la regle deux fois, c'est se donner deux occasions de
 * la faire diverger, et la divergence ne se verrait que dans le rejeu, des semaines plus tard.
 *
 * L'aide compte parce qu'un item retrouve grace a Gobi n'est pas memorise : le reespacer comme
 * une reussite le ferait revenir trop tard. L'aide ne coute rien en etoiles (R15) ; elle
 * informe la pedagogie, elle ne punit pas l'enfant.
 */
export function revueReussie(etape: EtapeJournalisee): boolean {
  return etape.reussi && etape.aideUtilisee === 'aucune';
}

interface LigneItem {
  readonly item: string;
  readonly boite: number;
  readonly derniere_revue_le: string;
  readonly echeance_le: string;
  readonly nb_revues: number;
}

const CHAMPS = 'item, boite, derniere_revue_le, echeance_le, nb_revues';

function versItem(ligne: LigneItem): ItemLeitner {
  return {
    item: String(ligne.item),
    boite: Number(ligne.boite) as NumeroBoite,
    derniereRevueLe: String(ligne.derniere_revue_le) as Horodatage,
    echeanceLe: String(ligne.echeance_le) as Horodatage,
    nbRevues: Number(ligne.nb_revues)
  };
}

/** Tous les items d'un profil, ordre stable : echeance croissante puis identifiant. */
export async function lireItems(base: Base, profilId: string): Promise<readonly ItemLeitner[]> {
  const lignes = await base.lignes<LigneItem>(
    `SELECT ${CHAMPS} FROM items_leitner WHERE profil_id = ? ORDER BY echeance_le, item`,
    [profilId]
  );
  return lignes.map(versItem);
}

export async function lireItem(base: Base, profilId: string, item: string): Promise<ItemLeitner | null> {
  const ligne = await base.uneLigne<LigneItem>(
    `SELECT ${CHAMPS} FROM items_leitner WHERE profil_id = ? AND item = ?`,
    [profilId, item]
  );
  return ligne === undefined ? null : versItem(ligne);
}

/**
 * Les revisions dues a `maintenant`, dans l'ordre stable de `itemsDus` (P8).
 *
 * Le filtre se fait en memoire et non en SQL : `estDue` compare des instants ISO par
 * `Date.parse`, la ou `WHERE echeance_le <= ?` comparerait des chaines. Deux formes ISO du meme
 * instant — avec ou sans millisecondes — ne se comparent pas correctement caractere par
 * caractere, et une revision manquee ne se verrait jamais.
 */
export async function lireRevisionsDues(
  base: Base,
  profilId: string,
  maintenant: Horodatage,
  limite?: number
): Promise<readonly ItemLeitner[]> {
  return itemsDus(await lireItems(base, profilId), maintenant, limite);
}

async function ecrire(base: Base, profilId: string, item: ItemLeitner): Promise<void> {
  await base.lancer(
    `INSERT INTO items_leitner
       (profil_id, item, boite, derniere_revue_le, echeance_le, nb_revues)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (profil_id, item) DO UPDATE SET
       boite             = excluded.boite,
       derniere_revue_le = excluded.derniere_revue_le,
       echeance_le       = excluded.echeance_le,
       nb_revues         = excluded.nb_revues`,
    [
      profilId,
      item.item,
      item.boite,
      item.derniereRevueLe,
      item.echeanceLe,
      Math.max(0, Math.trunc(item.nbRevues))
    ]
  );
}

/**
 * Enregistre une revue : promotion si l'item a ete reussi, repli sinon.
 *
 * Un item jamais vu est cree en boite 1 avant d'etre revu — un enfant qui rencontre un
 * graphene pour la premiere fois et le reussit passe donc en boite 2, pas en boite 1.
 */
export async function appliquerRevue(
  base: Base,
  profilId: string,
  item: string,
  reussi: boolean,
  parametres: ParametresPedagogie,
  maintenant: Horodatage
): Promise<ItemLeitner> {
  const courant = (await lireItem(base, profilId, item)) ?? itemLeitnerInitial(item, maintenant);
  const suivant = reussi
    ? promouvoir(courant, parametres.leitner, maintenant)
    : retrograder(courant, parametres.leitner, maintenant);
  await ecrire(base, profilId, suivant);
  return suivant;
}

/**
 * Reconstruit integralement les boites d'un profil depuis `etapes_tentative`.
 *
 * Meme loi que le chemin incremental, rejouee dans l'ordre du journal : c'est ce qui rend les
 * deux comparables (annexe T § T2). Aucune information n'est perdue a l'effacement, puisque la
 * projection n'en porte aucune que le journal n'ait deja.
 */
export async function recalculerLeitner(
  base: Base,
  profilId: string,
  parametres: ParametresPedagogie
): Promise<readonly ItemLeitner[]> {
  await base.lancer('DELETE FROM items_leitner WHERE profil_id = ?', [profilId]);

  const items = new Map<string, ItemLeitner>();
  // Depuis l'arbitrage Q-INT-4, une etape produit une ligne PAR competence declaree. Le
  // Leitner, lui, est indexe par ITEM ATOMIQUE : deux lignes de la meme etape sont la meme
  // revision, pas deux. Sans ce dedoublonnage, un item sauterait autant de boites que
  // l'exercice declare de competences — et surtout ce recalcul divergerait de l'incrementale
  // de `alimenterPedagogie`, qui dedoublonne, lui. L'egalite des deux chemins est ce que
  // verifie le test de rejeu (annexe T § T2) : c'est le filet contre les regressions
  // silencieuses du Leitner.
  const etapesVues = new Set<string>();
  for (const etape of await listerEtapes(base, profilId)) {
    const cleEtape = `${etape.tentativeId}|${String(etape.rang)}`;
    if (etapesVues.has(cleEtape)) {
      continue;
    }
    etapesVues.add(cleEtape);
    const courant =
      items.get(etape.identifiant) ?? itemLeitnerInitial(etape.identifiant, etape.journaliseLe);
    items.set(
      etape.identifiant,
      revueReussie(etape)
        ? promouvoir(courant, parametres.leitner, etape.journaliseLe)
        : retrograder(courant, parametres.leitner, etape.journaliseLe)
    );
  }

  for (const item of items.values()) {
    await ecrire(base, profilId, item);
  }
  return lireItems(base, profilId);
}
