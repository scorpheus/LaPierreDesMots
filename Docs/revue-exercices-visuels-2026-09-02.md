# Revue visuelle des exercices — 2 septembre 2026

## Périmètre observé

Captures réelles du client de test, en 1280 × 800, obtenues par le parcours visible depuis un
profil enfant. Elles sont conservées dans `bac-a-sable/recette-2026-09-02/` :

- `exercice-trace.png` — moteur `trace`, graphèmes b/p ;
- `exercice-colorie.png` — moteur `colorie`, région du Marais Jumeau ;
- `exercice-eclair.png` — moteur `eclair`, choix entre « bille » et « ballon ».

Ces images servent à l'arbitrage du parent. Elles ne deviennent pas des références de test visuel
sans validation explicite.

## Constats

### Tracé

L'action principale est compréhensible et la zone de tracé est grande. L'écran reste cependant
très vide et clinique : Gobi est minuscule, la récompense visuelle du geste est faible, et le décor
n'aide pas l'enfant à sentir qu'il agit dans le monde. Priorité proposée : intégrer le tracé à un
petit événement du décor et renforcer le retour visuel après chaque geste juste.

### Coloriage

Le problème est bloquant sur une hauteur de 800 px : la liste complète des consignes et la palette
occupent le premier écran, tandis que la scène à colorier est repoussée sous la ligne de flottaison.
L'enfant voit donc une fiche de consignes avant de voir le jeu. Priorité proposée : ne montrer que
la consigne courante, remplacer la liste par des repères compacts de progression, conserver le
bouton d'écoute, et réserver la majorité de l'écran à la scène.

### Éclair

C'est le plus lisible des trois : la scène reste visible et les deux réponses sont nettes. Les
boutons paraissent toutefois posés devant l'illustration plutôt qu'intégrés à elle, et « Prêt ?
Montre-moi le mot » ressemble visuellement à un contrôle sans que sa fonction soit évidente.
Priorité proposée : faire de la scène le support du choix et clarifier l'état de départ.

## Décisions déjà rendues

- La question des réglages devient « Comment préfères-tu lire ? » ; sa formulation visible et sa
  formulation vocale sont identiques.
- La direction chaleureuse du concept de campement généré le 2 septembre est validée : composition
  centrale, lumière douce, objets intégrés à un lieu habité plutôt qu'alignés comme un catalogue.

## Arbitrages attendus

Le parent doit encore confirmer l'ordre des trois chantiers proposé ci-dessus et dire, pour chaque
capture, ce qu'il souhaite conserver. Aucune référence visuelle n'est mise à jour avant cet accord.

## Mesure du testeur pendant la revue

Le contrat exhaustif couvre 14 écrans sur 14 au moyen de 88 recettes et 76 nœuds livrés. Isolé, il
termine en 30,2 s. Lors de la campagne parallèle, le même cas a épuisé son garde-fou de 270 s sous
contention. Il est désormais exécuté dans le projet Playwright `couverture`, après les parcours et
la robustesse, sans modifier ses assertions ni son délai. Mesure ciblée après correction : 14/14,
écart nul, 30,3 s.
