# Recette — galeries-09 / galeries-frise-chrono-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-09`
- Exercice : `galeries-frise-chrono-01`
- Moteur : `chrono`
- Audio : **hors campagne**

L'enfant remet des vignettes dans l'ordre chronologique à partir d'une consigne française
audible et de l'aide de Gobi. Les vignettes sont des éléments déclarés du contenu, mélangés
par l'aléa injecté ; leur existence et leur compréhension visuelle restent un point de recette.

## Quatre preuves

1. **Identification et contenu** — `contenu/noeuds/galeries-09.json` relie le nœud à
   `contenu/exercices/galeries/frise-chrono-01.json`,
   moteur `chrono` et son habillage.
2. **Gestes** — `tests/composants/MoteurChrono.test.tsx` couvre la sélection/tap et le chemin
   glisser-déposer des vignettes ; l'ordre est mélangé de façon déterministe par l'aléa injecté.
3. **Refus et réussite** — un ordre incorrect est refusé sans écran d'échec ni perte d'acquis ;
   l'aide est gratuite et la séquence finit sur le flux de réussite/récompense. Les vignettes
   doivent être présentes et lisibles pour que l'ordre soit compréhensible par l'enfant.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurChrono.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot ou rendu tablette n'a été exécuté ;
l'existence effective, le cadrage et la compréhension des vignettes doivent être vérifiés sur
le décor livré. Le fichier d'exercice est bien présent sous le chemin indiqué ci-dessus.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/VIGNETTES / BLOQUÉ-ASSET si les vignettes ou le décor
restent un blockout.** Le texte, l'aide, les gestes, le mélange, les refus sans échec et la
réussite sont couverts au niveau composant ; la livraison attend la validation visuelle.
