/**
 * REPRODUCTION DU DÉFAUT n° 2 — « je n'ai pas réussi à faire le d ».
 *
 * Le père a joué `galeries-01` (exercice `galeries-miroir-bd-01`, moteur `trace`) et n'a pas
 * pu graver le `d`. Ce fichier ne corrige rien : il mesure pourquoi, et il échoue tant que la
 * cause tient.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LA SOURCE QUI FAIT FOI EST **D33** (`Docs/journal-des-decisions.md`), et elle est arrivée
 * AVANT ce fichier — signalée par la mère de l'enfant sur le même essai réel. Rien ici n'est
 * dérivé d'une opinion sur la façon d'écrire ; tout est cité de D33 :
 *
 *   • le **ductus** est un code commun, pas une convention libre ;
 *   • pour le `d`, le geste part **en haut à droite**, tourne dans le **sens antihoraire** —
 *     comme pour tracer un `o` — puis remonte ; la boucle vient **avant** la haste ;
 *   • conséquence 1 : le ductus est une **donnée déclarée**
 *     (`contenu/referentiel/ductus-*.json`), jamais dérivée de la forme ;
 *   • conséquence 2 : « un tracé au bon endroit mais dans le mauvais sens n'est pas une
 *     réussite » ;
 *   • conséquence 5 : « on assouplit la **précision** (R16 — aucune coordination fine),
 *     jamais le **sens** ».
 *
 * Ce fichier n'assouplit donc RIEN sur le sens. Il mesure que le modèle livré enseigne
 * l'inverse du ductus, et que R16 n'est pas tenue sur la précision.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * SOURCES LUES SUR DISQUE, JAMAIS RECALCULÉES : `contenu/exercices/galeries/miroir-bd-01.json`
 * et `contenu/modeles-lettres/minuscules.json` pour les modèles ;
 * `partage/src/moteurs/trace/validation.ts` pour les seuils.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DELAIS_AIDE_PAR_DEFAUT } from '@partage/moteurs/commun/index';
import { moteurTrace } from '@partage/moteurs/trace/moteur';
import {
  COUVERTURE_MINIMALE,
  TOLERANCE_TRACE_PX,
  evaluerTrait,
} from '@partage/moteurs/trace/validation';

import type {
  ActionTrace,
  ContenuTrace,
  EchantillonGeste,
  EtatTrace,
  ModeleLettre,
  TraitLettre,
} from '@partage/moteurs/trace/index';
import type { Exercice } from '@pierre/partage';

import { RACINE_DEPOT, aleaDeTest, horlogeDeTest, lireJson } from '../configuration/preparation.js';

const CHEMIN_BD = 'contenu/exercices/galeries/miroir-bd-01.json';
const CHEMIN_DUCTUS = 'contenu/referentiel/ductus-minuscules.json';

const contenu = lireJson<Exercice>(CHEMIN_BD).jeu.contenu as unknown as ContenuTrace;
const bibliotheque = lireJson<{ lettres: readonly ModeleLettre[] }>(
  'contenu/modeles-lettres/minuscules.json',
);

/**
 * Le ductus DÉCLARÉ (D33, conséquence 1). C'est lui qui fait foi, jamais l'ordre des points
 * du modèle : construire « le geste de l'école » à partir du fichier qu'on veut juger serait
 * circulaire, et le cas passerait quel que soit le sens livré.
 */
interface DuctusDeclare {
  readonly regles: readonly {
    readonly id: string;
    readonly lettres?: readonly {
      readonly lettre: string;
      readonly premierTrait: string;
      readonly depart: readonly [number, number];
      readonly sens: 'horaire' | 'antihoraire' | 'sans-objet';
    }[];
  }[];
}
const ductus = lireJson<DuctusDeclare>(CHEMIN_DUCTUS);
const ductusDuD = ductus.regles
  .flatMap((r) => r.lettres ?? [])
  .find((l) => l.lettre === 'd')!;
// Demande du parent du 9 septembre : la panse conserve son parcours ; seul son rang change.
const panseDuDDeclaree = { depart: [70, 60], sens: 'antihoraire' } as const;

/** La lettre que le père n'a pas réussi à graver. */
const lettreD: ModeleLettre = contenu.lettres.find((l) => l.lettre === 'd')!;
const rondDuD: TraitLettre = lettreD.traits.find((t) => t.libelle === 'le rond')!;
const barreDuD: TraitLettre = lettreD.traits.find((t) => t.libelle === 'la grande barre')!;

/** `min(100%, 420px)` de `MoteurTrace.tsx`, sur un `viewBox` large de 100 unités. */
const LARGEUR_RENDU_PX = 420;
const UNITES_PAR_PX = 100 / LARGEUR_RENDU_PX;

/**
 * Sens de parcours d'un trait fermé ou courbe, par l'aire signée (formule du lacet).
 *
 * Le `viewBox` SVG a l'axe **y vers le bas** : une aire signée POSITIVE y correspond donc au
 * sens **horaire** à l'écran, l'inverse de la convention mathématique usuelle. C'est le genre
 * de signe qu'on n'affirme pas — la fonction est vérifiée sur un cas connu ci-dessous.
 */
function sensDeRotation(points: readonly (readonly [number, number])[]): 'horaire' | 'antihoraire' {
  let aire = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    aire += a[0] * b[1] - b[0] * a[1];
  }
  return aire > 0 ? 'horaire' : 'antihoraire';
}

/** Un geste dense le long d'une polyligne — un doigt, pas neuf téléportations. */
function gesteLeLongDe(
  points: readonly (readonly [number, number])[],
  pasUnites = 2,
): readonly EchantillonGeste[] {
  const sortie: EchantillonGeste[] = [];
  let instantMs = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const longueur = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nb = Math.max(1, Math.round(longueur / pasUnites));
    for (let k = 0; k < nb; k += 1) {
      const f = k / nb;
      instantMs += 10;
      sortie.push({
        point: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        instantMs,
      });
    }
  }
  const dernier = points[points.length - 1]!;
  instantMs += 10;
  sortie.push({ point: [dernier[0], dernier[1]], instantMs });
  return sortie;
}

/** Décale un geste entier de `dxPx`, `dyPx` pixels CSS. */
function decale(
  geste: readonly EchantillonGeste[],
  dxPx: number,
  dyPx: number,
): readonly EchantillonGeste[] {
  return geste.map((e) => ({
    point: [e.point[0] + dxPx * UNITES_PAR_PX, e.point[1] + dyPx * UNITES_PAR_PX] as const,
    instantMs: e.instantMs,
  }));
}

/**
 * Le rond du `d` conserve le parcours déclaré par D33 et confirmé le 9 septembre ;
 * l'oracle de sa panse est explicite, indépendant de la géométrie livrée.
 *
 * Des deux parcours possibles d'un arc, on retient celui qui part du point déclaré ET tourne
 * dans le sens déclaré. Si aucun ne convient, le modèle ne dessine pas la lettre annoncée :
 * on lève plutôt que de rendre un geste qui ferait passer le cas pour de mauvaises raisons.
 */
function pointsDuDuctusDeclare(): readonly (readonly [number, number])[] {
  for (const candidat of [rondDuD.points, [...rondDuD.points].reverse()]) {
    const premier = candidat[0]!;
    if (
      premier[0] === panseDuDDeclaree.depart[0] &&
      premier[1] === panseDuDDeclaree.depart[1] &&
      sensDeRotation(candidat) === panseDuDDeclaree.sens
    ) {
      return candidat;
    }
  }
  throw new Error(
    `le rond du \`d\` ne peut se parcourir depuis ${JSON.stringify(panseDuDDeclaree.depart)} ` +
      `en sens ${panseDuDDeclaree.sens} : depart livré ${JSON.stringify(rondDuD.depart)}, ` +
      `sens livré ${sensDeRotation(rondDuD.points)}`,
  );
}

function etatNeuf(): EtatTrace {
  return moteurTrace.creerEtat({
    contenu,
    habillage: lireJson('contenu/habillages/galeries/tracer-cristal.habillage.json'),
    alea: aleaDeTest(),
    horloge: horlogeDeTest(),
  });
}

function jouer(etat: EtatTrace, actions: readonly ActionTrace[]): EtatTrace {
  const contexte = { alea: aleaDeTest(), horloge: horlogeDeTest() };
  return actions.reduce((courant, action) => moteurTrace.reduire(courant, action, contexte), etat);
}

/** Traduit un geste en la séquence d'actions que produit `MoteurTrace.tsx`. */
function actionsDuGeste(geste: readonly EchantillonGeste[]): readonly ActionTrace[] {
  const [premier, ...suite] = geste;
  return [
    { type: 'commencerGeste', echantillon: premier! },
    ...suite.map((echantillon): ActionTrace => ({ type: 'prolongerGeste', echantillon })),
    { type: 'terminerGeste' },
  ];
}

// ═══════════════════════════════════════════════════════════════════ D33, le ductus

describe('ductus du d — panse D33, ordre confirmé par le parent le 9 septembre', () => {
  it('la mesure du sens de rotation est juste sur un cas connu', () => {
    // Contrôle de l'instrument, avant de s'en servir : un carré parcouru vers la droite puis
    // vers le bas est HORAIRE à l'écran (y vers le bas). Sans ce cas, un signe inversé ferait
    // dire n'importe quoi aux trois suivants.
    expect(
      sensDeRotation([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toBe('horaire');
  });

  it('le ductus est une DONNÉE DÉCLARÉE du référentiel (D33, conséquence 1)', () => {
    const fichiers = readdirSync(join(RACINE_DEPOT, 'contenu', 'referentiel'));
    expect(
      fichiers.filter((f) => f.startsWith('ductus-')),
      `contenu/referentiel/ : ${fichiers.join(', ')}`,
    ).not.toEqual([]);
  });

  it('le rond du `d` part EN HAUT à droite', () => {
    // D33 : « le geste part en haut à droite de la lettre ». Dans ce `viewBox`, la hauteur
    // d'x est y = 60 (haut du rond) et la ligne de base y = 100 (bas du rond).
    const [, y] = rondDuD.depart;
    expect(y, `depart = ${JSON.stringify(rondDuD.depart)}`).toBeLessThan(80);
  });

  it('le rond du `d` tourne dans le sens ANTIHORAIRE', () => {
    // D33 : « tourne dans le sens antihoraire — comme pour tracer un `o` ».
    expect(sensDeRotation(rondDuD.points)).toBe('antihoraire');
  });

  it('les panses d et q conservent le même parcours malgré leur nouvel ordre différent', () => {
    // L'arbitrage du 9 septembre change seulement l'ordre du d ; le q est inchangé.
    const q = bibliotheque.lettres.find((l) => l.lettre === 'q')!;
    const rondDuQ = q.traits.find((t) => t.libelle === 'le rond')!;

    expect(sensDeRotation(rondDuD.points), '`d` vs `q` : sens de rotation').toBe(
      sensDeRotation(rondDuQ.points),
    );
    // Même position de départ à la hauteur près : haut pour les deux, ou bas pour les deux.
    expect(rondDuD.depart[1], '`d` vs `q` : hauteur du point de départ').toBe(rondDuQ.depart[1]);
  });

  it('la barre vient avant la panse, selon la confirmation du parent du 9 septembre', () => {
    expect(lettreD.traits[0]?.id).toBe(ductusDuD.premierTrait);
    expect(lettreD.traits[0]?.libelle).toBe('la grande barre');
    expect(lettreD.traits[1]?.libelle).toBe('le rond');
  });
});

describe('ce que le ductus faux fait vivre à l’enfant', () => {
  it('un `d` tracé selon le ductus de D33 est ACCEPTÉ', () => {
    // Le geste de l'école : départ en haut à droite, rotation antihoraire — lus dans le
    // référentiel, pas dans le modèle. Le modèle LIVRÉ partait d'en bas et tournait à
    // l'horaire : ce geste-là en était exactement le parcours inverse, et le moteur le
    // refusait `sens-inverse` — à juste titre (D33, conséquence 2), c'est le MODÈLE qui
    // enseignait l'envers. Sortie citée avant correction :
    //   couverture mesurée : 0.22: expected 'sens-inverse' to be null
    const gesteDeLEcole = gesteLeLongDe(pointsDuDuctusDeclare());
    const decision = evaluerTrait(lettreD, rondDuD, gesteDeLEcole);
    expect(decision.motif, `couverture mesurée : ${decision.couverture.toFixed(2)}`).toBeNull();
    expect(decision.acceptee).toBe(true);
  });

  it('une erreur de SENS n’est pas journalisée comme une confusion miroir b/d', () => {
    // D33 dit qu'un mauvais sens n'est pas une réussite ; il ne dit pas que c'est une
    // confusion b/d. Or `axeParInversionDeSens` rendait `modele.axeRisque` sur le seul motif
    // `sens-inverse` : le top 10 des confusions de D23 comptait alors des erreurs de ductus
    // comme des confusions miroir, et l'indicateur cessait de mesurer ce qu'il annonce —
    // exactement ce que l'entête de `validation.ts` interdit (« l'axe est obtenu par la
    // GÉOMÉTRIE, jamais par déclaration »).
    const aContreSens = gesteLeLongDe([...pointsDuDuctusDeclare()].reverse());
    const decision = evaluerTrait(lettreD, rondDuD, aContreSens);
    // Le refus reste entier : seul son ÉTIQUETAGE en confusion miroir était faux.
    expect(decision.motif).toBe('sens-inverse');
    expect(decision.axe).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════ R16, la précision (D33, § 5)

describe('R16 — on assouplit la précision, jamais le sens (D33, conséquence 5)', () => {
  it('la fenêtre d’acceptation du point de départ mesure au moins 64 px CSS', () => {
    // CLAUDE.md, règle 5 : « Cibles >= 64 px, tolérance 24 px, aucune coordination fine
    // exigée ». La zone où le doigt est accepté est un DISQUE de rayon
    // `TOLERANCE_TRACE_PX` : elle fait donc 48 px de large, moins que la plus petite cible
    // tapable de l'application.
    expect(2 * TOLERANCE_TRACE_PX).toBeGreaterThanOrEqual(64);
  });

  it('un `d` bien tracé, mais posé 20 px à côté, est accepté', () => {
    // 20 px CSS : moins que la tolérance annoncée (24 px), et pourtant le geste ENTIER est
    // décalé — c'est ce que fait un doigt d'enfant sur une tablette tenue à la main. Le sens
    // est le bon, seule la précision manque : D33 § 5 demande justement de l'assouplir.
    const decision = evaluerTrait(lettreD, rondDuD, decale(gesteLeLongDe(rondDuD.points), 20, 20));
    expect(decision.motif).toBeNull();
    expect(decision.acceptee).toBe(true);
  });

  it('COUVERTURE_MINIMALE reste le seuil déclaré, sans dérive silencieuse', () => {
    // Contrôle de non-dérive : c'est un PLACEHOLDER de `validation.ts`. S'il bouge sous les
    // autres mesures de ce fichier, ce cas le dit.
    expect(COUVERTURE_MINIMALE).toBe(0.8);
  });
});

// ═══════════════════════════════════════════ l'ordre imposé, et le silence qui l'accompagne

describe('L’ORDRE des traits est imposé, mais jamais expliqué', () => {
  /**
   * CORRECTION DE HARNAIS, mesurée. Les trois cas ci-dessous vérifient qu'un rond tenté trop
   * tôt sur le `d` est refusé et guidé vers la grande barre, mais `etatNeuf()` ouvre l'exercice
   * sur le `b` :
   * `contenu.lettres` vaut `[b, d]` et `creerEtat` place `indexLettre` à 0. Le geste y était
   * donc jugé contre la grande barre du `b`, à `x = 30`, et le moteur répondait
   * `depart-eloigne` pour la bonne raison — ce n'est pas un problème d'ordre, c'est le trait
   * d'une AUTRE lettre. Aucune correction du moteur ne pouvait rendre `trait-hors-ordre` sur
   * cet état-là sans mentir, et aucune ne pouvait nommer « le rond » alors que le trait
   * attendu s'appelait « la grande barre ».
   *
   * On amène donc l'état là où les trois énoncés se placent : le `b` soldé, l'exercice sur le
   * `d`. Les assertions portent ensuite explicitement sur le rond joué avant la barre.
   */
  function etatSurLeD(): EtatTrace {
    expect(contenu.lettres[0]?.lettre, 'l’exercice ouvre bien sur le `b`').toBe('b');
    let etat = etatNeuf();
    for (const trait of contenu.lettres[0]!.traits) {
      etat = jouer(etat, actionsDuGeste(gesteLeLongDe(trait.points)));
    }
    expect(etat.indexLettre, 'le `b` est soldé, on est arrivé au `d`').toBe(1);
    expect(etat.nbErreurs, 'on arrive au `d` sans dette d’erreur').toBe(0);
    return etat;
  }

  it('commencer le `d` par le rond est diagnostiqué `trait-hors-ordre`', () => {
    // La demande du parent du 9 septembre impose la barre avant le rond.
    // Le même diagnostic doit guider un rond tracé trop tôt vers la barre attendue.
    const etat = jouer(etatSurLeD(), actionsDuGeste(gesteLeLongDe(rondDuD.points)));
    expect(etat.dernierRefus?.motif).toBe('trait-hors-ordre');
  });

  it('le refus nomme le trait attendu, pour que l’enfant sache quoi refaire', () => {
    const etat = jouer(etatSurLeD(), actionsDuGeste(gesteLeLongDe(rondDuD.points)));
    // Sans libellé du trait attendu, le seul retour à l'écran est « On recommence ce trait,
    // tranquillement. », qui ne dit rien de ce qu'il faut changer.
    expect(etat.aide?.libelle ?? null).toBe(barreDuD.libelle);
  });

  it('cinq tentatives dans le mauvais ordre déclenchent l’aide de Gobi', () => {
    // Un rond commencé avant la barre rend désormais `trait-hors-ordre`. Ce refus compte comme
    // une vraie tentative guidée : après le seuil déclaré, Gobi intervient sans attendre.
    let etat = etatSurLeD();
    for (let essai = 0; essai < 5; essai += 1) {
      etat = jouer(etat, actionsDuGeste(gesteLeLongDe(rondDuD.points)));
    }
    expect(etat.nbErreurs, 'cinq tentatives refusées ont été comptées').toBeGreaterThanOrEqual(
      DELAIS_AIDE_PAR_DEFAUT.erreursAvantIndice,
    );
    expect(etat.niveauAide, 'Gobi est intervenu de lui-même').not.toBe('aucune');
  });
});

describe('contrôle — la mécanique fonctionne quand le modèle est suivi', () => {
  it('un doigt d’enfant grave le `d` en deux traits', () => {
    // Ce cas doit PASSER, aujourd'hui et après le correctif : il prouve que les échecs
    // ci-dessus viennent du ductus et de la tolérance, pas d'un harnais cassé.
    let etat = etatNeuf();
    for (const trait of contenu.lettres[0]!.traits) {
      etat = jouer(etat, actionsDuGeste(gesteLeLongDe(trait.points)));
    }
    expect(etat.indexLettre, 'le `b` est soldé, on est bien arrivé au `d`').toBe(1);

    for (const trait of lettreD.traits) {
      etat = jouer(etat, actionsDuGeste(decale(gesteLeLongDe(trait.points), 6, 6)));
    }
    expect(etat.termineMs, 'le `d` est gravé, l’exercice se termine').not.toBeNull();
    expect(etat.nbErreurs, 'aucun geste conforme au modèle n’a été facturé').toBe(0);
  });
});
