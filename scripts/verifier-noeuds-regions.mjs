/**
 * LE CROISEMENT `regions.json` × `contenu/noeuds/**` — lot A2.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EXISTE *ICI*
 *
 * `contenu/monde/regions.json` le dit de lui-même : « `noeuds` ne cite que des nœuds
 * réellement livrés : **c'est lui qui fait le pourcentage de recoloration** ». C'est le SEUL
 * endroit qui dit à la carte quels nœuds une région contient. Un nœud écrit, validé, dont
 * l'exercice est sain, mais absent de cette liste, est du **contenu mort** : la carte ne
 * l'atteint pas, la reprise ne le propose pas, et il ne compte pas dans le pourcentage — donc
 * la région ne peut jamais atteindre 100 %.
 *
 * Ce défaut n'est pas hypothétique, il est RÉCIDIVISTE. Il a été mesuré trois fois :
 *
 *   contrat de finition v3 § 1.5   1 nœud cité  /  5 livrés   → 4 invisibles
 *   après la livraison de N8       7 nœuds cités / 12 livrés   → 5 invisibles
 *   au lot A2 (ce fichier)        12 nœuds cités / 12 livrés   → écart nul
 *
 * C'est le « dans la clairière je n'ai eu qu'un exercice, est-ce normal ? » du père. Il
 * reparaîtra à chaque livraison de contenu tant que rien ne croise les deux populations,
 * parce qu'aucune relecture d'un seul fichier ne peut le voir : `regions.json` est cohérent
 * avec lui-même, chaque nœud est cohérent avec lui-même, et c'est leur ÉCART qui ment.
 *
 * ── UNE POPULATION D'OBJETS, PAS UNE LISTE D'OCCURRENCES ───────────────────────────────────
 * Le contrôle n'énumère pas les mentions d'un identifiant. Il énumère les OBJETS des deux
 * côtés — les fichiers de `contenu/noeuds/`, et les entrées des tableaux `noeuds` — et il
 * exige la bijection. Un `grep` sur « clairiere-0 » aurait rendu douze lignes dans les deux
 * états, celui d'avant comme celui d'après.
 *
 * ── POURQUOI DANS `test:contenu` ET PAS SEULEMENT EN VITEST ────────────────────────────────
 * `tests/unitaires/ids-regions-stables.test.ts` (lot N7) croise déjà ces deux populations, et
 * il reste en place — ce fichier ne le remplace pas. Mais `npm run test:contenu` est **la
 * commande que l'agent générateur de contenu doit exécuter avant de déposer un brouillon**
 * (annexe T § T1), et c'est exactement le moment où le défaut naît : on écrit des nœuds, on
 * oublie de les déclarer. Mesuré avant ce lot, sortie citée :
 *
 *   $ grep -n "noeud" scripts/test-contenu.mjs
 *   358,359,360,361,362,363,364   (une variable locale du parcours SVG)
 *
 * Sept occurrences, aucune lecture : le contrôle du contenu n'ouvrait **aucun** fichier de
 * `contenu/noeuds/`. Un agent pouvait livrer six nœuds invisibles et lire « 0 problème ».
 *
 * ── LE CONTRAT DE SORTIE ───────────────────────────────────────────────────────────────────
 * `croiserNoeudsEtRegions` rend TOUJOURS **les deux comptes et leur écart**, par région et au
 * total. Un rapport qui dirait « N nœuds » sans dire de quel côté n'aurait pas répondu à la
 * question. Et `nbNoeudsSurDisque === 0` est une anomalie à part entière : une population vide
 * ferait passer tous les autres croisements au vert sans rien avoir mesuré.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * TOUT EST PUR. Aucune lecture disque, aucune écriture, aucun réseau : les documents arrivent
 * déjà analysés, ce qui permet de prouver que le contrôle ÉCHOUE sur l'état historique cassé
 * sans jamais toucher au dépôt (`tests/unitaires/noeuds-regions.test.ts`). Un garde qu'on n'a
 * pas vu se déclencher n'est pas un garde, c'est une décoration.
 */

// ────────────────────────────────────────────────────────────────────────────── les règles

/**
 * Les règles du croisement. Toutes sont BLOQUANTES : aucune ne décrit un goût, chacune décrit
 * un état du jeu où l'enfant perd quelque chose.
 */
export const REGLES = Object.freeze({
  /** Livré sur disque, cité par personne. Contenu mort, région à jamais incomplète. */
  NOEUD_INVISIBLE: 'noeud-invisible',
  /** Cité par une région, aucun fichier. La carte propose un nœud qui n'existe pas. */
  NOEUD_FANTOME: 'noeud-fantome',
  /** Cité par une région, mais son fichier en déclare une autre. */
  NOEUD_MAL_ATTRIBUE: 'noeud-mal-attribue',
  /** Cité plus d'une fois : le dénominateur du pourcentage est faussé. */
  NOEUD_CITE_DEUX_FOIS: 'noeud-cite-deux-fois',
  /** Le fichier déclare une région que `regions.json` ne connaît pas. */
  REGION_INCONNUE: 'region-inconnue',
  /** Le nœud cite un exercice qu'aucun fichier de `contenu/exercices/` ne porte. */
  EXERCICE_ABSENT: 'exercice-absent',
  /** Deux nœuds d'une même région portent le même `ordre` : l'enchaînement est ambigu. */
  ORDRE_AMBIGU: 'ordre-ambigu',
  /** Aucun nœud livré : ce n'est pas une réussite, c'est une absence de mesure. */
  POPULATION_VIDE: 'population-vide'
});

// ─────────────────────────────────────────────────────────────────────────── le croisement

/**
 * Croise les nœuds DÉCLARÉS par `regions.json` et les nœuds LIVRÉS sur disque.
 *
 * @param {{
 *   documentRegions: unknown,
 *   noeuds: ReadonlyArray<{ chemin: string, donnees: unknown }>,
 *   exercices?: ReadonlySet<string>,
 * }} entree
 *   `exercices` est l'ensemble des `id` d'exercice livrés. Omis, la règle `exercice-absent`
 *   n'est pas appliquée — le croisement reste utilisable sans cette source.
 * @returns {{
 *   nbRegions: number,
 *   nbNoeudsSurDisque: number,
 *   nbNoeudsCites: number,
 *   ecart: number,
 *   parRegion: Array<{ region: string, cites: number, surDisque: number, ecart: number }>,
 *   anomalies: Array<{ regle: string, ou: string, message: string }>,
 * }}
 */
export function croiserNoeudsEtRegions({ documentRegions, noeuds, exercices }) {
  const anomalies = [];
  const ajouter = (regle, ou, message) => anomalies.push({ regle, ou, message });

  const declarees =
    documentRegions != null &&
    typeof documentRegions === 'object' &&
    Array.isArray(documentRegions.regions)
      ? documentRegions.regions
      : [];

  /** `id` du nœud pédagogique → { chemin, region, ordre, exercice }, côté DISQUE. */
  const surDisque = new Map();
  for (const { chemin, donnees } of noeuds) {
    if (donnees == null || typeof donnees !== 'object') continue;
    // Une fiche de compatibilité d'activité libre ne participe ni à la carte ni à son
    // dénominateur. Elle est vérifiée par sa recette dédiée, pas assimilée à un nœud mort.
    if (donnees.progression === false) continue;
    surDisque.set(String(donnees.id), {
      chemin,
      region: String(donnees.region),
      ordre: Number(donnees.ordre),
      exercice: donnees.exercice === undefined ? null : String(donnees.exercice)
    });
  }

  /** `id` du nœud → les régions qui le citent, côté DOCUMENT. Une liste, pas un code. */
  const citePar = new Map();
  for (const region of declarees) {
    const code = String(region?.region ?? '');
    for (const brut of Array.isArray(region?.noeuds) ? region.noeuds : []) {
      const id = String(brut);
      const deja = citePar.get(id);
      if (deja === undefined) citePar.set(id, [code]);
      else deja.push(code);
    }
  }

  const codesDeclares = new Set(declarees.map((region) => String(region?.region ?? '')));

  // ── règle : la mesure a-t-elle seulement trouvé quelque chose à mesurer ?
  if (surDisque.size === 0) {
    ajouter(
      REGLES.POPULATION_VIDE,
      'contenu/noeuds/',
      'aucun nœud livré : tous les croisements ci-dessous passeraient au vert sans avoir ' +
        'rien comparé. Ce n’est pas une réussite, c’est une absence.'
    );
  }

  // ── règle : livré et cité par personne — LE défaut récidiviste.
  for (const [id, noeud] of surDisque) {
    if (citePar.has(id)) continue;
    ajouter(
      REGLES.NOEUD_INVISIBLE,
      noeud.chemin,
      `le nœud « ${id} » est livré et **aucune région de regions.json ne le cite**. La carte ` +
        'ne l’atteint pas, la reprise ne le propose pas, et il ne compte pas dans le ' +
        `pourcentage de recoloration : « ${noeud.region} » ne pourra jamais atteindre 100 %. ` +
        `Ajouter « ${id} » au tableau \`noeuds\` de la région « ${noeud.region} ».`
    );
  }

  // ── règle : cité et jamais livré — la carte propose un nœud qui n'existe pas.
  for (const [id, regions] of citePar) {
    if (surDisque.has(id)) continue;
    ajouter(
      REGLES.NOEUD_FANTOME,
      'contenu/monde/regions.json',
      `la région « ${regions.join(', ')} » cite le nœud « ${id} », qu’aucun fichier de ` +
        '`contenu/noeuds/` ne livre. Il gonfle le dénominateur du pourcentage : la région ' +
        'reste incomplète pour toujours, et la carte peut proposer un nœud injouable.'
    );
  }

  // ── règle : cité deux fois — le dénominateur est faux des deux côtés.
  for (const [id, regions] of citePar) {
    if (regions.length <= 1) continue;
    ajouter(
      REGLES.NOEUD_CITE_DEUX_FOIS,
      'contenu/monde/regions.json',
      `le nœud « ${id} » est cité ${String(regions.length)} fois (${regions.join(', ')}). ` +
        'Le pourcentage de recoloration divise par la longueur de la liste : une citation en ' +
        'double abaisse la part de chaque nœud sans qu’aucun décompte ne le montre.'
    );
  }

  // ── règle : cité par une région, appartenant à une autre.
  for (const [id, regions] of citePar) {
    const noeud = surDisque.get(id);
    if (noeud === undefined) continue;
    for (const code of regions) {
      if (code === noeud.region) continue;
      ajouter(
        REGLES.NOEUD_MAL_ATTRIBUE,
        noeud.chemin,
        `le nœud « ${id} » déclare la région « ${noeud.region} » et il est cité par ` +
          `« ${code} ». Il recolorie donc la mauvaise région, et la sienne reste en Grisaille.`
      );
    }
  }

  // ── règle : le nœud déclare une région que le document ne connaît pas.
  for (const [id, noeud] of surDisque) {
    if (codesDeclares.has(noeud.region)) continue;
    ajouter(
      REGLES.REGION_INCONNUE,
      noeud.chemin,
      `le nœud « ${id} » déclare la région « ${noeud.region} », absente de regions.json. ` +
        'Les six régions et leur ordre SONT la progression phonologique : on n’en invente ' +
        'pas une septième dans un fichier de nœud.'
    );
  }

  // ── règle : l'exercice cité existe. Un nœud sans exercice est un état sans issue (R14).
  if (exercices !== undefined) {
    for (const [id, noeud] of surDisque) {
      if (noeud.exercice === null || exercices.has(noeud.exercice)) continue;
      ajouter(
        REGLES.EXERCICE_ABSENT,
        noeud.chemin,
        `le nœud « ${id} » cite l’exercice « ${noeud.exercice} », qu’aucun fichier de ` +
          '`contenu/exercices/` ne porte. Le nœud est atteignable et n’a rien à jouer.'
      );
    }
  }

  // ── règle : deux nœuds d'une même région au même rang.
  const rangs = new Map();
  for (const [id, noeud] of surDisque) {
    const cle = `${noeud.region}#${String(noeud.ordre)}`;
    const deja = rangs.get(cle);
    if (deja === undefined) rangs.set(cle, [id]);
    else deja.push(id);
  }
  for (const [cle, ids] of rangs) {
    if (ids.length <= 1) continue;
    ajouter(
      REGLES.ORDRE_AMBIGU,
      'contenu/noeuds/',
      `${ids.sort().join(' et ')} portent le même rang (${cle}). L’ordre des nœuds décide de ` +
        'ce que la reprise propose ensuite ; à rang égal, il dépend de l’ordre de lecture du ' +
        'dossier, donc du système de fichiers.'
    );
  }

  // ── les deux comptes et leur écart, par région et au total. TOUJOURS rendus.
  const parRegion = declarees.map((region) => {
    const code = String(region?.region ?? '');
    const cites = Array.isArray(region?.noeuds) ? region.noeuds.length : 0;
    let compteDisque = 0;
    for (const noeud of surDisque.values()) if (noeud.region === code) compteDisque += 1;
    return { region: code, cites, surDisque: compteDisque, ecart: cites - compteDisque };
  });

  const nbNoeudsCites = [...citePar.values()].reduce((total, liste) => total + liste.length, 0);

  return {
    nbRegions: declarees.length,
    nbNoeudsSurDisque: surDisque.size,
    nbNoeudsCites,
    ecart: nbNoeudsCites - surDisque.size,
    parRegion,
    anomalies
  };
}

/**
 * Le résumé d'une ligne que `test:contenu` imprime, écart compris.
 *
 * Il nomme les DEUX comptes même quand tout va bien : un rapport qui ne dit rien tant que rien
 * ne casse ne permet jamais de vérifier qu'il mesure quelque chose.
 *
 * @param {ReturnType<typeof croiserNoeudsEtRegions>} rapport
 * @returns {string}
 */
export function resumerCroisement(rapport) {
  const detail = rapport.parRegion
    .filter((region) => region.cites > 0 || region.surDisque > 0)
    .map((region) => `${region.region} ${String(region.cites)}/${String(region.surDisque)}`)
    .join(', ');
  return (
    `${String(rapport.nbNoeudsCites)} nœud(s) cité(s) par regions.json, ` +
    `${String(rapport.nbNoeudsSurDisque)} livré(s) sur disque, écart ${String(rapport.ecart)}` +
    (detail === '' ? '' : ` [cités/livrés — ${detail}]`)
  );
}
