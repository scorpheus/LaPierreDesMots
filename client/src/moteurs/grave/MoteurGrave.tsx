/**
 * `MoteurGrave` — le composant hôte du moteur `grave`. Lot L2-E, mise en scène portée depuis
 * `phrase` (R51/R52) après la lecture du décor par le père.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurGrave` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionGrave`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * Avant ce lot, le clavier était une rangée de boutons en `flexWrap`, sur un fond vide : aucun
 * décor, aucune récompense visuelle à mesure que les trous se remplissent. `phrase` a établi la
 * règle (R52, v2 lignes 70 et 79) : le décor COUVRE la zone de jeu, il se RALLUME à mesure que
 * l'exercice avance, et ce qu'on touche est posé DESSUS, à des emplacements DÉRIVÉS.
 *
 * Deux populations, deux dérivations, sur le MÊME jeu de régions (`client/src/moteurs/eclair/
 * mise-en-scene.ts`, qui ne connaît ni clavier ni trou) :
 *   1. **le clavier** — les touches offertes sont CONSTANTES du début à la fin de l'exercice
 *      (une lettre peut servir à plusieurs trous), donc une seule dérivation, calculée une fois,
 *      donne à chaque touche une place stable ;
 *   2. **les trous** — un par consigne, dans l'ordre des consignes, en cascade comme les mots de
 *      `phrase` : c'est cette cascade, croisée avec `etat.acquis`, qui dit quelles régions se
 *      rallument. Rien n'y est posé visuellement : le trou vit dans le mot affiché, qui reste
 *      dans la bande de lecture, immobile.
 *
 * ── LA CASE À TROUS RESTE DANS LE CHAMP DE LECTURE ────────────────────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). Le mot à compléter est ce qu'il y a de plus
 * précisément à déchiffrer dans ce moteur ; il reste donc dans la bande statique du bas, jamais
 * sur le décor animé.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `consigne.texte` dans sa barre de consigne (il lit
 * `jeu.contenu.consignes[].texte`, générique à tous les moteurs). La répéter ici faisait lire
 * deux fois la même ligne à un enfant qui déchiffre — « il cherche la différence entre les
 * deux ». Ce moteur ne montre donc que ce qu'AUCUN autre endroit ne montre : le mot à trous.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la touche oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionGrave, ContenuGrave, EtatGrave } from '@pierre/partage';

import { SceneDecor } from '../../habillages/SceneDecor.js';
import { ZoneDeLecture, styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
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
 * CE QUE LE REFUS DIT — jamais le graphème attendu, sans quoi le refus deviendrait une aide
 * gratuite et il n'y aurait plus rien à déchiffrer. Même discipline que `MESSAGES_DE_REFUS` de
 * `phrase` : sans « tu », sans « non », sans « erreur ».
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'lettre-fausse': 'On cherche une autre lettre pour cette case-là.',
  'trous-remplis': 'Ce mot est déjà complet.',
  'lettre-hors-clavier': 'Cette lettre-là n’est pas sur le clavier.',
};

export function MoteurGrave(
  proprietes: ProprietesMoteur<ContenuGrave, EtatGrave, ActionGrave>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionGrave);
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
    (action: ActionGrave, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const trouCourant = consigne === null || etape === undefined
    ? null
    : consigne.trous.find((trou) => etape.restantes.includes(trou.id)) ?? null;

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);
  const reglagesMot = useMemo(
    // Le mot reste nettement plus grand que les touches, tout en suivant réellement le
    // réglage de lecture du parent. Un plafond fixe à 48 px rendait le réglage inopérant.
    () => ({ ...reglages, corpsPx: Math.max(reglages.corpsPx + 32, 48) }),
    [reglages],
  );

  // --- la mesure du cadre ------------------------------------------------------
  const { racine, bande, cadre, hauteurBande } = useMesureCadre();
  const { cadreJeu, bornes } = useMemo(() => cadreJeuEtBornes(cadre, hauteurBande), [cadre, hauteurBande]);
  const bornesClavier = useMemo(
    () => ({ ...bornes, yMin: Math.max(bornes.yMin, 140) }),
    [bornes],
  );

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const mesurerLettre = useCallback(
    (cle: string) => mesurerTexte(cle, reglages),
    [reglages],
  );

  // --- le clavier : population CONSTANTE, une seule dérivation -----------------
  const plansClavier = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape: [contenu.clavier],
        regions,
        cadre: cadreJeu,
        bornes: bornesClavier,
        mesurer: mesurerLettre,
      }),
    [habillage, contenu.clavier, regions, cadreJeu, bornesClavier, mesurerLettre],
  );
  const emplacementsClavier = plansClavier[0]?.resultat.emplacements ?? [];

  // --- les trous : cascade par consigne, pour la seule RECOLORATION ------------
  const listesTrous = useMemo(
    () => contenu.consignes.map((c) => c.trous.map((t) => t.id)),
    [contenu.consignes],
  );
  const boiteTrou = useMemo(() => ({ largeur: 64, hauteur: 64 }), []);
  const plansTrous = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape: listesTrous,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer: () => boiteTrou,
      }),
    [habillage, listesTrous, regions, cadreJeu, bornes, boiteTrou],
  );

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plansTrous, etat.acquis, centroideParRegion),
    [plansTrous, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const lettreRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.lettre;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  const motAffiche =
    consigne === null
      ? ''
      : [...consigne.mot]
          .map((caractere, rang) => {
            const trou = consigne.trous.find((t) => t.position === rang);
            if (trou === undefined) return caractere;
            return etat.acquis[trou.id] ?? '_';
          })
          .join('');

  return (
    <div
      ref={racine}
      data-moteur="grave"
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
      {/* La barre haute porte la règle générale. Ici, le repère concret change avec chaque
          mot et chaque case, sans révéler la lettre attendue. */}
      <div
        data-plateau="etape-grave"
        aria-live="polite"
        style={{
          position: 'absolute',
          insetBlockStart: '0.75rem',
          insetInlineStart: '0.75rem',
          zIndex: 3,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.45rem 0.8rem',
          border: '3px solid var(--trait)',
          borderRadius: '1rem',
          background: 'var(--parchemin)',
          boxShadow: 'var(--ombre-bd)',
          ...styleLecture,
        } as CSSProperties}
      >
        <span style={{ fontWeight: 700 }}>{`Étape ${String(etat.indexEtape + 1)} / ${String(etat.etapes.length)}`}</span>
        <span aria-hidden="true" style={{ color: 'var(--soleil)', fontSize: '1.25em' }}>✦</span>
        <span style={{ fontWeight: 800 }}>
          {consigne === null
            ? 'Mot à compléter'
            : trouCourant === null
              ? `Mot « ${consigne.mot} » complet`
              : `Mot « ${consigne.mot} » · case ${String(trouCourant.position + 1)}`}
        </span>
      </div>

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

      {/* ------------------------------------------------------- le clavier, posé dessus */}
      <div
        data-plateau="clavier"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 1, pointerEvents: 'none' }}
      >
        {emplacementsClavier.map((emplacement) => {
          const refusee = lettreRefusee === emplacement.cle;
          const classes = ['cible'];
          if (!animationsDesactivees && refusee) classes.push('oscillation');
          return (
            <PorteurPose key={emplacement.cle} x={emplacement.x} y={emplacement.y}>
              <button
                key={refusee ? `${emplacement.cle}-${String(marqueRefusCourante)}` : emplacement.cle}
                type="button"
                className={classes.join(' ')}
                data-lettre={emplacement.cle}
                style={{ ...styleLecture, pointerEvents: 'auto', whiteSpace: 'nowrap' } as CSSProperties}
                onClick={(evenement) => {
                  jouer({ type: 'graver', lettre: emplacement.cle }, evenement);
                }}
              >
                {emplacement.cle}
              </button>
            </PorteurPose>
          );
        })}
      </div>

      <div
        data-mot-central="oui"
        data-corps-minimal="48"
        style={{
          position: 'absolute',
          insetBlockStart: '4.5rem',
          insetInlineStart: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          minInlineSize: '12rem',
          padding: '0.5rem 1rem',
          border: '4px solid var(--trait)',
          borderRadius: 'var(--rayon-carte)',
          background: 'var(--parchemin)',
          boxShadow: 'var(--ombre-bd)',
          textAlign: 'center',
        }}
      >
        <ZoneDeLecture
          texte={motAffiche}
          motsCles={consigne === null ? [] : consigne.motsCles}
          reglages={reglagesMot}
          etiquette={consigne === null ? 'Le mot à compléter.' : `Le mot à compléter : ${consigne.mot}`}
        />
      </div>

      {/* ------------------------------------------------------------ la bande de lecture
          Le mot à trous : c'est ce qu'il y a de plus précis à déchiffrer, il reste donc
          immobile, sur fond parchemin, jamais sur le décor qui s'agite. */}
      <div
        ref={bande}
        data-plateau="mot"
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          insetBlockEnd: 0,
          zIndex: 2,
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
