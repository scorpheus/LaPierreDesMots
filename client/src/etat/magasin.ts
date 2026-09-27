// Magasin de la session de jeu — contrat technique v1 § 1.4 et § 11.2 (`creerMagasin`).
//
// Magasin Zustand VANILLA, pas un hook : `window.__test` doit pouvoir le piloter hors de tout
// composant React (§ 7.1, `repondre()` et `etat()` sont synchrones et sans rendu). Les
// composants s'y branchent par `useEtatJeu` (`etat/services.ts`).
//
// UN SEUL ÉCRIVAIN DE L'ÉCRAN COURANT : `EtatMagasin.ecran`. Le routeur en est le miroir,
// jamais la source — sans quoi `window.__test.etat().ecran` pourrait mentir.
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { calculerEtoiles, obtenirMoteur } from '@pierre/partage';
import { LANCEMENT_ENFANT } from '@pierre/partage/parent';
import type { OptionsLancement } from '@pierre/partage/parent';
import type {
  AideProposee,
  CodeEcran,
  CodeMoteur,
  EtatCascade,
  GainCascade,
  MoteurQuelconque,
  NombreEtoiles,
  Profil,
  ProgressionMoteur,
  ResumeTentative,
  SeuilsCascade
} from '@pierre/partage';
import type { PlanSortie } from '@pierre/partage/pedagogie';
import {
  adapterAncienneRepriseLecture,
  encoderEtatLecture,
  reprendreEtatLecture,
  verifierInstantaneLecture,
  VERSION_REPRISE_LECTURE
} from '@pierre/partage/reprise-lecture';
import type { InstantaneRepriseLecture } from '@pierre/partage/reprise-lecture';
import { ETAT_CASCADE_VIDE } from '@pierre/partage/recompenses';
import type { PaquetNoeudAttendu } from '../api/client.js';
import { conserverTentativeTerminee } from '../api/client.js';
import type { TentativeSansCle } from '../api/tentatives-en-attente.js';
import { memoriserProfil, oublierProfil } from './profil-memorise.js';
import type { ServicesJeu } from '../moteurs/types.js';
import { maintenantIso } from './services.js';
import type { DepotRepriseLecture } from './reprise-lecture-depot.js';

/**
 * Le refus du dernier geste, s'il y en a un.
 *
 * ⚠ DÉFAUT DU CONTRAT GELÉ, signalé au rapport de L2-A. `Moteur` (contrat technique v1 § 4.1)
 * publie `progression()`, `aideProposee()` et `resume()` — mais **aucun signal générique
 * « le dernier geste a été refusé »**. L'hôte ne peut donc pas jouer le retour de refus sans
 * regarder l'état interne du moteur, ce qui est exactement ce que la coquille générique
 * s'interdit ailleurs.
 *
 * La lecture ci-dessous est défensive et sans exception : elle cherche un champ `dernierRefus`,
 * convention que `colorie` suit déjà (contrat § 5.8, `RefusColorie`) et que les schémas de
 * `place` et `trace` reprennent. Un moteur qui ne l'expose pas ne déclenche simplement aucun
 * retour de refus — jamais une erreur, jamais un faux positif. Le jour où `ProgressionMoteur`
 * gagne un champ `dernierGesteRefuse`, ces douze lignes disparaissent.
 */
function refusCourant(etat: unknown): unknown {
  if (typeof etat !== 'object' || etat === null) {
    return null;
  }
  const champ = (etat as Record<string, unknown>)['dernierRefus'];
  return champ ?? null;
}

export interface EtatMagasin {
  readonly ecran: CodeEcran;
  readonly profil: Profil | null;
  /** Plan pédagogique courant : 4 à 6 étapes composées par le serveur, jamais une région entière. */
  readonly sortie: PlanSortie | null;

  readonly paquet: PaquetNoeudAttendu | null;
  readonly moteur: MoteurQuelconque | null;
  readonly codeMoteur: CodeMoteur | null;
  /** État interne du moteur monté, opaque au reste du client. `EtatColorie` en v1. */
  readonly etatMoteur: unknown;
  readonly progression: ProgressionMoteur | null;
  readonly aide: AideProposee | null;

  readonly resume: ResumeTentative | null;
  readonly etoiles: NombreEtoiles | null;
  readonly demarreLe: string | null;
  readonly termineLe: string | null;
  readonly tentativeEnvoyee: boolean;
  /** Échec de la copie synchrone : le résultat reste en mémoire et sa sauvegarde est réessayable. */
  readonly erreurConservation: string | null;
  readonly erreurRepriseLecture: string | null;
  /** Barrière du routeur : un lien profond attend la lecture SQLite du profil. */
  readonly hydratationRepriseLecture: 'en-attente' | 'en-cours' | 'terminee' | 'echec';
  readonly suspenduLeMs: number | null;
  /**
   * Cette partie compte-t-elle dans le journal de l'enfant ? — R30.
   *
   * Faux quand le parent lance un exercice depuis sa galerie : « il faut que le parent puisse
   * essayer un exercice sans que ça compte », et `tentatives` fait foi pour toute la
   * pédagogie. Une partie du parent qui s'y inscrirait fausserait le BKT, le Leitner et le
   * sélecteur — sur la seule base d'un adulte qui voulait voir à quoi ça ressemble.
   *
   * **Le drapeau vit ICI, dans l'état, et pas dans une variable de l'écran de lancement.**
   * `LANCEMENT_PARENT` le disait déjà en commentaire : « un drapeau qui ne vit que dans une
   * variable JavaScript est un drapeau qu'aucun test de bout en bout ne peut constater ».
   * Porté par le magasin, il se lit sur `data-journalise` et une recette peut l'exiger.
   */
  readonly journalise: boolean;
  /** Un essai lancé depuis la galerie parent ne remplace pas la reprise de l'enfant. */
  readonly reprisePersistable: boolean;

  readonly graine: number;
  readonly animationsDesactivees: boolean;

  // ────────────────────────────────────────────────── la cascade de récompenses (D25, L2-A)
  /** Les seuils lus en données (C2). `null` tant qu'ils ne sont pas chargés. */
  readonly seuils: SeuilsCascade | null;
  /** L'état de la cascade pour la session. Aucun compteur n'y décroît jamais (R14). */
  readonly cascade: EtatCascade;
  /** Le gain du DERNIER nœud clos : paliers franchis, récompenses, et les trois jauges. */
  readonly dernierGain: GainCascade | null;
  /** Longueur de la série de bonnes réponses en cours. Porté par `data-serie`. */
  readonly serie: number;
  /**
   * Point du dernier appui, en coordonnées CSS. C'est l'ORIGINE de la gerbe de particules :
   * « des particules qui bougent quand c'est bon » (D26) n'a de sens que si elles partent de
   * là où le doigt a touché. Le magasin est le seul à voir *et* le geste *et* son résultat.
   */
  readonly dernierAppui: readonly [number, number];

  naviguer(ecran: CodeEcran): void;
  choisirProfil(profil: Profil): void;
  /** Attend la sauvegarde du profil précédent puis restaure le nouveau depuis SQLite. */
  chargerProfilEtReprise(profil: Profil): Promise<void>;
  quitterProfil(): void;
  demarrerSortie(sortie: PlanSortie): void;
  cloreSortie(): void;
  /**
   * Ouvre un nœud. `options.journalise` vaut `true` par défaut : c'est l'enfant qui joue, et
   * un défaut qui n'enregistrerait rien serait la pire des valeurs par défaut possibles.
   */
  demarrerNoeud(paquet: PaquetNoeudAttendu, options?: OptionsLancement): void;
  emettre(action: unknown): void;
  rejouer(): void;
  fixerGraine(graine: number): void;
  sauterAnimations(): void;
  marquerTentativeEnvoyee(): void;
  /** Pose les seuils chargés au démarrage. Appelé une fois, par `Application`. */
  fixerSeuils(seuils: SeuilsCascade): void;
  /** Mémorise le point du dernier appui. Appelé par `EcranNoeud` sur `pointerdown`. */
  marquerAppui(x: number, y: number): void;
  /**
   * Pose le gain de cascade RENDU PAR LE SERVEUR — lot A1 (R31).
   *
   * Le client ne calcule plus la cascade lui-même : `POST /api/tentatives` la calcule, l'ENREGISTRE
   * et la rend dans sa réponse (contrat § 3.4, `ReponseTentative.gainCascade`). Appelé par
   * `EcranRecompense` une fois la réponse revenue ; les sons de palier partent d'ici, au même
   * endroit qu'avant (D26), parce que c'est le seul endroit qui voit à la fois le geste et son
   * résultat.
   */
  appliquerGainCascade(gain: GainCascade): void;
  /** Recharge les compteurs persistants sans annoncer de nouveau gain. */
  hydraterCascade(profilId: string, cascade: EtatCascade): void;
  /** Recharge sans appeler `creerEtat`, `reduire`, l'audio ni la soumission. */
  hydraterRepriseLecture(instantane: InstantaneRepriseLecture): void;
  /** Suspend le temps du moteur et écrit l'instantané avant de quitter le nœud. */
  suspendreLecture(): Promise<void>;
  /** Reprend un nœud monté en écartant le temps d'absence. */
  reprendreLecture(): void;
  /** Barrière pour la navigation et l'arrêt propre. */
  attendreEcrituresLecture(): Promise<void>;
}

export type MagasinJeu = StoreApi<EtatMagasin>;

/**
 * Reflète l'état « animations calmes » sur la racine du document.
 * La règle CSS correspondante vit dans `styles/global.css` : un seul endroit décide, un seul
 * endroit applique. Garde le code exécutable sous happy-dom comme sous Playwright.
 */
function refleterAnimations(desactivees: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (desactivees) {
    document.documentElement.setAttribute('data-animations', 'desactivees');
  } else {
    document.documentElement.removeAttribute('data-animations');
  }
}

/** `prefers-reduced-motion` du système, au démarrage. R16 et v2 § 8. */
function mouvementReduitDemande(): boolean {
  if (typeof globalThis.matchMedia !== 'function') {
    return false;
  }
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function creerMagasin(
  services: ServicesJeu,
  graineInitiale = 1,
  /**
   * Les seuils de la cascade. `null` par défaut : ils sont **chargés au démarrage** (C2) et
   * posés par `fixerSeuils`. Les tests de composants les injectent directement, ce qui leur
   * évite de dépendre du réseau.
   */
  seuilsInitiaux: SeuilsCascade | null = null,
  /** Injection sans transport, appelée avant de publier la réussite. */
  conserverTerminee: (tentative: TentativeSansCle) => void = (tentative) => conserverTentativeTerminee(tentative),
  depotRepriseLecture?: DepotRepriseLecture
): MagasinJeu {
  const animationsInitiales = mouvementReduitDemande();
  refleterAnimations(animationsInitiales);
  const revisionsReprise = new Map<string, number>();
  let fileEcritures: Promise<void> = Promise.resolve();
  let chargementProfil: Promise<void> | null = null;
  let identifiantChargement: string | null = null;

  const garderErreur = (cause: unknown): void => {
    const message = cause instanceof Error ? cause.message : String(cause);
    magasin.setState({ erreurRepriseLecture: message });
  };

  const ecrireReprise = (): void => {
    if (depotRepriseLecture === undefined) return;
    const etat = magasin.getState();
    if (etat.profil === null || !etat.reprisePersistable || etat.paquet === null || etat.moteur === null ||
        etat.codeMoteur === null || etat.demarreLe === null) return;
    const maintenantMs = services.horloge.maintenantMs();
    const cle = `${String(etat.profil.id)}:${String(etat.profil.generationProgression ?? 0)}`;
    const rang = etat.sortie?.etapes.find((etape) => etape.noeud === etat.paquet?.noeud.id)?.rang ?? null;
    const instantane: InstantaneRepriseLecture = {
      versionContrat: VERSION_REPRISE_LECTURE,
      profil: etat.profil.id,
      generationProgression: etat.profil.generationProgression ?? 0,
      revision: revisionsReprise.get(cle) ?? 0,
      sortie: etat.sortie,
      rangSortie: rang,
      paquet: etat.paquet,
      codeMoteur: etat.codeMoteur,
      versionMoteur: etat.moteur.version,
      graine: etat.graine,
      etatMoteur: etat.etatMoteur,
      demarreLe: etat.demarreLe,
      journalise: etat.journalise,
      serie: etat.serie,
      resume: etat.resume,
      etoiles: etat.etoiles,
      termineLe: etat.termineLe,
      tentativeEnvoyee: etat.tentativeEnvoyee,
      erreurConservation: etat.erreurConservation,
      suspenduLeMs: etat.suspenduLeMs ?? maintenantMs
    };
    // Détecte immédiatement une donnée moteur impossible à écrire, avant la mise en file.
    try { encoderEtatLecture(instantane); }
    catch (cause) { garderErreur(cause); return; }
    fileEcritures = fileEcritures.then(async () => {
      const attendue = revisionsReprise.get(cle) ?? null;
      const suivante = await depotRepriseLecture.ecrire(
        { ...instantane, revision: attendue ?? 0 }, attendue
      );
      revisionsReprise.set(cle, suivante);
      magasin.setState({ erreurRepriseLecture: null });
    }).catch(garderErreur);
  };

  const magasin = createStore<EtatMagasin>()((fixer, lire) => ({
    ecran: 'chargement',
    profil: null,
    sortie: null,

    paquet: null,
    moteur: null,
    codeMoteur: null,
    etatMoteur: null,
    progression: null,
    aide: null,

    resume: null,
    etoiles: null,
    demarreLe: null,
    termineLe: null,
    tentativeEnvoyee: false,
    erreurConservation: null,
    erreurRepriseLecture: null,
    hydratationRepriseLecture: 'en-attente',
    suspenduLeMs: null,
    // Vrai par défaut : c'est l'enfant qui joue. Un défaut à `false` serait la pire valeur
    // possible — un journal muet ne se voit nulle part avant que la pédagogie n'ait dérivé.
    journalise: true,
    reprisePersistable: true,

    graine: graineInitiale,
    animationsDesactivees: animationsInitiales,

    seuils: seuilsInitiaux,
    cascade: ETAT_CASCADE_VIDE,
    dernierGain: null,
    serie: 0,
    dernierAppui: [0, 0],

    naviguer(ecran: CodeEcran): void {
      if (lire().ecran === 'noeud' && ecran !== 'noeud' && lire().resume === null &&
          lire().suspenduLeMs === null) {
        fixer({ suspenduLeMs: services.horloge.maintenantMs() });
        ecrireReprise();
      }
      fixer({ ecran });
    },

    fixerSeuils(seuils: SeuilsCascade): void {
      fixer({ seuils });
    },

    marquerAppui(x: number, y: number): void {
      // Aucun rendu n'en dépend : on écrit dans le magasin plutôt que dans une variable de
      // module pour que `window.__test.etat()` puisse un jour le lire, et pour qu'aucun
      // composant n'ait à porter cet état.
      fixer({ dernierAppui: [x, y] });
    },

    appliquerGainCascade(gain: GainCascade): void {
      fixer({ cascade: gain.etat, dernierGain: gain });
      // Le son de chaque palier franchi, dans l'ordre. `EcranRecompense` les AFFICHE ; c'est ici
      // qu'ils SONNENT — même endroit qu'avant ce lot, seule la SOURCE du gain a changé : le
      // serveur, plus le calcul client (R31).
      for (const palier of gain.paliersFranchis) {
        void services.retour.palierFranchi(palier);
      }
    },

    hydraterCascade(profilId: string, cascade: EtatCascade): void {
      if (String(lire().profil?.id) !== profilId) return;
      fixer({ cascade });
    },

    choisirProfil(profil: Profil): void {
      // Un tap suffit, aucun mot de passe (v2 § 11).
      //
      // R21 — ON RETIENT QUI JOUE. Le profil ne vivait que dans ce magasin, donc en mémoire :
      // un rafraîchissement sur `/carte` rechargeait la carte SANS savoir quel enfant joue, et
      // renvoyait au choix de profil. Les routes existaient pourtant toutes ; c'est le JOUEUR
      // qui manquait, pas l'URL.
      memoriserProfil(String(profil.id));
      const memeProfil = lire().profil?.id === profil.id;
      const sortie = memeProfil ? lire().sortie : null;
      fixer({ profil, sortie, ecran: 'campement',
        ...(memeProfil ? {} : {
          paquet: null, moteur: null, codeMoteur: null, etatMoteur: null,
          progression: null, aide: null, resume: null, etoiles: null,
          demarreLe: null, termineLe: null, tentativeEnvoyee: false,
          erreurConservation: null, erreurRepriseLecture: null,
          suspenduLeMs: null, reprisePersistable: true,
          cascade: ETAT_CASCADE_VIDE, dernierGain: null, serie: 0
        }) });
    },

    chargerProfilEtReprise(profil: Profil): Promise<void> {
      if (chargementProfil !== null) {
        if (identifiantChargement === String(profil.id)) return chargementProfil;
        return chargementProfil.catch(() => undefined).then(() => lire().chargerProfilEtReprise(profil));
      }
      identifiantChargement = String(profil.id);
      const precedent = lire().hydratationRepriseLecture;
      fixer({ hydratationRepriseLecture: 'en-cours', erreurRepriseLecture: null });
      const charger = async (): Promise<void> => {
        try {
          // Ne change ni le joueur mémorisé ni son nœud tant que l'écriture précédente échoue.
          if (lire().profil !== null) await lire().suspendreLecture();
          const instantane = depotRepriseLecture === undefined ? null : await depotRepriseLecture.lire(profil.id);
          if (depotRepriseLecture !== undefined && instantane === null &&
              lire().profil?.id === profil.id && lire().moteur !== null &&
              lire().reprisePersistable && lire().resume === null) {
            throw new Error('La reprise écrite vient de disparaître de SQLite.');
          }
          if (instantane !== null) {
            const compatible = adapterAncienneRepriseLecture(instantane);
            verifierInstantaneLecture(compatible, profil.id,
              profil.generationProgression ?? 0, obtenirMoteur(compatible.codeMoteur).version);
          }
          lire().choisirProfil(profil);
          if (instantane !== null) {
            lire().hydraterRepriseLecture(instantane);
            // Le campement présente la reprise ; seul un geste explicite rebascule vers le nœud.
            await lire().attendreEcrituresLecture();
            if (lire().erreurRepriseLecture !== null) throw new Error(lire().erreurRepriseLecture ?? 'Écriture impossible.');
          }
          fixer({ hydratationRepriseLecture: 'terminee' });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          fixer({ hydratationRepriseLecture: precedent === 'terminee' ? 'terminee' : 'echec',
            erreurRepriseLecture: message });
          throw cause;
        }
      };
      chargementProfil = charger().finally(() => {
        chargementProfil = null;
        identifiantChargement = null;
      });
      return chargementProfil;
    },

    demarrerSortie(sortie: PlanSortie): void {
      fixer({ sortie });
      if (lire().ecran === 'noeud' && lire().resume === null) ecrireReprise();
    },

    cloreSortie(): void {
      fixer({ sortie: null });
      if (lire().ecran === 'noeud' && lire().resume === null) ecrireReprise();
    },

    quitterProfil(): void {
      // Changer de joueur EFFACE la mémoire : sans ça, le prochain démarrage rouvrirait la
      // partie de l'enfant précédent, ce qui est pire que de redemander.
      if (lire().profil !== null && lire().moteur !== null && lire().resume === null) {
        fixer({ suspenduLeMs: lire().suspenduLeMs ?? services.horloge.maintenantMs() });
        ecrireReprise();
      }
      oublierProfil();
      fixer({
        profil: null,
        sortie: null,
        ecran: 'profils',
        paquet: null,
        moteur: null,
        codeMoteur: null,
        etatMoteur: null,
        progression: null,
        aide: null,
        resume: null,
        etoiles: null,
        demarreLe: null,
        termineLe: null,
        tentativeEnvoyee: false,
        erreurConservation: null,
        erreurRepriseLecture: null,
        hydratationRepriseLecture: 'en-attente',
        suspenduLeMs: null,
        reprisePersistable: true,
        // La cascade appartient au PROFIL : elle repart de zéro quand on en change. Les seuils,
        // eux, appartiennent au jeu et restent chargés.
        cascade: ETAT_CASCADE_VIDE,
        dernierGain: null,
        serie: 0
      });
      services.retour.reinitialiserSerie();
    },

    demarrerNoeud(paquet: PaquetNoeudAttendu, options: OptionsLancement = LANCEMENT_ENFANT): void {
      const code = paquet.exercice.jeu.moteur;
      const moteur = obtenirMoteur(code);
      const etatMoteur = moteur.creerEtat({
        contenu: paquet.exercice.jeu.contenu,
        habillage: paquet.habillage,
        alea: services.alea,
        horloge: services.horloge
      });

      fixer({
        paquet,
        moteur,
        codeMoteur: code,
        etatMoteur,
        progression: moteur.progression(etatMoteur),
        aide: moteur.aideProposee(etatMoteur),
        resume: null,
        etoiles: null,
        demarreLe: maintenantIso(services.horloge),
        termineLe: null,
        tentativeEnvoyee: false,
        erreurConservation: null,
        erreurRepriseLecture: null,
        suspenduLeMs: null,
        // Même un ancien lien direct vers l'activité libre ne peut promettre un acquis
        // que le serveur refusera (progression:false). La règle appartient au lancement.
        journalise: options.journalise && paquet.noeud.progression !== false,
        reprisePersistable: options.journalise,
        ecran: 'noeud',
        // Nouveau nœud, nouvelle série : la hauteur du son repart de la tonique (v2 § 8).
        serie: 0
      });
      services.retour.reinitialiserSerie();
      ecrireReprise();
    },

    /**
     * Réduit l'action ET déclenche le retour sensoriel.
     *
     * C'est ici que « le spectaculaire est déclenché par l'acte de lire » (D26) se traduit en
     * code : le magasin est le seul endroit qui voie *à la fois* l'état d'avant et celui
     * d'après, donc le seul qui puisse dire « ce geste-là était juste ». Le faire dans un
     * composant obligerait chaque moteur à le refaire, et R12 en promet treize.
     */
    emettre(action: unknown): void {
      const {
        moteur,
        etatMoteur,
        resume,
        progression: avant,
        dernierAppui,
        serie: serieAvant
      } = lire();
      if (moteur === null) {
        return;
      }
      if (lire().suspenduLeMs !== null) return;
      // Une tentative terminée n'accepte plus d'action : c'est ce qui rend le double-tap
      // final inoffensif (annexe T § T1) et l'écran de récompense stable.
      if (resume !== null) {
        return;
      }

      const refusAvant = refusCourant(etatMoteur);
      const suivant = moteur.reduire(etatMoteur, action, {
        alea: services.alea,
        horloge: services.horloge
      });

      const progression = moteur.progression(suivant);
      const aide = moteur.aideProposee(suivant);

      // ── le retour sensoriel, avant tout le reste
      //
      // Deux signaux, et deux seulement : l'avancement qui monte (le geste a compté) et le
      // marqueur de refus du moteur qui change (le geste a été rendu). Un « choisir une
      // couleur » ne fait ni l'un ni l'autre, et ne doit produire aucun son de dépôt.
      const aAvance = progression.avancement > (avant?.avancement ?? 0);
      const aEteRefuse = !aAvance && refusCourant(suivant) !== refusAvant;

      // La série est tenue ICI et passée en `options.serie` : `RetourSensoriel` ne l'expose
      // pas (§ 4.1 ne la déclare pas, et sept lots écrivent des doublures contre cette
      // signature). Le magasin est de toute façon le seul à devoir la publier — `data-serie`.
      let serie = serieAvant;
      if (aAvance) {
        serie = serieAvant + 1;
        void services.retour.depotCorrect({ origine: dernierAppui, serie });
      } else if (aEteRefuse) {
        serie = 0;
        void services.retour.depotRefuse();
      }

      if (progression.termine) {
        // `calculerEtoiles` est le SEUL endroit où vit le barème (contrat § 5.7). On l'appelle,
        // et le cast défensif de la v1 a disparu : la signature réelle est sous les yeux.
        const resumeFinal = moteur.resume(suivant);
        const etoiles: NombreEtoiles = calculerEtoiles(resumeFinal);
        const termineLe = maintenantIso(services.horloge);
        const { profil, paquet, graine, demarreLe, journalise } = lire();
        let erreurConservation: string | null = null;
        if (journalise && profil !== null && paquet !== null && demarreLe !== null) {
          try {
            conserverTerminee({
              profil: profil.id, generationProgression: profil.generationProgression ?? 0,
              noeud: paquet.noeud.id, exercice: paquet.exercice.id, moteur: paquet.exercice.jeu.moteur,
              habillage: paquet.habillage.id, graine, demarreLe, termineLe, resume: resumeFinal
            });
          } catch {
            // Le résultat reconnu n'est pas perdu en mémoire et aucun ACK n'est fabriqué.
            erreurConservation = 'La sauvegarde attend. Réessaie sans fermer cette page.';
          }
        }

        fixer({
          etatMoteur: suivant,
          progression,
          aide,
          resume: resumeFinal,
          etoiles,
          termineLe,
          erreurConservation,
          ecran: 'recompense',
          serie,
          // La cascade de D25 n'est plus calculée ici — lot A1 (R31) : elle vient du serveur, à
          // la réponse du `POST /api/tentatives` qu'`EcranRecompense` envoie juste après. On
          // efface le gain du nœud PRÉCÉDENT pour ne pas l'afficher par erreur pendant que la
          // requête est en vol ; `appliquerGainCascade` le repose dès que la réponse arrive.
          dernierGain: null
        });
        ecrireReprise();
        return;
      }

      fixer({ etatMoteur: suivant, progression, aide, serie });
      if (suivant !== etatMoteur) ecrireReprise();
    },

    rejouer(): void {
      // « Rejouer un nœud déjà à trois étoiles reste possible : c'est du plaisir » (v2 § 6.2).
      const { paquet } = lire();
      if (paquet === null) {
        fixer({ ecran: 'carte' });
        return;
      }
      // Rejouer garde le RÉGIME du lancement : une partie lancée par le parent ne doit pas se
      // mettre à compter au second tour parce qu'on a retapé « Rejouer ».
      lire().demarrerNoeud(paquet, { journalise: lire().journalise });
    },

    fixerGraine(graine: number): void {
      fixer({ graine });
    },

    sauterAnimations(): void {
      refleterAnimations(true);
      fixer({ animationsDesactivees: true });
    },

    marquerTentativeEnvoyee(): void {
      fixer({ tentativeEnvoyee: true });
      ecrireReprise();
    },

    hydraterRepriseLecture(instantane: InstantaneRepriseLecture): void {
      const profil = lire().profil;
      if (profil === null) throw new Error('Choisir le profil avant la reprise lecture.');
      const moteur = obtenirMoteur(instantane.codeMoteur);
      const compatible = adapterAncienneRepriseLecture(instantane);
      verifierInstantaneLecture(compatible, profil.id, profil.generationProgression ?? 0, moteur.version);
      revisionsReprise.set(`${String(profil.id)}:${String(profil.generationProgression ?? 0)}`, compatible.revision);
      // Aucun réducteur, aucun son, aucune validation : seul l'état sauvegardé est publié.
      fixer({
        sortie: compatible.sortie,
        paquet: compatible.paquet,
        moteur,
        codeMoteur: compatible.codeMoteur,
        etatMoteur: compatible.etatMoteur,
        progression: moteur.progression(compatible.etatMoteur),
        aide: moteur.aideProposee(compatible.etatMoteur),
        resume: compatible.resume,
        etoiles: compatible.etoiles,
        demarreLe: compatible.demarreLe,
        termineLe: compatible.termineLe,
        tentativeEnvoyee: compatible.tentativeEnvoyee,
        erreurConservation: compatible.erreurConservation,
        erreurRepriseLecture: null,
        journalise: compatible.journalise,
        reprisePersistable: true,
        graine: compatible.graine,
        serie: compatible.serie,
        suspenduLeMs: compatible.suspenduLeMs
      });
    },

    async suspendreLecture(): Promise<void> {
      if (lire().moteur !== null && lire().resume === null && lire().suspenduLeMs === null) {
        fixer({ suspenduLeMs: services.horloge.maintenantMs() });
        ecrireReprise();
      }
      await fileEcritures;
      if (lire().erreurRepriseLecture !== null) {
        const etat = lire();
        if (etat.suspenduLeMs !== null && etat.moteur !== null) {
          const etatMoteur = reprendreEtatLecture(etat.etatMoteur,
            Math.max(0, services.horloge.maintenantMs() - etat.suspenduLeMs));
          fixer({ etatMoteur, progression: etat.moteur.progression(etatMoteur),
            aide: etat.moteur.aideProposee(etatMoteur), suspenduLeMs: null });
        }
        throw new Error(lire().erreurRepriseLecture ?? 'Écriture impossible.');
      }
    },

    reprendreLecture(): void {
      const etat = lire();
      if (etat.moteur === null || etat.suspenduLeMs === null) return;
      const absenceMs = Math.max(0, services.horloge.maintenantMs() - etat.suspenduLeMs);
      const etatMoteur = reprendreEtatLecture(etat.etatMoteur, absenceMs);
      fixer({
        etatMoteur,
        progression: etat.moteur.progression(etatMoteur),
        aide: etat.moteur.aideProposee(etatMoteur),
        suspenduLeMs: null,
        ecran: etat.resume === null ? 'noeud' : 'recompense'
      });
      ecrireReprise();
    },

    attendreEcrituresLecture(): Promise<void> { return fileEcritures; }
  }));
  return magasin;
}
