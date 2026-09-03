# Recette — cite-des-histoires-01 / cite-des-histoires-bibliotheque-histoire-01

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-01`
- Exercice : `cite-des-histoires-bibliotheque-histoire-01`
- Moteur : `histoire`
- Audio : **hors campagne**

Le récit et ses questions sont rédigés en français CE1. Chaque question propose des choix
mélangés ; l'aide Gobi est déclarée et réécoutable sans coût.

## Quatre preuves

1. **Identification** — le nœud et l'exercice déclarent le moteur `histoire` et l'habillage de
   la bibliothèque, avec récit, questions, réponses et options.
2. **Geste et mélange** — `tests/composants/MoteurHistoire.test.tsx` couvre les taps sur les
   choix ; le mélange dépend de l'aléa injecté et ne rend pas la réponse prévisible.
3. **Refus et réussite** — une mauvaise réponse est refusée sans écran d'échec ni perte
   d'acquis ; l'aide est gratuite, toutes les questions peuvent être terminées et le flux
   final déclenche la récompense. Le texte reste dans la zone de lecture immobile.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurHistoire.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette n'a été
exécuté ; compréhension des illustrations, taille des choix et lisibilité restent à confirmer.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le décor de bibliothèque reste un
blockout.** Le récit, les questions, l'aide, les taps, le mélange, les refus sans échec et la
réussite sont couverts au niveau composant ; la livraison attend validation tactile et asset.
