/** Recette du livrable React/SQLite : report, refus multi-onglets et mise à jour par geste. */
/* global document, MutationObserver, caches, innerWidth, innerHeight */
import { horloge } from '@pierre/partage';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { DOSSIER_NAVIGATEURS, RACINE } from '../playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = DOSSIER_NAVIGATEURS;
process.chdir(RACINE);
const { chromium, expect } = await import('@playwright/test');
const { jouerUnExercicePwa } = await import('./jouer-exercice-pwa.mjs');
const BASE = '/LaPierreDesMots/';
const DIST = path.join(RACINE, 'client', 'dist-pwa');
const DOSSIER = path.join(RACINE, 'bac-a-sable', 'recette-mise-a-jour-pwa');
const prenom = 'RecetteMiseAJour';
const modele = readFileSync(path.join(DIST, 'service-worker.js'), 'utf8');
const declaration = /^const VERSION = '([^']+)';$/mu;
const versionBuild = declaration.exec(modele)?.[1];
assert.ok(versionBuild && modele.includes('pierre:activer') && modele.includes('pierre:version'),
  'Construire la PWA avec le protocole de mise à jour avant cette recette.');
const empreinte = (fichier) => createHash('sha256').update(readFileSync(path.join(DIST, fichier))).digest('hex');
const livraison = { version: versionBuild, worker: empreinte('service-worker.js'), index: empreinte('index.html') };
const ancienne = `recette-${versionBuild}-ancienne`;
const nouvelle = `recette-${versionBuild}-nouvelle`;
let versionServie = ancienne;
const nomAdaptateur = readdirSync(path.join(DIST, 'assets')).find((nom) => /^adaptateur-sqlite-wasm-.*\.js$/u.test(nom));
assert.ok(nomAdaptateur, 'Adaptateur SQLite WASM absent du livrable.');
const urlAdaptateur = `${BASE}assets/${nomAdaptateur}`;
mkdirSync(DOSSIER, { recursive: true });
const sortie = mkdtempSync(path.join(DOSSIER, 'execution-'));
const dossierProfil = path.join(sortie, 'profil-chromium');
const enregistrer = (nom, objet) => writeFileSync(path.join(sortie, nom), `${JSON.stringify(objet, null, 2)}\n`, 'utf8');
const TYPES = {
  '.avif': 'image/avif', '.css': 'text/css', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.ogg': 'audio/ogg', '.opus': 'audio/opus',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const serveur = createServer((requete, reponse) => {
  if (!['GET', 'HEAD'].includes(requete.method)) { reponse.writeHead(405).end(); return; }
  let chemin;
  try { chemin = decodeURIComponent(new URL(requete.url, 'http://127.0.0.1').pathname); }
  catch { reponse.writeHead(400).end(); return; }
  if (!chemin.startsWith(BASE)) { reponse.writeHead(404).end(); return; }
  let fichier = path.resolve(DIST, chemin.slice(BASE.length) || 'index.html');
  const relatif = path.relative(DIST, fichier);
  if (relatif === '..' || relatif.startsWith(`..${path.sep}`) || path.isAbsolute(relatif)) {
    reponse.writeHead(403).end(); return;
  }
  let statut = 200;
  if (!existsSync(fichier) || !statSync(fichier).isFile()) {
    if (!requete.headers.accept?.includes('text/html')) { reponse.writeHead(404).end('Ressource absente.'); return; }
    fichier = path.join(DIST, '404.html');
    statut = 404;
  }
  const entetes = { 'Content-Type': TYPES[path.extname(fichier)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (fichier === path.join(DIST, 'service-worker.js')) {
    // Les octets du livrable restent intacts ; seul le nom des caches change dans la réponse HTTP.
    const worker = modele.replace(declaration, `const VERSION = '${versionServie}';`);
    reponse.writeHead(200, entetes).end(requete.method === 'HEAD' ? undefined : worker);
  } else {
    reponse.writeHead(statut, { ...entetes, 'Content-Length': statSync(fichier).size });
    if (requete.method === 'HEAD') reponse.end();
    else createReadStream(fichier).pipe(reponse);
  }
});

async function decrireWorker(page, enAttente = false) {
  return page.evaluate(async (attente) => {
    const inscription = await navigator.serviceWorker.getRegistration();
    const worker = attente ? inscription?.waiting : navigator.serviceWorker.controller;
    if (!worker) throw new Error(attente ? 'Aucun worker en attente.' : 'Aucun contrôleur actif.');
    return new Promise((resoudre, rejeter) => {
      const canal = new MessageChannel();
      const expiration = setTimeout(() => { canal.port1.close(); rejeter(new Error('Le worker ne répond pas.')); }, 10_000);
      canal.port1.onmessage = ({ data }) => { clearTimeout(expiration); canal.port1.close(); resoudre(data); };
      worker.postMessage({ type: 'pierre:version' }, [canal.port2]);
    });
  }, enAttente);
}

async function lireSauvegarde(page) {
  return page.evaluate(async ({ moduleUrl, nom }) => {
    const base = await (await import(moduleUrl)).ouvrirBaseNavigateur();
    const profil = await base.uneLigne('SELECT * FROM profils WHERE prenom = ?', [nom]);
    if (!profil) throw new Error(`Profil absent : ${nom}`);
    const tables = {};
    // Colonnes complètes, tri stable : le journal, les étoiles et les acquis doivent rester exacts.
    for (const [table, ordre] of [
      ['tentatives', 'id'], ['etapes_tentative', 'id'], ['progression_noeud', 'noeud_id'],
      ['progression_region', 'region_code'], ['progression_cascade', 'profil_id'],
      ['formes_gobi', 'grapheme_code'], ['stade_gobi', 'profil_id'], ['compagnons', 'code'],
      ['campement', 'objet_code'], ['maitrise_competence', 'competence'], ['items_leitner', 'item'],
      ['etagere_rang', 'grapheme_code'], ['reprises_lecture', 'generation_progression'],
      ['sessions_projets_maths', 'id'], ['instances_maths', 'id'], ['reprises_maths', 'instance_id'],
      ['actions_maths', 'instance_id, revision_apres'], ['tentatives_maths', 'id'],
      ['progression_maths', 'famille, niveau, projet_id'],
      ['progression_projets_maths', 'projet_id'], ['recompenses_maths', 'projet_id'],
      ['preferences_niveaux_maths', 'famille'],
    ]) tables[table] = await base.lignes(`SELECT * FROM ${table} WHERE profil_id = ? ORDER BY ${ordre}`, [profil.id]);
    return { profil, joueurMemorise: localStorage.getItem('pierre.joueur'), tables };
  }, { moduleUrl: urlAdaptateur, nom: prenom });
}

async function lireObservation(page) {
  return page.evaluate(() => ({
    documents: Number(sessionStorage.getItem('recette-maj.documents')),
    dialogues: JSON.parse(sessionStorage.getItem('recette-maj.dialogues') ?? '[]'),
  }));
}

async function attendreImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((image) => image.getClientRects().length > 0).map((image) => image.decode()));
  });
}

async function demarrerEtInterromprePonts(page) {
  await page.locator('[data-vers="campement"]').click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('lieux-maths')).toBeVisible();
  await page.getByTestId('lieu-ponts').click();
  const preference = page.getByRole('group', { name: 'Niveau de Planches à mesurer' });
  await preference.getByRole('button', { name: 'Explorer' }).click();
  await expect(page.locator('[data-ecran="mathematiques"]')).toHaveAttribute('aria-busy', 'false');
  await expect(preference.getByRole('button', { name: 'Explorer' })).toHaveAttribute('aria-pressed', 'true');
  const preferenceSauvee = await lireSauvegarde(page);
  assert.deepEqual(preferenceSauvee.tables.preferences_niveaux_maths.map(({ famille, niveau, revision }) => ({ famille, niveau, revision })),
    [{ famille: 'MAT-PON-01', niveau: 'exploration', revision: 1 }], 'Le choix Explorer reçoit un ACK durable.');

  const niveaux = page.locator('.maths-projet .maths-niveaux');
  await expect(niveaux).toHaveCount(3);
  for (let rang = 0; rang < 3; rang += 1) {
    const decouverte = niveaux.nth(rang).getByRole('button', { name: 'Découvrir' });
    await decouverte.click();
    await expect(decouverte).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Commencer La première traversée' }).click();
  await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', 'MAT-PON-01');

  let etat = await lireSauvegarde(page);
  const instances = etat.tables.instances_maths.filter((instance) => instance.projet_id === 'MAT-PON-P01');
  assert.equal(instances.length, 3, 'PON-P01 fige ses trois instances au démarrage.');
  const repriseActive = etat.tables.reprises_maths.find((ligne) => ligne.statut === 'active');
  assert.ok(repriseActive, 'La première étape du projet est active.');
  const instanceActive = instances.find((instance) => instance.id === repriseActive.instance_id);
  assert.ok(instanceActive, 'La reprise active appartient au plan PON-P01.');
  assert.equal(instanceActive.projet_etape, 0, 'La reprise active est l’étape 1 du plan.');
  assert.equal(instanceActive.famille, 'MAT-PON-01');
  assert.equal(instanceActive.niveau, 'decouverte', 'Le niveau du projet reste Découverte.');
  const instanceId = instanceActive.id;
  let reprise = repriseActive;
  assert.ok(reprise, 'La première étape active est sauvegardée.');

  const groupeZero = page.getByRole('group', { name: 'Place le zéro de la règle' });
  const choixZero = groupeZero.getByRole('button').first();
  const zero = await choixZero.innerText();
  const revisionAvantZero = reprise.revision;
  await choixZero.click();
  await expect(page.locator('.ponts-mesure-regle')).toHaveAttribute('data-zero-pose', zero);
  await expect.poll(async () => {
    etat = await lireSauvegarde(page);
    reprise = etat.tables.reprises_maths.find((ligne) => ligne.instance_id === instanceId);
    const actions = etat.tables.actions_maths.filter((ligne) => ligne.instance_id === instanceId);
    return { revision: reprise?.revision, action: actions.at(-1)?.type_action, nombreActions: actions.length };
  }).toEqual({ revision: revisionAvantZero + 1, action: 'manipulation', nombreActions: 1 });

  const longueur = page.getByRole('group', { name: 'Quelle longueur lis-tu ?' });
  const revisionZero = reprise.revision;
  await longueur.getByRole('button', { name: 'Ajouter un centimètre' }).click();
  await expect(longueur.locator('output')).toHaveText('1 cm');
  await expect.poll(async () => {
    etat = await lireSauvegarde(page);
    reprise = etat.tables.reprises_maths.find((ligne) => ligne.instance_id === instanceId);
    return { revision: reprise?.revision, actions: etat.tables.actions_maths.filter((ligne) => ligne.instance_id === instanceId).length };
  }).toEqual({ revision: revisionZero + 1, actions: 2 });

  const revisionAvantPause = reprise.revision;
  await page.getByRole('button', { name: 'Mettre la partie en pause' }).click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect.poll(async () => {
    etat = await lireSauvegarde(page);
    reprise = etat.tables.reprises_maths.find((ligne) => ligne.instance_id === instanceId);
    return { revision: reprise?.revision, statut: reprise?.statut,
      action: etat.tables.actions_maths.filter((ligne) => ligne.instance_id === instanceId).at(-1)?.type_action };
  }).toEqual({ revision: revisionAvantPause + 1, statut: 'suspendue', action: 'pause' });
  return { instanceId, niveau: instanceActive.niveau, zero, longueurLue: 1 };
}

async function reprendreEtContinuerPonts(page, instanceId, zero) {
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', 'MAT-PON-01');
  const etat = await lireSauvegarde(page);
  const instance = etat.tables.instances_maths.find((ligne) => ligne.id === instanceId);
  const reprise = etat.tables.reprises_maths.find((ligne) => ligne.instance_id === instanceId);
  assert.ok(instance && reprise, 'La même instance inachevée est rouverte depuis le campement.');
  assert.equal(instance.projet_id, 'MAT-PON-P01');
  assert.equal(instance.projet_etape, 0);
  assert.equal(instance.famille, 'MAT-PON-01');
  assert.equal(instance.niveau, 'decouverte');
  // Ouvrir la scène relit la reprise ; le premier geste acquitté la réactive.
  assert.equal(reprise.statut, 'suspendue');
  await expect(page.locator('.ponts-mesure-regle')).toHaveAttribute('data-zero-pose', zero);
  const longueur = page.getByRole('group', { name: 'Quelle longueur lis-tu ?' });
  await expect(longueur.locator('output')).toHaveText('1 cm');

  await longueur.getByRole('button', { name: 'Ajouter un centimètre' }).click();
  await expect(longueur.locator('output')).toHaveText('2 cm');
  await expect.poll(async () => {
    const apres = await lireSauvegarde(page);
    const repriseApres = apres.tables.reprises_maths.find((ligne) => ligne.instance_id === instanceId);
    const actions = apres.tables.actions_maths.filter((ligne) => ligne.instance_id === instanceId);
    return { revision: repriseApres?.revision, statut: repriseApres?.statut, actions: actions.length,
      derniereAction: actions.at(-1)?.type_action };
  }).toEqual({ revision: reprise.revision + 1, statut: 'active', actions: etat.tables.actions_maths.filter((ligne) => ligne.instance_id === instanceId).length + 1,
    derniereAction: 'manipulation' });
  return { instanceId, revisionAvantReprise: reprise.revision, longueurApresGeste: 2 };
}

let contexte;
let page;
let etape = 'ouverture';
const erreurs = [];
const requetesApi = [];
try {
  await new Promise((resoudre, rejeter) => { serveur.once('error', rejeter); serveur.listen(0, '127.0.0.1', resoudre); });
  const url = `http://127.0.0.1:${serveur.address().port}${BASE}`;
  console.log(`Recette isolée : ${url}\nPreuves : ${sortie}`);
  contexte = await chromium.launchPersistentContext(dossierProfil, {
    headless: true, hasTouch: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'allow',
  });
  contexte.setDefaultTimeout(30_000);
  contexte.on('page', (ouverte) => ouverte.on('pageerror', (erreur) => erreurs.push(erreur.message)));
  contexte.on('request', (requete) => { if (new URL(requete.url()).pathname.includes('/api/')) requetesApi.push(requete.url()); });
  page = contexte.pages()[0] ?? await contexte.newPage();
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));
  // Observation seulement : aucune fonction du jeu ni primitive du navigateur n'est remplacée.
  await page.addInitScript(() => {
    sessionStorage.setItem('recette-maj.documents', String(Number(sessionStorage.getItem('recette-maj.documents') ?? 0) + 1));
    const vus = new WeakSet();
    new MutationObserver(() => {
      const dialogue = document.querySelector('dialog.mise-a-jour-dialogue[open]');
      if (dialogue === null || vus.has(dialogue)) return;
      vus.add(dialogue);
      const preuves = JSON.parse(sessionStorage.getItem('recette-maj.dialogues') ?? '[]');
      preuves.push({ modal: dialogue.matches(':modal'), occupe: dialogue.getAttribute('aria-busy'), texte: dialogue.textContent });
      sessionStorage.setItem('recette-maj.dialogues', JSON.stringify(preuves));
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('On cherche les joueurs…')).toHaveCount(0);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 120_000 });
  assert.equal((await decrireWorker(page)).version, ancienne);

  etape = 'profil et vraie tentative';
  await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
  await page.getByLabel('Ton prénom').fill(prenom);
  await page.getByRole('button', { name: 'C’est parti' }).click();
  const exercice = await jouerUnExercicePwa(page, urlAdaptateur, prenom);
  await page.locator('[data-action="voir-carte"]').click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  const avantLecture = await lireSauvegarde(page);
  assert.ok(avantLecture.tables.tentatives.length > 0, 'La recette doit avoir joué une vraie tentative.');
  assert.ok(avantLecture.tables.progression_noeud.some((noeud) => noeud.etoiles > 0), 'Un acquis réel doit précéder la mise à jour.');
  assert.ok(avantLecture.tables.progression_cascade.some((cascade) => cascade.etoiles_total > 0), 'Une récompense réelle doit précéder la mise à jour.');
  assert.deepEqual(avantLecture.tables.tentatives, exercice.tentatives);
  assert.equal(avantLecture.joueurMemorise, avantLecture.profil.id);
  enregistrer('avant-lecture.json', avantLecture);

  etape = 'projet maths interrompu';
  const partieMaths = await demarrerEtInterromprePonts(page);
  const avant = await lireSauvegarde(page);
  assert.deepEqual(avant.tables.tentatives, avantLecture.tables.tentatives, 'Le jeu de maths conserve la lecture faite.');
  assert.deepEqual(avant.tables.progression_noeud, avantLecture.tables.progression_noeud);
  assert.deepEqual(avant.tables.progression_cascade, avantLecture.tables.progression_cascade);
  assert.deepEqual(avant.tables.reprises_lecture, avantLecture.tables.reprises_lecture);
  assert.equal(avant.tables.instances_maths.length, 3, 'Le plan entier est figé avant sa première étape.');
  assert.equal(avant.tables.actions_maths.filter((action) => action.instance_id === partieMaths.instanceId).length, 3);
  assert.equal(avant.tables.reprises_maths.find((reprise) => reprise.instance_id === partieMaths.instanceId)?.statut, 'suspendue');
  assert.deepEqual(avant.tables.preferences_niveaux_maths.map(({ famille, niveau, revision }) => ({ famille, niveau, revision })),
    [{ famille: 'MAT-PON-01', niveau: 'exploration', revision: 1 }]);
  enregistrer('avant.json', avant);
  await attendreImages(page);
  await page.screenshot({ path: path.join(sortie, 'avant.png'), fullPage: true });

  etape = 'notification et Plus tard';
  versionServie = nouvelle;
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  const notification = page.locator('[data-notification-mise-a-jour]');
  await expect(notification).toBeVisible({ timeout: 120_000 });
  assert.equal((await decrireWorker(page, true)).version, nouvelle);
  for (const [nom, width, height] of [['tablette', 768, 1024], ['telephone', 390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const bouton of await notification.getByRole('button').all()) {
      assert.equal(await bouton.evaluate((element) => {
        const b = element.getBoundingClientRect();
        return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight
          && element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
      }), true, `Le bouton de mise à jour doit recevoir un tap sur ${nom}.`);
    }
    await page.screenshot({ path: path.join(sortie, `notification-${nom}.png`) });
  }
  await notification.getByRole('button', { name: 'Plus tard', exact: true }).tap();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(notification).toHaveCount(0);
  assert.equal((await decrireWorker(page)).version, ancienne);
  assert.deepEqual(await lireSauvegarde(page), avant);
  await page.screenshot({ path: path.join(sortie, 'report.png'), fullPage: true });
  // Le report est en mémoire : un rechargement manuel rend la proposition de nouveau visible.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect(notification).toBeVisible();
  assert.equal((await decrireWorker(page)).version, ancienne);

  etape = 'refus avec un second onglet';
  const seconde = await contexte.newPage();
  await seconde.goto(url, { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => (await decrireWorker(page, true)).fenetres).toBe(2);
  await page.bringToFront();
  const avantRefus = await lireObservation(page);
  await notification.getByRole('button', { name: 'Mettre à jour', exact: true }).tap();
  await expect(notification).toHaveAttribute('data-notification-mise-a-jour', 'erreur');
  await expect(notification).toContainText(/autres onglets/iu);
  assert.equal((await lireObservation(page)).documents, avantRefus.documents, 'Un refus ne recharge pas le jeu.');
  assert.equal((await decrireWorker(page)).version, ancienne);
  assert.deepEqual(await lireSauvegarde(page), avant);
  await page.screenshot({ path: path.join(sortie, 'refus-autre-onglet.png'), fullPage: true });
  await seconde.close();
  await expect.poll(async () => (await decrireWorker(page, true)).fenetres).toBe(1);

  etape = 'mise à jour par clic';
  const avantClic = await lireObservation(page);
  const route = page.url();
  await Promise.all([
    page.waitForEvent('domcontentloaded', { timeout: 60_000 }),
    notification.getByRole('button', { name: 'Mettre à jour', exact: true }).tap(),
  ]);
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  await expect.poll(async () => (await decrireWorker(page)).version).toBe(nouvelle);
  const apresClic = await lireObservation(page);
  assert.equal(apresClic.documents, avantClic.documents + 1);
  assert.equal(apresClic.dialogues.length, avantClic.dialogues.length + 1);
  assert.equal(apresClic.dialogues.at(-1).modal, true, 'Le dialogue doit rendre le jeu inerte par showModal.');
  assert.equal(apresClic.dialogues.at(-1).occupe, 'true');
  assert.equal(page.url(), route);
  await expect.poll(() => lireSauvegarde(page)).toEqual(avant);
  enregistrer('apres.json', await lireSauvegarde(page));
  await attendreImages(page);
  await page.screenshot({ path: path.join(sortie, 'apres.png'), fullPage: true });

  etape = 'reprise hors connexion';
  await contexte.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  assert.equal((await decrireWorker(page)).version, nouvelle);
  assert.deepEqual(await lireSauvegarde(page), avant);
  assert.equal(page.url(), route);
  const cachesApres = await page.evaluate(() => caches.keys());
  assert.ok(cachesApres.includes(`pierre-des-mots-pwa-noyau-${nouvelle}`));
  assert.ok(!cachesApres.includes(`pierre-des-mots-pwa-noyau-${ancienne}`));
  await attendreImages(page);
  await page.screenshot({ path: path.join(sortie, 'hors-connexion.png'), fullPage: true });
  etape = 'reprise réelle du projet après mise à jour';
  const repriseApresMiseAJour = await reprendreEtContinuerPonts(page, partieMaths.instanceId, partieMaths.zero);
  await page.screenshot({ path: path.join(sortie, 'reprise-maths-hors-connexion.png'), fullPage: true });
  assert.deepEqual(erreurs, [], 'Aucune erreur de page.');
  assert.deepEqual(requetesApi, [], 'La PWA ne doit pas appeler un serveur API.');
  assert.equal(empreinte('service-worker.js'), livraison.worker, 'Le livrable doit rester inchangé pendant la recette.');
  assert.equal(empreinte('index.html'), livraison.index);
  const rapport = {
    resultat: 'réussite', termineLe: horloge.maintenant(), livraison, versionsSimulees: { ancienne, nouvelle }, dossierProfil,
    noeudJoue: exercice.noeud, tentatives: avant.tables.tentatives.length,
    reportSansActivation: true, secondOngletRefuseSansRechargement: true,
    modalNatifObserve: apresClic.dialogues.at(-1), rechargementsParClic: 1,
    notificationTabletteEtTelephone: true, boutonsActionnesAuDoigt: true,
    journalProfilAcquisEtRecompensesIdentiques: true, repriseCampementHorsConnexion: true,
    repriseMathsHorsConnexion: true,
    mathsInterrompuEtRepris: partieMaths, repriseApresMiseAJour,
    preferencesNiveauxMaths: avant.tables.preferences_niveaux_maths,
    nombreTablesMaths: 9, nombreTablesMetierComparees: 11, repriseLectureComparee: true,
    limites: 'Même build React et même schéma SQL ; seule VERSION du worker diffère. Aucune migration de schéma ni tablette familiale qualifiée.',
  };
  enregistrer('rapport.json', rapport);
  console.log(JSON.stringify(rapport, null, 2));
} catch (cause) {
  const message = cause instanceof Error ? cause.stack : String(cause);
  const textePage = page && !page.isClosed() ? await page.locator('body').innerText().catch(() => '') : '';
  enregistrer('echec.json', { etape, message, erreurs, requetesApi, textePage });
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(sortie, 'echec.png'), fullPage: true }).catch(() => undefined);
  console.error(`Échec de recette (${etape}) : ${message}\nPreuves : ${sortie}`);
  process.exitCode = 1;
} finally {
  await contexte?.close();
  serveur.closeAllConnections();
  if (serveur.listening) await new Promise((resoudre) => serveur.close(resoudre));
}
