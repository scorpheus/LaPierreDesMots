import type { ReactElement } from 'react';

import type { CodeCompagnon } from '@pierre/partage';
import { urlAsset } from '../api/client.js';

const ATLAS: Partial<Record<CodeCompagnon, string>> = {
  filou: 'assets/compagnons/animations/filou-8.png',
  roc: 'assets/compagnons/animations/roc-8.png',
  plume: 'assets/compagnons/animations/plume-8-v2.png',
  bulle: 'assets/compagnons/animations/bulle-8.png'
};

export interface ProprietesSpriteCompagnon {
  readonly code: CodeCompagnon;
  readonly assetStatique: string;
  readonly classe?: string;
}

/** Portrait statique sur lequel l’atlas normalisé peut se poser sans déplacer l’ancre. */
export function SpriteCompagnon({
  code,
  assetStatique,
  classe = ''
}: ProprietesSpriteCompagnon): ReactElement {
  const atlas = ATLAS[code];
  return (
    <span
      className={`compagnon-sprite${atlas === undefined ? '' : ' compagnon-sprite--atlas'} ${classe}`.trim()}
      aria-hidden="true"
      style={atlas === undefined ? undefined : { backgroundImage: `url(${urlAsset(atlas)})` }}
    >
      <img
        src={urlAsset(assetStatique)}
        alt=""
        draggable={false}
        data-portrait-compagnon={String(code)}
        style={{ filter: classe.includes('grisaille') ? 'saturate(0)' : 'none' }}
      />
    </span>
  );
}
