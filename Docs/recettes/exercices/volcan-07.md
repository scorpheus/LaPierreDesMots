# Recette — volcan-07 / volcan-fresque-chrono-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-07`
- Exercice : `volcan-fresque-chrono-01`
- Moteur : `chrono`
- Audio : **hors campagne**

L'exercice demande de remettre des vignettes de fresque dans l'ordre chronologique. La
consigne française et l'aide Gobi sont déclarées ; les vignettes sont mélangées par l'aléa
injecté et doivent rester identifiables et compréhensibles pour un enfant CE1.

## Quatre preuves

1. **Identification** — `contenu/noeuds/volcan-07.json` relie le nœud à
   `contenu/exercices/volcan/fresque-chrono-01.json`, moteur `chrono`.
2. **Gestes et mélange** — `tests/composants/MoteurChrono.test.tsx` couvre le tap et le chemin
   glisser-déposer des vignettes ; le mélange repose sur l'aléa injecté et ne prédit pas l'ordre.
3. **Refus et fin** — un ordre incorrect est refusé sans écran d'échec ni perte d'acquis ;
   l'aide est gratuite, toutes les étapes peuvent finir et le flux de réussite porte la
   récompense. La présence et la lisibilité des vignettes sont un critère visuel de livraison.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurChrono.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette n'a été
exécuté ; les vignettes réellement présentes, leur compréhension, la taille des zones tactiles
et le décor restent à vérifier sur tablette.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/VIGNETTES / BLOQUÉ-ASSET si la fresque reste un
blockout.** Le texte, l'aide, les gestes, le mélange, les refus sans échec et la réussite sont
couverts au niveau composant ; la livraison attend la validation visuelle et tactile.
