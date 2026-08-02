/**
 * Un nœud `trace` de bout en bout — annexe T § T3, contrat gelé § 3.3 (lot L2-C).
 *
 * On arrive, on choisit un profil, on entre dans `galeries-01`, et **on grave la lettre avec
 * le doigt** — pas avec `repondre`. Puis on vérifie les deux choses que ce moteur seul doit
 * garantir :
 *   • `data-axe` porte **un seul axe**, jamais deux (D23) ;
 *   • un tracé miroir journalise l'axe **sans jamais produire d'écran d'échec** (R14).
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE les attributs `data-*` du contrat § 7.
 *
 * La navigation carte → nœud passe par `window.__test.allerAuNoeud()` : le contrat ne définit
 * aucun attribut de nœud sur la carte. Même choix, même motif qu'en `parcours-nominal`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

function lire<T>(chemin: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(chemin, RACINE)), 'utf8')) as T;
}

const fixtureProfil = lire<Record<string, unknown>>('tests/fixtures/profils/enfant.json');

interface TraitLu {
  readonly id: string;
  readonly points: readonly (readonly [number, number])[];
  readonly libelle: string;
}
interface LettreLue {
  readonly lettre: string;
  readonly traits: readonly TraitLu[];
}
const exercice = lire<{
  jeu: { contenu: { lettres: readonly LettreLue[]; paire: { axe: string } | null } };
}>('contenu/exercices/galeries/miroir-bd-01.json');
const contenu = exercice.jeu.contenu;

const bibliotheque = lire<{ lettres: readonly LettreLue[] }>(
  'contenu/modeles-lettres/minuscules.json',
);

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const NOEUD = 'galeries-01';

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): { readonly ecran: string; readonly etatMoteur: unknown };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

async function preparer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
  await page.evaluate(
    async ({ fixture, graine, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT },
  );
}

/**
 * Convertit les points d'un trait, exprimés dans le `viewBox` du modèle, en coordonnées
 * d'écran — via `getScreenCTM`, jamais par une règle de trois écrite dans le test.
 *
 * Même leçon que `pointDeTap` en `parcours-nominal` : c'est le POINT qui décide, et le seul
 * moyen honnête de connaître ce point est de le demander au navigateur.
 */
async function enCoordonneesEcran(
  page: Page,
  points: readonly (readonly [number, number])[],
): Promise<{ x: number; y: number }[]> {
  const resultat = await page.evaluate((liste) => {
    const scene = document.querySelector('[data-scene="trace"]') as SVGSVGElement | null;
    if (scene === null) return null;
    const matrice = scene.getScreenCTM();
    if (matrice === null) return null;
    return liste.map(([x, y]) => {
      const ecran = new DOMPoint(x, y).matrixTransform(matrice);
      return { x: ecran.x, y: ecran.y };
    });
  }, points as (readonly [number, number])[]);

  if (resultat === null) {
    throw new Error('la scène de tracé est absente ou sans matrice écran : aucun doigt ne peut y écrire');
  }
  return resultat;
}

/** Un geste réel au doigt : contact, déplacements, relâchement. */
async function tracer(page: Page, points: readonly (readonly [number, number])[]): Promise<void> {
  await page.locator('[data-scene="trace"]').scrollIntoViewIfNeeded();
  const ecran = await enCoordonneesEcran(page, points);
  const premier = ecran[0];
  if (premier === undefined) return;
  await page.mouse.move(premier.x, premier.y);
  await page.mouse.down();
  for (const point of ecran.slice(1)) await page.mouse.move(point.x, point.y);
  await page.mouse.up();
}

async function entrerDansLeNoeud(page: Page): Promise<void> {
  await page.evaluate(async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud), NOEUD);
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
  await expect(page.locator('[data-moteur="trace"]')).toBeVisible();
}

test.describe('parcours trace', () => {
  test('un nœud `trace` de bout en bout, un seul axe, aucun écran d’échec', async ({ page }) => {
    await preparer(page);

    const carteProfil = page.getByText(String(fixtureProfil['prenom']), { exact: false }).first();
    await carteProfil.click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();

    await entrerDansLeNoeud(page);

    // ── D23 : UN axe, jamais deux. C'est l'assertion centrale de ce fichier.
    const axe = await page.locator('[data-moteur="trace"]').getAttribute('data-axe');
    expect(axe).toBe(contenu.paire?.axe);
    expect(String(axe).trim().split(/\s+/).length).toBe(1);

    // ── tous les traits attendent d'être tracés
    const nbTraits = await page.locator('[data-trait]').count();
    expect(nbTraits).toBe(contenu.lettres[0]?.traits.length);
    expect(await page.locator('[data-trait][data-trait-etat="trace"]').count()).toBe(0);

    // ── UN TRACÉ MIROIR D'ABORD : l'enfant grave un `d` alors qu'on demande un `b`.
    //    Il doit être refusé, journaliser l'axe, et ne produire aucun écran d'échec.
    const traitAttendu = contenu.lettres[0]?.traits[0];
    const jumeau = bibliotheque.lettres
      .find((l) => l.lettre === 'd')
      ?.traits.find((t) => t.libelle === traitAttendu?.libelle);
    expect(jumeau, 'le trait jumeau du `d` doit exister dans la bibliothèque').toBeDefined();

    await tracer(page, jumeau!.points);

    await expect(page.locator(`[data-trait="${traitAttendu?.id}"]`)).toHaveAttribute(
      'data-trait-etat',
      'en-cours',
    );
    await expect(page.locator('[data-moteur="trace"]')).toHaveAttribute(
      'data-axe-confondu',
      String(contenu.paire?.axe),
    );
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);

    // ── PUIS ON GRAVE JUSTE, lettre après lettre, trait après trait.
    //
    // ─────────────────────────────────────────────────────────────────────────────────────
    // CORRECTION D'INTÉGRATION — le sondage ci-dessous ne pouvait pas aboutir sur le DERNIER
    // trait d'une lettre, et il échouait donc systématiquement dès `b-panse`.
    //
    // `MoteurTrace` ne rend QUE la lettre courante — ce fichier l'affirme lui-même vingt
    // lignes plus haut (`expect(nbTraits).toBe(contenu.lettres[0]?.traits.length)`). Quand le
    // dernier trait d'une lettre est gravé, la lettre suivante prend la scène et le
    // `[data-trait]` que l'on interrogeait DISPARAÎT. Mesuré au diagnostic, sortie citée :
    //
    //   locator.getAttribute: Test timeout exceeded.
    //     - waiting for locator('[data-trait="b-panse"]')
    //
    // Le trait était bel et bien gravé : la page montrait déjà « Trace la lettre d ». C'est
    // l'observation qui était impossible, pas le comportement qui était faux. On ajoute donc
    // le seul état manquant — « la lettre a été quittée » —, et **uniquement pour le dernier
    // trait d'une lettre**, là où il est le seul observable. Pour tous les autres traits,
    // l'exigence reste `data-trait-etat="trace"`, inchangée.
    // ─────────────────────────────────────────────────────────────────────────────────────
    for (const lettre of contenu.lettres) {
      for (const [rang, trait] of lettre.traits.entries()) {
        if ((await page.locator('[data-ecran="recompense"]').count()) > 0) break;
        const dernierDeLaLettre = rang === lettre.traits.length - 1;
        await tracer(page, trait.points);
        // On attend un ÉTAT : le trait est gravé, la lettre est passée, ou la récompense est là.
        await expect
          .poll(async () => {
            if ((await page.locator('[data-ecran="recompense"]').count()) > 0) return 'recompense';
            if ((await page.locator(`[data-trait="${trait.id}"]`).count()) > 0) {
              return (
                (await page.locator(`[data-trait="${trait.id}"]`).getAttribute('data-trait-etat')) ??
                'absent'
              );
            }
            const affichee = await page
              .locator('[data-moteur="trace"]')
              .getAttribute('data-lettre');
            return dernierDeLaLettre && affichee !== lettre.lettre ? 'lettre-suivante' : 'absent';
          })
          .toMatch(/^(trace|recompense|lettre-suivante)$/);
        expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
      }
    }

    // ── la session finit sur une réussite, toujours (R14, v2 § 5.4)
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);

    // ── et ça reste après rechargement : le journal fait foi
    await page.reload();
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
  });
});
