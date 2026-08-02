/**
 * Les implantations de test des quatre effets externes — annexe T § 2.3.
 *
 * Conséquence utile, et c'est tout l'objet du lot : la suite complète tourne **sans son, sans
 * voix, sans llama.cpp et sans système de fichiers**.
 *
 * Ce module vit derrière le sous-chemin `@pierre/partage/factices` et **n'est jamais réexporté
 * par le barillet** : il embarque des journaux de test qui n'ont rien à faire dans le bundle
 * de l'enfant (contrat § 3.1).
 */

import { ErreurPierre } from '../erreurs.js';
import type {
  CheminAsset,
  IdExercice,
  IdHabillage,
  IdNoeud,
} from '../identifiants.js';
import type { Competence, Exercice, Noeud } from '../contenu/types.js';
import type { Habillage } from '../moteurs/types.js';
import type { DemandeVoix, FournisseurVoix } from './voix.js';
import type { CanalAudio, CodeEffet, FournisseurAudio } from './audio.js';
import type { DemandeLLM, FournisseurLLM, ReponseLLM } from './llm.js';
import type { DepotContenu } from './depot-contenu.js';

/**
 * Voix de test : résout immédiatement et **journalise les textes demandés**.
 *
 * C'est ce journal qui permet d'affirmer, en v1 où il n'y a aucun audio (écart n° 4 du
 * contrat), que le bouton « écouter » a bel et bien demandé la lecture de la consigne — R15
 * n'est pas satisfaite, mais elle est déjà observable.
 */
export class VoixMuette implements FournisseurVoix {
  readonly disponible = true;
  /** Toutes les demandes reçues, dans l'ordre. */
  readonly demandes: DemandeVoix[] = [];
  /** Nombre d'appels à `taire()`. */
  nbInterruptions = 0;

  /**
   * AJOUT N2 — les clés que cette voix de test déclare connaître.
   *
   * ⚠ FICHIER SANS PROPRIÉTAIRE AU PLAN GELÉ, signalé au rapport de N2. Le § 4.2 ajoute
   * `aUnClip` à `FournisseurVoix` (§ 5.5) sans attribuer ce fichier à quiconque — or
   * `VoixMuette` le déclare `implements`, donc la suite entière cesse de compiler sans cet
   * ajout. Trois lignes, purement additives.
   *
   * VIDE PAR DÉFAUT, et c'est le choix qui compte : une voix de test qui prétendrait
   * connaître toutes les clés rendrait le bouton « écouter » PARTOUT dans les tests
   * composants, et D42 ne serait plus jamais exercée. Un test qui veut le bouton déclare
   * nommément ses clés — `voix.clesConnues.add('clairiere-ecole-01/c1')` — et devient ainsi
   * lisible sur ce qu'il suppose.
   */
  readonly clesConnues = new Set<string>();

  aUnClip(cle: string | null): boolean {
    return cle !== null && this.clesConnues.has(cle);
  }

  dire(demande: DemandeVoix): Promise<void> {
    this.demandes.push(demande);
    return Promise.resolve();
  }

  taire(): void {
    this.nbInterruptions += 1;
  }

  /** Les textes demandés, dans l'ordre — la forme la plus commode pour une assertion. */
  get textes(): readonly string[] {
    return this.demandes.map((demande) => demande.texte);
  }

  reinitialiser(): void {
    this.demandes.length = 0;
    this.nbInterruptions = 0;
  }
}

/** Audio de test : aucun contexte Web Audio n'est ouvert, tout est journalisé. */
export class AudioMuet implements FournisseurAudio {
  readonly disponible = true;
  readonly effets: CodeEffet[] = [];
  readonly ambiances: CheminAsset[] = [];
  readonly volumes = new Map<CanalAudio, number>();

  jouerEffet(code: CodeEffet): Promise<void> {
    this.effets.push(code);
    return Promise.resolve();
  }

  demarrerAmbiance(cle: CheminAsset): Promise<void> {
    this.ambiances.push(cle);
    return Promise.resolve();
  }

  arreterAmbiance(): void {
    /* rien à arrêter : aucun son n'a démarré. */
  }

  reglerVolume(canal: CanalAudio, valeur: number): void {
    this.volumes.set(canal, valeur);
  }

  reinitialiser(): void {
    this.effets.length = 0;
    this.ambiances.length = 0;
    this.volumes.clear();
  }
}

/**
 * LLM de test : réponses fixes.
 *
 * Deux formes acceptées — une liste, consommée dans l'ordre puis en boucle, ou une table
 * indexée par un fragment de l'invite. Sans réponse applicable, le fournisseur **lève** plutôt
 * que d'inventer : un test qui appelle le LLM sans l'avoir scripté doit le savoir.
 */
export class LlmScripte implements FournisseurLLM {
  readonly disponible = true;
  readonly demandes: DemandeLLM[] = [];
  private readonly reponses: readonly string[] | Readonly<Record<string, string>>;
  private rang = 0;

  constructor(reponses: readonly string[] | Readonly<Record<string, string>> = []) {
    this.reponses = reponses;
  }

  completer(demande: DemandeLLM): Promise<ReponseLLM> {
    this.demandes.push(demande);
    const texte = this.choisirTexte(demande.invite);
    return Promise.resolve({
      texte,
      modele: 'llm-scripte',
      jetonsProduits: texte.length,
      dureeMs: 0,
    });
  }

  private choisirTexte(invite: string): string {
    if (Array.isArray(this.reponses)) {
      const liste = this.reponses as readonly string[];
      if (liste.length === 0) {
        throw new ErreurPierre('fournisseur-indisponible', 'LlmScripte n’a aucune réponse scriptée.');
      }
      const texte = liste[this.rang % liste.length] as string;
      this.rang += 1;
      return texte;
    }
    const table = this.reponses as Readonly<Record<string, string>>;
    for (const [fragment, texte] of Object.entries(table)) {
      if (invite.includes(fragment)) {
        return texte;
      }
    }
    throw new ErreurPierre(
      'fournisseur-indisponible',
      'LlmScripte n’a aucune réponse pour cette invite.',
      { invite },
    );
  }

  reinitialiser(): void {
    this.demandes.length = 0;
    this.rang = 0;
  }
}

/**
 * Le contenu servi par `DepotContenuMemoire`. Tout est facultatif : on ne monte que l'utile.
 *
 * Les collections sont des **listes** — indexées par `id` à la construction — parce que c'est
 * sous cette forme qu'on les lit sur disque, et parce que c'est ce que
 * `tests/configuration/preparation.ts` (lot L-G) passe déjà.
 */
export interface ContenuEnMemoire {
  readonly exercices?: readonly Exercice[];
  readonly noeuds?: readonly Noeud[];
  readonly habillages?: readonly Habillage[];
  readonly competences?: readonly Competence[];
  /** Assets indexés par chemin relatif à `contenu/`. Le texte est encodé en UTF-8. */
  readonly assets?: Readonly<Record<CheminAsset, string | Uint8Array>>;
}

function indexer<T extends { readonly id: string }>(elements: readonly T[] | undefined): Map<string, T> {
  return new Map((elements ?? []).map((element) => [element.id, element]));
}

/**
 * Dépôt de contenu servi depuis la mémoire : aucun accès disque, aucune I/O.
 * Une ressource absente rend `null`, comme le dépôt sur disque du lot L-C.
 */
export class DepotContenuMemoire implements DepotContenu {
  private readonly exercices: Map<IdExercice, Exercice>;
  private readonly noeuds: Map<IdNoeud, Noeud>;
  private readonly habillages: Map<IdHabillage, Habillage>;
  private readonly competences: readonly Competence[];
  private readonly assets: Readonly<Record<CheminAsset, string | Uint8Array>>;

  constructor(contenu: ContenuEnMemoire = {}) {
    this.exercices = indexer(contenu.exercices);
    this.noeuds = indexer(contenu.noeuds);
    this.habillages = indexer(contenu.habillages);
    this.competences = contenu.competences ?? [];
    this.assets = contenu.assets ?? {};
  }

  chargerExercice(id: IdExercice): Promise<Exercice | null> {
    return Promise.resolve(this.exercices.get(id) ?? null);
  }

  chargerNoeud(id: IdNoeud): Promise<Noeud | null> {
    return Promise.resolve(this.noeuds.get(id) ?? null);
  }

  chargerHabillage(id: IdHabillage): Promise<Habillage | null> {
    return Promise.resolve(this.habillages.get(id) ?? null);
  }

  listerNoeuds(): Promise<readonly Noeud[]> {
    return Promise.resolve([...this.noeuds.values()]);
  }

  listerExercices(): Promise<readonly Exercice[]> {
    return Promise.resolve([...this.exercices.values()]);
  }

  listerCompetences(): Promise<readonly Competence[]> {
    return Promise.resolve(this.competences);
  }

  lireAsset(chemin: CheminAsset): Promise<Uint8Array | null> {
    const trouve = this.assets[chemin];
    if (trouve === undefined) {
      return Promise.resolve(null);
    }
    return Promise.resolve(typeof trouve === 'string' ? new TextEncoder().encode(trouve) : trouve);
  }
}
