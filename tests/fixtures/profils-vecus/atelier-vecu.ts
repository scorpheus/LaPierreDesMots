/**
 * L'atelier des profils VÉCUS — lot H3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Toute la QA de ce dépôt teste un logiciel NEUF : elle crée une base vierge, joue, vérifie,
 * jette. Elle ne rencontre jamais un profil dont l'état a été écrit par une version ANTÉRIEURE
 * du contenu — c'est-à-dire la situation réelle de tout joueur au bout de deux semaines.
 *
 * Le défaut que le père vient de rencontrer est exactement là. Mesuré sur la base réelle
 * `donnees/pierre.db` le 2026-08-02, sortie citée :
 *
 *     progression_region : clairiere  pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *                          galeries   pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *                          marais-jumeau / foret-muette : ouverte = 1, 0 %
 *                          volcan / cite-des-histoires  : ouverte = 0
 *     progression_noeud  : 3 lignes — clairiere-01, galeries-01, galeries-02
 *     tentatives         : 6
 *     contenu livré      : 18 nœuds — clairiere 6, galeries 12 (le catalogue DE CE JOUR-LÀ ;
 *                          les lots de contenu l'ont porté à 76 nœuds sur six régions, et
 *                          aucun compte n'est plus écrit en dur dans ce module)
 *
 * Les deux régions se croient terminées à 100 % alors que 3 nœuds sur 18 ont été joués. Le
 * pourcentage a été calculé et FIGÉ EN BASE quand chaque région n'avait qu'un ou deux nœuds ;
 * seize nœuds se sont ajoutés depuis, et rien n'a été recalculé.
 *
 * Ce module ne raconte pas cette histoire : il la REJOUE. `catalogueDuJourDeEzekiel` tronque
 * le référentiel à 1 nœud pour la Clairière et 2 pour les Galeries, on joue ces trois nœuds
 * par les VRAIES routes, puis on remonte l'application sur la MÊME base avec le référentiel
 * complet. L'état obtenu est celui de la base réelle, ligne pour ligne — et il n'a été écrit
 * à la main nulle part.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE CE MODULE POSSÈDE, ET CE QU'IL NE POSSÈDE PAS ─────────────────────────────────
 * Il possède : le montage d'une application sur un référentiel INJECTÉ, le catalogue lu sur
 * disque, les cinq fixtures de profils vécus, et la sonde d'invariant `sortiesQuiRepondent`.
 * Il ne possède aucun fichier de production : il ne corrige rien, il mesure.
 *
 * ── L'INVARIANT QUI COMPTE PLUS QUE TOUS LES AUTRES ──────────────────────────────────────
 * À tout instant, depuis n'importe quel état de profil, l'enfant peut faire QUELQUE CHOSE.
 * `sortiesQuiRepondent` le mesure comme D48 l'exige : elle ne compte pas les éléments
 * interactifs, elle compte les SORTIES — une région jouable, qui porte un nœud de reprise,
 * dont le paquet répond 200. Un bouton qui existe et ne mène nulle part vaut zéro.
 */

import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import Fastify from 'fastify';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import type {
  Competence,
  EtatMonde,
  Exercice,
  Habillage,
  Horloge,
  Noeud,
  ProgressionNoeud
} from '@pierre/partage';
import { regionsOuvertes } from '@pierre/partage/monde';

import { chargerReferentielMonde } from '@serveur/referentiels/monde';
import type { ReferentielMonde } from '@pierre/partage/base';
import { enregistrerRoutesContenu } from '@serveur/routes/contenu';
import { enregistrerRoutesMonde } from '@serveur/routes/monde';
import { enregistrerRoutesPedagogie } from '@serveur/routes/pedagogie';
import { enregistrerRoutesProfils } from '@serveur/routes/profils';
import { enregistrerRoutesSortie } from '@serveur/routes/sortie';
import { enregistrerRoutesTentatives } from '@serveur/routes/tentatives';

import {
  DOSSIER_MIGRATIONS,
  GRAINE_DE_TEST,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson
} from '../../configuration/preparation.js';

// ═══════════════════════════════════════════════════════════ le catalogue, lu sur disque

/** Tout ce que `contenu/` livre aujourd'hui. Aucun contenu n'est fabriqué par les tests. */
export interface CatalogueContenu {
  readonly exercices: readonly Exercice[];
  readonly noeuds: readonly Noeud[];
  readonly habillages: readonly Habillage[];
  readonly competences: readonly Competence[];
}

function listerJsonRecursif(dossierRelatif: string, suffixe = '.json'): readonly string[] {
  const racine = join(RACINE_DEPOT, dossierRelatif);
  const trouves: string[] = [];
  for (const entree of readdirSync(racine).sort()) {
    const relatif = `${dossierRelatif}/${entree}`;
    if (statSync(join(RACINE_DEPOT, relatif)).isDirectory()) {
      trouves.push(...listerJsonRecursif(relatif, suffixe));
    } else if (entree.endsWith(suffixe)) {
      trouves.push(relatif);
    }
  }
  return trouves;
}

let catalogueMemoise: CatalogueContenu | null = null;

/**
 * Le catalogue COMPLET du dépôt, lu une fois.
 *
 * Aucun chiffre n'est écrit en dur ici : le jour où une région gagne un nœud, ce module le
 * voit. C'est la propriété qui rend le scénario de migration de contenu permanent — « le
 * contenu grandira encore, et il grandira toujours après que l'enfant aura joué ».
 */
export function catalogueDuDepot(): CatalogueContenu {
  if (catalogueMemoise !== null) {
    return catalogueMemoise;
  }
  catalogueMemoise = {
    exercices: listerJsonRecursif('contenu/exercices').map((chemin) => lireJson<Exercice>(chemin)),
    noeuds: listerJsonRecursif('contenu/noeuds').map((chemin) => lireJson<Noeud>(chemin)),
    habillages: listerJsonRecursif('contenu/habillages', '.habillage.json').map((chemin) =>
      lireJson<Habillage>(chemin)
    ),
    competences: lireJson<Competence[]>('contenu/referentiel/competences.json')
  };
  return catalogueMemoise;
}

/** Le nœud et son exercice, appariés. Sert à poster une tentative avec le VRAI moteur. */
export function noeudAvecExercice(idNoeud: string): {
  readonly noeud: Noeud;
  readonly exercice: Exercice;
} {
  const catalogue = catalogueDuDepot();
  const noeud = catalogue.noeuds.find((entree) => String(entree.id) === idNoeud);
  if (noeud === undefined) {
    throw new Error(`Nœud absent du catalogue : ${idNoeud}`);
  }
  const exercice = catalogue.exercices.find(
    (entree) => String(entree.id) === String(noeud.exercice)
  );
  if (exercice === undefined) {
    throw new Error(`Le nœud ${idNoeud} cite un exercice absent : ${String(noeud.exercice)}`);
  }
  return { noeud, exercice };
}

// ═══════════════════════════════════════════════════════ le référentiel, complet ou tronqué

/** Le référentiel du monde tel que `contenu/monde/` le déclare aujourd'hui. */
export function referentielComplet(): ReferentielMonde {
  return chargerReferentielMonde();
}

/**
 * Le même référentiel, mais avec MOINS de nœuds par région — un catalogue de contenu plus
 * petit, tel qu'il existait le jour où l'enfant a joué.
 *
 * On tronque, on n'invente pas : les nœuds gardés sont les premiers de la liste réelle, dans
 * l'ordre réel. Une région absente de la table garde tous ses nœuds.
 */
export function referentielTronque(
  noeudsParRegion: Readonly<Record<string, number>>
): ReferentielMonde {
  const complet = referentielComplet();
  return {
    ...complet,
    regions: complet.regions.map((region) => {
      const garde = noeudsParRegion[String(region.region)];
      return garde === undefined ? region : { ...region, noeuds: region.noeuds.slice(0, garde) };
    })
  };
}

/**
 * Le catalogue du jour où Ezékiel a joué, tel que la base réelle le trahit.
 *
 * 1 nœud pour la Clairière, 2 pour les Galeries : c'est le seul découpage qui produit
 * EXACTEMENT les six lignes de `progression_region` mesurées sur `donnees/pierre.db`
 * (clairiere et galeries à 100 % avec Éclat, marais-jumeau et foret-muette ouvertes à 0 %,
 * volcan et cite-des-histoires fermées) et les trois lignes de `progression_noeud`.
 */
export const CATALOGUE_DU_JOUR_DE_EZEKIEL: Readonly<Record<string, number>> = {
  clairiere: 1,
  galeries: 2
};

// ═════════════════════════════════════════════════════════════════════ montage de l'atelier

export interface AtelierVecu {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  readonly horloge: Horloge;
  readonly referentiel: ReferentielMonde;
  /** Ferme l'application. **Ne ferme pas la base** : elle survit à un remontage. */
  fermerApplication(): Promise<void>;
  /** Ferme l'application ET la base. */
  fermer(): Promise<void>;
}

export interface OptionsAtelier {
  /** Base déjà migrée à réutiliser — c'est ce qui permet de changer de catalogue en place. */
  readonly base?: DatabaseSync;
  /** Horloge déjà avancée à réutiliser. */
  readonly horloge?: Horloge;
  /** Combien de nœuds par région le catalogue déclare. Absent : le catalogue complet. */
  readonly noeudsParRegion?: Readonly<Record<string, number>>;
}

/**
 * Monte les six modules de routes utiles sur une base migrée, avec un référentiel INJECTÉ.
 *
 * `construireApplication` n'accepte pas de référentiel (il appelle `chargerReferentielMonde()`
 * sans argument) : on monte donc les routes une à une, comme `tests/api/monde.test.ts` le fait
 * déjà. C'est le seul moyen de jouer sur un catalogue plus petit sans écrire dans `contenu/`,
 * et sans devenir un second écrivain de `serveur/src/application.ts`.
 */
export async function monterAtelier(options: OptionsAtelier = {}): Promise<AtelierVecu> {
  const [{ ouvrirBase }, { appliquerMigrations }, { creerBaseNodeSqlite }, factices] = await Promise.all([
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
    import('@pierre/partage/factices')
  ]);

  const horloge = options.horloge ?? horlogeDeTest();
  let base = options.base;
  let baseAsync;
  if (base === undefined) {
    base = ouvrirBase(':memory:');
    baseAsync = creerBaseNodeSqlite(base);
    await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);
  } else {
    baseAsync = creerBaseNodeSqlite(base);
  }

  const catalogue = catalogueDuDepot();
  const contenu = new factices.DepotContenuMemoire({
    exercices: [...catalogue.exercices],
    noeuds: [...catalogue.noeuds],
    habillages: [...catalogue.habillages],
    competences: catalogue.competences
  });

  const referentiel =
    options.noeudsParRegion === undefined
      ? referentielComplet()
      : referentielTronque(options.noeudsParRegion);

  const contexte = { base: baseAsync, contenu, horloge, alea: aleaDeTest() };

  const application = Fastify({ logger: false });
  enregistrerRoutesProfils(application, contexte);
  enregistrerRoutesContenu(application, contexte);
  enregistrerRoutesTentatives(application, contexte);
  enregistrerRoutesPedagogie(application, contexte);
  enregistrerRoutesSortie(application, contexte);
  enregistrerRoutesMonde(application, contexte, referentiel);
  await application.ready();

  const baseOuverte = base;
  return {
    application,
    base: baseOuverte,
    horloge,
    referentiel,
    async fermerApplication() {
      await application.close();
    },
    async fermer() {
      await application.close();
      baseOuverte.close();
    }
  };
}

/**
 * Remonte l'application sur la MÊME base, avec un autre catalogue.
 *
 * C'est la migration de contenu, réduite à son geste : rien n'est effacé, rien n'est réécrit,
 * seul le référentiel grandit. C'est ce qui arrive au dépôt à chaque livraison de nœuds.
 */
export async function changerDeCatalogue(
  atelier: AtelierVecu,
  noeudsParRegion?: Readonly<Record<string, number>>
): Promise<AtelierVecu> {
  await atelier.fermerApplication();
  return monterAtelier({
    base: atelier.base,
    horloge: atelier.horloge,
    ...(noeudsParRegion === undefined ? {} : { noeudsParRegion })
  });
}

/**
 * Rouvre l'application sur la même base et le même catalogue.
 *
 * C'est le geste de l'enfant qui ferme l'onglet et revient : rien n'a changé côté contenu,
 * mais plus aucun état ne survit côté client. Tout ce qui n'était pas en base est perdu — et
 * c'est précisément ce qu'on veut vérifier.
 */
export function rouvrirApplication(atelier: AtelierVecu): Promise<AtelierVecu> {
  return changerDeCatalogue(atelier);
}

// ═════════════════════════════════════════════════════════════════════════ gestes de l'enfant

export async function creerProfil(atelier: AtelierVecu, prenom = 'Ezékiel'): Promise<string> {
  const reponse = await atelier.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: {
      prenom,
      avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
      paletteVariante: 'clairiere'
    }
  });
  if (reponse.statusCode !== 201) {
    throw new Error(`Création de profil refusée (${String(reponse.statusCode)}) : ${reponse.body}`);
  }
  return (reponse.json() as { id: string }).id;
}

/**
 * Le mode de réponse déclaré par étape, par moteur.
 *
 * C'est un CHOIX DE FIXTURE, pas une donnée du dépôt : `modeReponse` fixe `p_devinette` (D13)
 * et le serveur refuse une étape qui n'en déclare pas. La table ci-dessous n'a d'autre
 * ambition que d'être plausible et stable ; aucune assertion de ce lot ne dépend de la valeur
 * exacte, seulement du fait qu'une étape existe et alimente le Leitner.
 */
const MODE_PAR_MOTEUR: Readonly<Record<string, string>> = {
  colorie: 'colorie',
  trace: 'trace',
  place: 'place',
  paires: 'appariement',
  tri: 'ordre',
  phrase: 'ordre',
  assemble: 'ordre',
  chemin: 'place',
  libre: 'saisie',
  grave: 'saisie',
  eclair: 'vrai-faux',
  miroir: 'vrai-faux',
  attrape: 'qcm-4',
  chrono: 'qcm-4',
  histoire: 'qcm-3'
};

export interface OptionsJeu {
  readonly reussi?: boolean;
  readonly nbErreurs?: number;
  readonly aideUtilisee?: 'aucune' | 'indice' | 'demonstration';
  readonly dureeMs?: number;
  /** Clé d'idempotence imposée — sert à simuler le double tap d'impatience. */
  readonly cleIdempotence?: string;
  /** Instant de début imposé. Par défaut, l'instant courant de l'horloge de l'atelier. */
  readonly demarreLe?: string;
  /** Étapes journalisées ? Vrai par défaut : sans elles, ni BKT ni Leitner n'avancent. */
  readonly avecEtapes?: boolean;
}

export interface ResultatJeu {
  readonly statut: number;
  readonly deja: boolean;
  readonly etoiles: number;
}

/**
 * Joue un nœud pour de vrai : `POST /api/tentatives`, avec le moteur et l'habillage que
 * l'exercice déclare sur disque. Aucun raccourci par la base.
 */
export async function jouerNoeud(
  atelier: AtelierVecu,
  profil: string,
  idNoeud: string,
  options: OptionsJeu = {}
): Promise<ResultatJeu> {
  const { exercice } = noeudAvecExercice(idNoeud);
  const moteur = String(exercice.jeu.moteur);
  const habillage = String(exercice.jeu.habillage);
  const demarreLe = options.demarreLe ?? String(atelier.horloge.maintenant());
  const dureeMs = options.dureeMs ?? 60_000;
  const reussi = options.reussi ?? true;
  const aideUtilisee = options.aideUtilisee ?? 'aucune';
  const nbErreurs = options.nbErreurs ?? 0;

  const etapes =
    options.avecEtapes === false
      ? []
      : [
          {
            identifiant: `${String(exercice.id)}-e1`,
            nbErreurs,
            aideUtilisee,
            nbEcoutes: 0,
            dureeMs,
            modeReponse: MODE_PAR_MOTEUR[moteur] ?? 'qcm-4',
            latenceMs: dureeMs,
            nbElements: 4
          }
        ];

  const reponse = await atelier.application.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence:
        options.cleIdempotence ??
        createHash('sha256')
          .update([profil, idNoeud, demarreLe, String(GRAINE_DE_TEST)].join('|'))
          .digest('hex'),
      profil,
      noeud: idNoeud,
      exercice: String(exercice.id),
      moteur,
      habillage,
      graine: GRAINE_DE_TEST,
      demarreLe,
      termineLe: String(atelier.horloge.maintenant()),
      resume: { reussi, nbErreurs, aideUtilisee, dureeMs, etapes }
    }
  });

  if (reponse.statusCode >= 300) {
    throw new Error(
      `Tentative refusée sur ${idNoeud} (${String(reponse.statusCode)}) : ${reponse.body}`
    );
  }
  const corps = reponse.json() as {
    deja: boolean;
    progression: { etoiles: number };
  };
  return { statut: reponse.statusCode, deja: corps.deja, etoiles: corps.progression.etoiles };
}

// ═══════════════════════════════════════════════════════════════════ lectures et invariant

export async function lireMondeHttp(atelier: AtelierVecu, profil: string): Promise<EtatMonde> {
  const reponse = await atelier.application.inject({
    method: 'GET',
    url: `/api/profils/${profil}/monde`
  });
  if (reponse.statusCode !== 200) {
    throw new Error(`Lecture du monde refusée (${String(reponse.statusCode)}) : ${reponse.body}`);
  }
  return reponse.json() as EtatMonde;
}

export async function lireProgressionHttp(
  atelier: AtelierVecu,
  profil: string
): Promise<readonly ProgressionNoeud[]> {
  const reponse = await atelier.application.inject({
    method: 'GET',
    url: `/api/profils/${profil}/progression`
  });
  if (reponse.statusCode !== 200) {
    throw new Error(
      `Lecture de la progression refusée (${String(reponse.statusCode)}) : ${reponse.body}`
    );
  }
  return reponse.json() as readonly ProgressionNoeud[];
}

/** Une sortie offerte à l'enfant : la région tapable, et le nœud où le tap le mène. */
export interface SortieOfferte {
  readonly region: string;
  readonly noeud: string;
}

/**
 * Les sorties que la carte OFFRE, calculées exactement comme `client/src/ecrans/EcranCarte.tsx`.
 *
 * Deux règles y sont recopiées, et elles décident tout :
 *   1. seules les régions rendues par `regionsOuvertes` sont tapables — une région dont
 *      l'Éclat est posé n'en fait plus partie, quelle que soit son apparence ;
 *   2. une région sans nœud rend `noeud: null` (`reprise`, `EcranCarte.tsx:181`), donc une
 *      prise inerte : `aria-hidden`, `pointerEvents: none`, `onClick` sans effet.
 *
 * On recopie plutôt qu'on n'importe : `reprise` est une closure locale de l'écran, non
 * exportée. La recopie est déclarée ici pour qu'elle se voie, et le test
 * `tests/api/profils-vecus.test.ts` vérifie qu'elle reste fidèle en comparant à `EcranCarte`
 * les deux seules données dont elle dépend.
 */
export function sortiesOffertes(
  monde: EtatMonde,
  noeudsFaits: ReadonlySet<string>
): readonly SortieOfferte[] {
  const parCode = new Map(monde.carte.regions.map((region) => [String(region.region), region]));
  const offertes: SortieOfferte[] = [];
  for (const code of regionsOuvertes(monde.carte)) {
    const region = parCode.get(String(code));
    const noeuds = region?.noeuds ?? [];
    if (noeuds.length === 0) {
      continue;
    }
    const index = noeuds.findIndex((noeud) => !noeudsFaits.has(String(noeud)));
    const choisi = noeuds[index === -1 ? 0 : index];
    if (choisi !== undefined) {
      offertes.push({ region: String(code), noeud: String(choisi) });
    }
  }
  return offertes;
}

/**
 * **L'INVARIANT.** Les sorties qui RÉPONDENT : offertes par la carte, et dont le paquet du
 * nœud rend bien 200.
 *
 * C'est la leçon de D48 poussée d'un cran : compter les éléments interactifs n'est pas compter
 * les sorties, et une sortie qui mène à un 404 n'est pas une sortie. Un seul état de profil
 * pour lequel cette liste est vide est un enfant bloqué.
 */
export async function sortiesQuiRepondent(
  atelier: AtelierVecu,
  profil: string
): Promise<readonly SortieOfferte[]> {
  const [monde, progression] = await Promise.all([
    lireMondeHttp(atelier, profil),
    lireProgressionHttp(atelier, profil)
  ]);
  const faits = new Set(progression.map((ligne) => String(ligne.noeud)));

  const qui: SortieOfferte[] = [];
  for (const sortie of sortiesOffertes(monde, faits)) {
    const paquet = await atelier.application.inject({
      method: 'GET',
      url: `/api/contenu/noeuds/${sortie.noeud}`
    });
    if (paquet.statusCode === 200) {
      qui.push(sortie);
    }
  }
  return qui;
}

// ═══════════════════════════════════════════════════════════════ les cinq profils vécus

/** Ce qu'une fixture rend : l'atelier vivant, le profil, et de quoi le décrire au rapport. */
export interface ProfilVecu {
  readonly code: string;
  readonly libelle: string;
  readonly atelier: AtelierVecu;
  readonly profil: string;
}

/** Les nœuds d'une région, dans l'ordre, tels que le référentiel COMPLET les déclare. */
export function noeudsDeLaRegion(code: string): readonly string[] {
  const region = referentielComplet().regions.find((entree) => String(entree.region) === code);
  return (region?.noeuds ?? []).map((noeud) => String(noeud));
}

/**
 * **V1 — à mi-parcours.** La Clairière entière, puis un tiers des Galeries.
 * C'est le profil le plus banal, et personne ne l'avait jamais monté.
 */
export async function profilAMiParcours(): Promise<ProfilVecu> {
  const atelier = await monterAtelier();
  const profil = await creerProfil(atelier, 'Ezékiel');
  for (const noeud of noeudsDeLaRegion('clairiere')) {
    await jouerNoeud(atelier, profil, noeud);
    atelier.horloge.avancer({ minutes: 4 });
  }
  for (const noeud of noeudsDeLaRegion('galeries').slice(0, 4)) {
    await jouerNoeud(atelier, profil, noeud);
    atelier.horloge.avancer({ minutes: 4 });
  }
  const joues = noeudsDeLaRegion('clairiere').length + 4;
  return {
    code: 'mi-parcours',
    libelle: `à mi-parcours (${String(joues)} nœuds sur ${String(referentielComplet().regions.reduce((total, region) => total + region.noeuds.length, 0))})`,
    atelier,
    profil
  };
}

/**
 * **V2 — a tout fini.** Tous les nœuds des DEUX PREMIÈRES régions, joués un par un, sur le
 * catalogue COMPLET. Elles en portaient 18 quand cette fixture a été écrite ; elle lit le
 * catalogue et n'écrit plus aucun compte.
 * Aucune triche : c'est l'état qu'atteindra l'enfant s'il continue à ce rythme.
 */
export async function profilQuiATOutFini(): Promise<ProfilVecu> {
  const atelier = await monterAtelier();
  const profil = await creerProfil(atelier, 'Ezékiel');
  for (const region of ['clairiere', 'galeries']) {
    for (const noeud of noeudsDeLaRegion(region)) {
      await jouerNoeud(atelier, profil, noeud);
      atelier.horloge.avancer({ minutes: 4 });
    }
  }
  const joues = noeudsDeLaRegion('clairiere').length + noeudsDeLaRegion('galeries').length;
  return {
    code: 'tout-fini',
    libelle: `a terminé les ${String(joues)} nœuds des deux premières régions`,
    atelier,
    profil
  };
}

/**
 * **V3 — a beaucoup échoué.** Douze tentatives ratées, avec aide, sur des nœuds du début.
 * R14 dit qu'aucun acquis n'est repris et qu'aucun écran d'échec n'existe : ce profil est
 * celui qui le vérifie sur un état DURABLE, pas sur quarante nœuds d'affilée.
 */
export async function profilQuiAEchoueSouvent(): Promise<ProfilVecu> {
  const atelier = await monterAtelier();
  const profil = await creerProfil(atelier, 'Ezékiel');
  const clairiere = noeudsDeLaRegion('clairiere');

  for (let passage = 0; passage < 4; passage += 1) {
    for (const noeud of clairiere.slice(0, 3)) {
      await jouerNoeud(atelier, profil, noeud, {
        reussi: false,
        nbErreurs: 5,
        aideUtilisee: 'demonstration',
        dureeMs: 210_000
      });
      atelier.horloge.avancer({ minutes: 6 });
    }
  }
  // Toute session se termine sur une réussite (R14) : la dernière l'est.
  await jouerNoeud(atelier, profil, clairiere[0]!, { aideUtilisee: 'indice' });
  return { code: 'echoue-souvent', libelle: '12 échecs puis une réussite', atelier, profil };
}

/**
 * **V4 — inactif depuis 40 jours.** Il a joué, il est parti, il revient. Toutes les échéances
 * du Leitner sont dépassées (la plus longue est J+35, v2 § 12.2) : c'est le seul état où le
 * moteur de révision a quelque chose à dire, et aucun test ne l'avait jamais atteint.
 */
export async function profilInactifDepuis40Jours(): Promise<ProfilVecu> {
  const atelier = await monterAtelier();
  const profil = await creerProfil(atelier, 'Ezékiel');
  for (const noeud of noeudsDeLaRegion('clairiere').slice(0, 3)) {
    await jouerNoeud(atelier, profil, noeud);
    atelier.horloge.avancer({ minutes: 5 });
  }
  atelier.horloge.avancer({ jours: 40 });
  return { code: 'inactif-40-jours', libelle: 'absent depuis 40 jours', atelier, profil };
}

/**
 * **L'ÉTAT DU JOUR OÙ EZÉKIEL A JOUÉ** — avant que le catalogue ne grandisse.
 *
 * Trois nœuds joués sur un catalogue qui n'en déclarait que trois. La lecture du monde est ce
 * qui FIGE la projection : c'est elle qui écrit `progression_region` (`lireCarte`,
 * `serveur/src/depots/monde.ts`). Sans elle, l'état de la base ne serait pas celui d'un enfant
 * qui a regardé sa carte.
 *
 * Exporté à part parce que c'est la MOITIÉ mesurable de la fixture V5 : les six lignes qu'il
 * produit sont exactement celles de `donnees/pierre.db`, et c'est ce qui prouve que la fixture
 * reproduit le vrai défaut plutôt qu'un défaut inventé.
 */
export async function etatDuJourDeEzekiel(): Promise<{
  readonly atelier: AtelierVecu;
  readonly profil: string;
}> {
  const petit = await monterAtelier({ noeudsParRegion: CATALOGUE_DU_JOUR_DE_EZEKIEL });
  const profil = await creerProfil(petit, 'Ezékiel');

  await jouerNoeud(petit, profil, 'clairiere-01', { nbErreurs: 3, aideUtilisee: 'indice' });
  petit.horloge.avancer({ minutes: 6 });
  await jouerNoeud(petit, profil, 'galeries-01');
  petit.horloge.avancer({ heures: 9 });
  await jouerNoeud(petit, profil, 'galeries-02');
  await lireMondeHttp(petit, profil);

  return { atelier: petit, profil };
}

/**
 * **V5 — état écrit par un catalogue plus petit.** LE cas qui vient de mordre.
 *
 * On joue les trois nœuds que le catalogue d'alors déclarait (1 Clairière + 2 Galeries),
 * puis on remonte l'application sur la même base avec le catalogue d'aujourd'hui.
 * Rien n'est écrit à la main : l'état de bascule est produit par les vraies routes.
 */
export async function profilDUnCataloguePlusPetit(): Promise<ProfilVecu> {
  const { atelier: petit, profil } = await etatDuJourDeEzekiel();
  const grand = await changerDeCatalogue(petit);
  return {
    code: 'catalogue-agrandi',
    libelle: `état écrit par un catalogue de 3 nœuds, relu sur ${String(catalogueDuDepot().noeuds.length)}`,
    atelier: grand,
    profil
  };
}

/** Les cinq fixtures, dans l'ordre du rapport. */
export const FIXTURES_VECUES: readonly {
  readonly code: string;
  readonly construire: () => Promise<ProfilVecu>;
}[] = [
  { code: 'mi-parcours', construire: profilAMiParcours },
  { code: 'tout-fini', construire: profilQuiATOutFini },
  { code: 'echoue-souvent', construire: profilQuiAEchoueSouvent },
  { code: 'inactif-40-jours', construire: profilInactifDepuis40Jours },
  { code: 'catalogue-agrandi', construire: profilDUnCataloguePlusPetit }
];

/** L'instant de départ de toutes les fixtures, pour les tests qui datent leurs assertions. */
export const DEPART_DES_FIXTURES = INSTANT_DE_REFERENCE;
