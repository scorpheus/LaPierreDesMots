# Recette — volcan-01 / volcan-etoiles-filantes-attrape-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-01`
- Exercice : `volcan-etoiles-filantes-attrape-01`
- Moteur : `attrape`
- Audio : **hors campagne**

L'exercice ouvre la région volcanique avec une consigne française courte, des cibles à
attraper et des intrus. Le texte CE1 et l'aide Gobi sont déclarés ; les cibles sont mélangées
par l'aléa injecté afin que leur position ne soit pas prévisible.

## Quatre preuves

1. **Identification** — `contenu/noeuds/volcan-01.json` relie le nœud à
   `contenu/exercices/volcan/etoiles-filantes-attrape-01.json`, moteur `attrape`.
2. **Geste** — `tests/composants/MoteurAttrape.test.tsx` couvre le tap d'une cible et le
   double-tap ; les boutons sont activables au doigt. Le mélange repose sur l'aléa injecté,
   sans position codée comme réponse.
3. **Refus et fin** — une cible incorrecte est refusée sans écran d'échec ni perte d'acquis ;
   l'aide est gratuite, toutes les cibles attendues peuvent être attrapées et la réussite
   déclenche le flux de récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurAttrape.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ni rendu tablette n'a été
exécuté ; taille des cibles, contraste et lisibilité doivent être confirmés sur tablette.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le décor des étoiles reste un
blockout.** Le texte, l'aide, les taps, le mélange, les refus sans échec et la réussite sont
couverts au niveau composant ; la livraison attend les validations tactile et asset.
