# Recette — galeries-13 / galeries-grottes-fv-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-13`
- Exercice : `galeries-grottes-fv-01`
- Moteur : `tri`
- Habillage : `galeries.grottes`

La formulation est correcte : « Range dans la grotte de gauche les mots avec la lettre f. » puis
la formulation symétrique pour v. Les consignes 3 et 4 (« dans la grotte du f ou dans la grotte
du v ») restent compréhensibles et évitent le féminin lexical non couvert. Quatre consignes
répartissent 12 mots : six en f et six en v, sans b/d/p/q.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurTri.test.tsx tests/composants/MoteurTri-affordance.test.tsx` :
  **PASS**, 14 tests.
- La suite couvre taps mot+grotte, mélange, critères f/v, refus sans écran d’échec, aide de Gobi,
  cibles tactiles et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Syntaxe, critère f/v, gestes et
refus sont couverts ; récompense finale et rendu tablette restent à confirmer dans l’application
complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
