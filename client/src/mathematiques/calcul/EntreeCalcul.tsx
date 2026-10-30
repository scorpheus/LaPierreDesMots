/**
 * L'ENTRÉE DU CALCUL — en tête de l'accueil de la Vallée des Nombres (premier jet,
 * Docs/maths-calcul-premier-jet-2026-10-09.md § « Accès »).
 *
 * Deux grandes pierres, deux jeux : le gué des calculs et la pierre à calcul. Un toucher lance
 * la partie ; aucun réglage, aucun niveau à choisir (§ 6 bis, Q1 : un seul parcours qui monte).
 */
import type { ReactElement } from 'react';
import { PHRASES_CALCUL, type ActiviteCalcul } from '@pierre/partage/mathematiques';
import { BoutonEcouter } from '../../composants/BoutonEcouter.js';
import './calcul.css';

export function EntreeCalcul({ surChoix }: { readonly surChoix: (activite: ActiviteCalcul) => void }): ReactElement {
  return (
    <section className="entree-calcul" data-testid="entree-calcul" aria-label="Calculer avec Gobi">
      <div className="entree-calcul__titre">
        <h2>Calculer avec Gobi</h2>
        <BoutonEcouter texte={PHRASES_CALCUL.entree.texte} cle={PHRASES_CALCUL.entree.cle} locuteur="gobi"
          libelle="Écouter Gobi" />
      </div>
      <div className="entree-calcul__jeux">
        <button type="button" className="cible entree-calcul__jeu" data-calcul-entree="gue" onClick={() => surChoix('gue')}>
          <span className="entree-calcul__exemple" aria-hidden="true">7 + ▢ = 15</span>
          <strong>Le gué des calculs</strong>
        </button>
        <button type="button" className="cible entree-calcul__jeu" data-calcul-entree="pose" onClick={() => surChoix('pose')}>
          <span className="entree-calcul__exemple entree-calcul__exemple--pose" aria-hidden="true">
            <span>&nbsp;&nbsp;34</span><span>+ 25</span>
          </span>
          <strong>La pierre à calcul</strong>
        </button>
      </div>
    </section>
  );
}
