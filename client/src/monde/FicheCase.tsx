/**
 * CE QU'UNE CASE ATTEND — R24, demandé par le père le 2026-08-03.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « même si on ne les a pas, tous les items à récupérer devraient être affichés en grand dans un
 * popup avec une description de ce qu'on peut gagner, et on aura la couleur, et avec une croix
 * ou un bouton retour — pour voir tous les items à gagner dans le campement et dans le coffre. »
 *
 * ── LA MOITIÉ QUI EXISTAIT DÉJÀ ───────────────────────────────────────────────────────────────
 * `Etagere.tsx` montre bien les cases VIDES : aucune branche `if (obtenue)` autour d'une case,
 * seulement autour de son remplissage. C'est D44 et D25 point 3 — « ce qui donne envie, c'est de
 * voir la case suivante encore vide ».
 *
 * ── CE QUI MANQUAIT ───────────────────────────────────────────────────────────────────────────
 * La case vide ne disait pas CE QU'ELLE ATTEND. Elle était en Grisaille, sans nom lisible en
 * grand, sans la couleur qu'elle prendra. L'enfant voyait qu'il manquait quelque chose, jamais
 * quoi ni pourquoi — c'est-à-dire le vide, sans la promesse qui le rend désirable.
 *
 * **Montrer la couleur d'un objet NON obtenu est le seul endroit du jeu où la Grisaille se lève
 * par avance.** Ailleurs, la couleur est une récompense ; ici, c'est une promesse. Les deux ne se
 * confondent pas : la fiche l'annonce en toutes lettres — « elle prendra cette couleur » — pour
 * qu'un enfant ne croie pas l'avoir déjà gagnée.
 *
 * ── TROIS RÈGLES TENUES ───────────────────────────────────────────────────────────────────────
 *  1. **Jamais de cadenas, jamais de rouge** (R14). Une case libre est une case libre, pas un
 *     échec ni un verrou.
 *  2. **La sortie est évidente et sans condition** (D46) : une croix, la touche Échap, et un tap
 *     hors du panneau. Trois portes, aucune confirmation.
 *  3. **Le texte ne bouge pas** (v2 § 9.3) : le panneau apparaît, son contenu est immobile.
 */
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

import { urlAsset } from '../api/client.js';

import type { CaseEtagere } from '@pierre/partage/monde';

export interface ProprietesFicheCase {
  readonly une: CaseEtagere;
  /** Ce qu'il faut faire pour l'obtenir. Vient des données, jamais d'ici. */
  readonly commentLObtenir: string | null;
  readonly surFermer: () => void;
}

export function FicheCase({ une, commentLObtenir, surFermer }: ProprietesFicheCase): ReactElement {
  const refFermer = useRef<HTMLButtonElement | null>(null);

  // Le focus va sur la sortie : un panneau qui s'ouvre sans donner sa porte est un panneau
  // dont on ne sait pas sortir au clavier, et la QA d'accessibilité le compte comme un piège.
  useEffect(() => {
    refFermer.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === 'Escape') surFermer();
    };
    globalThis.addEventListener?.('keydown', surTouche);
    return () => {
      globalThis.removeEventListener?.('keydown', surTouche);
    };
  }, [surFermer]);

  return (
    <div
      data-fiche-case={String(une.grapheme)}
      data-obtenue={une.obtenue ? 'oui' : 'non'}
      role="dialog"
      aria-modal="true"
      aria-label={
        une.obtenue ? `${une.libelle}, gagnée` : `${une.libelle}, pas encore gagnée`
      }
      // Un tap hors du panneau referme : la troisième porte, celle qu'un enfant trouve seul.
      onClick={surFermer}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
        background: 'rgba(27, 36, 64, 0.55)'
      }}
    >
      <div
        // Le contenu ne referme pas : sans ça, tapoter le dessin ferait sortir du panneau.
        onClick={(evenement) => {
          evenement.stopPropagation();
        }}
        style={{
          background: 'var(--parchemin, #FFF6E3)',
          border: '4px solid var(--trait, #1B2440)',
          borderRadius: 'var(--rayon-carte, 16px)',
          padding: '1.5rem',
          maxInlineSize: '32rem',
          display: 'grid',
          justifyItems: 'center',
          gap: '1rem'
        }}
      >
        <div
          data-fiche-visuel="oui"
          style={{
            inlineSize: '9rem',
            blockSize: '9rem',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            border: `4px ${une.obtenue ? 'solid' : 'dashed'} var(--trait, #1B2440)`
          }}
        >
          <img
            src={urlAsset(String(une.cristal))}
            alt=""
            width={96}
            height={96}
            aria-hidden="true"
            // ── LA COULEUR VIENT DU CRISTAL, ELLE N'EST PAS INVENTÉE ──────────────────────
            //
            // Le catalogue ne déclare ni couleur ni description : `grapheme`, `libelle`,
            // `cristal`, et rien d'autre. J'ai failli dériver une teinte du graphème — ç'aurait
            // été une promesse FAUSSE, et une promesse fausse vaut moins que pas de promesse.
            //
            // Mesuré : les cristaux portent déjà leurs couleurs (`contenu/assets/gobi/formes/`
            // — `fill="#ADC8E0"`, `fill="#C5EAFA"`). Les montrer EN PLEINE COULEUR, même non
            // obtenus, EST donc ce que le père demandait : « on aura la couleur ». Le contour
            // en pointillé et la phrase juste dessous disent que c'est encore à gagner.
            style={{ opacity: 1 }}
          />
        </div>

        <h2 className="titre" style={{ fontSize: '1.75rem', margin: 0, textAlign: 'center' }}>
          {une.libelle}
        </h2>

        <p className="zone-lecture" style={{ margin: 0, fontSize: '1.25rem', textAlign: 'center' }}>
          {une.obtenue
            ? 'Tu l’as gagnée. Elle est à toi.'
            : commentLObtenir ?? 'Elle t’attend. Continue à rallumer le monde.'}
        </p>

        {une.obtenue ? null : (
          // Dire que la couleur est une PROMESSE. Sans cette phrase, un enfant croirait
          // l'avoir déjà — et la déception vaudrait mieux ne rien montrer du tout.
          <p data-promesse-couleur="oui" style={{ margin: 0, opacity: 0.85 }}>
            Voilà ses couleurs. Elles seront à toi quand tu l’auras gagnée.
          </p>
        )}

        <button
          ref={refFermer}
          type="button"
          className="cible cible-appel"
          data-fermer-fiche="oui"
          aria-label="Fermer et revenir"
          onClick={surFermer}
        >
          ← Revenir
        </button>
      </div>
    </div>
  );
}
