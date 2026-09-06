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
import { ETAT_CASCADE_VIDE } from '@pierre/partage/recompenses';
import type { PaquetNoeudAttendu } from '../api/client.js';
import { memoriserProfil, oublierProfil } from './profil-memorise.js';
import type { ServicesJeu } from '../moteurs/types.js';
import { maintenantIso } from './services.js';

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
  seuilsInitiaux: SeuilsCascade | null = null
): MagasinJeu {
  const animationsInitiales = mouvementReduitDemande();
  refleterAnimations(animationsInitiales);

  return createStore<EtatMagasin>()((fixer, lire) => ({
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
    // Vrai par défaut : c'est l'enfant qui joue. Un défaut à `false` serait la pire valeur
    // possible — un journal muet ne se voit nulle part avant que la pédagogie n'ait dérivé.
    journalise: true,

    graine: graineInitiale,
    animationsDesactivees: animationsInitiales,

    seuils: seuilsInitiaux,
    cascade: ETAT_CASCADE_VIDE,
    dernierGain: null,
    serie: 0,
    dernierAppui: [0, 0],

    naviguer(ecran: CodeEcran): void {
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

    choisirProfil(profil: Profil): void {
      // Un tap suffit, aucun mot de passe (v2 § 11).
      //
      // R21 — ON RETIENT QUI JOUE. Le profil ne vivait que dans ce magasin, donc en mémoire :
      // un rafraîchissement sur `/carte` rechargeait la carte SANS savoir quel enfant joue, et
      // renvoyait au choix de profil. Les routes existaient pourtant toutes ; c'est le JOUEUR
      // qui manquait, pas l'URL.
      memoriserProfil(String(profil.id));
      const sortie = lire().profil?.id === profil.id ? lire().sortie : null;
      fixer({ profil, sortie, ecran: 'carte' });
    },

    demarrerSortie(sortie: PlanSortie): void {
      fixer({ sortie });
    },

    cloreSortie(): void {
      fixer({ sortie: null });
    },

    quitterProfil(): void {
      // Changer de joueur EFFACE la mémoire : sans ça, le prochain démarrage rouvrirait la
      // partie de l'enfant précédent, ce qui est pire que de redemander.
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
        // Même un ancien lien direct vers l'activité libre ne peut promettre un acquis
        // que le serveur refusera (progression:false). La règle appartient au lancement.
        journalise: options.journalise && paquet.noeud.progression !== false,
        ecran: 'noeud',
        // Nouveau nœud, nouvelle série : la hauteur du son repart de la tonique (v2 § 8).
        serie: 0
      });
      services.retour.reinitialiserSerie();
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

        fixer({
          etatMoteur: suivant,
          progression,
          aide,
          resume: resumeFinal,
          etoiles,
          termineLe: maintenantIso(services.horloge),
          ecran: 'recompense',
          serie,
          // La cascade de D25 n'est plus calculée ici — lot A1 (R31) : elle vient du serveur, à
          // la réponse du `POST /api/tentatives` qu'`EcranRecompense` envoie juste après. On
          // efface le gain du nœud PRÉCÉDENT pour ne pas l'afficher par erreur pendant que la
          // requête est en vol ; `appliquerGainCascade` le repose dès que la réponse arrive.
          dernierGain: null
        });
        return;
      }

      fixer({ etatMoteur: suivant, progression, aide, serie });
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
    }
  }));
}
