/**
 * `MoteurChrono` — le composant hôte du moteur `chrono`. Lot de portage « décor de fond + mots
 * posés » (R47/R52), depuis `phrase` — première scène jugée par le père : « fais les beaux
 * design ».
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurChrono` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionChrono`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST PORTÉ TEL QUEL, ET CE QUI EST PROPRE À `chrono`
 *
 * Le geste est identique à `phrase` : remettre des éléments dans un ordre imposé
 * (`capacites.ordreEtapesImpose`), avec les mêmes trois lois validées par le père —
 *
 *   1. le décor est le FOND, il se colore avec l'avancée (`SceneDecor`, `emplacements.ts`) ;
 *   2. les vignettes à numéroter sont posées DEVANT, à des emplacements DÉRIVÉS de l'habillage ;
 *   3. une case vide est une PROMESSE DE PLACE (R59) — le réceptacle réserve sa boîte dès le
 *      départ, le jeton atterrit sur son centre MESURÉ (`../phrase/receptacles.js`, réutilisé
 *      tel quel, jamais recopié).
 *
 * Propre à `chrono` : la population des fentes est `consigne.ordre` (les vignettes, dans l'ordre
 * du récit).
 *
 * ── R49, DEUXIÈME PASSE : IL N'Y A PLUS DE BANDEAU MODÈLE ─────────────────────────────────────
 * Une première version de ce fichier affichait `consigne.recit` dans une bande dédiée, au-dessus
 * du décor — le même geste que R60 sur `phrase`. Le père, sur `phrase`, a vu le défaut que ce
 * geste RECRÉE : *« la phrase est en haut et en bas, il y a doublon. la consigne c'est juste de
 * quoi parle l'exercice, lire les phrases c'est normal. »* Le récit apparaissait donc DEUX fois
 * dans le moteur — une fois entier tout en haut, une fois reconstruit vignette par vignette dans
 * la ligne de fentes du bas. La ligne de fentes EST la lecture : elle grandit à mesure que
 * l'enfant range, et porte le récit entier une fois la consigne close. Un bandeau qui montre par
 * avance ce que les fentes vont montrer ne renseigne rien de plus.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionChrono, ContenuChrono, EtatChrono, Habillage } from '@pierre/partage';

import { urlAsset } from '../../api/client.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import { deriverEmplacements, regionsColoriables } from '../../habillages/emplacements.js';
import type {
  Boite,
  Bornes,
  Cadre,
  Emplacement,
  RegionDHabillage,
  ResultatDerivation,
} from '../../habillages/emplacements.js';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
// LE MODULE GÉNÉRIQUE — écrit pour `phrase`, adopté ici tel quel. Ne rien recopier.
import {
  FEUILLE_DU_VOL,
  Fente,
  JetonEnVol,
  centreDuReceptacle,
  decalageEntre,
} from '../phrase/receptacles.js';
import { ZoneDeGlisser, useCibleDeDepot, useJetonGlissable } from '../commun/glisser.js';
import type { VolDuJeton } from '../phrase/receptacles.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Le cadre servi tant que rien n'est mesuré — reprend la convention de `MoteurPhrase.tsx`. */
const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };
const HAUTEUR_BANDE_DE_REPLI = 160;

/** Respiration entre une pastille et le bord du cadre, en pixels. */
const MARGE = 14;

/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
const MARGE_VISIBILITE = 28;

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;
const CIBLE_MIN = 64;

/** Largeur moyenne d'un glyphe d'Andika, en fraction du corps — reprise à l'identique. */
const LARGEUR_GLYPHE = 0.66;

/**
 * Largeur maximale d'une pastille de vignette, en pixels.
 *
 * Propre à `chrono` : une légende de vignette est une PHRASE (jusqu'à 80 caractères, schéma de
 * contenu), jamais un mot isolé comme sur `phrase`/`assemble`. Sans plafond, une légende comme
 * « Elle range un caillou sur le château. » mesure ~700 px de large — plus que la largeur
 * jouable d'un cadre portrait de 720 px. MESURÉ : la première version de ce fichier laissait
 * `mesurer()` calculer une boîte sur UNE seule ligne, nowrap, sans plafond ; le contrat de
 * sortie de `deriverEmplacements` (0 hors bornes) est alors tombé à 1 sur le format portrait le
 * plus étroit (`bac-a-sable/verif-assemble-chrono.verif.tsx`). Le plafond ci-dessous, plus le
 * passage à un texte qui peut ENJAMBER (voir le bouton de pastille plus bas), corrigent les deux
 * bouts : la boîte que `mesurer` déclare et celle que le CSS rend concordent.
 */
const LARGEUR_MAX_PASTILLE = 288; // 18rem à 16 px racine — même valeur que `maxInlineSize` du bouton.

/**
 * Le rectangle occupé par le décor ET par les vignettes : tout, sauf la bande de lecture. Sans
 * bandeau modèle (R49, deuxième passe), il n'y a plus qu'une seule hauteur à retrancher.
 */
function ZONE_DE_JEU(hauteurBande: number): CSSProperties {
  return {
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: `${String(hauteurBande)}px`,
  };
}

/** Durée du vol de la vignette vers sa fente — identique à `phrase`. */
const DUREE_VOL_MS = 320;

/**
 * CE QUE LE REFUS DIT — et il ne dit JAMAIS ce qui a raté (même loi que R58 sur `phrase`).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'vignette-hors-ordre': 'On cherche l’image qui vient à ce moment-là.',
  'vignette-deja-numerotee': 'Cette image est déjà rangée dans l’histoire.',
  'vignette-inconnue': 'On cherche l’image qui vient à ce moment-là.',
};

interface PlanDeConsigne {
  readonly id: string;
  readonly resultat: ResultatDerivation;
}

/**
 * Les plans de toutes les consignes jusqu'à la courante, dans l'ordre. FONCTION PURE, reprise à
 * l'identique du principe de `MoteurPhrase.tsx`.
 */
function planifier(parametres: {
  readonly habillage: Habillage;
  readonly etapes: EtatChrono['etapes'];
  readonly indexCourant: number;
  readonly regions: readonly RegionDHabillage[];
  readonly cadre: Cadre;
  readonly bornes: Bornes;
  mesurer(cle: string): Boite;
}): readonly PlanDeConsigne[] {
  const plans: PlanDeConsigne[] = [];
  const allumees = new Set<string>();

  for (let k = 0; k <= parametres.indexCourant; k += 1) {
    const etape = parametres.etapes[k];
    if (etape === undefined) break;

    const cles = etape.ordreAffichage;

    const disponibles = parametres.regions.filter((region) => !allumees.has(region.id));
    const resultat = deriverEmplacements({
      habillage: parametres.habillage,
      cles,
      disponibles,
      toutes: parametres.regions,
      cadre: parametres.cadre,
      bornes: parametres.bornes,
      mesurer: parametres.mesurer,
      margeVisibilite: MARGE_VISIBILITE,
    });

    plans.push({ id: etape.identifiant, resultat });
    for (const emplacement of resultat.emplacements) {
      if (emplacement.region !== null) allumees.add(emplacement.region);
    }
  }

  return plans;
}

/**
 * UNE VIGNETTE D'HISTOIRE, SAISISSABLE AU DOIGT ET TAPABLE — les deux, jamais l'un OU l'autre.
 *
 * Le tap reste le chemin PRINCIPAL : on touche la vignette, elle prend son numéro et vole vers
 * sa fente. Le glisser s'ajoute pour honorer « remettre les images dans l'ordre » des specs § 5
 * sans rien exiger de plus — sous 8 px de déplacement, le geste reste un clic.
 *
 * Composant et non `<button>` en ligne : `useDraggable` est un hook, et un hook ne s'appelle pas
 * dans un `.map`.
 */
function VignetteSaisissable({
  cle,
  libelle,
  asset,
  classes,
  numero,
  region,
  placee,
  largeurMax,
  styleTexte,
  surTap,
}: {
  readonly cle: string;
  readonly libelle: string;
  readonly asset: string | null;
  readonly classes: readonly string[];
  readonly numero: number | string;
  readonly region: string;
  readonly placee: boolean;
  readonly largeurMax: number;
  readonly styleTexte: CSSProperties;
  readonly surTap: (evenement: { clientX: number; clientY: number }) => void;
}): ReactElement {
  const prise = useJetonGlissable(cle, placee);
  return (
    <button
      {...prise.attributs}
      {...prise.ecouteurs}
      ref={prise.brancher}
      type="button"
      className={classes.join(' ')}
      data-vignette={cle}
      data-numero={numero}
      data-pose={placee ? 'oui' : 'non'}
      data-glisse={prise.enVol ? 'oui' : 'non'}
      data-region-visee={region}
      hidden={placee}
      style={
        {
          ...styleTexte,
          ...prise.style,
          pointerEvents: 'auto',
          // Une légende peut ENJAMBER — c'est `mesurer()` qui en tient compte : `nowrap` ferait
          // déborder la pastille de la boîte que la dérivation lui a réservée.
          whiteSpace: 'normal',
          maxInlineSize: `${String(largeurMax)}px`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: asset === null ? undefined : '240px',
          boxSizing: 'border-box',
        } as CSSProperties
      }
      onClick={surTap}
    >
      {asset === null ? null : (
        <img
          data-illustration-vignette="oui"
          src={urlAsset(asset)}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            display: 'block',
            inlineSize: '100%',
            maxInlineSize: '200px',
            aspectRatio: '4 / 3',
            objectFit: 'cover',
            borderRadius: '0.8rem',
            marginBlockEnd: '0.45rem',
          }}
        />
      )}
      <span>{libelle}</span>
    </button>
  );
}

export function MoteurChrono(
  proprietes: ProprietesMoteur<ContenuChrono, EtatChrono, ActionChrono>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionChrono);
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

  const refFentes = useRef(new Map<string, HTMLElement | null>());
  const volVise = useRef<Omit<VolDuJeton, 'marque'> | null>(null);
  const [vol, fixerVol] = useState<VolDuJeton | null>(null);
  const marqueVol = useRef(0);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });

      const vise = volVise.current;
      if (vise !== null && !animationsDesactivees) {
        marqueVol.current += 1;
        fixerVol({ ...vise, marque: marqueVol.current });
      }
    }
    volVise.current = null;
    precedents.current = nbAcquis;
  }, [nbAcquis, services, animationsDesactivees]);

  useEffect(() => {
    if (vol === null) return undefined;
    const minuterie = setTimeout(() => {
      fixerVol((courant) => (courant?.marque === vol.marque ? null : courant));
    }, DUREE_VOL_MS);
    return () => {
      clearTimeout(minuterie);
    };
  }, [vol]);

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
    (action: ActionChrono, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  const racine = useRef<HTMLDivElement | null>(null);
  const bande = useRef<HTMLDivElement | null>(null);
  const coucheVignettes = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const [hauteurBande, fixerHauteurBande] = useState(HAUTEUR_BANDE_DE_REPLI);

  useEffect(() => {
    const noeud = racine.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
      const hautBande = bande.current?.getBoundingClientRect().height ?? 0;
      if (hautBande > 0) fixerHauteurBande(hautBande);
    };

    relever();

    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    if (bande.current !== null) observateur.observe(bande.current);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie --------------------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  const vignetteParId = useMemo(
    () => new Map(contenu.vignettes.map((v) => [v.id, v] as const)),
    [contenu],
  );

  /**
   * L'encombrement d'une vignette. Une légende est une PHRASE (« Gobi est sur la plage. »), pas
   * un mot : au-delà de `LARGEUR_MAX_PASTILLE`, le texte ENJAMBE (le bouton plus bas retire son
   * `nowrap` pour cette raison), donc la boîte doit grandir en HAUTEUR plutôt qu'en largeur au
   * même rythme que le texte grandit — sans quoi la boîte que ce module déclare à la relaxation
   * ne correspond plus à ce que le CSS rend, et un mot déborde des bornes sans que rien ne le
   * mesure avant l'écran de l'enfant (défaut trouvé par le contrat de sortie, voir la constante).
   */
  const mesurer = useCallback(
    (cle: string): Boite => {
      const vignette = vignetteParId.get(cle);
      const libelle = vignette?.libelle ?? '';
      const corps = reglages.corpsPx;
      const interlettrage = reglages.interlettrageEm * corps;
      const largeurTexteSurUneLigne = libelle.length * (corps * LARGEUR_GLYPHE + interlettrage);
      const largeurUtile = LARGEUR_MAX_PASTILLE - 2 * (PADDING_X + BORDURE);
      const lignes = Math.max(1, Math.ceil(largeurTexteSurUneLigne / largeurUtile));
      return {
        largeur: vignette?.asset === null || vignette?.asset === undefined
          ? Math.max(CIBLE_MIN, Math.min(largeurTexteSurUneLigne, largeurUtile) + 2 * (PADDING_X + BORDURE))
          : 240,
        hauteur: Math.max(
          CIBLE_MIN,
          lignes * corps * reglages.interligne + 2 * (PADDING_Y + BORDURE) +
            (vignette?.asset === null || vignette?.asset === undefined ? 0 : 160),
        ),
      };
    },
    [vignetteParId, reglages],
  );

  // --- la dérivation --------------------------------------------------------
  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);

  const cadreJeu = useMemo<Cadre>(
    () => ({
      largeur: cadre.largeur,
      hauteur: Math.max(cadre.hauteur - hauteurBande, CIBLE_MIN + 2 * MARGE),
    }),
    [cadre, hauteurBande],
  );

  const bornes = useMemo<Bornes>(
    () => ({
      xMin: MARGE,
      yMin: MARGE,
      xMax: Math.max(cadreJeu.largeur - MARGE, MARGE + CIBLE_MIN),
      yMax: Math.max(cadreJeu.hauteur - MARGE, MARGE + CIBLE_MIN),
    }),
    [cadreJeu],
  );

  const plans = useMemo(
    () =>
      planifier({
        habillage,
        etapes: etat.etapes,
        indexCourant: etat.indexEtape,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
      }),
    [habillage, etat.etapes, etat.indexEtape, regions, cadreJeu, bornes, mesurer],
  );

  const planCourant = plans[etat.indexEtape] ?? plans[plans.length - 1] ?? null;

  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const allumees = useMemo<readonly RegionAllumee[]>(() => {
    const liste: RegionAllumee[] = [];
    const vues = new Set<string>();
    for (const plan of plans) {
      for (const emplacement of plan.resultat.emplacements) {
        if (emplacement.region === null) continue;
        if (etat.acquis[emplacement.cle] === undefined) continue;
        if (vues.has(emplacement.region)) continue;
        vues.add(emplacement.region);
        liste.push({
          id: emplacement.region,
          couleur: emplacement.couleur,
          centroide: centroideParRegion.get(emplacement.region) ?? [0, 0],
        });
      }
    }
    return liste;
  }, [plans, etat.acquis, centroideParRegion]);

  const [derniere, fixerDerniere] = useState<RegionAllumee | null>(null);
  const empreinteAllumees = allumees.map((a) => a.id).join('|');
  const empreintePrecedente = useRef<string | null>(null);

  useEffect(() => {
    const avant =
      empreintePrecedente.current === null
        ? null
        : new Set(empreintePrecedente.current === '' ? [] : empreintePrecedente.current.split('|'));
    empreintePrecedente.current = empreinteAllumees;
    if (avant === null) return;
    const nouvelle = allumees.find((region) => !avant.has(region.id));
    if (nouvelle !== undefined) fixerDerniere(nouvelle);
  }, [empreinteAllumees, allumees]);

  const etape = etat.etapes[etat.indexEtape];

  const aideReclamee = etape !== undefined && etape.aideDemandee !== 'aucune';
  const cibleDeLAide = !aideReclamee || etat.aide === null ? null : etat.aide.cible;

  const vignetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.vignette;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;

  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const ordre = consigne === null ? [] : consigne.ordre;
  const restants = ordre.filter((id) => etat.acquis[id] === undefined);

  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  /** Vise la fente où cette vignette ira, AVANT d'émettre l'action. */
  const viser = (emplacement: Emplacement, libelle: string): void => {
    volVise.current = null;
    const cible = restants[0];
    if (cible === undefined) return;
    const arrivee = centreDuReceptacle(racine.current, refFentes.current.get(cible) ?? null);
    if (arrivee === null) return;
    const [decX, decY] = decalageEntre(racine.current, coucheVignettes.current);
    volVise.current = {
      cle: emplacement.cle,
      texte: libelle,
      depart: [emplacement.x + decX, emplacement.y + decY],
      arrivee,
    };
  };

  /**
   * LE GLISSER, EN PLUS DU TAP — specs § 5 « remettre les images dans l'ordre », sans trahir R16.
   *
   * Le dépôt émet EXACTEMENT la même action que le tap : `numeroter`, avec le même vol. Deux
   * gestes, une seule règle. Une seule zone d'accueil — la frise — parce que le moteur n'offre
   * aucun choix de destination : c'est l'ORDRE qui fait la règle, et `moteurChrono` seul dit si
   * la vignette lâchée était la suivante.
   */
  const accueilFrise = useCibleDeDepot('fentes-de-la-frise');

  const deposerLaVignette = useCallback(
    (cle: string) => {
      const emplacement = planCourant?.resultat.emplacements.find((e: { cle: string }) => e.cle === cle);
      if (emplacement === undefined) return;
      const libelle = vignetteParId.get(cle)?.libelle ?? '';
      fixerVol(null);
      viser(emplacement, libelle);
      jouer({ type: 'numeroter', vignette: cle }, { clientX: emplacement.x, clientY: emplacement.y });
    },
    // `viser` est une fonction de rendu, pas un `useCallback` : la lister la rendrait instable.
    [vignetteParId, planCourant, jouer],
  );

  return (
    <ZoneDeGlisser surDepot={(jeton) => { deposerLaVignette(jeton); }}>
    <div
      ref={racine}
      data-moteur="chrono"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      data-vignettes-affichees={String(ordre.length)}
      style={{
        position: 'relative',
        blockSize: '100%',
        minBlockSize: 0,
        overflow: 'hidden',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      <style>{FEUILLE_DU_VOL}</style>

      {/* ---------------------------------------------------------------- le décor, en fond */}
      <div style={{ position: 'absolute', ...ZONE_DE_JEU(hauteurBande), zIndex: 0 }}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* ------------------------------------------------------- les vignettes, devant */}
      <div
        ref={coucheVignettes}
        data-plateau="vignettes"
        style={{
          position: 'absolute',
          ...ZONE_DE_JEU(hauteurBande),
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {planCourant === null
          ? null
          : planCourant.resultat.emplacements.map((emplacement) => {
              const vignette = vignetteParId.get(emplacement.cle);
              if (vignette === undefined) return null;
              const placee = etat.acquis[emplacement.cle] !== undefined;

              const classes = ['cible'];
              if (!animationsDesactivees && cibleDeLAide === emplacement.cle) {
                classes.push('halo-demonstration');
              }
              if (!animationsDesactivees && vignetteRefusee === emplacement.cle) {
                classes.push('oscillation');
              }

              // R54 — porteur qui centre, bouton qui oscille : deux transformations disjointes.
              return (
                <span
                  key={emplacement.cle}
                  data-porte-vignette={emplacement.cle}
                  style={{
                    position: 'absolute',
                    insetInlineStart: `${String(emplacement.x)}px`,
                    insetBlockStart: `${String(emplacement.y)}px`,
                    transform: 'translate(-50%, -50%)',
                    display: 'inline-flex',
                    pointerEvents: 'none',
                  }}
                >
                  <VignetteSaisissable
                    key={
                      emplacement.cle === vignetteRefusee
                        ? `${emplacement.cle}-${String(marqueRefusCourante)}`
                        : emplacement.cle
                    }
                    cle={emplacement.cle}
                    libelle={vignette.libelle}
                    asset={vignette.asset === null ? null : String(vignette.asset)}
                    classes={classes}
                    numero={etat.acquis[emplacement.cle] ?? ''}
                    region={emplacement.region ?? ''}
                    placee={placee}
                    largeurMax={LARGEUR_MAX_PASTILLE}
                    styleTexte={styleLecture as CSSProperties}
                    surTap={(evenement) => {
                      fixerVol(null);
                      viser(emplacement, vignette.libelle);
                      jouer({ type: 'numeroter', vignette: emplacement.cle }, evenement);
                    }}
                  />
                </span>
              );
            })}
      </div>

      {/* ── LA VIGNETTE QUI TRAVERSE — R59 : elle va DANS la fente, plus au-dessus ──────────── */}
      {vol === null ? null : (
        <div
          key={vol.marque}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
        >
          <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} styleTexte={styleLecture as CSSProperties} />
        </div>
      )}

      {/* ------------------------------------------------------------ la bande de lecture
          Porte l'HISTOIRE EN TRAIN DE SE RANGER (les fentes), pas la consigne (déjà dans
          l'en-tête de `EcranNoeud`, R49). */}
      <div
        ref={bande}
        data-plateau="histoire"
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          insetBlockEnd: 0,
          zIndex: 2,
        }}
      >
        {/* ── R59 — LA LIGNE DE FENTES *EST* L'HISTOIRE QU'ON RECONSTRUIT ──────────────────── */}
        <div
          data-fentes="histoire"
          data-restantes={String(restants.length)}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.5rem',
            marginBlockEnd: '0.6rem',
          }}
        >
          {ordre.map((id) => {
            const placee = etat.acquis[id] !== undefined;
            return (
              <Fente
                key={id}
                cle={id}
                texte={placee ? (vignetteParId.get(id)?.libelle ?? '') : null}
                boite={mesurer(id)}
                prochaine={!placee && restants[0] === id}
                styleTexte={styleLecture as CSSProperties}
                brancher={(noeud) => {
                  refFentes.current.set(id, noeud);
                }}
              />
            );
          })}
        </div>

        {/* CE QUE LE REFUS DIT — jamais ce qui a raté, jamais quelle vignette est attendue. */}
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
            : `${
                regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id
              } reprend ses couleurs.`}
        </p>
      </div>

      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ────────────── */}
    </div>
    </ZoneDeGlisser>
  );
}
