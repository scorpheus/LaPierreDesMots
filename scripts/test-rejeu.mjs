/**
 * `npm run test:rejeu` — T2, rejeu des journaux de référence. Lot L-G.
 *
 * **C'est la seule coquille de la v1** (contrat gelé § 8.1 et écart assumé n° 7). Elle existe
 * parce qu'un script absent se remarque au moment où on en a besoin, c'est-à-dire trop tard.
 *
 * Elle refuse d'annoncer un succès muet : son rapport dit explicitement qu'elle n'a rien
 * vérifié. Et surtout — **elle échoue si des journaux apparaissent** sans qu'un moteur de rejeu
 * existe pour les rejouer. Un générateur refuse d'écrire plutôt que d'émettre du faux : un
 * script de vérification refuse de sortir en vert plutôt que de faire semblant.
 *
 * Ce qu'elle deviendra au lot suivant (annexe T § T2) : rejouer chaque journal de
 * `tests/fixtures/journaux/` dans le moteur pédagogique, comparer aux agrégats de référence, et
 * s'arrêter sur toute divergence — jamais mettre la référence à jour de sa propre initiative.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { RACINE, ecrireEtape, genererRapport } from './rapport.mjs';

const ETAPE = 'test:rejeu';
const debut = Date.now();

const DOSSIER_JOURNAUX = join(RACINE, 'tests', 'fixtures', 'journaux');

/**
 * Un moteur de rejeu suppose BKT, Leitner et sélecteur : la décision D1 les exclut tous les
 * trois de la v1. Le jour où l'un d'eux existe, ce drapeau passe à `true` et le script cesse
 * d'être une coquille.
 */
const MOTEUR_DE_REJEU_DISPONIBLE = false;

const journaux = existsSync(DOSSIER_JOURNAUX)
  ? readdirSync(DOSSIER_JOURNAUX, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort()
  : [];

let statut;
let note;
const details = [];

if (journaux.length === 0) {
  statut = 'vide';
  note =
    '0 journal de référence dans `tests/fixtures/journaux/` : **aucun test à ce stade**. ' +
    'Ce n’est pas une réussite, c’est une absence. La décision D1 exclut BKT et Leitner de la ' +
    'v1 (contrat, écart assumé n° 7) ; le filet contre les régressions pédagogiques silencieuses ' +
    'n’existe donc pas encore.';
} else if (!MOTEUR_DE_REJEU_DISPONIBLE) {
  statut = 'echec';
  note =
    `${journaux.length} journal(aux) de référence sont présents, mais aucun moteur de rejeu ` +
    'n’existe en v1. Sortir en vert reviendrait à déclarer vérifié ce qui ne l’est pas. ' +
    'Implanter le rejeu (annexe T § T2) ou retirer ces journaux.';
  for (const nom of journaux) {
    details.push({ ou: `tests/fixtures/journaux/${nom}`, message: 'journal jamais rejoué' });
  }
} else {
  // Chemin réservé au lot qui implantera le rejeu — il ne doit jamais être atteint en v1.
  statut = 'echec';
  note = 'moteur de rejeu déclaré disponible mais non implanté : incohérence de ce script.';
}

ecrireEtape({
  etape: ETAPE,
  statut,
  dureeMs: Date.now() - debut,
  total: journaux.length,
  echecs: details.length,
  details,
  note
});
genererRapport({ commande: 'npm run test:rejeu' });

console.log(`test:rejeu — ${journaux.length} journal(aux). ${note}`);
process.exit(statut === 'echec' ? 1 : 0);
