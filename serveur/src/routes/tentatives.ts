/**
 * `POST /api/tentatives` — la seule route qui ECRIT au journal.
 *
 * Elle est IDEMPOTENTE, et c'est une exigence explicite de l'annexe T § T2 : « rejouer deux fois
 * la meme tentative (reseau capricieux, double tap) ne double pas le score ». Un second envoi
 * porteur de la meme `cleIdempotence` rend **200** avec `deja: true`, n'insere rien et ne touche
 * pas a la progression — contrat § 6.3. Le premier envoi rend **201**.
 *
 * Le corps est une entree NON FIABLE : il est valide a l'execution, champ par champ.
 */

import type { FastifyInstance } from 'fastify';

import type {
  AxeMiroir,
  ConfusionObservee,
  ModeReponse,
  NiveauAide,
  ResumeEtape,
  ResumeTentative
} from '@pierre/partage';
import type { ProgressionNoeud, ReponseTentative } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { chargerParametresPedagogie } from '../depots/maitrise.js';
import { profilExiste } from '../depots/profils.js';
import { lireProgressionNoeud } from '../depots/progression.js';
import type { AlimentationPedagogique, TentativeValidee } from '../depots/tentatives.js';
import { deriverCleIdempotence, enregistrerTentative } from '../depots/tentatives.js';

const NIVEAUX_AIDE: readonly string[] = ['aucune', 'indice', 'demonstration'];

/** Les 9 modes de reponse de D13. Un mode inconnu est un refus, jamais un defaut silencieux. */
const MODES_REPONSE: readonly string[] = [
  'vrai-faux',
  'qcm-3',
  'qcm-4',
  'place',
  'colorie',
  'trace',
  'saisie',
  'ordre',
  'appariement'
];

const AXES_MIROIR: readonly string[] = ['gauche-droite', 'haut-bas'];

type Validation =
  | { readonly ok: true; readonly valeur: TentativeValidee }
  | { readonly ok: false; readonly message: string };

function chaineNonVide(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : null;
}

function entierPositif(valeur: unknown, defaut: number): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    return defaut;
  }
  return Math.max(0, Math.trunc(valeur));
}

/** Entier positif ou `null` — pour `latenceMs` et `nbElements`, ou `null` a un sens. */
function entierPositifOuNull(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined) {
    return null;
  }
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    return null;
  }
  return Math.max(0, Math.trunc(valeur));
}

/**
 * La confusion journalisee par le moteur, AVEC son axe (D23).
 *
 * L'axe n'est jamais deduit ici : c'est le moteur `trace` (L2-C) qui sait de quel axe releve un
 * geste, et le deviner au serveur depuis les deux lettres reviendrait a inventer une seconde
 * autorite a cote de `PAIRES_MIROIR`. Un axe inconnu devient `null` — une confusion sans axe
 * reste une confusion, elle est simplement ecartee du top 10 (contrat § 6).
 */
function validerConfusion(brut: unknown, competenceParDefaut: string): ConfusionObservee | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }
  const c = brut as { attendu?: unknown; rendu?: unknown; axe?: unknown; competence?: unknown };
  const attendu = chaineNonVide(c.attendu);
  const rendu = chaineNonVide(c.rendu);
  if (attendu === null || rendu === null) {
    return null;
  }
  const axe = AXES_MIROIR.includes(String(c.axe)) ? (String(c.axe) as AxeMiroir) : null;
  return {
    attendu,
    rendu,
    axe,
    competence: chaineNonVide(c.competence) ?? competenceParDefaut
  };
}

type ValidationEtapes =
  | { readonly ok: true; readonly etapes: readonly ResumeEtape[] }
  | { readonly ok: false; readonly message: string };

/**
 * Valide les etapes du resume.
 *
 * `modeReponse` est OBLIGATOIRE des qu'une etape est envoyee : c'est lui, et lui seul, qui fixe
 * `p_devinette` (D13). Lui donner un defaut ferait monter la maitrise estimee sur des reponses
 * au hasard — nommement la « regression pedagogique silencieuse » de l'annexe T § 1. On refuse
 * en 400 plutot que de completer : le client qui l'omet doit le savoir tout de suite.
 */
function validerEtapes(brut: unknown, competenceParDefaut: string): ValidationEtapes {
  if (!Array.isArray(brut)) {
    return { ok: true, etapes: [] };
  }
  const etapes: ResumeEtape[] = [];
  for (const [rang, element] of (brut as readonly unknown[]).entries()) {
    if (typeof element !== 'object' || element === null) {
      continue;
    }
    const e = element as {
      identifiant?: unknown;
      nbErreurs?: unknown;
      aideUtilisee?: unknown;
      nbEcoutes?: unknown;
      dureeMs?: unknown;
      modeReponse?: unknown;
      latenceMs?: unknown;
      nbElements?: unknown;
      confusion?: unknown;
    };
    const identifiant = chaineNonVide(e.identifiant);
    if (identifiant === null) {
      continue;
    }
    if (!MODES_REPONSE.includes(String(e.modeReponse))) {
      return {
        ok: false,
        message:
          `L'etape ${String(rang)} (« ${identifiant} ») doit declarer un « modeReponse » parmi ` +
          `${MODES_REPONSE.join(', ')} : c'est lui qui fixe p_devinette (D13).`
      };
    }
    etapes.push({
      identifiant,
      nbErreurs: entierPositif(e.nbErreurs, 0),
      aideUtilisee: (NIVEAUX_AIDE.includes(String(e.aideUtilisee))
        ? String(e.aideUtilisee)
        : 'aucune') as NiveauAide,
      nbEcoutes: entierPositif(e.nbEcoutes, 0),
      dureeMs: entierPositif(e.dureeMs, 0),
      modeReponse: String(e.modeReponse) as ModeReponse,
      latenceMs: entierPositifOuNull(e.latenceMs),
      nbElements: entierPositifOuNull(e.nbElements),
      confusion: validerConfusion(e.confusion, competenceParDefaut)
    });
  }
  return { ok: true, etapes };
}

/**
 * Valide le corps de `POST /api/tentatives`.
 *
 * Le serveur ne recalcule NI les etoiles a la main — `calculerEtoiles` de L-B est le seul endroit
 * ou vit le bareme (contrat § 5.7) — NI la cle d'idempotence envoyee par le client : deux facons
 * de concatener suffiraient a rendre l'idempotence inoperante. La cle n'est derivee que si elle
 * manque.
 */
export function validerTentative(corps: unknown, competenceParDefaut = ''): Validation {
  if (typeof corps !== 'object' || corps === null) {
    return { ok: false, message: 'Le corps de la requete doit etre un objet JSON.' };
  }

  const brut = corps as Record<string, unknown>;

  const obligatoires: readonly string[] = [
    'profil',
    'noeud',
    'exercice',
    'moteur',
    'habillage',
    'demarreLe',
    'termineLe'
  ];
  const valeurs = new Map<string, string>();
  for (const champ of obligatoires) {
    const valeur = chaineNonVide(brut[champ]);
    if (valeur === null) {
      return { ok: false, message: `Le champ « ${champ} » est obligatoire et doit etre une chaine.` };
    }
    valeurs.set(champ, valeur);
  }

  const graine = typeof brut['graine'] === 'number' && Number.isFinite(brut['graine'])
    ? Math.trunc(brut['graine'])
    : null;
  if (graine === null) {
    return { ok: false, message: 'Le champ « graine » est obligatoire et doit etre un entier.' };
  }

  const resumeBrut = brut['resume'];
  if (typeof resumeBrut !== 'object' || resumeBrut === null) {
    return { ok: false, message: 'Le champ « resume » est obligatoire et doit etre un objet.' };
  }
  const r = resumeBrut as {
    reussi?: unknown;
    nbErreurs?: unknown;
    aideUtilisee?: unknown;
    dureeMs?: unknown;
    etapes?: unknown;
  };

  const etapes = validerEtapes(r.etapes, competenceParDefaut);
  if (!etapes.ok) {
    return { ok: false, message: etapes.message };
  }

  // R14 : toute session se termine sur une reussite. `reussi: false` est structurellement
  // inatteignable pour le moteur `colorie` (contrat § 5.6). Le serveur ne CORRIGE pas la valeur
  // — il journalise ce que le client a envoye, sinon le journal cesserait de faire foi.
  const resume: ResumeTentative = {
    reussi: r.reussi === true,
    nbErreurs: entierPositif(r.nbErreurs, 0),
    aideUtilisee: (NIVEAUX_AIDE.includes(String(r.aideUtilisee))
      ? String(r.aideUtilisee)
      : 'aucune') as NiveauAide,
    dureeMs: entierPositif(r.dureeMs, 0),
    etapes: etapes.etapes
  };

  const profil = valeurs.get('profil') ?? '';
  const noeud = valeurs.get('noeud') ?? '';
  const demarreLe = valeurs.get('demarreLe') ?? '';

  const cleFournie = chaineNonVide(brut['cleIdempotence']);

  return {
    ok: true,
    valeur: {
      cleIdempotence: cleFournie ?? deriverCleIdempotence(profil, noeud, demarreLe, graine),
      profil,
      noeud,
      exercice: valeurs.get('exercice') ?? '',
      moteur: valeurs.get('moteur') ?? '',
      habillage: valeurs.get('habillage') ?? '',
      graine,
      demarreLe,
      termineLe: valeurs.get('termineLe') ?? '',
      resume
    }
  };
}

export function enregistrerRoutesTentatives(
  app: FastifyInstance,
  contexte: ContexteServeur
): void {
  app.post('/api/tentatives', async (requete, reponse) => {
    // Les competences de l'exercice, lues AVANT la validation : elles servent de competence par
    // defaut aux etapes qui ne journalisent pas de confusion. Un exercice introuvable n'est pas
    // une erreur ici — la tentative a ete jouee, elle sera enregistree ; seule l'alimentation
    // pedagogique est alors sautee, et le journal fin restera vide pour cette tentative.
    const exerciceId =
      typeof (requete.body as { exercice?: unknown } | null)?.exercice === 'string'
        ? String((requete.body as { exercice: string }).exercice)
        : '';
    const exercice = exerciceId === '' ? null : await contexte.contenu.chargerExercice(exerciceId);
    const competences = exercice === null ? [] : [...exercice.competences];

    const validation = validerTentative(requete.body, competences[0] ?? '');
    if (!validation.ok) {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
    }

    const validee = validation.valeur;

    // La cle etrangere `tentatives.profil_id -> profils(id)` refuserait de toute facon
    // l'insertion ; on prefere un 404 explicite a une erreur de contrainte SQLite.
    if (!profilExiste(contexte.base, validee.profil)) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${validee.profil}`));
    }

    // BKT, Leitner et journal d'etapes — lot L2-D. Les parametres sont lus depuis les DONNEES
    // (C2, D13) : aucune valeur pedagogique ne vit dans ce fichier.
    const pedagogie: AlimentationPedagogique | undefined =
      competences.length === 0
        ? undefined
        : { competences, parametres: chargerParametresPedagogie() };

    const resultat = enregistrerTentative(
      contexte.base,
      validee,
      contexte.horloge,
      pedagogie
    );

    // Le filet du lot A1 a-t-il servi ? Il ne devrait JAMAIS servir : les quatorze moteurs
    // posent `nbElements` et un test le garde moteur par moteur. S'il sert, c'est qu'un moteur
    // a regresse ou qu'un client tiers envoie un resume incomplet — la tentative est sauvee,
    // mais le journal fin a perdu une etape, et cela doit se LIRE quelque part.
    if (resultat.etapesEcartees > 0) {
      requete.log.warn(
        {
          profil: validee.profil,
          noeud: validee.noeud,
          moteur: validee.moteur,
          etapesEcartees: resultat.etapesEcartees
        },
        'Etapes ecartees du journal fin : mode « ordre »/« appariement » sans « nbElements » ' +
          '(D13). La tentative est enregistree ; la pedagogie ne voit pas ces etapes.'
      );
    }

    // ══════════════════════════════════════════════════════════════════════════════════════
    // LE JOURNAL FAIT FOI, Y COMPRIS ICI — corrige par le lot QA Q4 (fuzzer d'API).
    //
    // Ces trois lignes lisaient `validee.noeud`, c'est-a-dire le nœud que le CORPS revendique.
    // Quand la cle d'idempotence est deja connue, `enregistrerTentative` court-circuite et rend
    // la tentative DEJA STOCKEE — qui peut porter un autre nœud. La progression du nœud
    // revendique n'existe alors pas, et la route levait : **500**.
    //
    // Mesure du fuzzer (`tests/api/fuzz-api.test.ts`), 12 corps hostiles sur le seul champ
    // `noeud` :
    //
    //   [pierre] 500 sur POST /api/tentatives
    //     Progression introuvable apres enregistrement (profil prf-…, noeud quarante-deux).
    //
    // Ce n'est pas un cas de laboratoire : c'est l'AUTRE bout de la mutation M20 de
    // `Docs/audit-qa.md` § 4.3 (« la cle d'idempotence oublie le nœud »). Une cle qui collisionne
    // entre deux nœuds produit exactement ce corps-la, et l'enfant qui vient de terminer recoit
    // une erreur interne au lieu de sa recompense — la forme meme du defaut n° 4 du pere.
    //
    // On lit donc la progression du nœud REELLEMENT enregistre. La reponse decrit alors un etat
    // coherent — `tentative` et `progression` parlent du meme nœud — au lieu de croiser une
    // tentative stockee avec la progression d'un nœud qu'elle ne concerne pas.
    // ══════════════════════════════════════════════════════════════════════════════════════
    const progression: ProgressionNoeud | null = lireProgressionNoeud(
      contexte.base,
      resultat.tentative.profil,
      resultat.tentative.noeud
    );

    // La tentative vient d'etre ecrite dans la meme transaction : son absence de progression
    // n'est pas un cas nominal mais une incoherence de base. On echoue bruyamment plutot que
    // de renvoyer un corps qui ne respecte pas `ReponseTentative` (contrat § 3.4).
    if (progression === null) {
      throw new Error(
        'Progression introuvable apres enregistrement ' +
          `(profil ${resultat.tentative.profil}, noeud ${resultat.tentative.noeud}).`
      );
    }

    const corps: ReponseTentative = {
      deja: resultat.deja,
      tentative: resultat.tentative,
      progression
    };

    return reponse.code(resultat.deja ? 200 : 201).send(corps);
  });
}
