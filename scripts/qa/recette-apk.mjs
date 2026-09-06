// Recette sur un émulateur isolé déjà lancé et l'APK courant déjà installé.
// Ne jamais la pointer vers la tablette de l'enfant : elle crée un joueur QA et relance l'app.
/* global window, document */
import { _android, expect } from '@playwright/test';
import { mkdirSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { jouerUnExercicePwa } from './jouer-exercice-pwa.mjs';
const appareil = (await _android.devices({ omitDriverInstall: true })).find((appareil) => appareil.serial() === 'emulator-5554');
if (!appareil) throw new Error('Émulateur de recette absent.');
if ((await appareil.shell('getprop ro.kernel.qemu')).toString().trim() !== '1') {
  throw new Error('La recette est réservée à un émulateur, jamais à un appareil de la famille.');
}
const prenom = `RecetteAndroid${randomUUID().slice(0, 8)}`;
mkdirSync('bac-a-sable/qa-finition-2026-09-05', { recursive: true });
const ouvrir = async () => (await appareil.webView({ pkg: 'com.lapierredesmots.app' })).page();
let page = await ouvrir();
const modulePort = '/assets/' + readdirSync('client/dist-autonome/assets').find(nom => nom.startsWith('port-local-') && nom.endsWith('.js'));
const erreurs = [], reseau = [];
function observer(page) {
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('request', r => { if ((!r.url().startsWith('https://localhost/') && !r.url().startsWith('data:')) || r.url().includes('/api/')) reseau.push(r.url()); });
}
observer(page);
await page.evaluate(() => localStorage.removeItem('pierre.joueur'));
await page.goto('https://localhost/');
await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
await page.getByText('On cherche les joueurs…').waitFor({ state: 'detached' });
const session = await page.context().newCDPSession(page);
async function toucherPoint(point) {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function toucher(prise) {
  await prise.scrollIntoViewIfNeeded();
  const point = await prise.evaluate(element => {
    const b = element.getBoundingClientRect();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (!element.contains(document.elementFromPoint(x, y))) throw new Error('Prise Android masquée.');
    return { x, y };
  });
  await toucherPoint(point);
}
async function lireProgression(page, _module, prenom) {
  return page.evaluate(async ({ prenom, modulePort }) => {
    const port = (await import(modulePort)).portLocal;
    const profil = (await port.listerProfils()).find(profil => profil.prenom === prenom);
    // Le plugin brut peut lire sa transaction encore ouverte. La lecture publique attend
    // le verrou de l'adaptateur et donc le COMMIT, avant le contrôle de persistance.
    await port.lireProgression(profil.id);
    const query = async (statement, values = []) => (await window.Capacitor.Plugins.CapacitorSQLite.query({ database: 'pierre', statement, values, readonly: false })).values;
    return {
      tentatives: await query('SELECT * FROM tentatives WHERE profil_id = ? ORDER BY id', [profil.id]),
      progression: await query('SELECT * FROM progression_region WHERE profil_id = ? ORDER BY region_code', [profil.id]),
    };
  }, { prenom, modulePort });
}
// Un joueur neuf conserve un exercice de démarrage pris en charge par ce pilote borné.
// Les joueurs des recettes précédentes restent dans SQLite, sans réinitialisation.
await toucher(page.getByRole('button', { name: 'Créer un nouveau joueur' }));
await page.getByLabel('Ton prénom').fill(prenom);
await toucher(page.getByRole('button', { name: 'C’est parti' }));
const resultat = await jouerUnExercicePwa(page, null, prenom, { lireProgression, toucher, toucherPoint });
await page.screenshot({ path: 'bac-a-sable/qa-finition-2026-09-05/apk-recompense.png' });
await appareil.shell('am force-stop com.lapierredesmots.app');
await expect.poll(() => page.isClosed()).toBe(true);
await appareil.shell('am start -n com.lapierredesmots.app/.MainActivity');
page = await ouvrir();
observer(page);
await expect(page.locator('[data-ecran]')).toBeVisible();
await expect.poll(() => lireProgression(page, null, prenom)).toEqual({ tentatives: resultat.tentatives, progression: resultat.progression });
expect(erreurs).toEqual([]);
expect(reseau).toEqual([]);
console.log(JSON.stringify({ noeud: resultat.noeud, tentatives: resultat.tentatives.length, progressionApresRelance: true, erreurs, reseau }, null, 2));
await appareil.close();
