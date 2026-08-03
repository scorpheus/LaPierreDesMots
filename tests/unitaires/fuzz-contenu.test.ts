/**
 * LE FUZZER DE CONTENU — lot Q4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LES DEUX PROPRIÉTÉS, ET ELLES NE SONT PAS LA MÊME
 *
 * « Le contenu est produit par des agents et par ingestion : il sera malformé un jour. »
 *
 *   1. **La validation REFUSE**, et son message DÉSIGNE le champ fautif. Sans quoi un contenu
 *      cassé atteint l'enfant.
 *   2. **Rien ne plante.** Ni la validation, ni le moteur, ni le rendu du SVG. Sans quoi un
 *      contenu cassé casse le jeu pour tout le reste, y compris ce qui était sain.
 *
 * Un validateur qui LÈVE sur une entrée absurde tient (1) et viole (2) — c'est la mutation
 * n° 15 de `Docs/audit-qa.md` (« le repli “viewBox illisible” lève au lieu de replier »).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EMPÊCHE CE FICHIER D'ÊTRE VERT PAR VACUITÉ
 *
 * Trois garde-fous, tous exécutables :
 *
 * 1. **Les cas invalides sont DÉRIVÉS DU SCHÉMA**, contrainte par contrainte, jamais écrits à
 *    la main. Le marcheur descend `SCHEMA_EXERCICE` et le schéma que chaque moteur publie, et
 *    fabrique un cas par `required`, par `type`, par `enum`, par `pattern`, par borne, par
 *    `additionalProperties: false`. **On énumère les objets, pas les occurrences** (D48) : un
 *    champ ajouté demain au contrat est fuzzé sans qu'on touche à ce fichier, et un schéma
 *    qu'on desserrerait produirait MOINS de cas — donc ferait tomber le plancher.
 * 2. **La DISCRIMINATION** : les 18 exercices réels du dépôt doivent être ACCEPTÉS. Sans ce
 *    cas, un validateur qui refuse tout passerait tous les autres.
 * 3. **Le CONTRAT DE SORTIE est une égalité**, pas un `> 0` : cas générés, refusés proprement,
 *    plantages, avec un plancher sur la population. C'est le défaut n° 6 de l'historique du
 *    projet (« 14 moteurs joués sur 14 » asserté `> 0`).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * DÉTERMINISME — aucun `Math.random`, aucun `Date.now`. Corpus figé, graine constante.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { initialiserRegistreMoteurs, obtenirMoteur } from '@pierre/partage';
import {
  SCHEMA_EXERCICE,
  estCheminFerme,
  validerBlocJeu,
  validerExercice,
  validerSceneSvg
} from '@pierre/partage/validation';
import type { Exercice, Habillage, RapportValidation, SchemaJson } from '@pierre/partage';
import { resoudreSousRacine } from '@serveur/services/depot-contenu-disque';
import { REGLES_PREREQUIS, croiserPrerequis } from '../../scripts/verifier-prerequis.mjs';

import { RACINE_DEPOT, aleaDeTest, horlogeDeTest } from '../configuration/preparation.js';
import {
  CHAINES_HOSTILES,
  Compteur,
  VALEURS_HOSTILES,
  aleaFuzz,
  copie,
  documentQuelconque,
  objetProfond,
  pointeursDe,
  poserAuPointeur,
  SUPPRIMER
} from '../fuzz/corpus.js';

initialiserRegistreMoteurs();

// ═══════════════════════════════════════════════ 1. le contenu réel, lu sur disque (D48)

interface FichierExercice {
  readonly chemin: string;
  readonly exercice: Exercice;
}

function fichiersSous(dossier: string, suffixe: string): readonly string[] {
  const trouves: string[] = [];
  const descendre = (relatif: string): void => {
    for (const entree of readdirSync(join(RACINE_DEPOT, relatif), { withFileTypes: true })) {
      const sous = `${relatif}/${entree.name}`;
      if (entree.isDirectory()) {
        descendre(sous);
      } else if (entree.name.endsWith(suffixe)) {
        trouves.push(sous);
      }
    }
  };
  descendre(dossier);
  return trouves.sort();
}

function lire<T>(cheminRelatif: string): T {
  return JSON.parse(readFileSync(join(RACINE_DEPOT, cheminRelatif), 'utf8')) as T;
}

/** Les 18 exercices livrés. Énumérés depuis le DISQUE : aucune liste écrite à la main. */
const EXERCICES: readonly FichierExercice[] = fichiersSous('contenu/exercices', '.json').map(
  (chemin) => ({ chemin, exercice: lire<Exercice>(chemin) })
);

/** Les habillages livrés, indexés par leur identifiant déclaré. */
const HABILLAGES: ReadonlyMap<string, Habillage> = new Map(
  fichiersSous('contenu/habillages', '.habillage.json')
    .map((chemin) => lire<Habillage>(chemin))
    .map((h) => [h.id, h])
);

/** Le SVG de scène d'un habillage, quand il existe. */
function svgDe(habillage: Habillage): string | null {
  const chemins = fichiersSous('contenu/habillages', '.svg');
  const attendu = habillage.scene.fichier ?? '';
  const trouve = chemins.find((c) => attendu !== '' && c.endsWith(attendu.replace(/^\.?\//u, '')));
  return trouve === undefined ? null : readFileSync(join(RACINE_DEPOT, trouve), 'utf8');
}

// ══════════════════════════════════════════ 2. le marcheur de schéma — un cas par contrainte

interface CasInvalide {
  /** Ce qu'on éprouve, imprimé dans le message d'échec. */
  readonly regle: string;
  /** Pointeur JSON du champ muté. */
  readonly pointeur: string;
  /** Pointeur que la validation DOIT citer (Ajv remonte au parent pour `required`). */
  readonly pointeurAttendu: string;
  readonly document: unknown;
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Une valeur d'un type que `types` n'admet pas. */
function valeurDeMauvaisType(types: readonly string[]): unknown {
  if (!types.includes('string')) return 'du texte la ou il ne faut pas';
  if (!types.includes('integer') && !types.includes('number')) return 987_654;
  if (!types.includes('boolean')) return true;
  if (!types.includes('array')) return ['un', 'tableau'];
  if (!types.includes('object')) return { un: 'objet' };
  return null;
}

/**
 * Descend un schéma JSON EN PARALLÈLE du document réel, et rend un cas invalide par contrainte
 * réellement exprimée. C'est ici que « énumérer les objets, pas les occurrences » se paie : le
 * générateur ne connaît aucun nom de champ, il ne connaît que les mots-clés de JSON Schema.
 */
function casDepuisSchema(
  schema: unknown,
  document: unknown,
  racine: unknown,
  chemin: string,
  cheminRacine: string
): readonly CasInvalide[] {
  const cas: CasInvalide[] = [];
  if (!estObjet(schema)) {
    return cas; // `contenu: true` — aucune contrainte, rien à éprouver.
  }
  const pointeurComplet = `${cheminRacine}${chemin}`;
  const poser = (regle: string, valeur: unknown, attendu = pointeurComplet): void => {
    cas.push({
      regle,
      pointeur: pointeurComplet,
      pointeurAttendu: attendu,
      document: poserAuPointeur(racine, chemin, valeur)
    });
  };

  const types = Array.isArray(schema['type'])
    ? (schema['type'] as string[])
    : typeof schema['type'] === 'string'
      ? [schema['type'] as string]
      : [];

  // ── contraintes de valeur, sur CE nœud
  if (types.length > 0 && chemin !== '') {
    poser(`type:${types.join('|')}`, valeurDeMauvaisType(types));
  }
  if (Array.isArray(schema['enum']) && chemin !== '') {
    poser('enum', 'valeur-absente-de-l-enumeration');
  }
  if (typeof schema['pattern'] === 'string' && chemin !== '') {
    poser('pattern', 'VALEUR !! qui ne colle a aucun motif du contrat');
  }
  if (typeof schema['minimum'] === 'number' && chemin !== '') {
    poser('minimum', (schema['minimum'] as number) - 1);
  }
  if (typeof schema['maximum'] === 'number' && chemin !== '') {
    poser('maximum', (schema['maximum'] as number) + 1);
  }
  if (typeof schema['minLength'] === 'number' && (schema['minLength'] as number) > 0 && chemin !== '') {
    poser('minLength', '');
  }
  if (typeof schema['maxLength'] === 'number' && chemin !== '') {
    poser('maxLength', 'a'.repeat((schema['maxLength'] as number) + 1));
  }
  if (typeof schema['minItems'] === 'number' && (schema['minItems'] as number) > 0) {
    poser('minItems', []);
  }
  if (typeof schema['maxItems'] === 'number' && Array.isArray(document)) {
    poser(
      'maxItems',
      Array.from({ length: (schema['maxItems'] as number) + 1 }, () => copie(document[0]))
    );
  }
  if (schema['uniqueItems'] === true && Array.isArray(document) && document.length > 0) {
    poser('uniqueItems', [copie(document[0]), copie(document[0])]);
  }

  // ── objet : `required`, `additionalProperties`, puis descente
  if (estObjet(schema['properties']) && estObjet(document)) {
    const proprietes = schema['properties'];
    if (schema['additionalProperties'] === false) {
      poser('additionalProperties', { ...document, champEnTropDuFuzz: 'intrus' });
    }
    for (const nom of (schema['required'] as string[] | undefined) ?? []) {
      if (Object.hasOwn(document, nom)) {
        cas.push({
          regle: 'required',
          pointeur: `${pointeurComplet}/${nom}`,
          // Ajv rapporte `required` sur le PARENT : c'est lui qui manque quelque chose.
          pointeurAttendu: pointeurComplet,
          document: poserAuPointeur(racine, `${chemin}/${nom}`, SUPPRIMER)
        });
      }
    }
    for (const [nom, sousSchema] of Object.entries(proprietes)) {
      if (Object.hasOwn(document, nom)) {
        cas.push(
          ...casDepuisSchema(
            sousSchema,
            document[nom],
            racine,
            `${chemin}/${nom}`,
            cheminRacine
          )
        );
      }
    }
  }

  // ── tableau : on descend dans le PREMIER élément (les autres ont la même forme)
  if (schema['items'] !== undefined && Array.isArray(document) && document.length > 0) {
    cas.push(
      ...casDepuisSchema(schema['items'], document[0], racine, `${chemin}/0`, cheminRacine)
    );
  }

  return cas;
}

// ══════════════════════════════════════════════════════════════════ 3. les compteurs partagés

const compteur = new Compteur('fuzz-contenu');
const echecs: string[] = [];

function noter(refuse: boolean): void {
  compteur.generes += 1;
  if (refuse) {
    compteur.refuses += 1;
  } else {
    compteur.acceptes += 1;
  }
}

/**
 * Les plantages notés DEPUIS un repère.
 *
 * Le compteur est partagé par tout le fichier (c'est lui qui porte le contrat de sortie), mais
 * un cas ne doit rougir que de SES propres plantages : sinon un seul défaut fait échouer six
 * cas et le rapport ne dit plus lequel l'a trouvé.
 */
function repere(): number {
  return compteur.plantages.length;
}

function plantagesDepuis(debut: number): readonly string[] {
  return compteur.plantages.slice(debut);
}

/** Exécute `action` et note un plantage plutôt que de laisser l'exception tomber la suite. */
function sansPlanter<T>(intitule: string, action: () => T): T | undefined {
  try {
    return action();
  } catch (erreur) {
    compteur.plantages.push(`${intitule} → ${(erreur as Error).message.slice(0, 160)}`);
    return undefined;
  }
}

/** Tout problème rendu doit être lisible : un pointeur, un message, une règle nommée. */
function messagesClairs(rapport: RapportValidation, intitule: string): void {
  for (const probleme of rapport.problemes) {
    if (typeof probleme.message !== 'string' || probleme.message.trim() === '') {
      echecs.push(`${intitule} : problème sans message`);
    }
    if (typeof probleme.regle !== 'string' || probleme.regle.trim() === '') {
      echecs.push(`${intitule} : problème sans règle nommée`);
    }
    if (typeof probleme.chemin !== 'string') {
      echecs.push(`${intitule} : problème sans pointeur`);
    } else if (probleme.chemin !== '' && !probleme.chemin.startsWith('/') && !probleme.chemin.startsWith('#')) {
      echecs.push(`${intitule} : pointeur mal formé « ${probleme.chemin} »`);
    }
  }
}

// ═════════════════════════════════════════════════════════ 4. discrimination — d'abord ceci

describe('discrimination — le contenu réel du dépôt est ACCEPTÉ', () => {
  it('les 18 exercices livrés passent l’enveloppe ET le bloc de leur moteur', () => {
    expect(EXERCICES.length, 'aucun exercice lu : le fuzzer n’aurait rien à muter').toBeGreaterThanOrEqual(18);

    const refuses: string[] = [];
    let avecHabillage = 0;
    for (const { chemin, exercice } of EXERCICES) {
      const enveloppe = validerExercice(exercice);
      if (!enveloppe.valide) {
        refuses.push(`${chemin} (enveloppe) ${JSON.stringify(enveloppe.problemes)}`);
      }
      const habillage = HABILLAGES.get(exercice.jeu.habillage);
      if (habillage !== undefined) {
        avecHabillage += 1;
        const bloc = validerBlocJeu(exercice, habillage);
        if (!bloc.valide) {
          refuses.push(`${chemin} (bloc) ${JSON.stringify(bloc.problemes)}`);
        }
      }
    }
    console.log(
      `[fuzz-contenu] discrimination — ${String(EXERCICES.length)} exercices, ` +
        `${String(avecHabillage)} avec leur habillage, ${String(HABILLAGES.size)} habillages lus`
    );
    expect(refuses, 'un validateur qui refuse le contenu réel rendrait tout le reste creux').toEqual([]);
    // Plancher : sans lui, zéro habillage retrouvé laisserait la moitié du fuzz sans oracle.
    expect(avecHabillage, 'aucun exercice n’a retrouvé son habillage').toBeGreaterThanOrEqual(15);
  });
});

// ══════════════════════════════════ 5. le fuzz dirigé par le schéma — REFUS + message clair

describe('un contenu malformé est REFUSÉ, et le refus désigne le champ fautif', () => {
  it('chaque contrainte de l’enveloppe, violée une à une, est attrapée', () => {
    const debut = repere();
    const survivants: string[] = [];
    let contraintes = 0;

    for (const { chemin, exercice } of EXERCICES) {
      for (const cas of casDepuisSchema(SCHEMA_EXERCICE, exercice, exercice, '', '')) {
        contraintes += 1;
        const rapport = sansPlanter(`${chemin} ${cas.regle} ${cas.pointeur}`, () =>
          validerExercice(cas.document)
        );
        if (rapport === undefined) {
          continue;
        }
        noter(!rapport.valide);
        if (rapport.valide) {
          survivants.push(`${chemin} · ${cas.regle} · ${cas.pointeur}`);
          continue;
        }
        messagesClairs(rapport, `${chemin} ${cas.pointeur}`);
        // Le message doit DÉSIGNER le champ : un « quelque chose ne va pas » global n'aide
        // ni l'agent qui a produit le contenu, ni le parent qui relit le brouillon.
        const cites = rapport.problemes.map((p) => p.chemin);
        if (!cites.includes(cas.pointeurAttendu)) {
          echecs.push(
            `${chemin} · ${cas.regle} · attendu le pointeur « ${cas.pointeurAttendu} », ` +
              `obtenu ${JSON.stringify(cites.slice(0, 4))}`
          );
        }
      }
    }

    console.log(
      `[fuzz-contenu] enveloppe — ${String(contraintes)} contraintes violées une à une, ` +
        `${String(survivants.length)} survivante(s)`
    );
    // Plancher : un schéma qu'on desserrerait produirait MOINS de cas et ferait tomber ce test.
    expect(contraintes, 'moins de 400 contraintes : le marcheur ne descend plus').toBeGreaterThanOrEqual(400);
    expect(survivants, 'des contenus invalides passent la validation').toEqual([]);
    expect(plantagesDepuis(debut), '`validerExercice` a levé sur un cas du schéma').toEqual([]);
    expect(echecs, 'des refus sans pointeur ni message clair').toEqual([]);
  });

  it('chaque contrainte du bloc `jeu.contenu` de chaque moteur est attrapée', () => {
    const debut = repere();
    const survivants: string[] = [];
    const moteursEprouves = new Set<string>();
    let contraintes = 0;

    for (const { chemin, exercice } of EXERCICES) {
      const habillage = HABILLAGES.get(exercice.jeu.habillage);
      if (habillage === undefined) {
        continue;
      }
      const schema: SchemaJson = obtenirMoteur(exercice.jeu.moteur).schemaContenu;
      moteursEprouves.add(exercice.jeu.moteur);

      for (const cas of casDepuisSchema(
        schema,
        exercice.jeu.contenu,
        exercice.jeu.contenu,
        '',
        ''
      )) {
        contraintes += 1;
        const mute = copie(exercice) as unknown as { jeu: { contenu: unknown } };
        mute.jeu.contenu = cas.document;
        const rapport = sansPlanter(`${chemin} ${cas.regle} ${cas.pointeur}`, () =>
          validerBlocJeu(mute as unknown as Exercice, habillage)
        );
        if (rapport === undefined) {
          continue;
        }
        noter(!rapport.valide);
        if (rapport.valide) {
          survivants.push(`${chemin} · ${exercice.jeu.moteur} · ${cas.regle} · ${cas.pointeur}`);
          continue;
        }
        messagesClairs(rapport, `${chemin} ${cas.pointeur}`);
      }
    }

    console.log(
      `[fuzz-contenu] blocs de jeu — ${String(moteursEprouves.size)} moteurs éprouvés, ` +
        `${String(contraintes)} contraintes violées, ${String(survivants.length)} survivante(s)`
    );
    // MESURÉ, pas supposé : les 18 exercices livrés couvrent les **14** moteurs déclarés — le
    // fuzz du bloc de jeu n'a donc aucun angle mort côté moteur. Le plancher est posé à 14 : il
    // tombe si du contenu disparaît, et il ne gêne pas l'arrivée d'un quinzième moteur.
    expect(moteursEprouves.size, 'moins de 14 moteurs éprouvés').toBeGreaterThanOrEqual(14);
    expect(contraintes, 'moins de 300 contraintes de bloc').toBeGreaterThanOrEqual(300);
    expect(survivants, 'des blocs `jeu.contenu` invalides passent la validation').toEqual([]);
    expect(plantagesDepuis(debut), '`validerBlocJeu` a levé sur un cas du schéma').toEqual([]);
    expect(echecs, 'des refus sans pointeur ni message clair').toEqual([]);
  });
});

// ═══════════════════════════ 6. les refus NOMMÉS — moteur inconnu, région, couleur, habillage

describe('les refus que le contrat nomme', () => {
  const { exercice } = EXERCICES.find((f) => f.exercice.jeu.moteur === 'colorie')!;
  const habillage = HABILLAGES.get(exercice.jeu.habillage)!;

  function reglesDe(rapport: RapportValidation): readonly string[] {
    return rapport.problemes.map((p) => p.regle);
  }

  it('un MOTEUR INCONNU est refusé, nommément, et rien d’autre n’est reproché', () => {
    for (const faux of ['moteur-fantome', '', 'COLORIE', 'colorie ', '__proto__', 'constructor']) {
      const mute = copie(exercice) as unknown as { jeu: { moteur: string } };
      mute.jeu.moteur = faux;
      const rapport = validerBlocJeu(mute as unknown as Exercice, habillage);
      noter(!rapport.valide);
      expect(rapport.valide, `moteur « ${faux} »`).toBe(false);
      expect(reglesDe(rapport), `moteur « ${faux} »`).toEqual(['moteur-inconnu']);
      expect(rapport.problemes[0]?.message).toContain(faux);
    }
  });

  it('une RÉGION INEXISTANTE citée par le contenu est refusée, avec son pointeur', () => {
    const cibles = pointeursDe(exercice.jeu.contenu).filter((p) => p.endsWith('/region'));
    expect(cibles.length, 'la fixture doit citer au moins une région').toBeGreaterThan(0);

    for (const pointeur of cibles) {
      for (const faux of ['region-qui-n-existe-pas', '__proto__', 'porte-ecole-']) {
        const mute = copie(exercice) as unknown as { jeu: { contenu: unknown } };
        mute.jeu.contenu = poserAuPointeur(exercice.jeu.contenu, pointeur, faux);
        const rapport = validerBlocJeu(mute as unknown as Exercice, habillage);
        noter(!rapport.valide);
        expect(rapport.valide, `région « ${faux} » en ${pointeur}`).toBe(false);
        expect(
          rapport.problemes.some((p) => p.regle === 'region-inconnue' || p.regle === 'schema'),
          `région « ${faux} » en ${pointeur} : ${JSON.stringify(rapport.problemes)}`
        ).toBe(true);
      }
    }
  });

  it('une COULEUR HORS NUANCIER est refusée par le schéma du moteur', () => {
    const cibles = pointeursDe(exercice.jeu.contenu).filter((p) => p.endsWith('/couleur'));
    expect(cibles.length, 'la fixture doit citer au moins une couleur').toBeGreaterThan(0);

    for (const pointeur of cibles) {
      for (const fausse of ['fuchsia', '#FF00FF', 'ROUGE', 'rouge-vif', '']) {
        const mute = copie(exercice) as unknown as { jeu: { contenu: unknown } };
        mute.jeu.contenu = poserAuPointeur(exercice.jeu.contenu, pointeur, fausse);
        const rapport = validerBlocJeu(mute as unknown as Exercice, habillage);
        noter(!rapport.valide);
        expect(rapport.valide, `couleur « ${fausse} » en ${pointeur}`).toBe(false);
        expect(
          rapport.problemes.some((p) => p.chemin === `/jeu/contenu${pointeur}`),
          `couleur « ${fausse} » : ${JSON.stringify(rapport.problemes)}`
        ).toBe(true);
      }
    }
  });

  it('un HABILLAGE qui ne déclare pas le moteur, ou dont l’identifiant diffère, est refusé', () => {
    const autreId = copie(habillage) as unknown as { id: string };
    autreId.id = 'clairiere.un-decor-qui-n-existe-pas';
    const r1 = validerBlocJeu(exercice, autreId as unknown as Habillage);
    noter(!r1.valide);
    expect(reglesDe(r1)).toContain('habillage-incompatible');

    const sansMoteur = copie(habillage) as unknown as { moteurs: string[] };
    sansMoteur.moteurs = [];
    const r2 = validerBlocJeu(exercice, sansMoteur as unknown as Habillage);
    noter(!r2.valide);
    expect(reglesDe(r2)).toContain('habillage-incompatible');
  });
});

// ═══════════════════════════════════════════════════════════ 7. le SVG — chemins ouverts

describe('le SVG — un chemin ouvert fait fuiter la couleur, il doit être vu', () => {
  const habillageColoriable = [...HABILLAGES.values()].find((h) =>
    h.scene.calques.some((c) => c.role === 'coloriable' && c.regions.length > 0)
  )!;

  it('les SVG réellement livrés passent leur habillage — discrimination', () => {
    let controles = 0;
    const fautifs: string[] = [];
    for (const habillage of HABILLAGES.values()) {
      const texte = svgDe(habillage);
      if (texte === null) {
        continue;
      }
      controles += 1;
      const rapport = validerSceneSvg(texte, habillage);
      if (!rapport.valide) {
        fautifs.push(`${habillage.id} ${JSON.stringify(rapport.problemes.slice(0, 3))}`);
      }
    }
    console.log(`[fuzz-contenu] SVG — ${String(controles)} scènes réelles contrôlées`);
    expect(controles, 'aucun SVG de scène retrouvé').toBeGreaterThanOrEqual(10);
    expect(fautifs, 'un SVG livré ne satisfait plus son habillage').toEqual([]);
  });

  it('chaque manière de laisser un chemin OUVERT est signalée', () => {
    const calque = habillageColoriable.scene.calques.find(
      (c) => c.role === 'coloriable' && c.regions.length > 0
    )!;
    const region = calque.regions[0]!.id;

    const ouverts = [
      'M10,10 L90,10 L90,90 L10,90',
      'M10,10 L90,10 Z M20,20 L80,20',
      'L10,10 Z',
      'M10,10',
      '   ',
      'Z',
      'm10,10 l5,5'
    ];
    for (const d of ouverts) {
      const svg =
        `<svg viewBox="0 0 100 100"><g id="${calque.id}">` +
        `<path id="${region}" d="${d}"/></g></svg>`;
      const rapport = sansPlanter(`svg-ouvert ${d}`, () =>
        validerSceneSvg(svg, habillageAvecCeSeulCalque(habillageColoriable, calque.id))
      );
      expect(rapport, `d="${d}"`).toBeDefined();
      noter(!rapport!.valide);
      expect(rapport!.valide, `d="${d}" devrait être refusé`).toBe(false);
      expect(rapport!.problemes.map((p) => p.regle), `d="${d}"`).toContain('svg-chemin-ouvert');
    }
  });

  it('`estCheminFerme` ne lève sur AUCUNE des chaînes hostiles, et rend un booléen', () => {
    const debut = repere();
    const entrees = [
      ...CHAINES_HOSTILES,
      'M'.repeat(50_000),
      `M0,0 ${'L1,1 '.repeat(20_000)}Z`,
      'M0,0 Z'.repeat(5_000)
    ];
    for (const d of entrees) {
      const verdict = sansPlanter(`estCheminFerme(${d.slice(0, 20)}…)`, () => estCheminFerme(d));
      compteur.generes += 1;
      expect(typeof verdict, `d="${d.slice(0, 30)}"`).toBe('boolean');
    }
    expect(plantagesDepuis(debut), '`estCheminFerme` a levé').toEqual([]);
  });

  it('`validerSceneSvg` ne lève sur AUCUN SVG pathologique', () => {
    const debut = repere();
    const svgs = [
      '',
      '<svg>',
      '<svg><g id="a"></svg>',
      '<g id="a"><g id="b"><g id="c"></g></g>',
      `${'<g id="x">'.repeat(500)}${'</g>'.repeat(500)}`,
      '<svg><g id="a" /><path d="M0,0 Z"/></g></svg>',
      '<svg><g id="a"><path/></g></svg>',
      '<svg><g id="a"><path d=/></g></svg>',
      'pas du tout du xml',
      '<svg>\u0000<g id="a"></g></svg>',
      `<svg><g id="a">${'<path d="M0,0" />'.repeat(2_000)}</g></svg>`,
      JSON.stringify(objetProfond(200))
    ];
    for (const texte of svgs) {
      for (const habillage of [habillageColoriable, ...HABILLAGES.values()].slice(0, 4)) {
        const rapport = sansPlanter(`validerSceneSvg(${texte.slice(0, 24)}…)`, () =>
          validerSceneSvg(texte, habillage)
        );
        compteur.generes += 1;
        expect(rapport, `svg « ${texte.slice(0, 30)} »`).toBeDefined();
        messagesClairs(rapport!, `svg ${texte.slice(0, 24)}`);
      }
    }
    expect(plantagesDepuis(debut), '`validerSceneSvg` a levé').toEqual([]);
    expect(echecs, 'un problème de SVG sans pointeur ni message').toEqual([]);
  });

  it('un HABILLAGE malformé fait REFUSER, jamais lever — c’est le cas de `test:contenu`', () => {
    const debut = repere();
    // `scripts/test-contenu.mjs:497` passe à `validerSceneSvg` un habillage relu du disque et
    // JAMAIS validé. Un habillage produit par un agent et privé de `scene` faisait tomber tout
    // le contrôle de contenu sur une trace de pile, au lieu de nommer le fichier fautif.
    const svg = '<svg viewBox="0 0 10 10"><g id="a"><path id="p" d="M0,0 Z"/></g></svg>';
    const exercice = EXERCICES[0]!.exercice;
    let cas = 0;

    for (const pointeur of ['', '/scene', '/scene/calques', '/scene/calques/0', '/id', '/moteurs']) {
      for (const hostile of VALEURS_HOSTILES) {
        const mute =
          pointeur === ''
            ? hostile.valeur
            : poserAuPointeur(habillageColoriable, pointeur, hostile.valeur);

        const rSvg = sansPlanter(`svg+habillage ${pointeur} ${hostile.nom}`, () =>
          validerSceneSvg(svg, mute as Habillage)
        );
        const rBloc = sansPlanter(`bloc+habillage ${pointeur} ${hostile.nom}`, () =>
          validerBlocJeu(exercice, mute as Habillage)
        );
        cas += 2;
        compteur.generes += 2;
        expect(rSvg, `svg + habillage ${pointeur}=${hostile.nom}`).toBeDefined();
        expect(rBloc, `bloc + habillage ${pointeur}=${hostile.nom}`).toBeDefined();
        messagesClairs(rSvg!, `svg ${pointeur} ${hostile.nom}`);
        messagesClairs(rBloc!, `bloc ${pointeur} ${hostile.nom}`);
      }
    }

    console.log(`[fuzz-contenu] habillages malformés — ${String(cas)} cas`);
    expect(cas, 'moins de 300 cas d’habillage malformé').toBeGreaterThanOrEqual(300);
    expect(plantagesDepuis(debut), 'un habillage malformé a fait lever la validation').toEqual([]);
    expect(echecs, 'un refus d’habillage sans pointeur ni message').toEqual([]);
  });
});

/** Un habillage réduit à un seul de ses calques — `validerSceneSvg` exige tous les autres. */
function habillageAvecCeSeulCalque(habillage: Habillage, idCalque: string): Habillage {
  const reduit = copie(habillage) as unknown as {
    scene: { calques: { id: string }[] };
  };
  reduit.scene.calques = reduit.scene.calques.filter((c) => c.id === idCalque);
  return reduit as unknown as Habillage;
}

// ═══════════════════════════════════════════ 8. rien ne plante — le corpus hostile intégral

describe('rien ne plante — ni la validation, ni le moteur', () => {
  it('une valeur hostile à CHAQUE pointeur de CHAQUE exercice : aucune exception', () => {
    const debut = repere();
    // Les DEUX étages sont éprouvés au même endroit. `validerExercice` ne regarde pas
    // `jeu.contenu` (il est déclaré `true` dans l'enveloppe) : sans `validerBlocJeu`, la
    // moitié des pointeurs d'un exercice recevrait des saloperies sans que personne ne les
    // lise — un fuzz vert par construction sur tout le bloc de jeu.
    let cas = 0;
    let casDeBloc = 0;
    for (const { chemin, exercice } of EXERCICES) {
      const habillage = HABILLAGES.get(exercice.jeu.habillage);
      for (const pointeur of pointeursDe(exercice)) {
        for (const hostile of VALEURS_HOSTILES) {
          const document = poserAuPointeur(exercice, pointeur, hostile.valeur);
          const rapport = sansPlanter(`${chemin} ${pointeur} ${hostile.nom}`, () =>
            validerExercice(document)
          );
          cas += 1;
          if (rapport !== undefined) {
            noter(!rapport.valide);
            messagesClairs(rapport, `${chemin} ${pointeur} ${hostile.nom}`);
          }
          if (habillage !== undefined) {
            const bloc = sansPlanter(`bloc ${chemin} ${pointeur} ${hostile.nom}`, () =>
              validerBlocJeu(document as Exercice, habillage)
            );
            casDeBloc += 1;
            if (bloc !== undefined) {
              messagesClairs(bloc, `bloc ${chemin} ${pointeur} ${hostile.nom}`);
            }
          }
        }
      }
    }
    console.log(
      `[fuzz-contenu] pointeurs × valeurs hostiles — ${String(cas)} sur l’enveloppe, ` +
        `${String(casDeBloc)} sur le bloc de jeu`
    );
    expect(cas, 'moins de 3 000 cas : le parcours des pointeurs ne descend plus').toBeGreaterThanOrEqual(3_000);
    expect(casDeBloc, 'le bloc de jeu n’est plus éprouvé').toBeGreaterThanOrEqual(3_000);
    expect(plantagesDepuis(debut), 'la validation a levé sur une entrée hostile').toEqual([]);
    expect(echecs, 'un refus sans pointeur ni message').toEqual([]);
    // ⚠ BUDGET DE TEMPS, PAS UNE ASSERTION ASSOUPLIE. Aucun plancher ci-dessus n'a bougé, et
    // ils sont largement dépassés : 89 568 cas sur l'enveloppe et autant sur le bloc de jeu,
    // MESURÉS, contre ≈ 30 000 quand ce cas a été écrit. La cause est le contenu — 76
    // exercices là où il y en avait 26 —, et c'est exactement ce qu'on veut voir fuzzer.
    //
    // DEUX DURÉES MESURÉES, et c'est la seconde qui commande :
    //   · `npx vitest run` seul .................... 4 809 ms
    //   · `npm run verifier`, donc `--coverage` .... 33 001 ms
    // L'instrumentation v8 de la couverture multiplie le coût par plus de six, et c'est la
    // chaîne complète qui fait foi. Le délai par défaut de vitest est de 5 000 ms : le cas
    // passait seul et échouait dans la chaîne. 180 000 ms laissent la marge du pire des deux.
  }, 180_000);

  it('des documents tirés au sort : `validerExercice` refuse et ne lève jamais', () => {
    const debut = repere();
    const alea = aleaFuzz();
    let acceptes = 0;
    for (let i = 0; i < 2_000; i += 1) {
      const document = documentQuelconque(alea, 4);
      const rapport = sansPlanter(`tirage ${String(i)}`, () => validerExercice(document));
      compteur.generes += 1;
      if (rapport === undefined) {
        continue;
      }
      if (rapport.valide) {
        acceptes += 1;
      } else {
        compteur.refuses += 1;
        messagesClairs(rapport, `tirage ${String(i)}`);
      }
    }
    console.log(`[fuzz-contenu] 2 000 documents tirés — ${String(acceptes)} accepté(s)`);
    expect(plantagesDepuis(debut), '`validerExercice` a levé sur un tirage').toEqual([]);
    // Un document tiré au hasard ne peut pas être un exercice valide : s'il en passe un, le
    // schéma n'exige plus rien.
    expect(acceptes, 'un document tiré au sort a été accepté comme exercice').toBe(0);
  });

  it('un contenu ACCEPTÉ par la validation se joue sans lever — l’autre moitié de la promesse', () => {
    const debut = repere();
    // Le contrat du lot : « un contenu invalide ne doit jamais atteindre l'enfant, et ne doit
    // jamais casser le jeu pour autant ». Ce cas garde la seconde moitié : ce qui passe la
    // validation doit être JOUABLE. Un moteur qui lève sur un contenu validé transforme une
    // validation réussie en écran noir.
    let joues = 0;
    for (const { chemin, exercice } of EXERCICES) {
      const habillage = HABILLAGES.get(exercice.jeu.habillage);
      if (habillage === undefined || !validerBlocJeu(exercice, habillage).valide) {
        continue;
      }
      const moteur = obtenirMoteur(exercice.jeu.moteur);
      const etat = sansPlanter(`creerEtat ${chemin}`, () =>
        moteur.creerEtat({
          contenu: exercice.jeu.contenu as never,
          habillage,
          alea: aleaDeTest(),
          horloge: horlogeDeTest()
        })
      );
      expect(etat, `${chemin} : le moteur a levé sur un contenu pourtant validé`).toBeDefined();
      const resume = sansPlanter(`resume ${chemin}`, () => moteur.resume(etat as never));
      expect(resume, `${chemin} : `.concat('`resume` a levé')).toBeDefined();
      // R14 — un contenu neuf ne démarre jamais sur un échec.
      expect((resume as { reussi: boolean }).reussi, `${chemin}`).toBe(true);
      joues += 1;
    }
    console.log(`[fuzz-contenu] jouabilité — ${String(joues)} exercices validés puis montés`);
    expect(joues, 'moins de 15 exercices montés').toBeGreaterThanOrEqual(15);
    expect(plantagesDepuis(debut), 'un moteur a levé sur un contenu validé').toEqual([]);
  });
});

// ══════════════════════════════════════════ 9. le graphe de nœuds — prérequis cycliques

describe('le graphe des nœuds — un prérequis cyclique ferme le jeu (R14)', () => {
  function noeud(id: string, prerequis: readonly string[]): { chemin: string; donnees: unknown } {
    return {
      chemin: `fuzz/${id}.json`,
      donnees: { id, region: 'clairiere', ordre: 1, exercice: `ex-${id}`, prerequis, temps: 'presentation' }
    };
  }

  it('un cycle est vu, quelle que soit sa longueur', () => {
    for (const taille of [2, 3, 5, 9, 17]) {
      const noeuds = Array.from({ length: taille }, (_, i) =>
        noeud(`n${String(i)}`, [`n${String((i + taille - 1) % taille)}`])
      );
      const rapport = sansPlanter(`cycle ${String(taille)}`, () => croiserPrerequis(noeuds));
      compteur.generes += 1;
      expect(rapport, `cycle de ${String(taille)}`).toBeDefined();
      const regles = (rapport as { anomalies: { regle: string }[] }).anomalies.map((a) => a.regle);
      expect(regles, `cycle de ${String(taille)}`).toContain(REGLES_PREREQUIS.CYCLE);
      compteur.refuses += 1;
    }
  });

  it('des graphes tirés au sort ne font jamais lever le contrôle', () => {
    const debut = repere();
    const alea = aleaFuzz();
    for (let i = 0; i < 300; i += 1) {
      const taille = alea.entier(0, 12);
      const noeuds = Array.from({ length: taille }, (_, k) => {
        const nb = alea.entier(0, 4);
        const prerequis = Array.from({ length: nb }, () =>
          alea.entier(0, 3) === 0 ? alea.choisir(CHAINES_HOSTILES) : `n${String(alea.entier(0, 12))}`
        );
        return noeud(`n${String(k)}`, prerequis);
      });
      const rapport = sansPlanter(`graphe tiré ${String(i)}`, () => croiserPrerequis(noeuds));
      compteur.generes += 1;
      expect(rapport, `graphe tiré ${String(i)}`).toBeDefined();
    }
    expect(plantagesDepuis(debut), '`croiserPrerequis` a levé sur un graphe tiré').toEqual([]);
  });

  it('les 18 nœuds livrés forment un graphe sain — discrimination', () => {
    const noeuds = fichiersSous('contenu/noeuds', '.json').map((chemin) => ({
      chemin,
      donnees: lire<unknown>(chemin)
    }));
    expect(noeuds.length, 'aucun nœud lu').toBeGreaterThanOrEqual(18);
    const rapport = croiserPrerequis(noeuds) as { anomalies: { regle: string; message: string }[] };
    expect(rapport.anomalies, JSON.stringify(rapport.anomalies)).toEqual([]);
  });
});

// ══════════════════════════════ 10. la traversée de chemin — la garde de PRODUCTION

describe('la garde de traversée des assets — code de production, pas le double', () => {
  const racine = join(RACINE_DEPOT, 'contenu');

  it('aucune chaîne hostile ne sort de `contenu/`, et aucune ne fait lever', () => {
    const debut = repere();
    const evasions: string[] = [];
    const entrees = [
      ...CHAINES_HOSTILES,
      '/etc/passwd',
      'C:\\Windows\\win.ini',
      '\\\\serveur\\partage',
      'habillages/../../donnees/pierre.db',
      'habillages/./clairiere/ecole.svg',
      '....//....//donnees',
      'habillages\\..\\..\\donnees'
    ];
    for (const entree of entrees) {
      const resolu = sansPlanter(`resoudreSousRacine(${entree.slice(0, 30)})`, () =>
        resoudreSousRacine(racine, entree)
      );
      compteur.generes += 1;
      if (resolu !== undefined && resolu !== null && !resolu.startsWith(racine)) {
        evasions.push(`${entree} → ${resolu}`);
      }
    }
    expect(plantagesDepuis(debut), '`resoudreSousRacine` a levé').toEqual([]);
    expect(evasions, 'un chemin est sorti de `contenu/`').toEqual([]);
  });

  it('un chemin légitime est bien résolu — discrimination', () => {
    const resolu = resoudreSousRacine(racine, 'habillages/clairiere/ecole.svg');
    expect(resolu, 'la garde refuse un chemin légitime : elle refuserait tout').not.toBeNull();
    expect(resolu!.startsWith(racine)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════ 11. le contrat de sortie

describe('contrat de sortie du fuzzer de contenu', () => {
  it('cas générés, refusés proprement, plantages', () => {
    console.log(compteur.rapport());
    expect(compteur.plantages, 'des plantages subsistent').toEqual([]);
    expect(echecs, 'des refus sans message clair subsistent').toEqual([]);
    // Égalités et planchers, jamais un `> 0`.
    expect(compteur.generes, 'moins de 6 000 cas générés').toBeGreaterThanOrEqual(6_000);
    expect(compteur.refuses, 'moins de 1 000 refus : le fuzz n’éprouve plus la validation').toBeGreaterThanOrEqual(1_000);
  });
});
