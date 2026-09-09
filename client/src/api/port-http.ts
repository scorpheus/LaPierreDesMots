// `PortApiHttp` — mode LAN. Contrat technique v1 § 3.3 (7 routes) et contrat des features v2
// § 5.3 (12 de plus). **Le seul fichier qui appelle `fetch`** (contrat v2 § 5.1, frontière
// « L2-H → tous (client) », prolongée par le portage Android : le mode autonome ne l'importe
// jamais, voir `client.ts`).
import { CHEMINS_API } from '@pierre/partage';
import { CHEMINS_OUVERTURE } from '@pierre/partage/ouverture';
import type {
  CreationProfil,
  IdExercice,
  IdNoeud,
  IdProfil,
  PaquetNoeud,
  Profil,
  ProgressionNoeud,
  ReponseSante,
  ReponseTentative,
  TentativeAEnregistrer
} from '@pierre/partage';
import type { ComparaisonTypographie, ReglagesLecture } from '@pierre/partage/lecture';
import type { CodeCompagnon, EtatMaitrise, ItemLeitner, PlanSortie } from '@pierre/partage/pedagogie';
import type { CodeObjetCampement, EtatMonde } from '@pierre/partage/monde';
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
  RapportSuppressionProfil
} from '@pierre/partage/parent';
import { ENTETE_JETON_PARENT } from '@pierre/partage/parent';

import type { DashboardParent, PaquetNoeudAttendu, PortApi } from './contrat.js';
import { ErreurReseau, lireJetonParent, poserJetonParent } from './commun.js';

function entetesParent(): Readonly<Record<string, string>> {
  const jeton = lireJetonParent();
  return jeton === null ? {} : { [ENTETE_JETON_PARENT]: jeton };
}

async function reponseBrute(cheminAppele: string, options?: RequestInit): Promise<Response> {
  // Une connexion LAN suspendue doit rendre la sauvegarde réessayable. Cette expiration
  // couvre aussi la lecture du corps ; elle n'est pas une attente ajoutée au parcours.
  const expiration = AbortSignal.timeout(15_000);
  const reponse = await fetch(cheminAppele, {
    ...options,
    signal: options?.signal == null ? expiration : AbortSignal.any([options.signal, expiration]),
    headers: {
      Accept: 'application/json',
      ...(options?.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers
    }
  });

  if (!reponse.ok) {
    // `ErreurApi` (§ 3.3) transporte un message lisible. On garde AUSSI le corps analysé :
    // le 423 de la zone parent y met l'échéance du verrou, et l'écran doit pouvoir la dire.
    const texte = await reponse.text().catch(() => '');
    let corps: Readonly<Record<string, unknown>> | null = null;
    try {
      const analyse: unknown = JSON.parse(texte);
      if (typeof analyse === 'object' && analyse !== null) {
        corps = analyse as Readonly<Record<string, unknown>>;
      }
    } catch {
      corps = null;
    }
    const message = typeof corps?.['message'] === 'string' ? String(corps['message']) : texte;
    throw new ErreurReseau(
      reponse.status,
      cheminAppele,
      message === ''
        ? `Réponse ${String(reponse.status)} sur ${cheminAppele}`
        : `Réponse ${String(reponse.status)} sur ${cheminAppele} — ${message}`,
      corps
    );
  }

  return reponse;
}

async function demander<T>(cheminAppele: string, options?: RequestInit): Promise<T> {
  const reponse = await reponseBrute(cheminAppele, options);
  return (await reponse.json()) as T;
}

function corpsJson(valeur: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(valeur) };
}

export const portHttp: PortApi = {
  lireSante(): Promise<ReponseSante> {
    return demander<ReponseSante>(CHEMINS_API.sante);
  },

  listerProfils(): Promise<readonly Profil[]> {
    return demander<readonly Profil[]>(CHEMINS_API.profils);
  },

  creerProfil(creation: CreationProfil): Promise<Profil> {
    return demander<Profil>(CHEMINS_API.profils, corpsJson(creation));
  },

  lireProfil(id: IdProfil): Promise<Profil> {
    return demander<Profil>(CHEMINS_API.profil(id));
  },

  lireProgression(id: IdProfil): Promise<readonly ProgressionNoeud[]> {
    return demander<readonly ProgressionNoeud[]>(CHEMINS_API.progression(id));
  },

  lirePaquetNoeud(id: IdNoeud): Promise<PaquetNoeudAttendu> {
    return demander<PaquetNoeud>(CHEMINS_API.noeud(id));
  },

  enregistrerTentative(tentative: TentativeAEnregistrer): Promise<ReponseTentative> {
    return demander<ReponseTentative>(CHEMINS_API.tentatives, corpsJson(tentative));
  },

  /** URL d'un asset de `contenu/` (SVG, audio). Ce n'est pas une route JSON (§ 3.3). */
  urlAsset(cheminRelatif: string): string {
    return CHEMINS_API.asset(cheminRelatif.replace(/^\/+/u, ''));
  },

  lireReglagesLecture(id: IdProfil): Promise<ReglagesLecture> {
    return demander<ReglagesLecture>(CHEMINS_API.reglages(id));
  },

  ecrireReglagesLecture(id: IdProfil, reglages: Partial<ReglagesLecture>): Promise<ReglagesLecture> {
    return demander<ReglagesLecture>(CHEMINS_API.reglages(id), {
      method: 'PUT',
      body: JSON.stringify(reglages)
    });
  },

  lireEssaiTypographie(id: IdProfil): Promise<ComparaisonTypographie | null> {
    return demander<ComparaisonTypographie | null>(CHEMINS_API.essaiTypographie(id));
  },

  lireMaitrise(id: IdProfil): Promise<readonly EtatMaitrise[]> {
    return demander<readonly EtatMaitrise[]>(CHEMINS_API.maitrise(id));
  },

  lireRevisions(id: IdProfil): Promise<readonly ItemLeitner[]> {
    return demander<readonly ItemLeitner[]>(CHEMINS_API.revisions(id));
  },

  composerSortie(
    id: IdProfil,
    demande: { readonly region: string; readonly compagnon: CodeCompagnon | null }
  ): Promise<PlanSortie> {
    return demander<PlanSortie>(CHEMINS_API.sortie(id), corpsJson(demande));
  },

  lireMonde(id: IdProfil): Promise<EtatMonde> {
    return demander<EtatMonde>(CHEMINS_API.monde(id));
  },

  poserObjetCampement(id: IdProfil, objet: CodeObjetCampement): Promise<EtatMonde> {
    return demander<EtatMonde>(CHEMINS_API.campement(id), corpsJson({ objet }));
  },

  noterVisitePointCampement(id: IdProfil, point: string): Promise<void> {
    return reponseBrute(CHEMINS_API.campementPointVisite(id, point), { method: 'POST' }).then(
      () => undefined
    );
  },

  async marquerOuvertureVue(id: IdProfil, passee: boolean): Promise<void> {
    // Un échec réseau ne coûte RIEN à l'enfant (routeur.tsx) : l'histoire reste rejouable, la
    // seule perte est une ligne de suivi pour le parent. On avale l'erreur, on ne la propage pas.
    await fetch(CHEMINS_OUVERTURE.pour(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ passee })
    }).catch(() => undefined);
  },

  async ouvrirZoneParent(code: string): Promise<OuvertureParent> {
    const ouverture = await demander<OuvertureParent>(CHEMINS_API.parentOuvrir, corpsJson({ code }));
    poserJetonParent(ouverture.jeton);
    return ouverture;
  },

  lireEtatPorteParent(): Promise<EtatPorteParent> {
    return demander<EtatPorteParent>(CHEMINS_API.parentEtat);
  },

  async definirCodeParent(code: string): Promise<OuvertureParent> {
    const ouverture = await demander<OuvertureParent>(CHEMINS_API.parentDefinir, {
      ...corpsJson({ code }),
      headers: entetesParent()
    });
    poserJetonParent(ouverture.jeton);
    return ouverture;
  },

  lireGalerieParent(profil: IdProfil): Promise<CatalogueGalerie> {
    return demander<CatalogueGalerie>(CHEMINS_API.parentGalerie(profil), {
      headers: entetesParent()
    });
  },

  lireDashboardParent(profil: IdProfil): Promise<DashboardParent> {
    return demander<DashboardParent>(CHEMINS_API.parentDashboard(profil), {
      headers: entetesParent()
    });
  },

  async lireExportCsv(profil: IdProfil, code: CodeExport): Promise<string> {
    const reponse = await reponseBrute(CHEMINS_API.parentExport(profil, code), {
      headers: { ...entetesParent(), Accept: 'text/csv' }
    });
    return reponse.text();
  },

  trancherRelectureContenu(exercice: IdExercice, decision: DecisionRelecture): Promise<EntreeRelecture> {
    return demander<EntreeRelecture>(CHEMINS_API.parentRelecture(exercice), {
      ...corpsJson(decision),
      headers: entetesParent()
    });
  },

  lireEtatProfilParent(profil: IdProfil): Promise<EtatProfil> {
    return demander<EtatProfil>(CHEMINS_API.parentEtatProfil(profil), {
      headers: entetesParent()
    });
  },

  apercuReinitialisationProfil(
    profil: IdProfil,
    portee: PorteeReinitialisation
  ): Promise<ApercuReinitialisation> {
    return demander<ApercuReinitialisation>(CHEMINS_API.parentReinitialiser(profil), {
      ...corpsJson({ portee, apercu: true }),
      headers: entetesParent()
    });
  },

  reinitialiserProfilParent(
    profil: IdProfil,
    portee: PorteeReinitialisation,
    confirmation: string
  ): Promise<RapportReinitialisation> {
    return demander<RapportReinitialisation>(CHEMINS_API.parentReinitialiser(profil), {
      ...corpsJson({ portee, confirmation }),
      headers: entetesParent()
    });
  },

  apercuSuppressionProfil(profil: IdProfil): Promise<ApercuSuppression> {
    return demander<ApercuSuppression>(CHEMINS_API.parentSupprimerProfil(profil), {
      method: 'DELETE',
      body: JSON.stringify({ apercu: true }),
      headers: entetesParent()
    });
  },

  supprimerProfilParent(profil: IdProfil, confirmation: string): Promise<RapportSuppressionProfil> {
    return demander<RapportSuppressionProfil>(CHEMINS_API.parentSupprimerProfil(profil), {
      method: 'DELETE',
      body: JSON.stringify({ confirmation }),
      headers: entetesParent()
    });
  }
};
