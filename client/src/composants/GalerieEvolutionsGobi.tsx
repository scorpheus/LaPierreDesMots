/**
 * Le parcours visuel de Gobi, ouvert depuis son portrait au campement.
 *
 * Les stades déjà atteints montrent le rendu raster complet. Les stades suivants restent une
 * promesse : seul leur contour gris est visible, sans nom ni couleur. Le contour emploie comme
 * masque le SVG déclaré dans le référentiel ; il ne révèle donc jamais le raster en couleur.
 */
import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import type { CodeStadeGobi } from '@pierre/partage';
import type { StadeGobi } from '@pierre/partage/monde';

import { urlAsset } from '../api/client.js';

export interface ProprietesGalerieEvolutionsGobi {
  readonly stades: readonly StadeGobi[];
  readonly stadeActuel: CodeStadeGobi;
  readonly surFermer: () => void;
}

function assetRaster(rang: number): string {
  return `assets/gobi/stades/stade-${String(rang)}.webp`;
}

function styleMasque(asset: string): CSSProperties {
  const adresse = `url("${urlAsset(asset)}")`;
  return {
    WebkitMaskImage: adresse,
    maskImage: adresse,
  };
}

export function GalerieEvolutionsGobi({
  stades,
  stadeActuel,
  surFermer,
}: ProprietesGalerieEvolutionsGobi): ReactElement {
  const fermer = useRef<HTMLButtonElement | null>(null);
  const surFermerRef = useRef(surFermer);
  surFermerRef.current = surFermer;

  const ordonnes = [...stades].sort((gauche, droite) => gauche.rang - droite.rang);
  const rangActuel = ordonnes.find((stade) => stade.code === stadeActuel)?.rang ?? 1;

  useEffect(() => {
    fermer.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === 'Escape') surFermerRef.current();
    };
    globalThis.addEventListener?.('keydown', surTouche);
    return () => {
      globalThis.removeEventListener?.('keydown', surTouche);
    };
  }, []);

  return (
    <div
      className="galerie-evolutions-gobi"
      data-galerie-evolutions-gobi="oui"
      role="dialog"
      aria-modal="true"
      aria-label="L’évolution de Gobi"
      onClick={surFermer}
    >
      <section
        className="galerie-evolutions-gobi-fenetre"
        onClick={(evenement) => {
          evenement.stopPropagation();
        }}
      >
        <header className="galerie-evolutions-gobi-entete">
          <div>
            <h2 className="titre">Gobi au fil du chemin</h2>
            <p className="zone-lecture">
              {rangActuel} évolution{rangActuel > 1 ? 's' : ''} découverte{rangActuel > 1 ? 's' : ''}
              {' '}sur {ordonnes.length}.
            </p>
          </div>
          <button
            ref={fermer}
            type="button"
            className="cible cible-appel"
            data-fermer-evolutions-gobi="oui"
            aria-label="Fermer les évolutions de Gobi"
            onClick={surFermer}
          >
            ← Revenir
          </button>
        </header>

        <ol className="galerie-evolutions-gobi-liste">
          {ordonnes.map((stade) => {
            const acquis = stade.rang <= rangActuel;
            const actuel = stade.rang === rangActuel;
            return (
              <li
                key={stade.code}
                className="galerie-evolutions-gobi-etape"
                data-evolution-stade={stade.code}
                data-stade-acquis={acquis ? 'oui' : 'non'}
                data-stade-actuel={actuel ? 'oui' : 'non'}
                aria-label={
                  acquis
                    ? `${stade.libelle}, évolution ${String(stade.rang)} sur ${String(ordonnes.length)}`
                    : `Évolution ${String(stade.rang)} sur ${String(ordonnes.length)}, à découvrir`
                }
              >
                <span className="galerie-evolutions-gobi-rang" aria-hidden="true">
                  {stade.rang}
                </span>
                {acquis ? (
                  <img
                    src={urlAsset(assetRaster(stade.rang))}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                  />
                ) : (
                  <span className="gobi-contour" data-gobi-contour="oui" aria-hidden="true">
                    <span
                      className="gobi-contour-couche gobi-contour-couche--exterieure"
                      style={styleMasque(String(stade.asset))}
                    />
                    <span
                      className="gobi-contour-couche gobi-contour-couche--interieure"
                      style={styleMasque(String(stade.asset))}
                    />
                  </span>
                )}
                <strong>{acquis ? stade.libelle : 'À découvrir'}</strong>
                {actuel ? <span className="galerie-evolutions-gobi-actuel">Aujourd’hui</span> : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
