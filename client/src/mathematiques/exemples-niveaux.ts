import { creerInstanceMaths, graineSecoursMaths,
  type FamilleMaths, type NiveauMaths } from '@pierre/partage/mathematiques';

const exemples = new Map<string, string>();

/** Exemple éditorial déterministe : aucune partie ni tentative n'est créée. */
export function exempleNiveauMaths(famille: FamilleMaths, niveau: NiveauMaths): string {
  const cle = `${famille}:${niveau}`;
  const connu = exemples.get(cle);
  if (connu !== undefined) return connu;
  const instance = creerInstanceMaths({ profilId: 'exemple', generationMaths: 0,
    famille, niveau, graine: graineSecoursMaths(famille, niveau), cleGeste: 'exemple' });
  exemples.set(cle, instance.consigne.texte);
  return instance.consigne.texte;
}
