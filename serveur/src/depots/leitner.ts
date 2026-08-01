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
 */

import type { DatabaseSync } from 'node:sqlite';

import type { Horodatage, ItemLeitner, NumeroBoite, ParametresPedagogie } from '@pierre/partage';
import { itemLeitnerInitial, itemsDus, promouvoir, retrograder } from '@pierre/partage/pedagogie';

import { listerEtapes } from './etapes.js';

import type { EtapeJournalisee } from './etapes.js';

/**
 * Ce qui compte comme une revue REUSSIE pour le Leitner : aboutie sans erreur ET sans aide.
 *
 * Un seul endroit, et les DEUX chemins l'appellent — l'incremental de `routes/tentatives.ts` et
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
export function lireItems(base: DatabaseSync, profilId: string): readonly ItemLeitner[] {
  const lignes = base
    .prepare(
      `SELECT ${CHAMPS} FROM items_leitner WHERE profil_id = ? ORDER BY echeance_le, item`
    )
    .all(profilId) as unknown as LigneItem[];
  return lignes.map(versItem);
}

export function lireItem(
  base: DatabaseSync,
  profilId: string,
  item: string
): ItemLeitner | null {
  const ligne = base
    .prepare(`SELECT ${CHAMPS} FROM items_leitner WHERE profil_id = ? AND item = ?`)
    .get(profilId, item) as unknown as LigneItem | undefined;
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
export function lireRevisionsDues(
  base: DatabaseSync,
  profilId: string,
  maintenant: Horodatage,
  limite?: number
): readonly ItemLeitner[] {
  return itemsDus(lireItems(base, profilId), maintenant, limite);
}

function ecrire(base: DatabaseSync, profilId: string, item: ItemLeitner): void {
  base
    .prepare(
      `INSERT INTO items_leitner
         (profil_id, item, boite, derniere_revue_le, echeance_le, nb_revues)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (profil_id, item) DO UPDATE SET
         boite             = excluded.boite,
         derniere_revue_le = excluded.derniere_revue_le,
         echeance_le       = excluded.echeance_le,
         nb_revues         = excluded.nb_revues`
    )
    .run(
      profilId,
      item.item,
      item.boite,
      item.derniereRevueLe,
      item.echeanceLe,
      Math.max(0, Math.trunc(item.nbRevues))
    );
}

/**
 * Enregistre une revue : promotion si l'item a ete reussi, repli sinon.
 *
 * Un item jamais vu est cree en boite 1 avant d'etre revu — un enfant qui rencontre un
 * graphene pour la premiere fois et le reussit passe donc en boite 2, pas en boite 1.
 */
export function appliquerRevue(
  base: DatabaseSync,
  profilId: string,
  item: string,
  reussi: boolean,
  parametres: ParametresPedagogie,
  maintenant: Horodatage
): ItemLeitner {
  const courant = lireItem(base, profilId, item) ?? itemLeitnerInitial(item, maintenant);
  const suivant = reussi
    ? promouvoir(courant, parametres.leitner, maintenant)
    : retrograder(courant, parametres.leitner, maintenant);
  ecrire(base, profilId, suivant);
  return suivant;
}

/**
 * Reconstruit integralement les boites d'un profil depuis `etapes_tentative`.
 *
 * Meme loi que le chemin incremental, rejouee dans l'ordre du journal : c'est ce qui rend les
 * deux comparables (annexe T § T2). Aucune information n'est perdue a l'effacement, puisque la
 * projection n'en porte aucune que le journal n'ait deja.
 */
export function recalculerLeitner(
  base: DatabaseSync,
  profilId: string,
  parametres: ParametresPedagogie
): readonly ItemLeitner[] {
  base.prepare('DELETE FROM items_leitner WHERE profil_id = ?').run(profilId);

  const items = new Map<string, ItemLeitner>();
  for (const etape of listerEtapes(base, profilId)) {
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
    ecrire(base, profilId, item);
  }
  return lireItems(base, profilId);
}
