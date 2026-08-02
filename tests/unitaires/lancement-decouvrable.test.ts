/**
 * REPRODUCTION DU DÉFAUT n° 6 — « il y a un .bat pour arrêter, mais pas pour tout lancer ».
 *
 * `demarrer.bat` EXISTE, à la racine du dépôt : c'est le premier fait à établir, et le
 * premier cas ci-dessous le mesure. Le défaut n'est donc pas une absence, c'est une
 * INVISIBILITÉ. Trois mesures l'expliquent, et chacune est un cas de ce fichier :
 *
 *   1. **Dans l'Explorateur Windows, trié de A à Z, le premier `.bat` que l'œil rencontre est
 *      `arreter.bat`.** « arreter » précède « demarrer ». Le fichier qui arrête se présente
 *      avant celui qui lance.
 *
 *   2. **`arreter.bat` ne dit jamais comment relancer.** Ses deux chemins normaux — « Rien a
 *      arreter » et « Serveur arrete » — ne nomment pas `demarrer.bat`. Seule une branche
 *      d'erreur (`:pid_illisible`, atteinte quand le fichier PID est corrompu) le mentionne.
 *      L'utilisateur qui a trouvé le script d'arrêt n'apprend rien du script de lancement.
 *
 *   3. **Le README parle de la ligne de commande avant de parler du double-clic.** La première
 *      section est « Installer, en trois commandes » (`git clone`, `cd`, `npm ci`) ;
 *      `demarrer.bat` n'apparaît qu'après.
 *
 * Ce fichier ne modifie ni les `.bat` ni le README. Il mesure, et il échoue.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireTexte } from '../configuration/preparation.js';

const LANCEUR = 'demarrer.bat';

/** Les `.bat` de la racine, dans l'ordre où l'Explorateur Windows les affiche. */
const batsRacine = readdirSync(RACINE_DEPOT)
  .filter((f) => f.toLowerCase().endsWith('.bat'))
  .sort((a, b) => a.localeCompare(b, 'fr'));

const readme = lireTexte('README.md').split(/\r?\n/u);
const arreter = lireTexte('arreter.bat');

describe('le fichier qui lance le jeu existe — c’est le fait de base', () => {
  it('`demarrer.bat` est bien à la racine du dépôt', () => {
    expect(existsSync(join(RACINE_DEPOT, LANCEUR)), `racine : ${batsRacine.join(', ')}`).toBe(true);
  });
});

describe('…et il se trouve sans qu’on l’explique', () => {
  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * CE CAS A ÉTÉ REMPLACÉ À L'INTÉGRATION — et c'est un test qui contredisait un contrat.
   *
   * Il exigeait `batsRacine[0] === 'demarrer.bat'`, c'est-à-dire que le lanceur soit le premier
   * `.bat` de la racine dans l'ordre alphabétique. Mesuré :
   *
   *     bats racine triés fr : arreter.bat < demarrer.bat < verifier.bat
   *     localeCompare('arreter.bat', 'demarrer.bat', 'fr') = -1
   *
   * **L'assertion est insatisfiable**, et pas seulement difficile :
   *
   *  1. elle se contredit elle-même. La ligne 37 de ce fichier fait `lireTexte('arreter.bat')` :
   *     le fichier DOIT exister sous ce nom pour que le cas suivant s'exécute. Or « aucun .bat
   *     ne précède `demarrer.bat` » exige justement qu'`arreter.bat` n'existe plus. Les deux
   *     exigences ne peuvent pas être vraies ensemble.
   *
   *  2. le seul remède — renommer `arreter.bat` — est INTERDIT par des documents gelés :
   *       Docs/contrat-technique-v1.md:55        « | `arreter.bat` | L-A | Arrête le processus… »
   *       Docs/la-pierre-des-mots-specs-v2.md:385 « `arreter.bat` et `sauvegarder.bat`… »
   *     Le second est l'un des quatre documents de référence, que CLAUDE.md interdit de
   *     modifier sans validation. Renommer le fichier rendrait faux un document de référence
   *     que je n'ai pas le droit de corriger.
   *
   * L'intention, elle, reste entière : **le parent doit trouver comment lancer le jeu sans
   * qu'on le lui explique.** La primauté alphabétique n'en était qu'un proxy parmi d'autres.
   * On la remplace donc par une garantie SATISFIABLE et STRICTEMENT PLUS FORTE que l'ancien
   * cas n° 2 : *tout* `.bat` de la racine qui n'est pas le lanceur doit nommer le lanceur dans
   * ce qu'il affiche. L'ancien cas ne l'exigeait que d'`arreter.bat` ; celui-ci l'exige aussi
   * de `verifier.bat`, et de tout `.bat` ajouté demain.
   *
   * Arbitrage consigné dans `Docs/questions-en-attente.md`. Si le père préfère malgré tout le
   * renommage, il coûte une ligne — mais il lui appartient, parce qu'il touche à ses documents.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  it('tout `.bat` de la racine autre que le lanceur nomme le lanceur', () => {
    const autres = batsRacine.filter((f) => f !== LANCEUR);
    // Sans ce plancher, un dépôt qui perdrait ses `.bat` rendrait le cas vert par vacuité.
    expect(autres.length, `bats de la racine : ${batsRacine.join(', ')}`).toBeGreaterThanOrEqual(2);

    const muets = autres.filter((fichier) => !lireTexte(fichier).includes(LANCEUR));
    expect(
      muets,
      `ces .bat de la racine ne nomment jamais ${LANCEUR} : le parent qui les ouvre en ` +
        `premier n'apprend pas comment lancer le jeu`,
    ).toEqual([]);
  });

  it('`arreter.bat` nomme `demarrer.bat` sur chacun de ses chemins visibles', () => {
    // On découpe le script par étiquettes et on ne garde que les blocs qui PARLENT
    // (`echo`) : un `rem` n'est jamais affiché à l'écran, il ne compte pas.
    const blocs = arreter.split(/^:(?=[a-z_]+\s*$)/mu);
    const parlants = blocs
      .map((bloc, i) => ({
        nom: i === 0 ? '(entrée)' : (/^([a-z_]+)/u.exec(bloc)?.[1] ?? '?'),
        echos: bloc
          .split(/\r?\n/u)
          .filter((l) => /^\s*echo\b/iu.test(l))
          .join('\n'),
      }))
      .filter((b) => b.echos.trim().length > 0);

    const muets = parlants.filter((b) => !b.echos.includes(LANCEUR)).map((b) => b.nom);

    expect(
      muets,
      `blocs qui affichent un message sans jamais nommer ${LANCEUR}`,
    ).toEqual([]);
  });

  it('le README nomme `demarrer.bat` avant sa première ligne de commande', () => {
    const ligneLanceur = readme.findIndex((l) => l.includes(LANCEUR));
    const ligneCommande = readme.findIndex((l) => /^\s*(git clone|npm ci|npm install)\b/u.test(l));

    expect(ligneLanceur, `${LANCEUR} est absent du README`).toBeGreaterThanOrEqual(0);
    expect(ligneCommande, 'aucune ligne de commande dans le README').toBeGreaterThanOrEqual(0);
    expect(
      ligneLanceur,
      `${LANCEUR} ligne ${String(ligneLanceur + 1)}, première commande ligne ${String(
        ligneCommande + 1,
      )}`,
    ).toBeLessThan(ligneCommande);
  });
});
