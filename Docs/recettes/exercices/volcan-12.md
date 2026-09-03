# Recette — volcan-12 / volcan-geodes-paires-02

Date : 2026-09-03
Moteur : `paires`
Habillage : `volcan.geodes`

## Parcours joué

Quatre consignes couvrent huit paires mot/image : `cheval`, `quille`, `cochon`, `musique`,
`vache`, `queue`, `phare` et `dauphin`. Chaque paire possède exactement deux faces, un mot et
une carte image (16 cartes au total), et les huit paires sont réparties en quatre étapes.

Les consignes sont courtes, françaises et adaptées au CE1 ; l'aide Gobi relit, souffle ou montre
la cible gratuitement. Les cartes sont mélangées par `Alea`. Le premier tap retourne une carte
sans juger ; le second valide la paire ou la referme sans écran d'échec. Les quatre étapes se
terminent et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'ordre fixe et de jugement au premier retournement.
Les tests composants couvrent tap/retournement, mauvaise paire, aide, refus doux et fin ; les
réducteurs couvrent progression.

```text
npm test -- --run tests/composants/MoteurPaires.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les 16 cartes sont des cibles tactiles séparées, avec état retourné visible ; le tap ne demande
pas de coordination fine.

**BLOQUÉ-ASSET** — les huit faces image déclarent `asset: null` : aucune image réelle n'est
présente. Aucun asset n'a été généré.
