import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  calculerEntrees, commencerVerification, enregistrerPreuve, lirePreuveValide,
  verrouillerVerification,
} from '../../scripts/preuve-verification.mjs';
import { ORDRE_ETAPES, nomDeFichier } from '../../scripts/rapport.mjs';

const dossiers: string[] = [];
function depot(avecLanceur = false) {
  const racine = mkdtempSync(path.resolve('bac-a-sable/preuve-verification-'));
  dossiers.push(racine);
  execFileSync('git', ['init', '--quiet', racine]);
  const ecrire = (nom: string, contenu: string) => {
    mkdirSync(path.dirname(path.join(racine, nom)), { recursive: true });
    writeFileSync(path.join(racine, nom), contenu);
  };
  ecrire('.gitignore', 'bac-a-sable/\ntests/rapports/\ncontenu/audio/\nnode_modules/\noutils/\n');
  ecrire('source.ts', 'export const valeur = 1;');
  ecrire('outils/navigateurs/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe', 'navigateur');
  if (avecLanceur) {
    for (const fichier of ['verifier.mjs', 'preuve-verification.mjs', 'rapport.mjs', 'couverture-zones.mjs', 'sortie-outils.mjs']) {
      ecrire(`scripts/${fichier}`, readFileSync(`scripts/${fichier}`, 'utf8'));
    }
  }
  for (const [etape] of [...ORDRE_ETAPES, ['qa:controles']]) {
    ecrire(`tests/rapports/${nomDeFichier(etape)}`, JSON.stringify({ etape, statut: 'reussite', total: 1, echecs: 0 }));
  }
  const empreinte = calculerEntrees(racine);
  const sceller = () => enregistrerPreuve(empreinte, racine);
  return { racine, ecrire, sceller };
}
afterEach(() => { for (const dossier of dossiers.splice(0)) rmSync(dossier, { recursive: true, force: true }); });

describe('preuve réutilisable de la campagne complète', () => {
  it('réutilise les mêmes octets après indexation sans rejouer la campagne', () => {
    const { racine, sceller } = depot();
    sceller();
    execFileSync('git', ['-C', racine, 'add', '.']);
    expect(lirePreuveValide(racine)?.etapes).toBe(15);
  });
  it.each(['source.ts', 'nouveau.ts', 'contenu/audio/consigne.opus', 'node_modules/outil/index.js', 'outils/navigateurs/chrome.exe', '.env'])(
  'invalide la preuve après modification de %s', (fichier) => {
    const { racine, ecrire, sceller } = depot();
    sceller();
    ecrire(fichier, 'modifié');
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('refuse un rapport vert incomplet et un rapport retouché après validation', () => {
    const { racine, ecrire, sceller } = depot();
    sceller();
    ecrire('tests/rapports/test.json', JSON.stringify({ etape: 'test', statut: 'reussite', total: 0, echecs: 0 }));
    expect(lirePreuveValide(racine)).toBeNull();
    expect(sceller).toThrow(/rapport/u);
    rmSync(path.join(racine, 'tests/rapports/test.json'));
    expect(sceller).toThrow();
  });
  it('ne certifie pas des sources modifiées pendant la campagne', () => {
    const { ecrire, sceller } = depot();
    ecrire('source.ts', 'autre version');
    expect(sceller).toThrow(/changé/u);
  });
  it('ignore le journal que Chromium écrit dans son installation, mais surveille son exécutable', () => {
    const { racine, ecrire, sceller } = depot();
    sceller();
    const installation = 'outils/navigateurs/chromium_headless_shell-1234/chrome-headless-shell-win64';
    ecrire(`${installation}/debug.log`, 'journal de la campagne');
    expect(lirePreuveValide(racine)).not.toBeNull();
    ecrire(`${installation}/chrome-headless-shell.exe`, 'autre navigateur');
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('refuse aussi une suppression et une preuve illisible', () => {
    const { racine, ecrire, sceller } = depot();
    sceller();
    rmSync(path.join(racine, 'source.ts'));
    expect(lirePreuveValide(racine)).toBeNull();
    ecrire('source.ts', 'export const valeur = 1;');
    ecrire('bac-a-sable/verification-preuve.json', '{cassé');
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('ne lance aucun test si la commande retrouve la preuve complète', () => {
    const { racine, sceller } = depot(true);
    sceller();
    const resultat = spawnSync(process.execPath, ['scripts/verifier.mjs', '--si-necessaire'], { cwd: racine, encoding: 'utf8' });
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(resultat.stdout).toContain('Validation réutilisée');
    // Le dépôt factice ne contient ni npm installé ni commande de test : toute campagne échouerait.
    expect(resultat.stdout).not.toContain('chaîne complète');
  });
  it('relance la vérification après changement et ne masque pas le prérequis absent', () => {
    const { racine, ecrire, sceller } = depot(true);
    sceller();
    ecrire('source.ts', 'modifié');
    const resultat = spawnSync(process.execPath, ['scripts/verifier.mjs', '--si-necessaire'], { cwd: racine, encoding: 'utf8' });
    expect(resultat.status).toBe(1);
    expect(resultat.stdout).toContain('Aucune preuve complète valide');
    expect(resultat.stderr).toContain('node_modules');
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('garde la commande explicite sans option comme campagne forcée', () => {
    const { racine, sceller } = depot(true);
    sceller();
    const resultat = spawnSync(process.execPath, ['scripts/verifier.mjs'], { cwd: racine, encoding: 'utf8' });
    expect(resultat.status).toBe(1);
    expect(resultat.stdout).not.toContain('Validation réutilisée');
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('invalide une ancienne réussite dès le début d’une nouvelle campagne', () => {
    const { racine, sceller } = depot();
    sceller();
    commencerVerification(racine);
    expect(lirePreuveValide(racine)).toBeNull();
  });
  it('empêche deux campagnes de partager les rapports', () => {
    const { racine } = depot();
    const liberer = verrouillerVerification(racine);
    try { expect(() => verrouillerVerification(racine)).toThrow(/active/u); }
    finally { liberer(); }
    const suivant = verrouillerVerification(racine);
    suivant();
  });
  it('branche la réutilisation dans le push et la préparation sans désactiver les contrôles', () => {
    expect(readFileSync('lefthook.yml', 'utf8')).toContain('npm run verifier -- --si-necessaire --exiger-propre');
    expect(readFileSync('scripts/publier-site.mjs', 'utf8')).toContain("argumentsSupplementaires: ['--si-necessaire']");
  });
});
