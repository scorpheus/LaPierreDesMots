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

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ActionPlace, ContenuPlace, EtatPlace, Point } from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { ScenePlace } from './ScenePlace.js';
import { Reserve } from './Reserve.js';
import { urlAsset } from '../../api/client.js';
import { reecrireLiensAssetsDuSvg } from '../../habillages/chargeur.js';

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
    fetch(urlAsset(fichier))
      .then((reponse) => (reponse.ok ? reponse.text() : null))
      .then((texte) => {
        if (annule || texte === null) return;
        const corps = extraireCorpsSvg(reecrireLiensAssetsDuSvg(texte));
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

  // Le cartouche local ne répète pas la règle générale de l'écran : il montre la cible
  // concrète de l'étape, avec le dessin et sa relation spatiale. La dérivation vient de l'état
  // (dépôts restants), donc elle suit l'avancée sans changer silencieusement de cible.
  const depotCourant = etatConsigne?.depotsRestants[0];
  const elementCible = depotCourant === undefined
    ? undefined
    : contenu.reserve.find((element) => element.id === depotCourant.element);
  const zoneCible = depotCourant === undefined
    ? undefined
    : contenu.zones.find((zone) => zone.id === depotCourant.zone);
  const relationCourte: Record<string, string> = {
    dans: 'dans',
    sur: 'sur',
    sous: 'sous',
    'a-cote-de': 'à côté de',
    devant: 'devant',
    derriere: 'derrière',
    entre: 'entre',
    'au-dessus': 'au-dessus de',
    'en-dessous': 'en dessous de',
  };
  const cibleCourante = elementCible === undefined || zoneCible === undefined
    ? 'Étape terminée'
    : `À placer : ${elementCible.libelle} · ${relationCourte[zoneCible.relation] ?? zoneCible.relation} ${zoneCible.libelle}`;

  // La réserve peut contenir des dessins supplémentaires pour inviter à lire chaque carte,
  // mais seuls les éléments cités par une consigne sont attendus. Cette distinction doit être
  // visible avant le premier geste : cinq cartes ne signifient pas cinq tâches.
  const elementsAttendus = useMemo(
    () => new Set(contenu.consignes.flatMap((consigne) => consigne.depots.map((depot) => depot.element))),
    [contenu],
  );
  // L'ordre du fichier n'est pas un indice : sinon les trois objets attendus, déclarés avant
  // les deux intrus, donnent gratuitement la solution observée par le parent. Le mélange est
  // effectué une seule fois avec l'Alea injecté, donc il reste déterministe et rejouable.
  const reserveMelangee = useMemo(
    () => services.alea.melanger(contenu.reserve),
    [contenu.reserve, services.alea],
  );

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
  const messageRappel = 'Choisis d’abord un objet.';
  const rappel =
    etat.dernierRefus !== null && etat.dernierRefus.motif === 'aucun-element-saisi'
      ? messageRappel
      : '';

  return (
    <DndContext sensors={capteurs} onDragStart={auDebutDuGlisse} onDragEnd={auBoutDuGlisse}>
      <div
        className="moteur-place"
        data-moteur="place"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-consigne={etatConsigne?.id ?? ''}
        // Paysage large : scène à gauche, étape et réserve à droite. En cadre compact,
        // global.css rétablit un flux de hauteur naturelle : aucune scène écrasée pour
        // forcer les commandes dans une fenêtre trop courte, aucun carton sur le dessin.
        style={{ blockSize: '100%', minBlockSize: 0 }}
      >
        <div
          data-plateau="etape-place"
          aria-live="polite"
          style={{
            position: 'relative',
            // Une vraie case de la composition : jamais devant une cible du dessin.
            alignSelf: 'center',
            display: 'grid',
            justifyItems: 'center',
            gap: '0.15rem',
            maxInlineSize: 'min(88%, 34rem)',
            padding: '0.45rem 0.8rem',
            border: '3px solid var(--trait)',
            borderRadius: '1rem',
            background: 'var(--parchemin)',
            boxShadow: 'var(--ombre-bd)',
            textAlign: 'center',
            fontWeight: 800,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {`Étape ${String(etat.indexConsigne + 1)} / ${String(etat.consignes.length)}`}
          </span>
          <span data-cible-place="oui">{cibleCourante}</span>
        </div>
        {/* R49 (le père, 2026-08-07 : « la phrase est en haut et en bas, il y a doublon ») —
            la consigne était redite ici ET dans l'en-tête d'`EcranNoeud`, seul propriétaire du
            `BoutonEcouter`. La ligne qui la portait (`data-consigne-texte`) est retirée : ce
            moteur n'a pas de meilleur usage à lui donner, contrairement à `phrase` qui y a mis
            la phrase en train de se construire. L'exigence d'AFFICHAGE n'a rien perdu — elle
            vit désormais dans `tests/composants/EcranNoeud.test.tsx`. La scène récupère
            l'espace : un enfant de plus pour la réserve et les zones, avant le pied. */}
        <div className="scene-place-defilable">
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
        </div>

        <Reserve
          elements={reserveMelangee}
          elementsAttendus={elementsAttendus}
          places={etat.places}
          elementSaisi={etat.elementSaisi}
          animationsDesactivees={animationsDesactivees}
          onSaisir={saisir}
        />

        <p role="status" aria-live="polite" data-rappel={rappel === '' ? 'non' : 'oui'}>
          <MessageStable messages={[messageRappel]}>{rappel}</MessageStable>
        </p>
      </div>
    </DndContext>
  );
}
