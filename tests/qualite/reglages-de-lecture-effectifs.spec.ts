/**
 * Q7 — UN RÉGLAGE DE LECTURE ATTEINT TOUT CE QUI SE LIT.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q7. Mode de défaillance M7,
 * « le réglage qui n'atteint pas ce qu'il règle ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI L'A INSPIRÉ — R35
 *
 * « la mise en page pour chaque page, actuellement, le texte est trop petit »
 *
 * Le père avait réglé la typographie d'Ezékiel dans l'écran prévu pour ça. Relevé en base :
 *
 *     police=andika  corps_px=27  interlettrage=0,06em  espacement_mots=0,08em  interligne=2
 *
 * Ces réglages ne sortent que par `ZoneDeLecture`, qui rend la CONSIGNE. **Les mots que
 * l'enfant doit lire pour jouer** — les étiquettes de `tri`, les cases de `chemin`, les options
 * d'`eclair` et d'`histoire` — sont en dur à `1.25rem`, soit 20 px, dans **11 moteurs sur 14**.
 *
 *     27 px demandés, 20 px rendus, et sans l'interlettrage — qui est, d'après les notes du
 *     dépôt lui-même, « le levier le plus prouvé » (Zorzi 2012).
 *
 * **Le réglage de lecture ne touche pas le texte sur lequel porte la lecture.**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── COMMENT ON MESURE, ET POURQUOI PAS AUTREMENT ─────────────────────────────────────────
 *
 * On ne lit pas `--lecture-corps` : une variable CSS posée sur la racine est vraie partout et
 * ne dit RIEN de ce qu'elle atteint. On mesure **la taille rendue de chaque texte**, deux
 * fois : le corps au minimum (16 px) puis au maximum (40 px), c'est-à-dire un rapport de 2,5.
 * Un texte destiné à l'enfant qui garde exactement la même taille entre les deux est un texte
 * que le réglage n'atteint pas.
 *
 * **Et le réglage est posé PAR LE CHEMIN DE L'ENFANT** — on tape les boutons « moins » et
 * « plus » de l'écran des réglages, jamais `style.setProperty`. Règle 6 du § 5 : injecter
 * l'état qu'on veut observer, c'est exactement ce qui a rendu sept boutons morts invisibles à
 * 372 recettes E2E.
 *
 * ── LES DEUX CONTRÔLES POSITIFS ──────────────────────────────────────────────────────────
 *
 *  1. **L'aperçu de l'écran des réglages, lui, doit bouger.** Si AUCUN texte du dépôt ne
 *     changeait de taille entre 16 et 40, cela signifierait que le chemin de l'enfant n'a rien
 *     réglé du tout — et Q7 rendrait « rien ne bouge » pour une raison qui n'a rien à voir avec
 *     R35. C'est le contrôle qui empêche Q7 de mentir dans le sens ACCUSATEUR.
 *
 *     Il visait d'abord la CONSIGNE d'un nœud. Il est né rouge, et sa cause est la trouvaille
 *     la plus lourde de ce garde : `FournisseurReglagesLecture` n'est monté NULLE PART, donc
 *     `ZoneDeLecture` rend toujours `REGLAGES_PAR_DEFAUT`. **Le réglage du père n'atteint rien
 *     dans le jeu, pas même la consigne** — R35 était optimiste. Seul `ApercuReglages`, qui
 *     passe ses réglages explicitement, suit vraiment le réglage : c'est lui le témoin vivant.
 *
 *  2. **La règle des 64 px, relancée à corps maximal** — exigé par le § 4 Q7. R20 l'a déjà
 *     documenté : agrandir le texte peut rendre une cible inatteignable, et **c'est la règle
 *     des 64 px qui gagne**. Ce cas mesure la dette du lot C1 avant même qu'il commence.
 */
import { readdirSync } from 'node:fs';

import { expect, test } from '../harnais-serveur.js';

import {
  CIBLE_MINIMALE_PX,
  cheminDepot,
  ciblesTropPetites,
  deuxImages,
  entrerDansLeNoeud,
  lireTexte,
  noeudsLivres,
  preparer,
  SELECTEUR_INTERACTIF,
} from '../e2e/qa-outils.js';

import type { Page } from '@playwright/test';

// ═══════════════════════════════════════════════════ les bornes, LUES là où elles sont écrites

/** `partage/src/lecture/defauts.ts` fait foi — jamais 16 et 40 recopiés à la main. */
function bornesDuCorps(): { readonly min: number; readonly max: number } {
  const source = lireTexte('partage/src/lecture/defauts.ts');
  const trouve = /corpsPx:\s*\{\s*min:\s*(\d+)\s*,\s*max:\s*(\d+)/.exec(source);
  if (trouve === null) {
    throw new Error(
      'Q7 : les bornes de `corpsPx` sont introuvables dans partage/src/lecture/defauts.ts. ' +
        'Sans elles, le garde mesurerait un écart de zéro et passerait au vert par vacuité.',
    );
  }
  return { min: Number(trouve[1]), max: Number(trouve[2]) };
}

const BORNES = bornesDuCorps();

/**
 * Où `FournisseurReglagesLecture` est-il MONTÉ ? — la racine mécanique de tout ce fichier.
 *
 * Hissée hors du cas qui l'a trouvée, parce que deux cas en dépendent : celui qui la constate,
 * et celui qui en tire la dette du § R20. Commentaires retirés avant la recherche (règle 10) :
 * un fichier qui *parle* du fournisseur ne le monte pas.
 */
function montagesDuFournisseur(): readonly string[] {
  const sansCommentaires = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const declaration = 'client/src/lecture/ZoneDeLecture.tsx';
  const montages: string[] = [];
  const parcourir = (relatif: string): void => {
    for (const entree of readdirSync(cheminDepot(relatif), { withFileTypes: true })) {
      const suite = `${relatif}/${entree.name}`;
      if (entree.isDirectory()) parcourir(suite);
      else if (/\.tsx$/.test(entree.name) && suite !== declaration) {
        if (/<FournisseurReglagesLecture/.test(sansCommentaires(lireTexte(suite)))) {
          montages.push(suite);
        }
      }
    }
  };
  parcourir('client/src');
  return montages;
}

/** Les moteurs livrés, et le premier nœud qui emploie chacun. Population dérivée. */
const NOEUDS = noeudsLivres();
const MOTEURS = [...new Set(NOEUDS.map((n) => n.moteur))].sort();

// ══════════════════════════════════════════════════════════════ poser le réglage EN TAPANT

/**
 * Amène le corps à la valeur voulue en tapant « moins » ou « plus », comme le parent le fait.
 *
 * La borne de patience est un COMPTEUR de taps, jamais une durée (règle 7 du § 5) : le nombre
 * de pas possibles est connu, c'est `max - min`.
 */
async function reglerLeCorps(page: Page, cible: number): Promise<number> {
  // On n'ouvre l'écran que si l'on n'y est pas déjà : `[data-reglages-lecture]` est la prise
  // de l'écran des PROFILS, elle n'existe plus une fois qu'on est entré. Deux réglages
  // successifs dans le même cas passaient sinon 90 s à attendre un bouton absent.
  if (!(await page.locator('[data-ecran="reglages-lecture"]').isVisible())) {
    await page.locator('[data-reglages-lecture]').first().click();
  }
  await expect(page.locator('[data-ecran="reglages-lecture"]')).toBeVisible();

  const valeur = async (): Promise<number> =>
    Number(await page.locator('[data-valeur="corpsPx"]').getAttribute('data-valeur-brute'));

  const pasMaximum = BORNES.max - BORNES.min + 2;
  for (let pas = 0; pas < pasMaximum; pas += 1) {
    const courante = await valeur();
    if (courante === cible) return courante;
    const sens = courante > cible ? 'moins' : 'plus';
    const bouton = page.locator(`[data-reglage="corpsPx"][data-sens="${sens}"]`);
    if (!(await bouton.isEnabled())) break;
    await bouton.click();
  }
  return valeur();
}

// ══════════════════════════════════════════════════════════ mesurer ce que l'enfant voit

interface TexteMesure {
  readonly cle: string;
  readonly extrait: string;
  readonly taillePx: number;
  readonly interlettragePx: number;
}

/**
 * Tous les textes VISIBLES du plateau de jeu, avec leur taille rendue.
 *
 * La population est l'arbre du moteur (`[data-moteur]`) plus la consigne : c'est exactement
 * « le texte sur lequel porte la lecture ». La clé est un chemin structurel, stable d'une
 * mesure à l'autre tant que le DOM ne change pas — les clés absentes d'une des deux mesures
 * sont ignorées, ce qui couvre les moteurs dont l'écran évolue (l'exposition d'`eclair`).
 */
async function textesSous(page: Page, selecteur: string): Promise<readonly TexteMesure[]> {
  return page.evaluate((ou) => {
    const racine = document.querySelector(ou) ?? document.body;
    const chemin = (element: Element): string => {
      const morceaux: string[] = [];
      let courant: Element | null = element;
      while (courant !== null && courant !== racine) {
        const parent: Element | null = courant.parentElement;
        const rang = parent === null ? 0 : [...parent.children].indexOf(courant);
        morceaux.unshift(`${courant.tagName.toLowerCase()}:${String(rang)}`);
        courant = parent;
      }
      return morceaux.join('/');
    };

    const mesures: {
      cle: string;
      extrait: string;
      taillePx: number;
      interlettragePx: number;
    }[] = [];
    for (const element of racine.querySelectorAll('*')) {
      // Un nœud de texte PROPRE : on ignore les conteneurs, qui héritent sans rien afficher.
      const propre = [...element.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => (n.textContent ?? '').trim())
        .join(' ')
        .trim();
      if (propre.length < 2) continue;
      // Les chiffres seuls (jauges, compteurs) ne sont pas du texte à déchiffrer.
      if (!/\p{L}/u.test(propre)) continue;
      const boite = element.getBoundingClientRect();
      if (boite.width === 0 || boite.height === 0) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      mesures.push({
        cle: chemin(element),
        extrait: propre.slice(0, 40),
        taillePx: Number.parseFloat(style.fontSize),
        interlettragePx:
          style.letterSpacing === 'normal' ? 0 : Number.parseFloat(style.letterSpacing),
      });
    }
    return mesures;
  }, selecteur);
}

const textesDuPlateau = (page: Page): Promise<readonly TexteMesure[]> =>
  textesSous(page, '[data-ecran="noeud"]');

/** Mesure le plateau d'un nœud, à un corps donné, par le chemin de l'enfant. */
async function mesurerA(
  page: Page,
  noeud: string,
  corps: number,
): Promise<{ readonly corpsPose: number; readonly textes: readonly TexteMesure[] }> {
  await preparer(page);
  const corpsPose = await reglerLeCorps(page, corps);
  await preparer(page);
  await entrerDansLeNoeud(page, noeud);
  await deuxImages(page);
  return { corpsPose, textes: await textesDuPlateau(page) };
}

test.describe('Q7 — un réglage de lecture atteint tout ce qui se lit', () => {
  test('la population est DÉRIVÉE, et les bornes sont lues, jamais recopiées', () => {
    expect(BORNES.min, 'borne minimale de corpsPx illisible').toBeGreaterThan(0);
    expect(
      BORNES.max / BORNES.min,
      'les bornes ne laissent pas assez d’écart pour qu’un changement soit mesurable',
    ).toBeGreaterThanOrEqual(2);
    expect(MOTEURS.length, 'aucun moteur livré').toBeGreaterThanOrEqual(14);
    console.log(
      `[Q7] population : ${String(MOTEURS.length)} moteurs livrés (${MOTEURS.join(' · ')}), ` +
        `corps réglable de ${String(BORNES.min)} à ${String(BORNES.max)} px ` +
        `(rapport ${(BORNES.max / BORNES.min).toFixed(2)}).`,
    );
  });

  test('CONTRÔLE POSITIF — l’aperçu de l’écran des réglages, lui, change bien de taille', async ({
    page,
  }) => {
    // ── POURQUOI CE CONTRÔLE PORTE SUR L'APERÇU ET NON SUR LA CONSIGNE ─────────────────────
    //
    // Le contrôle visait d'abord la consigne d'un nœud, « puisqu'elle est branchée ». Il est
    // né ROUGE, et sa cause est le résultat le plus lourd de ce garde : `ZoneDeLecture` lit
    // ses réglages dans un CONTEXTE React dont le fournisseur n'est monté NULLE PART (voir le
    // cas suivant). La consigne rend donc `REGLAGES_PAR_DEFAUT`, comme tout le reste.
    //
    // `ApercuReglages`, lui, passe `reglages` EXPLICITEMENT à `ZoneDeLecture`. C'est donc le
    // seul texte du dépôt qui suive réellement le réglage — et c'est exactement ce qu'il faut
    // à un contrôle positif : il prouve que le chemin de l'enfant pose bien la valeur et que
    // la mesure lit bien la taille rendue. Sans lui, Q7 accuserait les quatorze moteurs d'un
    // défaut qui aurait pu être le sien.
    await preparer(page);
    const bas = await reglerLeCorps(page, BORNES.min);
    const petit = await textesSous(page, '[data-apercu="lecture"]');
    const haut = await reglerLeCorps(page, BORNES.max);
    const grand = await textesSous(page, '[data-apercu="lecture"]');

    expect(bas, 'le corps minimal n’a pas été posé par le chemin de l’enfant').toBe(BORNES.min);
    expect(haut, 'le corps maximal n’a pas été posé par le chemin de l’enfant').toBe(BORNES.max);
    expect(petit.length, 'l’aperçu ne rend aucun texte mesurable').toBeGreaterThan(0);

    const parCle = new Map(petit.map((t) => [t.cle, t] as const));
    const bougent = grand.filter((t) => {
      const avant = parCle.get(t.cle);
      return avant !== undefined && t.taillePx > avant.taillePx + 0.5;
    });
    console.log(
      `[Q7] contrôle positif — aperçu : ${String(bougent.length)} texte(s) sur ` +
        `${String(grand.length)} changent de taille entre ${String(BORNES.min)} et ` +
        `${String(BORNES.max)} px. Exemple : ` +
        (bougent[0] === undefined
          ? 'aucun'
          : `« ${bougent[0].extrait} » ${String(parCle.get(bougent[0].cle)?.taillePx)} → ${String(bougent[0].taillePx)} px`),
    );
    expect(
      bougent.length,
      'Même l’aperçu des réglages ne change pas de taille. Ce n’est plus le défaut R35, c’est ' +
        'l’instrument : soit le chemin de l’enfant ne pose plus le réglage, soit la mesure ne ' +
        'lit plus la taille rendue. Q7 ne prouverait alors rien du tout.',
    ).toBeGreaterThanOrEqual(1);
  });

  test('LE DÉFAUT DE FOND — le fournisseur de réglages est monté quelque part', () => {
    // ── UNE TROUVAILLE DE CE GARDE, PLUS LARGE QUE R35 ─────────────────────────────────────
    //
    // R35 disait : « ces réglages ne sortent QUE par `ZoneDeLecture`, qui rend la consigne ».
    // Mesuré ici, commentaires retirés : `FournisseurReglagesLecture` est déclaré, exporté,
    // documenté — et **monté nulle part**, pas même dans un test. `useReglagesLecture()` rend
    // donc toujours `REGLAGES_PAR_DEFAUT`.
    //
    // Conséquence : le réglage du père n'atteint RIEN dans le jeu, pas même la consigne. C'est
    // la signature nommée par CLAUDE.md — « le chemin déclaré, câblé jusqu'à la sortie, jamais
    // parcouru » — et elle traverse ici les quatorze moteurs.
    const montages = montagesDuFournisseur();
    console.log(
      `[Q7] fournisseur de réglages monté dans ${String(montages.length)} fichier(s) : ` +
        (montages.length === 0 ? 'AUCUN' : montages.join(', ')),
    );
    expect(
      montages,
      '`FournisseurReglagesLecture` n’est monté nulle part : `useReglagesLecture()` rend ' +
        'toujours `REGLAGES_PAR_DEFAUT`, donc AUCUN texte du jeu ne suit le réglage du parent ' +
        '— pas même la consigne, contrairement à ce que R35 supposait. C’est la racine du ' +
        'lot C1, et elle est en amont des onze `1.25rem` en dur.',
    ).not.toEqual([]);
  });

  for (const moteur of MOTEURS) {
    const noeud = NOEUDS.find((n) => n.moteur === moteur)!.id;
    test(`« ${moteur} » — tout texte à déchiffrer suit le réglage`, async ({ page }) => {
      const petit = await mesurerA(page, noeud, BORNES.min);
      const grand = await mesurerA(page, noeud, BORNES.max);
      const parCle = new Map(petit.textes.map((t) => [t.cle, t] as const));

      const figes: string[] = [];
      let compares = 0;
      for (const apres of grand.textes) {
        const avant = parCle.get(apres.cle);
        if (avant === undefined) continue;
        compares += 1;
        if (apres.taillePx <= avant.taillePx + 0.5) {
          figes.push(
            `« ${apres.extrait} » reste à ${apres.taillePx.toFixed(1)} px ` +
              `(corps ${String(BORNES.min)} → ${String(BORNES.max)})`,
          );
        }
      }
      console.log(
        `[Q7] ${figes.length === 0 ? ' ' : '⚠'} ${moteur.padEnd(10)} ` +
          `${String(compares)} texte(s) comparé(s) · ${String(figes.length)} figé(s)`,
      );
      expect(
        compares,
        `aucun texte comparable sur « ${moteur} » : la mesure ne tient pas, elle ne prouve rien`,
      ).toBeGreaterThan(0);
      expect(
        figes,
        `« ${moteur} » — ces textes sont ceux que l’enfant doit DÉCHIFFRER pour jouer, et le ` +
          'réglage de lecture ne les atteint pas. Le père a demandé 27 px ; ils restent à 20. ' +
          'Le remède est un seul fichier de style, pas onze réglages en ligne (lot C1).',
      ).toEqual([]);
    });
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * LE § R20 DE CE GARDE — REFAIT, PARCE QU'IL AVAIT CESSÉ DE PROUVER QUOI QUE CE SOIT
   *
   * Il était UN cas qui balayait les 14 moteurs à corps maximal. Il a fini par dépasser son
   * budget — 1,5 min contre 90 s —, et Q8 l'a signalé pour ce qu'il était devenu :
   *
   *     ✗ Q7 : son contrôle positif a ÉCHOUÉ — le garde ne retrouve plus le défaut de
   *       référence qui l'a inspiré : il est devenu aveugle.
   *
   * **Il n'avait pas trouvé de cible trop petite : il n'avait pas eu le temps de finir.**
   *
   * Remonter le délai aurait été la pire des réparations — c'est le mode M8 de la spec QA
   * appliqué à l'outil qui la sert. Et le découper en quatorze cas rapides n'aurait rien réparé
   * non plus, parce que le vrai défaut était ailleurs, et je l'avais écrit moi-même dans ce
   * fichier au premier tour : **le balayage était VACUEUX**. Aucun texte du jeu ne grandit
   * (`FournisseurReglagesLecture` n'est monté nulle part), donc « à corps maximal » rendait
   * exactement la page de « à corps par défaut » — déjà gardée, au vert, par les 91 cas de
   * `mise-en-page-tablette.spec.ts`. Quatorze cas rapides prouvant chacun rien valent zéro.
   *
   * Le § R20 est donc refait en quatre cas, et chacun a UNE charge :
   *
   *   A. l'instrument sait TROUVER une cible trop petite — témoin fabriqué à 40 px ;
   *   B. l'écran audité change VRAIMENT de mise en page entre 16 et 40 px ;
   *   C. et alors seulement : aucune cible sous 64 px à corps maximal (assertion de PRODUIT) ;
   *   D. les 14 moteurs restent NON MESURABLES, dette chiffrée qui EXPIRE TOUTE SEULE.
   *
   * A et B portent la marque « CONTRÔLE POSITIF » : ce sont eux qui prouvent que l'instrument
   * mord, et Q8 exige qu'ils passent. C ne la porte pas — un rouge sur C est un défaut du
   * produit (le conflit R16-contre-R20), pas un instrument aveugle, et Q8 ne doit pas les
   * confondre.
   *
   * L'écran audité est celui des RÉGLAGES, et ce n'est pas un repli : c'est aujourd'hui le seul
   * du dépôt où le réglage s'applique réellement (`ApercuReglages` passe ses réglages
   * explicitement à `ZoneDeLecture`). Mesurer le conflit là où il peut exister vaut mieux que
   * le mesurer quatorze fois là où il ne peut pas.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */

  /** Le côté du témoin fabriqué. Sous les 64 px de R16, et franchement sous. */
  const COTE_TEMOIN_PX = 40;

  test(`CONTRÔLE POSITIF (R20) — la mesure sait TROUVER une cible sous ${String(CIBLE_MINIMALE_PX)} px`, async ({
    page,
  }) => {
    // A. Sans ce cas, « 0 cible trop petite » est indiscernable de « la mesure ne voit rien ».
    // Un témoin fabriqué sous la barre doit être trouvé, et il doit repartir avec lui : une
    // mesure qui laisserait sa propre trace fausserait tous les cas suivants.
    await preparer(page);
    const avant = await ciblesTropPetites(page);

    await page.evaluate((cote) => {
      const temoin = document.createElement('button');
      temoin.type = 'button';
      temoin.setAttribute('data-qa-temoin', 'cible-trop-petite');
      temoin.setAttribute('aria-label', 'témoin fabriqué');
      temoin.style.cssText =
        `position:fixed;top:0;left:0;margin:0;padding:0;border:0;box-sizing:border-box;` +
        `width:${String(cote)}px;height:${String(cote)}px`;
      document.body.append(temoin);
    }, COTE_TEMOIN_PX);
    await deuxImages(page);
    const pendant = await ciblesTropPetites(page);
    const trouve = pendant.find((cible) => cible.description.includes('témoin fabriqué'));

    await page.evaluate(() => {
      document.querySelector('[data-qa-temoin]')?.remove();
    });
    await deuxImages(page);
    const apres = await ciblesTropPetites(page);

    console.log(
      `[Q7] contrôle positif R20 — témoin ${String(COTE_TEMOIN_PX)}×${String(COTE_TEMOIN_PX)} px : ` +
        `${trouve === undefined ? 'MANQUÉ' : `TROUVÉ (${String(trouve.largeur)}×${String(trouve.hauteur)} px)`} · ` +
        `cibles trop petites ${String(avant.length)} → ${String(pendant.length)} → ${String(apres.length)}`,
    );
    expect(
      trouve,
      `un bouton de ${String(COTE_TEMOIN_PX)} px n’est pas relevé par \`ciblesTropPetites\` : ` +
        'la mesure des cibles est aveugle, et tout « 0 cible » rendu par ce fichier serait sans ' +
        'valeur.',
    ).toBeDefined();
    expect(trouve!.largeur, 'la mesure ne lit pas la largeur rendue').toBe(COTE_TEMOIN_PX);
    expect(
      apres.length,
      'le témoin fabriqué n’a pas été retiré : la mesure laisse sa propre trace dans la page',
    ).toBe(avant.length);
  });

  test('CONTRÔLE POSITIF (R20 à corps maximal) — l’écran audité change VRAIMENT de mise en page', async ({
    page,
  }) => {
    // B. Le cas suivant mesure la règle des 64 px « à corps maximal ». Encore faut-il que
    // « corps maximal » veuille dire quelque chose SUR CET ÉCRAN. Sans ce contrôle, un zéro
    // rendu par C serait une mesure prise sur une variation qui n'a pas eu lieu.
    await preparer(page);
    const bas = await reglerLeCorps(page, BORNES.min);
    const petit = await textesSous(page, '[data-ecran="reglages-lecture"]');
    const haut = await reglerLeCorps(page, BORNES.max);
    const grand = await textesSous(page, '[data-ecran="reglages-lecture"]');
    const nbCibles = await page.locator(SELECTEUR_INTERACTIF).count();

    expect(bas, 'le corps minimal n’a pas été posé par le chemin de l’enfant').toBe(BORNES.min);
    expect(haut, 'le corps maximal n’a pas été posé par le chemin de l’enfant').toBe(BORNES.max);

    const parCle = new Map(petit.map((t) => [t.cle, t] as const));
    const bougent = grand.filter((t) => {
      const avant = parCle.get(t.cle);
      return avant !== undefined && t.taillePx > avant.taillePx + 0.5;
    });
    console.log(
      `[Q7] contrôle positif R20@${String(BORNES.max)}px — ${String(bougent.length)} texte(s) sur ` +
        `${String(grand.length)} grandissent entre ${String(BORNES.min)} et ${String(BORNES.max)} px · ` +
        `${String(nbCibles)} cible(s) interactive(s) sous la mesure`,
    );
    expect(
      bougent.length,
      `à corps ${String(BORNES.max)} px, la mise en page de cet écran est identique à celle de ` +
        `${String(BORNES.min)} px : la mesure du cas suivant porterait sur une variation qui n’a ` +
        'pas eu lieu, et son zéro ne prouverait rien (mode M8).',
    ).toBeGreaterThanOrEqual(1);
    expect(
      nbCibles,
      'aucune cible interactive sur l’écran audité : la règle des 64 px serait vraie par vacuité',
    ).toBeGreaterThanOrEqual(10);
  });

  test(`R20 à corps maximal — aucune cible sous ${String(CIBLE_MINIMALE_PX)} px là où le réglage s’applique`, async ({
    page,
  }) => {
    // C. L'assertion de PRODUIT, et la seule du § R20. Un rouge ici est le conflit
    // R16-contre-R20 que R20 avait documenté : agrandir le texte peut rendre une cible
    // inatteignable, et **c'est la règle des 64 px qui gagne**. On ne rabote pas la règle, on
    // chiffre la dette.
    //
    // Pas de marque « CONTRÔLE POSITIF » dans ce titre, et c'est délibéré : Q8 lirait un rouge
    // ici comme un instrument devenu aveugle, alors que ce serait un défaut du produit. Les
    // deux cas au-dessus portent la preuve de l'instrument ; celui-ci porte le verdict.
    await preparer(page);
    const pose = await reglerLeCorps(page, BORNES.max);
    expect(pose, 'le corps maximal n’a pas été posé').toBe(BORNES.max);
    await deuxImages(page);
    const trop = await ciblesTropPetites(page);
    console.log(
      `[Q7] R20@${String(BORNES.max)}px sur reglages-lecture : ${String(trop.length)} cible(s) ` +
        `sous ${String(CIBLE_MINIMALE_PX)} px`,
    );
    expect(
      trop.map((c) => `${c.description} — ${String(c.largeur)}×${String(c.hauteur)} px`),
      `À corps ${String(BORNES.max)} px, ces cibles passent sous ${String(CIBLE_MINIMALE_PX)} px. ` +
        'C’est le conflit R16-contre-R20, et il ne se rabote pas : la règle des 64 px gagne.',
    ).toEqual([]);
  });

  test('LA DETTE A EXPIRÉ — le fournisseur est monté, donc R20 à corps maximal se mesure', () => {
    // D. Ce cas était une DETTE écrite comme une assertion, et elle s'est éteinte toute seule
    // le 2026-08-08 : `FournisseurReglagesLecture` est monté dans
    // `client/src/lecture/reglages-du-profil.tsx`, et le balayage par moteur qu'elle réclamait
    // est écrit juste en dessous.
    //
    // Ce qu'il en reste ici est le SENS INVERSE : si le fournisseur venait à être démonté, les
    // quatorze cas ci-dessous rendraient la même page à 16 et à 40 px et deviendraient quatorze
    // verts creux — la pire forme d'échec, celle qui rassure. Ce cas les en empêche.
    const montages = montagesDuFournisseur();
    console.log(
      `[Q7] R20@${String(BORNES.max)}px : mesurable sur ${String(MOTEURS.length)} moteur(s), ` +
        `fournisseur monté dans ${montages.join(', ')}`,
    );
    expect(
      montages,
      'le fournisseur a été démonté : les quatorze cas de R20 à corps maximal ne mesurent plus ' +
        'rien, puisque le plateau rend la même page aux deux bornes. Leurs verts seraient creux.',
    ).not.toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // LE BALAYAGE PAR MOTEUR, RÉCLAMÉ PAR LA DETTE CI-DESSUS — un cas chacun, et pourquoi
  //
  // Un seul cas pour quatorze moteurs aurait rendu « 37 cibles trop petites » sans dire OÙ :
  // il aurait fallu rouvrir la trace pour savoir quel moteur corriger. Un cas par moteur nomme
  // le coupable dans son titre, et un moteur corrigé passe au vert sans attendre les treize
  // autres.
  //
  // ── CE QUE CE BALAYAGE MESURE, ET QUI N'EST MESURÉ NULLE PART AILLEURS ────────────────────
  // `mise-en-page-tablette.spec.ts` audite les 91 écrans au corps PAR DÉFAUT. Ici on pousse le
  // corps à son MAXIMUM, c'est-à-dire à l'échelle 1,667 : c'est le régime où R16 et R20 entrent
  // en conflit, parce qu'un texte plus grand pousse les boutons et peut les faire sortir de
  // l'écran. Une mesure faite au corps par défaut ne voyage pas vers ce régime — elle mesure
  // une autre application.
  //
  // **La règle des 64 px gagne** (R20 l'a documenté, le père l'a tranché) : on ne rabote pas la
  // taille de cible pour faire tenir le texte. Un rouge ici est un défaut du PRODUIT, jamais de
  // l'instrument — d'où l'absence de « CONTRÔLE POSITIF » dans ces titres, que Q8 lit.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  for (const moteur of MOTEURS) {
    const noeud = NOEUDS.find((n) => n.moteur === moteur)!.id;
    test(`« ${moteur} » — à corps maximal, aucune cible ne passe sous ${String(CIBLE_MINIMALE_PX)} px`, async ({
      page,
    }) => {
      await preparer(page);
      const corpsPose = await reglerLeCorps(page, BORNES.max);
      expect(
        corpsPose,
        `le corps maximal n’a pas été posé par le chemin de l’enfant : la mesure porterait sur ` +
          'un réglage qui n’a pas pris, et son zéro ne prouverait rien',
      ).toBe(BORNES.max);

      await preparer(page);
      await entrerDansLeNoeud(page, noeud);
      await deuxImages(page);

      const trop = await ciblesTropPetites(page);
      console.log(
        `[Q7] ${moteur.padEnd(10)} R20@${String(BORNES.max)}px · ` +
          `${String(trop.length)} cible(s) sous ${String(CIBLE_MINIMALE_PX)} px`,
      );
      expect(
        trop.map((c) => `${c.description} — ${String(c.largeur)}×${String(c.hauteur)} px`),
        `« ${moteur} » — à corps ${String(BORNES.max)} px, ces cibles passent sous ` +
          `${String(CIBLE_MINIMALE_PX)} px. C’est le conflit R16-contre-R20 : la règle des ` +
          `${String(CIBLE_MINIMALE_PX)} px gagne, et on chiffre la dette au lieu de la raboter.`,
      ).toEqual([]);
      // Le CHIFFRE imprimé au journal entre lui aussi dans une assertion. Sans cette ligne, le
      // compte affiché n'engage rien — c'est le `CHIFFRE-JAMAIS-ASSERTE` que `qa:trompeurs`
      // relève, et il a raison : un rapport qui imprime un nombre que rien ne garde est un
      // rapport qui rassure.
      expect(trop.length, `« ${moteur} » — compte de cibles sous le seuil`).toBe(0);
    });
  }

});
