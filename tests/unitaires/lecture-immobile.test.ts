// @vitest-environment happy-dom
/**
 * M26 — « AUCUNE ANIMATION DANS LE CHAMP DE LECTURE » N'AVAIT AUCUN GARDE MÉCANIQUE.
 *
 * CLAUDE.md, règles non négociables : « Le décor s'agite, le texte jamais. Dès qu'il y a du
 * déchiffrage : fond parchemin, police Andika, aucune animation dans le champ de lecture. »
 *
 * `Docs/audit-qa.md` § 4.2, mesuré et cité :
 *
 *     $ grep -rn "texte jamais\|champ de lecture" tests/
 *     (aucun résultat)
 *
 * `ZoneDeLecture.test.tsx` porte 24 cas — police, corps, interlettrage, interligne,
 * syllabation, lignes tapables, R16 — et AUCUN sur l'animation. L'auditeur a posé
 * `style={{ animation: 'clignote 1s infinite' }}` sur le paragraphe de lecture : suite verte.
 *
 * C'est la règle la plus directement liée au trouble de l'enfant, et c'était celle qui n'avait
 * pas de traduction mécanique. Une règle non négociable sans test est une intention, pas une
 * contrainte.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * DEUX ÉTAGES, PARCE QU'UN SEUL NE VOIT PAS L'AUTRE
 *
 *  1. **Le DOM** — rien, sous `[data-lecture="oui"]`, ne déclare d'animation en style en
 *     ligne, et aucun descendant ne porte une CLASSE que la feuille de style anime. Les
 *     classes animées ne sont pas écrites en dur ici : elles sont ÉNUMÉRÉES depuis
 *     `global.css` (auditer les objets, pas les occurrences — D48). Ajouter demain une
 *     `.scintille` dans la feuille suffit à la faire entrer dans cette liste.
 *
 *  2. **La SOURCE** — la feuille de style elle-même. C'est là que vit le garde réel :
 *
 *         .zone-lecture-v2,
 *         .zone-lecture-v2 * { animation: none !important; }
 *
 *     Ce `!important` est ce qui neutralise, en production, l'animation en ligne de M26. Il
 *     n'est porté par aucune assertion : le supprimer ne casserait rien aujourd'hui, et
 *     rallumerait toutes les animations du champ de lecture. Ce fichier l'exige explicitement,
 *     et refuse en plus toute déclaration `animation`/`animation-name` non nulle dans un
 *     sélecteur qui touche la zone de lecture.
 *
 * CONTRAT DE SORTIE : le test imprime le nombre de nœuds inspectés, le nombre de sélecteurs
 * examinés et le nombre de classes animées recensées ; il échoue si l'un des deux premiers
 * est nul. Un audit sur une population vide est un audit vert qui ne mesure rien.
 * ────────────────────────────────────────────────────────────────────────────────────────
 *
 * Environnement `happy-dom` par la directive en tête de fichier : le projet `unitaires` tourne
 * en `node`, et ce fichier a besoin d'un DOM. Pas de JSX — `createElement` évite d'avoir à
 * régler la transformation JSX pour un seul fichier.
 */
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REGLAGES_PAR_DEFAUT } from '@pierre/partage/lecture';
import type { ReglagesLecture } from '@pierre/partage/lecture';

import { ZoneDeLecture } from '@client/lecture/ZoneDeLecture';
import { aplatirLexique, fixerLexiqueSyllabation } from '@client/lecture/TexteSyllabe';

import { lireJson, lireTexte } from '../configuration/preparation.js';

const CHEMIN_GLOBAL_CSS = 'client/src/styles/global.css';
const FICHIERS_LECTURE = [
  'client/src/lecture/ZoneDeLecture.tsx',
  'client/src/lecture/TexteSyllabe.tsx',
  'client/src/lecture/RegleDeLecture.tsx',
  'client/src/lecture/ApercuReglages.tsx',
] as const;

/** Le garde qui tient réellement la règle en production. Exigé mot pour mot, aux espaces près. */
const SELECTEUR_GARDE = '.zone-lecture-v2 *';

/** Un texte de déchiffrage sur plusieurs lignes : trois lignes, donc trois nœuds de ligne. */
const TEXTE = 'Le loup rôde.\nLa lune éclaire le chemin.\nGobi attend.';

/** Ce qui, dans une chaîne de style, dénonce un mouvement. */
const PROPRIETES_INTERDITES = ['animation', 'animation-name', 'animationname'] as const;

/**
 * Les transitions géométriques : une transition de couleur est admise (le surlignage de la
 * ligne courante en vit), une transition qui DÉPLACE du texte ne l'est pas.
 */
const GEOMETRIQUES = ['transform', 'translate', 'top', 'left', 'inset', 'margin', 'padding'];

// ───────────────────────────────────────────────────────────── lecture de la feuille de style

interface RegleCss {
  readonly selecteur: string;
  readonly corps: string;
  /** Le contexte at-rule dans lequel la règle est imbriquée, pour les messages d'erreur. */
  readonly contexte: string;
}

function sansCommentaires(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, '');
}

/**
 * Découpe une feuille en règles `sélecteur { corps }`, en descendant dans les at-rules à bloc
 * (`@media`, `@supports`). Les `@keyframes` sont conservées à part : leurs « sélecteurs »
 * (`0%`, `from`) ne sont pas des sélecteurs et n'ont rien à faire dans l'audit.
 */
function reglesDe(css: string, contexte = ''): readonly RegleCss[] {
  const regles: RegleCss[] = [];
  const texte = sansCommentaires(css);
  let debut = 0;
  let index = 0;

  while (index < texte.length) {
    if (texte[index] !== '{') {
      index += 1;
      continue;
    }
    const entete = texte.slice(debut, index).trim();
    let profondeur = 1;
    let curseur = index + 1;
    while (curseur < texte.length && profondeur > 0) {
      if (texte[curseur] === '{') profondeur += 1;
      else if (texte[curseur] === '}') profondeur -= 1;
      curseur += 1;
    }
    const corps = texte.slice(index + 1, curseur - 1);

    if (entete.startsWith('@keyframes') || entete.startsWith('@font-face')) {
      // Ignorées : pas de sélecteur, et une `@keyframes` n'anime rien tant que personne ne
      // la nomme. C'est le `animation:` qui la nomme que ce fichier traque.
    } else if (entete.startsWith('@')) {
      regles.push(...reglesDe(corps, contexte === '' ? entete : `${contexte} > ${entete}`));
    } else {
      regles.push({ selecteur: entete, corps, contexte });
    }

    debut = curseur;
    index = curseur;
  }

  return regles;
}

/** Les déclarations d'une règle, en paires `propriété` / `valeur`, tout en minuscules. */
function declarationsDe(corps: string): readonly { readonly propriete: string; readonly valeur: string }[] {
  return corps
    .split(';')
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0 && morceau.includes(':'))
    .map((morceau) => {
      const coupure = morceau.indexOf(':');
      return {
        propriete: morceau.slice(0, coupure).trim().toLowerCase(),
        valeur: morceau.slice(coupure + 1).trim().toLowerCase(),
      };
    });
}

/** Un sélecteur touche-t-il le champ de lecture ? On reste littéral, et donc large. */
function toucheLaLecture(selecteur: string): boolean {
  return /\[data-lecture|\.zone-lecture|\.ligne-lecture/u.test(selecteur);
}

/** Une valeur d'`animation` qui n'anime rien. `none`, `none !important`, `0s`. */
function animationInerte(valeur: string): boolean {
  return /^none\b/u.test(valeur);
}

/**
 * Les CLASSES que la feuille de style anime, énumérées depuis la feuille — jamais écrites en
 * dur. C'est l'audit par objets : une classe animée ajoutée demain entre ici toute seule.
 */
function classesAnimees(css: string): ReadonlySet<string> {
  const classes = new Set<string>();
  for (const regle of reglesDe(css)) {
    const anime = declarationsDe(regle.corps).some(
      ({ propriete, valeur }) =>
        (propriete === 'animation' || propriete === 'animation-name') && !animationInerte(valeur),
    );
    if (!anime) continue;
    for (const trouve of regle.selecteur.matchAll(/\.([A-Za-z_][\w-]*)/gu)) {
      const nom = trouve[1];
      if (nom !== undefined) classes.add(nom);
    }
  }
  return classes;
}

// ───────────────────────────────────────────────────────────────────── montage de la zone

function reglages(personnalisation: Partial<ReglagesLecture> = {}): ReglagesLecture {
  return { ...REGLAGES_PAR_DEFAUT, ...personnalisation };
}

/**
 * `prefers-reduced-motion` posé à la main : happy-dom rend `matches: false` pour tout. Les
 * deux états sont montés parce qu'un composant qui n'animerait QUE hors mouvement réduit
 * passerait un audit fait dans le seul état calme.
 */
function poserMouvementReduit(reduit: boolean): void {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (requete: string) => ({
      matches: reduit && requete.includes('prefers-reduced-motion'),
      media: requete,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

interface Grief {
  readonly ou: string;
  readonly quoi: string;
}

/** Inspecte le sous-arbre de lecture. Rend les griefs ET le nombre de nœuds vus. */
function auditerLeSousArbre(animees: ReadonlySet<string>): {
  readonly griefs: readonly Grief[];
  readonly noeuds: number;
} {
  const racine = document.querySelector('[data-lecture="oui"]');
  if (racine === null) return { griefs: [{ ou: '(racine)', quoi: 'aucun [data-lecture="oui"] rendu' }], noeuds: 0 };

  const tous = [racine, ...Array.from(racine.querySelectorAll('*'))];
  const griefs: Grief[] = [];

  for (const noeud of tous) {
    const chemin = `${noeud.tagName.toLowerCase()}${noeud.className === '' ? '' : `.${String(noeud.className).split(' ').join('.')}`}`;
    const style = (noeud.getAttribute('style') ?? '').toLowerCase();

    for (const propriete of PROPRIETES_INTERDITES) {
      const declaration = new RegExp(`(^|[;\\s])${propriete}\\s*:\\s*([^;]+)`, 'u').exec(style);
      const valeur = declaration?.[2]?.trim();
      if (valeur !== undefined && !animationInerte(valeur)) {
        griefs.push({ ou: chemin, quoi: `style en ligne « ${propriete}: ${valeur} »` });
      }
    }

    const transition = /(^|[;\s])transition(-property)?\s*:\s*([^;]+)/u.exec(style);
    const cible = transition?.[3];
    if (cible !== undefined && GEOMETRIQUES.some((propriete) => cible.includes(propriete))) {
      griefs.push({ ou: chemin, quoi: `transition géométrique en ligne « ${cible.trim()} »` });
    }

    for (const classe of String(noeud.className).split(/\s+/u).filter((nom) => nom.length > 0)) {
      if (animees.has(classe)) {
        griefs.push({ ou: chemin, quoi: `porte la classe animée « .${classe} » (déclarée dans ${CHEMIN_GLOBAL_CSS})` });
      }
    }
  }

  return { griefs, noeuds: tous.length };
}

const CSS = lireTexte(CHEMIN_GLOBAL_CSS);
const REGLES = reglesDe(CSS);
const CLASSES_ANIMEES = classesAnimees(CSS);

/**
 * Le lexique de syllabation est INJECTÉ, jamais chargé.
 *
 * `TexteSyllabe` va le chercher par `fetch` quand personne ne le lui pose ; sous happy-dom
 * cela part vers `http://localhost:3000/…` et rend un `ECONNREFUSED` en stderr. L'annexe T
 * § 2.3 l'interdit — « la suite complète tourne sans réseau » — et `fixerLexiqueSyllabation`
 * existe exactement pour ça. Même geste que `tests/composants/ZoneDeLecture.test.tsx`.
 */
const LEXIQUE = aplatirLexique(lireJson('contenu/referentiel/syllabation-exceptions.json'));

beforeEach(() => {
  fixerLexiqueSyllabation(LEXIQUE);
});

afterEach(() => {
  cleanup();
});

describe('la population auditée n’est pas vide — sans quoi tout le reste est vert par vacuité', () => {
  it('imprime nœuds inspectés, sélecteurs examinés et classes animées recensées', () => {
    poserMouvementReduit(false);
    render(
      createElement(ZoneDeLecture, {
        texte: TEXTE,
        reglages: reglages({ regleDeLecture: true, surlignageLigneCourante: true }),
      }),
    );
    const { noeuds } = auditerLeSousArbre(CLASSES_ANIMEES);
    const selecteurs = REGLES.length;

    console.log(
      `[qa-lecture-immobile] ${String(noeuds)} nœud(s) inspecté(s) sous [data-lecture="oui"] · ` +
        `${String(selecteurs)} sélecteur(s) examiné(s) dans ${CHEMIN_GLOBAL_CSS} · ` +
        `${String(CLASSES_ANIMEES.size)} classe(s) animée(s) recensée(s) : ` +
        `${[...CLASSES_ANIMEES].map((nom) => `.${nom}`).join(', ')}`,
    );

    expect(noeuds, 'nœuds inspectés sous [data-lecture="oui"]').toBeGreaterThan(0);
    expect(selecteurs, `sélecteurs lus dans ${CHEMIN_GLOBAL_CSS}`).toBeGreaterThan(0);
    // Le recensement des classes animées doit trouver quelque chose : la feuille en porte
    // (`.oscillation`, `.halo-demonstration`). Un recensement vide voudrait dire que le
    // parseur ne lit rien, et l'audit des classes serait creux sans le dire.
    expect(CLASSES_ANIMEES.size, 'classes animées recensées dans la feuille').toBeGreaterThan(0);
  });
});

describe('M26 — rien ne bouge sous [data-lecture="oui"]', () => {
  for (const reduit of [false, true]) {
    const etat = reduit ? 'prefers-reduced-motion: reduce' : 'mouvement normal';

    it(`aucune animation en ligne ni classe animée — ${etat}`, () => {
      poserMouvementReduit(reduit);
      render(
        createElement(ZoneDeLecture, {
          texte: TEXTE,
          reglages: reglages({ regleDeLecture: true, surlignageLigneCourante: true }),
          motsCles: ['loup'],
        }),
      );
      const { griefs, noeuds } = auditerLeSousArbre(CLASSES_ANIMEES);
      expect(
        griefs,
        `le texte s’agite (${etat}) :\n  ${griefs.map((g) => `${g.ou} → ${g.quoi}`).join('\n  ')}`,
      ).toHaveLength(0);
      expect(noeuds, 'nœuds inspectés').toBeGreaterThan(0);
    });

    it(`même sans règle de lecture ni surlignage — ${etat}`, () => {
      // L'autre branche de rendu : `<p>` au lieu de `<button>`. C'est celle que M26 a visée.
      poserMouvementReduit(reduit);
      render(createElement(ZoneDeLecture, { texte: TEXTE, reglages: reglages() }));
      const { griefs, noeuds } = auditerLeSousArbre(CLASSES_ANIMEES);
      expect(
        griefs,
        `le texte s’agite (${etat}) :\n  ${griefs.map((g) => `${g.ou} → ${g.quoi}`).join('\n  ')}`,
      ).toHaveLength(0);
      expect(noeuds, 'nœuds inspectés').toBeGreaterThan(0);
    });
  }
});

describe('le garde CSS existe, et c’est LUI qui tient la règle en production', () => {
  it(`\`${SELECTEUR_GARDE} { animation: none !important }\` est déclaré dans ${CHEMIN_GLOBAL_CSS}`, () => {
    // Sans ce `!important`, l'animation en ligne de M26 vivrait à l'écran. Rien ne l'exigeait :
    // le retirer était une régression silencieuse à une ligne.
    const garde = REGLES.filter((regle) =>
      regle.selecteur
        .split(',')
        .map((morceau) => morceau.trim())
        .includes(SELECTEUR_GARDE),
    ).find((regle) =>
      declarationsDe(regle.corps).some(
        ({ propriete, valeur }) => propriete === 'animation' && /^none\s*!important/u.test(valeur),
      ),
    );

    expect(
      garde,
      `aucune règle « ${SELECTEUR_GARDE} { animation: none !important } » dans ${CHEMIN_GLOBAL_CSS} — ` +
        'le champ de lecture n’a plus de garde',
    ).toBeDefined();
  });

  it('aucun sélecteur touchant la lecture ne déclare une animation vivante', () => {
    // `filter(toucheLaLecture)` passerait l'OBJET règle au prédicat, jamais son sélecteur :
    // le test serait alors vert sur zéro sélecteur examiné. C'est exactement ce que le
    // plancher `examines > 0` a attrapé à la première exécution de ce fichier.
    const concernees = REGLES.filter((regle) => toucheLaLecture(regle.selecteur));
    const fautifs = concernees
      .flatMap((regle) =>
        declarationsDe(regle.corps)
          .filter(
            ({ propriete, valeur }) =>
              (propriete === 'animation' || propriete === 'animation-name') &&
              !animationInerte(valeur),
          )
          .map(({ propriete, valeur }) => `${regle.contexte} ${regle.selecteur} → ${propriete}: ${valeur}`),
      );

    const examines = concernees.length;
    console.log(
      `[qa-lecture-immobile] ${String(examines)} sélecteur(s) touchant le champ de lecture : ` +
        concernees.map((regle) => regle.selecteur.replace(/\s+/gu, ' ')).join(' · '),
    );
    expect(
      fautifs,
      `animation déclarée dans le champ de lecture :\n  ${fautifs.join('\n  ')}`,
    ).toHaveLength(0);
    expect(examines, 'sélecteurs touchant la lecture').toBeGreaterThan(0);
  });
});

describe('les composants de lecture ne posent aucune animation dans leur source', () => {
  it('aucun `animation` ni `animationName` dans client/src/lecture/*.tsx', () => {
    // Le DOM ne voit que ce qui est monté ; la source voit aussi les branches non prises.
    const fautifs: string[] = [];
    for (const chemin of FICHIERS_LECTURE) {
      const source = lireTexte(chemin)
        .replace(/\/\*[\s\S]*?\*\//gu, '')
        .replace(/^\s*\/\/.*$/gmu, '');
      for (const motif of [/\banimationName\b/u, /\banimation\s*:/u, /@keyframes/u]) {
        if (motif.test(source)) fautifs.push(`${chemin} → ${motif.source}`);
      }
    }
    expect(
      fautifs,
      `un composant de lecture déclare un mouvement :\n  ${fautifs.join('\n  ')}`,
    ).toHaveLength(0);
    expect(FICHIERS_LECTURE.length, 'fichiers de lecture examinés').toBeGreaterThan(0);
  });
});
