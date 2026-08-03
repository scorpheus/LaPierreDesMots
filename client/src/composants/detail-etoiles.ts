/**
 * CE QU'OUVRE CHAQUE ÉTOILE — R4, et pourquoi c'est une règle et non du balisage.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « j'ai eu qu'une seule étoile alors que tout est bon ppk ? »
 *
 * Le barème avait raison. Relevé dans son journal :
 *
 *     clairiere-01   nb_erreurs = 2   aide_utilisee = indice   etoiles = 1
 *
 * `calculerEtoiles` rend `1 + sansAide + sansErreur`. Deux erreurs et une aide donnent bien une
 * étoile. **Le défaut n'était pas le calcul, c'était le SILENCE.** La couleur fautive s'écoule
 * (D16), l'image finit juste, et l'enfant conclut « tout est bon » : rien ne reliait son étoile
 * unique à ce qui s'était passé.
 *
 * ── LES DEUX RÈGLES QUI RENDENT CE TEXTE DIFFICILE ────────────────────────────────────────────
 *  • « Aucun écran d'échec, jamais » (R14) ;
 *  • « L'aide de Gobi ne coûte rien et n'est JAMAIS présentée comme un échec » (R15).
 *
 * Un tableau « raté / réussi » violerait les deux. Ces phrases ne disent donc jamais ce qui a
 * manqué : elles disent CE QU'OUVRE chaque étoile — au passé pour celles qui sont là, comme une
 * porte ouverte pour les autres. Aucun compte d'erreurs, aucun rouge, aucune croix.
 *
 * La ligne de Gobi est retournée exprès : quand il a aidé, on l'énonce comme un fait heureux —
 * c'est gratuit, on peut redemander — jamais comme la raison d'une étoile en moins.
 *
 * ── POURQUOI CE FICHIER EXISTE PLUTÔT QUE DU JSX EN LIGNE ─────────────────────────────────────
 * Parce que c'est une RÈGLE : quelle condition ouvre quelle étoile, et comment on la formule.
 * En ligne dans l'écran, elle n'aurait pu être vérifiée que par une capture — et une capture ne
 * dit jamais POURQUOI elle a changé. Ici, un test peut exiger qu'aucune de ces phrases ne
 * contienne un mot de reproche, ce qu'aucune image ne saura faire.
 */

import type { ResumeTentative } from '@pierre/partage';

export interface LigneEtoile {
  /** 1, 2 ou 3 — le même rang que `data-etoile` du composant `Etoiles` (contrat § 10). */
  readonly rang: 1 | 2 | 3;
  readonly acquise: boolean;
  readonly texte: string;
}

/**
 * Les trois lignes, dans l'ordre du barème (v2 § 6.2) :
 * ★ terminé — toujours · ★★ sans aide · ★★★ sans erreur.
 *
 * Le barème lui-même vit dans `calculerEtoiles` et nulle part ailleurs (contrat § 5.7). Ce
 * fichier ne le recalcule pas : il lit les MÊMES deux critères du résumé pour dire lequel est
 * tenu. Un troisième endroit qui déciderait des étoiles serait une troisième vérité.
 */
export function detailDesEtoiles(resume: ResumeTentative): readonly LigneEtoile[] {
  const sansAide = resume.aideUtilisee === 'aucune';
  const sansErreur = resume.nbErreurs === 0;
  return [
    {
      rang: 1,
      // Toujours acquise : « toute session se termine sur une réussite » (R14).
      acquise: true,
      texte: 'Tu es allé jusqu’au bout.'
    },
    {
      rang: 2,
      acquise: sansAide,
      texte: sansAide
        ? 'Tu as tout trouvé sans aide.'
        : 'Gobi t’a donné un coup de main — tu peux lui redemander quand tu veux, ça ne coûte rien.'
    },
    {
      rang: 3,
      acquise: sansErreur,
      texte: sansErreur
        ? 'Tu as tout eu du premier coup.'
        : 'La troisième étoile, c’est quand tout est bon du premier coup.'
    }
  ];
}
