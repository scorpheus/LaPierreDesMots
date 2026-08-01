/**
 * Chargement et validation des paramètres pédagogiques — lot L2-D, convention C2.
 *
 * D13 en toutes lettres : « ces valeurs sont des paramètres déclarés en données, pas des
 * constantes dans le code : elles seront recalibrées sur les tentatives réelles, et le test de
 * rejeu doit rendre visible tout changement. »
 *
 * Conséquence de forme, et elle est vérifiée mécaniquement par
 * `tests/unitaires/parametres-pedagogie.test.ts` : **aucune valeur numérique du fichier de
 * paramètres n'apparaît dans ce dossier.** Ce module ne connaît que des BORNES structurelles
 * (une probabilité vit dans [0, 1], il y a cinq boîtes Leitner) ; il ne connaît aucune valeur.
 *
 * Il ne lit pas non plus le disque : c'est l'appelant qui injecte le JSON déjà analysé. Sans
 * quoi `partage/` dépendrait de `node:fs` et cesserait d'être utilisable côté client — et le
 * test de substitution, qui donne des paramètres modifiés, deviendrait impossible à écrire.
 */

import { ErreurPierre } from '../erreurs.js';
import type {
  CritereAcquis, ContraintesSelecteur, ModeReponse, NumeroBoite,
  ParametresBkt, ParametresLeitner, ParametresPedagogie,
} from './types.js';

/** Les 9 modes de réponse de D13. Un mode absent du fichier est un refus, jamais un défaut. */
const MODES_REPONSE: readonly ModeReponse[] = [
  'vrai-faux', 'qcm-3', 'qcm-4', 'place', 'colorie', 'trace', 'saisie', 'ordre', 'appariement',
];

/**
 * Les deux modes dont `p_devinette` est **calculée** en `1/n!` et ne peut donc pas être tabulée.
 * Le fichier doit y déclarer `null` : une valeur tabulée pour `ordre` serait fausse dès que le
 * nombre d'éléments change, et c'est exactement le défaut silencieux que D13 combat.
 */
const MODES_CALCULES: readonly ModeReponse[] = ['ordre', 'appariement'];

/** Cinq boîtes Leitner (v2 § 12.2). C'est une contrainte de structure, pas une valeur calibrée. */
const NB_BOITES = 5;

/**
 * `details` est REQUIS, pas facultatif : un refus sans le champ fautif oblige à relire le
 * fichier de paramètres à la main pour savoir ce qui cloche.
 */
function refuser(message: string, details: Readonly<Record<string, unknown>>): never {
  throw new ErreurPierre('contenu-invalide', message, details);
}

function objet(valeur: unknown, ou: string): Record<string, unknown> {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
    refuser(`« ${ou} » doit être un objet.`, { ou, recu: typeof valeur });
  }
  return valeur as Record<string, unknown>;
}

/** Un nombre fini. Toute autre chose — chaîne, `null`, `NaN` — est un refus. */
function nombre(valeur: unknown, ou: string): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    refuser(`« ${ou} » doit être un nombre fini.`, { ou, recu: valeur });
  }
  return valeur;
}

/** Une probabilité : un nombre fini dans [0, 1]. Hors bornes = refus, jamais un écrêtage. */
function probabilite(valeur: unknown, ou: string): number {
  const n = nombre(valeur, ou);
  if (n < 0 || n > 1) {
    refuser(`« ${ou} » doit être une probabilité dans [0, 1].`, { ou, recu: n });
  }
  return n;
}

function entierAuMoins(valeur: unknown, minimum: number, ou: string): number {
  const n = nombre(valeur, ou);
  if (!Number.isInteger(n) || n < minimum) {
    refuser(`« ${ou} » doit être un entier >= ${String(minimum)}.`, { ou, recu: n });
  }
  return n;
}

function booleen(valeur: unknown, ou: string): boolean {
  if (typeof valeur !== 'boolean') {
    refuser(`« ${ou} » doit être un booléen.`, { ou, recu: typeof valeur });
  }
  return valeur;
}

function lireBkt(brut: unknown): ParametresBkt {
  const source = objet(brut, 'bkt');
  const devinetteBrute = objet(source['pDevinette'], 'bkt.pDevinette');

  const pDevinette: Record<ModeReponse, number | null> = {} as Record<ModeReponse, number | null>;
  for (const mode of MODES_REPONSE) {
    if (!(mode in devinetteBrute)) {
      refuser(
        `Le mode de réponse « ${mode} » manque à bkt.pDevinette. D13 exige une valeur par mode ; ` +
          'un mode absent rendrait la maîtrise estimée fausse sans que rien ne se voie.',
        { mode }
      );
    }
    const valeur = devinetteBrute[mode];
    if (MODES_CALCULES.includes(mode)) {
      if (valeur !== null) {
        refuser(
          `bkt.pDevinette.${mode} doit valoir null : sa valeur est calculée en 1/n! depuis le ` +
            "nombre d'éléments, elle ne peut pas être tabulée.",
          { mode, recu: valeur }
        );
      }
      pDevinette[mode] = null;
    } else {
      pDevinette[mode] = probabilite(valeur, `bkt.pDevinette.${mode}`);
    }
  }

  const poidsAvecAide = probabilite(source['poidsAvecAide'], 'bkt.poidsAvecAide');
  if (poidsAvecAide >= 1) {
    refuser(
      'bkt.poidsAvecAide doit être strictement inférieur à 1 : une tentative avec aide de Gobi ' +
        "pèse MOINS qu'une tentative sans aide (v2 § 12.2). À 1, l'aide deviendrait invisible.",
      { recu: poidsAvecAide }
    );
  }

  return {
    pInit: probabilite(source['pInit'], 'bkt.pInit'),
    pTransit: probabilite(source['pTransit'], 'bkt.pTransit'),
    pGlissement: probabilite(source['pGlissement'], 'bkt.pGlissement'),
    pDevinette,
    poidsAvecAide,
  };
}

function lireAcquis(brut: unknown): CritereAcquis {
  const source = objet(brut, 'acquis');
  return {
    seuilP: probabilite(source['seuilP'], 'acquis.seuilP'),
    tentativesMin: entierAuMoins(source['tentativesMin'], 1, 'acquis.tentativesMin'),
    joursDistinctsMin: entierAuMoins(source['joursDistinctsMin'], 1, 'acquis.joursDistinctsMin'),
    tentativesFaibleDevinetteMin: entierAuMoins(
      source['tentativesFaibleDevinetteMin'],
      1,
      'acquis.tentativesFaibleDevinetteMin'
    ),
    seuilFaibleDevinette: probabilite(
      source['seuilFaibleDevinette'],
      'acquis.seuilFaibleDevinette'
    ),
  };
}

function lireLeitner(brut: unknown): ParametresLeitner {
  const source = objet(brut, 'leitner');
  const delaisBruts = source['delaisJours'];
  if (!Array.isArray(delaisBruts) || delaisBruts.length !== NB_BOITES) {
    refuser(
      `leitner.delaisJours doit compter exactement ${String(NB_BOITES)} entrées, une par boîte.`,
      { recu: delaisBruts }
    );
  }
  const delais = (delaisBruts as readonly unknown[]).map((valeur, index) =>
    entierAuMoins(valeur, 1, `leitner.delaisJours[${String(index)}]`)
  );
  for (let i = 1; i < delais.length; i += 1) {
    if ((delais[i] as number) <= (delais[i - 1] as number)) {
      refuser(
        'leitner.delaisJours doit être strictement croissant : un Leitner dont une boîte ' +
          "espace moins que la précédente n'espace plus rien.",
        { delais }
      );
    }
  }

  const boiteApresEchec = entierAuMoins(source['boiteApresEchec'], 1, 'leitner.boiteApresEchec');
  if (boiteApresEchec > NB_BOITES) {
    refuser(`leitner.boiteApresEchec doit être dans [1, ${String(NB_BOITES)}].`, {
      recu: boiteApresEchec,
    });
  }

  return {
    delaisJours: delais as unknown as readonly [number, number, number, number, number],
    boiteApresEchec: boiteApresEchec as NumeroBoite,
  };
}

function lireSelecteur(brut: unknown): ContraintesSelecteur {
  const source = objet(brut, 'selecteur');
  const nbNoeudsMin = entierAuMoins(source['nbNoeudsMin'], 2, 'selecteur.nbNoeudsMin');
  const nbNoeudsMax = entierAuMoins(source['nbNoeudsMax'], 2, 'selecteur.nbNoeudsMax');
  if (nbNoeudsMax < nbNoeudsMin) {
    refuser('selecteur.nbNoeudsMax doit être >= selecteur.nbNoeudsMin.', {
      nbNoeudsMin,
      nbNoeudsMax,
    });
  }

  // Jamais en ouverture (v2 § 12.2). Qu'elle ne soit jamais en clôture se vérifie à la
  // composition, là où la longueur de la sortie est connue.
  const rangRevision = entierAuMoins(source['rangRevision'], 2, 'selecteur.rangRevision');

  return {
    nbNoeudsMin,
    nbNoeudsMax,
    seuilPrerequis: probabilite(source['seuilPrerequis'], 'selecteur.seuilPrerequis'),
    habillageUniqueParSortie: booleen(
      source['habillageUniqueParSortie'],
      'selecteur.habillageUniqueParSortie'
    ),
    rangRevision,
  };
}

/**
 * Lit et valide `contenu/referentiel/parametres-pedagogie.json`.
 *
 * LÈVE `ErreurPierre('contenu-invalide')` si un mode de réponse manque à `pDevinette`, si une
 * probabilité sort de `[0, 1]`, ou si `delaisJours` n'a pas exactement 5 entrées croissantes.
 * Aucun défaut silencieux : un paramètre manquant doit se voir au démarrage, pas dans trois
 * semaines dans une courbe.
 */
export function lireParametresPedagogie(donnees: unknown): ParametresPedagogie {
  const source = objet(donnees, 'parametres-pedagogie');
  return {
    bkt: lireBkt(source['bkt']),
    acquis: lireAcquis(source['acquis']),
    leitner: lireLeitner(source['leitner']),
    selecteur: lireSelecteur(source['selecteur']),
  };
}

/**
 * Sérialisation canonique : clés triées à toute profondeur. Deux fichiers qui ne diffèrent que
 * par l'ordre des clés ou l'indentation rendent la même chaîne — sans quoi l'empreinte
 * signalerait un changement de mise en forme comme un changement pédagogique.
 */
function canoniser(valeur: unknown): string {
  if (Array.isArray(valeur)) {
    return `[${valeur.map(canoniser).join(',')}]`;
  }
  if (typeof valeur === 'object' && valeur !== null) {
    const entrees = Object.entries(valeur as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );
    return `{${entrees.map(([cle, v]) => `${JSON.stringify(cle)}:${canoniser(v)}`).join(',')}}`;
  }
  return JSON.stringify(valeur) ?? 'null';
}

/**
 * Empreinte des paramètres, écrite dans le rapport de `test:rejeu`. Un changement se voit.
 *
 * FNV-1a 32 bits sur la forme canonique, et non `node:crypto` : `partage/` doit rester
 * importable côté client comme côté serveur, et cette empreinte n'a aucun usage de sécurité —
 * elle sert à répondre « les paramètres ont-ils bougé depuis la dernière référence ? ».
 */
export function empreinteParametres(parametres: ParametresPedagogie): string {
  const matiere = canoniser(parametres);
  let empreinte = 0x811c9dc5;
  for (let i = 0; i < matiere.length; i += 1) {
    empreinte ^= matiere.charCodeAt(i);
    empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
  }
  return empreinte.toString(16).padStart(8, '0');
}
