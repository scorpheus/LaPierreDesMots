# Progression de Gobi depuis le campement — 10 septembre 2026

## Demande parent

Le portrait de Gobi placé sous le décor du campement doit devenir une entrée visible vers son
évolution. Les stades déjà atteints doivent se revoir ; les stades futurs doivent rester secrets,
avec seulement leur contour gris. Le carré clair autour du raster de Gobi doit disparaître.

Dans le coffre, une forme de Gobi non gagnée doit rester visible en creux mais ne doit plus ouvrir
une fiche qui révèle sa couleur. Enfin, les formes, les Éclats de Pierre et le butin doivent
appartenir visuellement au même groupe.

## Implantation

- `Gobi` accepte une action d'ouverture facultative. Au campement seulement, son portrait devient
  un bouton natif avec le libellé visible « Ses évolutions ».
- `GalerieEvolutionsGobi` affiche les dix stades du référentiel, dans leur ordre. Le rang du stade
  courant est la seule frontière : tous les rangs atteints montrent leur raster et leur nom ; les
  rangs suivants montrent un contour gris, le texte « À découvrir », et aucun `<img>` raster.
- Le contour futur emploie le SVG déclaré par `contenu/monde/gobi-stades.json` comme masque. Sa
  couleur interne ne peut donc pas être révélée par le rendu.
- Dans `Etagere`, une forme acquise reste un bouton et ouvre sa fiche. Une forme future est un
  élément non interactif : même emplacement visible, même état en creux, aucune fiche possible.
- `EcranCoffre` place ses trois sections dans un unique panneau
  `data-coffre-collections="groupees"`. Les formes occupent la largeur ; Éclats et butin partagent
  la rangée suivante, mais tous restent contenus par le même cadre.

## Détourage des rasters

Les dix sources validées `production/personnages/gobi/stades/stade-{1..10}.png` n'ont pas été
redessinées. `scripts/images/detourer-stades-gobi.py` retire uniquement le fond clair relié aux
bords, préserve les îlots intérieurs — yeux, cœur, personnage et ombre — puis produit les WebP
RGBA 512 × 512 déjà attendus par le jeu.

La provenance et les dix empreintes sont consignées dans `production/assets.lock.json`, entrée
`gobi.stades.detoures.v1`. Le rapport mécanique est dans
`bac-a-sable/detourage-gobi/rapport.json` : 10/10 fichiers en RGBA, coin supérieur gauche d'alpha
nul. Les stades 1, 5 et 10 ont été contrôlés ensemble sur fond parchemin dans
`bac-a-sable/detourage-gobi/controle-parchemin.png`.

## Preuves ciblées

Le test discriminant a d'abord produit six rouges : absence du bouton et de la galerie, formes
futures encore cliquables, collections sans cadre commun. Après implantation :

- composants et modèle du campement : 5 fichiers, 80 tests verts ;
- contenu : 655 contrôles, 0 problème ;
- parcours Chromium 1920 × 1200 CSS : 7 tests verts ;
- le navigateur décode réellement le coin du raster acquis avec un alpha égal à zéro ;
- la galerie rend dix étapes et zéro image raster dans les étapes futures ;
- un clic réel sur une forme grise du coffre ne monte aucune fiche.

Captures de contrôle, hors références visuelles :

- `bac-a-sable/progression-gobi/galerie-1920x1200.png` ;
- `bac-a-sable/progression-gobi/coffre-groupe-1920x1200.png`.

Ces captures ne remplacent pas le visa esthétique du parent et aucune référence visuelle n'a été
mise à jour.

## Limites du lot

Aucun seuil de progression, acquis, profil familial, dessin canonique, décor du campement ou
référentiel protégé n'a été modifié. Aucun commit, aucune publication distante et aucune remise à
zéro de profil ne font partie de ce lot.

## Campagne globale de clôture

`npm run verifier` a été exécuté une fois, jusqu'à son pied de rapport, le 10 septembre 2026.
Le verdict consolidé écrit à `2026-09-10T08:43:12.042Z` est **ROUGE : 5 étapes en échec sur 15**.
Il ne permet donc pas de certifier le dépôt entier :

- `test` signalait 1 échec sur 2 733 et `test:e2e` 5 sur 908 ; deux de ces attentes exigeaient
  encore qu'une forme future ouvre sa fiche. Elles ont été alignées sur la présente décision,
  puis leurs cas discriminants sont passés : 9/9 en composant et 1/1 dans Chromium ;
- les quatre autres échecs E2E concernent l'audit des 75 nœuds, l'inventaire des commandes du
  dashboard et de la récompense, ainsi qu'un profil `DecorGrenouilles` absent au démarrage d'un
  parcours `tri` ;
- les quatre divergences visuelles concernent la cour d'école et trois captures du moteur
  `colorie`/de sa récompense ; aucune référence n'a été mise à jour ;
- `test:qualite` conserve 17 échecs : trois débordements de 59 px dans le moteur `paires` et
  quatorze moteurs qui ne suivent pas encore le réglage de lecture à 27 px ; le budget de bundle
  n'a par conséquent pas été exécuté ;
- contenu, construction de test, construction de production, rejeu, lint, TypeScript, ressources,
  cohérence et contrôles finaux sont verts.

Le rapport faisant foi reste `tests/rapports/RAPPORT.md`. Il décrit l'exécution globale antérieure
aux deux corrections de recettes ciblées ci-dessus ; la campagne complète n'a pas été répétée,
conformément à la règle de ne pas relancer tout le groupe pour des attentes de test devenues
contradictoires avec une décision parent explicite.

Avant publication, le commit du lot a aussi été relu dans une copie propre : 63/63 tests de
composants, construction de test et 9/9 parcours Gobi/coffre sont verts. `npm run typescript` y
signale toutefois `partage/src/base/services/code-parent.ts:75` :
`Uint8Array<ArrayBufferLike>` n'est pas assignable à `BufferSource`. La même commande et la même
erreur ont été reproduites après retour au commit parent `f63d52b` ; ce défaut TypeScript préexiste
donc au lot Gobi et doit être repris avec la campagne globale.
