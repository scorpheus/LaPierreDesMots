# Recette — clairiere-06 / clairiere-lucioles-attrape-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-06`
- Exercice : `clairiere-lucioles-attrape-01`
- Moteur : `attrape`
- Habillage : `clairiere.lucioles`

La consigne est audible et affichée (« Attrape les lucioles où tu lis le mot bleu », puis
vert, rouge et jaune). Le contenu comporte quatre étapes et six lucioles-cibles au total
(deux bleues, deux vertes, une rouge, une jaune), avec des intrus ; l'aide de Gobi est
déclarée sans coût d'erreur.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurAttrape.test.tsx` : **PASS**, 7 tests.
  La suite couvre le schéma, l'habillage, le tap d'une cible, le refus sans écran d'échec,
  l'aide, le double-tap et la réécoute gratuite.
- Le composant rend les cibles comme boutons nommés et leur `onClick` émet l'action
  `attraper` ; aucun défaut de geste n'a été reproduit dans la suite ciblée.
- Mélange : l'état est créé par `moteurAttrape.creerEtat` avec `alea` injecté ; la suite
  utilise l'aléa de test déterministe. La fin et la récompense sont portées par le réducteur
  après toutes les cibles attendues ; aucun écran `data-etat="echec"` n'est rendu.
- Le rendu tablette et le décor final restent à confirmer visuellement : aucun snapshot ni
  parcours Playwright n'a été lancé dans cette recette.

## Défaut rouge / correction verte

Aucun défaut fonctionnel rouge n'a été reproduit pour `attrape` sur le test ciblé existant ;
aucune modification de code n'est donc justifiée. La preuve verte est la suite ciblée passée
et la couverture du geste naturel par clic sur cible.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le SVG des lucioles reste un
blockout.** Le moteur, le texte, l'aide, le mélange, la réussite sans échec et la progression
sont couverts au niveau composant. La recette de livraison ne peut être déclarée complète tant
que le rendu tablette et la validation de production de `clairiere.lucioles` ne sont pas établis.
