/**
 * LE GRAPHE DE PRÉREQUIS — contrôle 7 de `test:contenu`, et la preuve qu'il se déclenche.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER GARDE
 *
 * Le contrôle 7 a dormi pendant toute la v1 et toute la v2 parmi les DÉSACTIVÉS de
 * `scripts/test-contenu.mjs`, avec pour raison :
 *
 *     « un seul nœud en v1, aucun prérequis (D1) »
 *
 * Mesuré à l'intégration du 2026-08-02, en énumérant les fichiers de `contenu/noeuds/` :
 *
 *     nœuds livrés : 18 | nœuds portant un prérequis non vide : 17
 *
 * La raison était donc fausse depuis longtemps, et le contrôle dormait sur un graphe réel.
 * Aucun défaut n'en est sorti — le graphe est sain — mais c'est un coup de chance qu'aucune
 * commande ne surveillait : un cycle introduit demain par un lot de contenu produirait des
 * nœuds que l'enfant n'ouvrirait JAMAIS, ce qui est un état sans issue au sens de R14.
 *
 * PREMIER TEMPS — le garde refuse ce qu'il doit refuser. Ce sont les cas qui échoueraient si
 * `croiserPrerequis` rendait toujours « rien à signaler ». Sans eux, le contrôle 7 serait vert
 * par construction, et on aurait remplacé une raison fausse par une décoration.
 *
 * SECOND TEMPS — le CONTENU RÉEL du dépôt passe. C'est le seul temps que le contrôle 7
 * exécute en vrai ; il est ici pour que la régression se voie en Vitest aussi, là où l'auteur
 * de contenu ne lance pas toujours `npm run test:contenu` (leçon du lot A2).
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REGLES_PREREQUIS, croiserPrerequis, resumerPrerequis } from '../../scripts/verifier-prerequis.mjs';

import { RACINE_DEPOT } from '../configuration/preparation.js';

interface Anomalie {
  readonly ou: string;
  readonly message: string;
  readonly regle: string;
}

interface Rapport {
  readonly nbNoeuds: number;
  readonly pointsDEntree: readonly string[];
  readonly cycles: readonly string[];
  readonly jamaisOuvrables: readonly string[];
  readonly anomalies: readonly Anomalie[];
}

/** Un nœud réduit à ce que le croisement lit : son identifiant et ses prérequis. */
function noeud(id: string, prerequis?: readonly string[]): { chemin: string; donnees: unknown } {
  return {
    chemin: `contenu/noeuds/${id}.json`,
    donnees: prerequis === undefined ? { id } : { id, prerequis },
  };
}

const declenchees = (rapport: Rapport): readonly string[] =>
  [...new Set(rapport.anomalies.map((a) => a.regle))].sort();

// ─────────────────────────────────────────── premier temps : le garde REFUSE

describe('contrôle 7 — le garde se déclenche, il n’est pas une décoration', () => {
  it('un CYCLE est dénoncé, et le cycle est NOMMÉ pour qu’on puisse le couper', () => {
    const rapport = croiserPrerequis([
      noeud('a'),
      noeud('b', ['c']),
      noeud('c', ['b']),
    ]) as Rapport;

    expect(declenchees(rapport)).toEqual([REGLES_PREREQUIS.CYCLE]);
    expect(rapport.cycles).toHaveLength(1);
    // Le message doit citer les deux nœuds : « inatteignable » ne se corrige pas, « b → c → b » si.
    expect(rapport.cycles[0]).toContain('b');
    expect(rapport.cycles[0]).toContain('c');
    expect(rapport.anomalies[0]?.message).toContain('R14');
    expect(rapport.jamaisOuvrables.slice().sort()).toEqual(['b', 'c']);
  });

  it('un prérequis vers un nœud NON LIVRÉ est dénoncé, en nommant le fichier fautif', () => {
    const rapport = croiserPrerequis([
      noeud('a'),
      noeud('b', ['fantome']),
    ]) as Rapport;

    expect(rapport.anomalies.map((a) => a.regle)).toContain(REGLES_PREREQUIS.PREREQUIS_INCONNU);
    const inconnu = rapport.anomalies.find(
      (a) => a.regle === REGLES_PREREQUIS.PREREQUIS_INCONNU,
    );
    expect(inconnu?.ou).toBe('contenu/noeuds/b.json');
    expect(inconnu?.message).toContain('fantome');
    expect(rapport.jamaisOuvrables).toEqual(['b']);
  });

  it('un dépôt SANS porte d’entrée est dénoncé — rien ne s’ouvrirait jamais', () => {
    const rapport = croiserPrerequis([noeud('a', ['b']), noeud('b', ['a'])]) as Rapport;

    expect(declenchees(rapport)).toContain(REGLES_PREREQUIS.AUCUN_POINT_DENTREE);
    expect(rapport.pointsDEntree).toEqual([]);
  });

  it('un nœud dont les prérequis ne se referment pas est dénoncé UNE fois, sans doublon', () => {
    // `d` dépend de `c`, pris dans un cycle : `d` est inatteignable, mais la CAUSE est le cycle.
    const rapport = croiserPrerequis([
      noeud('a'),
      noeud('b', ['c']),
      noeud('c', ['b']),
      noeud('d', ['c']),
    ]) as Rapport;

    const jamaisOuvrable = rapport.anomalies.filter(
      (a) => a.regle === REGLES_PREREQUIS.JAMAIS_OUVRABLE,
    );
    // `b` et `c` sont dénoncés par la règle CYCLE ; seul `d` relève de JAMAIS_OUVRABLE.
    expect(jamaisOuvrable.map((a) => a.ou)).toEqual(['contenu/noeuds/d.json']);
  });

  it('deux fichiers sous le MÊME identifiant sont dénoncés — sinon le graphe ment', () => {
    const rapport = croiserPrerequis([
      noeud('a'),
      { chemin: 'contenu/noeuds/a-bis.json', donnees: { id: 'a', prerequis: ['a'] } },
    ]) as Rapport;

    expect(declenchees(rapport)).toContain(REGLES_PREREQUIS.IDENTIFIANT_DOUBLE);
  });

  it('un nœud SANS champ `prerequis` est une porte d’entrée, pas une anomalie', () => {
    // C'est l'audit par OBJET (D48) : le champ ABSENT est une information, et aucune
    // recherche textuelle de « prerequis » ne la trouve.
    const rapport = croiserPrerequis([noeud('a'), noeud('b', ['a'])]) as Rapport;

    expect(rapport.anomalies).toEqual([]);
    expect(rapport.pointsDEntree).toEqual(['a']);
  });
});

// ─────────────────────────────────── second temps : le CONTENU RÉEL du dépôt

describe('contrôle 7 — le contenu réellement livré', () => {
  const noeudsLivres = readdirSync(join(RACINE_DEPOT, 'contenu', 'noeuds'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      chemin: `contenu/noeuds/${f}`,
      donnees: JSON.parse(readFileSync(join(RACINE_DEPOT, 'contenu', 'noeuds', f), 'utf8')),
    }));

  it('le dépôt a bien un graphe à contrôler — sinon les cas suivants seraient vrais par vacuité', () => {
    expect(noeudsLivres.length).toBeGreaterThanOrEqual(12);
    const avecPrerequis = noeudsLivres.filter(
      (n) => Array.isArray(n.donnees.prerequis) && n.donnees.prerequis.length > 0,
    );
    // La raison qui a maintenu ce contrôle désactivé — « un seul nœud, aucun prérequis » —
    // doit rester visiblement fausse. Si elle redevenait vraie, ce cas le dirait.
    expect(avecPrerequis.length).toBeGreaterThan(0);
  });

  it('aucun cycle, aucun prérequis inconnu, aucun nœud jamais ouvrable (R14)', () => {
    const rapport = croiserPrerequis(noeudsLivres) as Rapport;

    expect(rapport.anomalies, resumerPrerequis(rapport)).toEqual([]);
    expect(rapport.cycles).toEqual([]);
    expect(rapport.jamaisOuvrables).toEqual([]);
    expect(rapport.pointsDEntree.length, 'le jeu doit avoir au moins une porte d’entrée').toBeGreaterThan(
      0,
    );
  });
});
