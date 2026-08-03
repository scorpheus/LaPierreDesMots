/**
 * GOBI GRANDIT, ET ÇA SE VOIT — R6, demandé par le père le 2026-08-03.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « quand on gagne assez de point et que tu dis goby a évolué, montre la goby, fait une petite
 * animation de transition »
 *
 * Gobi évolue en DIX stades (D43, « 8 à 10 stades, à petits pas ») et il évolue comme un
 * tamagotchi (D28). C'est le seul moment du jeu où le compagnon change — et il passait
 * entièrement inaperçu : le stade s'écrivait en base, la carte le montrait au prochain passage,
 * et rien ne le célébrait.
 *
 * ── CE QUI EST MONTRÉ, ET DANS QUEL ORDRE ─────────────────────────────────────────────────────
 * L'ANCIEN Gobi d'abord, à sa taille de toujours ; il s'efface pendant que le NOUVEAU grandit à
 * sa place. Montrer seulement le nouveau ferait perdre ce qui se joue : ce n'est pas un dessin
 * de plus, c'est le SIEN qui a changé. Le nom du stade arrive après le dessin — on regarde, puis
 * on lit.
 *
 * ── LES TROIS RÈGLES QUI CONTRAIGNENT CET ÉCRAN ───────────────────────────────────────────────
 *  1. **Aucune animation bloquante, tout est interruptible** (v2 § 8). Un tap n'importe où passe
 *     à la suite. Un enfant qui a envie de continuer ne doit jamais attendre une animation.
 *  2. **`prefers-reduced-motion` et « animations calmes »** : le nouveau Gobi est là d'emblée,
 *     sans transition. L'information — il a grandi, il s'appelle ainsi — arrive entière.
 *  3. **Le décor s'agite, le texte jamais** : le nom du stade ne bouge pas, il apparaît.
 *
 * Ce composant ne DÉCIDE de rien : il reçoit l'ancien stade et le nouveau. C'est
 * `EcranRecompense` qui les compare, et le serveur seul qui décide du stade — le recalculer ici
 * ferait une seconde source de vérité, ce que le projet refuse partout.
 */
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import type { CodeStadeGobi } from '@pierre/partage';

import { DessinDeGobi } from './Gobi.js';
import { GOBI_VUE } from './gobi-dessin.gen.js';

/** Durée du fondu. Alignée sur la recoloration (v2 § 8) : le jeu a UN tempo, pas plusieurs. */
const DUREE_FONDU_MS = 900;

const IMAGES_CLES = `
@keyframes pierre-evolution-arrivee {
  from { opacity: 0; transform: scale(0.72); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pierre-evolution-depart {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  [data-evolution-gobi] * { animation: none !important; }
}
`;

export interface ProprietesEvolutionGobi {
  readonly avant: CodeStadeGobi;
  readonly apres: CodeStadeGobi;
  /** Nom lisible du nouveau stade — « La Lueur qui perce ». Vient du référentiel, jamais d'ici. */
  readonly libelle: string;
  readonly animationsDesactivees: boolean;
  /** Appelé au tap, et à la fin du fondu. Idempotent côté appelant. */
  readonly surFin: () => void;
}

export function EvolutionGobi({
  avant,
  apres,
  libelle,
  animationsDesactivees,
  surFin
}: ProprietesEvolutionGobi): ReactElement {
  // `bascule` : l'ancien s'efface, le nouveau grandit. Immédiat si les animations sont coupées.
  const [bascule, fixerBascule] = useState(animationsDesactivees);

  useEffect(() => {
    if (animationsDesactivees) return undefined;
    const identifiant = setTimeout(() => {
      fixerBascule(true);
    }, DUREE_FONDU_MS * 0.55);
    return () => {
      clearTimeout(identifiant);
    };
  }, [animationsDesactivees]);

  return (
    <div
      data-evolution-gobi="oui"
      data-stade-avant={avant}
      data-stade-apres={apres}
      // Un tap N'IMPORTE OÙ passe à la suite : « aucune animation bloquante » (v2 § 8).
      onClick={surFin}
      role="button"
      tabIndex={0}
      aria-label={`Gobi a grandi : ${libelle}. Touche pour continuer.`}
      onKeyDown={(evenement) => {
        if (evenement.key === 'Enter' || evenement.key === ' ') surFin();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        gap: '1.5rem',
        gridAutoRows: 'min-content',
        alignContent: 'center',
        background: 'var(--parchemin, #FFF6E3)',
        cursor: 'pointer'
      }}
    >
      <style>{IMAGES_CLES}</style>

      <p className="titre" style={{ fontSize: '2rem', margin: 0, textAlign: 'center' }}>
        Gobi a grandi&nbsp;!
      </p>

      <div style={{ position: 'relative', inlineSize: '15rem', blockSize: '15rem' }}>
        {/* L'ANCIEN — il reste là le temps qu'on le reconnaisse, puis il s'efface. Sans lui, on
            verrait un dessin de plus au lieu de comprendre que c'est le SIEN qui a changé. */}
        {bascule ? null : (
          <div
            data-evolution-role="avant"
            style={{
              position: 'absolute',
              inset: 0,
              animation: animationsDesactivees
                ? undefined
                : `pierre-evolution-depart ${String(DUREE_FONDU_MS)}ms ease-in forwards`
            }}
          >
            <svg viewBox={GOBI_VUE} role="img" aria-hidden="true" style={{ inlineSize: '100%', blockSize: '100%' }}>
              <DessinDeGobi stade={avant} animation="repos" />
            </svg>
          </div>
        )}

        {bascule ? (
          <div
            data-evolution-role="apres"
            style={{
              position: 'absolute',
              inset: 0,
              animation: animationsDesactivees
                ? undefined
                : `pierre-evolution-arrivee ${String(DUREE_FONDU_MS)}ms cubic-bezier(.16, 1, .3, 1) both`
            }}
          >
            <svg viewBox={GOBI_VUE} role="img" aria-hidden="true" style={{ inlineSize: '100%', blockSize: '100%' }}>
              <DessinDeGobi stade={apres} animation="joie" />
            </svg>
          </div>
        ) : null}
      </div>

      {/* Le nom arrive APRÈS le dessin : on regarde, puis on lit. Et il ne bouge pas — « le
          décor s'agite, le texte jamais » (v2 § 9.3). */}
      {bascule ? (
        <p
          className="zone-lecture"
          data-evolution-libelle={libelle}
          style={{ fontSize: '1.5rem', padding: '0.75rem 1.25rem', margin: 0 }}
        >
          {libelle}
        </p>
      ) : null}

      <small style={{ opacity: 0.75 }}>Touche l’écran pour continuer.</small>
    </div>
  );
}
