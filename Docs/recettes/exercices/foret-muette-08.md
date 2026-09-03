# Recette — foret-muette-08 / foret-muette-tapis-colorie-01

Date : 2026-09-03
Moteur : `colorie`
Habillage : `foret.tapis`

## Parcours joué

Les sept consignes sont jouables jusqu'à la fin : nid brun, chat noir, rat violet, arbre vert,
feuille haute rouge, feuille basse jaune, puis ciel orange. Les textes sont courts, français et
adaptés au CE1 ; la dernière consigne affirmative (« Le ciel du soir est orange. ») reste claire.
L'aide Gobi relit, montre la couleur ou montre la cible, sans coût.

Chaque étape demande réellement une couleur puis une région : le tap sur le nuancier et sur la
zone SVG cible déclenche le moteur. Les sept régions sont distinctes, sans doublon ; une mauvaise
couleur/région est refusée sans écran d'échec et l'enfant peut poursuivre. La septième réussite
clôt l'exercice et transmet la récompense. Le nuancier propose huit couleurs autorisées, dont
aucune cible grise.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut de cible/région non réellement peignable et le refus
`region-deja-peinte` sans état bloqué. Les tests composants couvrent tap couleur+région,
progression, aide, erreurs douces et fin ; les réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurColorie.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
125 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Le nuancier et les régions sont des cibles tactiles séparées ; aucune coordination fine ni geste
de glisser n'est imposé. Le texte reste hors du décor animé et les couleurs sélectionnées sont
visibles.

**BLOQUÉ-ASSET** — l'asset final de l'habillage `foret.tapis` reste à valider ; aucun asset n'a
été généré ni modifié dans cette recette.
