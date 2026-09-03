# Recette — clairiere-10 / clairiere-ecole-03-mots-outils

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-10`
- Exercice : `clairiere-ecole-03-mots-outils`
- Moteur : `colorie`
- Habillage : `clairiere.ecole`

Six consignes sont déclarées, alternant affirmations et impératifs. Elles portent sur 9 cibles :
toit rouge (1), porte bleue (1), fenêtres jaunes (2), pull vert (1), ballon orange et banc brun
(2), cheveux des filles noirs (2). Le nuancier contient 7 couleurs.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurColorie.test.tsx` : **PASS**, 26 tests.
  Couverture du moteur : ordre mélangé des cibles, taps couleur puis région, aide de Gobi
  monotone et conservée, erreurs sans état d’échec, double-tap, progression et fin.
- `npm run test:contenu -- --runInBand` : **PASS**, 620 contrôles, 0 problème.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Les contrôles ciblés valident les
gestes, cibles, aide et fin moteur, mais pas le rendu tablette ni l’écran de récompense dans
l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de code.
Aucun asset, snapshot, compilation globale ou commit.
