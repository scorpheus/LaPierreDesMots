// Registre des rendus de moteur — contrat technique v1 § 4.5.
//
// Ce fichier porte l'une des deux inversions de dépendance assumées (§ 11.4) : il importe
// `renduColorie`, écrit par L-E. Il ne compile pas tant que L-E n'a pas écrit son fichier,
// et c'est voulu — l'oubli d'un enregistrement ne compile pas, au lieu de ne se voir qu'en jeu.
//
// La promesse « zéro ligne de code par habillage » se vérifie ICI : le registre est indexé par
// MOTEUR, jamais par habillage. Un habillage neuf n'ajoute aucune entrée.
import type { CodeMoteur } from '@pierre/partage';
import { renduColorie } from './colorie/index.js';
import type { MoteurRenduQuelconque } from './types.js';

export const registreRendu: Readonly<Record<string, MoteurRenduQuelconque>> = {
  colorie: renduColorie as unknown as MoteurRenduQuelconque
};

/**
 * Lève si le moteur n'a pas de rendu déclaré.
 *
 * Erreur native volontaire : le contrat § 4.5 ne prescrit pas `ErreurPierre` ici, et ce
 * chemin est un défaut de programmation (un moteur enregistré côté logique sans rendu),
 * pas une condition de jeu. Il n'atteint jamais l'enfant : `test:contenu` contrôle le
 * couple moteur/habillage avant le lancement (§ 9.8, contrôle 4).
 */
export function obtenirRendu(code: CodeMoteur): MoteurRenduQuelconque {
  const rendu = registreRendu[code];
  if (rendu === undefined) {
    throw new Error(`Aucun rendu déclaré pour le moteur « ${String(code)} ».`);
  }
  return rendu;
}
