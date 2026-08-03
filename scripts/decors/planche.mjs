/**
 * LA PLANCHE-CONTACT DES DÉCORS — lot M6, contrat du monde v4 § 2 (M6).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE : « un asset qu'on n'a pas REGARDÉ n'est pas livré »
 *
 * Toute la métrologie du lot — surfaces exactes, centroïdes intérieurs, silhouettes deux à
 * deux distinctes, régions fermées — peut être verte pendant qu'un décor est illisible. C'est
 * arrivé, et c'est mesuré : à la première passe, les trois lucioles de `clairiere.lucioles`
 * passaient TOUS les contrôles et se lisaient « astérisque » ; le feu de `clairiere.veillee`
 * se lisait « scie » ; les coquillages de `marais.coquillages` se lisaient « couronne ». Aucun
 * chiffre ne le disait. La planche, si.
 *
 * Elle rastérise les SVG **sans aucune dépendance** : les navigateurs de Playwright ne sont pas
 * installés sur cette machine (mesuré : `C:/Users/scorp/AppData/Local/ms-playwright` n'existe
 * pas), et D9 interdit d'installer hors du dépôt sans accord. Remplissage pair-impair par
 * balayage de lignes, trait par échantillonnage, encodage PNG par `node:zlib`. Le rendu est
 * volontairement pauvre — grisaille sur parchemin, comme à l'état par défaut — parce que c'est
 * exactement ce que l'enfant voit avant d'avoir colorié.
 *
 * Usage : node scripts/decors/planche.mjs <region> <sortie.png> [colonnes] [echelle]
 *   node scripts/decors/planche.mjs clairiere production/planches/m6/clairiere.png 3 0.6
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

import { elementsDessines, polygonesDuChemin } from '../verifier-regions-fermees.mjs';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** La racine du dépôt : ce fichier vit dans `scripts/decors/`. */
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ─────────────────────────────────────────────────────────────────────────── PNG minimal
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const o of buf) c = TABLE[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function morceau(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps));
  return Buffer.concat([len, corps, crc]);
}
function ecrirePng(chemin, largeur, hauteur, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const brut = Buffer.alloc(hauteur * (1 + largeur * 3));
  for (let y = 0; y < hauteur; y += 1) {
    brut[y * (1 + largeur * 3)] = 0;
    pixels.copy(brut, y * (1 + largeur * 3) + 1, y * largeur * 3, (y + 1) * largeur * 3);
  }
  writeFileSync(chemin, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]));
}

// ────────────────────────────────────────────────────────────────────────── rastérisation
class Toile {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = Buffer.alloc(w * h * 3, 255);
  }
  point(x, y, [r, v, b]) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = r; this.px[i + 1] = v; this.px[i + 2] = b;
  }
  remplir(anneaux, couleur) {
    let ymin = Infinity; let ymax = -Infinity;
    for (const a of anneaux) for (const [, y] of a) { if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    for (let y = Math.max(0, Math.floor(ymin)); y <= Math.min(this.h - 1, Math.ceil(ymax)); y += 1) {
      const croix = [];
      for (const a of anneaux) {
        for (let i = 0; i < a.length; i += 1) {
          const [x1, y1] = a[i];
          const [x2, y2] = a[(i + 1) % a.length];
          if (y1 > y + 0.5 !== y2 > y + 0.5) croix.push(x1 + ((y + 0.5 - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      croix.sort((p, q) => p - q);
      for (let i = 0; i + 1 < croix.length; i += 2) {
        for (let x = Math.max(0, Math.ceil(croix[i])); x <= Math.min(this.w - 1, Math.floor(croix[i + 1])); x += 1) {
          this.point(x, y, couleur);
        }
      }
    }
  }
  segment([x1, y1], [x2, y2], couleur, ep = 1) {
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= n; i += 1) {
      const x = x1 + ((x2 - x1) * i) / n;
      const y = y1 + ((y2 - y1) * i) / n;
      for (let dx = -ep; dx <= ep; dx += 1) for (let dy = -ep; dy <= ep; dy += 1) this.point(x + dx, y + dy, couleur);
    }
  }
  contour(anneaux, couleur, ep) {
    for (const a of anneaux) for (let i = 0; i < a.length; i += 1) this.segment(a[i], a[(i + 1) % a.length], couleur, ep);
  }
}

const TRAIT = [27, 36, 64];
const GRIS = [142, 151, 168];
const FOND = [255, 246, 227];

/** Dessine un SVG du lot dans la toile, à l'échelle `k`, décalé de (ox, oy). */
function dessinerSvg(toile, texte, ox, oy, k) {
  const [, , L, H] = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/u.exec(texte).slice(1).map(Number);
  const tr = (a) => a.map((an) => an.map(([x, y]) => [ox + x * k, oy + y * k]));
  toile.remplir([[[ox, oy], [ox + L * k, oy], [ox + L * k, oy + H * k], [ox, oy + H * k]]], FOND);
  for (const e of elementsDessines(texte)) {
    if (e.d === null) continue;
    const anneaux = polygonesDuChemin(e.d);
    if (anneaux === null) {
      // tracé ouvert du calque de trait : on le rend en polyligne.
      const pts = e.d.slice(1).split(/ L/u).map((p) => p.split(',').map(Number));
      for (let i = 0; i + 1 < pts.length; i += 1) {
        toile.segment([ox + pts[i][0] * k, oy + pts[i][1] * k], [ox + pts[i + 1][0] * k, oy + pts[i + 1][1] * k], TRAIT, 1);
      }
      continue;
    }
    const a = tr(anneaux);
    if (e.calque === 'calque-fond') { toile.remplir(a, FOND); continue; }
    if (e.fill !== 'none') toile.remplir(a, GRIS);
    toile.contour(a, TRAIT, 1);
  }
  return [L * k, H * k];
}

// ───────────────────────────────────────────────────────────────────────────── programme
const region = process.argv[2];
const sortie = process.argv[3];
const colonnes = Number(process.argv[4] ?? 3);
const k = Number(process.argv[5] ?? 0.42);
const dossier = join(RACINE, 'contenu/habillages', region);
const fichiers = readdirSync(dossier)
  .filter((f) => f.endsWith('.svg') && !/^(ecole|grottes)\.svg$/u.test(f))
  .sort();

const cellW = Math.round(960 * k) + 8;
const cellH = Math.round(615 * k) + 8;
const lignes = Math.ceil(fichiers.length / colonnes);
const toile = new Toile(colonnes * cellW, lignes * cellH);

fichiers.forEach((f, i) => {
  const ox = (i % colonnes) * cellW + 4;
  const oy = Math.floor(i / colonnes) * cellH + 4;
  dessinerSvg(toile, readFileSync(join(dossier, f), 'utf8'), ox, oy, k);
});
ecrirePng(sortie, toile.w, toile.h, toile.px);
console.log(sortie, fichiers.length, 'décors', toile.w, 'x', toile.h);
console.log(fichiers.map((f, i) => `${String(i + 1)}. ${f}`).join('   '));
