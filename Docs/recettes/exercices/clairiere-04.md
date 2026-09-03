# Recette — clairiere-04 / clairiere-ecole-02-place

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-04`
- Exercice : `clairiere-ecole-02-place`
- Moteur : `place`
- Habillage : `clairiere.ecole-place`

Le contenu déclare 3 zones et 5 cartes en réserve : soleil → ciel, ballon → à côté du banc,
oiseau → toit de l’école ; poisson et parapluie sont les 2 intrus.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPlace.test.tsx tests/unitaires/place-validation.test.ts` :
  **PASS**, 34 tests (16 composant, 18 validation).
- Les tests ciblés couvrent le rendu de l’école et des 3 zones, les 5 cartes mélangées par Alea,
  les gestes objet puis zone, intrus sans écran d’échec, rappel si dépôt sans saisie, aide de Gobi,
  double-tap sans déplacement, prises tactiles minimales et fin moteur `data-termine="oui"`.

## Verdict

**RECETTE LOGIQUE PASS — VISUEL RÉEL NON EXÉCUTÉ**. Aucun défaut fonctionnel reproduit ; aucun
test rouge ni correction de code n’est justifié. La récompense et le rendu tablette de l’écran
parent restent à confirmer par le parcours navigateur de l’application. Aucun asset généré,
aucun snapshot et aucune compilation globale.
