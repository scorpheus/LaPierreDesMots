/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * L'EXPLORATEUR — lot Q2. Il parcourt l'application RÉELLE et rend ce qu'il a vu.
 *
 * Il ne compare rien et n'assertit rien : c'est `tests/composants/exploration-modele.test.tsx`
 * qui confronte ce rapport au modèle de `modele-navigation.ts`. Séparer les deux n'est pas de
 * la coquetterie — c'est ce qui permet d'imprimer le rapport BRUT quand la comparaison échoue,
 * et donc de distinguer « le modèle a tort » de « l'application a changé ».
 *
 * ── CE QU'IL FAIT, ET POURQUOI PAS AUTREMENT ──────────────────────────────────────────────
 *
 * **Il énumère, il ne tire pas au sort.** Le bot singe tape 5 000 fois au hasard ; il a déjà
 * raté un écran sans issue (D48). Ici, depuis chaque écran atteint, on tape **tous** les
 * éléments interactifs, dans l'ordre du DOM, sans exception et sans liste blanche.
 *
 * **Deux passes, et la seconde est celle qui compte.**
 *   Passe A — EN AVANT, comme joue un enfant : on tape 0, 1, 2 … sans revenir en arrière tant
 *             que l'écran ne change pas. C'est la seule qui découvre ce qui dépend de la
 *             PROGRESSION : un réceptacle qui n'accepte qu'un élément déjà en main.
 *   Passe B — ANCRÉE : avant chaque tap, on vérifie que l'élément de rang `r` est bien celui
 *             que l'inventaire de l'écran désignait ; sinon on rejoue le chemin. Sans elle,
 *             l'énumération DÉRIVE — mesuré : ouvrir le formulaire « Nouveau joueur » insère
 *             trois contrôles, tous les rangs suivants désignent alors autre chose, et la
 *             porte de la zone parent n'était jamais tapée.
 *
 * **Il est déterministe par construction.** Aucun aléa, aucune horloge réelle (la préparation
 * fige les deux), un double de réseau sans état partagé, et le REJEU comme seule façon de
 * revenir en arrière. Deux exécutions voient donc le même graphe. Si ce n'est pas le cas, le
 * garde `rejeuxIncoherents` le dit — une application dont le rejeu diverge est un défaut en
 * soi, pas un aléa à tolérer.
 *
 * **Il attend un ÉTAT, jamais une durée** (règle non négociable de CLAUDE.md). `stabiliser()`
 * rend la main quand les requêtes TanStack sont au repos ET que le DOM n'a plus bougé entre
 * deux tours de boucle d'événements. Le `setTimeout(0)` qu'elle emploie n'est pas une attente :
 * c'est le seul moyen de céder la boucle d'événements pour que les promesses en vol
 * s'achèvent. Un plafond de tours existe, et l'atteindre est SIGNALÉ, jamais absorbé.
 *
 * **Il tape comme un doigt.** `pointerdown` → `pointerup` → `click`. C'est la correction du
 * deuxième échec historique de cette QA : « elle envoyait `click` là où l'interface écoute
 * `pointerdown` ». Une prise SVG peinte sur `pointerdown` serait invisible autrement.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { act } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';

import { Application } from '@client/Application';
import { creerMagasin } from '@client/etat/magasin';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import type { ServicesJeu } from '@client/moteurs/types';

import { servicesDeTest } from '../configuration/preparation.js';
import { creerDoubleDeReseau } from './serveur-double.js';
import type { DoubleDeReseau } from './serveur-double.js';
// La prise est déclarée avec le MODÈLE, pas avec l'explorateur : c'est le modèle qui décide
// de ce qu'est une prise, l'explorateur ne fait que la chercher dans le DOM.
import type { Prise } from './modele-navigation.js';

export type { Prise };

/**
 * Ce qui compte comme « tapable ».
 *
 * ⚠ Cette liste est un DOUBLON de `tests/e2e/qa-outils.ts:101`. Elle ne peut pas être
 * importée : ce module-là importe `@playwright/test`, qui n'a rien à faire dans un projet
 * Vitest. Le doublon est donc GARDÉ plutôt que toléré —
 * `tests/unitaires/modele-navigation-coherence.test.ts` lit les deux listes sur disque et
 * exige qu'elles soient identiques. Elles ne peuvent pas diverger en silence.
 */
export const SELECTEURS_INTERACTIFS: readonly string[] = [
  'button:not([disabled])',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  '[data-godet]',
  '[tabindex]:not([tabindex="-1"])'
];

export const SELECTEUR_INTERACTIF = SELECTEURS_INTERACTIFS.join(', ');

/** Plafond de tours de boucle d'événements avant de déclarer l'interface non stabilisée. */
const TOURS_DE_STABILISATION_MAX = 200;

/** Le code d'écran quand aucun `[data-ecran]` n'est rendu — un état sans nom est un défaut. */
export const ECRAN_INCONNU = '(aucun data-ecran)';

// ───────────────────────────────────────────────────────────────────────── formes du rapport

/**
 * Un pas de chemin. Deux formes seulement, et les deux sont rejouables à l'identique :
 *   • `rang`   — taper le n-ième élément tapable, dans l'ordre du DOM ;
 *   • `gestes` — taper une suite de prises nommées (le code à quatre chiffres).
 */
export type Pas =
  | { readonly forme: 'rang'; readonly rang: number }
  | { readonly forme: 'gestes'; readonly nom: string; readonly gestes: readonly Prise[] };

export function decrirePas(pas: Pas): string {
  return pas.forme === 'rang' ? `#${String(pas.rang)}` : `«${pas.nom}»`;
}

export function decrireChemin(chemin: readonly Pas[]): string {
  return chemin.length === 0 ? '(racine)' : chemin.map(decrirePas).join(' → ');
}

export interface TransitionObservee {
  readonly depuis: string;
  readonly pas: Pas;
  /** Description lisible de ce qui a été tapé. */
  readonly description: string;
  readonly vers: string;
  /** Profondeur (en nombre de pas depuis la racine) de l'écran de départ. */
  readonly profondeur: number;
  /** `A` (en avant), `B` (ancrée), `D` (transition déclarée), `R` (recette). */
  readonly passe: 'A' | 'B' | 'D' | 'R';
}

export interface VerdictTransitionDeclaree {
  readonly depuis: string;
  readonly prise: Prise;
  /** L'écran réellement atteint, ou `null` si la prise n'existait pas sur l'écran. */
  readonly vers: string | null;
  readonly priseTrouvee: boolean;
}

export interface RapportExploration {
  readonly ecransAtteints: readonly string[];
  /** Le chemin le plus court vers chaque écran. */
  readonly cheminsParEcran: ReadonlyMap<string, readonly Pas[]>;
  /** Toutes les transitions observées, y compris celles qui bouclent sur le même écran. */
  readonly transitions: readonly TransitionObservee[];
  /** Le nombre d'éléments interactifs recensés sur chaque écran. */
  readonly interactifsParEcran: ReadonlyMap<string, number>;
  /** Le verdict de chaque transition DÉCLARÉE par le modèle, exécutée sur pièce. */
  readonly declareesVerifiees: readonly VerdictTransitionDeclaree[];
  /** Écrans explorés d'où aucune action ne mène ailleurs. */
  readonly ecransSansSortie: readonly string[];
  /** Écrans réellement explorés (inventaire + deux passes). */
  readonly ecransExplores: readonly string[];
  /** Rejeux dont la description d'élément a divergé : l'application n'est pas déterministe. */
  readonly rejeuxIncoherents: readonly string[];
  /** Écrans où la stabilisation a atteint son plafond. */
  readonly stabilisationsNonAtteintes: readonly string[];
  /** Appels réseau qu'aucun gestionnaire du double n'a reconnus. */
  readonly appelsSansGestionnaire: readonly string[];
  /**
   * Appels réseau arrivés HORS de toute session — une requête qui a survécu au démontage.
   * Non vide, c'est une fuite : sans l'aiguillage, elle serait partie sur le vrai réseau et
   * aurait fait rougir un autre fichier de la suite.
   */
  readonly appelsTardifs: readonly string[];
  // ── les chiffres du contrat de sortie ────────────────────────────────────────────────
  readonly nbSessions: number;
  readonly nbActionsJouees: number;
  readonly profondeurMax: number;
}

// ───────────────────────────────────────────────────────────────────────────────── la session

function services(): ServicesJeu {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      // Le calme, toujours : une particule en vol empêcherait le DOM de se stabiliser, et
      // l'exploration attend un état, jamais une durée.
      animationsDesactivees: true,
      emettreParticules: () => undefined
    })
  } as ServicesJeu;
}

interface Session {
  readonly double: DoubleDeReseau;
  readonly file: QueryClient;
}

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * L'AIGUILLAGE DE `fetch`, ET POURQUOI IL N'EST POSÉ QU'UNE FOIS.
 *
 * Première version : chaque session écrasait `globalThis.fetch` avec le `fetch` de SON double.
 * Conséquence mesurée sur la suite complète (`--project unitaires --project composants
 * --project api`), sortie citée :
 *
 *     AggregateError:
 *         Error: connect ECONNREFUSED ::1:3000
 *         Error: connect ECONNREFUSED 127.0.0.1:3000
 *
 * Une requête partie juste avant `cleanup()` retombait APRÈS la fin du fichier, quand Vitest
 * avait rendu son `fetch` d'origine à happy-dom : elle sortait alors sur le vrai réseau, et
 * l'échec était imputé au fichier que le rapporteur était en train d'afficher. Deux fichiers
 * innocents rougissaient, et LESQUELS changeait d'une exécution à l'autre.
 *
 * C'est exactement le piège que l'audit du 2026-08-02 décrit — « mon banc comptait la rougeur
 * d'une autre campagne comme sa détection ». Ici c'était l'inverse : ma rougeur portait le nom
 * des autres.
 *
 * Le remède : un SEUL aiguillage, posé une fois, qui délègue au double courant. Après
 * l'exploration, `rendreLeFetchDOrigine()` remet celui de l'environnement — et tout appel
 * tardif est refusé par l'aiguillage plutôt que jeté sur le réseau.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
let doubleCourant: DoubleDeReseau | null = null;
let fetchDOrigine: typeof fetch | null = null;
/** Les appels arrivés hors de toute session. Non vide ⇒ une requête a survécu au démontage. */
const appelsTardifs: string[] = [];

function poserLAiguillage(): void {
  if (fetchDOrigine !== null) return;
  fetchDOrigine = globalThis.fetch;
  globalThis.fetch = ((entree: unknown, options?: RequestInit): Promise<Response> => {
    if (doubleCourant === null) {
      appelsTardifs.push(String(options?.method ?? 'GET') + ' ' + String(entree));
      return Promise.resolve(new Response('{}', { status: 503 }));
    }
    return doubleCourant.fetch(entree as RequestInfo, options);
  }) as typeof fetch;
}

function rendreLeFetchDOrigine(): void {
  if (fetchDOrigine === null) return;
  globalThis.fetch = fetchDOrigine;
  fetchDOrigine = null;
  doubleCourant = null;
}

function ouvrirSession(): Session {
  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * UN APPAREIL NEUF À CHAQUE SESSION — R21.
   *
   * Depuis que l'application RETIENT qui joue (`localStorage`, clé `pierre.joueur`), deux
   * explorations successives ne partent plus du même état : la seconde retrouve le profil de
   * la première et saute l'écran de choix. Ce fichier l'a signalé tout de suite, et de la
   * meilleure façon possible — « le rejeu a divergé » et quatre écrans devenus inatteignables.
   *
   * C'est un vrai changement de comportement, voulu par le père (« quand on fait rafraîchir,
   * que ça rafraîchit la même page, sinon on perd carrément tout »). Ce qu'il coûte à
   * l'exploration est une CONDITION DE DÉPART, pas une assertion : un explorateur qui hérite
   * de l'appareil de la session précédente ne mesure plus ce qu'il croit mesurer.
   *
   * On repart donc d'un appareil vierge. Le déterminisme du modèle redevient vrai, et il le
   * reste le jour où une autre préférence d'appareil sera ajoutée.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */
  try {
    globalThis.localStorage?.clear();
  } catch {
    // Pas de stockage dans cet environnement : rien à nettoyer, et surtout rien à faire
    // échouer — l'absence de `localStorage` est un cas que le produit gère déjà.
  }
  poserLAiguillage();
  doubleCourant = creerDoubleDeReseau();
  const file = new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always', staleTime: 0, gcTime: 0 },
      mutations: { retry: 0, networkMode: 'always' }
    }
  });
  render(
    <Application magasin={creerMagasin(services())} services={services()} fileDAttente={file} />
  );
  return { double: doubleCourant, file };
}

/** Démonte React ET vide la file d'attente : aucune requête ne doit survivre à la session. */
function fermerSession(session: Session): void {
  cleanup();
  void session.file.cancelQueries();
  session.file.clear();
  session.file.unmount();
}

// ───────────────────────────────────────────────────────────────────────── lecture de l'écran

export function ecranCourant(): string {
  const porteurs = [...document.querySelectorAll('[data-ecran]')];
  const dernier = porteurs[porteurs.length - 1];
  return dernier?.getAttribute('data-ecran') ?? ECRAN_INCONNU;
}

function elementsInteractifs(): readonly HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(SELECTEUR_INTERACTIF)];
}

/**
 * Décrit un élément de façon lisible ET stable au rejeu.
 *
 * Volontairement sans les `data-*` d'ÉTAT (`data-ecoutes`, `data-sortie-prete`, `data-etape`) :
 * ils changent au fil de la partie, et une description instable ferait crier au
 * non-déterminisme là où il n'y en a pas. Ce qui reste — balise, rôle, étiquette accessible,
 * texte — est ce que l'enfant voit.
 */
export function decrire(element: Element): string {
  const balise = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const etiquette = element.getAttribute('aria-label');
  const texte = (element.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 48);
  const morceaux = [balise];
  if (role !== null) morceaux.push(`role=${role}`);
  if (etiquette !== null) morceaux.push(`«${etiquette}»`);
  else if (texte !== '') morceaux.push(`«${texte}»`);
  return morceaux.join(' ');
}

/** Vrai si l'élément répond à la prise du modèle. */
export function correspond(element: Element, prise: Prise): boolean {
  if (!element.matches(prise.selecteur)) return false;
  if (prise.libelle === undefined) return true;
  const texte = (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
  return texte === prise.libelle;
}

// ────────────────────────────────────────────────────────────────────────── geste et attente

/** Tape comme un doigt : `pointerdown`, `pointerup`, `click`, dans cet ordre. */
function taper(element: HTMLElement): void {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
  fireEvent.click(element);
}

/**
 * Rend la main quand l'interface ne bouge plus : requêtes au repos ET DOM identique d'un tour
 * de boucle à l'autre. Deux tours calmes consécutifs sont exigés — un seul suffirait à
 * confondre « au repos » avec « entre deux rendus ».
 */
async function stabiliser(session: Session): Promise<boolean> {
  let empreinte = '';
  let calmes = 0;
  for (let tour = 0; tour < TOURS_DE_STABILISATION_MAX; tour += 1) {
    await act(async () => {
      // Céder la boucle d'événements — ce n'est pas attendre une durée, c'est laisser les
      // promesses en vol s'achever. La condition de sortie, elle, est un ÉTAT.
      await new Promise((resoudre) => {
        setTimeout(resoudre, 0);
      });
    });
    const occupe = session.file.isFetching() > 0 || session.file.isMutating() > 0;
    const maintenant = `${ecranCourant()}|${String(document.body.innerHTML.length)}`;
    if (!occupe && maintenant === empreinte) {
      calmes += 1;
      if (calmes >= 2) return true;
    } else {
      calmes = 0;
    }
    empreinte = maintenant;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────── l'exploration

export interface RecetteExploration {
  readonly nom: string;
  readonly depuis: string;
  readonly gestes: readonly Prise[];
}

export interface OptionsExploration {
  /** Profondeur maximale, en nombre de pas depuis la racine. */
  readonly profondeurMax: number;
  /** Les transitions déclarées par le modèle, à exécuter sur pièce depuis chaque écran. */
  readonly declarees: ReadonlyArray<{ readonly depuis: string; readonly prise: Prise }>;
  /** Les suites de prises qu'un tap unique ne franchit pas (le code à quatre chiffres). */
  readonly recettes: readonly RecetteExploration[];
}

export async function explorer(options: OptionsExploration): Promise<RapportExploration> {
  const chemins = new Map<string, readonly Pas[]>();
  const transitions: TransitionObservee[] = [];
  const interactifs = new Map<string, number>();
  const declareesVerifiees: VerdictTransitionDeclaree[] = [];
  const incoherences: string[] = [];
  const nonStabilises: string[] = [];
  const appelsSansGestionnaire: string[] = [];

  let nbSessions = 0;
  let nbActions = 0;
  let profondeurMax = 0;

  const recolter = (session: Session): void => {
    for (const appel of session.double.journal().appelsSansGestionnaire) {
      appelsSansGestionnaire.push(appel);
    }
  };

  /** Joue un pas sur la session courante. Rend la description de ce qui a été tapé. */
  const jouerPas = async (session: Session, pas: Pas): Promise<string> => {
    if (pas.forme === 'rang') {
      const cible = elementsInteractifs()[pas.rang];
      if (cible === undefined) return '(rang absent)';
      const description = decrire(cible);
      taper(cible);
      nbActions += 1;
      await stabiliser(session);
      return description;
    }
    for (const geste of pas.gestes) {
      const cible = elementsInteractifs().find((element) => correspond(element, geste));
      if (cible === undefined) return `(prise absente : ${geste.selecteur})`;
      taper(cible);
      nbActions += 1;
      await stabiliser(session);
    }
    return `recette « ${pas.nom} »`;
  };

  /**
   * Ouvre une application neuve et rejoue le chemin. Le chemin est rejouable par construction :
   * même graine, même horloge figée, même double sans état partagé.
   */
  const allerSur = async (ecran: string): Promise<Session> => {
    nbSessions += 1;
    const session = ouvrirSession();
    if (!(await stabiliser(session))) nonStabilises.push('(racine)');
    for (const pas of chemins.get(ecran) ?? []) {
      await jouerPas(session, pas);
    }
    const arrive = ecranCourant();
    if (arrive !== ecran) {
      incoherences.push(
        `rejeu de ${decrireChemin(chemins.get(ecran) ?? [])} : attendu « ${ecran} », ` +
          `arrivé sur « ${arrive} »`
      );
    }
    return session;
  };

  const decouvrir = (depuis: string, pas: Pas, vers: string, file: string[]): void => {
    if (vers === depuis || chemins.has(vers)) return;
    chemins.set(vers, [...(chemins.get(depuis) ?? []), pas]);
    file.push(vers);
  };

  // ── la racine ────────────────────────────────────────────────────────────────────────
  nbSessions += 1;
  {
    const session = ouvrirSession();
    if (!(await stabiliser(session))) nonStabilises.push('(racine)');
    chemins.set(ecranCourant(), []);
    recolter(session);
    fermerSession(session);
  }

  const file: string[] = [...chemins.keys()];
  const explores: string[] = [];
  const traites = new Set<string>();

  while (file.length > 0) {
    const ecran = file.shift() as string;
    if (traites.has(ecran)) continue;
    traites.add(ecran);

    const profondeur = (chemins.get(ecran) ?? []).length;
    profondeurMax = Math.max(profondeurMax, profondeur);
    if (profondeur >= options.profondeurMax) continue;
    explores.push(ecran);

    // ── L'INVENTAIRE, puis la PASSE A — en avant, sans revenir en arrière ─────────────
    //
    // L'inventaire est pris dans la MÊME session que la passe A : une session de plus par
    // écran, c'est onze montages complets de l'application pour rien.
    let inventaire: readonly string[] = [];
    {
      let session = await allerSur(ecran);
      inventaire = elementsInteractifs().map(decrire);
      interactifs.set(ecran, inventaire.length);
      for (let rang = 0; rang < inventaire.length; rang += 1) {
        if (ecranCourant() !== ecran) {
          recolter(session);
          fermerSession(session);
          session = await allerSur(ecran);
        }
        const pas: Pas = { forme: 'rang', rang };
        const description = await jouerPas(session, pas);
        const apres = ecranCourant();
        transitions.push({ depuis: ecran, pas, description, vers: apres, profondeur, passe: 'A' });
        decouvrir(ecran, pas, apres, file);
      }
      recolter(session);
      fermerSession(session);
    }

    // ── PASSE B — ancrée : chaque rang est tapé AVEC L'IDENTITÉ DE L'INVENTAIRE ────────
    {
      let session = await allerSur(ecran);
      for (let rang = 0; rang < inventaire.length; rang += 1) {
        const attendue = inventaire[rang] as string;
        const rencontree = elementsInteractifs()[rang];
        if (ecranCourant() !== ecran || rencontree === undefined || decrire(rencontree) !== attendue) {
          recolter(session);
          fermerSession(session);
          session = await allerSur(ecran);
          const apresRejeu = elementsInteractifs()[rang];
          if (apresRejeu === undefined || decrire(apresRejeu) !== attendue) {
            incoherences.push(
              `${ecran} rang ${String(rang)} : l'inventaire disait « ${attendue} », le rejeu ` +
                `rend « ${apresRejeu === undefined ? '(absent)' : decrire(apresRejeu)} »`
            );
            continue;
          }
        }
        const pas: Pas = { forme: 'rang', rang };
        const description = await jouerPas(session, pas);
        const apres = ecranCourant();
        transitions.push({ depuis: ecran, pas, description, vers: apres, profondeur, passe: 'B' });
        decouvrir(ecran, pas, apres, file);
      }
      recolter(session);
      fermerSession(session);
    }

    // ── LES TRANSITIONS DÉCLARÉES, une par une, depuis un écran FRAIS ──────────────────
    //
    // C'est ce passage-là qui attrape « le bouton retour a disparu » : une prise que le
    // modèle déclare et que le DOM ne porte pas ressort avec `priseTrouvee: false`.
    for (const declaree of options.declarees) {
      if (declaree.depuis !== ecran) continue;
      const session = await allerSur(ecran);
      const cible = elementsInteractifs().find((element) => correspond(element, declaree.prise));
      if (cible === undefined) {
        declareesVerifiees.push({
          depuis: ecran,
          prise: declaree.prise,
          vers: null,
          priseTrouvee: false
        });
      } else {
        taper(cible);
        nbActions += 1;
        await stabiliser(session);
        const apres = ecranCourant();
        declareesVerifiees.push({
          depuis: ecran,
          prise: declaree.prise,
          vers: apres,
          priseTrouvee: true
        });
        transitions.push({
          depuis: ecran,
          pas: { forme: 'rang', rang: -1 },
          description: `prise déclarée ${declaree.prise.selecteur}`,
          vers: apres,
          profondeur,
          passe: 'D'
        });
      }
      recolter(session);
      fermerSession(session);
    }

    // ── LES RECETTES : une suite de prises nommées ────────────────────────────────────
    for (const recette of options.recettes.filter((candidate) => candidate.depuis === ecran)) {
      const pas: Pas = { forme: 'gestes', nom: recette.nom, gestes: recette.gestes };
      const session = await allerSur(ecran);
      const description = await jouerPas(session, pas);
      const apres = ecranCourant();
      transitions.push({ depuis: ecran, pas, description, vers: apres, profondeur, passe: 'R' });
      decouvrir(ecran, pas, apres, file);
      recolter(session);
      fermerSession(session);
    }

  }

  // L'exploration est finie : l'environnement récupère son `fetch`. Tout appel qui arriverait
  // encore est refusé par l'aiguillage et compté dans `appelsTardifs`, jamais jeté sur le réseau.
  rendreLeFetchDOrigine();

  const sorties = new Set(
    transitions
      .filter((transition) => transition.vers !== transition.depuis)
      .map((transition) => transition.depuis)
  );

  return {
    ecransAtteints: [...chemins.keys()].sort(),
    cheminsParEcran: chemins,
    transitions,
    interactifsParEcran: interactifs,
    declareesVerifiees,
    ecransSansSortie: explores.filter((ecran) => !sorties.has(ecran)).sort(),
    ecransExplores: [...explores].sort(),
    rejeuxIncoherents: incoherences,
    stabilisationsNonAtteintes: [...new Set(nonStabilises)].sort(),
    appelsSansGestionnaire: [...new Set(appelsSansGestionnaire)].sort(),
    appelsTardifs: [...new Set(appelsTardifs)].sort(),
    nbSessions,
    nbActionsJouees: nbActions,
    profondeurMax
  };
}
