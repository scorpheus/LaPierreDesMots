/**
 * LE REPÈRE D'ÉTAPE, COMMUN AUX MOTEURS — T10 (Docs/tableau-retours.md), 9 octobre 2026.
 *
 * Le parent : « parfois bien placé, parfois non, et surtout pas le même style graphique » ;
 * « toujours en haut, sous la consigne » ; et « quand l'étape change, l'enfant doit s'en rendre
 * compte : il est en train de lire et ne voit pas le changement ».
 *
 * ── LA PLACE ───────────────────────────────────────────────────────────────────────────────
 * Le moteur rend le repère (lui seul connaît le rang et la cible de l'étape), mais le repère
 * s'affiche dans la FENTE que l'écran du nœud pose dans sa barre de consigne, juste sous la
 * consigne (`EcranNoeud`, `FournisseurRepereEtape`). Même place dans tous les exercices, par
 * construction, quelle que soit la disposition de la scène. Un moteur monté seul (tests de
 * composant, galerie) le rend sur place.
 *
 * ── LE STYLE ───────────────────────────────────────────────────────────────────────────────
 * Celui de E03 (`tri`), jugé le plus lisible par le parent : une pastille bordée de trait, fond
 * jaune, police d'interface. Voir `etape.css`.
 *
 * ── LE SIGNAL DE CHANGEMENT ────────────────────────────────────────────────────────────────
 * Quand le rang change (jamais à l'ouverture) : `data-nouvelle-etape="oui"` allume le cadre
 * (fond soleil plein, liseré) et le garde allumé jusqu'au toucher suivant de l'enfant ; si les
 * animations sont permises, une onde part du CADRE, trois fois. Le texte ne bouge jamais.
 * La voix n'est pas relancée d'office : voir Docs/socle-etape-et-gestes-2026-10-09.md § 1.
 */
import { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { TexteColore } from '../lecture/TexteColore.js';
import { ROLE_QUESTION, useSignalChangement } from './Question.js';
import './etape.css';

/** `null` : aucun écran ne fournit de fente, le repère se rend sur place. */
const ContexteFente = createContext<{ readonly fente: HTMLElement | null } | null>(null);

export interface ProprietesFournisseurRepereEtape {
  /** L'élément de la barre de consigne qui reçoit le repère ; `null` tant qu'il n'est pas monté. */
  readonly fente: HTMLElement | null;
  readonly children: ReactNode;
}

/** Posé par l'écran autour du moteur : le repère du moteur ira dans `fente`. */
export function FournisseurRepereEtape({ fente, children }: ProprietesFournisseurRepereEtape): ReactElement {
  return <ContexteFente.Provider value={{ fente }}>{children}</ContexteFente.Provider>;
}

export interface ProprietesRepereEtape {
  /** Le code du moteur, publié dans `data-repere-etape`. */
  readonly moteur: string;
  /** Rang de l'étape courante, à partir de 1. */
  readonly rang: number;
  readonly total: number;
  /** Ce que l'étape demande, en peu de mots (la cible). Facultatif. */
  readonly detail?: ReactNode;
  /**
   * Vrai quand la cible est un mot à DÉCHIFFRER (la couleur à attraper, le mot de l'éclair) :
   * elle prend alors le style de lecture du profil (Andika, corps de lecture), comme la consigne.
   */
  readonly detailALire?: boolean;
  /**
   * Faux quand les étapes ne contraignent rien (le réducteur accepte tout dans n'importe quel
   * ordre) : « Étape 1 sur 2 » mentirait. Par défaut : vrai dès qu'il y a deux étapes.
   */
  readonly afficherRang?: boolean;
  /**
   * Faux : le repère reste où le moteur le rend, au lieu d'aller dans la barre de consigne.
   * Réservé à un repère qui n'est PAS une étape (le compteur de `paires`) quand la rangée de
   * plus coûterait la place du plateau (mesuré : cite-des-histoires-02 en 1100×700).
   */
  readonly dansLaBarre?: boolean;
  readonly animationsDesactivees: boolean;
}

export function RepereEtape({
  moteur,
  rang,
  total,
  detail,
  detailALire = false,
  afficherRang = true,
  dansLaBarre = true,
  animationsDesactivees,
}: ProprietesRepereEtape): ReactElement | null {
  const contexte = useContext(ContexteFente);
  // Le signal de changement est celui de tout le thème « question » (T19, Question.tsx).
  const { attributs: signal } = useSignalChangement(rang, animationsDesactivees);

  const rangVisible = afficherRang && total > 1;
  const detailVisible = detail !== undefined && detail !== null && detail !== '';
  if (!rangVisible && !detailVisible) return null;

  const repere = (
    <div
      className="repere-etape"
      // T19 : le repère est la RÉFÉRENCE du thème question (le jaune de E03).
      {...ROLE_QUESTION}
      data-repere-etape={moteur}
      data-etape-rang={String(rang)}
      data-etape-total={String(total)}
      {...signal}
      aria-live="polite"
    >
      {rangVisible ? <span className="repere-etape__rang">{`Étape ${String(rang)} sur ${String(total)}`}</span> : null}
      {rangVisible && detailVisible ? <span aria-hidden="true" className="repere-etape__point">✦</span> : null}
      {detailVisible ? (
        <span className={detailALire ? 'repere-etape__detail repere-etape__detail--lecture' : 'repere-etape__detail'}>
          {/* Une cible à déchiffrer est lue en couleurs, comme tout texte de lecture (T19). */}
          {detailALire && typeof detail === 'string' ? <TexteColore texte={detail} /> : detail}
        </span>
      ) : null}
    </div>
  );

  if (contexte === null || !dansLaBarre) return repere;
  if (contexte.fente === null) return null;
  return createPortal(repere, contexte.fente);
}

/** La fente elle-même, à poser dans la barre de consigne, sous le texte de la consigne. */
export function FenteRepereEtape({ brancher }: { readonly brancher: (noeud: HTMLElement | null) => void }): ReactElement {
  return <div ref={brancher} className="fente-repere-etape" data-fente-repere-etape="oui" />;
}
