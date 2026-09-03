# Recette — cite-des-histoires-14 / cite-des-histoires-banniere-phrase-02

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-14`
- Exercice : `cite-des-histoires-banniere-phrase-02`
- Moteur : `phrase`
- Habillage : `cite.banniere`

Deux phrases CE1 sont à reconstruire : « Mon ami a un ballon. » (5 mots) et « La cour est grande. »
(4 mots). Les neuf étiquettes utiles sont toutes distinctes, sans intrus ; les ordres sont déclarés
explicitement et le moteur mélange leur présentation.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPhrase.test.tsx` : **PASS**, 7 tests.
- La suite couvre texte visible, taps dans l’ordre, mélange, refus sans état d’échec, aide de Gobi,
  double-tap, progression et fin logique.
- Les étiquettes n’ont pas d’asset propre : le moteur phrase rend du texte. La lisibilité tablette
  et l’illustration de l’habillage restent à confirmer visuellement.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — VISUEL RÉEL NON EXÉCUTÉ**. Aucun défaut reproduit ; aucun test rouge ni
correction de code. Aucun asset généré, snapshot, compilation globale ou commit.
