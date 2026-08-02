// Le nom d'une région, au survol ET au maintien — lot N7, contrat de finition v3 § 4.7.
//
// « Le nom au survol **et au maintien** (tablette : pas de survol). »
//
// ── POURQUOI LES DEUX, ET POURQUOI CE N'EST PAS UNE REDONDANCE ──────────────────────────────
// Le jeu se joue sur une Galaxy Tab S10 FE. **Un doigt ne survole rien** : `pointerenter` n'y
// arrive qu'au moment du contact, c'est-à-dire en même temps que le tap. Un nom qui n'existe
// qu'au survol n'existe donc pas pour l'enfant — il n'existe que pour l'adulte qui teste au
// souris. Le maintien est le geste tactile équivalent, et c'est celui qui compte ici.
// Le survol reste branché parce que le parent, lui, ouvre le jeu à la souris depuis le PC.
//
// ── TROIS RÈGLES QUE CE COMPOSANT NE PEUT PAS ENFREINDRE ────────────────────────────────────
//
//  1. **Le maintien n'avale JAMAIS le tap.** Aucun `preventDefault`, aucun `stopPropagation`,
//     aucun `setPointerCapture`. Révéler un nom est un ajout ; si le tap cessait de partir
//     parce que le doigt a traîné un dixième de seconde de trop, l'enfant aurait une prise qui
//     ne répond plus — un état sans issue, le pire défaut possible ici (CLAUDE.md).
//
//  2. **Le texte ne bouge pas.** « Le décor s'agite, le texte jamais » (v2 § 9.3). L'étiquette
//     apparaît et disparaît, sans transition, sans glissement, sans fondu. Il n'y a donc rien
//     à désactiver sous `prefers-reduced-motion` : le composant ne porte aucune animation, et
//     `NomDeRegion.test.tsx` le vérifie plutôt que de le croire.
//
//  3. **L'étiquette n'intercepte pas le doigt.** `pointer-events: none` : elle s'affiche par
//     dessus la prise et ne lui prend rien. Sans cela, elle se poserait entre le doigt et la
//     région au moment précis où l'enfant s'apprête à taper.
//
// ── ACCESSIBILITÉ ───────────────────────────────────────────────────────────────────────────
// L'étiquette est `aria-hidden` : elle DOUBLE une information que la prise porte déjà dans son
// `aria-label`. L'annoncer deux fois ferait lire le nom en écho. En revanche le focus clavier
// la révèle — un enfant qui navigue au clavier n'a ni survol ni maintien, et se retrouverait
// sinon le seul à ne jamais voir les noms.
//
// Ce composant est PRÉSENTATIONNEL : aucune horloge, aucun aléa, aucune requête. Il ne connaît
// ni le magasin ni les services. C'est ce qui permet à `EcranCarte` (N4) et au campement (N6)
// de l'employer sans se coordonner.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as PointerEventReact, ReactElement, ReactNode } from 'react';

/**
 * Durée du maintien avant révélation, en millisecondes.
 *
 * 400 ms : au-dessus du tap franc d'un enfant de 7 ans (mesuré autour de 120 à 200 ms dans la
 * littérature d'IHM tactile), en dessous du seuil d'abandon. Le tap normal ne déclenche donc
 * jamais l'étiquette, et l'enfant qui « appuie pour voir » l'obtient sans attendre.
 */
export const DELAI_MAINTIEN_MS = 400;

/**
 * Durée pendant laquelle le nom reste après le relâchement.
 *
 * Sur tablette, `pointerleave` n'arrive pas quand le doigt se lève : sans ce délai, l'étiquette
 * resterait affichée indéfiniment, ou disparaîtrait à l'instant même où l'enfant commence à
 * la lire. 1 600 ms est le temps de déchiffrage d'un nom court pour un lecteur de CE1.
 */
export const DELAI_APRES_MAINTIEN_MS = 1600;

/**
 * Rayon de la prise tactile, en unités `viewBox`.
 *
 * La même valeur que `EcranCarte.tsx` (`RAYON_PRISE = 46`). Sur la carte — `viewBox` de
 * 1200 × 800 rendue dans 1920 px de large —, l'échelle vaut 1,6 : le diamètre tapable fait
 * donc 46 × 2 × 1,6 = **147 px CSS**, très au-dessus des 64 px de R16. Le calcul est refait
 * par `NomDeRegion.test.tsx` plutôt qu'affirmé ici.
 */
export const RAYON_PRISE_VIEWBOX = 46;

export interface ProprietesNomDeRegion {
  /** Ce qui s'affiche : « La Clairière », « Le chaudron ». Jamais un identifiant. */
  readonly nom: string;
  /**
   * Une seconde ligne, facultative — « Il reste 40 % à rallumer ».
   *
   * Elle passe par le même canal que le nom et suit donc la même règle de ton (C7) : elle dit
   * ce que l'enfant peut rendre, jamais ce qui manque. Le composant ne la reformule pas ; il
   * ne peut pas savoir. C'est à l'appelant d'écrire une phrase d'action.
   */
  readonly detail?: string | null;
  /** L'ancre, en unités `viewBox` de la scène. L'étiquette se pose dessous. */
  readonly x: number;
  readonly y: number;
  /** Rayon de la prise tactile invisible posée sous les enfants. */
  readonly rayonPrise?: number;
  /** La prise réelle de la région : le `<path>`, le `<circle>`, ce que l'appelant veut. */
  readonly children?: ReactNode;
  /** Vrai pour révéler le nom en permanence — le parent peut vouloir tout étiqueter. */
  readonly toujoursVisible?: boolean;
}

/** Largeur d'un caractère, en unités `viewBox`, à la taille de police employée. */
const LARGEUR_CARACTERE = 13.5;
const TAILLE_NOM = 26;
const TAILLE_DETAIL = 19;

export function NomDeRegion({
  nom,
  detail = null,
  x,
  y,
  rayonPrise = RAYON_PRISE_VIEWBOX,
  children,
  toujoursVisible = false,
}: ProprietesNomDeRegion): ReactElement {
  const [revele, setRevele] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const annuler = useCallback((): void => {
    if (minuterie.current !== null) {
      clearTimeout(minuterie.current);
      minuterie.current = null;
    }
  }, []);

  // Le ménage au démontage. Sans lui, une minuterie survit à l'écran qui l'a lancée et
  // appelle `setRevele` sur un composant démonté à chaque changement de nœud.
  useEffect(() => annuler, [annuler]);

  const montrer = useCallback((): void => {
    annuler();
    setRevele(true);
  }, [annuler]);

  const cacher = useCallback((): void => {
    annuler();
    setRevele(false);
  }, [annuler]);

  /**
   * Le maintien. On NE capture PAS le pointeur et on n'empêche AUCUN comportement par défaut :
   * le tap de l'enfant part normalement, qu'il ait maintenu ou non.
   */
  const surAppui = useCallback(
    (evenement: PointerEventReact<SVGGElement>): void => {
      // La souris a déjà le survol ; lui ajouter le maintien ferait clignoter l'étiquette au
      // clic. Le maintien est le geste du doigt et du stylet.
      if (evenement.pointerType === 'mouse') return;
      annuler();
      minuterie.current = setTimeout(() => {
        minuterie.current = null;
        setRevele(true);
      }, DELAI_MAINTIEN_MS);
    },
    [annuler]
  );

  const surRelachement = useCallback((): void => {
    annuler();
    // Rien n'a encore été révélé : le tap était franc, on n'affiche rien après coup.
    setRevele((etait) => {
      if (!etait) return false;
      minuterie.current = setTimeout(() => {
        minuterie.current = null;
        setRevele(false);
      }, DELAI_APRES_MAINTIEN_MS);
      return true;
    });
  }, [annuler]);

  const visible = toujoursVisible || revele;

  const largeur =
    Math.max(nom.length, detail === null ? 0 : detail.length) * LARGEUR_CARACTERE + 32;
  const hauteur = detail === null ? 46 : 74;
  const hautEtiquette = y + rayonPrise + 14;

  return (
    <g
      data-nom-region={nom}
      data-nom-visible={visible ? 'oui' : 'non'}
      onPointerEnter={(evenement) => {
        if (evenement.pointerType === 'mouse') montrer();
      }}
      onPointerLeave={cacher}
      onPointerDown={surAppui}
      onPointerUp={surRelachement}
      onPointerCancel={cacher}
      onFocus={montrer}
      onBlur={cacher}
    >
      {/* La prise, sous les enfants : elle rattrape le doigt qui tombe à côté du trait. */}
      <circle
        cx={x}
        cy={y}
        r={rayonPrise}
        fill="transparent"
        stroke="none"
        data-prise="nom-region"
      />
      {children}

      {visible ? (
        <g
          data-etiquette="nom-region"
          aria-hidden="true"
          /* Aucune transition, aucune animation : le texte ne bouge jamais (v2 § 9.3).
             Aucun événement non plus : l'étiquette ne prend rien au doigt. */
          style={{ pointerEvents: 'none' }}
        >
          <rect
            x={x - largeur / 2}
            y={hautEtiquette}
            width={largeur}
            height={hauteur}
            rx={12}
            fill="var(--parchemin)"
            stroke="var(--trait)"
            strokeWidth={3}
          />
          <text
            x={x}
            y={hautEtiquette + 31}
            textAnchor="middle"
            fontSize={TAILLE_NOM}
            fill="var(--trait)"
          >
            {nom}
          </text>
          {detail === null ? null : (
            <text
              x={x}
              y={hautEtiquette + 58}
              textAnchor="middle"
              fontSize={TAILLE_DETAIL}
              fill="var(--trait)"
            >
              {detail}
            </text>
          )}
        </g>
      ) : null}
    </g>
  );
}
