/**
 * La zone de lecture montée isolément — lot L2-B, annexe T § T1.
 *
 * Ce que ce fichier défend, et ce qu'il ne défend pas.
 *
 * Il DÉFEND l'idée que **chaque réglage produit une propriété CSS mesurable**. C'est le seul
 * moyen d'attraper le mode d'échec le plus vicieux de ce lot : un réglage qui s'enregistre, qui
 * s'affiche dans l'écran de réglages, et qui ne change rien à l'écran de l'enfant. Personne ne
 * le verrait — c'est exactement le « détecteur qui déclare un poids qu'il n'applique jamais ».
 *
 * Il ne défend PAS l'apparence : c'est le travail de `tests/visuel/polices.spec.ts`, qui est
 * seul à rendre du vrai texte avec de vraies polices.
 *
 * Aucun réseau : le lexique d'exceptions est INJECTÉ (`fixerLexiqueSyllabation`), jamais
 * chargé. Annexe T § 2.3.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ZoneDeLecture, styleDeLecture } from "@client/lecture/ZoneDeLecture";
import { aplatirLexique, fixerLexiqueSyllabation } from "@client/lecture/TexteSyllabe";
import { REGLAGES_PAR_DEFAUT } from "@pierre/partage/lecture";
import type { ReglagesLecture } from "@pierre/partage/lecture";

import { lireJson } from "../configuration/preparation.js";

const LEXIQUE = aplatirLexique(lireJson("contenu/referentiel/syllabation-exceptions.json"));

/** Le nœud racine de la zone. Il porte les deux attributs du contrat § 7 et tout le style. */
function racine(): HTMLElement {
  const trouve = document.querySelector<HTMLElement>('[data-lecture="oui"]');
  if (trouve === null) {
    throw new Error("Aucune zone de lecture montée.");
  }
  return trouve;
}

function reglages(delta: Partial<ReglagesLecture> = {}): ReglagesLecture {
  return { ...REGLAGES_PAR_DEFAUT, ...delta };
}

beforeEach(() => {
  fixerLexiqueSyllabation(LEXIQUE);
});

afterEach(() => {
  cleanup();
});

describe("les attributs du contrat § 7", () => {
  it('porte `data-lecture="oui"` et `data-police`', () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ police: "opendyslexic" })} />);
    expect(racine().dataset["lecture"]).toBe("oui");
    expect(racine().dataset["police"]).toBe("opendyslexic");
  });

  it("change `data-police` quand le réglage change — pas seulement le style", () => {
    const { rerender } = render(
      <ZoneDeLecture texte="Le chat dort." reglages={reglages({ police: "andika" })} />,
    );
    expect(racine().dataset["police"]).toBe("andika");
    rerender(
      <ZoneDeLecture texte="Le chat dort." reglages={reglages({ police: "opendyslexic" })} />,
    );
    expect(racine().dataset["police"]).toBe("opendyslexic");
  });
});

describe("chaque réglage produit une propriété CSS mesurable", () => {
  it("le corps devient `font-size` ET la variable `--lecture-corps`", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ corpsPx: 36 })} />);
    const style = racine().style;
    expect(style.getPropertyValue("--lecture-corps")).toBe("36px");
    expect(style.fontSize).toBe("var(--lecture-corps)");
  });

  it("l’interlettrage devient `letter-spacing` — le levier le plus prouvé de D19", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ interlettrageEm: 0.12 })} />);
    const style = racine().style;
    expect(style.getPropertyValue("--lecture-interlettrage")).toBe("0.12em");
    expect(style.letterSpacing).toBe("var(--lecture-interlettrage)");
  });

  it("l’espacement des mots devient `word-spacing`", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ espacementMotsEm: 0.3 })} />);
    const style = racine().style;
    expect(style.getPropertyValue("--lecture-espacement-mots")).toBe("0.3em");
    expect(style.wordSpacing).toBe("var(--lecture-espacement-mots)");
  });

  it("l’interligne devient `line-height`, sans unité", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ interligne: 2.2 })} />);
    const style = racine().style;
    expect(style.getPropertyValue("--lecture-interligne")).toBe("2.2");
    expect(style.lineHeight).toBe("var(--lecture-interligne)");
  });

  it("le fond sombre inverse encre et parchemin", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ fond: "sombre" })} />);
    const style = racine().style;
    expect(style.getPropertyValue("--lecture-fond")).toBe("var(--trait)");
    expect(style.getPropertyValue("--lecture-encre")).toBe("var(--parchemin)");
  });

  it("la police devient une VRAIE pile CSS, jamais le code technique", () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ police: "opendyslexic" })} />);
    const famille = racine().style.getPropertyValue("--lecture-famille");
    expect(famille).toContain("OpenDyslexic");
    // Repli sur Andika : une police absente ne doit jamais rendre un texte illisible.
    expect(famille).toContain("Andika");
    expect(famille).not.toBe("opendyslexic");
  });

  it("les quatre mesures sont TOUTES distinctes entre deux réglages différents", () => {
    // Le test qui attrape le copier-coller : quatre variables qui liraient la même valeur
    // passeraient chacun des cas ci-dessus et seraient pourtant fausses.
    const un = styleDeLecture(
      reglages({ corpsPx: 20, interlettrageEm: 0.02, espacementMotsEm: 0.04, interligne: 1.3 }),
    );
    const deux = styleDeLecture(
      reglages({ corpsPx: 38, interlettrageEm: 0.14, espacementMotsEm: 0.42, interligne: 2.3 }),
    );
    for (const cle of [
      "--lecture-corps",
      "--lecture-interlettrage",
      "--lecture-espacement-mots",
      "--lecture-interligne",
    ]) {
      expect(un[cle]).not.toBe(deux[cle]);
    }
  });
});

describe("coloration syllabique alternée", () => {
  it("marque chaque segment d’un `data-syllabe` valant 0 ou 1, en alternance", () => {
    render(<ZoneDeLecture texte="banane" reglages={reglages({ colorationSyllabique: true })} />);
    const segments = [...document.querySelectorAll("[data-syllabe]")];
    expect(segments.map((n) => n.textContent)).toEqual(["ba", "na", "ne"]);
    expect(segments.map((n) => (n as HTMLElement).dataset["syllabe"])).toEqual(["0", "1", "0"]);
  });

  it("applique le lexique d’exceptions injecté, et le déclare `certain`", () => {
    render(<ZoneDeLecture texte="feuilles" reglages={reglages()} />);
    const segments = [...document.querySelectorAll("[data-syllabe]")] as HTMLElement[];
    expect(segments.map((n) => n.textContent)).toEqual(["feuilles"]);
    expect(segments[0]?.dataset["certain"]).toBe("oui");
  });

  it("marque `certain: non` un mot découpé par la seule règle — Q2, à compter avant de trancher", () => {
    render(<ZoneDeLecture texte="banane" reglages={reglages()} />);
    const segments = [...document.querySelectorAll("[data-syllabe]")] as HTMLElement[];
    expect(segments.every((n) => n.dataset["certain"] === "non")).toBe(true);
  });

  it("garde les segments dans le DOM quand la coloration est éteinte — seul `data-syllabes` change", () => {
    render(<ZoneDeLecture texte="banane" reglages={reglages({ colorationSyllabique: false })} />);
    expect(racine().dataset["syllabes"]).toBe("non");
    expect(document.querySelectorAll("[data-syllabe]").length).toBe(3);
  });

  it("ne perd jamais une lettre : le texte accessible rend le mot entier", () => {
    render(<ZoneDeLecture texte="maîtresse" reglages={reglages()} />);
    const segments = [...document.querySelectorAll("[data-syllabe]")];
    expect(segments.map((n) => n.textContent).join("")).toBe("maîtresse");
    // Le mot entier reste lisible par une synthèse vocale : les segments sont `aria-hidden`.
    expect(document.querySelector(".lecture-accessible")?.textContent).toBe("maîtresse");
    expect(segments.every((n) => n.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("met en graisse les mots cibles, sans jamais les colorer en alerte", () => {
    render(<ZoneDeLecture texte="Le pull est bleu." reglages={reglages()} motsCles={["bleu"]} />);
    const cible = document.querySelector<HTMLElement>('[data-mot="bleu."]');
    expect(cible?.dataset["cible"]).toBe("oui");
    expect(cible?.style.fontWeight).toBe("700");
    expect(cible?.style.color).toBe("");
  });
});

describe("règle de lecture et surlignage de la ligne courante", () => {
  const DEUX_LIGNES = "Le chat dort.\nIl fait beau.";

  it("n’expose aucune ligne tapable tant qu’aucun guidage n’est actif — R16", () => {
    render(<ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages()} />);
    expect(document.querySelectorAll(".ligne-lecture-tapable").length).toBe(0);
    expect(document.querySelectorAll("[data-ligne]").length).toBe(2);
  });

  it("rend les lignes tapables dès que le surlignage est actif", () => {
    render(
      <ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages({ surlignageLigneCourante: true })} />,
    );
    expect(document.querySelectorAll(".ligne-lecture-tapable").length).toBe(2);
    expect(document.querySelector<HTMLElement>('[data-ligne="0"]')?.dataset["ligneCourante"]).toBe(
      "oui",
    );
  });

  it("déplace la ligne courante d’un tap, sans jamais l’enfermer", () => {
    render(
      <ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages({ surlignageLigneCourante: true })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lire la ligne 2" }));
    expect(document.querySelector<HTMLElement>('[data-ligne="1"]')?.dataset["ligneCourante"]).toBe(
      "oui",
    );
    expect(document.querySelector<HTMLElement>('[data-ligne="0"]')?.dataset["ligneCourante"]).toBe(
      "non",
    );
  });

  it("affiche la règle et ses deux grandes cibles quand elle est activée", () => {
    render(<ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages({ regleDeLecture: true })} />);
    expect(document.querySelector('[data-regle="oui"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Ligne précédente" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ligne suivante" })).toBeDefined();
  });

  it("désactive « précédente » sur la première ligne et « suivante » sur la dernière — aucune impasse", () => {
    render(<ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages({ regleDeLecture: true })} />);
    const precedente = screen.getByRole("button", {
      name: "Ligne précédente",
    }) as HTMLButtonElement;
    const suivante = screen.getByRole("button", { name: "Ligne suivante" }) as HTMLButtonElement;
    expect(precedente.disabled).toBe(true);
    expect(suivante.disabled).toBe(false);

    fireEvent.click(suivante);
    expect(
      (screen.getByRole("button", { name: "Ligne suivante" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Ligne précédente" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("n’affiche aucune règle quand le réglage est éteint", () => {
    render(<ZoneDeLecture texte={DEUX_LIGNES} reglages={reglages({ regleDeLecture: false })} />);
    expect(document.querySelector('[data-regle="oui"]')).toBeNull();
  });
});

describe("les règles non négociables", () => {
  it('n’émet JAMAIS `data-etat="echec"` — R14', () => {
    render(<ZoneDeLecture texte="Le chat dort." reglages={reglages({ regleDeLecture: true })} />);
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it("rend du texte lisible sans aucun réglage — le contexte a un défaut, pas un `null`", () => {
    render(<ZoneDeLecture texte="Le chat dort." />);
    expect(racine().dataset["police"]).toBe("andika");
    expect(racine().style.getPropertyValue("--lecture-corps")).toBe("24px");
  });

  it("découpe les lignes sur les seuls sauts de ligne, jamais ailleurs", () => {
    render(<ZoneDeLecture texte={"a\nb\nc"} reglages={reglages()} />);
    expect(document.querySelectorAll("[data-ligne]").length).toBe(3);
  });
});
