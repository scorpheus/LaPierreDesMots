/**
 * Campagne de jouabilité exhaustive des nœuds pédagogiques.
 *
 * L'audit visuel ouvre les 75 écrans ; il ne prouve pas que l'on peut jouer. Cette recette
 * complète ce manque : pour chaque nœud de progression, elle dérive chaque prochain geste juste
 * de l'état que le moteur expose et poursuit jusqu'à la récompense. Elle tente aussi un refus au
 * départ quand un voisin incorrect est identifiable, puis mesure chaque transition produite.
 *
 * La campagne ne connaît ni les mots ni les réponses du corpus. Ajouter un exercice le fait
 * entrer automatiquement dans le dénominateur ; changer un moteur sans adapter sa stratégie
 * fait échouer avec le nom du moteur, au lieu de rendre la couverture silencieusement creuse.
 *
 * Lancer après `npm run construire:test` :
 *   npx playwright test tests/e2e/parcours-campagne-gestes-75.spec.ts --project=parcours
 *
 * Le relevé est volontairement hors Git :
 *   bac-a-sable/audit-75-noeuds/campagne-gestes.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { choisirLeProfil, deuxImages, etatDuJeu, noeudsLivres, preparer } from './qa-outils.js';

const NOEUDS = noeudsLivres().filter((noeud) => noeud.progression);
const DOSSIER_RAPPORT = resolve(process.cwd(), 'bac-a-sable', 'audit-75-noeuds');
const FICHIER_RAPPORT = resolve(DOSSIER_RAPPORT, 'campagne-gestes.json');
/** Borne de gestes logiques, pas une attente : un contenu qui boucle doit échouer franchement. */
const MAX_ETAPES_PAR_NOEUD = 256;

type Action = Readonly<Record<string, unknown>>;

interface Etape {
  readonly restantes?: readonly string[];
}

interface CibleColorie {
  readonly region: string;
  readonly couleur: string;
}

interface Depot {
  readonly element: string;
  readonly zone: string;
}

interface Zone {
  readonly id: string;
  readonly centroide: readonly [number, number];
}

interface ElementTri {
  readonly id: string;
  readonly receptacleAttendu: string;
}

interface CartePaire {
  readonly id: string;
  readonly paire: string;
}

interface Trou {
  readonly id: string;
  readonly attendu: string;
}

interface Trait {
  readonly points: readonly (readonly [number, number])[];
}

interface Lettre {
  readonly traits: readonly Trait[];
}

/** Projection minimale et stable des états des quatorze moteurs. */
interface EtatMoteur {
  readonly indexEtape?: number;
  readonly indexConsigne?: number;
  readonly etapes?: readonly Etape[];
  readonly consignes?: readonly {
    readonly ciblesRestantes?: readonly CibleColorie[];
    readonly depotsRestants?: readonly Depot[];
  }[];
  readonly blocs?: readonly { readonly id: string }[];
  readonly cibles?: readonly { readonly id: string; readonly bonne?: boolean }[];
  readonly cases?: readonly { readonly id: string; readonly voisines: readonly string[] }[];
  readonly vignettes?: readonly { readonly id: string }[];
  readonly options?: readonly { readonly id: string }[];
  readonly trous?: readonly Trou[];
  readonly clavier?: readonly string[];
  readonly cartes?: readonly CartePaire[];
  readonly etiquettes?: readonly { readonly id: string }[];
  readonly elements?: readonly ElementTri[];
  readonly receptacles?: readonly { readonly id: string }[];
  readonly zones?: readonly Zone[];
  readonly lettres?: readonly Lettre[];
  readonly indexLettre?: number;
  readonly indexTrait?: number;
  readonly position?: string | null;
  readonly acquis?: Readonly<Record<string, string>>;
  readonly dernierRefus?: unknown;
  readonly termineMs?: number | null;
}

interface ReleveNoeud {
  readonly id: string;
  readonly region: string;
  readonly moteur: string;
  readonly strategie: string;
  readonly actionRefusee: readonly Action[];
  readonly refusObserve: boolean;
  readonly nbEtapesJouees: number;
  readonly nbActionsCorrectes: number;
  readonly nbActionsRefusees: number;
  readonly nbActionsTotal: number;
  readonly ecranAvant: string;
  readonly ecranApres: string;
  readonly etatAChange: boolean;
  readonly etapeAAvance: boolean;
  readonly termine: boolean;
  readonly erreurs: readonly string[];
}

function etapeCourante(etat: EtatMoteur): Etape | undefined {
  return etat.etapes?.[etat.indexEtape ?? 0];
}

function indexCourant(etat: EtatMoteur): number {
  return etat.indexConsigne ?? etat.indexEtape ?? 0;
}

function premiereRestante(etat: EtatMoteur): string | undefined {
  return etapeCourante(etat)?.restantes?.[0];
}

function resumeEtat(etat: EtatMoteur): string {
  return JSON.stringify(etat);
}

function jalonPedagogique(etat: EtatMoteur): string {
  const consigne = etat.consignes?.[indexCourant(etat)];
  return JSON.stringify({
    etape: indexCourant(etat),
    restantes: etapeCourante(etat)?.restantes ?? [],
    cibles: consigne?.ciblesRestantes ?? [],
    depots: consigne?.depotsRestants ?? [],
    lettre: etat.indexLettre ?? -1,
    trait: etat.indexTrait ?? -1,
    termine: etat.termineMs ?? null,
  });
}

function actionRefusee(moteur: string, etat: EtatMoteur): readonly Action[] {
  const attendue = premiereRestante(etat);
  switch (moteur) {
    case 'assemble': {
      const intrus = etat.blocs?.find((bloc) => bloc.id !== attendue);
      return intrus === undefined ? [] : [{ type: 'poser', bloc: intrus.id }];
    }
    case 'attrape': {
      // Une consigne `attrape` peut accepter plusieurs cibles dans n'importe quel ordre.
      // Choisir simplement une autre cible que la première ferait alors progresser le jeu et
      // transformerait notre contrôle négatif en faux échec. Une vraie cible refusée est soit
      // explicitement intruse, soit absente des restantes de l'étape courante.
      const restantes = new Set(etapeCourante(etat)?.restantes ?? []);
      const intrus = etat.cibles?.find(
        (cible) =>
          etat.acquis?.[cible.id] === undefined &&
          (cible.bonne === false || !restantes.has(cible.id)),
      );
      return intrus === undefined ? [] : [{ type: 'toucher', cible: intrus.id }];
    }
    case 'chemin': {
      const position = etat.cases?.find((caseChemin) => caseChemin.id === etat.position);
      const intrus = position?.voisines.find((id) => id !== attendue);
      return intrus === undefined ? [] : [{ type: 'avancer', caseVisee: intrus }];
    }
    case 'chrono': {
      const intrus = etat.vignettes?.find((vignette) => vignette.id !== attendue);
      return intrus === undefined ? [] : [{ type: 'numeroter', vignette: intrus.id }];
    }
    case 'colorie': {
      const cible = etat.consignes?.[indexCourant(etat)]?.ciblesRestantes?.[0];
      if (cible === undefined) return [];
      return [
        { type: 'choisirCouleur', couleur: cible.couleur === 'bleu' ? 'rouge' : 'bleu' },
        { type: 'peindre', region: cible.region },
      ];
    }
    case 'eclair':
    case 'histoire': {
      const intrus = etat.options?.find((option) => option.id !== attendue);
      return intrus === undefined ? [] : [{ type: 'repondre', option: intrus.id }];
    }
    case 'grave': {
      const trou = etat.trous?.find((candidat) => candidat.id === attendue);
      const intrus = etat.clavier?.find((lettre) => lettre !== trou?.attendu);
      return intrus === undefined ? [] : [{ type: 'graver', lettre: intrus }];
    }
    case 'paires': {
      const premiere = etat.cartes?.[0];
      const seconde = etat.cartes?.find((carte) => carte.paire !== premiere?.paire);
      return premiere === undefined || seconde === undefined
        ? []
        : [
            { type: 'retourner', carte: premiere.id },
            { type: 'retourner', carte: seconde.id },
          ];
    }
    case 'phrase': {
      const intrus = etat.etiquettes?.find((etiquette) => etiquette.id !== attendue);
      return intrus === undefined ? [] : [{ type: 'placer', etiquette: intrus.id }];
    }
    case 'place': {
      const depot = etat.consignes?.[indexCourant(etat)]?.depotsRestants?.[0];
      const intrus = etat.zones?.find((zone) => zone.id !== depot?.zone);
      return depot === undefined || intrus === undefined
        ? []
        : [
            { type: 'saisir', element: depot.element },
            { type: 'deposer', point: intrus.centroide },
          ];
    }
    case 'trace': {
      const trait = etat.lettres?.[etat.indexLettre ?? 0]?.traits[etat.indexTrait ?? 0];
      if (trait === undefined || trait.points.length < 2) return [];
      const inverse = [...trait.points].reverse();
      return gesteTrace(inverse);
    }
    case 'tri': {
      const element = etat.elements?.find((candidat) => candidat.id === attendue);
      const intrus = etat.receptacles?.find((receptacle) => receptacle.id !== element?.receptacleAttendu);
      return element === undefined || intrus === undefined
        ? []
        : [
            { type: 'saisir', element: element.id },
            { type: 'deposer', element: element.id, receptacle: intrus.id },
          ];
    }
    default:
      return [];
  }
}

function gesteTrace(points: readonly (readonly [number, number])[]): readonly Action[] {
  const echantillons = points.map((point, index) => ({ point, instantMs: index }));
  const premier = echantillons[0];
  if (premier === undefined) return [];
  return [
    { type: 'commencerGeste', echantillon: premier },
    ...echantillons.slice(1).map((echantillon) => ({ type: 'prolongerGeste', echantillon })),
    { type: 'terminerGeste' },
  ];
}

function actionCorrecte(moteur: string, etat: EtatMoteur): readonly Action[] {
  const attendue = premiereRestante(etat);
  switch (moteur) {
    case 'assemble':
      return attendue === undefined ? [] : [{ type: 'poser', bloc: attendue }];
    case 'attrape':
      return attendue === undefined ? [] : [{ type: 'toucher', cible: attendue }];
    case 'chemin':
      return attendue === undefined ? [] : [{ type: 'avancer', caseVisee: attendue }];
    case 'chrono':
      return attendue === undefined ? [] : [{ type: 'numeroter', vignette: attendue }];
    case 'colorie': {
      const cible = etat.consignes?.[indexCourant(etat)]?.ciblesRestantes?.[0];
      return cible === undefined
        ? []
        : [
            { type: 'choisirCouleur', couleur: cible.couleur },
            { type: 'peindre', region: cible.region },
          ];
    }
    case 'eclair':
      return attendue === undefined
        ? []
        : [{ type: 'finExposition' }, { type: 'repondre', option: attendue }];
    case 'grave': {
      const trou = etat.trous?.find((candidat) => candidat.id === attendue);
      return trou === undefined ? [] : [{ type: 'graver', lettre: trou.attendu }];
    }
    case 'histoire':
      return attendue === undefined ? [] : [{ type: 'repondre', option: attendue }];
    case 'paires': {
      const paire = etat.cartes?.filter((carte) => carte.paire === attendue) ?? [];
      return paire.length < 2
        ? []
        : [
            { type: 'retourner', carte: paire[0]!.id },
            { type: 'retourner', carte: paire[1]!.id },
          ];
    }
    case 'phrase':
      return attendue === undefined ? [] : [{ type: 'placer', etiquette: attendue }];
    case 'place': {
      const depot = etat.consignes?.[indexCourant(etat)]?.depotsRestants?.[0];
      const zone = etat.zones?.find((candidat) => candidat.id === depot?.zone);
      return depot === undefined || zone === undefined
        ? []
        : [
            { type: 'saisir', element: depot.element },
            { type: 'glisser', point: zone.centroide },
            { type: 'deposer', point: zone.centroide },
          ];
    }
    case 'trace': {
      const trait = etat.lettres?.[etat.indexLettre ?? 0]?.traits[etat.indexTrait ?? 0];
      return trait === undefined ? [] : gesteTrace(trait.points);
    }
    case 'tri': {
      const element = etat.elements?.find((candidat) => candidat.id === attendue);
      return element === undefined
        ? []
        : [
            { type: 'saisir', element: element.id },
            { type: 'deposer', element: element.id, receptacle: element.receptacleAttendu },
          ];
    }
    default:
      return [];
  }
}

async function jouerActions(page: Page, actions: readonly Action[]): Promise<void> {
  await page.evaluate(async (actionsReelles) => {
    const crochets = (window as Window & { __test?: { repondre(action: unknown): Promise<void> } }).__test;
    if (crochets === undefined) throw new Error('crochets __test absents pendant le geste');
    for (const actionReelle of actionsReelles) await crochets.repondre(actionReelle);
  }, actions);
  await deuxImages(page);
}

async function ecran(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector('[data-ecran]')?.getAttribute('data-ecran') ?? 'aucun');
}

async function jouerNoeud(
  page: Page,
  noeud: (typeof NOEUDS)[number],
  erreursPage: string[],
): Promise<ReleveNoeud> {
  const erreurs: string[] = [];
  const erreurInitiale = erreursPage.length;
  await page.evaluate(async (id) => {
    const crochets = (window as Window & { __test?: { allerAuNoeud(id: string): Promise<void>; sauterAnimations(): void } }).__test;
    if (crochets === undefined) throw new Error('crochets __test absents pendant l’ouverture du nœud');
    crochets.sauterAnimations();
    await crochets.allerAuNoeud(id);
  }, noeud.id);
  await expect(page.locator(`[data-ecran="noeud"] [data-moteur="${noeud.moteur}"]`)).toBeVisible();

  const ecranAvant = await ecran(page);
  let etat = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
  const actionsRefusees = actionRefusee(noeud.moteur, etat);
  let refusObserve = false;
  if (actionsRefusees.length > 0) {
    const jalonAvantRefus = jalonPedagogique(etat);
    await jouerActions(page, actionsRefusees);
    etat = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
    refusObserve = etat.dernierRefus !== undefined && etat.dernierRefus !== null;
    if (!refusObserve) erreurs.push('Le refus initial dérivable n’est pas observable dans l’état.');
    if (jalonPedagogique(etat) !== jalonAvantRefus) {
      erreurs.push('Le refus initial a fait avancer le jalon pédagogique.');
    }
    if (await page.locator('[data-etat="echec"]').count() > 0) {
      erreurs.push('Un écran d’échec est apparu après le refus initial.');
    }
  }

  const resumeInitial = resumeEtat(etat);
  const jalonInitial = jalonPedagogique(etat);
  let resumePrecedent = resumeInitial;
  let jalonPrecedent = jalonInitial;
  let nbEtapesJouees = 0;
  let nbActionsCorrectes = 0;
  let etatAChange = false;
  let etapeAAvance = false;

  for (let tour = 0; tour < MAX_ETAPES_PAR_NOEUD; tour += 1) {
    if ((await ecran(page)) === 'recompense') break;

    const avant = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
    const actionsCorrectes = actionCorrecte(noeud.moteur, avant);
    if (actionsCorrectes.length === 0) {
      erreurs.push(
        `Aucune action correcte dérivable pour le moteur « ${noeud.moteur} » au tour ${String(tour + 1)}.`,
      );
      break;
    }

    await jouerActions(page, actionsCorrectes);
    nbEtapesJouees += 1;
    nbActionsCorrectes += actionsCorrectes.length;

    const apresTour = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
    const ecranApresTour = await ecran(page);
    const nouveauResume = resumeEtat(apresTour);
    const nouveauJalon = jalonPedagogique(apresTour);
    const aChange = nouveauResume !== resumePrecedent || ecranApresTour === 'recompense';
    const aAvance = nouveauJalon !== jalonPrecedent || ecranApresTour === 'recompense';
    etatAChange ||= aChange;
    etapeAAvance ||= aAvance;

    if (!aChange) {
      erreurs.push(`Le geste correct du tour ${String(tour + 1)} ne produit aucun état observable.`);
      break;
    }
    if (!aAvance) {
      erreurs.push(`Le geste correct du tour ${String(tour + 1)} ne fait pas avancer le jalon pédagogique.`);
      break;
    }
    if (await page.locator('[data-etat="echec"]').count() > 0) {
      erreurs.push(`Un écran d’échec est apparu au tour ${String(tour + 1)}.`);
      break;
    }

    resumePrecedent = nouveauResume;
    jalonPrecedent = nouveauJalon;
  }

  const apres = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
  const ecranApres = await ecran(page);
  etatAChange ||= resumeEtat(apres) !== resumeInitial || ecranApres !== ecranAvant;
  etapeAAvance ||= jalonPedagogique(apres) !== jalonInitial;
  const termine = ecranApres === 'recompense';

  if (!termine) {
    erreurs.push(
      nbEtapesJouees >= MAX_ETAPES_PAR_NOEUD
        ? `La borne de sécurité de ${String(MAX_ETAPES_PAR_NOEUD)} étapes est atteinte sans récompense.`
        : 'Le nœud s’est arrêté avant l’écran de récompense.',
    );
  }
  erreurs.push(...erreursPage.slice(erreurInitiale).map((message) => `Exception navigateur : ${message}`));

  return {
    id: noeud.id,
    region: noeud.region,
    moteur: noeud.moteur,
    strategie: `état-réel/${noeud.moteur}`,
    actionRefusee: actionsRefusees,
    refusObserve,
    nbEtapesJouees,
    nbActionsCorrectes,
    nbActionsRefusees: actionsRefusees.length,
    nbActionsTotal: nbActionsCorrectes + actionsRefusees.length,
    ecranAvant,
    ecranApres,
    etatAChange,
    etapeAAvance,
    termine,
    erreurs,
  };
}

test.describe('campagne complète — 75 nœuds pédagogiques', () => {
  test('chaque nœud refuse sans échec puis se joue jusqu’à la récompense', async ({ page }) => {
    test.slow();
    mkdirSync(DOSSIER_RAPPORT, { recursive: true });
    const erreursPage: string[] = [];
    page.on('pageerror', (erreur) => erreursPage.push(erreur.message));

    await preparer(page, 'CampagneGestes75');
    await choisirLeProfil(page, 'CampagneGestes75');
    const releves: ReleveNoeud[] = [];

    try {
      for (const noeud of NOEUDS) {
        try {
          releves.push(await jouerNoeud(page, noeud, erreursPage));
        } catch (erreur) {
          releves.push({
            id: noeud.id,
            region: noeud.region,
            moteur: noeud.moteur,
            strategie: `état-réel/${noeud.moteur}`,
            actionRefusee: [],
            refusObserve: false,
            nbEtapesJouees: 0,
            nbActionsCorrectes: 0,
            nbActionsRefusees: 0,
            nbActionsTotal: 0,
            ecranAvant: await ecran(page),
            ecranApres: await ecran(page),
            etatAChange: false,
            etapeAAvance: false,
            termine: false,
            erreurs: [erreur instanceof Error ? erreur.message : String(erreur)],
          });
        }
      }
    } finally {
      const echecs = releves.filter((releve) => releve.erreurs.length > 0);
      const nbEtapesJouees = releves.reduce((total, releve) => total + releve.nbEtapesJouees, 0);
      const nbActionsCorrectes = releves.reduce((total, releve) => total + releve.nbActionsCorrectes, 0);
      const nbActionsRefusees = releves.reduce((total, releve) => total + releve.nbActionsRefusees, 0);
      writeFileSync(
        FICHIER_RAPPORT,
        JSON.stringify(
          {
            total: releves.length,
            termines: releves.filter((releve) => releve.termine).length,
            moteurs: [...new Set(releves.map((releve) => releve.moteur))].sort(),
            avecRefusDerivable: releves.filter((releve) => releve.actionRefusee.length > 0).length,
            borneEtapesParNoeud: MAX_ETAPES_PAR_NOEUD,
            nbEtapesJouees,
            nbActionsCorrectes,
            nbActionsRefusees,
            nbActionsTotal: nbActionsCorrectes + nbActionsRefusees,
            echecs: echecs.map((releve) => ({ id: releve.id, moteur: releve.moteur, erreurs: releve.erreurs })),
            releves,
          },
          null,
          2,
        ),
      );
    }

    expect(NOEUDS.length, 'le dénominateur doit rester les 75 nœuds de progression').toBe(75);
    const echecs = releves.filter((releve) => releve.erreurs.length > 0);
    expect(echecs, 'détail complet dans bac-a-sable/audit-75-noeuds/campagne-gestes.json').toEqual([]);
  });
});
