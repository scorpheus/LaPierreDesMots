// Le chaudron — la sortie de secours à un tap, v2 § 3.4 et § 5.4. Lot L2-F.
//
// « La sortie de secours à un tap, sans culpabilité. » C'est la pièce du campement dont la
// raison d'être est de ne RIEN exiger : pas de consigne, pas de validation, rien à rater. Elle
// ouvre le moteur `libre` (L2-E), et un enfant qui n'a plus envie de déchiffrer y va sans que
// quoi que ce soit le lui reproche.
//
// D15, déjà tranché : **tap en exercice, frottement réservé au chaudron.** Le geste de
// frottement lui-même est repoussé (contrat des features v2 § 8, n° 11) — il n'a aucun enjeu de
// validation et ne bloque rien. Le bouton, lui, est livré : le jour où le geste arrive, aucune
// interface ne bouge.
//
// PLACEHOLDER — à valider : le nœud ouvert par le chaudron.
// Les trois habillages `libre` du campement appartiennent à L2-E et aucun exercice `libre`
// n'est encore livré. Le composant appelle donc `surOuvrir` quand un hôte lui en donne un, et
// se contente sinon d'un message calme — **jamais un écran d'erreur** (R14). Question consignée
// dans `Docs/questions-en-attente.md`.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';

export interface ProprietesChaudron {
  /** Ouvre le coloriage libre. Absent tant qu'aucun nœud `libre` n'est livré. */
  readonly surOuvrir?: () => void;
  readonly animationsDesactivees?: boolean;
}

const INVITE = 'Tu veux juste colorier ? Viens au chaudron, il n’y a rien à réussir.';
const PATIENCE = 'Le chaudron mijote encore. Reviens le voir bientôt.';

export function Chaudron({ surOuvrir, animationsDesactivees = false }: ProprietesChaudron): ReactElement {
  const services = useServices();
  const [message, fixerMessage] = useState<string>(INVITE);

  const toucher = useCallback((): void => {
    if (surOuvrir === undefined) {
      // Aucun échec, aucun rouge, aucun son négatif : une phrase qui attend, et c'est tout.
      fixerMessage(PATIENCE);
      void direTexte(services.voix, PATIENCE, null, 'gobi');
      return;
    }
    surOuvrir();
  }, [services, surOuvrir]);

  return (
    <section data-chaudron="oui" aria-label="Le chaudron à couleurs">
      {/* PAS de `data-interaction="libre"` sur ce bouton, et c'est délibéré : le chaudron est
          DÉJÀ déclaré comme point d'interaction dans `contenu/monde/campement.json`. Une
          seconde prise gonflerait R11 d'une unité qui n'ajoute rien au campement — le défaut
          « un détecteur qui déclare un poids qu'il n'applique jamais ». */}
      <button
        type="button"
        className="cible cible-appel"
        data-chaudron-entree="oui"
        aria-label="Ouvrir le chaudron à couleurs"
        onClick={toucher}
        style={{
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '1.25rem',
          transition: animationsDesactivees ? 'none' : undefined
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path
            d="M10,26 L54,26 L48,54 L16,54 Z"
            fill="var(--framboise)"
            stroke="var(--trait)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M8,22 L56,22 L56,30 L8,30 Z"
            fill="var(--soleil)"
            stroke="var(--trait)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M22,10 C26,16 22,18 26,22 L18,22 C14,18 18,16 22,10 Z"
            fill="var(--menthe)"
            stroke="var(--trait)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <span className="titre" style={{ fontSize: '1.25rem' }}>
          Le chaudron
        </span>
      </button>

      <p className="zone-lecture" style={{ padding: '0.5rem 0.75rem', maxInlineSize: '32rem' }}>
        {message}
      </p>
    </section>
  );
}
