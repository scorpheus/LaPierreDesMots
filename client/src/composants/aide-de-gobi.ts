// R46 — CE QUE GOBI DIT, ET LE CLIP QUI LE DIT. Résolution de l'aide, côté coquille.
//
// ══════════════════════════════════════════════════════════════════════════════════════════
// LE DÉFAUT QUE CE FICHIER RÉPARE, MESURÉ ET NON RAPPORTÉ
//
// Le père, deux fois en une soirée : « le bouton "? gobi" ne fait rien ». Mesuré en montant
// les quatorze moteurs sur un exercice réellement livré :
//
//     objets mesurés          : 14
//     aide.texte === null     : 12      (assemble attrape chemin chrono colorie eclair
//                                        grave histoire paires phrase place tri)
//     aide.texte porteur      :  2      (libre, trace — et AUCUN clip ne sert leurs textes)
//
// Et dans le DOM monté, avant correction :
//
//     aide = null      (AVANT le tap) | bulle="Si tu veux, je peux t’aider. Ça ne coûte rien."
//     aide des 12      (APRÈS le tap) | bulle="Si tu veux, je peux t’aider. Ça ne coûte rien."
//
// Taper « ? Gobi » ne produisait pas une bulle vide : il ne produisait **aucun changement**.
// `Gobi.tsx` écrivait `const texte = aide?.texte ?? INVITE_PAR_DEFAUT`, et `??` retombe aussi
// bien quand `aide` est nul que quand `aide.texte` l'est. **Un repli a masqué la panne** — il
// faisait passer « rien à dire » pour « rien de nouveau à dire », et c'est ce qui lui a permis
// de survivre à la relecture, aux 354 assertions et à trois campagnes.
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// ── POURQUOI LA COQUILLE, ET PAS LE MOTEUR ────────────────────────────────────────────────
//
// « Rien n'est synthétisé à l'exécution » (CLAUDE.md) : ce que Gobi DIT doit avoir un clip, et
// un clip se désigne par une clé `<idExercice>/<idConsigne>`. Le moteur ne connaît pas
// l'identifiant de l'exercice — `MoteurAssemble.tsx` l'avait déjà arbitré pour le bouton
// « écouter », et le motif est le même mot pour mot :
//
//     « Un moteur ne peut pas héberger le vrai bouton d'écoute : il lui faudrait la clé
//       `<exercice>/<consigne>`, et `ProprietesMoteur` ne porte pas l'identifiant
//       d'exercice. Seul l'écran le connaît. »
//
// Un texte affiché qui différerait du texte du clip serait un mensonge de plus : la bulle
// dirait une chose, le haut-parleur une autre. Le texte et la clé viennent donc du MÊME
// endroit, et cet endroit est l'écran.
//
// CE QUE LE MOTEUR GARDE : son `code`, sa `cible`, et un `texte` **particulier** quand il en a
// un — `trace` (« la grande barre ») et `libre` (« ici, il n'y a rien à réussir »). Un
// `texte: null` n'est donc pas un trou : il veut dire « rien de particulier, la consigne
// suffit ». C'est le cas des douze autres.
//
// CETTE FORME NE POURRIT PAS. Un quinzième moteur écrit demain hérite du texte et du clip
// sans que personne ait à s'en souvenir ; s'il fallait qu'il transporte la consigne dans son
// état, il repasserait `null` en silence, exactement comme les douze.
//
// ── LA COUVERTURE AUDIO, MESURÉE AVANT D'ÊTRE PROMISE ─────────────────────────────────────
//
//     consignes livrées : 286   avec un clip `normal` au manifeste : 286   taux : 1.000
//
// Zéro clip à produire. `relire-consigne` est audible sur la totalité du corpus dès
// aujourd'hui, parce que c'est EXACTEMENT le clip que la barre de consigne joue déjà.
import type { AideProposee, CleAudio } from '@pierre/partage';

/** L'étape telle que `EcranNoeud` la présente : un identifiant et un texte lisible. */
export interface EtapeLisible {
  readonly id: string;
  readonly texte: string;
}

/**
 * D'où vient le texte que la bulle montre. **Publié dans le DOM** (`data-aide-source`).
 *
 * `manquant` est la seule valeur qui ne doit jamais apparaître : elle nomme l'état où une
 * aide est proposée et où personne n'a su dire quoi. Elle existe pour être COMPTÉE — un état
 * qui n'a pas de nom ne peut pas être mesuré, et c'est faute de nom que celui-ci a vécu.
 */
export type SourceTexteAide = 'moteur' | 'consigne' | 'manquant';

export interface AideResolue {
  /** Ce que la bulle affiche et ce que le clip dit. `null` seulement si aucune aide. */
  readonly texte: string | null;
  /** La clé de manifeste du clip qui dit `texte`. `null` : D42 masque le bouton. */
  readonly cle: CleAudio | null;
  readonly source: SourceTexteAide | null;
}

const AUCUNE: AideResolue = { texte: null, cle: null, source: null };

/**
 * Résout l'aide du moteur en (texte affiché, clip qui le dit).
 *
 * TROIS CAS, ET AUCUN REPLI SILENCIEUX :
 *
 *   1. le moteur a un texte PARTICULIER (`trace`, `libre`) → on l'affiche tel quel, et
 *      `cle: null` : aucun clip du manifeste ne sert ces phrases-là. D42 masque alors le
 *      bouton « écouter » plutôt que d'en offrir un muet. La dette est réelle et chiffrée
 *      dans le rapport ; elle n'est pas maquillée ici ;
 *   2. le moteur n'a rien de particulier (les douze autres) → **la consigne**, mot pour mot
 *      celle que la barre affiche et que le clip `<idExercice>/<idConsigne>` prononce ;
 *   3. aucune étape courante → `manquant`. Mesuré à ZÉRO sur les 76 exercices livrés, et
 *      c'est le DOM qui le dit, pas ce commentaire.
 */
export function resoudreAideDeGobi(
  aide: AideProposee | null,
  etape: EtapeLisible | null,
  idExercice: string | null,
): AideResolue {
  if (aide === null) {
    return AUCUNE;
  }
  if (aide.texte !== null && aide.texte !== '') {
    return { texte: aide.texte, cle: null, source: 'moteur' };
  }
  if (etape !== null && idExercice !== null && idExercice !== '' && etape.texte !== '') {
    return { texte: etape.texte, cle: `${idExercice}/${etape.id}`, source: 'consigne' };
  }
  return { texte: null, cle: null, source: 'manquant' };
}
