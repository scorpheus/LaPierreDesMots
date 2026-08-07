/**
 * Outillage commun de la campagne QA — « la qa est extremement important pour tester tout les
 * cas de jeu et tenter de tout realiser » (le père, verbatim).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE PRINCIPE QUI COMMANDE TOUT CE FICHIER : ON AUDITE LES OBJETS, PAS LES OCCURRENCES.
 *
 * Une suite QA écrite à la main énumère les écrans dont son auteur se souvenait le jour où il
 * l'a écrite. Elle reste verte pour toujours — y compris le jour où un écran neuf arrive sans
 * bouton retour, parce que personne n'a pensé à l'ajouter à la liste. C'est exactement la
 * façon dont le défaut du père a survécu à 23 parcours E2E verts.
 *
 * Ici, l'inventaire est DÉRIVÉ du code :
 *   • les écrans, des littéraux `data-ecran="…"` de `client/src/**` — c'est-à-dire de tout ce
 *     que l'application sait rendre, et non de ce qu'un test se rappelle ;
 *   • les moteurs, de l'union `CodeMoteur` de `partage/src/identifiants.ts` ;
 *   • les nœuds jouables, de `contenu/noeuds/*.json`.
 *
 * Conséquence opposable : **un écran ajouté demain sans recette QA fait ÉCHOUER la suite.**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ CORRIGÉ ICI À L'INTÉGRATION, ET POURQUOI C'ÉTAIT GRAVE ────────────────────
 *
 * **1. La QA naviguait par URL, et n'atteignait AUCUN des écrans qu'elle croyait auditer.**
 *
 * `client/src/routeur.tsx` monte `createMemoryHistory({ initialEntries: ['/'] })` — un choix
 * délibéré et documenté (« le jeu est une borne sur tablette »). Un `page.goto('/campement')`
 * recharge donc l'application, qui repart de `/`. Mesuré, les huit routes déclarées :
 *
 *     goto /                 -> data-ecran=profils   location=/
 *     goto /carte            -> data-ecran=profils   location=/carte
 *     goto /campement        -> data-ecran=profils   location=/campement
 *     goto /coffre           -> data-ecran=profils   location=/coffre
 *     goto /reglages-lecture -> data-ecran=profils   location=/reglages-lecture
 *     goto /parent           -> data-ecran=profils   location=/parent
 *     goto /parent/dashboard -> data-ecran=profils   location=/parent/dashboard
 *     goto /ouverture        -> data-ecran=profils   location=/ouverture
 *
 * **Huit routes, un seul écran.** L'ancienne suite auditait l'écran des profils huit fois et
 * publiait « 8 / 8 routes visitées ». Elle ne mentait pas volontairement : elle n'avait
 * simplement aucun moyen de savoir qu'elle n'était jamais arrivée. C'est le mode de
 * défaillance que cette campagne existe pour rendre impossible, et il était DANS l'outil censé
 * l'empêcher. Les recettes ci-dessous naviguent donc comme l'enfant : en tapant.
 *
 * **2. La QA tapait `click`, l'interface écoute `pointerdown`.**
 *
 * `client/src/moteurs/colorie/SceneSvg.tsx` peint sur `onPointerDown`. Un `MouseEvent('click')`
 * synthétique ne le déclenche jamais : l'audit relevait 33 régions « mortes » sur
 * `clairiere-01` alors que toutes répondent au doigt. `taper()` émet désormais la séquence
 * complète — `pointerdown`, `pointerup`, `click` —, c'est-à-dire ce que fait un doigt.
 *
 * **3. La population « interactive » comptait du décor.**
 *
 * `[data-region-svg]` désignait aussi les formes du décor de la carte, qui ne portent aucun
 * gestionnaire et n'ont jamais prétendu en porter. Les régions réellement jouables, elles,
 * reçoivent `role="button"` et `tabindex="0"` de `SceneSvg` — elles restent donc dans la
 * population par `[role="button"]`. On mesure ce que l'arbre d'accessibilité déclare
 * interactif, plus les prises de jeu explicites : rien de moins, mais plus rien de décoratif.
 *
 * Aucune attente de durée (annexe T § 6, règle non négociable de CLAUDE.md) : on attend un
 * ÉTAT, jamais un délai.
 *
 * Ce fichier n'est pas un `*.spec.ts` : `playwright.config.ts` ne collecte que
 * `parcours-*.spec.ts` dans le projet `parcours`. Il est importé, jamais exécuté seul.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

export function cheminDepot(relatif: string): string {
  return fileURLToPath(new URL(relatif, RACINE));
}

export function lireTexte(relatif: string): string {
  return readFileSync(cheminDepot(relatif), 'utf8');
}

export function lireJson<T>(relatif: string): T {
  return JSON.parse(lireTexte(relatif)) as T;
}

export const fixtureProfil = lireJson<Record<string, unknown>>('tests/fixtures/profils/enfant.json');

export const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
export const INSTANT = '2026-09-01T08:00:00Z';

/** Le code du foyer employé par la QA. Même valeur que `parcours-parent.spec.ts`. */
export const CODE_PARENT = '4271';

/**
 * La population « interactive ».
 *
 * `[data-region-svg]` a été RETIRÉ — voir le point 3 de l'en-tête. Les régions jouables
 * entrent par `[role="button"]`, que `SceneSvg` leur pose ; le décor, qui n'en reçoit pas,
 * cesse d'être compté comme une commande morte.
 */
export const SELECTEUR_INTERACTIF = [
  'button:not([disabled])',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  '[data-godet]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** R16 — « cibles ≥ 64 px, tolérance 24 px, aucune coordination fine exigée ». */
export const CIBLE_MINIMALE_PX = 64;

export interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): {
    ecran: string;
    profil: string | null;
    noeud: string | null;
    moteur: string | null;
    progression: unknown;
    etatMoteur: unknown;
    aide: unknown;
  };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
export type FenetreTest = Window & { __test: CrochetsTest };

/** L'écran courant, tel que le DOM le déclare. */
export async function ecranCourant(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector('[data-ecran]')?.getAttribute('data-ecran') ?? 'aucun',
  );
}

/**
 * Où l'on se trouve.
 *
 * Le chemin de `window.location` n'y figure PLUS : l'historique du routeur est en mémoire, donc
 * `location.pathname` ne bouge jamais et l'ajouter revenait à concaténer une constante. Pire,
 * il donnait l'illusion qu'un changement d'écran était observé alors que seule la partie
 * `data-ecran` variait jamais.
 */
export async function positionne(page: Page): Promise<string> {
  return ecranCourant(page);
}

/** Attend un ÉTAT — deux images rendues —, jamais une durée. */
export async function deuxImages(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resoudre) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resoudre();
          });
        });
      }),
  );
}

/**
 * LE MOUCHARD D'ÉCRANS — pose un observateur AVANT que l'application ne monte, et retient
 * TOUT `data-ecran` que le DOM aura porté, même une seule image.
 *
 * ── POURQUOI IL EXISTE, ET C'EST UNE MESURE, PAS UNE PRÉCAUTION ────────────────────────────
 * `chargement` est un écran réel — `client/src/routeur.tsx` le rend tant que
 * `EtatMagasin.ecran` vaut `'chargement'` — mais il est INHABITABLE : `Application.tsx:66-71`
 * en sort dans un `useEffect` de montage, sans attendre le réseau. Le commentaire du fichier
 * l'assume (« un seul pas, et une seule fois »), et c'est un bon choix : l'enfant ne doit pas
 * regarder un écran d'attente parce que le serveur traîne.
 *
 * Conséquence pour la QA : aucune recette ne peut s'y ARRÊTER. J'ai d'abord essayé de retenir
 * `GET /api/profils` indéfiniment ; l'application passe quand même à `profils`, parce que la
 * transition ne dépend pas de cette requête. L'écran reste donc invisible à toute recette.
 *
 * Deux façons de traiter ça, et une seule est honnête :
 *   • l'exempter de l'inventaire — c'est-à-dire s'accorder une dérogation, et une QA qui a le
 *     droit de s'exempter n'a plus de couverture opposable ;
 *   • **l'OBSERVER**, ce que fait ce mouchard. `chargement` entre alors dans la couverture
 *     parce qu'il a réellement été vu, pas parce qu'on a décidé de l'oublier.
 *
 * Les audits « une sortie », « R16 » et « aucun élément mort » ne s'y appliquent pas, et c'est
 * mécaniquement fondé plutôt que décrété : ils portent sur les écrans où l'enfant peut rester
 * et taper. Un écran sans le moindre élément interactif, dont on sort sans rien faire, n'a ni
 * sortie à chercher ni cible à mesurer.
 */
const MOUCHARDS_POSES = new WeakSet<Page>();

export async function installerMouchardDEcrans(page: Page): Promise<void> {
  // Un seul par page : `addInitScript` s'ACCUMULE sur le contexte, et une recette appelée
  // vingt fois poserait vingt observateurs sur chaque rechargement.
  if (MOUCHARDS_POSES.has(page)) return;
  MOUCHARDS_POSES.add(page);
  await page.addInitScript(() => {
    const vus = new Set<string>();
    (window as unknown as { __ecransVus: Set<string> }).__ecransVus = vus;

    const noter = (noeud: Node | null): void => {
      if (noeud === null || noeud.nodeType !== 1) return;
      const element = noeud as Element;
      const propre = element.getAttribute('data-ecran');
      if (propre !== null && propre.length > 0) vus.add(propre);
      for (const descendant of element.querySelectorAll('[data-ecran]')) {
        const code = descendant.getAttribute('data-ecran');
        if (code !== null && code.length > 0) vus.add(code);
      }
    };

    /**
     * On lit les ENREGISTREMENTS, pas seulement le DOM courant — et c'est la seule version
     * qui marche. Un `MutationObserver` livre ses lots à la fin du micro-tâche : relire
     * `document` à ce moment-là rate tout écran déjà remplacé entre-temps, ce qui est
     * exactement le cas de `chargement` (remplacé par `profils` dans l'effet de montage).
     * Les nœuds retirés, eux, restent dans `record.addedNodes` du lot où ils sont apparus.
     */
    const observateur = new MutationObserver((lots) => {
      for (const lot of lots) {
        for (const ajoute of lot.addedNodes) noter(ajoute);
        noter(lot.target);
        // React reutilise le meme <main> d'un ecran a l'autre : le changement n'est alors ni
        // un ajout ni un retrait, seulement un attribut qui bascule. Sans l'ancienne valeur,
        // l'ecran quitte est perdu.
        if (lot.type === 'attributes' && lot.oldValue !== null) vus.add(lot.oldValue);
      }
      noter(document.documentElement);
    });
    // `documentElement` existe déjà quand un script d'initialisation s'exécute ; on observe
    // donc l'arbre entier, dès avant que React ne monte quoi que ce soit.
    // `document` et NON `document.documentElement` : au moment ou un script d'initialisation
    // s'execute, l'element racine est celui du document vide, et l'analyseur le REMPLACE
    // ensuite. Observer ce noeud-la revient a n'observer rien — mesure a l'appui, le mouchard
    // ne relevait aucun ecran, pas meme `profils`. `document` est stable.
    observateur.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['data-ecran'],
    });
    noter(document.documentElement);
  });
}

/** Tous les `data-ecran` que cette page a portés depuis son chargement. */
export async function ecransVus(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => [
    ...((window as unknown as { __ecransVus?: Set<string> }).__ecransVus ?? []),
  ]);
}

/**
 * Démarrage SANS profil : animations coupées, graine et horloge figées, et rien d'autre.
 *
 * Indispensable à deux écrans que `preparer()` rend inatteignables, et ce n'est pas un détail
 * de plomberie : `choix-profil-parent` n'existe QUE lorsque `profil` vaut `null`, c'est-à-dire
 * exactement le chemin que le père a pris — la porte parent est en pied de l'écran des profils,
 * donc avant tout choix de joueur. Les deux suites parent existantes appellent `chargerProfil`
 * avant d'ouvrir la porte ; **le seul chemin qu'un humain emprunte était donc le seul qu'aucun
 * test ne prenait**, et c'est écrit noir sur blanc dans `client/src/routeur.tsx`.
 */
export async function preparerSansProfil(page: Page): Promise<void> {
  // Toute interception posee par une recette precedente est LEVEE ici. Sans cela, la recette
  // qui retient le paquet d'un noeud pour observer l'ecran d'attente le retiendrait aussi pour
  // les vingt recettes suivantes — mesure a l'appui : la couverture etait tombee de 12 ecrans
  // a 2. Une mise en place qui fuit sur le cas d'apres est pire qu'une mise en place absente,
  // parce qu'elle fait echouer un cas innocent.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await installerMouchardDEcrans(page);
  await page.goto('/');
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // LE PROFIL MÉMORISÉ SUR L'APPAREIL EST EFFACÉ ICI — sans quoi cette fonction ment sur son
  // propre nom, et c'est mesuré, pas supposé.
  //
  // `client/src/etat/profil-memorise.ts` garde le dernier joueur dans `localStorage` sous
  // `pierre.joueur`. Un `goto('/')` ne le touche pas : l'application le relit au démarrage et
  // saute droit à la carte. « Démarrage SANS profil » ne sautait donc `chargerProfil` que pour
  // retomber sur le profil de la recette PRÉCÉDENTE.
  //
  // Mesuré dans la séquence du contrat de sortie QA, sortie citée :
  //
  //     [diag] après « galerie parent (plein écran) » : data-ecran=galerie-parent
  //     [diag] après preparerSansProfil               : data-ecran=carte
  //     [diag] prises : acces-parent=0 · profils=0
  //
  // `[data-acces-parent]` vit sur l'écran des PROFILS. Sur la carte il n'existe pas, et
  // `ouvrirLaZoneParent` attendait donc 270 s un bouton qui ne viendrait jamais — puis le
  // navigateur se fermait et les 80 recettes suivantes tombaient avec lui. La recette
  // « choix du joueur à suivre » passait SEULE en 1,9 s et échouait en séquence : la signature
  // exacte d'une fuite d'état entre cas, pas d'un défaut de produit.
  //
  // On efface la SEULE clé du joueur, pas tout `localStorage` : les réglages du foyer
  // (`client/src/parent/reglages-foyer.ts`) appartiennent à l'appareil et plusieurs recettes
  // parent s'appuient dessus. Puis on recharge — la lecture se fait au démarrage, donc effacer
  // après coup ne suffirait pas.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  const memorise = await page.evaluate(() => {
    const present = globalThis.localStorage?.getItem('pierre.joueur') ?? null;
    globalThis.localStorage?.removeItem('pierre.joueur');
    return present;
  });
  if (memorise !== null) await page.goto('/');
  await page.waitForFunction(() => (window as unknown as FenetreTest).__test !== undefined);
  await page.evaluate(
    ({ graine, instant }) => {
      const crochets = (window as unknown as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
    },
    { graine: GRAINE, instant: INSTANT },
  );
}

/**
 * Démarrage propre : animations coupées, graine et horloge figées, profil chargé.
 *
 * `prenom` donne un profil VIERGE, et c'est parfois indispensable — jamais un confort.
 * `chargerProfil` (`client/src/testabilite/crochets.ts:159-170`) cherche le profil par son
 * identifiant, puis **retombe sur un profil existant DE MÊME PRÉNOM**, et n'en crée un que si
 * aucun ne correspond. Or la carte lit le monde SUR LE SERVEUR : tout cas qui joue des nœuds
 * laisse une progression que les cas suivants héritent.
 *
 * Mesuré sur cette suite même : l'audit « aucun élément interactif mort » tape tout ce qu'il
 * trouve sur les douze écrans de nœud, termine donc des exercices, et les Galeries se
 * refermaient avant que le cas D38 ne les cherche — `départs offerts : clairiere,
 * marais-jumeau`. La QA se polluait elle-même.
 *
 * ── LA PROMESSE CI-DESSUS ÉTAIT FAUSSE, ET ELLE A DÉSARMÉ UN CONTRÔLE POSITIF ─────────────
 *
 * Elle ne changeait que le PRÉNOM. Or `chargerProfil` cherche **d'abord par `id`**, et l'`id`
 * restait celui de la fixture partagée : le profil « vierge » était donc, dès qu'une recette
 * précédente avait joué, le profil COMMUN avec toute sa progression.
 *
 * Mesuré, sortie citée, sur `parcours-zz-invariants.spec.ts:399` (« l'enfant voit ses étoiles
 * et le journal reste vide », le défaut n° 4 du père réinjecté au réseau) :
 *
 *     ce fichier SEUL ......................... 11 passed
 *     parcours-nominal.spec.ts puis ce fichier .  1 failed, 14 passed
 *
 * Le contrôle positif ne mordait plus, parce que le serveur servait déjà les étoiles laissées
 * par la recette précédente : `servies >= promises`, aucune violation, vert. **Un contrôle
 * positif qui ne mord plus est exactement le test trompeur que ce lot combat**, et il l'était
 * dans le dispositif chargé de prouver que le harnais mord.
 *
 * Le prénom entraîne donc désormais un `id` DÉRIVÉ DE LUI — déterministe, sans horloge ni
 * tirage : `chargerProfil` ne le trouve ni par `id` ni par prénom, et crée un profil neuf.
 */
export async function preparer(page: Page, prenom?: string): Promise<void> {
  await preparerSansProfil(page);
  await page.evaluate(
    async ({ fixture, prenomPropre }) =>
      (window as unknown as FenetreTest).__test.chargerProfil(
        prenomPropre === undefined
          ? fixture
          : {
              ...fixture,
              prenom: prenomPropre,
              id: `profil-test-${prenomPropre.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`,
            },
      ),
    { fixture: fixtureProfil, prenomPropre: prenom },
  );
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
}

export async function etatDuJeu(page: Page): Promise<ReturnType<CrochetsTest['etat']>> {
  return page.evaluate(() => (window as unknown as FenetreTest).__test.etat());
}

// ═══════════════════════════════════════════════════════════════════════ inventaires dérivés

/**
 * Les chemins déclarés par `CHEMINS` dans `client/src/routeur.tsx`.
 *
 * Lu dans le source plutôt qu'importé : Playwright n'a pas les alias `@client/*` de Vitest, et
 * une recopie du littéral serait précisément la liste qui prend du retard.
 */
export function cheminsDuRouteur(): ReadonlyMap<string, string> {
  const source = lireTexte('client/src/routeur.tsx');
  const bloc = /export const CHEMINS\s*=\s*\{([\s\S]*?)\}\s*as const;/.exec(source);
  if (bloc === null) {
    throw new Error(
      'QA : la table `CHEMINS` est introuvable dans client/src/routeur.tsx. ' +
        "L'inventaire des écrans ne peut plus être dérivé — corriger le motif AVANT de continuer.",
    );
  }
  const chemins = new Map<string, string>();
  for (const ligne of bloc[1]!.split('\n')) {
    const entree = /^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*'([^']+)'/.exec(ligne);
    if (entree !== null) chemins.set(entree[1]!, entree[2]!);
  }
  if (chemins.size === 0) {
    throw new Error('QA : `CHEMINS` a été trouvée mais aucune entrée n’a pu en être lue.');
  }
  return chemins;
}

/** Tous les fichiers `.ts`/`.tsx` sous un dossier du dépôt. */
function sourcesDe(dossier: string): readonly string[] {
  const trouves: string[] = [];
  const parcourir = (relatif: string): void => {
    for (const entree of readdirSync(cheminDepot(relatif), { withFileTypes: true })) {
      const chemin = `${relatif}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(entree.name)) trouves.push(chemin);
    }
  };
  parcourir(dossier);
  return trouves;
}

/**
 * TOUS les écrans que l'application sait rendre, lus dans le source.
 *
 * C'EST LE DÉNOMINATEUR DE LA COUVERTURE, et c'est le cœur de la demande du père : « un test
 * qui compte les écrans atteignables et les compare aux écrans visités, et qui ÉCHOUE si
 * l'écart n'est pas nul ».
 *
 * On énumère les littéraux `data-ecran="…"` plutôt que les routes, et la différence est tout
 * l'intérêt : trois écrans du dépôt n'ont AUCUNE route à eux — `profils`, `carte` et `noeud`
 * sont pilotés par l'état du magasin, et `choix-profil-parent` n'apparaît que dans une branche
 * de `HoteDashboard`. Un inventaire fondé sur les routes les aurait tous manqués.
 */
export function ecransDeclares(): readonly string[] {
  const vus = new Set<string>();
  for (const fichier of sourcesDe('client/src')) {
    for (const trouve of lireTexte(fichier).matchAll(/data-ecran="([a-z-]+)"/g)) {
      vus.add(trouve[1]!);
    }
  }
  if (vus.size === 0) {
    throw new Error(
      'QA : aucun `data-ecran="…"` trouvé dans client/src. L’inventaire des écrans serait ' +
        'vide, donc la couverture serait vraie par vacuité — on refuse de continuer.',
    );
  }
  return [...vus].sort();
}

/**
 * Les moteurs déclarés par l'union `CodeMoteur` de `partage/src/identifiants.ts`.
 *
 * C'est la liste des objets qui DEVRAIENT être jouables. La croiser avec les nœuds livrés est
 * tout l'intérêt : « 14 moteurs déclarés, 6 atteignables » est un chiffre qui dit quelque
 * chose, là où « 6 moteurs testés » n'en dit aucun.
 */
export function moteursDeclares(): readonly string[] {
  const source = lireTexte('partage/src/identifiants.ts');
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(source);
  if (bloc === null) {
    throw new Error('QA : l’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts.');
  }
  const moteurs = [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!);
  if (moteurs.length === 0) {
    throw new Error('QA : `CodeMoteur` a été trouvée mais aucun membre n’a pu en être lu.');
  }
  return moteurs;
}

export interface NoeudLivre {
  readonly id: string;
  readonly region: string;
  readonly exercice: string;
  readonly moteur: string;
}

/**
 * Les nœuds livrés, chacun avec le moteur de son exercice.
 *
 * Un nœud dont l'exercice est introuvable est une donnée cassée : on le signale au lieu de le
 * sauter, sinon la couverture des moteurs se calculerait sur un dénominateur silencieusement
 * réduit — le mode de défaillance que ce fichier existe pour empêcher.
 */
export function noeudsLivres(): readonly NoeudLivre[] {
  const noeuds: NoeudLivre[] = [];
  const exercices = new Map<string, string>();

  for (const region of readdirSync(cheminDepot('contenu/exercices'), { withFileTypes: true })) {
    if (!region.isDirectory()) continue;
    for (const fichier of readdirSync(cheminDepot(`contenu/exercices/${region.name}`))) {
      if (!fichier.endsWith('.json')) continue;
      const exercice = lireJson<{ id: string; jeu: { moteur: string } }>(
        `contenu/exercices/${region.name}/${fichier}`,
      );
      exercices.set(exercice.id, exercice.jeu.moteur);
    }
  }

  for (const fichier of readdirSync(cheminDepot('contenu/noeuds'))) {
    if (!fichier.endsWith('.json')) continue;
    const noeud = lireJson<{ id: string; region: string; exercice: string }>(
      `contenu/noeuds/${fichier}`,
    );
    const moteur = exercices.get(noeud.exercice);
    if (moteur === undefined) {
      throw new Error(
        `QA : le nœud « ${noeud.id} » désigne l'exercice « ${noeud.exercice} », qui n'existe ` +
          `pas dans contenu/exercices/. Donnée cassée — la couverture des moteurs serait fausse.`,
      );
    }
    noeuds.push({ id: noeud.id, region: noeud.region, exercice: noeud.exercice, moteur });
  }
  if (noeuds.length === 0) {
    throw new Error('QA : aucun nœud livré. La couverture des moteurs serait vraie par vacuité.');
  }
  return noeuds;
}

// ═════════════════════════════════════════════════════════════════ mesures faites sur l'écran

export interface CibleTropPetite {
  readonly description: string;
  readonly largeur: number;
  readonly hauteur: number;
}

/**
 * R16 — les cibles trop petites de l'écran courant.
 *
 * Ne sont mesurés que les éléments VISIBLES et de surface non nulle : un contrôle masqué ou
 * replié ne demande aucune coordination au doigt, et le compter rendrait la mesure
 * ininterprétable.
 */
export async function ciblesTropPetites(page: Page): Promise<readonly CibleTropPetite[]> {
  return page.evaluate(
    ({ selecteur, minimum }) =>
      [...document.querySelectorAll(selecteur)]
        .map((noeud) => {
          const element = noeud as HTMLElement;
          const boite = element.getBoundingClientRect();
          const nom =
            element.getAttribute('aria-label') ??
            element.getAttribute('data-region-svg') ??
            (element.textContent ?? '').trim().slice(0, 40);
          return {
            description: `${element.tagName.toLowerCase()} « ${nom} »`,
            largeur: Math.round(boite.width),
            hauteur: Math.round(boite.height),
          };
        })
        // Surface nulle = non rendu à l'écran : hors sujet pour une règle de coordination.
        .filter((c) => c.largeur > 0 && c.hauteur > 0)
        .filter((c) => c.largeur < minimum || c.hauteur < minimum),
    { selecteur: SELECTEUR_INTERACTIF, minimum: CIBLE_MINIMALE_PX },
  );
}

/**
 * Tape l'élément de rang `rang` COMME UN DOIGT, et dit ce que le tap a changé.
 *
 * La séquence `pointerdown` → `pointerup` → `click` n'est pas un excès de prudence : c'est la
 * correction du point 2 de l'en-tête. `SceneSvg` peint sur `pointerdown`, les boutons React
 * répondent à `click` ; n'émettre que le second faisait passer 33 régions vivantes pour
 * mortes, et n'émettre que le premier raterait tous les boutons. Un doigt réel produit les
 * trois, dans cet ordre.
 *
 * `dispatchEvent` et non `.click()` : les éléments SVG (`role="button"` posé sur un `<circle>`)
 * n'exposent pas tous `click`.
 */
export async function taperElement(
  page: Page,
  rang: number,
): Promise<{ description: string; domChange: boolean } | null> {
  const avant = await page.evaluate(() => document.body.innerHTML);
  const decrit = await page.evaluate(
    ({ selecteur, index }) => {
      const cible = document.querySelectorAll(selecteur)[index];
      if (cible === undefined) return null;
      const element = cible as HTMLElement;
      const nom =
        element.getAttribute('aria-label') ??
        element.getAttribute('data-region-svg') ??
        (element.textContent ?? '').trim().slice(0, 40);

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
      return `${element.tagName.toLowerCase()} « ${nom} »`;
    },
    { selecteur: SELECTEUR_INTERACTIF, index: rang },
  );
  if (decrit === null) return null;
  await deuxImages(page);
  const apres = await page.evaluate(() => document.body.innerHTML);
  return { description: decrit, domChange: apres !== avant };
}

// ══════════════════════════════════════════════════════════════════ recettes d'accès (écrans)

export interface EcranQA {
  /** Le nom lisible. */
  readonly nom: string;
  /** Le `data-ecran` que la recette doit atteindre — vérifié, jamais supposé. */
  readonly attendu: string;
  /** Navigue depuis un `preparer()` frais. */
  readonly aller: (page: Page) => Promise<void>;
}

export async function choisirLeProfil(page: Page, prenom?: string): Promise<void> {
  // Quand un prénom propre est demandé, on vise SA carte : plusieurs profils coexistent dans
  // la base partagée de la suite, et `.first()` désignerait le plus ancien.
  const carte =
    prenom === undefined
      ? page.locator('[data-profil]').first()
      : page.locator('[data-profil]').filter({ hasText: prenom }).first();
  await carte.click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

export async function entrerDansLeNoeud(
  page: Page,
  noeud: string,
  prenom?: string,
): Promise<void> {
  await choisirLeProfil(page, prenom);
  await page.evaluate(
    async (id) => (window as unknown as FenetreTest).__test.allerAuNoeud(id),
    noeud,
  );
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
}

/**
 * Ouvre la zone parent et rend la main sur le dashboard.
 *
 * Le code du foyer est POSÉ ici quand il n'existe pas encore : depuis le lot N5,
 * `POST /api/parent/ouvrir` ne le pose plus en silence (c'était le défaut qui faisait d'un
 * enfant tapant `1234` le propriétaire du code). La porte rend donc `data-parent-mode`
 * = `definition` sur une base neuve, et `ouverture` ensuite ; les deux mènent au dashboard
 * avec le même pavé, ce qui est exactement ce que N5 avait promis.
 */
export async function ouvrirLaZoneParent(page: Page): Promise<void> {
  // ── LE VERROU EST UNE RESSOURCE PARTAGÉE, ET IL SE DIAGNOSTIQUE ICI ──────────────────────
  //
  // `verrou_parent` n'a qu'UNE ligne pour tout le foyer, l'horloge du serveur est l'horloge
  // système (non injectable — `serveur/src/index.ts:14` importe `horloge` telle quelle), et
  // `DUREE_VERROU_MS` vaut 900_000, soit QUINZE MINUTES. La suite E2E tourne sur UN serveur
  // et UNE base `:memory:` pour tous ses fichiers.
  //
  // Conséquence mesurée : `parcours-parent.spec.ts` éprouve le verrou en envoyant cinq codes
  // faux — c'est son travail, et il le fait bien — puis la porte reste close pour tout ce qui
  // s'exécute après lui. Les trois recettes parent de la QA échouaient alors sans que rien ne
  // dise pourquoi ; isolées, elles passaient. C'est un défaut d'ISOLATION de la suite, pas du
  // produit, et le pire des défauts de test : celui qui accuse un innocent.
  //
  // Deux remèdes, et il faut les deux :
  //   • les fichiers de la QA sont nommés `parcours-audit-*` pour passer AVANT
  //     `parcours-parent` (Playwright ordonne par chemin) ;
  //   • et si l'ordre change un jour, le contrôle ci-dessous le DIT au lieu de laisser
  //     échouer un `click` sur un délai de 90 s.
  const etat = await page.request.get('/api/parent/etat');
  if (etat.ok()) {
    const lu = (await etat.json()) as { readonly verrouilleJusqua?: string | null };
    expect(
      lu.verrouilleJusqua ?? null,
      'La porte parent est VERROUILLÉE avant que la QA n’ouvre. Un test antérieur a épuisé ' +
        'les 5 essais du foyer (voir parcours-parent.spec.ts) et le verrou dure 15 minutes. ' +
        'Ce n’est pas un défaut du produit : c’est l’ordre des fichiers. Les specs de la QA ' +
        'doivent passer AVANT parcours-parent.spec.ts — d’où leur préfixe `parcours-audit-`.',
    ).toBeNull();
  }

  await page.locator('[data-acces-parent]').click();
  await attendreQueLaPorteAitDecide(page);
  for (const chiffre of CODE_PARENT) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
}

/**
 * ATTEND QUE LA PORTE PARENT AIT DÉCIDÉ QUEL PAVÉ ELLE EST — avant qu'on y tape le moindre
 * chiffre. Posé par le lot P1, sur un défaut mesuré deux fois.
 *
 * ── LE DÉFAUT, ET IL N'EST PAS UNE LENTEUR ────────────────────────────────────────────────
 *
 * `EcranCodeParent` le déclare lui-même, en tête de fichier :
 *
 *     « TANT QUE L'ÉTAT N'EST PAS CONNU, on rend le pavé d'ouverture plutôt qu'un écran
 *       d'attente […] Si la réponse dit "aucun code", l'écran bascule »
 *
 * `[data-parent="code"]` devient donc visible AVANT que `GET /api/parent/etat` ait répondu, et
 * l'écran se remplace ensuite par `EcranDefinirCode` — un autre composant, avec son propre
 * `useState('')`. **Les chiffres déjà tapés partent avec l'ancien composant.** Le bouton
 * « Poser ce code » reste alors désactivé pour toujours (`saisie.length !== LONGUEUR_CODE`),
 * et la recette attend un bouton qui ne s'activera jamais.
 *
 * Mesuré, deux fois, sortie citée (`bac-a-sable/p1-parallelisme/traque.ndjson`) :
 *
 *     locator resolved to <button disabled … data-valider="code-parent" data-definir="code-parent">
 *       181 × waiting for element to be visible, enabled and stable — element is not enabled
 *
 * et l'un des deux relevés a tenu **270 s** (un cas `test.slow()`) sans que le bouton bouge :
 * ce n'est donc pas un délai trop court, c'est un ÉTAT BLOQUÉ. Allonger le garde-fou n'aurait
 * rien réparé et aurait seulement rendu l'échec plus lent à venir.
 *
 * Pourquoi c'est apparu maintenant : avec l'ancien serveur unique, un code du foyer était posé
 * par la première recette parent de la campagne, et toutes les suivantes trouvaient donc le
 * pavé d'OUVERTURE, sans bascule. Un serveur neuf par cas remet chaque recette devant une
 * porte vierge — c'est-à-dire devant le chemin que le père prend le tout premier jour.
 *
 * ── CE QUE CETTE FONCTION FAIT, ET CE QU'ELLE NE FAIT PAS ─────────────────────────────────
 *
 * Elle demande au SERVEUR ce que la porte est, puis attend que l'écran le dise. C'est une
 * attente d'ÉTAT (annexe T § 6), pas une durée, et elle ajoute une assertion au lieu d'en
 * retirer une : si l'écran affichait un mode que le serveur contredit, la recette échouerait
 * ici, en le nommant.
 *
 * Elle ne masque rien du produit. Le défaut d'ergonomie reste entier et il est consigné
 * (`Docs/questions-en-attente.md`, § P1) : **un parent qui tape ses quatre chiffres dans les
 * premiers instants les perd sans un mot.** Le réparer appartient au lot qui possède
 * `client/src/ecrans/EcranCodeParent.tsx`.
 */
export async function attendreQueLaPorteAitDecide(page: Page): Promise<void> {
  const reponse = await page.request.get('/api/parent/etat');
  // Une porte verrouillée (423) est une porte qui A un code : c'est le pavé d'ouverture.
  let codeDefini = true;
  if (reponse.ok()) {
    const lu = (await reponse.json()) as { readonly codeDefini?: unknown };
    codeDefini = lu.codeDefini === true;
  }
  const mode = codeDefini ? 'ouverture' : 'definition';
  await expect(
    page.locator(`[data-parent="code"][data-parent-mode="${mode}"]`),
    `le serveur dit que le foyer ${codeDefini ? 'A' : 'N’A PAS'} de code : la porte doit ` +
      `afficher le pavé « ${mode} » avant qu’on y tape quoi que ce soit. Taper pendant la ` +
      'bascule fait perdre les chiffres — voir l’encadré de `attendreQueLaPorteAitDecide`.',
  ).toBeVisible();
}

/** Joue un nœud `colorie` jusqu'à l'écran de récompense, par le magasin. */
export async function jouerJusquALaRecompense(
  page: Page,
  noeud: string,
  prenom?: string,
): Promise<void> {
  // `prenom` est TRANSMIS jusqu'à `choisirLeProfil`, et c'est une correction mesurée, pas un
  // confort. Sans lui, `choisirLeProfil` prend `[data-profil]` **en premier**, c'est-à-dire le
  // profil le plus ANCIEN de la base partagée de la campagne — jamais celui que la recette
  // vient de préparer. Le contrôle positif « l'enfant voit ses étoiles et le journal reste
  // vide » jouait donc sur le profil d'une recette précédente, qui portait déjà ses 3 étoiles :
  //
  //     [diag-fin] profil = prf-d5bd… « Alma »   (créé par parcours-nominal)
  //               prog   = [{ noeud: 'clairiere-01', etoiles: 3, nbTentatives: 1 }]
  //     [diag]     servies:clairiere-01 = 3 · promis = 3   → aucune violation, VERT
  //
  // Le contrôle rendait vert alors que la sentinelle n'avait rien vu : c'est le test trompeur
  // que ce lot combat, à l'intérieur du dispositif qui doit prouver que le harnais mord.
  await entrerDansLeNoeud(page, noeud, prenom);
  await page.evaluate(async () => {
    const crochets = (window as unknown as FenetreTest).__test;
    interface EtatColorieLu {
      readonly indexConsigne: number;
      readonly consignes: ReadonlyArray<{
        readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }>;
      }>;
    }
    // Borne de sécurité, jamais une attente : 6 consignes × 9 cibles × 2 actions = 108.
    for (let tour = 0; tour < 160; tour += 1) {
      const etat = crochets.etat();
      if (etat.ecran === 'recompense') return;
      const moteur = etat.etatMoteur as EtatColorieLu | null;
      const cible = moteur?.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
      if (cible === undefined) return;
      await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur });
      await crochets.repondre({ type: 'peindre', region: cible.region });
    }
  });
}

/**
 * LES RECETTES — comment l'enfant (ou le parent) arrive sur chaque écran.
 *
 * Chacune part d'un `preparer()` frais et navigue EN TAPANT. Aucune n'emploie `page.goto` :
 * l'historique du routeur est en mémoire, et un `goto` recharge l'application sur `/` — voir
 * l'en-tête de `qa-outils.ts`, mesure à l'appui.
 */
export function recettesDEcrans(): readonly EcranQA[] {
  const NOEUDS = noeudsLivres();
  /** Le premier nœud `colorie` : c'est par lui qu'on atteint l'écran de récompense. */
  const NOEUD_COLORIE = NOEUDS.find((n) => n.moteur === 'colorie')?.id ?? NOEUDS[0]!.id;
  return [
  {
    nom: 'profils (accueil)',
    attendu: 'profils',
    aller: preparer,
  },
  {
    nom: 'carte du monde',
    attendu: 'carte',
    aller: async (page) => {
      await preparer(page);
      await choisirLeProfil(page);
    },
  },
  {
    nom: 'séquence d’ouverture',
    attendu: 'ouverture',
    aller: async (page) => {
      await preparer(page);
      await choisirLeProfil(page);
      await page.locator('[data-vers="ouverture"]').click();
      // ── ON ATTEND QUE LE RÉCIT SOIT ARRIVÉ, PAS SEULEMENT QUE L'ÉCRAN SOIT MONTÉ.
      //
      // `data-ecran="ouverture"` devient visible avant que `contenu/monde/ouverture.json` ne
      // soit chargé ; tant qu'il ne l'est pas, `tableaux` est vide, `dernier` vaut vrai et
      // l'écran n'offre plus qu'UNE prise — le bouton « Passer l'histoire » n'est rendu que
      // sur les tableaux non finaux. L'audit des sorties tombait alors sur un écran qui n'a
      // pas fini d'arriver, et l'accusait d'être une impasse. Mesuré une fois sur six
      // campagnes, sortie citée (`bac-a-sable/p1-parallelisme/traque.ndjson`) :
      //
      //     ouverture : 1 éléments interactifs, aucun ne mène ailleurs.
      //
      // `data-tableau-courant` vaut littéralement `aucun` tant que la séquence n'est pas là
      // (`EcranOuverture.tsx:138`) : l'écran publie donc déjà l'état qu'il faut attendre. On
      // attend un ÉTAT, jamais une durée (annexe T § 6), et aucune assertion n'est touchée —
      // l'audit juge ensuite exactement ce qu'il jugeait, sur un écran complet.
      await expect(
        page.locator('[data-ecran="ouverture"]:not([data-tableau-courant="aucun"])'),
        'la séquence d’ouverture doit avoir chargé son récit avant qu’on audite ses sorties : ' +
          'un écran qui n’a pas fini d’arriver n’offre pas encore toutes ses prises.',
      ).toBeVisible();
    },
  },
  {
    nom: 'campement',
    attendu: 'campement',
    aller: async (page) => {
      await preparer(page);
      await choisirLeProfil(page);
      await page.locator('[data-vers="campement"]').click();
    },
  },
  {
    nom: 'coffre',
    attendu: 'coffre',
    aller: async (page) => {
      await preparer(page);
      await choisirLeProfil(page);
      await page.locator('[data-vers="campement"]').click();
      await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
      await page.locator('[data-vers="coffre"]').click();
    },
  },
  {
    nom: 'réglages de lecture',
    attendu: 'reglages-lecture',
    aller: async (page) => {
      await preparer(page);
      await page.locator('[data-reglages-lecture]').first().click();
    },
  },
  {
    nom: 'porte de la zone parent',
    attendu: 'code-parent',
    aller: async (page) => {
      await preparer(page);
      await page.locator('[data-acces-parent]').click();
    },
  },
  {
    nom: 'suivi parent (dashboard)',
    attendu: 'dashboard',
    aller: async (page) => {
      await preparer(page);
      await ouvrirLaZoneParent(page);
    },
  },
  {
    nom: 'galerie parent (plein écran)',
    attendu: 'galerie-parent',
    aller: async (page) => {
      await preparer(page);
      await ouvrirLaZoneParent(page);
      await expect(page.locator('[data-ecran="dashboard"]')).toBeVisible();
      await page.locator('[data-onglet-parent="galerie"]').click();
      await page.locator('[data-vers="galerie-parent"]').click();
    },
  },
  /**
   * LA VISITE DES ÉCRANS — R38, livrée par le lot V1, et le 14ᵉ `data-ecran` du dépôt.
   *
   * ── POURQUOI CETTE RECETTE EXISTE, ET POURQUOI ELLE N'EST PAS UN DÉTAIL ──────────────────
   *
   * `ecransDeclares()` lit les littéraux `data-ecran="…"` du client : le jour où V1 a livré
   * `visite-parent`, elle est passée de 13 à 14 **toute seule**, sans que personne ne la
   * touche. `recettesDEcrans()`, elle, est une liste de chemins écrits à la main — c'est
   * inévitable, un chemin de navigation ne se devine pas — et elle est donc restée à 13
   * écrans nommés. L'écart entre les deux est exactement ce que
   * `parcours-audit-tout-le-site.spec.ts` fait échouer sous le nom « CONTRAT DE SORTIE QA :
   * écrans déclarés = écrans visités, écart nul ».
   *
   * **C'est le mécanisme qui fonctionne, pas une négligence** : un écran ajouté sans recette
   * QA fait rougir la suite, au lieu de disparaître en silence. La recette ci-dessous est la
   * réponse attendue, pas un contournement.
   *
   * ── LE CHEMIN, ET IL EST CELUI DU PÈRE ───────────────────────────────────────────────────
   *
   *     accueil → « Espace des parents » → code à 4 chiffres → « Entrer »
   *            → suivi (dashboard) → « Visite des écrans » (en-tête)
   *
   * On passe par `ouvrirLaZoneParent`, comme les trois autres recettes parent : elle porte le
   * diagnostic du verrou de 15 minutes et l'attente de la bascule du pavé. Rien n'est injecté —
   * `data-vers="visite-parent"` est la même convention que `data-vers="galerie-parent"` deux
   * lignes plus bas dans `EcranDashboard.tsx`, donc un seul motif à connaître pour toute la QA.
   *
   * ── UNE SUBTILITÉ QUI VAUT D'ÊTRE ÉCRITE : POURQUOI `preparer` ET NON `preparerSansProfil` ─
   *
   * `HoteVisiteDesEcrans` rend `profil = profilDeSession ?? profilSuivi`, et **retombe sur
   * `ChoixProfilParent` quand les deux sont nuls** (`routeur.tsx`). Partir sans profil
   * n'atteindrait donc pas `visite-parent` mais `choix-profil-parent` — que la recette suivante
   * couvre déjà, et par ce chemin-là précisément. Deux recettes, deux écrans, aucune
   * redondance : c'est le repli de l'hôte qui les sépare, pas une convention de test.
   */
  {
    nom: 'visite des écrans (zone parent)',
    attendu: 'visite-parent',
    aller: async (page) => {
      await preparer(page);
      await ouvrirLaZoneParent(page);
      // On attend l'ÉTAT « le dashboard est monté », jamais un délai : le bouton de la visite
      // vit dans son en-tête, et `ouvrirLaZoneParent` rend la main dès la validation du code.
      await expect(page.locator('[data-ecran="dashboard"]')).toBeVisible();
      await page.locator('[data-vers="visite-parent"]').click();
    },
  },
  {
    nom: 'choix du joueur à suivre (parent sans profil)',
    attendu: 'choix-profil-parent',
    aller: async (page) => {
      // Le chemin que le père a réellement pris : la porte parent est en pied de l'écran des
      // profils, donc AVANT tout choix de joueur. `profil` y vaut `null`.
      await preparerSansProfil(page);
      await ouvrirLaZoneParent(page);
    },
  },
  {
    nom: 'récompense',
    attendu: 'recompense',
    aller: async (page) => {
      await preparer(page);
      await jouerJusquALaRecompense(page, NOEUD_COLORIE);
    },
  },
  ...NOEUDS.map((noeud) => ({
    nom: `noeud/${noeud.id} (moteur ${noeud.moteur})`,
    attendu: 'noeud',
    aller: async (page: Page) => {
      await preparer(page);
      await entrerDansLeNoeud(page, noeud.id);
    },
  })),
  ];
}
