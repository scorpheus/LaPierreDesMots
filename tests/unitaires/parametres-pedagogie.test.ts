/**
 * Les paramètres pédagogiques sont des DONNÉES — convention C2, D13. Lot L2-D.
 *
 * Ce fichier porte le seul contrôle qui rende C2 opposable : **il échoue si le code n'a pas lu
 * le JSON.** Deux mesures indépendantes, parce qu'une seule se contourne :
 *
 * 1. **Balayage du code source** de `partage/src/pedagogie/`, commentaires retirés : aucune des
 *    valeurs non triviales du fichier de paramètres n'y apparaît en littéral. Une constante
 *    recopiée « pour aller plus vite » tombe ici.
 * 2. **Substitution** : on donne à `lireParametresPedagogie` un fichier de paramètres modifié et
 *    on exige que la sortie du BKT change. Un code qui ignorerait son argument passerait le
 *    contrôle 1 et tombe ici.
 *
 * Motif, D13 : « ces valeurs sont des paramètres déclarés en données, pas des constantes dans le
 * code : elles seront recalibrées sur les tentatives réelles, et le test de rejeu doit rendre
 * visible tout changement. » Un seuil en dur rend le rejeu T2 aveugle au changement.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { ErreurPierre } from '@pierre/partage';
import { mettreAJourMaitrise, etatMaitriseInitial } from '@partage/pedagogie/bkt.js';
import {
  empreinteParametres,
  lireParametresPedagogie,
} from '@partage/pedagogie/parametres.js';

import { RACINE_DEPOT, lireJson, lireTexte } from '../configuration/preparation.js';

import type { ObservationTentative } from '@pierre/partage';

const CHEMIN_PARAMETRES = 'contenu/referentiel/parametres-pedagogie.json';
const CHEMIN_SCHEMA = 'contenu/schemas/parametres-pedagogie.schema.json';
const DOSSIER_PEDAGOGIE = join(RACINE_DEPOT, 'partage', 'src', 'pedagogie');

const brut = lireJson<Record<string, unknown>>(CHEMIN_PARAMETRES);

/** Retire commentaires de ligne et de bloc : on interdit un littéral dans le CODE, pas en prose. */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Tous les nombres du fichier de paramètres, récursivement. */
function nombresDe(valeur: unknown, recueil: number[] = []): number[] {
  if (typeof valeur === 'number') {
    recueil.push(valeur);
  } else if (Array.isArray(valeur)) {
    for (const element of valeur) nombresDe(element, recueil);
  } else if (typeof valeur === 'object' && valeur !== null) {
    for (const element of Object.values(valeur)) nombresDe(element, recueil);
  }
  return recueil;
}

/**
 * Les valeurs qu'on interdit en littéral : **toutes les probabilités** du fichier — c'est-à-dire
 * tous ses nombres non entiers — plus le délai `35`, qui n'est rien d'autre qu'un délai.
 *
 * Les petits entiers (1, 2, 3, 5) sont exclus : ils apparaissent légitimement comme bornes de
 * boucle ou index, et les interdire donnerait un test bruyant qui finirait assoupli. `16` est
 * exclu pour la même raison — c'est aussi la base hexadécimale de `toString(16)`. La table
 * `[1, 3, 7, 16, 35]` reste, elle, interdite en bloc par le test suivant : c'est sous cette
 * forme-là qu'un délai recopié entrerait dans le code.
 */
const VALEURS_INTERDITES = [
  ...new Set(nombresDe(brut).filter((n) => !Number.isInteger(n) || n === 35)),
].sort((a, b) => a - b);

describe('le fichier de paramètres', () => {
  it('satisfait son schéma JSON', () => {
    const ajv = new Ajv2020.default({ allErrors: true, strict: false });
    const valider = ajv.compile(lireJson(CHEMIN_SCHEMA));
    const valide = valider(brut);
    expect(valider.errors ?? []).toEqual([]);
    expect(valide).toBe(true);
  });

  it('porte les valeurs de D13 et de la v2 § 12.2', () => {
    const parametres = lireParametresPedagogie(brut);
    expect(parametres.bkt.pDevinette['vrai-faux']).toBeCloseTo(0.5, 10);
    expect(parametres.bkt.pDevinette['ordre']).toBeNull();
    expect(parametres.bkt.pDevinette['appariement']).toBeNull();
    expect(parametres.acquis.tentativesFaibleDevinetteMin).toBeGreaterThanOrEqual(1);
    expect(parametres.leitner.delaisJours).toEqual([1, 3, 7, 16, 35]);
  });

  it('déclare une valeur pour CHACUN des 9 modes de réponse — aucun oubli silencieux', () => {
    const parametres = lireParametresPedagogie(brut);
    expect(Object.keys(parametres.bkt.pDevinette).sort()).toEqual(
      [
        'appariement', 'colorie', 'ordre', 'place', 'qcm-3', 'qcm-4',
        'saisie', 'trace', 'vrai-faux',
      ].sort()
    );
  });
});

describe('aucune valeur pédagogique en dur dans le code (C2)', () => {
  const fichiers = readdirSync(DOSSIER_PEDAGOGIE).filter((n) => n.endsWith('.ts'));

  it('trouve bien les fichiers du moteur pédagogique', () => {
    expect(fichiers.length).toBeGreaterThanOrEqual(6);
  });

  it('interdit un littéral non trivial du fichier de paramètres', () => {
    expect(VALEURS_INTERDITES.length).toBeGreaterThanOrEqual(10);

    const fautes: string[] = [];
    for (const nom of fichiers) {
      const code = sansCommentaires(readFileSync(join(DOSSIER_PEDAGOGIE, nom), 'utf8'));
      for (const valeur of VALEURS_INTERDITES) {
        // `0.5` s'écrit aussi `.5` ; les deux formes sont cherchées.
        const litteral = String(valeur);
        const abrege = litteral.startsWith('0.') ? litteral.slice(1) : null;
        const motif = new RegExp(
          `(?<![\\w.])(${litteral.replace('.', '\\.')}${abrege === null ? '' : `|\\${abrege}`})(?![\\w.])`
        );
        if (motif.test(code)) {
          fautes.push(`${nom} : littéral ${litteral}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it('n’écrit nulle part la table des délais Leitner', () => {
    for (const nom of fichiers) {
      const code = sansCommentaires(readFileSync(join(DOSSIER_PEDAGOGIE, nom), 'utf8'));
      expect(code).not.toMatch(/\[\s*1\s*,\s*3\s*,\s*7\s*,\s*16\s*,\s*35\s*\]/);
    }
  });

  it('ne lit jamais le fichier de paramètres lui-même : c’est l’appelant qui l’injecte', () => {
    for (const nom of fichiers) {
      const code = sansCommentaires(readFileSync(join(DOSSIER_PEDAGOGIE, nom), 'utf8'));
      expect(code).not.toMatch(/node:fs|readFileSync|parametres-pedagogie\.json/);
    }
  });
});

describe('substitution — la sortie suit les données, pas le code', () => {
  const observation: ObservationTentative = {
    competence: 'gph.a',
    reussi: true,
    modeReponse: 'colorie',
    nbElements: null,
    avecAide: false,
    instant: '2026-09-01T08:00:00.000Z',
  };

  it('un `pInit` différent donne un état initial différent', () => {
    const modifie = structuredClone(brut) as { bkt: { pInit: number } };
    modifie.bkt.pInit = 0.42;
    const referenceP = etatMaitriseInitial('gph.a', lireParametresPedagogie(brut).bkt).p;
    const modifieP = etatMaitriseInitial('gph.a', lireParametresPedagogie(modifie).bkt).p;
    expect(modifieP).toBeCloseTo(0.42, 10);
    expect(modifieP).not.toBeCloseTo(referenceP, 6);
  });

  it('un `pDevinette` différent déplace `p` différemment', () => {
    const reference = lireParametresPedagogie(brut);
    const modifie = structuredClone(brut) as { bkt: { pDevinette: Record<string, number> } };
    modifie.bkt.pDevinette['colorie'] = 0.75;

    const depart = etatMaitriseInitial('gph.a', reference.bkt);
    const avec = mettreAJourMaitrise(depart, observation, reference.bkt, reference.acquis).p;
    const modifies = lireParametresPedagogie(modifie);
    const sans = mettreAJourMaitrise(depart, observation, modifies.bkt, modifies.acquis).p;
    expect(avec).not.toBeCloseTo(sans, 6);
  });

  it('l’empreinte change dès qu’une valeur change — le rejeu le rend visible (D13)', () => {
    const reference = lireParametresPedagogie(brut);
    const modifie = structuredClone(brut) as { acquis: { seuilP: number } };
    modifie.acquis.seuilP = 0.95;
    expect(empreinteParametres(lireParametresPedagogie(modifie))).not.toBe(
      empreinteParametres(reference)
    );
    expect(empreinteParametres(reference)).toBe(empreinteParametres(lireParametresPedagogie(brut)));
  });
});

describe('lireParametresPedagogie refuse plutôt que de compléter', () => {
  function attendreRefus(mutation: (copie: Record<string, unknown>) => void): void {
    const copie = structuredClone(brut);
    mutation(copie);
    let leve: unknown = null;
    try {
      lireParametresPedagogie(copie);
    } catch (erreur) {
      leve = erreur;
    }
    expect(ErreurPierre.porteLeCode(leve, 'contenu-invalide')).toBe(true);
  }

  it('refuse un mode de réponse manquant à `pDevinette`', () => {
    attendreRefus((copie) => {
      delete (copie['bkt'] as { pDevinette: Record<string, unknown> }).pDevinette['qcm-4'];
    });
  });

  it('refuse une probabilité hors de [0, 1]', () => {
    attendreRefus((copie) => {
      (copie['bkt'] as { pInit: number }).pInit = 1.4;
    });
  });

  it('refuse `delaisJours` qui n’a pas exactement 5 entrées', () => {
    attendreRefus((copie) => {
      (copie['leitner'] as { delaisJours: number[] }).delaisJours = [1, 3, 7, 16];
    });
  });

  it('refuse `delaisJours` non croissant — un Leitner qui raccourcit n’espace plus rien', () => {
    attendreRefus((copie) => {
      (copie['leitner'] as { delaisJours: number[] }).delaisJours = [1, 3, 7, 4, 35];
    });
  });

  it('refuse un `poidsAvecAide` >= 1 : l’aide doit peser MOINS (v2 § 12.2)', () => {
    attendreRefus((copie) => {
      (copie['bkt'] as { poidsAvecAide: number }).poidsAvecAide = 1;
    });
  });

  it('refuse `rangRevision` en ouverture : la révision n’est jamais au nœud 1', () => {
    attendreRefus((copie) => {
      (copie['selecteur'] as { rangRevision: number }).rangRevision = 1;
    });
  });

  it('refuse `nbNoeudsMax` inférieur à `nbNoeudsMin`', () => {
    attendreRefus((copie) => {
      (copie['selecteur'] as { nbNoeudsMax: number }).nbNoeudsMax = 2;
    });
  });

  it('refuse une entrée qui n’est pas un objet', () => {
    for (const entree of [null, 42, 'parametres', []]) {
      let leve: unknown = null;
      try {
        lireParametresPedagogie(entree);
      } catch (erreur) {
        leve = erreur;
      }
      expect(ErreurPierre.porteLeCode(leve, 'contenu-invalide')).toBe(true);
    }
  });
});

describe('le fichier sur disque est lisible par la fonction qui le valide', () => {
  it('ne lève pas sur le fichier réel', () => {
    expect(() => lireParametresPedagogie(JSON.parse(lireTexte(CHEMIN_PARAMETRES)))).not.toThrow();
  });
});

describe('branches défensives du lecteur de paramètres', () => {
  function refuse(mutation: (copie: Record<string, unknown>) => void): void {
    const copie = structuredClone(brut);
    mutation(copie);
    let leve: unknown = null;
    try {
      lireParametresPedagogie(copie);
    } catch (erreur) {
      leve = erreur;
    }
    expect(ErreurPierre.porteLeCode(leve, 'contenu-invalide')).toBe(true);
  }

  it('refuse un NaN, un texte ou un null là où un nombre est attendu', () => {
    for (const valeur of [Number.NaN, Number.POSITIVE_INFINITY, '0.15', null]) {
      refuse((copie) => {
        (copie['bkt'] as Record<string, unknown>)['pInit'] = valeur;
      });
    }
  });

  it('refuse un entier attendu qui n’en est pas un', () => {
    refuse((copie) => {
      (copie['acquis'] as Record<string, unknown>)['tentativesMin'] = 2.5;
    });
    refuse((copie) => {
      (copie['acquis'] as Record<string, unknown>)['joursDistinctsMin'] = 0;
    });
  });

  it('refuse un `habillageUniqueParSortie` qui n’est pas un booléen', () => {
    for (const valeur of ['oui', 1, null]) {
      refuse((copie) => {
        (copie['selecteur'] as Record<string, unknown>)['habillageUniqueParSortie'] = valeur;
      });
    }
  });

  it('refuse une `boiteApresEchec` hors des cinq boîtes', () => {
    for (const valeur of [0, 6, 42]) {
      refuse((copie) => {
        (copie['leitner'] as Record<string, unknown>)['boiteApresEchec'] = valeur;
      });
    }
  });

  it('refuse un `delaisJours` qui n’est pas un tableau, ou dont une entrée n’est pas un entier', () => {
    refuse((copie) => {
      (copie['leitner'] as Record<string, unknown>)['delaisJours'] = '1,3,7,16,35';
    });
    refuse((copie) => {
      (copie['leitner'] as Record<string, unknown>)['delaisJours'] = [1, 3, 7, 16, 35.5];
    });
  });

  it('refuse une valeur chiffrée pour `ordre` : elle serait fausse dès que n change', () => {
    refuse((copie) => {
      ((copie['bkt'] as Record<string, unknown>)['pDevinette'] as Record<string, unknown>)['ordre'] = 0.5;
    });
  });

  it('refuse une section entière absente ou mal typée', () => {
    for (const section of ['bkt', 'acquis', 'leitner', 'selecteur']) {
      refuse((copie) => {
        delete copie[section];
      });
      refuse((copie) => {
        copie[section] = [];
      });
    }
  });

  it('l’empreinte ne dépend pas de l’ordre des clés du fichier', () => {
    /** Même contenu, clés inversées à toute profondeur. */
    function inverser(valeur: unknown): unknown {
      if (Array.isArray(valeur)) return valeur;
      if (typeof valeur !== 'object' || valeur === null) return valeur;
      const entrees = Object.entries(valeur as Record<string, unknown>).reverse();
      return Object.fromEntries(entrees.map(([cle, v]) => [cle, inverser(v)]));
    }
    const reference = lireParametresPedagogie(brut);
    const reordonne = lireParametresPedagogie(inverser(structuredClone(brut)));
    expect(empreinteParametres(reordonne)).toBe(empreinteParametres(reference));
  });
});
