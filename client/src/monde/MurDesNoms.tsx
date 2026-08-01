// Le mur des noms — v2 § 3.4 et § 5.4, lot L2-F.
//
// « Le mur des noms : mots maîtrisés, chacun rejouable en un tap. »
//
// RÈGLE NON NÉGOCIABLE : **un nom n'est JAMAIS retiré du mur.** « Un acquis n'est jamais
// repris » (v2 § 5.4, R14) : un mot qui aurait disparu du mur serait la seule chose du jeu qui
// se reprenne, et l'enfant le verrait avant nous. La liste ne fait donc que croître, et
// `EcranCampement` la construit depuis les formes de Gobi — c'est-à-dire depuis les graphèmes
// acquis, dont la table SQL `formes_gobi` n'a ni UPDATE ni DELETE.
//
// PLACEHOLDER — à valider : la source des noms.
// La v2 dit « mots maîtrisés » ; le seul acquis lexical journalisé à ce jour est le graphème
// (`formes_gobi`). Le mur affiche donc les FORMES de Gobi, et accepte en plus une liste de mots
// quand un lot saura la produire (la maîtrise par item du Leitner, L2-D). Question consignée
// dans `Docs/questions-en-attente.md`.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useServices } from '../etat/services.js';
import { direTexte } from '../services/voix-navigateur.js';

export interface NomDuMur {
  /** Ce qui est écrit sur la pierre : un graphème, un mot. */
  readonly texte: string;
  /** Ce qu'on entend au tap. Le texte lui-même quand aucun clip n'existe (R15). */
  readonly libelle: string;
  readonly obtenuLe: string | null;
}

export interface ProprietesMurDesNoms {
  readonly noms: readonly NomDuMur[];
  /** Rejouer en un tap. Absent tant qu'aucun nœud de révision n'est composable (L2-D). */
  readonly surRejouer?: (nom: NomDuMur) => void;
}

export function MurDesNoms({ noms, surRejouer }: ProprietesMurDesNoms): ReactElement {
  const services = useServices();

  const toucher = useCallback(
    (nom: NomDuMur): void => {
      // R15 : tout est audible en un tap, sans limite et sans coût.
      void direTexte(services.voix, nom.libelle, null, 'gobi');
      surRejouer?.(nom);
    },
    [services, surRejouer]
  );

  return (
    <section data-mur-des-noms="oui" aria-label="Le mur des noms">
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
        Le mur des noms
      </h2>

      {noms.length === 0 ? (
        // Jamais un écran vide, jamais un reproche : le mur ATTEND, il ne manque pas.
        <p className="zone-lecture" style={{ padding: '0.75rem 1rem', margin: 0 }}>
          Le mur attend tes premiers noms. Ils s’y graveront tout seuls.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          {noms.map((nom) => (
            <li key={nom.texte}>
              <button
                type="button"
                className="cible"
                data-nom={nom.texte}
                aria-label={`Réécouter ${nom.libelle}`}
                onClick={() => {
                  toucher(nom);
                }}
              >
                <span className="zone-lecture" style={{ padding: '0 0.25rem' }}>
                  {nom.texte}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
