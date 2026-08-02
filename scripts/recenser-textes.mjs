// Recensement des OBJETS qui doivent porter un audio — lot N2, contrat de finition v3 § 4.2.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// LA RÈGLE QUI COMMANDE CE FICHIER : on énumère les OBJETS, jamais les occurrences.
//
// Auditer une propriété, c'est énumérer les objets qui DEVRAIENT la porter, pas les endroits
// où le mot apparaît. Un `grep -c '"audio"'` sur `contenu/exercices/` rend 15 ; le nombre de
// consignes réellement livrées est 17, parce que les deux exercices `trace` portent leur
// consigne au SINGULIER (`consigne` / `consigneId`, sans champ `audio` par consigne) et
// qu'aucun `grep` ne les compte. Les deux consignes manquantes sont précisément celles du
// moteur qui répond au besoin nommé de l'enfant (D23, les confusions miroir).
//
// Ce script rend donc les DEUX comptes et leur écart — `nbObjets` et `nbOccurrences` — et le
// contrat de sortie de N2 porte sur le premier.
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// Usage :
//   node scripts/recenser-textes.mjs                 → imprime le recensement lisible
//   node scripts/recenser-textes.mjs --json          → imprime le JSON, pour un autre script
//
// Le module exporte `recenser(racine)` : `rendre-voix.mjs`, `qc-voix.mjs` et
// `tests/unitaires/couverture-audio.test.ts` l'appellent tous, pour que la liste des objets
// n'ait qu'une seule définition dans le dépôt.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE_PAR_DEFAUT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {object} ObjetParlant
 * @property {string} cle        `<idExercice>/<idConsigne>`, `campement/<id>`, `mot/<mot>`…
 * @property {string} texte      le texte source, tel qu'il est écrit à l'écran
 * @property {string} locuteur   l'un des sept de D41
 * @property {'normal'|'syllabe'|'lent'} rendu
 * @property {string} origine    le fichier d'où le texte vient — pour le rapport, pas pour le jeu
 * @property {string} dossier    sous-dossier de `contenu/audio/`
 */

/**
 * Qui parle quoi. **Donnée déclarée**, pas devinée à l'exécution (convention C2).
 *
 * `narrateur` porte les consignes : c'est la voix neutre qui lit ce qui est écrit. `maitresse`
 * porte la relecture syllabée des mots cibles, parce que c'est le geste de classe que l'enfant
 * connaît. `gobi` porte le campement, parce que c'est lui qui accompagne l'enfant hors
 * exercice. Les quatre compagnons — `filou`, `bulle`, `roc`, `plume` — n'ont aucun texte
 * livré à ce jour : ils sont dans l'union parce que D41 en demande sept et parce que N8 leur
 * écrira des répliques de région ; le rendu produit pour chacun un clip témoin, de sorte que
 * les sept voix soient PROUVÉES fonctionnelles avant qu'un lot n'en dépende.
 */
export const LOCUTEUR_DES_CONSIGNES = 'narrateur';
export const LOCUTEUR_DES_MOTS = 'maitresse';
export const LOCUTEUR_DU_CAMPEMENT = 'gobi';

/** Empreinte courte d'un texte — sert au nom de fichier (`Cache-Control: immutable`, § 8). */
export function empreinteTexte(texte) {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/**
 * Nom de fichier stable et lisible pour un clip. Le nom porte l'empreinte du texte : il ne
 * change donc jamais sous le même contenu, et c'est ce qui autorise `Cache-Control: immutable`
 * (contrat v3 § 8).
 *
 * **ASCII SEUL, et c'est une correction mesurée.** Une première version gardait les lettres
 * accentuées — `\p{L}` les accepte — et produisait `mot-maîtresse.normal.58493a86.opus`,
 * `mot-garçons…`, `mot-école…`. Trois raisons de ne pas les garder, et la première suffit :
 *
 *   1. `contenu/schemas/manifeste-audio.schema.json` impose `^audio/[A-Za-z0-9_./-]+\.opus$`.
 *      Le manifeste produit aurait été REFUSÉ par sa propre validation de contenu ;
 *   2. le nom traverse une URL (`GET /api/audio/*`). Un caractère non ASCII y vit en
 *      pourcentage, et le dépôt a déjà payé un bogue de `decodeURIComponent` sur cette route ;
 *   3. « on clone, on lance, ça marche » (D9) traverse des systèmes de fichiers qui ne
 *      normalisent pas Unicode de la même façon — macOS compose en NFD, Windows en NFC. Le
 *      même nom cesse alors d'être le même fichier.
 *
 * Le texte, lui, garde ses accents : c'est `ClipVoix.texte` qui les porte, et c'est lui que la
 * synthèse lit. Seul le NOM est translittéré.
 */
export function fichierDuClip(objet) {
  const base = objet.cle
    .normalize('NFD')
    // Marques diacritiques combinantes : `î` devient `i`, `ç` devient `c`, `é` devient `e`.
    // Les points de code sont écrits en `\u` : ces caractères sont INVISIBLES dans un
    // éditeur, et une classe qui les contient littéralement se relit comme une erreur.
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase();
  const court = empreinteTexte(objet.texte).slice(0, 8);
  return `audio/${objet.dossier}/${base}.${objet.rendu}.${court}.opus`;
}

/**
 * Lecture JSON TOLÉRANTE — et ce n'est pas de la complaisance, c'est une mesure.
 *
 * MESURÉ le 2026-08-02 à 00 h 51, sortie citée :
 *
 *   SyntaxError: Expected ',' or '}' after property value in JSON at position 139
 *       at lireJson (scripts/recenser-textes.mjs:70)
 *       ← contenu/monde/ouverture.json, écrit par N4 À CET INSTANT
 *
 * Aucun des fichiers que ce recenseur lit n'appartient à N2 : les exercices sont à N1 et N8,
 * le campement à N6, l'ouverture à N4. Dans une campagne à fichiers disjoints mais à écritures
 * SIMULTANÉES, tomber sur un fichier à moitié écrit n'est pas un cas limite, c'est le cas
 * ordinaire — et un recenseur qui meurt dessus fait échouer un lot pour le travail d'un autre.
 *
 * On saute donc, on NOMME le fichier, et le compte des illisibles remonte au rapport. Ce qui
 * serait fautif, ce serait de sauter en silence : le contrat de sortie porte sur un taux, et
 * un objet non recensé disparaît du dénominateur au lieu d'apparaître au numérateur.
 */
function lireJson(chemin, illisibles) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (cause) {
    illisibles.push({
      chemin: chemin.replaceAll('\\', '/'),
      motif: cause instanceof Error ? cause.message.slice(0, 120) : String(cause),
    });
    return null;
  }
}

function fichiersExercices(racine) {
  const dossier = join(racine, 'contenu', 'exercices');
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((region) =>
      readdirSync(join(dossier, region.name))
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => ({ region: region.name, chemin: join(dossier, region.name, f) })),
    );
}

/**
 * L'invitation du coloriage libre, LUE DANS LE COMPOSANT QUI L'AFFICHE.
 *
 * `libre` est le seul moteur sans consigne — c'est son contrat (§ 4.8) — et il affiche
 * pourtant un texte : `INVITE_LIBRE` de `client/src/moteurs/libre/MoteurLibre.tsx`. R15 ne
 * fait aucune exception (« aucune consigne n'existe uniquement à l'écrit »), et le contrôle
 * de mesure de `consignes-audibles.test.ts` — « au moins une consigne par exercice » —
 * l'exige explicitement. On la LIT plutôt que de la recopier : une recopie est une seconde
 * source de vérité, et elle prend du retard au premier changement de mot.
 *
 * REFUS plutôt que faux (convention C6) : si la constante disparaît ou change de forme, on
 * lève. Rendre une chaîne par défaut ferait synthétiser un clip que l'écran n'affiche pas.
 */
export function inviteLibre(racine = RACINE_PAR_DEFAUT) {
  const chemin = join(racine, 'client', 'src', 'moteurs', 'libre', 'MoteurLibre.tsx');
  const source = readFileSync(chemin, 'utf8');
  const trouve = /export const INVITE_LIBRE\s*=\s*'([^']+)'/u.exec(source);
  if (trouve === null) {
    throw new Error(
      'REFUS : `export const INVITE_LIBRE = \'…\'` est introuvable dans ' +
        'client/src/moteurs/libre/MoteurLibre.tsx. Le texte que le moteur `libre` affiche ne ' +
        'peut plus être recensé, donc plus être rendu en voix (R15). Corriger le motif AVANT ' +
        'de relancer `npm run voix`.',
    );
  }
  return trouve[1];
}

/**
 * Les consignes d'un exercice, dans les QUATRE formes que la coquille sait lire.
 *
 * `EcranNoeud.tsx` (`extraireEtapes`) lit `consignes: [{ id, texte }]` au pluriel,
 * `consigne: string` / `consigneId` au singulier pour le moteur `trace`, `questions:
 * [{ id, texte }]` pour le moteur `histoire`, et l'invitation du moteur `libre`. Ce
 * recenseur lit exactement les mêmes formes : un objet que l'écran sait afficher et que le
 * recenseur ne verrait pas serait une consigne muette invisible au contrat de sortie.
 *
 * ── LES DEUX FORMES AJOUTÉES PAR LE LOT A4, ET POURQUOI ELLES MANQUAIENT ─────────────────
 * Elles ne manquaient pas par négligence : aucun exercice `histoire` ni `libre` n'existait
 * quand ce fichier a été écrit — les deux moteurs étaient déclarés, testés, et sans contenu.
 * C'est le mode de défaillance nommé par D48 : ce qu'aucun objet ne porte, aucun recensement
 * ne cherche. Dès qu'un exercice `histoire` est livré, ses questions s'affichent à l'écran
 * (`MoteurHistoire.tsx`, `ZoneDeLecture texte={question.texte}`) et R15 s'y applique
 * exactement comme à une consigne — c'est la même correction que celle déjà payée pour
 * `trace`, dont la consigne au singulier n'était comptée par aucun `grep`.
 */
function consignesDe(exercice, racine = RACINE_PAR_DEFAUT) {
  const contenu = exercice.jeu?.contenu ?? {};

  const unique = contenu.consigne;
  if (typeof unique === 'string' && unique.length > 0) {
    return [
      {
        id: typeof contenu.consigneId === 'string' ? contenu.consigneId : 'c1',
        texte: unique,
        motsCles: Array.isArray(contenu.motsCles) ? contenu.motsCles : [],
      },
    ];
  }

  // `libre` — pas de consigne dans les données, un texte à l'écran quand même.
  if (exercice.jeu?.moteur === 'libre') {
    return [{ id: 'c1', texte: inviteLibre(racine), motsCles: [] }];
  }

  // `histoire` — les QUESTIONS sont ses étapes, et chacune s'affiche en zone de lecture.
  const liste = Array.isArray(contenu.consignes)
    ? contenu.consignes
    : Array.isArray(contenu.questions)
      ? contenu.questions
      : [];
  return liste
    .filter((c) => typeof c?.texte === 'string' && c.texte.length > 0)
    .map((c, rang) => ({
      id: typeof c.id === 'string' ? c.id : `c${rang + 1}`,
      texte: c.texte,
      motsCles: Array.isArray(c.motsCles) ? c.motsCles : [],
    }));
}

/** Compte des OCCURRENCES du mot `audio` — l'autre chiffre, celui qu'on refuse d'appeler un audit. */
function compterOccurrencesAudio(racine) {
  let total = 0;
  for (const { chemin } of fichiersExercices(racine)) {
    total += (readFileSync(chemin, 'utf8').match(/"audio"\s*:/gu) ?? []).length;
  }
  return total;
}

/**
 * Le recensement complet.
 *
 * @param {string} [racine] racine du dépôt
 * @returns {{ objets: ObjetParlant[], nbObjets: number, nbOccurrences: number, sources: string[] }}
 */
export function recenser(racine = RACINE_PAR_DEFAUT) {
  /** @type {ObjetParlant[]} */
  const objets = [];
  const sources = [];
  /** Fichiers qu'un autre lot était en train d'écrire. Nommés, jamais tus. */
  const illisibles = [];
  /** Les mots cibles sont mutualisés : « luciole » n'est rendu qu'une fois pour tout le jeu. */
  const motsVus = new Set();

  // ── 1. Les consignes des exercices livrés ────────────────────────────────────────────
  for (const { region, chemin } of fichiersExercices(racine)) {
    const exercice = lireJson(chemin);
    const origine = chemin.slice(racine.length + 1).replaceAll('\\', '/');
    sources.push(origine);

    for (const consigne of consignesDe(exercice, racine)) {
      objets.push({
        cle: `${exercice.id}/${consigne.id}`,
        texte: consigne.texte,
        locuteur: LOCUTEUR_DES_CONSIGNES,
        rendu: 'normal',
        origine,
        dossier: region,
      });

      // Les MOTS CIBLES. Le contrat § 5.4 exige la variante syllabée « pour chaque mot
      // cible, pas seulement pour la consigne entière ». On rend les deux variantes : le
      // rendu `normal` parce que `aUnAudio` — donc D42, donc le bouton — n'interroge que
      // celui-là, et le rendu `syllabe` parce que c'est lui qui aide vraiment (R15, D33).
      for (const brut of consigne.motsCles) {
        if (typeof brut !== 'string' || brut.length === 0) continue;
        const mot = brut.toLocaleLowerCase('fr-FR');
        if (motsVus.has(mot)) continue;
        motsVus.add(mot);
        for (const rendu of ['normal', 'syllabe']) {
          objets.push({
            cle: `mot/${mot}`,
            texte: mot,
            locuteur: LOCUTEUR_DES_MOTS,
            rendu,
            origine,
            dossier: 'mots',
          });
        }
      }
    }
  }

  // ── 2. Le campement ───────────────────────────────────────────────────────────────────
  //
  // CHOIX N2-1, consigné dans `Docs/questions-en-attente.md`. Les 11 points à réaction
  // `replique` désignent des `.opus` qui n'ont jamais existé, et le SEUL texte que le dépôt
  // porte pour eux est leur `libelle` (« la tente », « le feu de camp »). C'est exactement ce
  // que le repli lisait déjà — le commentaire de `campement.json` le dit : « `FournisseurVoix`
  // retombe sur la lecture du libellé ». On rend donc le libellé, et rien d'inventé : N2 ne
  // possède pas `campement.json` (il est à N6, § 4.6) et n'a pas à lui écrire ses répliques.
  // Quand N6 y posera un texte plus riche, `npm run voix` le reprendra — l'empreinte du texte
  // rend la péremption mécanique.
  const campement = join(racine, 'contenu', 'monde', 'campement.json');
  if (existsSync(campement)) {
    const monde = lireJson(campement, illisibles);
    if (monde !== null) {
    sources.push('contenu/monde/campement.json');
    for (const point of monde.points ?? []) {
      if (point.reaction !== 'replique') continue;
      const texte = typeof point.texte === 'string' && point.texte.length > 0
        ? point.texte
        : point.libelle;
      if (typeof texte !== 'string' || texte.length === 0) continue;
      objets.push({
        cle: `campement/${point.id}`,
        texte,
        locuteur: LOCUTEUR_DU_CAMPEMENT,
        rendu: 'normal',
        origine: 'contenu/monde/campement.json',
        dossier: 'campement',
      });
    }
    }
  }

  // ── 3. La séquence d'ouverture — N4, vague 2 ─────────────────────────────────────────
  //
  // CHOIX N2-2. Le fichier n'existe pas au moment où N2 tourne : N4 est en vague 2 et le
  // contrat de sortie de N2 ne peut pas porter sur un texte qui n'est pas écrit. Le
  // recenseur le prend DÈS QU'IL EXISTE, sans qu'une ligne change — c'est ce qui permet de
  // relancer `npm run voix` après N4 et d'avoir la couverture complète sans rouvrir N2.
  const ouverture = join(racine, 'contenu', 'monde', 'ouverture.json');
  if (existsSync(ouverture)) {
    const sequence = lireJson(ouverture, illisibles);
    if (sequence !== null) {
    sources.push('contenu/monde/ouverture.json');
    for (const tableau of sequence.tableaux ?? []) {
      if (typeof tableau?.texte !== 'string' || tableau.texte.length === 0) continue;
      // La clé DÉCLARÉE par N4 gagne sur la clé dérivée. Les deux coïncident aujourd'hui
      // (`ouverture/pierre`), et c'est justement pourquoi il faut lire la déclarée : le jour
      // où elles divergeront, c'est le fichier de N4 qui aura raison — c'est lui que le jeu
      // lit — et une clé dérivée rendrait un clip que personne ne demanderait jamais.
      objets.push({
        cle: typeof tableau.cleAudio === 'string' && tableau.cleAudio.length > 0
          ? tableau.cleAudio
          : `ouverture/${tableau.code}`,
        texte: tableau.texte,
        locuteur: LOCUTEUR_DES_CONSIGNES,
        rendu: 'normal',
        origine: 'contenu/monde/ouverture.json',
        dossier: 'ouverture',
      });
    }
    }
  }

  return {
    objets,
    nbObjets: objets.length,
    nbOccurrences: compterOccurrencesAudio(racine),
    sources,
    illisibles,
  };
}

/**
 * Les clés qui doivent porter un clip `normal` — l'entrée de `couvertureConsignes`.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LES MOTS CIBLES N'Y SONT PAS, et c'est le contrat lui-même qui le dit.
 *
 * Le § 5.4 définit `cles` mot pour mot : « la liste des OBJETS qui doivent porter un audio —
 * énumérée par `scripts/recenser-textes.mjs` **depuis les exercices, le campement et
 * l'ouverture** ». Les `mot/*` sont un livrable SUPPLÉMENTAIRE du même § 5.4 (« la variante
 * syllabée pour chaque mot cible »), pas une entrée du taux.
 *
 * Une première version les comptait quand même. Le taux tombait à 68 % — non parce qu'il
 * manquait un clip, mais parce que la transcription inverse est un instrument INVALIDE sur
 * un mot isolé de moins d'une seconde. Mesuré, sorties citées :
 *
 *     0.31  « vert »     => « au revoir »
 *     0.25  « pull »     => « boop »
 *     0.15  « garcons »  => « sous titrage st 501 »
 *     0.19  « porte »    => « sous titres par jeremy diaz »
 *
 * Ce ne sont pas des homophones : ce sont les hallucinations de générique de sous-titres que
 * Whisper produit quand il n'a pas assez de signal. Sur les 64 clips de PHRASE — consignes,
 * campement, ouverture — le même instrument passe **64 sur 64**. Le seuil n'est donc pas trop
 * haut : c'est l'instrument qui sort de son domaine.
 *
 * Mélanger les deux populations dans un seul taux, c'était laisser un artefact de mesure
 * cacher le chiffre que le contrat demande. On les sépare, on rend les deux, et
 * `couverture-audio.test.ts` assert les deux séparément.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */
export function clesACouvrir(recensement) {
  const cles = [];
  for (const objet of recensement.objets) {
    if (objet.rendu !== 'normal') continue;
    if (objet.cle.startsWith('mot/')) continue;
    if (!cles.includes(objet.cle)) cles.push(objet.cle);
  }
  return cles;
}

/** Les clés des mots cibles — comptées à part, pour la raison écrite ci-dessus. */
export function clesDesMots(recensement) {
  const cles = [];
  for (const objet of recensement.objets) {
    if (objet.cle.startsWith('mot/') && !cles.includes(objet.cle)) cles.push(objet.cle);
  }
  return cles;
}

// ─────────────────────────────────────────────────────────────────────── ligne de commande

// `pathToFileURL` et non une comparaison de chaînes : sous Windows `process.argv[1]` arrive en
// `C:\…` là où `import.meta.url` est un `file:///C:/…`. Les comparer tels quels ferait taire la
// ligne de commande sans qu'aucune erreur ne le dise.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const recensement = recenser();

  // CONVENTION C6 — un générateur refuse plutôt que d'émettre du faux. Un recensement vide
  // n'est pas « rien à faire », c'est un extracteur cassé : le dépôt porte des exercices.
  if (recensement.nbObjets === 0) {
    process.stderr.write(
      'REFUS : le recensement est vide alors que le dépôt porte des exercices.\n' +
        'Un contrat de sortie calculé sur zéro objet rendrait « 100 % » sans rien mesurer.\n',
    );
    process.exit(1);
  }

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(recensement, null, 2) + '\n');
  } else {
    const parDossier = new Map();
    for (const objet of recensement.objets) {
      parDossier.set(objet.dossier, (parDossier.get(objet.dossier) ?? 0) + 1);
    }
    process.stdout.write('Recensement des objets qui doivent porter un audio\n');
    process.stdout.write(`  sources lues            : ${recensement.sources.length}\n`);
    for (const [dossier, nombre] of [...parDossier].sort()) {
      process.stdout.write(`  ${dossier.padEnd(22)}: ${nombre}\n`);
    }
    process.stdout.write(`  --- OBJETS              : ${recensement.nbObjets}\n`);
    process.stdout.write(`  --- occurrences "audio" : ${recensement.nbOccurrences}\n`);
    process.stdout.write(
      `  --- ECART               : ${recensement.nbObjets - recensement.nbOccurrences}\n`,
    );
    process.stdout.write(
      `  clés à couvrir (rendu normal) : ${clesACouvrir(recensement).length}\n`,
    );
    // Les fichiers qu'un autre lot écrivait au même instant. NOMMÉS, jamais tus : un objet
    // non recensé disparaît du dénominateur au lieu d'apparaître au numérateur, et le taux
    // du contrat de sortie monterait pour la mauvaise raison.
    if (recensement.illisibles.length > 0) {
      process.stdout.write(
        `  ATTENTION — fichiers illisibles : ${recensement.illisibles.length}, relancer\n`,
      );
      for (const illisible of recensement.illisibles) {
        process.stdout.write(`      · ${illisible.chemin} — ${illisible.motif}\n`);
      }
    }
  }
}
