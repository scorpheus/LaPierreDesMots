/**
 * LE GRAPHE DE PRÉREQUIS DES NŒUDS — contrôle 7 de `test:contenu`, réveillé à l'intégration.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Le contrôle 7 figurait parmi les DÉSACTIVÉS de `scripts/test-contenu.mjs`, avec pour raison
 * « un seul nœud en v1, aucun prérequis (D1) ». Mesuré à l'intégration du 2026-08-02 :
 *
 *     nœuds livrés : 18 | nœuds portant un prérequis non vide : 17
 *
 * La raison était donc CADUQUE, et le contrôle dormait sur un graphe réel de 18 nœuds. C'est
 * exactement le motif que le lot A3 a soldé côté SVG, et la leçon est la même : un contrôle
 * qu'on n'exécute plus finit par mentir sur ce qu'il garde.
 *
 * CE QU'IL GARDE, ET POURQUOI C'EST R14
 *
 * Les trois défauts cherchés sont un seul défaut vu de trois côtés, et tous violent R14 —
 * « aucun écran d'échec, aucun état sans issue, un acquis n'est jamais repris » :
 *
 *   - prérequis INCONNU     : le nœud attend un nœud qui n'existe pas, il ne s'ouvre jamais ;
 *   - CYCLE                 : deux nœuds s'attendent l'un l'autre, aucun ne s'ouvre jamais ;
 *   - nœud INATTEIGNABLE    : la clôture depuis les points d'entrée ne l'atteint pas.
 *
 * Le troisième CONTIENT les deux premiers. On les nomme quand même séparément : « ce nœud est
 * inatteignable » n'aide personne à corriger, « ces deux nœuds se réclament l'un l'autre » si.
 *
 * ON ÉNUMÈRE LES OBJETS, PAS LES OCCURRENCES (D48)
 *
 * Un nœud SANS champ `prerequis` est un point d'entrée — c'est une information, et c'est
 * précisément celle qu'aucune recherche textuelle de « prerequis » ne trouve. On énumère donc
 * les FICHIERS de nœud, et le champ absent est traité nommément comme un tableau vide.
 *
 * PUR par construction : les documents arrivent déjà analysés, aucune lecture de disque ici.
 * C'est ce qui permet de lui soumettre un graphe cassé et d'EXIGER qu'il le refuse — un garde
 * qu'on n'a jamais vu se déclencher n'est pas un garde, c'est une décoration.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

/** Les règles de ce contrôle. Toutes bloquantes : chacune décrit un nœud que l'enfant n'atteint jamais. */
export const REGLES_PREREQUIS = Object.freeze({
  /** Un prérequis nomme un nœud qui n'est pas livré. */
  PREREQUIS_INCONNU: 'prerequis-inconnu',
  /** Des nœuds s'attendent mutuellement : aucun ne s'ouvre. */
  CYCLE: 'cycle-de-prerequis',
  /** Aucun nœud sans prérequis : le jeu n'a pas de porte d'entrée. */
  AUCUN_POINT_DENTREE: 'aucun-point-d-entree',
  /** Le nœud existe, ses prérequis existent, et la clôture ne l'atteint pas. */
  JAMAIS_OUVRABLE: 'noeud-jamais-ouvrable',
  /** Deux fichiers de nœud portent le même identifiant : l'un des deux est invisible. */
  IDENTIFIANT_DOUBLE: 'identifiant-double'
});

/**
 * @param {ReadonlyArray<{ chemin: string, donnees: unknown }>} noeuds
 * @returns {{
 *   nbNoeuds: number,
 *   pointsDEntree: readonly string[],
 *   cycles: readonly string[],
 *   jamaisOuvrables: readonly string[],
 *   anomalies: ReadonlyArray<{ ou: string, message: string, regle: string }>
 * }}
 */
export function croiserPrerequis(noeuds) {
  const anomalies = [];
  const pousser = (ou, message, regle) => anomalies.push({ ou, message, regle });

  const prerequisDe = (donnees) =>
    Array.isArray(donnees?.prerequis) ? donnees.prerequis.map(String) : [];

  // ── identifiants : un doublon rendrait tout le reste faux en silence
  const parId = new Map();
  for (const { chemin, donnees } of noeuds) {
    const id = String(donnees?.id);
    if (parId.has(id)) {
      pousser(
        chemin,
        `identifiant « ${id} » déjà porté par ${parId.get(id).chemin} : l'un des deux ` +
          `fichiers est invisible, et le graphe de prérequis ne veut plus rien dire.`,
        REGLES_PREREQUIS.IDENTIFIANT_DOUBLE
      );
      continue;
    }
    parId.set(id, { chemin, donnees });
  }

  // ── 1. prérequis pointant vers un nœud non livré
  for (const { chemin, donnees } of noeuds) {
    for (const p of prerequisDe(donnees)) {
      if (!parId.has(p)) {
        pousser(
          chemin,
          `prérequis « ${p} » : aucun nœud de ce nom n'est livré. Le nœud ne s'ouvrira ` +
            `jamais — état sans issue (R14).`,
          REGLES_PREREQUIS.PREREQUIS_INCONNU
        );
      }
    }
  }

  // ── 2. cycles — parcours en profondeur, pile explicite pour NOMMER le cycle
  const BLANC = 0;
  const GRIS = 1;
  const NOIR = 2;
  const couleur = new Map([...parId.keys()].map((id) => [id, BLANC]));
  const cycles = new Set();
  const visiter = (id, pile) => {
    couleur.set(id, GRIS);
    pile.push(id);
    for (const p of prerequisDe(parId.get(id)?.donnees)) {
      if (!parId.has(p)) continue;
      if (couleur.get(p) === GRIS) {
        cycles.add([...pile.slice(pile.indexOf(p)), p].join(' → '));
      } else if (couleur.get(p) === BLANC) {
        visiter(p, pile);
      }
    }
    pile.pop();
    couleur.set(id, NOIR);
  };
  for (const id of parId.keys()) {
    if (couleur.get(id) === BLANC) visiter(id, []);
  }
  for (const cycle of cycles) {
    pousser(
      'contenu/noeuds/',
      `cycle de prérequis : ${cycle}. Aucun nœud de ce cycle ne s'ouvre jamais (R14).`,
      REGLES_PREREQUIS.CYCLE
    );
  }

  // ── 3. atteignabilité — clôture depuis les nœuds SANS prérequis
  const pointsDEntree = [...parId.entries()]
    .filter(([, { donnees }]) => prerequisDe(donnees).length === 0)
    .map(([id]) => id);

  if (parId.size > 0 && pointsDEntree.length === 0) {
    pousser(
      'contenu/noeuds/',
      `aucun nœud sans prérequis parmi les ${String(parId.size)} livrés : le jeu n'a aucune ` +
        `porte d'entrée, rien ne s'ouvre jamais (R14).`,
      REGLES_PREREQUIS.AUCUN_POINT_DENTREE
    );
  }

  const ouverts = new Set(pointsDEntree);
  for (let bouge = true; bouge; ) {
    bouge = false;
    for (const [id, { donnees }] of parId) {
      if (ouverts.has(id)) continue;
      if (prerequisDe(donnees).every((p) => ouverts.has(p))) {
        ouverts.add(id);
        bouge = true;
      }
    }
  }

  const jamaisOuvrables = [...parId.keys()].filter((id) => !ouverts.has(id));
  // Un nœud pris dans un cycle est déjà dénoncé par la règle CYCLE, avec le chemin qui aide à
  // corriger. Le redénoncer ici noierait la vraie cause sous sa conséquence.
  const dejaDitParUnCycle = new Set();
  for (const cycle of cycles) for (const id of cycle.split(' → ')) dejaDitParUnCycle.add(id);
  for (const id of jamaisOuvrables) {
    if (dejaDitParUnCycle.has(id)) continue;
    pousser(
      parId.get(id).chemin,
      `nœud jamais ouvrable : ses prérequis ${JSON.stringify(prerequisDe(parId.get(id).donnees))} ` +
        `ne se referment pas depuis une porte d'entrée (R14).`,
      REGLES_PREREQUIS.JAMAIS_OUVRABLE
    );
  }

  return {
    nbNoeuds: parId.size,
    pointsDEntree,
    cycles: [...cycles],
    jamaisOuvrables,
    anomalies
  };
}

/** La ligne que `test:contenu` imprime. La FRACTION, jamais le seul compte. */
export function resumerPrerequis(rapport) {
  return (
    `Prérequis (contrôle 7) : ${String(rapport.nbNoeuds)} nœud(s), ` +
    `${String(rapport.pointsDEntree.length)} porte(s) d'entrée, ` +
    `${String(rapport.cycles.length)} cycle(s), ` +
    `${String(rapport.jamaisOuvrables.length)} nœud(s) jamais ouvrable(s).`
  );
}
