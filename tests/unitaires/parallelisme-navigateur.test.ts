import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const configuration = readFileSync(
  fileURLToPath(new URL('../../playwright.config.ts', import.meta.url)),
  'utf8',
);

describe('parallélisme des campagnes navigateur', () => {
  it('borne le réglage par défaut à quatre travailleurs sur Windows', () => {
    expect(configuration).toMatch(/const PLAFOND_TRAVAILLEURS = 4;/u);
  });
});
