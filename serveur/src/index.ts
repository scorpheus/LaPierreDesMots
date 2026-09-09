/**
 * Point d'entree du serveur : lit la configuration, ouvre la base, migre, ecoute.
 *
 * Tout ce qui est decide ici est de la COMPOSITION — aucune regle metier. La logique testable
 * vit dans `construireApplication`, qui ne connait ni l'environnement, ni le disque, ni le port.
 *
 * Le serveur ecoute sur toutes les interfaces (`0.0.0.0` par defaut) : la tablette est un autre
 * appareil du LAN. En HTTP — HTTPS reste optionnel depuis le retrait du micro (CLAUDE.md).
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { creerAlea, horloge } from '@pierre/partage';
import { recalculerToutesLesCascades, reparerProgressionRegion } from '@pierre/partage/base';

import { construireApplication } from './application.js';
import { appliquerMigrations } from './base/migrations.js';
import { creerBaseNodeSqlite } from './base/adaptateur-node-sqlite.js';
import { BASE_EN_MEMOIRE, ouvrirBase } from './base/connexion.js';
import { lireConfiguration } from './configuration.js';
import { chargerReferentielMonde } from './referentiels/monde.js';
import { chargerSeuilsCascade } from './referentiels/recompenses.js';
import { creerDepotContenuDisque } from './services/depot-contenu-disque.js';

async function demarrer(): Promise<void> {
  const configuration = lireConfiguration();

  if (configuration.cheminBase !== BASE_EN_MEMOIRE) {
    mkdirSync(path.dirname(configuration.cheminBase), { recursive: true });
  }

  const connexionSqlite = ouvrirBase(configuration.cheminBase);
  const base = creerBaseNodeSqlite(connexionSqlite);
  const rapport = await appliquerMigrations(base, configuration.dossierMigrations, horloge);

  if (rapport.appliquees.length > 0) {
    process.stdout.write(
      `[pierre] migrations appliquees : ${rapport.appliquees.join(', ')} ` +
        `(schema en version ${String(rapport.versionCourante)})\n`
    );
  }

  // H1 — le cache de recoloration se reconstruit AU DEMARRAGE, pas seulement a la premiere
  // ouverture de la carte. `serveur/src/services/indicateurs.ts` lit `progression_region`
  // directement pour le tableau de bord du parent : sans cet appel, un parent qui ouvre sa page
  // avant que l'enfant n'ouvre la carte lirait le pourcentage que la migration 010 vient
  // d'invalider. Idempotent, et sans effet quand tout est deja juste.
  const reparees = await reparerProgressionRegion(base, chargerReferentielMonde(configuration.racineContenu));
  // Les crédits suivent les exercices distincts réussis, y compris pour les anciens profils.
  await base.transaction((transaction) => recalculerToutesLesCascades(
    transaction, chargerSeuilsCascade(path.join(configuration.racineContenu, 'referentiel', 'parametres-recompenses.json'))
  ));
  if (reparees > 0) {
    process.stdout.write(
      `[pierre] recoloration recalculee pour ${String(reparees)} profil(s).\n`
    );
  }

  const application = construireApplication({
    base,
    contenu: creerDepotContenuDisque(configuration.racineContenu),
    horloge,
    alea: creerAlea(configuration.graine),
    racineClient: configuration.racineClient
  });

  const fermer = (signal: string): void => {
    process.stdout.write(`[pierre] ${signal} recu, fermeture.\n`);
    void application.close().then(
      () => {
        connexionSqlite.close();
        process.exit(0);
      },
      () => {
        process.exit(1);
      }
    );
  };

  process.on('SIGINT', () => {
    fermer('SIGINT');
  });
  process.on('SIGTERM', () => {
    fermer('SIGTERM');
  });

  await application.listen({ host: configuration.hote, port: configuration.port });

  process.stdout.write(
    `[pierre] La Pierre des Mots ecoute sur http://${configuration.hote}:${String(configuration.port)}\n` +
      `[pierre] base    : ${configuration.cheminBase}\n` +
      `[pierre] contenu : ${configuration.racineContenu}\n` +
      `[pierre] client  : ${configuration.racineClient ?? '(non bati)'}\n`
  );
}

demarrer().catch((erreur: unknown) => {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  process.stderr.write(`[pierre] demarrage impossible : ${message}\n`);
  process.exitCode = 1;
});
