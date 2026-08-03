/**
 * La recoloration — le mécanisme signature du jeu. Lot L-E.
 *
 * v2 § 8 : « balayage radial depuis le point touché, 900 ms, `cubic-bezier(.16,1,.3,1)`,
 * 14 particules maximum ». v2 § 3.2 : c'est simultanément la barre de progression, la
 * récompense et la justification narrative — le seul endroit du jeu où le gris cède.
 *
 * Le remplissage lui-même est posé par React (`SceneSvg`), à partir de l'état du moteur.
 * Cette fonction ne fait que RÉVÉLER ce remplissage : elle n'est jamais la source de
 * vérité de la couleur. C'est ce qui garantit que l'état final est identique que
 * l'animation ait été jouée, coupée en cours de route, ou entièrement désactivée.
 */

import type { CouleurColoriage } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';

/** v2 § 8 — la courbe de la recoloration, gelée par le contrat § 5.8. */
export const COURBE_RECOLORATION = 'cubic-bezier(.16, 1, .3, 1)';

/** v2 § 8 — « 14 particules maximum ». */
export const PARTICULES_MAX = 14;

export interface OptionsRecoloration {
  readonly origine: readonly [number, number];
  readonly dureeMs: number;
  readonly desactivee: boolean;
}

/**
 * Point d'origine du balayage, exprimé en pourcentage de la boîte de l'élément.
 * Hors de sa boîte (le doigt était sur le trait), on retombe sur le centre.
 */
function origineRelative(
  element: SVGGraphicsElement,
  origine: readonly [number, number]
): readonly [number, number] {
  if (typeof element.getBBox !== 'function') return [50, 50];
  let boite;
  try {
    boite = element.getBBox();
  } catch {
    return [50, 50];
  }
  if (boite.width === 0 || boite.height === 0) return [50, 50];
  const x = ((origine[0] - boite.x) / boite.width) * 100;
  const y = ((origine[1] - boite.y) / boite.height) * 100;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [50, 50];
  return [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
}

/**
 * Balayage radial depuis le point touché. 900 ms, `cubic-bezier(.16,1,.3,1)`,
 * 14 particules max.
 *
 * `desactivee` est vrai sous `prefers-reduced-motion`, sous « animations calmes », et
 * quand `window.__test.sauterAnimations()` a été appelé : la couleur est alors posée
 * immédiatement, l'état final est identique. C'est ce qui rend les captures T4 stables
 * sans aucune attente de durée (contrat § 5.8).
 *
 * La promesse se résout TOUJOURS, y compris quand l'API d'animation est absente
 * (happy-dom en test composant) ou quand l'animation est interrompue par un tap :
 * « aucune animation bloquante », « tout est interruptible » (v2 § 8).
 */
export async function jouerRecoloration(
  element: SVGGraphicsElement,
  couleur: CouleurColoriage,
  options: OptionsRecoloration
): Promise<void> {
  // Filet de sécurité : si React n'a pas encore posé le remplissage, on le pose ici.
  // Idempotent — le prochain rendu réécrit la même valeur.
  const hex = hexDeCouleur(couleur);
  if (element.getAttribute('fill') !== hex) element.setAttribute('fill', hex);

  if (options.desactivee) return;
  if (typeof element.animate !== 'function') return;

  const [cx, cy] = origineRelative(element, options.origine);
  const debut = `circle(0% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%)`;
  const fin = `circle(150% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%)`;

  try {
    const animation = element.animate(
      [{ clipPath: debut }, { clipPath: fin }],
      {
        duration: Math.max(0, options.dureeMs),
        easing: COURBE_RECOLORATION,
        // `fill: 'none'` : à la fin, l'élément revient à son état CSS normal, donc
        // entièrement peint. Aucun résidu d'animation ne survit à la tentative.
        fill: 'none'
      }
    );
    semerParticules(element, hex, options);
    await animation.finished;
  } catch {
    // Animation annulée, non supportée, ou boîte dégénérée : la couleur est posée,
    // c'est tout ce qui compte.
  }
}

/**
 * Les 14 particules. Purement décoratives : elles vivent dans le parent du `<path>`,
 * ne portent aucun attribut `data-*`, ne sont jamais tapables, et disparaissent
 * d'elles-mêmes. Aucun test ne les observe — leur absence ne casse rien.
 */
function semerParticules(
  element: SVGGraphicsElement,
  hex: string,
  options: OptionsRecoloration
): void {
  const parent = element.parentNode;
  const document = element.ownerDocument;
  if (parent === null || document === null) return;

  const [ox, oy] = options.origine;
  for (let index = 0; index < PARTICULES_MAX; index += 1) {
    // Répartition régulière, pas aléatoire : `Math.random` est interdit hors de `Alea`
    // (CLAUDE.md), et un décor décoratif n'a aucun besoin d'une graine.
    const angle = (index / PARTICULES_MAX) * Math.PI * 2;
    const rayon = 18 + (index % 4) * 9;
    const particule = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particule.setAttribute('cx', String(ox));
    particule.setAttribute('cy', String(oy));
    particule.setAttribute('r', String(3 + (index % 3)));
    particule.setAttribute('fill', hex);
    particule.setAttribute('pointer-events', 'none');
    particule.setAttribute('aria-hidden', 'true');
    parent.appendChild(particule);

    const retirer = (): void => {
      if (particule.parentNode !== null) particule.parentNode.removeChild(particule);
    };

    if (typeof particule.animate !== 'function') {
      retirer();
      continue;
    }

    // ── R5 : UN NETTOYAGE DÉCORATIF NE DÉPEND JAMAIS D'UNE SEULE PROMESSE D'ANIMATION ─────────
    //
    // Signalé en jouant, le 2026-08-03 : « les particules ne s'effacent pas de l'écran du tout ».
    // **Je n'ai pas reproduit le défaut** — ma repro mesurait un panneau navigateur non affiché,
    // où `document.timeline.currentTime` reste à 0 et où AUCUNE animation n'avance ; mes contrôles
    // négatifs (un `div` ordinaire, un cercle sans fioriture) ne finissaient pas non plus. Ce
    // n'est donc pas une correction de cause, c'est la suppression d'un mode de défaillance.
    //
    // Ce qui est certain sans mesure : le retrait des 14 cercles reposait **uniquement** sur
    // `vol.finished`. Et comme les images-clés portent `fill: 'none'`, un cercle dont la promesse
    // ne se règle jamais revient à son style de base — `opacity: 1`, aucune translation — c'est-
    // à-dire **plus visible que pendant l'animation**. Le défaut, s'il survient, ne laisse pas
    // des traces pâles : il laisse quatorze pastilles pleines au point du tap.
    //
    // Or `finished` ne se règle pas si la frise de l'animation n'avance pas : onglet en
    // arrière-plan, document caché, page mise en cache par le navigateur. C'est précisément ce
    // que mon environnement de mesure faisait — donc un état réel, pas une hypothèse.
    //
    // Le filet est une minuterie, indépendante de toute frise d'animation. `retirer` est
    // idempotent (il teste `parentNode`), les deux chemins peuvent donc courir ensemble sans
    // dommage. Marge de 4× la durée : assez pour ne jamais couper une gerbe qui se joue
    // normalement, assez court pour qu'un résidu ne survive pas à l'exercice.
    const filet = globalThis.setTimeout(retirer, Math.max(1, options.dureeMs * 0.6) * 4 + 200);
    const retirerEtAnnuler = (): void => {
      globalThis.clearTimeout(filet);
      retirer();
    };

    const vol = particule.animate(
      [
        { transform: 'translate(0px, 0px)', opacity: 0.9 },
        {
          transform: `translate(${(Math.cos(angle) * rayon).toFixed(1)}px, ${(Math.sin(angle) * rayon).toFixed(1)}px)`,
          opacity: 0
        }
      ],
      { duration: Math.max(1, options.dureeMs * 0.6), easing: COURBE_RECOLORATION, fill: 'none' }
    );
    vol.finished.then(retirerEtAnnuler, retirerEtAnnuler);
  }
}
