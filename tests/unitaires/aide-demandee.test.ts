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

import { RACINE_DEPOT } from '../configuration/preparation.js';

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

  test('R17 — la demande est enregistrée MÊME quand le palier ne bouge pas', () => {
    // La garde `if (niveau === etat.niveauAide) return etat;` seule rendait le tap inerte dès
    // que l'aide était déjà montée. La condition doit maintenant regarder LES DEUX, sinon on
    // retombe exactement sur le défaut que le père a signalé.
    const sansGarde: string[] = [];
    for (const moteur of moteurs()) {
      if (SANS_AIDE.has(moteur)) continue;
      const code = source(moteur, 'moteur.ts');
      if (!code.includes("aideLaPlusHaute(") || !code.includes("'demanderAide'")) continue;
      if (!/demandee === \w+\.aideDemandee\) return etat;/u.test(code)) {
        sansGarde.push(moteur);
      }
    }
    expect(
      sansGarde,
      'ces moteurs rendent l’état inchangé quand le palier est déjà monté : taper sur Gobi n’y ' +
        'fait rien, et le journal retient une aide jamais demandée'
    ).toEqual([]);
  });

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
