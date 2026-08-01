/**
 * La comptabilité de l'ingestion — lot L2-G, contrat features v2 § 10.4.
 *
 * **`fichesIngerees + fichesRefusees === fichesDuPdf`, toujours.** C'est le chiffre du lot :
 * il échoue si une seule fiche disparaît du décompte, sur un seul niveau. Une fiche « rendue à
 * moitié » — extraite mais pas comptée, ou comptée mais pas écrite — est exactement la
 * régression silencieuse que l'annexe T § 1 désigne comme le premier risque du projet.
 *
 * Le second chiffre du lot est ici aussi : **la neutralité de la refactorisation du niveau 1**.
 * `tests/fixtures/ingestion/manifeste-niveau-1.json` est le manifeste d'AVANT, figé. Le
 * manifeste régénéré doit lui être identique — pas « équivalent », identique. C'est ce qui
 * prouve que l'extraction du monolithe vers `formats/niveau1.py` n'a rien changé.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const FIXTURES = join(RACINE, 'tests', 'fixtures', 'ingestion');
const BROUILLONS = join(RACINE, 'contenu', 'brouillons');

interface Refus {
  readonly fiche: number;
  readonly code: string;
  readonly motif: string;
}

interface ManifesteNiveau {
  readonly source: string;
  readonly niveau: number;
  readonly fichesDuPdf: number;
  readonly fichesDemandees: number;
  readonly fichesIngerees: number;
  readonly fichesRefusees: number;
  readonly reglesDeStructure: Record<string, unknown>;
  readonly fiches: readonly { fiche: number; fichier: string }[];
  readonly refus: readonly Refus[];
}

const lireJson = <T>(chemin: string): T => JSON.parse(readFileSync(chemin, 'utf8')) as T;

/** Le vocabulaire fermé de `scripts/ingestion/refus.py`, recopié pour être opposable ici. */
const MOTIFS_CONNUS = new Set([
  'texte-absent',
  'repere-introuvable',
  'repere-mal-place',
  'colonnes-non-separables',
  'ecart-ambigu',
  'zone-vide',
  'compte-inattendu',
  'illustration-introuvable',
  'format-non-tranche'
]);

/** Tous les manifestes de niveau présents sur disque. Le dossier est ignoré par git. */
function manifestesSurDisque(): { chemin: string; manifeste: ManifesteNiveau }[] {
  if (!existsSync(BROUILLONS)) return [];
  return readdirSync(BROUILLONS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^niveau-\d$/.test(e.name))
    .map((e) => join(BROUILLONS, e.name, 'manifeste.json'))
    .filter((chemin) => existsSync(chemin))
    .map((chemin) => ({ chemin, manifeste: lireJson<ManifesteNiveau>(chemin) }));
}

describe('la comptabilité ferme — le chiffre du lot L2-G', () => {
  const fixture = lireJson<ManifesteNiveau>(join(FIXTURES, 'manifeste-niveau-1.json'));
  const refus7 = lireJson<ManifesteNiveau>(join(FIXTURES, 'refus-niveau-7.json'));

  it.each([
    ['manifeste-niveau-1.json', fixture],
    ['refus-niveau-7.json', refus7]
  ])('%s : ingérées + refusées === demandées', (_nom, manifeste) => {
    expect(manifeste.fichesIngerees + manifeste.fichesRefusees).toBe(
      manifeste.fichesDemandees
    );
  });

  it.each([
    ['manifeste-niveau-1.json', fixture],
    ['refus-niveau-7.json', refus7]
  ])('%s : la passe est complète, donc demandées === fiches du PDF', (_nom, manifeste) => {
    expect(manifeste.fichesDemandees).toBe(manifeste.fichesDuPdf);
    expect(manifeste.fichesIngerees + manifeste.fichesRefusees).toBe(manifeste.fichesDuPdf);
  });

  it('sur TOUS les manifestes présents sur disque, sans exception', () => {
    const trouves = manifestesSurDisque();
    for (const { chemin, manifeste } of trouves) {
      expect(
        manifeste.fichesIngerees + manifeste.fichesRefusees,
        `${chemin} : la comptabilité ne ferme pas`
      ).toBe(manifeste.fichesDemandees);
      // Le manifeste ne peut pas mentir sur ce qu'il a écrit : autant de lignes que d'ingérées.
      expect(manifeste.fiches.length, chemin).toBe(manifeste.fichesIngerees);
      expect(manifeste.refus.length, chemin).toBe(manifeste.fichesRefusees);
    }
    // Si la chaîne a tourné, les 7 niveaux sont là et le corpus fait 105 fiches.
    if (trouves.length === 7) {
      const corpus = trouves.reduce((somme, { manifeste }) => somme + manifeste.fichesDuPdf, 0);
      expect(corpus).toBe(105);
    }
  });
});

describe('aucun refus n’est muet — vocabulaire fermé, motif écrit', () => {
  const refus7 = lireJson<ManifesteNiveau>(join(FIXTURES, 'refus-niveau-7.json'));

  it('le niveau 7 refuse ses 15 fiches, et n’en ingère aucune', () => {
    expect(refus7.niveau).toBe(7);
    expect(refus7.fichesIngerees).toBe(0);
    expect(refus7.fichesRefusees).toBe(15);
    expect(refus7.fiches).toEqual([]);
  });

  it('chaque refus porte un code du vocabulaire fermé ET un motif lisible', () => {
    for (const refus of refus7.refus) {
      expect(MOTIFS_CONNUS, `fiche ${refus.fiche}`).toContain(refus.code);
      expect(refus.motif.length).toBeGreaterThan(20);
    }
  });

  it('le refus du niveau 7 nomme le point ouvert O7, et non un défaut de mise en page', () => {
    expect(refus7.reglesDeStructure.pointOuvert).toMatch(/^O7\b/);
    for (const refus of refus7.refus) {
      expect(refus.code).toBe('format-non-tranche');
      expect(refus.motif).toContain('O7');
    }
  });

  it('sur disque aussi, aucun refus sans code connu', () => {
    for (const { chemin, manifeste } of manifestesSurDisque()) {
      for (const refus of manifeste.refus) {
        expect(MOTIFS_CONNUS, `${chemin} fiche ${refus.fiche}`).toContain(refus.code);
        expect(refus.motif.length, `${chemin} fiche ${refus.fiche}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('la refactorisation du niveau 1 est NEUTRE — l’autre chiffre du lot', () => {
  const chemin = join(BROUILLONS, 'niveau-1', 'manifeste.json');

  it('le manifeste régénéré est identique à la référence figée, octet pour octet', () => {
    if (!existsSync(chemin)) return; // dépôt fraîchement cloné : rien à comparer.
    const regenere = readFileSync(chemin, 'utf8');
    const reference = readFileSync(join(FIXTURES, 'manifeste-niveau-1.json'), 'utf8');
    expect(regenere).toBe(reference);
  });

  it('la référence figée porte bien les comptes mesurés avant refactorisation', () => {
    const reference = lireJson<ManifesteNiveau & Record<string, unknown>>(
      join(FIXTURES, 'manifeste-niveau-1.json')
    );
    expect(reference.niveau).toBe(1);
    expect(reference.fichesDuPdf).toBe(15);
    expect(reference.fichesIngerees).toBe(15);
    expect(reference.fichesRefusees).toBe(0);
    expect(reference.totalConsignes).toBe(75);
    expect(reference.totalAffirmations).toBe(90);
    expect(reference.consignesParType).toEqual({ colorie: 51, place: 8, autre: 16 });
  });

  it('les 8 consignes « Dessine… » du niveau 1 sont toujours là — L2-C en dépend', () => {
    // Contrat § 10.4 : le chiffre de L2-C se mesure sur CE compte
    // (`consignesParType.place = 8`). S'il bouge, c'est le moteur `place` qui perd sa cible.
    const reference = lireJson<{ consignesParType: { place: number } }>(
      join(FIXTURES, 'manifeste-niveau-1.json')
    );
    expect(reference.consignesParType.place).toBe(8);
  });
});
