/**
 * L'ÉCRAN DE RÉCOMPENSE, MONTÉ — `data-ecran="recompense"`. Lot QA-2, `Docs/audit-qa.md` § 7.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LA MUTATION QUE CE FICHIER DOIT ATTRAPER — M24
 *
 *   « `data-etoile` / `data-acquise` **suivent la valeur calculée**, jamais une constante. »
 *
 * Le mutant le plus vicieux de la famille : un écran qui affiche trois étoiles pleines quoi
 * qu'il arrive reste vert partout ailleurs. Aucun parcours ne s'arrête, aucune API ne change,
 * aucune couleur ne détonne — et la seule récompense du jeu cesse de vouloir dire quelque
 * chose. Un enfant qui a trois étoiles à chaque fois n'a plus de raison de recommencer, et
 * D25 en fait le moteur de retour du jeu.
 *
 * Le cas décisif ne vérifie donc pas « il y a des étoiles » : il fait VARIER l'entrée sur les
 * quatre valeurs possibles et exige que la sortie varie avec elle. Une constante échoue sur au
 * moins trois des quatre.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * SECONDE PROPRIÉTÉ, ET ELLE EST UNE RÈGLE NON NÉGOCIABLE : **une écriture perdue ne gâche
 * jamais la fin de partie** (R14). `EcranRecompense` est le seul écrivain du journal
 * (§ 6.3) ; son `catch` est délibéré et documenté. On coupe l'enregistrement et on exige que
 * l'écran reste `data-fin="reussite"`, sans le moindre `data-etat="echec"`.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EtatMonde, NombreEtoiles, ResumeTentative } from '@pierre/partage';
import { enonceUnePerte } from '@partage/ton/index.js';

const enregistrements: unknown[] = [];
let enregistrementEchoue = false;
const { effacementsParticules } = vi.hoisted(() => ({ effacementsParticules: vi.fn() }));

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    calculerCleIdempotence: () => Promise.resolve('cle-de-test'),
    enregistrerTentative: (charge: unknown) => {
      enregistrements.push(charge);
      return enregistrementEchoue
        ? Promise.reject(new Error('la Pierre n’a pas répondu'))
        : Promise.resolve({});
    }
  };
});

vi.mock('@client/gamefeel/particules', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  effacerParticules: effacementsParticules
}));

const {
  EcranRecompense,
  regionsNouvellementOuvertes,
  texteProgressionRegionale
} = await import('@client/ecrans/EcranRecompense');
const { CascadeRecompense } = await import('@client/composants/CascadeRecompense');
const { creerMagasin } = await import('@client/etat/magasin');
const { FournisseurJeu } = await import('@client/etat/services');
const { creerHaptiqueMuette } = await import('@client/gamefeel/haptique-navigateur');
const { creerRetourSensoriel } = await import('@client/gamefeel/retour');
const { servicesDeTest } = await import('../configuration/preparation.js');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
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

/** Un résumé de tentative plausible. Le barème vit dans `calculerEtoiles`, jamais ici. */
function resume(nbErreurs: number, aideUtilisee: boolean): ResumeTentative {
  return {
    reussi: true,
    nbErreurs,
    aideUtilisee,
    dureeMs: 42_000
  } as ResumeTentative;
}

function monter(etat: Partial<Record<string, unknown>> = {}): Magasin {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const jeu = services();
  const magasin = creerMagasin(jeu);
  magasin.setState({ ecran: 'recompense', ...etat } as never);
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: jeu, magasin }}>
        <EcranRecompense />
      </FournisseurJeu>
    </QueryClientProvider>
  );
  return magasin;
}

const PLAN_DE_SORTIE = {
  profil: 'prf-1',
  region: 'clairiere',
  compagnon: null,
  composeeLe: '2026-09-01T08:00:00.000Z',
  etapes: [
    { rang: 1, role: 'echauffement', noeud: 'clairiere-03', habillage: 'pont', competences: [], revisions: [] },
    { rang: 2, role: 'competence-en-cours', noeud: 'clairiere-04', habillage: 'mare', competences: [], revisions: [] },
    { rang: 3, role: 'revision', noeud: 'clairiere-05', habillage: 'cabane', competences: [], revisions: [] },
    { rang: 4, role: 'synthese', noeud: 'clairiere-06', habillage: 'sentier', competences: [], revisions: [] }
  ]
} as const;

/** Combien d'étoiles sont RENDUES pleines, lu sur le DOM et non sur l'état. */
function etoilesAcquises(): number {
  return document.querySelectorAll('[data-etoile][data-acquise="oui"]').length;
}

beforeEach(() => {
  enregistrements.length = 0;
  enregistrementEchoue = false;
  effacementsParticules.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('les étoiles SUIVENT la valeur, elles ne sont pas décoratives (M24)', () => {
  it('rend exactement autant d’étoiles pleines que le magasin en porte, sur les 4 valeurs', () => {
    const observees: number[] = [];
    for (const valeur of [0, 1, 2, 3] as readonly NombreEtoiles[]) {
      monter({ etoiles: valeur });
      observees.push(etoilesAcquises());
      cleanup();
    }
    console.log(`[QA-2 · recompense] étoiles demandées 0,1,2,3 → rendues ${observees.join(',')}`);
    // Une constante — la forme même de M24 — rendrait quatre fois le même nombre.
    expect(observees).toEqual([0, 1, 2, 3]);
    expect(new Set(observees).size, 'les étoiles rendues ne varient pas : valeur en dur ?').toBe(4);
  });

  it('rend toujours les 3 rangs, les non acquis EN CREUX — jamais une case absente', () => {
    monter({ etoiles: 1 });
    expect(document.querySelectorAll('[data-etoile]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-etoile][data-acquise="non"]')).toHaveLength(2);
  });

  it('annonce le compte à voix haute, et l’annonce suit le compte', () => {
    monter({ etoiles: 2 });
    expect(document.querySelector('.etoiles')?.getAttribute('aria-label')).toBe(
      '2 étoiles sur 3'
    );
  });

  it('sans étoile connue, l’écran retombe sur 1 — jamais sur rien, jamais sur zéro', () => {
    // `nombreEtoiles = etoiles ?? 1` : le repli est écrit dans l'écran. On l'épingle, parce
    // que le transformer en `?? 3` serait exactement M24 sous une autre forme.
    monter({ etoiles: null });
    expect(etoilesAcquises()).toBe(1);
  });

  it('la phrase de félicitation change avec le compte, et aucune ne compare ni ne regrette', () => {
    const phrases = new Set<string>();
    for (const valeur of [1, 2, 3] as readonly NombreEtoiles[]) {
      monter({ etoiles: valeur });
      phrases.add(document.querySelector('.zone-lecture')?.textContent?.trim() ?? '');
      cleanup();
    }
    expect(phrases.size, 'la même phrase pour 1, 2 et 3 étoiles').toBe(3);
    // Le juge du TON est celui du dépôt — `partage/src/ton/index.ts`, la même fonction que
    // `tests/unitaires/ton-sans-perte.test.ts`. Écrire ici une seconde liste de mots interdits
    // en ferait une seconde vérité, et elle dériverait : « Sans une seule erreur » contient
    // le mot « erreur » et n'énonce pourtant aucune perte. C'est exactement le piège.
    for (const phrase of phrases) {
      expect(enonceUnePerte(phrase), `« ${phrase} » énonce une perte`).toBeNull();
    }
  });
});

describe('la fin de partie est une réussite, quoi qu’il arrive (R14)', () => {
  it('efface la couche visuelle à la sortie de la récompense', () => {
    const jeu = services();
    const vue = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FournisseurJeu valeur={{ services: jeu, magasin: creerMagasin(jeu) }}>
          <EcranRecompense />
        </FournisseurJeu>
      </QueryClientProvider>
    );
    vue.unmount();
    expect(effacementsParticules).toHaveBeenCalledTimes(1);
  });

  it('célèbre la réussite avec Gobi dans une scène dédiée, sans animer le texte', () => {
    monter({ etoiles: 2 });
    const scene = document.querySelector('[data-scene-recompense="gobi-joie"]');
    const gobi = scene?.querySelector<HTMLImageElement>('img');
    expect(scene).not.toBeNull();
    expect(gobi?.getAttribute('src')).toContain('assets/gobi/animation/joie.webp');
    expect(document.querySelector('h1')?.closest('[data-texte-recompense]')).not.toBeNull();
  });

  it('porte `data-fin="reussite"` et aucun `data-etat="echec"`', () => {
    monter({ etoiles: 0 });
    expect(document.querySelector('[data-ecran="recompense"]')?.getAttribute('data-fin')).toBe(
      'reussite'
    );
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });

  it('reste une réussite quand l’enregistrement du journal ÉCHOUE', async () => {
    enregistrementEchoue = true;
    const avertissements: unknown[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...arguments_) => {
      avertissements.push(arguments_);
    });

    monter({
      etoiles: 3,
      profil: { id: 'prf-1', prenom: 'Alma' },
      paquet: {
        noeud: { id: 'clairiere-01' },
        exercice: { id: 'clairiere-ecole-01', jeu: { moteur: 'colorie' } },
        habillage: { id: 'ecole', timings: { interEtoilesMs: 180 } }
      },
      resume: resume(0, false),
      demarreLe: '2026-09-01T08:00:00.000Z',
      termineLe: '2026-09-01T08:00:42.000Z'
    });

    await waitFor(() => {
      expect(avertissements.length).toBeGreaterThan(0);
    });
    expect(enregistrements).toHaveLength(1);
    expect(document.querySelector('[data-fin="reussite"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    expect(etoilesAcquises()).toBe(3);
    vi.mocked(console.warn).mockRestore();
  });
});

describe('les annonces correspondent à ce qui est réellement remis', () => {
  it('ne promet aucun cadeau quand le serveur n’en rend aucun de concret', () => {
    render(
      <CascadeRecompense
        gain={{
          etat: {
            etoilesTotal: 50,
            etoilesDepuisIntermediaire: 0,
            intermediairesTotal: 10,
            intermediairesDepuisRare: 0,
            raresTotal: 1,
            dernierPalierLe: '2026-09-03T09:00:00.000Z',
          },
          paliersFranchis: ['intermediaire', 'rare'],
          recompenses: [
            { palier: 'intermediaire', nature: 'forme-gobi', reference: null, asset: null, region: null },
            { palier: 'rare', nature: 'zone-recoloriee', reference: null, asset: null, region: null },
          ],
          jauges: [],
        }}
      />,
    );
    const annonce = document.querySelector('.cascade-recompense')?.textContent ?? '';
    expect(annonce).toBe('');
  });

  it('montre la forme réellement remise, avec son visuel', () => {
    render(
      <CascadeRecompense
        gain={{
          etat: { etoilesTotal: 5, etoilesDepuisIntermediaire: 0, intermediairesTotal: 1, intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
          paliersFranchis: ['intermediaire'],
          recompenses: [{ palier: 'intermediaire', nature: 'forme-gobi', reference: 'ou', asset: 'assets/gobi/cristal-ou.svg', region: null }],
          jauges: [],
        }}
      />,
    );
    expect(document.querySelector('[data-cadeau-concret="ou"]')).not.toBeNull();
    expect(document.querySelector('.cascade-recompense')?.textContent).toContain('forme « ou »');
  });
});

describe('une région n’est annoncée qu’au vrai déblocage', () => {
  const monde = (galeriesOuvertes: boolean): EtatMonde => ({
    carte: {
      ouvertesEnParallele: 2,
      regions: [
        { region: 'clairiere', ordre: 1, ouverte: true, pourcentageColorie: 1, eclatObtenuLe: '2026-09-01T00:00:00.000Z', compagnon: null, noeuds: [] },
        { region: 'galeries', ordre: 2, ouverte: galeriesOuvertes, pourcentageColorie: 0, eclatObtenuLe: null, compagnon: null, noeuds: [] },
      ]
    },
    gobi: { stade: 'oeuf', formes: [], formeActive: null }, compagnons: [], campement: []
  } as EtatMonde);

  it('nomme seulement la région passée de verrouillée à ouverte', () => {
    expect(regionsNouvellementOuvertes(monde(false), monde(true))).toEqual(['galeries']);
  });

  it('n’annonce ni une région déjà ouverte, ni une région simplement terminée', () => {
    expect(regionsNouvellementOuvertes(monde(true), monde(true))).toEqual([]);
    expect(regionsNouvellementOuvertes(null, monde(true))).toEqual([]);
  });
});

describe('la récompense suit le plan pédagogique actif', () => {
  it('propose l’étape suivante du plan, jamais le prochain nœud arbitraire de la région', () => {
    const magasin = monter({
      etoiles: 2,
      sortie: PLAN_DE_SORTIE,
      paquet: {
        noeud: { id: 'clairiere-03', region: 'clairiere' },
        habillage: { timings: {} }
      }
    });

    const continuer = document.querySelector('[data-action="exercice-suivant"]');
    expect(continuer?.getAttribute('data-noeud-suivant')).toBe('clairiere-04');
    expect(continuer?.textContent).toContain('On y va');
    expect(magasin.getState().sortie?.etapes).toHaveLength(4);
  });

  it('clôt la sortie après la synthèse et rend la main au campement', () => {
    let retoursCampement = 0;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const jeu = services();
    const magasin = creerMagasin(jeu);
    magasin.setState({
      ecran: 'recompense',
      etoiles: 2,
      sortie: PLAN_DE_SORTIE,
      paquet: {
        noeud: { id: 'clairiere-06', region: 'clairiere' },
        habillage: { timings: {} }
      }
    } as never);
    render(
      <QueryClientProvider client={client}>
        <FournisseurJeu valeur={{ services: jeu, magasin }}>
          <EcranRecompense surFinSortie={() => { retoursCampement += 1; }} />
        </FournisseurJeu>
      </QueryClientProvider>
    );

    const finir = document.querySelector('[data-action="fin-sortie"]');
    expect(finir?.textContent).toContain('campement');
    fireEvent.click(finir!);
    expect(retoursCampement).toBe(1);
    expect(magasin.getState().sortie).toBeNull();
  });

  it('dit clairement qu’une sortie de 6/13 ne termine pas la région', () => {
    expect(texteProgressionRegionale(true, 6, 13)).toBe(
      'Ta sortie est terminée. Cette région continue : '
    );
    expect(texteProgressionRegionale(true, 13, 13)).toBe(
      'Ta sortie est terminée, et cette région aussi. '
    );
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    let dernier: Magasin | null = null;
    const rapport = await exigerUneSortieQuiRepond(
      'recompense',
      () => {
        dernier = monter({ etoiles: 2 });
        return {
          racine: document.body,
          aQuitte: () => dernier !== null && dernier.getState().ecran !== 'recompense'
        };
      },
      cleanup
    );
    // Deux sorties, et les deux comptent : « Rejouer » sans paquet rend la carte, « Retour à
    // la carte » aussi. Aucune des deux n'est un cul-de-sac.
    expect(rapport.repondent).toHaveLength(2);
  });

  it('aucune cible tapable ne manque sa déclaration de 64 px (R16)', () => {
    monter({ etoiles: 2 });
    const rapport = exigerCibles64('recompense', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(2);
  });
});
