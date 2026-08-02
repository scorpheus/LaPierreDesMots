/**
 * PROPRIÉTÉ 1 — quelle que soit la suite d'actions, le RÉSUMÉ d'une tentative est cohérent.
 *
 * Lot Q3. « Les recettes écrites à la main testent les cas auxquels on a pensé. Les bugs
 * vivent ailleurs. »
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE À CE QUI EXISTAIT
 *
 * `moteurs-reducteurs.test.ts` fait passer les quatorze réducteurs par une rafale de six
 * actions **écrite à la main**, la même pour tous. Elle atteint les gardes ; elle n'explore
 * pas l'espace des séquences. Ici chaque cas engendre une séquence de 0 à 40 actions dont la
 * nature, l'ordre et la charge utile sont tirés, mêlée d'avances d'horloge — et les cibles
 * sont **puisées dans le contenu réel**, donc tantôt justes, tantôt fausses.
 *
 * Les invariants sont vérifiés À CHAQUE PAS, jamais seulement à la fin : un compteur qui
 * redescend puis remonte serait invisible d'un test qui ne regarde que l'état final.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * LES INVARIANTS, ET LA LOI QUI LES IMPOSE
 *
 *  I1  `resume().reussi` est TOUJOURS `true` — R14, « aucun écran d'échec, jamais ». C'est
 *      l'invariant qui interdit qu'une séquence d'actions, si maladroite soit-elle, mène
 *      l'enfant à un état perdant.
 *  I2  `calculerEtoiles(resume)` est dans **[1, 3]**, jamais 0. Le zéro est une valeur
 *      atteignable du barème (`!reussi`) : elle ne doit être atteinte par AUCUNE séquence.
 *      La première étoile est toujours acquise (v2 § 6.2).
 *  I3  `nbErreurs` est **monotone croissant**. Un compteur d'erreurs qui redescend
 *      fabriquerait des étoiles : c'est exactement la forme de la mutation M22 de
 *      `Docs/audit-qa.md` (« la 3ᵉ étoile est donnée avec une erreur »), prise par l'autre
 *      bout.
 *  I4  le palier d'aide ne recule jamais et plafonne à `demonstration`.
 *  I5  `progression().avancement` reste dans [0, 1] et ne recule jamais.
 *  I6  `etapeCourante` reste dans [0, `etapesTotal`] et `etapesTotal` ne change pas en cours
 *      de tentative.
 *  I7  l'aide n'est jamais comptée comme une erreur, et **réécouter est gratuit** (R15) —
 *      vérifié ici sur des séquences engendrées, pas sur dix écoutes d'affilée.
 *  I8  le réducteur est PUR : il ne modifie pas l'état qu'on lui passe.
 *  I9  le réducteur est DÉTERMINISTE : la même séquence rejouée depuis un montage neuf rend
 *      exactement le même état final. Sans quoi `test:rejeu` cesse d'être interprétable
 *      (annexe T § T2).
 *
 * SOURCES QUI FONT FOI : le registre des moteurs, les unions d'actions lues dans
 * `partage/src/moteurs/<code>/types.ts`, les fixtures et les exercices livrés. Rien n'est
 * recalculé ni redéclaré ici.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { calculerEtoiles, initialiserRegistreMoteurs, moteursEnregistres } from '@pierre/partage';

import {
  ACTION_PRINCIPALE,
  CAS_MOTEURS,
  NB_CAS,
  RANG_AIDE,
  actionsCouvertes,
  actionsDeclarees,
  arbSequence,
  jouer,
  monter,
  poolDe,
  rangAide,
  reduire,
  reglages,
  resumeDe,
} from './propriete-outils.js';
import type { ActionEngendree, CasMoteurPropriete } from './propriete-outils.js';

initialiserRegistreMoteurs();

// ═══════════════════════════════════════ 0. L'INSTRUMENT EST AUDITÉ AVANT DE SERVIR

describe('la population auditée est celle du dépôt, pas celle de la table', () => {
  it('un cas par moteur ENREGISTRÉ — écart nul, dans les deux sens', () => {
    const table = [...CAS_MOTEURS.map((cas) => cas.code)].sort();
    const registre = [...moteursEnregistres()].sort();
    expect(table, `table : ${table.join(', ')}`).toEqual(registre);
    expect(new Set(table).size, 'un doublon dans la table').toBe(table.length);
    expect(registre.length, 'le registre est vide : plus rien ne serait testé').toBe(14);
  });

  it('chaque ACTION déclarée par un moteur est engendrée — audit par objet (D48)', () => {
    // Compter les actions qu'on a pensé à écrire, c'est compter les occurrences. On énumère
    // celles que la SOURCE déclare, et on exige l'écart nul : une action ajoutée demain à un
    // moteur sans être engendrée ici fait rougir ce cas, au lieu de rester non explorée.
    const manquantes: string[] = [];
    const inventees: string[] = [];
    let declarees = 0;
    for (const cas of CAS_MOTEURS) {
      const source = actionsDeclarees(cas.code);
      const couvertes = actionsCouvertes(cas);
      declarees += source.length;
      for (const action of source) {
        if (!couvertes.includes(action)) manquantes.push(`${cas.code}.${action}`);
      }
      for (const action of couvertes) {
        if (!source.includes(action)) inventees.push(`${cas.code}.${action}`);
      }
    }
    expect(declarees, 'aucune union d’actions lue : la lecture de la source a échoué')
      .toBeGreaterThanOrEqual(50);
    expect(manquantes, `actions déclarées et jamais engendrées : ${manquantes.join(', ')}`)
      .toEqual([]);
    expect(inventees, `actions engendrées et déclarées nulle part : ${inventees.join(', ')}`)
      .toEqual([]);
  });

  it('chaque moteur reçoit un vivier de cibles NON VIDE, tiré de son contenu réel', () => {
    // Sans ce plancher, un contenu mal chargé donnerait un pool vide : le bot ne taperait que
    // des identifiants faux, ne visiterait que les branches de refus, et ce fichier
    // déclarerait « aucun écran d'échec » sans avoir jamais vu une réussite.
    for (const cas of CAS_MOTEURS) {
      const pool = poolDe(cas);
      expect(pool.identifiants.length, `${cas.code} : vivier de cibles vide`).toBeGreaterThan(2);
    }
  });
});

// ═════════════════════════════════════════ 1. LES INVARIANTS, SUR SÉQUENCES ENGENDRÉES

/**
 * Ce que la passe d'invariants a RÉELLEMENT atteint, moteur par moteur.
 *
 * Rempli par la propriété I1–I6/I2, relu par le contrat de sortie. Un invariant de monotonie
 * est vrai par vacuité sur un moteur que le hasard ne fait jamais avancer : sans ce bilan, ce
 * fichier serait exactement le « rapport trompeur » du défaut n° 6 de l'historique.
 *
 * Le bilan est collecté DANS la passe qui assert, jamais par une passe supplémentaire : c'est
 * ce qui garde la suite à quelques secondes — l'atout que `Docs/audit-qa.md` § 1 demande de
 * protéger, parce que c'est lui qui rend le test de mutation possible en série.
 */
interface Bilan {
  progres: number;
  termine: number;
  avecErreur: number;
  cas: number;
  pas: number;
  readonly etoiles: Map<number, number>;
}
const BILANS = new Map<string, Bilan>();

/** Vérifie I1 à I6 et I2 sur une trajectoire complète, et alimente le bilan du moteur. */
function verifierTrajectoire(cas: CasMoteurPropriete, sequence: readonly ActionEngendree[]): number {
  const { etatFinal, observations } = jouer(cas, sequence);
  const premiere = observations[0] as (typeof observations)[number];
  const etapesTotal = premiere.etapesTotal;

  let erreursPrec = -1;
  let aidePrec = -1;
  let avancementPrec = -1;

  for (const [index, obs] of observations.entries()) {
    const ou = `${cas.code} · pas ${String(index)}/${String(observations.length - 1)}`;

    // I1 — R14, l'invariant qui interdit qu'une séquence mène à un état perdant.
    expect(obs.reussi, `${ou} : R14 violée, resume().reussi est faux`).toBe(true);

    // I3 — le compteur d'erreurs ne redescend jamais.
    expect(obs.nbErreurs, `${ou} : nbErreurs a DÉCRU`).toBeGreaterThanOrEqual(erreursPrec);
    erreursPrec = obs.nbErreurs;

    // I4 — l'aide monte, ne redescend pas, et plafonne.
    expect(obs.rangAide, `${ou} : le palier d’aide a reculé`).toBeGreaterThanOrEqual(aidePrec);
    expect(obs.rangAide, `${ou} : le palier d’aide a dépassé demonstration`).toBeLessThanOrEqual(
      RANG_AIDE.demonstration,
    );
    aidePrec = obs.rangAide;

    // I5 — l'avancement est une fraction, et il ne recule pas.
    expect(obs.avancement, `${ou} : avancement < 0`).toBeGreaterThanOrEqual(0);
    expect(obs.avancement, `${ou} : avancement > 1`).toBeLessThanOrEqual(1);
    expect(obs.avancement, `${ou} : l’avancement a RECULÉ`).toBeGreaterThanOrEqual(
      avancementPrec,
    );
    avancementPrec = obs.avancement;

    // I6 — l'étape courante reste dans le plan, et le plan ne change pas de taille.
    expect(obs.etapesTotal, `${ou} : etapesTotal a changé en cours de tentative`).toBe(
      etapesTotal,
    );
    expect(obs.etapeCourante, `${ou} : etapeCourante < 0`).toBeGreaterThanOrEqual(0);
    expect(obs.etapeCourante, `${ou} : etapeCourante > etapesTotal`).toBeLessThanOrEqual(
      etapesTotal,
    );

    expect(obs.dureeMs, `${ou} : dureeMs négative`).toBeGreaterThanOrEqual(0);
  }

  // I2 — le barème ne rend JAMAIS zéro. Le zéro est une valeur atteignable de
  // `calculerEtoiles` (`!reussi`) : elle ne doit être atteinte par AUCUNE séquence.
  const { moteur } = monter(cas);
  const etoiles = calculerEtoiles(resumeDe(moteur, etatFinal));
  expect(
    etoiles,
    `${cas.code} : ${String(etoiles)} étoile(s) — le zéro n’est atteignable qu’avec ` +
      `« reussi: false », ce que R14 interdit`,
  ).toBeGreaterThanOrEqual(1);
  expect(etoiles, `${cas.code} : plus de trois étoiles`).toBeLessThanOrEqual(3);

  const bilan = BILANS.get(cas.code) as Bilan;
  const fin = observations[observations.length - 1] as (typeof observations)[number];
  bilan.cas += 1;
  bilan.pas += observations.length;
  if (fin.avancement > 0) bilan.progres += 1;
  if (fin.termine) bilan.termine += 1;
  if (fin.nbErreurs > 0) bilan.avecErreur += 1;
  bilan.etoiles.set(etoiles, (bilan.etoiles.get(etoiles) ?? 0) + 1);

  return observations.length;
}

describe('I1–I6 et I2 — le résumé reste cohérent quelle que soit la suite d’actions', () => {
  for (const cas of CAS_MOTEURS) {
    it(`${cas.code} : ${String(NB_CAS)} séquences engendrées, invariants tenus à chaque pas`, () => {
      BILANS.set(cas.code, {
        progres: 0,
        termine: 0,
        avecErreur: 0,
        cas: 0,
        pas: 0,
        etoiles: new Map(),
      });
      let pas = 0;
      fc.assert(
        fc.property(arbSequence(cas), (sequence) => {
          pas += verifierTrajectoire(cas, sequence);
        }),
        reglages(),
      );
      // Contrat de sortie du cas : une propriété qui n'aurait joué aucune action serait verte
      // par vacuité. On exige d'avoir observé au moins un pas par cas engendré.
      expect(pas, `${cas.code} : trop peu de pas observés`).toBeGreaterThan(NB_CAS);
      expect(
        (BILANS.get(cas.code) as Bilan).etoiles.get(0) ?? 0,
        `${cas.code} : une séquence a rendu ZÉRO étoile`,
      ).toBe(0);
    });
  }
});

describe('I7 — l’aide et l’écoute ne coûtent jamais une erreur (R15, v2 § 5.4)', () => {
  /**
   * On engendre une séquence, puis on la rejoue en y INSÉRANT des écoutes et des demandes
   * d'aide à des positions tirées. Le nombre d'erreurs de la variante ne doit jamais dépasser
   * celui de l'original : si écouter coûtait quelque chose, l'écart se verrait ici.
   *
   * L'insertion est faite sur la MÊME séquence de base : c'est ce qui rend la comparaison
   * concluante — deux séquences indépendantes n'auraient aucune raison d'être comparables.
   */
  for (const cas of CAS_MOTEURS) {
    it(`${cas.code} : insérer des écoutes n’ajoute aucune erreur`, () => {
      fc.assert(
        fc.property(
          arbSequence(cas, 24),
          fc.array(fc.integer({ min: 0, max: 24 }), { maxLength: 8 }),
          (sequence, positions) => {
            const avec: ActionEngendree[] = [];
            for (const [index, pas] of sequence.entries()) {
              if (positions.includes(index)) {
                avec.push({ kind: 'moteur', action: { type: 'ecouterConsigne' } });
              }
              avec.push(pas);
            }
            const sans = jouer(cas, sequence);
            const plus = jouer(cas, avec);
            const dernier = (obs: typeof sans.observations): number =>
              (obs[obs.length - 1] as (typeof obs)[number]).nbErreurs;
            expect(
              dernier(plus.observations),
              `${cas.code} : R15 — réécouter a coûté une erreur`,
            ).toBeLessThanOrEqual(dernier(sans.observations));
          },
        ),
        reglages(),
      );
    });
  }
});

// ═══════════════════════════════════════════════ 2. PURETÉ ET DÉTERMINISME DU RÉDUCTEUR

describe('I8 — le réducteur ne modifie jamais l’état qu’on lui passe', () => {
  for (const cas of CAS_MOTEURS) {
    it(`${cas.code} : l’état d’entrée est intact après réduction`, () => {
      fc.assert(
        fc.property(arbSequence(cas, 12), (sequence) => {
          const { moteur, etatInitial, contexte } = monter(cas);
          let courant = etatInitial;
          for (const pas of sequence) {
            if (pas.kind === 'temps') {
              contexte.horloge.avancer({ millisecondes: pas.avancerMs });
              continue;
            }
            // La copie profonde est prise AVANT la réduction, et comparée APRÈS : c'est le
            // seul moyen de voir une mutation en place, qu'un `toEqual` sur le résultat ne
            // verrait pas.
            const temoin = structuredClone(courant);
            const suivant = reduire(moteur, courant, pas.action, contexte);
            expect(courant, `${cas.code} : l’état d’entrée a été MUTÉ`).toEqual(temoin);
            courant = suivant;
          }
        }),
        reglages(),
      );
    });
  }
});

describe('I9 — la même séquence rejouée rend exactement le même état (annexe T § T2)', () => {
  for (const cas of CAS_MOTEURS) {
    it(`${cas.code} : deux rejeux de même graine ne divergent jamais`, () => {
      fc.assert(
        fc.property(arbSequence(cas, 24), (sequence) => {
          const a = jouer(cas, sequence);
          const b = jouer(cas, sequence);
          expect(
            b.etatFinal,
            `${cas.code} : le rejeu a divergé — test:rejeu deviendrait ininterprétable`,
          ).toEqual(a.etatFinal);
          expect(b.observations).toEqual(a.observations);
        }),
        reglages(),
      );
    });
  }
});

// ═══════════════════════ 3. L'AIDE DE GOBI NE COÛTE RIEN — règle non négociable

describe('I10 — suivre l’aide de Gobi n’ajoute JAMAIS une erreur', () => {
  /**
   * CLAUDE.md, règles non négociables : « L'aide de Gobi ne coûte rien et n'est jamais
   * présentée comme un échec — elle change seulement le nombre d'étoiles. »
   *
   * Traduction mécanique : après une séquence quelconque, on demande l'aide, on lit la cible
   * qu'elle désigne, on la joue — et le compteur d'erreurs ne bouge pas. Un moteur qui
   * punirait l'enfant pour avoir fait ce que Gobi lui montre serait une application qui se
   * contredit elle-même, la forme même du défaut M18 de `Docs/audit-qa.md`.
   *
   * Les trois moteurs dont la cible n'est pas jouable par une action à un champ sont exclus
   * NOMMÉMENT, par `ACTION_PRINCIPALE`, et comptés au contrat de sortie. Un test qui les
   * passerait en silence donnerait une couverture qu'il ne finance pas.
   */
  const couverts = CAS_MOTEURS.filter((cas) => ACTION_PRINCIPALE[cas.code] != null);

  it('la population de cette propriété est nommée, non devinée', () => {
    const exclus = CAS_MOTEURS.filter((cas) => ACTION_PRINCIPALE[cas.code] == null).map(
      (cas) => cas.code,
    );
    expect(couverts.length + exclus.length, 'la table ne couvre pas les 14').toBe(14);
    expect(exclus.sort(), 'les exclus ont changé sans que la table le dise').toEqual([
      'colorie',
      'libre',
      'trace',
    ]);
    expect(couverts.length, 'trop peu de moteurs couverts').toBeGreaterThanOrEqual(11);
  });

  for (const cas of couverts) {
    const spec = ACTION_PRINCIPALE[cas.code] as { type: string; champ: string };
    it(`${cas.code} : la cible désignée par l’aide existe, et ne coûte jamais une erreur`, () => {
      let suivis = 0;
      const cibles = poolDe(cas).identifiants;
      fc.assert(
        fc.property(arbSequence(cas, 20), (prefixe) => {
          const { moteur, etatInitial, contexte } = monter(cas);
          let courant = etatInitial;
          for (const pas of prefixe) {
            if (pas.kind === 'temps') {
              contexte.horloge.avancer({ millisecondes: pas.avancerMs });
              continue;
            }
            courant = reduire(moteur, courant, pas.action, contexte);
          }
          courant = reduire(moteur, courant, { type: 'demanderAide' }, contexte);
          const aide = moteur.aideProposee(courant as never);
          if (aide === null || aide.cible === null) return;

          // LA CIBLE DÉSIGNÉE EXISTE. C'est l'assertion qui manquait, et c'est celle qui
          // attrape la famille du défaut M18 de `Docs/audit-qa.md` : un guidage qui montre à
          // l'enfant autre chose que ce que le moteur attend. Ici on ne peut pas exiger que
          // la cible fasse progresser — mesuré, ce n'est vrai que pour quatre moteurs sur
          // quatorze, et au palier `indice` la cible désigne ce qu'il faut SURLIGNER. Mais on
          // peut exiger, et il faut exiger, qu'elle désigne quelque chose de RÉEL.
          expect(
            cibles,
            `${cas.code} : Gobi désigne « ${String(aide.cible)} », qui n’existe ni dans le ` +
              'contenu ni dans l’habillage. Le guidage montre à l’enfant ce que le moteur ne ' +
              'connaît pas.',
          ).toContain(aide.cible);

          const avant = resumeDe(moteur, courant).nbErreurs;
          const apres = reduire(
            moteur,
            courant,
            { type: spec.type, [spec.champ]: aide.cible },
            contexte,
          );
          suivis += 1;
          expect(
            resumeDe(moteur, apres).nbErreurs,
            `${cas.code} : jouer la cible que Gobi désigne (« ${String(aide.cible)} ») a ` +
              `compté une erreur. « L'aide de Gobi ne coûte rien » — CLAUDE.md.`,
          ).toBe(avant);
        }),
        reglages(),
      );
      // Sans ce plancher, un moteur qui rendrait toujours `aide === null` serait vert par
      // vacuité : la propriété n'aurait jamais été mise à l'épreuve une seule fois.
      expect(suivis, `${cas.code} : l’aide n’a JAMAIS désigné de cible`).toBeGreaterThan(
        NB_CAS / 2,
      );
    });
  }
});

// ═══════════════════════════════════════════════════════ 4. CONTRAT DE SORTIE DU FICHIER

describe('CONTRAT DE SORTIE — ce que les séquences engendrées ont réellement atteint', () => {
  /**
   * ─────────────────────────────────────────────────────────────────────────────────────
   * POURQUOI CE CAS EXISTE, ET CE QU'IL EMPÊCHE.
   *
   * Le défaut n° 6 de l'historique de ce projet : un rapport qui imprimait « 14 moteurs
   * joués sur 14 » en n'assertant que `> 0`. Il serait resté vert à 1 sur 14.
   *
   * Un invariant de monotonie est VRAI par vacuité sur un moteur que le bot ne fait jamais
   * avancer. Ce cas mesure donc, moteur par moteur, ce que les séquences ont atteint —
   * progrès, terminaison, erreur comptée — l'imprime, et pose un plancher sur les trois.
   * Il nomme aussi les moteurs que le hasard n'atteint pas : ceux-là sont gardés par les
   * suites de composant et par les E2E, pas par ce fichier, et le dire est la seule façon
   * de ne pas vendre une couverture qu'on n'a pas.
   * ─────────────────────────────────────────────────────────────────────────────────────
   */
  it('imprime le tableau, et échoue si le pilotage est creux', () => {
    // Le bilan est celui que la passe d'invariants a collecté. Ce cas ne rejoue rien : il
    // relit, ce qui garantit que les chiffres imprimés sont ceux sur lesquels les assertions
    // ont porté, et non ceux d'une seconde exécution qui pourrait diverger.
    expect(
      BILANS.size,
      'la passe d’invariants n’a pas tourné pour les 14 moteurs : le tableau serait faux',
    ).toBe(14);

    const lignes = CAS_MOTEURS.map((cas) => {
      const bilan = BILANS.get(cas.code) as Bilan;
      return {
        code: cas.code,
        ...bilan,
        actions: actionsDeclarees(cas.code).length,
        cibles: poolDe(cas).identifiants.length,
      };
    });

    const avecProgres = lignes.filter((l) => l.progres > 0);
    const avecFin = lignes.filter((l) => l.termine > 0);
    const avecErreur = lignes.filter((l) => l.avecErreur > 0);
    const sansProgres = lignes.filter((l) => l.progres === 0).map((l) => l.code);
    const actionsTotal = lignes.reduce((somme, l) => somme + l.actions, 0);
    const casTotal = lignes.reduce((somme, l) => somme + l.cas, 0);
    const pasTotal = lignes.reduce((somme, l) => somme + l.pas, 0);

    console.log(
      [
        `[Q3-P1] moteurs pilotés ..................... ${String(CAS_MOTEURS.length)} / 14`,
        `[Q3-P1] types d'action déclarés et engendrés  ${String(actionsTotal)}`,
        `[Q3-P1] séquences engendrées ................ ${String(casTotal)}`,
        `[Q3-P1] pas de réducteur observés ........... ${String(pasTotal)}`,
        `[Q3-P1] moteurs que le hasard fait AVANCER .. ${String(avecProgres.length)} / 14`,
        `[Q3-P1] moteurs que le hasard TERMINE ....... ${String(avecFin.length)} / 14`,
        `[Q3-P1] moteurs où une erreur est comptée ... ${String(avecErreur.length)} / 14`,
        `[Q3-P1] JAMAIS fait avancer par le hasard ... ${sansProgres.join(', ') || '(aucun)'}`,
        `[Q3-P1]   ↳ pour ceux-là, la monotonie de l'avancement est vraie par vacuité ; ils`,
        `[Q3-P1]     sont gardés par tests/composants/ et par les E2E, pas par ce fichier.`,
        ...lignes.map(
          (l) =>
            `[Q3-P1]   ${l.code.padEnd(9)} actions=${String(l.actions).padStart(2)} ` +
            `cibles=${String(l.cibles).padStart(3)} progrès=${String(l.progres).padStart(4)}/${String(l.cas)} ` +
            `terminé=${String(l.termine).padStart(4)} avecErreur=${String(l.avecErreur).padStart(4)} ` +
            `étoiles=${JSON.stringify([...l.etoiles].sort((a, b) => a[0] - b[0]))}`,
        ),
      ].join('\n'),
    );

    expect(CAS_MOTEURS.length, 'aucun moteur piloté').toBe(14);
    expect(actionsTotal, 'aucune action déclarée lue').toBeGreaterThanOrEqual(50);
    expect(casTotal, 'moins de mille cas par moteur').toBeGreaterThanOrEqual(NB_CAS * 14);
    // Planchers MESURÉS le 2026-08-02 : 10 moteurs avancent, 10 terminent, 11 comptent une
    // erreur. Les seuils sont posés un cran en dessous — assez bas pour que le contenu puisse
    // bouger sans faire rougir, assez haut pour qu'un pilotage devenu creux se voie aussitôt.
    expect(
      avecProgres.length,
      'le hasard ne fait plus avancer les moteurs : les invariants deviennent vides',
    ).toBeGreaterThanOrEqual(9);
    expect(
      avecFin.length,
      'aucune tentative engendrée ne va jusqu’au bout : la réussite n’est plus observée',
    ).toBeGreaterThanOrEqual(9);
    expect(
      avecErreur.length,
      'aucune erreur n’est jamais comptée : les branches de refus sont mortes',
    ).toBeGreaterThanOrEqual(10);
    expect(rangAide('demonstration'), 'la table des paliers est creuse').toBe(2);
  });
});
