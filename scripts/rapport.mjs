/**
 * Agrégation des rapports de test — lot L-G.
 *
 * Contrat gelé § 8.2 : « Chaque étape écrit `tests/rapports/<etape>.json` :
 * `{ etape, statut, dureeMs, total, echecs, details }` […] `tests/rapports/RAPPORT.md` est le
 * seul document que l'agent lit ; la sortie brute ne fait pas foi. »
 *
 * Ce module est à la fois :
 *   • une bibliothèque — `ecrireEtape()` et `genererRapport()` sont importées par
 *     `verifier.mjs`, `test-contenu.mjs`, `test-visuel.mjs`, `test-rejeu.mjs` et
 *     `verifier-bundle.mjs` ;
 *   • une commande — `node scripts/rapport.mjs` régénère `RAPPORT.md` depuis les JSON déjà
 *     présents, sans rien réexécuter.
 *
 * Aucune dépendance : il tourne même quand `npm install` n'a pas encore été fait.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = fileURLToPath(new URL('..', import.meta.url));
export const DOSSIER_RAPPORTS = join(RACINE, 'tests', 'rapports');
export const DOSSIER_BRUT = join(DOSSIER_RAPPORTS, 'brut');
export const DOSSIER_ARTEFACTS = join(DOSSIER_RAPPORTS, 'artefacts');
export const CHEMIN_RAPPORT_MD = join(DOSSIER_RAPPORTS, 'RAPPORT.md');

/** Les statuts possibles d'une étape, et ce qu'ils veulent dire. */
export const STATUTS = {
  reussite: { symbole: '✅', libelle: 'réussite', bloquant: false },
  vide: { symbole: '➖', libelle: 'aucun cas à ce stade', bloquant: false },
  echec: { symbole: '❌', libelle: 'échec', bloquant: true },
  environnement: { symbole: '🔌', libelle: 'défaut d’environnement', bloquant: true }
};

/**
 * L'ordre canonique de la chaîne — contrat § 8.2. Il gouverne l'ordre du tableau du rapport,
 * quel que soit l'ordre dans lequel les fichiers JSON ont été écrits.
 */
export const ORDRE_ETAPES = [
  ['lint', 'ESLint', '—'],
  ['typescript', 'TypeScript (`tsc -b`)', '—'],
  ['test', 'Unitaires, composants, API', 'T1 + T2'],
  ['test:contenu', 'Validation du contenu', 'T1'],
  ['construire:test', 'Construction du client de test', '—'],
  ['test:e2e', 'Parcours et robustesse', 'T3'],
  ['test:visuel', 'Captures de référence', 'T4'],
  ['construire', 'Construction de production', '—'],
  ['test:qualite', 'Accessibilité et tailles de cible', 'T5'],
  ['bundle', 'Budget de bundle et fuite des crochets', 'T5'],
  ['test:rejeu', 'Rejeu des journaux de référence', 'T2']
];

/** `test:contenu` → `test-contenu` : un nom de fichier sans deux-points, Windows compris. */
export function nomDeFichier(etape) {
  return `${String(etape).replace(/[^a-z0-9._-]+/gi, '-')}.json`;
}

export function preparerDossiers() {
  for (const dossier of [DOSSIER_RAPPORTS, DOSSIER_BRUT, DOSSIER_ARTEFACTS]) {
    mkdirSync(dossier, { recursive: true });
  }
}

/**
 * Écrit `tests/rapports/<etape>.json`.
 *
 * @param {{etape: string, statut: keyof typeof STATUTS, dureeMs?: number, total?: number,
 *          echecs?: number, details?: unknown[], note?: string, artefacts?: string[]}} rapport
 */
export function ecrireEtape(rapport) {
  preparerDossiers();
  if (!(rapport.statut in STATUTS)) {
    throw new Error(
      `statut inconnu « ${rapport.statut} » pour l’étape « ${rapport.etape} » ; ` +
        `attendus : ${Object.keys(STATUTS).join(', ')}`
    );
  }
  const complet = {
    etape: rapport.etape,
    statut: rapport.statut,
    dureeMs: Math.round(rapport.dureeMs ?? 0),
    total: rapport.total ?? 0,
    echecs: rapport.echecs ?? 0,
    details: rapport.details ?? [],
    note: rapport.note ?? null,
    artefacts: rapport.artefacts ?? []
  };
  writeFileSync(
    join(DOSSIER_RAPPORTS, nomDeFichier(rapport.etape)),
    `${JSON.stringify(complet, null, 2)}\n`,
    'utf8'
  );
  return complet;
}

/** Relit tous les rapports d'étape présents sur disque. */
export function lireEtapes() {
  if (!existsSync(DOSSIER_RAPPORTS)) return [];
  const fichiers = readdirSync(DOSSIER_RAPPORTS, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name);

  const etapes = [];
  for (const fichier of fichiers) {
    try {
      const contenu = JSON.parse(readFileSync(join(DOSSIER_RAPPORTS, fichier), 'utf8'));
      if (contenu && typeof contenu.etape === 'string') etapes.push(contenu);
    } catch (erreur) {
      etapes.push({
        etape: fichier.replace(/\.json$/, ''),
        statut: 'echec',
        dureeMs: 0,
        total: 0,
        echecs: 1,
        details: [`rapport illisible : ${erreur instanceof Error ? erreur.message : erreur}`],
        note: null,
        artefacts: []
      });
    }
  }

  const rang = new Map(ORDRE_ETAPES.map(([cle], i) => [cle, i]));
  return etapes.sort(
    (a, b) => (rang.get(a.etape) ?? 999) - (rang.get(b.etape) ?? 999) || a.etape.localeCompare(b.etape)
  );
}

function duree(ms) {
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  return `${minutes} min ${Math.round((ms % 60_000) / 1_000)} s`;
}

function echapperTableau(texte) {
  return String(texte).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * Écrit `tests/rapports/RAPPORT.md` depuis les rapports d'étape présents.
 * @returns {{bloquantes: number, total: number, chemin: string}}
 */
export function genererRapport(options = {}) {
  preparerDossiers();
  const etapes = lireEtapes();
  const libelles = new Map(ORDRE_ETAPES.map(([cle, libelle, niveau]) => [cle, { libelle, niveau }]));

  const bloquantes = etapes.filter((e) => STATUTS[e.statut]?.bloquant);
  const environnement = etapes.filter((e) => e.statut === 'environnement');
  const vides = etapes.filter((e) => e.statut === 'vide');

  const lignes = [];
  lignes.push('# Rapport de vérification — La Pierre des Mots');
  lignes.push('');
   
  // `Horloge` n'existe pas dans un script Node autonome.
  lignes.push(`**Écrit le** ${new Date().toISOString()}`);
  lignes.push(`**Commande** \`${options.commande ?? 'npm run verifier'}\``);
  lignes.push('');

  if (etapes.length === 0) {
    lignes.push('> Aucun rapport d’étape n’a été trouvé. Lancer `npm run verifier`.');
    lignes.push('');
  } else if (bloquantes.length === 0) {
    lignes.push('## ✅ VERT — toutes les étapes sont passées');
    lignes.push('');
    lignes.push(
      `${etapes.length} étape(s) exécutée(s), aucune en échec.` +
        (vides.length > 0
          ? ` ${vides.length} étape(s) n’avaient **aucun cas à vérifier à ce stade** (voir plus bas) : ` +
            'elles ne prouvent rien et ne prétendent rien.'
          : '')
    );
    lignes.push('');
  } else {
    lignes.push(`## ❌ ROUGE — ${bloquantes.length} étape(s) en échec`);
    lignes.push('');
    lignes.push(
      'Tout a été exécuté quand même : la chaîne ne s’interrompt jamais à la première erreur, ' +
        'pour qu’un défaut n’en cache pas trois autres (contrat § 8.2).'
    );
    lignes.push('');
    for (const etape of bloquantes) {
      lignes.push(`- **${etape.etape}** — ${etape.echecs} échec(s) sur ${etape.total}`);
    }
    lignes.push('');
  }

  if (environnement.length > 0) {
    lignes.push('### 🔌 Défaut d’environnement, pas défaut de code');
    lignes.push('');
    lignes.push(
      'Ces étapes n’ont pas pu s’exécuter faute d’un prérequis d’installation. ' +
        'Le contrat § 8.2 nomme le cas : `npm install` à la racine, puis ' +
        '`npx playwright install chromium`. **Aucun agent n’installe** — c’est à l’orchestrateur.'
    );
    lignes.push('');
    for (const etape of environnement) {
      lignes.push(`- **${etape.etape}** — ${etape.note ?? 'prérequis manquant'}`);
    }
    lignes.push('');
  }

  lignes.push('## Étapes');
  lignes.push('');
  lignes.push('| Étape | Niveau | Statut | Durée | Cas | Échecs |');
  lignes.push('|---|---|---|---:|---:|---:|');
  for (const etape of etapes) {
    const meta = libelles.get(etape.etape) ?? { libelle: etape.etape, niveau: '—' };
    const statut = STATUTS[etape.statut] ?? { symbole: '❔', libelle: etape.statut };
    lignes.push(
      `| \`${etape.etape}\` — ${meta.libelle} | ${meta.niveau} | ${statut.symbole} ${statut.libelle} ` +
        `| ${duree(etape.dureeMs)} | ${etape.total} | ${etape.echecs} |`
    );
  }
  lignes.push('');

  if (vides.length > 0) {
    lignes.push('## Ce qui n’a rien vérifié, et pourquoi');
    lignes.push('');
    lignes.push(
      'Une suite qui n’a aucun cas **le dit** plutôt que de sortir en vert silencieux. ' +
        'C’est la seule façon qu’un rapport ne mente pas par omission.'
    );
    lignes.push('');
    for (const etape of vides) {
      lignes.push(`- **${etape.etape}** — ${etape.note ?? 'aucun cas à ce stade'}`);
    }
    lignes.push('');
  }

  const avecDetails = etapes.filter(
    (e) => STATUTS[e.statut]?.bloquant && Array.isArray(e.details) && e.details.length > 0
  );
  if (avecDetails.length > 0) {
    lignes.push('## Détail des échecs');
    lignes.push('');
    for (const etape of avecDetails) {
      lignes.push(`### \`${etape.etape}\``);
      lignes.push('');
      if (etape.note) {
        lignes.push(`> ${etape.note}`);
        lignes.push('');
      }
      lignes.push('| # | Où | Ce qui a échoué |');
      lignes.push('|---:|---|---|');
      etape.details.slice(0, 40).forEach((detail, i) => {
        if (typeof detail === 'string') {
          lignes.push(`| ${i + 1} | — | ${echapperTableau(detail)} |`);
        } else {
          const ou = detail.ou ?? detail.fichier ?? detail.chemin ?? '—';
          const quoi = detail.message ?? detail.quoi ?? JSON.stringify(detail);
          lignes.push(`| ${i + 1} | ${echapperTableau(ou)} | ${echapperTableau(quoi)} |`);
        }
      });
      if (etape.details.length > 40) {
        lignes.push(`| … | — | ${etape.details.length - 40} autre(s) — voir le JSON de l’étape |`);
      }
      lignes.push('');
      if (Array.isArray(etape.artefacts) && etape.artefacts.length > 0) {
        lignes.push('Artefacts :');
        for (const artefact of etape.artefacts) lignes.push(`- \`${artefact}\``);
        lignes.push('');
      }
    }
  }

  lignes.push('## Où regarder');
  lignes.push('');
  lignes.push('| Quoi | Où |');
  lignes.push('|---|---|');
  lignes.push('| Rapports machine, une par étape | `tests/rapports/*.json` |');
  lignes.push('| Sorties brutes des outils | `tests/rapports/brut/` |');
  lignes.push('| Captures, traces, vidéos, diffs visuels | `tests/rapports/artefacts/` |');
  lignes.push('| Journal complet de chaque étape | `tests/rapports/artefacts/journaux/` |');
  lignes.push('| Couverture par zone | `tests/rapports/couverture/` |');
  lignes.push('');
  lignes.push('---');
  lignes.push('');
  lignes.push(
    '*Ce fichier est régénéré à chaque `npm run verifier`. Pour le reconstruire sans rien ' +
      'réexécuter : `node scripts/rapport.mjs`.*'
  );
  lignes.push('');

  writeFileSync(CHEMIN_RAPPORT_MD, lignes.join('\n'), 'utf8');
  return { bloquantes: bloquantes.length, total: etapes.length, chemin: CHEMIN_RAPPORT_MD };
}

// ─────────────────────────────────────────────────────────────────── exécution directe

const estAppeleDirectement =
  process.argv[1] && dirname(process.argv[1]) === dirname(fileURLToPath(import.meta.url))
    ? process.argv[1].endsWith('rapport.mjs')
    : false;

if (estAppeleDirectement) {
  const bilan = genererRapport({ commande: 'node scripts/rapport.mjs' });
  console.log(
    `RAPPORT.md écrit : ${bilan.total} étape(s), ${bilan.bloquantes} bloquante(s) — ${bilan.chemin}`
  );
  process.exit(bilan.bloquantes > 0 ? 1 : 0);
}
