import type { ReactElement, ReactNode } from 'react';

interface ProprietesEnteteActivite {
  readonly destination: 'carte' | 'campement';
  readonly libelleRetour: string;
  readonly nomRetour: string;
  readonly surRetour: () => void;
  readonly children: ReactNode;
  readonly ecoute?: ReactNode;
  readonly progression?: ReactNode;
  readonly className?: string;
}

/** La sortie et l'écoute entourent la consigne ; aucune commande ne recouvre la scène. */
export function EnteteActivite({
  destination,
  libelleRetour,
  nomRetour,
  surRetour,
  children,
  ecoute,
  progression,
  className = '',
}: ProprietesEnteteActivite): ReactElement {
  return (
    <header className={`zone-lecture entete-activite ${className}`}>
      <button
        type="button"
        className="cible activite-retour"
        data-vers={destination}
        aria-label={nomRetour}
        onClick={surRetour}
      >
        <span aria-hidden="true">←</span>
        <span>{libelleRetour}</span>
      </button>
      <div className="activite-consigne">{children}</div>
      {ecoute}
      {progression}
    </header>
  );
}
