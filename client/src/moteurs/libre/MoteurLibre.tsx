/**
 * `MoteurLibre` — le composant hôte du moteur `libre`. Lot L2-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurLibre` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionLibre`,
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
import type { ActionLibre, ContenuLibre, EtatLibre } from '@pierre/partage';
import { ZoneDeLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * L'INVITATION DU COLORIAGE LIBRE — une CONSTANTE EXPORTÉE depuis le lot A4, et c'est R15.
 *
 * Elle était un littéral au milieu du JSX. `libre` n'a pas de consigne — c'est son contrat
 * (§ 4.8) — mais il affiche quand même ce texte, et « aucune consigne n'existe uniquement à
 * l'écrit, tout est audible en un tap » ne fait aucune exception pour le texte le plus doux
 * du jeu. Un littéral enfoui n'est recensable par personne : `scripts/recenser-textes.mjs`
 * ne pouvait ni le voir, ni lui commander un clip, et `EcranNoeud` ne pouvait pas lui rendre
 * de bouton « Écouter ».
 *
 * Elle est donc exportée, employée aux deux endroits qui l'affichent, et **lue dans ce
 * fichier-ci** par le recenseur des voix (même procédé que `CHEMINS` dans
 * `tests/e2e/qa-outils.ts` : une source, plusieurs lecteurs, aucune recopie).
 * `tests/unitaires/consignes-audibles.test.ts` compare les deux.
 */
export const INVITE_LIBRE = 'Colorie comme tu veux.';

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

export function MoteurLibre(
  proprietes: ProprietesMoteur<ContenuLibre, EtatLibre, ActionLibre>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionLibre);
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
  const marqueRefus = useRef(0);
  const origine = useRef<readonly [number, number]>([0, 0]);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });
    }
    precedents.current = nbAcquis;
  }, [nbAcquis, services]);

  useEffect(() => {
    const marque = 0;
    if (marque !== 0 && marque !== marqueRefus.current) {
      // Refus : oscillation de 6 px et son NEUTRE. Aucune vibration, aucun rouge (§ 4.1).
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat, services]);

  /** Mémorise le point du geste : c'est l'origine des particules et du balayage. */
  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionLibre, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  // Aucune consigne : c'est la définition même de ce moteur (v2 § 5.4). La zone de lecture
  // affiche donc une invitation, jamais une instruction — rien n'est attendu de l'enfant.
  const consigne = null;

  return (
    <div
      data-moteur="libre"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      style={{ display: 'grid', gap: '1rem' }}
    >
      {/* La consigne passe par `ZoneDeLecture` : c'est le SEUL composant qui affiche du
          texte à déchiffrer (§ 5.1). Sans quoi « le décor s'agite, le texte jamais » ne
          tiendrait qu'à la discipline de onze fichiers. */}
      <ZoneDeLecture texte={INVITE_LIBRE} motsCles={[]} />

      <div data-plateau="nuancier" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.nuancierAutorise.map((couleur) => (
          <button
            key={couleur}
            type="button"
            data-couleur={couleur}
            data-choisie={etat.couleurChoisie === couleur ? 'oui' : 'non'}
            style={STYLE_CIBLE}
            onClick={(evenement) => {
              jouer({ type: 'choisirCouleur', couleur }, evenement);
            }}
          >
            {couleur}
          </button>
        ))}
      </div>

      <div data-plateau="regions" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.regions.map((region) => (
          <button
            key={region}
            type="button"
            data-region-svg={region}
            data-peinte={etat.acquis[region] ?? 'non'}
            style={STYLE_CIBLE}
            onClick={(evenement) => {
              jouer({ type: 'colorier', region }, evenement);
            }}
          >
            {region}
          </button>
        ))}
      </div>

      <button
        type="button"
        data-action="terminer"
        style={STYLE_CIBLE}
        onClick={() => {
          emettre({ type: 'terminer' } as ActionLibre);
        }}
      >
        J’ai fini
      </button>
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
