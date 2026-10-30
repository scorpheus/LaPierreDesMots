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
 * RÈGLE DES 64 px (R16) : `.place-jeton` (place.css) porte `min-inline-size`/`min-block-size` de `--socle-cible` (64 px). Ce n'est
 * pas décoratif — c'est ce que `tests/qualite/a11y.spec.ts` mesure sur la boîte réellement
 * rendue, et ce que `data-element` lui donne comme prise.
 */

import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ElementPlacable } from '@pierre/partage';
import { urlAsset } from '../../api/client.js';
import { ROLE_QUESTION, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

type IdElement = string;

/** R16, en toutes lettres : aucune cible sous 64 px CSS. */
export const CIBLE_MINIMALE_PX = 64;

export interface ProprietesReserve {
  readonly elements: readonly ElementPlacable[];
  /** Les identifiants présents dans les dépôts de l'exercice. */
  readonly elementsAttendus: ReadonlySet<IdElement>;
  /** Les éléments déjà posés : ils restent visibles, grisés, et ne se reprennent pas (R14). */
  readonly places: Readonly<Record<string, string>>;
  readonly elementSaisi: IdElement | null;
  readonly animationsDesactivees: boolean;
  onSaisir(element: IdElement): void;
}

function Jeton(proprietes: {
  readonly element: ElementPlacable;
  readonly roleAttendu: 'a-placer' | 'amusant';
  readonly place: boolean;
  readonly saisi: boolean;
  readonly animationsDesactivees: boolean;
  onSaisir(element: IdElement): void;
}): ReactElement {
  const { element, roleAttendu, place, saisi, animationsDesactivees, onSaisir } = proprietes;
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
      {...ROLE_REPONSE}
      data-element={element.id}
      data-element-role={roleAttendu}
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
      // Le même libellé pour tous : rien ne désigne l'intrus, c'est à l'enfant de le trouver
      // (retour du parent, tableau E04).
      aria-label={element.libelle}
      className="place-jeton"
      style={deplacement === undefined ? undefined : { transform: deplacement }}
    >
      <img
        data-dessin-objet={element.id}
        src={urlAsset(element.asset)}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <span className="place-jeton__libelle">{element.libelle}</span>
    </button>
  );
}

export function Reserve(proprietes: ProprietesReserve): ReactElement {
  const { elements, elementsAttendus, places, elementSaisi, animationsDesactivees, onSaisir } = proprietes;
  const amusants = elements.filter((element) => !elementsAttendus.has(element.id));
  const nbAttendus = elements.length - amusants.length;

  return (
    <div
      data-reserve="place"
      role="group"
      aria-label={`${nbAttendus} dessins à placer et ${amusants.length} intrus à laisser`}
      className="place-jetons"
    >
      {/* T19 : ce que la réserve demande — thème question du socle. */}
      <p data-place-compteur="oui" className="place-jetons__compteur" {...ROLE_QUESTION}>
        <TexteColore texte={`${String(nbAttendus)} dessins à placer · ${String(amusants.length)} intrus à laisser`} />
      </p>
      {elements.map((element) => (
        <Jeton
          key={element.id}
          element={element}
          roleAttendu={elementsAttendus.has(element.id) ? 'a-placer' : 'amusant'}
          place={Object.prototype.hasOwnProperty.call(places, element.id)}
          saisi={elementSaisi === element.id}
          animationsDesactivees={animationsDesactivees}
          onSaisir={onSaisir}
        />
      ))}
    </div>
  );
}
