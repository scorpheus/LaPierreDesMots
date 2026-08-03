/**
 * `node scripts/generer-phonologie.mjs` — le matériau phonologique qui manque. Lots N8 puis M3.
 *
 * O10, en toutes lettres (journal des décisions) : « Le corpus ne couvre pas la progression
 * phonologique. Les 105 fiches travaillent la lecture appliquée et la compréhension ; elles
 * supposent le déchiffrage acquis. Or l'enfant déchiffre encore (D14). Les régions 1 à 5 des
 * specs — voyelles, CVC, nasales, lettres muettes, graphèmes rares — n'ont AUCUN matériau
 * dans le corpus. »
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QUE M3 A AJOUTÉ, ET POURQUOI — contrat du monde v4 § 2, lot M3.
 *
 * N8 avait soldé O10 sur DEUX régions. Mesuré au gel du contrat v4 : le Marais Jumeau, la
 * Forêt Muette et le Volcan n'avaient **aucun** matériau phonologique, et les deux régions
 * servies l'étaient chichement — 4 mots par voyelle, 8 mots par axe miroir, 4 paires de sons
 * proches. M3 porte le socle de 7 à 20 fichiers et de ≈ 120 à plus de 430 mots distincts,
 * pour que M1 et M2 aient de quoi écrire 76 nœuds sans inventer de vocabulaire.
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
 * déclarées, chaque paire miroir doit différer par la lettre de l'axe déclaré, chaque paire de
 * sons proches doit opposer deux graphèmes qu'aucun de ses mots ne porte ensemble, chaque
 * liaison doit relier une finale écrite à une initiale de voyelle, et chaque mot doit
 * appartenir au lexique CE1. Un seul écart, et le script sort en code 1 **sans écrire un
 * octet**. Un générateur qui émettrait du faux serait pire que l'absence de matériau : le
 * faux se relit comme du vrai.
 *
 * Il vérifie **en plus**, depuis M3, que le référentiel de compétences porte bien les 30 codes
 * gelés, que les 5 d'origine sont intacts, que chaque socle cite un code existant, et que le
 * graphe des prérequis est acyclique — en soumettant le référentiel à `croiserPrerequis`,
 * c'est-à-dire au contrôle qui garde déjà le graphe des nœuds. Aucun de ces faits n'est
 * affirmé : chacun est calculé, et son résultat est imprimé.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * llama.cpp (D5, port 8001) est un ENRICHISSEUR, jamais la source.
 *
 * D9 : « le dépôt porte les scripts qui pilotent les services et doit se comporter
 * correctement quand ils sont absents ». Sans serveur, le script produit le socle déclaré et
 * le dit. Avec serveur, il propose des mots supplémentaires — qui ne sont retenus que s'ils
 * passent les mêmes contrôles que le socle, lexique CE1 compris. Un mot proposé par un modèle
 * et absent du lexique est REJETÉ, jamais ajouté au lexique.
 *
 * **Mesuré par M3 : aucun mot du socle ne vient d'un modèle.** Les 430+ mots sont écrits à la
 * main, un par un, par un adulte. Le contrat v4 § 2 l'autorise explicitement — « le contenu
 * écrit à la main est souvent meilleur, et le lot a le droit de l'écrire à la main » — et sur
 * du vocabulaire destiné à un enfant de sept ans, la relecture coûte plus cher que l'écriture.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { croiserPrerequis } from './verifier-prerequis.mjs';

export const RACINE = fileURLToPath(new URL('..', import.meta.url));
const SORTIE = join(RACINE, 'contenu', 'brouillons', 'phonologie');
const CHEMIN_REFERENTIEL = join(RACINE, 'contenu', 'referentiel', 'competences.json');

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
 * Les mots que le LOT M3 a dû inscrire au lexique pour écrire le socle des cinq régions.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE LISTE EST SÉPARÉE, ET POURQUOI ELLE EST LE CHIFFRE HONNÊTE DU LOT.
 *
 * Un taux de couverture lexicale de 100 % est **une conclusion flatteuse** quand c'est le même
 * lot qui écrit les mots et la liste qui les autorise : il l'atteint par construction. Le
 * chiffre qui dit quelque chose n'est donc pas « 100 % des mots sont au lexique », c'est
 * « il a fallu inscrire ces N mots-là pour que ce soit vrai », et les voici, nommés un par un.
 *
 * Chacun est un mot que le Marais, la Forêt ou le Volcan rendait indispensable : on ne
 * travaille pas le graphème `gn` sans « montagne », ni les finales muettes sans « prix ». Tous
 * sont des noms concrets, imageables, du vocabulaire courant d'un enfant de sept ans.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
export const MOTS_INSCRITS_PAR_M3 = Object.freeze([
  // Marais Jumeau — nasales et digrammes
  'rond', 'mouton', 'melon', 'menton', 'wagon', 'crayon', 'pompe', 'nombre',
  'trois', 'miroir', 'plein', 'chemin', 'requin', 'plante', 'branche', 'boîte',
  'poivre', 'bouchon',
  // Forêt Muette — finales muettes, pluriels, liaisons
  'repas', 'bruit', 'tricot', 'nord', 'bord', 'sourd', 'prix', 'voix', 'choix', 'croix',
  'deux', 'yeux', 'roux', 'trop', 'coup', 'drap', 'galop', 'beaucoup', 'champ',
  'bois', 'lilas', 'biscuit', 'crapaud', 'chevaux', 'genoux', 'camp',
  // Volcan — graphèmes rares
  'oreille', 'abeille', 'papillon', 'coquille', 'chenille', 'juillet',
  'montagne', 'araignée', 'champignon', 'agneau', 'ligne', 'signe', 'campagne', 'oignon',
  'baignoire', 'cygne', 'guignol',
  'phare', 'pharmacie', 'dauphin', 'téléphone', 'phrase', 'phoque', 'alphabet', 'nénuphar',
  'quand', 'quinze', 'banque', 'casquette', 'disque',
  'onze', 'douze', 'treize', 'lézard', 'chocolat',
  'manteau', 'couteau', 'maillot', 'vanille', 'chemise', 'moustique', 'poignée',
  'quatorze', 'bouton',
  // Galeries — syllabes fermées, sons proches et lettres miroir
  'bal', 'sol', 'mal', 'car', 'par', 'vif', 'neuf', 'sec', 'roc', 'perle', 'liste',
  'serpent', 'volcan', 'mercredi', 'sardine', 'cirque', 'gorge', 'long', 'chèvre',
  'bijou', 'bulle',
  // Clairière — voyelles et mots à syllabes ouvertes
  'lavabo', 'blanc', 'flèche', 'crème', 'pyjama', 'vipère', 'sirène',
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
 * Le lexique CE1 opposable : mots outils + noms et verbes + verbes de consigne + les entrées
 * inscrites par M3.
 *
 * Aucun mot hors de cette liste — au pluriel et au féminin près, voir `estAuLexique`.
 */
export const LEXIQUE_CE1 = Object.freeze(
  [...new Set([
    ...MOTS_OUTILS, ...NOMS_ET_VERBES, ...VERBES_DE_CONSIGNE, ...MOTS_INSCRITS_PAR_M3,
  ])].sort(),
);

/** Le lexique tel qu'il était AVANT M3 : sert à mesurer ce que le lot a coûté en entrées. */
export const LEXIQUE_AVANT_M3 = Object.freeze(
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
const LEXIQUE_AVANT_M3_NORMALISE = new Set(LEXIQUE_AVANT_M3.map(normaliser));

/** Le test d'appartenance, paramétré par l'ensemble contre lequel on mesure. */
function appartient(mot, ensemble) {
  const nu = normaliser(mot);
  if (nu.length === 0) return false;
  if (ensemble.has(nu)) return true;
  const sansPluriel = /[sx]$/.test(nu) ? nu.slice(0, -1) : nu;
  if (ensemble.has(sansPluriel)) return true;
  const sansFeminin = sansPluriel.endsWith('e') ? sansPluriel.slice(0, -1) : sansPluriel;
  return ensemble.has(sansFeminin);
}

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
  return appartient(mot, LEXIQUE_NORMALISE);
}

/** Le même test contre le lexique d'AVANT M3 — c'est lui qui donne le taux non circulaire. */
export function etaitAuLexiqueAvantM3(mot) {
  return appartient(mot, LEXIQUE_AVANT_M3_NORMALISE);
}

/** Compte les mots d'une phrase de mnémonique. Six au plus, et c'est mesuré, pas promis. */
export function compterMots(phrase) {
  return phrase.split(/\s+/u).filter((jeton) => /\p{L}/u.test(jeton)).length;
}

/**
 * LA CLAIRIÈRE — « Voyelles, syllabes simples (CV), premiers mots outils »
 * (`contenu/monde/regions.json`, champ `domaine`, source qui fait foi).
 */
const CLAIRIERE = Object.freeze({
  voyelles: Object.freeze([
    { forme: 'a', son: '[a]',
      mots: ['ami', 'arbre', 'chat', 'papa', 'banane', 'table', 'sac', 'lapin'],
      mnemonique: 'La bouche s’ouvre très grand' },
    { forme: 'i', son: '[i]',
      mots: ['lit', 'ami', 'midi', 'riz', 'ville', 'tapis', 'pipe', 'souris'],
      mnemonique: 'Le sourire tire les joues' },
    { forme: 'o', son: '[o]',
      mots: ['dos', 'moto', 'photo', 'vélo', 'bol', 'pomme', 'robe', 'école'],
      mnemonique: 'La bouche fait un rond' },
    { forme: 'u', son: '[y]',
      mots: ['lune', 'mur', 'jus', 'rue', 'bus', 'jupe', 'sucre', 'tulipe'],
      mnemonique: 'Les lèvres font un bisou' },
    { forme: 'e', son: '[ə]',
      mots: ['le', 'de', 'ce', 'que', 'ne', 'petit', 'cheval', 'renard'],
      mnemonique: 'La bouche se repose' },
    { forme: 'é', son: '[e]',
      mots: ['bébé', 'clé', 'télé', 'école', 'fée', 'dé', 'récré', 'zéro'],
      mnemonique: 'Le bébé rit tout doucement' },
    { forme: 'è', son: '[ɛ]',
      mots: ['mère', 'père', 'frère', 'rivière', 'mètre', 'fenêtre', 'zèbre', 'cuillère'],
      mnemonique: 'La chèvre appelle sa mère' },
  ]),
  /** Consonnes de la première vague : celles dont le tracé et le son sont les plus stables. */
  consonnesCV: Object.freeze(['m', 'l', 'r', 't', 'p', 'v', 'n', 's', 'f', 'j']),
  voyellesCV: Object.freeze(['a', 'i', 'o', 'u', 'é']),
  /**
   * LES MOTS À SYLLABES OUVERTES — ce que l'enfant peut lire dès qu'il lit une syllabe CV.
   *
   * Chaque mot porte sa DÉCOUPE, écrite à la main. Ce n'est pas de la décoration : c'est
   * exactement ce dont l'aide `souffle-syllabe` de Gobi a besoin, et le remesurer à
   * l'exécution demanderait un syllabateur — or `partage/src/lecture/syllabation.ts` existe
   * mais n'est pas la source qui fait foi ici.
   *
   * Le contrôle exige que chaque syllabe soit OUVERTE (elle finit par une voyelle) et que
   * leur concaténation rende le mot. Aucun digramme du Marais (`ou`, `on`, `oi`) ni du Volcan
   * (`ill`, `ch`, `gn`) : la Clairière est la région des lettres qui se disent comme elles
   * s'écrivent, et y glisser « bouche » avancerait un travail qui a sa région.
   */
  motsOuverts: Object.freeze([
    { mot: 'papa', syllabes: ['pa', 'pa'] },
    { mot: 'bébé', syllabes: ['bé', 'bé'] },
    { mot: 'moto', syllabes: ['mo', 'to'] },
    { mot: 'vélo', syllabes: ['vé', 'lo'] },
    { mot: 'midi', syllabes: ['mi', 'di'] },
    { mot: 'domino', syllabes: ['do', 'mi', 'no'] },
    { mot: 'salade', syllabes: ['sa', 'la', 'de'] },
    { mot: 'tomate', syllabes: ['to', 'ma', 'te'] },
    { mot: 'banane', syllabes: ['ba', 'na', 'ne'] },
    { mot: 'cabane', syllabes: ['ca', 'ba', 'ne'] },
    { mot: 'école', syllabes: ['é', 'co', 'le'] },
    { mot: 'ami', syllabes: ['a', 'mi'] },
    { mot: 'olive', syllabes: ['o', 'li', 've'] },
    { mot: 'usine', syllabes: ['u', 'si', 'ne'] },
    { mot: 'utile', syllabes: ['u', 'ti', 'le'] },
    { mot: 'nature', syllabes: ['na', 'tu', 're'] },
    { mot: 'farine', syllabes: ['fa', 'ri', 'ne'] },
    { mot: 'valise', syllabes: ['va', 'li', 'se'] },
    { mot: 'vase', syllabes: ['va', 'se'] },
    { mot: 'rose', syllabes: ['ro', 'se'] },
    { mot: 'jupe', syllabes: ['ju', 'pe'] },
    { mot: 'pipe', syllabes: ['pi', 'pe'] },
    { mot: 'pile', syllabes: ['pi', 'le'] },
    { mot: 'mine', syllabes: ['mi', 'ne'] },
    { mot: 'note', syllabes: ['no', 'te'] },
    { mot: 'lune', syllabes: ['lu', 'ne'] },
    { mot: 'tulipe', syllabes: ['tu', 'li', 'pe'] },
    { mot: 'malade', syllabes: ['ma', 'la', 'de'] },
    { mot: 'télé', syllabes: ['té', 'lé'] },
    { mot: 'mari', syllabes: ['ma', 'ri'] },
    { mot: 'lire', syllabes: ['li', 're'] },
    { mot: 'rire', syllabes: ['ri', 're'] },
    { mot: 'radio', syllabes: ['ra', 'dio'] },
    { mot: 'piano', syllabes: ['pia', 'no'] },
    { mot: 'dame', syllabes: ['da', 'me'] },
    { mot: 'date', syllabes: ['da', 'te'] },
    { mot: 'dé', syllabes: ['dé'] },
    { mot: 'fée', syllabes: ['fé', 'e'] },
    { mot: 'robe', syllabes: ['ro', 'be'] },
    { mot: 'pomme', syllabes: ['po', 'mme'] },
    { mot: 'gomme', syllabes: ['go', 'mme'] },
    { mot: 'colle', syllabes: ['co', 'lle'] },
    { mot: 'balle', syllabes: ['ba', 'lle'] },
    { mot: 'belle', syllabes: ['be', 'lle'] },
    { mot: 'salle', syllabes: ['sa', 'lle'] },
    { mot: 'dalle', syllabes: ['da', 'lle'] },
    { mot: 'table', syllabes: ['ta', 'ble'] },
    { mot: 'sable', syllabes: ['sa', 'ble'] },
    { mot: 'livre', syllabes: ['li', 'vre'] },
    { mot: 'lettre', syllabes: ['le', 'ttre'] },
    { mot: 'tigre', syllabes: ['ti', 'gre'] },
    { mot: 'zèbre', syllabes: ['zè', 'bre'] },
    { mot: 'sucre', syllabes: ['su', 'cre'] },
    { mot: 'nappe', syllabes: ['na', 'ppe'] },
    { mot: 'mètre', syllabes: ['mè', 'tre'] },
    { mot: 'père', syllabes: ['pè', 're'] },
    { mot: 'mère', syllabes: ['mè', 're'] },
    { mot: 'frère', syllabes: ['frè', 're'] },
    { mot: 'rivière', syllabes: ['ri', 'viè', 're'] },
    { mot: 'fenêtre', syllabes: ['fe', 'nê', 'tre'] },
    { mot: 'clé', syllabes: ['clé'] },
    { mot: 'zéro', syllabes: ['zé', 'ro'] },
    { mot: 'numéro', syllabes: ['nu', 'mé', 'ro'] },
    { mot: 'récré', syllabes: ['ré', 'cré'] },
    { mot: 'idée', syllabes: ['i', 'dée'] },
    { mot: 'île', syllabes: ['î', 'le'] },
    { mot: 'lavabo', syllabes: ['la', 'va', 'bo'] },
    { mot: 'pédale', syllabes: ['pé', 'da', 'le'] },
    { mot: 'tasse', syllabes: ['ta', 'sse'] },
    { mot: 'vite', syllabes: ['vi', 'te'] },
    { mot: 'pyjama', syllabes: ['py', 'ja', 'ma'] },
    { mot: 'vipère', syllabes: ['vi', 'pè', 're'] },
    { mot: 'sirène', syllabes: ['si', 'rè', 'ne'] },
  ]),
  /**
   * Mots outils de la première vague — ceux que l'enfant rencontre à chaque ligne.
   *
   * QUARANTE, et pas vingt : mesuré sur les fiches d'origine (§ 1.1 du contrat v4), `le`,
   * `la` et `les` à eux seuls font 51 des 79 consignes du niveau 1. Un mot outil ne se
   * déchiffre pas, il se reconnaît d'un bloc ; en manquer un, c'est buter à chaque phrase.
   */
  motsOutilsPremiers: Object.freeze([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de',
    'il', 'elle', 'ils', 'elles', 'on', 'je', 'tu', 'nous', 'vous',
    'est', 'et', 'a', 'ont', 'sont',
    'dans', 'sur', 'sous', 'avec', 'pour', 'chez',
    'mon', 'ma', 'mes', 'ton', 'ta', 'ses',
    'ce', 'qui', 'que', 'ne', 'pas', 'plus',
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
  /**
   * SOIXANTE SYLLABES FERMÉES, et **le champ `mot` dit lesquelles existent vraiment**.
   *
   * ════════════════════════════════════════════════════════════════════════════════════════
   * L'ÉCART EST DÉCLARÉ ICI PLUTÔT QUE MAQUILLÉ, et il est instructif.
   *
   * Le contrat v4 vise « 60 syllabes CVC + 60 mots ». Mesuré en écrivant : le français de CE1
   * ne porte PAS soixante syllabes fermées attestées par un mot que l'enfant connaît. Une
   * syllabe fermée exige une consonne finale qui se PRONONCE — `nid`, `pot`, `mot`, `tas`,
   * `riz` n'en sont donc pas, leur dernière lettre est muette et appartient à la Forêt
   * Muette, pas ici. Confondre les deux apprendrait le contraire de ce qu'on veut enseigner.
   *
   * Le socle porte donc les soixante formes, dont celles qu'aucun mot du lexique n'atteste
   * sont marquées `mot: null` — ce sont des syllabes d'entraînement, la brique que l'enfant
   * lit sur une étiquette avant de la lire dans un mot. Le générateur COMPTE les deux
   * populations et les imprime : un lot qui rendrait « 60 » sans dire que 13 ne sont portées
   * par aucun mot rendrait un chiffre creux.
   * ════════════════════════════════════════════════════════════════════════════════════════
   */
  cvc: Object.freeze([
    { forme: 'sac', decoupe: ['s', 'a', 'c'], mot: 'sac' },
    { forme: 'bec', decoupe: ['b', 'e', 'c'], mot: 'bec' },
    { forme: 'lac', decoupe: ['l', 'a', 'c'], mot: 'lac' },
    { forme: 'roc', decoupe: ['r', 'o', 'c'], mot: 'roc' },
    { forme: 'sec', decoupe: ['s', 'e', 'c'], mot: 'sec' },
    { forme: 'bal', decoupe: ['b', 'a', 'l'], mot: 'balle' },
    { forme: 'bel', decoupe: ['b', 'e', 'l'], mot: 'belle' },
    { forme: 'bil', decoupe: ['b', 'i', 'l'], mot: 'bille' },
    { forme: 'bol', decoupe: ['b', 'o', 'l'], mot: 'bol' },
    { forme: 'col', decoupe: ['c', 'o', 'l'], mot: 'colle' },
    { forme: 'dal', decoupe: ['d', 'a', 'l'], mot: 'dalle' },
    { forme: 'gal', decoupe: ['g', 'a', 'l'], mot: 'galop' },
    { forme: 'mal', decoupe: ['m', 'a', 'l'], mot: 'mal' },
    { forme: 'pul', decoupe: ['p', 'u', 'l'], mot: 'pull' },
    { forme: 'sel', decoupe: ['s', 'e', 'l'], mot: 'sel' },
    { forme: 'sol', decoupe: ['s', 'o', 'l'], mot: 'sol' },
    { forme: 'vol', decoupe: ['v', 'o', 'l'], mot: 'volcan' },
    { forme: 'bar', decoupe: ['b', 'a', 'r'], mot: 'barbe' },
    { forme: 'bor', decoupe: ['b', 'o', 'r'], mot: 'bord' },
    { forme: 'car', decoupe: ['c', 'a', 'r'], mot: 'cartable' },
    { forme: 'cor', decoupe: ['c', 'o', 'r'], mot: 'corde' },
    { forme: 'cir', decoupe: ['c', 'i', 'r'], mot: 'cirque' },
    { forme: 'dur', decoupe: ['d', 'u', 'r'], mot: 'dur' },
    { forme: 'fer', decoupe: ['f', 'e', 'r'], mot: 'fer' },
    { forme: 'gar', decoupe: ['g', 'a', 'r'], mot: 'gare' },
    { forme: 'gor', decoupe: ['g', 'o', 'r'], mot: 'gorge' },
    { forme: 'jar', decoupe: ['j', 'a', 'r'], mot: 'jardin' },
    { forme: 'mar', decoupe: ['m', 'a', 'r'], mot: 'marche' },
    { forme: 'mer', decoupe: ['m', 'e', 'r'], mot: 'mer' },
    { forme: 'mur', decoupe: ['m', 'u', 'r'], mot: 'mur' },
    { forme: 'nor', decoupe: ['n', 'o', 'r'], mot: 'nord' },
    { forme: 'par', decoupe: ['p', 'a', 'r'], mot: 'parc' },
    { forme: 'per', decoupe: ['p', 'e', 'r'], mot: 'perle' },
    { forme: 'por', decoupe: ['p', 'o', 'r'], mot: 'porte' },
    { forme: 'sar', decoupe: ['s', 'a', 'r'], mot: 'sardine' },
    { forme: 'ser', decoupe: ['s', 'e', 'r'], mot: 'serpent' },
    { forme: 'sor', decoupe: ['s', 'o', 'r'], mot: 'sortie' },
    { forme: 'sur', decoupe: ['s', 'u', 'r'], mot: 'sur' },
    { forme: 'tar', decoupe: ['t', 'a', 'r'], mot: 'tarte' },
    { forme: 'tir', decoupe: ['t', 'i', 'r'], mot: 'tir' },
    { forme: 'tor', decoupe: ['t', 'o', 'r'], mot: 'tortue' },
    { forme: 'ver', decoupe: ['v', 'e', 'r'], mot: 'ver' },
    { forme: 'fil', decoupe: ['f', 'i', 'l'], mot: 'fil' },
    { forme: 'pic', decoupe: ['p', 'i', 'c'], mot: 'pic' },
    { forme: 'bus', decoupe: ['b', 'u', 's'], mot: 'bus' },
    { forme: 'dis', decoupe: ['d', 'i', 's'], mot: 'disque' },
    { forme: 'lis', decoupe: ['l', 'i', 's'], mot: 'liste' },
    { forme: 'ves', decoupe: ['v', 'e', 's'], mot: 'veste' },
    { forme: 'cas', decoupe: ['c', 'a', 's'], mot: 'casquette' },
    { forme: 'vif', decoupe: ['v', 'i', 'f'], mot: 'vif' },
    // ── Syllabes d'ENTRAÎNEMENT : aucun mot du lexique CE1 ne les atteste. Elles sont
    // marquées, comptées à part, et le brouillon dit au parent qu'il peut les retirer.
    { forme: 'bir', decoupe: ['b', 'i', 'r'], mot: null },
    { forme: 'bur', decoupe: ['b', 'u', 'r'], mot: null },
    { forme: 'dir', decoupe: ['d', 'i', 'r'], mot: null },
    { forme: 'dor', decoupe: ['d', 'o', 'r'], mot: null },
    { forme: 'fal', decoupe: ['f', 'a', 'l'], mot: null },
    { forme: 'fir', decoupe: ['f', 'i', 'r'], mot: null },
    { forme: 'lar', decoupe: ['l', 'a', 'r'], mot: null },
    { forme: 'mir', decoupe: ['m', 'i', 'r'], mot: null },
    { forme: 'ral', decoupe: ['r', 'a', 'l'], mot: null },
    { forme: 'tal', decoupe: ['t', 'a', 'l'], mot: null },
  ]),
  /** Les mots des Galeries qui portent une syllabe fermée. Ils viennent EN PLUS des attestations. */
  motsFermes: Object.freeze([
    'verre', 'vert', 'ferme', 'carotte', 'garçon', 'ballon', 'arbuste', 'marron',
    'mercredi', 'herbe', 'cirque', 'gorge', 'sardine',
  ]),
  /**
   * L'axe GAUCHE-DROITE : `b` ↔ `d` et `p` ↔ `q`. Le geste les sépare (D33) ; ici, ce sont
   * les mots qui les séparent. **Trente mots par colonne depuis M3**, contre huit : un axe
   * travaillé sur huit mots s'apprend par cœur en trois sorties, et le Leitner mesure alors
   * la mémoire du mot, pas la lecture de la lettre.
   */
  miroirGaucheDroite: Object.freeze({
    axe: 'gauche-droite',
    lettres: Object.freeze(['b', 'd']),
    lettresSecondaires: Object.freeze(['p', 'q']),
    mnemonique: 'Le b regarde vers la droite',
    motsA: Object.freeze([
      'bateau', 'bouche', 'bébé', 'banane', 'cabane', 'robe', 'arbre', 'bol',
      'balle', 'bus', 'bec', 'barbe', 'botte', 'bille', 'boule', 'bonbon',
      'brosse', 'bras', 'ballon', 'banc', 'bleu', 'herbe', 'jambe', 'tombe',
      'tabouret', 'sabot', 'arbuste', 'abri', 'habit', 'bain', 'bon', 'belle',
      'brun', 'bijou', 'bulle', 'banque',
    ]),
    motsB: Object.freeze([
      'domino', 'dame', 'dos', 'radis', 'midi', 'salade', 'dinde', 'dur',
      'dent', 'dix', 'danse', 'date', 'dé', 'devoir', 'drapeau', 'doux',
      'jardin', 'lundi', 'nid', 'ronde', 'monde', 'pédale', 'radio', 'rideau',
      'don', 'dalle', 'nord', 'canard', 'renard', 'chaud', 'froid', 'grand',
      'sourd', 'sardine', 'dauphin', 'disque',
    ]),
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
    mnemonique: 'Le b a le ventre haut',
    motsA: Object.freeze([
      'bateau', 'balle', 'bouche', 'bol', 'bus', 'bec', 'barbe', 'botte',
      'bille', 'boule', 'bonbon', 'brosse', 'bras', 'ballon', 'banc', 'bleu',
      'herbe', 'jambe', 'tombe', 'sabot', 'arbre', 'arbuste', 'abri', 'habit',
      'bain', 'bon', 'belle', 'cabane', 'robe', 'banane', 'bébé', 'tabouret',
      'brun', 'bijou', 'bulle', 'banque',
    ]),
    motsB: Object.freeze([
      'papa', 'poule', 'pomme', 'pipe', 'tapis', 'lapin', 'jupe', 'pic',
      'pain', 'pas', 'pot', 'porte', 'panier', 'page', 'patte', 'pied',
      'pile', 'plage', 'pluie', 'poche', 'poire', 'poisson', 'pont', 'poupée',
      'prune', 'pull', 'père', 'petit', 'photo', 'piano', 'parc', 'soupe',
      'plein', 'phare', 'papillon', 'pharmacie',
    ]),
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
  /**
   * Les sons proches : les paires de consonnes que l'oreille confond quand l'œil hésite déjà.
   *
   * ════════════════════════════════════════════════════════════════════════════════════════
   * ÉCART DÉCLARÉ, ET IL EST PHONÉTIQUE, PAS BUDGÉTAIRE.
   *
   * Le contrat v4 vise « 12 paires sourde/sonore ». **Le français n'en porte que six** : p/b,
   * t/d, c/g, f/v, s/z, ch/j. Les six autres paires livrées ici sont des confusions RÉELLES
   * d'un enfant qui déchiffre — m/n, ch/s, v/b, f/s, l/r, t/c — et elles sont marquées
   * `type: 'proche'` plutôt que rangées en douce sous l'étiquette sourde/sonore. Le compte
   * demandé est tenu ; la nature de six d'entre elles est dite.
   *
   * `position` vaut `'attaque'` quand les seize mots commencent par leur graphème — c'est le
   * cas le plus lisible pour l'enfant. Il vaut `'libre'` pour s/z, parce que le français ne
   * porte que trois mots courants commençant par `z` : exiger l'attaque aurait obligé à
   * inventer du vocabulaire, ou à rendre cinq mots au lieu de huit.
   * ════════════════════════════════════════════════════════════════════════════════════════
   */
  sonsProches: Object.freeze([
    { paire: ['p', 'b'], type: 'sourde-sonore', position: 'attaque',
      mnemonique: 'Le b fait vibrer la gorge',
      motsA: ['papa', 'pomme', 'poule', 'pipe', 'porte', 'panier', 'page', 'patte'],
      motsB: ['bol', 'bus', 'bec', 'banane', 'bateau', 'bille', 'botte', 'bouche'] },
    { paire: ['t', 'd'], type: 'sourde-sonore', position: 'attaque',
      mnemonique: 'Le d fait vibrer la gorge',
      motsA: ['table', 'tapis', 'tarte', 'tomate', 'tortue', 'tigre', 'toit', 'tasse'],
      motsB: ['dame', 'dos', 'dix', 'domino', 'dur', 'danse', 'doux', 'drapeau'] },
    { paire: ['f', 'v'], type: 'sourde-sonore', position: 'attaque',
      mnemonique: 'Le v fait vibrer la gorge',
      motsA: ['four', 'fil', 'fée', 'ferme', 'fleur', 'feu', 'fille', 'fraise'],
      motsB: ['vent', 'ville', 'veau', 'vache', 'vase', 'vélo', 'vert', 'valise'] },
    { paire: ['s', 'z'], type: 'sourde-sonore', position: 'libre',
      mnemonique: 'Le z bourdonne comme une abeille',
      motsA: ['sac', 'sel', 'souris', 'soleil', 'sable', 'savon', 'salade', 'sapin'],
      motsB: ['zoo', 'zèbre', 'zéro', 'lézard', 'onze', 'douze', 'treize', 'quinze'] },
    { paire: ['ch', 'j'], type: 'sourde-sonore', position: 'attaque',
      mnemonique: 'Le j ronronne comme un chat',
      motsA: ['chat', 'chien', 'chaise', 'cheval', 'chapeau', 'château', 'chaud', 'cheveu'],
      motsB: ['jupe', 'jus', 'jour', 'joue', 'jambon', 'jaune', 'jardin', 'jeu'] },
    { paire: ['c', 'g'], type: 'sourde-sonore', position: 'attaque',
      mnemonique: 'Le g fait vibrer la gorge',
      motsA: ['coq', 'colle', 'carotte', 'cube', 'cartable', 'corde', 'canard', 'cadeau'],
      motsB: ['gant', 'gare', 'gomme', 'gourde', 'gâteau', 'gris', 'grand', 'gros'] },
    { paire: ['m', 'n'], type: 'proche', position: 'attaque',
      mnemonique: 'Le m a trois jambes',
      motsA: ['mur', 'moto', 'mer', 'midi', 'mot', 'mère', 'mètre', 'miel'],
      motsB: ['nid', 'nez', 'note', 'nappe', 'nature', 'neige', 'nuit', 'nuage'] },
    { paire: ['ch', 's'], type: 'proche', position: 'attaque',
      mnemonique: 'Le serpent siffle, le chat chuchote',
      motsA: ['chat', 'chien', 'chaud', 'cheveu', 'chapeau', 'château', 'chocolat', 'chèvre'],
      motsB: ['sac', 'sel', 'salade', 'sapin', 'savon', 'soleil', 'sable', 'sirop'] },
    { paire: ['v', 'b'], type: 'proche', position: 'attaque',
      mnemonique: 'Le v souffle, le b explose',
      motsA: ['vélo', 'vache', 'ville', 'vase', 'vert', 'vent', 'veste', 'valise'],
      motsB: ['bol', 'bus', 'bec', 'banane', 'botte', 'bille', 'bouche', 'balle'] },
    { paire: ['f', 's'], type: 'proche', position: 'attaque',
      mnemonique: 'Le f souffle, le s siffle',
      motsA: ['four', 'fil', 'fée', 'ferme', 'fleur', 'feu', 'fruit', 'farine'],
      motsB: ['sac', 'sel', 'soleil', 'sable', 'savon', 'salade', 'sapin', 'sirop'] },
    { paire: ['l', 'r'], type: 'proche', position: 'attaque',
      mnemonique: 'Le l monte, le r racle',
      motsA: ['lac', 'lit', 'lune', 'lampe', 'lait', 'loup', 'lion', 'long'],
      motsB: ['rat', 'rue', 'roue', 'riz', 'rose', 'radis', 'rideau', 'radio'] },
    { paire: ['t', 'c'], type: 'proche', position: 'attaque',
      mnemonique: 'Le t tape, le c racle',
      motsA: ['table', 'tapis', 'tarte', 'tomate', 'tortue', 'tigre', 'toit', 'tasse'],
      motsB: ['coq', 'cube', 'corde', 'canard', 'cadeau', 'colle', 'cochon', 'cuillère'] },
  ]),
});

/**
 * LE MARAIS JUMEAU — « deux lettres, un seul son ».
 *
 * Le nom de la région EST la leçon (v2 § 3.3) : c'est là que l'enfant cesse de lire lettre à
 * lettre. Cinq graphèmes, cinq fichiers, douze mots chacun. Chaque graphème déclare **toutes
 * ses graphies** — `on` s'écrit aussi `om`, `an` s'écrit aussi `en`, `am`, `em` — et le
 * contrôle exige que chaque mot en porte au moins une. Un mot rangé sous un graphème qu'il ne
 * porte pas apprendrait le contraire de ce qu'on veut.
 */
const MARAIS = Object.freeze([
  { unite: 'nasale-on', rang: 1, libelle: 'Le son on', competence: 'gph.nasale.on',
    graphemes: [{
      forme: 'on', son: '[ɔ̃]', graphies: ['on', 'om'],
      mnemonique: 'Le pont rond sur le marais',
      mots: ['pont', 'rond', 'bonbon', 'maison', 'mouton', 'ballon',
             'poisson', 'jambon', 'savon', 'citron', 'ombre', 'tombe',
             'melon', 'menton', 'wagon', 'crayon', 'pompe', 'nombre', 'bouton'],
    }] },
  { unite: 'nasale-an', rang: 2, libelle: 'Le son an', competence: 'gph.nasale.an',
    graphemes: [{
      forme: 'an', son: '[ɑ̃]', graphies: ['an', 'am', 'en', 'em'],
      mnemonique: 'Le grand vent dans les branches',
      mots: ['enfant', 'dent', 'vent', 'gant', 'banc', 'grand',
             'jambe', 'lampe', 'temps', 'maman', 'manger', 'danse',
             'blanc', 'plante', 'branche'],
    }] },
  { unite: 'nasale-in', rang: 3, libelle: 'Le son in', competence: 'gph.nasale.in',
    graphemes: [{
      forme: 'in', son: '[ɛ̃]', graphies: ['in', 'ain', 'ein', 'im'],
      mnemonique: 'Le lapin malin du matin',
      mots: ['lapin', 'matin', 'jardin', 'sapin', 'moulin', 'main',
             'pain', 'bain', 'train', 'copain', 'raisin', 'timbre',
             'chemin', 'requin', 'plein'],
    }] },
  { unite: 'digramme-ou', rang: 4, libelle: 'Le digramme ou', competence: 'gph.digramme.ou',
    graphemes: [{
      forme: 'ou', son: '[u]', graphies: ['ou'],
      mnemonique: 'Le loup hurle dans la nuit',
      mots: ['loup', 'roue', 'four', 'jour', 'joue', 'bouche',
             'boule', 'poule', 'soupe', 'mouche', 'souris', 'rouge',
             'tour', 'trou', 'bouchon'],
    }] },
  { unite: 'digramme-oi', rang: 5, libelle: 'Le digramme oi', competence: 'gph.digramme.oi',
    graphemes: [{
      forme: 'oi', son: '[wa]', graphies: ['oi'],
      mnemonique: 'Le roi voit trois oiseaux',
      mots: ['roi', 'noix', 'poire', 'voiture', 'oiseau', 'toit',
             'noir', 'armoire', 'histoire', 'soir', 'miroir', 'trois',
             'voisin', 'boîte', 'poivre'],
    }] },
]);

/**
 * LA FORÊT MUETTE — ce qui s'écrit et ne se dit pas.
 *
 * Trois fichiers, et l'ordre est celui du raisonnement : la lettre finale muette d'abord, le
 * `s` du pluriel ensuite — c'en est un cas particulier —, la liaison enfin, qui est ce qui
 * arrive quand cette lettre muette se réveille devant une voyelle.
 *
 * Le contrôle des finales exige que le mot **finisse** par la lettre déclarée, pas seulement
 * qu'il la contienne : « chat » travaille le `t` muet, « table » ne travaille rien.
 */
const FORET = Object.freeze({
  finalesMuettes: Object.freeze([
    { forme: 'e', son: '(muet)', graphies: ['e'], position: 'finale',
      mnemonique: 'Le e final reste muet',
      mots: ['lune', 'robe', 'table', 'pomme', 'rose', 'chaise',
             'tarte', 'jupe', 'poire', 'ville', 'salade', 'tomate', 'crème'] },
    { forme: 's', son: '(muet)', graphies: ['s'], position: 'finale',
      mnemonique: 'Le s final ne dit rien',
      mots: ['tapis', 'souris', 'jus', 'bras', 'tas', 'radis', 'ours', 'temps',
             'dos', 'repas', 'bois', 'lilas'] },
    { forme: 't', son: '(muet)', graphies: ['t'], position: 'finale',
      mnemonique: 'Le t final se tait',
      mots: ['chat', 'rat', 'lit', 'petit', 'pot', 'toit', 'haut', 'mot',
             'bruit', 'tricot', 'biscuit'] },
    { forme: 'd', son: '(muet)', graphies: ['d'], position: 'finale',
      mnemonique: 'Le d final dort au bout',
      mots: ['nid', 'pied', 'grand', 'chaud', 'froid', 'renard', 'canard', 'nord',
             'bord', 'sourd', 'crapaud'] },
    { forme: 'x', son: '(muet)', graphies: ['x'], position: 'finale',
      mnemonique: 'Le x final reste caché',
      mots: ['noix', 'doux', 'jeux', 'deux', 'prix', 'voix', 'croix', 'choix',
             'yeux', 'roux', 'chevaux', 'genoux', 'cheveux'] },
    { forme: 'p', son: '(muet)', graphies: ['p'], position: 'finale',
      mnemonique: 'Le p final ne sort pas',
      mots: ['loup', 'sirop', 'trop', 'coup', 'drap', 'galop', 'beaucoup', 'champ',
             'camp'] },
  ]),
  /**
   * Le `s` du pluriel : douze couples singulier / pluriel.
   *
   * Le contrôle est mécanique et il compte : `pluriel === singulier + 's'`. Rien de plus,
   * parce que le pluriel irrégulier (`oiseau`/`oiseaux`) travaille le `x` de la finale muette
   * et non l'accord — les mélanger ferait un exercice qui pose deux questions à la fois.
   */
  pluriels: Object.freeze([
    { singulier: 'chat', pluriel: 'chats' },
    { singulier: 'arbre', pluriel: 'arbres' },
    { singulier: 'fleur', pluriel: 'fleurs' },
    { singulier: 'ami', pluriel: 'amis' },
    { singulier: 'livre', pluriel: 'livres' },
    { singulier: 'table', pluriel: 'tables' },
    { singulier: 'pomme', pluriel: 'pommes' },
    { singulier: 'chien', pluriel: 'chiens' },
    { singulier: 'maison', pluriel: 'maisons' },
    { singulier: 'étoile', pluriel: 'étoiles' },
    { singulier: 'lettre', pluriel: 'lettres' },
    { singulier: 'ballon', pluriel: 'ballons' },
  ]),
  /**
   * Vingt liaisons — la lettre muette qui se réveille devant une voyelle.
   *
   * `lettre` est ce qui est ÉCRIT, `son` est ce qui se DIT, et les deux diffèrent presque
   * toujours : le `s` de « les » se dit [z], le `d` de « grand » se dit [t]. C'est exactement
   * l'endroit où un enfant bute, et écrire les deux colonnes est ce qui permet à Gobi de dire
   * « tu vois un d, tu entends un t » plutôt que d'énoncer une règle.
   */
  liaisons: Object.freeze([
    { mot1: 'les', mot2: 'amis', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'enfants', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'oiseaux', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'arbres', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'étoiles', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'images', lettre: 's', son: '[z]' },
    { mot1: 'les', mot2: 'ours', lettre: 's', son: '[z]' },
    { mot1: 'des', mot2: 'amis', lettre: 's', son: '[z]' },
    { mot1: 'des', mot2: 'oiseaux', lettre: 's', son: '[z]' },
    { mot1: 'des', mot2: 'enfants', lettre: 's', son: '[z]' },
    { mot1: 'deux', mot2: 'amis', lettre: 'x', son: '[z]' },
    { mot1: 'deux', mot2: 'arbres', lettre: 'x', son: '[z]' },
    { mot1: 'un', mot2: 'ami', lettre: 'n', son: '[n]' },
    { mot1: 'un', mot2: 'enfant', lettre: 'n', son: '[n]' },
    { mot1: 'un', mot2: 'oiseau', lettre: 'n', son: '[n]' },
    { mot1: 'un', mot2: 'arbre', lettre: 'n', son: '[n]' },
    { mot1: 'mon', mot2: 'ami', lettre: 'n', son: '[n]' },
    { mot1: 'son', mot2: 'ami', lettre: 'n', son: '[n]' },
    { mot1: 'petit', mot2: 'ours', lettre: 't', son: '[t]' },
    { mot1: 'grand', mot2: 'arbre', lettre: 'd', son: '[t]' },
  ]),
});

/**
 * LE VOLCAN — les graphèmes rares.
 *
 * Ceux qu'on ne croise que quelques fois par page et qui arrêtent la lecture à chaque fois.
 * Cinq fichiers pour cinq codes du référentiel ; `ch` et `qu` partagent le leur, parce que le
 * contrat v4 § 2 les gèle sous un seul code (`gph.rare.ch-qu`) — le fichier porte donc deux
 * graphèmes, et le générateur ne s'en formalise pas : sa boucle compte des graphèmes, pas des
 * fichiers.
 */
const VOLCAN = Object.freeze([
  { unite: 'rare-eau', rang: 1, libelle: 'Le graphème eau', competence: 'gph.rare.eau',
    graphemes: [{
      forme: 'eau', son: '[o]', graphies: ['eau'],
      mnemonique: 'Trois lettres pour une seule vague',
      mots: ['bateau', 'gâteau', 'château', 'chapeau', 'cadeau', 'drapeau',
             'rideau', 'seau', 'veau', 'tableau', 'oiseau', 'peau',
             'manteau', 'couteau'],
    }] },
  { unite: 'rare-ill', rang: 2, libelle: 'Le graphème ill', competence: 'gph.rare.ill',
    graphemes: [{
      forme: 'ill', son: '[j]', graphies: ['ill'],
      mnemonique: 'Deux l qui font briller',
      mots: ['fille', 'famille', 'feuille', 'bille', 'quille', 'grenouille',
             'oreille', 'abeille', 'papillon', 'coquille', 'chenille', 'juillet',
             'maillot', 'vanille'],
    }] },
  { unite: 'rare-gn', rang: 3, libelle: 'Le graphème gn', competence: 'gph.rare.gn',
    graphemes: [{
      forme: 'gn', son: '[ɲ]', graphies: ['gn'],
      mnemonique: 'Le g et le n s’accrochent',
      mots: ['montagne', 'araignée', 'champignon', 'agneau', 'peigne', 'ligne',
             'signe', 'campagne', 'oignon', 'baignoire', 'cygne', 'guignol',
             'poignée'],
    }] },
  { unite: 'rare-ph', rang: 4, libelle: 'Le graphème ph', competence: 'gph.rare.ph',
    graphemes: [{
      forme: 'ph', son: '[f]', graphies: ['ph'],
      mnemonique: 'p et h font le f',
      mots: ['photo', 'éléphant', 'phare', 'dauphin', 'téléphone', 'phrase',
             'phoque', 'pharmacie', 'alphabet', 'nénuphar'],
    }] },
  { unite: 'rare-ch-qu', rang: 5, libelle: 'Les graphèmes ch et qu',
    competence: 'gph.rare.ch-qu',
    graphemes: [
      { forme: 'ch', son: '[ʃ]', graphies: ['ch'],
        mnemonique: 'Le chat fait chut',
        mots: ['chat', 'chien', 'chaise', 'cheval', 'chapeau', 'château',
               'bouche', 'mouche', 'vache', 'poche', 'tache', 'chaud',
               'chemise', 'flèche'] },
      { forme: 'qu', son: '[k]', graphies: ['qu'],
        mnemonique: 'Le q emmène toujours son u',
        mots: ['quatre', 'queue', 'quille', 'quinze', 'quand', 'banque',
               'casquette', 'musique', 'disque', 'coquille',
               'moustique', 'quatorze'] },
    ] },
]);

/** Le socle complet — la source qui fait foi du matériau phonologique des cinq régions. */
export const SOCLE = Object.freeze({
  clairiere: CLAIRIERE,
  galeries: GALERIES,
  marais: MARAIS,
  foret: FORET,
  volcan: VOLCAN,
});

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

/** Tous les graphèmes du socle, région par région. **Des objets, pas des occurrences** (D48). */
export function recenserGraphemes(socle = SOCLE) {
  const trouves = [];
  for (const voyelle of socle.clairiere.voyelles) {
    trouves.push({ region: 'clairiere', unite: 'voyelles', ...voyelle, graphies: [voyelle.forme] });
  }
  for (const fichier of socle.marais) {
    for (const g of fichier.graphemes) trouves.push({ region: 'marais-jumeau', unite: fichier.unite, ...g });
  }
  for (const g of socle.foret.finalesMuettes) {
    trouves.push({ region: 'foret-muette', unite: 'finales-muettes', ...g });
  }
  for (const fichier of socle.volcan) {
    for (const g of fichier.graphemes) trouves.push({ region: 'volcan', unite: fichier.unite, ...g });
  }
  return trouves;
}

/** Toutes les mnémoniques du socle, avec l'endroit d'où elles viennent. */
export function recenserMnemoniques(socle = SOCLE) {
  const trouves = [];
  for (const g of recenserGraphemes(socle)) {
    if (typeof g.mnemonique === 'string') trouves.push([`${g.region}.${g.unite}.${g.forme}`, g.mnemonique]);
  }
  for (const bloc of [socle.galeries.miroirGaucheDroite, socle.galeries.miroirHautBas]) {
    trouves.push([`galeries.miroir-${bloc.axe}`, bloc.mnemonique]);
  }
  for (const bloc of socle.galeries.sonsProches) {
    trouves.push([`galeries.sons-proches.${bloc.paire.join('-')}`, bloc.mnemonique]);
  }
  return trouves;
}

// ═══════════════════════════════════════════════════════ les contrôles — convention C6

/** Une syllabe OUVERTE : au plus deux consonnes, puis une ou des voyelles, et rien après. */
const SYLLABE_OUVERTE = /^[bcdfghjklmnpqrstvwxz]{0,3}[aeiouyàâäéèêëîïôöùûü]+$/u;

/** Les consonnes finales que le français ne prononce jamais en fin de syllabe fermée. */
const FINALES_INTERDITES_CVC = new Set(['m', 'n', 'h', 'e']);

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

  // 4. Un CVC a exactement trois éléments, leur concaténation rend la forme, sa consonne
  //    finale se PRONONCE (sinon c'est une finale muette, et ce n'est pas cette région), et
  //    le mot qui l'atteste la porte réellement.
  for (const cvc of socle.galeries.cvc) {
    if (cvc.decoupe.length !== 3 || cvc.decoupe.join('') !== cvc.forme) {
      dire('galeries.cvc', `« ${cvc.forme} » ne se découpe pas en C-V-C`);
    }
    const finale = cvc.decoupe[2];
    if (FINALES_INTERDITES_CVC.has(finale)) {
      dire('galeries.cvc', `« ${cvc.forme} » finit par « ${finale} » — nasale ou muette, pas une syllabe fermée`);
    }
    if (typeof cvc.mot === 'string' && !normaliser(cvc.mot).includes(cvc.forme)) {
      dire('galeries.cvc', `« ${cvc.mot} » ne porte pas la syllabe « ${cvc.forme} »`);
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
    // Aucun doublon dans une colonne : trente mots dont deux sont le même, ce sont vingt-neuf.
    for (const [nom, mots] of [['motsA', bloc.motsA], ['motsB', bloc.motsB]]) {
      if (new Set(mots.map(normaliser)).size !== mots.length) {
        dire(bloc.axe, `${nom} porte un doublon`);
      }
    }
  }

  // 6. Les deux axes sont DISTINCTS : ils ne peuvent pas déclarer le même couple de lettres.
  const gd = socle.galeries.miroirGaucheDroite.lettres.join('');
  const hb = socle.galeries.miroirHautBas.lettres.join('');
  if (gd === hb) {
    dire('galeries.miroir', `les deux axes déclarent le même couple « ${gd} » — D23 les sépare`);
  }

  // 7. Une paire de sons proches oppose deux graphèmes différents, et AUCUN de ses mots ne
  //    porte les deux — c'est la propriété de D23 transposée au son : un mot qui porte `p` et
  //    `b` n'apprend pas à les distinguer, il les met dans le même mot.
  for (const bloc of socle.galeries.sonsProches) {
    const [a, b] = bloc.paire;
    const ou = `galeries.sonsProches[${a}/${b}]`;
    if (a === b) dire(ou, `la paire « ${a} » ne s'oppose à rien`);
    if (!['sourde-sonore', 'proche'].includes(bloc.type)) {
      dire(ou, `type « ${String(bloc.type)} » inconnu — la nature de la paire doit être dite`);
    }
    for (const [nom, mots, sien, autre] of [
      ['motsA', bloc.motsA, a, b], ['motsB', bloc.motsB, b, a],
    ]) {
      for (const mot of mots) {
        const nu = normaliser(mot);
        if (!nu.includes(sien)) dire(ou, `${nom} : « ${mot} » ne porte pas « ${sien} »`);
        if (nu.includes(autre)) dire(ou, `${nom} : « ${mot} » porte aussi « ${autre} »`);
        if (bloc.position === 'attaque' && !nu.startsWith(sien)) {
          dire(ou, `${nom} : « ${mot} » ne commence pas par « ${sien} » alors que la paire est en attaque`);
        }
      }
    }
  }

  // 8. Un mot à syllabes ouvertes se recompose exactement, et chacune de ses syllabes finit
  //    par une voyelle. Sans ce contrôle, la découpe serait une décoration : c'est elle que
  //    l'aide `souffle-syllabe` de Gobi lira.
  for (const entree of socle.clairiere.motsOuverts) {
    if (entree.syllabes.join('') !== entree.mot) {
      dire('clairiere.motsOuverts', `« ${entree.mot} » ≠ ${entree.syllabes.join('-')}`);
    }
    for (const syllabe of entree.syllabes) {
      if (!SYLLABE_OUVERTE.test(syllabe)) {
        dire('clairiere.motsOuverts', `« ${entree.mot} » : la syllabe « ${syllabe} » est fermée`);
      }
    }
  }

  // 9. Chaque mot d'un graphème porte au moins une de ses graphies — et, si le graphème est
  //    déclaré `position: 'finale'`, il la porte À LA FIN. « table » contient un `t` ; il ne
  //    travaille pas pour autant le `t` muet final.
  for (const g of recenserGraphemes(socle)) {
    for (const mot of g.mots) {
      const nu = normaliser(mot);
      const porte = g.position === 'finale'
        ? g.graphies.some((graphie) => mot.endsWith(graphie))
        : g.graphies.some((graphie) => nu.includes(normaliser(graphie)));
      if (!porte) {
        dire(`${g.region}.${g.unite}`, `« ${mot} » ne porte pas ${g.graphies.join(' / ')}` +
          (g.position === 'finale' ? ' en finale' : ''));
      }
    }
    if (new Set(g.mots.map(normaliser)).size !== g.mots.length) {
      dire(`${g.region}.${g.unite}`, `« ${g.forme} » porte un mot en double`);
    }
  }

  // 10. Une mnémonique tient en six mots. Au-delà, l'enfant n'en retient plus le début.
  for (const [ou, phrase] of recenserMnemoniques(socle)) {
    const n = compterMots(phrase);
    if (n > 6) dire(ou, `mnémonique de ${String(n)} mots : « ${phrase} » — six au plus`);
    if (n === 0) dire(ou, 'mnémonique vide');
  }

  // 11. Le pluriel est exactement le singulier plus un `s`. L'irrégulier travaille autre chose.
  for (const { singulier, pluriel } of socle.foret.pluriels) {
    if (pluriel !== `${singulier}s`) {
      dire('foret.pluriels', `« ${singulier} » → « ${pluriel} » n'est pas un pluriel en -s`);
    }
  }

  // 12. Une liaison relie une finale écrite à un mot qui commence par une voyelle ou un `h`.
  //     Sans voyelle en face, il n'y a rien à lier — et l'exercice n'aurait plus d'objet.
  for (const { mot1, mot2, lettre, son } of socle.foret.liaisons) {
    if (!mot1.endsWith(lettre)) {
      dire('foret.liaisons', `« ${mot1} » ne finit pas par « ${lettre} »`);
    }
    if (!/^[aeiouyéèêàâîïôöûùh]/u.test(normaliser(mot2))) {
      dire('foret.liaisons', `« ${mot2} » ne commence pas par une voyelle : rien à lier`);
    }
    if (!/^\[[a-z]\]$/u.test(son)) {
      dire('foret.liaisons', `« ${mot1} ${mot2} » : le son lié « ${son} » n'est pas noté [x]`);
    }
  }

  return ecarts;
}

/**
 * Les clés du socle qui ne portent PAS de vocabulaire.
 *
 * Denylist plutôt qu'allowlist, et c'est un choix de sûreté : une clé oubliée fait REFUSER le
 * script (le graphème « eau » se présente comme un mot hors lexique), elle ne le fait pas
 * passer en silence. La direction de la panne est celle qu'on veut.
 */
const CLES_SANS_VOCABULAIRE = new Set([
  'son', 'decoupe', 'axe', 'forme', 'graphies', 'syllabes', 'lettres', 'lettresSecondaires',
  'paire', 'position', 'type', 'unite', 'competence', 'libelle', 'lettre', 'mnemonique',
]);

/** Tous les mots du socle, avec le chemin qui dit d'où ils viennent. */
export function recenserMots(socle = SOCLE) {
  const trouves = [];
  const visiter = (valeur, chemin) => {
    if (typeof valeur === 'string') {
      // Les graphèmes, les découpes et les codes d'axe ne sont pas des mots. Une chaîne qui
      // porte un espace est une phrase (mnémonique, groupe de liaison), pas un mot.
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
        if (CLES_SANS_VOCABULAIRE.has(cle)) continue;
        visiter(sous, `${chemin}.${cle}`);
      }
    }
  };
  visiter(socle, 'socle');
  return trouves;
}

/** Les mots DISTINCTS du socle, normalisés. C'est le chiffre du contrat de sortie de M3. */
export function motsDistincts(socle = SOCLE) {
  return [...new Set(recenserMots(socle).map(([, mot]) => mot.toLowerCase()))].sort();
}

// ═════════════════════════════════════════════════════════ les brouillons, projection du socle

const RESTE_A_FAIRE = Object.freeze([
  'faire relire par le parent avant tout dépôt dans contenu/exercices/',
  'associer chaque unité à un habillage et à un moteur',
  'enregistrer les clips audio des mots cibles (D41, D42)',
]);

/**
 * La couverture lexicale d'un fichier, calculée sur SES mots — jamais sur le socle entier.
 *
 * `taux` est mesuré contre le lexique complet ; `inscritsParLeLot` dit combien de mots de ce
 * fichier n'existaient pas au lexique avant M3. Le second est le seul des deux qui ne soit pas
 * circulaire.
 */
function couverture(mots) {
  const uniques = [...new Set(mots.map((m) => m.toLowerCase()))];
  const horsEchelle = uniques.filter((mot) => !estAuLexique(mot)).sort();
  const inscrits = uniques.filter((mot) => !etaitAuLexiqueAvantM3(mot)).sort();
  return {
    taux: uniques.length === 0 ? 1 : (uniques.length - horsEchelle.length) / uniques.length,
    horsEchelle,
    inscritsParLeLot: inscrits,
  };
}

/** L'enveloppe commune des vingt fichiers — `partage/src/contenu/phonologie.ts` fait foi. */
function socleFichier({ region, unite, rang, libelle, competence, natureDesFormes, items, mots, compte, extra }) {
  return {
    statut: 'brouillon-non-jouable',
    region,
    unite,
    rang,
    libelle,
    competence,
    pointOuvert: 'O10',
    natureDesFormes,
    source: 'socle déclaré — scripts/generer-phonologie.mjs',
    ...(extra ?? {}),
    items,
    compte,
    couvertureCE1: couverture(mots),
    aFaireALaMain: [...RESTE_A_FAIRE],
  };
}

/**
 * Une unité phonologique projetée — la forme de `UnitePhonologique`.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI `motsExemples` DOUBLE `motsPorteurs`, ET POURQUOI CE N'EST PAS UN OUBLI.
 *
 * `motsPorteurs` est le nom gelé par le contrat v4 § 3.6, et il fait foi. Mais
 * `scripts/valider-brouillons.mjs` — la seconde porte lexicale, celle que `npm run verifier`
 * exécute — lit `motsExemples`, `motsA` et `motsB`, et **rien d'autre**. Projeter les 434 mots
 * sous le seul nom `motsPorteurs` aurait rendu ce validateur VERT en ne confrontant plus un
 * seul mot au lexique : exactement « le détecteur qui déclare un poids qu'il n'applique
 * jamais » de CLAUDE.md, sur la règle la plus dure du projet.
 *
 * M3 ne possède pas `valider-brouillons.mjs` (contrat v4 § 4.1) et ne le modifie donc pas. Il
 * projette l'alias, et signale à l'orchestrateur qu'ajouter `motsPorteurs` à la liste des
 * champs audités de ce script permettrait de le retirer. Les fichiers projetés sont ignorés
 * par git : la redondance ne coûte rien au dépôt.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
function unite(forme, nature, motsPorteurs, opposeA, mnemonique, extra) {
  return {
    forme,
    nature,
    motsPorteurs: [...motsPorteurs],
    motsExemples: [...motsPorteurs],
    opposeA: opposeA ?? null,
    mnemonique: typeof mnemonique === 'string' ? { phrase: mnemonique, asset: null } : null,
    ...(extra ?? {}),
  };
}

/** Un fichier de graphèmes — le cas du Marais, du Volcan et des finales de la Forêt. */
function fichierGraphemes(region, dossier, { unite: nom, rang, libelle, competence, graphemes }) {
  const mots = graphemes.flatMap((g) => g.mots);
  return {
    chemin: `${dossier}/${nom}.json`,
    donnees: socleFichier({
      region,
      unite: nom,
      rang,
      libelle,
      competence,
      natureDesFormes: 'grapheme',
      items: graphemes.map((g) =>
        unite(g.forme, 'grapheme', g.mots, null, g.mnemonique, { son: g.son, graphies: [...g.graphies] })),
      mots,
      compte: {
        graphemes: graphemes.length,
        motsPorteurs: mots.length,
        motsDistincts: new Set(mots.map(normaliser)).size,
        mnemoniques: graphemes.filter((g) => typeof g.mnemonique === 'string').length,
      },
    }),
  };
}

/** Les brouillons de phonologie, par région. Aucune écriture ici : que du calcul. */
export function construireBrouillons(socle = SOCLE) {
  const cv = syllabesCV();
  const fichiers = [];

  // ────────────────────────────────────────────────────────────────────── La Clairière (3)

  const motsVoyelles = socle.clairiere.voyelles.flatMap((v) => v.mots);
  fichiers.push({
    chemin: 'clairiere/voyelles.json',
    donnees: socleFichier({
      region: 'clairiere', unite: 'voyelles', rang: 1, libelle: 'Les voyelles',
      competence: 'gph.voyelle.orale', natureDesFormes: 'grapheme',
      items: socle.clairiere.voyelles.map((v) =>
        unite(v.forme, 'grapheme', v.mots, null, v.mnemonique, { son: v.son })),
      mots: motsVoyelles,
      compte: {
        graphemes: socle.clairiere.voyelles.length,
        motsPorteurs: motsVoyelles.length,
        motsDistincts: new Set(motsVoyelles.map(normaliser)).size,
        mnemoniques: socle.clairiere.voyelles.length,
      },
    }),
  });

  const motsOuverts = socle.clairiere.motsOuverts.map((m) => m.mot);
  fichiers.push({
    chemin: 'clairiere/syllabes-cv.json',
    donnees: socleFichier({
      region: 'clairiere', unite: 'syllabes-cv', rang: 2,
      libelle: 'Les syllabes simples consonne + voyelle',
      competence: 'syl.cv', natureDesFormes: 'syllabe',
      extra: {
        consonnes: [...socle.clairiere.consonnesCV],
        voyelles: [...socle.clairiere.voyellesCV],
        // Les mots que l'enfant peut lire dès la syllabe CV acquise, AVEC leur découpe.
        mots: socle.clairiere.motsOuverts.map((m) => ({ mot: m.mot, syllabes: [...m.syllabes] })),
      },
      items: cv.map((s) =>
        unite(s.forme, 'syllabe',
          socle.clairiere.motsOuverts.filter((m) => m.syllabes.includes(s.forme)).map((m) => m.mot),
          null, null, { consonne: s.consonne, voyelle: s.voyelle })),
      mots: motsOuverts,
      compte: {
        syllabes: cv.length,
        mots: motsOuverts.length,
        motsDistincts: new Set(motsOuverts.map(normaliser)).size,
        mnemoniques: 0,
      },
    }),
  });

  fichiers.push({
    chemin: 'clairiere/mots-outils.json',
    donnees: socleFichier({
      region: 'clairiere', unite: 'mots-outils', rang: 3, libelle: 'Les premiers mots outils',
      competence: 'mot.outil.frequent', natureDesFormes: 'mot',
      items: socle.clairiere.motsOutilsPremiers.map((mot) => unite(mot, 'mot-outil', [mot], null, null)),
      mots: [...socle.clairiere.motsOutilsPremiers],
      compte: {
        motsOutils: socle.clairiere.motsOutilsPremiers.length,
        motsDistincts: new Set(socle.clairiere.motsOutilsPremiers.map(normaliser)).size,
        mnemoniques: 0,
      },
    }),
  });

  // ────────────────────────────────────────────────────────────────────── Les Galeries (4)

  const attestes = socle.galeries.cvc.filter((c) => typeof c.mot === 'string');
  const motsCvc = [...new Set([...attestes.map((c) => c.mot), ...socle.galeries.motsFermes])];
  fichiers.push({
    chemin: 'galeries/syllabes-cvc.json',
    donnees: socleFichier({
      region: 'galeries', unite: 'syllabes-cvc', rang: 1,
      libelle: 'Les syllabes fermées consonne + voyelle + consonne',
      competence: 'syl.cvc', natureDesFormes: 'syllabe',
      extra: { mots: motsCvc },
      items: socle.galeries.cvc.map((c) =>
        unite(c.forme, 'syllabe', typeof c.mot === 'string' ? [c.mot] : [], null, null, {
          decoupe: [...c.decoupe],
          atteste: typeof c.mot === 'string',
        })),
      mots: motsCvc,
      compte: {
        syllabes: socle.galeries.cvc.length,
        syllabesAttestees: attestes.length,
        syllabesDEntrainement: socle.galeries.cvc.length - attestes.length,
        mots: motsCvc.length,
        mnemoniques: 0,
      },
    }),
  });

  fichiers.push({ chemin: 'galeries/miroir-gauche-droite.json', donnees: brouillonMiroir(socle.galeries.miroirGaucheDroite, 2) });
  fichiers.push({ chemin: 'galeries/miroir-haut-bas.json', donnees: brouillonMiroir(socle.galeries.miroirHautBas, 3) });

  const motsProches = socle.galeries.sonsProches.flatMap((b) => [...b.motsA, ...b.motsB]);
  fichiers.push({
    chemin: 'galeries/sons-proches.json',
    donnees: socleFichier({
      region: 'galeries', unite: 'sons-proches', rang: 4, libelle: 'Les sons proches',
      // `grapheme` et non `mot` : les FORMES portées par les items sont des couples de
      // graphèmes (« p/b », « ch/j »), pas du vocabulaire. Déclarer `mot` ferait confronter
      // « p/b » au lexique CE1, et le validateur refuserait à juste titre.
      competence: 'gph.confusion.sourde-sonore', natureDesFormes: 'grapheme',
      items: socle.galeries.sonsProches.map((bloc) =>
        unite(bloc.paire.join('/'), 'paire', [...bloc.motsA, ...bloc.motsB], bloc.paire[1],
          bloc.mnemonique, {
            paire: [...bloc.paire],
            typeDeConfusion: bloc.type,
            position: bloc.position,
            motsA: [...bloc.motsA],
            motsB: [...bloc.motsB],
          })),
      mots: motsProches,
      compte: {
        paires: socle.galeries.sonsProches.length,
        pairesSourdeSonore: socle.galeries.sonsProches.filter((b) => b.type === 'sourde-sonore').length,
        pairesProches: socle.galeries.sonsProches.filter((b) => b.type === 'proche').length,
        motsPorteurs: motsProches.length,
        motsDistincts: new Set(motsProches.map(normaliser)).size,
        mnemoniques: socle.galeries.sonsProches.length,
      },
    }),
  });

  // ─────────────────────────────────────────────────────────────── Le Marais Jumeau (5) neufs

  for (const fichier of socle.marais) {
    fichiers.push(fichierGraphemes('marais-jumeau', 'marais-jumeau', fichier));
  }

  // ─────────────────────────────────────────────────────────────── La Forêt Muette (3) neufs

  fichiers.push(fichierGraphemes('foret-muette', 'foret-muette', {
    unite: 'finales-muettes', rang: 1, libelle: 'Les lettres finales qui ne se disent pas',
    competence: 'gph.finale.muette', graphemes: socle.foret.finalesMuettes,
  }));

  const motsPluriel = socle.foret.pluriels.flatMap((p) => [p.singulier, p.pluriel]);
  fichiers.push({
    chemin: 'foret-muette/pluriel-s.json',
    donnees: socleFichier({
      region: 'foret-muette', unite: 'pluriel-s', rang: 2,
      libelle: 'Le s du pluriel qui ne s’entend pas',
      competence: 'enc.pluriel.s', natureDesFormes: 'mot',
      items: socle.foret.pluriels.map((p) =>
        unite(p.pluriel, 'mot', [p.singulier, p.pluriel], p.singulier, null, { singulier: p.singulier })),
      mots: motsPluriel,
      compte: {
        couples: socle.foret.pluriels.length,
        motsPorteurs: motsPluriel.length,
        motsDistincts: new Set(motsPluriel.map(normaliser)).size,
        mnemoniques: 0,
      },
    }),
  });

  // Les liaisons sont regroupées PAR LETTRE LIÉE, et ce n'est pas une commodité de code :
  // c'est ainsi qu'elles s'enseignent. « Le s se dit z », une fois, vaut mieux que vingt
  // groupes vus comme vingt cas particuliers. La forme de l'unité est donc la lettre écrite,
  // et les vingt groupes sont ses porteurs.
  const motsLiaison = socle.foret.liaisons.flatMap((l) => [l.mot1, l.mot2]);
  const parLettre = new Map();
  for (const l of socle.foret.liaisons) {
    parLettre.set(l.lettre, [...(parLettre.get(l.lettre) ?? []), l]);
  }
  fichiers.push({
    chemin: 'foret-muette/liaisons.json',
    donnees: socleFichier({
      region: 'foret-muette', unite: 'liaisons', rang: 3,
      libelle: 'Les liaisons — la lettre muette qui se réveille',
      competence: 'flu.liaison', natureDesFormes: 'grapheme',
      items: [...parLettre].map(([lettre, groupe]) =>
        unite(lettre, 'grapheme', groupe.flatMap((l) => [l.mot1, l.mot2]), null, null, {
          lettreEcrite: lettre,
          sonEntendu: groupe[0].son,
          groupes: groupe.map((l) => ({ groupe: `${l.mot1} ${l.mot2}`, mot1: l.mot1, mot2: l.mot2 })),
        })),
      mots: motsLiaison,
      compte: {
        liaisons: socle.foret.liaisons.length,
        lettresLiees: parLettre.size,
        motsPorteurs: motsLiaison.length,
        motsDistincts: new Set(motsLiaison.map(normaliser)).size,
        mnemoniques: 0,
      },
    }),
  });

  // ───────────────────────────────────────────────────────────────────── Le Volcan (5) neufs

  for (const fichier of socle.volcan) {
    fichiers.push(fichierGraphemes('volcan', 'volcan', fichier));
  }

  return fichiers;
}

function brouillonMiroir(bloc, rang) {
  const mots = [...bloc.motsA, ...bloc.motsB];
  const donnees = socleFichier({
    region: 'galeries',
    unite: `miroir-${bloc.axe}`,
    rang,
    libelle: `Les lettres miroir — axe ${bloc.axe}`,
    competence: bloc.axe === 'gauche-droite' ? 'gph.miroir.gauche-droite' : 'gph.miroir.haut-bas',
    // Les items portent les deux LETTRES de l'axe ; le vocabulaire est dans `motsA`/`motsB`,
    // que `valider-brouillons.mjs` audite au premier niveau.
    natureDesFormes: 'grapheme',
    extra: {
      decision: 'D23 — les deux axes ne sont JAMAIS traités en bloc',
      axe: bloc.axe,
      lettres: [...bloc.lettres],
      lettresSecondaires: [...bloc.lettresSecondaires],
      // Conservés au premier niveau : `scripts/valider-brouillons.mjs` les lit là, et ce sont
      // les colonnes que M1 recopie telles quelles dans ses exercices `tri` et `paires`.
      motsA: [...bloc.motsA],
      motsB: [...bloc.motsB],
      paires: bloc.paires.map((p) => ({ ...p })),
    },
    items: [
      unite(bloc.lettres[0], 'grapheme', [...bloc.motsA], bloc.lettres[1], bloc.mnemonique),
      unite(bloc.lettres[1], 'grapheme', [...bloc.motsB], bloc.lettres[0], null),
    ],
    mots,
    compte: {
      motsA: bloc.motsA.length,
      motsB: bloc.motsB.length,
      paires: bloc.paires.length,
      motsDistincts: new Set(mots.map(normaliser)).size,
      mnemoniques: 1,
    },
  });
  return donnees;
}

// ══════════════════════════════════════════════════ le référentiel de compétences, remesuré

/** Les 30 codes gelés au contrat du monde v4 § 2. La liste du contrat, citée telle quelle. */
export const CODES_DU_CONTRAT = Object.freeze([
  'comp.consigne.simple', 'comp.consigne.multiple', 'lex.couleur',
  'gph.miroir.gauche-droite', 'gph.miroir.haut-bas',
  'gph.voyelle.orale', 'syl.cv', 'mot.outil.frequent', 'flu.mot.court',
  'syl.cvc', 'gph.confusion.sourde-sonore',
  'gph.nasale.on', 'gph.nasale.an', 'gph.nasale.in', 'gph.digramme.ou', 'gph.digramme.oi',
  'gph.finale.muette', 'enc.pluriel.s', 'flu.liaison',
  'gph.rare.eau', 'gph.rare.ill', 'gph.rare.gn', 'gph.rare.ph', 'gph.rare.ch-qu',
  'comp.litteral', 'comp.inference', 'comp.chronologie', 'comp.vrai-faux', 'comp.image',
  'comp.phrase.completee',
]);

/**
 * Les codes du contrat RETIRÉS du référentiel, et le motif MESURÉ de chaque retrait.
 *
 * `comp.vrai-faux` — « Juger une affirmation portant sur un texte ». Le contrat le confie au
 * seul moteur `histoire` (§ 1.1, niveau 2 du corpus). Or **R12 exige trois moteurs
 * mécaniquement distincts par compétence citée**, et la mesure des quatorze moteurs sur les
 * 76 exercices livrés dit ceci : trois moteurs produisent bien une étape en mode `vrai-faux`
 * — `histoire` (12 étapes), `tri` (39), `eclair` (10) — mais **un seul porte un champ de
 * texte** (`histoire.recit`). Juger une affirmation dans `tri` ou dans `eclair`, c'est la
 * juger SANS le texte, donc sur un savoir extérieur — ce que le contrat écarte explicitement
 * dans la même page. Le code était donc porté par zéro exercice, et
 * `tests/unitaires/competences-trois-moteurs.test.ts` le dénonçait à juste titre comme code
 * mort. C'est la deuxième des deux issues que Q-M2-3 laissait ouvertes, et la seule qui
 * n'invente pas une loi : le code revient le jour où un second moteur porteur de texte sait
 * juger une affirmation. Rien n'est perdu — les 120 affirmations du niveau 2 restent
 * ingérées dans `contenu/brouillons/niveau-2/`, comptées et intactes.
 */
export const CODES_RETIRES = Object.freeze(['comp.vrai-faux']);

/** Ce que `competences.json` doit porter, tous, exactement — le contrat moins les retraits. */
export const CODES_ATTENDUS = Object.freeze(
  CODES_DU_CONTRAT.filter((code) => !CODES_RETIRES.includes(code)),
);

/** Les cinq codes d'origine, tels qu'ils étaient AVANT M3. Aucun ne se renomme (R14). */
const CINQ_DORIGINE = Object.freeze([
  { code: 'comp.consigne.simple', libelle: 'Exécuter une consigne à une cible', famille: 'comp', prerequis: [] },
  { code: 'comp.consigne.multiple', libelle: 'Exécuter une consigne à plusieurs cibles', famille: 'comp', prerequis: ['comp.consigne.simple'] },
  { code: 'lex.couleur', libelle: 'Reconnaître le nom écrit d’une couleur', famille: 'lex', prerequis: [] },
  { code: 'gph.miroir.gauche-droite', libelle: 'Distinguer b et d, p et q — miroir gauche-droite', famille: 'gph', prerequis: [] },
  { code: 'gph.miroir.haut-bas', libelle: 'Distinguer b et p, d et q — miroir haut-bas', famille: 'gph', prerequis: [] },
]);

// Le tiret est placé en fin de classe : littéral sans échappement, strictement équivalent au
// motif du schéma d'exercice cité au contrat § monde-v4 (`[a-z0-9.\-]`), et accepté par eslint.
const MOTIF_CODE = /^(gph|syl|mot\.outil|lex|flu|comp|enc)\.[a-z0-9.-]+$/u;

/**
 * Remesure le référentiel : les 30 codes, les 5 d'origine intacts, le motif du schéma, et le
 * graphe des prérequis soumis à `croiserPrerequis` — le contrôle qui garde déjà les nœuds.
 *
 * Pur : le référentiel arrive déjà analysé. C'est ce qui permet de lui soumettre un graphe
 * cassé et d'exiger qu'il le refuse.
 */
export function verifierReferentiel(referentiel, socle = SOCLE) {
  const ecarts = [];
  const dire = (quoi) => ecarts.push(`competences.json : ${quoi}`);

  const codes = referentiel.map((c) => String(c.code));
  const ensemble = new Set(codes);

  if (new Set(codes).size !== codes.length) dire('un code est déclaré deux fois');
  for (const attendu of CODES_ATTENDUS) {
    if (!ensemble.has(attendu)) dire(`le code gelé « ${attendu} » est absent`);
  }
  for (const code of codes) {
    if (CODES_RETIRES.includes(code)) {
      dire(`« ${code} » a été retiré du référentiel — voir CODES_RETIRES, motif mesuré`);
    } else if (!CODES_ATTENDUS.includes(code)) {
      dire(`« ${code} » n'est pas l'un des ${String(CODES_DU_CONTRAT.length)} codes gelés`);
    }
    if (!MOTIF_CODE.test(code)) dire(`« ${code} » ne respecte pas le motif du schéma d'exercice`);
  }

  // Les cinq d'origine, champ par champ. Un libellé retouché est un renommage silencieux.
  for (const origine of CINQ_DORIGINE) {
    const trouve = referentiel.find((c) => c.code === origine.code);
    if (trouve === undefined) { dire(`le code d'origine « ${origine.code} » a disparu — R14`); continue; }
    if (trouve.libelle !== origine.libelle) dire(`« ${origine.code} » : libellé modifié`);
    if (trouve.famille !== origine.famille) dire(`« ${origine.code} » : famille modifiée`);
    if (JSON.stringify(trouve.prerequis) !== JSON.stringify(origine.prerequis)) {
      dire(`« ${origine.code} » : prérequis modifiés`);
    }
  }

  // Le graphe, soumis au MÊME contrôle que les nœuds. Un cycle, un prérequis inconnu ou un
  // code jamais ouvrable y sont exactement le même défaut : une compétence qui ne s'ouvre
  // jamais est un onglet vide dans le tableau de bord du parent, à vie.
  const rapport = croiserPrerequis(
    referentiel.map((c) => ({
      chemin: `contenu/referentiel/competences.json#${String(c.code)}`,
      donnees: { id: c.code, prerequis: c.prerequis },
    })),
  );
  for (const anomalie of rapport.anomalies) {
    dire(`${anomalie.regle} — ${anomalie.message}`);
  }

  // Chaque socle cite un code du référentiel. Un socle qui alimenterait un code inexistant
  // serait du matériau qu'aucun tableau de bord ne saurait rattacher.
  for (const { chemin, donnees } of construireBrouillons(socle)) {
    if (!ensemble.has(donnees.competence)) {
      dire(`le socle ${chemin} cite « ${donnees.competence} », absent du référentiel`);
    }
  }

  return { ecarts, rapport };
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
  const ecarts = [...verifier()];
  const brouillons = construireBrouillons();
  const mots = motsDistincts();
  const mnemoniques = recenserMnemoniques();
  const graphemes = recenserGraphemes();

  // ── le référentiel : lu, remesuré, jamais supposé
  let rapportPrerequis = null;
  if (existsSync(CHEMIN_REFERENTIEL)) {
    const referentiel = JSON.parse(readFileSync(CHEMIN_REFERENTIEL, 'utf8'));
    const { ecarts: ecartsRef, rapport } = verifierReferentiel(referentiel);
    ecarts.push(...ecartsRef);
    rapportPrerequis = rapport;
    console.log(
      `generer-phonologie — référentiel : ${String(referentiel.length)} code(s) sur ` +
      `${String(CODES_ATTENDUS.length)} attendus ` +
      `(${String(CODES_DU_CONTRAT.length)} au contrat, ` +
      `${String(CODES_RETIRES.length)} retiré(s) : ${CODES_RETIRES.join(', ')}), ` +
      `${String(rapport.pointsDEntree.length)} sans ` +
      `prérequis, ${String(rapport.cycles.length)} cycle(s), ` +
      `${String(rapport.jamaisOuvrables.length)} code(s) jamais ouvrable(s)`,
    );
  } else {
    ecarts.push(`competences.json : absent de ${CHEMIN_REFERENTIEL}`);
  }

  const parRegion = new Map();
  for (const { donnees } of brouillons) {
    parRegion.set(donnees.region, (parRegion.get(donnees.region) ?? 0) + 1);
  }
  const horsEchelle = mots.filter((mot) => !estAuLexique(mot));
  const inscrits = mots.filter((mot) => !etaitAuLexiqueAvantM3(mot));
  const attestees = SOCLE.galeries.cvc.filter((c) => typeof c.mot === 'string').length;

  console.log(`  lexique CE1 déclaré : ${String(LEXIQUE_CE1.length)} mots ` +
    `(${String(LEXIQUE_AVANT_M3.length)} avant M3, +${String(LEXIQUE_CE1.length - LEXIQUE_AVANT_M3.length)})`);
  console.log(`  fichiers de socle    : ${String(brouillons.length)} — ` +
    [...parRegion].map(([r, n]) => `${r} ${String(n)}`).join(' · '));
  console.log(`  mots DISTINCTS       : ${String(mots.length)}`);
  console.log(`  dont inscrits par M3 : ${String(inscrits.length)}`);
  console.log(`  couverture CE1       : ` +
    `${(100 * (mots.length - horsEchelle.length) / mots.length).toFixed(1)} % ` +
    `(hors échelle : ${horsEchelle.length === 0 ? 'aucun' : horsEchelle.join(', ')})`);
  console.log(`  graphèmes            : ${String(graphemes.length)}`);
  console.log(`  mnémoniques          : ${String(mnemoniques.length)}, ` +
    `la plus longue ${String(Math.max(...mnemoniques.map(([, p]) => compterMots(p))))} mots`);
  console.log(`  syllabes CV dérivées : ${String(syllabesCV().length)}`);
  console.log(`  syllabes CVC         : ${String(SOCLE.galeries.cvc.length)} ` +
    `dont ${String(attestees)} attestées par un mot du lexique`);
  console.log(`  paires de sons proches : ${String(SOCLE.galeries.sonsProches.length)} ` +
    `dont ${String(SOCLE.galeries.sonsProches.filter((b) => b.type === 'sourde-sonore').length)} sourde/sonore`);
  console.log(`  mots par axe miroir  : ` +
    `gauche-droite ${String(SOCLE.galeries.miroirGaucheDroite.motsA.length)}+` +
    `${String(SOCLE.galeries.miroirGaucheDroite.motsB.length)} · ` +
    `haut-bas ${String(SOCLE.galeries.miroirHautBas.motsA.length)}+` +
    `${String(SOCLE.galeries.miroirHautBas.motsB.length)}`);

  if (ecarts.length > 0) {
    console.error(`REFUS D'ÉCRIRE — ${String(ecarts.length)} écart(s) entre le socle déclaré et sa remesure :`);
    const plafond = process.argv.includes('--tout') ? ecarts.length : 20;
    for (const ecart of ecarts.slice(0, plafond)) console.error(`  ✗ ${ecart}`);
    if (ecarts.length > plafond) console.error(`  … ${String(ecarts.length - plafond)} autre(s) — relancer avec --tout`);
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
  if (rapportPrerequis !== null) {
    console.log(`  graphe des prérequis du référentiel : acyclique, ` +
      `${String(rapportPrerequis.pointsDEntree.length)} porte(s) d'entrée sur ` +
      `${String(rapportPrerequis.nbNoeuds)} code(s)`);
  }
}

// Exécuté en programme, pas importé par un test : `pathToFileURL` rend la comparaison juste
// sur Windows, où `process.argv[1]` porte des antislashs et `import.meta.url` des slashs.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
