/**
 * OÙ L'ENFANT REPREND, ET OÙ IL VA ENSUITE — une seule règle, deux écrans.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * « quand l'exercice est fini, il y a soit rejoué ou retour a la carte ? il n'y a pas d'autres
 * exercice dans la clairiere ? » — retour de jeu du père, 2026-08-03. Il y en a **douze**, et la
 * carte l'affiche même (« Étape 1 sur 12 ») ; mais l'écran de récompense n'offrait que *Rejouer*
 * et *Retour à la carte*. Rien ne menait au nœud suivant, donc le jeu s'arrêtait au premier
 * exercice pour qui ne repassait pas par la carte.
 *
 * La règle de reprise vivait dans un `useCallback` de `EcranCarte`, invisible d'ailleurs. La
 * recopier dans l'écran de récompense aurait donné DEUX règles — et deux règles finissent
 * toujours par diverger. C'est très exactement la faute qu'on vient de trouver deux fois dans la
 * même journée : les polices déclarées dans une liste et téléchargées depuis une autre, les
 * moteurs qui montent leur décor et la liste censée les nommer.
 *
 * Ces fonctions sont donc PURES et partagées : la carte et l'écran de récompense ne peuvent plus
 * proposer deux nœuds différents pour la même situation.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import type { IdNoeud } from '@pierre/partage';

export interface PointDeReprise {
  /** Le nœud à proposer, ou `null` si la région n'en porte aucun. */
  readonly noeud: IdNoeud | null;
  /** Rang affiché à l'enfant, à partir de 1. `0` quand il n'y a rien à proposer. */
  readonly rang: number;
}

/**
 * Le nœud par lequel on entre dans une région : **le premier qui n'est pas fait**.
 *
 * Région entièrement terminée : on rend le premier nœud, parce que « rejouer un nœud déjà à
 * trois étoiles reste possible, c'est du plaisir » (v2 § 6.2) — une région finie ne doit pas
 * devenir une porte close.
 */
export function repriseDeRegion(
  noeuds: readonly IdNoeud[],
  faits: ReadonlySet<string>
): PointDeReprise {
  if (noeuds.length === 0) {
    return { noeud: null, rang: 0 };
  }
  const index = noeuds.findIndex((noeud) => !faits.has(String(noeud)));
  const choisi = index === -1 ? 0 : index;
  return { noeud: noeuds[choisi] ?? null, rang: choisi + 1 };
}

/**
 * Le nœud à proposer APRÈS celui qu'on vient de finir.
 *
 * Trois cas, dans cet ordre, et l'ordre est la règle :
 *
 *  1. le prochain non fait **après** le nœud courant — c'est la progression naturelle, celle
 *     que l'enfant attend quand il vient de réussir ;
 *  2. sinon, le premier non fait **avant** lui — on ne laisse pas un trou derrière soi, et un
 *     nœud sauté doit rester atteignable sans repasser par la carte ;
 *  3. sinon `null` : la région est entière. L'écran ne propose alors PAS de « suivant », parce
 *     qu'un bouton qui ramènerait au premier nœud déjà à trois étoiles ferait croire à une
 *     progression qui n'existe plus. Revenir à la carte est le bon geste, et c'est là que le
 *     rallumage de la région se voit (D51).
 *
 * `courant` absent de la liste — une région recomposée entre-temps — retombe sur le cas 2 : on
 * propose le premier non fait plutôt que rien. Ne rien proposer serait un cul-de-sac, et c'est
 * le pire défaut possible sur une appli d'enfant.
 */
export function noeudSuivant(
  noeuds: readonly IdNoeud[],
  faits: ReadonlySet<string>,
  courant: IdNoeud
): IdNoeud | null {
  const index = noeuds.indexOf(courant);
  const apres = noeuds.slice(index + 1).find((noeud) => !faits.has(String(noeud)));
  if (apres !== undefined) {
    return apres;
  }
  return noeuds.find((noeud) => !faits.has(String(noeud))) ?? null;
}
