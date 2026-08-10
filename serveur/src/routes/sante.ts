/**
 * `GET /api/sante` — la route que `demarrer.bat` interroge pour savoir si le serveur repond,
 * et celle que la tablette appelle pour verifier qu'elle voit bien le PC sur le LAN.
 *
 * Elle ne touche pas la base : un serveur dont la base est cassee doit quand meme pouvoir dire
 * qu'il est en vie, sinon le diagnostic est impossible depuis la tablette.
 */

import type { FastifyInstance } from 'fastify';

import type { ReponseSante } from '@pierre/partage';
import { moteursEnregistres } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { horodatage } from '../configuration.js';

/** Version du socle servi. Une seule livraison en v1. */
export const VERSION_SERVEUR = '1.0.0';

export function enregistrerRoutesSante(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get('/api/sante', () => {
    // Les quatre champs sont ceux du contrat § 3.2 (`ReponseSante`). L'implantation
    // initiale n'en portait qu'un — `instant` — sous un nom absent du contrat.
    // `Base` (Docs/addendum-portage-android.md § 4) est un port async sans propriété `isOpen`
    // synchrone — ni `node:sqlite` en dehors de `DatabaseSync`, ni le futur adaptateur Capacitor
    // n'en exposent une bon marché. Atteindre cette ligne prouve déjà que la connexion a été
    // ouverte avec succès au démarrage (`index.ts`) ; une vraie panne de connexion ferait
    // échouer le serveur bien avant d'en arriver à répondre à une requête HTTP.
    const reponse: ReponseSante = {
      statut: 'ok',
      version: VERSION_SERVEUR,
      maintenant: horodatage(contexte.horloge),
      base: 'ouverte',
      moteurs: moteursEnregistres()
    };
    return reponse;
  });
}
