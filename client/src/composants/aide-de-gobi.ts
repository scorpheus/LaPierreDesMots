// Résolution de l'aide Gobi, côté coquille.
//
// Une consigne et un conseil sont deux messages différents. La consigne est audible grâce à
// son clip narrateur ; l'aide donne une stratégie par `CodeAideGobi` et ne détourne jamais ce
// clip. Les cinq stratégies génériques possèdent leur propre clip Gobi.
import type { AideProposee, CleAudio, CodeAideGobi } from '@pierre/partage';
import aidesGobi from './aides-gobi.json' with { type: 'json' };

/** L'étape telle que `EcranNoeud` la présente : un identifiant et un texte lisible. */
export interface EtapeLisible {
  readonly id: string;
  readonly texte: string;
}

/**
 * D'où vient le texte que la bulle montre. **Publié dans le DOM** (`data-aide-source`).
 *
 * `manquant` est la seule valeur qui ne doit jamais apparaître : elle nomme l'état où une
 * aide est proposée et où personne n'a su dire quoi. Elle existe pour être COMPTÉE — un état
 * qui n'a pas de nom ne peut pas être mesuré, et c'est faute de nom que celui-ci a vécu.
 */
export type SourceTexteAide = 'strategie' | 'manquant';

export interface AideResolue {
  /** Ce que la bulle affiche. `null` seulement si aucune aide. */
  readonly texte: string | null;
  /** La clé de manifeste du clip qui dit `texte`. `null` : D42 masque le bouton. */
  readonly cle: CleAudio | null;
  readonly source: SourceTexteAide | null;
}

const AUCUNE: AideResolue = { texte: null, cle: null, source: null };

/**
 * Une aide ne réénonce jamais la consigne. Ces cinq phrases donnent une façon de chercher,
 * tandis que la consigne, elle, conserve son clip narrateur dans la barre du haut.
 *
 * Les cinq clips Gobi correspondants portent la même clé stable que leur code d'aide.
 */
export const STRATEGIE_PAR_CODE: Readonly<Record<CodeAideGobi, string>> = {
  ...aidesGobi
};

function strategieParticuliere(aide: AideProposee): string {
  if (aide.texte === null || aide.texte === '') {
    return STRATEGIE_PAR_CODE[aide.code];
  }

  // `trace` fournit seulement « la grande barre » : en faire une phrase donne une action
  // faisable. `libre`, lui, fournit déjà sa phrase d'autorisation complète.
  if (aide.texte.startsWith('Ici,')) {
    return aide.texte;
  }
  // Certains moteurs, notamment `place`, fournissent déjà un vrai conseil en deux phrases.
  // Le préfixer produisait « Commence par Cherche… .. » : majuscule interne et double point.
  if (/[.!?…]$/.test(aide.texte.trim())) {
    return aide.texte.trim();
  }
  return aide.code === 'montre-cible'
    ? `Je te montre ${aide.texte}.`
    : `Commence par ${aide.texte}.`;
}

/**
 * Résout l'aide du moteur en (texte affiché, clip qui le dit).
 *
 * TROIS CAS, ET AUCUN REPLI SILENCIEUX :
 *
 *   1. le moteur a un repère particulier (`trace`, `libre`) → il devient une phrase d'action ;
 *   2. sinon, le `CodeAideGobi` choisit une stratégie globale ;
 *   3. le clip de la consigne n'est jamais réutilisé : il prononce la consigne, pas l'aide.
 *
 * `etape` et `idExercice` restent dans la signature afin que la coquille transporte toujours
 * le contexte nécessaire le jour où le lot voix ajoutera des clés d'aide validées.
 */
export function resoudreAideDeGobi(
  aide: AideProposee | null,
  _etape: EtapeLisible | null,
  _idExercice: string | null,
): AideResolue {
  if (aide === null) {
    return AUCUNE;
  }
  return {
    texte: strategieParticuliere(aide),
    cle: aide.texte === null || aide.texte === '' ? `aide-gobi/${aide.code}` : null,
    source: 'strategie'
  };
}
