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

import type { ProgressionNoeud, ReponseTentative } from '@pierre/partage';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import {
  enregistrerTentative,
  lireProgressionNoeud,
  profilExiste,
  validerTentative
} from '@pierre/partage/base';
import type { AlimentationPedagogique } from '@pierre/partage/base';
import { chargerParametresPedagogie } from '../referentiels/pedagogie.js';
import { chargerSeuilsCascade } from '../referentiels/recompenses.js';
import { chargerReferentielMonde } from '../referentiels/monde.js';

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

    const validation = await validerTentative(requete.body, competences[0] ?? '');
    if (!validation.ok) {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, validation.message));
    }

    const validee = validation.valeur;

    // Une activité libre peut réemployer un paquet de nœud pour son habillage et son moteur,
    // jamais pour devenir une tentative pédagogique par un appel direct ou un ancien lien.
    const noeud = await contexte.contenu.chargerNoeud(validee.noeud);
    if (noeud?.progression === false) {
      return reponse
        .code(422)
        .send(erreurApi(CODES_ERREUR.invalide, `Le nœud ${validee.noeud} est une activité libre non journalisée.`));
    }

    // La cle etrangere `tentatives.profil_id -> profils(id)` refuserait de toute facon
    // l'insertion ; on prefere un 404 explicite a une erreur de contrainte SQLite.
    if (!(await profilExiste(contexte.base, validee.profil))) {
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

    const resultat = await enregistrerTentative(
      contexte.base,
      validee,
      contexte.horloge,
      chargerSeuilsCascade(),
      chargerReferentielMonde(),
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
    const progression: ProgressionNoeud | null = await lireProgressionNoeud(
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
      progression,
      // Lot A1 (R31) : le gain de la cascade de D25 vient du serveur, calcule et enregistre
      // dans la meme transaction que la tentative — le client ne le recalcule plus.
      gainCascade: resultat.gainCascade
    };

    return reponse.code(resultat.deja ? 200 : 201).send(corps);
  });
}
