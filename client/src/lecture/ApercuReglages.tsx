// Aperçu en direct des réglages de lecture — lot L2-B, v2 § 9.3.
//
// « Réglages par profil, AVEC APERÇU EN DIRECT. » L'aperçu n'est pas un ornement : c'est le
// seul moyen pour un enfant de 7 ans de choisir un réglage. Il ne sait pas ce que veut dire
// « interlettrage 0,10 em » ; il sait dire « comme ça je vois mieux ». Le curseur est donc
// muet et l'aperçu parle.
//
// Un seul point de conception, et il est important : l'aperçu est une VRAIE `ZoneDeLecture`,
// pas une imitation. S'il était une imitation, il pourrait mentir — et il mentirait le jour où
// quelqu'un changerait la zone sans changer l'aperçu.
import type { ReactElement } from 'react';

import type { ReglagesLecture } from '@pierre/partage/lecture';

import { ZoneDeLecture } from './ZoneDeLecture.js';

/**
 * Le texte d'aperçu.
 *
 * PLACEHOLDER — à valider avec l'enfant. Contraintes qui l'ont dicté, elles, ne sont pas des
 * placeholders : vocabulaire CE1, deux lignes pour que l'interligne se voie, et des lettres en
 * miroir (`b`, `d`, `p`, `q`) parce que ce sont elles qu'il confond (D18, D23) et que c'est
 * sur elles qu'un réglage d'espacement doit se juger.
 */
export const TEXTE_APERCU = 'Le petit dragon boit\nde la belle eau du puits.';

export interface ProprietesApercuReglages {
  readonly reglages: ReglagesLecture;
  /** Texte d'aperçu de remplacement — l'écran parent peut vouloir un extrait réel. */
  readonly texte?: string;
}

export function ApercuReglages({ reglages, texte }: ProprietesApercuReglages): ReactElement {
  return (
    <section
      className="apercu-reglages"
      data-apercu="lecture"
      aria-label="Aperçu de la lecture"
    >
      <ZoneDeLecture
        texte={texte ?? TEXTE_APERCU}
        reglages={reglages}
        etiquette="Aperçu : voici à quoi ressemblera le texte à lire"
        motsCles={['dragon', 'belle']}
      />
    </section>
  );
}
