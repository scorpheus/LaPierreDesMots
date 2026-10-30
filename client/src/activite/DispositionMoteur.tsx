import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import type { CodeMoteur } from '@pierre/partage';
import type { CodeMoteurMaths } from '@pierre/partage/mathematiques';

import './socle.css';

/** Attributs `data-*` que les moteurs exposent aux tests et à l'aide de Gobi. */
type AttributsDonnees = { readonly [cle: `data-${string}`]: string | undefined };

export interface ProprietesDispositionMoteur
  extends AttributsDonnees, Pick<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'role'> {
  /** Un moteur de lecture, ou un moteur de maths (`calcul`, Docs/maths-calcul-premier-jet-2026-10-09.md). */
  readonly moteur: CodeMoteur | CodeMoteurMaths;
  /** Ce qu'on regarde et où l'on agit : le dessin, le plateau, la phrase. */
  readonly scene: ReactNode;
  /** Ce qu'on prend : couleurs, mots, pièces. À côté de la scène si la place le permet. */
  readonly reserve?: ReactNode;
  /** Messages et retours, sous le reste. */
  readonly pied?: ReactNode;
  /**
   * Sur petit écran, où la page peut défiler : 'contenu' laisse la scène prendre la hauteur de
   * son contenu (grille de cartes, plateau de cases) au lieu de la hauteur fixe du socle.
   */
  readonly hauteurPetitEcran?: 'cadre' | 'contenu';
  /**
   * 'auto' : la réserve passe à côté de la scène quand la place est large.
   * 'empilee' : toujours dessous — pour une réserve en ligne (la phrase à reconstituer).
   */
  readonly disposition?: 'auto' | 'empilee';
}

/**
 * La disposition commune des moteurs (Docs/contrat-socle-activite.md § 4).
 * Elle occupe exactement le cadre de la scène ; ses tailles viennent de socle.css.
 */
export function DispositionMoteur({ moteur, scene, reserve, pied, hauteurPetitEcran = 'cadre', disposition = 'auto', ...attributs }: ProprietesDispositionMoteur): ReactElement {
  return (
    <div {...attributs} className="disposition-moteur" data-moteur={moteur} data-socle="oui"
      data-hauteur-petit-ecran={hauteurPetitEcran} data-disposition-socle={disposition}>
      <div className="disposition-moteur__scene">{scene}</div>
      {reserve === undefined ? null : <div className="disposition-moteur__reserve">{reserve}</div>}
      {pied === undefined ? null : <div className="disposition-moteur__pied">{pied}</div>}
    </div>
  );
}
