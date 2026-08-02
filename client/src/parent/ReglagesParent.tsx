// Réglages de la zone parent — v2 § 14 : « réglages, exports CSV, sauvegarde en un clic ».
//
// PLACEHOLDER — à valider (consigné dans `Docs/questions-en-attente.md`). Le contrat gelé
// n'accorde à ce lot AUCUNE route pour persister ces réglages : les 12 routes du § 5.3
// n'en portent aucune. Deux issues étaient possibles — inventer une route hors contrat, ou
// stocker localement. On stocke localement, dans `localStorage`, sur l'appareil du parent :
//   • rien de pédagogique n'y est écrit — ce sont des préférences de confort ;
//   • aucun autre lot n'est bloqué par ce choix ;
//   • le jour où une route existe, seul `reglages-foyer.ts` bouge.
//
// « Animations calmes » n'est pas un réglage d'accessibilité de plus : c'est le même levier que
// `prefers-reduced-motion`, exposé au parent parce que la tablette du salon ne le propose pas.
//
// ────────────────────────────────────────────────────────────────────────────────────────
// LE QUATRIÈME RÉGLAGE — demandé par le père, verbatim : « une option pour activer ou
// désactiver du côté parent le bouton écouter ».
//
// Il ne vit PAS dans les réglages de lecture (`EcranReglagesLecture`) : ceux-là s'ouvrent
// depuis l'écran des profils, **sans code**, donc l'enfant pourrait se rendre ce que le
// parent vient de lui retirer. Un réglage d'adulte se pose derrière le code d'adulte.
//
// Il ne remplace pas D42 et ne le contredit pas : D42 masque le bouton quand aucun clip
// n'existe (honnêteté), ce réglage le masque quand le parent le décide (pédagogie). Les deux
// se composent dans `BoutonEcouter.tsx`, et aucun des deux ne peut annuler l'autre.
// ────────────────────────────────────────────────────────────────────────────────────────
//
// L'état lui-même vit dans `reglages-foyer.ts` — une feuille sans JSX, pour que
// `BoutonEcouter.tsx` puisse le lire sans tirer cet écran dans le bundle de l'enfant.
import { useCallback, useEffect } from 'react';
import type { ReactElement } from 'react';

import {
  REGLAGES_FOYER_PAR_DEFAUT,
  ecrireReglagesFoyer,
  lireReglagesFoyer,
  useReglagesFoyer
} from './reglages-foyer.js';
import type { ReglagesFoyer } from './reglages-foyer.js';

// Ré-exports : `ReglagesParent.tsx` portait ces trois noms avant que l'état n'en sorte.
// Les republier ici évite de faire bouger un seul appelant existant.
export { REGLAGES_FOYER_PAR_DEFAUT, lireReglagesFoyer };
export type { ReglagesFoyer };

export interface ProprietesReglagesParent {
  /** Appelé à chaque changement, pour que la racine applique le réglage tout de suite. */
  readonly surChangement?: (reglages: ReglagesFoyer) => void;
}

export function ReglagesParent({ surChangement }: ProprietesReglagesParent): ReactElement {
  const reglages = useReglagesFoyer();

  const appliquer = useCallback(
    (voulus: Partial<ReglagesFoyer>): void => {
      // L'écriture prévient elle-même le monde de l'enfant : le bouton « Écouter » apparaît
      // ou disparaît dans la seconde, sans rechargement et sans passer par un rendu de ce
      // composant. C'est ce qui rend le réglage vérifiable par le parent, tout de suite.
      //
      // ⚠ L'ÉCRITURE EST SUR SA PROPRE LIGNE, ET CE N'EST PAS DU STYLE.
      // `surChangement?.(ecrireReglagesFoyer(voulus))` court-circuite l'appel ENTIER quand
      // `surChangement` est absent — argument compris. Or `EcranDashboard.tsx` rend
      // `<ReglagesParent />` sans cette propriété : écrit ainsi, AUCUN des quatre réglages
      // n'aurait été enregistré dans l'application réelle, et rien à l'écran ne l'aurait dit.
      // Mesuré par `tests/composants/BoutonEcouter-option-parent.test.tsx` — le cas « le
      // réglage se pose depuis la ZONE PARENT » échouait exactement là-dessus.
      const complets = ecrireReglagesFoyer(voulus);
      surChangement?.(complets);
    },
    [surChangement]
  );

  useEffect(() => {
    // Le même levier que `prefers-reduced-motion`, appliqué sur la racine du document — la
    // règle CSS correspondante vit dans `styles/global.css`, un seul endroit applique.
    if (typeof document === 'undefined') {
      return;
    }
    if (reglages.animationsCalmes) {
      document.documentElement.setAttribute('data-animations', 'desactivees');
    }
  }, [reglages.animationsCalmes]);

  return (
    <section data-indicateur="reglages" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Réglages
      </h2>

      <label style={{ display: 'grid', gap: '0.25rem' }}>
        {`Volume des sons du jeu — ${String(Math.round(reglages.volumeEffets * 100))} %`}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(reglages.volumeEffets * 100)}
          data-reglage="volume-effets"
          onChange={(evenement) =>
            appliquer({ volumeEffets: Number(evenement.target.value) / 100 })
          }
          style={{ minBlockSize: 'var(--cible-min)' }}
        />
      </label>

      <label style={{ display: 'grid', gap: '0.25rem' }}>
        {`Volume des consignes parlées — ${String(Math.round(reglages.volumeVoix * 100))} %`}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(reglages.volumeVoix * 100)}
          data-reglage="volume-voix"
          onChange={(evenement) => appliquer({ volumeVoix: Number(evenement.target.value) / 100 })}
          style={{ minBlockSize: 'var(--cible-min)' }}
        />
      </label>

      <label
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minBlockSize: 'var(--cible-min)' }}
      >
        <input
          type="checkbox"
          checked={reglages.animationsCalmes}
          data-reglage="animations-calmes"
          onChange={(evenement) => appliquer({ animationsCalmes: evenement.target.checked })}
          style={{ inlineSize: '2rem', blockSize: '2rem' }}
        />
        Animations calmes
      </label>

      {/* ─────────────────────────────────────────── le bouton « Écouter », demandé par le père */}
      <label
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minBlockSize: 'var(--cible-min)' }}
      >
        <input
          type="checkbox"
          checked={reglages.boutonEcouter}
          data-reglage="bouton-ecouter"
          onChange={(evenement) => appliquer({ boutonEcouter: evenement.target.checked })}
          style={{ inlineSize: '2rem', blockSize: '2rem' }}
        />
        Proposer le bouton « Écouter » à l’enfant
      </label>

      <p data-note="bouton-ecouter" style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        {reglages.boutonEcouter
          ? // La phrase dit la dette telle qu'elle est (D42) : le père a tapé un bouton muet,
            // il doit savoir pourquoi il ne le voit plus, sinon il croira à une régression.
            'Le bouton n’apparaît que sur les consignes qui ont déjà une voix enregistrée. ' +
              'Tant qu’aucune voix n’est produite, il reste caché : un bouton qui ne répond pas ' +
              'déçoit plus qu’un bouton absent.'
          : 'Le bouton « Écouter » est retiré du jeu. Les consignes restent lisibles à l’écran.'}
      </p>

      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        Ces quatre réglages sont gardés sur cet appareil. La sauvegarde des données de jeu se
        fait par les exports ci-dessus.
      </p>
    </section>
  );
}
