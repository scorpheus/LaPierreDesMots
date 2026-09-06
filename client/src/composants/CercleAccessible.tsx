import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement, SVGProps } from 'react';

/** Une prise SVG garde 66 px CSS, même quand le dessin change de résolution ou d'orientation. */
export function CercleAccessible({
  rayonMinimal,
  ...proprietes
}: Omit<SVGProps<SVGCircleElement>, 'ref' | 'r'> & { readonly rayonMinimal: number }): ReactElement {
  const cercle = useRef<SVGCircleElement>(null);
  const [rayon, fixerRayon] = useState(rayonMinimal);
  useLayoutEffect(() => {
    const svg = cercle.current?.ownerSVGElement;
    if (svg === undefined || svg === null) return undefined;
    const mesurer = (): void => {
      // Le DOM de composant sans moteur de rendu n'expose pas cette matrice.
      const matrice = svg.getScreenCTM?.();
      if (matrice === undefined || matrice === null) return;
      const echelle = Math.min(Math.hypot(matrice.a, matrice.b), Math.hypot(matrice.c, matrice.d));
      if (echelle > 0) fixerRayon(Math.max(rayonMinimal, 33 / echelle));
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(svg);
    return () => observateur.disconnect();
  }, [rayonMinimal]);
  return <circle {...proprietes} ref={cercle} r={rayon} />;
}
