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
// PLACEHOLDER — les quatre dessins sont des SVG bouchons écrits à la main (D2). La forme
// canonique des compagnons n'est pas plus validée que celle de Gobi (D7, D31 étape A).
import { useState } from 'react';
import type { ReactElement } from 'react';

import { FicheObjet } from '../monde/FicheObjet.js';
import type { Compagnon as CompagnonDuMonde } from '@pierre/partage';

export interface ProprietesCompagnon {
  readonly compagnon: CompagnonDuMonde;
  /** Libellé de la région où on le rencontre, pour la tuile non ralliée. */
  readonly libelleRegion?: string;
  readonly surChoisir?: (compagnon: CompagnonDuMonde) => void;
}

/** Silhouettes bouchons : une forme d'un seul tenant par compagnon, reconnaissable en ombre. */
const SILHOUETTES: Readonly<Record<string, { readonly d: string; readonly teinte: string }>> = {
  filou: { d: 'M32,58 L14,34 L20,10 L32,22 L44,10 L50,34 Z', teinte: '#E8743B' },
  bulle: { d: 'M32,6 C46,6 56,20 56,34 C56,50 46,60 32,60 C18,60 8,50 8,34 C8,20 18,6 32,6 Z', teinte: '#2FA8E0' },
  roc: { d: 'M14,58 L10,22 L24,8 L44,8 L56,24 L52,58 Z', teinte: '#8E97A8' },
  plume: { d: 'M32,4 L52,26 L40,32 L52,40 L32,60 L12,40 L24,32 L12,26 Z', teinte: '#3DDC97' }
};

const SILHOUETTE_DE_REPLI = { d: 'M32,8 L56,32 L32,56 L8,32 Z', teinte: '#FFC93C' };

export function Compagnon({
  compagnon,
  libelleRegion,
  surChoisir
}: ProprietesCompagnon): ReactElement {
  const rallie = compagnon.rallieLe !== null;
  const silhouette = SILHOUETTES[String(compagnon.code)] ?? SILHOUETTE_DE_REPLI;
  const [ficheOuverte, fixerFicheOuverte] = useState(false);

  const contenu = (
    <>
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
        // La Grisaille, en un seul filtre : le même dessin, deux états. Jamais un second asset.
        style={{ filter: rallie ? 'none' : 'saturate(0)' }}
      >
        <path
          d={silhouette.d}
          fill={silhouette.teinte}
          stroke="var(--trait)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
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
          visuel={
            <svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
              <path
                d={silhouette.d}
                fill={silhouette.teinte}
                stroke="var(--trait)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </svg>
          }
          surFermer={() => {
            fixerFicheOuverte(false);
          }}
        />
      ) : null}
    </>
  );
}
