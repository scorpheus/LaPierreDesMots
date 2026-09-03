# Recette — cite-des-histoires-12 / cite-des-histoires-cartes-paires-02

Date : 2026-09-03
Moteur : `paires`
Habillage : `cite.cartes`

## Parcours joué

Quatre consignes couvrent huit paires phrase/couleur ou phrase/contenant : tomate-rouge,
carotte-orange, salade-verte, citron-jaune, olive-noire, raisin-violet, pomme-panier et
prune-bol. Chaque paire possède exactement deux faces et les paires sont réparties en quatre
étapes. Les textes sont courts, français et adaptés au CE1 ; l'aide Gobi relit, souffle ou montre
la couleur gratuitement.

Les cartes sont mélangées par `Alea` et réellement retournables au tap. Le premier retournement
est gratuit ; une mauvaise paire se referme sans écran d'échec. Les quatre étapes progressent
jusqu'à la réussite et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre l'ordre fixe et le jugement au premier retournement. Les tests
composants couvrent tap, mauvaise paire, aide, refus doux et fin ; les réducteurs couvrent la
progression.

```text
npm test -- --run tests/composants/MoteurPaires.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne.

## Verdict tablette

Les 16 cartes sont des cibles tactiles séparées et lisibles au retournement.

**BLOQUÉ-ASSET** — les seize cartes déclarent `asset: null`; aucune image réellement affichable
n'est fournie. Aucun asset n'a été généré.
