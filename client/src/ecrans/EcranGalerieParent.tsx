// L'écran plein de la galerie parent — D34, lot N5.
//
// Il existe en DEUX endroits, et ce n'est pas une redondance :
//
//   • ici, comme écran complet, pour la route `/parent/galerie` que N4 ajoutera au routeur
//     (contrat de finition v3 § 6.2 : `client/src/routeur.tsx` appartient à N4, et les lots
//     qui ont besoin d'une route la LISTENT dans leur rapport) ;
//   • dans `EcranDashboard`, comme onglet, pour que la galerie soit atteignable AUJOURD'HUI
//     sans dépendre d'un autre lot. Une fonctionnalité qui n'attend qu'une route est une
//     fonctionnalité qu'on découvre absente le jour de la démonstration.
//
// Les deux rendent le même `GalerieExercices` avec le même catalogue. Il n'y a pas deux
// chemins de données, il y a deux portes sur le même.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IdProfil } from '@pierre/partage';
import type { EntreeGalerie, OptionsLancement } from '@pierre/partage/parent';
import { lireGalerieParent } from '../api/client.js';
import { GalerieExercices } from '../parent/GalerieExercices.js';

export interface ProprietesEcranGalerieParent {
  readonly profil: IdProfil;
  /** Retour au dashboard, ou au jeu. **Toujours présent** : aucun état sans issue. */
  readonly surRetour: () => void;
  readonly surLancer?: (entree: EntreeGalerie, options: OptionsLancement) => void;
}

export function EcranGalerieParent({
  profil,
  surRetour,
  surLancer
}: ProprietesEcranGalerieParent): ReactElement {
  const galerie = useQuery({
    queryKey: ['parent', 'galerie', String(profil)],
    queryFn: () => lireGalerieParent(profil)
  });

  const reessayer = useCallback((): void => {
    void galerie.refetch();
  }, [galerie]);

  return (
    <main
      data-ecran="galerie-parent"
      data-parent="galerie"
      className="galerie-parent-page"
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '2rem',
        maxInlineSize: '70rem',
        marginInline: 'auto'
      }}
    >
      <header className="galerie-parent-entete" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
          Les exercices
        </h1>
        {/* La sortie est dans l'en-tête, donc visible sans défiler, même sur un catalogue de
            deux cents fiches. Une sortie qu'il faut chercher est une sortie qui n'existe pas
            pour qui ne la cherche pas. */}
        <button
          type="button"
          className="cible cible-secondaire"
          data-galerie-retour="oui"
          onClick={surRetour}
        >
          Retour au suivi
        </button>
      </header>

      {galerie.isPending ? <p style={{ margin: 0 }}>On rassemble les exercices…</p> : null}

      {galerie.isError ? (
        <div className="zone-lecture" style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <p style={{ margin: 0 }}>
            Les exercices n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
          </p>
          <button type="button" className="cible" onClick={reessayer}>
            Réessayer
          </button>
        </div>
      ) : null}

      {galerie.data === undefined ? null : (
        <GalerieExercices
          catalogue={galerie.data}
          {...(surLancer === undefined ? {} : { surLancer })}
        />
      )}
    </main>
  );
}
