/**
 * O10 — le matériau phonologique. Lot N8. **C'est le chiffre de sortie du lot.**
 *
 * O10, journal des décisions : « Le corpus ne couvre pas la progression phonologique. Les 105
 * fiches travaillent la lecture appliquée et la compréhension ; elles supposent le déchiffrage
 * acquis. Or l'enfant déchiffre encore (D14). Les régions 1 à 5 des specs — voyelles, CVC,
 * nasales, lettres muettes, graphèmes rares — n'ont AUCUN matériau dans le corpus. »
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE FICHIER MESURE LE SOCLE, PAS LE DISQUE — et c'est délibéré.
 *
 * `.gitignore` porte `contenu/brouillons/*`. Un test qui ne lirait que
 * `contenu/brouillons/phonologie/` passerait à VIDE sur un dépôt fraîchement cloné : zéro
 * fichier, zéro écart, vert. Ce serait le « détecteur qui déclare un poids qu'il n'applique
 * jamais » de CLAUDE.md, appliqué au point ouvert le plus important du projet.
 *
 * La source qui fait foi est donc `scripts/generer-phonologie.mjs`, versionné. Les brouillons
 * sur disque sont contrôlés EN PLUS quand ils sont là.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * ET IL PROUVE QUE LE REFUS DU GÉNÉRATEUR N'EST PAS DÉCORATIF (convention C6).
 *
 * Le dernier `describe` corrompt le socle de six façons différentes et exige que `verifier()`
 * s'en aperçoive à chaque fois. Un générateur qui « remesure sa sortie » sans qu'on ait jamais
 * vu sa mesure échouer ne remesure rien du tout.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// @ts-expect-error — module JavaScript d'outillage, sans déclaration de types. C'est le
// fichier que `node scripts/generer-phonologie.mjs` exécute réellement : le tester ailleurs
// ne dirait rien de ce qui produit le matériau.
import {
  LEXIQUE_CE1, MOTS_OUTILS, SOCLE, construireBrouillons, estAuLexique, normaliser,
  recenserMots, syllabesCV, verifier,
} from '../../scripts/generer-phonologie.mjs';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

import type { Exercice } from '@pierre/partage';

interface Voyelle { readonly forme: string; readonly son: string; readonly mots: readonly string[] }
interface Cvc { readonly forme: string; readonly decoupe: readonly string[] }
interface BlocMiroir {
  readonly axe: string;
  readonly lettres: readonly string[];
  readonly motsA: readonly string[];
  readonly motsB: readonly string[];
  readonly paires: readonly { readonly a: string; readonly b: string }[];
}
interface Socle {
  readonly clairiere: {
    readonly voyelles: readonly Voyelle[];
    readonly consonnesCV: readonly string[];
    readonly voyellesCV: readonly string[];
    readonly motsOutilsPremiers: readonly string[];
  };
  readonly galeries: {
    readonly cvc: readonly Cvc[];
    readonly miroirGaucheDroite: BlocMiroir;
    readonly miroirHautBas: BlocMiroir;
    readonly sonsProches: readonly {
      readonly paire: readonly string[];
      readonly motsA: readonly string[];
      readonly motsB: readonly string[];
    }[];
  };
}

const socle = SOCLE as Socle;
const lexique = LEXIQUE_CE1 as readonly string[];
const auLexique = estAuLexique as (mot: string) => boolean;
const verifierSocle = verifier as (socle?: unknown) => readonly string[];
const cv = syllabesCV as () => readonly { forme: string; consonne: string; voyelle: string }[];
const mots = recenserMots as (socle?: unknown) => readonly (readonly [string, string])[];
const brouillons = construireBrouillons as () => readonly {
  chemin: string;
  donnees: Record<string, unknown>;
}[];

/**
 * Les planchers de couverture, en données, avec leur raison.
 *
 * Ils sont posés SOUS les comptes mesurés à la livraison de N8 — un plancher au-dessus de la
 * mesure serait un test rouge dès sa naissance, un plancher très en dessous ne dirait rien.
 * Ils disent : « en deçà, la région n'a pas de quoi travailler son domaine ».
 */
const PLANCHERS = {
  voyelles: 7,        // a i o u e é è — le jeu minimal pour lire une syllabe
  consonnesCV: 8,
  syllabesCV: 40,     // 8 consonnes × 5 voyelles au moins
  motsOutils: 20,     // les mots qu'on rencontre à chaque ligne
  cvc: 15,
  motsParAxeMiroir: 8,
  pairesParAxeMiroir: 4,
  sonsProches: 4,
} as const;

describe('O10 — La Clairière a de quoi travailler « voyelles, CV, mots outils »', () => {
  it(`≥ ${String(PLANCHERS.voyelles)} voyelles, chacune illustrée par des mots qui la portent`, () => {
    const voyelles = socle.clairiere.voyelles;
    expect(voyelles.length, `voyelles déclarées : ${voyelles.map((v) => v.forme).join(' ')}`)
      .toBeGreaterThanOrEqual(PLANCHERS.voyelles);
    for (const voyelle of voyelles) {
      expect(voyelle.mots.length, `${voyelle.forme} sans exemple`).toBeGreaterThan(0);
      for (const mot of voyelle.mots) {
        expect(
          (normaliser as (m: string) => string)(mot),
          `« ${mot} » ne porte pas « ${voyelle.forme} »`,
        ).toContain((normaliser as (m: string) => string)(voyelle.forme));
      }
    }
  });

  it(`≥ ${String(PLANCHERS.syllabesCV)} syllabes CV, toutes décomposables`, () => {
    const syllabes = cv();
    expect(
      syllabes.length,
      `${String(socle.clairiere.consonnesCV.length)} consonnes × ` +
        `${String(socle.clairiere.voyellesCV.length)} voyelles = ${String(syllabes.length)}`,
    ).toBeGreaterThanOrEqual(PLANCHERS.syllabesCV);
    expect(socle.clairiere.consonnesCV.length).toBeGreaterThanOrEqual(PLANCHERS.consonnesCV);
    for (const syllabe of syllabes) {
      expect(syllabe.forme).toBe(`${syllabe.consonne}${syllabe.voyelle}`);
    }
    // Aucune syllabe en double : `qu`, `ce`, `gi` sont écartés par le choix des consonnes.
    expect(new Set(syllabes.map((s) => s.forme)).size).toBe(syllabes.length);
  });

  it(`≥ ${String(PLANCHERS.motsOutils)} mots outils, tous au lexique CE1`, () => {
    const outils = socle.clairiere.motsOutilsPremiers;
    expect(outils.length, outils.join(' ')).toBeGreaterThanOrEqual(PLANCHERS.motsOutils);
    for (const mot of outils) {
      expect(MOTS_OUTILS as readonly string[], `« ${mot} » n’est pas un mot outil déclaré`)
        .toContain(mot);
    }
  });
});

describe('O10 — Les Galeries ont de quoi travailler « CVC, b/d/p/q, sons proches »', () => {
  it(`≥ ${String(PLANCHERS.cvc)} mots CVC, tous découpés en consonne-voyelle-consonne`, () => {
    const { cvc } = socle.galeries;
    expect(cvc.length, cvc.map((c) => c.forme).join(' ')).toBeGreaterThanOrEqual(PLANCHERS.cvc);
    for (const mot of cvc) {
      expect(mot.decoupe.length, `${mot.forme} : ${mot.decoupe.join('-')}`).toBe(3);
      expect(mot.decoupe.join('')).toBe(mot.forme);
    }
  });

  it('les DEUX axes de D23 existent séparément, et aucun mot n’appartient aux deux', () => {
    const gd = socle.galeries.miroirGaucheDroite;
    const hb = socle.galeries.miroirHautBas;

    expect(gd.axe).toBe('gauche-droite');
    expect(hb.axe).toBe('haut-bas');
    expect(gd.lettres.join('')).not.toBe(hb.lettres.join(''));

    for (const bloc of [gd, hb]) {
      expect(bloc.motsA.length, `${bloc.axe} colonne A`).toBeGreaterThanOrEqual(
        PLANCHERS.motsParAxeMiroir,
      );
      expect(bloc.motsB.length, `${bloc.axe} colonne B`).toBeGreaterThanOrEqual(
        PLANCHERS.motsParAxeMiroir,
      );
      expect(bloc.paires.length, `${bloc.axe} paires`).toBeGreaterThanOrEqual(
        PLANCHERS.pairesParAxeMiroir,
      );

      // LA propriété de D23 : un mot de la colonne A porte la lettre A et JAMAIS la lettre B.
      // Sans elle, « bébé » pourrait se retrouver du côté du `d` et l'exercice n'apprendrait
      // rien — ou pire, apprendrait le contraire.
      const [lettreA, lettreB] = bloc.lettres as [string, string];
      for (const mot of bloc.motsA) {
        expect((normaliser as (m: string) => string)(mot), `${bloc.axe} : ${mot}`).toContain(lettreA);
        expect((normaliser as (m: string) => string)(mot), `${bloc.axe} : ${mot}`).not.toContain(lettreB);
      }
      for (const mot of bloc.motsB) {
        expect((normaliser as (m: string) => string)(mot), `${bloc.axe} : ${mot}`).toContain(lettreB);
        expect((normaliser as (m: string) => string)(mot), `${bloc.axe} : ${mot}`).not.toContain(lettreA);
      }
    }
  });

  it(`≥ ${String(PLANCHERS.sonsProches)} paires de sons proches, chacune opposant deux consonnes`, () => {
    const { sonsProches } = socle.galeries;
    expect(sonsProches.length).toBeGreaterThanOrEqual(PLANCHERS.sonsProches);
    for (const bloc of sonsProches) {
      expect(bloc.paire.length).toBe(2);
      expect(bloc.paire[0]).not.toBe(bloc.paire[1]);
      expect(bloc.motsA.length).toBeGreaterThan(0);
      expect(bloc.motsB.length).toBeGreaterThan(0);
    }
  });
});

describe('LE CHIFFRE DU LOT — 100 % du vocabulaire est au lexique CE1 déclaré', () => {
  it('100 % des mots du socle', () => {
    const trouves = mots();
    const hors = trouves.filter(([, mot]) => !auLexique(mot));
    expect(
      hors.map(([chemin, mot]) => `${chemin} → ${mot}`),
      `${String(trouves.length - hors.length)}/${String(trouves.length)} mots du socle au ` +
        `lexique de ${String(lexique.length)} entrées`,
    ).toEqual([]);
    // Un socle vide passerait la propriété sans rien prouver.
    expect(trouves.length).toBeGreaterThan(80);
  });

  it('100 % des mots que l’enfant LIT dans les exercices livrés', () => {
    // Auditer les OBJETS : chaque libellé, chaque mot cible, chaque étiquette — pas les
    // occurrences d'un mot dans les fichiers.
    const exercices = ['clairiere', 'galeries'].flatMap((region) =>
      readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices', region))
        .filter((f) => f.endsWith('.json'))
        .map((f) => lireJson<Exercice>(`contenu/exercices/${region}/${f}`)),
    );

    const hors: string[] = [];
    let audites = 0;
    for (const exercice of exercices) {
      const contenu = exercice.jeu.contenu as Record<string, unknown>;
      const consignes = (contenu['consignes'] ?? []) as readonly Record<string, unknown>[];
      for (const consigne of consignes) {
        if (typeof consigne['mot'] === 'string') {
          audites += 1;
          if (!auLexique(consigne['mot'])) hors.push(`${exercice.id} : ${consigne['mot']}`);
        }
      }
      for (const cle of ['options', 'elements', 'etiquettes', 'cartes']) {
        const items = (contenu[cle] ?? []) as readonly Record<string, unknown>[];
        for (const item of items) {
          const libelle = item['libelle'];
          if (typeof libelle !== 'string' || libelle.includes(' ')) continue;
          audites += 1;
          if (!auLexique(libelle)) hors.push(`${exercice.id} : ${libelle}`);
        }
      }
    }
    expect(hors, `${String(audites - hors.length)}/${String(audites)} mots cibles au lexique`)
      .toEqual([]);
    expect(audites, 'aucun mot cible audité : la mesure serait creuse').toBeGreaterThan(40);
  });

  it('le lexique lui-même n’est ni vide ni bricolé', () => {
    expect(lexique.length).toBeGreaterThanOrEqual(350);
    expect(new Set(lexique).size, 'doublons dans le lexique').toBe(lexique.length);
    for (const mot of lexique) expect(mot, `« ${mot} »`).toMatch(/^[a-zà-ÿ’-]+$/u);
  });
});

describe('les brouillons projetés portent bien ce que le socle déclare', () => {
  const projetes = brouillons();

  it('sept unités phonologiques, réparties sur les deux régions ouvertes', () => {
    expect(projetes.length).toBeGreaterThanOrEqual(7);
    const parRegion = new Map<string, number>();
    for (const { donnees } of projetes) {
      const region = String(donnees['region']);
      parRegion.set(region, (parRegion.get(region) ?? 0) + 1);
    }
    expect([...parRegion.keys()].sort()).toEqual(['clairiere', 'galeries']);
    for (const [region, compte] of parRegion) {
      expect(compte, `${region} n’a qu’une unité`).toBeGreaterThanOrEqual(3);
    }
  });

  it('aucun brouillon ne se présente comme jouable, et chacun dit son reste à faire', () => {
    // « Aucun contenu n'atteint l'enfant sans validation humaine » (CLAUDE.md). Un brouillon
    // sans reste à faire serait un exercice qui a sauté la relecture.
    for (const { chemin, donnees } of projetes) {
      expect(donnees['statut'], chemin).toBe('brouillon-non-jouable');
      expect((donnees['aFaireALaMain'] as unknown[]).length, chemin).toBeGreaterThan(0);
      expect(donnees['pointOuvert'], chemin).toBe('O10');
      expect(['grapheme', 'syllabe', 'mot'], chemin).toContain(donnees['natureDesFormes']);
    }
  });

  it('ce qui est sur disque, s’il y en a, est bien ce que le socle produit', () => {
    // Le dossier est ignoré par git : son absence est un dépôt cloné, pas un échec. Sa
    // présence, elle, doit être IDENTIQUE à la projection — sinon quelqu'un a édité un
    // brouillon à la main et la prochaine régénération l'écrasera en silence.
    const racine = join(RACINE_DEPOT, 'contenu', 'brouillons', 'phonologie');
    if (!existsSync(racine)) return;
    for (const { chemin, donnees } of projetes) {
      const absolu = join(racine, ...chemin.split('/'));
      if (!existsSync(absolu)) continue;
      expect(JSON.parse(readFileSync(absolu, 'utf8')), chemin).toEqual(donnees);
    }
  });
});

describe('C6 — le refus du générateur n’est pas décoratif', () => {
  it('le socle livré ne présente aucun écart', () => {
    expect(verifierSocle()).toEqual([]);
  });

  /** Copie profonde modifiable — on n'altère jamais l'objet importé. */
  function abime(transformer: (copie: Socle) => void): readonly string[] {
    const copie = structuredClone(socle) as Socle;
    transformer(copie);
    return verifierSocle(copie);
  }

  it('il attrape un mot hors lexique', () => {
    expect(
      abime((c) => {
        (c.clairiere.voyelles[0] as { mots: string[] }).mots.push('abracadabrantesque');
      }).length,
    ).toBeGreaterThan(0);
  });

  it('il attrape un mot d’exemple qui ne porte pas sa voyelle', () => {
    expect(
      abime((c) => {
        (c.clairiere.voyelles[0] as { mots: string[] }).mots = ['pull'];
      }).length,
    ).toBeGreaterThan(0);
  });

  it('il attrape un CVC qui ne se découpe pas', () => {
    expect(
      abime((c) => {
        (c.galeries.cvc[0] as { decoupe: string[] }).decoupe = ['s', 'ac'];
      }).length,
    ).toBeGreaterThan(0);
  });

  it('il attrape un mot rangé du mauvais côté d’un axe miroir', () => {
    expect(
      abime((c) => {
        (c.galeries.miroirGaucheDroite as { motsA: string[] }).motsA = ['domino'];
      }).length,
    ).toBeGreaterThan(0);
  });

  it('il attrape un mot qui porte LES DEUX lettres de l’axe', () => {
    // C'est le cas qu'aucune relecture humaine n'attrape : « poubelle » est au lexique, il
    // est du bon côté de l'axe b/p puisqu'il porte un `b`… et il porte aussi un `p`. Un tel
    // mot n'apprend pas à distinguer les deux lettres, il les met dans le même mot.
    const ecarts = abime((c) => {
      (c.galeries.miroirHautBas as { motsA: string[] }).motsA = ['poubelle', 'bateau'];
    });
    expect(ecarts.length).toBeGreaterThan(0);
    expect(ecarts.join(' | ')).toContain('poubelle');
  });

  it('il attrape deux axes qui déclareraient le même couple de lettres', () => {
    expect(
      abime((c) => {
        (c.galeries.miroirHautBas as { lettres: string[] }).lettres = ['b', 'd'];
      }).length,
    ).toBeGreaterThan(0);
  });
});
