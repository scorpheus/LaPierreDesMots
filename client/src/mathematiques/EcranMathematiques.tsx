import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { CodeStadeGobi, Profil, Compagnon } from '@pierre/partage';
import type { DemandeVoix } from '@pierre/partage';
import {
  CATALOGUE_MATHS, FETE_MATHS, proposerAideMaths, trameProjetMaths,
  estInstancePont, estInstanceJardin, estInstanceMoulin, estInstanceMarche, estInstanceChantier, estInstanceHorloge,
  type AideMaths, type ConsigneMaths, type EtatMaths, type GesteMaths,
  type InstanceVallee, type FamilleMaths, type LieuMaths, type ProjetMathsId, type NiveauMaths, type PortApiMaths, type RepriseMaths,
  type ResultatApiMaths, type TentativeMaths,
} from '@pierre/partage/mathematiques';
import { apiMathematiques, lireMonde, urlAsset } from '../api/client.js';
import { assetDeStadeGobi } from '../composants/Gobi.js';
import { useMagasin, useServices } from '../etat/services.js';
import { Bornes, Regle, Tablier } from './AteliersPonts.js';
import { AteliersJardin } from './lieux/AteliersJardin.js';
import { AteliersMoulin } from './lieux/AteliersMoulin.js';
import { AteliersMarche } from './lieux/AteliersMarche.js';
import { AteliersChantier } from './lieux/AteliersChantier.js';
import { AteliersHorloge } from './lieux/AteliersHorloge.js';
import { LieuxVallee, ChoixLieuVallee, Niveau, PontDurable } from './ChoixVallee.js';
import { DecorVallee } from './DecorVallee.js';
import { LIEUX_MATHS, lieuFamille, nomLieu, nomProjet, incompatibiliteProjet, premiersNiveaux } from './presentation.js';
import { nomCadeauMaths } from './collection.js';
import { descriptionGesteMaths } from './description-geste.js';
import { lireConseilParentMaths, effacerConseilParentMaths } from './conseil-parent.js';
import './styles-mathematiques.css';

export interface ProprietesEcranMathematiques {
  readonly profil: Profil;
  readonly surRetour: () => void;
  readonly surReprendreLecture: () => void;
  readonly apiMaths?: PortApiMaths;
  readonly chargerStade?: (profilId: Profil['id']) => Promise<CodeStadeGobi>;
}

type Vue = 'lieux' | 'ponts' | 'scene' | 'reussite';
type NiveauxLibres = Readonly<Record<FamilleMaths, NiveauMaths>>;
type NiveauxProjet = readonly [NiveauMaths, NiveauMaths, NiveauMaths];
type Reussite = { readonly tentative: TentativeMaths; readonly prochaine: RepriseMaths | null };

function cleStable(profilId: string, generation: number, revision: number, ordre: number, nom: string, instant: string): string {
  return `maths:${profilId}:${String(generation)}:${String(revision)}:${String(ordre)}:${nom}:${instant}`;
}

function titreEtape(reprise: RepriseMaths): string {
  return reprise.projet === null ? 'Activité libre' :
    `${nomProjet(reprise.projet.id)} · étape ${String(reprise.projet.etapeCourante + 1)} sur 3`;
}

async function chargerStadeDepuisMonde(profilId: Profil['id']): Promise<CodeStadeGobi> {
  return (await lireMonde(profilId)).gobi.stade;
}

function aideSuivante(aide: AideMaths, erreurs: number): 'indice' | 'demonstration' {
  return aide === 'aucune' && erreurs < 3 ? 'indice' : 'demonstration';
}

function demandesAudio(consigne: ConsigneMaths): readonly DemandeVoix[] {
  return consigne.segments.filter((segment) => /[\p{L}\p{N}]/u.test(segment.texte))
    .map((segment) => ({ texte: segment.texte, cle: segment.audio as DemandeVoix['cle'], locuteur: 'gobi' }));
}

export function EcranMathematiques({ profil, surRetour, surReprendreLecture, apiMaths = apiMathematiques,
  chargerStade = chargerStadeDepuisMonde }: ProprietesEcranMathematiques): ReactElement {
  const services = useServices();
  const magasin = useMagasin();
  const profilActif = magasin.getState().profil ?? profil;
  const profilId = String(profilActif.id);
  const [vue, fixerVue] = useState<Vue>('lieux');
  const [lieu, fixerLieu] = useState<LieuMaths>('ponts');
  const [projetChoisi, fixerProjetChoisi] = useState<ProjetMathsId>('MAT-PON-P01');
  const [etat, fixerEtat] = useState<EtatMaths | null>(null);
  const [reprise, fixerReprise] = useState<RepriseMaths | null>(null);
  const [reussite, fixerReussite] = useState<Reussite | null>(null);
  const [niveauxProjet, fixerNiveauxProjet] = useState<NiveauxProjet>(['decouverte', 'decouverte', 'decouverte']);
  const [niveauxLibres, fixerNiveauxLibres] = useState<NiveauxLibres>(() => Object.fromEntries(CATALOGUE_MATHS.map((f) => [f.id, 'decouverte'])) as NiveauxLibres);
  const [niveauEnCours, fixerNiveauEnCours] = useState<NiveauMaths | null>(null);
  const [chargement, fixerChargement] = useState(true);
  const [erreurChargement, fixerErreurChargement] = useState(false);
  const [attente, fixerAttente] = useState(false);
  const [message, fixerMessage] = useState<string | null>(null);
  const [retry, fixerRetry] = useState<(() => void) | null>(null);
  const [sortieDemandee, fixerSortieDemandee] = useState<(() => void) | null>(null);
  const [stade, fixerStade] = useState<CodeStadeGobi>('oeuf');
  const [compagnons, fixerCompagnons] = useState<readonly Compagnon[]>([]);
  const [compagnonChoisi, fixerCompagnonChoisi] = useState<string | null>(null);
  const [conseilMasque, masquerConseil] = useState(false);
  const [familleAVoir, fixerFamilleAVoir] = useState<FamilleMaths | null>(null);
  const ordre = useRef(0);
  const verrou = useRef(false);

  const rafraichirEtat = useCallback(async (ouvrirReprise = false): Promise<EtatMaths | null> => {
    try {
      const resultat = await apiMaths.lireEtat(profilId);
      if (!resultat.ok) throw new Error(resultat.erreur.code);
      fixerEtat(resultat.valeur);
      fixerNiveauxLibres(Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
        [famille.id, resultat.valeur.preferencesNiveaux[famille.id].niveau])) as NiveauxLibres);
      fixerErreurChargement(false);
      if (ouvrirReprise && resultat.valeur.reprise !== null) {
        const retrouvee = resultat.valeur.reprise;
        const lieuRepris = lieuFamille(retrouvee.instance.famille);
        fixerLieu(lieuRepris);
        const idProjet = retrouvee.projet?.id ?? `MAT-${LIEUX_MATHS.find((l) => l.id === lieuRepris)!.prefixe}-P01` as ProjetMathsId;
        fixerProjetChoisi(idProjet);
        fixerNiveauxProjet(retrouvee.projet ? retrouvee.projet.plan.map((e) => e.niveau) as unknown as NiveauxProjet : premiersNiveaux(idProjet));
        fixerReprise(retrouvee);
        fixerVue('scene');
      }
      return resultat.valeur;
    } catch {
      fixerErreurChargement(true);
      fixerMessage('Le carnet des nombres ne s’ouvre pas encore. Réessaie pour retrouver ta partie.');
      return null;
    } finally { fixerChargement(false); }
  }, [apiMaths, profilId]);

  useEffect(() => { void rafraichirEtat(true); }, [rafraichirEtat]);
  useEffect(() => {
    if (vue !== 'ponts' || familleAVoir === null) return;
    document.getElementById(`libre-${familleAVoir}`)?.scrollIntoView?.({ block: 'start' });
    fixerFamilleAVoir(null);
  }, [vue, familleAVoir]);
  useEffect(() => {
    let vivant = true;
    if (chargerStade === chargerStadeDepuisMonde) {
      void lireMonde(profilActif.id).then((monde) => { if (vivant) {
        fixerStade(monde.gobi.stade);
        fixerCompagnons(monde.compagnons.filter((c) => c.rallieLe !== null));
      } }).catch(() => undefined);
    } else void chargerStade(profilActif.id).then((lu) => { if (vivant) fixerStade(lu); }).catch(() => undefined);
    return () => { vivant = false; };
  }, [chargerStade, profilActif.id]);

  const soumettre = useCallback(async <T,>(nom: string, action: (cle: string) => Promise<ResultatApiMaths<T>>): Promise<void> => {
    if (verrou.current || etat === null || erreurChargement) return;
    const generation = etat.generationMaths;
    const cle = cleStable(profilId, generation, reprise?.revision ?? 0, ordre.current++, nom, services.horloge.maintenant());
    const faire = async (): Promise<void> => {
      verrou.current = true; fixerAttente(true); fixerMessage(null); fixerRetry(null);
      try {
        const resultat = await action(cle);
        if (resultat.ok) return;
        if (resultat.erreur.code === 'conflit') {
          const courant = await rafraichirEtat(false);
          if (nom.startsWith('niveau-')) {
            fixerMessage('Ce niveau a changé. Voici le choix sauvegardé.');
          } else if (courant?.reprise) {
            fixerReprise(courant.reprise); fixerVue('scene');
            fixerMessage('Le carnet a changé. Voici la dernière étape sauvegardée.');
          } else {
            fixerReprise(null); fixerVue('ponts');
            fixerMessage('Le carnet a changé. Choisis une activité dans la vallée.');
          }
        } else {
          fixerMessage('La sauvegarde attend encore. Réessaie quand tu veux.');
          fixerRetry(() => () => { void faire(); });
        }
      } catch {
        fixerMessage('La sauvegarde attend encore. Réessaie quand tu veux.');
        fixerRetry(() => () => { void faire(); });
      } finally { verrou.current = false; fixerAttente(false); }
    };
    await faire();
  }, [etat, erreurChargement, profilId, reprise?.revision, services.horloge, rafraichirEtat]);

  const ouvrir = useCallback((partie: RepriseMaths): void => {
    fixerNiveauEnCours(null);
    fixerLieu(lieuFamille(partie.instance.famille));
    if (partie.projet !== null) {
      fixerProjetChoisi(partie.projet.id);
      fixerNiveauxProjet(partie.projet.plan.map((e) => e.niveau) as unknown as NiveauxProjet);
    }
    fixerReprise(partie); fixerReussite(null); fixerVue('scene');
  }, []);

  const demarrerProjet = useCallback(() => {
    if (etat === null || incompatibiliteProjet(projetChoisi, niveauxProjet) !== null) return;
    const graine = services.alea.entier(0, 0x1_0000_0000);
    void soumettre('projet-p01', async (cle) => {
      const resultat = await apiMaths.creerProjet({ profilId, generationMaths: etat.generationMaths,
        cleGeste: cle, projetId: projetChoisi, niveaux: niveauxProjet, graine });
      if (resultat.ok) { ouvrir(resultat.valeur.reprise); void rafraichirEtat(false); }
      return resultat;
    });
  }, [apiMaths, etat, projetChoisi, niveauxProjet, ouvrir, profilId, rafraichirEtat, services.alea, soumettre]);

  const demarrerLibre = useCallback((famille: keyof NiveauxLibres) => {
    if (etat === null) return;
    const graine = services.alea.entier(0, 0x1_0000_0000);
    void soumettre(`libre-${famille}`, async (cle) => {
      const resultat = await apiMaths.creerPartie({ profilId, generationMaths: etat.generationMaths,
        cleGeste: cle, famille, niveau: niveauxLibres[famille], graine });
      if (resultat.ok) { ouvrir(resultat.valeur.reprise); void rafraichirEtat(false); }
      return resultat;
    });
  }, [apiMaths, etat, niveauxLibres, ouvrir, profilId, rafraichirEtat, services.alea, soumettre]);

  const choisirNiveauLibre = useCallback((famille: FamilleMaths, niveau: NiveauMaths) => {
    if (etat === null || niveau === etat.preferencesNiveaux[famille].niveau) return;
    void soumettre(`niveau-${famille}`, async (cle) => {
      const resultat = await apiMaths.choisirNiveau({ profilId, generationMaths: etat.generationMaths,
        famille, niveau, revisionAttendue: etat.preferencesNiveaux[famille].revision, cleGeste: cle });
      if (resultat.ok) await rafraichirEtat(false);
      return resultat;
    });
  }, [apiMaths, etat, profilId, rafraichirEtat, soumettre]);

  const changerNiveauPendantDefi = useCallback(() => {
    if (reprise === null || etat === null || niveauEnCours === null ||
        niveauEnCours === reprise.instance.niveau) return;
    const partie = reprise;
    const famille = partie.instance.famille;
    const niveau = niveauEnCours;
    const preference = etat.preferencesNiveaux[famille];
    const graine = services.alea.entier(0, 0x1_0000_0000);
    void soumettre(`changer-niveau-${famille}`, async (cle) => {
      if (preference.niveau !== niveau) {
        const choix = await apiMaths.choisirNiveau({ profilId, generationMaths: etat.generationMaths,
          famille, niveau, revisionAttendue: preference.revision, cleGeste: `${cle}:niveau` });
        if (!choix.ok) return choix;
      }
      const pause = await apiMaths.pause({ profilId, generationMaths: partie.generationMaths,
        instanceId: partie.instance.id, revisionAttendue: partie.revision, cleGeste: `${cle}:pause` });
      if (!pause.ok) return pause;
      const creation = await apiMaths.creerPartie({ profilId, generationMaths: etat.generationMaths,
        famille, niveau, graine, cleGeste: `${cle}:libre` });
      if (creation.ok) { ouvrir(creation.valeur.reprise); await rafraichirEtat(false); }
      return creation;
    });
  }, [apiMaths, etat, niveauEnCours, ouvrir, profilId, rafraichirEtat, reprise, services.alea, soumettre]);

  const sauverGeste = useCallback((geste: GesteMaths) => {
    if (reprise === null) return;
    void soumettre(`geste-${geste.type}`, async (cle) => {
      const resultat = await apiMaths.manipuler({ profilId, generationMaths: reprise.generationMaths,
        instanceId: reprise.instance.id, revisionAttendue: reprise.revision, cleGeste: cle, geste });
      if (resultat.ok) fixerReprise(resultat.valeur.reprise);
      return resultat;
    });
  }, [apiMaths, profilId, reprise, soumettre]);

  const quitterApresPause = useCallback((sortie: () => void) => {
    if (reprise === null) { sortie(); return; }
    void soumettre('pause', async (cle) => {
      const resultat = await apiMaths.pause({ profilId, generationMaths: reprise.generationMaths,
        instanceId: reprise.instance.id, revisionAttendue: reprise.revision, cleGeste: cle });
      if (resultat.ok) { fixerReprise(resultat.valeur.reprise); await rafraichirEtat(false); sortie(); }
      return resultat;
    });
  }, [apiMaths, profilId, rafraichirEtat, reprise, soumettre]);

  // Une sortie reste demandable pendant l’écriture. Elle emploie ensuite la
  // révision acquittée, sans abandonner le geste en cours ni perdre son résultat.
  const demanderSortie = useCallback((sortie: () => void) => {
    if (verrou.current) { fixerSortieDemandee(() => sortie); return; }
    fixerSortieDemandee(null);
    quitterApresPause(sortie);
  }, [quitterApresPause]);

  useEffect(() => {
    if (attente || sortieDemandee === null || retry !== null || erreurChargement) return;
    fixerSortieDemandee(null);
    quitterApresPause(sortieDemandee);
  }, [attente, sortieDemandee, retry, erreurChargement, quitterApresPause]);

  const retournerAuxPonts = useCallback(() => demanderSortie(() => {
    fixerReprise(null); fixerVue('ponts');
  }), [demanderSortie]);

  const reprendreProjet = useCallback(() => {
    const suspendu = etat?.projetSuspendu;
    if (suspendu === null || suspendu === undefined) return;
    void soumettre('reprendre-projet', async () => {
      const resultat = await apiMaths.lirePartie(profilId, suspendu.instance.id);
      if (resultat.ok) ouvrir(resultat.valeur);
      return resultat;
    });
  }, [apiMaths, etat?.projetSuspendu, ouvrir, profilId, soumettre]);

  const terminer = useCallback(() => {
    if (reprise === null) return;
    void soumettre('valider', async (cle) => {
      const resultat = await apiMaths.terminer({ profilId, generationMaths: reprise.generationMaths,
        instanceId: reprise.instance.id, revisionAttendue: reprise.revision, cleGeste: cle,
        reponse: { famille: reprise.instance.famille, valeur: reprise.etat } });
      if (resultat.ok) {
        if (resultat.valeur.validation.statut !== 'correcte') {
          fixerReprise(resultat.valeur.reprise);
          fixerMessage(resultat.valeur.validation.raison);
        } else if (resultat.valeur.tentative !== null) {
          fixerReussite({ tentative: resultat.valeur.tentative, prochaine: resultat.valeur.prochaineReprise });
          fixerReprise(resultat.valeur.prochaineReprise);
          await rafraichirEtat(false);
          fixerVue('reussite');
        }
      }
      return resultat;
    });
  }, [apiMaths, profilId, rafraichirEtat, reprise, soumettre]);

  const choisirProjet = (id: ProjetMathsId): void => {
    fixerProjetChoisi(id);
    fixerNiveauxProjet(etat === null ? premiersNiveaux(id) :
      trameProjetMaths(id).etapes.map((famille) => etat.preferencesNiveaux[famille].niveau) as unknown as NiveauxProjet);
  };
  const choisirLieu = (selection: LieuMaths): void => {
    fixerLieu(selection);
    choisirProjet(`MAT-${LIEUX_MATHS.find((l) => l.id === selection)!.prefixe}-P01` as ProjetMathsId);
    fixerVue('ponts');
  };
  const compagnon = compagnons.find((c) => c.code === compagnonChoisi) ?? null;
  const conseil = etat && !conseilMasque ? lireConseilParentMaths(profilId, etat.generationMaths) : null;
  if (chargement) return <main className="ecran-mathematiques" data-ecran="mathematiques" aria-busy="true">
    Ouverture du carnet des nombres…<button type="button" onClick={surRetour}>Retour</button></main>;
  if (erreurChargement || etat === null) return <main className="ecran-mathematiques" data-ecran="mathematiques">
    <h1>Le carnet des nombres attend</h1><p role="status">{message}</p>
    <button type="button" onClick={() => { fixerChargement(true); void rafraichirEtat(true); }}>Réessayer l’ouverture du carnet</button>
    <button type="button" onClick={surRetour}>Retour</button>
  </main>;

  return <main className="ecran-mathematiques" data-ecran="mathematiques" aria-busy={attente}>
    <header className="maths-entete">
      <button type="button" className="cible cible-secondaire" aria-label={vue === 'scene' ? 'Mettre la partie en pause' : 'Retour'} onClick={() => demanderSortie(surRetour)}>
        {vue === 'scene' ? 'Pause' : 'Retour'}
      </button>
      <div><p className="maths-surtitre">La vallée des nombres</p><h1>{vue === 'scene' && reprise !== null ? titreEtape(reprise) : vue === 'reussite' ? 'Une étape réussie !' : vue === 'ponts' ? nomLieu(lieu) : 'Choisis un lieu'}</h1></div>
      <button type="button" className="cible cible-secondaire" onClick={() => demanderSortie(surReprendreLecture)}>Reprendre la lecture</button>
    </header>
    {message !== null && <aside className="maths-message" role="status">{message}{retry !== null && <button type="button" onClick={retry}>Réessayer</button>}</aside>}
    {sortieDemandee !== null && <aside className="maths-message" role="status">
      Je garde ton geste, puis nous repartons.
      <button type="button" onClick={() => fixerSortieDemandee(null)}>Rester dans la vallée</button>
    </aside>}
    {(vue === 'lieux' || vue === 'ponts') && compagnons.length > 0 && <fieldset className="maths-compagnons">
      <legend>Avec qui pars-tu ?</legend><button type="button" aria-pressed={compagnon === null} onClick={() => fixerCompagnonChoisi(null)}>Gobi</button>
      {compagnons.map((c) => <button key={c.code} type="button" aria-pressed={c.code === compagnonChoisi} onClick={() => fixerCompagnonChoisi(c.code)}>
        <img src={urlAsset(String(c.asset))} alt="" />{c.libelle}
      </button>)}
    </fieldset>}
    {vue === 'lieux' && conseil && <aside className="maths-message" aria-label="Une idée pour toi">
      <h2>Une idée pour toi</h2><p>Ton parent te propose : {CATALOGUE_MATHS.find((f) => f.id === conseil.famille)!.titre}. Tu peux aussi choisir un autre jeu.</p>
      <button type="button" onClick={() => {
        choisirLieu(lieuFamille(conseil.famille)); fixerFamilleAVoir(conseil.famille);
      }}>Voir cette activité</button>
      <button type="button" onClick={() => {
        effacerConseilParentMaths(profilId, etat.generationMaths); masquerConseil(true);
      }}>Choisir moi-même</button>
    </aside>}
    {vue === 'lieux' && <LieuxVallee etat={etat} surLieu={choisirLieu}
      surFete={() => { choisirProjet(FETE_MATHS.id); fixerVue('ponts'); }} />}
    {vue === 'ponts' && <ChoixLieuVallee lieu={lieu} projetId={projetChoisi} surProjetChoisi={choisirProjet}
      niveauxProjet={niveauxProjet} surNiveauxProjet={fixerNiveauxProjet}
      niveauxLibres={niveauxLibres} surNiveauLibre={choisirNiveauLibre}
      surReprendreProjet={reprendreProjet} surLieux={() => fixerVue('lieux')}
      etat={etat} surProjet={demarrerProjet} surLibre={demarrerLibre} attente={attente} />}
    {vue === 'scene' && reprise !== null && <>
      <nav className="maths-navigation-scene"><button type="button" aria-label={lieu === 'ponts' ? 'Retour aux Ponts en gardant ma partie' : 'Retour au lieu en gardant ma partie'} onClick={retournerAuxPonts}>{lieu === 'ponts' ? 'Retour aux Ponts' : 'Retour au lieu'}</button>
        <button type="button" disabled={attente} onClick={() => fixerNiveauEnCours(reprise.instance.niveau)}>Changer de niveau</button></nav>
      {niveauEnCours !== null && <section aria-label="Changer de niveau" className="maths-changement-niveau">
        <Niveau famille={reprise.instance.famille} niveau={niveauEnCours} attente={attente}
          nom="Choisis ton nouveau niveau" surChoix={fixerNiveauEnCours} />
        {reprise.projet !== null && <p>Ton projet garde ce que tu as préparé. Tu le retrouveras ici. Un nouveau jeu libre commence au niveau choisi.</p>}
        <button type="button" disabled={attente || niveauEnCours === reprise.instance.niveau}
          onClick={changerNiveauPendantDefi}>Commencer un jeu libre à ce niveau</button>
        <button type="button" disabled={attente} onClick={() => fixerNiveauEnCours(null)}>Continuer ce défi</button>
      </section>}
      <ScenePonts key={reprise.instance.id} reprise={reprise} stade={stade} attente={attente}
        compagnon={compagnon} etat={etat}
        etapesTerminees={etat.projets.find((projet) => projet.projetId === (reprise.projet?.id ?? 'MAT-PON-P01'))?.etapesTerminees ?? 0}
        surGeste={sauverGeste} surValider={terminer} />
    </>}
    {vue === 'reussite' && reussite !== null && <ReussitePonts reussite={reussite} etat={etat}
      surSuivant={() => { if (reussite.prochaine !== null) ouvrir(reussite.prochaine); }}
      surPonts={() => { fixerReprise(null); fixerVue('ponts'); }} />}
  </main>;
}

function ScenePonts({ reprise, stade, compagnon, etat, etapesTerminees, attente, surGeste, surValider }: {
  readonly reprise: RepriseMaths; readonly stade: CodeStadeGobi; readonly etapesTerminees: number; readonly attente: boolean;
  readonly compagnon: Compagnon | null; readonly etat: EtatMaths;
  readonly surGeste: (geste: GesteMaths) => void; readonly surValider: () => void;
}): ReactElement {
  const services = useServices();
  const instance = reprise.instance as InstanceVallee;
  const lieu = lieuFamille(instance.famille);
  const codeLieu = LIEUX_MATHS.find((l) => l.id === lieu)!.prefixe;
  const termines = etat.projets.filter((p) => p.projetId.startsWith(`MAT-${codeLieu}-`) && p.termineLe !== null).length;
  useEffect(() => () => services.voix.taire(), [services.voix, instance.id]);
  const jouer = (demandes: readonly DemandeVoix[]): void => {
    if (services.voix.direSequence) void services.voix.direSequence(demandes);
    else void (async () => { for (const demande of demandes) await services.voix.dire(demande); })();
  };
  const demandesConsigne = demandesAudio(instance.consigne);
  const peutEcouter = demandesConsigne.length > 0 && demandesConsigne.every((demande) => services.voix.aUnClip(demande.cle ?? null));
  // Un seuil d’erreurs ne révèle jamais la réponse : seule une aide enregistrée l’affiche.
  const aide = proposerAideMaths(instance, reprise.aide, reprise.etat);
  const demandesAide = aide.consigne === null ? [] : demandesAudio(aide.consigne);
  const peutEcouterAide = demandesAide.length > 0 && demandesAide.every((demande) => services.voix.aUnClip(demande.cle ?? null));
  const proposition = descriptionGesteMaths(instance, aide.gestePropose);
  const contenu = instance.famille === 'MAT-PON-01'
    ? <Regle instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
    : instance.famille === 'MAT-PON-02'
      ? <Bornes instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : instance.famille === 'MAT-PON-03' ? <Tablier instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : estInstanceJardin(instance) ? <AteliersJardin instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : estInstanceMoulin(instance) ? <AteliersMoulin instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : estInstanceMarche(instance) ? <AteliersMarche instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : estInstanceChantier(instance) ? <AteliersChantier instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} />
      : estInstanceHorloge(instance) ? <AteliersHorloge instance={instance} etat={reprise.etat} attente={attente} surGeste={surGeste} /> : null;
  return <section className="scene-ponts" data-testid="scene-ponts" data-famille={instance.famille}>
    <DecorVallee lieu={lieu} projetsTermines={termines}>
      <img src={urlAsset(assetDeStadeGobi(stade))} alt={lieu === 'ponts' ? 'Gobi observe le pont' : 'Gobi t’accompagne'} />
      {compagnon && <img className="maths-compagnon-scene" src={urlAsset(String(compagnon.asset))} alt={`${compagnon.libelle} t’accompagne`} />}
      {lieu === 'ponts' && <PontDurable etapes={etapesTerminees} />}
    </DecorVallee>
    {compagnon && <p className="maths-replique-compagnon">{compagnon.libelle} : « {lieu === 'chantier' ? 'Bâtissons ce lieu ensemble !' : lieu === 'horloge' ? 'Je serai au rendez-vous !' : lieu === 'marche' ? 'Les voisins attendent notre panier !' : 'Je reste près de toi. À toi de jouer !'} »</p>}
    <div className="scene-ponts__consigne"><p>{instance.consigne.texte}</p>{peutEcouter
      ? <button type="button" onClick={() => jouer(demandesConsigne)}>Écouter la consigne</button>
      : <small data-audio-maths="attente">Audio en préparation</small>}</div>
    {contenu}
    <aside className="maths-gobi" data-testid="aide-maths" data-aide-proposee={aide.niveau}>
      <strong>Gobi</strong><p>{aide.consigne?.texte ?? (reprise.erreursValidees >= 3
        ? 'Je peux te montrer un geste si tu veux.' : 'Je peux te montrer une idée si tu veux.')}</p>
      {proposition && <p className="maths-proposition">{proposition}</p>}
      {peutEcouterAide && <button type="button"
        onClick={() => jouer(demandesAide)}>Réécouter l’aide de Gobi</button>}
      <button type="button" aria-label="Demander une idée à Gobi" disabled={attente}
        onClick={() => surGeste({ type: 'aide', niveau: aideSuivante(reprise.aide, reprise.erreursValidees) })}>
        {reprise.aide === 'aucune' && reprise.erreursValidees < 3 ? 'Voir une idée' : 'Voir un geste de Gobi'}
      </button>
    </aside>
    <div className="scene-ponts__actions"><button type="button" onClick={() => surGeste({ type: 'annuler' })}
      disabled={attente || reprise.etat.historique.length === 0}>Annuler mon dernier geste</button>
      <button type="button" className="cible cible-primaire" onClick={surValider} disabled={attente}>{estInstancePont(instance) ? 'Vérifier mon pont' : 'Vérifier'}</button>
    </div>
  </section>;
}

function ReussitePonts({ reussite, etat, surSuivant, surPonts }: {
  readonly reussite: Reussite; readonly etat: EtatMaths;
  readonly surSuivant: () => void; readonly surPonts: () => void;
}): ReactElement {
  const { tentative, prochaine } = reussite;
  const progression = etat.projets.find((projet) => projet.projetId === tentative.projetId);
  const cadeau = etat.recompenses.find((recompense) => recompense.projetId === tentative.projetId);
  const lieu = lieuFamille(tentative.famille);
  const codeLieu = LIEUX_MATHS.find((l) => l.id === lieu)!.prefixe;
  const fete = tentative.projetId === FETE_MATHS.id && prochaine === null;
  return <section className="maths-reussite" data-testid="reussite-maths">
    {tentative.projetId !== null && <DecorVallee lieu={lieu}
      projetsTermines={etat.projets.filter((p) => p.projetId.startsWith(`MAT-${codeLieu}-`) && p.termineLe !== null).length}>
      {lieu === 'ponts' && <PontDurable etapes={progression?.etapesTerminees ?? 0} />}
    </DecorVallee>}
    <p className="maths-reussite__etoiles" aria-label={`${String(tentative.etoiles)} étoiles`}>
      {'★'.repeat(tentative.etoiles)}{'☆'.repeat(3 - tentative.etoiles)}
    </p>
    <h2>{fete ? 'La vallée est en fête !' : lieu === 'ponts' ? 'Bravo, le pont tient !' : 'Bravo, tu as trouvé !'}</h2>
    <p>{fete ? 'Les six lieux sont prêts. Gobi et les amis peuvent se retrouver. Les jeux restent ouverts pour tes prochaines aventures.' : 'Gobi a vu ton chemin. Tu peux continuer ou revenir au lieu.'}</p>
    {progression?.termineLe && <p className="maths-transformation" data-transformation={progression.transformationId}>✦ {lieu === 'ponts' ? 'La passerelle reste ouverte.' : 'Ce projet reste accompli dans la vallée.'}</p>}
    {cadeau && <p className="maths-souvenir" data-cadeau={cadeau.cadeauId}>🎁 Ton souvenir : {nomCadeauMaths(cadeau.cadeauId)}.</p>}
    <div className="maths-reussite__actions">{prochaine !== null && <button type="button" className="cible cible-primaire" onClick={surSuivant}>{lieu === 'ponts' ? 'Continuer la traversée' : 'Continuer le projet'}</button>}
      <button type="button" onClick={surPonts}>{lieu === 'ponts' ? 'Retour aux Ponts' : 'Retour au lieu'}</button></div>
  </section>;
}
