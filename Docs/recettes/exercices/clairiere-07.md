# Recette — clairiere-07 / clairiere-collier-syllabes-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-07`
- Exercice : `clairiere-collier-syllabes-01`
- Moteur : `assemble`
- Habillage : `clairiere.collier`

Le contenu déclare quatre consignes : `mi+di` (midi), `mo+to` (moto), `vé+lo` (vélo),
`té+lé` (télé). Il fournit neuf blocs visibles, dont huit utiles et `pa` comme intrus.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurAssemble.test.tsx tests/composants/aide-de-gobi.test.ts` :
  **PASS**, 22 tests.
- `npm run test:contenu -- --runInBand` : **PASS**, 620 contrôles, 0 problème.
- La suite composant couvre le schéma, l’habillage, assemblage correct et incorrect, absence
  d’écran d’échec, aide `indice`, réécoute gratuite et double-tap. La suite d’aide couvre la
  résolution pour l’exercice réel.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Les tests ciblés valident les gestes
de tap et la fin du moteur, mais ne reproduisent pas le glisser tactile ni l’écran de récompense
dans l’application complète. Aucun défaut fonctionnel reproduit ; aucun test rouge ni correction
de code. Aucun asset, snapshot, compilation globale ou commit.
