# Recette — marais-jumeau-10 / marais-jumeau-poissons-attrape-02

Date : 2026-09-03
Moteur : `attrape`
Habillage : `marais.poissons`

## Parcours joué

Quatre consignes sont jouables jusqu'à la fin : poissons contenant le son de `noir` (`roi`,
`noix`, `soir`, `étoile`), puis lecture directe de `poire` et `toit`. Les intrus `loup` et `four`
portent le digramme `ou`. Les textes sont courts, français et CE1 ; l'aide Gobi relit, souffle ou
montre la cible gratuitement.

Les huit poissons sont des cibles tactiles de 150×150 px, attrapables au tap. Les cibles sont
mélangées à la création par `Alea` et les groupes sont disjoints. Une mauvaise capture est refusée
sans erreur bloquante ni écran d'échec ; les quatre étapes progressent et la dernière transmet la
récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre la cible non capturable et l'intrus qui laisserait un état sans
issue. Les tests composants couvrent capture correcte, refus doux, aide et fin ; les réducteurs
couvrent progression et sortie.

```text
npm test -- --run tests/composants/MoteurAttrape.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les poissons sont espacés et largement tactiles ; le tap ne demande pas de coordination fine. Le
texte reste séparé du décor animé.

**BLOQUÉ-ASSET** — les huit cibles déclarent `asset: null`; l'illustration finale de
`marais.poissons` reste à fournir. Aucun asset n'a été généré.
