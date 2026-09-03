// Le butin du campement — ce que l'enfant a rapporté de chaque région. Lot S5.
//
// ── LE DÉFAUT QUE CE COMPOSANT SOLDE, MESURÉ AVANT D'ÊTRE ÉCRIT ─────────────────────────────
//
// `contenu/monde/campement.json` déclare **six objets rapportés**, un par région : le fanion de
// la Clairière, la géode des Galeries, le nénuphar du Marais Jumeau, la feuille de la Forêt
// Muette, la braise du Volcan, le livre de la Cité des Histoires. Le serveur les sert
// (`serveur/src/depots/monde.ts:503`), le type les porte (`ObjetCampement.placeLe`), et :
//
//     rendus au campement          = 0 sur 6   (`EcranCampement.tsx` ne les montrait nulle part)
//     dessinés au coffre           = 0 sur 6   (une seule besace grise pour les six)
//     `asset` déclaré              = `habillages/campement/campement.svg` pour les six —
//                                    c'est-à-dire le décor entier, donc rien
//
// Autrement dit : l'enfant conquiert la Clairière, en rapporte le fanion, revient au
// campement — et **rien n'a changé**. C'est le hub d'Adibou privé de la seule chose qui donne
// envie d'y revenir (v2 § 3.4, D25 point 3). Le coffre en montrait bien six cases, mais six
// besaces identiques : « deux formes identiques ne se collectionneraient pas » (D44).
//
// ── PASSAGE AUX VRAIES IMAGES ───────────────────────────────────────────────────────────────
// Les six pictogrammes vectoriels de blocage ont été remplacés le 3 septembre 2026 par six
// PNG détourés, générés séparément dans le style du campement V6. Le coffre et le campement
// chargent cette table unique : une récompense ne peut donc plus avoir deux apparences.
//
// ── LA RÈGLE, LA MÊME QUE L'ÉTAGÈRE (D44) ───────────────────────────────────────────────────
// La case non rapportée est la MÊME case, en pointillé et en Grisaille. Jamais un cadenas,
// jamais un vide, jamais une couleur d'alerte.
//
// ── CE QUI A CHANGÉ AVEC R26, ET POURQUOI CE N'EST PAS UN MENU POUR AUTANT ──────────────────
// Ce fichier disait « rien ne se tape ici : c'est un album, pas un menu ». Le père a demandé
// l'inverse : « on peut cliquer et voir les Gobi. Il faudrait la même chose en fait dans ce que
// tu as rapporté. » Chaque pièce s'ouvre donc désormais sur sa fiche.
//
// Ça reste un album : la fiche ne mène nulle part, ne demande rien, ne se rate pas, et se ferme
// par trois portes (D46). Ce qui a changé n'est pas la nature de l'écran, c'est qu'une case
// vide DIT enfin ce qu'elle attend — la moitié qui manquait à D44.
//
// Et sa couleur, elle, reste cachée : « sans donner les couleurs, parce que ça c'est à
// deviner » (R28). C'est la différence exacte d'avec l'étagère de Gobi, où la couleur est une
// promesse montrée.
import { useState } from 'react';
import type { ReactElement } from 'react';

import { urlAsset } from '../api/client.js';
import { FicheObjet } from './FicheObjet.js';
import type { ObjetCampement } from '@pierre/partage';

/** Une illustration de butin, détourée et lisible aussi en petite vignette. */
interface DessinDeclare {
  /** Ce que l'enfant reconnaît d'un coup d'œil. Sert d'`aria-label` de repli. */
  readonly quoi: string;
  readonly asset: string;
}

/**
 * Les six butins, un par région. Chaque chemin pointe vers un PNG RGBA 256 × 256 dont
 * l’empreinte est verrouillée dans `production/coffre-raster.lock.json`.
 */
export const DESSIN_BUTIN: Readonly<Record<string, DessinDeclare>> = {
  'fanion-clairiere': {
    quoi: 'un fanion sur son mât',
    asset: 'assets/coffre/objets/fanion-clairiere.png'
  },
  'geode-galeries': {
    quoi: 'une géode ouverte',
    asset: 'assets/coffre/objets/geode-galeries.png'
  },
  'nenuphar-marais': {
    quoi: 'un nénuphar en fleur',
    asset: 'assets/coffre/objets/nenuphar-marais.png'
  },
  'feuille-foret': {
    quoi: 'une feuille nervurée',
    asset: 'assets/coffre/objets/feuille-foret.png'
  },
  'braise-volcan': {
    quoi: 'une braise qui rougeoie',
    asset: 'assets/coffre/objets/braise-volcan.png'
  },
  'livre-cite': {
    quoi: 'un livre ouvert',
    asset: 'assets/coffre/objets/livre-cite.png'
  }
};

/**
 * Le dessin de repli : une besace.
 *
 * Il existe pour qu'un objet ajouté au fichier de contenu s'affiche quand même — un objet
 * rapporté qui ne se dessinerait pas serait une récompense muette. Il n'est PAS une excuse :
 * `tests/composants/butin-du-campement.test.tsx` échoue si l'un des codes réels de
 * `contenu/monde/campement.json` retombe dessus, ce qui est le seul moyen d'empêcher la table
 * ci-dessus de pourrir en silence.
 */
export const BESACE: DessinDeclare = {
  quoi: 'une besace',
  asset: 'assets/vignettes/galeries-frise/vignette-sac.png'
};

/** Vrai si ce code a son dessin propre. Le test s'en sert ; le rendu, jamais. */
export function estDessine(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(DESSIN_BUTIN, code);
}

export function dessinDuButin(code: string): DessinDeclare {
  return DESSIN_BUTIN[code] ?? BESACE;
}

/** Le dessin seul — le coffre le monte aussi, pour que les deux écrans montrent la même chose. */
export function DessinButin({
  code,
  taille = 88
}: {
  readonly code: string;
  readonly taille?: number;
}): ReactElement {
  const dessin = dessinDuButin(code);
  return (
    <img
      className="dessin-butin"
      width={taille}
      height={taille}
      src={urlAsset(dessin.asset)}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading="lazy"
      data-butin-dessin={estDessine(code) ? code : 'besace'}
    />
  );
}

export interface ProprietesButin {
  readonly objets: readonly ObjetCampement[];
  readonly titre?: string;
}

/**
 * La section du campement : six cases, celles qui manquent comprises.
 *
 * Le compte est posé sur la racine (`data-butin-total`, `data-butin-rapportes`) pour l'enfant
 * comme pour la recette : « le compte se lit sans compter » est déjà la règle de l'étagère.
 */
export function Butin({ objets, titre = 'Ce que tu as rapporté' }: ProprietesButin): ReactElement {
  const rapportes = objets.filter((objet) => objet.placeLe !== null).length;
  const [ouvert, fixerOuvert] = useState<ObjetCampement | null>(null);

  return (
    <section
      className="panneau"
      data-butin="oui"
      data-butin-total={String(objets.length)}
      data-butin-rapportes={String(rapportes)}
      aria-label={titre}
    >
      <h2 className="panneau-titre" style={{ fontSize: '1.5rem' }}>
        <span aria-hidden="true" data-pictogramme="butin">
          🎒
        </span>
        {titre} — {rapportes} sur {objets.length}
      </h2>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}
      >
        {objets.map((objet) => {
          const code = String(objet.code);
          const rapporte = objet.placeLe !== null;
          return (
            <li key={code} style={{ display: 'contents' }}>
              {/* ── R26 — CHAQUE PIÈCE S'OUVRE, RAPPORTÉE OU NON ──────────────────────────
                  « on peut cliquer et voir les Gobi. Il faudrait la même chose en fait dans
                  ce que tu as rapporté. »

                  Un `<button>` et non un `<li>` cliquable : c'est ce qui le rend atteignable
                  au clavier, annonçable par un lecteur d'écran, et conforme aux 64 px de R16
                  sans qu'on ait à y penser. Les marques `data-butin-piece` et `data-rapporte`
                  RESTENT sur cet élément — les recettes du campement les visent déjà, et
                  déplacer une prise casserait des gardes qui n'ont rien demandé. */}
              <button
                type="button"
                className="case-butin"
                data-butin-piece={code}
                data-rapporte={rapporte ? 'oui' : 'non'}
                aria-label={
                  rapporte
                    ? `${objet.libelle}, rapporté au campement`
                    : `${objet.libelle}, encore à rapporter`
                }
                onClick={() => {
                  fixerOuvert(objet);
                }}
              >
                <DessinButin code={code} />
                <span className="case-collection-nom">{objet.libelle}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {ouvert === null ? null : (
        <FicheObjet
          marqueRacine={{ 'data-fiche-butin': String(ouvert.code) }}
          libelleAria={
            ouvert.placeLe === null
              ? `${ouvert.libelle}, encore à rapporter`
              : `${ouvert.libelle}, rapporté au campement`
          }
          titre={ouvert.libelle}
          obtenu={ouvert.placeLe !== null}
          // ── R28 — LA COULEUR N'EST PAS MONTRÉE ICI ────────────────────────────────────
          // « sans donner les couleurs, parce que ça c'est à deviner. » C'est le contraire
          // de l'étagère de Gobi, et c'est délibéré : la promesse d'un côté, la devinette de
          // l'autre. Un objet non rapporté se montre donc en silhouette, et le panneau dit
          // pourquoi — une silhouette sans explication ressemblerait à un dessin raté.
          couleurRevelee={false}
          phrase={
            ouvert.placeLe === null
              ? 'Tu ne l’as pas encore rapporté au campement.'
              : 'Tu l’as rapporté. Il est à sa place.'
          }
          visuel={<DessinButin code={String(ouvert.code)} />}
          surFermer={() => {
            fixerOuvert(null);
          }}
        />
      )}
    </section>
  );
}
