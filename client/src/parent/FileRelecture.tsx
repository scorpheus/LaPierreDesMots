// La file de relecture — v2 § 13.4, règle non négociable de CLAUDE.md.
//
// « Aucun contenu n'atteint l'enfant sans validation humaine. » Tout ce qu'un agent produit
// passe par `contenu/brouillons/`, et cette liste est la porte. Un brouillon rejeté reste
// rejeté : il ne réapparaît pas au prochain démarrage, sinon la file cesserait d'être une file.
//
// Le motif de rejet est FACULTATIF mais proposé : c'est lui qui rend le rejet exploitable par
// l'agent qui regénérera le contenu.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { IdExercice } from '@pierre/partage';
import type { DecisionRelecture, EntreeRelecture } from '@pierre/partage/parent';

export interface ProprietesFileRelecture {
  readonly entrees: readonly EntreeRelecture[];
  readonly surDecision: (exercice: IdExercice, decision: DecisionRelecture) => void;
}

const LIBELLE_STATUT: Readonly<Record<EntreeRelecture['statut'], string>> = {
  'en-attente': 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté'
};

export function FileRelecture({ entrees, surDecision }: ProprietesFileRelecture): ReactElement {
  const [motifs, fixerMotifs] = useState<Readonly<Record<string, string>>>({});
  const enAttente = entrees.filter((entree) => entree.statut === 'en-attente');
  const traitees = entrees.filter((entree) => entree.statut !== 'en-attente');

  const motifDe = (exercice: string): string => motifs[exercice] ?? '';

  return (
    <section data-indicateur="relecture" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Contenus à relire
      </h2>
      <p style={{ margin: 0, color: 'var(--grisaille)' }}>
        Rien de ce qui est listé ici n’a encore été proposé à l’enfant.
      </p>

      {enAttente.length === 0 ? (
        <p style={{ margin: 0 }}>Aucun brouillon en attente.</p>
      ) : (
        <ul style={{ display: 'grid', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {enAttente.map((entree) => (
            <li
              key={entree.exercice}
              data-relecture={entree.exercice}
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '1rem',
                border: '2px solid var(--grisaille)',
                borderRadius: 'var(--rayon-carte)'
              }}
            >
              <strong>{entree.exercice}</strong>
              <code style={{ fontSize: '0.875rem', color: 'var(--grisaille)' }}>
                {entree.chemin}
              </code>
              <label style={{ display: 'grid', gap: '0.25rem' }}>
                Motif (facultatif)
                <input
                  type="text"
                  value={motifDe(entree.exercice)}
                  onChange={(evenement) =>
                    fixerMotifs((precedent) => ({
                      ...precedent,
                      [entree.exercice]: evenement.target.value
                    }))
                  }
                  style={{
                    minBlockSize: 'var(--cible-min)',
                    fontSize: '1rem',
                    padding: '0 0.75rem',
                    borderRadius: '12px',
                    border: '2px solid var(--grisaille)'
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="cible cible-appel"
                  onClick={() => {
                    const motif = motifDe(entree.exercice).trim();
                    surDecision(entree.exercice, {
                      statut: 'valide',
                      ...(motif === '' ? {} : { motif })
                    });
                  }}
                >
                  Valider
                </button>
                <button
                  type="button"
                  className="cible cible-secondaire"
                  onClick={() => {
                    const motif = motifDe(entree.exercice).trim();
                    surDecision(entree.exercice, {
                      statut: 'rejete',
                      ...(motif === '' ? {} : { motif })
                    });
                  }}
                >
                  Rejeter
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {traitees.length === 0 ? null : (
        <details>
          <summary style={{ minBlockSize: 'var(--cible-min)', cursor: 'pointer' }}>
            {`Déjà tranchés (${String(traitees.length)})`}
          </summary>
          <ul style={{ display: 'grid', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {traitees.map((entree) => (
              <li key={entree.exercice} data-relecture={entree.exercice}>
                {`${entree.exercice} — ${LIBELLE_STATUT[entree.statut]}`}
                {entree.motif === null ? '' : ` (${entree.motif})`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
