#!/usr/bin/env node
/**
 * Le dessin de Gobi, extrait des SVG et rendu montable — lot M5, contrat du monde v4 § M5.
 *
 * ── LE DÉFAUT QUE CE SCRIPT EXISTE POUR FERMER ──────────────────────────────────────────────
 *
 * L'inventaire du contrat v4 § 1.2 le nomme, et c'est le constat le plus dur du plan :
 *
 *   « La chaîne d'image a réussi et son résultat n'est pas branché. La canonique de Gobi est
 *     bonne, ses stades et animations sont produits, et l'écran montre un rond framboise. »
 *
 * `Gobi.tsx` dessinait un cercle `--framboise` de 24 unités, deux ronds pour les bras et deux
 * losanges bleus pour la crête. Le corps de la canonique est **crème** (`#FFDDA8`), et le cœur
 * de Pierre — « la seule source lumineuse autorisée sur le personnage » (D36) — **était absent
 * du composant**. Ce n'était pas un dessin plus pauvre : c'était un autre personnage.
 *
 * ── POURQUOI UN GÉNÉRATEUR, ET PAS UNE RECOPIE À LA MAIN ────────────────────────────────────
 *
 * Le motif écrit dans `Gobi.tsx` pour dessiner en ligne est recevable et il est conservé : Gobi
 * apparaît dans la bulle d'aide de CHAQUE exercice, et un `fetch` par montage coûterait une
 * requête là où le budget vise une réponse sous 100 ms. Mais dessiner en ligne **de mémoire**
 * est ce qui a produit le rond framboise. Ce script prend la troisième voie : le SVG reste la
 * source, et son texte est **extrait mécaniquement** vers un module que le bundle embarque.
 *
 * Le contrat de sortie de M5 exige « le dessin monté à l'écran est celui du fichier du stade ».
 * Ici il l'est **littéralement** : le module porte les octets du fichier, et `--verifier` les
 * recompare à tout moment. Une divergence n'est plus une possibilité, c'est un code de sortie 1.
 *
 * ── LA DÉCOMPOSITION, ET CE QUI LA REND LICITE ──────────────────────────────────────────────
 *
 * Un Gobi à l'écran = `gobi-corps` + `gobi-parure` du STADE + `gobi-bras` et `gobi-visage` de
 * l'ANIMATION. Cette composition n'est possible que parce que les deux invariants de D20/D28
 * tiennent, et `tests/unitaires/gobi-assets.test.ts` les mesure déjà :
 *   — d'un stade à l'autre, seule la parure change (visage et bras sont identiques) ;
 *   — d'une animation à l'autre, la parure ne change pas (seuls bras et visage changent).
 * Sans ces deux invariants, 10 stades × 5 états feraient 50 dessins à embarquer. Avec eux, il
 * en faut 1 + 10 + 5. **C'est la règle « le corps ne change jamais » payée en octets.**
 *
 * Usage :
 *   node scripts/gobi-dessin.mjs             écrit client/src/composants/gobi-dessin.gen.ts
 *   node scripts/gobi-dessin.mjs --verifier  n'écrit rien : compare le module aux SVG
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CIBLE = 'client/src/composants/gobi-dessin.gen.ts';

/** Les 5 états de `EtatAnimationGobi`, énumérés et non devinés. */
const ANIMATIONS = ['repos', 'joie', 'aide', 'hesitation', 'apparition'];

/**
 * Le contenu littéral d'un groupe SVG, `<g id="…">` compris, imbrications comptées.
 *
 * Une version naïve s'arrêtant au premier `</g>` couperait `gobi-corps` juste avant le cœur de
 * Pierre : on embarquerait un Gobi sans son cœur, et l'égalité octet à octet resterait vraie
 * sur la portion tronquée. C'est exactement le piège que `gobi-assets.test.ts` documente.
 */
function groupe(svg, identifiant) {
  const debut = svg.indexOf(`<g id="${identifiant}"`);
  if (debut === -1) {
    throw new Error(`Groupe #${identifiant} absent.`);
  }
  let profondeur = 0;
  for (let index = debut; index < svg.length; index += 1) {
    if (svg.startsWith('<g', index)) {
      profondeur += 1;
    } else if (svg.startsWith('</g>', index)) {
      profondeur -= 1;
      if (profondeur === 0) {
        return svg.slice(debut, index + 4);
      }
    }
  }
  throw new Error(`Groupe #${identifiant} non fermé.`);
}

function lire(relatif) {
  return readFileSync(join(RACINE, relatif), 'utf8');
}

/** Rassemble ce que le module doit porter, et REFUSE si un invariant de D20/D28 est rompu. */
export function extraire() {
  const document = JSON.parse(lire('contenu/monde/gobi-stades.json'));
  const stades = document.stades.map((stade) => ({
    code: stade.code,
    chemin: `contenu/${stade.asset}`,
    svg: lire(`contenu/${stade.asset}`)
  }));
  const animations = ANIMATIONS.map((code) => ({
    code,
    chemin: `contenu/assets/gobi/animation/${code}.svg`,
    svg: lire(`contenu/assets/gobi/animation/${code}.svg`)
  }));
  const tous = [...stades, ...animations];

  const corps = groupe(tous[0].svg, 'gobi-corps');
  const divergents = tous.filter((entree) => groupe(entree.svg, 'gobi-corps') !== corps);
  if (divergents.length > 0) {
    throw new Error(
      `REFUS — ${String(divergents.length)} corps divergent sur ${String(tous.length)} : ` +
        `${divergents.map((entree) => entree.chemin).join(', ')}. ` +
        'D20/D28 : le corps ne change jamais. On n’embarque pas un personnage qui a glissé.'
    );
  }

  // Le visage et les bras du stade servent de repos par défaut : ils doivent donc être ceux
  // que TOUS les stades partagent, sans quoi le dessin monté dépendrait du stade choisi.
  const visageStade = groupe(stades[0].svg, 'gobi-visage');
  const brasStade = groupe(stades[0].svg, 'gobi-bras');
  const flottants = stades.filter(
    (entree) =>
      groupe(entree.svg, 'gobi-visage') !== visageStade || groupe(entree.svg, 'gobi-bras') !== brasStade
  );
  if (flottants.length > 0) {
    throw new Error(
      `REFUS — visage ou bras varient d’un stade à l’autre : ${flottants
        .map((entree) => entree.chemin)
        .join(', ')}.`
    );
  }

  const parures = new Map(stades.map((entree) => [entree.code, groupe(entree.svg, 'gobi-parure')]));
  if (new Set(parures.values()).size !== stades.length) {
    throw new Error('REFUS — deux stades portent la même parure : ce seraient deux stades invisibles.');
  }

  const parureAnimation = groupe(animations[0].svg, 'gobi-parure');
  const parureFlottante = animations.filter(
    (entree) => groupe(entree.svg, 'gobi-parure') !== parureAnimation
  );
  if (parureFlottante.length > 0) {
    throw new Error(
      `REFUS — la parure varie d’une animation à l’autre : ${parureFlottante
        .map((entree) => entree.chemin)
        .join(', ')}. La parure appartient au STADE, jamais au geste.`
    );
  }

  const gestes = new Map(
    animations.map((entree) => [
      entree.code,
      { bras: groupe(entree.svg, 'gobi-bras'), visage: groupe(entree.svg, 'gobi-visage') }
    ])
  );
  if (new Set([...gestes.values()].map((geste) => geste.bras + geste.visage)).size !== 5) {
    throw new Error('REFUS — deux animations portent le même geste.');
  }

  return { corps, parures, gestes, stades, animations };
}

function rendreModule({ corps, parures, gestes }) {
  const texte = (valeur) => JSON.stringify(valeur);
  const lignesParure = [...parures.entries()]
    .map(([code, contenu]) => `  ${JSON.stringify(code)}: ${texte(contenu)}`)
    .join(',\n');
  const lignesGeste = [...gestes.entries()]
    .map(
      ([code, geste]) =>
        `  ${JSON.stringify(code)}: { bras: ${texte(geste.bras)}, visage: ${texte(geste.visage)} }`
    )
    .join(',\n');
  const empreinte = createHash('sha256').update(corps).digest('hex');

  return `// GÉNÉRÉ PAR \`node scripts/gobi-dessin.mjs\` — NE PAS ÉDITER À LA MAIN.
//
// La source qui fait foi reste \`contenu/assets/gobi/**/*.svg\` ; ce module en porte les octets
// pour que le bundle n'ait aucune requête à faire (Gobi apparaît dans la bulle d'aide de chaque
// exercice, et le budget vise une réponse sous 100 ms).
//
// \`node scripts/gobi-dessin.mjs --verifier\` recompare ce fichier aux SVG et sort en 1 s'ils ont
// divergé. C'est ce qui rend vraie, et non seulement promise, la ligne du contrat de sortie de
// M5 : « le dessin monté à l'écran est celui du fichier du stade ».
import type { CodeStadeGobi, EtatAnimationGobi } from '@pierre/partage';

/** \`viewBox\` des quinze SVG. Le composant ne le réinvente pas. */
export const GOBI_VUE = '0 0 200 200';

/** Empreinte du groupe \`gobi-corps\`, identique dans les quinze fichiers (D20, D28, D36). */
export const GOBI_EMPREINTE_CORPS = 'sha256:${empreinte}';

/** Le corps — ombre au sol, pieds, fourrure, ventre, cœur de Pierre. Il ne change JAMAIS. */
export const GOBI_CORPS = ${texte(corps)};

/** La parure de cristaux, par stade. C'est la SEULE chose que le stade change (D28, point 1). */
export const GOBI_PARURE: Readonly<Record<CodeStadeGobi, string>> = {
${lignesParure}
};

/** Le geste, par état d'animation (addendum § A.2). La parure n'y entre pas. */
export const GOBI_GESTE: Readonly<Record<EtatAnimationGobi, { readonly bras: string; readonly visage: string }>> = {
${lignesGeste}
};
`;
}

function principal(arguments_) {
  const extrait = extraire();
  const attendu = rendreModule(extrait);
  const octets = Buffer.byteLength(attendu, 'utf8');

  if (arguments_.includes('--verifier')) {
    const reel = lire(CIBLE);
    if (reel !== attendu) {
      console.error(
        `REFUS — ${CIBLE} a divergé des SVG de contenu/assets/gobi/. ` +
          'Relancer `node scripts/gobi-dessin.mjs`.'
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `dessin monté = fichiers SVG : corps ${String(extrait.corps.length)} o, ` +
        `${String(extrait.parures.size)} parures, ${String(extrait.gestes.size)} gestes, ` +
        `module ${String(octets)} o — ecart 0`
    );
    return;
  }

  writeFileSync(join(RACINE, CIBLE), attendu, 'utf8');
  console.log(
    `${CIBLE} écrit : corps ${String(extrait.corps.length)} o, ` +
      `${String(extrait.parures.size)} parures, ${String(extrait.gestes.size)} gestes, ` +
      `${String(octets)} o au total`
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    principal(process.argv.slice(2));
  } catch (erreur) {
    console.error(String(erreur.message ?? erreur));
    process.exitCode = 1;
  }
}
