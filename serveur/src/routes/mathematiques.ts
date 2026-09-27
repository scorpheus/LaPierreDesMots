import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ContexteServeur } from '../configuration.js';
import { creerApiMathematiques } from '@pierre/partage/base';
import { STATUT_HTTP_MATHS, estGesteMaths, estProjetMaths } from '@pierre/partage/mathematiques';
import type { CreerPartieMaths, CreerProjetMaths, EcrirePreferenceNiveauMaths, EcritureMaths, ManipulerPartieMaths, ResultatApiMaths, TerminerPartieMaths } from '@pierre/partage/mathematiques';

function objet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}
const chaine = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur.length > 0 && valeur.length <= 200;
const entier = (valeur: unknown): valeur is number => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur >= 0;
const niveau = (valeur: unknown): boolean => typeof valeur === 'string' &&
  ['decouverte', 'exploration', 'defi'].includes(valeur);
function enveloppe(valeur: unknown): valeur is Record<string, unknown> {
  return objet(valeur) && chaine(valeur['profilId']) && entier(valeur['generationMaths']) && chaine(valeur['cleGeste']);
}
function creation(valeur: unknown): valeur is CreerPartieMaths {
  return enveloppe(valeur) && typeof valeur['famille'] === 'string' &&
    /^MAT-(JAR|PON|MOU|MAR|CHA|HOR)-0[123]$/u.test(valeur['famille']) &&
    niveau(valeur['niveau']) && entier(valeur['graine']) && valeur['projetId'] === undefined;
}
function projet(valeur: unknown): valeur is CreerProjetMaths {
  return enveloppe(valeur) && estProjetMaths(valeur['projetId']) && entier(valeur['graine']) &&
    Array.isArray(valeur['niveaux']) && valeur['niveaux'].length === 3 && valeur['niveaux'].every(niveau);
}
function ecriture(valeur: unknown): valeur is EcritureMaths {
  return enveloppe(valeur) && chaine(valeur['instanceId']) && entier(valeur['revisionAttendue']);
}
function choixNiveau(valeur: unknown): valeur is EcrirePreferenceNiveauMaths {
  return enveloppe(valeur) && typeof valeur['famille'] === 'string' &&
    /^MAT-(JAR|PON|MOU|MAR|CHA|HOR)-0[123]$/u.test(valeur['famille']) &&
    niveau(valeur['niveau']) && entier(valeur['revisionAttendue']);
}
function envoyer<T>(reponse: FastifyReply, resultat: ResultatApiMaths<T>): FastifyReply {
  if (resultat.ok) return reponse.code(200).send(resultat);
  return reponse.code(STATUT_HTTP_MATHS[resultat.erreur.code]).send(resultat);
}
function invalide(reponse: FastifyReply): FastifyReply {
  return envoyer(reponse, { ok: false, erreur: { code: 'requete-invalide', message: 'La demande de partie est incomplète ou invalide.' } });
}

export function enregistrerRoutesMathematiques(app: FastifyInstance, contexte: ContexteServeur): void {
  const api = creerApiMathematiques(async () => contexte.base, contexte.horloge);
  app.get<{ Querystring: { profilId?: string } }>('/api/mathematiques/etat', async (requete, reponse) =>
    chaine(requete.query.profilId) ? envoyer(reponse, await api.lireEtat(requete.query.profilId)) : invalide(reponse));
  app.put('/api/mathematiques/niveaux', async (requete, reponse) =>
    choixNiveau(requete.body) ? envoyer(reponse, await api.choisirNiveau(requete.body)) : invalide(reponse));
  app.get<{ Params: { id: string }; Querystring: { profilId?: string } }>('/api/mathematiques/parties/:id', async (requete, reponse) =>
    chaine(requete.query.profilId) ? envoyer(reponse, await api.lirePartie(requete.query.profilId, requete.params.id)) : invalide(reponse));
  app.post('/api/mathematiques/parties', async (requete, reponse) =>
    creation(requete.body) ? envoyer(reponse, await api.creerPartie(requete.body)) : invalide(reponse));
  app.post('/api/mathematiques/projets', async (requete, reponse) =>
    projet(requete.body) ? envoyer(reponse, await api.creerProjet(requete.body)) : invalide(reponse));
  app.post<{ Params: { id: string } }>('/api/mathematiques/parties/:id/actions', async (requete, reponse) => {
    const corps = requete.body;
    if (!ecriture(corps) || corps.instanceId !== requete.params.id || !objet(corps) || !estGesteMaths(corps['geste'])) return invalide(reponse);
    return envoyer(reponse, await api.manipuler(corps as unknown as ManipulerPartieMaths));
  });
  app.post<{ Params: { id: string } }>('/api/mathematiques/parties/:id/pause', async (requete, reponse) =>
    ecriture(requete.body) && requete.body.instanceId === requete.params.id ? envoyer(reponse, await api.pause(requete.body)) : invalide(reponse));
  app.post<{ Params: { id: string } }>('/api/mathematiques/parties/:id/terminer', async (requete, reponse) => {
    const corps = requete.body;
    if (!ecriture(corps) || corps.instanceId !== requete.params.id || !objet(corps) || !objet(corps['reponse']) || !chaine(corps['reponse']['famille'])) return invalide(reponse);
    return envoyer(reponse, await api.terminer(corps as unknown as TerminerPartieMaths));
  });
}

export function enregistrerRoutesParentMathematiques(app: FastifyInstance, contexte: ContexteServeur,
  autoriser: (requete: FastifyRequest, reponse: FastifyReply) => boolean): void {
  const api = creerApiMathematiques(async () => contexte.base, contexte.horloge);
  app.get<{ Params: { profil: string } }>('/api/parent/:profil/mathematiques', async (requete, reponse) => {
    if (!autoriser(requete, reponse)) return;
    return envoyer(reponse, await api.lireBilanParent(requete.params.profil));
  });
}
