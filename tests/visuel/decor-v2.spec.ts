/**
 * Les décors v2, en images — T4, annexe T § 4. Lot N7, contrat de finition v3 § 4.7.
 *
 * ── CE QUE CE FICHIER FAIT, ET CE QU'IL NE FAIT PAS ─────────────────────────────────────────
 * Il photographie les deux décors redessinés par N7 **servis par le serveur réel**, à
 * l'échelle réelle de la tablette. C'est la seule mesure qui voit ce qu'aucun test unitaire ne
 * peut voir : le décor tel qu'il arrive à l'enfant, polices chargées, calques empilés, voile
 * de Grisaille posé.
 *
 * Il ne remplace PAS `tests/unitaires/decor-reconnaissable.test.ts`. Une capture ne dit jamais
 * POURQUOI elle a changé — elle dit seulement qu'elle a changé. Les propriétés qui font la
 * lisibilité (la maîtresse fait ≥ 1,35 fois un élève, le houppier est lobé, six grottes de six
 * formes) sont mesurées sur la géométrie, en unitaire, où l'échec NOMME la propriété perdue.
 * **Ici, l'assertion précède toujours la capture** : une image de référence toute seule ne
 * prouve rien.
 *
 * ── LES RÉFÉRENCES N'EXISTENT PAS ENCORE, ET C'EST DÉCLARÉ ──────────────────────────────────
 * D39 acte que les captures visuelles de référence **attendent le nouveau graphisme** et que
 * `test:visuel` reste rouge d'ici là. Les figer avant N3 (Gobi) serait les refaire aussitôt.
 *
 * Elles se produisent en un passage `npm run test:visuel -- --maj`, **à faire par
 * l'orchestrateur, après la vague 2**. Un agent ne met jamais à jour une référence de sa
 * propre initiative (CLAUDE.md) ; en créer une qui n'existe pas n'est pas une mise à jour,
 * mais l'ordre compte : figer avant que N3 ait livré ses stades reviendrait à photographier un
 * écran à moitié fini.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas — base `:memory:` vierge, `Alea`
// rembobiné, port réservé par le noyau. C’est lui qui remplace le `webServer` unique de
// `playwright.config.ts`, et c’est lui qui rend `fullyParallel` légitime.
import { expect, test } from '../harnais-serveur.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Le nœud de La Clairière qui monte le décor d'école — celui du défaut n° 5. */
const NOEUD_ECOLE = 'clairiere-01';

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
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
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT }
  );
}

test.describe('le décor v2 arrive entier jusqu’à l’enfant', () => {
  test('la cour d’école : 31 régions servies, tapables, et une maîtresse plus grande', async ({
    page,
  }) => {
    await preparer(page);
    await page.evaluate(
      async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud),
      NOEUD_ECOLE
    );
    await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();

    const scene = page.locator('[data-decor], [data-scene-svg]').first();
    await expect(scene).toBeVisible();

    // 1. Les 31 régions sont bien là. Le décor v2 en porte 31 ; un fichier resté en v1 en
    //    porterait 31 aussi — c'est le cas suivant qui les distingue.
    await expect(page.locator('[data-region-svg]')).toHaveCount(31);

    // 2. LE DÉCOR SERVI EST BIEN LA v2. On lit la géométrie dans le DOM plutôt que le nom du
    //    fichier : un habillage repointé sur la v2 mais servant l'ancien SVG donnerait le même
    //    nom de fichier dans la requête et un dessin d'avant à l'écran. La v2 est POLYGONALE :
    //    aucun de ses tracés ne contient de commande d'arc.
    const arcs = await page.locator('[data-region-source]').evaluateAll((noeuds) =>
      noeuds.filter((n) => /[Aa]\s*[\d.]/u.test(n.getAttribute('d') ?? '')).length
    );
    expect(arcs, 'des arcs subsistent : le décor servi n’est pas la v2').toBe(0);

    // 3. LA PROPRIÉTÉ QUI EST TOUT L'OBJET DU LOT, mesurée sur le rendu réel et non sur le
    //    fichier : la maîtresse occupe à l'écran au moins 1,35 fois la hauteur d'une élève.
    // ⚠ CE QUE CETTE FONCTION NE MESURAIT PAS — corrigé le 2026-08-03, sur retour de jeu du père
    // (« la maitresse a la tete dans le sol »).
    //
    // Elle prenait un `prefixe` et composait `[data-region-svg^="${prefixe}"]`. Les deux seuls
    // appels passaient `''`. Or **`[attr^=""]` ne désigne JAMAIS rien** : la spécification CSS
    // rend le sélecteur invalide-vide, pas universel. `boites` sortait donc vide, et
    // `Math.max(...[]) - Math.min(...[])` vaut `-Infinity`, d'où `-Infinity / -Infinity = NaN`
    // et `NaN >= 1.35` faux.
    //
    // Le cas échouait donc **toujours**, et surtout : il n'avait **jamais mesuré la propriété
    // qu'il porte**. C'est le troisième chiffre creux de la semaine, même famille que les seuils
    // de couverture qui n'appariaient aucun fichier — une assertion sur zéro élément.
    //
    // Le paramètre `prefixe` disparaît plutôt que d'être corrigé : un paramètre dont les deux
    // appels passent la valeur qui casse tout n'a pas de raison d'exister.
    const hauteurDe = async (suffixe: string): Promise<number> => {
      const boites = await page
        .locator(`[data-region-source$="${suffixe}"]`)
        .evaluateAll((noeuds) =>
          noeuds.map((n) => {
            const b = (n as SVGGraphicsElement).getBoundingClientRect();
            return [b.top, b.bottom] as const;
          })
        );
      // Sans ce garde, une faute de frappe dans le suffixe rendrait `NaN` et le cas échouerait
      // pour une raison fausse — exactement ce qu'on vient de corriger.
      expect(boites.length, `aucune région ne finit par « ${suffixe} »`).toBeGreaterThan(0);
      return Math.max(...boites.map(([, b]) => b)) - Math.min(...boites.map(([t]) => t));
    };
    const maitresse = await hauteurDe('maitresse');
    const eleve = await hauteurDe('fille-1');
    expect(
      maitresse / eleve,
      `maîtresse ${maitresse.toFixed(0)} px · élève ${eleve.toFixed(0)} px`
    ).toBeGreaterThanOrEqual(1.35);

    // ── ET ELLE EST DEBOUT SUR LE SOL, PAS DEDANS (R7) ────────────────────────────────────────
    // Le défaut trouvé en jouant : sa tête allait de y=368 à y=444 pour un sol qui commence à
    // y=400 — le haut du crâne dans le mur de l'école, le bas dans l'herbe. Aucune assertion ne
    // regardait la POSITION, seulement la taille ; le décor pouvait donc être absurde et vert.
    const hautDe = async (region: string): Promise<number> =>
      (await page.locator(`[data-region-source="${region}"]`).boundingBox())?.y ?? Number.NaN;
    const basDe = async (region: string): Promise<number> => {
      const boite = await page.locator(`[data-region-source="${region}"]`).boundingBox();
      return boite === null ? Number.NaN : boite.y + boite.height;
    };

    const horizon = await hautDe('herbe');
    const crane = await hautDe('cheveux-maitresse');
    const pieds = await basDe('jupe-maitresse');
    const solBas = await basDe('herbe');

    expect(crane, 'le sommet du crâne passe au-dessus de l’horizon').toBeGreaterThan(horizon);
    expect(pieds, 'les pieds dépassent du sol').toBeLessThanOrEqual(solBas);
    expect(
      pieds,
      'la maîtresse ne tient pas debout sur son propre sol'
    ).toBeGreaterThan(crane);

    // 4. L'objet de classe est servi, et il est tapable.
    await expect(page.locator('[data-region-svg="tableau"]')).toBeVisible();

    await expect(scene).toHaveScreenshot('decor-ecole-v2.png');
  });

  test('la carte du monde : six régions de six formes différentes', async ({ page }) => {
    await preparer(page);
    await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
    await expect(page.locator('[data-region-etat]')).toHaveCount(6);

    // La v1 dessinait six hexagones réguliers translatés. On compare les six chemins ramenés à
    // l'origine : deux régions identiques à la translation près sont une légende obligatoire,
    // c'est-à-dire du texte à déchiffrer.
    const empreintes = await page.locator('#calque-regions [data-region-svg]').evaluateAll((noeuds) =>
      noeuds.map((n) => {
        const d = n.getAttribute('d') ?? '';
        const points = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/gu)].map(
          (m) => [Number(m[1]), Number(m[2])] as const
        );
        if (points.length === 0) return d;
        const x0 = Math.min(...points.map(([x]) => x));
        const y0 = Math.min(...points.map(([, y]) => y));
        return points.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`).join(' ');
      })
    );
    // Le cas n'a de valeur que s'il a trouvé six formes à comparer.
    expect(empreintes).toHaveLength(6);
    expect(new Set(empreintes).size, 'deux régions de la carte ont la même forme').toBe(6);

    await expect(page.locator('[data-ecran="carte"]')).toHaveScreenshot('carte-monde-v2.png');
  });
});
