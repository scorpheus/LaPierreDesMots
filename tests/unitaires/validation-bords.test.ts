/**
 * Les bords de la VALIDATION — écrit à l'intégration de la campagne v2.
 *
 * L'annexe T § 7 exige ≥ 95 % sur `validation/`, et sa raison est écrite : « c'est le juge ;
 * un faux négatif décourage l'enfant pour rien ». Après la campagne, deux fichiers passaient
 * sous le seuil — mesuré, pas supposé :
 *
 *   ERROR: Coverage for branches (85,71 %) — "partage/src/contenu/validation.ts" (95 %)
 *   ERROR: Coverage for branches (88,88 %) — "partage/src/moteurs/colorie/validation.ts" (95 %)
 *
 * Les branches qui manquaient ne sont pas décoratives : ce sont les REFUS. Un juge dont on ne
 * teste que les acquittements n'est pas testé.
 */
import { describe, expect, it } from 'vitest';

import {
  initialiserRegistreMoteurs,
  obtenirMoteur
} from '@pierre/partage';
import { validerBlocJeu, validerSceneSvg } from '@pierre/partage/validation';
import type { Exercice, Habillage } from '@pierre/partage';
import { evaluerPeinture, evaluerPeintureDepuisEtat } from '@partage/moteurs/colorie/validation';
import { moteurColorie } from '@partage/moteurs/colorie/moteur';
import type { ContenuColorie } from '@partage/moteurs/colorie/types';

import {
  CHEMIN_EXERCICE_ECOLE,
  CHEMIN_HABILLAGE_ECOLE,
  aleaDeTest,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

initialiserRegistreMoteurs();

const exerciceEcole = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const habillageEcole = lireJson<Habillage>(CHEMIN_HABILLAGE_ECOLE);

/** Copie profonde par sérialisation : aucune fixture partagée n'est modifiée en place. */
function copie<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}

function codesDe(rapport: { problemes: readonly { regle: string }[] }): readonly string[] {
  return rapport.problemes.map((p) => p.regle);
}

describe('validerBlocJeu — les trois refus', () => {
  it('refuse un moteur qui n’est pas au registre, et ne juge rien d’autre', () => {
    const exercice = copie(exerciceEcole) as unknown as {
      jeu: { moteur: string };
    };
    exercice.jeu.moteur = 'moteur-fantome';
    const rapport = validerBlocJeu(exercice as unknown as Exercice, habillageEcole);
    expect(rapport.valide).toBe(false);
    // Un seul problème : inutile de reprocher le contenu à un moteur qui n'existe pas.
    expect(codesDe(rapport)).toEqual(['moteur-inconnu']);
  });

  it('refuse un habillage dont l’identifiant ne correspond pas à celui déclaré', () => {
    const habillage = copie(habillageEcole) as unknown as { id: string };
    habillage.id = 'clairiere.un-autre-decor';
    const rapport = validerBlocJeu(exerciceEcole, habillage as unknown as Habillage);
    expect(rapport.valide).toBe(false);
    expect(codesDe(rapport)).toContain('habillage-incompatible');
  });

  it('refuse un habillage qui ne déclare pas le moteur comme compatible', () => {
    const habillage = copie(habillageEcole) as unknown as { moteurs: string[] };
    habillage.moteurs = ['tri'];
    const rapport = validerBlocJeu(exerciceEcole, habillage as unknown as Habillage);
    expect(rapport.valide).toBe(false);
    expect(codesDe(rapport).length).toBeGreaterThan(0);
  });

  it('accepte le couple réel du dépôt — sinon les refus ci-dessus ne prouveraient rien', () => {
    // Discrimination : un validateur qui refuse tout passerait les trois cas précédents.
    const rapport = validerBlocJeu(exerciceEcole, habillageEcole);
    expect(rapport.valide, JSON.stringify(rapport.problemes)).toBe(true);
  });

  it('refuse un `jeu.contenu` que le schéma du moteur n’accepte pas', () => {
    const exercice = copie(exerciceEcole) as unknown as { jeu: { contenu: unknown } };
    exercice.jeu.contenu = { consignes: 'ce n’est pas un tableau' };
    const rapport = validerBlocJeu(exercice as unknown as Exercice, habillageEcole);
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.some((p) => p.chemin.startsWith('/jeu/contenu'))).toBe(true);
  });
});

describe('validerSceneSvg — les formes primitives sont fermées d’office', () => {
  /**
   * Une région déclarée par un `<circle>`, un `<rect>`, une `<ellipse>` ou un `<polygon>` n'a
   * pas de `d` à contrôler : la forme est fermée par construction. La branche existait, aucun
   * test ne la parcourait, et un habillage bâti sur des primitives aurait été refusé sans que
   * personne ne comprenne pourquoi.
   *
   * L'habillage fabriqué ici ne garde QUE son calque coloriable : `validerSceneSvg` exige que
   * chaque calque déclaré soit présent dans le SVG, et les SVG de ce bloc n'en portent qu'un.
   */
  function habillageAvecRegions(ids: readonly string[]): Habillage {
    const h = copie(habillageEcole) as unknown as {
      scene: { calques: { id: string; role: string; regions: unknown[] }[] };
    };
    h.scene.calques = [
      {
        id: 'calque-zones',
        role: 'coloriable',
        regions: ids.map((id) => ({ id, libelle: id, centroide: [0, 0], surface: 9000 }))
      }
    ];
    return h as unknown as Habillage;
  }

  const SVG_PRIMITIVES =
    '<svg viewBox="0 0 100 100">' +
    '<g id="calque-zones">' +
    '<circle id="lune" cx="20" cy="20" r="10"/>' +
    '<rect id="fenetre" x="40" y="40" width="20" height="20"/>' +
    '<ellipse id="mare" cx="70" cy="20" rx="12" ry="8"/>' +
    '<polygon id="toit" points="10,90 50,60 90,90"/>' +
    '</g></svg>';

  it('accepte les quatre primitives sans réclamer de tracé fermé', () => {
    const rapport = validerSceneSvg(
      SVG_PRIMITIVES,
      habillageAvecRegions(['lune', 'fenetre', 'mare', 'toit'])
    );
    expect(rapport.valide, JSON.stringify(rapport.problemes)).toBe(true);
  });

  it('SIGNALE quand même une région déclarée que le SVG ne porte pas', () => {
    // Discrimination : sans ce cas, le précédent pourrait passer sur un contrôle débranché.
    const rapport = validerSceneSvg(
      SVG_PRIMITIVES,
      habillageAvecRegions(['lune', 'region-absente-du-svg'])
    );
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.some((p) => p.message.includes('region-absente-du-svg'))).toBe(true);
  });

  it('SIGNALE un tracé coloriable resté ouvert — la fuite de l’annexe P § 3.2', () => {
    const svgOuvert =
      '<svg viewBox="0 0 100 100"><g id="calque-zones">' +
      '<path id="mur" d="M10,10 L90,10 L90,90 L10,90"/>' +
      '</g></svg>';
    const rapport = validerSceneSvg(svgOuvert, habillageAvecRegions(['mur']));
    expect(rapport.valide).toBe(false);
    expect(codesDe(rapport)).toContain('svg-chemin-ouvert');
  });

  it('nomme « (sans id) » un tracé fautif anonyme, au lieu de le taire', () => {
    // Un `<path>` ouvert et sans `id` est le pire cas : il fuit ET il est introuvable. Le
    // pointeur doit rester utilisable, sans quoi le message n'aide personne.
    const svgAnonyme =
      '<svg viewBox="0 0 100 100"><g id="calque-zones">' +
      '<path id="mur" d="M10,10 L90,10 L90,90 L10,90 Z"/>' +
      '<path d="M20,20 L80,20 L80,80"/>' +
      '</g></svg>';
    const rapport = validerSceneSvg(svgAnonyme, habillageAvecRegions(['mur']));
    expect(rapport.valide).toBe(false);
    expect(rapport.problemes.map((p) => p.chemin)).toContain('#calque-zones/(sans id)');
  });

  it('ne se laisse pas décaler par un `<g/>` auto-fermant', () => {
    // Un `<g/>` sans contenu ne doit pas entrer dans la pile des calques : s'il y entrait, le
    // `</g>` suivant refermerait le MAUVAIS groupe et le calque coloriable serait déclaré
    // absent alors qu'il est là. Le décalage ne se verrait que sur un SVG produit par un outil
    // de vectorisation — c'est-à-dire sur tous les vrais assets à venir.
    const svgAvecGroupeVide =
      '<svg viewBox="0 0 100 100">' +
      '<g id="calque-vide" fill="none"/>' +
      '<g id="calque-zones">' +
      '<path id="mur" d="M10,10 L90,10 L90,90 L10,90 Z"/>' +
      '</g></svg>';
    const rapport = validerSceneSvg(svgAvecGroupeVide, habillageAvecRegions(['mur']));
    expect(rapport.valide, JSON.stringify(rapport.problemes)).toBe(true);
  });
});

describe('evaluerPeinture — la garde de consigne désynchronisée', () => {
  /**
   * `evaluerPeinture` compare la consigne ATTENDUE (celle du contenu) à la consigne COURANTE
   * (celle de l'état). Quand les deux ne portent pas le même identifiant, l'état a été
   * construit sur un autre contenu : peindre alors reviendrait à juger un geste contre une
   * consigne que l'enfant n'a jamais vue. Le refus est `region-deja-peinte`, jamais un échec.
   */
  it('refuse quand l’état et le contenu ne parlent pas de la même consigne', () => {
    const contenu = copie(exerciceEcole.jeu.contenu) as ContenuColorie;
    const etat = moteurColorie.creerEtat({
      contenu,
      habillage: habillageEcole,
      alea: aleaDeTest(),
      horloge: horlogeDeTest()
    });

    // Un contenu dont la première consigne porte un autre identifiant : l'état, lui, garde
    // celui d'origine. C'est exactement la désynchronisation que la garde attrape.
    const autreContenu = copie(contenu) as unknown as {
      consignes: { id: string }[];
    };
    autreContenu.consignes[0]!.id = 'c-venue-d-ailleurs';

    const cible = etat.consignes[0]?.ciblesRestantes[0];
    expect(cible, 'la fixture doit offrir au moins une cible').toBeDefined();

    const decision = evaluerPeinture(
      etat,
      autreContenu as unknown as ContenuColorie,
      cible!.region,
      cible!.couleur
    );
    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe('region-deja-peinte');
    // R14 : un refus ne compte jamais comme un échec de la tentative.
    expect(moteurColorie.resume(etat).reussi).toBe(true);
  });

  it('accepte le même geste quand les deux consignes concordent — discrimination', () => {
    const contenu = copie(exerciceEcole.jeu.contenu) as ContenuColorie;
    const etat = moteurColorie.creerEtat({
      contenu,
      habillage: habillageEcole,
      alea: aleaDeTest(),
      horloge: horlogeDeTest()
    });
    const cible = etat.consignes[0]?.ciblesRestantes[0];
    const decision = evaluerPeinture(etat, contenu, cible!.region, cible!.couleur);
    expect(decision.acceptee).toBe(true);
  });

  it('le registre publie bien un schéma pour `colorie` — la fixture reste exprimable', () => {
    expect(Object.keys(obtenirMoteur('colorie').schemaContenu).length).toBeGreaterThan(0);
  });
});

describe('evaluerPeintureDepuisEtat — après la fin, et hors des consignes', () => {
  function etatNeuf() {
    const contenu = copie(exerciceEcole.jeu.contenu) as ContenuColorie;
    return moteurColorie.creerEtat({
      contenu,
      habillage: habillageEcole,
      alea: aleaDeTest(),
      horloge: horlogeDeTest()
    });
  }

  it('après la fin, plus rien ne peut être une erreur — R14', () => {
    const etat = etatNeuf();
    const cible = etat.consignes[0]?.ciblesRestantes[0];
    const termine = { ...etat, termineMs: etat.demarreMs + 1000 };
    const decision = evaluerPeintureDepuisEtat(termine, cible!.region, cible!.couleur);
    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe('region-deja-peinte');
    expect(decision.compteErreur, 'un geste après la fin ne compte jamais').toBe(false);
  });

  it('un index de consigne au-delà de la liste refuse au lieu de lever', () => {
    // L'état ne devrait jamais arriver là ; s'il y arrive, le juge refuse proprement plutôt
    // que de laisser une exception remonter jusqu'à l'écran de l'enfant.
    const etat = etatNeuf();
    const cible = etat.consignes[0]?.ciblesRestantes[0];
    const horsListe = { ...etat, indexConsigne: etat.consignes.length + 3 };
    const decision = evaluerPeintureDepuisEtat(horsListe, cible!.region, cible!.couleur);
    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe('region-deja-peinte');
  });

  it('sans couleur choisie, le refus le dit — et ne compte pas d’erreur', () => {
    const etat = etatNeuf();
    const cible = etat.consignes[0]?.ciblesRestantes[0];
    const decision = evaluerPeintureDepuisEtat(etat, cible!.region, null);
    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe('aucune-couleur-choisie');
    expect(decision.compteErreur).toBe(false);
  });
});
