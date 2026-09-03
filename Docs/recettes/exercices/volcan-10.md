# Recette — volcan-10 / volcan-wagons-tri-02

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-10`
- Exercice : `volcan-wagons-tri-02`
- Moteur : `tri`
- Audio : **hors campagne**

L'enfant lit les critères « fille » et « quille », puis range les mots dans le wagon
correspondant. Les mots et wagons sont mélangés par l'aléa injecté ; les consignes et l'aide
Gobi restent accessibles.

## Quatre preuves

1. **Identification** — `contenu/noeuds/volcan-10.json` relie le nœud à
   `contenu/exercices/volcan/wagons-tri-02.json`, moteur `tri`.
2. **Geste tactile** — `tests/composants/MoteurTri-affordance.test.tsx` couvre le tap tactile
   de sélection ; la correction `pointerup` de `MoteurTri.tsx` permet ensuite le tap du wagon,
   tandis que le glisser-déposer reste pris en charge.
3. **Parcours et pédagogie** — les critères fille/quille sont rendus dans les réceptacles,
   le mélange injecté évite un ordre prévisible, les refus n'affichent aucun écran d'échec et
   ne reprennent pas un acquis ; l'aide est gratuite et la fin déclenche la récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurTri-affordance.test.tsx tests/composants/MoteurTri.test.tsx` : **PASS**,
   14 tests. Aucun défaut rouge supplémentaire ni correction minimale propre à ce contenu
   n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette n'a été
exécuté ; taille des mots/wagons, lisibilité des critères et contraste restent à confirmer.

## Verdict

**FONCTIONNEL CORRIGÉ — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si les wagons restent un
blockout.** Le texte, les critères, le tap mot+wagon, le mélange, les refus sans échec et la
réussite sont couverts au niveau composant ; la livraison attend validation tactile et asset.
