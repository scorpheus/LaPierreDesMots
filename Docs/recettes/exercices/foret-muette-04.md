# Recette — foret-muette-04 / foret-muette-message-phrase-01

Date : 2026-09-02

## Périmètre

- Nœud : `foret-muette-04`
- Exercice : `foret-muette-message-phrase-01`
- Moteur : `phrase`
- Habillage : `foret.message`

Deux consignes CE1 demandent de toucher les mots dans l’ordre pour reconstruire : « Un ours est
grand. » puis « Les oiseaux sont noirs. ». Le contenu fournit 8 étiquettes utiles et 1 intrus
(`arbre`), toutes visibles et distinctes.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPhrase.test.tsx` : **PASS**, 7 tests.
- La suite ciblée couvre l’ordre mélangé, taps sur les étiquettes, mauvaise réponse/refus sans
  état d’échec, aide de Gobi, double-tap et progression jusqu’à la fin du moteur.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. La reconstruction et les refus sont
couverts par le composant contrôlé ; glisser tactile, récompense finale et rendu tablette restent
à confirmer dans l’application complète. Aucun défaut reproduit ; aucun test rouge ni correction
de code. Aucun asset, snapshot, compilation globale ou commit.
