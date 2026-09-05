# Proposition de planches animées des compagnons

Date : 4 septembre 2026.

## Référence artistique validée — rectification du 5 septembre

La référence canonique des quatre compagnons est
`production/personnages/reference-compagnons-validee-2026-09-04.png` (SHA-256
`F34CD33DB577EBC084D7DA612C65800A853F7926B17AA9930E6B66136C9F7AC8`). Elle montre :

- Filou, le fennec explorateur avec sa loupe ;
- Bulle, personnage d'eau aux traits féminins et aux cheveux faits d'eau, avec son livre ;
- Roc, gardien de pierre dont la silhouette porte clairement de la mousse et de petites plantes ;
- Plume, l'oiseau bleu messager avec sa sacoche.

La planche générée juste après cette référence, où Bulle est moins féminine et Roc dépourvu de
mousse, a été rejetée par le parent. Elle ne doit servir ni à l'intégration ni à une nouvelle
génération. Les planches animées mentionnées ci-dessous ne sont donc pas validées : elles devront
être refaites à partir de la référence canonique avant toute publication dans le jeu.

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
