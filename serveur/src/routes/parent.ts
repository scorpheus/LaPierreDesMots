/**
 * La zone parent — contrat des features v2 § 5.3, lot L2-H.
 *
 * Quatre routes, toutes protegees sauf la premiere :
 *   POST /api/parent/ouvrir                  -> { jeton } ou 423
 *   GET  /api/parent/:profil/dashboard       -> ResumeDashboard
 *   GET  /api/parent/:profil/export/:code    -> text/csv
 *   POST /api/parent/relecture/:exercice     -> EntreeRelecture
 *
 * TROIS REGLES OPPOSABLES, et chacune vient d'un document :
 *
 * 1. **423 Locked, jamais 401, quand le verrou est actif** (contrat § 5.3). Le parent doit lire
 *    *quand* il pourra reessayer, pas *que c'est faux*. Le corps porte l'echeance.
 * 2. **Les routes enfant n'exigent aucun jeton** (v2 § 11 : « un tap suffit, aucun mot de
 *    passe »). Seule cette zone en demande un, et elle n'est pas dans le monde de l'enfant.
 * 3. **Aucun code, aucun jeton, aucune donnee de profil ne passe par l'URL.** Le code arrive
 *    dans le corps, le jeton dans un en-tete : les URL sont journalisees par Fastify et
 *    restent dans l'historique du navigateur.
 *
 * PLACEHOLDER — a valider (consigne dans `Docs/questions-en-attente.md`) : la PREMIERE
 * ouverture pose le code du foyer. Le contrat gele n'accorde aucune route « definir le code »
 * et la v2 § 11 ne dit pas comment il naît. Poser le code au premier acces evite un ecran de
 * configuration que personne n'a specifie, et le verrou couvre le reste.
 */

import path from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { ResumeDashboard, StatutRelecture, VerrouParent } from '@pierre/partage/parent';
import { ENTETE_JETON_PARENT } from '@pierre/partage/parent';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, RACINE_DEPOT, erreurApi, horodatage } from '../configuration.js';
import {
  ecrireCodeParent,
  ecrireVerrou,
  lireCodeParent,
  lireVerrou,
  listerRelecture,
  reinitialiserVerrou,
  synchroniserBrouillons,
  trancherRelecture
} from '../depots/parent.js';
import {
  appliquerEchec,
  deriverCode,
  estVerrouille,
  isoDepuisMs,
  selNeuf,
  verifierCode
} from '../services/code-parent.js';
import { construireExport, estCodeExport, nomFichierExport } from '../services/export-csv.js';
import {
  confusionsDuProfil,
  couvertureDuProfil,
  latencesDuProfil
} from '../services/indicateurs.js';

/**
 * Duree de vie d'un jeton parent. PLACEHOLDER — a valider.
 * Trente minutes : assez pour lire le dashboard et exporter, assez peu pour qu'un onglet
 * oublie sur la tablette de l'enfant ne reste pas ouvert sur la zone parent.
 */
export const DUREE_JETON_MS = 30 * 60 * 1000;

/** Un code parent est exactement quatre chiffres (v2 § 11). */
const MOTIF_CODE = /^\d{4}$/u;

/** Dossier des brouillons de L2-G — frontiere de fichiers du contrat § 5.1. */
const RACINE_BROUILLONS = path.join(RACINE_DEPOT, 'contenu', 'brouillons');

interface ParametresProfil {
  readonly profil: string;
}
interface ParametresExport {
  readonly profil: string;
  readonly code: string;
}
interface ParametresExercice {
  readonly exercice: string;
}

/** Le jeton lu dans l'en-tete dedie, ou en repli dans `Authorization: Bearer`. */
function jetonDeLaRequete(requete: FastifyRequest): string | null {
  const entetes = requete.headers as Record<string, string | string[] | undefined>;
  const direct = entetes[ENTETE_JETON_PARENT];
  if (typeof direct === 'string' && direct !== '') {
    return direct;
  }
  const autorisation = entetes['authorization'];
  if (typeof autorisation === 'string' && autorisation.startsWith('Bearer ')) {
    const valeur = autorisation.slice('Bearer '.length).trim();
    return valeur === '' ? null : valeur;
  }
  return null;
}

export function enregistrerRoutesParent(app: FastifyInstance, contexte: ContexteServeur): void {
  /**
   * Jetons vivants, en memoire du processus.
   *
   * En memoire et NON en base, deliberement : redemarrer le serveur doit refermer la zone
   * parent. Une session qui survivrait au redemarrage serait une session que personne n'a
   * choisi d'ouvrir. Le jeu tourne en un seul processus sur le PC du salon (CLAUDE.md), il n'y
   * a donc rien a partager entre instances.
   */
  const jetons = new Map<string, number>();

  function poserJeton(maintenantMs: number): { jeton: string; expireLe: string } {
    // Purge a la volee : la carte ne grossit pas d'un jeton par tentative d'ouverture.
    for (const [existant, expiration] of jetons) {
      if (expiration <= maintenantMs) {
        jetons.delete(existant);
      }
    }
    const jeton = selNeuf().toString('hex') + selNeuf().toString('hex');
    const expirationMs = maintenantMs + DUREE_JETON_MS;
    jetons.set(jeton, expirationMs);
    return { jeton, expireLe: isoDepuisMs(expirationMs) };
  }

  /** Rend `true` quand la requete peut continuer ; sinon elle a deja repondu. */
  function jetonValide(requete: FastifyRequest, reponse: FastifyReply): boolean {
    const jeton = jetonDeLaRequete(requete);
    const expiration = jeton === null ? undefined : jetons.get(jeton);
    const maintenantMs = Date.parse(String(horodatage(contexte.horloge)));

    if (jeton === null || expiration === undefined || expiration <= maintenantMs) {
      if (jeton !== null) {
        jetons.delete(jeton);
      }
      void reponse
        .code(401)
        .send(
          erreurApi(
            CODES_ERREUR.invalide,
            'La zone parent demande un code. Referme cette page et recommence.'
          )
        );
      return false;
    }
    return true;
  }

  // ────────────────────────────────────────────────────────── POST /api/parent/ouvrir

  app.post('/api/parent/ouvrir', (requete, reponse) => {
    const corps = requete.body as { code?: unknown } | null;
    const code = typeof corps?.code === 'string' ? corps.code.trim() : '';
    const maintenant = String(horodatage(contexte.horloge));

    /** 423 Locked, et JAMAIS 401 : le parent doit lire quand il pourra reessayer. */
    const repondreVerrouille = (etat: VerrouParent): FastifyReply =>
      reponse.code(423).send({
        ...erreurApi(
          CODES_ERREUR.conflit,
          `La zone parent est fermee un moment. Reessaie apres ${String(etat.verrouilleJusqua)}.`
        ),
        details: { verrouilleJusqua: etat.verrouilleJusqua, nbEchecs: etat.nbEchecs }
      });

    const verrou = lireVerrou(contexte.base);
    if (estVerrouille(verrou, maintenant)) {
      return repondreVerrouille(verrou);
    }

    if (!MOTIF_CODE.test(code)) {
      // Un format invalide compte comme un echec : sinon un robot enumererait les 10 000 codes
      // en envoyant `code: 12345` entre deux essais pour ne jamais faire monter le compteur.
      const apres = appliquerEchec(verrou, maintenant);
      ecrireVerrou(contexte.base, apres);
      if (estVerrouille(apres, maintenant)) {
        // L'echec qui ferme le verrou l'annonce, quelle que soit sa nature : sinon le parent
        // lirait « 4 chiffres » et taperait un code juste dans le vide.
        return repondreVerrouille(apres);
      }
      return reponse
        .code(400)
        .send(erreurApi(CODES_ERREUR.invalide, 'Le code parent compte exactement 4 chiffres.'));
    }

    const stocke = lireCodeParent(contexte.base);

    if (stocke === null) {
      // PLACEHOLDER — la premiere ouverture POSE le code du foyer (voir l'en-tete du fichier).
      const sel = selNeuf();
      ecrireCodeParent(contexte.base, sel, deriverCode(code, sel), maintenant);
      reinitialiserVerrou(contexte.base);
      return reponse.send(poserJeton(Date.parse(maintenant)));
    }

    if (!verifierCode(code, stocke.sel, stocke.empreinte)) {
      const apres = appliquerEchec(verrou, maintenant);
      ecrireVerrou(contexte.base, apres);
      if (estVerrouille(apres, maintenant)) {
        return repondreVerrouille(apres);
      }
      return reponse.code(401).send(erreurApi(CODES_ERREUR.invalide, 'Ce code ne convient pas.'));
    }

    reinitialiserVerrou(contexte.base);
    return reponse.send(poserJeton(Date.parse(maintenant)));
  });

  // ─────────────────────────────────────────── GET /api/parent/:profil/dashboard

  app.get<{ Params: ParametresProfil }>('/api/parent/:profil/dashboard', (requete, reponse) => {
    if (!jetonValide(requete, reponse)) {
      return reponse;
    }

    const profilId = requete.params.profil;
    // La file se cale sur le disque a chaque ouverture : un brouillon depose par L2-G entre
    // deux visites doit apparaitre sans qu'on redemarre quoi que ce soit.
    synchroniserBrouillons(contexte.base, RACINE_BROUILLONS, horodatage(contexte.horloge));

    const confusions = confusionsDuProfil(contexte.base, profilId);
    const resume: ResumeDashboard = {
      latences: latencesDuProfil(contexte.base, profilId),
      confusions: confusions.top,
      couverture: couvertureDuProfil(contexte.base, profilId),
      relecture: listerRelecture(contexte.base)
    };

    // `confusionsEcartees` accompagne le resume sans entrer dans `ResumeDashboard` : c'est le
    // chiffre qui empeche un top 10 vide de passer pour « il ne confond plus rien » (D23).
    return reponse.send({ ...resume, confusionsEcartees: confusions.ecartees });
  });

  // ──────────────────────────────────────── GET /api/parent/:profil/export/:code

  app.get<{ Params: ParametresExport }>('/api/parent/:profil/export/:code', (requete, reponse) => {
    if (!jetonValide(requete, reponse)) {
      return reponse;
    }

    const { profil, code } = requete.params;
    if (!estCodeExport(code)) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Export inconnu : ${code}`));
    }

    const csv = construireExport(contexte.base, profil, code);
    return reponse
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${nomFichierExport(code, profil)}"`)
      .send(csv);
  });

  // ─────────────────────────────────── POST /api/parent/relecture/:exercice

  app.post<{ Params: ParametresExercice }>(
    '/api/parent/relecture/:exercice',
    (requete, reponse) => {
      if (!jetonValide(requete, reponse)) {
        return reponse;
      }

      const corps = requete.body as { statut?: unknown; motif?: unknown } | null;
      const statut = typeof corps?.statut === 'string' ? corps.statut : '';
      if (statut !== 'valide' && statut !== 'rejete') {
        return reponse
          .code(400)
          .send(
            erreurApi(
              CODES_ERREUR.invalide,
              'Le statut de relecture vaut « valide » ou « rejete ».'
            )
          );
      }

      const motif = typeof corps?.motif === 'string' && corps.motif.trim() !== ''
        ? corps.motif.trim()
        : null;

      const entree = trancherRelecture(
        contexte.base,
        requete.params.exercice,
        statut as StatutRelecture,
        motif,
        horodatage(contexte.horloge)
      );

      if (entree === null) {
        return reponse
          .code(404)
          .send(
            erreurApi(
              CODES_ERREUR.introuvable,
              `Aucun brouillon en relecture pour : ${requete.params.exercice}`
            )
          );
      }
      return reponse.send(entree);
    }
  );
}
