/**
 * Routes de contenu.
 *
 *   GET /api/contenu/noeuds/:id   -> PaquetNoeud (route JSON du contrat § 3.3)
 *   GET /api/contenu/assets/*     -> fichiers de `contenu/` (hors contrat de types)
 *
 * Le serveur REFUSE un contenu invalide au chargement (contrat § 11.3, ligne
 * « L-B -> L-C @pierre/partage/validation »). C'est la seule barriere entre un exercice mal forme
 * et l'ecran de l'enfant : un `id` de region mal orthographie doit produire une erreur lisible
 * ici, pas une region qui ne se colorie jamais devant lui.
 */

import { Buffer } from 'node:buffer';

import type { FastifyInstance } from 'fastify';

import type { Exercice, Noeud, PaquetNoeud } from '@pierre/partage';
import { validerBlocJeu, validerExercice } from '@pierre/partage/validation';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { typeMime } from '../statique.js';

interface ParametresIdentifiant {
  readonly id: string;
}

interface ParametresJoker {
  readonly '*': string;
}

/** Lit le champ `exercice` d'un noeud sans supposer sa forme exacte. */
function exerciceDuNoeud(noeud: Noeud): string | null {
  const brut = (noeud as unknown as { exercice?: unknown }).exercice;
  return typeof brut === 'string' && brut !== '' ? brut : null;
}

/** Lit `jeu.habillage` d'un exercice sans supposer sa forme exacte. */
function habillageDeLExercice(exercice: Exercice): string | null {
  const jeu = (exercice as unknown as { jeu?: { habillage?: unknown } }).jeu;
  const brut = jeu === undefined ? undefined : jeu.habillage;
  return typeof brut === 'string' && brut !== '' ? brut : null;
}

export function enregistrerRoutesContenu(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get<{ Params: ParametresIdentifiant }>(
    '/api/contenu/noeuds/:id',
    async (requete, reponse) => {
      const idNoeud = requete.params.id;

      const noeud = await contexte.contenu.chargerNoeud(idNoeud);
      if (noeud === null) {
        return reponse
          .code(404)
          .send(erreurApi(CODES_ERREUR.introuvable, `Noeud inconnu : ${idNoeud}`));
      }

      const idExercice = exerciceDuNoeud(noeud);
      if (idExercice === null) {
        return reponse
          .code(422)
          .send(
            erreurApi(CODES_ERREUR.invalide, `Le noeud ${idNoeud} ne designe aucun exercice.`)
          );
      }

      const exercice = await contexte.contenu.chargerExercice(idExercice);
      if (exercice === null) {
        return reponse
          .code(404)
          .send(
            erreurApi(
              CODES_ERREUR.introuvable,
              `Le noeud ${idNoeud} designe l'exercice ${idExercice}, qui est introuvable.`
            )
          );
      }

      const rapportEnveloppe = validerExercice(exercice);
      if (!rapportEnveloppe.valide) {
        return reponse
          .code(422)
          .send(
            erreurApi(
              CODES_ERREUR.invalide,
              `Exercice ${idExercice} invalide : ${decrireProblemes(rapportEnveloppe)}`
            )
          );
      }

      const idHabillage = habillageDeLExercice(exercice);
      if (idHabillage === null) {
        return reponse
          .code(422)
          .send(
            erreurApi(CODES_ERREUR.invalide, `L'exercice ${idExercice} ne declare aucun habillage.`)
          );
      }

      const habillage = await contexte.contenu.chargerHabillage(idHabillage);
      if (habillage === null) {
        return reponse
          .code(404)
          .send(
            erreurApi(CODES_ERREUR.introuvable, `Habillage inconnu : ${idHabillage}`)
          );
      }

      const rapportJeu = validerBlocJeu(exercice, habillage);
      if (!rapportJeu.valide) {
        return reponse
          .code(422)
          .send(
            erreurApi(
              CODES_ERREUR.invalide,
              `Bloc « jeu » de ${idExercice} invalide : ${decrireProblemes(rapportJeu)}`
            )
          );
      }

      const paquet: PaquetNoeud = { noeud, exercice, habillage };
      return reponse.send(paquet);
    }
  );

  // Fichiers de `contenu/` : SVG d'habillage, images, audios pre-rendus.
  // Ce n'est pas une route JSON — elle n'entre pas dans le contrat de types (contrat § 3.3).
  //
  // L'octet passe par le `DepotContenu` INJECTE, jamais par un chemin relu de l'environnement :
  // c'est ce qui permet a un test de servir des assets depuis un depot en memoire, et c'est la
  // meme frontiere que celle des noeuds. La garde de traversee vit dans l'implantation disque.
  app.get<{ Params: ParametresJoker }>('/api/contenu/assets/*', async (requete, reponse) => {
    const relatif = requete.params['*'];
    let decode: string;
    try {
      decode = decodeURIComponent(relatif);
    } catch {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, 'Chemin d’asset illisible.'));
    }

    const octets = await contexte.contenu.lireAsset(decode);
    if (octets === null) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Asset introuvable : ${decode}`));
    }

    return reponse.type(typeMime(decode)).send(Buffer.from(octets));
  });
}

function decrireProblemes(rapport: { readonly problemes: readonly { readonly chemin: string; readonly message: string }[] }): string {
  return rapport.problemes
    .slice(0, 5)
    .map((probleme) => `${probleme.chemin} ${probleme.message}`)
    .join(' ; ');
}
