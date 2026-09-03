# Recette — galeries-02 / galeries-miroir-bp-01

Date : 2026-09-03
Moteur : `trace`
Habillage : `galeries.tracer-paroi`

## Parcours joué

La consigne est explicite : « Grave le b, puis le p. Regarde bien si la barre monte ou descend. »
Elle distingue bien les deux lettres par l'axe haut-bas. Le ductus est correct : pour `b`, la
hampe part en haut (y=20) puis la panse descend ; pour `p`, la hampe part plus bas (y=60) et la
panse remonte. Chaque lettre comporte deux traits ordonnés et le départ/arrivée sont déclarés.

Le geste de tracé est réalisé au pointeur/tap-glissé dans la zone tactile du tracé, avec tolérance
et progression visible. Un trait hors cible est refusé sans écran d'échec ; la lettre reste
rejouable. La première lettre puis la seconde mènent à la fin et à la récompense. L'aide Gobi
relit ou montre la cible gratuitement. Audio hors campagne.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut de ductus inversé (confusion b/p) et l'absence de
départ/ordre explicite ; les contrôles actuels vérifient les points, l'ordre des traits, le geste
réel et le refus doux.

```text
npm test -- --run tests/composants/MoteurTrace.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
114 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne.

## Verdict tablette

La zone de tracé est une cible tactile directe, sans clavier ni coordination fine supplémentaire.
La distinction visuelle et pédagogique b/p est observable dans la hauteur de départ de la hampe.

**BLOQUÉ-ASSET** — l'habillage final `galeries.tracer-paroi` reste à valider ; la recette
fonctionnelle ne valide pas un décor non livré. Aucun asset n'a été généré.
