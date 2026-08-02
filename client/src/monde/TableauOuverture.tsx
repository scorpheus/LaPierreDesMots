// Un tableau de la séquence d'ouverture — D35, lot N4.
//
// Un tableau = un décor + une phrase. Rien d'autre : pas de bouton « suivant » ici, pas de
// compteur, pas de barre de progression déguisée. Toute la commande est dans `EcranOuverture`,
// qui n'en a qu'une (voir là-bas), et ce composant reste montable seul dans un test.
//
// TROIS RÈGLES PORTÉES ICI, ET AUCUNE N'EST COSMÉTIQUE
//
//   1. **Le décor s'agite, le texte jamais** (v2 § 9.3, règle non négociable de CLAUDE.md).
//      Le décor peut apparaître en fondu ; la phrase, elle, est posée d'un coup, sur fond
//      parchemin, en Andika. Dès qu'il y a du déchiffrage, rien ne bouge dans le champ de
//      lecture — et l'enfant DÉCHIFFRE cette phrase, il ne la survole pas (D14).
//   2. **Le texte est toujours entier, tout de suite.** Aucune apparition lettre à lettre,
//      aucun défilement : un enfant qui lit lentement doit pouvoir revenir en arrière avec
//      les yeux. Une machine à écrire lui retirerait le début de la phrase pendant qu'il en
//      déchiffre la fin.
//   3. **Le décor absent n'est jamais une erreur.** Tant que le SVG n'est pas chargé, le
//      tableau montre sa phrase sur le parchemin nu. La phrase EST le tableau ; l'image
//      l'accompagne.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import type { TableauOuverture as ModeleTableau } from '@pierre/partage/ouverture';

import { urlAsset } from '../api/client.js';
import { interieurDuSvg } from '../ecrans/EcranCarte.js';

export interface ProprietesTableauOuverture {
  readonly tableau: ModeleTableau;
  /** Rang affiché, à partir de 1 — sert au repérage du parent et aux tests, jamais à noter. */
  readonly rang: number;
  readonly total: number;
  readonly animationsDesactivees?: boolean;
  /** Décor déjà chargé. Injecté par les tests ; récupéré par le réseau sinon. */
  readonly decor?: string | null;
}

export function TableauOuverture({
  tableau,
  rang,
  total,
  animationsDesactivees = false,
  decor: decorInjecte = null
}: ProprietesTableauOuverture): ReactElement {
  const [decor, fixerDecor] = useState<string | null>(decorInjecte);

  useEffect(() => {
    if (decorInjecte !== null) {
      fixerDecor(decorInjecte);
      return;
    }
    let vivant = true;
    fixerDecor(null);
    void fetch(urlAsset(tableau.asset), { headers: { Accept: 'image/svg+xml' } })
      .then(async (reponse) => (reponse.ok ? interieurDuSvg(await reponse.text()) : null))
      // Un décor manquant n'interrompt RIEN : la phrase reste lisible, la séquence continue.
      // « Jamais d'écran vide, jamais d'écran d'erreur » — le décor est optionnel, pas le récit.
      .catch(() => null)
      .then((interieur) => {
        if (vivant) {
          fixerDecor(interieur);
        }
      });
    return () => {
      vivant = false;
    };
  }, [tableau.asset, decorInjecte]);

  return (
    <figure
      data-tableau={tableau.code}
      data-tableau-rang={String(rang)}
      style={{ margin: 0, display: 'grid', gap: '1.5rem', justifyItems: 'center' }}
    >
      <svg
        viewBox="0 0 1200 800"
        role="img"
        aria-label={`Image ${String(rang)} sur ${String(total)}`}
        data-decor={tableau.code}
        style={{
          inlineSize: '100%',
          maxInlineSize: '1100px',
          blockSize: 'auto',
          display: 'block',
          borderRadius: '1rem',
          // Le SEUL mouvement de ce composant, et il est hors du champ de lecture.
          animation: animationsDesactivees ? 'none' : 'apparition-tableau 420ms ease-out both'
        }}
      >
        {decor === null ? null : (
          /* Fichier de contenu DU DÉPÔT, servi par le serveur local : ni tiers, ni saisie. */
          <g dangerouslySetInnerHTML={{ __html: decor }} />
        )}
      </svg>

      {/* Le champ de lecture. Fond parchemin, Andika, aucune animation — v2 § 9.3. */}
      <figcaption
        data-texte-tableau={tableau.code}
        className="parchemin"
        style={{
          background: 'var(--parchemin)',
          color: 'var(--trait)',
          padding: '1.25rem 1.75rem',
          borderRadius: '0.75rem',
          maxInlineSize: '46ch',
          fontSize: '1.5rem',
          lineHeight: 1.7,
          textAlign: 'center',
          animation: 'none'
        }}
      >
        {tableau.texte}
      </figcaption>
    </figure>
  );
}
