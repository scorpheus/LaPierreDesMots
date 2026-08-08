/**
 * LES RÉGLAGES DE LECTURE DU PROFIL COURANT, PORTÉS À TOUT L'ARBRE.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT, TROUVÉ PAR Q7 LE 2026-08-08 — quinze échecs, une seule racine
 *
 * `FournisseurReglagesLecture` existait, était juste, et n'était monté NULLE PART.
 * `useReglagesLecture()` rendait donc toujours `REGLAGES_PAR_DEFAUT`, et le réglage du parent
 * n'atteignait aucun texte du jeu — pas même la consigne. Quatorze moteurs échouaient, ce qui
 * ressemblait à quatorze oublis : c'était une racine unique, en amont de tous.
 *
 * Le défaut est invisible par construction, et c'est ce qui le rend intéressant. Le contexte a
 * pour défaut `REGLAGES_PAR_DEFAUT` et non `null` — décision juste, prise pour qu'une zone de
 * lecture montée hors du fournisseur reste LISIBLE plutôt que de lever (aucun écran vide,
 * jamais). Mais un défaut sensé masque totalement l'absence du fournisseur : rien ne casse,
 * rien ne s'affiche en erreur, le texte est simplement toujours de la même taille. C'est la
 * signature du « champ câblé jusqu'à la sortie et jamais affecté » de CLAUDE.md, et il a fallu
 * un test qui pose la question « ce fournisseur est-il monté quelque part ? » pour le voir.
 *
 * ── POURQUOI LA MÊME `queryKey` QUE L'ÉCRAN DE RÉGLAGES ───────────────────────────────────
 * `['reglages-lecture', idProfil]` est la clé qu'`EcranReglagesLecture` utilise déjà. La
 * partager n'est pas une économie de requête : c'est ce qui fait que **le réglage bouge dans
 * tout le jeu à l'instant où le parent le change**, sans qu'aucun des quatorze moteurs n'ait à
 * s'abonner à quoi que ce soit. Deux clés distinctes auraient donné deux vérités, et le jeu
 * aurait affiché l'ancienne.
 *
 * ── CE QUE CE COMPOSANT NE FAIT PAS ───────────────────────────────────────────────────────
 * Il n'écrit jamais. L'enregistrement appartient à l'écran de réglages, seul endroit d'où le
 * parent décide. Ici on ne fait que LIRE et porter.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { BORNES_REGLAGES, REGLAGES_PAR_DEFAUT, normaliserReglages, variablesCss } from '@pierre/partage/lecture';
import type { ReglagesLecture } from '@pierre/partage/lecture';

import { useEtatJeu } from '../etat/services.js';
import { FournisseurReglagesLecture } from './ZoneDeLecture.js';

/** Le chemin des réglages d'un profil. Même route que l'écran de réglages, § 5.3. */
export function cheminReglages(id: string): string {
  return `/api/profils/${encodeURIComponent(id)}/reglages`;
}

/** La clé de cache, partagée avec `EcranReglagesLecture`. Une seule vérité. */
export function cleReglages(idProfil: string | null): readonly unknown[] {
  return ['reglages-lecture', idProfil];
}

export async function lireReglages(idProfil: string): Promise<ReglagesLecture> {
  const reponse = await fetch(cheminReglages(idProfil), {
    headers: { Accept: 'application/json' },
  });
  if (!reponse.ok) {
    // Un profil neuf n'a pas encore de ligne, et ce n'est pas une erreur. Aucun écran d'échec.
    return REGLAGES_PAR_DEFAUT;
  }
  return normaliserReglages((await reponse.json()) as Partial<ReglagesLecture>);
}

/**
 * L'ÉCHELLE DE LECTURE — comment un réglage atteint 119 tailles écrites en dur.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * Q7 a listé ce qui ne suivait pas le réglage : la consigne, le bouton « Écouter », la bulle
 * de Gobi, « La carte ». Cinq textes pour le seul moteur `assemble`, et le même compte partout
 * ailleurs. Recensement par objet, mesuré :
 *
 *     $ grep -rn "fontSize: '" client/src --include=*.tsx -o | wc -l      → 119
 *
 * Cent dix-neuf tailles, presque toutes en `rem`. Les corriger une par une, c'est cent dix-neuf
 * occasions de se tromper et un test qui redeviendra rouge à la prochaine ligne écrite.
 *
 * Or un `rem` se mesure sur `html`, jamais sur `body`. **Poser l'échelle sur `html` fait suivre
 * les 119 sans en toucher un seul** — et une taille ajoutée demain suit toute seule, ce qui est
 * la seule forme qui ne pourrit pas.
 *
 * ── POURQUOI UNE ÉCHELLE, ET NON `--lecture-corps` DIRECTEMENT ────────────────────────────
 * Écrire `html { font-size: var(--lecture-corps) }` ferait passer la racine de 16 à 24 px au
 * défaut, soit **+50 % sur toute l'application d'un coup**, sur des écrans dont la dette R20
 * se compte déjà en centaines de pixels. Ce serait corriger un défaut en en créant un pire.
 *
 * L'échelle est le rapport au corps PAR DÉFAUT :
 *
 *     corpsPx 24 (défaut) → échelle 1,000   ← rien ne bouge, aucune régression possible
 *     corpsPx 16 (min)    → échelle 0,667
 *     corpsPx 40 (max)    → échelle 1,667
 *
 * Le réglage devient donc un ZOOM de l'interface entière, neutre tant que le parent n'y touche
 * pas. C'est aussi ce que le réglage veut dire pour un enfant qui déchiffre : ce n'est pas la
 * consigne seule qu'il faut grossir, c'est tout ce qu'il doit lire.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
export function echelleDeLecture(reglages: ReglagesLecture): number {
  const defaut = BORNES_REGLAGES.corpsPx.defaut;
  if (defaut <= 0) return 1;
  return Math.round((reglages.corpsPx / defaut) * 1000) / 1000;
}

export interface ProprietesFournisseurReglagesDuProfil {
  readonly children: ReactNode;
}

/**
 * Lit les réglages du profil de la session et les porte à tout l'arbre.
 *
 * Il doit être monté À L'INTÉRIEUR de `FournisseurJeu` — il lit le profil courant — et AUTOUR
 * du routeur, puisque tout écran affiche du texte à déchiffrer.
 */
export function FournisseurReglagesDuProfil({
  children,
}: ProprietesFournisseurReglagesDuProfil): ReactElement {
  const profil = useEtatJeu((etat) => etat.profil);
  const idProfil = profil === null ? null : String(profil.id);

  const enregistres = useQuery({
    queryKey: cleReglages(idProfil),
    enabled: idProfil !== null,
    staleTime: 0,
    queryFn: async (): Promise<ReglagesLecture> => lireReglages(idProfil ?? ''),
  });

  // Avant le chargement, et pour un profil non choisi : les réglages par défaut. Le jeu reste
  // lisible à tout instant — c'est la même raison qui a fait choisir ce défaut pour le contexte.
  const reglages = enregistres.data ?? REGLAGES_PAR_DEFAUT;

  /**
   * Les variables de lecture sont posées sur `document.documentElement`, et non sur un `<div>`
   * englobant, pour deux raisons qui se mesurent :
   *
   *   • un `rem` se calcule sur `<html>` : l'échelle n'agit que là, jamais plus bas ;
   *   • un élément de plus dans l'arbre changerait la mise en page — un div en `display:
   *     contents` la préserve mais casse les sélecteurs d'enfant direct que le CSS emploie.
   *
   * On repose les variables à chaque changement plutôt que de les fusionner : une variable
   * retirée du jeu doit disparaître de la racine, sans quoi elle survit à la loi qui la posait.
   */
  useEffect(() => {
    const racine = document.documentElement;
    const variables = { ...variablesCss(reglages), '--lecture-echelle': String(echelleDeLecture(reglages)) };
    for (const [nom, valeur] of Object.entries(variables)) {
      racine.style.setProperty(nom, valeur);
    }
    return () => {
      for (const nom of Object.keys(variables)) {
        racine.style.removeProperty(nom);
      }
    };
  }, [reglages]);

  return (
    <FournisseurReglagesLecture reglages={reglages}>{children}</FournisseurReglagesLecture>
  );
}
