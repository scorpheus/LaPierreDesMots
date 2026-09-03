# Recette — marais-jumeau-11 / marais-jumeau-grenouilles-tri-02

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-11`
- Exercice : `marais-jumeau-grenouilles-tri-02`
- Moteur : `tri`
- Habillage : `marais.grenouilles`

Cinq consignes demandent de classer les mots selon les sons de « trou » (`ou`) puis « noir »
(`oi`). Deux feuilles/réceptacles sont utilisés. Dix mots sont répartis en cinq lots disjoints
(cinq par son) ; les formulations « Range aussi… » et « Range les derniers mots » s’appuient sur
le critère établi et restent compréhensibles au CE1.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- La suite couvre tap mot+réceptacle, mélange, classement, refus sans état d’échec, aide de Gobi,
  prises tactiles et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Critères, gestes, refus et fin sont
couverts ; récompense finale et rendu tablette restent à confirmer dans l’application complète.
Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
