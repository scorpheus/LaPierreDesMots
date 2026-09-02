/**
 * LE CHAUDRON MÈNE QUELQUE PART — R25, et le garde de toute une classe de défauts.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « Le chaudron dans le campement devrait fonctionner directement, je ne sais pas ce qu'il attend,
 * ce qu'il mijote. »
 *
 * Il n'attendait rien : `surOuvrirChaudron` était déclaré sur `EcranCampement`, relayé jusqu'au
 * bouton de `Chaudron.tsx`, et **jamais fourni** par `HoteCampement`. Le composant retombait alors
 * sur son message d'attente — « Le chaudron mijote encore » — que le père a lu mot pour mot.
 *
 * ── CE QUE CE FICHIER GARDE, ET POURQUOI IL FALLAIT PLUS QU'UN CLIC ───────────────────────────
 * Recensé par OBJET et non par occurrence (`bac-a-sable/rappels-morts/auditer.mjs`) :
 *
 *     27 rappels optionnels déclarés sur 21 composants
 *      7 ne sont fournis NULLE PART — autant de boutons qui ne font rien
 *
 * Le père en a trouvé deux en jouant, à des semaines d'intervalle. Aucun test ne pouvait les
 * voir : chaque recette injecte elle-même les rappels dont elle a besoin, donc **aucune ne
 * traverse le câblage réel du routeur**. C'est le défaut « champ déclaré, câblé jusqu'à la
 * sortie, jamais affecté », et il est invisible au compilateur comme à la relecture.
 *
 * Ce fichier passe donc par le CHEMIN DE L'ENFANT — profil, campement, tap — sans injecter quoi
 * que ce soit, et exige d'arriver dans un nœud.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync } from "node:fs";

import { expect, test } from "./invariants.js";

import { choisirLeProfil, preparer } from "./qa-outils.js";

/** Ce que le CONTENU déclare, relu ici : le garde ne réinvente pas la destination. */
const CAMPEMENT = JSON.parse(
  readFileSync(new URL("../../contenu/monde/campement.json", import.meta.url), "utf8"),
) as { readonly coloriageLibre?: string };

test.describe("R25 — le chaudron ouvre le coloriage libre", () => {
  test("LE CONTENU DÉCLARE UNE DESTINATION — sans quoi tout le reste est sans objet", () => {
    // Contrôle positif du fichier : si le contenu perd sa déclaration, le chaudron redevient
    // muet et les cas suivants passeraient en testant un bouton absent.
    expect(
      CAMPEMENT.coloriageLibre,
      "`contenu/monde/campement.json` ne déclare plus `coloriageLibre` : le chaudron n’a " +
        "plus de destination et retombera sur « Le chaudron mijote encore »",
    ).toBeTruthy();
  });

  test("LE DÉFAUT CORRIGÉ — taper le chaudron mène à un nœud, par le chemin de l’enfant", async ({
    page,
  }) => {
    // AUCUNE injection : ni `surOuvrirChaudron`, ni `allerAuNoeud`. C'est précisément le
    // câblage du routeur qui manquait, donc c'est lui qu'il faut traverser.
    await preparer(page);
    await choisirLeProfil(page);
    await page.locator('[data-vers="campement"]').click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();

    const chaudron = page.locator("[data-chaudron] button");
    await expect(chaudron, "le chaudron n’offre aucun bouton").toBeVisible();
    await chaudron.click();

    await expect(
      page.locator('[data-ecran="noeud"]'),
      "taper le chaudron n’a mené nulle part : c’est exactement le défaut de R25, " +
        "un rappel déclaré et jamais fourni",
    ).toBeVisible();
  });

  test("et c’est bien un coloriage SANS consigne — la sortie de secours, pas un exercice de plus", async ({
    page,
  }) => {
    // « La sortie de secours est toujours à un tap : le chaudron de coloriage libre, sans
    // culpabilité » (v2 § 5.4). Un chaudron qui ouvrirait un exercice à valider ne serait pas
    // une sortie de secours, ce serait un piège de plus.
    await preparer(page);
    await choisirLeProfil(page);
    await page.locator('[data-vers="campement"]').click();
    await page.locator("[data-chaudron] button").click();
    await expect(page.locator('[data-moteur="libre"]')).toBeVisible();
  });

  test("AUCUN écran d’échec sur ce chemin (R14)", async ({ page }) => {
    await preparer(page);
    await choisirLeProfil(page);
    await page.locator('[data-vers="campement"]').click();
    await page.locator("[data-chaudron] button").click();
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    const texte = ((await page.locator("body").textContent()) ?? "").toLowerCase();
    for (const interdit of ["erreur", "raté", "échec", "perdu", "mijote encore"]) {
      expect(texte, `« ${interdit} » n’a rien à faire sur la sortie de secours`).not.toContain(
        interdit,
      );
    }
  });
});
