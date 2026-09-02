/**
 * LA PILE DE POLICES NOMME SA PROPRE FAMILLE — le trou X3, fermé.
 *
 * ── CE QUE CE FICHIER GARDE, ET POURQUOI IL N'EXISTAIT PAS ────────────────────────────────
 *
 * CLAUDE.md, règle non négociable : « Dès qu'il y a du déchiffrage : fond parchemin, police
 * Andika. » Le 2026-08-02, une mutation inventée pour l'occasion a retiré Andika de sa propre
 * pile CSS — `andika: \`Verdana, system-ui, sans-serif\`` — et **toute la suite est restée
 * verte**. La police que l'enfant lit devenait Verdana sans qu'une ligne rougisse.
 *
 * Le dépôt contenait pourtant QUATRE assertions portant le mot « Andika ». C'est ce qui rend
 * ce trou instructif : chacune vérifiait autre chose.
 *
 *   tests/composants/ZoneDeLecture.test.tsx:110  `expect(famille).toContain('Andika')`
 *       … sur un rendu fait avec `police: 'opendyslexic'` (ligne 106). La pile lue est
 *       `"OpenDyslexic", "Andika", …` — la pile SŒUR, que la mutation ne touche pas.
 *   tests/unitaires/reglages-lecture.test.ts:51   `REGLAGES_PAR_DEFAUT.police === 'andika'`
 *   tests/unitaires/reglages-lecture.test.ts:105  une police inconnue normalise vers `'andika'`
 *   tests/api/reglages.test.ts:144                idem, côté serveur
 *       … ces trois-là vérifient le CODE `'andika'`, jamais ce qu'il DÉSIGNE.
 *
 * C'est l'audit par OCCURRENCES au lieu d'objets (D48), transposé d'un cran : on cherchait le
 * mot, pas la propriété. Ce fichier énumère les choix réellement disponibles —
 * et exige de chacune la propriété qui compte.
 */
import { describe, expect, it } from "vitest";

import { POLICES } from "@pierre/partage/lecture";

import {
  FICHIERS_EMBARQUES,
  REPLI_SYSTEME,
  familleDe,
  policeDisponible,
} from "@client/lecture/polices.js";

/**
 * Les polices SYSTÈME : déclarées par D19, servies par la machine, donc absentes de
 * `FICHIERS_EMBARQUES`.
 *
 * ── PREMIÈRE VERSION FAUSSE, ET C'ÉTAIT MA PRÉMISSE, PAS LE PRODUIT ───────────────────────
 * J'ai d'abord exigé que les CINQ polices aient un fichier embarqué. Sortie citée :
 * `« verdana » : sa pile CSS nomme « ? » … FAIL`. Verdana est une police système — elle
 * n'a aucun WOFF2 à embarquer, et `polices.ts` la déclare exprès (« Verdana d'abord, Andika
 * ensuite : c'est le repli annoncé au contrat, écart n° 5 »). Le test accusait un innocent.
 * La table ci-dessous est donc une DONNÉE, écrite et justifiée, pas une exemption tacite.
 */
const POLICES_SYSTEME: Readonly<Record<string, string>> = { verdana: "Verdana" };

/**
 * Le nom de famille CSS attendu dans la pile de chaque code de police.
 *
 * Il n'est PAS recalculé depuis le code : `FICHIERS_EMBARQUES` le porte déjà, police par
 * police, et c'est la source qui fait foi.
 */
function familleAttendue(police: string): string | null {
  return (
    FICHIERS_EMBARQUES.find((f) => f.police === police)?.famille ?? POLICES_SYSTEME[police] ?? null
  );
}

describe("les piles de polices — chaque police nomme sa propre famille", () => {
  it("CONTRAT DE SORTIE — tous les choix de police sont audités, écart nul", () => {
    const auditees = POLICES.filter((p) => familleAttendue(p) !== null);
    const sansFamille = POLICES.filter((p) => familleAttendue(p) === null);

    // La fraction est ASSERTÉE, pas seulement imprimée : c'est le défaut n° 6 de l'historique
    // de cette QA, et il ne rentre pas ici. Une police ajoutée demain sans fichier embarqué
    // NI entrée système fait rougir cette ligne au lieu de sortir du champ en silence.
    expect(
      auditees.length,
      `polices auditées ${String(auditees.length)} sur ${String(POLICES.length)} déclarées ; ` +
        `sans famille connue : ${sansFamille.join(", ") || "aucune"} — ajouter son WOFF2 à ` +
        "FICHIERS_EMBARQUES, ou son nom à POLICES_SYSTEME avec la raison",
    ).toBe(POLICES.length);
    // Plancher : « écart nul » resterait vrai sur une liste vide.
    expect(POLICES.length, "la liste des polices est anormalement pauvre").toBeGreaterThanOrEqual(
      3,
    );
  });

  for (const police of POLICES) {
    it(`« ${police} » : sa pile CSS nomme « ${familleAttendue(police) ?? "?"} »`, () => {
      const famille = familleAttendue(police);
      expect(famille, `aucun fichier embarqué déclaré pour « ${police} »`).not.toBeNull();

      const pile = familleDe(police);
      expect(
        pile,
        `la pile de « ${police} » ne contient pas sa propre famille « ${String(famille)} ». ` +
          "L’enfant croit lire cette police et en lit une autre — CLAUDE.md, règle non " +
          "négociable : « fond parchemin, police Andika ».",
      ).toContain(String(famille));
    });
  }

  it("« andika » est la police de repli, et sa pile la contient VRAIMENT", () => {
    // Le cas qui manquait, et le seul qui attrape la mutation X3. `familleDe` promet en
    // commentaire : « un code inconnu rend Andika ». Encore faut-il qu’« Andika » soit dedans.
    const repli = familleDe("andika");
    expect(repli, "la pile par défaut de toute zone de lecture a perdu Andika").toContain("Andika");
    expect(
      familleDe("police-qui-nexiste-pas" as never),
      "un code inconnu doit rendre exactement la pile d’Andika",
    ).toBe(repli);
  });

  it("chaque pile se termine par un repli système, jamais sur un fichier absent", () => {
    // Une pile qui ne finit pas par une famille générique rend un texte illisible le jour où
    // le WOFF2 manque.
    const generiques = [REPLI_SYSTEME, "cursive", "sans-serif", "serif"];
    for (const police of POLICES) {
      const pile = familleDe(police);
      expect(
        generiques.some((g) => pile.trimEnd().endsWith(g)),
        `la pile de « ${police} » (${pile}) ne se termine par aucune famille générique`,
      ).toBe(true);
    }
  });

  it("une police embarquée est disponible avant même le premier chargement du navigateur", () => {
    const documentAvecInventaireVide = {
      fonts: { check: () => false },
    } as unknown as Document;
    expect(policeDisponible("andika", documentAvecInventaireVide)).toBe(true);
    expect(policeDisponible("opendyslexic", documentAvecInventaireVide)).toBe(true);
    expect(policeDisponible("verdana", documentAvecInventaireVide)).toBe(false);
  });
});
