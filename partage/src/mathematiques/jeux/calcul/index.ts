/**
 * LE CALCUL — premier jet (Docs/maths-calcul-premier-jet-2026-10-09.md).
 *
 * Logique pure du moteur `calcul` (Docs/reconception-maths-ce1-ce2-2026-10-09.md § 3.0, § 3.2,
 * § 3.3 et surtout § 6 bis, qui prime) : le gué des calculs (égalités à trou, en ligne) et la
 * pierre à calcul (addition posée, en colonnes), palier « CE1 facile ».
 *
 * Ce module ne connaît ni l'écran ni l'horloge. Il reçoit un `Alea` (graine journalisable) et
 * des gestes ; il rend un état. Trois règles y sont opposables :
 *   - **chiffre par chiffre** (§ 6 bis, Q5 = a) : un chiffre faux n'est jamais posé, il est
 *     compté, et rien de ce qui est posé n'est retiré (« un acquis n'est jamais repris ») ;
 *   - **aucun état d'échec** : une partie ne peut que continuer ou se finir sur une réussite ;
 *   - **l'aide de Gobi ne coûte que l'étoile « sans aide »** : barème `1 + sans aide + sans
 *     erreur` (`specifications-vallee-des-nombres.md:195`, repris au § 3.0).
 */
import type { Alea } from '../../../alea.js';
import type { NiveauAide } from '../../../moteurs/types.js';

/** Les codes des moteurs de maths montés sur le socle d'activité (§ 3.0). */
export type CodeMoteurMaths = 'calcul';

export type ActiviteCalcul = 'gue' | 'pose';

export type PalierCalcul =
  | 'gue-tables'
  | 'gue-dizaines'
  | 'gue-neuf'
  | 'pose-sans-retenue'
  | 'pose-retenue-montree';

export interface DescriptionPalier {
  readonly activite: ActiviteCalcul;
  /** Ce qui est demandé, en clair, pour le parent. */
  readonly libelle: string;
  /** Les bornes, en clair. */
  readonly bornes: string;
  /** La ligne du référentiel qui le justifie (Docs/reference-programmes-ce1-ce2.md). */
  readonly reference: string;
  readonly saisie: 'choix' | 'pave';
}

export const PALIERS_CALCUL: Readonly<Record<PalierCalcul, DescriptionPalier>> = {
  'gue-tables': {
    activite: 'gue',
    libelle: 'Tables d’addition dans les deux sens : 8 + 7 = ▢ ; 7 + ▢ = 15 ; 15 − 8 = ▢',
    bornes: 'termes de 2 à 9, résultats ≤ 18',
    reference: 'réf. 1.3 CE1 tables d’addition « connues dans les deux sens ; 12 égalités à trou en 1 minute »',
    saisie: 'choix',
  },
  'gue-dizaines': {
    activite: 'gue',
    libelle: 'Ajouter ou enlever des dizaines entières : 34 + 20 = ▢ ; 58 − 30 = ▢',
    bornes: 'nombres de 10 à 99, les unités ne changent pas (sans retenue)',
    reference: 'réf. 1.3 CE1 calcul mental (procédures) « ajouter/soustraire des dizaines ou centaines entières (234 + 60) »',
    saisie: 'pave',
  },
  'gue-neuf': {
    activite: 'gue',
    libelle: 'Ajouter 9 ou 19, enlever 9 : 46 + 9 = ▢ ; 34 + 19 = ▢ ; 52 − 9 = ▢',
    bornes: 'nombres de 10 à 99, toujours avec passage de la dizaine (avec retenue)',
    reference: 'réf. 1.3 CE1 calcul mental (procédures) « ajouter 9, 19, 29 ; soustraire 9 »',
    saisie: 'pave',
  },
  'pose-sans-retenue': {
    activite: 'pose',
    libelle: 'Addition posée de deux nombres à 2 chiffres, sans retenue : 34 + 25',
    bornes: 'deux nombres de 10 à 99, chaque colonne ≤ 9, somme ≤ 99',
    reference: 'réf. 1.3 CE1 addition/soustraction posées « additions de deux ou trois nombres à 1, 2 ou 3 chiffres (245 + 437) »',
    saisie: 'pave',
  },
  'pose-retenue-montree': {
    activite: 'pose',
    libelle: 'Addition posée avec une retenue, qui s’écrit toute seule et que Gobi montre : 38 + 47',
    bornes: 'deux nombres de 10 à 99, unités ≥ 10 (une retenue), somme ≤ 99',
    reference: 'réf. 1.3 CE1 addition/soustraction posées « additions de deux ou trois nombres à 1, 2 ou 3 chiffres (245 + 437) »',
    saisie: 'pave',
  },
};

/** Une case à remplir : un chiffre du résultat (ou du trou), ou la retenue. */
export interface CaseCalcul {
  readonly id: string;
  readonly attendu: number;
  readonly role: 'chiffre' | 'retenue';
  /** Colonne de l'addition posée ; `null` en ligne. */
  readonly colonne: 'u' | 'd' | null;
  /** Vrai : la case se remplit toute seule (retenue du palier 2). */
  readonly auto: boolean;
}

interface EtapeCommune {
  readonly id: string;
  readonly palier: PalierCalcul;
  readonly reponse: number;
  /** Dans l'ordre où l'enfant les remplit. */
  readonly cases: readonly CaseCalcul[];
}

/** Une égalité à trou : `termes[0] operateur termes[1] = termes[2]`, `termes[trou]` caché. */
export interface EtapeLigne extends EtapeCommune {
  readonly forme: 'ligne';
  readonly saisie: 'choix' | 'pave';
  readonly operateur: '+' | '-';
  readonly termes: readonly [number, number, number];
  readonly trou: 0 | 1 | 2;
  /** Les réponses à toucher, aux niveaux simples ; `null` : le pavé. */
  readonly choix: readonly number[] | null;
}

/** Une addition posée en colonnes : `haut + bas`. */
export interface EtapeColonnes extends EtapeCommune {
  readonly forme: 'colonnes';
  readonly saisie: 'pave';
  readonly operateur: '+';
  readonly haut: number;
  readonly bas: number;
}

export type EtapeCalcul = EtapeLigne | EtapeColonnes;

export type ActionCalcul =
  | { readonly type: 'chiffre'; readonly chiffre: number }
  | { readonly type: 'choix'; readonly valeur: number }
  | { readonly type: 'aide' };

export type TypeRetourCalcul = 'juste' | 'pas-encore' | 'retenue-posee' | 'etape-reussie' | 'partie-reussie' | 'aide';

export interface RetourCalcul {
  readonly type: TypeRetourCalcul;
  /** Numéro du geste qui l'a produit : deux retours identiques restent distincts. */
  readonly marque: number;
}

export interface EtatCalcul {
  readonly activite: ActiviteCalcul;
  readonly graine: number;
  readonly etapes: readonly EtapeCalcul[];
  readonly index: number;
  /** Les cases remplies de l'étape courante : id → chiffre. */
  readonly saisies: Readonly<Record<string, number>>;
  /** Les réponses déjà touchées à tort, à l'étape courante (aux niveaux à choisir). */
  readonly choixEssayes: readonly number[];
  readonly erreursCase: number;
  readonly erreursTotal: number;
  readonly aideEtape: NiveauAide;
  /** Le plus haut palier d'aide de la partie : monotone, il ne sert qu'aux étoiles. */
  readonly aidePartie: NiveauAide;
  readonly retour: RetourCalcul | null;
  readonly marque: number;
  readonly terminee: boolean;
}

// ── Génération ────────────────────────────────────────────────────────────────────────────

const unites = (n: number): number => n % 10;
const dizaines = (n: number): number => Math.floor(n / 10) % 10;

function chiffresDe(n: number): readonly number[] {
  return [...String(n)].map(Number);
}

/** Cases d'un trou en ligne : de gauche à droite, dans l'ordre où le nombre s'écrit. */
function casesLigne(reponse: number): readonly CaseCalcul[] {
  return chiffresDe(reponse).map((chiffre, rang) => ({
    id: `trou-${String(rang)}`, attendu: chiffre, role: 'chiffre', colonne: null, auto: false,
  }));
}

/** Trois réponses distinctes et positives, dont la bonne, dans un ordre tiré. */
function choixAutour(reponse: number, alea: Alea): readonly number[] {
  const voisins = [reponse - 2, reponse - 1, reponse + 1, reponse + 2, reponse + 10]
    .filter((n) => n >= 0 && n !== reponse);
  const pris = alea.melanger(voisins).slice(0, 2);
  return alea.melanger([reponse, ...pris]);
}

function ligne(palier: PalierCalcul, operateur: '+' | '-', termes: readonly [number, number, number],
  trou: 0 | 1 | 2, alea: Alea): EtapeLigne {
  const reponse = termes[trou];
  const saisie = PALIERS_CALCUL[palier].saisie;
  const montre = termes.map((t, i) => (i === trou ? '?' : String(t)));
  return {
    forme: 'ligne', palier, saisie, operateur, termes, trou, reponse,
    id: `${palier}:${montre[0]!}${operateur}${montre[1]!}=${montre[2]!}`,
    cases: casesLigne(reponse),
    choix: saisie === 'choix' ? choixAutour(reponse, alea) : null,
  };
}

function genererTables(alea: Alea): EtapeLigne {
  const a = alea.entier(2, 10);
  const b = alea.entier(2, 10);
  const forme = alea.entier(0, 3);
  if (forme === 0) return ligne('gue-tables', '+', [a, b, a + b], 2, alea);
  if (forme === 1) return ligne('gue-tables', '+', [a, b, a + b], 1, alea);
  return ligne('gue-tables', '-', [a + b, a, b], 2, alea);
}

function genererDizaines(alea: Alea): EtapeLigne {
  if (alea.entier(0, 2) === 0) {
    // a + k dizaines ≤ 99 : la dizaine de a va de 1 à 8.
    const a = alea.entier(1, 9) * 10 + alea.entier(0, 10);
    const k = alea.entier(1, 10 - dizaines(a));
    return ligne('gue-dizaines', '+', [a, k * 10, a + k * 10], 2, alea);
  }
  // a − k dizaines ≥ 10 : la dizaine de a va de 2 à 9.
  const a = alea.entier(2, 10) * 10 + alea.entier(0, 10);
  const k = alea.entier(1, dizaines(a));
  return ligne('gue-dizaines', '-', [a, k * 10, a - k * 10], 2, alea);
}

function genererNeuf(alea: Alea): EtapeLigne {
  const sorte = alea.entier(0, 3);
  if (sorte === 0) {
    // a + 9 avec passage : unités de a ≥ 1 ; a + 9 ≤ 99 → a ≤ 90.
    const a = alea.entier(1, 9) * 10 + alea.entier(1, 10);
    return ligne('gue-neuf', '+', [a, 9, a + 9], 2, alea);
  }
  if (sorte === 1) {
    // a + 19 avec passage : unités ≥ 1 ; a + 19 ≤ 99 → a ≤ 80.
    const a = alea.entier(1, 8) * 10 + alea.entier(1, 10);
    return ligne('gue-neuf', '+', [a, 19, a + 19], 2, alea);
  }
  // a − 9 avec passage : unités de a ≤ 8 ; a − 9 ≥ 10 → dizaine de a ≥ 2.
  const a = alea.entier(2, 10) * 10 + alea.entier(0, 9);
  return ligne('gue-neuf', '-', [a, 9, a - 9], 2, alea);
}

function colonnes(palier: PalierCalcul, haut: number, bas: number): EtapeColonnes {
  const somme = haut + bas;
  const retenue = unites(haut) + unites(bas) >= 10;
  const cases: CaseCalcul[] = [{ id: 'resultat-u', attendu: unites(somme), role: 'chiffre', colonne: 'u', auto: false }];
  if (retenue) cases.push({ id: 'retenue-d', attendu: 1, role: 'retenue', colonne: 'd', auto: true });
  cases.push({ id: 'resultat-d', attendu: dizaines(somme), role: 'chiffre', colonne: 'd', auto: false });
  return {
    forme: 'colonnes', palier, saisie: 'pave', operateur: '+', haut, bas, reponse: somme, cases,
    id: `${palier}:${String(haut)}+${String(bas)}`,
  };
}

function genererPoseSansRetenue(alea: Alea): EtapeColonnes {
  const da = alea.entier(1, 9);
  const db = alea.entier(1, 10 - da);
  const ua = alea.entier(0, 10);
  const ub = alea.entier(0, 10 - ua);
  const x = da * 10 + ua;
  const y = db * 10 + ub;
  return colonnes('pose-sans-retenue', Math.max(x, y), Math.min(x, y));
}

function genererPoseRetenue(alea: Alea): EtapeColonnes {
  // Dizaines : da + db + 1 ≤ 9 ; unités : ua + ub ≥ 10.
  const da = alea.entier(1, 8);
  const db = alea.entier(1, 9 - da);
  const ua = alea.entier(1, 10);
  const ub = alea.entier(10 - ua, 10);
  const x = da * 10 + ua;
  const y = db * 10 + ub;
  return colonnes('pose-retenue-montree', Math.max(x, y), Math.min(x, y));
}

export function genererEtape(palier: PalierCalcul, alea: Alea): EtapeCalcul {
  switch (palier) {
    case 'gue-tables': return genererTables(alea);
    case 'gue-dizaines': return genererDizaines(alea);
    case 'gue-neuf': return genererNeuf(alea);
    case 'pose-sans-retenue': return genererPoseSansRetenue(alea);
    case 'pose-retenue-montree': return genererPoseRetenue(alea);
  }
}

/**
 * LE PARCOURS D'UNE PARTIE — premier jet, à revoir après l'essai avec l'enfant.
 * Le gué : 12 pierres (le seuil de fluence de fin de CE1, réf. 1.3 CE1 tables), qui montent
 * des tables à choisir vers le pavé. La pierre : 4 additions, sans retenue puis avec.
 */
export const PARCOURS_CALCUL: Readonly<Record<ActiviteCalcul, readonly PalierCalcul[]>> = {
  gue: [
    'gue-tables', 'gue-tables', 'gue-tables', 'gue-tables', 'gue-tables',
    'gue-dizaines', 'gue-dizaines', 'gue-dizaines', 'gue-dizaines',
    'gue-neuf', 'gue-neuf', 'gue-neuf',
  ],
  pose: ['pose-sans-retenue', 'pose-sans-retenue', 'pose-retenue-montree', 'pose-retenue-montree'],
};

const ESSAIS_SANS_DOUBLON = 50;

export function creerPartieCalcul(activite: ActiviteCalcul, alea: Alea): EtatCalcul {
  const vus = new Set<string>();
  const etapes = PARCOURS_CALCUL[activite].map((palier) => {
    let etape = genererEtape(palier, alea);
    for (let essai = 0; essai < ESSAIS_SANS_DOUBLON && vus.has(etape.id); essai += 1) etape = genererEtape(palier, alea);
    vus.add(etape.id);
    return etape;
  });
  return {
    activite, graine: alea.graine, etapes, index: 0, saisies: {}, choixEssayes: [],
    erreursCase: 0, erreursTotal: 0, aideEtape: 'aucune', aidePartie: 'aucune',
    retour: null, marque: 0, terminee: false,
  };
}

// ── Le jeu ────────────────────────────────────────────────────────────────────────────────

export function etapeCourante(etat: EtatCalcul): EtapeCalcul | null {
  return etat.terminee ? null : etat.etapes[etat.index] ?? null;
}

/** La case que l'enfant remplit maintenant (jamais une case automatique). */
export function caseCourante(etat: EtatCalcul): CaseCalcul | null {
  const etape = etapeCourante(etat);
  if (etape === null) return null;
  return etape.cases.find((c) => !c.auto && etat.saisies[c.id] === undefined) ?? null;
}

const RANG_AIDE: Readonly<Record<NiveauAide, number>> = { aucune: 0, indice: 1, demonstration: 2 };
const plusHaute = (a: NiveauAide, b: NiveauAide): NiveauAide => (RANG_AIDE[a] >= RANG_AIDE[b] ? a : b);
const aideApres = (aide: NiveauAide): NiveauAide => (aide === 'aucune' ? 'indice' : 'demonstration');

/** Aide automatique : indice après 2 erreurs sur la même case, démonstration après 3 (§ 3.0). */
function aideAutomatique(erreurs: number): NiveauAide {
  return erreurs >= 3 ? 'demonstration' : erreurs >= 2 ? 'indice' : 'aucune';
}

function refuser(etat: EtatCalcul, marque: number, choix: number | null): EtatCalcul {
  const erreursCase = etat.erreursCase + 1;
  const aideEtape = plusHaute(etat.aideEtape, aideAutomatique(erreursCase));
  return {
    ...etat, marque, erreursCase, erreursTotal: etat.erreursTotal + 1, aideEtape,
    aidePartie: plusHaute(etat.aidePartie, aideEtape),
    choixEssayes: choix === null || etat.choixEssayes.includes(choix) ? etat.choixEssayes : [...etat.choixEssayes, choix],
    retour: { type: 'pas-encore', marque },
  };
}

/** Pose les cases automatiques qui suivent, puis passe à l'étape suivante si tout est rempli. */
function avancer(etat: EtatCalcul, saisies: Record<string, number>, marque: number): EtatCalcul {
  const etape = etat.etapes[etat.index]!;
  let retenue = false;
  for (const c of etape.cases) {
    if (saisies[c.id] !== undefined) continue;
    if (!c.auto) break;
    saisies[c.id] = c.attendu;
    retenue = true;
  }
  const complete = etape.cases.every((c) => saisies[c.id] !== undefined);
  if (!complete) {
    return { ...etat, marque, saisies, erreursCase: 0, retour: { type: retenue ? 'retenue-posee' : 'juste', marque } };
  }
  const derniere = etat.index === etat.etapes.length - 1;
  if (derniere) {
    return { ...etat, marque, saisies, erreursCase: 0, terminee: true, retour: { type: 'partie-reussie', marque } };
  }
  return {
    ...etat, marque, index: etat.index + 1, saisies: {}, choixEssayes: [], erreursCase: 0,
    aideEtape: 'aucune', retour: { type: 'etape-reussie', marque },
  };
}

export function jouerCalcul(etat: EtatCalcul, action: ActionCalcul): EtatCalcul {
  if (etat.terminee) return etat;
  const etape = etat.etapes[etat.index]!;
  const marque = etat.marque + 1;
  switch (action.type) {
    case 'aide': {
      const aideEtape = aideApres(etat.aideEtape);
      return { ...etat, marque, aideEtape, aidePartie: plusHaute(etat.aidePartie, aideEtape), retour: { type: 'aide', marque } };
    }
    case 'chiffre': {
      const cible = caseCourante(etat);
      if (cible === null) return etat;
      if (action.chiffre !== cible.attendu) return refuser(etat, marque, null);
      return avancer(etat, { ...etat.saisies, [cible.id]: cible.attendu }, marque);
    }
    case 'choix': {
      if (etape.forme !== 'ligne' || etape.choix === null || !etape.choix.includes(action.valeur)) return etat;
      if (action.valeur !== etape.reponse) return refuser(etat, marque, action.valeur);
      const saisies: Record<string, number> = { ...etat.saisies };
      for (const c of etape.cases) saisies[c.id] = c.attendu;
      return avancer(etat, saisies, marque);
    }
  }
}

/** Barème `1 + sans aide + sans erreur` (§ 3.0). Une partie finie vaut au moins une étoile. */
export function etoilesCalcul(etat: EtatCalcul): 1 | 2 | 3 {
  return (1 + (etat.aidePartie === 'aucune' ? 1 : 0) + (etat.erreursTotal === 0 ? 1 : 0)) as 1 | 2 | 3;
}

// ── Ce que dit Gobi ───────────────────────────────────────────────────────────────────────

export interface PhraseCalcul {
  readonly cle: string;
  readonly texte: string;
}

/**
 * Les phrases entières de Gobi, chacune avec sa clé de clip (aucune n'est enregistrée au
 * 9 octobre : `BoutonEcouter` les masque tant qu'aucun clip n'existe, D42). Aucune ne dit
 * « non », « faux » ni « erreur » ; aucun nombre n'y est assemblé (refus du 26 septembre).
 */
export const PHRASES_CALCUL = {
  entree: { cle: 'maths-calcul/entree', texte: 'Choisis : la rivière ou la pierre à calcul.' },
  consigneGue: { cle: 'maths-calcul/consigne-gue', texte: 'Trouve le nombre qui manque. À chaque calcul, Gobi avance d’une pierre.' },
  consignePose: { cle: 'maths-calcul/consigne-pose', texte: 'Calcule sur la pierre. Commence par la colonne des unités.' },
  pasEncoreChiffre: { cle: 'maths-calcul/pas-encore-chiffre', texte: 'Pas encore. Essaie un autre chiffre.' },
  pasEncoreNombre: { cle: 'maths-calcul/pas-encore-nombre', texte: 'Pas encore. Essaie un autre nombre.' },
  pasEncoreUnites: { cle: 'maths-calcul/pas-encore-unites', texte: 'Pas encore. Regarde la colonne des unités.' },
  pasEncoreDizaines: { cle: 'maths-calcul/pas-encore-dizaines', texte: 'Pas encore. Regarde la colonne des dizaines.' },
  retenue: { cle: 'maths-calcul/retenue', texte: 'Dix unités font une dizaine. Je pose la retenue en haut.' },
  bravoGue: { cle: 'maths-calcul/bravo-gue', texte: 'Bravo ! Gobi avance d’une pierre.' },
  bravoPose: { cle: 'maths-calcul/bravo-pose', texte: 'Bravo ! Ce calcul est juste.' },
  finGue: { cle: 'maths-calcul/fin-gue', texte: 'Bravo ! Gobi a traversé la rivière.' },
  finPose: { cle: 'maths-calcul/fin-pose', texte: 'Bravo ! Toute la pierre est remplie.' },
  indiceSomme: { cle: 'maths-calcul/indice-somme', texte: 'Compte à partir du plus grand nombre.' },
  indiceTerme: { cle: 'maths-calcul/indice-terme', texte: 'Cherche ce qu’il faut ajouter pour arriver au bout.' },
  indiceDifference: { cle: 'maths-calcul/indice-difference', texte: 'Compte en reculant.' },
  indiceDizaines: { cle: 'maths-calcul/indice-dizaines', texte: 'Compte les dizaines.' },
  indicePlusNeuf: { cle: 'maths-calcul/indice-plus-neuf', texte: 'Ajoute dix, puis enlève un.' },
  indicePlusDixNeuf: { cle: 'maths-calcul/indice-plus-dix-neuf', texte: 'Ajoute vingt, puis enlève un.' },
  indiceMoinsNeuf: { cle: 'maths-calcul/indice-moins-neuf', texte: 'Enlève dix, puis ajoute un.' },
  montreTouche: { cle: 'maths-calcul/montre-touche', texte: 'Regarde : la bonne touche brille.' },
  montreChoix: { cle: 'maths-calcul/montre-choix', texte: 'Regarde : la bonne réponse brille.' },
} as const satisfies Readonly<Record<string, PhraseCalcul>>;

const NOMS_CHIFFRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'] as const;

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

/** Le fait d'une colonne, en une phrase entière : « Cinq plus sept. » (§ 3.2, palier 1). */
function phraseFait(a: number, b: number, retenue: boolean): PhraseCalcul {
  const texte = `${majuscule(NOMS_CHIFFRES[a]!)} plus ${NOMS_CHIFFRES[b]!}${retenue ? ', plus la retenue.' : '.'}`;
  return { cle: `maths-calcul/fait/${String(a)}+${String(b)}${retenue ? '+r' : ''}`, texte };
}

/** Les 200 indices de colonne : faits de 0 à 9, avec et sans retenue. Liste finie, à enregistrer. */
export function phrasesIndicesPose(): readonly PhraseCalcul[] {
  const phrases: PhraseCalcul[] = [];
  for (const retenue of [false, true]) {
    for (let a = 0; a <= 9; a += 1) for (let b = 0; b <= 9; b += 1) phrases.push(phraseFait(a, b, retenue));
  }
  return phrases;
}

export interface AideCalcul {
  readonly niveau: Exclude<NiveauAide, 'aucune'>;
  readonly texte: string;
  readonly cle: string;
  /** Démonstration au pavé : le chiffre dont la touche s'allume. */
  readonly toucheMontree: number | null;
  /** Démonstration aux choix : la réponse qui s'allume. */
  readonly choixMontre: number | null;
}

function indiceDe(etape: EtapeCalcul, cible: CaseCalcul): PhraseCalcul {
  if (etape.forme === 'colonnes') {
    if (cible.colonne === 'u') return phraseFait(unites(etape.haut), unites(etape.bas), false);
    return phraseFait(dizaines(etape.haut), dizaines(etape.bas), etape.cases.some((c) => c.role === 'retenue'));
  }
  switch (etape.palier) {
    case 'gue-dizaines': return PHRASES_CALCUL.indiceDizaines;
    case 'gue-neuf':
      return etape.operateur === '-' ? PHRASES_CALCUL.indiceMoinsNeuf
        : etape.termes[1] === 19 ? PHRASES_CALCUL.indicePlusDixNeuf : PHRASES_CALCUL.indicePlusNeuf;
    default:
      return etape.operateur === '-' ? PHRASES_CALCUL.indiceDifference
        : etape.trou === 1 ? PHRASES_CALCUL.indiceTerme : PHRASES_CALCUL.indiceSomme;
  }
}

/** L'aide de l'étape courante, ou `null` tant que personne ne l'a déclenchée. */
export function aideCalcul(etat: EtatCalcul): AideCalcul | null {
  if (etat.aideEtape === 'aucune') return null;
  const etape = etapeCourante(etat);
  const cible = caseCourante(etat);
  if (etape === null || cible === null) return null;
  if (etat.aideEtape === 'indice') {
    const phrase = indiceDe(etape, cible);
    return { niveau: 'indice', texte: phrase.texte, cle: phrase.cle, toucheMontree: null, choixMontre: null };
  }
  const aChoisir = etape.forme === 'ligne' && etape.choix !== null && Object.keys(etat.saisies).length === 0;
  const phrase = aChoisir ? PHRASES_CALCUL.montreChoix : PHRASES_CALCUL.montreTouche;
  return {
    niveau: 'demonstration', texte: phrase.texte, cle: phrase.cle,
    toucheMontree: aChoisir ? null : cible.attendu,
    choixMontre: aChoisir ? etape.reponse : null,
  };
}

/** Ce que Gobi dit après le dernier geste (le retour), ou `null`. */
export function phraseDuRetour(etat: EtatCalcul): PhraseCalcul | null {
  const retour = etat.retour;
  if (retour === null) return null;
  const gue = etat.activite === 'gue';
  switch (retour.type) {
    case 'retenue-posee': return PHRASES_CALCUL.retenue;
    case 'etape-reussie': return gue ? PHRASES_CALCUL.bravoGue : PHRASES_CALCUL.bravoPose;
    case 'partie-reussie': return gue ? PHRASES_CALCUL.finGue : PHRASES_CALCUL.finPose;
    case 'pas-encore': {
      const etape = etapeCourante(etat);
      const cible = caseCourante(etat);
      if (etape === null || cible === null) return null;
      if (etape.forme === 'colonnes') return cible.colonne === 'u' ? PHRASES_CALCUL.pasEncoreUnites : PHRASES_CALCUL.pasEncoreDizaines;
      return etat.choixEssayes.length > 0 ? PHRASES_CALCUL.pasEncoreNombre : PHRASES_CALCUL.pasEncoreChiffre;
    }
    case 'juste':
    case 'aide':
      return null;
  }
}
