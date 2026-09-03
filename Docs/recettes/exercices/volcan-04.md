# Recette — volcan-04 / volcan-geodes-paires-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-04`
- Exercice : `volcan-geodes-paires-01`
- Moteur : `paires`
- Audio : **hors campagne**

Le jeu demande de retourner des géodes et de retrouver toutes les paires. Les consignes et
l'aide de Gobi sont déclarées ; chaque paire possède deux faces réellement rendues (face
cachée puis image/face révélée), et l'ordre initial est mélangé par l'aléa injecté.

## Quatre preuves

1. **Identification** — `contenu/noeuds/volcan-04.json` relie le nœud à
   `contenu/exercices/volcan/geodes-paires-01.json`, moteur `paires` et son habillage.
2. **Geste et faces** — `tests/composants/MoteurPaires.test.tsx` couvre le tap/retournement
   des cartes ; les faces cachée et révélée sont présentes dans le DOM, et toutes les paires
   peuvent être sélectionnées malgré le mélange déterministe.
3. **Refus et réussite** — une paire incorrecte est refusée sans écran d'échec ni perte
   d'acquis ; l'aide est gratuite, les paires restantes sont rejouables et la fin déclenche
   le flux de réussite/récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurPaires.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette n'a été
exécuté ; compréhension des images, taille des cartes et retournement tactile restent à
confirmer sur tablette.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/IMAGES / BLOQUÉ-ASSET si les géodes restent un
blockout.** Le texte, l'aide, les taps, les deux faces, le mélange, les refus sans échec et la
réussite sont couverts au niveau composant ; la livraison attend validation visuelle et tactile.
