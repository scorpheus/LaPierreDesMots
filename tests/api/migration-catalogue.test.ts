/**
 * LA MIGRATION DE CONTENU COMME SCÉNARIO DE TEST PERMANENT — lot H3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE RECETTE DOIT RESTER
 *
 * Le contenu de ce jeu grandira encore, et **il grandira toujours après que l'enfant aura
 * joué**. C'est la seule certitude de son cycle de vie : la Clairière est passée de 1 à 6
 * nœuds, les Galeries de 2 à 12, et le père a découvert le défaut le lendemain.
 *
 * Une suite qui ne teste que des bases neuves ne verra jamais ça. Celle-ci fait le geste
 * exact : **on joue sur un catalogue réduit, on agrandit le catalogue, on relit tout.**
 *
 * Trois découpages, parce qu'un seul aurait été une anecdote :
 *   A — le jour d'Ezékiel : 1 nœud en Clairière, 2 aux Galeries ;
 *   B — une région gagne ses TOUT PREMIERS nœuds (Galeries à 0, puis 12) ;
 *   C — chaque région double (3 et 6, puis 6 et 12).
 *
 * Dans les trois, l'enfant a terminé 100 % de ce que le catalogue déclarait ce jour-là. C'est
 * ce qui rend le piège si facile à tendre : à cet instant, tout était juste.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── LES QUATRE PROPRIÉTÉS QU'UNE LIVRAISON DE CONTENU NE DOIT JAMAIS CASSER ──────────────
 *   1. aucune étoile ne se perd ;
 *   2. aucun Éclat obtenu ne se reprend (R14 — c'est un trophée, pas un verrou) ;
 *   3. le pourcentage de recoloration correspond au contenu COURANT, pas à celui d'hier ;
 *   4. **l'enfant peut faire quelque chose** — au moins une sortie qui répond.
 */

import { describe, expect, it } from 'vitest';

import {
  changerDeCatalogue,
  creerProfil,
  jouerNoeud,
  lireMondeHttp,
  lireProgressionHttp,
  monterAtelier,
  noeudsDeLaRegion,
  referentielTronque,
  sortiesQuiRepondent
} from '../fixtures/profils-vecus/atelier-vecu.js';
import type { AtelierVecu } from '../fixtures/profils-vecus/atelier-vecu.js';

/** Un découpage du catalogue, tel qu'il existait un jour donné. */
interface Decoupage {
  readonly code: string;
  readonly libelle: string;
  readonly noeudsParRegion: Readonly<Record<string, number>>;
}

const DECOUPAGES: readonly Decoupage[] = [
  {
    code: 'A',
    libelle: 'le jour d’Ezékiel — 1 nœud en Clairière, 2 aux Galeries',
    noeudsParRegion: { clairiere: 1, galeries: 2 }
  },
  {
    code: 'B',
    libelle: 'les Galeries n’avaient encore aucun nœud',
    noeudsParRegion: { clairiere: 6, galeries: 0 }
  },
  {
    code: 'C',
    libelle: 'chaque région a doublé — 3 et 6, puis 6 et 12',
    noeudsParRegion: { clairiere: 3, galeries: 6 }
  }
];

interface EtatAvant {
  readonly atelier: AtelierVecu;
  readonly profil: string;
  readonly noeudsJoues: readonly string[];
  readonly etoilesParNoeud: ReadonlyMap<string, number>;
  readonly eclats: ReadonlySet<string>;
}

/**
 * Joue TOUT ce que le catalogue réduit déclare, puis relève l'état avant migration.
 *
 * L'enfant termine intégralement le contenu du jour : c'est le cas où le défaut est invisible
 * — la carte est juste, la base est juste, et elle deviendra fausse sans que rien ne bouge.
 */
async function jouerToutLeCatalogueReduit(decoupage: Decoupage): Promise<EtatAvant> {
  const atelier = await monterAtelier({ noeudsParRegion: decoupage.noeudsParRegion });
  const profil = await creerProfil(atelier, 'Ezékiel');

  const reduit = referentielTronque(decoupage.noeudsParRegion);
  const noeudsJoues: string[] = [];
  for (const region of reduit.regions) {
    for (const noeud of region.noeuds) {
      await jouerNoeud(atelier, profil, String(noeud));
      atelier.horloge.avancer({ minutes: 5 });
      noeudsJoues.push(String(noeud));
    }
  }

  // La lecture de la carte est ce qui FIGE la projection. Sans elle, l'état de la base ne
  // serait pas celui d'un enfant qui a regardé son monde — donc pas l'état réel.
  const monde = await lireMondeHttp(atelier, profil);
  const progression = await lireProgressionHttp(atelier, profil);

  return {
    atelier,
    profil,
    noeudsJoues,
    etoilesParNoeud: new Map(
      progression.map((ligne) => [String(ligne.noeud), Number(ligne.etoiles)])
    ),
    eclats: new Set(
      monde.carte.regions
        .filter((region) => region.eclatObtenuLe !== null)
        .map((region) => String(region.region))
    )
  };
}

describe.each(DECOUPAGES)('migration de contenu — découpage $code : $libelle', (decoupage) => {
  it('avant migration : l’enfant a terminé 100 % de ce que le catalogue déclarait', async () => {
    const avant = await jouerToutLeCatalogueReduit(decoupage);
    try {
      const monde = await lireMondeHttp(avant.atelier, avant.profil);
      for (const region of monde.carte.regions) {
        const declares = avant.atelier.referentiel.regions.find(
          (entree) => String(entree.region) === String(region.region)
        );
        if ((declares?.noeuds.length ?? 0) > 0) {
          expect(region.pourcentageColorie, `région ${String(region.region)}`).toBe(1);
        }
      }
      expect(await lireProgressionHttp(avant.atelier, avant.profil)).toHaveLength(
        avant.noeudsJoues.length
      );
    } finally {
      await avant.atelier.fermer();
    }
  });

  it('après migration : aucune étoile perdue, aucun Éclat repris (R14)', async () => {
    const avant = await jouerToutLeCatalogueReduit(decoupage);
    const apres = await changerDeCatalogue(avant.atelier);
    try {
      const monde = await lireMondeHttp(apres, avant.profil);
      const progression = await lireProgressionHttp(apres, avant.profil);

      expect(progression).toHaveLength(avant.noeudsJoues.length);
      for (const ligne of progression) {
        expect(
          Number(ligne.etoiles),
          `étoiles du nœud ${String(ligne.noeud)}`
        ).toBe(avant.etoilesParNoeud.get(String(ligne.noeud)));
      }

      const eclatsApres = new Set(
        monde.carte.regions
          .filter((region) => region.eclatObtenuLe !== null)
          .map((region) => String(region.region))
      );
      for (const region of avant.eclats) {
        expect(eclatsApres.has(region), `Éclat de ${region} repris`).toBe(true);
      }
    } finally {
      await apres.fermer();
    }
  });

  it('après migration : le pourcentage suit le contenu COURANT, pas celui d’hier', async () => {
    const avant = await jouerToutLeCatalogueReduit(decoupage);
    const apres = await changerDeCatalogue(avant.atelier);
    try {
      const monde = await lireMondeHttp(apres, avant.profil);
      const joues = new Set(avant.noeudsJoues);

      for (const region of monde.carte.regions) {
        const declares = noeudsDeLaRegion(String(region.region));
        if (declares.length === 0) {
          continue;
        }
        const faits = declares.filter((noeud) => joues.has(noeud)).length;
        expect(
          region.pourcentageColorie,
          `recoloration de ${String(region.region)} : ${String(faits)}/${String(declares.length)}`
        ).toBeCloseTo(faits / declares.length, 10);
      }
    } finally {
      await apres.fermer();
    }
  });

  /**
   * L'INVARIANT, posé sur le geste qui l'a cassé.
   *
   * Une livraison de contenu ne doit JAMAIS laisser un enfant sans rien à faire. C'est le
   * sens même d'une livraison : il y a plus à jouer qu'avant.
   */
  it('après migration : L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const avant = await jouerToutLeCatalogueReduit(decoupage);
    const apres = await changerDeCatalogue(avant.atelier);
    try {
      const sorties = await sortiesQuiRepondent(apres, avant.profil);
      expect(sorties.length, 'aucune sortie après la livraison de contenu').toBeGreaterThan(0);
    } finally {
      await apres.fermer();
    }
  });

  it('après migration : la carte propose le premier nœud NON joué, pas un déjà terminé', async () => {
    const avant = await jouerToutLeCatalogueReduit(decoupage);
    const apres = await changerDeCatalogue(avant.atelier);
    try {
      const joues = new Set(avant.noeudsJoues);
      for (const sortie of await sortiesQuiRepondent(apres, avant.profil)) {
        expect(joues.has(sortie.noeud), `le nœud proposé ${sortie.noeud} est déjà terminé`).toBe(
          false
        );
      }
    } finally {
      await apres.fermer();
    }
  });
});

// ═══════════════════════════════ le cas symétrique : un nœud RETIRÉ du référentiel

describe('un nœud retiré du référentiel — l’erreur d’exploitation symétrique', () => {
  /**
   * Le contenu ne fait pas que grandir : un identifiant renommé, un nœud retiré de
   * `contenu/monde/regions.json`, et la carte se retrouve à décrire un monde plus petit que
   * le journal. `recalculerRecoloration` promet qu'« une région dont on retirerait un nœud du
   * référentiel ne verrait pas la carte se dépeindre sous les yeux de l'enfant » : on ne le
   * suppose pas, on le joue.
   */
  it('ne perd aucune étoile et ne bloque pas l’enfant', async () => {
    // ⚠ LES TROIS NOMBRES DE CE CAS ÉTAIENT ÉCRITS EN DUR — `9` nœuds joués, un catalogue
    // rétréci à `{ clairiere: 6, galeries: 8 }`. Ils tenaient tant que la Clairière portait
    // six nœuds. Ils se DÉDUISENT maintenant du contenu livré : ce qui doit rester vrai n'est
    // pas leur valeur, c'est que le catalogue RÉTRÉCISSE vraiment sous un état déjà écrit.
    const dansLaClairiere = noeudsDeLaRegion('clairiere').length;
    const galeriesJouees = 3;
    const joues = dansLaClairiere + galeriesJouees;
    const retrait = {
      clairiere: Math.max(2, Math.floor(dansLaClairiere / 2)),
      galeries: Math.max(2, noeudsDeLaRegion('galeries').length - 4)
    };

    const grand = await monterAtelier();
    const profil = await creerProfil(grand, 'Ezékiel');
    for (const noeud of noeudsDeLaRegion('clairiere')) {
      await jouerNoeud(grand, profil, noeud);
      grand.horloge.avancer({ minutes: 4 });
    }
    for (const noeud of noeudsDeLaRegion('galeries').slice(0, galeriesJouees)) {
      await jouerNoeud(grand, profil, noeud);
      grand.horloge.avancer({ minutes: 4 });
    }
    await lireMondeHttp(grand, profil);

    // Le rétrécissement doit être RÉEL, sinon le cas ne joue plus la migration qu'il prétend
    // jouer : on l'exige avant de remonter, pas après.
    expect(retrait.clairiere, 'la Clairière ne rétrécit pas').toBeLessThan(dansLaClairiere);
    expect(retrait.galeries, 'les Galeries ne rétrécissent pas').toBeLessThan(
      noeudsDeLaRegion('galeries').length
    );

    const retreci = await changerDeCatalogue(grand, retrait);
    try {
      expect(await lireProgressionHttp(retreci, profil)).toHaveLength(joues);
      const monde = await lireMondeHttp(retreci, profil);
      const clairiere = monde.carte.regions.find((region) => region.region === 'clairiere');
      expect(clairiere?.pourcentageColorie).toBe(1);
      expect(clairiere?.eclatObtenuLe).not.toBeNull();

      const sorties = await sortiesQuiRepondent(retreci, profil);
      expect(sorties.length, 'aucune sortie après un retrait de contenu').toBeGreaterThan(0);
    } finally {
      await retreci.fermer();
    }
  });
});
