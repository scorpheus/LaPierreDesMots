// Ces noms ne sont employés que dans les fonctions exécutées par le navigateur.
/* global document, AudioContext, Audio */
import { DOSSIER_NAVIGATEURS, RACINE } from '../playwright.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// Le navigateur reste dans le dépôt, y compris pour cette recette hors harnais LAN.
process.env.PLAYWRIGHT_BROWSERS_PATH = DOSSIER_NAVIGATEURS;
const { chromium, expect } = await import('@playwright/test');
const { jouerUnExercicePwa, jouerExerciceEnCoursPwa, lireProgressionPwa } = await import('./jouer-exercice-pwa.mjs');
const racine = RACINE;
process.chdir(racine);
const nomProfil = process.env.PIERRE_PWA_PROFIL ?? 'profil-recette-pwa-opfs';
if (!/^profil-recette-[a-z0-9-]+$/u.test(nomProfil)) throw new Error('La recette exige un profil isolé sous bac-a-sable/profil-recette-*.');
const dossierProfil = path.join(
  racine,
  'bac-a-sable',
  nomProfil
);
const url = process.env.PIERRE_PWA_URL ?? 'http://127.0.0.1:4175/LaPierreDesMots/';
let prenom = process.env.PIERRE_PWA_JOUEUR;
const scriptCourant = readFileSync(path.join(racine, 'client/dist-pwa/index.html'), 'utf8').match(/src="([^"]+index-[^"]+\.js)"/)[1];
const nomAdaptateur = readdirSync(path.join(racine, 'client', 'dist-pwa', 'assets')).find((nom) =>
  nom.startsWith('adaptateur-sqlite-wasm-')
);
const urlAdaptateur = `/LaPierreDesMots/assets/${nomAdaptateur}`;

function exiger(condition, message) {
  if (!condition) throw new Error(message);
}

async function ouvrirContexte() {
  const contexte = await chromium.launchPersistentContext(dossierProfil, {
    headless: true,
    hasTouch: true,
    reducedMotion: 'reduce',
    serviceWorkers: 'allow'
  });
  await contexte.addInitScript(() => localStorage.removeItem('pierre.joueur'));
  for (const ancienne of contexte.pages().slice(1)) await ancienne.close();
  return contexte;
}

const erreurs = [];
const requetesApi = [];
let contexte = await ouvrirContexte();
let page = contexte.pages()[0] ?? (await contexte.newPage());
page.on('pageerror', (erreur) => erreurs.push(erreur.message));
page.on('request', (requete) => {
  if (new URL(requete.url()).pathname.includes('/api/')) requetesApi.push(requete.url());
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.locator('[data-ecran="profils"]').waitFor({ timeout: 30_000 });
await page.getByText('On cherche les joueurs…').waitFor({ state: 'detached', timeout: 30_000 });

// Mise à jour réelle : ne pas effacer OPFS ni ses caches pour faire disparaître l'ancien build.
const journalAvantMaj = await page.evaluate(async (moduleUrl) => {
  const base = await (await import(moduleUrl)).ouvrirBaseNavigateur();
  return base.lignes('SELECT * FROM tentatives ORDER BY id');
}, urlAdaptateur);
await page.evaluate(async () => {
  const inscription = await navigator.serviceWorker.ready;
  await inscription.update();
});
await expect.poll(() => page.evaluate(async () => {
  const inscription = await navigator.serviceWorker.ready;
  return inscription.installing === null;
}), { timeout: 30_000 }).toBe(true);
// Pas de skipWaiting forcé en jeu : la nouvelle version attend la fermeture de l'ancienne.
await contexte.close();
contexte = await ouvrirContexte();
page = contexte.pages()[0] ?? (await contexte.newPage());
page.on('pageerror', (erreur) => erreurs.push(erreur.message));
page.on('request', (requete) => {
  if (new URL(requete.url()).pathname.includes('/api/')) requetesApi.push(requete.url());
});
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.locator('[data-ecran="profils"]').waitFor({ timeout: 30_000 });
await page.getByText('On cherche les joueurs…').waitFor({ state: 'detached', timeout: 30_000 });
await expect(page.locator(`script[src="${scriptCourant}"]`)).toHaveCount(1);
const journalApresMaj = await page.evaluate(async (moduleUrl) => {
  const base = await (await import(moduleUrl)).ouvrirBaseNavigateur();
  return base.lignes('SELECT * FROM tentatives ORDER BY id');
}, urlAdaptateur);
expect(journalApresMaj, 'le remplacement du build conserve toutes les tentatives existantes').toEqual(journalAvantMaj);

if (prenom === undefined) {
  const nombre = await page.evaluate(async (moduleUrl) => {
    const base = await (await import(moduleUrl)).ouvrirBaseNavigateur();
    return Number((await base.uneLigne("SELECT COUNT(*) AS n FROM profils WHERE prenom LIKE 'RecettePwa%'"))?.n ?? 0);
  }, urlAdaptateur);
  prenom = `RecettePwa${nombre + 1}`;
}
const profil = page.getByRole('button', { name: `Jouer avec le profil de ${prenom}` });
let cree = false;
if ((await profil.count()) === 0) {
  await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
  await page.getByLabel('Ton prénom').fill(prenom);
  await page.getByRole('button', { name: 'C’est parti' }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-ecran]')?.getAttribute('data-ecran') !== 'profils' ||
      document.body.textContent?.includes('n’a pas pu enregistrer'),
    undefined,
    { timeout: 30_000 }
  );
  exiger(
    !(await page.locator('body').innerText()).includes('n’a pas pu enregistrer'),
    `La création du profil a échoué : ${(await page.locator('body').innerText()).slice(-500)}`
  );
  cree = true;
}
exiger(cree || (await profil.count()) === 1, 'Le profil de recette n’existe pas.');

if (!cree) await profil.click();
let exerciceJoue = await jouerUnExercicePwa(page, urlAdaptateur, prenom);
const inscription = await page.evaluate(async () => {
  const prete = await navigator.serviceWorker.ready;
  return { portee: prete.scope, controlee: navigator.serviceWorker.controller !== null };
});
exiger(inscription.portee.endsWith('/LaPierreDesMots/'), 'La portée du service worker est fausse.');

// Le même exercice déjà consulté doit se rejouer sans réseau, images et son compris.
const clip = readdirSync(path.join(racine, 'client/dist-pwa/assets')).find((nom) => nom.endsWith('.opus'));
await contexte.setOffline(true);
await page.getByRole('button', { name: 'Encore une fois', exact: true }).tap();
const exerciceHorsConnexion = await jouerExerciceEnCoursPwa(page, urlAdaptateur, prenom);
exiger(exerciceHorsConnexion.noeud === exerciceJoue.noeud, 'La recette hors connexion a changé d’exercice.');
exerciceJoue = exerciceHorsConnexion;
const secondesAudio = await page.evaluate(async (urlClip) => {
  const reponse = await fetch(urlClip);
  if (!reponse.ok) throw new Error(`Clip absent hors connexion : ${reponse.status}`);
  const contexteAudio = new AudioContext();
  try {
    const son = await contexteAudio.decodeAudioData(await reponse.arrayBuffer());
    const lecteur = new Audio(urlClip);
    const fin = new Promise((resolve, reject) => {
      lecteur.onended = resolve;
      lecteur.onerror = () => reject(new Error('La lecture Opus a échoué hors connexion.'));
    });
    await lecteur.play();
    await fin;
    return son.duration;
  } finally { await contexteAudio.close(); }
}, `/LaPierreDesMots/assets/${clip}`);
exiger(secondesAudio > 0, 'Le clip hors connexion est vide.');
await contexte.setOffline(false);

// Une deuxième page ne doit jamais ouvrir une base concurrente ni obtenir un repli mémoire.
const seconde = await contexte.newPage();
await seconde.goto(url, { waitUntil: 'domcontentloaded' });
const codeSecondOnglet = await seconde.evaluate(async (moduleUrl) => {
  try {
    const module = await import(moduleUrl);
    await module.ouvrirBaseNavigateur();
    return 'ouverte-a-tort';
  } catch (cause) {
    return typeof cause === 'object' && cause !== null && 'code' in cause
      ? String(cause.code)
      : String(cause);
  }
}, urlAdaptateur);
exiger(
  codeSecondOnglet === 'base-deja-ouverte',
  `Le second onglet n’est pas refusé proprement : ${codeSecondOnglet}`
);
await seconde.close();

await contexte.close();

// Même profil Chromium, nouvelle connexion SQLite : le profil doit survivre à la fermeture.
contexte = await ouvrirContexte();
page = contexte.pages()[0] ?? (await contexte.newPage());
page.on('pageerror', (erreur) => erreurs.push(erreur.message));
page.on('request', (requete) => {
  if (new URL(requete.url()).pathname.includes('/api/')) requetesApi.push(requete.url());
});
await page.goto(url, { waitUntil: 'domcontentloaded' });
const compterProfils = () =>
  page.evaluate(async ({ moduleUrl, nom }) => {
    const module = await import(moduleUrl);
    const base = await module.ouvrirBaseNavigateur();
    const ligne = await base.uneLigne('SELECT COUNT(*) AS n FROM profils WHERE prenom = ?', [nom]);
    return Number(ligne?.n ?? 0);
  }, { moduleUrl: urlAdaptateur, nom: prenom });
exiger((await compterProfils()) === 1, 'Le profil n’a pas survécu à la fermeture du navigateur.');

const progressionRelue = await lireProgressionPwa(page, urlAdaptateur, prenom);
exiger(JSON.stringify(progressionRelue.tentatives) === JSON.stringify(exerciceJoue.tentatives), 'Le journal de jeu a changé après fermeture.');
exiger(JSON.stringify(progressionRelue.progression) === JSON.stringify(exerciceJoue.progression), 'La progression a changé après fermeture.');

// L'export/import s'effectue dans le Worker propriétaire de la connexion. On ajoute un profil
// témoin après l'export pour prouver que la restauration remet réellement l'état antérieur, puis
// on tente un faux fichier afin de vérifier que le refus ne touche pas la base restaurée.
const recetteSauvegarde = await page.evaluate(async ({ moduleUrl, nom }) => {
  const module = await import(moduleUrl);
  const base = await module.ouvrirBaseNavigateur();
  const sauvegarde = await base.exporter();
  const idTemoin = 'recette-import-temporaire';
  await base.lancer(
    `INSERT OR REPLACE INTO profils
      (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idTemoin, 'TemoinImportPwa', '{}', 'defaut', '2026-09-04T00:00:00.000Z', '2026-09-04T00:00:00.000Z']
  );
  const apresAjout = Number(
    (await base.uneLigne('SELECT COUNT(*) AS n FROM profils WHERE id = ?', [idTemoin]))?.n ?? 0
  );
  const importee = await base.importer(sauvegarde);
  const apresImport = Number(
    (await base.uneLigne('SELECT COUNT(*) AS n FROM profils WHERE id = ?', [idTemoin]))?.n ?? 0
  );
  let codeRefus = 'aucun-refus';
  try {
    await base.importer(new TextEncoder().encode('pas une base SQLite'));
  } catch (cause) {
    codeRefus =
      typeof cause === 'object' && cause !== null && 'code' in cause
        ? String(cause.code)
        : String(cause);
  }
  const apresRefus = Number(
    (await base.uneLigne('SELECT COUNT(*) AS n FROM profils WHERE prenom = ?', [nom]))?.n ?? 0
  );
  await base.fermer();
  const etatVerrous = await navigator.locks.query();
  return {
    octets: importee.octets,
    apresAjout,
    apresImport,
    codeRefus,
    apresRefus,
    verrousRestants: [...etatVerrous.held, ...etatVerrous.pending]
      .map((verrou) => verrou.name)
      .filter((nomVerrou) => nomVerrou !== null)
  };
}, { moduleUrl: urlAdaptateur, nom: prenom });
exiger(recetteSauvegarde.octets > 0, 'L’export SQLite est vide.');
exiger(recetteSauvegarde.apresAjout === 1, 'Le témoin d’import n’a pas été créé.');
exiger(recetteSauvegarde.apresImport === 0, 'L’import n’a pas restauré l’état antérieur.');
exiger(
  recetteSauvegarde.codeRefus === 'sauvegarde-invalide',
  `Le faux fichier n’est pas refusé proprement : ${recetteSauvegarde.codeRefus}`
);
exiger(recetteSauvegarde.apresRefus === 1, 'Un import invalide a altéré la base courante.');
exiger(
  recetteSauvegarde.verrousRestants.length === 0,
  `Le verrou SQLite est resté détenu après fermeture : ${recetteSauvegarde.verrousRestants.join(', ')}`
);

// Le noyau, SQLite WASM compris, doit redémarrer hors connexion.
await contexte.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('[data-ecran="profils"]').waitFor({ timeout: 30_000 });
await page.getByText('On cherche les joueurs…').waitFor({ state: 'detached', timeout: 30_000 });
exiger(
  (await page.getByRole('button', { name: `Jouer avec le profil de ${prenom}` }).count()) === 1,
  'Le profil n’est plus visible hors connexion.'
);
const controleeHorsConnexion = await page.evaluate(() => navigator.serviceWorker.controller !== null);
exiger(controleeHorsConnexion, 'Le rechargement hors connexion a échappé au service worker.');

exiger(requetesApi.length === 0, `Requêtes /api émises en PWA : ${requetesApi.join(', ')}`);
exiger(erreurs.length === 0, `Erreurs de page : ${erreurs.join(' | ')}`);

const resultat = {
  scriptCourant,
  exerciceRejoueHorsConnexion: exerciceHorsConnexion.noeud,
  secondesAudioLuesHorsConnexion: secondesAudio,
  tentativesPreserveesPendantMiseAJour: journalAvantMaj.length,
  exerciceJoueAuDoigt: exerciceJoue.noeud,
  tentativesPersistantes: exerciceJoue.tentatives.length,
  progressionIdentiqueApresFermeture: true,
  profilReluApresReouverture: true,
  rechargementHorsConnexion: true,
  secondOngletRefuse: true,
  serviceWorker: inscription,
  controleeHorsConnexion,
  sauvegardeRestauree: recetteSauvegarde.apresImport === 0,
  importInvalideAtomique: recetteSauvegarde.apresRefus === 1,
  requetesApi: requetesApi.length,
  erreursPage: erreurs.length
};
await contexte.close();

// Une origine neuve passe réellement par le 404 de Pages, puis restaure l'URL avant React.
const navigateur = await chromium.launch({ headless: true });
const contexteRoute = await navigateur.newContext({ serviceWorkers: 'block' });
const pageRoute = await contexteRoute.newPage();
const erreursRoute = [];
pageRoute.on('pageerror', (erreur) => erreursRoute.push(erreur.message));
await pageRoute.goto(url, { waitUntil: 'domcontentloaded' });
await pageRoute.locator('[data-ecran="profils"]').waitFor({ timeout: 30_000 });
await pageRoute.getByText('On cherche les joueurs…').waitFor({ state: 'detached', timeout: 30_000 });
await pageRoute.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
await pageRoute.getByLabel('Ton prénom').fill('RoutePwa');
await pageRoute.getByRole('button', { name: 'C’est parti' }).click();
await pageRoute.locator('[data-ecran]:not([data-ecran="profils"])').waitFor({ timeout: 30_000 });
const routeProfonde = `${url}carte?recette=pwa#retour`;
await pageRoute.goto(routeProfonde, { waitUntil: 'domcontentloaded' });
await pageRoute.locator('[data-ecran="carte"]').waitFor({ timeout: 30_000 });
exiger(pageRoute.url() === routeProfonde, `La route profonde a dérivé vers ${pageRoute.url()}.`);
await pageRoute.reload({ waitUntil: 'domcontentloaded' });
await pageRoute.locator('[data-ecran="carte"]').waitFor({ timeout: 30_000 });
exiger(pageRoute.url() === routeProfonde, 'Le rafraîchissement a perdu la route profonde.');
exiger(erreursRoute.length === 0, `Erreurs sur route profonde : ${erreursRoute.join(' | ')}`);
await contexteRoute.close();
await navigateur.close();

console.log(JSON.stringify({ ...resultat, routeProfondeEtRafraichissement: true }, null, 2));
