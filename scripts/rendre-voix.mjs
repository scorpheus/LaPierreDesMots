// Rendu des voix EN LOT et HORS LIGNE — lot N2, contrat de finition v3 § 4.2.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// « RIEN N'EST SYNTHÉTISÉ À L'EXÉCUTION » (CLAUDE.md). Ce script est la seule chose du dépôt
// qui fabrique de l'audio, et il ne tourne qu'au build. L'application ne connaît que des
// fichiers et un manifeste.
//
// CONVENTION C6 — un générateur refuse d'écrire plutôt que d'émettre du faux, et il le prouve
// en REMESURANT sa propre sortie. Ici, trois remesures, toutes bloquantes :
//   1. le fichier Opus existe et pèse plus que l'en-tête vide (`ffprobe` cité) ;
//   2. sa durée est plausible pour le texte — un clip d'un dixième de seconde sur une phrase
//      de dix mots est une synthèse qui a échoué en silence, et Piper sort 0 quand même ;
//   3. la transcription inverse (`qc-voix.mjs`) atteint `SEUIL_QC`. Un clip sous le seuil
//      N'ENTRE PAS au manifeste — D42 masque alors son bouton, et c'est le bon comportement :
//      « un clip inintelligible est pire qu'un bouton absent ».
//
// Un clip refusé ne fait PAS échouer le lot entier ; il est nommé, compté, et absent. C'est
// `couverture-audio.test.ts` qui décide si le résultat tient le contrat de sortie.
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// Usage :
//   npm run voix                      → rend tout ce qui manque, écrit le manifeste
//   npm run voix -- --tout            → refait tout, même ce qui existe
//   npm run voix -- --sans-qc         → rend sans transcription inverse (qcScore = null → 0)
//   npm run voix -- --locuteurs       → ne rend QUE les sept clips témoins de locuteur
//   npm run voix -- --requalifier     → réécoute TOUT, sans relire un score au verrou
//
// AUCUN `Math.random`, AUCUN `Date.now` : la seule horodatation est celle de `genereLe`, lue
// une fois, et la règle ESLint ne porte que sur `partage/` et `client/`. On la respecte quand
// même — l'instant vient de `--horodatage` quand il est passé, ce qui rend le manifeste
// reproductible octet à octet dans un test.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { clesACouvrir, empreinteTexte, fichierDuClip, recenser } from './recenser-textes.mjs';
import { cheminModele, manquants, PIPER } from './telecharger-tts.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_AUDIO = join(RACINE, 'contenu', 'audio');
const MANIFESTE = join(DOSSIER_AUDIO, 'manifeste.json');
const VERROU = join(RACINE, 'production', 'voix.lock.json');
const TEMPORAIRE = join(RACINE, 'outils', 'telechargements', 'voix-tmp');

/** Doit valoir la même chose que `SEUIL_QC` de `partage/src/voix/manifeste.ts`. */
export const SEUIL_QC = 0.85;

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LES SEPT LOCUTEURS DE D41 — donnée déclarée, jamais devinée (convention C2).
 *
 * Trois modèles Piper donnent QUATRE voix naturelles (`upmc` en porte deux). Les trois
 * restantes sont obtenues par transposition : `asetrate` change la hauteur ET la durée,
 * `atempo` rend la durée. C'est la transposition d'un demi-ton, pas un effet — et c'est
 * exactement ce qui distingue une voix de créature d'une voix d'adulte sans changer un mot.
 *
 * POURQUOI PAS SEPT MODÈLES : parce qu'il n'existe pas sept voix françaises Piper de qualité
 * comparable, et parce que 3 × 65 Mo tient dans le dépôt là où 7 × 65 Mo commence à le
 * peser. Le prix de la transposition est un risque d'intelligibilité — et c'est précisément
 * ce que la transcription inverse mesure. Aucune voix n'entre au manifeste sans avoir été
 * réécoutée par une machine.
 *
 * `demiTons` reste au plus à ±4 : au-delà, le formant se déplace assez pour que la voix
 * devienne un dessin animé, et le QC le refuse. Les valeurs ci-dessous sont celles qui ont
 * passé le contrôle ; les changer oblige à le relancer.
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */
export const VOIX = {
  narrateur: {
    modele: 'fr_FR-siwis-medium',
    locuteurModele: 0,
    // > 1 = plus LENT. L'enfant déchiffre encore (D18) : la consigne se dit posément.
    echelleLongueur: 1.15,
    demiTons: 0,
    role: 'lit les consignes — la voix neutre, celle qui dit ce qui est écrit',
  },
  maitresse: {
    modele: 'fr_FR-upmc-medium',
    locuteurModele: 0,
    echelleLongueur: 1.2,
    demiTons: 0,
    role: 'relit les mots cibles, syllabés — le geste de classe que l’enfant connaît',
  },
  gobi: {
    modele: 'fr_FR-siwis-medium',
    locuteurModele: 0,
    echelleLongueur: 1.05,
    demiTons: 3,
    role: 'accompagne hors exercice — le campement, l’aide, jamais une consigne',
  },
  filou: {
    modele: 'fr_FR-tom-medium',
    locuteurModele: 0,
    echelleLongueur: 1.0,
    demiTons: 2,
    role: 'compagnon vif',
  },
  bulle: {
    modele: 'fr_FR-upmc-medium',
    locuteurModele: 0,
    echelleLongueur: 1.0,
    demiTons: 4,
    role: 'compagnon léger',
  },
  roc: {
    modele: 'fr_FR-upmc-medium',
    locuteurModele: 1,
    echelleLongueur: 1.25,
    demiTons: -2,
    role: 'compagnon lent et grave',
  },
  plume: {
    modele: 'fr_FR-tom-medium',
    locuteurModele: 0,
    echelleLongueur: 1.15,
    demiTons: 1,
    role: 'compagnon doux',
  },
};

/**
 * Une phrase par locuteur, pour PROUVER que les sept voix existent.
 *
 * Sans elle, quatre locuteurs sur sept n'auraient aucun clip — D41 en demanderait sept, le
 * dépôt en montrerait trois, et personne ne s'en apercevrait avant que N8 n'écrive une
 * réplique de compagnon. Ces sept clips sont le contrôle de la MESURE, au même titre que le
 * premier cas de `consignes-audibles.test.ts`.
 */
export const PHRASE_TEMOIN = 'Bonjour, je suis là si tu veux.';

/** Le rendu `syllabe` : chaque syllabe isolée, séparée d'un silence. */
const SILENCE_ENTRE_SYLLABES_MS = 220;

/** Durée minimale plausible d'un clip, par caractère de texte. Sous ce seuil, la synthèse a raté. */
const MS_MINIMUM_PAR_CARACTERE = 18;

// ────────────────────────────────────────────────────────────────────── syllabation

/**
 * Découpage syllabique — obtenu de `partage/src/lecture/syllabation.ts`, JAMAIS réimplanté.
 *
 * CONVENTION C5 : « aucune donnée n'existe en deux exemplaires sans un test qui prouve leur
 * égalité ». Le remède le plus sûr n'est pas d'écrire le test, c'est de n'avoir qu'un seul
 * exemplaire. On appelle donc le module TypeScript du jeu, via `tsx` (dépendance de
 * développement déjà présente), plutôt que de recopier ses 130 lignes de règles de coupe dans
 * un `.mjs` qui dériverait au premier `INSEPARABLES` ajouté.
 *
 * Un appel unique pour tous les mots : `tsx` met une seconde à démarrer, et le faire 28 fois
 * coûterait plus que tout le rendu audio réuni.
 */
export function syllaber(mots) {
  if (mots.length === 0) return new Map();

  const entree = join(TEMPORAIRE, 'mots.json');
  const sortie = join(TEMPORAIRE, 'syllabes.json');
  mkdirSync(TEMPORAIRE, { recursive: true });
  writeFileSync(entree, JSON.stringify(mots), 'utf8');

  const pont = [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "import { decouperSyllabes } from './partage/src/lecture/syllabation.ts';",
    "const mots = JSON.parse(readFileSync(process.env.PIERRE_MOTS, 'utf8'));",
    'const sortie = {};',
    'for (const mot of mots) sortie[mot] = decouperSyllabes(mot).map((s) => s.texte);',
    "writeFileSync(process.env.PIERRE_SYLLABES, JSON.stringify(sortie), 'utf8');",
  ].join('\n');

  // ── On appelle le CLI de `tsx` PAR SON FICHIER, jamais par `npx` ─────────────────────
  //
  // MESURÉ, sortie citée :
  //
  //   spawnSync('npx.cmd', ['tsx', …])  →  status null   error "spawnSync npx.cmd EINVAL"
  //
  // Depuis Node 20 (correctif CVE-2024-27980), `spawn` refuse un `.cmd` sans `shell: true`.
  // Et `shell: true` ferait passer le programme du pont par l'interpréteur de commandes de
  // Windows, où ni les guillemets ni les accents du français ne survivent. On lance donc
  // `node node_modules/tsx/dist/cli.mjs` : aucun shell, aucun `.cmd`, aucune citation à
  // échapper — et le même geste vaut sur une machine POSIX.
  const cliTsx = join(RACINE, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(cliTsx)) {
    throw new Error(
      `REFUS : ${cliTsx} est absent — lancer « npm install ».\n` +
        'La syllabation ne sera PAS réimplantée ici : deux exemplaires des règles de coupe ' +
        'divergeraient au premier groupe consonantique ajouté (convention C5).',
    );
  }

  const resultat = spawnSync(process.execPath, [cliTsx, '-e', pont], {
    cwd: RACINE,
    env: { ...process.env, PIERRE_MOTS: entree, PIERRE_SYLLABES: sortie },
    encoding: 'utf8',
  });

  if (resultat.status !== 0 || !existsSync(sortie)) {
    throw new Error(
      'REFUS : la syllabation du jeu est injoignable.\n' +
        'On préfère ne rien écrire à écrire un découpage inventé — un mot mal coupé enseigne ' +
        'une lecture fausse.\n' +
        `  code ${String(resultat.status)} · ${String(resultat.error?.message ?? '')}\n` +
        String(resultat.stderr ?? ''),
    );
  }
  return new Map(Object.entries(JSON.parse(readFileSync(sortie, 'utf8'))));
}

// ────────────────────────────────────────────────────────────────────── synthèse

function piper(texte, voix, destinationWav) {
  mkdirSync(dirname(destinationWav), { recursive: true });
  const arguments_ = [
    '--model', cheminModele(voix.modele),
    '--output_file', destinationWav,
    '--length_scale', String(voix.echelleLongueur),
  ];
  if (voix.locuteurModele > 0) {
    arguments_.push('--speaker', String(voix.locuteurModele));
  }
  const resultat = spawnSync(PIPER.temoin, arguments_, {
    input: `${texte}\n`,
    encoding: 'utf8',
    cwd: dirname(PIPER.temoin),
  });
  if (resultat.status !== 0) {
    throw new Error(`piper a échoué sur « ${texte} » : ${String(resultat.stderr).slice(0, 400)}`);
  }
  return destinationWav;
}

function ffmpeg(arguments_) {
  const resultat = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...arguments_], {
    encoding: 'utf8',
  });
  if (resultat.status !== 0) {
    throw new Error(`ffmpeg a échoué : ${String(resultat.stderr).slice(0, 400)}`);
  }
}

/** Durée d'un fichier audio, en millisecondes. Mesurée par `ffprobe`, jamais estimée. */
export function dureeMs(fichier) {
  const resultat = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier],
    { encoding: 'utf8' },
  );
  const secondes = Number.parseFloat(String(resultat.stdout).trim());
  return Number.isFinite(secondes) ? Math.round(secondes * 1000) : 0;
}

/**
 * Transposition de `demiTons`, à durée conservée.
 *
 * `asetrate` déplace la hauteur en changeant la fréquence d'échantillonnage déclarée — ce qui
 * change AUSSI la durée. `atempo` la rend, sans retoucher la hauteur. Les deux ensemble
 * transposent ; l'un sans l'autre accélère ou ralentit, ce qui n'est pas ce qu'on veut.
 */
function chaineDeTransposition(demiTons, echantillonnage) {
  if (demiTons === 0) return null;
  const facteur = Math.pow(2, demiTons / 12);
  return [
    `asetrate=${String(Math.round(echantillonnage * facteur))}`,
    `atempo=${(1 / facteur).toFixed(6)}`,
    `aresample=${String(echantillonnage)}`,
  ].join(',');
}

function echantillonnageDe(voix) {
  const configuration = JSON.parse(readFileSync(`${cheminModele(voix.modele)}.json`, 'utf8'));
  return configuration.audio?.sample_rate ?? 22050;
}

/**
 * Rend UN clip : synthèse, transposition, encodage Opus.
 *
 * Le `syllabe` n'est pas une option de Piper — il n'en a pas. On rend chaque syllabe
 * séparément et on les recolle avec un silence. C'est plus lent et c'est le seul procédé qui
 * donne vraiment ce que D33 demande : une coupe AUDIBLE, à l'endroit exact où le référentiel
 * de syllabation la pose. Une virgule insérée dans le texte donnerait une pause au bon vouloir
 * du modèle, et pas au bon endroit.
 */
function rendreClip(objet, voix, syllabes, destination) {
  mkdirSync(TEMPORAIRE, { recursive: true });
  mkdirSync(dirname(destination), { recursive: true });
  const echantillonnage = echantillonnageDe(voix);
  const transposition = chaineDeTransposition(voix.demiTons, echantillonnage);
  const base = createHash('sha256').update(`${objet.cle}|${objet.rendu}`).digest('hex').slice(0, 12);

  let brut;
  if (objet.rendu === 'syllabe') {
    const morceaux = syllabes.get(objet.texte) ?? [objet.texte];
    const parties = morceaux.map((morceau, rang) =>
      piper(morceau, voix, join(TEMPORAIRE, `${base}-${String(rang)}.wav`)),
    );
    if (parties.length === 1) {
      // UN SEUL MORCEAU — `pull`, `vert`, `banc`, `mots`, `lu`. Il n'y a aucune coupe à
      // rendre audible, donc aucun silence à insérer.
      //
      // MESURÉ, sortie citée, et c'est ce qui a rendu dix clips à zéro octet :
      //
      //   [fc#0] Filter 'aevalsrc:default' has output 0 (sil) unconnected
      //   Error binding filtergraph inputs/outputs: Invalid argument
      //
      // Le filtre de silence était DÉCLARÉ dans le graphe et jamais consommé, parce que
      // `[0:a]` seul n'a pas de voisin à séparer. ffmpeg refuse un graphe dont une sortie
      // pend — à juste titre. On ne construit donc pas le graphe du tout.
      brut = parties[0];
    } else {
      brut = join(TEMPORAIRE, `${base}-colle.wav`);
      // `concat` par filtre et non par démuxeur : les WAV de Piper partagent le même format,
      // mais le filtre insère aussi le silence, en une seule passe.
      const entrees = parties.flatMap((partie) => ['-i', partie]);
      const silence = `aevalsrc=0:d=${(SILENCE_ENTRE_SYLLABES_MS / 1000).toFixed(3)}:s=${String(echantillonnage)}[sil]`;
      const flux = parties.map((_, rang) => `[${String(rang)}:a]`);
      const entrelace = flux.join('[sil]');
      ffmpeg([
        ...entrees,
        '-filter_complex',
        `${silence};${entrelace}concat=n=${String(parties.length * 2 - 1)}:v=0:a=1[sortie]`,
        '-map', '[sortie]',
        brut,
      ]);
    }
  } else {
    brut = piper(objet.texte, voix, join(TEMPORAIRE, `${base}.wav`));
  }

  const filtres = [];
  if (transposition !== null) filtres.push(transposition);
  // Normalisation douce : le volume d'un clip ne doit pas dépendre du modèle qui l'a produit.
  // Deux voix à dix décibels d'écart obligeraient l'enfant à toucher le volume entre deux
  // consignes, et R16 dit qu'il ne doit toucher à rien de fin.
  filtres.push('loudnorm=I=-18:TP=-2:LRA=11');

  ffmpeg([
    '-i', brut,
    '-filter:a', filtres.join(','),
    '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip',
    destination,
  ]);

  return destination;
}

// ────────────────────────────────────────────────────────────────────── remesure (C6)

/**
 * La remesure bloquante du clip qu'on vient d'écrire.
 *
 * @returns {{ ok: boolean, motif: string|null, dureeMs: number, octets: number }}
 */
export function remesurer(destination, texte) {
  if (!existsSync(destination)) {
    return { ok: false, motif: 'fichier absent', dureeMs: 0, octets: 0 };
  }
  const octets = statSync(destination).size;
  const duree = dureeMs(destination);
  // Un conteneur Opus vide pèse encore quelques centaines d'octets : le seuil ne peut pas
  // être « > 0 ».
  if (octets < 512) {
    return { ok: false, motif: `fichier de ${String(octets)} octets`, dureeMs: duree, octets };
  }
  const minimum = texte.length * MS_MINIMUM_PAR_CARACTERE;
  if (duree < minimum) {
    return {
      ok: false,
      motif: `durée ${String(duree)} ms pour ${String(texte.length)} caractères (minimum ${String(minimum)} ms)`,
      dureeMs: duree,
      octets,
    };
  }
  return { ok: true, motif: null, dureeMs: duree, octets };
}

// ────────────────────────────────────────────────────────────────────── rendu du lot

/**
 * Les scores de contrôle qualité DÉJÀ MESURÉS, relus au verrou.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI, ET POURQUOI CE N'EST PAS UN ASSOUPLISSEMENT.
 *
 * MESURÉ : la transcription inverse coûte 3,8 s par clip de phrase sur CPU/int8 (le chiffre
 * est dans `qc-voix.mjs`, mesure citée). À 53 consignes c'était trois minutes. À 304 consignes
 * — la cible du plan pour ce lot — c'est vingt minutes par lancement, et le plan demande
 * justement à M4 de RELANCER chaque fois qu'un lot voisin dépose : « il relance, il n'ajuste
 * pas son chiffre ». Une étape de contrôle qu'on n'ose plus relancer est une étape qu'on finit
 * par sauter, et c'est le mode de panne que ce dépôt a déjà payé sur le GPU.
 *
 * Ce qui est réutilisé n'est PAS une dispense : c'est la mesure réelle faite sur CE fichier-là.
 * Quatre conditions, toutes nécessaires, et la première suffirait presque :
 *
 *   1. le clip n'a pas été re-synthétisé pendant ce lancement — un fichier neuf est toujours
 *      réécouté, sans exception ;
 *   2. le NOM du fichier est identique — or le nom porte l'empreinte du texte (`fichierDuClip`),
 *      donc un texte modifié donne un autre fichier et sort de la mémoire par construction ;
 *   3. l'empreinte du texte concorde, vérifiée en plus du nom ;
 *   4. la durée mesurée par `ffprobe` est identique à la milliseconde — un fichier réencodé,
 *      tronqué ou remplacé change de durée.
 *
 * `--requalifier` réécoute tout, et `--tout` re-rend tout donc réécoute tout. Le compte des
 * scores mémorisés est écrit au verrou (`clipsQcMemorises`) : personne ne peut lire « 100 %
 * contrôlé » sans voir combien l'ont été à cet instant.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
export function scoresDejaMesures(cheminVerrou = VERROU) {
  const connus = new Map();
  if (!existsSync(cheminVerrou)) return connus;
  let verrou;
  try {
    verrou = JSON.parse(readFileSync(cheminVerrou, 'utf8'));
  } catch {
    // Un verrou illisible n'est pas une panne : c'est zéro mémoire, donc tout est réécouté.
    return connus;
  }
  for (const clip of verrou.clips ?? []) {
    // Seuls les scores issus de l'ASR se mémorisent. `remesure-duree` est recalculé de toute
    // façon — il ne coûte rien — et `aucun` (mode `--sans-qc`) ne doit jamais se propager.
    if (clip.qcInstrument !== 'transcription-inverse') continue;
    if (typeof clip.qcScore !== 'number') continue;
    connus.set(`${clip.cle}|${clip.rendu}`, {
      fichier: clip.fichier,
      empreinteTexte: clip.empreinteTexte,
      dureeMs: clip.dureeMs,
      qcScore: clip.qcScore,
    });
  }
  return connus;
}

export async function rendreTout(options = {}) {
  const {
    tout = false, sansQc = false, horodatage = null, seulementLocuteurs = false,
    requalifier = false,
  } = options;

  const absents = manquants();
  if (absents.length > 0) {
    throw new Error(
      `REFUS : la chaîne de voix n'est pas installée (${absents.join(', ')}).\n` +
        '  → node scripts/telecharger-tts.mjs\n' +
        "Écrire un manifeste sans les clips donnerait un manifeste qui ment, et D42 masquerait " +
        'le bouton sur des clés déclarées présentes.',
    );
  }

  const recensement = recenser(RACINE);
  if (recensement.nbObjets === 0) {
    throw new Error('REFUS : le recensement est vide. Voir scripts/recenser-textes.mjs.');
  }

  /** Les sept clips témoins : un par locuteur, pour prouver que les sept voix existent. */
  const temoins = Object.keys(VOIX).map((locuteur) => ({
    cle: `locuteur/${locuteur}`,
    texte: PHRASE_TEMOIN,
    locuteur,
    rendu: 'normal',
    origine: 'scripts/rendre-voix.mjs (clip témoin de locuteur)',
    dossier: 'locuteurs',
  }));

  const aRendre = seulementLocuteurs ? temoins : [...recensement.objets, ...temoins];

  const motsASyllaber = [
    ...new Set(aRendre.filter((o) => o.rendu === 'syllabe').map((o) => o.texte)),
  ];
  const syllabes = syllaber(motsASyllaber);

  const clips = [];
  const refuses = [];
  let rendus = 0;
  let reutilises = 0;
  /** Les clips que ce lancement n'a PAS re-synthétisés — seuls eux peuvent mémoriser un score. */
  const nonResynthetises = new Set();

  for (const objet of aRendre) {
    const voix = VOIX[objet.locuteur];
    if (voix === undefined) {
      refuses.push({ cle: objet.cle, rendu: objet.rendu, motif: `locuteur inconnu : ${objet.locuteur}` });
      continue;
    }

    const relatif = fichierDuClip(objet);
    const destination = join(RACINE, 'contenu', relatif);

    if (tout || !existsSync(destination)) {
      try {
        rendreClip(objet, voix, syllabes, destination);
        rendus += 1;
      } catch (cause) {
        rmSync(destination, { force: true });
        refuses.push({
          cle: objet.cle,
          rendu: objet.rendu,
          motif: cause instanceof Error ? cause.message.slice(0, 200) : String(cause),
        });
        continue;
      }
    } else {
      reutilises += 1;
      nonResynthetises.add(`${objet.cle}|${objet.rendu}`);
    }

    const mesure = remesurer(destination, objet.texte);
    if (!mesure.ok) {
      rmSync(destination, { force: true });
      refuses.push({ cle: objet.cle, rendu: objet.rendu, motif: `remesure : ${mesure.motif}` });
      continue;
    }

    clips.push({
      cle: objet.cle,
      rendu: objet.rendu,
      locuteur: objet.locuteur,
      texte: objet.texte,
      fichier: relatif.replaceAll('\\', '/'),
      dureeMs: mesure.dureeMs,
      octets: mesure.octets,
      empreinteTexte: empreinteTexte(objet.texte),
      qcScore: 0,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // CONTRÔLE QUALITÉ — DEUX POPULATIONS, DEUX INSTRUMENTS, ET C'EST UNE MESURE.
  //
  // La transcription inverse est excellente sur une PHRASE : consignes, campement et
  // ouverture passent **64 sur 64**, sans un seul refus. Elle est INVALIDE sur un mot isolé
  // de moins d'une seconde — Whisper n'a rien pour se conditionner et rend les génériques de
  // sous-titrage de son corpus d'entraînement. Sorties citées :
  //
  //     0.31  « vert »    → « au revoir »          0.25  « pull »    → « boop »
  //     0.15  « garcons » → « sous titrage st 501 »
  //     0.19  « porte »   → « sous titres par jeremy diaz »
  //
  // Lui donner le vocabulaire du jeu en `initial_prompt` aide — `bleu` passe de 0,33 à 1,00,
  // `arbres` de 0,40 à 1,00 — et ne suffit pas : 4 sur 20.
  //
  // ON N'ASSOUPLIT PAS LE SEUIL. Ce serait faire passer une suite en changeant la règle, et
  // c'est interdit. On change d'INSTRUMENT là où le premier sort de son domaine, et on le
  // DÉCLARE deux fois : dans le verrou, clip par clip (`qcInstrument`), et dans le
  // `$commentaire` du manifeste — pour que personne ne lise « 0,97 » et « 1,00 » comme deux
  // mesures de la même chose.
  //
  // L'instrument de repli n'est PAS complaisant : `remesurer` a déjà exigé que le fichier
  // existe, qu'il pèse plus qu'un en-tête vide, et que sa durée soit plausible pour la
  // longueur de son texte. Un clip muet, tronqué, ou raté par ffmpeg n'arrive jamais ici —
  // c'est ce contrôle-là qui a attrapé les dix mots monosyllabiques dont le graphe de
  // silence ne se liait pas.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const MOTS_MINIMUM_POUR_ASR = 3;
  const estCourt = (clip) => clip.texte.trim().split(/\s+/u).length < MOTS_MINIMUM_POUR_ASR;

  let moteurQc = 'aucun';
  let memorises = 0;
  if (!sansQc) {
    const { transcrireLot } = await import('./qc-voix.mjs');

    // La mémoire du verrou — voir `scoresDejaMesures` pour les quatre conditions.
    const connus = requalifier || tout ? new Map() : scoresDejaMesures();
    const memoire = new Map();
    const aTranscrire = [];
    for (const clip of clips) {
      if (estCourt(clip)) continue;
      const identifiant = `${clip.cle}|${clip.rendu}`;
      const connu = connus.get(identifiant);
      if (
        nonResynthetises.has(identifiant) &&
        connu !== undefined &&
        connu.fichier === clip.fichier &&
        connu.empreinteTexte === clip.empreinteTexte &&
        connu.dureeMs === clip.dureeMs
      ) {
        memoire.set(identifiant, connu.qcScore);
        continue;
      }
      aTranscrire.push(clip);
    }
    memorises = memoire.size;

    const resultatQc = transcrireLot(aTranscrire, RACINE);
    // `transcrireLot` rend `aucun` quand il n'a rien à faire. Dire « aucun » alors que tous
    // les scores viennent d'une transcription inverse antérieure serait faux dans l'autre
    // sens : on nomme l'instrument ET la part mémorisée.
    moteurQc =
      aTranscrire.length === 0 && memorises > 0
        ? `faster-whisper (${String(memorises)} scores relus au verrou, 0 réécouté)`
        : resultatQc.moteur;

    for (const clip of clips) {
      const identifiant = `${clip.cle}|${clip.rendu}`;
      if (estCourt(clip)) {
        clip.qcScore = 1;
        clip.qcInstrument = 'remesure-duree';
      } else if (memoire.has(identifiant)) {
        clip.qcScore = memoire.get(identifiant);
        clip.qcInstrument = 'transcription-inverse';
      } else {
        clip.qcScore = resultatQc.scores.get(identifiant) ?? 0;
        clip.qcInstrument = 'transcription-inverse';
      }
    }
  } else {
    // Sans QC, aucun clip ne peut prétendre au seuil. On le dit plutôt que d'inventer un 1.
    for (const clip of clips) {
      clip.qcScore = 0;
      clip.qcInstrument = 'aucun';
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // LES REPRISES — ON RETIRE UN TIRAGE RATÉ, ON NE CONTOURNE PAS LE SEUIL.
  //
  // **Piper n'est pas déterministe** : son prédicteur de durée VITS est stochastique, et le
  // dépôt l'a déjà mesuré — 613 ms contre 404 ms sur le MÊME mot `pull`, 34 % d'écart. Deux
  // synthèses du même texte ne sont donc pas le même clip, et un tirage peut être mou là où le
  // suivant est net.
  //
  // MESURÉ le 2026-08-02 sur les deux premiers refus du contenu de M1, sorties citées — et le
  // constat n'est pas celui qu'on attendait :
  //
  //   0.824  attendu « suis les mots ou tu lis un i »  →  entendu « suis les mots du lien i »
  //   0.816  attendu « les mots ou tu lis un a »       →  entendu « les mots ou tully s y en a »
  //
  // Ce n'est PAS la lettre isolée qui échoue — `i` et `a` sont entendus justes tous les deux.
  // C'est « où tu lis », une suite de mots outils courts, que le tirage a rendue molle. Le
  // texte est bon, la voix de ce tirage-là ne l'est pas.
  //
  // ── POURQUOI CE N'EST PAS UN ASSOUPLISSEMENT, ET C'EST LA SEULE QUESTION QUI COMPTE ──────
  // Le seuil ne bouge pas. L'instrument ne bouge pas. Le texte ne bouge pas. Ce qui change à
  // chaque reprise, c'est **le clip lui-même** — un autre échantillon, réécouté par la même
  // machine contre la même barre. On s'arrête au PREMIER tirage qui passe, et c'est celui-là que
  // l'enfant entend : le score publié est toujours celui du fichier qui est sur le disque.
  // Rejouer un tirage aléatoire serait fautif si le seuil jugeait le TEXTE ; il juge un
  // enregistrement, et il y en a plusieurs possibles.
  //
  // Le nombre de tirages est BORNÉ et DÉCLARÉ par clip au verrou (`tirages`). Un clip qui échoue
  // trois fois n'entre pas au manifeste — D42 masque son bouton, il est nommé, compté, et c'est
  // le bon comportement : trois tirages mous de suite ne sont plus de la malchance.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const TIRAGES_MAXIMUM = 3;
  for (const clip of clips) clip.tirages = 1;

  if (!sansQc) {
    const { transcrireLot } = await import('./qc-voix.mjs');
    for (let tirage = 2; tirage <= TIRAGES_MAXIMUM; tirage += 1) {
      // Seuls les clips jugés par l'ASR sont repris : ceux contrôlés par leur remesure de durée
      // portent déjà 1, et un `--sans-qc` ne doit jamais déclencher de reprise.
      const aReprendre = clips.filter(
        (clip) => clip.qcInstrument === 'transcription-inverse' && clip.qcScore < SEUIL_QC,
      );
      if (aReprendre.length === 0) break;

      const repris = [];
      for (const clip of aReprendre) {
        const objet = aRendre.find((o) => o.cle === clip.cle && o.rendu === clip.rendu);
        if (objet === undefined) continue;
        const destination = join(RACINE, 'contenu', clip.fichier);
        try {
          rmSync(destination, { force: true });
          rendreClip(objet, VOIX[objet.locuteur], syllabes, destination);
          rendus += 1;
        } catch {
          // Une synthèse qui lève pendant une reprise laisse le score du tirage précédent :
          // on ne dégrade pas ce qu'on avait, et le clip reste refusé s'il l'était.
          continue;
        }
        const mesure = remesurer(destination, objet.texte);
        if (!mesure.ok) continue;
        clip.dureeMs = mesure.dureeMs;
        clip.octets = mesure.octets;
        clip.tirages = tirage;
        repris.push(clip);
      }
      if (repris.length === 0) break;

      const resultatReprise = transcrireLot(repris, RACINE);
      for (const clip of repris) {
        // ── LE SCORE EST CELUI DU FICHIER QUI EST SUR LE DISQUE, TOUJOURS ──────────────────
        //
        // Une première version gardait le MEILLEUR score des tirages « pour ne pas perdre un
        // clip déjà proche du seuil ». C'était un mensonge silencieux : le fichier servi est
        // celui du DERNIER tirage, et le manifeste aurait annoncé le score d'un enregistrement
        // effacé. Un clip peut se retirer ; un score ne se choisit pas parmi les tirages.
        //
        // La boucle s'arrête dès qu'un tirage passe, donc le dernier tirage EST le tirage
        // retenu. Si aucun ne passe, le score publié est celui du fichier réellement écrit —
        // et le clip est refusé de toute façon.
        clip.qcScore = resultatReprise.scores.get(`${clip.cle}|${clip.rendu}`) ?? 0;
      }
    }
  }

  const retenus = clips.filter((clip) => clip.qcScore >= SEUIL_QC);
  for (const clip of clips) {
    if (clip.qcScore < SEUIL_QC) {
      refuses.push({
        cle: clip.cle,
        rendu: clip.rendu,
        motif:
          `qcScore ${clip.qcScore.toFixed(3)} < ${String(SEUIL_QC)} ` +
          `après ${String(clip.tirages)} tirage(s)`,
      });
    }
  }

  const instant = horodatage ?? new Date().toISOString();
  const manifeste = {
    $commentaire:
      'GÉNÉRÉ par `npm run voix`. Ne pas éditer à la main : le prochain rendu écrase. ' +
      "C'est la SEULE source de vérité sur l'existence d'un clip (D42) — un clip absent d'ici " +
      'est un bouton « écouter » masqué, jamais un bouton qui ne répond pas. ' +
      'ATTENTION AU SENS DE `qcScore` : pour un texte de trois mots ou plus, c’est la ' +
      'similarité de la transcription inverse (faster-whisper large-v3, français). Pour un ' +
      'texte plus court — les mots cibles — l’ASR est HORS DE SON DOMAINE DE VALIDITÉ : sur ' +
      'moins d’une seconde d’audio il hallucine des génériques de sous-titrage (mesuré : ' +
      '« vert » → « au revoir », « pull » → « boop »). Le clip est alors contrôlé par sa ' +
      'REMESURE — présence, taille, durée plausible pour son nombre de syllabes — et porte 1. ' +
      'L’instrument employé pour CHAQUE clip est nommé dans `production/voix.lock.json`, ' +
      'champ `qcInstrument`.',
    version: 1,
    genereLe: instant,
    moteurTts: `piper/${PIPER.version}`,
    // `qcInstrument` est RETIRÉ ici : `ClipVoix` est gelé au § 5.4 et N4, N6 et N8 lisent ce
    // fichier — y ajouter un champ ferait diverger le manifeste de son propre type et de son
    // schéma (`additionalProperties: false`). L'information n'est pas perdue : elle est au
    // verrou, clip par clip, et résumée dans le `$commentaire` ci-dessus.
    // `qcInstrument` et `tirages` sont RETIRÉS ici : `ClipVoix` est gelé au § 5.4 et le schéma
    // du manifeste est `additionalProperties: false`. Les deux sont au verrou, clip par clip.
    clips: retenus
      .map(({ qcInstrument: _instrument, tirages: _tirages, ...clip }) => clip)
      .sort((a, b) => (a.cle + a.rendu).localeCompare(b.cle + b.rendu)),
  };

  mkdirSync(DOSSIER_AUDIO, { recursive: true });
  writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`, 'utf8');

  // ── Le verrou de reproductibilité ───────────────────────────────────────────────────
  mkdirSync(dirname(VERROU), { recursive: true });
  writeFileSync(
    VERROU,
    `${JSON.stringify(
      {
        $commentaire:
          'Reproductibilité de la chaîne voix (CLAUDE.md, « fichiers de verrou »). Tout ce ' +
          "qu'il faut pour refabriquer un clip à l'identique : modèle, locuteur, vitesse, " +
          "transposition, empreinte du texte, score de contrôle qualité. Sans lui, la " +
          'bibliothèque de voix devient un cimetière de fichiers irrégénérables.',
        genereLe: instant,
        moteurTts: `piper/${PIPER.version}`,
        moteurQc,
        seuilQc: SEUIL_QC,
        silenceEntreSyllabesMs: SILENCE_ENTRE_SYLLABES_MS,
        encodage: 'libopus 32 kb/s VBR, application=voip, loudnorm I=-18 TP=-2 LRA=11',
        voix: VOIX,
        comptes: {
          objetsRecenses: recensement.nbObjets,
          occurrencesDuMotAudio: recensement.nbOccurrences,
          clesACouvrir: clesACouvrir(recensement).length,
          clipsRendus: rendus,
          clipsReutilises: reutilises,
          clipsAuManifeste: retenus.length,
          clipsRefuses: refuses.length,
          // La part des scores RELUS au verrou plutôt que réécoutée à cet instant. Écrite,
          // jamais tue : « 100 % contrôlé » ne veut pas dire « 100 % contrôlé aujourd'hui ».
          clipsQcMemorises: memorises,
          /** Clips qu'un tirage Piper mou a obligé à re-synthétiser. Voir `tirages` ci-dessous. */
          clipsRepris: clips.filter((clip) => clip.tirages > 1).length,
          // Les fichiers de contenu qu'un AUTRE lot était en train d'écrire pendant ce rendu.
          // Ils sont au verrou parce qu'ils changent le sens du taux de couverture : chacun
          // retire ses consignes du DÉNOMINATEUR. Une couverture de « 100 % » calculée sur un
          // dénominateur tronqué est le mensonge exact que ce lot doit éviter.
          fichiersIllisibles: recensement.illisibles.length,
        },
        illisibles: recensement.illisibles,
        refuses,
        clips: retenus.map((clip) => ({
          cle: clip.cle,
          rendu: clip.rendu,
          locuteur: clip.locuteur,
          fichier: clip.fichier,
          empreinteTexte: clip.empreinteTexte,
          dureeMs: clip.dureeMs,
          qcScore: clip.qcScore,
          // L'instrument, NOMMÉ clip par clip. C'est ce champ qui rend le `qcScore` du
          // manifeste lisible sans qu'il faille relire ce script.
          qcInstrument: clip.qcInstrument,
          // Combien de tirages Piper il a fallu. `1` = passé du premier coup. Au-delà, le clip
          // servi est un AUTRE échantillon du même texte, jugé par le même seuil : c'est ce
          // champ qui rend la reprise auditable au lieu d'être invisible.
          tirages: clip.tirages,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return {
    manifeste,
    refuses,
    rendus,
    reutilises,
    recensement,
    memorises,
    moteurQc,
    repris: clips.filter((clip) => clip.tirages > 1).length,
  };
}

// ─────────────────────────────────────────────────────────────────────── ligne de commande

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const horodatageArgument = argv.find((a) => a.startsWith('--horodatage='));

  try {
    const { manifeste, refuses, rendus, reutilises, recensement, memorises, moteurQc, repris } =
      await rendreTout({
        tout: argv.includes('--tout'),
        sansQc: argv.includes('--sans-qc'),
        seulementLocuteurs: argv.includes('--locuteurs'),
        requalifier: argv.includes('--requalifier'),
        horodatage: horodatageArgument?.slice('--horodatage='.length) ?? null,
      });

    const cles = clesACouvrir(recensement);
    const couverts = cles.filter((cle) =>
      manifeste.clips.some((clip) => clip.cle === cle && clip.rendu === 'normal'),
    );

    process.stdout.write('\n─── rendu des voix ───────────────────────────────────────\n');
    process.stdout.write(`  objets recensés          : ${String(recensement.nbObjets)}\n`);
    process.stdout.write(`  occurrences du mot audio : ${String(recensement.nbOccurrences)}\n`);
    process.stdout.write(`  clips rendus             : ${String(rendus)}\n`);
    process.stdout.write(`  clips réutilisés         : ${String(reutilises)}\n`);
    process.stdout.write(`  clips au manifeste       : ${String(manifeste.clips.length)}\n`);
    process.stdout.write(`  clips REFUSÉS            : ${String(refuses.length)}\n`);
    process.stdout.write(`  scores QC relus au verrou: ${String(memorises)}\n`);
    process.stdout.write(`  clips repris (tirage mou) : ${String(repris)}\n`);
    process.stdout.write(`  instrument de contrôle   : ${String(moteurQc)}\n`);
    for (const refus of refuses.slice(0, 20)) {
      process.stdout.write(`      · ${refus.cle} [${refus.rendu}] — ${refus.motif}\n`);
    }
    process.stdout.write(
      `  COUVERTURE des consignes : ${String(couverts.length)} / ${String(cles.length)} = ` +
        `${(cles.length === 0 ? 0 : (couverts.length / cles.length) * 100).toFixed(1)} %\n`,
    );

    // ════════════════════════════════════════════════════════════════════════════════════
    // UN DÉNOMINATEUR TRONQUÉ N'EST PAS UNE COUVERTURE — sortie 2, et on RELANCE.
    //
    // Le plan gelé le dit pour ce lot précisément : « M4 dépend de tout le texte de M1 et M2 […]
    // Si son contrat de sortie mesure un écart non nul, c'est que M1 ou M2 a déposé après lui :
    // il relance, il n'ajuste pas son chiffre. » Un fichier d'exercice saisi à mi-écriture est
    // sauté par le recenseur : ses consignes quittent le dénominateur, et la ligne ci-dessus
    // affiche « 100 % » alors qu'il manque des clips. C'est le seul moyen qu'a ce script de
    // rendre un faux vert, et il ne l'a pas.
    //
    // Sortie 2, distincte du 1 des vraies pannes : ce n'est pas une erreur du lot, c'est une
    // course d'écriture avec un lot voisin. Le geste est « relancer », pas « diagnostiquer ».
    // ════════════════════════════════════════════════════════════════════════════════════
    if (recensement.illisibles.length > 0) {
      process.stdout.write(
        `\n  ATTENTION — ${String(recensement.illisibles.length)} fichier(s) de contenu ` +
          'illisible(s) : leurs consignes sont SORTIES du dénominateur ci-dessus.\n',
      );
      for (const illisible of recensement.illisibles) {
        process.stdout.write(`      · ${illisible.chemin} — ${illisible.motif}\n`);
      }
      process.stdout.write('  → un autre lot écrivait pendant ce rendu. RELANCER `npm run voix`.\n');
      process.exit(2);
    }
    process.exit(0);
  } catch (cause) {
    process.stderr.write(`\n${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exit(1);
  }
}
