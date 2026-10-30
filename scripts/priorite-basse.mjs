/**
 * Les tests ne prennent qu'une partie de la machine (demande du parent, 9 oct. 2026) : elle est
 * partagée, et une campagne qui occupait les 32 fils empêchait le reste de travailler.
 *
 * Deux mesures, toutes deux HÉRITÉES par les processus enfants (Vitest, Playwright, navigateurs,
 * serveurs de test) :
 *   1. l'AFFINITÉ : le processus et toute sa descendance sont cantonnés à `PIERRE_FILS` fils
 *      logiques (8 par défaut, les derniers de la machine). C'est la vraie borne : Chrome relève
 *      la priorité de certains de ses processus (mesuré : « AboveNormal » sur 2 processus sur 3),
 *      mais il ne touche pas à l'affinité ;
 *   2. la PRIORITÉ « en dessous de la normale » : sur ces fils, les autres programmes passent
 *      d'abord. Héritage mesuré par `bac-a-sable/priorite/heritage.mjs` (parent, enfant et
 *      petit-enfant à 10).
 *
 * Importé en tête de `scripts/verifier.mjs`, `scripts/verifier-rapide.mjs`, `scripts/playwright.mjs`,
 * `playwright.config.ts` et `vitest.config.ts`. Posé une seule fois par arbre de processus
 * (`PIERRE_FILS_POSES`). `PIERRE_PRIORITE=normale` désactive les deux (mesure de durée sur machine
 * calme). Le plafond de 4 travailleurs reste la première protection.
 */
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const FILS_PAR_DEFAUT = 8;

function poserLAffinite() {
  if (process.platform !== 'win32') return;
  const total = os.availableParallelism();
  const demandes = Number.parseInt(process.env['PIERRE_FILS'] ?? String(FILS_PAR_DEFAUT), 10);
  const fils = Math.max(2, Math.min(total, Number.isInteger(demandes) ? demandes : FILS_PAR_DEFAUT));
  if (fils >= total) return;
  // Les `fils` derniers processeurs logiques : ((1 << fils) - 1) << (total - fils).
  const masque = ((1n << BigInt(fils)) - 1n) << BigInt(total - fils);
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `(Get-Process -Id ${String(process.pid)}).ProcessorAffinity = [IntPtr]${masque.toString()}`], { stdio: 'ignore' });
}

export function cantonnerLesTests() {
  if (process.env['PIERRE_PRIORITE'] === 'normale' || process.env['PIERRE_FILS_POSES'] === '1') return;
  process.env['PIERRE_FILS_POSES'] = '1';
  try {
    const actuelle = os.getPriority(process.pid);
    // Ne jamais remonter une priorité déjà plus basse.
    if (actuelle < os.constants.priority.PRIORITY_BELOW_NORMAL) {
      os.setPriority(process.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
    }
    poserLAffinite();
  } catch {
    // Sans droit de changer priorité ou affinité, les tests tournent quand même : c'est un confort.
  }
}

cantonnerLesTests();
