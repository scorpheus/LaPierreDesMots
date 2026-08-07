/**
 * Q4 — AUCUNE POSITION DE RÉPONSE N'EST PRIVILÉGIÉE, SUR AUCUN MOTEUR.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q4. Mode de défaillance M4,
 * « le contenu porte un biais que le rendu ne corrige pas ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE ALORS QUE `eclair-ordre-options.test.ts` EXISTE DÉJÀ
 *
 * R14 a corrigé exactement ce défaut… **sur `eclair` seulement**, et le garde écrit ce jour-là
 * nomme `eclair` dans son code. Quatre jours plus tard, mesuré sur les 76 exercices :
 *
 *     moteur     consignes à options   bonne réponse en 1re position   mélangé au rendu ?
 *     eclair              34                    34  (100 %)                   oui
 *     histoire            32                    32  (100 %)               *** NON ***
 *
 * **Trente-deux sur trente-deux.** Un enfant qui tape toujours le premier bouton réussit
 * `histoire` sans lire une lettre, et le BKT engrange des réussites vides.
 *
 * Le défaut n'est pas que personne n'ait pensé à `histoire` : c'est que **le garde de R14
 * portait une liste écrite à la main**. Q4 recense les moteurs **par l'union `CodeMoteur`**,
 * et les consignes à choix **par la forme du contenu** — jamais par un nom de champ appris par
 * cœur. Un quinzième moteur à options ajouté demain entre dans ce garde tout seul.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── COMMENT « L'ORDRE AU RENDU » EST DÉRIVÉ, ET POURQUOI C'EST MÉCANIQUE ──────────────────
 *
 * Une consigne à choix, c'est un couple : un tableau d'au moins deux identifiants distincts, et
 * un champ scalaire dont la valeur est l'un d'eux. Cette forme-là se reconnaît sans connaître
 * aucun moteur ; sur les 76 exercices livrés elle ne désigne que `eclair` et `histoire`, ce qui
 * est exactement ce que la mesure de référence trouve.
 *
 * L'ordre AFFICHÉ, lui, se lit dans l'ÉTAT que le moteur crée :
 *   • si l'état de l'étape porte un tableau qui est une PERMUTATION des options du contenu,
 *     c'est lui que le client rend — c'est `ordreOptions` chez `eclair` ;
 *   • s'il n'en porte aucun, le client n'a rien d'autre à rendre que l'ordre du contenu.
 *     C'est le cas d'`histoire`, et c'est pour cela que sa bonne réponse est toujours en tête.
 *
 * Aucun nom de champ n'est cité : `ordreOptions` n'apparaît nulle part dans ce fichier.
 *
 * ── LE CONTRÔLE POSITIF, ET IL EST INDISPENSABLE ──────────────────────────────────────────
 *
 * On refait la mesure en IGNORANT toute permutation produite par les moteurs — c'est-à-dire en
 * simulant un dépôt où personne ne mélange. `eclair` doit alors redevenir 100 % en première
 * position. Sans ce contrôle, un instrument qui lirait toujours l'ordre du contenu rendrait
 * « histoire est biaisé, eclair aussi » ou, pire, « rien n'est biaisé » — et on le croirait.
 * C'est le contrôle qui a prouvé que R14 mesurait quelque chose (170/170).
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { creerAlea } from '@partage/alea';
import { obtenirMoteur } from '@partage/moteurs/registre';

import { horlogeDeTest, lireJson, lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

import type { CodeMoteur, Exercice, Habillage } from '@pierre/partage';

// ═══════════════════════════════════════════════════════ la population, DÉRIVÉE de CodeMoteur

/**
 * Les 14 moteurs déclarés, lus dans l'union `CodeMoteur`.
 *
 * `partage/src/identifiants.ts` fait foi. Le lire plutôt que l'importer garde la dérivation
 * TEXTUELLE et donc opposable : si l'union change de forme, ce fichier lève au lieu de mesurer
 * sur une liste vide.
 */
function moteursDeclares(): readonly CodeMoteur[] {
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(lireTexte('partage/src/identifiants.ts'));
  if (bloc === null) {
    throw new Error('Q4 : l’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts.');
  }
  const codes = [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1] as CodeMoteur);
  if (codes.length === 0) throw new Error('Q4 : `CodeMoteur` trouvée, aucun membre lu.');
  return codes;
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
      const habillage = lireJson<Habillage>(
        `contenu/habillages/${region.name}/${fichier}`,
      );
      if (habillage.moteurs.includes(code)) return habillage;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════ ce qu'est une consigne « à choix »

interface Choix {
  /** L'ordre dans lequel le CONTENU écrit les options. */
  readonly options: readonly string[];
  readonly bonne: string;
}

const estTableauDIdentifiants = (valeur: unknown): valeur is readonly string[] =>
  Array.isArray(valeur) &&
  valeur.length >= 2 &&
  valeur.every((x) => typeof x === 'string') &&
  new Set(valeur as readonly string[]).size === valeur.length;

/**
 * Les choix portés par une étape de contenu.
 *
 * Trois conditions, et la troisième a été ajoutée après une mesure qui aurait menti :
 *   1. un tableau d'identifiants distincts, d'au moins deux membres ;
 *   2. un champ scalaire dont la valeur est l'un d'eux ;
 *   3. **tous les membres du tableau désignent des objets du catalogue de l'exercice** —
 *      c'est-à-dire des `id` d'un tableau d'objets du bloc `jeu.contenu`.
 *
 * Sans la troisième condition, `assemble` remontait « 100 % à l'index 2 sur 35 cas », un
 * chiffre parfaitement faux : la mesure avait apparié `motsCles` — quatre mots-clés de
 * l'énoncé, jamais montrés comme des boutons — avec un scalaire qui s'y trouvait par hasard.
 * Un moteur accusé à tort est exactement ce que ce lot combat : « un rapport de faux positifs
 * ne se lit pas ». `assemble` sort donc de la population, et il en sort MÉCANIQUEMENT.
 */
function choixDe(
  etape: Record<string, unknown>,
  catalogue: ReadonlySet<string>,
): readonly Choix[] {
  const tableaux = Object.values(etape)
    .filter(estTableauDIdentifiants)
    .filter((liste) => liste.every((membre) => catalogue.has(membre)));
  const scalaires = Object.values(etape).filter((v): v is string => typeof v === 'string');
  const trouves: Choix[] = [];
  for (const options of tableaux) {
    for (const bonne of scalaires) {
      if (options.includes(bonne)) {
        trouves.push({ options, bonne });
        break;
      }
    }
  }
  return trouves;
}

/** Tous les `id` déclarés par les tableaux d'objets du bloc `jeu.contenu`. */
function catalogueDe(contenu: Record<string, unknown>): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const valeur of Object.values(contenu)) {
    if (!Array.isArray(valeur)) continue;
    for (const element of valeur) {
      if (typeof element === 'object' && element !== null && typeof (element as { id?: unknown }).id === 'string') {
        ids.add((element as { id: string }).id);
      }
    }
  }
  return ids;
}

/** Les tableaux d'objets du bloc `jeu.contenu` — les « étapes », quel que soit leur nom. */
function etapesDuContenu(contenu: Record<string, unknown>): readonly Record<string, unknown>[] {
  const etapes: Record<string, unknown>[] = [];
  for (const valeur of Object.values(contenu)) {
    if (!Array.isArray(valeur)) continue;
    for (const element of valeur) {
      if (typeof element === 'object' && element !== null && 'id' in element) {
        etapes.push(element as Record<string, unknown>);
      }
    }
  }
  return etapes;
}

// ═══════════════════════════════════════════════════════════ la mesure : l'ordre AU RENDU

interface Position {
  readonly moteur: CodeMoteur;
  readonly exercice: string;
  readonly index: number;
  readonly nbOptions: number;
}

/**
 * L'ordre affiché d'une consigne : la permutation que le moteur a produite si elle existe,
 * sinon l'ordre du contenu — parce que le client n'a alors rien d'autre à rendre.
 *
 * `sansMelange` est le levier du contrôle positif : il ignore les permutations, et remet donc
 * tous les moteurs dans l'état d'avant R14.
 */
function ordreAffiche(
  etatEtape: Record<string, unknown> | undefined,
  choix: Choix,
  sansMelange: boolean,
): readonly string[] {
  if (sansMelange || etatEtape === undefined) return choix.options;
  const attendues = [...choix.options].sort().join(' ');
  for (const valeur of Object.values(etatEtape)) {
    if (!estTableauDIdentifiants(valeur)) continue;
    if ([...valeur].sort().join(' ') === attendues) return valeur;
  }
  return choix.options;
}

function positions(graines: readonly number[], sansMelange: boolean): readonly Position[] {
  const relevees: Position[] = [];
  const exercices = tousLesExercices();
  for (const code of moteursDeclares()) {
    const desMoteurs = exercices.filter((e) => e.jeu.moteur === code);
    if (desMoteurs.length === 0) continue;
    const habillage = habillagePour(code);
    if (habillage === null) continue;
    const moteur = obtenirMoteur(code);

    for (const exercice of desMoteurs) {
      const contenu = exercice.jeu.contenu as unknown as Record<string, unknown>;
      const catalogue = catalogueDe(contenu);
      const etapesContenu = etapesDuContenu(contenu);
      if (etapesContenu.every((e) => choixDe(e, catalogue).length === 0)) continue;

      for (const graine of graines) {
        let etat: unknown;
        try {
          etat = moteur.creerEtat({
            contenu,
            habillage,
            alea: creerAlea(graine),
            horloge: horlogeDeTest(),
          });
        } catch {
          // Un moteur qui refuse son propre contenu livré est un autre défaut, gardé
          // ailleurs (`contenu-validation`). Ici on ne mesure que ce qui se crée.
          continue;
        }
        const etapesEtat = (etat as { etapes?: readonly Record<string, unknown>[] }).etapes ?? [];

        for (const etapeContenu of etapesContenu) {
          const etatEtape = etapesEtat.find((e) => e['identifiant'] === etapeContenu['id']);
          for (const choix of choixDe(etapeContenu, catalogue)) {
            const affiche = ordreAffiche(etatEtape, choix, sansMelange);
            relevees.push({
              moteur: code,
              exercice: exercice.id,
              index: affiche.indexOf(choix.bonne),
              nbOptions: affiche.length,
            });
          }
        }
      }
    }
  }
  return relevees;
}

interface Verdict {
  readonly moteur: CodeMoteur;
  readonly cas: number;
  readonly pire: number;
  readonly partPire: number;
}

/** Le § 4 Q4 : échoue si plus de 60 % des bonnes réponses tombent au même index, sur ≥ 20 cas. */
const SEUIL_CONCENTRATION = 0.6;
const CAS_MINIMUM = 20;

function verdicts(relevees: readonly Position[]): readonly Verdict[] {
  const parMoteur = new Map<CodeMoteur, Position[]>();
  for (const p of relevees) {
    const liste = parMoteur.get(p.moteur) ?? [];
    liste.push(p);
    parMoteur.set(p.moteur, liste);
  }
  const sortie: Verdict[] = [];
  for (const [moteur, liste] of parMoteur) {
    const comptes = new Map<number, number>();
    for (const p of liste) comptes.set(p.index, (comptes.get(p.index) ?? 0) + 1);
    let pire = 0;
    let pireCompte = 0;
    for (const [index, compte] of comptes) {
      if (compte > pireCompte) {
        pire = index;
        pireCompte = compte;
      }
    }
    sortie.push({ moteur, cas: liste.length, pire, partPire: pireCompte / liste.length });
  }
  return sortie.sort((a, b) => a.moteur.localeCompare(b.moteur));
}

const GRAINES = [1, 7, 42, 2026, 31_337];

describe('Q4 — aucune position de réponse n’est privilégiée, sur AUCUN moteur', () => {
  test('la population est DÉRIVÉE de l’union `CodeMoteur`, et elle n’est pas vide', () => {
    const codes = moteursDeclares();
    expect(codes.length, 'l’union `CodeMoteur` ne rend plus aucun membre').toBeGreaterThanOrEqual(14);
    const aChoix = verdicts(positions([GRAINES[0]!], false));
    expect(
      aChoix.length,
      'aucun moteur à choix trouvé : la forme « tableau d’identifiants + scalaire qui en fait ' +
        'partie » ne reconnaît plus rien, et le garde serait vrai par vacuité',
    ).toBeGreaterThanOrEqual(2);
    console.log(
      `[Q4] population : ${String(codes.length)} moteurs déclarés (${codes.join(' · ')}), ` +
        `dont ${String(aChoix.length)} portent des choix : ` +
        aChoix.map((v) => `${v.moteur} (${String(v.cas)} cas)`).join(' · '),
    );
  });

  test('CONTRÔLE POSITIF — mélange ignoré, un moteur qui mélange redevient 100 % en tête', () => {
    // C'est le contrôle exigé par le § 4 Q4. Sans lui, un instrument qui lirait TOUJOURS
    // l'ordre du contenu passerait pour juste : il accuserait `histoire` à raison et
    // `eclair` à tort, et personne ne saurait lequel des deux croire.
    const sansMelange = verdicts(positions(GRAINES, true));
    const avecMelange = verdicts(positions(GRAINES, false));

    const melangeurs = avecMelange.filter((v) => {
      const jumeau = sansMelange.find((s) => s.moteur === v.moteur);
      return jumeau !== undefined && v.partPire < jumeau.partPire;
    });
    expect(
      melangeurs.length,
      'AUCUN moteur ne mélange ses options : soit le mélange a disparu du dépôt, soit Q4 ne ' +
        'sait plus lire une permutation dans l’état d’un moteur. Dans les deux cas Q4 ne ' +
        'mesure plus rien.',
    ).toBeGreaterThanOrEqual(1);

    for (const melangeur of melangeurs) {
      const jumeau = sansMelange.find((s) => s.moteur === melangeur.moteur)!;
      console.log(
        `[Q4] contrôle positif — ${melangeur.moteur} : avec mélange ` +
          `${(melangeur.partPire * 100).toFixed(1)} % à l’index ${String(melangeur.pire)}, ` +
          `sans mélange ${(jumeau.partPire * 100).toFixed(1)} % à l’index ${String(jumeau.pire)} ` +
          `(${String(jumeau.cas)} cas)`,
      );
      expect(
        jumeau.partPire,
        `${melangeur.moteur} : mélange ignoré, la concentration devrait revenir à 100 % — ` +
          'c’est le chiffre d’avant R14 (34/34). Elle ne remonte pas : l’instrument ne voit ' +
          'plus le mélange qu’il est censé mesurer.',
      ).toBeGreaterThan(SEUIL_CONCENTRATION);
    }
  });

  test('LE DÉFAUT — aucune concentration au-delà de 60 % sur un même index', () => {
    const mesures = verdicts(positions(GRAINES, false));
    console.log(
      `[Q4] rappel de population : ${String(moteursDeclares().length)} moteurs declares, ` +
        `${String(mesures.length)} portent des choix, ${String(GRAINES.length)} graines.`,
    );
    const griefs: string[] = [];
    for (const v of mesures) {
      const ligne =
        `${v.moteur.padEnd(10)} ${String(v.cas).padStart(4)} cas · ` +
        `${(v.partPire * 100).toFixed(1)} % à l’index ${String(v.pire)}`;
      const fautif = v.cas >= CAS_MINIMUM && v.partPire > SEUIL_CONCENTRATION;
      console.log(`[Q4] ${fautif ? '⚠' : ' '} ${ligne}`);
      if (fautif) {
        griefs.push(
          `${v.moteur} : ${(v.partPire * 100).toFixed(1)} % des bonnes réponses à l’index ` +
            `${String(v.pire)} sur ${String(v.cas)} cas`,
        );
      }
    }
    expect(
      griefs,
      'Un enfant qui tape toujours le même bouton réussit ces moteurs sans lire, et le BKT ' +
        'engrange des réussites vides. Le remède est celui d’`eclair` : l’ordre est TIRÉ par ' +
        '`Alea` à la création de l’état, donc reproductible à la graine près, donc le rejeu ' +
        'reste exact (lot B1).',
    ).toEqual([]);
  });

  test('DÉTERMINISME — la même graine rend le même ordre, sinon le rejeu ment', () => {
    // `Alea` est la seule source de hasard du projet et le rejeu des journaux (annexe T § T2)
    // suppose qu'une graine reproduit une partie. Un mélange non reproductible ferait diverger
    // le rejeu sans qu'aucun test de rejeu ne sache pourquoi.
    const un = positions([123], false).map((p) => `${p.exercice}:${String(p.index)}`);
    const deux = positions([123], false).map((p) => `${p.exercice}:${String(p.index)}`);
    expect(un.length).toBeGreaterThan(0);
    expect(deux).toEqual(un);
  });
});
