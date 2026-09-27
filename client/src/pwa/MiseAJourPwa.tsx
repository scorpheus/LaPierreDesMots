import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';

import {
  appliquerMiseAJour,
  ecouterMiseAJour,
  lireEtatMiseAJour,
  reporterMiseAJour,
  verifierMiseAJour,
  type EtatMiseAJour
} from './mise-a-jour.js';
import './mise-a-jour.css';

const LIBELLES_PHASE: Readonly<Record<EtatMiseAJour['phase'], string>> = {
  indisponible: 'Indisponible',
  repos: 'Prête à vérifier',
  verification: 'Vérification en cours',
  telechargement: 'Téléchargement en cours',
  prete: 'Mise à jour prête',
  application: 'Mise à jour en cours',
  erreur: 'Mise à jour à réessayer'
};

function utiliserEtatMiseAJour(): EtatMiseAJour {
  return useSyncExternalStore(ecouterMiseAJour, lireEtatMiseAJour, lireEtatMiseAJour);
}

function peutAppliquer(etat: EtatMiseAJour): boolean {
  return etat.versionPrete !== null
    && etat.phase !== 'verification'
    && etat.phase !== 'telechargement'
    && etat.phase !== 'application';
}

/** Le parent retrouve ici la version prête, même après avoir choisi « Plus tard ». */
export function PanneauMiseAJourPwa(): ReactElement | null {
  const etat = utiliserEtatMiseAJour();
  const titre = useId();
  if (import.meta.env.MODE !== 'pwa') return null;

  const occupe = etat.phase === 'verification'
    || etat.phase === 'telechargement'
    || etat.phase === 'application';

  return (
    <section
      className="zone-lecture mise-a-jour mise-a-jour-panneau"
      data-mise-a-jour-pwa={etat.phase}
      aria-labelledby={titre}
    >
      <h2 id={titre} className="titre">Mise à jour du jeu</h2>
      <p>Version utilisée : <span className="mise-a-jour-version">{etat.versionInstallee ?? 'inconnue'}</span></p>
      {etat.versionPrete === null ? null : (
        <p>Version prête : <span className="mise-a-jour-version">{etat.versionPrete}</span></p>
      )}
      <div role="status" aria-live="polite" aria-atomic="true">
        <p>État : {LIBELLES_PHASE[etat.phase]}.</p>
        {etat.message === '' ? null : <p>{etat.message}</p>}
      </div>
      <div className="mise-a-jour-actions">
        <button
          type="button"
          className="cible"
          disabled={occupe || etat.phase === 'indisponible'}
          onClick={() => void verifierMiseAJour()}
        >
          Vérifier les mises à jour
        </button>
        {peutAppliquer(etat) ? <>
          <button type="button" className="cible cible-appel" onClick={() => void appliquerMiseAJour()}>
            Mettre à jour
          </button>
          <button type="button" className="cible" onClick={reporterMiseAJour}>
            Plus tard
          </button>
        </> : null}
      </div>
    </section>
  );
}

/** showModal rend le reste du document inerte jusqu'au rechargement ou à une erreur. */
function BlocageMiseAJourPwa(): ReactElement {
  const dialogue = useRef<HTMLDialogElement>(null);
  const titre = useId();
  useLayoutEffect(() => {
    const element = dialogue.current;
    if (element === null) return;
    element.showModal();
    return () => { element.close(); };
  }, []);

  return (
    <dialog
      ref={dialogue}
      className="zone-lecture mise-a-jour mise-a-jour-dialogue"
      aria-labelledby={titre}
      aria-modal="true"
      aria-busy="true"
      onCancel={(evenement) => evenement.preventDefault()}
    >
      <h2 id={titre} className="titre">Le jeu se prépare…</h2>
      <p role="status">Un petit instant.</p>
    </dialog>
  );
}

/** L'application autorise cet encart seulement aux moments où le jeu peut être rechargé. */
export function NotificationMiseAJourPwa({ visible }: { readonly visible: boolean }): ReactElement | null {
  const etat = utiliserEtatMiseAJour();
  const [applicationDemandee, fixerApplicationDemandee] = useState(false);
  if (import.meta.env.MODE !== 'pwa') return null;

  // Le blocage reste global : il protège aussi une application lancée depuis l'espace parent.
  if (etat.phase === 'application') return <BlocageMiseAJourPwa />;
  if (!visible || etat.reportee) return null;

  const erreurApresClic = etat.phase === 'erreur' && applicationDemandee;
  if (etat.phase !== 'prete' && !erreurApresClic) return null;

  return (
    <aside
      className="zone-lecture mise-a-jour mise-a-jour-notification"
      data-notification-mise-a-jour={erreurApresClic ? 'erreur' : 'prete'}
      aria-label="Mise à jour du jeu"
    >
      <p><strong>Pour les parents</strong></p>
      <p role="status" aria-live="polite">
        {erreurApresClic
          ? etat.message
          : 'Une nouvelle version du jeu est prête.'}
      </p>
      <div className="mise-a-jour-actions">
        {peutAppliquer(etat) ? <button
          type="button"
          className="cible cible-appel"
          onClick={() => {
            fixerApplicationDemandee(true);
            void appliquerMiseAJour();
          }}
        >
          Mettre à jour
        </button> : null}
        <button type="button" className="cible" onClick={reporterMiseAJour}>
          Plus tard
        </button>
      </div>
    </aside>
  );
}
