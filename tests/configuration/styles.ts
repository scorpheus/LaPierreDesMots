import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Lit une feuille et ses imports locaux, dans leur ordre, sans supposer un CSS monolithique. */
export function lireStyles(chemin: string, dejaLus = new Set<string>()): string {
  const absolu = resolve(chemin);
  if (dejaLus.has(absolu)) return '';
  dejaLus.add(absolu);
  return readFileSync(absolu, 'utf8').replace(
    /@import\s+["'](\.[^"']+\.css)["']\s*;/gu,
    (_import, relatif: string) => lireStyles(resolve(dirname(absolu), relatif), dejaLus)
  );
}
