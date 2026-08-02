/**
 * La carte du monde — v2 § 3.3 et § 9.4. Lot L2-F, contrat des features v2 § 4.5.
 *
 * L'élément signature du jeu : « les régions conquises en couleur, les régions grises encore
 * voilées d'un brouillard mouvant, et le chemin qui se dessine à l'encre ». Ce module ne
 * dessine rien — il tient l'ÉTAT que le dessin donne à voir, et il le tient avec un seul
 * invariant, appliqué partout : **rien ne décroît**.
 *
 * `pourcentageColorie` prend un maximum, `eclatObtenuLe` prend le premier posé, une région
 * ouverte ne se referme jamais. C'est la traduction de « un acquis n'est jamais repris » (v2
 * § 5.4, R14), la même que `progression_noeud.etoiles` en SQL.
 */

import { ErreurPierre } from '../erreurs.js';
import type { CodeCompetence, CodeRegion, Horodatage, IdNoeud } from '../identifiants.js';
import type { CodeCompagnon } from '../pedagogie/types.js';
import type { EtatCarte, EtatRegion } from './types.js';

/** Une région DÉCLARÉE au référentiel `contenu/monde/regions.json`. */
export interface DefinitionRegion {
  readonly region: CodeRegion;
  readonly ordre: number;
  readonly libelle: string;
  readonly domaine: string;
  readonly ambiance: string;
  readonly competences: readonly CodeCompetence[];
  readonly noeuds: readonly IdNoeud[];
}

/** Le contenu de `contenu/monde/regions.json`. */
export interface DocumentRegions {
  readonly ouvertesEnParallele: number;
  readonly regions: readonly DefinitionRegion[];
}

/** Ce que la carte donne à voir d'une région, et que `data-region-etat` porte. */
export type EtatAfficheRegion = 'voilee' | 'ouverte' | 'terminee';

function objet(valeur: unknown, quoi: string): Readonly<Record<string, unknown>> {
  if (typeof valeur !== 'object' || valeur === null) {
    throw new ErreurPierre('contenu-invalide', `${quoi} n’est pas un objet.`);
  }
  return valeur as Readonly<Record<string, unknown>>;
}

function chaines(valeur: unknown): readonly string[] {
  return Array.isArray(valeur) ? valeur.map((entree) => String(entree)) : [];
}

/**
 * Lit les six régions du document et **refuse plutôt que d'émettre du faux** (C4).
 *
 * L'ordre est vérifié `1..n` sans trou : « l'ordre des six régions **est** l'ordre de la
 * progression phonologique » (CLAUDE.md). Un trou ferait ouvrir la mauvaise région, et le
 * sélecteur de L2-D composerait des sorties dans une région que l'enfant n'a pas atteinte.
 */
export function regionsDuDocument(document: unknown): readonly DefinitionRegion[] {
  const liste = objet(document, 'Le document des régions')['regions'];
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurPierre('contenu-invalide', 'Le document des régions n’en déclare aucune.');
  }

  const regions: DefinitionRegion[] = liste.map((entree, index) => {
    const champs = objet(entree, `La région ${String(index)}`);
    return {
      region: String(champs['region'] ?? '') as CodeRegion,
      ordre: Number(champs['ordre']),
      libelle: String(champs['libelle'] ?? ''),
      domaine: String(champs['domaine'] ?? ''),
      ambiance: String(champs['ambiance'] ?? ''),
      competences: chaines(champs['competences']) as readonly CodeCompetence[],
      noeuds: chaines(champs['noeuds']) as readonly IdNoeud[]
    };
  });

  regions.forEach((region, index) => {
    if (region.ordre !== index + 1) {
      throw new ErreurPierre(
        'contenu-invalide',
        `Région « ${String(region.region)} » : ordre ${String(region.ordre)} au lieu de ` +
          `${String(index + 1)}. L'ordre des régions EST la progression phonologique.`
      );
    }
  });

  return regions;
}

/** Le nombre de régions que la carte laisse ouvertes en parallèle. Jamais moins d'une. */
export function paralleleDuDocument(document: unknown): number {
  const brut = objet(document, 'Le document des régions')['ouvertesEnParallele'];
  const valeur = Number(brut);
  return Number.isFinite(valeur) && valeur >= 1 ? Math.floor(valeur) : 1;
}

/**
 * La carte au départ : la première région ouverte, les cinq autres voilées.
 * `compagnonParRegion` vient de `compagnons.json` ; une région sans compagnon en a `null`.
 */
export function carteInitiale(
  definitions: readonly DefinitionRegion[],
  ouvertesEnParallele: number,
  compagnonParRegion: ReadonlyMap<CodeRegion, CodeCompagnon> = new Map(),
): EtatCarte {
  // D38 — la carte NEUVE passe par `ouvrirCeQuiDoitLEtre`, elle n'ouvre pas elle-même.
  //
  // Cette fonction posait `ouverte: definition.ordre === 1`, donc une seule région sur une
  // partie neuve, quoi qu'en dise `ouvertesEnParallele`. Corriger `regionsOuvertes` sans
  // corriger ceci n'aurait rien changé pour l'enfant : les Galeries seraient restées
  // `ouverte: false`, et une région fermée n'est jamais « en cours », donc jamais proposée.
  //
  // On amorce au seul rang 1 puis on délègue : la règle d'ouverture n'est écrite QU'UNE fois,
  // dans `ouvrirCeQuiDoitLEtre`. Deux implantations de la même règle finiraient par diverger,
  // et c'est exactement ce qui vient d'être payé ici.
  return ouvrirCeQuiDoitLEtre({
    ouvertesEnParallele: Math.max(1, ouvertesEnParallele),
    regions: definitions.map((definition) => ({
      region: definition.region,
      ordre: definition.ordre,
      ouverte: definition.ordre === 1,
      pourcentageColorie: 0,
      eclatObtenuLe: null,
      compagnon: compagnonParRegion.get(definition.region) ?? null,
      noeuds: definition.noeuds
    }))
  });
}

/** Tri stable par ordre de progression. Aucune autre lecture de la carte n'en dépend. */
function parOrdre(regions: readonly EtatRegion[]): readonly EtatRegion[] {
  return [...regions].sort((gauche, droite) => gauche.ordre - droite.ordre);
}

/** Vrai quand la région est ouverte et que son Éclat n'a pas encore été obtenu. */
function enCours(region: EtatRegion): boolean {
  return region.ouverte && region.eclatObtenuLe === null;
}

/**
 * Les régions jouables maintenant : jusqu'à `ouvertesEnParallele`, DÈS LE DÉPART (D38).
 *
 * ── CE QUI A CHANGÉ, ET POURQUOI — corrigé à l'intégration de la campagne N ────────────────
 * Cette fonction portait la règle de la v2 § 3.3, « deux régions en parallèle dès la
 * troisième », implantée par la garde `ouvertes.some((r) => r.ordre >= 3) ? parallele : 1`.
 *
 * **D38 amende explicitement la v2 § 3.3** — c'est écrit dans ses termes
 * (`Docs/journal-des-decisions.md:740`) : « Les deux régions sont ouvertes d'emblée. Amende la
 * v2 § 3.3, qui n'ouvrait deux régions en parallèle qu'à partir de la troisième. » Le journal
 * des décisions est la loi du projet et il est postérieur à la v2 ; la garde était donc du
 * code qui appliquait une règle abrogée.
 *
 * Le motif de D38 est pédagogique et il est opposable : « les Galeries travaillent précisément
 * les confusions `b`/`d`/`p`/`q` dont il a besoin maintenant (D23) ; l'attendre serait lui
 * refuser le contenu le plus utile ».
 *
 * Ce que le défaut coûtait, mesuré et non supposé — `tests/e2e/parcours-sortie-6-noeuds.spec.ts`
 * sur un profil neuf :
 *
 *     [sortie galeries] profil neuf — départs offerts : clairiere
 *
 * Un seul départ. Les six nœuds des Galeries étaient livrés, déclarés dans
 * `contenu/monde/regions.json`, et **inatteignables**. C'est le « dans la clairière je n'ai eu
 * qu'un exercice » du père, vu de l'autre bout.
 *
 * Le parallélisme reste une DONNÉE (`ouvertesEnParallele`, contenu/monde/regions.json), jamais
 * un littéral : passer à trois régions se fait dans le JSON, sans toucher à ce fichier.
 */
export function regionsOuvertes(carte: EtatCarte): readonly CodeRegion[] {
  const ouvertes = parOrdre(carte.regions.filter(enCours));
  return ouvertes.slice(0, Math.max(1, carte.ouvertesEnParallele)).map((region) => region.region);
}

/**
 * Applique l'obtention d'un Éclat : la région est close, la suivante s'ouvre.
 * `pourcentageColorie` ne décroît jamais — même invariant que partout ailleurs (R14).
 *
 * L'appel est **idempotent** : rejouer une région déjà close ne réécrit pas sa date d'Éclat et
 * n'ouvre rien de plus. C'est ce qui rend la projection serveur recalculable sans dériver.
 */
export function appliquerEclat(carte: EtatCarte, region: CodeRegion, quand: string): EtatCarte {
  const cible = carte.regions.find((entree) => entree.region === region);
  if (cible === undefined) {
    throw new ErreurPierre(
      'region-inconnue',
      `La carte ne connaît pas la région « ${String(region)} ».`,
      { region }
    );
  }

  const apresEclat: EtatRegion[] = carte.regions.map((entree) =>
    entree.region === region
      ? {
          ...entree,
          ouverte: true,
          pourcentageColorie: Math.max(entree.pourcentageColorie, 1),
          // Le PREMIER Éclat fait foi : `??`, jamais une affectation.
          eclatObtenuLe: entree.eclatObtenuLe ?? (quand as Horodatage)
        }
      : entree
  );

  return ouvrirCeQuiDoitLEtre({ ...carte, regions: apresEclat });
}

/**
 * Ouvre les régions suivantes tant que le parallélisme le permet. Ne referme jamais rien.
 *
 * Exporté parce que le dépôt serveur reconstruit la carte depuis le journal : après avoir posé
 * les Éclats déduits des nœuds terminés, il doit ouvrir ce qui doit l'être, sans réinventer
 * cette règle de son côté.
 */
export function ouvrirCeQuiDoitLEtre(carte: EtatCarte): EtatCarte {
  const parallele = Math.max(1, carte.ouvertesEnParallele);
  const regions = [...carte.regions];

  for (;;) {
    const suivante = parOrdre(regions).find((region) => !region.ouverte);
    if (suivante === undefined) {
      return { ...carte, regions };
    }
    const nbEnCours = regions.filter(enCours).length;
    // D38 — le seuil est le parallélisme déclaré, à TOUS les rangs. La garde
    // `suivante.ordre >= 3 ? parallele : 1` appliquait la v2 § 3.3, que D38 amende ; elle
    // laissait les Galeries fermées sur un profil neuf. Voir `regionsOuvertes` ci-dessus :
    // les deux fonctions portaient la même règle et devaient donc changer ensemble, sans
    // quoi l'une aurait rouvert ce que l'autre venait de fermer.
    if (nbEnCours >= parallele) {
      return { ...carte, regions };
    }
    const index = regions.findIndex((region) => region.region === suivante.region);
    regions[index] = { ...suivante, ouverte: true };
  }
}

/**
 * Recalcule le taux de recoloration d'une région depuis ses nœuds terminés.
 *
 * Le taux **ne décroît jamais** : `Math.max` avec l'ancien. Une région dont on retirerait un
 * nœud du référentiel ne verrait pas la carte se dépeindre sous les yeux de l'enfant.
 */
export function recalculerRecoloration(
  region: EtatRegion, noeudsTermines: readonly string[],
): EtatRegion {
  if (region.noeuds.length === 0) {
    return region;
  }
  const termines = new Set(noeudsTermines.map((noeud) => String(noeud)));
  const faits = region.noeuds.filter((noeud) => termines.has(String(noeud))).length;
  const taux = faits / region.noeuds.length;
  return { ...region, pourcentageColorie: Math.max(region.pourcentageColorie, taux) };
}

/** Ce que `data-region-etat` porte pour cette région — `carte.spec.ts` n'a pas d'autre prise. */
export function etatAfficheRegion(region: EtatRegion): EtatAfficheRegion {
  if (region.eclatObtenuLe !== null) {
    return 'terminee';
  }
  return region.ouverte ? 'ouverte' : 'voilee';
}
