/**
 * `Reserve` — les éléments offerts à l'enfant, intrus compris. Lot L2-C.
 *
 * L'INTRUS EST LA MOITIÉ DE L'EXERCICE. Une réserve qui ne contiendrait que les bons
 * éléments ne demanderait aucune lecture : il n'y aurait rien à choisir, et « Dessine un
 * soleil dans le ciel » se résoudrait en tapant le seul objet disponible. C'est pour cela
 * que le schéma exige `reserve.minItems = 2`.
 *
 * L'intrus n'est pas un piège pour autant : le poser ne produit ni rouge, ni son négatif —
 * `element-hors-consigne` fait revenir l'objet dans la réserve, et l'exercice continue
 * (R14).
 *
 * RÈGLE DES 64 px (R16) : chaque bouton porte `minWidth`/`minHeight` de 64 px CSS. Ce n'est
 * pas décoratif — c'est ce que `tests/qualite/a11y.spec.ts` mesure sur la boîte réellement
 * rendue, et ce que `data-element` lui donne comme prise.
 */

import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ElementPlacable } from '@pierre/partage';

type IdElement = string;

/** R16, en toutes lettres : aucune cible sous 64 px CSS. */
export const CIBLE_MINIMALE_PX = 64;

const TRAIT = 'var(--trait, #1B2440)';

export interface ProprietesReserve {
  readonly elements: readonly ElementPlacable[];
  /** Les éléments déjà posés : ils restent visibles, grisés, et ne se reprennent pas (R14). */
  readonly places: Readonly<Record<string, string>>;
  readonly elementSaisi: IdElement | null;
  readonly animationsDesactivees: boolean;
  onSaisir(element: IdElement): void;
}

function Jeton(proprietes: {
  readonly element: ElementPlacable;
  readonly place: boolean;
  readonly saisi: boolean;
  readonly animationsDesactivees: boolean;
  onSaisir(element: IdElement): void;
}): ReactElement {
  const { element, place, saisi, animationsDesactivees, onSaisir } = proprietes;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: element.id,
    disabled: place,
  });

  const saisir = useCallback(() => {
    if (place) return;
    onSaisir(element.id);
  }, [element, place, onSaisir]);

  const deplacement =
    transform === null || animationsDesactivees
      ? undefined
      : `translate3d(${transform.x}px, ${transform.y}px, 0)`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-element={element.id}
      data-place={place ? 'oui' : 'non'}
      data-saisi={saisi ? 'oui' : 'non'}
      disabled={place}
      onClick={saisir}
      {...listeners}
      {...attributes}
      // APRÈS les attributs de dnd-kit, et l'ordre est normatif : `useDraggable` pose son
      // propre `aria-pressed` et son propre `aria-label`. Ceux-ci décrivent l'objet que
      // l'enfant manipule ; ceux de la bibliothèque décrivent un « draggable item ». C'est le
      // libellé de l'objet que le lecteur d'écran doit dire.
      aria-pressed={saisi}
      aria-label={element.libelle}
      style={{
        minWidth: `${CIBLE_MINIMALE_PX}px`,
        minHeight: `${CIBLE_MINIMALE_PX}px`,
        padding: '0.5rem 0.75rem',
        borderRadius: '0.75rem',
        border: `${saisi ? 3 : 1.5}px solid ${TRAIT}`,
        // Un élément posé s'estompe ; il ne disparaît pas et ne devient jamais rouge (R14).
        opacity: place ? 0.45 : 1,
        background: saisi ? 'var(--jeton-actif, #F2C14E)' : 'var(--jeton, #FFFFFF)',
        color: TRAIT,
        cursor: place ? 'default' : 'pointer',
        touchAction: 'none',
        transform: deplacement,
      }}
    >
      {element.libelle}
    </button>
  );
}

export function Reserve(proprietes: ProprietesReserve): ReactElement {
  const { elements, places, elementSaisi, animationsDesactivees, onSaisir } = proprietes;

  return (
    <div
      data-reserve="place"
      role="group"
      aria-label="Les objets à placer"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}
    >
      {elements.map((element) => (
        <Jeton
          key={element.id}
          element={element}
          place={Object.prototype.hasOwnProperty.call(places, element.id)}
          saisi={elementSaisi === element.id}
          animationsDesactivees={animationsDesactivees}
          onSaisir={onSaisir}
        />
      ))}
    </div>
  );
}
