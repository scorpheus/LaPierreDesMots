/**
 * « LANCER CET EXERCICE » LANCE VRAIMENT L'EXERCICE — R30.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « dans le profil il y a les exercices, il y a le bouton lancer l'exercice, mais ça ne fait
 * rien. Il faudrait donc l'activer. »
 *
 * Le même défaut que le chaudron (R25), au bout du site opposé : `surLancerExercice` était
 * déclaré sur `EcranDashboard`, relayé jusqu'au bouton de `FicheExercice`, et **fourni par aucun
 * hôte**. La fiche se désactivait alors proprement — `disabled={surLancer === undefined}` — et le
 * parent voyait un bouton gris sans savoir pourquoi.
 *
 * Il manquait aussi de quoi jouer : le catalogue liste des EXERCICES, et on n'entre dans le jeu
 * que par un NŒUD. Le serveur résolvait pourtant ce nœud depuis toujours, trois lignes au-dessus,
 * pour en déduire la région — il le publie désormais. Mesuré : 76 exercices sur 76 déclarent
 * `jeu.noeud`.
 *
 * ── LA MOITIÉ QUI COMPTE LE PLUS, ET QU'AUCUN TEST NE GARDAIT ─────────────────────────────────
 * Une partie lancée par le PARENT ne doit rien journaliser : `tentatives` fait foi pour le BKT,
 * le Leitner et le sélecteur, et une partie d'adulte y entrerait comme une réussite de l'enfant.
 *
 * `LANCEMENT_PARENT = { journalise: false }` existait depuis N5 et **personne ne le lisait**. Son
 * propre commentaire annonçait le risque : « un drapeau qui ne vit que dans une variable
 * JavaScript est un drapeau qu'aucun test de bout en bout ne peut constater ». Le drapeau vit
 * maintenant dans le magasin et se lit sur `data-journalise` ; ce fichier l'exige, ET recompte le
 * journal derrière.
 *
 * `tests/unitaires/galerie-non-journalisee.test.ts` prétendait déjà garder ce contrat, mais son
 * « lancement » est un GET sur `/api/contenu/noeuds/{exercice}` **qui accepte un 404 comme
 * succès** : il ne traversait aucune ligne de client, et son « 100 % des exercices sont
 * lançables » ne mesurait rien. Consigné dans `Docs/retours-de-jeu.md` § R30.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { expect, test } from "./invariants.js";

import { ouvrirLaZoneParent, preparer } from "./qa-outils.js";

import type { Page } from "@playwright/test";

/** Un exercice `colorie` : c'est le moteur qu'on sait mener jusqu'au bout sans le regarder. */
const EXERCICE_COLORIE = "clairiere-ecole-01";
const NOEUD_COLORIE = "clairiere-01";

interface FenetreTest {
  readonly __test: {
    allerAuNoeud: (n: string) => Promise<void>;
    repondre: (action: unknown) => Promise<void>;
    etat: () => {
      readonly ecran: string;
      readonly etatMoteur: unknown;
      readonly profil: string | null;
    };
  };
}

/**
 * Le nombre de tentatives journalisées pour ce profil, lu au SERVEUR.
 *
 * On ne demande pas au client s'il a écrit — c'est justement ce dont on doute. La progression
 * est recalculée depuis `tentatives`, qui fait foi.
 */
async function tentativesJournalisees(page: Page, profil: string): Promise<number> {
  // ⚠ AUCUN REPLI SILENCIEUX. Ma première version rendait `0` quand la requête échouait : le
  // cas « le parent ne journalise rien » serait alors passé au vert pour la pire des raisons —
  // une sonde cassée rend zéro partout, et zéro est exactement ce qu'il attendait.
  expect(profil, "aucun profil : la mesure porterait sur le vide").not.toBe("");
  const reponse = await page.request.get(`/api/profils/${encodeURIComponent(profil)}/progression`);
  expect(
    reponse.ok(),
    `GET progression a rendu ${String(reponse.status())} — la mesure ne mesure rien`,
  ).toBe(true);
  const lignes = (await reponse.json()) as ReadonlyArray<{ readonly nbTentatives?: number }>;
  return lignes.reduce((somme, ligne) => somme + Number(ligne.nbTentatives ?? 0), 0);
}

/** Joue un `colorie` jusqu'à la récompense. Borne de sécurité, jamais une attente de durée. */
async function jouerLeColorie(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const crochets = (window as unknown as FenetreTest).__test;
    interface EtatColorieLu {
      readonly indexConsigne: number;
      readonly consignes: ReadonlyArray<{
        readonly ciblesRestantes: ReadonlyArray<{
          readonly region: string;
          readonly couleur: string;
        }>;
      }>;
    }
    for (let tour = 0; tour < 160; tour += 1) {
      const etat = crochets.etat();
      if (etat.ecran === "recompense") return;
      const moteur = etat.etatMoteur as EtatColorieLu | null;
      const cible = moteur?.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
      if (cible === undefined) return;
      await crochets.repondre({ type: "choisirCouleur", couleur: cible.couleur });
      await crochets.repondre({ type: "peindre", region: cible.region });
    }
  });
}

/** Ouvre l'onglet de la galerie dans le dashboard, où vivent les fiches d'exercice. */
async function ouvrirLaGalerie(page: Page): Promise<void> {
  await preparer(page);
  await ouvrirLaZoneParent(page);
  await expect(page.locator('[data-ecran="dashboard"]')).toBeVisible();
  await page.locator('[data-onglet-parent="galerie"]').click();
  await expect(page.locator(`[data-galerie-lancer="${EXERCICE_COLORIE}"]`)).toBeVisible();
}

test.describe("R30 — le parent peut lancer un exercice, sans que ça compte", () => {
  test("LE DÉFAUT CORRIGÉ — le bouton n’est plus inerte, et il ouvre le nœud", async ({ page }) => {
    await ouvrirLaGalerie(page);

    const bouton = page.locator(`[data-galerie-lancer="${EXERCICE_COLORIE}"]`);
    await expect(
      bouton,
      "le bouton est encore désactivé : `surLancerExercice` n’est fourni par aucun hôte",
    ).toBeEnabled();

    await bouton.click();
    await expect(
      page.locator('[data-ecran="noeud"]'),
      "taper « Lancer cet exercice » n’a mené nulle part — c’est le défaut de R30",
    ).toBeVisible();
    await expect(page.locator('[data-moteur="colorie"]')).toBeVisible();
  });

  test("LA PARTIE DU PARENT NE COMPTE PAS — annoncé par `data-journalise`, ET tenu", async ({
    page,
  }) => {
    await ouvrirLaGalerie(page);
    await page.locator(`[data-galerie-lancer="${EXERCICE_COLORIE}"]`).click();
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    // 1. Le régime est ANNONCÉ. Sans cette marque, le contrat ne vivrait que dans une variable
    //    JavaScript — exactement ce que `LANCEMENT_PARENT` redoutait dans son commentaire.
    await expect(
      page.locator('[data-ecran="noeud"]'),
      "l’écran ne dit pas qu’il est en lancement parent",
    ).toHaveAttribute("data-journalise", "non");

    // `etat().profil` EST l'identifiant, pas un objet qui le porte (`EtatTestSerialisable`).
    // Ma première version lisait `.profil?.id` et rendait la chaîne vide ; couplée au repli
    // silencieux de la sonde, elle faisait passer le cas parent en comptant zéro contre zéro.
    // Deux mesures creuses qui s'annulaient pour donner un vert — c'est le contrôle positif,
    // et lui seul, qui a fait tomber les deux.
    const profil = await page.evaluate(() =>
      String((window as unknown as FenetreTest).__test.etat().profil ?? ""),
    );
    const avant = await tentativesJournalisees(page, profil);

    // 2. Et il est TENU : on joue jusqu'au bout, puis on recompte le journal au serveur.
    await jouerLeColorie(page);
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();

    expect(
      await tentativesJournalisees(page, profil),
      "une partie lancée par le parent a écrit dans `tentatives` : le BKT, le Leitner et le " +
        "sélecteur vont dériver sur une réussite qui n’est pas celle de l’enfant",
    ).toBe(avant);
  });

  test("CONTRÔLE POSITIF — une partie de l’ENFANT, elle, compte bien", async ({ page }) => {
    // Sans ce cas, un client qui n'écrirait PLUS RIEN passerait le cas précédent en vert. Le
    // pire défaut que ce fichier puisse laisser passer est un journal devenu muet.
    await preparer(page);
    await page.locator("[data-profil]").first().click();
    await page.evaluate(async (noeud) => {
      await (window as unknown as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD_COLORIE);

    await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute("data-journalise", "oui");

    // `etat().profil` EST l'identifiant, pas un objet qui le porte (`EtatTestSerialisable`).
    // Ma première version lisait `.profil?.id` et rendait la chaîne vide ; couplée au repli
    // silencieux de la sonde, elle faisait passer le cas parent en comptant zéro contre zéro.
    // Deux mesures creuses qui s'annulaient pour donner un vert — c'est le contrôle positif,
    // et lui seul, qui a fait tomber les deux.
    const profil = await page.evaluate(() =>
      String((window as unknown as FenetreTest).__test.etat().profil ?? ""),
    );
    const avant = await tentativesJournalisees(page, profil);

    await jouerLeColorie(page);
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();

    await expect
      .poll(async () => tentativesJournalisees(page, profil), {
        message:
          "une partie de l’enfant n’a RIEN journalisé : c’est le pire défaut possible, et il " +
          "rendrait le cas précédent vert pour la mauvaise raison",
      })
      .toBeGreaterThan(avant);
  });
});
