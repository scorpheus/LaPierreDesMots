// La fiche d'un exercice dans la galerie parent — D34, lot N5.
//
// « Moteur · habillage · compétences · état de validation affichés » (contrat de finition
// v3 § 4.5). Chacune de ces quatre données est là pour une raison, et aucune n'est décorative :
//
//   • le MOTEUR, parce que R12 se lit « ≥ 3 moteurs par compétence » et qu'un parent qui voit
//     six fiches `colorie` sur la même compétence sait que la variété promise n'y est pas ;
//   • l'HABILLAGE, parce que R13 se lit « jamais deux fois le même habillage dans une sortie » ;
//   • les COMPÉTENCES, parce que c'est le seul endroit où l'on voit ce qu'un exercice
//     prétend travailler — et où l'on voit qu'il ne prétend rien ;
//   • le STATUT, parce qu'un brouillon en attente de relecture est lançable ici et ne l'est
//     nulle part ailleurs : c'est l'écran de relecture de l'annexe P § 6.3.
//
// LE BOUTON « LANCER » PORTE SON DRAPEAU DANS LE DOM (`data-journalise="non"`). Ce n'est pas
// une décoration de test : c'est la seule preuve VISIBLE, du dehors, que le lancement parent
// ne sera pas journalisé. Un drapeau qui ne vit que dans une variable JavaScript est un
// drapeau qu'aucun test de bout en bout ne peut constater — et un détecteur qui déclare un
// poids qu'il n'applique jamais est exactement le défaut que ce projet a déjà payé une fois.
import type { ReactElement } from 'react';
import type { EntreeGalerie, OptionsLancement, StatutValidation } from '@pierre/partage/parent';
import { LANCEMENT_PARENT } from '@pierre/partage/parent';

export interface ProprietesFicheExercice {
  readonly entree: EntreeGalerie;
  /**
   * Lance l'exercice. **Toujours appelé avec `LANCEMENT_PARENT`** — la fiche n'a pas le choix,
   * et c'est voulu : un composant qui pourrait décider de journaliser est un composant qui le
   * fera un jour par distraction.
   */
  readonly surLancer?: (entree: EntreeGalerie, options: OptionsLancement) => void;
}

/** Le statut, dit au parent dans SES mots. Aucun jargon de file d'attente. */
const LIBELLE_STATUT: Readonly<Record<StatutValidation, string>> = {
  livre: 'Dans le jeu',
  'en-attente': 'À relire',
  valide: 'Relu et accepté',
  rejete: 'Mis de côté'
};

export function FicheExercice({ entree, surLancer }: ProprietesFicheExercice): ReactElement {
  return (
    <article
      data-galerie-exercice={String(entree.exercice)}
      data-galerie-moteur={String(entree.moteur)}
      data-galerie-habillage={String(entree.habillage)}
      data-galerie-statut={entree.statut}
      className="galerie-exercice-fiche"
      style={{
        display: 'grid',
        gap: '0.5rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        border: '2px solid var(--grisaille)'
      }}
    >
      <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{entree.titre}</h3>

      <dl
        className="galerie-exercice-details"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.25rem 0.75rem',
          margin: 0
        }}
      >
        <dt style={{ color: 'var(--texte-secondaire)' }}>Jeu</dt>
        <dd style={{ margin: 0 }}>{String(entree.moteur)}</dd>

        <dt style={{ color: 'var(--texte-secondaire)' }}>Décor</dt>
        <dd style={{ margin: 0 }}>{String(entree.habillage)}</dd>

        <dt style={{ color: 'var(--texte-secondaire)' }}>Région</dt>
        <dd style={{ margin: 0 }}>{entree.region === null ? 'Aucune' : String(entree.region)}</dd>

        <dt style={{ color: 'var(--texte-secondaire)' }}>Travaille</dt>
        <dd style={{ margin: 0 }} data-galerie-nb-competences={String(entree.competences.length)}>
          {/* Le cas ZÉRO est DIT, pas masqué. Une liste vide rendue comme une liste vide se
              confond avec un décalage de mise en page ; le parent doit pouvoir constater
              qu'un exercice ne déclare aucune compétence — c'est une information, et elle est
              mesurable sur le contenu livré. */}
          {entree.competences.length === 0
            ? 'Aucune compétence déclarée'
            : entree.competences.map(String).join(', ')}
        </dd>

        <dt style={{ color: 'var(--texte-secondaire)' }}>État</dt>
        <dd style={{ margin: 0 }}>{LIBELLE_STATUT[entree.statut]}</dd>
      </dl>

      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--texte-secondaire)',
          overflowWrap: 'anywhere'
        }}
      >
        {entree.chemin}
      </p>

      <button
        type="button"
        className="cible"
        data-galerie-lancer={String(entree.exercice)}
        // LES DEUX ATTRIBUTS QUI RENDENT D34 CONSTATABLE DU DEHORS.
        data-lancement="parent"
        data-journalise={LANCEMENT_PARENT.journalise ? 'oui' : 'non'}
        disabled={surLancer === undefined}
        onClick={() => surLancer?.(entree, LANCEMENT_PARENT)}
        style={{ justifySelf: 'start', minBlockSize: 'var(--cible-min)' }}
      >
        Lancer cet exercice
      </button>
    </article>
  );
}
