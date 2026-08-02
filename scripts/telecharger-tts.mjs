// Installation de la chaîne de voix HORS LIGNE — lot N2, contrat de finition v3 § 4.2.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// D9, RÈGLE DURE : rien ne s'installe hors du dossier du projet. Piper et ses modèles vont
// dans `outils/bin/tts/`, jamais dans `%LOCALAPPDATA%`, jamais par `pip install -g`. On clone,
// on lance `npm run voix:preparer`, ça marche — et si on ne le lance pas, le jeu marche quand
// même : `MANIFESTE_VIDE` rend `aUnAudio` faux, D42 masque le bouton, et rien ne ment.
//
// POURQUOI PIPER ET NON CHATTERBOX/XTTS-v2, que l'annexe P § 1 préfère :
//   1. **D41 : voix entièrement synthétiques.** XTTS-v2 est un cloneur — sa raison d'être est
//      d'imiter une voix enregistrée, et D41 écarte l'enregistrement familial. Son intérêt
//      propre disparaît donc, et il ne reste que son coût.
//   2. **Le rendu est un artefact de BUILD** (CLAUDE.md). Piper est un binaire ONNX de 22 Mo
//      qui tourne sur CPU en temps réel ; XTTS-v2 demande PyTorch, CUDA et ~2 Go de poids.
//      Pour 84 clips de moins de dix mots, le second est un mauvais échange.
//   3. **Le dépôt doit se comporter correctement quand le service est absent** (D9). Un
//      binaire qu'on télécharge et qu'on épingle par empreinte tient cette promesse ; un
//      environnement Python avec CUDA ne la tient sur aucune autre machine.
// L'annexe P le prévoyait explicitement : « Piper en repli ». On y est, et pour une raison.
//
// CHOIX N2-4, consigné dans `Docs/questions-en-attente.md` : trois modèles, quatre voix
// naturelles, sept locuteurs. Le détail de la table est dans `scripts/rendre-voix.mjs`.
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// Usage :
//   node scripts/telecharger-tts.mjs                → installe (idempotent)
//   node scripts/telecharger-tts.mjs --epingler     → télécharge, n'installe rien, imprime
//                                                     les empreintes à recopier ci-dessous
//   node scripts/telecharger-tts.mjs --verifier     → dit ce qui manque, code 1 si incomplet
//
// Deux propriétés non négociables, reprises de `telecharger-outils.mjs` (lot L-A) :
//   · IDEMPOTENT — relancer ne retélécharge rien.
//   · BRUYANT EN CAS DE DOUTE — une empreinte qui ne correspond pas arrête tout. Un outil à
//     moitié installé se paie trois heures plus tard.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DOSSIER_TTS = join(RACINE, 'outils', 'bin', 'tts');
const DOSSIER_MODELES = join(DOSSIER_TTS, 'modeles');
const DOSSIER_CACHE = join(RACINE, 'outils', 'telechargements');

/** Le binaire Piper, épinglé par version ET par empreinte. */
export const PIPER = {
  nom: 'piper',
  version: '2023.11.14-2',
  url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip',
  empreinte: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea',
  temoin: join(DOSSIER_TTS, 'piper', 'piper.exe'),
};

/**
 * Les TROIS modèles de voix. Quatre voix naturelles en sortent — `upmc` en porte deux.
 *
 * Aucun modèle n'est choisi pour sa nouveauté : `siwis` et `upmc` sont des corpus français
 * lus, propres et articulés ; `tom` échantillonne à 44,1 kHz, ce qui donne la seule voix
 * masculine vraiment claire du lot. Les trois sont sous licence libre et distribués par
 * `rhasspy/piper-voices`.
 */
export const MODELES = [
  {
    nom: 'fr_FR-siwis-medium',
    libelle: 'voix féminine neutre — le narrateur, et le timbre de base de Gobi',
    base: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium',
    empreinteOnnx: '641d1ab097da2b81128c076810edb052b385decc8be3381814802a64a73baf99',
    empreinteJson: '39479916c2db192b5ac9764daddd0c744d83e023ad890c6976c0633ae4df8959',
  },
  {
    nom: 'fr_FR-upmc-medium',
    libelle: 'deux locuteurs — `jessica` (0) la maîtresse, `pierre` (1) Roc',
    base: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium',
    empreinteOnnx: '9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f',
    empreinteJson: 'e8636ec15dfd5d72db37a02cb5320a20f2b8d339f2a0e4337da64c58a33a5868',
  },
  {
    nom: 'fr_FR-tom-medium',
    libelle: 'voix masculine 44,1 kHz — Filou et Plume',
    base: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium',
    empreinteOnnx: 'bf65074ccdeeeeaa832e75edb1c0a513c01c9a972bdf085ff8a6e71ea234fd41',
    empreinteJson: '2f7f885ad5a0aad802e3cc24e4f57239febdcb142b4876de5d238094674361cc',
  },
];

/** Chemin sur disque du fichier de poids d'un modèle. */
export function cheminModele(nom) {
  return join(DOSSIER_MODELES, `${nom}.onnx`);
}

/** Vrai si Piper ET les trois modèles sont installés. */
export function chaineInstallee() {
  if (!existsSync(PIPER.temoin)) return false;
  return MODELES.every(
    (m) => existsSync(cheminModele(m.nom)) && existsSync(`${cheminModele(m.nom)}.json`),
  );
}

/** Ce qui manque, nommément. Vide quand tout est là. */
export function manquants() {
  const absents = [];
  if (!existsSync(PIPER.temoin)) absents.push(`piper (${PIPER.temoin})`);
  for (const m of MODELES) {
    if (!existsSync(cheminModele(m.nom))) absents.push(`${m.nom}.onnx`);
    if (!existsSync(`${cheminModele(m.nom)}.json`)) absents.push(`${m.nom}.onnx.json`);
  }
  return absents;
}

function sha256(octets) {
  return createHash('sha256').update(octets).digest('hex');
}

async function telecharger(url, destination) {
  mkdirSync(dirname(destination), { recursive: true });
  process.stdout.write(`  … ${url}\n`);
  const reponse = await fetch(url, { redirect: 'follow' });
  if (!reponse.ok) {
    throw new Error(`${url} → HTTP ${String(reponse.status)}`);
  }
  const octets = Buffer.from(await reponse.arrayBuffer());
  writeFileSync(destination, octets);
  return octets;
}

/**
 * Extraction du zip par `tar` — présent nativement sur Windows 10+ et sur toute machine POSIX.
 *
 * On ne prend PAS de dépendance npm d'extraction : une dépendance de plus dans `package.json`
 * pour un geste que le système sait faire, c'est un octet de bundle et une surface de sécurité
 * pour rien.
 */
function extraireZip(archive, destination) {
  mkdirSync(destination, { recursive: true });

  // ─────────────────────────────────────────────────────────────────────────────────────
  // DEUX PIÈGES MESURÉS ICI, tous deux payés en sorties citées, tous deux invisibles à la
  // lecture. L'archive est un zip valide — `magic = 504b0304`, soit `PK\x03\x04` — et
  // pourtant :
  //
  //   $ tar -xf …/piper-2023.11.14-2.zip -C C:\…\outils\bin\tts
  //   tar: Cannot connect to C: resolve failed          ← `C:` lu comme un HÔTE distant
  //
  //   $ tar -xf piper-2023.11.14-2.zip     (cwd = destination, chemin relatif)
  //   tar: This does not look like a tar archive        ← le `tar` de MSYS ignore le zip
  //
  // Le `tar.exe` de Windows (bsdtar, `C:\Windows\System32`) sait lire un zip ; celui de Git
  // Bash, non — et c'est LUI que le PATH d'un terminal MSYS résout d'abord. On ne peut donc
  // pas se fier au nom `tar`. Sous Windows on passe par `Expand-Archive`, qui est toujours
  // là et n'a aucune des deux faiblesses ; ailleurs, `unzip` puis `tar`.
  // ─────────────────────────────────────────────────────────────────────────────────────
  const tentatives = process.platform === 'win32'
    ? [
        {
          commande: 'powershell',
          arguments: [
            '-NoProfile', '-NonInteractive', '-Command',
            `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${destination}' -Force`,
          ],
          options: {},
        },
      ]
    : [
        { commande: 'unzip', arguments: ['-oq', archive], options: { cwd: destination } },
        {
          commande: 'tar',
          arguments: ['-xf', relative(destination, archive)],
          options: { cwd: destination },
        },
      ];

  const echecs = [];
  for (const tentative of tentatives) {
    const resultat = spawnSync(tentative.commande, tentative.arguments, {
      ...tentative.options,
      stdio: 'inherit',
    });
    if (resultat.status === 0) return;
    echecs.push(`${tentative.commande} → ${String(resultat.status ?? resultat.error?.message)}`);
  }
  throw new Error(`extraction de ${archive} impossible (${echecs.join(' ; ')})`);
}

async function installer({ epingler }) {
  mkdirSync(DOSSIER_MODELES, { recursive: true });
  mkdirSync(DOSSIER_CACHE, { recursive: true });
  const empreintes = [];

  // ── Piper ────────────────────────────────────────────────────────────────────────────
  if (existsSync(PIPER.temoin) && !epingler) {
    process.stdout.write(`piper ${PIPER.version} : déjà installé.\n`);
  } else {
    const archive = join(DOSSIER_CACHE, `piper-${PIPER.version}.zip`);
    const octets = existsSync(archive) ? readFileSync(archive) : await telecharger(PIPER.url, archive);
    const empreinte = sha256(octets);
    empreintes.push(['piper', empreinte]);

    if (epingler) {
      process.stdout.write(`piper       sha256 = ${empreinte}\n`);
    } else {
      if (PIPER.empreinte !== null && PIPER.empreinte !== empreinte) {
        rmSync(archive, { force: true });
        throw new Error(
          `EMPREINTE PIPER INATTENDUE.\n  attendue : ${PIPER.empreinte}\n  reçue    : ${empreinte}\n` +
            'Rien n’a été installé. Relancer avec --epingler pour inspecter, jamais pour ' +
            'recopier sans regarder.',
        );
      }
      extraireZip(archive, DOSSIER_TTS);
      if (!existsSync(PIPER.temoin)) {
        throw new Error(`extraction faite, mais ${PIPER.temoin} est absent.`);
      }
      process.stdout.write(`piper ${PIPER.version} : installé.\n`);
    }
  }

  // ── Les modèles ──────────────────────────────────────────────────────────────────────
  for (const modele of MODELES) {
    const onnx = cheminModele(modele.nom);
    if (existsSync(onnx) && existsSync(`${onnx}.json`) && !epingler) {
      process.stdout.write(`${modele.nom} : déjà installé.\n`);
      continue;
    }

    const octetsJson = await telecharger(`${modele.base}.onnx.json`, `${onnx}.json`);
    const octetsOnnx = await telecharger(`${modele.base}.onnx`, onnx);
    const eJson = sha256(octetsJson);
    const eOnnx = sha256(octetsOnnx);
    empreintes.push([`${modele.nom}.onnx`, eOnnx], [`${modele.nom}.onnx.json`, eJson]);

    if (epingler) {
      process.stdout.write(`${modele.nom}  onnx = ${eOnnx}\n`);
      process.stdout.write(`${modele.nom}  json = ${eJson}\n`);
      continue;
    }
    if (modele.empreinteOnnx !== null && modele.empreinteOnnx !== eOnnx) {
      rmSync(onnx, { force: true });
      throw new Error(`EMPREINTE INATTENDUE pour ${modele.nom}.onnx : ${eOnnx}`);
    }
    if (modele.empreinteJson !== null && modele.empreinteJson !== eJson) {
      rmSync(`${onnx}.json`, { force: true });
      throw new Error(`EMPREINTE INATTENDUE pour ${modele.nom}.onnx.json : ${eJson}`);
    }
    process.stdout.write(`${modele.nom} : installé (${(octetsOnnx.length / 1048576).toFixed(1)} Mo).\n`);
  }

  return empreintes;
}

// ─────────────────────────────────────────────────────────────────────── ligne de commande

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const epingler = process.argv.includes('--epingler');

  if (process.argv.includes('--verifier')) {
    const absents = manquants();
    if (absents.length === 0) {
      process.stdout.write('Chaîne de voix complète.\n');
      process.exit(0);
    }
    process.stderr.write(`Chaîne de voix INCOMPLÈTE — ${String(absents.length)} élément(s) :\n`);
    for (const absent of absents) process.stderr.write(`  · ${absent}\n`);
    process.stderr.write('  → node scripts/telecharger-tts.mjs\n');
    process.exit(1);
  }

  try {
    await installer({ epingler });
    if (!epingler) {
      process.stdout.write(`\nChaîne de voix prête dans ${DOSSIER_TTS}\n`);
    }
  } catch (cause) {
    process.stderr.write(`\nÉCHEC : ${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exit(1);
  }
}
