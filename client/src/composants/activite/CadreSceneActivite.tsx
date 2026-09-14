import type { ReactElement, ReactNode } from 'react';

interface ProprietesCadreSceneActivite {
  readonly children: ReactNode;
  readonly decor?: ReactNode;
}

/** Un même repère dimensionne le décor et le moteur, indépendamment de leur mécanique. */
export function CadreSceneActivite({ children, decor }: ProprietesCadreSceneActivite): ReactElement {
  return (
    <div className="scene-noeud cadre-scene-activite">
      {decor}
      <div className="porteur-moteur">{children}</div>
    </div>
  );
}
