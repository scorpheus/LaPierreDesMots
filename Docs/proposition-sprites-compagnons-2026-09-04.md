# Proposition de planches animées des compagnons

Date : 4 septembre 2026.

## But

Remplacer les mouvements CSS des portraits par de petites animations raster cohérentes avec les
personnages validés. Ce lot reste une proposition : aucune image n'est publiée avant la validation
artistique du parent.

## Livrables à regarder

Les planches de contact sont dans
`bac-a-sable/assets-a-valider-2026-09-04/sprites-compagnons/` :

- `filou-contact.png` ;
- `roc-contact.png` ;
- `plume-contact-v2.png` ;
- `bulle-contact.png`.

Chaque sortie normalisée contient huit cellules de 256 × 256 px, avec une ancre bas-centre stable.
Les rapports `*-qa.json` contrôlent la présence des huit cellules, l'absence de débordement et la
stabilité de l'ancre.

## Décision de production

Une seule génération a été demandée par compagnon pour limiter le coût. Plume a nécessité une
correction supplémentaire : la première planche passait les mesures géométriques mais contenait
visuellement des pattes détachées. La version v2 est donc la seule candidate de Plume.

Après validation parentale, le raccordement devra :

1. copier seulement les quatre atlas normalisés vers `contenu/assets/compagnons/animations/` ;
2. consigner leur empreinte et leur provenance dans `production/assets.lock.json` ;
3. utiliser une animation par positions de fond sans interpoler les cellules ;
4. conserver l'image statique quand les animations calmes sont demandées ;
5. vérifier le campement, le choix de compagnon et les récompenses sur téléphone et tablette.
