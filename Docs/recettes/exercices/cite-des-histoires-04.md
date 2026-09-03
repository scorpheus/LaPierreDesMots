# Recette — cite-des-histoires-04 / cite-des-histoires-banniere-phrase-01

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-04`
- Exercice : `cite-des-histoires-banniere-phrase-01`
- Moteur : `phrase`
- Audio : **hors campagne**

L'enfant reconstitue une phrase française courte à partir de mots CE1 mélangés. La consigne
et l'aide Gobi sont déclarées ; le jeu accepte le tap et conserve le chemin glisser-déposer.

## Quatre preuves

1. **Identification** — le nœud relie l'exercice au moteur `phrase` et à l'habillage de la
   bannière, avec consigne, mots et ordre attendu déclarés.
2. **Geste et mélange** — `tests/composants/MoteurPhrase.test.tsx` couvre les taps dans
   l'ordre et le chemin glisser-déposer ; l'aléa injecté mélange les mots sans exposer l'ordre.
3. **Refus et réussite** — un mot hors ordre est refusé sans écran d'échec ni perte d'acquis ;
   l'aide est gratuite, la phrase finit correctement et le flux de réussite porte la récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurPhrase.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou rendu tablette n'a été
exécuté ; formulation, taille des mots, lisibilité et zones tactiles restent à confirmer.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si la bannière reste un blockout.** Le
texte, l'aide, les taps/glisser, le mélange, les refus sans échec et la réussite sont couverts
au niveau composant ; la livraison attend validation tactile et asset.
