// Jauge d'un palier de la cascade — D25 point 3 (lot L2-A).
//
// « La progression doit être VISIBLE avant d'être atteinte. Trois étoiles sur cinq, sept
// tampons sur dix : **ce qui motive, c'est de voir la case suivante vide.** Toute jauge de
// palier doit montrer le reste à parcourir, jamais seulement l'acquis. » (D25, point 3)
//
// Ce composant est la traduction littérale de ce paragraphe, et il est écrit de sorte qu'on ne
// puisse PAS l'écrire autrement : les cases vides sont rendues explicitement, une par une, et
// `data-restant` porte le nombre RESTANT — jamais l'acquis. `tests/composants/JaugePalier.test.tsx`
// l'assert sur le DOM, pas sur le calcul, précisément pour que la vue ne puisse pas mentir.
//
// Aucun rouge, aucune croix, aucun barré : les cases non acquises sont en creux, comme les
// étoiles manquantes de `Etoiles.tsx` (v2 § 6.2).
import type { ReactElement } from 'react';
import type { JaugePalier as ModeleJauge, NatureRecompense } from '@pierre/partage';

/**
 * Libellé lisible de chaque nature. Aucune ne compare, aucune ne juge (R14).
 *
 * `'objet-campement'` retiré par le lot A1 (R31) — voir `partage/src/recompenses/types.ts`.
 */
const LIBELLE_NATURE: Readonly<Record<NatureRecompense, string>> = {
  etoile: 'étoile',
  'forme-gobi': 'forme de Gobi',
  'zone-recoloriee': 'zone à rallumer'
};

/**
 * Au-delà de ce nombre, on cesse de dessiner une case par unité : dix cases se lisent d'un
 * coup d'œil, trente non. La jauge passe alors en barre continue, qui montre le même vide.
 * PLACEHOLDER — à valider sur la tablette réelle.
 */
const CASES_MAX = 12;

export interface ProprietesJaugePalier {
  readonly jauge: ModeleJauge;
  /** Côté d'une case, en pixels. */
  readonly taille?: number;
  /** `false` sur la carte et le coffre, où la jauge est un simple repère. */
  readonly avecLibelle?: boolean;
}

function Cases({ jauge, taille }: { jauge: ModeleJauge; taille: number }): ReactElement {
  const rangs = Array.from({ length: jauge.requis }, (_, index) => index + 1);
  return (
    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
      {rangs.map((rang) => {
        const acquise = rang <= jauge.acquis;
        return (
          <span
            key={rang}
            data-case={String(rang)}
            data-acquise={acquise ? 'oui' : 'non'}
            aria-hidden="true"
            style={{
              inlineSize: `${String(taille)}px`,
              blockSize: `${String(taille)}px`,
              borderRadius: '999px',
              // Acquise : soleil plein. Vide : le gris de « pas encore conquis ».
              // Jamais de rouge — l'échec n'a pas de couleur dans ce projet.
              background: acquise ? 'var(--soleil)' : 'transparent',
              // 3 px et non 2 (M8, v2 § 9.1 : « contours épais, 3 à 5 px »). Sur une case de
              // 20 px c'est le maximum lisible : à 4 px le creux central se refermerait, et
              // c'est le creux qui dit « pas encore ».
              border: `3px solid ${acquise ? 'var(--trait)' : 'var(--grisaille)'}`,
              // Le relief de BD, sur la case GAGNÉE seulement. Une case vide en relief
              // ressemblerait à un jeton déjà posé : le vide doit rester plat.
              boxShadow: acquise ? '0 2px 0 0 var(--trait)' : 'none'
            }}
          />
        );
      })}
    </div>
  );
}

function Barre({ jauge, taille }: { jauge: ModeleJauge; taille: number }): ReactElement {
  const part = jauge.requis === 0 ? 0 : jauge.acquis / jauge.requis;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        inlineSize: `${String(taille * 8)}px`,
        blockSize: `${String(taille)}px`,
        borderRadius: '999px',
        border: '3px solid var(--grisaille)',
        overflow: 'hidden'
      }}
    >
      <span
        style={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          inlineSize: `${String(Math.round(part * 100))}%`,
          background: 'var(--soleil)'
        }}
      />
    </div>
  );
}

export function JaugePalier({
  jauge,
  taille = 20,
  avecLibelle = true
}: ProprietesJaugePalier): ReactElement {
  const nature = LIBELLE_NATURE[jauge.nature];
  // Le texte dit le RESTE, pas l'acquis. C'est la phrase de D25, pas une paraphrase.
  const phrase =
    jauge.restant === 0
      ? `C’est gagné : une ${nature} !`
      : jauge.restant === 1
        ? `Encore 1 avant la prochaine ${nature}`
        : `Encore ${String(jauge.restant)} avant la prochaine ${nature}`;

  return (
    <div
      className="jauge-palier"
      data-palier={jauge.palier}
      // ⚠ LE NOMBRE RESTANT, JAMAIS L'ACQUIS. Contrat des features v2 § 7.
      data-restant={String(jauge.restant)}
      role="group"
      aria-label={phrase}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
    >
      {jauge.requis <= CASES_MAX ? (
        <Cases jauge={jauge} taille={taille} />
      ) : (
        <Barre jauge={jauge} taille={taille} />
      )}
      {avecLibelle ? (
        <p className="zone-lecture" style={{ margin: 0, fontSize: '1rem', padding: '0.25rem 0.5rem' }}>
          {phrase}
        </p>
      ) : null}
    </div>
  );
}
