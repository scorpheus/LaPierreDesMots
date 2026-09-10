# Interface PC à zoom navigateur 100 %

Le parent signale une interface globalement trop grande et une récompense nécessitant
un dézoom vers 63 %. Une première correction fixait le corps racine à 16 pixels au-delà
de 1200 pixels CSS. La campagne du 10 septembre a montré que cette règle neutralisait
`--lecture-echelle` : les mots des quatorze moteurs restaient à 20 px malgré les 27 px
demandés. Cette première correction est donc retirée.

Le réglage de lecture continue d'agir sur tous les textes. La tenue à zoom navigateur
100 % vient des compositions PC dédiées — récompense en deux colonnes, plateaux centrés,
dimensions bornées — et non de l'annulation du profil. Le profil familial réel (Andika
27 px, interligne 2) est appliqué par les recettes avant chaque mesure.

La récompense utilise deux colonnes : célébration et détail des étoiles à gauche,
cadeaux et jauges à droite, actions sur toute la largeur. Personnage, étoiles et marges
sont compacts ; aucun gain n'est masqué. La page reste libre de défiler si un contenu
exceptionnel dépasse le cadre, sans découpe ni mise à l'échelle artificielle.

Deux cas rouges initiaux constataient les blocs hors écran. Après correction :
récompense entière et sans défilement en 1366×768, 1366×900 et 1920×900 avec le profil
27 px ; parcours
de cascade validés ; cinq contrôles PC paires/phrase passent également. Capture de
composition examinée sous `bac-a-sable/corrections-2026-09-09/recompense-pc.png`.
La campagne ciblée du 10 septembre confirme aussi 14 moteurs sur 14 sans texte figé entre
16 et 40 px et aucune cible sous 64 px au corps maximal. La certification générale reste
portée par le rapport final de clôture, pas par ces seuls cas ciblés.
