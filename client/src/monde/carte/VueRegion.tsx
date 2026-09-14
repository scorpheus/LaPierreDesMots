import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { CodeRegion, IdNoeud } from '@pierre/partage';
import { DecorRegion } from './DecorRegion.js';
import type { DestinationRegion } from './modele.js';

export interface ProprietesVueRegion {
  readonly destination: DestinationRegion;
  readonly surRetour: () => void;
  readonly surContinuer: (code: CodeRegion) => void;
  readonly surRevisiter: (code: CodeRegion, noeud: IdNoeud) => void;
}

const DIAMETRE_LIEU = 64;
const ECART_LIEUX = 12;

function colonnesPourLargeur(largeur: number): 2 | 3 | 4 {
  if (largeur >= 4 * DIAMETRE_LIEU + 3 * ECART_LIEUX) return 4;
  if (largeur >= 3 * DIAMETRE_LIEU + 2 * ECART_LIEUX) return 3;
  return 2;
}

export function VueRegion({
  destination,
  surRetour,
  surContinuer,
  surRevisiter
}: ProprietesVueRegion): ReactElement {
  const { region, libelle, noeud, conseillee, noeudsAcquis, jouable } = destination;
  const total = region.noeuds.length;
  const acquis = region.noeuds.filter((etape) => noeudsAcquis.has(String(etape)));
  const scene = useRef<HTMLDivElement>(null);
  const [colonnesChemin, fixerColonnesChemin] = useState<2 | 3 | 4>(4);

  useLayoutEffect(() => {
    const cible = scene.current;
    if (cible === null) return undefined;
    const mesurer = (largeur: number): void => {
      if (largeur <= 0) return;
      const suivantes = colonnesPourLargeur(largeur);
      fixerColonnesChemin((actuelles) => (actuelles === suivantes ? actuelles : suivantes));
    };
    mesurer(cible.getBoundingClientRect().width);
    const observateur = new ResizeObserver(([entree]) => {
      if (entree !== undefined) mesurer(entree.contentRect.width);
    });
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, []);

  return (
    <section className="vue-region" data-vue-region={String(region.region)} aria-labelledby="titre-region">
      <DecorRegion region={region.region} />
      <button type="button" className="cible cible-secondaire vue-region__retour" onClick={surRetour}>
        Retour à la carte
      </button>
      <div ref={scene} className="vue-region__scene" data-region-scene={String(region.region)}>
        <h2 id="titre-region" className="titre">{libelle}</h2>
        <ol
          className="vue-region__chemin"
          aria-label={libelle}
          data-colonnes-chemin={String(colonnesChemin)}
          style={{ '--colonnes-chemin': String(colonnesChemin) } as CSSProperties}
        >
          {region.noeuds.map((etape, index) => {
            const estAcquis = noeudsAcquis.has(String(etape));
            const estConseille = jouable && noeud === etape;
            const ligne = Math.floor(index / colonnesChemin);
            const positionDansLigne = index % colonnesChemin;
            const colonne = ligne % 2 === 0
              ? positionDansLigne
              : colonnesChemin - 1 - positionDansLigne;
            return (
              <li
                key={String(etape)}
                data-lieu={String(etape)}
                data-etat-lieu={estAcquis ? 'acquis' : estConseille ? 'conseille' : 'a-decouvrir'}
                data-sens-chemin={ligne % 2 === 0 ? 'aller' : 'retour'}
                data-bout-de-ligne={positionDansLigne === colonnesChemin - 1 ? 'oui' : 'non'}
                style={{ gridRow: ligne + 1, gridColumn: colonne + 1 }}
              >
                {estAcquis && jouable ? (
                  <button
                    type="button"
                    className="cible vue-region__lieu"
                    data-revisiter={String(etape)}
                    aria-label={`Repère ${String(index + 1)}`}
                    onClick={() => surRevisiter(region.region, etape)}
                  >
                    <span aria-hidden="true">{String(index + 1)} ✦</span>
                  </button>
                ) : estConseille ? (
                  <button type="button" className="cible cible-appel vue-region__lieu"
                    aria-label={`Étape ${String(index + 1)}`}
                    onClick={() => surContinuer(region.region)}>{String(index + 1)}</button>
                ) : <span className="vue-region__numero" aria-hidden="true">{String(index + 1)}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <aside className="vue-region__action">
        {jouable && noeud !== null ? (
          <button
            type="button"
            className="cible cible-appel"
            data-depart={String(region.region)}
            data-etape={`${String(destination.rang)}/${String(total)}`}
            aria-label={`Partir vers ${libelle}`}
            onClick={() => surContinuer(region.region)}
          >
            {conseillee ? 'Partir à l’aventure' : libelle}
          </button>
        ) : null}
      </aside>
      {acquis.length === 0 ? null : <span className="vue-region__repere" aria-hidden="true" />}
    </section>
  );
}
