/**
 * Les deux routes « profil » de la zone parent — lot H2.
 *
 *   GET  /api/parent/:profil/etat            -> EtatProfil               (jeton obligatoire)
 *   POST /api/parent/:profil/reinitialiser   -> RapportReinitialisation  (jeton obligatoire)
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER REÇOIT `jetonValide` AU LIEU DE LE REFAIRE
 *
 * La carte des jetons vit dans la fermeture de `enregistrerRoutesParent`. Un second magasin de
 * jetons ici serait une seconde implantation de l'authentification parent : elle dériverait de
 * la première au premier changement, et rien ne le dirait. `routes/parent-galerie.ts` a
 * tranché ainsi avant nous — « la galerie est protégée par le MÊME garde que le dashboard,
 * sans qu'aucune seconde implantation ne puisse dériver de la première » — et il n'y a aucune
 * raison de trancher autrement pour une route qui EFFACE.
 *
 * Conséquence de forme : ce module est enregistré depuis `routes/parent.ts`, pas depuis
 * `application.ts`. Un seul écrivain par fichier, et une route qui existe réellement.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LES TROIS GARDES DE `reinitialiser`, ET AUCUNE N'EST DÉCORATIVE
 *
 * 1. **Le jeton parent.** La zone est déjà protégée par un code à quatre chiffres ; on ne
 *    fait pas moins ici que pour lire une courbe de latence.
 * 2. **La portée est explicite.** Aucune valeur par défaut : un corps sans `portee` est un
 *    400. Faire tomber une remise à zéro sur `complete` par défaut serait offrir la portée la
 *    plus destructrice à qui n'a rien demandé ; la faire tomber sur `progression` masquerait
 *    une demande mal formée derrière un demi-effacement.
 * 3. **Le prénom retapé.** C'est la garde qui NOMME le profil. Un tap distrait ne produit pas
 *    un prénom, et une requête égarée non plus. Elle est vérifiée ICI, au serveur, et pas
 *    seulement à l'écran : « la commande hors interface » et le navigateur passent par la
 *    même porte, et une garde qui n'existerait qu'en React ne garderait rien.
 *
 * Le 409 renvoyé quand le prénom ne correspond pas dit **ce que le parent peut faire** — le
 * prénom attendu est déjà sous ses yeux, la réponse ne le fuite donc pas davantage.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { EtatProfil, RapportReinitialisation } from '@pierre/partage/parent';
import {
  confirmationValide,
  estPorteeReinitialisation,
  pertesDeLaPortee
} from '@pierre/partage/parent';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { lireProfil } from '../depots/profils.js';
import { etatDuProfil } from '../services/etat-profil.js';
import {
  previsualiserReinitialisation,
  reinitialiserProfil,
  tablesNonVidees
} from '../services/reinitialisation-profil.js';

interface ParametresProfil {
  readonly profil: string;
}

/** Le garde de la zone parent, prêté par `routes/parent.ts`. */
export type GardeParent = (requete: FastifyRequest, reponse: FastifyReply) => boolean;

export function enregistrerRoutesParentProfil(
  app: FastifyInstance,
  contexte: ContexteServeur,
  jetonValide: GardeParent
): void {
  // ───────────────────────────────────── GET /api/parent/:profil/etat
  //
  // L'écran qui aurait rendu le défaut visible sans SQL. En LECTURE SEULE : il constate, il ne
  // répare pas (la réparation est le lot H1, par migration, une fois).

  app.get<{ Params: ParametresProfil }>('/api/parent/:profil/etat', (requete, reponse) => {
    if (!jetonValide(requete, reponse)) {
      return reponse;
    }

    // Aucune racine de contenu n'est passée : `ContexteServeur` n'en porte pas (il ne porte que
    // le `DepotContenu`), et `chargerReferentielMonde()` retombe sur `contenu/` du dépôt —
    // exactement ce que fait `routes/parent-galerie.ts` pour la même raison.
    const etat: EtatProfil | null = etatDuProfil(contexte.base, requete.params.profil);
    if (etat === null) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${requete.params.profil}`));
    }
    return reponse.send(etat);
  });

  // ──────────────────────────── POST /api/parent/:profil/reinitialiser
  //
  // Corps attendu : { portee: 'complete' | 'progression', confirmation: <prénom de l'enfant> }
  //
  // `apercu: true` rend ce qui SERAIT effacé sans rien effacer : c'est ce que l'écran de
  // confirmation affiche au parent avant qu'il ne tape le prénom. Il n'exige donc pas de
  // confirmation — il n'y a rien à confirmer pour compter.

  app.post<{ Params: ParametresProfil }>(
    '/api/parent/:profil/reinitialiser',
    (requete, reponse) => {
      if (!jetonValide(requete, reponse)) {
        return reponse;
      }

      const profilId = requete.params.profil;
      const profil = lireProfil(contexte.base, profilId);
      if (profil === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${profilId}`));
      }

      const corps = requete.body as
        | { portee?: unknown; confirmation?: unknown; apercu?: unknown }
        | null;

      if (!estPorteeReinitialisation(corps?.portee)) {
        return reponse
          .code(400)
          .send(
            erreurApi(
              CODES_ERREUR.invalide,
              'Choisis une portée : « complete » remet le profil à neuf, ' +
                '« progression » garde le prénom, l’avatar et les réglages de lecture.'
            )
          );
      }
      const portee = corps.portee;

      if (corps.apercu === true) {
        const lignes = previsualiserReinitialisation(contexte.base, profilId, portee);
        return reponse.send({
          profil: profilId,
          prenom: profil.prenom,
          portee,
          lignes,
          pertes: pertesDeLaPortee(portee)
        });
      }

      if (!confirmationValide(profil.prenom, corps.confirmation)) {
        // 409 et non 400 : la requête est bien formée, c'est l'ÉTAT de la confirmation qui ne
        // permet pas d'agir. Le message dit le geste attendu, pas la faute commise (C7).
        return reponse
          .code(409)
          .send(
            erreurApi(
              CODES_ERREUR.conflit,
              `Pour effacer, retape le prénom de l’enfant tel qu’il est affiché : ${profil.prenom}.`
            )
          );
      }

      const rapport: RapportReinitialisation = reinitialiserProfil(
        contexte.base,
        profilId,
        portee,
        contexte.horloge
      );

      // Le contrat de sortie de la route : on RELIT la base au lieu de croire le rapport qu'on
      // vient d'écrire. Un service qui s'auto-certifie ne certifie rien.
      const restes = tablesNonVidees(contexte.base, profilId, portee);
      if (restes.length > 0) {
        return reponse.code(500).send({
          ...erreurApi(
            CODES_ERREUR.interne,
            'La remise à zéro n’a pas tout effacé. Rien n’a été annoncé comme fait.'
          ),
          details: { restes }
        });
      }

      return reponse.send(rapport);
    }
  );
}
