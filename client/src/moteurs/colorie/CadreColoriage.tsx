/**
 * Cadre de confort partagé par les scènes du moteur `colorie`.
 *
 * La loupe agrandit la scène entière : elle ne connaît ni consigne, ni région attendue, donc
 * elle ne peut jamais révéler la réponse. Le même sous-arbre React reste monté pendant la
 * bascule afin que le coloriage et la consigne active ne soient pas réinitialisés.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';

import './colorie.css';

/** Valeurs de confort opposables aux régressions de la loupe. */
export const TAILLE_COMMANDE_LOUPE_PX = 64;
export const LARGEUR_MINIMALE_LOUPE_PX = 1280;

export interface ProprietesCadreColoriage {
  /** La scène reçoit l’état de loupe mais reste le même sous-arbre React. */
  readonly enfants: (loupeActive: boolean) => ReactElement;
}

export function CadreColoriage({ enfants }: ProprietesCadreColoriage): ReactElement {
  const [loupeActive, fixerLoupeActive] = useState(false);
  const libelle = loupeActive ? 'Voir tout' : 'Voir en grand';

  return (
    <section className="pierre-cadre-coloriage" data-loupe-coloriage data-loupe={loupeActive ? 'oui' : 'non'}>
      <button
        type="button"
        className="pierre-cadre-coloriage__commande"
        aria-pressed={loupeActive}
        onClick={() => fixerLoupeActive((courant) => !courant)}
      >
        {libelle}
      </button>
      <div
        className="pierre-cadre-coloriage__fenetre"
        data-loupe-fenetre
        data-defilement={loupeActive ? 'oui' : 'non'}
      >
        {enfants(loupeActive)}
      </div>
    </section>
  );
}
