// Les quatre compagnons — Filou, Bulle, Roc, Plume (v2 § 4.3). Lot L2-F.
//
// « Chacun est rencontré au bout d'une région, apporte une valeur, un domaine et une mécanique
// propre. Avant une mission, l'enfant choisit qui l'accompagne. »
//
// Deux règles de conception portées ici :
//
//   1. **Un compagnon non rallié est VISIBLE, pas caché.** Il est grisé, comme le reste du
//      monde en Grisaille — « un monde à moitié colorié appelle qu'on le termine » (v2 § 3.2).
//      Le cacher supprimerait exactement le désir qui fait revenir.
//   2. **Aucun compagnon n'est un échec.** Le grisé n'est pas un verrou : la tuile dit où on le
//      rencontrera, jamais qu'on a raté quelque chose (R14).
//
import { useState } from 'react';
import type { ReactElement } from 'react';

import { urlAsset } from '../api/client.js';
import { FicheObjet } from '../monde/FicheObjet.js';
import type { Compagnon as CompagnonDuMonde } from '@pierre/partage';

export interface ProprietesCompagnon {
  readonly compagnon: CompagnonDuMonde;
  /** Libellé de la région où on le rencontre, pour la tuile non ralliée. */
  readonly libelleRegion?: string;
  readonly surChoisir?: (compagnon: CompagnonDuMonde) => void;
}

export function Compagnon({
  compagnon,
  libelleRegion,
  surChoisir
}: ProprietesCompagnon): ReactElement {
  const rallie = compagnon.rallieLe !== null;
  const [ficheOuverte, fixerFicheOuverte] = useState(false);
  const portrait = (
    <img
      src={urlAsset(String(compagnon.asset))}
      alt=""
      draggable={false}
      data-portrait-compagnon={String(compagnon.code)}
      // La Grisaille garde exactement le même portrait : aucune seconde image, aucune identité
      // différente avant et après la rencontre.
      style={{ filter: rallie ? 'none' : 'saturate(0)' }}
    />
  );

  const contenu = (
    <>
      <span className="compagnon-portrait compagnon-portrait--tuile" aria-hidden="true">
        {portrait}
      </span>
      <span className="titre" style={{ fontSize: '1.125rem' }}>
        {compagnon.libelle}
      </span>
      <span style={{ fontSize: '0.95rem' }}>
        {rallie
          ? compagnon.valeur
          : `On le rencontre ${libelleRegion === undefined ? 'plus loin' : `à ${libelleRegion}`}.`}
      </span>
    </>
  );

  const style = {
    flexDirection: 'column' as const,
    gap: '0.5rem',
    padding: '1rem',
    inlineSize: 'min(14rem, 100%)',
    textAlign: 'center' as const
  };

  // ── R26 — LA BANDE SE TAPE, RALLIÉE OU NON ────────────────────────────────────────────────
  //
  // « on peut cliquer et voir les Gobi. Il faudrait la même chose en fait dans […] la bande
  // aussi. »
  //
  // Avant ce lot, la tuile n'était un bouton QUE si le compagnon était rallié ET qu'un hôte
  // fournissait `surChoisir`. Or `surChoisir` n'était fourni nulle part — recensé par objet,
  // c'est l'un des 7 rappels morts du client. **Aucune tuile n'était donc tapable, jamais**, et
  // le père a tapé dans le vide.
  //
  // Chaque tuile ouvre désormais sa fiche. `surChoisir` reste prioritaire quand un hôte le
  // donne : le jour où « avant une mission, l'enfant choisit qui l'accompagne » (v2 § 4.3) sera
  // implanté, il reprend la main sans qu'on touche à ce fichier.
  const ouvrir = (): void => {
    if (rallie && surChoisir !== undefined) {
      surChoisir(compagnon);
      return;
    }
    fixerFicheOuverte(true);
  };

  return (
    <>
      <button
        type="button"
        className="cible"
        data-compagnon={compagnon.code}
        data-rallie={rallie ? 'oui' : 'non'}
        // Le libellé dit ce qui va se passer, et il n'est pas le même dans les deux cas : un
        // compagnon non rallié ne « part » avec personne, il se regarde.
        aria-label={
          rallie && surChoisir !== undefined
            ? `Partir avec ${compagnon.libelle}`
            : `Regarder ${compagnon.libelle}`
        }
        onClick={ouvrir}
        style={style}
      >
        {contenu}
      </button>

      {ficheOuverte ? (
        <FicheObjet
          marqueRacine={{ 'data-fiche-compagnon': String(compagnon.code) }}
          libelleAria={
            rallie
              ? `${compagnon.libelle}, dans ta bande`
              : `${compagnon.libelle}, pas encore rencontré`
          }
          titre={compagnon.libelle}
          obtenu={rallie}
          // Comme le butin et les Éclats : la couleur se découvre. C'est déjà ce que la tuile
          // fait avec son `saturate(0)` ; la fiche ne pouvait pas dire l'inverse.
          couleurRevelee={false}
          phrase={
            rallie
              ? compagnon.valeur
              : `On le rencontre ${
                  libelleRegion === undefined ? 'plus loin' : `à ${libelleRegion}`
                }.`
          }
          visuel={<span className="compagnon-portrait compagnon-portrait--fiche">{portrait}</span>}
          surFermer={() => {
            fixerFicheOuverte(false);
          }}
        />
      ) : null}
    </>
  );
}
