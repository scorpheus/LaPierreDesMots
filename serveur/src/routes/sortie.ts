/**
 * `POST /api/profils/:id/sortie` — compose une sortie. Lot L2-D, v2 § 5.2.
 *
 * La composition elle-meme est PURE et vit dans `partage/src/pedagogie/selecteur.ts` ; cette
 * route ne fait que rassembler l'entree — maitrises, revisions dues, noeuds candidats — et
 * archiver le plan produit.
 *
 * Le plan est archive dans `sorties` parce qu'il est la seule trace de ce qui a ETE PROPOSE.
 * Sans lui, on saurait ce que l'enfant a joue et jamais ce qu'on lui avait offert : impossible
 * de dire, plus tard, si une sortie a ete abandonnee ou jamais proposee.
 *
 * `alea` est celui du contexte serveur (graine `ATELIER_GRAINE` en test) : deux compositions
 * avec la meme graine et la meme entree rendent le meme plan, ce qui rend `test:rejeu`
 * interpretable.
 *
 * Route ENREGISTREE par `serveur/src/application.ts` (L2-H) — inversion n° 3 du § 5.2.
 */

import { createHash } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import type {
  CodeCompagnon,
  CodeRegion,
  Competence,
  EntreeSelecteur,
  Exercice,
  NoeudCandidat,
  PlanSortie
} from '@pierre/partage';
import { ErreurPierre } from '@pierre/partage';
import { composerSortie } from '@pierre/partage/pedagogie';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { lireRevisionsDues } from '../depots/leitner.js';
import { chargerParametresPedagogie, lireMaitrises } from '../depots/maitrise.js';
import { profilExiste } from '../depots/profils.js';

const COMPAGNONS: readonly string[] = ['filou', 'bulle', 'roc', 'plume'];

interface ParametresProfil {
  readonly id: string;
}

/**
 * Le vivier de candidats : un noeud, son exercice, et ce que l'exercice declare.
 *
 * Un noeud dont l'exercice est introuvable est ECARTE, jamais complete par des valeurs neutres.
 * Une difficulte inventee a 1 ferait de ce noeud un echauffement plausible, et l'enfant
 * ouvrirait sa sortie sur un exercice dont personne ne sait ce qu'il vaut.
 */
function construireCandidats(
  noeuds: readonly { id: string; region: string; exercice: string; temps: string }[],
  exercices: readonly Exercice[]
): readonly NoeudCandidat[] {
  const parId = new Map<string, Exercice>(exercices.map((e) => [e.id, e]));
  const candidats: NoeudCandidat[] = [];
  for (const noeud of noeuds) {
    const exercice = parId.get(noeud.exercice);
    if (exercice === undefined) {
      continue;
    }
    candidats.push({
      noeud: noeud.id,
      habillage: exercice.jeu.habillage,
      region: noeud.region as CodeRegion,
      competences: exercice.competences,
      difficulte: exercice.difficulte,
      temps: noeud.temps as NoeudCandidat['temps']
    });
  }
  return candidats;
}

function archiver(
  contexte: ContexteServeur,
  profilId: string,
  plan: PlanSortie
): string {
  const id = `srt-${createHash('sha256')
    .update(`${profilId}|${plan.region}|${plan.composeeLe}`, 'utf8')
    .digest('hex')
    .slice(0, 16)}`;

  contexte.base
    .prepare(
      `INSERT INTO sorties (id, profil_id, region, compagnon, plan_json, composee_le, close_le)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT (id) DO UPDATE SET
         plan_json = excluded.plan_json,
         compagnon = excluded.compagnon`
    )
    .run(id, profilId, plan.region, plan.compagnon, JSON.stringify(plan), plan.composeeLe);

  return id;
}

export function enregistrerRoutesSortie(app: FastifyInstance, contexte: ContexteServeur): void {
  app.post('/api/profils/:id/sortie', async (requete, reponse) => {
    const { id } = requete.params as ParametresProfil;
    if (!profilExiste(contexte.base, id)) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Profil inconnu : ${id}`));
    }

    const corps = (requete.body ?? {}) as { region?: unknown; compagnon?: unknown };
    const region = typeof corps.region === 'string' ? corps.region.trim() : '';
    if (region === '') {
      return reponse
        .code(400)
        .send(erreurApi(CODES_ERREUR.invalide, 'Le champ « region » est obligatoire.'));
    }
    const compagnon = COMPAGNONS.includes(String(corps.compagnon))
      ? (String(corps.compagnon) as CodeCompagnon)
      : null;

    const [noeuds, exercices] = await Promise.all([
      contexte.contenu.listerNoeuds(),
      contexte.contenu.listerExercices()
    ]);
    const competences: readonly Competence[] =
      contexte.contenu.listerCompetences === undefined
        ? []
        : await contexte.contenu.listerCompetences();

    const parametres = chargerParametresPedagogie();
    const maintenant = contexte.horloge.maintenant();

    const entree: EntreeSelecteur = {
      profil: id,
      region: region as CodeRegion,
      compagnon,
      maitrises: lireMaitrises(contexte.base, id),
      revisionsDues: lireRevisionsDues(contexte.base, id, maintenant),
      noeudsDisponibles: construireCandidats(noeuds, exercices),
      competences,
      maintenant
    };

    let plan: PlanSortie;
    try {
      plan = composerSortie(entree, parametres, contexte.alea);
    } catch (erreur) {
      // `contenu-invalide` veut dire ici « le vivier ne permet pas de composer » : c'est un 409,
      // pas un 500. Le parent doit lire qu'il manque du contenu dans cette region, pas qu'un
      // defaut interne s'est produit.
      if (ErreurPierre.porteLeCode(erreur, 'contenu-invalide')) {
        return reponse
          .code(409)
          .send(erreurApi(CODES_ERREUR.conflit, (erreur as ErreurPierre).message));
      }
      throw erreur;
    }

    archiver(contexte, id, plan);
    return reponse.code(201).send(plan);
  });
}
