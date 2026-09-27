/** Parties de maths durables, utilisées à l'identique en HTTP et dans la PWA. */
import type { Base } from '../contrat.js';
import type { Horloge } from '../../horloge.js';
import { hacherSha256Hex } from '../hachage.js';
import { calculerEtoiles } from '../../etoiles.js';


import type { InstanceVallee } from '../../mathematiques/index.js';
import { creerInstanceMaths, creerInstancesProjetMaths, estInstanceMaths, appliquerGesteMaths, validerMaths, choisirInstanceMaths, representationMaths, estProjetMaths, estFamilleMaths, estNiveauMaths, CATALOGUE_MATHS, PROJETS_MATHS, domaineMaths } from '../../mathematiques/index.js';
import type {
  AideMaths, BilanParentMaths, CreerPartieMaths, CreerProjetMaths, EcrirePreferenceNiveauMaths, EcritureMaths,
  EtapeProjetMaths, FamilleMaths, InstanceMathsBase, ProjetMathsEnCours,
  ManipulerPartieMaths, NiveauMaths, PreferenceNiveauMaths, RepriseMaths, TentativeMaths, TerminerPartieMaths,
  ValidationMaths,
} from '../../mathematiques/types.js';
import {
  actualiserProjectionsMaths, analyserRepriseMaths, lireActionMathsParCle,
  lireGenerationMaths, lireInstanceMaths, lireInstanceMathsParCle, lireDerniereRepriseMaths,
  lirePreferenceNiveauMaths, lirePreferencesNiveauxMaths,
  lireProgressionMaths, lireProgressionProjetsMaths, lireProjetSuspenduMaths,
  lireRecompensesMaths, lireRepriseMaths,
  lireSessionProjetMaths, lireSessionProjetMathsParCle,
  lireTentativesMaths,
} from '../depots/mathematiques.js';
import type { ProgressionMathsLue, ProgressionProjetMathsLue, RecompenseMathsLue } from '../depots/mathematiques.js';
export { reconstruireProjectionsMaths } from '../depots/mathematiques.js';

export type CodeErreurMaths = 'conflit' | 'absente' | 'requete-invalide' | 'instance-incompatible';

export class ErreurMathematiques extends Error {
  constructor(
    readonly code: CodeErreurMaths,
    message: string,
    readonly revisionCourante?: number,
    readonly raison?: 'generation-maths-perimee' | 'cle-reutilisee' | 'revision-perimee',
  ) {
    super(message);
    this.name = 'ErreurMathematiques';
  }
}

export interface ResultatPartieMaths {
  readonly deja: boolean;
  readonly reprise: RepriseMaths;
}

export interface ResultatValidationMaths extends ResultatPartieMaths {
  readonly validation: ValidationMaths;
  readonly tentative: TentativeMaths | null;
  readonly recompenses: readonly RecompenseMathsLue[];
  readonly prochaineReprise: RepriseMaths | null;
}

export interface ResultatProjetMaths extends ResultatPartieMaths {
  readonly sessionId: string;
}

export interface EtatMaths {
  readonly generationMaths: number;
  readonly preferencesNiveaux: Readonly<Record<FamilleMaths, PreferenceNiveauMaths>>;
  readonly reprise: RepriseMaths | null;
  readonly projetSuspendu: RepriseMaths | null;
  readonly progression: readonly ProgressionMathsLue[];
  readonly projets: readonly ProgressionProjetMathsLue[];
  readonly recompenses: readonly RecompenseMathsLue[];
  readonly tentatives: readonly TentativeMaths[];
}

function obligatoire(valeur: string, champ: string): void {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new ErreurMathematiques('requete-invalide', `Le champ « ${champ} » est obligatoire.`);
  }
}

function generationValide(generation: number): void {
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new ErreurMathematiques('requete-invalide', 'La génération maths est invalide.');
  }
}

async function verifierGeneration(base: Base, profilId: string, generation: number): Promise<void> {
  obligatoire(profilId, 'profilId');
  generationValide(generation);
  const courante = await lireGenerationMaths(base, profilId);
  if (courante === null) throw new ErreurMathematiques('absente', 'Profil introuvable.');
  if (courante !== generation) {
    throw new ErreurMathematiques('conflit', 'Cette partie appartient à une ancienne génération maths.',
      undefined, 'generation-maths-perimee');
  }
}

function normaliser(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(normaliser);
  if (valeur !== null && typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>;
    return Object.fromEntries(Object.keys(objet).sort().map((cle) => [cle, normaliser(objet[cle])]));
  }
  return valeur;
}

async function empreinte(valeur: unknown): Promise<string> {
  const canonique = JSON.stringify(normaliser(valeur));
  if (canonique === undefined) {
    throw new ErreurMathematiques('requete-invalide', 'Contenu du geste non sérialisable.');
  }
  return hacherSha256Hex(canonique);
}

function instanceCompatible(instance: InstanceMathsBase): InstanceVallee {
  if (!estInstanceMaths(instance)) {
    throw new ErreurMathematiques('instance-incompatible',
      'Cette version du jeu ne sait pas reprendre cette instance.');
  }
  return instance;
}

async function lirePartieInterne(base: Base, profilId: string, instanceId: string): Promise<RepriseMaths> {
  const ligneInstance = await lireInstanceMaths(base, instanceId);
  const ligneReprise = await lireRepriseMaths(base, instanceId);
  if (ligneInstance === null || ligneReprise === null || ligneInstance.profil_id !== profilId ||
      ligneReprise.profil_id !== profilId) {
    throw new ErreurMathematiques('absente', 'Partie introuvable pour ce profil.');
  }
  const generation = await lireGenerationMaths(base, profilId);
  if (generation === null || generation !== Number(ligneInstance.generation_maths) ||
      generation !== Number(ligneReprise.generation_maths)) {
    throw new ErreurMathematiques('conflit', 'Cette partie appartient à une ancienne génération maths.',
      undefined, 'generation-maths-perimee');
  }
  if (Number(ligneReprise.version_etat) !== 1) {
    throw new ErreurMathematiques('instance-incompatible',
      'Cette version du jeu ne sait pas reprendre cet état.');
  }
  const instance = JSON.parse(ligneInstance.instance_json) as InstanceMathsBase;
  instanceCompatible(instance);
  return analyserRepriseMaths(ligneReprise, instance);
}

export async function lirePartieMaths(base: Base, profilId: string, instanceId: string): Promise<RepriseMaths | null> {
  try {
    const reprise = await lirePartieInterne(base, profilId, instanceId);
    const ligne = await lireRepriseMaths(base, instanceId);
    if (ligne?.statut === 'en_attente') {
      throw new ErreurMathematiques('conflit', 'Cette étape du projet n’est pas encore ouverte.');
    }
    return reprise;
  } catch (erreur) {
    if (erreur instanceof ErreurMathematiques && erreur.code === 'absente') return null;
    throw erreur;
  }
}

export async function lireEtatMaths(base: Base, profilId: string): Promise<EtatMaths> {
  const generation = await lireGenerationMaths(base, profilId);
  if (generation === null) throw new ErreurMathematiques('absente', 'Profil introuvable.');
  const active = await lireDerniereRepriseMaths(base, profilId, generation);
  const projetSuspendu = await lireProjetSuspenduMaths(base, profilId, generation);
  const preferencesNiveaux = Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
    [famille.id, { niveau: 'decouverte' as NiveauMaths, revision: 0 }])) as Record<FamilleMaths, PreferenceNiveauMaths>;
  for (const preference of await lirePreferencesNiveauxMaths(base, profilId, generation)) {
    preferencesNiveaux[preference.famille] = { niveau: preference.niveau, revision: preference.revision };
  }
  return {
    generationMaths: generation,
    preferencesNiveaux,
    reprise: active === null ? null : await lirePartieInterne(base, profilId, active.instance_id),
    projetSuspendu: projetSuspendu === null ? null :
      await lirePartieInterne(base, profilId, projetSuspendu.instance_id),
    progression: await lireProgressionMaths(base, profilId),
    projets: await lireProgressionProjetsMaths(base, profilId),
    recompenses: await lireRecompensesMaths(base, profilId),
    tentatives: await lireTentativesMaths(base, profilId),
  };
}

/** Le choix de l'enfant ne crée ni partie, ni tentative, ni nouveau plan de projet. */
export async function choisirNiveauMaths(
  base: Base, horloge: Horloge, demande: EcrirePreferenceNiveauMaths,
): Promise<PreferenceNiveauMaths> {
  obligatoire(demande.cleGeste, 'cleGeste');
  if (!estFamilleMaths(demande.famille) || !estNiveauMaths(demande.niveau) ||
      !Number.isSafeInteger(demande.revisionAttendue) || demande.revisionAttendue < 0) {
    throw new ErreurMathematiques('requete-invalide', 'Choix de niveau invalide.');
  }
  return base.transaction(async (transaction) => {
    await verifierGeneration(transaction, demande.profilId, demande.generationMaths);
    const avant = await lirePreferenceNiveauMaths(transaction, demande.profilId,
      demande.generationMaths, demande.famille);
    if (avant?.cle_geste === demande.cleGeste) {
      if (avant.niveau !== demande.niveau || avant.revision !== demande.revisionAttendue + 1) {
        throw new ErreurMathematiques('conflit', 'La clé désigne un autre choix.', avant.revision,
          'cle-reutilisee');
      }
      return { niveau: avant.niveau, revision: avant.revision };
    }
    const revision = avant?.revision ?? 0;
    if (revision !== demande.revisionAttendue) {
      throw new ErreurMathematiques('conflit', 'Le niveau a changé depuis ce choix.', revision,
        'revision-perimee');
    }
    const suivante: PreferenceNiveauMaths = { niveau: demande.niveau, revision: revision + 1 };
    const instant = String(horloge.maintenant());
    if (avant === null) {
      await transaction.lancer(
        `INSERT INTO preferences_niveaux_maths
         (profil_id, generation_maths, famille, niveau, revision, cle_geste, modifie_le)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [demande.profilId, demande.generationMaths, demande.famille, suivante.niveau,
          suivante.revision, demande.cleGeste, instant]);
    } else {
      const resultat = await transaction.lancer(
        `UPDATE preferences_niveaux_maths SET niveau = ?, revision = ?, cle_geste = ?, modifie_le = ?
         WHERE profil_id = ? AND generation_maths = ? AND famille = ? AND revision = ?`,
        [suivante.niveau, suivante.revision, demande.cleGeste, instant, demande.profilId,
          demande.generationMaths, demande.famille, revision]);
      if (resultat.changements !== 1) {
        throw new ErreurMathematiques('conflit', 'Le niveau a changé pendant ce choix.', revision,
          'revision-perimee');
      }
    }
    return suivante;
  });
}

/** Observations factuelles, sans seuil de maîtrise ni crédit dans la lecture. */
export async function lireBilanParentMaths(base: Base, profilId: string): Promise<readonly BilanParentMaths[]> {
  const generation = await lireGenerationMaths(base, profilId);
  if (generation === null) throw new ErreurMathematiques('absente', 'Profil introuvable.');
  const groupes = new Map<string, {
    famille: FamilleMaths; niveau: NiveauMaths; occasions: number; reussites: number;
    erreursValidees: number; aides: number; seul: boolean; notions: Set<string>;
  }>();
  const groupe = (famille: FamilleMaths, niveau: NiveauMaths) => {
    const cle = `${famille}|${niveau}`;
    let courant = groupes.get(cle);
    if (courant === undefined) {
      courant = { famille, niveau, occasions: 0, reussites: 0,
        erreursValidees: 0, aides: 0, seul: false, notions: new Set<string>() };
      groupes.set(cle, courant);
    }
    return courant;
  };
  for (const tentative of await lireTentativesMaths(base, profilId)) {
    const courant = groupe(tentative.famille, tentative.niveau);
    courant.occasions += 1;
    courant.reussites += 1;
    courant.erreursValidees += tentative.erreursValidees;
    courant.aides += tentative.aide === 'aucune' ? 0 : 1;
    courant.seul ||= tentative.aide === 'aucune';
    for (const notion of tentative.notions) courant.notions.add(notion);
  }
  const inachevees = await base.lignes<{
    famille: FamilleMaths; niveau: NiveauMaths; reprise_json: string;
  }>(`SELECT i.famille, i.niveau, r.reprise_json
      FROM reprises_maths r JOIN instances_maths i ON i.id = r.instance_id
      WHERE r.profil_id = ? AND r.generation_maths = ? AND r.statut <> 'terminee'
        AND r.revision > 0`, [profilId, generation]);
  for (const ligne of inachevees) {
    const reprise = JSON.parse(ligne.reprise_json) as RepriseMaths;
    const courant = groupe(ligne.famille, ligne.niveau);
    courant.occasions += 1;
    courant.erreursValidees += reprise.erreursValidees;
    courant.aides += reprise.aide === 'aucune' ? 0 : 1;
  }
  return [...groupes.values()].sort((a, b) =>
    `${a.famille}|${a.niveau}`.localeCompare(`${b.famille}|${b.niveau}`)).map((courant) => ({
    famille: courant.famille, niveau: courant.niveau,
    statut: courant.seul ? 'reussi-seul' : courant.reussites > 0 ? 'reussi-avec-aide' : 'essaye',
    occasions: courant.occasions, reussites: courant.reussites,
    erreursValidees: courant.erreursValidees, aides: courant.aides,
    notions: [...courant.notions].sort(),
  }));
}

async function signaturesRecentes(base: Base, profilId: string, famille: FamilleMaths): Promise<readonly string[]> {
  const lignes = await base.lignes<{ signature: string }>(
    `SELECT signature FROM instances_maths WHERE profil_id = ? AND famille = ?
     ORDER BY cree_le DESC, id DESC LIMIT 5`, [profilId, famille],
  );
  return lignes.map((ligne) => ligne.signature).reverse();
}

/** La partie libre évite les cinq dernières formes du même niveau et de la même génération. */
async function signaturesRecentesLibres(
  base: Base, profilId: string, generation: number, famille: FamilleMaths, niveau: NiveauMaths,
): Promise<readonly InstanceMathsBase[]> {
  const lignes = await base.lignes<{ instance_json: string }>(
    `SELECT instance_json FROM instances_maths
     WHERE profil_id = ? AND generation_maths = ? AND famille = ? AND niveau = ?
     ORDER BY cree_le DESC, rowid DESC LIMIT 5`,
    [profilId, generation, famille, niveau],
  );
  return lignes.map((ligne) => JSON.parse(ligne.instance_json) as InstanceMathsBase).reverse();
}

async function verifierCleCreationDisponible(
  base: Base, profilId: string, generation: number, cle: string,
): Promise<void> {
  if (await lireActionMathsParCle(base, profilId, generation, cle) ||
      await lireInstanceMathsParCle(base, profilId, generation, cle) ||
      await lireSessionProjetMathsParCle(base, profilId, generation, cle)) {
    throw new ErreurMathematiques('conflit', 'La clé est déjà utilisée pour une autre opération.',
      undefined, 'cle-reutilisee');
  }
}

/** Une nouvelle clé crée une nouvelle identité, même lorsque la graine est identique. */
export async function creerPartieMaths(
  base: Base, horloge: Horloge, demande: CreerPartieMaths,
): Promise<ResultatPartieMaths> {
  obligatoire(demande.cleGeste, 'cleGeste');
  if (!Number.isSafeInteger(demande.graine) || demande.projetId !== undefined) {
    throw new ErreurMathematiques('requete-invalide', 'Utilise la création de projet pour une étape liée.');
  }
  return base.transaction(async (transaction) => {
    await verifierGeneration(transaction, demande.profilId, demande.generationMaths);
    const marqueur = await empreinte({ type: 'partie', demande });
    const existante = await lireInstanceMathsParCle(transaction, demande.profilId,
      demande.generationMaths, demande.cleGeste);
    if (existante !== null) {
      if (existante.empreinte_creation !== marqueur || existante.session_projet_id !== null) {
        throw new ErreurMathematiques('conflit', 'La clé de création désigne un autre contenu.',
          undefined, 'cle-reutilisee');
      }
      return { deja: true, reprise: await lirePartieInterne(transaction, demande.profilId, existante.id) };
    }
    await verifierCleCreationDisponible(transaction, demande.profilId,
      demande.generationMaths, demande.cleGeste);
    const id = `mat-${(await hacherSha256Hex(
      `${demande.profilId}|${demande.generationMaths}|${demande.cleGeste}`)).slice(0, 24)}`;
    let valide: InstanceVallee;
    try {
      valide = instanceCompatible(creerInstanceMaths(demande));
    } catch {
      throw new ErreurMathematiques('requete-invalide', 'Famille, niveau ou graine incompatibles.');
    }
    const recentes = await signaturesRecentesLibres(transaction, demande.profilId,
      demande.generationMaths, valide.famille, demande.niveau);
    const signatures = recentes.map((recente) => recente.signature);
    let instance: InstanceMathsBase;
    try {
      instance = { ...choisirInstanceMaths(demande, signatures, undefined, recentes.map(representationMaths)), id };
    } catch {
      throw new ErreurMathematiques('requete-invalide', 'Famille, niveau ou graine incompatibles.');
    }
    instanceCompatible(instance);
    const instant = String(horloge.maintenant());
    const reprise: RepriseMaths = {
      profilId: demande.profilId, generationMaths: demande.generationMaths, revision: 0,
      instance, etat: instance.etatInitial, erreursValidees: 0, aide: 'aucune', projet: null,
      signaturesRecentes: { [instance.famille]: [...signatures, instance.signature].slice(-5) },
    };
    await transaction.lancer(
      `INSERT INTO instances_maths (id, profil_id, generation_maths, cle_creation,
        empreinte_creation, famille, niveau, modele_id, version_modele, version_generateur,
        graine, signature, session_projet_id, projet_id, projet_etape, instance_json, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
      [id, demande.profilId, demande.generationMaths, demande.cleGeste, marqueur,
        instance.famille, instance.niveau, instance.modeleId, instance.versionModele,
        instance.versionGenerateur, instance.graine, instance.signature,
        JSON.stringify(instance), instant],
    );
    await transaction.lancer(
      `UPDATE reprises_maths SET statut = 'suspendue', maj_le = ?
       WHERE profil_id = ? AND statut = 'active'`, [instant, demande.profilId],
    );
    await transaction.lancer(
      `INSERT INTO reprises_maths (instance_id, profil_id, generation_maths,
        revision, version_etat, statut, reprise_json, maj_le)
       VALUES (?, ?, ?, 0, 1, 'active', ?, ?)`,
      [id, demande.profilId, demande.generationMaths, JSON.stringify(reprise), instant],
    );
    return { deja: false, reprise };
  });
}

/** Fige les trois étapes et leurs quantités dans une seule transaction avant affichage. */
export async function creerProjetMaths(
  base: Base, horloge: Horloge, demande: CreerProjetMaths,
): Promise<ResultatProjetMaths> {
  obligatoire(demande.cleGeste, 'cleGeste');
  if (!Number.isSafeInteger(demande.graine) || !estProjetMaths(demande.projetId) ||
      !Array.isArray(demande.niveaux) || demande.niveaux.length !== 3) {
    throw new ErreurMathematiques('requete-invalide', 'Projet, niveaux ou graine incompatibles.');
  }
  return base.transaction(async (transaction) => {
    await verifierGeneration(transaction, demande.profilId, demande.generationMaths);
    const marqueur = await empreinte({ type: 'projet', demande });
    const existante = await lireSessionProjetMathsParCle(transaction, demande.profilId,
      demande.generationMaths, demande.cleGeste);
    if (existante !== null) {
      if (existante.empreinte_creation !== marqueur) {
        throw new ErreurMathematiques('conflit', 'La clé de projet désigne un autre contenu.',
          undefined, 'cle-reutilisee');
      }
      const plan = JSON.parse(existante.plan_json) as readonly EtapeProjetMaths[];
      const premiere = plan[0];
      if (premiere === undefined) throw new ErreurMathematiques('instance-incompatible', 'Plan de projet vide.');
      return { deja: true, sessionId: existante.id,
        reprise: await lirePartieInterne(transaction, demande.profilId, premiere.instanceId) };
    }
    await verifierCleCreationDisponible(transaction, demande.profilId,
      demande.generationMaths, demande.cleGeste);
    const accomplis = await lireProgressionProjetsMaths(transaction, demande.profilId);
    const estFini = (idProjet: string): boolean => accomplis.some((p) => p.projetId === idProjet && p.termineLe !== null);
    if (demande.projetId === 'MAT-FET-P01') {
      if (!PROJETS_MATHS.every((p) => estFini(p.id))) {
        throw new ErreurMathematiques('requete-invalide', 'Les dix-huit projets préparent la fête.');
      }
    } else if (!demande.projetId.endsWith('P01')) {
      const precedent = demande.projetId.slice(0, -1) + String(Number(demande.projetId.at(-1)) - 1);
      if (!estFini(precedent)) throw new ErreurMathematiques('requete-invalide', 'Termine le projet précédent de ce lieu.');
    }
    const sessionId = `prj-${(await hacherSha256Hex(
      `${demande.profilId}|${demande.generationMaths}|${demande.cleGeste}`)).slice(0, 24)}`;
    let projet: ReturnType<typeof creerInstancesProjetMaths>;
    try {
      projet = creerInstancesProjetMaths({ ...demande, sessionId });
    } catch {
      throw new ErreurMathematiques('requete-invalide', 'Combinaison de niveaux incompatible.');
    }
    if (projet.id !== demande.projetId || projet.sessionId !== sessionId ||
        projet.plan.length !== 3 || projet.etapes.length !== 3 ||
        projet.plan.some((etape, rang) => etape.rang !== rang ||
          etape.instanceId !== projet.etapes[rang]?.id ||
          etape.famille !== projet.etapes[rang]?.famille ||
          etape.niveau !== projet.etapes[rang]?.niveau)) {
      throw new ErreurMathematiques('instance-incompatible', 'Plan et instances du projet incohérents.');
    }
    const instant = String(horloge.maintenant());
    await transaction.lancer(
      `INSERT INTO sessions_projets_maths
       (id, profil_id, generation_maths, cle_creation, empreinte_creation, projet_id,
        version_projet, variables_json, plan_json, transformation_id, cadeau_id, cadeau_type, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, demande.profilId, demande.generationMaths, demande.cleGeste, marqueur,
        projet.id, projet.version, JSON.stringify(projet.variables), JSON.stringify(projet.plan),
        projet.transformationId, projet.cadeauId, projet.cadeauType, instant],
    );
    await transaction.lancer(
      `UPDATE reprises_maths SET statut = 'suspendue', maj_le = ?
       WHERE profil_id = ? AND statut = 'active'`, [instant, demande.profilId],
    );
    const commun: ProjetMathsEnCours = {
      id: projet.id, sessionId, version: projet.version, variables: projet.variables,
      plan: projet.plan, transformationId: projet.transformationId,
      cadeauId: projet.cadeauId, cadeauType: projet.cadeauType,
      etapeCourante: 0, instances: projet.plan.map((etape) => etape.instanceId),
      etoilesEtapes: [], suspendu: false,
    };
    let premiereReprise: RepriseMaths | null = null;
    for (const [rang, proposee] of projet.etapes.entries()) {
      const instance = instanceCompatible(proposee);
      const signatures = await signaturesRecentes(transaction, demande.profilId, instance.famille);
      const reprise: RepriseMaths = {
        profilId: demande.profilId, generationMaths: demande.generationMaths,
        revision: 0, instance, etat: instance.etatInitial, erreursValidees: 0,
        aide: 'aucune', projet: { ...commun, suspendu: rang !== 0 },
        signaturesRecentes: { [instance.famille]: [...signatures, instance.signature].slice(-5) },
      };
      await transaction.lancer(
        `INSERT INTO instances_maths (id, profil_id, generation_maths, cle_creation,
          empreinte_creation, famille, niveau, modele_id, version_modele, version_generateur,
          graine, signature, session_projet_id, projet_id, projet_etape, instance_json, cree_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [instance.id, demande.profilId, demande.generationMaths,
          `${demande.cleGeste}:etape:${rang}`, marqueur, instance.famille, instance.niveau,
          instance.modeleId, instance.versionModele, instance.versionGenerateur,
          instance.graine, instance.signature, sessionId, projet.id, rang,
          JSON.stringify(instance), instant],
      );
      await transaction.lancer(
        `INSERT INTO reprises_maths (instance_id, profil_id, generation_maths,
          revision, version_etat, statut, reprise_json, maj_le)
         VALUES (?, ?, ?, 0, 1, ?, ?, ?)`,
        [instance.id, demande.profilId, demande.generationMaths,
          rang === 0 ? 'active' : 'en_attente', JSON.stringify(reprise), instant],
      );
      if (rang === 0) premiereReprise = reprise;
    }
    await actualiserProjectionsMaths(transaction, demande.profilId);
    if (premiereReprise === null) {
      throw new ErreurMathematiques('instance-incompatible', 'Le projet ne contient aucun défi.');
    }
    return { deja: false, sessionId, reprise: premiereReprise };
  });
}

async function preparerEcriture(
  transaction: Base, ecriture: ManipulerPartieMaths | TerminerPartieMaths | EcritureMaths,
  type: 'manipulation' | 'validation' | 'pause',
): Promise<{ reprise: RepriseMaths; deja: unknown | null; marqueur: string }> {
  obligatoire(ecriture.instanceId, 'instanceId');
  obligatoire(ecriture.cleGeste, 'cleGeste');
  await verifierGeneration(transaction, ecriture.profilId, ecriture.generationMaths);
  const marqueur = await empreinte({ type, ecriture });
  const action = await lireActionMathsParCle(transaction, ecriture.profilId,
    ecriture.generationMaths, ecriture.cleGeste);
  if (action !== null) {
    if (Number(action.version_action) !== 1) {
      throw new ErreurMathematiques('instance-incompatible',
        'Cette version du jeu ne sait pas relire cet accusé.');
    }
    if (action.instance_id !== ecriture.instanceId || action.empreinte_requete !== marqueur) {
      throw new ErreurMathematiques('conflit', 'La clé du geste désigne un autre contenu.',
        undefined, 'cle-reutilisee');
    }
    return { reprise: await lirePartieInterne(transaction, ecriture.profilId, ecriture.instanceId),
      deja: JSON.parse(action.effet_json) as unknown, marqueur };
  }
  if (await lireInstanceMathsParCle(transaction, ecriture.profilId,
    ecriture.generationMaths, ecriture.cleGeste) ||
      await lireSessionProjetMathsParCle(transaction, ecriture.profilId,
        ecriture.generationMaths, ecriture.cleGeste)) {
    throw new ErreurMathematiques('conflit', 'La clé est déjà utilisée pour une création.',
      undefined, 'cle-reutilisee');
  }
  const reprise = await lirePartieInterne(transaction, ecriture.profilId, ecriture.instanceId);
  if (!Number.isSafeInteger(ecriture.revisionAttendue) || ecriture.revisionAttendue < 0) {
    throw new ErreurMathematiques('requete-invalide', 'Révision attendue invalide.');
  }
  if (reprise.revision !== ecriture.revisionAttendue) {
    throw new ErreurMathematiques('conflit', 'La partie a changé depuis cette requête.',
      reprise.revision, 'revision-perimee');
  }
  const ligne = await lireRepriseMaths(transaction, ecriture.instanceId);
  if (ligne?.statut === 'en_attente') {
    throw new ErreurMathematiques('conflit', 'Cette étape du projet n’est pas encore ouverte.',
      reprise.revision);
  }
  if (ligne?.statut === 'terminee') {
    throw new ErreurMathematiques('conflit', 'Cette partie est déjà conclue.', reprise.revision);
  }
  return { reprise, deja: null, marqueur };
}

async function inscrireAction(
  transaction: Base, ecriture: ManipulerPartieMaths | TerminerPartieMaths | EcritureMaths,
  type: 'manipulation' | 'validation' | 'pause', marqueur: string, effet: unknown,
  reprise: RepriseMaths, statut: 'active' | 'suspendue' | 'terminee', instant: string,
): Promise<void> {
  await transaction.lancer(
    `INSERT INTO actions_maths (instance_id, profil_id, generation_maths, revision_avant,
      revision_apres, cle_geste, empreinte_requete, version_action, type_action,
      action_json, effet_json, inscrit_le)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [ecriture.instanceId, ecriture.profilId, ecriture.generationMaths,
      ecriture.revisionAttendue, reprise.revision, ecriture.cleGeste, marqueur, type,
      JSON.stringify(type === 'manipulation' ? (ecriture as ManipulerPartieMaths).geste :
        type === 'validation' ? (ecriture as TerminerPartieMaths).reponse : { type: 'pause' }),
      JSON.stringify(effet), instant],
  );
  if (statut === 'active') {
    await transaction.lancer(
      `UPDATE reprises_maths SET statut = 'suspendue', maj_le = ?
       WHERE profil_id = ? AND statut = 'active' AND instance_id <> ?`,
      [instant, ecriture.profilId, ecriture.instanceId],
    );
  }
  const miseAJour = await transaction.lancer(
    `UPDATE reprises_maths SET revision = ?, reprise_json = ?, statut = ?, maj_le = ?
     WHERE instance_id = ? AND profil_id = ? AND generation_maths = ? AND revision = ?`,
    [reprise.revision, JSON.stringify(reprise), statut, instant,
      ecriture.instanceId, ecriture.profilId, ecriture.generationMaths, ecriture.revisionAttendue],
  );
  if (miseAJour.changements !== 1) {
    throw new ErreurMathematiques('conflit', 'La révision a changé pendant l’écriture.',
      undefined, 'revision-perimee');
  }
}

export async function manipulerPartieMaths(
  base: Base, horloge: Horloge, demande: ManipulerPartieMaths,
): Promise<ResultatPartieMaths> {
  return base.transaction(async (transaction) => {
    const preparation = await preparerEcriture(transaction, demande, 'manipulation');
    if (preparation.deja !== null) return { ...(preparation.deja as ResultatPartieMaths), deja: true };
    const { reprise } = preparation;
    const instance = instanceCompatible(reprise.instance);
    if (demande.geste === null || typeof demande.geste !== 'object') {
      throw new ErreurMathematiques('requete-invalide', 'Geste absent.');
    }
    const etat = appliquerGesteMaths(instance, reprise.etat, demande.geste);
    let aide: AideMaths = reprise.aide;
    if (demande.geste.type === 'aide') {
      aide = demande.geste.niveau === 'demonstration' || reprise.aide === 'demonstration'
        ? 'demonstration' : 'indice';
    }
    const suivante: RepriseMaths = { ...reprise, etat, aide, revision: reprise.revision + 1,
      projet: reprise.projet === null ? null : { ...reprise.projet, suspendu: false } };
    const resultat: ResultatPartieMaths = { deja: false, reprise: suivante };
    await inscrireAction(transaction, demande, 'manipulation', preparation.marqueur,
      resultat, suivante, 'active', String(horloge.maintenant()));
    return resultat;
  });
}

/** La pause est un geste confirmé : quitter l'écran attend son accusé transactionnel. */
export async function mettreEnPausePartieMaths(
  base: Base, horloge: Horloge, demande: EcritureMaths,
): Promise<ResultatPartieMaths> {
  return base.transaction(async (transaction) => {
    const preparation = await preparerEcriture(transaction, demande, 'pause');
    if (preparation.deja !== null) return { ...(preparation.deja as ResultatPartieMaths), deja: true };
    const projet = preparation.reprise.projet;
    const reprise: RepriseMaths = {
      ...preparation.reprise,
      revision: preparation.reprise.revision + 1,
      projet: projet === null ? null : { ...projet, suspendu: true },
    };
    const resultat: ResultatPartieMaths = { deja: false, reprise };
    await inscrireAction(transaction, demande, 'pause', preparation.marqueur,
      resultat, reprise, 'suspendue', String(horloge.maintenant()));
    return resultat;
  });
}

async function verifierEtapeProjet(
  base: Base, reprise: RepriseMaths,
): Promise<{ plan: readonly EtapeProjetMaths[]; rang: number } | null> {
  const contexte = reprise.instance.projet;
  if (contexte === undefined) return null;
  const session = await lireSessionProjetMaths(base, contexte.sessionId);
  if (session === null || session.profil_id !== reprise.profilId ||
      Number(session.generation_maths) !== reprise.generationMaths ||
      session.projet_id !== contexte.projetId ||
      Number(session.version_projet) !== contexte.versionProjet ||
      session.transformation_id !== contexte.transformationId ||
      session.cadeau_id !== contexte.cadeauId || session.cadeau_type !== contexte.cadeauType) {
    throw new ErreurMathematiques('instance-incompatible', 'Session de projet incompatible.');
  }
  const plan = JSON.parse(session.plan_json) as readonly EtapeProjetMaths[];
  const rang = contexte.etape;
  const etape = plan[rang];
  if (!Number.isSafeInteger(rang) || etape?.rang !== rang ||
      etape.instanceId !== reprise.instance.id || etape.famille !== reprise.instance.famille ||
      etape.niveau !== reprise.instance.niveau ||
      JSON.stringify(plan) !== JSON.stringify(contexte.plan) ||
      JSON.stringify(JSON.parse(session.variables_json)) !== JSON.stringify(contexte.variables)) {
    throw new ErreurMathematiques('instance-incompatible', 'Plan et instance du projet incohérents.');
  }
  for (const precedente of plan.slice(0, rang)) {
    const reussite = await base.uneLigne<{ id: string }>(
      `SELECT id FROM tentatives_maths WHERE profil_id = ? AND session_projet_id = ?
       AND instance_id = ? AND projet_etape = ?`,
      [reprise.profilId, contexte.sessionId, precedente.instanceId, precedente.rang],
    );
    if (reussite === undefined) {
      throw new ErreurMathematiques('conflit', 'L’étape précédente du projet reste à terminer.');
    }
  }
  return { plan, rang };
}

export async function terminerPartieMaths(
  base: Base, horloge: Horloge, demande: TerminerPartieMaths,
): Promise<ResultatValidationMaths> {
  return base.transaction(async (transaction) => {
    const preparation = await preparerEcriture(transaction, demande, 'validation');
    if (preparation.deja !== null) return { ...(preparation.deja as ResultatValidationMaths), deja: true };
    const { reprise } = preparation;
    if (demande.reponse?.famille !== reprise.instance.famille) {
      throw new ErreurMathematiques('requete-invalide', 'La réponse appartient à une autre famille.');
    }
    const etapeProjet = await verifierEtapeProjet(transaction, reprise);
    const validation = validerMaths(instanceCompatible(reprise.instance), reprise.etat);
    const erreurs = reprise.erreursValidees + (validation.statut === 'incorrecte' ? 1 : 0);
    let suivante: RepriseMaths = { ...reprise, erreursValidees: erreurs,
      revision: reprise.revision + 1,
      projet: reprise.projet === null ? null : { ...reprise.projet, suspendu: false } };
    let tentative: TentativeMaths | null = null;
    let prochaineReprise: RepriseMaths | null = null;
    const instant = String(horloge.maintenant());
    if (validation.statut === 'correcte') {
      const existe = await transaction.uneLigne<{ id: string }>(
        'SELECT id FROM tentatives_maths WHERE instance_id = ?', [demande.instanceId],
      );
      if (existe !== undefined) {
        throw new ErreurMathematiques('conflit', 'Cette instance a déjà une conclusion.', reprise.revision);
      }
      const etoiles = calculerEtoiles({ reussi: true, nbErreurs: erreurs,
        aideUtilisee: reprise.aide, dureeMs: 0, etapes: [] }) as 1 | 2 | 3;
      const id = `tma-${(await hacherSha256Hex(`${demande.instanceId}|${demande.cleGeste}`)).slice(0, 24)}`;
      // L'ordre durable tranche les horodatages égaux et les retours de l'horloge.
      // Il appartient au journal, donc un recalcul ou un import garde le premier gain.
      const dernierOrdre = await transaction.uneLigne<{ ordre: number }>(
        `SELECT COALESCE(MAX(COALESCE(json_extract(contexte_json, '$.ordreInscription'), rowid)), 0) AS ordre
         FROM tentatives_maths WHERE profil_id = ?`, [demande.profilId],
      );
      const contexte = { ...reprise.instance.projet?.variables,
        ordreInscription: Number(dernierOrdre?.ordre ?? 0) + 1 };
      tentative = {
        id, instanceId: demande.instanceId, famille: reprise.instance.famille,
        definition: { modeleId: reprise.instance.modeleId, versionModele: reprise.instance.versionModele,
          versionGenerateur: reprise.instance.versionGenerateur, graine: reprise.instance.graine },
        termineLe: instant,
        niveau: reprise.instance.niveau, projetId: reprise.instance.projet?.projetId ?? null,
        erreursValidees: erreurs, aide: reprise.aide, solution: validation.solution,
        etoiles, notions: domaineMaths(reprise.instance.famille, reprise.instance.niveau).notions, contexte,
      };
      await transaction.lancer(
        `INSERT INTO tentatives_maths (id, instance_id, profil_id, generation_maths,
          cle_geste, empreinte_requete, famille, niveau, session_projet_id, projet_id, projet_etape,
          nb_erreurs, aide_utilisee, etoiles, solution_json, notions_json, contexte_json, termine_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, demande.instanceId, demande.profilId, demande.generationMaths,
          demande.cleGeste, preparation.marqueur, tentative.famille, tentative.niveau,
          reprise.instance.projet?.sessionId ?? null, tentative.projetId,
          reprise.instance.projet?.etape ?? null, erreurs, reprise.aide,
          etoiles, JSON.stringify(validation.solution), JSON.stringify(tentative.notions),
          JSON.stringify(contexte), instant],
      );
      if (suivante.projet !== null) {
        suivante = { ...suivante, projet: { ...suivante.projet,
          etapeCourante: (etapeProjet?.rang ?? suivante.projet.etapeCourante) + 1,
          etoilesEtapes: [...suivante.projet.etoilesEtapes, etoiles] } };
      }
      const prochaineEtape = etapeProjet?.plan[etapeProjet.rang + 1];
      if (prochaineEtape !== undefined) {
        const attendue = await lireRepriseMaths(transaction, prochaineEtape.instanceId);
        if (attendue?.statut !== 'en_attente') {
          throw new ErreurMathematiques('conflit', 'La prochaine étape n’est plus en attente.');
        }
        const brute = await lirePartieInterne(transaction, demande.profilId,
          prochaineEtape.instanceId);
        prochaineReprise = { ...brute, projet: suivante.projet === null ? null : {
          ...suivante.projet, etapeCourante: etapeProjet!.rang + 1, suspendu: false,
        } };
      }
      await actualiserProjectionsMaths(transaction, demande.profilId);
    }
    const recompenses = await lireRecompensesMaths(transaction, demande.profilId);
    const resultat: ResultatValidationMaths = {
      deja: false, reprise: suivante, validation, tentative, recompenses, prochaineReprise,
    };
    await inscrireAction(transaction, demande, 'validation', preparation.marqueur, resultat,
      suivante, validation.statut === 'correcte' ? 'terminee' : 'active', instant);
    if (prochaineReprise !== null) {
      await transaction.lancer(
        `UPDATE reprises_maths SET statut = 'suspendue', maj_le = ?
         WHERE profil_id = ? AND statut = 'active'`, [instant, demande.profilId],
      );
      const activation = await transaction.lancer(
        `UPDATE reprises_maths SET statut = 'active', reprise_json = ?, maj_le = ?
         WHERE instance_id = ? AND profil_id = ? AND generation_maths = ?
           AND statut = 'en_attente' AND revision = 0`,
        [JSON.stringify(prochaineReprise), instant, prochaineReprise.instance.id,
          demande.profilId, demande.generationMaths],
      );
      if (activation.changements !== 1) {
        throw new ErreurMathematiques('conflit', 'La prochaine étape a changé pendant la conclusion.');
      }
    }
    return resultat;
  });
}
