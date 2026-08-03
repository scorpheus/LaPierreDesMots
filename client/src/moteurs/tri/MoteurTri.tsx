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

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * R16 — « ON N'ARRIVE PAS À DÉPLACER »
 *
 * Le père, sur tablette : « Range dans la grotte de gauche les mots avec la lettre B. En fait
 * sur la tablette, ça marche pas, on n'arrive pas à déplacer, on n'arrive pas à bien les mettre. »
 *
 * MESURÉ AVANT DE CONCLURE. `grep` sur ce fichier — `onPointer`, `onTouch`, `onDrag`,
 * `draggable`, `dnd-kit` — ne rendait **aucune ligne**. Ce moteur n'a jamais été un glisser :
 * c'est un TAP-PUIS-TAP, on touche le mot, puis on touche la grotte.
 *
 * Ce n'était donc pas un défaut tactile. C'était un défaut d'AFFORDANCE, et il était double :
 *
 *   1. l'état `data-saisi` existait déjà dans le DOM — et **rien ne le montrait**. L'enfant
 *      tapait un mot, l'écran ne bougeait pas, donc il concluait que le tap n'avait pas marché
 *      et essayait de glisser ;
 *   2. rien ne disait le geste attendu, alors que le mot « range » de la consigne en promet un
 *      autre.
 *
 * C'est exactement le défaut du campement au premier jour : « je n'ai pas compris à quoi
 * servent les formes » — des prises réelles, sans aucun signe qu'on peut les toucher. Le dessin
 * n'était pas en cause là non plus.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
const STYLE_EN_MAIN = {
  outline: '4px solid var(--soleil, #FFC93C)',
  outlineOffset: '3px',
  transform: 'translateY(-4px)',
  fontWeight: 700,
} as const;

/** Un élément déjà rangé ne s'efface pas — un acquis ne se reprend jamais (R14) — il se calme. */
const STYLE_RANGE = { opacity: 0.55 } as const;

/** Une grotte qui ATTEND quelque chose se signale. Sans main, elle reste au repos. */
const STYLE_RECEPTACLE_PRET = {
  outline: '4px dashed var(--soleil, #FFC93C)',
  outlineOffset: '3px',
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

      {/* LE GESTE, DIT EN CLAIR ET AU PRÉSENT. Deux phrases, jamais plus : elle change selon
          qu'on a quelque chose en main, donc elle décrit toujours LE PROCHAIN geste et non la
          règle générale. Un enfant qui déchiffre ne lit pas un mode d'emploi ; il lit ce qu'il
          doit faire maintenant.

          Elle est `aria-live` : un lecteur d'écran annonce le changement, qui est précisément
          l'information que l'affordance visuelle porte pour les autres. */}
      <p
        data-consigne-geste={etat.elementSaisi === null ? 'choisir' : 'deposer'}
        role="status"
        aria-live="polite"
        style={{ margin: 0, fontSize: '1.125rem', opacity: 0.9 }}
      >
        {etat.elementSaisi === null
          ? 'Touche un mot pour le prendre.'
          : 'Maintenant, touche l’endroit où il va.'}
      </p>

      <div data-plateau="reserve" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {contenu.elements.map((element) => (
          <button
            key={element.id}
            type="button"
            data-element={element.id}
            data-saisi={etat.elementSaisi === element.id ? 'oui' : 'non'}
            data-range={etat.acquis[element.id] ?? 'non'}
            style={{
              ...STYLE_CIBLE,
              ...(etat.elementSaisi === element.id ? STYLE_EN_MAIN : {}),
              ...(etat.acquis[element.id] === undefined ? {} : STYLE_RANGE),
            }}
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
            data-attend={etat.elementSaisi === null ? 'non' : 'oui'}
            style={{
              ...STYLE_CIBLE,
              minWidth: CIBLE_PX * 3,
              ...(etat.elementSaisi === null ? {} : STYLE_RECEPTACLE_PRET),
            }}
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
