# Recette — volcan-02 / volcan-wagons-tri-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-02`
- Exercice : `volcan-wagons-tri-01`
- Moteur : `tri`
- Habillage : `volcan.wagons`

Sept consignes répartissent 14 mots dans trois wagons : son de « chat » (`ch`), son de « photo »
(`ph`) et son de « coq » (`qu`). Les formulations sont adaptées au CE1 et les deux mots-repères
permettent d’identifier chat/coq sans nommer des graphèmes hors lexique. Les éléments sont disjoints.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- La suite couvre tap mot+wagon, mélange, classement correct, refus sans état d’échec, aide de
  Gobi, prises tactiles et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Texte, critères chat/coq/photo,
gestes, refus et fin sont couverts ; récompense finale et rendu tablette restent à confirmer dans
l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun
asset, snapshot, compilation globale ou commit.
