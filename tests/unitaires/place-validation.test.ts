/**
 * Le contrat du moteur `place` — contrat gelé § 4.3.2, point ouvert O6.
 *
 * Cinq motifs de refus, deux seulement qui comptent, trois paliers d'aide, la règle de
 * non-échec — et le chiffre qui décide si ce lot n'est pas creux : **les 8 consignes
 * « Dessine… » du niveau 1 sont-elles couvertes ?** (§ 10.4).
 *
 * Les données viennent de `contenu/` et de `contenu/brouillons/niveau-1/`, jamais de faux
 * objets fabriqués ici : un test qui invente son propre exercice ne prouve rien sur celui que
 * l'enfant jouera, et un test qui invente ses consignes ne prouve rien sur le corpus réel.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  REFUS_PLACE_COMPTE_ERREUR,
  TOLERANCE_DEPOT_PX,
  evaluerDepot,
  relationDeConsigne,
  zoneSousLeDoigt,
} from '@partage/moteurs/place/validation';
import { moteurPlace } from '@partage/moteurs/place/moteur';
import { SCHEMA_CONTENU_PLACE } from '@partage/moteurs/place/schema-contenu';
import { RANG_AIDE } from '@partage/moteurs/commun/aide';
import { pointDansPolygone } from '@partage/moteurs/commun/geometrie';

import type {
  ActionPlace,
  ContenuPlace,
  EtatPlace,
  MotifRefusPlace,
  RelationSpatiale,
} from '@partage/moteurs/place/index';
import type { Point } from '@partage/moteurs/commun/geometrie';
import type { Exercice, Habillage } from '@pierre/partage';

import { RACINE_DEPOT, aleaDeTest, horlogeDeTest, lireJson } from '../configuration/preparation.js';

const CHEMIN_EXERCICE = 'contenu/exercices/clairiere/ecole-02-place.json';
const CHEMIN_HABILLAGE = 'contenu/habillages/clairiere/ecole-place.habillage.json';
const DOSSIER_BROUILLONS = 'contenu/brouillons/niveau-1';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE);
const contenu = exercice.jeu.contenu as ContenuPlace;
const habillage = lireJson<Habillage>(CHEMIN_HABILLAGE);

const contexte = { alea: aleaDeTest(), horloge: horlogeDeTest() };

function etatNeuf(): EtatPlace {
  return moteurPlace.creerEtat({
    contenu,
    habillage,
    alea: contexte.alea,
    horloge: contexte.horloge,
  });
}

function jouer(etat: EtatPlace, actions: readonly ActionPlace[]): EtatPlace {
  return actions.reduce((courant, action) => moteurPlace.reduire(courant, action, contexte), etat);
}

/** Les dépôts attendus de la consigne active, dans l'ordre du contenu. */
function poserConsigne(etat: EtatPlace, index: number): readonly ActionPlace[] {
  const consigne = contenu.consignes[index];
  if (consigne === undefined) return [];
  return consigne.depots.flatMap((depot): ActionPlace[] => {
    const zone = contenu.zones.find((z) => z.id === depot.zone);
    if (zone === undefined) return [];
    return [
      { type: 'saisir', element: depot.element },
      { type: 'deposer', point: zone.centroide },
    ];
  });
}

describe('zoneSousLeDoigt — la visée', () => {
  it('rend la zone dont le polygone contient le point', () => {
    const ciel = contenu.zones.find((z) => z.id === 'ciel');
    expect(ciel).toBeDefined();
    expect(zoneSousLeDoigt(contenu, ciel!.centroide)).toBe('ciel');
  });

  it('rattrape un point HORS polygone mais sous la tolérance, par le centroïde', () => {
    const ciel = contenu.zones.find((z) => z.id === 'ciel')!;
    // 10 unités au-dessus du bord supérieur : dehors, mais à moins de 24 du centroïde ? Non —
    // on prend donc un point voisin d'un petit polygone construit pour ce cas précis.
    const minuscule: ContenuPlace = {
      ...contenu,
      zones: [
        {
          id: 'pastille',
          libelle: 'la pastille',
          polygone: [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 4],
          ],
          centroide: [2, 2],
          relation: 'dans',
          ancre: null,
        },
      ],
    };
    const dehors: Point = [12, 2];
    expect(pointDansPolygone(dehors, minuscule.zones[0]!.polygone)).toBe(false);
    expect(zoneSousLeDoigt(minuscule, dehors)).toBe('pastille');
    expect(zoneSousLeDoigt(minuscule, [2 + TOLERANCE_DEPOT_PX + 1, 2])).toBeNull();
    expect(ciel.polygone.length).toBeGreaterThanOrEqual(3);
  });

  it('rend null hors du dessin — le dépôt est ignoré, jamais refusé', () => {
    expect(zoneSousLeDoigt(contenu, [-500, -500])).toBeNull();
  });
});

describe('evaluerDepot — les cinq motifs, et les deux qui comptent', () => {
  it('deux motifs sur cinq seulement sont des erreurs de lecture', () => {
    const comptes = Object.values(REFUS_PLACE_COMPTE_ERREUR).filter(Boolean).length;
    expect(comptes).toBe(2);
    expect(REFUS_PLACE_COMPTE_ERREUR['zone-deja-occupee']).toBe(false);
    expect(REFUS_PLACE_COMPTE_ERREUR['aucun-element-saisi']).toBe(false);
    expect(REFUS_PLACE_COMPTE_ERREUR['hors-scene']).toBe(false);
  });

  it('accepte le bon élément dans la bonne zone', () => {
    const etat = etatNeuf();
    const depot = contenu.consignes[0]!.depots[0]!;
    const zone = contenu.zones.find((z) => z.id === depot.zone)!;
    const decision = evaluerDepot(etat, contenu, depot.element, zone.centroide);
    expect(decision.acceptee).toBe(true);
    expect(decision.zone).toBe(depot.zone);
    expect(decision.compteErreur).toBe(false);
  });

  it('refuse un intrus dans la bonne zone — et cela compte comme erreur', () => {
    const etat = etatNeuf();
    const zone = contenu.zones.find((z) => z.id === contenu.consignes[0]!.depots[0]!.zone)!;
    const decision = evaluerDepot(etat, contenu, 'poisson', zone.centroide);
    expect(decision.acceptee).toBe(false);
    expect(decision.motif).toBe<MotifRefusPlace>('element-hors-consigne');
    expect(decision.compteErreur).toBe(true);
  });

  it('refuse le bon élément dans une zone hors consigne — et cela compte', () => {
    const etat = etatNeuf();
    const autre = contenu.zones.find((z) => z.id !== contenu.consignes[0]!.depots[0]!.zone)!;
    const decision = evaluerDepot(etat, contenu, contenu.consignes[0]!.depots[0]!.element, autre.centroide);
    expect(decision.motif).toBe<MotifRefusPlace>('zone-hors-consigne');
    expect(decision.compteErreur).toBe(true);
  });

  it('un dépôt sans saisie ne coûte rien', () => {
    const decision = evaluerDepot(etatNeuf(), contenu, null, contenu.zones[0]!.centroide);
    expect(decision.motif).toBe<MotifRefusPlace>('aucun-element-saisi');
    expect(decision.compteErreur).toBe(false);
  });

  it('un doigt hors du dessin ne coûte rien', () => {
    const etat = etatNeuf();
    const decision = evaluerDepot(etat, contenu, contenu.reserve[0]!.id, [-900, -900]);
    expect(decision.motif).toBe<MotifRefusPlace>('hors-scene');
    expect(decision.compteErreur).toBe(false);
  });

  it('le double-tap ne compte pas : il est testé AVANT « hors consigne »', () => {
    const etat = jouer(etatNeuf(), poserConsigne(etatNeuf(), 0));
    const depot = contenu.consignes[0]!.depots[0]!;
    const zone = contenu.zones.find((z) => z.id === depot.zone)!;
    // La consigne 0 est close ; la zone appartiendrait à « hors consigne » de la consigne 1.
    const decision = evaluerDepot(etat, contenu, depot.element, zone.centroide);
    expect(decision.motif).toBe<MotifRefusPlace>('zone-deja-occupee');
    expect(decision.compteErreur).toBe(false);
  });
});

describe('moteurPlace — la règle de non-échec et la monotonie de l’aide', () => {
  it('un exercice mené à son terme rend reussi: true et termineMs', () => {
    let etat = etatNeuf();
    for (let i = 0; i < contenu.consignes.length; i += 1) {
      etat = jouer(etat, poserConsigne(etat, i));
    }
    expect(etat.termineMs).not.toBeNull();
    expect(moteurPlace.progression(etat).termine).toBe(true);
    expect(moteurPlace.resume(etat).reussi).toBe(true);
  });

  it('un exercice entièrement raté rend AUSSI reussi: true — R14', () => {
    let etat = etatNeuf();
    for (let i = 0; i < 40; i += 1) {
      etat = jouer(etat, [
        { type: 'saisir', element: 'poisson' },
        { type: 'deposer', point: contenu.zones[i % contenu.zones.length]!.centroide },
      ]);
    }
    expect(moteurPlace.resume(etat).reussi).toBe(true);
    expect(etat.dernierRefus).not.toBeNull();
  });

  it('un élément posé ne se reprend jamais — un acquis n’est jamais repris (R14)', () => {
    const etat = jouer(etatNeuf(), poserConsigne(etatNeuf(), 0));
    const element = contenu.consignes[0]!.depots[0]!.element;
    const apres = jouer(etat, [{ type: 'saisir', element }]);
    expect(apres.elementSaisi).toBeNull();
    expect(apres.places[element]).toBe(etat.places[element]);
  });

  it('propriété : le niveau d’aide ne décroît JAMAIS, sur 200 séquences aléatoires', () => {
    const zonesEtCentroides = contenu.zones.map((z) => z.centroide);
    const elements = contenu.reserve.map((e) => e.id);

    const actionArbitraire = fc.oneof(
      fc.constantFrom(...elements).map((element): ActionPlace => ({ type: 'saisir', element })),
      fc
        .constantFrom(...zonesEtCentroides)
        .map((point): ActionPlace => ({ type: 'deposer', point })),
      fc.constant<ActionPlace>({ type: 'abandonner' }),
      fc.constant<ActionPlace>({ type: 'ecouterConsigne' }),
      fc.constant<ActionPlace>({ type: 'demanderAide' }),
      fc.constant<ActionPlace>({ type: 'battementHorloge' }),
    );

    fc.assert(
      fc.property(fc.array(actionArbitraire, { minLength: 1, maxLength: 40 }), (actions) => {
        let etat = etatNeuf();
        let plancher = RANG_AIDE[etat.niveauAide];
        for (const action of actions) {
          etat = moteurPlace.reduire(etat, action, contexte);
          const rang = RANG_AIDE[etat.niveauAide];
          if (rang < plancher) return false;
          plancher = rang;
          // Aucune action, jamais, ne produit un état d'échec (R14).
          if (moteurPlace.resume(etat).reussi !== true) return false;
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it('« demanderAide » produit exactement le palier indice, au même coût', () => {
    const etat = jouer(etatNeuf(), [{ type: 'demanderAide' }]);
    expect(etat.niveauAide).toBe('indice');
    expect(etat.aide?.niveau).toBe('indice');
    expect(etat.aide?.texte).toBe('Cherche un soleil. Pose-le dans le ciel.');
    expect(etat.aide?.texte).not.toBe(contenu.consignes[0]?.texte);
    expect(moteurPlace.resume(etat).aideUtilisee).toBe('indice');
  });
});

// ─────────────────────────────────────────────── CONTRAT DE SORTIE du lot (§ 10.4)

describe('CONTRAT DE SORTIE — les 8 consignes « Dessine… » du niveau 1', () => {
  /** Toutes les consignes de type `place` des 15 fiches réellement ingérées. */
  const consignesPlace = readdirSync(join(RACINE_DEPOT, DOSSIER_BROUILLONS))
    .filter((nom) => nom.startsWith('fiche-') && nom.endsWith('.json'))
    .flatMap((nom) => {
      const fiche = JSON.parse(
        readFileSync(join(RACINE_DEPOT, DOSSIER_BROUILLONS, nom), 'utf8'),
      ) as { consignes?: { type?: string; texte?: string }[] };
      return (fiche.consignes ?? [])
        .filter((c) => c.type === 'place')
        .map((c) => ({ fichier: nom, texte: c.texte ?? '' }));
    });

  it('le manifeste en annonce 8, et le disque en porte 8', () => {
    const manifeste = lireJson<{ consignesParType: Record<string, number> }>(
      `${DOSSIER_BROUILLONS}/manifeste.json`,
    );
    // Deux comptes, et leur écart — jamais un seul (CLAUDE.md, audit par OBJET).
    expect(consignesPlace.length).toBe(manifeste.consignesParType['place']);
    expect(consignesPlace.length).toBe(8);
  });

  it('les 8 sont TOUTES couvertes : chacune porte une relation de `RelationSpatiale`', () => {
    const relations: readonly RelationSpatiale[] = [
      'dans', 'sur', 'sous', 'a-cote-de',
      'devant', 'derriere', 'entre', 'au-dessus', 'en-dessous',
    ];
    const couvertes = consignesPlace
      .map((c) => ({ ...c, relation: relationDeConsigne(c.texte) }))
      .filter((c) => c.relation !== null);

    console.log(
      `CONTRAT DE SORTIE L2-C n° 2 — consignes « Dessine… » du niveau 1 couvertes par place : ` +
        `${couvertes.length}/${consignesPlace.length}\n` +
        couvertes.map((c) => `  ${c.fichier} → ${c.relation!} : ${c.texte}`).join('\n'),
    );

    expect(couvertes.length).toBe(8);
    for (const c of couvertes) expect(relations).toContain(c.relation);
    // Au moins trois relations DISTINCTES : une couverture qui rendrait « dans » huit fois
    // ne prouverait pas que le moteur exerce la localisation spatiale.
    expect(new Set(couvertes.map((c) => c.relation)).size).toBeGreaterThanOrEqual(3);
  });
});

describe('SCHEMA_CONTENU_PLACE — le schéma publié par le moteur', () => {
  it('accepte le contenu réel et refuse une réserve sans intrus', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const valider = ajv.compile(SCHEMA_CONTENU_PLACE);

    expect(valider(contenu)).toBe(true);
    expect(valider({ ...contenu, reserve: [contenu.reserve[0]] })).toBe(false);
    expect(
      valider({
        ...contenu,
        zones: [{ ...contenu.zones[0], polygone: [[0, 0], [1, 1]] }],
      }),
    ).toBe(false);
  });
});
