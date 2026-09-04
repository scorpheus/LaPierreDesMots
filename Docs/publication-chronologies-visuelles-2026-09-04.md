# Publication des chronologies visuelles — 4 septembre 2026

## Décision parentale

Le défaut concernait les cartes du moteur `chrono`, et non les six récits du moteur `histoire`.
Le parent a validé une reconstruction fondée sur des micro-histoires immédiatement lisibles :
chaque consigne présente exactement trois images formant une cause, une action et un résultat.

## Contenu publié

Cinq exercices ont été reconstruits, soit quinze histoires et quarante-cinq cartes raster 4:3 :

| Exercice | Trois histoires |
|---|---|
| `cite-des-histoires-pellicule-chrono-01` | plage et seau ; château qui grandit ; arrivée de Plume |
| `cite-des-histoires-pellicule-chrono-02` | cahier et aide de Papa ; trois cubes ; cahier rangé puis coucher |
| `cite-des-histoires-vitrail-chrono-01` | pluie et arc-en-ciel ; fleur arrosée ; tonneau rempli par la pluie |
| `galeries-frise-chrono-01` | bol rangé dans le panier ; balle rapportée par le chien ; eau qui bout |
| `volcan-fresque-chrono-01` | abeille sur le nez du cochon ; trois quilles renversées ; champignon sous la pierre |

Les planches 3 × 3 ont été produites avec le générateur d’images intégré à Codex, puis découpées
en cellules de 512 × 384. Les sources de travail restent dans
`bac-a-sable/chronologies-2026-09-04/`. Les cartes publiées sont dans
`contenu/assets/vignettes/`. Le verrou `production/assets.lock.json` conserve les quarante-cinq
empreintes de pixels, les sources, le nombre de tentatives et le brief de génération.

## Gardes ajoutées

`tests/unitaires/vignettes-mapping.test.ts` vérifie désormais, pour les cinq exercices :

- trois consignes de trois cartes ;
- neuf identifiants distincts dans l’ordre exact du JSON ;
- les quinze récits validés, mot pour mot ;
- la présence de chaque PNG en 512 × 384 ;
- l’empreinte des pixels de chacune des quarante-cinq cartes dans le verrou de production.

Le test composant du moteur `chrono` ne protège plus l’ancienne suite ambiguë
« tas — dame — dos » : il protège la nouvelle séquence explicite de la balle tenue, lancée puis
rapportée.

## Recette avant publication

- tests ciblés du moteur et du verrou : 49/49 ;
- suite unitaire, composants et API : 2 413/2 413 ;
- validation du contenu : 645 contrôles, aucun problème ;
- TypeScript, lint, construction, références visuelles, qualité responsive, bundle et rejeu :
  verts dans la campagne globale ;
- audit de couverture E2E rejoué seul après un dépassement de temps dû à la campagne complète :
  1/1, 89 recettes, 76 nœuds, écart nul.

La première campagne globale a utilement refusé deux formulations contenant « vide » et trois
consignes dont les apostrophes ne concordaient plus avec leurs clips. Les formulations ont été
corrigées sans régénérer d’audio : les tests de couverture et d’empreinte des voix repassent.
