# Proposition de remplacement — Chemin de la Cité — 2026-09-05

**Statut : brouillon de décision, à valider par le parent.** Ce document ne modifie ni
`contenu/exercices/cite-des-histoires/ponts-chemin-01.json`, ni les clips audio, ni les assets.
Il propose seulement le futur contenu de ses douze cases et la formulation cohérente de son jeu.

## Décision proposée

Le plateau porte des **phrases**, pas des images : les futures consignes diraient donc « Marche
sur les phrases dans l'ordre de l'histoire. » (c1 et c2), puis « Marche sur les dernières
phrases dans l'ordre de l'histoire. » (c3). Cette modification doit suivre le visa parent et la
régénération des trois clips : aucun texte entendu ne peut diverger du texte affiché.

Les trois chemins gardent le lapin, le renard et les amis, ainsi que la compétence
`comp.chronologie`. Chaque suite décrit quatre **états successifs** : cause, action, résultat,
conséquence. Aucun connecteur ne sert à déclarer l'ordre arbitrairement : échanger deux étapes
intermédiaires détruit le changement d'état qui les relie.

| Étape / cases existantes | Chaîne causale proposée |
| --- | --- |
| c1 — `pont-un` → `pont-deux` → `pont-trois` → `pont-quatre` | 1. Le pneu du vélo est à plat. 2. Le lapin gonfle le pneu. 3. Le pneu est gonflé. 4. Le lapin part avec le vélo. Un pneu gonflé est le résultat du gonflage ; le départ à vélo devient alors possible. |
| c2 — `pont-cinq` → `pont-six` → `pont-sept` → `pont-huit` | 1. Le panier du renard tombe. 2. Les pommes sont au sol. 3. Le lapin ramasse les pommes. 4. Les pommes sont dans le panier. Les pommes ne peuvent être ramassées qu'après leur chute, puis être revenues dans le panier. |
| c3 — `pont-neuf` → `pont-dix` → `pont-onze` → `pont-douze` | 1. Les amis plantent une graine. 2. Les amis arrosent la graine. 3. La plante pousse. 4. La plante a une fleur. La plantation précède l'arrosage, la pousse et enfin la fleur : chaque phrase constate l'état produit par la précédente. |

## Contrôle avec la liste lexicale locale

Contrôle en lecture seule, avec `estAuLexique` exporté par
`scripts/generer-phonologie.mjs`, sur les 32 formes distinctes présentes dans les douze phrases :

```text
a, amis, arrosent, au, avec, dans, du, est, fleur, gonfle, gonflé, graine,
la, lapin, le, les, panier, part, plante, plantent, plat, pneu, pommes, pousse,
ramasse, renard, sol, sont, tombe, une, vélo, à

hors du lexique CE1 déclaré : arrosent, au, gonfle, gonflé, graine, part,
plantent, plat, pneu, pousse, ramasse
```

Le contrôle applique les seules flexions autorisées par le module (ici, notamment `amis` et
`pommes`). Les onze formes hors liste sont assumées comme choix de contenu à valider ou à
réécrire : **aucune ne doit être ajoutée au lexique pour faire passer cette proposition**.
Cette petite liste interne est incomplète (elle signale même « au ») : elle n'est pas une
certification scolaire CE1. La cohérence des histoires prime sur l'obtention artificielle
d'un taux de couverture de 100 %.

## Conditions avant intégration

1. Le parent valide l'histoire, la formulation « phrases » et les douze libellés.
2. Les phrases validées passent par `contenu/brouillons/`, puis par la relecture prévue par le
   dépôt ; aucune écriture directe dans le contenu publié.
3. Les clips c1–c3 sont régénérés et leur manifeste est contrôlé après la validation textuelle.
4. Le texte source absent qui soutenait l'ancienne histoire est soit archivé et relié, soit la
   nouvelle micro-histoire est explicitement assumée comme contenu original validé par le parent.
