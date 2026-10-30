/**
 * `MoteurHistoire` — le composant hôte du moteur `histoire`. Lot L2-E, mise en scène portée
 * depuis `phrase` (R51/R52) après la lecture du décor par le père.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurHistoire` (paquet
 * `partage`) ; ce composant traduit un geste en `ActionHistoire`, fait battre l'horloge du
 * moteur, déclenche le retour sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * Le décor se RALLUME à mesure que les bonnes réponses sont trouvées (R52) ; la cascade de
 * recoloration se calcule toujours par `mise-en-scene.ts`. Les options, elles, ne sont PAS posées
 * sur le décor : E09 (retour du parent, 9 octobre 2026) — elles suivent la question, dans un bloc
 * question + réponses sous le récit. Dérogation à la décision D pour ce moteur, écrite dans
 * Docs/socle-questions-et-lecture-2026-10-09.md § 5.
 *
 * ── LE RÉCIT RESTE UN CHAMP DE LECTURE, JAMAIS SUR LE DÉCOR ANIMÉ ─────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). `contenu.recit` peut faire plusieurs
 * phrases : le poser sur une pastille flottante le rendrait illisible. Il s'affiche donc en
 * PANNEAU, sur fond parchemin opaque, EN HAUT — jamais animé, jamais exclusif. Le basculer
 * reste gratuit et sans limite (R15), et `moteurHistoire.creerEtat` pose `recitVisible: true`
 * dès le départ : le récit et les options doivent donc rester TAPABLES en même temps. Une
 * première version de ce lot avait fait du récit un panneau qui recouvrait et désactivait les
 * options — la recette l'a attrapé (« bonne réponse » restait bloquée tant que le récit était
 * ouvert, c'est-à-dire tout le temps par défaut). Le récit occupe donc le HAUT de la scène, et le décor
 * se replie dans ce qui reste.
 *
 * ── LA QUESTION N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `question.texte` dans sa barre de consigne — il lit
 * `jeu.contenu.questions[].texte`, une forme que ce moteur déclare explicitement (voir
 * `EcranNoeud.extraireEtapes`). La répéter ici faisait lire deux fois la même ligne à un enfant
 * qui déchiffre. **Ce n'est PAS le récit**, qui lui n'est affiché nulle part ailleurs et reste
 * donc ici, en entier.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { CadreQuestion, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';
import type { ActionHistoire, ContenuHistoire, EtatHistoire } from '@pierre/partage';
import { ZoneDeLecture, styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { ProprietesMoteur } from '../types.js';
import {
  cadreJeuEtBornes,
  mesurerTexte,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  useDerniereAllumee,
  useMesureCadre,
} from '../commun/mise-en-scene.js';
import './histoire.css';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** CE QUE LE REFUS DIT — jamais l'option attendue (v2 § 5.4, même discipline que `phrase`). */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'option-fausse': 'On cherche une autre réponse.',
  'option-hors-question': 'Cette réponse n’est pas proposée pour cette question.',
  'question-deja-repondue': 'Cette question a déjà sa réponse.',
  'option-inconnue': 'On cherche une autre réponse.',
};

export function MoteurHistoire(
  proprietes: ProprietesMoteur<ContenuHistoire, EtatHistoire, ActionHistoire>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionHistoire);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
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
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat.dernierRefus, services]);

  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionHistoire, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const questionCourante = contenu.questions[etat.indexEtape];

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  // Seules les variables de lecture descendent : les mots les lisent par la feuille de style.
  const variablesLecture = useMemo(
    () => Object.fromEntries(Object.entries(styleDeLecture(reglages)).filter(([cle]) => cle.startsWith('--'))),
    [reglages],
  );

  // --- la mesure du cadre -----------------------------------------------------
  const { racine, cadre } = useMesureCadre();
  const regimeCompact = cadre.largeur <= 700 || cadre.hauteur <= 520;

  // Le récit et les options restent tapables en même temps (R15). Le décor reçoit ce que la
  // scène lui laisse ; la cascade de recoloration se calcule sur le cadre entier de la scène.
  const { cadreJeu, bornes } = useMemo(() => cadreJeuEtBornes(cadre, 0), [cadre]);

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const optionParId = useMemo(
    () => new Map(contenu.options.map((o) => [o.id, o] as const)),
    [contenu.options],
  );

  const mesurer = useCallback(
    (cle: string) => mesurerTexte(optionParId.get(cle)?.libelle ?? '', reglages),
    [optionParId, reglages],
  );

  // --- la dérivation : les options, en cascade par question --------------------
  const listesParEtape = useMemo(() => etat.etapes.map((e) => [...e.ordreAffichage]), [etat.etapes]);
  const plans = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
      }),
    [habillage, listesParEtape, regions, cadreJeu, bornes, mesurer],
  );

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plans, etat.acquis, centroideParRegion),
    [plans, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.option;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  const scene = (
    <div ref={racine} className="histoire" style={variablesLecture as CSSProperties}>
      <div className="histoire__grille">
      {/* ── LE RÉCIT — en haut de la scène, jamais sur le décor animé ──────────────────────
          Basculer est GRATUIT et sans limite (R15), et ne bloque JAMAIS les options. */}
      {etat.recitVisible ? (
        <div data-plateau="recit" data-visible="oui" className="histoire__recit">
          <ZoneDeLecture texte={contenu.recit} motsCles={[]} etiquette={`L’histoire : ${contenu.titre}`} />
        </div>
      ) : (
        // Élément présent même masqué : c'est ce qu'une recette observe pour vérifier le
        // basculement, exactement comme `[data-plateau="eclair"]` le fait pour `eclair`.
        <div data-plateau="recit" data-visible="non" hidden />
      )}

      {/* E09 / T19 : la question (thème question du socle) et ses réponses (thème réponse)
          forment UN bloc, juste sous le récit : on lit, on lit la question, on répond dessous.
          Les réponses ne sont plus dans la réserve à droite, loin de la question, ni posées sur
          le décor (dérogation à la décision D pour ce moteur : Docs/socle-questions-et-lecture-2026-10-09.md § 5). */}
      <div className="histoire__bloc-question">
        <CadreQuestion
          cle={etat.indexEtape}
          animationsDesactivees={animationsDesactivees}
          data-plateau="etape-histoire"
          className="histoire__question"
          data-etape-courante={String(Math.min(etat.indexEtape + 1, etat.etapes.length))}
          data-etapes-total={String(etat.etapes.length)}
          aria-label={`Question actuelle : ${questionCourante?.texte ?? 'Réponds à la question.'}`}
        >
          <span data-regle-histoire="oui" className="histoire__regle">
            <TexteColore texte="À toi de choisir :" />
          </span>{' '}
          <span data-cible-histoire="oui" className="histoire__lecture">
            <TexteColore texte={questionCourante?.texte ?? 'Réponds à la question.'} />
          </span>
        </CadreQuestion>

        {/* Les options sont toujours tapables — y compris pendant que le récit est ouvert :
            R15 dit « gratuit », pas « exclusif ». */}
        <div data-plateau="options" className="histoire__options">
          {(etape?.ordreAffichage ?? []).map((cle) => {
            const option = optionParId.get(cle);
            if (option === undefined) return null;
            const refusee = etiquetteRefusee === cle;
            const classes = ['cible', 'histoire__option'];
            if (!animationsDesactivees && refusee) classes.push('oscillation');
            return (
              <button
                key={refusee ? `${cle}-${String(marqueRefusCourante)}` : cle}
                type="button"
                {...ROLE_REPONSE}
                data-option={cle}
                className={classes.join(' ')}
                onClick={(evenement) => {
                  jouer({ type: 'repondre', option: cle }, evenement);
                }}
              >
                <TexteColore texte={option.libelle} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- le décor */}
      <div className="histoire__decor">
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>
      </div>
    </div>
  );

  const pied = (
    <div data-plateau="controles" className="histoire__controles">
      <button
        type="button"
        data-action="recit"
        className="cible histoire__interface"
        onClick={() => {
          emettre({ type: 'basculerRecit' } as ActionHistoire);
        }}
      >
        {etat.recitVisible ? 'Cacher l’histoire' : 'Relire l’histoire'}
      </button>

      <p
        role="status"
        aria-live="polite"
        className="histoire__interface histoire__message"
        data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
        data-animations={animationsDesactivees ? 'calmes' : 'vives'}
      >
        <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}</MessageStable>
      </p>

      <p role="status" aria-live="polite" data-annonce="coloriage" className="sr-only">
        {derniere === null
          ? ''
          : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
      </p>
    </div>
  );

  // Les deux contrôles (écouter, aide) sont portés par l'écran, pas par le moteur (R10).
  return (
    <DispositionMoteur
      moteur="histoire"
      // Sur petit écran, le récit ouvert et la question réclament leur hauteur : la page défile
      // plutôt que de laisser la scène déborder sur « Relire l'histoire ».
      hauteurPetitEcran="contenu"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-composition={regimeCompact ? 'compacte' : 'confort'}
      data-regions-allumees={String(allumees.length)}
      scene={scene}
      pied={pied}
    />
  );
}
