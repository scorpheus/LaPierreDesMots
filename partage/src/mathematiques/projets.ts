import type { FamilleMaths, ProjetMathsId } from './types.js';

/** Trames éditoriales des six lieux. La fête réunit ensuite trois gestes déjà connus. */
export interface TrameProjetMaths {
  readonly id: ProjetMathsId;
  readonly version: 1;
  readonly titre: string;
  readonly etapes: readonly [FamilleMaths, FamilleMaths, FamilleMaths];
  readonly variablesTransmises: readonly string[];
  readonly transformation: string;
}
const trame = (id: ProjetMathsId, titre: string, etapes: readonly [FamilleMaths, FamilleMaths, FamilleMaths], variablesTransmises: readonly string[], transformation: string): TrameProjetMaths => ({
  id, version: 1, titre, etapes, variablesTransmises, transformation,
});
export const PROJETS_MATHS: readonly TrameProjetMaths[] = [
  trame('MAT-JAR-P01', 'Réveiller la pépinière', ['MAT-JAR-01', 'MAT-JAR-02', 'MAT-JAR-02'], ['totalGraines', 'partsEgales', 'grainesParCarre'], 'carrés plantés'),
  trame('MAT-JAR-P02', 'Le livre des saisons', ['MAT-JAR-03', 'MAT-JAR-01', 'MAT-JAR-03'], ['totalFruits', 'fruitsEnCaisse'], 'carnet consultable'),
  trame('MAT-JAR-P03', 'Le banquet des jardiniers', ['MAT-JAR-02', 'MAT-JAR-03', 'MAT-JAR-02'], ['partChoisie', 'convivesServis'], 'table de fête'),
  trame('MAT-PON-P01', 'La première traversée', ['MAT-PON-01', 'MAT-PON-03', 'MAT-PON-02'], ['porteeCm', 'reperePont'], 'passerelle ouverte'),
  trame('MAT-PON-P02', 'Les bornes du messager', ['MAT-PON-02', 'MAT-PON-01', 'MAT-PON-03'], ['bornes', 'longueursTrajet'], 'chemin du messager'),
  trame('MAT-PON-P03', 'Le pont de secours', ['MAT-PON-01', 'MAT-PON-03', 'MAT-PON-02'], ['manqueCm', 'porteeReparee'], 'rampe durable'),
  trame('MAT-MOU-P01', 'La roue immobile', ['MAT-MOU-01', 'MAT-MOU-03', 'MAT-MOU-02'], ['nombrePales', 'production'], 'roue réparée'),
  trame('MAT-MOU-P02', 'La tournée des sacs', ['MAT-MOU-01', 'MAT-MOU-01', 'MAT-MOU-02'], ['totalPales', 'mesuresProduites'], 'sacs livrés'),
  trame('MAT-MOU-P03', 'La réserve du moulin', ['MAT-MOU-03', 'MAT-MOU-02', 'MAT-MOU-01'], ['debit', 'production'], 'réserve visible'),
  trame('MAT-MAR-P01', 'Rouvrir les étals', ['MAT-MAR-01', 'MAT-MAR-03', 'MAT-MAR-02'], ['caisseCentimes', 'depenseCentimes'], 'étals ouverts'),
  trame('MAT-MAR-P02', 'La commande des voisins', ['MAT-MAR-03', 'MAT-MAR-01', 'MAT-MAR-02'], ['panierCentimes', 'donneCentimes'], 'livraison sur la carte'),
  trame('MAT-MAR-P03', 'La journée des échanges', ['MAT-MAR-01', 'MAT-MAR-03', 'MAT-MAR-02'], ['capitalCentimes', 'soldeCentimes'], 'enseigne allumée'),
  trame('MAT-CHA-P01', 'L’atelier des plans', ['MAT-CHA-01', 'MAT-CHA-02', 'MAT-CHA-03'], ['dimensions', 'nombreBlocs', 'masseGrammes'], 'atelier réparé'),
  trame('MAT-CHA-P02', 'La tour légère', ['MAT-CHA-02', 'MAT-CHA-03', 'MAT-CHA-01'], ['patron', 'masseGrammes', 'base'], 'tour debout'),
  trame('MAT-CHA-P03', 'Le toit des artisans', ['MAT-CHA-01', 'MAT-CHA-02', 'MAT-CHA-03'], ['dimensions', 'blocs', 'contrepoidsGrammes'], 'toit coloré'),
  trame('MAT-HOR-P01', 'La grande aiguille', ['MAT-HOR-01', 'MAT-HOR-02', 'MAT-HOR-03'], ['departMinutes', 'dureeMinutes', 'arriveeMinutes'], 'horloge réparée'),
  trame('MAT-HOR-P02', 'La tournée des compagnons', ['MAT-HOR-03', 'MAT-HOR-02', 'MAT-HOR-01'], ['departMinutes', 'dureeMinutes', 'arriveeMinutes'], 'chemin lumineux'),
  trame('MAT-HOR-P03', 'La fête au bon moment', ['MAT-HOR-03', 'MAT-HOR-02', 'MAT-HOR-01'], ['departMinutes', 'dureeMinutes', 'arriveeMinutes'], 'fanions en place'),
];

export const FETE_MATHS: TrameProjetMaths = trame('MAT-FET-P01', 'La fête des nombres',
  ['MAT-JAR-02', 'MAT-MOU-02', 'MAT-HOR-01'], ['nombreLieux', 'nombreProjets'], 'place en fête');

export function estProjetMaths(id: unknown): id is ProjetMathsId {
  return id === FETE_MATHS.id || PROJETS_MATHS.some((projet) => projet.id === id);
}

export function trameProjetMaths(id: ProjetMathsId): TrameProjetMaths {
  const trouvee = id === FETE_MATHS.id ? FETE_MATHS : PROJETS_MATHS.find((projet) => projet.id === id);
  if (!trouvee) throw new Error('Projet des nombres inconnu.');
  return trouvee;
}
