# Coloriage local — Marais jumeau 08 : brume

## Intégration finale par le principal — 5 septembre

Intégré pour essai local sous `contenu/assets/decors/brume-coloriage-v3.png`.
La table et les planches d'agent ci-dessous décrivent une étape intermédiaire : le principal
a ensuite resserré l'escargot, les pétales du nénuphar et le ponton après revue des débordements
sur la terre et l'eau. Le ponton forme un contour sans faux trou dû au croisement des polygones.
La preuve finale est `bac-a-sable/revue-coloriages-2026-09-05/marais-jumeau-08.png` et la géométrie
est celle du SVG publié. Le ciel se peint **en bleu**, le tronc **en noir** : les couleurs de
diagnostic des planches n'étaient pas les réponses de l'enfant.

Sept cibles atteintes par touchers natifs dans quatre formats ; la loupe permet d'agrandir
l'escargot et la fleur sans indiquer la réponse. La voix du « tronc du saule » est régénérée.
Relecture parent sur le rendu gris toujours utile ; aucune certification lexicale implicite.

Statut : **brouillon à valider par le parent**, non publié. Portée : `contenu/brouillons/coloriages-locaux-2026-09-05/marais-jumeau-08/`.

## Choix de l'image

`coloriages-decors/brume-v1.png` a servi seulement de repère de composition : son trait noir et blanc est hors du style illustré approuvé. À la demande du principal, un unique rendu du générateur intégré a été produit avec `brume-v1.png` comme composition et `coloriage-tapis-2026-09-05/tapis-objets-v2.png` comme référence de style.

Le fichier retenu est `brume-v3.png`, 1536 × 1024, SHA-256 `5b5c2634653aa3fe483efc8cf673fbed634b7af5b15dbfbc07d5cf969c1ff51f`. Sa source non modifiée est `C:/Users/scorp/.codex/generated_images/01a0716c-7540-76d0-9bff-92ba2f571ed0/exec-d8ba4eef-0930-4eb2-8dc9-967f751eadea.png`. Le prompt intégral soumis est conservé dans `prompt.txt`.

Le rendu montre une fois chacun, séparés et entièrement visibles : gros caillou, saule, barque, ponton, escargot, fleur de nénuphar et ciel. Les nappes de brume restent derrière les objets ; elles n'obstruent ni la barque ni le ponton. Aucun faux objet de l'ancien décor (roue, route, mouche, souris ou poule) n'est conservé comme cible. L'identifiant historique `roue` est gardé pour l'escargot et `route` pour le ponton, comme dans la fiche actuelle.

Prompt résumé : illustration jeunesse éditoriale française, paysage 3:2 de marais calme ; matières mattes texturées, contours bleu nuit organiques, sept sujets uniques et grands (caillou, saule, escargot, nénuphar, ponton, barque, ciel), sans texte ni doublon, et sans objet caché par la brume.

## Textes et lexique

Les sept phrases, leurs couleurs et les identifiants de cibles sont conservés :

- « Colorie le gros caillou au bord de l'eau en brun. »
- « Colorie le tronc du saule en noir. »
- « Colorie l'escargot en rose. »
- « Colorie le nénuphar en jaune. »
- « Colorie le ponton en rouge. »
- « Colorie la barque en orange. »
- « Le ciel du jour est bleu. »

L'audit lexical existant refuse `eau`, `saule`, `escargot`, `ponton` et `barque`. Ces mots ne sont pas ajoutés au lexique par ce brouillon : le principal ou le parent devra décider s'ils sont des mots cibles justifiés ou s'ils doivent être reformulés avant promotion.

## Masques et mesures

`scene.svg` emploie un viewBox 960 × 640, au même ratio 3:2 que le PNG ; l'image est entièrement visible avec `preserveAspectRatio="xMidYMid meet"`. Les sept chemins sont des polygones M/L/Z fermés, relevés sur les silhouettes du raster, jamais des disques ou rectangles de confort.

| Région | Objet | Surface (u²) | Centroïde | Point intérieur raster normalisé |
|---|---|---:|---|---|
| `caillou` | gros caillou | 32 159,0 | 156,4 ; 446,2 | 0,1576 ; 0,6475 |
| `saule-de-la-berge` | tronc du saule | 17 478,4 | 158,8 ; 184,3 | 0,1576 ; 0,3848 |
| `roue` | escargot | 12 639,5 | 360,7 ; 547,5 | 0,3685 ; 0,8574 |
| `nenuphar-perdu` | nénuphar | 10 083,5 | 555,0 ; 523,5 | 0,5736 ; 0,8330 |
| `route` | ponton | 24 579,0 | 738,4 ; 418,6 | 0,7813 ; 0,6504 |
| `barque-echouee` | barque | 16 707,5 | 381,1 ; 382,2 | 0,3867 ; 0,5869 |
| `ciel` | ciel | 93 933,0 | 727,3 ; 97,7 | 0,7031 ; 0,1416 |

Les points intérieurs et extérieurs de `points-reperes.json` ont été observés sur les pixels du PNG avant le tracé : ils sont donc indépendants des masques et pourront rendre les anciens masques rouges. Les surfaces, centroïdes et marges ont été recalculés avec `scripts/verifier-regions-fermees.mjs` ; aucune compilation, aucun test global et aucune écriture hors brouillons n'ont été effectués.

## Revue visuelle finale des masques

La superposition finale est `bac-a-sable/coloriages-locaux-2026-09-05/marais-jumeau-08/superposition-masques.png`; son SVG source et son script de rendu sont adjacents. Elle a été regardée sur le raster à 1536 × 1024.

- Le caillou brun suit son contour rocheux ; il ne prend ni eau ni galets voisins.
- La barque orange et le ponton rouge suivent respectivement la coque et les planches/pieux, sans nappe d'eau entre les pieds du ponton.
- L'escargot rose ne comprend ni gravier ni chemin ; la forme englobe corps et coquille uniques.
- Le nénuphar jaune suit exclusivement fleur et pétales ; le grand disque vert n'est pas recolorié.
- Le ciel violet s'arrête à la ligne des arbres ; le saule vert initial englobait des trous de feuillage. Il a été remplacé par le **tronc du saule**, seul volume fermé et traçable sans peindre le ciel entre les rameaux. La phrase et le libellé ont donc été mis au singulier exact : « le tronc du saule ».

Le tronc provient d'une segmentation locale du volume brun puis d'un contour polygonal simplifié, contrôlé visuellement par superposition ; son point repère a été repris après ce changement. Aucune nouvelle image n'a été générée. Les réserves restantes sont seulement la validation parent sur raster grisé et les taps natifs, puis l'arbitrage lexical déjà signalé.
