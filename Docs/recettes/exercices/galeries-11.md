# Recette — galeries-11 / galeries-echos-paires-01

Date : 2026-09-03
Moteur : `paires`
Habillage : `galeries.echos`

## Parcours joué

Deux consignes demandent quatre paires b/p : `bain/pain`, `bas/pas`, `boule/poule` et `bol/pot`.
Les textes sont courts et adaptés au CE1 : « Relie le mot bain à son écho, puis le mot bas. »
L'aide Gobi relit, souffle, surligne ou montre la cible gratuitement.

Les huit cartes sont toutes rendues et réellement retournables au tap (`data-carte`,
`data-retournee`). Le premier retournement est gratuit ; le second valide ou referme la paire.
Les cartes sont mélangées par `Alea`, les paires sont disjointes et les deux consignes se terminent.
Une fausse paire est refusée sans écran d'échec ; la dernière paire transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'un ordre fixe rendant la première paire prévisible et
le retournement qui juge dès le premier tap. Les tests couvrent bonne/mauvaise paire, aide,
réécoute, double-tap, progression et fin.

```text
npm test -- --run tests/composants/MoteurPaires.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Les huit cartes sont des cibles tactiles espacées, avec état retourné visible et sans coordination
fine. Les faces sont des mots textuels, pas des images : le contenu déclare `asset: null` pour les
huit cartes.

**BLOQUÉ-ASSET** — aucune face image réelle n'est fournie ; l'asset final de `galeries.echos`
reste à valider. Aucun asset n'a été généré.
