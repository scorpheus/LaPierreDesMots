/**
 * LA CARTE DU MONDE, MONTÉE — `data-ecran="carte"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA MUTATION QUE CE FICHIER DOIT ATTRAPER — M23
 *
 *   « la pastille d'une région ouverte porte `role="button"` et un diamètre ≥ 64 unités »
 *
 * Et son jumeau, qui est le vrai défaut réparé à l'intégration de la campagne N et que rien ne
 * gardait au niveau du composant : **une prise n'existe que si elle répond.** Les six pastilles
 * portaient `role="button"` et `tabIndex={0}` alors que quatre d'entre elles sont inertes — un
 * lecteur d'écran annonçait « bouton » sur quatre décors, et la tabulation s'y arrêtait pour
 * rien. `EcranCarte.tsx` porte l'encadré ; ce fichier porte le test.
 *
 * Les deux propriétés sont donc gardées ENSEMBLE, et c'est le point : une région ouverte est
 * un bouton, une région voilée est un dessin. Un mutant qui rendrait les six pareilles échoue,
 * quel que soit le sens dans lequel il se trompe.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Le monde vient de `donnees-ecrans.ts` — deux régions ouvertes dont une terminée, quatre
 * voilées. Le décor vient du DISQUE (`contenu/habillages/carte/carte-monde-v3.svg`), parce que
 * `EcranCarte` ne rend ses pastilles QUE lorsque le décor est arrivé.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mondeDeTest, profilDeTest } from './donnees-ecrans.js';

const paquetsDemandes: string[] = [];
const demandesDeSortie: { region: string; compagnon: string | null }[] = [];
let compositionEchoue = false;

/** Le monde servi par le bouchon. Une variable, pour qu'un cas puisse en poser un autre. */
let mondeServi: ReturnType<typeof mondeDeTest> = mondeDeTest();

/**
 * L'exercice et l'habillage RÉELS de la Clairière, lus sur disque.
 *
 * ⚠ Une maquette ne suffisait pas, et la mesure l'a dit : avec `contenu: {}`, `entrer()` va
 * jusqu'à `demarrerNoeud`, qui appelle le vrai `moteurColorie.creerEtat` et lève
 * `Cannot read properties of undefined (reading 'map')` — trois rejets non gérés dans le
 * rapport pour une suite pourtant verte. Un bouchon qui ment sur la FORME de ce qu'il rend
 * fait passer le test et casse le programme.
 */
function lireContenu<T>(chemin: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), chemin), 'utf8')) as T;
}

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    lireMonde: () => Promise.resolve(mondeServi),
    composerSortie: (_profil: unknown, demande: { region: string; compagnon: string | null }) => {
      demandesDeSortie.push(demande);
      if (compositionEchoue) {
        return Promise.reject(new Error('Le contenu ne permet pas de composer cette sortie.'));
      }
      return Promise.resolve({
        profil: 'prf-1',
        region: demande.region,
        compagnon: demande.compagnon,
        etapes: [{
          rang: 1,
          role: 'echauffement',
          noeud: `${demande.region}-01`,
          habillage: 'clairiere.h01',
          competences: ['gph.a'],
          revisions: []
        }],
        composeeLe: '2026-09-01T08:00:00.000Z'
      });
    },
    // Aucun nœud terminé : la reprise tombe donc sur le PREMIER nœud de chaque région.
    lireProgression: () => Promise.resolve([]),
    lirePaquetNoeud: (id: unknown) => {
      paquetsDemandes.push(String(id));
      return Promise.resolve({
        noeud: lireContenu('contenu/noeuds/clairiere-01.json'),
        exercice: lireContenu('contenu/exercices/clairiere/ecole-01.json'),
        habillage: lireContenu('contenu/habillages/clairiere/ecole.habillage.json')
      });
    }
  };
});

const { EcranCarte } = await import('@client/ecrans/EcranCarte');
const { creerMagasin } = await import('@client/etat/magasin');
const { FournisseurJeu } = await import('@client/etat/services');
const { creerHaptiqueMuette } = await import('@client/gamefeel/haptique-navigateur');
const { creerRetourSensoriel } = await import('@client/gamefeel/retour');
const { RACINE_DEPOT, servicesDeTest } = await import('../configuration/preparation.js');
const { CIBLE_MIN_PX, HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

type Magasin = ReturnType<typeof creerMagasin>;

function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined
    })
  };
}

/** Le décor réel, servi depuis le dépôt. Tout appel sortant est refusé. */
function installerFetchLocal(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown): Promise<Response> => {
      const url = String(
        typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree)
      );
      const apres = url.split('/api/contenu/assets/')[1] ?? url.split('contenu/')[1];
      if (apres === undefined) {
        throw new Error(`appel sortant interdit en test : ${url}`);
      }
      return new Response(readFileSync(join(RACINE_DEPOT, 'contenu', ...apres.split('/')), 'utf8'), {
        status: 200,
        headers: { 'content-type': 'image/svg+xml' }
      });
    })
  );
}

interface Monte {
  readonly magasin: Magasin;
  readonly campement: number[];
  readonly ouverture: number[];
}

function monter(): Monte {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.setState({ ecran: 'carte', profil: profilDeTest() } as never);
  const campement: number[] = [];
  const ouverture: number[] = [];
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranCarte
          surAllerCampement={() => campement.push(1)}
          surVoirOuverture={() => ouverture.push(1)}
        />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return { magasin, campement, ouverture };
}

/**
 * On attend un ÉTAT, jamais une durée — et surtout pas n'importe quel état.
 *
 * ⚠ PIÈGE MESURÉ, et il a rendu ce fichier vert à tort pendant une première exécution :
 * les six `[data-region]` sont rendues par la table `ANCRES`, **avant** toute donnée. Attendre
 * leur présence, c'est n'attendre rien : les six sortaient `voilee`, aucun départ n'existait,
 * et les assertions tombaient sur un écran encore vide. On attend donc deux choses qui ne
 * peuvent venir que des requêtes : le décor injecté (`[data-decor]`) et au moins un départ,
 * qui exige à la fois le monde et la progression.
 */
async function monterEtAttendre(): Promise<Monte> {
  const monte = monter();
  await waitFor(() => {
    expect(document.querySelector('[data-decor="carte"]')).not.toBeNull();
    expect(document.querySelector('[data-depart]')).not.toBeNull();
  });
  return monte;
}

/** La prise tactile d'une région : le `<circle>` de rayon 46, jamais le sceau décoratif. */
function prise(region: string): Element | null {
  return document.querySelector(`[data-region="${region}"] circle[aria-label]`);
}

beforeEach(() => {
  paquetsDemandes.length = 0;
  demandesDeSortie.length = 0;
  compositionEchoue = false;
  mondeServi = mondeDeTest();
  installerFetchLocal();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('une prise n’existe que si elle répond (M23)', () => {
  it('sert la carte illustrée validée en raster, avec le SVG seulement en repli', async () => {
    await monterEtAttendre();

    const raster = document.querySelector('[data-decor-raster="carte"]');
    expect(raster, 'la carte principale ne doit pas retomber sur le SVG historique').not.toBeNull();
    expect(raster?.getAttribute('data-format-decor')).toBe('raster');
    expect(raster?.querySelector('image')?.getAttribute('href')).toContain(
      'assets/decors/carte-six-regions.png',
    );
    expect(document.querySelector('[data-decor="carte"][data-format-decor="svg-repli"]')).toBeNull();
    // Les silhouettes SVG restent disponibles pour le seul repli réseau, mais ne sont plus
    // peintes au-dessus du paysage raster.
    expect(document.querySelector('[data-definitions-decor="carte"]')).not.toBeNull();
  });

  it('rend les SIX régions, ouvertes comme voilées — aucune n’est cachée', async () => {
    await monterEtAttendre();
    const groupes = document.querySelectorAll('[data-region]');
    console.log(
      `[QA-2 · carte] régions rendues : ${String(groupes.length)} sur ` +
        `${String(mondeServi.carte.regions.length)} servies`
    );
    // Le nombre vient du MONDE SERVI, pas d'un 6 écrit en dur : c'est la même donnée qui pilote
    // le rendu, donc le cas dit « la carte rend tout ce qu'on lui donne » — ce qui reste vrai
    // le jour où une septième région existe, et faux le jour où l'une disparaît de l'écran.
    expect(groupes.length, 'une région servie ne trouve pas sa place sur la carte').toBe(
      mondeServi.carte.regions.length
    );
    expect(mondeServi.carte.regions.length, 'le monde de test a perdu ses régions').toBe(6);
  });

  it('la région JOUABLE porte `role="button"`, un focus et un diamètre ≥ 64 unités', async () => {
    await monterEtAttendre();
    const cercle = prise('galeries');
    expect(cercle, 'aucune prise sur « galeries »').not.toBeNull();
    expect(cercle!.getAttribute('role'), '« galeries » n’est pas un bouton').toBe('button');
    expect(cercle!.getAttribute('tabindex')).toBe('0');
    const rayon = Number(cercle!.getAttribute('r'));
    expect(rayon * 2, `« galeries » sous ${String(CIBLE_MIN_PX)} unités`).toBeGreaterThanOrEqual(
      CIBLE_MIN_PX
    );
  });

  /**
   * ── UN COMPORTEMENT QUE JE N'AVAIS PAS SUPPOSÉ, ET QUE LA MESURE A CORRIGÉ ─────────────────
   * Ce cas attendait d'abord que la Clairière TERMINÉE reste tapable. Elle ne l'est pas :
   * `regionsOuvertes` (`partage/src/monde/carte.ts:239`) n'offre que les régions `enCours`
   * — `ouverte && pourcentageColorie < 1`, lot H1 — et ne retombe sur les régions rejouables
   * que si AUCUNE n'est en cours. Tant que les Galeries avancent, la Clairière finie est un
   * décor doré, pas une porte.
   *
   * Le test dit donc ce que le code fait, et l'arbitrage — « un enfant peut-il retourner
   * rejouer une région finie depuis la carte ? » — est consigné dans
   * `Docs/questions-en-attente.md` (section QA-2) au lieu d'être tranché ici. Ce qui est
   * garanti, en revanche, et c'est le cas suivant : quand tout est fini, la carte redevient
   * tapable. Aucun état sans issue, jamais.
   */
  it('la région TERMINÉE n’est pas une porte tant qu’une autre est en cours', async () => {
    await monterEtAttendre();
    const cercle = prise('clairiere');
    expect(cercle).not.toBeNull();
    expect(cercle!.getAttribute('role')).toBeNull();
    // Elle reste NOMMÉE et distinguée : l'enfant voit qu'elle est finie, il ne la perd pas.
    expect(
      document.querySelector('[data-region="clairiere"]')?.getAttribute('data-region-etat')
    ).toBe('terminee');
    expect(document.querySelector('[data-region="clairiere"] path[d]')).not.toBeNull();
  });

  it('la région VOILÉE n’est ni un bouton, ni atteignable au clavier — c’est un décor', async () => {
    await monterEtAttendre();
    for (const region of ['marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires']) {
      const cercle = prise(region);
      expect(cercle, `aucun cercle sur « ${region} »`).not.toBeNull();
      expect(
        cercle!.getAttribute('role'),
        `« ${region} » est annoncée « bouton » alors qu’elle ne répond pas`
      ).toBeNull();
      expect(cercle!.getAttribute('tabindex')).toBeNull();
      expect(cercle!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('demande avec qui partir avant de composer la sortie', async () => {
    await monterEtAttendre();
    fireEvent.click(prise('galeries')!);

    const choix = document.querySelector('[data-choix-compagnon]');
    expect(choix?.getAttribute('role')).toBe('dialog');
    expect(choix?.textContent).toContain('Avec qui pars-tu');
    expect(document.querySelector('[data-choisir-compagnon="filou"]')).not.toBeNull();
    expect(demandesDeSortie).toEqual([]);

    fireEvent.click(document.querySelector('[data-choisir-compagnon="filou"]')!);
    fireEvent.click(document.querySelector('[data-confirmer-depart]')!);
    await waitFor(() => {
      expect(paquetsDemandes).toEqual(['galeries-01']);
    });
    expect(demandesDeSortie).toEqual([{ region: 'galeries', compagnon: 'filou' }]);
  });

  it.each([
    { compagnon: null, libelle: 'Gobi' },
    { compagnon: 'filou', libelle: 'Filou' }
  ] as const)(
    'le repli de composition conserve $libelle jusqu’au nœud isolé',
    async ({ compagnon }) => {
      compositionEchoue = true;
      const { magasin } = await monterEtAttendre();
      fireEvent.click(prise('galeries')!);
      fireEvent.click(
        document.querySelector(`[data-choisir-compagnon="${compagnon ?? 'gobi'}"]`)!
      );
      fireEvent.click(document.querySelector('[data-confirmer-depart]')!);

      await waitFor(() => {
        expect(magasin.getState().ecran).toBe('noeud');
      });
      const sortie = magasin.getState().sortie;
      expect(sortie?.compagnon).toBe(compagnon);
      expect(sortie?.etapes).toHaveLength(1);
      expect(sortie?.etapes[0]).toMatchObject({
        rang: 1,
        role: 'synthese',
        noeud: 'clairiere-01',
        habillage: 'clairiere.ecole'
      });
      expect(sortie?.etapes[0]?.competences).toEqual([
        'comp.consigne.simple',
        'comp.consigne.multiple',
        'lex.couleur'
      ]);
      expect(demandesDeSortie).toEqual([{ region: 'galeries', compagnon }]);
    }
  );

  it('taper une région voilée ne demande RIEN, et n’affiche aucun reproche', async () => {
    await monterEtAttendre();
    fireEvent.click(prise('volcan')!);
    expect(paquetsDemandes).toEqual([]);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/verrouill|interdit|pas le droit/iu);
  });
});

describe('la carte montre le VIDE restant (D25, point 3)', () => {
  it('un monde sans couleur désature réellement tout le PNG et ne révèle aucun paysage', async () => {
    const mondeInitial = mondeDeTest();
    mondeServi = {
      ...mondeInitial,
      carte: {
        ...mondeInitial.carte,
        regions: mondeInitial.carte.regions.map((region) => ({
          ...region,
          pourcentageColorie: 0,
          eclatObtenuLe: null
        }))
      }
    };
    await monterEtAttendre();

    const grisaille = document.querySelector('[data-carte-grisaille="totale"]');
    expect(grisaille?.getAttribute('filter')).toBe('url(#carte-raster-grisaille)');
    expect(document.querySelectorAll('[data-revelation-region]')).toHaveLength(0);
  });

  it('la couleur réapparaît uniquement dans les régions progressées, aux ancres du raster', async () => {
    await monterEtAttendre();

    expect(
      document
        .querySelector('[data-revelation-region="clairiere"]')
        ?.getAttribute('data-revelation-pourcentage')
    ).toBe('1.00');
    expect(
      document
        .querySelector('[data-revelation-region="galeries"]')
        ?.getAttribute('data-revelation-pourcentage')
    ).toBe('0.40');
    expect(document.querySelectorAll('[data-revelation-region]')).toHaveLength(2);
    expect(document.querySelector('[data-region="clairiere"]')?.getAttribute('data-ancre-raster'))
      .toBe('600,690');
    expect(document.querySelector('[data-region="galeries"]')?.getAttribute('data-ancre-raster'))
      .toBe('990,560');
    expect(
      document.querySelector('[data-region="marais-jumeau"]')?.getAttribute('data-ancre-raster')
    ).toBe('1040,370');
  });

  it('l’état de chaque région suit le monde servi, il n’est pas peint en dur', async () => {
    await monterEtAttendre();
    const etats = new Map(
      [...document.querySelectorAll('[data-region]')].map((groupe) => [
        groupe.getAttribute('data-region'),
        groupe.getAttribute('data-region-etat')
      ])
    );
    console.log(`[QA-2 · carte] états : ${[...etats].map((paire) => paire.join('=')).join(' ')}`);
    expect(etats.get('clairiere')).toBe('terminee');
    expect(etats.get('galeries')).toBe('ouverte');
    expect(etats.get('volcan')).toBe('voilee');
    // Trois valeurs distinctes : un rendu unique pour les six serait M23 sous sa forme large.
    expect(new Set(etats.values()).size).toBe(3);
  });

  it('la jauge annulaire compte ce qui RESTE, pas ce qui est acquis', async () => {
    await monterEtAttendre();
    // Les Galeries sont recoloriées à 40 % : il reste 0,60. Une jauge qui montrerait l'acquis
    // afficherait 0,40 — c'est la seconde vérité que D25 refuse.
    const jauge = document.querySelector('[data-region="galeries"] [data-jauge-restant]');
    expect(jauge?.getAttribute('data-jauge-restant')).toBe('0.60');
    // La région terminée n'a plus de jauge : il n'y a plus de vide à montrer.
    expect(document.querySelector('[data-region="clairiere"] [data-jauge-restant]')).toBeNull();
  });

  it('un départ n’est proposé QUE s’il mène quelque part (D48)', async () => {
    await monterEtAttendre();
    const departs = [...document.querySelectorAll('[data-depart]')].map((bouton) =>
      bouton.getAttribute('data-depart')
    );
    console.log(`[QA-2 · carte] départs proposés : ${departs.join(', ') || '(aucun)'}`);
    // Une seule région est EN COURS (les Galeries) ; la Clairière est finie, et les quatre
    // autres sont voilées — dont trois sans aucun nœud livré. Un bouton de plus serait une
    // prise qui ne mène nulle part : « compter les éléments interactifs n'est pas compter les
    // sorties » (D48).
    expect(departs).toEqual(['galeries']);
    expect(
      document.querySelector('[data-depart="galeries"]')?.getAttribute('data-etape')
    ).toBe('1/3');
    expect(document.querySelector('[data-depart="galeries"] [data-restant]')
      ?.getAttribute('data-restant')).toBe('60');
  });

  /**
   * LE FILET DE R14 : quand TOUT est fini, la carte reste vivante.
   *
   * C'est le seul cas où `regionsOuvertes` retombe sur ses `rejouables`. Sans ce repli, un
   * enfant qui a terminé le jeu trouverait une carte entièrement dorée et entièrement inerte
   * — l'état sans issue le plus cruel qu'on puisse lui livrer, et le seul qu'aucun parcours
   * E2E ne rencontrera avant des mois de jeu.
   */
  it('un monde ENTIÈREMENT terminé garde des prises : la carte ne devient jamais inerte', async () => {
    const tout = mondeDeTest();
    const termine = {
      ...tout,
      carte: {
        ...tout.carte,
        regions: tout.carte.regions.map((region) => ({
          ...region,
          ouverte: true,
          pourcentageColorie: 1,
          eclatObtenuLe: '2026-09-01T08:00:00.000Z'
        }))
      }
    };
    mondeServi = termine as never;

    monter();
    await waitFor(() => {
      expect(document.querySelector('[data-decor="carte"]')).not.toBeNull();
      expect(document.querySelector('[data-depart]')).not.toBeNull();
    });

    const departs = [...document.querySelectorAll('[data-depart]')].map((bouton) =>
      bouton.getAttribute('data-depart')
    );
    console.log(`[QA-2 · carte] monde terminé → départs : ${departs.join(', ')}`);
    expect(departs.length).toBeGreaterThan(0);
    expect(prise(departs[0]!)?.getAttribute('role')).toBe('button');
  });

  it('réserve la Pierre centrale pour la conclusion après les six Éclats', async () => {
    await monterEtAttendre();
    expect(document.querySelector('[data-conclusion-centrale]')).toBeNull();

    const tout = mondeDeTest();
    mondeServi = {
      ...tout,
      carte: {
        ...tout.carte,
        regions: tout.carte.regions.map((region) => ({
          ...region,
          ouverte: true,
          pourcentageColorie: 1,
          eclatObtenuLe: '2026-09-01T08:00:00.000Z'
        }))
      }
    } as never;

    cleanup();
    await monterEtAttendre();
    const pierre = document.querySelector('[data-conclusion-centrale]');
    expect(pierre?.getAttribute('role')).toBe('button');
    expect(pierre?.getAttribute('data-ancre-raster')).toBe('600,470');
    const departConclusion = document.querySelector('[data-depart-conclusion]');
    expect(departConclusion?.textContent).toContain('Va au centre');
    expect(document.querySelector('[data-region="clairiere"]')?.getAttribute('data-ancre-raster'))
      .toBe('600,690');

    fireEvent.click(departConclusion!);
    expect(document.querySelector('[data-conclusion-pierre]')?.textContent)
      .toContain('La Pierre des Mots est entière');
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    let dernier: Monte | null = null;
    const rapport = await exigerUneSortieQuiRepond(
      'carte',
      async () => {
        dernier = await monterEtAttendre();
        return {
          racine: document.body,
          aQuitte: () => {
            if (dernier === null) return false;
            return (
              dernier.magasin.getState().ecran !== 'carte' ||
              dernier.campement.length > 0 ||
              dernier.ouverture.length > 0 ||
              paquetsDemandes.length > 0 ||
              document.querySelector('[data-choix-compagnon]') !== null
            );
          }
        };
      },
      () => {
        paquetsDemandes.length = 0;
        cleanup();
      }
    );
    // Le campement, l'histoire, le changement de joueur, les deux pastilles ouvertes et les
    // deux départs : la carte est l'écran le plus riche en issues du jeu, et c'est voulu.
    expect(rapport.repondent.length).toBeGreaterThanOrEqual(4);
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', async () => {
    await monterEtAttendre();
    const rapport = exigerCibles64('carte', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(5);
  });

  it('n’émet jamais `data-etat="echec"` (R14)', async () => {
    await monterEtAttendre();
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});
