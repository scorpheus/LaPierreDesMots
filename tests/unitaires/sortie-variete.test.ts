/**
 * R13 et la VARIÉTÉ D'UNE SORTIE À L'AUTRE — lot N8, mesuré sur le contenu réel.
 *
 * R13 (v2 § 15) : « Une sortie complète ne rejoue jamais deux fois le même habillage. »
 * v2 § 5.2, ligne 143 : « Campement → choix de région → **4 à 6 nœuds enchaînés** → … »
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QUE CE FICHIER MESURE ET QUE `selecteur.test.ts` NE MESURAIT PAS.
 *
 * `tests/unitaires/selecteur.test.ts` prouve P9 à P12 sur des entrées ENGENDRÉES par
 * fast-check. C'est la bonne épreuve pour la mécanique, et elle reste. Mais un sélecteur peut
 * satisfaire P9 à P12 sur des viviers inventés et rendre, sur le contenu RÉELLEMENT livré,
 * **la même sortie à chaque passage** — mêmes nœuds, même ordre, même longueur. Aucune
 * propriété existante ne l'attrape, et c'est pourtant ce que l'enfant verrait.
 *
 * Mesuré au démarrage du lot N8, avant toute modification : `n = min(nbNoeudsMax,
 * vivier.length)` — la longueur d'une sortie était CONSTANTE, `nbNoeudsMin` était déclaré
 * dans `contenu/referentiel/parametres-pedagogie.json` et **lu par personne**
 * (`grep -rn nbNoeudsMin partage/src` : `types.ts` et `parametres.ts`, jamais `selecteur.ts`).
 * L'échauffement était toujours le premier du tri canonique et la synthèse toujours le
 * dernier : sur six nœuds de difficultés 1,1,1,1,2,2 l'ouverture et la clôture ne bougeaient
 * jamais.
 *
 * Les entrées viennent d'ici : `contenu/noeuds/*.json`, `contenu/exercices/**` et
 * `contenu/referentiel/parametres-pedagogie.json`. **Aucune fixture inventée** — une variété
 * prouvée sur des nœuds fabriqués ne dirait rien du jeu livré.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { creerAlea } from '@pierre/partage';
import { composerSortie } from '@partage/pedagogie/selecteur.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';

import { INSTANT_DE_REFERENCE, RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

import type {
  Competence, EntreeSelecteur, EtatMaitrise, Exercice, NoeudCandidat, PlanSortie,
} from '@pierre/partage';

interface NoeudLu {
  readonly id: string;
  readonly region: string;
  readonly ordre: number;
  readonly exercice: string;
  readonly prerequis: readonly string[];
  readonly temps: NoeudCandidat['temps'];
}

const PARAMETRES = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json'),
);
const CONTRAINTES = PARAMETRES.selecteur;

const COMPETENCES = lireJson<readonly Competence[]>('contenu/referentiel/competences.json');

function fichiersDe(dossierRelatif: string): readonly string[] {
  return readdirSync(join(RACINE_DEPOT, dossierRelatif)).filter((f) => f.endsWith('.json'));
}

const NOEUDS: readonly NoeudLu[] = fichiersDe('contenu/noeuds').map((f) =>
  lireJson<NoeudLu>(`contenu/noeuds/${f}`),
);

/** Tous les exercices livrés, indexés par identifiant — la seule source de l'habillage. */
const EXERCICES = new Map<string, Exercice>(
  (['clairiere', 'galeries'] as const).flatMap((region) =>
    fichiersDe(`contenu/exercices/${region}`).map((f) => {
      const exercice = lireJson<Exercice>(`contenu/exercices/${region}/${f}`);
      return [exercice.id, exercice] as const;
    }),
  ),
);

/** Les candidats d'une région, tels que le serveur les construirait depuis le disque. */
function candidatsDe(region: string): readonly NoeudCandidat[] {
  return NOEUDS.filter((n) => n.region === region).map((noeud) => {
    const exercice = EXERCICES.get(noeud.exercice);
    if (exercice === undefined) {
      throw new Error(`nœud ${noeud.id} : exercice « ${noeud.exercice} » introuvable sur disque`);
    }
    return {
      noeud: noeud.id,
      habillage: exercice.jeu.habillage,
      region,
      competences: exercice.competences,
      difficulte: exercice.difficulte,
      temps: noeud.temps,
    } satisfies NoeudCandidat;
  });
}

/** Tout est acquis : on mesure la composition, pas le filtrage — P11 s'en charge ailleurs. */
const MAITRISES: readonly EtatMaitrise[] = COMPETENCES.map((competence) => ({
  competence: competence.code,
  p: 1,
  nbTentatives: 9,
  joursDistincts: ['2026-08-01', '2026-08-02', '2026-08-03'],
  nbTentativesFaibleDevinette: 3,
  acquiseLe: null,
}));

function entreeDe(region: string): EntreeSelecteur {
  return {
    profil: 'profil-test',
    region,
    compagnon: null,
    maitrises: MAITRISES,
    revisionsDues: [],
    noeudsDisponibles: candidatsDe(region),
    competences: COMPETENCES,
    maintenant: INSTANT_DE_REFERENCE,
  };
}

/** 60 passages : c'est le nombre de sorties qu'un enfant peut faire en quelques semaines. */
const NB_PASSAGES = 60;

function passages(region: string): readonly PlanSortie[] {
  const plans: PlanSortie[] = [];
  for (let graine = 1; graine <= NB_PASSAGES; graine += 1) {
    plans.push(composerSortie(entreeDe(region), PARAMETRES, creerAlea(graine)));
  }
  return plans;
}

/** La signature d'une sortie : ses nœuds, dans l'ordre. Deux sorties égales ont la même. */
function signature(plan: PlanSortie): string {
  return plan.etapes.map((etape) => etape.noeud).join('>');
}

const REGIONS = ['clairiere', 'galeries'] as const;

describe('les deux régions ouvertes portent de quoi composer une vraie sortie (D38)', () => {
  for (const region of REGIONS) {
    it(`${region} — au moins ${String(CONTRAINTES.nbNoeudsMin)} nœuds livrés`, () => {
      const candidats = candidatsDe(region);
      expect(
        candidats.length,
        `${region} : ${String(candidats.length)} nœud(s) — ` +
          `${candidats.map((c) => c.noeud).join(', ')}`,
      ).toBeGreaterThanOrEqual(CONTRAINTES.nbNoeudsMin);
    });

    it(`${region} — assez d'habillages DISTINCTS pour ${String(CONTRAINTES.nbNoeudsMin)} nœuds (R13)`, () => {
      // R13 dédoublonne par habillage AVANT de choisir la longueur : une région de six nœuds
      // sur trois habillages ne peut pas composer une sortie de quatre, quoi qu'on fasse.
      const habillages = new Set(candidatsDe(region).map((c) => c.habillage));
      expect(
        habillages.size,
        `${region} : ${String(habillages.size)} habillage(s) distinct(s) — ` +
          `${[...habillages].sort().join(', ')}`,
      ).toBeGreaterThanOrEqual(CONTRAINTES.nbNoeudsMin);
    });
  }
});

describe('R13 — jamais deux fois le même habillage dans une sortie, sur le contenu réel', () => {
  for (const region of REGIONS) {
    it(`${region} — 0 habillage répété sur ${String(NB_PASSAGES)} passages`, () => {
      const fautives = passages(region).filter((plan) => {
        const habillages = plan.etapes.map((e) => e.habillage);
        return new Set(habillages).size !== habillages.length;
      });
      expect(fautives.map(signature)).toEqual([]);
    });
  }
});

describe('une sortie porte de 4 à 6 nœuds (v2 § 5.2)', () => {
  for (const region of REGIONS) {
    it(`${region} — chaque passage tient dans [${String(CONTRAINTES.nbNoeudsMin)}, ${String(CONTRAINTES.nbNoeudsMax)}]`, () => {
      for (const plan of passages(region)) {
        expect(plan.etapes.length, signature(plan)).toBeGreaterThanOrEqual(CONTRAINTES.nbNoeudsMin);
        expect(plan.etapes.length, signature(plan)).toBeLessThanOrEqual(CONTRAINTES.nbNoeudsMax);
      }
    });
  }
});

describe('LA VARIÉTÉ — deux passages ne se ressemblent pas', () => {
  for (const region of REGIONS) {
    it(`${region} — la LONGUEUR varie d'un passage à l'autre`, () => {
      // Le défaut mesuré avant N8 : `n = min(nbNoeudsMax, vivier.length)`, donc une seule
      // longueur possible, donc `nbNoeudsMin` décoratif. Une sortie toujours de six nœuds
      // n'est pas « 4 à 6 nœuds », c'est « 6 nœuds ».
      const longueurs = new Set(passages(region).map((plan) => plan.etapes.length));
      expect(
        longueurs.size,
        `${region} : longueurs observées ${[...longueurs].sort().join(', ')}`,
      ).toBeGreaterThanOrEqual(2);
    });

    it(`${region} — l'OUVERTURE n'est pas toujours le même nœud`, () => {
      // Sinon l'enfant rejoue le même exercice d'échauffement à chaque sortie, et
      // l'échauffement est justement celui qu'il voit le plus souvent.
      const ouvertures = new Set(passages(region).map((plan) => plan.etapes[0]?.noeud));
      expect(ouvertures.size, `${region} : ${[...ouvertures].join(', ')}`).toBeGreaterThanOrEqual(2);
    });

    it(`${region} — au moins 15 compositions distinctes sur ${String(NB_PASSAGES)} passages`, () => {
      // Le seuil est posé SOUS la mesure, pas dessus : mesuré à la livraison de N8,
      // clairiere = 56/60 et galeries = 39/60 compositions distinctes. Quinze est la borne
      // en dessous de laquelle une semaine de jeu redevient la même journée répétée. Le
      // compte réel est imprimé, pas seulement le verdict — un chiffre qui rase le seuil se
      // voit, et c'est ce qu'on veut lire le jour où il baisse.
      const distinctes = new Set(passages(region).map(signature));
      expect(
        distinctes.size,
        `${region} : ${String(distinctes.size)} composition(s) distincte(s) sur ` +
          `${String(NB_PASSAGES)} passages`,
      ).toBeGreaterThanOrEqual(15);
    });
  }
});

describe('AUCUN NŒUD LIVRÉ N’EST INATTEIGNABLE — le défaut que N8 a mesuré et corrigé', () => {
  // `clairiere-sortie-complete.test.ts` traque l'exercice qu'aucun nœud ne cite. Le même
  // défaut existait un cran plus loin, invisible à ce test-là : un nœud CITÉ, valide, et que
  // le sélecteur écartait de toutes les sorties.
  //
  // Mesuré avant correction : `galeries-06` partage `galeries.cristal` avec `galeries-03` ;
  // la déduplication par habillage gardait le premier de l'ordre canonique, donc toujours
  // `galeries-03`. Sur 60 passages, `galeries-06` sortait 0 fois. L'axe b/p — la confusion
  // que le père a rapportée — n'était jouable par aucun enfant.
  for (const region of REGIONS) {
    it(`${region} — chaque nœud apparaît dans au moins une sortie sur ${String(NB_PASSAGES)}`, () => {
      const vus = new Set(passages(region).flatMap((plan) => plan.etapes.map((e) => e.noeud)));
      const jamaisVus = candidatsDe(region)
        .map((candidat) => candidat.noeud)
        .filter((noeud) => !vus.has(noeud));
      expect(
        jamaisVus,
        `${region} : ${String(vus.size)} nœud(s) atteint(s) sur ` +
          `${String(candidatsDe(region).length)} livré(s)`,
      ).toEqual([]);
    });
  }
});

describe('la variété ne coûte pas le déterminisme — `test:rejeu` doit rester interprétable', () => {
  for (const region of REGIONS) {
    it(`${region} — même graine, même plan`, () => {
      for (const graine of [1, 17, 42]) {
        const a = composerSortie(entreeDe(region), PARAMETRES, creerAlea(graine));
        const b = composerSortie(entreeDe(region), PARAMETRES, creerAlea(graine));
        expect(b).toEqual(a);
      }
    });
  }

  it('l’ordre d’arrivée des nœuds sur le disque ne change pas la sortie', () => {
    // Le tri canonique est ce qui rend le plan indépendant de l'ordre de lecture du dossier.
    const entree = entreeDe('clairiere');
    const inverse: EntreeSelecteur = {
      ...entree,
      noeudsDisponibles: [...entree.noeudsDisponibles].reverse(),
    };
    for (const graine of [3, 11]) {
      expect(
        signature(composerSortie(inverse, PARAMETRES, creerAlea(graine))),
      ).toBe(signature(composerSortie(entree, PARAMETRES, creerAlea(graine))));
    }
  });
});

describe('toute sortie s’ouvre sur un échauffement et se ferme sur une synthèse (R14)', () => {
  for (const region of REGIONS) {
    it(`${region} — sur ${String(NB_PASSAGES)} passages`, () => {
      for (const plan of passages(region)) {
        expect(plan.etapes[0]?.role, signature(plan)).toBe('echauffement');
        expect(plan.etapes[plan.etapes.length - 1]?.role, signature(plan)).toBe('synthese');
      }
    });
  }

  for (const region of REGIONS) {
    it(`${region} — l'échauffement est parmi les plus faciles, la synthèse parmi les plus durs`, () => {
      // La variété ne doit pas retourner le trajet de la v2 § 5.2 : « nœud 1 échauffement,
      // réussite quasi certaine … nœud final un peu plus corsé ». On tire DANS le palier de
      // difficulté, jamais au travers.
      const candidats = candidatsDe(region);
      const difficulteMin = Math.min(...candidats.map((c) => c.difficulte));
      const difficulteMax = Math.max(...candidats.map((c) => c.difficulte));
      const parNoeud = new Map(candidats.map((c) => [c.noeud, c.difficulte]));

      for (const plan of passages(region)) {
        const ouverture = plan.etapes[0];
        const cloture = plan.etapes[plan.etapes.length - 1];
        expect(parNoeud.get(ouverture?.noeud ?? ''), signature(plan)).toBe(difficulteMin);
        expect(parNoeud.get(cloture?.noeud ?? ''), signature(plan)).toBe(difficulteMax);
      }
    });
  }
});
