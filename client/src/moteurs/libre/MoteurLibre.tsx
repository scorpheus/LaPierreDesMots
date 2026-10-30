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
import type { ActionLibre, ContenuLibre, EtatLibre } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { SceneLibre } from './SceneLibre.js';
import './libre.css';

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
    <DispositionMoteur
      moteur="libre"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      /* ── LA TOILE ────────────────────────────────────────────────────────────────────────
          `libre` n'a rien à poser SUR le décor (aucun mot, contrairement à `phrase`) : le
          décor EST le jeu, à pleine surface, et chaque région tapée prend la couleur choisie.
          `data-plateau="regions"` est conservé : c'est le sélecteur que les tests visent. */
      scene={
        <div data-plateau="regions" className="libre-toile">
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
      }
      /* Le nuancier accueille aussi le bouton de fin ; la consigne est déjà lue par la barre
          de `EcranNoeud`. */
      reserve={
        <div data-plateau="nuancier" className="libre-nuancier">
          {contenu.nuancierAutorise.map((couleur) => (
            <button
              key={couleur}
              type="button"
              className="libre-godet"
              data-couleur={couleur}
              data-choisie={etat.couleurChoisie === couleur ? 'oui' : 'non'}
              aria-pressed={etat.couleurChoisie === couleur}
              style={{ backgroundColor: hexDeCouleur(couleur) }}
              onClick={(evenement) => {
                jouer({ type: 'choisirCouleur', couleur }, evenement);
              }}
            >
              <span className="libre-godet__nom">{couleur}</span>
            </button>
          ))}

          <button
            type="button"
            data-action="terminer"
            className="cible libre-terminer"
            onClick={() => {
              emettre({ type: 'terminer' } as ActionLibre);
            }}
          >
            J’ai fini
          </button>
        </div>
      }
    />
  );
}
