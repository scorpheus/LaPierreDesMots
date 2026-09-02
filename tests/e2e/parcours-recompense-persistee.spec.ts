/**
 * Q3 — CE QUE L'ÉCRAN ANNONCE COMME GAGNÉ EXISTE EN BASE.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q3. Mode de défaillance M3,
 * « ce que l'écran annonce n'existe nulle part ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI L'A INSPIRÉ — R31, et c'est le père qui l'a vu le premier
 *
 * « si on finit un exercice, il y a écrit qu'on gagne une évolution mais en fait il n'y a rien
 * du tout dans le campement. »
 *
 * Mesuré alors sur sa vraie base, après 23 exercices joués : `tentatives` 23,
 * `progression_cascade` **0**, `formes_gobi` **0**. Le gain était calculé DANS LE CLIENT,
 * affiché, sonné — et jamais envoyé. `tests/e2e/parcours-cascade.spec.ts` vérifiait
 * l'affichage et passait au vert sans qu'une ligne n'atteigne la base.
 *
 * ── POURQUOI CE GARDE N'A PAS ÉTÉ ÉCRIT AVEC LES SIX AUTRES ──────────────────────────────
 *
 * Il attendait le lot A1. Écrire un garde de persistance contre un code qu'on allait justement
 * réécrire n'aurait rien gardé — la dette était nommée dans `scripts/qa/controles-positifs.mjs`
 * avec sa scène d'extinction : « A1 applique la cascade dans la transaction de
 * POST /api/tentatives et la rend au client ». **A1 a atterri, la scène est remplie.**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE Q3 MESURE, ET CE QU'IL REFUSE DE MESURER ──────────────────────────────────────
 *
 * On joue **par le chemin de l'enfant** — profil, carte, nœud, taps —, on relève tout ce que
 * l'écran de récompense ANNONCE (`[data-recompense]`), et on demande au SERVEUR si la
 * contrepartie existe. Jamais l'inverse : lire l'état du client pour se convaincre que le
 * client a raison est exactement ce qui a laissé R31 vivre.
 *
 * La population est DÉRIVÉE de l'union `NatureRecompense` : une nature ⇒ une table à
 * interroger. Une nature ajoutée demain sans contrepartie vérifiable fait échouer ce fichier
 * au lieu de passer inaperçue — c'est la première assertion du describe.
 *
 * ── LE CONTRÔLE POSITIF, ET C'EST LUI QUI SAUVE LE GARDE ─────────────────────────────────
 *
 * Le § 4 Q3 l'exige nommément : une partie lancée par le PARENT (`LANCEMENT_PARENT`) ne doit
 * RIEN écrire. Sans ce contrôle, une mesure qui comparerait zéro annoncé à zéro persisté
 * passerait au vert en ne mesurant rien — « ce qui est exactement ce qui est arrivé à R30 ».
 * On exige donc les deux faces : l'enfant écrit, le parent n'écrit pas.
 */
import { expect, test } from "./invariants.js";

import {
  choisirLeProfil,
  entrerDansLeNoeud,
  etatDuJeu,
  jouerJusquALaRecompense,
  lireJson,
  lireTexte,
  noeudsLivres,
  ouvrirLaZoneParent,
  preparer,
} from "./qa-outils.js";

import type { Page } from "@playwright/test";

// ═══════════════════════════════════════════ la population, DÉRIVÉE de `NatureRecompense`

/** Les natures déclarées, lues dans l'union. `recompenses/types.ts` fait foi. */
function naturesDeclarees(): readonly string[] {
  const bloc = /export type NatureRecompense\s*=([\s\S]*?);/.exec(
    lireTexte("partage/src/recompenses/types.ts"),
  );
  if (bloc === null) {
    throw new Error("Q3 : l’union `NatureRecompense` est introuvable — la population serait vide.");
  }
  const natures = [...bloc[1]!.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]!);
  if (natures.length === 0) throw new Error("Q3 : `NatureRecompense` trouvée, aucun membre lu.");
  return natures;
}

interface EtatMonde {
  readonly gobi: { readonly formes: readonly unknown[] };
  readonly carte: { readonly regions: readonly { readonly pourcentageColorie: number }[] };
  readonly campement: readonly { readonly placeLe: string | null }[];
}

/**
 * UNE NATURE ⇒ UNE TABLE À INTERROGER.
 *
 * C'est la seule table écrite à la main de ce fichier, et le § 4 Q3 la demande explicitement.
 * Ce qui la rend opposable : la première assertion du describe exige qu'elle couvre TOUTE
 * l'union. Une nature ajoutée sans contrepartie fait rougir Q3 au lieu de glisser.
 */
const CONTREPARTIE: Readonly<
  Record<
    string,
    (monde: EtatMonde, etoiles: number) => { readonly trouve: boolean; readonly vu: string }
  >
> = {
  etoile: (_monde, etoiles) => ({
    trouve: etoiles > 0,
    vu: `${String(etoiles)} étoile(s) au nœud`,
  }),
  "forme-gobi": (monde) => ({
    trouve: monde.gobi.formes.length > 0,
    vu: `${String(monde.gobi.formes.length)} forme(s) de Gobi`,
  }),
  "zone-recoloriee": (monde) => {
    const colorie = monde.carte.regions.filter((r) => r.pourcentageColorie > 0).length;
    return { trouve: colorie > 0, vu: `${String(colorie)} région(s) recoloriée(s)` };
  },
};

/** Le palier d'une récompense affichée → sa nature, LUE dans les seuils livrés. */
function natureDuPalier(palier: string): string {
  const seuils = lireJson<{ natureIntermediaire: string; natureRare: string }>(
    "contenu/referentiel/parametres-recompenses.json",
  );
  if (palier === "intermediaire") return seuils.natureIntermediaire;
  if (palier === "rare") return seuils.natureRare;
  return "etoile";
}

const NOEUDS = noeudsLivres();
/** Le premier nœud `colorie` : c'est celui que `jouerJusquALaRecompense` sait terminer. */
const NOEUD_JOUABLE = NOEUDS.find((n) => n.moteur === "colorie")?.id ?? NOEUDS[0]!.id;

async function lireLeMonde(page: Page, profil: string): Promise<EtatMonde> {
  const reponse = await page.request.get(`/api/profils/${profil}/monde`);
  expect(reponse.ok(), "le serveur ne rend pas le monde du profil").toBe(true);
  return (await reponse.json()) as EtatMonde;
}

async function profilCourant(page: Page): Promise<string> {
  const etat = await etatDuJeu(page);
  expect(
    etat.profil,
    "aucun profil courant : la partie n’a pas été jouée par le chemin de l’enfant",
  ).not.toBeNull();
  return etat.profil!;
}

test.describe("Q3 — ce que l’écran annonce comme gagné existe en base", () => {
  test("la population est DÉRIVÉE de `NatureRecompense`, et chaque nature a sa contrepartie", () => {
    const natures = naturesDeclarees();
    const sansContrepartie = natures.filter((n) => CONTREPARTIE[n] === undefined);
    console.log(
      `[Q3] population : ${String(natures.length)} nature(s) de récompense — ${natures.join(" · ")}`,
    );
    expect(
      natures.length,
      "l’union `NatureRecompense` ne rend plus aucun membre",
    ).toBeGreaterThanOrEqual(2);
    expect(
      sansContrepartie,
      "Ces natures sont déclarées et Q3 ne sait pas où vérifier qu’elles ont laissé une trace. " +
        "Une nature sans contrepartie interrogeable est un palier qu’on annoncera sans jamais " +
        "pouvoir prouver qu’il a été donné — c’est R31 en préparation.",
    ).toEqual([]);
  });

  test("LE DÉFAUT — chaque palier annoncé à l’écran a sa contrepartie en base", async ({
    page,
  }) => {
    // ── ON JOUE ASSEZ POUR FRANCHIR PLUS QUE L'ÉTOILE ──────────────────────────────────────
    //
    // Un seul nœud n'annonce que le palier `etoile` : les contreparties `forme-gobi` et
    // `zone-recoloriee` ne seraient alors JAMAIS exercées, et Q3 passerait au vert en n'ayant
    // vérifié qu'un tiers de sa population. Le nombre de nœuds à jouer se DÉRIVE des seuils
    // livrés : `etoilesParIntermediaire` étoiles, à 3 étoiles par nœud parfait.
    const seuils = lireJson<{ etoilesParIntermediaire: number }>(
      "contenu/referentiel/parametres-recompenses.json",
    );
    const jouables = NOEUDS.filter((n) => n.moteur === "colorie").map((n) => n.id);
    const aJouer = Math.min(jouables.length, Math.ceil(seuils.etoilesParIntermediaire / 3) + 1);
    expect(
      aJouer,
      "pas assez de nœuds `colorie` livrés pour franchir le palier intermédiaire : Q3 ne " +
        "pourrait vérifier que la contrepartie des étoiles.",
    ).toBeGreaterThanOrEqual(2);

    const paliers: string[] = [];
    for (const noeud of jouables.slice(0, aJouer)) {
      await preparer(page, "Q3 enfant");
      await jouerJusquALaRecompense(page, noeud, "Q3 enfant");
      await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
      const vus = await page
        .locator("[data-recompense]")
        .evaluateAll((noeuds) => noeuds.map((n) => n.getAttribute("data-recompense") ?? ""));
      paliers.push(...vus);
    }

    const profil = await profilCourant(page);
    const monde = await lireLeMonde(page, profil);
    const progression = await page.request.get(`/api/profils/${profil}/progression`);
    const lignes = progression.ok()
      ? ((await progression.json()) as readonly {
          readonly noeud: string;
          readonly etoiles: number;
        }[])
      : [];
    const etoiles = lignes.reduce((total, l) => total + l.etoiles, 0);

    console.log(
      `[Q3] paliers annoncés sur ${String(aJouer)} nœud(s) : ` +
        `${paliers.length === 0 ? "aucun" : paliers.join(", ")} · profil ${profil}`,
    );

    // Un écran de récompense qui n'annonce RIEN rendrait ce cas vrai par vacuité : c'est le
    // « zéro comparé à zéro » que le § 4 Q3 interdit.
    expect(
      paliers.length,
      "l’écran de récompense n’annonce aucun palier : la comparaison porterait sur rien.",
    ).toBeGreaterThanOrEqual(1);

    console.log(
      `[Q3] état en base après ${String(aJouer)} nœuds : ${String(etoiles)} étoiles · ` +
        `${String(monde.gobi.formes.length)} forme(s) Gobi · ` +
        `${String(monde.carte.regions.filter((r) => r.pourcentageColorie > 0).length)} région(s) colorée(s) · ` +
        `seuil intermédiaire ${String(seuils.etoilesParIntermediaire)} étoiles`,
    );
    const manquants: string[] = [];
    for (const palier of paliers) {
      const nature = natureDuPalier(palier);
      const verifier = CONTREPARTIE[nature];
      if (verifier === undefined) {
        manquants.push(`${palier} → nature « ${nature} » sans contrepartie connue`);
        continue;
      }
      const { trouve, vu } = verifier(monde, etoiles);
      if (!trouve) manquants.push(`${palier} (nature « ${nature} ») — rien en base : ${vu}`);
    }
    expect(
      manquants,
      "L’écran a annoncé ces paliers et le serveur n’en garde aucune trace. C’est R31 : « il y a " +
        "écrit qu’on gagne une évolution mais en fait il n’y a rien du tout ». Le gain doit être " +
        "appliqué dans la transaction du POST, pas calculé dans le client.",
    ).toEqual([]);

    // ══════════════════════════════════════════════════════════════════════════════════════
    // L'AUTRE SENS, ET C'EST LUI QUI MORD AUJOURD'HUI — R31 À L'ENVERS.
    //
    // R31 était « l'écran annonce, la base ne garde rien ». A1 l'a réparé. Mesuré ici, sur
    // trois nœuds joués par le chemin de l'enfant :
    //
    //     paliers annoncés : etoile · etoile · etoile
    //     état en base     : 9 étoiles · 1 forme de Gobi · seuil intermédiaire 5 étoiles
    //
    // **Le palier intermédiaire a été franchi et PERSISTÉ — et l'écran ne l'a jamais dit.**
    // L'enfant gagne une forme de Gobi en silence. C'est le même mode de défaillance (M3, « ce
    // que l'écran annonce n'existe nulle part ») pris par l'autre bout, et il coûte la
    // récompense elle-même : « ce qui motive, c'est de voir la case suivante vide » (D25).
    //
    // On n'éprouve ce sens QUE sur la nature du palier intermédiaire : `zone-recoloriee` est
    // aussi écrite par le coloriage ordinaire, donc sa présence en base ne prouve aucun palier.
    // `forme-gobi` n'a qu'un seul émetteur — le palier — donc elle, elle prouve.
    const natureIntermediaire = natureDuPalier("intermediaire");
    const contrepartieIntermediaire = CONTREPARTIE[natureIntermediaire];
    expect(contrepartieIntermediaire, "nature intermédiaire sans contrepartie").toBeDefined();
    const acquis = contrepartieIntermediaire!(monde, etoiles);
    const annonce = paliers.includes("intermediaire");
    console.log(
      `[Q3] palier intermédiaire — en base : ${acquis.vu} · annoncé à l’écran : ` +
        `${annonce ? "oui" : "NON"}`,
    );
    expect(
      acquis.trouve && !annonce ? [`${natureIntermediaire} : ${acquis.vu}, jamais annoncé`] : [],
      "Le serveur a attribué ce palier et l’écran de récompense ne l’a jamais dit à l’enfant. " +
        "C’est R31 à l’envers : la base garde, l’écran se tait. Une récompense qu’on ne voit " +
        "pas n’en est pas une (D25, point 3).",
    ).toEqual([]);
  });

  test("CONTRÔLE POSITIF — une partie lancée par le PARENT n’écrit rien", async ({ page }) => {
    // Exigé nommément par le § 4 Q3. Sans lui, une mesure qui comparerait « zéro annoncé » à
    // « zéro persisté » passerait au vert sans rien mesurer — c'est ce qui est arrivé à R30.
    // Le chemin du parent (`LANCEMENT_PARENT`) est celui de la galerie : il ouvre le MÊME
    // écran de nœud, avec le MÊME contenu, et ne doit RIEN journaliser.
    await preparer(page, "Q3 parent");
    await choisirLeProfil(page, "Q3 parent");
    const profil = await profilCourant(page);

    const avant = await page.request.get(`/api/profils/${profil}/progression`);
    const lignesAvant = avant.ok() ? ((await avant.json()) as readonly unknown[]).length : 0;
    const mondeAvant = await lireLeMonde(page, profil);

    await preparer(page, "Q3 parent");
    await ouvrirLaZoneParent(page);
    await expect(page.locator('[data-ecran="dashboard"]')).toBeVisible();
    await page.locator('[data-onglet-parent="galerie"]').click();
    await page.locator("[data-galerie-lancer]").first().click();
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    // La marque que R30 a posée : cet écran ne journalise pas.
    const journalise = await page.locator('[data-ecran="noeud"]').getAttribute("data-journalise");
    console.log(
      `[Q3] contrôle positif — lancement parent : data-journalise=${journalise ?? "absent"}`,
    );

    const apres = await page.request.get(`/api/profils/${profil}/progression`);
    const lignesApres = apres.ok() ? ((await apres.json()) as readonly unknown[]).length : 0;
    const mondeApres = await lireLeMonde(page, profil);

    expect(
      journalise,
      "l’écran de nœud ouvert depuis la galerie parent ne se déclare pas non journalisé : " +
        "la marque de R30 a disparu, et rien ne distingue plus une visite du parent d’une " +
        "partie de l’enfant.",
    ).toBe("non");
    expect(
      lignesApres,
      "une visite du parent a ajouté une ligne de progression : elle nourrit le BKT de l’enfant.",
    ).toBe(lignesAvant);
    expect(
      mondeApres.gobi.formes.length,
      "une visite du parent a fait évoluer Gobi : le monde de l’enfant a bougé sans lui.",
    ).toBe(mondeAvant.gobi.formes.length);
  });

  test("CONTRÔLE NÉGATIF — l’enfant, lui, écrit bien : les deux cas se distinguent", async ({
    page,
  }) => {
    // Le pendant du contrôle ci-dessus, et il est indispensable : si l'enfant n'écrivait pas
    // non plus, « le parent n'écrit rien » serait vrai sans rien prouver. Les deux faces
    // ensemble sont la seule preuve que la mesure DISTINGUE.
    await preparer(page, "Q3 témoin");
    await choisirLeProfil(page, "Q3 témoin");
    const profil = await profilCourant(page);
    const avant = await page.request.get(`/api/profils/${profil}/progression`);
    const lignesAvant = avant.ok() ? ((await avant.json()) as readonly unknown[]).length : 0;

    await preparer(page, "Q3 témoin");
    await entrerDansLeNoeud(page, NOEUD_JOUABLE, "Q3 témoin");
    await preparer(page, "Q3 témoin");
    await jouerJusquALaRecompense(page, NOEUD_JOUABLE, "Q3 témoin");
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();

    const apres = await page.request.get(`/api/profils/${profil}/progression`);
    const lignesApres = apres.ok() ? ((await apres.json()) as readonly unknown[]).length : 0;
    console.log(
      `[Q3] contrôle négatif — progression de l’enfant : ${String(lignesAvant)} → ${String(lignesApres)} ligne(s)`,
    );
    expect(
      lignesApres,
      "une partie jouée par le chemin de l’ENFANT n’écrit rien non plus : le contrôle positif " +
        "ci-dessus comparerait alors zéro à zéro et passerait au vert sans rien mesurer. C’est " +
        "exactement le piège que le § 4 Q3 nomme, et que R30 a subi.",
    ).toBeGreaterThan(lignesAvant);
  });
});
