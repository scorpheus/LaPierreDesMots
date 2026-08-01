// Gobi — bulle d'aide à trois paliers, contrat technique v1 § 5.6 et v2 § 5.4.
//
// RÈGLE NON NÉGOCIABLE (CLAUDE.md) : « l'aide de Gobi ne coûte rien et n'est jamais présentée
// comme un échec — elle change seulement le nombre d'étoiles. C'est l'enfant qui choisit sa
// difficulté. » Conséquences tenues ici :
//   — aucun mot négatif, aucune couleur rouge, aucune icône d'alerte ;
//   — le bouton d'appel est TOUJOURS disponible, jamais compté à l'écran, jamais grisé ;
//   — l'appel volontaire produit exactement le palier `indice` (§ 5.6), ni plus ni moins ;
//   — le niveau atteint est monotone croissant : il ne redescend jamais.
import type { ReactElement } from 'react';
import type { AideProposee, NiveauAide } from '@pierre/partage';
import { BoutonEcouter } from './BoutonEcouter.js';

export interface ProprietesGobi {
  /** L'aide que le moteur propose, ou `null` quand il n'en propose aucune. */
  readonly aide: AideProposee | null;
  /** Palier atteint sur la tentative entière. Monotone croissant (§ 5.6). */
  readonly niveau: NiveauAide;
  /** Appel volontaire. Produit le palier `indice`, au même coût qu'un palier automatique. */
  readonly surDemande: () => void;
}

/** Ce que Gobi dit quand personne ne lui a rien demandé. Aucun de ces textes n'est un reproche. */
const INVITE_PAR_DEFAUT = 'Si tu veux, je peux t’aider. Ça ne coûte rien.';

export function Gobi({ aide, niveau, surDemande }: ProprietesGobi): ReactElement {
  const texte = aide?.texte ?? INVITE_PAR_DEFAUT;
  const parle = aide !== null && aide.texte !== null;

  return (
    <aside
      className="gobi"
      data-gobi-niveau={niveau}
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem'
      }}
    >
      {/* Gobi lui-même : une bouille framboise, jamais un panneau d'avertissement. */}
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle
          cx="32"
          cy="34"
          r="24"
          fill="var(--framboise)"
          stroke="var(--trait)"
          strokeWidth="4"
        />
        <circle cx="24" cy="30" r="4" fill="var(--parchemin)" />
        <circle cx="40" cy="30" r="4" fill="var(--parchemin)" />
        <path
          d="M23 42c4 4 14 4 18 0"
          fill="none"
          stroke="var(--trait)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>

      <div
        className="zone-lecture gobi-bulle"
        style={{
          flex: '1 1 auto',
          border: 'var(--epaisseur-trait) solid var(--trait)',
          borderRadius: 'var(--rayon-carte)',
          padding: '0.75rem 1rem'
        }}
      >
        <p style={{ margin: 0 }}>{texte}</p>
      </div>

      {/* Réécouter l'aide : R15 s'applique à Gobi comme au reste. */}
      {parle ? (
        <BoutonEcouter
          texte={texte}
          locuteur="gobi"
          libelle="Réécouter ce que dit Gobi"
        />
      ) : null}

      <button
        type="button"
        className="cible cible-secondaire"
        onClick={surDemande}
        aria-label="Demander de l’aide à Gobi"
      >
        <span aria-hidden="true">?</span>
        <span>Gobi</span>
      </button>
    </aside>
  );
}
