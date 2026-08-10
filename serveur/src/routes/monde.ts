/**
 * Routes du monde — lot L2-F, contrat des features v2 § 5.3.
 *
 *   GET  /api/profils/:id/monde                     -> EtatMonde
 *   POST /api/profils/:id/campement                 -> EtatMonde   (corps : { objet })
 *   POST /api/profils/:id/campement/points/:point   -> 204          (lot Q1, R31/R11)
 *
 * **Aucun jeton n'est demande** : ce sont des routes enfant, et « un tap suffit, aucun mot de
 * passe » (v2 § 11). L'etancheite entre profils est en revanche stricte — toutes les requetes
 * SQL du depot sont filtrees par `profil_id`, et `tests/api/monde.test.ts` le verifie.
 *
 * Ce fichier n'est PAS branche par lui-meme : `serveur/src/application.ts` appartient a L2-H,
 * qui enregistre les routes des cinq lots serveur (contrat § 5.2, inversion n° 3). Tant que L2-H
 * n'a pas rendu, ces deux routes existent et ne repondent pas — l'absence NE COMPILE PAS chez
 * L2-H, ce qui est exactement le comportement voulu.
 */

import type { FastifyInstance } from 'fastify';

import type { EtatMonde } from '@pierre/partage';
import { CHEMINS_API } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { CHEMINS_OUVERTURE } from '@pierre/partage/ouverture';

import {
  enregistrerOuvertureVue,
  lireMonde,
  lireOuverture,
  lireProfil,
  noterVisitePoint,
  objetConnu,
  pointConnu,
  poserObjetCampement
} from '@pierre/partage/base';
import type { ReferentielMonde } from '@pierre/partage/base';
import { chargerReferentielMonde } from '../referentiels/monde.js';

interface ParametresIdentifiant {
  readonly id: string;
}

interface ParametresPointCampement {
  readonly id: string;
  readonly point: string;
}

/** Un code d'objet reste court ; la borne evite un abus par le reseau. */
const LONGUEUR_CODE_MAX = 64;

type ValidationObjet =
  | { readonly ok: true; readonly objet: string }
  | { readonly ok: false; readonly message: string };

/**
 * Valide le corps de `POST /api/profils/:id/campement`.
 *
 * Le corps d'une requete est une entree NON FIABLE : le typage TypeScript ne franchit pas la
 * frontiere HTTP et ne prouve rien sur ce qui arrive du reseau (meme regle qu'aux profils).
 */
export function validerDepotObjet(corps: unknown): ValidationObjet {
  if (typeof corps !== 'object' || corps === null) {
    return { ok: false, message: 'Le corps de la requete doit etre un objet JSON.' };
  }
  const brut = corps as { objet?: unknown };
  if (typeof brut.objet !== 'string' || brut.objet.trim() === '') {
    return { ok: false, message: 'Le champ « objet » est obligatoire et doit etre une chaine.' };
  }
  const objet = brut.objet.trim();
  if (objet.length > LONGUEUR_CODE_MAX) {
    return {
      ok: false,
      message: `Le champ « objet » depasse ${String(LONGUEUR_CODE_MAX)} caracteres.`
    };
  }
  return { ok: true, objet };
}

type ValidationOuverture =
  | { readonly ok: true; readonly passee: boolean }
  | { readonly ok: false; readonly message: string };

/**
 * Valide le corps de `POST /api/profils/:id/ouverture`.
 *
 * Meme regle qu'au depot d'objet : le corps d'une requete est une entree NON FIABLE, et le
 * typage TypeScript ne franchit pas la frontiere HTTP.
 *
 * `passee` ABSENT vaut `false`, et ce n'est pas de la complaisance : un client qui poste sans
 * corps dit « l'enfant a vu la sequence », ce qui est la seule chose que la route enregistre.
 * Refuser en 400 ferait perdre l'information pour un champ facultatif par nature. En revanche
 * un `passee` present d'un mauvais TYPE est refuse : c'est un bogue d'appelant, pas un oubli.
 */
export function validerFinOuverture(corps: unknown): ValidationOuverture {
  if (corps === undefined || corps === null) {
    return { ok: true, passee: false };
  }
  if (typeof corps !== 'object') {
    return { ok: false, message: 'Le corps de la requete doit etre un objet JSON.' };
  }
  const brut = corps as { passee?: unknown };
  if (brut.passee === undefined) {
    return { ok: true, passee: false };
  }
  if (typeof brut.passee !== 'boolean') {
    return { ok: false, message: 'Le champ « passee » doit etre un booleen.' };
  }
  return { ok: true, passee: brut.passee };
}

export function enregistrerRoutesMonde(
  app: FastifyInstance,
  contexte: ContexteServeur,
  referentiel: ReferentielMonde = chargerReferentielMonde(),
): void {
  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/monde',
    async (requete, reponse) => {
      if ((await lireProfil(contexte.base, requete.params.id)) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      const monde: EtatMonde = await lireMonde(
        contexte.base,
        requete.params.id,
        referentiel,
        contexte.horloge
      );
      return reponse.send(monde);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════════════
  // LA SEQUENCE D'OUVERTURE — N4, contrat de finition v3 § 8 (D35).
  //
  //   GET  /api/profils/:id/ouverture  -> EtatOuverture
  //   POST /api/profils/:id/ouverture  -> EtatOuverture  (corps : { passee })
  //
  // ── POURQUOI CES DEUX ROUTES SONT ICI ET PAS DANS UN FICHIER A ELLES ──────────────────
  // Le § 8 les attribue nommement a N4. Le § 4.4, qui donne l'arborescence de N4 fichier par
  // fichier — et dont le compte est verifie (11 crees, 5 modifies), donc delibere — ne lui
  // accorde AUCUN fichier de routes. Les deux sections du contrat gele se contredisent.
  //
  // Le § 0 interdit de creer un fichier non liste. `serveur/src/routes/monde.ts` existe,
  // n'est attribue a aucun des huit lots N1 a N8, est deja enregistre par `application.ts`
  // — que N2 modifie en parallele, et qu'on evite ainsi de toucher a deux — et porte deja
  // les deux autres routes en `/api/profils/:id/...`. C'est la seule resolution qui ne cree
  // ni fichier interdit, ni second ecrivain. Signale au rapport de N4.
  //
  // AUCUN JETON n'est demande : ce sont des routes enfant, comme les deux ci-dessus.
  // ══════════════════════════════════════════════════════════════════════════════════════
  app.get<{ Params: ParametresIdentifiant }>(
    CHEMINS_OUVERTURE.motif,
    async (requete, reponse) => {
      if ((await lireProfil(contexte.base, requete.params.id)) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      return reponse.send(await lireOuverture(contexte.base, requete.params.id));
    }
  );

  app.post<{ Params: ParametresIdentifiant }>(
    CHEMINS_OUVERTURE.motif,
    async (requete, reponse) => {
      if ((await lireProfil(contexte.base, requete.params.id)) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }

      const validation = validerFinOuverture(requete.body);
      if (!validation.ok) {
        return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
      }

      return reponse.send(
        await enregistrerOuvertureVue(
          contexte.base,
          requete.params.id,
          validation.passee,
          contexte.horloge
        )
      );
    }
  );

  app.post<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/campement',
    async (requete, reponse) => {
      if ((await lireProfil(contexte.base, requete.params.id)) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }

      const validation = validerDepotObjet(requete.body);
      if (!validation.ok) {
        return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
      }

      // Un objet que le referentiel ne declare pas n'entre pas au campement : sinon la table
      // accumulerait des codes morts que plus aucun asset ne sait afficher.
      if (!objetConnu(referentiel, validation.objet)) {
        return reponse
          .code(404)
          .send(
            erreurApi(
              CODES_ERREUR.introuvable,
              `Objet de campement inconnu : ${validation.objet}`
            )
          );
      }

      await poserObjetCampement(contexte.base, requete.params.id, validation.objet, contexte.horloge);

      const monde: EtatMonde = await lireMonde(
        contexte.base,
        requete.params.id,
        referentiel,
        contexte.horloge
      );
      return reponse.send(monde);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════════════════
  // LA VISITE D'UN POINT D'INTERACTION LIBRE DU CAMPEMENT — lot Q1 (garde
  // `tests/unitaires/ecrivains-atteignables.test.ts`), R31 et R11.
  //
  // `noterVisitePoint` existait deja et etait juste, mais aucune route ne l'appelait :
  // exactement le defaut que Q1 traque, et la cause mesuree de `points_visites = 0` apres
  // 23 parties (feuille-de-route-debug.md § 2). Le point est GRATUIT — aucune etoile, aucun
  // acquis, «  sert a varier les reactions, jamais a noter  » (depots/monde.ts) — donc aucune
  // 404 n'est levee sur un point inconnu au-dela de la validation la plus simple : un enfant
  // qui touche un point ne doit jamais voir une erreur reseau pour un geste sans consequence.
  // ══════════════════════════════════════════════════════════════════════════════════════
  app.post<{ Params: ParametresPointCampement }>(
    CHEMINS_API.motifs.campementPointVisite,
    async (requete, reponse) => {
      if ((await lireProfil(contexte.base, requete.params.id)) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }

      if (!pointConnu(referentiel, requete.params.point)) {
        return reponse
          .code(404)
          .send(
            erreurApi(
              CODES_ERREUR.introuvable,
              `Point de campement inconnu : ${requete.params.point}`
            )
          );
      }

      await noterVisitePoint(contexte.base, requete.params.id, requete.params.point, contexte.horloge);
      return reponse.code(204).send();
    }
  );
}
