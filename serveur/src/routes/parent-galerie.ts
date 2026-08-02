/**
 * `GET /api/parent/:profil/galerie` — la galerie d'exercices de D34, lot N5.
 *
 * UNE SEULE ROUTE, ET ELLE NE FAIT QU'UNE CHOSE : rendre le catalogue complet. Elle
 * n'enregistre rien, ne projette rien, ne touche à aucune table du journal. C'est la
 * traduction en code de la deuxième propriété de D34 — « RIEN de journalisé » — et la seule
 * façon de la tenir pour de bon est qu'il n'existe ici **aucune écriture à oublier de
 * retirer**. Un filtre serveur laisserait la requête partir ; l'absence d'écriture, non.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER N'EST PAS BRANCHÉ DANS `application.ts`
 *
 * `serveur/src/application.ts` appartient à **N2** pour cette campagne (contrat de finition
 * v3 § 4.2) et N5 n'y a pas la plume. Or `application.ts` porte lui-même l'avertissement :
 * « un lot qui écrit une route sans qu'elle soit branchée verrait son travail silencieusement
 * absent ».
 *
 * La route est donc enregistrée depuis `routes/parent.ts`, que N5 possède, et qui lui passe
 * son propre garde de jeton. Un seul écrivain par fichier est préservé, et la route existe.
 * Choix consigné dans `Docs/questions-en-attente.md`.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * LE PARAMÈTRE `:profil` EST DANS LE CHEMIN ET N'EST PAS LU — c'est voulu, et c'est signalé.
 * Le contrat § 8 gèle ce chemin ; le catalogue, lui, ne dépend d'aucun enfant : D34 dit « tout
 * exercice lançable », donc filtrer par progression serait exactement l'inverse. Le paramètre
 * reste dans l'URL parce qu'il y est gelé et parce qu'une annotation « déjà joué par cet
 * enfant » viendra un jour s'y greffer sans changer le chemin. `tests/unitaires/
 * galerie-non-journalisee.test.ts` vérifie que deux profils voient la MÊME galerie.
 */

import path from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { ContexteServeur } from '../configuration.js';
import { RACINE_DEPOT } from '../configuration.js';
import { construireCatalogueExercices } from '../services/catalogue-exercices.js';

interface ParametresProfil {
  readonly profil: string;
}

/**
 * Le garde de jeton, tel que `routes/parent.ts` le tient. Il rend `true` quand la requête peut
 * continuer, et a **déjà répondu** sinon — d'où le second paramètre.
 */
export type GardeJetonParent = (requete: FastifyRequest, reponse: FastifyReply) => boolean;

export function enregistrerRoutesParentGalerie(
  app: FastifyInstance,
  contexte: ContexteServeur,
  jetonValide: GardeJetonParent
): void {
  const racineContenu = path.join(RACINE_DEPOT, 'contenu');

  app.get<{ Params: ParametresProfil }>(
    '/api/parent/:profil/galerie',
    async (requete, reponse) => {
      if (!jetonValide(requete, reponse)) {
        return reponse;
      }

      const catalogue = await construireCatalogueExercices(
        contexte.base,
        RACINE_DEPOT,
        racineContenu
      );
      return reponse.send(catalogue);
    }
  );
}
