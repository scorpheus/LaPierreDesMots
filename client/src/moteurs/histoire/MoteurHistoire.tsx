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
 * Le décor COUVRE désormais la zone de jeu et se RALLUME à mesure que les bonnes réponses sont
 * trouvées (R52). Les options sont posées à des emplacements DÉRIVÉS des régions de
 * l'habillage (`client/src/moteurs/eclair/mise-en-scene.ts`), jamais écrits à la main.
 *
 * ── LE RÉCIT RESTE UN CHAMP DE LECTURE, JAMAIS SUR LE DÉCOR ANIMÉ ─────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). `contenu.recit` peut faire plusieurs
 * phrases : le poser sur une pastille flottante le rendrait illisible. Il s'affiche donc en
 * PANNEAU, sur fond parchemin opaque, EN HAUT — jamais animé, jamais exclusif. Le basculer
 * reste gratuit et sans limite (R15), et `moteurHistoire.creerEtat` pose `recitVisible: true`
 * dès le départ : le récit et les options doivent donc rester TAPABLES en même temps. Une
 * première version de ce lot avait fait du récit un panneau qui recouvrait et désactivait les
 * options — la recette l'a attrapé (« bonne réponse » restait bloquée tant que le récit était
 * ouvert, c'est-à-dire tout le temps par défaut). Le récit occupe donc une bande du HAUT dont
 * la hauteur est mesurée, exactement comme la phrase modèle de `phrase` (R60), et le décor
 * avec ses options se replient dans ce qui reste.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
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
} from '../eclair/mise-en-scene.js';
import { PorteurPose } from '../eclair/porteur-pose.js';

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

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  // --- la mesure du cadre -----------------------------------------------------
  const { racine, bande, cadre, hauteurBande } = useMesureCadre();

  // Le récit n'est PAS un panneau exclusif qui bloquerait les options : R15 le rend
  // consultable pendant les questions, gratuitement, donc les deux doivent rester tapables
  // en même temps. Il occupe une bande en HAUT — même schéma que la phrase modèle de
  // `phrase` (R60) — et le décor avec ses options se replient dans ce qui reste.
  const recit = useRef<HTMLDivElement | null>(null);
  const [hauteurRecit, fixerHauteurRecit] = useState(0);
  useEffect(() => {
    if (!etat.recitVisible) {
      fixerHauteurRecit(0);
      return undefined;
    }
    const noeud = recit.current;
    if (noeud === null) return undefined;
    const relever = (): void => {
      const h = noeud.getBoundingClientRect().height;
      if (h > 0) fixerHauteurRecit(h);
    };
    relever();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    return () => {
      observateur.disconnect();
    };
  }, [etat.recitVisible]);

  const { cadreJeu, bornes } = useMemo(
    () => cadreJeuEtBornes(cadre, hauteurBande + hauteurRecit),
    [cadre, hauteurBande, hauteurRecit],
  );
  const styleZoneJeu = useMemo<CSSProperties>(
    () => ({
      position: 'absolute',
      insetInlineStart: 0,
      insetInlineEnd: 0,
      insetBlockStart: `${String(hauteurRecit)}px`,
      insetBlockEnd: `${String(hauteurBande)}px`,
    }),
    [hauteurRecit, hauteurBande],
  );

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
  const planCourant = plans[etat.indexEtape] ?? null;
  const emplacements = planCourant?.resultat.emplacements ?? [];

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plans, etat.acquis, centroideParRegion),
    [plans, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.option;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  return (
    <div
      ref={racine}
      data-moteur="histoire"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      style={{
        position: 'relative',
        blockSize: '100%',
        minBlockSize: 0,
        overflow: 'hidden',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      {/* ── LE RÉCIT — bande du HAUT, jamais sur le décor animé ─────────────────────────────
          Basculer est GRATUIT et sans limite (R15), et ne bloque JAMAIS les options : c'est
          le défaut que la première version de ce lot a introduit et que la recette a attrapé
          (« bonne réponse » restait à `data-etapes-finies="0"` tant que le récit était ouvert,
          alors qu'il l'est PAR DÉFAUT — `moteurHistoire.creerEtat` pose `recitVisible: true`).
          Le récit occupe donc une bande en HAUT, comme la phrase modèle de `phrase` (R60), et
          le décor avec ses options se replient dans ce qui reste — jamais l'inverse. */}
      {etat.recitVisible ? (
        <div
          ref={recit}
          data-plateau="recit"
          data-visible="oui"
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            insetBlockStart: 0,
            zIndex: 2,
            maxBlockSize: '45%',
            display: 'grid',
            alignContent: 'start',
            padding: '0.75rem',
            overflow: 'auto',
            backgroundColor: 'var(--parchemin)',
            border: 'var(--epaisseur-trait) solid var(--trait)',
            borderRadius: 'var(--rayon-carte)',
          }}
        >
          <ZoneDeLecture texte={contenu.recit} motsCles={[]} etiquette={`L’histoire : ${contenu.titre}`} />
        </div>
      ) : (
        // Élément présent même masqué : c'est ce qu'une recette observe pour vérifier le
        // basculement, exactement comme `[data-plateau="eclair"]` le fait pour `eclair`.
        <div data-plateau="recit" data-visible="non" hidden />
      )}

      {/* ------------------------------------------------------------- le décor, en fond */}
      <div style={styleZoneJeu}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* ------------------------------------------------------- les options, posées dessus
          TOUJOURS tapables — y compris pendant que le récit est ouvert au-dessus : R15 dit
          « gratuit », pas « exclusif ». */}
      <div data-plateau="options" style={{ ...styleZoneJeu, zIndex: 1, pointerEvents: 'none' }}>
        {emplacements.map((emplacement) => {
          const option = optionParId.get(emplacement.cle);
          if (option === undefined) return null;
          const refusee = etiquetteRefusee === emplacement.cle;
          const classes = ['cible'];
          if (!animationsDesactivees && refusee) classes.push('oscillation');
          return (
            <PorteurPose key={emplacement.cle} x={emplacement.x} y={emplacement.y}>
              <button
                key={refusee ? `${emplacement.cle}-${String(marqueRefusCourante)}` : emplacement.cle}
                type="button"
                data-option={emplacement.cle}
                className={classes.join(' ')}
                style={{ ...styleLecture, pointerEvents: 'auto', whiteSpace: 'nowrap' } as CSSProperties}
                onClick={(evenement) => {
                  jouer({ type: 'repondre', option: emplacement.cle }, evenement);
                }}
              >
                {option.libelle}
              </button>
            </PorteurPose>
          );
        })}
      </div>

      {/* ------------------------------------------------------------ la bande statique */}
      <div
        ref={bande}
        data-plateau="controles"
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          insetBlockEnd: 0,
          zIndex: 3,
          display: 'grid',
          gap: '0.5rem',
          padding: '0.75rem',
        }}
      >
        <button
          type="button"
          data-action="recit"
          className="cible"
          style={{ ...styleLecture, justifySelf: 'start' } as CSSProperties}
          onClick={() => {
            emettre({ type: 'basculerRecit' } as ActionHistoire);
          }}
        >
          {etat.recitVisible ? 'Cacher l’histoire' : 'Relire l’histoire'}
        </button>

        <p
          role="status"
          aria-live="polite"
          data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
          data-animations={animationsDesactivees ? 'calmes' : 'vives'}
          style={{ ...styleLecture, margin: 0, minBlockSize: '1.5em' } as CSSProperties}
        >
          {messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}
        </p>

        <p
          role="status"
          aria-live="polite"
          data-annonce="coloriage"
          style={{
            position: 'absolute',
            inlineSize: 1,
            blockSize: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {derniere === null
            ? ''
            : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
        </p>
      </div>

      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ────────────── */}
    </div>
  );
}
