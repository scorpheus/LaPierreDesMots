// Coloration syllabique alternée — lot L2-B, v2 § 9.3 et D19.
//
// Un mot, découpé en syllabes, dont le rang décide de la couleur. Deux teintes seulement, et
// jamais de rouge : ce n'est pas une correction, c'est un appui de déchiffrage. `data-syllabe`
// porte le rang réduit à `0` ou `1` — c'est la prise du contrat des features v2 § 7.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { decouperSyllabes } from '@pierre/partage/lecture';
import type { SegmentSyllabe } from '@pierre/partage/lecture';

/**
 * URL du référentiel, servi par `GET /api/contenu/assets/*` — chemin NORMATIF du contrat
 * technique v1 § 3.3, et non une invention de ce fichier.
 *
 * Écrit ici plutôt qu'emprunté à `urlAsset` de `client/src/api/client.ts` : ce fichier est
 * réécrit par L2-H pendant cette campagne, et l'importer pour une seule chaîne ferait dépendre
 * toute la coloration syllabique — donc toute la suite `ZoneDeLecture.test` — de l'état
 * d'avancement d'un autre lot. Mesuré : au moment d'écrire ces lignes, `client.ts` importait
 * `@pierre/partage/parent`, qui n'existait pas encore, et la suite composant de L2-B ne
 * chargeait plus. La dépendance a été coupée ; le chemin, lui, reste celui du contrat.
 */
const URL_LEXIQUE = '/api/contenu/assets/referentiel/syllabation-exceptions.json';

/** Table plate `mot -> syllabes`, telle que `decouperSyllabes` l'attend. */
export type LexiqueSyllabation = Readonly<Record<string, readonly string[]>>;

/** Forme du fichier `contenu/referentiel/syllabation-exceptions.json`. */
interface FichierExceptions {
  readonly familles?: readonly {
    readonly decoupages?: Readonly<Record<string, readonly string[]>>;
  }[];
}

/**
 * Aplatit les familles du fichier de référentiel en une table plate.
 *
 * Le fichier est groupé par MOTIF — `ille-mouille`, `hiatus-non-marque` — parce qu'une
 * exception sans motif écrit est une exception que personne ne saura plus justifier (Q2).
 * Le moteur de découpage, lui, n'a besoin que des couples.
 */
export function aplatirLexique(fichier: unknown): LexiqueSyllabation {
  const table: Record<string, readonly string[]> = Object.create(null) as Record<
    string,
    readonly string[]
  >;
  const familles = (fichier as FichierExceptions | null)?.familles;
  if (!Array.isArray(familles)) {
    return table;
  }
  for (const famille of familles) {
    const decoupages = famille?.decoupages;
    if (decoupages === undefined || decoupages === null) {
      continue;
    }
    for (const [mot, syllabes] of Object.entries(decoupages)) {
      if (Array.isArray(syllabes) && syllabes.every((s) => typeof s === 'string')) {
        table[mot] = syllabes;
      }
    }
  }
  return table;
}

// ------------------------------------------------------------------ le lexique, chargé une fois

const LEXIQUE_VIDE: LexiqueSyllabation = Object.create(null) as LexiqueSyllabation;

let lexiqueCourant: LexiqueSyllabation = LEXIQUE_VIDE;
let chargementEnCours: Promise<LexiqueSyllabation> | null = null;
const abonnes = new Set<() => void>();

/** Le lexique d'exceptions actuellement en vigueur. Vide tant qu'il n'a pas été chargé. */
export function lexiqueSyllabation(): LexiqueSyllabation {
  return lexiqueCourant;
}

/**
 * Installe un lexique. C'est le point d'injection des tests — et le seul moyen de vérifier la
 * coloration sans réseau, ce qu'exige l'annexe T § 2.3.
 */
export function fixerLexiqueSyllabation(lexique: LexiqueSyllabation): void {
  lexiqueCourant = lexique;
  for (const prevenir of abonnes) {
    prevenir();
  }
}

/**
 * Charge le lexique d'exceptions depuis `contenu/referentiel/`, une seule fois par session.
 *
 * ⚠ ÉCART SIGNALÉ AU RAPPORT DE L2-B. Le contrat des features v2 § 5.1 pose qu'« un seul
 * fichier appelle le réseau côté client », `client/src/api/client.ts`, possédé par L2-H — mais
 * il ne nomme AUCUN symbole pour lire ce référentiel, et le lexique n'est atteignable ni par
 * un import relatif (il est hors du `rootDir` de `client/tsconfig.json`, qui n'appartient à
 * aucun lot) ni par un alias (`client/tsconfig.json` porterait les `paths`, même fichier).
 * Refuser de charger reviendrait à livrer un fichier de référentiel que rien ne lit — un
 * détecteur qui déclare un poids qu'il n'applique jamais. **Ce site d'appel est le seul à
 * reprendre** le jour où L2-H publiera un lecteur typé.
 *
 * L'échec est SILENCIEUX et sans conséquence visible : la règle de découpage prend le relais,
 * `certain` vaut `false`, et rien ne casse à l'écran. Un référentiel absent ne doit jamais
 * empêcher un enfant de lire.
 */
export async function chargerLexiqueSyllabation(): Promise<LexiqueSyllabation> {
  if (lexiqueCourant !== LEXIQUE_VIDE) {
    return lexiqueCourant;
  }
  chargementEnCours ??= (async (): Promise<LexiqueSyllabation> => {
    try {
      const reponse = await fetch(URL_LEXIQUE, { headers: { Accept: 'application/json' } });
      if (!reponse.ok) {
        return LEXIQUE_VIDE;
      }
      return aplatirLexique(await reponse.json());
    } catch {
      return LEXIQUE_VIDE;
    }
  })();

  const charge = await chargementEnCours;
  if (Object.keys(charge).length > 0) {
    fixerLexiqueSyllabation(charge);
  }
  return lexiqueCourant;
}

/** S'abonne aux changements de lexique. Rend la fonction de désabonnement. */
function abonner(prevenir: () => void): () => void {
  abonnes.add(prevenir);
  return () => {
    abonnes.delete(prevenir);
  };
}

/**
 * Réagit à l'arrivée du lexique. Le premier rendu se fait à la règle seule ; le second, si le
 * référentiel arrive, corrige les mots qu'il couvre. Aucun écran d'attente, aucun texte vide.
 */
function useLexique(): LexiqueSyllabation {
  const [lexique, fixer] = useState<LexiqueSyllabation>(lexiqueCourant);
  useEffect(() => {
    const desabonner = abonner(() => {
      fixer(lexiqueSyllabation());
    });
    void chargerLexiqueSyllabation();
    return desabonner;
  }, []);
  return lexique;
}

// ------------------------------------------------------------------ le composant

export interface ProprietesTexteSyllabe {
  /** Le mot à colorer. Un seul mot : l'espace n'est jamais coloré. */
  readonly mot: string;
  /** Mot cible d'une consigne : rendu en graisse 700, jamais en couleur d'alerte. */
  readonly cible?: boolean;
}

/**
 * Un mot en syllabes alternées.
 *
 * `aria-hidden` sur les segments et le mot entier en texte accessible : un lecteur d'écran ne
 * doit JAMAIS épeler « feuil-les ». La découpe est un appui visuel, elle n'existe pas à
 * l'oreille — R15 impose déjà que tout soit audible en un tap, et c'est la voix qui dit le mot.
 */
export function TexteSyllabe({ mot, cible = false }: ProprietesTexteSyllabe): ReactElement {
  const lexique = useLexique();
  const segments: readonly SegmentSyllabe[] = decouperSyllabes(mot, lexique);

  return (
    <span
      className="mot-lecture"
      data-mot={mot}
      data-cible={cible ? 'oui' : 'non'}
      style={cible ? { fontWeight: 700 } : undefined}
    >
      <span className="lecture-accessible">{mot}</span>
      {segments.map((segment) => (
        <span
          key={`${String(segment.rang)}-${segment.texte}`}
          aria-hidden="true"
          data-syllabe={String(segment.rang % 2)}
          data-certain={segment.certain ? 'oui' : 'non'}
          className="syllabe"
        >
          {segment.texte}
        </span>
      ))}
    </span>
  );
}
