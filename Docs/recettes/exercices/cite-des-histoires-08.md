# Recette — cite-des-histoires-08 / cite-des-histoires-rayonnages-tri-01

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-08`
- Exercice : `cite-des-histoires-rayonnages-tri-01`
- Moteur : `tri`
- Habillage : `cite.rayonnages`

Cinq consignes demandent de classer dix énoncés selon le renard ou le hibou. Les formulations
sont lisibles au CE1 et les critères sont portés par les deux rayons. Les éléments sont disjoints,
avec 5 mots par catégorie ; les assets d’éléments sont `null` car ce moteur rend du texte, tandis
que le décor est fourni par l’habillage.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- La suite couvre le tap tactile mot+réceptacle, les zones de prise, le mélange, tri correct,
  refus sans état d’échec, aide de Gobi et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — VISUEL RÉEL NON EXÉCUTÉ**. Le tap tactile corrigé, le texte, les
catégories et la fin logique sont couverts ; récompense et lisibilité tablette restent à confirmer
dans l’application complète. Aucun défaut reproduit ; aucune correction de code, asset généré,
snapshot, compilation globale ou commit.
