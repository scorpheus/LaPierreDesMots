# Retour — mélange d’Attrape — 2026-09-05

## Décision implantée

Le moteur Attrape tire l’ordre des cibles une seule fois par session avec l’`Alea` injecté. Le
catalogue est d’abord trié par identifiant : l’ordre éditorial des tableaux `cibles` et
`consignes` ne choisit donc jamais la première prise visible. La même permutation alimente le
rendu et la grille intrinsèque ; un bouton ne peut pas être mélangé dans le DOM tout en gardant
la position d’avant le tirage.

L’ordre reste stable après un rerender ou une aide. À la fermeture de la session, il est oublié et
la session suivante tire à nouveau. Une mémoire transitoire indexée par `useId` évite que
StrictMode consomme deux fois le même `Alea` durant son double montage de développement.

## Garde ajoutée

`tests/composants/MoteurAttrapeMelange.test.tsx` monte les sept fiches Attrape réelles :

- la permutation attendue est calculée par un autre `Alea` de même graine ; chaque cible est
  conservée une seule fois et l’ordre diffère du tableau de données ;
- l’ordre éditorial inversé des cibles et des consignes conserve la même permutation et les mêmes
  positions de grille ;
- rerender et aide ne retirent pas de nombre supplémentaire ; une nouvelle session en retire un ;
- `StrictMode` ne retire qu’une fois.

## Exécution

RED constaté par l’orchestrateur : les trois cas échouaient parce que le moteur rendait encore
`contenu.cibles` dans l’ordre du fichier. Cette agente n’a exécuté ni test, ni compilation, ni
installation après la correction : la campagne réserve ces commandes à l’orchestrateur. Aucune
fiche de contenu ni règle phonologique n’a été modifiée.
