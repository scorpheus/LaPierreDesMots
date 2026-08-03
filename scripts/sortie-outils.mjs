/**
 * Dépouillement de la sortie brute d'un outil de test.
 *
 * Deux fonctions, extraites de `scripts/verifier.mjs` pour une seule raison : **elles portent
 * le cas qui a motivé ce lot**, et un code qui décide d'un verdict doit pouvoir être testé.
 * `verifier.mjs` exécute la chaîne au chargement ; on ne peut donc pas l'importer depuis un
 * test sans lancer dix minutes de vérification.
 *
 * Le cas en question : l'étape `test` sortait en 1 avec **zéro test en échec**, et le rapport
 * l'attribuait à un seuil de couverture qui n'y était pour rien. La vraie cause était une
 * erreur non capturée, invisible dans le rapport JSON de Vitest — elle n'existe que dans la
 * sortie. Si personne ne la nomme, l'étape échoue sans que rien n'explique pourquoi.
 */

/**
 * Retire les séquences d'échappement ANSI.
 *
 * `FORCE_COLOR=0` ne suffit pas : Vitest colore une partie de sa sortie quoi qu'il arrive, et
 * les `ESC[22m` se retrouvaient tels quels dans `tests/rapports/test.json`, puis dans les
 * tableaux de `RAPPORT.md` — qui devenaient illisibles.
 *
 * Le motif vise l'octet ESC (0x1B) suivi d'une séquence CSI, **jamais un simple crochet** :
 * sans quoi on mutilerait un message qui contient légitimement `[quelque chose]`.
 */
export function sansAnsi(texte) {
  // eslint-disable-next-line no-control-regex -- c'est précisément le caractère à retirer.
  return String(texte).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Erreurs signalées par Vitest **hors de tout test**.
 *
 * @returns {{annonce: number, erreurs: string[]}} `annonce` est le nombre que Vitest annonce
 *   lui-même (« Vitest caught N unhandled error ») ; `erreurs` sont les messages distincts.
 *
 * Une erreur non capturée n'est pas cosmétique : Vitest le dit lui-même, « this might cause
 * false positive tests ». Elle peut donc rendre VERT un test qui aurait dû rougir. Elle se
 * corrige ; elle ne s'ignore pas.
 */
export function erreursNonCapturees(sortie) {
  const propre = sansAnsi(sortie);
  const annonce = propre.match(/Vitest caught (\d+) unhandled error/i);
  if (!annonce) return { annonce: 0, erreurs: [] };

  // ── Ne lire QUE la section des erreurs non capturées.
  //
  // Le premier jet balayait toute la sortie à la recherche de lignes `Error:`. Mesuré sur le
  // journal réel de l'échec : il en remontait **4** — `ECONNREFUSED ::1:3000`,
  // `ECONNREFUSED 127.0.0.1:3000`, `TypeError: Cannot read properties of undefined` — alors
  // que Vitest n'en annonçait **1**. Les trois autres étaient du `stderr` de tests qui
  // passaient, c'est-à-dire des innocents.
  //
  // Nommer un innocent dans la cause d'un échec, c'est refaire le défaut que ce lot corrige :
  // un rapport qui envoie chercher au mauvais endroit. On se borne donc à la section que
  // Vitest délimite lui-même.
  const section = propre.slice(annonce.index);
  const erreurs = [];
  for (const ligne of section.split(/\r?\n/)) {
    // `Error:`, `TypeError:`, `AggregateError:` … en tête de ligne, indentation tolérée.
    const m = ligne.match(/^\s*((?:[A-Za-z]*Error|AggregateError):\s.+)$/);
    if (!m) continue;
    const message = m[1].trim();
    if (!erreurs.includes(message)) erreurs.push(message);
  }
  return { annonce: Number(annonce[1]), erreurs };
}
