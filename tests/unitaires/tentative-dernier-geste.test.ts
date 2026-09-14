import { describe, expect, it, vi } from 'vitest';
import type { Exercice, Noeud, Profil, ReponseTentative, TentativeAEnregistrer } from '@pierre/partage';
import type { ContenuColorie } from '@partage/moteurs/colorie/types';
import { creerMagasin } from '@client/etat/magasin';
import { creerFileTentatives } from '@client/api/tentatives-en-attente';
import { calculerCleIdempotence } from '@client/api/commun';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, habillageEcole,
  lireJson, servicesDeTest } from '../configuration/preparation.js';

function stockageMemoire() {
  const donnees = new Map<string, string>();
  return { get length() { return donnees.size; }, key: (rang: number) => [...donnees.keys()][rang] ?? null,
    getItem: (cle: string) => donnees.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => { donnees.set(cle, valeur); },
    removeItem: (cle: string) => { donnees.delete(cle); } };
}
function ack(tentative: TentativeAEnregistrer): ReponseTentative {
  return { tentative: { ...tentative, id: 'tentative-test' as ReponseTentative['tentative']['id'], etoiles: 3 },
    deja: false, progression: { noeud: tentative.noeud, etoiles: 3, nbTentatives: 1, dernierLe: tentative.termineLe },
    gainCascade: { etat: { etoilesTotal: 1, etoilesDepuisIntermediaire: 1, intermediairesTotal: 0,
      intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
    paliersFranchis: [], recompenses: [], jauges: [] } };
}
function preparer(journalise = true, libre = false) {
  const reserve = stockageMemoire();
  const envoyer = vi.fn(async (tentative: TentativeAEnregistrer) => ack(tentative));
  const file = creerFileTentatives({ prefixe: 'dernier-geste:', stockage: () => reserve, envoyer });
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const services = { ...base, haptique, retour: creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined }) };
  const conserver = vi.fn(file.conserver);
  const magasin = creerMagasin(services, 17, null, conserver);
  const profil = { id: 'profil-dernier-geste', prenom: 'Alma', generationProgression: 0 } as Profil;
  magasin.getState().choisirProfil(profil);
  const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
  const noeud = lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE);
  magasin.getState().demarrerNoeud({ exercice, noeud: libre ? { ...noeud, progression: false } : noeud,
    habillage: habillageEcole() }, { journalise });
  const cibles = (exercice.jeu.contenu as ContenuColorie).consignes.flatMap((consigne) => consigne.cibles);
  const peindre = (rang: number) => {
    const cible = cibles[rang]!;
    magasin.getState().emettre({ type: 'choisirCouleur', couleur: cible.couleur });
    magasin.getState().emettre({ type: 'peindre', region: cible.region });
  };
  return { reserve, envoyer, file, conserver, magasin, profil, cibles, peindre };
}

describe('le dernier geste conserve son résultat avant de publier la réussite', () => {
  it('survit à un rechargement pendant le calcul SHA, avec le résumé réellement rendu par le moteur', async () => {
    const { reserve, envoyer, file, conserver, magasin, profil, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length - 1; rang += 1) peindre(rang);
    expect(magasin.getState().resume).toBeNull();
    expect(file.lirePreparations()).toEqual([]);
    expect(conserver).not.toHaveBeenCalled();
    let publication = false;
    const arreter = magasin.subscribe((etat) => {
      if (etat.ecran !== 'recompense') return;
      publication = true;
      // Le routeur reçoit CETTE notification : la copie doit déjà être durable ici.
      expect(file.lirePreparations()).toHaveLength(1);
      expect(file.lirePreparations()[0]?.resume).toEqual(etat.resume);
    });
    peindre(cibles.length - 1);
    arreter();
    expect(publication).toBe(true);
    expect(conserver).toHaveBeenCalledTimes(1);
    expect(envoyer).not.toHaveBeenCalled();
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(magasin.getState().dernierGain).toBeNull();
    const preparee = file.lirePreparations()[0]!;
    expect(preparee.resume.reussi).toBe(true);
    expect(preparee.resume.nbErreurs).toBe(0);

    let resoudreCle!: (cle: string) => void;
    const calcul = vi.fn(() => new Promise<string>((resolution) => { resoudreCle = resolution; }));
    const rechargee = creerFileTentatives({ prefixe: 'dernier-geste:', stockage: () => reserve,
      envoyer, calculerCle: calcul });
    const reprise = rechargee.reprendre(profil);
    expect(calcul).toHaveBeenCalledWith(profil.id, preparee.noeud, preparee.demarreLe, preparee.graine);
    expect(envoyer).not.toHaveBeenCalled();
    expect(rechargee.lirePreparations()).toEqual([preparee]);
    const cleReelle = await calculerCleIdempotence(String(profil.id), String(preparee.noeud),
      preparee.demarreLe, preparee.graine);
    resoudreCle(cleReelle);
    expect(await reprise).toBe(1);
    expect(envoyer).toHaveBeenCalledTimes(1);
    expect(envoyer).toHaveBeenCalledWith({ ...preparee, cleIdempotence: cleReelle });
    expect(rechargee.lirePreparations()).toEqual([]);
    expect(rechargee.lire()).toEqual([]);
    // La récupération confirme le journal ; elle ne touche pas la cascade du magasin.
    expect(magasin.getState().dernierGain).toBeNull();
    expect(magasin.getState().cascade.etoilesTotal).toBe(0);
  });

  it('un double dernier tap ne prépare qu’un résultat', () => {
    const { conserver, file, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    peindre(cibles.length - 1);
    expect(conserver).toHaveBeenCalledTimes(1);
    expect(file.lirePreparations()).toHaveLength(1);
  });

  it.each([[false, false], [true, true]])('ne prépare rien en visite ou activité libre (%s, %s)', (journalise, libre) => {
    const { magasin, conserver, file, cibles, peindre } = preparer(journalise, libre);
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    expect(magasin.getState().resume?.reussi).toBe(true);
    expect(conserver).not.toHaveBeenCalled();
    expect(file.lirePreparations()).toEqual([]);
  });

  it('rend une panne de conservation réessayable sans déclarer le résultat sauvegardé', () => {
    const { reserve, magasin, file, envoyer, cibles, peindre } = preparer();
    vi.spyOn(reserve, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    expect(magasin.getState().resume?.reussi).toBe(true);
    expect(magasin.getState().erreurConservation).toContain('Réessaie');
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(magasin.getState().dernierGain).toBeNull();
    expect(file.lirePreparations()).toEqual([]);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('refuse de substituer un autre résumé à la préparation conservée', async () => {
    const { file, envoyer, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    const preparee = file.lirePreparations()[0]!;
    await expect(file.enregistrer({ ...preparee, cleIdempotence: 'cle-test',
      resume: { ...preparee.resume, nbErreurs: 9 } })).rejects.toThrow('conservée');
    expect(envoyer).not.toHaveBeenCalled();
    expect(file.lirePreparations()).toEqual([preparee]);
  });

  it('ne calcule et ne rejoue rien pour une préparation antérieure à la remise à zéro', async () => {
    const { reserve, file, envoyer, profil, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    const calcul = vi.fn(calculerCleIdempotence);
    const rechargee = creerFileTentatives({ prefixe: 'dernier-geste:', stockage: () => reserve,
      envoyer, calculerCle: calcul });
    expect(await rechargee.reprendre({ ...profil, generationProgression: 1 })).toBe(0);
    expect(calcul).not.toHaveBeenCalled();
    expect(envoyer).not.toHaveBeenCalled();
    expect(file.lirePreparations()).toEqual([]);
    expect(file.lire()).toEqual([]);
  });

  it('un import réussi pendant le calcul empêche le départ de l’ancienne préparation', async () => {
    const { reserve, envoyer, profil, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    let resoudreCle!: (cle: string) => void;
    const rechargee = creerFileTentatives({ prefixe: 'dernier-geste:', stockage: () => reserve,
      envoyer, calculerCle: () => new Promise<string>((resolution) => { resoudreCle = resolution; }) });
    const reprise = rechargee.reprendre(profil);
    expect(rechargee.lirePreparations()).toHaveLength(1);
    await rechargee.remplacerDonnees(async () => 'base-restauree');
    resoudreCle('cle-apres-import');
    expect(await reprise).toBe(0);
    expect(envoyer).not.toHaveBeenCalled();
    expect(rechargee.lirePreparations()).toEqual([]);
    expect(rechargee.lire()).toEqual([]);
  });

  it('l’ACK ne retire que la préparation de la génération effectivement envoyée', async () => {
    const { reserve, file, cibles, peindre } = preparer();
    for (let rang = 0; rang < cibles.length; rang += 1) peindre(rang);
    const preparee = file.lirePreparations()[0]!;
    const suivante = { ...preparee, generationProgression: 1 };
    let accuser!: (reponse: ReponseTentative) => void;
    const envoi = creerFileTentatives({ prefixe: 'dernier-geste:', stockage: () => reserve,
      envoyer: () => new Promise<ReponseTentative>((resolution) => { accuser = resolution; }) });
    const charge = { ...preparee, cleIdempotence: 'cle-generation-0' };
    const operation = envoi.enregistrer(charge);
    await Promise.resolve();
    file.conserver(suivante);
    accuser(ack(charge));
    await operation;
    expect(file.lire()).toEqual([]);
    expect(file.lirePreparations()).toEqual([suivante]);
  });
});
