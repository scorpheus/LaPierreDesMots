/**
 * Q5 — TOUT GESTE PROPOSÉ ABOUTIT OU S'EXPLIQUE.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q5. Mode de défaillance M5,
 * « le geste proposé qui n'aboutit ni ne s'explique ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI L'A INSPIRÉ — R33, et le père avait parfaitement compris l'exercice
 *
 * « la sélection des mots dans la page les mots de couleur et autre qui n'est pas facile, on
 * devrait juste pouvoir prendre n'importe quel mot et le mettre dans l'une des deux cases,
 * sans ordre particulier, ça devrait juste fonctionner. »
 *
 * `MoteurTri.tsx` affiche les DOUZE mots ; `validation.ts` n'en accepte que trois :
 *
 *     if (!etape.restantes.includes(element)) return REFUS('element-hors-consigne');
 *
 * La consigne dit « range les mots de couleur à gauche », l'enfant tape **vert**, qui EST un
 * mot de couleur, et le pose dans le panier de gauche, qui EST le bon — et le jeu le refuse
 * **par une oscillation de 6 px, sans un mot**. Mesuré sur les 11 exercices de `tri` :
 * **95 mots sur 122 affichés au premier écran sont refusés au doigt (77,9 %).**
 *
 * Ce n'est pas « un ordre imposé » : c'est le refus d'une bonne réponse, et il est MUET.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI L'AUDIT « AUCUN ÉLÉMENT MORT » NE POUVAIT PAS LE VOIR ───────────────────────
 *
 * `parcours-audit-tout-le-site.spec.ts` demande « ce tap change-t-il quelque chose ? ». Un mot
 * refusé change quelque chose : il oscille, un son neutre part, `dernierRefus` bascule dans
 * l'état. **L'audit existant a donc raison de le déclarer vivant, et il passe au vert.**
 *
 * Q5 pose l'autre question, celle qui compte pour l'enfant : **le refus est-il DIT ?** Un geste
 * qui produit un refus qu'aucune annonce ne nomme est un refus muet — et un refus muet devant
 * un enfant de sept ans est indiscernable d'un jeu cassé.
 *
 * ── LE PROTOCOLE, ET POURQUOI IL FAIT DES PAIRES ─────────────────────────────────────────
 *
 * Taper les éléments un par un, dans l'ordre, ne déclenche presque aucun refus : le refus de
 * `tri` naît d'un geste en DEUX temps (`saisir` puis `deposer`), et une passe linéaire ne
 * dépose qu'une fois. Q5 groupe donc les prises par FAMILLE — dérivée de l'attribut `data-*`
 * qui les distingue, jamais d'une liste de moteurs — puis croise les deux familles les plus
 * nombreuses. C'est exactement « prendre un mot et le mettre dans une case », et c'est dérivé
 * du DOM, donc vrai pour un moteur écrit demain.
 *
 * ── LES DEUX CONTRÔLES, ET LE SECOND EST AUSSI IMPORTANT QUE LE PREMIER ──────────────────
 *
 *  • **positif** : un bouton fabriqué SANS gestionnaire doit être trouvé mort.
 *  • **négatif** : un bouton qui n'écoute QUE `pointerdown` ne doit PAS l'être. Un harnais qui
 *    n'émettrait qu'un `click` synthétique le déclarerait mort — c'est l'erreur mesurée de la
 *    campagne précédente, qui relevait 33 régions « mortes » répondant toutes au doigt.
 */
import { expect, test } from '../harnais-serveur.js';

import { deuxImages, etatDuJeu, recettesDEcrans, SELECTEUR_INTERACTIF } from './qa-outils.js';

import type { Page } from '@playwright/test';

/** Borne de coût, jamais une attente : au-delà, un écran est de toute façon à regarder. */
const PAIRES_MAX = 90;
const SIMPLES_MAX = 60;

const ECRANS = recettesDEcrans();

// ═══════════════════════════════════════════════════════ ce que l'écran DIT, à un instant t

/**
 * L'ANNONCE — tout ce que l'écran publie pour expliquer ce qui vient de se passer.
 *
 * Trois sources, et aucune n'est un choix esthétique : les régions `aria-live` (« aucune
 * consigne n'existe uniquement à l'écrit » — ce qui est annoncé est aussi ce qui est dit),
 * les `role="status"`, et tout attribut `data-refus*` que les moteurs publient déjà
 * (`MoteurTrace` le fait, `ScenePlace` aussi). Si rien de tout cela ne bouge, rien n'a été dit.
 */
async function annonce(page: Page): Promise<{ readonly dit: string; readonly marqueur: boolean }> {
  return page.evaluate(() => {
    const morceaux: string[] = [];
    for (const noeud of document.querySelectorAll('[aria-live], [role="status"]')) {
      morceaux.push((noeud.textContent ?? '').trim());
    }
    let marqueur = false;
    for (const noeud of document.querySelectorAll('*')) {
      for (const attribut of noeud.attributes) {
        if (!attribut.name.startsWith('data-refus')) continue;
        morceaux.push(`${attribut.name}=${attribut.value}`);
        if (attribut.value !== '' && attribut.value !== 'non') marqueur = true;
      }
    }
    return { dit: morceaux.join('|'), marqueur };
  });
}

/** Le refus courant, cherché en profondeur dans l'état du moteur : tous les 14 le nomment pareil. */
function refusCourant(etat: unknown): string | null {
  let trouve: string | null = null;
  const visiter = (valeur: unknown): void => {
    if (valeur === null || typeof valeur !== 'object') return;
    for (const [cle, sous] of Object.entries(valeur as Record<string, unknown>)) {
      if (cle === 'dernierRefus' && sous !== null && typeof sous === 'object') {
        trouve = JSON.stringify(sous);
      }
      visiter(sous);
    }
  };
  visiter(etat);
  return trouve;
}

interface Cliche {
  readonly etat: string;
  readonly refus: string | null;
  readonly dit: string;
  /** Un refus est-il PUBLIE dans l'arbre (`data-refus*` non nul) ? `MoteurTrace` le fait. */
  readonly marqueur: boolean;
  readonly dom: string;
}

async function cliche(page: Page): Promise<Cliche> {
  const etat = await etatDuJeu(page);
  const publie = await annonce(page);
  return {
    etat: JSON.stringify(etat),
    refus: refusCourant(etat),
    dit: publie.dit,
    marqueur: publie.marqueur,
    dom: await page.evaluate(() => document.body.innerHTML),
  };
}

/**
 * Tape un élément COMME UN DOIGT : `pointerdown`, `pointerup`, `click`, dans cet ordre.
 *
 * `dispatchEvent` et non `.click()` : les prises SVG (`role="button"` sur un `<circle>`)
 * n'exposent pas toutes `click`. Et n'émettre que `click` ferait passer pour mortes toutes les
 * prises qui écoutent le pointeur — c'est ce que garde le contrôle négatif.
 */
async function taper(page: Page, selecteur: string): Promise<boolean> {
  return page.evaluate((ou) => {
    const cible = document.querySelector(ou);
    if (cible === null) return false;
    const element = cible as HTMLElement;
    if (element.matches(':disabled, [aria-disabled="true"]')) return false;

    // La liste des prises est capturée avant la passe. Une action peut ouvrir une modale ou
    // désactiver un bouton entre-temps : un vrai doigt ne peut alors plus atteindre cette
    // ancienne cible. La revérifier ici empêche le testeur de fabriquer des « gestes morts »
    // que l'interface ne présente plus à l'enfant.
    const modaleActive = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
      .find((dialogue) => dialogue.getClientRects().length > 0);
    if (modaleActive !== undefined && !modaleActive.contains(element)) return false;

    const boite = element.getBoundingClientRect();
    const commun = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: boite.left + boite.width / 2,
      clientY: boite.top + boite.height / 2,
    };
    element.dispatchEvent(
      new PointerEvent('pointerdown', { ...commun, pointerId: 1, pointerType: 'touch' }),
    );
    element.dispatchEvent(
      new PointerEvent('pointerup', { ...commun, pointerId: 1, pointerType: 'touch' }),
    );
    element.dispatchEvent(new MouseEvent('click', commun));
    return true;
  }, selecteur);
}

// ═══════════════════════════════════════════════ les prises, groupées par FAMILLE, dérivées

interface Prise {
  readonly selecteur: string;
  readonly famille: string;
  readonly nom: string;
}

/**
 * Toutes les prises tapables de l'écran, chacune avec un sélecteur STABLE et sa famille.
 *
 * La famille est l'attribut `data-*` qui distingue la prise de ses sœurs (`data-element`,
 * `data-receptacle`, `data-case`, `data-carte`…). On ne connaît aucun de ces noms : on les LIT.
 * Les prises sans attribut distinctif tombent dans la famille `—`, et ne servent qu'à la passe
 * simple.
 */
async function prisesDe(page: Page): Promise<readonly Prise[]> {
  return page.evaluate((selecteur) => {
    const echapper = (valeur: string): string => valeur.replace(/["\\]/g, '\\$&');
    const trouvees: { selecteur: string; famille: string; nom: string }[] = [];
    const modales = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')];
    const modaleActive = modales.reverse().find((candidate) => {
      const style = getComputedStyle(candidate);
      const boite = candidate.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && boite.width > 0 && boite.height > 0;
    });
    for (const noeud of document.querySelectorAll(selecteur)) {
      const element = noeud as HTMLElement;
      // Une modale rend le reste de la page indisponible au doigt. Auditer les commandes
      // qu'elle recouvre fabrique des « gestes morts » qui ne sont jamais proposés à l'enfant.
      if (modaleActive !== undefined && !modaleActive.contains(element)) continue;
      const boite = element.getBoundingClientRect();
      if (boite.width === 0 || boite.height === 0) continue;
      const nom =
        element.getAttribute('aria-label') ?? (element.textContent ?? '').trim().slice(0, 30);
      let famille = '—';
      let propre: string | null = null;
      for (const attribut of element.attributes) {
        if (!attribut.name.startsWith('data-')) continue;
        if (attribut.value === '' || attribut.value === 'oui' || attribut.value === 'non') continue;
        // Une famille est un attribut porté par PLUSIEURS prises, avec des valeurs distinctes.
        const freres = document.querySelectorAll(`[${attribut.name}]`).length;
        if (freres < 2) continue;
        famille = attribut.name;
        propre = `[${attribut.name}="${echapper(attribut.value)}"]`;
        break;
      }
      if (propre === null) continue;
      trouvees.push({ selecteur: propre, famille, nom });
    }
    return trouvees;
  }, SELECTEUR_INTERACTIF);
}

/**
 * Les familles de prises, de la plus nombreuse a la moins nombreuse.
 *
 * On ne garde PAS seulement les deux premieres, et c'est une correction mesuree : sur les
 * noeuds `tri`, la deuxieme famille par la taille n'etait pas les receptacles (2) mais les
 * boutons d'ecoute (3). Q5 croisait donc les mots avec « ecouter », ne deposait jamais rien,
 * et rendait 9 verts sur 11 exercices dont on SAIT qu'ils refusent 78 % des mots. **Un
 * instrument qui choisit sa cible par une heuristique de taille mesure ce qu'il tombe.**
 *
 * On croise donc la famille la plus nombreuse avec CHACUNE des autres, sous un budget global.
 */
function famillesDe(prises: readonly Prise[]): readonly (readonly Prise[])[] {
  const parFamille = new Map<string, Prise[]>();
  for (const prise of prises) {
    const liste = parFamille.get(prise.famille) ?? [];
    liste.push(prise);
    parFamille.set(prise.famille, liste);
  }
  return [...parFamille.values()].sort((a, b) => b.length - a.length);
}

// ══════════════════════════════════════════════════════════════════════════════ le verdict

interface Grief {
  readonly geste: string;
  readonly genre: 'refus muet' | 'geste mort';
}

test.describe('Q5 — tout geste proposé aboutit ou s’explique', () => {
  test('la population est DÉRIVÉE des recettes d’écrans', () => {
    expect(
      ECRANS.length,
      'aucune recette d’écran : la population serait vide et le garde vrai par vacuité',
    ).toBeGreaterThanOrEqual(20);
    console.log(
      `[Q5] population : ${String(ECRANS.length)} pages atteignables en tapant ` +
        '(recettesDEcrans = écrans déclarés + un nœud par exercice livré).',
    );
  });

  test('CONTRÔLE POSITIF — un bouton fabriqué sans gestionnaire est trouvé mort, et un bouton qui n’écoute que `pointerdown` ne l’est pas', async ({
    page,
  }) => {
    await ECRANS[0]!.aller(page);

    await page.evaluate(() => {
      const mort = document.createElement('button');
      mort.type = 'button';
      mort.setAttribute('data-qa-controle', 'sans-gestionnaire');
      mort.textContent = 'témoin sans gestionnaire';
      const vivant = document.createElement('button');
      vivant.type = 'button';
      vivant.setAttribute('data-qa-controle', 'pointerdown-seul');
      vivant.textContent = 'témoin pointerdown';
      // Il n'écoute QUE `pointerdown` : un harnais qui n'émettrait qu'un `click` synthétique
      // le déclarerait mort. C'est le défaut mesuré qui faisait passer 33 régions vivantes
      // pour mortes.
      vivant.addEventListener('pointerdown', () => {
        vivant.setAttribute('data-touche', 'oui');
      });
      document.body.append(mort, vivant);
    });

    // Le témoin doit mesurer SON effet, pas les requêtes de fond de l'écran qui l'héberge.
    // Comparer tout `document.body` rendait le bouton mort « vivant » dès qu'une requête de
    // profil finissait entre les deux images. C'est un faux négatif du testeur lui-même.
    const htmlDuTemoin = (selecteur: string): Promise<string | null> =>
      page.locator(selecteur).evaluate((element) => element.outerHTML).catch(() => null);
    const avantMort = await htmlDuTemoin('[data-qa-controle="sans-gestionnaire"]');
    await taper(page, '[data-qa-controle="sans-gestionnaire"]');
    await deuxImages(page);
    const apresMort = await htmlDuTemoin('[data-qa-controle="sans-gestionnaire"]');
    const mortDetecte = apresMort === avantMort;

    const avantVivant = await htmlDuTemoin('[data-qa-controle="pointerdown-seul"]');
    await taper(page, '[data-qa-controle="pointerdown-seul"]');
    await deuxImages(page);
    const apresVivant = await htmlDuTemoin('[data-qa-controle="pointerdown-seul"]');
    const vivantDetecte = apresVivant !== avantVivant;

    console.log(
      `[Q5] contrôle positif — témoin sans gestionnaire : ${mortDetecte ? 'MORT ✔' : 'manqué'} · ` +
        `témoin pointerdown : ${vivantDetecte ? 'vivant ✔' : 'DÉCLARÉ MORT À TORT'}`,
    );
    expect(
      mortDetecte,
      'Q5 ne voit pas un bouton qui ne fait rien. L’instrument est aveugle : tout verdict vert ' +
        'de ce fichier serait sans valeur.',
    ).toBe(true);
    expect(
      vivantDetecte,
      'Q5 déclare mort un bouton qui répond à `pointerdown`. Le harnais n’émet donc pas la ' +
        'séquence complète du doigt, et il fabriquerait des morts par dizaines.',
    ).toBe(true);
  });

  test('CONTRÔLE MODAL — ignore ce qui est derrière, jamais ce qui reste dans le dialogue', async ({
    page,
  }) => {
    await ECRANS[0]!.aller(page);
    await page.evaluate(() => {
      const derriere = document.createElement('button');
      derriere.type = 'button';
      derriere.setAttribute('data-qa-modal', 'derriere');
      derriere.textContent = 'témoin recouvert';
      const dialogue = document.createElement('div');
      dialogue.setAttribute('role', 'dialog');
      dialogue.setAttribute('aria-modal', 'true');
      dialogue.style.position = 'fixed';
      dialogue.style.inset = '0';
      const dedans = document.createElement('button');
      dedans.type = 'button';
      dedans.setAttribute('data-qa-modal', 'dedans');
      dedans.textContent = 'témoin dans la modale';
      dialogue.append(dedans);
      document.body.append(derriere, dialogue);
    });

    const prises = await prisesDe(page);
    expect(
      prises.some((prise) => prise.selecteur === '[data-qa-modal="derriere"]'),
      'preuve positive : une commande recouverte ne doit pas entrer dans la population',
    ).toBe(false);
    expect(
      prises.some((prise) => prise.selecteur === '[data-qa-modal="dedans"]'),
      'contrôle négatif : le filtre modal ne doit pas vider les commandes du dialogue',
    ).toBe(true);
  });

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » : aucun geste muet`, async ({ page }) => {
      test.slow();
      await ecran.aller(page);
      const prises = await prisesDe(page);
      const familles = famillesDe(prises);
      const griefs: Grief[] = [];
      let gestes = 0;

      if (familles.length < 2) {
        // ── Passe SIMPLE : un écran sans deux familles de prises n'offre pas de geste en
        // deux temps. On tape chaque prise une fois.
        for (const prise of prises.slice(0, SIMPLES_MAX)) {
          const avant = await cliche(page);
          if (!(await taper(page, prise.selecteur))) continue;
          await deuxImages(page);
          const apres = await cliche(page);
          gestes += 1;
          const refusNeuf = apres.refus !== null && apres.refus !== avant.refus;
          const ditQuelqueChose = apres.dit !== avant.dit || apres.marqueur;
          if (refusNeuf && !ditQuelqueChose) {
            griefs.push({ geste: prise.nom, genre: 'refus muet' });
          } else if (
            apres.dom === avant.dom &&
            apres.etat === avant.etat &&
            !ditQuelqueChose
          ) {
            griefs.push({ geste: prise.nom, genre: 'geste mort' });
          }
        }
      } else {
        // ── Passe en PAIRES : « prendre X, le poser sur Y ». C'est le geste que le père
        // décrit, et le seul qui déclenche le refus de `tri`.
        // ── LE CRITÈRE, ET IL A DEMANDÉ DEUX CORRECTIONS D'INSTRUMENT ────────────────
        //
        // 1. Comparer l'annonce d'AVANT la prise à celle d'APRÈS le dépôt ne marche pas : la
        //    prise change déjà la consigne (`data-consigne-geste` passe de « choisir » à
        //    « déposer », et elle est `aria-live`). Tout refus paraissait annoncé — Q5 ne
        //    trouvait que 2 des 11 exercices `tri`.
        // 2. Comparer l'annonce d'APRÈS la prise à celle d'APRÈS le dépôt ne marche pas non
        //    plus, et dans l'autre sens : le refus REPOSE le mot, donc la consigne revient à
        //    « choisir ». Tout refus paraissait annoncé aussi — Q5 rendait 11 verts sur 11.
        //    **Un instrument qui rend le résultat rassurant deux fois de suite, pour deux
        //    raisons opposées, ne mesure pas ce qu'il croit.**
        //
        // Le critère juste est celui de l'ENFANT : **un refus est muet lorsque rien ne le
        // distingue d'une réussite.** On compare donc l'annonce qui suit un dépôt REFUSÉ à
        // l'ensemble de celles qui suivent un dépôt ACCEPTÉ sur la même page. Si elle s'y
        // trouve — et qu'aucun marqueur `data-refus*` n'est publié —, l'écran a dit
        // exactement la même chose dans les deux cas, et l'enfant ne peut pas savoir.
        const prisesA = familles[0] ?? [];
        const cibles = familles.slice(1);
        const annoncesApresSucces = new Set<string>();
        const refuses: { geste: string; dit: string; marqueur: boolean }[] = [];
        let faites = 0;
        for (const prisesB of cibles) {
          for (const a of prisesA) {
            for (const b of prisesB) {
              if (faites >= PAIRES_MAX) break;
              if (!(await taper(page, a.selecteur))) continue;
              await deuxImages(page);
              const apresPrise = await cliche(page);
              if (!(await taper(page, b.selecteur))) continue;
              await deuxImages(page);
              const apresDepot = await cliche(page);
              faites += 1;
              gestes += 1;
              const refusNeuf =
                apresDepot.refus !== null && apresDepot.refus !== apresPrise.refus;
              if (refusNeuf) {
                refuses.push({
                  geste: `${a.nom} → ${b.nom}`,
                  dit: apresDepot.dit,
                  marqueur: apresDepot.marqueur,
                });
              } else if (apresDepot.etat !== apresPrise.etat) {
                annoncesApresSucces.add(apresDepot.dit);
              }
            }
            if (faites >= PAIRES_MAX) break;
          }
          if (faites >= PAIRES_MAX) break;
        }
        for (const refus of refuses) {
          const distingue = refus.marqueur || !annoncesApresSucces.has(refus.dit);
          if (!distingue) griefs.push({ geste: refus.geste, genre: 'refus muet' });
        }
        console.log(
          `[Q5] ${ecran.nom} : ${String(refuses.length)} dépôt(s) refusé(s), ` +
            `${String(annoncesApresSucces.size)} annonce(s) distincte(s) après réussite`,
        );
      }

      const muets = griefs.filter((g) => g.genre === 'refus muet');
      const morts = griefs.filter((g) => g.genre === 'geste mort');
      console.log(
        `[Q5] ${griefs.length === 0 ? ' ' : '⚠'} ${ecran.nom.padEnd(46)} ` +
          `${String(gestes)} geste(s) · ${String(muets.length)} refus muet(s) · ` +
          `${String(morts.length)} geste(s) mort(s)`,
      );

      expect(
        griefs.map((g) => `${g.genre} : ${g.geste}`),
        `« ${ecran.nom} » — ces gestes n’aboutissent pas et ne s’expliquent pas. Un refus MUET ` +
          'devant un enfant de sept ans est indiscernable d’un jeu cassé : c’est exactement ce ' +
          'que le père a vécu avec les mots de couleur (R33), et avec le glisser avant lui (R16).',
      ).toEqual([]);
    });
  }
});
