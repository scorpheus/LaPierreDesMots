import { creerAlea } from '../alea.js';
import type { AideMaths, CreerPartieMaths, CreerProjetMaths, EtatManipulationMaths, GesteMaths,
  InstanceMathsBase, ProjetMathsEnCours, ValidationMaths } from './types.js';
import { estFamilleMaths, estGraineMaths, estNiveauMaths } from './entrees.js';
import { FETE_MATHS, estProjetMaths } from './projets.js';
import { graineSecoursMaths } from './secours.js';
import { genererPont, appliquerGestePont, validerPont, proposerAidePont, type InstancePont } from './jeux/ponts/index.js';
import { estInstancePont } from './jeux/ponts/compatibilite.js';
import { creerProjetPonts } from './jeux/ponts/projets.js';
import { genererJardin, appliquerGesteJardin, validerJardin, proposerAideJardin, estInstanceJardin, creerProjetJardin, type InstanceJardin } from './jeux/jardin/index.js';
import { genererMoulin, appliquerGesteMoulin, validerMoulin, proposerAideMoulin, estInstanceMoulin, creerProjetMoulin, type InstanceMoulin } from './jeux/moulin/index.js';
import { genererMarche, appliquerGesteMarche, validerMarche, proposerAideMarche, estInstanceMarche, creerProjetMarche, type InstanceMarche } from './jeux/marche/index.js';
import { genererChantier, appliquerGesteChantier, validerChantier, proposerAideChantier, estInstanceChantier, creerProjetChantier, type InstanceChantier } from './jeux/chantier/index.js';
import { genererHorloge, appliquerGesteHorloge, validerHorloge, proposerAideHorloge, estInstanceHorloge, creerProjetHorloge, type InstanceHorloge } from './jeux/horloge/index.js';

export type InstanceVallee = InstancePont | InstanceJardin | InstanceMoulin | InstanceMarche | InstanceChantier | InstanceHorloge;

export function estInstanceMaths(instance: unknown): instance is InstanceVallee {
  return estInstancePont(instance) || estInstanceJardin(instance) || estInstanceMoulin(instance) ||
    estInstanceMarche(instance) || estInstanceChantier(instance) || estInstanceHorloge(instance);
}

/** Générateurs purs : l'instance distribuée est ensuite figée par le service. */
function creerInstanceMathsBrute(commande: CreerPartieMaths): InstanceVallee {
  const alea = creerAlea(commande.graine);
  const { famille, niveau } = commande;
  switch (famille) {
    case 'MAT-PON-01': case 'MAT-PON-02': case 'MAT-PON-03': return genererPont(famille, niveau, alea);
    case 'MAT-JAR-01': case 'MAT-JAR-02': case 'MAT-JAR-03': return genererJardin(famille, niveau, alea);
    case 'MAT-MOU-01': case 'MAT-MOU-02': case 'MAT-MOU-03': return genererMoulin(famille, niveau, alea);
    case 'MAT-MAR-01': case 'MAT-MAR-02': case 'MAT-MAR-03': return genererMarche(famille, niveau, alea);
    case 'MAT-CHA-01': case 'MAT-CHA-02': case 'MAT-CHA-03': return genererChantier(famille, niveau, alea);
    case 'MAT-HOR-01': case 'MAT-HOR-02': case 'MAT-HOR-03': return genererHorloge(famille, niveau, alea);
  }
}
function validerCommandeLibre(commande: CreerPartieMaths): void {
  if (!estFamilleMaths(commande.famille) || !estNiveauMaths(commande.niveau) || !estGraineMaths(commande.graine)) {
    throw new Error('Famille, niveau ou graine mathématique invalide.');
  }
  if (commande.projetId !== undefined) throw new Error('Un projet doit créer ses étapes ensemble.');
}
export type GenerateurInstanceMaths = (commande: CreerPartieMaths) => InstanceVallee;
function creerSecoursMaths(commande: CreerPartieMaths, generer: GenerateurInstanceMaths): InstanceVallee {
  try { return generer({ ...commande, graine: graineSecoursMaths(commande.famille, commande.niveau) }); }
  catch { throw new Error('L’instance de secours maths ne peut pas être générée.'); }
}

/** Une activité libre peut revenir à sa graine éditoriale si le générateur rejette la sienne. */
export function creerInstanceMaths(commande: CreerPartieMaths): InstanceVallee {
  validerCommandeLibre(commande);
  try { return creerInstanceMathsBrute(commande); }
  catch {
    return creerSecoursMaths(commande, creerInstanceMathsBrute);
  }
}

/** Comparer le matériel présenté, sans confondre un nouvel identifiant avec une variante. */
export function representationMaths(instance: InstanceMathsBase): string {
  return JSON.stringify([instance.parametres, instance.stock]);
}

/** Recherche bornée : problème neuf, sinon représentation neuve, puis répétition. */
export function choisirInstanceMaths(commande: CreerPartieMaths, recentes: readonly string[], generer: GenerateurInstanceMaths = creerInstanceMathsBrute,
  representationsRecentes: readonly string[] = []): InstanceVallee {
  validerCommandeLibre(commande);
  const alea = creerAlea(commande.graine);
  let candidate: InstanceVallee | undefined;
  let variante: InstanceVallee | undefined;
  for (let essai = 0; essai < 12; essai += 1) {
    try { candidate = generer({ ...commande, graine: alea.entier(0, 0x1_0000_0000) }); }
    catch { continue; }
    if (!recentes.slice(-5).includes(candidate.signature)) return candidate;
    if (variante === undefined && !representationsRecentes.slice(-5).includes(representationMaths(candidate))) variante = candidate;
  }
  // L'anti-répétition est un confort : un dernier candidat valide est préférable au secours.
  return variante ?? candidate ?? creerSecoursMaths(commande, generer);
}

export function appliquerGesteMaths(instance: InstanceVallee, etat: EtatManipulationMaths, geste: GesteMaths): EtatManipulationMaths {
  if (estInstancePont(instance)) return appliquerGestePont(instance, etat, geste);
  if (estInstanceJardin(instance)) return appliquerGesteJardin(instance, etat, geste);
  if (estInstanceMoulin(instance)) return appliquerGesteMoulin(instance, etat, geste);
  if (estInstanceMarche(instance)) return appliquerGesteMarche(instance, etat, geste);
  if (estInstanceChantier(instance)) return appliquerGesteChantier(instance, etat, geste);
  if (estInstanceHorloge(instance)) return appliquerGesteHorloge(instance, etat, geste);
  throw new Error('Instance incompatible.');
}

export function validerMaths(instance: InstanceVallee, etat: EtatManipulationMaths): ValidationMaths {
  if (estInstancePont(instance)) return validerPont(instance, etat);
  if (estInstanceJardin(instance)) return validerJardin(instance, etat);
  if (estInstanceMoulin(instance)) return validerMoulin(instance, etat);
  if (estInstanceMarche(instance)) return validerMarche(instance, etat);
  if (estInstanceChantier(instance)) return validerChantier(instance, etat);
  if (estInstanceHorloge(instance)) return validerHorloge(instance, etat);
  throw new Error('Instance incompatible.');
}

export function proposerAideMaths(instance: InstanceVallee, aide: AideMaths, etat: EtatManipulationMaths) {
  // Seul un appel d'aide enregistré révèle l'indice ; aucune erreur ne le déclenche seule.
  if (estInstancePont(instance)) return proposerAidePont(instance, 0, aide, etat);
  if (estInstanceJardin(instance)) return proposerAideJardin(instance, 0, aide, etat);
  if (estInstanceMoulin(instance)) return proposerAideMoulin(instance, 0, aide, etat);
  if (estInstanceMarche(instance)) return proposerAideMarche(instance, 0, aide, etat);
  if (estInstanceChantier(instance)) return proposerAideChantier(instance, 0, aide, etat);
  if (estInstanceHorloge(instance)) return proposerAideHorloge(instance, 0, aide, etat);
  throw new Error('Instance incompatible.');
}

export type ProjetMathsInstancie = Pick<ProjetMathsEnCours, 'id' | 'sessionId' | 'version' | 'variables' | 'plan' | 'transformationId' | 'cadeauId' | 'cadeauType'> & {
  readonly etapes: readonly InstanceMathsBase[];
};

export function creerInstancesProjetMaths(commande: CreerProjetMaths & { readonly sessionId: string }): ProjetMathsInstancie {
  const { projetId, niveaux, sessionId, graine } = commande;
  if (!estGraineMaths(graine) || typeof sessionId !== 'string' || sessionId.trim() === '' ||
      !estProjetMaths(projetId) || !Array.isArray(niveaux) || niveaux.length !== 3 || !niveaux.every(estNiveauMaths)) {
    throw new Error('Projet, niveaux, graine ou session mathématique invalide.');
  }
  const alea = creerAlea(graine);
  const choix = [niveaux[0]!, niveaux[1]!, niveaux[2]!] as const;
  switch (projetId) {
    case 'MAT-PON-P01': case 'MAT-PON-P02': case 'MAT-PON-P03': return creerProjetPonts(projetId, niveaux, alea, sessionId);
    case 'MAT-JAR-P01': case 'MAT-JAR-P02': case 'MAT-JAR-P03': {
      const resultat = creerProjetJardin(projetId, choix, alea, sessionId);
      return { ...resultat.projet, etapes: resultat.instances };
    }
    case 'MAT-MOU-P01': case 'MAT-MOU-P02': case 'MAT-MOU-P03': {
      const resultat = creerProjetMoulin(projetId, choix, alea, sessionId);
      return { ...resultat.projet, etapes: resultat.instances };
    }
    case 'MAT-MAR-P01': case 'MAT-MAR-P02': case 'MAT-MAR-P03': {
      const resultat = creerProjetMarche(projetId, niveaux, alea, sessionId);
      return { ...resultat.projet, etapes: resultat.instances };
    }
    case 'MAT-CHA-P01': case 'MAT-CHA-P02': case 'MAT-CHA-P03': {
      const resultat = creerProjetChantier(projetId, choix, alea, sessionId);
      return { ...resultat.projet, etapes: resultat.instances };
    }
    case 'MAT-HOR-P01': case 'MAT-HOR-P02': case 'MAT-HOR-P03': {
      const resultat = creerProjetHorloge(projetId, niveaux, alea, sessionId);
      return { ...resultat.projet, etapes: resultat.instances };
    }
    case 'MAT-FET-P01': {
      const brutes = FETE_MATHS.etapes.map((famille, rang) => creerInstanceMaths({
        profilId: commande.profilId, generationMaths: commande.generationMaths,
        cleGeste: commande.cleGeste, famille, niveau: niveaux[rang]!, graine: alea.entier(0, 0x1_0000_0000),
      }));
      const plan = brutes.map((instance, rang) => ({ rang, famille: instance.famille, niveau: instance.niveau, instanceId: `${sessionId}:${rang}` }));
      const variables = { nombreLieux: 6, nombreProjets: 18 };
      const commun = { id: projetId, sessionId, version: 1, variables, plan,
        transformationId: 'vallee-en-fete', cadeauId: 'maths-souvenir-fete', cadeauType: 'fete' as const };
      return { ...commun, etapes: brutes.map((instance, rang) => ({ ...instance, id: plan[rang]!.instanceId,
        projet: { sessionId, projetId, versionProjet: 1, etape: rang, variables, plan,
          transformationId: commun.transformationId, cadeauId: commun.cadeauId, cadeauType: commun.cadeauType } })) };
    }
  }
}
