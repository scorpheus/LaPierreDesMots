/**
 * `MoteurTri` — le composant hôte du moteur `tri`. Lot L2-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurTri` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionTri`,
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
import type { ActionTri, ContenuTri, EtatTri } from '@pierre/partage';
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

export function MoteurTri(
  proprietes: ProprietesMoteur<ContenuTri, EtatTri, ActionTri>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionTri);
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
    (action: ActionTri, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;

  return (
    <div
      data-moteur="tri"
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

      <div data-plateau="reserve" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.elements.map((element) => (
          <button
            key={element.id}
            type="button"
            data-element={element.id}
            data-saisi={etat.elementSaisi === element.id ? 'oui' : 'non'}
            data-range={etat.acquis[element.id] ?? 'non'}
            style={STYLE_CIBLE}
            onClick={(evenement) => {
              jouer({ type: 'saisir', element: element.id }, evenement);
            }}
          >
            {element.libelle}
          </button>
        ))}
      </div>

      <div data-plateau="receptacles" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.receptacles.map((receptacle) => (
          <button
            key={receptacle.id}
            type="button"
            data-receptacle={receptacle.id}
            style={{ ...STYLE_CIBLE, minWidth: CIBLE_PX * 3 }}
            onClick={(evenement) => {
              // Sans élément en main, le dépôt est simplement ignoré : aucun refus, aucun
              // son, aucun compte. Un doigt qui traîne ne coûte rien.
              if (etat.elementSaisi === null) return;
              jouer(
                { type: 'deposer', element: etat.elementSaisi, receptacle: receptacle.id },
                evenement,
              );
            }}
          >
            {/* Le critère est du texte à déchiffrer : il passe donc par la zone de lecture. */}
            <ZoneDeLecture texte={receptacle.critere} motsCles={[]} />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* R15 : réécouter est gratuit, sans limite, et ne coûte aucune étoile. */}
        <button
          type="button"
          data-action="ecouter"
          style={STYLE_CIBLE}
          onClick={() => {
            emettre({ type: 'ecouterConsigne' } as ActionTri);
          }}
        >
          Écouter
        </button>
        {/* L'aide de Gobi ne coûte rien et n'est jamais présentée comme un échec. */}
        <button
          type="button"
          data-action="aide"
          style={STYLE_CIBLE}
          onClick={() => {
            emettre({ type: 'demanderAide' } as ActionTri);
          }}
        >
          Gobi, aide-moi
        </button>
      </div>

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
