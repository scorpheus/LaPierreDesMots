/**
 * LA FENTE ET LE JETON QUI L'ATTEINT — R59, partagés par `phrase`, `tri`, `assemble` et `chrono`.
 *
 * Réunit, le 30 oct. 2026, `phrase/receptacles.tsx` (styles en ligne) et `phrase/fentes.tsx`
 * (styles en feuille) : deux copies de la même loi, qui commençaient à diverger. L'apparence vit
 * dans `fentes.css` ; seules les dimensions calculées (boîte réservée, départ du vol) restent en
 * `style`. Il ne connaît ni étiquette, ni consigne, ni habillage : des jetons qui portent un
 * texte, et des réceptacles qui leur gardent la place.
 *
 * ── LA LOI, EN UNE PHRASE ────────────────────────────────────────────────────────────────────
 * **Une case vide est une PROMESSE DE PLACE.** Le père : « ça devrait remplacer au même endroit
 * la case sinon les cases vides n'ont aucun sens. » Deux conséquences mécaniques :
 *   1. la fente RÉSERVE la boîte de son futur contenu dès qu'elle est vide : la remplir ne
 *      déplace rien, ni elle, ni ses voisines ;
 *   2. le vol atterrit sur le CENTRE MESURÉ de la fente, pas sur une approximation.
 */

import type { CSSProperties, ReactElement } from 'react';

import type { Boite } from '../../habillages/emplacements.js';
import { TexteColore } from '../../lecture/TexteColore.js';
import './fentes.css';

/** Un vol en cours : une COPIE transitoire du jeton, jamais l'élément réel. */
export interface VolDuJeton {
  readonly cle: string;
  readonly texte: string;
  /** Départ et arrivée, en pixels du bloc contenant — le même pour les deux. */
  readonly depart: readonly [number, number];
  readonly arrivee: readonly [number, number];
  /** Change à chaque vol : c'est ce qui fait renaître le nœud, donc rejouer l'animation. */
  readonly marque: number;
}

/**
 * Le centre d'un réceptacle, dans le repère d'un ancêtre positionné.
 *
 * À appeler **au moment du geste**, avant d'émettre l'action : c'est le seul instant où le
 * réceptacle est encore vide et où sa place est celle que l'enfant vise. Rend `null` — et non
 * un point faux — quand rien n'est mesurable : un vol vers (0, 0) serait pire que pas de vol.
 */
export function centreDuReceptacle(
  racine: Element | null,
  receptacle: Element | null,
): readonly [number, number] | null {
  if (racine === null || receptacle === null) return null;
  const boiteRacine = racine.getBoundingClientRect();
  const boiteCible = receptacle.getBoundingClientRect();
  if (boiteRacine.width === 0 || boiteCible.width === 0) return null;
  return [
    boiteCible.left - boiteRacine.left + boiteCible.width / 2,
    boiteCible.top - boiteRacine.top + boiteCible.height / 2,
  ];
}

/**
 * Le décalage d'un descendant par rapport à un ancêtre, en pixels.
 *
 * Le départ du vol est calculé dans le repère de la couche des jetons, l'arrivée est MESURÉE dans
 * celui du moteur. Dès qu'une bande s'intercale au-dessus (la phrase modèle, R60), les deux
 * repères divergent : on mesure le décalage au lieu de le coder en dur (défaut de R40).
 */
export function decalageEntre(
  ancetre: Element | null,
  descendant: Element | null,
): readonly [number, number] {
  if (ancetre === null || descendant === null) return [0, 0];
  const a = ancetre.getBoundingClientRect();
  const d = descendant.getBoundingClientRect();
  return [d.left - a.left, d.top - a.top];
}

export interface ProprietesFente {
  /** Identifiant du réceptacle. Sert de clé de mesure au vol. */
  readonly cle: string;
  /** Le texte reçu, ou `null` tant que la place est libre. */
  readonly texte: string | null;
  /** La boîte que cette fente RÉSERVE : celle du jeton qui viendra, donc le remplir ne déplace rien. */
  readonly boite: Boite;
  /** La prochaine place attendue. Marquée, jamais animée : c'est le champ de lecture. */
  readonly prochaine: boolean;
  brancher(noeud: HTMLElement | null): void;
}

/** Une place, vide ou tenue. Elle ne DISPARAÎT jamais (R59). */
export function Fente({ cle, texte, boite, prochaine, brancher }: ProprietesFente): ReactElement {
  const tenue = texte !== null;
  return (
    <span
      ref={brancher}
      className="fente"
      data-fente={cle}
      data-placee={tenue ? 'oui' : 'non'}
      data-prochaine={prochaine ? 'oui' : 'non'}
      // `minInlineSize` et non `inlineSize` : si l'estimation était trop courte, la fente grandit
      // plutôt que de rogner le mot.
      style={{ minInlineSize: `${String(boite.largeur)}px`, blockSize: `${String(boite.hauteur)}px` }}
    >
      {/* T19 : le mot posé reste lu en couleurs, comme sur son étiquette. */}
      {texte === null ? null : <TexteColore texte={texte} />}
    </span>
  );
}

export interface ProprietesJetonEnVol {
  readonly vol: VolDuJeton;
  readonly dureeMs: number;
}

/**
 * Le jeton qui traverse : une copie transitoire, purement ADDITIVE. L'élément réel est déjà
 * parti, la fente est déjà tenue ; monté ou non, l'état final est le même (captures T4 stables,
 * `prefers-reduced-motion` gratuit : on ne monte rien).
 */
export function JetonEnVol({ vol, dureeMs }: ProprietesJetonEnVol): ReactElement {
  return (
    <span
      data-vol-du-mot={vol.cle}
      aria-hidden="true"
      className="cible jeton-en-vol"
      style={
        {
          insetInlineStart: `${String(vol.depart[0])}px`,
          insetBlockStart: `${String(vol.depart[1])}px`,
          '--vol-dx': `${String(vol.arrivee[0] - vol.depart[0])}px`,
          '--vol-dy': `${String(vol.arrivee[1] - vol.depart[1])}px`,
          '--vol-duree': `${String(dureeMs)}ms`,
        } as CSSProperties
      }
    >
      <TexteColore texte={vol.texte} />
    </span>
  );
}
