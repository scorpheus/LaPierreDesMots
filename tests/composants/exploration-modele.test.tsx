/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE MODÈLE CONTRE LE RÉEL — lot Q2.
 *
 * `tests/modele/modele-navigation.ts` déclare la machine à états : quels écrans existent,
 * quelles actions y sont possibles, où chacune mène. `tests/modele/explorateur.tsx` monte
 * l'application RÉELLE, énumère exhaustivement les éléments tapables de chaque écran atteint,
 * et rend le graphe qu'il a vu. Ce fichier confronte les deux, et ne fait que cela.
 *
 * ── LES QUATRE DÉFAUTS QU'AUCUNE AUTRE SUITE DU DÉPÔT NE VOIT ─────────────────────────────
 *
 *   1. **un écran atteignable que personne n'a prévu** — observé, absent du modèle ;
 *   2. **une action qui mène ailleurs que prévu** — `parcours-audit-tout-le-site.spec.ts`
 *      exige de chaque écran « une sortie » ; un bouton « Le campement » qui ouvrirait le
 *      coffre le laisserait vert, puisqu'il mène bien AILLEURS. Ici, la destination compte ;
 *   3. **un écran déclaré et inatteignable** — le défaut des Galeries, retourné ;
 *   4. **une transition manquante** — le bouton retour absent : déclarée, jamais observée.
 *
 * ── CE QUE CE FICHIER NE PROUVE PAS, ET IL FAUT LE LIRE AVANT LES RÉSULTATS ────────────────
 * L'explorateur parle à un DOUBLE de réseau (`tests/modele/serveur-double.ts`), pas au vrai
 * serveur : sous `happy-dom`, `serveur/src/configuration.ts` ne se charge pas (mesure citée
 * dans l'en-tête du double). Ce fichier ne prouve donc RIEN sur le serveur — c'est le travail
 * de `tests/api/**`. Il prouve la navigation du client, et le double porte trois gardes pour
 * qu'il ne puisse pas affamer un écran en silence.
 *
 * ── LE COÛT, ANNONCÉ ──────────────────────────────────────────────────────────────────────
 * Une exploration complète monte l'application ~80 fois et joue ~500 gestes : de l'ordre de
 * 35 s, contre ~8 s pour les 96 autres fichiers réunis. C'est le prix d'une QA qui parcourt
 * l'application au lieu de monter des fragments, et c'est le seul fichier du dépôt qui le
 * paie. Arbitrage consigné dans `Docs/questions-en-attente.md` (Q2-3).
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { explorer, decrireChemin } from '../modele/explorateur.js';
import type { RapportExploration } from '../modele/explorateur.js';
import {
  CODES_ETATS,
  ETATS,
  ETATS_JOUABLES,
  ETAT_RACINE,
  RECETTES,
  TRANSITIONS,
  cle
} from '../modele/modele-navigation.js';

/**
 * Profondeur maximale, en pas depuis la racine.
 *
 * Six : le chemin le plus long du modèle en compte quatre (`galerie-parent`). La marge n'est
 * pas décorative — c'est elle qui laisse l'explorateur découvrir un écran plus profond que ce
 * que le modèle prévoit, et donc le signaler.
 */
const PROFONDEUR_MAX = 6;

/** Les transitions que l'explorateur DOIT exercer : toutes sauf celles hors de sa portée. */
const A_EXERCER = TRANSITIONS.filter((transition) => transition.horsPorteeExplorateur === undefined);

let rapport: RapportExploration;
let avertissementsAct = 0;

beforeAll(async () => {
  const erreur = console.error;
  const observation = vi.spyOn(console, 'error').mockImplementation((...argumentsErreur: unknown[]) => {
    if (String(argumentsErreur[0]).includes('not configured to support act')) avertissementsAct += 1;
    erreur(...argumentsErreur);
  });
  try {
    rapport = await explorer({
      profondeurMax: PROFONDEUR_MAX,
      declarees: A_EXERCER.filter((transition) => transition.prise !== null).map((transition) => ({
        depuis: transition.depuis,
        prise: transition.prise as NonNullable<typeof transition.prise>
      })),
      recettes: RECETTES.map((recette) => ({
        nom: recette.nom,
        depuis: recette.depuis,
        gestes: recette.gestes
      }))
    });
  } finally {
    observation.mockRestore();
  }

  console.log(
    `[q2] ${String(rapport.ecransAtteints.length)} écran(s) atteint(s) · ` +
      `${String(rapport.ecransExplores.length)} exploré(s) · ` +
      `${String(rapport.transitions.length)} transition(s) observée(s) · ` +
      `${String(rapport.nbActionsJouees)} geste(s) · ` +
      `${String(rapport.nbSessions)} montage(s) · profondeur ${String(rapport.profondeurMax)}`
  );
  for (const [ecran, chemin] of rapport.cheminsParEcran) {
    console.log(`[q2] ${ecran} ← ${decrireChemin(chemin)}`);
  }
}, 900_000);

// ═══════════════════════════════════════════ 0. LA MESURE VAUT-ELLE QUELQUE CHOSE ?

describe('l’exploration a réellement eu lieu', () => {
  it('configure les mises à jour React sans saturer le canal de diagnostics', () => {
    expect(avertissementsAct, 'chaque avertissement React traverse le canal RPC de Vitest').toBe(0);
  });
  it('a monté l’application, joué des gestes, et atteint des écrans', () => {
    // Sans ces planchers, tous les cas ci-dessous resteraient verts sur une exploration vide.
    // C'est le défaut n° 6 de l'historique — « 14 moteurs joués sur 14 » assertí `> 0`.
    expect(rapport.nbSessions, 'aucun montage de l’application').toBeGreaterThanOrEqual(20);
    expect(rapport.nbActionsJouees, 'aucun geste joué').toBeGreaterThanOrEqual(300);
    expect(rapport.ecransAtteints.length, 'aucun écran atteint').toBeGreaterThanOrEqual(
      ETATS_JOUABLES.length
    );
  });

  it('a énuméré des éléments tapables sur CHAQUE écran exploré', () => {
    const muets = rapport.ecransExplores.filter(
      (ecran) => (rapport.interactifsParEcran.get(ecran) ?? 0) === 0
    );
    expect(
      muets,
      'un écran sans le moindre élément tapable n’a pas été énuméré : il a été effleuré'
    ).toEqual([]);
  });

  it('le rejeu est DÉTERMINISTE — même chemin, même écran, même élément', () => {
    // D3 : l'aléatoire et l'horloge sont injectés et figés. Si un rejeu diverge, ce n'est pas
    // l'explorateur qui est en tort : c'est l'application qui n'est pas reproductible, et
    // c'est un défaut plus grave que tous ceux que ce fichier cherche.
    expect(rapport.rejeuxIncoherents, 'le rejeu a divergé').toEqual([]);
  });

  it('l’interface se stabilise sur chaque écran', () => {
    expect(
      rapport.stabilisationsNonAtteintes,
      'l’interface n’a jamais cessé de bouger : un rendu en boucle, ou une requête qui ne ' +
        'retombe pas. Dans les deux cas, c’est l’enfant qui attend'
    ).toEqual([]);
  });

  it('aucune requête n’a survécu au démontage', () => {
    // Une requête tardive part sur le VRAI réseau une fois le fichier terminé, et Vitest en
    // impute l'échec au fichier qu'il est en train d'afficher. Mesuré, avant l'aiguillage
    // unique de `explorateur.tsx` : deux fichiers innocents rougissaient sur
    // `connect ECONNREFUSED ::1:3000`, et LESQUELS changeait d'une exécution à l'autre.
    expect(
      rapport.appelsTardifs,
      'des requêtes sont retombées hors session : elles feraient rougir d’autres fichiers'
    ).toEqual([]);
  });

  it('le double de réseau n’a affamé aucun écran', () => {
    // Un double silencieux ferait passer un défaut du DOUBLE pour un écran sans issue. C'est
    // arrivé pendant l'écriture de ce lot, et c'est ce garde qui l'a dit.
    expect(
      rapport.appelsSansGestionnaire,
      'des appels réseau n’ont pas été servis : les écrans concernés se sont rendus vides'
    ).toEqual([]);
  });
});

// ═════════════════════════════════ 1. UN ÉCRAN ATTEIGNABLE QUE PERSONNE N'A PRÉVU

describe('aucun écran atteignable que le modèle n’a prévu', () => {
  it('tout écran atteint figure dans le modèle', () => {
    const inconnus = rapport.ecransAtteints.filter((ecran) => !CODES_ETATS.includes(ecran));
    expect(
      inconnus,
      'l’exploration a atteint des écrans que `tests/modele/modele-navigation.ts` ne déclare ' +
        'pas. Soit l’application a gagné un écran sans que le modèle suive, soit un rendu ' +
        'dégradé (composant en erreur, `data-ecran` perdu) fait apparaître un état qui n’a ' +
        'pas de nom — et un état sans nom est un état que personne ne garde'
    ).toEqual([]);
  });
});

// ═════════════════════════════════════ 2. UN ÉCRAN DÉCLARÉ ET INATTEIGNABLE

describe('aucun écran déclaré et inatteignable', () => {
  it('tout état JOUABLE du modèle a été atteint par une interaction réelle', () => {
    const jamais = ETATS_JOUABLES.filter((ecran) => !rapport.ecransAtteints.includes(ecran));
    expect(
      jamais,
      'ces écrans existent dans le code et aucune suite de taps ne les atteint. C’est la ' +
        'forme exacte du défaut n° 1 du père, retournée : non pas « on ne peut pas en ' +
        'sortir », mais « on ne peut pas y entrer »'
    ).toEqual([]);
  });

  it('les états NON jouables sont couverts ailleurs, et le fichier le prouve', () => {
    // Une couverture qui s'accorde des dérogations ne prouve plus rien : on ne les EXEMPTE
    // pas, on exige qu'elles soient tenues ailleurs et on vérifie que le fichier existe.
    // (L'existence des fichiers est vérifiée par `modele-navigation-coherence.test.ts` ;
    //  ici on vérifie qu'aucune dérogation ne s'est glissée dans un état jouable.)
    const derogations = ETATS.filter((etat) => etat.nature !== 'jouable').map((etat) => etat.code);
    expect(derogations.length, 'trop d’écrans échappent à l’exploration').toBeLessThanOrEqual(2);
    expect([...derogations].sort()).toEqual(['chargement', 'recompense']);
  });
});

// ══════════════════════════════ 3. UNE ACTION QUI MÈNE AILLEURS QUE PRÉVU

describe('aucune action ne mène ailleurs que prévu', () => {
  it('toute transition OBSERVÉE est déclarée par le modèle', () => {
    const declarees = new Set(TRANSITIONS.map((transition) => cle(transition.depuis, transition.vers)));
    const surprises = [
      ...new Set(
        rapport.transitions
          .filter((transition) => transition.vers !== transition.depuis)
          .filter((transition) => !declarees.has(cle(transition.depuis, transition.vers)))
          .map(
            (transition) =>
              `${cle(transition.depuis, transition.vers)} — par « ${transition.description} » ` +
              `(passe ${transition.passe})`
          )
      )
    ].sort();
    expect(
      surprises,
      'des taps mènent quelque part que le modèle n’a pas prévu. Chacun est soit un défaut de ' +
        'navigation, soit un modèle en retard — et il faut trancher, pas ignorer'
    ).toEqual([]);
  });

  it('chaque PRISE déclarée mène exactement où le modèle l’annonce', () => {
    const attendu = new Map(
      TRANSITIONS.filter((transition) => transition.prise !== null).map((transition) => [
        `${transition.depuis}|${transition.prise?.selecteur ?? ''}|${transition.prise?.libelle ?? ''}`,
        transition.vers
      ])
    );
    const ecarts = rapport.declareesVerifiees
      .filter((verdict) => verdict.priseTrouvee)
      .map((verdict) => {
        const identite = `${verdict.depuis}|${verdict.prise.selecteur}|${verdict.prise.libelle ?? ''}`;
        const promis = attendu.get(identite);
        return promis === verdict.vers
          ? null
          : `${verdict.depuis} --(${verdict.prise.selecteur})--> attendu « ${String(promis)} », ` +
              `obtenu « ${String(verdict.vers)} »`;
      })
      .filter((ecart): ecart is string => ecart !== null);
    expect(ecarts, 'une prise déclarée ne mène pas où le modèle l’annonce').toEqual([]);
  });
});

// ═══════════════════════════════════════ 4. UNE TRANSITION MANQUANTE

describe('aucune transition manquante', () => {
  it('la PRISE de chaque transition déclarée existe sur son écran', () => {
    // C'est le cas qui attrape « le bouton retour a disparu » — et celui qui a trouvé, le
    // 2026-08-02, que `HoteCampement` ne câblait pas `surRejouerOuverture` : le bouton
    // « Revoir l’histoire » du campement n'était rendu nulle part, et D35 point 3 restait
    // sur le papier.
    const introuvables = rapport.declareesVerifiees
      .filter((verdict) => !verdict.priseTrouvee)
      .map((verdict) => `${verdict.depuis} : prise « ${verdict.prise.selecteur} » absente`)
      .sort();
    expect(
      introuvables,
      'le modèle déclare ces prises, le DOM ne les porte pas. Un contrôle qui n’existe pas ne ' +
        'peut pas être signalé par un test qui compte les sorties : il en reste d’autres'
    ).toEqual([]);
  });

  it('toute transition déclarée à portée de l’explorateur a été OBSERVÉE', () => {
    const observees = new Set(
      rapport.transitions
        .filter((transition) => transition.vers !== transition.depuis)
        .map((transition) => cle(transition.depuis, transition.vers))
    );
    const jamaisVues = A_EXERCER.map((transition) => cle(transition.depuis, transition.vers))
      .filter((identite) => !observees.has(identite))
      .sort();
    expect(
      jamaisVues,
      'ces transitions sont déclarées et l’exploration ne les a jamais empruntées'
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════ 5. AUCUN ÉTAT SANS ISSUE

describe('aucun état sans issue', () => {
  it('de chaque écran exploré, au moins un tap MÈNE AILLEURS', () => {
    // D48, dans ses termes : « compter les éléments interactifs n’est pas compter les
    // sorties ». Ici la sortie est EMPRUNTÉE, et l'écran d'arrivée est relevé.
    expect(
      rapport.ecransSansSortie,
      'ces écrans ont été explorés de bout en bout et aucun de leurs éléments tapables ne ' +
        'change d’écran. C’est le pire défaut possible sur une application d’enfant'
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════ 6. LE CONTRAT DE SORTIE

it('CONTRAT DE SORTIE Q2 — le graphe observé recouvre exactement le modèle', () => {
  const declarees = new Set(TRANSITIONS.map((transition) => cle(transition.depuis, transition.vers)));
  const observees = new Set(
    rapport.transitions
      .filter((transition) => transition.vers !== transition.depuis)
      .map((transition) => cle(transition.depuis, transition.vers))
  );
  const horsPortee = new Set(
    TRANSITIONS.filter((transition) => transition.horsPorteeExplorateur !== undefined).map(
      (transition) => cle(transition.depuis, transition.vers)
    )
  );

  const couvertes = [...declarees].filter((identite) => observees.has(identite));
  const manquantes = [...declarees].filter(
    (identite) => !observees.has(identite) && !horsPortee.has(identite)
  );
  const surprises = [...observees].filter((identite) => !declarees.has(identite));

  console.log(
    `[q2] CONTRAT — états : ${String(ETATS.length)} déclarés, ` +
      `${String(rapport.ecransAtteints.length)} atteints, ` +
      `${String(ETATS.length - rapport.ecransAtteints.length)} en dérogation · ` +
      `transitions : ${String(declarees.size)} déclarées, ${String(couvertes.length)} observées, ` +
      `${String(horsPortee.size)} hors portée, ${String(manquantes.length)} manquantes, ` +
      `${String(surprises.length)} non déclarées`
  );

  // Les deux sens, et les deux comptent. C'est la seule façon qu'une QA ne mente pas sur sa
  // couverture — la demande explicite du père, transposée du dénombrement des écrans au
  // dénombrement des ARÊTES.
  expect(manquantes, 'transitions déclarées et jamais empruntées').toEqual([]);
  expect(surprises, 'transitions empruntées et jamais déclarées').toEqual([]);

  // Planchers : sans eux, « écart nul » resterait vrai sur un modèle vide.
  expect(declarees.size, 'graphe anormalement pauvre').toBeGreaterThanOrEqual(20);
  expect(couvertes.length, 'aucune transition observée').toBeGreaterThanOrEqual(18);
  expect(rapport.profondeurMax, 'exploration anormalement superficielle').toBeGreaterThanOrEqual(3);
  expect(ETAT_RACINE).toBe('profils');
});
