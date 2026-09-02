# Progression initiale et polices disponibles — 2 septembre 2026

## Progression de la Clairière

Une partie neuve ne composait que trois étapes au lieu des quatre à six exigées. Les douze nœuds
étaient présents ; le manque venait de l'éligibilité pédagogique.

`clairiere-ecole-02-place` déclarait simultanément `comp.consigne.simple` et
`comp.consigne.multiple`. Or chacune de ses trois consignes demande exactement une action sur un
objet : dessiner un soleil, un ballon ou un oiseau dans une zone. La compétence multiple rendait
ce nœud inaccessible tant que la compétence simple n'était pas maîtrisée, alors que l'exercice
mesure précisément cette compétence simple.

La métadonnée a été corrigée sans modifier une seule phrase destinée à l'enfant. Le test navigateur
`parcours-sortie-clairiere.spec.ts` compose désormais une sortie neuve de quatre à six étapes.
Le calcul exhaustif au point fixe passe de 10 à **15 nœuds atteignables sur 76** : la nouvelle
mesure exacte est portée par le test, afin qu'une prochaine variation doive de nouveau être
expliquée plutôt qu'absorbée par une borne permissive.

## Polices

Mesure sur `client/public/polices/` :

- Andika 400 et 700 : présentes et vérifiées ;
- OpenDyslexic 400 : présente et vérifiée ;
- Verdana : police système, non redistribuable, avec repli vers Andika ;
- Luciole : aucun WOFF2 dans le dépôt ;
- Belle Allure GS : aucun WOFF2 et redistribution non établie.

Luciole et Belle Allure ont été retirées des choix, des types, du CSS, du préchargement, du script
d'installation et de la matrice visuelle. Une ancienne valeur enregistrée est normalisée vers
Andika par le mécanisme existant. La chaîne de téléchargement vérifie maintenant 6 fichiers sur 6,
en comptant les trois polices d'interface Atkinson et Fredoka.

Cette réduction est une décision explicite de l'utilisateur : l'interface ne doit pas proposer une
police que l'application ne possède pas.

## Garde-fous renforcés pendant la recette

La vérification complète a révélé deux angles morts dans le testeur lui-même :

- le contrôle de cohérence des polices ne reconnaissait que les apostrophes et devenait vide après
  formatage automatique ; il accepte désormais les deux styles de guillemets tout en conservant
  son contrôle positif non vide ;
- quatre recettes E2E utilisaient bien un serveur neuf, mais contournaient les six invariants
  globaux. Elles passent désormais toutes par le même harnais. L'invariant de persistance distingue
  les parties enfant des prévisualisations parent grâce au contrat DOM existant
  `data-journalise="non"`.

## Recette finale mesurée

`npm run verifier`, relancé seul le 2 septembre 2026 après extinction des campagnes concurrentes :

- lint et TypeScript : réussite ;
- unitaires, composants et API : **2 163 / 2 163** ;
- contenu : **608 / 608** ;
- parcours et robustesse : **477 / 477** ;
- qualité tablette et accessibilité : **247 / 247** ;
- bundle, rejeu et contrôles QA : réussite ;
- visuel : **9 divergences sur 13**, dont 7 anciennes références différentes et 2 références
  absentes. Elles sont laissées intactes conformément à l'interdiction de les régénérer sans
  validation parent.

Le rapport consolidé est `tests/rapports/RAPPORT.md`. Les captures manuelles de cette reprise sont
`bac-a-sable/recette-2026-09-02/campement-apres.png` et
`bac-a-sable/recette-2026-09-02/reglages-polices.png`.
