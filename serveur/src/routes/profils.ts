/**
 * Routes de profil : liste, creation, lecture, progression.
 *
 * Quatre des sept routes du contrat § 3.3 :
 *   GET  /api/profils
 *   POST /api/profils                  -> 201
 *   GET  /api/profils/:id
 *   GET  /api/profils/:id/progression
 *
 * Le corps d'une requete est une entree NON FIABLE. Il est valide a l'execution — le typage
 * TypeScript ne franchit pas la frontiere HTTP et ne prouve rien sur ce qui arrive du reseau.
 */

import type { FastifyInstance } from 'fastify';

import type { ConfigurationAvatar, Profil, ProgressionNoeud } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import {
  PALETTE_VARIANTE_PAR_DEFAUT,
  creerProfil,
  lireProfil,
  listerProfils
} from '../depots/profils.js';
import { lireProgression } from '../depots/progression.js';

/** Un prenom d'enfant tient largement la-dedans ; la borne evite un abus par le reseau. */
const LONGUEUR_PRENOM_MAX = 40;

interface ParametresIdentifiant {
  readonly id: string;
}

interface CreationValidee {
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  readonly paletteVariante: string;
}

type Validation =
  | { readonly ok: true; readonly valeur: CreationValidee }
  | { readonly ok: false; readonly message: string };

/**
 * Valide le corps de `POST /api/profils`.
 *
 * Seul `prenom` est reellement exige : `avatar` a une configuration par defaut (addendum § B.5,
 * « chatain, yeux bleus » est un defaut, pas une saisie obligatoire) et `paletteVariante` tombe
 * sur la premiere region.
 */
export function validerCreationProfil(corps: unknown): Validation {
  if (typeof corps !== 'object' || corps === null) {
    return { ok: false, message: 'Le corps de la requete doit etre un objet JSON.' };
  }

  const brut = corps as {
    prenom?: unknown;
    avatar?: unknown;
    paletteVariante?: unknown;
  };

  if (typeof brut.prenom !== 'string' || brut.prenom.trim() === '') {
    return { ok: false, message: 'Le champ « prenom » est obligatoire et doit etre une chaine.' };
  }
  const prenom = brut.prenom.trim();
  if (prenom.length > LONGUEUR_PRENOM_MAX) {
    return {
      ok: false,
      message: `Le champ « prenom » depasse ${String(LONGUEUR_PRENOM_MAX)} caracteres.`
    };
  }

  if (brut.avatar !== undefined && (typeof brut.avatar !== 'object' || brut.avatar === null)) {
    return { ok: false, message: 'Le champ « avatar » doit etre un objet.' };
  }

  if (brut.paletteVariante !== undefined && typeof brut.paletteVariante !== 'string') {
    return { ok: false, message: 'Le champ « paletteVariante » doit etre une chaine.' };
  }

  return {
    ok: true,
    valeur: {
      prenom,
      avatar: (brut.avatar ?? {}) as ConfigurationAvatar,
      paletteVariante:
        typeof brut.paletteVariante === 'string' && brut.paletteVariante !== ''
          ? brut.paletteVariante
          : PALETTE_VARIANTE_PAR_DEFAUT
    }
  };
}

export function enregistrerRoutesProfils(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get('/api/profils', () => {
    const profils: readonly Profil[] = listerProfils(contexte.base);
    return profils;
  });

  app.post('/api/profils', (requete, reponse) => {
    const validation = validerCreationProfil(requete.body);
    if (!validation.ok) {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
    }

    const profil: Profil = creerProfil(contexte.base, validation.valeur, contexte.horloge);
    return reponse.code(201).send(profil);
  });

  app.get<{ Params: ParametresIdentifiant }>('/api/profils/:id', (requete, reponse) => {
    const profil = lireProfil(contexte.base, requete.params.id);
    if (profil === null) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
    }
    return reponse.send(profil);
  });

  app.get<{ Params: ParametresIdentifiant }>(
    '/api/profils/:id/progression',
    (requete, reponse) => {
      const profil = lireProfil(contexte.base, requete.params.id);
      if (profil === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.id}`));
      }
      const progression: readonly ProgressionNoeud[] = lireProgression(
        contexte.base,
        requete.params.id
      );
      return reponse.send(progression);
    }
  );
}
