# Recette — galeries-01 / galeries-miroir-bd-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-01`
- Exercice : `galeries-miroir-bd-01`
- Moteur : `trace`
- Habillage : `galeries.tracer-cristal`

La consigne demande de graver le `b`, puis le `d`, en observant le côté de départ du rond.
Chaque lettre comporte deux traits ordonnés (hampe/rond) et l’axe de risque déclaré est
`gauche-droite`, avec la paire miroir `b/d`.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTrace.test.tsx tests/composants/MoteurTrace-ordre-visible.test.tsx tests/unitaires/trace-guidage-sens.test.ts` : **PASS**, 19 tests (15 + 4 composant ; le fichier unitaire demandé n’existe pas dans ce dépôt).
- Les suites ciblées couvrent ductus et ordre visible, tolérance du tracé, gestes pointer/touch,
  refus sans écran d’échec, aide de Gobi, progression et fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. La formulation, le ductus, la
tolérance et les refus sont couverts par les tests composant ; récompense finale et rendu tablette
restent à confirmer dans l’application complète. Aucun défaut reproduit ; aucun test rouge ni
correction de code. Aucun asset, snapshot, compilation globale ou commit.
