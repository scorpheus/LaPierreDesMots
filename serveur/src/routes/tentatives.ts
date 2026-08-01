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

import type { NiveauAide, ResumeEtape, ResumeTentative } from '@pierre/partage';
import type { ProgressionNoeud, ReponseTentative } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { profilExiste } from '../depots/profils.js';
import { lireProgressionNoeud } from '../depots/progression.js';
import type { TentativeValidee } from '../depots/tentatives.js';
import { deriverCleIdempotence, enregistrerTentative } from '../depots/tentatives.js';

const NIVEAUX_AIDE: readonly string[] = ['aucune', 'indice', 'demonstration'];

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

function validerEtapes(brut: unknown): readonly ResumeEtape[] {
  if (!Array.isArray(brut)) {
    return [];
  }
  const etapes: ResumeEtape[] = [];
  for (const element of brut as readonly unknown[]) {
    if (typeof element !== 'object' || element === null) {
      continue;
    }
    const e = element as {
      identifiant?: unknown;
      nbErreurs?: unknown;
      aideUtilisee?: unknown;
      nbEcoutes?: unknown;
      dureeMs?: unknown;
    };
    const identifiant = chaineNonVide(e.identifiant);
    if (identifiant === null) {
      continue;
    }
    etapes.push({
      identifiant,
      nbErreurs: entierPositif(e.nbErreurs, 0),
      aideUtilisee: (NIVEAUX_AIDE.includes(String(e.aideUtilisee))
        ? String(e.aideUtilisee)
        : 'aucune') as NiveauAide,
      nbEcoutes: entierPositif(e.nbEcoutes, 0),
      dureeMs: entierPositif(e.dureeMs, 0)
    });
  }
  return etapes;
}

/**
 * Valide le corps de `POST /api/tentatives`.
 *
 * Le serveur ne recalcule NI les etoiles a la main — `calculerEtoiles` de L-B est le seul endroit
 * ou vit le bareme (contrat § 5.7) — NI la cle d'idempotence envoyee par le client : deux facons
 * de concatener suffiraient a rendre l'idempotence inoperante. La cle n'est derivee que si elle
 * manque.
 */
export function validerTentative(corps: unknown): Validation {
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
    etapes: validerEtapes(r.etapes)
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
  app.post('/api/tentatives', (requete, reponse) => {
    const validation = validerTentative(requete.body);
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

    const resultat = enregistrerTentative(contexte.base, validee, contexte.horloge);

    const progression: ProgressionNoeud | null = lireProgressionNoeud(
      contexte.base,
      validee.profil,
      validee.noeud
    );

    // La tentative vient d'etre ecrite dans la meme transaction : son absence de progression
    // n'est pas un cas nominal mais une incoherence de base. On echoue bruyamment plutot que
    // de renvoyer un corps qui ne respecte pas `ReponseTentative` (contrat § 3.4).
    if (progression === null) {
      throw new Error(
        `Progression introuvable apres enregistrement (profil ${validee.profil}, noeud ${validee.noeud}).`
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
