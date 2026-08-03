/**
 * LE DÉCOR, MONTÉ UNE FOIS POUR TOUS LES MOTEURS — R9, arbitré par le père le 2026-08-03.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT, RECENSÉ SUR LES OBJETS ET NON SUR LES OCCURRENCES
 *
 * Trouvé en cherchant pourquoi la luciole restait invisible après avoir été dessinée. Elle
 * l'était : le SVG la portait, l'habillage la déclarait (surface 7 152, centroïde [300, 252]).
 * Mais `MoteurEclair` ne montait jamais la scène — il rendait la consigne, l'éclair du mot,
 * « Revoir » et les options, et l'habillage ne lui servait qu'à remplir `data-habillage`.
 *
 * Les quatorze moteurs énumérés un par un :
 *
 *     colorie  OUI (SceneSvg)      assemble attrape chemin chrono eclair grave
 *     place    OUI (ScenePlace)    histoire libre paires phrase trace tri   → NON
 *
 * **2 sur 14.** Et le décor n'était pas monté autour non plus : `EcranNoeud` n'utilisait
 * l'habillage que pour poser ses jetons de palette en variables CSS.
 *
 * Ce n'est pas qu'une question de laideur. « Moteur × habillage × contenu » est l'axe qui porte
 * la promesse de variété — R12 et R13. **Un habillage qui ne s'affiche pas rend R13
 * inobservable** : deux sorties « avec des habillages différents » sont identiques à l'écran.
 * 53 décors et 508 régions étaient produits, mesurés, validés — et deux atteignaient l'enfant.
 *
 * ── CE QUE CE COMPOSANT EST, ET CE QU'IL N'EST PAS ────────────────────────────────────────────
 * Il est un FOND. Il ne reçoit jamais le doigt, ne porte aucun `data-region-svg`, n'entre dans
 * aucun journal. Les moteurs qui ont besoin d'un décor ACTIONNABLE — `colorie` tape ses régions,
 * `place` y dépose — montent le leur et se passent de celui-ci : deux scènes superposées
 * voudraient dire deux fois le même dessin, et la seconde mangerait les taps de la première.
 *
 * Il reste en GRISAILLE, toujours. Le décor de fond n'est pas une récompense : ce qui se rallume
 * est la carte du monde (D51), pas l'arrière-plan de l'exercice en cours. Un fond qui se
 * coloriserait tout seul volerait au coloriage son signal.
 *
 * ── LA DISCRÉTION EST UNE CONTRAINTE, PAS UN GOÛT ─────────────────────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3) : dès qu'il y a du déchiffrage, rien ne bouge
 * dans le champ de lecture. Ce fond est donc IMMOBILE — aucune animation, jamais — et posé à
 * faible opacité pour que le contraste du texte au-dessus reste celui que `test:qualite` mesure.
 * Un fond trop présent ferait échouer l'audit de contraste, et il aurait raison.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import type { Habillage } from '@pierre/partage';

import { chargerSceneHabillage } from './chargeur.js';

/**
 * Les moteurs qui montent DÉJÀ leur propre scène, et qui doivent donc se passer du fond.
 *
 * Cette liste est un DOUBLON de la réalité du code, et un doublon se met à mentir. C'est
 * exactement ce qui vient d'arriver aux polices — deux listes côte à côte, trois entrées dans
 * l'une et pas dans l'autre, et des requêtes qui recevaient du HTML pendant des semaines.
 *
 * `tests/unitaires/decor-de-fond.test.ts` la croise donc avec les fichiers des moteurs : un
 * moteur qui se met à monter sa scène sans être inscrit ici afficherait DEUX décors, et
 * l'inverse n'en afficherait aucun. Les deux fautes sont silencieuses à l'œil du développeur et
 * évidentes pour l'enfant.
 */
export const MOTEURS_AVEC_SCENE_PROPRE: readonly string[] = ['colorie', 'place'];

export interface ProprietesDecorDeFond {
  readonly habillage: Habillage;
  /** Code du moteur monté par-dessus. Décide si ce fond doit s'effacer. */
  readonly moteur: string;
}

/**
 * Opacité du fond. **Réglée par la contrainte de contraste, pas à l'œil.**
 *
 * Le trait du décor est `#1B2440` sur `#FFF6E3`. À 0,14, un trait de 4 px reste lisible comme
 * ambiance tout en laissant au texte de consigne — qui est noir sur parchemin dans
 * `ZoneDeLecture` — la totalité de son contraste : le fond ne passe jamais SOUS le champ de
 * lecture, qui porte son propre fond opaque.
 */
const OPACITE_FOND = 0.14;

export function DecorDeFond({ habillage, moteur }: ProprietesDecorDeFond): ReactElement | null {
  const [markup, fixerMarkup] = useState<string | null>(null);
  const aSaPropreScene = MOTEURS_AVEC_SCENE_PROPRE.includes(moteur);

  useEffect(() => {
    if (aSaPropreScene) {
      return undefined;
    }
    let vivant = true;
    void chargerSceneHabillage(habillage)
      .then((texte) => {
        if (vivant) fixerMarkup(texte);
      })
      .catch(() => {
        // Un décor absent n'est pas une erreur de jeu : l'exercice reste entièrement jouable
        // sans lui. On ne montre rien plutôt que d'afficher un cadre vide, et on ne journalise
        // pas — ce n'est pas un incident, c'est un asset qui n'est pas encore produit.
        if (vivant) fixerMarkup(null);
      });
    return () => {
      vivant = false;
    };
  }, [habillage, aSaPropreScene]);

  const contenu = useMemo(() => (markup === null ? null : { __html: markup }), [markup]);

  if (aSaPropreScene || contenu === null) {
    return null;
  }

  return (
    <div
      data-decor-de-fond="oui"
      data-decor-habillage={habillage.id}
      // Le fond ne s'annonce jamais aux lecteurs d'écran : la consigne dit tout ce qu'il y a à
      // savoir, et un décor décrit deux fois est un décor qui bavarde par-dessus la consigne.
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        // JAMAIS le doigt. Les commandes du moteur sont au-dessus ; un fond qui intercepte est
        // un jeu qui ne répond plus, et c'est le pire défaut possible sur une appli d'enfant.
        pointerEvents: 'none',
        zIndex: 0,
        opacity: OPACITE_FOND,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden'
      }}
      dangerouslySetInnerHTML={contenu}
    />
  );
}
