import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeRegion } from '@pierre/partage';
import { urlAsset } from '../../api/client.js';
import { interieurDuSvg, DECOR_REGION } from './modele.js';

/**
 * Les SVG d'habillage contiennent des rasters. Ils sont injectés dans le document plutôt que
 * servis par une balise img : le navigateur peut alors résoudre leurs images via le même port
 * d'assets que le reste de l'application, y compris en PWA.
 */
function normaliserLiensDuDecor(svg: string): string {
  return svg.replace(
    /\bhref=(['"])(?:\/api\/contenu\/assets\/)?(assets\/[^'"]+)\1/gu,
    (_entier, guillemet, chemin) => `href=${guillemet}${urlAsset(chemin)}${guillemet}`
  );
}

export interface ProprietesDecorRegion {
  readonly region: CodeRegion;
}

export function DecorRegion({ region }: ProprietesDecorRegion): ReactElement {
  const decor = useQuery({
    queryKey: ['carte', 'decor-region', region],
    queryFn: async () => {
      const reponse = await fetch(urlAsset(DECOR_REGION[region]), {
        headers: { Accept: 'image/svg+xml' }
      });
      if (!reponse.ok) throw new Error(`Décor de région introuvable (${String(reponse.status)}).`);
      return normaliserLiensDuDecor(interieurDuSvg(await reponse.text()));
    }
  });

  return (
    <svg
      className="vue-region__decor"
      viewBox="0 0 960 600"
      data-decor-region={region}
      data-format-decor="svg-injecte"
      aria-hidden="true"
    >
      {decor.data === undefined ? null : <g dangerouslySetInnerHTML={{ __html: decor.data }} />}
    </svg>
  );
}
