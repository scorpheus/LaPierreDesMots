// La lecture colorée PARTOUT où l'enfant lit — T19 (Docs/tableau-retours.md), 9 octobre 2026.
//
// Le parent : « par défaut, la police avec des couleurs sur les mots/syllabes pour aider la
// lecture, partout ». `ZoneDeLecture` colore un BLOC de lecture (récit, phrase modèle) ; ce
// composant colore un texte COURT posé ailleurs : une consigne, une question, le libellé d'une
// option, d'une case, d'une carte. Il suit le même réglage du profil (`colorationSyllabique`,
// D19, défaut ALLUMÉ) et la même découpe (`decouperSyllabes` + lexique d'exceptions).
//
// Deux différences voulues avec `TexteSyllabe` :
//   - réglage ÉTEINT : il rend le texte brut, sans aucune balise — le DOM est celui d'avant ;
//   - réglage ALLUMÉ : les syllabes se suivent SANS copie accessible cachée. Le `textContent`
//     reste donc exactement le texte (les syllabes recollées le redonnent : contrat de
//     `decouperSyllabes`), et le nom accessible d'un bouton ne double pas. Les syllabes sont
//     des `<span>` en ligne, sans espace entre elles : le mot reste un mot à l'oreille.
//
// Le texte n'est JAMAIS animé ici (« le décor s'agite, le texte jamais ») : la couleur est un
// état, posé une fois.
import type { ReactElement } from 'react';

import { decouperSyllabes } from '@pierre/partage/lecture';

import { useLexique } from './TexteSyllabe.js';
import { useReglagesLecture } from './ZoneDeLecture.js';

export interface ProprietesTexteColore {
  /** Le texte à lire, une ou plusieurs phrases. Les espaces sont gardés tels quels. */
  readonly texte: string;
}

export function TexteColore({ texte }: ProprietesTexteColore): ReactElement {
  const reglages = useReglagesLecture();
  const lexique = useLexique();
  if (!reglages.colorationSyllabique) return <>{texte}</>;
  return (
    <span className="texte-colore" data-syllabes="oui">
      {texte.split(/(\s+)/u).map((morceau, position) => {
        if (morceau === '') return null;
        if (morceau.trim() === '') return morceau;
        return (
          <span key={`${String(position)}-${morceau}`} className="mot-lecture" data-mot={morceau}>
            {decouperSyllabes(morceau, lexique).map((segment) => (
              <span key={`${String(segment.rang)}-${segment.texte}`} className="syllabe" data-syllabe={String(segment.rang % 2)}>
                {segment.texte}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
