import type { Alea } from '../../../alea.js';
import type { EtapeProjetMaths, NiveauMaths, ProjetMathsId } from '../../types.js';
import { COMBINAISONS_PON_P02, creerMesureManquePont, creerMesureTrajetPont,
  creerProjetPremiereTraversee, creerReparationPont, creerVerificationPont,
  creerTablierTrajetPont, genererPont, type InstancePont, type ProjetPremiereTraversee } from './index.js';

const BORNES_MESURE: Readonly<Record<NiveauMaths, readonly [number, number]>> = {
  decouverte: [2, 8], exploration: [5, 15], defi: [8, 25],
};
const BORNES_TABLIER: Readonly<Record<NiveauMaths, readonly [number, number]>> = {
  decouverte: [5, 12], exploration: [10, 25], defi: [15, 40],
};
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];

function porteesVerification(n02: NiveauMaths, n03: NiveauMaths): readonly number[] {
  const [min, max] = BORNES_TABLIER[n03];
  const pas = n02 === 'decouverte' ? 1 : 10;
  const limite = n02 === 'decouverte' ? 29 : 290;
  return Array.from({ length: Math.floor(limite / pas) }, (_, i) => (i + 1) * pas)
    .filter((portee) => portee >= min && portee <= max);
}

/** P03 : le manque est mesurable en 01, le pont entier en 03 et sur la rive 02. */
export const COMBINAISONS_PON_P03: readonly (readonly [NiveauMaths, NiveauMaths, NiveauMaths])[] =
  NIVEAUX.flatMap((n01) => NIVEAUX.flatMap((n03) => NIVEAUX.filter((n02) =>
    porteesVerification(n02, n03).some((portee) =>
      Math.max(6, BORNES_MESURE[n01][0]) <= Math.min(BORNES_MESURE[n01][1], portee - 2)))
    .map((n02) => [n01, n03, n02] as const)));

/** Les bornes désignent la destination ; les deux mesures gouvernent le tablier. */
export type ProjetPontsCompose = {
  readonly id: 'MAT-PON-P02' | 'MAT-PON-P03';
  readonly sessionId: string;
  readonly version: 1;
  readonly niveau: NiveauMaths | null;
  readonly niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
  readonly variables: Readonly<Record<string, number>>;
  readonly plan: readonly EtapeProjetMaths[];
  readonly transformationId: string;
  readonly cadeauId: string | null;
  readonly cadeauType: 'objet' | null;
  readonly etapes: readonly InstancePont[];
};

export function creerProjetPonts(id: 'MAT-PON-P01', niveaux: readonly NiveauMaths[], alea: Alea,
  sessionId: string): ProjetPremiereTraversee;
export function creerProjetPonts(id: 'MAT-PON-P02' | 'MAT-PON-P03', niveaux: readonly NiveauMaths[], alea: Alea,
  sessionId: string): ProjetPontsCompose;
export function creerProjetPonts(id: ProjetMathsId, niveaux: readonly NiveauMaths[], alea: Alea,
  sessionId: string): ProjetPremiereTraversee | ProjetPontsCompose;
export function creerProjetPonts(id: ProjetMathsId, niveaux: readonly NiveauMaths[], alea: Alea, sessionId: string):
  ProjetPremiereTraversee | ProjetPontsCompose {
  if (niveaux.length !== 3 || !['MAT-PON-P01', 'MAT-PON-P02', 'MAT-PON-P03'].includes(id) ||
      typeof sessionId !== 'string' || !sessionId.trim()) throw new Error('Projet des Ponts inconnu.');
  const choix = niveaux as readonly [NiveauMaths, NiveauMaths, NiveauMaths];
  if (id === 'MAT-PON-P01') return creerProjetPremiereTraversee(choix, alea, sessionId);

  let propositions: readonly [InstancePont, InstancePont, InstancePont];
  let variables: Record<string, number>;
  if (id === 'MAT-PON-P02') {
    if (!COMBINAISONS_PON_P02.some((c) => c.every((v, i) => v === choix[i]))) {
      throw new Error('Deux morceaux mesurables ne peuvent pas former un tablier à ces niveaux.');
    }
    const [n02, n01, n03] = choix;
    const bornes = genererPont('MAT-PON-02', n02, alea);
    const [min01, max01] = BORNES_MESURE[n01];
    const [min03, max03] = BORNES_TABLIER[n03];
    const paires = Array.from({ length: max01 - min01 + 1 }, (_, i) => min01 + i)
      .flatMap((a) => Array.from({ length: max01 - min01 + 1 }, (_, i) => min01 + i)
        .filter((b) => a + b >= min03 && a + b <= max03).map((b) => [a, b] as const));
    const [longueurA, longueurB] = paires[alea.entier(0, paires.length)]!;
    const sommeCm = longueurA + longueurB;
    const mesure = creerMesureTrajetPont(n01, alea, longueurA, longueurB, bornes.parametres.reperePont);
    const tablier = creerTablierTrajetPont(n03, alea, longueurA, longueurB, bornes.parametres.reperePont);
    propositions = [bornes, mesure, tablier];
    variables = { bornes: bornes.parametres.reperePont,
      repereDestination: bornes.parametres.reperePont, longueurA, longueurB,
      longueursTrajet: sommeCm, sommeCm,
      porteeCm: sommeCm, reperePont: bornes.parametres.reperePont };
  } else {
    if (!COMBINAISONS_PON_P03.some((c) => c.every((v, i) => v === choix[i]))) {
      throw new Error('Le manque et la portée réparée ne sont pas représentables à ces niveaux.');
    }
    const [n01, n03, n02] = choix;
    const portees = porteesVerification(n02, n03).filter((portee) =>
      Math.max(6, BORNES_MESURE[n01][0]) <= Math.min(BORNES_MESURE[n01][1], portee - 2));
    const porteeReparee = portees[alea.entier(0, portees.length)]!;
    const minimumManque = Math.max(6, BORNES_MESURE[n01][0]);
    const maximumManque = Math.min(BORNES_MESURE[n01][1], porteeReparee - 2);
    const manqueCm = alea.entier(minimumManque, maximumManque + 1);
    const moduleRestantCm = porteeReparee - manqueCm;
    const mesure = creerMesureManquePont(n01, alea, manqueCm, moduleRestantCm);
    const tablier = creerReparationPont(n03, alea, porteeReparee, moduleRestantCm);
    const bornes = creerVerificationPont(n02, alea, porteeReparee);
    propositions = [mesure, tablier, bornes];
    variables = { manqueCm, moduleRestantCm, moduleEndommageCm: manqueCm,
      porteeReparee, porteeCm: porteeReparee, reperePont: porteeReparee };
  }
  const transformationId = id === 'MAT-PON-P02' ? 'ponts-chemin-messager' : 'ponts-rampe-secours';
  const cadeauId = id === 'MAT-PON-P03' ? 'maths-objet-ponts' : null;
  const cadeauType = id === 'MAT-PON-P03' ? 'objet' as const : null;
  const plan: readonly EtapeProjetMaths[] = propositions.map((instance, rang) => ({
    rang, famille: instance.famille, niveau: instance.niveau, instanceId: `${sessionId}:${rang}`,
  }));
  const etapes = propositions.map((instance, rang): InstancePont => ({
    ...instance, id: plan[rang]!.instanceId,
    projet: { sessionId, projetId: id, versionProjet: 1, etape: rang, variables, plan,
      transformationId, cadeauId, cadeauType },
  }));
  return { id: id as 'MAT-PON-P02' | 'MAT-PON-P03', sessionId, version: 1 as const,
    niveau: choix.every((niveau) => niveau === choix[0]) ? choix[0] : null,
    niveaux: choix, variables, plan, transformationId, cadeauId, cadeauType, etapes };
}
