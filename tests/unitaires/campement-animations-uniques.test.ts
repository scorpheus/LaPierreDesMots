/**
 * R11 mesurée sur la PROPRIÉTÉ (« dix mouvements distincts ») et non sur l'indice
 * (« dix attributs »). Lot S5.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────────────────────
 *
 * Le dépôt comptait déjà `data-animation-unique="oui"` à deux endroits :
 * `tests/composants/EcranCampement.test.tsx:137` dans le DOM monté, et
 * `tests/e2e/parcours-campement.spec.ts:80` dans le navigateur. Les deux étaient verts, et les
 * quatorze points ainsi marqués faisaient **exactement le même mouvement** — un `scale(1.06)`
 * écrit en dur dans `PointLibre.tsx`. Compter l'attribut ne mesurait rien de ce que R11
 * demande, et l'attribut aurait pu rester vrai indéfiniment sur un campement inerte.
 *
 * C'est la même classe de faute que le survivant M11b de `Docs/audit-qa.md` : « le seul garde
 * est un `toHaveCount(0)` : quand l'attribut n'existe plus, le sélecteur ne désigne plus rien
 * et l'assertion reste verte. Le garde se désarme tout seul. » Ici, il ne s'arme jamais.
 *
 * ── LES TROIS CHOSES QUE CE FICHIER GARDE ───────────────────────────────────────────────────
 *
 *  1. **Les mouvements sont réellement distincts** sur les points réels du fichier de contenu.
 *  2. **Chaque nom a son `@keyframes` ET sa classe** dans `client/src/styles/global.css`. Sans
 *     cette vérification, il suffirait d'inventer dix-huit noms pour rendre le compte vert en
 *     laissant le campement immobile — le défaut d'origine, sous un autre habit.
 *  3. **Aucun point ne reste sans mouvement**, table ou repli.
 *
 * Les données viennent du disque : `contenu/monde/campement.json` réel, `global.css` réel.
 */
import { describe, expect, it } from 'vitest';

import { R11_ANIMATIONS_UNIQUES_MIN, pointsDuDocument } from '@partage/monde/campement.js';
import type { PointInteraction } from '@partage/monde/types.js';
import {
  ANIMATIONS_CAMPEMENT,
  CYCLE_INVITE_S,
  animationDuPoint,
  classeAnimation,
  empreinte,
  phaseInvite
} from '@client/monde/animations-campement';

import { lireJson, lireTexte } from '../configuration/preparation.js';

const POINTS: readonly PointInteraction[] = pointsDuDocument(
  lireJson('contenu/monde/campement.json')
);
const FEUILLE = lireTexte('client/src/styles/global.css');

/**
 * Le nombre de noms de mouvement de la table — dix-huit au 2026-08-03.
 *
 * Égalité et non plancher : la table vit dans le CODE, pas dans le contenu. La faire changer
 * de taille est une décision, et cette décision doit passer par ce fichier — c'est lui qui
 * vérifie que chaque nom a bien ses `@keyframes` et sa classe.
 */
const NOMS_DE_MOUVEMENT_ATTENDUS = 18;

/** Les points qui promettent une animation unique. C'est sur eux que R11 se compte. */
const PROMETTEURS = POINTS.filter(
  (point) => point.animationUnique && point.reaction !== 'aucune'
);

describe('R11 — les animations uniques sont des MOUVEMENTS, pas des attributs', () => {
  it('rend au moins 10 mouvements DISTINCTS sur les points qui en promettent un', () => {
    const distincts = new Set(PROMETTEURS.map((point) => animationDuPoint(point.id)));
    console.log(
      `[S5] ${String(PROMETTEURS.length)} point(s) animationUnique → ` +
        `${String(distincts.size)} mouvement(s) distinct(s) : ${[...distincts].sort().join(', ')}`
    );
    // LA FRACTION, pas le seul numérateur. « ≥ 10 distincts » resterait vert si le fichier ne
    // déclarait plus que dix prometteurs — c'est-à-dire au moment précis où quatre points
    // auraient perdu leur promesse. Le dénominateur doit donc entrer dans l'assertion.
    expect(
      distincts.size,
      'deux points qui promettent un mouvement unique partagent le même'
    ).toBe(PROMETTEURS.length);
    expect(distincts.size).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
  });

  it('donne un mouvement à CHAQUE point du fichier, y compris hors table', () => {
    for (const point of POINTS) {
      expect(ANIMATIONS_CAMPEMENT).toContain(animationDuPoint(point.id));
    }
    // Le repli doit tenir pour un identifiant que personne n'a prévu : un point neuf ajouté au
    // fichier de contenu réagit, sans qu'une ligne de code soit écrite pour lui.
    expect(ANIMATIONS_CAMPEMENT).toContain(animationDuPoint('un-point-que-nul-na-declare'));
  });

  it('choisit toujours le même mouvement pour le même identifiant', () => {
    // Un mouvement qui changerait d'un rendu à l'autre serait un scintillement, pas une
    // identité. Et il rendrait toute capture T4 instable.
    for (const point of POINTS) {
      expect(animationDuPoint(point.id)).toBe(animationDuPoint(point.id));
    }
    expect(empreinte('tente')).toBe(empreinte('tente'));
    expect(empreinte('tente')).not.toBe(empreinte('feu'));
  });
});

describe('aucun mouvement déclaré n’est inerte', () => {
  it('définit `@keyframes` ET la classe pour les 18 noms, dans global.css', () => {
    const manquants: string[] = [];
    for (const nom of ANIMATIONS_CAMPEMENT) {
      const keyframes = FEUILLE.includes(`@keyframes pierre-campement-${nom} {`);
      const classe = FEUILLE.includes(`.${classeAnimation(nom)} {`);
      const branche = FEUILLE.includes(`animation-name: pierre-campement-${nom};`);
      if (!keyframes || !classe || !branche) {
        manquants.push(`${nom} (keyframes=${String(keyframes)}, classe=${String(classe)}, branche=${String(branche)})`);
      }
    }
    console.log(
      `[S5] ${String(ANIMATIONS_CAMPEMENT.length)} nom(s) de mouvement · ` +
        `sans définition CSS : ${manquants.join(' · ') || 'aucun'}`
    );
    // Le plancher : une table vidée rendrait `manquants` vide, donc le cas vert — à zéro nom
    // défini. Le titre promet dix-huit ; c'est cette promesse-là qu'on assert.
    expect(ANIMATIONS_CAMPEMENT.length, 'la table des mouvements a changé de taille').toBe(
      NOMS_DE_MOUVEMENT_ATTENDUS
    );
    expect(manquants).toEqual([]);
  });

  it('ne définit aucune classe `anim-campement-` qui ne soit pas dans la table', () => {
    // Le sens inverse : une classe orpheline dans la feuille est du style mort, et surtout le
    // signe qu'un nom a été renommé d'un côté seulement.
    const declarees = new Set<string>(
      [...FEUILLE.matchAll(/\.anim-campement-([a-z]+)\s*\{/gu)].map((trouve) => trouve[1]!)
    );
    const connues = new Set<string>(ANIMATIONS_CAMPEMENT);
    expect([...declarees].filter((nom) => !connues.has(nom))).toEqual([]);
  });

  it('n’emploie aucune couleur d’alerte : un refus est un mouvement, jamais une teinte', () => {
    // Les COMMENTAIRES sont retirés d'abord — ils citent les valeurs hexadécimales des
    // contrastes mesurés par M8, et une recette qui les compterait mesurerait la prose.
    const sansCommentaires = FEUILLE.replace(/\/\*[\s\S]*?\*\//gu, '');
    const debut = sansCommentaires.indexOf('@keyframes pierre-campement-invite');
    const corps = sansCommentaires.slice(debut, sansCommentaires.indexOf('.case-butin', debut));
    expect(debut).toBeGreaterThan(0);
    expect(corps).toContain('@keyframes pierre-campement-bond');
    expect(corps).not.toMatch(/\bcolor\s*:/u);
    expect(corps).not.toMatch(/background(-color)?\s*:/u);
    // Aucune valeur en dur : les seules couleurs citées sont des jetons de la palette.
    expect(corps).not.toMatch(/#[0-9a-fA-F]{3,6}/u);
  });
});

describe('l’invitation au repos — l’affordance de R18', () => {
  it('déphase les points, et la feuille porte le même cycle que le module', () => {
    expect(FEUILLE).toContain(`animation: pierre-campement-invite ${String(CYCLE_INVITE_S)}s`);
  });

  it('donne à chaque point une phase distincte, dans le cycle et jamais positive', () => {
    const phases = POINTS.map((point) => phaseInvite(point.id));
    for (const phase of phases) {
      expect(phase).toBeLessThanOrEqual(0);
      expect(phase).toBeGreaterThan(-CYCLE_INVITE_S);
    }
    // Le halo doit passer d'un objet à l'autre : si tout le campement clignotait ensemble, ce
    // serait une grille de boutons qui s'allume, c'est-à-dire le menu déguisé que D45 refuse.
    const distinctes = new Set(phases);
    console.log(
      `[S5] ${String(POINTS.length)} point(s) → ${String(distinctes.size)} phase(s) d’invitation distincte(s)`
    );
    // Égalité STRICTE : sur le fichier réel, chaque point a sa phase. Une collision qui
    // apparaîtrait un jour ferait clignoter deux objets ensemble — c'est le début de la grille
    // de boutons, et il vaut mieux le voir en rouge que de le découvrir à l'écran.
    expect(distinctes.size).toBe(POINTS.length);
  });
});
