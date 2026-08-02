/**
 * LE FUZZER D'API — lot Q4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LA PROPRIÉTÉ, EN UNE PHRASE
 *
 * **Aucune route ne rend 500.** Un corps absurde, un type faux, un champ en trop, une valeur
 * limite, un paramètre d'URL hostile : la réponse est un 4xx qui dit ce qui ne va pas, jamais
 * une erreur interne. Un 500 sur le PC du salon, c'est un enfant devant un écran figé et un
 * parent sans rien à lire.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EMPÊCHE CE FICHIER D'ÊTRE VERT PAR VACUITÉ — c'est le cœur du lot
 *
 * L'historique de la QA de ce projet porte deux défauts jumeaux : « la QA se mentait sur sa
 * couverture » (elle auditait 8 fois le même écran en publiant « 8/8 routes visitées ») et
 * « le rapport imprimait 14 moteurs sur 14 mais n'assertait que `> 0` ». Trois garde-fous,
 * chacun exécutable :
 *
 * 1. **L'inventaire des routes vient de FASTIFY**, pas d'une liste écrite à la main. Il est
 *    lu dans `printRoutes()`, l'arbre que le routeur publie de lui-même. Une route ajoutée
 *    demain entre dans le fuzz sans qu'on touche à ce fichier ; une route qu'on oublierait de
 *    décrire fait ÉCHOUER le test de couverture, elle ne disparaît pas en silence.
 * 2. **Chaque route porte un appel NOMINAL dont le statut attendu est épinglé.** Sans lui, on
 *    fuzzerait `/api/parent/:profil/dashboard` sans jeton : 401 partout, zéro 500, et la
 *    garde d'entrée n'aurait jamais laissé passer un seul cas jusqu'au vrai code. Le nominal
 *    prouve que le fuzz atteint le handler.
 * 3. **Le contrat de sortie asserte des ÉGALITÉS**, pas des `> 0` : routes fuzzées ==
 *    routes déclarées, et un plancher sur le nombre de cas.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * DÉTERMINISME
 *
 * Corpus figé (`tests/fuzz/corpus.ts`), tirage mulberry32 sur graine constante, horloge figée
 * par `tests/configuration/preparation.ts`. Deux exécutions envoient exactement les mêmes
 * requêtes, dans le même ordre.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import { INSTANT_DE_REFERENCE, monterApplication } from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';
import {
  CHAINES_HOSTILES,
  Compteur,
  VALEURS_HOSTILES,
  aleaFuzz,
  documentQuelconque,
  objetProfond,
  pollutionsConstatees
} from '../fuzz/corpus.js';

// ═══════════════════════════════════════════ 1. l'inventaire des routes, lu chez le routeur

export interface RouteDeclaree {
  readonly methode: string;
  readonly motif: string;
}

/**
 * Analyse l'arbre rendu par `printRoutes()`.
 *
 * **Mesuré, pas supposé** : `printRoutes({ commonPrefix: false })` PERD les routes joker
 * (`/api/contenu/assets/*` et `/api/audio/*` n'y figurent pas). L'arbre par défaut les porte,
 * au prix d'un découpage des segments qu'il faut recoller — d'où cette fonction. C'est le
 * genre de fait qu'on n'affirme pas : la sortie des deux appels a été comparée avant d'écrire.
 *
 * Chaque ligne vaut `<indentation><connecteur> <étiquette>[ (MÉTHODES)]`. La profondeur est
 * la position du connecteur divisée par 4 ; le chemin complet est la concaténation des
 * étiquettes de la racine jusqu'au nœud.
 */
export function analyserArbreDeRoutes(arbre: string): readonly RouteDeclaree[] {
  const routes: RouteDeclaree[] = [];
  const pile: string[] = [];
  for (const ligne of arbre.split('\n')) {
    const marqueur = /[├└]── /.exec(ligne);
    if (marqueur === null) {
      continue;
    }
    const profondeur = marqueur.index / 4;
    const reste = ligne.slice(marqueur.index + marqueur[0].length);
    const methodes = /\s\(([A-Z, ]+)\)\s*$/.exec(reste);
    const etiquette = methodes === null ? reste.trimEnd() : reste.slice(0, methodes.index);

    pile.length = profondeur;
    pile.push(etiquette);

    if (methodes !== null) {
      const chemin = pile.join('');
      for (const methode of methodes[1]!.split(',').map((m) => m.trim())) {
        // `HEAD` est ajouté d'office par Fastify et partage le handler du `GET` : le fuzzer ne
        // le compte pas deux fois. Aucun handler du dépôt n'en déclare un.
        if (methode !== 'HEAD') {
          routes.push({ methode, motif: chemin });
        }
      }
    }
  }
  return routes;
}

// ═══════════════════════════════════════════════════ 2. les descripteurs — l'appel NOMINAL

interface Contexte {
  readonly profil: string;
  readonly jeton: string;
}

interface Descripteur {
  readonly methode: string;
  readonly motif: string;
  /** Valeurs légitimes des paramètres du motif (`:id`, `:profil`, `*`…). */
  readonly params: (c: Contexte) => Readonly<Record<string, string>>;
  /** Corps légitime, ou `undefined` pour une route sans corps. */
  readonly corps?: (c: Contexte) => Record<string, unknown>;
  readonly entetes?: (c: Contexte) => Record<string, string>;
  /**
   * Le statut que l'appel NOMINAL doit rendre. C'est l'assertion qui prouve que le fuzz de
   * cette route atteint bien le code métier et ne rebondit pas sur une garde d'entrée.
   */
  readonly statutNominal: number;
  /** Préparation à rejouer avant le nominal (remettre un code parent, par exemple). */
  readonly avant?: (c: Contexte) => Promise<void>;
}

const CODE_PARENT = '4321';

function cleIdempotence(profil: string, noeud: string, demarreLe: string, graine: number): string {
  return createHash('sha256')
    .update([profil, noeud, demarreLe, String(graine)].join('|'))
    .digest('hex');
}

let contexte: ApplicationDeTest;
let jetonParent = '';
let profilId = '';

async function injecter(options: {
  methode: string;
  url: string;
  corps?: unknown;
  brut?: string;
  entetes?: Record<string, string>;
}) {
  const base = {
    method: options.methode as 'GET',
    url: options.url,
    headers: options.entetes ?? {}
  };
  if (options.brut !== undefined) {
    return contexte.application.inject({
      ...base,
      headers: { 'content-type': 'application/json', ...base.headers },
      body: options.brut
    });
  }
  if (options.corps !== undefined) {
    return contexte.application.inject({ ...base, payload: options.corps as object });
  }
  return contexte.application.inject(base);
}

/**
 * Encode un segment d'URL, et laisse passer BRUT ce qui n'est pas encodable.
 *
 * `encodeURIComponent('\uD800')` LÈVE `URIError: URI malformed` — mesuré, c'est ce qui a fait
 * tomber la première exécution de ce fichier. Une demi-paire de substitution isolée est
 * pourtant exactement ce qu'un client fautif enverra : on la transmet telle quelle plutôt que
 * de retirer le cas du corpus, parce que c'est le serveur qui doit y survivre, pas le fuzzer.
 */
function encoderSegment(valeur: string): string {
  try {
    return encodeURIComponent(valeur);
  } catch {
    return valeur;
  }
}

/** Remplace les paramètres du motif par des valeurs, en encodant ce qui doit l'être. */
function urlDepuis(motif: string, valeurs: Readonly<Record<string, string>>): string {
  return motif
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        return encoderSegment(valeurs[segment.slice(1)] ?? '');
      }
      if (segment === '*') {
        // Le joker n'est PAS encodé : c'est un chemin, et c'est justement sa traversée
        // (`../`, `%2F`, `%00`) qu'on veut soumettre au serveur telle quelle.
        return valeurs['*'] ?? '';
      }
      return segment;
    })
    .join('/');
}

/** Les paramètres déclarés par un motif, dans l'ordre. */
function parametresDe(motif: string): readonly string[] {
  return motif
    .split('/')
    .filter((s) => s.startsWith(':') || s === '*')
    .map((s) => (s === '*' ? '*' : s.slice(1)));
}

async function poserCodeParent(): Promise<void> {
  await injecter({
    methode: 'POST',
    url: '/api/parent/definir',
    corps: { code: CODE_PARENT },
    entetes: { [ENTETE_JETON_PARENT]: jetonParent }
  });
}

const DESCRIPTEURS: readonly Descripteur[] = [
  { methode: 'GET', motif: '/api/sante', params: () => ({}), statutNominal: 200 },
  { methode: 'GET', motif: '/api/profils', params: () => ({}), statutNominal: 200 },
  {
    methode: 'POST',
    motif: '/api/profils',
    params: () => ({}),
    corps: () => ({ prenom: 'Alma', paletteVariante: 'clairiere', avatar: { cheveux: 'chatain' } }),
    statutNominal: 201
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/progression',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/reglages',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'PUT',
    motif: '/api/profils/:id/reglages',
    params: (c) => ({ id: c.profil }),
    corps: () => ({ corpsPx: 22, interligne: 1.6, colorationSyllabique: true }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/revisions',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/essai-typographie',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/maitrise',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/monde',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/profils/:id/sortie',
    params: (c) => ({ id: c.profil }),
    corps: () => ({ region: 'clairiere', compagnon: null }),
    // 409, et le handler est bel et bien atteint jusqu'au bout : le dépôt de contenu du banc
    // ne sert QU'UN nœud (`monterApplication`), et « une sortie d'un seul nœud n'existe pas ».
    // Le 409 est rendu APRÈS la lecture du contenu, des maîtrises et le passage du sélecteur —
    // c'est-à-dire après tout le code que le fuzz veut éprouver. Mesuré :
    //   `{"code":"conflit","message":"Impossible de composer une sortie dans « clairiere » :
    //     0 nœud(s) éligible(s), il en faut au …"}`
    statutNominal: 409
  },
  {
    methode: 'GET',
    motif: '/api/profils/:id/ouverture',
    params: (c) => ({ id: c.profil }),
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/profils/:id/ouverture',
    params: (c) => ({ id: c.profil }),
    corps: () => ({ passee: false }),
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/profils/:id/campement',
    params: (c) => ({ id: c.profil }),
    corps: () => ({ objet: 'fanion-clairiere' }),
    statutNominal: 200
  },
  { methode: 'GET', motif: '/api/parent/etat', params: () => ({}), statutNominal: 200 },
  {
    methode: 'POST',
    motif: '/api/parent/ouvrir',
    params: () => ({}),
    corps: () => ({ code: CODE_PARENT }),
    // Le code est reposé juste avant : `definir` remet aussi le verrou à zéro, ce qui rend
    // ce nominal indépendant des 4xx que le fuzz de la route précédente a pu accumuler.
    avant: poserCodeParent,
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/parent/definir',
    params: () => ({}),
    corps: () => ({ code: CODE_PARENT }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/parent/relecture/:exercice',
    params: () => ({ exercice: 'clairiere-ecole-01' }),
    corps: () => ({ statut: 'valide', motif: 'relu' }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    // 404 et non 200 : aucun brouillon n'est en relecture sur une base neuve. Le handler EST
    // atteint — il a franchi le jeton et la validation du statut — et c'est ce que le nominal
    // doit prouver. Un 401 ici voudrait dire que tout le fuzz de cette route est creux.
    statutNominal: 404
  },
  {
    methode: 'GET',
    motif: '/api/parent/:profil/dashboard',
    params: (c) => ({ profil: c.profil }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/parent/:profil/export/:code',
    params: (c) => ({ profil: c.profil, code: 'tentatives' }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/parent/:profil/etat',
    params: (c) => ({ profil: c.profil }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/parent/:profil/galerie',
    params: (c) => ({ profil: c.profil }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'POST',
    motif: '/api/parent/:profil/reinitialiser',
    params: (c) => ({ profil: c.profil }),
    corps: () => ({ portee: 'progression', apercu: true }),
    entetes: (c) => ({ [ENTETE_JETON_PARENT]: c.jeton }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/contenu/noeuds/:id',
    params: () => ({ id: 'clairiere-01' }),
    statutNominal: 200
  },
  {
    methode: 'GET',
    motif: '/api/contenu/assets/*',
    params: () => ({ '*': 'habillages/clairiere/ecole.svg' }),
    // Le dépôt de contenu du banc est en mémoire et ne sert aucun octet : 404 est la réponse
    // juste, et c'est bien le handler qui la rend (la garde de décodage est en amont).
    statutNominal: 404
  },
  {
    methode: 'POST',
    motif: '/api/tentatives',
    params: () => ({}),
    corps: (c) => ({
      cleIdempotence: cleIdempotence(c.profil, 'clairiere-01', INSTANT_DE_REFERENCE, 20260801),
      profil: c.profil,
      noeud: 'clairiere-01',
      exercice: 'clairiere-ecole-01',
      moteur: 'colorie',
      habillage: 'clairiere.ecole',
      graine: 20260801,
      demarreLe: INSTANT_DE_REFERENCE,
      termineLe: '2026-09-01T08:01:00Z',
      resume: {
        reussi: true,
        nbErreurs: 0,
        aideUtilisee: 'aucune',
        dureeMs: 60_000,
        etapes: [{ identifiant: 'c1', modeReponse: 'colorie', dureeMs: 900 }]
      }
    }),
    statutNominal: 201
  },
  { methode: 'GET', motif: '/api/audio/manifeste', params: () => ({}), statutNominal: 200 },
  {
    methode: 'GET',
    motif: '/api/audio/*',
    params: () => ({ '*': 'clairiere/consigne-01.opus' }),
    statutNominal: 404
  }
];

// ═══════════════════════════════════════════════════════════ 3. la batterie de cas hostiles

interface Cas {
  readonly nom: string;
  readonly url: string;
  readonly corps?: unknown;
  readonly brut?: string;
  readonly entetes?: Record<string, string>;
}

/** Les corps qui ne sont même pas un objet JSON, ou qui n'en sont pas un du tout. */
const CORPS_ABERRANTS: readonly { nom: string; brut: string }[] = Object.freeze([
  { nom: 'corps-null', brut: 'null' },
  { nom: 'corps-tableau', brut: '[1,2,3]' },
  { nom: 'corps-texte', brut: '"une chaine"' },
  { nom: 'corps-nombre', brut: '42' },
  { nom: 'corps-booleen', brut: 'true' },
  { nom: 'corps-vide', brut: '' },
  { nom: 'corps-json-tronque', brut: '{"prenom":' },
  { nom: 'corps-json-invalide', brut: '{prenom: Alma}' },
  { nom: 'corps-accolade-seule', brut: '{' },
  { nom: 'corps-nul-dans-le-json', brut: '{"prenom":"a b"}' },
  { nom: 'corps-bom', brut: '﻿{"prenom":"Alma"}' },
  { nom: 'corps-tres-profond', brut: JSON.stringify(objetProfond(400)) },
  {
    nom: 'corps-au-dela-de-la-borne',
    // `bodyLimit` vaut 512 Kio : 600 Kio doivent rendre 413, jamais 500 ni un plantage.
    brut: JSON.stringify({ prenom: 'A'.repeat(600 * 1024) })
  },
  { nom: 'corps-cle-dupliquee', brut: '{"prenom":"Alma","prenom":"Autre"}' },
  { nom: 'corps-pollution-proto', brut: '{"__proto__":{"pollueParFuzz":true}}' },
  { nom: 'corps-pollution-constructeur', brut: '{"constructor":{"prototype":{"pollue":true}}}' }
]);

/** Les chaînes de requête hostiles — elles passent par un analyseur, donc par du code. */
const REQUETES_HOSTILES: readonly string[] = Object.freeze([
  '?a=1&a=2',
  '?__proto__[pollueParFuzz]=true',
  '?constructor[prototype][pollue]=true',
  `?${'x'.repeat(4_000)}=1`,
  '?%E0%A4%A=1',
  '?depuis=NaN&jusqua=-Infinity'
]);

/** Les en-têtes hostiles — le mauvais type de contenu est le plus fréquent en vrai. */
const ENTETES_HOSTILES: readonly { nom: string; entetes: Record<string, string> }[] = Object.freeze([
  { nom: 'type-texte-brut', entetes: { 'content-type': 'text/plain' } },
  { nom: 'type-inconnu', entetes: { 'content-type': 'application/x-inconnu' } },
  { nom: 'type-vide', entetes: { 'content-type': '' } },
  { nom: 'type-formulaire', entetes: { 'content-type': 'application/x-www-form-urlencoded' } },
  { nom: 'accept-absurde', entetes: { accept: 'application/xml' } }
]);

/** Combien de documents tirés au sort chaque route reçoit-elle en corps. */
const TIRAGES_PAR_ROUTE = 10;

function casDuDescripteur(d: Descripteur, c: Contexte): readonly Cas[] {
  const cas: Cas[] = [];
  const params = d.params(c);
  const urlNominale = urlDepuis(d.motif, params);
  const corpsNominal = d.corps?.(c);
  const alea = aleaFuzz();

  // ── (a) les paramètres d'URL hostiles, un paramètre à la fois
  for (const nomParam of parametresDe(d.motif)) {
    for (const hostile of CHAINES_HOSTILES) {
      cas.push({
        nom: `param:${nomParam}=${hostile.slice(0, 24)}`,
        url: urlDepuis(d.motif, { ...params, [nomParam]: hostile })
      });
    }
  }

  // ── (b) les chaînes de requête
  for (const requete of REQUETES_HOSTILES) {
    cas.push({ nom: `requete:${requete.slice(0, 24)}`, url: urlNominale + requete });
  }

  if (corpsNominal !== undefined) {
    // ── (c) les corps qui ne sont pas l'objet attendu
    for (const aberrant of CORPS_ABERRANTS) {
      cas.push({ nom: aberrant.nom, url: urlNominale, brut: aberrant.brut });
    }

    // ── (d) le corps nominal, un champ à la fois remplacé par une valeur hostile.
    //        On ÉNUMÈRE les champs du corps légitime (D48) : un champ ajouté demain au
    //        contrat entre dans le fuzz sans qu'on touche à cette liste.
    for (const champ of Object.keys(corpsNominal)) {
      for (const hostile of VALEURS_HOSTILES) {
        cas.push({
          nom: `champ:${champ}=${hostile.nom}`,
          url: urlNominale,
          corps: { ...corpsNominal, [champ]: hostile.valeur }
        });
      }
      cas.push({
        nom: `champ:${champ}=absent`,
        url: urlNominale,
        corps: Object.fromEntries(Object.entries(corpsNominal).filter(([k]) => k !== champ))
      });
    }

    // ── (e) des champs EN TROP
    cas.push({
      nom: 'champs-en-trop',
      url: urlNominale,
      corps: {
        ...corpsNominal,
        inconnu: 'valeur',
        __proto__: { pollueParFuzz: true },
        id: 'force',
        etoiles: 99,
        profil_id: 'autre-profil'
      }
    });

    // ── (f) des documents tirés au sort — la part qu'on n'a pas imaginée
    for (let i = 0; i < TIRAGES_PAR_ROUTE; i += 1) {
      cas.push({ nom: `tirage-${String(i)}`, url: urlNominale, corps: documentQuelconque(alea) });
    }

    // ── (g) les mauvais types de contenu, avec un corps pourtant valide
    for (const entete of ENTETES_HOSTILES) {
      cas.push({
        nom: `entete:${entete.nom}`,
        url: urlNominale,
        brut: JSON.stringify(corpsNominal),
        entetes: entete.entetes
      });
    }
  } else {
    // Une route sans corps doit aussi survivre à un corps : rien n'empêche un client de
    // poster sur un GET, et Fastify le laisse arriver.
    for (const entete of ENTETES_HOSTILES) {
      cas.push({ nom: `entete:${entete.nom}`, url: urlNominale, entetes: entete.entetes });
    }
  }

  return cas;
}

// ═══════════════════════════════════════════════════════════════════════ 4. les assertions

/** Ce qu'une réponse ne doit JAMAIS laisser filtrer jusqu'au réseau du salon. */
const FUITES = [
  { nom: 'trace-de-pile', motif: /\n\s+at\s+\S+/u },
  { nom: 'chemin-absolu-windows', motif: /[A-Za-z]:\\{1,2}Users/u },
  { nom: 'node_modules', motif: /node_modules/u },
  { nom: 'code-sqlite', motif: /SQLITE_[A-Z]+/u },
  { nom: 'requete-sql', motif: /\bSELECT\b[\s\S]{0,40}\bFROM\b/u }
] as const;

interface Echec {
  readonly route: string;
  readonly cas: string;
  readonly statut: number;
  readonly motif: string;
  readonly extrait: string;
}

const compteur = new Compteur('fuzz-api');
const echecs: Echec[] = [];
const statutsVus = new Map<number, number>();
const routesFuzzees = new Set<string>();
let casNominauxVerts = 0;

function juger(route: string, cas: string, statut: number, corpsBrut: string): void {
  statutsVus.set(statut, (statutsVus.get(statut) ?? 0) + 1);
  const extrait = corpsBrut.slice(0, 220);

  if (statut >= 500) {
    compteur.plantages.push(`${route} · ${cas} · ${String(statut)}`);
    echecs.push({ route, cas, statut, motif: 'statut 5xx', extrait });
    return;
  }
  if (statut >= 400) {
    compteur.refuses += 1;
  } else {
    compteur.acceptes += 1;
  }

  for (const fuite of FUITES) {
    if (fuite.motif.test(corpsBrut)) {
      echecs.push({ route, cas, statut, motif: `fuite ${fuite.nom}`, extrait });
      return;
    }
  }

  // Un refus doit DIRE quelque chose. Un 4xx JSON sans message est un cul-de-sac pour le
  // parent comme pour le client : c'est la moitié de « refuse avec un message clair ».
  if (statut >= 400 && corpsBrut.trimStart().startsWith('{')) {
    let corps: unknown;
    try {
      corps = JSON.parse(corpsBrut);
    } catch {
      echecs.push({ route, cas, statut, motif: 'corps 4xx illisible', extrait });
      return;
    }
    const objet = corps as { code?: unknown; message?: unknown };
    if (typeof objet.code !== 'string' || objet.code === '') {
      echecs.push({ route, cas, statut, motif: 'refus sans code', extrait });
      return;
    }
    if (typeof objet.message !== 'string' || objet.message.trim() === '') {
      echecs.push({ route, cas, statut, motif: 'refus sans message', extrait });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════ 5. l'exécution

beforeAll(async () => {
  contexte = await monterApplication();

  const creation = await injecter({
    methode: 'POST',
    url: '/api/profils',
    corps: { prenom: 'Alma', paletteVariante: 'clairiere' }
  });
  profilId = (creation.json() as { id: string }).id;

  const porte = await injecter({
    methode: 'POST',
    url: '/api/parent/definir',
    corps: { code: CODE_PARENT }
  });
  jetonParent = (porte.json() as { jeton: string }).jeton;
}, 60_000);

afterAll(async () => {
  await contexte.fermer();
});

describe('inventaire des routes — il vient du routeur, pas d’une liste écrite à la main', () => {
  it('chaque route déclarée par Fastify a son descripteur, et réciproquement', () => {
    const declarees = analyserArbreDeRoutes(contexte.application.printRoutes());
    const cles = (r: { methode: string; motif: string }): string => `${r.methode} ${r.motif}`;

    const chezFastify = new Set(declarees.map(cles));
    const chezNous = new Set(DESCRIPTEURS.map(cles));

    const nonDecrites = [...chezFastify].filter((r) => !chezNous.has(r)).sort();
    const fantomes = [...chezNous].filter((r) => !chezFastify.has(r)).sort();

    console.log(
      `[fuzz-api] routes déclarées par Fastify : ${String(chezFastify.size)} · ` +
        `décrites par le fuzzer : ${String(chezNous.size)} · ` +
        `écart : ${String(nonDecrites.length + fantomes.length)}`
    );

    expect(nonDecrites, 'des routes échappent au fuzzer').toEqual([]);
    expect(fantomes, 'le fuzzer décrit des routes qui n’existent plus').toEqual([]);
    // Plancher : sans lui, un `printRoutes` vide rendrait ce cas vert par vacuité.
    expect(chezFastify.size, 'l’application doit déclarer au moins 29 routes').toBeGreaterThanOrEqual(29);
  });
});

describe('l’appel NOMINAL de chaque route — la preuve que le fuzz atteint le code', () => {
  it('les 29 nominaux rendent le statut épinglé', async () => {
    const contexteAppel: Contexte = { profil: profilId, jeton: jetonParent };
    const ecarts: string[] = [];

    for (const d of DESCRIPTEURS) {
      await d.avant?.(contexteAppel);
      const reponse = await injecter({
        methode: d.methode,
        url: urlDepuis(d.motif, d.params(contexteAppel)),
        corps: d.corps?.(contexteAppel),
        entetes: d.entetes?.(contexteAppel)
      });
      if (reponse.statusCode === d.statutNominal) {
        casNominauxVerts += 1;
      } else {
        ecarts.push(
          `${d.methode} ${d.motif} → ${String(reponse.statusCode)} ` +
            `(attendu ${String(d.statutNominal)}) ${reponse.body.slice(0, 120)}`
        );
      }
    }

    expect(ecarts, 'un nominal faux rend creux tout le fuzz de sa route').toEqual([]);
    expect(casNominauxVerts).toBe(DESCRIPTEURS.length);
  });
});

describe('le fuzz — aucune route ne rend 500', () => {
  it(
    'toutes les routes encaissent la batterie hostile',
    async () => {
      const contexteAppel: Contexte = { profil: profilId, jeton: jetonParent };

      for (const d of DESCRIPTEURS) {
        const nom = `${d.methode} ${d.motif}`;
        const entetes = d.entetes?.(contexteAppel);
        for (const cas of casDuDescripteur(d, contexteAppel)) {
          compteur.generes += 1;
          const reponse = await injecter({
            methode: d.methode,
            url: cas.url,
            corps: cas.corps,
            brut: cas.brut,
            entetes: { ...entetes, ...cas.entetes }
          });
          juger(nom, cas.nom, reponse.statusCode, reponse.body);
        }
        routesFuzzees.add(nom);
      }

      console.log(compteur.rapport());
      console.log(
        `[fuzz-api] statuts observés : ${[...statutsVus.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([s, n]) => `${String(s)}×${String(n)}`)
          .join(' ')}`
      );

      const apercu = echecs
        .slice(0, 25)
        .map((e) => `  ${e.route} · ${e.cas} · ${String(e.statut)} · ${e.motif} · ${e.extrait}`)
        .join('\n');

      expect(echecs.length, `défauts trouvés par le fuzz :\n${apercu}`).toBe(0);
    },
    120_000
  );

  it('le contrat de sortie : routes fuzzées, cas générés, plantages', () => {
    console.log(
      `[fuzz-api] CONTRAT — routes fuzzées ${String(routesFuzzees.size)} / ` +
        `${String(DESCRIPTEURS.length)} déclarées · ` +
        `${String(compteur.generes)} cas · ${String(compteur.plantages.length)} plantage(s)`
    );
    // Égalité, jamais `> 0` : c'est le défaut n° 6 de l'historique du projet.
    expect(routesFuzzees.size).toBe(DESCRIPTEURS.length);
    expect(compteur.generes, 'un fuzz de moins de 1 500 cas n’a pas cherché').toBeGreaterThanOrEqual(1_500);
    expect(compteur.plantages).toEqual([]);
    // Discrimination : si le fuzz n'obtenait QUE des refus, il n'atteindrait rien de vivant.
    expect(compteur.refuses, 'le fuzz doit obtenir de vrais refus').toBeGreaterThan(100);
  });

  it('aucun corps hostile n’a pollué `Object.prototype`', () => {
    expect(pollutionsConstatees()).toEqual([]);
  });

  it('le serveur répond encore après toute la batterie', async () => {
    const reponse = await injecter({ methode: 'GET', url: '/api/sante' });
    expect(reponse.statusCode).toBe(200);
  });
});
