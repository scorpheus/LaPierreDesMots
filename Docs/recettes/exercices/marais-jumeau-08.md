# Recette — marais-jumeau-08 / marais-jumeau-brume-colorie-01

Date : 2026-09-03
Moteur : `colorie`
Habillage : `marais.brume`

## Parcours joué

Sept consignes sont jouables jusqu'à la fin : caillou brun, mouche noire, souris rose, poule
jaune, roue rouge, route orange, puis ciel bleu. Les textes sont courts, français et CE1 ; l'aide
Gobi relit, montre la couleur ou montre la cible gratuitement.

Chaque étape demande le tap d'une couleur puis d'une région SVG exacte. Les sept régions sont
distinctes (`caillou`, `mouche`, `souris`, `poule`, `roue`, `route`, `ciel`) et le nuancier fournit
huit couleurs autorisées. Une mauvaise combinaison ou une région déjà peinte est refusée sans
écran d'échec ; la progression reste récupérable. La septième réussite clôt l'exercice et
transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre la cible non peignable et le doublon de région qui bloquerait la
progression. Les tests composants couvrent tap couleur+région, refus doux, aide et fin ; les
réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurColorie.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
125 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Le nuancier et les régions sont des cibles tactiles distinctes, assez grandes pour le doigt ; le
tap ne demande pas de coordination fine et le texte reste hors du décor animé.

**BLOQUÉ-ASSET** — l'asset final de `marais.brume` reste à valider. Aucun asset n'a été généré.
