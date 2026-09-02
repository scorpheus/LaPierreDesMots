/**
 * Les polices de lecture disponibles, capturées — lot L2-B, T4, annexe T § 4.
 *
 * CE FICHIER PORTE LE CHIFFRE DE SORTIE DU LOT (contrat des features v2 § 10.4) :
 * **le nombre de requêtes réseau sortantes pendant leur rendu, et il doit
 * valoir zéro** (v2 § 9.3, « aucun appel à Google Fonts »). C'est le seul endroit du projet
 * où cette promesse est mesurée plutôt qu'affirmée — et c'est une promesse qui compte, parce
 * qu'une police servie par un CDN est une police absente le jour où le PC n'a plus internet,
 * c'est-à-dire un texte que l'enfant ne peut plus lire.
 *
 * Ce que les captures attrapent, et que rien d'autre n'attrape :
 *   • le DÉBORDEMENT en OpenDyslexic (annexe T § T4). Elle est nettement plus large qu'Andika
 *     à corps égal ; un cadre dimensionné sur Andika déborde sans qu'aucun test de composant
 *     ne s'en aperçoive — happy-dom ne met rien en page.
 *   • le REPLI silencieux. Si un WOFF2 manque, la capture montre la pile système et diverge de
 *     sa référence. C'est voulu : une police absente ne doit pas passer inaperçue.
 *
 * La matrice des polices vient des MÉTADONNÉES du projet `visuel`
 * (`playwright.config.ts`), et non d'une liste recopiée ici : un ajout de police doit se voir
 * dans le diff de la configuration.
 *
 * Aucune attente de durée. On attend `document.fonts.ready` et un état du DOM.
 */
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas — base `:memory:` vierge, `Alea`
// rembobiné, port réservé par le noyau. C’est lui qui remplace le `webServer` unique de
// `playwright.config.ts`, et c’est lui qui rend `fullyParallel` légitime.
import { expect, test } from "../harnais-serveur.js";

import type { Page, Request } from "@playwright/test";

/** Le texte capturé. Deux lignes, du vocabulaire CE1, et les quatre lettres miroir de D23. */
const TEXTE = "Le petit dragon boit\nde la belle eau du puits.";

/** Les polices disponibles, lues dans la configuration. Jamais recopiées. */
function policesDuProjet(): readonly string[] {
  const brut = (test.info().project.metadata as { polices?: unknown }).polices;
  if (!Array.isArray(brut) || brut.length === 0) {
    throw new Error(
      "Le projet `visuel` de `playwright.config.ts` ne déclare aucune police : la matrice " +
        "des polices est vide, et ce fichier ne mesurerait plus rien.",
    );
  }
  return brut as readonly string[];
}

/**
 * Monte une `ZoneDeLecture` isolée dans la page.
 *
 * Le client réel n'expose pas encore d'écran qui affiche cette zone en plein — le routeur est
 * possédé par L2-F, et l'écran de réglages est atteint depuis une carte de profil. On monte
 * donc la zone dans une page nue, avec la MÊME feuille de style et les MÊMES `@font-face` que
 * le client bâti : c'est la police et la mise en page qu'on veut photographier, pas le
 * chemin de navigation, qui est le travail de `parcours-*`.
 */
async function monterZone(page: Page, police: string): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ police: codePolice, texte }) => {
      const PILES: Record<string, string> = {
        andika: '"Andika", "Atkinson Hyperlegible", Verdana, system-ui, sans-serif',
        opendyslexic: '"OpenDyslexic", "Andika", system-ui, sans-serif',
        verdana: 'Verdana, "Andika", system-ui, sans-serif',
      };

      const ancienne = document.querySelector('[data-capture="polices"]');
      ancienne?.remove();

      const zone = document.createElement("div");
      zone.setAttribute("data-capture", "polices");
      zone.setAttribute("data-lecture", "oui");
      zone.setAttribute("data-police", codePolice);
      zone.className = "zone-lecture zone-lecture-v2";
      // Largeur FIXE et volontairement étroite : c'est elle qui fait apparaître le
      // débordement d'OpenDyslexic. Une largeur souple ne montrerait jamais rien.
      zone.setAttribute(
        "style",
        [
          `--lecture-famille: ${PILES[codePolice] ?? PILES["andika"] ?? ""}`,
          "--lecture-corps: 24px",
          "--lecture-interlettrage: 0.06em",
          "--lecture-espacement-mots: 0.08em",
          "--lecture-interligne: 1.6",
          "--lecture-fond: var(--parchemin)",
          "--lecture-encre: var(--trait)",
          "font-family: var(--lecture-famille)",
          "font-size: var(--lecture-corps)",
          "letter-spacing: var(--lecture-interlettrage)",
          "word-spacing: var(--lecture-espacement-mots)",
          "line-height: var(--lecture-interligne)",
          "background-color: var(--lecture-fond)",
          "color: var(--lecture-encre)",
          "position: fixed",
          "inset-block-start: 0",
          "inset-inline-start: 0",
          "inline-size: 520px",
          "padding: 24px",
          "z-index: 9999",
        ].join(";"),
      );

      for (const ligne of texte.split("\n")) {
        const paragraphe = document.createElement("p");
        paragraphe.className = "ligne-lecture";
        paragraphe.textContent = ligne;
        zone.append(paragraphe);
      }
      document.body.append(zone);
    },
    { police, texte: TEXTE },
  );

  // On attend un ÉTAT — les polices résolues —, jamais une durée (annexe T § 6).
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.locator('[data-capture="polices"]')).toBeVisible();
}

test.describe("les polices de lecture disponibles", () => {
  test("AUCUNE requête sortante pendant le rendu des polices — chiffre de sortie", async ({
    page,
  }) => {
    const sortantes: string[] = [];

    // « Sortante » = tout ce qui ne part pas vers la machine locale. On ne compare pas au
    // `baseURL` du contexte : il n'est pas exposé par l'API publique de Playwright, et un test
    // qui lit une propriété privée casse à la mise à jour suivante. Le critère du hors-ligne
    // est de toute façon celui-ci, et il est plus fort : rien ne sort de la machine.
    const LOCALES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

    page.on("request", (requete: Request) => {
      const url = new URL(requete.url());
      if (url.protocol === "data:" || url.protocol === "blob:") {
        return;
      }
      if (!LOCALES.has(url.hostname)) {
        sortantes.push(requete.url());
      }
    });

    for (const police of policesDuProjet()) {
      await monterZone(page, police);
    }

    // Le seuil est ZÉRO, et il n'est pas négociable : « aucun appel à Google Fonts, tout est
    // servi en WOFF2 depuis le PC » (v2 § 9.3). Une seule requête sortante casse le hors-ligne.
    expect(sortantes, `Requêtes sortantes interdites : ${sortantes.join(", ")}`).toEqual([]);
  });

  test("les choix correspondent aux polices réellement disponibles", () => {
    expect([...policesDuProjet()]).toEqual(["andika", "opendyslexic", "verdana"]);
  });

  for (const police of ["andika", "opendyslexic", "verdana"]) {
    test(`capture de référence — ${police}`, async ({ page }) => {
      await monterZone(page, police);
      const zone = page.locator('[data-capture="polices"]');

      // Assertions AVANT la capture : une image de référence ne prouve rien toute seule.
      await expect(zone).toHaveAttribute("data-police", police);

      // Le débordement d'OpenDyslexic (annexe T § T4) : la boîte ne doit jamais dépasser sa
      // largeur déclarée, quelle que soit la police. C'est mesuré, pas seulement photographié
      // — une capture de référence régénérée par mégarde figerait un débordement.
      const mesures = await zone.evaluate((noeud) => ({
        largeur: noeud.getBoundingClientRect().width,
        debordement: noeud.scrollWidth - noeud.clientWidth,
      }));
      expect(mesures.largeur).toBeLessThanOrEqual(520 + 48 + 1);
      expect(
        mesures.debordement,
        `Débordement horizontal de ${String(mesures.debordement)} px en ${police}.`,
      ).toBeLessThanOrEqual(0);

      await expect(zone).toHaveScreenshot(`police-${police}.png`);
    });
  }
});
