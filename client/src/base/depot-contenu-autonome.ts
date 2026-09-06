/**
 * `DepotContenu` embarqué au build — mode autonome uniquement (Lot 4 du portage Android,
 * Docs/addendum-portage-android.md § 6bis). Symétrique de
 * `serveur/src/services/depot-contenu-disque.ts` : même interface `DepotContenu`
 * (`@pierre/partage`), mais le contenu est BUNDLÉ par Vite (`import.meta.glob`) au lieu d'être
 * lu sur `node:fs` à chaque requête — l'app autonome n'a pas de serveur qui lit un disque.
 *
 * Même règle qu'au dépôt disque : **le nom du fichier ne fait jamais autorité**, c'est le champ
 * `id` à l'intérieur du JSON qui identifie l'objet.
 *
 * `contenu/brouillons/` (relecture parent, geste d'auteur PC) et `contenu/schemas/` (JSON
 * Schema, outillage de build) ne sont jamais embarqués : aucune raison produit, et 7,29 Mo
 * embarqués sans eux reste largement dans le budget d'un APK.
 */

import type { Competence, DepotContenu, Exercice, Habillage, Noeud } from '@pierre/partage';

// ── contenu structuré : exercices, nœuds, habillages — indexés par `id`, pas par nom de fichier
const EXERCICES_BRUTS = import.meta.glob('../../../contenu/exercices/**/*.json', {
  import: 'default',
  eager: true
}) as Record<string, unknown>;

const NOEUDS_BRUTS = import.meta.glob('../../../contenu/noeuds/**/*.json', {
  import: 'default',
  eager: true
}) as Record<string, unknown>;

const HABILLAGES_BRUTS = import.meta.glob('../../../contenu/habillages/**/*.habillage.json', {
  import: 'default',
  eager: true
}) as Record<string, unknown>;

import competencesBrut from '../../../contenu/referentiel/competences.json' with { type: 'json' };

// ── assets bruts : SVG et PNG, audio Opus, modèles de lettres — servis par leur URL bundlée
const ASSETS_URL = {
  ...(import.meta.glob('../../../contenu/habillages/**/*.svg', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  ...(import.meta.glob('../../../contenu/assets/**/*.svg', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  ...(import.meta.glob('../../../contenu/habillages/**/*.png', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  // Les décors illustrés (campement, puis cinq tableaux d'ouverture) sont des PNG validés.
  // Sans ce glob ils fonctionnent sur le serveur LAN, mais sont absents de l'APK autonome.
  ...(import.meta.glob('../../../contenu/assets/**/*.png', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  // Les quinze rendus raster de Gobi sont en WebP. Sans ce glob, le serveur LAN les sert,
  // mais la PWA retombe sur `/api/contenu/...` — une route absente de GitHub Pages — et le
  // personnage disparaît alors que tous les tests portant seulement sur SVG/PNG restent verts.
  ...(import.meta.glob('../../../contenu/assets/**/*.webp', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  ...(import.meta.glob('../../../contenu/audio/**/*.opus', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  ...(import.meta.glob('../../../contenu/audio/manifeste.json', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  ...(import.meta.glob('../../../contenu/modeles-lettres/**/*.json', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  // Les récompenses, le coffre et le campement lisent aussi ces référentiels par URL.
  // Les imports objets de `referentiels-autonome.ts` ne créent pas ces URL dans le port.
  ...(import.meta.glob('../../../contenu/monde/*.json', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>),
  // `referentiel/*.json` : lu comme OBJET par `referentiels-autonome.ts` (imports directs, pour
  // `port-local.ts`), et comme URL ICI — `client/src/etat/services.ts` fetch ce même fichier via
  // `urlAsset()` (contrat de port, § 5) pour les jauges de cascade. Mesuré sur émulateur (Lot 5,
  // Docs/addendum-portage-android.md § 6bis) : sans cette entrée, `urlAssetAutonome()` renvoyait
  // `null`, le fetch échouait (« Unable to open asset URL »), et les jauges restaient muettes en
  // silence — exactement la dégradation que `chargerSeuilsCascade()` prévoit pour un référentiel
  // ILLISIBLE, alors qu'ici il était seulement introuvable côté bundle.
  ...(import.meta.glob('../../../contenu/referentiel/*.json', {
    query: '?url',
    import: 'default',
    eager: true
  }) as Record<string, string>)
} satisfies Record<string, string>;

function identifiantDe(objet: unknown): string | null {
  if (typeof objet !== 'object' || objet === null) {
    return null;
  }
  const brut = (objet as { id?: unknown }).id;
  return typeof brut === 'string' && brut !== '' ? brut : null;
}

function indexerParId<T>(bruts: Record<string, unknown>): ReadonlyMap<string, T> {
  const index = new Map<string, T>();
  for (const objet of Object.values(bruts)) {
    const id = identifiantDe(objet);
    if (id !== null) {
      index.set(id, objet as T);
    }
  }
  return index;
}

/**
 * Chemin bundlé → chemin RELATIF À `contenu/`, la forme que `urlAsset()`/`lireAsset()` attendent
 * (celle que le serveur sert derrière `/api/contenu/assets/*`).
 */
function versCheminRelatifAContenu(cheminBundle: string): string {
  const marqueur = '/contenu/';
  const position = cheminBundle.indexOf(marqueur);
  return position === -1 ? cheminBundle : cheminBundle.slice(position + marqueur.length);
}

const INDEX_EXERCICES = indexerParId<Exercice>(EXERCICES_BRUTS);
const INDEX_NOEUDS = indexerParId<Noeud>(NOEUDS_BRUTS);
const INDEX_HABILLAGES = indexerParId<Habillage>(HABILLAGES_BRUTS);
const INDEX_ASSETS = new Map<string, string>(
  Object.entries(ASSETS_URL).map(([chemin, url]) => [versCheminRelatifAContenu(chemin), url])
);

/** L'URL bundlée d'un asset, pour `PortApiLocal.urlAsset()`. `null` si l'asset n'est pas embarqué. */
export function urlAssetAutonome(cheminRelatif: string): string | null {
  return INDEX_ASSETS.get(cheminRelatif.replace(/^\/+/u, '')) ?? null;
}

/**
 * Paires (chemin relatif au dépôt, contenu brut), pour la galerie parent
 * (`catalogue-galerie-autonome.ts`) — seul autre consommateur qui a besoin du CHEMIN de chaque
 * fichier, pas seulement de son `id`. Réutilise les mêmes `import.meta.glob` que le reste de ce
 * module plutôt que d'en ouvrir un second : un second glob sur les mêmes fichiers dupliquerait
 * leur JSON dans le bundle.
 */
/**
 * Chemin bundlé → chemin relatif à la RACINE DU DÉPÔT (donc préfixé `contenu/`) : c'est la
 * forme que `EntreeGalerie.chemin` attend, et celle que la file de relecture stocke déjà
 * (`contenu/brouillons/…`).
 */
function versCheminRelatifAuDepot(cheminBundle: string): string {
  const marqueur = '/contenu/';
  const position = cheminBundle.indexOf(marqueur);
  return position === -1 ? cheminBundle : cheminBundle.slice(position + 1);
}

export function exercicesAvecChemin(): ReadonlyArray<{ readonly chemin: string; readonly objet: unknown }> {
  return Object.entries(EXERCICES_BRUTS).map(([chemin, objet]) => ({
    chemin: versCheminRelatifAuDepot(chemin),
    objet
  }));
}

export function noeudsAvecChemin(): ReadonlyArray<{ readonly chemin: string; readonly objet: unknown }> {
  return Object.entries(NOEUDS_BRUTS).map(([chemin, objet]) => ({
    chemin: versCheminRelatifAuDepot(chemin),
    objet
  }));
}

export function creerDepotContenuAutonome(): DepotContenu {
  return {
    chargerExercice: (id) => Promise.resolve(INDEX_EXERCICES.get(id) ?? null),
    chargerNoeud: (id) => Promise.resolve(INDEX_NOEUDS.get(id) ?? null),
    chargerHabillage: (id) => Promise.resolve(INDEX_HABILLAGES.get(id) ?? null),
    listerNoeuds: () => Promise.resolve([...INDEX_NOEUDS.values()]),
    listerExercices: () => Promise.resolve([...INDEX_EXERCICES.values()]),
    listerCompetences: () =>
      Promise.resolve(Array.isArray(competencesBrut) ? (competencesBrut as readonly Competence[]) : []),
    async lireAsset(chemin: string): Promise<Uint8Array | null> {
      const url = urlAssetAutonome(chemin);
      if (url === null) {
        return null;
      }
      try {
        const reponse = await fetch(url);
        if (!reponse.ok) {
          return null;
        }
        return new Uint8Array(await reponse.arrayBuffer());
      } catch {
        return null;
      }
    }
  };
}
