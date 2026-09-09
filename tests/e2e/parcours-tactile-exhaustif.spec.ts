/** Chaque exercice jusqu'au bout avec de vrais taps, profil agrandi et rotation en cours. */
import { test, expect } from './invariants.js';
import {
  appliquerReglagesLectureReels, entrerDansLeNoeud, etatDuJeu, moteursDeclares, noeudsLivres,
} from './qa-outils.js';
import { jalonDom, jouerProchainGesteDom, lireEtatDom, MOTEURS_GESTES_DOM, toucherPrise } from './gestes-dom.js';

const NOEUDS = noeudsLivres();
const FORMATS = [
  { nom: 'tablette', debut: { width: 800, height: 1100 }, tourne: { width: 1100, height: 700 } },
  { nom: 'telephone', debut: { width: 360, height: 640 }, tourne: { width: 640, height: 360 } },
] as const;

test('le pilote tactile couvre chaque moteur livré, activité libre comprise', () => {
  expect([...MOTEURS_GESTES_DOM].sort()).toEqual([...moteursDeclares()].sort());
  expect([...new Set(NOEUDS.map((noeud) => noeud.moteur))].sort()).toEqual([...MOTEURS_GESTES_DOM].sort());
  expect(NOEUDS.length).toBeGreaterThanOrEqual(76);
});

for (const format of FORMATS) {
  test.describe(`tactile exhaustif — ${format.nom}`, () => {
    for (const noeud of NOEUDS) {
      test(`${noeud.id} (${noeud.moteur}) se termine par ses prises réelles`, async ({ page }, info) => {
        const erreurs: string[] = [];
        page.on('pageerror', (erreur) => erreurs.push(erreur.message));
        await page.setViewportSize(format.debut);
        const prenom = `Tactile-${noeud.id}`;
        await appliquerReglagesLectureReels(page, prenom);
        await entrerDansLeNoeud(page, noeud.id, prenom);
        const profil = (await etatDuJeu(page)).profil;
        expect(profil, 'la tentative appartient à un vrai profil').not.toBeNull();
        // Interdire l'ancien raccourci, y compris dans une future aide importée.
        await page.evaluate(() => {
          const crochets = (window as unknown as { __test: { repondre: () => never } }).__test;
          crochets.repondre = () => { throw new Error('Campagne tactile : injection de réponse interdite'); };
        });
        let gestes = 0;
        const jalons: { avant: string; apres: string }[] = [];
        try {
        for (let tour = 0; tour < 256; tour += 1) {
          const racine = page.locator(`[data-moteur="${noeud.moteur}"]`);
          if (await racine.count() === 0 || await racine.getAttribute('data-termine') === 'oui') break;
          if (tour === 1) await page.setViewportSize(format.tourne);
          const avant = jalonDom(await lireEtatDom(page));
          await jouerProchainGesteDom(page, noeud.moteur, tour);
          gestes += 1;
          jalons.push({ avant, apres: jalonDom(await lireEtatDom(page)) });
          await expect.poll(async () => {
            if (await racine.count() === 0) return 'sortie';
            return jalonDom(await lireEtatDom(page));
          }, { message: `${noeud.id}, geste ${tour + 1} : le doigt fait réellement progresser le jeu` }).not.toBe(avant);
        }
        expect(gestes, 'au moins un geste doit avoir été réellement effectué').toBeGreaterThan(0);
        expect(gestes, 'aucune boucle infinie après 256 gestes').toBeLessThan(256);
        await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
        await expect.poll(async () => {
            const reponse = await page.request.get(`/api/profils/${encodeURIComponent(profil!)}/progression`);
            expect(reponse.ok(), 'la progression est relue au serveur, pas seulement dans le magasin client').toBe(true);
            const progression = await reponse.json() as readonly { noeud: string; etoiles: number }[];
            return progression.filter((ligne) => ligne.etoiles > 0).map((ligne) => ligne.noeud).sort();
          }, { message: `${noeud.id} : seul l'exercice joué progresse ; l'activité libre ne débloque aucun nœud` })
          .toEqual(noeud.progression ? [noeud.id] : []);
        expect(erreurs, 'aucune exception dans le navigateur').toEqual([]);
        await info.attach('gestes-tactiles', {
          body: JSON.stringify({ noeud: noeud.id, moteur: noeud.moteur, format: format.nom, gestes }),
          contentType: 'application/json',
        });
        } finally {
          await info.attach('progression-des-gestes', { body: JSON.stringify(jalons), contentType: 'application/json' });
        }
      });
    }
  });
}

test('contrôle du pilote : une prise couverte est refusée, puis redevient jouable', async ({ page }) => {
  const noeud = NOEUDS.find((candidat) => candidat.moteur === 'tri')!;
  await appliquerReglagesLectureReels(page, 'Controle-Tactile');
  await entrerDansLeNoeud(page, noeud.id, 'Controle-Tactile');
  const prise = page.locator('[data-moteur="tri"] [data-element]').first();
  const style = await page.addStyleTag({ content: '[data-moteur="tri"] [data-element] { pointer-events: none !important; }' });
  await expect(toucherPrise(prise), 'le pilote doit refuser un bouton qui ne reçoit pas le doigt').rejects.toThrow();
  await style.evaluate((element) => element.remove());
  await toucherPrise(prise);
  await expect(prise).toHaveAttribute('data-saisi', 'oui');
});
