/**
 * Registre des moteurs, indexé par code — contrat § 4.2.
 *
 * Le registre est un état de module : il est partagé par tout le processus. C'est voulu, et
 * c'est ce qui rend `initialiserRegistreMoteurs()` appelable partout sans coordination.
 */

import { ErreurPierre } from '../erreurs.js';
import type { CodeMoteur } from '../identifiants.js';
import type { MoteurQuelconque } from './types.js';

const registre = new Map<CodeMoteur, MoteurQuelconque>();

/**
 * Idempotent pour un même moteur : réenregistrer exactement le même objet ne fait rien.
 * Deux objets différents sous le même code sont en revanche une erreur — c'est le cas où
 * l'on aurait deux mécaniques sous un seul nom, et où le silence coûterait cher.
 */
export function enregistrerMoteur(moteur: MoteurQuelconque): void {
  const existant = registre.get(moteur.code);
  if (existant !== undefined && existant !== moteur) {
    throw new ErreurPierre(
      'moteur-deja-enregistre',
      `Deux moteurs différents revendiquent le code « ${moteur.code} ».`,
      { code: moteur.code },
    );
  }
  registre.set(moteur.code, moteur);
}

/** Lève `ErreurPierre('moteur-inconnu')` si le code n'est pas enregistré. */
export function obtenirMoteur(code: CodeMoteur): MoteurQuelconque {
  const moteur = registre.get(code);
  if (moteur === undefined) {
    throw new ErreurPierre('moteur-inconnu', `Aucun moteur enregistré sous « ${code} ».`, {
      code,
      enregistres: [...registre.keys()],
    });
  }
  return moteur;
}

/** Les codes enregistrés, dans l'ordre d'enregistrement. */
export function moteursEnregistres(): readonly CodeMoteur[] {
  return [...registre.keys()];
}

export function estMoteurEnregistre(code: CodeMoteur): boolean {
  return registre.has(code);
}
