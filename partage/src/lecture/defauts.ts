/**
 * Réglages de lecture par défaut, bornes, normalisation et variables CSS — lot L2-B.
 *
 * Andika par défaut (v2 § 9.3). L'interlettrage part à `0.06 em` — au-dessus du normal, en
 * dessous du maximum : D19 dit que c'est probablement le vrai levier, et que la transposition
 * du corpus dyslexique à un lecteur débutant reste une HYPOTHÈSE. On part au milieu, on mesure.
 *
 * PLACEHOLDER — la valeur de départ est à valider par la mesure, pas par la conviction
 * (question Q1 du contrat des features v2 § 9, consignée dans `Docs/questions-en-attente.md`).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER PORTE DES CONSTANTES ALORS QUE C2 INTERDIT LES VALEURS EN DUR.
 *
 * C2 vise « toute valeur pédagogique, tout seuil de récompense, tout délai d'aide » : ce qui
 * sera **recalibré par la mesure du jeu** et qui doit donc rester lisible par le rejeu T2.
 * Les réglages de lecture ne sont pas de cette famille : ils vivent **par profil, en base**
 * (`reglages_lecture`, migration 002), et c'est la base qui fait foi dès qu'un profil existe.
 * Ce qui est écrit ici n'est que le point de départ d'un profil neuf et les bornes de
 * l'interface — l'équivalent typographique d'un `min`/`max` de `<input type="range">`.
 * Le protocole A/B de D19 déplace la valeur **en base**, jamais dans ce fichier.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
import type {
  BorneReglage,
  BornesReglages,
  CodePolice,
  FondLecture,
  ReglagesLecture,
} from "./types.js";

/** Les trois choix réellement rendus, dans l'ordre où l'écran de réglages les propose. */
export const POLICES: readonly CodePolice[] = ["andika", "opendyslexic", "verdana"];

const FONDS: readonly FondLecture[] = ["parchemin", "sombre"];

/**
 * Bornes de l'interface.
 *
 * `corpsPx` : 16 à 40 px, cité à la lettre de la v2 § 9.3.
 * `interlettrageEm` : 0 à 0.15 em. Le repère haut vient de Zorzi 2012 — +2,5 pt au corps 24
 *   vaut ≈ +0,10 em ; on laisse une marge au-dessus plutôt que de plafonner sur la mesure
 *   d'une seule étude.
 * `espacementMotsEm` : 0 à 0.5 em. La valeur de départ 0.08 est celle que `global.css` du
 *   socle v1 appliquait déjà à `.zone-lecture` — reprise, pas réinventée.
 * `interligne` : 1.2 à 2.4, sans unité.
 */
export const BORNES_REGLAGES: BornesReglages = {
  corpsPx: { min: 16, max: 40, pas: 1, defaut: 24 },
  interlettrageEm: { min: 0, max: 0.15, pas: 0.01, defaut: 0.06 },
  espacementMotsEm: { min: 0, max: 0.5, pas: 0.02, defaut: 0.08 },
  interligne: { min: 1.2, max: 2.4, pas: 0.1, defaut: 1.6 },
};

export const REGLAGES_PAR_DEFAUT: ReglagesLecture = {
  police: "andika",
  corpsPx: BORNES_REGLAGES.corpsPx.defaut,
  interlettrageEm: BORNES_REGLAGES.interlettrageEm.defaut,
  espacementMotsEm: BORNES_REGLAGES.espacementMotsEm.defaut,
  interligne: BORNES_REGLAGES.interligne.defaut,
  // D19 : la coloration syllabique est un appui de déchiffrage, et l'enfant déchiffre encore
  // (D18). Elle part ACTIVE ; le réglage permet de l'éteindre quand elle n'aide plus.
  colorationSyllabique: true,
  surlignageLigneCourante: false,
  regleDeLecture: false,
  fond: "parchemin",
};

/**
 * Ramène une valeur numérique dans sa borne.
 *
 * Ne rejette JAMAIS : une valeur absente, illisible, infinie ou hors bornes rend le défaut ou
 * la borne la plus proche. Un enfant ne doit pas pouvoir se bloquer hors du jeu en poussant un
 * curseur, et un enregistrement corrompu ne doit pas rendre un profil injouable.
 */
export function ramenerDansBorne(valeur: unknown, borne: BorneReglage): number {
  if (typeof valeur !== "number" || !Number.isFinite(valeur)) {
    return borne.defaut;
  }
  if (valeur < borne.min) {
    return borne.min;
  }
  if (valeur > borne.max) {
    return borne.max;
  }
  return valeur;
}

function booleenOuDefaut(valeur: unknown, defaut: boolean): boolean {
  return typeof valeur === "boolean" ? valeur : defaut;
}

/** Ramène chaque champ dans ses bornes. Ne rejette jamais : l'enfant ne doit pas être bloqué. */
export function normaliserReglages(bruts: Partial<ReglagesLecture>): ReglagesLecture {
  const police: CodePolice = POLICES.includes(bruts.police as CodePolice)
    ? (bruts.police as CodePolice)
    : REGLAGES_PAR_DEFAUT.police;

  const fond: FondLecture = FONDS.includes(bruts.fond as FondLecture)
    ? (bruts.fond as FondLecture)
    : REGLAGES_PAR_DEFAUT.fond;

  return {
    police,
    corpsPx: ramenerDansBorne(bruts.corpsPx, BORNES_REGLAGES.corpsPx),
    interlettrageEm: ramenerDansBorne(bruts.interlettrageEm, BORNES_REGLAGES.interlettrageEm),
    espacementMotsEm: ramenerDansBorne(bruts.espacementMotsEm, BORNES_REGLAGES.espacementMotsEm),
    interligne: ramenerDansBorne(bruts.interligne, BORNES_REGLAGES.interligne),
    colorationSyllabique: booleenOuDefaut(
      bruts.colorationSyllabique,
      REGLAGES_PAR_DEFAUT.colorationSyllabique,
    ),
    surlignageLigneCourante: booleenOuDefaut(
      bruts.surlignageLigneCourante,
      REGLAGES_PAR_DEFAUT.surlignageLigneCourante,
    ),
    regleDeLecture: booleenOuDefaut(bruts.regleDeLecture, REGLAGES_PAR_DEFAUT.regleDeLecture),
    fond,
  };
}

/**
 * Nombre écrit sans notation exponentielle et sans traîne de virgule flottante.
 * `0.060000000000000005em` dans une variable CSS est valide mais illisible dans une capture de
 * test et dans l'inspecteur ; on arrondit au millième, largement sous le pas de tout réglage.
 */
function nombreCss(valeur: number): string {
  return String(Math.round(valeur * 1000) / 1000);
}

/**
 * Les variables CSS à poser sur la zone de lecture. Un seul endroit les nomme.
 *
 * La famille de police n'est PAS ici : elle vit dans `client/src/lecture/polices.ts`, le seul
 * fichier qui connaisse les `@font-face` et le repli système. Ce module reste pur et
 * testable sans DOM ; il ne sait rien des fichiers WOFF2.
 */
export function variablesCss(reglages: ReglagesLecture): Readonly<Record<string, string>> {
  const sombre = reglages.fond === "sombre";
  return {
    "--lecture-corps": `${nombreCss(reglages.corpsPx)}px`,
    "--lecture-interlettrage": `${nombreCss(reglages.interlettrageEm)}em`,
    "--lecture-espacement-mots": `${nombreCss(reglages.espacementMotsEm)}em`,
    "--lecture-interligne": nombreCss(reglages.interligne),
    // Le fond sombre reste un fond de LECTURE : encre claire sur fond profond, jamais du noir
    // pur — le contraste maximal fatigue davantage qu'il n'aide (v2 § 9.3, « au calme »).
    "--lecture-fond": sombre ? "var(--trait)" : "var(--parchemin)",
    "--lecture-encre": sombre ? "var(--parchemin)" : "var(--trait)",
  };
}
