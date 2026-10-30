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
 * (`client/src/moteurs/commun/mise-en-scene.ts`), en un seul appel qui couvre TOUTES les
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

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import { CadreQuestion, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';
import type { ActionChemin, ContenuChemin, EtatChemin } from '@pierre/partage';
import { preparerPlateauChemin } from '@pierre/partage';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
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
import { policesChargees } from '../commun/vagues.js';
import './chemin.css';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;
/** Petit écran : largeur visée d'une colonne de cases, assez pour une phrase sur deux ou trois lignes. */
const LARGEUR_COLONNE_PETIT_ECRAN = 176;

/** Le repère désigne le groupe étudié, pas n'importe quel son du mot « fille ». */
function RegleCourte({ texte, repere }: { texte: string; repere?: { mot: string; groupe: string } }): ReactElement {
  const lettre = /^(?:Avec|Sans) la lettre ([a-z])$/u.exec(texte)?.[1];
  const debutMot = repere === undefined ? -1 : texte.indexOf(repere.mot);
  const debutGroupe = repere === undefined ? -1 : repere.mot.indexOf(repere.groupe);
  const debut = lettre !== undefined ? texte.length - 1
    : debutMot < 0 || debutGroupe < 0 ? -1 : debutMot + debutGroupe;
  const longueur = lettre?.length ?? repere?.groupe.length ?? 0;
  // T19 : lue en couleurs comme tout texte de lecture ; la lettre cible est marquée par un
  // soulignement de TRAIT, jamais par le bleu de l'indice de Gobi (E08, point 4).
  return <strong data-regle-courte="oui">{debut < 0 ? <TexteColore texte={texte} /> : <>
    <TexteColore texte={texte.slice(0, debut)} /><span data-grapheme-repere="oui"><TexteColore texte={texte.slice(debut, debut + longueur)} /></span><TexteColore texte={texte.slice(debut + longueur)} />
  </>}</strong>;
}

export interface DiagnosticDerivationChemin {
  readonly chevauchements: number;
  readonly horsBornes: number;
  readonly deborde: boolean;
}

/** Un chevauchement dérivé impose la grille, quel que soit le format du cadre. */
export function derivationImposeGrilleChemin(diagnostic: DiagnosticDerivationChemin): boolean {
  return diagnostic.chevauchements > 0 || diagnostic.horsBornes > 0 || diagnostic.deborde;
}

/** Voir l'équivalent paires : la hauteur produite par la grille ne doit pas désactiver son repli. */
function useRepliDerivationStable(cleComposition: string, derivationImpossible: boolean): boolean {
  const clePrecedente = useRef(cleComposition);
  const repliVerrouille = useRef(false);
  if (clePrecedente.current !== cleComposition) {
    clePrecedente.current = cleComposition;
    repliVerrouille.current = false;
  }
  if (derivationImpossible) repliVerrouille.current = true;
  return repliVerrouille.current;
}

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
  const consigneCourante = contenu.consignes[etat.indexEtape] ?? null;
  const plateau = useMemo(() => preparerPlateauChemin(contenu, etat.indexEtape), [contenu, etat.indexEtape]);

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  // Seules les variables de lecture descendent : la scène garde son décor, les mots prennent
  // police, corps et interligne du profil par la feuille de style.
  const variablesLecture = useMemo(
    () => Object.fromEntries(Object.entries(styleDeLecture(reglages)).filter(([cle]) => cle.startsWith('--'))),
    [reglages],
  );

  // --- la mesure du cadre -----------------------------------------------------
  const { racine, bande, cadre, hauteurBande } = useMesureCadre();
  const regimeCompact = cadre.largeur <= 700 || cadre.hauteur <= 520;

  // --- le plateau réduit (décision du parent du 30 oct., contrat du socle § 12) -------------
  // Un plateau trop dense pour le corps de l'enfant se DÉCOUPE avant de défiler : on ne montre
  // que le parcours de l'étape en cours et TOUTES les cases voisines de ce parcours. Chaque pas
  // permis reste donc visible, et les voisines des autres parcours restent les leurres entre
  // lesquels l'enfant choisit. Cliquet par cadre et par contenu, pour toutes les étapes.
  const [hauteurSceneSocle, fixerHauteurSceneSocle] = useState(0);
  const cleCadreSocle = [
    habillage.id, contenu.cases.map((c) => c.id).join('|'), reglages.corpsPx, reglages.interligne,
    cadre.largeur, hauteurSceneSocle,
  ].join('|');
  const [reduit, fixerReduit] = useState<string | null>(null);
  const plateauReduit = reduit === cleCadreSocle;
  const casesReduites = useMemo(() => {
    const consigne = contenu.consignes[etat.indexEtape];
    if (consigne === undefined) return plateau.cases;
    const segment = new Set<string>([consigne.depart, ...consigne.parcours]);
    const ids = new Set<string>(segment);
    for (const c of plateau.cases) if (segment.has(c.id)) for (const voisine of c.voisines) ids.add(voisine);
    return plateau.cases
      .filter((c) => ids.has(c.id))
      .map((c) => ({ ...c, voisines: c.voisines.filter((voisine) => ids.has(voisine)) }));
  }, [contenu.consignes, etat.indexEtape, plateau.cases]);
  const reductionPossible = casesReduites.length < plateau.cases.length;
  const casesAffichees = plateauReduit ? casesReduites : plateau.cases;

  const panneau = useRef<HTMLDivElement | null>(null);
  const [hauteurPanneau, fixerHauteurPanneau] = useState(0);
  useEffect(() => {
    const noeud = panneau.current;
    if (noeud === null) return undefined;
    const relever = (): void => fixerHauteurPanneau(noeud.getBoundingClientRect().height);
    relever();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    return () => { observateur.disconnect(); };
  }, [regimeCompact, consigneCourante?.texte, etat.position]);

  const { cadreJeu: cadrePlateau, bornes: bornesPlateau } = useMemo(
    () => cadreJeuEtBornes(cadre, hauteurBande + hauteurPanneau),
    [cadre, hauteurBande, hauteurPanneau],
  );
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
  const idsCases = useMemo(() => casesAffichees.map((c) => c.id), [casesAffichees]);
  const plans = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape: [idsCases],
        regions,
        cadre: cadrePlateau,
        bornes: bornesPlateau,
        mesurer,
      }),
    [habillage, idsCases, regions, cadrePlateau, bornesPlateau, mesurer],
  );
  const emplacements = plans[0]?.resultat.emplacements ?? [];
  const derivationImpossible = derivationImposeGrilleChemin({
    chevauchements: plans[0]?.resultat.chevauchements ?? 0,
    horsBornes: plans[0]?.resultat.horsBornes ?? 0,
    deborde: plans[0]?.resultat.deborde === true,
  });
  const repliDerivation = useRepliDerivationStable(
    [
      habillage.id,
      idsCases.join('|'),
      reglages.corpsPx,
      reglages.interlettrageEm,
      reglages.interligne,
      cadre.largeur,
      cadre.hauteur,
    ].join('|'),
    derivationImpossible,
  );
  // --- l'ajustement MESURÉ ------------------------------------------------------
  // Aucune taille de case n'est estimée : on rend, on mesure les boîtes réelles, et si deux cases
  // se touchent ou si l'une sort de la zone on passe à l'étage suivant — 0 positions dérivées du
  // décor, 1 à 4 colonnes, 5 quatre colonnes serrées. Le corps et l'interligne de lecture ne
  // bougent jamais : ce sont les réglages de l'enfant.
  const ETAGE_MAX = 5;
  const zoneCases = useRef<HTMLDivElement | null>(null);
  const cleSituation = [
    habillage.id, idsCases.join('|'), reglages.corpsPx, reglages.interlettrageEm, reglages.interligne,
    cadre.largeur, cadre.hauteur, hauteurPanneau,
  ].join('|');
  const cleLargeur = [habillage.id, idsCases.join('|'), reglages.corpsPx, reglages.interligne, cadre.largeur].join('|');
  const [progres, fixerProgres] = useState({ cle: '', etage: 0 });
  const [centres, fixerCentres] = useState<ReadonlyMap<string, { x: number; y: number }>>(new Map());
  // Petit écran (la page défile) : les colonnes se choisissent sur la largeur seule et la scène
  // réclame la hauteur de ses cases. Sur tablette et PC, la hauteur est celle de l'écran.
  const [petitEcran, fixerPetitEcran] = useState(false);
  // LE FILET (même décision) : même le plateau réduit ne tient pas en quatre colonnes serrées —
  // de longues phrases au corps de l'enfant. Le plateau prend sa hauteur naturelle, comme sur
  // petit écran, et la scène défile. Aucun texte rogné. La clé ne tient qu'au contenu, à la
  // largeur et à la hauteur de la scène du socle, que le plateau qui grandit ne change pas : la
  // bascule ne peut pas osciller.
  const [defilant, fixerDefilant] = useState<string | null>(null);
  const plateauDefilant = !petitEcran && defilant === cleCadreSocle;
  const hauteurLibre = petitEcran || plateauDefilant;
  const [besoinHauteur, fixerBesoinHauteur] = useState({ cle: '', hauteur: 0 });
  const colonnesPetitEcran = Math.max(1, Math.min(4, Math.floor(cadre.largeur / LARGEUR_COLONNE_PETIT_ECRAN)));
  // Dans le filet, une colonne garde la place d'une quinzaine de caractères au corps de l'enfant
  // (≈ 0,6 em par caractère, interlettrage compris, plus la marge de la case) : de longues
  // phrases en colonnes de 176 px tombaient en lignes de dix caractères.
  const largeurColonneFilet = Math.max(
    LARGEUR_COLONNE_PETIT_ECRAN,
    Math.ceil(15 * reglages.corpsPx * (0.6 + reglages.interlettrageEm) + 24),
  );
  const colonnesFilet = Math.max(1, Math.min(4, Math.floor(cadre.largeur / largeurColonneFilet)));
  const etage = plateauDefilant
    ? colonnesFilet
    : petitEcran
    ? colonnesPetitEcran
    : Math.min(ETAGE_MAX, Math.max(progres.cle === cleSituation ? progres.etage : 0, repliDerivation ? 1 : 0));
  const colonnes = Math.min(4, etage);
  const repliCompact = colonnes >= 1;
  const serre = etage >= ETAGE_MAX;
  const cleHauteur = `${cleLargeur}|${String(colonnes)}`;

  useLayoutEffect(() => {
    const zone = zoneCases.current;
    if (zone === null) return undefined;
    const mesurerZone = (): void => {
      const cadreScene = zone.closest('.cadre-scene-activite');
      const libre = cadreScene !== null && getComputedStyle(cadreScene).containerType !== 'size';
      if (libre !== petitEcran) {
        fixerPetitEcran(libre);
        return;
      }
      const sceneSocle = zone.closest('.disposition-moteur__scene');
      const hauteurSocle = sceneSocle === null ? 0 : Math.round(sceneSocle.clientHeight);
      if (hauteurSocle !== hauteurSceneSocle) {
        fixerHauteurSceneSocle(hauteurSocle);
        return;
      }
      const rz = zone.getBoundingClientRect();
      const boutons = Array.from(zone.querySelectorAll<HTMLElement>('button[data-case]'));
      const boites = boutons.map((bouton) => bouton.getBoundingClientRect());
      if (hauteurLibre) {
        if (rz.width === 0 || boites.length === 0) return;
        // Hauteur réclamée = celle de la grille posée à sa hauteur naturelle : elle ne dépend
        // que de la largeur, jamais de la hauteur qu'elle provoque.
        const hauteur = Math.ceil(rz.height) + 16;
        fixerBesoinHauteur((precedent) =>
          precedent.cle === cleHauteur && Math.abs(precedent.hauteur - hauteur) < 1 ? precedent : { cle: cleHauteur, hauteur });
        fixerCentres(new Map(boutons.map((bouton, i) => {
          const r = boites[i]!;
          return [bouton.dataset.case ?? '', { x: r.left + r.width / 2 - rz.left, y: r.top + r.height / 2 - rz.top }] as const;
        })));
        return;
      }
      if (rz.width === 0 || rz.height === 0) return; // pas de mise en page (tests sans rendu)
      const T = 1;
      const hors = boites.some((r) => r.left < rz.left - T || r.right > rz.right + T
        || r.top < rz.top - T || r.bottom > rz.bottom + T);
      const touche = boites.some((r, i) => boites.slice(0, i).some((c) =>
        r.left < c.right - T && c.left < r.right - T && r.top < c.bottom - T && c.top < r.bottom - T));
      // Un texte plus haut ou plus large que sa case est rogné pour l'enfant, même si la case,
      // elle, tient : la grille compresse ses rangées jusqu'à la hauteur minimale d'une cible.
      // L'étiquette « Départ » est À CHEVAL sur le bord bas par construction : elle n'en est pas.
      const texteDeborde = boutons.some((bouton, i) => {
        const r = boites[i]!;
        return Array.from(bouton.children).some((enfant) => {
          if (enfant.classList.contains('chemin__depart')) return false;
          const e = enfant.getBoundingClientRect();
          return e.top < r.top - T || e.bottom > r.bottom + T || e.left < r.left - T || e.right > r.right + T;
        });
      });
      // Même critère que la garde : le centre de la case doit recevoir le doigt.
      const recouverte = boutons.some((bouton, i) => {
        const r = boites[i]!;
        const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return dessus !== null && dessus !== bouton && !bouton.contains(dessus) && !dessus.contains(bouton);
      });
      if ((hors || touche || recouverte || texteDeborde) && etage < ETAGE_MAX) {
        fixerProgres({ cle: cleSituation, etage: etage + 1 });
        return;
      }
      if (hors || touche || recouverte || texteDeborde) {
        // D'abord découper (le plateau réduit rejoue toute la cascade), puis seulement défiler.
        if (!policesChargees()) return;
        if (!plateauReduit && reductionPossible) fixerReduit(cleCadreSocle);
        else fixerDefilant(cleCadreSocle);
        return;
      }
      if (colonnes >= 1) {
        fixerCentres(new Map(boutons.map((bouton, i) => {
          const r = boites[i]!;
          return [bouton.dataset.case ?? '', { x: r.left + r.width / 2 - rz.left, y: r.top + r.height / 2 - rz.top }] as const;
        })));
      }
    };
    mesurerZone();
    // Les polices et les retours à la ligne changent la taille des cases sans changer la zone.
    void document.fonts?.ready.then(mesurerZone);
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(mesurerZone);
    observateur.observe(zone);
    zone.querySelectorAll('button[data-case]').forEach((bouton) => { observateur.observe(bouton); });
    return () => { observateur.disconnect(); };
  }, [
    etage, colonnes, cleSituation, cleHauteur, casesAffichees, petitEcran, hauteurLibre, hauteurSceneSocle,
    cleCadreSocle, plateauReduit, reductionPossible,
  ]);

  const hauteurMini = hauteurLibre && besoinHauteur.cle === cleHauteur ? besoinHauteur.hauteur : 0;
  const positionParCase = useMemo(() => {
    if (repliCompact) return centres;
    return new Map(emplacements.map((e) => [e.cle, { x: e.x, y: e.y }] as const));
  }, [repliCompact, centres, emplacements]);

  // La recoloration conserve le plan complet ; masquer un mot d'une ancienne étape
  // ne doit jamais reprendre la couleur déjà gagnée sur le décor.
  const plansDecor = useMemo(() => planifierCascade({
    habillage, listesParEtape: [contenu.cases.map((c) => c.id)], regions,
    cadre: cadrePlateau, bornes: bornesPlateau, mesurer,
  }), [habillage, contenu.cases, regions, cadrePlateau, bornesPlateau, mesurer]);
  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plansDecor, etat.acquis, centroideParRegion),
    [plansDecor, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  // --- les voisinages, en traits fins entre les centres -------------------------
  const traits = useMemo(() => {
    const vus = new Set<string>();
    const lignes: {
      readonly cle: string;
      readonly departId: string;
      readonly arriveeId: string;
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    }[] = [];
    for (const c of casesAffichees) {
      const depart = positionParCase.get(c.id);
      if (depart === undefined) continue;
      for (const voisine of c.voisines) {
        const paire = [c.id, voisine].sort().join('|');
        if (vus.has(paire)) continue;
        vus.add(paire);
        const arrivee = positionParCase.get(voisine);
        if (arrivee === undefined) continue;
        lignes.push({
          cle: paire,
          departId: c.id,
          arriveeId: voisine,
          x1: depart.x,
          y1: depart.y,
          x2: arrivee.x,
          y2: arrivee.y,
        });
      }
    }
    return lignes;
  }, [casesAffichees, positionParCase]);

  const departEtape = contenu.consignes[etat.indexEtape]?.depart ?? null;
  const casesConsommees = useMemo(() => {
    const consommees = new Set(etat.visiteesEtape);
    if (departEtape !== null && etat.position !== departEtape) consommees.add(departEtape);
    if (etat.position !== null) consommees.delete(etat.position);
    return consommees;
  }, [departEtape, etat.visiteesEtape, etat.position]);

  const casesAtteignables = useMemo(() => {
    const courante = casesAffichees.find((c) => c.id === etat.position);
    return new Set((courante?.voisines ?? []).filter((id) => !casesConsommees.has(id)));
  }, [casesConsommees, casesAffichees, etat.position]);

  const cibleAide = etat.aide?.cible ?? null;

  const positionPion = etat.position === null ? null : positionParCase.get(etat.position) ?? null;
  const caseCourante = etat.position === null ? null : caseParId.get(etat.position) ?? null;

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.caseVisee;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null || etat.dernierRefus.motif === 'case-non-adjacente'
      ? ''
      : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  const retourChemin =
    messageDeRefus !== ''
      ? messageDeRefus
      : cibleAide === null
        ? ''
        : 'Indice : une case possible brille en bleu.';


  // Les mesures du panneau et de la bande réservent le plateau ; la feuille de style les lit.
  const styleScene = {
    ...variablesLecture,
    '--chemin-haut-panneau': `${String(hauteurPanneau)}px`,
    '--chemin-haut-bande': `${String(hauteurBande)}px`,
    // Petit écran : la scène réclame la hauteur de ses cases, la page défile au lieu de couper.
    '--chemin-min': hauteurMini > 0 ? `${String(hauteurPanneau + hauteurMini + hauteurBande)}px` : '0px',
    '--chemin-colonnes': String(Math.max(1, colonnes)),
  } as CSSProperties;

  const scene = (
    <div ref={racine} className="chemin" style={styleScene} data-serre={serre ? "oui" : "non"} data-petit-ecran={hauteurLibre ? 'oui' : 'non'}>
      {/* ------------------------------------------------------------- le décor, en fond */}
      <div className="chemin__zone">
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* ----------------------------------------------------- les voisinages, en traits */}
      <svg aria-hidden="true" className="chemin__zone chemin__traits" width="100%" height="100%">
        {traits.map((ligne) => {
          const reliePion = ligne.departId === etat.position || ligne.arriveeId === etat.position;
          const autreId = ligne.departId === etat.position ? ligne.arriveeId : ligne.departId;
          const active = reliePion && casesAtteignables.has(autreId);
          const parcourue = casesConsommees.has(ligne.departId) || casesConsommees.has(ligne.arriveeId);
          return (
            <g
              key={ligne.cle}
              data-trait-actif={active ? 'oui' : 'non'}
              data-trait-parcouru={parcourue ? 'oui' : 'non'}
            >
              {active ? (
                <line
                  x1={ligne.x1}
                  y1={ligne.y1}
                  x2={ligne.x2}
                  y2={ligne.y2}
                  stroke="var(--trait)"
                  strokeOpacity={0.9}
                  strokeWidth={10}
                  strokeDasharray="14 10"
                  strokeLinecap="round"
                />
              ) : null}
              <line
                x1={ligne.x1}
                y1={ligne.y1}
                x2={ligne.x2}
                y2={ligne.y2}
                stroke={active ? 'var(--soleil)' : parcourue ? 'var(--menthe)' : 'var(--trait)'}
                strokeOpacity={active ? 1 : parcourue ? 0.55 : 0.42}
                strokeWidth={active ? 6 : 4}
                strokeDasharray={active ? '14 10' : parcourue ? undefined : '4 10'}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {/* ------------------------------------------------------------- les cases, posées */}
      <div
        ref={zoneCases}
        data-plateau="cases"
        data-disposition={repliCompact ? "grille" : "libre"}
        className="chemin__zone chemin__cases"
        data-mouvement={animationsDesactivees ? 'calme' : 'vif'}
      >
        {casesAffichees.map((caseChemin) => {
          const pos = positionParCase.get(caseChemin.id);
          if (pos === undefined && !repliCompact) return null;
          const surPion = etat.position === caseChemin.id;
          const atteignable = casesAtteignables.has(caseChemin.id);
          const franchie = etat.visiteesEtape.includes(caseChemin.id) && caseChemin.id !== departEtape;
          const consommee = casesConsommees.has(caseChemin.id);
          const aidee = cibleAide === caseChemin.id;
          const refusee = etiquetteRefusee === caseChemin.id && etat.dernierRefus?.motif !== 'case-non-adjacente';
          const statut = surPion
            ? 'actuelle'
            : consommee || franchie
              ? 'parcourue'
              : atteignable
                ? 'possible'
                : 'libre';
          const classes = ['cible', 'chemin__case'];
          if (!animationsDesactivees && refusee) classes.push('oscillation');
          const bouton = (
              <button
                key={refusee ? `${caseChemin.id}-${String(marqueRefusCourante)}` : caseChemin.id}
                type="button"
                {...ROLE_REPONSE}
                data-case={caseChemin.id}
                data-pion={surPion ? 'oui' : 'non'}
                data-atteignable={atteignable ? 'oui' : 'non'}
                data-franchie={franchie ? 'oui' : 'non'}
                data-consommee={consommee ? 'oui' : 'non'}
                data-aide-cible={aidee ? 'oui' : 'non'}
                data-deja-fait={franchie || consommee ? 'oui' : 'non'}
                data-statut-chemin={statut}
                data-en-grille={repliCompact ? 'oui' : 'non'}
                aria-label={`${caseChemin.libelle}, ${
                  statut === 'actuelle'
                    ? 'case actuelle'
                    : statut === 'parcourue'
                      ? 'case déjà parcourue'
                      : statut === 'possible'
                        ? 'chemin possible'
                        : 'case du chemin'
                }`}
                className={classes.join(' ')}
                disabled={surPion || consommee}
                onClick={(evenement) => {
                  jouer({ type: 'avancer', caseVisee: caseChemin.id }, evenement);
                }}
              >
                {statut === 'parcourue' ? (
                  <span aria-hidden="true" className="chemin__coche">
                    ✓
                  </span>
                ) : null}
                <span><TexteColore texte={caseChemin.libelle} /></span>
                {/* E08, point 3 : la case de départ ne se grise plus, elle se NOMME. */}
                {surPion && caseChemin.id === departEtape ? (
                  <span aria-hidden="true" data-depart="oui" className="chemin__depart">Départ</span>
                ) : null}
              </button>
          );
          return pos === undefined || repliCompact
            ? bouton
            : <PorteurPose key={caseChemin.id} x={pos.x} y={pos.y}>{bouton}</PorteurPose>;
        })}

        {/* Le pion : décoratif, la position réelle est portée par `data-pion="oui"` sur la case. */}
        {positionPion === null ? null : (
          <div
            aria-hidden="true"
            data-pion-marqueur="oui"
            className="chemin__pion"
            style={{ insetInlineStart: `${String(positionPion.x)}px`, insetBlockStart: `${String(positionPion.y - 44)}px` }}
          >
            📍
          </div>
        )}
      </div>

      {/* T19 / E08 : la notice est une QUESTION du socle — thème jaune, une seule taille, et le
          même signal que le repère d'étape quand la lettre change (point 5). */}
      <div ref={panneau} className="chemin__panneau-porteur">
      <CadreQuestion
        cle={etat.indexEtape}
        animationsDesactivees={animationsDesactivees}
        className="chemin__panneau"
        data-message-chemin="oui"
        data-critere-reconnu={plateau.critereReconnu ? 'oui' : 'non'}
        data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
        data-fond-opaque="oui"
      >
        {/* T10 — le repère commun (le rang du chemin) est affiché sous la consigne de l'écran ;
            le changement de chemin est signalé par son cadre, plus par « Nouveau chemin ». La
            règle courte, texte à déchiffrer et parfois longue, reste ICI, au-dessus des cases :
            montée dans la barre, elle grandissait l'en-tête de 120 px et faisait recouvrir des
            cases (mesuré, bac-a-sable/socle-etape/chemin07-diagnostic.spec.ts). */}
        <RepereEtape
          moteur="chemin"
          rang={etat.indexEtape + 1}
          total={contenu.consignes.length}
          animationsDesactivees={animationsDesactivees}
        />
        <div key={etape?.identifiant} data-annonce="chemin" role="status" aria-live="polite" aria-atomic="true"
          className="chemin__annonce">
          <RegleCourte texte={plateau.regleCourte} {...(plateau.repere === undefined ? {} : { repere: plateau.repere })} />
        </div>
        <span data-regle-chemin="oui" className="sr-only">
          À chercher maintenant
        </span>
        <span className="sr-only">{consigneCourante?.texte}</span>
        {/* Une seule ligne pour la position et le retour, à la même place : sans message, on lit
            où l'on est ; avec un refus ou un indice, le message prend la ligne. Au corps de lecture
            (E08 : une seule taille), deux lignes de plus faisaient déborder les plateaux denses
            (mesuré : cite-des-histoires-07 en 1080 × 670, 54 px de trop). */}
        <span className="chemin__ligne-etat" data-ligne-etat={retourChemin === '' ? 'position' : 'retour'}>
          <span data-cible-chemin="oui" className="chemin__position">
            <TexteColore texte={caseCourante === null
              ? 'Choisis la première case du chemin.'
              : `${etat.position === departEtape ? 'Départ' : 'Tu es sur'} : « ${caseCourante.libelle} ».`} />
          </span>
          <span data-retour-chemin="oui" className="chemin__retour">
            <MessageStable messages={[...Object.values(MESSAGES_DE_REFUS), 'Indice : une case possible brille en bleu.']}>
              <TexteColore texte={retourChemin} />
            </MessageStable>
          </span>
        </span>
      </CadreQuestion>
      </div>

      {/* ------------------------------------------------------------ la bande statique */}
      <div ref={bande} data-plateau="controles" className="chemin__bande">
        <p
          role="status"
          aria-live="polite"
          data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
          data-animations={animationsDesactivees ? 'calmes' : 'vives'}
        >
          {retourChemin}
        </p>

        <p role="status" aria-live="polite" data-annonce="coloriage">
          {derniere === null
            ? ''
            : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
        </p>
      </div>
    </div>
  );

  // Les deux contrôles (écouter, aide) sont portés par l'écran, pas par le moteur (R10).
  return (
    <DispositionMoteur
      moteur="chemin"
      hauteurPetitEcran="contenu"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-composition={regimeCompact ? 'compacte' : 'confort'}
      data-plateau-defilant={repliCompact ? 'oui' : 'non'}
      data-filet-defilement={plateauDefilant ? 'oui' : 'non'}
      data-plateau-reduit={plateauReduit ? 'oui' : 'non'}
      data-regions-allumees={String(allumees.length)}
      scene={scene}
    />
  );
}
