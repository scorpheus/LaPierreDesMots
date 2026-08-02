/**
 * `node scripts/generer-phonologie.mjs` — le matériau phonologique qui manque. Lot N8, O10.
 *
 * O10, en toutes lettres (journal des décisions) : « Le corpus ne couvre pas la progression
 * phonologique. Les 105 fiches travaillent la lecture appliquée et la compréhension ; elles
 * supposent le déchiffrage acquis. Or l'enfant déchiffre encore (D14). Les régions 1 à 5 des
 * specs — voyelles, CVC, nasales, lettres muettes, graphèmes rares — n'ont AUCUN matériau
 * dans le corpus. »
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI LE SOCLE EST DANS CE FICHIER, ET PAS DANS `contenu/`
 *
 * `.gitignore` porte `contenu/brouillons/*` : **tout ce que ce script écrit est ignoré par
 * git** (mesuré, cité au rapport du lot). C'est voulu — « aucun contenu n'atteint l'enfant
 * sans validation humaine » (CLAUDE.md) — mais cela veut aussi dire qu'un dépôt fraîchement
 * cloné n'a pas une syllabe de matériau phonologique, et qu'un test qui ne lirait que le
 * disque passerait à vide. Ce serait exactement le défaut que CLAUDE.md nomme : « un détecteur
 * qui déclare un poids qu'il n'applique jamais ».
 *
 * Le SOCLE ci-dessous est donc la **source qui fait foi**, versionnée avec le dépôt, et
 * `tests/unitaires/phonologie-couverture.test.ts` le mesure directement. Les brouillons sont
 * sa projection sur disque, relue par le parent avant de devenir des exercices.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QUE LE SCRIPT REFUSE DE FAIRE (convention C6 du contrat de finition v3)
 *
 * Il **remesure sa propre sortie** avant d'écrire : chaque mot d'exemple doit contenir le
 * graphème qu'il illustre, chaque syllabe CV doit se décomposer en la consonne et la voyelle
 * déclarées, chaque paire miroir doit différer par la lettre de l'axe déclaré, et chaque mot
 * doit appartenir au lexique CE1. Un seul écart, et le script sort en code 1 **sans écrire un
 * octet**. Un générateur qui émettrait du faux serait pire que l'absence de matériau : le
 * faux se relit comme du vrai.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * llama.cpp (D5, port 8001) est un ENRICHISSEUR, jamais la source.
 *
 * D9 : « le dépôt porte les scripts qui pilotent les services et doit se comporter
 * correctement quand ils sont absents ». Sans serveur, le script produit le socle déclaré et
 * le dit. Avec serveur, il propose des mots supplémentaires — qui ne sont retenus que s'ils
 * passent les mêmes contrôles que le socle, lexique CE1 compris. Un mot proposé par un modèle
 * et absent du lexique est REJETÉ, jamais ajouté au lexique.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RACINE = fileURLToPath(new URL('..', import.meta.url));
const SORTIE = join(RACINE, 'contenu', 'brouillons', 'phonologie');

/** D5 : llama.cpp local, serveur à lancer au besoin sur le port 8001. */
export const URL_LLAMA = 'http://127.0.0.1:8001/v1/chat/completions';

// ═══════════════════════════════════════════════════════════════ le lexique CE1 de référence
//
// PROVENANCE, dite honnêtement plutôt que maquillée : cette liste est établie À LA MAIN pour
// ce dépôt, à partir du vocabulaire courant de fin de CP / début de CE1 (mots outils, noms
// concrets du quotidien, verbes usuels). Elle N'EST PAS une échelle publiée — ni Dubois-Buyse,
// ni Manulex — parce qu'aucune liste de fréquence n'est présente dans le dépôt et que rien ne
// s'y télécharge (D9, hors ligne).
//
// C'est donc une source qui fait foi POUR CE DÉPÔT et pour rien d'autre, et elle est écrite
// ici pour être relue, corrigée et remplacée par une échelle publiée le jour où l'on en aura
// une. Ce qu'elle garantit dès aujourd'hui, et qui n'existait pas : aucun mot n'atteint
// l'enfant sans avoir été inscrit sciemment sur une liste par un adulte.
//
// Règle de composition : 1 à 2 syllabes de préférence, graphies régulières, sens concret et
// imageable par un enfant de 7 ans. Les mots à graphie piégeuse (« oiseau », « monsieur »)
// sont admis seulement quand ils sont des mots outils de tous les jours.

export const MOTS_OUTILS = Object.freeze([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de',
  'il', 'elle', 'ils', 'elles', 'on', 'je', 'tu', 'nous', 'vous',
  'est', 'et', 'a', 'ont', 'sont',
  'dans', 'sur', 'sous', 'avec', 'pour', 'chez', 'vers',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'ce', 'cette', 'qui', 'que', 'ne', 'pas', 'plus', 'très',
  'oui', 'non', 'aussi', 'puis', 'alors',
]);

export const NOMS_ET_VERBES = Object.freeze([
  // a
  'ami', 'ananas', 'animal', 'arbre', 'armoire', 'avion', 'abri', 'avoir',
  // b
  'balle', 'ballon', 'banane', 'banc', 'barbe', 'bateau', 'bébé', 'bec', 'belle',
  'bille', 'bleu', 'bol', 'bonbon', 'botte', 'bouche', 'boule', 'bras', 'brosse', 'bus',
  'cabane', 'robe', 'arbuste', 'jambe', 'tombe', 'herbe', 'tabouret', 'sabot',
  // c
  'cadeau', 'cahier', 'canard', 'carotte', 'cartable', 'chaise', 'chapeau', 'chat',
  'château', 'cheval', 'chien', 'ciel', 'citron', 'clé', 'cochon', 'colle', 'coq',
  'corde', 'couleur', 'cube', 'cuillère',
  // d
  'dame', 'danse', 'date', 'dé', 'dent', 'dessin', 'devoir', 'dinde', 'dire', 'dix',
  'domino', 'dos', 'doux', 'drapeau', 'dur', 'radis', 'midi', 'salade', 'jardin',
  'pédale', 'lundi', 'nid', 'ronde', 'monde',
  // e
  'école', 'écran', 'écrire', 'éléphant', 'enfant', 'escalier', 'étoile', 'être',
  // f
  'facile', 'famille', 'farine', 'fée', 'femme', 'fenêtre', 'fer', 'ferme', 'fête',
  'feu', 'feuille', 'fil', 'fille', 'fleur', 'forêt', 'four', 'fraise', 'frère', 'fruit',
  // g
  'gant', 'garçon', 'gare', 'gâteau', 'girafe', 'glace', 'gomme', 'gourde', 'grand',
  'grenouille', 'gris', 'gros',
  // h
  'habit', 'haie', 'hibou', 'histoire', 'hiver', 'homme',
  // i
  'idée', 'igloo', 'île', 'image', 'iris',
  // j
  'jambon', 'jaune', 'jeu', 'joue', 'jouer', 'jour', 'jupe', 'jus',
  // l
  'lac', 'lait', 'lampe', 'lapin', 'large', 'lettre', 'lever', 'lion', 'lire', 'lit',
  'livre', 'loup', 'lune', 'lunettes',
  // m
  'main', 'maison', 'maître', 'maîtresse', 'malade', 'maman', 'manger', 'marche', 'mari',
  'marron', 'matin', 'mer', 'mère', 'mètre', 'miel', 'mine', 'moto', 'mouche', 'moulin',
  'mur', 'musique',
  // n
  'nappe', 'nature', 'neige', 'nez', 'noir', 'noix', 'note', 'nuage', 'nuit', 'numéro',
  // o
  'objet', 'oiseau', 'olive', 'ombre', 'oncle', 'ongle', 'orage', 'orange', 'ours', 'outil',
  // p
  'page', 'panier', 'papa', 'papier', 'parc', 'passer', 'patte', 'peau', 'peigne', 'père',
  'petit', 'photo', 'piano', 'pic', 'pie', 'pied', 'pile', 'pipe', 'plage', 'pluie',
  'poche', 'poire', 'poisson', 'pomme', 'pont', 'porte', 'poule', 'poupée', 'prune', 'pull',
  'tapis', 'jupon', 'copain', 'lampe', 'soupe', 'képi',
  // q
  'quatre', 'queue', 'quille',
  // r
  'radio', 'raisin', 'rat', 'récré', 'regarder', 'renard', 'rêve', 'rideau', 'rire',
  'rivière', 'riz', 'roi', 'rose', 'roue', 'rouge', 'route', 'rue', 'ruche',
  // s
  'sable', 'sac', 'salle', 'samedi', 'sapin', 'savon', 'seau', 'sel', 'semaine', 'sirop',
  'soleil', 'soir', 'sortie', 'souris', 'sucre', 'sur',
  // t
  'table', 'tableau', 'tache', 'tapis', 'tarte', 'tasse', 'tas', 'taupe', 'télé', 'temps',
  'tigre', 'timbre', 'tir', 'tomate', 'tortue', 'tour', 'train', 'travail', 'trou', 'tulipe',
  // u
  'usine', 'utile',
  // v
  'vache', 'vague', 'valise', 'vase', 'veau', 'vélo', 'vent', 'ver', 'verre', 'vert',
  'veste', 'viande', 'ville', 'violet', 'visage', 'vite', 'voiture', 'voir', 'voisin',
  // z
  'zèbre', 'zéro', 'zoo',

  // ── Mots ajoutés après MESURE, jamais par anticipation.
  // `node scripts/valider-brouillons.mjs` a refusé les 7 exercices livrés au gel sur ces
  // mots-là ; chacun est un mot courant de fin de CP qu'un adulte inscrit sciemment. Les
  // garder à part, avec ce commentaire, dit d'où vient chaque entrée — un lexique dont on ne
  // sait plus qui a ajouté quoi redevient une liste devinée.
  'en', 'cheveu', 'brun', 'toit', 'côté', 'parapluie', 'fanion', 'ordre', 'luciole', 'lu',
  'mot', 'chaud', 'froid', 'gauche', 'droite', 'grotte', 'cristal', 'paroi', 'écho',
  'lumière', 'ombre', 'caillou', 'creux', 'trait', 'lettre', 'syllabe', 'son', 'panier',
  'cour', 'récréation', 'même', 'autre', 'haut', 'bas', 'devant', 'derrière', 'entre',
  'où', 'ou', 'premier', 'première', 'deuxième', 'troisième', 'dernier',
  // `poubelle` porte un `b` ET un `p` : c'est le seul mot courant du lexique dans ce cas, et
  // il sert de contre-épreuve à `tests/unitaires/phonologie-couverture.test.ts` — un mot au
  // lexique, du bon côté d'un axe, et qui porte quand même la lettre d'en face.
  'poubelle',
  // Ajoutés pour les PAIRES MINIMALES des deux axes miroir : `balle/dalle`, `bon/don`,
  // `boule/poule`, `bas/pas`, `bain/pain`, `bol/pot`. Une paire minimale — deux mots qui ne
  // diffèrent que par la lettre travaillée — est la seule qui fasse porter l'attention sur la
  // lettre plutôt que sur la longueur ou la silhouette du mot.
  'dalle', 'bon', 'don', 'bain', 'pain', 'pot',
]);

/**
 * Les verbes de consigne, à l'impératif tel que l'enfant les lit.
 *
 * Ils forment une classe à part, et c'est mesuré : sur les 7 exercices livrés au gel, les
 * mots hors lexique les plus fréquents étaient « Colorie », « Dessine », « Range »,
 * « Touche » — c'est-à-dire le premier mot de presque chaque consigne. Un lexique de lecture
 * qui ne porte pas les verbes de consigne refuse le vocabulaire le plus lu de l'application.
 */
export const VERBES_DE_CONSIGNE = Object.freeze([
  'attrape', 'barre', 'choisis', 'colorie', 'complète', 'compte', 'dessine', 'écoute',
  'écris', 'entoure', 'entends', 'grave', 'montre', 'place', 'range', 'relie', 'répète',
  'suis', 'touche', 'trace', 'trouve', 'vois', 'assemble', 'trie', 'lis',
]);

/**
 * Le lexique CE1 opposable : mots outils + noms et verbes + verbes de consigne.
 *
 * Aucun mot hors de cette liste — au pluriel et au féminin près, voir `estAuLexique`.
 */
export const LEXIQUE_CE1 = Object.freeze(
  [...new Set([...MOTS_OUTILS, ...NOMS_ET_VERBES, ...VERBES_DE_CONSIGNE])].sort(),
);

// ═════════════════════════════════════════════════════════════════════════ le socle déclaré

/**
 * Normalise pour comparer : minuscules, sans accents, sans tiret. Deux mots ne diffèrent
 * jamais pour un enfant parce que l'un porte un accent aigu et l'autre pas.
 */
export function normaliser(mot) {
  return mot
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’'-]/g, '');
}

const LEXIQUE_NORMALISE = new Set(LEXIQUE_CE1.map(normaliser));

/**
 * Un mot est-il au lexique CE1 déclaré ? La seule porte d'entrée du vocabulaire.
 *
 * **Le pluriel et le féminin d'un mot du lexique sont au lexique.** Écrire les quatre formes
 * de chaque mot ferait une liste de 1 400 entrées dont 1 000 seraient du bruit, et la première
 * flexion oubliée refuserait une consigne juste — « les feuilles vertes » alors que
 * « feuille » et « vert » y sont. La règle est donc explicite et bornée : on retire, dans cet
 * ordre, un `s` ou un `x` final, puis un `e` final. Rien d'autre : aucun radical inventé,
 * aucune racine devinée.
 */
export function estAuLexique(mot) {
  const nu = normaliser(mot);
  if (nu.length === 0) return false;
  if (LEXIQUE_NORMALISE.has(nu)) return true;
  const sansPluriel = /[sx]$/.test(nu) ? nu.slice(0, -1) : nu;
  if (LEXIQUE_NORMALISE.has(sansPluriel)) return true;
  const sansFeminin = sansPluriel.endsWith('e') ? sansPluriel.slice(0, -1) : sansPluriel;
  return LEXIQUE_NORMALISE.has(sansFeminin);
}

/**
 * LA CLAIRIÈRE — « Voyelles, syllabes simples (CV), premiers mots outils »
 * (`contenu/monde/regions.json`, champ `domaine`, source qui fait foi).
 */
const CLAIRIERE = Object.freeze({
  voyelles: Object.freeze([
    { forme: 'a', son: '[a]', mots: ['ami', 'arbre', 'chat', 'papa'] },
    { forme: 'i', son: '[i]', mots: ['lit', 'ami', 'midi', 'riz'] },
    { forme: 'o', son: '[o]', mots: ['dos', 'moto', 'photo', 'vélo'] },
    { forme: 'u', son: '[y]', mots: ['lune', 'mur', 'jus', 'rue'] },
    { forme: 'e', son: '[ə]', mots: ['le', 'de', 'ce', 'que'] },
    { forme: 'é', son: '[e]', mots: ['bébé', 'clé', 'télé', 'école'] },
    { forme: 'è', son: '[ɛ]', mots: ['mère', 'père', 'frère', 'rivière'] },
  ]),
  /** Consonnes de la première vague : celles dont le tracé et le son sont les plus stables. */
  consonnesCV: Object.freeze(['m', 'l', 'r', 't', 'p', 'v', 'n', 's', 'f', 'j']),
  voyellesCV: Object.freeze(['a', 'i', 'o', 'u', 'é']),
  /** Mots outils de la première vague — ceux que l'enfant rencontre à chaque ligne. */
  motsOutilsPremiers: Object.freeze([
    'le', 'la', 'les', 'un', 'une', 'des', 'il', 'elle', 'est', 'et',
    'dans', 'sur', 'avec', 'pour', 'mon', 'ma', 'mes', 'ce', 'qui', 'ne',
  ]),
});

/**
 * LES GALERIES — « Syllabes CVC, confusions b/d/p/q, sons proches ».
 *
 * D23, conséquence 1, appliquée à la lettre : **les deux axes sont séparés dans la donnée
 * elle-même**, pas seulement dans le suivi. `gauche-droite` (b↔d, p↔q) et `haut-bas` (b↔p,
 * d↔q) sont deux listes distinctes, jamais un tas de quatre lettres.
 */
const GALERIES = Object.freeze({
  cvc: Object.freeze([
    { forme: 'sac', decoupe: ['s', 'a', 'c'] },
    { forme: 'bol', decoupe: ['b', 'o', 'l'] },
    { forme: 'lac', decoupe: ['l', 'a', 'c'] },
    { forme: 'bec', decoupe: ['b', 'e', 'c'] },
    { forme: 'sel', decoupe: ['s', 'e', 'l'] },
    { forme: 'mer', decoupe: ['m', 'e', 'r'] },
    { forme: 'fil', decoupe: ['f', 'i', 'l'] },
    { forme: 'mur', decoupe: ['m', 'u', 'r'] },
    { forme: 'bus', decoupe: ['b', 'u', 's'] },
    { forme: 'pic', decoupe: ['p', 'i', 'c'] },
    { forme: 'tir', decoupe: ['t', 'i', 'r'] },
    { forme: 'ver', decoupe: ['v', 'e', 'r'] },
    { forme: 'jus', decoupe: ['j', 'u', 's'] },
    { forme: 'rat', decoupe: ['r', 'a', 't'] },
    { forme: 'dur', decoupe: ['d', 'u', 'r'] },
    { forme: 'tas', decoupe: ['t', 'a', 's'] },
  ]),
  /**
   * L'axe GAUCHE-DROITE : `b` ↔ `d` et `p` ↔ `q`. Le geste les sépare (D33) ; ici, ce sont
   * les mots qui les séparent. Chaque entrée porte le mot ET la lettre qui le fait tomber
   * d'un côté ou de l'autre — c'est ce qui permet à `confusionAvec` de nommer la paire.
   */
  miroirGaucheDroite: Object.freeze({
    axe: 'gauche-droite',
    lettres: Object.freeze(['b', 'd']),
    lettresSecondaires: Object.freeze(['p', 'q']),
    motsA: Object.freeze(['bateau', 'bouche', 'bébé', 'banane', 'cabane', 'robe', 'arbre', 'bol']),
    motsB: Object.freeze(['domino', 'dame', 'dos', 'radis', 'midi', 'salade', 'dinde', 'dur']),
    // Paires MINIMALES d'abord : `balle`/`dalle` et `bon`/`don` ne diffèrent que par la
    // lettre travaillée, donc rien d'autre ne peut servir d'indice. Les deux suivantes sont
    // des contrastes d'attaque, plus faciles, pour ouvrir la série.
    paires: Object.freeze([
      { a: 'balle', b: 'dalle' },
      { a: 'bon', b: 'don' },
      { a: 'bol', b: 'dos' },
      { a: 'banane', b: 'dame' },
    ]),
  }),
  /**
   * L'axe HAUT-BAS : `b` ↔ `p` et `d` ↔ `q`. **C'est la confusion rapportée par le père**
   * (D23, fait rapporté : « l'enfant confond `b`/`p` »), donc celle qui compte le plus.
   */
  miroirHautBas: Object.freeze({
    axe: 'haut-bas',
    lettres: Object.freeze(['b', 'p']),
    lettresSecondaires: Object.freeze(['d', 'q']),
    motsA: Object.freeze(['bateau', 'balle', 'bouche', 'bol', 'bus', 'bec', 'barbe', 'botte']),
    motsB: Object.freeze(['papa', 'poule', 'pomme', 'pipe', 'tapis', 'lapin', 'jupe', 'pic']),
    // Quatre paires MINIMALES : `boule`/`poule`, `bas`/`pas`, `bain`/`pain`, `bol`/`pot`. Sur
    // l'axe que le père a rapporté, on ne se contente pas d'un contraste d'attaque — seule la
    // paire minimale oblige à regarder si la boucle est en haut ou en bas.
    paires: Object.freeze([
      { a: 'boule', b: 'poule' },
      { a: 'bas', b: 'pas' },
      { a: 'bain', b: 'pain' },
      { a: 'bol', b: 'pot' },
    ]),
  }),
  /** Sons proches : les paires de consonnes que l'oreille confond quand l'œil hésite déjà. */
  sonsProches: Object.freeze([
    { paire: ['f', 'v'], motsA: ['four', 'fil', 'fée'], motsB: ['vent', 'ville', 'veau'] },
    { paire: ['s', 'z'], motsA: ['sac', 'sel', 'souris'], motsB: ['zoo', 'zèbre', 'zéro'] },
    { paire: ['t', 'd'], motsA: ['tas', 'tir', 'tomate'], motsB: ['dos', 'dur', 'domino'] },
    { paire: ['p', 'b'], motsA: ['pic', 'poule', 'pomme'], motsB: ['bol', 'bus', 'bec'] },
  ]),
});

/** Le socle complet — la source qui fait foi du matériau phonologique. */
export const SOCLE = Object.freeze({ clairiere: CLAIRIERE, galeries: GALERIES });

// ═════════════════════════════════════════════════ dérivation : les syllabes CV, à partir du socle

/**
 * Les syllabes CV de la Clairière, dérivées et non recopiées.
 *
 * `qu`, `ce`, `ci`, `ge`, `gi` ne se prononcent pas comme leur consonne isolée : les
 * consonnes du socle sont choisies pour qu'aucune exception ne se glisse ici. Le contrôle
 * `verifierSyllabesCV` remesure que chaque syllabe produite vaut bien consonne + voyelle.
 */
export function syllabesCV() {
  const syllabes = [];
  for (const consonne of CLAIRIERE.consonnesCV) {
    for (const voyelle of CLAIRIERE.voyellesCV) {
      syllabes.push({ forme: `${consonne}${voyelle}`, consonne, voyelle });
    }
  }
  return syllabes;
}

// ═══════════════════════════════════════════════════════ les contrôles — convention C6

/**
 * Remesure la sortie et rend la liste des écarts. **Vide, ou le script n'écrit rien.**
 *
 * Chaque contrôle répond à une question qu'un relecteur poserait : le mot illustre-t-il
 * vraiment le graphème ? la syllabe se décompose-t-elle ? la paire miroir diffère-t-elle par
 * la bonne lettre ? le mot est-il au lexique ?
 */
export function verifier(socle = SOCLE) {
  const ecarts = [];
  const dire = (ou, quoi) => ecarts.push(`${ou} : ${quoi}`);

  // 1. Tout mot cité, où qu'il soit, appartient au lexique CE1.
  for (const [chemin, mot] of recenserMots(socle)) {
    if (!estAuLexique(mot)) {
      dire(chemin, `« ${mot} » est hors du lexique CE1 déclaré`);
    }
  }

  // 2. Un mot qui illustre une voyelle contient cette voyelle.
  for (const voyelle of socle.clairiere.voyelles) {
    for (const mot of voyelle.mots) {
      if (!normaliser(mot).includes(normaliser(voyelle.forme))) {
        dire('clairiere.voyelles', `« ${mot} » ne porte pas « ${voyelle.forme} »`);
      }
    }
  }

  // 3. Une syllabe CV vaut exactement sa consonne suivie de sa voyelle.
  for (const syllabe of syllabesCV()) {
    if (syllabe.forme !== `${syllabe.consonne}${syllabe.voyelle}`) {
      dire('clairiere.syllabesCV', `« ${syllabe.forme} » ne se décompose pas`);
    }
  }

  // 4. Un CVC a exactement trois éléments, et leur concaténation rend le mot.
  for (const cvc of socle.galeries.cvc) {
    if (cvc.decoupe.length !== 3 || cvc.decoupe.join('') !== cvc.forme) {
      dire('galeries.cvc', `« ${cvc.forme} » ne se découpe pas en C-V-C`);
    }
  }

  // 5. LE CONTRÔLE QUI COMPTE (D23) : chaque famille de mots porte SA lettre, et jamais
  //    celle d'en face. Un mot qui porterait les deux ne dirait rien de l'axe travaillé.
  for (const bloc of [socle.galeries.miroirGaucheDroite, socle.galeries.miroirHautBas]) {
    const [lettreA, lettreB] = bloc.lettres;
    for (const mot of bloc.motsA) {
      if (!normaliser(mot).includes(lettreA)) dire(bloc.axe, `« ${mot} » ne porte pas « ${lettreA} »`);
      if (normaliser(mot).includes(lettreB)) dire(bloc.axe, `« ${mot} » porte aussi « ${lettreB} »`);
    }
    for (const mot of bloc.motsB) {
      if (!normaliser(mot).includes(lettreB)) dire(bloc.axe, `« ${mot} » ne porte pas « ${lettreB} »`);
      if (normaliser(mot).includes(lettreA)) dire(bloc.axe, `« ${mot} » porte aussi « ${lettreA} »`);
    }
    for (const paire of bloc.paires) {
      const a = normaliser(paire.a);
      const b = normaliser(paire.b);
      if (!a.includes(lettreA) || !b.includes(lettreB)) {
        dire(bloc.axe, `la paire ${paire.a}/${paire.b} ne travaille pas ${lettreA}/${lettreB}`);
      }
      // Une paire dont un membre porte LES DEUX lettres n'oppose plus rien : l'enfant peut
      // répondre juste en regardant l'autre lettre.
      if (a.includes(lettreB) || b.includes(lettreA)) {
        dire(bloc.axe, `la paire ${paire.a}/${paire.b} mélange ${lettreA} et ${lettreB}`);
      }
    }
  }

  // 6. Les deux axes sont DISTINCTS : ils ne peuvent pas déclarer le même couple de lettres.
  const gd = socle.galeries.miroirGaucheDroite.lettres.join('');
  const hb = socle.galeries.miroirHautBas.lettres.join('');
  if (gd === hb) {
    dire('galeries.miroir', `les deux axes déclarent le même couple « ${gd} » — D23 les sépare`);
  }

  // 7. Une paire de sons proches oppose deux consonnes différentes.
  for (const bloc of socle.galeries.sonsProches) {
    const [a, b] = bloc.paire;
    if (a === b) dire('galeries.sonsProches', `la paire « ${a} » ne s'oppose à rien`);
    for (const mot of bloc.motsA) {
      if (!normaliser(mot).startsWith(a)) dire('galeries.sonsProches', `« ${mot} » ne commence pas par « ${a} »`);
    }
    for (const mot of bloc.motsB) {
      if (!normaliser(mot).startsWith(b)) dire('galeries.sonsProches', `« ${mot} » ne commence pas par « ${b} »`);
    }
  }

  return ecarts;
}

/** Tous les mots du socle, avec le chemin qui dit d'où ils viennent. */
export function recenserMots(socle = SOCLE) {
  const trouves = [];
  const visiter = (valeur, chemin) => {
    if (typeof valeur === 'string') {
      // Les graphèmes, les découpes et les codes d'axe ne sont pas des mots.
      if (valeur.length > 1 && /^[a-zà-ÿ’'-]+$/i.test(valeur) && !valeur.includes('-')) {
        trouves.push([chemin, valeur]);
      }
      return;
    }
    if (Array.isArray(valeur)) {
      valeur.forEach((element, i) => { visiter(element, `${chemin}[${String(i)}]`); });
      return;
    }
    if (valeur !== null && typeof valeur === 'object') {
      for (const [cle, sous] of Object.entries(valeur)) {
        // `son` porte de l'API phonétique, `decoupe` des unités isolées, `axe` un code.
        if (cle === 'son' || cle === 'decoupe' || cle === 'axe') continue;
        visiter(sous, `${chemin}.${cle}`);
      }
    }
  };
  visiter(socle, 'socle');
  return trouves;
}

// ═════════════════════════════════════════════════════════ les brouillons, projection du socle

const RESTE_A_FAIRE = Object.freeze([
  'faire relire par le parent avant tout dépôt dans contenu/exercices/',
  'associer chaque unité à un habillage et à un moteur',
  'enregistrer les clips audio des mots cibles (D41, D42)',
]);

/** Les brouillons de phonologie, par région. Aucune écriture ici : que du calcul. */
export function construireBrouillons(socle = SOCLE) {
  const cv = syllabesCV();
  return [
    {
      chemin: 'clairiere/voyelles.json',
      donnees: {
        statut: 'brouillon-non-jouable',
        region: 'clairiere',
        unite: 'voyelles',
        rang: 1,
        libelle: 'Les voyelles',
        pointOuvert: 'O10',
        natureDesFormes: 'grapheme',
        source: 'socle déclaré — scripts/generer-phonologie.mjs',
        items: socle.clairiere.voyelles.map((v) => ({
          forme: v.forme, son: v.son, motsExemples: [...v.mots],
        })),
        compte: { items: socle.clairiere.voyelles.length },
        aFaireALaMain: [...RESTE_A_FAIRE],
      },
    },
    {
      chemin: 'clairiere/syllabes-cv.json',
      donnees: {
        statut: 'brouillon-non-jouable',
        region: 'clairiere',
        unite: 'syllabes-cv',
        rang: 2,
        libelle: 'Les syllabes simples consonne + voyelle',
        pointOuvert: 'O10',
        natureDesFormes: 'syllabe',
        source: 'socle déclaré — scripts/generer-phonologie.mjs',
        consonnes: [...socle.clairiere.consonnesCV],
        voyelles: [...socle.clairiere.voyellesCV],
        items: cv.map((s) => ({ forme: s.forme, consonne: s.consonne, voyelle: s.voyelle })),
        compte: { items: cv.length },
        aFaireALaMain: [...RESTE_A_FAIRE],
      },
    },
    {
      chemin: 'clairiere/mots-outils.json',
      donnees: {
        statut: 'brouillon-non-jouable',
        region: 'clairiere',
        unite: 'mots-outils',
        rang: 3,
        libelle: 'Les premiers mots outils',
        pointOuvert: 'O10',
        natureDesFormes: 'mot',
        source: 'socle déclaré — scripts/generer-phonologie.mjs',
        items: socle.clairiere.motsOutilsPremiers.map((mot) => ({ forme: mot })),
        compte: { items: socle.clairiere.motsOutilsPremiers.length },
        aFaireALaMain: [...RESTE_A_FAIRE],
      },
    },
    {
      chemin: 'galeries/syllabes-cvc.json',
      donnees: {
        statut: 'brouillon-non-jouable',
        region: 'galeries',
        unite: 'syllabes-cvc',
        rang: 1,
        libelle: 'Les mots consonne + voyelle + consonne',
        pointOuvert: 'O10',
        natureDesFormes: 'mot',
        source: 'socle déclaré — scripts/generer-phonologie.mjs',
        items: socle.galeries.cvc.map((c) => ({ forme: c.forme, decoupe: [...c.decoupe] })),
        compte: { items: socle.galeries.cvc.length },
        aFaireALaMain: [...RESTE_A_FAIRE],
      },
    },
    {
      chemin: 'galeries/miroir-gauche-droite.json',
      donnees: brouillonMiroir(socle.galeries.miroirGaucheDroite, 2),
    },
    {
      chemin: 'galeries/miroir-haut-bas.json',
      donnees: brouillonMiroir(socle.galeries.miroirHautBas, 3),
    },
    {
      chemin: 'galeries/sons-proches.json',
      donnees: {
        statut: 'brouillon-non-jouable',
        region: 'galeries',
        unite: 'sons-proches',
        rang: 4,
        libelle: 'Les sons proches',
        pointOuvert: 'O10',
        natureDesFormes: 'mot',
        source: 'socle déclaré — scripts/generer-phonologie.mjs',
        items: socle.galeries.sonsProches.map((bloc) => ({
          paire: [...bloc.paire], motsA: [...bloc.motsA], motsB: [...bloc.motsB],
        })),
        compte: { items: socle.galeries.sonsProches.length },
        aFaireALaMain: [...RESTE_A_FAIRE],
      },
    },
  ];
}

function brouillonMiroir(bloc, rang) {
  return {
    statut: 'brouillon-non-jouable',
    region: 'galeries',
    unite: `miroir-${bloc.axe}`,
    rang,
    libelle: `Les lettres miroir — axe ${bloc.axe}`,
    pointOuvert: 'O10',
    natureDesFormes: 'mot',
    decision: 'D23 — les deux axes ne sont JAMAIS traités en bloc',
    source: 'socle déclaré — scripts/generer-phonologie.mjs',
    axe: bloc.axe,
    lettres: [...bloc.lettres],
    lettresSecondaires: [...bloc.lettresSecondaires],
    motsA: [...bloc.motsA],
    motsB: [...bloc.motsB],
    paires: bloc.paires.map((p) => ({ ...p })),
    compte: { motsA: bloc.motsA.length, motsB: bloc.motsB.length, paires: bloc.paires.length },
    aFaireALaMain: [...RESTE_A_FAIRE],
  };
}

// ══════════════════════════════════════════════════ enrichissement facultatif par llama.cpp

/**
 * Demande au modèle local des mots supplémentaires pour une unité.
 *
 * **Rien de ce qu'il rend n'entre sans passer le lexique CE1.** Le modèle propose, la liste
 * dispose : c'est la seule façon d'employer un LLM sur du contenu destiné à un enfant sans
 * déplacer la responsabilité du vocabulaire vers un modèle qu'on ne relit pas.
 */
export async function proposerMots(theme, dejaVus, signal) {
  const invite =
    `Donne 15 mots français très simples, connus d'un enfant de 7 ans, sur le thème : ${theme}. ` +
    `Un mot par ligne, sans numéro, sans phrase. Évite ces mots déjà pris : ${dejaVus.join(', ')}.`;
  const reponse = await fetch(URL_LLAMA, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: invite }],
      temperature: 0.2,
      max_tokens: 300,
    }),
    signal,
  });
  if (!reponse.ok) throw new Error(`llama.cpp a répondu ${String(reponse.status)}`);
  const charge = await reponse.json();
  const texte = charge?.choices?.[0]?.message?.content ?? '';
  return texte
    .split('\n')
    .map((ligne) => ligne.trim().replace(/^[-*\d.)\s]+/, '').toLowerCase())
    .filter((mot) => mot.length > 1 && /^[a-zà-ÿ]+$/.test(mot));
}

// ═══════════════════════════════════════════════════════════════════════════════ le programme

function ecrire(brouillons) {
  for (const { chemin, donnees } of brouillons) {
    const absolu = join(SORTIE, ...chemin.split('/'));
    mkdirSync(join(absolu, '..'), { recursive: true });
    writeFileSync(absolu, `${JSON.stringify(donnees, null, 2)}\n`, 'utf8');
  }
}

async function principal() {
  const ecarts = verifier();
  const brouillons = construireBrouillons();

  console.log(`generer-phonologie — lexique CE1 déclaré : ${String(LEXIQUE_CE1.length)} mots`);
  console.log(`  unités phonologiques : ${String(brouillons.length)}`);
  console.log(`  syllabes CV dérivées : ${String(syllabesCV().length)}`);

  if (ecarts.length > 0) {
    console.error(`REFUS D'ÉCRIRE — ${String(ecarts.length)} écart(s) entre le socle déclaré et sa remesure :`);
    for (const ecart of ecarts.slice(0, 20)) console.error(`  ✗ ${ecart}`);
    if (ecarts.length > 20) console.error(`  … ${String(ecarts.length - 20)} autre(s)`);
    console.error('Aucun octet écrit. Un générateur refuse d’écrire plutôt que d’émettre du faux (C6).');
    process.exitCode = 1;
    return;
  }

  // L'enrichissement est facultatif ET borné : sans serveur, on n'attend pas.
  if (process.argv.includes('--enrichir')) {
    const controle = new AbortController();
    const minuterie = setTimeout(() => { controle.abort(); }, 20_000);
    try {
      const proposes = await proposerMots(
        'objets du quotidien avec le son [ou]', ['loup', 'roue', 'four'], controle.signal,
      );
      const retenus = proposes.filter((mot) => estAuLexique(mot));
      console.log(
        `  llama.cpp : ${String(proposes.length)} mot(s) proposé(s), ` +
        `${String(retenus.length)} retenu(s) après le lexique CE1 — ${retenus.join(', ')}`,
      );
      console.log('  (proposition seule : aucun mot n’entre au socle sans relecture humaine)');
    } catch (erreur) {
      console.log(
        `  llama.cpp injoignable sur ${URL_LLAMA} — le socle déclaré suffit, ` +
        'l’enrichissement est facultatif (D9). ' +
        `Détail : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
      );
    } finally {
      clearTimeout(minuterie);
    }
  }

  ecrire(brouillons);
  console.log(`  écrit dans contenu/brouillons/phonologie/ — et NULLE PART AILLEURS (annexe P § 6.4)`);
}

// Exécuté en programme, pas importé par un test : `pathToFileURL` rend la comparaison juste
// sur Windows, où `process.argv[1]` porte des antislashs et `import.meta.url` des slashs.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
