/**
 * Q1 — TOUT ÉCRIVAIN D'ÉTAT EST ATTEIGNABLE DEPUIS UN GESTE D'ENFANT.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q1. Mode de défaillance M1,
 * « le chemin déclaré, câblé, jamais parcouru ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI L'A INSPIRÉ — R31, et il commande toute la feuille de route
 *
 * Mesuré sur la vraie base d'Ezékiel, en lecture seule, après 23 exercices joués :
 *
 *     tentatives            23        progression_cascade    0
 *     progression_noeud     23        formes_gobi            0
 *     maitrise_competence   12        campement              0
 *     items_leitner         10        compagnons             0
 *
 * **Le noyau pédagogique tourne ; toute la couche récompense et monde est débranchée.**
 * `appliquerTentativeALaCascade` et `enregistrerFormeGobi` existent, sont justes, sont testées
 * — et personne ne les appelle. « Testée » et « atteignable » sont deux propriétés distinctes,
 * et **seule la seconde compte pour l'enfant**.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── EN QUOI CE GARDE VA PLUS LOIN QUE LE DÉTECTEUR D1 QUI L'A RÉVÉLÉ ──────────────────────
 *
 * `scripts/qa/detecteurs-qa-aveugle.mjs` demande « cette fonction a-t-elle UN appelant ? ».
 * Q1 demande « existe-t-il une CHAÎNE d'appels depuis une route HTTP, un composant client ou
 * un outil du dépôt ? ». Trois conséquences, toutes mesurées :
 *
 *  1. **Une chaîne qui casse en amont se voit.** Si demain une route cesse d'appeler
 *     `enregistrerTentative`, D1 ne verrait rien — les fonctions en aval gardent leur appelant.
 *     Q1 les déclare toutes inatteignables, ce qu'elles sont devenues.
 *
 *  2. **Les écrivains INDIRECTS entrent dans la population.** D1 ne recense que les corps qui
 *     contiennent du SQL, et son § 2.6 nomme lui-même la limitation :
 *     « + `appliquerTentativeALaCascade`, manquée par la sous-règle ». Elle n'écrit pas
 *     elle-même : elle appelle `ecrire`, vingt lignes plus haut dans le même fichier. C'est
 *     pourtant LA fonction du défaut n° 1 du jeu. **On audite les objets qui FONT écrire, pas
 *     les occurrences de `INSERT`** (CLAUDE.md).
 *
 *  3. **`scripts/qa/` et `tests/` sont hors du graphe** — règle 9 du § 5. Sans cela le
 *     détecteur se compte lui-même : c'est l'erreur n° 2 du § 2.6, où le script de mesure
 *     écrit une heure plus tôt passait pour un appelant de production et faisait déclarer
 *     « la cascade est branchée ».
 *
 * ── POURQUOI LE GRAIN EST LE FICHIER ET NON LE CORPS DE FONCTION ──────────────────────────
 *
 * Premier essai, au grain « corps de fonction » : `journaliserEtapes` déclarée morte, alors
 * que `serveur/src/depots/tentatives.ts:402` l'appelle. Cause mesurée : une fonction fléchée
 * imbriquée coupe le corps de la fonction qui la contient, et l'appel tombe dans le mauvais
 * morceau. **Un instrument qui fabrique un mort est pire qu'un instrument muet** — un rapport
 * de faux positifs ne se lit pas. Le grain fichier ne peut pas produire ce défaut-là ; il
 * sur-approxime l'atteignabilité, donc il est CONSERVATEUR : ce qu'il signale, il le signale
 * pour de bon. Le témoin négatif ci-dessous garde cette propriété.
 *
 * ── CE QUE CE GARDE NE DIT PAS ────────────────────────────────────────────────────────────
 *
 * La spec dit « depuis une route HTTP **ou** un gestionnaire d'événement du client ». Une
 * route qu'aucun client n'appelle satisfait donc Q1. C'est le cas de `poserObjetCampement`
 * (feuille-de-route § 2 : « route OK, aucun client ne l'appelle ») : il est IMPRIMÉ par ce
 * fichier, mais il ne fait pas échouer Q1 — le trancher appartient au lot A1.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

import { RACINE_DEPOT } from '../configuration/preparation.js';

// ═══════════════════════════════════════════════════════════════ lecture de la production

const chemin = (relatif: string): string => join(RACINE_DEPOT, relatif);
const relatif = (fichier: string): string =>
  relative(RACINE_DEPOT, fichier).replace(/\\/g, '/');

function fichiersSous(dossier: string, extensions: readonly string[]): readonly string[] {
  const trouves: string[] = [];
  const parcourir = (courant: string): void => {
    for (const entree of readdirSync(courant, { withFileTypes: true })) {
      const complet = join(courant, entree.name);
      if (entree.isDirectory()) {
        if (['node_modules', 'dist', 'dist-types', 'dist-test'].includes(entree.name)) continue;
        parcourir(complet);
      } else if (extensions.includes(extname(entree.name))) {
        trouves.push(complet);
      }
    }
  };
  parcourir(chemin(dossier));
  return trouves;
}

/**
 * Règle 10 du § 5 — les commentaires sont retirés AVANT toute recherche textuelle.
 * Ils citent souvent précisément ce qui est absent : le premier recensement des gestes a
 * compté un glisser sur `tri` en lisant la phrase de R16 qui dit qu'il n'y en a pas.
 */
const sansCommentaires = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/**
 * LES FICHIERS DE PRODUCTION.
 *
 * `scripts/` en fait partie — les chemins de recalcul de l'annexe T sont appelés par les
 * outils du dépôt, et les ignorer fabriquerait des morts. `scripts/qa/` n'en fait PAS partie :
 * c'est de l'outillage de mesure, au même titre que `tests/` (règle 9).
 */
function sourcesDeProduction(): readonly string[] {
  return [
    ...fichiersSous('partage/src', ['.ts', '.tsx']),
    ...fichiersSous('serveur/src', ['.ts', '.tsx']),
    ...fichiersSous('client/src', ['.ts', '.tsx']),
    ...fichiersSous('scripts', ['.ts', '.mjs', '.js']).filter(
      (f) => !relatif(f).startsWith('scripts/qa/'),
    ),
  ];
}

const SOURCES = sourcesDeProduction();
const TEXTE = new Map(SOURCES.map((f) => [f, sansCommentaires(readFileSync(f, 'utf8'))] as const));
const lire = (f: string): string => TEXTE.get(f) ?? '';

/** Nom de fonction → fichier où elle est déclarée. */
const DECLAREE_DANS = new Map<string, string>();
for (const fichier of SOURCES) {
  for (const trouve of lire(fichier).matchAll(
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm,
  )) {
    if (!DECLAREE_DANS.has(trouve[1]!)) DECLAREE_DANS.set(trouve[1]!, fichier);
  }
}

/** Le corps d'une fonction nommée, de sa déclaration à la première `}` en colonne 0. */
function corpsDe(fichier: string, nom: string): string | null {
  const motif = new RegExp(
    `^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\n\\}`,
    'm',
  );
  return motif.exec(lire(fichier))?.[0] ?? null;
}

// ═══════════════════════════════════════════════════════════ la population, DÉRIVÉE du code

/** Ce qui écrit dans SQLite. Aucune liste de noms : on lit les corps. */
const ECRITURE = /INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|\.run\(/i;

export interface Ecrivain {
  readonly nom: string;
  readonly fichier: string;
  /** `direct` : du SQL dans son corps. `indirect` : son corps appelle un écrivain direct. */
  readonly genre: 'direct' | 'indirect';
  readonly via: string | null;
}

function ecrivainsDEtat(): readonly Ecrivain[] {
  const directs: Ecrivain[] = [];
  for (const [nom, fichier] of DECLAREE_DANS) {
    const corps = corpsDe(fichier, nom);
    if (corps !== null && ECRITURE.test(corps)) {
      directs.push({ nom, fichier, genre: 'direct', via: null });
    }
  }
  const nomsDirects = new Set(directs.map((e) => e.nom));

  const indirects: Ecrivain[] = [];
  for (const [nom, fichier] of DECLAREE_DANS) {
    if (nomsDirects.has(nom)) continue;
    const corps = corpsDe(fichier, nom);
    if (corps === null) continue;
    for (const direct of nomsDirects) {
      if (new RegExp(`\\b${direct}\\s*\\(`).test(corps)) {
        indirects.push({ nom, fichier, genre: 'indirect', via: direct });
        break;
      }
    }
  }
  return [...directs, ...indirects];
}

// ═════════════════════════════════════════════════════════════════ l'atteignabilité, dérivée

/**
 * Le fichier `f` cite-t-il le nom `nom` ?
 *
 * Dans le fichier qui le DÉCLARE, une seule occurrence n'est que la déclaration elle-même :
 * il en faut deux. C'est la troisième correction du détecteur D1, et elle a sauvé
 * `ecrireProgressionRegion`, appelée par `lireMonde` vingt lignes plus bas.
 */
function cite(fichier: string, nom: string): boolean {
  const occurrences = (lire(fichier).match(new RegExp(`\\b${nom}\\b`, 'g')) ?? []).length;
  return DECLAREE_DANS.get(nom) === fichier ? occurrences >= 2 : occurrences >= 1;
}

/**
 * LES RACINES — les points d'entrée d'où part un geste réel.
 *
 * Dérivées, jamais listées : toute route HTTP (`serveur/src/routes/**`), tout composant du
 * client (`*.tsx` — c'est ce que l'enfant a sous le doigt), tout outil du dépôt (`scripts/`
 * hors `scripts/qa/`).
 */
function fichiersRacines(): readonly string[] {
  return SOURCES.filter(
    (f) =>
      relatif(f).startsWith('serveur/src/routes/') ||
      relatif(f).startsWith('scripts/') ||
      f.endsWith('.tsx'),
  );
}

/** Clôture transitive : tous les noms qu'un geste peut finir par atteindre. */
function nomsAtteignables(): ReadonlySet<string> {
  const fichiersAtteints = new Set<string>(fichiersRacines());
  const noms = new Set<string>();
  let bouge = true;
  while (bouge) {
    bouge = false;
    for (const fichier of [...fichiersAtteints]) {
      for (const [nom, declaration] of DECLAREE_DANS) {
        if (noms.has(nom) || !cite(fichier, nom)) continue;
        noms.add(nom);
        bouge = true;
        fichiersAtteints.add(declaration);
      }
    }
  }
  return noms;
}

const ECRIVAINS = ecrivainsDEtat();
const ATTEIGNABLES = nomsAtteignables();
const ORPHELINS = ECRIVAINS.filter((e) => !ATTEIGNABLES.has(e.nom));

/**
 * EXEMPTIONS — il n'y en a AUCUNE, et c'est un résultat.
 *
 * Au premier passage du contrat de couverture de CLAUDE.md, six exemptions sur huit étaient
 * inutiles. On n'en ouvre donc pas par précaution : les huit écrivains signalés aujourd'hui
 * sont huit défauts réels, chacun rattaché à un lot de la feuille de route (A1 pour la
 * cascade et les formes de Gobi ; V1 et le campement pour `noterVisitePoint` ; la zone parent
 * pour `ouvrirEssai`). Une exemption est une dette, pas un pardon.
 */
const EXEMPTIONS: readonly { readonly nom: string; readonly raison: string; readonly scene: string }[] =
  [];

describe('Q1 — tout écrivain d’état est atteignable depuis un geste d’enfant', () => {
  test('la population est DÉRIVÉE du code, et elle n’est pas vide', () => {
    // Une population vide rendrait toutes les propriétés vraies sans rien prouver. C'est le
    // mode de défaillance que ce lot existe pour rendre impossible.
    expect(
      SOURCES.length,
      'aucun fichier de production lu : la dérivation est cassée',
    ).toBeGreaterThan(200);
    expect(
      ECRIVAINS.filter((e) => e.genre === 'direct').length,
      'aucun écrivain DIRECT trouvé : le motif `INSERT|UPDATE|DELETE|.run(` ne matche plus rien',
    ).toBeGreaterThanOrEqual(20);
    expect(
      ECRIVAINS.filter((e) => e.genre === 'indirect').length,
      'aucun écrivain INDIRECT trouvé : la sous-règle du § 2.6 n’est pas appliquée',
    ).toBeGreaterThanOrEqual(10);
    console.log(
      `[Q1] population : ${String(ECRIVAINS.length)} écrivains d’état ` +
        `(${String(ECRIVAINS.filter((e) => e.genre === 'direct').length)} directs, ` +
        `${String(ECRIVAINS.filter((e) => e.genre === 'indirect').length)} indirects) ` +
        `sur ${String(DECLAREE_DANS.size)} fonctions nommées de ${String(SOURCES.length)} fichiers.`,
    );
  });

  test('CONTRÔLE POSITIF — `enregistrerFormeGobi` est signalée aujourd’hui', () => {
    // Le contrôle exigé par le § 4 Q1. Il doit CESSER de valoir quand A1 branchera la
    // fonction : ce jour-là, ce cas échouera et il faudra le remplacer par un témoin vivant.
    // Un contrôle positif qui ne mord plus est un instrument devenu aveugle (§ 2.2).
    const dansLaPopulation = ECRIVAINS.some((e) => e.nom === 'enregistrerFormeGobi');
    expect(
      dansLaPopulation,
      '`enregistrerFormeGobi` n’est plus recensée comme écrivain : la dérivation de la ' +
        'population a changé de définition — redemander au contrôle de prouver qu’il sait échouer.',
    ).toBe(true);
    expect(
      ORPHELINS.map((e) => e.nom),
      'Q1 ne retrouve plus le défaut de référence qui l’a inspiré. Soit A1 a branché la ' +
        'fonction — alors ce contrôle est à remplacer —, soit l’instrument est devenu aveugle.',
    ).toContain('enregistrerFormeGobi');
  });

  test('CONTRÔLE NÉGATIF — `journaliserEtapes` n’est PAS signalée : l’instrument ne fabrique pas de mort', () => {
    // `serveur/src/depots/tentatives.ts:402` l'appelle, à travers `alimenterPedagogie`. Le
    // premier essai de Q1, au grain « corps de fonction », la déclarait morte. Ce témoin
    // garde la propriété qui rend Q1 lisible : ce qu'il signale, il le signale pour de bon.
    expect(
      ATTEIGNABLES.has('journaliserEtapes'),
      '`journaliserEtapes` est appelée par la route des tentatives et Q1 ne la voit pas : ' +
        'l’instrument fabrique des faux positifs, et un rapport de faux positifs ne se lit pas.',
    ).toBe(true);
  });

  test('LE DÉFAUT — aucun écrivain d’état n’est inatteignable', () => {
    // Le resume de population est RE-IMPRIME ici : `vitest.config.ts` pose
    // `silent: 'passed-only'`, donc les journaux des cas VERTS ne sortent pas de la chaine
    // complete. Un chiffre de population qu'on ne voit qu'en lancant le fichier seul est un
    // chiffre qu'on ne lit jamais.
    console.log(
      `[Q1] population : ${String(ECRIVAINS.length)} ecrivains d'etat (` +
        `${String(ECRIVAINS.filter((e) => e.genre === 'direct').length)} directs, ` +
        `${String(ECRIVAINS.filter((e) => e.genre === 'indirect').length)} indirects) sur ` +
        `${String(DECLAREE_DANS.size)} fonctions nommees de ${String(SOURCES.length)} fichiers.`,
    );

    // Observation, jamais une assertion : la spec accepte qu'une route suffise. Le trancher
    // appartient au lot A1 (feuille-de-route § 2, point 4).
    const routeSansClient = ECRIVAINS.filter(
      (e) => ATTEIGNABLES.has(e.nom) && !cite(chemin('client/src/api/client.ts'), e.nom),
    ).filter((e) => e.nom === 'poserObjetCampement');
    for (const observe of routeSansClient) {
      console.log(
        `[Q1] observation — « ${observe.nom} » a bien une route, et le client ne l’appelle ` +
          'jamais. Q1 ne le fait pas échouer (la spec dit « route OU geste client ») ; A1 le tranche.',
      );
    }

    const exemptes = new Set(EXEMPTIONS.map((x) => x.nom));
    const griefs = ORPHELINS.filter((e) => !exemptes.has(e.nom));
    for (const grief of griefs) {
      console.log(
        `[Q1] ⚠ ${grief.nom.padEnd(36)} ${relatif(grief.fichier)}` +
          (grief.via === null ? '' : `  (écrit via ${grief.via})`),
      );
    }
    expect(
      griefs.map((e) => `${e.nom} (${relatif(e.fichier)})`),
      'Ces fonctions écrivent un acquis de l’enfant et AUCUNE chaîne d’appels ne les atteint ' +
        'depuis une route HTTP, un composant du client ou un outil du dépôt. Ce que le jeu ' +
        'annonce comme gagné n’est donc jamais enregistré (R31).',
    ).toEqual([]);
  });

  test('toute exemption est nommée, avec la scène qui l’éteindrait', () => {
    // Une exemption est une DETTE, pas un pardon. Et une exemption devenue inutile est un
    // mensonge dans le contrat : si l'écrivain exempté est redevenu atteignable, on échoue.
    for (const exemption of EXEMPTIONS) {
      expect(exemption.raison.length, `exemption « ${exemption.nom} » sans raison`).toBeGreaterThan(30);
      expect(exemption.scene.length, `exemption « ${exemption.nom} » sans scène`).toBeGreaterThan(30);
      expect(
        ORPHELINS.some((e) => e.nom === exemption.nom),
        `l’exemption « ${exemption.nom} » n’a plus lieu d’être : la fonction est redevenue ` +
          'atteignable. La retirer.',
      ).toBe(true);
    }
  });
});
