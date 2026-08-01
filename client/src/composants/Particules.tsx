// Couche de particules — v2 § 8, D26 (lot L2-A).
//
// Un seul canevas, à la racine de l'application, en surimpression et transparent aux doigts.
// Il ne rend rien par lui-même : c'est `RetourSensoriel` qui déclenche les gerbes, parce que
// « le spectaculaire est déclenché par l'acte de lire » (D26) et que ce déclenchement doit
// vivre en un point unique.
//
// **Supprimé sous `prefers-reduced-motion`** : le composant rend `null`, il n'y a alors même
// pas de canevas dans le DOM. `emettreParticules` refuserait déjà d'émettre, mais un canevas
// vide qui traîne est un canevas qu'on finira par croire actif.
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

import { ATTRIBUT_COMPTE, enregistrerCanevas } from '../gamefeel/particules.js';

export interface ProprietesParticules {
  /** Reflète `EtatMagasin.animationsDesactivees` — le réglage « animations calmes » (v2 § 8). */
  readonly animationsDesactivees: boolean;
}

export function Particules({ animationsDesactivees }: ProprietesParticules): ReactElement | null {
  const canevas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const element = canevas.current;
    if (element === null) {
      return undefined;
    }

    // Le canevas suit la fenêtre. On redimensionne au DPR pour que les particules ne soient
    // pas floues sur la tablette (1920 × 1200, DPR 2) : un canevas dimensionné en CSS seul est
    // étiré, et une gerbe étirée ressemble à un défaut d'affichage.
    const ajuster = (): void => {
      const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
      element.width = Math.round(element.clientWidth * dpr);
      element.height = Math.round(element.clientHeight * dpr);
      const contexte = element.getContext('2d');
      contexte?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajuster();

    const desinscrire = enregistrerCanevas(element);
    globalThis.addEventListener?.('resize', ajuster);
    return () => {
      globalThis.removeEventListener?.('resize', ajuster);
      desinscrire();
    };
  }, []);

  if (animationsDesactivees) {
    return null;
  }

  return (
    <canvas
      ref={canevas}
      data-particules-couche="oui"
      // Le compteur commence à zéro et devient mesurable dès la première gerbe : c'est le
      // chiffre que le contrat de sortie de L2-A relève (« ≤ 14 particules au pic »).
      {...{ [ATTRIBUT_COMPTE]: '0' }}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        inlineSize: '100vw',
        blockSize: '100vh',
        // Transparent aux doigts : la couche ne doit JAMAIS intercepter un tap de l'enfant.
        pointerEvents: 'none',
        zIndex: 40
      }}
    />
  );
}
