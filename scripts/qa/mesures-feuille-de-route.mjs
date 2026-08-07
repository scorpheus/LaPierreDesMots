/**
 * Relance TOUTES les mesures citées dans `Docs/feuille-de-route-debug.md`.
 *
 * Raison d'être : le § 0 de ce document dit que ses chiffres périment et qu'un lot les relance
 * avant sa première écriture. Sans ce script, « relancer » veut dire réécrire onze commandes de
 * mémoire — c'est-à-dire dériver.
 *
 *     node bac-a-sable/feuille-de-route-2026-08-07/mesures.mjs
 *
 * LECTURE SEULE, sans exception. La base réelle est ouverte en `readOnly` — une sonde qui écrit
 * dans les données du joueur n'est pas une sonde (R29, six profils « Mesure » écrits par erreur
 * le 2026-08-03).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RACINE = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const chemin = (r) => join(RACINE, r);

function fichiers(dossier, filtre) {
  const sortie = [];
  (function marcher(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (e.isDirectory()) marcher(f);
      else if (filtre(e.name)) sortie.push(f);
    }
  })(dossier);
  return sortie;
}

const titre = (t) => console.log(`\n${'═'.repeat(78)}\n${t}\n${'═'.repeat(78)}`);

// ───────────────────────────────────────────────────────── § 1 · l'inventaire des pages
titre('§ 1 — INVENTAIRE DES PAGES');

const tsx = fichiers(chemin('client/src'), (n) => n.endsWith('.tsx'));
const ecrans = new Set();
for (const f of tsx) {
  for (const m of readFileSync(f, 'utf8').matchAll(/data-ecran="([^"]*)"/g)) ecrans.add(m[1]);
}
const moteurs = readdirSync(chemin('client/src/moteurs'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

console.log(`écrans (data-ecran) : ${ecrans.size}`);
console.log('  ' + [...ecrans].sort().join(' · '));
console.log(`moteurs             : ${moteurs.length}`);
console.log('  ' + moteurs.join(' · '));

// ─────────────────────────────────────────── § 2 · R31, la chaîne des acquis est-elle branchée ?
titre('§ 2 — R31 · CHAQUE ÉCRIVAIN D’ACQUIS EST-IL ATTEIGNABLE ?');

const srcServeur = fichiers(chemin('serveur/src'), (n) => n.endsWith('.ts'));
const srcClient = fichiers(chemin('client/src'), (n) => ['.ts', '.tsx'].includes(extname(n)));
const lire = (f) => readFileSync(f, 'utf8');

function appelants(fonction, fichiersSource) {
  const def = fichiersSource.find((f) => new RegExp(`export function ${fonction}\\b`).test(lire(f)));
  const autres = fichiersSource.filter((f) => f !== def && new RegExp(`\\b${fonction}\\b`).test(lire(f)));
  return { def, autres };
}

for (const fn of [
  'appliquerTentativeALaCascade',
  'enregistrerFormeGobi',
  'poserObjetCampement',
  'appliquerTentativeALaProgression'
]) {
  const { def, autres } = appelants(fn, srcServeur);
  console.log(
    `${fn.padEnd(34)} défini: ${(def ? basename(def) : '—').padEnd(18)} appelé par: ${
      autres.length ? autres.map((f) => basename(f)).join(', ') : '*** PERSONNE ***'
    }`
  );
}
const clientPose = srcClient.filter(
  (f) => !f.endsWith(join('api', 'client.ts')) && /\bposerObjetCampement\b/.test(lire(f))
);
console.log(
  `client → poserObjetCampement       appelé par: ${
    clientPose.length ? clientPose.map(basename).join(', ') : '*** PERSONNE ***'
  }`
);

const bd = chemin('donnees/pierre.db');
if (existsSync(bd)) {
  const base = new DatabaseSync(bd, { readOnly: true });
  console.log('\nla vraie base (lecture seule) :');
  for (const t of [
    'tentatives',
    'progression_cascade',
    'formes_gobi',
    'campement',
    'compagnons',
    'etagere_rang'
  ]) {
    try {
      console.log(`  ${t.padEnd(22)} ${String(base.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n)}`);
    } catch {
      console.log(`  ${t.padEnd(22)} table absente`);
    }
  }
  console.log('  stade_gobi             ' + JSON.stringify(base.prepare('SELECT * FROM stade_gobi').all()));
}

// ──────────────────────────────────────── § 3 · le contenu : options, lotissement, étapes
titre('§ 3 — LE CONTENU DES 76 EXERCICES');

const exercices = fichiers(chemin('contenu/exercices'), (n) => n.endsWith('.json')).map((f) => ({
  f,
  j: JSON.parse(readFileSync(f, 'utf8'))
}));
const parMoteur = {};
for (const e of exercices) (parMoteur[e.j.jeu?.moteur ?? '?'] ??= []).push(e);
console.log(`exercices : ${exercices.length}`);
console.log(
  '  ' +
    Object.entries(parMoteur)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([m, l]) => `${m} ${l.length}`)
      .join(' · ')
);

console.log('\nR32 — position de la bonne réponse, moteurs à options :');
for (const m of ['eclair', 'histoire']) {
  let tot = 0;
  let premier = 0;
  for (const { j } of parMoteur[m] ?? []) {
    const c = j.jeu?.contenu ?? {};
    for (const e of c.etapes ?? c.questions ?? c.consignes ?? []) {
      if (!Array.isArray(e.options)) continue;
      tot++;
      const bonne = e.bonne ?? e.reponse ?? e.correcte;
      if (e.options[0] === bonne) premier++;
    }
  }
  const melange = /melanger/.test(lire(chemin(`partage/src/moteurs/${m}/moteur.ts`)));
  console.log(
    `  ${m.padEnd(10)} ${String(tot).padStart(3)} consignes · bonne en 1re position : ${String(
      premier
    ).padStart(3)} · mélangé au rendu : ${melange ? 'OUI' : '*** NON ***'}`
  );
}

console.log('\nR33 — `tri` : mots affichés au premier écran, et mots refusés :');
let aff = 0;
let ok = 0;
for (const { f, j } of parMoteur.tri ?? []) {
  const c = j.jeu.contenu;
  const a = (c.elements ?? []).length;
  const o = (c.consignes?.[0]?.aRanger ?? []).length;
  aff += a;
  ok += o;
  console.log(`  ${basename(f).padEnd(30)} ${String(a).padStart(3)} affichés · ${String(o).padStart(2)} acceptés · ${String(a - o).padStart(3)} refusés`);
}
console.log(
  `  TOTAL${' '.repeat(26)} ${String(aff).padStart(3)} · ${String(ok).padStart(2)} · ${String(aff - ok).padStart(3)}   → ${(
    (100 * (aff - ok)) / aff
  ).toFixed(1)} % refusés`
);

let cTot = 0;
let cVide = 0;
for (const { j } of parMoteur.tri ?? []) {
  for (const x of j.jeu.contenu.consignes ?? []) {
    cTot++;
    if (/^Range aussi/i.test(x.texte) || /ces mots|derniers mots/i.test(x.texte)) cVide++;
  }
}
console.log(
  `\n  consignes de \`tri\` : ${cTot} · sans aucune règle nouvelle : ${cVide} (${(
    (100 * cVide) / cTot
  ).toFixed(1)} %)`
);

// ─────────────────────────────────────────────── § 4 · le rendu : glisser, corps, décor
titre('§ 4 — LE RENDU, RECENSÉ SUR LES 14 MOTEURS');

/**
 * ⚠ LES COMMENTAIRES SONT RETIRÉS AVANT TOUTE RECHERCHE, et ce n'est pas une précaution
 * théorique : sans ça, `tri` était compté comme ayant un glisser. `MoteurTri.tsx` porte en
 * en-tête le récit de R16 — « `grep` sur `onPointer`, `onTouch`, `onDrag`, `draggable`,
 * `dnd-kit` ne rendait aucune ligne » —, et l'instrument trouvait les cinq motifs… dans la
 * phrase qui dit qu'ils sont absents. Un recensement qui lit ses propres notes ne mesure rien.
 */
const sansCommentaires = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

console.log('moteur      glisser  décor propre  taille de texte en dur');
for (const m of moteurs) {
  const fs2 = fichiers(chemin(`client/src/moteurs/${m}`), (n) => /\.tsx?$/.test(n));
  const src = sansCommentaires(fs2.map(lire).join('\n'));
  const glisse = /onPointerDown|onTouchStart|draggable|dnd-kit|useDraggable/.test(src);
  const scene = /SceneSvg|ScenePlace|svgMarkup/.test(src);
  const dur = [...new Set([...src.matchAll(/fontSize: '([^']*)'/g)].map((x) => x[1]))].join(' ');
  console.log(
    `${m.padEnd(11)} ${(glisse ? 'oui' : '—').padEnd(8)} ${(scene ? 'oui' : '—').padEnd(13)} ${dur || '—'}`
  );
}

const decor = lire(chemin('client/src/habillages/DecorDeFond.tsx'));
console.log(
  `\nR37 — opacité du décor de fond : ${/OPACITE_FOND = ([\d.]+)/.exec(decor)?.[1] ?? '?'}`
);
