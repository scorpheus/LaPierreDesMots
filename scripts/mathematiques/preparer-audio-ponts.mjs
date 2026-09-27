/**
 * Prépare les clips brouillon de MAT-PON-01/02/03 sans toucher au manifeste ni au verrou.
 *
 * `node scripts/mathematiques/preparer-audio-ponts.mjs` vérifie l'inventaire fermé.
 * `node scripts/mathematiques/preparer-audio-ponts.mjs --rendre` produit des Opus brouillon.
 * `node scripts/mathematiques/preparer-audio-ponts.mjs --verifier` remesure et décode les Opus.
 *
 * La promotion reste le travail du renderer officiel : lui seul écrit contenu/audio/manifeste.json
 * et production/voix.lock.json après sa transcription inverse complète.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cheminModele, manquants, PIPER } from '../telecharger-tts.mjs';
import { VOIX } from '../rendre-voix.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTAIRE = join(RACINE, 'contenu', 'brouillons', 'mathematiques', 'audio', 'ponts-inventaire.json');
const SORTIE = join(RACINE, 'contenu', 'brouillons', 'mathematiques', 'audio', 'ponts');
const TEMPORAIRE = join(SORTIE, '.tmp');
const RAPPORT = join(SORTIE, 'rapport-rendu.json');

function lireInventaire() {
  const brut = JSON.parse(readFileSync(INVENTAIRE, 'utf8'));
  if (brut.version !== 1 || !Array.isArray(brut.segmentsFixes) || typeof brut.domainesNumeriques !== 'object') {
    throw new Error('Inventaire Ponts illisible ou hors version.');
  }
  return brut;
}

function nombres(domaines) {
  const [debut, fin] = domaines.entiersContigus;
  const [dizainesDebut, dizainesFin, pasDizaines] = domaines.dizaines;
  const [centainesDebut, centainesFin, pasCentaines] = domaines.centaines;
  return [...new Set([
    ...Array.from({ length: fin - debut + 1 }, (_, rang) => debut + rang),
    ...Array.from({ length: ((dizainesFin - dizainesDebut) / pasDizaines) + 1 }, (_, rang) => dizainesDebut + rang * pasDizaines),
    ...Array.from({ length: ((centainesFin - centainesDebut) / pasCentaines) + 1 }, (_, rang) => centainesDebut + rang * pasCentaines),
  ])].sort((a, b) => a - b);
}

/** Les clés restent numériques ; le texte donné à Piper et à l'ASR est le mot français entier. */
function nombreEnFrancais(nombre) {
  const unites = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dixASeize = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  if (!Number.isInteger(nombre) || nombre < 0 || nombre > 1000) throw new Error(`Nombre hors inventaire : ${String(nombre)}`);
  if (nombre < 10) return unites[nombre];
  if (nombre < 17) return dixASeize[nombre - 10];
  if (nombre < 20) return `dix-${unites[nombre - 10]}`;
  if (nombre < 70) {
    const dizaine = Math.floor(nombre / 10); const unite = nombre % 10;
    return `${dizaines[dizaine]}${unite === 0 ? '' : unite === 1 ? ' et un' : `-${unites[unite]}`}`;
  }
  if (nombre < 80) return `soixante-${nombreEnFrancais(nombre - 60)}`;
  if (nombre < 100) return `quatre-vingt${nombre === 80 ? 's' : `-${nombreEnFrancais(nombre - 80)}`}`;
  if (nombre === 1000) return 'mille';
  const centaine = Math.floor(nombre / 100); const reste = nombre % 100;
  const prefixe = centaine === 1 ? 'cent' : `${unites[centaine]} cent`;
  return `${prefixe}${reste === 0 && centaine > 1 ? 's' : ''}${reste === 0 ? '' : ` ${nombreEnFrancais(reste)}`}`;
}

function objets(inventaire) {
  // Une ponctuation seule marque une frontière dans l'écrit ; Piper ne doit pas tenter de la
  // prononcer. Le lecteur de séquence saute ces segments silencieux lui aussi.
  const fixes = inventaire.segmentsFixes.filter((segment) => /[\p{L}\p{N}]/u.test(segment.texte)).map((segment) => ({ ...segment }));
  const variables = nombres(inventaire.domainesNumeriques).flatMap((nombre) => [
    { cle: `maths/nombres/${String(nombre)}`, texte: nombreEnFrancais(nombre), locuteur: 'narrateur', role: 'nombre' },
    { cle: `maths/gobi/nombres/${String(nombre)}`, texte: nombreEnFrancais(nombre), locuteur: 'gobi', role: 'nombre-gobi' },
  ]);
  return [...fixes, ...variables];
}

function verifierInventaire(inventaire, clips) {
  const cles = new Set();
  for (const clip of clips) {
    if (typeof clip.cle !== 'string' || !/^maths\/[a-z0-9/-]+$/u.test(clip.cle)) throw new Error(`Clé audio invalide : ${String(clip.cle)}`);
    if (typeof clip.texte !== 'string' || clip.texte.length === 0) throw new Error(`Texte audio absent : ${clip.cle}`);
    if (clip.locuteur !== 'narrateur' && clip.locuteur !== 'gobi') throw new Error(`Locuteur hors verrou : ${clip.locuteur}`);
    if (cles.has(clip.cle)) throw new Error(`Clé audio double : ${clip.cle}`);
    cles.add(clip.cle);
  }
  for (const nombre of nombres(inventaire.domainesNumeriques)) {
    if (!cles.has(`maths/nombres/${String(nombre)}`)) throw new Error(`Nombre généré sans clip : ${String(nombre)}`);
    if (!cles.has(`maths/gobi/nombres/${String(nombre)}`)) throw new Error(`Nombre Gobi généré sans clip : ${String(nombre)}`);
  }
  return { clips, nombres: nombres(inventaire.domainesNumeriques) };
}

function nomFichier(clip) {
  const empreinte = createHash('sha256').update(`${clip.cle}\u0000${clip.texte}\u0000${clip.locuteur}`).digest('hex').slice(0, 12);
  return `${clip.cle.replace(/^maths\//u, '').replaceAll('/', '--')}.${empreinte}.opus`;
}

function executer(commande, arguments_, options = {}) {
  const resultat = spawnSync(commande, arguments_, { encoding: 'utf8', ...options });
  if (resultat.status !== 0) throw new Error(`${commande} a échoué : ${String(resultat.stderr ?? resultat.error?.message).slice(0, 500)}`);
  return resultat;
}

function rendre(clip) {
  const voix = VOIX[clip.locuteur];
  const wav = join(TEMPORAIRE, `${nomFichier(clip)}.wav`);
  const opus = join(SORTIE, nomFichier(clip));
  mkdirSync(TEMPORAIRE, { recursive: true });
  mkdirSync(SORTIE, { recursive: true });
  executer(PIPER.temoin, ['--model', cheminModele(voix.modele), '--output_file', wav,
    '--length_scale', String(voix.echelleLongueur), ...(voix.locuteurModele > 0 ? ['--speaker', String(voix.locuteurModele)] : [])],
  { input: `${clip.texte}\n`, cwd: dirname(PIPER.temoin) });
  executer('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav,
    '-filter:a', 'loudnorm=I=-18:TP=-2:LRA=11', '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip', opus]);
  rmSync(wav, { force: true });
  return opus;
}

function mesurer(fichier, texte) {
  if (!existsSync(fichier)) return { ok: false, motif: 'absent', dureeMs: 0, octets: 0 };
  const probe = executer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier]);
  const dureeMs = Math.round(Number.parseFloat(probe.stdout.trim()) * 1000);
  const octets = statSync(fichier).size;
  if (!Number.isFinite(dureeMs) || dureeMs <= 0) return { ok: false, motif: 'durée illisible', dureeMs, octets };
  if (octets < 512) return { ok: false, motif: 'fichier trop court', dureeMs, octets };
  if (dureeMs < texte.length * 18) return { ok: false, motif: 'durée trop courte pour le texte', dureeMs, octets };
  const decode = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-v', 'error', '-i', fichier, '-f', 'null', '-'], { encoding: 'utf8' });
  return { ok: decode.status === 0, motif: decode.status === 0 ? null : 'décodage ffmpeg refusé', dureeMs, octets };
}

const NOMBRES_DIFFICILES = [0, 1, 10, 11, 16, 17, 20, 21, 30, 40, 50, 70, 71, 80, 90, 100, 110, 200, 300, 1000];

async function main() {
  const inventaire = lireInventaire();
  const { clips, nombres: valeurs } = verifierInventaire(inventaire, objets(inventaire));
  const rendreDemande = process.argv.includes('--rendre');
  const verifierDemande = process.argv.includes('--verifier') || rendreDemande;
  const qcDemande = process.argv.includes('--qc') || process.argv.includes('--qc-tout');
  if (rendreDemande) {
    const absents = manquants();
    if (absents.length > 0) throw new Error(`Chaîne TTS incomplète : ${absents.join(', ')}`);
    for (const clip of clips) {
      const fichier = join(SORTIE, nomFichier(clip));
      if (!existsSync(fichier)) rendre(clip);
    }
  }
  const mesures = verifierDemande ? clips.map((clip) => ({
    cle: clip.cle, texte: clip.texte, locuteur: clip.locuteur,
    fichier: relative(RACINE, join(SORTIE, nomFichier(clip))).replaceAll('\\', '/'),
    ...mesurer(join(SORTIE, nomFichier(clip)), clip.texte),
  })) : [];
  const refus = mesures.filter((mesure) => !mesure.ok);
  if (verifierDemande) writeFileSync(RAPPORT, JSON.stringify({
    version: 1, statut: refus.length === 0 ? 'mesure-technique-ok' : 'mesure-technique-incomplete',
    clips: mesures, refus,
    limite: 'La transcription inverse et la promotion au manifeste officiel restent dues au renderer officiel.',
  }, null, 2) + '\n', 'utf8');
  if (qcDemande) {
    const selection = process.argv.includes('--qc-tout') ? clips : clips.filter((clip) =>
      (clip.role !== 'nombre' && clip.role !== 'nombre-gobi') || NOMBRES_DIFFICILES.some((nombre) => clip.cle.endsWith(`/${String(nombre)}`)));
    process.env.HF_HUB_OFFLINE = '1';
    const { transcrireLot } = await import('../qc-voix.mjs');
    const entree = selection.map((clip) => ({
      cle: clip.cle, rendu: 'normal', texte: clip.texte,
      fichier: relative(join(RACINE, 'contenu'), join(SORTIE, nomFichier(clip))).replaceAll('\\', '/'),
    }));
    const resultat = transcrireLot(entree);
    const details = resultat.details.map((detail) => ({ ...detail, cle: String(detail.id).replace(/\|normal$/u, '') }));
    const incorrects = details.filter((detail) => detail.score < 0.85);
    writeFileSync(join(SORTIE, 'rapport-qc.json'), JSON.stringify({
      version: 1, instrument: resultat.moteur, mode: process.argv.includes('--qc-tout') ? 'complet' : 'échantillon',
      controles: details.length, segmentsFixes: selection.filter((clip) => clip.role !== 'nombre' && clip.role !== 'nombre-gobi').length,
      nombresDifficiles: selection.filter((clip) => clip.role === 'nombre' || clip.role === 'nombre-gobi').length,
      seuil: 0.85, incorrects, details,
    }, null, 2) + '\n', 'utf8');
    process.stdout.write(`QC inverse : ${String(details.length)} clips, ${String(incorrects.length)} sous 0,85.\n`);
    if (incorrects.length > 0) process.exitCode = 1;
  }
  process.stdout.write(`Inventaire Ponts : ${String(clips.length)} clips, ${String(valeurs.length)} nombres, ${String(refus.length)} refus techniques.\n`);
  if (verifierDemande && refus.length > 0) process.exitCode = 1;
}

try { await main(); } catch (cause) { process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`); process.exitCode = 1; }
