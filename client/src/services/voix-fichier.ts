// `FournisseurVoix` NOMINAL — il joue des clips pré-rendus. Lot N2, contrat v3 § 4.2.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// « RIEN N'EST SYNTHÉTISÉ À L'EXÉCUTION » (CLAUDE.md). Ce fournisseur ne connaît que des
// FICHIERS et un MANIFESTE. Il n'appelle aucune API de synthèse, ne dépend d'aucune voix
// système, et fonctionne donc à l'identique sur la tablette du salon et dans un test.
//
// LE MANIFESTE EST LA SEULE SOURCE DE VÉRITÉ (D42). `aUnClip` ne teste pas l'existence d'un
// fichier — un `HEAD` par rendu React serait absurde — elle consulte le manifeste chargé au
// démarrage. C'est pourquoi le contrôle qualité du build est bloquant : le manifeste ne
// contient QUE des clips qui existent et que la transcription inverse a compris.
//
// TROIS PROPRIÉTÉS OPPOSABLES :
//   1. **Il ne se rend jamais indisponible en cours de partie.** Un réseau qui hoquette fait
//      échouer une lecture, jamais le fournisseur : le jeu continue, la consigne reste
//      lisible à l'écran, et l'enfant peut retaper.
//   2. **`aUnClip` est synchrone et sans effet de bord.** Elle est appelée à chaque rendu du
//      bouton.
//   3. **Le manifeste peut arriver APRÈS la construction.** `chargerManifeste` le pose une
//      fois. D'ici là le fournisseur se comporte comme une installation neuve — `aUnClip`
//      rend `false`, D42 masque le bouton, rien ne ment. C'est exactement l'atténuation du
//      risque n° 1 du contrat v3 § 11.
// ═════════════════════════════════════════════════════════════════════════════════════════
import type { CleAudio, DemandeVoix, FournisseurVoix } from '@pierre/partage';
import { MANIFESTE_VIDE, clipDe, lireManifeste } from '@pierre/partage/voix';
import type { ManifesteVoix, RenduVoix } from '@pierre/partage/voix';

/** Route du manifeste — `serveur/src/routes/audio.ts`, contrat v3 § 8. */
export const CHEMIN_MANIFESTE = '/api/audio/manifeste';

/**
 * L'URL d'un clip, sur la route DÉDIÉE — jamais sur la route générique d'assets.
 *
 * Les deux mènent aux mêmes octets : `GET /api/contenu/assets/audio/…` et
 * `GET /api/audio/…` lisent tous deux le même `DepotContenu`. Ce n'est pas indifférent pour
 * autant. La route dédiée pose `Cache-Control: public, max-age=31536000, immutable`, et elle
 * seule peut le faire : le nom de fichier d'un clip porte l'empreinte de son texte (§ 8),
 * donc un texte corrigé produit un NOM différent, donc un cache immuable ne peut jamais
 * servir une consigne périmée à l'enfant. La route générique n'a pas cette garantie sur ce
 * qu'elle sert, et ne peut donc pas promettre autant.
 *
 * `ClipVoix.fichier` est relatif à `contenu/` et commence par `audio/` ; la route, elle, est
 * déjà montée sous `/api/audio/`. On retire le préfixe plutôt que de le doubler.
 */
export function urlDuClip(fichier: string): string {
  const relatif = fichier.startsWith('audio/') ? fichier.slice('audio/'.length) : fichier;
  return `/api/audio/${relatif.split('/').map(encodeURIComponent).join('/')}`;
}

/** Ce que la coquille peut faire au fournisseur, en plus de l'interface partagée. */
export interface VoixFichier extends FournisseurVoix {
  /** Pose le manifeste. Idempotent ; le dernier posé gagne. */
  chargerManifeste(brut: unknown): void;
  /** Va le chercher au serveur. Ne lève jamais : un échec laisse le manifeste vide. */
  recupererManifeste(): Promise<void>;
  /** Le manifeste courant — lu par les tests, jamais par le jeu. */
  readonly manifeste: ManifesteVoix;
  /** Nombre de lectures demandées. Lu par les tests composants. */
  compteAppels(): number;
}

/**
 * Le rendu à jouer pour une demande.
 *
 * `syllabe` gagne sur `vitesse` : quand le palier `indice` demande les deux, c'est la coupe
 * syllabique qui aide, pas le ralenti. Le repli du `syllabe` absent vers le `normal` est
 * ASSUMÉ et visible ici — c'est le seul endroit du dépôt où il existe, et il vaut mieux
 * entendre le mot entier que rien du tout.
 */
export function renduDemande(demande: DemandeVoix): RenduVoix {
  if (demande.syllabe === true) return 'syllabe';
  if (demande.vitesse !== undefined && demande.vitesse < 1) return 'lent';
  return 'normal';
}

export interface OptionsVoixFichier {
  /** Volume de 0 à 1. Le réglage foyer « volume voix » y arrive par la coquille. */
  readonly volume?: number;
  /** Injecté par les tests ; `undefined` = `new Audio(...)` du navigateur. */
  readonly creerLecteur?: (source: string) => HTMLAudioElement;
}

export function creerVoixFichier(options: OptionsVoixFichier = {}): VoixFichier {
  let manifeste: ManifesteVoix = MANIFESTE_VIDE;
  let lecteur: HTMLAudioElement | null = null;
  let appels = 0;
  const volume = Math.min(1, Math.max(0, options.volume ?? 1));

  function taire(): void {
    if (lecteur !== null) {
      lecteur.pause();
      lecteur.currentTime = 0;
      lecteur = null;
    }
  }

  function aUnClip(cle: CleAudio | null): boolean {
    if (cle === null || cle === '') return false;
    return clipDe(manifeste, cle, 'normal') !== null;
  }

  async function dire(demande: DemandeVoix): Promise<void> {
    appels += 1;
    const cle = demande.cle ?? null;
    if (cle === null || cle === '') {
      return;
    }

    const rendu = renduDemande(demande);
    // Repli vers `normal` — le seul du dépôt, et il est ici pour être vu. Le manifeste, lui,
    // n'en fait aucun : `clipDe` rend `null` plutôt que de servir autre chose que ce qu'on
    // lui demande.
    const clip = clipDe(manifeste, cle, rendu) ?? clipDe(manifeste, cle, 'normal');
    if (clip === null) {
      // Aucune trace bruyante : D42 garantit que le bouton n'était pas là. Un appel sans clip
      // vient donc d'un chemin de code qui ne passe pas par le bouton, et il doit se taire
      // sans salir la console du parent.
      return;
    }

    taire();
    const source = urlDuClip(clip.fichier);
    const audio =
      options.creerLecteur === undefined ? new Audio(source) : options.creerLecteur(source);
    audio.preload = 'auto';
    audio.volume = volume;
    lecteur = audio;

    try {
      await audio.play();
    } catch (cause) {
      // Un clip introuvable ou une lecture refusée par la politique d'autoplay ne doit JAMAIS
      // interrompre le jeu : la consigne reste lisible à l'écran, et l'enfant peut retaper.
      // « Aucun état sans issue » est la règle qui commande ce `catch`.
      console.warn('[voix] lecture impossible :', cause);
    }
  }

  function chargerManifeste(brut: unknown): void {
    manifeste = lireManifeste(brut);
  }

  async function recupererManifeste(): Promise<void> {
    try {
      const reponse = await fetch(CHEMIN_MANIFESTE, { headers: { Accept: 'application/json' } });
      if (!reponse.ok) {
        throw new Error(`statut ${String(reponse.status)}`);
      }
      chargerManifeste(await reponse.json());
    } catch (cause) {
      // Le manifeste reste vide : le jeu est muet, jamais cassé. C'est exactement le
      // comportement d'un dépôt où `npm run voix` n'a pas tourné.
      console.warn('[voix] manifeste illisible, le jeu reste muet :', cause);
    }
  }

  return {
    dire,
    taire,
    aUnClip,
    chargerManifeste,
    recupererManifeste,
    compteAppels: () => appels,
    get disponible(): boolean {
      // TOUJOURS vrai. « Disponible » dit que le fournisseur répond, pas qu'il a des clips —
      // c'est `aUnClip` qui répond à cela. Les confondre ferait disparaître le bouton pour
      // une raison (« pas de voix ») quand la vraie est l'autre (« pas ce clip-là »), et le
      // diagnostic du parent deviendrait impossible.
      return true;
    },
    get manifeste(): ManifesteVoix {
      return manifeste;
    },
  };
}
