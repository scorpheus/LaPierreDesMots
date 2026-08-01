/**
 * Validation du contenu — contrat gelé § 9.1, annexe T § T1.
 *
 * Validation **en deux temps** : l'enveloppe d'abord (`validerExercice`), le bloc `jeu.contenu`
 * ensuite, contre le schéma que le moteur publie lui-même, plus la cohérence avec l'habillage
 * (`validerBlocJeu`). C'est ce découpage qui permet d'ajouter un moteur sans toucher au schéma
 * d'enveloppe.
 *
 * `scripts/test-contenu.mjs` fait le même travail sur TOUT `contenu/exercices/**` en dehors de
 * Vitest ; ce fichier-ci garde les cas de refus, que le script ne peut pas fabriquer sans
 * écrire de faux contenu sur disque.
 */
import { describe, expect, it } from 'vitest';

import {
  estCheminFerme,
  validerBlocJeu,
  validerExercice,
  validerSceneSvg
} from '@pierre/partage/validation';

import type { Competence, Exercice, Habillage } from '@pierre/partage';

import {
  CHEMIN_COMPETENCES,
  CHEMIN_EXERCICE_ECOLE,
  CHEMIN_SVG_ECOLE,
  habillageEcole,
  lireJson,
  lireTexte
} from '../configuration/preparation.js';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const habillage: Habillage = habillageEcole();
const competences = lireJson<readonly Competence[]>(CHEMIN_COMPETENCES);

/** Copie profonde modifiable — on n'altère jamais l'objet lu sur disque. */
function copie<T>(valeur: T): T {
  return structuredClone(valeur);
}

function cheminsDesProblemes(rapport: { problemes: readonly { chemin: string }[] }): string[] {
  return rapport.problemes.map((p) => p.chemin);
}

describe('l’exercice de la v1 est valide de bout en bout', () => {
  it('passe l’enveloppe', () => {
    const rapport = validerExercice(exercice);
    expect(rapport.problemes).toEqual([]);
    expect(rapport.valide).toBe(true);
  });

  it('passe le bloc `jeu.contenu` et la cohérence avec l’habillage', () => {
    const rapport = validerBlocJeu(exercice, habillage);
    expect(rapport.problemes).toEqual([]);
    expect(rapport.valide).toBe(true);
  });

  it('déclare un habillage compatible avec son moteur', () => {
    expect(habillage.moteurs).toContain(exercice.jeu.moteur);
    expect(exercice.jeu.habillage).toBe(habillage.id);
  });

  it('ne cite que des compétences du référentiel', () => {
    const connues = new Set(competences.map((c) => c.code));
    for (const code of exercice.competences) expect(connues).toContain(code);
  });
});

describe('l’enveloppe refuse ce qu’elle doit refuser', () => {
  it('un `id` qui n’est pas en kebab-case', () => {
    const mauvais = copie(exercice) as Record<string, unknown>;
    mauvais['id'] = 'Clairiere_Ecole_01';
    const rapport = validerExercice(mauvais);
    expect(rapport.valide).toBe(false);
    expect(cheminsDesProblemes(rapport).join(' ')).toContain('id');
  });

  it('une propriété inconnue — `additionalProperties: false`', () => {
    const mauvais = copie(exercice) as Record<string, unknown>;
    mauvais['couleurPreferee'] = 'bleu';
    expect(validerExercice(mauvais).valide).toBe(false);
  });

  it('un champ obligatoire absent', () => {
    const mauvais = copie(exercice) as Record<string, unknown>;
    delete mauvais['competences'];
    expect(validerExercice(mauvais).valide).toBe(false);
  });

  it('un moteur hors de l’énumération', () => {
    const mauvais = copie(exercice);
    (mauvais.jeu as Record<string, unknown>)['moteur'] = 'teleportation';
    expect(validerExercice(mauvais).valide).toBe(false);
  });

  it('une difficulté hors bornes', () => {
    const mauvais = copie(exercice) as Record<string, unknown>;
    mauvais['difficulte'] = 9;
    expect(validerExercice(mauvais).valide).toBe(false);
  });

  it('un rapport invalide porte toujours au moins un problème documenté', () => {
    const rapport = validerExercice({});
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.length).toBeGreaterThan(0);
    for (const probleme of rapport.problemes) {
      expect(probleme.message.length).toBeGreaterThan(0);
      expect(probleme.regle.length).toBeGreaterThan(0);
    }
  });
});

describe('le bloc `jeu.contenu` refuse ce qu’il doit refuser', () => {
  it('une région qui n’existe dans aucun calque coloriable', () => {
    const mauvais = copie(exercice);
    const contenu = (mauvais.jeu as { contenu: { consignes: { cibles: { region: string }[] }[] } })
      .contenu;
    contenu.consignes[0]!.cibles[0]!.region = 'trappe-secrete';
    const rapport = validerBlocJeu(mauvais, habillage);
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.map((p) => p.regle)).toContain('region-inconnue');
  });

  it('une couleur hors du nuancier autorisé', () => {
    const mauvais = copie(exercice);
    const contenu = (
      mauvais.jeu as { contenu: { consignes: { cibles: { couleur: string }[] }[] } }
    ).contenu;
    contenu.consignes[0]!.cibles[0]!.couleur = 'turquoise';
    expect(validerBlocJeu(mauvais, habillage).valide).toBe(false);
  });

  it('une consigne sans aucune cible — `minItems: 1`', () => {
    const mauvais = copie(exercice);
    const contenu = (mauvais.jeu as { contenu: { consignes: { cibles: unknown[] }[] } }).contenu;
    contenu.consignes[0]!.cibles = [];
    expect(validerBlocJeu(mauvais, habillage).valide).toBe(false);
  });

  it('un habillage qui ne déclare pas le moteur de l’exercice', () => {
    const habillageIncompatible: Habillage = { ...habillage, moteurs: [] };
    const rapport = validerBlocJeu(exercice, habillageIncompatible);
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.map((p) => p.regle)).toContain('habillage-incompatible');
  });

  it('le pointeur JSON du problème désigne bien la cible fautive', () => {
    const mauvais = copie(exercice);
    const contenu = (mauvais.jeu as { contenu: { consignes: { cibles: { region: string }[] }[] } })
      .contenu;
    const derniere = contenu.consignes.length - 1;
    contenu.consignes[derniere]!.cibles[0]!.region = 'trappe-secrete';
    const rapport = validerBlocJeu(mauvais, habillage);
    expect(cheminsDesProblemes(rapport).join(' ')).toContain(`/jeu/contenu/consignes/${derniere}`);
  });
});

describe('cohérence habillage ↔ exercice — contrôle 6 de `test:contenu` (contrat § 9.8)', () => {
  const regionsColoriables = new Set(
    habillage.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions)
      .map((region) => region.id)
  );

  it('toute cible de l’exercice existe dans un calque coloriable', () => {
    const contenu = exercice.jeu.contenu as { consignes: { cibles: { region: string }[] }[] };
    for (const consigne of contenu.consignes) {
      for (const cible of consigne.cibles) {
        expect(regionsColoriables).toContain(cible.region);
      }
    }
  });

  it('l’habillage déclare les 30 régions gelées du contrat § 9.4', () => {
    // Le chiffre est gelé : c'est L-F qui dessine, L-G qui compte.
    expect(regionsColoriables.size).toBe(30);
  });

  it('aucune région n’est déclarée deux fois', () => {
    const toutes = habillage.scene.calques.flatMap((calque) =>
      calque.regions.map((region) => region.id)
    );
    expect(toutes.length).toBe(new Set(toutes).size);
  });
});

/**
 * ──────────────────────────────────────────────────────────────────────────────────────
 * L'ÉTAPE BLOQUANTE de l'annexe P § 3.2, reprise mot pour mot par CLAUDE.md :
 * « un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image ».
 *
 * Elle n'avait AUCUN contrôle automatique : `estCheminFerme` existait dans
 * `client/src/moteurs/colorie/SceneSvg.tsx`, exporté « destiné à L-G », et n'était appelé
 * nulle part ; `scripts/test-contenu.mjs` n'ouvrait aucun fichier `.svg`.
 *
 * Le contrôle vit désormais dans `@pierre/partage/validation` — le seul endroit d'où un
 * script Node (`test:contenu`) ET le client peuvent l'atteindre. Les cas ci-dessous sont
 * le filet ; le script, lui, l'applique à tous les SVG de `contenu/`.
 * ──────────────────────────────────────────────────────────────────────────────────────
 */
describe('régions fermées — étape bloquante de l’annexe P § 3.2', () => {
  it('reconnaît un chemin fermé, à une seule sous-courbe', () => {
    expect(estCheminFerme('M 0 0 L 10 0 L 10 10 Z')).toBe(true);
  });

  it('refuse un chemin dont la sous-courbe ne se referme pas', () => {
    expect(estCheminFerme('M 0 0 L 10 0 L 10 10')).toBe(false);
  });

  it('refuse un chemin dont UNE SEULE des sous-courbes reste ouverte', () => {
    // Le trou du « evenodd » n'est pas refermé : la couleur fuirait par là.
    expect(estCheminFerme('M0,0 L10,0 L10,10 Z M2,2 L4,2 L4,4')).toBe(false);
  });

  it('accepte les sous-courbes multiples et les arcs du décor réel', () => {
    expect(
      estCheminFerme('M0,420 L922,420 L922,615 L0,615 Z M250,464 A40,40 0 1 0 330,464 Z')
    ).toBe(true);
  });

  it('refuse un `d` vide ou qui ne commence pas par un déplacement', () => {
    expect(estCheminFerme('')).toBe(false);
    expect(estCheminFerme('   ')).toBe(false);
    expect(estCheminFerme('L 10 0 Z')).toBe(false);
  });

  it('le SVG réel de la v1 passe le contrôle sans un seul problème', () => {
    const texte = lireTexte(CHEMIN_SVG_ECOLE);
    const rapport = validerSceneSvg(texte, habillage);
    expect(rapport.problemes).toEqual([]);
    expect(rapport.valide).toBe(true);
  });

  it('attrape une région coloriable dont le chemin a perdu son `Z`', () => {
    const texte = lireTexte(CHEMIN_SVG_ECOLE).replace(
      'd="M10,470 L180,470 L180,520 L10,520 Z"',
      'd="M10,470 L180,470 L180,520 L10,520"'
    );
    const rapport = validerSceneSvg(texte, habillage);
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.map((p) => p.regle)).toContain('svg-chemin-ouvert');
    expect(rapport.problemes.map((p) => p.chemin)).toContain('#calque-zones/banc');
  });

  it('ne juge PAS les calques de trait, ouverts par construction', () => {
    // `calque-trait` n'a que des segments ouverts, et c'est correct : il n'est pas rempli.
    const rapport = validerSceneSvg(lireTexte(CHEMIN_SVG_ECOLE), habillage);
    expect(rapport.problemes.filter((p) => p.chemin.startsWith('#calque-trait'))).toEqual([]);
  });

  it('signale une région déclarée par l’habillage et absente du SVG', () => {
    const texte = lireTexte(CHEMIN_SVG_ECOLE).replace(' id="ballon"', ' id="ballon-renomme"');
    const rapport = validerSceneSvg(texte, habillage);
    expect(rapport.problemes.map((p) => p.regle)).toContain('svg-region-absente');
  });

  it('signale un calque déclaré par l’habillage et absent du SVG', () => {
    const texte = lireTexte(CHEMIN_SVG_ECOLE).replace(
      '<g id="calque-zones"',
      '<g id="calque-des-zones"'
    );
    const rapport = validerSceneSvg(texte, habillage);
    expect(rapport.problemes.map((p) => p.regle)).toContain('svg-calque-absent');
  });
});
