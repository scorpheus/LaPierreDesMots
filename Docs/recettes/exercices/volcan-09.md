# Recette — volcan-09 / volcan-etoiles-filantes-attrape-02

Date : 2026-09-03
Moteur : `attrape`
Habillage : `volcan.etoiles-filantes`

## Parcours joué

Six consignes sont jouables jusqu'à la fin : sons de `chat`, `coq` et `photo`, chacun sur deux
étapes. Douze cibles sont disjointes ; `lune` et `robe` sont des intrus. Les formulations sont
courtes, françaises et CE1. L'aide Gobi relit, souffle ou montre la cible gratuitement.

Les quatorze étoiles sont des cibles tactiles de 150×150 px, réellement attrapables au tap. Elles
sont mélangées à la création par `Alea`. Un intrus ou une mauvaise capture est refusé sans écran
d'échec ; les six étapes progressent et la dernière transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre la cible non capturable et l'intrus qui laisserait un état sans
issue. Les tests composants couvrent capture, refus doux, aide et fin ; les réducteurs couvrent la
progression.

```text
npm test -- --run tests/composants/MoteurAttrape.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les étoiles sont espacées et largement tactiles ; le tap ne demande pas de coordination fine. Le
texte reste séparé du décor animé.

**BLOQUÉ-ASSET** — les quatorze cibles déclarent `asset: null`; l'illustration finale de
`volcan.etoiles-filantes` reste à fournir. Aucun asset n'a été généré.
