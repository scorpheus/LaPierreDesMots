import type { FastifyInstance, FastifyReply } from 'fastify';
import { lireRepriseLecture, ecrireRepriseLecture, effacerRepriseLecture, ErreurRepriseLecture } from '@pierre/partage/base';
import { analyserInstantaneLecture } from '@pierre/partage/reprise-lecture';
import type { ContexteServeur } from '../configuration.js';

async function executer(reponse: FastifyReply, action: () => Promise<unknown>): Promise<FastifyReply> {
  try { return reponse.send(await action()); }
  catch (cause) {
    if (!(cause instanceof ErreurRepriseLecture)) throw cause;
    const statut = cause.code === 'profil-introuvable' ? 404 : cause.code === 'instantane-corrompu' ? 400 : 409;
    return reponse.code(statut).send({ code: cause.code, message: cause.message });
  }
}

export function enregistrerRoutesRepriseLecture(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get<{ Params: { id: string } }>('/api/profils/:id/reprise-lecture', async (requete, reponse) =>
    executer(reponse, async () => lireRepriseLecture(contexte.base, requete.params.id)));
  app.post<{ Params: { id: string }; Body: { instantane?: unknown; revisionAttendue?: unknown } }>('/api/profils/:id/reprise-lecture', async (requete, reponse) => {
    const { instantane, revisionAttendue } = requete.body ?? {};
    if (typeof instantane !== 'object' || instantane === null || !('profil' in instantane) || instantane.profil !== requete.params.id ||
      !(revisionAttendue === null || (typeof revisionAttendue === 'number' && Number.isSafeInteger(revisionAttendue) && revisionAttendue >= 0))) {
      return reponse.code(400).send({ code: 'requete-invalide', message: 'La reprise lecture est invalide.' });
    }
    try { analyserInstantaneLecture(instantane); }
    catch { return reponse.code(400).send({ code: 'requete-invalide', message: 'Le contenu de la reprise lecture est invalide.' }); }
    return executer(reponse, async () => ({ revision: await ecrireRepriseLecture(contexte.base, contexte.horloge, instantane, revisionAttendue) }));
  });
  app.post<{ Params: { id: string }; Body: { generationProgression?: unknown; revisionAttendue?: unknown } }>('/api/profils/:id/reprise-lecture/effacer', async (requete, reponse) => {
    const { generationProgression, revisionAttendue } = requete.body ?? {};
    if (typeof generationProgression !== 'number' || !Number.isSafeInteger(generationProgression) || generationProgression < 0 ||
      typeof revisionAttendue !== 'number' || !Number.isSafeInteger(revisionAttendue) || revisionAttendue < 0) {
      return reponse.code(400).send({ code: 'requete-invalide', message: 'La révision de reprise manque.' });
    }
    return executer(reponse, async () => {
      await effacerRepriseLecture(contexte.base, requete.params.id, generationProgression, revisionAttendue);
      return { ok: true };
    });
  });
}

