# Recette — cite-des-histoires-05 / cite-des-histoires-theatre-ombres-histoire-01

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-05`
- Exercice : `cite-des-histoires-theatre-ombres-histoire-01`
- Moteur : `histoire`
- Habillage : `cite.theatre-ombres`

Le récit CE1 comporte sept phrases courtes et cinq questions : deux vrai/faux et trois choix à
trois options. Les questions portent sur la cour, le trou, Filou et le ballon ; les choix sont
distincts et mélangés par le moteur. La question 3 emploie explicitement l’ombre de Filou/Plume/Gobi.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurHistoire.test.tsx` : **PASS**, 7 tests.
- La suite couvre texte visible, taps/choix mélangés, réponses correctes, refus sans état
  d’échec, aide de Gobi, réécoute gratuite, progression et fin logique.
- Les questions d’histoire n’ont pas de champ d’asset : elles rendent des libellés textuels ; la
  lisibilité des ombres illustrées et du rendu tablette reste à confirmer visuellement. Audio hors
  campagne, non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — VISUEL RÉEL NON EXÉCUTÉ**. Aucun défaut fonctionnel reproduit ; aucun
test rouge ni correction de code. Aucun asset généré, snapshot, compilation globale ou commit.
