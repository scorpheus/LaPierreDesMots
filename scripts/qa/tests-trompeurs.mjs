/**
 * `npm run qa:trompeurs` — le détecteur de tests qui rassurent sans rien prouver. Lot Q5.
 *
 * ── LE DÉFAUT QU'ON CHERCHE ─────────────────────────────────────────────────────────────
 *
 * Un test trompeur ne casse rien. Il fait pire : **il finance une confiance qu'il ne tient
 * pas.** Et c'est en lisant un rapport de couverture qu'on décide de NE PAS écrire un test.
 * Le projet en a déjà produit six (`Docs/audit-qa.md` § 6), dont deux qui portaient
 * explicitement le mot « contrat de sortie » :
 *
 *   • `singe.spec.ts` affirmait « aucun état sans issue » en mesurant `interactifs > 0` —
 *     exactement ce que D48 condamne : *« compter les éléments interactifs n'est pas compter
 *     les sorties »* ;
 *   • `parcours-audit-moteurs.spec.ts` imprimait « N moteurs joués sur 14 » et assertait
 *     `> 0` : il serait resté vert **à 1 sur 14** — le défaut n° 6 de l'historique, dans le
 *     fichier même qui prétendait l'avoir soldé ;
 *   • `zz-sonde-h3.test.ts` : 42 lignes, 7 `console.log`, **0 `expect(`**, et il a tourné
 *     dans `npm run test`.
 *
 * ── LES SIX DÉTECTEURS ──────────────────────────────────────────────────────────────────
 *
 * | code | ce qu'il attrape | gravité |
 * |---|---|---|
 * | `TEST-DESACTIVE`              | `.skip` / `.only` / `.todo` — la règle non négociable qui n'avait aucun garde | **bloquant** |
 * | `FICHIER-SANS-ASSERTION`      | un fichier de test sans un seul `expect(` | **bloquant** |
 * | `CAS-SANS-ASSERTION`          | un `it(...)` qui n'assert rien, ni directement ni par une aide | **bloquant** |
 * | `FRACTION-NON-ASSERTEE`       | on imprime « X sur Y » et aucune assertion ne relie X à Y | avertissement |
 * | `CHIFFRE-JAMAIS-ASSERTE`      | un chiffre imprimé qui n'entre dans aucune assertion du cas | avertissement |
 * | `ASSERTION-TAUTOLOGIQUE`      | le sujet de l'assertion est aussi son attendu | avertissement |
 * | `MESSAGE-QUI-SURPROMET`       | le message affirme une propriété que le matcher ne mesure pas | avertissement |
 *
 * ── LA RÈGLE D'ÉCHEC, ET SON CLIQUET ────────────────────────────────────────────────────
 *
 * **Bloquants : tolérance zéro.** Un test sans assertion est un mensonge dans le rapport ;
 * CLAUDE.md l'écrit déjà pour le `skip`, c'est la même faute par un autre chemin.
 *
 * **Avertissements : un PLAFOND gelé**, mesuré, qui ne peut que descendre. Un plafond plutôt
 * qu'un zéro parce que ces six détecteurs sont des heuristiques : elles lisent du texte, pas
 * une intention. Un plafond fait deux choses qu'un zéro ne fait pas — il empêche d'en ajouter,
 * et il rend visible chaque fois qu'on en retire un (le banc réclame alors de le resserrer).
 *
 * **Le détecteur échoue aussi si sa population est nulle.** Un détecteur qui n'a rien
 * énuméré et qui sort en vert est lui-même un test trompeur — ce serait un comble.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DOSSIER_TESTS = join(RACINE, 'tests');
const DOSSIER_QA = join(RACINE, 'tests', 'rapports', 'qa');
const CHEMIN_JSON = join(DOSSIER_QA, 'tests-trompeurs.json');

/**
 * Le plafond d'avertissements. **Mesuré le 2026-08-02 sur le dépôt, jamais deviné.**
 *
 * Il ne descend qu'à la main, et seulement après avoir corrigé un test. Le monter est une
 * décision qui se justifie par écrit dans `Docs/questions-en-attente.md` — sans quoi le
 * cliquet se desserre et le détecteur ne sert plus à rien.
 *
 * ── À RE-GELER, ET POURQUOI CE N'EST PAS UN DÉTAIL ──────────────────────────────────────
 *
 * Cette valeur a été posée **pendant que six campagnes écrivaient dans `tests/`**. Mesurée
 * quatre fois en une heure, elle a donné 40, 49, 57 puis 66 — sans qu'aucun test existant ne
 * se dégrade : ce sont de nouveaux tests qui impriment de nouveaux chiffres. Le nombre décrit
 * donc un dépôt en mouvement, pas un état.
 *
 * **Premier geste de l'orchestrateur, deux secondes, avant le premier commit** (le détecteur
 * est au `pre-commit`) :
 *
 *     npm run qa:trompeurs        # lire la ligne « avertissements » et la recopier ici
 *
 * La commande imprime elle-même la valeur à écrire dès qu'elle mesure moins que le plafond.
 *
 * ── RE-GELÉ À 98 LE 2026-08-08, ET C'EST UNE DETTE, PAS UN PARDON ───────────────────────
 * Le geste que le paragraphe ci-dessus réclamait — re-geler avant le premier commit — n'avait
 * jamais été fait. Mesuré ce matin, en deux temps :
 *
 *     avant la correction du masquage   92
 *     après                             98
 *
 * Les 26 premiers viennent de la nuit du 7 au 8 : sept gardes neuves et leurs bancs, qui
 * impriment des chiffres sans toujours les asserter. Les **6 derniers sont des détections
 * réelles que le masquage cassé effaçait** — une regex portant un guillemet blanchissait la
 * fin de son fichier, et tout ce qui suivait échappait à l'analyse. Le plafond montait donc
 * moins vite que la dette, ce qui est le pire des deux mondes : un cliquet qui rassure.
 *
 * Aucun test existant ne s'est dégradé. Mesuré le 2026-09-02, ce travail restant est descendu à
 * 93 avertissements — 61 `CHIFFRE-JAMAIS-ASSERTE`,
 * 23 `FRACTION-NON-ASSERTEE`, 7 `MESSAGE-QUI-SURPROMET` et
 * 2 `ASSERTION-TAUTOLOGIQUE`. Justification historique : `Docs/questions-en-attente.md`, entrée
 * « Le plafond des tests trompeurs ».
 */
export const PLAFOND_AVERTISSEMENTS = 93;

// ────────────────────────────────────────────────────────── lecture et masquage du code

/** Tous les fichiers sous `tests/`, filtrés par une extension. */
function fichiersSous(dossier, garder) {
  if (!existsSync(dossier)) return [];
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === 'rapports' || entree.name === 'node_modules') continue;
      trouves.push(...fichiersSous(chemin, garder));
    } else if (garder(entree.name)) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

/**
 * Le dernier caractère significatif avant `i` autorise-t-il un littéral d'expression
 * régulière ? C'est la seule façon de distinguer `/["\\]/g` d'une division `a / b`.
 *
 * On regarde en arrière en sautant les blancs. Une regex ne peut commencer qu'en POSITION
 * D'EXPRESSION : après un opérateur, une virgule, une parenthèse ou une accolade ouvrante,
 * un `return`, ou en début de fichier. Après un identifiant, un nombre ou une parenthèse
 * FERMANTE, le `/` est une division.
 */
function positionDExpression(source, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(source[k])) k -= 1;
  if (k < 0) return true;
  const c = source[k];
  if ('(,=:[!&|?{};+-*%<>~^'.includes(c)) return true;
  // `return /…/`, `typeof /…/`, `case /…/` : un mot-clé, jamais un identifiant.
  const mot = /([A-Za-z_$][\w$]*)$/.exec(source.slice(Math.max(0, k - 15), k + 1));
  return mot !== null && ['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'yield', 'await'].includes(mot[1]);
}

/**
 * Remplace le CONTENU des commentaires, des chaînes **et des expressions régulières** par des
 * espaces, **en gardant les longueurs et donc tous les décalages**.
 *
 * C'est ce qui rend l'équilibrage de parenthèses fiable : sans ça, un `'it('` dans un message
 * ou une accolade dans un commentaire fausse tout le découpage, et le détecteur se met à
 * mentir — ce qu'il est justement chargé de traquer.
 *
 * ── LE CAS DES REGEX, AJOUTÉ LE 2026-08-08 APRÈS UN FAUX BLOQUANT ─────────────────────────
 * `parcours-aucun-geste-mort.spec.ts` a été déclaré « aucun `expect(` dans tout le fichier »
 * alors qu'il en porte QUATRE, mesurés. La cause tient en une ligne, la 178 du fichier
 * accusé :
 *
 *     valeur.replace(/["\\]/g, '\\$&')
 *
 * Le masquage ne connaissait pas les littéraux d'expression régulière. Il a vu le `"` À
 * L'INTÉRIEUR de la regex, cru qu'une chaîne s'ouvrait, cherché sa fermeture jusqu'à la fin
 * du fichier — et blanchi les 19 000 octets restants, assertions comprises.
 *
 * Ce défaut est exactement celui que ce script existe pour traquer, retourné contre lui :
 * **un détecteur qui rend un verdict BLOQUANT sur une mesure qu'il a lui-même détruite.** Et
 * il coûtait cher, parce qu'il est branché en `pre-commit` : il refusait un fichier
 * parfaitement assertif, et le seul recours apparent était de le contourner.
 *
 * Le contrôle positif vit dans `tests/unitaires/tests-trompeurs-masquage.test.ts` : une regex
 * portant un guillemet ne doit pas emporter le code qui la suit, et une VRAIE division ne doit
 * pas être prise pour une regex.
 * ──────────────────────────────────────────────────────────────────────────────────────────
 */
function masquer(source) {
  const sortie = source.split('');
  let i = 0;
  const n = source.length;
  const blanchir = (debut, fin) => {
    for (let k = debut; k < fin && k < n; k += 1) {
      if (sortie[k] !== '\n' && sortie[k] !== '\r') sortie[k] = ' ';
    }
  };
  while (i < n) {
    const c = source[i];
    const d = source[i + 1];
    if (c === '/' && d === '/') {
      let fin = source.indexOf('\n', i);
      if (fin === -1) fin = n;
      blanchir(i, fin);
      i = fin;
    } else if (c === '/' && d === '*') {
      let fin = source.indexOf('*/', i + 2);
      fin = fin === -1 ? n : fin + 2;
      blanchir(i, fin);
      i = fin;
    } else if (c === '/' && positionDExpression(source, i)) {
      // Un littéral regex. On avance jusqu'au `/` de fin, en sautant les échappements et en
      // ignorant les `/` qui vivent dans une classe `[…]` — `/[/]/` est légal.
      let k = i + 1;
      let dansUneClasse = false;
      let ferme = -1;
      while (k < n && source[k] !== '\n') {
        const e = source[k];
        if (e === '\\') { k += 2; continue; }
        if (e === '[') dansUneClasse = true;
        else if (e === ']') dansUneClasse = false;
        else if (e === '/' && !dansUneClasse) { ferme = k; break; }
        k += 1;
      }
      if (ferme === -1) {
        // Pas de fermeture sur la ligne : ce n'était pas une regex. On ne blanchit RIEN —
        // se tromper dans ce sens efface du code, et c'est la faute qu'on vient de payer.
        i += 1;
      } else {
        blanchir(i + 1, ferme);
        i = ferme + 1;
      }
    } else if (c === '"' || c === "'" || c === '`') {
      const guillemet = c;
      let k = i + 1;
      while (k < n) {
        if (source[k] === '\\') { k += 2; continue; }
        if (source[k] === guillemet) break;
        k += 1;
      }
      blanchir(i + 1, k);
      i = k + 1;
    } else {
      i += 1;
    }
  }
  return sortie.join('');
}

/** Depuis l'index de la parenthèse ouvrante, l'index de sa fermante. `-1` si déséquilibré. */
function fermante(masque, indexOuvrante, ouvrant = '(', fermant = ')') {
  let profondeur = 0;
  for (let k = indexOuvrante; k < masque.length; k += 1) {
    if (masque[k] === ouvrant) profondeur += 1;
    else if (masque[k] === fermant) {
      profondeur -= 1;
      if (profondeur === 0) return k;
    }
  }
  return -1;
}

// ──────────────────────────────────────────────────────────────── découpage en cas

/** Les modificateurs qui DÉSACTIVENT un cas. CLAUDE.md : « un test désactivé est un mensonge ». */
const MODIFICATEURS_QUI_DESACTIVENT = new Set(['skip', 'only', 'todo', 'fails', 'fixme']);

/**
 * TOUS les modificateurs qui peuvent précéder l'appel d'un cas. Tout autre suffixe veut dire
 * que ce n'est **pas** un cas : `test.describe(…)`, `test.beforeEach(…)`, `test.step(…)` et
 * `test.use(…)` de Playwright en sont, et les prendre pour des cas signalait
 * `tests/visuel/polices.spec.ts` « sans assertion » alors qu'il s'agissait d'un `beforeEach`.
 */
const MODIFICATEURS_CONNUS = new Set([
  'skip', 'only', 'todo', 'fails', 'fixme',
  'each', 'for', 'skipIf', 'runIf', 'extend',
  'concurrent', 'sequential', 'slow'
]);

/**
 * Les seuls modificateurs qui prennent un argument. **La distinction est nécessaire, pas
 * cosmétique** : sans elle, `it.skip('titre', …)` faisait consommer `('titre', …)` comme s'il
 * s'agissait de l'argument de `.skip`, l'appel du cas n'était plus trouvé, et le `.skip`
 * n'était jamais signalé. Mesuré sur un fichier de preuve écrit exprès, corrigé, re-mesuré.
 */
const MODIFICATEURS_AVEC_ARGUMENT = new Set(['each', 'for', 'skipIf', 'runIf', 'extend']);

/**
 * Les `it(...)` / `test(...)` du fichier, avec leur portée exacte dans la source.
 *
 * Écrit à la main plutôt qu'en une expression régulière, et pour une raison mesurée : la
 * chaîne de modificateurs de Vitest peut porter des parenthèses IMBRIQUÉES —
 * `it.each(registre.map((e) => [e.f, e]))(…)`. Un `\([^)]*\)` s'arrête à la première
 * fermante, désigne la mauvaise parenthèse ouvrante, et le corps du cas n'est jamais lu :
 * `registre-svg.test.ts` était signalé deux fois « sans assertion » alors qu'il en porte
 * quatre. **Un analyseur qui ne sait pas équilibrer ne doit pas prétendre découper.**
 */
function casDeTest(source, masque) {
  const cas = [];
  const desactives = [];
  const noms = /(?<![.\w$])(it|test)(?![\w$])/g;
  let trouve;
  while ((trouve = noms.exec(masque)) !== null) {
    let k = trouve.index + trouve[1].length;
    let desactivePar = null;
    let estUnCas = true;
    // La chaîne de modificateurs : `.each(…)`, `.skip`, `.concurrent`, `` .each`…` ``…
    for (;;) {
      while (k < masque.length && /\s/.test(masque[k])) k += 1;
      if (masque[k] !== '.') break;
      const identifiant = /^\s*\.\s*([A-Za-z]+)/.exec(masque.slice(k));
      if (identifiant === null) break;
      if (!MODIFICATEURS_CONNUS.has(identifiant[1])) { estUnCas = false; break; }
      if (MODIFICATEURS_QUI_DESACTIVENT.has(identifiant[1])) desactivePar = identifiant[1];
      const prendUnArgument = MODIFICATEURS_AVEC_ARGUMENT.has(identifiant[1]);
      k += identifiant[0].length;
      while (k < masque.length && /\s/.test(masque[k])) k += 1;
      if (!prendUnArgument) continue;
      if (masque[k] === '(') {
        const finArg = fermante(masque, k);
        if (finArg === -1) break;
        k = finArg + 1;
      } else if (masque[k] === '`') {
        const finGabarit = masque.indexOf('`', k + 1);
        if (finGabarit === -1) break;
        k = finGabarit + 1;
      }
    }
    if (!estUnCas || masque[k] !== '(') continue; // ce n'était pas un appel de cas
    const ouvrante = k;
    const fin = fermante(masque, ouvrante);
    if (fin === -1) continue;

    const arguments_ = source.slice(ouvrante + 1, fin);
    const titre = /^\s*[`'"]([^`'"]*)/.exec(arguments_)?.[1] ?? '(titre illisible)';
    const ligne = source.slice(0, trouve.index).split('\n').length;

    // **Un cas de test a un corps.** `test.slow()` et `test.describe.configure()` n'en ont
    // pas ; `it.todo('titre')` n'en a pas non plus, et c'est justement pour ça qu'il compte
    // comme désactivé. Sans cette distinction, `test.slow()` de `cassecou.spec.ts` était
    // signalé « cas sans assertion » — le détecteur inventait un test pour le condamner.
    const aUnCorps = /=>|function/.test(masque.slice(ouvrante, fin));
    if (desactivePar !== null && arguments_.trim().length > 0) {
      desactives.push({ titre, ligne, modificateur: desactivePar });
    }
    if (aUnCorps) cas.push({ titre, debut: ouvrante, fin: fin + 1, ligne, desactivePar });
    noms.lastIndex = fin;
  }
  // Un `it` imbriqué dans un autre n'existe pas ; on garde les cas de plus haut niveau.
  const retenus = cas.filter(
    (c, index) => !cas.some((autre, j) => j !== index && autre.debut < c.debut && autre.fin > c.fin)
  );
  retenus.desactives = desactives;
  return retenus;
}

// ──────────────────────────────────────────────────────── extraction des assertions

/**
 * Les `expect(sujet, message).matcher(attendu)` d'un fragment.
 * @returns {{sujet: string, message: string|null, matcher: string, attendu: string, ligneRelative: number}[]}
 */
function assertionsDe(fragment, masqueFragment) {
  const assertions = [];
  const motif = /\bexpect\s*(?:\.\s*soft\s*)?\(/g;
  let trouve;
  while ((trouve = motif.exec(masqueFragment)) !== null) {
    const ouvrante = masqueFragment.indexOf('(', trouve.index + 6);
    const fin = fermante(masqueFragment, ouvrante);
    if (fin === -1) continue;
    const arguments_ = fragment.slice(ouvrante + 1, fin);

    // Découpe sujet / message sur la virgule de PREMIER niveau.
    const masqueArgs = masqueFragment.slice(ouvrante + 1, fin);
    let profondeur = 0;
    let coupe = -1;
    for (let k = 0; k < masqueArgs.length; k += 1) {
      const c = masqueArgs[k];
      if (c === '(' || c === '[' || c === '{') profondeur += 1;
      else if (c === ')' || c === ']' || c === '}') profondeur -= 1;
      else if (c === ',' && profondeur === 0) { coupe = k; break; }
    }
    const sujet = (coupe === -1 ? arguments_ : arguments_.slice(0, coupe)).trim();
    const message = coupe === -1 ? null : arguments_.slice(coupe + 1).trim();

    // La chaîne de matchers qui suit : `.not.toBe(…)`, `.resolves.toEqual(…)`, …
    const suite = masqueFragment.slice(fin + 1);
    const chaine = /^((?:\s*\.\s*[A-Za-z]+)+)\s*\(/.exec(suite);
    let matcher = '(aucun)';
    let attendu = '';
    if (chaine !== null) {
      matcher = chaine[1].replace(/\s+/g, '');
      const ouvranteAttendu = fin + 1 + chaine[0].length - 1;
      const finAttendu = fermante(masqueFragment, ouvranteAttendu);
      if (finAttendu !== -1) attendu = fragment.slice(ouvranteAttendu + 1, finAttendu).trim();
    }
    assertions.push({
      sujet,
      message,
      matcher,
      attendu,
      ligneRelative: fragment.slice(0, trouve.index).split('\n').length
    });
    motif.lastIndex = fin;
  }
  return assertions;
}

/** Les expressions interpolées dans les `console.log` d'un fragment. */
function chiffresImprimes(fragment) {
  const trouves = [];
  const motifLog = /console\s*\.\s*(?:log|info|warn)\s*\(/g;
  let trouve;
  const masqueFragment = masquer(fragment);
  while ((trouve = motifLog.exec(masqueFragment)) !== null) {
    const ouvrante = masqueFragment.indexOf('(', trouve.index);
    const fin = fermante(masqueFragment, ouvrante);
    if (fin === -1) continue;
    const texte = fragment.slice(ouvrante + 1, fin);
    for (const interpolation of texte.matchAll(/\$\{([^}]+)\}/g)) {
      const expression = interpolation[1].trim();
      // On ne s'intéresse qu'aux GRANDEURS : un nom imprimé n'a rien à asserter.
      if (/\.length\b|\bnb[A-Z]|\btotal\b|\bcompte\b|\becart\b|\bnombre\b|\.size\b|\bpourcent/i.test(expression)) {
        trouves.push({
          expression,
          ligneRelative: fragment.slice(0, trouve.index).split('\n').length
        });
      }
    }
    motifLog.lastIndex = fin;
  }
  return trouves;
}

/**
 * Les aides du fichier qui assertent pour le compte d'un cas.
 *
 * `parametres-pedagogie.test.ts` déclare `function refuse(muter) { … expect(…) … }` et huit
 * de ses cas n'appellent que `refuse(...)`. Ils assertent parfaitement ; un détecteur qui
 * cherche `expect(` dans le corps du cas les déclare vides. **On énumère donc les OBJETS —
 * les fonctions qui assertent — et pas les occurrences du mot `expect`** (D48, un cran plus
 * haut). Sans ça : huit faux positifs bloquants, et un détecteur qu'on désactive.
 */
function aidesQuiAssertent(source, masque) {
  const noms = new Set();
  const motif = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function))/g;
  let trouve;
  while ((trouve = motif.exec(masque)) !== null) {
    const nom = trouve[1] ?? trouve[2];
    if (nom === undefined) continue;
    // Le corps : la première accolade ouvrante après la déclaration, équilibrée.
    const accolade = masque.indexOf('{', trouve.index);
    if (accolade === -1) continue;
    const finCorps = fermante(masque, accolade, '{', '}');
    if (finCorps === -1) continue;
    if (EST_UNE_ASSERTION.test(masque.slice(accolade, finCorps))) noms.add(nom);
  }
  return noms;
}

/** Le cœur d'une expression : `String(MOTEURS.length)` → `MOTEURS.length`. */
function noyau(expression) {
  return expression
    .replace(/^\s*String\s*\(/, '')
    .replace(/\)\s*$/, '')
    .replace(/\s+/g, '');
}

// ──────────────────────────────────────────────────────────────────── détecteurs

/**
 * Le vocabulaire des messages qui PROMETTENT une propriété forte.
 *
 * Court, et tiré du dépôt : ce sont les mots de D48 — « aucun état sans issue », « mène
 * ailleurs », « contrat de sortie ». Le premier jet y avait mis « jamais », « chaque »,
 * « atteignable », « couvert » : quatre mots que tout bon message de test emploie, d'où
 * quinze faux positifs sur des assertions justes. **Un détecteur trop large se fait
 * désactiver, ce qui est pire que de ne rien détecter.**
 */
const MOTS_QUI_PROMETTENT = [
  'sans issue', 'mène ailleurs', 'mene ailleurs', 'sortie', 'issue',
  'contrat de sortie', 'aucun écran', 'aucun ecran', 'exhaustif', 'exhaustive'
];

/**
 * Un matcher est FAIBLE quand il ne mesure qu'une **présence**. `.toBeGreaterThan(0)` l'est ;
 * `.toBeGreaterThanOrEqual(1)` sur un nombre d'étoiles ne l'est pas — c'est une borne métier
 * (R14, « la première étoile est toujours acquise »). La distinction se fait sur l'ATTENDU,
 * jamais sur le seul nom du matcher.
 */
function matcherFaible(matcher, attendu) {
  const valeur = attendu.trim();
  if (matcher === '.toBeTruthy' || matcher === '.toBeDefined') return true;
  if (matcher === '.toBeGreaterThan' && valeur === '0') return true;
  if (matcher === '.not.toHaveLength' && valeur === '0') return true;
  return false;
}

/**
 * Ce qui compte comme une assertion. `expect` n'est pas la seule : `fc.assert(fc.property(…))`
 * de fast-check LÈVE sur contre-exemple, et six tests de propriété du dépôt ne portent qu'elle.
 * Les compter comme « sans assertion » aurait été un faux positif de plus.
 */
const EST_UNE_ASSERTION =
  /\bexpect\s*[.(]|\bfc\s*\.\s*assert\s*\(|\bassert\s*[.(]|\.toMatchSnapshot\s*\(|\btoThrow\w*\s*\(/;

/** Une valeur littérale : `true`, `0`, `'x'`, `[]`. */
function estLitteral(texte) {
  return /^(true|false|null|undefined|-?\d+(\.\d+)?|['"`].*['"`]|\[\s*\]|\{\s*\})$/.test(texte.trim());
}

function analyser(chemin) {
  const relatif = relative(RACINE, chemin).replace(/\\/g, '/');
  const source = readFileSync(chemin, 'utf8');
  const masque = masquer(source);
  const constats = [];

  if (!EST_UNE_ASSERTION.test(masque)) {
    constats.push({
      code: 'FICHIER-SANS-ASSERTION',
      gravite: 'bloquant',
      fichier: relatif,
      ligne: 1,
      cas: '(fichier entier)',
      quoi: 'aucun `expect(` dans tout le fichier — il s’exécute et ne prouve rien',
      remede: 'ajouter au moins une assertion, ou retirer le fichier de la suite'
    });
  }

  const aides = aidesQuiAssertent(source, masque);
  const cas = casDeTest(source, masque);

  // ── 0. le test désactivé — la règle non négociable qui n'avait aucun garde
  //
  // CLAUDE.md : « ne jamais mettre un test en `skip` […] un test désactivé est un mensonge
  // dans le rapport ». La règle est écrite depuis le premier jour et RIEN ne la vérifiait :
  // `grep -rn "\.skip(" tests/` était le seul contrôle, et il n'était dans aucune commande.
  for (const d of cas.desactives ?? []) {
    constats.push({
      code: 'TEST-DESACTIVE',
      gravite: 'bloquant',
      fichier: relatif,
      ligne: d.ligne,
      cas: d.titre,
      quoi: `\`.${d.modificateur}\` — le cas ne s’exécute pas et le rapport le compte comme passé`,
      remede:
        d.modificateur === 'only'
          ? '`.only` masque TOUS les autres cas du fichier : le retirer avant de pousser'
          : 'réactiver le cas et corriger le code, jamais l’inverse (CLAUDE.md, règle non négociable)'
    });
  }
  for (const bloc of masque.matchAll(/(?<![.\w$])describe\s*\.\s*(skip|only|todo)/g)) {
    constats.push({
      code: 'TEST-DESACTIVE',
      gravite: 'bloquant',
      fichier: relatif,
      ligne: source.slice(0, bloc.index).split('\n').length,
      cas: '(un `describe` entier)',
      quoi: `\`describe.${bloc[1]}\` — tout un bloc de cas est neutralisé`,
      remede: 'réactiver le bloc et corriger le code (CLAUDE.md, règle non négociable)'
    });
  }

  for (const c of cas) {
    const fragment = source.slice(c.debut, c.fin);
    const masqueFragment = masque.slice(c.debut, c.fin);
    const assertions = assertionsDe(fragment, masqueFragment);
    const nommer = (l) => c.ligne + l - 1;

    // ── 1. un cas qui n'assert rien
    if (assertions.length === 0 && !EST_UNE_ASSERTION.test(masqueFragment)) {
      // Une aide du fichier peut asserter pour lui — voir `aidesQuiAssertent`.
      const appelleUneAide = [...aides].some((nom) =>
        new RegExp(`(?<![.\\w$])${nom}\\s*\\(`).test(masqueFragment)
      );
      if (!appelleUneAide) {
        constats.push({
          code: 'CAS-SANS-ASSERTION',
          gravite: 'bloquant',
          fichier: relatif,
          ligne: c.ligne,
          cas: c.titre,
          quoi: 'ce cas n’assert rien : il passe quoi qu’il arrive',
          remede: 'écrire l’assertion que le titre promet'
        });
      }
    }

    // ── 2. une fraction imprimée que rien ne relie
    const imprimes = chiffresImprimes(fragment);
    const noyauxImprimes = [...new Set(imprimes.map((i) => noyau(i.expression)))];
    let fractionSignalee = false;
    if (noyauxImprimes.length >= 2) {
      const relie = assertions.some((a) => {
        const gauche = noyau(a.sujet);
        const droite = noyau(a.attendu);
        return noyauxImprimes.some(
          (x) => gauche.includes(x) && noyauxImprimes.some((y) => y !== x && droite.includes(y))
        );
      });
      // Une fraction peut être tenue AUTREMENT que par une comparaison des deux nombres :
      // `expect(manquants).toEqual([])` épingle le numérateur à une valeur exacte, ce qui est
      // plus fort qu'une fraction. Cinq cas du dépôt font ainsi. On ne signale donc que les
      // cas où AUCUNE assertion d'égalité ne porte sur l'une des grandeurs imprimées — c'est
      // exactement la forme du § 6.2 de l'audit (« vert à 1 moteur sur 14 »), où les deux
      // assertions sont des bornes (`>= 14`, `> 0`) et aucune une égalité.
      const racine = (expression) => expression.split(/[.[(]/)[0];
      const racinesImprimees = new Set(noyauxImprimes.map(racine));
      const epingle = assertions.some(
        (a) =>
          /\.(toBe|toEqual|toStrictEqual|toHaveLength)$/.test(a.matcher) &&
          racinesImprimees.has(racine(noyau(a.sujet)))
      );

      if (!relie && !epingle) {
        fractionSignalee = true;
        constats.push({
          code: 'FRACTION-NON-ASSERTEE',
          gravite: 'avertissement',
          fichier: relatif,
          ligne: nommer(imprimes[0].ligneRelative),
          cas: c.titre,
          quoi:
            `« ${noyauxImprimes.join(' » et « ')} » sont imprimés côte à côte et aucune ` +
            'assertion ne les compare : le cas resterait vert à 1 sur 14',
          remede: `asserter la fraction : expect(${noyauxImprimes[0]}).toBe(${noyauxImprimes[1]})`
        });
      }
    }

    // ── 3. un chiffre imprimé qui n'entre dans aucune assertion
    //
    // Sauté quand la fraction a déjà parlé : deux constats pour un seul défaut noient le
    // rapport, et un rapport noyé ne se lit pas.
    for (const noyauImprime of fractionSignalee ? [] : noyauxImprimes) {
      const asserte = assertions.some(
        (a) => noyau(a.sujet).includes(noyauImprime) || noyau(a.attendu).includes(noyauImprime)
      );
      if (!asserte) {
        constats.push({
          code: 'CHIFFRE-JAMAIS-ASSERTE',
          gravite: 'avertissement',
          fichier: relatif,
          ligne: nommer(imprimes.find((i) => noyau(i.expression) === noyauImprime)?.ligneRelative ?? 1),
          cas: c.titre,
          quoi: `« ${noyauImprime} » est imprimé et n’entre dans aucune assertion du cas`,
          remede: 'l’asserter, ou cesser de l’imprimer — un chiffre au rapport engage'
        });
      }
    }

    for (const a of assertions) {
      const gauche = noyau(a.sujet);
      const droite = noyau(a.attendu);

      // ── 4. tautologie
      //
      // Deux garde-fous, tous deux payés par des faux positifs mesurés :
      //
      //   • **frontières de jeton, jamais sous-chaîne.** `expect(rang).toBeGreaterThanOrEqual(rangAide)`
      //     et `expect(traits.length).toBe(contenuBd.lettres[0]!.traits.length)` sont des
      //     assertions justes que la simple inclusion de texte condamnait.
      //   • **un sujet APPELÉ n'est pas son propre attendu.** `expect(suite(42, 64)).toEqual(suite(42, 64))`
      //     compare DEUX exécutions : c'est le test de déterminisme d'`Alea`, la propriété la
      //     plus importante du fichier. Le signaler aurait discrédité le détecteur d'un coup.
      const sujetEstUnChemin = !gauche.includes('(') && gauche.length > 2;
      const memeJeton =
        sujetEstUnChemin &&
        droite.length > 0 &&
        new RegExp(`(?<![.\\w$])${gauche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`).test(droite);
      const tautologie =
        memeJeton ||
        (estLitteral(a.sujet) && estLitteral(a.attendu) && a.matcher !== '(aucun)') ||
        a.matcher === '.toBeGreaterThanOrEqual' && droite === '0' && /\.length$|\.size$/.test(gauche) ||
        a.matcher === '.toBeGreaterThan' && droite === '-1' && /\.length$|\.size$/.test(gauche);
      if (tautologie) {
        constats.push({
          code: 'ASSERTION-TAUTOLOGIQUE',
          gravite: 'avertissement',
          fichier: relatif,
          ligne: nommer(a.ligneRelative),
          cas: c.titre,
          quoi: `expect(${a.sujet.slice(0, 60)})${a.matcher}(${a.attendu.slice(0, 60)}) — le sujet est son propre attendu`,
          remede: 'écrire l’intention : un attendu qui ne dépend pas du sujet'
        });
      }

      // ── 5. un message qui promet plus que le matcher ne mesure
      if (a.message !== null && matcherFaible(a.matcher, a.attendu)) {
        const enMinuscules = a.message.toLowerCase();
        const promesse = MOTS_QUI_PROMETTENT.find((mot) => enMinuscules.includes(mot));
        if (promesse !== undefined && !tautologie) {
          constats.push({
            code: 'MESSAGE-QUI-SURPROMET',
            gravite: 'avertissement',
            fichier: relatif,
            ligne: nommer(a.ligneRelative),
            cas: c.titre,
            quoi:
              `le message dit « …${promesse}… » mais le matcher est ${a.matcher}(${a.attendu.slice(0, 20)}) : ` +
              'il mesure une PRÉSENCE, pas la propriété annoncée (D48)',
            remede:
              'corriger le MESSAGE pour qu’il dise ce qui est mesuré, ou renforcer l’assertion — ' +
              'jamais retirer l’assertion'
          });
        }
      }
    }
  }

  return { fichier: relatif, nbCas: cas.length, constats };
}

// ──────────────────────────────────────────────────────────────────── exécution

const fichiers = fichiersSous(DOSSIER_TESTS, (nom) => /\.(test|spec)\.tsx?$/.test(nom));
const analyses = fichiers.map(analyser);
const constats = analyses.flatMap((a) => a.constats);

const bloquants = constats.filter((c) => c.gravite === 'bloquant');
const avertissements = constats.filter((c) => c.gravite === 'avertissement');
const nbCas = analyses.reduce((somme, a) => somme + a.nbCas, 0);

const parCode = {};
for (const c of constats) parCode[c.code] = (parCode[c.code] ?? 0) + 1;

console.log('');
console.log('╭─ Détecteur de tests trompeurs — La Pierre des Mots');
console.log(`│  population : ${fichiers.length} fichier(s) de test, ${nbCas} cas`);
console.log('╰─ un test qui rassure sans rien prouver coûte plus qu’un test absent');
console.log('');

for (const gravite of ['bloquant', 'avertissement']) {
  const lot = constats.filter((c) => c.gravite === gravite);
  if (lot.length === 0) continue;
  console.log(`── ${gravite.toUpperCase()}S (${lot.length})`);
  for (const c of lot) {
    console.log(`  ${c.fichier}:${c.ligne}  [${c.code}]`);
    console.log(`    cas    : ${c.cas.slice(0, 90)}`);
    console.log(`    défaut : ${c.quoi}`);
    console.log(`    remède : ${c.remede}`);
  }
  console.log('');
}

console.log('── Contrat de sortie ──────────────────────────────────────────────');
console.log(`fichiers de test analysés     ${fichiers.length}`);
console.log(`cas de test analysés          ${nbCas}`);
console.log(`bloquants                     ${bloquants.length}   (tolérance : 0)`);
console.log(`avertissements                ${avertissements.length}   (plafond : ${PLAFOND_AVERTISSEMENTS})`);
for (const [code, n] of Object.entries(parCode).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${code.padEnd(26)} ${n}`);
}
console.log('');

const echecs = [];
if (fichiers.length === 0)
  echecs.push('population NULLE : aucun fichier de test énuméré — le détecteur ne mesure rien');
if (nbCas === 0)
  echecs.push('aucun cas de test découpé — le découpage est cassé, pas le dépôt');
if (bloquants.length > 0)
  echecs.push(`${bloquants.length} test(s) sans aucune assertion — tolérance zéro`);
if (avertissements.length > PLAFOND_AVERTISSEMENTS)
  echecs.push(
    `${avertissements.length} avertissements pour un plafond de ${PLAFOND_AVERTISSEMENTS} : ` +
      'corriger les nouveaux, ou justifier par écrit la montée du plafond'
  );

mkdirSync(DOSSIER_QA, { recursive: true });
writeFileSync(
  CHEMIN_JSON,
  `${JSON.stringify(
    {
      etape: 'qa:trompeurs',
      ecritLe: new Date().toISOString(),
      nbFichiers: fichiers.length,
      nbCas,
      bloquants: bloquants.length,
      avertissements: avertissements.length,
      plafondAvertissements: PLAFOND_AVERTISSEMENTS,
      parCode,
      constats,
      echecs
    },
    null,
    2
  )}\n`,
  'utf8'
);
console.log('Rapport machine : tests/rapports/qa/tests-trompeurs.json');
console.log('');

if (avertissements.length < PLAFOND_AVERTISSEMENTS) {
  console.log(
    `🎉 Le cliquet peut se resserrer : PLAFOND_AVERTISSEMENTS = ${avertissements.length} ` +
      `dans scripts/qa/tests-trompeurs.mjs (il vaut ${PLAFOND_AVERTISSEMENTS}).`
  );
  console.log('');
}

if (echecs.length === 0) {
  console.log('✅ VERT');
  process.exit(0);
}
console.log('❌ ROUGE :');
for (const e of echecs) console.log(`   · ${e}`);
process.exit(1);
