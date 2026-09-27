/** Première traversée réelle : les paramètres se lisent dans le carnet, les gestes se font dans l'UI. */
import { expect, test } from './invariants.js';
import type { Page, TestInfo } from '@playwright/test';
import type { EtatMaths, RepriseMaths, ResultatApiMaths } from '@pierre/partage/mathematiques';
import type { InstancePont01, InstancePont02, InstancePont03 } from '@pierre/partage/mathematiques';

const FORMATS = [
  { nom: 'grand', largeur: 1920, hauteur: 1200 },
  { nom: 'mobile', largeur: 390, hauteur: 844 },
] as const;

async function lireCarnet(page: Page, profilId: string): Promise<EtatMaths> {
  const reponse = await page.request.get(`/api/mathematiques/etat?profilId=${encodeURIComponent(profilId)}`);
  expect(reponse.ok(), 'le carnet maths doit rester lisible pendant le parcours').toBe(true);
  const resultat = await reponse.json() as ResultatApiMaths<EtatMaths>;
  expect(resultat.ok).toBe(true);
  if (!resultat.ok) throw new Error(`Carnet maths indisponible : ${resultat.erreur.code}`);
  return resultat.valeur;
}

async function partieCourante(page: Page, profilId: string): Promise<RepriseMaths> {
  const reprise = (await lireCarnet(page, profilId)).reprise;
  expect(reprise, 'une étape active est enregistrée').not.toBeNull();
  return reprise!;
}

/** Chaque clic attend son accusé durable ; aucun temps de sommeil ne décide du prochain geste. */
async function geste(page: Page, profilId: string, toucher: () => Promise<void>): Promise<RepriseMaths> {
  const avant = await partieCourante(page, profilId);
  await toucher();
  await expect.poll(async () => (await partieCourante(page, profilId)).revision,
    { message: 'le geste enfant reçoit une nouvelle révision durable' }).toBe(avant.revision + 1);
  return partieCourante(page, profilId);
}

async function exportLecture(page: Page, profilId: string, jeton: string): Promise<string> {
  const reponse = await page.request.get(`/api/parent/${encodeURIComponent(profilId)}/export/tentatives`, {
    headers: { 'x-jeton-parent': jeton },
  });
  expect(reponse.ok(), 'l’export parent lit le journal brut des tentatives de lecture').toBe(true);
  return reponse.text();
}

async function ouvrirPonts(page: Page): Promise<void> {
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('lieux-maths')).toBeVisible();
  await page.getByTestId('lieu-ponts').click();
  await expect(page.locator('.maths-ponts')).toBeVisible();
}

async function scene(page: Page, famille: string): Promise<void> {
  await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', famille);
}

async function capture(page: Page, info: TestInfo, nom: string): Promise<void> {
  await page.screenshot({ path: info.outputPath(`${nom}.png`), fullPage: true, scale: 'css' });
}

for (const format of FORMATS) {
  test(`MAT-PON-P01 : trois ateliers, erreur, aide et reprise durable en ${format.nom}`, async ({ page }, info) => {
    test.slow();
    await page.setViewportSize({ width: format.largeur, height: format.hauteur });
    await page.goto('/');
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
    await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
    await page.getByLabel('Ton prénom').fill(`Ponts${format.nom}`);
    await page.getByRole('button', { name: 'C’est parti' }).click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    const profils = await (await page.request.get('/api/profils')).json() as readonly { id: string }[];
    expect(profils, 'le profil a été créé par le formulaire enfant sur une base neuve').toHaveLength(1);
    const profilId = profils[0]!.id;

    const definition = await page.request.post('/api/parent/definir', { data: { code: '4271' } });
    expect(definition.ok(), 'la base isolée possède un code parent pour lire le journal brut').toBe(true);
    const jeton = (await definition.json() as { jeton: string }).jeton;
    const lectureAvant = await exportLecture(page, profilId, jeton);
    expect(lectureAvant.split('\r\n').filter(Boolean), 'le journal de lecture du profil neuf n’a que son en-tête').toHaveLength(1);

    await ouvrirPonts(page);
    const choixNiveaux = page.locator('.maths-projet .maths-niveaux');
    await expect(choixNiveaux).toHaveCount(3);
    for (let rang = 0; rang < 3; rang += 1) {
      await choixNiveaux.nth(rang).getByRole('button', { name: 'Défi' }).click();
    }
    await page.getByRole('button', { name: 'Commencer La première traversée' }).click();
    await scene(page, 'MAT-PON-01');
    const premiere = await partieCourante(page, profilId);
    expect(premiere.projet?.plan.map((etape) => etape.famille)).toEqual([
      'MAT-PON-01', 'MAT-PON-03', 'MAT-PON-02',
    ]);
    expect(premiere.projet?.plan.map((etape) => etape.niveau)).toEqual(['defi', 'defi', 'defi']);
    const sessionId = premiere.projet!.sessionId;
    const plan = premiere.projet!.plan;
    const mesure = premiere.instance as InstancePont01;
    expect(mesure.parametres.nombrePlanches).toBe(2);
    await capture(page, info, `${format.nom}-01-premiere-scene-defi`);

    const zero = page.getByRole('group', { name: 'Place le zéro de la règle' });
    await geste(page, profilId, () => zero.getByRole('button', {
      name: String(mesure.parametres.origineCible), exact: true,
    }).click());
    const longueur = page.getByRole('group', { name: 'Quelle longueur lis-tu ?' });
    let lue = 0;
    while (lue < mesure.parametres.longueurCible) {
      const pas = mesure.parametres.longueurCible - lue >= 10 ? 10 : 1;
      await geste(page, profilId, () => longueur.getByRole('button', {
        name: pas === 10 ? 'Ajouter dix centimètres' : 'Ajouter un centimètre',
      }).click());
      lue += pas;
      await expect(longueur.locator('output')).toHaveText(`${String(lue)} cm`);
    }
    const stockPlanches = page.getByRole('group', { name: /Choisis 2 planches/u });
    for (const id of ['planche-c', 'planche-d']) {
      await geste(page, profilId, () => stockPlanches.getByRole('button', { name: new RegExp(`^${id},`, 'u') }).click());
    }
    await geste(page, profilId, () => page.getByRole('button', { name: 'Vérifier mon pont' }).click());
    const erreur = await partieCourante(page, profilId);
    expect(erreur.instance.id).toBe(premiere.instance.id);
    expect(erreur.erreursValidees).toBe(1);
    await expect(page.getByTestId('scene-ponts')).toBeVisible();

    const avecAide = await geste(page, profilId,
      () => page.getByRole('button', { name: 'Demander une idée à Gobi' }).click());
    expect(avecAide.aide).toBe('indice');
    await expect(page.getByTestId('aide-maths')).toHaveAttribute('data-aide-proposee', 'indice');
    await page.getByRole('button', { name: 'Mettre la partie en pause' }).click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    const pause = (await lireCarnet(page, profilId)).projetSuspendu;
    expect(pause?.instance.id).toBe(premiere.instance.id);
    expect(pause?.projet?.suspendu).toBe(true);
    expect(pause?.aide).toBe('indice');
    expect(pause?.erreursValidees).toBe(1);

    await page.reload();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    await page.locator('[data-vers="mathematiques"]').click();
    // Le carnet rouvre automatiquement l'étape suspendue au montage de l'écran.
    await scene(page, 'MAT-PON-01');
    const restauree = await partieCourante(page, profilId);
    expect(restauree.instance.id).toBe(premiere.instance.id);
    expect(restauree.projet?.sessionId).toBe(sessionId);
    expect(restauree.erreursValidees).toBe(1);
    expect(restauree.aide).toBe('indice');
    await expect(page.getByTestId('aide-maths')).toHaveAttribute('data-aide-proposee', 'indice');
    await expect(longueur.locator('output')).toHaveText(`${String(lue)} cm`);

    for (const id of ['planche-c', 'planche-d']) {
      await geste(page, profilId, () => stockPlanches.getByRole('button', { name: new RegExp(`^${id},`, 'u') }).click());
    }
    const bonnes = mesure.parametres.choix.filter((p) => ['planche-a', 'planche-b'].includes(p.id));
    expect(bonnes.map((p) => p.longueur).reduce((total, n) => total + n, 0)).toBe(mesure.parametres.longueurCible);
    for (const id of ['planche-a', 'planche-b']) {
      await geste(page, profilId, () => stockPlanches.getByRole('button', { name: new RegExp(`^${id},`, 'u') }).click());
    }
    await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
    await expect(page.getByTestId('reussite-maths')).toBeVisible();
    expect((await lireCarnet(page, profilId)).tentatives).toHaveLength(1);
    await page.getByRole('button', { name: 'Continuer la traversée' }).click();

    await scene(page, 'MAT-PON-03');
    const tablier = (await partieCourante(page, profilId)).instance as InstancePont03;
    expect(tablier.id).toBe(plan[1]!.instanceId);
    const a = tablier.parametres.pieces.find((piece) => piece.id === 'module-a')!;
    const b = tablier.parametres.pieces.find((piece) => piece.id === 'module-b')!;
    expect(a.longueur + b.longueur).toBe(tablier.parametres.portee);
    await capture(page, info, `${format.nom}-02-tablier-defi`);
    for (const [piece, depart] of [[a, 0], [b, a.longueur]] as const) {
      await page.getByTestId(`piece-${piece.id}`).click();
      await geste(page, profilId, () => page.getByTestId(`tablier-position-${String(depart)}`).click());
    }
    await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
    await expect(page.getByTestId('reussite-maths')).toBeVisible();
    expect((await lireCarnet(page, profilId)).tentatives).toHaveLength(2);
    await page.getByRole('button', { name: 'Continuer la traversée' }).click();

    await scene(page, 'MAT-PON-02');
    const bornes = (await partieCourante(page, profilId)).instance as InstancePont02;
    expect(bornes.id).toBe(plan[2]!.instanceId);
    await capture(page, info, `${format.nom}-03-bornes-defi`);
    const nombres = page.getByRole('group', { name: 'Nombre à porter' });
    const rive = page.getByRole('group', { name: 'Place sur la rive' });
    for (const valeur of bornes.parametres.bornesAPoser) {
      await nombres.getByRole('button', { name: String(valeur), exact: true }).click();
      await geste(page, profilId,
        () => rive.getByRole('button', { name: `Graduation ${String(valeur)}`, exact: true }).click());
    }
    const encadrement = page.getByRole('group', { name: 'Quels nombres encadrent la borne ?' });
    await encadrement.getByText('Avant', { exact: true }).locator('..').getByRole('button', {
      name: String(bornes.parametres.encadrement.inferieure), exact: true,
    }).click();
    await encadrement.getByText('Après', { exact: true }).locator('..').getByRole('button', {
      name: String(bornes.parametres.encadrement.superieure), exact: true,
    }).click();
    await geste(page, profilId, () => page.getByRole('button', { name: 'Montrer mon encadrement' }).click());
    await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
    await expect(page.getByTestId('reussite-maths')).toBeVisible();

    const fin = await lireCarnet(page, profilId);
    expect(fin.tentatives.map((t) => t.instanceId)).toEqual(plan.map((etape) => etape.instanceId));
    expect(fin.projets.find((p) => p.projetId === 'MAT-PON-P01')?.etapesTerminees).toBe(3);
    expect(fin.recompenses.filter((r) => r.projetId === 'MAT-PON-P01')).toHaveLength(1);
    await expect(page.locator('[data-cadeau="maths-souvenir-ponts"]')).toBeVisible();
    await page.getByRole('button', { name: 'Retour aux Ponts' }).click();
    await expect(page.locator('[data-transformation="ponts-premiere-traversee"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-ecran="mathematiques"]')).toBeVisible();
    await expect.poll(async () => (await lireCarnet(page, profilId)).recompenses
      .filter((r) => r.projetId === 'MAT-PON-P01').length).toBe(1);
    expect(await exportLecture(page, profilId, jeton), 'les trois succès maths laissent le journal lecture identique').toBe(lectureAvant);
  });
}
