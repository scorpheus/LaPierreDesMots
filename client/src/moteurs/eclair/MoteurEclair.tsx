/**
 * `MoteurEclair` — le composant hôte du moteur `eclair`. Lot L2-E, mise en scène portée depuis
 * `phrase` (R51/R52) après la lecture du décor par le père : « le design n'a pas changé, les
 * textes, le bouton et le décor n'est pas beau. »
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurEclair` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionEclair`, fait battre l'horloge du moteur, déclenche
 * le retour sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * Le décor COUVRE désormais la zone de jeu et se RALLUME à mesure que les bonnes options sont
 * trouvées (R52). Les options sont posées à des emplacements DÉRIVÉS des régions de l'habillage
 * (`client/src/moteurs/eclair/mise-en-scene.ts`), jamais écrits à la main : ajouter un
 * habillage à `eclair` continue de coûter zéro ligne de code.
 *
 * ── LE MOT FLASHÉ TROUVE ENFIN UNE PLACE DANS LE DÉCOR ────────────────────────────────────────
 * Mesuré avant ce lot : `clairiere.luciole` déclare une région `luciole` (surface 7152,
 * centroïde [300, 252]) — une place dessinée pour porter l'éclair — et rien ne la montrait. Le
 * mot flashé prend maintenant lui aussi une place dérivée, choisie en TÊTE de la même cascade
 * qui place les options (donc la plus grande région encore libre) : aucun nom de région n'est
 * jamais lu ici, ce qui reste vrai quel que soit l'habillage.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `consigne.texte` dans sa barre de consigne. Ce moteur ne
 * montrait déjà pas le mot dans cette barre — il n'y a donc rien à retirer sur ce point-là — et
 * ne réaffiche plus le texte de consigne, qui appartient à l'écran.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { hexDeCouleur } from '@pierre/partage';
import type { ActionEclair, ContenuEclair, EtatEclair } from '@pierre/partage';
import { ZoneDeLecture, styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
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
} from './mise-en-scene.js';
import { PorteurPose } from './porteur-pose.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Préfixe de la clé synthétique qui réserve, dans la même cascade que les options, la place du
 *  mot flashé. Aucun habillage ne le connaît : c'est une position parmi d'autres. */
const PREFIXE_ECLAIR = '__eclair-';

/** CE QUE LE REFUS DIT — jamais l'option attendue (v2 § 5.4, même discipline que `phrase`). */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'option-fausse': 'On cherche une autre option pour ce mot-là.',
  'option-hors-consigne': 'Cette option n’est pas proposée pour l’instant.',
  'option-deja-choisie': 'Cette option est déjà choisie.',
  'option-inconnue': 'On cherche une autre option pour ce mot-là.',
};

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

  const optionParId = useMemo(
    () => new Map(contenu.options.map((o) => [o.id, o] as const)),
    [contenu.options],
  );
  const motParEtape = useMemo(
    () => new Map(contenu.consignes.map((c) => [c.id, c.mot] as const)),
    [contenu.consignes],
  );

  const mesurer = useCallback(
    (cle: string) => {
      if (cle.startsWith(PREFIXE_ECLAIR)) {
        const mot = motParEtape.get(cle.slice(PREFIXE_ECLAIR.length)) ?? '';
        return mesurerTexte(mot, reglages);
      }
      return mesurerTexte(optionParId.get(cle)?.libelle ?? '', reglages);
    },
    [motParEtape, optionParId, reglages],
  );

  // --- la dérivation : le mot flashé PUIS les options, en cascade par étape ---
  const listesParEtape = useMemo(
    () => etat.etapes.map((e) => [`${PREFIXE_ECLAIR}${e.identifiant}`, ...e.ordreOptions]),
    [etat.etapes],
  );
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
  const emplacementEclair =
    etape === undefined
      ? undefined
      : emplacements.find((e) => e.cle === `${PREFIXE_ECLAIR}${etape.identifiant}`);
  const emplacementsOptions = emplacements.filter((e) => !e.cle.startsWith(PREFIXE_ECLAIR));

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plans, etat.acquis, centroideParRegion),
    [plans, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.option;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // « QUAND JE CLIQUE SUR REVOIR, ÇA NE FAIT RIEN » — R11, R12 (2026-08-03), inchangées.
  //
  // `finExposition` fixe `finExpositionMs` une seule fois (c'est l'origine de D18) ; la
  // VISIBILITÉ de l'éclair est un état de rendu séparé, rouvert par « Prêt ? » et « Revoir ».
  // La porte retient l'IDENTITÉ de la consigne qui l'a ouverte, pour ne pas partir seule au
  // changement d'étape (R12).
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const dureeMs = consigne === null ? 0 : consigne.expositionMs;
  const [eclairVisible, fixerEclairVisible] = useState(false);
  const idConsigne = consigne === null ? null : String(consigne.id);
  const [porte, fixerPorte] = useState<{ readonly id: string | null; readonly tours: number }>(
    () => ({ id: idConsigne, tours: 0 }),
  );
  const tours = porte.id === idConsigne ? porte.tours : 0;
  const ouvrirLaPorte = useCallback(() => {
    fixerPorte({ id: idConsigne, tours: tours + 1 });
  }, [idConsigne, tours]);

  const refEmettre = useRef(emettre);
  refEmettre.current = emettre;

  useEffect(() => {
    if (consigne === null || tours === 0) {
      fixerEclairVisible(false);
      return undefined;
    }
    fixerEclairVisible(true);
    const identifiant = setTimeout(() => {
      fixerEclairVisible(false);
      refEmettre.current({ type: 'finExposition' } as ActionEclair);
    }, dureeMs);
    return () => {
      clearTimeout(identifiant);
    };
  }, [consigne, dureeMs, tours]);

  const xEclair = emplacementEclair?.x ?? cadreJeu.largeur / 2;
  const yEclair = emplacementEclair?.y ?? cadreJeu.hauteur / 2;

  return (
    <div
      ref={racine}
      data-moteur="eclair"
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
      {/* La commande n'est pas une réponse : elle garde donc sa propre place, au-dessus de
          l'illustration, avec une silhouette différente des mots à choisir. */}
      <div
        data-plateau="commande-eclair"
        style={{
          position: 'absolute',
          insetBlockStart: '0.75rem',
          insetInlineStart: '50%',
          translate: '-50% 0',
          zIndex: 3,
          display: 'grid',
          justifyItems: 'center',
          gap: '0.25rem',
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          data-action={tours === 0 ? 'pret' : 'revoir'}
          className="commande-eclair"
          style={{ ...styleLecture, pointerEvents: 'auto' } as CSSProperties}
          onClick={() => {
            if (tours > 0) emettre({ type: 'revoirEclair' } as ActionEclair);
            ouvrirLaPorte();
          }}
        >
          <span aria-hidden="true">👁</span>
          {tours === 0 ? 'Montre-moi le mot' : 'Revoir le mot'}
        </button>
        {tours === 0 ? null : (
          <small data-note="revoir-gratuit" className="commande-eclair-note">
            Tu peux le revoir autant que tu veux.
          </small>
        )}
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

      {/* ------------------------------------------------------- les options, posées dessus */}
      <div
        data-plateau="options"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 1, pointerEvents: 'none' }}
      >
        {emplacementsOptions.map((emplacement) => {
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
                data-option-couleur={option.couleur ?? undefined}
                className={`${classes.join(' ')}${option.id.startsWith('luciole-') ? ' cible-luciole' : ''}`}
                style={{ ...styleLecture, pointerEvents: 'auto', whiteSpace: 'nowrap' } as CSSProperties}
                onClick={(evenement) => {
                  jouer({ type: 'repondre', option: emplacement.cle }, evenement);
                }}
              >
                {/* R11 — une couleur se MONTRE, elle ne se lit pas : la pastille porte la
                    teinte, le mot reste à côté pour qui veut le lire. */}
                {option.couleur === undefined ? null : (
                  <span
                    aria-hidden="true"
                    data-pastille={option.couleur}
                    style={{
                      display: 'inline-block',
                      inlineSize: '1.75rem',
                      blockSize: '1.75rem',
                      marginInlineEnd: '0.4rem',
                      verticalAlign: 'middle',
                      borderRadius: '50%',
                      background: hexDeCouleur(option.couleur),
                      border: '3px solid var(--trait, #1B2440)',
                    }}
                  />
                )}
                {option.libelle}
              </button>
            </PorteurPose>
          );
        })}
      </div>

      {/* ── LE MOT FLASHÉ — posé au même titre qu'une option, jamais animé une fois affiché.
          L'élément reste MONTÉ même invisible (`data-visible="non"`) : c'est ce que la
          recette « Revoir » observe. */}
      <PorteurPose x={xEclair} y={yEclair}>
        <div
          data-plateau="eclair"
          data-visible={eclairVisible ? 'oui' : 'non'}
          style={{
            display: 'grid',
            placeItems: 'center',
            minBlockSize: '5rem',
            minInlineSize: '12rem',
            borderRadius: 'var(--rayon-carte)',
            boxShadow: eclairVisible
              ? '0 0 0 6px color-mix(in srgb, var(--soleil) 70%, transparent), var(--ombre-bd)'
              : 'none',
            pointerEvents: eclairVisible ? 'none' : 'auto',
          }}
        >
          {eclairVisible && consigne !== null ? (
            <ZoneDeLecture
              texte={consigne.mot}
              motsCles={[consigne.mot]}
              etiquette={`Le mot : ${consigne.mot}`}
            />
          ) : null}
        </div>
      </PorteurPose>

      {/* ------------------------------------------------------------ la bande statique
          La porte, « Revoir » et le message de refus/aide : jamais sur le décor qui s'agite. */}
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
