# Recette — cite-des-histoires-03 / cite-des-histoires-pellicule-chrono-01

Date : 2026-09-03
Moteur : `chrono`
Habillage : `cite.pellicule`

## Parcours joué

Trois consignes demandent de ranger trois vignettes dans l'ordre de trois petits récits : plage,
seau, sable ; château petit, grand, montré ; puis arrivée de Plume, caillou, danse. Les textes et
libellés sont français, courts et lisibles CE1. L'aide Gobi relit, souffle ou montre la cible
gratuitement.

Les vignettes sont sélectionnables au tap puis déplaçables par glisser dans la frise ; l'ordre
initial est mélangé et une vignette déjà numérotée est refusée sans écran d'échec. Les trois étapes
se terminent et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre fixe et la vignette réutilisée qui bloqueraient la
chronologie. Les tests composants couvrent tap/glisser, aide, refus doux et fin ; les réducteurs
couvrent la progression.

```text
npm test -- --run tests/composants/MoteurChrono.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les vignettes font 220×160 px et sont des cibles tactiles distinctes ; le tap et le glisser sont
réellement pris en charge. Le rendu est lisible, sans état d'échec.

**BLOQUÉ-ASSET** — les neuf vignettes déclarent `asset: null`; aucune image réelle n'est présente.
Aucun asset n'a été généré.
