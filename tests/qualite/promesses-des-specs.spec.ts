/**
 * Q6 — CHAQUE MOTEUR REND CE QUE LES SPECS LUI PROMETTENT.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q6. Mode de défaillance M6,
 * « la promesse des specs sans rendu ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI L'A INSPIRÉ — R36, et le père l'a formulé comme une question sur l'enfant
 *
 * « certaines règles sont incomprises… comme marcher sur les mots, est-ce qu'il y avait un
 * design graphique en tête ? »
 *
 * Oui. Les specs v2 § 5, ligne 216, à la lettre :
 *
 *     | `chemin` | Tracer une route en enchaînant les bonnes cases | Sauts de nénuphars ·
 *       pas japonais · lianes |
 *
 * Ce qui est rendu : `<div data-plateau="cases" style={{ display: 'flex', flexWrap: 'wrap' }}>`.
 * Une rangée de boutons qui passe à la ligne. `data-pion`, `data-atteignable` et `data-franchie`
 * sont tous les trois dans le DOM et **aucun des trois n'a de rendu**.
 *
 * **Ce n'est pas un défaut de compréhension de la règle : c'est une règle qui n'est dessinée
 * nulle part.** Le dessin manquant avait été pris pour un défaut de l'enfant.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI REND CE GARDE INHABITUEL : IL TRANSFORME UN DOCUMENT EN ASSERTION ──────────────
 *
 * La population n'est pas écrite ici. Elle est LUE dans la table des moteurs des specs v2 —
 * `| \`code\` | mécanique promise | habillages promis |` — croisée avec l'union `CodeMoteur`.
 * Personne ne recopie : si une ligne des specs change de verbe, ce fichier change d'exigence
 * au tour suivant. Et un moteur déclaré dans `CodeMoteur` mais absent de la table est signalé
 * comme tel, au lieu de disparaître en silence.
 *
 * ── LES DEUX CRITÈRES, ET D'OÙ VIENT CHACUN ──────────────────────────────────────────────
 *
 * Le § 4 Q6 dit : « échoue si un moteur dont les specs annoncent un GESTE ne porte aucun
 * gestionnaire de ce geste, **ou** ne monte aucune SCÈNE ».
 *
 *  A. **Le geste.** Le verbe de la table le nomme (« faire glisser », « cibles mobiles »,
 *     « remettre dans l'ordre »). On cherche le gestionnaire correspondant dans le SOURCE du
 *     moteur, **commentaires retirés** — règle 10 du § 5, et ce n'est pas une précaution :
 *     le premier recensement des gestes a compté un glisser sur `tri` en lisant la phrase de
 *     R16 qui dit qu'il n'y en a pas (§ 2.6, erreur n° 1).
 *
 *  B. **La scène.** Elle, se mesure sur le DOM RENDU, parce que c'est ce que l'enfant voit :
 *     une scène figurative monte un `<svg>` habité ; une rangée de boutons monte un conteneur
 *     `flex-wrap`. Aucune des deux propriétés n'est déductible du source sans se tromper.
 *
 * ── CE QUE Q6 NE FAIT PAS ────────────────────────────────────────────────────────────────
 *
 * Il ne juge pas si la scène est BELLE : le jugement esthétique appartient au père (D50, et
 * § 7 point 1 de la spec QA). Q6 vérifie qu'une scène est montée, jamais qu'elle est réussie.
 */
import { readFileSync, readdirSync } from 'node:fs';

import { expect, test } from '../harnais-serveur.js';

import { cheminDepot, entrerDansLeNoeud, lireTexte, noeudsLivres, preparer } from '../e2e/qa-outils.js';

import type { Page } from '@playwright/test';

// ═════════════════════════════════════════════════ la population, DÉRIVÉE des specs et du code

/** L'union `CodeMoteur` — la liste des moteurs qui DEVRAIENT être jouables. */
function moteursDeclares(): readonly string[] {
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(lireTexte('partage/src/identifiants.ts'));
  if (bloc === null) {
    throw new Error('Q6 : l’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts.');
  }
  return [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!);
}

interface PromesseDesSpecs {
  readonly moteur: string;
  readonly mecanique: string;
  readonly habillages: string;
}

/**
 * La table des moteurs des specs v2 § 5 — le document fait foi, le test le LIT.
 *
 * On accepte toute ligne de tableau markdown dont la première cellule est un code de moteur
 * entre accents graves. Rien n'est recopié.
 */
function promessesDesSpecs(): readonly PromesseDesSpecs[] {
  const specs = lireTexte('Docs/la-pierre-des-mots-specs-v2.md');
  const codes = new Set(moteursDeclares());
  const trouvees: PromesseDesSpecs[] = [];
  for (const ligne of specs.split('\n')) {
    const cellules = ligne.split('|').map((c) => c.trim());
    if (cellules.length < 4) continue;
    const code = /^`([a-z]+)`$/.exec(cellules[1] ?? '')?.[1];
    if (code === undefined || !codes.has(code)) continue;
    if (trouvees.some((p) => p.moteur === code)) continue;
    trouvees.push({ moteur: code, mecanique: cellules[2] ?? '', habillages: cellules[3] ?? '' });
  }
  if (trouvees.length === 0) {
    throw new Error(
      'Q6 : aucune ligne de moteur lue dans la table des specs v2 § 5. La population serait ' +
        'vide, donc le contrat serait vrai par vacuité — on refuse de continuer.',
    );
  }
  return trouvees;
}

// ═══════════════════════════════════════════ du VERBE des specs au GESTE que le code doit porter

/**
 * LA TRADUCTION — et c'est la seule chose de ce fichier qui soit écrite à la main.
 *
 * Elle est assumée : traduire « faire glisser » en « un gestionnaire de pointeur » demande de
 * connaître le vocabulaire des deux côtés, et aucune dérivation ne le fera. Ce qui reste
 * dérivé, et c'est l'essentiel : QUELS moteurs sont concernés, et QUELLE promesse chacun porte.
 * Une ligne de specs qui changerait de verbe changerait l'exigence sans qu'on touche ce fichier.
 *
 * Les motifs de preuve viennent des trois `grep` du § 2.5 de la spec QA, et de la recette
 * complète de `place` relevée en R34 : `PointerSensor` de dnd-kit, `activationConstraint`,
 * et `touch-action: none`.
 */
const GESTES: readonly {
  readonly nom: string;
  readonly promis: RegExp;
  readonly preuve: RegExp;
}[] = [
  {
    nom: 'glisser',
    promis: /glisser/i,
    preuve: /onDrag|onPointerDown|onPointerMove|dnd-kit|useDraggable|useDroppable|useSortable|draggable/,
  },
  {
    nom: 'cibles mobiles',
    promis: /mobiles?\b/i,
    preuve: /requestAnimationFrame|animationFrame|useAnimationFrame|keyframes|animate\(|motion\./,
  },
  {
    nom: 'réordonnancement',
    promis: /dans l['’]ordre|ordonner|remettre/i,
    preuve: /onDrag|dnd-kit|useSortable|onPointerDown|reordonner|deplacer/,
  },
];

/** Règle 10 du § 5 : les commentaires citent souvent précisément ce qui est absent. */
const sansCommentaires = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/** Le source du moteur côté client, commentaires retirés. */
function sourceDuMoteur(code: string, fabriquee?: string): string {
  if (fabriquee !== undefined) return sansCommentaires(fabriquee);
  const dossier = cheminDepot(`client/src/moteurs/${code}`);
  let entier = '';
  for (const fichier of readdirSync(dossier)) {
    if (!/\.tsx?$/.test(fichier)) continue;
    entier += `\n${sansCommentaires(readFileSync(`${dossier}/${fichier}`, 'utf8'))}`;
  }
  if (entier.trim() === '') {
    throw new Error(`Q6 : aucun source lu pour le moteur « ${code} ».`);
  }
  return entier;
}

/** Les gestes promis par les specs à ce moteur, et qui manquent au code. */
function gestesManquants(promesse: PromesseDesSpecs, sourceFabriquee?: string): readonly string[] {
  const texte = `${promesse.mecanique} ${promesse.habillages}`;
  const source = sourceDuMoteur(promesse.moteur, sourceFabriquee);
  return GESTES.filter((g) => g.promis.test(texte) && !g.preuve.test(source)).map((g) => g.nom);
}

// ══════════════════════════════════════════════════════════ la scène, mesurée sur le DOM rendu

interface RenduMesure {
  readonly svgHabites: number;
  readonly rangeesDeBoutons: number;
  readonly prises: number;
}

/**
 * Ce que le moteur MONTE réellement.
 *
 * `svgHabites` : un `<svg>` d'au moins quatre éléments graphiques — c'est ce qui distingue une
 * scène d'une icône. `rangeesDeBoutons` : un conteneur qui met ses enfants en `flex-wrap`,
 * c'est-à-dire la rangée de boutons de R36.
 */
async function mesurerLeRendu(page: Page, selecteur = '[data-moteur]'): Promise<RenduMesure> {
  return page.evaluate((ou) => {
    const hote = document.querySelector(ou) ?? document.body;
    let svgHabites = 0;
    for (const svg of hote.querySelectorAll('svg')) {
      if (svg.querySelectorAll('path, circle, rect, polygon, polyline, ellipse, image, g').length >= 4) {
        svgHabites += 1;
      }
    }
    let rangeesDeBoutons = 0;
    for (const noeud of hote.querySelectorAll('*')) {
      const style = getComputedStyle(noeud);
      if (style.display === 'flex' && style.flexWrap === 'wrap' && noeud.children.length >= 3) {
        rangeesDeBoutons += 1;
      }
    }
    return {
      svgHabites,
      rangeesDeBoutons,
      prises: hote.querySelectorAll('button, [role="button"]').length,
    };
  }, selecteur);
}

const PROMESSES = promessesDesSpecs();
const NOEUDS = noeudsLivres();

/** Le premier nœud livré qui emploie ce moteur. Aucun identifiant n'est écrit en dur. */
const premierNoeud = (code: string): string | null =>
  NOEUDS.find((n) => n.moteur === code)?.id ?? null;

test.describe('Q6 — chaque moteur rend ce que les specs lui promettent', () => {
  test('la population est LUE dans les specs, et croisée avec `CodeMoteur`', () => {
    const declares = moteursDeclares();
    expect(
      PROMESSES.length,
      'la table des moteurs des specs v2 § 5 ne rend plus aucune ligne',
    ).toBeGreaterThanOrEqual(10);
    const sansPromesse = declares.filter((c) => !PROMESSES.some((p) => p.moteur === c));
    console.log(
      `[Q6] population : ${String(declares.length)} moteurs déclarés par \`CodeMoteur\`, ` +
        `${String(PROMESSES.length)} portés par la table des specs v2 § 5.`,
    );
    for (const orphelin of sansPromesse) {
      console.log(
        `[Q6] observation — « ${orphelin} » est déclaré par \`CodeMoteur\` et ABSENT de la ` +
          'table des specs § 5 : aucune promesse à confronter. Les specs ne se modifient pas ' +
          'sans validation (CLAUDE.md) — à signaler, pas à corriger ici.',
      );
    }
  });

  test('CONTRÔLE POSITIF — un moteur FABRIQUÉ sans scène est signalé, un autre avec scène ne l’est pas', async ({
    page,
  }) => {
    // ── POURQUOI UN TÉMOIN FABRIQUÉ, ET PLUS `chemin` ──────────────────────────────────────
    //
    // L'ancien contrôle exigeait que `chemin` soit signalé « aujourd'hui » : 0 svg habité,
    // une rangée de boutons, la promesse « sauts de nénuphars » non tenue. **Le plateau a été
    // livré cette nuit**, et le contrôle est tombé — ce fichier l'annonçait : « soit C2 a livré
    // le plateau, alors ce contrôle est à remplacer ».
    //
    // C'est la quatrième fois de la campagne qu'un contrôle ancré sur un défaut RÉEL meurt de
    // sa réparation (Q1, Q2, Q4, puis celui-ci). On fabrique donc les deux cas — une rangée de
    // boutons sans scène, et une scène habitée — et on les mesure comme n'importe quel moteur.
    // Il en reste à réparer ; ce contrôle-ci ne mourra pas avec eux.
    await preparer(page);
    await entrerDansLeNoeud(page, premierNoeud(PROMESSES[0]!.moteur)!);

    await page.evaluate(() => {
      const sansScene = document.createElement('div');
      sansScene.setAttribute('data-qa-temoin', 'sans-scene');
      // La rangée est un DESCENDANT de l'hôte, pas l'hôte lui-même : `mesurerLeRendu` balaie
      // `hote.querySelectorAll('*')`, donc un hôte qui serait sa propre rangée passerait
      // inaperçu. Le témoin doit reproduire la forme réelle — un moteur qui CONTIENT sa rangée.
      const rangee = document.createElement('div');
      rangee.style.cssText = 'display:flex;flex-wrap:wrap';
      for (let rang = 0; rang < 4; rang += 1) {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.textContent = `mot ${String(rang)}`;
        rangee.append(bouton);
      }
      sansScene.append(rangee);
      const avecScene = document.createElement('div');
      avecScene.setAttribute('data-qa-temoin', 'avec-scene');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (let rang = 0; rang < 5; rang += 1) {
        svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      }
      avecScene.append(svg);
      document.body.append(sansScene, avecScene);
    });

    const sansScene = await mesurerLeRendu(page, '[data-qa-temoin="sans-scene"]');
    const avecScene = await mesurerLeRendu(page, '[data-qa-temoin="avec-scene"]');
    const reelAvant = await mesurerLeRendu(page);

    await page.evaluate(() => {
      for (const temoin of document.querySelectorAll('[data-qa-temoin]')) temoin.remove();
    });
    const reelApres = await mesurerLeRendu(page);

    console.log(
      `[Q6] contrôle positif — témoin SANS scène : ${String(sansScene.svgHabites)} svg, ` +
        `${String(sansScene.rangeesDeBoutons)} rangée(s) · témoin AVEC scène : ` +
        `${String(avecScene.svgHabites)} svg`,
    );
    expect(
      sansScene.svgHabites,
      'une rangée de boutons sans le moindre `<svg>` est comptée comme une scène : la mesure ' +
        'ne distingue plus rien, et tout vert de ce fichier serait sans valeur.',
    ).toBe(0);
    expect(
      sansScene.rangeesDeBoutons,
      'la rangée `flex-wrap` fabriquée n’est pas vue : c’est pourtant la signature exacte de R36',
    ).toBeGreaterThanOrEqual(1);
    expect(
      avecScene.svgHabites,
      'un `<svg>` de cinq formes n’est pas compté comme une scène : la mesure accuserait alors ' +
        'les quatorze moteurs, et un rapport de faux positifs ne se lit pas.',
    ).toBeGreaterThanOrEqual(1);
    expect(
      reelApres,
      'les témoins fabriqués ont changé la mesure réelle : la mesure laisse sa propre trace.',
    ).toEqual(reelAvant);

    // ── ET LE VOLET STATIQUE, fabriqué lui aussi ───────────────────────────────────────────
    const promesseFabriquee = {
      moteur: PROMESSES[0]!.moteur,
      mecanique: 'Faire glisser des blocs pour former un mot',
      habillages: 'un ponton',
    };
    const sansGeste = gestesManquants(promesseFabriquee, 'export function Faux() { return null; }');
    const avecGeste = gestesManquants(promesseFabriquee, 'onPointerDown={() => {}} useDraggable()');
    console.log(
      `[Q6] contrôle positif — promesse « glisser » : source muette → ${sansGeste.join(',') || '—'} · ` +
        `source gesticulante → ${avecGeste.join(',') || '—'}`,
    );
    expect(
      sansGeste,
      'une promesse « faire glisser » confrontée à un source qui ne porte aucun gestionnaire ' +
        'ne rend rien : le volet statique est aveugle.',
    ).toContain('glisser');
    expect(
      avecGeste,
      'un source qui porte `onPointerDown` et `useDraggable` est quand même accusé de ne pas ' +
        'savoir glisser : le volet statique accuse à tort.',
    ).not.toContain('glisser');
  });

  for (const promesse of PROMESSES) {
    const noeud = premierNoeud(promesse.moteur);
    if (noeud === null) continue;
    test(`« ${promesse.moteur} » rend ce que les specs lui promettent`, async ({ page }) => {
      await preparer(page);
      await entrerDansLeNoeud(page, noeud);
      const rendu = await mesurerLeRendu(page);
      const manquants = gestesManquants(promesse);

      const griefs: string[] = [];
      if (manquants.length > 0) {
        griefs.push(
          `les specs annoncent « ${promesse.mecanique} » et le moteur ne porte aucun ` +
            `gestionnaire de : ${manquants.join(', ')}`,
        );
      }
      if (rendu.svgHabites === 0) {
        griefs.push(
          `aucune scène montée (0 svg habité, ${String(rendu.rangeesDeBoutons)} rangée(s) ` +
            `flex-wrap) alors que les specs promettent « ${promesse.habillages} »`,
        );
      }
      console.log(
        `[Q6] ${griefs.length === 0 ? ' ' : '⚠'} ${promesse.moteur.padEnd(10)} ` +
          `svg habités ${String(rendu.svgHabites)} · flex-wrap ${String(rendu.rangeesDeBoutons)} · ` +
          `gestes manquants ${manquants.length === 0 ? '—' : manquants.join('+')}`,
      );

      expect(
        griefs,
        `« ${promesse.moteur} » — ce que l'enfant voit ne correspond pas à ce que le document ` +
          'de conception annonce. Ce n’est pas un défaut esthétique : R36 a montré qu’une ' +
          'mécanique non dessinée est prise pour une règle incomprise par l’enfant.',
      ).toEqual([]);
    });
  }
});
