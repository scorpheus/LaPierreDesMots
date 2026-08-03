/**
 * Dépouillement de la sortie brute — le cas « l'étape échoue, aucun test n'échoue ».
 *
 * ── Ce que ces tests gardent ─────────────────────────────────────────────────────────────
 *
 * L'étape `test` de `npm run verifier` est sortie en 1 avec **1975 tests passés et 0 en
 * échec**. Le rapport n'en disait rien d'utile : il accolait à tout échec de cette étape la
 * note « couverture globale … Seuils PAR ZONE : annexe T § 7 », qui ressemblait à un
 * diagnostic sans en être un. Mesuré sur le journal de cet échec :
 * `grep -c -i "threshold"` → **0**. Aucun seuil n'était en cause.
 *
 * La vraie cause n'existait que dans la sortie, invisible du rapport JSON de Vitest :
 *
 *     Vitest caught 1 unhandled error during the test run.
 *     Error: [vitest-worker]: Timeout calling "onTaskUpdate"
 *
 * D'où les deux propriétés tenues ici :
 *
 *   1. l'erreur non capturée est NOMMÉE — sans quoi l'étape échoue sans explication ;
 *   2. **aucun innocent n'est nommé** — un premier jet balayait toute la sortie et remontait
 *      4 erreurs là où Vitest en annonçait 1, les 3 autres étant du `stderr` de tests qui
 *      passaient. Nommer un innocent, c'est refaire le défaut qu'on corrige.
 */
import { describe, expect, it } from 'vitest';

import { erreursNonCapturees, sansAnsi } from '../../scripts/sortie-outils.mjs';

const ESC = String.fromCharCode(27);

describe('sansAnsi', () => {
  it('retire les séquences de couleur', () => {
    expect(sansAnsi(`${ESC}[31m${ESC}[1mError${ESC}[22m: cassé${ESC}[39m`)).toBe('Error: cassé');
  });

  it('ne touche pas aux crochets légitimes d’un message', () => {
    // `[vitest-worker]` doit survivre : c'est ce qui identifie l'erreur.
    expect(sansAnsi('Error: [vitest-worker]: Timeout calling "onTaskUpdate"')).toBe(
      'Error: [vitest-worker]: Timeout calling "onTaskUpdate"'
    );
    expect(sansAnsi('un tableau [1, 2, 3] et un [mot]')).toBe('un tableau [1, 2, 3] et un [mot]');
  });

  it('laisse un texte sans couleur intact', () => {
    expect(sansAnsi('rien à retirer')).toBe('rien à retirer');
  });
});

describe('erreursNonCapturees', () => {
  /** La forme exacte du journal réel, codes de couleur compris. */
  const journalReel =
    `stderr | tests/composants/MoteurPaires.test.tsx\n` +
    `AggregateError: \n    at internalConnectMultiple (node:net:1134:18)\n` +
    `  code: 'ECONNREFUSED',\n` +
    `Error: connect ECONNREFUSED ::1:3000\n` +
    `\n${ESC}[31m⎯⎯⎯${ESC}[39m${ESC}[1m${ESC}[41m Unhandled Errors ${ESC}[49m${ESC}[22m${ESC}[31m⎯⎯⎯${ESC}[39m\n` +
    `${ESC}[31m${ESC}[1m\n` +
    `Vitest caught 1 unhandled error during the test run.\n` +
    `This might cause false positive tests.${ESC}[22m${ESC}[39m\n` +
    `\n${ESC}[31m⎯⎯⎯${ESC}[39m${ESC}[1m${ESC}[41m Unhandled Error ${ESC}[49m${ESC}[22m${ESC}[31m⎯⎯⎯${ESC}[39m\n` +
    `${ESC}[31m${ESC}[1mError${ESC}[22m: [vitest-worker]: Timeout calling "onTaskUpdate"${ESC}[39m\n` +
    `${ESC}[90m ${ESC}[2m❯${ESC}[22m Object.onTimeoutError node_modules/vitest/dist/chunks/rpc.js\n`;

  it('nomme l’erreur non capturée qui a fait échouer l’étape', () => {
    const { annonce, erreurs } = erreursNonCapturees(journalReel);
    expect(annonce).toBe(1);
    expect(erreurs).toContain('Error: [vitest-worker]: Timeout calling "onTaskUpdate"');
  });

  it('NE NOMME AUCUN INNOCENT : le stderr des tests qui passent est ignoré', () => {
    // Les trois erreurs situées AVANT la bannière sont du bruit de tests qui passent.
    const { erreurs } = erreursNonCapturees(journalReel);
    expect(erreurs).toHaveLength(1);
    expect(erreurs.join(' ')).not.toContain('ECONNREFUSED');
    expect(erreurs.join(' ')).not.toContain('AggregateError');
  });

  it('ne compte que ce que Vitest annonce lui-même', () => {
    const { annonce, erreurs } = erreursNonCapturees(journalReel);
    expect(erreurs.length).toBeLessThanOrEqual(Math.max(annonce, 1));
  });

  it('une sortie verte ne produit aucune erreur', () => {
    // Le cas qui compte le plus : pas de faux positif, sinon la chaîne rougirait sans motif.
    const vert = ' Test Files  137 passed (137)\n      Tests  1988 passed (1988)\n';
    expect(erreursNonCapturees(vert)).toEqual({ annonce: 0, erreurs: [] });
  });

  it('une sortie contenant « Error: » mais aucune bannière ne remonte rien', () => {
    const bruit = 'stderr | un.test.ts\nError: ceci est capturé par le test lui-même\n';
    expect(erreursNonCapturees(bruit).erreurs).toHaveLength(0);
  });
});
