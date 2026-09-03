# Suivi de production des images d'exercices — 2026-09-03

## Décision parent

Le parent a validé le premier décor `clairiere/collier` puis demandé de produire l'ensemble des
images avant une validation groupée. Les images restent dans `contenu/brouillons/` jusqu'à cette
validation. Aucun brouillon de ce lot n'est encore servi à l'enfant.

L'audio reste explicitement hors périmètre.

## État de la production

| Série | Production | État |
|---|---:|---|
| Décors maîtres | 48 / 48 | produits en 1536 × 1024 ; validation parent groupée à faire |
| Cartes illustrées | 6 planches, 39 sujets | produits ; découpe et détourage après validation |
| Vignettes narratives | 5 planches, 47 cellules | produites selon les JSON servis ; découpe après validation |
| Masques indexés | 0 / 622 | à produire après validation des maîtres |
| Calques fond / trait | 0 / 96 | à dériver après validation des maîtres |
| Intégration dans les habillages | 0 / 48 | interdite avant validation parent |

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

Après validation parent, la suite est : figer la sélection, extraire cartes et vignettes, produire
les masques indexés et les calques, brancher les habillages, puis tester chaque exercice avec ses
vrais assets.
