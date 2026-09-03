# Recette — galeries-08 / galeries-passage-chemin-01

Date : 2026-09-03
Moteur : `chemin`
Habillage : `galeries.passage`

## Parcours joué

Quatre parcours de trois mots sont jouables jusqu'à la fin : b puis d, puis deux reprises b/d.
Les consignes (« Marche sur les mots où tu lis un b/d. ») sont courtes, audibles et adaptées au
CE1. L'aide Gobi relit, souffle, surligne ou montre la cible gratuitement.

Le départ possède quatre voisines et le plateau présente de vrais embranchements (`qcm-4`) ; les
relations sont symétriques et les parcours disjoints. Un tap sur chaque pierre est le geste réel.
Une case hors de portée est ignorée sans erreur ni écran d'échec. Les choix sont donc non
triviaux, le pion reste récupérable et la quatrième réussite transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'un couloir qui validerait sans lecture et le voisinage
asymétrique. Les tests composants couvrent tap, choix, refus doux, aide et fin ; les réducteurs
couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurChemin.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les pierres sont des cibles tactiles espacées et lisibles ; aucun geste fin n'est exigé. Le texte
reste séparé du décor animé.

**BLOQUÉ-ASSET** — l'asset final de `galeries.passage` reste à valider. Aucun asset n'a été
généré.
