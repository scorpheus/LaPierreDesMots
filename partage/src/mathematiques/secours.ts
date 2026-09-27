import { CATALOGUE_MATHS } from './catalogue.js';
import type { FamilleMaths, NiveauMaths } from './types.js';

/** Graines éditoriales V1, une par couple famille-niveau, relues avec le catalogue. */
export const VERSION_SECOURS_MATHS = 1;
const GRAINES_SECOURS: Readonly<Record<FamilleMaths, Readonly<Record<NiveauMaths, number>>>> = {
  'MAT-JAR-01': { decouverte: 101, exploration: 102, defi: 103 }, 'MAT-JAR-02': { decouverte: 104, exploration: 105, defi: 106 }, 'MAT-JAR-03': { decouverte: 107, exploration: 108, defi: 109 },
  'MAT-PON-01': { decouverte: 201, exploration: 202, defi: 203 }, 'MAT-PON-02': { decouverte: 204, exploration: 205, defi: 206 }, 'MAT-PON-03': { decouverte: 207, exploration: 208, defi: 209 },
  'MAT-MOU-01': { decouverte: 301, exploration: 302, defi: 303 }, 'MAT-MOU-02': { decouverte: 304, exploration: 305, defi: 306 }, 'MAT-MOU-03': { decouverte: 307, exploration: 308, defi: 309 },
  'MAT-MAR-01': { decouverte: 401, exploration: 402, defi: 403 }, 'MAT-MAR-02': { decouverte: 404, exploration: 405, defi: 406 }, 'MAT-MAR-03': { decouverte: 407, exploration: 408, defi: 409 },
  'MAT-CHA-01': { decouverte: 501, exploration: 502, defi: 503 }, 'MAT-CHA-02': { decouverte: 504, exploration: 505, defi: 506 }, 'MAT-CHA-03': { decouverte: 507, exploration: 508, defi: 509 },
  'MAT-HOR-01': { decouverte: 601, exploration: 602, defi: 603 }, 'MAT-HOR-02': { decouverte: 604, exploration: 605, defi: 606 }, 'MAT-HOR-03': { decouverte: 607, exploration: 608, defi: 609 },
};
export function graineSecoursMaths(famille: FamilleMaths, niveau: NiveauMaths): number { return GRAINES_SECOURS[famille][niveau]; }
export function couvertureSecoursMaths(): readonly string[] {
  return CATALOGUE_MATHS.flatMap((famille) => (['decouverte', 'exploration', 'defi'] as const).map((niveau) => `${famille.id}:${niveau}:${String(graineSecoursMaths(famille.id, niveau))}`));
}
