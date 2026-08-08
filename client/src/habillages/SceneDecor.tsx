/**
 * `SceneDecor` — LE DÉCOR EST LE FOND, ET IL SE RALLUME RÉGION PAR RÉGION.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE COMPOSANT EST, ET POURQUOI IL N'EST PAS `DecorDeFond`
 *
 * `DecorDeFond` pose le décor à `opacity: 0.14` derrière le moteur : un papier peint. C'était
 * juste tant que le décor n'était qu'une ambiance — l'opacité avait été DÉRIVÉE de la contrainte
 * de contraste, pas choisie à l'œil (R37).
 *
 * Le père a tranché autrement (R52, et c'est mot pour mot la v2 lignes 70 et 79) :
 *
 *   1. « le décor c'est le fond »           → il COUVRE le cadre au lieu d'y flotter ;
 *   2. « il se colore avec l'avancée »      → chaque réussite rallume une région ;
 *   3. « les mots devant, mais lisibles »   → les mots sont posés PAR-DESSUS.
 *
 * ── COMMENT R37 EST RÉSOLU, ET NON IGNORÉ ─────────────────────────────────────────────────────
 * La question de R37 était : « un décor devenu fond doit résoudre ce contraste AUTREMENT ».
 * Il l'est, et pas par une opacité : **chaque mot porte son propre fond opaque**. La classe
 * `.cible` de `global.css` pose `background-color: var(--parchemin)` et `color: var(--trait)`.
 * Le rapport de contraste du texte est donc celui de `#1B2440` sur `#FFF6E3`, quel que soit ce
 * qui passe derrière — décor gris, région rallumée, trait de 4 px. C'est exactement la parade
 * que `ZoneDeLecture` emploie déjà, et c'est ce qui autorise le décor à passer de 14 % à 100 %.
 *
 * ── LE MOUVEMENT EST SUR LE DÉCOR, JAMAIS SUR LE TEXTE ────────────────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). La transition de recoloration et le balayage
 * vivent ICI, sur le SVG ; le champ de lecture n'en reçoit rien. La durée n'est pas écrite dans
 * ce fichier : elle vient de `habillage.timings.recolorationMs` — 900 ms pour la bannière, 800
 * pour les roseaux. Zéro ligne de code par habillage vaut aussi pour les timings.
 *
 * ── ZÉRO LIGNE PAR HABILLAGE ──────────────────────────────────────────────────────────────────
 * Aucun identifiant de décor, aucune couleur, aucune coordonnée n'est écrit ici. Les régions
 * sont désignées par `data-region-svg`, l'attribut que `scripts/dessiner-decors.mjs` pose déjà
 * sur chaque `<path>` coloriable, et les couleurs sortent du nuancier déclaré.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { Habillage } from '@pierre/partage';

import { chargerSceneHabillage } from './chargeur.js';
import { lireViewBox } from './emplacements.js';

/** Une région rallumée : son identifiant SVG, sa couleur, et d'où part le balayage. */
export interface RegionAllumee {
  readonly id: string;
  readonly couleur: string;
  readonly centroide: readonly [number, number];
}

export interface ProprietesSceneDecor {
  readonly habillage: Habillage;
  /** Les régions déjà conquises. L'ordre n'importe pas ; la dernière porte le balayage. */
  readonly allumees: readonly RegionAllumee[];
  /** La dernière allumée — celle depuis laquelle la couleur balaie (v2 ligne 79). */
  readonly derniere: RegionAllumee | null;
  readonly animationsDesactivees: boolean;
}

/**
 * Le SVG d'habillage est un asset local, validé par `test:contenu` avant d'atteindre l'enfant.
 * On en retire tout de même scripts et gestionnaires d'événements avant injection : un asset ne
 * doit jamais pouvoir exécuter du code. Reprend mot pour mot la parade de `MoteurPlace`.
 */
export function corpsDuSvg(texte: string): string | null {
  const correspondance = /<svg[^>]*>([\s\S]*)<\/svg>/iu.exec(texte);
  const corps = correspondance?.[1];
  if (corps === undefined) return null;
  return corps
    .replace(/<script[\s\S]*?<\/script>/giu, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/giu, '')
    .replace(/\son\w+\s*=\s*'[^']*'/giu, '')
    .replace(/javascript:/giu, '');
}

/** Un identifiant venu d'un fichier n'entre jamais tel quel dans un sélecteur CSS. */
function echapper(valeur: string): string {
  return valeur.replace(/["\\]/gu, '\\$&');
}

export function SceneDecor({
  habillage,
  allumees,
  derniere,
  animationsDesactivees,
}: ProprietesSceneDecor): ReactElement | null {
  const [corps, fixerCorps] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void chargerSceneHabillage(habillage)
      .then((texte) => {
        if (vivant) fixerCorps(corpsDuSvg(texte));
      })
      .catch(() => {
        // Un décor absent n'est pas une erreur de jeu : l'exercice reste entièrement jouable
        // sans lui, les mots se posent alors sur la grille de repli. On ne journalise pas —
        // ce n'est pas un incident, c'est un asset qui n'est pas encore produit.
        if (vivant) fixerCorps(null);
      });
    return () => {
      vivant = false;
    };
  }, [habillage]);

  const vb = useMemo(() => lireViewBox(habillage.scene.viewBox), [habillage]);
  const dureeMs = animationsDesactivees ? 0 : Math.max(0, habillage.timings.recolorationMs);

  /**
   * Les règles de recoloration, dérivées des seules régions allumées.
   *
   * Pourquoi une feuille de style plutôt qu'une écriture dans le DOM : le SVG est injecté par
   * `dangerouslySetInnerHTML`, donc React n'en possède pas les nœuds. Toucher leurs attributs
   * à la main obligerait à un effet, une `ref` et une réconciliation manuelle. Une règle CSS
   * l'emporte sur l'attribut de présentation `fill="#8E97A8"` sans qu'on touche à rien.
   */
  const regles = useMemo(() => {
    const portee = `[data-scene-decor="${echapper(String(habillage.id))}"]`;
    const lignes: string[] = [
      // La grisaille est l'état PAR DÉFAUT, pas un filtre : le SVG sort de la production avec
      // `fill="#8E97A8"`. Il n'y a donc rien à désaturer — seulement des régions à rallumer.
      `${portee} [data-region-svg] { transition: fill ${String(dureeMs)}ms ease-in-out; }`,
    ];
    for (const region of allumees) {
      lignes.push(
        `${portee} [data-region-svg="${echapper(region.id)}"] { fill: ${region.couleur}; }`,
      );
    }
    if (!animationsDesactivees) {
      lignes.push(
        `@keyframes pierre-balayage-decor {`,
        `  from { r: 0; opacity: 0.55; }`,
        `  to { r: ${String(Math.max(vb.largeur, vb.hauteur))}; opacity: 0; }`,
        `}`,
        `${portee} .pierre-balayage { animation: pierre-balayage-decor ${String(dureeMs)}ms ease-out 1 both; }`,
      );
    }
    return lignes.join('\n');
  }, [habillage, allumees, dureeMs, animationsDesactivees, vb]);

  if (corps === null) return null;

  return (
    <div
      data-scene-decor={String(habillage.id)}
      data-regions-allumees={String(allumees.length)}
      // Le décor ne s'annonce jamais aux lecteurs d'écran : c'est le moteur qui dit, en clair
      // et en une phrase, quelle région vient de reprendre ses couleurs. Un décor décrit
      // deux fois bavarde par-dessus la consigne.
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        // JAMAIS le doigt. Les mots sont au-dessus ; un fond qui intercepte est un jeu qui ne
        // répond plus, et c'est le pire défaut possible sur une appli d'enfant.
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      <style>{regles}</style>
      <svg
        data-decor-svg={String(habillage.id)}
        viewBox={`${String(vb.x)} ${String(vb.y)} ${String(vb.largeur)} ${String(vb.hauteur)}`}
        // COUVRIR, et non contenir. C'est le point 1 de la décision du père : « le décor c'est
        // le fond ». En `meet`, un décor 960×600 posé dans un cadre portrait laisse plus de
        // 500 px de vide — très exactement ce que la capture montrait.
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <g data-calques="habillage" dangerouslySetInnerHTML={{ __html: corps }} />
        {derniere === null || animationsDesactivees ? null : (
          // « une transition de 900 ms qui BALAIE DEPUIS LE POINT TOUCHÉ » (v2 ligne 79). Le
          // point touché est le mot que l'enfant vient de ranger, et ce mot était posé au
          // centroïde de la région qui s'allume : le balayage part donc de sous son doigt.
          <circle
            key={derniere.id}
            className="pierre-balayage"
            data-balayage={derniere.id}
            cx={derniere.centroide[0]}
            cy={derniere.centroide[1]}
            r={0}
            fill="none"
            stroke={derniere.couleur}
            strokeWidth={14}
          />
        )}
      </svg>
    </div>
  );
}
