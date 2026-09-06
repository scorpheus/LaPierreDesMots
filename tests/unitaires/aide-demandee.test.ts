/**
 * GOBI PEUT PROPOSER ; SEULE LA DEMANDE COMPTE — R15 et R17.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * DEUX RETOURS DU PÈRE, UNE SEULE CAUSE
 *
 *   « ça met, tu n'as que deux étoiles parce que Gobi a aidé, alors que c'est pas vrai, on l'a
 *     fait sans »                                                                        (R15)
 *   « quand on appuie sur Gobi, ça ne fait rien non plus »                                (R17)
 *
 * Mesuré dans `partage/src/moteurs/commun/delais.ts` :
 *
 *     indiceMs : 45 000        →  45 s d'INACTIVITÉ et le palier monte tout seul
 *     erreursAvantIndice : 2
 *
 * Et le cas `demanderAide` commençait par :
 *
 *     const niveau = aideLaPlusHaute(etape.niveauAide, 'indice');
 *     if (niveau === etape.niveauAide) return etat;      // ← l'état ne bouge pas
 *
 * Donc quand le palier était **déjà monté tout seul**, taper sur Gobi rendait l'état inchangé :
 * aucun effet visible (R17), et le journal retenait quand même une aide jamais demandée (R15) —
 * une étoile en moins, un BKT et un Leitner nourris d'une information fausse.
 *
 * « L'aide de Gobi ne coûte rien et n'est jamais présentée comme un échec ; elle change seulement
 * le nombre d'étoiles » suppose un CHOIX. Une proposition spontanée n'en est pas un : la punir
 * revient à punir la lenteur, c'est-à-dire exactement l'enfant que ce jeu vise (D14).
 *
 * ── CE QUE CE FICHIER GARDE ───────────────────────────────────────────────────────────────────
 * Les deux moitiés, sur les TREIZE moteurs qui ont une aide explicite, et pas seulement sur celui
 * où le père l'a vu. Le recensement se marche par le dossier des moteurs : un moteur ajouté
 * demain entre dans le contrat tout seul.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';
import { moteursEnregistres } from '@pierre/partage';
import type { MoteurQuelconque } from '@pierre/partage';

import { RACINE_DEPOT } from '../configuration/preparation.js';
import { DELAIS_AIDE_PAR_DEFAUT } from '../../partage/src/moteurs/commun/delais.js';
import { CAS_MOTEURS, monter, reduire, resumeDe } from './propriete-outils.js';

const DOSSIER = join(RACINE_DEPOT, 'partage', 'src', 'moteurs');

/** Les moteurs livrés, `commun` exclu — c'est le socle, pas un moteur. */
function moteurs(): readonly string[] {
  return readdirSync(DOSSIER, { withFileTypes: true })
    .filter((entree) => entree.isDirectory() && entree.name !== 'commun')
    .map((entree) => entree.name)
    .sort();
}

const source = (moteur: string, fichier: string): string =>
  readFileSync(join(DOSSIER, moteur, fichier), 'utf8');

/** `libre` n'a aucune aide, par conception : « il n'y a rien à aider ». */
const SANS_AIDE = new Set(['libre']);
const CAS_AVEC_AIDE = CAS_MOTEURS.filter((cas) => !SANS_AIDE.has(cas.code));

/** Le journal et l'état public font foi, pas l'ordre des clauses d'une garde dans la source. */
function verifierDemandeExplicite(moteur: MoteurQuelconque, avant: unknown, apres: unknown): void {
  const resume = resumeDe(moteur, apres);
  expect(resume.aideUtilisee, 'la demande explicite doit entrer dans le journal').toBe('indice');
  expect(resume.etapes.some((etape) => etape.aideUtilisee === 'indice')).toBe(true);
  expect(resume.nbErreurs).toBe(resumeDe(moteur, avant).nbErreurs);
  expect(apres, 'la demande change bien l’état même après une aide automatique').not.toBe(avant);
}

describe('R15 — le journal retient ce que l’enfant a DEMANDÉ, pas ce que Gobi a proposé', () => {
  test('CONTRÔLE POSITIF — les quatorze moteurs sont trouvés', () => {
    // Sans lui, un chemin faux rendrait une liste vide et tout le fichier serait vert en ne
    // vérifiant rien. C'est le mode de défaillance que ce dépôt corrige partout.
    expect(moteurs().length).toBeGreaterThanOrEqual(14);
  });

  test('le résumé lit `aideDemandee`, JAMAIS `niveauAide`', () => {
    // C'est la ligne qui décide de la deuxième étoile, du BKT et du Leitner. Une seule source,
    // et il faut qu'elle soit la bonne : `niveauAide` est ce que Gobi MONTRE, et il monte seul.
    const socle = readFileSync(join(DOSSIER, 'commun', 'etapes.ts'), 'utf8');
    expect(socle).toContain('aideUtilisee: etape.aideDemandee');
    expect(
      socle,
      'le résumé retomberait sur le palier proposé, celui qui monte tout seul'
    ).not.toMatch(/aideUtilisee: etape\.niveauAide/u);
  });

  test('chaque étape porte les DEUX paliers — le proposé et le demandé', () => {
    for (const moteur of moteurs()) {
      const types = source(moteur, 'types.ts');
      expect(types, `${moteur} : pas de palier proposé`).toMatch(/readonly niveauAide: NiveauAide;/u);
      expect(
        types,
        `${moteur} : pas de palier demandé — son journal retiendrait une aide non réclamée`
      ).toMatch(/readonly aideDemandee: NiveauAide;/u);
    }
  });

  test('R17 — les scénarios exécutables couvrent tous les moteurs qui proposent une aide', () => {
    expect(CAS_AVEC_AIDE.length).toBeGreaterThan(0);
    expect(CAS_AVEC_AIDE.map((cas) => cas.code).sort()).toEqual(
      moteursEnregistres().filter((code) => !SANS_AIDE.has(code)).sort(),
    );
  });

  for (const palier of ['indice', 'demonstration'] as const) {
    test.each(CAS_AVEC_AIDE)(`R15/R17 — $code : demande après ${palier} automatique`, (cas) => {
      const { moteur, etatInitial, contexte } = monter(cas);
      contexte.horloge.avancer({ secondes: (DELAIS_AIDE_PAR_DEFAUT.indiceMs + 1) / 1_000 });
      let automatique = reduire(moteur, etatInitial, { type: 'battementHorloge' }, contexte);
      if (palier === 'demonstration') {
        contexte.horloge.avancer({ secondes: (DELAIS_AIDE_PAR_DEFAUT.demonstrationMs + 1) / 1_000 });
        automatique = reduire(moteur, automatique, { type: 'battementHorloge' }, contexte);
      }
      expect(moteur.aideProposee(automatique)?.niveau, 'le scénario atteint réellement le palier automatique').toBe(palier);
      expect(resumeDe(moteur, automatique).aideUtilisee, 'attendre ne compte pas comme demander de l’aide').toBe('aucune');
      expect(resumeDe(moteur, automatique).etapes.every((etape) => etape.aideUtilisee === 'aucune')).toBe(true);

      const demandee = reduire(moteur, automatique, { type: 'demanderAide' }, contexte);
      verifierDemandeExplicite(moteur, automatique, demandee);
      expect(moteur.aideProposee(demandee)?.niveau, 'le palier déjà proposé n’est pas retiré').toBe(palier);

      // Témoin négatif : simule l'ancienne garde qui rendait l'état automatique inchangé.
      // Le même oracle doit la refuser pour sa demande absente, pas pour sa syntaxe.
      expect(() => verifierDemandeExplicite(moteur, automatique, automatique)).toThrow(/demande explicite/u);
    });
  }

  test('et la demande est bien REPORTÉE dans l’étape mise à jour', () => {
    const sansReport: string[] = [];
    for (const moteur of moteurs()) {
      if (SANS_AIDE.has(moteur)) continue;
      const code = source(moteur, 'moteur.ts');
      if (!code.includes("'demanderAide'")) continue;
      if (!code.includes('aideDemandee: demandee')) sansReport.push(moteur);
    }
    expect(sansReport, 'la demande est calculée puis jetée').toEqual([]);
  });

  test('`libre` reste sans aide, et c’est une décision écrite', () => {
    // « Il n'y a rien à aider : aider suppose une attente, et il n'y en a aucune. » Le vérifier
    // empêche qu'on lui ajoute une aide par symétrie, sans y penser.
    const code = source('libre', 'moteur.ts');
    expect(code).toMatch(/demanderAide/u);
    expect(code, 'libre s’est mis à faire monter un palier').not.toMatch(
      /aideDemandee: demandee/u
    );
  });
});
