# QA rapide exhaustive — 2 septembre 2026

## Objet

`npm run qa:rapide` est désormais un garde-fou structurel court pour les 76 exercices réellement servis. Il ne prétend pas juger l’esthétique, la lisibilité à l’écran ou la qualité des illustrations : ces points restent une recette navigateur et un regard humain.

Le script ne crée ni ne modifie de fichier dans `tests/`. Il lit le catalogue, les contenus, les habillages, le manifeste audio et les sources nécessaires, puis affiche son résultat sur la sortie standard.

## Contrôles automatisés

| Contrôle | Ce qui est vérifié |
|---|---|
| Catalogue 76/76 | 76 nœuds, 76 exercices, IDs uniques, aucun nœud orphelin, retour `jeu.noeud` cohérent |
| Audio visible | chaque `consigne`/`question` (et le tracé spécial) possède le clip `${exercice}/${id}` avec le même texte que l’écran |
| Gameplay déclaratif | éléments, zones, options, réponses, cases, chemins, paires, blocs, étiquettes et vignettes résolvent les collections de leur exercice |
| Assets | chaque chemin image/scène non nul trouvé dans exercices, habillages et monde existe et contient au moins un octet |
| Décisions transversales | mélange `place` et `tri` par `Alea`, particules génériques absentes d’une réussite, chaudron sur la route libre, récompense Gobi en WebP |
| Contrôle négatif | un faux nœud pointant vers un faux exercice est volontairement présenté au validateur ; l’audit doit produire une erreur, sinon le contrôle est rouge |

## Mesure du 2 septembre

Commande ciblée exécutée après le mélange de la réserve `place` par l'`Alea` injecté :

```text
npm run qa:rapide
```

Résultat : **15/15 contrôles verts en 165 ms**, contrôle HTTP réel inclus. Le mélange `place`
est effectué une seule fois dans `MoteurPlace.tsx` avec `services.alea`, puis prouvé par un test
de composant qui vérifie à la fois que l'ordre du fichier a changé et que la population est intacte.

Les 76 nœuds et les 76 exercices sont bien appariés, les 52 consignes de la Clairière et l’ensemble des textes audibles contrôlés correspondent au manifeste, les références de gameplay ne sont pas orphelines et les assets déclarés sont présents et non vides.

Le contrôle HTTP a vérifié les assets réellement servis et sa contre-épreuve 404.

## Limites assumées

- aucune capture, compilation, snapshot ou campagne complète n’est lancée par ce contrôle ;
- une image techniquement présente peut encore être la mauvaise image ou être visuellement pauvre ;
- la taille des consignes et le placement des éléments restent à vérifier dans le navigateur sur tablette ;
- la phrase affichée et le clip audio sont comparés textuellement, mais la qualité de la voix reste une recette audio dédiée.
