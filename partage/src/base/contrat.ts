/**
 * Le contrat `Base` — port repository partagé entre le serveur (node:sqlite) et l'app Android
 * autonome (@capacitor-community/sqlite). Voir Docs/addendum-portage-android.md § 4.
 *
 * Async partout, y compris pour l'adaptateur `node:sqlite` qui est synchrone en dessous : tout
 * adaptateur mobile (WASM ou plugin natif) traverse un pont async, et le contrat se fige sur le
 * dénominateur commun plutôt que d'être révisé plus tard sous chaque appelant.
 *
 * Pas d'objet « instruction préparée » persistant : chaque appel prend le SQL complet. Ça
 * correspond à la fois à `node:sqlite` (`db.prepare(sql).run/get/all(...parametres)`, préparé à
 * la volée) et à `@capacitor-community/sqlite` (`execute/run/query` prennent le SQL à chaque
 * appel, pas de handle de préparation exposé à ce niveau). Les volumes en jeu — le journal d'un
 * seul enfant — ne justifient pas la complexité d'un cache de préparation.
 */

export interface ResultatEcriture {
  readonly changements: number;
  readonly dernierIdInsere: number | bigint;
}

export interface Base {
  /** DDL, PRAGMA, instruction sans paramètres ni valeur de retour (migrations). */
  executer(sql: string): Promise<void>;
  /** INSERT/UPDATE/DELETE paramétré. */
  lancer(sql: string, parametres?: readonly unknown[]): Promise<ResultatEcriture>;
  /** SELECT paramétré, une ligne. */
  uneLigne<T>(sql: string, parametres?: readonly unknown[]): Promise<T | undefined>;
  /** SELECT paramétré, toutes les lignes. */
  lignes<T>(sql: string, parametres?: readonly unknown[]): Promise<readonly T[]>;
  /**
   * Valide au retour, annule sur exception. Remplace `dansTransaction`
   * (ex-`serveur/src/base/connexion.ts`).
   *
   * L'adaptateur est responsable de sérialiser les transactions concurrentes sur une même
   * connexion — voir `serveur/src/base/adaptateur-node-sqlite.ts` : passer d'un appel synchrone à
   * un contrat async introduit un point de cession (`await`) entre deux instructions SQL de la
   * même transaction, ce qui n'existait pas avant. Sans sérialisation, deux requêtes HTTP
   * concurrentes pourraient entrelacer leurs écritures dans la MÊME transaction non validée.
   */
  transaction<T>(action: () => Promise<T>): Promise<T>;
}
