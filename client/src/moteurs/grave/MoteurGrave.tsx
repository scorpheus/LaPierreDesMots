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
 * Reprise du 5 septembre : le clavier est une rangée centrée sous le mot, dans tous les
 * formats. Les lettres ne flottent plus à des hauteurs différentes. La cascade des trous
 * sert seulement à rallumer le décor ; elle ne décide pas de la position des touches.
 *
 * ── LA CASE À TROUS RESTE DANS LE CHAMP DE LECTURE ────────────────────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). Le mot à compléter est ce qu'il y a de plus
 * précisément à déchiffrer dans ce moteur ; il reste dans un grand cartouche statique au
 * centre, sur parchemin opaque. Le modèle se trouve au-dessus, hors de la zone des touches.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `consigne.texte` dans sa barre de consigne (il lit
 * `jeu.contenu.consignes[].texte`, générique à tous les moteurs). La répéter ici faisait lire
 * deux fois la même ligne à un enfant qui déchiffre — « il cherche la différence entre les
 * deux ». Le moteur porte le modèle et le mot incomplet, pas la règle générale du geste.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la touche oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionGrave, ContenuGrave, EtatGrave } from '@pierre/partage';

import { SceneDecor } from '../../habillages/SceneDecor.js';
import { ZoneDeLecture, styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
import {
  cadreJeuEtBornes,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  styleZoneDeJeu,
  useDerniereAllumee,
  useMesureCadre,
} from '../eclair/mise-en-scene.js';

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

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

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

  // Un trou peut porter tout un groupe (« eau », « ill »), pas seulement un caractère.
  // Sauter sa longueur évite « bat_au » avant réponse et « bateauau » après réponse.
  const motAffiche = useMemo(() => {
    if (consigne === null) return '';
    const caracteres = [...consigne.mot];
    const morceaux: string[] = [];
    let position = 0;
    for (const trou of [...consigne.trous].sort((a, b) => a.position - b.position)) {
      const longueur = [...trou.attendu].length;
      morceaux.push(caracteres.slice(position, trou.position).join(''));
      morceaux.push(etat.acquis[trou.id] ?? '_'.repeat(longueur));
      position = trou.position + longueur;
    }
    morceaux.push(caracteres.slice(position).join(''));
    return morceaux.join('');
  }, [consigne, etat.acquis]);

  return (
    <div
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
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      <style>{`
        [data-moteur="grave"] [data-mot-central="oui"] {
          inset-block-start: 27%;
          max-inline-size: min(88%, 30rem);
        }
        [data-moteur="grave"] [data-plateau="etape-grave"] {
          max-inline-size: calc(100% - 1.5rem);
          overflow-wrap: anywhere;
        }
      `}</style>
      {/* Le modèle est explicite : on reconstitue son orthographe avec les touches.
          Ce n'est ni un exercice de tracé, ni une devinette sonore sans contexte. */}
      <div
        data-plateau="etape-grave"
        aria-live="polite"
        style={{
          position: 'relative',
          alignSelf: 'center',
          flex: '0 0 auto',
          margin: '0.75rem 0.75rem 0',
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
        <span style={{ fontWeight: 800 }}>
          {consigne === null
            ? 'Mot à compléter'
            : trouCourant === null
              ? `Le mot « ${consigne.mot} » est complet`
              : `Modèle : ${consigne.mot}`}
        </span>
      </div>

      {/* Le cartouche est dans le flux, hors du cadre qui contient les prises. Si ce cadre ne
          tient plus (petit paysage ou gros profil de lecture), le parent le fait défiler au
          lieu de poser une lettre derrière un texte. */}
      <div
        ref={racine}
        data-zone-jeu="grave"
        style={{
          position: 'relative',
          flex: '1 0 30rem',
          minBlockSize: '30rem',
          overflow: 'hidden',
        }}
      >

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
        style={{
                position: 'absolute',
                insetInlineStart: 0,
                insetInlineEnd: 0,
                insetBlockStart: '58%',
                zIndex: 3,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.75rem',
                paddingInline: '0.75rem',
                pointerEvents: 'none',
        }}
      >
        {contenu.clavier.map((cle) => {
          const refusee = lettreRefusee === cle;
          const classes = ['cible'];
          if (!animationsDesactivees && refusee) classes.push('oscillation');
          return (
              <button
                key={refusee ? `${cle}-${String(marqueRefusCourante)}` : cle}
                type="button"
                className={classes.join(' ')}
                data-lettre={cle}
                style={{ ...styleLecture, pointerEvents: 'auto', whiteSpace: 'nowrap' } as CSSProperties}
                onClick={(evenement) => {
                  jouer({ type: 'graver', lettre: cle }, evenement);
                }}
              >
                {cle}
              </button>
          );
        })}
      </div>

      <div
        data-mot-central="oui"
        data-corps-minimal="48"
        style={{
          position: 'absolute',
          insetBlockStart: '27%',
          insetInlineStart: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          minInlineSize: '12rem',
          padding: '0.5rem 1rem',
          border: '4px solid var(--trait)',
          borderRadius: 'var(--rayon-carte)',
          background: 'var(--parchemin)',
          boxShadow: 'var(--ombre-bd)',
          textAlign: 'center',
          maxInlineSize: 'min(88%, 30rem)',
          pointerEvents: 'none',
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
          <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}</MessageStable>
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
    </div>
  );
}
