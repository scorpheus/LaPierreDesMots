/**
 * Le protocole A/B de D19 — lot L2-B.
 *
 * « Même compétence, même type d'item, police alternée d'une session à l'autre ; comparer les
 * latences de reconnaissance et les taux d'erreur ; l'enfant ne voit jamais qu'on compare, le
 * parent voit les courbes. » (D19, cité)
 *
 * Ce module est PUR et DÉTERMINISTE : aucun `Alea`, aucune `Horloge`. C'est voulu, et c'est la
 * seule façon d'avoir deux bras comparables — voir `brasDeSession`.
 */
import type {
  ComparaisonTypographie, ConfigurationBras, EssaiTypographie, ResultatBras,
} from './types.js';

/**
 * Nombre de mesures minimal par bras avant de nommer un favori.
 *
 * PLACEHOLDER — à valider. 20 tentatives par bras, soit une quarantaine d'items au total : à
 * raison de quelques items par session, cela fait « quelques semaines » (D19), ce qui est
 * exactement l'ordre de grandeur que la décision annonce. La valeur n'a AUCUN effet sur la
 * mesure elle-même : elle ne décide que du moment où l'on ose nommer un gagnant.
 */
export const TENTATIVES_MIN_PAR_BRAS = 20;

/**
 * Décalage déterministe propre à un essai, tiré de son identifiant.
 *
 * Sans lui, deux essais ouverts en même temps donneraient toujours le même bras à la même
 * session : les deux comparaisons seraient corrélées et l'une renseignerait sur l'autre.
 * FNV-1a sur l'identifiant — ce n'est pas du hasard, c'est une fonction de l'essai, donc
 * reproductible d'un rejeu à l'autre.
 */
function decalage(identifiant: string): number {
  let accumulateur = 0x811c9dc5;
  for (let index = 0; index < identifiant.length; index += 1) {
    accumulateur ^= identifiant.charCodeAt(index);
    accumulateur = Math.imul(accumulateur, 0x01000193) >>> 0;
  }
  return accumulateur % 2;
}

/**
 * Le bras actif d'une session. DÉTERMINISTE : c'est le numéro de session qui décide, pas
 * l'aléatoire — sinon deux sessions du même jour pourraient tirer le même bras et la
 * comparaison ne serait plus équilibrée.
 *
 * Alternance stricte, et c'est la propriété opposable : sur les `n` premières sessions, les
 * deux bras sont servis `n/2` fois à une unité près, quelle que soit `n`. Un tirage aléatoire,
 * même équiprobable, ne le garantit pas — c'est tout l'écart entre randomisation et
 * contrebalancement, et c'est celui-ci qu'il faut ici, sur UN seul enfant.
 *
 * Un numéro de session non entier ou négatif ne fait pas échouer la lecture : il est ramené,
 * comme tout le reste de ce lot (« ne rejette jamais »).
 */
export function brasDeSession(essai: EssaiTypographie, numeroSession: number): ConfigurationBras {
  const numero = Number.isFinite(numeroSession) ? Math.abs(Math.trunc(numeroSession)) : 0;
  const rang = (numero + decalage(essai.id)) % 2;
  return essai.bras[rang === 0 ? 0 : 1];
}

/**
 * Rend `brasFavorable: null` tant que les deux bras n'ont pas `TENTATIVES_MIN_PAR_BRAS`.
 *
 * Le critère de départage est la **latence médiane** : c'est l'indicateur de fluence retenu par
 * D18, et le seul que la v2 § 12.3 nomme. Le taux d'erreur ne départage qu'à latence égale —
 * pas l'inverse. À égalité parfaite sur les deux, il n'y a pas de favori : `null`, et non le
 * premier bras arbitrairement. Nommer un gagnant qui n'en est pas un est exactement ce que
 * cette comparaison doit éviter.
 */
export function comparer(
  essai: EssaiTypographie,
  resultats: readonly [ResultatBras, ResultatBras],
): ComparaisonTypographie {
  const [premier, second] = resultats;

  const assezDeMesures =
    premier.nbTentatives >= TENTATIVES_MIN_PAR_BRAS &&
    second.nbTentatives >= TENTATIVES_MIN_PAR_BRAS;

  let brasFavorable: ConfigurationBras | null = null;
  if (assezDeMesures) {
    if (premier.latenceMedianeMs < second.latenceMedianeMs) {
      brasFavorable = premier.configuration;
    } else if (second.latenceMedianeMs < premier.latenceMedianeMs) {
      brasFavorable = second.configuration;
    } else if (premier.tauxErreur < second.tauxErreur) {
      brasFavorable = premier.configuration;
    } else if (second.tauxErreur < premier.tauxErreur) {
      brasFavorable = second.configuration;
    }
  }

  return { essai, resultats, brasFavorable };
}
