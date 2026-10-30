/**
 * CE QU'ON DEMANDE — le thème « question » du socle (T19, E08, E09 ; 9 octobre 2026).
 * Styles et jetons : `questions.css`. Garde : tests/qualite/socle-questions.spec.ts.
 *
 * - `CadreQuestion` habille un bloc de question (la question d'une histoire, la notice d'un
 *   chemin) : `data-theme-role="question"`, et le signal de changement quand `cle` change.
 * - `useSignalChangement` est ce signal, partagé avec `RepereEtape` : à chaque nouvelle clé
 *   (jamais à l'ouverture), le cadre s'allume jusqu'au toucher suivant de l'enfant, et une onde
 *   part du cadre si les animations sont permises. Le texte ne bouge jamais.
 * - `ROLE_REPONSE` se pose sur ce qu'on touche pour répondre (option, case, carte, étiquette).
 */
import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

import './questions.css';

/** À étaler sur un bouton de réponse : `<button {...ROLE_REPONSE}>`. */
export const ROLE_REPONSE = { 'data-theme-role': 'reponse' } as const;

/** À étaler sur un élément de question rendu par un autre composant (un `<p>`, une zone). */
export const ROLE_QUESTION = { 'data-theme-role': 'question' } as const;

export interface SignalChangement {
  /** Vrai de la nouvelle clé jusqu'au toucher suivant. */
  readonly nouvelle: boolean;
  /** Les attributs à poser sur le cadre. */
  readonly attributs: {
    readonly 'data-nouvelle-etape': 'oui' | 'non';
    readonly 'data-signal': '' | 'a' | 'b';
    readonly 'data-animations': 'calmes' | 'vives';
  };
}

/** Le signal « ça vient de changer », sur le cadre seulement. */
export function useSignalChangement(cle: string | number, animationsDesactivees: boolean): SignalChangement {
  const clePrecedente = useRef(cle);
  const [signal, fixerSignal] = useState(0);
  const [nouvelle, fixerNouvelle] = useState(false);

  useEffect(() => {
    if (clePrecedente.current === cle) return;
    clePrecedente.current = cle;
    fixerSignal((n) => n + 1);
    fixerNouvelle(true);
  }, [cle]);

  // Le cadre reste allumé jusqu'au toucher suivant : l'enfant a vu, il agit.
  useEffect(() => {
    if (!nouvelle) return undefined;
    const eteindre = (): void => { fixerNouvelle(false); };
    document.addEventListener('pointerdown', eteindre, { capture: true });
    return () => { document.removeEventListener('pointerdown', eteindre, { capture: true }); };
  }, [nouvelle, signal]);

  return {
    nouvelle,
    attributs: {
      'data-nouvelle-etape': nouvelle ? 'oui' : 'non',
      // Deux noms alternés : changer de nom relance l'animation CSS à chaque changement.
      'data-signal': signal === 0 ? '' : signal % 2 === 1 ? 'a' : 'b',
      'data-animations': animationsDesactivees ? 'calmes' : 'vives',
    },
  };
}

type AttributsDonnees = { readonly [cle: `data-${string}`]: string | undefined };

export interface ProprietesCadreQuestion
  extends AttributsDonnees, Pick<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'aria-live' | 'aria-atomic' | 'role' | 'className'> {
  /** Ce qui identifie la question courante : sa clé change, le cadre s'allume. */
  readonly cle: string | number;
  readonly animationsDesactivees: boolean;
  readonly children: ReactNode;
}

export function CadreQuestion({ cle, animationsDesactivees, children, className, ...attributs }: ProprietesCadreQuestion): ReactElement {
  const { attributs: signal } = useSignalChangement(cle, animationsDesactivees);
  return (
    <div {...attributs} {...signal} {...ROLE_QUESTION} className={className === undefined ? 'cadre-question' : `cadre-question ${className}`}>
      {children}
    </div>
  );
}
