/**
 * R11 et D45 sur le fichier réel — lot N6, contrat de finition v3 § 4.6 et § 9.2.
 *
 * Contrat de sortie de N6, deuxième et troisième chiffres :
 *   « **≥ 25** points gratuits, **≥ 10** animations uniques (R11) ».
 *
 * `campement-audit.test.ts` (L2-F) mesure déjà les trois seuils de R11 et reste en vigueur ;
 * ce fichier-ci ajoute ce qu'aucun test n'attrapait, et qui est le VRAI risque du lot N6 :
 *
 * 1. **D45 — le campement est CONSERVÉ tel quel.** N6 recâble les répliques sur les clés du
 *    manifeste de N2 ; un point perdu au passage ne se verrait pas dans un `>= 25`, puisque
 *    30 − 1 = 29 le passe encore. La liste des trente identifiants est donc écrite ici, en
 *    dur, comme un cliquet : c'est le seul moyen de distinguer « conservé » de « suffisant ».
 * 2. **La clé du manifeste, et non un chemin de fichier.** Le contrat v3 § 5.4 gèle la forme :
 *    « `campement/<idPoint>` pour une réplique ». Une clé qui ne suivrait pas cette forme ne
 *    résoudrait nulle part, `aUnAudio` rendrait `false`, D42 masquerait le bouton, et le
 *    campement redeviendrait muet — en silence.
 *
 * Le fichier est lu SUR DISQUE. Aucun point n'est fabriqué pour la circonstance.
 */
import { describe, expect, it } from 'vitest';

import {
  R11_ANIMATIONS_UNIQUES_MIN,
  R11_POINTS_MIN,
  R11_REPLIQUES_MIN,
  auditerCampement,
  campementDuDocument
} from '@partage/monde/campement.js';

import { lireJson } from '../configuration/preparation.js';

const CAMPEMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const POINTS = CAMPEMENT.points;

/**
 * Les TRENTE points livrés par L2-F, mesurés sur le fichier avant l'écriture de N6 :
 *
 *   $ node -e "console.log(require('./contenu/monde/campement.json').points.map(p=>p.id))"
 *
 * D45 : « le campement est CONSERVÉ tel quel, avec ses 25 interactions gratuites ». Aucun de
 * ces trente identifiants ne disparaît. En ajouter est permis ; en retirer ne l'est pas.
 */
const TRENTE_POINTS_DE_D45: readonly string[] = [
  'tente', 'feu', 'carte', 'coffre', 'mur-des-noms', 'chaudron', 'lunette', 'hamac-de-gobi',
  'banniere', 'carillon', 'marmite', 'tas-de-bois', 'seau', 'lanterne', 'corde-a-linge',
  'tabouret', 'panier-de-pommes', 'sac-de-graines', 'bocal-de-lucioles', 'livre-ouvert',
  'plume-et-encrier', 'galets-empiles', 'champignon', 'buisson', 'fleur-bleue', 'papillon',
  'escargot', 'grenouille', 'pierre-gravee', 'etoile-filante'
];

/** La forme gelée d'une clé de réplique — contrat v3 § 5.4, `CleAudio`. */
const FORME_CLE_REPLIQUE = /^campement\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;

describe('R11 — les 25 interactions gratuites, mesurées sur le fichier réel', () => {
  it('tient les trois seuils, et les imprime', () => {
    const audit = auditerCampement(POINTS);
    console.log(
      `[N6] campement : points=${String(audit.nbPoints)} ` +
        `animationsUniques=${String(audit.nbAnimationsUniques)} ` +
        `repliques=${String(audit.nbRepliques)} conforme=${String(audit.conforme)}`
    );
    expect(audit.manques).toEqual([]);
    expect(audit.nbPoints).toBeGreaterThanOrEqual(R11_POINTS_MIN);
    expect(audit.nbAnimationsUniques).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
    expect(audit.nbRepliques).toBeGreaterThanOrEqual(R11_REPLIQUES_MIN);
  });

  it('ne laisse aucun point muet — `reaction: "aucune"` n’est pas une interaction', () => {
    expect(POINTS.filter((point) => point.reaction === 'aucune').map((p) => p.id)).toEqual([]);
  });

  it('donne à chaque point une boîte d’au moins 64 unités de côté (R16)', () => {
    const trop_petits = POINTS.filter(({ zone }) => zone[2] < 64 || zone[3] < 64);
    expect(trop_petits.map((point) => point.id)).toEqual([]);
  });
});

describe('D45 — le campement est conservé tel quel, pas seulement « suffisant »', () => {
  it('porte encore les TRENTE identifiants livrés, sans en perdre un seul', () => {
    const presents = new Set(POINTS.map((point) => point.id));
    const disparus = TRENTE_POINTS_DE_D45.filter((id) => !presents.has(id));
    console.log(
      `[N6] D45 : ${String(TRENTE_POINTS_DE_D45.length)} points attendus, ` +
        `${String(POINTS.length)} présents, ${String(disparus.length)} disparu(s)`
    );
    expect(disparus).toEqual([]);
  });

  it('n’a aucun identifiant en double — deux points homonymes n’en font qu’un', () => {
    expect(new Set(POINTS.map((point) => point.id)).size).toBe(POINTS.length);
  });

  it('déclare toujours les six objets rapportés, un par région', () => {
    expect(CAMPEMENT.objets.length).toBeGreaterThanOrEqual(6);
    expect(new Set(CAMPEMENT.objets.map((objet) => objet.region)).size).toBe(
      CAMPEMENT.objets.length
    );
  });
});

describe('les répliques sont des CLÉS de manifeste, jamais des chemins de fichier', () => {
  it('donne une réplique à tout point dont la réaction est « replique », et à eux seuls', () => {
    const parlantsSansCle = POINTS.filter(
      (point) => point.reaction === 'replique' && point.replique === null
    );
    const muetsAvecCle = POINTS.filter(
      (point) => point.reaction !== 'replique' && point.replique !== null
    );
    expect(parlantsSansCle.map((point) => point.id)).toEqual([]);
    expect(muetsAvecCle.map((point) => point.id)).toEqual([]);
  });

  it('suit la forme gelée `campement/<idPoint>` du contrat v3 § 5.4', () => {
    const fautives = POINTS.filter(
      (point) => point.replique !== null && !FORME_CLE_REPLIQUE.test(String(point.replique))
    );
    expect(fautives.map((point) => `${point.id} → ${String(point.replique)}`)).toEqual([]);
  });

  it('dérive la clé de l’identifiant du point, sans exception ni raccourci', () => {
    const divergentes = POINTS.filter(
      (point) => point.replique !== null && String(point.replique) !== `campement/${point.id}`
    );
    expect(divergentes.map((point) => `${point.id} → ${String(point.replique)}`)).toEqual([]);
  });

  it('ne porte plus AUCUN chemin de fichier `.opus` — le manifeste seul résout', () => {
    const chemins = POINTS.filter((point) => String(point.replique ?? '').includes('.opus'));
    expect(chemins.map((point) => point.id)).toEqual([]);
  });

  it('n’attribue jamais deux fois la même clé — R11 compte des clips DISTINCTS', () => {
    const cles = POINTS.filter((point) => point.replique !== null).map((p) => String(p.replique));
    console.log(`[N6] clés de réplique : ${String(cles.length)} posées, ` +
      `${String(new Set(cles).size)} distinctes`);
    expect(new Set(cles).size).toBe(cles.length);
  });
});
