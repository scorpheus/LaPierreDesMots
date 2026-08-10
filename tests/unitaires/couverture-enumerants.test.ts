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
 *
 * ── DEUX PASSAGES DE PLUS, GÉNÉRIQUES, AJOUTÉS POUR ATTEINDRE LES REFUS « DÉJÀ FAIT » ────────
 *
 * `MotifRefus · 'region-deja-peinte'`, `'aucune-couleur-choisie'` et
 * `MotifRefusHistoire · 'question-deja-repondue'` sont des chemins RÉELS des réducteurs
 * (`colorie/validation.ts`, `histoire/validation.ts`) — jamais atteints par la seule boucle
 * ci-dessus, dont l'état s'ACCUMULE : une action qui pose un prérequis (choisir une couleur) est
 * toujours essayée, dans l'ordre du type, avant celle qui l'exige (peindre), et aucune action
 * n'est jamais rejouée deux fois de suite sur le même résultat. Deux passages génériques,
 * n'importe QUEL moteur en profite sans qu'on connaise sa sémantique :
 *
 *   1. Chaque variante essayée UNE FOIS sur l'état FRAIS (avant tout autre), sur une COPIE
 *      jetable : ça atteint « action B tentée sans que le prérequis A ait jamais eu lieu ».
 *   2. Après chaque réduction réussie dans la boucle principale, la MÊME action, mêmes
 *      arguments, REJOUÉE contre l'état qui vient d'en sortir : ça atteint « la même action,
 *      deux fois de suite » — repeindre la région qu'on vient de peindre, répondre deux fois à
 *      la question qu'on vient de résoudre.
 *
 * Aucun des deux ne suppose quoi que ce soit sur le moteur : c'est la même liste de variantes et
 * la même génération de combinaisons que la boucle principale, seul l'ORDRE d'essai change.
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

    // ── PASSAGE 1 — chaque variante contre l'état FRAIS, sur une copie jetable.
    for (const variante of actionsDe(code)) {
      for (const arguments_ of combinaisons(variante.champs, valeurs, PLAFOND_COMBINAISONS)) {
        try {
          const essai = moteur.reduire(etat, { type: variante.type, ...arguments_ }, contexte);
          recolter(essai, vues, code);
        } catch {
          continue;
        }
      }
    }

    for (const variante of actionsDe(code)) {
      for (const arguments_ of combinaisons(variante.champs, valeurs, PLAFOND_COMBINAISONS)) {
        try {
          etat = moteur.reduire(etat, { type: variante.type, ...arguments_ }, contexte);
          reductions += 1;
        } catch {
          continue;
        }
        recolter(etat, vues, code);
        // ── PASSAGE 2 — la même action rejouée contre l'état qui vient d'en sortir.
        try {
          const rejeu = moteur.reduire(etat, { type: variante.type, ...arguments_ }, contexte);
          recolter(rejeu, vues, code);
        } catch {
          // Un rejeu qui jette n'est pas le sujet ici — un refus, lui, rend un état normal.
        }
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

/**
 * Les verdicts, EN FONCTION de leurs entrées — et c'est ce qui rend le contrôle ré-ancrable.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE N'EST PLUS UN CALCUL DE MODULE
 *
 * Le contrôle positif de ce garde était `objet-campement` : « il doit être signalé, là où le
 * détecteur textuel était aveugle ». **Le lot A1 a retiré l'énumérant**, et le contrôle est
 * tombé — ce fichier l'annonçait mot pour mot.
 *
 * Un contrôle ancré sur un défaut RÉEL se périme quand le produit guérit. On l'ancre donc sur
 * une union FABRIQUÉE, injectée le temps de la mesure, dont un membre n'est jamais produit :
 * elle ne dépend d'aucun défaut du produit, donc elle ne se périmera jamais.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
function verdictsPour(
  unions: readonly UnionLitterale[],
  emissions: Emissions,
): readonly VerdictUnion[] {
  return unions.map((union) => {
    const dedies = champsDedies(emissions, union.membres);
    const produits = new Set<string>();
    for (const champ of dedies) {
      for (const valeur of emissions.get(champ) ?? []) produits.add(valeur);
    }
    return {
      union,
      produits: union.membres.filter((m) => produits.has(m)),
      absents: union.membres.filter((m) => !produits.has(m)),
    };
  });
}

const VERDICTS: readonly VerdictUnion[] = verdictsPour(UNIONS, SONDE.vues);

const EXERCEES = VERDICTS.filter((v) => v.produits.length > 0);
const NON_EXERCEES = VERDICTS.filter((v) => v.produits.length === 0);
const TROUEES = EXERCEES.filter((v) => v.absents.length > 0);

/**
 * EXEMPTIONS — dix, chacune vérifiée avant d'être ouverte, aucune de confort.
 *
 * Au premier passage du contrat de couverture de CLAUDE.md, six exemptions sur huit étaient
 * inutiles : on n'en ouvre donc jamais avant d'avoir mesuré que la sonde, poussée aussi loin que
 * sa conception générique le permet, ne peut vraiment pas atteindre le membre. Trois causes
 * distinctes, aucune bouchée par une exemption de confort :
 */
const EXEMPTIONS: readonly { readonly membre: string; readonly raison: string; readonly scene: string }[] =
  [
    {
      membre: "region-deja-peinte",
      raison:
        "Le chemin est réel et atteint par le jeu (`colorie/validation.ts:166-168`) ; ce que la " +
        "sonde ne peut pas produire, c'est un PREMIER peindre ACCEPTÉ à rejouer. `combinaisons()` " +
        "tire au plus 24 valeurs candidates par champ depuis un ensemble non ordonné (contenu + " +
        "palette + régions mêlés) — mesuré : sur aucun des exercices `colorie` du corpus, la " +
        "couleur choisie par `choisirCouleur` (1 champ, 24 candidats) et la région tentée par " +
        "`peindre` (1 champ, 24 candidats) ne s'alignent par hasard sur un couple (région, " +
        "couleur) que la consigne courante attend réellement. Rendre cela systématique demanderait " +
        "que la sonde LISE la bonne réponse dans `consigne.cibles` pour la lui servir — exactement " +
        "la connaissance spécifique à `colorie` que sa conception refuse d'avoir (« un moteur écrit " +
        "demain est exercé sans qu'on touche ce fichier »).",
      scene:
        "Élargir `candidats()` pour que les couleurs et régions RÉELLEMENT déclarées par " +
        "l'habillage passent avant le contenu brut dans l'ordre d'énumération — ou plafonner " +
        "`PLAFOND_COMBINAISONS` par CHAMP plutôt que globalement — ferait converger un couple " +
        "valide par pur balayage plus large, sans jamais lire la réponse attendue.",
    },
    {
      membre: "souffle-syllabe",
      raison:
        "Documenté en détail dans `Docs/decision-aide-de-gobi.md` § « Les trois codes d'aide " +
        "orphelins » (2026-08-07) : `construireAide()` (`partage/src/moteurs/commun/aide.ts`), le " +
        "SEUL point qui construit un `AideProposee`, ne produit jamais que `relire-consigne` et " +
        "`montre-cible` — aucun chemin de code, nulle part dans le dépôt, n'assigne ce troisième " +
        "code. Ce n'est pourtant pas un énumérant mort : 68 exercices le RÉCLAMENT (`aideGobi` de " +
        "leur contenu), et aucun consommateur ne le lit côté client. Implémenter correctement " +
        "exige une propriété `syllabe` sur `BoutonEcouter` ET 40 clips audio `mot/<mot>` en rendu " +
        "`syllabe` manquants sur 82 consignes concernées (42 déjà couverts) — un lot de production " +
        "audio, pas une correction de sonde.",
      scene:
        "Le lot que `Docs/decision-aide-de-gobi.md` nomme « prioritaire, plus gros qu'il n'en a " +
        "l'air » : câbler le consommateur, rendre les 40 clips manquants, puis vérifier que Q2 " +
        "signale ce code produit.",
    },
    {
      membre: "surligne-graphene",
      raison:
        "Même racine que `souffle-syllabe`, même document. Ici l'émetteur naturel EXISTE déjà — " +
        "`grave`, `Trou.attendu` porte le graphème — et l'aide est purement visuelle : 0 clip " +
        "manquant, seulement aucun consommateur côté client ni aucun code qui assigne " +
        "`code: 'surligne-graphene'` dans `construireAide` ou son appelant `grave`.",
      scene: "Même lot que `souffle-syllabe` : brancher `grave` sur ce code et lui donner un consommateur.",
    },
    {
      membre: "montre-couleur",
      raison:
        "Même racine, même document. L'émetteur naturel existe aussi — `colorie`, " +
        "`CibleColoriage.couleur` — et l'aide est purement visuelle : 0 clip manquant, aucun " +
        "consommateur ni assignation du code.",
      scene: "Même lot que `souffle-syllabe` : brancher `colorie` sur ce code et lui donner un consommateur.",
    },
    ...(
      [
        "sous",
        "devant",
        "derriere",
        "entre",
        "au-dessus",
        "en-dessous",
      ] as const
    ).map((relation) => ({
      membre: relation,
      raison:
        "Contenu manquant, pas code manquant : `contenu/exercices/clairiere/ecole-02-place.json` " +
        "est le SEUL exercice livré sur le moteur `place` — MESURÉ, " +
        "`grep -rl '\"moteur\": \"place\"' contenu/exercices/` ne rend que ce fichier — et ses 3 " +
        "zones ne demandent que `dans`, `sur`, `a-cote-de` — exactement les 3 membres que la " +
        "sonde produit. Les 6 autres relations restent un contrat gelé " +
        "(`RelationSpatiale`, `partage/src/moteurs/place/types.ts:39-41`), et `LEXIQUE_RELATIONS` " +
        "(`place/validation.ts:186-199`) sait déjà les reconnaître dans le texte d'une consigne — " +
        "ce n'est donc pas une loi remplacée dont le nom survit, c'est une région dont le contenu " +
        "au-delà de La Clairière n'existe pas encore (CLAUDE.md, « L1 décide de tout — une région " +
        "complète avant de construire les cinq autres »).",
      scene:
        "Le premier exercice `place` d'une région au-delà de La Clairière dont au moins une zone " +
        "porte une de ces 6 relations rendrait ce membre produit sans qu'on touche ce fichier.",
    })),
  ];

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

  test('CONTRÔLE POSITIF — un énumérant FABRIQUÉ que rien ne produit est signalé', () => {
    // Le témoin : une union de trois membres dont DEUX sont émis sur un champ qui leur est
    // dédié — donc l'union est « exercée » — et dont le troisième ne l'est jamais. C'est
    // exactement la signature de la loi remplacée dont le NOM survit, en éprouvette.
    const temoin: UnionLitterale = {
      nom: 'TemoinQ2',
      fichier: 'partage/src/temoin-fabrique.ts',
      membres: ['temoin-emis-a', 'temoin-emis-b', 'temoin-jamais-produit'],
    };
    const emissions: Emissions = new Map(SONDE.vues);
    emissions.set('temoin#champ', new Set(['temoin-emis-a', 'temoin-emis-b']));

    const [verdict] = verdictsPour([temoin], emissions);
    console.log(
      `[Q2] contrôle positif — témoin fabriqué : produits ${verdict!.produits.join(', ')} · ` +
        `jamais produits ${verdict!.absents.join(', ') || 'aucun'}`,
    );
    expect(
      verdict!.produits,
      'l’union fabriquée n’est même pas reconnue comme EXERCÉE : la règle du champ dédié ne ' +
        'reconnaît plus une émission, et tout « rien à signaler » serait sans valeur.',
    ).toEqual(['temoin-emis-a', 'temoin-emis-b']);
    expect(
      verdict!.absents,
      'Q2 ne signale pas un membre qu’AUCUN champ ne produit, dans une union par ailleurs ' +
        'vivante. L’instrument est aveugle — c’est précisément ce qui est arrivé au détecteur ' +
        'textuel D2 sur `objet-campement`.',
    ).toEqual(['temoin-jamais-produit']);

    // Et le témoin ne doit pas avoir fui dans la mesure du dépôt réel.
    expect(
      VERDICTS.some((v) => v.union.nom === 'TemoinQ2'),
      'le témoin fabriqué a fui dans le recensement réel : la mesure laisse sa propre trace.',
    ).toBe(false);
  });

  test('CONTRÔLE NÉGATIF — une union FABRIQUÉE entièrement produite n’est PAS signalée', () => {
    // Le pendant : un instrument qui signalerait tout serait aussi inutile qu'un aveugle.
    const temoin: UnionLitterale = {
      nom: 'TemoinQ2Complet',
      fichier: 'partage/src/temoin-fabrique.ts',
      membres: ['complet-a', 'complet-b'],
    };
    const emissions: Emissions = new Map(SONDE.vues);
    emissions.set('temoin#complet', new Set(['complet-a', 'complet-b']));
    const [verdict] = verdictsPour([temoin], emissions);
    console.log(
      `[Q2] contrôle négatif — union complète : ${String(verdict!.absents.length)} membre(s) manquant(s)`,
    );
    expect(
      verdict!.absents,
      'Q2 réclame un membre qui EST produit : il fabrique des orphelins, et un rapport de faux ' +
        'positifs ne se lit pas.',
    ).toEqual([]);
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
