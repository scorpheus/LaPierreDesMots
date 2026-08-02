/**
 * Outillage commun de la campagne QA — « il faudrait que tu code des qa pour tester tout le
 * site » (le père, verbatim).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE PRINCIPE QUI COMMANDE TOUT CE FICHIER : ON AUDITE LES OBJETS, PAS LES OCCURRENCES.
 *
 * Une suite QA écrite à la main énumère les écrans dont son auteur se souvenait le jour où il
 * l'a écrite. Elle reste verte pour toujours — y compris le jour où un écran neuf arrive sans
 * bouton retour, parce que personne n'a pensé à l'ajouter à la liste. C'est exactement la
 * façon dont le défaut du père a survécu à 23 parcours E2E verts.
 *
 * Ici, l'inventaire est DÉRIVÉ du code :
 *   • les écrans, de la table `CHEMINS` de `client/src/routeur.tsx` ;
 *   • les moteurs, de l'union `CodeMoteur` de `partage/src/identifiants.ts` ;
 *   • les nœuds jouables, de `contenu/noeuds/*.json`.
 *
 * Conséquence opposable, et c'est la seule raison d'être de ce fichier : **une route ajoutée
 * sans recette QA fait ÉCHOUER la suite**, au lieu de passer inaperçue. Un moteur déclaré sans
 * exercice aussi. L'inventaire ne peut pas prendre du retard sur le code, parce qu'il n'est
 * pas écrit à côté du code — il est lu dedans.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Aucune attente de durée (annexe T § 6, règle non négociable de CLAUDE.md) : on attend un
 * ÉTAT — deux images rendues, un sélecteur visible —, jamais un délai.
 *
 * Ce fichier n'est pas un `*.spec.ts` : `playwright.config.ts` ne collecte que
 * `parcours-*.spec.ts` dans le projet `parcours`. Il est importé, jamais exécuté seul.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

export function cheminDepot(relatif: string): string {
  return fileURLToPath(new URL(relatif, RACINE));
}

export function lireTexte(relatif: string): string {
  return readFileSync(cheminDepot(relatif), 'utf8');
}

export function lireJson<T>(relatif: string): T {
  return JSON.parse(lireTexte(relatif)) as T;
}

export const fixtureProfil = lireJson<Record<string, unknown>>('tests/fixtures/profils/enfant.json');

export const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
export const INSTANT = '2026-09-01T08:00:00Z';

/**
 * La population « interactive », reprise MOT POUR MOT de `singe.spec.ts` et de
 * `parcours-issues-de-secours.spec.ts`.
 *
 * Trois fichiers qui auditent le même site doivent regarder la même population : sinon leurs
 * désaccords viennent de ce qu'ils REGARDENT et non de ce qu'ils en concluent, et plus aucun
 * des trois ne prouve quoi que ce soit.
 */
export const SELECTEUR_INTERACTIF = [
  'button:not([disabled])',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  '[data-godet]',
  '[data-region-svg]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** R16 — « cibles ≥ 64 px, tolérance 24 px, aucune coordination fine exigée ». */
export const CIBLE_MINIMALE_PX = 64;

export interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): {
    ecran: string;
    profil: string | null;
    noeud: string | null;
    moteur: string | null;
    progression: unknown;
    etatMoteur: unknown;
    aide: unknown;
  };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
export type FenetreTest = Window & { __test: CrochetsTest };

/** Où l'on se trouve : le code d'écran ET le chemin du routeur, ensemble. */
export async function positionne(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      `${document.querySelector('[data-ecran]')?.getAttribute('data-ecran') ?? 'aucun'}@${
        window.location.pathname
      }`,
  );
}

/** Attend un ÉTAT — deux images rendues —, jamais une durée. */
export async function deuxImages(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resoudre) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resoudre();
          });
        });
      }),
  );
}

/** Démarrage propre : animations coupées, graine et horloge figées, profil chargé. */
export async function preparer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as FenetreTest).__test !== undefined);
  await page.evaluate(
    async ({ fixture, graine, instant }) => {
      const crochets = (window as unknown as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT },
  );
}

export async function etatDuJeu(page: Page): Promise<ReturnType<CrochetsTest['etat']>> {
  return page.evaluate(() => (window as unknown as FenetreTest).__test.etat());
}

// ═══════════════════════════════════════════════════════════════════════ inventaires dérivés

/**
 * Les chemins déclarés par `CHEMINS` dans `client/src/routeur.tsx`.
 *
 * Lu dans le source plutôt qu'importé : Playwright n'a pas les alias `@client/*` de Vitest, et
 * une recopie du littéral serait précisément la liste qui prend du retard. Le motif vise la
 * forme gelée du fichier — `cle: '/chemin'` — et le contrôle ci-dessous refuse un inventaire
 * vide, pour qu'un changement de forme échoue au lieu de rendre zéro route en silence.
 */
export function cheminsDuRouteur(): ReadonlyMap<string, string> {
  const source = lireTexte('client/src/routeur.tsx');
  const bloc = /export const CHEMINS\s*=\s*\{([\s\S]*?)\}\s*as const;/.exec(source);
  if (bloc === null) {
    throw new Error(
      'QA : la table `CHEMINS` est introuvable dans client/src/routeur.tsx. ' +
        "L'inventaire des écrans ne peut plus être dérivé — corriger le motif AVANT de continuer.",
    );
  }
  const chemins = new Map<string, string>();
  for (const ligne of bloc[1]!.split('\n')) {
    const entree = /^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*'([^']+)'/.exec(ligne);
    if (entree !== null) chemins.set(entree[1]!, entree[2]!);
  }
  if (chemins.size === 0) {
    throw new Error('QA : `CHEMINS` a été trouvée mais aucune entrée n’a pu en être lue.');
  }
  return chemins;
}

/**
 * Les moteurs déclarés par l'union `CodeMoteur` de `partage/src/identifiants.ts`.
 *
 * C'est la liste des objets qui DEVRAIENT être jouables. La croiser avec les nœuds livrés est
 * tout l'intérêt : « 14 moteurs déclarés, 6 atteignables » est un chiffre qui dit quelque
 * chose, là où « 6 moteurs testés » n'en dit aucun.
 */
export function moteursDeclares(): readonly string[] {
  const source = lireTexte('partage/src/identifiants.ts');
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(source);
  if (bloc === null) {
    throw new Error('QA : l’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts.');
  }
  const moteurs = [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!);
  if (moteurs.length === 0) {
    throw new Error('QA : `CodeMoteur` a été trouvée mais aucun membre n’a pu en être lu.');
  }
  return moteurs;
}

export interface NoeudLivre {
  readonly id: string;
  readonly region: string;
  readonly exercice: string;
  readonly moteur: string;
}

/**
 * Les nœuds livrés, chacun avec le moteur de son exercice.
 *
 * Un nœud dont l'exercice est introuvable est une donnée cassée : on le signale au lieu de le
 * sauter, sinon la couverture des moteurs se calculerait sur un dénominateur silencieusement
 * réduit — le mode de défaillance que ce fichier existe pour empêcher.
 */
export function noeudsLivres(): readonly NoeudLivre[] {
  const noeuds: NoeudLivre[] = [];
  const exercices = new Map<string, string>();

  for (const region of readdirSync(cheminDepot('contenu/exercices'), { withFileTypes: true })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(cheminDepot(`contenu/exercices/${region.name}`))) {
      if (!fichier.endsWith('.json')) continue;
      const exercice = lireJson<{ id: string; jeu: { moteur: string } }>(
        `contenu/exercices/${region.name}/${fichier}`,
      );
      exercices.set(exercice.id, exercice.jeu.moteur);
    }
  }

  for (const fichier of readdirSync(cheminDepot('contenu/noeuds'))) {
    if (!fichier.endsWith('.json')) continue;
    const noeud = lireJson<{ id: string; region: string; exercice: string }>(
      `contenu/noeuds/${fichier}`,
    );
    const moteur = exercices.get(noeud.exercice);
    if (moteur === undefined) {
      throw new Error(
        `QA : le nœud « ${noeud.id} » désigne l'exercice « ${noeud.exercice} », qui n'existe ` +
          `pas dans contenu/exercices/. Donnée cassée — la couverture des moteurs serait fausse.`,
      );
    }
    noeuds.push({ id: noeud.id, region: noeud.region, exercice: noeud.exercice, moteur });
  }
  return noeuds;
}

// ═════════════════════════════════════════════════════════════════ mesures faites sur l'écran

export interface CibleTropPetite {
  readonly description: string;
  readonly largeur: number;
  readonly hauteur: number;
}

/**
 * R16 — les cibles trop petites de l'écran courant.
 *
 * Ne sont mesurés que les éléments VISIBLES et de surface non nulle : un contrôle masqué ou
 * replié ne demande aucune coordination au doigt, et le compter rendrait la mesure ininterprétable.
 */
export async function ciblesTropPetites(page: Page): Promise<readonly CibleTropPetite[]> {
  return page.evaluate(
    ({ selecteur, minimum }) =>
      [...document.querySelectorAll(selecteur)]
        .map((noeud) => {
          const element = noeud as HTMLElement;
          const boite = element.getBoundingClientRect();
          const nom =
            element.getAttribute('aria-label') ??
            element.getAttribute('data-region-svg') ??
            (element.textContent ?? '').trim().slice(0, 40);
          return {
            description: `${element.tagName.toLowerCase()} « ${nom} »`,
            largeur: Math.round(boite.width),
            hauteur: Math.round(boite.height),
          };
        })
        // Surface nulle = non rendu à l'écran : hors sujet pour une règle de coordination.
        .filter((c) => c.largeur > 0 && c.hauteur > 0)
        .filter((c) => c.largeur < minimum || c.hauteur < minimum),
    { selecteur: SELECTEUR_INTERACTIF, minimum: CIBLE_MINIMALE_PX },
  );
}

/**
 * Tape l'élément de rang `rang` et dit ce que le tap a changé.
 *
 * `dispatchEvent` et non `.click()` : les éléments SVG (`[data-region-svg]`, `[role="button"]`
 * posé sur un `<circle>`) n'exposent pas tous `click`, et l'audit doit couvrir exactement la
 * population que `singe.spec.ts` déclare interactive.
 */
export async function taperElement(
  page: Page,
  rang: number,
): Promise<{ description: string; domChange: boolean } | null> {
  const avant = await page.evaluate(() => document.body.innerHTML);
  const decrit = await page.evaluate(
    ({ selecteur, index }) => {
      const cible = document.querySelectorAll(selecteur)[index];
      if (cible === undefined) return null;
      const element = cible as HTMLElement;
      const nom =
        element.getAttribute('aria-label') ??
        element.getAttribute('data-region-svg') ??
        (element.textContent ?? '').trim().slice(0, 40);
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
      );
      return `${element.tagName.toLowerCase()} « ${nom} »`;
    },
    { selecteur: SELECTEUR_INTERACTIF, index: rang },
  );
  if (decrit === null) return null;
  await deuxImages(page);
  const apres = await page.evaluate(() => document.body.innerHTML);
  return { description: decrit, domChange: apres !== avant };
}

// ══════════════════════════════════════════════════════════════════ recettes d'accès (écrans)

export interface EcranQA {
  /** Le nom lisible, et la clé qui le rattache à `CHEMINS` quand il en vient un. */
  readonly nom: string;
  readonly cleChemin: string | null;
  readonly aller: (page: Page) => Promise<void>;
}

export async function choisirLeProfil(page: Page): Promise<void> {
  await page
    .getByText(String(fixtureProfil['prenom']), { exact: false })
    .first()
    .click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

export async function entrerDansLeNoeud(page: Page, noeud: string): Promise<void> {
  await choisirLeProfil(page);
  await page.evaluate(
    async (id) => (window as unknown as FenetreTest).__test.allerAuNoeud(id),
    noeud,
  );
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
}
