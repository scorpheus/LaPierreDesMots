# Recette — foret-muette-02 / foret-muette-bestiaire-paires-01

Date : 2026-09-02
Moteur : `paires`
Habillage : `foret.bestiaire`

## Parcours joué

Le contenu comporte trois consignes et six paires disjointes : renard, hibou, arbre, feuille,
oiseau et fleur. Chaque paire oppose le mot singulier à sa forme plurielle (« le renard » / « les
renards »), soit douze cartes, deux par paire. Les consignes sont courtes et audibles : « Trouve
le mot et son image. » puis « Trouve aussi… » et « Trouve les derniers… ». L'aide Gobi relit,
souffle ou montre la cible sans coût.

Le tap retourne réellement une carte (`data-carte`, `data-retournee`) ; le premier retournement est
gratuit et le second juge la paire. Les cartes sont mélangées une seule fois par `Alea`, pas dans
l'ordre du contenu. Une mauvaise paire se referme sans erreur bloquante ni écran d'échec. Les
cartes déjà appariées ne peuvent pas être rejouées ; les trois consignes se terminent et la
récompense est transmise après la dernière paire. Le double-tap est sans pénalité.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut historique où les deux premières cartes formaient
toujours la bonne paire : il exige un mélange réel et l'effet visible du retournement. Les tests
composants couvrent bonne/mauvaise paire, absence d'échec, aide, réécoute et double-tap ; les
réducteurs couvrent la progression et la fin.

```text
npm test -- --run tests/composants/MoteurPaires.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

## Verdict tablette

Les cartes sont de vraies cibles tactiles, avec libellé lisible au retournement et état
`aria-pressed`. Le parcours ne dépend pas d'un glisser et reste atteignable sans coordination
fine.

**BLOQUÉ-ASSET** — les douze cartes déclarent `asset: null` et `foret.bestiaire` ne fournit donc
aucune image réellement présente pour les faces « image ». Le gameplay reste testable avec les
libellés, mais la recette visuelle tablette n'est pas recevable.

`audio: null` n'est pas retenu comme blocage séparé ici : la consigne est couverte par le circuit
audio/manifeste existant ; aucune génération audio n'a été effectuée.
