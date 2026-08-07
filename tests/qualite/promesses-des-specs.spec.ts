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
function sourceDuMoteur(code: string): string {
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
function gestesManquants(promesse: PromesseDesSpecs): readonly string[] {
  const texte = `${promesse.mecanique} ${promesse.habillages}`;
  const source = sourceDuMoteur(promesse.moteur);
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
async function mesurerLeRendu(page: Page): Promise<RenduMesure> {
  return page.evaluate(() => {
    const hote = document.querySelector('[data-moteur]') ?? document.body;
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
  });
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

  test('CONTRÔLE POSITIF — `chemin` est signalé aujourd’hui', async ({ page }) => {
    // Le contrôle exigé par le § 4 Q6 : « sauts de nénuphars » contre une rangée de boutons.
    // Le jour où C2 dessinera le plateau, ce cas échouera — et il faudra alors le remplacer
    // par un témoin vivant. Un contrôle positif qui ne mord plus est un instrument aveugle.
    const promesse = PROMESSES.find((p) => p.moteur === 'chemin');
    expect(promesse, '`chemin` a disparu de la table des specs § 5').toBeDefined();
    const noeud = premierNoeud('chemin');
    expect(noeud, 'aucun nœud livré n’emploie `chemin`').not.toBeNull();

    await preparer(page);
    await entrerDansLeNoeud(page, noeud!);
    const rendu = await mesurerLeRendu(page);
    console.log(
      `[Q6] contrôle positif — chemin : ${String(rendu.svgHabites)} svg habité(s), ` +
        `${String(rendu.rangeesDeBoutons)} rangée(s) flex-wrap, ${String(rendu.prises)} prises.`,
    );
    expect(
      rendu.svgHabites,
      'Q6 ne retrouve plus le défaut de référence : `chemin` monterait désormais une scène. ' +
        'Soit C2 a livré le plateau — alors ce contrôle est à remplacer —, soit la mesure de ' +
        'la scène est devenue aveugle.',
    ).toBe(0);
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
