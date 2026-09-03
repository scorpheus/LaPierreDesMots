# Recette — galeries-07 / galeries-stalagmites-assemble-01

Date : 2026-09-03

## Périmètre

- Nœud : `galeries-07`
- Exercice : `galeries-stalagmites-assemble-01`
- Moteur : `assemble`
- Habillage : `galeries.stalagmites`

Cinq consignes CE1 demandent d’assembler des syllabes CVC : jardin (jar·din), barbe (bar·be),
tortue (tor·tue), lundi (lun·di) et marche (mar·che). Dix blocs utiles et un intrus (`sar`) sont
présents ; les onze libellés sont distincts.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurAssemble.test.tsx` : **PASS**, 7 tests.
- La suite couvre assemblage correct/incorrect par taps, ordre mélangé, aide de Gobi, double-tap,
  réécoute gratuite, refus sans état d’échec et progression du moteur.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Les tests ciblés valident les gestes,
syllabes, mélange et fin logique ; glisser tactile, récompense finale et rendu tablette restent à
confirmer dans l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de
code. Aucun asset, snapshot, compilation globale ou commit.
