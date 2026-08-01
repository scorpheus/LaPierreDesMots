/**
 * `MoteurPlace` — le composant hôte du moteur `place`. Lot L2-C.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurPlace` (paquet `partage`) ; ce
 * composant fait trois choses : traduire un geste en `ActionPlace`, faire battre l'horloge du
 * moteur, et donner à voir l'état qu'on lui rend.
 *
 * Aucun `data-etat="echec"` n'est émis ici, ni ailleurs. C'est la traduction mécanique de
 * R14, et l'assertion centrale de `tests/e2e/cassecou.spec.ts`.
 *
 * DEUX CHEMINS, UNE SEULE RÈGLE (R16 : « aucune coordination fine exigée »).
 *   • tap sur la réserve → `saisir`, puis tap sur une zone → `deposer`. C'est le chemin
 *     principal, et il ne demande aucun maintien du doigt.
 *   • glisser-déposer dnd-kit → `saisir` au début, `deposer` à la fin, sur le centroïde de la
 *     zone survolée. Même règle, même code de décision.
 * Un enfant qui ne sait pas maintenir un doigt deux secondes doit pouvoir jouer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ActionPlace, ContenuPlace, EtatPlace, Point } from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { ScenePlace } from './ScenePlace.js';
import { Reserve } from './Reserve.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * Relecture automatique de la consigne, en miroir exact de `MoteurColorie.tsx` (v1) : « tant
 * que la consigne active reste sans action, l'enfant l'entend au moins une fois par tranche
 * de 20 s ». RÉÉCOUTE, PAS AIDE (R15) : sans coût en étoiles, et sans borne.
 */
const RELECTURE_MS = 20_000;

/**
 * Le SVG d'habillage est un asset local, validé par `test:contenu` avant d'atteindre
 * l'enfant. On en retire tout de même scripts et gestionnaires d'événements avant injection :
 * un asset ne doit jamais pouvoir exécuter du code.
 */
function extraireCorpsSvg(texte: string): string | null {
  const correspondance = /<svg[^>]*>([\s\S]*)<\/svg>/i.exec(texte);
  const corps = correspondance?.[1];
  if (corps === undefined) return null;
  return corps
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function MoteurPlace(
  proprietes: ProprietesMoteur<ContenuPlace, EtatPlace, ActionPlace>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  // --- le décor déclaratif, s'il est là ------------------------------------
  useEffect(() => {
    let annule = false;
    const fichier = habillage.scene.fichier;
    if (typeof fetch !== 'function' || fichier.length === 0) return undefined;
    fetch(`/api/contenu/assets/${fichier}`)
      .then((reponse) => (reponse.ok ? reponse.text() : null))
      .then((texte) => {
        if (annule || texte === null) return;
        const corps = extraireCorpsSvg(texte);
        if (corps !== null) setSvgMarkup(corps);
      })
      .catch(() => {
        // Asset absent : on joue avec les seules zones. Le jeu reste jouable — il n'existe
        // aucun état sans issue (test `singe`).
      });
    return () => {
      annule = true;
    };
  }, [habillage]);

  // --- le battement --------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' });
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  const etatConsigne = etat.consignes[etat.indexConsigne];
  const consigne = contenu.consignes[etat.indexConsigne];

  // --- la relecture automatique, avec son quota ----------------------------
  const refRelectures = useRef<{ consigne: string; faites: number }>({ consigne: '', faites: 0 });

  useEffect(() => {
    if (etatConsigne === undefined || etat.termineMs !== null) return;
    if (refRelectures.current.consigne !== etatConsigne.id) {
      refRelectures.current = { consigne: etatConsigne.id, faites: 0 };
    }
    const inactiviteMs = services.horloge.maintenantMs() - etatConsigne.derniereActionMs;
    const dues = Math.floor(inactiviteMs / RELECTURE_MS);
    if (dues > refRelectures.current.faites) {
      refRelectures.current = { consigne: etatConsigne.id, faites: dues };
      emettre({ type: 'ecouterConsigne' });
    }
  }, [etat, etatConsigne, emettre, services]);

  // --- ce que la démonstration désigne -------------------------------------
  const zoneEnDemonstration =
    etat.aide !== null && etat.aide.niveau === 'demonstration' ? etat.aide.cible : null;

  const saisir = useCallback(
    (element: string) => {
      emettre({ type: 'saisir', element });
    },
    [emettre],
  );

  const deposer = useCallback(
    (point: Point) => {
      emettre({ type: 'deposer', point });
    },
    [emettre],
  );

  // --- le chemin dnd-kit ---------------------------------------------------
  const centroides = useMemo(
    () => new Map(contenu.zones.map((z) => [z.id, z.centroide] as const)),
    [contenu],
  );

  // 8 px avant de considérer que c'est un glissé : sous ce seuil, c'est un tap, et le tap
  // doit rester le chemin principal (R16).
  const capteurs = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const auDebutDuGlisse = useCallback(
    (evenement: DragStartEvent) => {
      saisir(String(evenement.active.id));
    },
    [saisir],
  );

  const auBoutDuGlisse = useCallback(
    (evenement: DragEndEvent) => {
      const zone = evenement.over === null ? null : String(evenement.over.id);
      if (zone === null) {
        // Relâché dans le vide : l'élément retourne à la réserve, sans rien coûter.
        emettre({ type: 'abandonner' });
        return;
      }
      const centroide = centroides.get(zone);
      if (centroide === undefined) {
        emettre({ type: 'abandonner' });
        return;
      }
      deposer(centroide);
    },
    [centroides, deposer, emettre],
  );

  // Le seul message de refus qui mérite un mot : l'enfant n'a pas pris d'objet. Ce n'est pas
  // une erreur — `REFUS_PLACE_COMPTE_ERREUR` le dit — donc pas un reproche.
  const rappel =
    etat.dernierRefus !== null && etat.dernierRefus.motif === 'aucun-element-saisi'
      ? 'Choisis d’abord un objet.'
      : '';

  return (
    <DndContext sensors={capteurs} onDragStart={auDebutDuGlisse} onDragEnd={auBoutDuGlisse}>
      <div
        data-moteur="place"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-consigne={etatConsigne?.id ?? ''}
        style={{ display: 'grid', gap: '1rem' }}
      >
        <p data-consigne-texte="oui" role="status" aria-live="polite">
          {consigne?.texte ?? ''}
        </p>

        <ScenePlace
          contenu={contenu}
          habillage={habillage}
          places={etat.places}
          elementSaisi={etat.elementSaisi}
          zoneEnDemonstration={zoneEnDemonstration}
          zoneEnRefus={etat.dernierRefus === null ? null : etat.dernierRefus.zone}
          marqueRefus={etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs}
          animationsDesactivees={animationsDesactivees}
          svgMarkup={svgMarkup}
          onDeposer={deposer}
        />

        <Reserve
          elements={contenu.reserve}
          places={etat.places}
          elementSaisi={etat.elementSaisi}
          animationsDesactivees={animationsDesactivees}
          onSaisir={saisir}
        />

        <p role="status" aria-live="polite" data-rappel={rappel === '' ? 'non' : 'oui'}>
          {rappel}
        </p>
      </div>
    </DndContext>
  );
}
