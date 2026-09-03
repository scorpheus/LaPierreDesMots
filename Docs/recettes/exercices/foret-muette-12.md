# Recette — foret-muette-12 / foret-muette-message-phrase-02

Date : 2026-09-03

## Périmètre

- Nœud : `foret-muette-12`
- Exercice : `foret-muette-message-phrase-02`
- Moteur : `phrase`
- Audio : **hors campagne**

Deux consignes identiques et audibles (« Touche les mots dans l’ordre ») demandent de
reconstituer deux phrases CE1 à partir de mots mélangés. L'aide Gobi est déclarée et reste
gratuite.

## Quatre preuves

1. **Identification/contenu** — `contenu/noeuds/foret-muette-12.json` relie le nœud à
   `contenu/exercices/foret-muette/message-phrase-02.json`, moteur `phrase`.
2. **Gestes** — `tests/composants/MoteurPhrase.test.tsx` couvre le tap des mots dans l'ordre,
   ainsi que le chemin glisser-déposer ; les mots sont des contrôles activables au doigt.
3. **Ordre, refus et fin** — le mélange est produit par l'aléa injecté ; un mot hors ordre est
   refusé sans écran d'échec ni perte d'acquis, l'aide reste sans coût, et les deux étapes
   finissent sur le flux de réussite/récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurPhrase.test.tsx` : **PASS**
   (suite ciblée). Aucun défaut rouge nécessitant une correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, rendu tablette, snapshot ou asset n'a été
exécuté. La lisibilité Andika et les zones tactiles restent à confirmer sur tablette réelle.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le décor associé reste un blockout.**
Le texte CE1, l'aide, les taps/glisser, l'ordre mélangé, les refus sans échec et la réussite
sont couverts au niveau composant ; la livraison attend validation tactile et décor de production.
