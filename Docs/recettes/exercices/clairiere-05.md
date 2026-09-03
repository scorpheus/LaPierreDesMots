# Recette — clairiere-05 / clairiere-guirlande-phrase-01

Date : 2026-09-02
Moteur : `phrase`
Habillage : `clairiere.guirlande`

## Parcours joué

Le contenu réel propose deux phrases, chacune en quatre mots : « Le chat est noir. » puis
« Les fleurs sont roses. ». Les neuf étiquettes sont rendues ensemble, dont l'intrus « une ».
La consigne « Touche les fanions dans l’ordre. » est française, courte et audible via le contrôle
d'écoute ; l'aide Gobi relit la consigne sans coût.

Le geste est atteignable au tap sur chaque `data-etiquette`. Le composant expose également les
zones de dépôt et le glisser-déposer partagé : les deux chemins aboutissent à la même action de
placement. L'ordre des étiquettes est mélangé une seule fois par `Alea` à la création de l'état,
donc non trivial et stable à graine égale. Les mots déjà posés sont conservés entre les étapes.

Une étiquette hors ordre est refusée avec une erreur et une confusion, sans écran d'échec ni état
bloqué. La bonne suite avance, la seconde phrase est jouable, puis la fin est marquée avec la
réussite et la récompense du conteneur. Le double-tap sur un mot déjà posé ne compte pas une
erreur. La réécoute reste gratuite et l'aide ne dégrade pas la réussite.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel correspondant au défaut historique « les mots sont déjà dans l'ordre »
exige un mélange réel à la création ; le contrôle positif est maintenant vert. Les tests du
composant couvrent bonne/mauvaise réponse sans échec, aide, réécoute et double-tap. Les réducteurs
et la couverture des compétences couvrent en plus la fin et la conservation des étiquettes.

Commande exécutée :

```text
npm test -- --run tests/composants/MoteurPhrase.test.tsx tests/unitaires/moteurs-reducteurs.test.ts tests/unitaires/competences-trois-moteurs.test.ts
115 tests passés, 0 échec
```

Le schéma du moteur et l'habillage déclarent bien `phrase`. Aucun correctif moteur ou contenu
n'est nécessaire pour cette ligne.

## Verdict tablette

Les neuf boutons restent dans le plafond prévu par le contenu et sont séparés du décor animé.
Le tap ne demande aucune coordination fine ; le glisser est un chemin complémentaire, pas une
condition cachée. Le parcours est donc compréhensible et atteignable sur tablette.

**BLOQUÉ-ASSET** — `contenu/habillages/clairiere/guirlande.svg` est encore un SVG gris de
blockout, sans illustration raster finale.

**BLOQUÉ-AUDIO** — une formulation plus explicite (« Touche les mots dans l’ordre pour faire une
phrase ») améliorerait la consigne, mais `audio: null` devrait être régénéré avant publication.
