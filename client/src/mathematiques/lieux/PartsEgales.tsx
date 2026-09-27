import type { ReactElement } from 'react';

/** Les deux découpages gardent un tout de même aire et des parts rigoureusement égales. */
export function DisqueDeParts({ total, couvertes, couleur }: {
  readonly total: number; readonly couvertes: number; readonly couleur: string;
}): ReactElement {
  return <svg viewBox="0 0 204 204" aria-hidden="true" data-parts-egales="disque"
    style={{ display: 'block', width: 'min(100%, 12rem)', height: 'auto', margin: '.5rem auto' }}>
    {Array.from({ length: total }, (_, rang) => {
      const angle = (rang / total - .25) * Math.PI * 2;
      const fin = ((rang + 1) / total - .25) * Math.PI * 2;
      return <path key={rang} data-part-couverte={rang < couvertes ? 'oui' : 'non'}
        d={`M102 102L${102 + 100 * Math.cos(angle)} ${102 + 100 * Math.sin(angle)}A100 100 0 ${total === 1 ? 1 : 0} 1 ${102 + 100 * Math.cos(fin)} ${102 + 100 * Math.sin(fin)}Z`}
        fill={rang < couvertes ? couleur : '#fffdf4'} stroke="#70563a" strokeWidth="2" />;
    })}
  </svg>;
}
