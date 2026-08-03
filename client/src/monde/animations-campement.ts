// Les animations du campement — R11 (« 10 animations uniques »), lot S5.
//
// ── LE DÉFAUT QUE CE MODULE SOLDE, ET IL ÉTAIT MESURABLE ────────────────────────────────────
//
// `contenu/monde/campement.json` déclare `animationUnique: true` sur **14 points**, et
// `PointLibre` posait fidèlement `data-animation-unique="oui"` sur ces quatorze-là. Deux tests
// les comptaient — `EcranCampement.test.tsx` dans le DOM, `parcours-campement.spec.ts` dans le
// navigateur — et les deux étaient verts.
//
// Sauf que les quatorze faisaient **exactement la même chose** : `transform: scale(1.06)` et un
// halo de soleil, écrits en dur dans `PointLibre`. Mesuré avant écriture :
//
//     points déclarant animationUnique         = 14
//     animations distinctes réellement rendues =  1
//     exigées par R11                          = 10
//
// C'est très précisément le mode de défaillance que CLAUDE.md nomme « un détecteur qui déclare
// un poids qu'il n'applique jamais » : l'attribut est le témoin d'une propriété que rien ne
// produit. La QA comptait le témoin. R11 ne demande pas quatorze attributs, elle demande que le
// campement RÉPONDE différemment selon ce qu'on touche — c'est la seule chose qui distingue un
// lieu d'un menu (D45).
//
// ── LA RÈGLE DE CHOIX, ET POURQUOI ELLE EST ÉDITORIALE ──────────────────────────────────────
//
// Une empreinte de l'identifiant a été essayée d'abord, parce qu'elle ne demande aucune table.
// Mesurée sur le fichier réel (`bac-a-sable/s5-campement/mesurer-repartition.mjs`) :
//
//     animations distinctes (empreinte sur 16 noms) = 11 sur 14
//
// Onze pour dix exigées : ça passe, avec une marge d'un seul point, et surtout **une tente
// tremblait comme un papillon**. Le mouvement d'un objet n'est pas une valeur de hachage : un
// carillon se balance, une bannière ondule, une étoile file. La table ci-dessous est donc
// ÉDITORIALE, et l'empreinte n'en est plus que le REPLI — un point neuf ajouté au fichier de
// contenu bouge quand même, sans qu'une ligne de code soit nécessaire pour qu'il réagisse.
//
// Ce module est PUR : aucune horloge, aucun aléa, aucune requête, aucun DOM. C'est ce qui
// permet à `tests/unitaires/campement-animations-uniques.test.ts` de le mesurer sur le fichier
// de contenu réel sans monter un écran.

/**
 * Les dix-huit mouvements du campement.
 *
 * Chacun a **son `@keyframes pierre-campement-<nom>` et sa classe `.anim-campement-<nom>`**
 * dans `client/src/styles/global.css`. Cette correspondance n'est pas une convention de
 * politesse : un nom sans keyframes produirait une classe inerte, c'est-à-dire exactement le
 * défaut d'origine sous un autre habit. `campement-animations-uniques.test.ts` lit la feuille
 * de style et échoue si un seul nom d'ici n'y est pas défini **deux fois** (keyframes + classe).
 */
export const ANIMATIONS_CAMPEMENT = [
  'sursaut',
  'balancier',
  'bascule',
  'pulsation',
  'bouillon',
  'gonflement',
  'deroulement',
  'etirement',
  'glissade',
  'flottement',
  'ondulation',
  'scintillement',
  'envol',
  'filante',
  'secousse',
  'rebond',
  'frisson',
  'bond'
] as const;

export type AnimationCampement = (typeof ANIMATIONS_CAMPEMENT)[number];

/**
 * Le mouvement de chaque point, choisi sur ce que l'objet EST.
 *
 * Les quatorze points qui déclarent `animationUnique` reçoivent quatorze mouvements
 * **distincts** — c'est la marge sur les dix de R11, et elle est mesurée, pas espérée. Les
 * seize autres réutilisent librement le même vocabulaire : R11 ne leur demande rien de plus
 * que de réagir.
 */
export const ANIMATION_DU_POINT: Readonly<Record<string, AnimationCampement>> = {
  // ── les quatorze `animationUnique`, un mouvement chacun ────────────────────────────────
  tente: 'gonflement',
  feu: 'pulsation',
  carte: 'deroulement',
  coffre: 'sursaut',
  'mur-des-noms': 'etirement',
  chaudron: 'bouillon',
  lunette: 'glissade',
  'hamac-de-gobi': 'flottement',
  banniere: 'ondulation',
  carillon: 'balancier',
  lanterne: 'bascule',
  'bocal-de-lucioles': 'scintillement',
  papillon: 'envol',
  'etoile-filante': 'filante',

  // ── les seize autres, qui réagissent aussi : « toucher ne coûte rien » (R11) ────────────
  marmite: 'bouillon',
  'tas-de-bois': 'secousse',
  seau: 'bascule',
  'corde-a-linge': 'ondulation',
  tabouret: 'sursaut',
  'panier-de-pommes': 'rebond',
  'sac-de-graines': 'secousse',
  'livre-ouvert': 'deroulement',
  'plume-et-encrier': 'glissade',
  'galets-empiles': 'etirement',
  champignon: 'gonflement',
  buisson: 'frisson',
  'fleur-bleue': 'gonflement',
  escargot: 'glissade',
  grenouille: 'bond',
  'pierre-gravee': 'scintillement'
};

/**
 * Empreinte FNV-1a 32 bits — déterministe, pure, sans `Math.random`.
 *
 * Elle ne sert qu'au REPLI : un point ajouté au fichier de contenu et absent de la table
 * ci-dessus doit quand même bouger. Un point qui ne réagirait pas serait « un décor où le clic
 * ne fait rien », et le fichier de contenu n'a aucun moyen de savoir qu'il vient d'en créer un.
 */
export function empreinte(texte: string): number {
  let valeur = 0x811c9dc5;
  for (let rang = 0; rang < texte.length; rang += 1) {
    valeur ^= texte.charCodeAt(rang);
    valeur = Math.imul(valeur, 0x01000193) >>> 0;
  }
  return valeur;
}

/** Le mouvement d'un point : la table d'abord, l'empreinte en repli. Jamais `undefined`. */
export function animationDuPoint(id: string): AnimationCampement {
  const declaree = ANIMATION_DU_POINT[id];
  if (declaree !== undefined) return declaree;
  return ANIMATIONS_CAMPEMENT[empreinte(id) % ANIMATIONS_CAMPEMENT.length]!;
}

/** La classe CSS qui porte le mouvement. Une seule forme, pour qu'aucun appelant n'en invente. */
export function classeAnimation(nom: AnimationCampement): string {
  return `anim-campement-${nom}`;
}

/**
 * Durée du cycle de l'invitation au repos, en secondes. Doit valoir la durée écrite dans
 * `@keyframes pierre-campement-invite` ; le test la relit dans la feuille plutôt que de la
 * croire, parce que deux valeurs qui se répondent finissent toujours par diverger.
 */
export const CYCLE_INVITE_S = 9;

/**
 * Le décalage de phase de l'invitation, en secondes.
 *
 * ── POURQUOI DÉCALER, ET POURQUOI C'EST LA RÉPONSE À R18 ────────────────────────────────
 * Le père n'a pas compris le campement. Le défaut n'est pas le dessin — M8 l'a refait — c'est
 * que les trente prises sont des `<button>` **totalement invisibles** posés sur une image de
 * fond : `background: transparent`, `border: none`. Rien, absolument rien, ne dit à l'enfant
 * que ces objets répondent au doigt. « Ça se comprend sans qu'un adulte explique » (R18) ne
 * peut pas tenir contre une affordance nulle.
 *
 * Trente halos permanents auraient résolu l'affordance en créant le défaut de D45 : un menu
 * déguisé. Trente halos **déphasés** sur un cycle de neuf secondes en laissent deux ou trois
 * allumés à la fois, au hasard apparent du décor : le campement a l'air VIVANT, et l'enfant
 * apprend en trois secondes que ce qui brille se touche — puis que tout se touche.
 *
 * La phase est tirée de l'identifiant, donc stable d'un rendu à l'autre : un halo qui sauterait
 * d'un objet à l'autre à chaque re-rendu serait un scintillement, pas une invitation.
 *
 * ── LA FINESSE DE LA GRILLE EST MESURÉE, PAS SUPPOSÉE. Une première version tirait la phase
 * sur quarante crans ; sur les trente points réels du campement, elle ne rendait que **vingt
 * phases distinctes** — dix objets clignotaient donc à l'unisson d'un autre, ce qui est
 * exactement l'effet « grille de boutons » qu'on cherche à éviter. La grille au millième de
 * seconde rend 30 phases distinctes sur 30, et le test le vérifie sur le fichier réel plutôt
 * que de croire ce commentaire.
 */
export function phaseInvite(id: string): number {
  const crans = CYCLE_INVITE_S * 1000;
  return -((empreinte(id) % crans) / 1000);
}
