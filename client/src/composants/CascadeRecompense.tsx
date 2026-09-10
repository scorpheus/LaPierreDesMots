// La cascade à trois paliers, à la clôture d'un nœud — D25 (lot L2-A).
//
// C'est le composant qui remplace le seul décompte d'étoiles de la v1. Il affiche, dans cet
// ordre : ce qui vient d'être gagné, puis les trois jauges — donc **le vide qui reste**
// (D25, point 3). L'ordre compte : on montre d'abord la récompense, ensuite l'appel du
// prochain palier. L'inverse ferait de la récompense un simple passage.
//
// Le mapping avec le système de l'école est direct et délibéré (D25) : étoile → tampon
// spécial → image. Les libellés le disent en français d'enfant, jamais en vocabulaire de jeu.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { CodePalier, GainCascade, RecompenseObtenue } from '@pierre/partage';

import { JaugePalier } from './JaugePalier.js';
import { urlAsset } from '../api/client.js';
import { FenetreRecompense } from './FenetreRecompense.js';

/**
 * Une phrase par palier. Aucune ne compare, aucune ne juge, aucune ne regrette (R14).
 * PLACEHOLDER — à valider : les formulations sont à relire avec le parent.
 */
/**
 * Le signe de chaque palier. Il accompagne le texte sans fabriquer un faux visuel SVG : la
 * récompense garde le vrai Gobi raster de la scène, et la cascade reste un petit carnet lisible.
 * Ils sont `aria-hidden` : la phrase les dit déjà, et l'annoncer deux fois ferait un écho.
 */
const SIGNE_PALIER: Readonly<Record<CodePalier, string>> = {
  etoile: '★',
  intermediaire: '✦',
  rare: '☀'
};

function SignePalier({ palier }: { readonly palier: CodePalier }): ReactElement {
  return (
    <span
      className={`cascade-embleme cascade-embleme--${palier}`}
      aria-hidden="true"
      data-pictogramme-palier={palier}
    >
      {SIGNE_PALIER[palier]}
    </span>
  );
}

function estCadeauConcret(recompense: RecompenseObtenue): boolean {
  return (
    recompense.nature === 'forme-gobi' &&
    recompense.reference !== null &&
    recompense.asset !== null
  );
}

/**
 * Dit uniquement ce qui s'est réellement produit.
 *
 * Un palier sans contrepartie nommée reste une vraie étape de la cascade : le masquer faisait
 * disparaître l'étoile fréquente et le grand palier de l'écran, donc de la recette E2E. On le
 * célèbre sans annoncer une forme ou une région que le serveur n'a pas effectivement attribuée.
 */
function texteDuPalier(recompense: RecompenseObtenue): string {
  if (recompense.palier === 'etoile') {
    return 'Une étoile de plus !';
  }
  if (recompense.palier === 'rare') {
    return 'Tu as atteint un grand palier !';
  }
  return 'Tu as franchi un palier !';
}

export interface ProprietesCascadeRecompense {
  /** `null` tant que la cascade n'a pas été appliquée — l'écran reste alors sans jauge. */
  readonly gain: GainCascade | null;
}

export function CascadeRecompense({ gain }: ProprietesCascadeRecompense): ReactElement | null {
  const [selection, choisir] = useState<{ gain: GainCascade; recompense: RecompenseObtenue } | null>(null);
  if (gain === null) {
    return null;
  }
  const recompenseOuverte = selection?.gain === gain ? selection.recompense : null;

  const intermediaire = gain.jauges.find((jauge) => jauge.palier === 'intermediaire');
  const jauges = gain.jauges.map((jauge) => {
    if (jauge.palier !== 'rare' || intermediaire === undefined) return jauge;
    const requis = jauge.requis * intermediaire.requis;
    const acquis = jauge.acquis * intermediaire.requis + intermediaire.acquis;
    return { ...jauge, acquis, requis, restant: requis - acquis };
  });

  return (
    <section
      className="cascade-recompense"
      aria-label="Ce que tu viens de gagner"
    >
      {/* ── ce qui vient d'être gagné, dans l'ordre de franchissement */}
      {gain.recompenses.length === 0 ? null : (
        <ul className="cascade-recompense-liste">
          {gain.recompenses.map((recompense, rang) => (
            <li
              key={`${recompense.palier}-${String(rang)}`}
              // ⚠ `data-recompense` — ADDITION au § 7 du contrat des features v2, signalée au
              // rapport de L2-A. `data-palier` y est réservé aux JAUGES ; le réemployer ici
              // ferait compter quatre « jauges » à `parcours-cascade` là où il en attend trois.
              data-recompense={recompense.palier}
              className="cascade-recompense-gain"
            >
              <button type="button" className="cascade-recompense-bouton"
                onClick={() => choisir({ gain, recompense })}>
              <SignePalier palier={recompense.palier} />
              {estCadeauConcret(recompense) ? (
                <>
                  <img
                    src={urlAsset(recompense.asset!)}
                    alt=""
                    aria-hidden="true"
                    width={56}
                    height={56}
                    data-cadeau-concret={recompense.reference!}
                  />
                  <span>Gobi reçoit la forme «&nbsp;{recompense.reference}&nbsp;».</span>
                </>
              ) : (
                <span>{texteDuPalier(recompense)}</span>
              )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {recompenseOuverte === null ? null : (
        <FenetreRecompense
          titre={estCadeauConcret(recompenseOuverte)
            ? `Gobi reçoit la forme « ${recompenseOuverte.reference} ».`
            : texteDuPalier(recompenseOuverte)}
          surFermer={() => choisir(null)}>
          {estCadeauConcret(recompenseOuverte)
            ? <img src={urlAsset(recompenseOuverte.asset!)} alt={`Forme de Gobi : ${recompenseOuverte.reference}`} draggable={false} />
            : <SignePalier palier={recompenseOuverte.palier} />}
        </FenetreRecompense>
      )}

      {/* ── et le vide qui reste : c'est lui qui donne envie de revenir (D25, point 3) */}
      <div className="cascade-recompense-jauges">
        {jauges.map((jauge) => (
          <JaugePalier key={jauge.palier} jauge={jauge} enExercices={intermediaire !== undefined} />
        ))}
      </div>
    </section>
  );
}
