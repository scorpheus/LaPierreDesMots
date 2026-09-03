# Recette — clairiere-11 / clairiere-luciole-voyelles-01

Date : 2026-09-02
Moteur : `eclair`
Habillage : `clairiere.luciole`

## Parcours joué

Les six étapes flashent `papa`, `riz`, `dos`, `mur`, `bébé`, puis `mère`, avec une exposition de
1 600 ms et trois choix par étape. La consigne « Touche le son que tu lis dans le mot. » est
audible via l'écoute ; l'aide Gobi relit, souffle ou surligne sans coût. Le tap sur chaque
`data-option` est le geste effectif et chaque étape avance jusqu'à la sixième.

Les réponses (`a`, `i`, `o`, `u`, `é`, `è`) sont distinctes. Les choix sont mélangés une seule
fois par `Alea`, donc l'ordre initial n'est pas une stratégie gagnante et reste rejouable à graine
égale. Une mauvaise réponse compte une erreur et expose la confusion, mais conserve la tentative
réussie sans écran d'échec. Revoir et réécouter sont gratuits ; le double-tap ne double pas une
erreur. La sixième réussite clôt le moteur et transmet la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel du défaut historique exige l'effet visible de « Revoir » et le verrou
« Prêt ? » entre deux étapes ; il est vert après correction existante. Le mélange des choix et la
conservation des acquis sont couverts par les tests unitaires.

```text
npm test -- --run tests/composants/MoteurEclair.test.tsx tests/unitaires/eclair-ordre-options.test.ts tests/unitaires/moteurs-reducteurs.test.ts
114 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne.

## Verdict tablette

Les trois lucioles sont des boutons tactiles distincts, avec le plateau et la consigne hors du
décor animé. Le tap ne demande aucune coordination fine et l'enfant peut revoir le mot avant de
choisir.

**BLOQUÉ-ASSET** — `contenu/habillages/clairiere/luciole.svg` reste un SVG gris de blockout.

La valeur `audio: null` du brouillon n'est pas un blocage : la chaîne de build recense le texte
visible et le manifeste fournit bien son clip contrôlé. La couverture globale mesurée est de
372/372 avant cette recette.
