/**
 * CINQ MUTATIONS QUE PERSONNE N'AVAIT ANTICIPÉES — l'épreuve de généralisation de la QA.
 *
 * ── POURQUOI CE FICHIER EXISTE, ET CE QU'IL MESURE ───────────────────────────────────────
 *
 * `recettes.mjs` porte les 27 mutations de `Docs/audit-qa.md`. Les lots QA ont été écrits EN
 * SACHANT lesquelles existaient : rejouer ces 27-là mesure donc une chose utile — que rien
 * n'a régressé — mais pas la seule qui compte. **Une QA qui n'attrape que les défauts pour
 * lesquels elle a été écrite ne fait que réciter.**
 *
 * Ces cinq-là ont été inventées après coup, contre une seule règle de choix :
 *
 *   > frapper un ORGANE QU'AUCUNE des 27 recettes ne touche.
 *
 * Mesuré, pas supposé — les fichiers visés par `recettes.mjs` sont 21, et aucun des cinq
 * ci-dessous n'y figure :
 *
 *     partage/src/alea.ts               · le générateur, socle de tout le déterminisme
 *     partage/src/horloge.ts            · l'horloge simulée, socle de tout test temporel
 *     partage/src/lecture/syllabation.ts· la découpe que l'enfant LIT
 *     partage/src/texte.ts              · la normalisation qui décide « juste » ou « faux »
 *     client/src/lecture/polices.ts     · la police de la zone de lecture
 *
 * Deux d'entre elles (X1, X5) visent le SOCLE DE TESTABILITÉ lui-même — l'aléatoire injecté
 * et l'horloge injectée de l'annexe T § 2. C'est le pire endroit possible pour un défaut :
 * si la graine ne mélange plus ou si le temps simulé avance de moitié, **toute la QA continue
 * de rendre du vert en mesurant autre chose que ce qu'elle croit mesurer.**
 *
 * ── FORME ────────────────────────────────────────────────────────────────────────────────
 *
 * Mêmes règles que `recettes.mjs` : ancrage unique, ancrage sur une ligne, `attendu` mesuré
 * et jamais supposé, et un `pourquoi` écrit pour tout survivant. Les cinq contrôles négatifs
 * sont réimportés tels quels — **sans eux la mesure n'est pas opposable** (audit § 1).
 *
 *     npm run qa:mutations -- --recettes=scripts/qa/recettes-nouvelles.mjs
 *
 * Un jeu chargé par `--recettes=` n'écrit jamais `mutations.json` : le tableau de bord
 * continue d'afficher la dernière mesure complète.
 */
import { CONTROLES_NEGATIFS } from './recettes.mjs';

/** @type {readonly import('./recettes.mjs').Recette[]} */
export const MUTATIONS = [
  {
    id: 'X1',
    titre: '`Alea.melanger` rend la copie SANS la mélanger — la bonne réponse ne bouge plus',
    regle: 'annexe T § 2.1 — aléatoire injecté · R13 — variété',
    fichier: 'partage/src/alea.ts',
    ancrage: '    for (let i = copie.length - 1; i > 0; i -= 1) {',
    remplacement: '    for (let i = copie.length - 1; i > copie.length; i -= 1) {',
    attendu: 'DETECTEE',
    pourquoi:
      'Le mélange devient l’identité. Rien ne plante, rien ne change de type, aucune ' +
      'exception : les listes sortent simplement dans l’ordre où elles sont entrées. Chez ' +
      'l’enfant, la bonne réponse d’un QCM est toujours à la même place — il apprend la ' +
      'POSITION, pas la lecture, et le jeu le récompense pour ça.'
  },
  {
    id: 'X2',
    titre: 'La coupe syllabique se décale d’une lettre — l’enfant lit « mam-man »',
    regle: 'D19 · v2 § 8 — le déchiffrage, le cœur du besoin de l’enfant',
    fichier: 'partage/src/lecture/syllabation.ts',
    ancrage: '    morceaux.push(texte.slice(precedent, coupe));',
    remplacement: '    morceaux.push(texte.slice(precedent, coupe + 1));',
    attendu: 'DETECTEE',
    pourquoi:
      'La borne haute avance d’un cran, la borne basse ne suit pas : chaque syllabe reprend ' +
      'la première lettre de la suivante. Aucune erreur, aucune exception — un découpage ' +
      'faux, montré à un enfant de sept ans en difficulté de lecture, sur la fonction même ' +
      'pour laquelle l’application existe.'
  },
  {
    id: 'X3',
    titre: 'La zone de lecture perd Andika et retombe sur Verdana — la règle non négociable',
    regle: 'CLAUDE.md — « fond parchemin, police Andika » · D19',
    fichier: 'client/src/lecture/polices.ts',
    ancrage:
      '  andika: `"Andika", "Atkinson Hyperlegible", Verdana, ${REPLI_SYSTEME}`,',
    remplacement: '  andika: `Verdana, ${REPLI_SYSTEME}`,',
    // ── LE TROU QUE CETTE CAMPAGNE A TROUVÉ, PUIS FERMÉ LE MÊME JOUR.
    //
    //   trouvé  : socle de 7 fichiers / 163 tests, VERT avant ET après → X3 SURVIT.
    //   fermé   : `tests/unitaires/polices-piles.test.ts` (8 cas), écrit pour ça.
    //   prouvé  : mutation ré-appliquée contre le garde neuf → DETECTEE. Sortie citée :
    //             « la pile de "andika" ne contient pas sa propre famille "Andika" …
    //               expected 'Verdana, system-ui, sans-serif' to contain 'Andika' »
    //
    // `attendu` porte donc le verdict D'AUJOURD'HUI. Le `pourquoi` ci-dessous garde l'analyse
    // du trou : c'est elle qui explique pourquoi quatre assertions parlant d'Andika ne
    // gardaient rien, et c'est cette leçon-là qui resservira.
    attendu: 'DETECTEE',
    pourquoi:
      'AVANT LE 2026-08-02 : PERSONNE. Et le dépôt contenait pourtant QUATRE assertions ' +
      'portant le mot ' +
      '« Andika » — c’est ce qui rend ce trou instructif : chacune vérifie autre chose que ' +
      'la pile de la police par défaut.\n' +
      '\n' +
      '  tests/composants/ZoneDeLecture.test.tsx:110  `expect(famille).toContain(\'Andika\')`\n' +
      '      … mais le rendu est fait avec `police: \'opendyslexic\'` (ligne 106). C’est la\n' +
      '      pile `"OpenDyslexic", "Andika", …` qui est lue — une pile SŒUR, que la mutation\n' +
      '      ne touche pas. L’assertion la plus proche du but vise le voisin.\n' +
      '  tests/unitaires/reglages-lecture.test.ts:51   `REGLAGES_PAR_DEFAUT.police === \'andika\'`\n' +
      '  tests/unitaires/reglages-lecture.test.ts:105  une police inconnue normalise vers `\'andika\'`\n' +
      '  tests/api/reglages.test.ts:144                idem, côté serveur\n' +
      '      … ces trois-là vérifient le CODE `\'andika\'`, jamais ce que ce code DÉSIGNE.\n' +
      '\n' +
      '  Mesure : socle de 7 fichiers / 163 tests, VERT avant ET après, la mutation appliquée →\n' +
      '  SURVIT. La police que l’enfant lit peut devenir Verdana sans qu’une seule ligne rougisse.\n' +
      '\n' +
      '  C’est la famille de M18 et M26 : la QA est excellente sur ce que le DOM porte comme\n' +
      '  DONNÉE, et aveugle à ce que l’enfant VOIT. Remède, dix lignes : pour chacune des cinq\n' +
      '  polices de D19, exiger que sa pile NOMME sa propre famille.'
  },
  {
    id: 'X4',
    titre: 'La normalisation replie vers l’apostrophe typographique — l’enfant a raison, l’appli dit non',
    regle: 'contrat § 0 — l’apostrophe typographique · R14 — aucun échec injustifié',
    fichier: 'partage/src/texte.ts',
    ancrage: '    .replace(APOSTROPHES, "\'")',
    remplacement: '    .replace(APOSTROPHES, "\\u2019")',
    // MESURÉ : DETECTEE par `tests/unitaires/texte.test.ts`, antérieur au lot QA.
    attendu: 'DETECTEE',
    pourquoi:
      'La classe `APOSTROPHES` ne contient PAS l’apostrophe droite `\'` : replier vers `’` ' +
      'au lieu de `\'` laisse donc les deux formes distinctes. Le fichier promet en toutes ' +
      'lettres qu’« un `\'` tapé au clavier ne fasse jamais échouer une égalité que l’œil ' +
      'juge vraie ». L’enfant écrit juste et l’application le refuse : c’est un échec ' +
      'imposé à un enfant qui a raison, la faute la plus chère de ce projet.'
  },
  {
    id: 'X5',
    titre: '`Horloge.avancer` n’avance que de la moitié — le temps simulé ment à toute la QA',
    regle: 'annexe T § 2.2 — horloge injectée, socle de tout test temporel',
    fichier: 'partage/src/horloge.ts',
    ancrage: '      const delta = dureeEnMs(duree);',
    remplacement: '      const delta = Math.floor(dureeEnMs(duree) / 2);',
    attendu: 'DETECTEE',
    pourquoi:
      'LA MUTATION LA PLUS PERVERSE DES CINQ, et c’est pour ça qu’elle est là. Elle ne casse ' +
      'aucune fonction du jeu : elle casse le MOYEN de vérifier le jeu. « Vérifier qu’un item ' +
      'du Leitner revient bien à J+7 » devient « vérifier qu’il revient à J+3,5 ». Un test qui ' +
      'avance de 40 jours en avance 20 et rend du vert sur une révision qui n’est pas due. ' +
      'Une QA dont l’horloge ment continue de tout mesurer, sauf ce qu’elle croit mesurer.'
  }
];

export { CONTROLES_NEGATIFS };

/** Tout ce que le banc joue, contrôles négatifs compris. */
export const TOUTES_LES_RECETTES = [...MUTATIONS, ...CONTROLES_NEGATIFS];

export const MUTATIONS_QUI_VALENT = MUTATIONS.filter((r) => r.couvertPar !== 'equivalent');

export const TROUS_REELS = MUTATIONS.filter(
  (r) => r.attendu === 'SURVIT' && r.couvertPar === null
);
