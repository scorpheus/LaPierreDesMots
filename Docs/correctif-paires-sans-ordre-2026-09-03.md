# Correctif des paires sans ordre — 3 septembre 2026

## Défaut mesuré

Le plateau du moteur `paires` affiche toutes ses cartes simultanément, mais le réducteur refusait
une paire correcte lorsqu'elle appartenait à une consigne déclarée après la consigne courante.
Dans le Marais Jumeau, associer l'image du sapin au mot « sapin » avant `lapin` et `matin`
produisait ainsi « On garde cette carte pour une autre fois. »

Le défaut touchait les huit exercices qui utilisent ce moteur : l'ordre des groupes JSON était
devenu, sans être affiché, une règle de jeu.

## Correction

- toute paire correcte encore demandée par l'un des groupes est acceptée immédiatement ;
- la paire est retirée de son groupe propriétaire et les groupes déjà terminés sont sautés ;
- le cartouche affiche la progression globale du plateau, sans « Étape X / Y » invisible pour
  l'enfant ;
- la capacité `ordreEtapesImpose` du moteur vaut désormais `false` ;
- un test de composant termine tout le plateau dans l'ordre inverse des groupes ;
- une recette Chromium reproduit exactement le geste image-sapin puis mot-sapin et vérifie
  `1 / 6 paires` sans message de refus.

L'audio demeure hors de ce correctif.
