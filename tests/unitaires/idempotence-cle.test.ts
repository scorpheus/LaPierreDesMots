/**
 * M20 — LA CLÉ D'IDEMPOTENCE POUVAIT PERDRE UNE DE SES ENTRÉES SANS QUE RIEN NE BOUGE.
 *
 * `Docs/audit-qa.md` § 4.3, mesuré et cité :
 *
 *     $ grep -rn "deriverCleIdempotence\|calculerCleIdempotence" tests/
 *     (aucun résultat)
 *
 * La fonction qui décide si une tentative est un doublon n'était appelée par AUCUN test. Elle
 * était exercée indirectement — `tests/api/tentatives.test.ts` a bien un cas « idempotence de
 * la mise à jour » — mais **ses entrées n'étaient pas épinglées une par une**. L'auditeur a
 * retiré `noeudId` de la matière du hachage ; les 1478 tests sont restés verts, `test:rejeu` et
 * `test:contenu` aussi.
 *
 * Sévérité honnête : faible en exploitation — il faudrait que deux nœuds démarrent à la même
 * milliseconde avec la même graine pour le même profil. Mais c'est **précisément la forme du
 * défaut n° 4** (« l'enfant termine, rien n'est sauvé »), et le coût du test est de dix lignes.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * TROIS ÉTAGES, ET LE TROISIÈME EST CELUI QUI PARLE À L'ENFANT
 *
 *  1. **La formule, entrée par entrée.** Faire varier `profilId`, puis `noeudId`, puis
 *     `demarreLe`, puis `graine`, UNE À LA FOIS, et exiger une clé différente à chaque fois.
 *     C'est ce cas-là, et lui seul, qui attrape M20 sur la fonction.
 *
 *  2. **L'accord client / serveur.** `serveur/src/depots/tentatives.ts` et
 *     `client/src/api/client.ts` implantent la MÊME formule dans deux langages de plateforme
 *     différents (`node:crypto` contre `crypto.subtle`), et rien ne les reliait. Un test
 *     croisé le fait. Le repli déterministe du client — atteint en usage réel, le jeu est
 *     servi en HTTP clair quand mkcert n'a pas été installé — est éprouvé lui aussi : il ne
 *     rend pas la même empreinte, ce n'est pas son rôle, mais il doit dépendre des quatre
 *     mêmes entrées. Un repli qui perdrait `noeudId` serait M20 côté client, invisible
 *     autrement.
 *
 *  3. **Le comportement, sur une vraie base.** Deux nœuds différents joués par le même profil
 *     à la même milliseconde avec la même graine doivent produire DEUX tentatives au journal.
 *     Sous M20 la seconde est avalée comme un doublon : l'enfant termine, rien n'est sauvé.
 *     C'est aussi le seul endroit d'où l'identifiant `tnt-…` est observable —
 *     `deriverIdentifiant` n'est pas exporté (arbitrage consigné dans
 *     `Docs/questions-en-attente.md`).
 *
 * CONTRAT DE SORTIE : le test imprime le nombre d'entrées épinglées (4 par implantation, sur
 * trois chemins de calcul = 12) et échoue si ce nombre descend sous 12. Une entrée retirée du
 * quadruplet ferait tomber ce compte avant même l'assertion.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deriverCleIdempotence, compterTentatives, enregistrerTentative, listerTentatives } from '@serveur/depots/tentatives';
import { creerProfil } from '@serveur/depots/profils';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations } from '@serveur/base/migrations';

import { calculerCleIdempotence } from '@client/api/client';

import type { DatabaseSync } from 'node:sqlite';
import type { ResumeTentative } from '@pierre/partage';

import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../configuration/preparation.js';

/** Le quadruplet de référence. Aucune de ces quatre valeurs n'est décorative. */
const REFERENCE = {
  profilId: 'prf-alma-01',
  noeudId: 'clairiere-03',
  demarreLe: '2026-09-01T08:00:00.000Z',
  graine: 20260801,
} as const;

/** Les quatre variations, une entrée à la fois. C'est la liste qui fait le contrat de sortie. */
const VARIATIONS = [
  { entree: 'profilId', quadruplet: { ...REFERENCE, profilId: 'prf-nour-02' } },
  { entree: 'noeudId', quadruplet: { ...REFERENCE, noeudId: 'clairiere-04' } },
  { entree: 'demarreLe', quadruplet: { ...REFERENCE, demarreLe: '2026-09-01T08:00:00.001Z' } },
  { entree: 'graine', quadruplet: { ...REFERENCE, graine: 20260802 } },
] as const;

const ENTREES_MINIMUM = VARIATIONS.length * 3;

type Quadruplet = (typeof VARIATIONS)[number]['quadruplet'] | typeof REFERENCE;

function cleServeur(q: Quadruplet): string {
  return deriverCleIdempotence(q.profilId, q.noeudId, q.demarreLe, q.graine);
}

async function cleClient(q: Quadruplet): Promise<string> {
  return calculerCleIdempotence(q.profilId, q.noeudId, q.demarreLe, q.graine);
}

// ─────────────────────────────────────────────── le repli du client, sans `crypto.subtle`

const CRYPTO_REEL = globalThis.crypto;

/**
 * Retire `crypto.subtle`. Ce n'est pas un artifice de test : `crypto.subtle` n'existe QUE dans
 * un contexte sécurisé, et le jeu est servi en HTTP clair sur le LAN quand mkcert n'a pas été
 * installé (CLAUDE.md). Ce chemin est atteint chez l'enfant.
 */
function sansSousCouche(): void {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    writable: true,
    value: { getRandomValues: CRYPTO_REEL.getRandomValues.bind(CRYPTO_REEL) },
  });
}

function avecSousCouche(): void {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    writable: true,
    value: CRYPTO_REEL,
  });
}

afterEach(() => {
  avecSousCouche();
});

// ───────────────────────────────────────────────────────────── étage 1 — la formule serveur

describe('la clé du serveur dépend de CHACUNE de ses quatre entrées', () => {
  it('elle est stable : deux appels avec le même quadruplet rendent la même chaîne', () => {
    expect(cleServeur(REFERENCE)).toBe(cleServeur(REFERENCE));
  });

  it('elle a la forme d’un sha256 : 64 caractères hexadécimaux minuscules', () => {
    expect(cleServeur(REFERENCE)).toMatch(/^[0-9a-f]{64}$/u);
  });

  for (const { entree, quadruplet } of VARIATIONS) {
    it(`changer \`${entree}\` — et lui seul — change la clé`, () => {
      // C'est CE cas qui attrape M20 : une entrée retirée de la matière du hachage rend ici
      // deux clés identiques, donc deux tentatives distinctes confondues en une.
      const reference = cleServeur(REFERENCE);
      const variante = cleServeur(quadruplet);
      expect(
        variante,
        `\`${entree}\` ne participe pas à la clé : deux tentatives distinctes la partagent`,
      ).not.toBe(reference);
    });
  }
});

// ────────────────────────────────────────── étage 2 — le client, et son accord avec le serveur

describe('la clé du client dépend des mêmes quatre entrées, sur ses DEUX chemins', () => {
  it('avec `crypto.subtle`, elle est identique à celle du serveur', async () => {
    // Rien ne reliait les deux implantations. Une divergence de concaténation suffirait à
    // casser l'idempotence sans qu'aucune suite ne bronche — le dépôt le dit lui-même :
    // « deux facons de concatener suffiraient a casser l'idempotence ».
    avecSousCouche();
    expect(await cleClient(REFERENCE)).toBe(cleServeur(REFERENCE));
  });

  for (const { entree, quadruplet } of VARIATIONS) {
    it(`avec \`crypto.subtle\`, changer \`${entree}\` change la clé — et l’accord tient`, async () => {
      avecSousCouche();
      const reference = await cleClient(REFERENCE);
      const variante = await cleClient(quadruplet);
      expect(variante, `\`${entree}\` ne participe pas à la clé du client`).not.toBe(reference);
      expect(variante, `client et serveur divergent sur \`${entree}\``).toBe(cleServeur(quadruplet));
    });
  }

  it('sans `crypto.subtle`, le repli reste déterministe et large de 64 caractères', async () => {
    sansSousCouche();
    const premiere = await cleClient(REFERENCE);
    const seconde = await cleClient(REFERENCE);
    expect(premiere).toBe(seconde);
    expect(premiere).toMatch(/^[0-9a-f]{64}$/u);
    // Le repli n'est PAS un sha256 et n'a pas à l'être ; il doit seulement être stable.
    expect(premiere).not.toBe(cleServeur(REFERENCE));
  });

  for (const { entree, quadruplet } of VARIATIONS) {
    it(`sans \`crypto.subtle\`, changer \`${entree}\` change encore la clé`, async () => {
      sansSousCouche();
      const reference = await cleClient(REFERENCE);
      const variante = await cleClient(quadruplet);
      expect(
        variante,
        `le repli déterministe perd \`${entree}\` : M20, côté client, en HTTP clair`,
      ).not.toBe(reference);
    });
  }
});

// ──────────────────────────────────────────────── étage 3 — le comportement sur une vraie base

const RESUME: ResumeTentative = {
  reussi: true,
  nbErreurs: 0,
  aideUtilisee: 'aucune',
  dureeMs: 4200,
  etapes: [],
};

describe('deux nœuds joués au même instant produisent DEUX tentatives au journal', () => {
  let base: DatabaseSync;
  let profil: string;

  beforeEach(() => {
    const horloge = horlogeDeTest();
    base = ouvrirBase(':memory:');
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
    profil = creerProfil(
      base,
      {
        prenom: 'Alma',
        avatar: {
          peau: 'claire',
          cheveux: 'chatains',
          yeux: 'noisette',
          coiffure: 'courte-ebouriffee',
          morphologie: '7-ans',
        },
        paletteVariante: 'clairiere',
      },
      horloge,
    ).id;
  });

  afterEach(() => {
    base.close();
  });

  function enregistrer(noeud: string): ReturnType<typeof enregistrerTentative> {
    // Tout est identique SAUF le nœud : profil, instant de départ, graine. C'est le seul cas
    // de figure où M20 se voit, et c'est celui que la clé est censée distinguer.
    return enregistrerTentative(
      base,
      {
        cleIdempotence: deriverCleIdempotence(profil, noeud, REFERENCE.demarreLe, REFERENCE.graine),
        profil,
        noeud,
        exercice: `ex-${noeud}`,
        moteur: 'assemble',
        habillage: 'clairiere.ecole',
        graine: REFERENCE.graine,
        demarreLe: REFERENCE.demarreLe,
        termineLe: '2026-09-01T08:00:04.200Z',
        resume: RESUME,
      },
      horlogeDeTest(),
    );
  }

  it('la seconde n’est pas avalée comme un doublon — « l’enfant termine, rien n’est sauvé »', () => {
    const premiere = enregistrer('clairiere-03');
    const seconde = enregistrer('clairiere-04');

    expect(premiere.deja, 'la première tentative doit être insérée').toBe(false);
    expect(
      seconde.deja,
      'la seconde tentative est prise pour un doublon : la clé ne distingue plus les nœuds',
    ).toBe(false);
    expect(compterTentatives(base, profil), 'tentatives au journal').toBe(2);
  });

  it('leurs identifiants `tnt-…` sont distincts et bien formés', () => {
    // `deriverIdentifiant` n'est pas exporté ; il n'est observable que par ici.
    const premiere = enregistrer('clairiere-03');
    const seconde = enregistrer('clairiere-04');
    expect(premiere.tentative.id).toMatch(/^tnt-[0-9a-f]{16}$/u);
    expect(seconde.tentative.id).toMatch(/^tnt-[0-9a-f]{16}$/u);
    expect(seconde.tentative.id).not.toBe(premiere.tentative.id);
    expect(new Set(listerTentatives(base, profil).map((t) => t.id)).size).toBe(2);
  });

  it('le renvoi EXACT de la même tentative, lui, reste un doublon — l’idempotence tient', () => {
    // Contrôle négatif du cas précédent : sans lui, un test vert prouverait seulement qu'on
    // a cassé l'idempotence, pas qu'on l'a rendue exacte.
    const premiere = enregistrer('clairiere-03');
    const renvoi = enregistrer('clairiere-03');
    expect(premiere.deja).toBe(false);
    expect(renvoi.deja, 'un double tap doit être absorbé, jamais doublé').toBe(true);
    expect(renvoi.tentative.id).toBe(premiere.tentative.id);
    expect(compterTentatives(base, profil)).toBe(1);
  });
});

describe('contrat de sortie', () => {
  it('12 entrées épinglées — 4 par chemin de calcul, sur trois chemins', () => {
    const epinglees = VARIATIONS.length * 3;
    console.log(
      `[qa-idempotence] ${String(epinglees)} entrée(s) épinglée(s) : ` +
        `${VARIATIONS.map((v) => v.entree).join(', ')} × {serveur, client-subtle, client-repli}`,
    );
    expect(epinglees, 'entrées épinglées une à une').toBeGreaterThanOrEqual(ENTREES_MINIMUM);
    expect(VARIATIONS.length, 'la clé est un QUADRUPLET, pas moins').toBe(4);
  });
});
