import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, etatDuJeu, noeudsLivres } from './qa-outils.js';
import { lireEtatDom, toucherPrise, toucherForme, type EtatGestesDom } from './gestes-dom.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

// Assemble et trace ont leur garde dédiée ; libre n'a pas de mauvaise réponse.
const MOTEURS = ['attrape', 'chemin', 'chrono', 'colorie', 'eclair', 'grave',
  'histoire', 'paires', 'phrase', 'place', 'tri'] as const;
const NOEUDS = noeudsLivres();
const FORMATS = [
  { nom: 'téléphone', width: 360, height: 640 },
  { nom: 'tablette', width: 800, height: 1100 },
] as const;

function prise(racine: Locator, attribut: string, valeur: string): Locator {
  return racine.locator(`[${attribut}=${JSON.stringify(valeur)}]`);
}

async function prendreAutre(racine: Locator, attribut: string, exclus: readonly string[]): Promise<Locator> {
  const prises = racine.locator(`[${attribut}]:visible`);
  const valeurs = await prises.evaluateAll((elements, attr) => elements.map((element) => element.getAttribute(attr)!), attribut);
  const autre = valeurs.find((valeur) => !exclus.includes(valeur));
  expect(autre, `${attribut} possède une réponse incorrecte réellement proposée`).toBeDefined();
  return prise(racine, attribut, autre!);
}

async function preparerRefus(page: Page, moteur: string): Promise<() => Promise<void>> {
  const racine = page.locator(`[data-moteur="${moteur}"]`);
  const etat: EtatGestesDom = await lireEtatDom(page);
  const restantes = etat.etapes?.[etat.indexEtape ?? 0]?.restantes ?? [];
  switch (moteur) {
    case 'attrape': case 'chrono': case 'phrase': {
      const attribut = { attrape: 'data-cible', chrono: 'data-vignette', phrase: 'data-etiquette' }[moteur]!;
      const mauvaise = await prendreAutre(racine, attribut, moteur === 'attrape' ? restantes : restantes.slice(0, 1));
      return async () => toucherPrise(mauvaise);
    }
    case 'chemin': {
      const possibles = await racine.locator('[data-case][data-atteignable="oui"]').evaluateAll(
        (elements) => elements.map((element) => element.getAttribute('data-case')!),
      );
      const mauvaise = possibles.find((id) => !restantes.includes(id));
      expect(mauvaise, 'une case adjacente sort du parcours attendu').toBeDefined();
      return async () => toucherPrise(prise(racine, 'data-case', mauvaise!));
    }
    case 'grave': {
      const attendue = etat.trous?.find((trou) => trou.id === restantes[0])?.attendu;
      expect(attendue).toBeDefined();
      const mauvaise = await prendreAutre(racine, 'data-lettre', [attendue!]);
      return async () => toucherPrise(mauvaise);
    }
    case 'histoire': case 'eclair': {
      if (moteur === 'histoire' && etat.recitVisible) await toucherPrise(racine.locator('[data-action="recit"]'));
      if (moteur === 'eclair') {
        await toucherPrise(racine.locator('[data-action="pret"], [data-action="revoir"]'));
        await expect(racine.locator('[data-plateau="eclair"]')).toHaveAttribute('data-visible', 'oui');
        await expect(racine.locator('[data-plateau="eclair"]')).toHaveAttribute('data-visible', 'non');
      }
      const mauvaise = await prendreAutre(racine, 'data-option', restantes);
      return async () => toucherPrise(mauvaise);
    }
    case 'tri': {
      const element = etat.elements?.find((candidat) => candidat.id === restantes[0]);
      expect(element).toBeDefined();
      await toucherPrise(prise(racine, 'data-element', element!.id));
      const mauvaise = await prendreAutre(racine, 'data-receptacle', [element!.receptacleAttendu]);
      // Le navigateur doit atteindre le panier AVANT la mesure : son défilement
      // automatique lors du tap ne constitue pas un déplacement causé par le refus.
      await mauvaise.scrollIntoViewIfNeeded();
      return async () => toucherPrise(mauvaise);
    }
    case 'paires': {
      const premiere = etat.cartes?.[0];
      const autre = etat.cartes?.find((carte) => carte.paire !== premiere?.paire);
      expect(autre, 'deux cartes de paires différentes sont présentes').toBeDefined();
      await toucherPrise(prise(racine, 'data-carte', premiere!.id));
      return async () => toucherPrise(prise(racine, 'data-carte', autre!.id));
    }
    case 'place': {
      const depot = etat.consignes?.[etat.indexConsigne ?? 0]?.depotsRestants?.[0];
      expect(depot).toBeDefined();
      // Le rappel textuel concerne l'absence d'objet saisi, pas une mauvaise destination.
      return async () => toucherPrise(prise(racine, 'data-zone-cible', depot!.zone));
    }
    case 'colorie': {
      const cible = etat.consignes?.[etat.indexConsigne ?? 0]?.ciblesRestantes?.[0];
      expect(cible).toBeDefined();
      // Le rappel textuel concerne l'absence de couleur choisie.
      return async () => toucherForme(racine.locator(`[data-region-source=${JSON.stringify(cible!.region)}][data-active="oui"]`));
    }
    default: throw new Error(`Refus non couvert : ${moteur}`);
  }
}

async function mesurer(racine: Locator): Promise<unknown> {
  return racine.evaluate((element) => {
    const origine = element.getBoundingClientRect();
    // Coordonnées locales : le défilement nécessaire au doigt n'est pas un déplacement du dessin.
    const arrondir = (nombre: number): number => Math.round(nombre * 100) / 100;
    return [...element.querySelectorAll('[data-decor-svg], [data-decor-raster], svg.pierre-scene, svg[data-scene="place"], [data-plateau]')]
      .filter((repere) => repere.getBoundingClientRect().width > 0 && !repere.matches('[data-plateau="messages"], [data-plateau="controles"]'))
      .map((repere) => {
        const boite = repere.getBoundingClientRect();
        const matrice = repere instanceof SVGSVGElement ? repere.getScreenCTM() : null;
        return { repere: repere.getAttribute('data-plateau') ?? repere.tagName,
          cadre: [boite.x - origine.x, boite.y - origine.y, boite.width, boite.height].map(arrondir),
          matrice: matrice === null ? null : [matrice.a, matrice.d, matrice.e - origine.x, matrice.f - origine.y].map(arrondir) };
      });
  });
}

for (const format of FORMATS) for (const moteur of MOTEURS) {
  test(`refus stable — ${moteur} — ${format.nom}`, async ({ page }) => {
    const noeud = NOEUDS.find((candidat) => candidat.moteur === moteur)!;
    expect(noeud, `un vrai nœud ${moteur} est livré`).toBeDefined();
    await page.setViewportSize({ width: format.width, height: format.height });
    const prenom = `Refus-${moteur}`;
    await appliquerReglagesLectureReels(page, prenom);
    await entrerDansLeNoeud(page, noeud.id, prenom);
    const racine = page.locator(`[data-moteur="${moteur}"]`);
    const refuser = await preparerRefus(page, moteur);
    await attendreGeometrieStable(page);
    const avant = await mesurer(racine);
    expect(avant, 'au moins un dessin ou plateau réellement mesuré').not.toEqual([]);
    const gains = () => etatDuJeu(page).then(({ etatMoteur }) => {
      const etat = etatMoteur as { acquis?: unknown; remplissages?: unknown; places?: unknown };
      return { acquis: etat.acquis, remplissages: etat.remplissages, places: etat.places };
    });
    const acquisAvant = await gains();
    await refuser();
    await expect.poll(async () => {
      const refus = ((await etatDuJeu(page)).etatMoteur as { dernierRefus?: unknown }).dernierRefus;
      return typeof refus === 'object' && refus !== null;
    }, { message: 'le vrai geste doit être refusé par le moteur' }).toBe(true);
    const annonce = moteur === 'tri' ? '[data-message-tri="visible"]'
      : '[data-refus-texte="oui"], [data-rappel="oui"]';
    await expect(racine.locator(annonce).first()).toBeVisible();
    await attendreGeometrieStable(page);
    expect(await mesurer(racine), 'dessin et repères gardent leur taille et leur position au refus').toEqual(avant);
    expect(await gains(), 'une mauvaise réponse ne gagne rien et ne retire aucun acquis').toEqual(acquisAvant);
  });
}
