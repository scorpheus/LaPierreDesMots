# Recette — marais-jumeau-03 / marais-jumeau-grenouilles-tri-01

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-03`
- Exercice : `marais-jumeau-grenouilles-tri-01`
- Moteur : `tri`
- Habillage : `marais.grenouilles`

Les formulations sont compréhensibles pour le CE1 : les quatre premières consignes demandent de
classer selon le son de « pont » ou de « gant », et la cinquième indique les derniers mots dans le
contexte établi. Deux feuilles/réceptacles sont utilisés. Dix mots sont répartis (cinq par son) en
cinq étapes, sans mélange de critères ni réemploi d’élément.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- La suite couvre tap mot+réceptacle, mélange, classement correct, refus sans écran d’échec,
  aide de Gobi, prises tactiles et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Critères, gestes, refus et fin sont
couverts ; récompense finale et rendu tablette restent à confirmer dans l’application complète.
Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
