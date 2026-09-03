# Recette — volcan-08 / volcan-forge-colorie-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-08`
- Exercice : `volcan-forge-colorie-01`
- Moteur : `colorie`
- Habillage : `volcan.forge`

Huit consignes CE1 demandent de colorier huit régions distinctes : seau bleu, tableau noir,
drapeau rouge, chapeau brun, rideau violet, oiseau jaune, mur rose et feu orange. Le nuancier
autorise exactement ces huit couleurs.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurColorie.test.tsx` : **PASS**, 26 tests.
- La suite couvre taps couleur+région, mélange d’ordre, aide de Gobi, refus sans état d’échec,
  double-tap, progression et fin logique.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Texte, 8 zones/cibles, gestes et
refus sont couverts ; récompense finale et rendu tablette restent à confirmer dans l’application
complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
