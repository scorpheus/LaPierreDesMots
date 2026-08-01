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
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import type { PointInteraction } from '@pierre/partage';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';

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

  return (
    <button
      type="button"
      className="cible"
      data-interaction="libre"
      data-point={point.id}
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
        boxShadow: reaction === 'reagit' ? '0 0 0 6px var(--soleil)' : 'none',
        transform: reaction === 'reagit' && !animationsDesactivees ? 'scale(1.06)' : 'none',
        transition: animationsDesactivees ? 'none' : 'transform 160ms ease-out, box-shadow 160ms'
      }}
    >
      <span className="lecture-accessible">{point.libelle}</span>
    </button>
  );
}
