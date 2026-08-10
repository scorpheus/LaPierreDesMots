/**
 * Routes de profil : liste, creation, lecture, progression.
 *
 * Quatre des sept routes du contrat § 3.3 :
 *   GET  /api/profils
 *   POST /api/profils                  -> 201
 *   GET  /api/profils/:id
 *   GET  /api/profils/:id/progression
 *
 * Le corps d'une requete est une entree NON FIABLE. Il est valide a l'execution — le typage
 * TypeScript ne franchit pas la frontiere HTTP et ne prouve rien sur ce qui arrive du reseau.
 */

import type { FastifyInstance } from 'fastify';

import type { Profil, ProgressionNoeud } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import {
  creerProfil,
  lireProfil,
  lireProgression,
  listerProfils,
  validerCreationProfil
} from '@pierre/partage/base';

interface ParametresIdentifiant {
  readonly id: string;
}

export function enregistrerRoutesProfils(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get('/api/profils', async () => {
    const profils: readonly Profil[] = await listerProfils(contexte.base);
    return profils;
  });

  app.post('/api/profils', async (requete, reponse) => {
    const validation = validerCreationProfil(requete.body);
    if (!validation.ok) {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
    }

    const profil: Profil = await creerProfil(contexte.base, validation.valeur, contexte.horloge);
    return reponse.code(201).send(profil);
  });

  app.get<{ Params: ParametresIdentifiant }>('/api/profils/:id', async (requete, reponse) => {
    const profil = await lireProfil(contexte.base, requete.params.id);
    if (profil === null) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
    }
    return reponse.send(profil);
  });

  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/progression',
    async (requete, reponse) => {
      const profil = await lireProfil(contexte.base, requete.params.id);
      if (profil === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      const progression: readonly ProgressionNoeud[] = await lireProgression(
        contexte.base,
        requete.params.id
      );
      return reponse.send(progression);
    }
  );
}
