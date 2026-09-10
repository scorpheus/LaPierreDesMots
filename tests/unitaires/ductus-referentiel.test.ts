/**
 * LE DUCTUS EST UNE DONNÉE DÉCLARÉE — D33, conséquence 1 : « le ductus de chaque lettre est
 * une donnée déclarée (`contenu/referentiel/ductus-*.json`), avec point de départ, sens de
 * rotation et ordre des traits — **jamais dérivé de la forme** ».
 *
 * Ce fichier est le seul endroit du dépôt qui confronte les deux : le référentiel qui DÉCLARE
 * et les modèles qui DESSINENT. Sans lui, le référentiel serait un document mort — il
 * annoncerait un geste que rien n'oblige personne à respecter, et la prochaine génération de
 * `minuscules.json` le contredirait en silence. C'est le mode de défaillance que D33 nomme :
 * « un moteur de tracé qui enseigne un mauvais sens détruit le mécanisme même pour lequel il
 * a été ajouté ».
 *
 * L'AUDIT PORTE SUR LES OBJETS, JAMAIS SUR LES OCCURRENCES. On énumère les 26 lettres et les
 * 45 traits qui DEVRAIENT porter un ductus, pas les lignes où le mot apparaît : une lettre
 * qu'aucune règle ne couvre et que personne n'a nommée est exactement le trou qu'une
 * recherche textuelle ne voit pas.
 *
 * SOURCES LUES SUR DISQUE, JAMAIS RECALCULÉES :
 *   • `contenu/referentiel/ductus-minuscules.json` — le ductus déclaré, qui fait foi ;
 *   • `contenu/modeles-lettres/minuscules.json` — les modèles ;
 *   • les deux exercices `trace` livrés, qui recopient les modèles dans leur contenu.
 */
import { describe, expect, it } from 'vitest';

import type { Exercice } from '@pierre/partage';
import type { ContenuTrace, ModeleLettre, TraitLettre } from '@partage/moteurs/trace/index';

import { lireJson } from '../configuration/preparation.js';

const CHEMIN_DUCTUS = 'contenu/referentiel/ductus-minuscules.json';
const CHEMIN_SCHEMA = 'contenu/schemas/ductus.schema.json';
const CHEMIN_LETTRES = 'contenu/modeles-lettres/minuscules.json';
const CHEMINS_EXERCICES = [
  'contenu/exercices/galeries/miroir-bd-01.json',
  'contenu/exercices/galeries/miroir-bp-01.json',
] as const;

interface LettreDeclaree {
  readonly lettre: string;
  readonly premierTrait: string;
  readonly depart: readonly [number, number];
  readonly sens: 'horaire' | 'antihoraire' | 'sans-objet';
}
interface RegleDuctus {
  readonly id: string;
  readonly enonce: string;
  readonly source: string;
  readonly lettres?: readonly LettreDeclaree[];
  readonly traits?: readonly string[];
}
interface Ductus {
  readonly casse: string;
  readonly source: string;
  readonly regles: readonly RegleDuctus[];
  readonly nonTranchees: readonly { readonly lettre: string; readonly raison: string }[];
}

const ductus = lireJson<Ductus>(CHEMIN_DUCTUS);
const bibliotheque = lireJson<{ lettres: readonly ModeleLettre[] }>(CHEMIN_LETTRES);
const parLettre = new Map(bibliotheque.lettres.map((l) => [l.lettre, l]));

const regleDe = (id: string): RegleDuctus => {
  const regle = ductus.regles.find((r) => r.id === id);
  if (regle === undefined) throw new Error(`règle « ${id} » absente du référentiel`);
  return regle;
};

const lettresDeclarees: readonly LettreDeclaree[] = ductus.regles.flatMap((r) => r.lettres ?? []);
const tousLesTraits: readonly { readonly lettre: string; readonly trait: TraitLettre }[] =
  bibliotheque.lettres.flatMap((l) => l.traits.map((trait) => ({ lettre: l.lettre, trait })));

/**
 * Sens de parcours par l'aire signée (formule du lacet). Le `viewBox` SVG a l'axe **y vers le
 * bas** : une aire POSITIVE y vaut le sens horaire à l'écran, l'inverse de la convention
 * mathématique. Le signe est vérifié sur un cas connu avant de servir.
 */
function sensDeRotation(
  points: readonly (readonly [number, number])[],
): 'horaire' | 'antihoraire' {
  let aire = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    aire += a[0] * b[1] - b[0] * a[1];
  }
  return aire > 0 ? 'horaire' : 'antihoraire';
}

describe('le référentiel de ductus est une donnée valide, pas un texte libre', () => {
  it('la mesure du sens de rotation est juste sur un cas connu', () => {
    // Contrôle de l'instrument : un carré parcouru vers la droite puis vers le bas est
    // HORAIRE à l'écran. Sans ce cas, un signe inversé ferait dire n'importe quoi au reste.
    expect(
      sensDeRotation([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]),
    ).toBe('horaire');
  });

  it('passe son schéma JSON', async () => {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const schema = lireJson<Record<string, unknown>>(CHEMIN_SCHEMA);
    const valider = ajv.compile(schema);
    expect(valider(ductus), JSON.stringify(valider.errors)).toBe(true);
  });

  it('cite la décision qui fait foi — aucune règle ne s’écrit sans source', () => {
    expect(ductus.source).toContain('D33');
    for (const regle of ductus.regles) {
      expect(regle.source.length, `règle « ${regle.id} »`).toBeGreaterThan(20);
    }
  });
});

describe('AUDIT PAR OBJET — les 26 lettres, aucune oubliée', () => {
  it('chaque lettre du modèle est déclarée OU nommément non tranchée, jamais les deux', () => {
    const declarees = new Set(lettresDeclarees.map((l) => l.lettre));
    const nonTranchees = new Set(ductus.nonTranchees.map((n) => n.lettre));

    const orphelines = bibliotheque.lettres
      .map((l) => l.lettre)
      .filter((l) => !declarees.has(l) && !nonTranchees.has(l));
    const deuxFois = [...declarees].filter((l) => nonTranchees.has(l));

    expect(orphelines, 'lettres du modèle qu’aucune règle ne couvre et que personne ne nomme')
      .toEqual([]);
    expect(deuxFois, 'lettres à la fois déclarées et non tranchées').toEqual([]);
    expect(declarees.size + nonTranchees.size).toBe(bibliotheque.lettres.length);
  });

  it('aucune lettre déclarée n’est absente du modèle', () => {
    for (const declaree of lettresDeclarees) {
      expect(parLettre.get(declaree.lettre), `lettre « ${declaree.lettre} »`).toBeDefined();
    }
    for (const nonTranchee of ductus.nonTranchees) {
      expect(parLettre.get(nonTranchee.lettre), `lettre « ${nonTranchee.lettre} »`).toBeDefined();
    }
  });
});

describe('règle « rond-antihoraire » — D33, le geste du `o`', () => {
  it('le modèle de chaque lettre déclarée SUIT son ductus, trait, départ et sens', () => {
    expect(lettresDeclarees.length).toBeGreaterThan(0);
    for (const declaree of lettresDeclarees) {
      const modele = parLettre.get(declaree.lettre)!;
      const premier = modele.traits[0]!;
      const contexte = `lettre « ${declaree.lettre} »`;

      // 1. Le trait initial est bien celui que le référentiel nomme (l'ORDRE des traits).
      expect(premier.id, `${contexte} — premier trait`).toBe(declaree.premierTrait);
      // 2. Le point de départ, à l'unité près : c'est là que le doigt se pose.
      expect(premier.depart[0], `${contexte} — départ x`).toBeCloseTo(declaree.depart[0], 6);
      expect(premier.depart[1], `${contexte} — départ y`).toBeCloseTo(declaree.depart[1], 6);
      // 3. Le sens, mesuré sur les points, jamais lu dans un champ du modèle.
      if (declaree.sens !== 'sans-objet') {
        expect(sensDeRotation(premier.points), `${contexte} — sens`).toBe(declaree.sens);
      }
      // 4. Le départ déclaré est bien le premier point tracé, pas une annotation à côté.
      expect(premier.points[0]![0], `${contexte} — premier point x`).toBeCloseTo(
        declaree.depart[0],
        6,
      );
      expect(premier.points[0]![1], `${contexte} — premier point y`).toBeCloseTo(
        declaree.depart[1],
        6,
      );
    }
  });

  it('le d commence par la barre demandée par le parent, q conserve son rond initial', () => {
    const d = lettresDeclarees.find((l) => l.lettre === 'd')!;
    const q = lettresDeclarees.find((l) => l.lettre === 'q')!;
    // La confirmation du 9 septembre remplace l'ordre D33 pour d uniquement.
    expect(d).toMatchObject({ premierTrait: 'd-hampe', depart: [70, 20], sens: 'sans-objet' });
    expect(q).toMatchObject({ premierTrait: 'q-panse', depart: [70, 60], sens: 'antihoraire' });
  });
});

describe('règle « haste-descendante » — une barre ne remonte jamais', () => {
  const regle = regleDe('haste-descendante');
  /** Ce que la règle DEVRAIT couvrir, énuméré sur les objets du modèle. */
  const LIBELLE_DE_HASTE = /barre|hampe|queue|jambe|baton|canne/i;

  it('chaque identifiant listé existe, une seule fois', () => {
    const listes = regle.traits ?? [];
    expect(new Set(listes).size, 'doublons dans la liste').toBe(listes.length);
    for (const id of listes) {
      expect(
        tousLesTraits.some((t) => t.trait.id === id),
        `trait « ${id} » introuvable dans le modèle`,
      ).toBe(true);
    }
  });

  it('aucune haste du modèle n’échappe à la liste — objets, pas occurrences', () => {
    const listes = new Set(regle.traits ?? []);
    const attendus = tousLesTraits.filter((t) => LIBELLE_DE_HASTE.test(t.trait.libelle));
    const oublies = attendus.filter((t) => !listes.has(t.trait.id)).map((t) => t.trait.id);
    expect(oublies, 'hastes du modèle absentes de la règle').toEqual([]);
    expect(attendus.length).toBe(listes.size);
  });

  it('aucune ne se trace de bas en haut', () => {
    const listes = new Set(regle.traits ?? []);
    const remontent = tousLesTraits
      .filter((t) => listes.has(t.trait.id))
      .filter((t) => t.trait.arrivee[1] < t.trait.depart[1])
      .map(
        (t) =>
          `${t.trait.id} ${JSON.stringify(t.trait.depart)} → ${JSON.stringify(t.trait.arrivee)}`,
      );
    expect(remontent, 'hastes tracées de bas en haut').toEqual([]);
  });
});

describe('les exercices livrés recopient les modèles, sans dérive', () => {
  it('chaque lettre inlinée est identique, trait pour trait, à la bibliothèque', () => {
    let lettresComparees = 0;
    for (const chemin of CHEMINS_EXERCICES) {
      const contenu = lireJson<Exercice>(chemin).jeu.contenu as unknown as ContenuTrace;
      for (const lettre of contenu.lettres) {
        const reference = parLettre.get(lettre.lettre);
        expect(reference, `${chemin} — lettre « ${lettre.lettre} »`).toBeDefined();
        // `axeRisque` est propre à l'exercice (D23 : une paire, donc un axe) et ne se compare
        // pas ; la GÉOMÉTRIE et le DUCTUS, eux, ne doivent jamais diverger.
        expect(
          lettre.traits,
          `${chemin} — lettre « ${lettre.lettre} » : traits divergents de la bibliothèque`,
        ).toEqual(reference!.traits);
        lettresComparees += 1;
      }
    }
    expect(lettresComparees, 'lettres inlinées comparées').toBe(4);
  });
});

// ────────────────────────────────────────────── CONTRAT DE SORTIE du lot C2
describe('CONTRAT DE SORTIE — le ductus est déclaré, et le modèle lui obéit', () => {
  it('imprime les comptes, et échoue si le référentiel est creux', () => {
    const regleRond = regleDe('rond-antihoraire');
    const regleHaste = regleDe('haste-descendante');
    const regleB = regleDe('b-barre-puis-panse-descendante');
    const modeleB = parLettre.get('b')!;
    const barreB = modeleB.traits[0]!;
    const panseB = modeleB.traits[1]!;
    const bConforme =
      modeleB.traits.length === 2 &&
      barreB.id === 'b-hampe' && panseB.id === 'b-panse' &&
      barreB.depart[0] === 30 && barreB.depart[1] === 20 &&
      barreB.arrivee[0] === 30 && barreB.arrivee[1] === 100 &&
      panseB.depart[0] === 30 && panseB.depart[1] === 60 &&
      panseB.arrivee[0] === 30 && panseB.arrivee[1] === 100 &&
      panseB.points.every((point, index) => index === 0 || point[1] >= panseB.points[index - 1]![1]);
    const nombreDeclarees = new Set(lettresDeclarees.map((lettre) => lettre.lettre)).size;
    const conformes = (regleRond.lettres ?? []).filter((d) => {
      const premier = parLettre.get(d.lettre)!.traits[0]!;
      return (
        premier.id === d.premierTrait &&
        premier.depart[0] === d.depart[0] &&
        premier.depart[1] === d.depart[1] &&
        sensDeRotation(premier.points) === d.sens
      );
    });

    console.log(
      `CONTRAT DE SORTIE C2 — ductus déclaré ⟷ modèles :\n` +
        `  lettres du modèle .................... ${bibliotheque.lettres.length}\n` +
        `  traits du modèle ..................... ${tousLesTraits.length}\n` +
        `  lettres déclarées (rond-antihoraire) . ${(regleRond.lettres ?? []).length}` +
        `  → conformes : ${conformes.length}\n` +
        `  b barre puis panse descendante ...... ${bConforme ? 1 : 0} / 1 conforme\n` +
        `  lettres déclarées (toutes règles) ... ${nombreDeclarees}\n` +
        `  lettres nommément non tranchées ...... ${ductus.nonTranchees.length}\n` +
        `  lettres non couvertes ................ ${
          bibliotheque.lettres.length -
          nombreDeclarees -
          ductus.nonTranchees.length
        }\n` +
        `  hastes auditées (haste-descendante) .. ${(regleHaste.traits ?? []).length}\n` +
        `  hastes qui remontent ................. 0`,
    );

    // Un référentiel qui ne déclarerait rien, ou dont le modèle s'écarterait, échoue ici.
    // d est maintenant déclaré dans sa règle barre-puis-panse, pas supprimé de l'audit.
    expect((regleRond.lettres ?? []).map((lettre) => lettre.lettre)).toEqual(['a', 'g', 'o', 'q']);
    expect(regleDe('d-barre-puis-panse-descendante').lettres).toEqual([
      { lettre: 'd', premierTrait: 'd-hampe', depart: [70, 20], sens: 'sans-objet' },
    ]);
    expect(conformes.length).toBe((regleRond.lettres ?? []).length);
    expect(regleB.lettres?.map((lettre) => lettre.lettre)).toEqual(['b']);
    expect(bConforme, 'demande du parent : barre descendante puis panse descendante du b').toBe(true);
    expect((regleHaste.traits ?? []).length).toBeGreaterThanOrEqual(24);
    expect(
      nombreDeclarees + ductus.nonTranchees.length,
      'toutes les lettres du modèle sont rendues, déclarées ou non tranchées',
    ).toBe(bibliotheque.lettres.length);
  });
});
