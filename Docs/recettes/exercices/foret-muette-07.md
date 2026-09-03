# Recette — foret-muette-07 / foret-muette-veillee-automne-histoire-01

Date : 2026-09-03

## Périmètre

- Nœud : `foret-muette-07`
- Exercice : `foret-muette-veillee-automne-histoire-01`
- Moteur : `histoire`
- Habillage : `foret.veillee-automne`

Le récit CE1 « La veillée » comporte six phrases courtes. Trois questions suivent : vrai/faux
sur le hibou, puis deux choix à trois options sur les enfants et l’ours. Les réponses correctes
sont respectivement `q1-oui`, `q2-feu` et `q3-ours`; les options sont distinctes et mélangées.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurHistoire.test.tsx` : **PASS**, 7 tests.
- La suite couvre récit visible/repliable, affichage texte, choix correct et refus sans état
  d’échec, mélange des options, aide de Gobi, réécoute gratuite, progression et fin du moteur.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Récit, taps, choix et refus sont
couverts par le composant contrôlé ; récompense finale et rendu tablette restent à confirmer dans
l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun
asset, snapshot, compilation globale ou commit.
