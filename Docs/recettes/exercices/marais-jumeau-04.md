# Recette — marais-jumeau-04 / marais-jumeau-nenuphars-chemin-01

Date : 2026-09-03
Moteur : `chemin`
Habillage : `marais.nenuphars`

## Parcours joué

Trois parcours de trois mots sont jouables jusqu'à la fin : le son de `trou`, le son de `noir`,
puis une seconde série `trou`. Les consignes sont courtes, françaises et adaptées au CE1 ; l'aide
Gobi relit, souffle ou montre la cible gratuitement.

Le plateau est une grille à relations symétriques, avec jusqu'à quatre voisines (`qcm-4`) : les
choix sont réels et non triviaux. Un tap sur chaque nénuphar est le geste effectif. Une case hors
de portée est ignorée sans erreur ni écran d'échec. Les parcours sont disjoints et la troisième
réussite transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'un plateau en couloir et le geste hors portée puni.
Les tests composants couvrent tap, aide, refus doux et progression ; les réducteurs couvrent la
fin.

```text
npm test -- --run tests/composants/MoteurChemin.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les nénuphars sont des cibles tactiles espacées et lisibles ; aucun geste fin n'est requis. Le
texte reste séparé du décor animé.

**BLOQUÉ-ASSET** — l'asset final de `marais.nenuphars` reste à valider ; aucun asset n'a été
généré.
