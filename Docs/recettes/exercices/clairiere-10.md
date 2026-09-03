# Recette — clairiere-10 / clairiere-ecole-03-mots-outils

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-10`
- Exercice : `clairiere-ecole-03-mots-outils`
- Moteur : `colorie`
- Habillage : `clairiere.ecole`

Six consignes sont déclarées, alternant affirmations et impératifs. Elles portent sur huit
cibles visibles dans l'image finale : toit, porte, deux fenêtres, pull et cheveux de la
maîtresse, banc et tableau. Le nuancier contient sept couleurs.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurColorie.test.tsx` : **PASS**, 26 tests.
  Couverture du moteur : ordre mélangé des cibles, taps couleur puis région, aide de Gobi
  monotone et conservée, erreurs sans état d’échec, double-tap, progression et fin.
- `npm run test:contenu -- --runInBand` : **PASS**, 620 contrôles, 0 problème.

## Verdict

**FOND RASTER ET VRAI GESTE VALIDÉS.** Le test `parcours-regression-decor-clairiere.spec.ts`
vérifie le fond `ecole.png`, le cadrage entier en 1920×1080 et 1920×1200, puis un vrai choix de
couleur et un vrai tap sur le toit. Les zones hors consigne ne prennent plus le doigt.
