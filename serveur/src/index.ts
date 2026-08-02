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

import { construireApplication } from './application.js';
import { appliquerMigrations } from './base/migrations.js';
import { BASE_EN_MEMOIRE, ouvrirBase } from './base/connexion.js';
import { lireConfiguration } from './configuration.js';
import { reparerProgressionRegion } from './depots/monde.js';
import { creerDepotContenuDisque } from './services/depot-contenu-disque.js';

async function demarrer(): Promise<void> {
  const configuration = lireConfiguration();

  if (configuration.cheminBase !== BASE_EN_MEMOIRE) {
    mkdirSync(path.dirname(configuration.cheminBase), { recursive: true });
  }

  const base = ouvrirBase(configuration.cheminBase);
  const rapport = appliquerMigrations(base, configuration.dossierMigrations, horloge);

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
  const reparees = reparerProgressionRegion(base);
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
        base.close();
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
