/**
 * L'EXIGENCE COMMUNE AUX DIX ÉCRANS — écrite UNE fois, donnée par son chemin.
 *
 * `Docs/audit-qa.md` § 7, lot QA-2 : « Une exigence commune, à écrire une fois sur disque et à
 * donner par son chemin (jamais recopiée dans dix briefs) : *tout écran rend au moins un
 * élément qui change `data-ecran`, et aucune cible tapable n'est déclarée sous 64 px.* »
 *
 * Ce fichier n'est pas une suite : `vitest.config.ts` ne collecte que
 * `tests/composants/**\/*.test.{ts,tsx}`. C'est un module de soutien, importé par les dix
 * `tests/composants/Ecran*.test.tsx`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * DEUX PROPRIÉTÉS, ET AUCUNE N'EST UN COMPTAGE D'OCCURRENCES (D48)
 *
 * 1. **UNE SORTIE QUI RÉPOND.** `auditerLesSorties` ne compte pas les éléments interactifs —
 *    c'est mot pour mot ce que D48 condamne, et c'est l'erreur que `tests/e2e/singe.spec.ts`
 *    porte encore dans son message (audit § 6.1). Il **ESSAIE chaque objet** : il monte
 *    l'écran, tape UN contrôle, regarde si l'écran a été quitté, démonte, et recommence sur
 *    le suivant. Un écran dont douze boutons sont vivants mais dont aucun ne mène ailleurs
 *    échoue ici, et c'est exactement le défaut qui a bloqué le père dans les Galeries.
 *
 *    Le remontage entre deux essais n'est pas une précaution de style : sans lui, le troisième
 *    contrôle serait tapé sur l'état laissé par les deux premiers, et un écran pourrait passer
 *    grâce à une séquence que personne ne joue jamais.
 *
 * 2. **AUCUNE CIBLE SOUS 64 px (R16).** `auditerLesCibles` énumère les objets tapables du DOM
 *    monté et exige de CHACUN qu'il DÉCLARE sa taille par l'un des trois moyens que le dépôt
 *    s'est donnés — et par aucun autre :
 *
 *      (a) la classe `.cible` — la déclaration unique de R16, `client/src/styles/global.css`,
 *          `min-inline-size: var(--cible-min)` / `min-block-size: var(--cible-min)`, où
 *          `--cible-min: 64px` ;
 *      (b) un `min-inline-size` ou `min-block-size` en ligne valant `var(--cible-min)` ou
 *          ≥ 64 px — le recours des champs de formulaire, qu'une classe de bouton habillerait
 *          mal (`EcranProfils`, le champ « Ton prénom ») ;
 *      (c) une forme SVG de rayon ≥ 32 unités `viewBox`, soit un diamètre ≥ 64 — les prises de
 *          la carte du monde, qui n'ont ni boîte CSS ni classe.
 *
 *    ⚠ **C'est un audit de DÉCLARATION, et il le dit.** happy-dom ne calcule aucune mise en
 *    page : `getBoundingClientRect()` y rend des zéros, et un test qui prétendrait mesurer des
 *    pixels ici mentirait. La géométrie réelle est mesurée par `tests/qualite/a11y.spec.ts`,
 *    sous un vrai moteur de rendu. Les deux sont nécessaires : celui-ci attrape la cible dont
 *    personne n'a déclaré la taille — le cas le plus fréquent, et le seul qu'un test unitaire
 *    peut voir sans navigateur.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { fireEvent } from '@testing-library/react';
import { expect } from 'vitest';

/** R16, valeur unique du dépôt (`--cible-min`, `client/src/styles/global.css`). */
export const CIBLE_MIN_PX = 64;

/**
 * Ce qui compte comme objet tapable.
 *
 * `[tabindex]` est inclus parce que la carte du monde donne le focus à des `<circle>` : un
 * élément atteignable au clavier est un élément qu'un doigt vise aussi.
 */
export const SELECTEUR_TAPABLE =
  'button, [role="button"], a[href], input, select, textarea, [tabindex]';

/** Un repère lisible dans un message d'échec. Jamais un index : un index ne se cherche pas. */
export function repere(element: Element): string {
  const attributs = [...element.attributes]
    .filter((attribut) => attribut.name.startsWith('data-') || attribut.name === 'aria-label')
    .map((attribut) => `${attribut.name}="${attribut.value}"`)
    .join(' ');
  const texte = (element.textContent ?? '').trim().replace(/\s+/gu, ' ').slice(0, 40);
  return `<${element.tagName.toLowerCase()}${attributs === '' ? '' : ` ${attributs}`}> « ${texte} »`;
}

// ───────────────────────────────────────────────────────────────────── R16, les cibles

export interface EcartCible {
  readonly repere: string;
  readonly motif: string;
}

export interface RapportCibles {
  readonly population: number;
  readonly conformes: number;
  readonly ecarts: readonly EcartCible[];
}

/** Vrai quand l'élément, ou l'un de ses parents, est retiré à l'accessibilité et au doigt. */
function horsDePortee(element: Element): boolean {
  if (element.closest('[aria-hidden="true"]') !== null) {
    return true;
  }
  return element.getAttribute('tabindex') === '-1';
}

/**
 * Ce qui est HORS du périmètre d'un écran : le mini-jeu monté dans sa coquille.
 *
 * ── L'ARBITRAGE, ET IL EST MESURÉ, PAS SUPPOSÉ ──────────────────────────────────────────────
 * `EcranNoeud` monte un moteur, et ce moteur porte ses propres cibles. Les compter ici ferait
 * deux choses, toutes deux fausses :
 *
 *   • **un faux défaut.** Les godets de la palette `colorie` déclarent leur taille dans la
 *     feuille locale de `PaletteConsigne.tsx` — mesuré, sortie citée :
 *         client/src/moteurs/colorie/PaletteConsigne.tsx:21  const COTE_GODET_PX = 72;
 *     72 px, donc conformes ; simplement déclarés par une classe qui n'est pas `.cible`. Un
 *     audit qui les relèverait crierait sur du code juste, et un audit qui crie faux finit
 *     par ne plus être lu.
 *   • **un doublon.** Les quatorze moteurs ont chacun leur test de composant (14/14, audit
 *     § 5.1) et `tests/qualite/a11y.spec.ts` mesure leur géométrie RÉELLE sous un vrai moteur
 *     de rendu. Le lot QA-2 ferme la zone des ÉCRANS ; il ne re-teste pas les moteurs.
 *
 * Ce qui n'est PAS caché par cette exclusion, et qui est donc consigné plutôt que tu :
 * les prises de région de `colorie` (`[data-region-svg]`) ont un rayon calculé sur la
 * silhouette de la région — mesuré entre 25,7 et 30,9 unités `viewBox` sur l'exercice
 * `clairiere-ecole-01`, soit un diamètre de 51 à 62 unités. Le rapport unité/pixel du décor
 * n'est pas connu de ce niveau de test ; le fait est reporté dans
 * `Docs/questions-en-attente.md` (section QA-2) plutôt que jugé ici.
 */
export const HORS_ECRAN = '[data-moteur]';

/** Une longueur CSS déclare-t-elle au moins 64 px&nbsp;? `var(--cible-min)` compte. */
function longueurSuffisante(valeur: string): boolean {
  const propre = valeur.trim();
  if (propre === '') {
    return false;
  }
  if (propre.includes('--cible-min')) {
    return true;
  }
  const enPixels = /^(\d+(?:\.\d+)?)px$/u.exec(propre);
  if (enPixels !== null) {
    return Number(enPixels[1]) >= CIBLE_MIN_PX;
  }
  const enRem = /^(\d+(?:\.\d+)?)rem$/u.exec(propre);
  if (enRem !== null) {
    return Number(enRem[1]) * 16 >= CIBLE_MIN_PX;
  }
  return false;
}

/** Le motif de non-conformité, ou `null` si la cible déclare bien sa taille. */
function motifDEcart(element: Element): string | null {
  // (a) la classe `.cible` — la déclaration unique de R16.
  if (element.classList.contains('cible')) {
    return null;
  }

  // (c) une prise SVG : le rayon fait foi, en unités `viewBox`.
  const rayon = element.getAttribute('r');
  if (rayon !== null) {
    const valeur = Number(rayon);
    return Number.isFinite(valeur) && valeur * 2 >= CIBLE_MIN_PX
      ? null
      : `prise SVG de rayon ${rayon} : diamètre sous ${String(CIBLE_MIN_PX)} unités`;
  }

  // (b) une déclaration en ligne, pour ce qu'une classe de bouton habillerait mal.
  const style = (element as HTMLElement).style as CSSStyleDeclaration | undefined;
  if (style !== undefined) {
    const enLigne = [
      style.minInlineSize,
      style.minBlockSize,
      style.minWidth,
      style.minHeight,
      style.blockSize,
      style.inlineSize
    ];
    if (enLigne.some((valeur) => longueurSuffisante(String(valeur ?? '')))) {
      return null;
    }
  }

  return 'aucune taille déclarée : ni classe `.cible`, ni `min-*-size` ≥ 64 px, ni rayon ≥ 32';
}

/**
 * Énumère les objets tapables du DOM monté et vérifie que chacun DÉCLARE sa taille.
 *
 * Rend le rapport plutôt que d'assener : l'appelant imprime les deux comptes, comme D48 le
 * demande — « un agent qui rend “N occurrences” n'a pas répondu à “combien d'objets” ».
 */
export function auditerLesCibles(racine: ParentNode, exclure?: string): RapportCibles {
  const tous = [...racine.querySelectorAll(SELECTEUR_TAPABLE)].filter(
    (element) =>
      !horsDePortee(element) && (exclure === undefined || element.closest(exclure) === null)
  );
  const ecarts: EcartCible[] = [];
  for (const element of tous) {
    const motif = motifDEcart(element);
    if (motif !== null) {
      ecarts.push({ repere: repere(element), motif });
    }
  }
  return { population: tous.length, conformes: tous.length - ecarts.length, ecarts };
}

/**
 * Le cas prêt à l'emploi : R16 sur un écran monté, avec impression des deux comptes.
 *
 * `population > 0` est exigé : un écran qui ne rendrait aucune cible ferait passer cette
 * vérification à vide, et une vérification qui ne peut pas échouer est un mensonge dans le
 * rapport. Les deux seuls écrans sans cible du dépôt — l'écran d'attente — ne passent pas par
 * ici (voir `tests/composants/EcranChargement.test.tsx`, qui le dit et l'assume).
 */
export function exigerCibles64(
  nomEcran: string,
  racine: ParentNode,
  exclure?: string
): RapportCibles {
  const rapport = auditerLesCibles(racine, exclure);
  console.log(
    `[QA-2 · ${nomEcran}] R16 — cibles tapables : ${String(rapport.population)}, ` +
      `déclarées ≥ 64 px : ${String(rapport.conformes)}, écart : ${String(rapport.ecarts.length)}`
  );
  expect(rapport.population, `aucune cible tapable sur « ${nomEcran} » : rien n'est vérifié`)
    .toBeGreaterThan(0);
  expect(
    rapport.ecarts.map((ecart) => `${ecart.repere} → ${ecart.motif}`),
    `R16 sur « ${nomEcran} » : des cibles ne déclarent pas leur taille`
  ).toEqual([]);
  return rapport;
}

// ────────────────────────────────────────────────────────── la sortie, essayée objet par objet

export interface SondeEcran {
  /** La racine montée, telle que le test la construit. */
  readonly racine: ParentNode;
  /** Vrai quand l'écran a été quitté : rappel appelé, ou `EtatMagasin.ecran` changé. */
  aQuitte(): boolean;
}

export interface RapportSorties {
  /** Les objets tapables essayés, un par montage. */
  readonly essayes: number;
  /** Ceux dont le tap a réellement fait quitter l'écran. */
  readonly repondent: readonly string[];
  /** Ceux qui n'ont rien fait. Une information, jamais un échec : un réglage n'est pas une porte. */
  readonly inertes: readonly string[];
}

/**
 * ESSAIE chaque objet tapable, un montage neuf par objet, et rend ceux qui mènent ailleurs.
 *
 * `monter` doit produire un DOM neuf à chaque appel ; `demonter` doit le rendre vide. La
 * liste des objets est relevée sur un premier montage, puis retrouvée par son rang à chaque
 * montage suivant — ce qui suppose un écran DÉTERMINISTE, ce que l'annexe T § 2 garantit
 * (`Alea` et `Horloge` injectés, aucune donnée réseau non bouchonnée).
 */
export async function auditerLesSorties(
  monter: () => SondeEcran | Promise<SondeEcran>,
  demonter: () => void
): Promise<RapportSorties> {
  const premier = await monter();
  const total = [...premier.racine.querySelectorAll(SELECTEUR_TAPABLE)].filter(
    (element) => !horsDePortee(element)
  ).length;
  demonter();

  const repondent: string[] = [];
  const inertes: string[] = [];

  for (let rang = 0; rang < total; rang += 1) {
    const sonde = await monter();
    const objets = [...sonde.racine.querySelectorAll(SELECTEUR_TAPABLE)].filter(
      (element) => !horsDePortee(element)
    );
    const objet = objets[rang];
    if (objet === undefined) {
      demonter();
      continue;
    }
    const nom = repere(objet);
    fireEvent.click(objet);
    if (sonde.aQuitte()) {
      repondent.push(nom);
    } else {
      inertes.push(nom);
    }
    demonter();
  }

  return { essayes: total, repondent, inertes };
}

/**
 * Le cas prêt à l'emploi : « une sortie existe, ET elle répond ».
 *
 * Le message d'échec NOMME les objets essayés : sans cela, un écran sans issue rendrait
 * « attendu ≥ 1, reçu 0 » et laisserait chercher lequel des douze boutons aurait dû répondre.
 */
export async function exigerUneSortieQuiRepond(
  nomEcran: string,
  monter: () => SondeEcran | Promise<SondeEcran>,
  demonter: () => void
): Promise<RapportSorties> {
  const rapport = await auditerLesSorties(monter, demonter);
  console.log(
    `[QA-2 · ${nomEcran}] sorties — objets essayés : ${String(rapport.essayes)}, ` +
      `mènent ailleurs : ${String(rapport.repondent.length)}`
  );
  expect(rapport.essayes, `aucun objet tapable essayé sur « ${nomEcran} »`).toBeGreaterThan(0);
  expect(
    rapport.repondent.length,
    `AUCUNE SORTIE sur « ${nomEcran} » — ${String(rapport.essayes)} objets essayés, ` +
      `aucun ne quitte l'écran :\n  ${rapport.inertes.join('\n  ')}`
  ).toBeGreaterThan(0);
  return rapport;
}
