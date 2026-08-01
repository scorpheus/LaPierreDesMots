// LE seul composant qui affiche du texte à déchiffrer — lot L2-B, v2 § 9.3, D18, D19.
//
// « Dès qu'il y a du déchiffrage : fond parchemin, police Andika, aucune animation dans le
// champ de lecture. Le décor s'agite, le texte jamais. » (v2 § 9.3, règle non négociable)
//
// C'est la raison d'être de ce composant, et la raison pour laquelle le contrat des features
// v2 § 5.1 interdit à tout autre composant d'afficher du texte à déchiffrer : la règle ne tient
// que si elle est appliquée en UN seul endroit. Un texte de consigne rendu ailleurs
// n'obtiendrait ni les réglages du profil, ni la coloration syllabique, ni la règle de lecture,
// et personne ne s'en apercevrait avant de le voir sur la tablette.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { REGLAGES_PAR_DEFAUT, variablesCss } from '@pierre/partage/lecture';
import type { ReglagesLecture } from '@pierre/partage/lecture';

import { familleDe, prechargerPolice } from './polices.js';
import { RegleDeLecture } from './RegleDeLecture.js';
import { TexteSyllabe } from './TexteSyllabe.js';

// ------------------------------------------------------------------ les réglages du profil

const ContexteReglages = createContext<ReglagesLecture>(REGLAGES_PAR_DEFAUT);

export interface ProprietesFournisseurReglagesLecture {
  readonly reglages: ReglagesLecture;
  readonly children: ReactNode;
}

/**
 * Porte les réglages du profil courant à toutes les zones de lecture de l'arbre.
 *
 * Le défaut du contexte est `REGLAGES_PAR_DEFAUT` et non `null` : une zone de lecture montée
 * hors du fournisseur — dans un test de composant d'un autre lot, ou avant que le profil ne
 * soit chargé — doit rendre du texte lisible, pas lever. Aucun écran vide, jamais.
 */
export function FournisseurReglagesLecture({
  reglages,
  children,
}: ProprietesFournisseurReglagesLecture): ReactElement {
  return <ContexteReglages.Provider value={reglages}>{children}</ContexteReglages.Provider>;
}

export function useReglagesLecture(): ReglagesLecture {
  return useContext(ContexteReglages);
}

// ------------------------------------------------------------------ style dérivé des réglages

/**
 * Les propriétés CSS effectivement posées sur la zone.
 *
 * Deux étages, et l'ordre compte : les VARIABLES viennent de `variablesCss` (partage), seul
 * endroit qui les nomme ; les PROPRIÉTÉS les consomment. Écrire `fontSize: '24px'` en dur ici
 * ferait diverger la zone de son aperçu au premier réglage modifié.
 */
export function styleDeLecture(reglages: ReglagesLecture): Record<string, string> {
  return {
    ...variablesCss(reglages),
    '--lecture-famille': familleDe(reglages.police),
    fontFamily: 'var(--lecture-famille)',
    fontSize: 'var(--lecture-corps)',
    letterSpacing: 'var(--lecture-interlettrage)',
    wordSpacing: 'var(--lecture-espacement-mots)',
    lineHeight: 'var(--lecture-interligne)',
    backgroundColor: 'var(--lecture-fond)',
    color: 'var(--lecture-encre)',
  };
}

// ------------------------------------------------------------------ le composant

export interface ProprietesZoneDeLecture {
  /** Le texte à déchiffrer. Les sauts de ligne séparent les lignes ; rien d'autre ne les crée. */
  readonly texte: string;
  /** Réglages explicites. Par défaut, ceux du profil portés par le fournisseur. */
  readonly reglages?: ReglagesLecture;
  /**
   * Mots à mettre en graisse — les mots cibles d'une consigne. La comparaison est faite sur la
   * forme minuscule sans ponctuation ; « bleu. » et « Bleu » désignent le même mot.
   *
   * Le nom est `motsCles` et non `motsCibles` : c'est celui du champ
   * `jeu.contenu.consignes[].motsCles` des exercices, donc celui que les treize moteurs
   * passent naturellement. Mesuré au moment d'écrire : `npx tsc -b` relevait 13 sites d'appel
   * de L2-C et L2-E déjà écrits contre `motsCles`. Le contrat des features ne fixe pas les
   * propriétés de ce composant — c'est un défaut du contrat, signalé au rapport — et entre
   * renommer un nom ici ou treize appels chez quatre autres agents, le choix n'est pas
   * douteux ; le nom du domaine était de toute façon le bon.
   */
  readonly motsCles?: readonly string[];
  /** Étiquette accessible de la zone. Par défaut, le texte lui-même. */
  readonly etiquette?: string;
  /** Contenu ajouté sous le texte : un bouton d'écoute, une aide. Jamais du texte à déchiffrer. */
  readonly children?: ReactNode;
}

/** Ponctuation retirée avant comparaison à `motsCles`. */
const PONCTUATION = /[.,;:!?«»"()…]/gu;

function formeComparable(mot: string): string {
  return mot.replace(PONCTUATION, '').toLocaleLowerCase('fr-FR');
}

export function ZoneDeLecture({
  texte,
  reglages: reglagesExplicites,
  motsCles,
  etiquette,
  children,
}: ProprietesZoneDeLecture): ReactElement {
  const duContexte = useReglagesLecture();
  const reglages = reglagesExplicites ?? duContexte;

  const [ligneCourante, fixerLigneCourante] = useState(0);

  const lignes = useMemo(() => texte.split('\n'), [texte]);
  const cibles = useMemo(
    () => new Set((motsCles ?? []).map(formeComparable)),
    [motsCles],
  );

  // Le préchargement est déclenché par la zone elle-même : c'est le seul endroit qui sache
  // quelle police est réellement demandée par ce profil. `font-display: block` fait le reste.
  useEffect(() => {
    void prechargerPolice(reglages.police, document);
  }, [reglages.police]);

  // Un texte plus court remet la ligne courante dans le domaine, sans jamais la perdre.
  useEffect(() => {
    fixerLigneCourante((precedente) => Math.min(precedente, Math.max(lignes.length - 1, 0)));
  }, [lignes.length]);

  const guidageActif = reglages.regleDeLecture || reglages.surlignageLigneCourante;

  const choisirLigne = useCallback(
    (rang: number) => {
      fixerLigneCourante(rang);
    },
    [],
  );

  return (
    <div
      data-lecture="oui"
      data-police={reglages.police}
      data-syllabes={reglages.colorationSyllabique ? 'oui' : 'non'}
      className="zone-lecture zone-lecture-v2"
      style={styleDeLecture(reglages) as CSSProperties}
      role="group"
      aria-label={etiquette ?? texte}
    >
      <div className="zone-lecture-lignes">
        {lignes.map((ligne, rang) => {
          const courante = guidageActif && rang === ligneCourante;
          const contenu = (
            <span className="ligne-lecture-texte">
              {ligne.split(/(\s+)/u).map((morceau, position) => {
                if (morceau.trim() === '') {
                  return (
                    <span key={`e${String(position)}`} aria-hidden="true">
                      {morceau}
                    </span>
                  );
                }
                return (
                  <TexteSyllabe
                    key={`m${String(position)}-${morceau}`}
                    mot={morceau}
                    cible={cibles.has(formeComparable(morceau))}
                  />
                );
              })}
            </span>
          );

          // Sans guidage, une ligne est du TEXTE, pas une cible : la rendre tapable
          // introduirait une cible interactive sans usage, que `a11y.spec.ts` compterait à
          // juste titre comme une infraction à R16.
          return guidageActif ? (
            <button
              key={`l${String(rang)}`}
              type="button"
              data-ligne={String(rang)}
              data-ligne-courante={courante ? 'oui' : 'non'}
              className="ligne-lecture ligne-lecture-tapable"
              onClick={() => {
                choisirLigne(rang);
              }}
              aria-label={`Lire la ligne ${String(rang + 1)}`}
              aria-current={courante ? 'true' : undefined}
            >
              {contenu}
            </button>
          ) : (
            <p
              key={`l${String(rang)}`}
              data-ligne={String(rang)}
              data-ligne-courante="non"
              className="ligne-lecture"
            >
              {contenu}
            </p>
          );
        })}
      </div>

      {reglages.regleDeLecture ? (
        <RegleDeLecture
          ligneCourante={ligneCourante}
          nbLignes={lignes.length}
          surChangement={choisirLigne}
        />
      ) : null}

      {children}
    </div>
  );
}
