# Recette — rang 69 / cite-des-histoires-07 / cite-des-histoires-ponts-chemin-01

Date : 2026-09-03

## Périmètre

- Rang : `69`
- Nœud : `cite-des-histoires-07`
- Exercice : `cite-des-histoires-ponts-chemin-01`
- Moteur : `chemin`
- Audio : explicitement hors campagne

Le contenu propose un chemin de lecture en français CE1 : noms et contenus sont déclarés,
avec consigne et aide Gobi utiles. Le gameplay doit fonctionner au tap comme au glisser, avec
un ordre de passage mélangé mais déterminé par l'aléa injecté.

## Quatre preuves

1. **Identification et contenu** — le nœud de rang 69 référence l'exercice `chemin` et son
   habillage ; les noms de ponts, étapes et cibles proviennent du contenu déclaré, sans valeur
   inventée dans le moteur.
2. **Geste et ordre** — `tests/composants/MoteurChemin.test.tsx` couvre les taps sur les
   cibles et le chemin glisser-déposer ; l'ordre est mélangé via l'aléa injecté et les zones
   restent activables au doigt.
3. **Refus, aide et progression** — un passage incorrect est refusé sans écran d'échec ni
   perte d'acquis ; l'aide indique utilement la prochaine cible, reste gratuite, et la fin
   déclenche progression et récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurChemin.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit. Les zones
   tactiles, la lisibilité tablette et l'affichage effectif de l'asset restent à confirmer
   visuellement ; aucun snapshot n'a été lancé.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/ASSET.** Le texte, les noms, l'aide, les gestes,
l'ordre mélangé, les refus sans échec et la récompense sont couverts au niveau composant.
Audio hors campagne et non bloquant ; la livraison attend seulement la validation de l'asset,
des zones tactiles et de la lisibilité sur tablette.
