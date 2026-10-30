/**
 * Le calcul — premier jet (Docs/maths-calcul-premier-jet-2026-10-09.md).
 *
 * Ce que ces tests opposent à la logique pure de `partage/src/mathematiques/jeux/calcul/` :
 *   - les BORNES de chaque palier, d'après réf. 1.3 CE1 (Docs/reference-programmes-ce1-ce2.md) ;
 *   - le déterminisme (même graine, même partie) ;
 *   - la vérification CHIFFRE PAR CHIFFRE (§ 6 bis, Q5 = a) ;
 *   - la retenue qui s'écrit toute seule au palier 2 (§ 6 bis, Q4) ;
 *   - l'aide de Gobi gratuite, et l'absence de tout état d'échec (CLAUDE.md, R14).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import {
  PALIERS_CALCUL,
  PHRASES_CALCUL,
  aideCalcul,
  caseCourante,
  creerPartieCalcul,
  etoilesCalcul,
  genererEtape,
  jouerCalcul,
  phrasesIndicesPose,
  type EtapeCalcul,
  type EtatCalcul,
} from '../../../partage/src/mathematiques/jeux/calcul/index.js';

const unites = (n: number): number => n % 10;
const dizaines = (n: number): number => Math.floor(n / 10) % 10;

/** Joue la bonne réponse de l'étape courante, chiffre par chiffre. */
function jouerJuste(etat: EtatCalcul): EtatCalcul {
  let courant = etat;
  const index = etat.index;
  while (!courant.terminee && courant.index === index) {
    const cible = caseCourante(courant);
    if (cible === null) throw new Error('étape sans case à remplir');
    courant = jouerCalcul(courant, { type: 'chiffre', chiffre: cible.attendu });
  }
  return courant;
}

function mauvaisChiffre(etat: EtatCalcul): number {
  const cible = caseCourante(etat)!;
  return (cible.attendu + 1) % 10;
}

describe('calcul — les bornes des paliers (réf. 1.3 CE1)', () => {
  it('chaque palier cite sa ligne du référentiel', () => {
    for (const palier of Object.values(PALIERS_CALCUL)) {
      expect(palier.reference).toMatch(/^réf\. 1\.3 CE1 /u);
    }
  });

  it('gué, tables : a + b, a + ▢ = c, c − a = ▢, avec a et b de 2 à 9', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (graine) => {
      const etape = genererEtape('gue-tables', creerAlea(graine));
      if (etape.forme !== 'ligne') return false;
      const [a, b, c] = etape.termes;
      const juste = etape.operateur === '+' ? a + b === c : a - b === c;
      const operandes = etape.operateur === '+' ? [a, b] : [b, c];
      return juste && operandes.every((x) => x >= 2 && x <= 9) && Math.max(a, b, c) <= 18
        && etape.saisie === 'choix' && etape.termes[etape.trou] === etape.reponse;
    }), { numRuns: 400 });
  });

  it('gué, dizaines : on ajoute ou on enlève des dizaines entières, sans changer les unités, résultat de 10 à 99', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (graine) => {
      const etape = genererEtape('gue-dizaines', creerAlea(graine));
      if (etape.forme !== 'ligne') return false;
      const [a, b, c] = etape.termes;
      const juste = etape.operateur === '+' ? a + b === c : a - b === c;
      return juste && b % 10 === 0 && b >= 10 && unites(a) === unites(c)
        && c >= 10 && c <= 99 && a >= 10 && a <= 99 && etape.trou === 2 && etape.saisie === 'pave';
    }), { numRuns: 400 });
  });

  it('gué, neuf : + 9, + 19 ou − 9, toujours avec passage de la dizaine, résultat de 10 à 99', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (graine) => {
      const etape = genererEtape('gue-neuf', creerAlea(graine));
      if (etape.forme !== 'ligne') return false;
      const [a, b, c] = etape.termes;
      const juste = etape.operateur === '+' ? a + b === c : a - b === c;
      const passage = dizaines(a) !== dizaines(c) && Math.abs(dizaines(a) - dizaines(c)) === (etape.operateur === '+' ? Math.floor((b + 1) / 10) : 1);
      const permis = etape.operateur === '+' ? b === 9 || b === 19 : b === 9;
      return juste && permis && passage && c >= 10 && c <= 99 && etape.saisie === 'pave';
    }), { numRuns: 400 });
  });

  it('addition posée sans retenue : deux nombres à 2 chiffres, aucune colonne ne dépasse 9', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (graine) => {
      const etape = genererEtape('pose-sans-retenue', creerAlea(graine));
      if (etape.forme !== 'colonnes') return false;
      const { haut, bas, reponse } = etape;
      return haut >= 10 && haut <= 99 && bas >= 10 && bas <= 99 && haut >= bas && haut + bas === reponse
        && unites(haut) + unites(bas) <= 9 && dizaines(haut) + dizaines(bas) <= 9
        && etape.cases.every((c) => c.role === 'chiffre');
    }), { numRuns: 400 });
  });

  it('addition posée avec retenue : les unités font une retenue, montrée et posée toute seule ; somme ≤ 99', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffff_ffff }), (graine) => {
      const etape = genererEtape('pose-retenue-montree', creerAlea(graine));
      if (etape.forme !== 'colonnes') return false;
      const { haut, bas, reponse } = etape;
      const retenue = etape.cases.find((c) => c.role === 'retenue');
      return haut >= 10 && bas >= 10 && haut >= bas && haut + bas === reponse && reponse <= 99
        && unites(haut) + unites(bas) >= 10
        && retenue !== undefined && retenue.auto && retenue.attendu === 1 && retenue.colonne === 'd';
    }), { numRuns: 400 });
  });

  it('les choix : trois nombres distincts, positifs, dont la réponse', () => {
    for (let graine = 0; graine < 300; graine += 1) {
      const etape = genererEtape('gue-tables', creerAlea(graine));
      if (etape.forme !== 'ligne' || etape.choix === null) throw new Error('tables sans choix');
      expect(etape.choix).toHaveLength(3);
      expect(new Set(etape.choix).size).toBe(3);
      expect(etape.choix).toContain(etape.reponse);
      expect(etape.choix.every((n) => n >= 0)).toBe(true);
    }
  });
});

describe('calcul — les parties', () => {
  it('même graine, même partie', () => {
    for (const activite of ['gue', 'pose'] as const) {
      expect(creerPartieCalcul(activite, creerAlea(42))).toEqual(creerPartieCalcul(activite, creerAlea(42)));
    }
  });

  it('une traversée du gué : 12 égalités, 5 tables à choisir, puis 4 dizaines et 3 « neuf » au pavé, sans doublon', () => {
    for (let graine = 0; graine < 50; graine += 1) {
      const partie = creerPartieCalcul('gue', creerAlea(graine));
      expect(partie.etapes.map((e) => e.palier)).toEqual([
        ...Array<string>(5).fill('gue-tables'), ...Array<string>(4).fill('gue-dizaines'), ...Array<string>(3).fill('gue-neuf'),
      ]);
      expect(new Set(partie.etapes.map((e) => e.id)).size).toBe(12);
    }
  });

  it('une pierre à calcul : 4 additions posées, 2 sans retenue puis 2 avec la retenue montrée', () => {
    const partie = creerPartieCalcul('pose', creerAlea(7));
    expect(partie.etapes.map((e) => e.palier)).toEqual([
      'pose-sans-retenue', 'pose-sans-retenue', 'pose-retenue-montree', 'pose-retenue-montree',
    ]);
  });
});

describe('calcul — chiffre par chiffre, sans échec', () => {
  it('le gué se remplit de gauche à droite, l’addition posée des unités vers les dizaines', () => {
    const gue = creerPartieCalcul('gue', creerAlea(3));
    const dizaine = gue.etapes.find((e) => e.palier === 'gue-dizaines')!;
    expect(dizaine.cases.map((c) => c.attendu)).toEqual([dizaines(dizaine.reponse), unites(dizaine.reponse)]);
    const pose = creerPartieCalcul('pose', creerAlea(3));
    expect(pose.etapes[0]!.cases.map((c) => c.id)).toEqual(['resultat-u', 'resultat-d']);
    expect(pose.etapes[2]!.cases.map((c) => c.id)).toEqual(['resultat-u', 'retenue-d', 'resultat-d']);
  });

  it('un chiffre faux n’est pas posé, est compté, et ne fait jamais reculer', () => {
    const debut = jouerJuste(creerPartieCalcul('pose', creerAlea(11)));
    const avant = jouerCalcul(debut, { type: 'chiffre', chiffre: caseCourante(debut)!.attendu });
    const apres = jouerCalcul(avant, { type: 'chiffre', chiffre: mauvaisChiffre(avant) });
    expect(apres.index).toBe(avant.index);
    expect(apres.saisies).toEqual(avant.saisies);
    expect(apres.erreursTotal).toBe(avant.erreursTotal + 1);
    expect(apres.retour?.type).toBe('pas-encore');
    expect(apres.terminee).toBe(false);
  });

  it('au palier 2, la retenue s’écrit toute seule dès que les unités sont justes, et Gobi la montre', () => {
    let etat = creerPartieCalcul('pose', creerAlea(5));
    etat = jouerJuste(jouerJuste(etat));
    const etape = etat.etapes[etat.index]! as Extract<EtapeCalcul, { forme: 'colonnes' }>;
    etat = jouerCalcul(etat, { type: 'chiffre', chiffre: unites(etape.reponse) });
    expect(etat.saisies['retenue-d']).toBe(1);
    expect(etat.retour?.type).toBe('retenue-posee');
    expect(caseCourante(etat)?.id).toBe('resultat-d');
  });

  it('un choix juste remplit toute la réponse ; un choix faux est gardé en mémoire de l’étape, sans rien retirer', () => {
    let etat = creerPartieCalcul('gue', creerAlea(9));
    const etape = etat.etapes[0]!;
    if (etape.forme !== 'ligne' || etape.choix === null) throw new Error('attendu : tables à choisir');
    const faux = etape.choix.find((n) => n !== etape.reponse)!;
    etat = jouerCalcul(etat, { type: 'choix', valeur: faux });
    expect(etat.choixEssayes).toEqual([faux]);
    expect(etat.retour?.type).toBe('pas-encore');
    etat = jouerCalcul(etat, { type: 'choix', valeur: etape.reponse });
    expect(etat.index).toBe(1);
    expect(etat.retour?.type).toBe('etape-reussie');
    expect(etat.choixEssayes).toEqual([]);
  });

  it('le clavier marche aussi aux niveaux à choisir : les chiffres de la réponse, dans l’ordre', () => {
    const etat = creerPartieCalcul('gue', creerAlea(13));
    expect(jouerJuste(etat).index).toBe(1);
  });

  it('l’aide arrive seule après 2 erreurs (indice) puis 3 (démonstration), et la démonstration montre la bonne touche', () => {
    let etat = creerPartieCalcul('pose', creerAlea(17));
    expect(aideCalcul(etat)).toBeNull();
    etat = jouerCalcul(etat, { type: 'chiffre', chiffre: mauvaisChiffre(etat) });
    expect(etat.aideEtape).toBe('aucune');
    etat = jouerCalcul(etat, { type: 'chiffre', chiffre: mauvaisChiffre(etat) });
    expect(etat.aideEtape).toBe('indice');
    expect(aideCalcul(etat)?.texte).toMatch(/plus/u);
    etat = jouerCalcul(etat, { type: 'chiffre', chiffre: mauvaisChiffre(etat) });
    expect(etat.aideEtape).toBe('demonstration');
    expect(aideCalcul(etat)?.toucheMontree).toBe(caseCourante(etat)!.attendu);
  });

  it('l’aide demandée monte d’un palier, ne coûte que l’étoile « sans aide », et repart à zéro à l’étape suivante', () => {
    let etat = creerPartieCalcul('gue', creerAlea(19));
    etat = jouerCalcul(etat, { type: 'aide' });
    expect(etat.aideEtape).toBe('indice');
    etat = jouerCalcul(etat, { type: 'aide' });
    expect(etat.aideEtape).toBe('demonstration');
    etat = jouerJuste(etat);
    expect(etat.aideEtape).toBe('aucune');
    expect(etat.aidePartie).toBe('demonstration');
    while (!etat.terminee) etat = jouerJuste(etat);
    expect(etoilesCalcul(etat)).toBe(2);
  });

  it('trois étoiles sans aide ni erreur ; une partie se finit toujours sur une réussite', () => {
    let etat = creerPartieCalcul('pose', creerAlea(23));
    while (!etat.terminee) etat = jouerJuste(etat);
    expect(etoilesCalcul(etat)).toBe(3);
    expect(etat.retour?.type).toBe('partie-reussie');
  });

  it('propriété : n’importe quelle suite de gestes ne retire jamais un chiffre posé ni ne recule ; la bonne réponse finit toujours', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 0xffff_ffff }),
      fc.constantFrom('gue' as const, 'pose' as const),
      fc.array(fc.oneof(
        fc.record({ type: fc.constant('chiffre' as const), chiffre: fc.integer({ min: 0, max: 9 }) }),
        fc.record({ type: fc.constant('choix' as const), valeur: fc.integer({ min: 0, max: 30 }) }),
        fc.record({ type: fc.constant('aide' as const) }),
      ), { maxLength: 60 }),
      (graine, activite, gestes) => {
        let etat = creerPartieCalcul(activite, creerAlea(graine));
        for (const geste of gestes) {
          const suivant = jouerCalcul(etat, geste);
          if (suivant.index < etat.index) return false;
          if (suivant.index === etat.index) {
            for (const [cle, valeur] of Object.entries(etat.saisies)) if (suivant.saisies[cle] !== valeur) return false;
          }
          etat = suivant;
        }
        while (!etat.terminee) etat = jouerJuste(etat);
        return etoilesCalcul(etat) >= 1 && etat.retour?.type === 'partie-reussie';
      },
    ), { numRuns: 200 });
  });

  it('après la fin, plus rien ne bouge', () => {
    let etat = creerPartieCalcul('pose', creerAlea(29));
    while (!etat.terminee) etat = jouerJuste(etat);
    expect(jouerCalcul(etat, { type: 'chiffre', chiffre: 3 })).toBe(etat);
  });
});

describe('calcul — ce que dit Gobi', () => {
  const toutes = (): readonly string[] => [
    ...Object.values(PHRASES_CALCUL).map((p) => p.texte),
    ...phrasesIndicesPose().map((p) => p.texte),
  ];

  it('jamais « non », « faux », « erreur » ni « raté »', () => {
    for (const texte of toutes()) expect(texte).not.toMatch(/\b(non|faux|fausse|erreur|raté|perdu)\b/iu);
  });

  it('chaque phrase a sa clé de clip, unique, dans maths-calcul/', () => {
    const cles = [...Object.values(PHRASES_CALCUL), ...phrasesIndicesPose()].map((p) => p.cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const cle of cles) expect(cle).toMatch(/^maths-calcul\//u);
  });

  it('les indices de l’addition posée sont des phrases entières, en nombre fini (faits de 0 à 9, avec et sans retenue)', () => {
    expect(phrasesIndicesPose()).toHaveLength(200);
    expect(phrasesIndicesPose().map((p) => p.texte)).toContain('Cinq plus sept.');
    expect(phrasesIndicesPose().map((p) => p.texte)).toContain('Un plus quatre, plus la retenue.');
  });

  it('l’indice d’une colonne est la phrase de son fait', () => {
    let etat = creerPartieCalcul('pose', creerAlea(31));
    etat = jouerCalcul(etat, { type: 'aide' });
    const etape = etat.etapes[0]! as Extract<EtapeCalcul, { forme: 'colonnes' }>;
    const aide = aideCalcul(etat)!;
    const attendue = phrasesIndicesPose().find((p) => p.cle === `maths-calcul/fait/${String(unites(etape.haut))}+${String(unites(etape.bas))}`);
    expect(aide.texte).toBe(attendue?.texte);
    expect(aide.cle).toBe(attendue?.cle);
  });
});
