import type { ReactElement } from 'react';
import { detailDesEtoiles } from '../detail-etoiles.js';

interface ProprietesDetailEtoiles {
  readonly resume: Parameters<typeof detailDesEtoiles>[0];
}

/** Expliquer les étoiles conserve les mêmes conditions et les mêmes acquis. */
export function DetailEtoiles({ resume }: ProprietesDetailEtoiles): ReactElement {
  return (
    <ul data-detail-etoiles="oui" className="recompense-detail-etoiles">
      {detailDesEtoiles(resume).map((ligne) => (
        <li
          key={ligne.rang}
          data-etoile-detail={String(ligne.rang)}
          data-acquise={ligne.acquise ? 'oui' : 'non'}
          className="recompense-detail-etoile"
        >
          <span aria-hidden="true" className="recompense-detail-signe">★</span>
          <span className="recompense-detail-texte">{ligne.texte}</span>
        </li>
      ))}
    </ul>
  );
}
