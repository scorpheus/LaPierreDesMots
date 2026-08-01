// Réglages de la zone parent — v2 § 14 : « réglages, exports CSV, sauvegarde en un clic ».
//
// PLACEHOLDER — à valider (consigné dans `Docs/questions-en-attente.md`). Le contrat gelé
// n'accorde à ce lot AUCUNE route pour persister ces trois réglages : les 12 routes du § 5.3
// n'en portent aucune. Deux issues étaient possibles — inventer une route hors contrat, ou
// stocker localement. On stocke localement, dans `localStorage`, sur l'appareil du parent :
//   • rien de pédagogique n'y est écrit — ce sont des préférences de confort ;
//   • aucun autre lot n'est bloqué par ce choix ;
//   • le jour où une route existe, seul ce fichier bouge.
//
// « Animations calmes » n'est pas un réglage d'accessibilité de plus : c'est le même levier que
// `prefers-reduced-motion`, exposé au parent parce que la tablette du salon ne le propose pas.
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';

/** Clé unique dans `localStorage`. Préfixée : la borne peut servir à autre chose. */
const CLE_STOCKAGE = 'pierre.reglages-parent';

export interface ReglagesFoyer {
  /** Volume des effets sonores, de 0 à 1. */
  readonly volumeEffets: number;
  /** Volume des voix et consignes, de 0 à 1. R15 : jamais coupé à zéro par défaut. */
  readonly volumeVoix: number;
  /** Animations calmes : le décor bouge moins, le texte ne bouge jamais (v2 § 9.3). */
  readonly animationsCalmes: boolean;
}

export const REGLAGES_FOYER_PAR_DEFAUT: ReglagesFoyer = {
  volumeEffets: 0.8,
  volumeVoix: 1,
  animationsCalmes: false
};

export function lireReglagesFoyer(): ReglagesFoyer {
  try {
    const brut = globalThis.localStorage?.getItem(CLE_STOCKAGE);
    if (brut === null || brut === undefined) {
      return REGLAGES_FOYER_PAR_DEFAUT;
    }
    const analyse = JSON.parse(brut) as Partial<ReglagesFoyer>;
    return {
      volumeEffets: borner(analyse.volumeEffets, REGLAGES_FOYER_PAR_DEFAUT.volumeEffets),
      volumeVoix: borner(analyse.volumeVoix, REGLAGES_FOYER_PAR_DEFAUT.volumeVoix),
      animationsCalmes: analyse.animationsCalmes === true
    };
  } catch {
    // Un stockage abîmé ne doit pas fermer la zone parent : on repart des défauts.
    return REGLAGES_FOYER_PAR_DEFAUT;
  }
}

function borner(valeur: unknown, defaut: number): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    return defaut;
  }
  // Hors bornes, on RAMÈNE, on ne rejette jamais : un réglage refusé bloquerait l'écran.
  return Math.min(1, Math.max(0, valeur));
}

export interface ProprietesReglagesParent {
  /** Appelé à chaque changement, pour que la racine applique le réglage tout de suite. */
  readonly surChangement?: (reglages: ReglagesFoyer) => void;
}

export function ReglagesParent({ surChangement }: ProprietesReglagesParent): ReactElement {
  const [reglages, fixerReglages] = useState<ReglagesFoyer>(lireReglagesFoyer);

  const appliquer = useCallback(
    (suivants: ReglagesFoyer): void => {
      fixerReglages(suivants);
      try {
        globalThis.localStorage?.setItem(CLE_STOCKAGE, JSON.stringify(suivants));
      } catch {
        // Mode privé, quota plein : le réglage vaut pour la session et c'est déjà utile.
      }
      surChangement?.(suivants);
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
            appliquer({ ...reglages, volumeEffets: Number(evenement.target.value) / 100 })
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
          onChange={(evenement) =>
            appliquer({ ...reglages, volumeVoix: Number(evenement.target.value) / 100 })
          }
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
          onChange={(evenement) =>
            appliquer({ ...reglages, animationsCalmes: evenement.target.checked })
          }
          style={{ inlineSize: '2rem', blockSize: '2rem' }}
        />
        Animations calmes
      </label>

      <p style={{ margin: 0, color: 'var(--grisaille)' }}>
        Ces trois réglages sont gardés sur cet appareil. La sauvegarde des données de jeu se
        fait par les exports ci-dessus.
      </p>
    </section>
  );
}
