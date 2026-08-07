/**
 * LES DÉTECTEURS DE CE QUE LA QA NE VOIT PAS — exploration du 2026-08-07.
 *
 * On ne cherche pas des bogues au hasard : on prend chacune des façons dont les 14 défauts
 * trouvés par le père ont échappé à 2 498 cas verts, on en fait un détecteur mécanique, et on
 * le lâche sur tout le dépôt pour voir ce qu'il trouve D'AUTRE.
 *
 * Chaque détecteur porte son CONTRÔLE POSITIF : un cas connu qu'il doit trouver. Un détecteur
 * qui ne retrouve pas le défaut qui l'a inspiré ne mesure rien (leçon de R20, trois fois).
 *
 *     node bac-a-sable/qa-aveugle/detecteurs.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, relative, extname } from 'node:path';

const RACINE = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ch = (r) => join(RACINE, r);
const rel = (f) => relative(RACINE, f).replace(/\\/g, '/');

function fichiers(dossier, ext = ['.ts', '.tsx']) {
  const out = [];
  (function m(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'dist', 'dist-types'].includes(e.name)) continue;
        m(f);
      } else if (ext.includes(extname(e.name))) out.push(f);
    }
  })(dossier);
  return out;
}

/** Les commentaires MENTENT aux `grep` : ils citent souvent ce qui est absent (leçon du jour). */
const nu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/**
 * ⚠ `scripts/` FAIT PARTIE DE LA PRODUCTION. Premier passage sans lui : les chemins de recalcul
 * de l'annexe T (`recalculerProgression`, `recalculerLeitner`…) apparaissaient comme morts alors
 * qu'ils sont appelés par les outils du dépôt. Un détecteur qui ignore un appelant réel fabrique
 * des faux positifs, et un rapport de faux positifs ne se lit pas.
 */
/**
 * ⚠⚠ ET `scripts/qa/` N'EN FAIT PAS PARTIE — c'est de l'OUTILLAGE, au même titre que `tests/`.
 *
 * Deuxième passage : le contrôle positif est passé au rouge. Cause, mesurée et non supposée :
 * `scripts/qa/mesures-feuille-de-route.mjs`, écrit une heure plus tôt dans cette même session,
 * cite `appliquerTentativeALaCascade` dans sa liste de fonctions à auditer. **Le détecteur
 * comptait son propre instrument comme un appelant de production.**
 *
 * C'est la troisième fois de la journée que la mesure se mesure elle-même (après le `grep` qui
 * lisait un commentaire). Sans contrôle positif, ce rapport aurait annoncé « la cascade est
 * branchée » — l'exact contraire du fait.
 */
const SRC = [
  ...fichiers(ch('partage/src')),
  ...fichiers(ch('serveur/src')),
  ...fichiers(ch('client/src')),
  ...fichiers(ch('scripts'), ['.ts', '.mjs', '.js']).filter((f) => !rel(f).startsWith('scripts/qa/'))
];
const TESTS = fichiers(ch('tests'));
const texte = new Map([...SRC, ...TESTS].map((f) => [f, nu(readFileSync(f, 'utf8'))]));

const titre = (n, t) => console.log(`\n${'━'.repeat(80)}\nDÉTECTEUR ${n} — ${t}\n${'━'.repeat(80)}`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// D1 — LA FONCTION QUI N'EXISTE QUE POUR SES TESTS
//
// Signature de R31 : `appliquerTentativeALaCascade` est exportée, testée, juste — et appelée
// par personne en production. Le test prouve qu'elle marche ; il ne prouve pas qu'elle tourne.
// Contrôle positif : elle DOIT figurer dans la sortie.
// ═══════════════════════════════════════════════════════════════════════════════════════════
titre('D1', 'exportée, utilisée par les tests, appelée par AUCUN code de production');

const exportsPar = new Map(); // nom -> fichier
for (const f of SRC) {
  for (const m of texte.get(f).matchAll(/export (?:async )?function (\w+)/g)) {
    if (!exportsPar.has(m[1])) exportsPar.set(m[1], f);
  }
}

/**
 * ⚠⚠⚠ ET L'APPEL PEUT ÊTRE DANS LE MÊME FICHIER.
 *
 * Troisième correction du même détecteur. `ecrireProgressionRegion` et `noterVisitePoint` sont
 * appelées par `lireMonde`, vingt lignes plus bas, dans `monde.ts`. Une règle « appelée hors de
 * son fichier » les déclarait mortes alors qu'elles tournent à chaque chargement du monde.
 *
 * On compte donc les occurrences DANS le fichier de définition : une seule = la déclaration
 * seule ; deux ou plus = elle est appelée chez elle.
 */
const d1 = [];
for (const [nom, def] of exportsPar) {
  if (nom.length < 5) continue;
  const re = new RegExp(`\\b${nom}\\b`, 'g');
  const chezElle = (texte.get(def).match(re) ?? []).length;
  const prod = SRC.filter((f) => f !== def && new RegExp(`\\b${nom}\\b`).test(texte.get(f)));
  const tst = TESTS.filter((f) => new RegExp(`\\b${nom}\\b`).test(texte.get(f)));
  if (prod.length === 0 && chezElle <= 1) d1.push({ nom, def, tests: tst.length });
}
d1.sort((a, b) => b.tests - a.tests);
const d1Testees = d1.filter((x) => x.tests > 0);
console.log(`${d1.length} fonctions exportées ne sont appelées par aucun autre fichier de production.`);
console.log(`dont ${d1Testees.length} sont pourtant exercées par des tests :\n`);
for (const x of d1Testees.slice(0, 40)) {
  console.log(`  ${x.nom.padEnd(38)} ${String(x.tests).padStart(2)} fichier(s) de test   ${rel(x.def)}`);
}
console.log(
  `\n  CONTRÔLE POSITIF appliquerTentativeALaCascade : ${
    d1.some((x) => x.nom === 'appliquerTentativeALaCascade') ? 'TROUVÉE ✔' : '*** MANQUÉE ***'
  }`
);

/**
 * D1-bis — LE SOUS-ENSEMBLE QUI COMPTE : celles qui ÉCRIVENT.
 *
 * Une fonction pure sans appelant est du code mort ; ennuyeux, sans conséquence pour l'enfant.
 * Une fonction qui ÉCRIT un acquis et n'a pas d'appelant est une récompense qu'on annonce et
 * qu'on ne donne jamais. C'est R31, et c'est la seule liste sur laquelle un lot se déclenche.
 */
console.log('\n  ── celles qui ÉCRIVENT en base (INSERT / UPDATE / DELETE) ──');
let bis = 0;
for (const x of d1) {
  const corps = texte.get(x.def);
  const bloc = new RegExp(
    `export (?:async )?function ${x.nom}\\b[\\s\\S]*?\\n\\}`,
    'm'
  ).exec(corps)?.[0];
  if (bloc === undefined) continue;
  if (!/INSERT INTO|UPDATE |DELETE FROM|\.run\(/i.test(bloc)) continue;
  bis++;
  console.log(`    ⚠ ${x.nom.padEnd(34)} ${rel(x.def)}`);
}
console.log(`    → ${bis} écrivain(s) d'état sans aucun appelant de production.`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// D2 — L'ÉNUMÉRANT SANS ÉMETTEUR
//
// Signature de `objet-campement` : une nature de récompense déclarée au schéma, traduite dans
// deux écrans, et qu'aucun paramètre n'attribue jamais. CLAUDE.md : « quand une loi est
// remplacée, son NOM survit ».
// ═══════════════════════════════════════════════════════════════════════════════════════════
titre('D2', 'membres d’union de types littéraux jamais produits ailleurs que dans leur déclaration');

const unions = [];
for (const f of fichiers(ch('partage/src'))) {
  const s = texte.get(f);
  for (const m of s.matchAll(/export type (\w+) =\s*((?:'[^']+'\s*\|\s*)+'[^']+')\s*;/g)) {
    unions.push({ type: m[1], f, membres: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) });
  }
}
/**
 * ⚠ LE CONTENU EST UN ÉMETTEUR AU MÊME TITRE QUE LE CODE.
 *
 * Premier passage, code seul : 15 « orphelins », dont `presentation`, `developpement`,
 * `retournement` — les temps de la structure de niveau des specs § 5.3. Ils sont produits
 * **17, 23 et 17 fois** dans `contenu/`, en JSON. Un détecteur qui ne lit que le TypeScript
 * déclare morte la moitié du référentiel pédagogique.
 */
const CONTENU = fichiers(ch('contenu'), ['.json']).map((f) => readFileSync(f, 'utf8'));

let d2n = 0;
for (const u of unions) {
  if (u.membres.length < 2) continue;
  const orphelins = u.membres.filter((v) => {
    const echappe = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const enCode = new RegExp(`'${echappe}'`);
    const enDonnees = new RegExp(`"${echappe}"`);
    if (SRC.some((f) => f !== u.f && enCode.test(texte.get(f)))) return false;
    if (CONTENU.some((s) => enDonnees.test(s))) return false;
    return true;
  });
  if (orphelins.length > 0) {
    d2n += orphelins.length;
    console.log(`  ${u.type.padEnd(28)} ${rel(u.f)}`);
    console.log(`      jamais cité hors de sa déclaration : ${orphelins.map((o) => `'${o}'`).join(', ')}`);
  }
}
console.log(`\n  ${unions.length} unions littérales examinées · ${d2n} membre(s) orphelin(s).`);

/**
 * CONTRÔLE POSITIF — et il ÉCHOUE, ce qui est le résultat le plus utile de tout ce fichier.
 *
 * `'objet-campement'` est un membre de `NatureRecompense` qu'AUCUN paramètre n'attribue jamais :
 * `parametres-recompenses.json` ne connaît que `forme-gobi` et `zone-recoloriee`. C'est un
 * énumérant sans émetteur, exactement ce que D2 prétend chercher.
 *
 * D2 ne le trouve pas, et la raison est de fond : il le voit CITÉ dans `CascadeRecompense.tsx`
 * et `JaugePalier.tsx` — mais ces deux fichiers le **traduisent** (« un objet pour le
 * campement »), ils ne le **produisent** pas. **Être mentionné n'est pas être émis.**
 *
 * → Le vrai garde ne peut pas se contenter d'un `grep` : il doit recenser les valeurs
 *   RÉELLEMENT PRODUITES à l'exécution, sur le corpus entier (CLAUDE.md, « contrat de
 *   couverture »). C'est la spec Q2 de `Docs/specs-qa-des-promesses-v1.md`.
 */
const natures = unions.find((u) => u.type === 'NatureRecompense');
const attribuees = JSON.parse(readFileSync(ch('contenu/referentiel/parametres-recompenses.json'), 'utf8'));
const jamaisAttribuees = (natures?.membres ?? []).filter(
  (v) => v !== 'etoile' && v !== attribuees.natureIntermediaire && v !== attribuees.natureRare
);
console.log(
  `\n  CONTRÔLE POSITIF · natures de récompense qu'aucun palier n'attribue : ${
    jamaisAttribuees.map((v) => `'${v}'`).join(', ') || 'aucune'
  }`
);
console.log(
  `  D2 les avait-il trouvées ? ${
    jamaisAttribuees.length > 0 && d2n === 0 ? '*** NON — D2 est AVEUGLE, voir le commentaire ***' : 'oui'
  }`
);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// D3 — LE BIAIS DE CONTENU QUE LE RENDU NE CORRIGE PAS
//
// Signature de R14 puis R32 : la bonne réponse en première position, 34/34 puis 32/32, et un
// seul des deux moteurs mélange. Étendu ici à TOUS les moteurs qui portent des choix.
// ═══════════════════════════════════════════════════════════════════════════════════════════
titre('D3', 'position de la bonne réponse dans le contenu, et mélange au rendu — TOUS moteurs');

const exos = fichiers(ch('contenu/exercices'), ['.json']).map((f) => ({
  f,
  j: JSON.parse(readFileSync(f, 'utf8'))
}));
const parMoteur = {};
for (const e of exos) (parMoteur[e.j.jeu?.moteur ?? '?'] ??= []).push(e);

console.log('moteur     champ de choix       cas   bonne en 1re   mélangé au rendu ?');
for (const [m, liste] of Object.entries(parMoteur).sort()) {
  let cas = 0;
  let premier = 0;
  let champ = null;
  for (const { j } of liste) {
    const c = j.jeu?.contenu ?? {};
    for (const e of c.etapes ?? c.questions ?? c.consignes ?? []) {
      for (const cle of ['options', 'choix', 'propositions', 'cartes', 'cases', 'aRanger']) {
        if (!Array.isArray(e[cle]) || e[cle].length < 2) continue;
        const bonne = e.bonne ?? e.reponse ?? e.correcte ?? e.attendu ?? e.cible;
        if (bonne === undefined) continue;
        champ = cle;
        cas++;
        if (e[cle][0] === bonne) premier++;
      }
    }
  }
  if (cas === 0) continue;
  const src = fichiers(ch(`partage/src/moteurs/${m}`)).map((f) => texte.get(f)).join('\n');
  const mel = /melanger|melange/.test(src);
  const pc = ((100 * premier) / cas).toFixed(0);
  console.log(
    `${m.padEnd(10)} ${String(champ).padEnd(20)} ${String(cas).padStart(4)}   ${String(premier).padStart(4)} (${pc.padStart(3)}%)      ${
      mel ? 'oui' : '*** NON ***'
    }`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// D4 — LE RAPPEL OPTIONNEL FOURNI PAR PERSONNE
//
// Signature de R25→R30 : 7 rappels sur 27 n'étaient fournis nulle part. Le recensement de ce
// jour-là vivait dans `bac-a-sable/rappels-morts/` ; on le rejoue pour voir où on en est.
// ═══════════════════════════════════════════════════════════════════════════════════════════
titre('D4', 'propriétés de rappel `sur…?` déclarées optionnelles et fournies nulle part');

const TSX = fichiers(ch('client/src'), ['.tsx']);
const rappels = [];
for (const f of TSX) {
  for (const m of texte.get(f).matchAll(/readonly (sur[A-Z]\w*)\?:/g)) rappels.push({ nom: m[1], f });
}
const morts = rappels.filter(({ nom, f }) => {
  const re = new RegExp(`${nom}=\\{|${nom}:\\s`);
  return !TSX.some((g) => g !== f && re.test(texte.get(g)));
});
console.log(`${rappels.length} rappel(s) optionnel(s) déclaré(s) · ${morts.length} fourni(s) NULLE PART :\n`);
for (const x of morts) console.log(`  ${x.nom.padEnd(28)} ${rel(x.f)}`);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// D5 — LA PROMESSE DES SPECS QUI N'A PAS DE RENDU
//
// Signature de R36 : « sauts de nénuphars · pas japonais · lianes » pour `chemin`, rendu en
// rangée de boutons. On rapproche la table des 14 moteurs des specs de ce que le moteur monte.
// ═══════════════════════════════════════════════════════════════════════════════════════════
titre('D5', 'les 14 moteurs : ce que les specs promettent vs ce qui est monté à l’écran');

const specs = readFileSync(ch('Docs/la-pierre-des-mots-specs-v2.md'), 'utf8');
const moteurs = readdirSync(ch('client/src/moteurs'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

console.log('moteur      scène/plateau propre   promesse des specs');
for (const m of moteurs) {
  const src = fichiers(ch(`client/src/moteurs/${m}`)).map((f) => texte.get(f)).join('\n');
  const scene = /SceneSvg|ScenePlace|svgMarkup|<svg/.test(src);
  const boutons = /flexWrap: 'wrap'/.test(src);
  const ligne = new RegExp(`^\\|\\s*\`${m}\`\\s*\\|(.*)$`, 'm').exec(specs);
  const promesse = ligne ? ligne[1].split('|').map((s) => s.trim()).filter(Boolean).join(' · ') : '—';
  console.log(
    `${m.padEnd(11)} ${(scene ? 'scène' : boutons ? '*** rangée de boutons ***' : '—').padEnd(24)} ${promesse}`
  );
}
