# Brouillon local — fresque murale

## Intégration finale par le principal — 5 septembre

La proposition a été intégrée pour **essai local**, conformément au mandat parent du lot.
Les mesures et la planche d'agent ci-dessous sont historiques : la superposition a révélé des
débordements malgré les points intérieurs corrects. Le principal a retracé les huit silhouettes
sur les pixels (montagne, tente et son ouverture, rond, deux portes, arbre, pierre, ciel).
Le repère du ciel, auparavant sur le cadre en pierre, a été corrigé après observation du PNG.
Les fichiers publiés et `tests/fixtures/coloriages-reperes.json` font foi ; preuve à jour :
`bac-a-sable/revue-coloriages-2026-09-05/cite-des-histoires-10.png`.

**La prétention ci-dessous selon laquelle toutes les cibles dépassent un carré de 64 px est
retirée.** Les portes, l'arbre et la pierre restent fins ; la loupe volontaire est disponible.
Les huit objets sont atteints par les tests natifs dans quatre formats. Les voix ont été
actualisées ; les mots hors du lexique local restent signalés, sans ajout automatique.
Le visa esthétique/pédagogique final appartient au parent, pas au test géométrique.

5 septembre 2026, reprise après revue. Ce document accompagne uniquement
`contenu/brouillons/coloriages-locaux-2026-09-05/fresque-murale/` : rien n’est publié ni jouable
avant relecture et promotion par le principal.

## Image et relevé

L’image retenue reste `contenu/brouillons/decors/fresque-murale-v2.png`, copiée sans modification
dans `image/fresque-murale-v2.png`. C’est l’illustration en couleurs et matières, jamais un
line-art. Elle mesure 1536 × 1024 px ; le `viewBox` est son échelle exacte divisée par 1,6, soit
`0 0 960 640`. SHA-256 : `3be0677fd16210650b9af6469a40c12db4199865880115c2dfbd0d2f538c5c2a`.

Les huit contours actifs ont été relevés sur ce raster, d’abord en coordonnées 1536 × 1024, puis
divisés par 1,6 dans le SVG. La pierre ronde à cristaux du panneau droit n’est plus faussement
nommée « papillon ».

## Objets, phrases et couleurs

Identifiants du nœud et de l’exercice, compétences, huit étapes et ordre des couleurs sont conservés.

| Étape | Région technique historique | Objet observé | Phrase exacte | Couleur |
|---|---|---|---|---|
| c1 | `scene-du-haut` | montagne enneigée du panneau gauche | « Colorie la montagne en rouge. » | rouge |
| c2 | `scene-du-bas` | toile de la tente centrale, avec ouverture retirée | « Colorie la tente en vert. » | vert |
| c3 | `soleil` | grand rond au-dessus des panneaux | « Colorie le grand rond en haut en jaune. » | jaune |
| c4 | `pot-de-couleur` | porte latérale droite | « Colorie la porte de droite en brun. » | brun |
| c5 | `arbre` | grand arbre à droite de la tente, panneau central | « Colorie le grand arbre à droite de la tente en rose. » | rose |
| c6 | `porte` | porte latérale gauche | « Colorie la porte de gauche en orange. » | orange |
| c7 | `scene-de-droite` | grande pierre ronde à cristaux du panneau droit | « Colorie la pierre en violet. » | violet |
| c8 | `ciel` | ciel au-dessus de la montagne, panneau gauche | « Le ciel de la montagne est bleu. » | bleu |

## Masques et planche de revue

Les dix-sept identifiants historiques de la scène sont conservés. Les huit régions actives sont des
polygones fermés `M`/`L`/`Z`; le masque de la tente contient son ouverture en trou `evenodd` afin de
ne pas recolorer le vide sombre. Leurs surfaces recalculées vont de 7 877,1 à 15 405,1 unités²,
donc au-dessus de 7 281,8 unités², l’équivalent du carré tactile de 64 px à 720 px de large.

La planche de contrôle à fournir au parent est
`bac-a-sable/coloriages-locaux-2026-09-05/fresque-murale/planche-superpositions.png`. Elle
superpose les contours réellement utilisés au raster : 1 montagne, 2 tente, 3 grand rond, 4 porte
droite, 5 arbre central, 6 porte gauche, 7 pierre, 8 ciel. Elle a été inspectée après sa génération.

`points-reperes.json` porte pour chaque cible un intérieur et un extérieur visualisés sur le raster,
normalisés dans `[0,1]` et indépendants des centroïdes déclarés. Le contrôle ciblé
`bac-a-sable/coloriages-locaux-2026-09-05/fresque-murale/mesurer-regions.mjs` confirme les surfaces
arrondies au dixième, les centres intérieurs et ces seize repères ; il ne construit ni ne teste
l’application.

## Lexique et limites de promotion

Le lexique CE1 local accepte `grand`, `rond`, `haut`, `arbre`, `droite` et les couleurs. Il refuse
`tente` et `pierre`; ces mots sont signalés et non ajoutés. Le parent décide de les déclarer
mots cibles ou de les remplacer avant promotion.

La planche ne vaut pas une validation enfant : la relecture parent devra confirmer sur tablette la
reconnaissance en gris puis la recoloration, notamment pour la toile de tente et le feuillage du
panneau central. Aucun moteur, contenu publié, verrou, voix, test npm, build, serveur, installation
ou commit n’a été modifié ou exécuté dans ce lot.
