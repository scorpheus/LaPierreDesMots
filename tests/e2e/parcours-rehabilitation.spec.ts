/** Deux parcours vécus, avec serveur et base en mémoire propres à chaque cas. */
import type { Locator, Page, Response } from '@playwright/test';
import type { EtatMonde, ReponseTentative } from '@pierre/partage';
import { expect, test } from './invariants.js';
import { CIBLE_MINIMALE_PX, appliquerReglagesLectureReels, etatDuJeu, noeudsLivres } from './qa-outils.js';
import { jalonDom, jouerProchainGesteDom, lireEtatDom, toucherPrise } from './gestes-dom.js';

test.use({ isMobile: true, hasTouch: true });

const NOEUDS = noeudsLivres();
const REGION = 'clairiere';

function observerReseau(page: Page): { erreurs: string[]; sauvegardes: Response[] } {
  const suivi = { erreurs: [] as string[], sauvegardes: [] as Response[] };
  // Posé après la création du profil : aucune requête volontairement invalide dans le parcours.
  page.on('response', (reponse) => {
    if (reponse.status() >= 400) suivi.erreurs.push(`${reponse.status()} ${reponse.url()}`);
    if (reponse.request().method() === 'POST' && new URL(reponse.url()).pathname === '/api/tentatives') {
      suivi.sauvegardes.push(reponse);
    }
  });
  return suivi;
}

async function interdireRaccourcis(page: Page): Promise<void> {
  await page.evaluate(() => {
    const crochets = (window as unknown as { __test: {
      repondre: (reponse: unknown) => void;
      allerAuNoeud: (id: string) => Promise<void>;
      sauterAnimations: () => void;
    } }).__test;
    crochets.repondre = () => { throw new Error('Réhabilitation : une réponse doit venir du geste réel.'); };
    crochets.allerAuNoeud = () => { throw new Error('Réhabilitation : un exercice doit être atteint depuis la carte.'); };
    crochets.sauterAnimations();
  });
}

async function verifierCommande(commande: Locator): Promise<void> {
  await expect(commande).toHaveCount(1);
  await expect(commande).toBeVisible();
  await expect(commande).toBeEnabled();
  await commande.scrollIntoViewIfNeeded();
  await commande.tap({ trial: true });
  const geometrie = await commande.evaluate((element) => ({
    boite: element.getBoundingClientRect().toJSON(),
    cadre: { largeur: innerWidth, hauteur: innerHeight },
    defilement: { x: scrollX, y: scrollY }
  }));
  await expect(commande, `la commande entre entièrement dans le cadre après défilement : ${JSON.stringify(geometrie)}`).toBeInViewport({ ratio: 1 });
  const cadre = await commande.boundingBox();
  expect(cadre).not.toBeNull();
  expect(cadre!.width).toBeGreaterThanOrEqual(CIBLE_MINIMALE_PX);
  expect(cadre!.height).toBeGreaterThanOrEqual(CIBLE_MINIMALE_PX);
}

async function verifierScene(scene: Locator): Promise<void> {
  await expect(scene).toBeVisible();
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(async () => scene.evaluate((element) => {
    const cadre = element.getBoundingClientRect();
    const gauche = Math.max(0, cadre.left);
    const droite = Math.min(innerWidth, cadre.right);
    const haut = Math.max(0, cadre.top);
    const bas = Math.min(innerHeight, cadre.bottom);
    if (droite <= gauche || bas <= haut) return false;
    const dessus = document.elementFromPoint((gauche + droite) / 2, (haut + bas) / 2);
    return dessus !== null && (dessus === element || element.contains(dessus));
  }), { message: 'le centre visible de la scène appartient au jeu, sans panneau devant lui' }).toBe(true);
  await expect.poll(async () => scene.locator('img').evaluateAll((images) => images.filter((image) => {
    const cadre = image.getBoundingClientRect();
    const visible = cadre.width > 0 && cadre.height > 0 && cadre.bottom > 0 && cadre.top < innerHeight;
    return visible && (!(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0);
  }).map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src)),
  { message: 'les illustrations visibles sont effectivement chargées' }).toEqual([]);
}

async function lireMonde(page: Page, profil: string): Promise<EtatMonde> {
  const reponse = await page.request.get(`/api/profils/${encodeURIComponent(profil)}/monde`);
  expect(reponse.ok()).toBe(true);
  return await reponse.json() as EtatMonde;
}

async function verifierAcquis(page: Page, profil: string, attendus: readonly string[]): Promise<void> {
  await expect.poll(async () => {
    const reponse = await page.request.get(`/api/profils/${encodeURIComponent(profil)}/progression`);
    expect(reponse.ok()).toBe(true);
    const lignes = await reponse.json() as readonly { noeud: string; etoiles: number }[];
    return lignes.filter((ligne) => ligne.etoiles > 0).map((ligne) => ligne.noeud).sort();
  }, { message: 'seuls les exercices réellement terminés sont acquis' }).toEqual([...attendus].sort());
}

async function choisirProfilAuCampement(page: Page, prenom: string): Promise<string> {
  await appliquerReglagesLectureReels(page, prenom);
  const profil = page.locator('[data-profil]').filter({ hasText: prenom });
  await expect(profil).toHaveCount(1);
  const identifiant = await profil.getAttribute('data-profil');
  expect(identifiant).not.toBeNull();
  await interdireRaccourcis(page);
  await toucherPrise(profil);
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect.poll(async () => (await etatDuJeu(page)).profil).toBe(identifiant);
  await verifierAcquis(page, identifiant!, []);
  expect((await lireMonde(page, identifiant!)).cascade?.etoilesTotal).toBe(0);
  return identifiant!;
}

async function ouvrirRegionDepuisCampement(page: Page): Promise<Locator> {
  const campement = page.locator('[data-ecran="campement"]');
  await verifierScene(campement.locator('[data-scene="campement"]'));
  await toucherPrise(campement.locator('[data-vers="carte"]'));
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await verifierScene(page.locator('[data-scene-adaptative="carte"]'));
  await toucherPrise(page.locator(`[data-region="${REGION}"] [role="button"]`));
  const region = page.locator(`[data-vue-region="${REGION}"]`);
  await expect(region).toBeVisible();
  await verifierScene(region.locator(`[data-region-scene="${REGION}"]`));
  return region;
}

async function partirDeRegion(page: Page, region: Locator): Promise<void> {
  await toucherPrise(region.locator(`[data-depart="${REGION}"]`));
  const choix = page.locator('[data-choix-compagnon]');
  await expect(choix).toBeVisible();
  await toucherPrise(choix.locator('[data-choisir-compagnon="gobi"]'));
  await expect(choix.locator('[data-choisir-compagnon="gobi"]')).toHaveAttribute('aria-pressed', 'true');
  await toucherPrise(choix.locator('[data-confirmer-depart]'));
  await expect(choix).toHaveCount(0);
  await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-test-pret', 'oui');
}

async function terminerParLesGestes(page: Page): Promise<string> {
  const ecran = page.locator('[data-ecran="noeud"]');
  await expect(ecran).toHaveAttribute('data-test-pret', 'oui');
  await expect(ecran).toHaveAttribute('data-journalise', 'oui');
  const id = await ecran.getAttribute('data-noeud');
  const fiche = NOEUDS.find((noeud) => noeud.id === id);
  expect(fiche, 'le parcours atteint un véritable exercice publié').toBeDefined();
  expect(fiche!.region).toBe(REGION);
  expect(fiche!.progression).toBe(true);
  await verifierCommande(ecran.locator('[data-vers="carte"]'));
  await verifierCommande(ecran.locator('.barre-consigne [data-action="ecouter"]'));
  await verifierCommande(ecran.locator('.gobi [data-action="aide"]'));
  await verifierScene(ecran.locator('.scene-noeud'));
  const moteur = ecran.locator(`[data-moteur="${fiche!.moteur}"]`);
  let gestes = 0;
  for (; gestes < 256; gestes += 1) {
    if (await moteur.count() === 0 || await moteur.getAttribute('data-termine') === 'oui') break;
    const avant = jalonDom(await lireEtatDom(page));
    await jouerProchainGesteDom(page, fiche!.moteur, gestes);
    await expect.poll(async () => await moteur.count() === 0 ? 'récompense' : jalonDom(await lireEtatDom(page)),
      { message: `${id} : le geste natif produit l'avancement attendu` }).not.toBe(avant);
  }
  expect(gestes, 'le moteur a reçu de vrais gestes').toBeGreaterThan(0);
  expect(gestes, 'l’exercice se termine sans boucle indéfinie').toBeLessThan(256);
  await expect(page.locator('[data-ecran="recompense"]')).toHaveAttribute('data-fin', 'reussite');
  await verifierCommande(page.locator('[data-action="voir-carte"]'));
  return id!;
}

async function lireSauvegarde(sauvegardes: readonly Response[], rang: number, noeud: string): Promise<ReponseTentative> {
  await expect.poll(() => sauvegardes.length).toBe(rang + 1);
  const reponse = sauvegardes[rang]!;
  expect(reponse.status(), 'chaque partie jouée produit une nouvelle tentative, pas un doublon idempotent').toBe(201);
  const resultat = await reponse.json() as ReponseTentative;
  expect(resultat.deja).toBe(false);
  expect(resultat.tentative.noeud).toBe(noeud);
  return resultat;
}

test('téléphone : profil, campement, monde, région, activité jouée et vrai retour au campement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const profil = await choisirProfilAuCampement(page, 'RehabilitationTelephone');
  const reseau = observerReseau(page);
  const region = await ouvrirRegionDepuisCampement(page);
  await partirDeRegion(page, region);
  await verifierAcquis(page, profil, []);
  const noeud = await terminerParLesGestes(page);
  const resultat = await lireSauvegarde(reseau.sauvegardes, 0, noeud);
  expect(resultat.gainCascade.etat.etoilesTotal).toBe(1);
  await verifierAcquis(page, profil, [noeud]);
  await toucherPrise(page.locator('[data-action="voir-carte"]'));
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await toucherPrise(page.locator('[data-ecran="carte"] [data-vers="campement"]'));
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await verifierAcquis(page, profil, [noeud]);
  expect((await lireMonde(page, profil)).cascade?.etoilesTotal).toBe(1);
  expect(reseau.erreurs, 'aucune ressource ni requête du parcours ne rend 4xx ou 5xx').toEqual([]);
});

test('tablette : rechargement, même profil, revisite réellement jouée et aucun crédit supplémentaire', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  const profil = await choisirProfilAuCampement(page, 'RehabilitationReprise');
  const reseau = observerReseau(page);
  await partirDeRegion(page, await ouvrirRegionDepuisCampement(page));
  const noeud = await terminerParLesGestes(page);
  await lireSauvegarde(reseau.sauvegardes, 0, noeud);
  await verifierAcquis(page, profil, [noeud]);
  const mondeAcquis = await lireMonde(page, profil);
  expect(mondeAcquis.cascade?.etoilesTotal).toBe(1);

  // Aucun preparer/chargerProfil après ce point : le même contexte et la même base survivent.
  await page.reload();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect.poll(async () => (await etatDuJeu(page)).profil).toBe(profil);
  await interdireRaccourcis(page);
  await verifierAcquis(page, profil, [noeud]);
  expect(await lireMonde(page, profil)).toEqual(mondeAcquis);
  const region = await ouvrirRegionDepuisCampement(page);
  await expect(region.locator(`[data-lieu="${noeud}"]`)).toHaveAttribute('data-etat-lieu', 'acquis');
  await toucherPrise(region.locator(`[data-revisiter="${noeud}"]`));
  await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-noeud', noeud);
  expect(await terminerParLesGestes(page)).toBe(noeud);
  const rejouee = await lireSauvegarde(reseau.sauvegardes, 1, noeud);
  expect(rejouee.gainCascade.paliersFranchis).toEqual([]);
  expect(rejouee.gainCascade.recompenses).toEqual([]);
  await verifierAcquis(page, profil, [noeud]);
  expect(await lireMonde(page, profil)).toEqual(mondeAcquis);

  await toucherPrise(page.locator('[data-action="voir-carte"]'));
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await toucherPrise(page.locator(`[data-region="${REGION}"] [role="button"]`));
  await partirDeRegion(page, page.locator(`[data-vue-region="${REGION}"]`));
  await expect(page.locator('[data-ecran="noeud"]')).not.toHaveAttribute('data-noeud', noeud);
  await verifierAcquis(page, profil, [noeud]);
  await toucherPrise(page.locator('[data-ecran="noeud"] [data-vers="carte"]'));
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await verifierAcquis(page, profil, [noeud]);
  expect(await lireMonde(page, profil)).toEqual(mondeAcquis);
  expect(reseau.sauvegardes, 'ouvrir puis quitter un exercice ne fabrique pas une réussite').toHaveLength(2);
  expect(reseau.erreurs, 'le rechargement et la reprise ne demandent aucune ressource absente').toEqual([]);
});
