# Recette — marais-jumeau-01 / marais-jumeau-orage-eclair-01

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-01`
- Exercice : `marais-jumeau-orage-eclair-01`
- Moteur : `eclair`
- Habillage : `marais.orage`

Cinq consignes CE1, chacune affichant un mot pendant 1 800 ms puis demandant de le toucher :
ballon, citron, pont, maison et savon. Chaque choix oppose le mot lu à son jumeau (bille,
carotte, pain, main, sapin) ; les dix options sont distinctes et l’ordre n’est pas prévisible.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurEclair.test.tsx` : **PASS**, 10 tests.
- La suite couvre exposition temporisée, choix mélangés, tap correct/incorrect, refus sans état
  d’échec, aide de Gobi, double-tap, progression et fin du moteur.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Texte, durée d’exposition, taps,
choix et refus sont couverts ; récompense finale et rendu tablette restent à confirmer dans
l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun
asset, snapshot, compilation globale ou commit.
