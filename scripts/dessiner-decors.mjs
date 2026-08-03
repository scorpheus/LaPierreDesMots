/**
 * L'ÉMETTEUR DES DÉCORS — lot M6, contrat du monde v4 § 2 (M6).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET CE QU'IL REFUSE DE FAIRE
 *
 * Il prend les 53 scènes décrites dans `scripts/decors/decors.mjs`, écrit leur SVG en trois
 * calques, **mesure la géométrie qu'il vient d'écrire**, et n'inscrit dans le `.habillage.json`
 * que des surfaces et des centroïdes RECALCULÉS. Aucune valeur n'est recopiée d'un document,
 * aucune n'est posée à la main.
 *
 * Il refuse d'écrire — `process.exit(1)`, rien n'est produit — dès qu'une des sept conditions
 * du contrat de sortie de M6 n'est pas tenue :
 *
 *   1. une région n'est pas polygonale (`polygonesDuChemin` rend `null`) ;
 *   2. une région n'est pas fermée (`estCheminFerme` faux) ;
 *   3. deux régions d'un même décor ont la MÊME SILHOUETTE ;
 *   4. deux régions d'un même décor ont la MÊME SURFACE à l'unité près ;
 *   5. un décor porte moins de 6 régions coloriables (le plafond de 40 se signale, il ne
 *      bloque pas — v4 § 2 : « le plafond est un garde-fou, pas une loi ») ;
 *   6. le centroïde retenu tombe hors de sa région, ou à moins de `MARGE_MINIMALE` de son
 *      bord — un point de visée collé au bord fait peindre la région voisine ;
 *   7. une région déclarée par l'habillage d'origine a DISPARU du nouveau dessin. C'est la
 *      règle la plus dure du lot : « un identifiant peut naître, jamais mourir » (v4 § 2) ;
 *      une consigne qui nomme une région disparue est un état sans issue.
 *
 * **Un générateur refuse d'écrire plutôt que d'émettre du faux.** Les sept contrôles tournent
 * sur TOUS les décors avant la première écriture : un lot partiel serait pire qu'un lot absent.
 *
 * ── LES BOUCHONS NE SONT PAS PERDUS ────────────────────────────────────────────────────────
 * Avant sa première écriture, l'émetteur copie chaque SVG qu'il va remplacer dans
 * `production/archives/habillages-bouchons/`, octet pour octet, hors de `contenu/` pour ne pas
 * y créer d'orphelins. Rien n'est supprimé. Le choix est consigné dans
 * `Docs/questions-en-attente.md`, section M6.
 *
 * Usage :  node scripts/dessiner-decors.mjs [--verifier]
 *   sans option   → mesure, contrôle, archive, écrit
 *   --verifier    → mesure et contrôle, n'écrit RIEN (utile pour relire sans toucher au dépôt)
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mesureDeRegion, pointRepresentatif, polygonesDuChemin } from './verifier-regions-fermees.mjs';
import { DECORS } from './decors/decors.mjs';

/** La racine du dépôt : ce fichier vit dans `scripts/`. */
const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Marge minimale entre le centroïde retenu et le bord de sa région, en unités de `viewBox`. */
const MARGE_MINIMALE = 5;

/** Jetons de palette v2 § 9.2. `--trait` et `--parchemin` ne se surchargent jamais. */
const TRAIT = '#1B2440';
const PARCHEMIN = '#FFF6E3';
const GRISAILLE = '#8E97A8';

// ───────────────────────────────────────────────────────────────────────────── géométrie

const r1 = (n) => {
  const arrondi = Math.round(n * 10) / 10;
  return Object.is(arrondi, -0) ? 0 : arrondi;
};

/** Un `d` polygonal fermé à partir d'une liste d'anneaux. */
export function cheminDe(anneaux) {
  return anneaux
    .map(
      (anneau) =>
        `M${anneau.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z`
    )
    .join(' ');
}

/** La règle de fermeture du paquet `partage`, réécrite ici à l'identique — voir plus bas. */
function estCheminFerme(d) {
  const nettoye = d.trim();
  if (nettoye.length === 0) return false;
  if (!/^[Mm]/.test(nettoye)) return false;
  const sousChemins = nettoye
    .split(/(?=[Mm])/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  return sousChemins.length > 0 && sousChemins.every((m) => /[Zz]$/.test(m));
}

/**
 * La SILHOUETTE d'une région, au sens de `tests/unitaires/decor-reconnaissable.test.ts` :
 * ses sommets ramenés à l'origine de la boîte englobante, dédoublonnés et triés.
 *
 * La fonction est reprise à la lettre du test plutôt que réinventée : c'est lui qui juge, et
 * deux implantations de la même règle finissent par diverger. Comparer des ENSEMBLES DE
 * SOMMETS et non les chaînes `d` est ce qui rend la mesure honnête — la même forme peut
 * s'écrire de plusieurs façons, et l'œil de l'enfant ne voit qu'une forme.
 */
function silhouette(d) {
  const points = polygonesDuChemin(d).flat();
  const x0 = Math.min(...points.map(([x]) => x));
  const y0 = Math.min(...points.map(([, y]) => y));
  return [...new Set(points.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`))]
    .sort()
    .join(' ');
}

// ─────────────────────────────────────────────────────────────────────── mesure d'un décor

/**
 * Mesure les régions d'un décor et rend les anomalies trouvées.
 * Aucune écriture : cette fonction ne fait que mesurer et juger.
 */
export function mesurerDecor(decor) {
  const anomalies = [];
  const mesurees = [];
  const silhouettesVues = new Map();
  const surfacesVues = new Map();

  for (const zone of decor.zones) {
    const anneaux = Array.isArray(zone.anneaux[0][0]) ? zone.anneaux : [zone.anneaux];
    const d = cheminDe(anneaux);
    const ou = `${decor.fichier}#${zone.id}`;

    if (!estCheminFerme(d)) {
      anomalies.push(`chemin-ouvert — ${ou}`);
      continue;
    }
    if (polygonesDuChemin(d) === null) {
      anomalies.push(`non-polygonal — ${ou}`);
      continue;
    }
    const mesure = mesureDeRegion(d);
    if (mesure === null) {
      anomalies.push(`mesure-impossible — ${ou}`);
      continue;
    }
    const representatif = pointRepresentatif(d);
    if (representatif === null) {
      anomalies.push(`aucun point interieur — ${ou}`);
      continue;
    }
    const centroide = [r1(representatif.point[0]), r1(representatif.point[1])];
    if (representatif.marge < MARGE_MINIMALE) {
      anomalies.push(
        `centroide trop pres du bord (${representatif.marge.toFixed(1)} u) — ${ou}`
      );
    }

    const sil = silhouette(d);
    const jumelle = silhouettesVues.get(sil);
    if (jumelle !== undefined) anomalies.push(`silhouette identique a « ${jumelle} » — ${ou}`);
    silhouettesVues.set(sil, zone.id);

    const surface = Math.abs(mesure.surface);
    const cle = Math.round(surface);
    const memeSurface = surfacesVues.get(cle);
    if (memeSurface !== undefined) {
      anomalies.push(`surface identique a « ${memeSurface} » (${cle}) — ${ou}`);
    }
    surfacesVues.set(cle, zone.id);

    mesurees.push({
      id: zone.id,
      libelle: zone.libelle,
      d,
      fill: zone.fill ?? GRISAILLE,
      trait: zone.trait ?? null,
      surface: Math.round(surface * 10) / 10,
      centroide,
      marge: representatif.marge,
    });
  }

  if (mesurees.length < 6) anomalies.push(`${decor.fichier} : ${mesurees.length} regions < 6`);
  return { mesurees, anomalies, depassePlafond: mesurees.length > 40 };
}

// ────────────────────────────────────────────────────────────────────────────── écriture

function svgDe(decor, mesurees) {
  const [, , largeur, hauteur] = decor.viewBox.split(' ').map(Number);
  const zones = mesurees
    .map((z) => {
      const trait = z.trait === null ? '' : ` ${z.trait}`;
      return (
        `    <path id="${z.id}" class="zone" data-region-svg="${z.id}" ` +
        `fill="${z.fill}" fill-rule="evenodd"${trait} d="${z.d}"/>`
      );
    })
    .join('\n');
  const traits = decor.traits.map((d) => `    <path class="trait" d="${d}"/>`).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${decor.viewBox}" width="${largeur}" height="${hauteur}" role="img" aria-label="${decor.libelle}">
  <title>${decor.libelle}</title>
  <desc>${decor.description}</desc>
  <!--
    DÉCOR — lot M6, contrat du monde v4 § 2. Trait noir sur blanc, la COULEUR VIENT DU CODE
    (annexe P § 2) : les régions sortent d'ici en grisaille ${GRISAILLE}, qui est leur état
    par défaut et non un choix graphique. Géométrie 100 % polygonale (M, L, Z — aucun arc) :
    surface et centroïde sont donc calculables exactement et opposables aux valeurs déclarées
    par le .habillage.json, que scripts/verifier-regions-fermees.mjs --strict recalcule.

    Chaque région est un ENFANT DIRECT de #calque-zones : SceneSvg.tsx sélectionne
    "#calque-zones > [id]", et un tracé niché dans un sous-groupe échapperait au tap sans
    qu'aucun message ne le dise.

    ÉCRIT PAR scripts/dessiner-decors.mjs — ne pas retoucher à la main : la scène est décrite
    dans scripts/decors/decors.mjs, et l'émetteur refuse d'écrire si la mesure est mauvaise.
  -->
  <g id="calque-fond">
    <path class="fond" fill="${PARCHEMIN}" stroke="none" d="M0,0 L${largeur},0 L${largeur},${hauteur} L0,${hauteur} Z"/>
  </g>
  <g id="calque-zones" fill="${GRISAILLE}" stroke="${TRAIT}" stroke-width="4" stroke-linejoin="round">
${zones}
  </g>
  <g id="calque-trait" fill="none" stroke="${TRAIT}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
${traits}
  </g>
</svg>
`;
}

function habillageDe(decor, mesurees) {
  const chemin = join(RACINE, 'contenu', decor.fichierHabillage);
  const existant = existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : null;
  const base =
    existant ??
    {
      id: decor.habillage,
      moteurs: decor.moteurs,
      libelle: decor.libelle,
      region: decor.region,
      scene: { fichier: `habillages/${decor.fichier}`, viewBox: decor.viewBox, calques: [] },
      palette: { jetons: {}, nuancier: decor.nuancier },
      timings: decor.timings,
      sons: { ambiance: null, effets: {} },
    };

  base.scene.viewBox = decor.viewBox;
  base.scene.fichier = `habillages/${decor.fichier}`;
  base.scene.calques = [
    { id: 'calque-fond', role: 'fond', regions: [] },
    {
      id: 'calque-zones',
      role: 'coloriable',
      regions: mesurees.map((z) => ({
        id: z.id,
        libelle: z.libelle,
        centroide: z.centroide,
        surface: z.surface,
      })),
    },
    { id: 'calque-trait', role: 'trait', regions: [] },
  ];
  return base;
}

// ──────────────────────────────────────────────────────────────────────────── programme

const verifierSeulement = process.argv.includes('--verifier');
const racineDepot = RACINE;
const dossierArchives = join(racineDepot, 'production', 'archives', 'habillages-bouchons');

const toutesAnomalies = [];
const preparés = [];

for (const decor of DECORS) {
  const { mesurees, anomalies, depassePlafond } = mesurerDecor(decor);
  toutesAnomalies.push(...anomalies);

  // ── contrôle 7 : aucun identifiant de région ne meurt.
  const cheminHabillage = join(racineDepot, 'contenu', decor.fichierHabillage);
  if (existsSync(cheminHabillage)) {
    const ancien = JSON.parse(readFileSync(cheminHabillage, 'utf8'));
    const avant = ancien.scene.calques
      .filter((c) => c.role === 'coloriable')
      .flatMap((c) => c.regions.map((r) => r.id));
    const apres = new Set(mesurees.map((z) => z.id));
    for (const id of avant) {
      if (!apres.has(id)) {
        toutesAnomalies.push(
          `IDENTIFIANT DISPARU — ${decor.habillage} declarait « ${id} », le nouveau dessin ne le porte plus`
        );
      }
    }
  }

  preparés.push({ decor, mesurees, depassePlafond });
}

console.log(`dessiner-decors — ${String(DECORS.length)} décors, ` +
  `${String(preparés.reduce((t, p) => t + p.mesurees.length, 0))} régions mesurées`);

for (const p of preparés) {
  if (p.depassePlafond) {
    console.log(`  ⚠ ${p.decor.habillage} : ${String(p.mesurees.length)} régions (> 40, signalé, non bloquant)`);
  }
}

if (toutesAnomalies.length > 0) {
  console.error(`\n${String(toutesAnomalies.length)} anomalie(s) — RIEN N'EST ÉCRIT :`);
  for (const a of toutesAnomalies) console.error(`  ✗ ${a}`);
  process.exit(1);
}

if (verifierSeulement) {
  console.log('  → 0 anomalie. `--verifier` : aucune écriture.');
  process.exit(0);
}

mkdirSync(dossierArchives, { recursive: true });
let archives = 0;
let ecrits = 0;

for (const { decor, mesurees } of preparés) {
  const cheminSvg = join(racineDepot, 'contenu', 'habillages', ...decor.fichier.split('/'));
  const cheminHabillage = join(racineDepot, 'contenu', decor.fichierHabillage);

  for (const source of [cheminSvg, cheminHabillage]) {
    if (!existsSync(source)) continue;
    const nom = source.slice(join(racineDepot, 'contenu', 'habillages').length + 1);
    const destination = join(dossierArchives, nom.split(/[\\/]/u).join('__'));
    if (!existsSync(destination)) {
      copyFileSync(source, destination);
      archives += 1;
    }
  }
  mkdirSync(dirname(cheminSvg), { recursive: true });
  writeFileSync(cheminSvg, svgDe(decor, mesurees), 'utf8');
  writeFileSync(
    cheminHabillage,
    `${JSON.stringify(habillageDe(decor, mesurees), null, 2)}\n`,
    'utf8'
  );
  ecrits += 1;
}

console.log(
  `  → ${String(ecrits)} SVG + ${String(ecrits)} .habillage.json écrits, ` +
    `${String(archives)} bouchon(s) archivé(s) dans production/archives/habillages-bouchons/`
);
