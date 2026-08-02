// La galerie d'exercices de la zone parent — D34, lot N5.
//
// « Galerie parent : tout exercice lançable, RIEN de journalisé, invisible côté enfant. »
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// CE QUE CET ÉCRAN ACHÈTE, ET QUI N'ÉTAIT ACHETABLE NULLE PART AILLEURS
//
// R12 (« ≥ 3 moteurs par compétence ») et R13 (« jamais deux fois le même habillage dans une
// sortie ») sont des critères de recette vérifiés par des tests. Un test qui passe dit
// « c'est vrai », il ne dit pas « voilà à quoi ça ressemble ». Les deux tables de croisement
// ci-dessous rendent les deux règles LISIBLES À L'ŒIL, sur le contenu réel du dépôt, par un
// adulte qui n'ouvrira jamais un fichier de test.
//
// Et c'est précisément là qu'un défaut se voit sans qu'on l'ait cherché : une compétence
// travaillée par un seul moteur, un moteur qui n'a qu'un habillage, un exercice qui ne
// déclare aucune compétence. Aucun de ces trois cas ne fait échouer quoi que ce soit
// aujourd'hui ; tous les trois se voient ici en une seconde.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// AUCUN FILTRE, NULLE PART. Il n'y a pas de champ de recherche, pas de sélecteur de région,
// pas de « masquer les brouillons ». D34 dit « tout exercice lançable » ; la façon la plus
// sûre de le tenir est qu'il n'existe aucun endroit où écrire un filtre.
import type { ReactElement } from 'react';
import type { CodeMoteur } from '@pierre/partage';
import type {
  CatalogueGalerie,
  EntreeGalerie,
  OptionsLancement
} from '@pierre/partage/parent';
import { FicheExercice } from './FicheExercice.js';

export interface ProprietesGalerieExercices {
  readonly catalogue: CatalogueGalerie;
  readonly surLancer?: (entree: EntreeGalerie, options: OptionsLancement) => void;
}

/** Le seuil de R12, repris du critère de recette et non recalculé. */
const MOTEURS_MINIMUM_PAR_COMPETENCE = 3;

export function GalerieExercices({
  catalogue,
  surLancer
}: ProprietesGalerieExercices): ReactElement {
  const competences = Object.keys(catalogue.moteursParCompetence).sort();
  // `CodeMoteur` est une union FERMÉE (`partage/src/identifiants.ts:77`) : `Object.keys` rend
  // des `string`, et TypeScript refuse à juste titre de les employer comme index. On restreint
  // ici, une fois, plutôt qu'à chacun des deux sites de lecture — et le catalogue vient du
  // serveur, qui n'y met que les moteurs déclarés par les exercices.
  const moteurs = Object.keys(catalogue.habillagesParMoteur).sort() as readonly CodeMoteur[];

  return (
    <section
      data-indicateur="galerie"
      data-galerie-total={String(catalogue.entrees.length)}
      style={{ display: 'grid', gap: '1rem' }}
    >
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Tous les exercices
      </h2>

      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        Les {catalogue.entrees.length} exercices du jeu, dans l’ordre. Tu peux tous les lancer,
        même ceux que l’enfant n’a pas encore rencontrés.{' '}
        <strong>Rien de ce que tu joues ici n’entre dans son suivi.</strong>
      </p>

      {catalogue.entrees.length === 0 ? (
        // Un catalogue vide ne laisse JAMAIS une page blanche : il dit ce qu'il en est, et où
        // regarder. Une page blanche est un état sans issue déguisé en chargement terminé.
        <p style={{ margin: 0 }}>
          Aucun exercice n’est encore installé. Ils se déposent dans{' '}
          <code>contenu/exercices/</code>.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))'
          }}
        >
          {catalogue.entrees.map((entree) => (
            <FicheExercice
              key={String(entree.exercice)}
              entree={entree}
              {...(surLancer === undefined ? {} : { surLancer })}
            />
          ))}
        </div>
      )}

      {/* ── R12, rendue lisible ────────────────────────────────────────────────────────── */}
      <h3 style={{ fontSize: '1.25rem', margin: '0.5rem 0 0' }}>
        Combien de jeux différents par compétence&nbsp;?
      </h3>
      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        La variété promise tient si chaque compétence est travaillée par au moins{' '}
        {MOTEURS_MINIMUM_PAR_COMPETENCE} jeux différents.
      </p>
      {competences.length === 0 ? (
        <p style={{ margin: 0 }}>Aucun exercice ne déclare de compétence.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>Compétence</th>
              <th scope="col" style={{ textAlign: 'right' }}>Jeux</th>
              <th scope="col" style={{ textAlign: 'left' }}>Lesquels</th>
            </tr>
          </thead>
          <tbody>
            {competences.map((competence) => {
              const liste = catalogue.moteursParCompetence[competence] ?? [];
              return (
                <tr
                  key={competence}
                  data-galerie-competence={competence}
                  data-galerie-nb-moteurs={String(liste.length)}
                  style={{ borderTop: '1px solid var(--grisaille)' }}
                >
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 'normal' }}>
                    {competence}
                  </th>
                  <td style={{ textAlign: 'right' }}>{liste.length}</td>
                  {/* Jamais de rouge ni de croix, même dans la zone parent : on dit le fait,
                      et ce qu'il reste à faire. C'est la même règle que R14, appliquée à un
                      écran qui n'est pourtant pas du jeu. */}
                  <td>
                    {liste.map(String).join(', ')}
                    {liste.length < MOTEURS_MINIMUM_PAR_COMPETENCE
                      ? ` — ${String(MOTEURS_MINIMUM_PAR_COMPETENCE - liste.length)} de plus à écrire`
                      : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── R13, rendue lisible ────────────────────────────────────────────────────────── */}
      <h3 style={{ fontSize: '1.25rem', margin: '0.5rem 0 0' }}>
        Combien de décors par jeu&nbsp;?
      </h3>
      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        Une sortie ne montre jamais deux fois le même décor. Un jeu qui n’a qu’un décor ne peut
        donc apparaître qu’une fois par sortie.
      </p>
      {moteurs.length === 0 ? (
        <p style={{ margin: 0 }}>Aucun exercice n’est installé.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left' }}>Jeu</th>
              <th scope="col" style={{ textAlign: 'right' }}>Décors</th>
              <th scope="col" style={{ textAlign: 'left' }}>Lesquels</th>
            </tr>
          </thead>
          <tbody>
            {moteurs.map((moteur) => {
              const liste = catalogue.habillagesParMoteur[moteur] ?? [];
              return (
                <tr
                  key={moteur}
                  data-galerie-moteur-ligne={moteur}
                  data-galerie-nb-habillages={String(liste.length)}
                  style={{ borderTop: '1px solid var(--grisaille)' }}
                >
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 'normal' }}>
                    {moteur}
                  </th>
                  <td style={{ textAlign: 'right' }}>{liste.length}</td>
                  <td>{liste.map(String).join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
