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
let promesseEnregistrement: Promise<unknown> | null = null;
const { effacementsParticules, mondeRecompense, progressionRecompense } = vi.hoisted(() => ({
  effacementsParticules: vi.fn(),
  mondeRecompense: { valeur: null as EtatMonde | null },
  progressionRecompense: { valeur: [] as Array<{ noeud: string; etoiles: number }> }
}));

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    calculerCleIdempotence: () => Promise.resolve('cle-de-test'),
    lireMonde: () => Promise.resolve(mondeRecompense.valeur),
    lireProgression: () => Promise.resolve(progressionRecompense.valeur),
    enregistrerTentative: (charge: unknown) => {
      enregistrements.push(charge);
      if (promesseEnregistrement !== null) return promesseEnregistrement;
      return enregistrementEchoue
        ? Promise.reject(new Error('la Pierre n’a pas répondu'))
        : Promise.resolve({ gainCascade: {
          etat: { etoilesTotal: 3, etoilesDepuisIntermediaire: 3, intermediairesTotal: 0,
            intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
          paliersFranchis: [], recompenses: [], jauges: []
        } });
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
  promesseEnregistrement = null;
  mondeRecompense.valeur = null;
  progressionRecompense.valeur = [];
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

  it('place les actions juste après la célébration, avant les détails secondaires', () => {
    monter({ etoiles: 2, resume: resume(0, false) });
    const scene = document.querySelector('[data-scene-recompense="gobi-joie"]');
    const actions = document.querySelector('[data-actions-recompense="oui"]');
    const details = document.querySelector('[data-detail-etoiles="oui"]');
    expect(scene?.nextElementSibling).toBe(actions);
    expect(actions?.nextElementSibling).toBe(details);
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

  it('une ancienne réponse réseau ne marque pas la tentative suivante comme déjà envoyée', async () => {
    let resoudre: ((valeur: unknown) => void) | null = null;
    promesseEnregistrement = new Promise((resolution) => {
      resoudre = resolution;
    });

    const magasin = monter({
      etoiles: 2,
      profil: { id: 'prf-1', prenom: 'Alma' },
      paquet: {
        noeud: { id: 'clairiere-01' },
        exercice: { id: 'clairiere-ecole-01', jeu: { moteur: 'colorie' } },
        habillage: { id: 'ecole', timings: { interEtoilesMs: 180 } }
      },
      resume: resume(1, false),
      demarreLe: '2026-09-01T08:00:00.000Z',
      termineLe: '2026-09-01T08:00:42.000Z'
    });

    await waitFor(() => expect(enregistrements).toHaveLength(1));
    expect(magasin.getState().tentativeEnvoyee).toBe(false);

    // C'est ce que `demarrerNoeud` fait pour la tentative suivante.
    magasin.setState({ tentativeEnvoyee: false, demarreLe: '2026-09-01T08:01:00.000Z' });
    resoudre?.({ gainCascade: {
      etat: { etoilesTotal: 2, etoilesDepuisIntermediaire: 2, intermediairesTotal: 0,
        intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
      paliersFranchis: [], recompenses: [], jauges: []
    } });

    await waitFor(() => expect(magasin.getState().tentativeEnvoyee).toBe(false));
  });
});

describe('le compagnon de la sortie reste présent jusqu’au résultat', () => {
  const compagnons = [
    { code: 'filou', libelle: 'Filou', asset: 'assets/compagnons/filou.png' },
    { code: 'roc', libelle: 'Roc', asset: 'assets/compagnons/roc.png' },
    { code: 'plume', libelle: 'Plume', asset: 'assets/compagnons/plume.png' },
    { code: 'bulle', libelle: 'Bulle', asset: 'assets/compagnons/bulle.png' }
  ] as const;

  function sortieAvec(compagnon: (typeof compagnons)[number]['code'] | null) {
    return { ...PLAN_DE_SORTIE, compagnon };
  }

  it.each(compagnons)(
    'salue $libelle avec son portrait canonique après un exercice de sortie',
    ({ code, asset }) => {
      monter({
        etoiles: 2,
        sortie: sortieAvec(code),
        paquet: { noeud: { id: 'clairiere-03', region: 'clairiere' }, habillage: { timings: {} } }
      });

      const scene = document.querySelector(`[data-compagnon-recompense="${code}"]`);
      expect(scene).not.toBeNull();
      expect(scene?.querySelector(`[data-compagnon-sprite="${code}"]`)).not.toBeNull();
      expect(scene?.querySelector<HTMLImageElement>('img')?.getAttribute('src')).toContain(asset);
    }
  );

  it('garde Gobi quand aucune sortie ne porte de compagnon', () => {
    monter({ etoiles: 2, sortie: sortieAvec(null) });

    const scene = document.querySelector('[data-compagnon-recompense="gobi"]');
    expect(scene).not.toBeNull();
    expect(scene?.getAttribute('data-scene-recompense')).toBe('gobi-joie');
    expect(scene?.querySelector<HTMLImageElement>('img')?.getAttribute('src')).toContain(
      'assets/gobi/animation/joie.webp'
    );
  });

  it('conserve Roc à la reprise puis à la clôture de la sortie', () => {
    const reprise = monter({
      etoiles: 2,
      sortie: sortieAvec('roc'),
      paquet: { noeud: { id: 'clairiere-04', region: 'clairiere' }, habillage: { timings: {} } }
    });
    expect(document.querySelector('[data-compagnon-recompense="roc"]')).not.toBeNull();
    cleanup();

    const dernier = monter({
      etoiles: 2,
      sortie: sortieAvec('roc'),
      paquet: { noeud: { id: 'clairiere-06', region: 'clairiere' }, habillage: { timings: {} } }
    });
    expect(document.querySelector('[data-compagnon-recompense="roc"]')).not.toBeNull();
    expect(document.querySelector('[data-action="fin-sortie"]')).not.toBeNull();
    expect(reprise.getState().sortie?.compagnon).toBe('roc');
    expect(dernier.getState().sortie?.compagnon).toBe('roc');
  });

  it('ne confond pas le compagnon de sortie avec une évolution de Gobi', () => {
    monter({
      etoiles: 2,
      sortie: sortieAvec('roc'),
      paquet: { noeud: { id: 'clairiere-03', region: 'clairiere' }, habillage: { timings: {} } }
    });

    expect(document.querySelector('[data-compagnon-recompense="roc"]')).not.toBeNull();
    expect(document.querySelector('[data-scene-recompense="gobi-joie"]')).toBeNull();
    expect(document.querySelector('[data-evolution-gobi]')).toBeNull();
  });
});

describe('les annonces correspondent à ce qui est réellement remis', () => {
  it('rend observables les trois paliers quand une réussite les franchit ensemble', () => {
    render(
      <CascadeRecompense
        gain={{
          etat: { etoilesTotal: 50, etoilesDepuisIntermediaire: 0, intermediairesTotal: 10, intermediairesDepuisRare: 0, raresTotal: 1, dernierPalierLe: '2026-09-03T09:00:00.000Z' },
          paliersFranchis: ['etoile', 'intermediaire', 'rare'],
          recompenses: [
            { palier: 'etoile', nature: 'etoile', reference: null, asset: null, region: null },
            { palier: 'intermediaire', nature: 'forme-gobi', reference: null, asset: null, region: null },
            { palier: 'rare', nature: 'zone-recoloriee', reference: null, asset: null, region: null },
          ],
          jauges: [],
        }}
      />,
    );
    expect(
      [...document.querySelectorAll('[data-recompense]')].map((element) =>
        element.getAttribute('data-recompense')
      )
    ).toEqual(['etoile', 'intermediaire', 'rare']);
  });

  it('célèbre les paliers sans promettre un cadeau que le serveur n’a pas remis', () => {
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
    expect(annonce).toContain('Tu as franchi un palier !');
    expect(annonce).toContain('Tu as atteint un grand palier !');
    expect(annonce).not.toMatch(/nouvelle forme|nouvelle région|cadeau/iu);
    expect(document.querySelector('[data-recompense="intermediaire"]')).not.toBeNull();
    expect(document.querySelector('[data-recompense="rare"]')).not.toBeNull();
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
  it('met en scène la victoire régionale et renvoie vers la carte quand tous les nœuds sont faits', async () => {
    mondeRecompense.valeur = {
      carte: {
        ouvertesEnParallele: 2,
        regions: [
          {
            region: 'clairiere', ordre: 1, ouverte: true, pourcentageColorie: 1,
            eclatObtenuLe: '2026-09-03T00:00:00.000Z', compagnon: null,
            noeuds: ['clairiere-01', 'clairiere-02']
          }
        ]
      },
      gobi: { stade: 'oeuf', formes: [], formeActive: null },
      compagnons: [{
        code: 'filou', libelle: 'Filou', valeur: 'La malice', domaine: 'Mots outils',
        region: 'clairiere', asset: 'assets/compagnons/filou.png',
        rallieLe: '2026-09-03T00:00:00.000Z'
      }],
      campement: [{
        code: 'fanion-clairiere', libelle: 'le fanion de la Clairière',
        asset: 'assets/coffre/objets/fanion-clairiere.png', region: 'clairiere',
        placeLe: '2026-09-03T00:00:00.000Z'
      }]
    } as EtatMonde;
    progressionRecompense.valeur = [{ noeud: 'clairiere-01', etoiles: 3 }];

    monter({
      profil: { id: 'prf-1', prenom: 'Alma' },
      journalise: false,
      paquet: {
        noeud: { id: 'clairiere-02', region: 'clairiere' },
        exercice: { id: 'ex-02', jeu: { moteur: 'colorie' } },
        habillage: { id: 'ecole', timings: {} }
      },
      resume: resume(0, false),
      demarreLe: '2026-09-03T00:00:00.000Z',
      termineLe: '2026-09-03T00:00:42.000Z'
    });

    await waitFor(() => {
      expect(document.querySelector('[data-victoire-region="oui"]')).not.toBeNull();
    });
    expect(document.querySelector('[data-victoire-region="oui"]')?.textContent).toContain('rallumée');
    expect(document.body.textContent).toContain('tous les exercices');
    expect(document.querySelector('[data-action="continuer-region"]')).toBeNull();
    expect(document.querySelector('[data-action="voir-carte"]')?.className).toContain(
      'action-recompense--principale'
    );
    expect(document.querySelector('[data-compagnon-rallie="filou"]')).not.toBeNull();
    expect(document.querySelector('[data-objet-rapporte="fanion-clairiere"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Filou rejoint ta bande');
    expect(document.body.textContent).toContain('fanion de la Clairière rejoint le campement');
    expect(document.body.textContent).not.toContain('Encore une fois');
  });

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
    expect(texteProgressionRegionale(true, 14, 13)).toBe(
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
