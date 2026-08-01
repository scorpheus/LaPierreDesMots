// Bouton « écouter » — R15, règle non négociable de CLAUDE.md.
//
// « Aucune consigne n'existe uniquement à l'écrit. Tout est audible en un tap, réécoutable
// sans limite, sans coût en étoiles. »
//
// Trois propriétés portées par ce composant, et opposables en revue :
//   1. il n'émet AUCUNE action de moteur — la réécoute ne peut donc pas coûter une étoile ;
//   2. il n'est jamais désactivé, jamais compté, jamais limité ;
//   3. il fait 64 × 64 px au minimum (R16), via la classe `.cible`.
//
// En v1 il n'y a aucun clip pré-rendu (écart assumé n° 4) : le fournisseur journalise. Le
// bouton existe quand même, et c'est délibéré — la dette se lève au lot L2 sans toucher ici.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { CheminAsset } from '@pierre/partage';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';

export interface ProprietesBoutonEcouter {
  /** Texte à faire dire. Toujours renseigné : c'est lui qui est lu quand aucun clip n'existe. */
  readonly texte: string;
  /** Clip pré-rendu, `null` en v1. */
  readonly clip?: CheminAsset | null;
  /** `narrateur` par défaut, `gobi` pour l'aide. */
  readonly locuteur?: string;
  /** Libellé accessible. Le défaut convient à une consigne. */
  readonly libelle?: string;
  /** Appelé APRÈS la lecture. Sert à journaliser une réécoute, jamais à la facturer. */
  readonly surEcoute?: () => void;
}

export function BoutonEcouter({
  texte,
  clip = null,
  locuteur = 'narrateur',
  libelle = 'Écouter la consigne',
  surEcoute
}: ProprietesBoutonEcouter): ReactElement {
  const services = useServices();
  const [enLecture, fixerEnLecture] = useState(false);

  const ecouter = useCallback((): void => {
    fixerEnLecture(true);
    void direTexte(services.voix, texte, clip, locuteur).finally(() => {
      fixerEnLecture(false);
      surEcoute?.();
    });
  }, [services, texte, clip, locuteur, surEcoute]);

  return (
    <button
      type="button"
      className="cible cible-appel bouton-ecouter"
      // `data-action="ecouter"` — ajouté à l'intégration de la campagne v2.
      //
      // C'est la prise mécanique de R15 (« aucune consigne n'existe uniquement à l'écrit »),
      // et les onze moteurs de L2-E la portent déjà sur leur propre bouton. Ce bouton-ci est
      // celui de la COQUILLE — le seul que voient les nœuds `colorie`, `place` et `trace`, qui
      // n'en rendent pas d'autre. Sans l'attribut, `parcours-variete` mesurait zéro réécoute
      // sur ces trois moteurs alors que le bouton était bien à l'écran : le défaut n'était pas
      // l'absence du bouton, c'était l'absence de la marque.
      data-action="ecouter"
      onClick={ecouter}
      aria-label={libelle}
      // JAMAIS `disabled` : réécouter pendant la lecture relance, ça ne bloque pas.
      aria-busy={enLecture ? 'true' : 'false'}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 9v6h4l5 4V5L8 9H4z"
          fill="var(--trait)"
          stroke="var(--trait)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="var(--trait)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span>Écouter</span>
    </button>
  );
}
