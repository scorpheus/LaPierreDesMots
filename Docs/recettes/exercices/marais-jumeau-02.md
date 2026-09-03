# Recette — marais-jumeau-02 / marais-jumeau-poissons-attrape-01

Date : 2026-09-03
Moteur : `attrape`
Habillage : `marais.poissons`

## Parcours joué

Quatre consignes sont jouables jusqu'à la fin : quatre poissons portant le son de `gant`, puis
`orange` et `viande`. Les deux intrus (`bonbon`, `lapin`) empêchent de tout attraper sans lire.
Les consignes sont courtes, françaises et adaptées au CE1 ; l'aide Gobi relit, souffle ou montre
la cible gratuitement.

Les huit poissons sont des cibles tactiles de 150×150 px, réellement attrapables au tap. Les
cibles sont mélangées à la création par `Alea` et les groupes sont disjoints. Une mauvaise capture
est refusée sans écran d'échec ; les quatre étapes progressent et la dernière transmet la
récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut de cible décorative/non capturable et le refus qui
laisserait l'enfant sans issue. Les tests composants couvrent capture correcte, intrus, aide,
réécoute, double-tap et absence d'échec ; les réducteurs couvrent progression et fin.

```text
npm test -- --run tests/composants/MoteurAttrape.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les poissons sont espacés et les cibles sont largement tactiles ; le tap ne demande pas de
coordination fine. Le texte de consigne reste séparé du décor animé.

**BLOQUÉ-ASSET** — les huit cibles déclarent `asset: null`; l'illustration finale de
`marais.poissons` reste à fournir. Aucun asset n'a été généré.
