/**
 * Parcours de surface de la Vallée : une manipulation réelle par atelier.
 * Cette recette prouve navigation, persistance et cadrage ; elle ne juge pas la compréhension CE1.
 */
import { expect, test } from './invariants.js';
import type { Page } from '@playwright/test';
import type { EtatMaths, ResultatApiMaths } from '@pierre/partage/mathematiques';

const FORMATS = [
  { nom: 'telephone', largeur: 390, hauteur: 844 },
  { nom: 'grand', largeur: 1920, hauteur: 1200 },
  { nom: 'tablette-portrait', largeur: 800, hauteur: 1200 },
  { nom: 'telephone-paysage', largeur: 844, hauteur: 390 },
] as const;

const FAMILLES = {
  jardin: ['MAT-JAR-01', 'MAT-JAR-02', 'MAT-JAR-03'],
  ponts: ['MAT-PON-01', 'MAT-PON-02', 'MAT-PON-03'],
  moulin: ['MAT-MOU-01', 'MAT-MOU-02', 'MAT-MOU-03'],
  marche: ['MAT-MAR-01', 'MAT-MAR-02', 'MAT-MAR-03'],
  chantier: ['MAT-CHA-01', 'MAT-CHA-02', 'MAT-CHA-03'],
  horloge: ['MAT-HOR-01', 'MAT-HOR-02', 'MAT-HOR-03'],
} as const;
type Lieu = keyof typeof FAMILLES;
type Famille = (typeof FAMILLES)[Lieu][number];
const LIEUX = Object.keys(FAMILLES) as Lieu[];
const FAMILLES_RECHARGEES = new Set<Famille>(['MAT-JAR-01', 'MAT-PON-01', 'MAT-HOR-01']);

async function lireEtat(page: Page, profilId: string): Promise<EtatMaths> {
  const reponse = await page.request.get(`/api/mathematiques/etat?profilId=${encodeURIComponent(profilId)}`);
  expect(reponse.ok(), 'le carnet maths doit pouvoir être relu pendant le geste enfant').toBe(true);
  const resultat = await reponse.json() as ResultatApiMaths<EtatMaths>;
  expect(resultat.ok).toBe(true);
  if (!resultat.ok) throw new Error(`Carnet maths absent : ${resultat.erreur.code}`);
  return resultat.valeur;
}

async function revision(page: Page, profilId: string): Promise<number> {
  const reprise = (await lireEtat(page, profilId)).reprise;
  expect(reprise, 'une activité libre garde son instance active').not.toBeNull();
  return reprise!.revision;
}

/** Attend l'ACK durable du vrai bouton, sans injecter de geste ni de réponse. */
async function faireGeste(page: Page, profilId: string, toucher: () => Promise<void>): Promise<void> {
  const avant = await revision(page, profilId);
  await toucher();
  await expect.poll(() => revision(page, profilId), {
    message: 'la manipulation tactile reçoit un accusé durable',
  }).toBe(avant + 1);
}

async function verifierCadrage(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'la page ne doit pas déborder horizontalement ; seuls les ateliers peuvent défiler dans leur cadre').toBe(true);
}

async function ouvrirLieu(page: Page, lieu: Lieu): Promise<void> {
  await page.getByTestId(`lieu-${lieu}`).click();
  await expect(page.getByTestId(`lieu-${lieu}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Essayer cette activité' })).toHaveCount(3);
}

async function manipuler(page: Page, profilId: string, famille: Famille): Promise<void> {
  const scene = page.getByTestId('scene-ponts');
  switch (famille) {
    case 'MAT-PON-01':
      await faireGeste(page, profilId, () => scene.getByRole('group', { name: 'Place le zéro de la règle' }).getByRole('button').first().click());
      return;
    case 'MAT-PON-02':
      await scene.getByRole('group', { name: 'Nombre à porter' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /^Graduation /u }).first().click());
      return;
    case 'MAT-PON-03':
      await scene.getByTestId('piece-module-a').click();
      await faireGeste(page, profilId, () => scene.getByTestId('tablier-position-0').click());
      return;
    case 'MAT-JAR-01': case 'MAT-JAR-02': case 'MAT-JAR-03':
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /^(Ajouter|Couvrir)/u }).first().click());
      return;
    case 'MAT-MOU-01':
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /Ajouter une roue/u }).first().click());
      return;
    case 'MAT-MOU-02':
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /Verser une mesure/u }).first().click());
      return;
    case 'MAT-MOU-03':
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /Ouvrir une part/u }).first().click());
      return;
    case 'MAT-MAR-01':
      await scene.getByRole('group', { name: 'Choisis une pièce ou un billet' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: 'Mettre dans la caisse' }).click());
      return;
    case 'MAT-MAR-02':
      await scene.getByRole('group', { name: 'Choisis une pièce ou un billet' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: 'Ajouter au donné' }).click());
      return;
    case 'MAT-MAR-03':
      await faireGeste(page, profilId, () => scene.locator('.marche-articles button').first().click());
      return;
    case 'MAT-CHA-01':
      await scene.getByRole('group', { name: 'Sommets du plan' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /^Point /u }).first().click());
      return;
    case 'MAT-CHA-02':
      await scene.getByRole('group', { name: 'Choisir une face' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /^Patron A, case /u }).first().click());
      return;
    case 'MAT-CHA-03':
      await faireGeste(page, profilId, () => scene.getByRole('button', { name: /Plateau gauche/u }).click());
      return;
    case 'MAT-HOR-01':
      await faireGeste(page, profilId, () => scene.getByRole('group', { name: 'Petite aiguille : heure' }).getByRole('button').first().click());
      return;
    case 'MAT-HOR-02':
      await scene.getByRole('group', { name: 'Rubans à poser' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.getByRole('group', { name: /Choisis le départ du ruban/u }).getByRole('button').first().click());
      return;
    case 'MAT-HOR-03':
      await scene.getByRole('group', { name: 'Trajets à classer' }).getByRole('button').first().click();
      await faireGeste(page, profilId, () => scene.locator('.horloge-tableau button').first().click());
      return;
  }
}

async function creerProfil(page: Page, nom: string): Promise<string> {
  await page.goto('/');
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
  await page.getByLabel('Ton prénom').fill(nom);
  await page.getByRole('button', { name: 'C’est parti' }).click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  const profils = await (await page.request.get('/api/profils')).json() as readonly { readonly id: string }[];
  expect(profils, 'le profil neuf est créé par le parcours enfant').toHaveLength(1);
  return profils[0]!.id;
}

for (const format of FORMATS) {
  test(`Vallée : 18 activités libres et retours réels en ${format.nom}`, async ({ page }, info) => {
    test.slow();
    await page.setViewportSize({ width: format.largeur, height: format.hauteur });
    const profilId = await creerProfil(page, `Vallee${format.nom}`);
    await page.locator('[data-vers="mathematiques"]').click();
    await expect(page.getByTestId('lieux-maths')).toBeVisible();
    let recharges = 0;

    for (const lieu of LIEUX) {
      const familles = FAMILLES[lieu];
      await ouvrirLieu(page, lieu);
      for (let rang = 0; rang < familles.length; rang += 1) {
        const famille = familles[rang]!;
        await page.getByRole('button', { name: 'Essayer cette activité' }).nth(rang).click();
        const scene = page.getByTestId('scene-ponts');
        await expect(scene).toHaveAttribute('data-famille', famille);
        await expect(scene.locator('[data-decor-maths]')).toBeVisible();
        await expect(scene.locator('.scene-ponts__consigne p')).toBeVisible();
        await verifierCadrage(page);
        await page.screenshot({ path: info.outputPath(`${format.nom}-${famille}.png`), fullPage: true, scale: 'css' });
        await manipuler(page, profilId, famille);
        await faireGeste(page, profilId, () => scene.getByRole('button', { name: 'Demander une idée à Gobi' }).click());

        if (FAMILLES_RECHARGEES.has(famille)) {
          const instanceAvant = (await lireEtat(page, profilId)).reprise!.instance.id;
          await page.reload();
          await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', famille);
          expect((await lireEtat(page, profilId)).reprise?.instance.id, 'la reprise garde la même instance après rechargement').toBe(instanceAvant);
          recharges += 1;
        }
        await page.getByRole('button', {
          name: lieu === 'ponts' ? 'Retour aux Ponts en gardant ma partie' : 'Retour au lieu en gardant ma partie',
        }).click();
        await expect(page.getByTestId(`lieu-${lieu}`)).toBeVisible();
      }
      await page.getByRole('button', { name: 'Les six lieux' }).click();
      await expect(page.getByTestId('lieux-maths')).toBeVisible();
    }
    expect(recharges, 'au moins trois familles ont été restaurées après rechargement').toBe(3);
  });
}
