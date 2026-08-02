// `FournisseurVoix` de REPLI, et adaptateur d'appel — contrat technique v1 § 1.4,
// révisé par le lot N2 (contrat de finition v3 § 4.2 et § 10).
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// CE FICHIER N'EST PLUS LE CHEMIN NOMINAL. `client/src/services/voix-fichier.ts` l'est.
//
// Il est CONSERVÉ, et le § 10 du contrat dit pourquoi : « le supprimer rendrait le jeu muet
// sur une installation dont `contenu/audio/` n'a pas été généré — exactement le contraire de
// "on clone, on lance, ça marche" (D9) ». Il garde donc deux rôles, et deux seulement :
//
//   1. **Le repli.** `creerVoixNavigateur()` rend un fournisseur qui n'a aucun manifeste :
//      `aUnClip` vaut toujours `false`, donc D42 masque tous les boutons, donc rien ne ment.
//      Il joue quand même un chemin d'asset si on lui en donne un — c'est le comportement de
//      la v1, conservé pour qu'un clip posé à la main reste jouable.
//   2. **L'adaptateur `direTexte`.** Trois composants du campement l'appellent
//      (`Chaudron`, `MurDesNoms`, `PointLibre`). Il traverse désormais l'interface PUBLIQUE
//      de `FournisseurVoix` au lieu de la contourner.
//
// LES DEUX TRANSTYPAGES AVEUGLES ONT DISPARU. Ils portaient le commentaire « le contrat gèle
// le nom `FournisseurVoix` mais pas ses membres ». Ce n'est plus vrai : le § 5.5 du contrat
// v3 donne `dire`, `taire`, `disponible` et `aUnClip` en TypeScript exact. Chaque `as unknown
// as` supprimé est un endroit où le compilateur protège à nouveau quelque chose — c'est le
// même solde que celui déjà fait dans `etat/services.ts` à l'intégration de la campagne v2.
// ═════════════════════════════════════════════════════════════════════════════════════════
import { CHEMINS_API } from '@pierre/partage';
import type { CleAudio, DemandeVoix, FournisseurVoix, Locuteur } from '@pierre/partage';

/** Fournisseur de repli : il ne connaît aucun clip, et il le dit. */
export function creerVoixNavigateur(): FournisseurVoix {
  let lecteur: HTMLAudioElement | null = null;

  function taire(): void {
    if (lecteur !== null) {
      lecteur.pause();
      lecteur.currentTime = 0;
      lecteur = null;
    }
  }

  async function dire(demande: DemandeVoix): Promise<void> {
    const cle = demande.cle ?? null;
    if (cle === null || cle === '') {
      return;
    }

    taire();
    // Sans manifeste, la clé ne peut être interprétée que comme un chemin d'asset. C'est le
    // comportement de la v1 et il ne fait de mal à personne : si le fichier n'existe pas, la
    // lecture échoue et le jeu continue.
    const audio = new Audio(CHEMINS_API.asset(cle));
    audio.preload = 'auto';
    lecteur = audio;

    try {
      await audio.play();
    } catch (cause) {
      // Une lecture impossible ne doit JAMAIS interrompre le jeu : la consigne reste lisible à
      // l'écran. « Aucun état sans issue » est la règle qui commande ce `catch`.
      console.warn('[voix] lecture impossible :', cause);
    }
  }

  return {
    dire,
    taire,
    disponible: true,
    // TOUJOURS `false` : ce fournisseur n'a pas de manifeste, donc il ne peut RIEN promettre.
    // Rendre `true` ferait apparaître des boutons muets, c'est-à-dire le défaut n° 3 du père.
    aUnClip: (): boolean => false,
  };
}

/**
 * Point d'appel unique côté composant : « fais dire ce texte, sous cette clé ».
 *
 * Le troisième paramètre était un `CheminAsset` en v1 ; c'est désormais une `CleAudio`. Les
 * deux sont des alias de `string`, donc **aucun appelant ne casse à la compilation** — et
 * c'est voulu : `Chaudron`, `MurDesNoms` et `PointLibre` appartiennent à N6, qui recâblera
 * `campement.json` sur les clés du manifeste (§ 4.6). D'ici là ils passent un chemin qu'aucun
 * clip ne sert, `clipDe` rend `null`, et le campement reste silencieux — exactement comme
 * aujourd'hui. Aucune régression, et le jour où N6 recâble, rien d'autre ne bouge.
 */
export async function direTexte(
  voix: FournisseurVoix,
  texte: string,
  cle: CleAudio | null,
  locuteur: Locuteur | string = 'narrateur'
): Promise<void> {
  await voix.dire({ texte, cle, locuteur: locuteur as Locuteur });
}

/** Coupe la lecture en cours. */
export function stopperVoix(voix: FournisseurVoix): void {
  voix.taire();
}
