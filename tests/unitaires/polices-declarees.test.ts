/**
 * TOUTE POLICE DÉCLARÉE EST UNE POLICE QU'ON VA CHERCHER — et réciproquement.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE, TROUVÉ PAR LA CONSOLE DU PÈRE
 *
 *     OTS parsing error: invalid sfntVersion: 1008821359
 *
 * 1008821359 = 0x3C21444F = « <!DO ». Les requêtes de police recevaient la PAGE HTML : le repli
 * SPA du serveur, parce que le fichier n'existait pas. Et il n'existait pas parce que **deux
 * listes vivaient côte à côte sans que rien ne les rapproche** :
 *
 *     réclamées par les feuilles de style : 8   (global.css 3, polices.css 5)
 *     connues de `telecharger-polices.mjs` : 5
 *     intersection                         : 5  →  3 réclamées que RIEN n'allait jamais chercher
 *
 * Atkinson Hyperlegible (deux graisses) et Fredoka étaient déclarées en `@font-face` et absentes
 * de la table du téléchargeur. Aucune commande ne pouvait les produire ; aucun test ne le disait.
 *
 * Le premier acte de ce défaut avait été pire encore : les CINQ autres n'avaient jamais été
 * téléchargées non plus, et **l'enfant a lu tous ses exercices dans la police système** au lieu
 * d'Andika — alors que « fond parchemin, police Andika » est une règle non négociable.
 *
 * ── CE QUE CE FICHIER NE PEUT PAS GARDER, ET POURQUOI IL LE DIT ────────────────────────────────
 * La PRÉSENCE des fichiers n'est pas testée ici : ils ne sont pas versionnés (D9 — « un dépôt de
 * code n'est pas un miroir de distribution »), donc une machine fraîchement clonée en est
 * légitimement dépourvue avant l'installation. Exiger leur présence rendrait la chaîne rouge sur
 * un clone propre, c'est-à-dire rouge pour une raison fausse.
 *
 * Ce qui est gardé, c'est la COHÉRENCE des deux listes — la seule chose qui, elle, doit être
 * vraie sur toute machine, et la seule qui a réellement échoué.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, test } from "vitest";

import { lireTexte } from "../configuration/preparation.js";

const FEUILLES = ["client/src/styles/global.css", "client/src/styles/polices.css"] as const;
const TELECHARGEUR = "scripts/telecharger-polices.mjs";

/** Tous les `url("/polices/…")` d'une feuille de style, dans l'ordre de lecture. */
function reclamees(): readonly { readonly fichier: string; readonly ou: string }[] {
  const trouvees: { fichier: string; ou: string }[] = [];
  for (const feuille of FEUILLES) {
    const texte = lireTexte(feuille);
    for (const occurrence of texte.matchAll(/url\("\/polices\/([^"]+)"/gu)) {
      trouvees.push({ fichier: occurrence[1] as string, ou: feuille });
    }
  }
  return trouvees;
}

/** Les `fichier:` déclarés dans la table du téléchargeur. */
function connues(): readonly string[] {
  const texte = lireTexte(TELECHARGEUR);
  return [...texte.matchAll(/fichier:\s*["']([^"']+)["']/gu)].map(
    (occurrence) => occurrence[1] as string,
  );
}

/** Les blocs de la table, indépendamment du choix de guillemets de Prettier. */
function blocsDePolices(): readonly string[] {
  return lireTexte(TELECHARGEUR)
    .split(/\{\s*\n\s*fichier:\s*["']/u)
    .slice(1);
}

describe("les polices déclarées et les polices téléchargées sont la même liste", () => {
  test("CONTRÔLE POSITIF — les deux listes ne sont pas vides", () => {
    // Sans ce cas, une expression régulière cassée rendrait deux ensembles vides, leur
    // intersection serait parfaite, et le test serait vert en ne comparant rien. C'est
    // exactement le mode de défaillance qu'on corrige ailleurs cette semaine.
    expect(reclamees().length, 'aucun `url("/polices/…")` trouvé').toBeGreaterThanOrEqual(5);
    expect(connues().length, "aucun `fichier:` trouvé dans le téléchargeur").toBeGreaterThanOrEqual(
      5,
    );
  });

  test("LE DÉFAUT — aucune police déclarée en `@font-face` n’est inconnue du téléchargeur", () => {
    const table = new Set(connues());
    const orphelines = reclamees().filter((police) => !table.has(police.fichier));
    expect(
      orphelines.map((police) => `${police.fichier} (déclarée dans ${police.ou})`),
      "ces polices seront demandées au serveur, qui répondra la page HTML — et le navigateur " +
        "rendra « OTS parsing error: invalid sfntVersion: 1008821359 », soit « <!DO »",
    ).toEqual([]);
  });

  test("et réciproquement : le téléchargeur ne va chercher aucune police que personne n’utilise", () => {
    // L'autre sens compte aussi : une police téléchargée que rien ne déclare est du poids
    // installé pour rien, et surtout le signe qu'un `@font-face` a été supprimé sans que la
    // table suive. Les deux listes doivent rester le même ensemble.
    const declarees = new Set(reclamees().map((police) => police.fichier));
    const inutilisees = connues().filter((fichier) => !declarees.has(fichier));
    expect(inutilisees, "téléchargées mais déclarées nulle part").toEqual([]);
  });

  test("chaque police porte sa licence et son auteur — aucune n’arrive sans provenance", () => {
    // D9 et la note de `LICENCES.md` : on n'installe rien dont on ne sache pas d'où ça vient.
    const blocs = blocsDePolices();
    expect(blocs.length).toBe(connues().length);
    for (const [rang, bloc] of blocs.entries()) {
      const entete = bloc.slice(0, bloc.indexOf("note:"));
      expect(entete, `police n°${String(rang + 1)} sans licence`).toMatch(/licence:\s*["']/u);
      expect(entete, `police n°${String(rang + 1)} sans auteur`).toMatch(/auteur:\s*["']/u);
    }
  });

  test("une police à URL établie a son empreinte ÉPINGLÉE, sinon elle ne s’écrira jamais", () => {
    // Le script refuse d'écrire un fichier dont l'empreinte n'est pas épinglée — c'est ce qui
    // a protégé le dépôt le jour où les cinq premières ont été récupérées. Mais une URL posée
    // sans empreinte donne un script qui télécharge à chaque fois pour ne rien écrire : le
    // symptôme est identique à celui d'une police absente, et rien ne le distingue.
    const blocs = blocsDePolices();
    const boiteuses: string[] = [];
    for (const bloc of blocs) {
      const nom = bloc.match(/^([^"']+)["']/u)?.[1] ?? "(nom illisible)";
      const aUneUrl = /url:\s*["']https/u.test(bloc);
      const aUneEmpreinte = /sha256:\s*["'][0-9a-f]{64}["']/u.test(bloc);
      if (aUneUrl && !aUneEmpreinte) boiteuses.push(nom);
    }
    expect(boiteuses, "URL posée mais empreinte non épinglée : téléchargée, jamais écrite").toEqual(
      [],
    );
  });
});
