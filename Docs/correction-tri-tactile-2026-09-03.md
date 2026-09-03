# Correction des exercices de tri au doigt — 3 septembre 2026

## Défaut reproduit

Sur `clairiere-03`, les mots étaient visibles mais impossibles à toucher. Le même défaut affectait
les onze nœuds qui utilisent le moteur `tri`.

La couche des réceptacles couvrait toute la scène et était rendue après celle des mots, au même
niveau d'empilement. Sa surface transparente interceptait donc le hit-test du navigateur. Les
anciens tests appelaient `dispatchEvent` directement sur les boutons : ils validaient le réducteur
en contournant précisément cette couche, et ne pouvaient pas reproduire le geste réel.

Un second défaut venait des zones du contenu, prévues pour situer les paniers dans le décor. Le
rendu `slice` les agrandissait jusqu'à environ 720 × 520 px sur écran large, puis le moteur
réutilisait ces dimensions comme panneaux opaques.

## Correction

- la couche plein écran des réceptacles ne reçoit plus les événements du pointeur ; seuls les vrais
  boutons des paniers les reçoivent ;
- les panneaux restent centrés dans leurs zones déclaratives, mais sont bornés à 420 × 156 px ;
- leur position est rabattue dans les limites visibles de l'illustration à chaque redimensionnement ;
- le moteur de tri montre désormais l'illustration entière avec un agrandissement mesuré de 1,2,
  au lieu du mode couvrant qui la zoomait jusqu'aux bords ; les mots et panneaux utilisent la
  même transformation et restent dans l'illustration ;
- le test emploie les vrais `locator.click()` de Playwright et non un événement injecté directement.

## Recette rapide dédiée

Commande :

```text
node scripts/playwright.mjs test tests/e2e/parcours-tri-tactile.spec.ts --project=parcours --workers=10
```

Résultat final : 12/12 en 6,1 s. Pour chacun des onze nœuds `tri`, la recette prend réellement un mot,
touche son bon réceptacle et vérifie qu'il est rangé. Le douzième cas mesure les panneaux à la
résolution tablette puis au format 1906 × 890 du signalement parent. Les clics ont un garde-fou de
trois secondes afin qu'une future régression de hit-test échoue vite au lieu d'attendre 90 secondes.

Captures : `bac-a-sable/captures-correction-tri/clairiere-03-tablette.png` et
`bac-a-sable/captures-correction-tri/clairiere-03-ecran-large.png`.

L'audio reste hors périmètre conformément à la décision parent.

## Contrôle consolidé

`npm run verifier` a exécuté les douze étapes. La correction du tri n'a produit aucune régression :
TypeScript, contenu, construction, qualité, bundle et rejeu sont verts. Le rapport reste rouge pour
trois causes extérieures à cette correction : les deux tests audio déjà connus ; six références
visuelles antérieures aux nouveaux assets validés ; un timeout du parcours d'ouverture sous la
charge de la campagne complète. Ce dernier cas a été relancé seul immédiatement après : 1/1 vert
en 2,2 s. Les références visuelles n'ont pas été mises à jour automatiquement.
