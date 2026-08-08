/**
 * Q4 — AUCUNE POSITION DE RÉPONSE N'EST PRIVILÉGIÉE, SUR AUCUN MOTEUR.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q4. Mode de défaillance M4,
 * « le contenu porte un biais que le rendu ne corrige pas ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE GARDE A ÉTÉ ÉLARGI PARCE QU'IL AVAIT LUI-MÊME L'ANGLE MORT QU'IL DÉNONCE
 *
 * Première version : « 14 moteurs déclarés, dont **2** portent des choix ». Le père a ouvert
 * `banniere-phrase-01.json` dans la visite et a dit : *« il faut ranger les mots, mais ils sont
 * déjà dans l'ordre »*. Mesuré :
 *
 *     consigne c1 : « Range les mots pour lire : le feu est rouge. »
 *     ordre attendu                : mot-le · mot-feu · mot-est · mot-rouge
 *     étiquettes, ordre du fichier : mot-le · mot-feu · mot-est · mot-rouge · …
 *
 * L'enfant tape de gauche à droite et gagne **sans lire**. Q4 ne l'avait pas vu, et la cause
 * est exactement la faute que ce lot combat : **je recensais par OCCURRENCE d'une forme de
 * contenu** — « un tableau d'ids plus un SCALAIRE qui en fait partie » — au lieu de recenser
 * les OBJETS qui portent une réponse. `phrase` a la forme « tableau d'ids + TABLEAU d'ids »,
 * et il tombait dehors sans un mot.
 *
 * ── TROIS FAUX POSITIFS AVANT DE TROUVER LE BON ANCRAGE, ET ILS SE RESSEMBLENT ────────────
 *
 * Dériver « où est la réponse » de la FORME du contenu ne marche pas. Mesuré trois fois :
 *
 *   1. `assemble` à « 100 % à l'index 2 sur 35 cas » — la mesure avait apparié `motsCles`,
 *      quatre mots-clés de l'énoncé jamais montrés comme des boutons, avec un scalaire qui s'y
 *      trouvait par hasard.
 *   2. `histoire` à « 18,8 % » alors que la référence dit 32/32 — le champ `id` de l'étape
 *      (« q1 ») appartient au catalogue des étapes, et il passait pour la bonne réponse. **La
 *      mesure lisait la position de l'étape dans sa propre liste.**
 *   3. `chemin` à « 7,0 × le hasard » — le scalaire retenu était `depart`, la case de DÉPART,
 *      qui n'est pas une réponse mais le point de départ offert.
 *
 * L'ancrage juste n'est pas dans le contenu, il est dans le MOTEUR : `restantes`, que les
 * quatorze publient dans chaque étape (`EtapeGenerique`), est ce qu'ils déclarent eux-mêmes
 * rester à faire. On ne devine plus, on lit ce que le code dit.
 *
 * ── ET LE SEUIL DE 60 % NE POUVAIT PAS JUGER UNE RÉPONSE ORDONNÉE ────────────────────────
 *
 * `phrase` gagne 50 % de ses consignes à la stratégie triviale — sous les 60 % du § 4, donc
 * invisible. Or le hasard, pour un ordre de quatre mots, c'est 1/4! = **4,2 %**. Cinquante
 * pour cent, c'est **trente fois le hasard**. On compare donc désormais chaque moteur à SON
 * hasard — 1/n pour un choix parmi n, 1/k! pour un ordre de k —, ce qui rend la mesure juste
 * pour les deux familles et neutralise d'elle-même les moteurs où `restantes` est un gros
 * ensemble (`tri`, `attrape`, `chemin` retombent à 1,0 ×, c'est-à-dire au hasard exact).
 *
 * La règle du § 4 (« plus de 60 % au même index ») est CONSERVÉE pour la famille des choix :
 * elle attrape « toujours le deuxième », que la stratégie de gauche à droite ne voit pas.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { creerAlea } from '@partage/alea';
import { obtenirMoteur } from '@partage/moteurs/registre';

import { horlogeDeTest, lireJson, lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

import type { CodeMoteur, Exercice, Habillage } from '@pierre/partage';

// ═══════════════════════════════════════════════════════ la population, DÉRIVÉE de CodeMoteur

/** Les 14 moteurs déclarés, lus dans l'union `CodeMoteur`. `identifiants.ts` fait foi. */
function moteursDeclares(): readonly CodeMoteur[] {
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(lireTexte('partage/src/identifiants.ts'));
  if (bloc === null) {
    throw new Error('Q4 : l’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts.');
  }
  const codes = [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1] as CodeMoteur);
  if (codes.length === 0) throw new Error('Q4 : `CodeMoteur` trouvée, aucun membre lu.');
  return codes;
}

/**
 * Les modes de réponse où une STRATÉGIE POSITIONNELLE existe.
 *
 * Lus dans l'union `ModeReponse` de `partage/src/pedagogie/types.ts`, et non écrits ici : ce
 * sont ceux dont la probabilité de devinette est définie (D13). `saisie`, `colorie` et `trace`
 * en sont exclus par leur propre commentaire — « on ne trace pas une lettre par hasard ».
 */
function modesAStrategie(): ReadonlySet<string> {
  const bloc = /export type ModeReponse\s*=([\s\S]*?);/.exec(
    lireTexte('partage/src/pedagogie/types.ts'),
  );
  if (bloc === null) {
    throw new Error('Q4 : l’union `ModeReponse` est introuvable dans partage/src/pedagogie/types.ts.');
  }
  const tous = [...bloc[1]!.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]!);
  const sansStrategie = new Set(['saisie', 'colorie', 'trace', 'place']);
  const retenus = tous.filter((m) => !sansStrategie.has(m));
  if (retenus.length < 4) throw new Error('Q4 : `ModeReponse` ne rend plus assez de modes.');
  return new Set(retenus);
}

function tousLesExercices(): readonly Exercice[] {
  const trouves: Exercice[] = [];
  for (const region of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices'), {
    withFileTypes: true,
  })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices', region.name))) {
      if (!fichier.endsWith('.json')) continue;
      trouves.push(lireJson<Exercice>(`contenu/exercices/${region.name}/${fichier}`));
    }
  }
  return trouves;
}

/** Un habillage qui se DÉCLARE compatible avec ce moteur. Aucun n'est nommé en dur. */
function habillagePour(code: CodeMoteur): Habillage | null {
  const racine = join(RACINE_DEPOT, 'contenu', 'habillages');
  for (const region of readdirSync(racine, { withFileTypes: true })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(join(racine, region.name))) {
      if (!fichier.endsWith('.habillage.json')) continue;
      const habillage = lireJson<Habillage>(`contenu/habillages/${region.name}/${fichier}`);
      if (habillage.moteurs.includes(code)) return habillage;
    }
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════════ la mesure

const estIds = (valeur: unknown): valeur is readonly string[] =>
  Array.isArray(valeur) &&
  valeur.length >= 1 &&
  valeur.every((x) => typeof x === 'string') &&
  new Set(valeur as readonly string[]).size === valeur.length;

const factorielle = (k: number): number => (k <= 1 ? 1 : k * factorielle(k - 1));

interface Consigne {
  readonly moteur: CodeMoteur;
  readonly exercice: string;
  readonly mode: string;
  readonly ordonnee: boolean;
  /** Réussie par la stratégie « je tape de gauche à droite, sans lire ». */
  readonly triviale: boolean;
  /** Probabilité de réussir cette consigne au hasard. */
  readonly hasard: number;
  /** Index de la première bonne réponse dans l'ordre affiché. `-1` si absente. */
  readonly index: number;
  /** Une seule réponse acceptable ? Sinon « l'index de la bonne » vaut 0 par construction. */
  readonly reponseUnique: boolean;
}

function mesurer(graine: number): readonly Consigne[] {
  const modes = modesAStrategie();
  const relevees: Consigne[] = [];

  for (const exercice of tousLesExercices()) {
    const code = exercice.jeu.moteur as CodeMoteur;
    const habillage = habillagePour(code);
    if (habillage === null) continue;
    const contenu = exercice.jeu.contenu as unknown as Record<string, unknown>;

    let etat: unknown;
    try {
      etat = obtenirMoteur(code).creerEtat({
        contenu,
        habillage,
        alea: creerAlea(graine),
        horloge: horlogeDeTest(),
      });
    } catch {
      // Un moteur qui refuse son contenu livré est un autre défaut, gardé ailleurs.
      continue;
    }
    const etapesEtat =
      (etat as { etapes?: readonly Record<string, unknown>[] }).etapes ?? [];

    for (const [nomDuTableau, tableau] of Object.entries(contenu)) {
      if (!Array.isArray(tableau)) continue;
      for (const etape of tableau as readonly Record<string, unknown>[]) {
        if (etape === null || typeof etape !== 'object' || typeof etape['id'] !== 'string') continue;
        const etatEtape = etapesEtat.find((e) => e['identifiant'] === etape['id']);
        const mode = typeof etatEtape?.['modeReponse'] === 'string' ? etatEtape['modeReponse'] : '';
        if (!modes.has(mode)) continue;

        // ── L'ANCRAGE : ce que le MOTEUR déclare rester à faire sur cette étape.
        const attendues = estIds(etatEtape?.['restantes']) ? etatEtape['restantes'] : null;
        if (attendues === null || attendues.length === 0) continue;

        // ── LES ÉLÉMENTS PRÉSENTÉS : le tableau local de l'étape s'il en porte un (les
        // options d'`eclair`), sinon le catalogue de l'exercice qui les contient tous. On
        // exclut le tableau qui porte les ÉTAPES : une étape n'est pas une réponse.
        const local = Object.values(etape).find(
          (v) => estIds(v) && attendues.every((a) => v.includes(a)),
        );
        let presentes: readonly string[] | null = estIds(local) ? local : null;
        if (presentes === null) {
          for (const [nom, valeur] of Object.entries(contenu)) {
            if (nom === nomDuTableau || !Array.isArray(valeur)) continue;
            const ids = (valeur as readonly Record<string, unknown>[])
              .filter((e) => e !== null && typeof e?.['id'] === 'string')
              .map((e) => e['id'] as string);
            if (ids.length >= 2 && attendues.every((a) => ids.includes(a))) {
              presentes = ids;
              break;
            }
          }
        }
        if (presentes === null) continue;

        // ── L'ORDRE AFFICHÉ : la permutation que le moteur a produite si elle existe, sinon
        // l'ordre du contenu — le client n'a alors rien d'autre à rendre.
        const clef = [...presentes].sort().join(' ');
        let affiche = presentes;
        for (const valeur of Object.values(etatEtape ?? {})) {
          if (estIds(valeur) && [...valeur].sort().join(' ') === clef) {
            affiche = valeur;
            break;
          }
        }

        const ordonnee = mode === 'ordre' || mode === 'appariement';
        relevees.push({
          moteur: code,
          exercice: exercice.id,
          mode,
          ordonnee,
          triviale: ordonnee
            ? affiche.slice(0, attendues.length).join(',') === attendues.join(',')
            : attendues.includes(affiche[0] ?? ''),
          hasard: ordonnee
            ? 1 / factorielle(attendues.length)
            : attendues.length / affiche.length,
          index: affiche.findIndex((x) => attendues.includes(x)),
          reponseUnique: attendues.length === 1,
        });
      }
    }
  }
  return relevees;
}

interface Verdict {
  readonly moteur: CodeMoteur;
  readonly mode: string;
  readonly cas: number;
  readonly triviales: number;
  readonly attenduAuHasard: number;
  readonly rapport: number;
  /** Famille des choix : part du même index, et lequel. */
  readonly pireIndex: number;
  readonly partPireIndex: number;
  /** Toutes ses consignes n'ont QU'UNE réponse acceptable. */
  readonly reponseUnique: boolean;
}

function verdicts(relevees: readonly Consigne[]): readonly Verdict[] {
  const parMoteur = new Map<CodeMoteur, Consigne[]>();
  for (const c of relevees) {
    const liste = parMoteur.get(c.moteur) ?? [];
    liste.push(c);
    parMoteur.set(c.moteur, liste);
  }
  const sortie: Verdict[] = [];
  for (const [moteur, liste] of parMoteur) {
    const comptes = new Map<number, number>();
    for (const c of liste) comptes.set(c.index, (comptes.get(c.index) ?? 0) + 1);
    let pireIndex = 0;
    let pireCompte = 0;
    for (const [index, compte] of comptes) {
      if (compte > pireCompte) {
        pireIndex = index;
        pireCompte = compte;
      }
    }
    const triviales = liste.filter((c) => c.triviale).length;
    const attenduAuHasard = liste.reduce((total, c) => total + c.hasard, 0);
    sortie.push({
      moteur,
      mode: liste[0]!.ordonnee ? liste[0]!.mode : 'choix',
      cas: liste.length,
      triviales,
      attenduAuHasard,
      rapport: attenduAuHasard === 0 ? Number.POSITIVE_INFINITY : triviales / attenduAuHasard,
      pireIndex,
      partPireIndex: pireCompte / liste.length,
      reponseUnique: liste.every((c) => c.reponseUnique),
    });
  }
  return sortie.sort((a, b) => a.moteur.localeCompare(b.moteur));
}

/** Le § 4 Q4, conservé pour la famille des choix. */
const SEUIL_CONCENTRATION = 0.6;
const CAS_MINIMUM = 20;

/**
 * L'extension : le rapport au hasard. Deux fois le hasard n'est pas du bruit — sur `phrase`,
 * il est de trente fois. Le plancher de 10 consignes évite de juger un moteur sur trois cas.
 *
 * ⚠ LE SEUIL EST ATTEINT, PAS DÉPASSÉ, ET C'ÉTAIT UN ANGLE MORT DE PLUS.
 *
 * Un appariement de DEUX cartes a 1/2! = 0,5 de réussir au hasard : une disposition qui rend
 * la stratégie triviale toujours gagnante plafonne donc à **exactement 2,0 ×**. Avec un `>`
 * strict, `paires` était structurellement INJUGEABLE — mesuré : 130 consignes sur 130 gagnées
 * sans lire, rapport 2,00, et le garde restait muet. Les cartes sont pourtant rangées
 * `mot-cartable · image-cartable · mot-ecole · image-ecole` : taper deux voisines gagne à tous
 * les coups. Le seuil se lit donc « atteint ».
 */
const SEUIL_RAPPORT = 2;
const CAS_MINIMUM_RAPPORT = 10;

const GRAINES = [1, 7, 42, 2026, 31_337];

/** Toutes les graines mises bout à bout : un mélange se juge sur plusieurs tirages. */
function mesurerToutesGraines(): readonly Consigne[] {
  return GRAINES.flatMap((graine) => mesurer(graine));
}

const RELEVE = mesurerToutesGraines();
const VERDICTS = verdicts(RELEVE);

describe('Q4 — aucune position de réponse n’est privilégiée, sur AUCUN moteur', () => {
  test('la population est DÉRIVÉE du code, et elle couvre plus que les moteurs à `options`', () => {
    const codes = moteursDeclares();
    expect(codes.length, 'l’union `CodeMoteur` ne rend plus aucun membre').toBeGreaterThanOrEqual(14);
    expect(
      VERDICTS.length,
      'aucun moteur à stratégie positionnelle : la dérivation par `modeReponse` + `restantes` ' +
        'ne reconnaît plus rien, et le garde serait vrai par vacuité',
    ).toBeGreaterThanOrEqual(8);
    console.log(
      `[Q4] population : ${String(codes.length)} moteurs déclarés · ` +
        `${String(VERDICTS.length)} portent une réponse à position ou à ordre ` +
        '(dérivé de `modeReponse` publié par les états, ancré sur `restantes`).',
    );
    for (const v of VERDICTS) {
      console.log(
        `[Q4]   ${v.moteur.padEnd(10)} ${v.mode.padEnd(12)} ${String(v.cas).padStart(4)} cas · ` +
          `gagnées sans lire ${String(v.triviales).padStart(4)} ` +
          `(${((100 * v.triviales) / v.cas).toFixed(1).padStart(5)} %) · ` +
          `hasard ${v.attenduAuHasard.toFixed(1).padStart(6)} · ` +
          `rapport ${v.rapport.toFixed(1).padStart(5)} ×`,
      );
    }
  });

  test('CONTRÔLE POSITIF — une distribution FABRIQUÉE biaisée est signalée, une au hasard ne l’est pas', () => {
    // ── POURQUOI UN TÉMOIN FABRIQUÉ, ET PLUS `histoire` ────────────────────────────────────
    //
    // L'ancien contrôle exigeait qu'`histoire` soit vue au-dessus du hasard. **Le lot B1 a
    // livré le mélange sur les cinq moteurs signalés**, et le contrôle est tombé — ce fichier
    // l'annonçait : « soit B1 a livré le mélange, alors ce contrôle est à remplacer ».
    // C'est la troisième fois de ce lot qu'un contrôle ancré sur un défaut RÉEL meurt de sa
    // réparation (Q1, Q2, puis celui-ci). On fabrique donc les deux distributions.
    const fabriquer = (nom: string, n: number, gagnantes: number): readonly Consigne[] =>
      Array.from({ length: n }, (_, rang) => ({
        moteur: nom as CodeMoteur,
        exercice: `temoin-${String(rang)}`,
        mode: 'qcm-3',
        ordonnee: false,
        triviale: rang < gagnantes,
        hasard: 1 / 3,
        index: rang < gagnantes ? 0 : 1,
        reponseUnique: true,
      }));

    // Biaisée : la stratégie triviale gagne toujours, là où le hasard en donnerait un tiers.
    const [biaise] = verdicts(fabriquer('temoin-biaise', 30, 30));
    // Au hasard : elle gagne un tiers du temps, ce que le hasard prédit exactement.
    const [neutre] = verdicts(fabriquer('temoin-neutre', 30, 10));

    console.log(
      `[Q4] contrôle positif — témoin biaisé ${biaise!.rapport.toFixed(2)} × le hasard · ` +
        `témoin neutre ${neutre!.rapport.toFixed(2)} × le hasard (seuil ${String(SEUIL_RAPPORT)} ×)`,
    );
    expect(
      biaise!.rapport,
      'une distribution où la stratégie triviale gagne TOUJOURS, contre un hasard d’un tiers, ' +
        'n’est pas vue au-dessus du seuil : la statistique ne mesure plus rien, et tout vert ' +
        'rendu par ce fichier serait sans valeur.',
    ).toBeGreaterThanOrEqual(SEUIL_RAPPORT);
    expect(
      neutre!.rapport,
      'une distribution conforme au hasard est déclarée biaisée : l’instrument accuse au ' +
        'hasard, et un rapport de faux positifs ne se lit pas.',
    ).toBeLessThan(SEUIL_RAPPORT);
    expect(
      VERDICTS.some((v) => v.moteur.startsWith('temoin-')),
      'le témoin fabriqué a fui dans la mesure du dépôt réel : la mesure laisse sa propre trace.',
    ).toBe(false);
  });

  test('CONTRÔLE POSITIF — la mesure lit l’ordre de l’ÉTAT, pas celui du fichier', () => {
    // Le second contrôle, et il porte sur l'extraction plutôt que sur la statistique : si la
    // mesure lisait l'ordre du CONTENU, deux graines rendraient la même chose et le garde
    // serait aveugle à tout mélange. On exige donc que deux graines diffèrent quelque part.
    const une = mesurer(1).map((c) => `${c.exercice}:${String(c.index)}`).join('|');
    const deux = mesurer(999).map((c) => `${c.exercice}:${String(c.index)}`).join('|');
    console.log(
      `[Q4] contrôle positif — deux graines : ${une === deux ? 'ORDRES IDENTIQUES' : 'ordres distincts ✔'}`,
    );
    expect(
      une === deux,
      'deux graines différentes rendent exactement le même ordre affiché : la mesure lit ' +
        'l’ordre du FICHIER et non la permutation produite par le moteur. Elle ne pourrait ' +
        'alors ni voir un mélange, ni distinguer un moteur figé d’un moteur qui mélange.',
    ).toBe(false);
  });

  test('CONTRÔLE NÉGATIF — les moteurs sans biais retombent au hasard exact', () => {
    // Sans lui, un instrument qui déclarerait TOUT biaisé passerait pour sévère. `tri`,
    // `attrape` et `chemin` publient un gros `restantes` : leur stratégie triviale réussit
    // souvent, mais elle réussit exactement autant que le hasard. Le rapport doit le dire.
    const neutres = VERDICTS.filter((v) => v.rapport < 1.2);
    console.log(
      `[Q4] contrôle négatif — ${String(neutres.length)} moteur(s) au hasard exact : ` +
        neutres.map((v) => `${v.moteur} ${v.rapport.toFixed(2)} ×`).join(' · '),
    );
    expect(
      neutres.length,
      'AUCUN moteur ne retombe au hasard : l’instrument trouve un biais partout, donc il ne ' +
        'distingue plus rien. Un rapport qui ne descend jamais à 1 ne mesure pas un rapport.',
    ).toBeGreaterThanOrEqual(2);
  });

  test('LE DÉFAUT — aucune stratégie positionnelle ne bat le hasard', () => {
    console.log(
      `[Q4] rappel de population : ${String(moteursDeclares().length)} moteurs déclarés, ` +
        `${String(VERDICTS.length)} à réponse positionnée ou ordonnée, ` +
        `${String(GRAINES.length)} graines.`,
    );
    const griefs: string[] = [];
    for (const v of VERDICTS) {
      if (v.cas >= CAS_MINIMUM_RAPPORT && v.rapport >= SEUIL_RAPPORT) {
        console.log(
          `[Q4] ⚠ ${v.moteur.padEnd(10)} ${v.rapport.toFixed(1)} × le hasard — ` +
            `${String(v.triviales)}/${String(v.cas)} consignes gagnées sans lire`,
        );
        griefs.push(
          `${v.moteur} : la stratégie « taper de gauche à droite » gagne ` +
            `${String(v.triviales)}/${String(v.cas)} consignes, soit ${v.rapport.toFixed(1)} × ` +
            `le hasard (${v.attenduAuHasard.toFixed(1)} attendues)`,
        );
      }
      // ── LA RÈGLE DU § 4, ET POURQUOI ELLE EST DÉSORMAIS CONDITIONNÉE ────────────────────
      //
      // « Plus de 60 % des bonnes réponses au même index » suppose UNE bonne réponse parmi N.
      // L'élargissement de ce garde a fait entrer des moteurs où `restantes` en porte
      // PLUSIEURS — et là, « l'index de la première bonne » vaut 0 par construction. Mesuré :
      //
      //     eclair · grave · histoire   1…1 réponse acceptable   ← la règle s'applique
      //     attrape 1…3 · chemin 3…3 · tri 2…4                   ← elle ne veut rien dire
      //
      // Le garde rendait donc DEUX verdicts opposés sur le même fait : « tri 100 % à l'index
      // 0 » d'un côté, « tri 1,0 × le hasard » de l'autre. C'est le rapport au hasard qui fait
      // foi ; cette règle-ci ne s'applique plus qu'où une seule réponse est acceptable.
      if (
        v.mode === 'choix' &&
        v.reponseUnique &&
        v.cas >= CAS_MINIMUM &&
        v.partPireIndex > SEUIL_CONCENTRATION
      ) {
        griefs.push(
          `${v.moteur} : ${(v.partPireIndex * 100).toFixed(1)} % des bonnes réponses à ` +
            `l’index ${String(v.pireIndex)} sur ${String(v.cas)} cas`,
        );
      }
    }
    expect(
      griefs,
      'Un enfant qui joue la position gagne ces moteurs sans lire, et le BKT engrange des ' +
        'réussites vides. Le remède est celui d’`eclair` : l’ordre est TIRÉ par `Alea` à la ' +
        'création de l’état, donc reproductible à la graine près, donc le rejeu reste exact ' +
        '(lot B1 — et il concerne plus que `histoire`).',
    ).toEqual([]);
  });

  test('DÉTERMINISME — la même graine rend la même mesure, sinon le rejeu ment', () => {
    // `Alea` est la seule source de hasard du projet et le rejeu des journaux (annexe T § T2)
    // suppose qu'une graine reproduit une partie.
    const un = mesurer(123).map((c) => `${c.exercice}:${String(c.index)}:${String(c.triviale)}`);
    const deux = mesurer(123).map((c) => `${c.exercice}:${String(c.index)}:${String(c.triviale)}`);
    expect(un.length).toBeGreaterThan(0);
    expect(deux).toEqual(un);
  });
});
