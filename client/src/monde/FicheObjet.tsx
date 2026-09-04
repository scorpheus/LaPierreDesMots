/**
 * LE PANNEAU QUI MONTRE UN OBJET DE COLLECTION — le fond commun de R24, R26 et R28.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « Tu as fait dans l'étagère de Gobi, on peut cliquer et voir les Gobi. Il faudrait la même
 * chose en fait dans ce que tu as rapporté et dans la bande aussi. […] Il faudrait aussi du coup
 * dans les Éclats de Pierre et ce que tu as rapporté, bah cette prévisualisation quoi, sans
 * donner les couleurs, parce que ça c'est à deviner. »
 *
 * Quatre collections, un seul panneau. L'étagère de Gobi l'avait pour elle seule (R24) ; en
 * faire un composant partagé était la seule façon d'éviter quatre panneaux qui divergent — et
 * c'est le père qui a demandé qu'ils se ressemblent.
 *
 * ── LA SEULE CHOSE QUI CHANGE ENTRE EUX, ET C'EST UNE RÈGLE DE JEU ────────────────────────────
 * **La couleur.** Sur l'étagère de Gobi, elle est montrée en grand : c'est une promesse assumée,
 * et le panneau dit en toutes lettres qu'elle n'est pas encore gagnée. Sur les Éclats et le
 * butin, elle est CACHÉE — « c'est à deviner ». Un objet non rapporté s'y montre en silhouette.
 *
 * Ce n'est pas une nuance d'affichage, c'est ce qui décide si la collection garde son mystère.
 * `couleurRevelee` porte donc la décision, et chaque appelant la prend explicitement : aucune
 * valeur par défaut, pour qu'on ne puisse pas révéler une couleur par distraction.
 *
 * ── CE QUI NE CHANGE JAMAIS ───────────────────────────────────────────────────────────────────
 *  1. **Jamais de cadenas, jamais de rouge** (R14). Une case libre est une case libre.
 *  2. **La sortie est évidente et sans condition** (D46) : une croix, la touche Échap, et un tap
 *     hors du panneau. Trois portes, aucune confirmation.
 *  3. **Le texte ne bouge pas** (v2 § 9.3) : le panneau apparaît, son contenu est immobile.
 */
import { useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface ProprietesFicheObjet {
  /** Les attributs de la racine — chaque collection garde la prise que ses tests connaissent. */
  readonly marqueRacine: Readonly<Record<string, string>>;
  readonly libelleAria: string;
  readonly titre: string;
  readonly obtenu: boolean;
  /** Le dessin, l'image ou le cristal. Fourni par l'appelant : il sait ce qu'il collectionne. */
  readonly visuel: ReactNode;
  /**
   * La couleur est-elle montrée ? **Aucune valeur par défaut, et c'est voulu.**
   *
   * `true` sur l'étagère de Gobi : la couleur y est une promesse (R24, demandé explicitement).
   * `false` sur les Éclats et le butin : « c'est à deviner » (R28). Un objet non obtenu s'y
   * montre en silhouette, et le panneau le dit.
   */
  readonly couleurRevelee: boolean;
  /** Ce que la fiche raconte. Vient des données ou de l'appelant, jamais d'ici. */
  readonly phrase: string;
  readonly surFermer: () => void;
}

export function FicheObjet({
  marqueRacine,
  libelleAria,
  titre,
  obtenu,
  visuel,
  couleurRevelee,
  phrase,
  surFermer
}: ProprietesFicheObjet): ReactElement {
  const refFermer = useRef<HTMLButtonElement | null>(null);
  const surFermerRef = useRef(surFermer);
  surFermerRef.current = surFermer;

  // Le focus va sur la sortie : un panneau qui s'ouvre sans donner sa porte est un panneau dont
  // on ne sait pas sortir au clavier, et la QA d'accessibilité le compte comme un piège. Il ne
  // doit toutefois pas faire défiler la fiche jusqu'en bas au moment de son ouverture : en
  // paysage court, cela coupait le titre avant le premier geste de l'enfant.
  useEffect(() => {
    refFermer.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent): void => {
      if (evenement.key === 'Escape') surFermerRef.current();
    };
    globalThis.addEventListener?.('keydown', surTouche);
    return () => {
      globalThis.removeEventListener?.('keydown', surTouche);
    };
  }, []);

  /** Une silhouette, pas un objet terni : on cache la couleur sans cacher la forme. */
  const filtreSilhouette = couleurRevelee || obtenu ? 'none' : 'saturate(0) brightness(0.55)';

  return (
    <div
      {...marqueRacine}
      data-fiche-objet="oui"
      data-fiche-modal="oui"
      data-obtenue={obtenu ? 'oui' : 'non'}
      className="fiche-objet"
      role="dialog"
      aria-modal="true"
      aria-label={libelleAria}
      // Un tap hors du panneau referme : la troisième porte, celle qu'un enfant trouve seul.
      onClick={surFermer}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(1rem, 3vw, 3rem)',
        overflowY: 'auto',
        background: 'rgba(27, 36, 64, 0.55)'
      }}
    >
      <div
        // Le contenu ne referme pas : sans ça, tapoter le dessin ferait sortir du panneau.
        onClick={(evenement) => {
          evenement.stopPropagation();
        }}
        className="fiche-objet-fenetre"
        style={{
          background: 'var(--parchemin, #FFF6E3)',
          border: '4px solid var(--trait, #1B2440)',
          borderRadius: 'var(--rayon-carte, 16px)',
          boxSizing: 'border-box',
          inlineSize: 'min(100%, 42rem)',
          maxBlockSize: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          padding: 'clamp(1.25rem, 3vw, 2rem)',
          display: 'grid',
          justifyItems: 'center',
          gap: '1rem'
        }}
      >
        <h2
          className="titre"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            margin: 0,
            textAlign: 'center',
            overflowWrap: 'anywhere'
          }}
        >
          {titre}
        </h2>

        <div
          data-fiche-visuel="oui"
          data-fiche-visuel-cadre="rectangle"
          data-couleur-revelee={couleurRevelee || obtenu ? 'oui' : 'non'}
          className="fiche-objet-visuel"
          style={{
            inlineSize: 'min(14rem, 58vw)',
            blockSize: 'min(14rem, 28vh)',
            minBlockSize: '7rem',
            display: 'grid',
            placeItems: 'center',
            overflow: 'visible',
            filter: filtreSilhouette
          }}
        >
          {visuel}
        </div>

        <p className="zone-lecture" style={{ margin: 0, fontSize: '1.25rem', textAlign: 'center' }}>
          {phrase}
        </p>

        {obtenu ? null : couleurRevelee ? (
          // Dire que la couleur est une PROMESSE. Sans cette phrase, un enfant croirait
          // l'avoir déjà — et la déception vaudrait mieux ne rien montrer du tout.
          <p data-promesse-couleur="oui" style={{ margin: 0, opacity: 0.85 }}>
            Voilà ses couleurs. Elles seront à toi quand tu l’auras gagnée.
          </p>
        ) : (
          // Et ici, dire que la couleur est CACHÉE EXPRÈS. Une silhouette sans explication
          // ressemblerait à un dessin raté ; annoncée, elle devient une devinette.
          <p data-couleur-a-deviner="oui" style={{ margin: 0, opacity: 0.85 }}>
            Ses couleurs sont encore secrètes. À toi de les découvrir.
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
