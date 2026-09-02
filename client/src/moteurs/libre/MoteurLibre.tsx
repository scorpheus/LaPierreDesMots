/**
 * `MoteurLibre` — le composant hôte du moteur `libre`. Lot L2-E, mise en scène (lot des deux
 * derniers moteurs, après `phrase`).
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurLibre` (paquet `partage`) ; ce
 * composant fait quatre choses et pas une de plus : traduire un geste en `ActionLibre`,
 * faire battre l'horloge du moteur, déclencher le retour sensoriel, et donner à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER RENDAIT AVANT CE LOT, MESURÉ SUR LE CODE (pas une capture) :
 *
 *     <button data-region-svg="grande-paroi">grande-paroi</button>
 *     <button data-couleur="rouge">rouge</button>
 *
 * Le nom BRUT de chaque région et de chaque couleur, empilés en texte. Aucun SVG, aucune
 * forme, aucun trait : « libre » — la sortie de secours du campement (v2 § 5.4), celle « sans
 * culpabilité » — était le SEUL des quatorze moteurs sans le moindre décor, pas même à 14 %.
 * Peindre n'avait ni pinceau ni toile ; c'était une liste de cases à cocher qui portait les
 * noms de ce qu'on aurait dû voir.
 *
 * ── CE QUE CE LOT PORTE : LE DÉCOR, ET RIEN DE PLUS QUE LE GESTE DE PEINDRE ───────────────────
 * `libre` n'a pas de mots à poser sur des régions (ce n'est pas `phrase`) : il peint. La mise
 * en scène qui lui revient est donc celle de `colorie`, pas celle de `phrase` — une toile
 * entière, tapable, dont chaque région prend la couleur que l'enfant a choisie. `SceneLibre.js`
 * (ce dossier) la porte ; voir son en-tête pour le détail de la dérivation et pour la dette
 * chiffrée des régions sous 64 px.
 *
 * ── CE QUE CE LOT N'A PAS PORTÉ, DÉLIBÉRÉMENT ─────────────────────────────────────────────────
 * Ni réceptacle, ni fente : `libre` ne range rien nulle part, il colore une surface déjà là.
 * Ni vibration de refus, ni oscillation : `MotifRefusLibre = never`, il n'existe AUCUN geste
 * refusable ici (§ 4.8) — poser une secousse « au cas où » serait la même faute que le bouton
 * qui ne répond pas (R41), sous une autre forme : une mécanique qui ment sur ce qu'elle garde.
 *
 * TROIS INVARIANTS DE RENDU, opposables en revue :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs.** C'est la traduction mécanique
 *     de R14, et l'assertion centrale de `tests/e2e/cassecou.spec.ts` ;
 *   - **aucun rouge sur un refus** : il n'y a pas de refus, donc pas de secousse à ajouter ;
 *   - **toute cible fait au moins 64 px**, avec 24 px de tolérance (R16) — d'où `CIBLE_PX`.
 *
 * Le son, la vibration et les particules passent **tous** par `services.retour` (L2-A) : un
 * composant qui appellerait `FournisseurAudio` directement obligerait à réécrire la
 * dégradation par `prefers-reduced-motion` à chaque site d'appel, et un seul oubli la
 * casserait (contrat § 4.1).
 *
 * ⚠ SUITE DONNÉE AU RAPPORT : ce composant monte `<SceneLibre>`, un décor ACTIONNABLE — la
 * même famille que `SceneSvg` (`colorie`) et `ScenePlace` (`place`). `tests/unitaires/
 * decor-de-fond.test.ts` croise `MOTEURS_AVEC_SCENE_PROPRE` (`client/src/habillages/
 * DecorDeFond.tsx`) avec le code réel des moteurs ; ce fichier m'appartient en lecture seule
 * (consigne de ce lot), donc `'libre'` n'y est pas encore inscrit et ce test restera rouge tant
 * que ce n'est pas fait — exactement le même geste qui a inscrit `'phrase'` le 2026-08-07.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import type { ActionLibre, ContenuLibre, CouleurColoriage, EtatLibre } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { SceneLibre } from './SceneLibre.js';

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

/**
 * Le GODET — avant ce lot, un bouton ne portait que le NOM de la couleur en texte
 * (`<button>rouge</button>`) : rien à voir, tout à lire, pour un enfant qui choisit une couleur
 * précisément parce qu'il regarde. Le godet porte maintenant la couleur elle-même comme fond,
 * et le nom reste en légende accessible — jamais retiré, R15 vaut aussi pour un godet.
 */
function styleGodet(couleur: CouleurColoriage, choisie: boolean): Record<string, string | number> {
  return {
    ...STYLE_CIBLE,
    backgroundColor: hexDeCouleur(couleur),
    border: choisie ? '4px solid var(--soleil, #FFC93C)' : '2px solid var(--trait, #1B2440)',
    borderRadius: '999px',
    boxShadow: choisie ? '0 0 0 3px var(--parchemin, #FFF6E3) inset' : 'none',
    padding: 0,
  };
}

/**
 * Le nom de la couleur reste dans le DOM — c'est le nom accessible du godet — mais ne
 * s'affiche plus PAR-DESSUS le disque de couleur, où il serait souvent illisible (un « noir »
 * en texte noir sur fond noir, par exemple). Même technique que la note « région reprend ses
 * couleurs » de `MoteurPhrase.tsx`.
 */
const VISUELLEMENT_CACHE = {
  position: 'absolute',
  inlineSize: 1,
  blockSize: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
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

  return (
    <div
      data-moteur="libre"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      style={{
        display: 'grid',
        // La consigne est déjà portée et lue par la barre de `EcranNoeud`. La répéter ici
        // mangeait une ligne entière sans rien apprendre. Le nuancier accueille aussi le
        // bouton de fin : toute la hauteur restante appartient ainsi à la toile.
        gridTemplateRows: 'auto minmax(0, 1fr)',
        rowGap: '0.75rem',
        blockSize: '100%',
        minBlockSize: 0,
        paddingInline: '0.25rem',
      }}
    >
      <div
        data-plateau="nuancier"
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.25rem' }}
      >
        {contenu.nuancierAutorise.map((couleur) => (
          <button
            key={couleur}
            type="button"
            data-couleur={couleur}
            data-choisie={etat.couleurChoisie === couleur ? 'oui' : 'non'}
            aria-pressed={etat.couleurChoisie === couleur}
            style={styleGodet(couleur, etat.couleurChoisie === couleur)}
            onClick={(evenement) => {
              jouer({ type: 'choisirCouleur', couleur }, evenement);
            }}
          >
            <span style={VISUELLEMENT_CACHE}>{couleur}</span>
          </button>
        ))}

        <button
          type="button"
          data-action="terminer"
          className="cible"
          style={STYLE_CIBLE}
          onClick={() => {
            emettre({ type: 'terminer' } as ActionLibre);
          }}
        >
          J’ai fini
        </button>
      </div>

      {/* ── LA TOILE ────────────────────────────────────────────────────────────────────────
          `libre` n'a rien à poser SUR le décor (aucun mot, contrairement à `phrase`) : le
          décor EST le jeu, à pleine surface, et chaque région tapée prend la couleur choisie.
          `data-plateau="regions"` est conservé — c'est le sélecteur que les tests visaient déjà
          sur l'ancienne liste de boutons — mais il enveloppe maintenant une scène, pas une
          liste. */}
      <div
        data-plateau="regions"
        style={{
          position: 'relative',
          minBlockSize: 0,
          minInlineSize: 0,
          overflow: 'hidden',
        }}
      >
        <SceneLibre
          habillage={habillage}
          regionsOffertes={contenu.regions}
          remplissages={etat.acquis}
          animationsDesactivees={animationsDesactivees}
          onColorier={(region, evenement) => {
            jouer({ type: 'colorier', region }, evenement);
          }}
        />
      </div>
    </div>
  );
}
