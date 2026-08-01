/**
 * Routes du monde — lot L2-F, contrat des features v2 § 5.3.
 *
 *   GET  /api/profils/:id/monde      -> EtatMonde
 *   POST /api/profils/:id/campement  -> EtatMonde   (corps : { objet })
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

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { lireProfil } from '../depots/profils.js';
import {
  chargerReferentielMonde,
  lireMonde,
  objetConnu,
  poserObjetCampement
} from '../depots/monde.js';
import type { ReferentielMonde } from '../depots/monde.js';

interface ParametresIdentifiant {
  readonly id: string;
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

export function enregistrerRoutesMonde(
  app: FastifyInstance,
  contexte: ContexteServeur,
  referentiel: ReferentielMonde = chargerReferentielMonde(),
): void {
  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/monde',
    (requete, reponse) => {
      if (lireProfil(contexte.base, requete.params.id) === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      const monde: EtatMonde = lireMonde(
        contexte.base,
        requete.params.id,
        referentiel,
        contexte.horloge
      );
      return reponse.send(monde);
    }
  );

  app.post<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/campement',
    (requete, reponse) => {
      if (lireProfil(contexte.base, requete.params.id) === null) {
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

      poserObjetCampement(contexte.base, requete.params.id, validation.objet, contexte.horloge);

      const monde: EtatMonde = lireMonde(
        contexte.base,
        requete.params.id,
        referentiel,
        contexte.horloge
      );
      return reponse.send(monde);
    }
  );
}
