/**
 * Q2 — CHAQUE ÉNUMÉRANT EST RÉELLEMENT PRODUIT AU MOINS UNE FOIS SUR LE CORPUS.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q2. Mode de défaillance M2,
 * « l'énumérant sans émetteur ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE GARDE NE PEUT PAS ÊTRE UN `grep`, ET C'EST LE RÉSULTAT LE PLUS INSTRUCTIF DE
 * L'ÉTUDE DU 7 AOÛT
 *
 *     26 unions littérales examinées · 0 membre orphelin
 *     CONTRÔLE POSITIF · natures qu'aucun palier n'attribue : 'objet-campement'
 *     D2 les avait-il trouvées ?  *** NON — D2 est AVEUGLE ***
 *
 * `objet-campement` est cité dans `CascadeRecompense.tsx` et `JaugePalier.tsx` — mais ces deux
 * fichiers le **traduisent** (« un objet pour le campement »), ils ne le **produisent** pas.
 *
 * > **Être mentionné n'est pas être émis.** Aucun détecteur textuel ne peut faire cette
 * > différence. Sans son contrôle positif, D2 aurait publié « 0 orphelin » et on l'aurait cru.
 *
 * Q2 instrumente donc l'EXÉCUTION : il fait tourner les quatorze moteurs sur les 76 exercices
 * livrés et la cascade de récompenses sur ses vrais paramètres, et recense **les valeurs que
 * le code produit réellement**.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── LA RÈGLE DE DÉCISION, ET ELLE EST PRÉ-ENREGISTRÉE ────────────────────────────────────
 *
 * CLAUDE.md : « Un canal qu'aucune scène n'a exercé se déclare NON EXERCÉ, jamais MORT.
 * L'outil doit refuser de conclure. » Q2 applique la règle à la lettre, et c'est ce qui le
 * rend lisible plutôt qu'accusateur :
 *
 *   • une union dont **aucun** membre n'est produit par la sonde est **NON EXERCÉE** : elle
 *     vit hors de la couche instrumentée (les codes de région, les fonds de lecture…). Elle
 *     est IMPRIMÉE, jamais reprochée ;
 *   • une union dont **certains** membres sont produits est **exercée**, et alors chacun de
 *     ses membres doit l'être. Un membre manquant dans une union par ailleurs vivante est
 *     exactement la signature de la loi remplacée dont le NOM survit.
 *
 * ── LE PÉRIMÈTRE DE LA SONDE, DIT D'AVANCE ──────────────────────────────────────────────
 *
 * La sonde exécute **les réducteurs des moteurs et la cascade**. Elle n'exécute ni les écrans
 * ni le serveur : la spec prévoyait pour cela une sonde `window.__test.emissions()`, qui vit
 * dans `client/src/testabilite/` — un fichier que le lot Q ne possède pas. La dette est nommée
 * dans `scripts/qa/controles-positifs.mjs`. Ce que la sonde ne touche pas se déclare NON
 * EXERCÉ, jamais MORT : c'est précisément la précaution qui empêche Q2 de mentir.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { creerAlea } from '@partage/alea';
import { obtenirMoteur } from '@partage/moteurs/registre';
import { appliquerEtoiles, ETAT_CASCADE_VIDE, jaugesDe, lireSeuilsCascade } from '@pierre/partage/recompenses';

import { horlogeDeTest, lireJson, lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

import type { CodeMoteur, Exercice, Habillage } from '@pierre/partage';

// ═══════════════════════════════════════════ la population : les unions littérales de partage

interface UnionLitterale {
  readonly nom: string;
  readonly fichier: string;
  readonly membres: readonly string[];
}

const sansCommentaires = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

function fichiersTs(relatif: string): readonly string[] {
  const trouves: string[] = [];
  const parcourir = (courant: string): void => {
    for (const entree of readdirSync(join(RACINE_DEPOT, courant), { withFileTypes: true })) {
      const suite = `${courant}/${entree.name}`;
      if (entree.isDirectory()) parcourir(suite);
      else if (entree.name.endsWith('.ts')) trouves.push(suite);
    }
  };
  parcourir(relatif);
  return trouves;
}

/**
 * Toutes les unions de chaînes littérales de `partage/src`.
 *
 * C'est la forme que le compilateur force déjà à être exhaustive dans un `switch` : ajouter un
 * membre demain le fait entrer dans ce garde sans que personne ait à s'en souvenir. C'est la
 * seule forme de recensement qui ne pourrit pas (CLAUDE.md).
 */
function unionsLitterales(): readonly UnionLitterale[] {
  const trouvees: UnionLitterale[] = [];
  for (const fichier of fichiersTs('partage/src')) {
    const source = sansCommentaires(lireTexte(fichier));
    // ── LE `|` DE TÊTE EST OBLIGATOIRE DANS LE MOTIF, ET C'EST UNE CORRECTION MESURÉE ──────
    //
    // Sans `\|?` après le `=`, toutes les unions écrites en colonne — la forme
    // `export type X =\n  | 'a'\n  | 'b';` — sortaient du recensement. Le détecteur D2 de
    // l'étude a la même limite : il en compte 26. Avec le `|` de tête, le compte monte, et
    // les unions manquées étaient précisément les MOTIFS DE REFUS, c'est-à-dire les seules
    // valeurs qu'aucun contenu ne cite et que seul un réducteur produit.
    //
    // C'est la leçon « auditer les OBJETS, pas les occurrences » appliquée au recensement
    // lui-même : le premier motif comptait les unions qu'il savait écrire, pas celles qui
    // existent.
    for (const bloc of source.matchAll(
      /export type (\w+)\s*=\s*\|?\s*((?:'[^']+'\s*\|\s*)+'[^']+')\s*;/g,
    )) {
      const membres = [...bloc[2]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
      if (membres.length >= 2) trouvees.push({ nom: bloc[1]!, fichier, membres });
    }
  }
  if (trouvees.length === 0) {
    throw new Error(
      'Q2 : aucune union littérale lue dans partage/src. La population serait vide, donc le ' +
        'contrat de couverture serait vrai par vacuité — on refuse de continuer.',
    );
  }
  return trouvees;
}

// ═══════════════════════════════════════════════════════════════════ LA SONDE D'ÉMISSIONS

/**
 * Ce que la sonde a vu produire, INDEXÉ PAR CHAMP D'ORIGINE.
 *
 * ── POURQUOI LE CHAMP, ET PAS UN SIMPLE ENSEMBLE DE CHAÎNES ──────────────────────────────
 *
 * Premier essai : un `Set<string>` de toutes les chaînes produites. Il déclarait `CodePolice`
 * « exercée » parce que la sonde avait produit `'luciole'` — qui est le nom d'un HABILLAGE, pas
 * une police —, `JetonCouleur` exercée par `'soleil'`, et `StatutValidation` exercée par
 * `'livre'`. Six unions sur seize étaient déclarées vivantes par pure COLLISION DE CHAÎNES,
 * et Q2 réclamait alors leurs membres manquants : un rapport de faux positifs, qui ne se lit pas.
 *
 * On indexe donc par `moteur|chemin.du.champ`. Une union n'est réputée exercée que s'il existe
 * un champ qui lui est DÉDIÉ — un champ dont TOUTES les valeurs vues appartiennent à l'union.
 * `dernierRefus.motif` de `colorie` est un tel champ ; `id`, qui charrie tout le catalogue,
 * n'en est pas un. Le préfixe par moteur est indispensable : `motif` désigne quatorze unions
 * différentes selon le moteur qui l'a produit.
 */
type Emissions = Map<string, Set<string>>;

/** Récolte récursivement toute chaîne produite, avec le champ qui la portait. */
function recolter(valeur: unknown, dans: Emissions, chemin: string, profondeur = 0): void {
  if (profondeur > 12) return;
  if (typeof valeur === 'string') {
    const vues = dans.get(chemin) ?? new Set<string>();
    vues.add(valeur);
    dans.set(chemin, vues);
    return;
  }
  if (Array.isArray(valeur)) {
    for (const element of valeur) recolter(element, dans, chemin, profondeur + 1);
    return;
  }
  if (valeur !== null && typeof valeur === 'object') {
    for (const [cle, sous] of Object.entries(valeur as Record<string, unknown>)) {
      recolter(sous, dans, `${chemin}.${cle}`, profondeur + 1);
    }
  }
}

/** Les champs DÉDIÉS à une union : ceux dont toutes les valeurs vues lui appartiennent. */
function champsDedies(emissions: Emissions, membres: readonly string[]): readonly string[] {
  const ensemble = new Set(membres);
  const dedies: string[] = [];
  for (const [champ, valeurs] of emissions) {
    // ── UN CHAMP D'ENTREE N'EST PAS UNE EMISSION ────────────────────────────────────────
    // L'habillage et les seuils sont RECOPIES dans l'etat par certains moteurs. Les compter
    // comme des emissions faisait declarer `CodeMoteur` « exercee » par `habillage.moteurs`,
    // c'est-a-dire par une DECLARATION du contenu et non par une loi qui tourne. C'est le
    // meme piege que « etre mentionne n'est pas etre emis », d'un cran plus fin.
    if (/habillage|#seuils/.test(champ)) continue;
    // ── UN CHAMP QUI N'A JAMAIS PORTÉ QU'UNE VALEUR NE PROUVE RIEN ─────────────────────
    //
    // Mesuré : `CodeMoteur` était déclarée « exercée » par quatre champs distincts ne
    // portant chacun qu'UNE valeur — `'colorie'`, `'libre'`, `'place'`, `'trace'` —, qui
    // sont des états ou des phases de moteurs, et qui ressemblent à des codes de moteur par
    // pure homonymie. Q2 réclamait alors les dix autres codes : dix faux griefs.
    //
    // Un champ à valeur unique est indiscernable d'une coïncidence. On exige donc DEUX
    // valeurs distinctes de l'union : c'est ce qui fait d'un champ le porteur d'un TYPE et
    // non d'une constante. Le prix est assumé et se lit dans la sortie : une union dont le
    // corpus n'exerce qu'un seul membre est déclarée NON EXERCÉE — « refuser de conclure »
    // plutôt que conclure faux (CLAUDE.md).
    if (valeurs.size < 2) continue;
    let touches = 0;
    let etranger = false;
    for (const valeur of valeurs) {
      if (ensemble.has(valeur)) touches += 1;
      else etranger = true;
    }
    if (touches >= 2 && !etranger) dedies.push(champ);
  }
  return dedies;
}

function tousLesExercices(): readonly Exercice[] {
  const trouves: Exercice[] = [];
  for (const region of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices'), {
    withFileTypes: true,
  })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices', region.name))) {
      if (!fichier.endsWith('.json')) continue;
      trouves.push(lireJson<Exercice>(`contenu/exercices/${region.name}/${fichier}`));
    }
  }
  return trouves;
}

function habillagePour(code: CodeMoteur): Habillage | null {
  const racine = join(RACINE_DEPOT, 'contenu', 'habillages');
  for (const region of readdirSync(racine, { withFileTypes: true })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(join(racine, region.name))) {
      if (!fichier.endsWith('.habillage.json')) continue;
      const habillage = lireJson<Habillage>(`contenu/habillages/${region.name}/${fichier}`);
      if (habillage.moteurs.includes(code)) return habillage;
    }
  }
  return null;
}

interface VarianteAction {
  readonly type: string;
  readonly champs: readonly string[];
}

/**
 * Les actions qu'un moteur ACCEPTE, lues dans son union `Action…`.
 *
 * On ne connaît aucune action à l'avance : `saisir`, `deposer`, `peindre`, `basculerRecit`…
 * sortent du type. Un moteur écrit demain est exercé sans qu'on touche ce fichier.
 */
function actionsDe(code: CodeMoteur): readonly VarianteAction[] {
  const source = sansCommentaires(lireTexte(`partage/src/moteurs/${code}/types.ts`));
  const bloc = /export type Action\w+\s*=([\s\S]*?);\s*$/m.exec(source);
  if (bloc === null) return [];
  const variantes: VarianteAction[] = [];
  for (const morceau of bloc[1]!.split('|')) {
    const type = /type:\s*'([^']+)'/.exec(morceau)?.[1];
    if (type === undefined) continue;
    const champs = [...morceau.matchAll(/readonly (\w+):/g)]
      .map((m) => m[1]!)
      .filter((nom) => nom !== 'type');
    variantes.push({ type, champs });
  }
  return variantes;
}

/** Les valeurs candidates pour un champ d'action : tout ce que le contenu et l'habillage offrent. */
function candidats(contenu: Record<string, unknown>, habillage: Habillage): readonly string[] {
  const valeurs = new Set<string>();
  const visiter = (valeur: unknown, profondeur: number): void => {
    if (profondeur > 6) return;
    if (typeof valeur === 'string') {
      valeurs.add(valeur);
      return;
    }
    if (Array.isArray(valeur)) {
      for (const element of valeur) visiter(element, profondeur + 1);
      return;
    }
    if (valeur !== null && typeof valeur === 'object') {
      for (const sous of Object.values(valeur as Record<string, unknown>)) {
        visiter(sous, profondeur + 1);
      }
    }
  };
  visiter(contenu, 0);
  for (const couleur of habillage.palette.nuancier) valeurs.add(couleur);
  for (const calque of habillage.scene.calques) {
    for (const region of calque.regions) valeurs.add(region.id);
  }
  return [...valeurs].filter((v) => v.length > 0 && v.length < 40);
}

/** Combinaisons bornées de valeurs pour les champs d'une action. */
function combinaisons(
  champs: readonly string[],
  valeurs: readonly string[],
  plafond: number,
): readonly Record<string, string>[] {
  if (champs.length === 0) return [{}];
  const sortie: Record<string, string>[] = [];
  if (champs.length === 1) {
    for (const valeur of valeurs.slice(0, plafond)) sortie.push({ [champs[0]!]: valeur });
    return sortie;
  }
  const largeur = Math.max(2, Math.floor(Math.sqrt(plafond)));
  for (const premier of valeurs.slice(0, largeur)) {
    for (const second of valeurs.slice(0, largeur)) {
      const entree: Record<string, string> = { [champs[0]!]: premier, [champs[1]!]: second };
      for (const autre of champs.slice(2)) entree[autre] = valeurs[0] ?? '';
      sortie.push(entree);
      if (sortie.length >= plafond) return sortie;
    }
  }
  return sortie;
}

const PLAFOND_COMBINAISONS = 24;

/**
 * LA SONDE — elle fait TOURNER le corpus et note ce qui sort.
 *
 * Pour chaque exercice : on crée l'état, puis on soumet au réducteur toutes les actions que le
 * type du moteur déclare, avec des arguments pris dans le catalogue de l'exercice. On récolte
 * les chaînes de chaque état produit, de son résumé, de sa progression et de l'aide proposée.
 */
function emissionsDuCorpus(): { readonly vues: Emissions; readonly reductions: number } {
  const vues: Emissions = new Map();
  let reductions = 0;
  const exercices = tousLesExercices();

  for (const exercice of exercices) {
    const code = exercice.jeu.moteur as CodeMoteur;
    const habillage = habillagePour(code);
    if (habillage === null) continue;
    const moteur = obtenirMoteur(code);
    const contenu = exercice.jeu.contenu as unknown as Record<string, unknown>;
    const valeurs = candidats(contenu, habillage);

    let etat: unknown;
    try {
      etat = moteur.creerEtat({
        contenu,
        habillage,
        alea: creerAlea(20260801),
        horloge: horlogeDeTest(),
      });
    } catch {
      continue;
    }
    recolter(etat, vues, code);

    const contexte = { alea: creerAlea(7), horloge: horlogeDeTest() };
    for (const variante of actionsDe(code)) {
      for (const arguments_ of combinaisons(variante.champs, valeurs, PLAFOND_COMBINAISONS)) {
        try {
          etat = moteur.reduire(etat, { type: variante.type, ...arguments_ }, contexte);
          reductions += 1;
        } catch {
          continue;
        }
        recolter(etat, vues, code);
        try {
          recolter(moteur.progression(etat), vues, `${code}#progression`);
          recolter(moteur.aideProposee(etat), vues, `${code}#aide`);
          recolter(moteur.resume(etat), vues, `${code}#resume`);
        } catch {
          // Un moteur qui refuse de résumer un état intermédiaire n'est pas le sujet ici.
        }
      }
    }
  }

  // ── LA CASCADE DE RÉCOMPENSES, sur ses VRAIS paramètres livrés.
  //
  // C'est elle qui produit les natures de récompense. Elle est exécutée assez loin pour
  // franchir les deux paliers : sans cela, `NatureRecompense` serait déclarée NON EXERCÉE et
  // le contrôle positif ne mordrait pas.
  const seuils = lireSeuilsCascade(lireJson('contenu/referentiel/parametres-recompenses.json'));
  let cascade = ETAT_CASCADE_VIDE;
  for (let tour = 0; tour < 200; tour += 1) {
    const gain = appliquerEtoiles(cascade, 3, seuils, `2026-09-0${String((tour % 9) + 1)}T08:00:00Z`);
    cascade = gain.etat;
    recolter(gain, vues, 'cascade#gain');
    recolter(jaugesDe(cascade, seuils), vues, 'cascade#jauges');
  }

  return { vues, reductions };
}

// ══════════════════════════════════════════════════════════════════════════════ le verdict

const UNIONS = unionsLitterales();
const SONDE = emissionsDuCorpus();

interface VerdictUnion {
  readonly union: UnionLitterale;
  readonly produits: readonly string[];
  readonly absents: readonly string[];
}

const VERDICTS: readonly VerdictUnion[] = UNIONS.map((union) => {
  const dedies = champsDedies(SONDE.vues, union.membres);
  const produits = new Set<string>();
  for (const champ of dedies) {
    for (const valeur of SONDE.vues.get(champ) ?? []) produits.add(valeur);
  }
  return {
    union,
    produits: union.membres.filter((m) => produits.has(m)),
    absents: union.membres.filter((m) => !produits.has(m)),
  };
});

const EXERCEES = VERDICTS.filter((v) => v.produits.length > 0);
const NON_EXERCEES = VERDICTS.filter((v) => v.produits.length === 0);
const TROUEES = EXERCEES.filter((v) => v.absents.length > 0);

/**
 * EXEMPTIONS — aucune, et c'est délibéré.
 *
 * Au premier passage du contrat de couverture de CLAUDE.md, six exemptions sur huit étaient
 * inutiles. On n'en ouvre donc pas d'avance : ce que la sonde ne peut pas atteindre tombe déjà
 * dans « NON EXERCÉ », qui est une catégorie honnête et imprimée, pas un pardon.
 */
const EXEMPTIONS: readonly { readonly membre: string; readonly raison: string; readonly scene: string }[] =
  [];

describe('Q2 — chaque énumérant est réellement PRODUIT au moins une fois', () => {
  test('la population et la sonde ne sont pas vides', () => {
    expect(UNIONS.length, 'aucune union littérale recensée').toBeGreaterThanOrEqual(20);
    expect(SONDE.reductions, 'la sonde n’a exécuté aucune réduction').toBeGreaterThan(500);
    expect(SONDE.vues.size, 'la sonde n’a récolté aucun champ').toBeGreaterThan(100);
    console.log(
      `[Q2] population : ${String(UNIONS.length)} unions littérales de partage/src ` +
        `(${String(UNIONS.reduce((n, u) => n + u.membres.length, 0))} membres). ` +
        `Sonde : ${String(SONDE.reductions)} réductions, ${String(SONDE.vues.size)} champs ` +
        `distincts observés.`,
    );
    console.log(
      `[Q2] ${String(EXERCEES.length)} union(s) EXERCÉE(S) par la sonde · ` +
        `${String(NON_EXERCEES.length)} NON EXERCÉE(S) (hors de la couche instrumentée, ` +
        'déclarées telles, jamais « mortes »).',
    );
    for (const v of NON_EXERCEES) {
      console.log(`[Q2]   non exercée : ${v.union.nom.padEnd(28)} ${v.union.fichier}`);
    }
  });

  test('CONTRÔLE POSITIF — `objet-campement` est signalé, là où le détecteur textuel était aveugle', () => {
    // Le contrôle exigé par le § 4 Q2, et il porte la leçon entière du lot : `objet-campement`
    // est CITÉ dans deux écrans qui le traduisent, et PRODUIT par personne. Un `grep` le voit
    // vivant ; une sonde d'exécution le voit absent.
    const natures = VERDICTS.find((v) => v.union.nom === 'NatureRecompense');
    expect(natures, 'l’union `NatureRecompense` a disparu de partage/src').toBeDefined();
    expect(
      natures!.produits.length,
      '`NatureRecompense` n’est plus exercée du tout par la sonde : la cascade ne tourne plus, ' +
        'et le contrôle comparerait zéro à zéro — exactement ce qui est arrivé à R30.',
    ).toBeGreaterThanOrEqual(2);
    console.log(
      `[Q2] contrôle positif — NatureRecompense : produits ${natures!.produits.join(', ')} · ` +
        `jamais produits ${natures!.absents.join(', ') || 'aucun'}`,
    );
    expect(
      natures!.absents,
      'Q2 ne retrouve plus le défaut de référence. Soit A1 a tranché `objet-campement` — alors ' +
        'ce contrôle est à remplacer par un témoin vivant —, soit la sonde est devenue aveugle.',
    ).toContain('objet-campement');
  });

  test('CONTRÔLE NÉGATIF — la sonde produit bien des valeurs qu’aucune déclaration ne cite en dur', () => {
    // Sans lui, une sonde qui se contenterait de relire le CONTENU passerait pour une sonde
    // d'exécution. On exige donc qu'elle ait produit des motifs de refus — des valeurs qui
    // n'existent QUE parce qu'un réducteur a tourné.
    const motifs = VERDICTS.filter((v) => /Motif|Refus/i.test(v.union.nom));
    const produits = motifs.flatMap((v) => v.produits);
    console.log(
      `[Q2] contrôle négatif — ${String(motifs.length)} union(s) de motifs de refus, ` +
        `${String(produits.length)} motif(s) réellement émis par les réducteurs.`,
    );
    expect(
      produits.length,
      'la sonde n’a produit aucun motif de refus : elle ne fait donc que relire le contenu, ' +
        'elle n’exécute rien. Ce serait un `grep` déguisé.',
    ).toBeGreaterThanOrEqual(5);
  });

  test('LE DÉFAUT — aucune union exercée ne porte de membre jamais produit', () => {
    // Re-imprime ici : vitest.config.ts pose silent: passed-only, donc le resume de
    // population du cas VERT ne sort pas de la chaine complete.
    console.log(
      `[Q2] rappel de population : ${String(UNIONS.length)} unions, ` +
        `${String(UNIONS.reduce((n, u) => n + u.membres.length, 0))} membres · ` +
        `${String(EXERCEES.length)} exercees, ${String(NON_EXERCEES.length)} non exercees · ` +
        `sonde ${String(SONDE.reductions)} reductions.`,
    );
    const exemptes = new Set(EXEMPTIONS.map((x) => x.membre));
    const griefs: string[] = [];
    for (const verdict of TROUEES) {
      const absents = verdict.absents.filter((m) => !exemptes.has(m));
      if (absents.length === 0) continue;
      console.log(
        `[Q2] ⚠ ${verdict.union.nom.padEnd(28)} ${verdict.union.fichier}\n` +
          `        produits : ${verdict.produits.join(', ')}\n` +
          `        JAMAIS produits : ${absents.join(', ')}`,
      );
      for (const membre of absents) griefs.push(`${verdict.union.nom} · '${membre}'`);
    }
    expect(
      griefs,
      'Ces valeurs portent un nom dans une union par ailleurs vivante, et aucune exécution du ' +
        'corpus ne les produit. C’est la signature de la loi remplacée dont le NOM survit ' +
        '(CLAUDE.md) : soit un palier les attribue, soit le nom, sa casse de `switch`, sa ' +
        'couleur et sa colonne disparaissent.',
    ).toEqual([]);
  });
});
