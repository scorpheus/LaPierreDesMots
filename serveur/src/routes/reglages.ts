/**
 * Routes des reglages de lecture — lot L2-B, contrat des features v2 § 5.3.
 *
 *   GET  /api/profils/:id/reglages            -> ReglagesLecture
 *   PUT  /api/profils/:id/reglages            -> ReglagesLecture
 *   GET  /api/profils/:id/essai-typographie   -> ComparaisonTypographie | null
 *
 * Aucune de ces routes n'exige de jeton : ce sont des routes ENFANT (v2 § 11, « un tap suffit,
 * aucun mot de passe »). Seule la zone parent en demande un, et elle n'est pas de ce lot.
 *
 * Le corps d'une requete est une entree NON FIABLE. Il est valide a l'execution — mais la
 * validation ne REJETTE pas : `normaliserReglages` ramene dans les bornes. Un `PUT` ne repond
 * donc jamais 400 sur une valeur hors bornes, seulement sur un corps qui n'est pas un objet.
 * C'est le pendant serveur de « une valeur hors bornes est RAMENEE, jamais rejetee ».
 *
 * ⚠ Ces routes sont ECRITES ici et BRANCHEES par L2-H dans `serveur/src/application.ts`
 * (contrat § 5.1, ligne « L2-H -> C, D, F (serveur) »). Ce fichier ne s'enregistre pas lui-meme.
 */

import type { FastifyInstance } from 'fastify';

import type { ComparaisonTypographie, ReglagesLecture } from '@pierre/partage/lecture';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { lireComparaison, ecrireReglages, lireReglages, profilExiste } from '@pierre/partage/base';

interface ParametresIdentifiant {
  readonly id: string;
}

/**
 * Extrait le delta de reglages d'un corps non fiable.
 *
 * Ne rend que les champs PRESENTS, et les rend tels quels : c'est `normaliserReglages` qui
 * borne, et un seul endroit doit borner. Un champ absent du corps n'est pas un champ a zero,
 * c'est un champ que l'ecran n'a pas touche — la difference compte, puisque l'ecran n'envoie
 * qu'un reglage a la fois.
 */
export function extraireDeltaReglages(corps: unknown): Partial<ReglagesLecture> | null {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) {
    return null;
  }
  const brut = corps as Record<string, unknown>;
  const delta: Record<string, unknown> = {};
  const champs = [
    'police',
    'corpsPx',
    'interlettrageEm',
    'espacementMotsEm',
    'interligne',
    'colorationSyllabique',
    'surlignageLigneCourante',
    'regleDeLecture',
    'fond',
  ] as const;

  for (const champ of champs) {
    if (Object.hasOwn(brut, champ)) {
      delta[champ] = brut[champ];
    }
  }
  return delta as Partial<ReglagesLecture>;
}

export function enregistrerRoutesReglages(
  app: FastifyInstance,
  contexte: ContexteServeur,
): void {
  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/reglages',
    async (requete, reponse) => {
      if (!(await profilExiste(contexte.base, requete.params.id))) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      const reglages: ReglagesLecture = await lireReglages(contexte.base, requete.params.id);
      return reponse.send(reglages);
    },
  );

  app.put<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/reglages',
    async (requete, reponse) => {
      if (!(await profilExiste(contexte.base, requete.params.id))) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }

      const delta = extraireDeltaReglages(requete.body);
      if (delta === null) {
        return reponse
          .code(400)
          .send(
            erreurApi(CODES_ERREUR.invalide, 'Le corps de la requete doit etre un objet JSON.'),
          );
      }

      const ecrits: ReglagesLecture = await ecrireReglages(
        contexte.base,
        requete.params.id,
        delta,
        contexte.horloge,
      );
      return reponse.send(ecrits);
    },
  );

  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/essai-typographie',
    async (requete, reponse) => {
      if (!(await profilExiste(contexte.base, requete.params.id))) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      // `null` est une reponse LEGITIME, pas une erreur : aucun essai n'est ouvert tant que
      // personne n'en a ouvert un. Repondre 404 laisserait croire a un defaut.
      const comparaison: ComparaisonTypographie | null = await lireComparaison(
        contexte.base,
        requete.params.id,
      );
      return reponse.send(comparaison);
    },
  );
}
