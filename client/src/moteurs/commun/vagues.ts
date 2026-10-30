/**
 * Découper un exercice dense en VAGUES — décision du parent du 30 oct.
 * (Docs/contrat-socle-activite.md § 12, point 1) : un exercice qui ne tient pas au corps de
 * lecture de l'enfant se découpe en étapes plus courtes plutôt que de tasser l'écran.
 *
 * Une vague est une suite CONTIGUË de consignes : la consigne affichée par l'écran est toujours
 * celle de l'étape en cours, et ses éléments sont donc toujours dans la vague montrée. Le contenu
 * validé par le parent n'est pas touché : seul le moteur choisit combien de consignes il montre à
 * la fois, et seulement quand la mesure dit que tout ne tient pas.
 */

/**
 * Coupe `tailles` (le nombre d'éléments de chaque consigne) en `nombre` groupes contigus non vides,
 * équilibrés en éléments. Rend, pour chaque vague, les index de ses consignes.
 */
export function decouperEnVagues(tailles: readonly number[], nombre: number): number[][] {
  const n = tailles.length;
  const k = Math.max(1, Math.min(Math.floor(nombre), n));
  if (n === 0) return [];
  const cumul: number[] = [];
  let somme = 0;
  for (const taille of tailles) {
    somme += Math.max(0, taille);
    cumul.push(somme);
  }
  const vagues: number[][] = [];
  let debut = 0;
  for (let v = 1; v <= k; v += 1) {
    // La dernière vague prend le reste ; les autres s'arrêtent au plus près de leur part,
    // en laissant au moins une consigne à chacune des vagues suivantes.
    let fin = n - 1;
    if (v < k) {
      const cible = (somme * v) / k;
      fin = debut;
      while (fin + 1 <= n - 1 - (k - v) && Math.abs((cumul[fin + 1] ?? 0) - cible) <= Math.abs((cumul[fin] ?? 0) - cible)) {
        fin += 1;
      }
    }
    const vague: number[] = [];
    for (let i = debut; i <= fin; i += 1) vague.push(i);
    vagues.push(vague);
    debut = fin + 1;
  }
  return vagues;
}

/** La vague qui contient l'étape en cours ; la dernière quand l'exercice est fini. */
export function vagueDeLEtape(vagues: readonly (readonly number[])[], indexEtape: number): number {
  const trouvee = vagues.findIndex((vague) => vague.includes(indexEtape));
  return trouvee < 0 ? Math.max(0, vagues.length - 1) : trouvee;
}

/**
 * Un cliquet de densité (vague de plus, plateau réduit, filet) ne monte que sur une mesure faite
 * avec la police de lecture : avec la police de repli, plus large, tout semble déborder, et un
 * cliquet ne redescend pas. Chaque moteur remesure déjà quand les polices arrivent.
 */
export function policesChargees(): boolean {
  return typeof document === 'undefined' || !('fonts' in document) || document.fonts.status === 'loaded';
}
