/** Le commit réutilise une campagne complète ou exécute ses gardes habituelles. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE } from './rapport.mjs';
import { lirePreuveValide } from './preuve-verification.mjs';

const indexIdentique = spawnSync('git', ['diff', '--quiet'], { cwd: RACINE }).status === 0;
const preuve = indexIdentique && !existsSync(join(RACINE, 'bac-a-sable/verification.lock')) && lirePreuveValide();
if (preuve) {
  console.log(`Commit : lint et logique déjà validés dans la campagne du ${preuve.valideLe}, entrées inchangées.`);
} else {
  for (const script of ['lint', 'test']) {
    const resultat = spawnSync('npm', ['run', script], { cwd: RACINE, stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true });
    if (resultat.error) throw resultat.error;
    if (resultat.status !== 0) process.exit(resultat.status ?? 1);
  }
}
