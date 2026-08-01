/**
 * Les seuils d'aide, hissés hors de `colorie` — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.1.
 *
 * Valeurs du contrat v1 § 5.8, reprises **à l'identique** — mesurées sur
 * `partage/src/moteurs/colorie/validation.ts`, jamais réinventées :
 *
 *   $ grep -oE "^  [a-zA-Z]+: [0-9_]+" partage/src/moteurs/colorie/validation.ts
 *     relectureMs: 20_000
 *     indiceMs: 45_000
 *     demonstrationMs: 30_000
 *     erreursAvantIndice: 2
 *     erreursAvantDemonstration: 3
 *
 * Un moteur qui veut d'autres délais les reçoit par son habillage, il ne les recode pas.
 *
 * NOTE C2 — ces cinq valeurs ne sont PAS des seuils de récompense ni des paramètres
 * pédagogiques : ce sont les délais d'aide, que le contrat gelé § 4.3.1 impose comme
 * constante exportée (`DELAIS_AIDE_PAR_DEFAUT`), exactement comme `DELAIS_AIDE` en v1.
 * `DelaisAide` étant un paramètre de chaque fonction du socle, un habillage ou un futur
 * `parametres-*.json` peut les surcharger sans toucher une ligne de code.
 */

export interface DelaisAide {
  /** Relecture automatique de la consigne. RÉÉCOUTE, pas aide : sans coût (R15). */
  readonly relectureMs: number;
  readonly indiceMs: number;
  readonly demonstrationMs: number;
  readonly erreursAvantIndice: number;
  readonly erreursAvantDemonstration: number;
}

export const DELAIS_AIDE_PAR_DEFAUT: DelaisAide = {
  relectureMs: 20_000,
  indiceMs: 45_000,
  demonstrationMs: 30_000,
  erreursAvantIndice: 2,
  erreursAvantDemonstration: 3,
};
