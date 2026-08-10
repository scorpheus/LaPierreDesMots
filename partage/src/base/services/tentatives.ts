/**
 * Validation du corps de `POST /api/tentatives` — extrait de `serveur/src/routes/tentatives.ts`
 * (Lot 2 du portage Android, Docs/addendum-portage-android.md § 6bis). Aucune E/S propre : la
 * seule dépendance externe est `deriverCleIdempotence` (hachage portable), ce qui rend cette
 * validation appelable aussi bien derrière une route Fastify que depuis le client autonome.
 *
 * Le corps d'une requete est une entree NON FIABLE : il est valide a l'execution, champ par
 * champ. Le serveur ne recalcule NI les etoiles a la main — `calculerEtoiles` est le seul endroit
 * ou vit le bareme (contrat § 5.7) — NI la cle d'idempotence envoyee par le client : deux facons
 * de concatener suffiraient a rendre l'idempotence inoperante. La cle n'est derivee que si elle
 * manque.
 */

import type { AxeMiroir, ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { NiveauAide, ResumeEtape, ResumeTentative } from '../../moteurs/types.js';
import { deriverCleIdempotence } from '../depots/tentatives.js';
import type { TentativeValidee } from '../depots/tentatives.js';

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

export type ValidationTentative =
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

export async function validerTentative(
  corps: unknown,
  competenceParDefaut = ''
): Promise<ValidationTentative> {
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
      cleIdempotence: cleFournie ?? (await deriverCleIdempotence(profil, noeud, demarreLe, graine)),
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
