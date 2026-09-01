/**
 * Agrégation pure du banc de mutation.
 *
 * Une recette cataloguée n'est « jouée » que si elle a réellement rendu `DETECTEE` ou
 * `SURVIT`. `ANCRAGE-PERDU`, `INDECIS` et l'absence de résultat sont des non-mesures : les
 * glisser dans un dénominateur fabriquerait un taux rassurant avec des essais jamais faits.
 */
export function agregerResultats(recettes, resultats) {
  const parId = new Map(resultats.map((resultat) => [resultat.id, resultat]));
  const mutationsCataloguees = recettes.filter((recette) => recette.negatif !== true);
  const controlesCatalogues = recettes.filter((recette) => recette.negatif === true);
  const estExecute = (resultat) =>
    resultat !== undefined && (resultat.verdict === 'DETECTEE' || resultat.verdict === 'SURVIT');

  const mutationsExecutees = mutationsCataloguees
    .map((recette) => parId.get(recette.id))
    .filter(estExecute);
  const mutationsNonMesurees = mutationsCataloguees
    .filter((recette) => !estExecute(parId.get(recette.id)))
    .map((recette) => ({
      id: recette.id,
      verdict: parId.get(recette.id)?.verdict ?? 'NON-EXECUTEE',
      detail: parId.get(recette.id)?.detail ?? null
    }));
  const mutationsQuiValent = mutationsExecutees.filter(
    (resultat) => resultat.couvertPar !== 'equivalent'
  );
  const detectees = mutationsQuiValent.filter((resultat) => resultat.verdict === 'DETECTEE');
  const survivantes = mutationsQuiValent.filter((resultat) => resultat.verdict === 'SURVIT');

  const controlesExecutes = controlesCatalogues
    .map((recette) => parId.get(recette.id))
    .filter(estExecute);
  const controlesVerts = controlesExecutes.filter((resultat) => resultat.verdict === 'SURVIT');
  const controlesRouges = controlesExecutes.filter((resultat) => resultat.verdict === 'DETECTEE');
  const controlesNonMesures = controlesCatalogues
    .filter((recette) => !estExecute(parId.get(recette.id)))
    .map((recette) => ({
      id: recette.id,
      verdict: parId.get(recette.id)?.verdict ?? 'NON-EXECUTEE',
      detail: parId.get(recette.id)?.detail ?? null
    }));

  return {
    mutationsCataloguees,
    mutationsExecutees,
    mutationsNonMesurees,
    mutationsQuiValent,
    detectees,
    survivantes,
    controlesCatalogues,
    controlesExecutes,
    controlesVerts,
    controlesRouges,
    controlesNonMesures
  };
}

