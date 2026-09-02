# Campement V6 animé — état publié le 2 septembre 2026

## Décision validée

Le parent a validé le fond V6 nettoyé et demandé de conserver le feu et le papillon animés en les
intégrant mieux. Le campement servi repose donc sur trois calques raster séparés :

- `contenu/assets/campement/campement-v6.png`, fond fixe 1586 × 992 sans flammes ni papillon ;
- `contenu/assets/campement/animations/feu.png`, atlas transparent 4 × 2 ;
- `contenu/assets/campement/animations/papillon.png`, atlas transparent 4 × 2.

Les empreintes, le prompt exact du fond et les contrôles de production sont consignés dans
`production/assets.lock.json`. La commande `npm run campement:dessiner` ne dépend plus d’un
brouillon ignoré par Git : un clone autonome contrôle directement l’asset de production.

## Intégration

Le feu est ancré sur le foyer central vide et le papillon près des fleurs en bas à gauche. Aucun
réglage d’opacité ni mode de fusion ne masque un mauvais détourage. Les deux cycles utilisent huit
poses et jouent en aller-retour, ce qui supprime le saut entre la dernière et la première image.
Les calques sont décoratifs, ignorent les pointeurs et disparaissent avec l’option de réduction des
animations.

Les anciennes réactions constituées d’un rectangle et d’un cercle dorés restent supprimées. Un
toucher produit six étincelles et une courte découverte nommée, sans recouvrir l’objet d’un cadre.

## Garde de non-régression

`tests/unitaires/campement-composition-v6.test.ts` vérifie désormais, au niveau des pixels :

- les dimensions du fond et des deux atlas ;
- huit cellules non vides par atlas ;
- la présence d’un canal alpha réel ;
- l’absence de contact des silhouettes avec les bords de cellule ;
- une base de feu stable sur les huit poses ;
- l’absence d’opacité artificielle et de `mix-blend-mode` ;
- la boucle en aller-retour.

Une référence visuelle automatisée du campement reste à créer après validation explicite de la
capture candidate. Les références existantes ne sont pas mises à jour par cette publication.

## Suite visuelle mesurée

L’audit des 55 décors servis mesure 55 dessins polygonaux sans courbe organique. L’ordre de reprise
retenu est : école de la Clairière, tapis de la Forêt Muette, brume du Marais Jumeau, forge du
Volcan, fresque de la Cité des Histoires. Le chaudron reste un pilote séparé : le bouton du
campement ouvre actuellement une paroi des Galeries, incohérence de contenu à corriger avant toute
promotion d’un nouveau coloriage.
