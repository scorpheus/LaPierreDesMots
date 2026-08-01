/**
 * Racine de composition du serveur.
 *
 * `construireApplication` ne lit AUCUNE variable d'environnement, n'ouvre AUCUNE base et n'ecoute
 * sur AUCUN port : tout lui arrive par `OptionsApplication`. C'est ce qui permet a
 * `tests/api/*.test.ts` (L-G) de monter l'application sur `:memory:` avec une horloge figee et
 * zero port ouvert, via `fastify.inject()` — contrat § 6.4.
 *
 * Consequence a ne pas defaire : si un jour une route appelle `lireConfiguration()` pour obtenir
 * ce qu'elle aurait du recevoir en injection, les tests cessent d'etre etanches.
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';

import type { Alea, DepotContenu, Horloge } from '@pierre/partage';
import { initialiserRegistreMoteurs } from '@pierre/partage';

import type { ContexteServeur } from './configuration.js';
import { CODES_ERREUR, erreurApi } from './configuration.js';
import { enregistrerRoutesContenu } from './routes/contenu.js';
import { enregistrerRoutesProfils } from './routes/profils.js';
import { enregistrerRoutesSante } from './routes/sante.js';
import { enregistrerRoutesTentatives } from './routes/tentatives.js';
import { enregistrerStatique } from './statique.js';

export interface OptionsApplication {
  readonly base: DatabaseSync;
  readonly contenu: DepotContenu;
  readonly horloge: Horloge;
  readonly alea: Alea;
  readonly racineClient: string | null;
}

/** Un corps de tentative reste tres en dessous ; la borne protege le PC du salon. */
const TAILLE_CORPS_MAX = 512 * 1024;

export function construireApplication(options: OptionsApplication): FastifyInstance {
  // Idempotent (contrat § 4.3). La racine de composition du serveur en repond au meme titre que
  // celle du client et celle de chaque test.
  initialiserRegistreMoteurs();

  const app = Fastify({
    // Silencieux par defaut : une suite de tests qui deverse des journaux rend le rapport
    // illisible. `PIERRE_JOURNAL=oui` les rallume pour un diagnostic.
    logger: process.env['PIERRE_JOURNAL'] === 'oui',
    bodyLimit: TAILLE_CORPS_MAX
    // `caseSensitive` reste au defaut (`true`). Le passer a `false` ferait aussi passer les
    // PARAMETRES en minuscules chez find-my-way, ce qui casserait tout asset dont le nom de
    // fichier porte une majuscule.
  });

  const contexte: ContexteServeur = {
    base: options.base,
    contenu: options.contenu,
    horloge: options.horloge,
    alea: options.alea
  };

  enregistrerRoutesSante(app, contexte);
  enregistrerRoutesProfils(app, contexte);
  enregistrerRoutesContenu(app, contexte);
  enregistrerRoutesTentatives(app, contexte);

  // Toute erreur repond `ErreurApi` (contrat § 3.3).
  // `erreur` arrive en `unknown` : on le reduit une fois, ici, plutot que de le supposer
  // structure a chacun des quatre sites qui le lisent.
  app.setErrorHandler((erreurBrute: unknown, requete, reponse) => {
    const erreur = (
      erreurBrute instanceof Error ? erreurBrute : new Error(String(erreurBrute))
    ) as Error & { statusCode?: number };
    const statut = typeof erreur.statusCode === 'number' ? erreur.statusCode : 500;

    if (statut >= 500) {
      // On journalise toujours le 500, meme logger eteint : c'est le seul evenement dont
      // l'absence de trace couterait plus cher que le bruit.
      process.stderr.write(
        `[pierre] 500 sur ${requete.method} ${requete.url} — ${erreur.message}\n`
      );
      return reponse
        .code(500)
        .send(erreurApi(CODES_ERREUR.interne, 'Le serveur a rencontre une erreur interne.'));
    }

    const code = statut === 404 ? CODES_ERREUR.introuvable : CODES_ERREUR.invalide;
    return reponse.code(statut).send(erreurApi(code, erreur.message));
  });

  // En dernier : le service statique porte le gestionnaire de 404, qui doit voir passer tout ce
  // qu'aucune route n'a pris.
  enregistrerStatique(app, options.racineClient);

  return app;
}
