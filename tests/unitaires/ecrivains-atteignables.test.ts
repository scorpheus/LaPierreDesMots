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

/**
 * L'ANALYSE COMPLÈTE, EN FONCTION DE SES SOURCES — et c'est ce qui rend le contrôle positif
 * ré-ancrable.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE N'EST PLUS UN ÉTAT DE MODULE
 *
 * Le contrôle positif de ce garde était `enregistrerFormeGobi` : « elle doit être signalée
 * aujourd'hui ». **Le lot A1 l'a branchée, et le contrôle est tombé.** C'était écrit dans ce
 * fichier — « soit A1 a branché la fonction, alors ce contrôle est à remplacer » — et c'est
 * arrivé.
 *
 * Un contrôle ancré sur un défaut RÉEL se périme par construction : le jour où le produit
 * guérit, l'instrument perd sa preuve. On l'ancre donc sur un TÉMOIN FABRIQUÉ, comme le
 * bouton de 40 px de Q7 : une source de production synthétique, injectée le temps de la
 * mesure, qui déclare un écrivain que personne n'appelle. Ce contrôle-là ne dépend d'aucun
 * défaut du produit, donc il ne se périmera jamais.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `sourcesFabriquees` : chemin relatif (au dépôt) → contenu. Elles entrent dans l'analyse
 * exactement comme un fichier du disque, y compris pour le calcul des racines.
 */
export interface Analyse {
  readonly ecrivains: readonly Ecrivain[];
  readonly atteignables: ReadonlySet<string>;
  readonly orphelins: readonly Ecrivain[];
  readonly nbFonctions: number;
  readonly nbFichiers: number;
}

function analyser(sourcesFabriquees: ReadonlyMap<string, string> = new Map()): Analyse {
  const fichiers = [...SOURCES, ...sourcesFabriquees.keys()];
  const texte = new Map<string, string>();
  for (const fichier of SOURCES) texte.set(fichier, sansCommentaires(readFileSync(fichier, 'utf8')));
  for (const [chemin, contenu] of sourcesFabriquees) texte.set(chemin, sansCommentaires(contenu));
  const lire = (f: string): string => texte.get(f) ?? '';

  const declareeDans = new Map<string, string>();
  for (const fichier of fichiers) {
    for (const trouve of lire(fichier).matchAll(
      /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm,
    )) {
      if (!declareeDans.has(trouve[1]!)) declareeDans.set(trouve[1]!, fichier);
    }
  }

  const corpsDe = (fichier: string, nom: string): string | null => {
    const motif = new RegExp(
      `^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\n\\}`,
      'm',
    );
    return motif.exec(lire(fichier))?.[0] ?? null;
  };

  // ── la population : écrivains DIRECTS puis INDIRECTS
  const directs: Ecrivain[] = [];
  for (const [nom, fichier] of declareeDans) {
    const corps = corpsDe(fichier, nom);
    if (corps !== null && ECRITURE.test(corps)) {
      directs.push({ nom, fichier, genre: 'direct', via: null });
    }
  }
  const nomsDirects = new Set(directs.map((e) => e.nom));
  const indirects: Ecrivain[] = [];
  for (const [nom, fichier] of declareeDans) {
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
  const ecrivains = [...directs, ...indirects];

  // ── l'atteignabilité, au grain FICHIER (voir l'en-tête)
  const cite = (fichier: string, nom: string): boolean => {
    const occurrences = (lire(fichier).match(new RegExp(`\\b${nom}\\b`, 'g')) ?? []).length;
    return declareeDans.get(nom) === fichier ? occurrences >= 2 : occurrences >= 1;
  };
  const racines = fichiers.filter(
    (f) =>
      relatif(f).startsWith('serveur/src/routes/') ||
      relatif(f).startsWith('scripts/') ||
      f.endsWith('.tsx'),
  );
  const fichiersAtteints = new Set<string>(racines);
  const atteignables = new Set<string>();
  let bouge = true;
  while (bouge) {
    bouge = false;
    for (const fichier of [...fichiersAtteints]) {
      for (const [nom, declaration] of declareeDans) {
        if (atteignables.has(nom) || !cite(fichier, nom)) continue;
        atteignables.add(nom);
        bouge = true;
        fichiersAtteints.add(declaration);
      }
    }
  }

  return {
    ecrivains,
    atteignables,
    orphelins: ecrivains.filter((e) => !atteignables.has(e.nom)),
    nbFonctions: declareeDans.size,
    nbFichiers: fichiers.length,
  };
}

/** Ce qui écrit dans SQLite. Aucune liste de noms : on lit les corps. */
const ECRITURE = /INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|\.run\(/i;

export interface Ecrivain {
  readonly nom: string;
  readonly fichier: string;
  /** `direct` : du SQL dans son corps. `indirect` : son corps appelle un écrivain direct. */
  readonly genre: 'direct' | 'indirect';
  readonly via: string | null;
}

const ANALYSE = analyser();
const ECRIVAINS = ANALYSE.ecrivains;
const ATTEIGNABLES = ANALYSE.atteignables;
const ORPHELINS = ANALYSE.orphelins;

/** Le fichier de production le plus banal : pour savoir si un nom y est cité, on relit. */
function citeDansLeDepot(cheminRelatif: string, nom: string): boolean {
  const source = sansCommentaires(readFileSync(chemin(cheminRelatif), 'utf8'));
  return new RegExp(`\\b${nom}\\b`).test(source);
}

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
        `sur ${String(ANALYSE.nbFonctions)} fonctions nommées de ${String(ANALYSE.nbFichiers)} fichiers.`,
    );
  });

  test('CONTRÔLE POSITIF — un écrivain FABRIQUÉ que personne n’appelle est signalé', () => {
    // ── POURQUOI UN TÉMOIN FABRIQUÉ, ET PLUS `enregistrerFormeGobi` ─────────────────────────
    //
    // L'ancien contrôle exigeait qu'`enregistrerFormeGobi` soit signalée « aujourd'hui ». Le
    // lot A1 l'a branchée : le contrôle est tombé, exactement comme ce fichier l'annonçait.
    // Un contrôle ancré sur un défaut RÉEL meurt le jour où le produit guérit — c'est-à-dire
    // au pire moment, celui où l'on a le plus besoin de croire l'instrument.
    //
    // Le témoin ci-dessous est une source de production SYNTHÉTIQUE : elle écrit en base et
    // personne ne la cite. Elle ne dépend d'aucun défaut du produit, donc elle ne se périme
    // jamais. C'est la même forme que le bouton de 40 px de Q7.
    const temoin = new Map([
      [
        chemin('serveur/src/depots/temoin-q1-jamais-appele.ts'),
        `export function ecrireTemoinQ1(base: unknown): void {\n` +
          `  base.prepare('INSERT INTO temoin (x) VALUES (?)').run(1);\n}\n`,
      ],
    ]);
    const avec = analyser(temoin);
    const trouve = avec.orphelins.find((e) => e.nom === 'ecrireTemoinQ1');
    console.log(
      `[Q1] contrôle positif — témoin fabriqué : ${trouve === undefined ? 'MANQUÉ' : 'SIGNALÉ ✔'} ` +
        `(population ${String(ANALYSE.ecrivains.length)} → ${String(avec.ecrivains.length)})`,
    );
    expect(
      avec.ecrivains.map((e) => e.nom),
      'un `INSERT … .run()` fabriqué n’entre même pas dans la population : la dérivation des ' +
        'écrivains ne reconnaît plus une écriture.',
    ).toContain('ecrireTemoinQ1');
    expect(
      trouve,
      'Q1 ne signale pas un écrivain que PERSONNE n’appelle. L’instrument est aveugle, et tout ' +
        'vert rendu par ce fichier serait sans valeur.',
    ).toBeDefined();
    expect(
      ANALYSE.ecrivains.some((e) => e.nom === 'ecrireTemoinQ1'),
      'le témoin fabriqué a fui dans l’analyse du dépôt réel : la mesure laisse sa propre trace.',
    ).toBe(false);
  });

  test('CONTRÔLE NÉGATIF — un écrivain FABRIQUÉ qu’une route appelle n’est PAS signalé', () => {
    // Le pendant, et il est aussi important : un instrument qui déclarerait TOUT inatteignable
    // serait aussi inutile qu'un instrument aveugle. On fabrique le même écrivain, plus une
    // route qui l'appelle — il doit alors disparaître des orphelins.
    const temoin = new Map([
      [
        chemin('serveur/src/depots/temoin-q1-appele.ts'),
        `export function ecrireTemoinQ1Vivant(base: unknown): void {\n` +
          `  base.prepare('INSERT INTO temoin (x) VALUES (?)').run(1);\n}\n`,
      ],
      [
        chemin('serveur/src/routes/temoin-q1-route.ts'),
        `import { ecrireTemoinQ1Vivant } from '../depots/temoin-q1-appele.js';\n` +
          `export function enregistrerRouteTemoin(): void { ecrireTemoinQ1Vivant(null); }\n`,
      ],
    ]);
    const avec = analyser(temoin);
    const signale = avec.orphelins.some((e) => e.nom === 'ecrireTemoinQ1Vivant');
    console.log(
      `[Q1] contrôle négatif — témoin appelé par une route : ${signale ? 'SIGNALÉ À TORT' : 'atteint ✔'}`,
    );
    expect(
      avec.ecrivains.map((e) => e.nom),
      'le témoin vivant n’entre pas dans la population : la comparaison ne prouverait rien.',
    ).toContain('ecrireTemoinQ1Vivant');
    expect(
      signale,
      'Q1 déclare inatteignable un écrivain qu’une route HTTP appelle : il fabrique des morts, ' +
        'et un rapport de faux positifs ne se lit pas.',
    ).toBe(false);
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
        `${String(ANALYSE.nbFonctions)} fonctions nommees de ${String(ANALYSE.nbFichiers)} fichiers.`,
    );

    // Observation, jamais une assertion : la spec accepte qu'une route suffise. Le trancher
    // appartient au lot A1 (feuille-de-route § 2, point 4).
    const routeSansClient = ECRIVAINS.filter(
      (e) => ATTEIGNABLES.has(e.nom) && !citeDansLeDepot('client/src/api/client.ts', e.nom),
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
