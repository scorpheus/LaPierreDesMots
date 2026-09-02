# Campement V5 interactif — état au 2 septembre 2026

## Décision appliquée

Le parent a retenu le concept V5 : style vectoriel net, couleurs franches, ambiance enfantine,
sans filtre jauni ni rendu peint. La scène de production conserve les 30 objets existants mais
abandonne leur grille 10×3 au profit d'îlots naturels autour d'une grande tente, d'un feu et d'un
tapis central.

## Implantation

- `scripts/recomposer-campement.mjs` génère ensemble le SVG et les 30 zones tactiles JSON depuis
  la source archivée `production/archives/campement-grille-v4.svg`.
- Chaque objet est placé par un groupe parent immobile `placement-<id>` ; son groupe visible
  `objet-<id>` reste libre de recevoir une animation CSS sans perdre sa position.
- Le SVG est chargé dans le DOM. Toucher une zone transparente anime désormais le dessin visible,
  et plus seulement la zone de clic.
- Les dessins de la carte, du coffre et du chaudron ouvrent directement leur destination. Toutes
  les autres réactions restent gratuites, rejouables et sans état d'échec.

## Gardes ajoutés

`tests/unitaires/campement-composition-v5.test.ts` impose l'identité exacte entre les points JSON
et les groupes SVG, une dispersion minimale sur la scène et les marqueurs de composition V5.
`tests/composants/EcranCampement.test.tsx` vérifie l'animation du groupe visible ainsi que les trois
destinations utiles.

## Recette mesurée

- format contrôlé : 1920×1200 CSS, horizontal 16:10 ;
- 30 groupes SVG pour 30 points JSON ;
- carte et coffre ouverts depuis leur dessin dans le navigateur ;
- capture locale :
  `bac-a-sable/recette-2026-09-02/campement-v5-interactif-1920x1200.png`.

La procédure de modification est conservée dans `.agents/skills/dessiner-campement/SKILL.md`.

## Défaut du testeur découvert pendant la reprise

Le contrat E2E de couverture rejouait 88 recettes sur la même page. Après une première visite de
la zone parent, le jeton parent conservé dans le module `api/commun.ts` survivait aux rechargements :
la recette suivante sautait le pavé de code, puis l'attendait jusqu'au garde-fou de 270 secondes.
Le commentaire ancien attribuait ce risque à une base partagée entre workers, alors que le harnais
fournit bien un serveur isolé à chaque cas.

La surface `window.__test` sait désormais refermer cette session en mémoire entre deux recettes.
Mesure après correction, dans une campagne parallèle comprenant toutes les dépendances du projet
`bilan` : **466/466 tests verts**, **14 écrans déclarés, 14 visités, écart zéro**, contrat de
couverture terminé en 35,7 secondes.
