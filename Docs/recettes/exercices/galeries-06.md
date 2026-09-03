# Recette — galeries-06 / galeries-pierre-bp-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-06`
- Exercice : `galeries-pierre-bp-01`
- Moteur : `grave`
- Audio : **hors campagne**

L'exercice travaille les graphèmes `b` et `p` par gravure tactile : l'enfant lit la consigne,
observe l'aide visuelle éventuelle, puis trace la lettre demandée pour le mot affiché.

## Quatre preuves

1. **Identification** — `contenu/noeuds/galeries-06.json` relie le nœud à
   `contenu/exercices/galeries/pierre-bp-01.json`, moteur `grave`.
2. **Geste tactile** — `tests/composants/MoteurGrave.test.tsx` couvre la cible et le geste de
   gravure ; le contrôle est activable au doigt et le chemin b/p est exposé sans exiger de
   glisser artificiel.
3. **Refus et réussite** — une trace incorrecte est refusée sans écran d'échec ni perte
   d'acquis ; l'aide est gratuite, la progression atteint la fin et le flux de réussite porte
   la récompense. Le texte reste dans la zone de lecture immobile, adaptée CE1.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurGrave.test.tsx` : **PASS**,
   suite ciblée. Aucun test rouge ni défaut nécessitant une correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette réel n'a été
exécuté ; la précision du tracé b/p, la taille de la zone tactile et la lisibilité restent à
confirmer sur la tablette cible.

## Verdict

**FONCTIONNEL — À CONFIRMER TRACÉ TABLETTE / BLOQUÉ-ASSET si le décor de pierre reste un
blockout.** Le texte, l'aide, le geste tactile, les refus sans échec et la réussite sont
couverts au niveau composant ; la livraison attend validation tactile et décor de production.
