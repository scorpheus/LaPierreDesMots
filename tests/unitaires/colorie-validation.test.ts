/**
 * Le contrat O3 du moteur `colorie` — contrat gelé § 5.
 *
 * Quatre motifs de refus, deux seulement qui comptent comme erreur, trois paliers d'aide, et
 * la règle de non-échec. C'est le fichier qui garde la conception : si l'un de ces cas change,
 * ce n'est plus une correction, c'est une décision, et elle doit passer par le journal.
 *
 * Les données viennent de `contenu/` (lot L-F) et non de faux objets fabriqués ici : un test
 * qui invente son propre exercice ne prouve rien sur celui que l'enfant jouera.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  DELAIS_AIDE,
  REFUS_COMPTE_ERREUR,
  TOLERANCE_TAP_PX,
  evaluerPeinture,
  regionSousLeDoigt
} from '@partage/moteurs/colorie/validation';
import { moteurColorie } from '@partage/moteurs/colorie/moteur';

import type {
  ActionColorie,
  CibleColorie,
  ContenuColorie,
  EtatColorie,
  MotifRefus
} from '@partage/moteurs/colorie/types';
import type { Alea, CouleurColoriage, Exercice, Habillage, Horloge } from '@pierre/partage';

import {
  CHEMIN_EXERCICE_ECOLE,
  aleaDeTest,
  habillageEcole,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const contenu = exercice.jeu.contenu as ContenuColorie;
const habillage: Habillage = habillageEcole();

let alea: Alea;
let horloge: Horloge;

beforeEach(() => {
  alea = aleaDeTest();
  horloge = horlogeDeTest();
});

function etatInitial(): EtatColorie {
  return moteurColorie.creerEtat({ contenu, habillage, alea, horloge });
}

function jouer(etat: EtatColorie, ...actions: readonly ActionColorie[]): EtatColorie {
  return actions.reduce(
    (courant, action) => moteurColorie.reduire(courant, action, { alea, horloge }),
    etat
  );
}

/** Peint une cible correctement : choisir la couleur, puis toucher la région. */
function peindre(etat: EtatColorie, cible: CibleColorie): EtatColorie {
  return jouer(
    etat,
    { type: 'choisirCouleur', couleur: cible.couleur },
    { type: 'peindre', region: cible.region }
  );
}

function consigneActive(etat: EtatColorie): EtatColorie['consignes'][number] {
  const active = etat.consignes[etat.indexConsigne];
  if (!active) throw new Error('aucune consigne active — l’état est incohérent');
  return active;
}

/** Une couleur du nuancier autorisé qui n'est PAS celle attendue. */
function couleurFausse(attendue: CouleurColoriage): CouleurColoriage {
  const autre = contenu.nuancierAutorise.find((c) => c !== attendue);
  if (!autre) throw new Error('le nuancier autorisé ne porte qu’une couleur');
  return autre;
}

/** Une région coloriable de l'habillage qui n'est cible d'AUCUNE consigne. */
function regionHorsExercice(): string {
  const ciblees = new Set(contenu.consignes.flatMap((c) => c.cibles.map((x) => x.region)));
  const region = habillage.scene.calques
    .filter((calque) => calque.role === 'coloriable')
    .flatMap((calque) => calque.regions)
    .find((r) => !ciblees.has(r.id));
  if (!region) throw new Error('toutes les régions de l’habillage sont ciblées');
  return region.id;
}

// ────────────────────────────────────────────────── les données de la v1 tiennent-elles ?

describe('les données de la v1 (lot L-F)', () => {
  it('portent au moins une consigne à plusieurs cibles — c’est le cas qui a dicté le schéma', () => {
    expect(contenu.consignes.some((c) => c.cibles.length >= 2)).toBe(true);
  });

  it('offrent un nuancier plus large que les couleurs utiles', () => {
    const utiles = new Set(contenu.consignes.flatMap((c) => c.cibles.map((x) => x.couleur)));
    expect(contenu.nuancierAutorise.length).toBeGreaterThan(utiles.size);
  });

  it('la consigne courante accepte ses zones dans n’importe quel ordre, sans remplir les autres', () => {
    let etat = etatInitial();
    while (consigneActive(etat).ciblesRestantes.length < 2) {
      for (const cible of consigneActive(etat).ciblesRestantes) {
        etat = peindre(etat, cible);
      }
    }

    const [premiere, seconde] = [...consigneActive(etat).ciblesRestantes].reverse();
    if (premiere === undefined || seconde === undefined) throw new Error('deux zones attendues requises');

    etat = peindre(etat, premiere);
    expect(etat.remplissages[premiere.region]).toBe(premiere.couleur);
    expect(etat.remplissages[seconde.region]).toBeUndefined();

    etat = peindre(etat, seconde);
    expect(etat.remplissages[seconde.region]).toBe(seconde.couleur);
  });
});

// ──────────────────────────────────────────────────────────── les quatre motifs de refus

describe('les quatre motifs de refus — contrat § 5.5', () => {
  it('« aucune-couleur-choisie » : toucher sans godet ne coûte rien', () => {
    const etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    const decision = evaluerPeinture(etat, contenu, cible.region, null);

    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe<MotifRefus>('aucune-couleur-choisie');
    expect(decision.compteErreur).toBe(false);
  });

  it('« region-hors-consigne » : bonne couleur, mauvaise région — et ça compte', () => {
    const etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    const decision = evaluerPeinture(etat, contenu, regionHorsExercice(), cible.couleur);

    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe<MotifRefus>('region-hors-consigne');
    expect(decision.compteErreur).toBe(true);
  });

  it('« couleur-fausse » : bonne région, mauvaise couleur — et ça compte', () => {
    const etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    const decision = evaluerPeinture(etat, contenu, cible.region, couleurFausse(cible.couleur));

    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe<MotifRefus>('couleur-fausse');
    expect(decision.compteErreur).toBe(true);
  });

  it('« region-deja-peinte » : le double-tap rapide ne coûte rien — annexe T § T1', () => {
    // On se place sur une consigne à plusieurs cibles : sinon la première peinture la
    // satisfait, l'exercice avance, et la région ne serait plus « déjà peinte » mais
    // « hors consigne ».
    let etat = etatInitial();
    while (consigneActive(etat).ciblesRestantes.length < 2) {
      const cibles = consigneActive(etat).ciblesRestantes;
      if (cibles.length === 0) throw new Error('aucune consigne à plusieurs cibles');
      for (const cible of cibles) etat = peindre(etat, cible);
    }

    const cible = consigneActive(etat).ciblesRestantes[0]!;
    etat = peindre(etat, cible);
    const decision = evaluerPeinture(etat, contenu, cible.region, cible.couleur);

    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe<MotifRefus>('region-deja-peinte');
    expect(decision.compteErreur).toBe(false);
  });

  it('la table REFUS_COMPTE_ERREUR couvre exactement les quatre motifs', () => {
    expect(Object.keys(REFUS_COMPTE_ERREUR).sort()).toEqual([
      'aucune-couleur-choisie',
      'couleur-fausse',
      'region-deja-peinte',
      'region-hors-consigne'
    ]);
    expect(REFUS_COMPTE_ERREUR['region-hors-consigne']).toBe(true);
    expect(REFUS_COMPTE_ERREUR['couleur-fausse']).toBe(true);
    expect(REFUS_COMPTE_ERREUR['region-deja-peinte']).toBe(false);
    expect(REFUS_COMPTE_ERREUR['aucune-couleur-choisie']).toBe(false);
  });

  it('un refus ne peint jamais la région', () => {
    let etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    etat = jouer(
      etat,
      { type: 'choisirCouleur', couleur: couleurFausse(cible.couleur) },
      { type: 'peindre', region: cible.region }
    );
    expect(etat.remplissages[cible.region]).toBeUndefined();
    expect(etat.dernierRefus?.motif).toBe<MotifRefus>('couleur-fausse');
  });
});

// ─────────────────────────────────────────────────────────────── les trois paliers d'aide

describe('les trois paliers d’aide — contrat § 5.6', () => {
  it('les seuils sont ceux du contrat, au chiffre près', () => {
    expect(DELAIS_AIDE.relectureMs).toBe(20_000);
    expect(DELAIS_AIDE.indiceMs).toBe(45_000);
    expect(DELAIS_AIDE.demonstrationMs).toBe(30_000);
    expect(DELAIS_AIDE.erreursAvantIndice).toBe(2);
    expect(DELAIS_AIDE.erreursAvantDemonstration).toBe(3);
  });

  it('la 2ᵉ erreur sur la consigne active déclenche l’indice', () => {
    let etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    const fausse = couleurFausse(cible.couleur);

    etat = jouer(etat, { type: 'choisirCouleur', couleur: fausse });
    etat = jouer(etat, { type: 'peindre', region: cible.region });
    expect(etat.niveauAide).toBe('aucune');

    etat = jouer(etat, { type: 'peindre', region: cible.region });
    expect(etat.niveauAide).toBe('indice');
    expect(etat.aide?.niveau).toBe('indice');
  });

  it('la 3ᵉ erreur déclenche la démonstration, qui désigne la région attendue', () => {
    let etat = etatInitial();
    const cible = consigneActive(etat).ciblesRestantes[0]!;
    etat = jouer(etat, { type: 'choisirCouleur', couleur: couleurFausse(cible.couleur) });
    for (let i = 0; i < DELAIS_AIDE.erreursAvantDemonstration; i += 1) {
      etat = jouer(etat, { type: 'peindre', region: cible.region });
    }
    expect(etat.niveauAide).toBe('demonstration');
    expect(etat.aide?.cible).toBe(cible.region);
  });

  it('45 s d’inactivité déclenchent l’indice sans qu’aucune erreur soit commise', () => {
    let etat = etatInitial();
    horloge.avancer({ secondes: DELAIS_AIDE.indiceMs / 1_000 + 1 });
    etat = jouer(etat, { type: 'battementHorloge' });

    expect(etat.niveauAide).toBe('indice');
    expect(consigneActive(etat).nbErreurs).toBe(0);
  });

  it('30 s après l’indice, la démonstration arrive — toujours sans erreur', () => {
    let etat = etatInitial();
    horloge.avancer({ secondes: DELAIS_AIDE.indiceMs / 1_000 + 1 });
    etat = jouer(etat, { type: 'battementHorloge' });
    horloge.avancer({ secondes: DELAIS_AIDE.demonstrationMs / 1_000 + 1 });
    etat = jouer(etat, { type: 'battementHorloge' });

    expect(etat.niveauAide).toBe('demonstration');
    expect(consigneActive(etat).nbErreurs).toBe(0);
  });

  it('20 s d’inactivité relisent la consigne — c’est une réécoute, PAS une aide (R15)', () => {
    let etat = etatInitial();
    horloge.avancer({ secondes: DELAIS_AIDE.relectureMs / 1_000 + 1 });
    etat = jouer(etat, { type: 'battementHorloge' });

    expect(etat.niveauAide).toBe('aucune');
    expect(consigneActive(etat).nbEcoutes).toBeGreaterThanOrEqual(1);
  });

  it('réécouter volontairement ne coûte jamais rien — R15', () => {
    let etat = etatInitial();
    for (let i = 0; i < 5; i += 1) etat = jouer(etat, { type: 'ecouterConsigne' });

    expect(etat.niveauAide).toBe('aucune');
    expect(consigneActive(etat).nbErreurs).toBe(0);
    expect(moteurColorie.resume(etat).aideUtilisee).toBe('aucune');
  });

  it('appeler Gobi volontairement produit exactement le palier « indice »', () => {
    const etat = jouer(etatInitial(), { type: 'demanderAide' });
    expect(etat.niveauAide).toBe('indice');
  });

  it('le niveau d’aide est monotone croissant : une aide obtenue n’est jamais retirée', () => {
    let etat = jouer(etatInitial(), { type: 'demanderAide' });
    expect(etat.niveauAide).toBe('indice');

    // On joue tout l'exercice correctement : l'aide ne redescend jamais à « aucune ».
    const ordre: Array<'aucune' | 'indice' | 'demonstration'> = ['aucune', 'indice', 'demonstration'];
    let rang = ordre.indexOf(etat.niveauAide);
    let garde = 0;
    while (!moteurColorie.progression(etat).termine && garde < 200) {
      const cible = consigneActive(etat).ciblesRestantes[0];
      if (!cible) break;
      etat = peindre(etat, cible);
      const nouveauRang = ordre.indexOf(etat.niveauAide);
      expect(nouveauRang).toBeGreaterThanOrEqual(rang);
      rang = nouveauRang;
      garde += 1;
    }
    expect(etat.niveauAide).not.toBe('aucune');
  });
});

// ─────────────────────────────────────────────────────────────────── la règle de non-échec

describe('la règle de non-échec — R14, contrat § 5.6', () => {
  it('un exercice mené entièrement de travers finit quand même en réussite', () => {
    let etat = etatInitial();
    const fausse = couleurFausse(consigneActive(etat).ciblesRestantes[0]!.couleur);

    // 40 refus, exactement le protocole du bot casse-cou.
    etat = jouer(etat, { type: 'choisirCouleur', couleur: fausse });
    for (let i = 0; i < 40; i += 1) {
      const cible = consigneActive(etat).ciblesRestantes[0];
      if (!cible) break;
      etat = jouer(etat, { type: 'peindre', region: cible.region });
    }
    expect(moteurColorie.progression(etat).termine).toBe(false);

    // Puis on termine correctement.
    let garde = 0;
    while (!moteurColorie.progression(etat).termine && garde < 200) {
      const cible = consigneActive(etat).ciblesRestantes[0];
      if (!cible) break;
      etat = peindre(etat, cible);
      garde += 1;
    }

    const bilan = moteurColorie.resume(etat);
    expect(moteurColorie.progression(etat).termine).toBe(true);
    expect(bilan.reussi).toBe(true);
    expect(bilan.nbErreurs).toBeGreaterThan(0);
  });

  it('`resume().reussi` ne vaut jamais false une fois l’exercice terminé', () => {
    let etat = etatInitial();
    let garde = 0;
    while (!moteurColorie.progression(etat).termine && garde < 200) {
      const cible = consigneActive(etat).ciblesRestantes[0];
      if (!cible) break;
      etat = peindre(etat, cible);
      garde += 1;
    }
    expect(moteurColorie.resume(etat).reussi).toBe(true);
  });

  it('l’avancement va de 0 à 1 et ne recule jamais', () => {
    let etat = etatInitial();
    let precedent = moteurColorie.progression(etat).avancement;
    expect(precedent).toBeGreaterThanOrEqual(0);

    let garde = 0;
    while (!moteurColorie.progression(etat).termine && garde < 200) {
      const cible = consigneActive(etat).ciblesRestantes[0];
      if (!cible) break;
      etat = peindre(etat, cible);
      const courant = moteurColorie.progression(etat).avancement;
      expect(courant).toBeGreaterThanOrEqual(precedent);
      precedent = courant;
      garde += 1;
    }
    expect(precedent).toBe(1);
  });

  it('l’ordre des consignes est imposé — contrat § 5.3', () => {
    expect(moteurColorie.capacites.ordreEtapesImpose).toBe(true);
    const etat = etatInitial();
    expect(etat.indexConsigne).toBe(0);
    // Une cible d'une consigne ULTÉRIEURE est refusée tant que son tour n'est pas venu.
    const consigneSuivante = contenu.consignes[1];
    if (consigneSuivante) {
      const cible = consigneSuivante.cibles[0]!;
      const decision = evaluerPeinture(etat, contenu, cible.region, cible.couleur);
      expect(decision.acceptee).toBe(false);
      expect(decision.motif).toBe<MotifRefus>('region-hors-consigne');
    }
  });
});

// ──────────────────────────────────────────────────────────────────── tolérance de visée

describe('regionSousLeDoigt — contrat § 5.2', () => {
  it('la tolérance est celle de R16', () => {
    expect(TOLERANCE_TAP_PX).toBe(24);
  });

  it('un doigt posé sur le centroïde désigne sa région', () => {
    const region = habillage.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions)[0];
    if (!region) throw new Error('l’habillage ne déclare aucune région coloriable');
    expect(regionSousLeDoigt(habillage, region.centroide)).toBe(region.id);
  });

  it('un doigt loin du dessin ne désigne rien — le tap est ignoré, pas refusé', () => {
    const [largeur, hauteur] = habillage.scene.viewBox
      .split(/\s+/)
      .slice(2)
      .map((n) => Number(n));
    const dehors: readonly [number, number] = [
      (largeur ?? 1_000) * 100,
      (hauteur ?? 1_000) * 100
    ];
    expect(regionSousLeDoigt(habillage, dehors, 1)).toBeNull();
  });
});
