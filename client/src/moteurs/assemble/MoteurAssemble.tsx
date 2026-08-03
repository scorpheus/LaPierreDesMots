/**
 * `MoteurAssemble` — le composant hôte du moteur `assemble`. Lot L2-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurAssemble` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionAssemble`,
 * faire battre l'horloge du moteur, déclencher le retour sensoriel, et donner à voir l'état.
 *
 * TROIS INVARIANTS DE RENDU, opposables en revue :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs.** C'est la traduction mécanique
 *     de R14, et l'assertion centrale de `tests/e2e/cassecou.spec.ts` ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px**, avec 24 px de tolérance (R16) — d'où `CIBLE_PX`.
 *
 * Le son, la vibration et les particules passent **tous** par `services.retour` (L2-A) : un
 * composant qui appellerait `FournisseurAudio` directement obligerait à réécrire la
 * dégradation par `prefers-reduced-motion` à chaque site d'appel, et un seul oubli la
 * casserait (contrat § 4.1).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import type { ActionAssemble, ContenuAssemble, EtatAssemble } from '@pierre/partage';
import { ZoneDeLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** R16 : 64 px de côté au minimum, 24 px de tolérance obtenus par l'écart entre cibles. */
const CIBLE_PX = 64;
const TOLERANCE_PX = 24;

const STYLE_CIBLE = {
  minWidth: CIBLE_PX,
  minHeight: CIBLE_PX,
  margin: TOLERANCE_PX / 2,
  fontSize: '1.25rem',
  cursor: 'pointer',
} as const;

export function MoteurAssemble(
  proprietes: ProprietesMoteur<ContenuAssemble, EtatAssemble, ActionAssemble>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionAssemble);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
  //
  // La série est comptée ICI, pas dans le moteur : c'est une notion de PLAISIR, pas de règle
  // (v2 § 8, D26 — « 2ᵉ bonne réponse = un demi-ton plus haut »). Le moteur reste pur, et le
  // jour où la hauteur montante changera, aucune logique de jeu ne bougera.
  const serie = useRef(0);
  const nbAcquis = Object.keys(etat.acquis).length;
  const precedents = useRef(nbAcquis);
  const marqueRefus = useRef(etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs);
  const origine = useRef<readonly [number, number]>([0, 0]);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });
    }
    precedents.current = nbAcquis;
  }, [nbAcquis, services]);

  useEffect(() => {
    const marque = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
    if (marque !== 0 && marque !== marqueRefus.current) {
      // Refus : oscillation de 6 px et son NEUTRE. Aucune vibration, aucun rouge (§ 4.1).
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat.dernierRefus, services]);

  /** Mémorise le point du geste : c'est l'origine des particules et du balayage. */
  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionAssemble, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;

  return (
    <div
      data-moteur="assemble"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      style={{ display: 'grid', gap: '1rem' }}
    >
      {/* La consigne passe par `ZoneDeLecture` : c'est le SEUL composant qui affiche du
          texte à déchiffrer (§ 5.1). Sans quoi « le décor s'agite, le texte jamais » ne
          tiendrait qu'à la discipline de onze fichiers. */}
      <ZoneDeLecture
        texte={consigne === null ? '' : consigne.texte}
        motsCles={consigne === null ? [] : consigne.motsCles}
      />

      <div data-plateau="mot" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {(consigne === null ? [] : consigne.solution).map((id) => {
          const bloc = contenu.blocs.find((b) => b.id === id);
          const pose = etat.acquis[id] !== undefined;
          return (
            <span
              key={id}
              data-fente={id}
              data-pose={pose ? 'oui' : 'non'}
              style={{ ...STYLE_CIBLE, display: 'inline-block' }}
            >
              {pose && bloc !== undefined ? bloc.libelle : '\u00a0'}
            </span>
          );
        })}
      </div>

      <div data-plateau="blocs" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.blocs.map((bloc) => (
          <button
            key={bloc.id}
            type="button"
            data-bloc={bloc.id}
            data-pose={etat.acquis[bloc.id] === undefined ? 'non' : 'oui'}
            style={STYLE_CIBLE}
            onClick={(evenement) => {
              jouer({ type: 'poser', bloc: bloc.id }, evenement);
            }}
          >
            {bloc.libelle}
          </button>
        ))}
      </div>
      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ──────────────
          Ce moteur rendait ici son propre « Écouter » et son propre « Gobi, aide-moi ». Les
          deux étaient MUETS : leur `onClick` émettait une action et n'appelait jamais le
          service de voix. Le père a tapé dessus et n'a rien eu — onze moteurs sur quatorze
          faisaient pareil, alors que « tout est audible en un tap » n'est pas négociable.

          `EcranNoeud` monte le vrai `BoutonEcouter` (qui joue le clip, et DISPARAÎT quand il
          n'y en a pas — D42) et le vrai `<Gobi>`, qui porte la même prise `data-action="aide"`.
          Un moteur ne peut pas héberger le vrai bouton d'écoute : il lui faudrait la clé
          `<exercice>/<consigne>`, et `ProprietesMoteur` ne porte pas l'identifiant d'exercice.
          Seul l'écran le connaît. */}

      <p
        role="status"
        aria-live="polite"
        data-animations={animationsDesactivees ? 'calmes' : 'vives'}
      >
        {etat.aide === null ? '' : (etat.aide.texte ?? '')}
      </p>
    </div>
  );
}
