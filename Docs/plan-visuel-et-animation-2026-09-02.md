# Plan visuel et animation — reprise du 2 septembre 2026

**Statut :** plan de travail proposé. Aucun design nouveau n'est validé par ce document.

## Constat mesuré

- Le campement est fonctionnel : 30 zones tactiles, 18 réactions nommées, aucune issue d'échec.
- Son asset actuel est une grille de 30 objets sur trois bandes horizontales. Il remplit le contrat
  mécanique, mais ne compose pas un lieu habité : pas de foyer central, peu de profondeur et aucune
  circulation visuelle entre la tente, le feu, Gobi et les compagnons.
- Les quatre compagnons sont encore des silhouettes bouchons dessinées en code.
- Le dépôt possède une ancienne chaîne ComfyUI, mais elle n'est pas l'outil disponible pour cette
  reprise. L'utilisateur a explicitement demandé le générateur d'images intégré à Codex.
- La génération ne doit jamais remplacer directement un asset validé : les propositions restent
  dans `contenu/brouillons/` jusqu'au choix du parent.
- Un premier concept 1 536 × 1 024 a été généré dans
  `contenu/brouillons/campement/concept-campement-v1.png`. Son prompt, son empreinte et son statut
  sont consignés dans le `LISEZ-MOI.md` voisin ; il attend une validation parent.

## Ordre recommandé

### V1 — un vrai campement

1. Faire valider ou corriger la direction du premier concept produit avec le générateur intégré.
   Ne produire des variantes qu'à partir d'un retour précis, afin d'éviter trois images presque
   identiques sans décision de composition.
2. Composer un refuge lisible en un coup d'œil : tente et feu au centre, carte et coffre dans les
   deux ailes, chaudron près de Gobi, chemin d'entrée au premier plan, forêt en cadre.
3. Montrer une planche de trois vignettes au parent. Une seule proposition peut être retenue.
4. Après validation, vectoriser et colorer depuis les jetons du jeu, puis replacer les 30 objets
   interactifs sur des coordonnées réellement liées au dessin.
5. Rejouer les tests R11/R16 et la recette tablette. La nouvelle image n'entre en production
   qu'avec 30 prises alignées et aucun débordement horizontal.

### V2 — Gobi vivant

1. Faire choisir ou confirmer une image canonique de Gobi.
2. Produire depuis cette canonique une planche de vues, puis les poses utiles ; profondeur de chaîne
   égale à un, toujours depuis la canonique.
3. Construire des feuilles de sprites déterministes pour quatre états prioritaires : repos,
   encouragement, célébration et déplacement. Le texte ne bouge jamais ; seul Gobi s'anime.
4. Prévoir une variante à mouvements réduits et une image fixe de repli.

### V3 — les compagnons

1. Explorer séparément Filou, Roc, Plume et Bulle, puis faire valider une canonique par personnage.
2. Ne décliner qu'après validation. Une silhouette bouchon reste préférable à quatre personnages
   incohérents.
3. Pour chaque compagnon retenu : repos, arrivée, réaction propre et célébration, avec une petite
   feuille de sprites plutôt qu'une animation générique partagée.

### V4 — densifier les niveaux

1. Priorité aux écrans encore perçus comme des formulaires : réserver, trier, choisir et les écrans
   de consigne longue.
2. Ajouter un premier plan, un point focal et une récompense visuelle propre à chaque habillage,
   sans animer les zones de lecture.
3. Conserver l'architecture moteur × habillage × contenu : une amélioration de décor ne doit jamais
   ajouter une branche de code dans un moteur.

## Porte de validation de chaque lot

- planche de 2 ou 3 vignettes seulement, affichée au parent ;
- accord explicite avant promotion hors de `contenu/brouillons/` ;
- empreinte des pixels et paramètres consignés dans `production/assets.lock.json` ;
- vérification tablette 1280 × 800 et portrait ;
- capture avant/après ;
- `npm run verifier` et lecture de `tests/rapports/RAPPORT.md`.

## Améliorations autonomes déjà applicables

La page du campement peut être mieux cadrée avant le nouvel asset : en-tête regroupé, largeur utile
de 1 200 px, fond en plusieurs plans, panneaux de Gobi, du mur et du chaudron visuellement reliés.
Cela améliore la hiérarchie, mais ne remplace pas la refonte du décor central décrite en V1.
