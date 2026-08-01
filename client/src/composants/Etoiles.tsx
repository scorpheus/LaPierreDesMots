// Étoiles de qualité — v2 § 6.2, contrat technique v1 § 10, étendu par L2-A.
//
// RÈGLE DURE : les étoiles manquantes sont affichées EN CREUX, jamais en rouge (v2 § 6.2).
// Aucune couleur d'échec n'existe dans ce projet — l'erreur est un mouvement, pas une teinte.
//
// AJOUT DE L2-A : les étoiles peuvent porter la jauge du palier qu'elles alimentent. C'est la
// mise en œuvre de D25 point 3 au plus près de l'endroit où l'enfant regarde — « ce qui motive,
// c'est de voir la case suivante vide ». Les étoiles disent ce qui vient d'être gagné, la
// jauge dit ce qu'il reste. Les deux ensemble, ou aucune : `jauge` est facultative pour que
// l'écran de récompense les compose et que la carte n'ait pas à le faire.
import type { ReactElement } from 'react';
import type { JaugePalier as ModeleJauge } from '@pierre/partage';
import { JaugePalier } from './JaugePalier.js';

/** Chemin d'une étoile à cinq branches, dans un carré de 24. */
const TRACE_ETOILE =
  'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45L2.6 9.45l6.5-.95z';

export interface ProprietesEtoiles {
  /** Nombre d'étoiles acquises, de 0 à 3. */
  readonly acquises: number;
  /** Toujours 3 en v1 ; le paramètre existe pour ne pas enfouir la constante. */
  readonly total?: number;
  /** Côté d'une étoile, en pixels. */
  readonly taille?: number;
  /** `true` sur l'écran de récompense : les étoiles entrent l'une après l'autre. */
  readonly animees?: boolean;
  /** Délai entre deux étoiles, `TimingsHabillage.interEtoilesMs` (§ 4.1). */
  readonly interEtoilesMs?: number;
  /**
   * La jauge du palier que ces étoiles alimentent. `null` — le défaut — n'affiche rien de
   * plus : la carte et le coffre montrent des étoiles sans cascade.
   */
  readonly jauge?: ModeleJauge | null;
}

export function Etoiles({
  acquises,
  total = 3,
  taille = 64,
  animees = false,
  interEtoilesMs = 180,
  jauge = null
}: ProprietesEtoiles): ReactElement {
  const rangs = Array.from({ length: total }, (_, index) => index + 1);
  const nombreAcquises = Math.max(0, Math.min(acquises, total));

  const etoiles = (
    <div
      className="etoiles"
      role="img"
      aria-label={`${String(nombreAcquises)} étoile${nombreAcquises > 1 ? 's' : ''} sur ${String(total)}`}
      style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
    >
      {rangs.map((rang) => {
        const acquise = rang <= nombreAcquises;
        return (
          <svg
            key={rang}
            data-etoile={String(rang)}
            data-acquise={acquise ? 'oui' : 'non'}
            width={taille}
            height={taille}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            style={
              animees && acquise
                ? {
                    animation: `pierre-halo 900ms ease-in-out ${String(rang * interEtoilesMs)}ms 1`
                  }
                : undefined
            }
          >
            <path
              d={TRACE_ETOILE}
              // Acquise : soleil plein. En creux : le gris de « pas encore conquis ».
              // Jamais de rouge, jamais de barré, jamais de croix.
              fill={acquise ? 'var(--soleil)' : 'transparent'}
              stroke={acquise ? 'var(--trait)' : 'var(--grisaille)'}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );

  if (jauge === null) {
    return etoiles;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignItems: 'center'
      }}
    >
      {etoiles}
      <JaugePalier jauge={jauge} />
    </div>
  );
}
