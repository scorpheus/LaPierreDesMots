/**
 * `PaletteConsigne` — le nuancier et la ligne de consigne. Lot L-E.
 *
 * DEUX RÉGIMES VISUELS DANS UN MÊME COMPOSANT, et c'est délibéré (v2 § 9.3) :
 * « le décor s'agite, le texte jamais ». La zone de consigne est du déchiffrage : fond
 * parchemin, Andika, aucune animation. Les godets sont du décor : ils réagissent au
 * doigt en 60 ms.
 *
 * Le nuancier n'est JAMAIS restreint à la consigne active (contrat § 5.8) : sinon
 * l'enfant n'aurait plus besoin de lire le nom de la couleur, et l'exercice ne testerait
 * plus rien.
 */

import { useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { CouleurColoriage, NiveauAide } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';
import type { ConsigneColorie } from '@pierre/partage';
import { ROLE_QUESTION } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/**
 * Les mots-clés de la consigne courante, SEULS — au palier `indice`.
 *
 * ⚠ NE REND PLUS LA PHRASE ENTIÈRE (R49, arbitrage du père du 2026-08-08 : « la phrase est en
 * haut et en bas, il y a doublon »). `EcranNoeud` porte déjà `consigne.texte` dans sa barre
 * d'en-tête ; reconstruire la même phrase ici — même surlignée — resterait le même doublon pour
 * un enfant qui déchiffre. Cette liste ne montre que le SOUS-ENSEMBLE `motsCles`, dans l'ordre
 * du contenu : c'est une information que la barre d'en-tête ne donne pas, jamais une répétition
 * de ce qu'elle donne déjà.
 */
function motsClesEnIndice(motsCles: readonly string[]): ReactNode {
  if (motsCles.length === 0) return null;
  return motsCles.map((mot, index) => (
    <mark key={`${String(index)}-${mot}`}>{mot}</mark>
  ));
}

export interface ProprietesPaletteConsigne {
  readonly consignes: readonly ConsigneColorie[];
  readonly indexConsigne: number;
  /** Sous-ensemble du nuancier de l'habillage, dans l'ordre du contenu. */
  readonly nuancier: readonly CouleurColoriage[];
  readonly couleurChoisie: CouleurColoriage | null;
  /** Palier d'aide de la consigne active. */
  readonly niveauAide: NiveauAide;
  /** Godet que la démonstration fait pulser, ou `null`. */
  readonly couleurEnDemonstration: CouleurColoriage | null;
  /** Cible concrète à réaliser maintenant, annoncée juste au-dessus du nuancier. */
  readonly cibleCourante: { readonly libelle: string; readonly couleur: CouleurColoriage } | null;
  readonly animationsDesactivees: boolean;
  onChoisir(couleur: CouleurColoriage): void;
}

export function PaletteConsigne(proprietes: ProprietesPaletteConsigne): ReactElement {
  const {
    consignes,
    indexConsigne,
    nuancier,
    couleurChoisie,
    niveauAide,
    couleurEnDemonstration,
    cibleCourante,
    animationsDesactivees,
    onChoisir
  } = proprietes;

  const choisir = useCallback(
    (couleur: CouleurColoriage) => () => {
      onChoisir(couleur);
    },
    [onChoisir]
  );

  const consigneCourante = consignes[indexConsigne];

  return (
    <div
      // `data-moteur` a été RETIRÉ d'ici à l'intégration de la campagne v2.
      //
      // Le contrat v1 § 10, repris par le contrat des features v2 § 7, réserve cet attribut à
      // « la racine de CHAQUE moteur » — une racine par écran. Cette palette est un composant
      // interne du moteur `colorie`, pas sa racine : `MoteurColorie` le porte déjà. Le doublon
      // n'a longtemps rien cassé parce qu'aucun test ne comptait ; `parcours-variete` (L2-E)
      // compte, et il a mesuré la vérité — sortie citée :
      //
      //   expect(locator('[data-moteur]')).toHaveCount(1) failed
      //     Expected: 1     Received: 2
      //
      // Aucun style ni aucun test ne le sélectionnait : la mise en forme passe par la classe
      // `pierre-palette`, et les seuls sélecteurs `[data-moteur=…]` du dépôt visent une racine.
      className={`pierre-palette${animationsDesactivees ? ' pierre-palette--calme' : ''}`}
    >
      {/* La phrase courante vit déjà, en grand, dans l'en-tête de `EcranNoeud`. Les phrases
          futures occupaient jusqu'à la moitié de l'écran et réduisaient le dessin à une
          vignette. On conserve ici leur PROGRESSION, jamais leur texte. Le libellé « Étape n
          sur N » est dans le repère commun, sous la consigne de l'écran (T10). */}
      <div
        className="pierre-progression-consignes"
        data-progression-consignes
        data-consigne={consigneCourante?.id}
        data-consigne-etat={consigneCourante === undefined ? undefined : 'courante'}
        data-forme={consigneCourante?.forme}
        role="progressbar"
        aria-label={`Consigne ${String(indexConsigne + 1)} sur ${String(consignes.length)}`}
        aria-valuemin={1}
        aria-valuemax={consignes.length}
        aria-valuenow={indexConsigne + 1}
      >
        {consignes.map((consigne, index) => (
          <span
            key={consigne.id}
            data-etat={index === indexConsigne ? 'courante' : index < indexConsigne ? 'faite' : 'a-venir'}
            aria-hidden="true"
          />
        ))}
      </div>

      {consigneCourante === undefined ? null : niveauAide !== 'aucune' &&
        consigneCourante.motsCles.length > 0 ? (
        <div
          className="pierre-indice-colorie"
          aria-label={`Indice — mots-clés : ${consigneCourante.motsCles.join(', ')}`}
        >
          {motsClesEnIndice(consigneCourante.motsCles)}
        </div>
      ) : null}

      {cibleCourante === null ? null : (
        <div
          className="pierre-cible-colorie"
          {...ROLE_QUESTION}
          data-cible-colorie
          aria-label={`Cible : ${cibleCourante.libelle}, en ${cibleCourante.couleur}`}
        >
          <span><TexteColore texte={`Colorie ${cibleCourante.libelle} en ${cibleCourante.couleur}`} /></span>
          <span
            className="pierre-cible-colorie__couleur"
            aria-hidden="true"
            style={{ background: hexDeCouleur(cibleCourante.couleur) }}
          />
        </div>
      )}

      <div
        role="group"
        aria-label="Les couleurs"
        className="pierre-palette__godets"
      >
        {nuancier.map((couleur) => {
          const choisie = couleur === couleurChoisie;
          const classes = ['pierre-godet'];
          if (couleur === couleurEnDemonstration) classes.push('pierre-godet--demonstration');
          return (
            <button
              key={couleur}
              type="button"
              className={classes.join(' ')}
              data-godet={couleur}
              data-choisie={choisie ? 'oui' : 'non'}
              aria-pressed={choisie}
              aria-label={`Colorier en ${couleur}`}
              style={{ background: hexDeCouleur(couleur) }}
              onClick={choisir(couleur)}
            />
          );
        })}
      </div>
    </div>
  );
}
