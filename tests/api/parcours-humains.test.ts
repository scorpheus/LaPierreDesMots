/**
 * Les PARCOURS HUMAINS — lot H3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Les 186 parcours E2E du dépôt jouent tous le même enfant : celui qui répond, qui attend la
 * fin de l'animation, qui ne se trompe pas de bouton et qui ne repose jamais son doigt. Un
 * enfant de sept ans ne fait rien de tout cela. Il abandonne au milieu, ferme la tablette
 * pendant que ça brille, tape deux fois parce que ça ne va pas assez vite, revient le
 * lendemain, change de joueur pour voir, met trois minutes à répondre, et rejoue vingt fois
 * le nœud qu'il aime.
 *
 * Sept recettes, une par comportement. Chacune se termine par la seule question qui compte :
 * **est-ce que l'enfant peut encore faire quelque chose ?**
 *
 * Aucune n'ouvre de navigateur : elles passent par les VRAIES routes avec `fastify.inject`,
 * ce qui les rend rapides, déterministes, et exécutables dans `npm run test`. Ce qui se joue
 * ici est l'état, pas le pixel — et c'est l'état qui a cassé.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';

import {
  creerProfil,
  jouerNoeud,
  lireMondeHttp,
  lireProgressionHttp,
  monterAtelier,
  noeudsDeLaRegion,
  rouvrirApplication,
  sortiesQuiRepondent
} from '../fixtures/profils-vecus/atelier-vecu.js';
import type { AtelierVecu } from '../fixtures/profils-vecus/atelier-vecu.js';

/**
 * Les trois premiers nœuds de la Clairière, LUS AU RÉFÉRENTIEL — jamais écrits en dur.
 *
 * Ce lot est écrit pendant qu'une campagne de contenu tourne en parallèle : un identifiant
 * de nœud renommé, et une recette humaine se mettrait à échouer pour une raison qui n'a
 * rien d'humain. Ce qui compte ici est l'ORDRE de reprise, pas le nom du nœud.
 */
const CLAIRIERE = noeudsDeLaRegion('clairiere');
const PREMIER = CLAIRIERE[0]!;
const DEUXIEME = CLAIRIERE[1]!;
const TROISIEME = CLAIRIERE[2]!;

interface LigneProgression {
  readonly etoiles: number;
  readonly nb_tentatives: number;
}

function progressionEnBase(
  atelier: AtelierVecu,
  profil: string,
  noeud: string
): LigneProgression | undefined {
  return atelier.base
    .prepare('SELECT etoiles, nb_tentatives FROM progression_noeud WHERE profil_id = ? AND noeud_id = ?')
    .get(profil, noeud) as unknown as LigneProgression | undefined;
}

/** L'invariant, posé à la fin de chaque recette : au moins une sortie qui répond. */
async function invariant(atelier: AtelierVecu, profil: string): Promise<void> {
  const sorties = await sortiesQuiRepondent(atelier, profil);
  expect(sorties.length, 'aucune sortie : l’enfant est bloqué').toBeGreaterThan(0);
}

// ══════════════════════════════════ 1 — abandonner un exercice au milieu, puis y revenir

describe('parcours 1 — il abandonne un exercice au milieu, et y revient plus tard', () => {
  it('ne perd rien, ne bloque rien, et le nœud abandonné reste celui qu’on lui propose', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      await jouerNoeud(atelier, profil, PREMIER);

      // Il entre dans le nœud suivant… et s'arrête. Aucune tentative n'est postée : c'est
      // exactement ce que fait un client qui n'atteint jamais l'écran de récompense.
      const paquet = await atelier.application.inject({
        method: 'GET',
        url: `/api/contenu/noeuds/${DEUXIEME}`
      });
      expect(paquet.statusCode).toBe(200);

      const sortiesPendant = await sortiesQuiRepondent(atelier, profil);
      expect(sortiesPendant.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(
        DEUXIEME
      );
      expect(await lireProgressionHttp(atelier, profil)).toHaveLength(1);
      await invariant(atelier, profil);

      // Le lendemain, il y revient et le termine.
      atelier.horloge.avancer({ jours: 1 });
      await jouerNoeud(atelier, profil, DEUXIEME);
      expect(await lireProgressionHttp(atelier, profil)).toHaveLength(2);

      const apres = await sortiesQuiRepondent(atelier, profil);
      expect(apres.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(TROISIEME);
      await invariant(atelier, profil);
    } finally {
      await atelier.fermer();
    }
  });
});

// ══════════════════════════════ 2 — fermer l'onglet pendant l'animation de récompense

describe('parcours 2 — il ferme l’onglet pendant l’animation de récompense', () => {
  it('garde l’acquis : le serveur a journalisé, le client n’a jamais lu la réponse', async () => {
    let atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      // La tentative part, le serveur l'écrit ; la réponse, elle, n'est jamais exploitée par
      // le client — il a disparu pendant que les étoiles tournaient.
      await jouerNoeud(atelier, profil, PREMIER);

      // Tout ce qui n'était pas en base est perdu : on remonte l'application à neuf.
      atelier = await rouvrirApplication(atelier);

      const progression = await lireProgressionHttp(atelier, profil);
      expect(progression).toHaveLength(1);
      expect(Number(progressionEnBase(atelier, profil, PREMIER)?.etoiles)).toBeGreaterThan(
        0
      );
      await invariant(atelier, profil);
    } finally {
      await atelier.fermer();
    }
  });

  it('ne rejoue pas le nœud déjà fini : la carte propose bien le suivant après réouverture', async () => {
    let atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      await jouerNoeud(atelier, profil, PREMIER);
      atelier = await rouvrirApplication(atelier);

      const sorties = await sortiesQuiRepondent(atelier, profil);
      expect(sorties.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(DEUXIEME);
    } finally {
      await atelier.fermer();
    }
  });
});

// ═══════════════════════════════════════════════ 3 — taper deux fois par impatience

describe('parcours 3 — il tape deux fois parce que ça ne va pas assez vite', () => {
  it('n’enregistre qu’une tentative, et ne double ni les étoiles ni le compteur', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      const demarreLe = String(atelier.horloge.maintenant());

      const premier = await jouerNoeud(atelier, profil, PREMIER, { demarreLe });
      const second = await jouerNoeud(atelier, profil, PREMIER, { demarreLe });

      expect(premier.statut).toBe(201);
      expect(premier.deja).toBe(false);
      expect(second.statut).toBe(200);
      expect(second.deja).toBe(true);
      expect(second.etoiles).toBe(premier.etoiles);

      const ligne = progressionEnBase(atelier, profil, PREMIER);
      expect(Number(ligne?.nb_tentatives)).toBe(1);

      const compte = atelier.base
        .prepare('SELECT COUNT(*) AS n FROM tentatives WHERE profil_id = ?')
        .get(profil) as unknown as { n: number };
      expect(Number(compte.n)).toBe(1);
      await invariant(atelier, profil);
    } finally {
      await atelier.fermer();
    }
  });

  it('n’avance pas non plus la pédagogie deux fois : autant d’étapes que de taps utiles', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      const demarreLe = String(atelier.horloge.maintenant());
      await jouerNoeud(atelier, profil, PREMIER, { demarreLe });
      await jouerNoeud(atelier, profil, PREMIER, { demarreLe });

      const etapes = atelier.base
        .prepare(
          `SELECT COUNT(*) AS n FROM etapes_tentative
           WHERE tentative_id IN (SELECT id FROM tentatives WHERE profil_id = ?)`
        )
        .get(profil) as unknown as { n: number };
      expect(Number(etapes.n)).toBe(1);
    } finally {
      await atelier.fermer();
    }
  });
});

// ════════════════════════════════════════════════════ 4 — revenir le lendemain

describe('parcours 4 — il revient le lendemain', () => {
  it('retrouve tout, et la carte le remet là où il en était', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      await jouerNoeud(atelier, profil, PREMIER);
      atelier.horloge.avancer({ minutes: 5 });
      await jouerNoeud(atelier, profil, DEUXIEME);

      atelier.horloge.avancer({ jours: 1 });

      expect(await lireProgressionHttp(atelier, profil)).toHaveLength(2);
      const sorties = await sortiesQuiRepondent(atelier, profil);
      expect(sorties.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(TROISIEME);
      await invariant(atelier, profil);
    } finally {
      await atelier.fermer();
    }
  });

  it('a des révisions à faire à J+3, aucune avant — l’échelle Leitner est respectée', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      await jouerNoeud(atelier, profil, PREMIER);

      const revisions = async (): Promise<number> => {
        const reponse = await atelier.application.inject({
          method: 'GET',
          url: `/api/profils/${profil}/revisions`
        });
        expect(reponse.statusCode).toBe(200);
        return (reponse.json() as readonly unknown[]).length;
      };

      // L'échelle est une DONNÉE, lue et non supposée — `contenu/referentiel/
      // parametres-pedagogie.json` : `delaisJours: [1, 3, 7, 16, 35]`. Une première revue
      // réussie sans aide promeut l'item en boîte 2 : sa prochaine échéance est J+3, pas J+1.
      // C'est précisément le genre de détail qu'un test écrit « au feeling » se serait donné
      // faux, et qu'un enfant qui revient le lendemain aurait payé en révisions fantômes.
      expect(await revisions()).toBe(0);
      atelier.horloge.avancer({ jours: 1, minutes: 1 });
      expect(await revisions(), 'rien n’est dû à J+1 : l’item est en boîte 2').toBe(0);
      atelier.horloge.avancer({ jours: 2 });
      expect(await revisions(), 'la révision est due à J+3').toBeGreaterThan(0);
    } finally {
      await atelier.fermer();
    }
  });
});

// ═══════════════════════════════════════════ 5 — changer de profil en cours de route

describe('parcours 5 — il change de joueur en cours de route, puis revient', () => {
  it('ne mélange rien : chaque profil retrouve exactement ce qu’il avait laissé', async () => {
    const atelier = await monterAtelier();
    try {
      const ezekiel = await creerProfil(atelier, 'Ezékiel');
      await jouerNoeud(atelier, ezekiel, PREMIER);
      atelier.horloge.avancer({ minutes: 5 });
      await jouerNoeud(atelier, ezekiel, DEUXIEME);

      // « Changer de joueur » — le bouton est sur la carte, et un enfant le tape.
      const invite = await creerProfil(atelier, 'Alma');
      atelier.horloge.avancer({ minutes: 3 });
      await jouerNoeud(atelier, invite, PREMIER);

      expect(await lireProgressionHttp(atelier, ezekiel)).toHaveLength(2);
      expect(await lireProgressionHttp(atelier, invite)).toHaveLength(1);

      const chezEzekiel = await sortiesQuiRepondent(atelier, ezekiel);
      const chezInvite = await sortiesQuiRepondent(atelier, invite);
      expect(chezEzekiel.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(
        TROISIEME
      );
      expect(chezInvite.find((sortie) => sortie.region === 'clairiere')?.noeud).toBe(
        DEUXIEME
      );

      await invariant(atelier, ezekiel);
      await invariant(atelier, invite);
    } finally {
      await atelier.fermer();
    }
  });

  it('ne laisse pas le monde de l’un déteindre sur la carte de l’autre', async () => {
    const atelier = await monterAtelier();
    try {
      const avance = await creerProfil(atelier, 'Ezékiel');
      for (const noeud of noeudsDeLaRegion('clairiere')) {
        await jouerNoeud(atelier, avance, noeud);
        atelier.horloge.avancer({ minutes: 4 });
      }
      const neuf = await creerProfil(atelier, 'Alma');

      const monde = await lireMondeHttp(atelier, neuf);
      for (const region of monde.carte.regions) {
        expect(region.pourcentageColorie, `région ${String(region.region)}`).toBe(0);
        expect(region.eclatObtenuLe).toBeNull();
      }
      await invariant(atelier, neuf);
    } finally {
      await atelier.fermer();
    }
  });
});

// ══════════════════════════════════════════════════════ 6 — répondre très lentement

describe('parcours 6 — il répond très lentement', () => {
  it('n’est pas puni : mêmes étoiles qu’une réponse rapide, à erreurs et aide égales', async () => {
    const atelier = await monterAtelier();
    try {
      const rapide = await creerProfil(atelier, 'Alma');
      const vif = await jouerNoeud(atelier, rapide, PREMIER, { dureeMs: 12_000 });

      const lent = await creerProfil(atelier, 'Ezékiel');
      const demarreLe = String(atelier.horloge.maintenant());
      // Vingt-cinq minutes sur un seul nœud. C'est long, et ce n'est pas une faute.
      atelier.horloge.avancer({ minutes: 25 });
      const patient = await jouerNoeud(atelier, lent, PREMIER, {
        demarreLe,
        dureeMs: 1_500_000
      });

      expect(patient.etoiles).toBe(vif.etoiles);
      expect(patient.statut).toBe(201);
      await invariant(atelier, lent);
    } finally {
      await atelier.fermer();
    }
  });

  it('journalise la durée réelle sans la tronquer — le parent doit pouvoir la voir', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      const demarreLe = String(atelier.horloge.maintenant());
      atelier.horloge.avancer({ minutes: 25 });
      await jouerNoeud(atelier, profil, PREMIER, { demarreLe, dureeMs: 1_500_000 });

      const ligne = atelier.base
        .prepare('SELECT duree_ms FROM tentatives WHERE profil_id = ?')
        .get(profil) as unknown as { duree_ms: number };
      expect(Number(ligne.duree_ms)).toBe(1_500_000);
    } finally {
      await atelier.fermer();
    }
  });
});

// ═══════════════════════════════════ 7 — rejouer un nœud déjà à son maximum d'étoiles

describe('parcours 7 — il rejoue un nœud qu’il a déjà réussi parfaitement', () => {
  it('ne perd pas une étoile en rejouant moins bien (R14 — un acquis n’est jamais repris)', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      const parfait = await jouerNoeud(atelier, profil, PREMIER);
      expect(parfait.etoiles).toBeGreaterThan(0);

      // Le lendemain, il le rejoue pour le plaisir, se trompe, demande l'aide de Gobi.
      atelier.horloge.avancer({ jours: 1 });
      const moinsBien = await jouerNoeud(atelier, profil, PREMIER, {
        nbErreurs: 4,
        aideUtilisee: 'demonstration'
      });

      expect(moinsBien.deja).toBe(false);
      expect(moinsBien.etoiles).toBe(parfait.etoiles);
      const ligne = progressionEnBase(atelier, profil, PREMIER);
      expect(Number(ligne?.etoiles)).toBe(parfait.etoiles);
      expect(Number(ligne?.nb_tentatives)).toBe(2);
      await invariant(atelier, profil);
    } finally {
      await atelier.fermer();
    }
  });

  it('laisse le nœud terminé toujours ouvrable : rejouer est gratuit, jamais interdit', async () => {
    const atelier = await monterAtelier();
    try {
      const profil = await creerProfil(atelier);
      await jouerNoeud(atelier, profil, PREMIER);
      const paquet = await atelier.application.inject({
        method: 'GET',
        url: `/api/contenu/noeuds/${PREMIER}`
      });
      expect(paquet.statusCode).toBe(200);
    } finally {
      await atelier.fermer();
    }
  });
});
