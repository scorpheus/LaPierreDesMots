/**
 * TOUT TIENT DANS L'ÉCRAN DE LA TABLETTE — R20, et le garde qui l'empêche de revenir.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « sur une tablette il y a largement de la place et il y a besoin de scroller alors qu'il n'y a
 * pas besoin, et clairement c'est pas bien placé. »
 *
 * MESURÉ AVANT DE TOUCHER À QUOI QUE CE SOIT, sur la résolution réelle de la cible :
 *
 *     7 écrans sur 20 obligent à faire défiler
 *     carte · campement · coffre · ouverture · reglages-lecture   →  76 px  (chiffre CONSTANT)
 *     noeud:place                                                 → 470 px
 *     noeud:colorie                                               → 873 px
 *
 * Le 76 revenant cinq fois désignait une cause partagée : les scènes se dimensionnent par leur
 * LARGEUR et laissent leur hauteur suivre le rapport d'aspect du `viewBox`, sans jamais regarder
 * la hauteur disponible.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * ⚠ LE PIÈGE QUE CE FICHIER GARDE, ET QUI EST PLUS IMPORTANT QUE LA RÈGLE ELLE-MÊME
 *
 * Mon premier correctif posait `overflow: hidden` sur l'écran. Le débordement mesuré est tombé à
 * zéro — **parce que `scrollHeight` devient `clientHeight`, que le contenu tienne ou qu'il soit
 * COUPÉ.** La mesure était devenue creuse, et j'allais annoncer « 0 débordement » sur un jeu
 * cassé.
 *
 * La sonde a donc été renforcée pour compter les COMMANDES hors du cadre, et elle a
 * immédiatement trouvé dix cibles coupées : « le pot de couleur », « Colorier en rouge », « un
 * ballon »… **Un bouton coupé est pire qu'un bouton qu'on atteint en faisant défiler** : le
 * premier est introuvable, le second est seulement pénible.
 *
 * Les DEUX assertions sont donc indissociables. Une seule des deux se satisferait d'un jeu
 * inutilisable.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE FICHIER N'ÉCRIT AUCUNE LISTE D'ÉCRANS
 *
 * Une liste écrite ici serait un SECOND inventaire, à côté de celui que la QA a11y utilise déjà,
 * et deux inventaires dérivent toujours l'un de l'autre. On reprend donc les deux recensements
 * du dépôt — `recettesDEcrans()` pour les écrans, `noeudsLivres()` pour les moteurs, tous deux
 * lus depuis `contenu/` — et un écran ou un moteur ajouté demain entre dans ce garde TOUT SEUL,
 * sans que personne ait à s'en souvenir.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas. C’est aussi lui qui sert
// `client/dist-test/`, la seule construction qui embarque `window.__test`.
import { expect, test } from '../harnais-serveur.js';

import { noeudsLivres, recettesDEcrans } from '../e2e/qa-outils.js';

import type { Page } from '@playwright/test';

/** 87 recettes : les 11 écrans écrits à la main, plus UNE PAR NŒUD LIVRÉ — les 14 moteurs. */
const ECRANS = recettesDEcrans();

/** Les moteurs couverts, pour le contrat de sortie. */
const MOTEURS = [...new Set(noeudsLivres().map((noeud) => noeud.moteur))].sort();

/**
 * ── LA SEULE EXEMPTION, ET ELLE EST UNE DETTE, PAS UN PARDON ──────────────────────────────────
 *
 * « il y a besoin de scroller alors qu'il n'y a pas besoin » parle du JEU, sur la tablette de
 * l'enfant. La zone parent est une console d'administration que le père ouvre au clavier : son
 * dashboard liste TOUS les brouillons à valider, sa galerie TOUS les assets produits. Ces deux
 * listes sont non bornées par nature — exiger qu'elles tiennent dans 1 200 px reviendrait à
 * exiger qu'il n'y ait jamais plus de six brouillons.
 *
 * Appliquer la règle de l'enfant à ces deux écrans-là la rendrait creuse. Les exempter du
 * DÉFILEMENT ne les exempte de rien d'autre : le second grief — une commande hors d'atteinte —
 * leur reste opposable, et c'est celui qui compte, parce qu'un bouton qu'aucun défilement ne
 * rejoint est introuvable partout, y compris chez le parent.
 *
 * Tout le reste de la zone parent — le pavé de code, le choix du joueur — doit tenir : ce sont
 * des écrans bornés, et rien ne justifierait qu'ils débordent.
 */
const DEFILEMENT_TOLERE = new Set(['dashboard', 'galerie-parent']);

/**
 * ── LA DETTE, CHIFFRÉE, DATÉE, ET QUI NE PEUT QUE DÉCROÎTRE ───────────────────────────────────
 *
 * ── LE CAMPEMENT EST SORTI DE CETTE TABLE, ET C'EST LA DÉMONSTRATION DU PROCÉDÉ ───────────────
 *
 * Il y est entré le 2026-08-03 à **378 px**, avec cette conclusion : « aucun assemblage ne
 * descend sous 1 578 px ; les 378 restants demandent de retirer ou de déplacer du contenu, et
 * cet arbitrage appartient au père. » Le balayage avait essayé 1, 2, 3 et 4 colonnes, le décor
 * borné et le décor pleine largeur.
 *
 * Le père a rendu l'arbitrage le jour même, et pas du tout où je l'attendais : « Dans le coffre,
 * il y a aussi les Gobi. Je pense qu'il faut les laisser dans le coffre, ça sert à rien de les
 * mettre dans le campement. » L'étagère occupait 298 px plus son gap. **Mesure après retrait :
 * 0 px de débordement.** La dette est éteinte, sa ligne est donc supprimée — une dette qu'on
 * garderait « par prudence » après l'avoir soldée est un mensonge de plus dans le contrat.
 *
 * Ce qu'il faut en retenir : la dette n'était pas un défaut de mise en page, et je l'avais écrit.
 * C'était un défaut de CONTENU — un panneau au mauvais endroit — et c'est le joueur qui l'a vu.
 * Chiffrer la dette au lieu de l'exempter en silence est ce qui a rendu son extinction visible.
 *
 * ⚠ CE QUI RESTE N'EST PAS UNE ASSERTION ASSOUPLIE, C'EST UN CLIQUET. La valeur exacte est
 * opposable : si l'écran grandit d'un pixel, ce garde échoue. Elle ne peut que descendre, et
 * elle doit descendre à zéro. La ligne disparaît le jour où la cause est levée.
 */
const DETTE_MESUREE = new Map([
  /**
   * `colorie` — LA DETTE QUE R16 IMPOSE, ET QUI EST LA BONNE DÉCISION
   *
   * Borner la scène de `colorie` la faisait tenir. Elle rétrécissait alors dans les DEUX
   * dimensions, et 21 régions passaient sous les 64 px des specs — « le tronc du premier
   * arbre » 31 × 91, « l'horloge de l'école » 47 × 47. Dix-huit recettes de la QA des
   * invariants ont rougi ; vérifié en remisant le lot, elles passaient avant.
   *
   * Ramener un tronc de 31 px à 64 demanderait une scène 2,06 fois plus grande, soit près de
   * 2 500 px de haut sur une tablette qui en offre 1 200. **Aucune mise en page ne peut
   * satisfaire les deux.** « Cibles ≥ 64 px, aucune coordination fine exigée » est une règle
   * non négociable des specs ; « rien ne défile » est un retour de jeu. La règle l'emporte.
   *
   * Ce qui éteindra cette dette n'est pas du CSS mais un ASSET dont les régions coloriables
   * sont plus généreuses. Par nœud : clairière-01 560 · forêt-muette-08 668 · clairière-10 685
   * · marais-jumeau-08 730 · cité-des-histoires-10 730 · volcan-08 730.
   */
  ['colorie', 730]
]);

interface Debordement {
  /** Il faut faire défiler pour tout voir. Interdit dans le jeu, toléré sur deux écrans parent. */
  readonly vertical: number;
  readonly horizontal: number;
  /**
   * Les commandes qu'AUCUN défilement ne rejoint — hors de l'étendue défilable elle-même.
   * Interdit PARTOUT, sans exception : un bouton hors d'atteinte est introuvable.
   */
  readonly horsDAtteinte: readonly string[];
}

/**
 * Le débordement ET les commandes coupées. Les deux, toujours : voir l'encadré en tête.
 *
 * ⚠ La fonction se passe TELLE QUELLE, jamais sous forme de chaîne. Ma première version la
 * factorisait dans une constante `string` : `page.evaluate` a alors évalué l'expression — une
 * fonction fléchée — sans jamais l'APPELER, et a rendu `undefined`. Les sept cas ont échoué d'un
 * coup, contrôle positif compris, ce qui a immédiatement désigné le harnais et non la mise en
 * page. Un contrôle positif gagne ses frais dès sa première exécution.
 */
async function mesurer(page: Page): Promise<Debordement> {
  // Attendre des ÉTATS, jamais une durée (annexe T § 6) : le décor et les polices arrivent de
  // façon asynchrone, et mesurer avant eux mesurerait une page à moitié montée. C'est
  // exactement ce qui manquait à ma première version du garde — elle accusait la carte de
  // couper « Partir vers La Clairière » alors que la carte n'avait pas fini d'arriver.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  return page.evaluate(() => {
    const racine = document.documentElement;
    const nom = (element: Element): string =>
      (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40);

    // ── GRIEF 1 : « IL FAUT DÉFILER » ──────────────────────────────────────────────────────
    //
    // On interroge TOUT conteneur qui peut défiler, pas seulement le document. Depuis que
    // `[data-ecran]` porte `overflow: auto`, c'est LUI qui défile quand ça dépasse, et le
    // document reste à sa taille : une mesure qui ne regarderait que `documentElement`
    // rendrait 0 en croyant bien faire. Le père parle de « scroller », peu lui importe quel
    // élément du DOM porte la barre.
    const defilables = [racine, ...document.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element);
      const peutDefilerY = style.overflowY === 'auto' || style.overflowY === 'scroll';
      const peutDefilerX = style.overflowX === 'auto' || style.overflowX === 'scroll';
      return (
        (peutDefilerY && element.scrollHeight > element.clientHeight + 1) ||
        (peutDefilerX && element.scrollWidth > element.clientWidth + 1)
      );
    });
    const vertical = Math.max(
      0,
      ...defilables.map((element) => element.scrollHeight - element.clientHeight),
      racine.scrollHeight - racine.clientHeight
    );
    const horizontal = Math.max(
      0,
      ...defilables.map((element) => element.scrollWidth - element.clientWidth),
      racine.scrollWidth - racine.clientWidth
    );

    // ── GRIEF 2 : « C'EST HORS D'ATTEINTE » ────────────────────────────────────────────────
    //
    // Hors du cadre ≠ hors d'atteinte, et c'est toute la différence. On ne le déduit pas d'un
    // calcul de boîtes — un conteneur imbriqué le rendrait faux — on le CONSTATE : on demande
    // au navigateur d'amener la commande à l'écran, et on regarde si elle y arrive. Sous un
    // `overflow: hidden`, elle n'y arrive pas ; sous un `auto`, elle y arrive.
    //
    // C'est ce grief-là qui a attrapé mon propre correctif : `hidden` affichait « 0 px de
    // débordement » sur trois écrans dont les commandes étaient coupées pour de bon.
    // ⚠ SURTOUT PAS `scrollIntoView` — L'INSTRUMENT MASQUAIT LE DÉFAUT
    //
    // J'ai d'abord CONSTATÉ l'atteignabilité : amener la commande à l'écran, regarder si elle
    // y arrive. Le contrôle positif juste au-dessus l'a réfuté en une exécution. La raison est
    // nette et vaut d'être retenue : **`overflow: hidden` empêche l'utilisateur de défiler,
    // pas le script.** `scrollTop` reste réglable, donc `scrollIntoView` traverse joyeusement
    // la cage qui rogne — et rend « atteignable » exactement ce qui ne l'est pas.
    //
    // On mesure donc la GÉOMÉTRIE, sans rien déplacer : une commande est hors d'atteinte quand
    // un ancêtre qui ROGNE (`hidden` ou `clip`, ceux que le doigt ne peut pas faire défiler) la
    // laisse entièrement en dehors de sa propre boîte. Un ancêtre en `auto` ou `scroll` ne
    // compte pas : là, le doigt y arrive.
    const ROGNE = new Set(['hidden', 'clip']);
    const horsDAtteinte: string[] = [];
    for (const element of document.querySelectorAll('button, [role="button"], a, input')) {
      const boite = element.getBoundingClientRect();
      if (boite.width === 0 && boite.height === 0) continue;
      let perdue = false;
      for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const cadre = parent.getBoundingClientRect();
        if (ROGNE.has(style.overflowY) && (boite.top >= cadre.bottom - 1 || boite.bottom <= cadre.top + 1)) {
          perdue = true;
          break;
        }
        if (ROGNE.has(style.overflowX) && (boite.left >= cadre.right - 1 || boite.right <= cadre.left + 1)) {
          perdue = true;
          break;
        }
      }
      // La remontée inclut `<html>` : si c'est LUI qui rogne, le cas est couvert par la même
      // boucle. Aucune clause supplémentaire n'est nécessaire — et une clause de plus serait
      // une occasion de plus de se tromper.
      if (perdue) horsDAtteinte.push(nom(element));
    }

    return { vertical, horizontal, horsDAtteinte };
  });
}

async function exiger(nom: string, ecran: string, page: Page): Promise<void> {
  const mesure = await mesurer(page);

  // Opposable PARTOUT, y compris sur les deux écrans parent : aucun défilement ne les rejoint.
  expect(
    mesure.horsDAtteinte,
    `${nom} : des commandes sont HORS D’ATTEINTE — aucun défilement ne les rejoint, ` +
      'elles sont introuvables'
  ).toEqual([]);

  if (DEFILEMENT_TOLERE.has(ecran)) return;

  const dette = DETTE_MESUREE.get(ecran);
  if (dette !== undefined) {
    // Un CLIQUET, jamais un pardon : la dette ne peut que descendre. Voir son encadré.
    expect(
      mesure.vertical,
      `${nom} : la dette R20 était de ${String(dette)} px et vaut maintenant ` +
        `${String(mesure.vertical)} px. Elle ne doit JAMAIS grandir — et le jour où elle ` +
        'atteint 0, retirer la ligne de `DETTE_MESUREE`.'
    ).toBeLessThanOrEqual(dette);
    return;
  }

  expect(
    mesure.vertical,
    `${nom} oblige à faire défiler de ${String(mesure.vertical)} px — ` +
      'sur la tablette il y a la place, et un enfant de 7 ans qui défile perd le fil'
  ).toBe(0);
  expect(
    mesure.horizontal,
    `${nom} déborde de ${String(mesure.horizontal)} px sur le côté`
  ).toBe(0);
}

test.describe('R20 — rien ne dépasse sur la tablette', () => {
  test('CONTRÔLE POSITIF — la mesure sait rendre un débordement non nul', async ({ page }) => {
    // Sans ce cas, une sonde cassée rendrait 0 partout et tout ce fichier serait vert en ne
    // mesurant rien. On fabrique un débordement volontaire et on exige de le VOIR. Il a déjà
    // servi : c'est lui qui a désigné le harnais quand `page.evaluate` rendait `undefined`.
    await page.goto('/');
    await page.evaluate(() => {
      const temoin = document.createElement('div');
      temoin.id = 'temoin-debordement';
      temoin.style.cssText = 'block-size: 3000px';
      document.body.append(temoin);
    });
    const avec = await mesurer(page);
    expect(avec.vertical, 'la sonde ne voit pas un débordement de 3 000 px').toBeGreaterThan(1000);
  });

  test('CONTRÔLE POSITIF — la mesure sait voir une commande hors d’atteinte', async ({ page }) => {
    // Le second grief a besoin de son propre contrôle, et il l'a gagné : sa définition a dû
    // changer en cours de route. Elle exigeait d'abord que la commande TIENNE ENTIÈREMENT dans
    // le cadre, ce qui accusait « la brume du haut » — une région de coloriage plus grande que
    // l'écran, qu'aucun défilement ne pourra jamais y faire tenir. Elle mesure désormais
    // l'intersection visible. Sans ce cas, rien ne prouverait qu'elle sait encore échouer.
    await page.goto('/');
    await page.evaluate(() => {
      const cage = document.createElement('div');
      cage.id = 'temoin-hors-atteinte';
      // Exactement le piège corrigé dans `global.css` : un contenu plus haut que sa cage, et
      // une cage qui le rogne au lieu de le laisser défiler.
      cage.style.cssText = 'position: fixed; inset: 0; overflow: hidden';
      const dedans = document.createElement('div');
      dedans.style.cssText = 'block-size: 4000px; position: relative';
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.textContent = 'Bouton introuvable';
      bouton.style.cssText = 'position: absolute; inset-block-start: 3500px';
      dedans.append(bouton);
      cage.append(dedans);
      document.body.append(cage);
    });
    const avec = await mesurer(page);
    expect(
      avec.horsDAtteinte,
      'la sonde ne voit pas un bouton rogné par un `overflow: hidden` — ' +
        'c’est exactement le défaut qu’elle existe pour attraper'
    ).toContain('Bouton introuvable');
  });

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » tient entièrement dans l’écran`, async ({ page }) => {
      await ecran.aller(page);
      // On VÉRIFIE qu'on est arrivé : mesurer une page qui n'est pas celle qu'on croit rendrait
      // « 0 px de débordement » pour la pire des raisons.
      await expect(
        page.locator(`[data-ecran="${ecran.attendu}"]`),
        `la recette « ${ecran.nom} » devait mener à data-ecran="${ecran.attendu}"`
      ).toBeVisible();
      // Pour un nœud, la clé est le MOTEUR et non `data-ecran` : les 76 recettes de nœud
      // portent toutes `attendu === 'noeud'`, et une dette inscrite sous cette clé
      // dispenserait les quatorze moteurs d'un coup. La mise en page se joue par moteur.
      const cle = /moteur (\w+)/u.exec(ecran.nom)?.[1] ?? ecran.attendu;
      await exiger(ecran.nom, cle, page);
    });
  }

  /** CONTRAT DE SORTIE — un garde qui ne dit pas ce qu'il a couvert ne prouve rien. */
  test('CONTRAT DE SORTIE : les écrans et les moteurs gardés, nommés', () => {
    console.log(
      `[R20] ${String(ECRANS.length)} écran(s) gardé(s) · ${String(MOTEURS.length)} moteur(s) : ` +
        MOTEURS.join(', ') +
        ` · défilement toléré sur ${[...DEFILEMENT_TOLERE].join(' et ')}` +
        ` · dette restante : ${[...DETTE_MESUREE]
          .map(([ecran, px]) => `${ecran} ${String(px)} px`)
          .join(', ')}`
    );
    expect(ECRANS.length, 'l’inventaire des écrans est vide : rien n’aurait été gardé')
      .toBeGreaterThanOrEqual(80);
    expect(MOTEURS.length, 'les 14 moteurs doivent tous être gardés').toBe(14);
  });
});
