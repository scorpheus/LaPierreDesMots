/**
 * LE CROISEMENT « MOTEURS DÉCLARÉS × MOTEURS ATTEIGNABLES » — lot A4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL RECENSE DES OBJETS ET NON DES OCCURRENCES
 *
 * Un moteur sans exercice n'apparaît dans aucun `grep`, ne casse aucun test, ne lève aucune
 * erreur de compilation — et **n'existe pas pour l'enfant**. C'est du code livré, testé
 * unitairement, monté dans le registre, et injouable. Mesuré au démarrage de ce lot par
 * `tests/e2e/parcours-audit-moteurs.spec.ts` :
 *
 *   [qa-moteurs] 8 moteur(s) joué(s) de bout en bout sur 14 déclaré(s)
 *   [qa-moteurs] 6 moteur(s) DÉCLARÉ(S) SANS EXERCICE, donc inatteignables par l'enfant :
 *                assemble, chemin, chrono, histoire, libre, paires
 *
 * La QA imprimait ce compte sans jamais l'asserter — délibérément : « R12 est le travail du
 * lot de contenu, pas de la QA ». Le compte restait donc un journal, que personne n'ouvre.
 * Ce module en fait un GARDE.
 *
 * On énumère les moteurs que l'union `CodeMoteur` DÉCLARE, puis on regarde lesquels sont
 * reliés à un exercice, lui-même relié à un nœud, lui-même cité par sa région. **Les trois
 * maillons sont exigés** : un exercice qu'aucun nœud ne cite est invisible
 * (`clairiere-sortie-complete.test.ts`), et un nœud qu'aucune région ne cite l'est tout autant
 * (`verifier-noeuds-regions.mjs`). Un moteur n'est atteignable que si la chaîne entière tient.
 *
 * PUR par construction : les documents arrivent déjà analysés, aucune lecture de disque ici.
 * C'est ce qui permet de lui soumettre l'état historique cassé et d'exiger qu'il le refuse —
 * un garde qu'on n'a pas vu se déclencher n'est pas un garde, c'est une décoration.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

/** Les règles de ce croisement. Toutes bloquantes : chacune décrit un moteur injouable. */
export const REGLES_MOTEURS = Object.freeze({
  /** Déclaré par `CodeMoteur`, cité par aucun exercice. Du code que l'enfant n'atteint pas. */
  MOTEUR_SANS_EXERCICE: 'moteur-sans-exercice',
  /** Un exercice le cite, mais aucun nœud ne cite cet exercice. Contenu mort. */
  MOTEUR_SANS_NOEUD: 'moteur-sans-noeud',
  /** Un nœud le porte, mais sa région ne cite pas ce nœud. La carte ne l'atteint pas. */
  MOTEUR_HORS_CARTE: 'moteur-hors-carte',
  /** Un exercice cite un moteur que `CodeMoteur` ne déclare pas. */
  MOTEUR_INCONNU: 'moteur-inconnu',
  /** Aucun moteur déclaré, ou aucun exercice : la mesure serait vraie par vacuité. */
  POPULATION_VIDE: 'population-vide'
});

/**
 * @param {{
 *   moteursDeclares: readonly string[],
 *   exercices: ReadonlyArray<{ chemin: string, donnees: unknown }>,
 *   noeuds: ReadonlyArray<{ chemin: string, donnees: unknown }>,
 *   noeudsCites: readonly string[],
 * }} entree
 *   `noeudsCites` est la liste plate des nœuds que `contenu/monde/regions.json` déclare.
 * @returns {{
 *   nbMoteursDeclares: number,
 *   nbMoteursAtteignables: number,
 *   ecart: number,
 *   atteignables: string[],
 *   parMoteur: Array<{
 *     moteur: string, exercices: number, noeuds: number, surLaCarte: number,
 *     atteignable: boolean, premierNoeud: string | null
 *   }>,
 *   anomalies: Array<{ regle: string, ou: string, message: string }>,
 * }}
 */
export function croiserMoteursEtExercices(entree) {
  const anomalies = [];
  const ajouter = (regle, ou, message) => {
    anomalies.push({ regle, ou, message });
  };

  const declares = [...new Set((entree.moteursDeclares ?? []).map(String))].sort();
  const exercices = entree.exercices ?? [];
  const noeuds = entree.noeuds ?? [];
  const cites = new Set((entree.noeudsCites ?? []).map(String));

  if (declares.length === 0 || exercices.length === 0) {
    ajouter(
      REGLES_MOTEURS.POPULATION_VIDE,
      'contenu/exercices/',
      `${String(declares.length)} moteur(s) déclaré(s) et ${String(exercices.length)} ` +
        'exercice(s) lu(s) : la couverture serait vraie par vacuité, pas par mérite.'
    );
  }

  // ── exercice.id → moteur, et les moteurs qu'aucune union ne déclare.
  const moteurParExercice = new Map();
  for (const { chemin, donnees } of exercices) {
    const id = String(donnees?.id ?? '');
    const moteur = String(donnees?.jeu?.moteur ?? '');
    moteurParExercice.set(id, moteur);
    if (!declares.includes(moteur)) {
      ajouter(
        REGLES_MOTEURS.MOTEUR_INCONNU,
        chemin,
        `L'exercice « ${id} » cite le moteur « ${moteur} », que l'union CodeMoteur ne ` +
          'déclare pas. Le registre ne le montera pas : écran mort.'
      );
    }
  }

  // ── moteur → ses exercices, ses nœuds, ceux de ses nœuds que la carte cite.
  const parMoteur = declares.map((moteur) => {
    const siens = [...moteurParExercice.entries()]
      .filter(([, code]) => code === moteur)
      .map(([id]) => id);

    const leursNoeuds = noeuds.filter((noeud) =>
      siens.includes(String(noeud.donnees?.exercice ?? ''))
    );
    const surLaCarte = leursNoeuds.filter((noeud) => cites.has(String(noeud.donnees?.id ?? '')));

    return {
      moteur,
      exercices: siens.length,
      noeuds: leursNoeuds.length,
      surLaCarte: surLaCarte.length,
      atteignable: surLaCarte.length > 0,
      premierNoeud:
        surLaCarte.length === 0
          ? null
          : String(
              [...surLaCarte].sort((a, b) =>
                String(a.donnees?.id) < String(b.donnees?.id) ? -1 : 1
              )[0].donnees.id
            )
    };
  });

  // ── les trois maillons, dénoncés séparément : ce qui manque n'est jamais le même travail.
  for (const bilan of parMoteur) {
    if (bilan.exercices === 0) {
      ajouter(
        REGLES_MOTEURS.MOTEUR_SANS_EXERCICE,
        bilan.moteur,
        `Moteur « ${bilan.moteur} » déclaré par CodeMoteur et cité par aucun exercice. Le ` +
          "code est livré, testé, enregistré — et l'enfant ne peut pas l'atteindre."
      );
      continue;
    }
    if (bilan.noeuds === 0) {
      ajouter(
        REGLES_MOTEURS.MOTEUR_SANS_NOEUD,
        bilan.moteur,
        `Moteur « ${bilan.moteur} » : ${String(bilan.exercices)} exercice(s) écrit(s), aucun ` +
          "nœud ne les cite. Du travail livré, validé, et invisible."
      );
      continue;
    }
    if (bilan.surLaCarte === 0) {
      ajouter(
        REGLES_MOTEURS.MOTEUR_HORS_CARTE,
        bilan.moteur,
        `Moteur « ${bilan.moteur} » : ${String(bilan.noeuds)} nœud(s) le portent, et aucun ` +
          "n'est cité par sa région dans contenu/monde/regions.json. La carte ne les atteint " +
          'pas.'
      );
    }
  }

  const atteignables = parMoteur.filter((b) => b.atteignable).map((b) => b.moteur);

  return {
    nbMoteursDeclares: declares.length,
    nbMoteursAtteignables: atteignables.length,
    ecart: atteignables.length - declares.length,
    atteignables,
    parMoteur,
    anomalies
  };
}

/** La fraction, jamais le compte seul : « 8 moteurs » ne dit rien, « 8 sur 14 » nomme le trou. */
export function resumerCouvertureMoteurs(rapport) {
  const manquants = rapport.parMoteur
    .filter((bilan) => !bilan.atteignable)
    .map((bilan) => bilan.moteur);
  return (
    `${String(rapport.nbMoteursAtteignables)}/${String(rapport.nbMoteursDeclares)} moteur(s) ` +
    `atteignable(s) par l'enfant, écart ${String(rapport.ecart)}` +
    (manquants.length === 0 ? '' : ` — inatteignables : ${manquants.join(', ')}`)
  );
}

/**
 * Lit l'union `CodeMoteur` dans le source plutôt que de recopier ses quatorze membres.
 *
 * Même motif que `tests/e2e/qa-outils.ts` : une liste recopiée est une liste qui prend du
 * retard, et le jour où un quinzième moteur arrive, ce garde doit le compter au dénominateur
 * SANS qu'on y pense.
 *
 * @param {string} sourceIdentifiants contenu de `partage/src/identifiants.ts`
 * @returns {string[]}
 */
export function moteursDeclaresDuSource(sourceIdentifiants) {
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(sourceIdentifiants);
  if (bloc === null) {
    throw new Error(
      'L’union `CodeMoteur` est introuvable dans partage/src/identifiants.ts. Le dénominateur ' +
        'ne peut plus être dérivé : corriger le motif AVANT de continuer.'
    );
  }
  const moteurs = [...bloc[1].matchAll(/'([a-z]+)'/g)].map((trouve) => trouve[1]);
  if (moteurs.length === 0) {
    throw new Error('`CodeMoteur` a été trouvée mais aucun membre n’a pu en être lu.');
  }
  return moteurs;
}
