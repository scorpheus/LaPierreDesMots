# Correction de l’exercice de l’école — 2 septembre 2026

## Constat parent

La recette manuelle du premier exercice a révélé plusieurs défauts que les tests existants ne
détectaient pas : trois cibles mal alignées avec l’illustration, cinq objets présentés sans annoncer
que deux sont des intrus, une aide de Gobi identique à la consigne et une maîtresse sans visage.
Le ballon déjà peint dans le décor rendait en outre absurde la demande de placer un ballon.

## Décision d’itération

- La géométrie et l’aide doivent être contrôlées par un test ciblé qui vérifie leur sens, pas
  seulement la présence des nœuds DOM.
- Le décor corrigé par génération a été publié dans `contenu/assets/decors/ecole.png` après le
  nouveau retour du parent demandant de remplacer la maîtresse sans visage. Il conserve le style
  validé et retire le ballon déjà peint qui contredisait la consigne.
- La boucle courte exécute les tests du moteur et le contrôle des assets servis ; la campagne
  complète ne s’exécute qu’une fois avant le commit final.

## Intégration de Gobi

Les quinze illustrations raster déjà validées (cinq poses et dix stades) sont servies sous forme
de dérivés WebP 512 × 512. Le poids total passe de 8,9 Mo pour les PNG de production à environ
200 Ko pour les fichiers servis, sans modifier les originaux ni le dessin validé.

## Retours visuels et écran de sortie

Décision parent du 2 septembre 2026 : les gerbes de particules génériques sont retirées. Le son,
la vibration et la réaction propre au moteur restent actifs ; une bonne réponse ne recouvre plus
le dessin d'un feu d'artifice et rien ne peut déborder sur l'écran suivant.

Le libellé de sortie devient « Exercice N sur M ». Le Gobi de l'écran « Bravo » utilise désormais
le rendu raster WebP de joie, comme le reste de l'application.
