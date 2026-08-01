// `FournisseurVoix` du navigateur — contrat technique v1 § 1.4.
//
// RIEN N'EST SYNTHÉTISÉ À L'EXÉCUTION (CLAUDE.md) : la voix ne sait que jouer un clip
// PRÉ-RENDU, servi par `GET /api/contenu/assets/*`. Aucune `SpeechSynthesis`, qui dépendrait
// des voix du système et casserait le hors-ligne total.
//
// En v1 il n'existe aucun clip (`consigne.audio === null`, écart assumé n° 4 du contrat § 12) :
// le fournisseur JOURNALISE la demande et se résout. Le bouton « écouter » existe donc et
// fonctionne, la dette R15 est levée au lot L2 sans changement d'interface.
//
// NOTE DE CONTRAT : le contrat gèle le nom `FournisseurVoix` (§ 11.1) mais pas ses membres.
// L'implantation ci-dessous déclare la forme qu'elle attend (`VoixLocale`) et la publie sous
// le type de L-B ; `direTexte` fait le chemin inverse. Si L-B a retenu d'autres noms de
// méthodes, seuls ces deux points d'adaptation sont à reprendre — signalé au rapport L-D.
import type { CheminAsset, FournisseurVoix } from '@pierre/partage';

/** Ce qu'on demande à la voix. Superset probable de `DemandeVoix` (L-B). */
export interface DemandeVoixLocale {
  /** Texte affiché, journalisé quand aucun clip n'existe. */
  readonly texte: string;
  /** Clé du clip pré-rendu, `null` en v1. */
  readonly clip: CheminAsset | null;
  /** `narrateur` par défaut. `gobi` pour l'aide. */
  readonly locuteur?: string;
}

export interface VoixLocale {
  dire(demande: DemandeVoixLocale): Promise<void>;
  stopper(): void;
  /** Nombre d'appels reçus — lu par les tests composants, jamais par le jeu. */
  compteAppels(): number;
}

const RACINE_ASSETS = '/api/contenu/assets/';

function creerImplementation(): VoixLocale {
  let lecteur: HTMLAudioElement | null = null;
  let appels = 0;

  function stopper(): void {
    if (lecteur !== null) {
      lecteur.pause();
      lecteur.currentTime = 0;
      lecteur = null;
    }
  }

  async function dire(demande: DemandeVoixLocale): Promise<void> {
    appels += 1;

    if (demande.clip === null) {
      // Dette explicite, pas un silence muet : la trace dit pourquoi rien ne sort.
      console.info(
        '[voix] aucun clip pré-rendu en v1 (écart n° 4) — texte demandé :',
        demande.texte
      );
      return;
    }

    stopper();
    const audio = new Audio(`${RACINE_ASSETS}${String(demande.clip)}`);
    audio.preload = 'auto';
    lecteur = audio;

    try {
      await audio.play();
    } catch (cause) {
      // Un clip absent ou une lecture refusée par la politique d'autoplay ne doit JAMAIS
      // interrompre le jeu : la consigne reste lisible à l'écran.
      console.warn('[voix] lecture impossible :', cause);
    }
  }

  return { dire, stopper, compteAppels: () => appels };
}

/** Fournisseur de voix branché sur `<audio>`, repli silencieux et journalisé. */
export function creerVoixNavigateur(): FournisseurVoix {
  return creerImplementation() as unknown as FournisseurVoix;
}

/** Point d'adaptation unique côté appelant (voir la note de contrat en tête de fichier). */
export async function direTexte(
  voix: FournisseurVoix,
  texte: string,
  clip: CheminAsset | null,
  locuteur = 'narrateur'
): Promise<void> {
  const locale = voix as unknown as Partial<VoixLocale>;
  if (typeof locale.dire !== 'function') {
    console.warn('[voix] le fournisseur ne porte pas de méthode `dire`.');
    return;
  }
  await locale.dire({ texte, clip, locuteur });
}

/** Coupe la lecture en cours, si le fournisseur sait le faire. */
export function stopperVoix(voix: FournisseurVoix): void {
  const locale = voix as unknown as Partial<VoixLocale>;
  if (typeof locale.stopper === 'function') {
    locale.stopper();
  }
}
