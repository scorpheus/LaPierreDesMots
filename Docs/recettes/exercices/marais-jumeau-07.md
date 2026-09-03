# Recette — marais-jumeau-07 / marais-jumeau-roseaux-phrase-01

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-07`
- Exercice : `marais-jumeau-roseaux-phrase-01`
- Moteur : `phrase`
- Habillage : `marais.roseaux`

Deux phrases CE1 sont à reconstruire dans l’ordre : « Le grand enfant danse. » et « Maman range
les gants. ». Huit étiquettes utiles et un intrus (`pont`) sont rendus en permanence ; leurs
identifiants et libellés sont distincts.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPhrase.test.tsx` : **PASS**, 7 tests.
- La suite couvre texte visible, taps dans l’ordre, mélange, refus sans état d’échec, aide de Gobi,
  double-tap, progression et fin du moteur.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Formulation, ordre, gestes, refus et
fin sont couverts ; glisser tactile, récompense finale et rendu tablette restent à confirmer dans
l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun
asset, snapshot, compilation globale ou commit.
