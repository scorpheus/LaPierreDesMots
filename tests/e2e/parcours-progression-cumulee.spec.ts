/** La progression d'une vraie sortie compte les exercices joués, même après retour et relance. */
import { test, expect } from './invariants.js';
import { appliquerReglagesLectureReels, choisirLeProfil, etatDuJeu, noeudsLivres } from './qa-outils.js';
import { jalonDom, jouerProchainGesteDom, lireEtatDom, toucherPrise } from './gestes-dom.js';
import type { Page } from '@playwright/test';
import type { EtatMonde } from '@pierre/partage/monde';

test.use({ isMobile: true, hasTouch: true });

const NOEUDS = noeudsLivres();
const REGION = 'clairiere';
const TOTAL_REGION = NOEUDS.filter((noeud) => noeud.region === REGION && noeud.progression).length;

async function verifierProgression(page: Page, profil: string, joues: readonly string[]): Promise<void> {
  await expect.poll(async () => {
    const reponse = await page.request.get(`/api/profils/${encodeURIComponent(profil)}/progression`);
    expect(reponse.ok(), 'le journal est relu par le port public').toBe(true);
    const lignes = await reponse.json() as readonly { noeud: string; etoiles: number }[];
    return lignes.filter((ligne) => ligne.etoiles > 0).map((ligne) => ligne.noeud).sort();
  }, { message: 'aucun exercice absent du parcours réel ne doit être réussi' }).toEqual([...joues].sort());
  const reponseMonde = await page.request.get(`/api/profils/${encodeURIComponent(profil)}/monde`);
  expect(reponseMonde.ok(), 'le monde est relu après la sauvegarde des acquis').toBe(true);
  const monde = await reponseMonde.json() as EtatMonde;
  const regions = [...new Set(NOEUDS.filter((noeud) => noeud.progression).map((noeud) => noeud.region))];
  const terminees = regions.filter((region) => NOEUDS.filter((noeud) => noeud.progression && noeud.region === region)
    .every((noeud) => joues.includes(noeud.id)));
  expect(monde.carte.regions.filter((region) => region.eclatObtenuLe !== null).map((region) => region.region).sort(),
    'seules les régions entièrement jouées donnent leur Éclat').toEqual(terminees.sort());
  expect(monde.gobi.formes.length, 'une forme exige cinq exercices distincts, pas cinq étoiles')
    .toBeLessThanOrEqual(Math.floor(new Set(joues).size / 5));
  if (joues.length < 5) expect(monde.gobi.stade, 'Gobi ne change pas de stade avant sa première forme').toBe('oeuf');
}

async function fermerCelebrationSiPresente(page: Page): Promise<void> {
  const celebration = page.locator('[data-evolution-gobi]');
  if (await celebration.isVisible()) {
    await toucherPrise(celebration);
    await expect(celebration, 'le tap réel ferme la célébration').toHaveCount(0);
  }
}

async function partirDepuisCarte(page: Page): Promise<void> {
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await toucherPrise(page.locator(`[data-depart="${REGION}"]`));
  await expect(page.locator(`[data-choix-compagnon="${REGION}"]`)).toBeVisible();
  await toucherPrise(page.locator('[data-choisir-compagnon="gobi"]'));
  await toucherPrise(page.locator('[data-confirmer-depart]'));
  await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-test-pret', 'oui');
  await expect(page.locator('[data-progression-sortie]')).toContainText('Exercice 1 sur');
}

async function terminerExerciceAuDoigt(page: Page): Promise<string> {
  const ecran = page.locator('[data-ecran="noeud"]');
  await expect(ecran).toHaveAttribute('data-test-pret', 'oui');
  const id = await ecran.getAttribute('data-noeud');
  const fiche = NOEUDS.find((noeud) => noeud.id === id);
  expect(fiche, 'le parcours atteint un exercice publié de la région demandée').toBeDefined();
  expect(fiche!.region).toBe(REGION);
  let gestes = 0;
  for (; gestes < 256; gestes += 1) {
    const racine = page.locator(`[data-moteur="${fiche!.moteur}"]`);
    if (await racine.count() === 0 || await racine.getAttribute('data-termine') === 'oui') break;
    const avant = jalonDom(await lireEtatDom(page));
    await jouerProchainGesteDom(page, fiche!.moteur, gestes);
    await expect.poll(async () => await racine.count() === 0 ? 'sortie' : jalonDom(await lireEtatDom(page)),
      { message: `${id} : le geste natif fait avancer l'exercice` }).not.toBe(avant);
  }
  expect(gestes).toBeGreaterThan(0);
  expect(gestes).toBeLessThan(256);
  await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
  return id!;
}

test('deux exercices réels, retour carte et relance : deux acquis exacts et un nouveau départ inédit', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'ProgressionCumulee';
  await appliquerReglagesLectureReels(page, prenom);
  await choisirLeProfil(page, prenom);
  const profil = (await etatDuJeu(page)).profil;
  expect(profil).not.toBeNull();
  expect(TOTAL_REGION, 'la région doit encore offrir plusieurs exercices inédits après deux réussites').toBeGreaterThan(3);
  await verifierProgression(page, profil!, []);
  // L'oracle lit les réponses, mais aucun raccourci ne doit choisir ou réussir un nœud.
  await page.evaluate(() => {
    const crochets = (window as unknown as { __test: { repondre: () => never; allerAuNoeud: () => never } }).__test;
    crochets.repondre = () => { throw new Error('Progression cumulée : réponse injectée interdite'); };
    crochets.allerAuNoeud = () => { throw new Error('Progression cumulée : entrée directe interdite'); };
  });
  await partirDepuisCarte(page);
  const totalSortie = await page.locator('[data-ecran="noeud"]').getAttribute('data-sortie-total');
  expect(Number(totalSortie)).toBeGreaterThanOrEqual(2);
  const joues: string[] = [];
  for (let rang = 1; rang <= 2; rang += 1) {
    await expect(page.locator('[data-progression-sortie]')).toHaveText(`Exercice ${rang} sur ${totalSortie}`);
    const id = await terminerExerciceAuDoigt(page);
    expect(joues, 'la sortie ne recompte pas un exercice déjà joué').not.toContain(id);
    joues.push(id);
    await verifierProgression(page, profil!, joues);
    await expect(page.locator('[data-progression-regionale]')).toContainText(
      `${rang} ${rang === 1 ? 'exercice terminé' : 'exercices terminés'} sur ${TOTAL_REGION}`,
    );
    await fermerCelebrationSiPresente(page);
    if (rang === 1) await toucherPrise(page.locator('[data-action="exercice-suivant"]'));
  }
  await toucherPrise(page.locator('[data-action="voir-carte"]'));
  await expect(page.locator('[data-prochain-deblocage]')).toContainText(`Il reste ${TOTAL_REGION - 2} exercices`);
  await verifierProgression(page, profil!, joues);
  await page.reload();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await expect(page.locator('[data-prochain-deblocage]')).toContainText(`Il reste ${TOTAL_REGION - 2} exercices`);
  await verifierProgression(page, profil!, joues);
  await partirDepuisCarte(page);
  const nouveau = await page.locator('[data-ecran="noeud"]').getAttribute('data-noeud');
  expect(joues, 'un nouveau départ privilégie les exercices encore inédits').not.toContain(nouveau);
  await verifierProgression(page, profil!, joues);
});
