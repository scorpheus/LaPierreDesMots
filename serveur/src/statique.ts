/**
 * Service du client bati (`client/dist`, ou `client/dist-test` sous Playwright).
 *
 * Aucune dependance ajoutee : `@fastify/static` n'est pas dans la liste autorisee par la
 * decision D4, et servir un dossier de fichiers statiques ne justifie pas d'en demander une.
 * `node:fs` suffit.
 *
 * Le repli en `index.html` fait du client une application a une seule page : `/carte` recharge
 * depuis la tablette doit rendre l'application, pas un 404. Les chemins `/api/**` sont exclus du
 * repli — sinon une route d'API mal orthographiee renverrait du HTML avec un code 200, et le
 * client croirait avoir recu des donnees.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

import type { FastifyInstance } from 'fastify';

import { CODES_ERREUR, erreurApi } from './configuration.js';
import { resoudreSousRacine } from './services/depot-contenu-disque.js';

/** Types MIME servis en v1. Un asset inconnu part en flux binaire, jamais en HTML. */
export const TYPES_MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.opus': 'audio/opus',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

export function typeMime(chemin: string): string {
  return TYPES_MIME[path.extname(chemin).toLowerCase()] ?? 'application/octet-stream';
}

/** Chemin d'un fichier existant sous `racine`, ou `null` (traversee comprise). */
export function fichierStatique(racine: string, urlChemin: string): string | null {
  const sansRequete = urlChemin.split('?')[0] ?? '';
  let decode: string;
  try {
    decode = decodeURIComponent(sansRequete);
  } catch {
    return null;
  }

  const resolu = resoudreSousRacine(racine, decode);
  if (resolu === null || !existsSync(resolu)) {
    return null;
  }
  return statSync(resolu).isFile() ? resolu : null;
}

/**
 * Enregistre le service statique et le gestionnaire de 404.
 *
 * `racineClient === null` : aucun client bati. Le serveur reste utilisable — les routes d'API
 * repondent — et le 404 le dit en clair au lieu de laisser croire a un probleme de reseau.
 */
export function enregistrerStatique(app: FastifyInstance, racineClient: string | null): void {
  app.setNotFoundHandler((requete, reponse) => {
    const chemin = requete.url.split('?')[0] ?? '/';

    if (chemin.startsWith('/api/') || chemin === '/api') {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Route inconnue : ${requete.method} ${chemin}`));
    }

    if (racineClient === null) {
      return reponse
        .code(404)
        .type('text/plain; charset=utf-8')
        .send(
          'Le client n’est pas encore bati. Lancez « npm run construire » puis « npm run demarrer ».'
        );
    }

    if (requete.method !== 'GET' && requete.method !== 'HEAD') {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Route inconnue : ${requete.method} ${chemin}`));
    }

    const fichier = fichierStatique(racineClient, chemin);
    if (fichier !== null) {
      return reponse.type(typeMime(fichier)).send(createReadStream(fichier));
    }

    // Repli application a une seule page.
    const index = path.join(racineClient, 'index.html');
    if (existsSync(index)) {
      return reponse.type(TYPES_MIME['.html'] ?? 'text/html').send(createReadStream(index));
    }

    return reponse
      .code(404)
      .type('text/plain; charset=utf-8')
      .send(`Aucun fichier pour ${chemin}.`);
  });
}
