# Suivi de production des images d'exercices — 2026-09-03

## Décision parent

Le parent a validé le premier décor `clairiere/collier`, puis les planches groupées de l'ensemble
du lot, et a demandé leur intégration dans les exercices le 2026-09-03. Les sources de production
restent dans `contenu/brouillons/`; les exports stables sont maintenant servis depuis
`contenu/assets/`.

L'audio reste explicitement hors périmètre.

## État de la production

| Série | Production | État |
|---|---:|---|
| Décors maîtres | 48 / 48 | validés, publiés en 1536 × 1024 et branchés dans les SVG servis |
| Cartes illustrées | 6 planches, 39 sujets | 39 exports 512 × 512 ; 40 références de cartes image branchées |
| Vignettes narratives | 5 planches, 47 cellules | 47 exports 4:3 branchés dans les cinq exercices chrono |
| Masques indexés | 0 / 622 | à produire après validation des maîtres |
| Calques fond / trait | 0 / 96 | à dériver après validation des maîtres |
| Intégration dans les habillages | 48 / 48 | intégration raster effective ; prises SVG conservées |

Les cartes ont été produites par planches plutôt que par 39 appels distincts : six appels donnent
les 39 sujets et les cellules seront exportées individuellement. Cette méthode économise 33
générations sans réduire la résolution utile des cartes dans l'interface.

## Sélection des décors à présenter

- Clairière : `collier-v1`, `guirlande-v1`, `lianes-v1`, `luciole-v3`, `lucioles-v1`,
  `paniers-v2`, `veillee-v1`.
- Forêt muette : les sept `foret-*-v2.png`. Les V1 sont invalides et ne doivent jamais être
  intégrées.
- Galeries : les onze `galeries-*-v1.png`.
- Marais : les sept `marais-*-v1.png`.
- Volcan : les sept `volcan-*-v1.png`.
- Cité : les neuf `cite-*-v1.png`.

Contrôle décor : 48 fichiers sélectionnés, tous en 1536 × 1024, aucune empreinte SHA-256 en double.
Deux choix restent volontairement soumis au parent : le cœur tracé dans la buée de la cabane et
l'apparence de Plume dans la veillée d'automne.

## Sélection des vignettes narratives

- `galeries-frise-v3.png`
- `volcan-fresque-v3.png`
- `cite-pellicule-01-v2.png`
- `cite-pellicule-02-v3.png`
- `cite-vitrail-v3.png`

Les scènes sont contrôlées contre les JSON actuellement servis, qui ont évolué depuis le premier
tableau du plan de production. En particulier, `galeries-frise-chrono-01.json` demande désormais
les séquences pot, bol, panier, tas, dos du chien, dame, four, verre, sac et zèbre. Le tableau ancien
qui lui attribuait le récit du cochon ne doit plus servir de référence de recette.

## Incident de production et garde ajoutée

La première production parallèle de la Forêt copiait le PNG le plus récent du dossier partagé du
générateur. Sept fichiers Forêt ont ainsi reçu des images d'autres lots. L'audit par empreintes a
détecté sept doublons exacts avec les Galeries et la Clairière.

Correction appliquée : les sept décors Forêt ont été régénérés en V2 et copiés uniquement depuis
le chemin `exec-…png` exact rendu par leur propre appel. La règle pour les lots suivants est :

1. ne jamais sélectionner une sortie par date ou par « fichier le plus récent » ;
2. conserver le chemin exact renvoyé par l'appel ;
3. calculer l'empreinte du fichier copié ;
4. rechercher les doublons avant toute revue esthétique.

## Planches de validation

Les planches groupées sont dans `bac-a-sable/production-images/planches-contact-finales/` : une
planche par région, une planche `cartes.png` et une planche `vignettes.png`.

## Intégration livrée

- `scripts/decors/decors.mjs` associe automatiquement les 47 scènes générées à leur maître raster ;
  `galeries.grottes`, scène historique non régénérée par ce script, porte le 48e maître.
- Les géométries SVG restent dans le DOM pour préserver les emplacements et les interactions, mais
  leur blockout est masqué visuellement devant l'illustration.
- `scripts/assets/extraire-cartes.py` et `scripts/vignettes/extraire-planches.py` rendent la découpe
  reproductible. Une erreur de chemin (`cartes/` au lieu de `assets/cartes/`) et une erreur de
  grille (4 × 4 au lieu de 4 × 3) ont été attrapées par les tests ciblés avant livraison.
- Les moteurs `paires` et `chrono` rendent désormais réellement le champ `asset`. Une carte image
  ne révèle pas son mot ; une vignette narrative conserve sa légende sous l'image.

## Transition avant les masques indexés

Les maîtres validés sont des illustrations couleur, tandis que les 622 masques précis ne sont pas
encore produits. Pour ne pas perdre la promesse « le monde part en gris et reprend ses couleurs »,
`SceneDecor` applique provisoirement une grisaille complète au début puis la retire par paliers à
chaque acquisition. Cette transition agit sur l'image entière, pas encore région par région.

La prochaine passe image consiste à dériver les calques fond/trait et les masques indexés, puis à
remplacer cette transition globale par la recoloration régionale exacte. Les scènes `colorie` et
`libre` n'ont pas reçu un maître complet : elles conservent leur pipeline indexé spécifique afin de
ne pas neutraliser le geste de coloriage.

## Recette d'intégration

- contenu : 620 contrôles, 0 problème ;
- tests ciblés décors/cartes/vignettes et moteurs : 23/23, puis 20/20 après ajout de la grisaille ;
- parcours navigateur isolés : 3/3, avec chargement réel du décor, des cartes et des vignettes ;
- QA rapide des 76 activités : 14/14 contrôles verts en 171 ms ;
- construction production et construction test : réussies ; bundle initial à 208,66 Ko gzip ;
- passe T1 large : 2 266/2 268. Les deux échecs sont les mêmes 11 divergences de textes audio
  antérieures à ce lot. L'audio est explicitement hors périmètre et désactivé par décision parent,
  donc aucun manifeste ni clip n'a été modifié pour rendre artificiellement cette passe verte.

Les captures de recette sont conservées dans `bac-a-sable/captures-integration-images/`.
