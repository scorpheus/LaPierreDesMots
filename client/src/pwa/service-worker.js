/*
 * Service worker de La Pierre des Mots.
 *
 * Ce fichier est un MODELE. `scripts/preparer-publication-pages.mjs --finaliser` remplace les
 * trois marqueurs puis ecrit `client/dist-pwa/service-worker.js`.
 *
 * Cache hybride, volontairement : le noyau (HTML, JS, WASM, polices, SVG, JSON et voix Opus)
 * est installe avant que ce worker ne devienne actif. Les PNG/WebP/JPEG, environ 187 Mo dans
 * l'etat mesure du depot, sont mis en cache a leur premiere lecture. Ainsi « disponible hors
 * connexion » signifie honnêtement : tout le noyau et tous les ecrans illustres deja visites.
 */
/* global self, caches, __PIERRE_PRECACHE__ */

const VERSION = '__PIERRE_VERSION__';
const BASE = '__PIERRE_BASE__';
const PRECACHE = __PIERRE_PRECACHE__;
const PREFIXE = 'pierre-des-mots-pwa-';
const CACHE_NOYAU = `${PREFIXE}noyau-${VERSION}`;
const CACHE_IMAGES = `${PREFIXE}images-${VERSION}`;
const INDEX = `${BASE}index.html`;
const TAILLE_LOT = 24;

async function mettreEnCacheNoyau() {
  const cache = await caches.open(CACHE_NOYAU);
  try {
    for (let debut = 0; debut < PRECACHE.length; debut += TAILLE_LOT) {
      const lot = PRECACHE.slice(debut, debut + TAILLE_LOT);
      await Promise.all(
        lot.map(async (url) => {
          const requete = new Request(url, { cache: 'reload', credentials: 'same-origin' });
          const reponse = await fetch(requete);
          if (!reponse.ok) {
            throw new Error(`precache ${url} : HTTP ${String(reponse.status)}`);
          }
          await cache.put(requete, reponse);
        })
      );
    }
  } catch (cause) {
    await caches.delete(CACHE_NOYAU);
    throw cause;
  }
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(mettreEnCacheNoyau());
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(
        noms
          .filter(
            (nom) => nom.startsWith(PREFIXE) && nom !== CACHE_NOYAU && nom !== CACHE_IMAGES
          )
          .map((nom) => caches.delete(nom))
      );
      await self.clients.claim();
    })()
  );
});

function estImageLourde(url) {
  return /\.(?:avif|jpe?g|png|webp)$/iu.test(url.pathname);
}

function analyserPlage(entete, taille) {
  const correspondance = /^bytes=(\d*)-(\d*)$/u.exec(entete.trim());
  if (correspondance === null) return null;
  const debutTexte = correspondance[1];
  const finTexte = correspondance[2];
  if (debutTexte === '' && finTexte === '') return null;

  let debut;
  let fin;
  if (debutTexte === '') {
    const suffixe = Number(finTexte);
    if (!Number.isFinite(suffixe) || suffixe <= 0) return null;
    debut = Math.max(0, taille - suffixe);
    fin = taille - 1;
  } else {
    debut = Number(debutTexte);
    fin = finTexte === '' ? taille - 1 : Number(finTexte);
  }
  if (!Number.isInteger(debut) || !Number.isInteger(fin) || debut < 0 || debut >= taille) {
    return null;
  }
  return { debut, fin: Math.min(fin, taille - 1) };
}

async function reponsePartielle(reponse, plageDemandee) {
  const octets = await reponse.arrayBuffer();
  const plage = analyserPlage(plageDemandee, octets.byteLength);
  if (plage === null || plage.fin < plage.debut) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${String(octets.byteLength)}` }
    });
  }
  const corps = octets.slice(plage.debut, plage.fin + 1);
  const entetes = new Headers();
  const type = reponse.headers.get('Content-Type');
  if (type !== null) entetes.set('Content-Type', type);
  entetes.set('Accept-Ranges', 'bytes');
  entetes.set('Content-Length', String(corps.byteLength));
  entetes.set(
    'Content-Range',
    `bytes ${String(plage.debut)}-${String(plage.fin)}/${String(octets.byteLength)}`
  );
  return new Response(corps, { status: 206, headers: entetes });
}

async function lirePuisMettreEnCache(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const presente = await cache.match(requete, { ignoreVary: true });
  if (presente !== undefined) return presente;
  const reponse = await fetch(requete);
  if (reponse.ok) await cache.put(requete, reponse.clone());
  return reponse;
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  evenement.respondWith(
    (async () => {
      if (requete.mode === 'navigate') {
        const index = await caches.match(INDEX, { ignoreSearch: true });
        return index ?? fetch(requete);
      }

      const plage = requete.headers.get('Range');
      if (plage !== null) {
        const sansPlage = new Request(requete.url, { credentials: 'same-origin' });
        const complete =
          (await caches.match(sansPlage, { ignoreVary: true })) ?? (await fetch(sansPlage));
        return reponsePartielle(complete, plage);
      }

      if (estImageLourde(url)) {
        return lirePuisMettreEnCache(requete, CACHE_IMAGES);
      }

      const noyau = await caches.match(requete, { ignoreVary: true });
      return noyau ?? fetch(requete);
    })()
  );
});
