// `PortApiLocal` — modes autonomes Android et PWA, hors ligne. Lot 4 du portage Android puis
// Docs/contrat-pwa-github-pages.md § 2. Zéro réseau : chaque méthode appelle directement
// les dépôts/services de `@pierre/partage/base` contre la base SQLite locale
// (`@capacitor-community/sqlite`, Lot 3), exactement la même logique que les routes Fastify —
// ce fichier EST le contenu de ces routes, débarrassé de Fastify.
//
// PARITÉ DE FORME AVEC `PortApiHttp`, PAS SEULEMENT DE RÉSULTAT.
//
// Plusieurs écrans (`EcranCodeParent.tsx`, `EcranDefinirCode.tsx`) inspectent
// `cause.statut`/`cause.corps` d'une `ErreurReseau` pour décider quoi afficher — un 404 bascule
// vers l'écran de définition, un 423 affiche l'échéance du verrou, un 409 dit « redemande ton
// code ». Ce port doit donc lever la MÊME `ErreurReseau`, avec le MÊME statut et la même forme
// de corps, que `serveur/src/routes/parent.ts` produirait pour la même situation — sinon les
// écrans se comporteraient différemment selon le mode, ce que rien ne justifie.
import { CHEMINS_API } from '@pierre/partage';
import { ErreurPierre, creerAlea, horloge, moteursEnregistres } from '@pierre/partage';
import type {
  CodeRegion,
  CreationProfil,
  EntreeSelecteur,
  Exercice,
  IdExercice,
  IdNoeud,
  IdProfil,
  Noeud,
  NoeudCandidat,
  PaquetNoeud,
  Profil,
  ProgressionNoeud,
  ReponseSante,
  ReponseTentative,
  TentativeAEnregistrer
} from '@pierre/partage';
import type { ComparaisonTypographie, ReglagesLecture } from '@pierre/partage/lecture';
import { composerSortie as composerSortiePure } from '@pierre/partage/pedagogie';
import type { CodeCompagnon, EtatMaitrise, ItemLeitner, PlanSortie } from '@pierre/partage/pedagogie';
import type { CodeObjetCampement, EtatMonde } from '@pierre/partage/monde';
import { moteursFavorises } from '@pierre/partage/monde';
import {
  confirmationValide,
  estPorteeReinitialisation,
  pertesDeLaPortee
} from '@pierre/partage/parent';
import type {
  ApercuReinitialisation,
  ApercuSuppression,
  CatalogueGalerie,
  CodeExport,
  DecisionRelecture,
  EntreeRelecture,
  EtatPorteParent,
  EtatProfil,
  OuvertureParent,
  PorteeReinitialisation,
  RapportReinitialisation,
  RapportSuppressionProfil,
  ResumeDashboard,
  StatutRelecture,
  VerrouParent
} from '@pierre/partage/parent';
import {
  appliquerEchec,
  codeEstDefini,
  confusionsDuProfil,
  construireExport,
  couvertureDuProfil,
  creerProfil,
  deriverCode,
  ecrireCodeParent,
  ecrireReglages,
  ecrireVerrou,
  enregistrerOuvertureVue,
  enregistrerTentative,
  estCodeExport,
  estVerrouille,
  etatDuProfil,
  hacherSha256Hex,
  isoDepuisMs,
  latencesDuProfil,
  lireCodeParent,
  lireComparaison,
  lireMaitrises,
  lireMonde,
  lireProfil,
  lireProgression,
  lireProgressionNoeud,
  lireReglages,
  lireRevisionsDues,
  lireVerrou,
  listerProfils,
  listerRelecture,
  noterVisitePoint,
  objetConnu,
  pointConnu,
  poserObjetCampement as poserObjetCampementDepot,
  previsualiserReinitialisation,
  profilExiste,
  recalculerToutesLesCascades,
  reinitialiserProfil,
  reinitialiserVerrou,
  selNeuf,
  supprimerProfil,
  tablesNonVidees,
  trancherRelecture,
  validerCreationProfil,
  validerTentative,
  verifierCode,
  versHex
} from '@pierre/partage/base';
import type { AlimentationPedagogique, Base } from '@pierre/partage/base';

import type { DashboardParent, PaquetNoeudAttendu, PortApi } from './contrat.js';
import { ErreurReseau, lireJetonParent, poserJetonParent } from './commun.js';
import { migrerBaseAutonome } from '../base/migrations-autonome.js';
import { creerDepotContenuAutonome, urlAssetAutonome } from '../base/depot-contenu-autonome.js';
import { construireCatalogueExercicesAutonome } from '../base/catalogue-galerie-autonome.js';
import {
  chargerParametresPedagogieAutonome,
  chargerReferentielMondeAutonome,
  chargerSeuilsCascadeAutonome
} from '../base/referentiels-autonome.js';

// ─────────────────────────────────────────────────────────────────── la base, ouverte une fois

let basePromise: ReturnType<typeof creerBase> | null = null;

async function ouvrirBaseLocale(): Promise<Base> {
  if (import.meta.env.MODE === 'pwa') {
    return (await import('../base/adaptateur-sqlite-wasm.js')).ouvrirBaseNavigateur();
  }
  const { ouvrirBaseCapacitor, creerBaseCapacitorSqlite } = await import(
    '../base/adaptateur-capacitor-sqlite.js'
  );
  return creerBaseCapacitorSqlite(await ouvrirBaseCapacitor());
}

async function creerBase(): Promise<Base> {
  const base = await ouvrirBaseLocale();
  await migrerBaseAutonome(base, horloge.maintenant());
  await base.transaction((transaction) => recalculerToutesLesCascades(
    transaction, chargerSeuilsCascadeAutonome()
  ));
  return base;
}

function garantirBase(): ReturnType<typeof creerBase> {
  basePromise ??= creerBase().catch((cause: unknown) => {
    basePromise = null;
    console.error('[base-locale] ouverture ou migration impossible :', cause);
    throw cause;
  });
  return basePromise;
}

const depotContenu = creerDepotContenuAutonome();
const alea = creerAlea();
const referentielMonde = chargerReferentielMondeAutonome();

// ─────────────────────────────────────────────────────────────── la zone parent, en mémoire

/**
 * Jetons vivants, en mémoire — même principe que le `Map` de fermeture de
 * `enregistrerRoutesParent` côté serveur, et pour la même raison : redémarrer l'app doit
 * refermer la zone parent. Un seul appareil, un seul processus : rien à partager.
 */
const jetons = new Map<string, number>();

/** Même durée que `DUREE_JETON_MS` (`serveur/src/routes/parent.ts`) : 30 minutes. */
const DUREE_JETON_MS = 30 * 60 * 1000;

function poserJeton(maintenantMs: number): OuvertureParent {
  for (const [existant, expiration] of jetons) {
    if (expiration <= maintenantMs) {
      jetons.delete(existant);
    }
  }
  const jeton = versHex(selNeuf()) + versHex(selNeuf());
  const expirationMs = maintenantMs + DUREE_JETON_MS;
  jetons.set(jeton, expirationMs);
  poserJetonParent(jeton);
  return { jeton, expireLe: isoDepuisMs(expirationMs) };
}

/** Lève une `ErreurReseau` 401, forme identique à `jetonValide()` côté serveur, si invalide. */
function exigerJeton(): void {
  const jeton = lireJetonParent();
  const maintenantMs = Date.parse(horloge.maintenant());
  const expiration = jeton === null ? undefined : jetons.get(jeton);
  if (jeton === null || expiration === undefined || expiration <= maintenantMs) {
    if (jeton !== null) {
      jetons.delete(jeton);
    }
    throw new ErreurReseau(
      401,
      '(local)',
      'La zone parent demande un code. Referme cette page et recommence.'
    );
  }
}

function erreurVerrouille(verrou: VerrouParent): ErreurReseau {
  return new ErreurReseau(
    423,
    '(local)',
    `La zone parent est fermee un moment. Reessaie apres ${String(verrou.verrouilleJusqua)}.`,
    { details: { verrouilleJusqua: verrou.verrouilleJusqua, nbEchecs: verrou.nbEchecs } }
  );
}

const MOTIF_CODE = /^\d{4}$/u;

// ────────────────────────────────────────────────────────────────────────── sortie (L2-D)

const COMPAGNONS: readonly string[] = ['filou', 'bulle', 'roc', 'plume'];

function construireCandidats(
  noeuds: readonly Noeud[],
  exercices: readonly Exercice[]
): readonly NoeudCandidat[] {
  const parId = new Map<string, Exercice>(exercices.map((e) => [e.id, e]));
  const candidats: NoeudCandidat[] = [];
  for (const noeud of noeuds) {
    if (noeud.progression === false) continue;
    const exercice = parId.get(noeud.exercice);
    if (exercice === undefined) continue;
    candidats.push({
      noeud: noeud.id,
      habillage: exercice.jeu.habillage,
      region: noeud.region,
      competences: exercice.competences,
      difficulte: exercice.difficulte,
      temps: noeud.temps,
      moteur: exercice.jeu.moteur
    });
  }
  return candidats;
}

// ══════════════════════════════════════════════════════════════════════════════════════════

export const portLocal: PortApi = {
  async lireSante(): Promise<ReponseSante> {
    return {
      statut: 'ok',
      version: '1.0.0',
      maintenant: horloge.maintenant(),
      base: 'ouverte',
      moteurs: moteursEnregistres()
    };
  },

  async listerProfils(): Promise<readonly Profil[]> {
    return listerProfils(await garantirBase());
  },

  async creerProfil(creation: CreationProfil): Promise<Profil> {
    const validation = validerCreationProfil(creation);
    if (!validation.ok) {
      throw new ErreurReseau(400, '(local)', validation.message);
    }
    return creerProfil(await garantirBase(), validation.valeur, horloge);
  },

  async lireProfil(id: IdProfil): Promise<Profil> {
    const profil = await lireProfil(await garantirBase(), id);
    if (profil === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return profil;
  },

  async lireProgression(id: IdProfil): Promise<readonly ProgressionNoeud[]> {
    const base = await garantirBase();
    if ((await lireProfil(base, id)) === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireProgression(base, id);
  },

  async lirePaquetNoeud(id: IdNoeud): Promise<PaquetNoeudAttendu> {
    const noeud = await depotContenu.chargerNoeud(id);
    if (noeud === null) {
      throw new ErreurReseau(404, '(local)', `Noeud inconnu : ${id}`);
    }
    const exercice = await depotContenu.chargerExercice(noeud.exercice);
    if (exercice === null) {
      throw new ErreurReseau(404, '(local)', `Exercice inconnu pour le noeud : ${id}`);
    }
    const habillage = await depotContenu.chargerHabillage(exercice.jeu.habillage);
    if (habillage === null) {
      throw new ErreurReseau(404, '(local)', `Habillage inconnu pour l'exercice : ${exercice.id}`);
    }
    const paquet: PaquetNoeud = { noeud, exercice, habillage };
    return paquet;
  },

  async enregistrerTentative(tentative: TentativeAEnregistrer): Promise<ReponseTentative> {
    const base = await garantirBase();

    const exerciceId = String((tentative as { exercice?: unknown }).exercice ?? '');
    const exercice = exerciceId === '' ? null : await depotContenu.chargerExercice(exerciceId);
    const competences = exercice === null ? [] : [...exercice.competences];

    const validation = await validerTentative(tentative, competences[0] ?? '');
    if (!validation.ok) {
      throw new ErreurReseau(400, '(local)', validation.message);
    }
    const validee = validation.valeur;

    if (!(await profilExiste(base, validee.profil))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${validee.profil}`);
    }

    const pedagogie: AlimentationPedagogique | undefined =
      competences.length === 0
        ? undefined
        : { competences, parametres: chargerParametresPedagogieAutonome() };

    const resultat = await enregistrerTentative(
      base,
      validee,
      horloge,
      chargerSeuilsCascadeAutonome(),
      referentielMonde,
      pedagogie
    );

    const progression = await lireProgressionNoeud(base, resultat.tentative.profil, resultat.tentative.noeud);
    if (progression === null) {
      throw new Error(
        `Progression introuvable apres enregistrement (profil ${resultat.tentative.profil}, ` +
          `noeud ${resultat.tentative.noeud}).`
      );
    }

    return {
      deja: resultat.deja,
      tentative: resultat.tentative,
      progression,
      gainCascade: resultat.gainCascade
    };
  },

  urlAsset(cheminRelatif: string): string {
    const url = urlAssetAutonome(cheminRelatif);
    // `null` : asset non embarqué (rare — glob incomplet). On rend quand même une URL, sur le
    // même motif que le mode LAN, pour que l'appelant échoue de la même façon (fetch 404) plutôt
    // que de recevoir une chaîne vide silencieusement différente.
    return url ?? CHEMINS_API.asset(cheminRelatif.replace(/^\/+/u, ''));
  },

  async lireReglagesLecture(id: IdProfil): Promise<ReglagesLecture> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireReglages(base, id);
  },

  async ecrireReglagesLecture(id: IdProfil, reglages: Partial<ReglagesLecture>): Promise<ReglagesLecture> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return ecrireReglages(base, id, reglages, horloge);
  },

  async lireEssaiTypographie(id: IdProfil): Promise<ComparaisonTypographie | null> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireComparaison(base, id);
  },

  async lireMaitrise(id: IdProfil): Promise<readonly EtatMaitrise[]> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireMaitrises(base, id);
  },

  async lireRevisions(id: IdProfil): Promise<readonly ItemLeitner[]> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireRevisionsDues(base, id, horloge.maintenant());
  },

  async composerSortie(
    id: IdProfil,
    demande: { readonly region: string; readonly compagnon: CodeCompagnon | null }
  ): Promise<PlanSortie> {
    const base = await garantirBase();
    if (!(await profilExiste(base, id))) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    const regionTexte = demande.region.trim();
    if (regionTexte === '') {
      throw new ErreurReseau(400, '(local)', 'Le champ « region » est obligatoire.');
    }
    const region = regionTexte as CodeRegion;
    const compagnonDemande = COMPAGNONS.includes(String(demande.compagnon))
      ? (demande.compagnon as CodeCompagnon)
      : null;
    const compagnonRallie = compagnonDemande === null
      ? undefined
      : await base.uneLigne<{ readonly code: string }>(
          'SELECT code FROM compagnons WHERE profil_id = ? AND code = ?',
          [id, compagnonDemande]
        );
    const compagnon = compagnonRallie === undefined ? null : compagnonDemande;
    const definitionCompagnon = referentielMonde.compagnons.find(
      (definition) => definition.code === compagnon
    ) ?? null;

    const [noeuds, exercices] = await Promise.all([depotContenu.listerNoeuds(), depotContenu.listerExercices()]);
    const competences =
      depotContenu.listerCompetences === undefined ? [] : await depotContenu.listerCompetences();

    const parametres = chargerParametresPedagogieAutonome();
    const maintenant = horloge.maintenant();

    const entree: EntreeSelecteur = {
      profil: id,
      region,
      compagnon,
      moteursFavorises: moteursFavorises(definitionCompagnon),
      maitrises: await lireMaitrises(base, id),
      revisionsDues: await lireRevisionsDues(base, id, maintenant),
      noeudsDisponibles: construireCandidats(noeuds, exercices),
      noeudsTermines: (await lireProgression(base, id)).filter((ligne) => ligne.etoiles > 0).map((ligne) => ligne.noeud),
      competences,
      maintenant
    };

    let plan: PlanSortie;
    try {
      plan = composerSortiePure(entree, parametres, alea);
    } catch (erreur) {
      if (ErreurPierre.porteLeCode(erreur, 'contenu-invalide')) {
        throw new ErreurReseau(409, '(local)', (erreur as ErreurPierre).message);
      }
      throw erreur;
    }

    const empreinte = await hacherSha256Hex(`${id}|${plan.region}|${plan.composeeLe}`);
    const idSortie = `srt-${empreinte.slice(0, 16)}`;
    await base.lancer(
      `INSERT INTO sorties (id, profil_id, region, compagnon, plan_json, composee_le, close_le)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT (id) DO UPDATE SET plan_json = excluded.plan_json, compagnon = excluded.compagnon`,
      [idSortie, id, plan.region, plan.compagnon, JSON.stringify(plan), plan.composeeLe]
    );

    return plan;
  },

  async lireMonde(id: IdProfil): Promise<EtatMonde> {
    const base = await garantirBase();
    if ((await lireProfil(base, id)) === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    return lireMonde(base, id, referentielMonde, horloge);
  },

  async poserObjetCampement(id: IdProfil, objet: CodeObjetCampement): Promise<EtatMonde> {
    const base = await garantirBase();
    if ((await lireProfil(base, id)) === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${id}`);
    }
    if (!objetConnu(referentielMonde, objet)) {
      throw new ErreurReseau(404, '(local)', `Objet de campement inconnu : ${objet}`);
    }
    await poserObjetCampementDepot(base, id, objet, horloge);
    return lireMonde(base, id, referentielMonde, horloge);
  },

  /**
   * R31 / R11 (lot Q1). Gratuit, sans conséquence pédagogique : un profil ou un point inconnu
   * n'est jamais signalé à l'appelant, exactement comme le port réseau n'en dit rien à l'écran
   * (`PointLibre` avale déjà l'échec, v2 § 3.4 — « rien ne se rate au campement »).
   */
  async noterVisitePointCampement(id: IdProfil, point: string): Promise<void> {
    const base = await garantirBase();
    if ((await lireProfil(base, id)) === null || !pointConnu(referentielMonde, point)) {
      return;
    }
    await noterVisitePoint(base, id, point, horloge);
  },

  async marquerOuvertureVue(id: IdProfil, passee: boolean): Promise<void> {
    const base = await garantirBase();
    if ((await lireProfil(base, id)) === null) {
      return;
    }
    await enregistrerOuvertureVue(base, id, passee, horloge);
  },

  // ──────────────────────────────────────────────────────────────────────── zone parent

  async ouvrirZoneParent(code: string): Promise<OuvertureParent> {
    const base = await garantirBase();
    const codePropre = code.trim();
    const maintenant = horloge.maintenant();

    const verrou = await lireVerrou(base);
    if (estVerrouille(verrou, maintenant)) {
      throw erreurVerrouille(verrou);
    }

    if (!MOTIF_CODE.test(codePropre)) {
      const apres = appliquerEchec(verrou, maintenant);
      await ecrireVerrou(base, apres);
      if (estVerrouille(apres, maintenant)) {
        throw erreurVerrouille(apres);
      }
      throw new ErreurReseau(400, '(local)', 'Le code parent compte exactement 4 chiffres.');
    }

    const stocke = await lireCodeParent(base);
    if (stocke === null) {
      throw new ErreurReseau(404, '(local)', 'Aucun code n’a encore ete choisi pour ce foyer. Choisis-en un.');
    }

    if (!(await verifierCode(codePropre, stocke.sel, stocke.empreinte))) {
      const apres = appliquerEchec(verrou, maintenant);
      await ecrireVerrou(base, apres);
      if (estVerrouille(apres, maintenant)) {
        throw erreurVerrouille(apres);
      }
      throw new ErreurReseau(401, '(local)', 'Ce code ne convient pas.');
    }

    await reinitialiserVerrou(base);
    return poserJeton(Date.parse(maintenant));
  },

  async lireEtatPorteParent(): Promise<EtatPorteParent> {
    const base = await garantirBase();
    const verrou = await lireVerrou(base);
    return {
      codeDefini: await codeEstDefini(base),
      verrouilleJusqua: verrou.verrouilleJusqua === null ? null : String(verrou.verrouilleJusqua),
      nbEchecs: verrou.nbEchecs
    };
  },

  async definirCodeParent(code: string): Promise<OuvertureParent> {
    const base = await garantirBase();
    const codePropre = code.trim();
    const maintenant = horloge.maintenant();

    if (!MOTIF_CODE.test(codePropre)) {
      throw new ErreurReseau(400, '(local)', 'Le code parent compte exactement 4 chiffres.');
    }

    const dejaDefini = await codeEstDefini(base);
    const jetonCourant = lireJetonParent();
    const jetonVivant =
      jetonCourant !== null && (jetons.get(jetonCourant) ?? 0) > Date.parse(maintenant);

    if (dejaDefini && !jetonVivant) {
      throw new ErreurReseau(
        409,
        '(local)',
        'Un code existe deja pour ce foyer. Entre-le pour ouvrir la zone parent, ' +
          'puis tu pourras en choisir un autre.'
      );
    }

    const sel = selNeuf();
    await ecrireCodeParent(
      base,
      sel,
      await deriverCode(codePropre, sel),
      maintenant,
      dejaDefini ? 'redefinition' : 'ecran-definition'
    );
    await reinitialiserVerrou(base);
    return poserJeton(Date.parse(maintenant));
  },

  async lireGalerieParent(_profil: IdProfil): Promise<CatalogueGalerie> {
    exigerJeton();
    return construireCatalogueExercicesAutonome(await garantirBase());
  },

  async lireDashboardParent(profil: IdProfil): Promise<DashboardParent> {
    exigerJeton();
    const base = await garantirBase();
    const confusions = await confusionsDuProfil(base, profil);
    const resume: ResumeDashboard = {
      latences: await latencesDuProfil(base, profil),
      confusions: confusions.top,
      couverture: await couvertureDuProfil(base, profil),
      relecture: await listerRelecture(base)
    };
    return { ...resume, confusionsEcartees: confusions.ecartees };
  },

  async lireExportCsv(profil: IdProfil, code: CodeExport): Promise<string> {
    exigerJeton();
    if (!estCodeExport(code)) {
      throw new ErreurReseau(404, '(local)', `Export inconnu : ${String(code)}`);
    }
    return construireExport(await garantirBase(), profil, code);
  },

  async trancherRelectureContenu(exercice: IdExercice, decision: DecisionRelecture): Promise<EntreeRelecture> {
    exigerJeton();
    const corps = decision as { statut?: unknown; motif?: unknown };
    const statut = typeof corps.statut === 'string' ? corps.statut : '';
    if (statut !== 'valide' && statut !== 'rejete') {
      throw new ErreurReseau(400, '(local)', 'Le statut de relecture vaut « valide » ou « rejete ».');
    }
    const motif = typeof corps.motif === 'string' && corps.motif.trim() !== '' ? corps.motif.trim() : null;

    const entree = await trancherRelecture(
      await garantirBase(),
      exercice,
      statut as StatutRelecture,
      motif,
      horloge.maintenant()
    );
    if (entree === null) {
      throw new ErreurReseau(404, '(local)', `Aucun brouillon en relecture pour : ${exercice}`);
    }
    return entree;
  },

  async lireEtatProfilParent(profil: IdProfil): Promise<EtatProfil> {
    exigerJeton();
    const etat = await etatDuProfil(await garantirBase(), profil, referentielMonde);
    if (etat === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${profil}`);
    }
    return etat;
  },

  async apercuReinitialisationProfil(
    profil: IdProfil,
    portee: PorteeReinitialisation
  ): Promise<ApercuReinitialisation> {
    exigerJeton();
    const base = await garantirBase();
    const p = await lireProfil(base, profil);
    if (p === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${profil}`);
    }
    if (!estPorteeReinitialisation(portee)) {
      throw new ErreurReseau(
        400,
        '(local)',
        'Choisis une portée : « complete » remet le profil à neuf, ' +
          '« progression » garde le prénom, l’avatar et les réglages de lecture.'
      );
    }
    const lignes = await previsualiserReinitialisation(base, profil, portee);
    return { profil, prenom: p.prenom, portee, lignes, pertes: pertesDeLaPortee(portee) };
  },

  async reinitialiserProfilParent(
    profil: IdProfil,
    portee: PorteeReinitialisation,
    confirmation: string
  ): Promise<RapportReinitialisation> {
    exigerJeton();
    const base = await garantirBase();
    const p = await lireProfil(base, profil);
    if (p === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${profil}`);
    }
    if (!estPorteeReinitialisation(portee)) {
      throw new ErreurReseau(
        400,
        '(local)',
        'Choisis une portée : « complete » remet le profil à neuf, ' +
          '« progression » garde le prénom, l’avatar et les réglages de lecture.'
      );
    }
    if (!confirmationValide(p.prenom, confirmation)) {
      throw new ErreurReseau(
        409,
        '(local)',
        `Pour effacer, retape le prénom de l’enfant tel qu’il est affiché : ${p.prenom}.`
      );
    }
    const rapport = await reinitialiserProfil(base, profil, portee, horloge);
    const restes = await tablesNonVidees(base, profil, portee);
    if (restes.length > 0) {
      throw new ErreurReseau(500, '(local)', 'La remise à zéro n’a pas tout effacé. Rien n’a été annoncé comme fait.', {
        details: { restes }
      });
    }
    return rapport;
  },

  async apercuSuppressionProfil(profil: IdProfil): Promise<ApercuSuppression> {
    exigerJeton();
    const base = await garantirBase();
    const p = await lireProfil(base, profil);
    if (p === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${profil}`);
    }
    return { profil, prenom: p.prenom, lignes: await previsualiserReinitialisation(base, profil, 'complete') };
  },

  async supprimerProfilParent(profil: IdProfil, confirmation: string): Promise<RapportSuppressionProfil> {
    exigerJeton();
    const base = await garantirBase();
    const p = await lireProfil(base, profil);
    if (p === null) {
      throw new ErreurReseau(404, '(local)', `Profil inconnu : ${profil}`);
    }
    if (!confirmationValide(p.prenom, confirmation)) {
      throw new ErreurReseau(
        409,
        '(local)',
        `Pour supprimer ce compte, retape le prénom tel qu’il est affiché : ${p.prenom}.`
      );
    }
    const rapport = await supprimerProfil(base, profil, horloge);
    if (!rapport.profilRetire) {
      throw new ErreurReseau(500, '(local)', 'Le compte est toujours là. Rien n’a été annoncé comme fait.');
    }
    return rapport;
  }
};
