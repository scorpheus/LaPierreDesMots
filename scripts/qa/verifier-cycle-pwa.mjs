/** Recette Chromium du vrai service worker : migration de cache, incident réseau et OPFS. */
/* global self, caches */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { DOSSIER_NAVIGATEURS } from '../playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = DOSSIER_NAVIGATEURS;
const { chromium, expect } = await import('@playwright/test');

const BASE = '/LaPierreDesMots/';
const modele = readFileSync(new URL('../../client/src/pwa/service-worker.js', import.meta.url), 'utf8');
let version = 'ancienne';
let pannesRestantes = 0;
const requetes = [];
const erreursPage = [];

const serveur = createServer((requete, reponse) => {
  const chemin = new URL(requete.url, 'http://localhost').pathname;
  requetes.push({ version, chemin });
  reponse.setHeader('Cache-Control', 'no-store');
  if (chemin === `${BASE}service-worker.js`) {
    const ressources = [`${BASE}index.html`, `${BASE}version.txt`];
    reponse.setHeader('Content-Type', 'text/javascript');
    reponse.end(modele.replace('__PIERRE_VERSION__', version)
      .replace('__PIERRE_BASE__', BASE)
      .replace('globalThis.__PIERRE_PRECACHE__', JSON.stringify(ressources)));
  } else if (chemin === `${BASE}version.txt`) {
    if (pannesRestantes > 0) {
      pannesRestantes -= 1;
      reponse.writeHead(503).end('Incident transitoire de recette');
    } else reponse.end(version);
  } else if (chemin === BASE || chemin === `${BASE}index.html`) {
    reponse.setHeader('Content-Type', 'text/html; charset=utf-8');
    reponse.end(`<!doctype html><html lang="fr"><title>Recette PWA</title><body>
      <h1>${version}</h1><script>navigator.serviceWorker.register('${BASE}service-worker.js',
      {scope:'${BASE}', updateViaCache:'none'}).catch(console.error);</script></body></html>`);
  } else reponse.writeHead(404).end('Absente');
});

await new Promise((resoudre, rejeter) => {
  serveur.once('error', rejeter);
  serveur.listen(0, '127.0.0.1', resoudre);
});
let navigateur;
try {
  const origine = `http://127.0.0.1:${serveur.address().port}`;
  navigateur = await chromium.launch({ headless: true });
  const contexte = await navigateur.newContext({ serviceWorkers: 'allow' });
  let page = await contexte.newPage();
  page.on('pageerror', (erreur) => erreursPage.push(erreur.message));
  await page.goto(`${origine}${BASE}`);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  // Écritures dans cette origine de recette neuve uniquement, jamais dans une base familiale.
  await page.evaluate(async () => {
    localStorage.setItem('progression-recette', 'trois exercices acquis');
    const racine = await navigator.storage.getDirectory();
    const fichier = await racine.getFileHandle('journal-recette.txt', { create: true });
    const ecriture = await fichier.createWritable();
    await ecriture.write('tentative-1\ntentative-2\ntentative-3');
    await ecriture.close();
    const autre = await caches.open('autre-application');
    await autre.put('/autre', new Response('conserver'));
  });

  version = 'nouvelle';
  pannesRestantes = 1;
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  // waitForFunction teste la promesse elle-même dans la version locale de Playwright.
  // expect.poll attend chaque lecture asynchrone et vérifie l’état effectivement installé.
  await expect.poll(() => page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe('installed');
  await expect(page.locator('h1')).toHaveText('ancienne');
  const activeAvantFermeture = await page.evaluate(async () => (await fetch('version.txt')).text());
  assert.equal(activeAvantFermeture, 'ancienne', 'La version active ne doit pas lire celle en cours d’installation.');
  assert.equal(pannesRestantes, 0, 'Le scénario doit avoir réellement injecté le 503.');
  assert.equal(requetes.filter((r) => r.version === 'nouvelle' && r.chemin.endsWith('version.txt')).length, 2,
    'La ressource échouée doit être retéléchargée une seule fois.');

  // Laisser le nouveau worker s’activer naturellement, sans skipWaiting et sans purger le stockage.
  await page.close();
  const attenteActivation = async () => {
    for (const worker of contexte.serviceWorkers()) {
      try {
        if (await worker.evaluate(() => self.registration.active?.state === 'activated'
          && self.registration.waiting === null
          && self.registration.installing === null)) return true;
      } catch { /* L’ancien worker peut terminer entre l’inventaire et la lecture. */ }
    }
    return false;
  };
  await expect.poll(attenteActivation).toBe(true);
  page = await contexte.newPage();
  page.on('pageerror', (erreur) => erreursPage.push(erreur.message));
  await page.goto(`${origine}${BASE}campement?reprise=oui#carte`);
  await expect(page.locator('h1')).toHaveText('nouvelle');
  await contexte.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('nouvelle');
  const apres = await page.evaluate(async () => {
    const racine = await navigator.storage.getDirectory();
    const fichier = await racine.getFileHandle('journal-recette.txt');
    return {
      progression: localStorage.getItem('progression-recette'),
      journal: await (await fichier.getFile()).text(),
      version: await (await fetch('/LaPierreDesMots/version.txt')).text(),
      caches: await caches.keys(),
      autre: await (await (await caches.open('autre-application')).match('/autre')).text(),
    };
  });
  assert.equal(apres.progression, 'trois exercices acquis');
  assert.equal(apres.journal, 'tentative-1\ntentative-2\ntentative-3');
  assert.equal(apres.version, 'nouvelle');
  assert.equal(apres.autre, 'conserver');
  assert.ok(!apres.caches.includes('pierre-des-mots-pwa-noyau-ancienne'));
  assert.ok(apres.caches.includes('pierre-des-mots-pwa-noyau-nouvelle'));
  assert.deepEqual(erreursPage, []);
  console.log(JSON.stringify({ migration: 'réussite', incident503Repris: true,
    ancienneVersionStablePendantInstallation: true, rechargementHorsConnexion: true,
    localStorageEtOpfsConserves: true, autreApplicationConservee: true }, null, 2));
  await contexte.close();
} finally {
  await navigateur?.close();
  serveur.closeAllConnections();
  await new Promise((resoudre) => serveur.close(resoudre));
}
