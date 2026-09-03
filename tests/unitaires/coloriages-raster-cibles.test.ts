/**
 * Les masques de coloriage doivent suivre les objets réellement visibles dans les rasters.
 *
 * Ce test ne juge pas l'esthétique de l'image. Il verrouille les quatre erreurs mesurables qui
 * rendaient ces scènes injouables : objet absent de la consigne, cible hors de son repère raster,
 * centroïde hors du tracé et couleur annoncée différente de la couleur attendue.
 */
import { describe, expect, it } from 'vitest';

import {
  elementsDessines,
  pointDansRegion,
  polygonesDuChemin,
} from '../../scripts/verifier-regions-fermees.mjs';
import { lireJson, lireTexte } from '../configuration/preparation.js';

type Boite = readonly [xmin: number, ymin: number, xmax: number, ymax: number];

interface RegionHabillage {
  readonly id: string;
  readonly centroide: readonly [number, number];
}

interface HabillageColorie {
  readonly scene: {
    readonly calques: readonly {
      readonly regions: readonly RegionHabillage[];
    }[];
  };
  readonly palette: { readonly nuancier: readonly string[] };
}

interface ExerciceColorie {
  readonly jeu: {
    readonly contenu: {
      readonly consignes: readonly {
        readonly texte: string;
        readonly cibles: readonly { readonly region: string; readonly couleur: string }[];
      }[];
    };
  };
}

interface CibleAttendue {
  readonly region: string;
  readonly mot: string;
  readonly couleur: string;
  readonly boite: Boite;
}

interface SceneAttendue {
  readonly nom: string;
  readonly exercice: string;
  readonly habillage: string;
  readonly svg: string;
  readonly cibles: readonly CibleAttendue[];
}

const SCENES: readonly SceneAttendue[] = [
  {
    nom: 'le tapis de feuilles',
    exercice: 'contenu/exercices/foret-muette/tapis-colorie-01.json',
    habillage: 'contenu/habillages/foret-muette/tapis.habillage.json',
    svg: 'contenu/habillages/foret-muette/tapis.svg',
    cibles: [
      { region: 'gland-du-tapis', mot: 'gland', couleur: 'brun', boite: [460, 350, 520, 410] },
      { region: 'feuille-du-tapis-un', mot: 'feuille', couleur: 'noir', boite: [120, 300, 250, 395] },
      { region: 'feuille-du-tapis-deux', mot: 'feuille', couleur: 'violet', boite: [360, 350, 460, 435] },
      { region: 'feuille-du-tapis-trois', mot: 'feuille', couleur: 'vert', boite: [430, 390, 580, 490] },
      { region: 'feuille-haute', mot: 'feuille', couleur: 'rouge', boite: [540, 285, 660, 370] },
      { region: 'feuille-basse', mot: 'feuille', couleur: 'jaune', boite: [600, 500, 740, 590] },
      { region: 'feuille-du-tapis-quatre', mot: 'feuille', couleur: 'orange', boite: [710, 410, 840, 500] },
    ],
  },
  {
    nom: 'la berge dans la brume',
    exercice: 'contenu/exercices/marais-jumeau/brume-colorie-01.json',
    habillage: 'contenu/habillages/marais-jumeau/brume.habillage.json',
    svg: 'contenu/habillages/marais-jumeau/brume.svg',
    cibles: [
      { region: 'caillou', mot: 'caillou', couleur: 'brun', boite: [460, 480, 580, 570] },
      { region: 'saule-de-la-berge', mot: 'saule', couleur: 'noir', boite: [0, 0, 390, 300] },
      { region: 'roue', mot: 'escargot', couleur: 'rose', boite: [190, 490, 310, 580] },
      { region: 'nenuphar-perdu', mot: 'nénuphar', couleur: 'jaune', boite: [700, 420, 800, 520] },
      { region: 'route', mot: 'ponton', couleur: 'rouge', boite: [500, 290, 850, 380] },
      { region: 'barque-echouee', mot: 'barque', couleur: 'orange', boite: [80, 270, 370, 450] },
      { region: 'ciel', mot: 'ciel', couleur: 'bleu', boite: [400, 0, 780, 130] },
    ],
  },
  {
    nom: 'la forge',
    exercice: 'contenu/exercices/volcan/forge-colorie-01.json',
    habillage: 'contenu/habillages/volcan/forge.habillage.json',
    svg: 'contenu/habillages/volcan/forge.svg',
    cibles: [
      { region: 'seau', mot: 'seau', couleur: 'bleu', boite: [820, 340, 930, 480] },
      { region: 'marteau-de-forge', mot: 'marteau', couleur: 'noir', boite: [470, 330, 610, 450] },
      { region: 'enclume', mot: 'enclume', couleur: 'rouge', boite: [270, 200, 590, 350] },
      { region: 'billot', mot: 'billot', couleur: 'brun', boite: [300, 300, 540, 440] },
      { region: 'rideau', mot: 'cristal', couleur: 'violet', boite: [800, 430, 950, 600] },
      { region: 'tableau', mot: 'lanterne', couleur: 'jaune', boite: [50, 100, 170, 260] },
      { region: 'drapeau', mot: 'cristal', couleur: 'rose', boite: [60, 70, 160, 230] },
      { region: 'feu', mot: 'feu', couleur: 'orange', boite: [580, 430, 720, 550] },
    ],
  },
  {
    nom: 'la fresque murale',
    exercice: 'contenu/exercices/cite-des-histoires/fresque-murale-colorie-01.json',
    habillage: 'contenu/habillages/cite-des-histoires/fresque-murale.habillage.json',
    svg: 'contenu/habillages/cite-des-histoires/fresque-murale.svg',
    cibles: [
      { region: 'fleur', mot: 'fleur', couleur: 'rouge', boite: [0, 450, 120, 560] },
      { region: 'feuille', mot: 'feuille', couleur: 'vert', boite: [0, 440, 160, 590] },
      { region: 'soleil', mot: 'médaillon', couleur: 'jaune', boite: [420, 20, 540, 140] },
      { region: 'pot', mot: 'pot', couleur: 'brun', boite: [780, 500, 870, 590] },
      { region: 'mur', mot: 'mur', couleur: 'rose', boite: [550, 320, 750, 440] },
      { region: 'arbre', mot: 'arbre', couleur: 'orange', boite: [390, 120, 560, 340] },
      { region: 'porte', mot: 'porte', couleur: 'violet', boite: [900, 200, 960, 450] },
      { region: 'ciel', mot: 'ciel', couleur: 'bleu', boite: [370, 0, 700, 120] },
    ],
  },
];

function dansBoite([x, y]: readonly [number, number], [xmin, ymin, xmax, ymax]: Boite): boolean {
  return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
}

describe.each(SCENES)('$nom : les cibles suivent le raster', (scene) => {
  const exercice = lireJson<ExerciceColorie>(scene.exercice);
  const habillage = lireJson<HabillageColorie>(scene.habillage);
  const regions = new Map(
    habillage.scene.calques.flatMap((calque) => calque.regions).map((region) => [region.id, region]),
  );
  const traces = new Map(
    (elementsDessines(lireTexte(scene.svg)) as readonly { id: string | null; d: string | null }[])
      .filter((element): element is { id: string; d: string } => element.id !== null && element.d !== null)
      .map((element) => [element.id, element.d]),
  );
  const consignes = exercice.jeu.contenu.consignes;

  it('nomme exactement les objets visibles et leur couleur', () => {
    expect(consignes).toHaveLength(scene.cibles.length);
    expect(consignes.flatMap((consigne) => consigne.cibles).map((cible) => cible.region)).toEqual(
      scene.cibles.map((cible) => cible.region),
    );

    scene.cibles.forEach((attendue, index) => {
      const consigne = consignes[index]!;
      expect(consigne.texte.toLocaleLowerCase('fr-FR')).toContain(attendue.mot);
      expect(consigne.texte.toLocaleLowerCase('fr-FR')).toContain(attendue.couleur);
      expect(consigne.cibles).toEqual([{ region: attendue.region, couleur: attendue.couleur }]);
      expect(habillage.palette.nuancier).toContain(attendue.couleur);
    });
  });

  it('place chaque centroïde dans le tracé et sur le repère raster audité', () => {
    for (const attendue of scene.cibles) {
      const region = regions.get(attendue.region);
      const d = traces.get(attendue.region);
      expect(region, attendue.region).toBeDefined();
      expect(d, attendue.region).toBeDefined();
      expect(dansBoite(region!.centroide, attendue.boite), attendue.region).toBe(true);
      expect(
        pointDansRegion(polygonesDuChemin(d!)!, region!.centroide),
        attendue.region,
      ).toBe(true);
    }
  });
});
