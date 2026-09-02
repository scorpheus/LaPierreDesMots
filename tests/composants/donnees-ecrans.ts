/**
 * Les fixtures partagées des dix tests d'écran — lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * Trois écrans montrent le MÊME monde sous trois angles : la carte, le coffre, la pastille de
 * sortie posée sur l'écran des profils. Écrire trois mondes différents, c'est se donner trois
 * occasions de les faire diverger — et un test qui décrit un monde qui n'existe pas garde un
 * comportement que personne ne joue. Un seul monde, ici, et les trois écrans le regardent.
 *
 * Ce fichier n'est pas une suite : `vitest.config.ts` ne collecte que
 * `tests/composants/**\/*.test.{ts,tsx}`.
 *
 * ⚠ CE MONDE EST DÉLIBÉRÉMENT INÉGAL. Deux régions ouvertes dont une terminée, deux voilées,
 * un Éclat obtenu sur six, un objet placé sur deux : c'est ce contraste qui rend les
 * assertions capables d'échouer. Un monde où tout vaut la même chose laisserait passer
 * n'importe quelle constante — c'est la forme exacte des mutants M23 et M24.
 */
import type { EtatMonde, Profil } from '@pierre/partage';

/** Un profil, tel que `GET /api/profils` en rend un. */
export function profilDeTest(id = 'prf-1', prenom = 'Alma'): Profil {
  return {
    id,
    prenom,
    avatar: { teinte: 'bleu' },
    paletteVariante: 'clairiere',
    creeLe: '2026-09-01T08:00:00.000Z',
    dernierAccesLe: '2026-09-01T08:00:00.000Z'
  } as unknown as Profil;
}

/**
 * Le monde de référence des tests d'écran.
 *
 * `clairiere` : ouverte, terminée, Éclat obtenu, 100 % recoloriée.
 * `galeries`  : ouverte, en cours, 40 % recoloriée, aucun Éclat.
 * les quatre autres : voilées, 0 %, aucun nœud livré pour deux d'entre elles.
 */
export function mondeDeTest(): EtatMonde {
  return {
    carte: {
      ouvertesEnParallele: 2,
      regions: [
        {
          region: 'clairiere',
          ordre: 1,
          ouverte: true,
          pourcentageColorie: 1,
          eclatObtenuLe: '2026-09-01T08:00:00.000Z',
          compagnon: 'filou',
          noeuds: ['clairiere-01', 'clairiere-02']
        },
        {
          region: 'galeries',
          ordre: 2,
          ouverte: true,
          pourcentageColorie: 0.4,
          eclatObtenuLe: null,
          compagnon: 'brume',
          noeuds: ['galeries-01', 'galeries-02', 'galeries-03']
        },
        {
          region: 'marais-jumeau',
          ordre: 3,
          ouverte: false,
          pourcentageColorie: 0,
          eclatObtenuLe: null,
          compagnon: 'echo',
          noeuds: ['marais-jumeau-01']
        },
        {
          region: 'foret-muette',
          ordre: 4,
          ouverte: false,
          pourcentageColorie: 0,
          eclatObtenuLe: null,
          compagnon: 'sylve',
          noeuds: []
        },
        {
          region: 'volcan',
          ordre: 5,
          ouverte: false,
          pourcentageColorie: 0,
          eclatObtenuLe: null,
          compagnon: 'braise',
          noeuds: []
        },
        {
          region: 'cite-des-histoires',
          ordre: 6,
          ouverte: false,
          pourcentageColorie: 0,
          eclatObtenuLe: null,
          compagnon: 'conteur',
          noeuds: []
        }
      ]
    },
    gobi: {
      stade: 'crete',
      formeActive: 'ou',
      formes: [
        {
          grapheme: 'ou',
          libelle: 'Gobi-OU',
          cristal: 'assets/gobi/cristal-base.svg',
          obtenueLe: '2026-09-01T08:00:00.000Z'
        }
      ]
    },
    compagnons: [
      {
        code: 'filou',
        libelle: 'Filou',
        valeur: 'La malice',
        domaine: 'Mots outils',
        region: 'clairiere',
        asset: 'assets/compagnons/filou.png',
        rallieLe: '2026-09-01T08:00:00.000Z'
      }
    ],
    campement: [
      {
        code: 'fanion-clairiere',
        libelle: 'le fanion de la Clairière',
        asset: 'habillages/campement/campement.svg',
        region: 'clairiere',
        placeLe: '2026-09-01T08:00:00.000Z'
      },
      {
        code: 'lanterne-galeries',
        libelle: 'la lanterne des Galeries',
        asset: 'habillages/campement/campement.svg',
        region: 'galeries',
        placeLe: null
      }
    ]
  } as unknown as EtatMonde;
}

/** Combien de régions du monde de référence ont leur Éclat. Dérivé, jamais recopié. */
export function nbEclatsAttendus(): number {
  return mondeDeTest().carte.regions.filter((region) => region.eclatObtenuLe !== null).length;
}
