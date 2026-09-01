/**
 * LES GALERIES s'enchaînent aussi — lot N8, D38.
 *
 * D38 : « les DEUX régions (Clairière, Galeries) sont ouvertes dès le départ ». Mesuré au
 * démarrage de N8 : `tests/e2e/parcours-sortie-clairiere.spec.ts` garde la Clairière de bout
 * en bout — et **rien ne gardait la seconde région**. Les Galeries n'avaient que deux nœuds,
 * portaient les deux seuls exercices `trace` du dépôt, et aucun parcours ne prouvait qu'on
 * pouvait y entrer ni en sortir. Une région ouverte que personne ne traverse n'est pas
 * ouverte, elle est dessinée.
 *
 * Ce fichier ne double pas le précédent : il change de région, et il ajoute la mesure que la
 * Clairière ne fait pas — **la longueur d'une sortie, telle que l'application la sert**.
 *
 * ── DEUX RÈGLES DE L'ANNEXE T § 6, TENUES LIGNE À LIGNE ───────────────────────────────────
 *   • on attend un ÉTAT, jamais une durée : aucun `waitForTimeout` ;
 *   • on ne cible que des attributs `data-*`, jamais une classe ni un texte de mise en page.
 *
 * ── ET UNE RÈGLE DE MÉTHODE ───────────────────────────────────────────────────────────────
 * On n'emprunte JAMAIS un crochet de navigation pour arriver sur un nœud. On passe par la
 * prise que l'enfant a sous le doigt — le bouton de départ de la région. Un test qui saute la
 * navigation prouve que les nœuds existent ; il ne prouve pas qu'on peut y arriver, et c'est
 * exactement l'écart qui a produit le défaut n° 4 (« je n'ai eu qu'un exercice »).
 *
 * ── CONTRAT DE SORTIE ─────────────────────────────────────────────────────────────────────
 * Le test imprime les nœuds atteints dans l'ordre et exige :
 *   • que les SIX nœuds déclarés par `contenu/monde/regions.json` soient tous atteignables ;
 *   • qu'aucun exercice livré des Galeries ne reste invisible ;
 *   • qu'une fois la région terminée, la carte offre encore une prise (R14, aucun état sans
 *     issue).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

/**
 * UN PROFIL RIEN QU'À CE FICHIER — même correction que `parcours-sortie-clairiere.spec.ts`.
 *
 * La base E2E est `:memory:` pour TOUTE la campagne et `chargerProfil` réutilise un profil
 * existant par identifiant puis par PRÉNOM. Un prénom partagé ferait hériter ce cas de la
 * progression journalisée par les autres suites, et la mesure démarrerait au deuxième nœud.
 */
const fixtureProfil: Record<string, unknown> = {
  ...(JSON.parse(
    readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8'),
  ) as Record<string, unknown>),
  id: 'profil-test-sortie-galeries',
  prenom: 'Silex',
};

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const REGION = 'galeries';

/**
 * v2 § 5.2, ligne 143 : « 4 à 6 nœuds enchaînés ». **C'est la longueur d'une SORTIE.**
 *
 * Les bornes ne sont plus des littéraux : elles viennent de
 * `contenu/referentiel/parametres-pedagogie.json`, `selecteur.nbNoeudsMin` /
 * `nbNoeudsMax` — les MÊMES valeurs que `composerSortie` applique réellement (convention C2 :
 * aucune valeur pédagogique en dur). Un littéral ici et une donnée là-bas, c'est deux sources
 * de vérité pour un seul chiffre.
 */
const CONTRAINTES = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('contenu/referentiel/parametres-pedagogie.json', RACINE)),
      'utf8',
    ),
  ) as { selecteur: { nbNoeudsMin: number; nbNoeudsMax: number } }
).selecteur;
const NOEUDS_MIN = CONTRAINTES.nbNoeudsMin;
const NOEUDS_MAX = CONTRAINTES.nbNoeudsMax;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  etat(): { readonly ecran: string; readonly noeud: string | null };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Les nœuds que la région DÉCLARE, lus sur disque. Le test ne fabrique pas son attendu. */
function noeudsDeclares(): readonly string[] {
  const document = JSON.parse(
    readFileSync(fileURLToPath(new URL('contenu/monde/regions.json', RACINE)), 'utf8'),
  ) as { readonly regions: readonly { region: string; noeuds: readonly string[] }[] };
  const region = document.regions.find((entree) => entree.region === REGION);
  expect(region, `la région ${REGION} est absente de regions.json`).toBeDefined();
  return region!.noeuds.map(String);
}

/** Les exercices que chaque nœud fait jouer — pour dire, à l'échec, CE QUI est resté invisible. */
function exerciceParNoeud(): ReadonlyMap<string, string> {
  const dossier = fileURLToPath(new URL('contenu/noeuds', RACINE));
  const table = new Map<string, string>();
  for (const fichier of readdirSync(dossier).filter((nom) => nom.endsWith('.json'))) {
    const noeud = JSON.parse(readFileSync(`${dossier}/${fichier}`, 'utf8')) as {
      id: string;
      region: string;
      exercice: string;
    };
    if (String(noeud.region) === REGION) table.set(String(noeud.id), String(noeud.exercice));
  }
  return table;
}

/**
 * `idProfil` — POURQUOI IL EXISTE, et c'est un défaut d'isolation, pas un confort.
 *
 * La carte lit le monde SUR LE SERVEUR (`GET /api/profils/:id/monde`), pas dans le magasin :
 * `chargerProfil` peut donc bien passer une progression vide, l'état des régions vient de la
 * base, et la base est partagée par toute la suite E2E (un seul serveur, une seule
 * `:memory:`). Le cas « on entre dans Les Galeries SANS avoir terminé la Clairière » suppose
 * un profil NEUF ; or le cas qui le précède dans ce même fichier vient de parcourir les six
 * nœuds des Galeries avec le même identifiant.
 *
 * Mesuré : `départs offerts : clairiere, marais-jumeau` — les Galeries avaient leur Éclat,
 * donc elles étaient closes, donc D38 semblait violée. Le produit était juste ; c'est le test
 * qui héritait de l'état du précédent. Un identifiant propre rend au cas la prémisse qu'il
 * énonce.
 */
async function entrerSurLaCarte(
  page: Page,
  termines: readonly string[],
  prenomPropre?: string,
): Promise<void> {
  await page.evaluate(
    async ({ fixture, graine, instant, progression, prenom }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil({
        ...(fixture as Record<string, unknown>),
        ...(prenom === undefined ? {} : { prenom }),
        progression: progression.map((noeud) => ({ noeud, etoiles: 3 })),
      });
    },
    {
      fixture: fixtureProfil,
      graine: GRAINE,
      instant: INSTANT,
      progression: termines,
      prenom: prenomPropre,
    },
  );

  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(prenomPropre ?? fixtureProfil['prenom']), { exact: false })
    .first()
    .click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

test.describe('Les Galeries sont une région JOUABLE, pas seulement ouverte (D38)', () => {
  /**
   * ════════════════════════════════════════════════════════════════════════════════════════
   * LA BORNE HAUTE PORTAIT SUR LA MAUVAISE POPULATION — corrigé au lot A4, argument cité.
   *
   * Ce cas exigeait `4 ≤ nœuds de la région ≤ 6` et citait la v2 § 5.2 ligne 143 : « 4 à 6
   * nœuds enchaînés ». La citation est exacte ; **elle décrit une SORTIE, pas une région.**
   * La longueur d'une sortie est une DONNÉE (`selecteur.nbNoeudsMin` / `nbNoeudsMax` de
   * `contenu/referentiel/parametres-pedagogie.json`), et c'est `composerSortie` qui la tire
   * dans cet intervalle, à chaque passage, quel que soit le nombre de nœuds de la région.
   * `tests/unitaires/sortie-variete.test.ts` l'assert déjà sur 60 passages par région.
   *
   * Transposée à la RÉGION, la borne haute produit l'effet inverse de ce qu'elle protège.
   * L'en-tête de `sortie-variete.test.ts` l'écrit noir sur blanc, et c'est la mesure du lot
   * N8 : « quand le vivier tient tout entier dans la sortie — **le cas de nos deux régions** —,
   * mélanger le milieu ne change que l'ORDRE, jamais la composition ». Une région plafonnée à
   * six nœuds sert donc toujours les mêmes six exercices ; R13 (« jamais deux fois le même
   * habillage ») devient vraie par pénurie, et D46 (« bon en 5 minutes comme en 30 ») est
   * inatteignable. Le plafond était le mécanisme même du défaut n° 4 du père.
   *
   * La borne haute change donc de population, elle n'est pas retirée — et dans le sens qui
   * exige DAVANTAGE : une région doit porter de quoi composer une sortie de longueur MAXIMALE
   * (`≥ nbNoeudsMax`), sans quoi `nbNoeudsMax` est un chiffre que l'application ne peut pas
   * servir. L'ancienne borne ne le vérifiait pas.
   *
   * Le cas jumeau de la Clairière — `tests/unitaires/clairiere-sortie-complete.test.ts`,
   * « elle porte de 4 à 6 nœuds » — porte le même défaut de population. Il n'est PAS touché
   * ici : la Clairière compte exactement six nœuds, il n'y a donc rien à arbitrer sur pièce.
   * Question consignée dans `Docs/questions-en-attente.md` (Q-A4-3).
   * ════════════════════════════════════════════════════════════════════════════════════════
   */
  test('la région porte de quoi composer une sortie ENTIÈRE, pas seulement une sortie', () => {
    const declares = noeudsDeclares();
    expect(
      declares.length,
      `${REGION} déclare ${String(declares.length)} nœud(s) : ${declares.join(', ')}`,
    ).toBeGreaterThanOrEqual(NOEUDS_MIN);
    expect(
      declares.length,
      `${REGION} ne porte pas assez de nœuds pour une sortie de longueur maximale ` +
        `(${String(NOEUDS_MAX)}) : l'application ne pourrait jamais servir cette longueur.`,
    ).toBeGreaterThanOrEqual(NOEUDS_MAX);
  });

  test('regions.json ne cite que des nœuds réellement livrés, et les cite tous', () => {
    // C'est cette liste qui fait le pourcentage de recoloration : un nœud fantôme rendrait la
    // région à jamais incomplète, un nœud oublié la déclarerait finie trop tôt.
    const declares = [...noeudsDeclares()].sort();
    const livres = [...exerciceParNoeud().keys()].sort();
    expect(declares).toEqual(livres);
  });

  test('le bouton de départ ouvre le premier nœud d’un plan réel de 4 à 6 étapes', async ({ page }) => {
    const declares = noeudsDeclares();

    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await entrerSurLaCarte(page, []);
    const depart = page.locator(`[data-depart="${REGION}"]`);
    await expect(
      depart,
      'Les Galeries n’offrent aucune prise alors que D38 les ouvre dès le départ',
    ).toHaveCount(1);
    await depart.click();

    const noeud = page.locator('[data-ecran="noeud"]');
    await expect(noeud).toBeVisible();
    await expect(noeud).toHaveAttribute('data-sortie-rang', '1');
    const total = Number(await noeud.getAttribute('data-sortie-total'));
    expect(total, 'le sélecteur doit composer une sortie de 4 à 6 étapes').toBeGreaterThanOrEqual(4);
    expect(total).toBeLessThanOrEqual(6);
    const atteint = await page.evaluate(() => (window as FenetreTest).__test.etat().noeud);
    expect(declares, `le composeur a ouvert le nœud inconnu ${String(atteint)}`).toContain(atteint);
    await expect(page.locator('[data-progression-sortie]')).toContainText(`1 sur ${String(total)}`);
  });

  test('on entre dans Les Galeries SANS avoir terminé la Clairière (D38)', async ({ page }) => {
    // La promesse de D38 n'est pas « les deux régions existent », c'est « les deux sont
    // ouvertes DÈS LE DÉPART ». Un enfant qui bloque sur une région doit pouvoir aller jouer
    // l'autre : c'est aussi la garantie qu'aucune session ne se termine sans réussite (R14).
    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    // Un PRÉNOM propre à ce cas — et c'est bien le prénom, pas l'identifiant.
    // `chargerProfil` (client/src/testabilite/crochets.ts:159-170) cherche d'abord le profil
    // par son `id` ; s'il ne le trouve pas, il RETOMBE sur un profil existant DE MÊME PRÉNOM,
    // et n'en crée un que si aucun ne correspond. Forcer un identifiant neuf ne changeait donc
    // rien : le crochet retrouvait « Alma » et le cas héritait du monde laissé par le
    // précédent, qui venait de clore Les Galeries.
    await entrerSurLaCarte(page, [], 'Neuve');

    const departs = await page
      .locator('[data-depart]')
      .evaluateAll((noeuds) => noeuds.map((element) => element.getAttribute('data-depart') ?? ''));
    console.log(`[sortie ${REGION}] profil neuf — départs offerts : ${departs.join(', ')}`);
    expect(departs, 'aucune progression, et Les Galeries ne sont pas proposées').toContain(REGION);
  });
});
