/**
 * QUI JOUE, RETENU SUR L'APPAREIL — R21.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT, TROUVÉ EN JOUANT
 *
 * « quand on appuie dans le navigateur sur rafraîchir ou sur retour en arrière, ça enlève le
 * site. Et ça, faudrait pouvoir revenir en arrière justement, ou quand on fait rafraîchir, que
 * ça rafraîchit la même page, sinon on perd carrément tout. »
 *
 * ── CE QUE J'AI CRU, ET CE QUE LA MESURE A DIT ────────────────────────────────────────────────
 * J'ai d'abord cru que l'application n'avait pas de routeur. **Faux** : `/carte`, `/noeud`,
 * `/recompense`, `/campement`, `/coffre` sont toutes des routes déclarées, et l'URL suit bien
 * l'écran.
 *
 * Ce qui se perd n'est pas la route, c'est le JOUEUR. Mesuré :
 *
 *     grep -rn "localStorage" client/src   →  uniquement `parent/reglages-foyer.ts`
 *
 * Le profil choisi ne vivait que dans le magasin, c'est-à-dire en mémoire. Un rafraîchissement
 * sur `/carte` rechargeait donc la carte **sans savoir quel enfant joue** : retour au choix de
 * profil, et tout le contexte perdu.
 *
 * ── POURQUOI `localStorage` ET NON UN COOKIE OU LE SERVEUR ────────────────────────────────────
 * Le même raisonnement que `reglages-foyer.ts` : c'est une préférence D'APPAREIL, pas une donnée
 * de progression. La progression, elle, vit dans le journal côté serveur et se recalcule (« le
 * journal fait foi »). Rien ici n'est une source de vérité : au pire, on redemande qui joue.
 *
 * ── CE QUI EST DÉLIBÉRÉMENT NON RESTAURÉ ──────────────────────────────────────────────────────
 * L'exercice EN COURS. Son état vit dans le moteur, en mémoire, et le restaurer supposerait de
 * journaliser chaque geste — ce que le projet refuse (le journal porte des tentatives, pas des
 * frappes). Un rafraîchissement pendant un exercice ramène donc à la carte, avec le bon enfant :
 * on perd un exercice, jamais la partie. C'est très exactement la différence entre un désagrément
 * et un état sans issue.
 */

/** Clé unique. Préfixée comme celle du foyer, pour qu'un vidage de l'appareil les prenne toutes. */
const CLE = 'pierre.joueur';

/**
 * L'identifiant du dernier joueur choisi, ou `null`.
 *
 * Ne lève jamais : `localStorage` peut être absent (rendu hors navigateur) ou refusé (navigation
 * privée stricte). Un stockage indisponible doit dégrader vers « on redemande qui joue », jamais
 * vers un écran cassé.
 */
export function lireProfilMemorise(): string | null {
  try {
    const brut = globalThis.localStorage?.getItem(CLE) ?? null;
    return brut === null || brut.trim() === '' ? null : brut;
  } catch {
    return null;
  }
}

export function memoriserProfil(identifiant: string): void {
  try {
    globalThis.localStorage?.setItem(CLE, identifiant);
  } catch {
    // Sans stockage, on redemande qui joue au prochain démarrage. Ce n'est pas une erreur de
    // jeu : rien n'est perdu, la progression est au serveur.
  }
}

export function oublierProfil(): void {
  try {
    globalThis.localStorage?.removeItem(CLE);
  } catch {
    // Idem : un oubli qui échoue ne doit pas empêcher de changer de joueur.
  }
}
