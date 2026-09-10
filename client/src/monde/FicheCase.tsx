/**
 * LA FICHE D'UNE FORME ACQUISE DE GOBI.
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
 * Depuis la demande du 10 septembre 2026, l'étagère ne monte cette fiche que pour une forme
 * acquise : une case future reste visible en gris, mais ne peut plus révéler son grand dessin
 * en couleur.
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
      couleurRevelee={une.obtenue}
      phrase={
        une.obtenue
          ? 'Tu l’as gagnée. Elle est à toi.'
          : (commentLObtenir ?? 'Elle t’attend. Continue à rallumer le monde.')
      }
      visuel={
        <img
          src={urlAsset(String(une.cristal))}
          alt=""
          width={144}
          height={144}
          aria-hidden="true"
          style={{ opacity: 1 }}
        />
      }
      surFermer={surFermer}
    />
  );
}
