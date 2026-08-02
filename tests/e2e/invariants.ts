/**
 * LES INVARIANTS GLOBAUX — lot QA Q1.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE CONSTAT QUI COMMANDE CE FICHIER
 *
 * Les recettes de ce dépôt vérifient l'état à la FIN. Les six défauts que le père a trouvés
 * sont tous apparus AU MILIEU : l'écran sans issue était au bout d'un chemin que personne
 * n'avait parcouru en entier, la perte silencieuse du moteur `phrase` s'est produite pendant
 * que l'écran de récompense affichait ses étoiles, la carte s'est figée à la 19ᵉ minute d'un
 * profil vécu.
 *
 * Un test de fin ne peut pas voir ça. Il regarde une photo ; le défaut est dans le film.
 *
 * Ce fichier pose donc une SENTINELLE qui regarde le film : elle audite l'application à
 * CHAQUE IMAGE PEINTE où quelque chose a bougé, dans toutes les recettes, et elle nomme la
 * première image fautive. Une recette la branche en changeant UNE LIGNE :
 *
 *     - import { expect, test } from '@playwright/test';
 *     + import { expect, test } from './invariants.js';
 *
 * Rien d'autre. Aucune assertion à recopier, aucun appel à placer, aucun `beforeEach`.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LA SENTINELLE VIT DANS LA PAGE, ET NON DANS PLAYWRIGHT ────────────────────────
 *
 * La première conception enveloppait `Page` et `Locator` dans des mandataires pour intercepter
 * `click`, `fill`, `press`… Trois défauts rédhibitoires, et le troisième est le pire :
 *
 *   1. `qa-outils.taperElement()` — l'action LA PLUS FRÉQUENTE de cette QA, celle qui émet
 *      `pointerdown`/`pointerup`/`click` comme un doigt — passe par `page.evaluate`, pas par
 *      `locator.click`. Un mandataire posé sur les méthodes d'action ne l'aurait jamais vue.
 *   2. `window.__test.repondre()` fait jouer un moteur sans toucher au DOM par un geste : même
 *      angle mort.
 *   3. Un aller-retour Playwright par action aurait alourdi une suite de 186 cas d'un facteur
 *      qu'aucun développeur n'accepte, et **une QA trop lente pour être lancée ne garde rien**.
 *
 * La sentinelle est donc INJECTÉE DANS LA PAGE (`addInitScript`) et s'accroche à ce que
 * l'application FAIT, pas à ce que le test APPELLE :
 *   • un `MutationObserver` sur tout le document, coalescé sur `requestAnimationFrame` ;
 *   • les gestes en phase de capture (`pointerdown`, `click`, `keydown`).
 *
 * Conséquence : **toute action, quel que soit le chemin qui l'a produite, est auditée** — le
 * geste d'un `locator.click()`, celui de `taperElement`, une réponse poussée dans le magasin
 * par `repondre()`, un effet de montage de React. On n'audite que des images PEINTES : un état
 * intermédiaire que l'enfant n'a jamais pu voir n'est pas un défaut, et le compter ferait
 * crier au loup — ce qui est la pire chose qui puisse arriver à une suite QA.
 *
 * ── AUCUNE PERTE À LA NAVIGATION ───────────────────────────────────────────────────────────
 *
 * `preparerSansProfil()` fait `page.goto('/')` au début de CHAQUE recette : le contexte de la
 * page est alors détruit, et tout ce que la sentinelle aurait accumulé dedans avec lui. Les
 * relevés sont donc REMONTÉS UN PAR UN vers Playwright par une fonction exposée
 * (`page.exposeFunction`), qui survit aux navigations. Rien n'attend la fin pour être dit.
 *
 * ── CE QUI EST INTERDIT ICI, ET POURQUOI ───────────────────────────────────────────────────
 *
 * Aucun `Date.now()`, aucun `new Date()`, aucun `Math.random()` — y compris dans le code
 * injecté. Les relevés sont numérotés par un COMPTEUR, jamais horodatés : une QA non
 * déterministe est une QA qu'on finit par ignorer (CLAUDE.md, annexe T § 1).
 *
 * Aucune attente de durée. Les deux seules attentes de ce fichier attendent un ÉTAT : une
 * image peinte (`requestAnimationFrame`) et une réponse du serveur.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { expect, test as base } from '@playwright/test';

import { CIBLE_MINIMALE_PX, SELECTEUR_INTERACTIF, cheminDepot } from './qa-outils.js';

import type { Page, TestInfo } from '@playwright/test';

export { expect };

// ═══════════════════════════════════════════════════════════════════════ 1. LES SIX INVARIANTS

export type CodeInvariant = 'issue' | 'echec' | 'acquis' | 'sante' | 'cible' | 'serveur';

export interface DescripteurInvariant {
  readonly code: CodeInvariant;
  readonly titre: string;
  /** La règle du corpus que cet invariant traduit mécaniquement. */
  readonly regle: string;
  /** Le défaut vécu qu'il aurait attrapé. Vide serait un aveu : chacun en porte un. */
  readonly defautGarde: string;
}

/**
 * LES SIX. Un de plus se déclare ici et est audité partout ; il n'y a pas d'autre endroit.
 *
 * Chacun porte le défaut vécu qu'il garde. C'est une contrainte de conception, pas une
 * décoration : un invariant qui ne peut nommer aucun défaut réel est un invariant qu'on a
 * écrit parce qu'il était facile à écrire — exactement le travers que l'audit de la QA
 * (`Docs/audit-qa.md` § 6) a mesuré dans six tests de ce dépôt.
 */
export const INVARIANTS: readonly DescripteurInvariant[] = [
  {
    code: 'issue',
    titre: 'Il existe toujours une issue',
    regle:
      'annexe T § T3 — « aucun état sans issue ». D48 : compter les éléments interactifs ' +
      'n’est pas compter les sorties ; « mène ailleurs » est la propriété.',
    defautGarde:
      'Défaut n° 1 du père : dans Les Galeries, deux boutons, aucun ne menait ailleurs.',
  },
  {
    code: 'echec',
    titre: 'Aucun marqueur d’échec, jamais',
    regle:
      'R14 / CLAUDE.md — « aucun écran d’échec, jamais. Pas de vies, pas de défaite, ' +
      'pas de score négatif. »',
    defautGarde:
      'Mutation M6 de l’audit : `data-etat="echec"` émis sur un refus du moteur `attrape`.',
  },
  {
    code: 'acquis',
    titre: 'Aucune étoile acquise n’a décru',
    regle: 'R14 — « un acquis n’est jamais repris ». Contrat § 6.2 : le journal fait foi.',
    defautGarde:
      'Mutation M5 : `etoiles = excluded.etoiles` au lieu de `MAX` — un acquis repris en base.',
  },
  {
    code: 'sante',
    titre: 'Aucune exception, aucune erreur console, aucun écran blanc',
    regle: 'annexe T § T3 — le bot singe exige « aucune exception non capturée, aucun écran blanc ».',
    defautGarde:
      'Un écran blanc ne se décrit pas : l’enfant arrête simplement de jouer (annexe T § T3).',
  },
  {
    code: 'cible',
    titre: 'Toute cible interactive fait ≥ 64 px',
    regle: 'R16 — « cibles ≥ 64 px, tolérance 24 px, aucune coordination fine exigée ».',
    defautGarde:
      'Mutations M7a, M7b, M23 : trois façons de descendre sous 64 px, aucune vue par la suite ' +
      'unitaire — les trois tombaient dans les dix écrans sans test de composant.',
  },
  {
    code: 'serveur',
    titre: 'L’état serveur est cohérent avec ce qui est affiché',
    regle:
      'Contrat § 6.2 — « toute progression se recalcule depuis le journal ». ' +
      'L’écran ne calcule rien : ce qu’il montre, le serveur doit le porter.',
    defautGarde:
      'Défaut n° 4 du père : le moteur `phrase` rendait 500 à l’enregistrement. L’enfant ' +
      'terminait, voyait sa récompense, et rien n’était sauvé. M17 est la même chose côté client.',
  },
];

/**
 * Les marqueurs d'échec audités par l'invariant `echec`.
 *
 * ── CE N'EST PAS UNE LISTE ÉCRITE À LA MAIN QU'ON LAISSE VIEILLIR ──────────────────────────
 * `parcours-zz-invariants.spec.ts` ÉNUMÈRE les attributs `data-…="echec"` de `client/src/**`
 * et échoue si l'un d'eux n'est pas gardé ici. Un marqueur d'échec inventé demain sous un
 * autre nom fait rougir la QA au lieu de passer sous son nez — c'est l'audit par OBJETS,
 * appliqué au vocabulaire lui-même (D48).
 */
export const SELECTEURS_ECHEC = ['[data-etat="echec"]', '[data-fin="echec"]', '[data-echec]'];

/**
 * UNE ÉTOILE ACQUISE — et rien d'autre.
 *
 * ── UNE MESURE FAUSSE ATTRAPÉE PAR LA MESURE ELLE-MÊME ─────────────────────────────────────
 * La première version comptait `[data-acquise="oui"]` tout court. `parcours-cascade.spec.ts` a
 * immédiatement rendu rouge, avec ce texte :
 *
 *     « l'écran de récompense a montré 4 étoile(s) sur "clairiere-01" ; le serveur en
 *       journalise 3 »
 *
 * Quatre étoiles sur un barème qui en compte trois : la mesure, pas le produit. `JaugePalier`
 * pose lui aussi `data-acquise` sur ses cases (`data-case`), et la cascade en affiche une à
 * côté des trois étoiles. Le compte mêlait deux populations.
 *
 * D'où `[data-etoile]` : on ne compte que les OBJETS dont on parle. Et la jauge est exclue pour
 * une raison de conception, pas par commodité — D25 point 3 : « la jauge montre le VIDE
 * restant, et il DÉCROÎT quand on joue ». Une case de jauge a le droit de disparaître ; une
 * étoile acquise, jamais (R14).
 */
export const SELECTEUR_ETOILE_ACQUISE = '[data-etoile][data-acquise="oui"]';

// ═══════════════════════════════════════════════════════════════════ 2. CE QUE LA PAGE REMONTE

/** Une violation, telle que la sentinelle la voit depuis la page. */
export interface Violation {
  readonly code: CodeInvariant;
  readonly ecran: string;
  readonly geste: string | null;
  readonly detail: string;
  readonly releve: number;
}

/** Un relevé : l'audit d'UNE image peinte. */
export interface Releve {
  readonly n: number;
  readonly ecran: string;
  readonly ecranAvant: string;
  /** La description du geste qui a précédé cette image, ou `null` (effet, magasin, réseau). */
  readonly geste: string | null;
  /**
   * LE GESTE À QUI LA TRANSITION EST IMPUTABLE — `geste` quand il est immédiat, sinon le
   * DERNIER geste reçu sur l'écran de départ depuis qu'on y est entré.
   *
   * ── POURQUOI CE SECOND CHAMP EXISTE. MESURÉ, PAS SUPPOSÉ ─────────────────────────────────
   * `geste` n'est vrai que pour l'image qui suit IMMÉDIATEMENT le tap. Or une sortie d'écran
   * passe très souvent par le réseau : `EcranCodeParent.valider` appelle `ouvrirZoneParent()`
   * puis navigue **dans le `.then()`** (`client/src/ecrans/EcranCodeParent.tsx:117-127`). Entre
   * le tap et le changement d'écran il y a un aller-retour HTTP, donc plusieurs images : le
   * geste a déjà été consommé quand l'écran change, et la sortie était comptée « sans geste ».
   *
   * Sortie citée de la campagne complète, deux exécutions de suite, sur le contrat de sortie :
   *
   *     « code-parent » : 222 geste(s) reçus, aucun n’a jamais mené ailleurs dans toute la
   *     campagne (on n’en sort que par le magasin : → dashboard (sans geste),
   *     → choix-profil-parent (sans geste))
   *
   * L'écran a pourtant DEUX sorties que le doigt actionne : le pavé + « Entrer », et le bouton
   * d'abandon (`routeur.tsx:287`). Le harnais accusait un innocent — c'est exactement le mode
   * de défaillance que ce lot combat, retourné contre lui-même.
   *
   * ── CE QUE LA RÈGLE NE RELÂCHE PAS ───────────────────────────────────────────────────────
   * `dernierGesteSurLEcran` est REMIS À ZÉRO à chaque changement d'écran. Une vraie impasse —
   * l'enfant tape et l'écran ne change JAMAIS — n'a donc aucune transition à créditer et reste
   * signalée. Le défaut n° 1 du père (nœud `trace`, deux boutons, aucune sortie) est toujours
   * attrapé : c'est vérifié par le contrôle positif « `issue` mord ».
   *
   * `geste` est laissé INTACT : tous les invariants (I1, I2, I5, I6) continuent de le lire.
   * Ce champ ne sert qu'à la comptabilité des sorties.
   */
  readonly gesteResponsable: string | null;
  readonly interactifs: number;
  readonly violations: readonly Violation[];
}

/** Le bilan d'un cas de test. Une ligne du journal. */
export interface BilanDInvariants {
  /**
   * L'IDENTITÉ DE LA CAMPAGNE — le numéro du processus qui a écrit ce bilan.
   *
   * ── POURQUOI IL EXISTE, ET C'EST UNE MESURE, PAS UNE PRÉCAUTION ──────────────────────────
   * Sans lui, la recette de clôture a publié « 4 cas audités » en nommant `cassecou` et
   * `singe`, qui n'avaient PAS tourné dans cette invocation : elle lisait un journal laissé
   * par une exécution antérieure. C'est mot pour mot le défaut n° 2 de l'historique de cette
   * QA — « la QA se mentait sur sa couverture » —, reproduit dans le dispositif censé
   * l'empêcher.
   *
   * Le nom du fichier porte désormais ce numéro (voir `JOURNAL_INVARIANTS`), donc le cas ne
   * devrait plus se produire. Le champ reste, et la clôture le VÉRIFIE : une propriété qu'on
   * croit tenue par construction et qu'on ne mesure jamais est une propriété qu'on découvre
   * fausse le jour où elle coûte cher. La clôture refuse de publier un chiffre plutôt que
   * d'en publier un emprunté.
   *
   * `process.pid` n'est ni une horloge ni un tirage au sort : la règle non négociable de
   * CLAUDE.md n'est pas contournée ici.
   */
  readonly campagne: number;
  readonly cas: string;
  readonly fichier: string;
  readonly releves: number;
  readonly gestes: number;
  readonly violations: readonly Violation[];
  /** écran → nombre de gestes reçus pendant qu'il était à l'écran. */
  readonly ecransHabites: Readonly<Record<string, number>>;
  /** écran → descriptions des éléments dont le tap a MENÉ AILLEURS. */
  readonly sortiesProuvees: Readonly<Record<string, readonly string[]>>;
  /** écran → écrans atteints sans geste (effet de montage, `allerAuNoeud`, réseau). */
  readonly transitionsProgrammees: Readonly<Record<string, readonly string[]>>;
}

/**
 * L'IDENTITÉ DE LA CAMPAGNE — le processus PARENT, pas le processus courant.
 *
 * ── ET C'EST UNE CORRECTION MESURÉE, PAS UN RAFFINEMENT ───────────────────────────────────
 * Playwright REDÉMARRE son processus de travail après chaque dépassement de délai. Avec
 * `process.pid`, chaque redémarrage ouvrait un journal neuf : mesuré le 2026-08-02 sur
 * `tests/rapports/`, **30 fichiers, dont 27 ne contenaient qu'un seul cas et zéro relevé**.
 * Une campagne qui subit un seul dépassement de délai aurait donc publié le chiffre du dernier
 * fragment — quelques cas au lieu de deux cents — sans que rien ne signale la perte.
 *
 * `process.ppid` est le processus `@playwright/test/cli.js` qui pilote toute la campagne. Il
 * ne change pas quand un travailleur redémarre, et il DIFFÈRE d'une campagne parallèle à
 * l'autre : c'est exactement la granularité qu'on veut, et la seule qui soit stable.
 *
 * Ni horloge ni tirage au sort : la règle non négociable de CLAUDE.md n'est pas contournée.
 */
export const CAMPAGNE_COURANTE = process.ppid;

/**
 * LE JOURNAL DE CETTE CAMPAGNE — UN FICHIER PAR PROCESSUS, et c'est une correction mesurée.
 *
 * ── CE QUI S'EST PASSÉ AVEC UN FICHIER UNIQUE ─────────────────────────────────────────────
 * Le dépôt fait tourner plusieurs campagnes en parallèle (D10). Mesuré le 2026-08-02 :
 * `npm run test:e2e` a démarré à 12:12:11 pendant qu'un autre tour écrivait depuis 12:10:59.
 * Les deux visaient le MÊME `tests/rapports/invariants-e2e.ndjson`, chacun le remettant à zéro
 * à sa première écriture. Résultat : le tour le plus ancien perdait ses soixante premiers
 * bilans en silence, et sa recette de clôture publiait un chiffre amputé sans savoir qu'il
 * l'était.
 *
 * Le numéro de processus dans le NOM du fichier supprime le problème au lieu de le filtrer :
 * deux campagnes n'écrivent plus jamais dans le même fichier, il n'y a plus de remise à zéro,
 * et rien ne peut être effacé par personne. Le champ `campagne` reste dans chaque ligne — il
 * est la vérification, le nom du fichier n'est que la commodité.
 *
 * Sous `tests/rapports/`, donc jamais versionné (`.gitignore`).
 */
export const JOURNAL_INVARIANTS = cheminDepot(
  `tests/rapports/invariants-e2e.${String(CAMPAGNE_COURANTE)}.ndjson`,
);

function ecrireAuJournal(bilan: BilanDInvariants): void {
  mkdirSync(dirname(JOURNAL_INVARIANTS), { recursive: true });
  appendFileSync(JOURNAL_INVARIANTS, `${JSON.stringify(bilan)}\n`, 'utf8');
}

/** Les bilans de CETTE campagne, et d'aucune autre. */
export function lireLeJournalDesInvariants(): readonly BilanDInvariants[] {
  if (!existsSync(JOURNAL_INVARIANTS)) return [];
  return readFileSync(JOURNAL_INVARIANTS, 'utf8')
    .split('\n')
    .filter((ligne) => ligne.trim().length > 0)
    .map((ligne) => JSON.parse(ligne) as BilanDInvariants);
}

// ═══════════════════════════════════════════════════════════════════ 3. LE CODE INJECTÉ

interface ConfigurationSentinelle {
  readonly selecteurInteractif: string;
  readonly cibleMinimalePx: number;
  readonly selecteursEchec: readonly string[];
  readonly selecteurEtoileAcquise: string;
  readonly nomDuPont: string;
}

/**
 * LA SENTINELLE, telle qu'elle s'exécute DANS la page.
 *
 * Écrite comme une fonction autonome et sérialisée par Playwright : elle ne capture rien de
 * Node. Tout ce dont elle a besoin arrive par `config`.
 *
 * Elle est volontairement DÉFENSIVE sur un seul point : si elle-même lève, elle le DIT
 * (violation `sante`, « la sentinelle a levé ») au lieu de se taire. Une sentinelle aveugle
 * qui rend du vert est pire que pas de sentinelle du tout — c'est la leçon n° 6 de
 * l'historique des échecs de cette QA.
 */
function sentinelleDansLaPage(config: ConfigurationSentinelle): void {
  interface Pont {
    (releve: unknown): Promise<void>;
  }
  interface EtatTest {
    readonly ecran: string;
    readonly profil: string | null;
    readonly noeud: string | null;
  }

  const fenetre = window as unknown as {
    __test?: { etat: () => EtatTest };
    __sentinelle?: { posee: true };
  } & Record<string, unknown>;

  // Un seul observateur par document, même si `addInitScript` est appelé deux fois.
  if (fenetre.__sentinelle !== undefined) return;
  fenetre.__sentinelle = { posee: true };

  // Le pont est résolu À CHAQUE ENVOI, jamais capturé au montage : `exposeFunction` installe
  // sa fonction dans le document neuf, et rien ne garantit l'ordre entre cette installation et
  // l'exécution des scripts d'initialisation. Un pont capturé trop tôt vaudrait `undefined`
  // pour toute la durée de la page — la sentinelle serait muette sans que rien ne le dise.
  const remonter = (charge: unknown): void => {
    const pont = fenetre[config.nomDuPont] as Pont | undefined;
    if (pont === undefined) return;
    // `void` assumé : la remontée ne doit jamais retarder la page ni faire échouer un rendu.
    void pont(charge).catch(() => undefined);
  };

  /** Le numéro du relevé. Un COMPTEUR, jamais un horodatage (aucun `Date.now` ici). */
  let nReleve = 0;
  let arme = false;
  let ecranPrecedent = 'aucun';
  let gesteEnAttente: string | null = null;
  let ecranAuMomentDuGeste = 'aucun';
  let auditPlanifie = false;
  let nbInteractifsPrecedent = -1;
  /**
   * Le dernier geste reçu sur l'écran courant, remis à `null` dès que l'écran change.
   * Voir `Releve.gesteResponsable` pour la mesure qui a rendu ce champ nécessaire.
   */
  let dernierGesteSurLEcran: string | null = null;

  /** L'invariant `acquis`, côté DOM : `profil|ecran` → maximum d'étoiles acquises déjà vu. */
  const maximaAffiches = new Map<string, number>();
  /** L'invariant `acquis`, côté serveur : `noeud` → maximum d'étoiles déjà servi. */
  const maximaServeur = new Map<string, number>();
  /** L'invariant `serveur` : ce que l'écran de récompense a promis et que le serveur doit porter. */
  const promessesDeRecompense = new Map<string, number>();
  let interrogationEnCours = false;

  const violations: { code: string; detail: string }[] = [];
  const signaler = (code: string, detail: string): void => {
    violations.push({ code, detail });
  };

  const decrire = (element: Element): string => {
    const nom =
      element.getAttribute('aria-label') ??
      element.getAttribute('data-region-svg') ??
      (element.textContent ?? '').trim().slice(0, 40);
    return `${element.tagName.toLowerCase()} « ${nom} »`;
  };

  const ecranCourant = (): string =>
    document.querySelector('[data-ecran]')?.getAttribute('data-ecran') ?? 'aucun';

  const etatDuJeu = (): EtatTest | null => {
    try {
      return fenetre.__test?.etat() ?? null;
    } catch {
      return null;
    }
  };

  // ── I4 · santé : erreurs console et exceptions non capturées ─────────────────────────────
  //
  // On enveloppe `console.error` plutôt que d'écouter côté Playwright : ici on connaît l'écran
  // courant et le geste qui précède, donc le rapport nomme le CONTEXTE et pas seulement le
  // message. L'original est toujours appelé — la sentinelle observe, elle n'avale rien.
  const erreurOriginale = console.error.bind(console) as (...a: unknown[]) => void;
  console.error = (...arguments_: unknown[]): void => {
    signaler('sante', `console.error : ${arguments_.map((a) => String(a)).join(' ')}`);
    erreurOriginale(...arguments_);
    planifierAudit();
  };
  window.addEventListener('error', (evenement) => {
    signaler('sante', `exception non capturée : ${String(evenement.message)}`);
    planifierAudit();
  });
  window.addEventListener('unhandledrejection', (evenement) => {
    signaler('sante', `promesse rejetée sans capture : ${String(evenement.reason)}`);
    planifierAudit();
  });

  // ── les gestes ───────────────────────────────────────────────────────────────────────────
  //
  // En phase de CAPTURE sur `document`, donc avant tout gestionnaire de l'application, et
  // quelle que soit la façon dont l'événement a été produit : un vrai doigt, un
  // `locator.click()` de Playwright, ou le `dispatchEvent` de `qa-outils.taperElement()`.
  const noterGeste = (evenement: Event): void => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;
    // L'ÉCRAN EST RELEVÉ AU PREMIER GESTE DU LOT, pas au dernier — et c'est une correction, pas
    // un détail. Un doigt produit `pointerdown` PUIS `click` ; `SceneSvg` peint sur le premier,
    // les boutons React naviguent sur le second, et les trois événements tiennent dans la même
    // image. Relever l'écran au dernier geste aurait donc parfois relevé l'écran d'ARRIVÉE, et
    // la transition — c'est-à-dire la preuve que cet élément mène ailleurs — aurait disparu.
    // La phase de capture garantit que ce relevé précède tout gestionnaire de l'application.
    if (gesteEnAttente === null) ecranAuMomentDuGeste = ecranCourant();
    const interactif = cible.closest(config.selecteurInteractif);
    gesteEnAttente = interactif === null ? decrire(cible) : decrire(interactif);
    planifierAudit();
  };
  for (const type of ['pointerdown', 'click', 'keydown'] as const) {
    document.addEventListener(type, noterGeste, { capture: true, passive: true });
  }

  // ── l'audit d'une image ──────────────────────────────────────────────────────────────────

  function elementsInteractifs(): readonly Element[] {
    return [...document.querySelectorAll(config.selecteurInteractif)];
  }

  /** I5 — R16. Seuls les éléments RENDUS comptent : un contrôle replié n'exige aucun doigt. */
  function auditerLesCibles(interactifs: readonly Element[]): void {
    for (const element of interactifs) {
      const boite = element.getBoundingClientRect();
      const largeur = Math.round(boite.width);
      const hauteur = Math.round(boite.height);
      if (largeur <= 0 || hauteur <= 0) continue;
      if (largeur < config.cibleMinimalePx || hauteur < config.cibleMinimalePx) {
        signaler(
          'cible',
          `${decrire(element)} mesure ${String(largeur)}×${String(hauteur)} px, ` +
            `minimum ${String(config.cibleMinimalePx)} px (R16)`,
        );
      }
    }
  }

  /** I3 — côté DOM. Voir le commentaire de `auditer()` pour le choix des écrans exclus. */
  function auditerLesAcquis(ecran: string, etat: EtatTest | null): void {
    if (ecran === 'recompense' || ecran === 'noeud') return;
    const acquises = document.querySelectorAll(config.selecteurEtoileAcquise).length;
    const cle = `${etat?.profil ?? 'sans-profil'}|${ecran}`;
    const maximum = maximaAffiches.get(cle) ?? 0;
    if (acquises < maximum) {
      signaler(
        'acquis',
        `« ${ecran} » affichait ${String(maximum)} acquis, il n’en affiche plus que ` +
          `${String(acquises)} pour le même profil. Un acquis n’est jamais repris (R14).`,
      );
    }
    maximaAffiches.set(cle, Math.max(maximum, acquises));
  }

  /**
   * CE QUE L'ÉCRAN DE RÉCOMPENSE PROMET À L'ENFANT — relevé PENDANT qu'il est affiché.
   *
   * ── ET PAS AU MOMENT DE LE QUITTER, CE QUI ÉTAIT LA PREMIÈRE VERSION ─────────────────────
   * `retourCarte` appelle `naviguer('carte')` : rien ne garantit que le magasin porte encore
   * `paquet` — donc `etat.noeud` — une image plus tard. Une promesse relevée trop tard aurait
   * été relevée sur un nœud `null`, c'est-à-dire jamais : l'invariant le plus important du lot
   * serait resté VRAI PAR VACUITÉ, et personne ne l'aurait su. On relève sur l'écran.
   *
   * Le POST de `EcranRecompense` part dans un effet de montage et son `catch` est muet par
   * conception (« une écriture perdue ne doit jamais gâcher la fin de partie de l'enfant »).
   * C'est exactement le défaut n° 4 du père : la promesse est faite, et personne ne vérifiait
   * qu'elle était tenue.
   */
  function releverLaPromesse(ecran: string): void {
    if (ecran !== 'recompense') return;
    const etat = etatDuJeu();
    if (etat === null || etat.noeud === null) return;
    const affichees = document.querySelectorAll(config.selecteurEtoileAcquise).length;
    if (affichees === 0) return;
    const dejaPromis = promessesDeRecompense.get(etat.noeud) ?? 0;
    promessesDeRecompense.set(etat.noeud, Math.max(dejaPromis, affichees));
  }

  /**
   * I6 — la cohérence avec le serveur, et I3 côté serveur.
   *
   * Interrogé au CHANGEMENT D'ÉCRAN seulement, pas à chaque image : une requête par image
   * peinte n'apprendrait rien de plus et alourdirait la suite pour rien. La progression ne
   * bouge qu'au passage d'un nœud, c'est-à-dire précisément à un changement d'écran.
   */
  function interrogerLeServeur(): void {
    const etat = etatDuJeu();
    if (etat === null || etat.profil === null || interrogationEnCours) return;

    interrogationEnCours = true;
    const profil = etat.profil;
    void fetch(`/api/profils/${encodeURIComponent(profil)}/progression`)
      .then(async (reponse) => {
        if (!reponse.ok) {
          signaler(
            'serveur',
            `le profil « ${profil} » est affiché mais le serveur répond ` +
              `${String(reponse.status)} sur sa progression`,
          );
          return;
        }
        const lignes = (await reponse.json()) as readonly { noeud: string; etoiles: number }[];
        for (const ligne of lignes) {
          const maximum = maximaServeur.get(ligne.noeud) ?? 0;
          if (ligne.etoiles < maximum) {
            signaler(
              'acquis',
              `le serveur servait ${String(maximum)} étoile(s) sur « ${ligne.noeud} » et n’en ` +
                `sert plus que ${String(ligne.etoiles)}. Un acquis n’est jamais repris (R14).`,
            );
          }
          maximaServeur.set(ligne.noeud, Math.max(maximum, ligne.etoiles));
        }
      })
      .catch((cause: unknown) => {
        signaler('serveur', `la progression du profil affiché est illisible : ${String(cause)}`);
      })
      .finally(() => {
        interrogationEnCours = false;
        planifierAudit();
      });
  }

  function auditer(): void {
    try {
      const ecran = ecranCourant();
      const interactifs = elementsInteractifs();

      // ── ARMEMENT. Tant que l'application n'a rien monté, il n'y a rien à auditer et un
      // « écran blanc » n'en serait pas un : c'est le document vide d'avant React.
      if (!arme) {
        if (ecran === 'aucun') return;
        arme = true;
        ecranPrecedent = ecran;
      }

      const geste = gesteEnAttente;
      const ecranAvant = geste === null ? ecranPrecedent : ecranAuMomentDuGeste;
      gesteEnAttente = null;
      if (geste !== null) dernierGesteSurLEcran = geste;
      // Le geste imputable : celui de cette image, ou le dernier reçu sur l'écran de départ
      // quand la sortie a dû attendre le réseau. Voir `Releve.gesteResponsable`.
      const gesteResponsable =
        geste ?? (ecran !== ecranAvant ? dernierGesteSurLEcran : null);

      // ── I4 · écran blanc ────────────────────────────────────────────────────────────────
      if (ecran === 'aucun') {
        signaler(
          'sante',
          'plus aucun `data-ecran` dans le document : écran blanc. ' +
            'L’enfant ne saura pas le décrire, il arrêtera simplement de jouer.',
        );
      }

      // ── I2 · R14 ────────────────────────────────────────────────────────────────────────
      for (const selecteur of config.selecteursEchec) {
        const marqueurs = document.querySelectorAll(selecteur);
        if (marqueurs.length > 0) {
          signaler(
            'echec',
            `${String(marqueurs.length)} marqueur(s) « ${selecteur} » sur l’écran « ${ecran} ». ` +
              'R14 : aucun écran d’échec, jamais.',
          );
        }
      }

      // ── I1 · l'issue ────────────────────────────────────────────────────────────────────
      //
      // La règle mord au seul moment où elle a un sens : APRÈS UN GESTE qui n'a pas changé
      // d'écran. Un enfant qui tape et reste là doit avoir quelque chose d'autre à taper.
      //
      // Elle ne mord PAS sur un écran atteint sans geste : `chargement` n'a aucun élément
      // interactif et l'application en sort dans un effet de montage (`Application.tsx:66-71`).
      // Ce n'est pas une dérogation qu'on s'accorde — c'est la définition même d'un écran
      // HABITABLE : celui où l'on peut s'arrêter et taper. Le fait mécanique qui le distingue
      // est justement qu'aucun geste ne l'atteint jamais.
      if (geste !== null && ecran === ecranAvant && interactifs.length === 0) {
        signaler(
          'issue',
          `après « ${geste} », l’écran « ${ecran} » n’offre plus aucun élément interactif. ` +
            'C’est une impasse — le défaut n° 1 du père.',
        );
      }

      // ── I3 · les acquis ─────────────────────────────────────────────────────────────────
      const etat = etatDuJeu();
      auditerLesAcquis(ecran, etat);

      // ── I5 · R16 ────────────────────────────────────────────────────────────────────────
      //
      // Mesurée quand la POPULATION change (écran ou nombre de cibles), pas à chaque image :
      // `getBoundingClientRect()` force un calcul de mise en page, et le moteur `colorie`
      // produit des dizaines d'images par seconde sur 33 régions. Une mesure à chaque image
      // aurait rendu la suite inutilisable ; l'audit par écran de
      // `parcours-audit-tout-le-site.spec.ts` reste le filet exhaustif.
      if (ecran !== ecranPrecedent || interactifs.length !== nbInteractifsPrecedent) {
        auditerLesCibles(interactifs);
      }
      nbInteractifsPrecedent = interactifs.length;

      // ── I6 · le serveur ─────────────────────────────────────────────────────────────────
      //
      // La promesse se relève à CHAQUE image de l'écran de récompense (elle ne coûte qu'un
      // `querySelectorAll`) ; le serveur ne s'interroge qu'au changement d'écran, parce que
      // c'est le seul moment où la progression peut avoir bougé.
      releverLaPromesse(ecran);
      if (ecran !== ecranPrecedent) interrogerLeServeur();

      nReleve += 1;
      const aRemonter = violations.splice(0, violations.length);
      remonter({
        n: nReleve,
        ecran,
        ecranAvant,
        geste,
        gesteResponsable,
        interactifs: interactifs.length,
        violations: aRemonter.map((v) => ({
          code: v.code,
          ecran,
          geste,
          detail: v.detail,
          releve: nReleve,
        })),
      });
      // L'écran a changé : le geste qui l'a fait changer a fini son office. Sans cette remise
      // à zéro, un tap sur l'écran A créditerait la sortie de l'écran B où il n'a rien fait.
      if (ecran !== ecranPrecedent) dernierGesteSurLEcran = null;
      ecranPrecedent = ecran;
    } catch (cause) {
      // Une sentinelle qui lève en silence rend du vert sans avoir rien vu. On le DIT.
      remonter({
        n: nReleve,
        ecran: 'aucun',
        ecranAvant: 'aucun',
        geste: null,
        gesteResponsable: null,
        interactifs: 0,
        violations: [
          {
            code: 'sante',
            ecran: 'aucun',
            geste: null,
            detail: `la sentinelle a levé, elle n’a donc rien audité : ${String(cause)}`,
            releve: nReleve,
          },
        ],
      });
    }
  }

  /** Une seule vérification par image PEINTE : on audite un état, jamais un instant. */
  function planifierAudit(): void {
    if (auditPlanifie) return;
    auditPlanifie = true;
    requestAnimationFrame(() => {
      auditPlanifie = false;
      auditer();
    });
  }

  new MutationObserver(() => {
    planifierAudit();
  }).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  planifierAudit();

  /**
   * LA VÉRIFICATION FINALE DES PROMESSES — appelée par Playwright à la fermeture du cas.
   *
   * Elle attend un ÉTAT (la réponse du serveur), jamais une durée : `EcranRecompense` poste
   * dans un effet de montage, la requête peut être encore en vol quand le cas se termine. On
   * réinterroge donc jusqu'à ce que la promesse soit tenue, image après image, avec une borne
   * qui n'est PAS une temporisation mais un refus de boucler à l'infini.
   */
  (fenetre as Record<string, unknown>)['__sentinelleCloturer'] = async (): Promise<unknown[]> => {
    const manquantes: unknown[] = [];
    const etat = etatDuJeu();
    if (etat === null || etat.profil === null || promessesDeRecompense.size === 0) {
      return manquantes;
    }
    const profil = etat.profil;
    const attendreUneImage = (): Promise<void> =>
      new Promise<void>((resoudre) => {
        requestAnimationFrame(() => {
          resoudre();
        });
      });

    for (const [noeud, promises] of promessesDeRecompense) {
      let servies = -1;
      for (let essai = 0; essai < 60; essai += 1) {
        try {
          const reponse = await fetch(`/api/profils/${encodeURIComponent(profil)}/progression`);
          if (reponse.ok) {
            const lignes = (await reponse.json()) as readonly {
              noeud: string;
              etoiles: number;
            }[];
            servies = lignes.find((l) => l.noeud === noeud)?.etoiles ?? 0;
            if (servies >= promises) break;
          }
        } catch {
          // Le serveur n'a pas répondu à cet essai : on retente à l'image suivante.
        }
        await attendreUneImage();
      }
      if (servies < promises) {
        manquantes.push({
          code: 'serveur',
          ecran: 'recompense',
          geste: null,
          detail:
            `l’écran de récompense a montré ${String(promises)} étoile(s) sur « ${noeud} » ; ` +
            `le serveur en journalise ${String(servies)}. L’enfant a terminé, il a vu sa ` +
            'récompense, et rien n’a été sauvé — c’est le défaut n° 4 du père.',
          releve: nReleve,
        });
      }
    }
    return manquantes;
  };
}

// ═══════════════════════════════════════════════════════════════════ 4. LE CÔTÉ PLAYWRIGHT

const NOM_DU_PONT = '__sentinelleReleve';

export interface Sentinelle {
  /** Tous les relevés remontés depuis le début du cas. */
  readonly releves: readonly Releve[];
  /** Le bilan courant, recalculé à la demande. */
  bilan(): Omit<BilanDInvariants, 'campagne' | 'cas' | 'fichier'>;
  /**
   * Solde les promesses en vol (l'écriture du journal par `EcranRecompense`) et fige le bilan.
   *
   * N'ASSERTE RIEN — et c'est délibéré. La sentinelle OBSERVE ; c'est le fixateur du § 5 qui
   * juge. Cette séparation est ce qui rend le harnais testable par lui-même :
   * `parcours-zz-invariants.spec.ts` arme une sentinelle sur une page à part, casse
   * l'application exprès, et exige que la violation soit RAPPORTÉE. Un harnais dont on n'a
   * jamais vu la sentinelle mordre n'a fait ses preuves sur rien.
   */
  cloturer(): Promise<void>;
}

function agregerLeBilan(releves: readonly Releve[]): Omit<BilanDInvariants, 'campagne' | 'cas' | 'fichier'> {
  const violations: Violation[] = [];
  const ecransHabites: Record<string, number> = {};
  const sorties: Record<string, Set<string>> = {};
  const programmees: Record<string, Set<string>> = {};
  let gestes = 0;

  for (const releve of releves) {
    violations.push(...releve.violations);
    if (releve.geste !== null) {
      gestes += 1;
      ecransHabites[releve.ecranAvant] = (ecransHabites[releve.ecranAvant] ?? 0) + 1;
    }
    if (releve.ecran !== releve.ecranAvant && releve.ecranAvant !== 'aucun') {
      // `gesteResponsable` et non `geste` : une sortie qui passe par le réseau change d'écran
      // plusieurs images après le tap. Voir `Releve.gesteResponsable` pour la mesure.
      const responsable = releve.gesteResponsable ?? null;
      const table = responsable === null ? programmees : sorties;
      const cle = releve.ecranAvant;
      (table[cle] ??= new Set<string>()).add(
        responsable === null
          ? `→ ${releve.ecran} (sans geste)`
          : `${responsable} → ${releve.ecran}${releve.geste === null ? ' (après réponse)' : ''}`,
      );
    }
  }

  const aplatir = (table: Record<string, Set<string>>): Record<string, string[]> =>
    Object.fromEntries(Object.entries(table).map(([cle, valeurs]) => [cle, [...valeurs]]));

  return {
    releves: releves.length,
    gestes,
    violations,
    ecransHabites,
    sortiesProuvees: aplatir(sorties),
    transitionsProgrammees: aplatir(programmees),
  };
}

/**
 * Arme la sentinelle sur une page. À appeler AVANT toute navigation.
 *
 * Deux poses, dans cet ordre et il compte : le pont d'abord (`exposeFunction` installe la
 * fonction dans chaque nouveau document, avant les scripts d'initialisation), le script
 * ensuite. L'inverse laisserait la sentinelle sans moyen de parler au premier chargement.
 */
export async function armerLaSentinelle(page: Page): Promise<Sentinelle> {
  const releves: Releve[] = [];

  await page.exposeFunction(NOM_DU_PONT, (releve: Releve) => {
    releves.push(releve);
  });
  await page.addInitScript(sentinelleDansLaPage, {
    selecteurInteractif: SELECTEUR_INTERACTIF,
    cibleMinimalePx: CIBLE_MINIMALE_PX,
    selecteursEchec: SELECTEURS_ECHEC,
    selecteurEtoileAcquise: SELECTEUR_ETOILE_ACQUISE,
    nomDuPont: NOM_DU_PONT,
  } satisfies ConfigurationSentinelle);

  return {
    releves,
    bilan: () => agregerLeBilan(releves),

    async cloturer(): Promise<void> {
      // La page peut avoir été fermée par un échec du cas : on ne transforme pas une panne en
      // seconde panne, on rapporte ce qu'on a.
      if (page.isClosed()) return;
      try {
        const manquantes = await page.evaluate(async () => {
          const cloturer = (window as unknown as Record<string, unknown>)[
            '__sentinelleCloturer'
          ] as (() => Promise<unknown[]>) | undefined;
          return cloturer === undefined ? [] : await cloturer();
        });
        if (manquantes.length > 0) {
          releves.push({
            n: releves.length + 1,
            ecran: 'recompense',
            ecranAvant: 'recompense',
            geste: null,
            gesteResponsable: null,
            interactifs: 0,
            violations: manquantes as readonly Violation[],
          });
        }
      } catch {
        // Contexte détruit avant la clôture : rien à ajouter, rien à cacher.
      }
    },
  };
}

/** Le texte d'un rapport de violations — le même partout, donc lisible partout. */
export function decrireLesViolations(violations: readonly Violation[]): readonly string[] {
  return violations.map(
    (v) =>
      `[${v.code}] relevé n° ${String(v.releve)} · écran « ${v.ecran} » · ` +
      `geste ${v.geste ?? '(aucun — effet, magasin ou réseau)'} : ${v.detail}`,
  );
}

// ═══════════════════════════════════════════════════════════════════ 5. LE BRANCHEMENT

/**
 * LE `test` QUE LES RECETTES IMPORTENT — c'est toute la mise en place, et c'est une ligne.
 *
 * Le crochet est un fixateur AUTOMATIQUE : il n'a pas à être nommé par la recette, donc il ne
 * peut pas être oublié. `parcours-zz-invariants.spec.ts` vérifie en plus, mécaniquement, que
 * chaque `*.spec.ts` du dossier importe bien d'ici et non de `@playwright/test` — une recette
 * neuve qui oublierait le harnais fait échouer la QA au lieu de passer inaperçue.
 */
export const test = base.extend<{ sentinelle: Sentinelle }>({
  sentinelle: [
    async ({ page }, utiliser, testInfo: TestInfo): Promise<void> => {
      const sentinelle = await armerLaSentinelle(page);
      await utiliser(sentinelle);
      await sentinelle.cloturer();

      const bilan = sentinelle.bilan();
      ecrireAuJournal({
        campagne: CAMPAGNE_COURANTE,
        cas: testInfo.titlePath.join(' › '),
        fichier: testInfo.file.replace(/\\/gu, '/').split('/tests/').at(-1) ?? testInfo.file,
        ...bilan,
      });

      // ── L'ASSERTION. Elle nomme le premier relevé fautif, son écran et son geste.
      expect(
        decrireLesViolations(bilan.violations),
        `INVARIANTS GLOBAUX — ${String(bilan.violations.length)} violation(s) sur ` +
          `${String(bilan.releves)} relevé(s) et ${String(bilan.gestes)} geste(s). ` +
          'Un invariant se casse AU MILIEU du parcours : le relevé nommé ci-dessous est la ' +
          'première image peinte où la propriété a cessé d’être vraie.',
      ).toEqual([]);
    },
    { auto: true },
  ],
});
