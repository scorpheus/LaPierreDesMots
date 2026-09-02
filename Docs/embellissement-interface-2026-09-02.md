# Embellissement de l’interface — état au 2 septembre 2026

## Audit visuel priorisé

Le campement V6 est désormais la référence de chaleur et de densité visuelle. L’audit du reste du
jeu relève, dans cet ordre :

1. cinq tableaux d’ouverture encore explicitement marqués `PLACEHOLDER` ;
2. cinquante-cinq décors d’exercice entièrement polygonaux ;
3. quatre compagnons encore représentés par des silhouettes géométriques ;
4. des profils rendus comme un sélecteur utilitaire ;
5. une récompense sans scène de célébration liée au monde.

Les remplacements d’illustrations passent par `contenu/brouillons/` et ne sont publiés qu’après
validation du parent. Un étalon Filou et un premier tableau de la Pierre ont été générés pour la
revue ; aucun des deux n’est servi à l’enfant à ce stade.

## Première correction publiée

L’écran de récompense forme maintenant une scène en deux plans : Gobi joyeux et des éclats animés
à gauche, étoiles et félicitation sur un panneau stable à droite. Le fond reprend les bleus, verts
et tons parchemin du monde. Le champ de lecture ne porte aucune animation. En largeur étroite, la
scène repasse sur une colonne sans réduire les cibles.

L’asset de Gobi existant est réutilisé ; aucune nouvelle illustration non validée n’entre dans la
production. Le test composant exige la présence de la scène, le bon asset et l’immobilité du bloc
de texte.

## Ordre de suite

Après validation visuelle des deux brouillons étalons :

1. décliner les quatre autres tableaux d’ouverture dans la même composition ;
2. décliner Bulle, Roc et Plume depuis l’étalon retenu ;
3. intégrer le contrat de coloriage raster indexé ;
4. remplacer l’école, puis tapis, brume, forge et fresque ;
5. finir les cartes de profils avec les personnages validés.

Le chaudron conserve le nœud technique `galeries-12`, afin de ne pas fabriquer une progression
parallèle, mais ce nœud sert désormais l'habillage `campement.chaudron`. Le contrat de coloriage
raster indexé est implanté ; il conserve le SVG comme repli jusqu'à validation de ses trois PNG.

## Support des tableaux d’ouverture raster

Le composant de tableau cherche désormais en priorité les cinq illustrations raster explicites
`contenu/assets/ouverture/{pierre,grisaille,noms,habitants,appel}.png`. Tant qu’une illustration
n’est pas publiée, son erreur de chargement déclenche le SVG historique déclaré dans
`contenu/monde/ouverture.json` : le récit reste donc complet pendant la production graphique.

Le cadre est borné en 3:2 pour la tablette paysage, avec un recadrage central sans déformation et
une hauteur qui laisse visibles la phrase et les commandes. Le texte reste sur son parchemin
séparé, sans animation. Les tests montés vérifient les cinq chemins raster et le repli réel vers le
SVG. Le dépôt autonome embarque maintenant les PNG de `contenu/assets/` ; un test s’appuie sur le
campement V6 déjà validé pour prouver ce comportement sans publier prématurément un faux tableau
d’ouverture. Les futurs tableaux fonctionneront donc à la fois sur le serveur LAN et dans l’APK.

## Fiabilisation du contrôle tactile

La recette complète a révélé un faux positif intermittent de R16 sur un démarrage à froid : React
pouvait monter le HTML une image avant la feuille globale, et la sentinelle conservait alors les
dimensions natives des boutons comme une violation. La sentinelle et l'outil de mesure attendent
désormais le jeton CSS `--cible-min: 64px` ; la mesure directe attend aussi l'état
`document.fonts.ready`. Ce sont des attentes d'état, sans temporisation arbitraire. Le cas témoin
`cite-des-histoires-14` passe après correction.
