# Recette — marais-jumeau-09 / marais-jumeau-orage-eclair-02

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-09`
- Exercice : `marais-jumeau-orage-eclair-02`
- Moteur : `eclair`
- Habillage : `marais.orage`

Cinq consignes CE1 demandent de toucher le mot lu, exposé 1 800 ms : roi/noir/soir/toit/poire.
Chaque choix oppose la réponse à son jumeau `ou` (rouge, nous, souris, tour, poule). Les dix
options sont distinctes et chaque réponse n’est proposée qu’une fois.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurEclair.test.tsx` : **PASS**, 10 tests.
- La suite couvre exposition, choix mélangés, taps correct/incorrect, refus sans état d’échec,
  aide de Gobi, double-tap et progression jusqu’à la fin.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Texte, exposition, choix et refus
sont couverts ; récompense finale et rendu tablette restent à confirmer dans l’application
complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
