/**
 * `GET /api/parent/:profil/galerie` — lot N5, contrat de finition v3 § 4.5 et § 8.
 *
 * D34, mot pour mot : « galerie parent : **tout exercice lançable**, RIEN de journalisé,
 * invisible côté enfant ». Ce fichier garde la première et la troisième ; la deuxième est
 * mesurée par `tests/unitaires/galerie-non-journalisee.test.ts`, qui porte le témoin.
 *
 * LE CHIFFRE QUE CE FICHIER CALCULE, et qui échouerait si le service était creux :
 * **le nombre d'exercices du catalogue est égal au nombre de fichiers `contenu/exercices/
 * **\/*.json` portant un `id`.** Un catalogue qui filtrerait — par région, par progression,
 * par statut de relecture — rendrait un compte inférieur, et le test le dirait avec les deux
 * chiffres et leur écart. « Un lot qui rend N occurrences n'a pas répondu à combien
 * d'objets » : on énumère donc les OBJETS sur le disque, pas les lignes d'une réponse.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import type { CatalogueGalerie } from '@partage/parent/galerie';

import { RACINE_DEPOT, lireJson, monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

/** Énumère les OBJETS sur le disque : un exercice est un JSON de `contenu/exercices/` qui a un `id`. */
function exercicesSurDisque(): readonly string[] {
  const racine = path.join(RACINE_DEPOT, 'contenu', 'exercices');
  const trouves: string[] = [];

  const parcourir = (dossier: string): void => {
    let noms: readonly string[];
    try {
      if (!statSync(dossier).isDirectory()) return;
      noms = readdirSync(dossier);
    } catch {
      return;
    }
    for (const nom of [...noms].sort()) {
      const complet = path.join(dossier, nom);
      if (statSync(complet).isDirectory()) {
        parcourir(complet);
        continue;
      }
      if (!nom.endsWith('.json')) continue;
      try {
        const objet = JSON.parse(readFileSync(complet, 'utf8')) as { id?: unknown };
        if (typeof objet.id === 'string' && objet.id !== '') {
          trouves.push(objet.id);
        }
      } catch {
        // Un JSON cassé n'est pas un exercice ; `npm run test:contenu` en répond.
      }
    }
  };

  parcourir(racine);
  return trouves.sort();
}

async function jetonParent(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code: CODE }
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as { jeton: string }).jeton;
}

async function creerProfil(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom: 'Alma', avatar: {}, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

async function galerie(profil: string, jeton: string) {
  return contexte.application.inject({
    method: 'GET',
    url: `/api/parent/${encodeURIComponent(profil)}/galerie`,
    headers: { [ENTETE_JETON_PARENT]: jeton }
  });
}

describe('GET /api/parent/:profil/galerie', () => {
  it('CONTRAT — le catalogue porte TOUS les exercices du disque, sans un seul filtre', async () => {
    const profil = await creerProfil();
    const catalogue = (await galerie(profil, await jetonParent())).json() as CatalogueGalerie;

    const surDisque = exercicesSurDisque();
    const auCatalogue = catalogue.entrees.map((e) => String(e.exercice)).sort();

    // LES DEUX COMPTES ET LEUR ÉCART, jamais un seul. Un catalogue partiel se voit ici, et
    // le message nomme les manquants au lieu d'annoncer « 7 attendus, 3 reçus ».
    const manquants = surDisque.filter((id) => !auCatalogue.includes(id));
    const enTrop = auCatalogue.filter((id) => !surDisque.includes(id));

    expect(surDisque.length, 'des exercices doivent exister, sinon ce test est creux').toBeGreaterThan(0);
    expect(manquants, 'exercices du disque absents du catalogue').toEqual([]);
    expect(enTrop, 'entrées du catalogue qui ne sont sur aucun disque').toEqual([]);
    expect(auCatalogue.length).toBe(surDisque.length);
  });

  it('chaque entrée porte son moteur, son habillage, ses compétences et son chemin', async () => {
    const profil = await creerProfil();
    const catalogue = (await galerie(profil, await jetonParent())).json() as CatalogueGalerie;

    for (const entree of catalogue.entrees) {
      expect(String(entree.titre), `titre de ${String(entree.exercice)}`).not.toBe('');
      expect(String(entree.moteur), `moteur de ${String(entree.exercice)}`).not.toBe('');
      expect(String(entree.habillage), `habillage de ${String(entree.exercice)}`).not.toBe('');
      // Le chemin est ce qui rend l'écran de relecture de l'annexe P § 6.3 utilisable : sans
      // lui, le parent lit un titre et ne sait pas quel fichier il juge.
      expect(entree.chemin, `chemin de ${String(entree.exercice)}`).toMatch(
        /^contenu\/exercices\/.+\.json$/u
      );
      expect(['en-attente', 'valide', 'rejete', 'livre']).toContain(entree.statut);
    }
  });

  it('la région vient du NŒUD porteur, jamais du nom de dossier', async () => {
    const profil = await creerProfil();
    const catalogue = (await galerie(profil, await jetonParent())).json() as CatalogueGalerie;

    // Le nom de fichier ne fait jamais autorité (`depot-contenu-disque.ts`) ; le dossier non
    // plus. Un exercice dont le nœud est de La Clairière est de La Clairière, même si
    // quelqu'un range son JSON ailleurs un jour.
    // ⚠ LA LISTE ATTENDUE ÉTAIT ÉCRITE À LA MAIN — et quatre de ses six entrées (`marais`,
    // `foret`, `volcan`, `cite`) n'ont JAMAIS été des codes de région : les vrais sont
    // `marais-jumeau`, `foret-muette`, `volcan`, `cite-des-histoires`. Le cas passait parce
    // qu'aucun exercice n'était encore rattaché à ces régions ; il aurait accepté n'importe
    // quel code inventé. On lit donc les codes sur le référentiel du monde, l'unique document
    // qui les déclare.
    const codesDeclares = lireJson<{
      readonly regions: readonly { readonly region: string }[];
    }>('contenu/monde/regions.json').regions.map((r) => r.region);

    const cablees = catalogue.entrees.filter((e) => e.region !== null);
    expect(cablees.length, 'au moins un exercice doit être rattaché à une région').toBeGreaterThan(0);
    for (const entree of cablees) {
      expect(codesDeclares, `région de ${String(entree.exercice)}`).toContain(
        String(entree.region)
      );
    }
    // Contrat de sortie : les SIX régions doivent apparaître, sinon le cas resterait vert avec
    // une seule région câblée et ne dirait rien du rattachement des cinq autres.
    expect([...new Set(cablees.map((e) => String(e.region)))].sort()).toEqual(
      [...codesDeclares].sort()
    );
  });

  it('les deux index sont cohérents avec les entrées — jamais une clé orpheline', async () => {
    const profil = await creerProfil();
    const catalogue = (await galerie(profil, await jetonParent())).json() as CatalogueGalerie;

    const moteurs = new Set(catalogue.entrees.map((e) => String(e.moteur)));
    for (const moteur of Object.keys(catalogue.habillagesParMoteur)) {
      expect(moteurs, `le moteur ${moteur} indexé doit exister au catalogue`).toContain(moteur);
    }

    const competences = new Set(catalogue.entrees.flatMap((e) => e.competences.map(String)));
    for (const competence of Object.keys(catalogue.moteursParCompetence)) {
      expect(competences, `la compétence ${competence} indexée doit exister`).toContain(competence);
    }
  });

  it('refuse un appel sans jeton : la galerie est invisible côté enfant (D34)', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${encodeURIComponent(profil)}/galerie`
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('refuse un jeton périmé ou inventé', async () => {
    const profil = await creerProfil();
    const reponse = await galerie(profil, 'un-jeton-qui-n-a-jamais-existe');
    expect(reponse.statusCode).toBe(401);
  });
});
