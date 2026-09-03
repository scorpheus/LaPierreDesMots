# Recette — marais-jumeau-12 / marais-jumeau-nenuphars-chemin-02

Date : 2026-09-03
Moteur : `chemin`
Habillage : `marais.nenuphars`

## Parcours joué

Trois parcours de trois mots sont jouables jusqu'à la fin : le son de `main`, le son de `pont`,
puis une seconde série `main`. Les textes sont courts, français et adaptés au CE1 ; l'aide Gobi
relit, souffle, surligne ou montre la cible gratuitement.

Le plateau est une grille à voisinage symétrique avec de vrais choix entre nénuphars. Un tap sur
chaque case est le geste effectif. Les départs sont hors parcours, les parcours disjoints et une
case hors de portée est ignorée sans erreur ni écran d'échec. La troisième réussite clôt l'exercice
et transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le plateau sans embranchement et le geste hors portée puni. Les
tests composants couvrent tap, aide, refus doux et progression ; les réducteurs couvrent la fin.

```text
npm test -- --run tests/composants/MoteurChemin.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les nénuphars sont des cibles tactiles espacées et lisibles ; aucun geste fin n'est requis. Le
texte reste séparé du décor animé.

**BLOQUÉ-ASSET** — l'asset final de `marais.nenuphars` reste à valider. Aucun asset n'a été
généré.
