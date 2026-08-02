/**
 * LE CONTRAT DE SORTIE DES INVARIANTS GLOBAUX — lot QA Q1.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * DEUX CHOSES, ET LA SECONDE EST LA PLUS IMPORTANTE
 *
 * 1. **Le chiffre.** Combien d'invariants, combien de recettes les portent, combien d'actions
 *    ont réellement été auditées. Un chiffre qu'aucun travail creux ne peut atteindre.
 *
 * 2. **LA PREUVE QUE LA SENTINELLE MORD.** Huit contrôles positifs cassent l'application
 *    exprès — un marqueur d'échec, une impasse, une cible de 20 px, une erreur console, un
 *    écran blanc, un acquis repris, une écriture perdue — et EXIGENT que la sentinelle le
 *    rapporte. Un harnais qu'on n'a jamais vu mordre n'a fait ses preuves sur rien : il rend
 *    du vert, et on ne sait pas si c'est parce que tout va bien ou parce qu'il est aveugle.
 *
 * C'est exactement le défaut n° 6 de l'historique de cette QA — « il imprimait 14 moteurs
 * joués sur 14 mais n'assertait que > 0 » — et le défaut que l'audit par mutation a mesuré
 * dans six tests du dépôt. On ne le refait pas ici.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LES CONTRÔLES POSITIFS TOURNENT SUR UNE PAGE À PART ───────────────────────────
 * La page du fixateur est surveillée par la sentinelle du § 5 de `invariants.ts`, qui échoue
 * si une violation subsiste. Casser l'application dessus ferait échouer le cas pour la bonne
 * raison — mais on ne pourrait plus distinguer « la sentinelle a mordu » de « le cas a raté ».
 * Chaque contrôle ouvre donc SA page, y arme SA sentinelle, et lit son rapport. Aucune
 * dérogation n'est offerte au chemin normal : il n'existe aucun moyen d'acquitter une
 * violation sur la page d'une recette, et c'est délibéré.
 *
 * ── CE FICHIER EST NOMMÉ `zz` POUR PASSER EN DERNIER ───────────────────────────────────────
 * Playwright ordonne par chemin. Le § 5 lit le journal que les 18 autres recettes viennent
 * d'écrire ; il doit donc passer après elles. `parcours-zz-` le garantit sans toucher à
 * `playwright.config.ts`, qui appartient à un autre lot.
 */
import { readdirSync } from 'node:fs';

import {
  CAMPAGNE_COURANTE,
  INVARIANTS,
  SELECTEURS_ECHEC,
  SELECTEUR_ETOILE_ACQUISE,
  armerLaSentinelle,
  decrireLesViolations,
  expect,
  lireLeJournalDesInvariants,
  test,
} from './invariants.js';

import type { CodeInvariant, Sentinelle } from './invariants.js';

import {
  SELECTEUR_INTERACTIF,
  cheminDepot,
  choisirLeProfil,
  deuxImages,
  jouerJusquALaRecompense,
  lireTexte,
  noeudsLivres,
  preparer,
} from './qa-outils.js';

import type { Page } from '@playwright/test';

/** Les fichiers de recette du projet `parcours`, plus ceux du projet `robustesse`. */
function recettesSurDisque(): readonly string[] {
  return readdirSync(cheminDepot('tests/e2e'))
    .filter((f) => f.endsWith('.spec.ts'))
    .sort();
}

/** Tous les fichiers `.ts`/`.tsx` de `client/src`, à plat. */
function sourcesDuClient(): readonly string[] {
  const trouves: string[] = [];
  const parcourir = (relatif: string): void => {
    for (const entree of readdirSync(cheminDepot(relatif), { withFileTypes: true })) {
      const chemin = `${relatif}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(entree.name)) trouves.push(chemin);
    }
  };
  parcourir('client/src');
  return trouves;
}

// ══════════════════════════════════════════════ 1. LE HARNAIS EST DÉCLARÉ, ET IL EST COMPLET

test('les six invariants sont déclarés, et chacun nomme la règle et le défaut qu’il garde', () => {
  const codes = INVARIANTS.map((i) => i.code);
  console.log(`[q1] invariants déclarés : ${String(INVARIANTS.length)} — ${codes.join(', ')}`);

  expect(
    codes,
    'les six invariants demandés par le lot Q1, un par ligne du brief',
  ).toEqual(['issue', 'echec', 'acquis', 'sante', 'cible', 'serveur']);
  expect(new Set(codes).size, 'deux invariants portent le même code').toBe(codes.length);

  // Aucun ne peut être une coquille : chacun cite sa règle ET le défaut vécu qu'il garde.
  for (const invariant of INVARIANTS) {
    expect(invariant.titre.length, `« ${invariant.code} » n’a pas de titre`).toBeGreaterThan(10);
    expect(
      invariant.regle.length,
      `« ${invariant.code} » ne cite aucune règle du corpus : un invariant sans règle est une ` +
        'préférence, pas une contrainte',
    ).toBeGreaterThan(30);
    expect(
      invariant.defautGarde.length,
      `« ${invariant.code} » ne nomme aucun défaut réel. Un invariant qui n’en garde aucun a ` +
        'été écrit parce qu’il était facile à écrire — c’est ce que l’audit a mesuré dans six ' +
        'tests de ce dépôt (Docs/audit-qa.md § 6).',
    ).toBeGreaterThan(30);
  }
});

/**
 * TOUTES LES RECETTES PORTENT LE HARNAIS — et c'est vérifié par ÉNUMÉRATION, pas par
 * souvenir. Une recette neuve qui importerait `test` de `@playwright/test` ne serait
 * surveillée par rien ; ici, elle fait échouer la QA en se nommant.
 *
 * C'est l'audit par OBJETS de D48 appliqué au harnais lui-même : on énumère les fichiers qui
 * DEVRAIENT le porter, pas les occurrences de son import.
 */
test('CONTRAT DE SORTIE — toute recette du dossier porte le harnais, écart nul', () => {
  const recettes = recettesSurDisque();
  const branchees: string[] = [];
  const orphelines: string[] = [];

  // Un import de TYPE depuis `@playwright/test` reste licite (`import type { Page }`) : il
  // n'apporte aucun `test`. Seul l'import de valeur compte.
  const importeLeHarnais = /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'\.\/invariants\.js'/u;
  const importeLeBrut = /^import\s+(?!type\b)\{[^}]*\btest\b[^}]*\}\s*from\s*'@playwright\/test'/mu;

  for (const fichier of recettes) {
    const source = lireTexte(`tests/e2e/${fichier}`);
    if (importeLeBrut.test(source)) {
      orphelines.push(`${fichier} — importe encore \`test\` de @playwright/test`);
    } else if (!importeLeHarnais.test(source)) {
      orphelines.push(`${fichier} — n’importe \`test\` de nulle part de reconnaissable`);
    } else {
      branchees.push(fichier);
    }
  }

  console.log(
    `[q1] recettes sur disque : ${String(recettes.length)} · ` +
      `portant le harnais : ${String(branchees.length)} · écart : ${String(orphelines.length)}`,
  );

  expect(
    orphelines,
    'ces recettes ne sont surveillées par aucun invariant. Une ligne suffit : remplacer ' +
      "`from '@playwright/test'` par `from './invariants.js'` sur l’import de `test`.",
  ).toEqual([]);
  // Plancher : sans lui, « écart nul » resterait vrai sur un dossier vide.
  expect(recettes.length, 'inventaire des recettes anormalement pauvre').toBeGreaterThanOrEqual(15);
});

/**
 * LE VOCABULAIRE DES MARQUEURS D'ÉCHEC NE PEUT PAS GRANDIR EN SILENCE.
 *
 * L'invariant `echec` audite une liste de sélecteurs. Une liste écrite à la main vieillit :
 * le jour où quelqu'un émet `data-resultat="echec"`, la sentinelle regarde ailleurs et rend du
 * vert. On énumère donc les attributs réellement employés dans `client/src/**` et on exige
 * qu'ils soient tous gardés.
 */
test('CONTRAT DE SORTIE — tout marqueur d’échec du client est gardé par l’invariant `echec`', () => {
  const attributsTrouves = new Set<string>();
  for (const fichier of sourcesDuClient()) {
    for (const trouve of lireTexte(fichier).matchAll(/(data-[a-z-]+)=["'{][^"'}]*\becho?ec\b/gu)) {
      attributsTrouves.add(trouve[1]!);
    }
  }
  const gardes = new Set(
    SELECTEURS_ECHEC.map((s) => /\[(data-[a-z-]+)/u.exec(s)?.[1]).filter(
      (a): a is string => a !== undefined,
    ),
  );
  const nonGardes = [...attributsTrouves].filter((a) => !gardes.has(a)).sort();

  console.log(
    `[q1] attributs d’échec employés dans client/src : ${[...attributsTrouves].sort().join(', ')} · ` +
      `gardés : ${[...gardes].sort().join(', ')} · écart : ${String(nonGardes.length)}`,
  );

  expect(
    nonGardes,
    'ces attributs portent la valeur « echec » dans le client et ne sont audités par aucun ' +
      'sélecteur de SELECTEURS_ECHEC : R14 serait violée sans que la sentinelle le voie.',
  ).toEqual([]);
  expect(
    attributsTrouves.size,
    'aucun marqueur d’échec trouvé dans client/src — le motif de recherche ne mord plus, et ' +
      'l’invariant `echec` serait vrai par vacuité',
  ).toBeGreaterThanOrEqual(1);

  // Le sélecteur des étoiles doit lui aussi rester ancré dans le source, sans quoi
  // l'invariant `acquis` compterait zéro étoile partout et ne pourrait plus jamais échouer.
  const porteLesDeux = sourcesDuClient().some((f) => {
    const source = lireTexte(f);
    return source.includes('data-etoile=') && source.includes('data-acquise=');
  });
  expect(
    porteLesDeux,
    `aucun fichier de client/src ne pose à la fois \`data-etoile\` et \`data-acquise\` : ` +
      `le sélecteur « ${SELECTEUR_ETOILE_ACQUISE} » ne désigne plus rien et l’invariant ` +
      '`acquis` serait aveugle.',
  ).toBe(true);
});

// ═══════════════════════════════════════ 2. LES CONTRÔLES POSITIFS — LA SENTINELLE SAIT MORDRE

/**
 * Attend qu'une violation du code demandé soit REMONTÉE, image après image.
 *
 * On attend un ÉTAT — le rapport de la sentinelle —, jamais une durée. La borne n'est pas une
 * temporisation : c'est le refus de boucler à l'infini quand la sentinelle est muette, qui est
 * précisément le cas qu'on cherche à détecter.
 */
async function attendreLaMorsure(
  page: Page,
  sentinelle: Sentinelle,
  code: CodeInvariant,
): Promise<readonly string[]> {
  for (let image = 0; image < 60; image += 1) {
    const violations = sentinelle.bilan().violations;
    if (violations.some((v) => v.code === code)) return decrireLesViolations(violations);
    await deuxImages(page);
  }
  return decrireLesViolations(sentinelle.bilan().violations);
}

/** Ouvre une page à part, y arme une sentinelle, et rend les deux. */
async function pageSousSentinelle(
  contexte: { newPage: () => Promise<Page> },
): Promise<{ page: Page; sentinelle: Sentinelle }> {
  const page = await contexte.newPage();
  const sentinelle = await armerLaSentinelle(page);
  return { page, sentinelle };
}

test.describe('CONTRÔLES POSITIFS — chaque invariant sait rendre rouge', () => {
  test.slow();

  test('`echec` mord : un `data-etat="echec"` posé sur un écran est rapporté (R14)', async ({
    context,
  }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.evaluate(() => {
      const marqueur = document.createElement('div');
      marqueur.setAttribute('data-etat', 'echec');
      marqueur.textContent = 'contrôle positif';
      document.body.append(marqueur);
    });

    const rapport = await attendreLaMorsure(page, sentinelle, 'echec');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu un marqueur d’échec posé sous son nez : l’invariant `echec` ' +
        'est aveugle, et R14 n’est gardée par rien dans les parcours.',
    ).toContain('[echec]');
    await page.close();
  });

  test('`cible` mord : un bouton de 20 px est rapporté (R16)', async ({ context }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.evaluate(() => {
      const petit = document.createElement('button');
      petit.setAttribute('aria-label', 'contrôle positif R16');
      petit.style.cssText = 'width:20px;height:20px;position:fixed;inset-block-start:0';
      document.body.append(petit);
    });

    const rapport = await attendreLaMorsure(page, sentinelle, 'cible');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu une cible de 20 px : les mutations M7a, M7b et M23 de l’audit ' +
        'repasseraient toutes les trois.',
    ).toContain('[cible]');
    await page.close();
  });

  test('`issue` mord : un écran dont on a retiré toute prise est rapporté (défaut n° 1)', async ({
    context,
  }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.evaluate((selecteur) => {
      // On retire les prises SANS toucher au porteur de `data-ecran` : c'est une impasse
      // qu'on fabrique, pas un écran blanc — les deux invariants doivent rester distincts.
      for (const element of document.querySelectorAll(selecteur)) {
        if (element.hasAttribute('data-ecran')) continue;
        if (element.querySelector('[data-ecran]') !== null) continue;
        element.remove();
      }
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch' }),
      );
    }, SELECTEUR_INTERACTIF);

    const rapport = await attendreLaMorsure(page, sentinelle, 'issue');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu une impasse : c’est le défaut n° 1 du père, celui qui a ' +
        'survécu à 23 parcours verts.',
    ).toContain('[issue]');
    await page.close();
  });

  test('`sante` mord : une erreur console est rapportée', async ({ context }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.evaluate(() => {
      console.error('contrôle positif — cette erreur est provoquée par la QA');
    });

    const rapport = await attendreLaMorsure(page, sentinelle, 'sante');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu une erreur console : une exception avalée par un `catch` ' +
        'muet redeviendrait invisible — c’est la forme du défaut n° 4 du père.',
    ).toContain('console.error');
    await page.close();
  });

  test('`sante` mord : un écran blanc est rapporté', async ({ context }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.evaluate(() => {
      document.body.replaceChildren();
    });

    const rapport = await attendreLaMorsure(page, sentinelle, 'sante');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu un écran blanc. « L’enfant ne saura pas le décrire, il ' +
        'arrêtera simplement de jouer » (annexe T § T3).',
    ).toContain('écran blanc');
    await page.close();
  });

  test('`acquis` mord : une étoile acquise qui disparaît est rapportée (R14)', async ({
    context,
  }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    // Trois étoiles acquises apparaissent sur l'écran…
    await page.evaluate(() => {
      const boite = document.createElement('div');
      boite.id = 'controle-positif-etoiles';
      boite.innerHTML =
        '<i data-etoile="1" data-acquise="oui"></i>' +
        '<i data-etoile="2" data-acquise="oui"></i>' +
        '<i data-etoile="3" data-acquise="oui"></i>';
      document.body.append(boite);
    });
    await deuxImages(page);
    // …puis on en reprend une. R14 : « un acquis n'est jamais repris ».
    await page.evaluate(() => {
      document.querySelector('#controle-positif-etoiles i')?.remove();
    });

    const rapport = await attendreLaMorsure(page, sentinelle, 'acquis');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu un acquis repris : la mutation M5 de l’audit ' +
        '(`etoiles = excluded.etoiles` au lieu de `MAX`) repasserait côté écran.',
    ).toContain('[acquis]');
    await page.close();
  });

  test('`serveur` mord : une progression illisible est rapportée', async ({ context }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    await preparer(page);
    await page.route('**/api/profils/*/progression', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    // Un changement d'écran déclenche l'interrogation du serveur.
    await choisirLeProfil(page);

    const rapport = await attendreLaMorsure(page, sentinelle, 'serveur');
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu que le serveur refusait la progression du profil affiché : ' +
        'l’écran et la base pourraient diverger sans que rien ne le dise.',
    ).toContain('[serveur]');
    await page.close();
  });

  /**
   * LE CONTRÔLE QUI COMPTE LE PLUS — le défaut n° 4 du père, réinjecté SANS RECOMPILER.
   *
   * On coupe `POST /api/tentatives` au niveau du réseau, exactement ce que faisait le moteur
   * `phrase` en rendant 500. `EcranRecompense` avale l'échec dans un `console.warn` — par
   * conception, et c'est une bonne conception : « une écriture perdue ne doit jamais gâcher la
   * fin de partie de l'enfant ». L'enfant termine, voit ses étoiles, et rien n'est sauvé.
   *
   * Aucun test du dépôt ne voyait ça au milieu d'un parcours. L'invariant `serveur` le voit.
   */
  test('`serveur` mord : l’enfant voit ses étoiles et le journal reste vide (défaut n° 4)', async ({
    context,
  }) => {
    const { page, sentinelle } = await pageSousSentinelle(context);
    const noeudColorie =
      noeudsLivres().find((n) => n.moteur === 'colorie')?.id ?? noeudsLivres()[0]!.id;

    await preparer(page, 'ControlePositif');
    await page.route('**/api/tentatives', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'erreur-interne', message: 'contrôle positif' }),
      }),
    );
    // LE PRÉNOM EST TRANSMIS — sans lui, `choisirLeProfil` prend la carte la PLUS ANCIENNE et
    // ce contrôle jouait sur le profil d'une recette précédente, qui portait déjà ses trois
    // étoiles : le contrôle positif rendait vert sans que la sentinelle ait rien vu. Mesure et
    // sortie citée dans `qa-outils.jouerJusquALaRecompense`.
    await jouerJusquALaRecompense(page, noeudColorie, 'ControlePositif');
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    // Quitter l'écran de récompense : c'est là que la promesse est enregistrée.
    //
    // Par le RÔLE et non par un `data-vers` : `EcranRecompense` n'en porte aucun, ses deux
    // sorties sont deux `<button>` (« Rejouer », « Retour à la carte »). Une première version
    // visait `[data-vers="carte"]` et attendait 270 s un élément qui n'existe pas — le genre
    // de rouge qui accuse un innocent.
    await page.getByRole('button', { name: /carte/iu }).click();
    await sentinelle.cloturer();

    const rapport = decrireLesViolations(sentinelle.bilan().violations);
    expect(
      rapport.join(' | '),
      'la sentinelle n’a PAS vu une écriture de tentative perdue. C’est le défaut n° 4 du ' +
        'père, mot pour mot : « l’enfant terminait, voyait sa récompense, et rien n’était sauvé ».',
    ).toContain('rien n’a été sauvé');
    await page.close();
  });
});

// ══════════════════════════════════════════════ 3. CE QUE LA CAMPAGNE A RÉELLEMENT AUDITÉ

/**
 * LE CHIFFRE DU LOT — lu dans le journal que les recettes viennent d'écrire, jamais affirmé.
 *
 * Et la propriété que D48 exige : **« mène ailleurs », pas « interactifs > 0 »**. La sentinelle
 * a observé, sur toute la campagne, quel geste a fait changer d'écran depuis quel écran. Un
 * écran où l'on a tapé et dont AUCUN geste n'est jamais sorti, dans aucune recette, est une
 * impasse — c'est la propriété que le bot singe croyait mesurer et ne mesurait pas
 * (`Docs/audit-qa.md` § 6.1).
 */
test('CONTRAT DE SORTIE — invariants × recettes × actions auditées, et aucune impasse', () => {
  const lues = lireLeJournalDesInvariants();
  // ── ON NE COMPTE QUE CE QUE CE PROCESSUS-CI A OBSERVÉ.
  //
  // Le fichier porte déjà le numéro de campagne dans son nom : deux campagnes parallèles ne
  // peuvent plus s'écraser (voir `JOURNAL_INVARIANTS`). Ce filtre-ci est la VÉRIFICATION de
  // cette propriété, pas sa mise en œuvre — si une ligne étrangère apparaissait quand même,
  // elle serait écartée ET signalée, au lieu d'être comptée comme une couverture qu'on n'a
  // pas financée. C'est le défaut n° 2 de l'historique : « la QA se mentait sur sa couverture ».
  const journal = lues.filter((b) => b.campagne === CAMPAGNE_COURANTE);
  expect(
    lues.length - journal.length,
    `le journal de la campagne n° ${String(CAMPAGNE_COURANTE)} contient des bilans écrits par ` +
      'un AUTRE processus. Le fichier est pourtant nommé d’après le processus : cette ligne ' +
      'ne devrait jamais mordre, et si elle mord, le chiffre publié serait emprunté.',
  ).toBe(0);
  expect(
    journal.length,
    'aucun bilan écrit par CE processus. La campagne a été interrompue (Playwright redémarre ' +
      'son processus de travail après un dépassement de délai), ou cette recette a tourné ' +
      'seule. Le chiffre du lot ne peut pas être publié sur des relevés qu’on n’a pas faits.',
  ).toBeGreaterThan(0);

  const habites = new Map<string, number>();
  const avecSortie = new Map<string, Set<string>>();
  const programmees = new Map<string, Set<string>>();
  let releves = 0;
  let gestes = 0;
  const violations: string[] = [];

  for (const bilan of journal) {
    releves += bilan.releves;
    gestes += bilan.gestes;
    for (const violation of bilan.violations) {
      violations.push(`${bilan.cas} → [${violation.code}] ${violation.detail}`);
    }
    for (const [ecran, nb] of Object.entries(bilan.ecransHabites)) {
      habites.set(ecran, (habites.get(ecran) ?? 0) + nb);
    }
    for (const [ecran, sorties] of Object.entries(bilan.sortiesProuvees)) {
      const table = avecSortie.get(ecran) ?? new Set<string>();
      for (const sortie of sorties) table.add(sortie);
      avecSortie.set(ecran, table);
    }
    for (const [ecran, vers] of Object.entries(bilan.transitionsProgrammees)) {
      const table = programmees.get(ecran) ?? new Set<string>();
      for (const cible of vers) table.add(cible);
      programmees.set(ecran, table);
    }
  }

  const casLesPlusAudites = [...journal]
    .sort((a, b) => b.releves - a.releves)
    .slice(0, 3)
    .map((b) => `${b.cas.split(' › ').at(-1) ?? b.cas} (${String(b.releves)} relevés)`);

  console.log(`[q1] invariants ............... ${String(INVARIANTS.length)}`);
  console.log(`[q1] recettes portant le harnais ${String(recettesSurDisque().length)}`);
  console.log(`[q1] cas audités .............. ${String(journal.length)}`);
  console.log(`[q1] relevés (actions vérifiées) ${String(releves)}`);
  console.log(`[q1] gestes observés .......... ${String(gestes)}`);
  console.log(`[q1] écrans habités ........... ${[...habites.keys()].sort().join(', ')}`);
  console.log(`[q1] écrans à sortie prouvée .. ${[...avecSortie.keys()].sort().join(', ')}`);
  console.log(`[q1] parcours les plus audités  ${casLesPlusAudites.join(' · ')}`);

  // ── Aucune violation n'a survécu à la campagne. Redondant avec l'assertion par cas, et
  // c'est voulu : celle-ci l'énonce UNE fois, pour toute la campagne, en un seul endroit.
  expect(violations, 'invariants violés pendant la campagne').toEqual([]);

  // ── LA PROPRIÉTÉ DE D48 : « mène ailleurs », pas « interactifs > 0 ».
  const impasses = [...habites.keys()]
    .filter((ecran) => (avecSortie.get(ecran)?.size ?? 0) === 0)
    .map(
      (ecran) =>
        `« ${ecran} » : ${String(habites.get(ecran))} geste(s) reçus, aucun n’a jamais mené ` +
        `ailleurs dans toute la campagne` +
        (programmees.has(ecran)
          ? ` (on n’en sort que par le magasin : ${[...programmees.get(ecran)!].join(', ')})`
          : ''),
    );
  expect(
    impasses,
    'écrans où l’enfant a tapé et dont aucun tap n’a jamais mené ailleurs. C’est le défaut ' +
      'n° 1 du père, mesuré sur la propriété et non sur l’indice (D48).',
  ).toEqual([]);

  // ── LES PLANCHERS. Sans eux, tout ce qui précède serait vrai sur un journal vide — c'est
  // exactement le « 14 moteurs joués sur 14 » asserté à `> 0` du défaut n° 6.
  expect(releves, 'aucun relevé : la sentinelle n’a rien vu du tout').toBeGreaterThan(0);
  expect(
    habites.size,
    'aucun écran n’a reçu de geste : la campagne n’a rien tapé, la mesure ne vaut rien',
  ).toBeGreaterThan(0);
  expect(
    releves / journal.length,
    'moins d’un relevé par cas en moyenne : la sentinelle est branchée mais muette',
  ).toBeGreaterThan(1);
});
