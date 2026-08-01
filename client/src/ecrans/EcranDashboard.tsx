// Le dashboard parent — v2 § 14, contrat des features v2 § 3.8.
//
// L'ORDRE DES BLOCS EST UNE DÉCISION, pas une mise en page. La courbe de latence vient en
// premier parce que D18 en fait « l'indicateur principal du dashboard » ; les confusions
// suivent parce que D23 en fait le besoin actuel ; la carte de couverture ensuite, parce
// qu'elle nuance ce que l'enfant montre fièrement ; la relecture, les exports et les réglages
// ferment, parce que ce sont des gestes et non des indicateurs.
//
// **Cet écran est hors du monde de l'enfant.** Il n'emprunte ni le magasin de session, ni les
// écrans de jeu, ni les moteurs. Le seul lien est le profil dont on regarde les données.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CodeCompetence, IdExercice, IdProfil } from '@pierre/partage';
import type { DecisionRelecture } from '@pierre/partage/parent';
import { fermerZoneParent, lireDashboardParent, trancherRelectureContenu } from '../api/client.js';
import { BoutonExport } from '../parent/BoutonExport.js';
import { CarteCouverture } from '../parent/CarteCouverture.js';
import { CourbeLatence } from '../parent/CourbeLatence.js';
import { FileRelecture } from '../parent/FileRelecture.js';
import { ReglagesParent } from '../parent/ReglagesParent.js';
import { TopConfusions } from '../parent/TopConfusions.js';

export interface ProprietesEcranDashboard {
  readonly profil: IdProfil;
  /** Nom affiché, quand l'appelant le connaît. */
  readonly prenom?: string;
  /** Referme la zone parent et rend la main au jeu. */
  readonly surSortie: () => void;
  /** « Travailler ça » : l'appelant décide ce qu'il en fait (v2 § 14). */
  readonly surTravailler?: (competences: readonly CodeCompetence[]) => void;
}

export function EcranDashboard({
  profil,
  prenom,
  surSortie,
  surTravailler
}: ProprietesEcranDashboard): ReactElement {
  const clientRequetes = useQueryClient();

  const dashboard = useQuery({
    queryKey: ['parent', 'dashboard', String(profil)],
    queryFn: () => lireDashboardParent(profil)
  });

  const relecture = useMutation({
    mutationFn: ({
      exercice,
      decision
    }: {
      readonly exercice: IdExercice;
      readonly decision: DecisionRelecture;
    }) => trancherRelectureContenu(exercice, decision),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: ['parent', 'dashboard', String(profil)] });
    }
  });

  const sortir = useCallback((): void => {
    // Le jeton meurt avec l'écran : revenir au dashboard demandera de retaper le code.
    fermerZoneParent();
    surSortie();
  }, [surSortie]);

  const resume = dashboard.data;

  return (
    <main
      data-ecran="dashboard"
      data-parent="dashboard"
      style={{ padding: '2rem', display: 'grid', gap: '2rem', maxInlineSize: '60rem', marginInline: 'auto' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
          {prenom === undefined ? 'Suivi' : `Suivi de ${prenom}`}
        </h1>
        <button type="button" className="cible cible-secondaire" onClick={sortir}>
          Fermer l’espace parent
        </button>
      </header>

      {dashboard.isPending ? <p style={{ margin: 0 }}>On rassemble les données…</p> : null}

      {dashboard.isError ? (
        <div className="zone-lecture" style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <p style={{ margin: 0 }}>
            Les données n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
          </p>
          <button type="button" className="cible" onClick={() => void dashboard.refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}

      {resume === undefined ? null : (
        <>
          <CourbeLatence points={resume.latences} />
          <TopConfusions
            confusions={resume.confusions}
            ecartees={resume.confusionsEcartees}
            {...(surTravailler === undefined ? {} : { surTravailler })}
          />
          <CarteCouverture couverture={resume.couverture} />
          <FileRelecture
            entrees={resume.relecture}
            surDecision={(exercice, decision) => relecture.mutate({ exercice, decision })}
          />
          <BoutonExport profil={profil} />
          <ReglagesParent />
        </>
      )}
    </main>
  );
}
