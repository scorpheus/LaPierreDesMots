// La porte de la zone parent — v2 § 11, contrat des features v2 § 3.8.
//
// « Zone parent protégée par un code à 4 chiffres, `scrypt`, verrouillage temporaire après
// 5 échecs. »
//
// TROIS RÈGLES D'ÉCRAN, et elles tiennent toutes à ce qu'un enfant peut tomber là par hasard :
//
//   1. **Aucun reproche, jamais.** Un code faux dit « ce n'est pas ça », pas « erreur » ni
//      « accès refusé ». Le verrou dit *quand* on pourra réessayer, pas *que c'est faux*.
//      C'est la même règle que R14, appliquée à un écran qui n'est pourtant pas du jeu.
//   2. **Aucune couleur d'alarme.** Pas de rouge, pas de croix, pas de secousse.
//   3. **Un pavé à gros chiffres**, cibles ≥ 64 px (R16) : le parent le tape debout, d'une
//      main, avec la tablette dans l'autre.
//
// PLACEHOLDER — à valider : la toute première ouverture POSE le code du foyer (le serveur le
// fait, voir `serveur/src/routes/parent.ts`). L'écran le dit en toutes lettres pour que
// personne ne pose un code par accident.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { ErreurReseau, ouvrirZoneParent } from '../api/client.js';

export interface ProprietesEcranCodeParent {
  /** Appelé une fois le code accepté. */
  readonly surOuverture: () => void;
  /** Retour au monde de l'enfant. */
  readonly surAbandon?: () => void;
}

const LONGUEUR_CODE = 4;
const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

/** L'échéance du verrou, quand le serveur l'a jointe au 423. */
function echeanceDuVerrou(cause: unknown): string | null {
  if (!(cause instanceof ErreurReseau) || cause.statut !== 423) {
    return null;
  }
  const details = cause.corps?.['details'];
  if (typeof details !== 'object' || details === null) {
    return '';
  }
  const jusqua = (details as Record<string, unknown>)['verrouilleJusqua'];
  return typeof jusqua === 'string' ? jusqua : '';
}

/** `2026-09-01T08:15:00.000Z` → `10:15`. Sans `new Date` : on lit la chaîne. */
function heureLisible(horodatage: string): string {
  const heures = horodatage.slice(11, 16);
  return heures === '' ? 'un moment' : `${heures} (UTC)`;
}

export function EcranCodeParent({
  surOuverture,
  surAbandon
}: ProprietesEcranCodeParent): ReactElement {
  const [saisie, fixerSaisie] = useState('');
  const [message, fixerMessage] = useState<string | null>(null);
  const [verrouilleJusqua, fixerVerrou] = useState<string | null>(null);
  const [enCours, fixerEnCours] = useState(false);

  const verrouille = verrouilleJusqua !== null;

  const taper = useCallback(
    (chiffre: string): void => {
      if (verrouille || enCours) {
        return;
      }
      fixerMessage(null);
      fixerSaisie((precedent) => (precedent + chiffre).slice(0, LONGUEUR_CODE));
    },
    [enCours, verrouille]
  );

  const valider = useCallback((): void => {
    if (saisie.length !== LONGUEUR_CODE || enCours || verrouille) {
      return;
    }
    fixerEnCours(true);
    ouvrirZoneParent(saisie)
      .then(() => {
        fixerEnCours(false);
        fixerSaisie('');
        surOuverture();
      })
      .catch((cause: unknown) => {
        fixerEnCours(false);
        fixerSaisie('');
        const echeance = echeanceDuVerrou(cause);
        if (echeance !== null) {
          fixerVerrou(echeance);
          fixerMessage(null);
          return;
        }
        fixerMessage('Ce n’est pas ce code. On réessaie ?');
      });
  }, [enCours, saisie, surOuverture, verrouille]);

  return (
    <main
      data-ecran="code-parent"
      data-parent="code"
      data-verrou={verrouille ? 'actif' : 'inactif'}
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '1.5rem',
        justifyItems: 'center',
        maxInlineSize: '30rem',
        marginInline: 'auto'
      }}
    >
      <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
        Espace du parent
      </h1>

      {verrouille ? (
        <p style={{ margin: 0, textAlign: 'center', fontSize: '1.125rem' }}>
          L’espace est fermé un moment. Il rouvre vers{' '}
          {heureLisible(verrouilleJusqua)}.
        </p>
      ) : (
        <p style={{ margin: 0, textAlign: 'center' }}>
          Tape le code à quatre chiffres. Au tout premier passage, le code que tu tapes devient
          celui du foyer.
        </p>
      )}

      <output
        aria-label={`Code saisi : ${String(saisie.length)} chiffre(s) sur ${String(LONGUEUR_CODE)}`}
        data-code-longueur={String(saisie.length)}
        style={{ display: 'flex', gap: '1rem' }}
      >
        {Array.from({ length: LONGUEUR_CODE }, (_, rang) => (
          <span
            key={rang}
            aria-hidden="true"
            style={{
              inlineSize: '1.5rem',
              blockSize: '1.5rem',
              borderRadius: '50%',
              border: '3px solid var(--trait)',
              background: rang < saisie.length ? 'var(--trait)' : 'transparent'
            }}
          />
        ))}
      </output>

      <div
        role="group"
        aria-label="Pavé numérique"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))', gap: '1rem' }}
      >
        {TOUCHES.map((chiffre) => (
          <button
            key={chiffre}
            type="button"
            className="cible"
            data-touche={chiffre}
            disabled={verrouille || enCours}
            onClick={() => taper(chiffre)}
            style={{ fontSize: '1.75rem', minBlockSize: 'var(--cible-min)' }}
          >
            {chiffre}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="cible cible-secondaire"
          onClick={() => fixerSaisie('')}
          disabled={saisie === '' || enCours}
        >
          Effacer
        </button>
        <button
          type="button"
          className="cible cible-appel"
          data-valider="code-parent"
          onClick={valider}
          disabled={saisie.length !== LONGUEUR_CODE || enCours || verrouille}
        >
          {enCours ? 'On vérifie…' : 'Entrer'}
        </button>
        {surAbandon === undefined ? null : (
          <button type="button" className="cible cible-secondaire" onClick={surAbandon}>
            Retour au jeu
          </button>
        )}
      </div>

      {/* Jamais de rouge, jamais de croix : une phrase, et on recommence. */}
      {message === null ? null : (
        <p role="status" style={{ margin: 0, fontSize: '1.125rem' }}>
          {message}
        </p>
      )}
    </main>
  );
}
