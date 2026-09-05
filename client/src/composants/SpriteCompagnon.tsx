import type { ReactElement } from 'react';

import type { CodeCompagnon } from '@pierre/partage';
import { urlAsset } from '../api/client.js';

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
  return (
    <span
      className={`compagnon-sprite compagnon-sprite--canonique ${classe}`.trim()}
      aria-hidden="true"
      data-compagnon-sprite={code}
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
