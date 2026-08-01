/**
 * `GET /api/profils/:id/maitrise` et `GET /api/profils/:id/revisions` — lot L2-D.
 *
 * Deux routes en LECTURE SEULE. Rien ne s'ecrit ici : la maitrise et les boites Leitner
 * avancent au passage d'une tentative (`POST /api/tentatives`), jamais sur une consultation.
 * Une lecture qui ferait avancer un etat rendrait le dashboard parent complice de ce qu'il
 * mesure.
 *
 * Etancheite par profil (v2 § 11) : chaque requete est bornee au profil de l'URL, et un profil
 * inconnu rend 404 plutot qu'une liste vide — une liste vide ne se distingue pas d'un profil
 * qui n'a encore rien joue.
 *
 * Ces routes sont ENREGISTREES par `serveur/src/application.ts`, possede par L2-H (contrat des
 * features v2 § 5.2, inversion n° 3). L2-D les ecrit, il ne les branche pas.
 */

import type { FastifyInstance } from 'fastify';

import type { EtatMaitrise, ItemLeitner } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { lireRevisionsDues } from '../depots/leitner.js';
import { lireMaitrises } from '../depots/maitrise.js';
import { profilExiste } from '../depots/profils.js';

interface ParametresProfil {
  readonly id: string;
}

export function enregistrerRoutesPedagogie(
  app: FastifyInstance,
  contexte: ContexteServeur
): void {
  app.get('/api/profils/:id/maitrise', (requete, reponse) => {
    const { id } = requete.params as ParametresProfil;
    if (!profilExiste(contexte.base, id)) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${id}`));
    }
    const corps: readonly EtatMaitrise[] = lireMaitrises(contexte.base, id);
    return reponse.code(200).send(corps);
  });

  /**
   * Les revisions DUES a l'instant de la requete, pas toutes les boites.
   *
   * L'instant vient de `contexte.horloge` : en test elle est figee, et c'est ce qui permet de
   * verifier qu'un item revient bien a J+35 sans attendre cinq semaines (annexe T § 2.2).
   */
  app.get('/api/profils/:id/revisions', (requete, reponse) => {
    const { id } = requete.params as ParametresProfil;
    if (!profilExiste(contexte.base, id)) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${id}`));
    }
    const corps: readonly ItemLeitner[] = lireRevisionsDues(
      contexte.base,
      id,
      contexte.horloge.maintenant()
    );
    return reponse.code(200).send(corps);
  });
}
