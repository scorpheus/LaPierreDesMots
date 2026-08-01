/**
 * La carte du monde : ouverture des régions, parallélisme dès la troisième, et l'invariant
 * qui vaut partout — **rien ne décroît** (v2 § 3.3, R14). Lot L2-F.
 *
 * Le référentiel `contenu/monde/regions.json` est lu SUR DISQUE : les six régions et leur
 * ordre sont une donnée, pas une constante recopiée dans le test.
 */
import { describe, expect, it } from 'vitest';

import {
  appliquerEclat,
  carteInitiale,
  etatAfficheRegion,
  paralleleDuDocument,
  recalculerRecoloration,
  regionsDuDocument,
  regionsOuvertes
} from '@partage/monde/carte.js';
import type { DefinitionRegion } from '@partage/monde/carte.js';
import type { EtatCarte } from '@partage/monde/types.js';

import { CHEMIN_COMPETENCES, lireJson } from '../configuration/preparation.js';

const DOCUMENT: unknown = lireJson('contenu/monde/regions.json');
const DEFINITIONS: readonly DefinitionRegion[] = regionsDuDocument(DOCUMENT);
const PARALLELE = paralleleDuDocument(DOCUMENT);
const QUAND = '2026-09-01T08:00:00.000Z';

function neuve(): EtatCarte {
  return carteInitiale(DEFINITIONS, PARALLELE);
}

/** Enchaîne les Éclats dans l'ordre de progression, et rend la carte après chacun. */
function apresEclats(nombre: number): EtatCarte {
  let carte = neuve();
  for (let rang = 1; rang <= nombre; rang += 1) {
    const region = DEFINITIONS.find((definition) => definition.ordre === rang);
    carte = appliquerEclat(carte, region!.region, QUAND);
  }
  return carte;
}

describe('le référentiel des régions', () => {
  it('déclare les six régions de la v2 § 3.3, dans l’ordre de la progression phonologique', () => {
    expect(DEFINITIONS.map((definition) => definition.region)).toEqual([
      'clairiere',
      'galeries',
      'marais-jumeau',
      'foret-muette',
      'volcan',
      'cite-des-histoires'
    ]);
  });

  it('ne cite aucune compétence absente du référentiel — objet protégé (annexe P § 6.4)', () => {
    const connues = new Set(
      lireJson<{ readonly code: string }[]>(CHEMIN_COMPETENCES).map((entree) => entree.code)
    );
    const inventees = DEFINITIONS.flatMap((definition) =>
      definition.competences.filter((code) => !connues.has(String(code)))
    );
    expect(inventees).toEqual([]);
  });

  it('refuse un document dont l’ordre a un trou', () => {
    expect(() =>
      regionsDuDocument({ regions: [{ region: 'clairiere', ordre: 2, noeuds: [] }] })
    ).toThrow(/ordre/u);
  });
});

describe('contenu/schemas/monde.schema.json — les QUATRE documents du monde', () => {
  // Un seul fichier de schéma pour quatre documents : c'est ce que le § 3.6 accorde à L2-F, et
  // un lot n'invente pas un fichier absent de l'arborescence (§ 0). Le `oneOf` se décide sur la
  // clé racine ; ce test le prouve document par document, sinon un `oneOf` qui accepterait tout
  // ne validerait rien.
  const documents = [
    'contenu/monde/regions.json',
    'contenu/monde/campement.json',
    'contenu/monde/gobi-stades.json',
    'contenu/monde/compagnons.json'
  ];

  it.each(documents)('%s satisfait le schéma', async (chemin) => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const construire = Ajv2020 as unknown as new (o?: Record<string, unknown>) => {
      compile(schema: unknown): ((donnees: unknown) => boolean) & { errors?: unknown };
    };
    const valider = new construire({ allErrors: true, strict: false }).compile(
      lireJson('contenu/schemas/monde.schema.json')
    );
    const ok = valider(lireJson(chemin));
    expect(JSON.stringify(valider.errors ?? [])).toBe('[]');
    expect(ok).toBe(true);
  });

  it('refuse un campement amputé sous les 25 points de R11', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const construire = Ajv2020 as unknown as new (o?: Record<string, unknown>) => {
      compile(schema: unknown): (donnees: unknown) => boolean;
    };
    const valider = new construire({ allErrors: true, strict: false }).compile(
      lireJson('contenu/schemas/monde.schema.json')
    );
    const ampute = lireJson<{ points: unknown[] }>('contenu/monde/campement.json');
    expect(valider({ ...ampute, points: ampute.points.slice(0, 10) })).toBe(false);
  });
});

describe('regionsOuvertes — une seule région, puis deux dès la troisième', () => {
  it('n’en propose qu’une au départ : la Clairière', () => {
    expect(regionsOuvertes(neuve())).toEqual(['clairiere']);
  });

  it('en propose deux dès qu’une région de rang ≥ 3 est en jeu', () => {
    const ouvertes = regionsOuvertes(apresEclats(1));
    expect(ouvertes).toHaveLength(PARALLELE);
    expect(ouvertes).toEqual(['galeries', 'marais-jumeau']);
  });

  it('ne propose jamais plus que le parallélisme déclaré, même très avancé', () => {
    for (let rang = 0; rang <= DEFINITIONS.length; rang += 1) {
      expect(regionsOuvertes(apresEclats(rang)).length).toBeLessThanOrEqual(PARALLELE);
    }
  });

  it('ne propose plus rien quand les six Éclats sont obtenus — et ne lève pas', () => {
    expect(regionsOuvertes(apresEclats(DEFINITIONS.length))).toEqual([]);
  });

  it('ne propose jamais une région dont l’Éclat est déjà obtenu', () => {
    const carte = apresEclats(2);
    expect(regionsOuvertes(carte)).not.toContain('clairiere');
    expect(regionsOuvertes(carte)).not.toContain('galeries');
  });
});

describe('appliquerEclat — un acquis n’est jamais repris (R14)', () => {
  it('pose la date d’Éclat et porte la recoloration à 1', () => {
    const carte = appliquerEclat(neuve(), 'clairiere', QUAND);
    const clairiere = carte.regions.find((region) => region.region === 'clairiere')!;
    expect(clairiere.eclatObtenuLe).toBe(QUAND);
    expect(clairiere.pourcentageColorie).toBe(1);
  });

  it('est idempotent : le PREMIER Éclat fait foi, un second ne réécrit pas la date', () => {
    const une = appliquerEclat(neuve(), 'clairiere', QUAND);
    const deux = appliquerEclat(une, 'clairiere', '2027-01-01T00:00:00.000Z');
    expect(deux.regions.find((r) => r.region === 'clairiere')!.eclatObtenuLe).toBe(QUAND);
    expect(deux.regions.filter((r) => r.ouverte).length).toBe(une.regions.filter((r) => r.ouverte).length);
  });

  it('ne referme jamais une région déjà ouverte, quel que soit l’ordre des Éclats', () => {
    let carte = neuve();
    const ouvertes = new Set<string>();
    for (const definition of DEFINITIONS) {
      carte = appliquerEclat(carte, definition.region, QUAND);
      for (const region of carte.regions.filter((entree) => entree.ouverte)) {
        ouvertes.add(String(region.region));
      }
      const encoreOuvertes = new Set(
        carte.regions.filter((entree) => entree.ouverte).map((entree) => String(entree.region))
      );
      for (const deja of ouvertes) {
        expect(encoreOuvertes.has(deja)).toBe(true);
      }
    }
  });

  it('refuse une région que la carte ne connaît pas, au lieu de l’ignorer en silence', () => {
    expect(() => appliquerEclat(neuve(), 'vallee-des-rois' as never, QUAND)).toThrow();
  });
});

describe('recalculerRecoloration', () => {
  const clairiere = () => neuve().regions.find((region) => region.region === 'clairiere')!;

  it('rend la part des nœuds terminés', () => {
    expect(recalculerRecoloration(clairiere(), ['clairiere-01']).pourcentageColorie).toBe(1);
    expect(recalculerRecoloration(clairiere(), []).pourcentageColorie).toBe(0);
  });

  it('ignore un nœud terminé qui n’appartient pas à la région', () => {
    expect(recalculerRecoloration(clairiere(), ['volcan-07']).pourcentageColorie).toBe(0);
  });

  it('ne décroît jamais : un retrait de nœud ne dépeint pas la carte', () => {
    const peinte = recalculerRecoloration(clairiere(), ['clairiere-01']);
    expect(recalculerRecoloration(peinte, []).pourcentageColorie).toBe(1);
  });

  it('laisse intacte une région sans nœud plutôt que de diviser par zéro', () => {
    const volcan = neuve().regions.find((region) => region.region === 'volcan')!;
    expect(recalculerRecoloration(volcan, ['clairiere-01']).pourcentageColorie).toBe(0);
  });
});

describe('etatAfficheRegion — la prise de `data-region-etat`', () => {
  it('rend les trois valeurs attendues, et rien d’autre', () => {
    const carte = apresEclats(1);
    const par = (code: string) =>
      etatAfficheRegion(carte.regions.find((region) => region.region === code)!);
    expect(par('clairiere')).toBe('terminee');
    expect(par('galeries')).toBe('ouverte');
    expect(par('volcan')).toBe('voilee');
  });

  it('classe les six régions d’une carte neuve en une ouverte et cinq voilées', () => {
    const etats = neuve().regions.map(etatAfficheRegion);
    expect(etats.filter((etat) => etat === 'ouverte')).toHaveLength(1);
    expect(etats.filter((etat) => etat === 'voilee')).toHaveLength(5);
    expect(etats.filter((etat) => etat === 'terminee')).toHaveLength(0);
  });
});
