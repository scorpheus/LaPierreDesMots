/**
 * Le catalogue d'exercices de la galerie parent, en mode autonome — D34, Lot 4 du portage
 * Android (Docs/addendum-portage-android.md § 6bis). Symétrique de
 * `serveur/src/services/catalogue-exercices.ts`, qui balaie `contenu/` sur disque à chaque
 * ouverture ; ici le contenu est déjà EMBARQUÉ (`depot-contenu-autonome.ts`), donc pas de
 * balayage — seule l'indexation change de source. `construireCatalogue` (la partie qui
 * raisonne, pure) vient inchangée de `@pierre/partage/parent`.
 */

import type {
  CodeCompetence,
  CodeMoteur,
  CodeRegion,
  IdExercice,
  IdHabillage,
  IdNoeud
} from '@pierre/partage';
import type { CatalogueGalerie, EntreeGalerie, StatutValidation } from '@pierre/partage/parent';
import { construireCatalogue } from '@pierre/partage/parent';
import { listerRelecture } from '@pierre/partage/base';
import type { Base } from '@pierre/partage/base';

import { exercicesAvecChemin, noeudsAvecChemin } from './depot-contenu-autonome.js';

interface ExerciceLu {
  readonly id?: unknown;
  readonly titre?: unknown;
  readonly competences?: unknown;
  readonly jeu?: {
    readonly moteur?: unknown;
    readonly habillage?: unknown;
    readonly noeud?: unknown;
  };
}

interface NoeudLu {
  readonly id?: unknown;
  readonly region?: unknown;
}

async function indexerStatuts(base: Base): Promise<ReadonlyMap<string, StatutValidation>> {
  const index = new Map<string, StatutValidation>();
  for (const entree of await listerRelecture(base)) {
    index.set(String(entree.exercice), entree.statut);
  }
  return index;
}

function indexerRegions(
  fichiers: ReadonlyArray<{ readonly objet: unknown }>
): ReadonlyMap<string, CodeRegion> {
  const index = new Map<string, CodeRegion>();
  for (const { objet } of fichiers) {
    const noeud = objet as NoeudLu;
    if (typeof noeud.id === 'string' && typeof noeud.region === 'string') {
      index.set(noeud.id, noeud.region as CodeRegion);
    }
  }
  return index;
}

function versEntree(
  fichier: { readonly chemin: string; readonly objet: unknown },
  regionParNoeud: ReadonlyMap<string, CodeRegion>,
  statutParExercice: ReadonlyMap<string, StatutValidation>
): EntreeGalerie | null {
  const exercice = fichier.objet as ExerciceLu;
  const id = typeof exercice.id === 'string' ? exercice.id : '';
  if (id === '') {
    return null;
  }

  const jeu = exercice.jeu ?? {};
  const noeud = typeof jeu.noeud === 'string' ? (jeu.noeud as IdNoeud) : null;

  return {
    exercice: id as IdExercice,
    titre: typeof exercice.titre === 'string' && exercice.titre !== '' ? exercice.titre : id,
    moteur: (typeof jeu.moteur === 'string' ? jeu.moteur : 'inconnu') as CodeMoteur,
    habillage: (typeof jeu.habillage === 'string' ? jeu.habillage : '') as IdHabillage,
    competences: Array.isArray(exercice.competences)
      ? exercice.competences.filter((c): c is string => typeof c === 'string').map((c) => c as CodeCompetence)
      : [],
    statut: statutParExercice.get(id) ?? 'livre',
    noeud,
    region: noeud === null ? null : (regionParNoeud.get(noeud) ?? null),
    chemin: fichier.chemin
  };
}

export async function construireCatalogueExercicesAutonome(base: Base): Promise<CatalogueGalerie> {
  const regionParNoeud = indexerRegions(noeudsAvecChemin());
  const statutParExercice = await indexerStatuts(base);

  const entrees: EntreeGalerie[] = [];
  for (const fichier of exercicesAvecChemin()) {
    const entree = versEntree(fichier, regionParNoeud, statutParExercice);
    if (entree !== null) {
      entrees.push(entree);
    }
  }

  return construireCatalogue(entrees);
}
