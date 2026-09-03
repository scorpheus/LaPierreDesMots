# Recette — galeries-04 / galeries-grottes-bd-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-04`
- Exercice : `galeries-grottes-bd-01`
- Moteur : `tri`
- Habillage : `galeries.grottes`

La formulation est correcte et naturelle : « Range dans la grotte de gauche les mots avec la
lettre b. », puis la même structure pour la grotte de droite et la lettre d. Deux réceptacles
seulement sont présents, avec 8 mots au total : 4 attendus pour b et 4 pour d. Les mots ne
portent pas simultanément les deux lettres ; les confusions miroir b/d sont déclarées.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- Les tests ciblés couvrent sélection mot puis grotte, mélange, tri correct et refus sans écran
  d’échec, aide de Gobi, cibles tactiles et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Syntaxe, critère b/d, gestes et
refus sont couverts ; récompense finale et rendu tablette restent à confirmer dans l’application
complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
