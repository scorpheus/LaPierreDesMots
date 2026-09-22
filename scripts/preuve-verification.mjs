/** Preuve locale de campagne : aucun verdict n'est déduit d'un ancien RAPPORT.md. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { release } from 'node:os';
import { RACINE, ORDRE_ETAPES, nomDeFichier } from './rapport.mjs';

const preuve = (racine) => join(racine, 'bac-a-sable', 'verification-preuve.json');
const verrou = (racine) => join(racine, 'bac-a-sable', 'verification.lock');
const etapes = [...ORDRE_ETAPES.map(([nom]) => nom), 'qa:controles'];
const sha = (octets) => createHash('sha256').update(octets).digest('hex');

/** Sources suivies ET nouvelles ; ressources ignorées et outils réellement installés inclus. */
export function calculerEntrees(racine = RACINE, inventaire = []) {
  const fichiers = new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: racine, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean));
  const ajouter = (relatif) => {
    // Chromium écrit ce journal à côté de son exécutable pendant les tests.
    if (/^outils\/navigateurs\/chromium(?:_headless_shell)?-[^/]+\/[^/]+\/debug\.log$/u.test(relatif)) return;
    const absolu = join(racine, relatif);
    if (!existsSync(absolu)) { fichiers.add(relatif); return; }
    const stat = lstatSync(absolu);
    if (stat.isDirectory()) {
      for (const nom of readdirSync(absolu)) {
        // Caches de compilation des outils : sorties, jamais entrées du contrôle.
        if (['.vite', '.vite-temp', '.cache'].includes(nom)) continue;
        ajouter(`${relatif}/${nom}`);
      }
    } else fichiers.add(relatif);
  };
  for (const dossier of ['contenu/audio', 'client/public/polices', 'node_modules', 'client/node_modules', 'serveur/node_modules', 'partage/node_modules', 'outils/navigateurs']) ajouter(dossier);
  for (const dossier of ['', 'client/', 'serveur/', 'partage/']) {
    if (existsSync(join(racine, dossier))) {
      for (const nom of readdirSync(join(racine, dossier)).filter((nom) => /^\.env(?:\.|$)/u.test(nom))) ajouter(`${dossier}${nom}`);
    }
  }
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ node: process.version, plateforme: process.platform, systeme: release(), architecture: process.arch,
    environnement: Object.fromEntries(Object.entries(process.env)
      .filter(([nom]) => /^(?:CI|TZ|NODE_ENV|NODE_OPTIONS|ATELIER_.*|PIERRE_.*|VITE_.*|PLAYWRIGHT_.*)$/u.test(nom)).sort()) }));
  for (const fichier of [...fichiers].sort()) {
    const absolu = join(racine, fichier);
    let contenu = 'absent';
    if (existsSync(absolu)) {
      const stat = lstatSync(absolu);
      contenu = stat.isSymbolicLink() ? `lien:${readlinkSync(absolu)}` : `${stat.mode}:${sha(readFileSync(absolu))}`;
    }
    hash.update(JSON.stringify([fichier, contenu]));
    inventaire.push([fichier, contenu]);
  }
  return hash.digest('hex');
}

function calculerRapports(racine) {
  return sha(JSON.stringify(etapes.map((etape) => {
    const octets = readFileSync(join(racine, 'tests/rapports', nomDeFichier(etape)));
    const rapport = JSON.parse(octets);
    if (rapport.etape !== etape || rapport.statut !== 'reussite' || rapport.echecs !== 0 || !(rapport.total > 0)) {
      throw new Error(`Le rapport ${etape} n'est pas une preuve complète réussie.`);
    }
    return [etape, sha(octets)];
  })));
}

export function lirePreuveValide(racine = RACINE, entrees = calculerEntrees(racine)) {
  try {
    const document = JSON.parse(readFileSync(preuve(racine), 'utf8'));
    if (document.schema !== 1 || document.entrees !== entrees || document.rapports !== calculerRapports(racine)) return null;
    return document;
  } catch { return null; }
}

export function commencerVerification(racine = RACINE, entrees = null, inventaire = []) {
  mkdirSync(dirname(preuve(racine)), { recursive: true });
  // Une interruption ou un échec ne doit jamais laisser une ancienne réussite réutilisable.
  writeFileSync(preuve(racine), JSON.stringify({ schema: 1, statut: 'en-cours', entrees, inventaire }));
}

export function enregistrerPreuve(entrees, racine = RACINE) {
  const inventaire = [];
  if (calculerEntrees(racine, inventaire) !== entrees) {
    let differences = [];
    if (existsSync(preuve(racine))) {
      const avant = new Map(JSON.parse(readFileSync(preuve(racine), 'utf8')).inventaire ?? []);
      const apres = new Map(inventaire);
      differences = [...new Set([...avant.keys(), ...apres.keys()])].filter((nom) => avant.get(nom) !== apres.get(nom));
    }
    throw new Error(`Les entrées ont changé pendant la vérification ; nouvelle campagne requise. ${differences.slice(0, 10).join(', ')}`);
  }
  const document = { schema: 1, entrees, rapports: calculerRapports(racine), etapes: etapes.length,
    valideLe: new Date().toISOString() };
  mkdirSync(dirname(preuve(racine)), { recursive: true });
  writeFileSync(preuve(racine), `${JSON.stringify(document, null, 2)}\n`);
  return document;
}

export function verrouillerVerification(racine = RACINE) {
  const chemin = verrou(racine);
  mkdirSync(dirname(chemin), { recursive: true });
  try { writeFileSync(chemin, String(process.pid), { flag: 'wx' }); }
  catch (erreur) {
    // Ne pas supprimer un verrou dit périmé : deux repreneurs pourraient supprimer
    // celui que l'autre vient de reprendre. Après arrêt brutal, inspecter le PID conservé.
    if (erreur.code === 'EEXIST') throw new Error(`Une vérification est déjà active ou interrompue ; inspecter ${chemin} avant reprise.`);
    throw erreur;
  }
  return () => { if (existsSync(chemin) && readFileSync(chemin, 'utf8') === String(process.pid)) rmSync(chemin); };
}
