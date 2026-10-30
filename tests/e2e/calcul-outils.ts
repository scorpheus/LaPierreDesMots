/**
 * Outils du calcul (premier jet, Docs/maths-calcul-premier-jet-2026-10-09.md) : ouvrir le jeu
 * comme l'enfant, lire la réponse attendue dans le DOM, et MESURER la tenue à l'écran.
 * Partagés par `parcours-calcul.spec.ts` et la sonde `bac-a-sable/maths-calcul/`.
 */
import { expect, type Page } from '@playwright/test';

/** Du campement (ou de la carte) jusqu'au jeu de calcul, par les vrais boutons. */
export async function ouvrirCalcul(page: Page, activite: 'gue' | 'pose'): Promise<void> {
  if (await page.locator('[data-ecran="carte"]').isVisible()) {
    await page.locator('[data-vers="campement"]').click();
  }
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('entree-calcul')).toBeVisible();
  await page.locator(`[data-calcul-entree="${activite}"]`).click();
  await expect(page.locator(`[data-calcul="${activite}"]`)).toBeVisible();
}

export interface ReponseCourante {
  readonly etape: string;
  readonly forme: 'ligne' | 'colonnes';
  readonly valeur: number;
  /** Dans l'ordre où l'enfant les pose : gauche → droite en ligne, unités puis dizaines posé. */
  readonly chiffres: readonly number[];
  readonly aChoisir: boolean;
}

/**
 * La réponse de l'étape affichée, déduite de son identifiant publié (`data-calcul-etape`) :
 * `gue-tables:7+?=12`, `pose-sans-retenue:34+25`. Aucune connaissance du générateur.
 */
export async function reponseCourante(page: Page): Promise<ReponseCourante> {
  const racine = page.locator('[data-calcul]');
  const etape = (await racine.getAttribute('data-calcul-etape')) ?? '';
  expect(etape, 'une étape est affichée').not.toBe('');
  const aChoisir = (await page.locator('[data-moteur="calcul"]').getAttribute('data-calcul-saisie')) === 'choix';
  const corps = etape.slice(etape.indexOf(':') + 1);
  if (etape.startsWith('pose-')) {
    const [haut, bas] = corps.split('+').map(Number) as [number, number];
    const somme = haut + bas;
    return { etape, forme: 'colonnes', valeur: somme, chiffres: [somme % 10, Math.floor(somme / 10)], aChoisir };
  }
  const motif = /^(\?|\d+)([+-])(\?|\d+)=(\?|\d+)$/u.exec(corps);
  expect(motif, `égalité lisible : ${corps}`).not.toBeNull();
  const [, a, op, b, c] = motif!;
  const n = (x: string): number => Number(x);
  const valeur = c === '?' ? (op === '+' ? n(a!) + n(b!) : n(a!) - n(b!))
    : b === '?' ? (op === '+' ? n(c) - n(a!) : n(a!) - n(c))
      : (op === '+' ? n(c) - n(b!) : n(c) + n(b!));
  return { etape, forme: 'ligne', valeur, chiffres: [...String(valeur)].map(Number), aChoisir };
}

export interface MesureEcran {
  readonly format: string;
  /** `scrollHeight − innerHeight` du document : 0 attendu. */
  readonly defilementVertical: number;
  readonly defilementHorizontal: number;
  /** Plus petit côté parmi les commandes visibles de l'écran de calcul (px CSS). */
  readonly plusPetiteCible: number;
  readonly ciblePlusPetite: string;
  /** Éléments à voir ou à toucher qui sortent de l'écran (S1). */
  readonly horsEcran: readonly string[];
  /** Commandes dont le centre ne reçoit pas le doigt (S10). */
  readonly recouvertes: readonly string[];
}

/** Mesure l'état affiché, sans rien toucher. */
export async function mesurerEcranCalcul(page: Page): Promise<MesureEcran> {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const racine = document.querySelector('[data-calcul]')!;
    const nom = (e: Element): string => {
      const d = e as HTMLElement;
      return d.dataset['chiffre'] !== undefined ? `touche ${d.dataset['chiffre']}`
        : d.dataset['choix'] !== undefined ? `choix ${d.dataset['choix']}`
          : (d.getAttribute('aria-label') ?? d.textContent ?? e.tagName).trim().slice(0, 40);
    };
    const commandes = [...racine.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    let plusPetite = Number.POSITIVE_INFINITY;
    let laquelle = '';
    const recouvertes: string[] = [];
    for (const b of commandes) {
      const r = b.getBoundingClientRect();
      const cote = Math.min(r.width, r.height);
      if (cote < plusPetite) { plusPetite = cote; laquelle = nom(b); }
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const touche = document.elementFromPoint(x, y);
      if (touche === null || !(touche === b || b.contains(touche))) recouvertes.push(nom(b));
    }
    const aVoir = [
      ...commandes,
      ...racine.querySelectorAll('.activite-consigne-texte, .calcul-operation, .calcul-case, .gobi svg[role="img"], [data-calcul-reussite]'),
    ];
    const horsEcran = aVoir.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.top < -0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5;
    }).map(nom);
    const doc = document.documentElement;
    return {
      format: `${String(innerWidth)}×${String(innerHeight)}`,
      defilementVertical: Math.max(0, doc.scrollHeight - innerHeight),
      defilementHorizontal: Math.max(0, doc.scrollWidth - innerWidth),
      plusPetiteCible: Math.round(plusPetite * 10) / 10,
      ciblePlusPetite: laquelle,
      horsEcran,
      recouvertes,
    };
  });
}

/** Pose la bonne réponse de l'étape courante : au doigt (tap) ou au clavier physique. */
export async function jouerEtape(page: Page, moyen: 'doigt' | 'clavier'): Promise<void> {
  const avant = await reponseCourante(page);
  if (moyen === 'doigt') {
    if (avant.aChoisir) await page.locator(`[data-choix="${String(avant.valeur)}"]`).tap();
    else for (const chiffre of avant.chiffres) await page.locator(`[data-chiffre="${String(chiffre)}"]`).tap();
  } else {
    // Rangée du haut puis pavé numérique, en alternance : les deux doivent marcher.
    let rang = 0;
    for (const chiffre of avant.chiffres) {
      await page.keyboard.press(rang % 2 === 0 ? `Digit${String(chiffre)}` : `Numpad${String(chiffre)}`);
      rang += 1;
    }
  }
  // Attendre un état : l'étape a changé, ou la partie est finie.
  await expect.poll(async () => {
    const racine = page.locator('[data-calcul]');
    return (await racine.getAttribute('data-calcul-termine')) === 'oui'
      || (await racine.getAttribute('data-calcul-etape')) !== avant.etape;
  }, { message: `l’étape ${avant.etape} est réussie` }).toBe(true);
}
