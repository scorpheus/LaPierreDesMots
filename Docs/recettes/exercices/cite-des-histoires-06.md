# Recette — cite-des-histoires-06 / cite-des-histoires-vitrail-chrono-01

Date : 2026-09-03
Moteur : `chrono`
Habillage : `cite.vitrail`

## Parcours joué

Trois consignes présentent chacune trois vignettes à ranger : nuage, pluie, rivière ; rivière,
lac, soleil ; puis nuage petit, nuage gros, jardin. Les récits et libellés sont français, courts
et compréhensibles au CE1. L'aide Gobi relit, souffle ou montre la cible gratuitement.

Les vignettes sont réellement affichées comme cibles de 220×160 px. Elles sont mélangées avant le
parcours ; le tap sélectionne une vignette et le glisser la dépose dans la frise. Une vignette déjà
numérotée ou un mauvais placement est refusé sans écran d'échec. Les trois étapes progressent
jusqu'à la réussite et la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre fixe et la vignette réutilisée qui rendraient la
chronologie triviale ou interminable. Les tests composants couvrent tap/glisser, aide, refus doux
et fin ; les réducteurs couvrent la progression.

```text
npm test -- --run tests/composants/MoteurChrono.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne.

## Verdict tablette

Les vignettes sont de grandes cibles tactiles séparées et le tap reste possible si le glisser est
difficile. Le texte demeure lisible et hors du décor animé.

**BLOQUÉ-ASSET** — les neuf vignettes déclarent `asset: null`; aucune image réelle n'est
affichable. Aucun asset n'a été généré.
