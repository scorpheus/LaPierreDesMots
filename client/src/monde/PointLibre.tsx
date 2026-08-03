// Un point d'interaction libre du campement — R11, lot L2-F.
//
// C'EST LA PRISE DE R11. « Le campement compte au moins 25 points d'interaction gratuits, dont
// 10 animations uniques et 6 répliques vocales » : ce composant émet les trois attributs que la
// recette compte — `data-interaction="libre"`, `data-animation-unique="oui"`,
// `data-replique="oui"` (contrat des features v2 § 7). `parcours-campement.spec.ts` et
// `EcranCampement.test.tsx` ne comptent rien d'autre.
//
// Quatre règles portées ici, et chacune est opposable en revue :
//   1. **Gratuit.** Aucune action de moteur, aucune étoile, aucun compte. Toucher ne coûte rien.
//   2. **Jamais d'échec.** Il n'existe pas de « mauvais » point : `data-etat="echec"` n'est
//      émis nulle part, et il n'y a rien à rater ici (R14).
//   3. **≥ 64 px** de boîte tapable, quelle que soit l'échelle du décor (R16) : la zone du
//      référentiel donne la position, `minInlineSize`/`minBlockSize` garantissent le plancher.
//   4. **Un vrai `<button>`**, pas un `<g>` cliquable : le clavier, le lecteur d'écran et
//      `axe-core` y ont prise sans qu'on invente un rôle.
//
// ── CE QUE LE LOT S5 A CHANGÉ, ET POURQUOI ──────────────────────────────────────────────────
// Ce composant posait `data-animation-unique="oui"` sur quatorze points et leur donnait à tous
// **le même** `scale(1.06)`. L'attribut était compté par deux recettes ; le mouvement, par
// aucune. R11 ne demande pas quatorze attributs, elle demande dix mouvements distincts —
// c'est ce qui sépare un lieu d'un menu (D45). Le mouvement vient désormais de
// `animations-campement.ts`, il est nommé, et `data-animation` le rend comptable.
//
// Deuxième changement, et c'est celui de R18 : ces trente prises étaient **invisibles**
// (`background: transparent`, `border: none`) sur une image de fond. Rien ne disait à l'enfant
// qu'elles répondaient. Une invitation déphasée passe maintenant sur chacune à son tour.
import { useCallback, useState } from 'react';
import type { AnimationEvent as AnimationEventReact, ReactElement } from 'react';
import type { PointInteraction } from '@pierre/partage';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';
import { animationDuPoint, classeAnimation, phaseInvite } from './animations-campement.js';

export interface ProprietesPointLibre {
  readonly point: PointInteraction;
  /** Dimensions du `viewBox` du décor : la zone y est exprimée, la position s'en déduit. */
  readonly largeurScene: number;
  readonly hauteurScene: number;
  /** Coupe les transitions. `prefers-reduced-motion` et « animations calmes » (D21). */
  readonly animationsDesactivees?: boolean;
  /** Journalise la visite. N'a jamais d'effet sur la progression de l'enfant. */
  readonly surVisite?: (point: PointInteraction) => void;
}

/** Ce que le point vient de faire, pour l'afficher sans rien coûter. */
type Reaction = 'repos' | 'reagit';

export function PointLibre({
  point,
  largeurScene,
  hauteurScene,
  animationsDesactivees = false,
  surVisite
}: ProprietesPointLibre): ReactElement {
  const services = useServices();
  const [reaction, fixerReaction] = useState<Reaction>('repos');

  const [x, y, largeur, hauteur] = point.zone;

  // Le mouvement du point : éditorial d'abord, empreinte en repli. Jamais `undefined`, donc
  // aucun point ne peut se retrouver sans réaction visible.
  const animation = animationDuPoint(point.id);

  const toucher = useCallback((): void => {
    fixerReaction('reagit');
    surVisite?.(point);

    // La réaction est GRATUITE et ne peut pas échouer : si le fournisseur est muet, il se tait,
    // et le point a quand même bougé à l'écran. Aucune branche ne mène à un message d'erreur.
    if (point.reaction === 'replique') {
      void direTexte(services.voix, point.libelle, point.replique, 'gobi');
    } else if (point.reaction === 'son' || point.reaction === 'animation') {
      void services.audio.jouerEffet('depot-correct', { volume: 0.4 }).catch(() => undefined);
    }
  }, [point, services, surVisite]);

  /**
   * Le retour au repos.
   *
   * `onTransitionEnd` seul ne suffit plus : le mouvement est maintenant une ANIMATION. Et le
   * garde `target === currentTarget` n'est pas de la prudence gratuite — sous
   * `prefers-reduced-motion`, la règle globale ramène l'invitation à une itération, donc elle
   * FINIT et son `animationend` remonte jusqu'ici. Sans ce garde, le point reviendrait au repos
   * à cause d'une animation qui n'est pas la sienne.
   */
  const finDeMouvement = useCallback(
    (evenement: AnimationEventReact<HTMLButtonElement>): void => {
      if (evenement.target !== evenement.currentTarget) return;
      fixerReaction('repos');
    },
    []
  );

  return (
    <button
      type="button"
      className={
        reaction === 'reagit' && !animationsDesactivees
          ? `cible point-libre ${classeAnimation(animation)}`
          : 'cible point-libre'
      }
      data-interaction="libre"
      data-point={point.id}
      // Le mouvement est NOMMÉ dans le DOM. C'est ce qui rend R11 mesurable sur la propriété
      // (« combien de mouvements distincts ») et non plus sur l'indice (« combien d'attributs »).
      data-animation={animation}
      // Les deux attributs de comptage ne sont posés QUE quand ils sont vrais : un
      // `data-animation-unique="non"` serait compté par un sélecteur d'attribut mal écrit.
      {...(point.animationUnique && point.reaction !== 'aucune'
        ? { 'data-animation-unique': 'oui' }
        : {})}
      {...(point.replique === null ? {} : { 'data-replique': 'oui' })}
      data-reaction={reaction}
      aria-label={`Toucher ${point.libelle}`}
      onClick={toucher}
      onTransitionEnd={() => {
        fixerReaction('repos');
      }}
      onAnimationEnd={finDeMouvement}
      style={{
        position: 'absolute',
        insetInlineStart: `${String((x / largeurScene) * 100)}%`,
        insetBlockStart: `${String((y / hauteurScene) * 100)}%`,
        inlineSize: `${String((largeur / largeurScene) * 100)}%`,
        blockSize: `${String((hauteur / hauteurScene) * 100)}%`,
        // R16 : le plancher de 64 px tient même si la scène est rendue très petite.
        minInlineSize: '64px',
        minBlockSize: '64px',
        padding: 0,
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--rayon-carte, 12px)',
        // Aucun rouge, aucune alerte : la seule marque est un halo doux quand on touche.
        // Il reste posé en ligne parce qu'il porte sur `box-shadow`, tandis que le mouvement
        // nommé porte sur `transform` : deux propriétés disjointes, donc aucun arbitrage entre
        // une règle en ligne et une animation qui court.
        boxShadow: reaction === 'reagit' ? '0 0 0 6px var(--soleil)' : 'none',
        transition: animationsDesactivees ? 'none' : 'box-shadow 160ms'
      }}
    >
      {/* ── L'INVITATION AU REPOS — R18 ────────────────────────────────────────────────────
          Elle vit sur un enfant, jamais sur le bouton : le bouton porte déjà le halo de
          réaction, et deux animations de `box-shadow` sur le même élément s'écraseraient.
          `pointer-events: none` : elle ne prend rien au doigt, jamais. Elle n'existe pas du
          tout quand les animations sont coupées — un halo figé serait un cadre permanent,
          c'est-à-dire le menu déguisé que D45 refuse. */}
      {animationsDesactivees ? null : (
        <span
          className="point-libre-invite"
          data-invite="oui"
          aria-hidden="true"
          style={{ animationDelay: `${String(phaseInvite(point.id))}s` }}
        />
      )}
      <span className="lecture-accessible">{point.libelle}</span>
    </button>
  );
}
