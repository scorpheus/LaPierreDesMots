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
 * (`client/src/moteurs/commun/mise-en-scene.ts`), jamais écrits à la main : ajouter un
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

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { hexDeCouleur } from '@pierre/partage';
import type { ActionEclair, ContenuEclair, EtatEclair } from '@pierre/partage';
import { ZoneDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
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
import { PorteurPose } from '../commun/porteur-pose.js';

import './eclair.css';
import { ROLE_QUESTION, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Écart entre la bande du mot montré et la première option, en px. */
const ECART_BANDE_ECLAIR_PX = 10;

/** Largeur que prend la pastille de couleur d'une option : 28 px + 2 × 3 px de trait + 6,4 px de marge. */
const PASTILLE_COULEUR_PX = 41;

/** CE QUE LE REFUS DIT — jamais l'option attendue (v2 § 5.4, même discipline que `phrase`). */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'option-fausse': 'On cherche une autre option pour ce mot-là.',
  'option-hors-consigne': 'Cette option n’est pas proposée pour l’instant.',
  'option-deja-choisie': 'Cette option est déjà choisie.',
  'option-inconnue': 'On cherche une autre option pour ce mot-là.',
};

/** Posé sur le décor, ou simple élément de flux quand la place manque. */
function Porteur({ enFlux, x, y, children }: { readonly enFlux: boolean; readonly x: number; readonly y: number; readonly children: ReactNode }): ReactElement {
  return enFlux ? <span className="eclair-porte-flux">{children}</span> : <PorteurPose x={x} y={y}>{children}</PorteurPose>;
}

function hacher(texte: string): number {
  let h = 0;
  for (let i = 0; i < texte.length; i += 1) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return h;
}

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

  // --- la mesure du cadre -----------------------------------------------------
  // Les messages vivent dans le pied du socle : aucune bande n'est retranchée à la scène.
  const { racine, cadre, hauteurBande } = useMesureCadre(0);
  const barreSuperieure = useRef<HTMLDivElement | null>(null);
  const [basBarre, fixerBasBarre] = useState(0);
  useEffect(() => {
    const barre = barreSuperieure.current;
    if (barre === null) return undefined;
    const mesurerBarre = (): void => { fixerBasBarre(barre.offsetTop + barre.offsetHeight); };
    mesurerBarre();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(mesurerBarre);
    observateur.observe(barre);
    return () => observateur.disconnect();
  }, []);
  // ── LA BANDE DU MOT MONTRÉ (retours du parent, 9 oct., E02) ─────────────────────────────────
  // Le mot apparaît toujours au même endroit, juste sous la commande « Montre-moi le mot », et
  // aucune option n'est jamais posée dessous : une luciole cachée sous le mot ne se touchait plus.
  // La hauteur de la bande est MESURÉE sur une copie invisible de la carte du mot, avec le mot le
  // plus large de l'exercice (`mesureFlash` plus bas), jamais estimée.
  const mesureFlash = useRef<HTMLDivElement | null>(null);
  const [hauteurBandeEclair, fixerHauteurBandeEclair] = useState(0);
  const { cadreJeu, bornes, hautBandeEclair } = useMemo(() => {
    const mesure = cadreJeuEtBornes(cadre, hauteurBande);
    // Aucune option ne doit se retrouver derrière la commande gratuite « Revoir », ni sous le mot.
    const haut = Math.max(mesure.bornes.yMin, basBarre + ECART_BANDE_ECLAIR_PX);
    const yMin = haut + hauteurBandeEclair + (hauteurBandeEclair > 0 ? ECART_BANDE_ECLAIR_PX : 0);
    return { ...mesure, hautBandeEclair: haut, bornes: { ...mesure.bornes, yMin } };
  }, [cadre, hauteurBande, basBarre, hauteurBandeEclair]);

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const optionParId = useMemo(
    () => new Map(contenu.options.map((o) => [o.id, o] as const)),
    [contenu.options],
  );
  // Le mot le plus large de l'exercice : c'est lui qui taille la bande du mot montré.
  const motLePlusLarge = useMemo(() => contenu.consignes.reduce<string>((plus, c) =>
    (mesurerTexte(c.mot, reglages).largeur > mesurerTexte(plus, reglages).largeur ? c.mot : plus), ''),
  [contenu.consignes, reglages]);
  useLayoutEffect(() => {
    const noeud = mesureFlash.current;
    if (noeud === null) return undefined;
    const relever = (): void => { fixerHauteurBandeEclair(Math.ceil(noeud.getBoundingClientRect().height)); };
    relever();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, [motLePlusLarge]);

  const mesurer = useCallback(
    (cle: string) => {
      const option = optionParId.get(cle);
      const boite = mesurerTexte(option?.libelle ?? '', reglages);
      // La pastille de couleur (1,75 rem + 3 px de trait de chaque côté + 0,4 rem de marge) s'ajoute au mot.
      return option?.couleur === undefined ? boite : { ...boite, largeur: boite.largeur + PASTILLE_COULEUR_PX };
    },
    [optionParId, reglages],
  );

  // --- la dérivation : les options, en cascade par étape, sous la bande du mot ---
  const listesParEtape = useMemo(
    () => etat.etapes.map((e) => [...e.ordreOptions]),
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
  const emplacementsOptions = emplacements;

  // Mesure réelle après rendu : si deux options se recouvrent ou sortent de la zone (place très
  // réduite), elles passent en flux (retour à la ligne) au lieu de rester posées sur le décor.
  // Petit écran (la page défile, `socle.css`) : en flux, la zone prend la hauteur de ses options
  // au lieu de les faire défiler sous un bord qui les rogne. Sa hauteur suit donc le flux, et la
  // clé n'en dépend pas — sans quoi la zone qui grandit relancerait l'essai posé, qui la rétrécit.
  const [petitEcran, fixerPetitEcran] = useState(false);
  useLayoutEffect(() => {
    const cadreScene = racine.current?.closest('.cadre-scene-activite') ?? null;
    const libre = cadreScene !== null && getComputedStyle(cadreScene).containerType !== 'size';
    fixerPetitEcran((avant) => (avant === libre ? avant : libre));
  }, [racine, cadre.largeur, cadre.hauteur]);
  const cleDeMesure = `${String(Math.round(cadre.largeur))}x${petitEcran ? 'libre' : String(Math.round(cadre.hauteur))}|${String(etat.indexEtape)}|${String(reglages.corpsPx)}|${String(basBarre)}`;
  const [repli, fixerRepli] = useState<{ readonly cle: string; readonly actif: boolean }>({ cle: '', actif: false });
  const enFlux = repli.cle === cleDeMesure && repli.actif;
  useLayoutEffect(() => {
    if (repli.cle === cleDeMesure) return;
    const zone = racine.current;
    if (zone === null) return;
    const cadreZone = zone.getBoundingClientRect();
    const boites = [...zone.querySelectorAll<HTMLElement>('[data-option]')]
      .map((n) => n.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    const barre = barreSuperieure.current?.getBoundingClientRect();
    const dedans = (r: DOMRect): boolean =>
      r.left >= cadreZone.left - 1 && r.right <= cadreZone.right + 1 &&
      r.top >= cadreZone.top - 1 && r.bottom <= cadreZone.bottom + 1;
    const croise = (a: DOMRect, b: DOMRect): boolean =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    let casse = false;
    boites.forEach((r, i) => {
      if (!dedans(r)) casse = true;
      if (barre !== undefined && barre.height > 0 && croise(r, barre)) casse = true;
      for (let j = i + 1; j < boites.length; j += 1) if (croise(r, boites[j] as DOMRect)) casse = true;
    });
    fixerRepli({ cle: cleDeMesure, actif: casse });
  }, [repli.cle, cleDeMesure, racine, emplacementsOptions.length]);

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
    // La première exposition est un fait du moteur. Après remount/reprise, « Revoir » reste
    // disponible sans rejouer le flash ni réinitialiser sa latence de reconnaissance.
    () => ({ id: idConsigne, tours: etat.finExpositionMs === null ? 0 : 1 }),
  );
  const tours = porte.id === idConsigne ? porte.tours : 0;
  const ouvrirLaPorte = useCallback(() => {
    fixerPorte({ id: idConsigne, tours: tours + 1 });
  }, [idConsigne, tours]);

  const refEmettre = useRef(emettre);
  refEmettre.current = emettre;

  useEffect(() => {
    if (consigne === null || tours === 0 || (etat.finExpositionMs !== null && tours === 1)) {
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
  }, [consigne, dureeMs, tours, etat.finExpositionMs]);

  const xEclair = cadreJeu.largeur / 2;
  const yEclair = hautBandeEclair + hauteurBandeEclair / 2;
  const chercheVoyelle = useMemo(() => {
    if (consigne === null) return false;
    const libelles = consigne.options
      .map((id) => optionParId.get(id)?.libelle.trim().toLocaleLowerCase('fr-FR') ?? '')
      .filter((libelle) => libelle !== '');
    return libelles.length > 0 && libelles.every((libelle) => /^[aeiouyéèêàâîïôöùûü]$/u.test(libelle));
  }, [consigne, optionParId]);

  const messageAffiche =
    messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus;

  return (
    <DispositionMoteur
      moteur="eclair"
      hauteurPetitEcran={enFlux ? 'contenu' : 'cadre'}
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      scene={
        <div ref={racine} className="eclair-zone">
          {/* T10 — le repère commun, affiché sous la consigne de l'écran ; la bande haute ne
              porte plus que la commande. Quand la place manque, le CSS condense son libellé
              sans réduire la cible. */}
          {consigne === null ? null : (
            <RepereEtape
              moteur="eclair"
              rang={etat.indexEtape + 1}
              total={etat.etapes.length}
              detail={tours === 0
                ? 'Un nouveau mot t’attend.'
                : chercheVoyelle
                  ? 'Quelle voyelle lis-tu dans ce mot ?'
                  : 'Retrouve le mot que tu viens de lire.'}
              animationsDesactivees={animationsDesactivees}
            />
          )}
          <div ref={barreSuperieure} className="eclair-barre-superieure">
            <div data-plateau="commande-eclair" className="eclair-commande-zone">
              <button
                type="button"
                data-action={tours === 0 ? 'pret' : 'revoir'}
                className="commande-eclair"
                aria-label={tours === 0 ? 'Montre-moi le mot' : 'Revoir le mot'}
                onClick={() => {
                  if (tours > 0) emettre({ type: 'revoirEclair' } as ActionEclair);
                  ouvrirLaPorte();
                }}
              >
                <span aria-hidden="true">👁</span>
                <span className="commande-eclair-libelle-long">
                  {tours === 0 ? 'Montre-moi le mot' : 'Revoir le mot'}
                </span>
                <span className="commande-eclair-libelle-court" aria-hidden="true">
                  {tours === 0 ? 'Voir' : 'Revoir'}
                </span>
              </button>
              {/* Toujours rendue, seulement cachée avant le premier « Montre-moi » : la barre garde
                  sa hauteur, donc le décor et le mot montré ne bougent pas d'une étape à l'autre. */}
              <small
                data-note="revoir-gratuit"
                className="commande-eclair-note"
                aria-hidden={tours === 0 ? true : undefined}
                style={tours === 0 ? { visibility: 'hidden' } : undefined}
              >
                Tu peux le revoir autant que tu veux.
              </small>
            </div>
          </div>

          {/* le décor, en fond */}
          <div className="eclair-calque">
            <SceneDecor
              habillage={habillage}
              allumees={allumees}
              derniere={derniere}
              animationsDesactivees={animationsDesactivees}
              ajustement="contenir"
            />
          </div>

          {/* les options, posées dessus */}
          <div
            data-plateau="options"
            data-disposition={enFlux ? 'flux' : 'posee'}
            className={`eclair-calque eclair-options${enFlux ? ' eclair-options--flux' : ''}`}
            style={enFlux ? { paddingBlockStart: `${String(bornes.yMin)}px` } : undefined}
          >
            {emplacementsOptions.map((emplacement) => {
              const option = optionParId.get(emplacement.cle);
              if (option === undefined) return null;
              const refusee = etiquetteRefusee === emplacement.cle;
              const classes = ['cible', 'eclair-option'];
              if (!animationsDesactivees && refusee) classes.push('oscillation');
              const h = hacher(emplacement.cle);
              const derive: CSSProperties = animationsDesactivees
                ? {}
                : ({
                    '--luciole-dx': `${String(5 + (h % 4) * 2)}px`,
                    '--luciole-dy': `${String(4 + ((h >> 3) % 3) * 2)}px`,
                    '--luciole-duree': `${String(4200 + (h % 1200))}ms`,
                    '--luciole-delai': `-${String(h % 3600)}ms`,
                  } as CSSProperties);
              return (
                <Porteur key={emplacement.cle} enFlux={enFlux} x={emplacement.x} y={emplacement.y}>
                  <div
                    data-luciole-animee={animationsDesactivees || !option.id.startsWith('luciole-') ? 'non' : 'oui'}
                    style={derive}
                  >
                    <button
                      key={refusee ? `${emplacement.cle}-${String(marqueRefusCourante)}` : emplacement.cle}
                      type="button"
                      {...ROLE_REPONSE}
                      data-option={emplacement.cle}
                      data-option-couleur={option.couleur ?? undefined}
                      className={`${classes.join(' ')}${option.id.startsWith('luciole-') ? ' cible-luciole' : ''}`}
                      onClick={(evenement) => {
                        jouer({ type: 'repondre', option: emplacement.cle }, evenement);
                      }}
                    >
                      {/* R11 — une couleur se MONTRE, elle ne se lit pas : la pastille porte la
                          teinte, le mot reste à côté pour qui veut le lire. */}
                      {option.couleur === undefined ? null : (
                        <span
                          aria-hidden="true"
                          className="eclair-pastille"
                          data-pastille={option.couleur}
                          style={{ background: hexDeCouleur(option.couleur) }}
                        />
                      )}
                      <TexteColore texte={option.libelle} />
                    </button>
                  </div>
                </Porteur>
              );
            })}
          </div>

          {/* ── LE MOT FLASHÉ — posé au même titre qu'une option, jamais animé une fois affiché.
              L'élément reste MONTÉ même invisible (`data-visible="non"`) : c'est ce que la
              recette « Revoir » observe. */}
          {/* Copie invisible de la carte, avec le mot le plus large : elle MESURE la bande. */}
          <div ref={mesureFlash} aria-hidden="true" className="eclair-flash eclair-flash--mesure" data-visible="oui">
            <div className="eclair-flash__contenu">
              <span className="eclair-flash__legende"><TexteColore texte="Lis ce mot" /></span>
              <ZoneDeLecture dansUneQuestion texte={motLePlusLarge} motsCles={[]} etiquette="" />
            </div>
          </div>
          <div className="eclair-calque eclair-calque-flash">
          <PorteurPose x={xEclair} y={yEclair}>
            <div
              className="eclair-flash"
              data-plateau="eclair"
              data-visible={eclairVisible ? 'oui' : 'non'}
              // T19 : le mot montré est ce qu'on DEMANDE de retrouver — thème question, une fois visible.
              {...(eclairVisible ? ROLE_QUESTION : {})}
            >
              {eclairVisible && consigne !== null ? (
                <div className="eclair-flash__contenu">
                  <span className="eclair-flash__legende"><TexteColore texte="Lis ce mot" /></span>
                  <ZoneDeLecture dansUneQuestion texte={consigne.mot} motsCles={[consigne.mot]} etiquette={`Le mot : ${consigne.mot}`} />
                </div>
              ) : null}
            </div>
          </PorteurPose>
          </div>
        </div>
      }
      pied={
        // La porte, « Revoir » et le message de refus/aide : jamais sur le décor qui s'agite.
        <div data-plateau="controles" className="eclair-controles">
          <p
            role="status"
            aria-live="polite"
            data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
            data-animations={animationsDesactivees ? 'calmes' : 'vives'}
            className="eclair-retour"
          >
            <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageAffiche}</MessageStable>
          </p>

          <p role="status" aria-live="polite" data-annonce="coloriage" className="eclair-annonce">
            {derniere === null
              ? ''
              : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
          </p>
          {/* LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10). */}
        </div>
      }
    />
  );
}
