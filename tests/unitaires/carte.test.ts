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
  conclusionCentraleAccessible,
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

/**
 * D38 — LES DEUX RÉGIONS SONT OUVERTES D'EMBLÉE.
 *
 * Ce bloc s'intitulait « une seule région, puis deux dès la troisième » et affirmait
 * `regionsOuvertes(neuve()) === ['clairiere']`. Il encodait la v2 § 3.3, **que D38 amende
 * explicitement** (`Docs/journal-des-decisions.md:740`). Le journal des décisions est la loi du
 * projet et il est postérieur à la v2 : le test décrivait donc une règle abrogée, et c'est lui
 * qui tenait la porte des Galeries fermée.
 *
 * Les assertions ne sont pas ASSOUPLIES, elles sont DÉPLACÉES sur la nouvelle loi : on exige
 * toujours une égalité exacte, sur une liste nommée région par région, et on garde intact le
 * plafond du parallélisme déclaré ainsi que les invariants R14 des cas suivants.
 */
describe('regionsOuvertes — les deux régions sont ouvertes d’emblée (D38)', () => {
  it('propose la Clairière ET les Galeries sur une partie neuve', () => {
    // Le cœur de D38 : « l'enfant déchiffre encore et les Galeries travaillent précisément les
    // confusions b/d/p/q dont il a besoin maintenant ». Égalité exacte, pas un `toContain`.
    expect(regionsOuvertes(neuve())).toEqual(['clairiere', 'galeries']);
  });

  it('n’ouvre PAS une troisième région tant que les deux premières sont en jeu', () => {
    // Le pendant du cas précédent, et il est indispensable : sans lui, « ouvrir d'emblée »
    // pourrait être satisfait en ouvrant les six régions, ce que D38 ne dit pas et que
    // `ouvertesEnParallele: 2` interdit.
    expect(regionsOuvertes(neuve())).not.toContain('marais-jumeau');
  });

  /**
   * La fenêtre glisse — et ce cas dit LES DEUX moitiés du fait, séparément.
   *
   * ── L'ALLER-RETOUR DE CETTE ASSERTION, ET CE QU'IL ENSEIGNE ────────────────────────────
   * Elle affirmait d'abord `['galeries', 'marais-jumeau']`. Un lot l'a ramenée à `['galeries']`
   * seul, avec un motif juste au moment où il l'écrivait : le Marais Jumeau ne portait AUCUN
   * nœud livré, et le proposer produisait un bouton « Partir vers Le Marais Jumeau » dont
   * l'`onClick` ne fait rien.
   *
   * Les lots de contenu ont livré les 12 nœuds du Marais. `porteDuContenu` — le prédicat qui
   * décidait — est donc redevenu vrai, et la valeur attendue redevient celle du départ. **Ce
   * n'est pas un aller-retour gratuit : c'est un test dont l'attendu SUIT le contenu livré, et
   * c'est exactement ce qu'on lui demande.** Le bouton mort qu'il interdisait reste interdit —
   * il l'est par `porteDuContenu`, pas par la liste écrite ici.
   *
   * Les deux moitiés restent séparées : l'ouverture est vérifiée sur `carte.regions`, où elle
   * vit ; ce qui est PROPOSÉ est vérifié par une égalité exacte, jamais un `toContain`.
   */
  it('fait glisser la fenêtre quand un Éclat est obtenu — le voile se lève sur le Marais', () => {
    const carte = apresEclats(1);
    const marais = carte.regions.find((region) => region.region === 'marais-jumeau')!;
    expect(marais.ouverte, 'la fenêtre n’a pas glissé : le Marais est resté voilé').toBe(true);
    // Le Marais porte maintenant du contenu : il est proposé, et le plafond de parallélisme
    // (2) fait que la Clairière — close par son Éclat — sort de la fenêtre au même instant.
    expect(marais.noeuds.length, 'le Marais est proposé mais vide').toBeGreaterThan(0);
    expect(regionsOuvertes(carte)).toEqual(['galeries', 'marais-jumeau']);
  });

  it('ne propose jamais plus que le parallélisme déclaré, même très avancé', () => {
    for (let rang = 0; rang <= DEFINITIONS.length; rang += 1) {
      expect(regionsOuvertes(apresEclats(rang)).length).toBeLessThanOrEqual(PARALLELE);
    }
  });

  /**
   * ── DEUX CAS DÉPLACÉS SUR LA NOUVELLE LOI — intégration H ────────────────────────────────
   *
   * Ils affirmaient `regionsOuvertes(apresEclats(6)) === []` et « une région dont l'Éclat est
   * obtenu n'est JAMAIS reproposée », y compris sur `apresEclats(2)` — l'état d'un enfant qui a
   * terminé les deux seules régions portant du contenu. Ils décrivaient donc **une carte sans
   * aucune prise comme le comportement correct**.
   *
   * C'est un état sans issue, et deux règles opposables l'interdisent :
   *   • R14 / v2 § 5.4 — « aucun écran d'échec, aucun état sans issue, un acquis n'est jamais
   *     repris » ; rejouer une région finie ne reprend rien, c'est gratuit ;
   *   • D46 § 1 — « partir en sortie doit se faire en UN TAP », sans écran intermédiaire.
   *
   * Le défaut a été MESURÉ, pas déduit : `tests/api/profils-vecus.test.ts` › V2 › « L'ENFANT
   * PEUT FAIRE QUELQUE CHOSE » rendait `expected [] to not have a length of +0` sur un profil
   * qui avait honnêtement terminé les 18 nœuds livrés. Le code de l'écran allait déjà dans
   * l'autre sens (`reprise`, EcranCarte.tsx : « une région entièrement terminée renvoie sur son
   * premier nœud plutôt que sur rien ») — c'est `regionsOuvertes` qui le défaisait en amont.
   *
   * Comme pour D38 plus haut, les assertions ne sont pas ASSOUPLIES mais DÉPLACÉES : on garde
   * une égalité exacte sur une liste nommée région par région, et on ajoute le cas qui interdit
   * au repli de préempter du contenu neuf — sans quoi « rejouer » deviendrait la règle au lieu
   * d'être la sortie de secours.
   */
  it('replie sur les régions déjà conquises quand les six Éclats sont obtenus (R14)', () => {
    // Les quatre dernières régions ne portent AUCUN nœud livré : les proposer serait offrir
    // une prise qui ne mène nulle part (D48). Restent les deux qui portent les 18 nœuds.
    expect(regionsOuvertes(apresEclats(DEFINITIONS.length))).toEqual(['clairiere', 'galeries']);
  });

  it('laisse toujours au moins une sortie, à TOUS les rangs d’avancement (R14)', () => {
    // L'invariant du lot, posé sur la seule fonction qui décide de ce qui est tapable. Il ne
    // peut pas être satisfait par accident : `apresEclats(2)` à `apresEclats(6)` sont
    // exactement les états où la fenêtre de progression ne porte plus rien.
    for (let rang = 0; rang <= DEFINITIONS.length; rang += 1) {
      const ouvertes = regionsOuvertes(apresEclats(rang));
      expect(ouvertes.length, `aucune sortie après ${String(rang)} Éclat(s)`).toBeGreaterThan(0);
      // Et jamais une région vide : une sortie qui ne répond pas n'est pas une sortie (D48).
      for (const code of ouvertes) {
        const region = apresEclats(rang).regions.find((entree) => entree.region === code)!;
        expect(region.noeuds.length, `la région ${String(code)} est proposée sans nœud`)
          .toBeGreaterThan(0);
      }
    }
  });

  it('ne repropose PAS une région terminée tant qu’il reste du contenu neuf ailleurs', () => {
    // Le garde-fou du repli. Après le seul Éclat de la Clairière, les Galeries ont encore
    // douze nœuds : la Clairière ne doit pas revenir dans la liste pour autant.
    expect(regionsOuvertes(apresEclats(1))).not.toContain('clairiere');
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

describe('conclusionCentraleAccessible — les six Éclats ramènent à la Pierre', () => {
  it('reste fermée tant qu’un seul Éclat manque, puis s’ouvre après le sixième', () => {
    expect(conclusionCentraleAccessible(apresEclats(DEFINITIONS.length - 1))).toBe(false);
    expect(conclusionCentraleAccessible(apresEclats(DEFINITIONS.length))).toBe(true);
  });

  it('ne confond pas la recoloration d’une région avec son Éclat obtenu', () => {
    const sansEclat = neuve();
    const regions = sansEclat.regions.map((region) => ({
      ...region,
      pourcentageColorie: 1
    }));
    expect(conclusionCentraleAccessible({ ...sansEclat, regions })).toBe(false);
  });
});

describe('recalculerRecoloration', () => {
  const clairiere = () => neuve().regions.find((region) => region.region === 'clairiere')!;

  /**
   * Le PREMIER nœud de la région et la LISTE COMPLÈTE, tous deux lus sur disque.
   *
   * Ces deux constantes remplacent deux `toBe(1)` sur `['clairiere-01']` qui dataient de
   * l'époque où la Clairière n'avait qu'un seul nœud : elles affirmaient « un nœud terminé =
   * 100 % » alors que la fonction rend une PART. L'en-tête de ce fichier annonce pourtant que
   * le référentiel est « une donnée, pas une constante recopiée dans le test » — c'en était
   * une, et elle contredisait la v2 § 5.2 (« 4 à 6 nœuds enchaînés »), désormais tenue par le
   * lot C4. Rien n'est assoupli ici : la part exacte est vérifiée nœud par nœud, ce que
   * `toBe(1)` ne faisait pas.
   */
  const NOEUDS_CLAIRIERE = clairiere().noeuds.map(String);
  const PREMIER_NOEUD = NOEUDS_CLAIRIERE[0] as string;
  const PART_D_UN_NOEUD = 1 / NOEUDS_CLAIRIERE.length;

  it('rend la part des nœuds terminés', () => {
    expect(recalculerRecoloration(clairiere(), [PREMIER_NOEUD]).pourcentageColorie).toBe(
      PART_D_UN_NOEUD
    );
    expect(recalculerRecoloration(clairiere(), NOEUDS_CLAIRIERE).pourcentageColorie).toBe(1);
    expect(recalculerRecoloration(clairiere(), []).pourcentageColorie).toBe(0);
  });

  it('progresse d’un cran par nœud terminé — la région se rallume par tranches', () => {
    // Le cas que le `toBe(1)` d'origine ne pouvait pas porter : avec un seul nœud, une région
    // saute de 0 à 100 % et la jauge du « vide restant » (D25, point 3) n'a rien à montrer.
    for (let faits = 0; faits <= NOEUDS_CLAIRIERE.length; faits += 1) {
      expect(
        recalculerRecoloration(clairiere(), NOEUDS_CLAIRIERE.slice(0, faits)).pourcentageColorie,
        `${String(faits)} nœud(s) terminé(s) sur ${String(NOEUDS_CLAIRIERE.length)}`
      ).toBe(faits / NOEUDS_CLAIRIERE.length);
    }
  });

  it('ignore un nœud terminé qui n’appartient pas à la région', () => {
    expect(recalculerRecoloration(clairiere(), ['volcan-07']).pourcentageColorie).toBe(0);
  });

  it('ne décroît jamais : un retrait de nœud ne dépeint pas la carte', () => {
    const peinte = recalculerRecoloration(clairiere(), [PREMIER_NOEUD]);
    expect(recalculerRecoloration(peinte, []).pourcentageColorie).toBe(PART_D_UN_NOEUD);
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

  // D38 — deux ouvertes et quatre voilées sur une carte neuve. Ce cas exigeait « une ouverte
  // et cinq voilées », c'est-à-dire la v2 § 3.3 que D38 amende. Le total reste vérifié à six :
  // c'est ce qui empêche de rendre le cas vert en perdant une région en route.
  it('classe les six régions d’une carte neuve en deux ouvertes et quatre voilées (D38)', () => {
    const etats = neuve().regions.map(etatAfficheRegion);
    expect(etats.filter((etat) => etat === 'ouverte')).toHaveLength(2);
    expect(etats.filter((etat) => etat === 'voilee')).toHaveLength(4);
    expect(etats.filter((etat) => etat === 'terminee')).toHaveLength(0);
    expect(etats).toHaveLength(6);
  });
});
