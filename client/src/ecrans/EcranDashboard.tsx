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
//
// AJOUT N5 — L'ONGLET GALERIE (D34), et pourquoi c'est un onglet.
//
// Le contrat de finition v3 § 4.5 demande à N5 un écran de galerie ET un onglet dans le
// dashboard. Ce n'est pas une hésitation : `client/src/routeur.tsx` appartient à N4 (§ 6.2),
// donc la route `/parent/galerie` que N5 réclame n'existera qu'au passage de N4. Un onglet,
// lui, ne demande aucune route. La galerie est donc atteignable dès maintenant, et le sera
// aussi par sa route quand elle arrivera — deux portes, un seul chemin de données.
//
// L'onglet est UN ÉTAT LOCAL, pas une entrée d'URL : la zone parent « n'emprunte ni le
// magasin de session, ni les écrans de jeu » (voir plus haut), et lui donner une URL la ferait
// entrer dans un historique que le parent partage avec l'enfant.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CodeCompetence, IdExercice, IdProfil } from '@pierre/partage';
import type { DecisionRelecture, EntreeGalerie, OptionsLancement } from '@pierre/partage/parent';
import {
  fermerZoneParent,
  lireDashboardParent,
  lireGalerieParent,
  trancherRelectureContenu
} from '../api/client.js';
import { GalerieExercices } from '../parent/GalerieExercices.js';
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
  /**
   * AJOUT N5 — lancer un exercice depuis la galerie (D34).
   *
   * `options` vaut **toujours** `LANCEMENT_PARENT`, posé par `FicheExercice` : le dashboard
   * ne le fabrique pas et ne peut donc pas se tromper. L'appelant — le routeur — est celui
   * qui sait naviguer ; il reçoit le drapeau et n'a qu'à ne rien journaliser.
   */
  readonly surLancerExercice?: (entree: EntreeGalerie, options: OptionsLancement) => void;
}

/** Les deux onglets de la zone parent. `suivi` est celui qui s'ouvre. */
type OngletParent = 'suivi' | 'galerie';

export function EcranDashboard({
  profil,
  prenom,
  surSortie,
  surTravailler,
  surLancerExercice
}: ProprietesEcranDashboard): ReactElement {
  const clientRequetes = useQueryClient();
  const [onglet, fixerOnglet] = useState<OngletParent>('suivi');

  const dashboard = useQuery({
    queryKey: ['parent', 'dashboard', String(profil)],
    queryFn: () => lireDashboardParent(profil)
  });

  // La galerie n'est demandée qu'à l'ouverture de son onglet : le parent qui ne vient que
  // pour la courbe de latence ne paie pas un balayage du dossier `contenu/exercices/`.
  const galerie = useQuery({
    queryKey: ['parent', 'galerie', String(profil)],
    queryFn: () => lireGalerieParent(profil),
    enabled: onglet === 'galerie'
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

      {/* Les deux onglets. `role="tablist"` et `aria-selected` plutôt qu'un simple couple de
          boutons : axe-core en fait un critère `serious`, et `tests/qualite/a11y-galerie.spec.ts`
          le vérifie. */}
      <div role="tablist" aria-label="Espace parent" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {(
          [
            ['suivi', 'Le suivi'],
            ['galerie', 'Les exercices']
          ] as const
        ).map(([code, libelle]) => (
          <button
            key={code}
            type="button"
            role="tab"
            id={`onglet-${code}`}
            aria-selected={onglet === code}
            aria-controls={`panneau-${code}`}
            className={onglet === code ? 'cible cible-appel' : 'cible cible-secondaire'}
            data-onglet-parent={code}
            data-onglet-actif={onglet === code ? 'oui' : 'non'}
            onClick={() => fixerOnglet(code)}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === 'galerie' ? (
        <div role="tabpanel" id="panneau-galerie" aria-labelledby="onglet-galerie">
          {galerie.isPending ? <p style={{ margin: 0 }}>On rassemble les exercices…</p> : null}
          {galerie.isError ? (
            <div className="zone-lecture" style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0 }}>
                Les exercices n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
              </p>
              <button type="button" className="cible" onClick={() => void galerie.refetch()}>
                Réessayer
              </button>
            </div>
          ) : null}
          {galerie.data === undefined ? null : (
            <GalerieExercices
              catalogue={galerie.data}
              {...(surLancerExercice === undefined ? {} : { surLancer: surLancerExercice })}
            />
          )}
        </div>
      ) : null}

      {dashboard.isPending && onglet === 'suivi' ? (
        <p style={{ margin: 0 }}>On rassemble les données…</p>
      ) : null}

      {dashboard.isError && onglet === 'suivi' ? (
        <div className="zone-lecture" style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <p style={{ margin: 0 }}>
            Les données n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
          </p>
          <button type="button" className="cible" onClick={() => void dashboard.refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}

      {resume === undefined || onglet !== 'suivi' ? null : (
        <div role="tabpanel" id="panneau-suivi" aria-labelledby="onglet-suivi" style={{ display: 'grid', gap: '2rem' }}>
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
        </div>
      )}
    </main>
  );
}
