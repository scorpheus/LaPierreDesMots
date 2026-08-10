/**
 * Validation de la création d'un profil — extrait de `serveur/src/routes/profils.ts` (Lot 2 du
 * portage Android, Docs/addendum-portage-android.md § 6bis). Aucune E/S : cette logique doit
 * pouvoir s'exécuter aussi bien derrière une route Fastify (mode LAN) qu'en appel direct depuis
 * le client autonome (Lot 4) — les deux valident le même corps avec la même règle.
 *
 * Le corps d'une requête est une entrée NON FIABLE. Il est validé à l'exécution — le typage
 * TypeScript ne franchit pas la frontière HTTP et ne prouve rien sur ce qui arrive du réseau.
 */

import type { ConfigurationAvatar } from '../../api/contrats.js';
import { PALETTE_VARIANTE_PAR_DEFAUT } from '../depots/profils.js';

/** Un prenom d'enfant tient largement la-dedans ; la borne evite un abus par le reseau. */
const LONGUEUR_PRENOM_MAX = 40;

export interface CreationValidee {
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  readonly paletteVariante: string;
}

export type ValidationCreationProfil =
  | { readonly ok: true; readonly valeur: CreationValidee }
  | { readonly ok: false; readonly message: string };

/**
 * Valide le corps de `POST /api/profils`.
 *
 * Seul `prenom` est reellement exige : `avatar` a une configuration par defaut (addendum § B.5,
 * « chatain, yeux bleus » est un defaut, pas une saisie obligatoire) et `paletteVariante` tombe
 * sur la premiere region.
 */
export function validerCreationProfil(corps: unknown): ValidationCreationProfil {
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
