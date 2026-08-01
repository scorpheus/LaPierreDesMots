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
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';

import type { Alea, DepotContenu, Horloge } from '@pierre/partage';
import { initialiserRegistreMoteurs } from '@pierre/partage';

import type { ContexteServeur } from './configuration.js';
import { CODES_ERREUR, erreurApi } from './configuration.js';
import { enregistrerRoutesContenu } from './routes/contenu.js';
import { enregistrerRoutesProfils } from './routes/profils.js';
import { enregistrerRoutesSante } from './routes/sante.js';
import { enregistrerRoutesTentatives } from './routes/tentatives.js';
// Les cinq fichiers de routes de la campagne v2. Chaque lot ECRIT le sien ; c'est L2-H qui les
// BRANCHE, en un seul endroit — contrat des features v2 § 5.2, inversion n° 3 : « un lot qui
// ecrit une route sans qu'elle soit branchee verrait son travail silencieusement absent ; ici,
// l'absence ne compile pas ».
import { enregistrerRoutesReglages } from './routes/reglages.js';
import { enregistrerRoutesPedagogie } from './routes/pedagogie.js';
import { enregistrerRoutesSortie } from './routes/sortie.js';
import { enregistrerRoutesMonde } from './routes/monde.js';
import { enregistrerRoutesParent } from './routes/parent.js';
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

/**
 * Traduit une erreur du ROUTEUR en `ErreurApi`.
 *
 * Ecrite a part, avec ses types concrets, plutot qu'en litteral dans les options : la
 * signature declaree de `frameworkErrors` est generique sur `RequestGeneric`, si bien qu'a
 * l'interieur d'un litteral `reponse.code(400)` ne se type pas (`ReplyKeysToCodes<keyof
 * RequestGeneric['Reply']>` reste non resolu). Ici, `FastifyReply` est concret.
 *
 * Les trois seules erreurs que Fastify fait passer par cette porte sont `FST_ERR_BAD_URL`
 * (400), `FST_ERR_MAX_PARAM_LENGTH` (414) et `FST_ERR_ASYNC_CONSTRAINT` (500) : elles sont
 * traitees nommement, et non par recopie de `erreur.statusCode`.
 */
function repondreErreurDeRoutage(
  erreur: FastifyError,
  _requete: FastifyRequest,
  reponse: FastifyReply
): FastifyReply {
  if (erreur.statusCode === 500) {
    process.stderr.write(`[pierre] 500 de routage — ${erreur.message}\n`);
    return reponse
      .code(500)
      .send(erreurApi(CODES_ERREUR.interne, 'Le serveur a rencontre une erreur interne.'));
  }
  if (erreur.statusCode === 414) {
    return reponse.code(414).send(erreurApi(CODES_ERREUR.invalide, erreur.message));
  }
  return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, erreur.message));
}

export function construireApplication(options: OptionsApplication): FastifyInstance {
  // Idempotent (contrat § 4.3). La racine de composition du serveur en repond au meme titre que
  // celle du client et celle de chaque test.
  initialiserRegistreMoteurs();

  const app = Fastify({
    // Silencieux par defaut : une suite de tests qui deverse des journaux rend le rapport
    // illisible. `PIERRE_JOURNAL=oui` les rallume pour un diagnostic.
    logger: process.env['PIERRE_JOURNAL'] === 'oui',
    bodyLimit: TAILLE_CORPS_MAX,
    // `caseSensitive` reste au defaut (`true`). Le passer a `false` ferait aussi passer les
    // PARAMETRES en minuscules chez find-my-way, ce qui casserait tout asset dont le nom de
    // fichier porte une majuscule.
    //
    // ─────────────────────────────────────────────────────────────────────────────────────
    // `frameworkErrors` — la seule porte par ou les erreurs du ROUTEUR peuvent rendre un
    // `ErreurApi` (contrat v1 § 3.3, « toute erreur repond `ErreurApi` »).
    //
    // Mesure, sortie citee, dans `node_modules/fastify/fastify.js` :
    //
    //   642  function onBadUrl (path, req, res) {
    //   643    if (options.frameworkErrors) { … }
    //   651    const body = JSON.stringify({ error: 'Bad Request', code: 'FST_ERR_BAD_URL', …
    //   657    res.writeHead(400, …); res.end(body)
    //
    // `onBadUrl` et `onMaxParamLength` ecrivent DIRECTEMENT dans la reponse Node : ni les
    // crochets, ni `setErrorHandler` ne les voient. Sans cette option, une URL au pourcentage
    // tronque (`/api/contenu/assets/%E0%A4%A`) rend `{ code: 'FST_ERR_BAD_URL' }` — un
    // vocabulaire d'erreur etranger au projet, que le client ne sait pas lire, et un nom de
    // dependance expose au reseau du salon.
    // ─────────────────────────────────────────────────────────────────────────────────────
    // Les trois seules erreurs que Fastify fait passer par ici sont `FST_ERR_BAD_URL` (400),
    // `FST_ERR_MAX_PARAM_LENGTH` (414) et `FST_ERR_ASYNC_CONSTRAINT` (500) : on les traite
    // nommement plutot que de recopier `erreur.statusCode`, qui n'est pas type en litteral.
    frameworkErrors: repondreErreurDeRoutage
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

  // Les 12 routes nouvelles du contrat des features v2 § 5.3, par lot proprietaire.
  enregistrerRoutesReglages(app, contexte); // L2-B — reglages de lecture, essai typographique
  enregistrerRoutesPedagogie(app, contexte); // L2-D — maitrise, revisions
  enregistrerRoutesSortie(app, contexte); // L2-D — composition d'une sortie
  enregistrerRoutesMonde(app, contexte); // L2-F — monde, campement
  enregistrerRoutesParent(app, contexte); // L2-H — zone parent

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
