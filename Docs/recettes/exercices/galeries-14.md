# Recette — galeries-14 / galeries-cristal-fv-01

Date : 2026-09-03
Moteur : `eclair`
Habillage : `galeries.cristal`

## Parcours joué

Les six étapes flashent `fer`, `ver`, `sac`, `zoo`, `four`, puis `jour`, avec une exposition de
1 400 ms et trois choix à chaque fois. La consigne « Touche le mot que tu as lu. » est courte,
française, audible via l'écoute et adaptée au CE1. L'aide Gobi relit, souffle ou surligne
gratuitement.

Le tap sur chaque option est le geste effectif. Les réponses sont distinctes et les choix sont
mélangés une fois par `Alea`, donc l'ordre n'est pas prédictible. Une mauvaise option compte une
erreur et expose la confusion sans écran d'échec ; la réécoute et « Revoir » restent gratuites.
Les six réussites terminent l'exercice et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre les défauts de `Revoir` inopérant et d'éclair suivant démarré
avant « Prêt ? ». Les tests unitaires couvrent le mélange et les acquis ; les tests composants
couvrent tap, aide, refus doux et progression.

```text
npm test -- --run tests/composants/MoteurEclair.test.tsx tests/unitaires/eclair-ordre-options.test.ts tests/unitaires/moteurs-reducteurs.test.ts
114 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les trois choix sont des boutons tactiles séparés, avec porte « Prêt ? » et plateau hors du décor
animé. Le tap ne demande aucune coordination fine.

**BLOQUÉ-ASSET** — l'asset final de `galeries.cristal` reste à valider ; aucun asset n'a été
généré.
