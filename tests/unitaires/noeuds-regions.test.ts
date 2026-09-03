/**
 * LE GARDE DU CROISEMENT `regions.json` × `contenu/noeuds/**` — lot A2.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER PROUVE, ET POURQUOI IL LE PROUVE EN DEUX TEMPS
 *
 * Le défaut gardé ici a été mesuré TROIS fois, et il est réapparu deux fois après correction :
 *
 *   contrat de finition v3 § 1.5   1 nœud cité  /  5 livrés   → 4 invisibles
 *   après la livraison de N8       7 nœuds cités / 12 livrés   → 5 invisibles
 *   au lot A2 (aujourd'hui)       12 nœuds cités / 12 livrés   → écart nul
 *
 * Un nœud livré et non cité par `contenu/monde/regions.json` est **du contenu mort** : la
 * carte ne l'atteint pas, la reprise ne le propose pas, et il ne compte pas dans le
 * pourcentage de recoloration — donc la région ne peut jamais atteindre 100 %. C'est le « dans
 * la clairière je n'ai eu qu'un exercice, est-ce normal ? » du père.
 *
 * ── PREMIER TEMPS : LE GARDE SE DÉCLENCHE. ────────────────────────────────────────────────
 * `croiserNoeudsEtRegions` est PUR — les documents arrivent déjà analysés. On peut donc lui
 * soumettre **l'état historique cassé, à l'identique**, et exiger qu'il le refuse, sans jamais
 * toucher un fichier du dépôt. Un garde qu'on n'a pas vu se déclencher n'est pas un garde,
 * c'est une décoration : les cas ci-dessous seraient verts pour n'importe quelle fonction qui
 * rendrait « aucune anomalie » si on ne lui opposait que le dépôt sain d'aujourd'hui.
 *
 * ── SECOND TEMPS : LE DÉPÔT RÉEL EST SAIN. ────────────────────────────────────────────────
 * Le dernier `describe` lit les VRAIS fichiers et exige l'écart nul dans les deux sens. C'est
 * lui qui échouera le jour où un lot livrera un septième nœud de Clairière sans le déclarer.
 *
 * ── CE FICHIER NE REMPLACE PAS `ids-regions-stables.test.ts` ──────────────────────────────
 * Le lot N7 y croise déjà les deux populations, et ces cas restent en place. Ce qui manquait
 * est ailleurs : `npm run test:contenu` — **la commande que l'agent générateur de contenu
 * exécute avant de déposer un brouillon** (annexe T § T1), donc au moment exact où le défaut
 * naît — n'ouvrait AUCUN fichier de `contenu/noeuds/`. Mesuré, sortie citée :
 *
 *   $ grep -n "noeud" scripts/test-contenu.mjs
 *   358,359,360,361,362,363,364   (une variable locale du parcours SVG)
 *
 * Le module testé ici est celui que `test:contenu` appelle désormais. Ce fichier garde donc le
 * GARDE, ce que ne fait aucun autre test du dépôt.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';

import { REGLES, croiserNoeudsEtRegions, resumerCroisement } from '../../scripts/verifier-noeuds-regions.mjs';
import { fichiersSous } from '../../scripts/verifier-regions-fermees.mjs';
import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

// ────────────────────────────────────────────────────────────────────── formes du croisement

interface Anomalie {
  readonly regle: string;
  readonly ou: string;
  readonly message: string;
}
interface Croisement {
  readonly nbRegions: number;
  readonly nbNoeudsSurDisque: number;
  readonly nbNoeudsCites: number;
  readonly ecart: number;
  readonly parRegion: ReadonlyArray<{
    readonly region: string;
    readonly cites: number;
    readonly surDisque: number;
    readonly ecart: number;
  }>;
  readonly anomalies: readonly Anomalie[];
}

interface NoeudSurDisque {
  readonly id: string;
  readonly region: string;
  readonly ordre: number;
  readonly exercice: string;
}

const croiser = croiserNoeudsEtRegions as (entree: {
  documentRegions: unknown;
  noeuds: ReadonlyArray<{ chemin: string; donnees: unknown }>;
  exercices?: ReadonlySet<string>;
}) => Croisement;

const regles = REGLES as Readonly<Record<string, string>>;

/** Les règles levées, triées — on nomme, on ne compte pas. */
const declenchees = (rapport: Croisement): readonly string[] =>
  [...new Set(rapport.anomalies.map((anomalie) => anomalie.regle))].sort();

// ═══════════════════════════════════════════ premier temps : le garde se déclenche vraiment

describe('le garde refuse l’état historique, celui-là même qui est réapparu deux fois', () => {
  /**
   * Les DOUZE nœuds livrés, tels qu'ils existent aujourd'hui. Lus sur disque : recopier
   * douze identifiants en littéral ferait de ce fichier une seconde source de vérité, qui
   * périmerait à la première livraison de contenu.
   */
  const noeudsLivres = (fichiersSous(`${RACINE_DEPOT}contenu/noeuds`, '.json') as string[]).map(
    (absolu) => {
      const chemin = absolu.slice(RACINE_DEPOT.length).split('\\').join('/');
      return { chemin, donnees: lireJson<NoeudSurDisque>(chemin) };
    }
  );

  const idsLivres = noeudsLivres.map((noeud) => noeud.donnees.id).sort();
  const nbNoeudsDeProgression = noeudsLivres.filter(
    (noeud) => (noeud.donnees as NoeudSurDisque & { readonly progression?: boolean }).progression !== false
  ).length;

  /** Le document RÉEL, lu sur disque. */
  const documentReel = lireJson<{
    regions: ReadonlyArray<{ region: string; noeuds: readonly string[] }>;
  }>('contenu/monde/regions.json');

  /** Une copie du document où l'on peut casser une région sans toucher au dépôt. */
  const documentAvec = (
    remplacer: (region: { region: string; noeuds: readonly string[] }) => readonly string[]
  ): unknown => ({
    regions: documentReel.regions.map((region) => ({ ...region, noeuds: remplacer(region) }))
  });

  it('la mesure trouve bien deux populations à croiser', () => {
    // Sans ce cas, « aucune anomalie » pourrait vouloir dire « aucun fichier lu » : c'est
    // exactement la façon dont un contrôle meurt sans que personne ne le remarque.
    expect(noeudsLivres.length).toBeGreaterThanOrEqual(7);
    expect(documentReel.regions.length).toBe(6);
  });

  it('« clairiere-01 » seul, comme au § 1.5 : les onze autres nœuds sont dénoncés un à un', () => {
    // L'état exact du contrat de finition v3 § 1.5, transposé aux douze nœuds d'aujourd'hui.
    // C'est le défaut que ce lot devait rendre impossible.
    const rapport = croiser({
      documentRegions: documentAvec((region) =>
        region.region === 'clairiere' ? ['clairiere-01'] : []
      ),
      noeuds: noeudsLivres
    });

    const invisibles = rapport.anomalies
      .filter((anomalie) => anomalie.regle === regles['NOEUD_INVISIBLE'])
      .map((anomalie) => anomalie.ou);

    expect(invisibles).toHaveLength(nbNoeudsDeProgression - 1);
    expect(rapport.nbNoeudsCites).toBe(1);
    expect(rapport.nbNoeudsSurDisque).toBe(nbNoeudsDeProgression);
    expect(rapport.ecart).toBe(1 - nbNoeudsDeProgression);
  });

  it('les six nœuds des Galeries omis : l’écart est nommé région par région', () => {
    // Le second visage du même défaut, celui de la livraison de N8 : la Clairière est à jour,
    // les Galeries sont complètes sur disque et absentes du document.
    const rapport = croiser({
      documentRegions: documentAvec((region) => (region.region === 'galeries' ? [] : region.noeuds)),
      noeuds: noeudsLivres
    });

    expect(declenchees(rapport)).toEqual([regles['NOEUD_INVISIBLE']]);

    const galeries = rapport.parRegion.find((region) => region.region === 'galeries');
    expect(galeries?.cites).toBe(0);
    expect(galeries?.surDisque).toBeGreaterThanOrEqual(4);
    expect(galeries?.ecart).toBe(-(galeries?.surDisque ?? 0));
  });

  it('un nœud fantôme est refusé : il gonfle le dénominateur et la région reste incomplète', () => {
    const rapport = croiser({
      documentRegions: documentAvec((region) =>
        region.region === 'clairiere' ? [...region.noeuds, 'clairiere-99'] : region.noeuds
      ),
      noeuds: noeudsLivres
    });

    expect(declenchees(rapport)).toEqual([regles['NOEUD_FANTOME']]);
    expect(rapport.ecart).toBe(1);
  });

  it('un nœud cité par la mauvaise région est refusé : il recolorierait l’autre région', () => {
    const emprunte = String(
      documentReel.regions.find((region) => region.region === 'clairiere')?.noeuds[0]
    );
    const rapport = croiser({
      documentRegions: documentAvec((region) =>
        region.region === 'galeries' ? [...region.noeuds, emprunte] : region.noeuds
      ),
      noeuds: noeudsLivres
    });

    expect(declenchees(rapport)).toEqual(
      [regles['NOEUD_CITE_DEUX_FOIS'], regles['NOEUD_MAL_ATTRIBUE']].sort()
    );
  });

  it('un nœud cité DEUX FOIS est refusé, même sans aucun autre écart', () => {
    // Le décompte total ne suffirait pas à le voir de l'autre côté : il n'y a ni nœud manquant
    // ni nœud en trop sur disque. Seule la citation en double abaisse la part de chaque nœud.
    const rapport = croiser({
      documentRegions: documentAvec((region) =>
        region.region === 'clairiere' ? [...region.noeuds, String(region.noeuds[0])] : region.noeuds
      ),
      noeuds: noeudsLivres
    });

    expect(declenchees(rapport)).toEqual([regles['NOEUD_CITE_DEUX_FOIS']]);
    expect(rapport.nbNoeudsSurDisque).toBe(nbNoeudsDeProgression);
  });

  it('un nœud qui invente une septième région est refusé', () => {
    const rapport = croiser({
      documentRegions: documentAvec((region) => region.noeuds),
      noeuds: [
        ...noeudsLivres,
        {
          chemin: 'contenu/noeuds/vallee-des-rois-01.json',
          donnees: {
            id: 'vallee-des-rois-01',
            region: 'vallee-des-rois',
            ordre: 1,
            exercice: 'clairiere-ecole-01'
          }
        }
      ]
    });

    expect(declenchees(rapport)).toEqual(
      [regles['NOEUD_INVISIBLE'], regles['REGION_INCONNUE']].sort()
    );
  });

  it('un nœud qui cite un exercice absent est refusé : atteignable et rien à jouer', () => {
    const rapport = croiser({
      documentRegions: documentAvec((region) => region.noeuds),
      noeuds: noeudsLivres,
      exercices: new Set<string>()
    });

    expect(declenchees(rapport)).toEqual([regles['EXERCICE_ABSENT']]);
    expect(rapport.anomalies).toHaveLength(nbNoeudsDeProgression);
  });

  it('deux nœuds au même rang dans une région sont refusés : la reprise deviendrait arbitraire', () => {
    const premier = noeudsLivres[0]!;
    const rapport = croiser({
      documentRegions: documentAvec((region) =>
        region.region === premier.donnees.region ? [...region.noeuds, 'clairiere-jumeau'] : region.noeuds
      ),
      noeuds: [
        ...noeudsLivres,
        {
          chemin: 'contenu/noeuds/clairiere-jumeau.json',
          donnees: { ...premier.donnees, id: 'clairiere-jumeau' }
        }
      ]
    });

    expect(declenchees(rapport)).toEqual([regles['ORDRE_AMBIGU']]);
  });

  it('une population vide est une ABSENCE, pas une réussite', () => {
    // Sans cette règle, effacer `contenu/noeuds/` rendrait le contrôle vert : tous les autres
    // croisements portent sur l'ensemble vide.
    const rapport = croiser({ documentRegions: { regions: [] }, noeuds: [] });
    expect(declenchees(rapport)).toEqual([regles['POPULATION_VIDE']]);
  });
});

// ═════════════════════════════════════════════ second temps : le dépôt réel, écart nul

describe('le dépôt réel : aucun nœud invisible, aucun nœud fantôme', () => {
  const rapport = croiser({
    documentRegions: lireJson('contenu/monde/regions.json'),
    noeuds: (fichiersSous(`${RACINE_DEPOT}contenu/noeuds`, '.json') as string[]).map((absolu) => {
      const chemin = absolu.slice(RACINE_DEPOT.length).split('\\').join('/');
      return { chemin, donnees: lireJson<NoeudSurDisque>(chemin) };
    }),
    exercices: new Set(
      (fichiersSous(`${RACINE_DEPOT}contenu/exercices`, '.json') as string[]).map((absolu) =>
        String(
          lireJson<{ id: string }>(absolu.slice(RACINE_DEPOT.length).split('\\').join('/')).id
        )
      )
    )
  });

  it('ne lève AUCUNE anomalie — et les nomme si elle en lève une', () => {
    expect(rapport.anomalies.map((anomalie) => `${anomalie.regle} — ${anomalie.ou}`)).toEqual([]);
  });

  it('les deux comptes sont égaux, et l’écart est nul', () => {
    expect(rapport.nbNoeudsSurDisque).toBe(rapport.nbNoeudsCites);
    expect(rapport.ecart).toBe(0);
  });

  it('chaque région a autant de nœuds cités que de nœuds livrés', () => {
    for (const region of rapport.parRegion) {
      expect(region.ecart, `${region.region} : ${String(region.cites)} cité(s) pour ${String(region.surDisque)} livré(s)`).toBe(0);
    }
  });

  it('le résumé imprimé par `test:contenu` porte les DEUX comptes', () => {
    // Un rapport qui ne dirait rien tant que rien ne casse ne permettrait jamais de vérifier
    // qu'il mesure quelque chose. Le résumé nomme les deux populations, toujours.
    const resume = (resumerCroisement as (r: Croisement) => string)(rapport);
    expect(resume).toContain(`${String(rapport.nbNoeudsCites)} nœud(s) cité(s)`);
    expect(resume).toContain(`${String(rapport.nbNoeudsSurDisque)} livré(s) sur disque`);
    expect(resume).toContain('écart 0');
  });
});
