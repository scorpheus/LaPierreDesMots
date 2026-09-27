import { describe, expect, it, vi } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { creerAlea, creerHorlogeFigee, initialiserRegistreMoteurs,
  moteursEnregistres, obtenirMoteur } from '@pierre/partage';
import type { Exercice, Noeud, Profil } from '@pierre/partage';
import { contenuAttrape } from '../fixtures/moteurs/attrape.js';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, RACINE_DEPOT, habillageEcole, lireJson,
  servicesDeTest } from '../configuration/preparation.js';
import type { Habillage } from '@pierre/partage';
import { creerMagasin } from '@client/etat/magasin';
import type { DepotRepriseLecture } from '@client/etat/reprise-lecture-depot';
import { resumeEtapeDepuis } from '@partage/moteurs/commun/etapes';
import {
  adapterAncienneRepriseLecture,
  decoderEtatLecture,
  encoderEtatLecture,
  reprendreEtatLecture,
  verifierInstantaneLecture,
} from '@pierre/partage/reprise-lecture';

initialiserRegistreMoteurs();

describe('reprise durable lecture', () => {
  it('restaure les 14 moteurs avec le même état utile et le même geste suivant', () => {
    const cheminsExercices = readdirSync(join(RACINE_DEPOT, 'contenu/exercices'),
      { recursive: true, withFileTypes: true })
      .filter((entree) => entree.isFile() && entree.name.endsWith('.json'))
      .map((entree) => join(entree.parentPath, entree.name));
    const cheminsHabillages = readdirSync(join(RACINE_DEPOT, 'contenu/habillages'),
      { recursive: true, withFileTypes: true })
      .filter((entree) => entree.isFile() && entree.name.endsWith('.habillage.json'))
      .map((entree) => join(entree.parentPath, entree.name));
    const lireAbsolu = <T,>(chemin: string): T => lireJson<T>(relative(RACINE_DEPOT, chemin)
      .replaceAll('\\', '/'));
    const exercices = cheminsExercices.map((chemin) => lireAbsolu<Exercice>(chemin));
    const habillages = new Map(cheminsHabillages.map((chemin) => {
      const habillage = lireAbsolu<Habillage>(chemin);
      return [habillage.id, habillage] as const;
    }));
    expect(moteursEnregistres()).toHaveLength(14);
    for (const code of moteursEnregistres()) {
      const exercice = exercices.find((candidat) => candidat.jeu.moteur === code);
      expect(exercice, `exercice manquant pour ${code}`).toBeDefined();
      const habillage = habillages.get(exercice!.jeu.habillage);
      expect(habillage, `habillage manquant pour ${code}`).toBeDefined();
      const moteur = obtenirMoteur(code);
      const ancienTemps = creerHorlogeFigee('2026-09-26T10:00:00.000Z');
      const alea = creerAlea(17);
      let etat = moteur.creerEtat({ contenu: exercice!.jeu.contenu, habillage: habillage!,
        alea, horloge: ancienTemps });
      etat = moteur.reduire(etat, { type: 'demanderAide' }, { alea, horloge: ancienTemps });
      etat = moteur.reduire(etat, { type: 'ecouterConsigne' }, { alea, horloge: ancienTemps });
      const copie = decoderEtatLecture(encoderEtatLecture(etat));
      expect(copie, code).toEqual(etat);
      expect(moteur.progression(copie), code).toEqual(moteur.progression(etat));
      expect(moteur.aideProposee(copie), code).toEqual(moteur.aideProposee(etat));
      const futurTemps = creerHorlogeFigee('2026-09-26T11:00:00.000Z');
      const rebase = reprendreEtatLecture(copie, 3_600_000);
      expect(moteur.resume(rebase), `durées et erreurs ${code}`).toEqual(moteur.resume(etat));
      const suivantAvant = moteur.reduire(etat, { type: 'battementHorloge' },
        { alea: creerAlea(29), horloge: ancienTemps });
      const suivantApres = moteur.reduire(rebase, { type: 'battementHorloge' },
        { alea: creerAlea(29), horloge: futurTemps });
      expect(suivantApres, `geste suivant ${code}`).toEqual(
        reprendreEtatLecture(suivantAvant, 3_600_000));
    }
  });

  it('conserve les objets, erreurs et aide sans rejouer la création du moteur', () => {
    const horloge = creerHorlogeFigee('2026-09-26T10:00:00.000Z');
    const moteur = obtenirMoteur('attrape');
    const habillage = lireJson<Habillage>('contenu/habillages/clairiere/lucioles.habillage.json');
    const alea = creerAlea(17);
    let etat = moteur.creerEtat({ contenu: contenuAttrape, habillage, alea, horloge });
    etat = moteur.reduire(etat, { type: 'demanderAide' }, { alea, horloge });
    const avant = moteur.progression(etat);
    const texte = encoderEtatLecture(etat);
    const restitue = decoderEtatLecture(texte);
    expect(restitue).toEqual(etat);
    expect(moteur.progression(restitue)).toEqual(avant);
    expect(moteur.aideProposee(restitue)).toEqual(moteur.aideProposee(etat));
  });

  it('écarte une absence du temps actif et des seuils d’aide', () => {
    const etat = { demarreMs: 1_000, derniereActionMs: 1_200,
      etapes: [{ debutMs: 1_000, finMs: null, instantIndiceMs: 1_100, dureeMs: 200 }],
      dernierRefus: { instantMs: 1_150 }, finExpositionMs: 1_180 };
    expect(reprendreEtatLecture(etat, 5_000)).toEqual({
      demarreMs: 6_000, derniereActionMs: 6_200,
      etapes: [{ debutMs: 6_000, finMs: null, instantIndiceMs: 6_100, dureeMs: 200 }],
      dernierRefus: { instantMs: 6_150 }, finExpositionMs: 6_180,
    });
  });

  it('garde le zéro sentinelle des étapes non commencées', () => {
    const etat = { demarreMs: 1_790_416_800_000, etapes: [
      { debutMs: 1_790_416_800_000, derniereActionMs: 1_790_416_800_000 },
      { debutMs: 0, derniereActionMs: 1_790_416_800_000 },
    ] };
    const repris = reprendreEtatLecture(etat, 3_600_000);
    expect(repris.etapes[0]?.debutMs).toBe(1_790_420_400_000);
    expect(repris.etapes[1]?.debutMs).toBe(0);
    expect(repris.etapes[1]?.derniereActionMs).toBe(1_790_420_400_000);
  });

  it('ne compte jamais une étape vierge, puis conserve la durée après un vrai geste', () => {
    const vierge = { identifiant: 'c2', debutMs: 0, finMs: null,
      premiereActionMs: null, derniereActionMs: 1_790_416_800_000,
      nbErreurs: 0, aideDemandee: 'aucune', nbEcoutes: 0,
      modeReponse: 'choix', nbElements: null, confusion: null };
    expect(resumeEtapeDepuis(vierge as never, 1_790_416_800_000).dureeMs).toBe(0);
    expect(resumeEtapeDepuis(reprendreEtatLecture(vierge, 3_600_000) as never,
      1_790_420_400_000).dureeMs).toBe(0);
    const jouee = { ...vierge, debutMs: 1_790_416_800_000,
      finMs: 1_790_416_803_000, premiereActionMs: 1_790_416_801_000 };
    expect(resumeEtapeDepuis(jouee as never, jouee.finMs).dureeMs).toBe(3_000);
    const reprise = reprendreEtatLecture(jouee, 3_600_000);
    expect(resumeEtapeDepuis(reprise as never, reprise.finMs).dureeMs).toBe(3_000);
  });

  it('refuse les types que JSON perdrait silencieusement', () => {
    expect(() => encoderEtatLecture({ objet: new Map([['a', 1]]) })).toThrow();
    expect(() => encoderEtatLecture({ ensemble: new Set(['a']) })).toThrow();
    expect(() => encoderEtatLecture({ absent: undefined })).toThrow();
    expect(() => encoderEtatLecture({ infini: Infinity })).toThrow();
  });

  it('refuse une génération ou un moteur ancien sans changer la progression', () => {
    const instantane = { versionContrat: 1, profil: 'enfant', generationProgression: 3,
      revision: 5, sortie: null, rangSortie: null, paquet: {
        exercice: { jeu: { moteur: 'colorie' } }, noeud: { id: 'n' }, habillage: { id: 'h' },
      }, codeMoteur: 'colorie', versionMoteur: 1, graine: 17, etatMoteur: {},
      demarreLe: '2026-09-26T10:00:00.000Z', journalise: true, serie: 0,
      resume: null, etoiles: null, termineLe: null, tentativeEnvoyee: false,
      erreurConservation: null, suspenduLeMs: 1,
    } as never;
    expect(() => verifierInstantaneLecture(instantane, 'enfant' as never, 4, 1)).toThrow();
    expect(() => verifierInstantaneLecture(instantane, 'enfant' as never, 3, 2)).toThrow();
  });

  it('adapte les anciens états attrape et place sans perdre les acquis', () => {
    const base = { versionContrat: 1, profil: 'enfant', generationProgression: 0,
      revision: 2, sortie: null, rangSortie: null, graine: 17,
      demarreLe: '2026-09-26T10:00:00.000Z', journalise: true, serie: 1,
      resume: null, etoiles: null, termineLe: null, tentativeEnvoyee: false,
      erreurConservation: null, suspenduLeMs: 1 };
    const attrape = adapterAncienneRepriseLecture({ ...base, codeMoteur: 'attrape', versionMoteur: 1,
      etatMoteur: { cibles: [{ id: 'b' }, { id: 'a' }], acquis: { a: 'attrapee' } },
      paquet: { exercice: { id: 'x', version: 1, jeu: {
        moteur: 'attrape', habillage: 'h', noeud: 'n', contenu: {},
      } },
        noeud: { id: 'n' }, habillage: { id: 'h' } },
    } as never);
    expect(attrape.versionMoteur).toBe(2);
    expect((attrape.etatMoteur as { acquis: object }).acquis).toEqual({ a: 'attrapee' });
    expect((attrape.etatMoteur as { ordreAffichage: string[] }).ordreAffichage.sort()).toEqual(['a', 'b']);
    const place = adapterAncienneRepriseLecture({ ...base, codeMoteur: 'place', versionMoteur: 1,
      etatMoteur: { places: { soleil: 'ciel' } },
      paquet: { exercice: { id: 'x', version: 1, jeu: {
        moteur: 'place', habillage: 'h', noeud: 'n', contenu: {
        reserve: [{ id: 'soleil' }, { id: 'nuage' }],
      } } }, noeud: { id: 'n' }, habillage: { id: 'h' } },
    } as never);
    expect(place.versionMoteur).toBe(2);
    expect((place.etatMoteur as { places: object }).places).toEqual({ soleil: 'ciel' });
    expect((place.etatMoteur as { reserveMelangee: { id: string }[] }).reserveMelangee
      .map((element) => element.id).sort()).toEqual(['nuage', 'soleil']);
  });

  it('survit à une fermeture et reprend sans refaire un son ni une tentative', async () => {
    const retour = {
      depotCorrect: vi.fn(async () => undefined), depotRefuse: vi.fn(async () => undefined),
      palierFranchi: vi.fn(async () => undefined), reinitialiserSerie: vi.fn(),
      animationsDesactivees: true,
    };
    const profil = { id: 'profil-reprise', prenom: 'Alma', generationProgression: 0 } as Profil;
    let sauve: Awaited<ReturnType<DepotRepriseLecture['lire']>> = null;
    const depot: DepotRepriseLecture = {
      lire: async () => sauve,
      ecrire: async (instantane, attendue) => {
        expect(attendue).toBe(sauve?.revision ?? null);
        sauve = JSON.parse(encoderEtatLecture({ ...instantane, revision: (attendue ?? 0) + 1 }));
        return sauve!.revision;
      },
      effacer: async () => { sauve = null; },
    };
    const base = servicesDeTest();
    const horloge = creerHorlogeFigee('2026-09-26T10:00:00.000Z');
    const services = { ...base, alea: creerAlea(17), horloge, retour } as never;
    const ancien = creerMagasin(services, 17, null, vi.fn(), depot);
    ancien.getState().choisirProfil(profil);
    ancien.getState().demarrerNoeud({
      exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
      noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE), habillage: habillageEcole(),
    });
    ancien.getState().emettre({ type: 'demanderAide' });
    horloge.avancer({ secondes: 2 });
    await ancien.getState().suspendreLecture();
    const avant = ancien.getState();
    expect(sauve).not.toBeNull();

    const plusTard = creerHorlogeFigee('2026-09-26T11:00:02.000Z');
    const nouveau = creerMagasin({ ...services, horloge: plusTard }, 1, null, vi.fn(), depot);
    const instantaneSauve = sauve;
    await nouveau.getState().chargerProfilEtReprise(profil);
    expect(nouveau.getState().ecran).toBe('campement');
    expect(nouveau.getState().suspenduLeMs).toBe(avant.suspenduLeMs);
    expect(nouveau.getState().etatMoteur).toEqual(avant.etatMoteur);
    expect(nouveau.getState().paquet).toEqual(avant.paquet);
    expect(nouveau.getState().aide).toEqual(avant.aide);
    expect(sauve).toEqual(instantaneSauve);
    nouveau.getState().reprendreLecture();
    expect(nouveau.getState().progression).toEqual(avant.progression);
    expect(nouveau.getState().aide).toEqual(avant.aide);
    expect(nouveau.getState().ecran).toBe('noeud');
    expect(retour.depotCorrect).not.toHaveBeenCalled();
    expect(retour.depotRefuse).not.toHaveBeenCalled();
    expect(nouveau.getState().resume).toBeNull();
    expect(nouveau.getState().graine).toBe(17);
    await nouveau.getState().attendreEcrituresLecture();
    const repriseEnfant = sauve;
    nouveau.getState().demarrerNoeud({
      exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
      noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE), habillage: habillageEcole(),
    }, { journalise: false });
    await nouveau.getState().attendreEcrituresLecture();
    expect(sauve).toEqual(repriseEnfant);
  });

  it('attend SQLite avant de choisir le joueur et de résoudre un lien profond', async () => {
    const profil = { id: 'profil-attente', prenom: 'Alma', generationProgression: 0 } as Profil;
    let rendreLecture!: (valeur: null) => void;
    const lecture = new Promise<null>((resoudre) => { rendreLecture = resoudre; });
    const depot: DepotRepriseLecture = {
      lire: vi.fn(() => lecture), ecrire: vi.fn(async () => 1), effacer: vi.fn(async () => undefined),
    };
    const magasin = creerMagasin(servicesDeTest(), 1, null, vi.fn(), depot);
    const attente = magasin.getState().chargerProfilEtReprise(profil);
    expect(magasin.getState().hydratationRepriseLecture).toBe('en-cours');
    expect(magasin.getState().profil).toBeNull();
    expect(magasin.getState().ecran).toBe('chargement');
    rendreLecture(null);
    await attente;
    expect(magasin.getState().profil?.id).toBe(profil.id);
    expect(magasin.getState().hydratationRepriseLecture).toBe('terminee');
    expect(magasin.getState().ecran).toBe('campement');
  });

  it('garde la session en attente quand la lecture de reprise échoue', async () => {
    const profil = { id: 'profil-erreur-lecture', prenom: 'Alma', generationProgression: 0 } as Profil;
    const depot: DepotRepriseLecture = {
      lire: vi.fn(async () => { throw new Error('Lecture SQLite impossible'); }),
      ecrire: vi.fn(async () => 1), effacer: vi.fn(async () => undefined),
    };
    const magasin = creerMagasin(servicesDeTest(), 1, null, vi.fn(), depot);
    await expect(magasin.getState().chargerProfilEtReprise(profil)).rejects.toThrow('Lecture SQLite impossible');
    expect(magasin.getState().profil).toBeNull();
    expect(magasin.getState().ecran).toBe('chargement');
    expect(magasin.getState().hydratationRepriseLecture).toBe('echec');
  });

  it('garde le nœud précédent si sa suspension durable échoue avant une bascule', async () => {
    const ancien = { id: 'profil-ancien', prenom: 'Alma', generationProgression: 0 } as Profil;
    const suivant = { id: 'profil-suivant', prenom: 'Nino', generationProgression: 0 } as Profil;
    let echec = false;
    const depot: DepotRepriseLecture = {
      lire: vi.fn(async () => null),
      ecrire: vi.fn(async (_instantane, revision) => {
        if (echec) throw new Error('SQLite indisponible');
        return (revision ?? 0) + 1;
      }),
      effacer: vi.fn(async () => undefined),
    };
    const base = servicesDeTest();
    const magasin = creerMagasin({ ...base, retour: {
      depotCorrect: vi.fn(async () => undefined), depotRefuse: vi.fn(async () => undefined),
      palierFranchi: vi.fn(async () => undefined), reinitialiserSerie: vi.fn(),
      animationsDesactivees: true,
    } } as never, 1, null, vi.fn(), depot);
    magasin.getState().choisirProfil(ancien);
    magasin.getState().demarrerNoeud({
      exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
      noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE), habillage: habillageEcole(),
    });
    await magasin.getState().attendreEcrituresLecture();
    const etatAvant = magasin.getState().etatMoteur;
    echec = true;
    await expect(magasin.getState().chargerProfilEtReprise(suivant)).rejects.toThrow('SQLite indisponible');
    expect(magasin.getState().profil?.id).toBe(ancien.id);
    expect(magasin.getState().ecran).toBe('noeud');
    expect(magasin.getState().etatMoteur).toEqual(etatAvant);
    expect(magasin.getState().suspenduLeMs).toBeNull();
    expect(depot.lire).not.toHaveBeenCalled();
  });
});
