/**
 * Campagne de jouabilité exhaustive des nœuds pédagogiques.
 *
 * L'audit visuel ouvre les 75 écrans ; il ne prouve pas que l'on peut jouer. Cette recette
 * complète ce manque : pour chaque nœud de progression, elle dérive le prochain geste juste
 * de l'état que le moteur expose, joue une réponse correcte, tente aussi un refus quand un
 * voisin incorrect est identifiable, puis mesure la transition réellement produite.
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
  readonly etapes?: readonly Etape[];
  readonly consignes?: readonly {
    readonly ciblesRestantes?: readonly CibleColorie[];
    readonly depotsRestants?: readonly Depot[];
  }[];
  readonly blocs?: readonly { readonly id: string }[];
  readonly cibles?: readonly { readonly id: string }[];
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
  readonly actionCorrecte: readonly Action[];
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

function premiereRestante(etat: EtatMoteur): string | undefined {
  return etapeCourante(etat)?.restantes?.[0];
}

function resumeEtat(etat: EtatMoteur): string {
  return JSON.stringify(etat);
}

function jalonPedagogique(etat: EtatMoteur): string {
  const consigne = etat.consignes?.[etat.indexEtape ?? 0];
  return JSON.stringify({
    etape: etat.indexEtape ?? -1,
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
      const intrus = etat.cibles?.find((cible) => cible.id !== attendue);
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
      const cible = etat.consignes?.[etat.indexEtape ?? 0]?.ciblesRestantes?.[0];
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
      const depot = etat.consignes?.[etat.indexEtape ?? 0]?.depotsRestants?.[0];
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
      const cible = etat.consignes?.[etat.indexEtape ?? 0]?.ciblesRestantes?.[0];
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
      const depot = etat.consignes?.[etat.indexEtape ?? 0]?.depotsRestants?.[0];
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
  for (const action of actions) {
    await page.evaluate(async (actionReelle) => {
      const crochets = (window as Window & { __test?: { repondre(action: unknown): Promise<void> } }).__test;
      if (crochets === undefined) throw new Error('crochets __test absents pendant le geste');
      await crochets.repondre(actionReelle);
    }, action);
    await deuxImages(page);
  }
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
    await jouerActions(page, actionsRefusees);
    etat = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
    refusObserve = etat.dernierRefus !== undefined && etat.dernierRefus !== null;
  }

  const avant = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
  const resumeAvant = resumeEtat(avant);
  const jalonAvant = jalonPedagogique(avant);
  const actionsCorrectes = actionCorrecte(noeud.moteur, avant);
  if (actionsCorrectes.length === 0) {
    erreurs.push(`Aucune action correcte dérivable pour le moteur « ${noeud.moteur} ».`);
  } else {
    await jouerActions(page, actionsCorrectes);
  }
  const apres = ((await etatDuJeu(page)).etatMoteur as EtatMoteur | null) ?? {};
  const ecranApres = await ecran(page);
  const etatAChange = resumeEtat(apres) !== resumeAvant || ecranApres !== ecranAvant;
  const termine = (apres.termineMs !== undefined && apres.termineMs !== null) || ecranApres === 'recompense';
  const etapeAAvance = jalonPedagogique(apres) !== jalonAvant;

  if (!etatAChange) erreurs.push('La réponse correcte ne produit aucun état observable.');
  if (!etapeAAvance && !termine) {
    erreurs.push('La réponse correcte ne fait avancer ni l’étape ni la fin de l’exercice.');
  }
  if (await page.locator('[data-etat="echec"]').count() > 0) {
    erreurs.push('Un écran d’échec est apparu après un geste.');
  }
  erreurs.push(...erreursPage.slice(erreurInitiale).map((message) => `Exception navigateur : ${message}`));

  return {
    id: noeud.id,
    region: noeud.region,
    moteur: noeud.moteur,
    strategie: `état-réel/${noeud.moteur}`,
    actionRefusee: actionsRefusees,
    refusObserve,
    actionCorrecte: actionsCorrectes,
    ecranAvant,
    ecranApres,
    etatAChange,
    etapeAAvance,
    termine,
    erreurs,
  };
}

test.describe('campagne de gestes — 75 nœuds pédagogiques', () => {
  test('chaque nœud admet une action correcte, refuse sans échec et reste jouable', async ({ page }) => {
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
            actionCorrecte: [],
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
      writeFileSync(
        FICHIER_RAPPORT,
        JSON.stringify(
          {
            total: releves.length,
            moteurs: [...new Set(releves.map((releve) => releve.moteur))].sort(),
            avecRefusDerivable: releves.filter((releve) => releve.actionRefusee.length > 0).length,
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
