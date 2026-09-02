# Campement V5 raster et interactif — état au 2 septembre 2026

## Décision appliquée

Le parent a retenu `concept-campement-v5-enfant.png`, puis a explicitement demandé d'abandonner
la reconstruction vectorielle : le SVG était un blockout employé avant la disponibilité du
générateur d'images. L'illustration V5 est donc le décor de production, sans filtre jaune ajouté,
sans nouvelle peinture par-dessus et sans tentative de l'imiter en primitives.

La copie publiée `contenu/assets/campement/campement-v5.png` est identique à la source validée :
1 586 × 992 px, SHA-256
`CBA7CDBAF6CC7D66E625D4ED31CA8D22A8C681875EEF892B9B0DD9DDB76CDF4E`.

## Architecture de l'écran

- L'image V5 forme le calque de fond et conserve toute sa qualité graphique.
- Les trente zones tactiles HTML sont calées en coordonnées natives dans
  `contenu/monde/campement.json`; aucune découpe de l'image n'est nécessaire pour cliquer.
- Carte, coffre et chaudron s'ouvrent directement depuis leur objet peint.
- Le feu, le papillon, sept lucioles et deux lueurs sont des calques indépendants, décoratifs,
  non bloquants et supprimés visuellement en mode animations calmes.
- Un toucher produit une réaction locale sans déplacer un rectangle découpé de l'image, ce qui
  évite les raccords et les plaques de couleur visibles.
- Les invitations au repos sont de petites étincelles ponctuelles, plus des cadres jaunes autour
  des boîtes tactiles.

`scripts/recomposer-campement.mjs` conserve son nom historique mais ne redessine plus rien : il
copie l'image validée octet pour octet, puis vérifie ses dimensions et chacune des trente zones.
L'ancien `contenu/habillages/campement/campement.svg` reste sur disque et est déclaré comme archive
dans `contenu/registre-svg.json`.

## Pipeline de sprites dérivé de hatch-pet

Le générateur d'images ne fournit pas une géométrie de planche suffisamment exacte. Le pipeline
auto-contenu `scripts/sprites/normaliser-planche.mjs` reprend les idées utiles de `hatch-pet` :

1. récupération globale des huit composantes plutôt que découpe aveugle en cases ;
2. détourage du fond uni et décontamination des bords ;
3. échelle commune et ancre mesurée ;
4. assemblage déterministe en 4 × 2, cellules 256 × 256 ;
5. rapport JSON et planche de contact pour la revue humaine.

Résultats sur le feu et le papillon : 8/8 cellules, zéro débordement, zéro pose touchant un bord,
écart d'ancre raster maximal 0,5 px. Les rapports et contacts restent dans
`bac-a-sable/campement-sprites/`. La QA mécanique ne juge ni le style ni la fluidité : les captures
du jeu restent nécessaires.

## Recette mesurée

- format : 1 920 × 1 200 CSS, paysage 16:10 de la tablette cible ;
- scène : 1 200 × 750,56 px ;
- image native réellement chargée : 1 586 × 992 ;
- 30 prises rendues ; plus petite prise réelle : 82,33 px ;
- débordement horizontal : 0 px ;
- toucher de la tente : calque de réaction visible ;
- toucher de la carte peinte : navigation vers `/carte` ;
- erreurs ou avertissements navigateur : 0.

Captures locales :

- `bac-a-sable/captures/campement-v5-raster-tablette-1920x1200-v2.png` ;
- `bac-a-sable/campement-sprites/feu-contact.png` ;
- `bac-a-sable/campement-sprites/papillon-contact.png`.

La procédure reproductible est décrite dans `.agents/skills/dessiner-campement/SKILL.md`.

## État de validation

Le décor V5 est validé par le parent. Le feu et le papillon sont intégrés comme première passe
d'animation et passent leur QA technique ; leur appréciation esthétique finale se fait sur la
capture de l'écran, avant toute mise à jour d'une référence visuelle Playwright.

Le défaut de session parent du testeur, trouvé pendant la reprise précédente, reste corrigé : la
surface `window.__test` referme la session mémoire entre recettes.

La campagne complète exécutée après l'intégration raster donne :

- 2 174/2 174 tests unitaires, composants et API ;
- 609/609 contrôles de contenu ;
- 478/478 scénarios E2E ;
- 247/247 contrôles de qualité et 6/6 budgets de bundle ;
- rejeu et garde-fous QA verts ;
- 7 références visuelles historiques divergentes et 2 références absentes, hors campement.

Ces neuf écarts T4 ne sont pas régénérés automatiquement : les règles du projet imposent une
validation parent avant toute mise à jour d'une référence. Le détail fait foi dans
`tests/rapports/RAPPORT.md`, campagne du 2 septembre 2026 à 10:33:10 UTC.
