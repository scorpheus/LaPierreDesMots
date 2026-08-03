/**
 * CE QU'UNE CASE DE L'ÉTAGÈRE ATTEND — R24, demandé par le père le 2026-08-03.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « même si on ne les a pas, tous les items à récupérer devraient être affichés en grand dans un
 * popup avec une description de ce qu'on peut gagner, et on aura la couleur, et avec une croix
 * ou un bouton retour — pour voir tous les items à gagner dans le campement et dans le coffre. »
 *
 * ── LE PANNEAU EST DÉSORMAIS PARTAGÉ ──────────────────────────────────────────────────────────
 * Ce fichier ne porte plus la mise en page : elle vit dans `FicheObjet`, parce que le père a
 * ensuite demandé la même chose pour le butin, la bande et les Éclats (R26, R28). Quatre
 * collections, un seul panneau — sans quoi les quatre auraient divergé.
 *
 * Ce qui reste ici est ce qui appartient à l'étagère de Gobi, et à elle seule : **la couleur y
 * est montrée**. C'est le seul endroit du jeu où la Grisaille se lève par avance, et c'est
 * assumé — le panneau annonce en toutes lettres que la couleur n'est pas encore gagnée. Les
 * Éclats et le butin font l'inverse : « c'est à deviner ».
 *
 * ── LA DÉCISION QUI A FAILLI ÊTRE UNE FAUTE, ET QUI VAUT D'ÊTRE RELUE ─────────────────────────
 * Le catalogue ne déclare NI couleur NI description : `grapheme`, `libelle`, `cristal`, rien
 * d'autre. J'ai failli dériver une teinte du graphème — ç'aurait été une promesse FAUSSE, et une
 * promesse fausse vaut moins que pas de promesse. Mesuré : les cristaux portent déjà leurs
 * couleurs sur disque (`fill="#ADC8E0"`, `fill="#C5EAFA"`). Les montrer EST donc ce qui était
 * demandé.
 */
import type { ReactElement } from 'react';

import { urlAsset } from '../api/client.js';

import { FicheObjet } from './FicheObjet.js';

import type { CaseEtagere } from '@pierre/partage/monde';

export interface ProprietesFicheCase {
  readonly une: CaseEtagere;
  /** Ce qu'il faut faire pour l'obtenir. Vient des données, jamais d'ici. */
  readonly commentLObtenir: string | null;
  readonly surFermer: () => void;
}

export function FicheCase({ une, commentLObtenir, surFermer }: ProprietesFicheCase): ReactElement {
  return (
    <FicheObjet
      marqueRacine={{ 'data-fiche-case': String(une.grapheme) }}
      libelleAria={une.obtenue ? `${une.libelle}, gagnée` : `${une.libelle}, pas encore gagnée`}
      titre={une.libelle}
      obtenu={une.obtenue}
      // ── LA COULEUR EST MONTRÉE ICI, ET SEULEMENT ICI ─────────────────────────────────────
      // « et on aura la couleur », mot pour mot. C'est la promesse de l'étagère de Gobi. Les
      // autres collections passent `false` : leur couleur est une devinette.
      couleurRevelee
      phrase={
        une.obtenue
          ? 'Tu l’as gagnée. Elle est à toi.'
          : (commentLObtenir ?? 'Elle t’attend. Continue à rallumer le monde.')
      }
      visuel={
        <img
          src={urlAsset(String(une.cristal))}
          alt=""
          width={96}
          height={96}
          aria-hidden="true"
          style={{ opacity: 1 }}
        />
      }
      surFermer={surFermer}
    />
  );
}
