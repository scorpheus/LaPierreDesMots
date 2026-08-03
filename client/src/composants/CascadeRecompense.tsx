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

/**
 * Le pictogramme de chaque palier — lot M8, R18.
 *
 * « Le jeu se comprend sans qu'un adulte explique quoi que ce soit » : l'enfant qui ne
 * déchiffre pas encore doit VOIR ce qu'il vient de gagner. Les trois dessins sont tracés ici,
 * en trait épais et en aplat, plutôt que pris à une fonte d'émoji : un émoji change de dessin
 * d'un système à l'autre, et celui-ci est la seule prise non écrite de l'écran.
 *
 * Ils sont `aria-hidden` : la phrase les dit déjà, et l'annoncer deux fois ferait un écho.
 */
const PICTOGRAMME: Readonly<Record<CodePalier, { readonly d: string; readonly fill: string }>> = {
  // Une étoile à cinq branches.
  etoile: {
    d: 'M24 4l5.8 11.8L43 17.7l-9.5 9.2 2.2 13L24 33.7 12.3 39.9l2.2-13L5 17.7l13.2-1.9z',
    fill: 'var(--soleil)'
  },
  // Un cristal facetté : ce que Gobi porte sur la crête (D20).
  intermediaire: {
    d: 'M24 3l13 13-4 20-9 9-9-9-4-20z',
    fill: 'var(--framboise)'
  },
  // Une portion de monde qui reprend ses couleurs : une colline et son soleil.
  rare: {
    d: 'M4 40l10-16 8 8 9-14 13 22z',
    fill: 'var(--menthe)'
  }
};

function Pictogramme({ palier }: { readonly palier: CodePalier }): ReactElement {
  const { d, fill } = PICTOGRAMME[palier];
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      data-pictogramme-palier={palier}
      style={{ flex: '0 0 auto' }}
    >
      <path
        d={d}
        fill={fill}
        stroke="var(--trait)"
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: 0,
                padding: '0.5rem 1rem',
                fontSize: '1.35rem',
                border: 'var(--epaisseur-trait) solid var(--trait)',
                borderRadius: 'var(--rayon-carte)',
                // Le relief de BD (M8). Aucune animation : cette ligne se LIT, et le texte ne
                // s'agite jamais (v2 § 9.3).
                boxShadow: 'var(--ombre-bd)'
              }}
            >
              <Pictogramme palier={recompense.palier} />
              <span>
                {ANNONCE[recompense.palier]}{' '}
                {/* `opacity: 0.8` a disparu : sur `--lecture-fond`, elle faisait tomber
                    l'encre sous le ratio de 4,5 exigé, et c'est justement la parenthèse qui
                    dit CE QU'ON A GAGNÉ. La hiérarchie passe par la taille, pas par le voile. */}
                <span style={{ fontSize: '0.85em' }}>({NATURE_DITE[recompense.nature]})</span>
              </span>
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
