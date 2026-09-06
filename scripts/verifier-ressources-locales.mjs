#!/usr/bin/env node
/**
 * Prévol commun des ressources locales ignorées par Git.
 *
 * Ce module ne télécharge, ne génère et ne supprime rien. Les constructeurs PWA et Android
 * peuvent l'appeler avant leur build afin qu'un clone incomplet échoue avec un diagnostic utile.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

export const POLICES_LOCALES_REQUISES = Object.freeze([
  'andika-regular.woff2',
  'andika-bold.woff2',
  'opendyslexic-regular.woff2',
  'atkinson-hyperlegible-regular.woff2',
  'atkinson-hyperlegible-bold.woff2',
  'fredoka-variable.woff2',
]);

export const DOSSIER_ARCHIVE_AUDIO = path.join(
  'bac-a-sable',
  'archives-audio-2026-09-05',
);

const CHAMPS_CLIP_COMMUNS = Object.freeze([
  'cle',
  'rendu',
  'locuteur',
  'fichier',
  'empreinteTexte',
  'dureeMs',
  'qcScore',
]);

function relatifPosix(racine, fichier) {
  return path.relative(racine, fichier).split(path.sep).join('/');
}

function resoudreSousRacine(racine, relatif) {
  const cible = path.resolve(racine, relatif);
  const ecart = path.relative(racine, cible);
  if (ecart !== '' && !ecart.startsWith(`..${path.sep}`) && ecart !== '..' && !path.isAbsolute(ecart)) {
    return cible;
  }
  throw new Error(`chemin hors de la racine autorisée : ${String(relatif)}`);
}

function exigerSousRacine(racine, cible, libelle) {
  const racineResolue = path.resolve(racine);
  const cibleResolue = path.resolve(cible);
  const ecart = path.relative(racineResolue, cibleResolue);
  if (
    ecart === '' ||
    ecart === '..' ||
    ecart.startsWith(`..${path.sep}`) ||
    path.isAbsolute(ecart)
  ) {
    throw new Error(`${libelle} sort de la racine autorisée : ${cibleResolue}`);
  }
  return cibleResolue;
}

function listerOpus(dossier) {
  if (!existsSync(dossier)) return [];
  const resultat = [];
  const visiter = (courant) => {
    for (const entree of readdirSync(courant, { withFileTypes: true })) {
      const absolu = path.join(courant, entree.name);
      if (entree.isDirectory()) visiter(absolu);
      else if (entree.isFile() && entree.name.toLocaleLowerCase('fr-FR').endsWith('.opus')) {
        resultat.push(absolu);
      }
    }
  };
  visiter(dossier);
  return resultat.sort((a, b) => a.localeCompare(b, 'fr-FR'));
}

function lireJson(chemin, libelle, problemes) {
  if (!existsSync(chemin)) {
    problemes.push(`${libelle} absent : ${chemin}`);
    return null;
  }
  try {
    const resultat = JSON.parse(readFileSync(chemin, 'utf8'));
    if (typeof resultat !== 'object' || resultat === null || Array.isArray(resultat)) {
      problemes.push(`${libelle} doit contenir un objet JSON.`);
      return null;
    }
    return resultat;
  } catch (cause) {
    problemes.push(
      `${libelle} illisible : ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return null;
  }
}

function identiteClip(clip) {
  return `${String(clip?.cle)}|${String(clip?.rendu)}`;
}

function indexerClips(clips, libelle, problemes) {
  const resultat = new Map();
  if (!Array.isArray(clips)) {
    problemes.push(`${libelle} ne porte pas de tableau \`clips\`.`);
    return resultat;
  }
  for (const [index, clip] of clips.entries()) {
    if (typeof clip !== 'object' || clip === null || Array.isArray(clip)) {
      problemes.push(`${libelle}, clip n°${String(index + 1)} : entrée invalide.`);
      continue;
    }
    if (typeof clip.cle !== 'string' || clip.cle === '' || typeof clip.rendu !== 'string' || clip.rendu === '') {
      problemes.push(`${libelle}, clip n°${String(index + 1)} : \`cle\` ou \`rendu\` absent.`);
      continue;
    }
    const identite = identiteClip(clip);
    if (resultat.has(identite)) {
      problemes.push(`${libelle} contient deux fois le clip ${identite}.`);
    } else {
      resultat.set(identite, clip);
    }
  }
  return resultat;
}

function verifierPolices(racine, problemes) {
  const dossier = path.join(racine, 'client', 'public', 'polices');
  for (const police of POLICES_LOCALES_REQUISES) {
    const fichier = path.join(dossier, police);
    if (!existsSync(fichier) || !statSync(fichier).isFile() || statSync(fichier).size === 0) {
      problemes.push(`police locale absente ou vide : ${relatifPosix(racine, fichier)}`);
    }
  }
}

function verifierConcordance(manifeste, verrou, problemes) {
  if (manifeste === null || verrou === null) return new Map();
  for (const champ of ['genereLe', 'moteurTts']) {
    if (manifeste[champ] !== verrou[champ]) {
      problemes.push(
        `manifeste audio et verrou divergent sur ${champ} : ${String(manifeste[champ])} ≠ ${String(verrou[champ])}.`,
      );
    }
  }

  const clipsManifeste = indexerClips(manifeste.clips, 'contenu/audio/manifeste.json', problemes);
  const clipsVerrou = indexerClips(verrou.clips, 'production/voix.lock.json', problemes);
  for (const [identite, clip] of clipsManifeste) {
    const attendu = clipsVerrou.get(identite);
    if (attendu === undefined) {
      problemes.push(`${identite} figure dans le manifeste audio mais pas dans le verrou de production.`);
      continue;
    }
    for (const champ of CHAMPS_CLIP_COMMUNS) {
      if (clip[champ] !== attendu[champ]) {
        problemes.push(
          `${identite} diverge sur ${champ} : manifeste=${String(clip[champ])}, verrou=${String(attendu[champ])}.`,
        );
      }
    }
  }
  for (const identite of clipsVerrou.keys()) {
    if (!clipsManifeste.has(identite)) {
      problemes.push(`${identite} figure dans le verrou de production mais pas dans le manifeste audio.`);
    }
  }
  if (verrou.comptes?.clipsAuManifeste !== clipsManifeste.size) {
    problemes.push(
      `production/voix.lock.json annonce ${String(verrou.comptes?.clipsAuManifeste)} clips au manifeste, ` +
        `mais ${String(clipsManifeste.size)} identités uniques sont présentes.`,
    );
  }
  return clipsManifeste;
}

function verifierFichiersAudio(racine, clips, problemes) {
  const dossierContenu = path.join(racine, 'contenu');
  const references = new Map();
  for (const [identite, clip] of clips) {
    if (typeof clip.fichier !== 'string' || !/^audio\/.*\.opus$/iu.test(clip.fichier)) {
      problemes.push(`${identite} porte un chemin audio invalide : ${String(clip.fichier)}.`);
      continue;
    }
    let fichier;
    try {
      fichier = resoudreSousRacine(dossierContenu, clip.fichier);
    } catch (cause) {
      problemes.push(`${identite} : ${cause instanceof Error ? cause.message : String(cause)}.`);
      continue;
    }
    const relatif = relatifPosix(racine, fichier);
    const dejaReference = references.get(relatif);
    if (dejaReference !== undefined && dejaReference !== identite) {
      problemes.push(`${relatif} est référencé par ${dejaReference} et ${identite}.`);
    }
    references.set(relatif, identite);
    if (!existsSync(fichier) || !statSync(fichier).isFile() || statSync(fichier).size === 0) {
      problemes.push(`clip local absent ou vide pour ${identite} : ${relatif}`);
      continue;
    }
    if (!Number.isInteger(clip.octets) || clip.octets <= 0) {
      problemes.push(`${identite} ne porte pas un nombre d’octets valide dans le manifeste audio.`);
    } else if (statSync(fichier).size !== clip.octets) {
      problemes.push(
        `${relatif} mesure ${String(statSync(fichier).size)} octets, le manifeste en annonce ${String(clip.octets)}.`,
      );
    }
    if (typeof clip.empreinteTexte !== 'string' || !/^[a-f0-9]{64}$/u.test(clip.empreinteTexte)) {
      problemes.push(`${identite} porte une empreinte de texte invalide.`);
    }
  }

  const fichiers = listerOpus(path.join(dossierContenu, 'audio'));
  const orphelins = [];
  for (const fichier of fichiers) {
    const relatif = relatifPosix(racine, fichier);
    if (!references.has(relatif)) {
      orphelins.push(fichier);
    }
  }
  return { fichiersAudio: fichiers.length, orphelins };
}

function messageEchec(problemes) {
  const visibles = problemes.slice(0, 30);
  const omis = problemes.length - visibles.length;
  return (
    `Prévol des ressources locales en échec (${String(problemes.length)} problème(s)) :\n` +
    visibles.map((probleme) => `  - ${probleme}`).join('\n') +
    (omis > 0 ? `\n  - … ${String(omis)} autre(s) problème(s) omis du résumé.` : '') +
    '\n\nActions :\n' +
    '  - polices : exécuter `node scripts/telecharger-polices.mjs`, puis relancer ce contrôle ;\n' +
    '  - voix : recopier `contenu/audio/` depuis le poste producteur ou exécuter `node scripts/rendre-voix.mjs` ;\n' +
    '  - divergence ou Opus orphelin : régénérer les voix de façon contrôlée ou exclure les orphelins du préchargement.\n' +
    'Ce contrôle ne télécharge, ne génère et ne supprime aucun fichier.'
  );
}

/**
 * Vérifie les ressources nécessaires à un livrable autonome et retourne leur inventaire.
 * Lève une erreur agrégée et actionnable au premier lot d’anomalies, sans mutation du dépôt.
 */
export function verifierRessourcesLocales(racine = RACINE) {
  const audit = auditerRessourcesLocales(racine);
  const problemes = [
    ...audit.problemes,
    ...audit.orphelins.map(
      (fichier) =>
        `${relatifPosix(audit.racine, fichier)} est un Opus orphelin, absent du manifeste audio.`,
    ),
  ];
  if (problemes.length > 0) throw new Error(messageEchec(problemes));
  return audit.rapport;
}

function auditerRessourcesLocales(racine) {
  const racineResolue = path.resolve(racine);
  const problemes = [];
  verifierPolices(racineResolue, problemes);

  const manifeste = lireJson(
    path.join(racineResolue, 'contenu', 'audio', 'manifeste.json'),
    'manifeste audio',
    problemes,
  );
  const verrou = lireJson(
    path.join(racineResolue, 'production', 'voix.lock.json'),
    'verrou de production des voix',
    problemes,
  );
  const clips = verifierConcordance(manifeste, verrou, problemes);
  const { fichiersAudio, orphelins } = verifierFichiersAudio(racineResolue, clips, problemes);

  return {
    racine: racineResolue,
    problemes,
    orphelins,
    rapport: { polices: POLICES_LOCALES_REQUISES.length, clips: clips.size, fichiersAudio },
  };
}

function empreinteFichier(fichier) {
  return createHash('sha256').update(readFileSync(fichier)).digest('hex');
}

/**
 * Déplace uniquement les Opus absents du manifeste dans l'archive récupérable du bac à sable.
 * Aucune destination existante n'est remplacée et toute autre anomalie interdit l'opération.
 */
export function archiverOrphelins(racine = RACINE, lotArchive = '2026-09-05') {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(lotArchive)) {
    throw new Error('Lot d’archive invalide : utiliser un nom sans chemin, par exemple 2026-09-06-cloture.');
  }
  const dossierArchive = path.join('bac-a-sable', `archives-audio-${lotArchive}`);
  const audit = auditerRessourcesLocales(racine);
  if (audit.problemes.length > 0) {
    throw new Error(`Archivage refusé avant toute écriture.\n${messageEchec(audit.problemes)}`);
  }
  if (audit.orphelins.length === 0) {
    return { fichiers: 0, octets: 0, dossier: dossierArchive, manifeste: null };
  }

  const racineAudio = path.join(audit.racine, 'contenu', 'audio');
  const racineArchive = exigerSousRacine(
    path.join(audit.racine, 'bac-a-sable'),
    path.join(audit.racine, dossierArchive),
    'Le dossier d’archive',
  );
  const racineFichiers = exigerSousRacine(
    racineArchive,
    path.join(racineArchive, 'fichiers'),
    'Le dossier des fichiers archivés',
  );
  const cheminManifeste = exigerSousRacine(
    racineArchive,
    path.join(racineArchive, 'manifeste.json'),
    'Le manifeste d’archive',
  );
  const cheminManifesteProvisoire = exigerSousRacine(
    racineArchive,
    path.join(racineArchive, '.manifeste-en-cours.json'),
    'Le manifeste d’archive provisoire',
  );
  if (existsSync(cheminManifeste) || existsSync(cheminManifesteProvisoire)) {
    throw new Error(
      `Écrasement refusé : ${relatifPosix(audit.racine, existsSync(cheminManifeste) ? cheminManifeste : cheminManifesteProvisoire)} existe déjà.`,
    );
  }

  const entrees = audit.orphelins.map((source) => {
    const sourceValidee = exigerSousRacine(racineAudio, source, 'La source audio');
    const relatifSource = relatifPosix(audit.racine, sourceValidee);
    const destination = exigerSousRacine(
      racineFichiers,
      path.join(racineFichiers, relatifSource),
      'La destination audio',
    );
    if (!existsSync(sourceValidee) || !statSync(sourceValidee).isFile()) {
      throw new Error(`Source à archiver absente : ${relatifSource}`);
    }
    if (existsSync(destination)) {
      throw new Error(
        `Écrasement refusé : ${relatifPosix(audit.racine, destination)} existe déjà.`,
      );
    }
    return {
      sourceAbsolue: sourceValidee,
      destinationAbsolue: destination,
      source: relatifSource,
      destination: relatifPosix(audit.racine, destination),
      octets: statSync(sourceValidee).size,
      sha256: empreinteFichier(sourceValidee),
    };
  });

  const deplaces = [];
  try {
    for (const entree of entrees) {
      mkdirSync(path.dirname(entree.destinationAbsolue), { recursive: true });
      renameSync(entree.sourceAbsolue, entree.destinationAbsolue);
      deplaces.push(entree);
    }
    const manifesteArchive = {
      version: 1,
      dateArchive: new Date().toISOString().slice(0, 10),
      lotArchive,
      mode: 'déplacement récupérable, sans suppression',
      restaurer:
        'Replacer chaque destination vers sa source après avoir vérifié que la source est libre.',
      fichiers: entrees.map(({ source, destination, octets, sha256 }) => ({
        source,
        destination,
        octets,
        sha256,
      })),
    };
    mkdirSync(racineArchive, { recursive: true });
    writeFileSync(
      cheminManifesteProvisoire,
      `${JSON.stringify(manifesteArchive, null, 2)}\n`,
      'utf8',
    );
    renameSync(cheminManifesteProvisoire, cheminManifeste);
  } catch (cause) {
    if (existsSync(cheminManifesteProvisoire)) unlinkSync(cheminManifesteProvisoire);
    for (const entree of deplaces.reverse()) {
      if (existsSync(entree.destinationAbsolue) && !existsSync(entree.sourceAbsolue)) {
        renameSync(entree.destinationAbsolue, entree.sourceAbsolue);
      }
    }
    throw cause;
  }

  return {
    fichiers: entrees.length,
    octets: entrees.reduce((total, entree) => total + entree.octets, 0),
    dossier: relatifPosix(audit.racine, racineArchive),
    manifeste: relatifPosix(audit.racine, cheminManifeste),
  };
}

function racineDemandee(arguments_) {
  const position = arguments_.indexOf('--racine');
  if (position === -1) return RACINE;
  const valeur = arguments_[position + 1];
  if (typeof valeur !== 'string' || valeur === '') {
    throw new Error(
      'Usage : node scripts/verifier-ressources-locales.mjs [--racine <dossier>] [--archiver-orphelins]',
    );
  }
  return path.resolve(valeur);
}

const estAppeleDirectement =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (estAppeleDirectement) {
  try {
    const arguments_ = process.argv.slice(2);
    const racine = racineDemandee(arguments_);
    if (arguments_.includes('--archiver-orphelins')) {
      const indexLot = arguments_.indexOf('--lot-archive');
      const lotArchive = indexLot === -1 ? '2026-09-05' : (arguments_[indexLot + 1] ?? '');
      const archive = archiverOrphelins(racine, lotArchive);
      const rapport = verifierRessourcesLocales(racine);
      console.log(
        `[ressources] archive : ${String(archive.fichiers)} Opus orphelin(s), ` +
          `${String(archive.octets)} octets, dans ${archive.dossier}.`,
      );
      console.log(
        `[ressources] prévol après archive OK : ${String(rapport.polices)} polices, ` +
          `${String(rapport.clips)} clips, ${String(rapport.fichiersAudio)} fichiers Opus.`,
      );
    } else {
      const rapport = verifierRessourcesLocales(racine);
      console.log(
        `[ressources] OK : ${String(rapport.polices)} polices, ${String(rapport.clips)} clips, ` +
          `${String(rapport.fichiersAudio)} fichiers Opus.`,
      );
    }
  } catch (cause) {
    console.error(`[ressources] ÉCHEC\n${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}
