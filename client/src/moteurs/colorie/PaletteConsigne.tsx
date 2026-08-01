/**
 * `PaletteConsigne` — le nuancier et la ligne de consigne. Lot L-E.
 *
 * DEUX RÉGIMES VISUELS DANS UN MÊME COMPOSANT, et c'est délibéré (v2 § 9.3) :
 * « le décor s'agite, le texte jamais ». La zone de consigne est du déchiffrage : fond
 * parchemin, Andika, aucune animation. Les godets sont du décor : ils réagissent au
 * doigt en 60 ms.
 *
 * Le nuancier n'est JAMAIS restreint à la consigne active (contrat § 5.8) : sinon
 * l'enfant n'aurait plus besoin de lire le nom de la couleur, et l'exercice ne testerait
 * plus rien.
 */

import { useCallback, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { CouleurColoriage, NiveauAide } from '@pierre/partage';
import { hexDeCouleur, normaliserTexte } from '@pierre/partage';
import type { ConsigneColorie } from '@pierre/partage';

/** Cibles tactiles ≥ 64 px (v2 § 8, R16). 72 px laisse de la marge au bord de l'écran. */
const COTE_GODET_PX = 72;

const STYLES_PALETTE = `
.pierre-consigne {
  background: var(--parchemin, #FFF6E3);
  color: var(--trait, #1B2440);
  font-family: Andika, 'Atkinson Hyperlegible', system-ui, sans-serif;
  font-size: 1.5rem;
  line-height: 1.6;
  border-radius: 14px;
  padding: 0.9rem 1.1rem;
  /* Aucune animation dans le champ de lecture. Règle non négociable. */
  animation: none;
  transition: none;
}
.pierre-consigne mark {
  background: var(--soleil, #FFC93C);
  color: inherit;
  border-radius: 6px;
  padding: 0 0.15em;
}
/* Consignes déjà faites ou encore à venir : plus petites et estompées, pour que la consigne
   ACTIVE soit la seule qui saute aux yeux.

   L'opacité vaut .7 et non .55 — c'est une contrainte de lisibilité, pas un goût. À .55, le
   texte encre (#1B2440) composé sur le parchemin (#FFF6E3) donne le gris #818692, mesuré par
   axe-core à **3,39:1** là où le WCAG AA en exige 4,5:1 sur du texte de 16 px. Trois consignes
   du seul exercice de la v1 tombaient dessus. À .7 le composé vaut #5F6371, soit 5,57:1 —
   au-dessus du seuil avec de la marge, et toujours nettement plus pâle que la consigne active.
   Toucher à cette valeur sans refaire le calcul rouvre le défaut. */
.pierre-consigne--a-venir, .pierre-consigne--faite { font-size: 1rem; opacity: .7; }
.pierre-godet {
  inline-size: ${COTE_GODET_PX}px;
  block-size: ${COTE_GODET_PX}px;
  min-inline-size: ${COTE_GODET_PX}px;
  min-block-size: ${COTE_GODET_PX}px;
  border-radius: 50%;
  border: 4px solid var(--trait, #1B2440);
  padding: 0;
  cursor: pointer;
  transition: transform 400ms cubic-bezier(.34, 1.56, .64, 1), box-shadow 120ms linear;
}
.pierre-godet:active { transform: scale(.94); transition: transform 60ms ease-out; }
.pierre-godet[data-choisie="oui"] {
  box-shadow: 0 0 0 5px var(--parchemin, #FFF6E3), 0 0 0 9px var(--trait, #1B2440);
}
.pierre-godet--demonstration { animation: pierre-godet-halo 900ms ease-in-out infinite; }
@keyframes pierre-godet-halo {
  0%, 100% { filter: none; }
  50%      { filter: drop-shadow(0 0 10px var(--soleil, #FFC93C)); }
}
.pierre-palette--calme .pierre-godet,
.pierre-palette--calme .pierre-godet--demonstration { animation: none; transition: none; }
@media (prefers-reduced-motion: reduce) {
  .pierre-godet, .pierre-godet--demonstration { animation: none; transition: none; }
}
`;

/**
 * Surligne les mots-clés de la consigne, au palier `indice` seulement.
 * La comparaison passe par `normaliserTexte` : « maîtresse » doit reconnaître
 * « maitresse », et l'apostrophe typographique ne doit pas casser l'appariement.
 */
function surlignerMotsCles(texte: string, motsCles: readonly string[]): ReactNode {
  if (motsCles.length === 0) return texte;
  const cles = new Set(motsCles.map((mot) => normaliserTexte(mot)));
  const morceaux = texte.split(/(\s+)/);
  return morceaux.map((morceau, index) => {
    const nu = normaliserTexte(morceau.replace(/[.,;:!?«»"()]/g, ''));
    const cle = `${String(index)}-${morceau}`;
    if (nu.length > 0 && cles.has(nu)) return <mark key={cle}>{morceau}</mark>;
    return <span key={cle}>{morceau}</span>;
  });
}

export interface ProprietesPaletteConsigne {
  readonly consignes: readonly ConsigneColorie[];
  readonly indexConsigne: number;
  /** Sous-ensemble du nuancier de l'habillage, dans l'ordre du contenu. */
  readonly nuancier: readonly CouleurColoriage[];
  readonly couleurChoisie: CouleurColoriage | null;
  /** Palier d'aide de la consigne active. */
  readonly niveauAide: NiveauAide;
  /** Godet que la démonstration fait pulser, ou `null`. */
  readonly couleurEnDemonstration: CouleurColoriage | null;
  readonly animationsDesactivees: boolean;
  onChoisir(couleur: CouleurColoriage): void;
}

export function PaletteConsigne(proprietes: ProprietesPaletteConsigne): ReactElement {
  const {
    consignes,
    indexConsigne,
    nuancier,
    couleurChoisie,
    niveauAide,
    couleurEnDemonstration,
    animationsDesactivees,
    onChoisir
  } = proprietes;

  const choisir = useCallback(
    (couleur: CouleurColoriage) => () => {
      onChoisir(couleur);
    },
    [onChoisir]
  );

  const lignes = useMemo(
    () =>
      consignes.map((consigne, index) => {
        const etat = index === indexConsigne ? 'courante' : index < indexConsigne ? 'faite' : 'a-venir';
        return { consigne, etat } as const;
      }),
    [consignes, indexConsigne]
  );

  return (
    <div
      // `data-moteur` a été RETIRÉ d'ici à l'intégration de la campagne v2.
      //
      // Le contrat v1 § 10, repris par le contrat des features v2 § 7, réserve cet attribut à
      // « la racine de CHAQUE moteur » — une racine par écran. Cette palette est un composant
      // interne du moteur `colorie`, pas sa racine : `MoteurColorie` le porte déjà. Le doublon
      // n'a longtemps rien cassé parce qu'aucun test ne comptait ; `parcours-variete` (L2-E)
      // compte, et il a mesuré la vérité — sortie citée :
      //
      //   expect(locator('[data-moteur]')).toHaveCount(1) failed
      //     Expected: 1     Received: 2
      //
      // Aucun style ni aucun test ne le sélectionnait : la mise en forme passe par la classe
      // `pierre-palette`, et les seuls sélecteurs `[data-moteur=…]` du dépôt visent une racine.
      className={`pierre-palette${animationsDesactivees ? ' pierre-palette--calme' : ''}`}
    >
      <style>{STYLES_PALETTE}</style>

      <ol style={{ display: 'grid', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
        {lignes.map(({ consigne, etat }) => (
          <li
            key={consigne.id}
            className={`pierre-consigne pierre-consigne--${etat}`}
            data-consigne={consigne.id}
            data-consigne-etat={etat}
            data-forme={consigne.forme}
            aria-current={etat === 'courante' ? 'step' : undefined}
          >
            {etat === 'courante' && niveauAide !== 'aucune'
              ? surlignerMotsCles(consigne.texte, consigne.motsCles)
              : consigne.texte}
          </li>
        ))}
      </ol>

      <div
        role="group"
        aria-label="Les couleurs"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBlockStart: '1rem'
        }}
      >
        {nuancier.map((couleur) => {
          const choisie = couleur === couleurChoisie;
          const classes = ['pierre-godet'];
          if (couleur === couleurEnDemonstration) classes.push('pierre-godet--demonstration');
          return (
            <button
              key={couleur}
              type="button"
              className={classes.join(' ')}
              data-godet={couleur}
              data-choisie={choisie ? 'oui' : 'non'}
              aria-pressed={choisie}
              aria-label={`Colorier en ${couleur}`}
              style={{ background: hexDeCouleur(couleur) }}
              onClick={choisir(couleur)}
            />
          );
        })}
      </div>
    </div>
  );
}
