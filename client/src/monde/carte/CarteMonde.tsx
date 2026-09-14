import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { CodeRegion, EtatRegion } from '@pierre/partage';
import { etatAfficheRegion } from '@pierre/partage/monde';
import { urlAsset } from '../../api/client.js';
import { CarteRasterProgression } from '../CarteRasterProgression.js';
import { CheminEncre } from '../CheminEncre.js';
import { Parchemin } from '../Parchemin.js';
import {
  ANCRES_CARTE,
  ANCRE_CONCLUSION,
  RASTER_CARTE
} from './modele.js';

const RAYON_PRISE = 50;
const RAYON_SCEAU = 34;

export interface ProprietesCarteMonde {
  readonly regions: readonly EtatRegion[];
  readonly decorSvg?: string;
  readonly animationsDesactivees: boolean;
  readonly conclusionAccessible: boolean;
  readonly surChoisirRegion: (code: CodeRegion) => void;
  readonly surChoisirConclusion: () => void;
}

export function CarteMonde({
  regions,
  decorSvg,
  animationsDesactivees,
  conclusionAccessible,
  surChoisirRegion,
  surChoisirConclusion
}: ProprietesCarteMonde): ReactElement {
  const support = useRef<HTMLDivElement>(null);
  const [rayonPrise, fixerRayonPrise] = useState(RAYON_PRISE);
  const [rasterIndisponible, fixerRasterIndisponible] = useState(false);
  const parCode = new Map(regions.map((region) => [String(region.region), region]));

  useLayoutEffect(() => {
    const svg = support.current?.querySelector('svg');
    if (svg === undefined || svg === null) return undefined;
    const mesurer = (): void => {
      const matrice = svg.getScreenCTM();
      const echelle = matrice === null ? 0 : Math.hypot(matrice.a, matrice.b);
      if (echelle > 0) fixerRayonPrise(Math.max(RAYON_PRISE, 33 / echelle));
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(svg);
    return () => observateur.disconnect();
  }, []);

  return (
    <div ref={support} className="carte-monde__parchemin" data-scene-adaptative="carte">
      <Parchemin fond={rasterIndisponible ? (
          decorSvg === undefined ? (
            <text x="600" y="400" textAnchor="middle" fontSize="36" fill="var(--trait)">On déplie la carte…</text>
          ) : (
            <g data-decor="carte" data-format-decor="svg-repli" aria-hidden="true" dangerouslySetInnerHTML={{ __html: decorSvg }} />
          )
        ) : (
          <CarteRasterProgression
            source={urlAsset(RASTER_CARTE)}
            avancements={ANCRES_CARTE.map(([region, x, y]) => ({
              region,
              ancre: [x, y] as const,
              pourcentageColorie: parCode.get(String(region))?.pourcentageColorie ?? 0
            }))}
            conclusionActive={conclusionAccessible}
            surErreur={() => fixerRasterIndisponible(true)}
          />
        )}>
        {decorSvg === undefined ? null : <defs data-definitions-decor="carte" aria-hidden="true" dangerouslySetInnerHTML={{ __html: decorSvg }} />}
        <CheminEncre
          etapes={ANCRES_CARTE.map(([, x, y]) => [x, y] as const)}
          parts={ANCRES_CARTE.slice(0, -1).map(([code]) => parCode.get(String(code))?.pourcentageColorie ?? 0)}
          animationsDesactivees={animationsDesactivees}
        />
        {ANCRES_CARTE.map(([code, x, y, libelle]) => {
          const region = parCode.get(String(code));
          const etat = region === undefined ? 'voilee' : etatAfficheRegion(region);
          const colorie = region?.pourcentageColorie ?? 0;
          const total = region?.noeuds.length ?? 0;
          const franchis = Math.round(colorie * total);
          const lignesLibelle = libelle === 'La Cité des Histoires' ? ['La Cité', 'des Histoires'] : [libelle];
          return (
            <g key={String(code)} data-region={String(code)} data-region-etat={etat} data-ancre-raster={`${String(x)},${String(y)}`}>
              <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <circle cx={x} cy={y} r={RAYON_SCEAU + (etat === 'terminee' ? 9 : 0)} fill="var(--parchemin)" fillOpacity={etat === 'voilee' ? 0 : 0.78} stroke={etat === 'terminee' ? 'var(--soleil)' : 'var(--trait)'} strokeWidth={etat === 'ouverte' ? 8 : 4} strokeDasharray={etat === 'voilee' ? '10 9' : undefined} />
                {etat === 'terminee' ? <path d="M0,-20 L6,-6 L20,-5 L9,4 L13,18 L0,10 L-13,18 L-9,4 L-20,-5 L-6,-6 Z" transform={`translate(${String(x)} ${String(y)})`} fill="var(--soleil)" stroke="var(--trait)" strokeWidth={4} /> : null}
                {etat === 'ouverte' ? <circle data-jauge-restant={(1 - colorie).toFixed(2)} cx={x} cy={y} r={RAYON_SCEAU + 6} pathLength={1} fill="none" stroke="var(--grisaille)" strokeWidth={7} strokeLinecap="round" strokeDasharray={`${String(Math.max(0, 1 - colorie))} 1`} transform={`rotate(-90 ${String(x)} ${String(y)})`} /> : null}
                {total > 0 ? <text x={x} y={y - 50} textAnchor="middle" fontSize={20} fill="var(--trait)" data-avancement-region={`${String(franchis)}/${String(total)}`}>{franchis}/{total}</text> : null}
                <rect x={x - 98} y={y + 50} width={196} height={lignesLibelle.length === 1 ? 43 : 70} rx={10} fill="var(--parchemin)" stroke="var(--trait)" strokeWidth={3} />
                <text x={x} y={y + 79} textAnchor="middle" fontSize={25} fill="var(--trait)">
                  {lignesLibelle.map((ligne, index) => <tspan key={ligne} x={x} dy={index === 0 ? 0 : 27}>{index > 0 ? ' ' : ''}{ligne}</tspan>)}
                </text>
              </g>
              <circle
                cx={Math.max(rayonPrise, Math.min(x, 1200 - rayonPrise))}
                cy={Math.max(rayonPrise, Math.min(y, 800 - rayonPrise))}
                r={rayonPrise}
                fill="var(--parchemin)"
                fillOpacity={0}
                role="button"
                tabIndex={0}
                aria-label={`${libelle} — ${etat}`}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={() => surChoisirRegion(code)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') surChoisirRegion(code); }}
              />
            </g>
          );
        })}
        {conclusionAccessible ? (
          <g data-conclusion-centrale-groupe="pierre">
            <circle cx={ANCRE_CONCLUSION[0]} cy={ANCRE_CONCLUSION[1]} r={RAYON_SCEAU + 11} fill="var(--parchemin)" stroke="var(--soleil)" strokeWidth={7} />
            <circle data-conclusion-centrale="pierre" data-ancre-raster="600,470" cx={ANCRE_CONCLUSION[0]} cy={ANCRE_CONCLUSION[1]} r={rayonPrise} fill="var(--parchemin)" fillOpacity={0} role="button" tabIndex={0} aria-label="La Pierre des Mots est entière" style={{ cursor: 'pointer' }} onClick={surChoisirConclusion} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') surChoisirConclusion(); }} />
          </g>
        ) : null}
      </Parchemin>
    </div>
  );
}
