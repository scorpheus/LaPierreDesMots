/**
 * `MoteurChemin` — le composant hôte du moteur `chemin`. Lot L2-E, mise en scène portée depuis
 * `phrase` (R51/R52), et le défaut le plus criant du lot :
 *
 *     data-pion, data-atteignable et data-franchie sont dans le DOM, et AUCUN des trois n'a de
 *     rendu. Ni plateau, ni pion, ni trace.
 *
 * Le plateau était une rangée de boutons en `flexWrap: wrap` pour une scène qui promet des
 * nénuphars ou des pas japonais. Ce lot lui donne un VRAI plateau.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurChemin` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionChemin`, fait battre l'horloge du moteur, déclenche
 * le retour sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * OÙ SONT POSÉES LES CASES, ET POURQUOI CE N'EST PAS `case.position`
 *
 * Le schéma de contenu déclare un champ `position` par case (§ 4.8, gelé) — mais AUCUNE loi de
 * jeu ne le lit : `evaluerChemin` (validation.ts) ne s'appuie que sur `voisines`. C'est un
 * repère de mise en page laissé à la main du rédacteur de contenu, et c'est très exactement ce
 * que R47/R52 ont remplacé pour `phrase` : « les cases prennent une position dans l'habillage,
 * comme `place` le fait avec ses centroïdes » — consigne du brief de ce lot. Les cases sont
 * donc placées par la MÊME dérivation que les mots de `phrase` et les options d'`eclair`
 * (`client/src/moteurs/eclair/mise-en-scene.ts`), en un seul appel qui couvre TOUTES les
 * cases de l'exercice : le plateau est un objet stable, pas une révélation progressive comme
 * les étiquettes de `phrase`. `case.position` reste dans le contenu — le schéma ne bouge pas
 * sans validation — mais il n'est plus lu ici.
 *
 * ── CE QUI SE VOIT MAINTENANT ──────────────────────────────────────────────────────────────────
 *   - **`data-pion`** — un marqueur distinct, qui GLISSE d'une case à l'autre (transition CSS
 *     sur la position, coupée sous `prefers-reduced-motion`/animations calmes, jamais dans le
 *     champ de lecture puisqu'il n'y en a pas ici) ;
 *   - **`data-atteignable`** — une bordure et un halo statiques sur les cases voisines de celle
 *     où repose le pion ; statique, donc aucune capture T4 ne devient instable ;
 *   - **`data-franchie`** — la case garde sa couleur de décor rallumée et une marque discrète :
 *     une case franchie n'est jamais escamotée (« un acquis n'est jamais repris », R14).
 *   - **les voisinages** — un trait fin relie les cases voisines, pour que « chemin » soit
 *     vraiment un graphe et non un tas de boutons.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `consigne.texte`. Ce moteur ne la redit plus.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionChemin, ContenuChemin, EtatChemin } from '@pierre/partage';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { ProprietesMoteur } from '../types.js';
import {
  cadreJeuEtBornes,
  mesurerTexte,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  styleZoneDeJeu,
  useDerniereAllumee,
  useMesureCadre,
} from '../eclair/mise-en-scene.js';
import { PorteurPose } from '../eclair/porteur-pose.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * CE QUE LE REFUS DIT — jamais la case attendue. `case-non-adjacente` n'est PAS un motif de
 * refus au sens sensoriel : `validation.ts` le dit explicitement (« un geste hors de portée est
 * ignoré sans bruit ») — le pion ne bouge pas, rien n'est compté, et le rendu ne joue donc ni
 * oscillation ni son pour lui. Les deux autres motifs sont de vraies erreurs de lecture.
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'case-hors-parcours': 'On cherche une autre case pour continuer le chemin.',
  'case-deja-franchie': 'Cette case est déjà franchie.',
  'case-inconnue': 'On cherche une autre case pour continuer le chemin.',
};

export function MoteurChemin(
  proprietes: ProprietesMoteur<ContenuChemin, EtatChemin, ActionChemin>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionChemin);
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
    // « case-non-adjacente » ne joue ni son ni oscillation — c'est le contrat de
    // `validation.ts` : le pion ne bouge pas, rien n'est compté, un geste imprécis ne coûte
    // rien (R16). Un vrai refus de lecture (case hors du parcours attendu, déjà franchie)
    // garde le retour sensoriel habituel.
    if (marque !== 0 && marque !== marqueRefus.current && etat.dernierRefus?.motif !== 'case-non-adjacente') {
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
    (action: ActionChemin, evenement: { clientX: number; clientY: number }) => {
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
  const { cadreJeu, bornes } = useMemo(() => cadreJeuEtBornes(cadre, hauteurBande), [cadre, hauteurBande]);

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const caseParId = useMemo(
    () => new Map(contenu.cases.map((c) => [c.id, c] as const)),
    [contenu.cases],
  );
  const mesurer = useCallback(
    (cle: string) => mesurerTexte(caseParId.get(cle)?.libelle ?? '', reglages),
    [caseParId, reglages],
  );

  // --- le plateau : population STABLE, une seule dérivation --------------------
  const idsCases = useMemo(() => contenu.cases.map((c) => c.id), [contenu.cases]);
  const plans = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape: [idsCases],
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
      }),
    [habillage, idsCases, regions, cadreJeu, bornes, mesurer],
  );
  const emplacements = plans[0]?.resultat.emplacements ?? [];
  const positionParCase = useMemo(
    () => new Map(emplacements.map((e) => [e.cle, { x: e.x, y: e.y }] as const)),
    [emplacements],
  );

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plans, etat.acquis, centroideParRegion),
    [plans, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  // --- les voisinages, en traits fins entre les centres -------------------------
  const traits = useMemo(() => {
    const vus = new Set<string>();
    const lignes: { readonly cle: string; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }[] = [];
    for (const c of contenu.cases) {
      const depart = positionParCase.get(c.id);
      if (depart === undefined) continue;
      for (const voisine of c.voisines) {
        const paire = [c.id, voisine].sort().join('|');
        if (vus.has(paire)) continue;
        vus.add(paire);
        const arrivee = positionParCase.get(voisine);
        if (arrivee === undefined) continue;
        lignes.push({ cle: paire, x1: depart.x, y1: depart.y, x2: arrivee.x, y2: arrivee.y });
      }
    }
    return lignes;
  }, [contenu.cases, positionParCase]);

  const casesAtteignables = useMemo(() => {
    const courante = contenu.cases.find((c) => c.id === etat.position);
    return new Set(courante?.voisines ?? []);
  }, [contenu.cases, etat.position]);

  const positionPion = etat.position === null ? null : positionParCase.get(etat.position) ?? null;

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.caseVisee;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null || etat.dernierRefus.motif === 'case-non-adjacente'
      ? ''
      : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  const transitionPion = animationsDesactivees ? undefined : 'inset-inline-start 320ms ease-out, inset-block-start 320ms ease-out';

  return (
    <div
      ref={racine}
      data-moteur="chemin"
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
      {/* ------------------------------------------------------------- le décor, en fond */}
      <div style={styleZoneDeJeu(hauteurBande)}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
        />
      </div>

      {/* ----------------------------------------------------- les voisinages, en traits */}
      <svg
        aria-hidden="true"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 1, pointerEvents: 'none' }}
        width="100%"
        height="100%"
      >
        {traits.map((ligne) => (
          <line
            key={ligne.cle}
            x1={ligne.x1}
            y1={ligne.y1}
            x2={ligne.x2}
            y2={ligne.y2}
            stroke="var(--trait)"
            strokeOpacity={0.35}
            strokeWidth={4}
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* ------------------------------------------------------------- les cases, posées */}
      <div
        data-plateau="cases"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 2, pointerEvents: 'none' }}
      >
        {contenu.cases.map((caseChemin) => {
          const pos = positionParCase.get(caseChemin.id);
          if (pos === undefined) return null;
          const surPion = etat.position === caseChemin.id;
          const atteignable = casesAtteignables.has(caseChemin.id);
          const franchie = etat.acquis[caseChemin.id] !== undefined;
          const refusee = etiquetteRefusee === caseChemin.id && etat.dernierRefus?.motif !== 'case-non-adjacente';
          const classes = ['cible'];
          if (!animationsDesactivees && refusee) classes.push('oscillation');
          return (
            <PorteurPose key={caseChemin.id} x={pos.x} y={pos.y}>
              <button
                key={refusee ? `${caseChemin.id}-${String(marqueRefusCourante)}` : caseChemin.id}
                type="button"
                data-case={caseChemin.id}
                data-pion={surPion ? 'oui' : 'non'}
                data-atteignable={atteignable ? 'oui' : 'non'}
                data-franchie={franchie ? 'oui' : 'non'}
                className={classes.join(' ')}
                style={
                  {
                    ...styleLecture,
                    pointerEvents: 'auto',
                    whiteSpace: 'nowrap',
                    // Atteignable : un halo STATIQUE (aucune image-clé), pour que les captures
                    // T4 restent stables — seule la couleur de fond diffère, jamais l'ombre de
                    // `.cible:active`.
                    boxShadow: atteignable
                      ? '0 0 0 4px var(--soleil), var(--ombre-bd)'
                      : undefined,
                    backgroundColor: franchie
                      ? 'color-mix(in srgb, var(--soleil) 25%, var(--parchemin))'
                      : undefined,
                  } as CSSProperties
                }
                onClick={(evenement) => {
                  jouer({ type: 'avancer', caseVisee: caseChemin.id }, evenement);
                }}
              >
                {franchie ? <span aria-hidden="true">✓&nbsp;</span> : null}
                {caseChemin.libelle}
              </button>
            </PorteurPose>
          );
        })}

        {/* ── LE PION — un marqueur distinct de la case, qui glisse d'une case à l'autre.
            Purement décoratif : `aria-hidden`, la position réelle est déjà portée par
            `data-pion="oui"` sur la case elle-même, que les lecteurs d'écran et les tests
            lisent. */}
        {positionPion === null ? null : (
          <div
            aria-hidden="true"
            data-pion-marqueur="oui"
            style={{
              position: 'absolute',
              insetInlineStart: `${String(positionPion.x)}px`,
              insetBlockStart: `${String(positionPion.y - 44)}px`,
              transform: 'translate(-50%, -50%)',
              transition: transitionPion,
              fontSize: '1.75rem',
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 0 var(--trait))',
            }}
          >
            📍
          </div>
        )}
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
