/**
 * `contenu/registre-svg.json` — le registre des SVG que ni un habillage ni `contenu/monde/`
 * ne déclare. Lot A3.
 *
 * ── POURQUOI CE FICHIER EXISTE, ET POURQUOI IL NE DOUBLE PAS `test:contenu`
 *
 * `npm run test:contenu` rendait **14 anomalies**, toutes du contrôle P3.2, toutes du même
 * motif : « aucun habillage ni document de `contenu/monde/` ne déclare ce SVG ». Sortie citée,
 * avant ce lot :
 *
 *   $ npm run test:contenu
 *   test:contenu — 167 contrôle(s), 14 problème(s)
 *     … 80/94 SVG contrôlés en régions fermées (annexe P § 3.2)
 *
 * Le contrôle avait raison ; il n'offrait qu'une issue, la suppression, et **le père seul
 * décide de ce qui part**. Le registre ouvre les deux issues manquantes — déclarer ce qui est
 * vivant, archiver ce qui est remplacé — sans effacer un octet.
 *
 * Un registre est un mécanisme d'EXEMPTION. Une exemption non gardée devient l'endroit où l'on
 * range ce qu'on ne veut pas regarder ; c'est exactement la faute que le contrôle P3.2
 * dénonçait. D'où ce fichier, et d'où le fait qu'il **n'est pas une redite** de
 * `scripts/test-contenu.mjs` :
 *
 *   • `test:contenu` est une commande à part, absente de `npm run test`. Un développeur qui
 *     lance la suite unitaire ne la voit pas. Ici, le même risque est gardé dans les DEUX
 *     chaînes, et un orphelin ne peut plus attendre qu'on pense à la bonne commande.
 *   • L'invariant central est écrit ici en **audit d'objets**, pas d'occurrences : on énumère
 *     les `.svg` PRÉSENTS SUR DISQUE et on exige que chacun trouve exactement UNE source de
 *     déclaration. Recenser les déclarations ne dirait rien d'un fichier qui traîne.
 *   • Le dernier bloc tient un invariant que `test:contenu` ne peut pas tenir : le lien entre
 *     les cinq dessins de `contenu/assets/gobi/animation/` et les cinq membres de
 *     `EtatAnimationGobi`, lu dans le code source. Ni plus, ni moins, dans les deux sens.
 *
 * ── PREUVE QUE CES CAS ÉCHOUAIENT AVANT, et elle est MESURÉE, pas affirmée
 *
 * Le premier `it` ci-dessous, exécuté sur un registre vidé de ses deux listes, rend :
 *
 *   $ node --input-type=module -e "…orphelins avec un registre vide…"
 *   14 orphelin(s) :
 *     contenu/assets/gobi/animation/aide.svg
 *     contenu/assets/gobi/animation/apparition.svg
 *     contenu/assets/gobi/animation/hesitation.svg
 *     contenu/assets/gobi/animation/joie.svg
 *     contenu/assets/gobi/animation/repos.svg
 *     contenu/assets/gobi/cristal-base.svg
 *     contenu/assets/gobi/stade-1-oeuf.svg
 *     contenu/assets/gobi/stade-2-boule.svg
 *     contenu/assets/gobi/stade-3-crete.svg
 *     contenu/assets/gobi/stade-4-equipe.svg
 *     contenu/assets/gobi/stade-5-gardien.svg
 *     contenu/habillages/carte/carte-monde.svg
 *     contenu/habillages/clairiere/ecole.svg
 *     contenu/habillages/galeries/grottes.svg
 *
 * Ce sont exactement les quatorze du rapport. Le cas discrimine donc : il ne passe pas parce
 * qu'il n'exige rien.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

const RACINE = RACINE_DEPOT;
const DOSSIER_CONTENU = join(RACINE, 'contenu');

interface EntreeDeclaree {
  readonly fichier: string;
  readonly consommateur: string;
  readonly symbole: string;
  readonly raison: string;
}

interface EntreeArchivee {
  readonly fichier: string;
  readonly remplacePar: string;
  readonly raison: string;
  readonly decision: string;
  readonly encoreLuPar?: readonly string[];
}

interface RegistreSvg {
  readonly declaresParLeCode: readonly EntreeDeclaree[];
  readonly archives: readonly EntreeArchivee[];
}

const registre = lireJson<RegistreSvg>('contenu/registre-svg.json');

/** Chemin POSIX relatif à la racine du dépôt — la forme sous laquelle les rapports parlent. */
function relatif(absolu: string): string {
  return relative(RACINE, absolu).split(sep).join(posix.sep);
}

/** Chemin absolu d'un asset donné relativement à `contenu/`. */
function sousContenu(cheminRelatifContenu: string): string {
  return join(DOSSIER_CONTENU, ...cheminRelatifContenu.split('/'));
}

/** Tous les fichiers d'une extension sous un dossier — les OBJETS, jamais les mentions. */
function fichiers(dossier: string, extension: string): string[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(extension))
    .map((e) => join(e.parentPath ?? dossier, e.name))
    .sort();
}

/** Les SVG que les `*.habillage.json` déclarent en `scene.fichier`. */
function svgDesHabillages(): Set<string> {
  const declares = new Set<string>();
  for (const chemin of fichiers(join(DOSSIER_CONTENU, 'habillages'), '.habillage.json')) {
    const donnees = JSON.parse(readFileSync(chemin, 'utf8')) as {
      scene?: { fichier?: unknown };
    };
    const fichier = donnees.scene?.fichier;
    if (typeof fichier === 'string' && fichier.length > 0) declares.add(sousContenu(fichier));
  }
  return declares;
}

/**
 * Les SVG que `contenu/monde/*.json` déclare. On descend le document en profondeur au lieu de
 * nommer les clés : une clé nouvelle rendrait sinon un fichier invisible, en silence — et
 * c'est le mode de défaillance qui a produit les quatorze anomalies.
 */
function svgDuMonde(): Set<string> {
  const declares = new Set<string>();
  for (const chemin of fichiers(join(DOSSIER_CONTENU, 'monde'), '.json')) {
    const pile: unknown[] = [JSON.parse(readFileSync(chemin, 'utf8'))];
    while (pile.length > 0) {
      const noeud = pile.pop();
      if (Array.isArray(noeud)) pile.push(...noeud);
      else if (noeud !== null && typeof noeud === 'object') {
        pile.push(...Object.values(noeud as Record<string, unknown>));
      } else if (typeof noeud === 'string' && noeud.endsWith('.svg')) {
        declares.add(sousContenu(noeud));
      }
    }
  }
  return declares;
}

const DES_HABILLAGES = svgDesHabillages();
const DU_MONDE = svgDuMonde();
const DECLARES = new Set(registre.declaresParLeCode.map((e) => sousContenu(e.fichier)));
const ARCHIVES = new Set(registre.archives.map((e) => sousContenu(e.fichier)));

describe('contenu/registre-svg.json — aucun SVG orphelin, aucune exemption gratuite', () => {
  it('chaque `.svg` de contenu/ a EXACTEMENT une source de déclaration', () => {
    // Audit d'OBJETS : on part des fichiers sur disque. Un `.svg` que personne ne réclame est
    // soit du contenu mort, soit une déclaration manquante — les deux méritent d'être dits.
    const orphelins: string[] = [];
    const doubles: string[] = [];

    for (const svg of fichiers(DOSSIER_CONTENU, '.svg')) {
      const sources = [
        DES_HABILLAGES.has(svg) ? 'habillage' : null,
        DU_MONDE.has(svg) ? 'contenu/monde' : null,
        DECLARES.has(svg) ? 'registre:declaresParLeCode' : null,
        ARCHIVES.has(svg) ? 'registre:archives' : null
      ].filter((s): s is string => s !== null);

      if (sources.length === 0) orphelins.push(relatif(svg));
      if (sources.length > 1) doubles.push(`${relatif(svg)} → ${sources.join(' + ')}`);
    }

    expect(orphelins, 'SVG sans propriétaire déclaré').toEqual([]);
    // Un fichier déclaré deux fois n'est pas une redondance inoffensive : si le registre
    // l'archive alors qu'un habillage le sert, l'archive ment sur ce que l'enfant voit.
    expect(doubles, 'SVG déclarés deux fois').toEqual([]);
  });

  it('le registre ne cite aucun fichier absent du disque — il ne peut pas pourrir', () => {
    const manquants = [...registre.declaresParLeCode, ...registre.archives]
      .map((entree) => entree.fichier)
      .filter((fichier) => !existsSync(sousContenu(fichier)));
    expect(manquants).toEqual([]);
  });
});

describe('`declaresParLeCode` — un asset vivant, et le code qui le nomme', () => {
  it.each(registre.declaresParLeCode.map((e) => [e.fichier, e] as const))(
    '%s — le consommateur déclaré contient littéralement le symbole',
    (_fichier, entree) => {
      // C'est le lien mécanique entre le dessin et le code. Renommer l'état d'un seul côté
      // casse ce cas : c'est le but, pas un effet de bord.
      const source = join(RACINE, ...entree.consommateur.split('/'));
      expect(existsSync(source), `${entree.consommateur} introuvable`).toBe(true);
      expect(
        readFileSync(source, 'utf8').includes(entree.symbole),
        `${entree.consommateur} ne contient pas ${entree.symbole}`
      ).toBe(true);
    }
  );
});

describe('`archives` — on n’archive qu’en nommant ce qui a pris la place', () => {
  it.each(registre.archives.map((e) => [e.fichier, e] as const))(
    '%s — le successeur existe ET est lui-même déclaré',
    (_fichier, entree) => {
      const successeur = sousContenu(entree.remplacePar);
      expect(existsSync(successeur), `${entree.remplacePar} absent du disque`).toBe(true);
      // Sans cette exigence, archiver reviendrait à désigner un second orphelin : le registre
      // aurait masqué deux fichiers au lieu d'un.
      const declare =
        DES_HABILLAGES.has(successeur) || DU_MONDE.has(successeur) || DECLARES.has(successeur);
      expect(declare, `${entree.remplacePar} n’est déclaré nulle part`).toBe(true);
      expect(ARCHIVES.has(successeur), `${entree.remplacePar} est lui-même archivé`).toBe(false);
    }
  );

  it('chaque lecteur encore annoncé existe et cite bien le fichier archivé', () => {
    // C'est ce qui rend visible qu'une suppression casserait quelque chose : `ecole.svg` est
    // le fixture de trois suites, `carte-monde.svg` la référence de comparaison V1/V2.
    const rompus: string[] = [];
    for (const entree of registre.archives) {
      const nom = entree.fichier.split('/').pop() as string;
      for (const lecteur of entree.encoreLuPar ?? []) {
        const chemin = join(RACINE, ...lecteur.split('/'));
        if (!existsSync(chemin)) rompus.push(`${lecteur} (absent) ← ${nom}`);
        else if (!readFileSync(chemin, 'utf8').includes(nom)) {
          rompus.push(`${lecteur} ne cite plus ${nom}`);
        }
      }
    }
    expect(rompus).toEqual([]);
  });
});

describe('les cinq états d’animation de Gobi — objets contre code, dans les deux sens', () => {
  /**
   * L'invariant que `test:contenu` ne peut pas tenir : le dossier ne porte aucune liste, et le
   * code aucun chemin. Le lien passe par le NOM. Un sixième dessin déposé sans état dans le
   * code, ou un état retiré du code sans que son dessin soit archivé, casse ce cas.
   *
   * On lit `partage/src/monde/types.ts` sur disque plutôt qu'un type importé : les types sont
   * effacés à l'exécution, et un test qui recopierait les cinq noms ne prouverait rien.
   */
  const types = readFileSync(
    join(RACINE, 'partage', 'src', 'monde', 'types.ts'),
    'utf8'
  );
  const declaration = /export type EtatAnimationGobi\s*=\s*([^;]+);/u.exec(types);

  it('`EtatAnimationGobi` est bien déclaré dans partage/src/monde/types.ts', () => {
    expect(declaration, 'union `EtatAnimationGobi` introuvable').not.toBeNull();
  });

  it('un dessin par état, un état par dessin — ni plus, ni moins', () => {
    const etats = [...(declaration?.[1] ?? '').matchAll(/'([a-z-]+)'/gu)]
      .map((m) => m[1] as string)
      .sort();
    const dessins = fichiers(join(DOSSIER_CONTENU, 'assets', 'gobi', 'animation'), '.svg')
      .map((chemin) => (chemin.split(sep).pop() as string).replace(/\.svg$/u, ''))
      .sort();

    expect(etats.length, 'les 5 états de l’addendum § A.2').toBe(5);
    expect(dessins).toEqual(etats);

    // Et chacun est bien inscrit au registre : sans cela, ajouter un état et son dessin
    // rendrait le nouveau fichier orphelin sans que ce bloc s'en aperçoive.
    const inscrits = registre.declaresParLeCode
      .map((e) => e.fichier)
      .filter((f) => f.startsWith('assets/gobi/animation/'))
      .map((f) => (f.split('/').pop() as string).replace(/\.svg$/u, ''))
      .sort();
    expect(inscrits).toEqual(etats);
  });
});
