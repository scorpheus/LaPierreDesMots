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
import { useEffect, useMemo, useState } from 'react';
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
  const [rastersIndisponibles, fixerRastersIndisponibles] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const cheminRaster = `assets/ouverture/${tableau.code}.png`;
  const rasterIndisponible = rastersIndisponibles.has(tableau.code);
  const urlRaster = useMemo(() => urlAsset(cheminRaster), [cheminRaster]);

  useEffect(() => {
    if (decorInjecte !== null) {
      fixerDecor(decorInjecte);
      return;
    }
    fixerDecor(null);
    // Le raster validé est la source préférée. Le SVG historique n'est chargé qu'après un
    // vrai échec de l'image : ainsi, la publication d'un PNG suffit à embellir le tableau sans
    // modifier le récit, et l'absence des quatre images restantes ne produit jamais un trou.
    if (!rasterIndisponible) {
      return;
    }
    let vivant = true;
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
  }, [tableau.asset, decorInjecte, rasterIndisponible]);

  return (
    <figure
      data-tableau={tableau.code}
      data-tableau-rang={String(rang)}
      className="ouverture-tableau"
    >
      <div
        className="ouverture-tableau__decor"
        data-decor={tableau.code}
        style={{ animation: animationsDesactivees ? 'none' : undefined }}
      >
        {decorInjecte === null && !rasterIndisponible ? (
          <img
            src={urlRaster}
            alt={`Image ${String(rang)} sur ${String(total)}`}
            data-decor-raster={tableau.code}
            data-format-decor="raster"
            draggable={false}
            onError={() => {
              fixerRastersIndisponibles((precedents) => {
                const suivants = new Set(precedents);
                suivants.add(tableau.code);
                return suivants;
              });
            }}
          />
        ) : (
          <svg
            viewBox="0 0 1200 800"
            role="img"
            aria-label={`Image ${String(rang)} sur ${String(total)}`}
            data-decor-svg={tableau.code}
            data-format-decor="svg-repli"
          >
            {decor === null ? null : (
              /* Fichier de contenu DU DÉPÔT, servi par le serveur local : ni tiers, ni saisie. */
              <g dangerouslySetInnerHTML={{ __html: decor }} />
            )}
          </svg>
        )}
      </div>

      {/* Le champ de lecture. Fond parchemin, Andika, aucune animation — v2 § 9.3. */}
      <figcaption
        data-texte-tableau={tableau.code}
        className="parchemin ouverture-tableau__texte"
      >
        {tableau.texte}
      </figcaption>
    </figure>
  );
}
