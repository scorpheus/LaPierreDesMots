// Règle de lecture — lot L2-B, v2 § 9.3.
//
// La règle en carton qu'on pose sous la ligne pour ne pas se perdre. Ici, deux grandes cibles
// et un repère qui se déplace d'une ligne à la fois.
//
// Trois contraintes qui ont décidé de la forme :
//
//  1. **R16** : cibles ≥ 64 px, aucune coordination fine. Une règle qu'on ferait GLISSER au
//     doigt jusqu'à la bonne ligne serait exactement la coordination fine que R16 interdit.
//     Deux boutons « ligne suivante » / « ligne précédente » font le même travail sans viser.
//  2. **Aucune animation dans le champ de lecture** (v2 § 9.3). Le repère se pose, il ne glisse
//     pas. Sa transition est portée par `global.css` et tombe à 1 ms sous `prefers-reduced-motion`
//     comme tout le reste.
//  3. **Aucun écran d'échec, aucune impasse** (R14) : arrivé à la dernière ligne, le bouton
//     « suivante » est simplement désactivé. Il n'y a rien à rater ici.
import type { ReactElement } from 'react';

export interface ProprietesRegleDeLecture {
  readonly ligneCourante: number;
  readonly nbLignes: number;
  readonly surChangement: (rang: number) => void;
}

export function RegleDeLecture({
  ligneCourante,
  nbLignes,
  surChangement,
}: ProprietesRegleDeLecture): ReactElement {
  const derniere = Math.max(nbLignes - 1, 0);
  const rang = Math.min(Math.max(ligneCourante, 0), derniere);

  return (
    <div
      className="regle-de-lecture"
      data-regle="oui"
      data-regle-ligne={String(rang)}
      role="group"
      aria-label="Règle de lecture"
    >
      <button
        type="button"
        className="cible"
        data-regle-action="precedente"
        disabled={rang <= 0}
        onClick={() => {
          surChangement(rang - 1);
        }}
        aria-label="Ligne précédente"
      >
        <span aria-hidden="true">▲</span>
      </button>

      <p className="regle-de-lecture-position" aria-live="polite">
        Ligne {String(rang + 1)} sur {String(Math.max(nbLignes, 1))}
      </p>

      <button
        type="button"
        className="cible"
        data-regle-action="suivante"
        disabled={rang >= derniere}
        onClick={() => {
          surChangement(rang + 1);
        }}
        aria-label="Ligne suivante"
      >
        <span aria-hidden="true">▼</span>
      </button>
    </div>
  );
}
