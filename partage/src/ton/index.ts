/**
 * La mécanique de la convention C7 — D35, conséquence 2. Lot N4.
 *
 * « Le jeu ne dit jamais ce qui manque, il dit toujours ce que l'enfant peut rendre. Jamais
 * "le monde est gris", toujours "tu peux lui rendre ses couleurs". »
 *
 * Ce n'est PAS un correcteur automatique : c'est un filet. Il attrape les formulations dont
 * on sait qu'elles énoncent une perte, et il propose le retournement. Un humain écrit la
 * phrase ; le test refuse celles qui retombent dans le piège.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * DEUX RÉGIMES, ET C'EST CE QUI REND LA RÈGLE APPLICABLE PLUTÔT QU'IMPOSSIBLE
 *
 * D35 raconte lui-même une perte — « la Pierre s'est brisée, les noms s'effacent, ce qui n'a
 * plus de nom perd ses couleurs » — et conclut : « C'est exactement le même fait, RETOURNÉ de
 * l'absence vers le pouvoir d'agir. » Un filet qui refuserait toute mention d'une perte
 * refuserait donc la séquence d'ouverture que D35 réclame. Il serait inapplicable, on le
 * contournerait, et il ne protégerait plus rien.
 *
 * D'où la distinction, portée par le champ `retournable` :
 *
 *   • `retournable: false` — le REPROCHE. « tu n'as pas réussi », « raté », « mauvaise
 *     réponse », « il te manque », « verrouillé ». Rien ne les sauve, aucun contexte, jamais.
 *     C'est R14 : aucun écran d'échec, un acquis n'est jamais repris.
 *
 *   • `retournable: true` — le CONSTAT SUR LE MONDE. « en gris », « perd ses couleurs »,
 *     « les noms s'effacent ». Recevable À LA SEULE CONDITION que le même texte porte le
 *     pouvoir d'agir de l'enfant (`MARQUEURS_DE_POUVOIR`). C'est littéralement le retournement
 *     que D35 demande, et il devient mécaniquement vérifiable.
 *
 * Le défaut mesuré au contrat v3 § 4.4 tombe exactement dans le second cas :
 * « Le monde t'attend en gris. » constate la perte et n'offre aucun verbe à l'enfant.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier lit le DISQUE (`textesDestinesALEnfant`). Il n'est donc **jamais** importé par le
 * client : convention C1, les valeurs passent par un sous-chemin, et celui-ci
 * (`@pierre/partage/ton`) n'est employé que par les tests et l'outillage.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface FormulationDePerte {
  readonly motif: RegExp;
  readonly pourquoi: string;
  readonly remede: string;
  /**
   * AJOUT N4 au § 5.9 du contrat gelé — signalé au rapport, et il ne retire rien.
   *
   * Les trois membres gelés sont présents avec leur type gelé ; un lot écrit contre la
   * signature du § 5.9 compile sans changer une ligne. Sans ce quatrième membre, la
   * séquence d'ouverture de D35 serait refusée par le filet censé la protéger (voir plus
   * haut) — la règle serait inapplicable, donc contournée, donc morte.
   */
  readonly retournable: boolean;
}

/**
 * Ce qui prouve, dans le texte lui-même, que l'enfant a quelque chose à faire.
 *
 * Liste FERMÉE et courte, volontairement : un marqueur vague laisserait passer n'importe quoi
 * et le filet redeviendrait décoratif. Chacun est un verbe d'action adressé à l'enfant, ou une
 * invitation directe.
 */
export const MARQUEURS_DE_POUVOIR: readonly RegExp[] = [
  /\btu\s+(peux|sais|connais|as\s+le)\b/iu,
  /\b(rends|rendre|redonne|redonner)\b/iu,
  /\b(rallume|rallumer|rallumes|rallumons)\b/iu,
  /\b(réveille|réveiller|réveilles)\b/iu,
  /\b(retrouve|retrouver|retrouves)\b/iu,
  /\b(ramène|ramener|ramènes)\b/iu,
  /\bà\s+toi\s+de\b/iu,
  /\bviens\b/iu,
  /\bon\s+y\s+va\b/iu,
  /\bt['’]attend(ent)?\s+pour\b/iu,
  /\bavec\s+toi\b/iu,
];

/**
 * Les formulations refusées, avec leur motif et leur remède.
 *
 * Chaque entrée vient d'un fait du dossier, jamais d'une intuition : le retour du père (D35),
 * R14 (aucun écran d'échec), D16 (l'aide ne coûte rien), D44 (les cases vides se montrent, on
 * ne cadenasse pas).
 */
export const FORMULATIONS_DE_PERTE: readonly FormulationDePerte[] = [
  // ── Le reproche. Aucun contexte ne le sauve. ────────────────────────────────────────────
  {
    motif: /\b(raté|ratée|ratés|ratées|échoué|échec|perdu\s+la\s+partie)\b/iu,
    pourquoi: 'R14 — aucun écran d’échec, jamais. Le mot dit à l’enfant qu’il a perdu.',
    remede: 'Nommer le geste à refaire : « on refait le rond, en partant d’en haut ».',
    retournable: false,
  },
  {
    motif: /\b(mauvaise\s+réponse|mauvais\s+choix|c['’]est\s+faux|réponse\s+fausse)\b/iu,
    pourquoi: 'R14 — une réponse n’est jamais « fausse » ; elle est en cours.',
    remede: 'Montrer la cible : « celle-là, c’est le b. Cherche encore le d. »',
    retournable: false,
  },
  {
    motif: /\btu\s+n['’](as|es)\s+pas\s+(su|réussi|trouvé|compris)\b/iu,
    pourquoi: 'R14 — un texte qui note l’enfant. Le jeu n’évalue jamais l’enfant à voix haute.',
    remede: 'Retourner vers le geste : « regarde comme Gobi le fait, puis à toi ».',
    retournable: false,
  },
  {
    motif: /\btu\s+ne\s+(sais|peux)\s+pas\b/iu,
    pourquoi: 'R14 — énonce une incapacité de l’enfant.',
    remede: 'Énoncer ce qu’il peut : « tu sais lire les noms, alors viens ».',
    retournable: false,
  },
  {
    motif: /\bil\s+(te|lui)\s+manque\b/iu,
    pourquoi: 'D35 — énonce ce qui manque à l’enfant au lieu de ce qu’il peut rendre.',
    remede: 'Dire l’action : « encore deux formes et Gobi grandit ».',
    retournable: false,
  },
  {
    motif: /\b(verrouillé|verrouillée|cadenassé|cadenassée|bloqué|bloquée|interdit|interdite)\b/iu,
    pourquoi: 'D44 et v2 § 9.4 — « jamais un cadenas ». Une case non gagnée est en creux, visible.',
    remede: 'Montrer la case vide et son chemin : « celle-ci t’attend, elle est aux Galeries ».',
    retournable: false,
  },
  {
    motif: /\b(pas\s+encore\s+(disponible|accessible|débloqué|débloquée)|indisponible)\b/iu,
    pourquoi: 'D46 — un refus sans issue. Aucun état sans issue, nulle part.',
    remede: 'Toujours offrir une porte : « on peut y aller voir, on jouera plus tard ».',
    retournable: false,
  },
  {
    motif: /\b(impossible|ne\s+(fonctionne|marche)\s+pas|une\s+erreur\s+est\s+survenue)\b/iu,
    pourquoi: 'Un message technique adressé à un enfant de 7 ans. Il ne lui donne rien à faire.',
    remede: 'Dire le geste : « touche la Pierre pour réessayer ».',
    retournable: false,
  },
  {
    motif: /\bdésolé(e|s)?\b/iu,
    pourquoi: 'Le jeu s’excuse : il pose l’enfant devant un manque qu’il ne peut pas combler.',
    remede: 'Proposer : « viens, on essaie autrement ».',
    retournable: false,
  },

  // ── Le constat sur le monde. Recevable AVEC le pouvoir d'agir, refusé sans. ─────────────
  {
    motif: /\ben\s+gris\b|\best\s+(tout\s+)?gris\b|\bsont\s+gris(es)?\b/iu,
    pourquoi:
      'D35, le défaut d’origine — « je n’ai pas compris la phrase "le monde t’attend en gris" ». ' +
      'Le gris seul est une tristesse ; avec le geste, c’est un travail qui attend l’enfant.',
    remede: 'Ajouter le pouvoir d’agir : « tu peux lui rendre ses couleurs ».',
    retournable: true,
  },
  {
    motif: /\bperd(ent|u|ue|us|ues)?\s+(ses|leurs|sa|leur|les)\s+couleurs?\b|\bplus\s+de\s+couleurs?\b/iu,
    pourquoi: 'D35 — la perte des couleurs est la prémisse du monde, pas l’état de l’enfant.',
    remede: 'La fermer sur l’action : « et toi, tu sais les rallumer ».',
    retournable: true,
  },
  {
    motif: /\b(s['’]effacent|s['’]efface|effacés|effacées|oubliés|oubliées|disparu(e|s|es)?)\b/iu,
    pourquoi: 'D35 — un constat d’absence. Seul, il ne donne rien à faire.',
    remede: 'Le retourner : « tu sais encore les lire, alors ils reviennent ».',
    retournable: true,
  },
  {
    motif: /\b(brisée|brisé|cassée|cassé|en\s+mille\s+éclats)\b/iu,
    pourquoi: 'La Pierre brisée est le point de départ du récit ; sans suite, c’est une fin.',
    remede: 'Enchaîner : « et chaque nom que tu lis en recolle un éclat ».',
    retournable: true,
  },
  {
    motif: /\b(triste|tristesse|seul(e)?\s+au\s+monde|abandonné(e|s)?)\b/iu,
    pourquoi: 'v2 § 2 — le registre du jeu est chaleureux. La tristesse n’appelle aucun geste.',
    remede: 'Nommer la présence : « les habitants t’attendent, ils sont là ».',
    retournable: true,
  },
  {
    motif: /\bvide(s)?\b/iu,
    pourquoi:
      'D44 — la case vide se MONTRE (c’est le moteur de motivation), mais le mot « vide » seul ' +
      'dit l’absence. Il lui faut le geste qui la remplit.',
    remede: 'Dire ce qui vient : « cette case attend une forme, elle est aux Galeries ».',
    retournable: true,
  },
];

/** Vrai si le texte porte, en clair, le pouvoir d'agir de l'enfant. */
function porteLePouvoirDAgir(texte: string): boolean {
  return MARQUEURS_DE_POUVOIR.some((marqueur) => marqueur.test(texte));
}

/**
 * `null` quand le texte est bon. Sinon, la règle enfreinte et son remède.
 *
 * L'ordre d'évaluation compte : les REPROCHES sont examinés d'abord, et rien ne les sauve.
 * Un texte qui reprocherait puis encouragerait — « tu n’as pas réussi, mais tu peux
 * recommencer » — reste un écran d’échec, et R14 l’interdit.
 */
export function enonceUnePerte(texte: string): FormulationDePerte | null {
  const reproche = FORMULATIONS_DE_PERTE.find(
    (formulation) => !formulation.retournable && formulation.motif.test(texte)
  );
  if (reproche !== undefined) {
    return reproche;
  }

  const constat = FORMULATIONS_DE_PERTE.find(
    (formulation) => formulation.retournable && formulation.motif.test(texte)
  );
  if (constat === undefined) {
    return null;
  }
  return porteLePouvoirDAgir(texte) ? null : constat;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// L'ÉNUMÉRATION DES OBJETS — jamais des occurrences
//
// « Auditer une propriété, c'est énumérer les objets qui DEVRAIENT la porter, pas les
// occurrences de l'attribut. » Un `grep` sur « gris » aurait trouvé le défaut d'EcranCarte et
// aurait manqué les 200 autres textes qui n'ont simplement pas encore été écrits de travers.
//
// On énumère donc les SOURCES DE TEXTE : chaque consigne d'exercice, chaque libellé de
// campement, chaque tableau d'ouverture, chaque région, et chaque chaîne rendue par un écran.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Racine du dépôt, déduite de l'emplacement de ce fichier (`partage/src/ton/index.ts`). */
function racineParDefaut(): string {
  return path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
}

function listerFichiers(dossier: string, extension: string): readonly string[] {
  let entrees: readonly string[];
  try {
    entrees = readdirSync(dossier);
  } catch {
    return [];
  }
  const trouves: string[] = [];
  for (const entree of entrees) {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      trouves.push(...listerFichiers(complet, extension));
    } else if (entree.endsWith(extension)) {
      trouves.push(complet);
    }
  }
  return trouves.sort();
}

function lireJson(chemin: string): unknown {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

/** Les clés JSON dont la valeur est lue à voix haute ou affichée telle quelle à l'enfant. */
const CLES_DE_TEXTE_ENFANT: readonly string[] = [
  'texte',
  'titre',
  'libelle',
  'consigne',
  'enonce',
  'phrase',
  'question',
  'indice',
  'reussite',
  'encouragement',
  'ambiance',
];

/** Parcours récursif : toute valeur de chaîne portée par une clé de texte enfant. */
function textesDuDocument(valeur: unknown, recolte: string[]): void {
  if (Array.isArray(valeur)) {
    for (const element of valeur) {
      textesDuDocument(element, recolte);
    }
    return;
  }
  if (typeof valeur !== 'object' || valeur === null) {
    return;
  }
  for (const [cle, contenu] of Object.entries(valeur as Record<string, unknown>)) {
    // `$commentaire` est destiné à l'agent, jamais à l'enfant — il commente le fichier.
    if (cle.startsWith('$')) {
      continue;
    }
    if (typeof contenu === 'string' && CLES_DE_TEXTE_ENFANT.includes(cle)) {
      recolte.push(contenu);
    } else {
      textesDuDocument(contenu, recolte);
    }
  }
}

/** Retire les commentaires d'un fichier `.tsx`. Un commentaire n'atteint jamais l'enfant. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|\s)\/\/[^\n]*/gu, '$1');
}

/** `&nbsp;` `&amp;` `&#39;` … — ce que le navigateur rend, pas ce que le fichier écrit. */
function decoderEntites(texte: string): string {
  return texte
    .replace(/&nbsp;/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&laquo;|&raquo;/gu, '"')
    .replace(/&(?:apos|#39);/gu, '’')
    .replace(/&(?:quot|#34);/gu, '"')
    .replace(/&[a-z]+;/gu, ' ');
}

/** Retire les interpolations `{…}` d'un nœud de texte JSX, imbrications comprises. */
function sansInterpolations(texte: string): string {
  let courant = texte;
  for (let passe = 0; passe < 8; passe += 1) {
    const suivant = courant.replace(/\{[^{}]*\}/gu, ' ');
    if (suivant === courant) {
      return suivant;
    }
    courant = suivant;
  }
  return courant;
}

/**
 * Les chaînes qu'un écran donne à LIRE — nœuds de texte JSX et attributs parlants.
 *
 * On ne prend PAS toutes les chaînes littérales du fichier : un `data-vers="campement"` ou un
 * `queryKey: ['monde']` n'est pas un texte d'enfant, et les compter noierait le signal.
 */
function textesDuComposant(source: string): readonly string[] {
  const propre = sansCommentaires(source);
  const trouves: string[] = [];

  // 1. Les nœuds de texte JSX : tout ce qui est rendu entre deux balises.
  for (const capture of propre.matchAll(/>([^<]*)</gu)) {
    const brut = decoderEntites(sansInterpolations(capture[1] ?? ''))
      .replace(/\s+/gu, ' ')
      .trim();
    if (estUnePhrase(brut)) {
      trouves.push(brut);
    }
  }

  // 2. Les attributs lus par la synthèse vocale ou affichés au survol.
  for (const capture of propre.matchAll(
    /\b(?:aria-label|title|alt|placeholder|libelle)=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/gu
  )) {
    const brut = decoderEntites(sansInterpolations(capture[1] ?? capture[2] ?? capture[3] ?? ''))
      .replace(/\s+/gu, ' ')
      .trim();
    if (estUnePhrase(brut)) {
      trouves.push(brut);
    }
  }

  return trouves;
}

/**
 * Les caractères qu'un texte français destiné à un enfant n'emploie JAMAIS, et qui trahissent
 * du code.
 *
 * ── POURQUOI CE FILTRE EXISTE, mesuré et non supposé ────────────────────────────────────────
 * Le balayage naïf `>(…)<` d'un fichier `.tsx` ne capture pas que du JSX : `=>`, `Record<…>`,
 * `useState<…>` et `a > b` en sèment partout. Première mesure sur le dépôt : **325 candidats**,
 * dont une bonne moitié de fragments de TypeScript — un chiffre gonflé qui aurait fait passer
 * le contrat de sortie de N4 pour plus riche qu'il n'est, et qui aurait pu masquer un vrai
 * texte fautif dans le bruit. Après ce filtre : voir le rapport.
 *
 * L'apostrophe DROITE (`'`) en fait partie : le projet écrit `’` dans tout texte d'enfant
 * (v2 § 9.3, et les fichiers de contenu le font déjà). Une apostrophe droite dans un candidat
 * signale donc une chaîne de code, pas une phrase.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 */
const CARACTERES_DE_CODE = /[;=(){}[\]<>`"'/\\$#@|&*+_]/u;

/**
 * Une phrase destinée à un humain : au moins deux mots, aucune trace de code.
 * Écarte `px`, `1.5rem`, `clairiere-01`, `0 0 1200 800`, `=> {`, `Record<string, unknown>`.
 */
function estUnePhrase(candidat: string): boolean {
  if (candidat.length < 6 || candidat.length > 400) {
    return false;
  }
  if (CARACTERES_DE_CODE.test(candidat)) {
    return false;
  }
  // Au moins deux mots d'au moins deux lettres : « Tape pour entrer » oui, « 40 % » non.
  const mots = candidat.split(/\s+/u).filter((mot) => /[a-zà-öø-ÿ]{2}/iu.test(mot));
  return mots.length >= 2;
}

/**
 * Tous les textes destinés à l'enfant, énumérés pour le test de C7.
 *
 * ÉNUMÈRE LES OBJETS, jamais les occurrences : la liste est celle des sources de texte —
 * consignes d'exercices, libellés de campement, tableaux d'ouverture, libellés de région,
 * chaînes littérales des écrans — et non le résultat d'un `grep` sur un mot.
 *
 * @param racineDepot Racine du dépôt. Optionnel : la signature gelée du § 5.9 —
 *   `textesDestinesALEnfant(): readonly string[]` — reste appelable telle quelle.
 */
export function textesDestinesALEnfant(racineDepot: string = racineParDefaut()): readonly string[] {
  const recolte: string[] = [];

  // ── les données de contenu ──────────────────────────────────────────────────────────────
  const dossiersJson = [
    path.join(racineDepot, 'contenu', 'exercices'),
    path.join(racineDepot, 'contenu', 'monde'),
  ];
  for (const dossier of dossiersJson) {
    for (const fichier of listerFichiers(dossier, '.json')) {
      textesDuDocument(lireJson(fichier), recolte);
    }
  }

  // ── les écrans et composants du client ──────────────────────────────────────────────────
  const dossiersTsx = [
    path.join(racineDepot, 'client', 'src', 'ecrans'),
    path.join(racineDepot, 'client', 'src', 'monde'),
    path.join(racineDepot, 'client', 'src', 'composants'),
  ];
  for (const dossier of dossiersTsx) {
    for (const fichier of listerFichiers(dossier, '.tsx')) {
      // La zone parent n'est PAS un texte d'enfant : elle s'adresse à un adulte, et elle a le
      // droit — le devoir, même — de nommer ce qui manque. C7 ne la concerne pas.
      if (fichier.includes(`${path.sep}parent${path.sep}`)) {
        continue;
      }
      recolte.push(...textesDuComposant(readFileSync(fichier, 'utf8')));
    }
  }

  // Dédoublonné : ce sont des OBJETS de texte, et deux écrans qui disent la même phrase ne
  // font qu'un texte à relire. Trié pour que le rapport d'un test soit reproductible.
  return [...new Set(recolte)].sort((a, b) => a.localeCompare(b, 'fr'));
}
