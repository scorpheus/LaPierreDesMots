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
// ── POURQUOI LE DESSIN EST EN LIGNE, ET PAS UN FICHIER D'ASSET ──────────────────────────────
// Six SVG sous `contenu/assets/` demanderaient leur entrée au registre, leur passage à
// `verifier-regions-fermees`, et une modification de `contenu/monde/campement.json` — un
// fichier qu'aucun lot du contrat du monde v4 ne possède (Q-M8-1). Le dépôt a déjà le
// précédent : `Compagnon.tsx` et `EcranCoffre.tsx` dessinent leurs silhouettes en ligne. Le
// choix est consigné en question ouverte ; il se défait en une passe le jour où quelqu'un
// possède le fichier de contenu.
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

import { FicheObjet } from './FicheObjet.js';
import type { ObjetCampement } from '@pierre/partage';

/** Un dessin de butin : des tracés, un aplat par tracé. Trait `--trait`, 4 px, v2 § 9.1. */
interface DessinDeclare {
  /** Ce que l'enfant reconnaît d'un coup d'œil. Sert d'`aria-label` de repli. */
  readonly quoi: string;
  readonly traces: readonly { readonly d: string; readonly aplat: string }[];
}

/**
 * Les six butins, un par région, dessinés dans une boîte de 48 × 48.
 *
 * Chacun emprunte la couleur de sa région pour que la reconnaissance ne dépende pas de la
 * lecture du libellé : la Clairière est menthe, les Galeries lagon, le Marais menthe et lagon,
 * la Forêt Muette verte, le Volcan framboise et soleil, la Cité parchemin et soleil. Aucune
 * teinte n'est inventée — ce sont les sept jetons de la v2 § 9.2 et les valeurs du nuancier
 * déjà déclarées dans `global.css` (l'écart n° 2 assumé du contrat technique § 12).
 */
export const DESSIN_BUTIN: Readonly<Record<string, DessinDeclare>> = {
  'fanion-clairiere': {
    quoi: 'un fanion sur son mât',
    traces: [
      { d: 'M13,5 L18,5 L18,44 L13,44 Z', aplat: 'var(--nuancier-brun)' },
      { d: 'M18,8 L43,15 L18,25 Z', aplat: 'var(--menthe)' }
    ]
  },
  'geode-galeries': {
    quoi: 'une géode ouverte',
    traces: [
      { d: 'M24,4 L41,15 L37,38 L11,38 L7,15 Z', aplat: 'var(--grisaille)' },
      { d: 'M24,13 L32,19 L29,31 L19,31 L16,19 Z', aplat: 'var(--lagon)' }
    ]
  },
  'nenuphar-marais': {
    quoi: 'un nénuphar en fleur',
    traces: [
      { d: 'M24,20 L44,29 L24,40 L4,29 Z', aplat: 'var(--menthe)' },
      { d: 'M24,6 L30,17 L24,23 L18,17 Z', aplat: 'var(--framboise)' }
    ]
  },
  'feuille-foret': {
    quoi: 'une feuille nervurée',
    traces: [
      { d: 'M24,4 C38,13 38,33 24,44 C10,33 10,13 24,4 Z', aplat: 'var(--nuancier-vert)' },
      { d: 'M24,10 L24,42', aplat: 'none' }
    ]
  },
  'braise-volcan': {
    quoi: 'une braise qui rougeoie',
    traces: [
      {
        d: 'M24,4 C31,15 39,18 34,30 C31,40 24,44 24,44 C24,44 17,40 14,30 C9,18 17,15 24,4 Z',
        aplat: 'var(--nuancier-orange)'
      },
      { d: 'M24,22 C28,28 29,32 26,37 C24,40 22,40 21,36 C20,31 22,27 24,22 Z', aplat: 'var(--soleil)' }
    ]
  },
  'livre-cite': {
    quoi: 'un livre ouvert',
    traces: [
      { d: 'M4,11 L23,16 L23,42 L4,37 Z', aplat: 'var(--parchemin)' },
      { d: 'M44,11 L25,16 L25,42 L44,37 Z', aplat: 'var(--parchemin)' },
      { d: 'M23,16 L25,16 L25,42 L23,42 Z', aplat: 'var(--soleil)' }
    ]
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
  traces: [
    { d: 'M9,17 L39,17 L43,43 L5,43 Z', aplat: 'var(--grisaille)' },
    { d: 'M17,17 a7,7 0 0 1 14,0', aplat: 'none' }
  ]
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
    <svg
      className="dessin-butin"
      width={taille}
      height={taille}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      data-butin-dessin={estDessine(code) ? code : 'besace'}
    >
      {dessin.traces.map((trace) => (
        <path
          key={trace.d}
          d={trace.d}
          fill={trace.aplat}
          // Le trait tient le style à lui seul (v2 § 9.1) : 4 px sur TOUT élément dessiné.
          stroke="var(--trait)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
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
