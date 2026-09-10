import { useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './fenetre-recompense.css';

export function FenetreRecompense({ titre, children, surFermer }: {
  readonly titre: string;
  readonly children: ReactNode;
  readonly surFermer: () => void;
}): ReactElement {
  const reference = useRef<HTMLDialogElement>(null);
  const identifiant = useId();
  useEffect(() => {
    const dialogue = reference.current;
    const origine = document.activeElement;
    if (dialogue !== null) {
      if (typeof dialogue.showModal === 'function') dialogue.showModal();
      else dialogue.setAttribute('open', '');
    }
    return () => {
      if (typeof dialogue?.close === 'function') dialogue.close();
      if (origine instanceof HTMLElement && origine.isConnected) origine.focus();
    };
  }, []);
  return (
    <dialog ref={reference} className="fenetre-recompense" aria-labelledby={identifiant}
      onCancel={(evenement) => { evenement.preventDefault(); surFermer(); }}
      onClick={(evenement) => { if (evenement.target === evenement.currentTarget) surFermer(); }}>
      <div className="fenetre-recompense__carte">
        <span className="fenetre-recompense__couronne" aria-hidden="true">✦ ★ ✦</span>
        <h2 id={identifiant} className="titre">{titre}</h2>
        <div className="fenetre-recompense__illustration">{children}</div>
        <button type="button" className="cible fenetre-recompense__fermer" onClick={surFermer}>Fermer</button>
      </div>
    </dialog>
  );
}
