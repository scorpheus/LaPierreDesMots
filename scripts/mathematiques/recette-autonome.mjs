/** Recette du vrai livrable PWA, pilotée par les boutons enfant et l'export parent.
 * Préparer séparément `npm run construire:pwa` et `npm run servir:pwa` avant ce script.
 * Aucune réponse, tentative ou donnée SQLite n'est injectée dans le navigateur.
 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DOSSIER_NAVIGATEURS, RACINE } from '../playwright.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = DOSSIER_NAVIGATEURS;
const { chromium, expect } = await import('@playwright/test');

const url = 'http://127.0.0.1:4175/LaPierreDesMots/';
const profilNavigateur = path.join(RACINE, 'bac-a-sable', 'profil-recette-vallee-opfs');
const profilTransfert = path.join(RACINE, 'bac-a-sable', 'profil-recette-vallee-transfert-opfs');
const execution = randomUUID().slice(0, 8);
const dossier = path.join(RACINE, 'bac-a-sable', 'vallee-autonome', `execution-${execution}`);
const prenom = `RecetteVallee${execution}`;
const codeParent = '4271';
const rapport = { execution, url, prenom, profilsChromium: [profilNavigateur, profilTransfert],
  etapes: [], erreursPage: [], requetesApi: [],
  statut: 'en_cours', oracle: 'Dimensions, nombres et stock visibles dans le DOM ; aucun témoin métier appelé.',
  limites: ['Lecture reprise sur son nœud, sans terminer cet exercice ni créer de tentative de lecture.',
    'Le hors-ligne vérifie les ressources consultées, dont le décor des Ponts ; les autres illustrations ne sont pas garanties.'] };
mkdirSync(dossier, { recursive: true });

function exiger(condition, message) {
  if (!condition) throw new Error(message);
}

function noter(nom, details = {}) {
  rapport.etapes.push({ nom, ...details });
  writeFileSync(path.join(dossier, 'rapport.json'), JSON.stringify(rapport, null, 2));
}

async function capture(page, nom) {
  await page.screenshot({ path: path.join(dossier, `${nom}.png`), fullPage: true, scale: 'css' });
}

async function attendreEcran(page, ecran) {
  await expect(page.locator(`[data-ecran="${ecran}"]`)).toBeVisible({ timeout: 30_000 });
}

async function attendreRepos(page) {
  await expect(page.locator('[data-ecran="mathematiques"]')).toHaveAttribute('aria-busy', 'false');
}

async function ouvrirCampement(page) {
  await page.locator('[data-ecran="ouverture"], [data-ecran="campement"], [data-ecran="noeud"], [data-ecran="mathematiques"]').first().waitFor({ timeout: 30_000 });
  if (await page.locator('[data-ecran="ouverture"]').count()) {
    await page.locator('[data-passer="ouverture"]').click();
  }
  if (await page.locator('[data-ecran="noeud"]').count()) {
    await page.locator('[data-ecran="noeud"] [data-vers="carte"]').click();
    await attendreEcran(page, 'carte');
    await page.locator('[data-vers="campement"]').click();
  }
  if (await page.locator('[data-ecran="mathematiques"]').count()) {
    await page.getByRole('button', { name: /^(Mettre la partie en pause|Retour)$/ }).click();
  }
  await attendreEcran(page, 'campement');
}

async function creerProfilParInterface(page) {
  await allerAuxProfils(page);
  await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
  await page.getByLabel('Ton prénom').fill(prenom);
  await page.getByRole('button', { name: 'C’est parti' }).click();
  await ouvrirCampement(page);
  noter('profil_cree_par_ui');
}

async function preparerRelecture(page) {
  await page.locator('[data-vers="carte"]').click();
  await attendreEcran(page, 'carte');
  await page.locator('[data-depart="clairiere"]').click();
  await expect(page.locator('[data-vue-region="clairiere"]')).toBeVisible();
  await page.locator('[data-vue-region="clairiere"] [data-depart="clairiere"]').click();
  await page.locator('[data-confirmer-depart]').click();
  await expect(page.locator('[data-ecran="noeud"] [data-moteur]')).toBeVisible();
  const noeud = await page.locator('[data-ecran="noeud"]').getAttribute('data-noeud');
  exiger(noeud && noeud !== 'indisponible', 'Le nœud de lecture ne s’est pas ouvert.');
  await capture(page, '01-lecture-consultee');
  await page.locator('[data-ecran="noeud"] [data-vers="carte"]').click();
  await attendreEcran(page, 'carte');
  await page.locator('[data-vers="campement"]').click();
  await attendreEcran(page, 'campement');
  await expect(page.locator('[data-vers="reprise-lecture"]')).toBeVisible();
  // Une ouverture neuve après ce retour vérifie aussi que la reprise lecture ne tient pas
  // seulement dans l'état React de la page précédente.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await attendreEcran(page, 'campement');
  await expect(page.locator('[data-vers="reprise-lecture"]')).toBeVisible();
  noter('reprise_lecture_preparee', { noeud });
  return noeud;
}

async function ouvrirPonts(page) {
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('lieux-maths')).toBeVisible();
  await page.getByTestId('lieu-ponts').click();
  await expect(page.getByTestId('lieu-ponts')).toBeVisible();
}

async function scene(page, famille) {
  await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', famille);
  await attendreRepos(page);
}

/** Un centimètre est la largeur d'une graduation effectivement dessinée. */
async function mesureVisible(page) {
  return page.locator('[data-atelier="regle"]').evaluate((atelier) => {
    const planche = atelier.querySelector('[data-planche-a-mesurer]');
    const depart = atelier.querySelector('.ponts-mesure-depart');
    const graduation = atelier.querySelector('.ponts-mesure-graduation');
    if (!planche || !depart || !graduation) throw new Error('La planche et la règle ne sont pas visibles ensemble.');
    const unite = Number.parseFloat(graduation.style.width);
    const longueur = Number.parseFloat(planche.style.width) / unite;
    const origine = Number.parseFloat(depart.style.left) / unite;
    if (!Number.isInteger(longueur) || !Number.isInteger(origine)) throw new Error('La mesure du DOM n’est pas entière.');
    return { longueur, origine };
  });
}

async function empreinteSceneMesure(page) {
  return {
    consigne: await page.locator('.scene-ponts__consigne').innerText(),
    planches: await page.locator('.ponts-stock button').allTextContents(),
    zero: await page.locator('.ponts-mesure-regle').getAttribute('data-zero-pose'),
    lecture: await page.locator('.ponts-compteur output').innerText(),
    aide: await page.getByTestId('aide-maths').getAttribute('data-aide-proposee'),
  };
}

async function verifierDecorHorsLigne(page) {
  const image = await page.locator('[data-decor-maths="ponts"]').evaluate(async (decor) => {
    const fond = globalThis.getComputedStyle(decor).backgroundImage;
    const adresse = /^url\(["']?(.*?)["']?\)$/.exec(fond)?.[1];
    if (!adresse) throw new Error('Le décor des Ponts n’a pas d’image effective.');
    const reponse = await fetch(adresse);
    if (!reponse.ok) throw new Error(`Le décor consulté manque hors ligne : ${reponse.status}.`);
    const bitmap = await globalThis.createImageBitmap(await reponse.blob());
    const dimensions = { largeur: bitmap.width, hauteur: bitmap.height };
    bitmap.close();
    return dimensions;
  });
  exiger(image.largeur > 0 && image.hauteur > 0, 'Le décor hors ligne ne se décode pas.');
  return image;
}

async function commencerPonts(page) {
  await ouvrirPonts(page);
  const preferencePlanches = page.getByRole('group', { name: 'Niveau de Planches à mesurer' });
  await preferencePlanches.getByRole('button', { name: 'Explorer' }).click();
  // Le retour à aria-busy=false intervient après la réponse de choisirNiveau
  // et la relecture de l'état par l'interface : c'est l'ACK de la préférence.
  await attendreRepos(page);
  await expect(preferencePlanches.getByRole('button', { name: 'Explorer' })).toHaveAttribute('aria-pressed', 'true');

  const niveaux = page.locator('.maths-projet .maths-niveaux');
  await expect(niveaux).toHaveCount(3);
  for (let rang = 0; rang < 3; rang += 1) {
    await niveaux.nth(rang).getByRole('button', { name: 'Découvrir' }).click();
    await expect(niveaux.nth(rang).getByRole('button', { name: 'Découvrir' })).toHaveAttribute('aria-pressed', 'true');
  }
  noter('preference_exploration_ack_et_projet_decouverte', { famille: 'MAT-PON-01', niveau: 'exploration',
    etapesProjet: ['decouverte', 'decouverte', 'decouverte'] });
  await page.getByRole('button', { name: 'Commencer La première traversée' }).click();
  await scene(page, 'MAT-PON-01');
  await capture(page, '02-premier-pont');

  const mesure = await mesureVisible(page);
  const zero = page.getByRole('group', { name: 'Place le zéro de la règle' });
  await zero.getByRole('button', { name: String(mesure.origine), exact: true }).click();
  await expect(page.locator('.ponts-mesure-regle')).toHaveAttribute('data-zero-pose', String(mesure.origine));
  await page.getByRole('group', { name: 'Quelle longueur lis-tu ?' })
    .getByRole('button', { name: 'Ajouter un centimètre' }).click();
  await expect(page.locator('.ponts-compteur output')).toHaveText('1 cm');
  await page.getByRole('button', { name: 'Demander une idée à Gobi' }).click();
  await expect(page.getByTestId('aide-maths')).toHaveAttribute('data-aide-proposee', 'indice');
  const avantPause = await empreinteSceneMesure(page);
  await capture(page, '03-geste-et-aide-avant-pause');
  await page.getByRole('button', { name: 'Mettre la partie en pause' }).click();
  await attendreEcran(page, 'campement');

  const controle = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });
  exiger(controle, 'Le service worker ne contrôle pas encore ce profil ; la recette hors ligne doit attendre son activation normale.');
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await attendreEcran(page, 'campement');
  await page.locator('[data-vers="mathematiques"]').click();
  await scene(page, 'MAT-PON-01');
  const apresReprise = await empreinteSceneMesure(page);
  const decorHorsLigne = await verifierDecorHorsLigne(page);
  exiger(JSON.stringify(apresReprise) === JSON.stringify(avantPause),
    `La même mesure n’a pas été reprise hors ligne : ${JSON.stringify({ avantPause, apresReprise })}`);
  await capture(page, '04-reprise-hors-ligne');
  noter('pause_rechargement_hors_ligne', { mesure, empreinteConservee: true, decorHorsLigne });
  return mesure;
}

async function finirMesure(page, mesure) {
  const groupe = page.getByRole('group', { name: 'Quelle longueur lis-tu ?' });
  let lue = Number.parseInt(await groupe.locator('output').innerText(), 10);
  while (lue < mesure.longueur) {
    const pas = mesure.longueur - lue >= 10 ? 10 : 1;
    await groupe.getByRole('button', { name: pas === 10 ? 'Ajouter dix centimètres' : 'Ajouter un centimètre' }).click();
    lue += pas;
    await expect(groupe.locator('output')).toHaveText(`${lue} cm`);
  }
  const candidats = await page.locator('.ponts-stock button').evaluateAll((boutons) => boutons.map((bouton) => {
    const etiquette = bouton.getAttribute('aria-label') ?? '';
    const correspondance = /^(.*), (\d+) centimètres,/.exec(etiquette);
    return correspondance ? { id: correspondance[1], longueur: Number(correspondance[2]) } : null;
  }).filter(Boolean));
  const planches = candidats.filter((candidate) => candidate.longueur === mesure.longueur);
  exiger(planches.length === 1, 'La planche de la longueur mesurée doit être unique dans le stock Découverte.');
  await page.locator(`.ponts-stock button[aria-label^="${planches[0].id},"]`).click();
  await expect(page.locator(`.ponts-stock button[aria-label^="${planches[0].id},"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
  await expect(page.getByTestId('reussite-maths')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la traversée' }).click();
  await scene(page, 'MAT-PON-03');
  noter('etape_1_mesure_reussie', { longueur: mesure.longueur });
}

async function finirTablier(page) {
  await capture(page, '05-tablier-hors-ligne');
  const portee = Number(/Pont de (\d+) centimètres/.exec(
    await page.locator('.ponts-bande').getAttribute('aria-label') ?? '')?.[1]);
  exiger(Number.isInteger(portee), 'La portée du pont doit être lisible dans le dessin.');
  const pieces = await page.locator('[data-testid^="piece-module-"]').evaluateAll((boutons) => boutons.map((bouton) => {
    const id = bouton.getAttribute('data-testid')?.slice('piece-'.length);
    const longueur = Number(/, (\d+) centimètres/.exec(bouton.getAttribute('aria-label') ?? '')?.[1]);
    return { id, longueur };
  }));
  const paire = pieces.flatMap((premiere, rang) => pieces.slice(rang + 1).map((seconde) => [premiere, seconde]))
    .find(([premiere, seconde]) => premiere.longueur + seconde.longueur === portee);
  exiger(paire && paire.every((piece) => piece.id && Number.isInteger(piece.longueur)),
    'Aucune paire de modules visibles ne joint les deux rives.');
  for (const [rang, [piece, position]] of [[paire[0], 0], [paire[1], paire[0].longueur]].entries()) {
    await page.getByTestId(`piece-${piece.id}`).click();
    await page.getByTestId(`tablier-position-${position}`).click();
    await expect(page.locator('.ponts-module-pose')).toHaveCount(rang + 1);
  }
  await expect(page.locator('.ponts-module-pose')).toHaveCount(2);
  await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
  await expect(page.getByTestId('reussite-maths')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la traversée' }).click();
  await scene(page, 'MAT-PON-02');
  noter('etape_2_tablier_reussi', { portee });
}

async function finirBornes(page) {
  await capture(page, '06-bornes-hors-ligne');
  const consigne = await page.locator('.scene-ponts__consigne').innerText();
  const valeur = Number(/Place la borne (\d+)/.exec(consigne)?.[1]);
  exiger(Number.isInteger(valeur), 'La borne à poser doit être indiquée dans la consigne.');
  await page.getByRole('group', { name: 'Nombre à porter' })
    .getByRole('button', { name: String(valeur), exact: true }).click();
  await page.getByRole('group', { name: 'Place sur la rive' })
    .getByRole('button', { name: `Graduation ${valeur}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Retirer la borne ${valeur}` })).toBeVisible();
  await page.getByRole('button', { name: 'Vérifier mon pont' }).click();
  await expect(page.getByTestId('reussite-maths')).toBeVisible();
  await expect(page.locator('[data-cadeau="maths-souvenir-ponts"]')).toBeVisible();
  await capture(page, '07-souvenir-de-la-traversee');
  noter('etape_3_et_cadeau', { borne: valeur });
}

async function revoirCoffreEtLecture(page, noeud) {
  await page.getByRole('button', { name: 'Retour aux Ponts' }).click();
  await expect(page.locator('[data-transformation="ponts-premiere-traversee"]')).toBeVisible();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await attendreEcran(page, 'campement');
  await page.locator('[data-vers="coffre"]').click();
  await attendreEcran(page, 'coffre');
  await expect(page.locator('[data-collection-maths-piece="maths-souvenir-ponts"]'))
    .toHaveAttribute('data-obtenu', 'oui');
  await capture(page, '08-souvenir-dans-le-coffre');
  await page.locator('[data-vers="campement"]').click();
  await attendreEcran(page, 'campement');
  await expect(page.locator('[data-vers="reprise-lecture"]')).toBeVisible();
  await page.locator('[data-vers="reprise-lecture"]').click();
  await attendreEcran(page, 'noeud');
  await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-noeud', noeud);
  await expect(page.locator('[data-ecran="noeud"] [data-moteur]')).toBeVisible();
  await capture(page, '09-lecture-reprise-apres-maths');
  await page.locator('[data-ecran="noeud"] [data-vers="carte"]').click();
  await attendreEcran(page, 'carte');
  await page.locator('[data-vers="campement"]').click();
  await attendreEcran(page, 'campement');
  noter('coffre_et_relecture', { noeud });
}

async function allerAuxProfils(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-ecran="profils"], [data-ecran="campement"], [data-ecran="ouverture"], [data-ecran="noeud"], [data-ecran="carte"], [data-ecran="mathematiques"]')
    .first().waitFor({ timeout: 30_000 });
  if (await page.locator('[data-ecran="ouverture"]').count()) {
    await page.locator('[data-passer="ouverture"]').click();
    await attendreEcran(page, 'campement');
  }
  if (await page.locator('[data-ecran="mathematiques"]').count()) {
    await page.getByRole('button', { name: /^(Mettre la partie en pause|Retour)$/ }).click();
    await attendreEcran(page, 'campement');
  }
  if (await page.locator('[data-ecran="noeud"]').count()) {
    await page.locator('[data-ecran="noeud"] [data-vers="carte"]').click();
    await attendreEcran(page, 'carte');
  }
  if (await page.locator('[data-ecran="campement"]').count()) {
    await page.locator('[data-vers="carte"]').click();
    await attendreEcran(page, 'carte');
  }
  if (await page.locator('[data-ecran="carte"]').count()) await page.getByRole('button', { name: 'Changer de joueur' }).click();
  await attendreEcran(page, 'profils');
  await page.getByText('On cherche les joueurs…').waitFor({ state: 'detached', timeout: 30_000 });
}

async function choisirProfilDepuisInterface(page) {
  await allerAuxProfils(page);
  await page.getByRole('button', { name: `Jouer avec le profil de ${prenom}` }).click();
  await ouvrirCampement(page);
}

async function ouvrirZoneParent(page) {
  await allerAuxProfils(page);
  await page.locator('[data-acces-parent="oui"]').click();
  await attendreEcran(page, 'code-parent');
  // Sur un profil Chromium réutilisé, le code existe déjà. Sur le premier passage, l'écran
  // peut basculer vers sa définition pendant que l'état de la porte est encore chargé.
  for (let essai = 0; essai < 3 && await page.locator('[data-ecran="dashboard"]').count() === 0; essai += 1) {
    const mode = await page.locator('[data-ecran="code-parent"]').getAttribute('data-parent-mode');
    if (await page.locator('[data-code-longueur]').getAttribute('data-code-longueur') !== '0') {
      await page.getByRole('button', { name: 'Effacer' }).click();
    }
    for (const chiffre of codeParent) await page.locator(`[data-touche="${chiffre}"]`).click();
    if (await page.locator('[data-ecran="code-parent"]').getAttribute('data-parent-mode') !== mode) continue;
    const valider = page.locator(mode === 'definition' ? '[data-definir="code-parent"]' : '[data-valider="code-parent"]');
    await expect(valider).toBeEnabled();
    await valider.click();
    await page.locator(mode === 'definition'
      ? '[data-ecran="dashboard"], [data-suivre-profil]'
      : '[data-ecran="dashboard"], [data-parent-mode="definition"], [data-suivre-profil]').first().waitFor({ timeout: 30_000 });
    if (await page.locator('[data-suivre-profil]').count()) {
      await page.getByRole('button', { name: `Voir le suivi de ${prenom}`, exact: true }).click();
      await attendreEcran(page, 'dashboard');
    }
  }
  await attendreEcran(page, 'dashboard');
}

async function exporterDepuisInterfaceParent(page, nomFichier, captureNom) {
  await ouvrirZoneParent(page);
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger la sauvegarde' }).click();
  const fichier = await telechargement;
  const copie = path.join(dossier, nomFichier);
  await fichier.saveAs(copie);
  await expect(page.locator('[data-sauvegarde-pwa] [role="status"]')).toContainText('Sauvegarde téléchargée');
  exiger(existsSync(copie), 'La sauvegarde téléchargée est introuvable.');
  await capture(page, captureNom);
  noter('export_ui', { fichier: path.basename(copie) });
  return copie;
}

async function verifierProgressionParInterface(page, noeud, prefixe) {
  await choisirProfilDepuisInterface(page);
  await expect(page.locator('[data-vers="reprise-lecture"]')).toBeVisible();
  await page.locator('[data-vers="coffre"]').click();
  await attendreEcran(page, 'coffre');
  await expect(page.locator('[data-collection-maths-piece="maths-souvenir-ponts"]'))
    .toHaveAttribute('data-obtenu', 'oui');
  await page.locator('[data-vers="campement"]').click();
  await attendreEcran(page, 'campement');
  await ouvrirPonts(page);
  await expect(page.locator('[data-transformation="ponts-premiere-traversee"]')).toBeVisible();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await attendreEcran(page, 'campement');
  await page.locator('[data-vers="reprise-lecture"]').click();
  await attendreEcran(page, 'noeud');
  await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-noeud', noeud);
  await expect(page.locator('[data-ecran="noeud"] [data-moteur]')).toBeVisible();
  await capture(page, `${prefixe}-lecture-et-maths-conserves`);
  await page.locator('[data-ecran="noeud"] [data-vers="carte"]').click();
  await attendreEcran(page, 'carte');
  await page.locator('[data-vers="campement"]').click();
  await attendreEcran(page, 'campement');
  noter(`${prefixe}_progression_visible`, { noeud, souvenir: 'maths-souvenir-ponts' });
}

async function importerDepuisInterfaceParent(page, copie) {
  await ouvrirZoneParent(page);
  await page.locator('[data-sauvegarde-pwa] input[type="file"]').setInputFiles(copie);
  await expect(page.locator('[data-sauvegarde-pwa]')).toContainText(path.basename(copie));
  const recharge = page.waitForEvent('load', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Restaurer cette sauvegarde' }).click();
  await recharge;
  await allerAuxProfils(page);
  await capture(page, '14-import-termine');
  noter('import_ui_second_profil', { fichier: path.basename(copie) });
}

function verifierExport(copie) {
  const base = new DatabaseSync(copie, { readOnly: true });
  try {
    const lire = (sql, ...valeurs) => base.prepare(sql).all(...valeurs);
    const profil = base.prepare('SELECT id, generation_progression, generation_maths FROM profils WHERE prenom = ?').get(prenom);
    exiger(profil, 'Le profil créé dans l’interface manque dans la sauvegarde.');
    const id = profil.id;
    const tentativesLecture = lire('SELECT id FROM tentatives WHERE profil_id = ?', id);
    const repriseLecture = lire('SELECT generation_progression, revision, instantane_json FROM reprises_lecture WHERE profil_id = ?', id);
    const instances = lire('SELECT id, famille, niveau, session_projet_id FROM instances_maths WHERE profil_id = ?', id);
    const tentativesMaths = lire('SELECT instance_id, famille, aide_utilisee, etoiles FROM tentatives_maths WHERE profil_id = ?', id);
    const actions = lire('SELECT instance_id, type_action, revision_avant, revision_apres, action_json FROM actions_maths WHERE profil_id = ? ORDER BY instance_id, revision_apres', id);
    const progression = lire('SELECT projet_id, etapes_terminees, nombre_etapes, transformation_id FROM progression_projets_maths WHERE profil_id = ?', id);
    const recompenses = lire('SELECT projet_id, cadeau_id, categorie FROM recompenses_maths WHERE profil_id = ?', id);
    const preferencesNiveaux = lire('SELECT famille, niveau, revision FROM preferences_niveaux_maths WHERE profil_id = ? AND generation_maths = ?',
      id, profil.generation_maths);
    const fk = lire('PRAGMA foreign_key_check');
    const integrite = base.prepare('PRAGMA integrity_check').get();
    exiger(Object.values(integrite)[0] === 'ok' && fk.length === 0, 'La sauvegarde SQLite échoue au contrôle d’intégrité ou de références.');
    exiger(tentativesLecture.length === 0, 'Le parcours maths a écrit dans le journal des tentatives de lecture.');
    exiger(repriseLecture.length === 1 && repriseLecture[0].generation_progression === profil.generation_progression,
      'La reprise lecture indépendante a disparu ou a changé de génération.');
    exiger(instances.length === 3 && tentativesMaths.length === 3, 'Les trois instances et réussites maths ne sont pas conservées.');
    exiger(new Set(instances.map((ligne) => ligne.id)).size === 3 &&
      new Set(tentativesMaths.map((ligne) => ligne.instance_id)).size === 3,
      'Une étape a été remplacée ou conclue deux fois.');
    exiger(instances.every((ligne) => ligne.niveau === 'decouverte' && ligne.session_projet_id === instances[0].session_projet_id),
      'Le projet Découverte a perdu son plan commun.');
    exiger(preferencesNiveaux.length === 1 && preferencesNiveaux[0].famille === 'MAT-PON-01' &&
      preferencesNiveaux[0].niveau === 'exploration' && preferencesNiveaux[0].revision === 1,
    'La préférence Explorer de MAT-PON-01 manque dans la sauvegarde ou a une révision inattendue.');
    exiger(progression.some((ligne) => ligne.projet_id === 'MAT-PON-P01' && ligne.etapes_terminees === 3 &&
      ligne.nombre_etapes === 3 && ligne.transformation_id === 'ponts-premiere-traversee'),
    'La transformation durable du projet est absente.');
    exiger(recompenses.filter((ligne) => ligne.projet_id === 'MAT-PON-P01' &&
      ligne.cadeau_id === 'maths-souvenir-ponts' && ligne.categorie === 'souvenir').length === 1,
    'Le cadeau durable est absent ou doublé.');
    exiger(actions.some((ligne) => ligne.type_action === 'pause') &&
      actions.some((ligne) => ligne.action_json.includes('"type":"aide"')),
    'La pause ou l’aide enregistrée manque dans le journal maths.');
    for (const instanceId of instances.map((ligne) => ligne.id)) {
      const revisions = actions.filter((ligne) => ligne.instance_id === instanceId);
      exiger(revisions.every((ligne, index) => ligne.revision_avant === index && ligne.revision_apres === index + 1),
        `Le journal de ${instanceId} n’a pas de révisions continues.`);
    }
    return { profilId: id, generationProgression: profil.generation_progression,
      generationMaths: profil.generation_maths, tentativesLecture: tentativesLecture.length,
      repriseLecture: repriseLecture.length, instancesMaths: instances.length,
      tentativesMaths: tentativesMaths.length, actionsMaths: actions.length,
      preferencesNiveaux,
      aide: tentativesMaths.map((ligne) => ligne.aide_utilisee),
      etoiles: tentativesMaths.map((ligne) => ligne.etoiles),
      cadeau: recompenses.find((ligne) => ligne.projet_id === 'MAT-PON-P01')?.cadeau_id };
  } finally {
    base.close();
  }
}

const tablesTransferees = [
  'tentatives', 'reprises_lecture', 'sessions_projets_maths', 'instances_maths',
  'actions_maths', 'reprises_maths', 'tentatives_maths', 'progression_maths',
  'progression_projets_maths', 'recompenses_maths', 'preferences_niveaux_maths',
];

function lignesDuProfil(copie, profilId) {
  const base = new DatabaseSync(copie, { readOnly: true });
  try {
    const profil = base.prepare('SELECT id, generation_progression, generation_maths FROM profils WHERE id = ?')
      .get(profilId);
    exiger(profil, `Le profil ${profilId} manque dans ${path.basename(copie)}.`);
    const lignes = Object.fromEntries(tablesTransferees.map((table) => {
      const valeurs = base.prepare(`SELECT * FROM ${table} WHERE profil_id = ?`).all(profilId)
        .map((ligne) => JSON.stringify(Object.fromEntries(Object.entries(ligne)
          .sort(([a], [b]) => a.localeCompare(b)))))
        .sort();
      return [table, valeurs];
    }));
    return { profil, lignes };
  } finally {
    base.close();
  }
}

function comparerDonneesTransferees(source, destination, profilId) {
  const avant = lignesDuProfil(source, profilId);
  const apres = lignesDuProfil(destination, profilId);
  exiger(JSON.stringify(avant.profil) === JSON.stringify(apres.profil),
    'Les générations lecture et maths du profil ont changé pendant le transfert.');
  const empreintes = {};
  for (const table of tablesTransferees) {
    const debut = avant.lignes[table], fin = apres.lignes[table];
    const empreinte = (lignes) => createHash('sha256').update(JSON.stringify(lignes)).digest('hex');
    exiger(JSON.stringify(debut) === JSON.stringify(fin),
      `Le transfert a modifié ${table} : ${debut.length} lignes (${empreinte(debut)}) contre ${fin.length} (${empreinte(fin)}).`);
    empreintes[table] = { lignes: debut.length, sha256: empreinte(debut) };
  }
  exiger(avant.lignes.tentatives.length === 0 && avant.lignes.tentatives_maths.length === 3,
    'Le transfert a confondu le journal lecture et les trois réussites maths.');
  exiger(avant.lignes.reprises_lecture.length === 1 && avant.lignes.recompenses_maths.length === 1,
    'La reprise lecture ou le souvenir maths manque dans le transfert.');
  const preference = avant.lignes.preferences_niveaux_maths.length === 1
    ? JSON.parse(avant.lignes.preferences_niveaux_maths[0]) : null;
  exiger(preference?.famille === 'MAT-PON-01' && preference.niveau === 'exploration' && preference.revision === 1,
    'La préférence Explorer de MAT-PON-01 manque dans le transfert exact.');
  exiger(tablesTransferees.length === 11, 'La comparaison du transfert doit couvrir les onze tables du profil.');
  return { profilId, generations: avant.profil, nombreTables: tablesTransferees.length, tables: empreintes };
}

async function ouvrirProfilChromium(dossierProfil) {
  const nouveauContexte = await chromium.launchPersistentContext(dossierProfil, {
    headless: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'allow',
    acceptDownloads: true,
  });
  const nouvellePage = nouveauContexte.pages()[0] ?? await nouveauContexte.newPage();
  nouvellePage.on('pageerror', (erreur) => rapport.erreursPage.push(`${path.basename(dossierProfil)} : ${erreur.message}`));
  nouvellePage.on('request', (requete) => {
    if (new URL(requete.url()).pathname.includes('/api/')) rapport.requetesApi.push(requete.url());
  });
  return { contexte: nouveauContexte, page: nouvellePage };
}

async function verifierVersionParInterface(page, scriptCourant) {
  const script = page.locator(`script[src="${scriptCourant}"]`);
  if (await script.count() === 0) {
    // Le profil persistant peut encore utiliser le précédent livrable. Appliquer sa
    // mise à jour par la commande parent, sans effacer la base ni forcer le worker.
    const notification = page.locator('[data-notification-mise-a-jour="prete"]');
    await expect(notification).toBeVisible({ timeout: 60_000 });
    await notification.getByRole('button', { name: 'Mettre à jour', exact: true }).click();
    await expect(script).toHaveCount(1, { timeout: 30_000 });
    await attendreEcran(page, 'campement');
    noter('ancien_livrable_actualise_par_interface', { script: scriptCourant });
  }
  await expect(script).toHaveCount(1);
}

let contexte;
let page;
try {
  exiger(existsSync(path.join(RACINE, 'client', 'dist-pwa', 'index.html')),
    'Construis d’abord le livrable PWA local ; ce script ne lance aucun build.');
  const reponse = await fetch(url);
  exiger(reponse.ok, 'Démarre `npm run servir:pwa` sur 127.0.0.1:4175 avant la recette.');
  ({ contexte, page } = await ouvrirProfilChromium(profilNavigateur));
  await creerProfilParInterface(page);
  const scriptCourant = readFileSync(path.join(RACINE, 'client', 'dist-pwa', 'index.html'), 'utf8')
    .match(/src="([^"]+index-[^"]+\.js)"/)?.[1];
  exiger(scriptCourant, 'Le script du build PWA local est introuvable.');
  await verifierVersionParInterface(page, scriptCourant);
  noter('bundle_pwa_courant', { script: scriptCourant });
  const noeud = await preparerRelecture(page);
  const mesure = await commencerPonts(page);
  await finirMesure(page, mesure);
  await finirTablier(page);
  await finirBornes(page);
  await revoirCoffreEtLecture(page, noeud);
  const copie = await exporterDepuisInterfaceParent(page, 'sauvegarde-avant-fermeture.sqlite3', '10-export-parent');
  rapport.sqlite = verifierExport(copie);
  await contexte.close();
  contexte = undefined;
  page = undefined;
  noter('premier_contexte_ferme');

  ({ contexte, page } = await ouvrirProfilChromium(profilNavigateur));
  await verifierProgressionParInterface(page, noeud, '11-reouverture');
  const copieReouverte = await exporterDepuisInterfaceParent(page,
    'sauvegarde-apres-reouverture.sqlite3', '12-export-apres-reouverture');
  const sqliteReouverte = verifierExport(copieReouverte);
  exiger(sqliteReouverte.profilId === rapport.sqlite.profilId &&
    sqliteReouverte.generationProgression === rapport.sqlite.generationProgression &&
    sqliteReouverte.generationMaths === rapport.sqlite.generationMaths,
  'Le profil ou ses générations ont changé après la fermeture du navigateur.');
  noter('source_reouverte_et_exportee', sqliteReouverte);
  await contexte.close();
  contexte = undefined;
  page = undefined;

  ({ contexte, page } = await ouvrirProfilChromium(profilTransfert));
  // Le tableau parent suit un joueur : ce profil vide de recette permet d'ouvrir
  // l'outil d'import sur un navigateur neuf. La restauration le remplace ensuite.
  await creerProfilParInterface(page);
  await verifierVersionParInterface(page, scriptCourant);
  await importerDepuisInterfaceParent(page, copieReouverte);
  const copieTransferee = await exporterDepuisInterfaceParent(page,
    'sauvegarde-reexportee-apres-import.sqlite3', '15-reexport-second-profil');
  rapport.sqliteTransferee = verifierExport(copieTransferee);
  rapport.transfert = comparerDonneesTransferees(copieReouverte, copieTransferee, rapport.sqlite.profilId);
  noter('comparaison_exacte_apres_transfert', rapport.transfert);
  await verifierProgressionParInterface(page, noeud, '16-transfert');
  exiger(rapport.erreursPage.length === 0, `Erreur de page : ${rapport.erreursPage.join(' | ')}`);
  exiger(rapport.requetesApi.length === 0, 'La PWA a tenté un appel /api/ au lieu du port local.');
  rapport.statut = 'reussi';
  noter('recette_pwa_autonome_terminee', { profils: 2, journauxLecture: 0,
    tentativesMaths: rapport.sqliteTransferee.tentativesMaths });
} catch (cause) {
  rapport.statut = 'echec';
  rapport.erreur = cause instanceof Error ? cause.stack ?? cause.message : String(cause);
  if (page && !page.isClosed()) {
    try { await capture(page, 'echec'); } catch { /* Le rapport garde l’erreur principale. */ }
  }
  writeFileSync(path.join(dossier, 'rapport.json'), JSON.stringify(rapport, null, 2));
  console.error(rapport.erreur);
  process.exitCode = 1;
} finally {
  if (contexte) await contexte.close();
}

console.log(path.join(dossier, 'rapport.json'));
