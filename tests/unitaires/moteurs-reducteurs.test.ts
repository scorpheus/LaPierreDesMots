/**
 * Les RÉDUCTEURS des quatorze moteurs, passés par la même batterie — écrit à l'intégration
 * de la campagne v2.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE, mesuré et non supposé.
 *
 * L'annexe T § 7 exige ≥ 80 % sur la zone `moteurs/`. Après la campagne, la zone mesurait
 * **69,83 % de branches (861 / 1233)** : les tests de composant montent chacun leur moteur et
 * tapent le geste nominal, mais aucun ne pousse le réducteur PUR dans ses gardes — l'aide qui
 * escalade puis plafonne, la relecture automatique qui mûrit sans coûter d'étoile, l'action
 * inconnue, la cible inconnue, le geste après la fin. C'est là que vivent les branches, et
 * c'est là qu'un défaut ne se voit pas à l'écran.
 *
 * La batterie est UNIFORME parce que le contrat l'est : le § 4.8 impose aux onze moteurs de
 * L2-E le même motif d'actions — `ecouterConsigne`, `demanderAide`, `battementHorloge` — et
 * les trois autres (`colorie`, `place`, `trace`) le suivent. Un test par moteur écrit à la
 * main aurait treize fois les mêmes oublis ; une table en a zéro.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * CE QUE LA BATTERIE GARANTIT, sur CHAQUE moteur enregistré :
 *
 *   1. la fixture est **validée par le schéma que le moteur publie** — un contenu
 *      inexprimable ne prouverait rien ;
 *   2. `resume().reussi` vaut **toujours `true`** (R14), y compris après une rafale de gestes
 *      refusés : c'est la traduction mécanique de « aucun écran d'échec, jamais » ;
 *   3. **réécouter est gratuit et sans limite** (R15) : dix écoutes n'avancent pas d'un cran
 *      le niveau d'aide et ne comptent aucune erreur ;
 *   4. **l'aide escalade puis PLAFONNE** : elle ne redescend jamais et ne dépasse jamais
 *      `demonstration` ;
 *   5. une **action inconnue** laisse l'état identique — pas d'exception, pas d'impasse ;
 *   6. une **cible inconnue** est refusée sans jamais faire décroître un compteur ;
 *   7. le temps qui passe (`battementHorloge` sur une horloge qu'on avance) ne fait décroître
 *      ni l'avancement, ni le nombre d'étapes, ni le niveau d'aide ;
 *   8. `progression().avancement` reste dans [0, 1] à chaque étape.
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import {
  creerAlea,
  creerHorlogeFigee,
  initialiserRegistreMoteurs,
  moteursEnregistres,
  obtenirMoteur
} from '@pierre/partage';
import type {
  ContexteMoteur,
  Habillage,
  MoteurQuelconque,
  NiveauAide
} from '@pierre/partage';

import { INSTANT_DE_REFERENCE, GRAINE_DE_TEST, lireJson } from '../configuration/preparation.js';

import { contenuAttrape } from '../fixtures/moteurs/attrape.js';
import { contenuTri } from '../fixtures/moteurs/tri.js';
import { contenuAssemble } from '../fixtures/moteurs/assemble.js';
import { contenuChemin } from '../fixtures/moteurs/chemin.js';
import { contenuEclair } from '../fixtures/moteurs/eclair.js';
import { contenuPaires } from '../fixtures/moteurs/paires.js';
import { contenuPhrase } from '../fixtures/moteurs/phrase.js';
import { contenuHistoire } from '../fixtures/moteurs/histoire.js';
import { contenuChrono } from '../fixtures/moteurs/chrono.js';
import { contenuGrave } from '../fixtures/moteurs/grave.js';
import { contenuLibre } from '../fixtures/moteurs/libre.js';

initialiserRegistreMoteurs();

/** Rang des paliers d'aide — le même que celui du socle commun (L2-C). */
const RANG_AIDE: Readonly<Record<NiveauAide, number>> = {
  aucune: 0,
  indice: 1,
  surlignage: 2,
  demonstration: 3
};

interface ExerciceLu {
  readonly jeu: { readonly contenu: unknown; readonly habillage: string };
}

function contenuDeLExercice(chemin: string): unknown {
  return lireJson<ExerciceLu>(chemin).jeu.contenu;
}

/**
 * Une entrée de la table : le moteur, son contenu, son habillage, et **une action au payload
 * volontairement inconnu**. Cette dernière est le seul endroit où la table n'est pas
 * uniforme : chaque moteur nomme sa propre action principale (§ 4.8).
 */
interface CasMoteur {
  readonly code: string;
  readonly contenu: unknown;
  readonly habillage: string;
  /** Action bien formée dont la cible n'existe pas. Doit être refusée, jamais lever. */
  readonly cibleInconnue: { readonly type: string; readonly [cle: string]: unknown };
  /**
   * `false` pour le seul moteur qui n'a PAS d'aide : `libre`.
   *
   * Ce n'est pas une exception de confort, c'est le contrat des features v2 § 4.8, en toutes
   * lettres : « `libre` est le seul moteur sans consigne et sans validation : il ne peut pas
   * être raté, c'est sa raison d'être. Son `resume()` rend `reussi: true`, `nbErreurs: 0`,
   * `aideUtilisee: 'aucune'` — donc trois étoiles à chaque fois, et c'est voulu. » Exiger de
   * lui une escalade d'aide reviendrait à exiger qu'il puisse être raté.
   *
   * Les invariants qui restent vrais pour lui — l'aide ne recule pas, ne dépasse pas
   * `demonstration`, ne compte aucune erreur — sont vérifiés comme pour les treize autres.
   */
  readonly aideEscalade?: boolean;
}

const HABILLAGE_CLAIRIERE = 'contenu/habillages/clairiere/ecole.habillage.json';
const HABILLAGE_PLACE = 'contenu/habillages/clairiere/ecole-place.habillage.json';
const HABILLAGE_TRACE = 'contenu/habillages/galeries/tracer-cristal.habillage.json';
const HABILLAGE_PANIERS = 'contenu/habillages/clairiere/paniers.habillage.json';

const CAS: readonly CasMoteur[] = [
  {
    code: 'attrape',
    contenu: contenuAttrape,
    habillage: 'contenu/habillages/clairiere/lucioles.habillage.json',
    cibleInconnue: { type: 'toucher', cible: 'cible-qui-nexiste-pas' }
  },
  {
    code: 'tri',
    contenu: contenuTri,
    habillage: HABILLAGE_PANIERS,
    cibleInconnue: { type: 'deposer', element: 'inconnu', receptacle: 'inconnu' }
  },
  {
    code: 'assemble',
    contenu: contenuAssemble,
    habillage: 'contenu/habillages/clairiere/collier.habillage.json',
    cibleInconnue: { type: 'poser', bloc: 'bloc-inconnu' }
  },
  {
    code: 'chemin',
    contenu: contenuChemin,
    habillage: 'contenu/habillages/clairiere/lianes.habillage.json',
    cibleInconnue: { type: 'avancer', caseVisee: 'case-inconnue' }
  },
  {
    code: 'eclair',
    contenu: contenuEclair,
    habillage: 'contenu/habillages/clairiere/luciole.habillage.json',
    cibleInconnue: { type: 'repondre', option: 'option-inconnue' }
  },
  {
    code: 'paires',
    contenu: contenuPaires,
    habillage: 'contenu/habillages/cite-des-histoires/cartes.habillage.json',
    cibleInconnue: { type: 'retourner', carte: 'carte-inconnue' }
  },
  {
    code: 'phrase',
    contenu: contenuPhrase,
    habillage: 'contenu/habillages/clairiere/guirlande.habillage.json',
    cibleInconnue: { type: 'placer', etiquette: 'etiquette-inconnue' }
  },
  {
    code: 'histoire',
    contenu: contenuHistoire,
    habillage: 'contenu/habillages/clairiere/veillee.habillage.json',
    cibleInconnue: { type: 'repondre', option: 'option-inconnue' }
  },
  {
    code: 'chrono',
    contenu: contenuChrono,
    habillage: 'contenu/habillages/cite-des-histoires/pellicule.habillage.json',
    cibleInconnue: { type: 'numeroter', vignette: 'vignette-inconnue' }
  },
  {
    code: 'grave',
    contenu: contenuGrave,
    habillage: 'contenu/habillages/foret-muette/buee.habillage.json',
    cibleInconnue: { type: 'graver', lettre: 'é' }
  },
  {
    code: 'libre',
    contenu: contenuLibre,
    habillage: 'contenu/habillages/campement/page-blanche.habillage.json',
    cibleInconnue: { type: 'colorier', region: 'region-inconnue' },
    aideEscalade: false
  },
  {
    code: 'colorie',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-01.json'),
    habillage: HABILLAGE_CLAIRIERE,
    cibleInconnue: { type: 'peindre', region: 'region-inconnue' }
  },
  {
    code: 'place',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-02-place.json'),
    habillage: HABILLAGE_PLACE,
    cibleInconnue: { type: 'deposer', element: 'inconnu', zone: 'inconnue' }
  },
  {
    code: 'trace',
    contenu: contenuDeLExercice('contenu/exercices/galeries/miroir-bd-01.json'),
    habillage: HABILLAGE_TRACE,
    cibleInconnue: { type: 'commencerGeste', echantillon: { point: [-999, -999], instantMs: 0 } }
  }
];

const ajv = new Ajv2020({ allErrors: true, strict: false });

/** Le moteur, son état initial et le contexte — construits une fois par cas. */
function monter(cas: CasMoteur): {
  moteur: MoteurQuelconque;
  etat: unknown;
  contexte: ContexteMoteur;
} {
  const moteur = obtenirMoteur(cas.code as never);
  const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
  const alea = creerAlea(GRAINE_DE_TEST);
  const habillage = lireJson<Habillage>(cas.habillage);
  const etat = moteur.creerEtat({ contenu: cas.contenu as never, habillage, alea, horloge });
  return { moteur, etat, contexte: { alea, horloge } };
}

/** Applique une action au réducteur sans que TypeScript ait à connaître son union. */
function reduire(moteur: MoteurQuelconque, etat: unknown, action: unknown, ctx: ContexteMoteur):
  unknown {
  return (moteur.reduire as (e: unknown, a: unknown, c: ContexteMoteur) => unknown)(
    etat,
    action,
    ctx
  );
}

describe('la table des cas couvre le registre entier', () => {
  it('un cas par moteur enregistré, sans trou ni doublon', () => {
    const declares = [...CAS.map((c) => c.code)].sort();
    const enregistres = [...moteursEnregistres()].sort();
    // Le compte n'est pas recopié : il vient du registre. Un moteur ajouté sans cas échoue ici.
    expect(declares, `cas : ${declares.join(', ')}`).toEqual(enregistres);
    expect(new Set(declares).size).toBe(declares.length);
  });
});

describe.each(CAS.map((cas) => [cas.code, cas] as const))('réducteur %s', (code, cas) => {
  it('la fixture est acceptée par le schéma que le moteur publie lui-même', () => {
    // Sans ce cas, tous les suivants pourraient tourner sur un contenu qu'aucun exercice réel
    // ne pourra jamais avoir — c'est-à-dire ne rien prouver.
    const { moteur } = monter(cas);
    const valider = ajv.compile(moteur.schemaContenu as object);
    const accepte = valider(cas.contenu);
    expect(accepte, `${code} : ${JSON.stringify(valider.errors ?? [])}`).toBe(true);
  });

  it('réécouter est gratuit et sans limite — R15', () => {
    const { moteur, etat, contexte } = monter(cas);
    let courant = etat;
    const aideAvant = moteur.resume(courant as never).aideUtilisee;
    for (let fois = 0; fois < 10; fois += 1) {
      courant = reduire(moteur, courant, { type: 'ecouterConsigne' }, contexte);
    }
    const apres = moteur.resume(courant as never);
    expect(apres.aideUtilisee, `${code} : écouter a coûté une aide`).toBe(aideAvant);
    expect(apres.nbErreurs, `${code} : écouter a compté une erreur`).toBe(0);
    expect(apres.reussi).toBe(true);
  });

  it('l’aide escalade, ne redescend jamais, et plafonne à `demonstration`', () => {
    const { moteur, etat, contexte } = monter(cas);
    let courant = etat;
    let precedent = 0;
    for (let fois = 0; fois < 6; fois += 1) {
      courant = reduire(moteur, courant, { type: 'demanderAide' }, contexte);
      const niveau = moteur.resume(courant as never).aideUtilisee;
      const rang = RANG_AIDE[niveau];
      expect(rang, `${code} : l’aide est redescendue à ${niveau}`).toBeGreaterThanOrEqual(
        precedent
      );
      expect(rang, `${code} : l’aide a dépassé demonstration`).toBeLessThanOrEqual(
        RANG_AIDE.demonstration
      );
      precedent = rang;
    }
    if (cas.aideEscalade !== false) {
      // Six demandes valent au moins un palier : une aide qui ne bouge jamais serait un défaut.
      expect(precedent, `${code} : demanderAide n’a jamais rien donné`).toBeGreaterThan(0);
      expect(moteur.aideProposee(courant as never)).not.toBeNull();
    } else {
      // `libre` : aucune aide, parce qu'il ne peut pas être raté (§ 4.8).
      expect(precedent, `${code} : ce moteur ne doit proposer aucune aide`).toBe(0);
      expect(moteur.aideProposee(courant as never)).toBeNull();
    }
    // L'aide de Gobi ne compte JAMAIS comme une erreur (v2 § 5.4).
    expect(moteur.resume(courant as never).nbErreurs).toBe(0);
  });

  it('une action inconnue laisse l’état identique — aucune impasse', () => {
    const { moteur, etat, contexte } = monter(cas);
    const apres = reduire(moteur, etat, { type: 'action-qui-nexiste-pas' }, contexte);
    expect(apres, `${code} : une action inconnue a modifié l’état`).toEqual(etat);
  });

  it('une cible inconnue est refusée sans faire décroître un compteur', () => {
    const { moteur, etat, contexte } = monter(cas);
    const avant = moteur.resume(etat as never);
    const apres = reduire(moteur, etat, cas.cibleInconnue, contexte);
    const resume = moteur.resume(apres as never);
    expect(resume.reussi, `${code} : R14 violée`).toBe(true);
    expect(resume.nbErreurs, `${code} : un compteur a décru`).toBeGreaterThanOrEqual(
      avant.nbErreurs
    );
    expect(moteur.progression(apres as never).avancement).toBeGreaterThanOrEqual(0);
  });

  it('le temps qui passe ne fait décroître ni l’avancement, ni le niveau d’aide', () => {
    const { moteur, etat, contexte } = monter(cas);
    let courant = etat;
    let avancement = moteur.progression(courant as never).avancement;
    let rangAide = RANG_AIDE[moteur.resume(courant as never).aideUtilisee];

    // Trente battements sur cinq minutes simulées : de quoi franchir les seuils d'inactivité
    // et de relecture automatique, qui sont les branches que rien d'autre n'atteint.
    for (let battement = 0; battement < 30; battement += 1) {
      contexte.horloge.avancer({ secondes: 10 });
      courant = reduire(moteur, courant, { type: 'battementHorloge' }, contexte);

      const progression = moteur.progression(courant as never);
      expect(progression.avancement, `${code} : avancement hors de [0, 1]`).toBeGreaterThanOrEqual(
        0
      );
      expect(progression.avancement).toBeLessThanOrEqual(1);
      expect(progression.avancement, `${code} : l’avancement a reculé`).toBeGreaterThanOrEqual(
        avancement
      );
      avancement = progression.avancement;

      const resume = moteur.resume(courant as never);
      expect(resume.reussi, `${code} : R14 violée au battement ${String(battement)}`).toBe(true);
      const rang = RANG_AIDE[resume.aideUtilisee];
      expect(rang, `${code} : le niveau d’aide a reculé`).toBeGreaterThanOrEqual(rangAide);
      rangAide = rang;
    }
  });

  it('`resume()` reste cohérent : jamais d’échec, jamais d’étape négative', () => {
    const { moteur, etat, contexte } = monter(cas);
    // Une rafale mêlée : aide, écoute, cible inconnue, battement, action inconnue.
    const rafale: readonly unknown[] = [
      { type: 'demanderAide' },
      cas.cibleInconnue,
      { type: 'ecouterConsigne' },
      { type: 'battementHorloge' },
      { type: 'inconnue' },
      cas.cibleInconnue
    ];
    let courant = etat;
    for (const action of rafale) {
      courant = reduire(moteur, courant, action, contexte);
    }
    const resume = moteur.resume(courant as never);
    expect(resume.reussi, `${code} : R14 violée`).toBe(true);
    expect(resume.nbErreurs).toBeGreaterThanOrEqual(0);
    expect(resume.dureeMs).toBeGreaterThanOrEqual(0);
    for (const etape of resume.etapes) {
      expect(etape.nbErreurs, `${code} : étape ${etape.identifiant}`).toBeGreaterThanOrEqual(0);
      expect(etape.nbEcoutes).toBeGreaterThanOrEqual(0);
      expect(etape.dureeMs).toBeGreaterThanOrEqual(0);
      // D18 : `null` est une valeur, jamais un zéro inventé.
      expect(etape.latenceMs === null || etape.latenceMs >= 0).toBe(true);
    }
  });
});
