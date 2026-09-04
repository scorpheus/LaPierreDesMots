#!/usr/bin/env node
/** Serveur de recette locale qui reproduit le sous-chemin et le 404 de GitHub Pages. */

import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const DIST = path.join(RACINE, 'client', 'dist-pwa');
const BASE = '/LaPierreDesMots/';
const PORT = Number(process.env['PIERRE_PORT_PWA'] ?? '4175');
const SUR_LAN = process.argv.includes('--lan');
const HOTE = SUR_LAN ? '0.0.0.0' : '127.0.0.1';

const TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function fichierSousDist(cheminUrl) {
  let decode;
  try {
    decode = decodeURIComponent(cheminUrl);
  } catch {
    return null;
  }
  const relatif = decode.slice(BASE.length).replace(/^\/+/, '') || 'index.html';
  const cible = path.resolve(DIST, relatif);
  const ecart = path.relative(DIST, cible);
  if (ecart.startsWith(`..${path.sep}`) || ecart === '..' || path.isAbsolute(ecart)) return null;
  if (!existsSync(cible) || !statSync(cible).isFile()) return null;
  return cible;
}

function entetesDe(fichier) {
  const nom = path.basename(fichier);
  const type = TYPES[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream';
  const empreinte = /[-.][A-Za-z0-9_-]{8,}\.[^.]+$/u.test(nom);
  const sansCache = ['index.html', '404.html', 'manifest.webmanifest', 'service-worker.js'].includes(nom);
  return {
    'Content-Type': type,
    'Cache-Control': sansCache
      ? 'no-cache'
      : empreinte
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=600',
    'X-Content-Type-Options': 'nosniff'
  };
}

function plageDemandee(entete, taille) {
  const correspondance = /^bytes=(\d*)-(\d*)$/u.exec(entete.trim());
  if (correspondance === null) return null;
  const debutTexte = correspondance[1];
  const finTexte = correspondance[2];
  let debut;
  let fin;
  if (debutTexte === '') {
    const suffixe = Number(finTexte);
    if (!Number.isInteger(suffixe) || suffixe <= 0) return null;
    debut = Math.max(0, taille - suffixe);
    fin = taille - 1;
  } else {
    debut = Number(debutTexte);
    fin = finTexte === '' ? taille - 1 : Number(finTexte);
  }
  if (!Number.isInteger(debut) || !Number.isInteger(fin) || debut < 0 || debut >= taille || fin < debut) {
    return null;
  }
  return { debut, fin: Math.min(fin, taille - 1) };
}

function servirFichier(requete, reponse, fichier, statut = 200) {
  const taille = statSync(fichier).size;
  const entetes = entetesDe(fichier);
  const plage = requete.headers.range === undefined ? null : plageDemandee(requete.headers.range, taille);
  if (requete.headers.range !== undefined && plage === null) {
    reponse.writeHead(416, { ...entetes, 'Content-Range': `bytes */${String(taille)}` });
    reponse.end();
    return;
  }
  if (plage !== null) {
    reponse.writeHead(206, {
      ...entetes,
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${String(plage.debut)}-${String(plage.fin)}/${String(taille)}`,
      'Content-Length': String(plage.fin - plage.debut + 1)
    });
    if (requete.method === 'HEAD') reponse.end();
    else createReadStream(fichier, { start: plage.debut, end: plage.fin }).pipe(reponse);
    return;
  }
  reponse.writeHead(statut, { ...entetes, 'Accept-Ranges': 'bytes', 'Content-Length': String(taille) });
  if (requete.method === 'HEAD') reponse.end();
  else createReadStream(fichier).pipe(reponse);
}

function repondre(requete, reponse) {
  if (requete.method !== 'GET' && requete.method !== 'HEAD') {
    reponse.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    reponse.end('Methode non autorisee.');
    return;
  }
  const url = new URL(requete.url ?? '/', `http://${requete.headers.host ?? '127.0.0.1'}`);
  if (url.pathname === BASE.slice(0, -1)) {
    reponse.writeHead(308, { Location: BASE });
    reponse.end();
    return;
  }
  if (!url.pathname.startsWith(BASE)) {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    reponse.end(`Cette recette ne sert que ${BASE}`);
    return;
  }

  const fichier = fichierSousDist(url.pathname);
  if (fichier !== null) {
    servirFichier(requete, reponse, fichier);
    return;
  }

  // GitHub Pages rend le 404 personnalise pour une route profonde inexistante, avec le vrai
  // statut 404. Ici 404.html est une copie du build index, donc React lit l URL conservee.
  const page404 = path.join(DIST, '404.html');
  if (existsSync(page404)) servirFichier(requete, reponse, page404, 404);
  else {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    reponse.end('404.html absent : lancer npm run construire:pwa.');
  }
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`PIERRE_PORT_PWA invalide : ${String(process.env['PIERRE_PORT_PWA'])}`);
}
if (!existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('client/dist-pwa est absent : lancer npm run construire:pwa avant la recette.');
}

const serveur = http.createServer(repondre);
serveur.listen(PORT, HOTE, () => {
  console.log('');
  console.log(`  Recette PWA : http://127.0.0.1:${String(PORT)}${BASE}`);
  console.log('  Cette origine locale est acceptee comme contexte securise par Chromium sur ce PC.');
  if (SUR_LAN) {
    console.log('');
    console.warn('  ATTENTION : http://IP_DU_PC sur une tablette n est PAS un contexte securise.');
    console.warn('  Le rendu se teste ainsi, mais Service Worker et OPFS exigent HTTPS sur tablette.');
  }
  console.log('  Arret : Ctrl+C');
  console.log('');
});

serveur.on('error', (cause) => {
  console.error(`[pwa] serveur impossible : ${cause.message}`);
  process.exitCode = 1;
});
