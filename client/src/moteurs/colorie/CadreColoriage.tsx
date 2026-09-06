/**
 * Cadre de confort partagé par les scènes du moteur `colorie`.
 *
 * La loupe agrandit la scène entière : elle ne connaît ni consigne, ni région attendue, donc
 * elle ne peut jamais révéler la réponse. Le même sous-arbre React reste monté pendant la
 * bascule afin que le coloriage et la consigne active ne soient pas réinitialisés.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';

/** Valeurs de confort opposables aux régressions de la loupe. */
export const TAILLE_COMMANDE_LOUPE_PX = 64;
export const LARGEUR_MINIMALE_LOUPE_PX = 1280;

const STYLES_CADRE_COLORIAGE = `
.pierre-cadre-coloriage {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: .5rem;
  min-inline-size: 0;
  min-block-size: 0;
}
.pierre-cadre-coloriage__commande {
  align-self: center;
  min-inline-size: ${String(TAILLE_COMMANDE_LOUPE_PX)}px;
  min-block-size: ${String(TAILLE_COMMANDE_LOUPE_PX)}px;
  padding: .45rem .85rem;
  border: 2px solid var(--trait, #1B2440);
  border-radius: .75rem;
  background: var(--parchemin, #FFF6E3);
  color: var(--trait, #1B2440);
  font: inherit;
  font-weight: 700;
}
.pierre-cadre-coloriage__commande:focus-visible {
  outline: 3px solid var(--soleil, #FFC93C);
  outline-offset: 3px;
}
.pierre-cadre-coloriage__fenetre {
  min-inline-size: 0;
  min-block-size: 0;
  overflow: hidden;
}
.pierre-cadre-coloriage[data-loupe="oui"] .pierre-cadre-coloriage__fenetre {
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
  border: 2px solid color-mix(in srgb, var(--trait, #1B2440) 35%, transparent);
  border-radius: .75rem;
}
.pierre-cadre-coloriage[data-loupe="oui"] .pierre-scene {
  flex: none !important;
  min-inline-size: ${String(LARGEUR_MINIMALE_LOUPE_PX)}px;
  inline-size: 100% !important;
  max-inline-size: none !important;
  max-block-size: none !important;
  block-size: auto !important;
}
`;

export interface ProprietesCadreColoriage {
  /** La scène reçoit l’état de loupe mais reste le même sous-arbre React. */
  readonly enfants: (loupeActive: boolean) => ReactElement;
}

export function CadreColoriage({ enfants }: ProprietesCadreColoriage): ReactElement {
  const [loupeActive, fixerLoupeActive] = useState(false);
  const libelle = loupeActive ? 'Voir tout' : 'Voir en grand';

  return (
    <section className="pierre-cadre-coloriage" data-loupe-coloriage data-loupe={loupeActive ? 'oui' : 'non'}>
      <style>{STYLES_CADRE_COLORIAGE}</style>
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
