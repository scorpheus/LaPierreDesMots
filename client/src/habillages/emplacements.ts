/**
 * DÉRIVER DES EMPLACEMENTS LISIBLES DEPUIS UN HABILLAGE — R47, tranché par R52.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LA CONTRAINTE QUI A DÉCIDÉ DE TOUT
 *
 * « Ajouter un habillage ne doit demander AUCUNE ligne de code » (v2 § 7). C'est l'axe
 * moteur × habillage × contenu, et il porte R12 et R13. Une conception où chaque décor
 * réclamerait ses coordonnées à la main tuerait la variété avant de la produire.
 *
 * Ce module ne connaît donc AUCUN décor : ni forme, ni nom, ni coordonnée. Il ne lit que ce que
 * `*.habillage.json` déclare déjà — `role: "coloriable"`, `centroide`, `surface`, `viewBox` — et
 * il rend N emplacements en pixels pour N mots. Les quatre habillages de `phrase` en déclarent
 * respectivement 9, 10, 9 et 10 : la matière est là depuis le lot M6, personne ne l'exploitait.
 *
 * ── POURQUOI LE CENTROÏDE EST LE BON POINT, ET PAS UN COMPROMIS ───────────────────────────────
 * Le centroïde d'une région est son point le plus INTÉRIEUR : un mot posé là est loin des traits
 * qui la bordent, donc sur une plage de couleur unie. C'est exactement ce que `MoteurPlace` fait
 * déjà de ses `ZoneCible.centroide` — le précédent qui marche dans le dépôt.
 *
 * ── LA SURFACE EST LE CRITÈRE DE CHOIX, ET ELLE EST DÉJÀ ÉCRITE ───────────────────────────────
 * Quand il faut N régions parmi neuf, on prend les N plus GRANDES. Une grande région tient un
 * mot entier sans le pousser sur son voisin, et son centroïde est plus loin des bords. Le
 * critère est un champ du fichier, pas un jugement.
 *
 * ── CE QUE LA GÉOMÉTRIE NE PEUT PAS GARANTIR, ET QU'ON MESURE DONC ────────────────────────────
 * Deux centroïdes peuvent être proches ; un mot long est plus large que son point. Rien dans le
 * fichier ne l'empêche. Une relaxation DÉTERMINISTE écarte les boîtes qui se chevauchent, puis
 * les ramène dans les bornes. Elle rend son propre compte de chevauchements restants : le lot
 * n'affirme pas « c'est lisible », il cite un `0`.
 *
 * « La lisibilité l'emporte sur la mise en scène » — le père, R52. Le clampage a donc le dernier
 * mot sur le centroïde : un mot hors de l'écran est un défaut, pas un parti pris.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

// `NUANCIER` et `PALETTE` sont importés comme VALEURS, et c'est délibéré : les hexadécimaux
// qui disent quelles couleurs sont indistinguables de la Grisaille doivent venir de la source
// qui fait foi, jamais d'une recopie. Une recopie diverge — c'est le défaut des deux listes de
// polices, et celui que `chargeur.ts` documente déjà à propos de `global.css`.
import { NUANCIER, PALETTE } from '@pierre/partage';
import type { Habillage } from '@pierre/partage';

// ------------------------------------------------------------------ types

export interface Cadre {
  readonly largeur: number;
  readonly hauteur: number;
}

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

export interface Boite {
  readonly largeur: number;
  readonly hauteur: number;
}

/** Le rectangle où un mot a le droit d'atterrir, en pixels du cadre. */
export interface Bornes {
  readonly xMin: number;
  readonly yMin: number;
  readonly xMax: number;
  readonly yMax: number;
}

export interface RegionDHabillage {
  readonly id: string;
  readonly libelle: string;
  readonly centroide: readonly [number, number];
  readonly surface: number;
  /**
   * Rang dans l'ordre des surfaces décroissantes, sur TOUTES les régions de l'habillage.
   * C'est lui qui choisit la couleur au nuancier : la teinte d'une région est donc une
   * propriété de la région, stable d'une consigne à l'autre.
   */
  readonly rang: number;
}

export interface Emplacement {
  /** La clé confiée par l'appelant — pour `phrase`, un `IdEtiquette`. */
  readonly cle: string;
  /** La région que ce mot rallume quand il est correctement placé. `null` si aucune. */
  readonly region: string | null;
  readonly libelleRegion: string;
  /** Couleur CSS à poser sur la région, prise au nuancier de l'habillage. */
  readonly couleur: string;
  /** Centre de la pastille, en pixels du cadre. */
  readonly x: number;
  readonly y: number;
  readonly boite: Boite;
}

export interface ResultatDerivation {
  readonly emplacements: readonly Emplacement[];
  /** Paires de pastilles encore en chevauchement après relaxation. **Doit valoir 0.** */
  readonly chevauchements: number;
  /** Pastilles dont la boîte sort des bornes. **Doit valoir 0.** */
  readonly horsBornes: number;
  /** Mots servis par une région réellement dessinée à l'écran. */
  readonly surRegion: number;
  /** Jetons tombés sur le repli, faute de région disponible. */
  readonly surGrille: number;
  readonly iterations: number;
  /**
   * Comment la scène a été composée.
   *
   * `'regions'` — chaque jeton est posé au centroïde de la région qu'il rallume. C'est le cas
   * nominal, et c'est lui qui porte le lien « je prends ce mot, CETTE zone se rallume ».
   *
   * `'lignes'` — les centroïdes étaient trop serrés pour les boîtes : on a tout rangé en
   * lignes pour qu'aucun jeton n'en recouvre un autre. Le lien visuel est perdu ; la
   * lisibilité et la justesse du tap sont gardées. **La lisibilité l'emporte sur la mise en
   * scène** — le père, R52.
   */
  readonly repli: 'regions' | 'lignes';
  /**
   * Vrai quand même le rangement en lignes ne tient pas dans les bornes : il y a plus de
   * jetons — ou des jetons plus larges — que la place n'en peut porter.
   *
   * **C'est une trouvaille, pas un échec.** Aucun algorithme ne peut placer sans chevauchement
   * ce qui ne rentre pas ; le remède est alors ailleurs — moins de jetons à l'écran, ou des
   * libellés plus courts, et c'est une décision de CONTENU.
   */
  readonly deborde: boolean;
}

// ------------------------------------------------------------------ lecture de l'habillage

/**
 * `viewBox` est une chaîne dans le JSON, comme dans le SVG. On la lit ici, une fois.
 * Un habillage sans `viewBox` exploitable ne fait pas échouer le jeu : il rend un carré
 * neutre, jamais emprunté à un décor — même convention que `ScenePlace.VIEWBOX_PAR_DEFAUT`.
 */
export const VIEWBOX_PAR_DEFAUT: ViewBox = { x: 0, y: 0, largeur: 100, hauteur: 100 };

export function lireViewBox(texte: string): ViewBox {
  const nombres = texte
    .trim()
    .split(/[\s,]+/u)
    .map((morceau) => Number.parseFloat(morceau));
  if (nombres.length < 4 || nombres.some((n) => !Number.isFinite(n))) {
    return VIEWBOX_PAR_DEFAUT;
  }
  const [x, y, largeur, hauteur] = nombres as [number, number, number, number];
  if (largeur <= 0 || hauteur <= 0) return VIEWBOX_PAR_DEFAUT;
  return { x, y, largeur, hauteur };
}

/**
 * Les régions coloriables de l'habillage, dans l'ordre des SURFACES DÉCROISSANTES.
 *
 * Recensées par OBJET : on énumère les calques dont le `role` vaut `coloriable`, on aplatit,
 * et on dédoublonne par `id`. Chercher un motif dans le SVG compterait des occurrences, et un
 * `<path>` sans `id` échapperait au recensement sans que rien ne le dise.
 */
export function regionsColoriables(habillage: Habillage): readonly RegionDHabillage[] {
  const vues = new Set<string>();
  const brutes: { id: string; libelle: string; centroide: readonly [number, number]; surface: number }[] =
    [];

  for (const calque of habillage.scene.calques) {
    if (calque.role !== 'coloriable') continue;
    for (const region of calque.regions) {
      const id = String(region.id);
      if (vues.has(id)) continue;
      vues.add(id);
      brutes.push({
        id,
        libelle: region.libelle,
        centroide: region.centroide,
        surface: Number.isFinite(region.surface) ? region.surface : 0,
      });
    }
  }

  // Tri par surface décroissante. `id` départage : sans lui, deux régions de même aire
  // pourraient s'échanger d'une exécution à l'autre et la couleur d'une zone changerait
  // toute seule.
  brutes.sort((a, b) => (b.surface - a.surface) || a.id.localeCompare(b.id, 'fr'));

  return brutes.map((r, rang) => ({ ...r, rang }));
}

/**
 * Les couleurs du nuancier qui RALLUMENT vraiment une région.
 *
 * ── UN DÉFAUT TROUVÉ PAR LE SECOND HABILLAGE, PAS PAR LE PREMIER ──────────────────────────────
 * Deux entrées du nuancier sont, à l'hexadécimal près, les deux états NEUTRES du décor :
 *
 *     NUANCIER.gris  === PALETTE.grisaille === '#8E97A8'     ← la zone non conquise elle-même
 *     NUANCIER.blanc === PALETTE.parchemin === '#FFF6E3'     ← le `calque-fond`
 *
 * Une région « rallumée » en `gris` est donc rigoureusement identique à une région éteinte, et
 * une région rallumée en `blanc` se confond avec le fond : l'enfant range le bon mot et RIEN
 * ne change à l'écran. C'est la promesse centrale du jeu qui tombe en silence.
 *
 * Recensé PAR OBJET sur les quatre habillages que `phrase` déclare, sortie citée :
 *
 *     banniere : ["orange","jaune","rose","violet","blanc","brun"]        → 1 inerte
 *     guirlande: ["vert","jaune","bleu","brun","rose","blanc"]            → 1 inerte
 *     message  : ["vert","brun","gris","noir","blanc","jaune"]            → 2 inertes
 *     roseaux  : ["bleu","vert","gris","violet","brun","blanc"]           → 2 inertes
 *
 * **6 entrées sur 24.** Le premier habillage ne le montrait pas — son `blanc` tombait au-delà
 * du nombre de mots. Le second l'a rendu visible du premier coup, et c'est exactement pourquoi
 * la promesse « zéro ligne par habillage » se PROUVE sur un second habillage au lieu de se
 * déclarer sur le premier.
 *
 * ── LE CRITÈRE EST UNE ÉGALITÉ, PAS UN SEUIL ──────────────────────────────────────────────────
 * On n'écarte pas « ce qui semble trop clair » : on écarte ce qui vaut EXACTEMENT l'un des deux
 * états neutres, comparé à `PALETTE` et `NUANCIER`, qui font foi. Aucun nombre magique à
 * justifier, et le jour où la palette bouge, le filtre suit sans qu'on y touche.
 *
 * Le contenu n'est PAS corrigé ici : `contenu/habillages/` ne se modifie pas sans relecture
 * parent (règle dure du projet). Le filtre rend l'habillage jouable tel qu'il est livré, et le
 * défaut du contenu est signalé au rapport.
 */
export function nuancierUtile(habillage: Habillage): readonly string[] {
  const neutres = new Set([PALETTE.grisaille.toLowerCase(), PALETTE.parchemin.toLowerCase()]);
  const table = NUANCIER as unknown as Readonly<Record<string, string>>;
  const retenues = habillage.palette.nuancier
    .map((couleur) => String(couleur))
    .filter((couleur) => {
      const hex = table[couleur];
      return hex === undefined || !neutres.has(hex.toLowerCase());
    });
  // Un habillage dont le nuancier serait ENTIÈREMENT neutre reste jouable : on préfère le
  // jeton `soleil` à une région qui ne change jamais. Aucun état sans issue, jamais.
  return retenues.length === 0 ? ['__soleil'] : retenues;
}

/**
 * La couleur qu'une région prend en se rallumant, prise au NUANCIER de l'habillage.
 *
 * `banniere.habillage.json` en déclare six ; le rang de surface choisit dans cette liste.
 * Aucune couleur n'est écrite ici : « la couleur vient du code, pas du modèle » veut dire
 * qu'elle vient des jetons de palette, et les jetons sont déjà des variables CSS posées sur
 * la racine par `appliquerVariablesPalette`.
 */
export function couleurDeRegion(habillage: Habillage, rang: number): string {
  const nuancier = nuancierUtile(habillage);
  const couleur = nuancier[rang % nuancier.length] as string;
  if (couleur === '__soleil') return 'var(--soleil)';
  return `var(--nuancier-${couleur}, var(--soleil))`;
}

// ------------------------------------------------------------------ la géométrie du décor

export interface TransformeDecor {
  readonly echelle: number;
  readonly decalageX: number;
  readonly decalageY: number;
}

/**
 * Le décor est le FOND : il COUVRE le cadre au lieu d'y flotter (R52, point 1).
 *
 * C'est `preserveAspectRatio="xMidYMid slice"`, et le calcul est celui-là même que le
 * navigateur applique — on le refait ici parce qu'il faut savoir OÙ un centroïde atterrit
 * en pixels, et le DOM ne le dit pas.
 *
 * Ce que « couvrir » coûte, et il faut le dire : en portrait, un décor 960×600 déborde
 * latéralement, donc une partie de ses régions n'est PAS dessinée. `regionsVisibles` les
 * écarte — un mot posé sur une région invisible perdrait tout lien avec ce qu'il rallume.
 */
export function transformeSlice(vb: ViewBox, cadre: Cadre): TransformeDecor {
  const echelle = Math.max(cadre.largeur / vb.largeur, cadre.hauteur / vb.hauteur);
  return {
    echelle,
    decalageX: cadre.largeur / 2 - (vb.x + vb.largeur / 2) * echelle,
    decalageY: cadre.hauteur / 2 - (vb.y + vb.hauteur / 2) * echelle,
  };
}

/**
 * Affiche tout le décor dans le cadre. Ce mode convient aux plateaux de tri dont les objets
 * dessinés (paniers, grottes, wagons) sont eux-mêmes les destinations : les rogner ou les grossir
 * romprait la relation entre l'image et le geste.
 */
export function transformeMeet(vb: ViewBox, cadre: Cadre, zoom = 1): TransformeDecor {
  const echelle = Math.min(cadre.largeur / vb.largeur, cadre.hauteur / vb.hauteur) * zoom;
  return {
    echelle,
    decalageX: cadre.largeur / 2 - (vb.x + vb.largeur / 2) * echelle,
    decalageY: cadre.hauteur / 2 - (vb.y + vb.hauteur / 2) * echelle,
  };
}

export function versPixels(
  point: readonly [number, number],
  t: TransformeDecor,
): readonly [number, number] {
  return [point[0] * t.echelle + t.decalageX, point[1] * t.echelle + t.decalageY];
}

/**
 * Les régions dont le centroïde tombe DANS la partie réellement dessinée du décor.
 *
 * `marge` en pixels : une région dont le centroïde affleure le bord n'a presque rien de
 * visible, et son mot serait de toute façon repoussé par le clampage.
 */
export function regionsVisibles(
  regions: readonly RegionDHabillage[],
  t: TransformeDecor,
  cadre: Cadre,
  marge: number,
): readonly RegionDHabillage[] {
  return regions.filter((region) => {
    const [x, y] = versPixels(region.centroide, t);
    return x >= marge && x <= cadre.largeur - marge && y >= marge && y <= cadre.hauteur - marge;
  });
}

// ------------------------------------------------------------------ la relaxation

/** Bornée : une relaxation qui ne converge pas ne doit pas figer l'écran de l'enfant. */
const ITERATIONS_MAX = 80;

/** Respiration minimale entre deux pastilles, en pixels. */
const ECART_MIN = 10;

/** Débord de séparation : ce qui fait qu'on franchit le seuil au lieu de l'effleurer. */
const DEBORD = 0.5;

interface Pose {
  x: number;
  y: number;
  readonly boite: Boite;
}

/** Le compte de paires qui se recouvrent. Une seule définition, employée trois fois. */
function compterChevauchements(poses: readonly Pose[]): number {
  let compte = 0;
  for (let i = 0; i < poses.length; i += 1) {
    for (let j = i + 1; j < poses.length; j += 1) {
      if (chevauchent(poses[i] as Pose, poses[j] as Pose)) compte += 1;
    }
  }
  return compte;
}

function chevauchent(a: Pose, b: Pose): boolean {
  return (
    Math.abs(a.x - b.x) < (a.boite.largeur + b.boite.largeur) / 2 + ECART_MIN &&
    Math.abs(a.y - b.y) < (a.boite.hauteur + b.boite.hauteur) / 2 + ECART_MIN
  );
}

function clamper(pose: Pose, bornes: Bornes): void {
  const demiL = pose.boite.largeur / 2;
  const demiH = pose.boite.hauteur / 2;
  // `Math.max` en second : quand les bornes sont plus étroites que la boîte, on préfère
  // déborder du BAS et de la DROITE plutôt que du haut et de la gauche, où se trouvent la
  // consigne et la sortie. Un cadre trop petit reste jouable ; il n'y a pas d'état sans issue.
  pose.x = Math.min(Math.max(pose.x, bornes.xMin + demiL), Math.max(bornes.xMax - demiL, bornes.xMin + demiL));
  pose.y = Math.min(Math.max(pose.y, bornes.yMin + demiH), Math.max(bornes.yMax - demiH, bornes.yMin + demiH));
}

/**
 * Écarte les pastilles qui se chevauchent, puis les ramène dans les bornes.
 *
 * Entièrement DÉTERMINISTE — aucun tirage : à mêmes entrées, mêmes sorties. C'est ce qui rend
 * le résultat mesurable et reproductible d'une capture à l'autre.
 */
function relaxer(poses: Pose[], bornes: Bornes): number {
  let iterations = 0;
  for (; iterations < ITERATIONS_MAX; iterations += 1) {
    let bouge = false;
    for (let i = 0; i < poses.length; i += 1) {
      for (let j = i + 1; j < poses.length; j += 1) {
        const a = poses[i] as Pose;
        const b = poses[j] as Pose;
        if (!chevauchent(a, b)) continue;
        bouge = true;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const penetrationX = (a.boite.largeur + b.boite.largeur) / 2 + ECART_MIN - Math.abs(dx);
        const penetrationY = (a.boite.hauteur + b.boite.hauteur) / 2 + ECART_MIN - Math.abs(dy);

        // On pousse selon l'axe de MOINDRE pénétration : c'est le plus petit déplacement qui
        // sépare, donc celui qui abîme le moins l'ancrage au centroïde.
        //
        // `DEBORD` n'est pas une coquetterie. Sans lui, la poussée sépare EXACTEMENT au seuil
        // et l'erreur en virgule flottante laisse la paire un milliardième sous le seuil : le
        // test `<` reste vrai, la relaxation repousse de 5·10⁻⁶ px, et elle épuise ses 80 tours
        // sans jamais converger. Mesuré, sortie citée, sur `message-phrase-02` en 688×707 :
        //
        //     iterations 80  chevauchements 1     ← deux mots à 109,99 px pour un seuil de 110
        //
        // Avec un débord d'un demi-pixel, la même scène converge et rend 0.
        const poussee = (penetrationX < penetrationY ? penetrationX : penetrationY) / 2 + DEBORD;
        if (penetrationX < penetrationY) {
          const sens = dx === 0 ? (i < j ? -1 : 1) : Math.sign(dx);
          a.x -= sens * poussee;
          b.x += sens * poussee;
        } else {
          const sens = dy === 0 ? (i < j ? -1 : 1) : Math.sign(dy);
          a.y -= sens * poussee;
          b.y += sens * poussee;
        }
      }
    }
    for (const pose of poses) clamper(pose, bornes);
    if (!bouge) break;
  }
  return iterations;
}

// ------------------------------------------------------------------ la grille de repli

/**
 * RANGER EN LIGNES — le repli, et il regarde enfin la LARGEUR de ce qu'il range.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CETTE FONCTION REMPLACE, ET POURQUOI L'ANCIENNE NE POUVAIT PAS MARCHER
 *
 * Elle s'appelait `pointsDeGrille` et posait `colonnes = ⌈√n⌉`, **sans jamais regarder la
 * largeur des boîtes**. Sur 12 jetons dans 660 px utiles, cela donne 4 colonnes de 165 px — et
 * « la grenouille » mesure 255 px. Les semences se chevauchaient donc **par construction**, et
 * la relaxation, bornée par le clampage, ne pouvait pas défaire ce que la grille avait fait.
 *
 * Mesuré sur un corpus de 40 cas de contrainte, sortie citée :
 *
 *     cas avec chevauchements          : 17
 *     boîte max > cellule de grille    : 16
 *     les deux à la fois               : 16     ← la corrélation est le mécanisme
 *
 * Le remède n'était donc PAS d'augmenter les 80 itérations — c'était le remède le plus tentant
 * et il était faux. L'occupation reste sous 100 % dans la plupart des cas en échec : la place
 * existe, c'est la SEMENCE qui était mauvaise.
 *
 * ── LA LOI, ET ELLE EST SANS CHEVAUCHEMENT PAR CONSTRUCTION ───────────────────────────────────
 * On remplit une ligne de gauche à droite tant que la boîte suivante y entre, on passe à la
 * ligne sinon, et on empile les lignes par leur hauteur maximale. Deux boîtes d'une même ligne
 * sont séparées d'au moins `ECART_MIN` en x ; deux lignes le sont en y. **Aucune paire ne peut
 * se chevaucher.** Le bloc entier est centré, chaque ligne aussi.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
function rangerEnLignes(
  boites: readonly Boite[],
  bornes: Bornes,
  /**
   * Ranger les plus larges d'abord.
   *
   * Le tri gagne presque partout — il fait tomber à ZÉRO les scènes où la place existait — mais
   * **pas partout** : mesuré, une scène de `chemin` passait de 45 à 48 chevauchements. Un
   * rangement n'est donc pas « meilleur » dans l'absolu, et l'appelant essaie LES DEUX pour
   * garder le moins mauvais. C'est ce qui rend la correction monotone alors que treize moteurs
   * dépendent de ce module.
   */
  trierParLargeur: boolean,
): { readonly points: readonly (readonly [number, number])[]; readonly deborde: boolean } {
  if (boites.length === 0) return { points: [], deborde: false };

  const largeurDispo = Math.max(1, bornes.xMax - bornes.xMin);
  const hauteurDispo = Math.max(1, bornes.yMax - bornes.yMin);

  // 1. Composer les lignes selon la largeur RÉELLE de chaque boîte — en PREMIER AJUSTEMENT.
  //
  // ── POURQUOI PAS « AJUSTEMENT SUIVANT », QUI ÉTAIT LA PREMIÈRE VERSION ────────────────────
  // La première version fermait la ligne courante dès qu'une boîte n'y entrait pas, et n'y
  // revenait jamais — même quand une boîte PLUS COURTE, deux rangs plus loin, y aurait tenu.
  // Elle gaspillait donc des lignes, et sur un cadre serré une ligne gaspillée est un
  // chevauchement.
  //
  // Mesuré sur les 40 consignes qui débordaient, en comparant à la borne inférieure par
  // l'aire — le nombre de lignes qu'AUCUNE disposition ne peut battre :
  //
  //     29 cas : borne déjà au-dessus du possible  → impossible pour tout algorithme
  //     11 cas : borne EXACTEMENT au possible      → un rangement plus serré peut tenir
  //
  // Ces 11 cas-là sont ceux que le premier ajustement récupère. Il place chaque boîte dans la
  // PREMIÈRE ligne où elle entre : le remplissage se fait dans l'ordre, et les creux laissés
  // par une boîte trop large sont comblés par les suivantes.
  // On range les PLUS LARGES d'abord — « premier ajustement décroissant ». Les grandes boîtes
  // trouvent leur ligne pendant qu'il reste de la place, et les petites comblent les creux ;
  // en les prenant dans l'ordre du contenu, une grande boîte arrivée tard ouvre une ligne
  // presque vide qui ne se remplira jamais.
  //
  // Mesuré sur les consignes qui débordaient : le remplissage exigé y monte à 85–92 %, et
  // l'ajustement croissant ne sait pas monter si haut. Le tri le peut.
  //
  // Réordonner ne coûte RIEN de sémantique ici : ce rangement n'intervient qu'en repli, quand
  // l'ancrage aux centroïdes a déjà été abandonné, et les jetons arrivent de toute façon
  // mélangés (R44). L'ordre de LECTURE est restauré ligne par ligne, juste après.
  const ordreDeRangement = boites.map((boite, i) => ({ i, largeur: boite.largeur }));
  if (trierParLargeur) ordreDeRangement.sort((a, b) => b.largeur - a.largeur || a.i - b.i);

  const lignes: { indices: number[]; largeur: number; hauteur: number }[] = [];
  for (const { i } of ordreDeRangement) {
    const boite = boites[i] as Boite;
    let accueil = lignes.find(
      (ligne) => ligne.largeur + ECART_MIN + boite.largeur <= largeurDispo,
    );
    if (accueil === undefined) {
      accueil = { indices: [], largeur: -ECART_MIN, hauteur: 0 };
      lignes.push(accueil);
    }
    accueil.indices.push(i);
    accueil.largeur += ECART_MIN + boite.largeur;
    accueil.hauteur = Math.max(accueil.hauteur, boite.hauteur);
  }
  // L'ordre de lecture, rendu à chaque ligne : de gauche à droite, par rang d'origine. Le tri
  // ne servait qu'à COMPOSER les lignes, il ne doit pas se voir à l'écran.
  for (const ligne of lignes) ligne.indices.sort((a, b) => a - b);

  // 2. Empiler. Le bloc est centré verticalement s'il tient ; sinon il part du haut et on le
  //    DIT — un jeton hors bornes reste tapable, mais l'appelant doit pouvoir le compter.
  const hauteurBloc =
    lignes.reduce((s, l) => s + l.hauteur, 0) + ECART_MIN * Math.max(0, lignes.length - 1);
  const deborde = hauteurBloc > hauteurDispo;
  let y = deborde
    ? bornes.yMin + (lignes[0]?.hauteur ?? 0) / 2
    : bornes.yMin + (hauteurDispo - hauteurBloc) / 2 + (lignes[0]?.hauteur ?? 0) / 2;

  const points: (readonly [number, number])[] = new Array<readonly [number, number]>(boites.length);
  for (let rang = 0; rang < lignes.length; rang += 1) {
    const ligne = lignes[rang] as { indices: number[]; largeur: number; hauteur: number };
    let x = bornes.xMin + Math.max(0, (largeurDispo - ligne.largeur) / 2);
    for (const i of ligne.indices) {
      const boite = boites[i] as Boite;
      points[i] = [x + boite.largeur / 2, y];
      x += boite.largeur + ECART_MIN;
    }
    const suivante = lignes[rang + 1];
    if (suivante !== undefined) y += ligne.hauteur / 2 + ECART_MIN + suivante.hauteur / 2;
  }

  return { points, deborde };
}

// ------------------------------------------------------------------ la dérivation

export interface ParametresDerivation {
  readonly habillage: Habillage;
  /**
   * Les clés à poser, **DÉJÀ MÉLANGÉES** par l'appelant.
   *
   * Le mélange n'est pas ici : c'est une décision de jeu (R44), et elle réclame un `Alea` que
   * ce module pur n'a pas à connaître. Ce module décide seulement OÙ, jamais DANS QUEL ORDRE.
   */
  readonly cles: readonly string[];
  /** Régions encore éteintes, dans l'ordre de `regionsColoriables`. Servies en premier. */
  readonly disponibles: readonly RegionDHabillage[];
  /** Toutes les régions — servent de complément quand les disponibles manquent. */
  readonly toutes: readonly RegionDHabillage[];
  readonly cadre: Cadre;
  readonly bornes: Bornes;
  /** Encombrement de la pastille d'une clé. L'appelant seul connaît sa typographie. */
  mesurer(cle: string): Boite;
  /** Marge de visibilité, en pixels. */
  readonly margeVisibilite: number;
}

export function deriverEmplacements(parametres: ParametresDerivation): ResultatDerivation {
  const { habillage, cles, disponibles, toutes, cadre, bornes, mesurer, margeVisibilite } =
    parametres;

  const vb = lireViewBox(habillage.scene.viewBox);
  // Les moteurs montrent désormais l'illustration entière (`xMidYMid meet`). Les zones
  // tactiles doivent employer la même projection, sinon elles glissent hors des objets dès
  // que le rapport largeur/hauteur du navigateur diffère de celui du décor.
  const t = transformeMeet(vb, cadre);

  // 1. Les candidates : d'abord les régions ÉTEINTES et dessinées, par surface décroissante ;
  //    puis les régions déjà allumées, pour ne jamais manquer d'ancrage. Un mot posé sur une
  //    zone déjà colorée reste lisible — la pastille porte son propre fond opaque.
  const eteintesVisibles = regionsVisibles(disponibles, t, cadre, margeVisibilite);
  const dejaVues = new Set(eteintesVisibles.map((r) => r.id));
  const complement = regionsVisibles(toutes, t, cadre, margeVisibilite).filter(
    (r) => !dejaVues.has(r.id),
  );
  const candidates = [...eteintesVisibles, ...complement];

  // 2. L'affectation : la i-ème clé prend la i-ème candidate. Comme les clés arrivent déjà
  //    mélangées, la plus grande région ne revient pas systématiquement au premier mot de la
  //    phrase — ce qui vaudrait un indice gratuit.
  const boites = cles.map((cle) => mesurer(cle));

  const points: { region: RegionDHabillage | null; point: readonly [number, number] }[] = [];
  const sansRegion: number[] = [];
  for (let i = 0; i < cles.length; i += 1) {
    const region = candidates[i];
    if (region === undefined) {
      sansRegion.push(i);
      points.push({ region: null, point: [bornes.xMin, bornes.yMin] });
    } else {
      points.push({ region, point: versPixels(region.centroide, t) });
    }
  }

  // Les jetons sans région se rangent EN LIGNES, d'après leur largeur réelle.
  if (sansRegion.length > 0) {
    const rangement = rangerEnLignes(
      sansRegion.map((i) => boites[i] as Boite),
      bornes,
      true,
    );
    sansRegion.forEach((i, rang) => {
      const point = rangement.points[rang];
      if (point !== undefined) (points[i] as { point: readonly [number, number] }).point = point;
    });
  }

  // 3. La relaxation, sur les boîtes réelles.
  const poses: Pose[] = points.map((entree, i) => ({
    x: entree.point[0],
    y: entree.point[1],
    boite: boites[i] as Boite,
  }));
  for (const pose of poses) clamper(pose, bornes);
  let iterations = relaxer(poses, bornes);

  // ── 3 bis. LA RÉPARATION, ET ELLE NE S'EXÉCUTE QUE LÀ OÙ C'EST DÉJÀ CASSÉ ─────────────────
  //
  // Quand les centroïdes sont trop serrés pour les boîtes qu'ils doivent porter, la relaxation
  // ne converge pas — et deux jetons qui se recouvrent, ce n'est pas un défaut d'esthétique :
  // **c'est un tap qui atterrit sur le mauvais**, donc un refus que l'enfant ne comprend pas.
  // C'est la famille R16/R33, celle qui a le plus coûté au père.
  //
  // On abandonne alors l'ancrage aux centroïdes et on range TOUT en lignes : sans
  // chevauchement par construction. Le lien « le jeton est posé sur la région qu'il rallume »
  // est perdu pour cette scène-là — c'est le prix, et il est explicite dans `repli`.
  //
  // **Cette passe ne peut rien régresser** : elle est gardée par `chevauchements > 0`, donc
  // toute scène qui rendait déjà 0 suit exactement le même chemin qu'avant, au bit près.
  let repli: ResultatDerivation['repli'] = 'regions';
  let deborde = false;
  const chevauchementsRegions = compterChevauchements(poses);
  if (chevauchementsRegions > 0) {
    // On essaie les DEUX rangements — dans l'ordre du contenu, et les plus larges d'abord — et
    // on garde le moins mauvais. Aucun des deux ne domine l'autre sur tout le corpus.
    let rangement = rangerEnLignes(boites, bornes, true);
    let enLignes: Pose[] = [];
    let chevauchementsLignes = Number.POSITIVE_INFINITY;
    let tours = 0;
    for (const trier of [true, false]) {
      const essai = rangerEnLignes(boites, bornes, trier);
      const poses2: Pose[] = boites.map((boite, i) => {
        const point = essai.points[i] ?? [bornes.xMin, bornes.yMin];
        return { x: point[0], y: point[1], boite };
      });
      for (const pose of poses2) clamper(pose, bornes);
      const t2 = relaxer(poses2, bornes);
      const c2 = compterChevauchements(poses2);
      if (c2 < chevauchementsLignes) {
        chevauchementsLignes = c2;
        enLignes = poses2;
        rangement = essai;
        tours = t2;
      }
    }

    // ── ON GARDE LE MEILLEUR DES DEUX, ON N'IMPOSE JAMAIS LE REPLI ────────────────────────
    //
    // Première version : le repli s'appliquait dès qu'il y avait un chevauchement. Mesuré, il
    // AGGRAVAIT les scènes trop chargées — `paires` passait de 69 à 88 chevauchements — parce
    // qu'un rangement en lignes qui ne tient pas verticalement se fait ensuite ramener dans
    // les bornes par le clampage, et s'empile sur lui-même.
    //
    // Comparer les deux et garder le plus petit rend la correction **monotone** : elle ne peut
    // pas être pire que ce qui existait, quelle que soit la scène. À égalité on préfère les
    // lignes, qui se lisent mieux.
    if (chevauchementsLignes <= chevauchementsRegions) {
      for (let i = 0; i < poses.length; i += 1) {
        const source = enLignes[i] as Pose;
        const pose = poses[i] as Pose;
        pose.x = source.x;
        pose.y = source.y;
      }
      repli = 'lignes';
      deborde = rangement.deborde;
      iterations += tours;
    } else {
      // Le rangement en lignes ne tient pas : c'est que la scène est trop chargée pour son
      // cadre, et AUCUN placement ne la sauvera. On garde les centroïdes — moins mauvais — et
      // on lève le drapeau. **C'est une trouvaille, pas un échec** : le remède est au contenu.
      deborde = true;
    }
  }

  // 4. Le contrat de sortie, CALCULÉ et non affirmé.
  const chevauchements = compterChevauchements(poses);
  let horsBornes = 0;
  for (const pose of poses) {
    const demiL = pose.boite.largeur / 2;
    const demiH = pose.boite.hauteur / 2;
    if (
      pose.x - demiL < bornes.xMin - 0.5 ||
      pose.x + demiL > bornes.xMax + 0.5 ||
      pose.y - demiH < bornes.yMin - 0.5 ||
      pose.y + demiH > bornes.yMax + 0.5
    ) {
      horsBornes += 1;
    }
  }

  const emplacements: Emplacement[] = cles.map((cle, i) => {
    const region = points[i]?.region ?? null;
    const pose = poses[i] as Pose;
    return {
      cle,
      region: region === null ? null : region.id,
      libelleRegion: region === null ? '' : region.libelle,
      couleur: region === null ? 'var(--soleil)' : couleurDeRegion(habillage, region.rang),
      x: pose.x,
      y: pose.y,
      boite: pose.boite,
    };
  });

  return {
    emplacements,
    chevauchements,
    horsBornes,
    surRegion: emplacements.filter((e) => e.region !== null).length,
    surGrille: emplacements.filter((e) => e.region === null).length,
    iterations,
    repli,
    deborde,
  };
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// CE QUI A ÉTÉ RETIRÉ D'ICI, ET POURQUOI ON L'ÉCRIT
//
// Ce module a porté une `graineDerivee(graine, cle)` — un FNV-1a qui servait à mélanger les
// mots depuis la couche de rendu sans puiser dans le générateur partagé. Elle a été SUPPRIMÉE
// quand le mélange a rejoint `moteurPhrase.creerEtat` (champ `ordreAffichage`), là où `eclair`
// le fait déjà.
//
// On ne la garde pas « au cas où » : une fonction dont la loi a déménagé est un nom qui survit
// à la règle qu'il désignait, et c'est très exactement la famille de défauts que le contrat de
// couverture attrape ailleurs dans ce dépôt. Le jour où un autre moteur en aura besoin, il la
// réécrira en six lignes — ou, mieux, il fera comme `phrase` et mélangera dans son état.
// ══════════════════════════════════════════════════════════════════════════════════════════════
