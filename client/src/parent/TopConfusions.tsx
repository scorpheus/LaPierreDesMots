// Le top 10 des confusions, **par axe** — D23, v2 § 14.
//
// LA RÈGLE QUI COMMANDE CE FICHIER : « distinguer les AXES de confusion, jamais traiter
// b/d/p/q en bloc ». `b`↔`d` est un miroir gauche-droite, `b`↔`p` un miroir haut-bas ; ce sont
// deux mécanismes différents et un enfant peut être gêné par l'un et pas par l'autre. Le
// tableau les sépare visuellement ET dans le DOM (`data-confusion-axe`), et les deux groupes
// ne se mélangent jamais dans une même ligne.
//
// Deuxième règle, aussi importante et moins visible : **le nombre de confusions écartées faute
// d'axe est AFFICHÉ**. Sans lui, un tableau vide voudrait dire à la fois « il ne confond plus
// rien » et « aucun moteur ne journalise l'axe » — et c'est exactement le défaut du détecteur
// qui déclare un poids qu'il n'applique jamais.
import type { ReactElement } from 'react';
import type { CodeCompetence } from '@pierre/partage';
import type { ConfusionAgregee } from '@pierre/partage/parent';

export interface ProprietesTopConfusions {
  readonly confusions: readonly ConfusionAgregee[];
  /** Confusions observées sans axe identifiable, donc hors du tableau. */
  readonly ecartees: number;
  /** « Travailler ça » : injecte ces compétences en priorité dans la prochaine sortie. */
  readonly surTravailler?: (competences: readonly CodeCompetence[]) => void;
}

const LIBELLE_AXE: Readonly<Record<ConfusionAgregee['axe'], string>> = {
  'gauche-droite': 'Miroir gauche-droite',
  'haut-bas': 'Miroir haut-bas'
};

/** Une pente négative est une bonne nouvelle : la confusion recule. On le DIT, en toutes lettres. */
function libelleTendance(pente: number): string {
  if (pente < -0.05) {
    return 'en recul';
  }
  if (pente > 0.05) {
    return 'en hausse';
  }
  return 'stable';
}

export function TopConfusions({
  confusions,
  ecartees,
  surTravailler
}: ProprietesTopConfusions): ReactElement {
  const parAxe = (['gauche-droite', 'haut-bas'] as const).map((axe) => ({
    axe,
    lignes: confusions.filter((ligne) => ligne.axe === axe)
  }));

  return (
    <section data-indicateur="confusions" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Lettres confondues
      </h2>
      <p style={{ margin: 0, color: 'var(--grisaille)' }}>
        Les inversions touchent plus de 80&nbsp;% des enfants en CP&nbsp;: c’est une étape
        normale. Ce qui se suit ici, c’est le sens de la courbe, axe par axe.
      </p>

      {parAxe.map(({ axe, lignes }) => (
        <div key={axe} style={{ display: 'grid', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', margin: 0 }}>{LIBELLE_AXE[axe]}</h3>
          {lignes.length === 0 ? (
            <p style={{ margin: 0 }}>Rien à signaler sur cet axe.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>Lu</th>
                  <th scope="col" style={{ textAlign: 'left' }}>À la place de</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Fois</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Temps</th>
                  <th scope="col" style={{ textAlign: 'left' }}>Évolution</th>
                  <th scope="col" style={{ textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne) => (
                  <tr
                    key={`${ligne.attendu}-${ligne.rendu}-${ligne.axe}`}
                    // L'attribut du contrat § 7 : une ligne, UN axe. Jamais les deux.
                    data-confusion-axe={ligne.axe}
                    style={{ borderTop: '1px solid var(--grisaille)' }}
                  >
                    <td style={{ fontSize: '1.5rem' }}>{ligne.rendu}</td>
                    <td style={{ fontSize: '1.5rem' }}>{ligne.attendu}</td>
                    <td style={{ textAlign: 'right' }}>{ligne.nbOccurrences}</td>
                    <td style={{ textAlign: 'right' }}>{`${String(ligne.latenceMedianeMs)} ms`}</td>
                    <td>{libelleTendance(ligne.tendance14j)}</td>
                    <td>
                      {surTravailler === undefined ? null : (
                        <button
                          type="button"
                          className="cible"
                          onClick={() => surTravailler(ligne.competences)}
                          aria-label={`Travailler ${ligne.attendu} contre ${ligne.rendu}`}
                        >
                          Travailler ça
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Le chiffre qui empêche un tableau vide de mentir. Il est visible, pas caché en note. */}
      <p data-confusions-ecartees={String(ecartees)} style={{ margin: 0, color: 'var(--grisaille)' }}>
        {ecartees === 0
          ? 'Toutes les confusions observées portent un axe.'
          : `${String(ecartees)} confusion(s) observée(s) sans axe identifiable : elles ne sont pas comptées ci-dessus.`}
      </p>
    </section>
  );
}
