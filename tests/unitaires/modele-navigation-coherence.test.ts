/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE MODÈLE CONTRE LA SOURCE — lot Q2, volet statique.
 *
 * `tests/composants/exploration-modele.test.tsx` confronte le modèle à l'application QUI
 * TOURNE. Ce fichier-ci le confronte au CODE : les `data-ecran` de `client/src/**`, la table
 * de routes de `client/src/routeur.tsx`, le sélecteur d'éléments tapables de la QA E2E.
 *
 * Il est en `unitaires` et non en `composants`, délibérément : il tourne en quelques
 * millisecondes, sans monter quoi que ce soit, et il attrape les deux écarts qui n'exigent
 * aucune exécution — un écran ajouté sans entrée de modèle, une route montée que personne ne
 * vise. Le premier est le garde qui empêche la zone aveugle de revenir.
 *
 * ── LE PREMIER TEMPS, ET IL N'EST PAS FACULTATIF ──────────────────────────────────────────
 * Le premier `describe` soumet à `auditerModele` des modèles VOLONTAIREMENT FAUTIFS et exige
 * qu'elle les refuse, règle par règle. Sans lui, tous les cas du second temps seraient verts
 * pour n'importe quelle fonction qui rendrait « aucune anomalie » — et c'est exactement le
 * genre de test creux que l'audit du 2026-08-02 a recensé six fois.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODES_ETATS,
  ETATS,
  ETAT_RACINE,
  RECETTES,
  REGLES_MODELE,
  ROUTES_ORPHELINES_CONNUES,
  TRANSITIONS,
  auditerModele,
  ecransDeclaresDuSource,
  resumerModele,
  routesOrphelines,
  tableDesRoutes
} from '../modele/modele-navigation.js';
import type { EtatModele, TransitionModele } from '../modele/modele-navigation.js';
import { SELECTEURS_INTERACTIFS } from '../modele/explorateur.js';
import { RACINE_DEPOT, lireTexte } from '../configuration/preparation.js';

const ECRANS_DE_LA_SOURCE = ecransDeclaresDuSource();

const ENTREE = {
  etats: ETATS,
  transitions: TRANSITIONS,
  ecransDeLaSource: ECRANS_DE_LA_SOURCE,
  racine: ETAT_RACINE
} as const;

/** Les règles levées, nommées et triées — on nomme, on ne compte pas. */
const declenchees = (anomalies: readonly { regle: string }[]): readonly string[] =>
  [...new Set(anomalies.map((anomalie) => anomalie.regle))].sort();

// ═══════════════════════════════ PREMIER TEMPS : L'AUDIT REFUSE CE QU'IL DOIT REFUSER

describe('l’audit du modèle se déclenche vraiment', () => {
  it('une population vide n’est pas une réussite', () => {
    expect(declenchees(auditerModele({ ...ENTREE, etats: [] }))).toEqual([
      REGLES_MODELE.POPULATION_VIDE
    ]);
    expect(declenchees(auditerModele({ ...ENTREE, ecransDeLaSource: [] }))).toEqual([
      REGLES_MODELE.POPULATION_VIDE
    ]);
  });

  it('un écran de la source absent du modèle est DÉNONCÉ, pas ignoré', () => {
    // C'est le cas qui empêche la zone aveugle de revenir : un écran ajouté demain à
    // `client/src/` sans entrée ici fait rougir ce fichier, en le NOMMANT.
    const anomalies = auditerModele({
      ...ENTREE,
      ecransDeLaSource: [...ECRANS_DE_LA_SOURCE, 'ecran-tout-neuf']
    });
    expect(declenchees(anomalies)).toEqual([REGLES_MODELE.ECRAN_SOURCE_NON_MODELISE]);
    expect(anomalies.map((anomalie) => anomalie.ou)).toEqual(['ecran-tout-neuf']);
  });

  it('un état du modèle que la source ne porte plus est DÉNONCÉ', () => {
    const anomalies = auditerModele({
      ...ENTREE,
      etats: [...ETATS, { code: 'ecran-fantome', nature: 'jouable', role: 'rien' } as EtatModele]
    });
    expect(declenchees(anomalies)).toEqual(
      [
        REGLES_MODELE.ETAT_ABSENT_DE_LA_SOURCE,
        REGLES_MODELE.ETAT_SANS_SORTIE,
        REGLES_MODELE.ETAT_INATTEIGNABLE
      ].sort()
    );
  });

  it('une transition vers un état inconnu est refusée', () => {
    const anomalies = auditerModele({
      ...ENTREE,
      transitions: [
        ...TRANSITIONS,
        { depuis: 'carte', vers: 'nulle-part', prise: null, motif: 'essai' } as TransitionModele
      ]
    });
    expect(declenchees(anomalies)).toContain(REGLES_MODELE.ETAT_INCONNU);
  });

  it('un état sans issue est refusé — c’est le pire défaut possible ici', () => {
    // On retire toutes les sorties du coffre : le modèle doit dire que c'est un cul-de-sac.
    const anomalies = auditerModele({
      ...ENTREE,
      transitions: TRANSITIONS.filter((transition) => transition.depuis !== 'coffre')
    });
    expect(declenchees(anomalies)).toContain(REGLES_MODELE.ETAT_SANS_SORTIE);
    expect(
      anomalies
        .filter((anomalie) => anomalie.regle === REGLES_MODELE.ETAT_SANS_SORTIE)
        .map((anomalie) => anomalie.ou)
    ).toEqual(['coffre']);
  });

  it('un état qu’aucun chemin n’atteint est refusé — le défaut des Galeries', () => {
    // On coupe les deux entrées HISTORIQUES du campement : il reste déclaré, il devient
    // injoignable.
    //
    // ⚠ Le lot V1 a donné au coffre un SECOND chemin, indépendant du campement
    // (`visite-parent → coffre`, `tests/modele/modele-navigation.ts`) — sans le couper aussi
    // ici, ce cas ne démontrerait plus la CASCADE qu'il existe pour prouver (« le coffre tombe
    // avec lui »), il redeviendrait un simple test d'accessibilité directe. On coupe donc les
    // TROIS entrées : les deux du campement, et celle, neuve, de la visite.
    const anomalies = auditerModele({
      ...ENTREE,
      transitions: TRANSITIONS.filter(
        (transition) =>
          transition.vers !== 'campement' &&
          !(transition.depuis === 'visite-parent' && transition.vers === 'coffre')
      )
    });
    expect(declenchees(anomalies)).toContain(REGLES_MODELE.ETAT_INATTEIGNABLE);
    const nommes = anomalies
      .filter((anomalie) => anomalie.regle === REGLES_MODELE.ETAT_INATTEIGNABLE)
      .map((anomalie) => anomalie.ou)
      .sort();
    // Le coffre et le chaudron tombent avec lui : sans campement NI visite, plus aucun chemin
    // ne les atteint.
    // C'est ce que « atteignable » veut dire, et un audit qui ne le verrait pas ne servirait
    // à rien.
    expect(nommes).toEqual(['campement', 'chaudron', 'coffre']);
  });

  it('une dérogation sans motif ni couverture est refusée', () => {
    const anomalies = auditerModele({
      ...ENTREE,
      etats: ETATS.map((etat) =>
        etat.code === 'chargement' ? { code: etat.code, nature: etat.nature, role: etat.role } : etat
      )
    });
    expect(declenchees(anomalies)).toEqual(
      [REGLES_MODELE.DEROGATION_SANS_MOTIF, REGLES_MODELE.DEROGATION_SANS_COUVERTURE].sort()
    );
  });

  it('l’audit des routes dénonce une route montée que personne ne vise', () => {
    const orphelines = routesOrphelines({
      declarees: ['/', '/carte', '/oubliee'],
      naviguees: ['/', '/carte'],
      pousseesParLeMiroir: ['/']
    });
    expect(orphelines).toEqual(['/oubliee']);
  });
});

// ═══════════════════════════════════════ SECOND TEMPS : LE DÉPÔT RÉEL EST SAIN

describe('le modèle et la source portent le MÊME inventaire d’écrans', () => {
  it('aucun écart, dans les deux sens', () => {
    // D48 — on audite les OBJETS qui devraient porter la propriété, pas les occurrences.
    // La liste de gauche est écrite à la main ; celle de droite est LUE dans `client/src/**`.
    // Les deux comptes sont imprimés, même au vert : c'est ce qu'on veut lire le jour où
    // l'un des deux bouge.
    console.log(resumerModele(ENTREE));
    console.log(`[q2] modèle : ${CODES_ETATS.join(', ')}`);
    console.log(`[q2] source : ${ECRANS_DE_LA_SOURCE.join(', ')}`);
    expect(CODES_ETATS).toEqual([...ECRANS_DE_LA_SOURCE]);
  });

  it('le dépôt réel ne lève AUCUNE anomalie de modèle', () => {
    const anomalies = auditerModele(ENTREE);
    expect(
      anomalies.map((anomalie) => `${anomalie.regle} · ${anomalie.ou}`),
      resumerModele(ENTREE)
    ).toEqual([]);
  });

  it('l’inventaire n’est pas anormalement pauvre', () => {
    expect(ECRANS_DE_LA_SOURCE.length, 'inventaire des écrans anormalement pauvre').toBeGreaterThanOrEqual(
      10
    );
    expect(TRANSITIONS.length, 'graphe anormalement pauvre').toBeGreaterThanOrEqual(20);
  });
});

describe('chaque dérogation est nommée, motivée, ET couverte par un fichier qui existe', () => {
  it('les fichiers cités existent et nomment l’écran qu’ils couvrent', () => {
    const manques: string[] = [];
    for (const etat of ETATS) {
      if (etat.nature === 'jouable') continue;
      for (const fichier of etat.couvertPar ?? []) {
        if (!existsSync(join(RACINE_DEPOT, fichier))) {
          manques.push(`${etat.code} : ${fichier} n’existe pas`);
          continue;
        }
        if (!lireTexte(fichier).includes(`data-ecran="${etat.code}"`)) {
          manques.push(`${etat.code} : ${fichier} ne nomme pas data-ecran="${etat.code}"`);
        }
      }
    }
    expect(
      manques,
      'une dérogation dont la couverture n’est pas vérifiée est une exemption, et une ' +
        'couverture qui s’accorde des exemptions ne prouve plus rien'
    ).toEqual([]);
  });

  it('les transitions HORS PORTÉE de l’explorateur sont exactement celles-ci', () => {
    // Exactitude dans les deux sens : une dérogation ne peut ni s'ajouter ni disparaître sans
    // qu'on le voie. C'est ce qui l'empêche de devenir une habitude.
    const horsPortee = TRANSITIONS.filter(
      (transition) => transition.horsPorteeExplorateur !== undefined
    )
      .map((transition) => `${transition.depuis} → ${transition.vers}`)
      .sort();
    expect(horsPortee).toEqual([
      // R19 — les deux prises du récit d'ouverture. Elles sont sur SOI-MÊME : l'explorateur
      // compare des écrans, donc il ne peut ni les distinguer d'un tap sans effet, ni voir que
      // le TABLEAU a changé. Et « ← Revoir » est en plus CONDITIONNELLE, absente du premier
      // tableau. Les deux sont vérifiées plus finement dans `EcranOuverture.test.tsx`.
      'noeud → recompense',
      'ouverture → ouverture',
      'ouverture → ouverture',
      'recompense → carte',
      'recompense → noeud'
    ]);

    const manques: string[] = [];
    for (const transition of TRANSITIONS) {
      const derogation = transition.horsPorteeExplorateur;
      if (derogation === undefined) continue;
      if (derogation.motif.trim() === '') {
        manques.push(`${transition.depuis} → ${transition.vers} : motif vide`);
      }
      if (derogation.verifiePar.length === 0) {
        manques.push(`${transition.depuis} → ${transition.vers} : aucun fichier cité`);
      }
      for (const fichier of derogation.verifiePar) {
        if (!existsSync(join(RACINE_DEPOT, fichier))) {
          manques.push(`${transition.depuis} → ${transition.vers} : ${fichier} n’existe pas`);
          // ⚠ CE CONTRÔLE ÉTAIT CREUX POUR TOUTE TRANSITION AUTRE QUE `recompense`.
          //
          // Il cherchait `data-ecran="recompense"` EN DUR, quelle que soit la transition. Tant
          // que les trois dérogations concernaient la récompense, il disait vrai par accident.
          // À la première dérogation sur un autre écran — les deux prises du récit d'ouverture,
          // R19 — il a exigé qu'un fichier d'ouverture nomme l'écran de récompense.
          //
          // C'est la même faute que celles corrigées ailleurs cette semaine : une règle écrite
          // pour un cas, appliquée aveuglément à tous. Elle vise maintenant l'écran DE LA
          // TRANSITION, ce qu'elle a toujours voulu dire.
        } else if (!lireTexte(fichier).includes(`data-ecran="${transition.depuis}"`)) {
          manques.push(
            `${transition.depuis} → ${transition.vers} : ${fichier} ne nomme pas ` +
              `data-ecran="${transition.depuis}"`
          );
        }
      }
    }
    expect(manques).toEqual([]);
  });

  it('les transitions marquées DÉFAUT sont exactement celles-ci', () => {
    // Un défaut consigné dans le modèle ne peut ni s'ajouter ni se corriger en silence : le
    // jour où le profil suivi sera partagé, ce cas rougira et demandera qu'on retire la marque.
    //
    // ⚠ C'EST ARRIVÉ — le lot V1 a partagé `profilSuivi` (`FournisseurZoneParent`,
    // `client/src/routeur.tsx`) pour que sa propre visite tienne d'une route à l'autre, et ce
    // partage a réparé Q2-2 du même geste : `galerie-parent → choix-profil-parent` mène
    // maintenant à `dashboard`, sans redemander. La marque a été retirée du modèle
    // (`tests/modele/modele-navigation.ts`) exactement comme ce commentaire l'annonçait ;
    // cette assertion suit le fait mesuré, elle ne l'invente pas.
    const defauts = TRANSITIONS.filter((transition) => transition.defaut !== undefined)
      .map((transition) => `${transition.depuis} → ${transition.vers}`)
      .sort();
    expect(defauts).toEqual([]);
    for (const transition of TRANSITIONS) {
      if (transition.defaut === undefined) continue;
      expect(transition.defaut.length, `${transition.depuis} : défaut sans explication`)
        .toBeGreaterThan(40);
    }
  });
});

describe('les routes de `routeur.tsx`', () => {
  const TABLE = tableDesRoutes();

  it('toute route MONTÉE est visée par une navigation ou poussée par le miroir du magasin', () => {
    const orphelines = routesOrphelines(TABLE);
    console.log(
      `[q2] routes : ${String(TABLE.declarees.length)} montée(s) · ` +
        `${String(TABLE.naviguees.length)} visée(s) par un \`naviguer\` · ` +
        `${String(TABLE.pousseesParLeMiroir.length)} poussée(s) par le miroir · ` +
        `${String(orphelines.length)} orpheline(s)`
    );
    // ÉGALITÉ STRICTE avec la dette connue, dans les DEUX sens. Une nouvelle orpheline fait
    // rougir ; une orpheline réparée aussi, parce qu'il faudra la retirer de la liste. Ce
    // n'est pas une assertion assouplie : c'est une assertion sur un état mesuré, qui échoue
    // dans les deux directions.
    expect(
      orphelines,
      Object.entries(ROUTES_ORPHELINES_CONNUES)
        .map(([route, raison]) => `${route} — ${raison}`)
        .join('\n')
    ).toEqual(Object.keys(ROUTES_ORPHELINES_CONNUES).sort());
  });

  it('chaque état JOUABLE du modèle correspond à un écran que la source sait rendre', () => {
    // Le pont entre les deux vocabulaires : une route est un chemin, un état est un
    // `data-ecran`. Ils ne se recouvrent pas un pour un (`profils` et `chargement` partagent
    // `/`, `code-parent` est rendu par deux composants) — mais aucun état ne doit être inventé.
    const inconnus = CODES_ETATS.filter((code) => !ECRANS_DE_LA_SOURCE.includes(code));
    expect(inconnus).toEqual([]);
  });
});

describe('l’explorateur et la QA E2E parlent du même « tapable »', () => {
  it('le sélecteur d’éléments interactifs est IDENTIQUE à celui de `tests/e2e/qa-outils.ts`', () => {
    // Un doublon gardé vaut mieux qu'un doublon toléré. Sans ce cas, l'exploration pourrait
    // auditer un ensemble d'éléments plus étroit que les E2E, et sa couverture serait un
    // chiffre qui ne se compare à rien.
    const source = lireTexte('tests/e2e/qa-outils.ts');
    const bloc = /export const SELECTEUR_INTERACTIF = \[([\s\S]*?)\]\.join/u.exec(source);
    expect(bloc, '`SELECTEUR_INTERACTIF` introuvable dans tests/e2e/qa-outils.ts').not.toBeNull();
    const duE2E = [...(bloc?.[1] ?? '').matchAll(/'([^']+)'/gu)].map((trouve) => trouve[1] as string);
    expect(duE2E.length, 'sélecteur E2E illisible').toBeGreaterThanOrEqual(5);
    expect([...SELECTEURS_INTERACTIFS].sort()).toEqual([...duE2E].sort());
  });
});

describe('les recettes du modèle', () => {
  it('partent d’un état connu et mènent à un état connu', () => {
    const inconnues = RECETTES.filter(
      (recette) => !CODES_ETATS.includes(recette.depuis) || !CODES_ETATS.includes(recette.vers)
    ).map((recette) => recette.nom);
    expect(inconnues).toEqual([]);
  });

  it('portent chacune au moins un geste et un motif', () => {
    for (const recette of RECETTES) {
      expect(recette.gestes.length, `${recette.nom} : aucune prise`).toBeGreaterThanOrEqual(1);
      expect(recette.motif.length, `${recette.nom} : motif vide`).toBeGreaterThan(10);
    }
    expect(RECETTES.length, 'aucune recette : le modèle serait borgne sur la porte parent')
      .toBeGreaterThanOrEqual(2);
  });
});
