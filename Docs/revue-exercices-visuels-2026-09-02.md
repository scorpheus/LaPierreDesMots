# Revue visuelle des exercices — 2 septembre 2026

## Périmètre observé

Les premières captures, en 1280 × 800, n'étaient pas la recette tablette de référence. Le parent
l'a relevé le 2 septembre. La cible décidée est **le mode horizontal 16:10**, avec un viewport de
recette à **1 920 × 1 200 pixels CSS** et une densité ×2, comme `playwright.config.ts`. Le format
vertical reste un filet responsive, pas la présentation principale du jeu.

Les captures corrigées sont conservées dans `bac-a-sable/recette-2026-09-02/` :

- `exercice-trace-cible-1920x1200.png` — moteur `trace`, graphèmes b/d ;
- `exercice-colorie-corrige-1920x1200.png` — moteur `colorie`, cour de l'école ;
- `exercice-eclair-cible-1920x1200.png` — moteur `eclair`, lucioles de couleur.

Ces images servent à l'arbitrage du parent. Elles ne deviennent pas des références de test visuel
sans validation explicite.

## Constats

### Tracé

Direction de reprise validée par le parent. L'action principale est compréhensible et la zone de tracé est grande. L'écran reste cependant
très vide et clinique : Gobi est minuscule, la récompense visuelle du geste est faible, et le décor
n'aide pas l'enfant à sentir qu'il agit dans le monde. Priorité proposée : intégrer le tracé à un
petit événement du décor et renforcer le retour visuel après chaque geste juste.

### Coloriage

Le parent confirme que le dessin est invisible et que les consignes futures sont trop petites. La
mesure en 1 920 × 1 200 nuance la cause mais pas le verdict : le dessin existe, cependant il est
réduit à une vignette centrale par les phrases futures. Correction implantée : seule la consigne
courante reste en grand dans l'en-tête ; les autres phrases disparaissent au profit de repères
circulaires compacts. La scène occupe désormais la majorité du cadre, sans défilement.

### Éclair

Le fond est techniquement rendu, mais la capture correcte confirme le grief du parent : de grandes
masses uniformément grises et un cadrage trop proche rendent le décor abstrait. Les boutons sont
lisibles mais paraissent posés devant une ébauche. Ce chantier demande de reprendre les trois SVG
`clairiere.luciole`, `galeries.cristal` et `marais.orage`, pas de simplement augmenter une opacité.
« Prêt ? Montre-moi le mot » doit également devenir une porte visuelle plus évidente.

## Décisions déjà rendues

- La question des réglages devient « Comment préfères-tu lire ? » ; sa formulation visible et sa
  formulation vocale sont identiques.
- La direction chaleureuse du concept de campement généré le 2 septembre est validée : composition
  centrale, lumière douce, objets intégrés à un lieu habité plutôt qu'alignés comme un catalogue.
- Le premier rendu était trop jaune et trop cartoon ; le deuxième trop pictural. La troisième
  proposition cherche le milieu : décor 2D de jeu net, palette naturelle, textures discrètes.
- La composition corrigée des exercices est validée le 2 septembre : les dessins restent simples,
  mais leur taille et leur fonctionnement conviennent à la recette tablette.
- Le parent relève encore des plaques de couleur typiques d'une retouche générative dans la V3 du
  campement. La V4 repart d'une génération neuve : aplats continus, ombres en valeurs limitées,
  palette forestière fraîche et texture homogène, sans effet de peinture.
- Le traitement « aventure 2D éditoriale » de la V4 est validé. Son contenu évoquait toutefois un
  bivouac d'adolescents. La V5 conserve ce traitement et reconstruit le lieu comme un repaire de
  7 ans : cabane-tente, dessins suspendus, coussins, objets de découverte et petits animaux.
- Après comparaison avec la V6, le parent retient finalement la V5. Son dessin plus rond et plus
  chaleureux sert mieux les enfants de 7 ans. La V6 reste un essai de contraste, pas la direction
  de production.

## Arbitrages attendus

Le concept V5 du campement est validé comme direction de production. Il reste à le traduire en
éléments séparés et interactifs, puis à vérifier leur assemblage à la résolution tablette. Le tracé
est autorisé à poursuivre. Éclair attend une proposition d'asset plus lisible. Les compositions
d'exercice sont validées, mais aucune référence visuelle n'est mise à jour avant la fin de leurs
reprises.

## Mesure du testeur pendant la revue

Le contrat exhaustif couvre 14 écrans sur 14 au moyen de 88 recettes et 76 nœuds livrés. Isolé, il
termine en 30,2 s. Lors de la campagne parallèle, le même cas a épuisé son garde-fou de 270 s sous
contention. Il est désormais exécuté dans le projet Playwright `couverture`, après les parcours et
la robustesse, sans modifier ses assertions ni son délai. Mesure ciblée après correction : 14/14,
écart nul, 30,3 s.
