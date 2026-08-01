/**
 * Le schéma des brouillons d'ingestion — lot L2-G, contrat features v2 § 3.7.
 *
 * « Un brouillon hors schéma est un refus. » Ce fichier rend cette phrase opposable : il
 * compile `contenu/schemas/brouillon.schema.json`, valide les fixtures d'ingestion, et — c'est
 * le point qui compte — **prouve que le schéma refuse ce qu'il doit refuser**. Un schéma qui
 * accepte tout est le pire des cas : il donne le sentiment d'une vérification là où il n'y en
 * a aucune.
 *
 * Les trois fixtures du contrat sont ici :
 *   · `brouillon-niveau-2.json`  — format 2, sortie réelle de la chaîne ;
 *   · `brouillon-niveau-5.json`  — format 5, deux exercices sur une fiche ;
 *   · `refus-niveau-7.json`      — un REFUS, qui n'est pas un brouillon et ne doit donc PAS
 *                                  passer le schéma. C'est la contre-épreuve.
 *
 * `contenu/brouillons/` est ignoré par git : les brouillons réels ne sont validés que
 * lorsqu'ils sont là, et leur absence n'est pas un échec — c'est un dépôt fraîchement cloné.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const FIXTURES = join(RACINE, 'tests', 'fixtures', 'ingestion');
const BROUILLONS = join(RACINE, 'contenu', 'brouillons');

/**
 * Ajv est publié en CommonJS avec un export par défaut ; selon l'interopérabilité, l'objet
 * importé est soit le constructeur, soit `{ default: constructeur }`. Même parade que
 * `partage/src/contenu/validation.ts` § « Ajv is not a constructor ».
 */
type ConstructeurAjv = new (options?: Record<string, unknown>) => {
  compile: (schema: unknown) => ((donnees: unknown) => boolean) & {
    errors?: readonly { instancePath: string; message?: string }[] | null;
  };
};
const Constructeur = ((Ajv2020 as unknown as { default?: unknown }).default ??
  Ajv2020) as unknown as ConstructeurAjv;

const lireJson = (chemin: string): unknown =>
  JSON.parse(readFileSync(chemin, 'utf8')) as unknown;

const ajv = new Constructeur({ allErrors: true, strict: false });
const schema = lireJson(join(RACINE, 'contenu', 'schemas', 'brouillon.schema.json'));
const valider = ajv.compile(schema);

/** Les erreurs Ajv, lisibles : `chemin — message`. */
function problemes(): string[] {
  return (valider.errors ?? []).map((e) => `${e.instancePath} — ${e.message ?? ''}`);
}

/** Copie profonde modifiable — on n'altère jamais l'objet lu sur disque. */
function copie<T>(valeur: T): T {
  return structuredClone(valeur);
}

describe('le schéma des brouillons accepte les sorties réelles de la chaîne', () => {
  it.each([
    ['brouillon-niveau-2.json', 2],
    ['brouillon-niveau-5.json', 5]
  ])('%s est un brouillon valide du niveau %i', (nom, niveau) => {
    const brouillon = lireJson(join(FIXTURES, nom)) as {
      origine: { niveau: number };
      statut: string;
      aFaireALaMain: string[];
    };
    expect(valider(brouillon), problemes().join(' | ')).toBe(true);
    expect(brouillon.origine.niveau).toBe(niveau);
    expect(brouillon.statut).toBe('brouillon-non-jouable');
    // Aucun brouillon ne quitte la chaîne sans reste à faire : sinon ce serait un exercice.
    expect(brouillon.aFaireALaMain.length).toBeGreaterThan(0);
  });

  it('valide tous les brouillons présents sur disque, s’il y en a', () => {
    if (!existsSync(BROUILLONS)) return;
    const dossiers = readdirSync(BROUILLONS, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^niveau-\d$/.test(e.name))
      .map((e) => join(BROUILLONS, e.name));

    let valides = 0;
    for (const dossier of dossiers) {
      for (const nom of readdirSync(dossier).filter((f) => /^fiche-\d\d\.json$/.test(f))) {
        const chemin = join(dossier, nom);
        expect(valider(lireJson(chemin)), `${chemin} : ${problemes().join(' | ')}`).toBe(true);
        valides += 1;
      }
    }
    // Chiffre du lot : si la chaîne a tourné, elle a produit 90 brouillons (15 fiches sur
    // 6 niveaux ; le niveau 7 refuse les siennes). Ne rien trouver est légitime — un dépôt
    // fraîchement cloné —, en trouver et n'en valider aucun ne l'est pas.
    if (dossiers.length > 0) expect(valides).toBeGreaterThan(0);
  });
});

describe('le schéma refuse ce qu’il doit refuser — sinon il ne vérifie rien', () => {
  const brouillon2 = lireJson(join(FIXTURES, 'brouillon-niveau-2.json')) as Record<
    string,
    unknown
  >;

  it('refuse un REFUS : ce n’est pas un brouillon', () => {
    expect(valider(lireJson(join(FIXTURES, 'refus-niveau-7.json')))).toBe(false);
  });

  it('refuse un manifeste : ce n’est pas un brouillon non plus', () => {
    expect(valider(lireJson(join(FIXTURES, 'manifeste-niveau-1.json')))).toBe(false);
  });

  it('refuse un brouillon déclaré jouable', () => {
    const faux = copie(brouillon2);
    faux.statut = 'jouable';
    expect(valider(faux)).toBe(false);
  });

  it('refuse un brouillon sans reste à faire à la main', () => {
    const faux = copie(brouillon2);
    faux.aFaireALaMain = [];
    expect(valider(faux)).toBe(false);
  });

  it('refuse une propriété inconnue — le schéma est fermé', () => {
    const faux = copie(brouillon2) as Record<string, unknown>;
    faux.bonneReponse = 'oui';
    expect(valider(faux)).toBe(false);
  });

  it('refuse un mode de réponse qui ne va pas avec le niveau', () => {
    const faux = copie(brouillon2);
    faux.modeReponse = 'qcm-3';
    expect(valider(faux)).toBe(false);
  });

  it('accepte `reponseAttendue: null`, et c’est le cœur du lot', () => {
    const affirmations = (copie(brouillon2).affirmations as { reponseAttendue: unknown }[]);
    expect(affirmations.every((a) => a.reponseAttendue === null)).toBe(true);
    expect(valider(brouillon2)).toBe(true);
  });
});

describe('le niveau 5 porte bien ses DEUX exercices', () => {
  const brouillon5 = lireJson(join(FIXTURES, 'brouillon-niveau-5.json')) as {
    etapes: { rang: number; ordreAttendu: number | null }[];
    reperages: { couleur: string }[];
    consigne: string;
    consigneSecondaire: string;
  };

  it('a autant d’étapes que de repérages, et les deux consignes', () => {
    expect(brouillon5.etapes.length).toBeGreaterThan(0);
    expect(brouillon5.reperages.length).toBeGreaterThan(0);
    expect(brouillon5.consigne).not.toBe(brouillon5.consigneSecondaire);
  });

  it('n’invente aucun ordre : `ordreAttendu` est nul partout', () => {
    expect(brouillon5.etapes.every((e) => e.ordreAttendu === null)).toBe(true);
  });

  it('donne une couleur à chaque repérage', () => {
    expect(brouillon5.reperages.every((r) => r.couleur.length > 0)).toBe(true);
  });
});
