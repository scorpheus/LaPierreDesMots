/**
 * Garde du socle d'activité — Docs/contrat-socle-activite.md § 3.
 *
 * Chaque nœud livré est ouvert à cinq formats, avec les réglages de lecture réels de la
 * tablette (Andika 27 px, interligne 2). Les règles S1 à S9 sont relevées nœud par nœud et
 * un cas échoue avec la liste complète de ses écarts, pour qu'une migration voie tout d'un coup.
 */
import { test, expect } from '../harnais-serveur.js';
import { allumerLaVoix } from '../e2e/voix-allumee.js';
import {
  appliquerReglagesLectureReels,
  choisirLeProfil,
  deuxImages,
  noeudsLivres,
  SELECTEUR_INTERACTIF,
} from '../e2e/qa-outils.js';

/** § 2 du contrat. `grand` = tablette et PC : aucun défilement de page n'y est admis. */
const FORMATS = [
  { nom: 'telephone', largeur: 390, hauteur: 844, grand: false },
  { nom: 'tablette-portrait', largeur: 800, hauteur: 1100, grand: true },
  { nom: 'tablette-paysage', largeur: 1280, hauteur: 720, grand: true },
  // Tablette tournée dans le navigateur (mesure de septembre) et téléphone couché.
  { nom: 'tablette-paysage-navigateur', largeur: 1100, hauteur: 700, grand: true },
  { nom: 'telephone-couche', largeur: 640, hauteur: 360, grand: false },
  { nom: 'pc-portable', largeur: 1366, hauteur: 768, grand: true },
  { nom: 'pc-grand', largeur: 1920, hauteur: 1080, grand: true },
] as const;

/** § 3 du contrat, en pixels CSS. */
const SEUILS = {
  cible: 64,
  image: 96,
  guide: 96,
  chevauchement: 16,
  stylesDeTexte: 3,
} as const;

const NOEUDS = noeudsLivres();
const MOTEURS = [...new Set(NOEUDS.map((n) => n.moteur))].sort();

interface Releve {
  readonly defilementPage: number;
  readonly horsEcran: readonly string[];
  readonly ciblesPetites: readonly string[];
  readonly imagesPetites: readonly string[];
  readonly chevauchements: readonly string[];
  readonly masquees: readonly string[];
  readonly guide: { readonly stade: string | null; readonly cote: number } | null;
  readonly ecouteVisible: boolean;
  readonly clipNul: boolean;
  readonly stylesDeTexte: readonly string[];
}

/** Relevé fait dans la page : aucune dépendance au moteur, seulement au DOM rendu. */
function relever(arg: { selecteur: string; seuils: typeof SEUILS }): Releve {
  const { selecteur, seuils } = arg;
  const racine = document.querySelector('[data-ecran="noeud"]')!;
  const vw = innerWidth;
  const vh = innerHeight;
  const boite = (e: Element): DOMRect | null => {
    let r = e.getBoundingClientRect();
    // Un enfant de <svg> est rogné par son svg (overflow: hidden par défaut), à l'écran comme au toucher.
    const svg = e instanceof SVGElement && !(e instanceof SVGSVGElement) ? e.ownerSVGElement : null;
    if (svg !== null) {
      const c = svg.getBoundingClientRect();
      const l = Math.max(r.left, c.left); const t = Math.max(r.top, c.top);
      r = new DOMRect(l, t, Math.max(0, Math.min(r.right, c.right) - l), Math.max(0, Math.min(r.bottom, c.bottom) - t));
    }
    const s = getComputedStyle(e);
    if (r.width <= 0 || r.height <= 0 || s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return null;
    return r;
  };
  const nom = (e: Element): string =>
    (e.getAttribute('aria-label') ?? e.getAttribute('data-action') ?? (e.textContent ?? '').trim() ?? e.tagName).slice(0, 40);

  /**
   * Visible à l'écran : dans le viewport ET dans chaque ancêtre qui rogne son contenu.
   *
   * Seule exception, LE FILET (décision du parent du 30 oct. 2026, contrat du socle § 12 : découper
   * d'abord, défiler en dernier recours) : un moteur qui le DÉCLARE (`data-filet-defilement="oui"`)
   * fait défiler une zone de sa scène, jamais la page (S2 tient toujours). Une commande y est à
   * l'écran si elle est dans la course de ce défilement, sans débord latéral, et si la zone qui
   * défile est elle-même à l'écran. Un débordement non déclaré reste un écart.
   */
  const aLEcran = (e: Element, r: DOMRect): boolean => {
    let cible = r;
    for (let p = e.parentElement; p !== null && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = p.getBoundingClientRect();
      const filet = (s.overflowY === 'auto' || s.overflowY === 'scroll')
        && p.closest('[data-filet-defilement="oui"]') !== null;
      if (filet) {
        const haut = cible.top - c.top + p.scrollTop;
        if (cible.left < c.left - 2 || cible.right > c.right + 2 || haut < -2
          || haut + cible.height > p.scrollHeight + 2) return false;
        cible = c;
        continue;
      }
      if (cible.top < c.top - 2 || cible.left < c.left - 2 || cible.bottom > c.bottom + 2 || cible.right > c.right + 2) return false;
    }
    return !(cible.top < -1 || cible.left < -1 || cible.bottom > vh + 1 || cible.right > vw + 1);
  };

  // `pointer-events: none` : repère pour lecteur d'écran, que le doigt traverse (prises de `colorie`).
  const interactifs = [...racine.querySelectorAll(selecteur)]
    .filter((e) => getComputedStyle(e).pointerEvents !== 'none')
    .map((e) => ({ e, r: boite(e) }))
    .filter((x): x is { e: Element; r: DOMRect } => x.r !== null);

  // S10 : le doigt posé au centre d'une commande l'atteint bien (rien de recouvrant, en-tête compris).
  const masquees = interactifs
    .filter(({ e, r }) => aLEcran(e, r))
    .filter(({ e, r }) => {
      const touche = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return touche !== null && touche !== e && !e.contains(touche) && !touche.contains(e);
    })
    .map(({ e, r }) => `${nom(e)} sous ${nom(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)!)}`);

  const chevauchements: string[] = [];
  for (let i = 0; i < interactifs.length; i += 1) {
    for (let j = i + 1; j < interactifs.length; j += 1) {
      const a = interactifs[i]!;
      const b = interactifs[j]!;
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      // Les zones SVG à colorier se recouvrent par leurs boîtes englobantes, pas à l'écran.
      if (a.e instanceof SVGElement && b.e instanceof SVGElement) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > seuils.chevauchement && h > seuils.chevauchement) chevauchements.push(`${nom(a.e)} ∩ ${nom(b.e)}`);
    }
  }

  const imagesPetites = [...racine.querySelectorAll('img, [role="img"], svg image')]
    .filter((e) => e.closest('[data-stade-gobi], [data-compagnon]') === null)
    .map((e) => ({ e, r: boite(e) }))
    .filter((x): x is { e: Element; r: DOMRect } => x.r !== null)
    .filter(({ r }) => Math.min(r.width, r.height) < seuils.image - 0.5)
    .map(({ e, r }) => `${nom(e) || (e.getAttribute('src') ?? e.getAttribute('href') ?? e.tagName)} ${Math.round(r.width)}×${Math.round(r.height)}`);

  const aside = racine.querySelector('[data-stade-gobi]');
  const guide = aside === null ? null : {
    stade: aside.getAttribute('data-stade-gobi'),
    cote: Math.max(0, ...[...aside.querySelectorAll('svg[role="img"], img')].map((d) => {
      const r = d.getBoundingClientRect();
      return Math.round(Math.min(r.width, r.height));
    })),
  };

  const ecoute = racine.querySelector('[data-clip]');
  const rEcoute = ecoute === null ? null : boite(ecoute);

  const styles = new Map<string, string>();
  [...racine.querySelectorAll('*')]
    // Un pictogramme seul (📍, ←) n'est pas un style de texte : on ne compte que lettres et chiffres.
    .filter((e) => !(e instanceof SVGElement) && [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(n.textContent ?? '')))
    .filter((e) => { const r = boite(e); return r !== null && aLEcran(e, r); })
    .forEach((e) => {
      const s = getComputedStyle(e);
      const cle = `${s.fontFamily.split(',')[0]!.trim()} ${s.fontSize}`;
      if (!styles.has(cle)) styles.set(cle, (e.textContent ?? '').trim().slice(0, 24));
    });

  return {
    defilementPage: Math.max(0, document.scrollingElement!.scrollHeight - vh, document.scrollingElement!.scrollWidth - vw),
    horsEcran: interactifs.filter(({ e, r }) => !aLEcran(e, r)).map(({ e }) => nom(e)),
    ciblesPetites: interactifs
      .filter(({ r }) => r.width < seuils.cible || r.height < seuils.cible)
      .map(({ e, r }) => `${nom(e)} ${Math.round(r.width)}×${Math.round(r.height)}`),
    imagesPetites,
    chevauchements,
    masquees,
    guide,
    ecouteVisible: ecoute !== null && rEcoute !== null && aLEcran(ecoute, rEcoute),
    clipNul: ecoute === null || ecoute.getAttribute('data-clip') === 'null',
    stylesDeTexte: [...styles].map(([cle, exemple]) => `${cle} « ${exemple} »`),
  };
}

for (const format of FORMATS) {
  for (const moteur of MOTEURS) {
    test(`socle — ${moteur} — ${format.nom}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: format.largeur, height: format.hauteur });
      // S7 juge la consigne audible VOIX ALLUMÉE : depuis le 9 oct. 2026, la parole est éteinte par
      // défaut et le parent la rallume (décision du parent, `client/src/services/voix-reglee.ts`).
      await allumerLaVoix(page);
      await page.goto('/');
      await appliquerReglagesLectureReels(page, 'Socle');
      await choisirLeProfil(page, 'Socle');
      const profil = await page.evaluate(() =>
        (window as unknown as { __test: { etat(): { profil: string | null } } }).__test.etat().profil);
      const monde = await (await page.request.get(`/api/profils/${profil!}/monde`)).json() as { gobi: { stade: string } };

      const ecarts: string[] = [];
      for (const noeud of NOEUDS.filter((n) => n.moteur === moteur)) {
        await page.evaluate(async (id) =>
          (window as unknown as { __test: { allerAuNoeud(i: string): Promise<void> } }).__test.allerAuNoeud(id), noeud.id);
        const ecran = page.locator(`[data-ecran="noeud"][data-noeud="${noeud.id}"]`);
        await expect(ecran).toHaveAttribute('data-test-pret', 'oui');
        await page.evaluate(async () => document.fonts.ready);
        await deuxImages(page);
        await deuxImages(page);
        const r = await page.evaluate(relever, { selecteur: SELECTEUR_INTERACTIF, seuils: SEUILS });

        const n = (regle: string, detail: string): void => { ecarts.push(`${noeud.id} · ${regle} · ${detail}`); };
        if (format.grand) {
          if (r.horsEcran.length > 0) n('S1 tout à l’écran', `${String(r.horsEcran.length)} commande(s) cachée(s) : ${r.horsEcran.slice(0, 4).join(' | ')}`);
          if (r.defilementPage > 1) n('S2 pas de défilement', `${String(r.defilementPage)} px`);
        } else if (!r.ecouteVisible) {
          n('S1 tout à l’écran', 'bouton écouter hors écran');
        }
        if (r.ciblesPetites.length > 0) n('S3 cibles', r.ciblesPetites.slice(0, 4).join(' | '));
        if (r.imagesPetites.length > 0) n('S4 images', `${String(r.imagesPetites.length)} sous ${String(SEUILS.image)} px : ${r.imagesPetites.slice(0, 3).join(' | ')}`);
        if (r.guide === null) n('S5 Gobi', 'absent');
        else {
          if (r.guide.cote < SEUILS.guide) n('S5 Gobi', `dessin ${String(r.guide.cote)} px`);
          if (r.guide.stade !== monde.gobi.stade) n('S5 Gobi', `stade ${String(r.guide.stade)} ≠ ${monde.gobi.stade}`);
        }
        if (r.clipNul) n('S7 écoute', 'aucun clip de consigne');
        if (r.chevauchements.length > 0) n('S8 chevauchements', r.chevauchements.slice(0, 3).join(' | '));
        if (r.masquees.length > 0) n('S10 commande recouverte', r.masquees.slice(0, 3).join(' | '));
        if (r.stylesDeTexte.length > SEUILS.stylesDeTexte) n('S9 styles de texte', r.stylesDeTexte.join(', '));
      }
      expect(ecarts, `écarts au contrat du socle (${moteur}, ${format.nom})`).toEqual([]);
    });
  }
}
