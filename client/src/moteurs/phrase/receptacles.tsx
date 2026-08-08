/**
 * LE RÉCEPTACLE ET LE JETON QUI L'ATTEINT — R59, et « à reprendre partout » (le père).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * RIEN DANS CE FICHIER N'EST PROPRE À `phrase`.
 *
 * Il ne connaît ni étiquette, ni consigne, ni habillage, ni décor : seulement des **jetons** qui
 * portent un texte, et des **réceptacles** qui leur gardent la place. `assemble` et `chrono` ont
 * le même geste d'ordre ; `tri` et `paires` ont des réceptacles. Le père a dit « à reprendre
 * partout » — ce module est écrit pour être adopté, pas recopié : quatre copies divergeraient,
 * comme les deux listes de polices (R8).
 *
 * ── SON VRAI DOMICILE, ET POURQUOI IL N'Y EST PAS ─────────────────────────────────────────────
 * Il devrait vivre dans `client/src/moteurs/commun/`. Il n'y est pas, et ce n'est PAS un oubli :
 * `tests/unitaires/decor-de-fond.test.ts` énumère **tous les sous-dossiers** de
 * `client/src/moteurs/` et exige de chacun un composant `Moteur*.tsx` —
 *
 *     expect(fichier, `aucun composant Moteur*.tsx dans ${code}`).toBeDefined();
 *
 * — donc créer `commun/` ferait échouer ce garde, et `tests/` ne m'appartient pas. Le
 * déménagement demande d'abord que ce garde distingue « un moteur » de « un dossier ».
 * Signalé au rapport ; d'ici là le fichier est ici, et il est déjà agnostique.
 *
 * ── LA LOI QU'IL PORTE, EN UNE PHRASE ─────────────────────────────────────────────────────────
 * **Une case vide est une PROMESSE DE PLACE.** Le père : « ça devrait remplacer au même endroit
 * la case sinon les cases vides n'ont aucun sens. » Il a raison, et l'argument est plus fort que
 * l'esthétique : si le jeton atterrit ailleurs, la case n'a jamais rien promis, et l'enfant ne
 * comprend ni à quoi elle servait ni pourquoi elle est encore là.
 *
 * Deux conséquences mécaniques, et ce sont elles qui font le fichier :
 *   1. **le réceptacle RÉSERVE la boîte de son futur contenu**, dès qu'il est vide. Le remplir
 *      ne déplace donc rien — ni lui, ni ses voisins. Sans cette réservation, la ligne se
 *      recomposerait à chaque mot et la case visée aurait bougé avant l'arrivée du jeton ;
 *   2. **le vol atterrit sur le CENTRE MESURÉ du réceptacle**, pas sur une approximation.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import type { CSSProperties, ReactElement } from 'react';

import type { Boite } from '../../habillages/emplacements.js';

/**
 * Les images-clés du vol.
 *
 * `translate(-50%, -50%)` est déclaré dans LES DEUX images — c'est la leçon de R54 : une
 * image-clé REMPLACE la transformation en place, elle ne compose pas. Omis d'un seul côté, le
 * jeton sauterait d'une demi-boîte au premier frame.
 */
export const FEUILLE_DU_VOL = `
@keyframes pierre-vol-du-jeton {
  from { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
  to   { transform: translate(-50%, -50%) translate(var(--vol-dx), var(--vol-dy)); opacity: 1; }
}
[data-vol-du-mot] { animation: pierre-vol-du-jeton var(--vol-duree) cubic-bezier(0.33, 0, 0.2, 1) 1 both; }
`;

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
 * ── POURQUOI CETTE FONCTION EXISTE, ET CE QU'ELLE ÉVITE ───────────────────────────────────────
 * Le vol relie deux points qui viennent de DEUX SOURCES : le départ est calculé par la
 * dérivation, dans le repère de la couche des jetons ; l'arrivée est MESURÉE, dans le repère du
 * moteur. Tant que la couche des jetons commençait au sommet du moteur, les deux repères
 * coïncidaient par accident et personne ne s'en apercevait.
 *
 * Dès qu'une bande s'intercale au-dessus — la phrase modèle, R60 — l'accident cesse, et le vol
 * partirait exactement `hauteurDeLaBande` pixels trop haut. C'est le défaut de R40, mot pour
 * mot : un décor et ses prises qui ne partagent pas le même référentiel.
 *
 * On ne code donc pas le décalage en dur : on le MESURE, et il reste juste quelle que soit la
 * mise en page à venir.
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
  /**
   * La boîte que ce réceptacle RÉSERVE. C'est celle du jeton qui viendra — dérivée de la même
   * typographie, donc identique. Le remplissage ne recompose alors rien.
   */
  readonly boite: Boite;
  /** La prochaine place attendue. Marquée, jamais animée : c'est le champ de lecture. */
  readonly prochaine: boolean;
  /** Style de lecture hérité — police, corps, interlettrage du profil. */
  readonly styleTexte: CSSProperties;
  brancher(noeud: HTMLElement | null): void;
}

/**
 * Une place, vide ou tenue.
 *
 * Elle ne DISPARAÎT jamais : c'est tout le propos de R59. Vide, elle montre qu'elle attend ;
 * pleine, elle porte son texte **exactement au même endroit**.
 */
export function Fente({
  cle,
  texte,
  boite,
  prochaine,
  styleTexte,
  brancher,
}: ProprietesFente): ReactElement {
  const tenue = texte !== null;
  return (
    <span
      ref={brancher}
      data-fente={cle}
      data-placee={tenue ? 'oui' : 'non'}
      data-prochaine={prochaine ? 'oui' : 'non'}
      style={{
        ...styleTexte,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // LA RÉSERVATION. `minInlineSize` et non `inlineSize` : si l'estimation typographique
        // était trop courte, la fente grandit plutôt que de rogner le mot — on se trompe du
        // côté qui reste lisible.
        minInlineSize: `${String(boite.largeur)}px`,
        blockSize: `${String(boite.hauteur)}px`,
        borderRadius: 'var(--rayon-carte)',
        border: `var(--epaisseur-trait) ${tenue ? 'solid' : 'dashed'} var(--trait)`,
        backgroundColor: tenue
          ? 'var(--parchemin)'
          : prochaine
            ? 'var(--soleil)'
            : 'color-mix(in srgb, var(--grisaille) 12%, var(--parchemin))',
        // Creux tant qu'elle attend, en relief une fois tenue : le mot est POSÉ, il n'est plus
        // un trou. Aucune transition — on est dans le champ de lecture.
        boxShadow: tenue ? 'var(--ombre-bd)' : 'var(--ombre-bd-appui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {texte}
    </span>
  );
}

export interface ProprietesJetonEnVol {
  readonly vol: VolDuJeton;
  readonly dureeMs: number;
  readonly styleTexte: CSSProperties;
}

/**
 * Le jeton qui traverse. Purement ADDITIF : l'élément réel est déjà parti, le réceptacle est
 * déjà tenu. Monté ou non, l'état final est le même — d'où des captures T4 stables et un
 * `prefers-reduced-motion` gratuit (on ne monte simplement rien).
 */
export function JetonEnVol({ vol, dureeMs, styleTexte }: ProprietesJetonEnVol): ReactElement {
  return (
    <span
      data-vol-du-mot={vol.cle}
      aria-hidden="true"
      className="cible"
      style={
        {
          ...styleTexte,
          position: 'absolute',
          insetInlineStart: `${String(vol.depart[0])}px`,
          insetBlockStart: `${String(vol.depart[1])}px`,
          '--vol-dx': `${String(vol.arrivee[0] - vol.depart[0])}px`,
          '--vol-dy': `${String(vol.arrivee[1] - vol.depart[1])}px`,
          '--vol-duree': `${String(dureeMs)}ms`,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 3,
        } as CSSProperties
      }
    >
      {vol.texte}
    </span>
  );
}
