/**
 * R18 au campement — **« ça se comprend sans qu'un adulte explique quoi que ce soit »**, et
 * ici : sans qu'une ligne de texte soit lue. Lot N6, contrat de finition v3 § 4.6.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * LE FAIT QUI COMMANDE CE FICHIER : « Le père n'a pas compris le campement. »
 *
 * Ce n'est pas une opinion sur le décor, c'est un défaut d'interface — et un défaut
 * d'interface se mesure. La mesure retenue est la plus dure que je puisse écrire sans devenir
 * subjective : **on masque tout le texte de la page, et on vérifie qu'il reste, pour chaque
 * destination, un pictogramme visible d'au moins 24 px.** Une barre de trois mots posés côte à
 * côte — ce qu'était le campement avant N6 — tombe à zéro pictogramme et échoue ici.
 *
 * Ce que ce test NE prétend pas prouver : que le campement est joli, ni qu'il est amusant.
 * Il prouve qu'aucune de ses sorties ne dépend de la lecture. C'est exactement R18, et c'est
 * le seul aspect de « le père n'a pas compris » qui soit mécanique.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Côté minimal d'un pictogramme pour qu'il tienne lieu de mot, en px CSS. */
const PICTOGRAMME_MIN_PX = 24;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

async function preparer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
  await page.evaluate(
    async ({ fixture, graine, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT }
  );
}

async function allerAuCampement(page: Page): Promise<void> {
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await page.locator('[data-vers="campement"]').click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect(page.locator('[data-interaction="libre"]').first()).toBeVisible();
}

test.describe('R18 — le campement se comprend sans lire', () => {
  test('chaque destination porte un pictogramme, et il survit à l’effacement du texte', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    // On efface le texte comme le ferait un enfant qui ne déchiffre pas : la couleur du texte
    // devient transparente PARTOUT. Les pictogrammes, eux, sont des glyphes rendus dans un
    // `aria-hidden` dont on force la couleur — donc ils restent, et eux seuls.
    await page.addStyleTag({
      content: `
        [data-ecran="campement"] * { color: transparent !important; }
        [data-ecran="campement"] [data-pictogramme] > *,
        [data-ecran="campement"] [data-pictogramme] { color: #000 !important; }
      `
    });

    const sorties = page.locator('[data-campement-sorties="oui"] .cible');
    const nbSorties = await sorties.count();
    expect(nbSorties, 'le campement doit offrir au moins la carte et le coffre').toBeGreaterThanOrEqual(2);

    const sansPictogramme: string[] = [];
    for (let rang = 0; rang < nbSorties; rang += 1) {
      const sortie = sorties.nth(rang);
      const marque = await sortie.getAttribute('data-pictogramme');
      const nom = (await sortie.getAttribute('aria-label')) ?? `sortie ${String(rang)}`;
      if (marque === null || marque === '') {
        sansPictogramme.push(nom);
        continue;
      }
      // Le glyphe est-il RENDU, et assez gros pour tenir lieu de mot ?
      const glyphe = sortie.locator('[aria-hidden="true"]').first();
      const boite = await glyphe.boundingBox();
      if (boite === null || boite.width < PICTOGRAMME_MIN_PX || boite.height < PICTOGRAMME_MIN_PX) {
        sansPictogramme.push(`${nom} (glyphe trop petit)`);
      }
    }

    console.log(
      `[N6] R18 campement : ${String(nbSorties)} sortie(s), ` +
        `${String(nbSorties - sansPictogramme.length)} avec pictogramme rendu ≥ ` +
        `${String(PICTOGRAMME_MIN_PX)} px`
    );
    expect(sansPictogramme).toEqual([]);
  });

  test('chaque destination porte un nom accessible — le pictogramme ne remplace pas l’a11y', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    const sorties = page.locator('[data-campement-sorties="oui"] .cible');
    const nb = await sorties.count();
    const anonymes: number[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const nom = await sorties.nth(rang).getAttribute('aria-label');
      if (nom === null || nom.trim() === '') {
        anonymes.push(rang);
      }
    }
    expect(anonymes).toEqual([]);
  });

  test('les pictogrammes sont TOUS différents — deux sorties identiques n’aident personne', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    // Le GLYPHE seul, pas le libellé du bouton : c'est lui qui doit distinguer les sorties
    // quand on ne lit pas. Comparer le texte entier ferait passer trois boutons au même
    // pictogramme, du seul fait que leurs mots diffèrent — l'assertion serait creuse.
    const marques = await page
      .locator('[data-campement-sorties="oui"] [data-pictogramme] [aria-hidden="true"]')
      .evaluateAll((noeuds) =>
        noeuds.map((noeud) => (noeud.textContent ?? '').trim()).filter((texte) => texte !== '')
      );

    console.log(`[N6] pictogrammes de sortie : ${marques.join(' ')}`);
    expect(marques.length).toBeGreaterThanOrEqual(2);
    expect(new Set(marques).size).toBe(marques.length);
  });

  test('l’étagère montre ses cases VIDES — c’est ce qui donne envie de revenir (D44)', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    const etagere = page.locator('[data-ecran="campement"] [data-etagere="oui"]');
    await expect(etagere).toBeVisible();

    const total = Number(await etagere.getAttribute('data-cases-total'));
    const obtenues = Number(await etagere.getAttribute('data-cases-obtenues'));
    const vides = Number(await etagere.getAttribute('data-cases-vides'));
    const rendues = await page.locator('[data-ecran="campement"] [data-case-etagere]').count();

    console.log(
      `[N6] étagère au campement : total=${String(total)} obtenues=${String(obtenues)} ` +
        `vides=${String(vides)} rendues=${String(rendues)}`
    );

    // La propriété qui fait tout : aucune case n'est absente de la liste.
    expect(rendues).toBe(total);
    expect(obtenues + vides).toBe(total);
    // Un profil neuf n'a rien gagné : ce sont donc les cases VIDES qui portent tout l'écran.
    expect(vides).toBeGreaterThan(0);
    expect(await page.locator('[data-obtenue="non"]').first().isVisible()).toBe(true);
  });

  test('l’étagère ne cadenasse rien et ne peut rien rater — R14', async ({ page }) => {
    await preparer(page);
    await allerAuCampement(page);

    const cases = page.locator('[data-ecran="campement"] [data-case-etagere]');
    expect(await cases.count()).toBeGreaterThan(0);
    expect(await page.locator('[data-verrou]').count()).toBe(0);
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);

    // Chaque case est réellement peinte : une case « visible » de 0 px ne montre aucun vide.
    const boite = await cases.first().boundingBox();
    expect(boite).not.toBeNull();
    expect(boite!.height).toBeGreaterThan(0);
  });
});
