/** Revue des noms et des silhouettes : rapport de mesure, jamais visa esthétique automatique. */
/* global document, Image */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DOSSIER_NAVIGATEURS } from '../playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= DOSSIER_NAVIGATEURS;
const { chromium, expect } = await import('@playwright/test');
const racine = fileURLToPath(new URL('../../', import.meta.url));
const sortie = resolve(racine, 'bac-a-sable/revue-coloriages-2026-09-05');
mkdirSync(sortie, { recursive: true });
const lire = (chemin) => JSON.parse(readFileSync(chemin, 'utf8'));
const empreinte = (chemin) => createHash('sha256').update(readFileSync(chemin)).digest('hex');
const fichiers = (dossier) => readdirSync(resolve(racine, dossier), { recursive: true })
  .filter(nom => nom.endsWith('.json')).sort().map(nom => resolve(racine, dossier, nom));
const habillages = new Map(fichiers('contenu/habillages').map(lire).filter(h => h.id && h.scene).map(h => [h.id, h]));
const fiches = fichiers('contenu/exercices').map(lire).filter(fiche => fiche.jeu?.moteur === 'colorie');
if (!fiches.length) throw new Error('Aucun coloriage : inventaire vide.');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1100, height: 840 } });
const cartes = [], mesures = [];
const echapper = (texte) => String(texte).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
try {
  for (const fiche of fiches) {
    const habillage = habillages.get(fiche.jeu.habillage);
    if (!habillage) throw new Error(`Habillage absent : ${fiche.jeu.habillage}`);
    const fichierSvg = resolve(racine, 'contenu', habillage.scene.fichier);
    const regions = new Map(habillage.scene.calques.flatMap(c => c.regions).map(r => [r.id, r]));
    const consignes = fiche.jeu.contenu.consignes.flatMap((consigne, i) => consigne.cibles.map(cible => ({
      etape: i + 1, texte: consigne.texte, region: cible.region, couleur: cible.couleur,
      libelle: regions.get(cible.region)?.libelle,
    })));
    // Charger le vrai fichier déclaré par l'habillage, pas un ancien SVG de même nom.
    await page.setContent(readFileSync(fichierSvg, 'utf8'));
    const scene = await page.locator('svg').evaluate((svg, consignes) => {
      const fond = svg.querySelector('image[data-fond-illustre]');
      if (!fond) throw new Error('Décor raster attendu pour la revue.');
      const formes = consignes.map(cible => {
        const element = [...svg.querySelectorAll('#calque-zones > [id]')].find(e => e.id === cible.region);
        if (!element) throw new Error(`Silhouette absente : ${cible.region}`);
        const b = element.getBBox();
        const largeur = svg.viewBox.baseVal.width;
        const hauteur = svg.viewBox.baseVal.height;
        return {
          ...cible, forme: element.outerHTML,
          x: b.x, y: b.y, largeur: b.width, hauteur: b.height,
          largeurSur720: b.width * 720 / largeur, hauteurSur720: b.height * 720 / largeur,
          xRelatif: b.x / largeur, yRelatif: b.y / hauteur,
        };
      });
      return { viewBox: svg.getAttribute('viewBox'), fond: fond.outerHTML, href: fond.getAttribute('href'), formes };
    }, consignes);
    const fichierFond = resolve(racine, 'contenu', scene.href.replace('/api/contenu/assets/', ''));
    const imageLocale = pathToFileURL(fichierFond).href;
    const fond = scene.fond.replace(echapper(scene.href), imageLocale).replace(scene.href, imageLocale);
    const formes = scene.formes.map((cible, i) => cible.forme
      .replace(/\bid="[^"]*"/, `id="${echapper(fiche.jeu.noeud)}-${i}"`)
      .replace(/\bfill="[^"]*"/g, '').replace(/\bstroke="[^"]*"/g, '')
      .replace('class="zone"', `class="zone audit-cible" data-numero="${i + 1}"`)).join('');
    const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.viewBox}">${fond}</svg>`;
    const superpositionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.viewBox}">${fond}<g class="audit-masques">${formes}</g></svg>`;
    const article = `<article id="${echapper(fiche.jeu.noeud)}"><h2>${echapper(fiche.jeu.noeud)} — ${echapper(fiche.titre)}</h2><div class="comparaison"><figure>${baseSvg}<figcaption>Scène grise sans aide</figcaption></figure><figure>${superpositionSvg}<figcaption>Vraies silhouettes attendues — diagnostic</figcaption></figure></div><ol>${scene.formes.map((c, i) => `<li><button type="button" data-indice="${i + 1}">${echapper(c.texte)} <small>(${Math.round(c.largeurSur720)} × ${Math.round(c.hauteurSur720)} px sur 720)</small></button></li>`).join('')}</ol></article>`;
    cartes.push(article);
    mesures.push({ noeud: fiche.jeu.noeud, habillage: habillage.id, fichierSvg: habillage.scene.fichier,
      fond: scene.href, empreinteFond: empreinte(fichierFond), empreinteSvg: empreinte(fichierSvg),
      verdictReconnaissance: 'à examiner, aucune validation automatique',
      cibles: scene.formes.map(({ forme: _forme, ...mesure }) => mesure) });
  }
  const style = `*{box-sizing:border-box}body{margin:0;padding:16px;background:#f6f4ed;color:#20283d;font:16px/1.5 system-ui}h1{font-size:23px}h2{font-size:20px}article{max-width:1064px;margin:0 auto 36px}.comparaison{display:flex;gap:16px}figure{margin:0;width:512px;flex:none}figure svg{display:block;width:512px;height:auto}image{filter:grayscale(1)}figcaption{font-size:14px}.audit-masques{fill:#fcce47;fill-opacity:.28;stroke:#df1d5e;stroke-width:2;vector-effect:non-scaling-stroke}button{font:inherit;border:1px solid #a3a4a7;background:white;border-radius:6px;padding:4px 9px;cursor:pointer}button:hover{background:#ffdf76}li{margin:5px 0}small{color:#666}article[data-cible-active] .audit-cible{visibility:hidden}article[data-cible-active] .audit-cible.choisie{visibility:visible;fill-opacity:.45;stroke-width:3}@media(max-width:1080px){.comparaison{flex-wrap:wrap}}`;
  const script = `document.querySelectorAll('[data-indice]').forEach(b=>{b.onclick=()=>{const a=b.closest('article');a.dataset.cibleActive=b.dataset.indice;a.querySelectorAll('.audit-cible').forEach(p=>p.classList.toggle('choisie',p.dataset.numero===b.dataset.indice));};});`;
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revue des six coloriages</title><style>${style}</style><h1>Coloriages : repérage sans aide et contrôle des silhouettes</h1><p>Choisir une consigne isole son masque. Les dimensions sont mesurées, la reconnaissance reste une revue humaine.</p>${cartes.join('')}<script>${script}</script></html>`;
  writeFileSync(join(sortie, 'index.html'), html);
  writeFileSync(join(sortie, 'mesures.json'), JSON.stringify(mesures, null, 2));
  await page.goto(pathToFileURL(join(sortie, 'index.html')).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('image')].map(element => {
      const image = new Image(); image.src = element.getAttribute('href'); return image.decode();
    }));
  });
  await expect(page.locator('article')).toHaveCount(fiches.length);
  for (const fiche of fiches) {
    const article = page.locator(`article[id="${fiche.jeu.noeud}"]`);
    await article.locator('.comparaison').screenshot({ path: join(sortie, `${fiche.jeu.noeud}.png`) });
  }
  console.log(JSON.stringify({ exercices: fiches.length, cibles: mesures.reduce((s, m) => s + m.cibles.length, 0), sortie,
    petitesCibles: mesures.map(m => ({ noeud: m.noeud, regions: m.cibles.filter(c => Math.min(c.largeurSur720, c.hauteurSur720) < 64).map(c => c.region) })) }, null, 2));
} finally { await navigateur.close(); }
