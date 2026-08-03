/**
 * LES COULEURS ET LES NOMS DE LA CARTE DU MONDE — lot S4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * DEUX DÉRIVES QUE `scripts/verifier-carte-monde.mjs` NE VOIT PAS, ET QUI SE VOIENT TOUTES DEUX
 * SUR L'ÉCRAN QU'ON MONTRE À SES PARENTS
 *
 * Ce contrôle-là mesure la géométrie : identifiants, ordre, centres, segments, silhouettes,
 * détourage, fermeture, `viewBox`, ancres. Rien de tout cela ne dit de quelle COULEUR le dessin
 * est peint, ni comment les territoires s'APPELLENT. Ce fichier tient ces deux populations.
 *
 * ── 1. LA PALETTE — « la couleur vient du code, pas du modèle » ────────────────────────────────
 * `partage/src/palette.ts` est la source des couleurs du dépôt. Mesuré sur `carte-monde-v3.svg`
 * avant ce lot :
 *
 *   occurrences de couleur littérale : 83
 *   couleurs distinctes             : 17
 *   hors palette + nuancier         : 10 / 17
 *
 * Trois de ces dix n'étaient pas des teintes nouvelles : c'était le nuancier, recopié de mémoire
 * à quelques points près — `#2FAE4E` pour `vert #2FB344` (9 occurrences), `#F5821F` pour
 * `orange #F76707` (5), `#E4342B` pour `rouge #E03131` (2). C'est exactement la dérive que
 * « une palette cohérente sur 600 assets » doit empêcher, et elle ne se voit à l'œil sur aucun
 * écran : il faut deux fichiers côte à côte.
 *
 * Les SEPT autres sont des matières que le nuancier ne couvre pas. Elles sont GELÉES NOMMÉMENT
 * ci-dessous : le test ne compte pas les écarts, il les NOMME. Une couleur qui naîtrait sans
 * être ni un jeton, ni une couleur du nuancier, ni l'une de ces sept, fait échouer ce fichier —
 * et c'est le bon moment pour décider, avant qu'elle ne se propage.
 *
 * ── 2. LES NOMS — un fichier français ne porte pas trois fautes d'accent ───────────────────────
 * Les `<title>` du décor disaient « La Clairiere », « La Foret Muette », « La Cite des
 * Histoires ». Ce ne sont pas des commentaires : un `<title>` donne un NOM ACCESSIBLE. Mesuré
 * dans Chrome (`node bac-a-sable/s4-carte/mesurer-arbre-a11y.mjs`), le décor injecté ajoutait
 * 13 nœuds nommés à l'arbre d'accessibilité de la carte — dont ces trois fautes, chacune deux
 * fois. `EcranCarte` masque désormais le décor entier, mais la faute reste une faute.
 *
 * Les noms sont comparés à ceux que l'écran affiche à l'enfant : deux sources qui divergent
 * sont une carte où le dessin et le texte ne parlent pas du même lieu.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { NUANCIER, PALETTE } from '@pierre/partage';
import { describe, expect, it } from 'vitest';

import { lireTexte } from '../configuration/preparation.js';

const CHEMIN_CARTE = 'contenu/habillages/carte/carte-monde-v3.svg';
const CHEMIN_ECRAN = 'client/src/ecrans/EcranCarte.tsx';

/**
 * Les sept teintes de décor qui ne recopient aucun jeton — GELÉES, avec ce qu'elles nomment.
 *
 * Les hisser en jetons de palette serait une décision de palette, et « ne pas modifier la
 * palette sans validation explicite ». Elles sont donc listées, pas normalisées, et la question
 * est consignée dans `Docs/questions-en-attente.md`.
 */
const TEINTES_DE_DECOR: Readonly<Record<string, string>> = {
  '#C9B48A': 'le papier vieilli — bord, grain, pliures, brûlures, lit de la route',
  '#8FD6F2': 'l’eau claire — territoire du Marais Jumeau, stalactites',
  '#1F6F9B': 'la roche des Galeries',
  '#123A52': 'le noir des bouches de grotte',
  '#C98B4B': 'l’ocre d’automne — territoire de la Forêt Muette',
  '#C0453A': 'la roche volcanique — territoire du Volcan',
  '#7A3A2E': 'le cône du volcan, plus sombre que son territoire',
};

/** Les trois recopies approximatives du nuancier, corrigées par S4. Elles ne reviennent pas. */
const DERIVES_CORRIGEES: Readonly<Record<string, string>> = {
  '#2FAE4E': 'vert #2FB344',
  '#F5821F': 'orange #F76707',
  '#E4342B': 'rouge #E03131',
};

/** Les six libellés officiels, dans l'ordre de la progression. */
const LIBELLES: readonly (readonly [string, string])[] = [
  ['clairiere', 'La Clairière'],
  ['galeries', 'Les Galeries'],
  ['marais-jumeau', 'Le Marais Jumeau'],
  ['foret-muette', 'La Forêt Muette'],
  ['volcan', 'Le Volcan'],
  ['cite-des-histoires', 'La Cité des Histoires'],
];

const carte = lireTexte(CHEMIN_CARTE);

/** Toutes les couleurs littérales du fichier, avec leur nombre d'occurrences. */
function couleursLitterales(texte: string): ReadonlyMap<string, number> {
  const compte = new Map<string, number>();
  for (const occurrence of texte.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/gu)) {
    const hexa = occurrence[1]!.toUpperCase();
    compte.set(hexa, (compte.get(hexa) ?? 0) + 1);
  }
  return compte;
}

describe('la carte du monde n’invente pas de couleur (palette.ts fait foi)', () => {
  const compte = couleursLitterales(carte);

  it('la mesure trouve bien des couleurs à mesurer', () => {
    // « 0 écart sur 0 couleur lue » est le mode de défaillance d'un contrôle creux.
    expect([...compte.values()].reduce((total, n) => total + n, 0)).toBeGreaterThanOrEqual(60);
    expect(compte.size).toBeGreaterThanOrEqual(10);
  });

  it('toute couleur du dessin est un jeton, une couleur du nuancier, ou une teinte GELÉE', () => {
    const connues = new Set(
      [...Object.values(PALETTE), ...Object.values(NUANCIER), ...Object.keys(TEINTES_DE_DECOR)].map(
        (hexa) => hexa.toUpperCase()
      )
    );
    const inconnues = [...compte.keys()].filter((hexa) => !connues.has(hexa));
    expect(
      inconnues,
      'une couleur née sans décision se propage : la nommer ici, ou la ramener au nuancier'
    ).toEqual([]);
  });

  it('les trois recopies approximatives du nuancier ne reviennent pas', () => {
    // Nommées une par une : un décompte global ne bougerait pas si l'une revenait pendant
    // qu'une autre disparaît.
    for (const [derive, officielle] of Object.entries(DERIVES_CORRIGEES)) {
      expect(compte.has(derive), `${derive} est ${officielle}, recopié de mémoire`).toBe(false);
    }
  });

  it('les couleurs de remplacement sont bien celles du nuancier, et elles sont EMPLOYÉES', () => {
    // L'autre moitié de la mesure : la dérive pourrait avoir disparu parce que le dessin a
    // perdu ses feuillages, pas parce qu'il les peint juste.
    for (const [couleur, occurrences] of [
      [NUANCIER.vert, 9],
      [NUANCIER.orange, 5],
      [NUANCIER.rouge, 2],
    ] as const) {
      expect(compte.get(couleur.toUpperCase()) ?? 0, couleur).toBeGreaterThanOrEqual(occurrences);
    }
  });

  it('chaque teinte de décor gelée est encore employée — sinon elle sort de la liste', () => {
    const inutilisees = Object.keys(TEINTES_DE_DECOR).filter((hexa) => !compte.has(hexa));
    expect(inutilisees, 'une exception qui ne sert plus est une exception à retirer').toEqual([]);
  });
});

describe('les six territoires portent leur nom, accentué et conforme à l’écran', () => {
  const titres = [...carte.matchAll(/<title>([^<]*)<\/title>/gu)].map(
    (occurrence) => occurrence[1]!
  );

  it('la mesure trouve bien des noms à mesurer', () => {
    expect(titres.length).toBe(7); // la carte, puis les six territoires
  });

  it('les six territoires sont nommés dans l’ordre, avec leurs accents', () => {
    expect(titres.slice(1)).toEqual(LIBELLES.map(([, libelle]) => libelle));
  });

  it('l’écran affiche EXACTEMENT les mêmes six libellés à l’enfant', () => {
    // Le dessin et le texte doivent parler du même lieu. `EcranCarte.ANCRES` est la table qui
    // porte les libellés lus à voix haute par le lecteur d'écran (`aria-label`).
    const ecran = lireTexte(CHEMIN_ECRAN);
    for (const [code, libelle] of LIBELLES) {
      expect(ecran.includes(`'${code}', `), code).toBe(true);
      expect(ecran.includes(`'${libelle}'`), libelle).toBe(true);
    }
  });

  it('le décor injecté est masqué au lecteur d’écran : ses 7 `<title>` ne parlent pas', () => {
    // Sept `<title>` injectés, c'est sept noms accessibles de plus — treize nœuds nommés
    // mesurés dans Chrome, en doublon des six prises qui portent déjà le nom de leur région.
    const ecran = lireTexte(CHEMIN_ECRAN);
    const balise = /<g\s+data-decor="carte"([\s\S]{0,200}?)\/>/u.exec(ecran)?.[1] ?? '';
    expect(balise, 'le décor de la carte doit être masqué : il n’est qu’un dessin').toContain(
      'aria-hidden="true"'
    );
  });
});
