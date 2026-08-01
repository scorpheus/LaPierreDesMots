/**
 * Contrôle structurel de remplissage d'un SVG — annexe P § 3.2, écrit à l'intégration v2.
 *
 * **Pourquoi ce fichier existe.** `validerSceneSvg` (paquet `partage`) contrôle les régions
 * d'une scène à partir de son habillage : il lui faut la liste des régions attendues. Or la
 * campagne v2 apporte 8 SVG qui ne sont pas des scènes d'exercice et n'ont donc pas
 * d'habillage — la carte du monde, le campement, les 5 stades de Gobi et son cristal. Sans
 * habillage, aucune liste de régions ; sans liste, `validerSceneSvg` n'a rien à comparer.
 *
 * Le risque de l'annexe P § 3.2 ne disparaît pas pour autant : « un trait interrompu d'un
 * pixel fait fuiter le remplissage sur toute l'image ». Il se contrôle **sans** liste de
 * régions, sur une propriété purement structurelle : **tout tracé rempli est fermé**.
 *
 * Le module est séparé de `test-contenu.mjs` pour une seule raison : un contrôle qu'aucun test
 * ne discrimine est un contrôle qu'on croit avoir. `tests/unitaires/svg-remplissage.test.ts`
 * lui donne un SVG sain, un SVG fautif, et le fichier réel du dépôt.
 */

/** Valeur d'un attribut dans une balise ouvrante, ou `null`. */
function attribut(balise, nom) {
  const trouve = new RegExp(`\\b${nom}\\s*=\\s*"([^"]*)"`).exec(balise);
  return trouve === null ? null : trouve[1].trim();
}

/**
 * Rend la liste des tracés **remplis et non fermés** d'un SVG, par `id` — ou par rang quand
 * le tracé n'a pas d'`id`, jamais en silence.
 *
 * `fill` s'HÉRITE du `<g>` parent, et c'est le cas qui décide : dans `carte-monde.svg`, les
 * cinq tracés du chemin à l'encre sont ouverts par nature (des pointillés) et ne sont pas des
 * fuites, parce que leur groupe porte `fill="none"`. Un contrôle qui ne lirait que la balise
 * du `<path>` les déclarerait tous fautifs — et cinq faux positifs suffisent à faire ignorer
 * un contrôle. D'où la pile des `fill` de `<g>`.
 *
 * Sans `fill` nulle part, la valeur par défaut de SVG est `black` : le tracé est rempli, donc
 * contrôlé. **Le doute penche vers le contrôle, jamais vers le silence.**
 *
 * @param {string} texteSvg le contenu du fichier
 * @param {(d: string) => boolean} estCheminFerme injecté depuis `@pierre/partage/validation` —
 *   la règle de fermeture est celle du paquet, elle n'est pas réimplantée ici
 * @returns {string[]}
 */
export function cheminsRemplisNonFermes(texteSvg, estCheminFerme) {
  const fautifs = [];
  const pileFill = [];
  let rang = 0;

  for (const balise of texteSvg.match(/<\/?[a-zA-Z][^>]*>/g) ?? []) {
    if (/^<g\b/.test(balise)) {
      const propre = attribut(balise, 'fill');
      pileFill.push(propre ?? pileFill[pileFill.length - 1] ?? null);
      // `<g …/>` auto-fermant : il ne contient rien, on le dépile aussitôt.
      if (/\/>$/.test(balise)) pileFill.pop();
      continue;
    }
    if (/^<\/g\b/.test(balise)) {
      pileFill.pop();
      continue;
    }
    if (!/^<path\b/.test(balise)) continue;

    rang += 1;
    const d = attribut(balise, 'd');
    if (d === null) continue;

    const fill = attribut(balise, 'fill') ?? pileFill[pileFill.length - 1] ?? 'black';
    if (fill === 'none' || fill === '') continue;

    if (!estCheminFerme(d)) {
      const id = attribut(balise, 'id');
      fautifs.push(id === null ? `<path> n° ${rang}` : id);
    }
  }
  return fautifs;
}
