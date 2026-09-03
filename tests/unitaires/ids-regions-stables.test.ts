/**
 * LES `id` DE RÉGION NE CHANGENT JAMAIS — lot N7, contrat de finition v3 § 4.7, § 6.1 et § 9.2.
 *
 * « `contenu/habillages/**` : les `id` de région que les exercices citent. **Ils ne changent
 * JAMAIS** » (§ 6.1, frontière N7 → N8). C'est la seule chose que N7 doit à N8, et c'est la
 * seule chose qu'un lot de graphisme peut casser en silence : un décor redessiné qui renomme
 * `feuilles-arbre-1` en `houppier-1` compile, se rend, se photographie — et rend injouable
 * toute consigne qui nommait l'ancien identifiant. L'enfant ne verrait pas une erreur ; il
 * verrait une consigne à laquelle rien ne répond. C'est un état sans issue.
 *
 * ── CE QUE CE FICHIER MESURE, SUR LES OBJETS ET NON SUR LES OCCURRENCES ────────────────────
 * Il n'énumère pas les mentions d'un identifiant dans les fichiers. Il énumère les OBJETS qui
 * doivent porter l'identifiant, et il en croise trois populations qui devraient coïncider :
 *
 *   A. les régions DÉCLARÉES par chaque habillage ;
 *   B. les régions DESSINÉES dans le SVG que cet habillage désigne ;
 *   C. les régions CITÉES par les exercices livrés, moteur par moteur.
 *
 * Une région dans C et pas dans A est une consigne morte. Une dans A et pas dans B est une
 * cible invisible. Une dans B et pas dans A est un dessin qui ne compte pas dans la
 * recoloration. Aucune des trois ne se voit à la lecture d'un seul fichier.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * LA RÉFÉRENCE EST GELÉE ICI, EN LITTÉRAL, et elle est MESURÉE, jamais recopiée d'un document :
 *
 *   $ git show HEAD:contenu/habillages/clairiere/ecole.habillage.json | node -e "…"
 *   30 ["ciel","herbe","toit-ecole","horloge-ecole","mur-ecole","porte-ecole","fenetre-ecole-1",
 *       "fenetre-ecole-2","feuilles-arbre-1","tronc-arbre-1","feuilles-arbre-2","tronc-arbre-2",
 *       "feuilles-arbre-3","tronc-arbre-3","feuilles-arbre-4","tronc-arbre-4","cheveux-maitresse",
 *       "pull-maitresse","jupe-maitresse","cheveux-garcon-1","tshirt-garcon-1","cheveux-garcon-2",
 *       "tshirt-garcon-2","cheveux-fille-1","robe-fille-1","cheveux-fille-2","robe-fille-2",
 *       "banc","corde","ballon"]
 *
 * Ce sont les 30 `id` du contrat technique v1 § 9.4. `tableau` s'y est ajouté avant ce lot
 * (question Q-R4, campagne parallèle) : l'ajout est tolérable, la disparition ne l'est pas.
 * **Un identifiant peut naître, jamais mourir** — c'est la forme opposable de « un acquis
 * n'est jamais repris » appliquée aux données.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { elementsDessines, fichiersSous } from '../../scripts/verifier-regions-fermees.mjs';
// @ts-expect-error module JavaScript volontairement autonome
import { decoderPng } from '../../scripts/sprites/png.mjs';
import { lireJson, lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

// ─────────────────────────────────────────────────────────────────────── la référence gelée

/** Les 30 `id` du contrat v1 § 9.4, mesurés sur `git show HEAD:` — voir l'en-tête. */
const ECOLE_30_GELES: readonly string[] = [
  'ciel', 'herbe', 'toit-ecole', 'horloge-ecole', 'mur-ecole', 'porte-ecole',
  'fenetre-ecole-1', 'fenetre-ecole-2',
  'feuilles-arbre-1', 'tronc-arbre-1', 'feuilles-arbre-2', 'tronc-arbre-2',
  'feuilles-arbre-3', 'tronc-arbre-3', 'feuilles-arbre-4', 'tronc-arbre-4',
  'cheveux-maitresse', 'pull-maitresse', 'jupe-maitresse',
  'cheveux-garcon-1', 'tshirt-garcon-1', 'cheveux-garcon-2', 'tshirt-garcon-2',
  'cheveux-fille-1', 'robe-fille-1', 'cheveux-fille-2', 'robe-fille-2',
  'banc', 'corde', 'ballon',
];

/** La 31e, ajoutée par la campagne parallèle au titre de Q-R4. */
const ECOLE_31E = 'tableau';

/** Les 6 `id` de `galeries.grottes`, mesurés sur le même `git show HEAD:`. */
const GROTTES_6_GELES: readonly string[] = [
  'grotte-un', 'grotte-deux', 'grotte-trois', 'stalactite', 'flaque', 'voute',
];

/** Les 6 régions de la carte du monde — l'ordre EST la progression phonologique. */
const CARTE_6_REGIONS: readonly string[] = [
  'clairiere', 'galeries', 'marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires',
];

// ───────────────────────────────────────────────────────────────────────── petites mesures

interface RegionDeclaree {
  readonly id: string;
  readonly libelle: string;
  readonly centroide: readonly [number, number];
  readonly surface: number;
  readonly couleurMasque?: string;
}
interface Calque {
  readonly id: string;
  readonly role: string;
  readonly regions: readonly RegionDeclaree[];
}
interface HabillageLu {
  readonly id: string;
  readonly scene: {
    readonly fichier: string;
    readonly viewBox: string;
    readonly calques: readonly Calque[];
    readonly rasterIndexe?: { readonly masque: string };
  };
}

function habillage(chemin: string): HabillageLu {
  return lireJson<HabillageLu>(chemin);
}

/** A — les régions déclarées coloriables, dans l'ordre de déclaration. */
function declarees(h: HabillageLu): readonly string[] {
  return h.scene.calques.filter((c) => c.role === 'coloriable').flatMap((c) => c.regions.map((r) => r.id));
}

/**
 * B — les régions dessinées : les éléments IDENTIFIÉS des calques de rôle `coloriable`.
 *
 * ── POURQUOI `id` ET NON `data-region-svg` — mesuré, pas supposé ────────────────────────────
 * La première écriture de ce fichier lisait `data-region-svg`, l'attribut que `SceneSvg`
 * interroge au tap. Mesure sur les 37 habillages livrés :
 *
 *   31 déclarées / 31 `data-region-svg`   contenu/habillages/clairiere/ecole.svg
 *    6 déclarées /  0 `data-region-svg`   contenu/habillages/galeries/grottes.svg
 *    … et la même chose pour les 35 autres.
 *
 * **Un seul décor sur trente-sept porte l'attribut dans son fichier**, et pourtant tous
 * fonctionnent : `SceneSvg.tsx:335` sélectionne `#calque-zones > [id]` et POSE
 * `data-region-svg` depuis l'`id` au montage (ligne 350). La source de vérité est donc l'`id`,
 * et lire l'autre attribut aurait déclaré 36 décors vides — un faux positif de 97 %, sur un
 * test dont c'est tout l'objet.
 *
 * Corollaire opposable pour tout décor v2 : la région doit être un enfant DIRECT du calque
 * coloriable. Un `<path>` niché dans un sous-`<g>` échappe au sélecteur, donc au tap, donc à
 * la recoloration — sans qu'aucun message ne le dise.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 */
function dessinees(cheminSvg: string, h: HabillageLu): readonly string[] {
  if (h.scene.rasterIndexe !== undefined) {
    const masque = decoderPng(
      readFileSync(`${RACINE_DEPOT}contenu/${h.scene.rasterIndexe.masque}`),
    ) as { pixels: Uint8Array };
    const couleursVues = new Set<string>();
    for (let index = 0; index < masque.pixels.length; index += 4) {
      if (masque.pixels[index + 3] === 0) continue;
      couleursVues.add(
        `#${[0, 1, 2].map((canal) =>
          (masque.pixels[index + canal] ?? 0).toString(16).padStart(2, '0')).join('')}`.toUpperCase(),
      );
    }
    return h.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions)
      .filter((region) => region.couleurMasque !== undefined
        && couleursVues.has(region.couleurMasque.toUpperCase()))
      .map((region) => region.id);
  }
  const coloriables = new Set(h.scene.calques.filter((c) => c.role === 'coloriable').map((c) => c.id));
  return (elementsDessines(lireTexte(cheminSvg)) as ReadonlyArray<{ id: string | null; calque: string | null }>)
    .filter((e) => e.id !== null && e.calque !== null && coloriables.has(e.calque))
    .map((e) => e.id!);
}

/** Les `id` dessinés dans un SVG sans habillage — la carte du monde. */
function dessineesDeLaCarte(cheminSvg: string): readonly string[] {
  return [...lireTexte(cheminSvg).matchAll(/data-region-svg="([^"]+)"/gu)].map((m) => m[1]!);
}

/** Tous les habillages du dépôt, chemin compris. */
function tousLesHabillages(): ReadonlyArray<{ chemin: string; donnees: HabillageLu }> {
  return (fichiersSous(`${RACINE_DEPOT}contenu`, '.habillage.json') as string[])
    .map((absolu) => absolu.slice(RACINE_DEPOT.length).split('\\').join('/'))
    .map((chemin) => ({ chemin, donnees: habillage(chemin) }));
}

/** C — toutes les régions citées par les exercices, avec l'habillage qui devrait les porter. */
function citeesParLesExercices(): ReadonlyArray<{ exercice: string; habillage: string; region: string }> {
  const citations: Array<{ exercice: string; habillage: string; region: string }> = [];
  for (const absolu of fichiersSous(`${RACINE_DEPOT}contenu/exercices`, '.json') as string[]) {
    const chemin = absolu.slice(RACINE_DEPOT.length).split('\\').join('/');
    const donnees = lireJson<Record<string, unknown>>(chemin);
    const jeu = donnees['jeu'] as Record<string, unknown> | undefined;
    const idHabillage = typeof jeu?.['habillage'] === 'string' ? (jeu['habillage'] as string) : null;
    if (idHabillage === null) continue;
    // On ratisse tout l'arbre : `region` est le nom du champ dans tous les moteurs qui
    // désignent une zone du décor (`colorie`, `place`, `attrape`…). Chercher le CHAMP plutôt
    // qu'un moteur nommé évite de rater le prochain moteur qui s'en servira.
    const pile: unknown[] = [donnees];
    while (pile.length > 0) {
      const noeud = pile.pop();
      if (Array.isArray(noeud)) {
        pile.push(...noeud);
      } else if (noeud !== null && typeof noeud === 'object') {
        for (const [cle, valeur] of Object.entries(noeud)) {
          if (cle === 'region' && typeof valeur === 'string') {
            citations.push({ exercice: chemin, habillage: idHabillage, region: valeur });
          } else {
            pile.push(valeur);
          }
        }
      }
    }
  }
  return citations;
}

// ═══════════════════════════════════════════════════════════════════════════════ les cas

describe('les `id` de région ne changent jamais (frontière N7 → N8)', () => {
  const ecole = habillage('contenu/habillages/clairiere/ecole.habillage.json');
  const grottes = habillage('contenu/habillages/galeries/grottes.habillage.json');

  it('la mesure trouve bien des habillages à mesurer', () => {
    // Sans ce cas, « aucun identifiant perdu » pourrait vouloir dire « aucun fichier lu ».
    expect(tousLesHabillages().length).toBeGreaterThanOrEqual(37);
  });

  it('`clairiere.ecole` porte encore les 30 `id` gelés du contrat v1 § 9.4', () => {
    const presents = new Set(declarees(ecole));
    const perdus = ECOLE_30_GELES.filter((id) => !presents.has(id));
    expect(perdus, 'un identifiant peut naître, jamais mourir').toEqual([]);
  });

  it('`clairiere.ecole` porte aussi la 31e région de Q-R4, et rien d’autre', () => {
    // L'ajout est tolérable et il est NOMMÉ. Un décor qui perdrait un `id` et en gagnerait un
    // autre ne bougerait pas le décompte : c'est pourquoi on ne compte pas, on nomme.
    expect([...declarees(ecole)].sort()).toEqual([...ECOLE_30_GELES, ECOLE_31E].sort());
  });

  it('`galeries.grottes` porte encore ses 6 `id` gelés', () => {
    expect([...declarees(grottes)].sort()).toEqual([...GROTTES_6_GELES].sort());
  });

  it('les deux habillages repointés désignent bien leur décor v2', () => {
    // C'est la seule chose que le repointage change. S'il pointait ailleurs, tous les cas
    // ci-dessus jugeraient l'ancien fichier et diraient vert sur un décor mort.
    expect(ecole.scene.fichier).toBe('habillages/clairiere/ecole-v2.svg');
    expect(grottes.scene.fichier).toBe('habillages/galeries/grottes-v2.svg');
  });

  it('A == B : tout ce qui est déclaré est dessiné, tout ce qui est dessiné est déclaré', () => {
    for (const { chemin, donnees } of tousLesHabillages()) {
      const attendues = [...declarees(donnees)].sort();
      const rendues = [...new Set(dessinees(`contenu/${donnees.scene.fichier}`, donnees))].sort();
      expect(rendues, chemin).toEqual(attendues);
    }
  });

  it('les DEUX décors de N7 portent `data-region-svg` dans le fichier, pas seulement au montage', () => {
    // Redondance volontaire avec l'`id`. `ecole.svg` était le seul décor du dépôt à la porter,
    // et c'est ce qui a permis de mesurer l'atteignabilité au doigt des 31 régions par
    // `isPointInFill` + `elementFromPoint` (question Q-R4) — une mesure impossible si
    // l'attribut n'existe qu'après le montage de React. Les décors v2 la conservent.
    for (const h of [ecole, grottes]) {
      expect([...dessineesDeLaCarte(`contenu/${h.scene.fichier}`)].sort(), h.id).toEqual(
        [...declarees(h)].sort()
      );
    }
  });

  it('C ⊆ A : aucun exercice ne nomme une région que son habillage ne porte pas', () => {
    const parHabillage = new Map(tousLesHabillages().map(({ donnees }) => [donnees.id, new Set(declarees(donnees))]));
    const citations = citeesParLesExercices();

    // Contrôle de la mesure : un croisement sur zéro citation ne prouve rien.
    expect(citations.length, 'aucun exercice ne cite de région').toBeGreaterThan(0);

    const orphelines = citations.filter(({ habillage: id, region }) => {
      const connues = parHabillage.get(id);
      return connues !== undefined && !connues.has(region);
    });
    expect(
      orphelines.map((o) => `${o.exercice} → ${o.habillage}#${o.region}`),
      'une consigne qui nomme une région absente est un état sans issue'
    ).toEqual([]);
  });
});

describe('la carte du monde garde ses six régions, v1 comme v2', () => {
  const V1 = 'contenu/habillages/carte/carte-monde.svg';
  const V2 = 'contenu/habillages/carte/carte-monde-v2.svg';

  it('les deux fichiers portent les SIX mêmes `id`, dans le MÊME ordre', () => {
    // L'ordre EST la progression phonologique (CLAUDE.md) : le réarranger ouvrirait la
    // mauvaise région. Et l'égalité v1/v2 est ce qui rend le passage à la v2 sûr pour N4,
    // qui possède `client/src/ecrans/EcranCarte.tsx` et son constante `SVG_CARTE`.
    expect(dessineesDeLaCarte(V1)).toEqual(CARTE_6_REGIONS);
    expect(dessineesDeLaCarte(V2)).toEqual(CARTE_6_REGIONS);
  });

  it('les six marqueurs sont aux MÊMES centres dans les deux fichiers', () => {
    // `EcranCarte.tsx:41` porte les mêmes six ancres en dur. Si la v2 les déplaçait, le tap
    // se décalerait du dessin — un défaut qui ne se voit qu'à l'usage.
    const marqueurs = (chemin: string): ReadonlyArray<readonly [string, string, string]> =>
      [...lireTexte(chemin).matchAll(/id="marqueur-([^"]+)"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/gu)].map(
        (m) => [m[1]!, m[2]!, m[3]!] as const
      );
    expect(marqueurs(V2)).toEqual(marqueurs(V1));
    expect(marqueurs(V2).length).toBe(6);
  });

  it('`regions.json` désigne un fichier de carte qui existe et porte les six régions', () => {
    const document = lireJson<{ scene: { fichier: string } }>('contenu/monde/regions.json');
    expect(dessineesDeLaCarte(`contenu/${document.scene.fichier}`)).toEqual(CARTE_6_REGIONS);
  });

  it('les six `region` de `regions.json` sont exactement celles du dessin', () => {
    const document = lireJson<{ regions: ReadonlyArray<{ region: string }> }>('contenu/monde/regions.json');
    expect(document.regions.map((r) => r.region)).toEqual(CARTE_6_REGIONS);
  });
});

/**
 * AUCUN NŒUD LIVRÉ N'EST INVISIBLE — point de synchronisation du contrat § 6.2.
 *
 * `regions.json` est le SEUL endroit qui dit à la carte quels nœuds une région contient.
 * « C'est lui qui fait le pourcentage de recoloration », dit le fichier lui-même. Un nœud
 * écrit, validé, référençant un exercice sain, mais absent de cette liste, est **du contenu
 * mort** : la carte ne l'atteint pas, `EcranCarte.reprise()` ne le propose pas, et il ne
 * compte pas dans le pourcentage — donc la région ne pourra jamais atteindre 100 %.
 *
 * Ce n'est pas une hypothèse. Le contrat de finition v3 § 1.5 avait mesuré le défaut sur les
 * quatre nœuds de La Clairière ; il est REPARU à l'identique après la livraison de N8 :
 *
 *   $ ls contenu/noeuds/*.json | wc -l   → 12
 *   $ (noeuds cités par regions.json)    →  7
 *
 * Cinq nœuds invisibles. C'est le défaut que le père a signalé — « je n'ai eu qu'un exercice,
 * est-ce normal ? » — en plus grand, et il se reproduira à chaque livraison de contenu tant
 * que rien ne croise les deux populations. D'où ce cas, qui échoue dans LES DEUX SENS.
 */
describe('aucun nœud livré n’est invisible sur la carte (contrat § 6.2)', () => {
  const document = lireJson<{ regions: ReadonlyArray<{ region: string; noeuds: readonly string[] }> }>(
    'contenu/monde/regions.json'
  );

  /** Les nœuds réellement livrés, lus SUR DISQUE — leur `id`, pas leur nom de fichier. */
  const surDisque = (fichiersSous(`${RACINE_DEPOT}contenu/noeuds`, '.json') as string[])
    .map((absolu) => lireJson<{ id: string; region: string; progression?: boolean }>(absolu.slice(RACINE_DEPOT.length).split('\\').join('/')))
    .filter((noeud) => noeud.progression !== false);

  const cites = document.regions.flatMap((r) => r.noeuds);

  it('la mesure trouve bien des nœuds à croiser', () => {
    expect(surDisque.length).toBeGreaterThanOrEqual(7);
    expect(cites.length).toBeGreaterThanOrEqual(7);
  });

  it('tout nœud livré est CITÉ — sinon il est écrit, validé, et injouable', () => {
    const invisibles = surDisque.filter((n) => !cites.includes(n.id)).map((n) => n.id);
    expect(invisibles, 'ces nœuds existent et la carte ne les atteint pas').toEqual([]);
  });

  it('tout nœud cité est LIVRÉ — un nœud fantôme rend la région à jamais incomplète', () => {
    const surDisqueIds = new Set(surDisque.map((n) => n.id));
    expect(cites.filter((id) => !surDisqueIds.has(id))).toEqual([]);
  });

  it('chaque nœud est cité par SA région, et une seule fois', () => {
    for (const region of document.regions) {
      for (const id of region.noeuds) {
        const noeud = surDisque.find((n) => n.id === id);
        expect(noeud?.region, `${id} cité par ${region.region}`).toBe(region.region);
      }
    }
    expect(new Set(cites).size, 'un nœud cité deux fois').toBe(cites.length);
  });

  it('les deux régions ouvertes (D38) portent chacune au moins 4 nœuds (R13)', () => {
    // R13 : « 4 à 6 nœuds par sortie ». Une région ouverte qui n'en porte pas quatre ne peut
    // pas composer une sortie complète.
    for (const code of ['clairiere', 'galeries']) {
      const region = document.regions.find((r) => r.region === code);
      expect(region?.noeuds.length, code).toBeGreaterThanOrEqual(4);
    }
  });
});
