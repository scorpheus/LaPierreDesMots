/**
 * `MoteurAttrape` — le composant hôte du moteur `attrape`. Lot L2-E, mise en scène portée
 * depuis `phrase` (R51/R52), et le défaut mesuré pour CE moteur :
 *
 *     « cibles MOBILES » → 0 primitive de mouvement dans le moteur
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurAttrape` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionAttrape`, fait battre l'horloge du moteur, déclenche
 * le retour sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * OÙ SONT POSÉES LES CIBLES, ET POURQUOI CE N'EST PAS UNE DÉRIVATION DE RÉGIONS
 *
 * `CibleAttrape.depart` est en coordonnées `viewBox` (le type le dit : « Position de départ en
 * coordonnées viewBox. Le mouvement appartient au rendu. ») — contrairement aux mots de
 * `phrase`, une cible a déjà sa place, choisie par le contenu. La bonne dérivation n'est donc
 * pas `deriverEmplacements` (qui invente une place) mais la MÊME transformation que le décor
 * applique déjà à son `viewBox` (`transformeMeet` / `versPixels`, `mise-en-scene.ts`) : décor
 * et cibles partagent alors un seul référentiel — la leçon de R40, déjà appliquée à `phrase`.
 *
 * ── LE MOUVEMENT, ET POURQUOI IL N'EST PAS UNE TROISIÈME `transform` SUR LE BOUTON ────────────
 * R54 (`Docs/decision-decor-de-fond-et-mots-poses.md`) : une image-clé qui touche `transform`
 * REMPLACE toute transformation déjà posée sur le MÊME élément, elle ne compose pas. Une cible
 * porte donc TROIS calques disjoints, chacun sa propriété :
 *   1. le porteur (`PorteurPose`) CENTRE, par sa propre `transform` ;
 *   2. un calque de DÉRIVE anime `transform` (la trajectoire) ;
 *   3. le bouton `.cible` garde `transform` pour lui seul (`:active`, `.oscillation`).
 * Aucun des trois n'écrase les autres : c'est exactement le schéma que `phrase` a validé pour
 * son porteur de mot et son oscillation.
 *
 * ── DÉTERMINISTE, SANS `Math.random` NI `Date.now` ────────────────────────────────────────────
 * La phase et l'amplitude de la dérive sont dérivées de l'IDENTIFIANT de la cible par un petit
 * hachage pur (`hacher`) : à mêmes cibles, même mouvement, d'une session à l'autre — et surtout
 * les cibles ne dérivent pas toutes en même temps, sans tirer un seul nombre aléatoire.
 *
 * ── `prefers-reduced-motion` : L'ÉTAT FINAL EST IDENTIQUE DANS LES DEUX RÉGIMES ────────────────
 * Animations coupées ⇒ aucune classe d'animation n'est posée, les cibles restent à leur
 * `depart`, immobiles : c'est le seul état qu'une capture T4 puisse figer sans instabilité.
 *
 * ── LA RECOLORATION DU DÉCOR NE SUIT PAS LA CIBLE ─────────────────────────────────────────────
 * Les cibles n'ont pas de région propre (elles flottent devant le décor, pas dedans) ; la
 * récompense visuelle du décor vient d'une cascade de régions sur les cibles BONNES de chaque
 * consigne, en cascade par étape — même mécanisme que les trous de `grave`.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI (R49) — `EcranNoeud` la porte déjà.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionAttrape, ContenuAttrape, EtatAttrape } from '@pierre/partage';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { ProprietesMoteur } from '../types.js';
import {
  CIBLE_MIN,
  cadreJeuEtBornes,
  lireViewBox,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  styleZoneDeJeu,
  transformeMeet,
  useDerniereAllumee,
  useMesureCadre,
  versPixels,
} from '../eclair/mise-en-scene.js';
import { PorteurPose } from '../eclair/porteur-pose.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * CE QUE LE REFUS DIT — jamais la cible attendue (v2 § 5.4, même discipline que `phrase`).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'cible-intruse': 'Ce n’est pas la bonne cible à attraper.',
  'cible-hors-consigne': 'Cette cible n’est pas demandée pour l’instant.',
  'cible-deja-attrapee': 'Cette cible est déjà attrapée.',
  'cible-inconnue': 'Ce n’est pas la bonne cible à attraper.',
};

/**
 * La feuille de style de la dérive. UNE SEULE règle, injectée une fois : chaque cible choisit
 * son amplitude et sa durée par des variables CSS, jamais par une image-clé recopiée.
 */
const FEUILLE_DE_DERIVE = `
@keyframes pierre-derive-cible {
  0%, 100% { transform: translate(0, 0); }
  25%      { transform: translate(var(--derive-dx), calc(var(--derive-dy) * -1)); }
  50%      { transform: translate(0, 0); }
  75%      { transform: translate(calc(var(--derive-dx) * -1), var(--derive-dy)); }
}
[data-derive="oui"] {
  animation: pierre-derive-cible var(--derive-duree) ease-in-out var(--derive-delai) infinite;
}
`;

/** Hachage pur et stable — aucun `Math.random`, aucun `Date.now` (règle non négociable). */
function hacher(texte: string): number {
  let h = 0;
  for (let i = 0; i < texte.length; i += 1) {
    h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function MoteurAttrape(
  proprietes: ProprietesMoteur<ContenuAttrape, EtatAttrape, ActionAttrape>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionAttrape);
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
    (action: ActionAttrape, evenement: { clientX: number; clientY: number }) => {
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

  // --- la transformation « couvrir », partagée avec le décor --------------------
  const vb = useMemo(() => lireViewBox(habillage.scene.viewBox), [habillage]);
  const t = useMemo(() => transformeMeet(vb, cadreJeu), [vb, cadreJeu]);

  // --- la recoloration : cascade des cibles BONNES, par étape --------------------
  const listesParEtape = useMemo(
    () => contenu.consignes.map((c) => [...c.aAttraper]),
    [contenu.consignes],
  );
  const boiteInvisible = useMemo(() => ({ largeur: CIBLE_MIN, hauteur: CIBLE_MIN }), []);
  const plansRecoloration = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer: () => boiteInvisible,
      }),
    [habillage, listesParEtape, regions, cadreJeu, bornes, boiteInvisible],
  );
  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plansRecoloration, etat.acquis, centroideParRegion),
    [plansRecoloration, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.cible;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  return (
    <div
      ref={racine}
      data-moteur="attrape"
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
      <style>{FEUILLE_DE_DERIVE}</style>

      {/* ------------------------------------------------------------- le décor, en fond */}
      <div style={styleZoneDeJeu(hauteurBande)}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* --------------------------------------------------------- les cibles, MOBILES */}
      <div
        data-plateau="cibles"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 1, pointerEvents: 'none' }}
      >
        {contenu.cibles.map((cible) => {
          const largeur = Math.max(CIBLE_MIN, cible.taille[0] * t.echelle);
          const hauteur = Math.max(CIBLE_MIN, cible.taille[1] * t.echelle);
          // ── LE DÉCOR EST COUVERT, PAS CONTENU (R52) — UNE CIBLE PEUT DONC TOMBER DANS LA
          //     PARTIE ROGNÉE, EXACTEMENT COMME UNE RÉGION PEUT TOMBER HORS ÉCRAN ────────────
          //
          // Mesuré, sortie citée (`bac-a-sable/mesurer-mise-en-scene-cinq-moteurs.mjs`) : sur
          // les 7 exercices réels, entre 2 et 8 cibles sur 8 à 14 tombaient hors du cadre —
          // c'est-à-dire une cible qu'on ne peut jamais attraper. `deriverEmplacements` (pour
          // `phrase`, les options, le clavier, les cases) CLAMPE déjà ses pastilles dans les
          // bornes ; une cible transformée par le seul `versPixels` ne l'était pas. On applique
          // donc la MÊME discipline ici : le point reste celui du contenu, mais son rendu ne
          // sort jamais de la zone jouable — sans quoi une cible « bonne » deviendrait
          // structurellement inatteignable, le pire défaut possible sur ce moteur.
          const [xBrut, yBrut] = versPixels(cible.depart, t);
          // Marge pour la DÉRIVE (14 à 30 px) : la cible ne doit pas sortir du cadre à l'apogée
          // de son mouvement non plus.
          const margeDerive = animationsDesactivees ? 0 : 30;
          const demiL = largeur / 2 + margeDerive;
          const demiH = hauteur / 2 + margeDerive;
          const x = Math.min(
            Math.max(xBrut, bornes.xMin + demiL),
            Math.max(bornes.xMax - demiL, bornes.xMin + demiL),
          );
          const y = Math.min(
            Math.max(yBrut, bornes.yMin + demiH),
            Math.max(bornes.yMax - demiH, bornes.yMin + demiH),
          );
          const attrapee = etat.acquis[cible.id] !== undefined;
          const refusee = etiquetteRefusee === cible.id;
          // Les lucioles portent directement le mot utile : la classe dédiée renforce sa
          // hiérarchie de lecture sans imposer une règle au moteur pour les autres habillages.
          const classes = ['cible'];
          if (cible.id.startsWith('luciole-')) classes.push('cible-luciole');
          if (!animationsDesactivees && refusee) classes.push('oscillation');

          const h = hacher(cible.id);
          const derive: CSSProperties = animationsDesactivees
            ? {}
            : ({
                '--derive-dx': `${String(14 + (h % 5) * 4)}px`,
                '--derive-dy': `${String(10 + ((h >> 3) % 4) * 3)}px`,
                '--derive-duree': `${String(2600 + (h % 900))}ms`,
                '--derive-delai': `-${String(h % 2600)}ms`,
              } as CSSProperties);

          return (
            <PorteurPose key={cible.id} x={x} y={y}>
              <div data-derive={animationsDesactivees ? 'non' : 'oui'} style={derive}>
                <button
                  key={refusee ? `${cible.id}-${String(marqueRefusCourante)}` : cible.id}
                  type="button"
                  data-cible={cible.id}
                  data-attrapee={attrapee ? 'oui' : 'non'}
                  data-refusee={refusee ? 'oui' : 'non'}
                  className={classes.join(' ')}
                  hidden={attrapee}
                  style={
                    {
                      ...styleLecture,
                      pointerEvents: 'auto',
                      whiteSpace: 'nowrap',
                      minInlineSize: `${String(largeur)}px`,
                      minBlockSize: `${String(hauteur)}px`,
                    } as CSSProperties
                  }
                  onClick={(evenement) => {
                    jouer({ type: 'toucher', cible: cible.id }, evenement);
                  }}
                >
                  {cible.libelle}
                </button>
              </div>
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
          zIndex: 2,
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
