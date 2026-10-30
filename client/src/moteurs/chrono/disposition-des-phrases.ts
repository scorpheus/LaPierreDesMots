/**
 * Combien de place une phrase de récit demande, et donc comment ranger les vignettes de `chrono`.
 *
 * Décision du parent du 30 oct. (Docs/contrat-socle-activite.md § 12, point 3) : pas de largeur
 * de carte fixée en pixels, mais un RÉSULTAT — aucun mot coupé, aucun mot hors de sa carte, des
 * lignes d'au moins `CARACTERES_PAR_LIGNE` caractères (la dernière ligne exceptée). La carte plafonnée
 * à 15rem tassait « Une grande flaque apparaît… » en lignes de 7 caractères au corps 27.
 *
 * Le navigateur remplit chaque ligne mot à mot tant que le mot suivant tient. Une boîte au moins
 * aussi large que le plus long « départ de ligne » — de n'importe quel début de mot jusqu'au
 * premier blanc après le 15e caractère — garantit donc des lignes d'au moins 15 caractères, et
 * contient aussi le plus long mot. C'est cette largeur que `largeurUtileDePhrase` mesure.
 */

export const CARACTERES_PAR_LIGNE = 15;

/** Les morceaux qu'une ligne doit pouvoir porter d'un seul tenant. */
export function departsDeLigne(phrase: string, minimum = CARACTERES_PAR_LIGNE): string[] {
  const texte = phrase.trim().replace(/\s+/gu, ' ');
  const debuts = [...texte.matchAll(/(^|\s)(\S)/gu)].map((m) => m.index + m[1]!.length);
  const morceaux = new Set<string>();
  for (const debut of debuts) {
    let fin = texte.indexOf(' ', Math.min(texte.length, debut + minimum));
    if (fin < 0 || debut + minimum > texte.length) fin = texte.length;
    // Le mot qui commence ici, à lui seul, doit tenir aussi (cas du dernier mot).
    const finDuMot = texte.indexOf(' ', debut);
    morceaux.add(texte.slice(debut, finDuMot < 0 ? texte.length : finDuMot));
    morceaux.add(texte.slice(debut, fin));
  }
  return [...morceaux].filter((m) => m !== '');
}

/** La largeur de texte sous laquelle une des phrases tomberait en lignes trop courtes. */
export function largeurUtileDePhrase(
  phrases: readonly string[],
  mesurer: (texte: string) => number,
  minimum = CARACTERES_PAR_LIGNE,
): number {
  let largeur = 0;
  for (const phrase of phrases) {
    for (const morceau of departsDeLigne(phrase, minimum)) largeur = Math.max(largeur, mesurer(morceau));
  }
  return Math.ceil(largeur);
}

/**
 * `colonnes` : une colonne par image, légende sous l'image (la composition sur le décor) ;
 * `pile` : une vignette par rangée, image à gauche, légende à droite ;
 * `pile-haute` : une vignette par rangée, image au-dessus — quand même la pile ne laisse pas à la
 * légende la largeur d'une ligne.
 */
export type DispositionChrono = 'colonnes' | 'pile' | 'pile-haute';

export interface MesuresDeDisposition {
  /** Largeur intérieure du plateau des vignettes. */
  readonly largeurPlateau: number;
  readonly nombreDeVignettes: number;
  /** Écart entre deux colonnes du plateau. */
  readonly ecart: number;
  /** Ce que la carte ajoute autour du texte : bordures et marges intérieures. */
  readonly habillageCarte: number;
  /** Largeur de l'image quand elle est à côté de la légende, écart compris. */
  readonly imageACote: number;
  /** `largeurUtileDePhrase` des légendes affichées. */
  readonly largeurTexte: number;
}

export function choisirDispositionChrono(m: MesuresDeDisposition): DispositionChrono {
  const colonnes = Math.max(1, m.nombreDeVignettes);
  const parColonne = (m.largeurPlateau - (colonnes - 1) * m.ecart) / colonnes;
  if (parColonne >= m.largeurTexte + m.habillageCarte) return 'colonnes';
  return dispositionEnPile(m);
}

/** Quand les colonnes sont exclues (trop étroites, ou trop hautes pour la scène). */
export function dispositionEnPile(m: Omit<MesuresDeDisposition, 'nombreDeVignettes' | 'ecart'>): DispositionChrono {
  return m.largeurPlateau >= largeurDeLaPile(m, 'pile') ? 'pile' : 'pile-haute';
}

/** La largeur qu'une vignette en pile occupe au plus juste. */
export function largeurDeLaPile(
  m: Pick<MesuresDeDisposition, 'habillageCarte' | 'imageACote' | 'largeurTexte'>,
  disposition: Exclude<DispositionChrono, 'colonnes'>,
): number {
  return m.largeurTexte + m.habillageCarte + (disposition === 'pile' ? m.imageACote : 0);
}

/**
 * Où va la frise de l'histoire : sous les vignettes, ou à côté quand la scène est plus large que
 * haute et que l'empilement ne tiendrait pas en hauteur. Jugé par la mesure (`MoteurChrono`).
 */
export type PlaceDeLaFrise = 'dessous' | 'a-cote';
