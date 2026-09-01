// Le chaudron — la sortie de secours à un tap, v2 § 3.4 et § 5.4. Lot L2-F.
//
// « La sortie de secours à un tap, sans culpabilité. » C'est la pièce du campement dont la
// raison d'être est de ne RIEN exiger : pas de consigne, pas de validation, rien à rater. Elle
// ouvre le moteur `libre` (L2-E), et un enfant qui n'a plus envie de déchiffrer y va sans que
// quoi que ce soit le lui reproche.
//
// D15, déjà tranché : **tap en exercice, frottement réservé au chaudron.** Le geste de
// frottement lui-même est repoussé (contrat des features v2 § 8, n° 11) — il n'a aucun enjeu de
// validation et ne bloque rien. Le bouton, lui, est livré : le jour où le geste arrive, aucune
// interface ne bouge.
//
// ── R25 — LE CHAUDRON EST BRANCHÉ, DEPUIS ────────────────────────────────────────────────────
// « je ne sais pas ce qu'il attend, ce qu'il mijote » : il n'était relié à rien, `surOuvrir`
// n'avait pas d'appelant. `EcranCampement.tsx` sait désormais l'ouvrir lui-même, sur le nœud que
// `campement.coloriageLibre` déclare — jamais un chemin écrit ici.
//
// ── LE REDESIGN, ET CE QU'IL NE TOUCHE PAS ───────────────────────────────────────────────────
// « et le chaudron aussi à redesigner » — le père, après avoir vu le campement en pleine
// largeur. Ce fichier est la PORTE du chaudron, pas la PIÈCE : le moteur `libre` qu'il ouvre est
// redessiné ailleurs (`client/src/moteurs/libre/**`, hors de ce périmètre), et
// `demanderAide` y est un no-op documenté — « aider suppose une attente », qui n'existe pas ici.
// Rien de ce qui suit ne touche à l'exercice ; tout se joue dans les 64 × 64 px de l'icône et le
// bouton qui la porte.
//
// L'ancien dessin — trois traits abstraits (un trapèze, une bande, une volute) — ne disait pas
// « chaudron », et surtout ne disait pas « à COULEURS » : rien n'y indiquait que c'est ici que
// toutes les teintes se mélangent sans consigne. Le nouveau dessin est une vraie marmite (panse,
// rebord, trois pieds, deux anses) d'où s'échappent quatre bulles — une par jeton de la palette
// commune (v2 § 9.2 : `--soleil`, `--framboise`, `--menthe`, `--lagon`), pour que la promesse du
// bouton se lise avant même le libellé.
//
// ── « ÇA POURRAIT ANIMER PLUS » — LA NOTE QUE L'ORCHESTRATEUR M'A RENVOYÉE ───────────────────
// Le seul mouvement au repos du campement était un halo à 9 s de période (`PointLibre`). Un
// chaudron qui mijote VRAIMENT — quatre bulles qui montent et s'effacent en boucle, décalées —
// est exactement ce que le père attendait quand il a écrit « je ne sais pas ce qu'il mijote » :
// le dire par le mouvement, pas par le texte. « Le décor s'agite, le texte jamais » (v2 § —
// règle non négociable) : aucune des deux phrases lisibles (`INVITE`, `PATIENCE`, le libellé
// « Le chaudron ») ne bouge — seules les quatre bulles du décor le font.
//
// `@keyframes pierre-chaudron-bouillonne` a un point commun avec toutes les animations `pierre-*`
// du dépôt : ses positions `0%` et `100%` sont IDENTIQUES. Ce n'est pas un hasard esthétique,
// c'est ce qui rend `prefers-reduced-motion` correct sans code séparé — la règle globale
// (`global.css`) réduit toute animation à 1 itération de 1 ms ; une boucle qui se referme sur
// elle-même retombe alors exactement sur son état de repos, jamais figée à mi-mouvement. Vérifié
// dans ce fichier, pas supposé : les quatre `<circle>` portent `transform: translateY(0)
// scale(1); opacity: .85` aux DEUX bornes de leur animation.
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';

export interface ProprietesChaudron {
  /** Ouvre le coloriage libre. Absent tant qu'aucun nœud `libre` n'est livré. */
  readonly surOuvrir?: () => void;
  readonly animationsDesactivees?: boolean;
  /** Le référentiel local est encore en train d'arriver : le tap attend au lieu de mentir. */
  readonly enChargement?: boolean;
}

const INVITE = 'Tu veux juste colorier ? Viens au chaudron, il n’y a rien à réussir.';
const PATIENCE = 'Le chaudron mijote encore. Reviens le voir bientôt.';

/**
 * Le mijotage — même patron que `IMAGES_CLES_BRUME` dans `VoileGrisaille.tsx` : une feuille de
 * style scopée, posée dans le `<svg>` lui-même, plutôt qu'une entrée de plus dans `global.css`
 * (hors périmètre de ce lot). `0%` et `100%` sont volontairement la MÊME déclaration — voir le
 * commentaire de tête du fichier pour pourquoi c'est ce qui rend `prefers-reduced-motion` juste
 * sans code séparé.
 *
 * `@media (prefers-reduced-motion: reduce)` ici est une redondance délibérée avec la règle
 * globale (`global.css`, `*` sous ce même media), pas une dépendance à elle : ce fichier reste
 * correct si `global.css` change un jour sans que ce lot en soit informé.
 *
 * ⚠ SI TU RENOMMES CE KEYFRAME : `document.body.textContent` (utilisé par les gardes qui
 * cherchent une phrase, ex. `EcranCampement.test.tsx` R25) INCLUT le texte d'un `<style>` — un
 * nom d'animation devient donc du texte mesurable par toute recette qui fait `.toContain(mot)`.
 * `pierre-chaudron-mijote` a fait échouer R25 en contenant le mot « mijote » du message d'attente
 * qu'il vérifiait justement l'absence de — la version CSS de « les commentaires mentent aux
 * `grep` ». Choisis un nom qui ne recoupe aucune phrase affichée par ce composant.
 */
const ANIMATION_MIJOTE = `
@keyframes pierre-chaudron-bouillonne {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; }
  50% { transform: translateY(-4px) scale(1.12); opacity: 1; }
}
.chaudron-bulle {
  animation-name: pierre-chaudron-bouillonne;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@media (prefers-reduced-motion: reduce) {
  .chaudron-bulle { animation: none; }
}
`;

export function Chaudron({
  surOuvrir,
  animationsDesactivees = false,
  enChargement = false
}: ProprietesChaudron): ReactElement {
  const services = useServices();
  const [message, fixerMessage] = useState<string>(INVITE);

  const toucher = useCallback((): void => {
    if (surOuvrir === undefined) {
      // Aucun échec, aucun rouge, aucun son négatif : une phrase qui attend, et c'est tout.
      fixerMessage(PATIENCE);
      void direTexte(services.voix, PATIENCE, null, 'gobi');
      return;
    }
    surOuvrir();
  }, [services, surOuvrir]);

  return (
    <section data-chaudron="oui" aria-label="Le chaudron à couleurs">
      {/* PAS de `data-interaction="libre"` sur ce bouton, et c'est délibéré : le chaudron est
          DÉJÀ déclaré comme point d'interaction dans `contenu/monde/campement.json`. Une
          seconde prise gonflerait R11 d'une unité qui n'ajoute rien au campement — le défaut
          « un détecteur qui déclare un poids qu'il n'applique jamais ». */}
      <button
        type="button"
        className="cible cible-appel"
        data-chaudron-entree="oui"
        aria-label="Ouvrir le chaudron à couleurs"
        onClick={toucher}
        disabled={enChargement}
        aria-busy={enChargement ? 'true' : undefined}
        style={{
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '1.25rem',
          transition: animationsDesactivees ? 'none' : undefined
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <style>{ANIMATION_MIJOTE}</style>
          {/* Les deux anses, en dessous de la panse pour que son trait les recouvre proprement
              à leur point d'attache — trait seul, aucun aplat : ce sont des poignées, pas des
              formes pleines. */}
          <path
            d="M12,20 C5,20 5,29 12,29"
            fill="none"
            stroke="var(--trait)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M52,20 C59,20 59,29 52,29"
            fill="none"
            stroke="var(--trait)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Les trois pieds — un tripode, pas un socle plein, pour que la marmite se lise
              posée plutôt que collée au sol. */}
          <path d="M18,50 L13,59 L22,59 Z" fill="var(--trait)" />
          <path d="M28,52 L25,61 L34,61 Z" fill="var(--trait)" />
          <path d="M46,50 L42,59 L51,59 Z" fill="var(--trait)" />
          {/* La panse — un vrai chaudron, large en haut et arrondi en dessous, plutôt que le
              trapèze abstrait d'avant : « ça devrait dire chaudron avant de dire le mot ». */}
          <path
            d="M12,22 C12,17 19,13 32,13 C45,13 52,17 52,22 L52,27 C52,42 43,53 32,53 C21,53 12,42 12,27 Z"
            fill="var(--grisaille)"
            stroke="var(--trait)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Le rebord — clair sur la panse sombre, pour cerner l'ouverture d'où sortent les
              bulles. */}
          <ellipse
            cx="32"
            cy="22"
            rx="20"
            ry="6"
            fill="var(--parchemin)"
            stroke="var(--trait)"
            strokeWidth="4"
          />
          {/* Les quatre bulles — un jeton de la palette commune chacune (v2 § 9.2), c'est
              « à COULEURS » qui se lit avant le mot. Décalées en délai et en durée : quatre
              bulles qui montent ensemble ne mijotent pas, elles clignotent. */}
          <circle
            className="chaudron-bulle"
            cx="21"
            cy="15"
            r="4"
            fill="var(--framboise)"
            stroke="var(--trait)"
            strokeWidth="2"
            style={{ animationDelay: '0s', animationDuration: '1.9s' }}
          />
          <circle
            className="chaudron-bulle"
            cx="32"
            cy="9"
            r="3.5"
            fill="var(--soleil)"
            stroke="var(--trait)"
            strokeWidth="2"
            style={{ animationDelay: '0.5s', animationDuration: '2.1s' }}
          />
          <circle
            className="chaudron-bulle"
            cx="43"
            cy="15"
            r="4"
            fill="var(--menthe)"
            stroke="var(--trait)"
            strokeWidth="2"
            style={{ animationDelay: '1s', animationDuration: '1.8s' }}
          />
          <circle
            className="chaudron-bulle"
            cx="36"
            cy="20"
            r="3"
            fill="var(--lagon)"
            stroke="var(--trait)"
            strokeWidth="2"
            style={{ animationDelay: '1.4s', animationDuration: '2s' }}
          />
        </svg>
        <span className="titre" style={{ fontSize: '1.25rem' }}>
          Le chaudron
        </span>
      </button>

      <p className="zone-lecture" style={{ padding: '0.5rem 0.75rem', maxInlineSize: '32rem' }}>
        {message}
      </p>
    </section>
  );
}
