/**
 * Ce que le palier `verifier` ne couvre PAS, et que seul `verifier:complet` couvre.
 *
 * Une seule liste, lue par `verifier.mjs` (en tête de `RAPPORT.md`) et par le contrat
 * `tests/unitaires/palier-verifier.test.ts`, qui exige que chaque suite échantillonnée y figure.
 * Un `verifier` vert ne doit jamais se lire comme un `complet` vert.
 */
export const COMPLET_SEULEMENT = [
  {
    suite: 'tests/e2e/parcours-audit-tout-le-site.spec.ts',
    reste: 'sorties, R16 et réactions des 76 nœuds (un par moteur ici) ; chaque écran aux 3 formats (un seul ici) ; tous les lots de réactions (un par écran ici)'
  },
  {
    suite: 'tests/e2e/parcours-aucun-geste-mort.spec.ts',
    reste: 'Q5 sur les 76 nœuds (un par moteur ici)'
  },
  {
    suite: 'tests/e2e/parcours-tactile-exhaustif.spec.ts',
    reste: 'les 76 nœuds joués au doigt (un par moteur ici)'
  },
  {
    suite: 'tests/qualite/a11y-tout-le-site.spec.ts',
    reste: 'axe sur les 76 nœuds (un par moteur ici) ; chaque écran aux 3 formats (un seul ici)'
  },
  {
    suite: 'tests/qualite/mise-en-page-tablette.spec.ts',
    reste: 'R20 sur les 76 nœuds (un par moteur ici) ; chaque écran aux 3 formats (un seul ici)'
  },
  {
    suite: 'tests/e2e/parcours-paires-cadrage.spec.ts',
    reste: 'les 8 nœuds paires (2 ici)'
  },
  {
    suite: 'tests/e2e/parcours-paires-defilement.spec.ts',
    reste: 'les 8 nœuds paires (2 ici)'
  },
  {
    suite: 'tests/e2e/parcours-chemins-regles.spec.ts',
    reste: 'les 7 nœuds chemin (2 ici)'
  },
  {
    suite: 'tests/e2e/parcours-attrape-accessibilite.spec.ts',
    reste: 'les nœuds attrape (2 ici)'
  },
  {
    suite: 'tests/e2e/parcours-mots-incomplets.spec.ts',
    reste: 'les nœuds grave (2 ici)'
  },
  {
    suite: 'tests/e2e/parcours-coloriages-reperes.spec.ts',
    reste: 'toutes les scènes de coloriage (2 ici)'
  },
  {
    suite: 'vitest --coverage',
    reste: 'les seuils de couverture par zone (annexe T § 7)'
  }
];

/** Les lignes d'en-tête de `RAPPORT.md` pour un palier donné. */
export function enteteDuPalier(palier, rotation) {
  if (palier === 'complet') {
    return ['**Palier** `complet` : balayages exhaustifs, trois formats par écran, couverture par zone.'];
  }
  return [
    `**Palier** \`verifier\` (rotation ${String(rotation)}) — échantillonné. **Un vert ici n’est pas un vert \`complet\`.**`,
    'Ce palier ne couvre PAS (seulement `npm run verifier:complet`) :',
    ...COMPLET_SEULEMENT.map((e) => `- \`${e.suite}\` : ${e.reste}`),
    '- La mise en page de chaque nœud à 7 formats reste couverte ici par `tests/qualite/socle-activite.spec.ts`.'
  ];
}
