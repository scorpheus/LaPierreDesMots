import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import {
  demanderPersistanceStockage,
  type EtatPersistanceStockage
} from './persistance-stockage.js';

const MESSAGE: Readonly<Record<Exclude<EtatPersistanceStockage, 'hors-pwa'>, string>> = {
  durable: 'La progression est conservée durablement sur cet appareil.',
  'non-garantie':
    'La progression reste sur cet appareil, mais le navigateur peut l’effacer s’il manque de place.',
  indisponible:
    'Ce navigateur ne sait pas garantir le stockage durable. La progression reste locale à cet appareil.'
};

/** Indicateur destiné au parent ; il n'ajoute aucun message technique aux écrans de l'enfant. */
export function EtatStockagePwa(): ReactElement | null {
  const [etat, fixerEtat] = useState<EtatPersistanceStockage | 'verification'>('verification');

  useEffect(() => {
    let monte = true;
    void demanderPersistanceStockage().then((resultat) => {
      if (monte) fixerEtat(resultat);
    });
    return () => {
      monte = false;
    };
  }, []);

  if (import.meta.env.MODE !== 'pwa' || etat === 'hors-pwa') return null;

  return (
    <p
      className="zone-lecture"
      data-stockage-pwa={etat}
      role="status"
      style={{ margin: 0, padding: '0.75rem 1rem' }}
    >
      {etat === 'verification' ? 'Vérification du stockage local…' : MESSAGE[etat]}
    </p>
  );
}
