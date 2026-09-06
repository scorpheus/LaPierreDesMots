# Correction tactile ciblée — attrape et grave — 5 septembre 2026

## Preuves de départ

La campagne réelle [tactile-avant.json](../bac-a-sable/qa-finition-2026-09-05/tactile-avant.json)
fait échouer `toucherPrise` dans `tests/e2e/gestes-dom.ts:52` : le centre visible d'une prise
ne reçoit pas le doigt.

- `clairiere-06`, `foret-01`, `foret-09`, `marais-jumeau-02`, `marais-jumeau-10`, `volcan-01`
  et `volcan-09` (moteur `attrape`, téléphone paysage 640 × 360) : le cartouche
  `data-plateau="etape-attrape"`, alors absolu et de `z-index: 3`, recouvrait une cible.
- `volcan-09` (tablette) : les cibles `etoile-cheval` et `etoile-musique` étaient deux prises
  concurrentes ; leurs coordonnées de contenu pouvaient les empiler.
- `foret-06` (moteur `grave`) : la touche `data-lettre="d"` était masquée par le `span`
  `gran_` du mot central.

La contre-campagne [tactile-intermediaire.json](../bac-a-sable/qa-finition-2026-09-05/tactile-intermediaire.json)
a ensuite invalidé le premier correctif `attrape` : le planificateur signalait le manque de
place mais son repli était re-clampé dans le même cadre. Preuves exactes :
`clairiere-06` (`luciole-bleu-un` sous `luciole-rouge`), `volcan-01`
(`etoile-bateau` sous `etoile-cadeau`) et `volcan-09` (`etoile-cheval` sous
`etoile-musique`).

Une seconde contre-campagne a isolé la cause restante de `volcan-09` : les rasters cheval,
dauphin et violon avaient `72 %` de taille dans un bouton dont seules les tailles minimales étaient
posées. Leur taille intrinsèque dépassait donc la boîte calculée et se superposait malgré une
grille correcte.

## Correction appliquée

`MoteurAttrape.tsx` et `MoteurGrave.tsx` séparent désormais le cartouche du cadre de jeu mesuré.
Le cartouche est un élément de flux ; le cadre des prises a une hauteur intrinsèque minimale et
son parent défile verticalement si la fenêtre ou le profil de lecture ne suffit pas. Il ne peut
donc plus être superposé à une prise.

Pour `attrape`, la disposition de toutes les cibles est désormais une grille intrinsèque calculée avec
leurs boîtes tactiles réelles (texte du profil inclus) et l'amplitude de dérive. Sa hauteur
exacte agrandit la scène avant le placement : elle ne peut donc pas être re-clampée sur une autre
prise dans un paysage trop court. Les attributs `data-chevauchements` et `data-hors-bornes`
proviennent maintenant d'une mesure de la grille, non d'une valeur publiée en dur ;
`data-disposition="grille-intrinseque"` identifie ce repli. Chaque bouton reçoit une taille CSS
explicite `border-box`, calculée avec son remplissage et son trait, et chaque raster reçoit ses
pixels projetés explicitement. Il ne peut donc plus agrandir la prise après le calcul.
Le test de composant force trois boîtes à se ranger sur trois lignes : il échoue si la hauteur
ne croît pas avant le placement.
Pour `grave`, le mot est remonté à 27 % de la scène, le clavier commence sous 56 % et le repère
de mot ne capte aucun pointeur : séparation géométrique et garde de prise se cumulent.

Les contrôles dédiés dans `tests/composants/MoteurAttrape.test.tsx` et
`tests/composants/MoteurGrave.test.tsx` vérifient l'absence du cartouche dans la zone des prises,
le flux vertical possible et les invariants de disposition ci-dessus.

## Brouillon de formulations — non publié

Ce lot ne modifie aucun exercice. Les formulations suivantes, repérées durant l'audit pédagogique,
restent à arbitrer puis à publier depuis un brouillon de contenu :

| Fichier publié inchangé | Formulation actuelle | Proposition CE1 à arbitrer |
| --- | --- | --- |
| `contenu/exercices/clairiere/luciole-couleurs-01.json` | Consigne qui nomme la couleur de chaque luciole-cible | « Retrouve le mot que tu viens de lire. » — la couleur reste cachée sans inventer une luciole qui brille. |
| `contenu/exercices/marais-jumeau/grenouilles-tri-01.json` | « Trouve le son de gant. » | « Trouve le même son que dans « gant ». » |
| `contenu/exercices/marais-jumeau/poissons-attrape-01.json` | « Attrape le son de gant. » | « Attrape les poissons où tu entends le même son que dans « gant ». » |

Ces propositions ne sont ni une décision canonique ni une modification de contenu. Elles sont
consignées uniquement pour l'arbitrage parent demandé.

## Limite de validation

Seuls les tests unitaires de composants sont exécutables dans ce lot. La campagne Playwright
partagée, qui écrit ses rapports globaux, reste réservée à l'orchestrateur ; elle devra rejouer
les cas listés ci-dessus après intégration.
