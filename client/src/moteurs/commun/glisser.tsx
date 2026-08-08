/**
 * LE GLISSER, AJOUTÉ AU TAP ET JAMAIS À SA PLACE — R16, tranché le 2026-08-08.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE R16 DEMANDAIT, ET POURQUOI IL RESTAIT OUVERT
 *
 * « Range dans la grotte de gauche les mots avec la lettre B… sur la tablette ça marche pas, on
 * n'arrive pas à déplacer. » Mesuré à l'époque : le moteur ne portait AUCUN gestionnaire de
 * glisser. Ce n'était donc pas un défaut tactile mais un défaut d'AFFORDANCE — le mot « range »
 * appelle un geste que le moteur ne proposait pas.
 *
 * R16 laissait deux voies ouvertes : « ajouter le glisser (dnd-kit est au socle) **ou** rendre
 * le tap-puis-tap évident et reformuler la consigne ». La seconde a été prise pour `phrase` le
 * 2026-08-07 — « Touche les mots dans l'ordre », et le mot vole tout seul jusqu'à sa fente.
 *
 * Restait un conflit que Q6 a nommé : les specs v2 § 5 promettent « **faire glisser** des
 * blocs-syllabes pour former un mot », et trois moteurs ne portaient aucun gestionnaire de
 * glisser. Modifier la ligne des specs demanderait une validation ; les honorer sans trahir R16
 * n'en demande aucune, à une condition — **le glisser s'AJOUTE, le tap reste le chemin
 * principal.** Aucune coordination fine n'est alors EXIGÉE : un enfant qui ne sait pas maintenir
 * son doigt deux secondes joue exactement comme avant.
 *
 * ── LE SEUIL DE 8 PX, REPRIS DE `place` ET NON RÉINVENTÉ ──────────────────────────────────
 * `PointerSensor` avec `activationConstraint: { distance: 8 }` : sous 8 px de déplacement, le
 * geste reste un CLIC et `onClick` part normalement. Au-delà, dnd-kit prend la main et le clic
 * n'a pas lieu. C'est ce qui fait cohabiter les deux voies sans que l'une mange l'autre — et
 * c'est déjà la valeur de `MoteurPlace.tsx`, mesurée en service depuis le lot L2-C. La copier
 * plutôt que d'en choisir une autre évite deux seuils pour un même geste dans un même jeu.
 *
 * ── CE QUE CE MODULE NE FAIT PAS ──────────────────────────────────────────────────────────
 * Il ne décide de rien. Il ne connaît ni les blocs, ni les fentes, ni l'ordre attendu : il rend
 * un jeton saisissable et une zone accueillante, et rappelle le moteur quand un jeton est
 * lâché sur une zone. **Toute la règle reste dans `partage/`**, et le glisser émet exactement
 * la même action que le tap — sans quoi le jeu aurait deux règles selon le doigt de l'enfant.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { useMemo } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

/**
 * Sous ce déplacement, le geste reste un tap et `onClick` part.
 *
 * Repris tel quel de `MoteurPlace.tsx`. Ce n'est pas une constante d'esthétique : au-dessous,
 * un doigt qui tremble déclencherait un glissé et volerait son clic à l'enfant ; au-dessus, il
 * faudrait traverser l'écran avant que le jeton ne suive le doigt, et le glisser paraîtrait
 * cassé.
 */
export const SEUIL_DE_GLISSE_PX = 8;

export interface ProprietesZoneDeGlisser {
  /** Appelé quand un jeton est lâché SUR une zone d'accueil. `cible` est l'id de la zone. */
  readonly surDepot: (jeton: string, cible: string) => void;
  /** Appelé quand un jeton est lâché dans le vide. Par défaut : rien, et rien ne coûte. */
  readonly surAbandon?: () => void;
  readonly children: ReactNode;
}

/**
 * Le contexte de glisser d'un moteur. À monter AUTOUR du plateau, une seule fois.
 *
 * Un jeton lâché dans le vide ne coûte rien et ne dit rien : c'est R14 appliqué au geste. Un
 * enfant qui commence un glissé et change d'avis n'a pas commis d'erreur.
 */
export function ZoneDeGlisser({ surDepot, surAbandon, children }: ProprietesZoneDeGlisser): ReactElement {
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: SEUIL_DE_GLISSE_PX } }),
  );

  return (
    <DndContext
      sensors={capteurs}
      onDragEnd={(evenement: DragEndEvent) => {
        if (evenement.over === null) {
          surAbandon?.();
          return;
        }
        surDepot(String(evenement.active.id), String(evenement.over.id));
      }}
    >
      {children}
    </DndContext>
  );
}

export interface AttachesDeJeton {
  readonly attributs: Record<string, unknown>;
  readonly ecouteurs: Record<string, unknown>;
  readonly brancher: (noeud: HTMLElement | null) => void;
  readonly style: CSSProperties;
  readonly enVol: boolean;
}

/**
 * Rend un élément saisissable au doigt.
 *
 * `touchAction: 'none'` est OBLIGATOIRE sur tablette : sans lui, le navigateur interprète le
 * mouvement comme un défilement de page et le jeton ne bouge jamais. C'est le premier défaut
 * qu'on rencontre en portant un glisser sur tactile, et il est silencieux au clavier-souris.
 */
export function useJetonGlissable(id: string, desactive = false): AttachesDeJeton {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: desactive,
  });

  const style = useMemo<CSSProperties>(
    () => ({
      touchAction: 'none',
      transform:
        transform === null
          ? undefined
          : `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)`,
      // Le jeton saisi passe AU-DESSUS de tout le reste, sinon il glisse sous les fentes.
      zIndex: isDragging ? 40 : undefined,
      cursor: desactive ? undefined : 'grab',
    }),
    [transform, isDragging, desactive],
  );

  return {
    attributs: attributes as unknown as Record<string, unknown>,
    ecouteurs: (listeners ?? {}) as unknown as Record<string, unknown>,
    brancher: setNodeRef,
    style,
    enVol: isDragging,
  };
}

export interface AttachesDeCible {
  readonly brancher: (noeud: HTMLElement | null) => void;
  /** Un jeton survole cette zone : l'affordance doit se voir, sans quoi le glisser est aveugle. */
  readonly survolee: boolean;
}

/** Rend un élément accueillant pour un jeton glissé. */
export function useCibleDeDepot(id: string, desactive = false): AttachesDeCible {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: desactive });
  return { brancher: setNodeRef, survolee: isOver };
}
