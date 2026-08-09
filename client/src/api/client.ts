// Client HTTP typé — contrat technique v1 § 3.3 (7 routes) et contrat des features v2 § 5.3
// (12 de plus). **Un seul fichier du client appelle le réseau, et c'est celui-ci** (contrat
// v2 § 5.1, frontière « L2-H → tous (client) »).
//
// Aucun cache maison : TanStack Query s'en charge au-dessus. Ce module ne fait que parler
// `fetch` et rendre des types du contrat.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// CE QUI A CHANGÉ PAR RAPPORT À LA v1, ET POURQUOI
//
// La v1 lisait `CHEMINS_API` à travers un transtypage défensif vers un dictionnaire opaque, et
// retombait sur des chemins littéraux, parce que le contrat gelait le NOM du symbole sans en
// donner la forme. Ce n'est plus vrai : `partage/src/api/contrats.ts` appartient désormais à ce
// même lot et sa forme est sous les yeux. **Les deux transtypages de ce fichier sont donc
// supprimés** — c'est le défaut 2 du contrat v2 § 1.5, soldé pour la part de ce fichier.
// Conséquence recherchée : renommer un chemin dans `contrats.ts` ne compile plus ici.
// ─────────────────────────────────────────────────────────────────────────────────────────
import { CHEMINS_API } from '@pierre/partage';
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

// Les quatre sous-chemins des lots frères. **Imports de TYPE uniquement** : ils sont effacés à
// la compilation et ne pèsent rien sur le bundle initial (contrat § 4.7).
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
  RapportSuppressionProfil,
  ResumeDashboard
} from '@pierre/partage/parent';
import { ENTETE_JETON_PARENT } from '@pierre/partage/parent';

/**
 * Forme du paquet servi par `GET /api/contenu/noeuds/:id`.
 * Alias conservé : `magasin.ts` et `testabilite/crochets.ts` l'importent sous ce nom depuis la
 * v1. Il ne fait plus que pointer sur le type du contrat, qui est désormais gelé pour de bon.
 */
export type PaquetNoeudAttendu = PaquetNoeud;

// ------------------------------------------------------------------ transport

export class ErreurReseau extends Error {
  readonly statut: number;
  readonly chemin: string;
  /** Le corps de l'erreur, quand le serveur en a rendu un lisible. `null` sinon. */
  readonly corps: Readonly<Record<string, unknown>> | null;

  constructor(
    statut: number,
    cheminAppele: string,
    message: string,
    corps: Readonly<Record<string, unknown>> | null = null
  ) {
    super(message);
    this.name = 'ErreurReseau';
    this.statut = statut;
    this.chemin = cheminAppele;
    this.corps = corps;
  }
}

/** Le jeton de la zone parent, posé par `ouvrirZoneParent`, vivant en mémoire seulement. */
let jetonParent: string | null = null;

/** Oublie le jeton : la zone parent se referme. Appelé à la sortie du dashboard. */
export function fermerZoneParent(): void {
  jetonParent = null;
}

export function jetonParentPose(): boolean {
  return jetonParent !== null;
}

function entetesParent(): Readonly<Record<string, string>> {
  return jetonParent === null ? {} : { [ENTETE_JETON_PARENT]: jetonParent };
}

async function reponseBrute(cheminAppele: string, options?: RequestInit): Promise<Response> {
  const reponse = await fetch(cheminAppele, {
    ...options,
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

// ------------------------------------------------------------------ les 7 routes de la v1

export function lireSante(): Promise<ReponseSante> {
  return demander<ReponseSante>(CHEMINS_API.sante);
}

export function listerProfils(): Promise<readonly Profil[]> {
  return demander<readonly Profil[]>(CHEMINS_API.profils);
}

export function creerProfil(creation: CreationProfil): Promise<Profil> {
  return demander<Profil>(CHEMINS_API.profils, corpsJson(creation));
}

export function lireProfil(id: IdProfil): Promise<Profil> {
  return demander<Profil>(CHEMINS_API.profil(id));
}

export function lireProgression(id: IdProfil): Promise<readonly ProgressionNoeud[]> {
  return demander<readonly ProgressionNoeud[]>(CHEMINS_API.progression(id));
}

export function lirePaquetNoeud(id: IdNoeud): Promise<PaquetNoeudAttendu> {
  return demander<PaquetNoeudAttendu>(CHEMINS_API.noeud(id));
}

export function enregistrerTentative(
  tentative: TentativeAEnregistrer
): Promise<ReponseTentative> {
  return demander<ReponseTentative>(CHEMINS_API.tentatives, corpsJson(tentative));
}

/** URL d'un asset de `contenu/` (SVG, audio). Ce n'est pas une route JSON (§ 3.3). */
export function urlAsset(cheminRelatif: string): string {
  return CHEMINS_API.asset(cheminRelatif.replace(/^\/+/u, ''));
}

// ------------------------------------------------------------- lecture et typographie (L2-B)

export function lireReglagesLecture(id: IdProfil): Promise<ReglagesLecture> {
  return demander<ReglagesLecture>(CHEMINS_API.reglages(id));
}

export function ecrireReglagesLecture(
  id: IdProfil,
  reglages: Partial<ReglagesLecture>
): Promise<ReglagesLecture> {
  return demander<ReglagesLecture>(CHEMINS_API.reglages(id), {
    method: 'PUT',
    body: JSON.stringify(reglages)
  });
}

export function lireEssaiTypographie(id: IdProfil): Promise<ComparaisonTypographie | null> {
  return demander<ComparaisonTypographie | null>(CHEMINS_API.essaiTypographie(id));
}

// ------------------------------------------------------------------------ pédagogie (L2-D)

export function lireMaitrise(id: IdProfil): Promise<readonly EtatMaitrise[]> {
  return demander<readonly EtatMaitrise[]>(CHEMINS_API.maitrise(id));
}

export function lireRevisions(id: IdProfil): Promise<readonly ItemLeitner[]> {
  return demander<readonly ItemLeitner[]>(CHEMINS_API.revisions(id));
}

export function composerSortie(
  id: IdProfil,
  demande: { readonly region: string; readonly compagnon: CodeCompagnon | null }
): Promise<PlanSortie> {
  return demander<PlanSortie>(CHEMINS_API.sortie(id), corpsJson(demande));
}

// ------------------------------------------------------------------- monde et campement (L2-F)

export function lireMonde(id: IdProfil): Promise<EtatMonde> {
  return demander<EtatMonde>(CHEMINS_API.monde(id));
}

export function poserObjetCampement(
  id: IdProfil,
  objet: CodeObjetCampement
): Promise<EtatMonde> {
  return demander<EtatMonde>(CHEMINS_API.campement(id), corpsJson({ objet }));
}

/**
 * Journalise la visite d'un point d'interaction libre du campement (R11). Gratuit et sans
 * retour utile : la route répond 204, et un échec réseau ne doit jamais faire échouer le
 * geste à l'écran — c'est `PointLibre` qui l'avale (v2 § 3.4, « rien ne se rate au campement »).
 */
export function noterVisitePointCampement(id: IdProfil, point: string): Promise<void> {
  return reponseBrute(CHEMINS_API.campementPointVisite(id, point), { method: 'POST' }).then(
    () => undefined
  );
}

// ---------------------------------------------------------------------- zone parent (L2-H)

/**
 * Le résumé du dashboard, plus le compte des confusions ÉCARTÉES faute d'axe.
 *
 * Ce second champ n'est pas décoratif : sans lui, un top 10 vide serait indistinguable d'un
 * enfant qui ne confond plus rien (D23, contrat § 10.4).
 */
export interface DashboardParent extends ResumeDashboard {
  readonly confusionsEcartees: number;
}

/**
 * Ouvre la zone parent et retient le jeton pour les appels suivants.
 *
 * Lève une `ErreurReseau` de statut **423** quand le verrou est actif ; son `corps.details`
 * porte `verrouilleJusqua`. C'est l'écran qui décide quoi en dire — jamais un reproche.
 */
export async function ouvrirZoneParent(code: string): Promise<OuvertureParent> {
  const ouverture = await demander<OuvertureParent>(
    CHEMINS_API.parentOuvrir,
    corpsJson({ code })
  );
  jetonParent = ouverture.jeton;
  return ouverture;
}

// ────────────────────────────────────────── la porte parent (N5, finition v3 § 1.8 et § 8)

/**
 * L'état de la porte : y a-t-il un code, et la zone est-elle verrouillée ?
 *
 * **Aucun jeton n'est envoyé, et c'est nécessaire** : l'écran l'interroge AVANT d'avoir un
 * code à taper. C'est cette réponse qui lui dit s'il doit DEMANDER un code ou en PROPOSER un
 * — la distinction que la v1 ne pouvait pas faire, et faute de laquelle elle posait le code du
 * foyer au premier enfant qui passait (contrat de finition v3 § 1.8).
 */
export function lireEtatPorteParent(): Promise<EtatPorteParent> {
  return demander<EtatPorteParent>(CHEMINS_API.parentEtat);
}

/**
 * Pose le code du foyer, ou le redéfinit quand un jeton est déjà en main.
 *
 * Lève une `ErreurReseau` de statut **409** quand un code existe déjà et qu'aucun jeton n'est
 * posé : jamais un remplacement silencieux. Le jeton rendu est retenu comme celui d'`ouvrir`,
 * pour que le parent n'ait pas à retaper le code qu'il vient de choisir.
 */
export async function definirCodeParent(code: string): Promise<OuvertureParent> {
  const ouverture = await demander<OuvertureParent>(CHEMINS_API.parentDefinir, {
    ...corpsJson({ code }),
    headers: entetesParent()
  });
  jetonParent = ouverture.jeton;
  return ouverture;
}

/** Le catalogue de la galerie parent — D34. Exige le jeton : invisible côté enfant. */
export function lireGalerieParent(profil: IdProfil): Promise<CatalogueGalerie> {
  return demander<CatalogueGalerie>(CHEMINS_API.parentGalerie(profil), {
    headers: entetesParent()
  });
}

export function lireDashboardParent(profil: IdProfil): Promise<DashboardParent> {
  return demander<DashboardParent>(CHEMINS_API.parentDashboard(profil), {
    headers: entetesParent()
  });
}

/** Le CSV brut, tel que le serveur l'a produit — BOM compris, pour Excel FR. */
export async function lireExportCsv(profil: IdProfil, code: CodeExport): Promise<string> {
  const reponse = await reponseBrute(CHEMINS_API.parentExport(profil, code), {
    headers: { ...entetesParent(), Accept: 'text/csv' }
  });
  return reponse.text();
}

export function trancherRelectureContenu(
  exercice: IdExercice,
  decision: DecisionRelecture
): Promise<EntreeRelecture> {
  return demander<EntreeRelecture>(CHEMINS_API.parentRelecture(exercice), {
    ...corpsJson(decision),
    headers: entetesParent()
  });
}

// ─────────────────────────────── H2 — l'état réel d'un profil, et sa remise à zéro

/**
 * Ce que le profil a RÉELLEMENT fait : nœuds terminés sur le total, étoiles, régions
 * **stockées ET recalculées avec leur écart**, dernières tentatives.
 *
 * C'est l'appel qui aurait rendu visible sans SQL le défaut du 2026-08-02 — deux régions à
 * 100 % pour 3 nœuds joués sur 18, et plus aucun monde cliquable pour l'enfant.
 */
export function lireEtatProfilParent(profil: IdProfil): Promise<EtatProfil> {
  return demander<EtatProfil>(CHEMINS_API.parentEtatProfil(profil), {
    headers: entetesParent()
  });
}

/**
 * Ce qu'une remise à zéro effacerait, table par table, **sans rien effacer**.
 *
 * L'écran de confirmation l'appelle avant de demander quoi que ce soit : un parent doit lire
 * des comptes réels, pas une promesse générique. Aucune confirmation n'est requise — il n'y a
 * rien à confirmer pour compter.
 */
export function apercuReinitialisationProfil(
  profil: IdProfil,
  portee: PorteeReinitialisation
): Promise<ApercuReinitialisation> {
  return demander<ApercuReinitialisation>(CHEMINS_API.parentReinitialiser(profil), {
    ...corpsJson({ portee, apercu: true }),
    headers: entetesParent()
  });
}

/**
 * Efface pour de bon. `confirmation` est **le prénom de l'enfant, retapé par le parent** :
 * le serveur le vérifie et répond 409 sinon. La garde n'existe pas qu'à l'écran — la commande
 * hors interface passe par la même porte, et une garde qui n'existerait qu'en React ne
 * garderait rien.
 */
export function reinitialiserProfilParent(
  profil: IdProfil,
  portee: PorteeReinitialisation,
  confirmation: string
): Promise<RapportReinitialisation> {
  return demander<RapportReinitialisation>(CHEMINS_API.parentReinitialiser(profil), {
    ...corpsJson({ portee, confirmation }),
    headers: entetesParent()
  });
}

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * SUPPRIMER UN COMPTE JOUEUR — R29
 *
 * « dans l'espace des parents, il faudrait pouvoir les supprimer en fait, supprimer un compte. »
 *
 * Deux fonctions, comme pour la remise à zéro, et pour la même raison : le parent voit CE QU'IL
 * PERD avant de taper quoi que ce soit. Un écran qui demanderait de confirmer sans avoir montré
 * l'ampleur ne demande pas un consentement, il demande un réflexe.
 *
 * `confirmation` est **le prénom de l'enfant, retapé**. Le serveur le vérifie et répond 409
 * sinon : la garde n'existe pas qu'à l'écran, parce qu'une garde qui n'existerait qu'en React ne
 * garderait rien.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
export function apercuSuppressionProfil(profil: IdProfil): Promise<ApercuSuppression> {
  return demander<ApercuSuppression>(CHEMINS_API.parentSupprimerProfil(profil), {
    method: 'DELETE',
    body: JSON.stringify({ apercu: true }),
    headers: entetesParent()
  });
}

export function supprimerProfilParent(
  profil: IdProfil,
  confirmation: string
): Promise<RapportSuppressionProfil> {
  return demander<RapportSuppressionProfil>(CHEMINS_API.parentSupprimerProfil(profil), {
    method: 'DELETE',
    body: JSON.stringify({ confirmation }),
    headers: entetesParent()
  });
}

// ------------------------------------------------------------------ clé d'idempotence
//
// `cle_idempotence = sha256(profil_id | noeud_id | demarre_le | graine)`, calculée par le
// client (§ 6.3). ATTENTION : `crypto.subtle` n'existe QUE dans un contexte sécurisé, et le
// jeu est servi en HTTP clair sur le LAN quand mkcert n'a pas été installé (CLAUDE.md).
// Le repli ci-dessous est donc atteint en usage réel : il n'est pas décoratif. Il reste
// purement déterministe — une même tentative rejouée depuis un même appareil produit la même
// clé, ce qui est exactement la propriété dont dépend l'idempotence du POST.

function empreinteDeRepli(source: string): string {
  // Huit accumulateurs FNV-1a 32 bits, décalés par leur rang : 8 × 8 = 64 caractères, soit la
  // même largeur qu'un sha256. Ce n'est PAS une empreinte cryptographique et n'a pas à l'être.
  const mots = new Uint32Array(8);
  for (let rang = 0; rang < 8; rang += 1) {
    let accumulateur = 0x811c9dc5 ^ (rang * 0x9e3779b1);
    for (let index = 0; index < source.length; index += 1) {
      accumulateur ^= source.charCodeAt((index + rang) % source.length);
      accumulateur = Math.imul(accumulateur, 0x01000193) >>> 0;
    }
    mots[rang] = accumulateur >>> 0;
  }
  return Array.from(mots, (mot) => mot.toString(16).padStart(8, '0')).join('');
}

export async function calculerCleIdempotence(
  profilId: string,
  noeudId: string,
  demarreLe: string,
  graine: number
): Promise<string> {
  const source = `${profilId}|${noeudId}|${demarreLe}|${String(graine)}`;
  const sousCouche = globalThis.crypto?.subtle;

  if (sousCouche !== undefined) {
    try {
      const empreinte = await sousCouche.digest('SHA-256', new TextEncoder().encode(source));
      return Array.from(new Uint8Array(empreinte), (octet) =>
        octet.toString(16).padStart(2, '0')
      ).join('');
    } catch (cause) {
      console.warn('[api] `crypto.subtle` indisponible, repli déterministe :', cause);
    }
  }

  return empreinteDeRepli(source);
}
