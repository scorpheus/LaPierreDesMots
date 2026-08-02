/**
 * LA SECONDE IMPASSE — la zone parent atteinte **sans profil choisi**, c'est-à-dire par le seul
 * chemin qu'un humain emprunte.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE FAIT MESURÉ, et pourquoi aucun test ne le voyait.
 *
 * La porte de la zone parent est en pied de `EcranProfils` (`data-acces-parent`), donc
 * **avant** qu'un profil ne soit choisi. `client/src/routeur.tsx` rendait alors, sur
 * `/parent/dashboard` :
 *
 *   if (profil === null) {
 *     return <EcranCodeParent surOuverture={() => undefined} surAbandon={() => undefined} />;
 *   }
 *
 * — un pavé numérique dont les **deux** boutons de sortie ne font rien, et un dashboard qui
 * n'apparaît jamais. C'est le « c'est quoi le code pour aller sur l'espace parent et à quoi il
 * sert ? » du retour du père : il a tapé un code, et il est retombé sur le même pavé.
 *
 * `tests/e2e/parcours-parent.spec.ts` et `tests/qualite/a11y-parent.spec.ts` ne pouvaient pas
 * l'attraper : tous deux appellent `window.__test.chargerProfil()` avant d'ouvrir la porte, et
 * ce crochet appelle `choisirProfil` (`client/src/testabilite/crochets.ts:182`). `profil` n'y
 * est donc **jamais** `null`. Ce fichier est le seul qui n'appelle pas `chargerProfil` — c'est
 * toute sa raison d'être, et c'est aussi pour cela qu'il est un fichier à part.
 *
 * `parcours-issues-de-secours.spec.ts` ne l'attrape pas non plus, et il le dit lui-même : il
 * exclut la zone parent parce que son verrou est un état SERVEUR partagé par la campagne.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠ ORDRE D'EXÉCUTION, mesuré et rendu explicite plutôt que subi.
 *
 * Le verrou parent est GLOBAL et vit dans la base `:memory:` du serveur unique lancé par
 * `playwright.config.ts` ; aucun test ne peut le lever (il tient 15 minutes d'horloge serveur).
 * Or `parcours-parent.spec.ts` **laisse la zone verrouillée** — c'est l'objet de son contrat de
 * sortie. Ce fichier doit donc passer AVANT lui, ce que l'ordre alphabétique des fichiers
 * donne (`parcours-parent-sans-profil` < `parcours-parent`, `-` = 0x2D avant `.` = 0x2E).
 *
 * Cette dépendance n'est pas laissée implicite : le premier geste de chaque cas est de poser le
 * code du foyer **par requête**, et d'exiger un 200. Si l'ordre changeait un jour, ce fichier
 * échouerait en nommant la cause au lieu d'échouer sur une assertion d'écran incompréhensible.
 */
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Le même code du foyer que `parcours-parent.spec.ts` : un seul code existe par base. */
const CODE = '4271';

interface CrochetsTest {
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/**
 * Démarre l'application **sans choisir de profil** — exactement l'état dans lequel le père a
 * tapé sur « Espace des parents ». Aucun `chargerProfil` ici, sciemment.
 */
async function demarrerSansProfil(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
  await page.evaluate(
    ({ graine, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
    },
    { graine: GRAINE, instant: INSTANT }
  );
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
}

async function taperCode(page: Page, code: string): Promise<void> {
  for (const chiffre of code) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
}

test.describe('la zone parent, atteinte sans profil choisi', () => {
  test('le code accepté mène à un écran utilisable, jamais au même pavé', async ({
    page,
    request
  }) => {
    // Un joueur EXISTE côté serveur — mais aucun n'est choisi dans le magasin. C'est la
    // différence exacte entre ce cas et `parcours-parent.spec.ts`.
    const creation = await request.post('/api/profils', {
      data: { prenom: 'Suivi', paletteVariante: 'clairiere' }
    });
    expect([200, 201], 'un joueur doit exister pour qu’il y ait un suivi à montrer').toContain(
      creation.status()
    );

    // MODIFIÉ N5 — le code se POSE désormais par `POST /api/parent/definir` ; `ouvrir` ne le
    // pose plus (contrat de finition v3 § 1.8 et § 8). Le 409 est accepté : un autre fichier
    // de la campagne a pu poser le même code avant celui-ci, et ce préambule ne doit dépendre
    // d'aucun ordre de passage. Aucune assertion du fichier n'est touchée.
    const pose = await request.post('/api/parent/definir', { data: { code: CODE } });
    expect(
      [200, 409],
      'la zone parent doit être ouvrable ici — voir l’ordre en tête'
    ).toContain(pose.status());

    await demarrerSansProfil(page);
    await page.locator('[data-acces-parent="oui"]').click();
    await expect(page.locator('[data-parent="code"]')).toBeVisible();

    await taperCode(page, CODE);

    // L'ASSERTION QUI GARDE LE DÉFAUT : après un code juste, on n'est plus sur le pavé.
    await expect(
      page.locator('[data-parent="code"]'),
      'un code accepté ne doit jamais rendre le même pavé numérique'
    ).toHaveCount(0);
    await expect(page.locator('[data-parent="choix-profil"]')).toBeVisible();

    // Et cet écran MÈNE quelque part : c'est la règle 3, pas seulement l'absence de pavé.
    await page.locator('[data-suivre-profil]').first().click();
    await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();
  });

  test('CONTRAT DE SORTIE : la sortie vers le jeu existe et fonctionne', async ({
    page,
    request
  }) => {
    // MODIFIÉ N5 — le code se POSE désormais par `POST /api/parent/definir` ; `ouvrir` ne le
    // pose plus (contrat de finition v3 § 1.8 et § 8). Le 409 est accepté : un autre fichier
    // de la campagne a pu poser le même code avant celui-ci, et ce préambule ne doit dépendre
    // d'aucun ordre de passage. Aucune assertion du fichier n'est touchée.
    const pose = await request.post('/api/parent/definir', { data: { code: CODE } });
    expect(
      [200, 409],
      'la zone parent doit être ouvrable ici — voir l’ordre en tête'
    ).toContain(pose.status());

    await demarrerSansProfil(page);
    await page.locator('[data-acces-parent="oui"]').click();
    await taperCode(page, CODE);
    await expect(page.locator('[data-parent="choix-profil"]')).toBeVisible();

    // Le compte qui échouerait si l'écran était creux : au moins une sortie, ET elle marche.
    const sorties = page.locator('[data-parent="choix-profil"] button:visible');
    expect(
      await sorties.count(),
      'l’écran de choix doit offrir au moins le retour au jeu'
    ).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Retour au jeu' }).click();
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  });
});
