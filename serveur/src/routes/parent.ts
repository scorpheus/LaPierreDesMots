/**
 * La zone parent — contrat des features v2 § 5.3 (lot L2-H), etendu par le contrat de
 * finition v3 § 4.5, § 7.3 et § 8 (lot N5).
 *
 * Sept routes, toutes protegees sauf les trois premieres :
 *   GET  /api/parent/etat                    -> EtatPorteParent          (aucun jeton)
 *   POST /api/parent/definir                 -> { jeton } | 409 | 400    (jeton optionnel)
 *   POST /api/parent/ouvrir                  -> { jeton } | 404 | 401 | 423
 *   GET  /api/parent/:profil/galerie         -> CatalogueGalerie         (routes/parent-galerie)
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
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE N5 CORRIGE, ET POURQUOI C'ETAIT GRAVE — contrat de finition v3 § 1.8
 *
 * Le PLACEHOLDER qui occupait cette place disait : « la PREMIERE ouverture pose le code du
 * foyer ». Mesure sur le code livre, § 1.8 :
 *
 *   > `POST /api/parent/ouvrir` **pose silencieusement le code du foyer au premier appel**.
 *   > Un enfant curieux qui tape `1234` devient proprietaire du code parent, sans qu'un ecran
 *   > l'ait jamais demande.
 *
 * La cause n'etait pas un ecran manquant : c'etait une AMBIGUITE de lecture. `lireCodeParent`
 * rendant `null`, la route n'avait aucun moyen de distinguer « personne n'a encore choisi de
 * code » de « le code tape est faux ». Faute de pouvoir les distinguer, elle traitait les deux
 * comme le premier.
 *
 * Le remede est donc `codeEstDefini()` d'abord, et l'ecran ensuite :
 *   • `ouvrir` sans code defini repond **404 `introuvable`** et NE POSE RIEN ;
 *   • `definir` pose le code, une fois. Une seconde definition **sans jeton** repond
 *     **409 Conflict** — jamais 200, jamais un remplacement silencieux ;
 *   • `definir` **avec jeton** redefinit, parce qu'« on ne detruit jamais un code existant :
 *     le parent serait enferme dehors » (§ 7.3) et qu'il lui faut donc un chemin pour en
 *     changer, qui passe par la preuve qu'il connait l'ancien ;
 *   • `etat` rend la porte lisible du dehors, sans jeton, sans fuiter ni sel ni empreinte.
 *     C'est elle qui permet a l'ecran de savoir s'il doit demander un code ou en proposer un.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

import path from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type {
  EtatPorteParent,
  ResumeDashboard,
  StatutRelecture,
  VerrouParent
} from '@pierre/partage/parent';
import { ENTETE_JETON_PARENT } from '@pierre/partage/parent';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, RACINE_DEPOT, erreurApi, horodatage } from '../configuration.js';
import {
  codeEstDefini,
  ecrireCodeParent,
  ecrireVerrou,
  lireCodeParent,
  lireVerrou,
  listerRelecture,
  reinitialiserVerrou,
  synchroniserBrouillons,
  trancherRelecture
} from '../depots/parent.js';
import { enregistrerRoutesParentGalerie } from './parent-galerie.js';
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

  // ─────────────────────────────────────────────────────────── GET /api/parent/etat
  //
  // LA SEULE ROUTE DE LA ZONE PARENT QUI S'OUVRE SANS JETON, et il le faut : le client
  // l'interroge AVANT d'avoir un code a taper. Elle ne rend aucune donnee de l'enfant, ni le
  // sel, ni l'empreinte, ni le code — trois booleens et une echeance.
  //
  // Sans elle, l'ecran ne peut pas savoir s'il doit demander un code ou en proposer un, et il
  // ne lui reste qu'a deviner. C'est en devinant que la v1 posait le code du foyer au premier
  // enfant qui passait.

  app.get('/api/parent/etat', (_requete, reponse) => {
    const verrou = lireVerrou(contexte.base);
    const etat: EtatPorteParent = {
      codeDefini: codeEstDefini(contexte.base),
      verrouilleJusqua: verrou.verrouilleJusqua === null ? null : String(verrou.verrouilleJusqua),
      nbEchecs: verrou.nbEchecs
    };
    return reponse.send(etat);
  });

  /** 423 Locked, et JAMAIS 401 : le parent doit lire quand il pourra reessayer. */
  function repondreVerrouille(reponse: FastifyReply, etat: VerrouParent): FastifyReply {
    return reponse.code(423).send({
      ...erreurApi(
        CODES_ERREUR.conflit,
        `La zone parent est fermee un moment. Reessaie apres ${String(etat.verrouilleJusqua)}.`
      ),
      details: { verrouilleJusqua: etat.verrouilleJusqua, nbEchecs: etat.nbEchecs }
    });
  }

  // ───────────────────────────────────────────────────────── POST /api/parent/definir
  //
  // LA ROUTE QUI MANQUAIT — contrat de finition v3 § 1.8 et § 8.
  //
  // Elle est la SEULE a poser un code. `ouvrir` n'en pose plus aucun, et c'est ce
  // deplacement — pas l'ecran qui l'accompagne — qui solde le defaut : tant qu'une route
  // d'authentification pouvait aussi creer l'identifiant, aucun ecran n'aurait suffi.
  //
  // Le verrou N'EST PAS consulte ici quand aucun code n'existe : verrouiller la definition
  // d'un code que personne n'a jamais pose enfermerait le parent dehors de sa propre maison,
  // ce que le § 7.3 interdit en toutes lettres. En revanche la REDEFINITION passe par le
  // jeton, donc par `ouvrir`, donc par le verrou. Aucun trou : le chemin qui remplace un code
  // existant est exactement celui qui compte les echecs.

  app.post('/api/parent/definir', (requete, reponse) => {
    const corps = requete.body as { code?: unknown } | null;
    const code = typeof corps?.code === 'string' ? corps.code.trim() : '';
    const maintenant = String(horodatage(contexte.horloge));

    if (!MOTIF_CODE.test(code)) {
      // Aucun echec compte ici, et aucun code n'est pose : un parent qui se trompe de touche
      // en CHOISISSANT son code n'a rien a payer. Le compteur d'echecs garde `ouvrir`, ou il
      // protege quelque chose ; ici il ne protegerait rien.
      return reponse
        .code(400)
        .send(erreurApi(CODES_ERREUR.invalide, 'Le code parent compte exactement 4 chiffres.'));
    }

    const dejaDefini = codeEstDefini(contexte.base);
    const avecJeton = jetonDeLaRequete(requete);
    const jetonVivant =
      avecJeton !== null &&
      (jetons.get(avecJeton) ?? 0) > Date.parse(String(horodatage(contexte.horloge)));

    if (dejaDefini && !jetonVivant) {
      // 409 Conflict, jamais 200 et jamais un remplacement silencieux (§ 8). Le message dit
      // au parent ce qu'il PEUT faire — entrer avec son code — et non ce qui lui manque (C7).
      return reponse
        .code(409)
        .send(
          erreurApi(
            CODES_ERREUR.conflit,
            'Un code existe deja pour ce foyer. Entre-le pour ouvrir la zone parent, ' +
              'puis tu pourras en choisir un autre.'
          )
        );
    }

    const sel = selNeuf();
    ecrireCodeParent(
      contexte.base,
      sel,
      deriverCode(code, sel),
      maintenant,
      dejaDefini ? 'redefinition' : 'ecran-definition'
    );
    reinitialiserVerrou(contexte.base);
    return reponse.send(poserJeton(Date.parse(maintenant)));
  });

  // ────────────────────────────────────────────────────────── POST /api/parent/ouvrir

  app.post('/api/parent/ouvrir', (requete, reponse) => {
    const corps = requete.body as { code?: unknown } | null;
    const code = typeof corps?.code === 'string' ? corps.code.trim() : '';
    const maintenant = String(horodatage(contexte.horloge));

    const verrou = lireVerrou(contexte.base);
    if (estVerrouille(verrou, maintenant)) {
      return repondreVerrouille(reponse, verrou);
    }

    if (!MOTIF_CODE.test(code)) {
      // Un format invalide compte comme un echec : sinon un robot enumererait les 10 000 codes
      // en envoyant `code: 12345` entre deux essais pour ne jamais faire monter le compteur.
      const apres = appliquerEchec(verrou, maintenant);
      ecrireVerrou(contexte.base, apres);
      if (estVerrouille(apres, maintenant)) {
        // L'echec qui ferme le verrou l'annonce, quelle que soit sa nature : sinon le parent
        // lirait « 4 chiffres » et taperait un code juste dans le vide.
        return repondreVerrouille(reponse, apres);
      }
      return reponse
        .code(400)
        .send(erreurApi(CODES_ERREUR.invalide, 'Le code parent compte exactement 4 chiffres.'));
    }

    const stocke = lireCodeParent(contexte.base);

    if (stocke === null) {
      // CORRIGE N5 — la route NE POSE PLUS RIEN (contrat de finition v3 § 1.8 et § 8).
      //
      // 404 `introuvable`, et AUCUN echec compte : il n'y a rien a proteger tant qu'il n'y a
      // pas de code, et faire monter le compteur ici verrouillerait la porte avant meme
      // qu'elle existe. Le client traduit ce 404 en ecran de definition (`EcranDefinirCode`).
      return reponse
        .code(404)
        .send(
          erreurApi(
            CODES_ERREUR.introuvable,
            'Aucun code n’a encore ete choisi pour ce foyer. Choisis-en un.'
          )
        );
    }

    if (!verifierCode(code, stocke.sel, stocke.empreinte)) {
      const apres = appliquerEchec(verrou, maintenant);
      ecrireVerrou(contexte.base, apres);
      if (estVerrouille(apres, maintenant)) {
        return repondreVerrouille(reponse, apres);
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

  // ───────────────────────────────────── GET /api/parent/:profil/galerie — D34, lot N5
  //
  // Enregistree ICI et non dans `application.ts`, qui appartient a N2 pour cette campagne
  // (contrat de finition v3 § 4.2). `application.ts` porte lui-meme l'avertissement : « un lot
  // qui ecrit une route sans qu'elle soit branchee verrait son travail silencieusement
  // absent ». On garde donc un seul ecrivain par fichier ET une route qui existe, en la
  // branchant depuis le fichier de routes que N5 possede.
  //
  // `jetonValide` lui est passe tel quel : la galerie est protegee par le MEME garde que le
  // dashboard, sans qu'aucune seconde implantation ne puisse deriver de la premiere.
  enregistrerRoutesParentGalerie(app, contexte, jetonValide);
}
