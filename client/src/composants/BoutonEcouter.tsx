// Bouton « écouter » — R15, règle non négociable de CLAUDE.md.
//
// « Aucune consigne n'existe uniquement à l'écrit. Tout est audible en un tap, réécoutable
// sans limite, sans coût en étoiles. »
//
// Trois propriétés portées par ce composant, et opposables en revue :
//   1. il n'émet AUCUNE action de moteur — la réécoute ne peut donc pas coûter une étoile ;
//   2. il n'est jamais désactivé, jamais compté, jamais limité ;
//   3. il fait 64 × 64 px au minimum (R16), via la classe `.cible`.
//
// ════════════════════════════════════════════════════════════════════════════════════════
// DEUX RAISONS DE NE PAS RENDRE CE BOUTON, ET ELLES SE COMPOSENT.
//
// 1. **D42 — aucun clip, aucun bouton.** Le père a tapé « Écouter » et n'a rien eu. La cause
//    n'était pas le branchement (il est correct : `direTexte` est bien appelé) mais l'absence
//    de clip : `voix-navigateur.ts` journalise et se résout, rien ne sort, rien ne bouge à
//    l'écran. D42 tranche le remède, et ce n'est pas d'inventer un retour visuel :
//
//      « Le bouton « écouter » est masqué tant qu'aucun audio n'existe pour la consigne.
//        Rien ne ment, rien ne déçoit — un bouton qui ne répond pas casse la confiance plus
//        sûrement qu'un bouton absent. »
//
//    Ce qui remplaçait auparavant cette règle — « le bouton existe quand même, la dette se
//    lève au lot L2 » — est donc caduc, et D42 en énonce lui-même le prix : **R15 reste
//    visiblement non satisfaite** tant que les voix (D41) ne sont pas produites. La dette est
//    chiffrée et tenue rouge par `tests/unitaires/consignes-audibles.test.ts` : elle n'est pas
//    masquée par ce fichier, elle est déplacée là où elle se mesure.
//
// 2. **Le réglage du parent.** Demandé verbatim : « une option pour activer ou désactiver du
//    côté parent le bouton écouter ». Il vit dans `client/src/parent/reglages-foyer.ts`, vaut
//    `true` par défaut (R15 tient sans qu'on touche à rien) et se pose derrière le code parent.
//
// L'ORDRE N'EN EST PAS UN : les deux conditions sont des refus, aucune ne peut annuler
// l'autre. Rallumer le réglage ne fait pas réapparaître un bouton muet ; l'arrivée d'un clip
// ne passe pas outre la décision du parent.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// ────────────────────────────────────────────────────────────────────────────────────────
// CE QUE N2 A CHANGÉ, ET RIEN D'AUTRE (contrat de finition v3 § 5.6).
//
// La propriete `clip` — un CHEMIN de fichier que l'appelant devait connaitre — devient `cle`,
// une CLE de manifeste. Et la premiere condition de refus cesse de regarder ce que
// l'appelant a bien voulu passer pour interroger la SEULE source de verite :
//
//     if (!services.voix.aUnClip(cle) || !reglagesFoyer.boutonEcouter) return null;
//
// Le motif est exactement celui de D42. Avec un chemin, chaque appelant devait savoir si un
// clip existait — c'est-a-dire que chaque appelant pouvait se tromper, et qu'un seul oubli
// remettait a l'ecran le bouton muet du defaut n° 3. Avec une cle, un seul objet sait, et
// c'est celui qui joue le son.
//
// Le second refus, le reglage du parent, est CONSERVE tel quel. N2 n'y touche pas.
// ────────────────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { CleAudio, Locuteur } from '@pierre/partage';
import { useServices } from '../etat/services.js';
import { useReglagesFoyer } from '../parent/reglages-foyer.js';
import { direTexte } from '../services/voix-navigateur.js';

export interface ProprietesBoutonEcouter {
  /** Texte à faire dire. Toujours renseigné : c'est lui que porte le clip. */
  readonly texte: string;
  /**
   * AJOUT N2 — remplace `clip`. Clé du manifeste, jamais un chemin de fichier.
   * `null`, ou une clé qu'aucun clip ne sert : **rien n'est rendu du tout** (D42).
   */
  readonly cle?: CleAudio | null;
  /** `narrateur` par défaut, `gobi` pour l'aide. */
  readonly locuteur?: Locuteur;
  /** Libellé accessible. Le défaut convient à une consigne. */
  readonly libelle?: string;
  /** Appelé APRÈS la lecture. Sert à journaliser une réécoute, jamais à la facturer. */
  readonly surEcoute?: () => void;
}

export function BoutonEcouter({
  texte,
  cle = null,
  locuteur = 'narrateur',
  libelle = 'Écouter la consigne',
  surEcoute
}: ProprietesBoutonEcouter): ReactElement | null {
  const services = useServices();
  const reglagesFoyer = useReglagesFoyer();
  const [enLecture, fixerEnLecture] = useState(false);
  /**
   * Combien de fois la consigne a été demandée, depuis le montage de ce bouton.
   *
   * ── POURQUOI UN COMPTEUR, ET PAS SEULEMENT `aria-busy` ────────────────────────────────
   * Ajouté à l'intégration de la campagne N. `aria-busy` existait déjà, mais il est
   * TRANSITOIRE : il passe à `true` au tap et retombe à `false` dès que la lecture finit.
   * Le bouton était donc, pour tout observateur extérieur, rigoureusement identique avant
   * et après avoir été tapé — et l'audit « aucun élément interactif mort » le relevait comme
   * mort sur les nœuds `trace` :
   *
   *     noeud/galeries-01 (moteur trace) : button « Écouter la consigne »
   *     noeud/galeries-02 (moteur trace) : button « Écouter la consigne »
   *
   * C'était un angle mort de la mesure, pas une panne : le son partait bien. Mais **c'est
   * précisément la forme du défaut n° 2 du père** — « le bouton écouter ne fait rien » —, et
   * un bouton dont l'effet est inaudible (tablette en sourdine, volume à zéro, casque
   * débranché) est indiscernable d'un bouton en panne, pour l'enfant comme pour le test.
   *
   * Le compteur rend l'effet DURABLE et donc observable : il prouve mécaniquement que le tap
   * a été reçu, sans rien changer à ce que l'enfant entend.
   */
  const [nbEcoutes, fixerNbEcoutes] = useState(0);

  const ecouter = useCallback((): void => {
    fixerEnLecture(true);
    fixerNbEcoutes((precedent) => precedent + 1);
    void direTexte(services.voix, texte, cle, locuteur).finally(() => {
      fixerEnLecture(false);
      surEcoute?.();
    });
  }, [services, texte, cle, locuteur, surEcoute]);

  // Les deux refus, APRÈS les crochets : React exige que leur nombre et leur ordre soient les
  // mêmes à chaque rendu, et le réglage du parent bascule pendant la vie du composant.
  //
  // C'est `aUnClip` — donc le MANIFESTE — qui décide du premier, et non plus l'appelant.
  if (!services.voix.aUnClip(cle) || !reglagesFoyer.boutonEcouter) {
    return null;
  }

  return (
    <button
      type="button"
      className="cible cible-appel bouton-ecouter"
      // `data-action="ecouter"` — ajouté à l'intégration de la campagne v2.
      //
      // C'est la prise mécanique de R15 (« aucune consigne n'existe uniquement à l'écrit »),
      // et les onze moteurs de L2-E la portent déjà sur leur propre bouton. Ce bouton-ci est
      // celui de la COQUILLE — le seul que voient les nœuds `colorie`, `place` et `trace`, qui
      // n'en rendent pas d'autre. Sans l'attribut, `parcours-variete` mesurait zéro réécoute
      // sur ces trois moteurs alors que le bouton était bien à l'écran : le défaut n'était pas
      // l'absence du bouton, c'était l'absence de la marque.
      data-action="ecouter"
      // La preuve mécanique de D42, portée par le DOM : un bouton rendu nomme le clip qu'il
      // sait jouer. Un test n'a donc pas à croire le composant sur parole — il lit l'attribut.
      // Sans lui, « le bouton est là » et « le bouton peut jouer quelque chose » seraient deux
      // affirmations que rien ne distingue à l'écran, et c'est exactement le piège de D42.
      data-clip={String(cle)}
      // Le nombre de demandes d'écoute. Jamais remis à zéro, jamais « facturé » : réécouter
      // est gratuit et sans limite (règle non négociable de CLAUDE.md). Cet attribut n'est
      // qu'un témoin, il n'entre dans aucun calcul d'étoiles.
      data-ecoutes={String(nbEcoutes)}
      onClick={ecouter}
      aria-label={libelle}
      // JAMAIS `disabled` : réécouter pendant la lecture relance, ça ne bloque pas.
      aria-busy={enLecture ? 'true' : 'false'}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 9v6h4l5 4V5L8 9H4z"
          fill="var(--trait)"
          stroke="var(--trait)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="var(--trait)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span>Écouter</span>
    </button>
  );
}
