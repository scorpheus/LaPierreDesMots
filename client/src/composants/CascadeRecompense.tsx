// La cascade à trois paliers, à la clôture d'un nœud — D25 (lot L2-A).
//
// C'est le composant qui remplace le seul décompte d'étoiles de la v1. Il affiche, dans cet
// ordre : ce qui vient d'être gagné, puis les trois jauges — donc **le vide qui reste**
// (D25, point 3). L'ordre compte : on montre d'abord la récompense, ensuite l'appel du
// prochain palier. L'inverse ferait de la récompense un simple passage.
//
// Le mapping avec le système de l'école est direct et délibéré (D25) : étoile → tampon
// spécial → image. Les libellés le disent en français d'enfant, jamais en vocabulaire de jeu.
import type { ReactElement } from 'react';
import type { CodePalier, GainCascade, NatureRecompense } from '@pierre/partage';

import { JaugePalier } from './JaugePalier.js';

/**
 * Une phrase par palier. Aucune ne compare, aucune ne juge, aucune ne regrette (R14).
 * PLACEHOLDER — à valider : les formulations sont à relire avec le parent.
 */
const ANNONCE: Readonly<Record<CodePalier, string>> = {
  etoile: 'Une étoile de plus !',
  intermediaire: 'Un cadeau spécial !',
  rare: 'Une zone du monde se rallume !'
};

/** Ce que le palier remet, dit à l'enfant. */
const NATURE_DITE: Readonly<Record<NatureRecompense, string>> = {
  etoile: 'une étoile',
  'forme-gobi': 'une nouvelle forme pour Gobi',
  'objet-campement': 'un objet pour le campement',
  'zone-recoloriee': 'une zone qui reprend ses couleurs'
};

export interface ProprietesCascadeRecompense {
  /** `null` tant que la cascade n'a pas été appliquée — l'écran reste alors sans jauge. */
  readonly gain: GainCascade | null;
}

export function CascadeRecompense({ gain }: ProprietesCascadeRecompense): ReactElement | null {
  if (gain === null) {
    return null;
  }

  return (
    <section
      className="cascade-recompense"
      aria-label="Ce que tu viens de gagner"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        alignItems: 'center'
      }}
    >
      {/* ── ce qui vient d'être gagné, dans l'ordre de franchissement */}
      {gain.recompenses.length === 0 ? null : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          {gain.recompenses.map((recompense, rang) => (
            <li
              key={`${recompense.palier}-${String(rang)}`}
              // ⚠ `data-recompense` — ADDITION au § 7 du contrat des features v2, signalée au
              // rapport de L2-A. `data-palier` y est réservé aux JAUGES ; le réemployer ici
              // ferait compter quatre « jauges » à `parcours-cascade` là où il en attend trois.
              data-recompense={recompense.palier}
              className="zone-lecture"
              style={{
                margin: 0,
                padding: '0.5rem 1rem',
                fontSize: '1.35rem',
                border: 'var(--epaisseur-trait) solid var(--trait)',
                borderRadius: 'var(--rayon-carte)'
              }}
            >
              {ANNONCE[recompense.palier]}{' '}
              <span style={{ opacity: 0.8 }}>({NATURE_DITE[recompense.nature]})</span>
            </li>
          ))}
        </ul>
      )}

      {/* ── et le vide qui reste : c'est lui qui donne envie de revenir (D25, point 3) */}
      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        {gain.jauges.map((jauge) => (
          <JaugePalier key={jauge.palier} jauge={jauge} />
        ))}
      </div>
    </section>
  );
}
