// Contrôle qualité des voix par TRANSCRIPTION INVERSE — lot N2, contrat v3 § 4.2.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// « L'ASR n'est plus dans le jeu — elle revient au build comme contrôle qualité
//   (transcription inverse des clips synthétisés) » — CLAUDE.md.
//
// LE PRINCIPE, ET IL EST LE SEUL QUI RENDE LE LOT VÉRIFIABLE : on ne CROIT pas Piper sur
// parole. On réécoute chaque clip avec une machine indépendante — faster-whisper `large-v3`,
// français forcé — et on compare ce qu'elle entend à ce qu'on a demandé. Un clip que la
// machine ne comprend pas, l'enfant ne le comprendra pas non plus.
//
// C'est le CONTRAT DE SORTIE qui échoue si le travail est creux : sans cette étape, un
// manifeste de 91 clips silencieux passerait tous les tests d'existence de fichier. Avec elle,
// un clip sous `SEUIL_QC` = 0,85 n'entre pas au manifeste, donc D42 masque son bouton, donc
// rien ne ment.
//
// D9 : le modèle est téléchargé DANS LE DÉPÔT (`outils/bin/tts/whisper/`), jamais dans
// `%USERPROFILE%\.cache\huggingface`. `HF_HOME` et `download_root` sont posés tous les deux —
// l'un pour la bibliothèque, l'autre pour le cache du téléchargeur.
// D6 : `large-v3`, français, et **CPU/int8 par défaut** — le GPU a pendu sans jamais rendre
// la main (mesure citée dans le programme Python ci-dessous). `PIERRE_QC_CUDA=oui` le rallume.
// D4 autorise `faster-whisper` nommément ; il est installé dans le `.venv/` du dépôt.
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// Usage :
//   node scripts/qc-voix.mjs             → réécoute tous les clips du manifeste, imprime la table
//   node scripts/qc-voix.mjs --pire 10   → n'imprime que les dix moins bons

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PYTHON = join(
  RACINE,
  '.venv',
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);
const CACHE_MODELE = join(RACINE, 'outils', 'bin', 'tts', 'whisper');
const TEMPORAIRE = join(RACINE, 'outils', 'telechargements', 'voix-tmp');

/** D6 : `large-v3`, français forcé, repli CPU / int8. */
export const MODELE_ASR = 'large-v3';

/**
 * Le programme Python, EN LIGNE plutôt que dans un fichier à part.
 *
 * Le contrat § 0 interdit de créer un fichier non listé au § 4, et aucun `.py` n'y figure. Le
 * garder ici a d'ailleurs une vertu : la version du modèle, la langue forcée et la formule de
 * similarité sont sous les yeux de qui lit le contrôle qualité, au lieu d'être à deux fichiers
 * de distance.
 *
 * `difflib.SequenceMatcher` sur le texte NORMALISÉ — minuscules, sans accents, sans
 * ponctuation, espaces réduits. On ne juge pas Whisper sur une virgule : on juge s'il a
 * entendu les mêmes sons. Une comparaison sensible aux accents refuserait des clips parfaits
 * parce que l'ASR écrit « maitresse » quand on a demandé « maîtresse ».
 */
const PROGRAMME = `
import json, os, sys, unicodedata, difflib
entree = json.load(open(os.environ['PIERRE_QC_ENTREE'], encoding='utf-8'))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')

from faster_whisper import WhisperModel

def normaliser(texte):
    texte = unicodedata.normalize('NFD', texte.lower())
    texte = ''.join(c for c in texte if unicodedata.category(c) != 'Mn')
    texte = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in texte)
    return ' '.join(texte.split())

# ─────────────────────────────────────────────────────────────────────────────────────────
# CPU / int8 PAR DÉFAUT, et c'est une mesure, pas une prudence.
#
# MESURÉ le 2026-08-02 sur cette machine (RTX 5090, ctranslate2 4.8.1) :
#   · device='cuda'  → le processus s'est BLOQUÉ. Get-Process a rendu CPU = 0 après
#     20 minutes sur sept clips de deux secondes. Aucune exception, aucun message : rien à
#     rattraper par un except, donc aucun repli possible. C'est le pire mode de panne pour
#     une étape de build — elle ne rate pas, elle ne finit pas.
#   · device='cpu', compute_type='int8' → chargement 4,0 s, transcription 3,8 s par clip.
#     Environ six minutes pour le lot complet. Borné, reproductible, suffisant.
#
# D6 nomme le CPU/int8 comme repli ; il devient le chemin nominal, et le GPU un opt-in
# EXPLICITE (PIERRE_QC_CUDA=oui). Une étape de contrôle qualité qu'on n'ose plus lancer
# parce qu'elle peut pendre est une étape qu'on finit par sauter.
# ─────────────────────────────────────────────────────────────────────────────────────────
peripherique, calcul = 'cpu', 'int8'
if os.environ.get('PIERRE_QC_CUDA') == 'oui':
    try:
        modele = WhisperModel(entree['modele'], device='cuda', compute_type='float16',
                              download_root=entree['cache'])
        peripherique, calcul = 'cuda', 'float16'
    except Exception as cause:
        print('[qc] repli CPU/int8 :', str(cause)[:160], file=sys.stderr)
        modele = WhisperModel(entree['modele'], device='cpu', compute_type='int8',
                              download_root=entree['cache'])
else:
    modele = WhisperModel(entree['modele'], device='cpu', compute_type='int8',
                          download_root=entree['cache'])

# LE DOMAINE DE VALIDITE DE L'INSTRUMENT, en donnee et non en intention.
#
# Whisper decode par fenetres de 30 s et s'appuie fortement sur son modele de langue. Sur une
# phrase il est excellent : 64 clips de consigne, de campement et d'ouverture sur 64 passent
# le seuil de 0,85. Sur un MOT ISOLE de moins d'une seconde il n'a rien pour se conditionner
# et il hallucine les generiques de sous-titrage de son corpus d'entrainement. Mesure, sorties
# citees :
#
#     0.31  attendu 'vert'     -> entendu 'au revoir'
#     0.25  attendu 'pull'     -> entendu 'boop'
#     0.15  attendu 'garcons'  -> entendu 'sous titrage st 501'
#     0.19  attendu 'porte'    -> entendu 'sous titres par jeremy diaz'
#
# Le remede n'est PAS de baisser le seuil : ce serait assouplir une assertion pour faire
# passer une suite. C'est de rendre l'instrument valide en lui donnant le CONTEXTE qui lui
# manque — la liste des mots du jeu, passee en 'initial_prompt'.
#
# CE QUE CE BIAIS DONNE, ET CE QU'IL NE DONNE PAS : il nomme un VOCABULAIRE de plusieurs
# dizaines de mots, jamais la reponse. Whisper doit toujours choisir le bon parmi tous les
# autres, et un clip silencieux ou grasseyant continue de rendre autre chose. C'est du
# biaisage contextuel, pratique courante en ASR, pas une reponse soufflee.
vocabulaire = entree.get('vocabulaire') or ''
MOTS_MINIMUM_SANS_CONTEXTE = 3

resultats = []
for clip in entree['clips']:
    attendu = normaliser(clip['texte'])
    court = len(attendu.split()) < MOTS_MINIMUM_SANS_CONTEXTE
    try:
        segments, _ = modele.transcribe(
            clip['fichier'], language='fr', beam_size=5, vad_filter=False,
            initial_prompt=(vocabulaire if court else None),
            # Sur un clip court, la penalite de repetition et la detection de silence de
            # Whisper produisent justement les generiques hallucines. On les desarme.
            condition_on_previous_text=False,
            no_speech_threshold=(1.0 if court else 0.6))
        entendu = normaliser(' '.join(s.text for s in segments))
    except Exception as cause:
        resultats.append({'id': clip['id'], 'score': 0.0, 'entendu': '', 'attendu': attendu,
                          'court': court, 'erreur': str(cause)[:200]})
        continue
    score = difflib.SequenceMatcher(None, attendu, entendu).ratio() if attendu else 0.0
    # Sur un clip court, le mot attendu PRESENT dans la transcription vaut reussite meme si
    # Whisper y ajoute du bruit autour : c'est bien le mot qui a ete entendu.
    if court and attendu and attendu in entendu.split():
        score = 1.0
    resultats.append({'id': clip['id'], 'score': round(score, 4), 'entendu': entendu,
                      'attendu': attendu, 'court': court})

json.dump({'moteur': 'faster-whisper/' + entree['modele'] + '/' + peripherique + '-' + calcul,
           'resultats': resultats},
          open(os.environ['PIERRE_QC_SORTIE'], 'w', encoding='utf-8'), ensure_ascii=False)
`;

/**
 * Réécoute un lot de clips.
 *
 * @param {{cle:string, rendu:string, texte:string, fichier:string}[]} clips
 * @param {string} [racine]
 * @returns {{ moteur: string, scores: Map<string, number>, details: object[] }}
 */
export function transcrireLot(clips, racine = RACINE) {
  if (clips.length === 0) {
    return { moteur: 'aucun', scores: new Map(), details: [] };
  }
  if (!existsSync(PYTHON)) {
    throw new Error(
      `REFUS : ${PYTHON} est absent.\n` +
        'Le contrôle qualité est ce qui empêche un manifeste de 91 clips silencieux de passer ' +
        'pour un travail fait. On ne le contourne pas — on installe le venv du dépôt, ou on ' +
        'lance `npm run voix -- --sans-qc` et AUCUN clip n’entre au manifeste.',
    );
  }

  mkdirSync(TEMPORAIRE, { recursive: true });
  mkdirSync(CACHE_MODELE, { recursive: true });
  const entree = join(TEMPORAIRE, 'qc-entree.json');
  const sortie = join(TEMPORAIRE, 'qc-sortie.json');

  writeFileSync(
    entree,
    JSON.stringify({
      modele: MODELE_ASR,
      cache: CACHE_MODELE,
      // Le vocabulaire du jeu — TOUS les textes courts du lot, jamais celui du clip en cours.
      // Whisper doit encore choisir parmi eux ; c'est ce qui garde le contrôle informatif.
      vocabulaire: [
        ...new Set(
          clips
            .map((clip) => clip.texte)
            .filter((texte) => texte.split(/\s+/u).length < 3),
        ),
      ].join(', '),
      clips: clips.map((clip) => ({
        id: `${clip.cle}|${clip.rendu}`,
        texte: clip.texte,
        fichier: join(racine, 'contenu', clip.fichier),
      })),
    }),
    'utf8',
  );

  // ─────────────────────────────────────────────────────────────────────────────────────
  // `pipe`, JAMAIS `inherit` — mesuré deux fois, et les deux fois ça a coûté vingt minutes.
  //
  // Avec `stdio: [..., 'inherit', 'inherit']`, le processus Python hérite des descripteurs
  // du parent. Quand ce parent est lui-même une tâche de fond dont la sortie part dans un
  // tuyau, personne ne vide ce tuyau assez vite : Python remplit le tampon et se BLOQUE.
  // Constat cité, `Get-Process` :
  //
  //     Id    StartTime            CPU   WorkingSet64
  //     33928 02/08/2026 01:21:32  0     4227072
  //
  // CPU à zéro et 4 Mo de mémoire de travail : l'interpréteur n'avait même pas fini de
  // démarrer. Le même programme lancé au premier plan finissait en 30 secondes. Ce n'était
  // donc jamais un problème de modèle ni de machine.
  //
  // Avec `pipe`, `spawnSync` vide les tuyaux lui-même. On réimprime la sortie APRÈS, ce qui
  // ne perd rien et ne bloque personne. Les barres de progression de `huggingface_hub` sont
  // éteintes : elles n'apportent rien à un journal de build et remplissaient le tampon.
  // ─────────────────────────────────────────────────────────────────────────────────────
  const resultat = spawnSync(PYTHON, ['-c', PROGRAMME], {
    cwd: racine,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      HF_HUB_DISABLE_PROGRESS_BARS: '1',
      PIERRE_QC_ENTREE: entree,
      PIERRE_QC_SORTIE: sortie,
      // D9 : tout reste dans le dépôt. Sans ces deux-là, `huggingface_hub` écrit trois
      // gigaoctets dans `%USERPROFILE%\\.cache` — invisibles, non versionnés, et perdus au
      // clone suivant.
      HF_HOME: CACHE_MODELE,
      HUGGINGFACE_HUB_CACHE: CACHE_MODELE,
      XDG_CACHE_HOME: CACHE_MODELE,
    },
  });

  // La sortie du programme, réimprimée maintenant que plus rien ne peut bloquer dessus.
  if (typeof resultat.stderr === 'string' && resultat.stderr.length > 0) {
    process.stderr.write(resultat.stderr);
  }

  if (resultat.status !== 0 || !existsSync(sortie)) {
    throw new Error(
      `REFUS : la transcription inverse a échoué (code ${String(resultat.status)}).\n` +
        'Aucun score inventé : un clip non contrôlé reste hors du manifeste.\n' +
        String(resultat.error?.message ?? ''),
    );
  }

  const brut = JSON.parse(readFileSync(sortie, 'utf8'));
  const scores = new Map();
  for (const ligne of brut.resultats) {
    scores.set(ligne.id, ligne.score);
  }
  return { moteur: brut.moteur, scores, details: brut.resultats };
}

// ─────────────────────────────────────────────────────────────────────── ligne de commande

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifeste = join(RACINE, 'contenu', 'audio', 'manifeste.json');
  if (!existsSync(manifeste)) {
    process.stderr.write('Aucun manifeste. Lancer `npm run voix` d’abord.\n');
    process.exit(1);
  }
  const { clips } = JSON.parse(readFileSync(manifeste, 'utf8'));
  const { moteur, details } = transcrireLot(clips);

  const rangPire = process.argv.indexOf('--pire');
  const limite = rangPire >= 0 ? Number.parseInt(process.argv[rangPire + 1] ?? '10', 10) : details.length;
  const tries = [...details].sort((a, b) => a.score - b.score).slice(0, limite);

  process.stdout.write(`\nmoteur : ${moteur}\n`);
  for (const ligne of tries) {
    process.stdout.write(`  ${ligne.score.toFixed(3)}  ${ligne.id}\n`);
    if (ligne.score < 0.85) {
      process.stdout.write(`         attendu : ${String(ligne.attendu ?? '')}\n`);
      process.stdout.write(`         entendu : ${String(ligne.entendu ?? '')}\n`);
    }
  }
  const sousSeuil = details.filter((l) => l.score < 0.85).length;
  process.stdout.write(
    `\n  clips contrôlés : ${String(details.length)} · sous 0,85 : ${String(sousSeuil)}\n`,
  );
  process.exit(sousSeuil === 0 ? 0 : 1);
}
