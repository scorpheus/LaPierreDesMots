# Recette — volcan-11 / volcan-sable-grave-02

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-11`
- Exercice : `volcan-sable-grave-02`
- Moteur : `grave`
- Habillage : `volcan.sable`

Cinq consignes demandent de graver le graphème `ill` dans bille, fille, quille, famille et ville.
La formulation « Grave les lettres pour écrire ce mot » est lisible au CE1. Le clavier tactile
propose `ill`, `il`, `ll` et `l` ; les trous sont positionnés dans chaque mot.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurGrave.test.tsx` : **PASS**, 7 tests.
- La suite couvre clavier/taps, bonne et mauvaise réponse, tolérance et refus sans état d’échec,
  aide de Gobi, double-tap et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Formulation, graphème, gestes et
refus sont couverts ; récompense finale et rendu tablette restent à confirmer dans l’application
complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
