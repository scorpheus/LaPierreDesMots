# Recette — galeries-03 / galeries-cristal-bd-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-03`
- Exercice : `galeries-cristal-bd-01`
- Moteur : `eclair`
- Audio : **hors campagne**

L'exercice présente des mots français courts en exposition éclair, puis demande un choix
parmi des réponses mélangées. Les consignes et l'aide de Gobi restent accessibles ; aucun
résultat négatif ni écran d'échec n'est prévu.

## Quatre preuves

1. **Identification** — `contenu/noeuds/galeries-03.json` relie le nœud à
   `contenu/exercices/galeries/cristal-bd-01.json`, moteur `eclair` et habillage déclaré.
2. **Geste** — `tests/composants/MoteurEclair.test.tsx` couvre le tap sur une réponse ; le
   choix est un bouton directement activable au doigt, avec réponses mélangées par l'aléa
   injecté et non prévisibles.
3. **Parcours** — une mauvaise réponse est un refus réessayable sans écran d'échec ni perte
   d'acquis ; l'aide est gratuite, la série avance jusqu'à la réussite et le flux final porte
   la récompense. Le texte français est rendu dans la zone de lecture prévue.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurEclair.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio hors campagne. Aucun parcours navigateur, snapshot, asset ou validation du rendu tablette
n'a été exécuté ; contraste, taille des boutons et temps d'exposition restent à confirmer sur
la tablette cible.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le cristal associé reste un blockout.**
Le texte, l'aide, les taps, le mélange non prévisible, les refus sans échec et la récompense
sont couverts au niveau composant ; la livraison attend les validations tactile et asset.
