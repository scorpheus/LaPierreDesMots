/**
 * Seuils de couverture PAR ZONE — annexe T § 7, et leur évaluation.
 *
 * ── Pourquoi ce fichier existe ───────────────────────────────────────────────────────────
 *
 * Les seuils par zone étaient déclarés dans `vitest.config.ts` sous `coverage.thresholds`, et
 * **ils n'ont jamais rien vérifié sur Windows**. Mesuré, pas supposé.
 *
 * Vitest résout ses seuils par glob ainsi (`node_modules/vitest/dist/chunks/coverage.DfSpMS-b.js`,
 * lignes 4111-4113) :
 *
 *     const matcher = pm(glob);
 *     const matchingFiles = files.filter((file) => matcher(relative(this.ctx.config.root, file)));
 *
 * Sur Windows, `relative()` rend `partage\src\pedagogie\bkt.ts` — avec des CONTRE-obliques —
 * tandis que les globs s'écrivent avec des obliques. Aucun fichier ne matche. La carte de
 * couverture de la zone reste vide, et `getCoverageSummary()` d'une carte vide rend
 * `pct = "Unknown"` (une CHAÎNE). La comparaison de Vitest est `pct < seuil`, or
 * `"Unknown" < 90` vaut `false` : **le seuil est déclaré satisfait sans avoir rien mesuré.**
 *
 * Sortie des deux sondes qui l'établissent (`bac-a-sable/p2-couverture/`) :
 *
 *     partage/src/pedagogie/*.ts     tel quel :   0  · séparateurs normalisés :   6
 *     partage/src/moteurs/ ** /*.ts  tel quel :   0  · séparateurs normalisés :  51
 *     serveur/src/routes/ ** /*.ts   tel quel :   0  · séparateurs normalisés :  12
 *     lines total=0 covered=0 pct=Unknown
 *     Verdict Vitest « pct < seuil » avec un seuil de 90 : false
 *
 * D'où la règle qui gouverne tout ce module, et qui est la vraie leçon du défaut :
 *
 *   **Une zone dont le glob ne matche AUCUN fichier est un DÉFAUT, jamais une réussite.**
 *
 * Un seuil qui ne mesure rien est pire qu'un seuil absent : il rassure. C'est le même piège que
 * le détecteur qui déclarait un poids qu'il n'appliquait jamais.
 *
 * ── Ce que ce module ne fait pas ─────────────────────────────────────────────────────────
 *
 * Il ne calcule aucune couverture. Il agrège les compteurs `covered`/`total` déjà mesurés par
 * le fournisseur v8 et écrits dans `tests/rapports/couverture/coverage-summary.json` — la
 * source qui fait foi. L'agrégation reproduit celle d'istanbul : somme des compteurs, puis
 * pourcentage sur la somme (jamais une moyenne de pourcentages, qui pondérerait à tort un
 * fichier de trois lignes comme un fichier de trois cents).
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

/** Les quatre critères d'istanbul, dans l'ordre où le rapport les présente. */
export const CRITERES = ['statements', 'branches', 'functions', 'lines'];

/**
 * Les seuils de l'annexe T § 7. **Source unique** : `vitest.config.ts` importe cette constante
 * plutôt que d'en tenir une copie. Deux tables de seuils finiraient par diverger, et c'est
 * précisément le genre d'écart qu'aucun outil ne voit.
 *
 * Aucun de ces chiffres ne s'abaisse sans validation : ce sont les zones où « un ajustement du
 * BKT ou du Leitner ne casse rien visiblement, et la progression est devenue absurde »
 * (annexe T § 1).
 */
export const SEUILS_PAR_ZONE = {
  // `pedagogie/` ≥ 90 % — annexe T § 7. Le premier risque du projet vit ici.
  'partage/src/pedagogie/*.ts': { statements: 90, branches: 90, functions: 90, lines: 90 },
  // `validation/` ≥ 95 % — c'est le juge ; un faux négatif décourage l'enfant pour rien.
  'partage/src/contenu/validation.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
  'partage/src/moteurs/colorie/validation.ts': {
    statements: 95,
    branches: 95,
    functions: 95,
    lines: 95
  },
  // `moteurs/` ≥ 80 % — le reste est couvert en E2E.
  'partage/src/moteurs/**/*.ts': { statements: 80, branches: 80, functions: 80, lines: 80 },
  // `serveur/routes/` ≥ 80 %.
  'serveur/src/routes/**/*.ts': { statements: 80, branches: 80, functions: 80, lines: 80 }
};

/**
 * Convertit le sous-ensemble de glob employé par les seuils en expression régulière.
 *
 * Sous-ensemble volontairement étroit — `**` (zéro segment ou plus), `*` (dans un segment),
 * littéral — parce qu'il couvre les cinq zones et rien d'autre. On n'importe pas `picomatch` :
 * c'est une dépendance TRANSITIVE de Vitest, que rien dans `package.json` ne garantit
 * (règle D9 : une dépendance invisible marche sur une machine et nulle part ailleurs).
 *
 * Le filet qui rend ce choix sûr n'est pas la relecture, c'est l'invariant « une zone qui ne
 * matche aucun fichier est un défaut » : si cette conversion divergeait un jour, la zone
 * tomberait à zéro fichier et le rapport le crierait, au lieu de passer en silence.
 */
export function globVersRegExp(glob) {
  let motif = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` — zéro segment ou plus. `**` en fin de motif — tout le reste.
        if (glob[i + 2] === '/') {
          motif += '(?:[^/]+/)*';
          i += 2;
        } else {
          motif += '.*';
          i += 1;
        }
      } else {
        // `*` — à l'intérieur d'un segment, jamais à travers une oblique.
        motif += '[^/]*';
      }
    } else if ('\\^$.|?+()[]{}'.includes(c)) {
      motif += `\\${c}`;
    } else {
      motif += c;
    }
  }
  return new RegExp(`^${motif}$`);
}

/**
 * Chemin d'un fichier couvert, relatif à la racine, **séparateurs POSIX**.
 *
 * C'est la normalisation qui manquait à Vitest. Elle vaut sur les deux plateformes : sur POSIX
 * `replace` ne trouve rien à remplacer et le chemin est déjà bon.
 */
export function cheminRelatifPosix(racine, fichier) {
  return relative(racine, fichier).split('\\').join('/');
}

/** Lit `coverage-summary.json`. Rend `null` s'il est absent ou illisible — jamais d'exception. */
export function lireResumeCouverture(chemin) {
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, 'utf8'));
    return brut && typeof brut === 'object' ? brut : null;
  } catch {
    return null;
  }
}

/**
 * Évalue toutes les zones contre leurs seuils.
 *
 * @param {object} resume  contenu de `coverage-summary.json`
 * @param {string} racine  racine du dépôt, pour rendre les chemins relatifs
 * @param {object} [seuils] table de seuils ; `SEUILS_PAR_ZONE` par défaut
 * @returns {{zones: object[], manquements: object[], zonesVides: object[], mesuree: boolean}}
 *
 * `manquements` porte un écart **signé et orienté** : `ecart = seuil - mesure`, toujours
 * positif puisqu'il n'est rempli qu'en cas de manquement, et accompagné des deux valeurs d'où
 * il vient. Un rapport qui dirait « écart de 6 points » sans dire de quel côté n'aiderait
 * personne.
 */
export function evaluerZones(resume, racine, seuils = SEUILS_PAR_ZONE) {
  if (!resume) return { zones: [], manquements: [], zonesVides: [], mesuree: false };

  const fichiers = Object.keys(resume).filter((cle) => cle !== 'total');
  const relatifs = new Map(fichiers.map((f) => [f, cheminRelatifPosix(racine, f)]));

  const zones = [];
  const manquements = [];
  const zonesVides = [];

  for (const [glob, exigences] of Object.entries(seuils)) {
    const regexp = globVersRegExp(glob);
    const membres = fichiers.filter((f) => regexp.test(relatifs.get(f)));

    if (membres.length === 0) {
      // Le défaut que ce module existe pour rendre visible. Voir l'en-tête.
      const zone = { glob, fichiers: 0, vide: true, criteres: [] };
      zones.push(zone);
      zonesVides.push(zone);
      continue;
    }

    const criteres = [];
    for (const critere of CRITERES) {
      const exigence = exigences[critere];
      if (exigence === undefined) continue;

      let couvert = 0;
      let total = 0;
      for (const f of membres) {
        couvert += resume[f]?.[critere]?.covered ?? 0;
        total += resume[f]?.[critere]?.total ?? 0;
      }
      // Une zone sans élément mesurable de ce type est couverte par vacuité — istanbul fait
      // de même. Ce n'est pas le cas « glob vide », qui est traité plus haut.
      const mesure = total === 0 ? 100 : Number(((couvert / total) * 100).toFixed(2));
      const atteint = mesure >= exigence;
      const detail = { critere, mesure, exigence, couvert, total, atteint };
      criteres.push(detail);
      if (!atteint) {
        manquements.push({
          glob,
          ...detail,
          ecart: Number((exigence - mesure).toFixed(2))
        });
      }
    }

    zones.push({ glob, fichiers: membres.length, vide: false, criteres });
  }

  return { zones, manquements, zonesVides, mesuree: true };
}

/**
 * Une phrase qui NOMME la zone fautive, prête à être lue dans `RAPPORT.md`.
 *
 * Forme voulue : « `partage/src/pedagogie/` : branches 87,4 % < 90 % exigé (annexe T § 7) ».
 * Les nombres sont écrits à la française — c'est un rapport lu par un francophone.
 */
export function decrireManquement(m) {
  const nombre = (n) => String(n).replace('.', ',');
  return (
    `\`${m.glob}\` : ${m.critere} ${nombre(m.mesure)} % < ${nombre(m.exigence)} % exigé ` +
    `(écart ${nombre(m.ecart)} pt · ${m.couvert}/${m.total}) — annexe T § 7`
  );
}

/** Idem pour une zone dont le glob ne matche rien. */
export function decrireZoneVide(z) {
  return (
    `\`${z.glob}\` : **aucun fichier ne correspond** — ce seuil ne mesure rien. ` +
    'Soit le glob est faux, soit la zone a été déplacée ; dans les deux cas le chiffre ' +
    'qu’il rendait était creux (annexe T § 7).'
  );
}
