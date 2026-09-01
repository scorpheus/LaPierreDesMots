// La PREMIÈRE DÉFINITION du code parent — lot N5, contrat de finition v3 § 1.8 et § 4.5.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// CE QUE CET ÉCRAN RÉPARE, ET POURQUOI IL FALLAIT UN ÉCRAN
//
// Mesuré au contrat § 1.8 : `POST /api/parent/ouvrir` posait le code du foyer au premier
// appel. « Un enfant curieux qui tape `1234` devient propriétaire du code parent, sans qu'un
// écran l'ait jamais demandé. »
//
// La correction serveur (404 au lieu d'une pose silencieuse) est la moitié du remède ; sans
// écran, elle transformerait simplement le défaut en impasse — et une impasse est le pire bug
// possible sur cette application. Cet écran est l'autre moitié : il rend le moment de la
// définition VISIBLE, et il dit en toutes lettres ce qui va se passer.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// QUATRE DÉCISIONS D'ÉCRAN, chacune avec sa raison :
//
//   1. **Les chiffres sont montrés EN CLAIR**, contrairement à l'écran d'ouverture qui les
//      masque par des pastilles. Ce n'est pas une authentification : il n'y a rien à protéger
//      d'un regard tant que le code n'existe pas. Et un code mal tapé qu'on ne voit pas
//      enfermerait le parent dehors de sa propre maison — exactement ce que le § 7.3 refuse.
//      Montrer les chiffres remplace la double saisie, et coûte un tap au lieu de cinq.
//   2. **Le même contrat DOM que `EcranCodeParent`** : `data-ecran="code-parent"`,
//      `data-parent="code"`, `data-touche`, `data-valider="code-parent"`. Vu du dehors, c'est
//      la même porte ; `data-parent-mode="definition"` dit ce qui change derrière. Les quatre
//      suites qui traversent déjà cette porte continuent de la traverser sans être touchées.
//   3. **Aucun reproche, aucune couleur d'alarme**, comme `EcranCodeParent` — un enfant peut
//      tomber là par hasard, et il ne doit rien y trouver d'inquiétant.
//   4. **Une sortie existe toujours**, y compris pendant l'envoi. Aucun état sans issue.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { ErreurReseau, definirCodeParent } from '../api/client.js';

export interface ProprietesEcranDefinirCode {
  /** Appelé une fois le code posé et le jeton en main. */
  readonly surDefinition: () => void;
  /** Retour au monde de l'enfant. */
  readonly surAbandon?: () => void;
  /**
   * Vrai quand un code existe déjà et que le parent en change, jeton en main.
   * Le titre et le texte changent ; le mécanisme, non.
   */
  readonly redefinition?: boolean;
}

const LONGUEUR_CODE = 4;
const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

export function EcranDefinirCode({
  surDefinition,
  surAbandon,
  redefinition = false
}: ProprietesEcranDefinirCode): ReactElement {
  const [saisie, fixerSaisie] = useState('');
  const [message, fixerMessage] = useState<string | null>(null);
  const [enCours, fixerEnCours] = useState(false);
  const codeComplet = saisie.length === LONGUEUR_CODE;

  const taper = useCallback((chiffre: string): void => {
    if (enCours) {
      return;
    }
    fixerMessage(null);
    fixerSaisie((precedent) => (precedent + chiffre).slice(0, LONGUEUR_CODE));
  }, [enCours]);

  const poser = useCallback((): void => {
    if (saisie.length !== LONGUEUR_CODE || enCours) {
      return;
    }
    fixerEnCours(true);
    definirCodeParent(saisie)
      .then(() => {
        fixerEnCours(false);
        fixerSaisie('');
        surDefinition();
      })
      .catch((cause: unknown) => {
        fixerEnCours(false);
        fixerSaisie('');
        // Le 409 est le seul cas métier : quelqu'un a posé un code entre le chargement de
        // l'écran et ce tap. On le DIT, et on dit quoi faire — jamais « erreur ».
        if (cause instanceof ErreurReseau && cause.statut === 409) {
          fixerMessage(
            'Un code existe déjà pour ce foyer. Ferme cette page et entre-le pour ouvrir l’espace.'
          );
          return;
        }
        fixerMessage('La Pierre n’a pas répondu. On réessaie ?');
      });
  }, [enCours, saisie, surDefinition]);

  return (
    <main
      // Vu du dehors, c'est la porte parent — même `data-ecran`, même `data-parent`.
      // `data-parent-mode` est le seul attribut neuf, et il dit ce qui se passe derrière.
      data-ecran="code-parent"
      data-parent="code"
      data-parent-mode="definition"
      data-verrou="inactif"
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
        {redefinition ? 'Changer le code' : 'Choisis le code du foyer'}
      </h1>

      <p style={{ margin: 0, textAlign: 'center' }}>
        {redefinition
          ? 'Tape le nouveau code à quatre chiffres. L’ancien cessera de fonctionner.'
          : 'Quatre chiffres, choisis par toi. Ils ouvriront l’espace du parent — le suivi, les ' +
            'exercices et les réglages. Note-les quelque part : personne ne peut les retrouver à ta place.'}
      </p>

      {/* Les chiffres EN CLAIR : voir la décision n° 1 en tête de fichier. */}
      <output
        aria-label={`Code choisi : ${saisie === '' ? 'aucun chiffre' : saisie.split('').join(' ')}`}
        data-code-longueur={String(saisie.length)}
        data-code-en-clair="oui"
        style={{ display: 'flex', gap: '1rem' }}
      >
        {Array.from({ length: LONGUEUR_CODE }, (_, rang) => (
          <span
            key={rang}
            aria-hidden="true"
            style={{
              inlineSize: '2.5rem',
              blockSize: '3rem',
              display: 'grid',
              placeItems: 'center',
              fontSize: '2rem',
              borderRadius: '0.5rem',
              border: '3px solid var(--trait)'
            }}
          >
            {saisie[rang] ?? ''}
          </span>
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
            disabled={enCours || codeComplet}
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
          data-definir="code-parent"
          onClick={poser}
          disabled={saisie.length !== LONGUEUR_CODE || enCours}
        >
          {enCours ? 'On enregistre…' : redefinition ? 'Changer le code' : 'Poser ce code'}
        </button>
        {/* La sortie existe TOUJOURS, même pendant l'envoi : aucun état sans issue. */}
        {surAbandon === undefined ? null : (
          <button type="button" className="cible cible-secondaire" onClick={surAbandon}>
            Retour au jeu
          </button>
        )}
      </div>

      {message === null ? null : (
        <p role="status" style={{ margin: 0, fontSize: '1.125rem' }}>
          {message}
        </p>
      )}
    </main>
  );
}
