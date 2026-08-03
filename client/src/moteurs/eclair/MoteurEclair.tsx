/**
 * `MoteurEclair` — le composant hôte du moteur `eclair`. Lot L2-E.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurEclair` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionEclair`,
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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ActionEclair, ContenuEclair, EtatEclair } from '@pierre/partage';
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

export function MoteurEclair(
  proprietes: ProprietesMoteur<ContenuEclair, EtatEclair, ActionEclair>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionEclair);
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
    (action: ActionEclair, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // « QUAND JE CLIQUE SUR REVOIR, ÇA NE FAIT RIEN » — trouvé en jouant, le 2026-08-03.
  //
  // Il avait raison, et la cause était structurelle, pas accidentelle :
  //
  //     eclairVisible = etat.finExpositionMs === null
  //
  // `finExposition` fixe `finExpositionMs` **une seule fois et ne le remet jamais à zéro** —
  // et c'est VOULU : cette date est l'origine de la latence de reconnaissance (D18), la mesure
  // principale de ce moteur, et la revoir ne doit pas effacer la première, qui est la vraie.
  // Mais `revoirEclair` n'incrémentait qu'un compteur d'écoutes. Dès que le mot avait disparu
  // une fois, `eclairVisible` était faux POUR TOUJOURS.
  //
  // Le bouton s'appelle « Revoir », le réducteur commente « GRATUIT et sans limite, comme
  // réécouter la consigne (R15) », et rien ne réapparaissait jamais. L'intention se lisait dans
  // le code ; le rendu disait l'inverse — même famille que le `<use>` du voile de Grisaille.
  //
  // Et AUCUN test ne l'exerçait : `grep -rln revoirEclair tests/` ne rendait aucun fichier de
  // recette. Le contrôle était impossible à voir sans jouer.
  //
  // ── LA CORRECTION, ET POURQUOI ELLE NE TOUCHE PAS L'ÉTAT PARTAGÉ ───────────────────────────
  // La VISIBILITÉ de l'éclair devient un état de rendu ; `finExpositionMs` reste la MESURE.
  // Les deux étaient confondus dans un seul champ, et c'est cette confusion qui rendait
  // « revoir » impossible sans fausser D18. Le journal, le rejeu et la latence sont inchangés :
  // le réducteur ignore toujours les `finExposition` suivants.
  //
  // `nbEcoutes` sert de déclencheur : chaque « Revoir » l'incrémente, donc l'effet rejoue et le
  // mot réapparaît pour la même durée. `emettre` passe par une référence plutôt que par les
  // dépendances — une identité de fonction qui changerait à chaque rendu relancerait l'effet
  // sans fin, et le mot ne disparaîtrait plus jamais. C'est le défaut symétrique de celui qu'on
  // corrige, et il serait tout aussi silencieux.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const dureeMs = consigne === null ? 0 : consigne.expositionMs;
  const nbRevues = etape === undefined ? 0 : etape.nbEcoutes;
  const [eclairVisible, fixerEclairVisible] = useState(true);

  const refEmettre = useRef(emettre);
  refEmettre.current = emettre;

  useEffect(() => {
    if (consigne === null) return undefined;
    fixerEclairVisible(true);
    // Le `setTimeout` vit ICI, dans le rendu, jamais dans la logique (§ 4.8, règle 3).
    const identifiant = setTimeout(() => {
      fixerEclairVisible(false);
      refEmettre.current({ type: 'finExposition' } as ActionEclair);
    }, dureeMs);
    return () => {
      clearTimeout(identifiant);
    };
  }, [consigne, dureeMs, nbRevues]);

  return (
    <div
      data-moteur="eclair"
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

      <div data-plateau="eclair" data-visible={eclairVisible ? 'oui' : 'non'}>
        {eclairVisible && consigne !== null ? (
          <ZoneDeLecture texte={consigne.mot} motsCles={[consigne.mot]} />
        ) : null}
      </div>

      <button
        type="button"
        data-action="revoir"
        style={STYLE_CIBLE}
        onClick={() => {
          emettre({ type: 'revoirEclair' } as ActionEclair);
        }}
      >
        Revoir
      </button>

      <div data-plateau="options" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {(consigne === null ? [] : consigne.options).map((id) => {
          const option = contenu.options.find((o) => o.id === id);
          if (option === undefined) return null;
          return (
            <button
              key={id}
              type="button"
              data-option={id}
              style={STYLE_CIBLE}
              onClick={(evenement) => {
                jouer({ type: 'repondre', option: id }, evenement);
              }}
            >
              {option.libelle}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* R15 : réécouter est gratuit, sans limite, et ne coûte aucune étoile. */}
        <button
          type="button"
          data-action="ecouter"
          style={STYLE_CIBLE}
          onClick={() => {
            emettre({ type: 'ecouterConsigne' } as ActionEclair);
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
            emettre({ type: 'demanderAide' } as ActionEclair);
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
