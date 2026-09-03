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

/**
 * Ce que le palier remet, dit à l'enfant.
 *
 * `'objet-campement'` retiré par le lot A1 (R31) : `NatureRecompense` n'en a plus que trois —
 * voir `partage/src/recompenses/types.ts`, aucun palier ne pouvait le produire.
 */
const NATURE_DITE: Readonly<Record<NatureRecompense, string>> = {
  etoile: 'une étoile',
  'forme-gobi': 'une nouvelle forme pour Gobi',
  'zone-recoloriee': 'une zone qui reprend ses couleurs'
};

/**
 * Le signe de chaque palier. Il accompagne le texte sans fabriquer un faux visuel SVG : la
 * récompense garde le vrai Gobi raster de la scène, et la cascade reste un petit carnet lisible.
 * Ils sont `aria-hidden` : la phrase les dit déjà, et l'annoncer deux fois ferait un écho.
 */
const SIGNE_PALIER: Readonly<Record<CodePalier, string>> = {
  etoile: '★',
  intermediaire: '✦',
  rare: '☀'
};

function SignePalier({ palier }: { readonly palier: CodePalier }): ReactElement {
  return (
    <span
      className={`cascade-embleme cascade-embleme--${palier}`}
      aria-hidden="true"
      data-pictogramme-palier={palier}
    >
      {SIGNE_PALIER[palier]}
    </span>
  );
}

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
    >
      {/* ── ce qui vient d'être gagné, dans l'ordre de franchissement */}
      {gain.recompenses.length === 0 ? null : (
        <ul className="cascade-recompense-liste">
          {gain.recompenses.map((recompense, rang) => (
            <li
              key={`${recompense.palier}-${String(rang)}`}
              // ⚠ `data-recompense` — ADDITION au § 7 du contrat des features v2, signalée au
              // rapport de L2-A. `data-palier` y est réservé aux JAUGES ; le réemployer ici
              // ferait compter quatre « jauges » à `parcours-cascade` là où il en attend trois.
              data-recompense={recompense.palier}
              className="cascade-recompense-gain"
            >
              <SignePalier palier={recompense.palier} />
              <span>
                {ANNONCE[recompense.palier]}{' '}
                {/* `opacity: 0.8` a disparu : sur `--lecture-fond`, elle faisait tomber
                    l'encre sous le ratio de 4,5 exigé, et c'est justement la parenthèse qui
                    dit CE QU'ON A GAGNÉ. La hiérarchie passe par la taille, pas par le voile. */}
                <span className="cascade-recompense-detail">({NATURE_DITE[recompense.nature]})</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── et le vide qui reste : c'est lui qui donne envie de revenir (D25, point 3) */}
      <div className="cascade-recompense-jauges">
        {gain.jauges.map((jauge) => (
          <JaugePalier key={jauge.palier} jauge={jauge} />
        ))}
      </div>
    </section>
  );
}
