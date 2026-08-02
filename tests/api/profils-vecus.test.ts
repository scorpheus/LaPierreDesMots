/**
 * Les profils VÉCUS et l'invariant « l'enfant peut faire quelque chose » — lot H3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER REPROCHE À TOUTE LA QA QUI LE PRÉCÈDE
 *
 * 1478 tests unitaires, 186 E2E, 226 contrôles de contenu — et un enfant bloqué. La raison
 * est unique et elle est structurelle : **la QA teste un logiciel neuf, jamais un logiciel
 * vécu.** Chaque suite crée une base vierge, joue, vérifie, jette. Aucune ne rencontre un
 * profil dont l'état a été écrit par une version antérieure du contenu — c'est-à-dire l'état
 * de tout joueur au bout de deux semaines.
 *
 * C'est la même famille d'erreur que D48 (« compter les éléments interactifs n'est pas
 * compter les sorties ») : on teste ce qui est facile à mettre en place, pas ce qui arrive.
 *
 * Ce fichier monte cinq profils qui ont un PASSÉ et leur pose une seule question, la seule
 * qui compte : **est-ce que l'enfant peut faire quelque chose ?**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── UN CAS EST ROUGE À L'ÉCRITURE, ET C'EST LE COMPORTEMENT VOULU ────────────────────────
 * Annexe T § 6 : « Correction de bug — terminé quand un test qui reproduit le bug est écrit
 * AVANT le correctif. »
 *
 *   • `catalogue-agrandi` — le défaut que le père a rencontré. Il était rouge à la première
 *     exécution de ce fichier, il est vert depuis que H1 a rendu (`enCours` regarde la
 *     recoloration et non plus l'Éclat ; `pourcentage_colorie` a cessé de s'écrire en MAX).
 *     Ce cas reste le filet permanent de cette réparation.
 *
 *   • `tout-fini` — **TOUJOURS ROUGE.** Un SECOND défaut, indépendant du premier, trouvé par
 *     cette suite et que la réparation de H1 ne couvre pas. Quand l'enfant termine
 *     légitimement les 18 nœuds livrés, les deux régions qui portent du contenu atteignent
 *     100 %, `enCours` cesse donc de les rendre, et les deux que la carte ouvre à leur place
 *     ne déclarent AUCUN nœud. Zéro exercice jouable. L'enfant qui a tout réussi se retrouve
 *     exactement aussi bloqué que celui dont la base mentait.
 *
 *     `EcranCarte.tsx` affirme pourtant l'inverse, mot pour mot : « Une région entièrement
 *     terminée renvoie sur son premier nœud plutôt que sur rien : un acquis n'est jamais
 *     repris (R14), rejouer est gratuit, et une prise qui cesserait de répondre serait un
 *     état sans issue — le pire défaut possible ici. » L'intention est juste ; elle est
 *     défaite en amont par `jouables`, qui ne contient plus la région terminée.
 *
 *     Ne pas assouplir cette assertion. Consigné dans `Docs/questions-en-attente.md`.
 */

import { describe, expect, it } from 'vitest';

import {
  CATALOGUE_DU_JOUR_DE_EZEKIEL,
  catalogueDuDepot,
  etatDuJourDeEzekiel,
  noeudsDeLaRegion,
  lireMondeHttp,
  lireProgressionHttp,
  profilAMiParcours,
  profilDUnCataloguePlusPetit,
  profilInactifDepuis40Jours,
  profilQuiAEchoueSouvent,
  profilQuiATOutFini,
  referentielComplet,
  sortiesQuiRepondent
} from '../fixtures/profils-vecus/atelier-vecu.js';
import type { EtatRegion } from '@pierre/partage';

import type { AtelierVecu } from '../fixtures/profils-vecus/atelier-vecu.js';
import { lireTexte } from '../configuration/preparation.js';

interface LigneRegionLue {
  readonly region_code: string;
  readonly ouverte: number;
  readonly pourcentage_colorie: number;
  readonly eclat_obtenu_le: string | null;
}

/** Ce qu'il faut pour interroger un profil : son atelier et son identifiant. */
interface ProfilInterrogeable {
  readonly atelier: AtelierVecu;
  readonly profil: string;
}

function lignesRegion(vecu: ProfilInterrogeable): readonly LigneRegionLue[] {
  return vecu.atelier.base
    .prepare(
      `SELECT region_code, ouverte, pourcentage_colorie, eclat_obtenu_le
       FROM progression_region WHERE profil_id = ? ORDER BY region_code`
    )
    .all(vecu.profil) as unknown as LigneRegionLue[];
}

/**
 * La question de ce lot, posée à une fixture et à personne d'autre.
 *
 * Elle est délibérément écrite en une ligne d'assertion : le rapport de H3 doit pouvoir
 * répondre « oui / non » par fixture sans interprétation.
 */
async function peutFaireQuelqueChose(vecu: ProfilInterrogeable): Promise<readonly string[]> {
  const sorties = await sortiesQuiRepondent(vecu.atelier, vecu.profil);
  return sorties.map((sortie) => `${sortie.region} → ${sortie.noeud}`);
}

// ═════════════════════════════════════════════ le catalogue mesuré, pas supposé

describe('le catalogue livré, mesuré à chaque exécution', () => {
  it('déclare 18 nœuds — 6 en Clairière, 12 aux Galeries', () => {
    expect(catalogueDuDepot().noeuds).toHaveLength(18);
    expect(noeudsDeLaRegion('clairiere')).toHaveLength(6);
    expect(noeudsDeLaRegion('galeries')).toHaveLength(12);
  });

  it('n’a livré aucun nœud dans les quatre régions suivantes', () => {
    for (const code of ['marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires']) {
      expect(noeudsDeLaRegion(code), `la région ${code} n’est plus vide`).toHaveLength(0);
    }
  });

  it('ouvre deux régions en parallèle (D38)', () => {
    expect(referentielComplet().ouvertesEnParallele).toBe(2);
  });
});

// ═════════════════════════ la sonde d'invariant reste fidèle à l'écran qu'elle imite

describe('la sonde d’invariant ne dérive pas de `EcranCarte`', () => {
  /**
   * `sortiesOffertes` recopie deux règles de `client/src/ecrans/EcranCarte.tsx` : `jouables`
   * vient de `regionsOuvertes`, et `reprise` rend `null` quand la région n'a aucun nœud. Ces
   * deux règles sont des closures locales de l'écran, non exportables. Si elles changent, la
   * sonde mesure autre chose que ce que l'enfant voit — et le mensonge serait invisible.
   *
   * Un fait mécanique ne s'affirme pas, il se mesure : on relit le fichier.
   */
  const ecran = lireTexte('client/src/ecrans/EcranCarte.tsx');

  it('la carte tire encore ses régions tapables de `regionsOuvertes`', () => {
    expect(ecran).toContain('regionsOuvertes(monde.carte)');
  });

  it('une région sans nœud rend encore un nœud de reprise `null`', () => {
    expect(ecran).toContain('if (noeuds.length === 0)');
    expect(ecran).toContain('return { noeud: null, rang: 0 };');
  });

  it('une prise n’est un bouton que si elle est ouverte ET porte un nœud', () => {
    expect(ecran).toContain('ouverte && premierNoeud !== null');
  });
});

// ═════════════════════════════════════════════════════ V1 — le profil à mi-parcours

describe('V1 — un profil à mi-parcours', () => {
  it('a bien un passé : 10 nœuds terminés sur 18', async () => {
    const vecu = await profilAMiParcours();
    try {
      expect(await lireProgressionHttp(vecu.atelier, vecu.profil)).toHaveLength(10);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const vecu = await profilAMiParcours();
    try {
      expect(await peutFaireQuelqueChose(vecu)).not.toHaveLength(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('reprend aux Galeries à l’étape 5, pas au premier nœud', async () => {
    const vecu = await profilAMiParcours();
    try {
      const sorties = await sortiesQuiRepondent(vecu.atelier, vecu.profil);
      const galeries = sorties.find((sortie) => sortie.region === 'galeries');
      // Le cinquième nœud DÉCLARÉ, jamais son nom écrit en dur : une campagne de contenu
      // renomme un identifiant sans prévenir, et ce qui compte est le rang de reprise.
      expect(galeries?.noeud).toBe(noeudsDeLaRegion('galeries')[4]);
    } finally {
      await vecu.atelier.fermer();
    }
  });
});

// ═══════════════════════════════════════════════ V2 — le profil qui a tout fini

describe('V2 — un profil qui a terminé tout le contenu livré', () => {
  it('a bien un passé : les 18 nœuds terminés', async () => {
    const vecu = await profilQuiATOutFini();
    try {
      expect(await lireProgressionHttp(vecu.atelier, vecu.profil)).toHaveLength(18);
      // La projection `progression_region` ne s'écrit qu'à la lecture de la carte
      // (`lireCarte`) : sans ce passage, la table serait vide et l'assertion mesurerait
      // l'absence d'écriture au lieu de l'état du profil.
      await lireMondeHttp(vecu.atelier, vecu.profil);
      const regions = lignesRegion(vecu);
      const clairiere = regions.find((ligne) => ligne.region_code === 'clairiere');
      expect(Number(clairiere?.pourcentage_colorie)).toBe(1);
      expect(clairiere?.eclat_obtenu_le).not.toBeNull();
    } finally {
      await vecu.atelier.fermer();
    }
  });

  /**
   * ROUGE — SECOND DÉFAUT, indépendant de celui du père, et non couvert par H1.
   *
   * L'enfant a tout réussi, honnêtement, sur le catalogue du jour. Les deux régions qui
   * portent du contenu sont à 100 %, donc `enCours` les exclut (`partage/src/monde/carte.ts`,
   * `region.ouverte && region.pourcentageColorie < 1`) ; les deux que la carte ouvre à leur
   * place ne déclarent aucun nœud. Zéro sortie.
   *
   * Le campement et le récit restent joignables, ce n'est donc pas un écran blanc — mais
   * plus aucun exercice n'est jouable, et c'est l'invariant que ce lot défend.
   */
  it('L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const vecu = await profilQuiATOutFini();
    try {
      expect(await peutFaireQuelqueChose(vecu)).not.toHaveLength(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });
});

// ══════════════════════════════════════════ V3 — le profil qui a beaucoup échoué

describe('V3 — un profil qui a beaucoup échoué', () => {
  it('a bien un passé : 13 tentatives journalisées, dont 12 non réussies', async () => {
    const vecu = await profilQuiAEchoueSouvent();
    try {
      const compte = vecu.atelier.base
        .prepare('SELECT reussi, COUNT(*) AS n FROM tentatives WHERE profil_id = ? GROUP BY reussi')
        .all(vecu.profil) as unknown as { reussi: number; n: number }[];
      const rates = compte.find((ligne) => Number(ligne.reussi) === 0)?.n ?? 0;
      const reussies = compte.find((ligne) => Number(ligne.reussi) === 1)?.n ?? 0;
      expect(Number(rates)).toBe(12);
      expect(Number(reussies)).toBe(1);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('n’a retiré aucun acquis, et n’affiche aucune région « terminée » usurpée (R14)', async () => {
    const vecu = await profilQuiAEchoueSouvent();
    try {
      const monde = await lireMondeHttp(vecu.atelier, vecu.profil);
      for (const region of monde.carte.regions) {
        expect(region.pourcentageColorie).toBeGreaterThanOrEqual(0);
        expect(region.pourcentageColorie).toBeLessThanOrEqual(1);
      }
      const clairiere = monde.carte.regions.find((region) => region.region === 'clairiere');
      expect(clairiere?.eclatObtenuLe).toBeNull();
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const vecu = await profilQuiAEchoueSouvent();
    try {
      expect(await peutFaireQuelqueChose(vecu)).not.toHaveLength(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });
});

// ═══════════════════════════════════════ V4 — le profil inactif depuis 40 jours

describe('V4 — un profil inactif depuis 40 jours', () => {
  it('a bien un passé, et ses révisions Leitner sont dues (la plus longue échéance est J+35)', async () => {
    const vecu = await profilInactifDepuis40Jours();
    try {
      const reponse = await vecu.atelier.application.inject({
        method: 'GET',
        url: `/api/profils/${vecu.profil}/revisions`
      });
      expect(reponse.statusCode).toBe(200);
      expect((reponse.json() as readonly unknown[]).length).toBeGreaterThan(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('n’a rien perdu pendant l’absence : ses 3 nœuds sont toujours là', async () => {
    const vecu = await profilInactifDepuis40Jours();
    try {
      expect(await lireProgressionHttp(vecu.atelier, vecu.profil)).toHaveLength(3);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const vecu = await profilInactifDepuis40Jours();
    try {
      expect(await peutFaireQuelqueChose(vecu)).not.toHaveLength(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });
});

// ═════════════════════════ V5 — l'état écrit par un catalogue plus petit (LE cas)

describe('V5 — un état écrit par un catalogue de contenu plus petit', () => {
  it('reproduit la base réelle de « Ezékiel » AVANT que le catalogue ne grandisse', async () => {
    // Mesuré sur `donnees/pierre.db` le 2026-08-02, profil `prf-0fbbeba7fb27d3f7` (copie
    // conservée dans `donnees/sauvegardes/pierre-2026-08-02T-lot-H3.db`, avec ses `-wal`
    // et `-shm` — la base est en WAL, le seul `.db` ne contient rien) :
    //
    //   clairiere      ouverte=1  pourcentage_colorie=1  eclat_obtenu_le renseigné
    //   galeries       ouverte=1  pourcentage_colorie=1  eclat_obtenu_le renseigné
    //   marais-jumeau  ouverte=1  0 %                    null
    //   foret-muette   ouverte=1  0 %                    null
    //   volcan         ouverte=0  0 %                    null
    //   cite-des-...   ouverte=0  0 %                    null
    //
    // Aucune de ces six lignes n'est écrite à la main ici : elles sortent des vraies routes,
    // après trois nœuds joués sur un catalogue qui n'en déclarait que trois. C'est la preuve
    // que la fixture reproduit le défaut du père, et non un défaut inventé pour l'occasion.
    const attendu: Readonly<Record<string, readonly [number, number, boolean]>> = {
      clairiere: [1, 1, true],
      galeries: [1, 1, true],
      'marais-jumeau': [1, 0, false],
      'foret-muette': [1, 0, false],
      volcan: [0, 0, false],
      'cite-des-histoires': [0, 0, false]
    };
    const avant = await etatDuJourDeEzekiel();
    try {
      const lues = lignesRegion(avant);
      expect(lues).toHaveLength(6);
      for (const ligne of lues) {
        const [ouverte, pourcentage, avecEclat] = attendu[String(ligne.region_code)]!;
        expect(Number(ligne.ouverte), `ouverte de ${ligne.region_code}`).toBe(ouverte);
        expect(
          Number(ligne.pourcentage_colorie),
          `pourcentage_colorie de ${ligne.region_code}`
        ).toBe(pourcentage);
        expect(ligne.eclat_obtenu_le !== null, `éclat de ${ligne.region_code}`).toBe(avecEclat);
      }
      expect(await lireProgressionHttp(avant.atelier, avant.profil)).toHaveLength(3);
    } finally {
      await avant.atelier.fermer();
    }
  });

  it('recalcule le pourcentage figé dès que le catalogue grandit — 100 % devient 1/6', async () => {
    const vecu = await profilDUnCataloguePlusPetit();
    try {
      // Le cache est réparé PARESSEUSEMENT : à la lecture de la carte, ou une fois au
      // démarrage du serveur (`reparerProgressionRegion`). Tant que l'enfant n'a pas ouvert
      // sa carte, la base porte encore la valeur périmée — c'est exactement le geste qu'on
      // reproduit ici, et le mesurer sans lui mesurerait autre chose.
      await lireMondeHttp(vecu.atelier, vecu.profil);
      const parCode = new Map(lignesRegion(vecu).map((ligne) => [ligne.region_code, ligne]));
      // 1 nœud sur 6, 2 nœuds sur 12 : la valeur figée à 100 % par le catalogue d'alors a été
      // recalculée depuis le journal et le contenu COURANT. C'est la propriété fondatrice —
      // « tout indicateur se recalcule depuis `tentatives` » (specs v2 § 13.3).
      expect(Number(parCode.get('clairiere')?.pourcentage_colorie)).toBeCloseTo(1 / 6, 10);
      expect(Number(parCode.get('galeries')?.pourcentage_colorie)).toBeCloseTo(2 / 12, 10);
      // L'Éclat, lui, ne se reprend jamais : c'est un trophée, pas un verrou (R14).
      expect(parCode.get('clairiere')?.eclat_obtenu_le).not.toBeNull();
      expect(parCode.get('galeries')?.eclat_obtenu_le).not.toBeNull();
      // Et aucune étoile n'a bougé au passage.
      expect(await lireProgressionHttp(vecu.atelier, vecu.profil)).toHaveLength(3);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  /**
   * LA PREUVE QUE CETTE FIXTURE MORD.
   *
   * Un test vert ne prouve rien s'il n'a jamais pu être rouge. Ce cas mesure la fixture sous
   * les DEUX critères d'ouverture, l'ancien et le nouveau, sur exactement le même état :
   *
   *   ancien — `region.ouverte && region.eclatObtenuLe === null`  → 0 sortie, enfant bloqué
   *   actuel — `region.ouverte && region.pourcentageColorie < 1`  → 2 sorties
   *
   * L'ancien critère est celui que `partage/src/monde/carte.ts` portait avant le lot H1. La
   * fixture reproduit donc bien le blocage du père, et la sonde d'invariant l'aurait attrapé.
   * Si quelqu'un revenait un jour au critère de l'Éclat, la ligne du haut deviendrait la
   * réalité et `L'ENFANT PEUT FAIRE QUELQUE CHOSE` repasserait au rouge.
   */
  it('AURAIT ÉTÉ ROUGE sous l’ancien critère d’ouverture — 0 sortie contre 2', async () => {
    const vecu = await profilDUnCataloguePlusPetit();
    try {
      const monde = await lireMondeHttp(vecu.atelier, vecu.profil);
      const progression = await lireProgressionHttp(vecu.atelier, vecu.profil);
      const faits = new Set(progression.map((ligne) => String(ligne.noeud)));

      const sortiesSelon = (enCours: (region: EtatRegion) => boolean): number =>
        [...monde.carte.regions]
          .sort((gauche, droite) => gauche.ordre - droite.ordre)
          .filter(enCours)
          .slice(0, Math.max(1, monde.carte.ouvertesEnParallele))
          .filter((region) => region.noeuds.length > 0)
          .filter((region) => region.noeuds.some((noeud) => !faits.has(String(noeud)))).length;

      const ancien = sortiesSelon(
        (region) => region.ouverte && region.eclatObtenuLe === null
      );
      const actuel = sortiesSelon((region) => region.ouverte && region.pourcentageColorie < 1);

      expect(ancien, 'l’ancien critère laissait l’enfant sans aucune sortie').toBe(0);
      expect(actuel, 'le critère actuel lui en offre').toBeGreaterThan(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  it('le catalogue a bien grandi sous le profil : 3 nœuds joués, 18 déclarés', async () => {
    const vecu = await profilDUnCataloguePlusPetit();
    try {
      const joues = Object.values(CATALOGUE_DU_JOUR_DE_EZEKIEL).reduce(
        (total, nombre) => total + nombre,
        0
      );
      expect(joues).toBe(3);
      expect(catalogueDuDepot().noeuds.length).toBe(18);
      const monde = await lireMondeHttp(vecu.atelier, vecu.profil);
      const galeries = monde.carte.regions.find((region) => region.region === 'galeries');
      expect(galeries?.noeuds).toHaveLength(12);
    } finally {
      await vecu.atelier.fermer();
    }
  });

  /**
   * ROUGE À L'ÉCRITURE — c'est le défaut que le père a rencontré, reproduit sans base réelle.
   *
   * `progression_region.pourcentage_colorie` vaut 1 pour la Clairière et les Galeries parce
   * qu'un catalogue de 3 nœuds l'y a écrit. `carteRecalculee` le recalcule pourtant juste
   * (1/6 et 2/12), mais `ecrireProgressionRegion` écrit en `MAX(ancien, nouveau)` et
   * `lireCarte` relit `Math.max(recalculé, stocké)` : la valeur périmée gagne, au nom de R14.
   *
   * C'est la violation du principe fondateur — « `tentatives` est le journal append-only qui
   * fait foi ; tout indicateur se recalcule depuis lui » (contrat technique v1, specs v2
   * § 13.3). La réparation appartient au lot H1.
   */
  it('L’ENFANT PEUT FAIRE QUELQUE CHOSE', async () => {
    const vecu = await profilDUnCataloguePlusPetit();
    try {
      expect(await peutFaireQuelqueChose(vecu)).not.toHaveLength(0);
    } finally {
      await vecu.atelier.fermer();
    }
  });
});
